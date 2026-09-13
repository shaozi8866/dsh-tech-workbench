/**
 * DSH Workbench - Homepage 链接探测与修复脚本
 *
 * 功能：
 * 1. 读取资源描述数据库中的所有 homepage 链接
 * 2. 并发探测每个链接的 HTTP 状态码
 * 3. 对于无效链接，尝试从 npm registry 获取正确的 homepage
 * 4. 生成修复报告
 */

import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM 模块中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const CONCURRENCY = 10; // 并发请求数
const TIMEOUT = 8000; // 超时时间（毫秒）
const RETRY_TIMES = 2; // 重试次数

// 结果类型
interface ProbeResult {
  id: string;
  name: string;
  originalHomepage: string;
  status: 'valid' | 'invalid' | 'timeout' | 'error' | 'redirect';
  statusCode?: number;
  finalUrl?: string;
  fixedHomepage?: string;
  fixMethod?: string;
  error?: string;
}

/**
 * 探测单个 URL
 */
function probeUrl(url: string): Promise<{ status: string; statusCode?: number; finalUrl?: string; error?: string }> {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;

    const req = client.get(url, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      maxRedirects: 5,
    } as any, (res) => {
      const statusCode = res.statusCode || 0;

      // 处理重定向
      if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
        resolve({ status: 'redirect', statusCode, finalUrl: res.headers.location as string });
        return;
      }

      // 有效状态码
      if (statusCode >= 200 && statusCode < 400) {
        resolve({ status: 'valid', statusCode });
      } else {
        resolve({ status: 'invalid', statusCode });
      }

      // 消耗响应体，避免内存泄漏
      res.resume();
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 'timeout', error: 'Request timeout' });
    });

    req.on('error', (err) => {
      resolve({ status: 'error', error: err.message });
    });
  });
}

/**
 * 带重试的 URL 探测
 */
async function probeUrlWithRetry(url: string): Promise<{ status: string; statusCode?: number; finalUrl?: string; error?: string }> {
  let lastResult: any;
  for (let i = 0; i <= RETRY_TIMES; i++) {
    lastResult = await probeUrl(url);
    if (lastResult.status === 'valid' || lastResult.status === 'redirect') {
      return lastResult;
    }
    // 等待后重试
    if (i < RETRY_TIMES) {
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  return lastResult;
}

/**
 * 从 npm registry 获取包信息
 */
async function getNpmPackageInfo(packageName: string): Promise<any> {
  return new Promise((resolve) => {
    const encodedName = packageName.startsWith('@')
      ? `@${encodeURIComponent(packageName.substring(1))}`
      : encodeURIComponent(packageName);

    const url = `https://registry.npmjs.org/${encodedName}`;

    https.get(url, {
      timeout: TIMEOUT,
      headers: { 'User-Agent': 'dsh-workbench-probe' },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

/**
 * 尝试修复 homepage
 */
async function fixHomepage(id: string, originalHomepage: string): Promise<{ homepage: string; method: string } | null> {
  // 方法1：如果是 npm 包，从 npm registry 获取
  const packageName = id;
  try {
    const pkgInfo = await getNpmPackageInfo(packageName);
    if (pkgInfo) {
      // 优先使用 homepage 字段
      if (pkgInfo.homepage && typeof pkgInfo.homepage === 'string' && pkgInfo.homepage.startsWith('http')) {
        return { homepage: pkgInfo.homepage, method: 'npm registry homepage' };
      }

      // 其次使用 repository.url
      if (pkgInfo.repository && pkgInfo.repository.url) {
        let repoUrl = pkgInfo.repository.url;
        // 转换 git+https 格式
        if (repoUrl.startsWith('git+')) {
          repoUrl = repoUrl.replace('git+', '').replace('.git', '');
        }
        if (repoUrl.startsWith('http')) {
          return { homepage: repoUrl, method: 'npm registry repository' };
        }
      }

      // 最后生成 npm 包页面链接
      return {
        homepage: `https://www.npmjs.com/package/${encodeURIComponent(packageName)}`,
        method: 'npm package page fallback',
      };
    }
  } catch (e) {
    // 忽略错误
  }

  // 方法2：如果原始链接是 GitHub，尝试修复格式
  if (originalHomepage.includes('github.com')) {
    // 尝试提取 owner/repo
    const match = originalHomepage.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
    if (match) {
      const owner = match[1];
      const repo = match[2].replace('.git', '');
      return {
        homepage: `https://github.com/${owner}/${repo}`,
        method: 'GitHub URL format fix',
      };
    }
  }

  return null;
}

/**
 * 并发控制的任务执行器
 */
async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
  const results: T[] = [];
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const currentIndex = index++;
      results[currentIndex] = await tasks[currentIndex]();
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * 主函数
 */
async function main() {
  console.log('=== DSH Workbench Homepage 探测与修复脚本 ===\n');

  // 读取数据库文件
  const dbPath = path.join(__dirname, '..', 'src', 'host', 'resource-meta-database.ts');
  const dbContent = fs.readFileSync(dbPath, 'utf-8');

  // 提取所有 id 和 homepage（简单的正则提取）
  const entries: { id: string; name: string; homepage: string }[] = [];
  const idRegex = /'([^']+)':\s*{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',[^}]*homepage:\s*'([^']+)'/g;
  let match;
  while ((match = idRegex.exec(dbContent)) !== null) {
    entries.push({
      id: match[1],
      name: match[3],
      homepage: match[4],
    });
  }

  console.log(`共提取到 ${entries.length} 条资源记录\n`);

  // 创建探测任务
  const tasks = entries.map((entry) => async (): Promise<ProbeResult> => {
    const result: ProbeResult = {
      id: entry.id,
      name: entry.name,
      originalHomepage: entry.homepage,
      status: 'error',
    };

    try {
      // 探测原始链接
      const probeResult = await probeUrlWithRetry(entry.homepage);
      result.status = probeResult.status as any;
      result.statusCode = probeResult.statusCode;
      result.finalUrl = probeResult.finalUrl;
      result.error = probeResult.error;

      // 如果无效，尝试修复
      if (probeResult.status !== 'valid' && probeResult.status !== 'redirect') {
        const fixResult = await fixHomepage(entry.id, entry.homepage);
        if (fixResult) {
          result.fixedHomepage = fixResult.homepage;
          result.fixMethod = fixResult.method;

          // 验证修复后的链接
          const verifyResult = await probeUrl(fixResult.homepage);
          if (verifyResult.status === 'valid' || verifyResult.status === 'redirect') {
            console.log(`  ✓ [FIXED] ${entry.id}: ${entry.homepage} -> ${fixResult.homepage} (${fixResult.method})`);
          } else {
            console.log(`  ⚠ [FIX UNVERIFIED] ${entry.id}: ${fixResult.homepage} (${fixResult.method}, status: ${verifyResult.status})`);
          }
        } else {
          console.log(`  ✗ [UNFIXABLE] ${entry.id}: ${entry.homepage} (status: ${probeResult.status})`);
        }
      } else {
        console.log(`  ✓ [VALID] ${entry.id}: ${entry.homepage} (status: ${probeResult.statusCode})`);
      }
    } catch (e: any) {
      result.error = e.message;
      console.log(`  ✗ [ERROR] ${entry.id}: ${e.message}`);
    }

    return result;
  });

  console.log('开始探测...\n');
  const results = await runWithConcurrency(tasks, CONCURRENCY);

  // 统计结果
  const validCount = results.filter(r => r.status === 'valid' || r.status === 'redirect').length;
  const invalidCount = results.filter(r => r.status === 'invalid').length;
  const timeoutCount = results.filter(r => r.status === 'timeout').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const fixedCount = results.filter(r => r.fixedHomepage).length;

  console.log('\n=== 探测结果统计 ===');
  console.log(`总计: ${results.length}`);
  console.log(`有效: ${validCount}`);
  console.log(`无效(404等): ${invalidCount}`);
  console.log(`超时: ${timeoutCount}`);
  console.log(`错误: ${errorCount}`);
  console.log(`已修复: ${fixedCount}`);

  // 生成修复报告
  const reportPath = path.join(__dirname, 'homepage-fix-report.json');
  const report = {
    generatedAt: new Date().toISOString(),
    stats: {
      total: results.length,
      valid: validCount,
      invalid: invalidCount,
      timeout: timeoutCount,
      error: errorCount,
      fixed: fixedCount,
    },
    results: results,
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\n修复报告已保存到: ${reportPath}`);

  // 生成需要更新的条目列表
  const needUpdate = results.filter(r => r.fixedHomepage && r.fixedHomepage !== r.originalHomepage);
  if (needUpdate.length > 0) {
    console.log('\n=== 需要更新的 homepage ===');
    needUpdate.forEach(r => {
      console.log(`  ${r.id}:`);
      console.log(`    原: ${r.originalHomepage}`);
      console.log(`    新: ${r.fixedHomepage} (${r.fixMethod})`);
    });

    // 生成更新脚本
    const updateScriptPath = path.join(__dirname, 'update-homepage.ts');
    const updateScript = `/**
 * 自动生成的 homepage 更新脚本
 * 生成时间: ${new Date().toISOString()}
 * 需要更新的条目数: ${needUpdate.length}
 */

export const HOMEPAGE_UPDATES: Record<string, string> = {
${needUpdate.map(r => `  '${r.id}': '${r.fixedHomepage}', // ${r.fixMethod}`).join('\n')}
};
`;
    fs.writeFileSync(updateScriptPath, updateScript, 'utf-8');
    console.log(`\n更新脚本已保存到: ${updateScriptPath}`);
  }

  return results;
}

main().catch(console.error);
