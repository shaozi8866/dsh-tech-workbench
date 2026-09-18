/**
 * DSH 科技风工作台插件 - Client 半侧入口
 * 运行于用户浏览器（React），负责：
 *   - 注册壳原生 main 面板（key='tech-workbench'）
 *   - 注册侧边栏 sidebar.panellist 入口
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
import { WORKBENCH_CSS } from './workbench.css';
import { WorkbenchPage } from './components/WorkbenchPage';
import type { StandardResource, ResourceType, FetchResult, PluginConfig } from './types';

export const PLUGIN_ID = 'dsh-tech-workbench';
export const VERSION = '2.4.0';
export const name = 'dsh-tech-workbench';

/**
 * 服务依赖声明（DSH 客户端 rejectGuard 要求）
 * - slots: 槽位注册服务（main + sidebar.panellist）
 *
 * 注意：logger、timer、effect 是 Cordis 上下文内置属性，不需要声明。
 * 声明了反而会导致插件等待不存在的服务而 pending（参考 dsh-skin-picker
 * 官方插件只声明 ['slots', 'theme']）。
 */
export const inject = ['slots'];

// ==============================================
// 局部窄接口类型（不 import 壳包名）
// ==============================================

/** slots 服务最小形状 */
interface SlotsService {
  inject(name: string, callback: () => void): (() => void) | undefined;
  register(definition: object, component: unknown): void;
}

/** 本插件客户端使用的局部窄 ctx 接口 */
interface TechWorkbenchContext extends Context {
  slots: SlotsService;
}

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
            // 在壳原生面板模式下，返回由壳层处理（点击会话列表即退出）
            // 此处不再需要手动控制显隐
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
// PageShell — 壳原生面板页面外壳
// ==============================================

/**
 * 独立页面外壳。
 * 包一层 div.dshwb-page-shell 提供全尺寸可滚动容器，
 * 内部渲染 WorkbenchRoot。
 */
function PageShell() {
  return (
    <div className="dshwb-page-shell">
      <WorkbenchRoot initialTab="plugin" />
    </div>
  );
}

// ==============================================
// 侧边栏 glyph 图标（壳自绘行按钮，注册组件只画 glyph）
// ==============================================

interface PanelIconProps {
  size: number;
  active: boolean;
}

/**
 * 科技风工作台侧边栏图标（16px 齿轮）。
 * stroke currentColor；active 时用 var(--dsw-alias-state-business-primary)。
 */
function TechWorkbenchPanelIcon({ size, active }: PanelIconProps) {
  const stroke = active
    ? 'var(--dsw-alias-state-business-primary)'
    : 'currentColor';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke={stroke}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
    </svg>
  );
}

// ==============================================
// 面板 ID 常量
// ==============================================

/** 面板 ID（main key 与 sidebar.panellist id 必须完全一致） */
const PANEL_ID = 'tech-workbench';

/** 侧边栏入口排序 */
const PANEL_ORDER = 5;

/** 侧边栏入口标签 */
const PANEL_LABEL = 'Meta管理';

// ==============================================
// 注册函数
// ==============================================

/**
 * 注册科技风工作台 main keyed slot（壳原生独立页面）。
 * 返回 dispose 函数。
 */
export function registerTechWorkbenchPanel(ctx: Context): (() => void) | undefined {
  const slots = (ctx as TechWorkbenchContext).slots;
  return slots.inject('main', () => {
    slots.register(
      {
        name: 'main',
        key: PANEL_ID,
      },
      PageShell,
    );
  });
}

/**
 * 注册科技风工作台侧边栏入口（sidebar.panellist）。
 * 返回 dispose 函数。
 */
export function registerTechWorkbenchEntry(ctx: Context): (() => void) | undefined {
  const slots = (ctx as TechWorkbenchContext).slots;
  return slots.inject('sidebar.panellist', () => {
    slots.register(
      {
        name: 'sidebar.panellist',
        id: PANEL_ID,
        label: PANEL_LABEL,
        order: PANEL_ORDER,
      },
      TechWorkbenchPanelIcon as unknown as (props: object) => any,
    );
  });
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

  // ===== 1. 注册壳原生 main 面板 =====
  let disposePanel: (() => void) | undefined;
  try {
    disposePanel = registerTechWorkbenchPanel(ctx);
    logger?.info?.(`[${PLUGIN_ID}] main panel registered (key=${PANEL_ID})`);
  } catch (err) {
    logger?.error?.(`[${PLUGIN_ID}] main panel registration failed:`, err);
  }

  // ===== 2. 注册侧边栏 sidebar.panellist 入口 =====
  let disposeEntry: (() => void) | undefined;
  try {
    disposeEntry = registerTechWorkbenchEntry(ctx);
    logger?.info?.(`[${PLUGIN_ID}] sidebar panellist registered (id=${PANEL_ID}, label=${PANEL_LABEL})`);
  } catch (err) {
    logger?.error?.(`[${PLUGIN_ID}] sidebar panellist registration failed:`, err);
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
          disposeEntry?.();
          disposePanel?.();
          document.querySelector('style[data-dshwb-workbench]')?.remove();
          moduleCtx = null;
        };
      });
    }
  } catch (err) {
    logger?.error?.(`[${PLUGIN_ID}] 卸载清理注册失败:`, err);
  }

  logger?.info?.(`[${PLUGIN_ID}] client mounted v${VERSION}（壳原生 main 面板 + sidebar.panellist）`);
}

// 导出组件供外部使用
export { WorkbenchRoot };
