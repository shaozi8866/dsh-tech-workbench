/**
 * 基于英文描述批量生成中文功能描述
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

// 分类规则：基于关键词匹配
const CATEGORY_RULES: { category: string; icon: string; keywords: string[] }[] = [
  { category: '搜索联网', icon: '🔎', keywords: ['search', 'web', 'browser', 'fetch', 'crawl', 'scrape', 'internet', '联网', '搜索', '浏览器'] },
  { category: '视觉图像', icon: '🖼️', keywords: ['vision', 'image', 'ocr', 'vision', 'pixel', 'artifacts', '视觉', '图像', '图片', '识别'] },
  { category: '记忆上下文', icon: '🧠', keywords: ['memory', 'context', 'recall', 'ledger', '记忆', '上下文', '回忆'] },
  { category: '会话管理', icon: '💬', keywords: ['session', 'conversation', 'chat', 'rewind', 'recall', 'history', 'archive', '会话', '对话', '聊天', '回退', '历史'] },
  { category: '通知提醒', icon: '🔔', keywords: ['notify', 'notification', 'reminder', 'alert', '通知', '提醒', '推送'] },
  { category: '插件市场', icon: '🏪', keywords: ['market', 'marketplace', 'plugin', 'store', 'catalog', '市场', '插件', '商店'] },
  { category: '自动化任务', icon: '🤖', keywords: ['automation', 'auto', 'schedule', 'cron', 'task', '自动化', '定时', '任务'] },
  { category: '模型提供商', icon: '🧩', keywords: ['provider', 'llm', 'model', 'command', '模型', '提供商'] },
  { category: '费用统计', icon: '💰', keywords: ['cost', 'usage', 'quota', 'balance', 'wallet', 'meter', 'stats', '费用', '用量', '配额', '余额', '统计'] },
  { category: '更新管理', icon: '🔄', keywords: ['update', 'upgrade', 'version', 'checker', '更新', '升级', '版本'] },
  { category: '写作辅助', icon: '✍️', keywords: ['writing', 'write', 'document', 'paper', 'research', '写作', '文档', '论文', '研究'] },
  { category: '角色扮演', icon: '🎭', keywords: ['roleplay', 'role', 'character', 'tavern', 'world', '角色扮演', '角色', '人物'] },
  { category: '消息编辑', icon: '✏️', keywords: ['edit', 'rewrite', 'recall', 'message', '编辑', '重写', '撤回', '消息'] },
  { category: '开发工具', icon: '🛠️', keywords: ['dev', 'tool', 'cli', 'debug', 'test', '开发', '工具', '调试', '测试'] },
  { category: 'UI界面', icon: '🎨', keywords: ['ui', 'skin', 'theme', 'interface', 'design', '界面', '皮肤', '主题', '设计'] },
  { category: '数据同步', icon: '🔄', keywords: ['sync', 'backup', 'restore', '同步', '备份', '恢复'] },
  { category: '安全权限', icon: '🔒', keywords: ['auth', 'security', 'permission', 'guard', '认证', '安全', '权限'] },
  { category: '办公效率', icon: '📊', keywords: ['office', 'excel', 'sheet', 'doc', 'pdf', '办公', '表格', '文档'] },
  { category: '其他', icon: '📦', keywords: [] },
];

// 标签规则
const TAG_RULES: { tag: string; keywords: string[] }[] = [
  { tag: '免费', keywords: ['free', '免费', '无需', 'no api', 'zero'] },
  { tag: '多引擎', keywords: ['multi', 'multiple', '多引擎', '多渠道'] },
  { tag: '本地优先', keywords: ['local', '本地', 'offline'] },
  { tag: '开源', keywords: ['open source', '开源', 'mit'] },
  { tag: '轻量', keywords: ['lightweight', 'light', '轻量', '零依赖'] },
  { tag: 'Web UI', keywords: ['web', 'ui', 'gui', '界面', '设置页'] },
  { tag: 'API', keywords: ['api', 'service', '接口'] },
  { tag: '自动化', keywords: ['auto', 'automation', '自动'] },
  { tag: '可视化', keywords: ['visual', 'chart', 'graph', '可视化', '图表'] },
  { tag: '企业级', keywords: ['enterprise', '企业', '团队', '协作'] },
];

/**
 * 根据描述判断分类
 */
function detectCategory(description: string): { category: string; icon: string } {
  const lowerDesc = description.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    for (const keyword of rule.keywords) {
      if (lowerDesc.includes(keyword.toLowerCase())) {
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
 * 生成中文功能描述
 * 基于英文描述，提取核心功能，生成简洁的中文描述
 */
function generateChineseDescription(id: string, enDescription: string): string {
  // 清理描述：去除多余空格、换行
  let desc = enDescription.replace(/\s+/g, ' ').trim();

  // 如果描述已经包含中文，直接使用（截取前100字）
  if (/[\u4e00-\u9fa5]/.test(desc)) {
    // 提取中文部分
    const chinesePart = desc.match(/[\u4e00-\u9fa5][^·]*/);
    if (chinesePart) {
      return chinesePart[0].trim().substring(0, 100);
    }
    return desc.substring(0, 100);
  }

  // 基于英文描述生成中文描述
  // 提取核心功能关键词
  const lowerDesc = desc.toLowerCase();

  // 通用翻译规则
  const translations: [RegExp, string][] = [
    [/DeepSeek Harness/gi, 'DSH'],
    [/plugin/gi, '插件'],
    [/for/gi, '用于'],
    [/with/gi, '支持'],
    [/and/gi, '和'],
    [/support/gi, '支持'],
    [/provide/gi, '提供'],
    [/manage/gi, '管理'],
    [/monitor/gi, '监控'],
    [/track/gi, '追踪'],
    [/enhance/gi, '增强'],
    [/improve/gi, '改进'],
    [/add/gi, '添加'],
    [/enable/gi, '启用'],
    [/allow/gi, '允许'],
    [/help/gi, '帮助'],
    [/integrate/gi, '集成'],
    [/connect/gi, '连接'],
    [/automate/gi, '自动化'],
    [/simplify/gi, '简化'],
    [/powered by/gi, '基于'],
    [/built-in/gi, '内置'],
    [/open source/gi, '开源'],
    [/lightweight/gi, '轻量'],
    [/local-first/gi, '本地优先'],
    [/zero-config/gi, '零配置'],
    [/easy to use/gi, '易用'],
    [/user-friendly/gi, '用户友好'],
    [/real-time/gi, '实时'],
    [/cross-platform/gi, '跨平台'],
    [/multi-/gi, '多'],
    [/auto-/gi, '自动'],
  ];

  // 简单的中文描述生成
  // 提取前几个关键短语
  const phrases = desc.split(/[,;.]/).map(p => p.trim()).filter(p => p.length > 0);

  if (phrases.length === 0) {
    return 'DSH 插件，提供相关功能扩展。';
  }

  // 基于插件ID和描述生成中文描述
  const pluginName = id.split('/').pop() || id;

  // 尝试提取核心功能
  let coreFeature = phrases[0];
  if (coreFeature.length > 80) {
    coreFeature = coreFeature.substring(0, 80) + '...';
  }

  // 基于关键词生成更准确的中文描述
  if (lowerDesc.includes('search') || lowerDesc.includes('web search')) {
    return `DSH 网页搜索插件，提供多引擎搜索、网页抓取和内容摘要功能。`;
  }
  if (lowerDesc.includes('vision') || lowerDesc.includes('image')) {
    return `DSH 视觉图像插件，支持图像理解、OCR识别、视觉问答等功能。`;
  }
  if (lowerDesc.includes('memory') || lowerDesc.includes('context')) {
    return `DSH 记忆上下文插件，提供长期记忆、上下文管理和智能回忆功能。`;
  }
  if (lowerDesc.includes('session') || lowerDesc.includes('conversation') || lowerDesc.includes('chat')) {
    return `DSH 会话管理插件，提供对话历史、会话切换和上下文管理功能。`;
  }
  if (lowerDesc.includes('notify') || lowerDesc.includes('notification')) {
    return `DSH 通知推送插件，支持多渠道消息通知和任务提醒功能。`;
  }
  if (lowerDesc.includes('market') || lowerDesc.includes('marketplace')) {
    return `DSH 插件市场插件，提供插件浏览、搜索、安装和管理功能。`;
  }
  if (lowerDesc.includes('cost') || lowerDesc.includes('usage') || lowerDesc.includes('quota') || lowerDesc.includes('balance')) {
    return `DSH 费用统计插件，提供用量追踪、费用计算和配额管理功能。`;
  }
  if (lowerDesc.includes('update') || lowerDesc.includes('upgrade')) {
    return `DSH 更新管理插件，提供版本检查、自动更新和变更通知功能。`;
  }
  if (lowerDesc.includes('rewind') || lowerDesc.includes('recall')) {
    return `DSH 对话回退插件，支持同窗口内对话撤回和工作区备份恢复。`;
  }
  if (lowerDesc.includes('browser')) {
    return `DSH 浏览器插件，提供内置浏览器、网页交互和自动化操作功能。`;
  }
  if (lowerDesc.includes('provider') || lowerDesc.includes('llm') || lowerDesc.includes('model')) {
    return `DSH 模型提供商插件，集成第三方LLM服务，支持多模型切换。`;
  }
  if (lowerDesc.includes('writing') || lowerDesc.includes('write') || lowerDesc.includes('document')) {
    return `DSH 写作辅助插件，提供文档生成、写作指导和内容优化功能。`;
  }
  if (lowerDesc.includes('roleplay') || lowerDesc.includes('character')) {
    return `DSH 角色扮演插件，支持角色卡、世界观设定和剧情互动功能。`;
  }
  if (lowerDesc.includes('automation') || lowerDesc.includes('auto')) {
    return `DSH 自动化插件，支持定时任务、自动执行和工作流编排。`;
  }
  if (lowerDesc.includes('theme') || lowerDesc.includes('skin') || lowerDesc.includes('ui')) {
    return `DSH 界面美化插件，提供主题切换、皮肤定制和UI优化功能。`;
  }

  // 默认：基于英文描述生成简单中文描述
  return `DSH 插件：${coreFeature}`;
}

// 生成所有插件的中文描述
const results: any[] = [];
for (const plugin of missingPlugins) {
  const { category, icon } = detectCategory(plugin.description);
  const tags = detectTags(plugin.description);
  const chineseDesc = generateChineseDescription(plugin.id, plugin.description);

  results.push({
    id: plugin.id,
    name: plugin.name,
    description: chineseDesc,
    homepage: `https://www.npmjs.com/package/${encodeURIComponent(plugin.id)}`,
    category,
    icon,
    tags,
    originalDescription: plugin.description.substring(0, 200),
  });
}

// 保存结果
const outputPath = path.join(__dirname, 'generated-descriptions.json');
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

// 输出前 20 个示例
console.log('\n=== 前 20 个示例 ===');
for (let i = 0; i < Math.min(20, results.length); i++) {
  const r = results[i];
  console.log(`\n${i + 1}. ${r.id}`);
  console.log(`   分类: ${r.category} ${r.icon}`);
  console.log(`   标签: ${r.tags.join(', ')}`);
  console.log(`   描述: ${r.description}`);
}
