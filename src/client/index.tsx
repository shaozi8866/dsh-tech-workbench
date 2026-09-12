/**
 * DSH 科技风工作台插件 - Client 半侧入口
 * 运行于用户浏览器（React），负责：
 *   - 侧边栏重构（三槽位工作台入口）
 *   - 插件/预设/应用统一工作台页面渲染
 *   - 与 Host 侧 HTTP 接口通信获取数据
 *
 * 样式说明：
 *   本插件不自带皮肤，所有颜色/圆角/阴影使用 DSH 原生 --dsw-alias-* 变量
 *   安装 dsh-tech-skin 或其他 DSH 主题插件后自动适配
 *   未安装皮肤时使用 DSH 默认主题
 */

import type { Context } from '@deepseek-ai/cordis';
import React, { useEffect, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { WORKBENCH_CSS } from './workbench.css';
import { injectSidebarWorkbench, cleanupSidebarIntegration, setWorkbenchRenderFunction, setWorkbenchOpen } from './sidebar-integration';
import { WorkbenchPage } from './components/WorkbenchPage';
import type { StandardResource, ResourceType, FetchResult, PluginConfig } from './types';

export const PLUGIN_ID = 'dsh-tech-workbench';
export const VERSION = '2.0.0';
export const name = 'dsh-tech-workbench';

/**
 * 服务依赖声明（DSH 客户端 rejectGuard 要求）
 * - slots: 槽位注册服务（settings.section 卡片）
 *
 * 注意：logger、timer、effect 是 Cordis 上下文内置属性，不需要声明。
 * 声明了反而会导致插件等待不存在的服务而 pending（参考 dsh-skin-picker
 * 官方插件只声明 ['slots', 'theme']）。
 */
export const inject = ['slots'];

// ==============================================
// 简易 Toast 提示（不依赖皮肤）
// ==============================================

/** 模块级 ctx 引用（供 showToast 等独立函数使用 timer 服务） */
let moduleCtx: Context | null = null;

let toastTimer: any = null;

/** 安全的 setTimeout：优先使用 ctx.timer，降级到全局 setTimeout */
function safeSetTimeout(callback: () => void, delay: number): any {
  if (moduleCtx?.timer?.setTimeout) {
    return moduleCtx.timer.setTimeout(callback, delay);
  }
  return setTimeout(callback, delay);
}

/** 安全的 clearTimeout */
function safeClearTimeout(timer: any): void {
  if (!timer) return;
  if (moduleCtx?.timer?.clearTimeout) {
    moduleCtx.timer.clearTimeout(timer);
  } else {
    clearTimeout(timer);
  }
}

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  // 移除旧的 toast
  const oldToast = document.querySelector('.dshwb-toast');
  if (oldToast) {
    oldToast.remove();
  }
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }

  const toast = document.createElement('div');
  toast.className = 'dshwb-toast';
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

  // 根据类型设置左边框颜色（使用 DSH 标准语义色变量）
  const colorMap = {
    success: 'var(--dsw-alias-success, #22c55e)',
    error: 'var(--dsw-alias-error, #ef4444)',
    info: 'var(--dsw-alias-brand-primary, #4f8cff)',
  };
  toast.style.borderLeft = `3px solid ${colorMap[type]}`;

  document.body.appendChild(toast);

  // 显示动画
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });

  // 2.5秒后自动消失（使用原生 setTimeout，确保可靠）
  toastTimer = setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 200);
    toastTimer = null;
  }, 2500);
}

// ==============================================
// 工作台根组件
// ==============================================

function WorkbenchRoot({ initialTab }: { initialTab?: string }) {
  const [activeTab, setActiveTab] = useState<ResourceType>((initialTab as ResourceType) || 'plugin');
  const [data, setData] = useState<FetchResult>({
    plugins: [],
    skills: [],
    presets: [],
    apps: [],
    fromCache: false,
    updateTime: 0,
  });
  const [config, setConfig] = useState<PluginConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 获取数据
  const fetchData = useCallback(async (force = false) => {
    try {
      const url = force ? '/workbench/api/data?force=true' : '/workbench/api/data';
      const res = await fetch(url);
      const json = await res.json();
      if (json.ok && json.data) {
        // 合并默认值，确保所有数组字段都存在（避免 API 未返回某些字段时渲染报错）
        setData({
          plugins: Array.isArray(json.data.plugins) ? json.data.plugins : [],
          skills: Array.isArray(json.data.skills) ? json.data.skills : [],
          presets: Array.isArray(json.data.presets) ? json.data.presets : [],
          apps: Array.isArray(json.data.apps) ? json.data.apps : [],
          fromCache: !!json.data.fromCache,
          updateTime: json.data.updateTime || 0,
        });
      }
    } catch (err) {
      moduleCtx?.logger?.error?.('[Workbench] 数据获取失败:', err);
      showToast('数据加载失败，请检查插件是否正常运行', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取配置
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/workbench/api/config');
      const json = await res.json();
      if (json.ok && json.config) {
        setConfig(json.config);
      }
    } catch (err) {
      moduleCtx?.logger?.warn?.('[Workbench] 配置获取失败:', err);
    }
  }, []);

  // 初始化
  useEffect(() => {
    fetchData(false);
    fetchConfig();
  }, [fetchData, fetchConfig]);

  // 手动刷新
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData(true);
    setIsRefreshing(false);
    showToast('数据已刷新', 'success');
  };

  // 获取当前Tab的资源列表
  const getCurrentResources = (): StandardResource[] => {
    switch (activeTab) {
      case 'plugin':
        return data.plugins || [];
      case 'skill':
        return data.skills || [];
      case 'preset':
        return data.presets || [];
      case 'app':
        return data.apps || [];
      default:
        return [];
    }
  };

  return (
    <div className="dshwb-root">
      {/* 顶部栏：返回按钮 + 版本信息 */}
      <div
        style={{
          padding: '12px 16px 8px 16px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* 返回按钮 */}
        <button
          onClick={() => {
            setWorkbenchOpen(false);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '9999px',
            background: 'transparent',
            color: '#0066cc',
            border: '1px solid #e0e0e0',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 400,
            flexShrink: 0,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f5f5f7';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          ← 返回
        </button>

        {config && (
          <div style={{ fontSize: '12px', color: '#86868b', flexShrink: 0, fontWeight: 400 }}>
            v{VERSION} · {config.githubTokenConfigured ? 'GitHub已配置' : 'GitHub匿名模式'}
          </div>
        )}
      </div>

      {/* 悬浮居中 Tab 切换栏（Apple 风格） */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '8px 16px 16px 16px',
        }}
      >
        <div
          className="dshwb-tabs-floating"
          style={{
            display: 'flex',
            gap: '2px',
            padding: '4px',
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '9999px',
            boxShadow: '0 2px 16px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04)',
            border: 'none',
          }}
        >
          <button
            className={`dshwb-tab-apple ${activeTab === 'plugin' ? 'active' : ''}`}
            onClick={() => setActiveTab('plugin')}
          >
            插件 ({data.plugins?.length || 0})
          </button>
          <button
            className={`dshwb-tab-apple ${activeTab === 'skill' ? 'active' : ''}`}
            onClick={() => setActiveTab('skill')}
          >
            Skill ({data.skills?.length || 0})
          </button>
          <button
            className={`dshwb-tab-apple ${activeTab === 'preset' ? 'active' : ''}`}
            onClick={() => setActiveTab('preset')}
          >
            Preset ({data.presets?.length || 0})
          </button>
          <button
            className={`dshwb-tab-apple ${activeTab === 'app' ? 'active' : ''}`}
            onClick={() => setActiveTab('app')}
          >
            应用 ({data.apps?.length || 0})
          </button>
        </div>
      </div>

      {/* 工作台页面 */}
      <WorkbenchPage
        type={activeTab}
        resources={getCurrentResources()}
        loading={loading}
        fromCache={data.fromCache}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
    </div>
  );
}

// ==============================================
// 侧边栏工作台入口组件（三槽位）
// ==============================================

function SidebarWorkbenchEntry() {
  const [activeSlot, setActiveSlot] = useState<string>('plugin');

  const slots = [
    { id: 'plugin', label: '插件管理', icon: '🔌' },
    { id: 'preset', label: '预设管理', icon: '📋' },
    { id: 'app', label: '应用管理', icon: '🚀' },
  ];

  const handleSlotClick = (slotId: string) => {
    setActiveSlot(slotId);
    // 触发自定义事件，通知主界面切换Tab
    window.dispatchEvent(new CustomEvent('dshwb-switch-tab', { detail: { tab: slotId } }));
    showToast(`切换到${slots.find((s) => s.id === slotId)?.label}`, 'success');
  };

  return (
    <div className="dshwb-sidebar-workbench-module">
      {slots.map((slot) => (
        <div
          key={slot.id}
          className={`dshwb-sidebar-workbench-item ${activeSlot === slot.id ? 'active' : ''}`}
          onClick={() => handleSlotClick(slot.id)}
        >
          <span style={{ fontSize: '16px' }}>{slot.icon}</span>
          <span>{slot.label}</span>
        </div>
      ))}
    </div>
  );
}

// ==============================================
// 主界面工作台页面（参考 @dely0/dsh-personal-workbench 实现）
// 通过 html 属性控制显隐，position: absolute 插入到主内容区
// ==============================================

let workbenchReactRoot: any = null;

/**
 * 渲染工作台内容到指定容器（供 sidebar-integration.ts 调用）
 */
export function renderWorkbenchContent(container: HTMLElement): void {
  try {
    if (workbenchReactRoot) {
      workbenchReactRoot.unmount();
    }
    workbenchReactRoot = createRoot(container);
    workbenchReactRoot.render(React.createElement(WorkbenchRoot, { initialTab: 'plugin' }));
    console.log('[dsh-tech-workbench] 工作台内容已渲染');
  } catch (err) {
    console.error('[dsh-tech-workbench] 工作台内容渲染失败:', err);
    container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--dsw-alias-label-secondary);">工作台加载失败，请刷新页面</div>';
  }
}

// ==============================================
// Client 侧主入口
// ==============================================

export function apply(ctx: Context): void {
  // 保存 ctx 引用到模块级别，供 showToast 等独立函数使用 timer 服务
  moduleCtx = ctx;
  const logger = ctx.logger;

  // ===== 0. 注入工作台组件样式（颜色全部用 --dsw-alias-* 变量，适配任意 DSH 主题）=====
  const existingStyle = document.querySelector('style[data-dshwb-workbench]');
  if (!existingStyle) {
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-dshwb-workbench', '');
    styleEl.textContent = WORKBENCH_CSS;
    document.head.appendChild(styleEl);
    logger?.info?.(`[${PLUGIN_ID}] 工作台样式已注入（使用 DSH 原生 --dsw-alias-* 变量）`);
  }

  // ===== 1. 侧边栏工作台入口注入（参考 @dely0/dsh-personal-workbench 实现）=====
  try {
    // 先设置渲染函数，避免动态导入
    setWorkbenchRenderFunction((container) => {
      renderWorkbenchContent(container);
    });
    injectSidebarWorkbench();
    logger?.info?.(`[${PLUGIN_ID}] 侧边栏工作台入口注入已启动`);
  } catch (err) {
    logger?.error?.(`[${PLUGIN_ID}] 侧边栏注入失败:`, err);
  }

  // ===== 3. 版本比对提示 =====
  try {
    fetch('/workbench/api/config')
      .then((r) => r.json())
      .then((json) => {
        if (json.ok && json.version && json.version !== VERSION) {
          logger?.warn?.(`[${PLUGIN_ID}] 版本不匹配：Client v${VERSION}，Host v${json.version}，请 Ctrl+Shift+R 强制刷新`);
        }
      })
      .catch(() => {});
  } catch (err) {
    // 忽略版本检查失败
  }

  // ===== 4. 注册卸载清理 =====
  try {
    if (typeof ctx.effect === 'function') {
      ctx.effect(() => {
        return () => {
          logger?.info?.(`[${PLUGIN_ID}] 插件卸载，执行清理...`);
          cleanupSidebarIntegration();
          document.querySelector('style[data-dshwb-workbench]')?.remove();
          moduleCtx = null;
        };
      });
    }
  } catch (err) {
    logger?.error?.(`[${PLUGIN_ID}] 卸载清理注册失败:`, err);
  }

  logger?.info?.(`[${PLUGIN_ID}] client mounted v${VERSION}（无皮肤模式，使用 DSH 原生 --dsw-alias-* 变量）`);
}

// 导出组件供外部使用
export { WorkbenchRoot, SidebarWorkbenchEntry };
