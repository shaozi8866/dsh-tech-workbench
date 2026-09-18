/**
 * dsh-tech-workbench 插件生命周期管理 - 操作确认弹窗
 * SPEC v8.2 - PluginActionDialog
 */
import type { PluginActionDialogProps } from '../types';

export function PluginActionDialog({
  open,
  action,
  pluginId,
  fromVersion,
  toVersion,
  onConfirm,
  onCancel,
  busy,
}: PluginActionDialogProps) {
  if (!open) return null;

  const titles: Record<string, string> = {
    update: '更新插件',
    rollback: '回退插件',
    uninstall: '卸载插件',
  };

  const descriptions: Record<string, string> = {
    update: `确定要将插件 "${pluginId}" 从 ${fromVersion} 更新到 ${toVersion} 吗？`,
    rollback: `确定要将插件 "${pluginId}" 回退到 ${toVersion} 吗？`,
    uninstall: `确定要卸载插件 "${pluginId}" 吗？此操作不可恢复。`,
  };

  return (
    <div className="dshwb-overlay" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div className="dshwb-dialog" style={{
        background: 'var(--dsw-alias-bg-primary, #fff)',
        borderRadius: '18px',
        padding: '24px',
        minWidth: '320px',
        maxWidth: '400px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      }}>
        <h3 style={{
          margin: '0 0 12px',
          color: 'var(--dsw-alias-text-primary, #1d1d1f)',
          fontSize: '17px',
          fontWeight: 600,
        }}>
          {titles[action] || '操作确认'}
        </h3>
        <p style={{
          margin: '0 0 20px',
          color: 'var(--dsw-alias-text-secondary, #86868b)',
          fontSize: '14px',
          lineHeight: 1.5,
        }}>
          {descriptions[action] || '确定要执行此操作吗？'}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            disabled={busy}
            className="dshwb-btn dshwb-btn-secondary"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="dshwb-btn dshwb-btn-primary"
          >
            {busy ? '处理中...' : '确认'}
          </button>
        </div>
      </div>
    </div>
  );
}

