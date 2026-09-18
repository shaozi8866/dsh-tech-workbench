/**
 * dsh-tech-workbench 二期 - Meta管理「本机维护」组件
 *
 * - PresetManageSection: 本机预设（agentPresets 名册）维护 — 查看/编辑组合、
 *   复制为新预设、挂载校验、删除（仅 user 预设可写，system 只读）
 * - SkillManageSection: 用户技能根（~/.dsh/skills）维护 — 查看/编辑 SKILL.md、
 *   新建技能、删除
 *
 * 所有写操作走 /workbench/api/{preset|skill}/*，带确认弹窗；
 * system 级对象一律禁用写按钮并给出原因提示。
 */
import { useCallback, useEffect, useState } from 'react';

// ===== 数据形状（与 host preset-cli / skill-cli 对齐） =====

export interface PresetEntry {
  id: string;
  trust: 'system' | 'user';
  path: string;
  name?: string;
  description?: string;
  order?: number;
  broken?: string;
}

export interface SkillEntry {
  name: string;
  displayName: string;
  description: string;
  layout: 'dir' | 'flat';
  entryPath: string;
  editable: boolean;
  sizeBytes: number;
  mtimeMs: number;
  resourceCount: number;
}

interface ApiResp<T = any> {
  ok: boolean;
  data: T | null;
  errorMessage?: string | null;
}

async function apiGet<T>(url: string): Promise<ApiResp<T>> {
  try {
    const resp = await fetch(url);
    return await resp.json();
  } catch (err: any) {
    return { ok: false, data: null, errorMessage: `网络错误: ${err.message}` };
  }
}

async function apiPost<T>(url: string, body?: object): Promise<ApiResp<T>> {
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    return await resp.json();
  } catch (err: any) {
    return { ok: false, data: null, errorMessage: `网络错误: ${err.message}` };
  }
}

// ===== 通用样式（全部 --dsw-alias-* 变量，适配任意主题） =====

const S = {
  section: {
    margin: '0 16px 18px 16px',
    padding: '14px 16px',
    borderRadius: '14px',
    border: '1px solid var(--dsw-alias-border, #e0e0e0)',
    background: 'var(--dsw-alias-bg-primary, #fff)',
  } as React.CSSProperties,
  sectionTitle: {
    margin: '0 0 4px 0',
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--dsw-alias-text-primary, #1d1d1f)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as React.CSSProperties,
  sectionHint: {
    margin: '0 0 12px 0',
    fontSize: '12px',
    color: 'var(--dsw-alias-text-tertiary, #86868b)',
  } as React.CSSProperties,
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '10px 0',
    borderBottom: '1px solid var(--dsw-alias-border-subtle, rgba(0,0,0,0.06))',
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  badge: (tone: 'sys' | 'user' | 'broken' | 'layout'): React.CSSProperties => ({
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '9999px',
    flexShrink: 0,
    background:
      tone === 'sys' ? 'rgba(142,142,147,0.15)'
        : tone === 'broken' ? 'rgba(255,59,48,0.12)'
          : tone === 'layout' ? 'rgba(0,122,255,0.10)'
            : 'rgba(52,199,89,0.15)',
    color:
      tone === 'sys' ? 'var(--dsw-alias-text-secondary, #6d6d72)'
        : tone === 'broken' ? 'var(--dsw-danger, #ff3b30)'
          : tone === 'layout' ? 'var(--dsw-accent, #0066cc)'
            : 'var(--dsw-success, #34c759)',
  }),
  btn: {
    padding: '5px 12px',
    borderRadius: '9999px',
    border: '1.5px solid var(--dsw-alias-border, #e0e0e0)',
    fontSize: '12px',
    cursor: 'pointer',
    background: 'var(--dsw-alias-bg-secondary, #f5f5f7)',
    color: 'var(--dsw-alias-text-primary, #1d1d1f)',
  } as React.CSSProperties,
  btnPrimary: {
    padding: '5px 12px',
    borderRadius: '9999px',
    border: '1.5px solid var(--dsw-accent, #0066cc)',
    fontSize: '12px',
    cursor: 'pointer',
    background: 'var(--dsw-accent, #0066cc)',
    color: '#fff',
  } as React.CSSProperties,
  btnDanger: {
    padding: '5px 12px',
    borderRadius: '9999px',
    border: '1.5px solid var(--dsw-danger, #ff3b30)',
    fontSize: '12px',
    cursor: 'pointer',
    background: 'transparent',
    color: 'var(--dsw-danger, #ff3b30)',
  } as React.CSSProperties,
  btnDisabled: {
    padding: '5px 12px',
    borderRadius: '9999px',
    border: '1.5px solid var(--dsw-alias-border, #e0e0e0)',
    fontSize: '12px',
    cursor: 'not-allowed',
    opacity: 0.4,
    background: 'var(--dsw-alias-bg-secondary, #f5f5f7)',
    color: 'var(--dsw-alias-text-secondary, #86868b)',
  } as React.CSSProperties,
  input: {
    padding: '8px 12px',
    borderRadius: '10px',
    border: '1.5px solid var(--dsw-alias-border, #e0e0e0)',
    background: 'var(--dsw-alias-bg-primary, #fff)',
    color: 'var(--dsw-alias-text-primary, #1d1d1f)',
    fontSize: '13px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
};

// ===== 弹窗外壳 =====

function Modal(props: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={props.onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--dsw-alias-bg-primary, #fff)', borderRadius: '18px',
        padding: '22px', minWidth: '360px', maxWidth: props.wide ? '860px' : '480px',
        width: '92%', maxHeight: '86vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}>
        <h3 style={{
          margin: '0 0 12px', color: 'var(--dsw-alias-text-primary, #1d1d1f)',
          fontSize: '17px', fontWeight: 600, flexShrink: 0,
        }}>
          {props.title}
        </h3>
        <div style={{ overflow: 'auto', flex: 1 }}>{props.children}</div>
      </div>
    </div>
  );
}

/** 代码/Markdown 编辑弹窗 */
function EditorModal(props: {
  title: string;
  initial: string;
  readOnly: boolean;
  onSave?: (content: string) => Promise<ApiResp>;
  onClose: () => void;
  onDone: (msg: string, ok: boolean) => void;
  extraActions?: React.ReactNode;
}) {
  const [text, setText] = useState(props.initial);
  const [saving, setSaving] = useState(false);
  const dirty = text !== props.initial;

  const save = async () => {
    if (!props.onSave) return;
    setSaving(true);
    const resp = await props.onSave(text);
    setSaving(false);
    props.onDone(resp.ok ? '已保存' : resp.errorMessage || '保存失败', !!resp.ok);
    if (resp.ok) props.onClose();
  };

  return (
    <Modal title={props.title} onClose={props.onClose} wide>
      <textarea
        value={text}
        readOnly={props.readOnly}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        style={{
          width: '100%',
          minHeight: '52vh',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          fontSize: '12.5px',
          lineHeight: 1.55,
          padding: '12px 14px',
          borderRadius: '10px',
          border: '1.5px solid var(--dsw-alias-border, #e0e0e0)',
          background: props.readOnly ? 'var(--dsw-alias-bg-secondary, #f7f7f8)' : 'var(--dsw-alias-bg-primary, #fff)',
          color: 'var(--dsw-alias-text-primary, #1d1d1f)',
          resize: 'vertical',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px', alignItems: 'center' }}>
        <div style={{ flex: 1, display: 'flex', gap: '8px' }}>{props.extraActions}</div>
        {props.readOnly ? null : (
          <button style={dirty ? S.btnPrimary : S.btnDisabled} disabled={!dirty || saving} onClick={save}>
            {saving ? '保存中...' : '保存'}
          </button>
        )}
        <button style={S.btn} onClick={props.onClose}>关闭</button>
      </div>
    </Modal>
  );
}

/** 单行文本输入弹窗（复制预设 / 新建技能） */
function PromptModal(props: {
  title: string;
  hint: string;
  fields: Array<{ key: string; label: string; placeholder?: string; required?: boolean }>;
  submitLabel: string;
  busy: boolean;
  onSubmit: (values: Record<string, string>) => Promise<ApiResp>;
  onClose: () => void;
  onDone: (msg: string, ok: boolean) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const missing = props.fields.some((f) => f.required && !(values[f.key] || '').trim());

  const submit = async () => {
    const resp = await props.onSubmit(values);
    props.onDone(resp.ok ? `${props.submitLabel}成功` : resp.errorMessage || `${props.submitLabel}失败`, !!resp.ok);
    if (resp.ok) props.onClose();
  };

  return (
    <Modal title={props.title} onClose={props.onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '4px 0 8px' }}>
        <div style={{ fontSize: '13px', color: 'var(--dsw-alias-text-secondary, #86868b)' }}>{props.hint}</div>
        {props.fields.map((f) => (
          <div key={f.key}>
            <div style={{ fontSize: '12px', marginBottom: '4px', color: 'var(--dsw-alias-text-primary, #1d1d1f)' }}>{f.label}</div>
            <input
              style={S.input}
              placeholder={f.placeholder}
              disabled={props.busy}
              value={values[f.key] || ''}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            />
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
          <button style={S.btn} onClick={props.onClose}>取消</button>
          <button
            style={missing || props.busy ? S.btnDisabled : S.btnPrimary}
            disabled={missing || props.busy}
            onClick={submit}
          >
            {props.busy ? '处理中...' : props.submitLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** 反馈条 */
function Notice(props: { notice: { msg: string; ok: boolean } | null; onDismiss: () => void }) {
  if (!props.notice) return null;
  return (
    <div style={{
      margin: '0 16px 10px 16px',
      padding: '8px 14px',
      borderRadius: '10px',
      fontSize: '13px',
      background: props.notice.ok ? 'rgba(52,199,89,0.12)' : 'rgba(255,59,48,0.12)',
      color: props.notice.ok ? 'var(--dsw-success, #248a3d)' : 'var(--dsw-danger, #ff3b30)',
      cursor: 'pointer',
    }} onClick={props.onDismiss}>
      {props.notice.msg}
    </div>
  );
}

function useNotice() {
  const [notice, setNotice] = useState<{ msg: string; ok: boolean } | null>(null);
  const show = useCallback((msg: string, okFlag = true) => {
    setNotice({ msg, ok: okFlag });
    if (okFlag) setTimeout(() => setNotice(null), 4000);
  }, []);
  return { notice, show, dismiss: () => setNotice(null) };
}

// ==============================================
// 预设维护
// ==============================================

export function PresetManageSection() {
  const [presets, setPresets] = useState<PresetEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ id: string; content: string; readOnly: boolean } | null>(null);
  const [copyFrom, setCopyFrom] = useState<PresetEntry | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { notice, show, dismiss } = useNotice();

  const load = useCallback(async () => {
    const resp = await apiGet<PresetEntry[]>('/workbench/api/preset/list');
    if (resp.ok) { setPresets(resp.data || []); setError(null); }
    else { setError(resp.errorMessage || '读取预设名册失败'); setPresets([]); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openComposition = async (p: PresetEntry) => {
    setBusyId(p.id);
    const resp = await apiGet<{ content: string; trust: string }>(`/workbench/api/preset/composition/${encodeURIComponent(p.id)}`);
    setBusyId(null);
    if (!resp.ok || !resp.data) { show(resp.errorMessage || '读取组合失败', false); return; }
    setEditor({ id: p.id, content: resp.data.content, readOnly: p.trust !== 'user' });
  };

  const doValidate = async (p: PresetEntry) => {
    setBusyId(p.id);
    const resp = await apiPost(`/workbench/api/preset/validate`, { id: p.id });
    setBusyId(null);
    show(resp.ok ? `预设 ${p.id} 挂载校验通过 ✓` : `挂载校验失败: ${resp.errorMessage}`, resp.ok);
  };

  const doDelete = async (p: PresetEntry) => {
    if (!window.confirm(`确认删除用户预设 ${p.id}？该操作不可撤销。`)) return;
    setBusyId(p.id);
    const resp = await apiPost(`/workbench/api/preset/delete`, { id: p.id });
    setBusyId(null);
    show(resp.ok ? `预设 ${p.id} 已删除` : resp.errorMessage || '删除失败', resp.ok);
    if (resp.ok) load();
  };

  return (
    <>
      <Notice notice={notice} onDismiss={dismiss} />
      <div style={S.section}>
        <div style={S.sectionTitle}>
          本机预设
          {presets && <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--dsw-alias-text-tertiary, #86868b)' }}>{presets.length} 个</span>}
          <span style={{ flex: 1 }} />
          <button style={S.btn} onClick={load}>刷新</button>
        </div>
        <div style={S.sectionHint}>
          随部署分发（system）的预设只读；本地自建（user）的预设可编辑组合、校验与删除。编辑前建议先「复制为新预设」。
        </div>
        {error && <div style={{ fontSize: '13px', color: 'var(--dsw-danger, #ff3b30)' }}>{error}</div>}
        {presets === null && <div style={{ fontSize: '13px', color: 'var(--dsw-alias-text-tertiary, #86868b)' }}>加载中...</div>}
        {presets?.map((p) => (
          <div key={p.id} style={S.row}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dsw-alias-text-primary, #1d1d1f)' }}>
                {p.name || p.id}
              </span>
              <span style={{ ...S.badge(p.trust === 'user' ? 'user' : 'sys'), marginLeft: '8px' }}>
                {p.trust === 'user' ? 'user' : 'system'}
              </span>
              {p.broken && <span style={{ ...S.badge('broken'), marginLeft: '6px' }} title={p.broken}>broken</span>}
              <div style={{ fontSize: '12px', color: 'var(--dsw-alias-text-secondary, #86868b)', marginTop: '2px' }}>
                {p.description || p.id}{p.broken ? ` · ${p.broken}` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button style={S.btn} disabled={busyId === p.id} onClick={() => openComposition(p)}>
                {p.trust === 'user' ? '编辑组合' : '查看组合'}
              </button>
              <button style={S.btn} disabled={busyId === p.id} onClick={() => doValidate(p)}>挂载校验</button>
              <button style={S.btn} disabled={busyId === p.id} onClick={() => setCopyFrom(p)}>复制为新预设</button>
              {p.trust === 'user' && (
                <button style={S.btnDanger} disabled={busyId === p.id} onClick={() => doDelete(p)}>删除</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {editor && (
        <EditorModal
          title={`agent.cordis.yml — ${editor.id}${editor.readOnly ? '（system 只读）' : ''}`}
          initial={editor.content}
          readOnly={editor.readOnly}
          onClose={() => setEditor(null)}
          onDone={show}
          onSave={editor.readOnly ? undefined : async (content) =>
            apiPost('/workbench/api/preset/save', { id: editor.id, content })}
          extraActions={editor.readOnly ? (
            <button style={S.btn} onClick={() => { setCopyFrom(presets?.find((x) => x.id === editor.id) || null); setEditor(null); }}>
              复制为用户预设后编辑
            </button>
          ) : (
            <button style={S.btn} onClick={() => doValidate({ id: editor.id } as PresetEntry)}>保存前挂载校验</button>
          )}
        />
      )}

      {copyFrom && (
        <PromptModal
          title={`从 ${copyFrom.id} 复制为新预设`}
          hint="新预设写入用户预设根（~/.dsh/.agent-presets/），继承来源的完整目录（组合+元数据+技能资源）。id 需匹配小写字母/数字/连字符。"
          submitLabel="复制"
          busy={busyId === copyFrom.id}
          fields={[
            { key: 'id', label: '新预设 id（目录名）', placeholder: '例如 my-coding-preset', required: true },
            { key: 'name', label: '显示名（可选）', placeholder: '留空则用 id' },
          ]}
          onSubmit={async (v) => {
            setBusyId(copyFrom.id);
            const resp = await apiPost('/workbench/api/preset/copy', { from: copyFrom.id, id: v.id, name: v.name || undefined });
            setBusyId(null);
            if (resp.ok) load();
            return resp;
          }}
          onClose={() => setCopyFrom(null)}
          onDone={show}
        />
      )}
    </>
  );
}

// ==============================================
// 技能维护
// ==============================================

export function SkillManageSection() {
  const [skills, setSkills] = useState<SkillEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ name: string; content: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { notice, show, dismiss } = useNotice();

  const load = useCallback(async () => {
    const resp = await apiGet<SkillEntry[]>('/workbench/api/skill/list');
    if (resp.ok) { setSkills(resp.data || []); setError(null); }
    else { setError(resp.errorMessage || '读取技能目录失败'); setSkills([]); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openSkill = async (s: SkillEntry) => {
    setBusyId(s.name);
    const resp = await apiGet<{ content: string }>(`/workbench/api/skill/content/${encodeURIComponent(s.name)}`);
    setBusyId(null);
    if (!resp.ok || !resp.data) { show(resp.errorMessage || '读取 SKILL.md 失败', false); return; }
    setEditor({ name: s.name, content: resp.data.content });
  };

  const doDelete = async (s: SkillEntry) => {
    if (!window.confirm(`确认删除技能 ${s.name}（含其目录内全部资源）？`)) return;
    setBusyId(s.name);
    const resp = await apiPost('/workbench/api/skill/delete', { name: s.name });
    setBusyId(null);
    show(resp.ok ? `技能 ${s.name} 已删除` : resp.errorMessage || '删除失败', resp.ok);
    if (resp.ok) load();
  };

  return (
    <>
      <Notice notice={notice} onDismiss={dismiss} />
      <div style={S.section}>
        <div style={S.sectionTitle}>
          本机技能
          {skills && <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--dsw-alias-text-tertiary, #86868b)' }}>{skills.length} 个</span>}
          <span style={{ flex: 1 }} />
          <button style={S.btnPrimary} onClick={() => setCreating(true)}>新建技能</button>
          <button style={S.btn} onClick={load}>刷新</button>
        </div>
        <div style={S.sectionHint}>
          用户技能根 ~/.dsh/skills：目录型（&lt;名称&gt;/SKILL.md）或扁平（&lt;名称&gt;.md）。保存后由 skill-filesystem 监听热更新，新会话自动生效。
        </div>
        {error && <div style={{ fontSize: '13px', color: 'var(--dsw-danger, #ff3b30)' }}>{error}</div>}
        {skills === null && <div style={{ fontSize: '13px', color: 'var(--dsw-alias-text-tertiary, #86868b)' }}>加载中...</div>}
        {skills?.length === 0 && (
          <div style={{ fontSize: '13px', color: 'var(--dsw-alias-text-tertiary, #86868b)', padding: '8px 0' }}>
            还没有本机技能，点「新建技能」开始。
          </div>
        )}
        {skills?.map((s) => (
          <div key={s.name} style={S.row}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dsw-alias-text-primary, #1d1d1f)' }}>
                {s.displayName}
              </span>
              <span style={{ ...S.badge('layout'), marginLeft: '8px' }}>{s.layout === 'dir' ? '目录' : '扁平'}</span>
              {s.resourceCount > 0 && (
                <span style={{ ...S.badge('sys'), marginLeft: '6px' }}>资源×{s.resourceCount}</span>
              )}
              <div style={{ fontSize: '12px', color: 'var(--dsw-alias-text-secondary, #86868b)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.description || '（无描述）'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button style={S.btn} disabled={busyId === s.name} onClick={() => openSkill(s)}>查看/编辑</button>
              {s.editable && (
                <button style={S.btnDanger} disabled={busyId === s.name} onClick={() => doDelete(s)}>删除</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {editor && (
        <EditorModal
          title={`SKILL.md — ${editor.name}`}
          initial={editor.content}
          readOnly={false}
          onClose={() => setEditor(null)}
          onDone={show}
          onSave={async (content) => apiPost('/workbench/api/skill/save', { name: editor.name, content })}
        />
      )}

      {creating && (
        <PromptModal
          title="新建技能"
          hint="在 ~/.dsh/skills/ 下创建 <名称>/SKILL.md 模板（frontmatter 自动生成），保存即可被技能系统发现。"
          submitLabel="创建"
          busy={busyId === '__create__'}
          fields={[
            { key: 'name', label: '技能名称（目录名）', placeholder: '例如 my-daily-report', required: true },
            { key: 'description', label: '一句话描述（写入 frontmatter）', placeholder: '何时用这个技能、它能做什么' },
          ]}
          onSubmit={async (v) => {
            setBusyId('__create__');
            const resp = await apiPost('/workbench/api/skill/create', { name: v.name, description: v.description });
            setBusyId(null);
            if (resp.ok) load();
            return resp;
          }}
          onClose={() => setCreating(false)}
          onDone={show}
        />
      )}
    </>
  );
}
