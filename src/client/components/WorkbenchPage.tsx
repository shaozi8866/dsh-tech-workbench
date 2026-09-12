/**
 * DSH 科技风工作台 - 工作台主页面组件
 * 整合：操作栏、资源卡片网格、分页、空状态、加载状态
 * 支持：搜索、状态筛选、排序、分页
 */
import { useMemo, useState, useEffect } from 'react';
import type { StandardResource, ResourceType, FilterStatus, SortField, SortOrder } from '../types';
import { ResourceCard } from './ResourceCard';
import { ActionBar } from './ActionBar';
import { Pagination } from './Pagination';
import { EmptyState, LoadingState } from './EmptyState';

interface WorkbenchPageProps {
  type: ResourceType;
  resources: StandardResource[];
  loading: boolean;
  fromCache: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const PAGE_SIZE = 12;

const TYPE_TITLES: Record<ResourceType, string> = {
  plugin: '插件管理',
  skill: '技能管理',
  preset: '预设管理',
  app: '应用管理',
};

export function WorkbenchPage({
  type,
  resources,
  loading,
  fromCache,
  onRefresh,
  isRefreshing,
}: WorkbenchPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('star');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // 搜索/筛选变化时重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, selectedCategory, sortField, sortOrder]);

  // 获取所有分类
  const categories = useMemo(() => {
    const cats = new Set<string>();
    resources.forEach((r) => {
      if (r.category) cats.add(r.category);
    });
    return Array.from(cats).sort();
  }, [resources]);

  // 过滤 + 排序 + 分页
  const processedResources = useMemo(() => {
    let result = [...resources];

    // 分类筛选
    if (selectedCategory !== 'all') {
      result = result.filter((r) => r.category === selectedCategory);
    }

    // 搜索过滤
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.author.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q),
      );
    }

    // 状态筛选
    switch (filterStatus) {
      case 'installed':
        result = result.filter((r) => r.isInstalled);
        break;
      case 'not-installed':
        result = result.filter((r) => !r.isInstalled);
        break;
      case 'updatable':
        result = result.filter((r) => r.updateAvailable);
        break;
      case 'official':
        result = result.filter((r) => r.isOfficial);
        break;
      case 'community':
        result = result.filter((r) => !r.isOfficial);
        break;
    }

    // 排序
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'star':
          cmp = a.star - b.star;
          break;
        case 'updateTime':
          cmp = a.updateTime - b.updateTime;
          break;
        case 'version':
          cmp = compareVersionStr(a.latestVersion, b.latestVersion);
          break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [resources, searchQuery, filterStatus, selectedCategory, sortField, sortOrder]);

  // 分页
  const totalPages = Math.ceil(processedResources.length / PAGE_SIZE);
  const pagedResources = processedResources.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  // 操作回调（演示用，实际可调用Host接口）
  const handleInstall = (resource: StandardResource) => {
    console.log('[Workbench] 安装资源:', resource.id, resource.installCmd);
    // 实际实现中调用 Host 接口执行安装
    alert(`安装命令已复制：${resource.installCmd}\n\n请在终端执行此命令完成安装。`);
  };

  const handleUninstall = (resource: StandardResource) => {
    console.log('[Workbench] 卸载资源:', resource.id);
    if (confirm(`确定要卸载 ${resource.name} 吗？`)) {
      // 实际实现中调用 Host 接口执行卸载
      alert('卸载操作已记录，请重启 DSH 生效。');
    }
  };

  const handleToggleEnable = (resource: StandardResource) => {
    console.log('[Workbench] 切换启用状态:', resource.id, !resource.isEnabled);
    // 实际实现中调用 Host 接口切换状态
  };

  const handleUpdate = (resource: StandardResource) => {
    console.log('[Workbench] 更新资源:', resource.id);
    alert(`更新 ${resource.name} 到 v${resource.latestVersion}\n\n请执行：${resource.installCmd}`);
  };

  return (
    <div className="dshwb-workbench-container">
      {/* 操作栏 */}
      <ActionBar
        title={TYPE_TITLES[type]}
        total={processedResources.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterStatus={filterStatus}
        onFilterChange={setFilterStatus}
        sortField={sortField}
        onSortFieldChange={setSortField}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
        fromCache={fromCache}
      />

      {/* 分类筛选标签 */}
      {categories.length > 0 && (
        <div className="dshwb-category-filter">
          <button
            className={`dshwb-category-chip ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            全部分类
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`dshwb-category-chip ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* 内容区 */}
      {loading ? (
        <LoadingState />
      ) : pagedResources.length === 0 ? (
        <EmptyState
          type={resources.length === 0 ? 'empty' : 'no-result'}
          onAction={resources.length === 0 ? onRefresh : () => {
            setSearchQuery('');
            setFilterStatus('all');
          }}
        />
      ) : (
        <>
          {/* 顶部分页 */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={processedResources.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />

          {/* 资源卡片网格 */}
          <div className="dshwb-workbench-resource-grid">
            {pagedResources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                onInstall={handleInstall}
                onUninstall={handleUninstall}
                onToggleEnable={handleToggleEnable}
                onUpdate={handleUpdate}
              />
            ))}
          </div>

          {/* 底部分页 */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={processedResources.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
}

/**
 * 版本字符串比较（简化版）
 */
function compareVersionStr(a: string, b: string): number {
  const parse = (v: string): number[] => {
    const cleaned = v.replace(/^[vV]/, '').trim();
    const parts = cleaned.split('.').map((p) => parseInt(p, 10) || 0);
    while (parts.length < 3) parts.push(0);
    return parts.slice(0, 3);
  };
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}
