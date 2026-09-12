/**
 * DSH 科技风工作台 - 全局类型定义与常量
 * 基于双源数据抓取全流程结构化TS伪代码 1:1 实现
 */

// ==============================================
// 全局配置常量
// ==============================================

/** 缓存过期时间（秒），默认24小时 */
export const CACHE_EXPIRE_SECONDS = 24 * 60 * 60;

/** 单接口超时（毫秒） */
export const FETCH_TIMEOUT = 5000;

/** 失败重试次数 */
export const FETCH_RETRY_TIMES = 2;

/** GitHub API 每秒最大请求数 */
export const GITHUB_RATE_LIMIT_PER_SEC = 2;

/** GitHub 单次分片批量抓取仓库数 */
export const GITHUB_BATCH_SIZE = 20;

/** 缓存文件相对路径 */
export const CACHE_RELATIVE_PATH = 'cache/workbench/index.json';

// ==============================================
// 枚举定义
// ==============================================

/** 资源类型 */
export enum ResourceType {
  PLUGIN = 'plugin',
  PRESET = 'preset',
  APP = 'app',
  SKILL = 'skill',
}

/** 数据源类型 */
export enum SourceType {
  MARKET = 'market',
  GITHUB = 'github',
  LOCAL = 'local',
  NPM = 'npm',
}

// ==============================================
// 核心数据模型
// ==============================================

/**
 * 标准化资源 Model（归一化后统一结构）
 * 所有来源（Market/GitHub）的数据最终都收敛为此结构
 */
export interface StandardResource {
  /** 资源唯一ID */
  id: string;
  /** 资源名称 */
  name: string;
  /** 资源类型：插件/预设/应用 */
  type: ResourceType;
  /** 语义分类 */
  category: string;
  /** 功能简介 */
  description: string;
  /** 作者 */
  author: string;
  /** 数据来源标记 */
  source: SourceType;
  /** 是否官方资源 */
  isOfficial: boolean;

  /** 云端最新版本号（SemVer） */
  latestVersion: string;
  /** 本地已安装版本号 */
  localVersion: string;
  /** 是否有可更新版本 */
  updateAvailable: boolean;
  /** 适配DSH版本区间 */
  adaptVersion: string;

  /** GitHub Star 数 */
  star: number;
  /** GitHub Fork 数 */
  fork: number;
  /** 最近更新时间戳 */
  updateTime: number;

  /** 安装命令 */
  installCmd: string;
  /** 源网站链接（npm/GitHub 等） */
  homepage: string;
  /** 本地配置文件路径 */
  configPath: string;
  /** 是否已安装 */
  isInstalled: boolean;
  /** 是否已启用 */
  isEnabled: boolean;
}

/**
 * 工作台缓存结构
 * 落地到 $DSH_HOME/cache/workbench/index.json
 */
export interface WorkbenchCache {
  /** 缓存更新时间戳 */
  updateTime: number;
  /** 缓存过期时间戳 */
  expireTime: number;
  /** 插件列表 */
  pluginList: StandardResource[];
  /** 预设列表 */
  presetList: StandardResource[];
  /** 应用列表 */
  appList: StandardResource[];
  /** Skill 列表 */
  skillList: StandardResource[];
}

/**
 * 插件配置（来自 cordis.patch.yml config 字段）
 */
export interface PluginConfig {
  /** GitHub 个人访问令牌 */
  githubToken?: string;
  /** 用户自定义 GitHub 仓库源列表（通用，自动识别类型） */
  customRepos?: string[];
  /** 用户自定义预设仓库列表（强制归类为预设） */
  customPresetRepos?: string[];
  /** 用户自定义应用仓库列表（强制归类为应用） */
  customAppRepos?: string[];
  /** 缓存过期时间（秒） */
  cacheExpireSeconds?: number;
}

/**
 * 解析后的完整配置（带默认值）
 * v2.0：皮肤已独立为 dsh-tech-skin，移除 skinEnabled/defaultTheme
 */
export interface ResolvedConfig {
  githubToken: string;
  customRepos: string[];
  customPresetRepos: string[];
  customAppRepos: string[];
  cacheExpireSeconds: number;
}

/**
 * GitHub 仓库基础信息（API 返回结构的精简版）
 */
export interface GithubRepoInfo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  pushed_at: string;
  default_branch: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  license: {
    spdx_id: string;
    name: string;
  } | null;
}

/**
 * GitHub Release 信息
 */
export interface GithubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  body: string;
  html_url: string;
}

/**
 * GitHub 目录文件项
 */
export interface GithubContentItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size: number;
  download_url: string | null;
}
