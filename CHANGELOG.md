# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.0] - 2026-09-16

### ⚠️ Breaking Changes

- 🔌 **侧边栏挂载方式迁移**：由「DOM 注入按钮 + 绝对定位 overlay」改为 DSH 壳原生面板机制——
  注册 `main` keyed slot（key=`tech-workbench`）作为独立页面 + `sidebar.panellist`（id=`tech-workbench`, label=Meta管理）由壳自绘侧边栏行。
  `src/client/sidebar-integration.ts` 整体删除；不再有任何 MutationObserver、`display:none!important` 强隐兄弟节点与 createRoot 手动挂载。
  与其它壳原生面板（如应用中心）的互斥切换由壳层保证；卸载即注册 disposer，无 DOM 残留。
- 移除 client inject 中的 `@deepseek-ai/dsh-client-ui-renderer` 依赖（不再自渲染 React root）。

### Added

- `.dshwb-page-shell` 全尺寸页面壳（height:100%/overflow:auto/flex column）。
- client `VERSION` 常量与 package 版本对齐，消除 client/host 版本比对误报。

### Tests

- 79/79 通过（业务组件与数据面零改动，仅挂载层迁移）。

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
