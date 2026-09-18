# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.4.0] - 2026-09-18 (二期)

### ✨ Added — Meta管理「维护」能力（插件 · Skill · 预设）

- 🔌 **插件生命周期**（接管自 09-18 会话，修复后转正）：
  - 安装/卸载/更新/回退转发 `dsh plugin --profile <p> add/remove`（方案A，不造轮子）
  - 启用/停用只写 `cordis.patch.yml` 托管区块（managed block），`patchReload: live` 热生效
  - 受保护插件名单（基座/工作台自身/认证/桥）拒绝停用与卸载
- 🧩 **Skill 维护**（`/workbench/api/skill/*` + SkillManageSection）：
  - 本机技能根 `~/.dsh/skills` 列表 / 查看 / 编辑 SKILL.md / 新建（模板）/ 删除
  - 路径净化防逃逸；保存后由 dsh-skill-filesystem 监听热更新
- 📋 **预设维护**（`/workbench/api/preset/*` + PresetManageSection）：
  - 基于 `agentPresets` 名册服务：list / read / copy / remove / standingKeyFor 挂载校验
  - 组合（agent.cordis.yml）编辑仅限 `trust=user` 的预设；system 预设只读并引导「复制为新预设」
- 🖥️ Meta管理页面新增本机维护区：预设页 / Skill 页顶部卡片，插件页「＋安装插件」入口

### 🐛 Fixed

- `plugin-cli.ts` 在 promises-fs 句柄上误用 `readFileSync/writeFileSync`（启用/停用必然 TypeError 崩溃）
- 生命周期路由 action/id 解析错位：`GET /plugin/list`、`POST /plugin/install` 曾被解析为未知操作
- `handleAdminRoute` 统一三类路由，错误码映射 400/403/404/500，响应带 `durationMs`
- `GithubRepoInfo` 补 `html_url` 类型（修复 tsc 报错）

### ⚠️ Breaking（继承 v2.3.0 挂载迁移，本仓基线原为 DOM 注入）

- 侧边栏挂载迁移为壳原生 `main` 面板（key=tech-workbench）+ `sidebar.panellist` 入口「Meta管理」
- `src/client/sidebar-integration.ts`（MutationObserver DOM 注入）整体删除

### Tests

- 单元 118/118（旧 79 + plugin-cli 托管区块/保护名单/normalizeSource + preset-cli 护栏 + skill-cli CRUD，全沙箱）
- 构建产物端到端冒烟 `tests/e2e-build-smoke.mjs` 9/9：真实 bundle 挂假 ctx 打路由；disable→patch 落盘→enable→还原、403/400 拒绝、skill CRUD、preset 无服务降级

## [2.0.0] - 2026-09-12

### ⚠️ Breaking Changes

- 🎨 **皮肤独立为单独插件**：科技风皮肤已从本插件移除，独立为 `dsh-tech-skin` 插件
  - 本插件不再自带皮肤 CSS 和主题切换管理器
  - 工作台样式全部使用 DSH 原生 `--dsw-alias-*` 变量，自动适配任意 DSH 主题
  - 如需科技风皮肤，请单独安装 `dsh-tech-skin` 插件
- ⚙️ **移除配置项**：`skinEnabled` 和 `defaultTheme` 配置项已移除（皮肤功能已独立）

### Added

- 🎯 **DSH 原生变量适配**：工作台所有颜色/圆角/阴影使用 `--dsw-alias-*` 变量，零硬编码颜色
- 🧪 **79 个单元测试**：覆盖工具函数、Market 抓取、GitHub 抓取、数据处理、类型识别

### Changed

- Client 构建产物从 59.21 kB 降至 47.55 kB（移除皮肤 CSS 和主题管理器）
- HTTP 接口 `/workbench/api/config` 不再返回 `skinEnabled` / `defaultTheme`
- 所有 `ctx` 服务访问通过 `inject` 声明（符合 DSH 客户端 rejectGuard 规范）
- `dsh.client.inject` 只保留确认存在的 `@deepseek-ai/dsh-client-locale`
- Toast 定时器优先使用 `ctx.timer` 服务，降级到浏览器原生 `setTimeout`

### Fixed

- 修复 Client 侧 `ctx.logger` 未声明导致 rejectGuard 抛错的问题
- 修复 Toast 使用未声明 `timer` 服务的问题
- 修复 Host 侧 VERSION 与 package.json 不同步的问题
- 修复 `cordis.patch.yml` 残留已废弃配置项的问题
- 修复 `exports` 字段包含非标准子路径的问题
- 修复 README 兼容性说明与实际 DSH 版本不符的问题

## [1.1.0] - 2026-09-12

### Added

- 🔄 **GitHub 资源自动分类**：GitHub 抓取的仓库现在自动识别为插件/预设/应用三种类型
- 📋 **预设白名单**：内置 3 个预设类仓库白名单（dsh-presets/awesome-presets/dsh-templates）
- 🚀 **应用白名单**：内置 3 个应用类仓库白名单（dsh-workflow-apps/awesome-apps/dsh-agent-apps）
- ⚙️ **customPresetRepos 配置**：用户可自定义预设仓库列表，强制归类为预设
- ⚙️ **customAppRepos 配置**：用户可自定义应用仓库列表，强制归类为应用
- 🧪 **16 个类型识别单元测试**：覆盖白名单/关键词/强制类型/优先级等场景

### Changed

- 安装命令根据资源类型自动适配：`dsh preset add` / `dsh app add` / `dsh plugin add`
- 抓取日志增加按类型统计输出（插件X/预设Y/应用Z）
- Host 构建产物从 33.99 kB 增加到 39.38 kB（类型识别逻辑）

### Technical Details

- 类型识别优先级：强制类型 > 白名单 > 仓库名关键词 > 描述关键词 > README关键词 > 默认插件
- 预设关键词：preset/presets/template/templates/prompt/prompts/预设/模板/提示词
- 应用关键词：app/apps/application/applications/workflow/workflows/agent/agents/bot/bots/automation/应用/工作流/智能体/自动化

## [1.0.0] - 2026-09-12

### Added

- 🎨 **全局科技风皮肤**：双主题（深色科技/浅色极简）、磨砂玻璃质感、统一设计规范
- 📐 **侧边栏重构**：三槽位工作台入口、层级清晰分区、统一交互规范、自动 DOM 注入
- 🗂️ **统一工作台**：插件/预设/应用三大管理页面、资源卡片网格、筛选排序、分页
- 🔄 **双源数据抓取**：Market 官方源（四层过滤）+ GitHub 社区源（四层解析、分片节流）
- 💾 **缓存与高可用**：双层缓存、24h 定时同步、故障降级、手动刷新
- 🌓 **主题切换管理器**：右下角悬浮按钮、跟随系统/手动切换、本地持久化
- 🔌 **完整 HTTP API**：6 个接口（数据/刷新/配置/状态/缓存/清空缓存）
- 🧪 **63 个单元测试**：覆盖工具函数、Market 抓取、GitHub 抓取、数据处理

### Technical Details

- Host 半侧：33.99 kB (gzip 11.05 kB)，Node ESM
- Client 半侧：59.21 kB (gzip 14.44 kB)，浏览器 CJS factory
- 零运行时依赖（除 react/react-dom 由 DSH 模块表提供）
- 完全符合 DSH Cordis 插件规范，可直接安装使用
