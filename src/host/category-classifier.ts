/**
 * DSH 科技风工作台 - 资源分类模块
 *
 * 根据插件名称、描述、关键词自动识别资源分类
 * 基于 675+ 真实 DSH 插件数据分析得出的分类规则
 *
 * 分类体系（15 个分类）：
 *   1. UI界面增强   - 皮肤、主题、工作台、仪表盘、小组件
 *   2. 开发工具     - 代码、Git、终端、调试、IDE 集成
 *   3. 数据记忆     - 记忆、上下文、会话管理、知识库
 *   4. 模型路由     - 模型代理、路由、订阅、LLM 提供商
 *   5. 搜索联网     - 搜索、浏览器、网页抓取、网络工具
 *   6. 办公效率     - Office、飞书、IM、日历、任务、邮件
 *   7. 金融数据     - 基金、股票、行情、费用统计、计费
 *   8. 系统运维     - 服务器监控、系统工具、部署、Docker
 *   9. 移动远程     - 移动端、远程访问、隧道、桥接
 *  10. 视觉多模态   - 视觉、图像、视频、音频、语音
 *  11. 插件生态     - 插件市场、插件管理、配置管理
 *  12. 安全认证     - 认证、登录、安全、备份、同步
 *  13. 研究学习     - 研究、学习、写作、翻译、学术
 *  14. API集成      - MCP、API、集成、连接器、Webhook
 *  15. 其他         - 无法分类的资源
 */

/**
 * 分类定义
 * 每个分类包含：名称、优先级（数字越小优先级越高）、关键词列表
 *
 * 优先级说明：
 *   当一个插件匹配多个分类时，选择优先级最高的分类
 *   例如：dsh-cost-meter 同时匹配"开发工具"和"金融数据"，
 *   因为"金融数据"优先级更高，所以分到"金融数据"
 */
export const CATEGORY_DEFINITIONS: Array<{
  name: string;
  priority: number;
  keywords: string[];
}> = [
  // ===== 高优先级分类（更具体的分类）=====

  {
    name: '金融数据',
    priority: 1,
    keywords: [
      'finance', 'stock', 'fund', 'market', 'trading', 'money',
      'cost', 'billing', 'usage', 'price', 'quote', '行情', '基金',
      '股票', '金融', '费用', '计费', '余额', '钱包', '投资',
      'xueqiu', '雪球', 'fund-research', 'cost-meter', 'usage-billing',
      'whale-widget', '小鲸鱼', 'quant', '量化',
    ],
  },

  {
    name: '视觉多模态',
    priority: 1,
    keywords: [
      'vision', 'image', 'video', 'audio', 'voice', 'multimodal',
      'ocr', 'speech', 'tts', 'stt', '视觉', '图像', '视频',
      '音频', '语音', '多模态', '看图', '生图', '画图',
      'modlens', 'eyes', 'vision-bridge', 'image-pathify',
      'tool-vision', 'vision-router', '画', '图',
    ],
  },

  {
    name: '移动远程',
    priority: 1,
    keywords: [
      'mobile', 'remote', 'bridge', 'tunnel', 'access', 'pocket',
      'phone', 'android', 'ios', '移动端', '远程', '隧道',
      '桥接', '口袋', '手机', '公网', '局域网', '扫码',
      'dsh-bridge', 'dsh-pocket', 'dsh-mobile', 'cloudflare',
      'frp', 'ngrok', 'tailscale',
    ],
  },

  {
    name: '搜索联网',
    priority: 2,
    keywords: [
      'search', 'browser', 'web', 'fetch', 'crawl', 'scrape',
      'internet', 'online', 'network', '搜索', '浏览器', '联网',
      '网页', '抓取', '爬虫', '搜索引擎',
      'anysearch', 'free-search', 'builtin-browser',
      'bing', 'duckduckgo', 'google', 'searx',
    ],
  },

  {
    name: '模型路由',
    priority: 2,
    keywords: [
      'model', 'proxy', 'router', 'llm', 'subscription', 'oauth',
      'fallback', 'routing', 'provider', '模型', '代理', '路由',
      '订阅', '提供商', '模型切换', '负载均衡',
      'omni-router', 'model-proxy', 'codex-subscription',
      'codex-connect', 'subscriptions', 'antigravity',
      'chatgpt', 'claude', 'grok', 'kimi', 'glm', 'copilot',
    ],
  },

  {
    name: '安全认证',
    priority: 2,
    keywords: [
      'auth', 'login', 'security', 'privacy', 'backup', 'sync',
      'encrypt', 'permission', '认证', '登录', '安全', '隐私',
      '备份', '同步', '加密', '权限',
      'webui-auth', 'dsh-auth', 'config-manager',
      'password', 'token', 'credential',
    ],
  },

  // ===== 中优先级分类 =====

  {
    name: 'UI界面增强',
    priority: 3,
    keywords: [
      'skin', 'theme', 'ui', 'workbench', 'dashboard', 'widget',
      'pet', 'wallpaper', 'desktop', 'tui', 'interface', '界面',
      '皮肤', '主题', '工作台', '仪表盘', '小组件', '宠物',
      '壁纸', '桌面', '终端界面', 'ui增强',
      'tech-skin', 'dream-skin', 'personal-workbench',
      'genui', 'wallpaper-engine', 'dsh-pet', 'dafeiyu',
      'bigfish', '大肥鱼', 'ui-usage', 'server-deck',
    ],
  },

  {
    name: '数据记忆',
    priority: 3,
    keywords: [
      'memory', 'context', 'session', 'archive', 'history',
      'knowledge', 'note', 'storage', 'database', 'rdb',
      '记忆', '上下文', '会话', '归档', '历史', '知识库',
      '笔记', '存储', '数据库',
      'mnemon', 'memory-eternal', 'session-manager',
      'session-rdb', 'session-branch', 'archive-manager',
      'context-insight', 'chat-import',
    ],
  },

  {
    name: '办公效率',
    priority: 3,
    keywords: [
      'office', 'doc', 'excel', 'sheet', 'slide', 'feishu',
      'lark', 'im', 'chat', 'calendar', 'task', 'todo', 'plan',
      'reminder', 'notification', 'email', 'mail', '办公',
      '文档', '表格', '幻灯片', '飞书', '日历', '任务',
      '待办', '计划', '提醒', '通知', '邮件', '即时通讯',
      'univer-office', 'dsh-im', 'feishu-bot',
      'personal-workbench', 'taskboard', 'project',
    ],
  },

  {
    name: '系统运维',
    priority: 3,
    keywords: [
      'server', 'monitor', 'system', 'windows', 'linux', 'docker',
      'deploy', 'ops', 'infrastructure', 'metric', '服务器',
      '监控', '系统', '运维', '部署', '指标', '性能',
      'server-deck', 'dsh-win32', 'pc-optimizer',
      'sys-watchdog', 'cpu', 'memory', 'disk', '进程',
    ],
  },

  {
    name: '研究学习',
    priority: 3,
    keywords: [
      'research', 'study', 'learn', 'write', 'translate', 'summary',
      'paper', 'academic', 'science', '研究', '学习', '写作',
      '翻译', '总结', '论文', '学术', '科学',
      'fund-research', 'scientific-evidence', 'metatutor',
      'literature', 'citation', 'reference',
    ],
  },

  {
    name: 'API集成',
    priority: 3,
    keywords: [
      'mcp', 'api', 'integration', 'connector', 'webhook', 'sdk',
      '集成', '连接器', '接口', 'webhook',
      'mcp-connector', 'mcp-panel', 'obsidian-assistant',
      'notion', 'slack', 'discord', 'telegram', 'wechat',
    ],
  },

  // ===== 低优先级分类（更宽泛的分类）=====

  {
    name: '开发工具',
    priority: 4,
    keywords: [
      'code', 'git', 'github', 'terminal', 'shell', 'dev', 'debug',
      'codex', 'cursor', 'claude', 'ide', 'editor', '代码',
      'git', '终端', 'shell', '开发', '调试', '编辑器',
      'find-plugin', 'upstream-radar', 'plugin-scorecard',
      'git', 'diff', 'commit', 'branch', 'pr', 'pull request',
    ],
  },

  {
    name: '插件生态',
    priority: 5,
    keywords: [
      'plugin', 'market', 'manager', 'config', 'find', 'discover',
      'install', 'gallery', '插件', '市场', '管理', '配置',
      '发现', '安装', '画廊', '生态',
      'dsh-plugin', 'dshmarket', 'plugin-market',
      'awesome', 'registry', 'catalog', 'directory',
    ],
  },
];

/**
 * 根据资源信息自动分类
 *
 * @param name 资源名称（包名）
 * @param description 资源描述
 * @param keywords 关键词列表（可选，来自 npm package.json）
 * @returns 分类名称
 */
export function classifyResource(
  name: string,
  description: string = '',
  keywords: string[] = [],
): string {
  const text = `${name.toLowerCase()} ${description.toLowerCase()} ${keywords.join(' ').toLowerCase()}`;

  // 计算每个分类的匹配分数
  const scores: Array<{ name: string; score: number; priority: number }> = [];

  for (const cat of CATEGORY_DEFINITIONS) {
    let score = 0;
    for (const kw of cat.keywords) {
      if (text.includes(kw.toLowerCase())) {
        score += 1;
      }
    }
    if (score > 0) {
      scores.push({ name: cat.name, score, priority: cat.priority });
    }
  }

  if (scores.length === 0) {
    return '其他';
  }

  // 排序规则：先按优先级（数字越小越优先），再按匹配分数（分数越高越优先）
  scores.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return b.score - a.score;
  });

  return scores[0].name;
}

/**
 * 获取所有分类名称列表
 */
export function getAllCategories(): string[] {
  return CATEGORY_DEFINITIONS.map((c) => c.name).sort((a, b) => {
    const priorityA = CATEGORY_DEFINITIONS.find((c) => c.name === a)?.priority || 99;
    const priorityB = CATEGORY_DEFINITIONS.find((c) => c.name === b)?.priority || 99;
    return priorityA - priorityB;
  });
}

/**
 * 获取分类的图标（用于 UI 显示）
 */
export function getCategoryIcon(category: string): string {
  const iconMap: Record<string, string> = {
    'UI界面增强': '🎨',
    '开发工具': '🛠️',
    '数据记忆': '🧠',
    '模型路由': '🔀',
    '搜索联网': '🔍',
    '办公效率': '📊',
    '金融数据': '💰',
    '系统运维': '⚙️',
    '移动远程': '📱',
    '视觉多模态': '🖼️',
    '插件生态': '🧩',
    '安全认证': '🔐',
    '研究学习': '📚',
    'API集成': '🔌',
    '其他': '📦',
  };
  return iconMap[category] || '📦';
}
