/**
 * DSH 科技风工作台 - GitHub 副源抓取模块
 * 包含：分片节流抓取、单个仓库四层深度解析
 * 基于双源数据抓取全流程 阶段2 1:1 实现
 *
 * 四层解析：
 *   层1：仓库基础信息（star/fork/updated_at/license/description）
 *   层2：Release版本（最新tag/publish时间/changelog）
 *   层3：README结构化解析（适配版本/功能简介）
 *   层4：工程结构合规校验（DSH标准工程特征）
 *
 * 分片节流：
 *   - 单次并发：20个仓库/批次
 *   - 频率限制：最大2次/秒
 *   - 限流触发：终止后续请求，复用旧缓存
 */

import {
  FETCH_TIMEOUT,
  GITHUB_BATCH_SIZE,
  GITHUB_RATE_LIMIT_PER_SEC,
  ResourceType,
  SourceType,
  StandardResource,
} from './types';
import {
  checkDSHProjectStructure,
  createDefaultResource,
  getGithubRepoList,
  parseReadme,
  sleep,
  type HttpGetFn,
} from './utils';
import type { WorkbenchContext } from './market-fetcher';

// ==============================================
// 分类白名单（按资源类型分组）
// ==============================================

/** 插件类仓库白名单 */
const PLUGIN_WHITELIST: string[] = [
  'deepseek-harness/awesome-plugins',
  'deepseek-harness/dsh-ui-plugins',
  'cordsjs/cordis-plugin-market',
  'deepseek-harness/community-examples',
];

/** 预设类仓库白名单 */
const PRESET_WHITELIST: string[] = [
  'deepseek-harness/dsh-presets',
  'deepseek-harness/awesome-presets',
  'deepseek-harness/dsh-templates',
];

/** 应用类仓库白名单 */
const APP_WHITELIST: string[] = [
  'deepseek-harness/dsh-workflow-apps',
  'deepseek-harness/awesome-apps',
  'deepseek-harness/dsh-agent-apps',
];

/** Skill 类仓库白名单 */
const SKILL_WHITELIST: string[] = [
  'deepseek-harness/dsh-skills',
  'deepseek-harness/awesome-skills',
  'deepseek-harness/dsh-agent-skills',
  'deepseek-harness/community-skills',
];

/**
 * 获取全量分类白名单（合并所有类型）
 */
function getAllWhitelist(): string[] {
  return [...PLUGIN_WHITELIST, ...PRESET_WHITELIST, ...APP_WHITELIST, ...SKILL_WHITELIST];
}

/**
 * 根据仓库地址判断其在白名单中的类型
 * @returns ResourceType 或 null（不在白名单中）
 */
function getWhitelistType(repo: string): ResourceType | null {
  if (PLUGIN_WHITELIST.includes(repo)) return ResourceType.PLUGIN;
  if (PRESET_WHITELIST.includes(repo)) return ResourceType.PRESET;
  if (APP_WHITELIST.includes(repo)) return ResourceType.APP;
  if (SKILL_WHITELIST.includes(repo)) return ResourceType.SKILL;
  return null;
}

// ==============================================
// 资源类型自动识别
// ==============================================

/** 预设关键词（仓库名/描述/README） */
const PRESET_KEYWORDS = [
  'preset', 'presets', 'template', 'templates', 'prompt', 'prompts',
  '预设', '模板', '提示词',
];

/** 应用关键词（仓库名/描述/README） */
const APP_KEYWORDS = [
  'app', 'apps', 'application', 'applications', 'workflow', 'workflows',
  'agent', 'agents', 'bot', 'bots', 'automation',
  '应用', '工作流', '智能体', '自动化',
];

/** Skill 关键词（仓库名/描述/README） */
const SKILL_KEYWORDS = [
  'skill', 'skills', 'dsh-skill', 'agent-skill',
  '技能', '能力', '工具集',
];

/**
 * 检测仓库的资源类型（自动识别）
 *
 * 识别优先级：
 *   1. 强制类型（用户配置显式指定）
 *   2. 白名单分类
 *   3. 仓库名关键词匹配
 *   4. 仓库描述关键词匹配
 *   5. README 关键词匹配
 *   6. 默认插件类型
 *
 * @param repo 仓库地址 owner/repo
 * @param repoInfo 仓库基础信息
 * @param readmeContent README 内容（可选）
 * @param forcedType 强制类型（可选，用户配置指定）
 * @returns 识别出的资源类型
 */
export function detectResourceType(
  repo: string,
  repoInfo?: { name?: string; description?: string | null },
  readmeContent?: string,
  forcedType?: ResourceType,
): ResourceType {
  // 1. 强制类型优先
  if (forcedType) return forcedType;

  // 2. 白名单分类
  const whitelistType = getWhitelistType(repo);
  if (whitelistType) return whitelistType;

  // 组合所有可匹配的文本
  const repoName = repoInfo?.name || repo.split('/')[1] || '';
  const repoDesc = repoInfo?.description || '';
  const fullText = `${repo} ${repoName} ${repoDesc} ${readmeContent || ''}`.toLowerCase();

  // 3. 预设关键词匹配
  if (PRESET_KEYWORDS.some((kw) => fullText.includes(kw.toLowerCase()))) {
    return ResourceType.PRESET;
  }

  // 4. Skill 关键词匹配（在应用之前，因为 skill 更具体）
  if (SKILL_KEYWORDS.some((kw) => fullText.includes(kw.toLowerCase()))) {
    return ResourceType.SKILL;
  }

  // 5. 应用关键词匹配
  if (APP_KEYWORDS.some((kw) => fullText.includes(kw.toLowerCase()))) {
    return ResourceType.APP;
  }

  // 6. 默认插件类型
  return ResourceType.PLUGIN;
}

/**
 * 根据安装命令前缀判断类型（辅助）
 */
function getInstallCmd(type: ResourceType, repo: string): string {
  switch (type) {
    case ResourceType.PRESET:
      return `dsh preset add github:${repo}`;
    case ResourceType.APP:
      return `dsh app add github:${repo}`;
    case ResourceType.SKILL:
      return `dsh skill add github:${repo}`;
    case ResourceType.PLUGIN:
    default:
      return `dsh plugin add github:${repo}`;
  }
}

// ==============================================
// GitHub API 响应类型
// ==============================================

interface GithubRepoInfo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  pushed_at: string;
  default_branch: string;
  owner: { login: string; avatar_url: string };
  license: { spdx_id: string; name: string } | null;
}

interface GithubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  body: string;
  html_url: string;
}

interface GithubReadme {
  content: string;
  encoding: string;
  name: string;
  path: string;
}

// ==============================================
// GitHub 副源总入口：分片节流抓取
// ==============================================

/**
 * GitHub 副源异步分片抓取
 *
 * 执行模式：并行异步、分片节流、四层递进、解析容错
 * 不阻塞 Market 主源渲染，只做增量补齐，不覆盖官方资源
 *
 * 资源类型识别：
 *   - 白名单分类（插件/预设/应用分组）
 *   - 仓库名/描述/README 关键词自动识别
 *   - 用户配置显式指定（customPresetRepos / customAppRepos）
 *
 * @param ctx 工作台上下文
 * @param token GitHub 个人访问令牌（可选，匿名模式时为空）
 * @param customRepos 用户自定义通用仓库列表（自动识别类型）
 * @param customPresetRepos 用户自定义预设仓库列表（强制归类为预设）
 * @param customAppRepos 用户自定义应用仓库列表（强制归类为应用）
 * @returns 标准化后的 GitHub 社区资源列表
 */
export async function fetchGithubSource(
  ctx: WorkbenchContext,
  token: string,
  customRepos: string[] = [],
  customPresetRepos: string[] = [],
  customAppRepos: string[] = [],
): Promise<StandardResource[]> {
  // 合并全量白名单 + 用户自定义通用仓库
  const allRepos = getGithubRepoList([...getAllWhitelist(), ...customRepos]);

  // 构建强制类型映射 Map: repo -> ResourceType
  const forcedTypeMap = new Map<string, ResourceType>();
  customPresetRepos.forEach((r) => forcedTypeMap.set(r, ResourceType.PRESET));
  customAppRepos.forEach((r) => forcedTypeMap.set(r, ResourceType.APP));

  // 合并所有仓库（去重）
  const allRepoList = Array.from(new Set([...allRepos, ...customPresetRepos, ...customAppRepos]))
    .filter((r) => r && r.includes('/'));

  const result: StandardResource[] = [];
  let rateLimited = false;

  ctx.logger?.info(
    `[GitHub] 开始抓取：共 ${allRepoList.length} 个仓库` +
    `（插件白名单${PLUGIN_WHITELIST.length} + 预设白名单${PRESET_WHITELIST.length} + 应用白名单${APP_WHITELIST.length}` +
    ` + 自定义通用${customRepos.length} + 自定义预设${customPresetRepos.length} + 自定义应用${customAppRepos.length}）` +
    `，令牌=${token ? '已配置' : '匿名(60次/小时)'}`,
  );

  // 分片节流处理
  for (let i = 0; i < allRepoList.length; i += GITHUB_BATCH_SIZE) {
    if (rateLimited) {
      ctx.logger?.warn('[GitHub] 触发限流，停止后续批次抓取');
      break;
    }

    const batch = allRepoList.slice(i, i + GITHUB_BATCH_SIZE);
    const batchTasks = batch.map((repo) =>
      fetchSingleRepo(ctx, repo, token, forcedTypeMap.get(repo)).catch((err) => {
        ctx.logger?.warn(`[GitHub] 仓库 ${repo} 抓取异常`, err);
        return null;
      }),
    );

    // allSettled：单个仓库失败不影响整体
    const batchRes = await Promise.allSettled(batchTasks);

    for (const res of batchRes) {
      if (res.status === 'fulfilled' && res.value) {
        result.push(res.value);
      }
    }

    const typeCount = {
      plugin: result.filter((r) => r.type === ResourceType.PLUGIN).length,
      preset: result.filter((r) => r.type === ResourceType.PRESET).length,
      app: result.filter((r) => r.type === ResourceType.APP).length,
    };

    ctx.logger?.info(
      `[GitHub] 批次 ${Math.floor(i / GITHUB_BATCH_SIZE) + 1} 完成：` +
      `本批 ${batch.length} 个，成功 ${batchRes.filter((r) => r.status === 'fulfilled' && r.value).length} 个，` +
      `累计 ${result.length} 个（插件${typeCount.plugin}/预设${typeCount.preset}/应用${typeCount.app}）`,
    );

    // 频率节流：每批之间等待，避免触发 GitHub 限流
    if (i + GITHUB_BATCH_SIZE < allRepoList.length) {
      await sleep(1000 / GITHUB_RATE_LIMIT_PER_SEC);
    }
  }

  const finalCount = {
    plugin: result.filter((r) => r.type === ResourceType.PLUGIN).length,
    preset: result.filter((r) => r.type === ResourceType.PRESET).length,
    app: result.filter((r) => r.type === ResourceType.APP).length,
  };

  ctx.logger?.info(
    `[GitHub] 抓取完成：共获取 ${result.length} 个有效社区资源` +
    `（插件${finalCount.plugin}/预设${finalCount.preset}/应用${finalCount.app}）`,
  );
  return result;
}

// ==============================================
// 单个仓库四层深度解析
// ==============================================

/**
 * 单个 GitHub 仓库四层深度解析
 *
 * 逐层失败不击穿整体：
 *   - 层1失败 → 当前仓库直接跳过
 *   - 层2失败 → 标记为社区测试版，版本置0.0.0
 *   - 层3失败 → 回填仓库默认描述
 *   - 层4失败 → 非标准工程直接剔除
 *
 * 资源类型识别：
 *   - forcedType 优先（用户配置显式指定）
 *   - 白名单分类
 *   - 仓库名/描述/README 关键词自动识别
 *   - 默认插件类型
 *
 * @param ctx 工作台上下文
 * @param repo 仓库地址 owner/repo
 * @param token GitHub 访问令牌
 * @param forcedType 强制资源类型（可选，用户配置指定）
 * @returns 标准化资源，无效返回 null
 */
export async function fetchSingleRepo(
  ctx: WorkbenchContext,
  repo: string,
  token: string,
  forcedType?: ResourceType,
): Promise<StandardResource | null> {
  if (!repo || !repo.includes('/')) return null;

  const headers: Record<string, string> = token
    ? { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
    : { Accept: 'application/vnd.github.v3+json' };

  const httpGet: HttpGetFn = async (url, options) => {
    return ctx.http.get(url, { headers: { ...headers, ...(options?.headers || {}) }, timeout: options?.timeout || FETCH_TIMEOUT });
  };

  try {
    // ===== 层1：仓库基础信息 =====
    const repoInfoRes = await httpGet(`https://api.github.com/repos/${repo}`);
    if (repoInfoRes.status === 403 || repoInfoRes.status === 429) {
      ctx.dialog?.tip('GitHub访问受限，可配置Token提升额度');
      return null;
    }
    if (!repoInfoRes.data || repoInfoRes.status !== 200) return null;

    const repoInfo = repoInfoRes.data as GithubRepoInfo;

    // ===== 层2：Release版本 =====
    let latestVersion = '0.0.0';
    let publishTime = 0;
    try {
      const releaseRes = await httpGet(`https://api.github.com/repos/${repo}/releases/latest`);
      if (releaseRes.status === 200 && releaseRes.data?.tag_name) {
        const release = releaseRes.data as GithubRelease;
        latestVersion = release.tag_name;
        publishTime = new Date(release.published_at).getTime();
      }
    } catch (err) {
      // 无 release 的仓库：标记为社区测试版，版本置 0.0.0
      ctx.logger?.warn(`[GitHub] 仓库 ${repo} 无 Release，标记为测试版`);
    }

    // ===== 层3：README结构化解析 =====
    let desc = repoInfo.description || '社区开源资源，点击查看详情';
    let adaptVer = 'all';
    let readmeContent = '';
    try {
      const readmeRes = await httpGet(`https://api.github.com/repos/${repo}/readme`);
      if (readmeRes.status === 200 && readmeRes.data?.content) {
        const readmeData = readmeRes.data as GithubReadme;
        // Base64 解码 README 内容
        readmeContent = Buffer.from(readmeData.content, 'base64').toString('utf-8');
        const parsed = parseReadme(readmeContent);
        if (parsed.desc) desc = parsed.desc;
        adaptVer = parsed.adaptVer;
      }
    } catch (err) {
      // README 解析失败：回填仓库默认描述
      ctx.logger?.warn(`[GitHub] 仓库 ${repo} README 解析失败，使用默认描述`);
    }

    // ===== 资源类型自动识别 =====
    const resourceType = detectResourceType(repo, repoInfo, readmeContent, forcedType);
    if (resourceType !== ResourceType.PLUGIN || forcedType) {
      ctx.logger?.info(`[GitHub] 仓库 ${repo} 识别为 ${resourceType} 类型${forcedType ? '（用户指定）' : '（自动识别）'}`);
    }

    // ===== 层4：工程结构合规校验 =====
    const isValidProject = await checkDSHProjectStructure(repo, httpGet, headers);
    if (!isValidProject) {
      ctx.logger?.warn(`[GitHub] 仓库 ${repo} 非标准DSH工程，已过滤`);
      return null;
    }

    // ===== 组装标准化资源 =====
    // GitHub 仓库链接（优先使用 html_url，否则通过 full_name 构造）
    const githubUrl = repoInfo.html_url || `https://github.com/${repo}`;

    const resource = createDefaultResource({
      id: repo,
      name: repoInfo.name || repo.split('/')[1],
      type: resourceType, // 自动识别的资源类型（插件/预设/应用）
      category: resourceType === ResourceType.PRESET ? 'community-preset' : resourceType === ResourceType.APP ? 'community-app' : 'community',
      description: desc,
      author: repoInfo.owner?.login || '',
      source: SourceType.GITHUB,
      isOfficial: false,
      latestVersion,
      localVersion: '0.0.0',
      updateAvailable: false,
      adaptVersion: adaptVer,
      star: repoInfo.stargazers_count || 0,
      fork: repoInfo.forks_count || 0,
      updateTime: publishTime || new Date(repoInfo.updated_at).getTime() || Date.now(),
      installCmd: getInstallCmd(resourceType, repo), // 根据类型生成对应安装命令
      homepage: githubUrl, // GitHub 仓库链接
      configPath: '',
      isInstalled: false,
      isEnabled: false,
    });

    return resource;
  } catch (err: any) {
    // 限流403兜底
    if (err?.status === 403 || err?.response?.status === 403) {
      ctx.dialog?.tip('GitHub访问受限，可配置Token提升额度');
    }
    ctx.logger?.warn(`[GitHub] 仓库 ${repo} 抓取失败`, err);
    return null;
  }
}
