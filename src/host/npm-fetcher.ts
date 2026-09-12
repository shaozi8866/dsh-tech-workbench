/**
 * DSH 科技风工作台 - npm registry 抓取模块
 * 从 npm registry 搜索 API 抓取 DSH 插件/预设/应用/Skill 列表
 * 作为主外部数据源（替代不存在的 Market API 和不稳定的 GitHub 抓取）
 *
 * npm registry 搜索 API:
 *   GET https://registry.npmjs.org/-/v1/search?text=keywords:dsh-plugin&size=250
 *
 * 优势：
 *   - DSH 插件都是发布到 npm 的，数据完整
 *   - npm registry 稳定可靠，无严格限流
 *   - 支持关键词搜索、质量排序
 */

import {
  ResourceType,
  SourceType,
  StandardResource,
} from './types';
import { createDefaultResource, isValidSemver } from './utils';
import { classifyResource } from './category-classifier';
import { getResourceDescription, getResourceHomepage, getResourceCategory } from './resource-meta-database';
import type { WorkbenchContext } from './market-fetcher';

/** npm registry 搜索 API 基础 URL */
const NPM_SEARCH_API = 'https://registry.npmjs.org/-/v1/search';

/** 搜索关键词列表（按优先级排序） */
const SEARCH_KEYWORDS = [
  'keywords:dsh-plugin',
  'keywords:deepseek-harness',
  'keywords:dsh-preset',
  'keywords:dsh-skill',
  'dsh-plugin',
  'deepseek-harness plugin',
];

/** 单次搜索最大结果数 */
const SEARCH_SIZE = 250;

/**
 * 从 npm registry 抓取 DSH 插件列表
 * @param ctx 工作台上下文
 * @returns 标准化后的 npm 资源列表
 */
export async function fetchNpmPlugins(
  ctx: WorkbenchContext,
): Promise<StandardResource[]> {
  const result: StandardResource[] = [];
  const seenIds = new Set<string>();

  ctx.logger?.info('[NPM] 开始从 npm registry 抓取 DSH 插件...');

  try {
    // 逐个关键词搜索，合并去重
    for (const keyword of SEARCH_KEYWORDS) {
      try {
        const packages = await searchNpmPackages(ctx, keyword);
        ctx.logger?.info(`[NPM] 关键词 "${keyword}" 找到 ${packages.length} 个包`);

        for (const pkg of packages) {
          // 去重
          if (seenIds.has(pkg.name)) continue;
          seenIds.add(pkg.name);

          // 过滤非 DSH 插件
          if (!isDSHPlugin(pkg)) continue;

          // 过滤版本非法的
          if (!isValidSemver(pkg.version)) continue;

          // 判断资源类型
          const type = detectResourceType(pkg);

          // 自动分类（基于名称、描述、关键词）
          const autoCategory = classifyResource(
            pkg.name,
            pkg.description || '',
            pkg.keywords || [],
          );

          // 优先使用数据库中的分类，其次使用自动分类
          const category = getResourceCategory(pkg.name, autoCategory);

          // 优先使用数据库中的描述，其次使用 npm 原始描述
          const description = getResourceDescription(pkg.name, pkg.description || '');

          // 获取源网站链接（优先使用 npm 包的真实 homepage，其次使用数据库中的 homepage）
          const npmHomepage = pkg.links?.homepage || pkg.links?.repository || '';
          const dbHomepage = getResourceHomepage(pkg.name);
          // 优先使用 npm 真实 homepage，如果是 GitHub 仓库链接则更好
          // 如果 npm homepage 无效（如空或不是 http 开头），使用数据库中的
          // 如果都没有，生成 npm 包页面链接
          let homepage = npmHomepage;
          if (!homepage || !homepage.startsWith('http')) {
            homepage = dbHomepage;
          }
          if (!homepage || !homepage.startsWith('http')) {
            homepage = `https://www.npmjs.com/package/${encodeURIComponent(pkg.name)}`;
          }

          // 创建标准化资源
          const resource = createDefaultResource({
            id: pkg.name,
            name: pkg.name,
            type,
            category,
            description,
            author: pkg.author?.name || 'unknown',
            source: SourceType.NPM,
            isOfficial: pkg.author?.name === 'deepseek-ai',
            isInstalled: false,
            latestVersion: pkg.version,
            localVersion: '',
            adaptVersion: 'all',
            updateTime: pkg.date ? new Date(pkg.date).getTime() : Date.now(),
            star: 0, // npm 没有 star 数，后续可以从 GitHub 获取
            fork: 0,
            installCmd: `dsh plugin --profile web add ${pkg.name}`,
            homepage, // 源网站链接（正确的字段）
            configPath: '', // 本地配置文件路径（留空）
          });

          result.push(resource);
        }
      } catch (err) {
        ctx.logger?.warn(`[NPM] 关键词 "${keyword}" 搜索失败`, err);
      }
    }

    // 按类型统计
    const typeCount = {
      plugin: result.filter((r) => r.type === ResourceType.PLUGIN).length,
      preset: result.filter((r) => r.type === ResourceType.PRESET).length,
      app: result.filter((r) => r.type === ResourceType.APP).length,
      skill: result.filter((r) => r.type === ResourceType.SKILL).length,
    };

    ctx.logger?.info(
      `[NPM] 抓取完成：共 ${result.length} 个资源` +
      `（插件${typeCount.plugin}/预设${typeCount.preset}/应用${typeCount.app}/Skill${typeCount.skill}）`,
    );

    // 打印前10个插件名称，方便调试
    if (result.length > 0) {
      const names = result.slice(0, 10).map((r) => r.name);
      ctx.logger?.info(`[NPM] 前10个: ${names.join(', ')}`);
    }

    return result;
  } catch (err) {
    ctx.logger?.warn('[NPM] 抓取失败，降级为空列表', err);
    return result;
  }
}

/**
 * 搜索 npm 包
 */
async function searchNpmPackages(
  ctx: WorkbenchContext,
  text: string,
): Promise<NpmPackage[]> {
  const url = `${NPM_SEARCH_API}?text=${encodeURIComponent(text)}&size=${SEARCH_SIZE}`;

  const res = await ctx.http.get(url, {
    timeout: 15000,
  });

  if (res.status !== 200 || !res.data) {
    return [];
  }

  const objects = res.data.objects || [];
  return objects.map((obj: any) => obj.package as NpmPackage);
}

/**
 * 判断是否是 DSH 插件
 */
function isDSHPlugin(pkg: NpmPackage): boolean {
  const keywords = pkg.keywords || [];
  const name = pkg.name.toLowerCase();
  const description = (pkg.description || '').toLowerCase();

  // 关键词匹配
  const dshKeywords = ['dsh', 'deepseek-harness', 'dsh-plugin', 'dsh-preset', 'dsh-skill'];
  if (keywords.some((k) => dshKeywords.some((dk) => k.toLowerCase().includes(dk)))) {
    return true;
  }

  // 包名匹配
  if (name.startsWith('dsh-') || name.includes('deepseek-harness')) {
    return true;
  }

  // 描述匹配
  if (description.includes('deepseek harness') || description.includes('dsh plugin')) {
    return true;
  }

  return false;
}

/**
 * 根据包信息判断资源类型
 */
function detectResourceType(pkg: NpmPackage): ResourceType {
  const keywords = (pkg.keywords || []).map((k) => k.toLowerCase());
  const name = pkg.name.toLowerCase();

  // 优先关键词判断
  if (keywords.includes('dsh-preset') || keywords.includes('preset')) {
    return ResourceType.PRESET;
  }
  if (keywords.includes('dsh-skill') || keywords.includes('skill')) {
    return ResourceType.SKILL;
  }
  if (keywords.includes('dsh-app') || keywords.includes('app') || keywords.includes('agent')) {
    return ResourceType.APP;
  }

  // 包名判断
  if (name.includes('preset') || name.includes('template')) {
    return ResourceType.PRESET;
  }
  if (name.includes('skill')) {
    return ResourceType.SKILL;
  }
  if (name.includes('app') || name.includes('agent') || name.includes('workflow')) {
    return ResourceType.APP;
  }

  // 默认是插件
  return ResourceType.PLUGIN;
}

// ==============================================
// npm registry API 类型定义
// ==============================================

interface NpmPackage {
  name: string;
  version: string;
  description: string;
  keywords?: string[];
  author?: {
    name: string;
    email?: string;
    url?: string;
  };
  date: string;
  links?: {
    npm?: string;
    homepage?: string;
    repository?: string;
    bugs?: string;
  };
  publisher?: {
    username: string;
    email: string;
  };
  maintainers?: Array<{
    username: string;
    email: string;
  }>;
}
