# dsh-tech-workbench 插件生命周期管理 — 实现规格书（SPEC v1.0）

> **⚠️ 方案状态（09-18 二期接管时更新）**：本 SPEC 第 2.1/6 章的「骨架服务套件」
> （plugin-lifecycle-service / persistence-service / version-manager-service / package-installer / safety-guard）
> **已整体作废**，实现改为 09-18 复盘定稿的 **方案A（dsh plugin 命令转发 + cordis.patch.yml 托管区块）**。
> 仍然有效的部分：§4 错误码思路、§5.2 托管区块格式、§7 HTTP 路径契约（plugin 系）与 §8 组件契约。
> **二期扩展（v2.4.0）**：预设维护 `/workbench/api/preset/{list,composition/:id,copy,save,validate,delete}`
> （agentPresets 名册服务，组合编辑仅限 trust=user；system 只读）；
> 技能维护 `/workbench/api/skill/{list,content/:name,create,save,delete}`
> （用户技能根 ~/.dsh/skills，目录型 SKILL.md 或扁平 .md，路径净化防逃逸）。
> 实现与测试见 `src/host/{plugin,preset,skill}-cli.ts`、`tests/{plugin,preset,skill}-cli.test.ts`、
> `tests/e2e-build-smoke.mjs`（118 单元 + 9 冒烟全绿）。


> 目标读者：coding agent / 开发者
> 本文件为唯一事实来源（SSOT）。实现时不得偏离本文件定义的字段名、错误码、路径、测试断言。
> 若确需变更，先在交付说明中提出，等待确认后再改。

---

## 1. 背景与目标

### 1.1 项目背景

`dsh-tech-workbench` 是一个 bundle 插件（同时声明 `dsh.bundle` 和 `dsh.client`），npm 包名 `dsh-tech-workbench`。它当前是一个信息展示型工作台，已实现：

- 双源数据抓取：Market 官方源 + GitHub 社区源
- 插件自动分类：6 级优先级识别
- 智能去重合并：官方优先、社区补齐
- 本地状态联动：自动匹配已安装插件、启停状态、版本更新提醒（只读展示）
- 双层缓存：内存 + 文件持久化
- 24h 定时同步
- 故障降级：单源失败复用旧缓存
- 侧边栏注入：MutationObserver 监听 DOM
- 主题自适应：`--dsw-alias-*` CSS 变量

### 1.2 开发目标

在现有工作台上扩展「插件生命周期管理」能力，支持：安装、卸载、启用、停用、更新、回退。

**核心原则：不重写现有代码，在现有架构上扩展。复用现有数据层（`market-fetcher`、`github-fetcher`、`data-processor`），新增 Host 端服务层与前端组件。**

### 1.3 技术约束（来自 dsh 架构）

- dsh 是插件化架构，一切皆插件，由 Cordis 元框架驱动挂载/卸载/注册项回收。
- 插件启停必须通过 Cordis Loader 的公共条目 API：`entry.update({ disabled: true/false })`。不得绕过 Loader 直接操作模块。
- 开关状态持久化到 profile 的 `cordis.patch.yml` 托管区块。
- 安装分流：声明 `dsh.bundle` 的包走层栈安装（重启生效）；纯 Cordis 包走 insert 行安装（HMR 实时生效）。

---

## 2. 当前代码库结构

```
dsh-tech-workbench/
├── package.json              # dsh.bundle + dsh.client 声明
├── cordis.patch.yml          # profile 补丁配置
├── tsdown.config.ts
├── src/
│   ├── index.ts              # Host 入口（HTTP 接口 + 生命周期）
│   ├── host/
│   │   ├── types.ts          # 类型定义
│   │   ├── utils.ts
│   │   ├── market-fetcher.ts # Market 主源抓取
│   │   ├── github-fetcher.ts # GitHub 副源抓取（自动分类）
│   │   └── data-processor.ts # 数据处理与调度
│   └── client/
│       ├── index.tsx
│       ├── workbench.css.ts
│       ├── sidebar-integration.ts
│       ├── types.ts
│       └── components/
│           ├── WorkbenchPage.tsx
│           ├── ResourceCard.tsx
│           ├── ActionBar.tsx      # 已有操作按钮区域
│           ├── Pagination.tsx
│           └── EmptyState.tsx
├── lib/                      # 构建产物
└── tests/                    # 79 个单元测试
```

现有 HTTP API（只读或缓存管理，全部保留不动）：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/workbench/api/data` | 获取工作台数据 |
| POST | `/workbench/api/refresh` | 强制刷新数据 |
| GET | `/workbench/api/config` | 获取插件配置 |
| GET | `/workbench/api/status` | 插件运行状态 |
| GET | `/workbench/api/cache` | 查看原始缓存 |
| POST | `/workbench/api/cache/clear` | 清空缓存 |

### 2.1 扩展后的文件结构

新增文件（不动现有文件结构）：

```
src/
├── host/
│   ├── errors.ts                     # 新增：错误码与 PluginAdminError
│   ├── plugin-lifecycle-service.ts   # 新增：启停核心
│   ├── persistence-service.ts        # 新增：托管区块持久化
│   ├── version-manager-service.ts    # 新增：快照与回退
│   ├── package-installer.ts          # 新增：安装分流
│   ├── safety-guard-service.ts       # 新增：保护名单
│   └── plugin-admin-router.ts        # 新增：HTTP 路由注册
└── client/
    └── components/
        ├── PluginActionDialog.tsx    # 新增：操作确认弹窗
        ├── VersionTimeline.tsx       # 新增：版本时间线
        ├── InstallForm.tsx           # 新增：安装输入
        └── ActionFeedback.tsx        # 新增：操作反馈
```

---

## 3. 数据模型（逐字段固化）

### 3.1 Host 端类型 `src/host/types.ts`

```typescript
/** 生命周期状态枚举，穷举，不得新增未定义值 */
export type PluginLifecycleState =
  | 'discovered'    // 发现但未安装
  | 'installed'     // 已安装且启用
  | 'disabled'      // 已安装但停用
  | 'installing'    // 安装中（瞬态）
  | 'uninstalling'  // 卸载中（瞬态）
  | 'updating'      // 更新中（瞬态）
  | 'rolling_back'  // 回退中（瞬态）
  | 'error';        // 操作失败（瞬态，保留 5s 后回到上一稳定态）

/** 安装类型，由包元数据 dsh.bundle 是否存在决定 */
export type PluginInstallType = 'bundle' | 'insert';

/** 版本快照记录 */
export interface VersionSnapshot {
  /** 语义化版本号，如 "2.2.4" */
  version: string;
  /** ISO 8601 UTC，如 "2026-09-17T08:30:00.000Z" */
  installedAt: string;
  /** 快照是否已落盘 */
  backedUp: boolean;
  /** 快照目录相对路径，如 "plugin-backups/dsh-tech-workbench/2.2.4" */
  backupPath: string | null;
}

/** 扩展后的插件条目（在现有 PluginItem 基础上新增字段） */
export interface PluginItem {
  // ---- 现有字段保持不变 ----
  id: string;
  name: string;
  version: string;
  source: 'market' | 'github';
  installed: boolean;
  enabled: boolean;
  updateAvailable: boolean;

  // ---- 新增字段 ----
  lifecycleState: PluginLifecycleState;
  installType: PluginInstallType;
  protected: boolean;
  versions: VersionSnapshot[];
  latestVersion: string | null;
  lastError: string | null;
}

/** 操作结果统一返回体 */
export interface OperationResult<T = void> {
  ok: boolean;
  /** 成功时的数据载荷 */
  data: T | null;
  /** 失败时的错误码，见第 4 节 */
  errorCode: PluginAdminErrorCode | null;
  /** 失败时的可读信息（用于 UI 展示，中文） */
  errorMessage: string | null;
  /** 操作耗时，毫秒 */
  durationMs: number;
}
```

**固化约束**：

1. `PluginLifecycleState` 的 8 个值不得增删。瞬态（installing/uninstalling/updating/rolling_back/error）只由 Host 端产生，前端不得自行设置。
2. `version` 一律使用 `string`，不做 semver 对象化。
3. 时间一律 ISO 8601 UTC 字符串，不使用时间戳数字。

### 3.2 Client 端类型 `src/client/types.ts`

Client 端 `PluginItem` 与 Host 端字段完全一致（通过 `import type` 复用或复制定义，字段名不得差异）。新增：

```typescript
/** 前端操作进行中的本地状态，与后端瞬态解耦 */
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
  /** 成功后自动消失的毫秒数，失败时为 0（需手动关闭） */
  autoDismissMs: number;
}
```

---

## 4. 错误码体系（穷举）

`src/host/errors.ts` 中定义，所有 API 失败必须返回其中之一，不得自创。

```typescript
export enum PluginAdminErrorCode {
  // 400 类
  INVALID_SOURCE          = 'INVALID_SOURCE',          // 包名/URL 格式非法
  INVALID_VERSION         = 'INVALID_VERSION',         // 版本号不存在于历史
  MISSING_PARAM           = 'MISSING_PARAM',           // 必填参数缺失

  // 403 类
  PROTECTED_PLUGIN        = 'PROTECTED_PLUGIN',        // 目标在保护名单
  UNSAFE_ORIGIN           = 'UNSAFE_ORIGIN',           // 请求来源校验失败

  // 404 类
  PLUGIN_NOT_FOUND        = 'PLUGIN_NOT_FOUND',        // Loader 中不存在该条目
  SNAPSHOT_NOT_FOUND      = 'SNAPSHOT_NOT_FOUND',      // 指定版本快照不存在
  PACKAGE_NOT_FOUND       = 'PACKAGE_NOT_FOUND',       // 远端包不存在

  // 409 类
  ALREADY_INSTALLED       = 'ALREADY_INSTALLED',       // 重复安装
  NOT_INSTALLED           = 'NOT_INSTALLED',           // 对未安装插件执行卸载
  STATE_CONFLICT          = 'STATE_CONFLICT',          // 已有操作进行中
  NO_UPDATE_AVAILABLE     = 'NO_UPDATE_AVAILABLE',     // 已是最新版本

  // 500 类
  INSTALL_FAILED          = 'INSTALL_FAILED',          // pnpm/npm 安装失败
  UNINSTALL_FAILED        = 'UNINSTALL_FAILED',
  UPDATE_FAILED           = 'UPDATE_FAILED',
  ROLLBACK_FAILED         = 'ROLLBACK_FAILED',
  PERSIST_FAILED          = 'PERSIST_FAILED',          // 写 cordis.patch.yml 失败
  LOADER_ERROR            = 'LOADER_ERROR',            // Cordis Loader 抛出异常
  INTERNAL_ERROR          = 'INTERNAL_ERROR',          // 兜底
}

export class PluginAdminError extends Error {
  constructor(
    public readonly code: PluginAdminErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'PluginAdminError';
  }
}
```

**HTTP 状态码映射（固定）**：

| 错误码前缀 | HTTP 状态 |
|------------|-----------|
| `INVALID_*`, `MISSING_PARAM` | 400 |
| `PROTECTED_PLUGIN`, `UNSAFE_ORIGIN` | 403 |
| `*_NOT_FOUND` | 404 |
| `ALREADY_*`, `NOT_INSTALLED`, `STATE_CONFLICT`, `NO_UPDATE_AVAILABLE` | 409 |
| 其余 | 500 |

---

## 5. 持久化格式（精确到字节）

### 5.1 状态文件 `.dsh-plugin-admin/state.json`

位于 profile 根目录。用途：运行时状态缓存，加速启动读取。格式固定：

```json
{
  "schemaVersion": 1,
  "updatedAt": "2026-09-17T08:30:00.000Z",
  "disabled": ["plugin-a", "plugin-b"],
  "installTypes": {
    "plugin-a": "bundle",
    "plugin-b": "insert"
  }
}
```

- `schemaVersion` 固定为 `1`，未来变更时递增并做迁移。
- `disabled` 数组内 id 去重、字典序升序。
- 文件写入必须原子（写临时文件 + `fs.rename`）。

### 5.2 `cordis.patch.yml` 托管区块

在该文件中维护如下区块，**区块外内容 byte-for-byte 保留**：

```yaml
# === dsh-tech-workbench managed block begin ===
# 此区块由插件管理面板自动维护，请勿手动编辑
- id: plugin-a
  disabled: true
- id: plugin-b
  disabled: true
# === dsh-tech-workbench managed block end ===
```

**固化规则**：

1. 区块标记行必须完全一致（含前后空格），不得改写。
2. 若文件中已存在 begin 标记行，更新时整体替换该区块，不动其他行。
3. 若不存在，则追加到文件末尾，前置一个空行。
4. 区块内条目顺序与 `state.json` 的 `disabled` 数组顺序一致。
5. 若某插件在 `cordis.patch.yml` 区块外已有条目（如 profile 自带），启用/停用优先在该条目上修改 `disabled` 字段，不新增条目；此情况下 `state.json` 仍记录。

### 5.3 快照目录结构

```
{dshProfileRoot}/
└── plugin-backups/
    └── {plugin-id}/
        └── {version}/
            ├── manifest.json      # 快照元数据
            ├── package.json       # 插件 package.json 副本
            └── files/             # 插件关键文件（若 installType=bundle）
```

`manifest.json` 格式：

```json
{
  "pluginId": "dsh-tech-workbench",
  "version": "2.2.4",
  "installType": "bundle",
  "createdAt": "2026-09-17T08:30:00.000Z",
  "source": "github:shaozi8866/dsh-tech-workbench",
  "enabledBeforeBackup": true
}
```

---

## 6. Host 服务层接口（方法签名 + 契约）

所有服务均为 class，构造函数接收依赖注入，方法返回值统一为 `Promise<OperationResult<T>>` 或抛 `PluginAdminError`。

### 6.1 SafetyGuardService

```typescript
export class SafetyGuardService {
  /** 保护名单，正则或精确匹配 */
  private readonly patterns: Array<string | RegExp>;

  /**
   * 校验目标是否受保护。
   * @throws PluginAdminError(PROTECTED_PLUGIN) 当 id 命中保护名单
   */
  assertNotProtected(id: string): void;

  /** 纯查询，不抛异常 */
  isProtected(id: string): boolean;
}
```

保护名单（精确，不得增删）：

```
webserver
connection
api-gateway
modules
/^typert/
/^web/
hmr
dsh-tech-workbench
```

### 6.2 PersistenceService

```typescript
export class PersistenceService {
  constructor(private rootDir: string) {}

  /**
   * 读取 state.json。文件不存在时返回默认值（disabled=[]）。
   * @throws PluginAdminError(PERSIST_FAILED) JSON 解析失败
   */
  async readState(): Promise<PluginAdminState>;

  /**
   * 设置某插件的禁用状态。
   * 副作用：
   *   1. 更新 state.json（原子写）
   *   2. 更新 cordis.patch.yml 托管区块
   * @throws PluginAdminError(PERSIST_FAILED) 任一文件写失败
   */
  async setDisabled(id: string, disabled: boolean): Promise<void>;

  /**
   * 记录插件安装类型。
   * @throws PluginAdminError(PERSIST_FAILED)
   */
  async setInstallType(id: string, type: PluginInstallType): Promise<void>;

  /**
   * 读取 cordis.patch.yml 原始文本（用于测试断言字节保留）。
   */
  async readPatchRaw(): Promise<string>;
}
```

### 6.3 PluginLifecycleService

```typescript
export class PluginLifecycleService {
  constructor(
    private loader: CordisLoader,
    private persistence: PersistenceService,
    private guard: SafetyGuardService,
    private dataProcessor: DataProcessor,
  ) {}

  /**
   * 启用/停用。幂等：目标状态与当前一致时直接返回 ok。
   * @throws PROTECTED_PLUGIN | PLUGIN_NOT_FOUND | STATE_CONFLICT | LOADER_ERROR | PERSIST_FAILED
   */
  async toggle(id: string, enabled: boolean): Promise<OperationResult>;

  /** 当前是否启用 */
  async isEnabled(id: string): Promise<boolean>;

  /** 从 Loader 读取条目元数据 */
  async getEntryMeta(id: string): Promise<{ id: string; disabled: boolean } | null>;

  /**
   * 检查某插件是否正在执行操作（用于 STATE_CONFLICT）。
   * 内部维护 Map<string, PendingAction>。
   */
  isBusy(id: string): boolean;
}
```

**toggle 契约细节（顺序不可变更）**：

1. 调用 `guard.assertNotProtected(id)`。
2. 若 `isBusy(id)` 为 true，抛 `STATE_CONFLICT`。
3. 若 Loader 中不存在条目，抛 `PLUGIN_NOT_FOUND`。
4. 若当前 `disabled === !enabled`（即已是目标状态），直接返回 `ok: true, data: null`。
5. 标记 busy，调用 `loader.getEntry(id).update({ disabled: !enabled })`。
6. 成功后调用 `persistence.setDisabled(id, !enabled)`。
7. 调用 `dataProcessor.invalidateCache(id)`。
8. 清除 busy，返回 `ok: true`。
9. 任一步失败：清除 busy，回滚已完成的步骤（若 Loader 已改但持久化失败，尝试 Loader 回滚），抛对应错误。

### 6.4 VersionManagerService

```typescript
export class VersionManagerService {
  constructor(
    private rootDir: string,
    private lifecycle: PluginLifecycleService,
    private persistence: PersistenceService,
    private installer: PackageInstaller,
  ) {}

  /**
   * 备份当前版本。
   * @returns 快照记录
   * @throws INTERNAL_ERROR 目录创建或复制失败
   */
  async snapshot(id: string, version: string, meta: SnapshotMeta): Promise<VersionSnapshot>;

  /**
   * 列出某插件的所有快照，按 installedAt 降序。
   */
  async listSnapshots(id: string): Promise<VersionSnapshot[]>;

  /**
   * 更新插件到最新版本。
   * 流程：
   *   1. busy 检查（STATE_CONFLICT）
   *   2. guard 检查（PROTECTED_PLUGIN）
   *   3. 读取当前版本，若已最新 → NO_UPDATE_AVAILABLE
   *   4. 记录 wasEnabled
   *   5. snapshot 当前版本
   *   6. 若 wasEnabled → lifecycle.toggle(id, false)
   *   7. installer.install(id, { update: true })
   *   8. 若 wasEnabled → lifecycle.toggle(id, true)
   *   9. 失败时：恢复快照 + 恢复 wasEnabled 状态
   * @throws UPDATE_FAILED | SNAPSHOT_NOT_FOUND | ...
   */
  async update(id: string): Promise<OperationResult<{ from: string; to: string }>>;

  /**
   * 回退到指定版本。
   * 流程同 update，但使用 restoreSnapshot 而非 installer.install。
   * @throws INVALID_VERSION 当 version 不在快照列表
   */
  async rollback(id: string, version: string): Promise<OperationResult<{ from: string; to: string }>>;

  /**
   * 从快照恢复文件与 package.json。
   * @throws SNAPSHOT_NOT_FOUND | ROLLBACK_FAILED
   */
  async restoreSnapshot(id: string, version: string): Promise<void>;
}
```

### 6.5 PackageInstaller

```typescript
export class PackageInstaller {
  /**
   * 规范化来源。
   * 规则：
   *   - "https://github.com/o/r" → "github:o/r"
   *   - "github.com/o/r"         → "github:o/r"
   *   - "o/r"                     → "github:o/r"（仅当含 "/" 且非 npm 作用域）
   *   - 其他原样返回（npm 包名）
   * @throws INVALID_SOURCE 空字符串或包含非法字符
   */
  normalizeSource(source: string): string;

  /**
   * 探测包类型。
   * 读取远端 package.json，若 dsh.bundle 存在 → 'bundle'，否则 → 'insert'。
   * @throws PACKAGE_NOT_FOUND
   */
  inspectType(source: string): Promise<PluginInstallType>;

  /**
   * 安装。
   * bundle 类：写入 profile package.json 依赖 + dsh.profile.bundles
   * insert 类：写入 cordis.patch.yml
   * @throws INSTALL_FAILED
   */
  install(id: string, opts: { update?: boolean; source?: string }): Promise<void>;

  /**
   * 卸载。
   * @throws UNINSTALL_FAILED
   */
  uninstall(id: string): Promise<void>;

  /**
   * 检查是否有新版本。
   */
  checkUpdate(id: string): Promise<{ current: string; latest: string; updateAvailable: boolean }>;
}
```

---

## 7. HTTP API 契约（逐接口）

所有接口统一前缀 `/workbench/api/plugin`。请求体 `application/json`。响应体统一为：

```typescript
{
  ok: boolean;
  data: T | null;
  errorCode: string | null;
  errorMessage: string | null;
  durationMs: number;
}
```

### 7.1 GET `/workbench/api/plugin/list`

**请求**：无参数。

**响应 200**：

```json
{
  "ok": true,
  "data": {
    "items": [],
    "total": 12,
    "generatedAt": "2026-09-17T08:30:00.000Z"
  },
  "errorCode": null,
  "errorMessage": null,
  "durationMs": 42
}
```

`items` 为 `PluginItem[]`。

### 7.2 POST `/workbench/api/plugin/install`

**请求体**：

```json
{ "source": "github:shaozi8866/dsh-tech-workbench" }
```

**校验**：`source` 必填、非空字符串、长度 ≤ 256。否则 `MISSING_PARAM` / `INVALID_SOURCE`。

**响应 200**：

```json
{
  "ok": true,
  "data": { "id": "dsh-tech-workbench", "installType": "bundle", "restartRequired": true },
  "errorCode": null,
  "errorMessage": null,
  "durationMs": 15420
}
```

**错误**：

- 409 `ALREADY_INSTALLED`
- 403 `PROTECTED_PLUGIN`（针对插件自身）
- 500 `INSTALL_FAILED`

### 7.3 DELETE `/workbench/api/plugin/uninstall/:id`

**路径参数**：`id` 必填。

**响应 200**：

```json
{ "ok": true, "data": { "id": "foo", "restartRequired": false }, "errorCode": null, "errorMessage": null, "durationMs": 3200 }
```

**错误**：

- 403 `PROTECTED_PLUGIN`
- 404 `PLUGIN_NOT_FOUND`
- 409 `NOT_INSTALLED`
- 500 `UNINSTALL_FAILED`

### 7.4 POST `/workbench/api/plugin/enable/:id`

**响应 200**：

```json
{ "ok": true, "data": { "id": "foo", "enabled": true }, "errorCode": null, "errorMessage": null, "durationMs": 180 }
```

**错误**：

- 403 `PROTECTED_PLUGIN`
- 404 `PLUGIN_NOT_FOUND`
- 409 `STATE_CONFLICT`

### 7.5 POST `/workbench/api/plugin/disable/:id`

响应结构同 7.4，`enabled: false`。错误码同。

### 7.6 POST `/workbench/api/plugin/update/:id`

**响应 200**：

```json
{ "ok": true, "data": { "id": "foo", "from": "2.2.4", "to": "2.3.0" }, "errorCode": null, "errorMessage": null, "durationMs": 28500 }
```

**错误**：

- 403 `PROTECTED_PLUGIN`
- 404 `PLUGIN_NOT_FOUND`
- 409 `NO_UPDATE_AVAILABLE` / `STATE_CONFLICT`
- 500 `UPDATE_FAILED`

### 7.7 POST `/workbench/api/plugin/rollback/:id`

**请求体**：

```json
{ "version": "2.2.4" }
```

**校验**：`version` 必填且匹配 `/^\d+\.\d+\.\d+(-[\w.]+)?$/`，否则 `INVALID_VERSION`。

**响应 200**：

```json
{ "ok": true, "data": { "id": "foo", "from": "2.3.0", "to": "2.2.4" }, "errorCode": null, "errorMessage": null, "durationMs": 8200 }
```

**错误**：

- 403 `PROTECTED_PLUGIN`
- 404 `SNAPSHOT_NOT_FOUND`
- 409 `STATE_CONFLICT`
- 500 `ROLLBACK_FAILED`

### 7.8 GET `/workbench/api/plugin/versions/:id`

**响应 200**：

```json
{
  "ok": true,
  "data": {
    "id": "foo",
    "current": "2.3.0",
    "versions": [
      { "version": "2.3.0", "installedAt": "2026-09-17T08:30:00.000Z", "backedUp": false, "backupPath": null },
      { "version": "2.2.4", "installedAt": "2026-09-16T08:30:00.000Z", "backedUp": true, "backupPath": "plugin-backups/foo/2.2.4" }
    ]
  },
  "errorCode": null,
  "errorMessage": null,
  "durationMs": 15
}
```

### 7.9 GET `/workbench/api/plugin/check-update/:id`

**响应 200**：

```json
{ "ok": true, "data": { "current": "2.2.4", "latest": "2.3.0", "updateAvailable": true }, "errorCode": null, "errorMessage": null, "durationMs": 850 }
```

---

## 8. 前端组件契约（props 固化）

### 8.1 ActionBar.tsx 扩展

```typescript
interface ActionBarProps {
  plugin: PluginItem;
  pending: PendingAction | null;   // 全局唯一进行中操作
  onAction: (
    action: PendingAction['action'],
    pluginId: string,
    payload?: { version?: string }
  ) => void;
}
```

**按钮渲染规则（表格化，不得变更）**：

| lifecycleState | protected | 渲染按钮（从左到右） |
|----------------|-----------|----------------------|
| discovered     | -         | [安装] |
| installed      | false     | [停用] [更新]* [卸载] [回退]† |
| installed      | true      | [停用]✗ [更新]✗ [卸载]✗（禁用 + tooltip） |
| disabled       | false     | [启用] [更新]* [卸载] [回退]† |
| disabled       | true      | [启用]✗ [更新]✗ [卸载]✗ |
| 瞬态态          | -         | 全部禁用 + spinner |
| error          | -         | 按上一稳定态渲染，附加错误图标 |

\* `[更新]` 仅在 `updateAvailable === true` 时高亮，否则禁用。
† `[回退]` 仅在 `versions.length > 1` 时显示。

### 8.2 PluginActionDialog.tsx

```typescript
interface PluginActionDialogProps {
  open: boolean;
  action: 'update' | 'rollback' | 'uninstall';
  pluginId: string;
  fromVersion?: string;   // update/uninstall 时必填
  toVersion?: string;     // update/rollback 时必填
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
}
```

### 8.3 VersionTimeline.tsx

```typescript
interface VersionTimelineProps {
  versions: VersionSnapshot[];
  currentVersion: string;
  onSelect: (version: string) => void;
  selected: string | null;
}
```

### 8.4 InstallForm.tsx

```typescript
interface InstallFormProps {
  onSubmit: (source: string) => void;
  busy: boolean;
  errorMessage: string | null;
}
```

### 8.5 ActionFeedback.tsx

```typescript
interface ActionFeedbackProps {
  feedback: ActionFeedback | null;
  onDismiss: () => void;
}
```

### 8.6 交互要求

- 启停切换使用乐观更新（立即更新 UI，失败回滚）。
- 更新操作先弹 `PluginActionDialog` 展示新旧版本号。
- 回退操作弹出 `VersionTimeline` 供选择。
- 所有操作失败时展示具体错误信息（非笼统的"操作失败"）。
- 所有新增样式必须使用 `--dsw-alias-*` CSS 变量，零硬编码颜色。

---

## 9. 测试用例清单（编号，setup / action / assert）

命名规则：`T-{模块}-{序号}`。所有用例必须实现，不得跳过。

### 9.1 SafetyGuardService

| 编号 | setup | action | assert |
|------|-------|--------|--------|
| T-SG-01 | 无 | `assertNotProtected('webserver')` | 抛 `PluginAdminError`，`code === 'PROTECTED_PLUGIN'` |
| T-SG-02 | 无 | `assertNotProtected('web-ui')` | 抛 `PROTECTED_PLUGIN`（命中 `/^web/`） |
| T-SG-03 | 无 | `assertNotProtected('typert-schema')` | 抛 `PROTECTED_PLUGIN` |
| T-SG-04 | 无 | `assertNotProtected('dsh-tech-workbench')` | 抛 `PROTECTED_PLUGIN` |
| T-SG-05 | 无 | `assertNotProtected('some-user-plugin')` | 不抛异常，返回 void |
| T-SG-06 | 无 | `isProtected('webserver')` | 返回 `true` |
| T-SG-07 | 无 | `isProtected('user-plugin')` | 返回 `false` |

### 9.2 PersistenceService

| 编号 | setup | action | assert |
|------|-------|--------|--------|
| T-PS-01 | 空目录 | `readState()` | 返回 `{ schemaVersion: 1, disabled: [], installTypes: {} }` |
| T-PS-02 | state.json 含 `disabled: ['b','a']` | `readState()` | 返回 `disabled: ['a','b']`（排序） |
| T-PS-03 | state.json 存在 | `setDisabled('x', true)` | 文件内容 `disabled` 含 `'x'`，`updatedAt` 更新 |
| T-PS-04 | state.json 含 `'x'` | `setDisabled('x', false)` | 文件内容 `disabled` 不含 `'x'` |
| T-PS-05 | cordis.patch.yml 无托管区块 | `setDisabled('x', true)` | 文件末尾追加区块，含 `- id: x` 和 `disabled: true` |
| T-PS-06 | cordis.patch.yml 已有托管区块 | `setDisabled('y', true)` | 区块被替换，`x` 和 `y` 均存在；**区块外内容逐字节相等** |
| T-PS-07 | cordis.patch.yml 含用户手写条目 `- id: user-a` | `setDisabled('x', true)` | `user-a` 行**逐字节保留** |
| T-PS-08 | cordis.patch.yml 中 `user-a` 已有 `disabled: true` 在区块外 | `setDisabled('user-a', false)` | `user-a` 条目的 `disabled` 被移除或置 false，**不新增区块条目** |
| T-PS-09 | 磁盘只读（mock fs 抛错） | `setDisabled('x', true)` | 抛 `PluginAdminError`，`code === 'PERSIST_FAILED'` |
| T-PS-10 | state.json 存在但 JSON 损坏 | `readState()` | 抛 `PERSIST_FAILED` |

### 9.3 PluginLifecycleService

| 编号 | setup | action | assert |
|------|-------|--------|--------|
| T-LC-01 | Loader 含 `foo`（enabled） | `toggle('foo', true)` | 返回 `ok: true`；Loader 未调用 update（幂等） |
| T-LC-02 | Loader 含 `foo`（enabled） | `toggle('foo', false)` | 调用 `entry.update({ disabled: true })`；`persistence.setDisabled('foo', true)` 被调用；返回 `ok: true` |
| T-LC-03 | Loader 含 `foo`（disabled） | `toggle('foo', true)` | 调用 `entry.update({ disabled: false })`；`setDisabled('foo', false)` 被调用 |
| T-LC-04 | Loader 不含 `foo` | `toggle('foo', true)` | 抛 `PLUGIN_NOT_FOUND` |
| T-LC-05 | `foo` 受保护 | `toggle('foo', false)` | 抛 `PROTECTED_PLUGIN`；Loader 未被调用 |
| T-LC-06 | 并发调用 `toggle('foo', false)` 两次 | 立即第二次 | 第二次抛 `STATE_CONFLICT`；第一次正常完成 |
| T-LC-07 | `entry.update` 抛异常 | `toggle('foo', false)` | 抛 `LOADER_ERROR`；`state.json` 未被修改 |
| T-LC-08 | `setDisabled` 抛 `PERSIST_FAILED` | `toggle('foo', false)` | Loader 回滚到 enabled；抛 `PERSIST_FAILED` |
| T-LC-09 | `foo` 启用状态下 toggle 成功 | 断言 | `dataProcessor.invalidateCache('foo')` 被调用一次 |

### 9.4 VersionManagerService

| 编号 | setup | action | assert |
|------|-------|--------|--------|
| T-VM-01 | 插件 `foo@2.2.4` | `snapshot('foo','2.2.4', meta)` | 创建 `plugin-backups/foo/2.2.4/manifest.json` 和 `package.json`；返回 `backedUp: true` |
| T-VM-02 | 已有快照 2.2.4、2.3.0 | `listSnapshots('foo')` | 返回按 `installedAt` 降序 |
| T-VM-03 | 当前 2.2.4，远端 2.3.0 | `update('foo')` | 快照 2.2.4 被创建；`installer.install` 被调用；返回 `{ from: '2.2.4', to: '2.3.0' }` |
| T-VM-04 | 当前已最新 | `update('foo')` | 抛 `NO_UPDATE_AVAILABLE`；未调用 installer |
| T-VM-05 | 更新中 installer 抛错 | `update('foo')` | 恢复 2.2.4 快照；恢复原启用状态；抛 `UPDATE_FAILED` |
| T-VM-06 | 快照含 2.2.4、当前 2.3.0 | `rollback('foo','2.2.4')` | 停用 → restoreSnapshot → 启用；返回 `{ from: '2.3.0', to: '2.2.4' }` |
| T-VM-07 | 快照不含 2.0.0 | `rollback('foo','2.0.0')` | 抛 `INVALID_VERSION` |
| T-VM-08 | 快照目录被删但 state 有记录 | `rollback('foo','2.2.4')` | 抛 `SNAPSHOT_NOT_FOUND` |
| T-VM-09 | 回退过程中 restore 失败 | `rollback(...)` | 尝试恢复原状态；抛 `ROLLBACK_FAILED` |

### 9.5 PackageInstaller

| 编号 | setup | action | assert |
|------|-------|--------|--------|
| T-PI-01 | 无 | `normalizeSource('https://github.com/o/r')` | 返回 `'github:o/r'` |
| T-PI-02 | 无 | `normalizeSource('github.com/o/r')` | 返回 `'github:o/r'` |
| T-PI-03 | 无 | `normalizeSource('o/r')` | 返回 `'github:o/r'` |
| T-PI-04 | 无 | `normalizeSource('@scope/pkg')` | 返回 `'@scope/pkg'`（npm 作用域不转换） |
| T-PI-05 | 无 | `normalizeSource('')` | 抛 `INVALID_SOURCE` |
| T-PI-06 | mock 远端 `dsh.bundle` 存在 | `inspectType('foo')` | 返回 `'bundle'` |
| T-PI-07 | mock 远端无 `dsh.bundle` | `inspectType('foo')` | 返回 `'insert'` |
| T-PI-08 | mock 远端 404 | `inspectType('foo')` | 抛 `PACKAGE_NOT_FOUND` |
| T-PI-09 | bundle 类插件 | `install('foo', {})` | 写入 profile package.json 依赖 + dsh.profile.bundles |
| T-PI-10 | insert 类插件 | `install('foo', {})` | 写入 cordis.patch.yml |
| T-PI-11 | pnpm install 失败 | `install('foo', {})` | 抛 `INSTALL_FAILED`；profile package.json 未被修改 |

### 9.6 HTTP API 集成测试

| 编号 | setup | action | assert |
|------|-------|--------|--------|
| T-API-01 | 已安装 3 个插件 | `GET /list` | 200，`items.length === 3`，每个含 `lifecycleState` |
| T-API-02 | `webserver` 存在 | `POST /disable/webserver` | 403，`errorCode === 'PROTECTED_PLUGIN'` |
| T-API-03 | `foo` 已安装 | `POST /disable/foo` | 200，`data.enabled === false`；后续 `GET /list` 中 `foo` 的 `lifecycleState === 'disabled'` |
| T-API-04 | 不存在 `bar` | `POST /disable/bar` | 404，`errorCode === 'PLUGIN_NOT_FOUND'` |
| T-API-05 | 空 body | `POST /install` | 400，`errorCode === 'MISSING_PARAM'` |
| T-API-06 | `source` 为 `'   '` | `POST /install` | 400，`errorCode === 'INVALID_SOURCE'` |
| T-API-07 | `foo@2.2.4`，无快照 | `POST /rollback/foo { version: '2.1.0' }` | 404，`errorCode === 'SNAPSHOT_NOT_FOUND'` |
| T-API-08 | `foo` 有快照 2.2.4 | `POST /rollback/foo { version: '2.2.4' }` | 200，`data.to === '2.2.4'` |
| T-API-09 | 无 | `POST /rollback/foo { version: 'abc' }` | 400，`errorCode === 'INVALID_VERSION'` |
| T-API-10 | `foo` 已最新 | `POST /update/foo` | 409，`errorCode === 'NO_UPDATE_AVAILABLE'` |
| T-API-11 | 请求来源非受信 | 任意写接口 | 403，`errorCode === 'UNSAFE_ORIGIN'` |
| T-API-12 | 已有操作进行中 | 并发 `POST /disable/foo` | 第二次 409，`errorCode === 'STATE_CONFLICT'` |

### 9.7 端到端验收（手动）

| 编号 | 步骤 | 期望 |
|------|------|------|
| E2E-01 | 打开工作台 → 停用一个用户插件 → 刷新页面 | 插件状态为 disabled；`state.json` 含该 id |
| E2E-02 | 重启 dsh web | 该插件仍为 disabled |
| E2E-03 | 从 InstallForm 安装 `github:shaozi8866/dsh-tech-workbench` | 提示重启生效；重启后出现在列表 |
| E2E-04 | 更新某插件后点击回退 → 选择旧版本 → 确认 | 版本号回到旧版；功能正常 |
| E2E-05 | 尝试停用 `webserver` | 按钮禁用；若通过 API 调用返回 403 |
| E2E-06 | 切换深色/浅色主题 | 新增 UI 无硬编码颜色，跟随主题 |

---

## 10. 实现顺序与交付检查点

必须按此顺序交付，每阶段附测试报告：

1. **阶段一**：`errors.ts` + `SafetyGuardService` + 测试 T-SG-01~07。
2. **阶段二**：`PersistenceService` + 测试 T-PS-01~10。**重点验收 T-PS-06/07 的字节保留**。
3. **阶段三**：`PluginLifecycleService` + 测试 T-LC-01~09。
4. **阶段四**：`PackageInstaller` + 测试 T-PI-01~11。
5. **阶段五**：`VersionManagerService` + 测试 T-VM-01~09。
6. **阶段六**：HTTP 路由 + 集成测试 T-API-01~12。
7. **阶段七**：前端组件 + E2E-01~06。

每个阶段交付物：源码 + 测试文件 + `pnpm test -- <模块名>` 通过输出。**前一阶段未通过不得进入下一阶段。**

---

## 11. 防漂移红线（实现者必读）

1. 类型字段名、错误码枚举值、API 路径、HTTP 状态码映射**不得增删改**。若确需变更，先在交付说明中提出，等待确认。
2. `cordis.patch.yml` 托管区块的标记行**必须逐字符一致**。
3. 保护名单**不得扩展**。新增保护项需显式评审。
4. 瞬态状态（installing 等）**只由 Host 端产生**，前端不得自行设置 `lifecycleState`。
5. `state.json` 的 `schemaVersion` 变更必须伴随迁移函数，不得静默升级。
6. 所有文件写入必须原子（临时文件 + rename）。
7. 所有失败路径必须回滚已完成的副作用，不得留下半完成状态。
8. 测试用例编号不得重命名或跳过；未实现项必须在交付说明中显式标注。
9. 所有新增样式必须使用 `--dsw-alias-*` CSS 变量，零硬编码颜色。
10. 复用现有数据层（`market-fetcher`、`github-fetcher`、`data-processor`），不得重写或旁路。
