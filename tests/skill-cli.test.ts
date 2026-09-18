/**
 * 二期测试 - skill-cli（用户技能根 CRUD，全部在临时目录）
 */

import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  listSkills, readSkill, createSkill, saveSkill, deleteSkill,
  sanitizeSkillName, parseFrontmatter, skillTemplate,
} from '../src/host/skill-cli';

const root = mkdtempSync(join(tmpdir(), 'wb-skills-'));
const opts = { skillsDir: root };

beforeEach(() => {
  rmSync(root, { recursive: true, force: true });
});

after(() => { rmSync(root, { recursive: true, force: true }); });

describe('技能名净化', () => {
  it('常规名称通过', () => {
    assert.equal(sanitizeSkillName('my-skill'), 'my-skill');
    assert.equal(sanitizeSkillName('日报技能v1.md'), '日报技能v1.md');
  });
  it('路径逃逸与非法字符拒绝', () => {
    for (const bad of ['../etc', 'a/b', 'a\\b', '..', '', ' ', 'x$y']) {
      assert.equal(sanitizeSkillName(bad), null, bad);
    }
  });
});

describe('frontmatter 解析与模板', () => {
  it('提取 name/description', () => {
    const fm = parseFrontmatter('---\nname: demo\ndescription: "A demo"\n---\nbody');
    assert.equal(fm.name, 'demo');
    assert.equal(fm.description, 'A demo');
  });
  it('无 frontmatter 返回空', () => {
    assert.deepEqual(parseFrontmatter('# plain'), {});
  });
  it('模板自带合法 frontmatter', () => {
    const fm = parseFrontmatter(skillTemplate('t1', 'desc here'));
    assert.equal(fm.name, 't1');
    assert.equal(fm.description, 'desc here');
  });
});

describe('技能 CRUD 流程', () => {
  it('空目录列表为空数组', async () => {
    const r = await listSkills(opts);
    assert.ok(r.ok);
    assert.deepEqual(r.data, []);
  });

  it('create → list → read → save → delete', async () => {
    assert.ok((await createSkill('daily-report', '每日报告', opts)).ok);
    const list = await listSkills(opts);
    assert.equal(list.data!.length, 1);
    assert.equal(list.data![0].name, 'daily-report');
    assert.equal(list.data![0].displayName, 'daily-report');
    assert.equal(list.data![0].description, '每日报告');
    assert.equal(list.data![0].layout, 'dir');

    const rd = await readSkill('daily-report', opts);
    assert.ok(rd.ok);
    assert.match(rd.data!.content, /name: daily-report/);

    assert.ok((await saveSkill('daily-report', '---\nname: daily-report\ndescription: 改过\n---\n# new\n', opts)).ok);
    const rd2 = await readSkill('daily-report', opts);
    assert.equal(parseFrontmatter(rd2.data!.content).description, '改过');

    assert.ok((await deleteSkill('daily-report', opts)).ok);
    assert.equal((await listSkills(opts)).data!.length, 0);
  });

  it('扁平 .md 技能可被发现与读取', async () => {
    const { mkdirSync, writeFileSync } = await import('node:fs');
    mkdirSync(root, { recursive: true });
    writeFileSync(join(root, 'flat-skill.md'), '---\nname: flat-skill\ndescription: 扁平技能\n---\nbody');
    const list = await listSkills(opts);
    const entry = list.data!.find((s) => s.name === 'flat-skill')!;
    assert.ok(entry);
    assert.equal(entry.layout, 'flat');
    const rd = await readSkill('flat-skill', opts);
    assert.ok(rd.ok);
  });

  it('重名创建被拒（409）', async () => {
    assert.ok((await createSkill('dup', '', opts)).ok);
    const r = await createSkill('dup', '', opts);
    assert.equal(r.ok, false);
    assert.equal(r.exitCode, 409);
  });

  it('逃逸名一律 400', async () => {
    assert.equal((await createSkill('../evil', '', opts)).exitCode, 400);
    assert.equal((await saveSkill('../evil', 'x', opts)).exitCode, 400);
    assert.equal((await deleteSkill('../evil', opts)).exitCode, 400);
    assert.equal((await readSkill('../evil', opts)).exitCode, 400);
  });

  it('删除不存在的技能 404', async () => {
    const r = await deleteSkill('ghost', opts);
    assert.equal(r.ok, false);
    assert.equal(r.exitCode, 404);
  });

  it('目录内资源文件计入 resourceCount', async () => {
    const { mkdirSync, writeFileSync } = await import('node:fs');
    await createSkill('with-assets', '', opts);
    mkdirSync(join(root, 'with-assets', 'scripts'), { recursive: true });
    writeFileSync(join(root, 'with-assets', 'run.sh'), '#!/bin/sh');
    const list = await listSkills(opts);
    assert.equal(list.data!.find((s) => s.name === 'with-assets')!.resourceCount, 2); // run.sh + scripts/
    assert.ok(existsSync(join(root, 'with-assets', 'SKILL.md')));
  });
});
