/**
 * DSH 科技风工作台 - Market 主源抓取模块
 * 包含：鉴权初始化、本地缓存读写、Market 主源同步抓取 + 四层过滤 + 分类归集
 * 基于双源数据抓取全流程 阶段0-阶段1 1:1 实现
 */

import {
  CACHE_EXPIRE_SECONDS,
  CACHE_RELATIVE_PATH,
  FETCH_RETRY_TIMES,
  FETCH_TIMEOUT,
  ResourceType,
  SourceType,
  StandardResource,
  WorkbenchCache,
} from './types';
import { createDefaultResource, isValidSemver } from './utils';

// ==============================================
// 上下文接口定义（抽象 DSH Cordis ctx 能力）
// ==============================================

/**
 * 工作台所需的 ctx 能力接口
 * 抽象自 Cordis Context，便于依赖注入和测试
 */
export interface WorkbenchContext {
  /** 环境信息 */
  env: {
    DSH_HOME: string;
    VERSION: string;
  };
  /** 文件系统 */
  fs: {
    exists(path: string): Promise<boolean>;
    readFile(path: string, encoding: string): Promise<string>;
    writeFile(path: string, data: string): Promise<void>;
    mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  };
  /** HTTP 请求 */
  http: {
    request(options: {
      url: string;
      method?: string;
      timeout?: number;
      retry?: number;
      data?: any;
      headers?: Record<string, string>;
    }): Promise<{ data: any; status: number }>;
    get(url: string, options?: { headers?: Record<string, string>; timeout?: number }): Promise<{ data: any; status: number }>;
  };
  /** 配置读取 */
  config: {
    get(key: string): Promise<any>;
  };
  /** Profile 上下文 */
  profile?: {
    getSessionToken?(): Promise<string>;
  };
  /** 日志 */
  logger?: {
    info(msg: string): void;
    warn(msg: string, err?: any): void;
    error(msg: string, err?: any): void;
  };
  /** 内存缓存 */
  cache?: {
    set(key: string, value: any): void;
    get(key: string): any;
  };
  /** 工具函数 */
  utils?: {
    sleep(ms: number): Promise<void>;
  };
  /** 对话框提示 */
  dialog?: {
    tip(msg: string): void;
  };
  /** 定时任务 */
  schedule?: {
    create(id: string, cron: string, handler: () => Promise<void>): void;
  };
  /** 插件管理 */
  plugin?: {
    getInstalledList(): Promise<Array<{ id: string; version: string; enabled: boolean }>>;
  };
  /** 预设管理 */
  profileService?: {
    getPresetList(): Promise<Array<{ id: string; name: string }>>;
  };
  /** 工作流/应用管理 */
  workflow?: {
    getAppList(): Promise<Array<{ id: string; name: string }>>;
  };
  /** Market API */
  market?: {
    apiUrl: string;
  };
}

// ==============================================
// 鉴权初始化（阶段0）
// ==============================================

export interface AuthResult {
  marketToken: string;
  githubToken: string;
}

/**
 * 鉴权初始化
 * - Market：复用本地 Profile 上下文，无需手动 Token
 * - GitHub：环境变量优先 > 配置文件 > 匿名
 * @param ctx 工作台上下文
 * @param config 插件配置
 */
export async function initAuth(
  ctx: WorkbenchContext,
  config: { githubToken?: string },
): Promise<AuthResult> {
  // Market：复用本地 Profile 上下文
  let marketToken = '';
  try {
    if (ctx.profile?.getSessionToken) {
      marketToken = await ctx.profile.getSessionToken();
    }
  } catch (err) {
    ctx.logger?.warn('Market 鉴权失败，将以匿名模式访问', err);
  }

  // GitHub：配置文件优先 > 环境变量 > 匿名
  let githubToken = config.githubToken || '';
  if (!githubToken) {
    try {
      const userConfig = await ctx.config.get('workbench.github');
      githubToken = userConfig?.githubToken || '';
    } catch (err) {
      // 配置读取失败，继续匿名模式
    }
  }
  // 环境变量兜底（Node 进程环境）
  if (!githubToken && typeof process !== 'undefined' && process.env?.GITHUB_TOKEN) {
    githubToken = process.env.GITHUB_TOKEN;
  }

  return { marketToken, githubToken };
}

// ==============================================
// 本地缓存读写（阶段0）
// ==============================================

/**
 * 读取本地缓存
 * @param ctx 工作台上下文
 * @returns 缓存数据，不存在或解析失败返回 null
 */
export async function getLocalCache(ctx: WorkbenchContext): Promise<WorkbenchCache | null> {
  const cachePath = `${ctx.env.DSH_HOME}/${CACHE_RELATIVE_PATH}`;
  try {
    if (!(await ctx.fs.exists(cachePath))) return null;
    const raw = await ctx.fs.readFile(cachePath, 'utf8');
    const parsed = JSON.parse(raw) as WorkbenchCache;
    // 基本结构校验
    if (!parsed || typeof parsed.expireTime !== 'number') return null;
    return parsed;
  } catch (err) {
    ctx.logger?.warn('读取本地缓存失败', err);
    return null;
  }
}

/**
 * 写入本地缓存（原子写入）
 * @param ctx 工作台上下文
 * @param cache 缓存数据
 */
export async function saveLocalCache(ctx: WorkbenchContext, cache: WorkbenchCache): Promise<void> {
  const cacheDir = `${ctx.env.DSH_HOME}/cache/workbench`;
  const cachePath = `${ctx.env.DSH_HOME}/${CACHE_RELATIVE_PATH}`;
  try {
    await ctx.fs.mkdir(cacheDir, { recursive: true });
    await ctx.fs.writeFile(cachePath, JSON.stringify(cache, null, 2));
    // 同时写入内存缓存
    ctx.cache?.set('workbench_data', cache);
  } catch (err) {
    ctx.logger?.warn('写入本地缓存失败', err);
  }
}

/**
 * 缓存数据兜底渲染
 * @param cache 缓存数据
 * @returns 按类型分组的资源列表
 */
export function renderCacheData(cache: WorkbenchCache): {
  plugins: StandardResource[];
  presets: StandardResource[];
  apps: StandardResource[];
  skills: StandardResource[];
} {
  return {
    plugins: cache.pluginList || [],
    presets: cache.presetList || [],
    apps: cache.appList || [],
    skills: cache.skillList || [],
  };
}

// ==============================================
// Market 主源抓取（阶段1）
// ==============================================

/**
 * Market 原始资源项（API 返回结构）
 */
export interface MarketRawItem {
  id: string;
  name: string;
  type?: string;
  category?: string;
  description?: string;
  author?: string;
  version?: string;
  minVersion?: string;
  adaptVersion?: string;
  status?: string;
  installCmd?: string;
  configPath?: string;
  updateTime?: number;
  star?: number;
  fork?: number;
  [key: string]: any;
}

/**
 * Market 主源同步抓取 + 四层过滤 + 分类归集
 *
 * 执行模式：串行同步、先抓先处理、失败降级
 * 四层脏数据过滤：
 *   1. 非上架状态（status !== "published"）
 *   2. 版本不兼容（minVersion > 当前DSH版本）
 *   3. 版本非法/空（!isValidSemver）
 *   4. 核心字段缺失（!id || !name）
 *
 * @param ctx 工作台上下文
 * @param token Market 会话令牌
 * @returns 标准化后的 Market 资源列表
 */
export async function fetchMarketSource(
  ctx: WorkbenchContext,
  token: string,
): Promise<StandardResource[]> {
  const dshVersion = ctx.env.VERSION;

  try {
    // 构造请求参数
    const apiUrl = ctx.market?.apiUrl || 'https://market.deepseek-harness.com/api/resources';
    ctx.logger?.info(`[Market] 开始抓取: url=${apiUrl}, method=POST, version=${dshVersion}, token=${token ? '已配置' : '匿名'}`);

    const res = await ctx.http.request({
      url: apiUrl,
      method: 'POST',
      timeout: FETCH_TIMEOUT,
      retry: FETCH_RETRY_TIMES,
      data: {
        version: dshVersion,
        types: [ResourceType.PLUGIN, ResourceType.PRESET, ResourceType.APP],
      },
      headers: token ? { Authorization: token } : {},
    });

    ctx.logger?.info(`[Market] API 响应: status=${res?.status}, dataType=${typeof res?.data}, isArray=${Array.isArray(res?.data)}, hasList=${!!res?.data?.list}`);

    // 调试：打印响应数据的前几个字段
    if (res?.data) {
      const keys = Object.keys(res.data).slice(0, 10);
      ctx.logger?.info(`[Market] 响应数据字段: ${keys.join(', ')}`);
      if (Array.isArray(res.data) && res.data.length > 0) {
        ctx.logger?.info(`[Market] 第一条数据: ${JSON.stringify(res.data[0]).substring(0, 200)}`);
      } else if (res.data.list && Array.isArray(res.data.list) && res.data.list.length > 0) {
        ctx.logger?.info(`[Market] list 第一条数据: ${JSON.stringify(res.data.list[0]).substring(0, 200)}`);
      }
    }

    const rawList: MarketRawItem[] = Array.isArray(res?.data) ? res.data : res?.data?.list || [];
    const result: StandardResource[] = [];

    ctx.logger?.info(`[Market] 原始数据量: ${rawList.length} 条，开始四层过滤...`);

    // 四层脏数据过滤 + 字段归集
    let filter1 = 0, filter2 = 0, filter3 = 0, filter4 = 0;
    for (const item of rawList) {
      // 过滤1：非上架状态
      if (item.status && item.status !== 'published') { filter1++; continue; }

      // 过滤2：版本不兼容（minVersion > 当前DSH版本）
      if (item.minVersion && compareDSHVersion(item.minVersion, dshVersion) > 0) { filter2++; continue; }

      // 过滤3：版本非法/空
      if (!item.version || !isValidSemver(item.version)) { filter3++; continue; }

      // 过滤4：核心字段缺失
      if (!item.id || !item.name) { filter4++; continue; }

      // 字段归集 & 官方标记
      const resource = createDefaultResource({
        id: String(item.id),
        name: String(item.name),
        type: normalizeResourceType(item.type),
        category: item.category || 'official',
        description: item.description || '官方资源',
        author: item.author || 'official',
        source: SourceType.MARKET,
        isOfficial: true,
        latestVersion: item.version,
        adaptVersion: item.adaptVersion || item.minVersion || 'all',
        updateTime: item.updateTime || Date.now(),
        star: item.star || 0,
        fork: item.fork || 0,
        installCmd: item.installCmd || `dsh plugin add ${item.id}`,
        homepage: item.homepage || item.configPath || '', // 优先使用 homepage，兼容旧字段
        configPath: item.configPath || '',
      });

      result.push(resource);
    }

    ctx.logger?.info(`[Market] 抓取完成：原始 ${rawList.length} 条，过滤1(非上架)=${filter1}, 过滤2(版本不兼容)=${filter2}, 过滤3(版本非法)=${filter3}, 过滤4(字段缺失)=${filter4}, 最终=${result.length} 条`);
    return result;
  } catch (err) {
    // 故障降级：返回空，不阻塞整体流程
    ctx.logger?.warn('[Market] 源抓取失败，降级为空列表', err);
    return [];
  }
}

// ==============================================
// 辅助函数
// ==============================================

/**
 * 规范化资源类型
 * @param type 原始类型字符串
 * @returns 标准 ResourceType
 */
function normalizeResourceType(type?: string): ResourceType {
  switch (type?.toLowerCase()) {
    case 'preset':
    case 'template':
      return ResourceType.PRESET;
    case 'app':
    case 'application':
    case 'workflow':
      return ResourceType.APP;
    case 'plugin':
    default:
      return ResourceType.PLUGIN;
  }
}

/**
 * DSH 版本号比对（简化版，支持 x.y.z 格式）
 * @param minVer 最低要求版本
 * @param currentVer 当前版本
 * @returns 1: minVer > currentVer（不兼容）; -1: minVer <= currentVer（兼容）; 0: 相等
 */
function compareDSHVersion(minVer: string, currentVer: string): number {
  const parse = (v: string): number[] => {
    const cleaned = v.replace(/^[vV]/, '').trim();
    const parts = cleaned.split('.').map((p) => parseInt(p, 10) || 0);
    while (parts.length < 3) parts.push(0);
    return parts.slice(0, 3);
  };
  const min = parse(minVer);
  const cur = parse(currentVer);
  for (let i = 0; i < 3; i++) {
    if (min[i] > cur[i]) return 1;
    if (min[i] < cur[i]) return -1;
  }
  return 0;
}
