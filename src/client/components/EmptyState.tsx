/**
 * DSH 科技风工作台 - 空状态与加载状态组件
 */

interface EmptyStateProps {
  type: 'empty' | 'no-result' | 'error';
  title?: string;
  description?: string;
  onAction?: () => void;
  actionText?: string;
}

export function EmptyState({ type, title, description, onAction, actionText }: EmptyStateProps) {
  const configs = {
    empty: {
      icon: '📦',
      defaultTitle: '暂无资源',
      defaultDesc: '当前分类下还没有可用资源，点击刷新尝试重新加载',
      defaultAction: '刷新数据',
    },
    'no-result': {
      icon: '🔍',
      defaultTitle: '没有找到匹配的资源',
      defaultDesc: '尝试调整搜索关键词或筛选条件',
      defaultAction: '清除筛选',
    },
    error: {
      icon: '⚠️',
      defaultTitle: '加载失败',
      defaultDesc: '数据加载出现异常，请检查网络连接后重试',
      defaultAction: '重新加载',
    },
  };

  const config = configs[type];

  return (
    <div className="dshwb-workbench-empty">
      <div className="dshwb-workbench-empty-icon">{config.icon}</div>
      <div className="dshwb-workbench-empty-text">{title || config.defaultTitle}</div>
      <div className="dshwb-workbench-empty-hint">{description || config.defaultDesc}</div>
      {onAction && (
        <button
          className="dshwb-btn-primary"
          style={{ marginTop: '16px', padding: '8px 20px' }}
          onClick={onAction}
        >
          {actionText || config.defaultAction}
        </button>
      )}
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="dshwb-loading">
      <div className="dshwb-loading-spinner"></div>
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>正在加载资源数据...</div>
      <div style={{ fontSize: '11px', color: 'var(--text-placeholder)', marginTop: '8px' }}>
        双源数据同步中（Market + GitHub），首次加载可能需要几秒
      </div>
    </div>
  );
}
