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
import { useState } from 'react';
import type { StandardResource } from '../types';

interface ResourceCardProps {
  resource: StandardResource;
  onInstall?: (resource: StandardResource) => void;
  onUninstall?: (resource: StandardResource) => void;
  onToggleEnable?: (resource: StandardResource) => void;
  onUpdate?: (resource: StandardResource) => void;
}

/** 根据资源类型获取图标文字（简洁字母图标，Apple 风格） */
function getTypeIcon(type: string): string {
  switch (type) {
    case 'plugin':
      return 'P';
    case 'preset':
      return 'Pr';
    case 'app':
      return 'A';
    case 'skill':
      return 'S';
    default:
      return '?';
  }
}

/** 根据资源类型获取图标背景色（柔和的浅色调，Apple 风格） */
function getTypeIconBg(type: string): string {
  switch (type) {
    case 'plugin':
      return '#e8f0fe'; // 浅蓝
    case 'preset':
      return '#fef3e8'; // 浅橙
    case 'app':
      return '#e8f5e9'; // 浅绿
    case 'skill':
      return '#f3e8fe'; // 浅紫
    default:
      return '#f5f5f7'; // 羊皮纸灰
  }
}

/** 根据资源类型获取图标文字色 */
function getTypeIconColor(type: string): string {
  switch (type) {
    case 'plugin':
      return '#1a73e8'; // 蓝
    case 'preset':
      return '#e8710a'; // 橙
    case 'app':
      return '#188038'; // 绿
    case 'skill':
      return '#8430ce'; // 紫
    default:
      return '#86868b'; // 灰
  }
}

/**
 * 更新日志（卡片就地展开）：首次展开时才请求，成功后不再重复拉取
 * host 路由 GET /workbench/api/plugin/changelog/:id?homepage=
 */
function ChangelogSection({ resource }: { resource: StandardResource }) {
  const [state, setState] = useState<{ loading: boolean; data: any | null }>({ loading: false, data: null });
  const load = async () => {
    if (state.loading || state.data) return;
    setState({ loading: true, data: null });
    try {
      const u = `/workbench/api/plugin/changelog/${encodeURIComponent(resource.id)}?homepage=${encodeURIComponent(resource.homepage || '')}`;
      const r = await (await fetch(u)).json();
      setState({ loading: false, data: r.ok ? r.data : { found: false } });
    } catch {
      setState({ loading: false, data: { found: false } });
    }
  };
  return (
    <details
      className="dshwb-changelog-apple"
      onToggle={(e: any) => {
        if (e.currentTarget.open) load();
      }}
    >
      <summary className="dshwb-changelog-summary-apple">更新日志</summary>
      {state.loading && <div className="dshwb-changelog-hint-apple">正在加载…</div>}
      {state.data && state.data.found && (
        <>
          <div className="dshwb-changelog-hint-apple">
            {state.data.source === 'local' ? `本地包 · ${state.data.path}` : 'GitHub 仓库'}
          </div>
          <pre className="dshwb-changelog-body-apple">{state.data.content}</pre>
        </>
      )}
      {state.data && !state.data.found && !state.loading && (
        <div className="dshwb-changelog-hint-apple">未找到 CHANGELOG（可到源站仓库查看发布说明）</div>
      )}
    </details>
  );
}

export function ResourceCard({
  resource,
  onInstall,
  onUninstall,
  onToggleEnable,
  onUpdate,
}: ResourceCardProps) {
  const [showInstallCmd, setShowInstallCmd] = useState(false);

  const formatDate = (timestamp: number): string => {
    if (!timestamp) return '未知';
    const d = new Date(timestamp);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const formatStar = (star: number): string => {
    if (star >= 10000) return `${(star / 10000).toFixed(1)}w`;
    if (star >= 1000) return `${(star / 1000).toFixed(1)}k`;
    return `${star}`;
  };

  const copyInstallCmd = () => {
    if (resource.installCmd && navigator.clipboard) {
      navigator.clipboard.writeText(resource.installCmd);
    }
    setShowInstallCmd(true);
    setTimeout(() => setShowInstallCmd(false), 2000);
  };

  const resolveSourceUrl = (): string => {
    // 优先使用 homepage 字段；无效时按包名智能生成源站链接
    let url = resource.homepage;
    if (!url || !url.startsWith('http')) {
      const name = resource.name || '';
      if (name.startsWith('@')) {
        url = `https://www.npmjs.com/package/${encodeURIComponent(name)}`;
      } else if (name.includes('/') && !name.includes(' ')) {
        url = `https://github.com/${name}`;
      } else {
        url = `https://www.npmjs.com/search?q=${encodeURIComponent(name)}`;
      }
    }
    return url;
  };

  return (
    <div className="dshwb-resource-card-apple">
      {/* 卡片头部：图标 + 标题 + 状态 */}
      <div className="dshwb-card-header-apple">
        <div
          className="dshwb-card-icon-apple"
          style={{
            background: getTypeIconBg(resource.type),
            color: getTypeIconColor(resource.type),
          }}
        >
          {getTypeIcon(resource.type)}
        </div>
        <div className="dshwb-card-title-group-apple">
          <h3 className="dshwb-card-name-apple" title={resource.name}>
            {resource.name}
          </h3>
          <div className="dshwb-card-badges-apple">
            {resource.category && (
              <span className="dshwb-badge-apple dshwb-badge-category-apple">
                {resource.category}
              </span>
            )}
            {resource.isOfficial ? (
              <a
                className="dshwb-badge-apple dshwb-badge-official-apple dshwb-badge-link-apple"
                href={resolveSourceUrl()}
                target="_blank"
                rel="noopener noreferrer"
                title="访问源站"
              >
                官方
              </a>
            ) : (
              <a
                className="dshwb-badge-apple dshwb-badge-community-apple dshwb-badge-link-apple"
                href={resolveSourceUrl()}
                target="_blank"
                rel="noopener noreferrer"
                title="访问源站"
              >
                社区
              </a>
            )}
          </div>
        </div>
        <div className="dshwb-card-status-apple">
          {resource.isInstalled && (
            <span className="dshwb-status-dot-apple dshwb-status-installed-apple" title="已安装" />
          )}
          {resource.updateAvailable && (
            <span className="dshwb-status-dot-apple dshwb-status-update-apple" title="可更新" />
          )}
        </div>
      </div>

      {/* 卡片描述 */}
      <p className="dshwb-card-desc-apple" title={resource.description}>
        {resource.description || '暂无描述'}
      </p>

      {/* 状态标签行 */}
      <div className="dshwb-card-tags-apple">
        {resource.isInstalled && (
          <span className="dshwb-tag-apple dshwb-tag-installed-apple">已安装</span>
        )}
        {resource.updateAvailable && (
          <span className="dshwb-tag-apple dshwb-tag-update-apple">可更新</span>
        )}
        {!resource.isInstalled && !resource.updateAvailable && (
          <span className="dshwb-tag-apple dshwb-tag-available-apple">可安装</span>
        )}
      </div>

      {/* 元信息（简洁文字，Apple 风格） */}
      <div className="dshwb-card-meta-apple">
        <span className="dshwb-meta-item-apple">
          <span className="dshwb-meta-label-apple">版本</span>
          <span className="dshwb-meta-value-apple">v{resource.latestVersion}</span>
        </span>
        <span className="dshwb-meta-divider-apple">·</span>
        <span className="dshwb-meta-item-apple">
          <span className="dshwb-meta-label-apple">Star</span>
          <span className="dshwb-meta-value-apple">{formatStar(resource.star)}</span>
        </span>
        <span className="dshwb-meta-divider-apple">·</span>
        <span className="dshwb-meta-item-apple">
          <span className="dshwb-meta-label-apple">更新</span>
          <span className="dshwb-meta-value-apple">{formatDate(resource.updateTime)}</span>
        </span>
        {resource.author && (
          <>
            <span className="dshwb-meta-divider-apple">·</span>
            <span className="dshwb-meta-item-apple">
              <span className="dshwb-meta-label-apple">作者</span>
              <span className="dshwb-meta-value-apple dshwb-meta-author-apple">{resource.author}</span>
            </span>
          </>
        )}
      </div>

      {/* 二期：插件卡片就地展开更新日志 */}
      {resource.type === 'plugin' && <ChangelogSection resource={resource} />}

      {/* 底部操作按钮（Apple 胶囊按钮风格） */}
      <div className="dshwb-card-actions-apple">
        {!resource.isInstalled ? (
          <>
            <button
              className="dshwb-btn-apple dshwb-btn-primary-apple"
              onClick={() => onInstall?.(resource)}
              title="安装"
            >
              安装
            </button>
            <button
              className="dshwb-btn-apple dshwb-btn-secondary-apple"
              onClick={copyInstallCmd}
              title="复制安装命令"
            >
              {showInstallCmd ? '已复制' : '复制命令'}
            </button>
          </>
        ) : (
          <>
            {resource.updateAvailable && (
              <button
                className="dshwb-btn-apple dshwb-btn-primary-apple"
                onClick={() => onUpdate?.(resource)}
                title="更新到最新版本"
              >
                更新
              </button>
            )}
            <button
              className="dshwb-btn-apple dshwb-btn-secondary-apple"
              onClick={() => onToggleEnable?.(resource)}
              title={resource.isEnabled ? '点击禁用' : '点击启用'}
            >
              {resource.isEnabled ? '禁用' : '启用'}
            </button>
            <button
              className="dshwb-btn-apple dshwb-btn-danger-apple"
              onClick={() => onUninstall?.(resource)}
              title="卸载"
            >
              卸载
            </button>
          </>
        )}
      </div>

      {/* 安装命令展示（展开） */}
      {showInstallCmd && resource.installCmd && (
        <div className="dshwb-install-cmd-apple">
          <code>{resource.installCmd}</code>
        </div>
      )}
    </div>
  );
}
