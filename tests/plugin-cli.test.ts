/**
 * 二期测试 - plugin-cli 托管区块与命令包装
 * 全部在临时目录进行，绝不触碰真实 profile
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  normalizeSource, isProtectedPlugin,
  setPluginDisabled, parseManagedBlock, collectDisabledIds, getDisabledPluginIds, collectPatchEntryIds,
  MANAGED_BEGIN, MANAGED_END,
  listPlugins, enablePlugin, disablePlugin,
} from '../src/host/plugin-cli';

let sandbox: string;

function opts() {
  return { profile: 'test', dshHome: sandbox };
}

function profileDir() {
  return join(sandbox, 'profiles', 'test');
}
function patchFile() {
  return join(profileDir(), 'cordis.patch.yml');
}
function packageFile() {
  return join(profileDir(), 'package.json');
}

beforeEach(() => {
  // 每个用例重置沙箱
  rmSync(sandbox, { recursive: true, force: true });
  mkdirSync(profileDir(), { recursive: true });
});

before(() => { sandbox = mkdtempSync(join(tmpdir(), 'wb-plugin-cli-')); });
after(() => { rmSync(sandbox, { recursive: true, force: true }); });

describe('normalizeSource - 来源规范化', () => {
  it('https GitHub 地址 → github:owner/repo', () => {
    assert.equal(normalizeSource('https://github.com/owner/repo'), 'github:owner/repo');
    assert.equal(normalizeSource('https://github.com/owner/repo.git'), 'github:owner/repo');
    assert.equal(normalizeSource('https://github.com/owner/repo/'), 'github:owner/repo');
  });
  it('裸 owner/repo → github:owner/repo', () => {
    assert.equal(normalizeSource('owner/repo'), 'github:owner/repo');
  });
  it('npm 包名与 scoped 包原样保留', () => {
    assert.equal(normalizeSource('dsh-market'), 'dsh-market');
    assert.equal(normalizeSource('@scope/pkg@1.2.3'), '@scope/pkg@1.2.3');
  });
  it('完整命令串（卡片 installCmd）提取 add 之后的裸来源 — 09-18 安装失败回归', () => {
    assert.equal(
      normalizeSource('dsh plugin --profile web add @anysearch/anysearch-dsh'),
      '@anysearch/anysearch-dsh',
    );
    assert.equal(
      normalizeSource('dsh plugin --profile web add https://github.com/owner/repo'),
      'github:owner/repo',
    );
    assert.equal(normalizeSource('dsh --profile web plugin add owner/repo'), 'github:owner/repo');
    assert.throws(() => normalizeSource('dsh plugin add'), /无法从输入中识别包来源/);
    assert.throws(() => normalizeSource('rm -rf /tmp/x something'), /无法从输入中识别包来源/);
  });
  it('空来源抛错', () => {
    assert.throws(() => normalizeSource('   '), /来源不能为空/);
  });
});

describe('保护名单', () => {
  it('基座与工作台自身受保护', () => {
    assert.ok(isProtectedPlugin('dsh-tech-workbench'));
    assert.ok(isProtectedPlugin('@deepseek-ai/dsh-base'));
    assert.ok(!isProtectedPlugin('dsh-eyes'));
  });
  it('disable/enable 受保护插件被拒绝（403）', () => {
    const r = disablePlugin('dsh-tech-workbench', opts());
    assert.equal(r.ok, false);
    assert.equal(r.exitCode, 403);
  });
});

describe('托管区块 - cordis.patch.yml 维护', () => {
  it('从 [] 起步停用插件：产出合法块序列 + 托管标记', () => {
    writeFileSync(patchFile(), '[]\n');
    setPluginDisabled('dsh-foo', true, opts());
    const content = readFileSync(patchFile(), 'utf-8');
    assert.ok(content.includes(MANAGED_BEGIN));
    assert.ok(content.includes('- id: dsh-foo'));
    assert.ok(content.includes('disabled: true'));
    // 空的 flow root（[]）被替换掉
    assert.ok(!/^\s*\[\s*\]\s*$/m.test(content.replace(MANAGED_BEGIN, '').replace(MANAGED_END, '')));
    assert.deepEqual([...collectDisabledIds(content)], ['dsh-foo']);
  });

  it('启用已停用插件：托管条目摘除，文件回到 []', () => {
    writeFileSync(patchFile(), '[]\n');
    setPluginDisabled('dsh-foo', true, opts());
    setPluginDisabled('dsh-foo', false, opts());
    const content = readFileSync(patchFile(), 'utf-8');
    assert.ok(!content.includes('- id: dsh-foo'));
    assert.ok(content.includes('[]'));
  });

  it('保留用户手写的块序列补丁，只在末尾追加托管区块', () => {
    writeFileSync(patchFile(), '- id: my-tool\n  config:\n    foo: bar\n');
    setPluginDisabled('dsh-foo', true, opts());
    const content = readFileSync(patchFile(), 'utf-8');
    assert.ok(content.includes('- id: my-tool'));
    assert.ok(content.includes('config:'));
    assert.ok(content.indexOf('- id: my-tool') < content.indexOf(MANAGED_BEGIN));
  });

  it('非空 flow 列表格式拒绝改写（防破坏 YAML）', () => {
    writeFileSync(patchFile(), '[{ id: a }]\n');
    assert.throws(() => setPluginDisabled('dsh-foo', true, opts()), /flow 列表/);
  });

  it('重复停用同一插件幂等，不产生重复条目', () => {
    writeFileSync(patchFile(), '[]\n');
    setPluginDisabled('dsh-foo', true, opts());
    setPluginDisabled('dsh-foo', true, opts());
    const content = readFileSync(patchFile(), 'utf-8');
    const count = (content.match(/- id: dsh-foo/g) || []).length;
    assert.equal(count, 1);
  });

  it('parseManagedBlock 读出 id→disabled 映射', () => {
    writeFileSync(patchFile(), '[]\n');
    setPluginDisabled('dsh-a', true, opts());
    setPluginDisabled('dsh-b', true, opts());
    const map = parseManagedBlock(readFileSync(patchFile(), 'utf-8'));
    assert.equal(map.get('dsh-a'), true);
    assert.equal(map.get('dsh-b'), true);
  });

  it('collectPatchEntryIds 覆盖托管与手写条目', () => {
    writeFileSync(patchFile(), '- id: hand\n  disabled: false\n');
    setPluginDisabled('managed-x', true, opts());
    const ids = collectPatchEntryIds(readFileSync(patchFile(), 'utf-8'));
    assert.ok(ids.includes('hand'));
    assert.ok(ids.includes('managed-x'));
  });
});

describe('listPlugins - 已安装视图', () => {
  it('合并 deps/bundles/disabled/insert-only 条目', async () => {
    writeFileSync(packageFile(), JSON.stringify({
      dependencies: { 'dsh-alpha': '^1.0.0', 'dsh-beta': '2.0.0', react: '^18.0.0' },
      dsh: { profile: { bundles: ['dsh-alpha'] } },
    }));
    writeFileSync(patchFile(), '[]\n');
    setPluginDisabled('dsh-beta', true, opts());
    // insert-only：仅存在于 patch 的包
    writeFileSync(patchFile(), readFileSync(patchFile(), 'utf-8') + '- id: only-inserted\n  disabled: false\n');

    const r = await listPlugins(opts());
    assert.ok(r.ok);
    const plugins = r.data!;
    const alpha = plugins.find((p) => p.id === 'dsh-alpha')!;
    const beta = plugins.find((p) => p.id === 'dsh-beta')!;
    const inserted = plugins.find((p) => p.id === 'only-inserted')!;
    assert.equal(alpha.installType, 'bundle');
    assert.equal(alpha.enabled, true);
    assert.equal(beta.enabled, false);
    assert.equal(inserted.installType, 'insert');
    assert.equal(inserted.version, 'patch-insert');
    assert.equal(plugins.find((p) => p.id === 'react'), undefined);
    assert.equal(alpha.protected, false);
  });

  it('受保护插件在列表中带 protected 标记', async () => {
    writeFileSync(packageFile(), JSON.stringify({ dependencies: { 'dsh-tech-workbench': 'file:x' } }));
    writeFileSync(patchFile(), '[]\n');
    const r = await listPlugins(opts());
    assert.equal(r.data![0].protected, true);
  });
});

describe('enable/disable 结果包装', () => {
  it('停用成功返回 enabled:false；受保护插件被拒', async () => {
    writeFileSync(patchFile(), '[]\n');
    const r = disablePlugin('dsh-safe', opts());
    assert.ok(r.ok);
    assert.equal(r.data.enabled, false);
    const bad = disablePlugin('dsh-webui-auth', opts());
    assert.equal(bad.ok, false);
    assert.equal(bad.exitCode, 403);
  });
});

describe('getDisabledPluginIds - 启停真相源（卡片 enabled 状态以此为准）', () => {
  it('patch 缺失→空集；停用后含 id；还原后再为空', () => {
    writeFileSync(patchFile(), '[]\n');
    assert.equal(getDisabledPluginIds(opts()).size, 0);
    setPluginDisabled('dsh-demo', true, opts());
    assert.ok(getDisabledPluginIds(opts()).has('dsh-demo'));
    setPluginDisabled('dsh-demo', false, opts());
    assert.equal(getDisabledPluginIds(opts()).size, 0);
  });
});
