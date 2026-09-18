/**
 * dsh-tech-workbench 插件生命周期管理 - 版本时间线
 * SPEC v8.3 - VersionTimeline
 */
import type { VersionSnapshot } from '../types';

interface VersionTimelineProps {
  versions: VersionSnapshot[];
  currentVersion: string;
  onSelect: (version: string) => void;
  selected: string | null;
}

export function VersionTimeline({
  versions,
  currentVersion,
  onSelect,
  selected,
}: VersionTimelineProps) {
  return (
    <div className="dshwb-version-timeline" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      padding: '12px',
    }}>
      {versions.map((snap) => {
        const isCurrent = snap.version === currentVersion;
        const isSelected = snap.version === selected;
        return (
          <div
            key={snap.version}
            onClick={() => onSelect(snap.version)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              borderRadius: '12px',
              cursor: 'pointer',
              border: '1.5px solid',
              borderColor: isSelected
                ? 'var(--dsw-accent, #0066cc)'
                : 'var(--dsw-alias-border, #e0e0e0)',
              background: isSelected
                ? 'var(--dsw-alias-accent-bg, #e8f0fe)'
                : 'var(--dsw-alias-bg-secondary, #f5f5f7)',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: isCurrent
                ? 'var(--dsw-accent, #0066cc)'
                : 'var(--dsw-alias-text-tertiary, #c7c7cc)',
              flexShrink: 0,
            }} />
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '14px',
                fontWeight: isCurrent ? 600 : 400,
                color: 'var(--dsw-alias-text-primary, #1d1d1f)',
              }}>
                {snap.version}
                {isCurrent && (
                  <span style={{
                    marginLeft: '8px',
                    fontSize: '11px',
                    color: 'var(--dsw-accent, #0066cc)',
                  }}>
                    当前
                  </span>
                )}
              </div>
              <div style={{
                fontSize: '12px',
                color: 'var(--dsw-alias-text-secondary, #86868b)',
                marginTop: '2px',
              }}>
                {new Date(snap.installedAt).toLocaleDateString('zh-CN')}
                {snap.backedUp ? ' · 已备份' : ' · 未备份'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

