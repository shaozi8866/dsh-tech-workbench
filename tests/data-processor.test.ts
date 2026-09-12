/**
 * DSH 科技风工作台 - 数据处理模块单元测试
 * 验证：双源去重、归一化清洗、本地状态联动
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { mergeDualSource, normalizeResourceList } from '../src/host/data-processor';
import { ResourceType, SourceType, type StandardResource } from '../src/host/types';
import { createDefaultResource } from '../src/host/utils';

// ==============================================
// 测试辅助
// ==============================================

function makeResource(overrides: Partial<StandardResource>): StandardResource {
  return createDefaultResource(overrides);
}

// ==============================================
// mergeDualSource 测试
// ==============================================
describe('mergeDualSource - 双源去重与优先级覆盖', () => {
  it('Market独有资源应保留', () => {
    const market = [makeResource({ id: 'm1', name: 'Market Only', source: SourceType.MARKET, isOfficial: true })];
    const github: StandardResource[] = [];
    const result = mergeDualSource(market, github);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'm1');
    assert.equal(result[0].source, SourceType.MARKET);
  });

  it('GitHub独有资源应保留（增量补齐）', () => {
    const market: StandardResource[] = [];
    const github = [makeResource({ id: 'g1', name: 'GitHub Only', source: SourceType.GITHUB, isOfficial: false })];
    const result = mergeDualSource(market, github);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'g1');
    assert.equal(result[0].source, SourceType.GITHUB);
  });

  it('同ID资源应保留Market版本（权威优先）', () => {
    const market = [makeResource({ id: 'shared', name: 'Market Version', source: SourceType.MARKET, isOfficial: true, latestVersion: '1.0.0' })];
    const github = [makeResource({ id: 'shared', name: 'GitHub Version', source: SourceType.GITHUB, isOfficial: false, latestVersion: '2.0.0' })];
    const result = mergeDualSource(market, github);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'Market Version');
    assert.equal(result[0].source, SourceType.MARKET);
    assert.equal(result[0].isOfficial, true);
  });

  it('双源无重叠应合并全部资源', () => {
    const market = [
      makeResource({ id: 'm1', source: SourceType.MARKET }),
      makeResource({ id: 'm2', source: SourceType.MARKET }),
    ];
    const github = [
      makeResource({ id: 'g1', source: SourceType.GITHUB }),
      makeResource({ id: 'g2', source: SourceType.GITHUB }),
    ];
    const result = mergeDualSource(market, github);
    assert.equal(result.length, 4);
  });

  it('Market内部重复ID应去重', () => {
    const market = [
      makeResource({ id: 'dup', name: 'First', source: SourceType.MARKET }),
      makeResource({ id: 'dup', name: 'Second', source: SourceType.MARKET }),
    ];
    const result = mergeDualSource(market, []);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'Second'); // Map 后写入覆盖先写入
  });

  it('空列表应安全处理', () => {
    assert.deepEqual(mergeDualSource([], []), []);
    assert.equal(mergeDualSource([], [makeResource({ id: 'g1' })]).length, 1);
    assert.equal(mergeDualSource([makeResource({ id: 'm1' })], []).length, 1);
  });

  it('无ID资源应被过滤', () => {
    const market = [makeResource({ id: '', name: 'No ID' }) as any];
    const github = [makeResource({ id: null as any, name: 'Null ID' }) as any];
    const result = mergeDualSource(market, github);
    assert.equal(result.length, 0);
  });
});

// ==============================================
// normalizeResourceList 测试
// ==============================================
describe('normalizeResourceList - 全量数据归一化清洗', () => {
  it('应规范化非法版本号为0.0.0', () => {
    const list = [
      makeResource({ id: '1', latestVersion: 'bad-version' }),
      makeResource({ id: '2', latestVersion: '' }),
      makeResource({ id: '3', latestVersion: 'v1.2.3' }),
    ];
    const result = normalizeResourceList(list);
    assert.equal(result[0].latestVersion, '0.0.0');
    assert.equal(result[1].latestVersion, '0.0.0');
    assert.equal(result[2].latestVersion, '1.2.3');
  });

  it('空描述应填充默认文案', () => {
    const list = [
      makeResource({ id: '1', description: '' }),
      makeResource({ id: '2', description: '   ' }),
      makeResource({ id: '3', description: '有效描述' }),
    ];
    const result = normalizeResourceList(list);
    assert.equal(result[0].description, '社区开源资源，点击查看详情');
    assert.equal(result[1].description, '社区开源资源，点击查看详情');
    assert.equal(result[2].description, '有效描述');
  });

  it('空名称应回退到ID', () => {
    const list = [makeResource({ id: 'my-plugin', name: '' })];
    const result = normalizeResourceList(list);
    assert.equal(result[0].name, 'my-plugin');
  });

  it('应确保数值字段为数字', () => {
    const list = [
      makeResource({ id: '1', star: '100' as any, fork: null as any }),
      makeResource({ id: '2', star: undefined as any, fork: undefined as any }),
    ];
    const result = normalizeResourceList(list);
    assert.equal(typeof result[0].star, 'number');
    assert.equal(result[0].star, 0); // '100' 被 typeof 检查为 string，归为0
    assert.equal(result[0].fork, 0);
    assert.equal(result[1].star, 0);
  });

  it('应确保布尔字段为布尔值', () => {
    const list = [
      makeResource({ id: '1', isInstalled: 'true' as any, isEnabled: 1 as any }),
      makeResource({ id: '2', isInstalled: null as any, isEnabled: undefined as any }),
    ];
    const result = normalizeResourceList(list);
    assert.equal(typeof result[0].isInstalled, 'boolean');
    assert.equal(result[0].isInstalled, true); // 'true' 是 truthy
    assert.equal(result[0].isEnabled, true); // 1 是 truthy
    assert.equal(result[1].isInstalled, false);
    assert.equal(result[1].isEnabled, false);
  });

  it('无效时间戳应回退到当前时间', () => {
    const list = [makeResource({ id: '1', updateTime: NaN })];
    const result = normalizeResourceList(list);
    assert.ok(!isNaN(result[0].updateTime));
    assert.ok(result[0].updateTime > 0);
  });

  it('应保留资源类型和来源', () => {
    const list = [
      makeResource({ id: '1', type: ResourceType.PLUGIN, source: SourceType.MARKET }),
      makeResource({ id: '2', type: ResourceType.PRESET, source: SourceType.GITHUB }),
      makeResource({ id: '3', type: ResourceType.APP, source: SourceType.GITHUB }),
    ];
    const result = normalizeResourceList(list);
    assert.equal(result[0].type, ResourceType.PLUGIN);
    assert.equal(result[1].type, ResourceType.PRESET);
    assert.equal(result[2].type, ResourceType.APP);
  });

  it('空列表应安全返回空数组', () => {
    assert.deepEqual(normalizeResourceList([]), []);
  });
});

// ==============================================
// 集成测试：去重 + 归一化联动
// ==============================================
describe('去重 + 归一化联动', () => {
  it('双源合并后应正确归一化', () => {
    const market = [
      makeResource({ id: 'shared', name: 'Official', source: SourceType.MARKET, isOfficial: true, latestVersion: '1.0.0', description: '' }),
    ];
    const github = [
      makeResource({ id: 'shared', name: 'Community', source: SourceType.GITHUB, latestVersion: 'bad' }),
      makeResource({ id: 'extra', name: '', source: SourceType.GITHUB, latestVersion: 'v2.0.0' }),
    ];
    const merged = mergeDualSource(market, github);
    const normalized = normalizeResourceList(merged);

    assert.equal(normalized.length, 2);
    const shared = normalized.find((r) => r.id === 'shared')!;
    assert.equal(shared.name, 'Official'); // Market 优先
    assert.equal(shared.latestVersion, '1.0.0');
    assert.equal(shared.description, '社区开源资源，点击查看详情'); // 空描述兜底

    const extra = normalized.find((r) => r.id === 'extra')!;
    assert.equal(extra.name, 'extra'); // 空名称回退到ID
    assert.equal(extra.latestVersion, '2.0.0');
  });
});

console.log('数据处理模块单元测试全部通过！');
