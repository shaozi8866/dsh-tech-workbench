/**
 * DSH 科技风工作台 - 本地已安装插件读取模块
 * 从 ~/.dsh/profiles/<profile>/node_modules/ 读取已安装的插件列表
 * 作为主数据源（替代不存在的 Market API）
 */

import {
  ResourceType,
  SourceType,
  StandardResource,
} from './types';
import { createDefaultResource, isValidSemver } from './utils';
import { classifyResource } from './category-classifier';
import type { WorkbenchContext } from './market-fetcher';
import * as path from 'path';

/**
 * 读取本地已安装的插件列表
 * @param ctx 工作台上下文
 * @returns 标准化后的本地插件资源列表
 */
export async function fetchLocalInstalledPlugins(
  ctx: WorkbenchContext,
): Promise<StandardResource[]> {
  const result: StandardResource[] = [];

  try {
    // DSH profile 的 node_modules 目录
    // 通常在 ~/.dsh/profiles/web/node_modules/
    const profileDir = path.join(ctx.env.DSH_HOME, 'profiles', 'web');
    const nodeModulesDir = path.join(profileDir, 'node_modules');

    ctx.logger?.info(`[Local] 开始读取本地已安装插件: ${nodeModulesDir}`);

    // 检查目录是否存在
    if (!(await ctx.fs.exists(nodeModulesDir))) {
      ctx.logger?.warn(`[Local] node_modules 目录不存在: ${nodeModulesDir}`);
      return result;
    }

    // 读取 package.json 获取依赖列表（更准确）
    const packageJsonPath = path.join(profileDir, 'package.json');
    let dependencies: Record<string, string> = {};

    if (await ctx.fs.exists(packageJsonPath)) {
      try {
        const packageJsonRaw = await ctx.fs.readFile(packageJsonPath, 'utf8');
        const packageJson = JSON.parse(packageJsonRaw);
        dependencies = {
          ...(packageJson.dependencies || {}),
          ...(packageJson.devDependencies || {}),
        };
        ctx.logger?.info(`[Local] 从 package.json 读取到 ${Object.keys(dependencies).length} 个依赖`);
      } catch (err) {
        ctx.logger?.warn('[Local] 读取 package.json 失败', err);
      }
    }

    // 遍历每个依赖，读取其 package.json 获取详细信息
    let scanned = 0;
    let skipped = 0;

    for (const [pkgName, pkgVersion] of Object.entries(dependencies)) {
      scanned++;

      try {
        // 跳过非 DSH 插件（react、react-dom 等）
        if (isCoreDependency(pkgName)) {
          skipped++;
          continue;
        }

        // 读取插件的 package.json
        const pluginPackageJsonPath = path.join(nodeModulesDir, pkgName, 'package.json');
        if (!(await ctx.fs.exists(pluginPackageJsonPath))) {
          skipped++;
          continue;
        }

        const pluginRaw = await ctx.fs.readFile(pluginPackageJsonPath, 'utf8');
        const pluginPkg = JSON.parse(pluginRaw);

        // 提取插件信息
        const name = pluginPkg.name || pkgName;
        const version = pluginPkg.version || pkgVersion || '0.0.0';
        const description = pluginPkg.description || '';
        const author = typeof pluginPkg.author === 'string'
          ? pluginPkg.author
          : pluginPkg.author?.name || 'unknown';

        // 判断资源类型
        const type = detectResourceType(name, description, pluginPkg);

        // 自动分类（基于名称、描述、关键词）
        const category = classifyResource(
          name,
          description,
          pluginPkg.keywords || [],
        );

        // 跳过版本非法的
        if (!isValidSemver(version)) {
          skipped++;
          continue;
        }

        // 创建标准化资源
        // 从 package.json 获取 homepage 字段
        const localHomepage = pluginPkg.homepage || pluginPkg.repository?.url || '';
        // 如果 homepage 是 git+https 格式，转换为 https 格式
        let homepage = localHomepage;
        if (homepage.startsWith('git+')) {
          homepage = homepage.replace('git+', '').replace('.git', '');
        }
        // 如果没有 homepage，生成 npm 包页面链接
        if (!homepage || !homepage.startsWith('http')) {
          homepage = `https://www.npmjs.com/package/${encodeURIComponent(name)}`;
        }

        const resource = createDefaultResource({
          id: name,
          name: pluginPkg.displayName || name,
          type,
          category: pluginPkg.category || category,
          description: description || '本地已安装插件',
          author,
          source: SourceType.LOCAL,
          isOfficial: false,
          isInstalled: true,
          latestVersion: version,
          localVersion: version,
          adaptVersion: pluginPkg.engines?.dsh || 'all',
          updateTime: Date.now(),
          star: 0,
          fork: 0,
          installCmd: `dsh plugin --profile web add ${name}`,
          homepage, // 源网站链接
          configPath: '',
        });

        result.push(resource);
      } catch (err) {
        ctx.logger?.warn(`[Local] 读取插件 ${pkgName} 失败`, err);
        skipped++;
      }
    }

    ctx.logger?.info(`[Local] 读取完成：扫描 ${scanned} 个，跳过 ${skipped} 个，有效 ${result.length} 个`);

    // 打印前几个插件名称，方便调试
    if (result.length > 0) {
      const names = result.slice(0, 10).map((r) => r.name);
      ctx.logger?.info(`[Local] 前10个插件: ${names.join(', ')}`);
    }

    return result;
  } catch (err) {
    ctx.logger?.warn('[Local] 读取本地插件失败，降级为空列表', err);
    return result;
  }
}

/**
 * 判断是否是核心依赖（非 DSH 插件）
 */
function isCoreDependency(name: string): boolean {
  const coreDeps = [
    'react',
    'react-dom',
    'react-is',
    'scheduler',
    'loose-envify',
    'js-tokens',
    '@deepseek-ai',
  ];
  return coreDeps.some((dep) => name === dep || name.startsWith(dep + '/'));
}

/**
 * 根据包名和描述判断资源类型
 */
function detectResourceType(
  name: string,
  description: string,
  pkg: any,
): ResourceType {
  // 优先使用 package.json 中的 type 字段
  if (pkg.dsh?.type) {
    switch (pkg.dsh.type) {
      case 'plugin':
        return ResourceType.PLUGIN;
      case 'preset':
        return ResourceType.PRESET;
      case 'app':
        return ResourceType.APP;
      case 'skill':
        return ResourceType.SKILL;
    }
  }

  // 根据包名判断
  const lowerName = name.toLowerCase();
  if (lowerName.includes('preset') || lowerName.includes('template')) {
    return ResourceType.PRESET;
  }
  if (lowerName.includes('app') || lowerName.includes('agent') || lowerName.includes('workflow')) {
    return ResourceType.APP;
  }
  if (lowerName.includes('skill')) {
    return ResourceType.SKILL;
  }

  // 默认是插件
  return ResourceType.PLUGIN;
}
