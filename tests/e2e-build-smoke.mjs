/**
 * 构建产物端到端冒烟：加载 lib/index.js（真实 bundle），
 * 用假 ctx 捕获 webServer handler，直接打 HTTP 形状请求验证路由。
 * 全程只读写 /tmp 沙箱，不触碰真实 profile / 不 spawn dsh。
 */
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const mod = await import('/home/ecs-assist-user/workplace/project/projects/dsh-tech-workbench/lib/index.js');

const SB = '/tmp/wb-e2e-profile';
try { rmSync(SB, { recursive: true, force: true }); } catch {}
mkdirSync(join(SB, 'profiles', 'test'), { recursive: true });
writeFileSync(join(SB, 'profiles', 'test', 'package.json'), JSON.stringify({
  dependencies: { 'dsh-alpha': '^1.0.0', 'dsh-eyes': '^0.1.0' },
  dsh: { profile: { bundles: ['dsh-alpha'] } },
}));
writeFileSync(join(SB, 'profiles', 'test', 'cordis.patch.yml'), '[]\n');
mkdirSync(join(SB, 'skills'), { recursive: true });


let handler = null;
const fakeCtx = {
  inject(names, cb) { cb({ effect(fn) { fn(); return () => {}; }, webServer: { register(r) { handler = r.handler; } } }); },
  get() { return undefined; }, // 无 agentPresets → 预设路由应优雅降级
  on() {},
};

mod.apply(fakeCtx, { profile: 'test', dshHome: SB });
assert.ok(handler, 'webServer handler 已注册');


// 简化：直接用低层事件桥
async function call(method, url, body) {
  const { EventEmitter } = await import('node:events');
  const req = new EventEmitter();
  req.method = method; req.url = url; req.headers = {};
  const res = {
    statusCode: 0, headers: null, body: '',
    writeHead(s, h) { this.statusCode = s; this.headers = h; },
    end(b) { this.body = b; },
  };
  const p = handler(req, res);
  if (body) setImmediate(() => { req.emit('data', Buffer.from(JSON.stringify(body))); req.emit('end'); });
  else setImmediate(() => req.emit('end'));
  await p;
  return { status: res.statusCode, json: JSON.parse(res.body || 'null') };
}

// 1. plugin/list
let r = await call('GET', '/workbench/api/plugin/list');
assert.equal(r.status, 200);
assert.ok(r.json.ok, JSON.stringify(r.json));
const names = r.json.data.map((p) => p.id);
assert.deepEqual(names.sort(), ['dsh-alpha', 'dsh-eyes']);
assert.equal(r.json.data.find((p) => p.id === 'dsh-alpha').installType, 'bundle');

// 2. disable → patch 写托管区块
r = await call('POST', '/workbench/api/plugin/disable/dsh-eyes');
assert.ok(r.json.ok, JSON.stringify(r.json));
const patch = readFileSync(join(SB, 'profiles', 'test', 'cordis.patch.yml'), 'utf-8');
assert.match(patch, /managed block begin/);
assert.match(patch, /- id: dsh-eyes\n {2}disabled: true/);

// 3. list 反映 disabled
r = await call('GET', '/workbench/api/plugin/list');
assert.equal(r.json.data.find((p) => p.id === 'dsh-eyes').enabled, false);

// 4. enable → 区块清除
r = await call('POST', '/workbench/api/plugin/enable/dsh-eyes');
assert.ok(r.json.ok);
assert.match(readFileSync(join(SB, 'profiles', 'test', 'cordis.patch.yml'), 'utf-8'), /\[\]/);

// 5. 受保护拒绝
r = await call('POST', '/workbench/api/plugin/disable/dsh-tech-workbench');
assert.equal(r.status, 403);

// 6. preset 降级（无 agentPresets 服务）
r = await call('GET', '/workbench/api/preset/list');
assert.equal(r.json.ok, false);
assert.match(r.json.errorMessage, /agentPresets/);

// 7. skill CRUD
r = await call('POST', '/workbench/api/skill/create', { name: 'e2e-skill', description: '冒烟' });
assert.ok(r.json.ok, JSON.stringify(r.json));
r = await call('GET', '/workbench/api/skill/list');
assert.equal(r.json.data[0].name, 'e2e-skill');
r = await call('GET', '/workbench/api/skill/content/e2e-skill');
assert.match(r.json.data.content, /name: e2e-skill/);
r = await call('POST', '/workbench/api/skill/save', { name: 'e2e-skill', content: '---\nname: e2e-skill\ndescription: 改\n---\n# x\n' });
assert.ok(r.json.ok);
r = await call('POST', '/workbench/api/skill/delete', { name: 'e2e-skill' });
assert.ok(r.json.ok);
r = await call('GET', '/workbench/api/skill/list');
assert.equal(r.json.data.length, 0);

// 8. 技能路径逃逸拒绝
r = await call('POST', '/workbench/api/skill/create', { name: '../escape' });
assert.equal(r.json.ok, false);

// 9. 未知 action
r = await call('POST', '/workbench/api/plugin/teleport/dsh-eyes');
assert.equal(r.status, 400);

console.log('E2E SMOKE: 9/9 通过 ✅');
process.exit(0);
