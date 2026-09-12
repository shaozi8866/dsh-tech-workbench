/**
 * DSH 科技风工作台 - 核心工具函数集
 * 包含：SemVer校验、版本比对、README解析、工程结构校验、仓库列表加载
 * 纯函数优先，依赖注入设计，便于单元测试
 */

import {
  FETCH_TIMEOUT,
  ResourceType,
  SourceType,
  StandardResource,
} from './types';

// ==============================================
// 纯函数：SemVer 校验与版本比对
// ==============================================

/**
 * SemVer 合法性校验
 * 匹配格式：主版本.次版本.修订版本，可选前缀v/V
 * @param v 待校验版本字符串
 * @returns 是否为合法 SemVer
 */
export function isValidSemver(v: string): boolean {
  if (!v || typeof v !== 'string') return false;
  const cleaned = v.replace(/^[vV]/, '').trim();
  return /^\d+\.\d+\.\d+/.test(cleaned);
}

/**
 * 版本比对
 * @param newVer 新版本号
 * @param oldVer 旧版本号
 * @returns 1: 新版本 > 旧版本; -1: 新版本 < 旧版本; 0: 相等
 */
export function compareVersion(newVer: string, oldVer: string): number {
  const parse = (v: string): number[] => {
    const cleaned = v.replace(/^[vV]/, '').trim();
    const parts = cleaned.split('.').map((p) => parseInt(p, 10) || 0);
    while (parts.length < 3) parts.push(0);
    return parts.slice(0, 3);
  };

  const n = parse(newVer);
  const o = parse(oldVer);

  for (let i = 0; i < 3; i++) {
    if (n[i] > o[i]) return 1;
    if (n[i] < o[i]) return -1;
  }
  return 0;
}

/**
 * 规范化版本号：去除v/V前缀，确保三段式
 * @param v 原始版本号
 * @returns 规范化后的版本号，非法则返回 "0.0.0"
 */
export function normalizeVersion(v: string): string {
  if (!isValidSemver(v)) return '0.0.0';
  const cleaned = v.replace(/^[vV]/, '').trim();
  const parts = cleaned.split('.').map((p) => parseInt(p, 10) || 0);
  while (parts.length < 3) parts.push(0);
  return `${parts[0]}.${parts[1]}.${parts[2]}`;
}

// ==============================================
// 纯函数：README 结构化解析
// ==============================================

export interface ParsedReadme {
  /** 功能简介（前120字符） */
  desc: string;
  /** 适配DSH版本 */
  adaptVer: string;
}

/**
 * 解析 GitHub README 内容，结构化提取适配版本、功能简介
 * @param content README 原文（已解码的纯文本）
 * @returns 解析结果 { desc, adaptVer }
 */
export function parseReadme(content: string): ParsedReadme {
  if (!content || typeof content !== 'string') {
    return { desc: '', adaptVer: 'all' };
  }

  let desc = '';
  let adaptVer = '';

  // 正则匹配适配版本规则（兼容多种社区写法）
  const versionReg = /适配版本[:：\s]+([vV\d.+,\\s]+)|支持\s*DSH[:：\s]+([\d.]+)|requires\s+dsh[:：\s]+([\d.]+)/gi;
  const versionMatch = content.match(versionReg);
  if (versionMatch && versionMatch.length > 0) {
    adaptVer = versionMatch[0]
      .replace(/适配版本|支持\s*DSH|requires\s+dsh|[:：\s]/gi, '')
      .trim();
  }

  // 默认兜底适配全版本
  if (!adaptVer) adaptVer = 'all';

  // 提取第一段有效描述（过滤标题、空行、链接、图片、标签、HTML注释、表格分隔）
  const lineList = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => {
      return (
        line &&
        !line.startsWith('#') &&
        !line.startsWith('!') &&
        !line.startsWith('[') &&
        !line.startsWith('<!--') &&
        !line.startsWith('---') &&
        !line.startsWith('|') &&
        !line.startsWith('>') &&
        line.length > 10
      );
    });

  if (lineList.length > 0) {
    // 去除markdown链接格式 [text](url)，保留text
    let firstLine = lineList[0].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    // 去除行内代码标记
    firstLine = firstLine.replace(/`([^`]+)`/g, '$1');
    // 截取前120字符作为简介，避免过长
    desc = firstLine.slice(0, 120);
  }

  return { desc, adaptVer };
}

// ==============================================
// 依赖注入函数：GitHub 仓库列表加载
// ==============================================

/**
 * 内置 DSH 生态官方白名单
 * 持续兼容社区主流插件/应用仓库
 */
export const DEFAULT_GITHUB_WHITELIST: string[] = [
  'deepseek-harness/awesome-plugins',
  'deepseek-harness/dsh-ui-plugins',
  'deepseek-harness/dsh-presets',
  'deepseek-harness/dsh-workflow-apps',
  'cordsjs/cordis-plugin-market',
  'deepseek-harness/community-examples',
];

/**
 * 获取 GitHub 抓取仓库列表
 * 规则：内置生态白名单 + 用户自定义源 + 自动去重
 * @param customRepos 用户自定义仓库列表（来自插件配置）
 * @returns 去重后的仓库列表（owner/repo 格式）
 */
export function getGithubRepoList(customRepos: string[] = []): string[] {
  const userList = Array.isArray(customRepos) ? customRepos : [];
  const allList = [...DEFAULT_GITHUB_WHITELIST, ...userList];

  const uniqueList = Array.from(new Set(allList)).filter(
    (item) => item && typeof item === 'string' && item.includes('/') && !item.includes(' '),
  );

  return uniqueList;
}

// ==============================================
// 依赖注入函数：DSH 工程结构合规校验
// ==============================================

/**
 * HTTP GET 函数接口（依赖注入，便于测试）
 */
export interface HttpGetFn {
  (url: string, options?: { headers?: Record<string, string>; timeout?: number }): Promise<{
    data: any;
    status: number;
  }>;
}

/**
 * 校验仓库是否为标准 DSH/Cordis 插件/应用工程
 * DSH标准工程核心文件特征（满足任意一组即为有效项目）：
 * - hasCordisPlugin: index.ts + package.json
 * - hasPatchConfig: patch.yml 或 cordis.yml
 * - hasDSHConfig: dsh.config.json 或 .dsh 目录
 *
 * @param repo 仓库地址 user/repo
 * @param httpGet HTTP GET 函数（注入 ctx.http.get）
 * @param headers GitHub 请求头（含 Authorization）
 * @returns 是否为有效 DSH 项目
 */
export async function checkDSHProjectStructure(
  repo: string,
  httpGet: HttpGetFn,
  headers: Record<string, string> = {},
): Promise<boolean> {
  if (!repo || !repo.includes('/')) return false;

  try {
    const fileRes = await httpGet(`https://api.github.com/repos/${repo}/contents`, {
      headers,
      timeout: FETCH_TIMEOUT,
    });

    if (!fileRes || !fileRes.data || !Array.isArray(fileRes.data)) return false;

    const fileNames = fileRes.data.map((f: any) => f.name as string);

    // DSH标准工程核心文件特征（满足任意一组即为有效项目）
    const hasCordisPlugin = fileNames.includes('index.ts') && fileNames.includes('package.json');
    const hasCordisPluginJs = fileNames.includes('index.js') && fileNames.includes('package.json');
    const hasPatchConfig = fileNames.includes('patch.yml') || fileNames.includes('cordis.yml');
    const hasDSHConfig = fileNames.includes('dsh.config.json') || fileNames.includes('.dsh');
    const hasSrcDir = fileNames.includes('src') && fileNames.includes('package.json');

    return hasCordisPlugin || hasCordisPluginJs || hasPatchConfig || hasDSHConfig || hasSrcDir;
  } catch (err) {
    return false;
  }
}

// ==============================================
// 辅助函数：创建空的 StandardResource
// ==============================================

/**
 * 创建一个默认值填充的 StandardResource
 * @param overrides 覆盖字段
 * @returns 完整的 StandardResource
 */
export function createDefaultResource(overrides: Partial<StandardResource> = {}): StandardResource {
  return {
    id: '',
    name: '',
    type: ResourceType.PLUGIN,
    category: 'uncategorized',
    description: '社区开源资源，点击查看详情',
    author: '',
    source: SourceType.GITHUB,
    isOfficial: false,
    latestVersion: '0.0.0',
    localVersion: '0.0.0',
    updateAvailable: false,
    adaptVersion: 'all',
    star: 0,
    fork: 0,
    updateTime: 0,
    installCmd: '',
    homepage: '',
    configPath: '',
    isInstalled: false,
    isEnabled: false,
    ...overrides,
  };
}

/**
 * 睡眠工具函数
 * @param ms 毫秒
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
