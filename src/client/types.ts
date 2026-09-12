/**
 * DSH 科技风工作台 - Client 侧类型定义
 */

export type ResourceType = 'plugin' | 'skill' | 'preset' | 'app';
export type SourceType = 'market' | 'github';
export type ThemeMode = 'auto' | 'dark' | 'light';

export interface StandardResource {
  id: string;
  name: string;
  type: ResourceType;
  category: string;
  description: string;
  author: string;
  source: SourceType;
  isOfficial: boolean;
  latestVersion: string;
  localVersion: string;
  updateAvailable: boolean;
  adaptVersion: string;
  star: number;
  fork: number;
  updateTime: number;
  installCmd: string;
  homepage: string;
  configPath: string;
  isInstalled: boolean;
  isEnabled: boolean;
}

export interface FetchResult {
  plugins: StandardResource[];
  skills: StandardResource[];
  presets: StandardResource[];
  apps: StandardResource[];
  fromCache: boolean;
  updateTime: number;
}

export interface PluginConfig {
  skinEnabled: boolean;
  defaultTheme: ThemeMode;
  cacheExpireSeconds: number;
  githubTokenConfigured: boolean;
  customReposCount: number;
}

export type SortField = 'name' | 'star' | 'updateTime' | 'version';
export type SortOrder = 'asc' | 'desc';
export type FilterStatus = 'all' | 'installed' | 'not-installed' | 'updatable' | 'official' | 'community';
