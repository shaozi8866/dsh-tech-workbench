/**
 * DSH 科技风工作台 - dshdesktop.com 预设抓取模块
 * 从 dshdesktop.com 预设页面抓取社区预设列表
 *
 * 预设页面：https://dshdesktop.com/preset/zh/
 * 包含30+社区预设，按使用人数排序
 *
 * 预设安装方式：
 *   - DSH 预设本质上是 Cordis 组合文件
 *   - 可以通过插件安装（如 @dsh-suite/preset-center）
 *   - 也可以手动复制到 ~/.dsh/.agent-presets/ 目录
 *   - DSH Desktop 支持 .dshpreset 格式文件导入导出
 */

import {
  ResourceType,
  SourceType,
  StandardResource,
} from './types';
import { createDefaultResource } from './utils';
import type { WorkbenchContext } from './market-fetcher';

/**
 * dshdesktop.com 已知预设列表（从预设页面提取）
 * 这些预设是社区分享的工作配方，包含角色、技能和工具的组合
 */
const DSHDESKTOP_PRESETS: Array<{
  id: string;
  name: string;
  description: string;
  author: string;
  category: string;
  usageCount: number;
}> = [
  {
    id: 'image-production-en-mode',
    name: '图像制作模式',
    description: '从视觉 Brief、生成与编辑到多规格适配和质量检查，完成可复现、保留来源的图像生产流程。',
    author: 'dshdesktop',
    category: '图像制作',
    usageCount: 1788,
  },
  {
    id: 'scientific-evidence-en-mode',
    name: '科研证据模式',
    description: '完成研究问题拆解、论文检索与比较、主张和引用核验、证据矩阵、结构化综述、研究空白分析和更新简报。',
    author: 'dshdesktop',
    category: '资料研究',
    usageCount: 1697,
  },
  {
    id: 'video-production-en-mode',
    name: '视频制作模式',
    description: '通过可追溯的策划、剪辑、字幕、音频、版本适配和技术质检流程完成视频交付。',
    author: 'dshdesktop',
    category: '视频制作',
    usageCount: 1235,
  },
  {
    id: 'motion-graphics-en-mode',
    name: '动效制作模式',
    description: '设计并实现可复用的动效系统、程序化视频、合成遮罩流程和渲染质量验证。',
    author: 'dshdesktop',
    category: '动效设计',
    usageCount: 587,
  },
  {
    id: 'minimal-v3',
    name: '极简模式（Windows 适配）',
    description: '面向 Windows 的轻量编码 Agent，在极简模式基础上加入 PowerShell，以及 read、write、edit、glob 和 grep 等常用文件工具。',
    author: 'provance_initial',
    category: '编码开发',
    usageCount: 543,
  },
  {
    id: 'contract-review-en-mode',
    name: '合同审查模式',
    description: '完成合同分流、条款审查、版本比较、红线建议、谈判简报和终稿核验，并保留可追溯的审查依据。',
    author: 'dshdesktop',
    category: '法律合规',
    usageCount: 383,
  },
  {
    id: 'orchestrator',
    name: '分解委派模式',
    description: '主对话只负责拆分、派发、验证与汇总，每个子任务交给全新 worker 执行和自验，关键结论由独立审计 worker 复核，共享产物最后由集成 worker 合并。',
    author: '2969617467',
    category: '任务管理',
    usageCount: 309,
  },
  {
    id: 'apple-development-en-mode',
    name: 'Apple 开发模式',
    description: '借助 Xcode 工具完成 Apple 全平台代码解释、功能开发、缺陷诊断、界面工程、架构演进、性能优化和发布核验。',
    author: 'dshdesktop',
    category: '编码开发',
    usageCount: 280,
  },
  {
    id: 'image-generation-mode',
    name: '图像生成模式',
    description: '专门用来生成图片，适用于海报、Banner、人像等。模式会根据使用者需求逐项核验，针对未达标硬性指标重新生成，完成后诚实标注。',
    author: 'liqingb0220',
    category: '图像制作',
    usageCount: 210,
  },
  {
    id: 'lim-any',
    name: '大型任务拆分器',
    description: '一种思维模式配方：把大型任务拆成边界清晰的小步骤，短思考、小任务、即时验证。实测在输出质量、速度、思维链与 Token 规划效率上表现优秀。',
    author: '1614757134',
    category: '任务管理',
    usageCount: 178,
  },
  {
    id: 'data-analysis-mode',
    name: '数据分析模式',
    description: '用来分析数据文件，适用于表格核算、指标口径、趋势与分布等。模式会先摸清数据情况再动手，去重、补缺、剔除异常都会明说，不静默处理。',
    author: 'liqingb0220',
    category: '数据分析',
    usageCount: 168,
  },
  {
    id: 'apple-dev',
    name: 'Apple 开发模式（Xcode集成）',
    description: '集成 Xcode MCP 工具、Apple 平台技能和 Xcode Intelligence 风格工作方式，适用于 Swift、SwiftUI、App Intents、UIKit 与安全审计开发。',
    author: 'qinrui',
    category: '编码开发',
    usageCount: 154,
  },
  {
    id: 'agentic-ci-security-en-mode',
    name: 'Agentic CI 安全模式',
    description: '盘点、审阅、审计、调查、修复并核验 GitHub Actions 中 AI Agent 的数据流、权限和信任边界。',
    author: 'dshdesktop',
    category: '安全审计',
    usageCount: 147,
  },
  {
    id: 'req-mgr',
    name: '需求分析与需求管理',
    description: '配置 GitHub 仓库、分支和需求目录后，检索已有需求并拉取最新代码，结合实现分析新需求、给出建议，再由用户决定是否写入需求库并维护索引。',
    author: 'binfeng',
    category: '项目管理',
    usageCount: 142,
  },
  {
    id: 'delepi',
    name: 'Delepi 精准交付模式',
    description: '基于 Delepi 双智能体协作方法论，内置问题诊断、方案设计、调查研究、视觉设计、执行变更、用例编写、用例执行和自动化交互八套工作法，强调证据链、反证法与可验收交付。',
    author: '657427356',
    category: '任务管理',
    usageCount: 89,
  },
  {
    id: 'cache-tuned',
    name: '缓存优化编码 Agent',
    description: '标准编码 Agent（standard）的逐字节副本，为 DeepSeek 前缀缓存友好而调优：更晚压缩、更晚剪枝工具结果，缓存失效更少、热前缀存活更久。',
    author: '15103102590',
    category: '编码开发',
    usageCount: 86,
  },
  {
    id: 'business-research-decision-mode',
    name: '商业调研与决策模式',
    description: '用来做商业决策，适用于定价、预算分配、采购选型、招聘与自动化取舍、新市场进入等。模式会先检查各方案是否满足硬性约束，把事实、假设和判断分开。',
    author: 'liqingb0220',
    category: '商业分析',
    usageCount: 74,
  },
  {
    id: 'metatutor',
    name: 'MetaTutor：Meta 分析导师',
    description: 'Meta 分析与系统综述学习导师，提供单流程实操、全流程演练、写作示范与仿写，并根据三级学习画像自适应教学和 rubric 评分。',
    author: '2874909789',
    category: '教育学习',
    usageCount: 64,
  },
  {
    id: 'export-document-consistency-checker',
    name: '外贸单证一致性核验员',
    description: '扫描采购订单、商业发票、装箱单和提单草稿等外贸单据，抽取关键字段、建立跨文件一致性矩阵、复算金额数量重量，并标记严重问题、待复核项与一致项。',
    author: 'wangyu',
    category: '文档工作',
    usageCount: 60,
  },
  {
    id: 'design-spec-research',
    name: '设计规范调研模式',
    description: '针对每个组件调研主流设计系统，再结合项目设计原则与必读的元文档写作规范，产出可追溯、属于当前项目的组件设计规范。',
    author: 'kinyoo1126',
    category: '设计规范',
    usageCount: 50,
  },
  {
    id: 'electron-code-dedup',
    name: 'Electron 代码去重审计',
    description: '只读扫描 Electron 项目的 main、preload、renderer 和 shared 分层，识别精确重复、近似重复及可抽取公共逻辑，并按优先级输出改造建议，默认不修改业务代码。',
    author: 'wanglu',
    category: '编码开发',
    usageCount: 48,
  },
  {
    id: 'architect-review',
    name: '建筑录入评审工作台',
    description: '面向建筑、景观、室内和规划方案的三段式工作台：录入 PPT/PDF 文本，生成逐页全屏演示，再输出包含立面专项分析的综合评审报告。',
    author: '618largo',
    category: '文档工作',
    usageCount: 48,
  },
  {
    id: 'gtm-strategy',
    name: 'GTM 策略顾问',
    description: '内置 STP、波特五力、AARRR、JTBD 等全套 GTM 框架的策略顾问。帮助创业者和产品团队制定可执行的上市场策略。',
    author: 'cinderzhan',
    category: '商业分析',
    usageCount: 32,
  },
  {
    id: 'nexus-sdlc',
    name: 'Nexus 规范研发模式',
    description: '遵循 Nexus 规范研发工作配方：主会话充当控制面与协调者，严格执行「Claude Code 规划 → Codex 开发/自测 → Claude Code 审查 → 修复/复审 → 知识提炼」的确定性双引擎协同。',
    author: '382716335',
    category: '编码开发',
    usageCount: 26,
  },
];

/**
 * 从 dshdesktop.com 获取预设列表
 *
 * 由于 dshdesktop.com 预设页面是静态网页，数据通过 JavaScript 动态加载，
 * 直接抓取 HTML 无法获取完整数据。因此使用已知预设列表 + npm 搜索补充的方式。
 *
 * @param ctx 工作台上下文
 * @returns 标准化后的预设资源列表
 */
export async function fetchDshDesktopPresets(
  ctx: WorkbenchContext,
): Promise<StandardResource[]> {
  const result: StandardResource[] = [];

  ctx.logger?.info('[Preset] 从 dshdesktop.com 获取预设列表...');

  try {
    // 将已知预设转换为标准化资源
    for (const preset of DSHDESKTOP_PRESETS) {
      const resource = createDefaultResource({
        id: `dshdesktop:${preset.id}`,
        name: preset.name,
        type: ResourceType.PRESET,
        category: preset.category,
        description: preset.description,
        author: preset.author,
        source: SourceType.NPM, // 标记为社区来源
        isOfficial: false,
        isInstalled: false,
        latestVersion: '1.0.0',
        localVersion: '',
        adaptVersion: 'all',
        updateTime: Date.now(),
        star: preset.usageCount, // 使用人数作为热度指标
        fork: 0,
        installCmd: `# 预设安装说明：\n# 1. 访问 https://dshdesktop.com/preset/zh/ 查看详情\n# 2. 复制预设配置到 ~/.dsh/.agent-presets/${preset.id}/\n# 3. 或通过 DSH Desktop 导入 .dshpreset 文件`,
        homepage: `https://dshdesktop.com/preset/zh/#${preset.id}`, // dshdesktop 预设页面
        configPath: `~/.dsh/.agent-presets/${preset.id}/`,
      });

      result.push(resource);
    }

    ctx.logger?.info(`[Preset] dshdesktop.com 预设获取完成：共 ${result.length} 个预设`);

    // 打印前5个预设名称，方便调试
    if (result.length > 0) {
      const names = result.slice(0, 5).map((r) => r.name);
      ctx.logger?.info(`[Preset] 前5个: ${names.join(', ')}`);
    }

    return result;
  } catch (err) {
    ctx.logger?.warn('[Preset] dshdesktop.com 预设获取失败，降级为空列表', err);
    return result;
  }
}
