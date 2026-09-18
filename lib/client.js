window.__ModuleLoader__.load({
	id: "dsh-tech-workbench",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		react = __toESM(react, 1);
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/workbench.css.ts
		/**
		* DSH 科技风工作台 - 组件样式模块
		*
		* 设计原则：
		*   - 只包含布局/间距/动效，不硬编码颜色
		*   - 所有颜色使用 DSH 原生 --dsw-alias-* 变量
		*   - 安装 dsh-tech-skin 或其他 DSH 主题后自动适配
		*   - 未安装皮肤时使用 DSH 默认主题（变量有降级值）
		*/
		const WORKBENCH_CSS = `
/* ==============================================
   壳原生面板页面外壳
============================================= */
.dshwb-page-shell {
  height: 100%;
  overflow: auto;
  display: flex;
  flex-direction: column;
}


/* ==============================================
   工作台根容器
============================================== */
.dshwb-root {
  font-family: inherit;
  color: var(--dsw-alias-label-primary, #1a1a1a);
}

/* ==============================================
   Tab 切换栏
============================================== */
.dshwb-tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--dsw-alias-bg-layer-1, #f5f5f5);
  border-radius: var(--dsw-alias-radius-md, 10px);
  border: 1px solid var(--dsw-alias-border, #e0e0e0);
}

.dshwb-tab {
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #666);
  font-size: 13px;
  font-weight: 500;
  border-radius: var(--dsw-alias-radius-sm, 6px);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.dshwb-tab:hover {
  background: var(--dsw-alias-bg-hover, rgba(0,0,0,0.05));
  color: var(--dsw-alias-label-primary, #1a1a1a);
}

.dshwb-tab.active {
  background: var(--dsw-alias-brand-primary, #3b82f6);
  color: var(--dsw-alias-label-on-brand, #fff);
  box-shadow: var(--dsw-alias-shadow-sm, 0 1px 3px rgba(0,0,0,0.1));
}

/* ==============================================
   Apple 风格悬浮 Tab（居中悬浮，胶囊设计）
============================================== */
.dshwb-tabs-floating {
  display: inline-flex;
  align-items: center;
}

.dshwb-tab-apple {
  padding: 8px 20px;
  border: none;
  background: transparent;
  color: #1d1d1f;
  font-size: 14px;
  font-weight: 400;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  letter-spacing: -0.224px;
  line-height: 1.29;
}

.dshwb-tab-apple:hover {
  background: rgba(0, 0, 0, 0.04);
  color: #1d1d1f;
}

.dshwb-tab-apple.active {
  background: #ffffff;
  color: #1d1d1f;
  font-weight: 500;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.04);
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .dshwb-tabs-floating {
    background: rgba(40, 40, 42, 0.8) !important;
    box-shadow: 0 2px 16px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.08) !important;
  }
  
  .dshwb-tab-apple {
    color: #f5f5f7 !important;
  }
  
  .dshwb-tab-apple:hover {
    background: rgba(255, 255, 255, 0.08) !important;
  }
  
  .dshwb-tab-apple.active {
    background: rgba(255, 255, 255, 0.12) !important;
    color: #ffffff !important;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1) !important;
  }
}

/* ==============================================
   操作栏
============================================== */
.dshwb-action-bar {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  align-items: center;
  flex-wrap: wrap;
}

.dshwb-search-box {
  position: relative;
  flex: 1;
  min-width: 200px;
  max-width: 360px;
}

.dshwb-search-input {
  width: 100%;
  padding: 8px 12px 8px 36px;
  border: 1px solid var(--dsw-alias-input-border, #d0d0d0);
  border-radius: var(--dsw-alias-radius-md, 10px);
  background: var(--dsw-alias-input-bg, #fff);
  color: var(--dsw-alias-input-label, #1a1a1a);
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.dshwb-search-input::placeholder {
  color: var(--dsw-alias-input-placeholder, #999);
}

.dshwb-search-input:focus {
  border-color: var(--dsw-alias-input-border-focus, #3b82f6);
  box-shadow: 0 0 0 3px var(--dsw-alias-bg-active, rgba(59,130,246,0.1));
}

.dshwb-search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  opacity: 0.5;
}

.dshwb-filter-select,
.dshwb-sort-select {
  padding: 8px 12px;
  border: 1px solid var(--dsw-alias-input-border, #d0d0d0);
  border-radius: var(--dsw-alias-radius-md, 10px);
  background: var(--dsw-alias-input-bg, #fff);
  color: var(--dsw-alias-input-label, #1a1a1a);
  font-size: 13px;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s ease;
}

.dshwb-filter-select:focus,
.dshwb-sort-select:focus {
  border-color: var(--dsw-alias-input-border-focus, #3b82f6);
}

.dshwb-refresh-btn {
  padding: 8px 16px;
  border: 1px solid var(--dsw-alias-button-secondary-border, #d0d0d0);
  border-radius: var(--dsw-alias-radius-md, 10px);
  background: var(--dsw-alias-button-secondary-fill, #fff);
  color: var(--dsw-alias-button-secondary-label, #1a1a1a);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.dshwb-refresh-btn:hover {
  background: var(--dsw-alias-button-secondary-fill-hover, #f0f0f0);
}

.dshwb-refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.dshwb-spin {
  animation: dshwb-spin 1s linear infinite;
}

@keyframes dshwb-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ==============================================
   资源网格
============================================== */
.dshwb-resource-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  padding: 0 16px 16px 16px;
}

/* ==============================================
   资源卡片
============================================== */
.dshwb-resource-card {
  background: var(--dsw-alias-bg-layer-1, #fff);
  border: 1px solid var(--dsw-alias-border, #e0e0e0);
  border-radius: var(--dsw-alias-radius-lg, 14px);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.dshwb-resource-card:hover {
  border-color: var(--dsw-alias-border-brand, #3b82f6);
  box-shadow: var(--dsw-alias-shadow-md, 0 4px 12px rgba(0,0,0,0.1));
  transform: translateY(-2px);
}

.dshwb-card-header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.dshwb-card-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--dsw-alias-radius-md, 10px);
  background: var(--dsw-alias-bg-layer-2, #f0f0f0);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.dshwb-card-title-group {
  flex: 1;
  min-width: 0;
}

.dshwb-card-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary, #1a1a1a);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dshwb-card-author {
  font-size: 11px;
  color: var(--dsw-alias-label-secondary, #666);
  margin-top: 2px;
}

.dshwb-card-badges {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.dshwb-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--dsw-alias-radius-pill, 999px);
  font-size: 10px;
  font-weight: 600;
  line-height: 1.5;
}

.dshwb-badge-official {
  background: var(--dsw-alias-badge-bg, rgba(59,130,246,0.1));
  color: var(--dsw-alias-badge-text, #3b82f6);
}

.dshwb-badge-installed {
  background: var(--dsw-alias-badge-success-bg, rgba(16,185,129,0.1));
  color: var(--dsw-alias-badge-success-text, #10b981);
}

.dshwb-badge-update {
  background: var(--dsw-alias-badge-warning-bg, rgba(245,158,11,0.1));
  color: var(--dsw-alias-badge-warning-text, #f59e0b);
}

.dshwb-badge-community {
  background: var(--dsw-alias-bg-layer-2, #f0f0f0);
  color: var(--dsw-alias-label-secondary, #666);
}

.dshwb-card-desc {
  font-size: 12px;
  color: var(--dsw-alias-label-secondary, #666);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.dshwb-card-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary, #999);
}

.dshwb-card-meta-item {
  display: flex;
  align-items: center;
  gap: 3px;
}

.dshwb-card-actions {
  display: flex;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--dsw-alias-border-subtle, #eee);
}

.dshwb-btn {
  flex: 1;
  padding: 6px 12px;
  border-radius: var(--dsw-alias-radius-sm, 6px);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  text-align: center;
}

.dshwb-btn-primary {
  background: var(--dsw-alias-button-primary-fill, #3b82f6);
  color: var(--dsw-alias-button-primary-label, #fff);
  border: none;
}

.dshwb-btn-primary:hover {
  background: var(--dsw-alias-button-primary-fill-hover, #2563eb);
}

.dshwb-btn-secondary {
  background: var(--dsw-alias-button-secondary-fill, #fff);
  color: var(--dsw-alias-button-secondary-label, #1a1a1a);
  border-color: var(--dsw-alias-button-secondary-border, #d0d0d0);
}

.dshwb-btn-secondary:hover {
  background: var(--dsw-alias-button-secondary-fill-hover, #f0f0f0);
}

.dshwb-btn-danger {
  background: var(--dsw-alias-button-danger-fill, #ef4444);
  color: var(--dsw-alias-button-danger-label, #fff);
  border: none;
}

.dshwb-btn-ghost {
  background: transparent;
  color: var(--dsw-alias-button-ghost-label, #666);
  border: none;
}

.dshwb-btn-ghost:hover {
  background: var(--dsw-alias-button-ghost-fill-hover, rgba(0,0,0,0.05));
}

.dshwb-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ==============================================
   分页
============================================== */
.dshwb-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  padding: 16px;
}

.dshwb-page-btn {
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  border: 1px solid var(--dsw-alias-border, #e0e0e0);
  border-radius: var(--dsw-alias-radius-sm, 6px);
  background: var(--dsw-alias-bg-layer-1, #fff);
  color: var(--dsw-alias-label-secondary, #666);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dshwb-page-btn:hover:not(:disabled) {
  border-color: var(--dsw-alias-border-brand, #3b82f6);
  color: var(--dsw-alias-brand-primary, #3b82f6);
}

.dshwb-page-btn.active {
  background: var(--dsw-alias-brand-primary, #3b82f6);
  color: var(--dsw-alias-label-on-brand, #fff);
  border-color: var(--dsw-alias-brand-primary, #3b82f6);
}

.dshwb-page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.dshwb-page-info {
  font-size: 12px;
  color: var(--dsw-alias-label-secondary, #666);
  margin: 0 8px;
}

/* ==============================================
   空状态 / 加载状态
============================================== */
.dshwb-empty-state,
.dshwb-loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 12px;
  text-align: center;
}

.dshwb-empty-icon {
  font-size: 48px;
  opacity: 0.4;
}

.dshwb-empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary, #1a1a1a);
}

.dshwb-empty-desc {
  font-size: 13px;
  color: var(--dsw-alias-label-secondary, #666);
  max-width: 320px;
  line-height: 1.5;
}

.dshwb-loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--dsw-alias-border, #e0e0e0);
  border-top-color: var(--dsw-alias-brand-primary, #3b82f6);
  border-radius: 50%;
  animation: dshwb-spin 0.8s linear infinite;
}

/* ==============================================
   侧边栏工作台模块
============================================== */
.dshwb-sidebar-workbench-module {
  padding: 8px;
  margin: 8px;
  background: var(--dsw-alias-bg-layer-1, rgba(255,255,255,0.5));
  border: 1px solid var(--dsw-alias-border, rgba(255,255,255,0.1));
  border-radius: var(--dsw-alias-radius-md, 10px);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dshwb-sidebar-workbench-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--dsw-alias-radius-sm, 6px);
  font-size: 13px;
  color: var(--dsw-alias-sidebar-text, #b8c0d0);
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.dshwb-sidebar-workbench-item:hover {
  background: var(--dsw-alias-sidebar-item-hover, rgba(59,130,246,0.1));
  color: var(--dsw-alias-label-primary, #fff);
}

.dshwb-sidebar-workbench-item.active {
  background: var(--dsw-alias-sidebar-item-active, rgba(59,130,246,0.15));
  color: var(--dsw-alias-sidebar-text-active, #3b82f6);
  border-left: 3px solid var(--dsw-alias-sidebar-item-active-indicator, #3b82f6);
  padding-left: 7px;
}

/* ==============================================
   Toast 动画
============================================== */
@keyframes dshwb-toast-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* ==============================================
   缓存提示条
============================================== */
.dshwb-cache-notice {
  margin: 0 16px 8px 16px;
  padding: 8px 12px;
  background: var(--dsw-alias-warning-bg, rgba(245,158,11,0.1));
  border: 1px solid var(--dsw-alias-warning, #f59e0b);
  border-radius: var(--dsw-alias-radius-sm, 6px);
  font-size: 12px;
  color: var(--dsw-alias-warning, #f59e0b);
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ==============================================
   新版资源卡片（v2）
============================================== */
.dshwb-resource-card-v2 {
  background: var(--dsw-alias-bg-layer-1, #fff);
  border: 1px solid var(--dsw-alias-border, #e5e7eb);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.dshwb-resource-card-v2:hover {
  border-color: var(--dsw-alias-border-brand, #6366f1);
  box-shadow: 0 10px 40px -10px rgba(99, 102, 241, 0.2);
  transform: translateY(-4px);
}

/* 顶部渐变条 */
.dshwb-card-top-bar {
  height: 4px;
  width: 100%;
}

/* 卡片头部 */
.dshwb-card-header-v2 {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 16px 12px 16px;
}

.dshwb-card-icon-v2 {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.dshwb-card-title-group-v2 {
  flex: 1;
  min-width: 0;
}

.dshwb-card-name-v2 {
  font-size: 15px;
  font-weight: 700;
  color: var(--dsw-alias-label-primary, #111827);
  margin: 0 0 6px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}

.dshwb-card-badges-v2 {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.dshwb-badge-v2 {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.6;
}

.dshwb-badge-category {
  background: var(--dsw-alias-bg-layer-2, #f3f4f6);
  color: var(--dsw-alias-label-secondary, #6b7280);
}

.dshwb-badge-official {
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
  color: #1d4ed8;
}

.dshwb-badge-community {
  background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
  color: #4b5563;
}

.dshwb-card-status-v2 {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.dshwb-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.dshwb-status-installed {
  background: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
}

.dshwb-status-update {
  background: #f59e0b;
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.5);
}

/* 卡片描述 */
.dshwb-card-desc-v2 {
  font-size: 12px;
  color: var(--dsw-alias-label-secondary, #6b7280);
  line-height: 1.6;
  padding: 0 16px;
  margin: 0 0 12px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 38px;
}

/* 状态标签行 */
.dshwb-card-tags-v2 {
  display: flex;
  gap: 6px;
  padding: 0 16px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.dshwb-tag-v2 {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}

.dshwb-tag-installed {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}

.dshwb-tag-update {
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
}

.dshwb-tag-available {
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
}

/* 元信息 */
.dshwb-card-meta-v2 {
  display: flex;
  gap: 12px;
  padding: 0 16px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.dshwb-meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary, #9ca3af);
}

.dshwb-meta-icon {
  font-size: 12px;
}

.dshwb-meta-author {
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 底部操作按钮 */
.dshwb-card-actions-v2 {
  display: flex;
  gap: 8px;
  padding: 12px 16px 16px 16px;
  border-top: 1px solid var(--dsw-alias-border-subtle, #f3f4f6);
  margin-top: auto;
}

.dshwb-btn-v2 {
  flex: 1;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  text-align: center;
  white-space: nowrap;
}

.dshwb-btn-primary-v2 {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  border: none;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
}

.dshwb-btn-primary-v2:hover {
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
  transform: translateY(-1px);
}

.dshwb-btn-secondary-v2 {
  background: var(--dsw-alias-bg-layer-2, #f3f4f6);
  color: var(--dsw-alias-label-secondary, #4b5563);
  border-color: var(--dsw-alias-border, #e5e7eb);
}

.dshwb-btn-secondary-v2:hover {
  background: var(--dsw-alias-bg-hover, #e5e7eb);
  color: var(--dsw-alias-label-primary, #111827);
}

.dshwb-btn-danger-v2 {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  border-color: rgba(239, 68, 68, 0.2);
}

.dshwb-btn-danger-v2:hover {
  background: rgba(239, 68, 68, 0.15);
}

.dshwb-btn-ghost-v2 {
  background: transparent;
  color: var(--dsw-alias-label-secondary, #6b7280);
  border-color: var(--dsw-alias-border, #e5e7eb);
  padding: 8px 10px;
  flex: 0 0 auto;
}

.dshwb-btn-ghost-v2:hover {
  background: var(--dsw-alias-bg-hover, rgba(0,0,0,0.05));
  color: var(--dsw-alias-brand-primary, #6366f1);
  border-color: var(--dsw-alias-border-brand, #6366f1);
}

/* 安装命令展示 */
.dshwb-install-cmd-v2 {
  margin: 0 16px 16px 16px;
  padding: 10px 12px;
  background: var(--dsw-alias-bg-layer-2, #f9fafb);
  border: 1px solid var(--dsw-alias-border, #e5e7eb);
  border-radius: 8px;
  font-size: 11px;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  color: var(--dsw-alias-label-secondary, #4b5563);
  word-break: break-all;
  line-height: 1.5;
}

.dshwb-install-cmd-v2 code {
  background: transparent;
  padding: 0;
}

/* ==============================================
   分类筛选标签
============================================== */
.dshwb-category-filter {
  display: flex;
  gap: 8px;
  padding: 0 16px 12px 16px;
  flex-wrap: wrap;
  overflow-x: auto;
}

.dshwb-category-chip {
  padding: 8px 16px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid #d2d2d7;
  background: #ffffff;
  color: #1d1d1f;
  white-space: nowrap;
  letter-spacing: -0.224px;
  line-height: 1.29;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
}

.dshwb-category-chip:hover {
  background: #f5f5f7;
  border-color: #0066cc;
  color: #0066cc;
}

.dshwb-category-chip.active {
  background: #0066cc;
  color: #fff;
  border-color: transparent;
  box-shadow: 0 1px 3px rgba(0, 102, 204, 0.3);
}

/* ==============================================
   Apple 风格资源卡片
============================================== */
.dshwb-resource-card-apple {
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  border: 1px solid var(--dsw-alias-border-l1, #e0e0e0);
  border-radius: 18px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
}

.dshwb-resource-card-apple:hover {
  border-color: var(--dsw-alias-border-l2, #d2d2d7);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

/* 卡片头部 */
.dshwb-card-header-apple {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 24px 24px 18px 24px;
}

.dshwb-card-icon-apple {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  flex-shrink: 0;
  letter-spacing: -0.224px;
}

.dshwb-card-title-group-apple {
  flex: 1;
  min-width: 0;
}

.dshwb-card-name-apple {
  font-size: 17px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary, #1d1d1f);
  margin: 0 0 10px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.24;
  letter-spacing: -0.374px;
}

.dshwb-card-badges-apple {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.dshwb-badge-apple {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.29;
  letter-spacing: -0.224px;
}

.dshwb-badge-category-apple {
  background: var(--dsw-alias-bg-layer-2, #f5f5f7);
  color: var(--dsw-alias-label-primary, #1d1d1f);
}

.dshwb-badge-official-apple {
  background: rgba(0, 102, 204, 0.1);
  color: var(--dsw-alias-brand-primary, #0066cc);
}

.dshwb-badge-community-apple {
  background: var(--dsw-alias-bg-layer-2, #f5f5f7);
  color: var(--dsw-alias-label-secondary, #86868b);
}

/* 二期：徽章即源站链接（替代独立「源站」按钮） */
.dshwb-badge-link-apple {
  cursor: pointer;
  text-decoration: none;
  transition: filter 0.15s ease, opacity 0.15s ease;
}
.dshwb-badge-link-apple:hover {
  filter: brightness(0.94);
  text-decoration: underline;
}

/* 二期：卡片就地展开的更新日志 */
.dshwb-changelog-apple {
  margin: 8px 0 2px;
  border-top: 1px solid var(--dsw-alias-separator-default, rgba(0, 0, 0, 0.08));
  padding-top: 6px;
}
.dshwb-changelog-summary-apple {
  cursor: pointer;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary, #86868b);
  user-select: none;
  list-style: none;
}
.dshwb-changelog-summary-apple::before {
  content: '▸ ';
}
.dshwb-changelog-apple[open] .dshwb-changelog-summary-apple::before {
  content: '▾ ';
}
.dshwb-changelog-hint-apple {
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary, #aeaeb2);
  margin: 4px 0;
}
.dshwb-changelog-body-apple {
  max-height: 220px;
  overflow: auto;
  font-size: 11px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--dsw-alias-bg-layer-2, #f5f5f7);
  border-radius: 8px;
  padding: 8px 10px;
  margin: 4px 0 0;
  color: var(--dsw-alias-label-primary, #1d1d1f);
}

.dshwb-card-status-apple {
  display: flex;
  gap: 5px;
  flex-shrink: 0;
  padding-top: 4px;
}

.dshwb-status-dot-apple {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.dshwb-status-installed-apple {
  background: #34c759;
}

.dshwb-status-update-apple {
  background: #ff9500;
}

/* 卡片描述 */
.dshwb-card-desc-apple {
  font-size: 14px;
  color: var(--dsw-alias-label-secondary, #86868b);
  line-height: 1.5;
  padding: 0 24px;
  margin: 0 0 16px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 42px;
  letter-spacing: -0.224px;
  font-weight: 400;
}

/* 状态标签行 */
.dshwb-card-tags-apple {
  display: flex;
  gap: 8px;
  padding: 0 24px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.dshwb-tag-apple {
  display: inline-flex;
  align-items: center;
  padding: 5px 14px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: -0.224px;
  line-height: 1.29;
}

.dshwb-tag-installed-apple {
  background: rgba(52, 199, 89, 0.12);
  color: #248a3d;
}

.dshwb-tag-update-apple {
  background: rgba(255, 149, 0, 0.12);
  color: #b26500;
}

.dshwb-tag-available-apple {
  background: rgba(0, 102, 204, 0.08);
  color: var(--dsw-alias-brand-primary, #0066cc);
}

/* 元信息（简洁文字，Apple 风格） */
.dshwb-card-meta-apple {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 24px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary, #86868b);
  letter-spacing: -0.224px;
  line-height: 1.29;
}

.dshwb-meta-item-apple {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.dshwb-meta-label-apple {
  color: var(--dsw-alias-label-tertiary, #aeaeb2);
  font-weight: 400;
}

.dshwb-meta-value-apple {
  color: var(--dsw-alias-label-secondary, #86868b);
  font-weight: 500;
}

.dshwb-meta-divider-apple {
  color: var(--dsw-alias-border-l1, #d2d2d7);
  font-weight: 300;
}

.dshwb-meta-author-apple {
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 底部操作按钮（Apple 胶囊按钮风格） */
.dshwb-card-actions-apple {
  display: flex;
  gap: 10px;
  padding: 18px 24px 24px 24px;
  border-top: 1px solid var(--dsw-alias-border-l1, #f0f0f0);
  margin-top: auto;
}

.dshwb-btn-apple {
  flex: 1;
  padding: 10px 18px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
  text-align: center;
  white-space: nowrap;
  letter-spacing: -0.224px;
  line-height: 1.29;
  font-family: inherit;
}

.dshwb-btn-primary-apple {
  background: var(--dsw-alias-brand-primary, #0066cc);
  color: var(--dsw-alias-label-selected, #ffffff);
  border: none;
}

.dshwb-btn-primary-apple:hover {
  opacity: 0.88;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 102, 204, 0.25);
}

.dshwb-btn-primary-apple:active {
  opacity: 0.75;
  transform: translateY(0);
}

.dshwb-btn-secondary-apple {
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  color: var(--dsw-alias-brand-primary, #0066cc);
  border-color: var(--dsw-alias-border-l1, #d2d2d7);
}

.dshwb-btn-secondary-apple:hover {
  background: var(--dsw-alias-bg-layer-2, #f5f5f7);
  border-color: var(--dsw-alias-brand-primary, #0066cc);
}

.dshwb-btn-danger-apple {
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  color: #ff3b30;
  border-color: rgba(255, 59, 48, 0.2);
}

.dshwb-btn-danger-apple:hover {
  background: rgba(255, 59, 48, 0.06);
  border-color: #ff3b30;
}

.dshwb-btn-ghost-apple {
  background: transparent;
  color: var(--dsw-alias-brand-primary, #0066cc);
  border-color: transparent;
  flex: 0 0 auto;
  padding: 10px 16px;
}

.dshwb-btn-ghost-apple:hover {
  background: var(--dsw-alias-bg-layer-2, #f5f5f7);
}

/* 安装命令展示 */
.dshwb-install-cmd-apple {
  margin: 0 24px 24px 24px;
  padding: 14px 16px;
  background: var(--dsw-alias-bg-layer-2, #f5f5f7);
  border: 1px solid var(--dsw-alias-border-l1, #e0e0e0);
  border-radius: 12px;
  font-size: 12px;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Consolas', monospace;
  color: var(--dsw-alias-label-primary, #1d1d1f);
  word-break: break-all;
  line-height: 1.5;
}

.dshwb-install-cmd-apple code {
  background: transparent;
  padding: 0;
  font-family: inherit;
}

/* ==============================================
   Apple 风格操作栏
============================================== */
.dshwb-action-bar-apple {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 24px 16px 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
}

.dshwb-action-bar-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dshwb-action-bar-header {
  justify-content: space-between;
}

.dshwb-action-bar-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dshwb-page-title-apple {
  font-size: 28px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary, #1d1d1f);
  margin: 0;
  line-height: 1.14;
  letter-spacing: 0.196px;
}

.dshwb-count-badge-apple {
  font-size: 13px;
  color: var(--dsw-alias-label-secondary, #86868b);
  background: var(--dsw-alias-bg-layer-2, #f5f5f7);
  padding: 4px 12px;
  border-radius: 9999px;
  font-weight: 400;
  letter-spacing: -0.224px;
}

.dshwb-cache-badge-apple {
  font-size: 12px;
  color: #b26500;
  background: rgba(255, 149, 0, 0.1);
  padding: 4px 10px;
  border-radius: 9999px;
  font-weight: 400;
}

.dshwb-action-bar-controls {
  flex-wrap: wrap;
  gap: 12px;
}

/* 搜索框 */
.dshwb-search-box-apple {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 240px;
  max-width: 360px;
}

.dshwb-search-icon-apple {
  position: absolute;
  left: 14px;
  font-size: 14px;
  opacity: 0.5;
  pointer-events: none;
}

.dshwb-search-input-apple {
  width: 100%;
  padding: 10px 16px 10px 38px;
  border: 1px solid var(--dsw-alias-border-l1, #d2d2d7);
  border-radius: 9999px;
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  color: var(--dsw-alias-label-primary, #1d1d1f);
  font-size: 14px;
  font-family: inherit;
  letter-spacing: -0.224px;
  transition: all 0.2s ease;
  outline: none;
}

.dshwb-search-input-apple:focus {
  border-color: var(--dsw-alias-brand-primary, #0066cc);
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.15);
}

.dshwb-search-input-apple::placeholder {
  color: var(--dsw-alias-label-tertiary, #aeaeb2);
}

/* 下拉选择框 */
.dshwb-select-apple {
  padding: 10px 32px 10px 16px;
  border: 1px solid var(--dsw-alias-border-l1, #d2d2d7);
  border-radius: 9999px;
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  color: var(--dsw-alias-label-primary, #1d1d1f);
  font-size: 14px;
  font-family: inherit;
  letter-spacing: -0.224px;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2386868b' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
}

.dshwb-select-apple:hover {
  border-color: var(--dsw-alias-brand-primary, #0066cc);
}

.dshwb-select-apple:focus {
  border-color: var(--dsw-alias-brand-primary, #0066cc);
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.15);
}

/* ==============================================
   Apple 风格分页
============================================== */
.dshwb-pagination-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px 24px;
  flex-wrap: wrap;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
}

.dshwb-pagination-info {
  font-size: 13px;
  color: var(--dsw-alias-label-secondary, #86868b);
  margin-right: 8px;
  letter-spacing: -0.224px;
}

.dshwb-pagination-btn {
  padding: 8px 16px;
  border: 1px solid var(--dsw-alias-border-l1, #d2d2d7);
  border-radius: 9999px;
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  color: var(--dsw-alias-label-primary, #1d1d1f);
  font-size: 13px;
  font-family: inherit;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: -0.224px;
  min-width: 36px;
  text-align: center;
}

.dshwb-pagination-btn:hover:not(:disabled) {
  background: var(--dsw-alias-bg-layer-2, #f5f5f7);
  border-color: var(--dsw-alias-brand-primary, #0066cc);
  color: var(--dsw-alias-brand-primary, #0066cc);
}

.dshwb-pagination-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.dshwb-pagination-btn.active {
  background: var(--dsw-alias-brand-primary, #0066cc);
  color: var(--dsw-alias-label-selected, #ffffff);
  border-color: transparent;
  font-weight: 500;
}

.dshwb-pagination-ellipsis {
  padding: 8px 4px;
  color: var(--dsw-alias-label-tertiary, #aeaeb2);
  font-size: 13px;
}

/* ==============================================
   资源网格布局
============================================== */
.dshwb-workbench-resource-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  padding: 0 24px;
}

.dshwb-workbench-container {
  padding-bottom: 24px;
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .dshwb-resource-card-apple {
    background: #1c1c1e !important;
    border-color: #38383a !important;
  }
  
  .dshwb-resource-card-apple:hover {
    border-color: #48484a !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4) !important;
  }
  
  .dshwb-card-name-apple {
    color: #f5f5f7 !important;
  }
  
  .dshwb-card-desc-apple {
    color: #98989d !important;
  }
  
  .dshwb-badge-category-apple {
    background: #2c2c2e !important;
    color: #f5f5f7 !important;
  }
  
  .dshwb-badge-community-apple {
    background: #2c2c2e !important;
    color: #98989d !important;
  }
  
  .dshwb-card-meta-apple {
    color: #98989d !important;
  }
  
  .dshwb-meta-label-apple {
    color: #636366 !important;
  }
  
  .dshwb-meta-value-apple {
    color: #98989d !important;
  }
  
  .dshwb-meta-divider-apple {
    color: #38383a !important;
  }
  
  .dshwb-card-actions-apple {
    border-top-color: #2c2c2e !important;
  }
  
  .dshwb-btn-secondary-apple {
    background: #1c1c1e !important;
    border-color: #48484a !important;
  }
  
  .dshwb-btn-secondary-apple:hover {
    background: #2c2c2e !important;
  }
  
  .dshwb-btn-danger-apple {
    background: #1c1c1e !important;
  }
  
  .dshwb-btn-ghost-apple:hover {
    background: #2c2c2e !important;
  }
  
  .dshwb-install-cmd-apple {
    background: #2c2c2e !important;
    border-color: #38383a !important;
    color: #f5f5f7 !important;
  }
  
  .dshwb-tag-installed-apple {
    background: rgba(52, 199, 89, 0.2) !important;
    color: #30d158 !important;
  }
  
  .dshwb-tag-update-apple {
    background: rgba(255, 149, 0, 0.2) !important;
    color: #ff9f0a !important;
  }
  
  .dshwb-tag-available-apple {
    background: rgba(10, 132, 255, 0.2) !important;
    color: #0a84ff !important;
  }
}
`;
		//#endregion
		//#region src/client/components/ResourceCard.tsx
		/**
		* DSH 科技风工作台 - 资源卡片组件（Apple 设计风格）
		* 展示单个资源的名称、分类标签、描述、版本、热度、操作按钮
		*
		* Apple 设计特点：
		*   - 单一蓝色强调色（#0066cc Action Blue）
		*   - 胶囊按钮（9999px 圆角）
		*   - 大圆角卡片（18px）
		*   - 细边框（hairline #e0e0e0）
		*   - 无装饰渐变
		*   - 充足留白、低密度
		*   - SF Pro 字体、负字间距
		*   - 极柔和阴影
		*/
		/** 根据资源类型获取图标文字（简洁字母图标，Apple 风格） */
		function getTypeIcon(type) {
			switch (type) {
				case "plugin": return "P";
				case "preset": return "Pr";
				case "app": return "A";
				case "skill": return "S";
				default: return "?";
			}
		}
		/** 根据资源类型获取图标背景色（柔和的浅色调，Apple 风格） */
		function getTypeIconBg(type) {
			switch (type) {
				case "plugin": return "#e8f0fe";
				case "preset": return "#fef3e8";
				case "app": return "#e8f5e9";
				case "skill": return "#f3e8fe";
				default: return "#f5f5f7";
			}
		}
		/** 根据资源类型获取图标文字色 */
		function getTypeIconColor(type) {
			switch (type) {
				case "plugin": return "#1a73e8";
				case "preset": return "#e8710a";
				case "app": return "#188038";
				case "skill": return "#8430ce";
				default: return "#86868b";
			}
		}
		/**
		* 更新日志（卡片就地展开）：首次展开时才请求，成功后不再重复拉取
		* host 路由 GET /workbench/api/plugin/changelog/:id?homepage=
		*/
		function ChangelogSection({ resource }) {
			const [state, setState] = (0, react.useState)({
				loading: false,
				data: null
			});
			const load = async () => {
				if (state.loading || state.data) return;
				setState({
					loading: true,
					data: null
				});
				try {
					const u = `/workbench/api/plugin/changelog/${encodeURIComponent(resource.id)}?homepage=${encodeURIComponent(resource.homepage || "")}`;
					const r = await (await fetch(u)).json();
					setState({
						loading: false,
						data: r.ok ? r.data : { found: false }
					});
				} catch {
					setState({
						loading: false,
						data: { found: false }
					});
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
				className: "dshwb-changelog-apple",
				onToggle: (e) => {
					if (e.currentTarget.open) load();
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", {
						className: "dshwb-changelog-summary-apple",
						children: "更新日志"
					}),
					state.loading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dshwb-changelog-hint-apple",
						children: "正在加载…"
					}),
					state.data && state.data.found && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dshwb-changelog-hint-apple",
						children: state.data.source === "local" ? `本地包 · ${state.data.path}` : "GitHub 仓库"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
						className: "dshwb-changelog-body-apple",
						children: state.data.content
					})] }),
					state.data && !state.data.found && !state.loading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dshwb-changelog-hint-apple",
						children: "未找到 CHANGELOG（可到源站仓库查看发布说明）"
					})
				]
			});
		}
		function ResourceCard({ resource, onInstall, onUninstall, onToggleEnable, onUpdate }) {
			const [showInstallCmd, setShowInstallCmd] = (0, react.useState)(false);
			const formatDate = (timestamp) => {
				if (!timestamp) return "未知";
				const d = new Date(timestamp);
				return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
			};
			const formatStar = (star) => {
				if (star >= 1e4) return `${(star / 1e4).toFixed(1)}w`;
				if (star >= 1e3) return `${(star / 1e3).toFixed(1)}k`;
				return `${star}`;
			};
			const copyInstallCmd = () => {
				if (resource.installCmd && navigator.clipboard) navigator.clipboard.writeText(resource.installCmd);
				setShowInstallCmd(true);
				setTimeout(() => setShowInstallCmd(false), 2e3);
			};
			const resolveSourceUrl = () => {
				let url = resource.homepage;
				if (!url || !url.startsWith("http")) {
					const name = resource.name || "";
					if (name.startsWith("@")) url = `https://www.npmjs.com/package/${encodeURIComponent(name)}`;
					else if (name.includes("/") && !name.includes(" ")) url = `https://github.com/${name}`;
					else url = `https://www.npmjs.com/search?q=${encodeURIComponent(name)}`;
				}
				return url;
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dshwb-resource-card-apple",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dshwb-card-header-apple",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dshwb-card-icon-apple",
								style: {
									background: getTypeIconBg(resource.type),
									color: getTypeIconColor(resource.type)
								},
								children: getTypeIcon(resource.type)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dshwb-card-title-group-apple",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
									className: "dshwb-card-name-apple",
									title: resource.name,
									children: resource.name
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dshwb-card-badges-apple",
									children: [resource.category && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dshwb-badge-apple dshwb-badge-category-apple",
										children: resource.category
									}), resource.isOfficial ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
										className: "dshwb-badge-apple dshwb-badge-official-apple dshwb-badge-link-apple",
										href: resolveSourceUrl(),
										target: "_blank",
										rel: "noopener noreferrer",
										title: "访问源站",
										children: "官方"
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
										className: "dshwb-badge-apple dshwb-badge-community-apple dshwb-badge-link-apple",
										href: resolveSourceUrl(),
										target: "_blank",
										rel: "noopener noreferrer",
										title: "访问源站",
										children: "社区"
									})]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dshwb-card-status-apple",
								children: [resource.isInstalled && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dshwb-status-dot-apple dshwb-status-installed-apple",
									title: "已安装"
								}), resource.updateAvailable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dshwb-status-dot-apple dshwb-status-update-apple",
									title: "可更新"
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dshwb-card-desc-apple",
						title: resource.description,
						children: resource.description || "暂无描述"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dshwb-card-tags-apple",
						children: [
							resource.isInstalled && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dshwb-tag-apple dshwb-tag-installed-apple",
								children: "已安装"
							}),
							resource.updateAvailable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dshwb-tag-apple dshwb-tag-update-apple",
								children: "可更新"
							}),
							!resource.isInstalled && !resource.updateAvailable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dshwb-tag-apple dshwb-tag-available-apple",
								children: "可安装"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dshwb-card-meta-apple",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "dshwb-meta-item-apple",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dshwb-meta-label-apple",
									children: "版本"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dshwb-meta-value-apple",
									children: ["v", resource.latestVersion]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dshwb-meta-divider-apple",
								children: "·"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "dshwb-meta-item-apple",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dshwb-meta-label-apple",
									children: "Star"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dshwb-meta-value-apple",
									children: formatStar(resource.star)
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dshwb-meta-divider-apple",
								children: "·"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "dshwb-meta-item-apple",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dshwb-meta-label-apple",
									children: "更新"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dshwb-meta-value-apple",
									children: formatDate(resource.updateTime)
								})]
							}),
							resource.author && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dshwb-meta-divider-apple",
								children: "·"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "dshwb-meta-item-apple",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dshwb-meta-label-apple",
									children: "作者"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dshwb-meta-value-apple dshwb-meta-author-apple",
									children: resource.author
								})]
							})] })
						]
					}),
					resource.type === "plugin" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChangelogSection, { resource }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dshwb-card-actions-apple",
						children: !resource.isInstalled ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: "dshwb-btn-apple dshwb-btn-primary-apple",
							onClick: () => onInstall?.(resource),
							title: "安装",
							children: "安装"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: "dshwb-btn-apple dshwb-btn-secondary-apple",
							onClick: copyInstallCmd,
							title: "复制安装命令",
							children: showInstallCmd ? "已复制" : "复制命令"
						})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							resource.updateAvailable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: "dshwb-btn-apple dshwb-btn-primary-apple",
								onClick: () => onUpdate?.(resource),
								title: "更新到最新版本",
								children: "更新"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: "dshwb-btn-apple dshwb-btn-secondary-apple",
								onClick: () => onToggleEnable?.(resource),
								title: resource.isEnabled ? "点击禁用" : "点击启用",
								children: resource.isEnabled ? "禁用" : "启用"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: "dshwb-btn-apple dshwb-btn-danger-apple",
								onClick: () => onUninstall?.(resource),
								title: "卸载",
								children: "卸载"
							})
						] })
					}),
					showInstallCmd && resource.installCmd && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dshwb-install-cmd-apple",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: resource.installCmd })
					})
				]
			});
		}
		//#endregion
		//#region src/client/components/ActionBar.tsx
		function ActionBar({ title, total, searchQuery, onSearchChange, filterStatus, onFilterChange, sortField, onSortFieldChange, sortOrder, onSortOrderChange, onRefresh, isRefreshing, fromCache }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dshwb-action-bar-apple",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dshwb-action-bar-row dshwb-action-bar-header",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dshwb-action-bar-title-group",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
								className: "dshwb-page-title-apple",
								children: title
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "dshwb-count-badge-apple",
								children: [
									"共 ",
									total,
									" 个"
								]
							}),
							fromCache && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dshwb-cache-badge-apple",
								children: "缓存数据"
							})
						]
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dshwb-action-bar-row dshwb-action-bar-controls",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dshwb-search-box-apple",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dshwb-search-icon-apple",
								children: "🔍"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "text",
								placeholder: "搜索资源名称、描述...",
								value: searchQuery,
								onChange: (e) => onSearchChange(e.target.value),
								className: "dshwb-search-input-apple"
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							className: "dshwb-select-apple",
							value: filterStatus,
							onChange: (e) => onFilterChange(e.target.value),
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "all",
									children: "全部状态"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "installed",
									children: "已安装"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "not-installed",
									children: "未安装"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "updatable",
									children: "可更新"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "official",
									children: "官方"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "community",
									children: "社区"
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							className: "dshwb-select-apple",
							value: sortField,
							onChange: (e) => onSortFieldChange(e.target.value),
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "name",
									children: "按名称"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "star",
									children: "按热度"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "updateTime",
									children: "按更新时间"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "version",
									children: "按版本"
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: "dshwb-btn-apple dshwb-btn-secondary-apple",
							onClick: () => onSortOrderChange(sortOrder === "asc" ? "desc" : "asc"),
							title: sortOrder === "asc" ? "升序" : "降序",
							children: sortOrder === "asc" ? "↑ 升序" : "↓ 降序"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: "dshwb-btn-apple dshwb-btn-primary-apple",
							onClick: onRefresh,
							disabled: isRefreshing,
							children: isRefreshing ? "刷新中..." : "🔄 刷新"
						})
					]
				})]
			});
		}
		//#endregion
		//#region src/client/components/Pagination.tsx
		function Pagination({ currentPage, totalPages, totalItems, pageSize, onPageChange }) {
			if (totalPages <= 1) return null;
			const startItem = (currentPage - 1) * pageSize + 1;
			const endItem = Math.min(currentPage * pageSize, totalItems);
			const getPageNumbers = () => {
				const pages = [];
				if (totalPages <= 7) for (let i = 1; i <= totalPages; i++) pages.push(i);
				else {
					pages.push(1);
					if (currentPage > 3) pages.push("...");
					const start = Math.max(2, currentPage - 1);
					const end = Math.min(totalPages - 1, currentPage + 1);
					for (let i = start; i <= end; i++) pages.push(i);
					if (currentPage < totalPages - 2) pages.push("...");
					pages.push(totalPages);
				}
				return pages;
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dshwb-pagination-wrap",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dshwb-pagination-info",
						children: [
							startItem,
							"-",
							endItem,
							" / 共 ",
							totalItems,
							" 项"
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						className: "dshwb-pagination-btn",
						onClick: () => onPageChange(currentPage - 1),
						disabled: currentPage === 1,
						children: "上一页"
					}),
					getPageNumbers().map((page, idx) => page === "..." ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dshwb-pagination-ellipsis",
						children: "..."
					}, `ellipsis-${idx}`) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						className: `dshwb-pagination-btn ${page === currentPage ? "active" : ""}`,
						onClick: () => onPageChange(page),
						children: page
					}, page)),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						className: "dshwb-pagination-btn",
						onClick: () => onPageChange(currentPage + 1),
						disabled: currentPage === totalPages,
						children: "下一页"
					})
				]
			});
		}
		//#endregion
		//#region src/client/components/EmptyState.tsx
		function EmptyState({ type, title, description, onAction, actionText }) {
			const config = {
				empty: {
					icon: "📦",
					defaultTitle: "暂无资源",
					defaultDesc: "当前分类下还没有可用资源，点击刷新尝试重新加载",
					defaultAction: "刷新数据"
				},
				"no-result": {
					icon: "🔍",
					defaultTitle: "没有找到匹配的资源",
					defaultDesc: "尝试调整搜索关键词或筛选条件",
					defaultAction: "清除筛选"
				},
				error: {
					icon: "⚠️",
					defaultTitle: "加载失败",
					defaultDesc: "数据加载出现异常，请检查网络连接后重试",
					defaultAction: "重新加载"
				}
			}[type];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dshwb-workbench-empty",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dshwb-workbench-empty-icon",
						children: config.icon
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dshwb-workbench-empty-text",
						children: title || config.defaultTitle
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dshwb-workbench-empty-hint",
						children: description || config.defaultDesc
					}),
					onAction && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						className: "dshwb-btn-primary",
						style: {
							marginTop: "16px",
							padding: "8px 20px"
						},
						onClick: onAction,
						children: actionText || config.defaultAction
					})
				]
			});
		}
		function LoadingState() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dshwb-loading",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: "dshwb-loading-spinner" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							fontSize: "13px",
							color: "var(--text-secondary)"
						},
						children: "正在加载资源数据..."
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							fontSize: "11px",
							color: "var(--text-placeholder)",
							marginTop: "8px"
						},
						children: "双源数据同步中（Market + GitHub），首次加载可能需要几秒"
					})
				]
			});
		}
		//#endregion
		//#region src/client/components/InstallForm.tsx
		/**
		* dsh-tech-workbench 插件生命周期管理 - 安装输入表单
		* SPEC v8.4 - InstallForm
		*/
		function InstallForm({ onSubmit, busy, errorMessage, initialSource = "" }) {
			const [source, setSource] = (0, react.useState)(initialSource);
			const handleSubmit = (e) => {
				e.preventDefault();
				if (source.trim()) onSubmit(source.trim());
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
				onSubmit: handleSubmit,
				className: "dshwb-install-form",
				style: {
					display: "flex",
					flexDirection: "column",
					gap: "12px",
					padding: "16px"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							fontSize: "14px",
							color: "var(--dsw-alias-text-secondary, #86868b)"
						},
						children: "输入插件来源（GitHub 仓库地址或 npm 包名）"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						type: "text",
						value: source,
						onChange: (e) => setSource(e.target.value),
						placeholder: "例如: https://github.com/owner/repo",
						disabled: busy,
						style: {
							padding: "10px 14px",
							borderRadius: "10px",
							border: "1.5px solid var(--dsw-alias-border, #e0e0e0)",
							background: "var(--dsw-alias-bg-primary, #fff)",
							color: "var(--dsw-alias-text-primary, #1d1d1f)",
							fontSize: "14px",
							outline: "none"
						}
					}),
					errorMessage && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							fontSize: "13px",
							color: "var(--dsw-danger, #ff3b30)",
							padding: "8px 12px",
							borderRadius: "8px",
							background: "var(--dsw-alias-danger-bg, #fff2f2)"
						},
						children: errorMessage
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "submit",
						disabled: busy || !source.trim(),
						className: "dshwb-btn dshwb-btn-primary",
						style: { alignSelf: "flex-end" },
						children: busy ? "安装中..." : "安装"
					})
				]
			});
		}
		//#endregion
		//#region src/client/components/PluginActionDialog.tsx
		function PluginActionDialog({ open, action, pluginId, fromVersion, toVersion, onConfirm, onCancel, busy }) {
			if (!open) return null;
			const titles = {
				update: "更新插件",
				rollback: "回退插件",
				uninstall: "卸载插件"
			};
			const descriptions = {
				update: `确定要将插件 "${pluginId}" 从 ${fromVersion} 更新到 ${toVersion} 吗？`,
				rollback: `确定要将插件 "${pluginId}" 回退到 ${toVersion} 吗？`,
				uninstall: `确定要卸载插件 "${pluginId}" 吗？此操作不可恢复。`
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dshwb-overlay",
				style: {
					position: "fixed",
					inset: 0,
					background: "rgba(0,0,0,0.4)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					zIndex: 1e3
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dshwb-dialog",
					style: {
						background: "var(--dsw-alias-bg-primary, #fff)",
						borderRadius: "18px",
						padding: "24px",
						minWidth: "320px",
						maxWidth: "400px",
						boxShadow: "0 8px 32px rgba(0,0,0,0.12)"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							style: {
								margin: "0 0 12px",
								color: "var(--dsw-alias-text-primary, #1d1d1f)",
								fontSize: "17px",
								fontWeight: 600
							},
							children: titles[action] || "操作确认"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: {
								margin: "0 0 20px",
								color: "var(--dsw-alias-text-secondary, #86868b)",
								fontSize: "14px",
								lineHeight: 1.5
							},
							children: descriptions[action] || "确定要执行此操作吗？"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: "12px",
								justifyContent: "flex-end"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								onClick: onCancel,
								disabled: busy,
								className: "dshwb-btn dshwb-btn-secondary",
								children: "取消"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								onClick: onConfirm,
								disabled: busy,
								className: "dshwb-btn dshwb-btn-primary",
								children: busy ? "处理中..." : "确认"
							})]
						})
					]
				})
			});
		}
		//#endregion
		//#region src/client/components/ActionFeedback.tsx
		/**
		* dsh-tech-workbench 插件生命周期管理 - 操作反馈
		* SPEC v8.5 - ActionFeedback
		*/
		function ActionFeedback({ feedback, onDismiss }) {
			(0, react.useEffect)(() => {
				if (feedback && feedback.ok && feedback.autoDismissMs > 0) {
					const timer = setTimeout(onDismiss, feedback.autoDismissMs);
					return () => clearTimeout(timer);
				}
			}, [feedback, onDismiss]);
			if (!feedback) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dshwb-action-feedback",
				onClick: !feedback.ok ? onDismiss : void 0,
				style: {
					position: "fixed",
					bottom: "24px",
					right: "24px",
					padding: "12px 20px",
					borderRadius: "12px",
					background: feedback.ok ? "var(--dsw-alias-success-bg, #e8f5e9)" : "var(--dsw-alias-danger-bg, #fff2f2)",
					color: feedback.ok ? "var(--dsw-success, #188038)" : "var(--dsw-danger, #ff3b30)",
					fontSize: "14px",
					fontWeight: 500,
					boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
					cursor: feedback.ok ? "default" : "pointer",
					zIndex: 1001,
					maxWidth: "320px"
				},
				children: feedback.message
			});
		}
		//#endregion
		//#region src/client/components/LocalManage.tsx
		/**
		* dsh-tech-workbench 二期 - Meta管理「本机维护」组件
		*
		* - PresetManageSection: 本机预设（agentPresets 名册）维护 — 查看/编辑组合、
		*   复制为新预设、挂载校验、删除（仅 user 预设可写，system 只读）
		* - SkillManageSection: 用户技能根（~/.dsh/skills）维护 — 查看/编辑 SKILL.md、
		*   新建技能、删除
		*
		* 所有写操作走 /workbench/api/{preset|skill}/*，带确认弹窗；
		* system 级对象一律禁用写按钮并给出原因提示。
		*/
		async function apiGet(url) {
			try {
				return await (await fetch(url)).json();
			} catch (err) {
				return {
					ok: false,
					data: null,
					errorMessage: `网络错误: ${err.message}`
				};
			}
		}
		async function apiPost(url, body) {
			try {
				return await (await fetch(url, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(body || {})
				})).json();
			} catch (err) {
				return {
					ok: false,
					data: null,
					errorMessage: `网络错误: ${err.message}`
				};
			}
		}
		const S = {
			section: {
				margin: "0 16px 18px 16px",
				padding: "14px 16px",
				borderRadius: "14px",
				border: "1px solid var(--dsw-alias-border, #e0e0e0)",
				background: "var(--dsw-alias-bg-primary, #fff)"
			},
			sectionTitle: {
				margin: "0 0 4px 0",
				fontSize: "15px",
				fontWeight: 600,
				color: "var(--dsw-alias-text-primary, #1d1d1f)",
				display: "flex",
				alignItems: "center",
				gap: "8px"
			},
			sectionHint: {
				margin: "0 0 12px 0",
				fontSize: "12px",
				color: "var(--dsw-alias-text-tertiary, #86868b)"
			},
			row: {
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: "12px",
				padding: "10px 0",
				borderBottom: "1px solid var(--dsw-alias-border-subtle, rgba(0,0,0,0.06))",
				flexWrap: "wrap"
			},
			badge: (tone) => ({
				fontSize: "11px",
				padding: "2px 8px",
				borderRadius: "9999px",
				flexShrink: 0,
				background: tone === "sys" ? "rgba(142,142,147,0.15)" : tone === "broken" ? "rgba(255,59,48,0.12)" : tone === "layout" ? "rgba(0,122,255,0.10)" : "rgba(52,199,89,0.15)",
				color: tone === "sys" ? "var(--dsw-alias-text-secondary, #6d6d72)" : tone === "broken" ? "var(--dsw-danger, #ff3b30)" : tone === "layout" ? "var(--dsw-accent, #0066cc)" : "var(--dsw-success, #34c759)"
			}),
			btn: {
				padding: "5px 12px",
				borderRadius: "9999px",
				border: "1.5px solid var(--dsw-alias-border, #e0e0e0)",
				fontSize: "12px",
				cursor: "pointer",
				background: "var(--dsw-alias-bg-secondary, #f5f5f7)",
				color: "var(--dsw-alias-text-primary, #1d1d1f)"
			},
			btnPrimary: {
				padding: "5px 12px",
				borderRadius: "9999px",
				border: "1.5px solid var(--dsw-accent, #0066cc)",
				fontSize: "12px",
				cursor: "pointer",
				background: "var(--dsw-accent, #0066cc)",
				color: "#fff"
			},
			btnDanger: {
				padding: "5px 12px",
				borderRadius: "9999px",
				border: "1.5px solid var(--dsw-danger, #ff3b30)",
				fontSize: "12px",
				cursor: "pointer",
				background: "transparent",
				color: "var(--dsw-danger, #ff3b30)"
			},
			btnDisabled: {
				padding: "5px 12px",
				borderRadius: "9999px",
				border: "1.5px solid var(--dsw-alias-border, #e0e0e0)",
				fontSize: "12px",
				cursor: "not-allowed",
				opacity: .4,
				background: "var(--dsw-alias-bg-secondary, #f5f5f7)",
				color: "var(--dsw-alias-text-secondary, #86868b)"
			},
			input: {
				padding: "8px 12px",
				borderRadius: "10px",
				border: "1.5px solid var(--dsw-alias-border, #e0e0e0)",
				background: "var(--dsw-alias-bg-primary, #fff)",
				color: "var(--dsw-alias-text-primary, #1d1d1f)",
				fontSize: "13px",
				outline: "none",
				width: "100%",
				boxSizing: "border-box"
			}
		};
		function Modal(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					position: "fixed",
					inset: 0,
					background: "rgba(0,0,0,0.4)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					zIndex: 1e3
				},
				onClick: props.onClose,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					onClick: (e) => e.stopPropagation(),
					style: {
						background: "var(--dsw-alias-bg-primary, #fff)",
						borderRadius: "18px",
						padding: "22px",
						minWidth: "360px",
						maxWidth: props.wide ? "860px" : "480px",
						width: "92%",
						maxHeight: "86vh",
						display: "flex",
						flexDirection: "column",
						boxShadow: "0 8px 32px rgba(0,0,0,0.18)"
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
						style: {
							margin: "0 0 12px",
							color: "var(--dsw-alias-text-primary, #1d1d1f)",
							fontSize: "17px",
							fontWeight: 600,
							flexShrink: 0
						},
						children: props.title
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							overflow: "auto",
							flex: 1
						},
						children: props.children
					})]
				})
			});
		}
		/** 代码/Markdown 编辑弹窗 */
		function EditorModal(props) {
			const [text, setText] = (0, react.useState)(props.initial);
			const [saving, setSaving] = (0, react.useState)(false);
			const dirty = text !== props.initial;
			const save = async () => {
				if (!props.onSave) return;
				setSaving(true);
				const resp = await props.onSave(text);
				setSaving(false);
				props.onDone(resp.ok ? "已保存" : resp.errorMessage || "保存失败", !!resp.ok);
				if (resp.ok) props.onClose();
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Modal, {
				title: props.title,
				onClose: props.onClose,
				wide: true,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
					value: text,
					readOnly: props.readOnly,
					onChange: (e) => setText(e.target.value),
					spellCheck: false,
					style: {
						width: "100%",
						minHeight: "52vh",
						fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
						fontSize: "12.5px",
						lineHeight: 1.55,
						padding: "12px 14px",
						borderRadius: "10px",
						border: "1.5px solid var(--dsw-alias-border, #e0e0e0)",
						background: props.readOnly ? "var(--dsw-alias-bg-secondary, #f7f7f8)" : "var(--dsw-alias-bg-primary, #fff)",
						color: "var(--dsw-alias-text-primary, #1d1d1f)",
						resize: "vertical",
						outline: "none",
						boxSizing: "border-box"
					}
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						gap: "8px",
						justifyContent: "flex-end",
						marginTop: "12px",
						alignItems: "center"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								flex: 1,
								display: "flex",
								gap: "8px"
							},
							children: props.extraActions
						}),
						props.readOnly ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							style: dirty ? S.btnPrimary : S.btnDisabled,
							disabled: !dirty || saving,
							onClick: save,
							children: saving ? "保存中..." : "保存"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							style: S.btn,
							onClick: props.onClose,
							children: "关闭"
						})
					]
				})]
			});
		}
		/** 单行文本输入弹窗（复制预设 / 新建技能） */
		function PromptModal(props) {
			const [values, setValues] = (0, react.useState)({});
			const missing = props.fields.some((f) => f.required && !(values[f.key] || "").trim());
			const submit = async () => {
				const resp = await props.onSubmit(values);
				props.onDone(resp.ok ? `${props.submitLabel}成功` : resp.errorMessage || `${props.submitLabel}失败`, !!resp.ok);
				if (resp.ok) props.onClose();
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Modal, {
				title: props.title,
				onClose: props.onClose,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						flexDirection: "column",
						gap: "12px",
						padding: "4px 0 8px"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								fontSize: "13px",
								color: "var(--dsw-alias-text-secondary, #86868b)"
							},
							children: props.hint
						}),
						props.fields.map((f) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								fontSize: "12px",
								marginBottom: "4px",
								color: "var(--dsw-alias-text-primary, #1d1d1f)"
							},
							children: f.label
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							style: S.input,
							placeholder: f.placeholder,
							disabled: props.busy,
							value: values[f.key] || "",
							onChange: (e) => setValues((v) => ({
								...v,
								[f.key]: e.target.value
							}))
						})] }, f.key)),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								justifyContent: "flex-end",
								gap: "8px",
								marginTop: "4px"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								style: S.btn,
								onClick: props.onClose,
								children: "取消"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								style: missing || props.busy ? S.btnDisabled : S.btnPrimary,
								disabled: missing || props.busy,
								onClick: submit,
								children: props.busy ? "处理中..." : props.submitLabel
							})]
						})
					]
				})
			});
		}
		/** 反馈条 */
		function Notice(props) {
			if (!props.notice) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					margin: "0 16px 10px 16px",
					padding: "8px 14px",
					borderRadius: "10px",
					fontSize: "13px",
					background: props.notice.ok ? "rgba(52,199,89,0.12)" : "rgba(255,59,48,0.12)",
					color: props.notice.ok ? "var(--dsw-success, #248a3d)" : "var(--dsw-danger, #ff3b30)",
					cursor: "pointer"
				},
				onClick: props.onDismiss,
				children: props.notice.msg
			});
		}
		function useNotice() {
			const [notice, setNotice] = (0, react.useState)(null);
			return {
				notice,
				show: (0, react.useCallback)((msg, okFlag = true) => {
					setNotice({
						msg,
						ok: okFlag
					});
					if (okFlag) setTimeout(() => setNotice(null), 4e3);
				}, []),
				dismiss: () => setNotice(null)
			};
		}
		function PresetManageSection() {
			const [presets, setPresets] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(null);
			const [editor, setEditor] = (0, react.useState)(null);
			const [copyFrom, setCopyFrom] = (0, react.useState)(null);
			const [busyId, setBusyId] = (0, react.useState)(null);
			const { notice, show, dismiss } = useNotice();
			const load = (0, react.useCallback)(async () => {
				const resp = await apiGet("/workbench/api/preset/list");
				if (resp.ok) {
					setPresets(resp.data || []);
					setError(null);
				} else {
					setError(resp.errorMessage || "读取预设名册失败");
					setPresets([]);
				}
			}, []);
			(0, react.useEffect)(() => {
				load();
			}, [load]);
			const openComposition = async (p) => {
				setBusyId(p.id);
				const resp = await apiGet(`/workbench/api/preset/composition/${encodeURIComponent(p.id)}`);
				setBusyId(null);
				if (!resp.ok || !resp.data) {
					show(resp.errorMessage || "读取组合失败", false);
					return;
				}
				setEditor({
					id: p.id,
					content: resp.data.content,
					readOnly: p.trust !== "user"
				});
			};
			const doValidate = async (p) => {
				setBusyId(p.id);
				const resp = await apiPost(`/workbench/api/preset/validate`, { id: p.id });
				setBusyId(null);
				show(resp.ok ? `预设 ${p.id} 挂载校验通过 ✓` : `挂载校验失败: ${resp.errorMessage}`, resp.ok);
			};
			const doDelete = async (p) => {
				if (!window.confirm(`确认删除用户预设 ${p.id}？该操作不可撤销。`)) return;
				setBusyId(p.id);
				const resp = await apiPost(`/workbench/api/preset/delete`, { id: p.id });
				setBusyId(null);
				show(resp.ok ? `预设 ${p.id} 已删除` : resp.errorMessage || "删除失败", resp.ok);
				if (resp.ok) load();
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Notice, {
					notice,
					onDismiss: dismiss
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: S.section,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: S.sectionTitle,
							children: [
								"本机预设",
								presets && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: {
										fontSize: "12px",
										fontWeight: 400,
										color: "var(--dsw-alias-text-tertiary, #86868b)"
									},
									children: [presets.length, " 个"]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: { flex: 1 } }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									style: S.btn,
									onClick: load,
									children: "刷新"
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: S.sectionHint,
							children: "随部署分发（system）的预设只读；本地自建（user）的预设可编辑组合、校验与删除。编辑前建议先「复制为新预设」。"
						}),
						error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								fontSize: "13px",
								color: "var(--dsw-danger, #ff3b30)"
							},
							children: error
						}),
						presets === null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								fontSize: "13px",
								color: "var(--dsw-alias-text-tertiary, #86868b)"
							},
							children: "加载中..."
						}),
						presets?.map((p) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: S.row,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									minWidth: 0,
									flex: 1
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											fontSize: "14px",
											fontWeight: 600,
											color: "var(--dsw-alias-text-primary, #1d1d1f)"
										},
										children: p.name || p.id
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											...S.badge(p.trust === "user" ? "user" : "sys"),
											marginLeft: "8px"
										},
										children: p.trust === "user" ? "user" : "system"
									}),
									p.broken && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											...S.badge("broken"),
											marginLeft: "6px"
										},
										title: p.broken,
										children: "broken"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											fontSize: "12px",
											color: "var(--dsw-alias-text-secondary, #86868b)",
											marginTop: "2px"
										},
										children: [p.description || p.id, p.broken ? ` · ${p.broken}` : ""]
									})
								]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									gap: "6px",
									flexWrap: "wrap"
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										style: S.btn,
										disabled: busyId === p.id,
										onClick: () => openComposition(p),
										children: p.trust === "user" ? "编辑组合" : "查看组合"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										style: S.btn,
										disabled: busyId === p.id,
										onClick: () => doValidate(p),
										children: "挂载校验"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										style: S.btn,
										disabled: busyId === p.id,
										onClick: () => setCopyFrom(p),
										children: "复制为新预设"
									}),
									p.trust === "user" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										style: S.btnDanger,
										disabled: busyId === p.id,
										onClick: () => doDelete(p),
										children: "删除"
									})
								]
							})]
						}, p.id))
					]
				}),
				editor && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EditorModal, {
					title: `agent.cordis.yml — ${editor.id}${editor.readOnly ? "（system 只读）" : ""}`,
					initial: editor.content,
					readOnly: editor.readOnly,
					onClose: () => setEditor(null),
					onDone: show,
					onSave: editor.readOnly ? void 0 : async (content) => apiPost("/workbench/api/preset/save", {
						id: editor.id,
						content
					}),
					extraActions: editor.readOnly ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						style: S.btn,
						onClick: () => {
							setCopyFrom(presets?.find((x) => x.id === editor.id) || null);
							setEditor(null);
						},
						children: "复制为用户预设后编辑"
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						style: S.btn,
						onClick: () => doValidate({ id: editor.id }),
						children: "保存前挂载校验"
					})
				}),
				copyFrom && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PromptModal, {
					title: `从 ${copyFrom.id} 复制为新预设`,
					hint: "新预设写入用户预设根（~/.dsh/.agent-presets/），继承来源的完整目录（组合+元数据+技能资源）。id 需匹配小写字母/数字/连字符。",
					submitLabel: "复制",
					busy: busyId === copyFrom.id,
					fields: [{
						key: "id",
						label: "新预设 id（目录名）",
						placeholder: "例如 my-coding-preset",
						required: true
					}, {
						key: "name",
						label: "显示名（可选）",
						placeholder: "留空则用 id"
					}],
					onSubmit: async (v) => {
						setBusyId(copyFrom.id);
						const resp = await apiPost("/workbench/api/preset/copy", {
							from: copyFrom.id,
							id: v.id,
							name: v.name || void 0
						});
						setBusyId(null);
						if (resp.ok) load();
						return resp;
					},
					onClose: () => setCopyFrom(null),
					onDone: show
				})
			] });
		}
		function SkillManageSection() {
			const [skills, setSkills] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(null);
			const [editor, setEditor] = (0, react.useState)(null);
			const [creating, setCreating] = (0, react.useState)(false);
			const [busyId, setBusyId] = (0, react.useState)(null);
			const { notice, show, dismiss } = useNotice();
			const load = (0, react.useCallback)(async () => {
				const resp = await apiGet("/workbench/api/skill/list");
				if (resp.ok) {
					setSkills(resp.data || []);
					setError(null);
				} else {
					setError(resp.errorMessage || "读取技能目录失败");
					setSkills([]);
				}
			}, []);
			(0, react.useEffect)(() => {
				load();
			}, [load]);
			const openSkill = async (s) => {
				setBusyId(s.name);
				const resp = await apiGet(`/workbench/api/skill/content/${encodeURIComponent(s.name)}`);
				setBusyId(null);
				if (!resp.ok || !resp.data) {
					show(resp.errorMessage || "读取 SKILL.md 失败", false);
					return;
				}
				setEditor({
					name: s.name,
					content: resp.data.content
				});
			};
			const doDelete = async (s) => {
				if (!window.confirm(`确认删除技能 ${s.name}（含其目录内全部资源）？`)) return;
				setBusyId(s.name);
				const resp = await apiPost("/workbench/api/skill/delete", { name: s.name });
				setBusyId(null);
				show(resp.ok ? `技能 ${s.name} 已删除` : resp.errorMessage || "删除失败", resp.ok);
				if (resp.ok) load();
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Notice, {
					notice,
					onDismiss: dismiss
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: S.section,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: S.sectionTitle,
							children: [
								"本机技能",
								skills && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: {
										fontSize: "12px",
										fontWeight: 400,
										color: "var(--dsw-alias-text-tertiary, #86868b)"
									},
									children: [skills.length, " 个"]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: { flex: 1 } }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									style: S.btnPrimary,
									onClick: () => setCreating(true),
									children: "新建技能"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									style: S.btn,
									onClick: load,
									children: "刷新"
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: S.sectionHint,
							children: "用户技能根 ~/.dsh/skills：目录型（<名称>/SKILL.md）或扁平（<名称>.md）。保存后由 skill-filesystem 监听热更新，新会话自动生效。"
						}),
						error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								fontSize: "13px",
								color: "var(--dsw-danger, #ff3b30)"
							},
							children: error
						}),
						skills === null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								fontSize: "13px",
								color: "var(--dsw-alias-text-tertiary, #86868b)"
							},
							children: "加载中..."
						}),
						skills?.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								fontSize: "13px",
								color: "var(--dsw-alias-text-tertiary, #86868b)",
								padding: "8px 0"
							},
							children: "还没有本机技能，点「新建技能」开始。"
						}),
						skills?.map((s) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: S.row,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									minWidth: 0,
									flex: 1
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											fontSize: "14px",
											fontWeight: 600,
											color: "var(--dsw-alias-text-primary, #1d1d1f)"
										},
										children: s.displayName
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											...S.badge("layout"),
											marginLeft: "8px"
										},
										children: s.layout === "dir" ? "目录" : "扁平"
									}),
									s.resourceCount > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: {
											...S.badge("sys"),
											marginLeft: "6px"
										},
										children: ["资源×", s.resourceCount]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: {
											fontSize: "12px",
											color: "var(--dsw-alias-text-secondary, #86868b)",
											marginTop: "2px",
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap"
										},
										children: s.description || "（无描述）"
									})
								]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									gap: "6px"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									style: S.btn,
									disabled: busyId === s.name,
									onClick: () => openSkill(s),
									children: "查看/编辑"
								}), s.editable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									style: S.btnDanger,
									disabled: busyId === s.name,
									onClick: () => doDelete(s),
									children: "删除"
								})]
							})]
						}, s.name))
					]
				}),
				editor && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EditorModal, {
					title: `SKILL.md — ${editor.name}`,
					initial: editor.content,
					readOnly: false,
					onClose: () => setEditor(null),
					onDone: show,
					onSave: async (content) => apiPost("/workbench/api/skill/save", {
						name: editor.name,
						content
					})
				}),
				creating && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PromptModal, {
					title: "新建技能",
					hint: "在 ~/.dsh/skills/ 下创建 <名称>/SKILL.md 模板（frontmatter 自动生成），保存即可被技能系统发现。",
					submitLabel: "创建",
					busy: busyId === "__create__",
					fields: [{
						key: "name",
						label: "技能名称（目录名）",
						placeholder: "例如 my-daily-report",
						required: true
					}, {
						key: "description",
						label: "一句话描述（写入 frontmatter）",
						placeholder: "何时用这个技能、它能做什么"
					}],
					onSubmit: async (v) => {
						setBusyId("__create__");
						const resp = await apiPost("/workbench/api/skill/create", {
							name: v.name,
							description: v.description
						});
						setBusyId(null);
						if (resp.ok) load();
						return resp;
					},
					onClose: () => setCreating(false),
					onDone: show
				})
			] });
		}
		//#endregion
		//#region src/client/components/WorkbenchPage.tsx
		/**
		* DSH 科技风工作台 - 工作台主页面组件
		* 整合：操作栏、资源卡片网格、分页、空状态、加载状态
		* 支持：搜索、状态筛选、排序、分页
		* v2.1: 集成插件生命周期管理（安装/卸载/启用/停用/更新/回退）
		*/
		const PAGE_SIZE = 12;
		const TYPE_TITLES = {
			plugin: "插件管理",
			skill: "技能管理",
			preset: "预设管理",
			app: "应用管理"
		};
		/** API 调用：安装插件 */
		async function apiInstall(source) {
			try {
				const data = await (await fetch("/workbench/api/plugin/install", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ source })
				})).json();
				if (data.ok) return {
					ok: true,
					message: `安装成功！请重启 DSH 生效。`
				};
				return {
					ok: false,
					message: data.errorMessage || "安装失败"
				};
			} catch (err) {
				return {
					ok: false,
					message: `网络错误: ${err.message}`
				};
			}
		}
		/** API 调用：卸载插件 */
		async function apiUninstall(id) {
			try {
				const data = await (await fetch(`/workbench/api/plugin/uninstall/${id}`, { method: "DELETE" })).json();
				if (data.ok) return {
					ok: true,
					message: `插件 ${id} 已卸载`
				};
				return {
					ok: false,
					message: data.errorMessage || "卸载失败"
				};
			} catch (err) {
				return {
					ok: false,
					message: `网络错误: ${err.message}`
				};
			}
		}
		/** API 调用：启用/停用插件 */
		async function apiToggle(id, enable) {
			try {
				const data = await (await fetch(`/workbench/api/plugin/${enable ? "enable" : "disable"}/${id}`, { method: "POST" })).json();
				if (data.ok) return {
					ok: true,
					message: `已${enable ? "启用" : "停用"}插件 ${id}`
				};
				return {
					ok: false,
					message: data.errorMessage || "操作失败"
				};
			} catch (err) {
				return {
					ok: false,
					message: `网络错误: ${err.message}`
				};
			}
		}
		/** API 调用：更新插件（可指定目标版本，缺省 latest） */
		async function apiUpdate(id, targetVersion) {
			try {
				const data = await (await fetch(`/workbench/api/plugin/update/${id}`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ version: targetVersion || "" })
				})).json();
				if (data.ok) return {
					ok: true,
					message: `插件 ${id} 已更新到 v${data.data?.version || targetVersion || "最新"}`
				};
				return {
					ok: false,
					message: data.errorMessage || "更新失败"
				};
			} catch (err) {
				return {
					ok: false,
					message: `网络错误: ${err.message}`
				};
			}
		}
		/** API 调用：回退插件 */
		async function apiRollback(id, version) {
			try {
				const data = await (await fetch(`/workbench/api/plugin/rollback/${id}`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ version })
				})).json();
				if (data.ok) return {
					ok: true,
					message: `已回退到 v${data.data?.version || version}`
				};
				return {
					ok: false,
					message: data.errorMessage || "回退失败"
				};
			} catch (err) {
				return {
					ok: false,
					message: `网络错误: ${err.message}`
				};
			}
		}
		function WorkbenchPage({ type, resources, loading, fromCache, onRefresh, isRefreshing }) {
			const [searchQuery, setSearchQuery] = (0, react.useState)("");
			const [filterStatus, setFilterStatus] = (0, react.useState)("all");
			const [selectedCategory, setSelectedCategory] = (0, react.useState)("all");
			const [sortField, setSortField] = (0, react.useState)("star");
			const [sortOrder, setSortOrder] = (0, react.useState)("desc");
			const [currentPage, setCurrentPage] = (0, react.useState)(1);
			const [showInstallForm, setShowInstallForm] = (0, react.useState)(false);
			const [installSource, setInstallSource] = (0, react.useState)("");
			const [confirmDialog, setConfirmDialog] = (0, react.useState)({
				open: false,
				action: "uninstall",
				pluginId: ""
			});
			const [pendingAction, setPendingAction] = (0, react.useState)(null);
			const [feedback, setFeedback] = (0, react.useState)(null);
			const [installError, setInstallError] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				setCurrentPage(1);
			}, [
				searchQuery,
				filterStatus,
				selectedCategory,
				sortField,
				sortOrder
			]);
			(0, react.useEffect)(() => {
				if (feedback && feedback.ok && feedback.autoDismissMs > 0) {
					const timer = setTimeout(() => setFeedback(null), feedback.autoDismissMs);
					return () => clearTimeout(timer);
				}
			}, [feedback]);
			const categories = (0, react.useMemo)(() => {
				const cats = /* @__PURE__ */ new Set();
				resources.forEach((r) => {
					if (r.category) cats.add(r.category);
				});
				return Array.from(cats).sort();
			}, [resources]);
			const processedResources = (0, react.useMemo)(() => {
				let result = [...resources];
				if (selectedCategory !== "all") result = result.filter((r) => r.category === selectedCategory);
				if (searchQuery.trim()) {
					const q = searchQuery.toLowerCase();
					result = result.filter((r) => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.author.toLowerCase().includes(q) || r.category.toLowerCase().includes(q));
				}
				switch (filterStatus) {
					case "installed":
						result = result.filter((r) => r.isInstalled);
						break;
					case "not-installed":
						result = result.filter((r) => !r.isInstalled);
						break;
					case "updatable":
						result = result.filter((r) => r.updateAvailable);
						break;
					case "official":
						result = result.filter((r) => r.isOfficial);
						break;
					case "community": result = result.filter((r) => !r.isOfficial);
				}
				result.sort((a, b) => {
					let cmp = 0;
					switch (sortField) {
						case "name":
							cmp = a.name.localeCompare(b.name);
							break;
						case "star":
							cmp = a.star - b.star;
							break;
						case "updateTime":
							cmp = a.updateTime - b.updateTime;
							break;
						case "version": cmp = compareVersionStr(a.latestVersion, b.latestVersion);
					}
					return sortOrder === "asc" ? cmp : -cmp;
				});
				return result;
			}, [
				resources,
				searchQuery,
				filterStatus,
				selectedCategory,
				sortField,
				sortOrder
			]);
			const totalPages = Math.ceil(processedResources.length / PAGE_SIZE);
			const pagedResources = processedResources.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
			const installSourceFor = (resource) => {
				if (!resource) return "";
				const m = (resource.installCmd || "").match(/\badd\s+(\S+)\s*$/);
				if (m) return m[1];
				return resource.homepage || resource.installCmd || "";
			};
			const handleInstall = (resource) => {
				setInstallError(null);
				setInstallSource(installSourceFor(resource));
				setShowInstallForm(true);
			};
			const handleInstallSubmit = async (source) => {
				setPendingAction({
					pluginId: source,
					action: "install",
					startedAt: Date.now()
				});
				const result = await apiInstall(source);
				setPendingAction(null);
				setShowInstallForm(false);
				setFeedback({
					pluginId: source,
					action: "install",
					ok: result.ok,
					message: result.message,
					autoDismissMs: result.ok ? 5e3 : 0
				});
				if (result.ok) await onRefresh();
			};
			const handleUninstall = (resource) => {
				setConfirmDialog({
					open: true,
					action: "uninstall",
					pluginId: resource.id,
					fromVersion: resource.latestVersion
				});
			};
			const handleToggleEnable = async (resource) => {
				setPendingAction({
					pluginId: resource.id,
					action: resource.isEnabled ? "disable" : "enable",
					startedAt: Date.now()
				});
				const result = await apiToggle(resource.id, !resource.isEnabled);
				setPendingAction(null);
				setFeedback({
					pluginId: resource.id,
					action: resource.isEnabled ? "disable" : "enable",
					ok: result.ok,
					message: result.message,
					autoDismissMs: result.ok ? 3e3 : 0
				});
				if (result.ok) await onRefresh();
			};
			const handleUpdate = (resource) => {
				setConfirmDialog({
					open: true,
					action: "update",
					pluginId: resource.id,
					fromVersion: resource.localVersion || resource.latestVersion,
					toVersion: resource.latestVersion
				});
			};
			const handleConfirmAction = async () => {
				const { action, pluginId, toVersion } = confirmDialog;
				setConfirmDialog({
					...confirmDialog,
					open: false
				});
				setPendingAction({
					pluginId,
					action,
					startedAt: Date.now()
				});
				let result;
				switch (action) {
					case "update":
						result = await apiUpdate(pluginId, toVersion);
						break;
					case "rollback":
						result = await apiRollback(pluginId, toVersion || "");
						break;
					case "uninstall":
						result = await apiUninstall(pluginId);
						break;
					default: result = {
						ok: false,
						message: "未知操作"
					};
				}
				setPendingAction(null);
				setFeedback({
					pluginId,
					action,
					ok: result.ok,
					message: result.message,
					autoDismissMs: result.ok ? 3e3 : 0
				});
				if (result.ok) await onRefresh();
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dshwb-workbench-container",
				children: [
					type === "preset" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PresetManageSection, {}),
					type === "skill" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SkillManageSection, {}),
					type === "plugin" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							margin: "0 16px 12px 16px",
							display: "flex",
							alignItems: "center",
							gap: "10px",
							padding: "10px 16px",
							borderRadius: "14px",
							border: "1px solid var(--dsw-alias-border, #e0e0e0)",
							background: "var(--dsw-alias-bg-primary, #fff)"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								fontSize: "13px",
								color: "var(--dsw-alias-text-secondary, #86868b)",
								flex: 1
							},
							children: "安装/卸载/启停经 dsh plugin 与 cordis.patch.yml 托管区块执行，启停热生效，安装重启后生效"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							onClick: () => handleInstall(),
							style: {
								padding: "6px 16px",
								borderRadius: "9999px",
								border: "1.5px solid var(--dsw-accent, #0066cc)",
								background: "var(--dsw-accent, #0066cc)",
								color: "#fff",
								fontSize: "13px",
								cursor: "pointer"
							},
							children: "＋ 安装插件"
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionBar, {
						title: TYPE_TITLES[type],
						total: processedResources.length,
						searchQuery,
						onSearchChange: setSearchQuery,
						filterStatus,
						onFilterChange: setFilterStatus,
						sortField,
						onSortFieldChange: setSortField,
						sortOrder,
						onSortOrderChange: setSortOrder,
						onRefresh,
						isRefreshing,
						fromCache
					}),
					categories.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dshwb-category-filter",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: `dshwb-category-chip ${selectedCategory === "all" ? "active" : ""}`,
							onClick: () => setSelectedCategory("all"),
							children: "全部分类"
						}), categories.map((cat) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: `dshwb-category-chip ${selectedCategory === cat ? "active" : ""}`,
							onClick: () => setSelectedCategory(cat),
							children: cat
						}, cat))]
					}),
					loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LoadingState, {}) : pagedResources.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, {
						type: resources.length === 0 ? "empty" : "no-result",
						onAction: resources.length === 0 ? onRefresh : () => {
							setSearchQuery("");
							setFilterStatus("all");
						}
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Pagination, {
							currentPage,
							totalPages,
							totalItems: processedResources.length,
							pageSize: PAGE_SIZE,
							onPageChange: setCurrentPage
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dshwb-workbench-resource-grid",
							children: pagedResources.map((resource) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ResourceCard, {
								resource,
								onInstall: handleInstall,
								onUninstall: handleUninstall,
								onToggleEnable: handleToggleEnable,
								onUpdate: handleUpdate
							}, resource.id))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Pagination, {
							currentPage,
							totalPages,
							totalItems: processedResources.length,
							pageSize: PAGE_SIZE,
							onPageChange: setCurrentPage
						})
					] }),
					showInstallForm && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dshwb-overlay",
						style: {
							position: "fixed",
							inset: 0,
							background: "rgba(0,0,0,0.4)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							zIndex: 1e3
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								background: "var(--dsw-alias-bg-primary, #fff)",
								borderRadius: "18px",
								padding: "24px",
								minWidth: "360px",
								maxWidth: "480px",
								width: "90%",
								boxShadow: "0 8px 32px rgba(0,0,0,0.12)"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
									style: {
										margin: "0 0 16px",
										color: "var(--dsw-alias-text-primary, #1d1d1f)",
										fontSize: "18px",
										fontWeight: 600
									},
									children: "安装插件"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(InstallForm, {
									initialSource: installSource,
									onSubmit: handleInstallSubmit,
									busy: pendingAction?.action === "install",
									errorMessage: installError
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										display: "flex",
										justifyContent: "flex-end",
										marginTop: "12px"
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										onClick: () => setShowInstallForm(false),
										className: "dshwb-btn dshwb-btn-secondary",
										children: "取消"
									})
								})
							]
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PluginActionDialog, {
						open: confirmDialog.open,
						action: confirmDialog.action,
						pluginId: confirmDialog.pluginId,
						fromVersion: confirmDialog.fromVersion,
						toVersion: confirmDialog.toVersion,
						onConfirm: handleConfirmAction,
						onCancel: () => setConfirmDialog({
							...confirmDialog,
							open: false
						}),
						busy: pendingAction?.action === confirmDialog.action
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionFeedback, {
						feedback,
						onDismiss: () => setFeedback(null)
					})
				]
			});
		}
		function compareVersionStr(a, b) {
			const parse = (v) => {
				const parts = v.replace(/^[vV]/, "").trim().split(".").map((p) => parseInt(p, 10) || 0);
				while (parts.length < 3) parts.push(0);
				return parts.slice(0, 3);
			};
			const pa = parse(a);
			const pb = parse(b);
			for (let i = 0; i < 3; i++) {
				if (pa[i] > pb[i]) return 1;
				if (pa[i] < pb[i]) return -1;
			}
			return 0;
		}
		//#endregion
		//#region src/client/index.tsx
		const PLUGIN_ID = "dsh-tech-workbench";
		const VERSION = "2.4.0";
		const name = "dsh-tech-workbench";
		/**
		* 服务依赖声明（DSH 客户端 rejectGuard 要求）
		* - slots: 槽位注册服务（main + sidebar.panellist）
		*
		* 注意：logger、timer、effect 是 Cordis 上下文内置属性，不需要声明。
		* 声明了反而会导致插件等待不存在的服务而 pending（参考 dsh-skin-picker
		* 官方插件只声明 ['slots', 'theme']）。
		*/
		const inject = ["slots"];
		/** 模块级 ctx 引用（供 showToast 等独立函数使用 timer 服务） */
		let moduleCtx = null;
		let toastTimer = null;
		function showToast(message, type = "info") {
			const oldToast = document.querySelector(".dshwb-toast");
			if (oldToast) oldToast.remove();
			if (toastTimer) {
				clearTimeout(toastTimer);
				toastTimer = null;
			}
			const toast = document.createElement("div");
			toast.className = "dshwb-toast";
			toast.textContent = message;
			toast.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 10px 20px;
    border-radius: var(--dsw-alias-radius-md, 8px);
    background: var(--dsw-alias-bg-layer-2, #333);
    color: var(--dsw-alias-label-primary, #fff);
    border: 1px solid var(--dsw-alias-border, #555);
    box-shadow: var(--dsw-alias-shadow-md, 0 4px 12px rgba(0,0,0,0.3));
    z-index: 99999;
    font-size: 13px;
    opacity: 0;
    transition: opacity 0.2s ease, transform 0.2s ease;
  `;
			const colorMap = {
				success: "var(--dsw-alias-success, #22c55e)",
				error: "var(--dsw-alias-error, #ef4444)",
				info: "var(--dsw-alias-brand-primary, #4f8cff)"
			};
			toast.style.borderLeft = `3px solid ${colorMap[type]}`;
			document.body.appendChild(toast);
			requestAnimationFrame(() => {
				toast.style.opacity = "1";
				toast.style.transform = "translateX(-50%) translateY(0)";
			});
			toastTimer = setTimeout(() => {
				toast.style.opacity = "0";
				setTimeout(() => {
					if (toast.parentNode) toast.remove();
				}, 200);
				toastTimer = null;
			}, 2500);
		}
		function WorkbenchRoot({ initialTab }) {
			const [activeTab, setActiveTab] = (0, react.useState)(initialTab || "plugin");
			const [data, setData] = (0, react.useState)({
				plugins: [],
				skills: [],
				presets: [],
				apps: [],
				fromCache: false,
				updateTime: 0
			});
			const [config, setConfig] = (0, react.useState)(null);
			const [loading, setLoading] = (0, react.useState)(true);
			const [isRefreshing, setIsRefreshing] = (0, react.useState)(false);
			const fetchData = (0, react.useCallback)(async (force = false) => {
				try {
					const json = await (await fetch(force ? "/workbench/api/data?force=true" : "/workbench/api/data")).json();
					if (json.ok && json.data) setData({
						plugins: Array.isArray(json.data.plugins) ? json.data.plugins : [],
						skills: Array.isArray(json.data.skills) ? json.data.skills : [],
						presets: Array.isArray(json.data.presets) ? json.data.presets : [],
						apps: Array.isArray(json.data.apps) ? json.data.apps : [],
						fromCache: !!json.data.fromCache,
						updateTime: json.data.updateTime || 0
					});
				} catch (err) {
					moduleCtx?.logger?.error?.("[Workbench] 数据获取失败:", err);
					showToast("数据加载失败，请检查插件是否正常运行", "error");
				} finally {
					setLoading(false);
				}
			}, []);
			const fetchConfig = (0, react.useCallback)(async () => {
				try {
					const json = await (await fetch("/workbench/api/config")).json();
					if (json.ok && json.config) setConfig(json.config);
				} catch (err) {
					moduleCtx?.logger?.warn?.("[Workbench] 配置获取失败:", err);
				}
			}, []);
			(0, react.useEffect)(() => {
				fetchData(false);
				fetchConfig();
			}, [fetchData, fetchConfig]);
			const handleRefresh = async () => {
				setIsRefreshing(true);
				await fetchData(true);
				setIsRefreshing(false);
				showToast("数据已刷新", "success");
			};
			const getCurrentResources = () => {
				switch (activeTab) {
					case "plugin": return data.plugins || [];
					case "skill": return data.skills || [];
					case "preset": return data.presets || [];
					case "app": return data.apps || [];
					default: return [];
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dshwb-root",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							padding: "12px 16px 8px 16px",
							display: "flex",
							gap: "12px",
							alignItems: "center",
							justifyContent: "space-between"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							onClick: () => {},
							style: {
								display: "flex",
								alignItems: "center",
								gap: "6px",
								padding: "6px 14px",
								borderRadius: "9999px",
								background: "transparent",
								color: "#0066cc",
								border: "1px solid #e0e0e0",
								cursor: "pointer",
								fontSize: "14px",
								fontWeight: 400,
								flexShrink: 0,
								transition: "all 0.2s ease"
							},
							onMouseEnter: (e) => {
								e.currentTarget.style.background = "#f5f5f7";
							},
							onMouseLeave: (e) => {
								e.currentTarget.style.background = "transparent";
							},
							children: "← 返回"
						}), config && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								fontSize: "12px",
								color: "#86868b",
								flexShrink: 0,
								fontWeight: 400
							},
							children: [
								"v",
								"2.4.0",
								" · ",
								config.githubTokenConfigured ? "GitHub已配置" : "GitHub匿名模式"
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							display: "flex",
							justifyContent: "center",
							padding: "8px 16px 16px 16px"
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dshwb-tabs-floating",
							style: {
								display: "flex",
								gap: "2px",
								padding: "4px",
								background: "rgba(255, 255, 255, 0.8)",
								backdropFilter: "blur(20px)",
								WebkitBackdropFilter: "blur(20px)",
								borderRadius: "9999px",
								boxShadow: "0 2px 16px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04)",
								border: "none"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									className: `dshwb-tab-apple ${activeTab === "plugin" ? "active" : ""}`,
									onClick: () => setActiveTab("plugin"),
									children: [
										"插件 (",
										data.plugins?.length || 0,
										")"
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									className: `dshwb-tab-apple ${activeTab === "skill" ? "active" : ""}`,
									onClick: () => setActiveTab("skill"),
									children: [
										"Skill (",
										data.skills?.length || 0,
										")"
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									className: `dshwb-tab-apple ${activeTab === "preset" ? "active" : ""}`,
									onClick: () => setActiveTab("preset"),
									children: [
										"Preset (",
										data.presets?.length || 0,
										")"
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									className: `dshwb-tab-apple ${activeTab === "app" ? "active" : ""}`,
									onClick: () => setActiveTab("app"),
									children: [
										"应用 (",
										data.apps?.length || 0,
										")"
									]
								})
							]
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(WorkbenchPage, {
						type: activeTab,
						resources: getCurrentResources(),
						loading,
						fromCache: data.fromCache,
						onRefresh: handleRefresh,
						isRefreshing
					})
				]
			});
		}
		/**
		* 独立页面外壳。
		* 包一层 div.dshwb-page-shell 提供全尺寸可滚动容器，
		* 内部渲染 WorkbenchRoot。
		*/
		function PageShell() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dshwb-page-shell",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WorkbenchRoot, { initialTab: "plugin" })
			});
		}
		/**
		* 科技风工作台侧边栏图标（16px 齿轮）。
		* stroke currentColor；active 时用 var(--dsw-alias-state-business-primary)。
		*/
		function TechWorkbenchPanelIcon({ size, active }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 16 16",
				fill: "none",
				stroke: active ? "var(--dsw-alias-state-business-primary)" : "currentColor",
				strokeWidth: "1.5",
				strokeLinecap: "round",
				strokeLinejoin: "round",
				"aria-hidden": "true",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
					cx: "8",
					cy: "8",
					r: "2.5"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" })]
			});
		}
		/** 面板 ID（main key 与 sidebar.panellist id 必须完全一致） */
		const PANEL_ID = "tech-workbench";
		/** 侧边栏入口排序 */
		const PANEL_ORDER = 5;
		/** 侧边栏入口标签 */
		const PANEL_LABEL = "Meta管理";
		/**
		* 注册科技风工作台 main keyed slot（壳原生独立页面）。
		* 返回 dispose 函数。
		*/
		function registerTechWorkbenchPanel(ctx) {
			const slots = ctx.slots;
			return slots.inject("main", () => {
				slots.register({
					name: "main",
					key: PANEL_ID
				}, PageShell);
			});
		}
		/**
		* 注册科技风工作台侧边栏入口（sidebar.panellist）。
		* 返回 dispose 函数。
		*/
		function registerTechWorkbenchEntry(ctx) {
			const slots = ctx.slots;
			return slots.inject("sidebar.panellist", () => {
				slots.register({
					name: "sidebar.panellist",
					id: PANEL_ID,
					label: PANEL_LABEL,
					order: PANEL_ORDER
				}, TechWorkbenchPanelIcon);
			});
		}
		function apply(ctx) {
			moduleCtx = ctx;
			const logger = ctx.logger;
			if (!document.querySelector("style[data-dshwb-workbench]")) {
				const styleEl = document.createElement("style");
				styleEl.setAttribute("data-dshwb-workbench", "");
				styleEl.textContent = WORKBENCH_CSS;
				document.head.appendChild(styleEl);
				logger?.info?.(`[${PLUGIN_ID}] 工作台样式已注入（使用 DSH 原生 --dsw-alias-* 变量）`);
			}
			let disposePanel;
			try {
				disposePanel = registerTechWorkbenchPanel(ctx);
				logger?.info?.(`[${PLUGIN_ID}] main panel registered (key=${PANEL_ID})`);
			} catch (err) {
				logger?.error?.(`[${PLUGIN_ID}] main panel registration failed:`, err);
			}
			let disposeEntry;
			try {
				disposeEntry = registerTechWorkbenchEntry(ctx);
				logger?.info?.(`[${PLUGIN_ID}] sidebar panellist registered (id=${PANEL_ID}, label=${PANEL_LABEL})`);
			} catch (err) {
				logger?.error?.(`[${PLUGIN_ID}] sidebar panellist registration failed:`, err);
			}
			try {
				fetch("/workbench/api/config").then((r) => r.json()).then((json) => {
					if (json.ok && json.version && json.version !== "2.4.0") logger?.warn?.(`[${PLUGIN_ID}] 版本不匹配：Client v${VERSION}，Host v${json.version}，请 Ctrl+Shift+R 强制刷新`);
				}).catch(() => {});
			} catch (err) {}
			try {
				if (typeof ctx.effect === "function") ctx.effect(() => {
					return () => {
						logger?.info?.(`[${PLUGIN_ID}] 插件卸载，执行清理...`);
						disposeEntry?.();
						disposePanel?.();
						document.querySelector("style[data-dshwb-workbench]")?.remove();
						moduleCtx = null;
					};
				});
			} catch (err) {
				logger?.error?.(`[${PLUGIN_ID}] 卸载清理注册失败:`, err);
			}
			logger?.info?.(`[${PLUGIN_ID}] client mounted v${VERSION}（壳原生 main 面板 + sidebar.panellist）`);
		}
		//#endregion
		exports.PLUGIN_ID = PLUGIN_ID;
		exports.VERSION = VERSION;
		exports.WorkbenchRoot = WorkbenchRoot;
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		exports.registerTechWorkbenchEntry = registerTechWorkbenchEntry;
		exports.registerTechWorkbenchPanel = registerTechWorkbenchPanel;
		exports.showToast = showToast;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map