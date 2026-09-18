/**
 * dsh-tech-workbench 二期 - 技能（Skill）维护
 *
 * 技能发现由 @deepseek-ai/dsh-skill-filesystem 提供者扫描多个根目录
 * （project / custom / user / bundled），并带 catalog 监听热更新。
 * 本模块只维护 **用户技能根**（默认 `<DSH_HOME>/skills`）：
 * - 目录型技能：<root>/<name>/SKILL.md（frontmatter + 正文，可带子资源）
 * - 扁平技能：<root>/<name>.md
 *
 * 所有 name 都做净化与路径收敛校验（拒绝 .. / 绝对路径 / 分隔符），
 * 读写删除一律限定在用户根内，bundled/system 技能只读。
 */

import { promises as fsp } from 'node:fs';
import * as path from 'path';
import type { CliResult } from './plugin-cli';

export interface SkillCliOptions {
  /** 用户技能根，默认 <dshHome>/skills */
  skillsDir?: string;
  dshHome?: string;
}

/** 技能条目（本面板视角：以文件系统为准） */
export interface SkillEntry {
  /** 技能名（目录名或去扩展形的文件名） */
  name: string;
  /** frontmatter 里的 name（缺省回退目录名） */
  displayName: string;
  /** frontmatter description */
  description: string;
  /** 'dir' = 目录型（SKILL.md），'flat' = 扁平 .md */
  layout: 'dir' | 'flat';
  /** SKILL.md / <name>.md 的绝对路径 */
  entryPath: string;
  /** 是否可编辑（本用户根内 = true） */
  editable: boolean;
  /** 文件大小（字节）与修改时间（ms） */
  sizeBytes: number;
  mtimeMs: number;
  /** 附带资源文件数（目录型，不含入口） */
  resourceCount: number;
}

function ok<T>(data: T): CliResult<T> { return { ok: true, data, error: null, exitCode: 0 }; }
function fail(error: string, exitCode = 1): CliResult { return { ok: false, data: null, error, exitCode }; }

export function userSkillsRoot(opts: SkillCliOptions = {}): string {
  if (opts.skillsDir) return path.resolve(opts.skillsDir);
  const home = opts.dshHome || process.env.DSH_HOME || path.join(process.env.HOME || '~', '.dsh');
  return path.join(home, 'skills');
}

/** 技能名净化：只允许字母/数字/连字符/下划线/点/中文，拒绝任何路径分隔 */
export function sanitizeSkillName(name: string): string | null {
  const trimmed = (name || '').trim();
  if (!trimmed) return null;
  if (trimmed === '.' || trimmed === '..') return null;
  if (!/^[A-Za-z0-9._\u4e00-\u9fa5-]+$/.test(trimmed)) return null;
  if (trimmed.includes('/') || trimmed.includes('\\')) return null;
  return trimmed;
}

/** 把 name 解析到用户根内的条目目录/文件，越界返回 null */
function resolveInRoot(root: string, name: string): string | null {
  const safe = sanitizeSkillName(name);
  if (!safe) return null;
  const target = path.resolve(root, safe);
  const rel = path.relative(path.resolve(root), target);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return target;
}

/** 解析 SKILL.md 的 YAML frontmatter（只取 name/description 标量） */
export function parseFrontmatter(content: string): { name?: string; description?: string } {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const out: { name?: string; description?: string } = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^(name|description)\s*:\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[kv[1] as 'name' | 'description'] = v;
  }
  return out;
}

/** 新技能模板 */
export function skillTemplate(name: string, description: string): string {
  return [
    '---',
    `name: ${name}`,
    `description: ${description || `${name} 技能：在此描述触发场景与能力`}`,
    '---',
    '',
    `# ${name}`,
    '',
    '## 使用说明',
    '',
    '- TODO: 这个技能做什么、何时触发',
    '- TODO: 步骤 / 脚本 / 资源引用',
    '',
  ].join('\n');
}

/** 列出用户技能根下所有技能 */
export async function listSkills(opts: SkillCliOptions = {}): Promise<CliResult<SkillEntry[]>> {
  const root = userSkillsRoot(opts);
  try {
    await fsp.mkdir(root, { recursive: true });
    const dirents = await fsp.readdir(root, { withFileTypes: true });
    const entries: SkillEntry[] = [];

    for (const d of dirents) {
      if (d.name.startsWith('.') || d.name.startsWith('_')) continue;
      try {
        if (d.isDirectory()) {
          const entryPath = path.join(root, d.name, 'SKILL.md');
          let st;
          try { st = await fsp.stat(entryPath); } catch { continue; }
          const raw = await fsp.readFile(entryPath, 'utf-8');
          const fm = parseFrontmatter(raw);
          const sub = await fsp.readdir(path.join(root, d.name));
          entries.push({
            name: d.name,
            displayName: fm.name || d.name,
            description: fm.description || '',
            layout: 'dir',
            entryPath,
            editable: true,
            sizeBytes: st.size,
            mtimeMs: st.mtimeMs,
            resourceCount: sub.filter((s) => s !== 'SKILL.md').length,
          });
        } else if (d.isFile() && d.name.endsWith('.md')) {
          const entryPath = path.join(root, d.name);
          const st = await fsp.stat(entryPath);
          const raw = await fsp.readFile(entryPath, 'utf-8');
          const fm = parseFrontmatter(raw);
          const nm = d.name.replace(/\.md$/, '');
          entries.push({
            name: nm,
            displayName: fm.name || nm,
            description: fm.description || '',
            layout: 'flat',
            entryPath,
            editable: true,
            sizeBytes: st.size,
            mtimeMs: st.mtimeMs,
            resourceCount: 0,
          });
        }
      } catch {
        /* 单个技能解析失败不影响整体列表 */
      }
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    return ok(entries);
  } catch (err: any) {
    return fail(err?.message || `读取技能目录失败: ${root}`);
  }
}

/** 读取技能入口文件内容 */
export async function readSkill(name: string, opts: SkillCliOptions = {}): Promise<CliResult<{ name: string; content: string }>> {
  const root = userSkillsRoot(opts);
  const target = resolveInRoot(root, name);
  if (!target) return fail(`技能名非法: ${name}`, 400);
  try {
    let entryPath = path.join(target, 'SKILL.md');
    try { await fsp.stat(entryPath); } catch { entryPath = `${target}.md`; }
    const content = await fsp.readFile(entryPath, 'utf-8');
    return ok({ name, content });
  } catch (err: any) {
    return fail(err?.message || `读取技能 ${name} 失败`, 404);
  }
}

/** 新建技能（目录型 SKILL.md 模板） */
export async function createSkill(name: string, description: string, opts: SkillCliOptions = {}): Promise<CliResult<{ name: string }>> {
  const root = userSkillsRoot(opts);
  const target = resolveInRoot(root, name);
  if (!target) return fail(`技能名非法（允许字母/数字/-_./中文，禁止路径分隔）: ${name}`, 400);
  try {
    const exists = await fsp.stat(target).then(() => true, () => false);
    const existsFlat = await fsp.stat(`${target}.md`).then(() => true, () => false);
    if (exists || existsFlat) return fail(`技能 ${name} 已存在`, 409);
    await fsp.mkdir(target, { recursive: true });
    await fsp.writeFile(path.join(target, 'SKILL.md'), skillTemplate(path.basename(target), description), 'utf-8');
    return ok({ name });
  } catch (err: any) {
    return fail(err?.message || `创建技能 ${name} 失败`);
  }
}

/** 保存技能入口文件内容 */
export async function saveSkill(name: string, content: string, opts: SkillCliOptions = {}): Promise<CliResult<{ name: string }>> {
  const root = userSkillsRoot(opts);
  const target = resolveInRoot(root, name);
  if (!target) return fail(`技能名非法: ${name}`, 400);
  if (typeof content !== 'string') return fail('内容不能为空', 400);
  if (content.length > 512 * 1024) return fail('内容超过 512KB 上限', 400);
  try {
    let entryPath = path.join(target, 'SKILL.md');
    let isDir = true;
    try { await fsp.stat(entryPath); } catch {
      entryPath = `${target}.md`;
      isDir = false;
      const flat = await fsp.stat(entryPath).then(() => true, () => false);
      if (!flat) return fail(`技能 ${name} 不存在`, 404);
    }
    if (isDir) await fsp.mkdir(path.dirname(entryPath), { recursive: true });
    await fsp.writeFile(entryPath, content, 'utf-8');
    return ok({ name });
  } catch (err: any) {
    return fail(err?.message || `保存技能 ${name} 失败`);
  }
}

/** 删除技能（目录整体删除，仅限用户根内） */
export async function deleteSkill(name: string, opts: SkillCliOptions = {}): Promise<CliResult<{ name: string }>> {
  const root = userSkillsRoot(opts);
  const target = resolveInRoot(root, name);
  if (!target) return fail(`技能名非法: ${name}`, 400);
  try {
    const st = await fsp.stat(target).then(() => 'dir', () => null);
    if (st === 'dir') {
      await fsp.rm(target, { recursive: true, force: true });
    } else {
      const flat = `${target}.md`;
      await fsp.stat(flat);
      await fsp.rm(flat, { force: true });
    }
    return ok({ name });
  } catch (err: any) {
    if (err?.code === 'ENOENT') return fail(`技能 ${name} 不存在`, 404);
    return fail(err?.message || `删除技能 ${name} 失败`);
  }
}
