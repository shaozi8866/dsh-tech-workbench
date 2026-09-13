/**
 * 基于英文描述批量生成中文功能描述（最终版）
 * 改进中文描述提取和分类
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取缺失描述的插件列表
const missingPath = path.join(__dirname, 'missing-descriptions.json');
const missingPlugins = JSON.parse(fs.readFileSync(missingPath, 'utf-8'));

console.log(`共加载 ${missingPlugins.length} 个插件\n`);

// 分类规则（按优先级排序）
const CATEGORY_RULES: { category: string; icon: string; keywords: string[] }[] = [
  { category: '费用统计', icon: '💰', keywords: ['cost', 'usage', 'quota', 'balance', 'wallet', 'meter', 'token', '费用', '用量', '配额', '余额'] },
  { category: '视觉图像', icon: '🖼️', keywords: ['vision', 'image', 'ocr', 'pixel', 'artifacts', '视觉', '图像', '图片', '识别', '看图'] },
  { category: '记忆上下文', icon: '🧠', keywords: ['memory', 'context', 'recall', 'ledger', '记忆', '上下文', '回忆'] },
  { category: '会话管理', icon: '💬', keywords: ['session', 'conversation', 'chat', 'rewind', 'history', 'archive', 'turn', '会话', '对话', '聊天', '回退', '历史'] },
  { category: '通知提醒', icon: '🔔', keywords: ['notify', 'notification', 'reminder', 'alert', '通知', '提醒', '推送'] },
  { category: '插件市场', icon: '🏪', keywords: ['market', 'marketplace', 'plugin manager', 'store', 'catalog', '市场', '插件管理', '商店'] },
  { category: '自动化任务', icon: '🤖', keywords: ['automation', 'auto', 'schedule', 'cron', 'task', '自动化', '定时', '任务'] },
  { category: '模型提供商', icon: '🧩', keywords: ['provider', 'llm', 'model provider', 'command code', '模型', '提供商'] },
  { category: '更新管理', icon: '🔄', keywords: ['update', 'upgrade', 'version', 'checker', '更新', '升级', '版本'] },
  { category: '写作辅助', icon: '✍️', keywords: ['writing', 'write', 'document', 'paper', 'research', 'zotero', '写作', '文档', '论文', '研究'] },
  { category: '角色扮演', icon: '🎭', keywords: ['roleplay', 'role play', 'character', 'tavern', 'worldbook', '角色扮演', '角色', '人物'] },
  { category: '消息编辑', icon: '✏️', keywords: ['edit', 'rewrite', 'recall message', 'message recall', '编辑', '重写', '撤回消息', '消息撤回'] },
  { category: '搜索联网', icon: '🔎', keywords: ['search', 'web search', 'browser', 'fetch', 'crawl', 'scrape', 'internet', '搜索', '网页搜索', '浏览器', '联网'] },
  { category: '开发工具', icon: '🛠️', keywords: ['dev', 'tool', 'cli', 'debug', 'test', 'ssh', '开发', '工具', '调试', '测试'] },
  { category: 'UI界面', icon: '🎨', keywords: ['ui', 'skin', 'theme', 'interface', 'design', 'tweaks', '界面', '皮肤', '主题', '设计'] },
  { category: '数据同步', icon: '🔄', keywords: ['sync', 'backup', 'restore', '同步', '备份', '恢复'] },
  { category: '安全权限', icon: '🔒', keywords: ['auth', 'security', 'permission', 'guard', '认证', '安全', '权限'] },
  { category: '办公效率', icon: '📊', keywords: ['office', 'excel', 'sheet', 'doc', 'pdf', '办公', '表格', '文档'] },
  { category: '其他', icon: '📦', keywords: [] },
];

// 标签规则
const TAG_RULES: { tag: string; keywords: string[] }[] = [
  { tag: '免费', keywords: ['free', '免费', '无需', 'no api', 'zero', 'free-tier'] },
  { tag: '多引擎', keywords: ['multi', 'multiple', '多引擎', '多渠道', 'multi-engine'] },
  { tag: '本地优先', keywords: ['local', '本地', 'offline', 'local-first'] },
  { tag: '开源', keywords: ['open source', '开源', 'mit', 'apache'] },
  { tag: '轻量', keywords: ['lightweight', 'light', '轻量', '零依赖', 'zero-dependency'] },
  { tag: 'Web UI', keywords: ['web', 'ui', 'gui', '界面', '设置页', 'web ui'] },
  { tag: 'API', keywords: ['api', 'service', '接口', 'notify()'] },
  { tag: '自动化', keywords: ['auto', 'automation', '自动'] },
  { tag: '可视化', keywords: ['visual', 'chart', 'graph', '可视化', '图表'] },
  { tag: '企业级', keywords: ['enterprise', '企业', '团队', '协作'] },
];

/**
 * 根据描述判断分类
 */
function detectCategory(id: string, description: string): { category: string; icon: string } {
  const lowerDesc = description.toLowerCase();
  const lowerId = id.toLowerCase();

  for (const rule of CATEGORY_RULES) {
    for (const keyword of rule.keywords) {
      if (lowerDesc.includes(keyword.toLowerCase()) || lowerId.includes(keyword.toLowerCase())) {
        return { category: rule.category, icon: rule.icon };
      }
    }
  }
  return { category: '其他', icon: '📦' };
}

/**
 * 根据描述生成标签
 */
function detectTags(description: string): string[] {
  const tags: string[] = [];
  const lowerDesc = description.toLowerCase();
  for (const rule of TAG_RULES) {
    for (const keyword of rule.keywords) {
      if (lowerDesc.includes(keyword.toLowerCase())) {
        if (!tags.includes(rule.tag)) {
          tags.push(rule.tag);
        }
        break;
      }
    }
  }
  return tags.slice(0, 4);
}

/**
 * 提取中文描述（改进版）
 */
function extractChineseDescription(description: string): string | null {
  // 清理描述
  let desc = description.replace(/\s+/g, ' ').trim();

  // 方法1：查找中文开头到英文分隔符（·、|、-、The、DSH、A、An）之间的部分
  const patterns = [
    // 中文开头，到 · 分隔符
    /([\u4e00-\u9fa5][^·|]*?)[\s]*[·|][\s]*(?:The|A|An|DSH|DeepSeek|$)/i,
    // 中文开头，到英文大写单词开头
    /([\u4e00-\u9fa5][\s\S]*?)(?=\s+(?:The|A|An|DSH|DeepSeek|Plugin|Provides|Supports|Integrates)[\s])/i,
    // 中文开头，到结尾
    /([\u4e00-\u9fa5][\s\S]*)/,
  ];

  for (const pattern of patterns) {
    const match = desc.match(pattern);
    if (match && match[1]) {
      let chinese = match[1].trim();
      // 清理末尾的标点和空格
      chinese = chinese.replace(/[\s，。、；：！？]+$/g, '');
      if (chinese.length >= 8) {
        return chinese.substring(0, 120);
      }
    }
  }

  return null;
}

/**
 * 生成中文功能描述
 */
function generateChineseDescription(id: string, enDescription: string, category: string): string {
  // 1. 优先提取中文描述
  const chineseDesc = extractChineseDescription(enDescription);
  if (chineseDesc) {
    return chineseDesc;
  }

  // 2. 基于分类生成通用描述
  const categoryDescriptions: Record<string, string> = {
    '搜索联网': 'DSH 网页搜索插件，提供多引擎搜索、网页抓取和内容摘要功能。',
    '视觉图像': 'DSH 视觉图像插件，支持图像理解、OCR识别、视觉问答等功能。',
    '记忆上下文': 'DSH 记忆上下文插件，提供长期记忆、上下文管理和智能回忆功能。',
    '会话管理': 'DSH 会话管理插件，提供对话历史、会话切换和上下文管理功能。',
    '通知提醒': 'DSH 通知推送插件，支持多渠道消息通知和任务提醒功能。',
    '插件市场': 'DSH 插件市场插件，提供插件浏览、搜索、安装和管理功能。',
    '自动化任务': 'DSH 自动化插件，支持定时任务、自动执行和工作流编排。',
    '模型提供商': 'DSH 模型提供商插件，集成第三方LLM服务，支持多模型切换。',
    '费用统计': 'DSH 费用统计插件，提供用量追踪、费用计算和配额管理功能。',
    '更新管理': 'DSH 更新管理插件，提供版本检查、自动更新和变更通知功能。',
    '写作辅助': 'DSH 写作辅助插件，提供文档生成、写作指导和内容优化功能。',
    '角色扮演': 'DSH 角色扮演插件，支持角色卡、世界观设定和剧情互动功能。',
    '消息编辑': 'DSH 消息编辑插件，支持消息撤回、重编辑和历史记录管理。',
    '开发工具': 'DSH 开发工具插件，提供调试、测试和代码辅助功能。',
    'UI界面': 'DSH 界面美化插件，提供主题切换、皮肤定制和UI优化功能。',
    '数据同步': 'DSH 数据同步插件，支持数据备份、恢复和多端同步功能。',
    '安全权限': 'DSH 安全权限插件，提供认证、授权和权限管理功能。',
    '办公效率': 'DSH 办公效率插件，提供文档处理、表格管理和办公自动化功能。',
    '其他': 'DSH 功能扩展插件，提供相关能力增强。',
  };

  return categoryDescriptions[category] || 'DSH 功能扩展插件，提供相关能力增强。';
}

// 生成所有插件的中文描述
const results: any[] = [];
for (const plugin of missingPlugins) {
  const { category, icon } = detectCategory(plugin.id, plugin.description);
  const tags = detectTags(plugin.description);
  const chineseDesc = generateChineseDescription(plugin.id, plugin.description, category);

  results.push({
    id: plugin.id,
    name: plugin.name,
    description: chineseDesc,
    homepage: `https://www.npmjs.com/package/${encodeURIComponent(plugin.id)}`,
    category,
    icon,
    tags,
  });
}

// 保存结果
const outputPath = path.join(__dirname, 'generated-descriptions-final.json');
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');

console.log(`已生成 ${results.length} 个插件的中文描述\n`);
console.log(`保存到: ${outputPath}\n`);

// 按分类统计
const categoryStats: Record<string, number> = {};
for (const r of results) {
  categoryStats[r.category] = (categoryStats[r.category] || 0) + 1;
}
console.log('=== 按分类统计 ===');
for (const [cat, count] of Object.entries(categoryStats).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${cat}: ${count}`);
}

// 统计有多少使用了中文描述，多少使用了通用描述
let chineseCount = 0;
let genericCount = 0;
for (const r of results) {
  if (r.description.includes('DSH ') && r.description.includes('插件，')) {
    genericCount++;
  } else {
    chineseCount++;
  }
}
console.log(`\n=== 描述质量统计 ===`);
console.log(`  提取中文描述: ${chineseCount}`);
console.log(`  使用通用描述: ${genericCount}`);

// 输出前 30 个示例
console.log('\n=== 前 30 个示例 ===');
for (let i = 0; i < Math.min(30, results.length); i++) {
  const r = results[i];
  console.log(`\n${i + 1}. ${r.id}`);
  console.log(`   分类: ${r.category} ${r.icon}`);
  console.log(`   标签: ${r.tags.join(', ') || '无'}`);
  console.log(`   描述: ${r.description}`);
}
