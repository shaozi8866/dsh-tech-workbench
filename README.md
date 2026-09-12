# DSH 科技风工作台 (dsh-tech-workbench) v2.0

> DeepSeek Harness 插件/预设/应用统一工作台 — 侧边栏重构 + 双源数据抓取（Market+GitHub）
>
> **v2.0 重大变更**：皮肤已独立为 [dsh-tech-skin](../dsh-tech-skin/)，本插件不再自带皮肤，所有样式使用 DSH 原生 `--dsw-alias-*` 变量，适配任意 DSH 主题。

## 特性

### 🗂️ 统一工作台
- **三大管理页面**：插件 / 预设 / 应用，100% 同款布局组件
- **资源卡片网格**：状态标签、热度展示、操作按钮
- **强大筛选排序**：搜索、状态筛选、多字段排序
- **分页浏览**：每页 12 个，智能页码显示

### 📐 侧边栏重构
- **三槽位工作台入口**：插件管理 / 预设管理 / 应用管理
- **自动 DOM 注入**：MutationObserver 监听，防止 DSH 重渲染覆盖
- **统一交互规范**：hover 微缩放、选中态左侧光边标识

### 🔄 双源数据抓取
- **Market 官方源**：同步优先抓取，四层脏数据过滤
- **GitHub 社区源**：异步分片抓取，四层深度解析，**自动分类插件/预设/应用**
- **智能去重合并**：官方优先、社区补齐、同 ID 保留权威数据
- **本地状态联动**：自动匹配已安装插件、启停状态、版本更新提醒

### 💾 缓存与高可用
- **双层缓存**：内存缓存 + 文件持久化
- **24h 定时同步**：后台静默增量更新
- **故障降级**：单源失败不影响整体，限流自动复用旧缓存

### 🎨 主题自适应（v2.0 新特性）
- **零硬编码颜色**：所有样式使用 DSH 原生 `--dsw-alias-*` 变量
- **任意主题适配**：安装 dsh-tech-skin 或其他 DSH 主题后自动适配
- **未装皮肤降级**：使用 DSH 默认主题，变量带降级值

## 系统要求

- **DSH 版本**：`0.1.5-rc.1` 及以上（已在该版本验证通过）
- **Profile**：`web`（需要浏览器界面和 webServer 服务）
- **可选依赖**：`dsh-tech-skin` 皮肤插件（提供科技风外观，不安装则使用 DSH 默认主题）

## 安装

### 推荐：皮肤 + 工作台组合安装

```bash
# 1. 安装科技风皮肤（可选，但推荐）
dsh plugin --profile web add dsh-tech-skin

# 2. 安装工作台
dsh plugin --profile web add dsh-tech-workbench
```

### 仅安装工作台（使用 DSH 默认主题）

```bash
dsh plugin --profile web add dsh-tech-workbench
```

安装完成后重启 `dsh web` 使插件生效。

## 配置

在 `cordis.patch.yml` 中：

```yaml
- insert:
    - id: dsh-tech-workbench
      name: dsh-tech-workbench
      config:
        # GitHub 个人访问令牌（可选，提升 API 限额 60→5000 次/小时）
        githubToken: "ghp_xxxxxxxxxxxx"
        # 用户自定义 GitHub 仓库源列表（自动识别类型）
        customRepos:
          - "owner/my-awesome-plugin"
        # 用户自定义预设仓库列表（强制归类为预设）
        customPresetRepos:
          - "owner/my-preset-collection"
        # 用户自定义应用仓库列表（强制归类为应用）
        customAppRepos:
          - "owner/my-workflow-app"
        # 缓存过期时间（秒），默认 86400（24小时）
        cacheExpireSeconds: 86400
```

## GitHub 资源自动分类

GitHub 抓取的仓库自动识别为插件/预设/应用三种类型，识别优先级：

1. 用户强制指定（`customPresetRepos` / `customAppRepos`）
2. 白名单分类（内置 10 个仓库）
3. 仓库名关键词（preset/template → 预设；app/workflow/agent → 应用）
4. 仓库描述关键词
5. README 关键词
6. 默认插件类型

## 与 dsh-tech-skin 的关系

```
┌─────────────────────────────────────────────────────┐
│  dsh-tech-skin（皮肤插件，可选）                      │
│  ─────────────────────────────────────────────────  │
│  通过 overrideTokens 覆盖 --dsw-alias-* 变量        │
│  定义科技风的颜色/圆角/阴影                           │
└──────────────────────┬──────────────────────────────┘
                       │ 提供 --dsw-alias-* 变量
                       ▼
┌─────────────────────────────────────────────────────┐
│  dsh-tech-workbench（工作台插件，核心）               │
│  ─────────────────────────────────────────────────  │
│  所有组件样式使用 var(--dsw-alias-xxx, 降级值)       │
│  装了皮肤 → 自动适配科技风                            │
│  没装皮肤 → 使用 DSH 默认主题                         │
│  换其他皮肤 → 自动适配新主题                          │
└─────────────────────────────────────────────────────┘
```

**关键设计**：工作台不依赖任何特定皮肤，`--dsw-alias-*` 是 DSH 标准变量接口，任何遵循该接口的皮肤都能自动适配工作台。

## HTTP API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/workbench/api/data` | 获取工作台数据 |
| POST | `/workbench/api/refresh` | 强制刷新数据 |
| GET | `/workbench/api/config` | 获取插件配置 |
| GET | `/workbench/api/status` | 插件运行状态 |
| GET | `/workbench/api/cache` | 查看原始缓存 |
| POST | `/workbench/api/cache/clear` | 清空缓存 |

## 项目结构

```
dsh-tech-workbench/
├── package.json
├── cordis.patch.yml
├── tsdown.config.ts
├── src/
│   ├── index.ts                    # Host 入口（HTTP接口+生命周期）
│   ├── global.d.ts
│   ├── host/
│   │   ├── types.ts                # 类型定义
│   │   ├── utils.ts                # 工具函数
│   │   ├── market-fetcher.ts       # Market 主源抓取
│   │   ├── github-fetcher.ts       # GitHub 副源抓取（自动分类）
│   │   └── data-processor.ts       # 数据处理与调度
│   └── client/
│       ├── index.tsx               # Client 入口
│       ├── workbench.css.ts        # 工作台样式（全变量，无硬编码颜色）
│       ├── sidebar-integration.ts  # 侧边栏集成
│       ├── types.ts
│       └── components/
│           ├── WorkbenchPage.tsx
│           ├── ResourceCard.tsx
│           ├── ActionBar.tsx
│           ├── Pagination.tsx
│           └── EmptyState.tsx
├── lib/                            # 构建产物
└── tests/                          # 单元测试（79个）
```

## v1.x → v2.0 迁移指南

### 变更内容
- ✂️ **移除**：内置科技风皮肤（`skin.css.ts`）
- ✂️ **移除**：主题切换管理器（`theme-manager.ts`）
- ✨ **新增**：`workbench.css.ts`，所有颜色使用 `--dsw-alias-*` 变量
- ✨ **新增**：与 `dsh-tech-skin` 皮肤插件的无缝适配

### 迁移步骤
1. 安装 `dsh-tech-skin` 皮肤插件（如果需要科技风外观）
2. 升级 `dsh-tech-workbench` 到 v2.0
3. 重启 `dsh web`
4. 外观自动恢复（皮肤由 dsh-tech-skin 提供）

### 如果你不想用科技风
- 不安装 `dsh-tech-skin`，工作台自动使用 DSH 默认主题
- 或安装其他 DSH 主题插件，工作台自动适配

## 开发

```bash
npm install
npm run build
npm test
```

## License

MIT
