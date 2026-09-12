/**
 * DSH 科技风工作台 - 组件样式模块
 *
 * 设计原则：
 *   - 只包含布局/间距/动效，不硬编码颜色
 *   - 所有颜色使用 DSH 原生 --dsw-alias-* 变量
 *   - 安装 dsh-tech-skin 或其他 DSH 主题后自动适配
 *   - 未安装皮肤时使用 DSH 默认主题（变量有降级值）
 */

export const WORKBENCH_CSS = `
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
