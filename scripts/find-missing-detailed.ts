/**
 * 找出还没有详细描述的插件
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取所有缺失描述的插件
const missingPath = path.join(__dirname, 'missing-descriptions.json');
const missingPlugins = JSON.parse(fs.readFileSync(missingPath, 'utf-8'));

// 读取已生成的详细描述
const detailedPath = path.join(__dirname, 'detailed-descriptions.json');
const detailedPlugins = JSON.parse(fs.readFileSync(detailedPath, 'utf-8'));

const detailedIds = new Set(detailedPlugins.map((p: any) => p.id));

// 找出还没有详细描述的插件
const missingDetailed = missingPlugins.filter((p: any) => !detailedIds.has(p.id));

console.log(`总缺失描述插件: ${missingPlugins.length}`);
console.log(`已有详细描述: ${detailedPlugins.length}`);
console.log(`还需生成详细描述: ${missingDetailed.length}\n`);

console.log('=== 还需生成详细描述的插件 ===\n');
for (let i = 0; i < missingDetailed.length; i++) {
  const p = missingDetailed[i];
  console.log(`${i + 1}. ${p.id}`);
  console.log(`   描述: ${p.description.substring(0, 100)}${p.description.length > 100 ? '...' : ''}`);
  console.log();
}

// 保存到文件
const outputPath = path.join(__dirname, 'missing-detailed.json');
fs.writeFileSync(outputPath, JSON.stringify(missingDetailed, null, 2), 'utf-8');
console.log(`已保存到: ${outputPath}`);
