/**
 * 更新日志（CHANGELOG）获取 - 卡片就地展开的数据源
 *
 * 优先级：
 *   1. 已安装插件的包目录内 CHANGELOG 文件（node_modules/<id>/）
 *   2. GitHub 源仓 raw 文件（homepage/installCmd 推断 owner/repo，main/master 轮询）
 * 结果内存缓存 6 小时，避免反复拉网络。
 */

import { promises as fsp } from 'node:fs';
import * as path from 'node:path';
import { profileDir, type PluginCliOptions } from './plugin-cli';

const FILE_CANDIDATES = [
  'CHANGELOG.md', 'CHANGELOG.markdown', 'CHANGELOG.txt', 'CHANGELOG.md',
  'changelog.md', 'Changelog.md', 'HISTORY.md', 'CHANGES.md', 'CHANGES.txt',
];

const MAX_BYTES = 64 * 1024;

export interface ChangelogResult {
  id: string;
  found: boolean;
  source: 'local' | 'remote' | null;
  path?: string;
  url?: string;
  content?: string;
  truncated?: boolean;
}

const cache = new Map<string, { at: number; result: ChangelogResult }>();
const TTL = 6 * 60 * 60 * 1000;

/** 从 homepage / git 源推断 owner/repo */
function guessRepo(homepage?: string): string | null {
  const text = (homepage || '').trim();
  const m =
    text.match(/github\.com\/([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/) ||
    text.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (!m) return null;
  const repo = m[1] === 'github.com' ? text.split('github.com/')[1] : `${m[1]}/${m[2]}`;
  return repo ? repo.replace(/\.git$/, '').replace(/\/$/, '') : null;
}

async function readLocal(id: string, opts: PluginCliOptions): Promise<ChangelogResult | null> {
  const base = path.join(profileDir(opts), 'node_modules', id);
  for (const name of FILE_CANDIDATES) {
    try {
      const file = path.join(base, name);
      const st = await fsp.stat(file);
      if (!st.isFile()) continue;
      const raw = await fsp.readFile(file, 'utf-8');
      const truncated = raw.length > MAX_BYTES;
      return {
        id,
        found: true,
        source: 'local',
        path: `${id}/${name}`,
        content: truncated ? raw.slice(0, MAX_BYTES) + '\n\n…（已截断）' : raw,
        truncated,
      };
    } catch {
      /* try next */
    }
  }
  return null;
}

async function fetchRemote(repo: string): Promise<ChangelogResult | null> {
  for (const branch of ['main', 'master']) {
    for (const name of ['CHANGELOG.md', 'changelog.md']) {
      const url = `https://raw.githubusercontent.com/${repo}/${branch}/${name}`;
      try {
        const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!resp.ok) continue;
        const raw = await resp.text();
        if (!raw.trim()) continue;
        const truncated = raw.length > MAX_BYTES;
        return {
          id: repo,
          found: true,
          source: 'remote',
          url,
          content: truncated ? raw.slice(0, MAX_BYTES) + '\n\n…（已截断）' : raw,
          truncated,
        };
      } catch {
        /* next candidate */
      }
    }
  }
  return null;
}

/**
 * 获取插件更新日志
 * @param id 插件包名（与卡片 id 一致）
 * @param homepage 卡片 homepage（用于远程兜底推断仓库）
 */
export async function getChangelog(
  id: string,
  opts: PluginCliOptions = {},
  homepage?: string,
): Promise<ChangelogResult> {
  if (!id || id.includes('..') || id.startsWith('/') || id.startsWith('\\')) {
    return { id, found: false, source: null };
  }
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < TTL) return hit.result;

  let result = await readLocal(id, opts);
  if (!result) {
    const repo = guessRepo(homepage);
    if (repo) result = await fetchRemote(repo);
  }
  if (!result) result = { id, found: false, source: null };
  cache.set(id, { at: Date.now(), result });
  return result;
}
