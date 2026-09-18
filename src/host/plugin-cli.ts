/**
 * dsh-tech-workbench 插件生命周期管理 - CLI 命令包装器（方案A：命令转发）
 *
 * 设计原则（09-18 复盘定稿）：
 * - 不自己写包管理：安装/卸载转发 `dsh plugin --profile <p> add/remove`
 * - 启用/停用只写 cordis.patch.yml 的托管区块（managed block），
 *   由 profile 的 patchReload:live（watchUserPatches）热生效
 * - 只触碰托管区块内的行，用户在文件其余部分手写的补丁原样保留
 * - 受保护插件（基座/工作台自身/认证/桥）拒绝停用与卸载
 *
 * v2.4 修复：
 * - 旧版在 async 上下文误用 fs.promises.readFileSync/writeFileSync（必然 TypeError）
 * - 路由 action/id 解析错误（/plugin/list、/plugin/install 曾被解析为未知操作）
 */

import { promises as fsp, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';

// ===== 类型 =====

/** 操作结果 */
export interface CliResult<T = any> {
  ok: boolean;
  data: T | null;
  error: string | null;
  exitCode: number;
}

/** 插件信息 */
export interface PluginInfo {
  id: string;
  name: string;
  version: string;
  installType: 'bundle' | 'insert';
  enabled: boolean;
  updateAvailable: boolean;
  protected: boolean;
}

/** plugin-cli 选项（测试与多 profile 时覆盖） */
export interface PluginCliOptions {
  /** profile 名，默认 'web' */
  profile?: string;
  /** DSH 家目录，默认 $DSH_HOME 或 ~/.dsh */
  dshHome?: string;
  /** dsh 可执行文件，默认 'dsh'（PATH 解析） */
  dshBin?: string;
}

const DEFAULT_PROFILE = 'web';

/**
 * 受保护插件：卸载/停用会破坏 Harness 自身或本工作台，一律拒绝。
 * （前缀匹配：@deepseek-ai/ 下的基座按精确 id 列出）
 */
export const PROTECTED_PLUGIN_IDS: readonly string[] = [
  '@deepseek-ai/dsh-base',
  '@deepseek-ai/dsh-web-app',
  'dsh-tech-workbench',
  'dsh-webui-auth',
  '@wenbin_wb/dsh-bridge',
];

export function isProtectedPlugin(id: string): boolean {
  return PROTECTED_PLUGIN_IDS.includes(id);
}

// ===== 路径解析 =====

export function profileDir(opts: PluginCliOptions): string {
  const home = opts.dshHome || process.env.DSH_HOME || path.join(process.env.HOME || '~', '.dsh');
  return path.join(home, 'profiles', opts.profile || DEFAULT_PROFILE);
}

function packageJsonPath(opts: PluginCliOptions): string {
  return path.join(profileDir(opts), 'package.json');
}

function patchFilePath(opts: PluginCliOptions): string {
  return path.join(profileDir(opts), 'cordis.patch.yml');
}

// ===== 来源规范化 =====

/**
 * 规范化来源：生成 dsh plugin add 可接受的格式
 *   "dsh plugin --profile web add o/r" → 先提取 add 之后的裸来源再走下列规则
 *   "https://github.com/o/r" → "github:o/r"
 *   "github.com/o/r"         → "github:o/r"
 *   "o/r"                    → "github:o/r"
 *   "@scope/pkg[@ver]" / "pkg[@ver]" → 原样（npm）
 *
 * 卡片数据层的 installCmd 本身就是完整命令串；用户粘贴或前端预填都必须能吃下，
 * 否则会把整条命令当成包名传给 pnpm（09-18 Meta管理安装失败根因）。
 */
export function normalizeSource(source: string): string {
  const trimmed = (source || '').trim();
  if (!trimmed) throw new Error('来源不能为空');

  // 含空格 → 视为命令串/多 token，提取 add 之后的尾参
  if (/\s/.test(trimmed)) {
    const addMatch = trimmed.match(/\badd\s+(\S+)\s*$/);
    const candidate = (addMatch ? addMatch[1] : '').trim();
    if (!candidate) {
      throw new Error(`无法从输入中识别包来源（应形如 "dsh plugin add <来源>" 或直接给来源）: ${trimmed}`);
    }
    return normalizeSource(candidate);
  }

  const httpsMatch = trimmed.match(/^https?:\/\/github\.com\/([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/);
  if (httpsMatch) return `github:${httpsMatch[1]}`;

  const githubMatch = trimmed.match(/^github\.com\/([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/);
  if (githubMatch) return `github:${githubMatch[1]}`;

  if (trimmed.includes('/') && !trimmed.startsWith('@') && !trimmed.startsWith('github:')) {
    const parts = trimmed.split('/');
    if (parts.length === 2 && parts[0].length > 0 && parts[1].length > 0) {
      return `github:${trimmed}`;
    }
  }

  return trimmed;
}

// ===== 生命周期操作 =====

function runDshPlugin(args: string[], opts: PluginCliOptions, timeoutMs: number): CliResult<{ stdout: string; stderr: string }> {
  const bin = opts.dshBin || 'dsh';
  const result = spawnSync(bin, args, {
    cwd: profileDir(opts),
    stdio: 'pipe',
    encoding: 'utf-8',
    timeout: timeoutMs,
  });
  if (result.error) {
    return { ok: false, data: null, error: `无法执行 ${bin}: ${result.error.message}`, exitCode: 127 };
  }
  return {
    ok: result.status === 0,
    data: { stdout: result.stdout || '', stderr: result.stderr || '' },
    error: result.status === 0 ? null : (result.stderr || result.stdout || '命令失败'),
    exitCode: result.status ?? 1,
  };
}

/** 安装插件：dsh plugin --profile <p> add <source> */
export function installPlugin(source: string, opts: PluginCliOptions = {}): CliResult {
  let normalized: string;
  try {
    normalized = normalizeSource(source);
  } catch (err: any) {
    return { ok: false, data: null, error: err.message, exitCode: 400 };
  }
  const run = runDshPlugin(['plugin', '--profile', opts.profile || DEFAULT_PROFILE, 'add', normalized], opts, 180000);
  if (run.ok) return { ok: true, data: { source: normalized, stdout: run.data?.stdout }, error: null, exitCode: 0 };
  return { ok: false, data: null, error: run.error, exitCode: run.exitCode };
}

/** 卸载插件：先摘除托管区块，再 dsh plugin remove */
export function uninstallPlugin(id: string, opts: PluginCliOptions = {}): CliResult {
  if (isProtectedPlugin(id)) {
    return { ok: false, data: null, error: `插件 ${id} 受保护，拒绝卸载`, exitCode: 403 };
  }
  try {
    setPluginDisabled(id, false, opts); // 先清掉托管区块里的痕迹，避免 remove 后留下悬挂条目
  } catch {
    /* 托管区块操作失败不阻塞卸载 */
  }
  const run = runDshPlugin(['plugin', '--profile', opts.profile || DEFAULT_PROFILE, 'remove', id], opts, 120000);
  if (run.ok) return { ok: true, data: { id }, error: null, exitCode: 0 };
  return { ok: false, data: null, error: run.error, exitCode: run.exitCode };
}

/** 更新/回退到指定版本：dsh plugin add <id>@<version>（npm 语义） */
export function updatePlugin(id: string, opts: PluginCliOptions & { version?: string } = {}): CliResult {
  const target = opts.version ? `${id}@${opts.version}` : id;
  const run = runDshPlugin(['plugin', '--profile', opts.profile || DEFAULT_PROFILE, 'add', target], opts, 180000);
  if (run.ok) return { ok: true, data: { id, version: opts.version || 'latest' }, error: null, exitCode: 0 };
  return { ok: false, data: null, error: run.error, exitCode: run.exitCode };
}

/** 回退插件到指定版本（必须显式给版本） */
export function rollbackPlugin(id: string, version: string, opts: PluginCliOptions = {}): CliResult {
  if (!version) {
    return { ok: false, data: null, error: '回退必须指定目标版本', exitCode: 400 };
  }
  if (isProtectedPlugin(id)) {
    return { ok: false, data: null, error: `插件 ${id} 受保护，拒绝回退`, exitCode: 403 };
  }
  return updatePlugin(id, { ...opts, version });
}

/** 启用插件：托管区块中移除 disabled 标记 */
export function enablePlugin(id: string, opts: PluginCliOptions = {}): CliResult {
  try {
    setPluginDisabled(id, false, opts);
    return { ok: true, data: { id, enabled: true }, error: null, exitCode: 0 };
  } catch (err: any) {
    return { ok: false, data: null, error: err.message, exitCode: 1 };
  }
}

/** 停用插件：托管区块写入 disabled: true */
export function disablePlugin(id: string, opts: PluginCliOptions = {}): CliResult {
  if (isProtectedPlugin(id)) {
    return { ok: false, data: null, error: `插件 ${id} 受保护，拒绝停用`, exitCode: 403 };
  }
  try {
    setPluginDisabled(id, true, opts);
    return { ok: true, data: { id, enabled: false }, error: null, exitCode: 0 };
  } catch (err: any) {
    return { ok: false, data: null, error: err.message, exitCode: 1 };
  }
}

/** 列出 profile 已安装插件（package.json deps + bundles + 托管区块停用态） */
export async function listPlugins(opts: PluginCliOptions = {}): Promise<CliResult<PluginInfo[]>> {
  try {
    const pkgJson = JSON.parse(await fsp.readFile(packageJsonPath(opts), 'utf-8'));
    const deps: Record<string, string> = pkgJson.dependencies || {};
    const bundles: string[] = pkgJson.dsh?.profile?.bundles || [];
    const disabled = getDisabledSetSync(patchFilePath(opts));
    // patch 里以 insert 行存在但未进 deps 的包也算已安装（纯 Cordis 包）
    const inserted = getPatchEntryIdsSync(patchFilePath(opts));

    const NON_PLUGIN = new Set(['react', 'react-dom']);
    const plugins: PluginInfo[] = [];
    for (const [id, version] of Object.entries(deps)) {
      if (NON_PLUGIN.has(id)) continue;
      plugins.push({
        id,
        name: id,
        version: version as string,
        installType: bundles.includes(id) ? 'bundle' : 'insert',
        enabled: !disabled.has(id),
        updateAvailable: false,
        protected: isProtectedPlugin(id),
      });
    }
    for (const id of inserted) {
      if (NON_PLUGIN.has(id) || (deps as any)[id]) continue;
      plugins.push({
        id, name: id, version: 'patch-insert',
        installType: 'insert',
        enabled: !disabled.has(id),
        updateAvailable: false,
        protected: isProtectedPlugin(id),
      });
    }
    plugins.sort((a, b) => a.id.localeCompare(b.id));
    return { ok: true, data: plugins, error: null, exitCode: 0 };
  } catch (err: any) {
    return { ok: false, data: null, error: err.message, exitCode: 1 };
  }
}

/** 版本历史：本地可知的仅当前安装版本（远端历史由前端数据层提供） */
export async function getVersions(id: string, opts: PluginCliOptions = {}): Promise<CliResult<{ versions: Array<{ version: string; installedAt: string; backedUp: boolean; backupPath: null }> }>> {
  try {
    const pkgJson = JSON.parse(await fsp.readFile(packageJsonPath(opts), 'utf-8'));
    const current = pkgJson.dependencies?.[id];
    if (!current) return { ok: false, data: null, error: `插件 ${id} 未安装`, exitCode: 404 };
    return {
      ok: true,
      data: { versions: [{ version: String(current).replace(/^file:.*$/, 'local'), installedAt: '', backedUp: false, backupPath: null }] },
      error: null,
      exitCode: 0,
    };
  } catch (err: any) {
    return { ok: false, data: null, error: err.message, exitCode: 1 };
  }
}

// ===== 托管区块（managed block）=====

export const MANAGED_BEGIN = '# === dsh-tech-workbench managed block begin ===';
export const MANAGED_END = '# === dsh-tech-workbench managed block end ===';

/** 解析托管区块内容 → Map<id, disabled> */
export function parseManagedBlock(content: string): Map<string, boolean> {
  const map = new Map<string, boolean>();
  const lines = content.split('\n');
  let inBlock = false;
  let currentId: string | null = null;
  for (const line of lines) {
    const t = line.trim();
    if (t === MANAGED_BEGIN) { inBlock = true; continue; }
    if (t === MANAGED_END) { inBlock = false; currentId = null; continue; }
    if (!inBlock) continue;
    if (t.startsWith('- id:')) {
      currentId = t.slice('- id:'.length).trim();
      if (currentId) map.set(currentId, false);
    } else if (t.startsWith('disabled:') && currentId) {
      map.set(currentId, /true/.test(t));
    }
  }
  return map;
}

/** 全文件扫描（只读）：某 id 是否在任意位置被 disabled: true */
export function collectDisabledIds(content: string): Set<string> {
  const disabled = new Set<string>();
  const lines = content.split('\n');
  let currentId: string | null = null;
  let sawDisabledTrue = false;
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('- id:')) {
      if (currentId && sawDisabledTrue) disabled.add(currentId);
      currentId = t.slice('- id:'.length).trim();
      sawDisabledTrue = false;
    } else if (currentId && t.startsWith('disabled:')) {
      if (/true/.test(t)) sawDisabledTrue = true;
    }
  }
  if (currentId && sawDisabledTrue) disabled.add(currentId);
  return disabled;
}

/**
 * 读取当前 profile 补丁文件，得到「被停用插件 id」集合。
 * 启停状态的唯一真相源：声明存在 + 不在此集合 = 已启用。
 * 文件不存在/解析失败按空集合处理（宁可显示为启用，也不误伤）。
 */
export function getDisabledPluginIds(opts: PluginCliOptions = {}): Set<string> {
  try {
    return collectDisabledIds(readFileSync(patchFilePath(opts), 'utf-8'));
  } catch {
    return new Set<string>();
  }
}

/** 全文件扫描（只读）：补丁中出现过的所有条目 id */
export function collectPatchEntryIds(content: string): string[] {
  const ids: string[] = [];
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (t.startsWith('- id:')) {
      const id = t.slice('- id:'.length).trim();
      if (id && !ids.includes(id)) ids.push(id);
    }
  }
  return ids;
}

function getDisabledSetSync(patchFile: string): Set<string> {
  try {
    return collectDisabledIds(readFileSync(patchFile, 'utf-8'));
  } catch {
    return new Set();
  }
}

function getPatchEntryIdsSync(patchFile: string): string[] {
  try {
    return collectPatchEntryIds(readFileSync(patchFile, 'utf-8'));
  } catch {
    return [];
  }
}

/**
 * 设置插件停用状态：只重写托管区块。
 * - 文件不存在/为空 → 创建 `[]` 或托管区块
 * - 根是 flow 列表 `[]` 且首次写托管条目 → 用托管区块替换该空行
 * - 根是 flow 列表但有内容 → 拒绝（不敢自动改写用户 YAML）
 */
export function setPluginDisabled(id: string, disabled: boolean, opts: PluginCliOptions = {}): void {
  const file = patchFilePath(opts);
  let content = '';
  try {
    content = readFileSync(file, 'utf-8');
  } catch {
    content = '';
  }

  const managed = parseManagedBlock(content);
  const hadManaged = content.includes(MANAGED_BEGIN);

  if (disabled) {
    managed.set(id, true);
  } else {
    managed.delete(id);
  }

  // 托管区块以外的 flow-root 检测
  const stripped = content
    .split('\n')
    .filter((l) => !l.trim().startsWith('#'))
    .join('\n');
  const hasFlowRoot = /^\s*\[.*\]\s*$/.test(stripped) && stripped.trim() !== '';
  const flowIsEmpty = /^\s*\[\s*\]\s*$/.test(stripped);
  if (hasFlowRoot && !flowIsEmpty && !hadManaged) {
    // 用户写了 flow 格式的补丁（非空），托管区块追加会破坏 YAML —— 拒绝并提示
    throw new Error('cordis.patch.yml 使用了非空 flow 列表格式，无法安全追加托管区块，请改为块序列（- id: ...）后重试');
  }

  const blockLines: string[] = [];
  const entries = [...managed.entries()]
    .filter(([, d]) => d)
    .sort(([a], [b]) => a.localeCompare(b));
  // 只有仍存在停用条目时保留托管区块；最后一条被启用后区块整体摘除，文件回到原形
  if (entries.length > 0) {
    blockLines.push(MANAGED_BEGIN, '# 此区块由 Meta管理 面板自动维护，请勿手动编辑', MANAGED_END);
    blockLines.splice(1, 0, ...entries.map(([pid]) => `- id: ${pid}\n  disabled: true`).flatMap((s) => s.split('\n')));
  }

  let baseLines: string[];
  if (!content.trim() || flowIsEmpty) {
    baseLines = blockLines.length > 0 ? [] : ['[]'];
  } else {
    // 保留原文件，摘除旧托管区块后重建
    const out: string[] = [];
    let inBlock = false;
    for (const line of content.split('\n')) {
      const t = line.trim();
      if (t === MANAGED_BEGIN) { inBlock = true; continue; }
      if (t === MANAGED_END) { inBlock = false; continue; }
      if (!inBlock) out.push(line);
    }
    // 去掉尾部空行
    while (out.length && out[out.length - 1].trim() === '') out.pop();
    baseLines = out;
  }

  const finalLines = [...baseLines];
  if (blockLines.length > 0) {
    if (finalLines.length > 0) finalLines.push('');
    finalLines.push(...blockLines);
  } else if (finalLines.length === 0) {
    finalLines.push('[]');
  }

  // 同步写（调用方都是低频操作）
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, finalLines.join('\n') + '\n', 'utf-8');
}
