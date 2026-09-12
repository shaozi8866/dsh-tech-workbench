/**
 * DSH 科技风工作台 - 操作栏组件（Apple 设计风格）
 * 包含：页面标题、搜索框、筛选下拉、排序、刷新按钮
 *
 * 设计特点：
 *   - Apple 风格：大圆角、胶囊按钮、极柔和阴影、充足留白
 *   - 配色从皮肤 CSS 变量取（--dsw-alias-*），皮肤切换自动适配
 *   - 操作栏分两行布局，不拥挤
 */
import type { FilterStatus, SortField, SortOrder } from '../types';

interface ActionBarProps {
  title: string;
  total: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterStatus: FilterStatus;
  onFilterChange: (value: FilterStatus) => void;
  sortField: SortField;
  onSortFieldChange: (value: SortField) => void;
  sortOrder: SortOrder;
  onSortOrderChange: (value: SortOrder) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  fromCache: boolean;
}

export function ActionBar({
  title,
  total,
  searchQuery,
  onSearchChange,
  filterStatus,
  onFilterChange,
  sortField,
  onSortFieldChange,
  sortOrder,
  onSortOrderChange,
  onRefresh,
  isRefreshing,
  fromCache,
}: ActionBarProps) {
  return (
    <div className="dshwb-action-bar-apple">
      {/* 第一行：标题 + 统计 */}
      <div className="dshwb-action-bar-row dshwb-action-bar-header">
        <div className="dshwb-action-bar-title-group">
          <h2 className="dshwb-page-title-apple">{title}</h2>
          <span className="dshwb-count-badge-apple">
            共 {total} 个
          </span>
          {fromCache && (
            <span className="dshwb-cache-badge-apple">
              缓存数据
            </span>
          )}
        </div>
      </div>

      {/* 第二行：搜索 + 筛选 + 排序 + 刷新 */}
      <div className="dshwb-action-bar-row dshwb-action-bar-controls">
        {/* 搜索框 */}
        <div className="dshwb-search-box-apple">
          <span className="dshwb-search-icon-apple">🔍</span>
          <input
            type="text"
            placeholder="搜索资源名称、描述..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="dshwb-search-input-apple"
          />
        </div>

        {/* 状态筛选 */}
        <select
          className="dshwb-select-apple"
          value={filterStatus}
          onChange={(e) => onFilterChange(e.target.value as FilterStatus)}
        >
          <option value="all">全部状态</option>
          <option value="installed">已安装</option>
          <option value="not-installed">未安装</option>
          <option value="updatable">可更新</option>
          <option value="official">官方</option>
          <option value="community">社区</option>
        </select>

        {/* 排序字段 */}
        <select
          className="dshwb-select-apple"
          value={sortField}
          onChange={(e) => onSortFieldChange(e.target.value as SortField)}
        >
          <option value="name">按名称</option>
          <option value="star">按热度</option>
          <option value="updateTime">按更新时间</option>
          <option value="version">按版本</option>
        </select>

        {/* 排序方向 */}
        <button
          className="dshwb-btn-apple dshwb-btn-secondary-apple"
          onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
          title={sortOrder === 'asc' ? '升序' : '降序'}
        >
          {sortOrder === 'asc' ? '↑ 升序' : '↓ 降序'}
        </button>

        {/* 刷新按钮 */}
        <button
          className="dshwb-btn-apple dshwb-btn-primary-apple"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? '刷新中...' : '🔄 刷新'}
        </button>
      </div>
    </div>
  );
}
