/**
 * 将生成的描述更新到 resource-meta-database.ts 中
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取生成的描述
const generatedPath = path.join(__dirname, 'generated-descriptions-final.json');
const generatedPlugins = JSON.parse(fs.readFileSync(generatedPath, 'utf-8'));

console.log(`共加载 ${generatedPlugins.length} 个生成的描述\n`);

// 读取数据库文件
const dbPath = path.join(__dirname, '..', 'src', 'host', 'resource-meta-database.ts');
let dbContent = fs.readFileSync(dbPath, 'utf-8');

// 找到 PLUGIN_META_DATABASE 的结束位置（在最后一个 } 之前）
// 我们需要在数据库末尾添加新的条目

// 找到数据库对象的结束位置
const dbEndMatch = dbContent.match(/^};\s*$/m);
if (!dbEndMatch) {
  console.error('无法找到数据库结束位置');
  process.exit(1);
}

const dbEndIndex = dbContent.lastIndexOf('};');
if (dbEndIndex === -1) {
  console.error('无法找到数据库结束位置');
  process.exit(1);
}

console.log(`数据库结束位置: ${dbEndIndex}\n`);

// 生成新的条目
let newEntries = '';
let addedCount = 0;

for (const plugin of generatedPlugins) {
  // 检查是否已存在
  const idRegex = new RegExp(`'${plugin.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}':\\s*\\{`);
  if (idRegex.test(dbContent)) {
    console.log(`  ⚠ 已存在，跳过: ${plugin.id}`);
    continue;
  }

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

console.log(`\n准备添加 ${addedCount} 个新条目\n`);

// 在数据库结束位置之前插入新条目
const updatedContent = dbContent.substring(0, dbEndIndex) + newEntries + dbContent.substring(dbEndIndex);

// 写回文件
fs.writeFileSync(dbPath, updatedContent, 'utf-8');

console.log(`=== 更新完成 ===`);
console.log(`成功添加: ${addedCount} 个新条目`);
console.log(`数据库总条目数: ${248 + addedCount}`);
