/**
 * 自动更新 resource-meta-database.ts 中的 homepage 字段
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取更新列表
const updateContent = fs.readFileSync(path.join(__dirname, 'update-homepage.ts'), 'utf-8');

// 解析更新列表（简单的正则提取）
const updates: Record<string, string> = {};
const updateRegex = /'([^']+)':\s*'([^']+)'/g;
let match;
while ((match = updateRegex.exec(updateContent)) !== null) {
  updates[match[1]] = match[2];
}

console.log(`共加载 ${Object.keys(updates).length} 个 homepage 更新\n`);

// 读取数据库文件
const dbPath = path.join(__dirname, '..', 'src', 'host', 'resource-meta-database.ts');
let dbContent = fs.readFileSync(dbPath, 'utf-8');

// 逐个更新 homepage
let updatedCount = 0;
for (const [id, newHomepage] of Object.entries(updates)) {
  // 匹配该 id 对应的 homepage 字段
  // 格式：'id': { ..., homepage: 'old-url', ... }
  const idRegex = new RegExp(`('${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}':\\s*\\{[^}]*?homepage:\\s*)'[^']*'`, 's');
  const idMatch = dbContent.match(idRegex);

  if (idMatch) {
    const oldHomepage = idMatch[0].match(/homepage:\s*'([^']*)'/)?.[1];
    if (oldHomepage !== newHomepage) {
      dbContent = dbContent.replace(idRegex, `$1'${newHomepage}'`);
      updatedCount++;
      console.log(`  ✓ ${id}: ${oldHomepage} -> ${newHomepage}`);
    }
  } else {
    console.log(`  ⚠ 未找到 ${id}`);
  }
}

// 写回文件
fs.writeFileSync(dbPath, dbContent, 'utf-8');

console.log(`\n=== 更新完成 ===`);
console.log(`成功更新: ${updatedCount} 个 homepage`);
