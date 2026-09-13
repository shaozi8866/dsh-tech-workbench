/**
 * 找出还没有描述的插件，并获取它们的英文描述
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. 读取当前数据库中的所有插件 ID
const dbPath = path.join(__dirname, '..', 'src', 'host', 'resource-meta-database.ts');
const dbContent = fs.readFileSync(dbPath, 'utf-8');

const existingIds = new Set<string>();
const idRegex = /'([^']+)':\s*{\s*id:\s*'([^']+)'/g;
let match;
while ((match = idRegex.exec(dbContent)) !== null) {
  existingIds.add(match[1]);
}

console.log(`当前数据库中已有 ${existingIds.size} 个插件描述\n`);

// 2. 读取 workbench-data.json
const dataPath = 'D:\\Users\\Flora\\桌面\\workbench-data.json';
const dataContent = fs.readFileSync(dataPath, 'utf-8');
const data = JSON.parse(dataContent);

const plugins = data.data.plugins || [];
console.log(`抓取数据中共有 ${plugins.length} 个插件\n`);

// 3. 找出还没有描述的插件
const missingPlugins = plugins.filter((p: any) => !existingIds.has(p.id));
console.log(`还没有描述的插件: ${missingPlugins.length} 个\n`);

// 4. 选择前 200 个，并按分类排序
const selectedPlugins = missingPlugins.slice(0, 200);

// 5. 输出这些插件的信息
console.log('=== 前 200 个需要补充描述的插件 ===\n');

const output: any[] = [];
for (const plugin of selectedPlugins) {
  output.push({
    id: plugin.id,
    name: plugin.name,
    description: plugin.description || '',
    author: plugin.author || 'unknown',
    source: plugin.source || 'unknown',
    latestVersion: plugin.latestVersion || '',
    category: plugin.category || 'community',
  });
}

// 保存到文件
const outputPath = path.join(__dirname, 'missing-descriptions.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
console.log(`已保存到: ${outputPath}`);

// 按来源统计
const sourceStats: Record<string, number> = {};
for (const p of output) {
  sourceStats[p.source] = (sourceStats[p.source] || 0) + 1;
}
console.log('\n=== 按来源统计 ===');
for (const [source, count] of Object.entries(sourceStats)) {
  console.log(`  ${source}: ${count}`);
}

// 输出前 20 个的信息
console.log('\n=== 前 20 个插件信息 ===');
for (let i = 0; i < Math.min(20, output.length); i++) {
  const p = output[i];
  console.log(`\n${i + 1}. ${p.id}`);
  console.log(`   名称: ${p.name}`);
  console.log(`   作者: ${p.author}`);
  console.log(`   来源: ${p.source}`);
  console.log(`   版本: ${p.latestVersion}`);
  console.log(`   描述: ${p.description.substring(0, 100)}${p.description.length > 100 ? '...' : ''}`);
}
