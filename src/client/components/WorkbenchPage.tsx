/**
 * DSH 科技风工作台 - 工作台主页面组件
 * 整合：操作栏、资源卡片网格、分页、空状态、加载状态
 * 支持：搜索、状态筛选、排序、分页
 * v2.1: 集成插件生命周期管理（安装/卸载/启用/停用/更新/回退）
 */
import { useMemo, useState, useEffect } from 'react';
import type { StandardResource, ResourceType, FilterStatus, SortField, SortOrder, PendingAction, ActionFeedback } from '../types';
import { ResourceCard } from './ResourceCard';
import { ActionBar } from './ActionBar';
import { Pagination } from './Pagination';
import { EmptyState, LoadingState } from './EmptyState';
import { InstallForm } from './InstallForm';
import { PluginActionDialog } from './PluginActionDialog';
import { ActionFeedback as ActionFeedbackComponent } from './ActionFeedback';
import { PresetManageSection, SkillManageSection } from './LocalManage';

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

/** API 调用：安装插件 */
async function apiInstall(source: string): Promise<{ ok: boolean; message: string }> {
  try {
    const resp = await fetch('/workbench/api/plugin/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source }),
    });
    const data = await resp.json();
    if (data.ok) return { ok: true, message: `安装成功！请重启 DSH 生效。` };
    return { ok: false, message: data.errorMessage || '安装失败' };
  } catch (err: any) {
    return { ok: false, message: `网络错误: ${err.message}` };
  }
}

/** API 调用：卸载插件 */
async function apiUninstall(id: string): Promise<{ ok: boolean; message: string }> {
  try {
    const resp = await fetch(`/workbench/api/plugin/uninstall/${id}`, { method: 'DELETE' });
    const data = await resp.json();
    if (data.ok) return { ok: true, message: `插件 ${id} 已卸载` };
    return { ok: false, message: data.errorMessage || '卸载失败' };
  } catch (err: any) {
    return { ok: false, message: `网络错误: ${err.message}` };
  }
}

/** API 调用：启用/停用插件 */
async function apiToggle(id: string, enable: boolean): Promise<{ ok: boolean; message: string }> {
  try {
    const resp = await fetch(`/workbench/api/plugin/${enable ? 'enable' : 'disable'}/${id}`, { method: 'POST' });
    const data = await resp.json();
    if (data.ok) return { ok: true, message: `已${enable ? '启用' : '停用'}插件 ${id}` };
    return { ok: false, message: data.errorMessage || '操作失败' };
  } catch (err: any) {
    return { ok: false, message: `网络错误: ${err.message}` };
  }
}

/** API 调用：更新插件（可指定目标版本，缺省 latest） */
async function apiUpdate(id: string, targetVersion?: string): Promise<{ ok: boolean; message: string }> {
  try {
    const resp = await fetch(`/workbench/api/plugin/update/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: targetVersion || '' }),
    });
    const data = await resp.json();
    if (data.ok) return { ok: true, message: `插件 ${id} 已更新到 v${data.data?.version || targetVersion || '最新'}` };
    return { ok: false, message: data.errorMessage || '更新失败' };
  } catch (err: any) {
    return { ok: false, message: `网络错误: ${err.message}` };
  }
}

/** API 调用：回退插件 */
async function apiRollback(id: string, version: string): Promise<{ ok: boolean; message: string }> {
  try {
    const resp = await fetch(`/workbench/api/plugin/rollback/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version }),
    });
    const data = await resp.json();
    if (data.ok) return { ok: true, message: `已回退到 v${data.data?.version || version}` };
    return { ok: false, message: data.errorMessage || '回退失败' };
  } catch (err: any) {
    return { ok: false, message: `网络错误: ${err.message}` };
  }
}

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

  // 生命周期管理状态
  const [showInstallForm, setShowInstallForm] = useState(false);
  const [installSource, setInstallSource] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'update' | 'rollback' | 'uninstall';
    pluginId: string;
    fromVersion?: string;
    toVersion?: string;
  }>({ open: false, action: 'uninstall', pluginId: '' });
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);
  const [installError, setInstallError] = useState<string | null>(null);

  // 搜索/筛选变化时重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, selectedCategory, sortField, sortOrder]);

  // 自动消失反馈
  useEffect(() => {
    if (feedback && feedback.ok && feedback.autoDismissMs > 0) {
      const timer = setTimeout(() => setFeedback(null), feedback.autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

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
    if (selectedCategory !== 'all') {
      result = result.filter((r) => r.category === selectedCategory);
    }
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
    switch (filterStatus) {
      case 'installed': result = result.filter((r) => r.isInstalled); break;
      case 'not-installed': result = result.filter((r) => !r.isInstalled); break;
      case 'updatable': result = result.filter((r) => r.updateAvailable); break;
      case 'official': result = result.filter((r) => r.isOfficial); break;
      case 'community': result = result.filter((r) => !r.isOfficial); break;
    }
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'star': cmp = a.star - b.star; break;
        case 'updateTime': cmp = a.updateTime - b.updateTime; break;
        case 'version': cmp = compareVersionStr(a.latestVersion, b.latestVersion); break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [resources, searchQuery, filterStatus, selectedCategory, sortField, sortOrder]);

  const totalPages = Math.ceil(processedResources.length / PAGE_SIZE);
  const pagedResources = processedResources.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  // ===== 生命周期操作回调 =====
  // 数据层 installCmd 是完整命令串（"dsh plugin --profile web add <src>"），
  // 预填必须提取 add 之后的裸来源；提取失败退回 homepage（host 端也会兜底清洗）
  const installSourceFor = (resource?: StandardResource): string => {
    if (!resource) return '';
    const m = (resource.installCmd || '').match(/\badd\s+(\S+)\s*$/);
    if (m) return m[1];
    return resource.homepage || resource.installCmd || '';
  };

  const handleInstall = (resource?: StandardResource) => {
    // 打开安装表单弹窗；从资源卡片进入时预填来源
    setInstallError(null);
    setInstallSource(installSourceFor(resource));
    setShowInstallForm(true);
  };

  const handleInstallSubmit = async (source: string) => {
    setPendingAction({ pluginId: source, action: 'install', startedAt: Date.now() });
    const result = await apiInstall(source);
    setPendingAction(null);
    setShowInstallForm(false);
    setFeedback({
      pluginId: source,
      action: 'install',
      ok: result.ok,
      message: result.message,
      autoDismissMs: result.ok ? 5000 : 0,
    });
    // 安装改变了 profile package.json / node_modules：强制刷新让「已安装」状态落卡
    if (result.ok) await onRefresh();
  };

  const handleUninstall = (resource: StandardResource) => {
    setConfirmDialog({ open: true, action: 'uninstall', pluginId: resource.id, fromVersion: resource.latestVersion });
  };

  const handleToggleEnable = async (resource: StandardResource) => {
    setPendingAction({ pluginId: resource.id, action: resource.isEnabled ? 'disable' : 'enable', startedAt: Date.now() });
    const result = await apiToggle(resource.id, !resource.isEnabled);
    setPendingAction(null);
    setFeedback({
      pluginId: resource.id,
      action: resource.isEnabled ? 'disable' : 'enable',
      ok: result.ok,
      message: result.message,
      autoDismissMs: result.ok ? 3000 : 0,
    });
    // 启停走 patch 托管区块热生效：刷新拉回新的 enabled 状态
    if (result.ok) await onRefresh();
  };

  const handleUpdate = (resource: StandardResource) => {
    // from=本地已装版本，to=最新可得版本（此前两者都取 latestVersion，显示必然相同）
    setConfirmDialog({
      open: true,
      action: 'update',
      pluginId: resource.id,
      fromVersion: resource.localVersion || resource.latestVersion,
      toVersion: resource.latestVersion,
    });
  };

  const handleConfirmAction = async () => {
    const { action, pluginId, toVersion } = confirmDialog;
    setConfirmDialog({ ...confirmDialog, open: false });
    setPendingAction({ pluginId, action, startedAt: Date.now() });
    let result: { ok: boolean; message: string };
    switch (action) {
      case 'update': result = await apiUpdate(pluginId, toVersion); break;
      case 'rollback': result = await apiRollback(pluginId, toVersion || ''); break;
      case 'uninstall': result = await apiUninstall(pluginId); break;
      default: result = { ok: false, message: '未知操作' };
    }
    setPendingAction(null);
    setFeedback({ pluginId, action, ok: result.ok, message: result.message, autoDismissMs: result.ok ? 3000 : 0 });
    // 更新/回退/卸载同理：成功后强制刷新列表状态
    if (result.ok) await onRefresh();
  };

  const handleRollback = (resource: StandardResource) => {
    setConfirmDialog({ open: true, action: 'rollback', pluginId: resource.id, toVersion: resource.versions?.[1]?.version || resource.latestVersion });
  };

  return (
    <div className="dshwb-workbench-container">
      {/* 二期：Meta管理本机维护区（预设 / 技能） */}
      {type === 'preset' && <PresetManageSection />}
      {type === 'skill' && <SkillManageSection />}
      {type === 'plugin' && (
        <div style={{
          margin: '0 16px 12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 16px',
          borderRadius: '14px',
          border: '1px solid var(--dsw-alias-border, #e0e0e0)',
          background: 'var(--dsw-alias-bg-primary, #fff)',
        }}>
          <span style={{ fontSize: '13px', color: 'var(--dsw-alias-text-secondary, #86868b)', flex: 1 }}>
            安装/卸载/启停经 dsh plugin 与 cordis.patch.yml 托管区块执行，启停热生效，安装重启后生效
          </span>
          <button
            onClick={() => handleInstall()}
            style={{
              padding: '6px 16px',
              borderRadius: '9999px',
              border: '1.5px solid var(--dsw-accent, #0066cc)',
              background: 'var(--dsw-accent, #0066cc)',
              color: '#fff',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            ＋ 安装插件
          </button>
        </div>
      )}

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
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={processedResources.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />

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

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={processedResources.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {/* 安装表单弹窗 */}
      {showInstallForm && (
        <div className="dshwb-overlay" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--dsw-alias-bg-primary, #fff)', borderRadius: '18px',
            padding: '24px', minWidth: '360px', maxWidth: '480px', width: '90%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }}>
            <h3 style={{
              margin: '0 0 16px', color: 'var(--dsw-alias-text-primary, #1d1d1f)',
              fontSize: '18px', fontWeight: 600,
            }}>
              安装插件
            </h3>
            <InstallForm
              initialSource={installSource}
              onSubmit={handleInstallSubmit}
              busy={pendingAction?.action === 'install'}
              errorMessage={installError}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button
                onClick={() => setShowInstallForm(false)}
                className="dshwb-btn dshwb-btn-secondary"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 操作确认弹窗 */}
      <PluginActionDialog
        open={confirmDialog.open}
        action={confirmDialog.action}
        pluginId={confirmDialog.pluginId}
        fromVersion={confirmDialog.fromVersion}
        toVersion={confirmDialog.toVersion}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmDialog({ ...confirmDialog, open: false })}
        busy={pendingAction?.action === confirmDialog.action}
      />

      {/* 操作反馈 */}
      <ActionFeedbackComponent
        feedback={feedback}
        onDismiss={() => setFeedback(null)}
      />
    </div>
  );
}

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
