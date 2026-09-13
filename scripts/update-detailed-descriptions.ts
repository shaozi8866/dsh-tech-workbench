/**
 * 将详细描述更新到 resource-meta-database.ts 中
 * 先删除之前添加的通用描述，然后添加详细描述
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取详细描述
const detailedPath = path.join(__dirname, 'detailed-descriptions.json');
const detailedPlugins = JSON.parse(fs.readFileSync(detailedPath, 'utf-8'));

console.log(`共加载 ${detailedPlugins.length} 个详细描述\n`);

// 读取数据库文件
const dbPath = path.join(__dirname, '..', 'src', 'host', 'resource-meta-database.ts');
let dbContent = fs.readFileSync(dbPath, 'utf-8');

// 找到数据库对象的结束位置
const dbEndIndex = dbContent.lastIndexOf('};');
if (dbEndIndex === -1) {
  console.error('无法找到数据库结束位置');
  process.exit(1);
}

// 先删除之前添加的 200 个通用描述
// 这些描述是在之前添加的，我们需要找到它们并删除
// 简单方法：找到数据库中所有 id 在 detailedPlugins 中的条目，删除它们
let deletedCount = 0;
for (const plugin of detailedPlugins) {
  const idRegex = new RegExp(`\\s*'${plugin.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}':\\s*\\{[^}]*\\},\\s*`, 's');
  if (idRegex.test(dbContent)) {
    dbContent = dbContent.replace(idRegex, '\n');
    deletedCount++;
  }
}

console.log(`已删除 ${deletedCount} 个旧条目\n`);

// 重新找到数据库对象的结束位置
const newDbEndIndex = dbContent.lastIndexOf('};');
if (newDbEndIndex === -1) {
  console.error('删除后无法找到数据库结束位置');
  process.exit(1);
}

// 生成新的详细描述条目
let newEntries = '';
let addedCount = 0;

for (const plugin of detailedPlugins) {
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
const updatedContent = dbContent.substring(0, newDbEndIndex) + newEntries + dbContent.substring(newDbEndIndex);

// 写回文件
fs.writeFileSync(dbPath, updatedContent, 'utf-8');

console.log(`=== 更新完成 ===`);
console.log(`删除旧条目: ${deletedCount}`);
console.log(`添加新条目: ${addedCount}`);
console.log(`数据库总条目数: ${248 + addedCount}`);
