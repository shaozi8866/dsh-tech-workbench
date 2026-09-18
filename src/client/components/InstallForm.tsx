/**
 * dsh-tech-workbench 插件生命周期管理 - 安装输入表单
 * SPEC v8.4 - InstallForm
 */
import { useState } from 'react';

interface InstallFormProps {
  onSubmit: (source: string) => void;
  busy: boolean;
  errorMessage: string | null;
  /** 从资源卡片进入时预填的来源（installCmd / homepage） */
  initialSource?: string;
}

export function InstallForm({ onSubmit, busy, errorMessage, initialSource = '' }: InstallFormProps) {
  const [source, setSource] = useState(initialSource);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (source.trim()) {
      onSubmit(source.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="dshwb-install-form" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      padding: '16px',
    }}>
      <div style={{
        fontSize: '14px',
        color: 'var(--dsw-alias-text-secondary, #86868b)',
      }}>
        输入插件来源（GitHub 仓库地址或 npm 包名）
      </div>
      <input
        type="text"
        value={source}
        onChange={(e) => setSource(e.target.value)}
        placeholder="例如: https://github.com/owner/repo"
        disabled={busy}
        style={{
          padding: '10px 14px',
          borderRadius: '10px',
          border: '1.5px solid var(--dsw-alias-border, #e0e0e0)',
          background: 'var(--dsw-alias-bg-primary, #fff)',
          color: 'var(--dsw-alias-text-primary, #1d1d1f)',
          fontSize: '14px',
          outline: 'none',
        }}
      />
      {errorMessage && (
        <div style={{
          fontSize: '13px',
          color: 'var(--dsw-danger, #ff3b30)',
          padding: '8px 12px',
          borderRadius: '8px',
          background: 'var(--dsw-alias-danger-bg, #fff2f2)',
        }}>
          {errorMessage}
        </div>
      )}
      <button
        type="submit"
        disabled={busy || !source.trim()}
        className="dshwb-btn dshwb-btn-primary"
        style={{ alignSelf: 'flex-end' }}
      >
        {busy ? '安装中...' : '安装'}
      </button>
    </form>
  );
}

