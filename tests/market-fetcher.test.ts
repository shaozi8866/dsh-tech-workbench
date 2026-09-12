/**
 * DSH 科技风工作台 - Market 抓取模块单元测试
 * 验证：四层过滤逻辑、分类归集、故障降级
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { fetchMarketSource, renderCacheData, type WorkbenchContext } from '../src/host/market-fetcher';
import { ResourceType, SourceType, type WorkbenchCache } from '../src/host/types';

// ==============================================
// Mock 工具
// ==============================================

function createMockCtx(rawList: any[]): WorkbenchContext {
  return {
    env: { DSH_HOME: '/tmp/dsh', VERSION: '0.6.0' },
    fs: {
      exists: async () => false,
      readFile: async () => '{}',
      writeFile: async () => {},
      mkdir: async () => {},
    },
    http: {
      request: async () => ({ data: rawList, status: 200 }),
      get: async () => ({ data: null, status: 200 }),
    },
    config: { get: async () => ({}) },
    logger: { info: () => {}, warn: () => {}, error: () => {} },
    market: { apiUrl: 'https://mock-market/api' },
  };
}

// ==============================================
// fetchMarketSource 四层过滤测试
// ==============================================
describe('fetchMarketSource - 四层过滤', () => {
  it('过滤1：应剔除非上架状态资源', async () => {
    const rawList = [
      { id: '1', name: '已上架', version: '1.0.0', status: 'published' },
      { id: '2', name: '已下架', version: '1.0.0', status: 'deprecated' },
      { id: '3', name: '审核中', version: '1.0.0', status: 'pending' },
    ];
    const ctx = createMockCtx(rawList);
    const result = await fetchMarketSource(ctx, 'token');
    assert.equal(result.length, 1);
    assert.equal(result[0].id, '1');
  });

  it('过滤2：应剔除版本不兼容资源', async () => {
    const rawList = [
      { id: '1', name: '兼容', version: '1.0.0', minVersion: '0.5.0', status: 'published' },
      { id: '2', name: '不兼容', version: '1.0.0', minVersion: '0.7.0', status: 'published' },
      { id: '3', name: '刚好兼容', version: '1.0.0', minVersion: '0.6.0', status: 'published' },
    ];
    const ctx = createMockCtx(rawList);
    const result = await fetchMarketSource(ctx, 'token');
    assert.equal(result.length, 2);
    assert.ok(result.find((r) => r.id === '1'));
    assert.ok(result.find((r) => r.id === '3'));
    assert.ok(!result.find((r) => r.id === '2'));
  });

  it('过滤3：应剔除版本非法或空的资源', async () => {
    const rawList = [
      { id: '1', name: '合法版本', version: '1.0.0', status: 'published' },
      { id: '2', name: '空版本', version: '', status: 'published' },
      { id: '3', name: '非法版本', version: 'abc', status: 'published' },
      { id: '4', name: '缺版本字段', status: 'published' },
    ];
    const ctx = createMockCtx(rawList);
    const result = await fetchMarketSource(ctx, 'token');
    assert.equal(result.length, 1);
    assert.equal(result[0].id, '1');
  });

  it('过滤4：应剔除核心字段缺失资源', async () => {
    const rawList = [
      { id: '1', name: '完整', version: '1.0.0', status: 'published' },
      { name: '缺ID', version: '1.0.0', status: 'published' },
      { id: '3', version: '1.0.0', status: 'published' }, // 缺name
    ];
    const ctx = createMockCtx(rawList);
    const result = await fetchMarketSource(ctx, 'token');
    assert.equal(result.length, 1);
    assert.equal(result[0].id, '1');
  });

  it('应同时应用四层过滤', async () => {
    const rawList = [
      { id: '1', name: '完全合法', version: '1.0.0', status: 'published', minVersion: '0.5.0' },
      { id: '2', name: '已下架', version: '1.0.0', status: 'deprecated' },
      { id: '3', name: '版本不兼容', version: '1.0.0', status: 'published', minVersion: '0.8.0' },
      { id: '4', name: '版本非法', version: 'bad', status: 'published' },
      { name: '缺ID', version: '1.0.0', status: 'published' },
    ];
    const ctx = createMockCtx(rawList);
    const result = await fetchMarketSource(ctx, 'token');
    assert.equal(result.length, 1);
    assert.equal(result[0].id, '1');
  });
});

// ==============================================
// fetchMarketSource 字段归集测试
// ==============================================
describe('fetchMarketSource - 字段归集与官方标记', () => {
  it('应正确标记为官方资源', async () => {
    const rawList = [{ id: '1', name: '官方插件', version: '1.0.0', status: 'published' }];
    const ctx = createMockCtx(rawList);
    const result = await fetchMarketSource(ctx, 'token');
    assert.equal(result[0].source, SourceType.MARKET);
    assert.equal(result[0].isOfficial, true);
  });

  it('应正确归一化资源类型', async () => {
    const rawList = [
      { id: '1', name: '插件', version: '1.0.0', type: 'plugin', status: 'published' },
      { id: '2', name: '预设', version: '1.0.0', type: 'preset', status: 'published' },
      { id: '3', name: '应用', version: '1.0.0', type: 'app', status: 'published' },
      { id: '4', name: '模板', version: '1.0.0', type: 'template', status: 'published' },
      { id: '5', name: '工作流', version: '1.0.0', type: 'workflow', status: 'published' },
      { id: '6', name: '未知类型', version: '1.0.0', status: 'published' },
    ];
    const ctx = createMockCtx(rawList);
    const result = await fetchMarketSource(ctx, 'token');
    assert.equal(result.find((r) => r.id === '1')?.type, ResourceType.PLUGIN);
    assert.equal(result.find((r) => r.id === '2')?.type, ResourceType.PRESET);
    assert.equal(result.find((r) => r.id === '3')?.type, ResourceType.APP);
    assert.equal(result.find((r) => r.id === '4')?.type, ResourceType.PRESET);
    assert.equal(result.find((r) => r.id === '5')?.type, ResourceType.APP);
    assert.equal(result.find((r) => r.id === '6')?.type, ResourceType.PLUGIN);
  });

  it('应填充默认值 for 缺失字段', async () => {
    const rawList = [{ id: '1', name: '最小资源', version: '1.0.0', status: 'published' }];
    const ctx = createMockCtx(rawList);
    const result = await fetchMarketSource(ctx, 'token');
    const r = result[0];
    assert.equal(r.description, '官方资源');
    assert.equal(r.author, 'official');
    assert.equal(r.category, 'official');
    assert.equal(r.adaptVersion, 'all');
    assert.equal(r.star, 0);
    assert.equal(r.isInstalled, false);
    assert.equal(r.localVersion, '0.0.0');
  });
});

// ==============================================
// 故障降级测试
// ==============================================
describe('fetchMarketSource - 故障降级', () => {
  it('HTTP请求失败应返回空列表而非抛出', async () => {
    const ctx: WorkbenchContext = {
      env: { DSH_HOME: '/tmp/dsh', VERSION: '0.6.0' },
      fs: { exists: async () => false, readFile: async () => '{}', writeFile: async () => {}, mkdir: async () => {} },
      http: {
        request: async () => { throw new Error('Network error'); },
        get: async () => ({ data: null, status: 500 }),
      },
      config: { get: async () => ({}) },
      logger: { info: () => {}, warn: () => {}, error: () => {} },
      market: { apiUrl: 'https://mock-market/api' },
    };
    const result = await fetchMarketSource(ctx, 'token');
    assert.deepEqual(result, []);
  });

  it('返回非数组数据应安全处理', async () => {
    const ctx: WorkbenchContext = {
      env: { DSH_HOME: '/tmp/dsh', VERSION: '0.6.0' },
      fs: { exists: async () => false, readFile: async () => '{}', writeFile: async () => {}, mkdir: async () => {} },
      http: {
        request: async () => ({ data: { notAList: true }, status: 200 }),
        get: async () => ({ data: null, status: 200 }),
      },
      config: { get: async () => ({}) },
      logger: { info: () => {}, warn: () => {}, error: () => {} },
      market: { apiUrl: 'https://mock-market/api' },
    };
    const result = await fetchMarketSource(ctx, 'token');
    assert.deepEqual(result, []);
  });
});

// ==============================================
// renderCacheData 测试
// ==============================================
describe('renderCacheData', () => {
  it('应按类型分组返回资源列表', () => {
    const cache: WorkbenchCache = {
      updateTime: 1000,
      expireTime: 2000,
      pluginList: [{ id: 'p1' } as any],
      presetList: [{ id: 'pr1' } as any],
      appList: [{ id: 'a1' } as any],
    };
    const result = renderCacheData(cache);
    assert.equal(result.plugins.length, 1);
    assert.equal(result.presets.length, 1);
    assert.equal(result.apps.length, 1);
    assert.equal(result.plugins[0].id, 'p1');
  });

  it('空列表应安全返回空数组', () => {
    const cache: WorkbenchCache = {
      updateTime: 1000,
      expireTime: 2000,
      pluginList: [],
      presetList: [],
      appList: [],
    };
    const result = renderCacheData(cache);
    assert.deepEqual(result.plugins, []);
    assert.deepEqual(result.presets, []);
    assert.deepEqual(result.apps, []);
  });
});

console.log('Market 抓取模块单元测试全部通过！');
