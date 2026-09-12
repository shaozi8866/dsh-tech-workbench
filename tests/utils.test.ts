/**
 * DSH 科技风工作台 - 工具函数单元测试
 * 运行方式：node --import tsx/esm --test tests/utils.test.ts
 * （cwd 需为能解析到 tsx 的目录，如 DSH 检出目录）
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  isValidSemver,
  compareVersion,
  normalizeVersion,
  parseReadme,
  getGithubRepoList,
  createDefaultResource,
  DEFAULT_GITHUB_WHITELIST,
} from '../src/host/utils';
import { ResourceType, SourceType } from '../src/host/types';

// ==============================================
// isValidSemver 测试
// ==============================================
describe('isValidSemver', () => {
  it('应接受标准三段式版本号', () => {
    assert.equal(isValidSemver('1.0.0'), true);
    assert.equal(isValidSemver('0.0.1'), true);
    assert.equal(isValidSemver('10.20.30'), true);
  });

  it('应接受带 v/V 前缀的版本号', () => {
    assert.equal(isValidSemver('v1.0.0'), true);
    assert.equal(isValidSemver('V2.3.4'), true);
  });

  it('应接受带预发布后缀的版本号', () => {
    assert.equal(isValidSemver('1.0.0-beta.1'), true);
    assert.equal(isValidSemver('2.0.0-rc.1'), true);
  });

  it('应拒绝非法版本号', () => {
    assert.equal(isValidSemver(''), false);
    assert.equal(isValidSemver('abc'), false);
    assert.equal(isValidSemver('1.0'), false);
    assert.equal(isValidSemver('1'), false);
    assert.equal(isValidSemver(null as any), false);
    assert.equal(isValidSemver(undefined as any), false);
  });
});

// ==============================================
// compareVersion 测试
// ==============================================
describe('compareVersion', () => {
  it('新版本大于旧版本应返回1', () => {
    assert.equal(compareVersion('2.0.0', '1.0.0'), 1);
    assert.equal(compareVersion('1.1.0', '1.0.0'), 1);
    assert.equal(compareVersion('1.0.1', '1.0.0'), 1);
  });

  it('新版本小于旧版本应返回-1', () => {
    assert.equal(compareVersion('1.0.0', '2.0.0'), -1);
    assert.equal(compareVersion('1.0.0', '1.1.0'), -1);
  });

  it('版本相等应返回0', () => {
    assert.equal(compareVersion('1.0.0', '1.0.0'), 0);
    assert.equal(compareVersion('v1.0.0', '1.0.0'), 0);
  });

  it('应正确处理带前缀的版本号', () => {
    assert.equal(compareVersion('v2.0.0', 'v1.0.0'), 1);
    assert.equal(compareVersion('V1.0.0', 'V1.0.0'), 0);
  });
});

// ==============================================
// normalizeVersion 测试
// ==============================================
describe('normalizeVersion', () => {
  it('应规范化标准版本号', () => {
    assert.equal(normalizeVersion('1.0.0'), '1.0.0');
    assert.equal(normalizeVersion('v2.3.4'), '2.3.4');
  });

  it('非法版本应返回0.0.0', () => {
    assert.equal(normalizeVersion(''), '0.0.0');
    assert.equal(normalizeVersion('abc'), '0.0.0');
    assert.equal(normalizeVersion('1.0'), '0.0.0');
  });
});

// ==============================================
// parseReadme 测试
// ==============================================
describe('parseReadme', () => {
  it('应从README中提取适配版本', () => {
    const readme = '# My Plugin\n\n适配版本: 0.5+\n\n这是一个功能强大的插件。';
    const result = parseReadme(readme);
    assert.equal(result.adaptVer, '0.5+');
  });

  it('应提取"支持 DSH"格式的版本', () => {
    const readme = '# Plugin\n\n支持 DSH: 0.6\n\n功能描述。';
    const result = parseReadme(readme);
    assert.equal(result.adaptVer, '0.6');
  });

  it('无版本信息时应返回all', () => {
    const readme = '# Plugin\n\n这是一个没有版本信息的插件描述文本。';
    const result = parseReadme(readme);
    assert.equal(result.adaptVer, 'all');
  });

  it('应提取第一段有效描述', () => {
    const readme = '# My Plugin\n\n![logo](logo.png)\n\n这是第一个有效描述行，应该被提取出来作为简介。\n\n## 安装\n\n更多内容。';
    const result = parseReadme(readme);
    assert.ok(result.desc.includes('第一个有效描述行'));
  });

  it('描述应截取前120字符', () => {
    const longText = 'A'.repeat(200);
    const readme = `# Plugin\n\n${longText}`;
    const result = parseReadme(readme);
    assert.equal(result.desc.length, 120);
  });

  it('空内容应返回空描述和all版本', () => {
    const result = parseReadme('');
    assert.equal(result.desc, '');
    assert.equal(result.adaptVer, 'all');
  });

  it('应过滤markdown标题、图片、链接行', () => {
    const readme = '# Title\n\n![img](url)\n\n[link](url)\n\n这是真正的描述文本行。';
    const result = parseReadme(readme);
    assert.ok(result.desc.includes('真正的描述文本'));
  });
});

// ==============================================
// getGithubRepoList 测试
// ==============================================
describe('getGithubRepoList', () => {
  it('无自定义源时应返回默认白名单', () => {
    const result = getGithubRepoList([]);
    assert.deepEqual(result, DEFAULT_GITHUB_WHITELIST);
  });

  it('应合并自定义源并去重', () => {
    const custom = ['user/my-plugin', DEFAULT_GITHUB_WHITELIST[0], 'user/another'];
    const result = getGithubRepoList(custom);
    assert.ok(result.includes('user/my-plugin'));
    assert.ok(result.includes('user/another'));
    // 去重：默认白名单第一个不应出现两次
    const count = result.filter((r) => r === DEFAULT_GITHUB_WHITELIST[0]).length;
    assert.equal(count, 1);
  });

  it('应过滤无效仓库地址', () => {
    const custom = ['invalid', '', 'no-slash', 'user/valid', 'with space/repo'];
    const result = getGithubRepoList(custom);
    assert.ok(result.includes('user/valid'));
    assert.ok(!result.includes('invalid'));
    assert.ok(!result.includes(''));
    assert.ok(!result.includes('with space/repo'));
  });

  it('应处理null/undefined输入', () => {
    assert.doesNotThrow(() => getGithubRepoList(null as any));
    assert.doesNotThrow(() => getGithubRepoList(undefined as any));
  });
});

// ==============================================
// createDefaultResource 测试
// ==============================================
describe('createDefaultResource', () => {
  it('应创建带默认值的完整资源对象', () => {
    const resource = createDefaultResource();
    assert.equal(resource.type, ResourceType.PLUGIN);
    assert.equal(resource.source, SourceType.GITHUB);
    assert.equal(resource.isOfficial, false);
    assert.equal(resource.latestVersion, '0.0.0');
    assert.equal(resource.isInstalled, false);
    assert.equal(resource.star, 0);
  });

  it('应正确合并覆盖字段', () => {
    const resource = createDefaultResource({
      id: 'test-id',
      name: 'Test Plugin',
      isOfficial: true,
      star: 100,
    });
    assert.equal(resource.id, 'test-id');
    assert.equal(resource.name, 'Test Plugin');
    assert.equal(resource.isOfficial, true);
    assert.equal(resource.star, 100);
    // 未覆盖字段保持默认
    assert.equal(resource.latestVersion, '0.0.0');
  });
});

// ==============================================
// 集成测试：版本比对 + 归一化联动
// ==============================================
describe('版本处理联动', () => {
  it('归一化后版本应可正确比对', () => {
    const v1 = normalizeVersion('v1.2.3-beta');
    const v2 = normalizeVersion('1.2.3');
    assert.equal(compareVersion(v1, v2), 0);
  });

  it('非法版本归一化后比对应相等', () => {
    const v1 = normalizeVersion('invalid');
    const v2 = normalizeVersion('');
    assert.equal(v1, '0.0.0');
    assert.equal(v2, '0.0.0');
    assert.equal(compareVersion(v1, v2), 0);
  });
});

console.log('所有工具函数单元测试通过！');
