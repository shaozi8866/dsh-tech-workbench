/**
 * DSH 科技风工作台 - 侧边栏集成模块
 * 完全参考 @dely0/dsh-personal-workbench 的实现方式
 *
 * 关键设计（和 personal-workbench 完全一致）：
 * 1. 侧边栏入口直接创建 button 元素，不使用 wrapper 包裹
 * 2. 插入位置：找到 logoRow/新建会话按钮，考虑第三方入口，精确插入
 * 3. 工作台视图用 position: absolute 插入到主内容区，通过 html 属性控制显隐
 * 4. CSS 样式完全复用 DSH 原生 sidebar-nav-item 变量
 */

// 注入标记（和 personal-workbench 一致的命名风格）
const ENTRY_ATTR = 'data-dsh-tech-workbench-entry';
const VIEW_ATTR = 'data-dsh-tech-workbench-view';
const ACTIVE_ATTR = 'data-dsh-tech-workbench-active';
const TOGGLE_EVENT = 'dsh-tech-workbench-toggle';

// 全局状态
let entryEl: HTMLButtonElement | null = null;
let viewEl: HTMLDivElement | null = null;
let reactRoot: any = null;
let sidebarObserver: MutationObserver | null = null;
let activeObserver: MutationObserver | null = null;
let renderFunction: ((container: HTMLElement) => void) | null = null;
let isOpen = false;
let cleanupRegistered = false;

/**
 * 设置渲染函数（由 index.tsx 调用，避免动态导入）
 */
export function setWorkbenchRenderFunction(fn: (container: HTMLElement) => void): void {
  renderFunction = fn;
}

/**
 * 注入全局 CSS（完全参考 personal-workbench 的样式规范）
 */
function injectGlobalStyles(): void {
  if (document.getElementById('dsh-tech-workbench-styles')) return;

  const style = document.createElement('style');
  style.id = 'dsh-tech-workbench-styles';
  style.textContent = `
    /* 主内容区相对定位，供 absolute 子元素定位 */
    [data-pane='conversation'], [class*='centerCol'] { position: relative; }

    /* 工作台视图：默认隐藏 */
    [${VIEW_ATTR}] {
      position: absolute; inset: 0; display: none; z-index: 60;
      background: var(--dsw-alias-bg-base, #111);
      color: var(--dsw-alias-label-primary, #eee);
      font-family: var(--dsw-font-family, system-ui);
      overflow: auto;
    }

    /* 激活时显示工作台视图 */
    html[${ACTIVE_ATTR}] [${VIEW_ATTR}] { display: block; }

    /* 激活时隐藏主内容区的其他子元素 */
    html[${ACTIVE_ATTR}] [data-pane='conversation'] > :not([${VIEW_ATTR}]),
    html[${ACTIVE_ATTR}] [class*='centerCol'] > :not([${VIEW_ATTR}]) {
      display: none !important;
    }

    /* 侧边栏入口按钮：完全遵循 DSH sidebar-nav-item 规范（和 personal-workbench 一致） */
    [${ENTRY_ATTR}] {
      position: relative;
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      height: 32px;
      padding: 0 12px;
      background: transparent;
      border: none;
      border-radius: 8px;
      color: var(--dsw-alias-label-secondary);
      cursor: pointer;
      font-size: 13px;
      white-space: nowrap;
      text-align: left;
      font-family: inherit;
    }

    [${ENTRY_ATTR}] .wb-icon {
      width: 16px; height: 16px; flex: none;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 14px;
    }

    [${ENTRY_ATTR}]:hover {
      background: var(--dsw-specific-sidebar-nav-item-hover);
      color: var(--dsw-alias-label-primary);
    }

    [${ENTRY_ATTR}][data-active] {
      background: var(--dsw-specific-sidebar-nav-item-active);
      color: var(--dsw-alias-label-primary);
      font-weight: 600;
    }

    /* 侧边栏折叠时的适配 */
    [data-dsh-frame][data-sidebar-collapsed] [${ENTRY_ATTR}] {
      justify-content: center;
      padding: 0;
      width: 100%;
    }
    [data-dsh-frame][data-sidebar-collapsed] [${ENTRY_ATTR}] .wb-label {
      display: none;
    }
  `;
  document.head.appendChild(style);
}

/**
 * 查找侧边栏容器
 */
function findSidebar(): HTMLElement | null {
  const el = document.querySelector("[data-pane='sidebar'], [class*='sidebarCol']");
  return el ? (el as HTMLElement) : null;
}

/**
 * 查找侧边栏入口容器（logoRow 的父元素）
 */
function findSidebarEntryContainer(sidebar: HTMLElement): HTMLElement | null {
  const logoRow = sidebar.querySelector('[class*="logoRow"]');
  if (logoRow && logoRow.parentElement) {
    return logoRow.parentElement as HTMLElement;
  }
  return sidebar.firstElementChild as HTMLElement || null;
}

/**
 * 查找新建会话按钮
 */
function findNewSessionButton(container: HTMLElement): HTMLElement | null {
  return container.querySelector('button[class*="newSession"]');
}

/**
 * 创建侧边栏入口按钮（和 personal-workbench 完全一致的方式）
 */
function createSidebarEntry(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute(ENTRY_ATTR, '');
  btn.setAttribute('title', 'Meta管理：插件、Skill、预设统一管理');
  btn.innerHTML = `
    <span class="wb-icon">⚙️</span>
    <span class="wb-label">Meta管理</span>
  `;

  btn.addEventListener('click', () => {
    toggleWorkbench();
  });

  return btn;
}

/**
 * 创建工作台视图容器
 */
function createWorkbenchView(): HTMLDivElement {
  const view = document.createElement('div');
  view.setAttribute(VIEW_ATTR, '');
  return view;
}

/**
 * 查找主内容区
 */
function findMainContent(): HTMLElement | null {
  const el = document.querySelector("[data-pane='conversation'], [class*='centerCol']");
  return el ? (el as HTMLElement) : null;
}

/**
 * 确保工作台视图已创建并插入到主内容区（和 personal-workbench 一致：注入时就创建，不等待打开）
 */
function ensureWorkbenchView(): void {
  if (viewEl && document.body.contains(viewEl)) return;

  const mainContent = findMainContent();
  if (!mainContent) {
    console.warn('[dsh-tech-workbench] 未找到主内容区');
    return;
  }

  // 创建视图容器（如果还没创建）
  if (!viewEl) {
    viewEl = createWorkbenchView();

    // 立即渲染 React 内容（和 personal-workbench 一致：注入时就渲染，不等待打开）
    if (renderFunction) {
      try {
        renderFunction(viewEl);
      } catch (err) {
        console.error('[dsh-tech-workbench] React 渲染失败:', err);
        viewEl.innerHTML = '<div style="padding:40px;text-align:center;">工作台加载失败，请刷新页面</div>';
      }
    } else {
      console.warn('[dsh-tech-workbench] 渲染函数未设置');
    }
  }

  // 插入到主内容区
  if (!document.body.contains(viewEl)) {
    mainContent.appendChild(viewEl);
  }
}

/**
 * 设置工作台显隐状态
 */
function setWorkbenchOpen(open: boolean): void {
  isOpen = open;

  if (open) {
    document.documentElement.setAttribute(ACTIVE_ATTR, '');
  } else {
    document.documentElement.removeAttribute(ACTIVE_ATTR);
  }

  // 更新按钮激活状态
  if (entryEl) {
    if (open) {
      entryEl.dataset.active = 'true';
    } else {
      delete entryEl.dataset.active;
    }
  }

  // 派发事件
  document.dispatchEvent(new CustomEvent(TOGGLE_EVENT, { detail: { open } }));

  console.log(`[dsh-tech-workbench] 工作台${open ? '已显示' : '已隐藏'}`);
}

/**
 * 切换工作台显隐
 */
function toggleWorkbench(): void {
  setWorkbenchOpen(!isOpen);
}

/**
 * 执行侧边栏入口注入（和 personal-workbench 完全一致的插入逻辑）
 */
function injectEntry(): void {
  if (entryEl && document.body.contains(entryEl)) return;

  const sidebar = findSidebar();
  if (!sidebar) return;

  const container = findSidebarEntryContainer(sidebar);
  if (!container) return;

  const newSessionBtn = findNewSessionButton(container);

  // 创建按钮（不使用 wrapper）
  if (!entryEl) {
    entryEl = createSidebarEntry();
  }

  // 计算插入位置（和 personal-workbench 完全一致）
  // 1. 检查其他第三方入口
  const thirdPartyEntries = Array.from(container.children).filter(
    (e) => e instanceof HTMLElement && e.matches('[data-dsh-taskboard-entry], [data-dsh-ssh-entry], [data-dsh-personal-workbench-entry]'),
  );

  let insertBefore: Node | null = null;

  if (thirdPartyEntries.length > 0) {
    // 插到最后一个第三方入口之后
    insertBefore = thirdPartyEntries[thirdPartyEntries.length - 1].nextSibling;
  } else if (newSessionBtn) {
    // 找到 logoRow，如果存在且父元素是 container，就用 logoRow 作为参考
    const logoRow = newSessionBtn.closest('[class*="logoRow"]');
    const refElement = logoRow && logoRow.parentElement === container ? logoRow : newSessionBtn;
    insertBefore = refElement.nextSibling;
  }

  // 插入按钮（直接插入，不使用 wrapper）
  if (insertBefore) {
    container.insertBefore(entryEl, insertBefore);
  } else {
    container.appendChild(entryEl);
  }

  // 监听 html 属性变化，同步按钮激活状态
  if (!activeObserver) {
    activeObserver = new MutationObserver(() => {
      if (entryEl) {
        if (document.documentElement.hasAttribute(ACTIVE_ATTR)) {
          entryEl.dataset.active = 'true';
        } else {
          delete entryEl.dataset.active;
        }
      }
    });
    activeObserver.observe(document.documentElement, { attributes: true, attributeFilter: [ACTIVE_ATTR] });
  }
}

/**
 * 启动侧边栏集成
 */
export function injectSidebarWorkbench(): void {
  injectGlobalStyles();

  // 初始注入：侧边栏入口 + 工作台视图（和 personal-workbench 一致：注入时就创建并渲染）
  injectEntry();
  ensureWorkbenchView();

  // 监听 body DOM 变化，在侧边栏或主内容区重渲染时重新注入
  if (!sidebarObserver) {
    sidebarObserver = new MutationObserver(() => {
      injectEntry();
      ensureWorkbenchView();
    });
    sidebarObserver.observe(document.body, { childList: true, subtree: true });
  }

  // 监听点击会话列表项时自动关闭工作台（和 personal-workbench 一致）
  if (!cleanupRegistered) {
    cleanupRegistered = true;
    document.addEventListener('click', (e) => {
      if (!isOpen) return;
      const target = e.target as HTMLElement;
      if (target.closest('[class*="sessionRow"], [class*="projectRow"], [class*="searchResultRow"], [class*="searchResultWorkspace"], [class*="newSession"]')) {
        setWorkbenchOpen(false);
      }
    }, true);
  }

  console.log('[dsh-tech-workbench] 侧边栏入口已注入（完全参考 personal-workbench 实现）');
}

/**
 * 完整清理
 */
export function cleanupSidebarIntegration(): void {
  setWorkbenchOpen(false);

  sidebarObserver?.disconnect();
  activeObserver?.disconnect();
  sidebarObserver = null;
  activeObserver = null;

  entryEl?.remove();
  viewEl?.remove();
  entryEl = null;
  viewEl = null;
  reactRoot = null;

  document.getElementById('dsh-tech-workbench-styles')?.remove();
  cleanupRegistered = false;

  console.log('[dsh-tech-workbench] 侧边栏集成已清理');
}

/**
 * 导出显隐控制供外部使用
 */
export { setWorkbenchOpen, toggleWorkbench };
