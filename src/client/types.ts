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
  /** 版本时间线（可选：生命周期扩展） */
  versions?: Array<{ version: string; installedAt: string; backedUp: boolean; backupPath: string | null }>;
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

// ==============================================
// 插件生命周期管理扩展类型 (SPEC v3.2)
// ==============================================

/** 生命周期状态枚举 */
export type PluginLifecycleState =
  | 'discovered'
  | 'installed'
  | 'disabled'
  | 'installing'
  | 'uninstalling'
  | 'updating'
  | 'rolling_back'
  | 'error';

/** 安装类型 */
export type PluginInstallType = 'bundle' | 'insert';

/** 版本快照记录 */
export interface VersionSnapshot {
  version: string;
  installedAt: string;
  backedUp: boolean;
  backupPath: string | null;
}

/** 扩展后的插件条目 */
export interface PluginItem {
  id: string;
  name: string;
  version: string;
  source: 'market' | 'github';
  installed: boolean;
  enabled: boolean;
  updateAvailable: boolean;
  lifecycleState: PluginLifecycleState;
  installType: PluginInstallType;
  protected: boolean;
  versions: VersionSnapshot[];
  latestVersion: string | null;
  lastError: string | null;
}

/** 前端操作进行中的本地状态 */
export interface PendingAction {
  pluginId: string;
  action: 'install' | 'uninstall' | 'enable' | 'disable' | 'update' | 'rollback';
  startedAt: number;
}

/** 操作反馈 */
export interface ActionFeedback {
  pluginId: string;
  action: PendingAction['action'];
  ok: boolean;
  message: string;
  autoDismissMs: number;
}


// ==============================================
// 组件 Props 接口 (SPEC v8)
// ==============================================

export interface PluginActionDialogProps {
  open: boolean;
  action: 'update' | 'rollback' | 'uninstall';
  pluginId: string;
  fromVersion?: string;
  toVersion?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
}

export interface VersionTimelineProps {
  versions: VersionSnapshot[];
  currentVersion: string;
  onSelect: (version: string) => void;
  selected: string | null;
}

export interface InstallFormProps {
  onSubmit: (source: string) => void;
  busy: boolean;
  errorMessage: string | null;
}

export interface ActionFeedbackProps {
  feedback: ActionFeedback | null;
  onDismiss: () => void;
}

export interface PluginActionsProps {
  plugin: PluginItem;
  pending: PendingAction | null;
  onAction: (
    action: PendingAction['action'],
    pluginId: string,
    payload?: { version?: string }
  ) => void;
}

