/**
 * DSH 科技风工作台插件 - Host 半侧入口
 * 运行于 DSH 主进程（Node），负责双源数据抓取、缓存、HTTP 接口、定时任务
 *
 * v2.0：皮肤已独立为 dsh-tech-skin 插件，本插件不再自带皮肤
 *
 * 重要：DSH 0.1.5-rc.1 Host 环境中，env/logger/config/effect/http 等服务
 * 不可通过 inject 声明（会导致插件 pending 无法激活）。本文件全部使用
 * Node.js 原生 API（process.env / fs/promises / globalThis.fetch / console），
 * 仅 webServer 通过 ctx.inject() 动态注入（可选，不阻塞激活）。
 */

import type { Context } from '@deepseek-ai/cordis';
import {
  CACHE_EXPIRE_SECONDS,
  type PluginConfig,
  type ResolvedConfig,
} from './host/types';
import {
  fetchDoubleSourceData,
  setupWorkbenchSchedule,
  type FetchResult,
} from './host/data-processor';
import { getLocalCache, renderCacheData, type WorkbenchContext } from './host/market-fetcher';
import * as fs from 'fs';
import * as path from 'path';

// 插件生命周期管理（方案A: dsh plugin 命令转发）
import {
  installPlugin, uninstallPlugin, enablePlugin, disablePlugin,
  listPlugins, updatePlugin, rollbackPlugin, getVersions,
  type PluginCliOptions,
} from './host/plugin-cli.js';
// 预设维护（agentPresets 名册服务）
import {
  listPresets, readPresetComposition, savePresetComposition,
  copyPreset, deletePreset, validatePreset, type AgentPresetsService,
} from './host/preset-cli.js';
// 技能维护（用户技能根文件系统）
import {
  listSkills, readSkill, createSkill, saveSkill, deleteSkill,
} from './host/skill-cli.js';

export const PLUGIN_ID = 'dsh-tech-workbench';
export const VERSION = '2.4.0';
export const name = 'dsh-tech-workbench';

// 重新导出类型，方便外部引用
export type { PluginConfig, ResolvedConfig, StandardResource, WorkbenchCache } from './host/types';

// ===== 插件生命周期管理 (方案A: 命令转发) =====

/**
 * 内存中的最新数据（避免每次请求都读文件）
 */
let memoryData: FetchResult | null = null;
let isFetching = false;
let fetchPromise: Promise<FetchResult> | null = null;

/**
 * 解析插件配置，填充默认值
 */
function resolveConfig(config: PluginConfig): ResolvedConfig {
  return {
    githubToken: config.githubToken || '',
    customRepos: Array.isArray(config.customRepos) ? config.customRepos : [],
    customPresetRepos: Array.isArray(config.customPresetRepos) ? config.customPresetRepos : [],
    customAppRepos: Array.isArray(config.customAppRepos) ? config.customAppRepos : [],
    cacheExpireSeconds: config.cacheExpireSeconds ?? CACHE_EXPIRE_SECONDS,
    profile: config.profile || 'web',
    dshHome: config.dshHome || process.env.DSH_HOME || path.join(require('os').homedir(), '.dsh'),
    dshBin: config.dshBin || 'dsh',
  };
}

/**
 * 安全获取 ctx 上的可选服务（rejectGuard 可能抛错，用 try-catch 降级）
 */
function safeGetService<T>(ctx: Context, key: string): T | undefined {
  try {
    return (ctx as any)[key] as T;
  } catch {
    return undefined;
  }
}

/**
 * 安全获取 logger：优先 ctx.logger，降级到 console
 */
function getLogger(ctx: Context) {
  const ctxLogger = safeGetService<any>(ctx, 'logger');
  if (ctxLogger && typeof ctxLogger.info === 'function') {
    return ctxLogger;
  }
  return {
    info: (...args: any[]) => console.log(`[${PLUGIN_ID}]`, ...args),
    warn: (...args: any[]) => console.warn(`[${PLUGIN_ID}]`, ...args),
    error: (...args: any[]) => console.error(`[${PLUGIN_ID}]`, ...args),
  };
}

/**
 * 基于 Node.js 原生 fs/promises 构建 WorkbenchContext.fs
 */
function buildNativeFs(): WorkbenchContext['fs'] {
  return {
    exists: async (p: string) => {
      try {
        await fs.promises.access(p);
        return true;
      } catch {
        return false;
      }
    },
    readFile: async (p: string, encoding: string = 'utf-8') => {
      return fs.promises.readFile(p, encoding as BufferEncoding);
    },
    writeFile: async (p: string, data: string) => {
      await fs.promises.mkdir(path.dirname(p), { recursive: true });
      await fs.promises.writeFile(p, data, 'utf-8');
    },
    mkdir: async (p: string, options?: { recursive?: boolean }) => {
      await fs.promises.mkdir(p, options || { recursive: true });
    },
  };
}

/**
 * 基于 Node.js 原生 fetch 构建 WorkbenchContext.http
 */
function buildNativeHttp(): WorkbenchContext['http'] {
  return {
    request: async (options: {
      url: string;
      method?: string;
      timeout?: number;
      retry?: number;
      data?: any;
      headers?: Record<string, string>;
    }) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeout || 15000);
      try {
        const res = await fetch(options.url, {
          method: options.method || 'GET',
          headers: options.headers || {},
          body: options.data ? JSON.stringify(options.data) : undefined,
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const text = await res.text();
        let data: any;
        try { data = JSON.parse(text); } catch { data = text; }
        return { data, status: res.status };
      } catch (err) {
        clearTimeout(timeout);
        return { data: null, status: 0 };
      }
    },
    get: async (url: string, options?: { headers?: Record<string, string>; timeout?: number }) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options?.timeout || 15000);
      try {
        const res = await fetch(url, {
          headers: options?.headers || {},
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const text = await res.text();
        let data: any;
        try { data = JSON.parse(text); } catch { data = text; }
        return { data, status: res.status };
      } catch (err) {
        clearTimeout(timeout);
        return { data: null, status: 0 };
      }
    },
  };
}

/**
 * 构建工作台上下文（全部基于 Node.js 原生 API，不依赖 DSH 服务）
 */
function buildWorkbenchContext(ctx: Context): WorkbenchContext {
  const dshHome = process.env.DSH_HOME || path.join(require('os').homedir(), '.dsh');

  return {
    env: {
      DSH_HOME: dshHome,
      VERSION: process.env.DSH_VERSION || '',
    },
    fs: buildNativeFs(),
    http: buildNativeHttp(),
    config: {
      get: async (_key: string) => ({}),
    },
    profile: safeGetService(ctx, 'profile'),
    logger: getLogger(ctx),
    cache: safeGetService(ctx, 'cache'),
    utils: safeGetService(ctx, 'utils'),
    dialog: safeGetService(ctx, 'dialog'),
    schedule: safeGetService(ctx, 'schedule'),
    plugin: safeGetService(ctx, 'plugin'),
    profileService: safeGetService(ctx, 'profileService'),
    workflow: safeGetService(ctx, 'workflow'),
    market: safeGetService(ctx, 'market'),
  };
}

/**
 * 触发数据抓取（带防抖，避免并发重复请求）
 */
async function triggerFetch(wbCtx: WorkbenchContext, config: ResolvedConfig, force: boolean): Promise<FetchResult> {
  if (isFetching && fetchPromise) {
    return fetchPromise;
  }
  isFetching = true;
  fetchPromise = fetchDoubleSourceData(wbCtx, config, force).then((result) => {
    memoryData = result;
    return result;
  }).finally(() => {
    isFetching = false;
    fetchPromise = null;
  });
  return fetchPromise;
}

/**
 * 发送 JSON 响应
 */
function sendJson(res: any, statusCode: number, data: any): void {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(data));
}

/**
 * 解析请求体（JSON）
 */
function parseBody(req: any): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

// ============================================================
// 维护路由（二期：插件生命周期 / 预设 / 技能）
// 路径契约:
//   GET  /workbench/api/plugin/list
//   POST /workbench/api/plugin/install            {source}
//   POST /workbench/api/plugin/uninstall/:id
//   POST /workbench/api/plugin/enable/:id
//   POST /workbench/api/plugin/disable/:id
//   POST /workbench/api/plugin/update/:id
//   POST /workbench/api/plugin/rollback/:id       {version}
//   GET  /workbench/api/plugin/versions/:id
//   GET  /workbench/api/preset/list
//   GET  /workbench/api/preset/composition/:id
//   POST /workbench/api/preset/copy               {from,id,name?}
//   POST /workbench/api/preset/save               {id,content}
//   POST /workbench/api/preset/validate           {id}
//   POST /workbench/api/preset/delete             {id}
//   GET  /workbench/api/skill/list
//   GET  /workbench/api/skill/content/:name
//   POST /workbench/api/skill/create              {name,description?}
//   POST /workbench/api/skill/save                {name,content}
//   POST /workbench/api/skill/delete              {name}
// 响应统一: { ok, data, errorCode, errorMessage, durationMs }
// ============================================================

interface AdminDeps {
  cliOpts: PluginCliOptions;
  getRoster: () => AgentPresetsService | undefined;
  logger: any;
}

function decodeSegment(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}

async function handleAdminRoute(
  pathname: string,
  method: string,
  req: any,
  res: any,
  deps: AdminDeps,
): Promise<boolean> {
  if (!pathname.startsWith('/workbench/api/')) return false;
  const parts = pathname.split('/').filter(Boolean); // ['workbench','api',kind,...]
  if (parts.length < 3) return false;
  const kind = parts[2];
  if (kind !== 'plugin' && kind !== 'preset' && kind !== 'skill') return false;

  const started = Date.now();
  let body: any = {};
  if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
    body = await parseBody(req);
  }
  const rest = parts.slice(3);
  const action = rest[0];
  const target = rest.length > 1 ? decodeSegment(rest.slice(1).join('/')) : '';

  const send = (result: { ok: boolean; data: any; error: string | null }, statusHint = 200) => {
    const status = result.ok ? 200 : (result as any).exitCode === 403 ? 403 : (result as any).exitCode === 404 ? 404 : (result as any).exitCode === 400 ? 400 : statusHint;
    sendJson(res, status, {
      ok: result.ok,
      data: result.data,
      errorCode: result.ok ? null : 'OPERATION_FAILED',
      errorMessage: result.error,
      durationMs: Date.now() - started,
    });
  };

  try {
    // ===== 插件生命周期 =====
    if (kind === 'plugin') {
      switch (action) {
        case 'list':
          return send(await listPlugins(deps.cliOpts), 200), true;
        case 'install':
          return send(installPlugin(body?.source || target, deps.cliOpts), 200), true;
        case 'uninstall':
          return send(uninstallPlugin(target, deps.cliOpts), 200), true;
        case 'enable':
          return send(enablePlugin(target, deps.cliOpts), 200), true;
        case 'disable':
          return send(disablePlugin(target, deps.cliOpts), 200), true;
        case 'update':
          return send(updatePlugin(target, { ...deps.cliOpts, version: body?.version }), 200), true;
        case 'rollback':
          return send(rollbackPlugin(target, body?.version || '', deps.cliOpts), 200), true;
        case 'versions':
          return send(await getVersions(target, deps.cliOpts), 200), true;
        default:
          sendJson(res, 400, { ok: false, data: null, errorCode: 'UNKNOWN_ACTION', errorMessage: `未知插件操作: ${action}`, durationMs: Date.now() - started });
          return true;
      }
    }

    // ===== 预设维护 =====
    if (kind === 'preset') {
      const roster = deps.getRoster();
      switch (action) {
        case 'list':
          return send(await listPresets(roster), 200), true;
        case 'composition':
          return send(await readPresetComposition(roster, target), 200), true;
        case 'copy':
          return send(await copyPreset(roster, body?.from, body?.id, body?.name), 200), true;
        case 'save':
          return send(await savePresetComposition(roster, body?.id, body?.content), 200), true;
        case 'validate':
          return send(await validatePreset(roster, body?.id || target), 200), true;
        case 'delete':
          return send(await deletePreset(roster, body?.id || target), 200), true;
        default:
          sendJson(res, 400, { ok: false, data: null, errorCode: 'UNKNOWN_ACTION', errorMessage: `未知预设操作: ${action}`, durationMs: Date.now() - started });
          return true;
      }
    }

    // ===== 技能维护 =====
    if (kind === 'skill') {
      const skillOpts = { dshHome: deps.cliOpts.dshHome };
      switch (action) {
        case 'list':
          return send(await listSkills(skillOpts), 200), true;
        case 'content':
          return send(await readSkill(target, skillOpts), 200), true;
        case 'create':
          return send(await createSkill(body?.name, body?.description || '', skillOpts), 200), true;
        case 'save':
          return send(await saveSkill(body?.name, body?.content, skillOpts), 200), true;
        case 'delete':
          return send(await deleteSkill(body?.name, skillOpts), 200), true;
        default:
          sendJson(res, 400, { ok: false, data: null, errorCode: 'UNKNOWN_ACTION', errorMessage: `未知技能操作: ${action}`, durationMs: Date.now() - started });
          return true;
      }
    }
  } catch (err: any) {
    deps.logger?.error?.(`维护路由异常 ${method} ${pathname}`, err);
    sendJson(res, 500, { ok: false, data: null, errorCode: 'INTERNAL', errorMessage: err?.message || 'Internal Server Error', durationMs: Date.now() - started });
    return true;
  }
  return false;
}

/**
 * 插件主入口
 * @param ctx Cordis 上下文
 * @param config 插件配置（来自 cordis.patch.yml 的 config 字段）
 */
export function apply(ctx: Context, config: PluginConfig = {}): void {
  const resolvedConfig = resolveConfig(config);
  const wbCtx = buildWorkbenchContext(ctx);
  const logger = wbCtx.logger ?? console;

  // 维护路由依赖：profile/dshHome 可配，agentPresets 服务按请求惰性获取
  const adminDeps: AdminDeps = {
    cliOpts: {
      profile: resolvedConfig.profile,
      dshHome: resolvedConfig.dshHome,
      dshBin: resolvedConfig.dshBin,
    },
    getRoster: () => {
      try {
        return (ctx as any).get?.('agentPresets') as AgentPresetsService | undefined;
      } catch {
        return undefined;
      }
    },
    logger,
  };

  logger.info(`正在挂载 v${VERSION}...`);
  logger.info(`配置：githubToken=${resolvedConfig.githubToken ? '已配置' : '未配置'}, customRepos=${resolvedConfig.customRepos.length}个, customPresetRepos=${resolvedConfig.customPresetRepos.length}个, customAppRepos=${resolvedConfig.customAppRepos.length}个`);

  // ===== 可选注入 webServer：纯 CLI profile 没有它也能正常启动 =====
  try {
    ctx.inject(['webServer'], (wctx: Context) => {
      wctx.effect(() => {
        const handler = async (req: any, res: any) => {
          const url = new URL(req.url, 'http://localhost');
          const pathname = url.pathname;

          try {
            // ===== GET /workbench/api/data - 获取工作台数据 =====
            if (pathname === '/workbench/api/data' && req.method === 'GET') {
              const force = url.searchParams.get('force') === 'true';
              const noCache = url.searchParams.get('nocache') === 'true';

              if (!force && !noCache && memoryData) {
                sendJson(res, 200, { ok: true, data: memoryData, fromMemory: true });
                return;
              }

              const result = await triggerFetch(wbCtx, resolvedConfig, force);
              sendJson(res, 200, { ok: true, data: result, fromMemory: false });
              return;
            }

            // ===== POST /workbench/api/refresh - 强制刷新数据 =====
            if (pathname === '/workbench/api/refresh' && req.method === 'POST') {
              const result = await triggerFetch(wbCtx, resolvedConfig, true);
              sendJson(res, 200, { ok: true, message: '数据已刷新', data: result });
              return;
            }

            // ===== GET /workbench/api/config - 获取插件配置 =====
            if (pathname === '/workbench/api/config' && req.method === 'GET') {
              sendJson(res, 200, {
                ok: true,
                config: {
                  cacheExpireSeconds: resolvedConfig.cacheExpireSeconds,
                  githubTokenConfigured: !!resolvedConfig.githubToken,
                  customReposCount: resolvedConfig.customRepos.length,
                  customPresetReposCount: resolvedConfig.customPresetRepos.length,
                  customAppReposCount: resolvedConfig.customAppRepos.length,
                },
                version: VERSION,
              });
              return;
            }

            // ===== GET /workbench/api/status - 插件状态 =====
            if (pathname === '/workbench/api/status' && req.method === 'GET') {
              const cache = await getLocalCache(wbCtx);
              sendJson(res, 200, {
                ok: true,
                plugin: PLUGIN_ID,
                version: VERSION,
                status: 'running',
                memoryCache: memoryData ? {
                  plugins: memoryData.plugins.length,
                  presets: memoryData.presets.length,
                  apps: memoryData.apps.length,
                  updateTime: memoryData.updateTime,
                  fromCache: memoryData.fromCache,
                } : null,
                fileCache: cache ? {
                  updateTime: cache.updateTime,
                  expireTime: cache.expireTime,
                  expired: Date.now() > cache.expireTime,
                  plugins: cache.pluginList.length,
                  presets: cache.presetList.length,
                  apps: cache.appList.length,
                } : null,
                isFetching,
              });
              return;
            }

            // ===== GET /workbench/api/cache - 查看原始缓存 =====
            if (pathname === '/workbench/api/cache' && req.method === 'GET') {
              const cache = await getLocalCache(wbCtx);
              if (cache) {
                sendJson(res, 200, { ok: true, cache: renderCacheData(cache), meta: { updateTime: cache.updateTime, expireTime: cache.expireTime } });
              } else {
                sendJson(res, 200, { ok: true, cache: null, message: '无缓存数据' });
              }
              return;
            }

            // ===== POST /workbench/api/cache/clear - 清空缓存 =====
            if (pathname === '/workbench/api/cache/clear' && req.method === 'POST') {
              memoryData = null;
              try {
                const cachePath = path.join(wbCtx.env.DSH_HOME, 'cache', 'workbench', 'index.json');
                await wbCtx.fs.writeFile(cachePath, JSON.stringify({ updateTime: 0, expireTime: 0, pluginList: [], presetList: [], appList: [] }));
              } catch (err) {
                // 忽略删除失败
              }
              sendJson(res, 200, { ok: true, message: '缓存已清空' });
              return;
            }

            // ===== 根路径：插件信息 =====
            if (pathname === '/workbench' || pathname === '/workbench/') {
              sendJson(res, 200, {
                ok: true,
                plugin: PLUGIN_ID,
                version: VERSION,
                description: 'DSH 插件/预设/应用统一工作台，侧边栏重构，双源数据抓取（Market+GitHub）',
                endpoints: [
                  'GET  /workbench/api/data',
                  'POST /workbench/api/refresh',
                  'GET  /workbench/api/config',
                  'GET  /workbench/api/status',
                  'GET  /workbench/api/cache',
                  'POST /workbench/api/cache/clear',
                  'GET  /workbench/api/plugin/list | POST install|uninstall/:id|enable/:id|disable/:id|update/:id|rollback/:id | GET versions/:id',
                  'GET  /workbench/api/preset/list | GET composition/:id | POST copy|save|validate|delete',
                  'GET  /workbench/api/skill/list | GET content/:name | POST create|save|delete',
                ],
              });
              return;
            }

            // ===== 维护路由：插件生命周期 + 预设 + 技能（二期） =====
            if (await handleAdminRoute(pathname, req.method || 'GET', req, res, adminDeps)) {
              return;
            }

            // 404
            sendJson(res, 404, { ok: false, error: 'Not Found', path: pathname });
          } catch (err: any) {
            logger.error(`HTTP 接口异常: ${pathname}`, err);
            sendJson(res, 500, { ok: false, error: err?.message || 'Internal Server Error' });
          }
        };

        wctx.webServer.register({
          kind: 'prefix',
          path: '/workbench',
          handler,
        });

        logger.info('HTTP 接口已注册: /workbench/api/*');
      });
    });
  } catch (err) {
    logger.warn('webServer 注入失败（非致命，HTTP 接口不可用）:', err);
  }

  // ===== 后台异步初始化数据（不阻塞启动）=====
  setTimeout(async () => {
    try {
      logger.info('后台初始化数据抓取...');
      await triggerFetch(wbCtx, resolvedConfig, false);
      logger.info('数据初始化完成');
    } catch (err) {
      logger.warn('数据初始化失败，将在首次访问时重试', err);
    }
  }, 2000);

  // ===== 注册定时任务（24h 增量同步）=====
  try {
    setupWorkbenchSchedule(wbCtx, resolvedConfig);
  } catch (err) {
    logger.warn('定时任务注册失败（非致命）:', err);
  }

  logger.info(`挂载完成 v${VERSION}`);
}

// 默认导出
export default apply;
