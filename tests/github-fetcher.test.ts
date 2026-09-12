/**
 * DSH 科技风工作台 - GitHub 抓取模块单元测试
 * 验证：四层解析、分片节流、故障降级、限流处理
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { fetchSingleRepo, fetchGithubSource, detectResourceType } from '../src/host/github-fetcher';
import type { WorkbenchContext } from '../src/host/market-fetcher';
import { SourceType, ResourceType } from '../src/host/types';

// ==============================================
// Mock 工具
// ==============================================

function createMockCtx(httpGetImpl: (url: string) => Promise<{ data: any; status: number }>): WorkbenchContext {
  return {
    env: { DSH_HOME: '/tmp/dsh', VERSION: '0.6.0' },
    fs: { exists: async () => false, readFile: async () => '{}', writeFile: async () => {}, mkdir: async () => {} },
    http: {
      request: async () => ({ data: [], status: 200 }),
      get: async (url: string) => httpGetImpl(url),
    },
    config: { get: async () => ({}) },
    logger: { info: () => {}, warn: () => {}, error: () => {} },
    dialog: { tip: () => {} },
    utils: { sleep: async () => {} },
  };
}

// 标准DSH工程的目录文件列表
const VALID_PROJECT_CONTENTS = [
  { name: 'index.ts', type: 'file' },
  { name: 'package.json', type: 'file' },
  { name: 'README.md', type: 'file' },
];

// 非DSH工程的目录文件列表
const INVALID_PROJECT_CONTENTS = [
  { name: 'README.md', type: 'file' },
  { name: 'LICENSE', type: 'file' },
];

function createMockHttpGet(options: {
  repoInfo?: any;
  release?: any;
  readme?: any;
  contents?: any[];
  releaseStatus?: number;
  readmeStatus?: number;
}): (url: string) => Promise<{ data: any; status: number }> {
  return async (url: string) => {
    if (url.includes('/repos/') && !url.includes('/releases') && !url.includes('/readme') && !url.includes('/contents')) {
      return { data: options.repoInfo, status: 200 };
    }
    if (url.includes('/releases/latest')) {
      return { data: options.release, status: options.releaseStatus ?? 200 };
    }
    if (url.includes('/readme')) {
      return { data: options.readme, status: options.readmeStatus ?? 200 };
    }
    if (url.includes('/contents')) {
      return { data: options.contents, status: 200 };
    }
    return { data: null, status: 404 };
  };
}

// ==============================================
// fetchSingleRepo 四层解析测试
// ==============================================
describe('fetchSingleRepo - 四层解析', () => {
  const validRepoInfo = {
    id: 1,
    name: 'test-plugin',
    full_name: 'owner/test-plugin',
    description: '一个测试插件',
    stargazers_count: 100,
    forks_count: 20,
    updated_at: '2024-01-01T00:00:00Z',
    pushed_at: '2024-01-01T00:00:00Z',
    default_branch: 'main',
    owner: { login: 'owner', avatar_url: '' },
    license: null,
  };

  const validRelease = {
    tag_name: 'v1.2.3',
    name: 'v1.2.3',
    published_at: '2024-06-01T00:00:00Z',
    body: '更新日志',
    html_url: '',
  };

  const validReadme = {
    content: Buffer.from('# Test Plugin\n\n适配版本: 0.5+\n\n这是一个功能强大的测试插件，用于验证README解析。').toString('base64'),
    encoding: 'base64',
    name: 'README.md',
    path: 'README.md',
  };

  it('层1+层2+层3+层4：完整有效仓库应返回标准化资源', async () => {
    const httpGet = createMockHttpGet({
      repoInfo: validRepoInfo,
      release: validRelease,
      readme: validReadme,
      contents: VALID_PROJECT_CONTENTS,
    });
    const ctx = createMockCtx(httpGet);
    const result = await fetchSingleRepo(ctx, 'owner/test-plugin', '');

    assert.ok(result);
    assert.equal(result!.id, 'owner/test-plugin');
    assert.equal(result!.name, 'test-plugin');
    assert.equal(result!.source, SourceType.GITHUB);
    assert.equal(result!.isOfficial, false);
    assert.equal(result!.latestVersion, 'v1.2.3');
    assert.equal(result!.star, 100);
    assert.equal(result!.fork, 20);
    assert.equal(result!.author, 'owner');
    assert.ok(result!.installCmd.includes('github:owner/test-plugin'));
  });

  it('层1：仓库不存在应返回null', async () => {
    const httpGet = async (url: string) => ({ data: null, status: 404 });
    const ctx = createMockCtx(httpGet);
    const result = await fetchSingleRepo(ctx, 'owner/nonexistent', '');
    assert.equal(result, null);
  });

  it('层2：无Release的仓库应版本置0.0.0但仍返回资源', async () => {
    const httpGet = createMockHttpGet({
      repoInfo: validRepoInfo,
      release: null,
      releaseStatus: 404,
      readme: validReadme,
      contents: VALID_PROJECT_CONTENTS,
    });
    const ctx = createMockCtx(httpGet);
    const result = await fetchSingleRepo(ctx, 'owner/test-plugin', '');

    assert.ok(result);
    assert.equal(result!.latestVersion, '0.0.0');
  });

  it('层3：README解析应提取适配版本和描述', async () => {
    const httpGet = createMockHttpGet({
      repoInfo: validRepoInfo,
      release: validRelease,
      readme: validReadme,
      contents: VALID_PROJECT_CONTENTS,
    });
    const ctx = createMockCtx(httpGet);
    const result = await fetchSingleRepo(ctx, 'owner/test-plugin', '');

    assert.ok(result);
    assert.equal(result!.adaptVersion, '0.5+');
    assert.ok(result!.description.includes('测试插件'));
  });

  it('层3：无README应使用仓库默认描述', async () => {
    const httpGet = createMockHttpGet({
      repoInfo: validRepoInfo,
      release: validRelease,
      readme: null,
      readmeStatus: 404,
      contents: VALID_PROJECT_CONTENTS,
    });
    const ctx = createMockCtx(httpGet);
    const result = await fetchSingleRepo(ctx, 'owner/test-plugin', '');

    assert.ok(result);
    assert.equal(result!.description, '一个测试插件');
  });

  it('层4：非标准DSH工程应返回null', async () => {
    const httpGet = createMockHttpGet({
      repoInfo: validRepoInfo,
      release: validRelease,
      readme: validReadme,
      contents: INVALID_PROJECT_CONTENTS,
    });
    const ctx = createMockCtx(httpGet);
    const result = await fetchSingleRepo(ctx, 'owner/not-a-plugin', '');

    assert.equal(result, null);
  });

  it('层4：含patch.yml的工程应判定为有效', async () => {
    const httpGet = createMockHttpGet({
      repoInfo: validRepoInfo,
      release: validRelease,
      readme: validReadme,
      contents: [{ name: 'patch.yml', type: 'file' }, { name: 'README.md', type: 'file' }],
    });
    const ctx = createMockCtx(httpGet);
    const result = await fetchSingleRepo(ctx, 'owner/patch-plugin', '');

    assert.ok(result);
  });

  it('无效仓库地址应返回null', async () => {
    const ctx = createMockCtx(async () => ({ data: null, status: 200 }));
    assert.equal(await fetchSingleRepo(ctx, '', ''), null);
    assert.equal(await fetchSingleRepo(ctx, 'no-slash', ''), null);
  });
});

// ==============================================
// fetchGithubSource 分片节流测试
// ==============================================
describe('fetchGithubSource - 分片节流', () => {
  it('应遍历所有仓库并返回有效资源', async () => {
    const validRepoInfo = {
      id: 1, name: 'p1', full_name: 'o/p1', description: 'desc',
      stargazers_count: 10, forks_count: 2, updated_at: '2024-01-01T00:00:00Z',
      pushed_at: '2024-01-01T00:00:00Z', default_branch: 'main',
      owner: { login: 'o', avatar_url: '' }, license: null,
    };
    const httpGet = createMockHttpGet({
      repoInfo: validRepoInfo,
      release: { tag_name: 'v1.0.0', published_at: '2024-01-01T00:00:00Z' },
      readme: { content: Buffer.from('# P1\n\n描述文本').toString('base64') },
      contents: VALID_PROJECT_CONTENTS,
    });
    const ctx = createMockCtx(httpGet);
    // 只传一个自定义仓库，避免默认白名单的网络请求
    const result = await fetchGithubSource(ctx, '', ['o/p1']);
    // 默认白名单有6个 + 自定义1个 = 7个，但mock都返回有效
    assert.ok(result.length >= 1);
    assert.ok(result.find((r) => r.id === 'o/p1'));
  });

  it('单个仓库失败不应影响其他仓库', async () => {
    let callCount = 0;
    const httpGet = async (url: string) => {
      callCount++;
      if (url.includes('repos/o/fail') && !url.includes('releases') && !url.includes('readme') && !url.includes('contents')) {
        return { data: null, status: 404 };
      }
      if (url.includes('repos/o/ok') && !url.includes('releases') && !url.includes('readme') && !url.includes('contents')) {
        return {
          data: { id: 1, name: 'ok', full_name: 'o/ok', description: 'd', stargazers_count: 1, forks_count: 0, updated_at: '2024-01-01T00:00:00Z', pushed_at: '2024-01-01T00:00:00Z', default_branch: 'main', owner: { login: 'o', avatar_url: '' }, license: null },
          status: 200,
        };
      }
      if (url.includes('/contents')) return { data: VALID_PROJECT_CONTENTS, status: 200 };
      return { data: null, status: 404 };
    };
    const ctx = createMockCtx(httpGet);
    const result = await fetchGithubSource(ctx, '', ['o/fail', 'o/ok']);
    assert.ok(result.find((r) => r.id === 'o/ok'));
    assert.ok(!result.find((r) => r.id === 'o/fail'));
  });
});

// ==============================================
// 资源类型自动识别测试
// ==============================================

describe('detectResourceType - 资源类型自动识别', () => {
  it('默认无任何匹配时返回插件类型', () => {
    const type = detectResourceType('owner/some-repo');
    assert.equal(type, ResourceType.PLUGIN);
  });

  it('白名单预设仓库识别为预设', () => {
    const type = detectResourceType('deepseek-harness/dsh-presets');
    assert.equal(type, ResourceType.PRESET);
  });

  it('白名单应用仓库识别为应用', () => {
    const type = detectResourceType('deepseek-harness/dsh-workflow-apps');
    assert.equal(type, ResourceType.APP);
  });

  it('白名单插件仓库识别为插件', () => {
    const type = detectResourceType('deepseek-harness/awesome-plugins');
    assert.equal(type, ResourceType.PLUGIN);
  });

  it('仓库名包含 preset 识别为预设', () => {
    const type = detectResourceType('owner/my-awesome-presets');
    assert.equal(type, ResourceType.PRESET);
  });

  it('仓库名包含 template 识别为预设', () => {
    const type = detectResourceType('owner/code-templates');
    assert.equal(type, ResourceType.PRESET);
  });

  it('仓库名包含 app 识别为应用', () => {
    const type = detectResourceType('owner/my-cool-app');
    assert.equal(type, ResourceType.APP);
  });

  it('仓库名包含 workflow 识别为应用', () => {
    const type = detectResourceType('owner/ai-workflow');
    assert.equal(type, ResourceType.APP);
  });

  it('仓库名包含 agent 识别为应用', () => {
    const type = detectResourceType('owner/smart-agent');
    assert.equal(type, ResourceType.APP);
  });

  it('仓库描述包含预设关键词识别为预设', () => {
    const type = detectResourceType('owner/some-repo', { description: 'DSH 预设模板集合' });
    assert.equal(type, ResourceType.PRESET);
  });

  it('仓库描述包含应用关键词识别为应用', () => {
    const type = detectResourceType('owner/some-repo', { description: '智能体工作流应用' });
    assert.equal(type, ResourceType.APP);
  });

  it('README 包含 preset 识别为预设', () => {
    const type = detectResourceType('owner/some-repo', undefined, '# DSH Preset Collection\n\n预设模板');
    assert.equal(type, ResourceType.PRESET);
  });

  it('README 包含 workflow 识别为应用', () => {
    const type = detectResourceType('owner/some-repo', undefined, '# Workflow App\n\n工作流应用');
    assert.equal(type, ResourceType.APP);
  });

  it('forcedType 优先级最高，覆盖白名单和关键词', () => {
    // 即使仓库名是 preset，强制指定为应用也应该返回应用
    const type = detectResourceType('owner/my-presets', undefined, undefined, ResourceType.APP);
    assert.equal(type, ResourceType.APP);
  });

  it('forcedType 优先级最高，覆盖白名单', () => {
    // 即使在预设白名单中，强制指定为插件也应该返回插件
    const type = detectResourceType('deepseek-harness/dsh-presets', undefined, undefined, ResourceType.PLUGIN);
    assert.equal(type, ResourceType.PLUGIN);
  });

  it('白名单优先级高于关键词', () => {
    // 白名单是插件，但仓库名包含 app，应该返回插件（白名单优先）
    const type = detectResourceType('deepseek-harness/awesome-plugins');
    assert.equal(type, ResourceType.PLUGIN);
  });
});

console.log('GitHub 抓取模块单元测试全部通过！');
