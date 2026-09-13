/**
 * 合并两部分详细描述并更新到数据库中
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取两部分详细描述
const part1Path = path.join(__dirname, 'detailed-descriptions.json');
const part2Path = path.join(__dirname, 'detailed-descriptions-part2.json');

const part1 = JSON.parse(fs.readFileSync(part1Path, 'utf-8'));
const part2 = JSON.parse(fs.readFileSync(part2Path, 'utf-8'));

// 合并并去重
const allDetailed = [...part1, ...part2];
const seen = new Set();
const uniqueDetailed = allDetailed.filter((p: any) => {
  if (seen.has(p.id)) return false;
  seen.add(p.id);
  return true;
});

console.log(`第一部分: ${part1.length} 个`);
console.log(`第二部分: ${part2.length} 个`);
console.log(`合并后总计: ${allDetailed.length} 个`);
console.log(`去重后总计: ${uniqueDetailed.length} 个\n`);

// 保存合并后的完整描述
const mergedPath = path.join(__dirname, 'detailed-descriptions-full.json');
fs.writeFileSync(mergedPath, JSON.stringify(uniqueDetailed, null, 2), 'utf-8');
console.log(`已保存合并后的完整描述到: ${mergedPath}\n`);

// 读取数据库文件
const dbPath = path.join(__dirname, '..', 'src', 'host', 'resource-meta-database.ts');
let dbContent = fs.readFileSync(dbPath, 'utf-8');

// 先删除之前添加的所有详细描述条目（第一部分已经添加了）
let deletedCount = 0;
for (const plugin of uniqueDetailed) {
  const idRegex = new RegExp(`\\s*'${plugin.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}':\\s*\\{[^}]*\\},\\s*`, 's');
  if (idRegex.test(dbContent)) {
    dbContent = dbContent.replace(idRegex, '\n');
    deletedCount++;
  }
}

console.log(`已删除 ${deletedCount} 个旧条目\n`);

// 找到数据库对象的结束位置
const dbEndIndex = dbContent.lastIndexOf('};');
if (dbEndIndex === -1) {
  console.error('无法找到数据库结束位置');
  process.exit(1);
}

// 生成新的详细描述条目
let newEntries = '';
let addedCount = 0;

for (const plugin of uniqueDetailed) {
  // 生成标签字符串
  const tagsStr = plugin.tags && plugin.tags.length > 0
    ? `[${plugin.tags.map((t: string) => `'${t}'`).join(', ')}]`
    : '[]';

  // 生成新条目
  const entry = `  '${plugin.id}': {
    id: '${plugin.id}',
    name: '${plugin.name}',
    description: '${plugin.description.replace(/'/g, "\\'")}',
    homepage: '${plugin.homepage}',
    category: '${plugin.category}',
    icon: '${plugin.icon}',
    tags: ${tagsStr},
  },
`;

  newEntries += entry;
  addedCount++;
}

console.log(`准备添加 ${addedCount} 个详细描述条目\n`);

// 在数据库结束位置之前插入新条目
const updatedContent = dbContent.substring(0, dbEndIndex) + newEntries + dbContent.substring(dbEndIndex);

// 写回文件
fs.writeFileSync(dbPath, updatedContent, 'utf-8');

console.log(`=== 更新完成 ===`);
console.log(`删除旧条目: ${deletedCount}`);
console.log(`添加新条目: ${addedCount}`);
console.log(`数据库总条目数: ${248 + addedCount}`);
