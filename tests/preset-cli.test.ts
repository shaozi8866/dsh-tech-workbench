/**
 * 二期测试 - preset-cli（假名册服务，不触真实环境）
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  listPresets, readPresetComposition, savePresetComposition,
  copyPreset, deletePreset, validatePreset, PRESET_ID_PATTERN,
  type AgentPresetsService, type AgentPresetView,
} from '../src/host/preset-cli';

function fakeRoster(overrides: Partial<AgentPresetsService> = {}): AgentPresetsService {
  const presets: Record<string, AgentPresetView> = {
    standard: { id: 'standard', trust: 'system', path: '/opt/dsh/agent-presets/standard/agent.cordis.yml' },
    'my-preset': { id: 'my-preset', trust: 'user', path: join(tmpFakeRoot, 'my-preset', 'agent.cordis.yml') },
  };
  return {
    async list() { return Object.values(presets); },
    async resolve(id: string) {
      const p = presets[id];
      if (!p) throw new Error(`preset not found: ${id}`);
      return p;
    },
    async read(id: string) {
      const p = presets[id];
      if (!p) throw new Error(`preset not found: ${id}`);
      if (p.trust === 'system') return '- id: shipped-base\n'; // 假 system 路径不落盘
      return readFileSync(p.path, 'utf-8');
    },
    async copy() { /* no-op */ },
    async remove() { /* no-op */ },
    async standingKeyFor() { return 'key'; },
    ...overrides,
  };
}

const tmpFakeRoot = mkdtempSync(join(tmpdir(), 'wb-preset-'));
writeFileSync(join(tmpFakeRoot, 'x'), '');
import { mkdirSync } from 'node:fs';
mkdirSync(join(tmpFakeRoot, 'my-preset'), { recursive: true });
writeFileSync(join(tmpFakeRoot, 'my-preset', 'agent.cordis.yml'), '- id: base\n');

describe('PRESET_ID_PATTERN', () => {
  it('接受合法目录名', () => {
    assert.ok(PRESET_ID_PATTERN.test('standard'));
    assert.ok(PRESET_ID_PATTERN.test('my-preset-2'));
  });
  it('拒绝路径逃逸与非法字符', () => {
    for (const bad of ['..', '-lead', 'A-b', 'a/b', 'a\\b', '', '.hidden']) {
      assert.ok(!PRESET_ID_PATTERN.test(bad), bad);
    }
  });
});

describe('preset-cli 护栏', () => {
  it('roster 缺失 → 明确报错', async () => {
    const r = await listPresets(undefined);
    assert.equal(r.ok, false);
    assert.match(r.error!, /agentPresets/);
  });

  it('list 正常返回', async () => {
    const r = await listPresets(fakeRoster());
    assert.ok(r.ok);
    assert.equal(r.data!.length, 2);
  });

  it('composition 读取带 trust', async () => {
    const r = await readPresetComposition(fakeRoster(), 'standard');
    assert.ok(r.ok);
    assert.equal(r.data!.trust, 'system');
  });

  it('非法 id 拒绝（400）', async () => {
    const r = await readPresetComposition(fakeRoster(), '../evil');
    assert.equal(r.ok, false);
    assert.equal(r.exitCode, 400);
  });

  it('save 拒绝 system 预设（403）', async () => {
    const r = await savePresetComposition(fakeRoster(), 'standard', '- id: hack\n');
    assert.equal(r.ok, false);
    assert.equal(r.exitCode, 403);
  });

  it('save 允许 user 预设写入', async () => {
    const r = await savePresetComposition(fakeRoster(), 'my-preset', '- id: edited\n');
    assert.ok(r.ok);
    assert.match(readFileSync(join(tmpFakeRoot, 'my-preset', 'agent.cordis.yml'), 'utf-8'), /- id: edited/);
  });

  it('copy 校验两侧 id', async () => {
    assert.equal((await copyPreset(fakeRoster(), 'standard', 'Bad Id')).exitCode, 400);
    assert.equal((await copyPreset(fakeRoster(), '..', 'ok-id')).exitCode, 400);
    assert.ok((await copyPreset(fakeRoster(), 'standard', 'ok-id')).ok);
  });

  it('delete 拒绝 system、允许 user', async () => {
    assert.equal((await deletePreset(fakeRoster(), 'standard')).exitCode, 403);
    assert.ok((await deletePreset(fakeRoster(), 'my-preset')).ok);
  });

  it('validate 失败透出挂载原因', async () => {
    const roster = fakeRoster({
      standingKeyFor: async () => { throw new Error('row(s) published process-global service(s) [foo]'); },
    });
    const r = await validatePreset(roster, 'my-preset');
    assert.equal(r.ok, false);
    assert.match(r.error!, /process-global/);
  });
});
