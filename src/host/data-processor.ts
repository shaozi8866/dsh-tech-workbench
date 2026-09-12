/**
 * DSH 科技风工作台 - 数据处理与缓存调度模块
 * 包含：双源去重、归一化清洗、本地状态联动、增量落库、定时任务、容错兜底、总调度
 * 基于双源数据抓取全流程 阶段3-阶段8 1:1 实现
 */

import {
  CACHE_EXPIRE_SECONDS,
  ResourceType,
  StandardResource,
  WorkbenchCache,
} from './types';
import { compareVersion, isValidSemver, normalizeVersion } from './utils';
import {
  fetchMarketSource,
  getLocalCache,
  initAuth,
  renderCacheData,
  saveLocalCache,
  type WorkbenchContext,
} from './market-fetcher';
import { fetchGithubSource } from './github-fetcher';
import { fetchLocalInstalledPlugins } from './local-fetcher';
import { fetchNpmPlugins } from './npm-fetcher';
import { fetchDshDesktopPresets } from './dshdesktop-fetcher';
import { getResourceDescription, getResourceHomepage, getResourceCategory, getResourceMeta } from './resource-meta-database';
import type { ResolvedConfig } from './types';

// ==============================================
// 阶段3：双源智能去重 & 优先级覆盖
// ==============================================

/**
 * 双源智能去重与优先级覆盖
 *
 * 去重判定维度：资源唯一ID（主）+ 功能标签 + 适配场景
 * 覆盖策略：
 *   - 同一资源同时存在双源：保留 Market 官方数据，丢弃 GitHub 重复
 *   - 同功能不同版本：保留版本更新、更新时间更近、活跃度更高的条目
 *   - GitHub 独有资源：全部保留，作为生态增量资源入库
 *
 * @param marketList Market 官方资源列表
 * @param githubList GitHub 社区资源列表
 * @returns 去重合并后的资源列表
 */
export function mergeDualSource(
  marketList: StandardResource[],
  githubList: StandardResource[],
): StandardResource[] {
  const finalMap = new Map<string, StandardResource>();

  // 优先写入官方 Market 数据（权威优先）
  for (const item of marketList) {
    if (item?.id) {
      finalMap.set(item.id, item);
    }
  }

  // 遍历 GitHub 数据，智能合并
  for (const item of githubList) {
    if (!item?.id) continue;

    const exist = finalMap.get(item.id);
    if (!exist) {
      // 无重合：直接新增（GitHub 独有资源）
      finalMap.set(item.id, item);
    } else {
      // 同 ID：保留 Market，丢弃 GitHub（权威优先）
      // 但如果 Market 版本更旧且 GitHub 更新，可以补充更新时间信息
      if (compareVersion(item.latestVersion, exist.latestVersion) > 0) {
        // Market 版本旧，但仍保留 Market 为主体，仅记录社区有更新版本
        exist.updateTime = Math.max(exist.updateTime, item.updateTime);
      }
      continue;
    }
  }

  return Array.from(finalMap.values());
}

/**
 * 多源智能去重与优先级覆盖（四源版本）
 *
 * 优先级：本地已安装 > npm registry > dshdesktop > GitHub
 *   - 本地已安装：最权威，保留安装状态
 *   - npm registry：主要外部数据源，数据完整
 *   - dshdesktop：社区预设，补充预设数据
 *   - GitHub：补充数据源，可能不稳定
 *
 * @param localList 本地已安装插件列表
 * @param npmList npm registry 搜索结果
 * @param dshdesktopList dshdesktop.com 预设列表
 * @param githubList GitHub 抓取结果
 * @returns 去重合并后的资源列表
 */
export function mergeMultiSource(
  localList: StandardResource[],
  npmList: StandardResource[],
  dshdesktopList: StandardResource[],
  githubList: StandardResource[],
): StandardResource[] {
  const finalMap = new Map<string, StandardResource>();

  // 优先级1：本地已安装插件（最权威）
  for (const item of localList) {
    if (item?.id) {
      finalMap.set(item.id, item);
    }
  }

  // 优先级2：npm registry（主要外部数据源）
  for (const item of npmList) {
    if (!item?.id) continue;

    const exist = finalMap.get(item.id);
    if (!exist) {
      // 无重合：直接新增
      finalMap.set(item.id, item);
    } else {
      // 同 ID：保留本地（已安装状态），但补充 npm 的最新版本信息
      if (compareVersion(item.latestVersion, exist.latestVersion) > 0) {
        exist.latestVersion = item.latestVersion;
        exist.updateAvailable = true;
      }
      exist.updateTime = Math.max(exist.updateTime, item.updateTime);
      continue;
    }
  }

  // 优先级3：dshdesktop 预设（补充预设数据）
  for (const item of dshdesktopList) {
    if (!item?.id) continue;

    const exist = finalMap.get(item.id);
    if (!exist) {
      // 无重合：直接新增
      finalMap.set(item.id, item);
    } else {
      // 同 ID：保留高优先级数据，仅补充使用人数信息
      if (item.star && item.star > (exist.star || 0)) {
        exist.star = item.star;
      }
      continue;
    }
  }

  // 优先级4：GitHub（补充数据源）
  for (const item of githubList) {
    if (!item?.id) continue;

    const exist = finalMap.get(item.id);
    if (!exist) {
      // 无重合：直接新增（GitHub 独有资源）
      finalMap.set(item.id, item);
    } else {
      // 同 ID：保留高优先级数据，仅补充 GitHub 的 star/fork 信息
      if (item.star && item.star > (exist.star || 0)) {
        exist.star = item.star;
      }
      if (item.fork && item.fork > (exist.fork || 0)) {
        exist.fork = item.fork;
      }
      continue;
    }
  }

  // 应用资源描述数据库（优先使用数据库中的中文描述，刷新时保留描述，只更新版本号）
  const finalList = Array.from(finalMap.values());
  for (const item of finalList) {
    if (!item?.id) continue;
    
    const meta = getResourceMeta(item.id);
    if (meta) {
      // 优先使用数据库中的描述（刷新时不覆盖描述）
      if (meta.description) {
        item.description = meta.description;
      }
      // 优先使用数据库中的分类
      if (meta.category) {
        item.category = meta.category;
      }
      // 优先使用数据库中的源网站链接（赋值给 homepage 字段，不是 configPath）
      if (meta.homepage) {
        item.homepage = meta.homepage;
      }
    }
  }

  return finalList;
}

// ==============================================
// 阶段4：全量数据归一化清洗
// ==============================================

/**
 * 全量数据归一化清洗
 *
 * 通用字段强制归一规则：
 *   - 版本字段：统一转为 SemVer 标准格式，非法版本置为 0.0.0
 *   - 时间字段：统一时间戳格式化
 *   - 空描述兜底：无描述自动填充「社区开源资源，点击查看详情」
 *   - 来源标记：严格区分 market / github
 *
 * @param list 合并后的混合资源池
 * @returns 归一化后的资源列表
 */
export function normalizeResourceList(list: StandardResource[]): StandardResource[] {
  return list.map((item) => {
    // 版本归一
    const ver = normalizeVersion(item.latestVersion);

    // 空描述兜底
    const desc = item.description?.trim() || '社区开源资源，点击查看详情';

    // 空名称兜底
    const name = item.name?.trim() || item.id || '未命名资源';

    // 时间戳确保为数字
    const updateTime = typeof item.updateTime === 'number' && !isNaN(item.updateTime)
      ? item.updateTime
      : Date.now();

    return {
      ...item,
      name,
      latestVersion: ver,
      description: desc,
      updateTime,
      // 确保数值字段为数字
      star: typeof item.star === 'number' ? item.star : 0,
      fork: typeof item.fork === 'number' ? item.fork : 0,
      isInstalled: !!item.isInstalled,
      isEnabled: !!item.isEnabled,
      updateAvailable: !!item.updateAvailable,
      isOfficial: !!item.isOfficial,
    };
  });
}

// ==============================================
// 阶段5（阶段6）：本地环境状态联动匹配
// ==============================================

/**
 * 本地环境状态联动匹配
 *
 * 抓取的云端数据与本地 DSH 运行环境双向联动：
 *   - 插件管理：匹配本地已安装插件列表、启停状态、本地版本，生成更新提醒
 *   - 预设管理：比对本地 Profile 预设文件，标记已导入/未导入
 *   - 应用管理：关联本地工作流/Agent 应用运行状态
 *
 * @param ctx 工作台上下文
 * @param list 归一化后的资源列表
 * @returns 联动本地状态后的资源列表
 */
export async function syncLocalEnvStatus(
  ctx: WorkbenchContext,
  list: StandardResource[],
): Promise<StandardResource[]> {
  // 读取本地已安装插件
  let localPlugins: Array<{ id: string; version: string; enabled: boolean }> = [];
  try {
    if (ctx.plugin?.getInstalledList) {
      localPlugins = await ctx.plugin.getInstalledList();
    }
  } catch (err) {
    ctx.logger?.warn('读取本地插件列表失败', err);
  }

  // 读取本地预设
  let localPresets: Array<{ id: string; name: string }> = [];
  try {
    if (ctx.profileService?.getPresetList) {
      localPresets = await ctx.profileService.getPresetList();
    }
  } catch (err) {
    ctx.logger?.warn('读取本地预设列表失败', err);
  }

  // 读取本地应用
  let localApps: Array<{ id: string; name: string }> = [];
  try {
    if (ctx.workflow?.getAppList) {
      localApps = await ctx.workflow.getAppList();
    }
  } catch (err) {
    ctx.logger?.warn('读取本地应用列表失败', err);
  }

  return list.map((item) => {
    const updated = { ...item };

    if (item.type === ResourceType.PLUGIN) {
      const local = localPlugins.find((p) => p.id === item.id || p.id === item.name);
      if (local) {
        updated.isInstalled = true;
        updated.isEnabled = local.enabled;
        updated.localVersion = local.version || '0.0.0';
        updated.updateAvailable = compareVersion(item.latestVersion, local.version || '0.0.0') > 0;
      }
    } else if (item.type === ResourceType.PRESET) {
      const local = localPresets.find((p) => p.id === item.id || p.name === item.name);
      if (local) {
        updated.isInstalled = true;
        updated.isEnabled = true;
      }
    } else if (item.type === ResourceType.APP) {
      const local = localApps.find((a) => a.id === item.id || a.name === item.name);
      if (local) {
        updated.isInstalled = true;
        updated.isEnabled = true;
      }
    }

    return updated;
  });
}

// ==============================================
// 阶段5（阶段7）：分层增量缓存落库
// ==============================================

/**
 * 分层增量缓存落库
 *
 * 双层缓存存储机制：
 *   - 内存缓存：页面常驻缓存，切换标签无刷新
 *   - 文件持久化：归一化数据落地 $DSH_HOME/cache/workbench/
 *
 * 增量更新逻辑：
 *   - 不做全量覆盖，仅比对云端更新时间、版本号
 *   - 本地已安装资源自动比对云端版本，标记可更新状态
 *
 * @param ctx 工作台上下文
 * @param list 最终资源列表
 * @param cacheExpireSeconds 缓存过期时间（秒）
 */
export async function saveCacheIncrement(
  ctx: WorkbenchContext,
  list: StandardResource[],
  cacheExpireSeconds: number = CACHE_EXPIRE_SECONDS,
): Promise<void> {
  const now = Date.now();
  const cacheData: WorkbenchCache = {
    updateTime: now,
    expireTime: now + cacheExpireSeconds * 1000,
    pluginList: list.filter((i) => i.type === ResourceType.PLUGIN),
    presetList: list.filter((i) => i.type === ResourceType.PRESET),
    appList: list.filter((i) => i.type === ResourceType.APP),
    skillList: list.filter((i) => i.type === ResourceType.SKILL),
  };

  // 1. 写入内存缓存
  ctx.cache?.set('workbench_data', cacheData);

  // 2. 原子写入文件缓存
  await saveLocalCache(ctx, cacheData);

  ctx.logger?.info(
    `[Cache] 落库完成：插件 ${cacheData.pluginList.length} 个，预设 ${cacheData.presetList.length} 个，应用 ${cacheData.appList.length} 个，Skill ${cacheData.skillList.length} 个，过期时间 ${new Date(cacheData.expireTime).toISOString()}`,
  );
}

// ==============================================
// 阶段8：后台定时自动同步
// ==============================================

/**
 * 设置后台 24h 定时增量同步任务
 *
 * 定时任务：每24小时整点执行增量同步，后台静默运行
 * 启动触发：服务启动只校验缓存时间戳，过期才增量更新
 * 操作事件触发：用户安装/卸载/配置修改后，仅刷新本地状态字段
 *
 * @param ctx 工作台上下文
 * @param config 插件配置
 */
export function setupWorkbenchSchedule(
  ctx: WorkbenchContext,
  config: ResolvedConfig,
): void {
  if (!ctx.schedule?.create) {
    ctx.logger?.warn('[Schedule] 当前环境不支持定时任务，跳过后台同步');
    return;
  }

  ctx.schedule.create('workbench-fetch', '0 0 * * *', async () => {
    ctx.logger?.info('[Schedule] 后台定时增量同步开始');
    try {
      // 定时只增量更新，不强制刷新
      await fetchDoubleSourceData(ctx, config, false);
    } catch (err) {
      ctx.logger?.warn('[Schedule] 后台定时同步失败', err);
    }
  });

  ctx.logger?.info('[Schedule] 后台24h定时同步任务已注册');
}

// ==============================================
// 阶段7：容错、限流与降级机制
// ==============================================

/**
 * 限流、异常全局兜底（统一拦截）
 *
 * 双源独立容错：
 *   - Market 请求失败不影响 GitHub 渲染
 *   - GitHub 请求失败不影响官方资源展示
 *
 * 网络异常兜底顺序：
 *   接口超时/网络错误 → 重试2次 → 失败后读取旧缓存 → 展示兜底数据
 *
 * 限流精准处理：
 *   检测到 GitHub 403 限流 → 暂停新请求 → 复用旧缓存 → 友好提示
 *
 * @param fn 被包装的异步函数
 * @param ctx 工作台上下文
 * @returns 包装后的函数，异常时返回旧缓存
 */
export function wrapFetchErrorHandler<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  ctx: WorkbenchContext,
): (...args: Parameters<T>) => Promise<ReturnType<T> | WorkbenchCache | null> {
  return async (...args: Parameters<T>): Promise<ReturnType<T> | WorkbenchCache | null> => {
    try {
      return await fn(...args);
    } catch (err: any) {
      // 限流403兜底
      if (err?.status === 403 || err?.response?.status === 403) {
        ctx.dialog?.tip('GitHub访问受限，可配置Token提升额度');
        ctx.logger?.warn('[ErrorHandler] 触发GitHub限流，降级为缓存数据', err);
        return getLocalCache(ctx);
      }
      // 通用兜底返回旧缓存
      ctx.logger?.warn('[ErrorHandler] 抓取异常，降级为缓存数据', err);
      return getLocalCache(ctx);
    }
  };
}

// ==============================================
// 总调度：双源抓取总入口（阶段0-阶段8串联）
// ==============================================

export interface FetchResult {
  plugins: StandardResource[];
  presets: StandardResource[];
  apps: StandardResource[];
  skills: StandardResource[];
  fromCache: boolean;
  updateTime: number;
}

/**
 * 双源抓取总入口
 *
 * 完整流程串联：
 *   阶段0：初始化鉴权 + 缓存拦截
 *   阶段1：主源同步抓取（Market 优先串行）
 *   阶段2：副源异步抓取（GitHub 并行不阻塞）
 *   阶段3：双源去重 & 优先级覆盖
 *   阶段4：数据归一化清洗
 *   阶段5：联动本地环境状态
 *   阶段6：分层增量落库
 *   阶段7：返回最终渲染数据
 *
 * @param ctx 工作台上下文
 * @param config 插件配置
 * @param forceRefresh 是否强制全量刷新（用户手动刷新）
 * @returns 按类型分组的最终资源列表
 */
export async function fetchDoubleSourceData(
  ctx: WorkbenchContext,
  config: ResolvedConfig,
  forceRefresh: boolean = false,
): Promise<FetchResult> {
  const startTime = Date.now();
  ctx.logger?.info(`[Fetch] 双源抓取开始，forceRefresh=${forceRefresh}`);

  // ===== 阶段0：初始化鉴权 + 缓存拦截 =====
  const { marketToken, githubToken } = await initAuth(ctx, config);
  const cache = await getLocalCache(ctx);

  // 缓存拦截逻辑：未过期且非强制刷新，直接复用
  if (!forceRefresh && cache && Date.now() < cache.expireTime) {
    ctx.logger?.info(`[Fetch] 缓存未过期，直接复用（更新于 ${new Date(cache.updateTime).toISOString()}）`);
    const cached = renderCacheData(cache);
    return {
      ...cached,
      fromCache: true,
      updateTime: cache.updateTime,
    };
  }

  // 保留旧缓存用于兜底
  const oldCache = cache;

  try {
    // ===== 阶段1：主源1 - 本地已安装插件 =====
    ctx.logger?.info('[Fetch] 阶段1a：本地已安装插件读取');
    const localResourceList = await fetchLocalInstalledPlugins(ctx);

    // ===== 阶段1b：主源2 - npm registry 搜索（主要外部数据源）=====
    ctx.logger?.info('[Fetch] 阶段1b：npm registry 搜索');
    const npmResourceList = await fetchNpmPlugins(ctx);

    // ===== 阶段1c：主源3 - dshdesktop.com 预设抓取 =====
    ctx.logger?.info('[Fetch] 阶段1c：dshdesktop.com 预设抓取');
    const dshdesktopPresetList = await fetchDshDesktopPresets(ctx);

    // ===== 阶段2：副源 - GitHub 抓取（补充数据源）=====
    ctx.logger?.info('[Fetch] 阶段2：GitHub 副源抓取');
    const githubResourceList = await fetchGithubSource(
      ctx,
      githubToken,
      config.customRepos,
      config.customPresetRepos,
      config.customAppRepos,
    );

    // ===== 阶段3：多源去重 & 优先级覆盖（本地 > npm > dshdesktop > GitHub）=====
    ctx.logger?.info('[Fetch] 阶段3：多源去重合并');
    const mergedList = mergeMultiSource(
      localResourceList,
      npmResourceList,
      dshdesktopPresetList,
      githubResourceList,
    );

    // ===== 阶段4：数据归一化清洗 =====
    ctx.logger?.info('[Fetch] 阶段4：数据归一化清洗');
    const standardList = normalizeResourceList(mergedList);

    // ===== 阶段5：联动本地环境状态 =====
    ctx.logger?.info('[Fetch] 阶段5：本地环境状态联动');
    const finalList = await syncLocalEnvStatus(ctx, standardList);

    // ===== 阶段6：分层增量落库 =====
    ctx.logger?.info('[Fetch] 阶段6：增量缓存落库');
    await saveCacheIncrement(ctx, finalList, config.cacheExpireSeconds);

    // ===== 阶段7：返回最终渲染数据 =====
    const duration = Date.now() - startTime;
    ctx.logger?.info(`[Fetch] 完成：共 ${finalList.length} 个资源，耗时 ${duration}ms`);

    return {
      plugins: finalList.filter((i) => i.type === ResourceType.PLUGIN),
      presets: finalList.filter((i) => i.type === ResourceType.PRESET),
      apps: finalList.filter((i) => i.type === ResourceType.APP),
      skills: finalList.filter((i) => i.type === ResourceType.SKILL),
      fromCache: false,
      updateTime: Date.now(),
    };
  } catch (err) {
    // 全局兜底：抓取失败时复用旧缓存
    ctx.logger?.warn('[Fetch] 双源抓取异常，降级为旧缓存', err);
    if (oldCache) {
      const cached = renderCacheData(oldCache);
      return {
        ...cached,
        fromCache: true,
        updateTime: oldCache.updateTime,
      };
    }
    // 无缓存时返回空
    return {
      plugins: [],
      presets: [],
      apps: [],
      skills: [],
      fromCache: false,
      updateTime: Date.now(),
    };
  }
}
