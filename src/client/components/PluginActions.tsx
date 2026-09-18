/**
 * dsh-tech-workbench 插件生命周期管理 - 插件操作按钮组
 * SPEC v8.1 ActionBar 按钮渲染规则
 */
import type { PluginItem, PendingAction } from '../types';

interface PluginActionsProps {
  plugin: PluginItem;
  pending: PendingAction | null;
  onAction: (
    action: PendingAction['action'],
    pluginId: string,
    payload?: { version?: string }
  ) => void;
}

export function PluginActions({ plugin, pending, onAction }: PluginActionsProps) {
  const isPending = pending?.pluginId === plugin.id;
  const isTransient = ['installing', 'uninstalling', 'updating', 'rolling_back', 'error'].includes(plugin.lifecycleState);

  /** 按钮基础样式 */
  const btnStyle: React.CSSProperties = {
    padding: '6px 14px',
    borderRadius: '9999px',
    border: '1.5px solid transparent',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    background: 'var(--dsw-alias-bg-secondary, #f5f5f7)',
    color: 'var(--dsw-alias-text-primary, #1d1d1f)',
  };

  const disabledBtnStyle: React.CSSProperties = {
    ...btnStyle,
    opacity: 0.4,
    cursor: 'not-allowed',
  };

  const primaryBtnStyle: React.CSSProperties = {
    ...btnStyle,
    background: 'var(--dsw-accent, #0066cc)',
    color: '#fff',
    borderColor: 'var(--dsw-accent, #0066cc)',
  };

  /** 渲染按钮 */
  const renderButtons = () => {
    const buttons: React.ReactNode[] = [];

    switch (plugin.lifecycleState) {
      case 'discovered':
        buttons.push(
          <button
            key="install"
            style={isPending ? disabledBtnStyle : primaryBtnStyle}
            disabled={isPending}
            onClick={() => onAction('install', plugin.id)}
          >
            {isPending && pending?.action === 'install' ? '安装中...' : '安装'}
          </button>
        );
        break;

      case 'installed':
      case 'disabled': {
        const isEnabled = plugin.lifecycleState === 'installed';
        // 启用/停用按钮
        if (!plugin.protected) {
          buttons.push(
            <button
              key="toggle"
              style={isPending ? disabledBtnStyle : btnStyle}
              disabled={isPending || isTransient}
              onClick={() => onAction(isEnabled ? 'disable' : 'enable', plugin.id)}
            >
              {isPending && pending?.action === (isEnabled ? 'disable' : 'enable')
                ? '处理中...'
                : isEnabled ? '停用' : '启用'}
            </button>
          );
        }

        // 更新按钮
        buttons.push(
          <button
            key="update"
            style={
              isPending || !plugin.updateAvailable
                ? disabledBtnStyle
                : { ...primaryBtnStyle, opacity: plugin.updateAvailable ? 1 : 0.5 }
            }
            disabled={isPending || isTransient || !plugin.updateAvailable}
            onClick={() => onAction('update', plugin.id)}
          >
            {isPending && pending?.action === 'update' ? '更新中...' : '更新'}
          </button>
        );

        // 卸载按钮
        if (!plugin.protected) {
          buttons.push(
            <button
              key="uninstall"
              style={isPending ? disabledBtnStyle : btnStyle}
              disabled={isPending || isTransient}
              onClick={() => onAction('uninstall', plugin.id)}
            >
              {isPending && pending?.action === 'uninstall' ? '卸载中...' : '卸载'}
            </button>
          );
        }

        // 回退按钮
        if (plugin.versions.length > 1 && !plugin.protected) {
          buttons.push(
            <button
              key="rollback"
              style={isPending ? disabledBtnStyle : btnStyle}
              disabled={isPending || isTransient}
              onClick={() => onAction('rollback', plugin.id)}
            >
              回退
            </button>
          );
        }

        // 受保护插件的禁用按钮 tooltip
        if (plugin.protected) {
          buttons.push(
            <span
              key="protected-tooltip"
              style={{
                fontSize: '12px',
                color: 'var(--dsw-alias-text-tertiary, #c7c7cc)',
                padding: '4px 8px',
              }}
            >
              受保护
            </span>
          );
        }
        break;
      }

      default:
        // 瞬态：全部禁用 + spinner
        if (isTransient) {
          buttons.push(
            <span
              key="spinner"
              style={{
                fontSize: '13px',
                color: 'var(--dsw-alias-text-secondary, #86868b)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span className="dshwb-spinner" style={{
                width: '14px',
                height: '14px',
                border: '2px solid var(--dsw-alias-border, #e0e0e0)',
                borderTopColor: 'var(--dsw-accent, #0066cc)',
                borderRadius: '50%',
                animation: 'dshwb-spin 0.8s linear infinite',
              }} />
              处理中...
            </span>
          );
        }
    }

    return buttons;
  };

  return (
    <div className="dshwb-plugin-actions" style={{
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap',
      alignItems: 'center',
    }}>
      {renderButtons()}
    </div>
  );
}

