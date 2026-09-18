import { createRequire } from "node:module";
import * as path$1 from "path";
import * as fs from "fs";
import { mkdirSync, promises, readFileSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
//#region \0rolldown/runtime.js
var __require = /* #__PURE__ */ (() => createRequire(import.meta.url))();
//#endregion
//#region src/host/types.ts
/**
* DSH 科技风工作台 - 全局类型定义与常量
* 基于双源数据抓取全流程结构化TS伪代码 1:1 实现
*/
/** 缓存过期时间（秒），默认24小时 */
const CACHE_EXPIRE_SECONDS = 86400;
/** 单接口超时（毫秒） */
const FETCH_TIMEOUT = 5e3;
/** 缓存文件相对路径 */
const CACHE_RELATIVE_PATH = "cache/workbench/index.json";
//#endregion
//#region src/host/utils.ts
/**
* DSH 科技风工作台 - 核心工具函数集
* 包含：SemVer校验、版本比对、README解析、工程结构校验、仓库列表加载
* 纯函数优先，依赖注入设计，便于单元测试
*/
/**
* SemVer 合法性校验
* 匹配格式：主版本.次版本.修订版本，可选前缀v/V
* @param v 待校验版本字符串
* @returns 是否为合法 SemVer
*/
function isValidSemver(v) {
	if (!v || typeof v !== "string") return false;
	const cleaned = v.replace(/^[vV]/, "").trim();
	return /^\d+\.\d+\.\d+/.test(cleaned);
}
/**
* 版本比对
* @param newVer 新版本号
* @param oldVer 旧版本号
* @returns 1: 新版本 > 旧版本; -1: 新版本 < 旧版本; 0: 相等
*/
function compareVersion(newVer, oldVer) {
	const parse = (v) => {
		const parts = v.replace(/^[vV]/, "").trim().split(".").map((p) => parseInt(p, 10) || 0);
		while (parts.length < 3) parts.push(0);
		return parts.slice(0, 3);
	};
	const n = parse(newVer);
	const o = parse(oldVer);
	for (let i = 0; i < 3; i++) {
		if (n[i] > o[i]) return 1;
		if (n[i] < o[i]) return -1;
	}
	return 0;
}
/**
* 规范化版本号：去除v/V前缀，确保三段式
* @param v 原始版本号
* @returns 规范化后的版本号，非法则返回 "0.0.0"
*/
function normalizeVersion(v) {
	if (!isValidSemver(v)) return "0.0.0";
	const parts = v.replace(/^[vV]/, "").trim().split(".").map((p) => parseInt(p, 10) || 0);
	while (parts.length < 3) parts.push(0);
	return `${parts[0]}.${parts[1]}.${parts[2]}`;
}
/**
* 解析 GitHub README 内容，结构化提取适配版本、功能简介
* @param content README 原文（已解码的纯文本）
* @returns 解析结果 { desc, adaptVer }
*/
function parseReadme(content) {
	if (!content || typeof content !== "string") return {
		desc: "",
		adaptVer: "all"
	};
	let desc = "";
	let adaptVer = "";
	const versionMatch = content.match(/适配版本[:：\s]+([vV\d.+,\\s]+)|支持\s*DSH[:：\s]+([\d.]+)|requires\s+dsh[:：\s]+([\d.]+)/gi);
	if (versionMatch && versionMatch.length > 0) adaptVer = versionMatch[0].replace(/适配版本|支持\s*DSH|requires\s+dsh|[:：\s]/gi, "").trim();
	if (!adaptVer) adaptVer = "all";
	const lineList = content.split("\n").map((line) => line.trim()).filter((line) => {
		return line && !line.startsWith("#") && !line.startsWith("!") && !line.startsWith("[") && !line.startsWith("<!--") && !line.startsWith("---") && !line.startsWith("|") && !line.startsWith(">") && line.length > 10;
	});
	if (lineList.length > 0) {
		let firstLine = lineList[0].replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
		firstLine = firstLine.replace(/`([^`]+)`/g, "$1");
		desc = firstLine.slice(0, 120);
	}
	return {
		desc,
		adaptVer
	};
}
/**
* 内置 DSH 生态官方白名单
* 持续兼容社区主流插件/应用仓库
*/
const DEFAULT_GITHUB_WHITELIST = [
	"deepseek-harness/awesome-plugins",
	"deepseek-harness/dsh-ui-plugins",
	"deepseek-harness/dsh-presets",
	"deepseek-harness/dsh-workflow-apps",
	"cordsjs/cordis-plugin-market",
	"deepseek-harness/community-examples"
];
/**
* 获取 GitHub 抓取仓库列表
* 规则：内置生态白名单 + 用户自定义源 + 自动去重
* @param customRepos 用户自定义仓库列表（来自插件配置）
* @returns 去重后的仓库列表（owner/repo 格式）
*/
function getGithubRepoList(customRepos = []) {
	const userList = Array.isArray(customRepos) ? customRepos : [];
	const allList = [...DEFAULT_GITHUB_WHITELIST, ...userList];
	return Array.from(new Set(allList)).filter((item) => item && typeof item === "string" && item.includes("/") && !item.includes(" "));
}
/**
* 校验仓库是否为标准 DSH/Cordis 插件/应用工程
* DSH标准工程核心文件特征（满足任意一组即为有效项目）：
* - hasCordisPlugin: index.ts + package.json
* - hasPatchConfig: patch.yml 或 cordis.yml
* - hasDSHConfig: dsh.config.json 或 .dsh 目录
*
* @param repo 仓库地址 user/repo
* @param httpGet HTTP GET 函数（注入 ctx.http.get）
* @param headers GitHub 请求头（含 Authorization）
* @returns 是否为有效 DSH 项目
*/
async function checkDSHProjectStructure(repo, httpGet, headers = {}) {
	if (!repo || !repo.includes("/")) return false;
	try {
		const fileRes = await httpGet(`https://api.github.com/repos/${repo}/contents`, {
			headers,
			timeout: FETCH_TIMEOUT
		});
		if (!fileRes || !fileRes.data || !Array.isArray(fileRes.data)) return false;
		const fileNames = fileRes.data.map((f) => f.name);
		const hasCordisPlugin = fileNames.includes("index.ts") && fileNames.includes("package.json");
		const hasCordisPluginJs = fileNames.includes("index.js") && fileNames.includes("package.json");
		const hasPatchConfig = fileNames.includes("patch.yml") || fileNames.includes("cordis.yml");
		const hasDSHConfig = fileNames.includes("dsh.config.json") || fileNames.includes(".dsh");
		const hasSrcDir = fileNames.includes("src") && fileNames.includes("package.json");
		return hasCordisPlugin || hasCordisPluginJs || hasPatchConfig || hasDSHConfig || hasSrcDir;
	} catch (err) {
		return false;
	}
}
/**
* 创建一个默认值填充的 StandardResource
* @param overrides 覆盖字段
* @returns 完整的 StandardResource
*/
function createDefaultResource(overrides = {}) {
	return {
		id: "",
		name: "",
		type: "plugin",
		category: "uncategorized",
		description: "社区开源资源，点击查看详情",
		author: "",
		source: "github",
		isOfficial: false,
		latestVersion: "0.0.0",
		localVersion: "0.0.0",
		updateAvailable: false,
		adaptVersion: "all",
		star: 0,
		fork: 0,
		updateTime: 0,
		installCmd: "",
		homepage: "",
		configPath: "",
		isInstalled: false,
		isEnabled: false,
		...overrides
	};
}
/**
* 睡眠工具函数
* @param ms 毫秒
*/
function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
//#endregion
//#region src/host/market-fetcher.ts
/**
* DSH 科技风工作台 - Market 主源抓取模块
* 包含：鉴权初始化、本地缓存读写、Market 主源同步抓取 + 四层过滤 + 分类归集
* 基于双源数据抓取全流程 阶段0-阶段1 1:1 实现
*/
/**
* 鉴权初始化
* - Market：复用本地 Profile 上下文，无需手动 Token
* - GitHub：环境变量优先 > 配置文件 > 匿名
* @param ctx 工作台上下文
* @param config 插件配置
*/
async function initAuth(ctx, config) {
	let marketToken = "";
	try {
		if (ctx.profile?.getSessionToken) marketToken = await ctx.profile.getSessionToken();
	} catch (err) {
		ctx.logger?.warn("Market 鉴权失败，将以匿名模式访问", err);
	}
	let githubToken = config.githubToken || "";
	if (!githubToken) try {
		githubToken = (await ctx.config.get("workbench.github"))?.githubToken || "";
	} catch (err) {}
	if (!githubToken && typeof process !== "undefined" && process.env?.GITHUB_TOKEN) githubToken = process.env.GITHUB_TOKEN;
	return {
		marketToken,
		githubToken
	};
}
/**
* 读取本地缓存
* @param ctx 工作台上下文
* @returns 缓存数据，不存在或解析失败返回 null
*/
async function getLocalCache(ctx) {
	const cachePath = `${ctx.env.DSH_HOME}/${CACHE_RELATIVE_PATH}`;
	try {
		if (!await ctx.fs.exists(cachePath)) return null;
		const raw = await ctx.fs.readFile(cachePath, "utf8");
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed.expireTime !== "number") return null;
		return parsed;
	} catch (err) {
		ctx.logger?.warn("读取本地缓存失败", err);
		return null;
	}
}
/**
* 写入本地缓存（原子写入）
* @param ctx 工作台上下文
* @param cache 缓存数据
*/
async function saveLocalCache(ctx, cache) {
	const cacheDir = `${ctx.env.DSH_HOME}/cache/workbench`;
	const cachePath = `${ctx.env.DSH_HOME}/${CACHE_RELATIVE_PATH}`;
	try {
		await ctx.fs.mkdir(cacheDir, { recursive: true });
		await ctx.fs.writeFile(cachePath, JSON.stringify(cache, null, 2));
		ctx.cache?.set("workbench_data", cache);
	} catch (err) {
		ctx.logger?.warn("写入本地缓存失败", err);
	}
}
/**
* 缓存数据兜底渲染
* @param cache 缓存数据
* @returns 按类型分组的资源列表
*/
function renderCacheData(cache) {
	return {
		plugins: cache.pluginList || [],
		presets: cache.presetList || [],
		apps: cache.appList || [],
		skills: cache.skillList || []
	};
}
//#endregion
//#region src/host/github-fetcher.ts
/**
* DSH 科技风工作台 - GitHub 副源抓取模块
* 包含：分片节流抓取、单个仓库四层深度解析
* 基于双源数据抓取全流程 阶段2 1:1 实现
*
* 四层解析：
*   层1：仓库基础信息（star/fork/updated_at/license/description）
*   层2：Release版本（最新tag/publish时间/changelog）
*   层3：README结构化解析（适配版本/功能简介）
*   层4：工程结构合规校验（DSH标准工程特征）
*
* 分片节流：
*   - 单次并发：20个仓库/批次
*   - 频率限制：最大2次/秒
*   - 限流触发：终止后续请求，复用旧缓存
*/
/** 插件类仓库白名单 */
const PLUGIN_WHITELIST = [
	"deepseek-harness/awesome-plugins",
	"deepseek-harness/dsh-ui-plugins",
	"cordsjs/cordis-plugin-market",
	"deepseek-harness/community-examples"
];
/** 预设类仓库白名单 */
const PRESET_WHITELIST = [
	"deepseek-harness/dsh-presets",
	"deepseek-harness/awesome-presets",
	"deepseek-harness/dsh-templates"
];
/** 应用类仓库白名单 */
const APP_WHITELIST = [
	"deepseek-harness/dsh-workflow-apps",
	"deepseek-harness/awesome-apps",
	"deepseek-harness/dsh-agent-apps"
];
/** Skill 类仓库白名单 */
const SKILL_WHITELIST = [
	"deepseek-harness/dsh-skills",
	"deepseek-harness/awesome-skills",
	"deepseek-harness/dsh-agent-skills",
	"deepseek-harness/community-skills"
];
/**
* 获取全量分类白名单（合并所有类型）
*/
function getAllWhitelist() {
	return [
		...PLUGIN_WHITELIST,
		...PRESET_WHITELIST,
		...APP_WHITELIST,
		...SKILL_WHITELIST
	];
}
/**
* 根据仓库地址判断其在白名单中的类型
* @returns ResourceType 或 null（不在白名单中）
*/
function getWhitelistType(repo) {
	if (PLUGIN_WHITELIST.includes(repo)) return "plugin";
	if (PRESET_WHITELIST.includes(repo)) return "preset";
	if (APP_WHITELIST.includes(repo)) return "app";
	if (SKILL_WHITELIST.includes(repo)) return "skill";
	return null;
}
/** 预设关键词（仓库名/描述/README） */
const PRESET_KEYWORDS = [
	"preset",
	"presets",
	"template",
	"templates",
	"prompt",
	"prompts",
	"预设",
	"模板",
	"提示词"
];
/** 应用关键词（仓库名/描述/README） */
const APP_KEYWORDS = [
	"app",
	"apps",
	"application",
	"applications",
	"workflow",
	"workflows",
	"agent",
	"agents",
	"bot",
	"bots",
	"automation",
	"应用",
	"工作流",
	"智能体",
	"自动化"
];
/** Skill 关键词（仓库名/描述/README） */
const SKILL_KEYWORDS = [
	"skill",
	"skills",
	"dsh-skill",
	"agent-skill",
	"技能",
	"能力",
	"工具集"
];
/**
* 检测仓库的资源类型（自动识别）
*
* 识别优先级：
*   1. 强制类型（用户配置显式指定）
*   2. 白名单分类
*   3. 仓库名关键词匹配
*   4. 仓库描述关键词匹配
*   5. README 关键词匹配
*   6. 默认插件类型
*
* @param repo 仓库地址 owner/repo
* @param repoInfo 仓库基础信息
* @param readmeContent README 内容（可选）
* @param forcedType 强制类型（可选，用户配置指定）
* @returns 识别出的资源类型
*/
function detectResourceType$2(repo, repoInfo, readmeContent, forcedType) {
	if (forcedType) return forcedType;
	const whitelistType = getWhitelistType(repo);
	if (whitelistType) return whitelistType;
	const fullText = `${repo} ${repoInfo?.name || repo.split("/")[1] || ""} ${repoInfo?.description || ""} ${readmeContent || ""}`.toLowerCase();
	if (PRESET_KEYWORDS.some((kw) => fullText.includes(kw.toLowerCase()))) return "preset";
	if (SKILL_KEYWORDS.some((kw) => fullText.includes(kw.toLowerCase()))) return "skill";
	if (APP_KEYWORDS.some((kw) => fullText.includes(kw.toLowerCase()))) return "app";
	return "plugin";
}
/**
* 根据安装命令前缀判断类型（辅助）
*/
function getInstallCmd(type, repo) {
	switch (type) {
		case "preset": return `dsh preset add github:${repo}`;
		case "app": return `dsh app add github:${repo}`;
		case "skill": return `dsh skill add github:${repo}`;
		default: return `dsh plugin add github:${repo}`;
	}
}
/**
* GitHub 副源异步分片抓取
*
* 执行模式：并行异步、分片节流、四层递进、解析容错
* 不阻塞 Market 主源渲染，只做增量补齐，不覆盖官方资源
*
* 资源类型识别：
*   - 白名单分类（插件/预设/应用分组）
*   - 仓库名/描述/README 关键词自动识别
*   - 用户配置显式指定（customPresetRepos / customAppRepos）
*
* @param ctx 工作台上下文
* @param token GitHub 个人访问令牌（可选，匿名模式时为空）
* @param customRepos 用户自定义通用仓库列表（自动识别类型）
* @param customPresetRepos 用户自定义预设仓库列表（强制归类为预设）
* @param customAppRepos 用户自定义应用仓库列表（强制归类为应用）
* @returns 标准化后的 GitHub 社区资源列表
*/
async function fetchGithubSource(ctx, token, customRepos = [], customPresetRepos = [], customAppRepos = []) {
	const allRepos = getGithubRepoList([...getAllWhitelist(), ...customRepos]);
	const forcedTypeMap = /* @__PURE__ */ new Map();
	customPresetRepos.forEach((r) => forcedTypeMap.set(r, "preset"));
	customAppRepos.forEach((r) => forcedTypeMap.set(r, "app"));
	const allRepoList = Array.from(/* @__PURE__ */ new Set([
		...allRepos,
		...customPresetRepos,
		...customAppRepos
	])).filter((r) => r && r.includes("/"));
	const result = [];
	ctx.logger?.info(`[GitHub] 开始抓取：共 ${allRepoList.length} 个仓库（插件白名单${PLUGIN_WHITELIST.length} + 预设白名单${PRESET_WHITELIST.length} + 应用白名单${APP_WHITELIST.length} + 自定义通用${customRepos.length} + 自定义预设${customPresetRepos.length} + 自定义应用${customAppRepos.length}），令牌=${token ? "已配置" : "匿名(60次/小时)"}`);
	for (let i = 0; i < allRepoList.length; i += 20) {
		const batch = allRepoList.slice(i, i + 20);
		const batchTasks = batch.map((repo) => fetchSingleRepo(ctx, repo, token, forcedTypeMap.get(repo)).catch((err) => {
			ctx.logger?.warn(`[GitHub] 仓库 ${repo} 抓取异常`, err);
			return null;
		}));
		const batchRes = await Promise.allSettled(batchTasks);
		for (const res of batchRes) if (res.status === "fulfilled" && res.value) result.push(res.value);
		const typeCount = {
			plugin: result.filter((r) => r.type === "plugin").length,
			preset: result.filter((r) => r.type === "preset").length,
			app: result.filter((r) => r.type === "app").length
		};
		ctx.logger?.info(`[GitHub] 批次 ${Math.floor(i / 20) + 1} 完成：本批 ${batch.length} 个，成功 ${batchRes.filter((r) => r.status === "fulfilled" && r.value).length} 个，累计 ${result.length} 个（插件${typeCount.plugin}/预设${typeCount.preset}/应用${typeCount.app}）`);
		if (i + 20 < allRepoList.length) await sleep(500);
	}
	const finalCount = {
		plugin: result.filter((r) => r.type === "plugin").length,
		preset: result.filter((r) => r.type === "preset").length,
		app: result.filter((r) => r.type === "app").length
	};
	ctx.logger?.info(`[GitHub] 抓取完成：共获取 ${result.length} 个有效社区资源（插件${finalCount.plugin}/预设${finalCount.preset}/应用${finalCount.app}）`);
	return result;
}
/**
* 单个 GitHub 仓库四层深度解析
*
* 逐层失败不击穿整体：
*   - 层1失败 → 当前仓库直接跳过
*   - 层2失败 → 标记为社区测试版，版本置0.0.0
*   - 层3失败 → 回填仓库默认描述
*   - 层4失败 → 非标准工程直接剔除
*
* 资源类型识别：
*   - forcedType 优先（用户配置显式指定）
*   - 白名单分类
*   - 仓库名/描述/README 关键词自动识别
*   - 默认插件类型
*
* @param ctx 工作台上下文
* @param repo 仓库地址 owner/repo
* @param token GitHub 访问令牌
* @param forcedType 强制资源类型（可选，用户配置指定）
* @returns 标准化资源，无效返回 null
*/
async function fetchSingleRepo(ctx, repo, token, forcedType) {
	if (!repo || !repo.includes("/")) return null;
	const headers = token ? {
		Authorization: `token ${token}`,
		Accept: "application/vnd.github.v3+json"
	} : { Accept: "application/vnd.github.v3+json" };
	const httpGet = async (url, options) => {
		return ctx.http.get(url, {
			headers: {
				...headers,
				...options?.headers || {}
			},
			timeout: options?.timeout || 5e3
		});
	};
	try {
		const repoInfoRes = await httpGet(`https://api.github.com/repos/${repo}`);
		if (repoInfoRes.status === 403 || repoInfoRes.status === 429) {
			ctx.dialog?.tip("GitHub访问受限，可配置Token提升额度");
			return null;
		}
		if (!repoInfoRes.data || repoInfoRes.status !== 200) return null;
		const repoInfo = repoInfoRes.data;
		let latestVersion = "0.0.0";
		let publishTime = 0;
		try {
			const releaseRes = await httpGet(`https://api.github.com/repos/${repo}/releases/latest`);
			if (releaseRes.status === 200 && releaseRes.data?.tag_name) {
				const release = releaseRes.data;
				latestVersion = release.tag_name;
				publishTime = new Date(release.published_at).getTime();
			}
		} catch (err) {
			ctx.logger?.warn(`[GitHub] 仓库 ${repo} 无 Release，标记为测试版`);
		}
		let desc = repoInfo.description || "社区开源资源，点击查看详情";
		let adaptVer = "all";
		let readmeContent = "";
		try {
			const readmeRes = await httpGet(`https://api.github.com/repos/${repo}/readme`);
			if (readmeRes.status === 200 && readmeRes.data?.content) {
				const readmeData = readmeRes.data;
				readmeContent = Buffer.from(readmeData.content, "base64").toString("utf-8");
				const parsed = parseReadme(readmeContent);
				if (parsed.desc) desc = parsed.desc;
				adaptVer = parsed.adaptVer;
			}
		} catch (err) {
			ctx.logger?.warn(`[GitHub] 仓库 ${repo} README 解析失败，使用默认描述`);
		}
		const resourceType = detectResourceType$2(repo, repoInfo, readmeContent, forcedType);
		if (resourceType !== "plugin" || forcedType) ctx.logger?.info(`[GitHub] 仓库 ${repo} 识别为 ${resourceType} 类型${forcedType ? "（用户指定）" : "（自动识别）"}`);
		if (!await checkDSHProjectStructure(repo, httpGet, headers)) {
			ctx.logger?.warn(`[GitHub] 仓库 ${repo} 非标准DSH工程，已过滤`);
			return null;
		}
		const githubUrl = repoInfo.html_url || `https://github.com/${repo}`;
		return createDefaultResource({
			id: repo,
			name: repoInfo.name || repo.split("/")[1],
			type: resourceType,
			category: resourceType === "preset" ? "community-preset" : resourceType === "app" ? "community-app" : "community",
			description: desc,
			author: repoInfo.owner?.login || "",
			source: "github",
			isOfficial: false,
			latestVersion,
			localVersion: "0.0.0",
			updateAvailable: false,
			adaptVersion: adaptVer,
			star: repoInfo.stargazers_count || 0,
			fork: repoInfo.forks_count || 0,
			updateTime: publishTime || new Date(repoInfo.updated_at).getTime() || Date.now(),
			installCmd: getInstallCmd(resourceType, repo),
			homepage: githubUrl,
			configPath: "",
			isInstalled: false,
			isEnabled: false
		});
	} catch (err) {
		if (err?.status === 403 || err?.response?.status === 403) ctx.dialog?.tip("GitHub访问受限，可配置Token提升额度");
		ctx.logger?.warn(`[GitHub] 仓库 ${repo} 抓取失败`, err);
		return null;
	}
}
//#endregion
//#region src/host/category-classifier.ts
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
const CATEGORY_DEFINITIONS = [
	{
		name: "金融数据",
		priority: 1,
		keywords: [
			"finance",
			"stock",
			"fund",
			"market",
			"trading",
			"money",
			"cost",
			"billing",
			"usage",
			"price",
			"quote",
			"行情",
			"基金",
			"股票",
			"金融",
			"费用",
			"计费",
			"余额",
			"钱包",
			"投资",
			"xueqiu",
			"雪球",
			"fund-research",
			"cost-meter",
			"usage-billing",
			"whale-widget",
			"小鲸鱼",
			"quant",
			"量化"
		]
	},
	{
		name: "视觉多模态",
		priority: 1,
		keywords: [
			"vision",
			"image",
			"video",
			"audio",
			"voice",
			"multimodal",
			"ocr",
			"speech",
			"tts",
			"stt",
			"视觉",
			"图像",
			"视频",
			"音频",
			"语音",
			"多模态",
			"看图",
			"生图",
			"画图",
			"modlens",
			"eyes",
			"vision-bridge",
			"image-pathify",
			"tool-vision",
			"vision-router",
			"画",
			"图"
		]
	},
	{
		name: "移动远程",
		priority: 1,
		keywords: [
			"mobile",
			"remote",
			"bridge",
			"tunnel",
			"access",
			"pocket",
			"phone",
			"android",
			"ios",
			"移动端",
			"远程",
			"隧道",
			"桥接",
			"口袋",
			"手机",
			"公网",
			"局域网",
			"扫码",
			"dsh-bridge",
			"dsh-pocket",
			"dsh-mobile",
			"cloudflare",
			"frp",
			"ngrok",
			"tailscale"
		]
	},
	{
		name: "搜索联网",
		priority: 2,
		keywords: [
			"search",
			"browser",
			"web",
			"fetch",
			"crawl",
			"scrape",
			"internet",
			"online",
			"network",
			"搜索",
			"浏览器",
			"联网",
			"网页",
			"抓取",
			"爬虫",
			"搜索引擎",
			"anysearch",
			"free-search",
			"builtin-browser",
			"bing",
			"duckduckgo",
			"google",
			"searx"
		]
	},
	{
		name: "模型路由",
		priority: 2,
		keywords: [
			"model",
			"proxy",
			"router",
			"llm",
			"subscription",
			"oauth",
			"fallback",
			"routing",
			"provider",
			"模型",
			"代理",
			"路由",
			"订阅",
			"提供商",
			"模型切换",
			"负载均衡",
			"omni-router",
			"model-proxy",
			"codex-subscription",
			"codex-connect",
			"subscriptions",
			"antigravity",
			"chatgpt",
			"claude",
			"grok",
			"kimi",
			"glm",
			"copilot"
		]
	},
	{
		name: "安全认证",
		priority: 2,
		keywords: [
			"auth",
			"login",
			"security",
			"privacy",
			"backup",
			"sync",
			"encrypt",
			"permission",
			"认证",
			"登录",
			"安全",
			"隐私",
			"备份",
			"同步",
			"加密",
			"权限",
			"webui-auth",
			"dsh-auth",
			"config-manager",
			"password",
			"token",
			"credential"
		]
	},
	{
		name: "UI界面增强",
		priority: 3,
		keywords: [
			"skin",
			"theme",
			"ui",
			"workbench",
			"dashboard",
			"widget",
			"pet",
			"wallpaper",
			"desktop",
			"tui",
			"interface",
			"界面",
			"皮肤",
			"主题",
			"工作台",
			"仪表盘",
			"小组件",
			"宠物",
			"壁纸",
			"桌面",
			"终端界面",
			"ui增强",
			"tech-skin",
			"dream-skin",
			"personal-workbench",
			"genui",
			"wallpaper-engine",
			"dsh-pet",
			"dafeiyu",
			"bigfish",
			"大肥鱼",
			"ui-usage",
			"server-deck"
		]
	},
	{
		name: "数据记忆",
		priority: 3,
		keywords: [
			"memory",
			"context",
			"session",
			"archive",
			"history",
			"knowledge",
			"note",
			"storage",
			"database",
			"rdb",
			"记忆",
			"上下文",
			"会话",
			"归档",
			"历史",
			"知识库",
			"笔记",
			"存储",
			"数据库",
			"mnemon",
			"memory-eternal",
			"session-manager",
			"session-rdb",
			"session-branch",
			"archive-manager",
			"context-insight",
			"chat-import"
		]
	},
	{
		name: "办公效率",
		priority: 3,
		keywords: [
			"office",
			"doc",
			"excel",
			"sheet",
			"slide",
			"feishu",
			"lark",
			"im",
			"chat",
			"calendar",
			"task",
			"todo",
			"plan",
			"reminder",
			"notification",
			"email",
			"mail",
			"办公",
			"文档",
			"表格",
			"幻灯片",
			"飞书",
			"日历",
			"任务",
			"待办",
			"计划",
			"提醒",
			"通知",
			"邮件",
			"即时通讯",
			"univer-office",
			"dsh-im",
			"feishu-bot",
			"personal-workbench",
			"taskboard",
			"project"
		]
	},
	{
		name: "系统运维",
		priority: 3,
		keywords: [
			"server",
			"monitor",
			"system",
			"windows",
			"linux",
			"docker",
			"deploy",
			"ops",
			"infrastructure",
			"metric",
			"服务器",
			"监控",
			"系统",
			"运维",
			"部署",
			"指标",
			"性能",
			"server-deck",
			"dsh-win32",
			"pc-optimizer",
			"sys-watchdog",
			"cpu",
			"memory",
			"disk",
			"进程"
		]
	},
	{
		name: "研究学习",
		priority: 3,
		keywords: [
			"research",
			"study",
			"learn",
			"write",
			"translate",
			"summary",
			"paper",
			"academic",
			"science",
			"研究",
			"学习",
			"写作",
			"翻译",
			"总结",
			"论文",
			"学术",
			"科学",
			"fund-research",
			"scientific-evidence",
			"metatutor",
			"literature",
			"citation",
			"reference"
		]
	},
	{
		name: "API集成",
		priority: 3,
		keywords: [
			"mcp",
			"api",
			"integration",
			"connector",
			"webhook",
			"sdk",
			"集成",
			"连接器",
			"接口",
			"webhook",
			"mcp-connector",
			"mcp-panel",
			"obsidian-assistant",
			"notion",
			"slack",
			"discord",
			"telegram",
			"wechat"
		]
	},
	{
		name: "开发工具",
		priority: 4,
		keywords: [
			"code",
			"git",
			"github",
			"terminal",
			"shell",
			"dev",
			"debug",
			"codex",
			"cursor",
			"claude",
			"ide",
			"editor",
			"代码",
			"git",
			"终端",
			"shell",
			"开发",
			"调试",
			"编辑器",
			"find-plugin",
			"upstream-radar",
			"plugin-scorecard",
			"git",
			"diff",
			"commit",
			"branch",
			"pr",
			"pull request"
		]
	},
	{
		name: "插件生态",
		priority: 5,
		keywords: [
			"plugin",
			"market",
			"manager",
			"config",
			"find",
			"discover",
			"install",
			"gallery",
			"插件",
			"市场",
			"管理",
			"配置",
			"发现",
			"安装",
			"画廊",
			"生态",
			"dsh-plugin",
			"dshmarket",
			"plugin-market",
			"awesome",
			"registry",
			"catalog",
			"directory"
		]
	}
];
/**
* 根据资源信息自动分类
*
* @param name 资源名称（包名）
* @param description 资源描述
* @param keywords 关键词列表（可选，来自 npm package.json）
* @returns 分类名称
*/
function classifyResource(name, description = "", keywords = []) {
	const text = `${name.toLowerCase()} ${description.toLowerCase()} ${keywords.join(" ").toLowerCase()}`;
	const scores = [];
	for (const cat of CATEGORY_DEFINITIONS) {
		let score = 0;
		for (const kw of cat.keywords) if (text.includes(kw.toLowerCase())) score += 1;
		if (score > 0) scores.push({
			name: cat.name,
			score,
			priority: cat.priority
		});
	}
	if (scores.length === 0) return "其他";
	scores.sort((a, b) => {
		if (a.priority !== b.priority) return a.priority - b.priority;
		return b.score - a.score;
	});
	return scores[0].name;
}
//#endregion
//#region src/host/local-fetcher.ts
/**
* 读取本地已安装的插件列表
* @param ctx 工作台上下文
* @returns 标准化后的本地插件资源列表
*/
async function fetchLocalInstalledPlugins(ctx) {
	const result = [];
	try {
		const profileDir = path$1.join(ctx.env.DSH_HOME, "profiles", "web");
		const nodeModulesDir = path$1.join(profileDir, "node_modules");
		ctx.logger?.info(`[Local] 开始读取本地已安装插件: ${nodeModulesDir}`);
		if (!await ctx.fs.exists(nodeModulesDir)) {
			ctx.logger?.warn(`[Local] node_modules 目录不存在: ${nodeModulesDir}`);
			return result;
		}
		const packageJsonPath = path$1.join(profileDir, "package.json");
		let dependencies = {};
		if (await ctx.fs.exists(packageJsonPath)) try {
			const packageJsonRaw = await ctx.fs.readFile(packageJsonPath, "utf8");
			const packageJson = JSON.parse(packageJsonRaw);
			dependencies = {
				...packageJson.dependencies || {},
				...packageJson.devDependencies || {}
			};
			ctx.logger?.info(`[Local] 从 package.json 读取到 ${Object.keys(dependencies).length} 个依赖`);
		} catch (err) {
			ctx.logger?.warn("[Local] 读取 package.json 失败", err);
		}
		let scanned = 0;
		let skipped = 0;
		for (const [pkgName, pkgVersion] of Object.entries(dependencies)) {
			scanned++;
			try {
				if (isCoreDependency(pkgName)) {
					skipped++;
					continue;
				}
				const pluginPackageJsonPath = path$1.join(nodeModulesDir, pkgName, "package.json");
				if (!await ctx.fs.exists(pluginPackageJsonPath)) {
					skipped++;
					continue;
				}
				const pluginRaw = await ctx.fs.readFile(pluginPackageJsonPath, "utf8");
				const pluginPkg = JSON.parse(pluginRaw);
				const name = pluginPkg.name || pkgName;
				const version = pluginPkg.version || pkgVersion || "0.0.0";
				const description = pluginPkg.description || "";
				const author = typeof pluginPkg.author === "string" ? pluginPkg.author : pluginPkg.author?.name || "unknown";
				const type = detectResourceType$1(name, description, pluginPkg);
				const category = classifyResource(name, description, pluginPkg.keywords || []);
				if (!isValidSemver(version)) {
					skipped++;
					continue;
				}
				let homepage = pluginPkg.homepage || pluginPkg.repository?.url || "";
				if (homepage.startsWith("git+")) homepage = homepage.replace("git+", "").replace(".git", "");
				if (!homepage || !homepage.startsWith("http")) homepage = `https://www.npmjs.com/package/${encodeURIComponent(name)}`;
				const resource = createDefaultResource({
					id: name,
					name: pluginPkg.displayName || name,
					type,
					category: pluginPkg.category || category,
					description: description || "本地已安装插件",
					author,
					source: "local",
					isOfficial: false,
					isInstalled: true,
					latestVersion: version,
					localVersion: version,
					adaptVersion: pluginPkg.engines?.dsh || "all",
					updateTime: Date.now(),
					star: 0,
					fork: 0,
					installCmd: `dsh plugin --profile web add ${name}`,
					homepage,
					configPath: ""
				});
				result.push(resource);
			} catch (err) {
				ctx.logger?.warn(`[Local] 读取插件 ${pkgName} 失败`, err);
				skipped++;
			}
		}
		ctx.logger?.info(`[Local] 读取完成：扫描 ${scanned} 个，跳过 ${skipped} 个，有效 ${result.length} 个`);
		if (result.length > 0) {
			const names = result.slice(0, 10).map((r) => r.name);
			ctx.logger?.info(`[Local] 前10个插件: ${names.join(", ")}`);
		}
		return result;
	} catch (err) {
		ctx.logger?.warn("[Local] 读取本地插件失败，降级为空列表", err);
		return result;
	}
}
/**
* 判断是否是核心依赖（非 DSH 插件）
*/
function isCoreDependency(name) {
	return [
		"react",
		"react-dom",
		"react-is",
		"scheduler",
		"loose-envify",
		"js-tokens",
		"@deepseek-ai"
	].some((dep) => name === dep || name.startsWith(dep + "/"));
}
/**
* 根据包名和描述判断资源类型
*/
function detectResourceType$1(name, description, pkg) {
	if (pkg.dsh?.type) switch (pkg.dsh.type) {
		case "plugin": return "plugin";
		case "preset": return "preset";
		case "app": return "app";
		case "skill": return "skill";
	}
	const lowerName = name.toLowerCase();
	if (lowerName.includes("preset") || lowerName.includes("template")) return "preset";
	if (lowerName.includes("app") || lowerName.includes("agent") || lowerName.includes("workflow")) return "app";
	if (lowerName.includes("skill")) return "skill";
	return "plugin";
}
//#endregion
//#region src/host/resource-meta-database.ts
/**
* 知名插件描述数据库
* 基于每个插件的 GitHub README 真实内容总结
*/
const PLUGIN_META_DATABASE = {
	"@anysearch/anysearch-dsh": {
		id: "@anysearch/anysearch-dsh",
		name: "AnySearch 搜索",
		description: "由 AnySearch 驱动，为 DSH 提供实时网页搜索与垂直领域搜索能力，支持多搜索引擎聚合和高级搜索工具。",
		homepage: "https://anysearch.com",
		category: "搜索联网",
		icon: "🔎",
		tags: [
			"搜索",
			"网页获取",
			"AnySearch",
			"多引擎"
		]
	},
	"dsh-free-search": {
		id: "dsh-free-search",
		name: "免费网页搜索",
		description: "DSH 免费网页搜索插件，集成 10 个搜索引擎（Bing/DuckDuckGo/AnySearch/SearXNG 等），无需 API Key，开箱即用，支持网页内容抓取和摘要。",
		homepage: "https://github.com/DDDMUC/dsh-free-search#readme",
		category: "搜索联网",
		icon: "🆓",
		tags: [
			"免费搜索",
			"多引擎",
			"无需API Key",
			"网页抓取"
		]
	},
	"dsh-builtin-browser": {
		id: "dsh-builtin-browser",
		name: "内置真实浏览器",
		description: "DSH 共享真实浏览器插件，安装即用，提供可见的原生浏览器，支持网页交互、截图、表单填写等操作，AI 可直接操作浏览器完成复杂任务。",
		homepage: "https://github.com/wqty123/dsh-browser",
		category: "搜索联网",
		icon: "🌐",
		tags: [
			"浏览器",
			"网页交互",
			"截图",
			"自动化"
		]
	},
	"@liustack/modsearch": {
		id: "@liustack/modsearch",
		name: "ModSearch 编码搜索",
		description: "专为编码代理优化的免费网页搜索插件，精准检索技术文档、代码示例和 StackOverflow 答案，是 DSH 最强免费联网搜索插件。",
		homepage: "https://github.com/liustack/modsearch",
		category: "搜索联网",
		icon: "🔍",
		tags: [
			"编码搜索",
			"技术文档",
			"代码检索",
			"免费"
		]
	},
	"dsh-agent-browser": {
		id: "dsh-agent-browser",
		name: "Agent 浏览器工具",
		description: "基于 agent-browser 的 DSH 原生浏览器工具，快照+引用自动管理，AI 可直接操作浏览器完成网页导航、数据提取、表单提交等复杂任务。",
		homepage: "https://github.com/shantanugoel/dsh-browser-control#readme",
		category: "搜索联网",
		icon: "🕸️",
		tags: [
			"浏览器",
			"Agent工具",
			"自动化",
			"网页操作"
		]
	},
	"@changfenhuang/dsh-genui": {
		id: "@changfenhuang/dsh-genui",
		name: "GenUI 交互组件",
		description: "让模型回答长出可交互界面——文字还在，可交互的 UI 已经能用。支持数据面板、表单、函数绘图、音视频、3D 组件等，直接渲染在 DSH 对话中。",
		homepage: "https://omdsh-dev.github.io/dsh-genui/",
		category: "UI界面增强",
		icon: "✨",
		tags: [
			"UI组件",
			"交互",
			"动态渲染",
			"数据面板"
		]
	},
	"@dely0/dsh-personal-workbench": {
		id: "@dely0/dsh-personal-workbench",
		name: "个人工作台",
		description: "DSH 个人工作台插件：日历（周/月切换）+ 树状层级任务列表 + AI 澄清/拆解/执行/复盘全流程，AI 智能排序和日报周报，桌面提醒，数据完全本地存储。",
		homepage: "https://github.com/dely0/dsh-personal-workbench",
		category: "UI界面增强",
		icon: "📅",
		tags: [
			"工作台",
			"日历",
			"任务管理",
			"日报",
			"本地存储"
		]
	},
	"dsh-tech-skin": {
		id: "dsh-tech-skin",
		name: "科技风皮肤",
		description: "4种科技风皮肤主题（Tokyo Night深色/GitHub Light浅色/液态玻璃深/液态玻璃浅），通过overrideTokens覆盖DSH原生变量，兼容light/dark/system主题模式。",
		homepage: "https://www.npmjs.com/package/dsh-tech-skin",
		category: "UI界面增强",
		icon: "🎨",
		tags: [
			"皮肤",
			"主题",
			"科技风",
			"玻璃拟态"
		]
	},
	"dsh-tech-workbench": {
		id: "dsh-tech-workbench",
		name: "Meta管理工作台",
		description: "插件/预设/应用/Skill统一管理工作台，四源数据抓取（本地/npm/dshdesktop/GitHub），智能分类筛选排序，现代化卡片设计，支持源站跳转和安装命令复制。",
		homepage: "https://www.npmjs.com/package/dsh-tech-workbench",
		category: "UI界面增强",
		icon: "🗂️",
		tags: [
			"工作台",
			"插件管理",
			"市场",
			"分类",
			"四源抓取"
		]
	},
	"dsh-dream-skin": {
		id: "dsh-dream-skin",
		name: "Dream Skin 换肤",
		description: "DSH 换肤插件，提供 8 套 iOS/Linear 式清透冷调高质感主题，弥散光壁纸，动态渐变背景，支持自定义强调色和侧边栏宽度，设置页可视化切换。",
		homepage: "https://github.com/RevolutionLA/dsh-dream-skin#readme",
		category: "UI界面增强",
		icon: "🌙",
		tags: [
			"皮肤",
			"主题",
			"iOS风格",
			"弥散光",
			"8套主题"
		]
	},
	"@nonamelego/dsh-catppuccin": {
		id: "@nonamelego/dsh-catppuccin",
		name: "Catppuccin 主题",
		description: "Catppuccin 主题 + 可切换的玻璃拟态皮肤，为 DSH 提供温暖柔和的配色方案，支持 4 种 Catppuccin 风味（Latte/Frappe/Macchiato/Mocha）。",
		homepage: "https://github.com/nonamelego/dsh-catppuccin",
		category: "UI界面增强",
		icon: "🐱",
		tags: [
			"Catppuccin",
			"主题",
			"玻璃拟态",
			"配色"
		]
	},
	"dsh-plugin-wallpaper-engine": {
		id: "dsh-plugin-wallpaper-engine",
		name: "Wallpaper Engine 壁纸",
		description: "把电脑上的 Wallpaper Engine 壁纸变成 DSH 网页界面背景，支持视频/网页/场景壁纸，iOS 风格液态玻璃效果，壁纸选择弹窗，视频倍速，自定义上传壁纸。",
		homepage: "https://github.com/elysia395/dsh-wallpaper-engine#readme",
		category: "UI界面增强",
		icon: "🖼️",
		tags: [
			"壁纸",
			"Wallpaper Engine",
			"动态背景",
			"液态玻璃"
		]
	},
	"dsh-pet": {
		id: "dsh-pet",
		name: "桌面宠物",
		description: "DSH Web 界面浮动桌面宠物，空闲呼吸动画，偶尔互动，陪伴编码时光，支持多种宠物形象和互动动作，治愈系桌面装饰。",
		homepage: "https://github.com/PC2005-cloud/dsh-pet#readme",
		category: "UI界面增强",
		icon: "🐱",
		tags: [
			"宠物",
			"桌面陪伴",
			"动画",
			"治愈"
		]
	},
	"dsh-dafeiyu": {
		id: "dsh-dafeiyu",
		name: "大肥鱼陪伴",
		description: "桌面原生大肥鱼陪伴组件，由 DSH 会话事件驱动，随你的编码状态变化表情和动作，桌面级悬浮窗口，不占用浏览器空间。",
		homepage: "https://github.com/QCYTSN/dsh-dafeiyu#readme",
		category: "UI界面增强",
		icon: "🐟",
		tags: [
			"宠物",
			"大肥鱼",
			"陪伴",
			"桌面悬浮"
		]
	},
	"whale-on-desk": {
		id: "whale-on-desk",
		name: "像素鲸鱼桌面伙伴",
		description: "像素艺术风格鲸鱼桌面伙伴，在 DSH 界面游动，支持互动和喂食，治愈系桌面装饰，复古像素风格。",
		homepage: "https://cookiesheep.github.io/whale-on-desk",
		category: "UI界面增强",
		icon: "🐳",
		tags: [
			"像素艺术",
			"鲸鱼",
			"桌面装饰",
			"治愈"
		]
	},
	"dsh-whale-widget": {
		id: "dsh-whale-widget",
		name: "小鲸鱼余额挂件",
		description: "DSH Web 界面右下角常驻余额挂件，小鲸鱼气泡图 + DeepSeek API 余额 + 今日已用 + 每轮对话消耗统计，峰谷定价，随机台词和音效，每次打开自动启用。",
		homepage: "https://github.com/MeteorNOX/DeepSeek-Balance-Whale-Widget#readme",
		category: "UI界面增强",
		icon: "🐋",
		tags: [
			"余额",
			"小鲸鱼",
			"挂件",
			"消耗统计",
			"峰谷定价"
		]
	},
	"@aiwayds/dsh-tui-pi": {
		id: "@aiwayds/dsh-tui-pi",
		name: "Pi 风格终端UI",
		description: "功能完整的 Pi 风格终端 UI，历史记录查找，多会话管理，键盘快捷键，终端爱好者首选，提供类 Pi 的沉浸式交互体验。",
		homepage: "https://github.com/fan56/dsh-tui-pi#readme",
		category: "UI界面增强",
		icon: "⌨️",
		tags: [
			"终端UI",
			"TUI",
			"Pi风格",
			"多会话"
		]
	},
	"dsh-vscode-mode": {
		id: "dsh-vscode-mode",
		name: "VSCode 编码体验",
		description: "DSH 上的类 VSCode 编码体验，Monaco 编辑器（文件页签/QuickOpen/状态栏），可驻留 DSH 界面，提供专业的代码编辑体验。",
		homepage: "https://github.com/Lenonss/DSH_VsCodeMode",
		category: "UI界面增强",
		icon: "💻",
		tags: [
			"VSCode",
			"编辑器",
			"Monaco",
			"代码编辑"
		]
	},
	"dsh-music-player": {
		id: "dsh-music-player",
		name: "音乐播放器",
		description: "Vibe coding 时的好伴侣，DSH 内置音乐播放器，支持本地音乐播放，播放列表管理，音量控制，让编码时光更有氛围。",
		homepage: "https://github.com/kendu76/dsh-music-player",
		category: "UI界面增强",
		icon: "🎵",
		tags: [
			"音乐",
			"播放器",
			"Vibe coding",
			"氛围"
		]
	},
	"@liustack/modlens": {
		id: "@liustack/modlens",
		name: "ModLens 视觉插件",
		description: "为纯文本模型补上视觉能力，直接粘贴图片就能识别，由免费 Antigravity CLI 驱动，是全网最强的 DSH 视觉插件，支持图像理解和分析。",
		homepage: "https://github.com/liustack/modlens",
		category: "视觉多模态",
		icon: "👁️",
		tags: [
			"视觉",
			"图像理解",
			"多模态",
			"Antigravity",
			"免费"
		]
	},
	"@kobenfang/dsh-eyes": {
		id: "@kobenfang/dsh-eyes",
		name: "Eyes 视觉技能",
		description: "DSH Agent 视觉技能，让 AI 具备视觉能力，支持图像识别和分析，可作为 Skill 加载使用，扩展 AI 的视觉感知能力。",
		homepage: "https://www.npmjs.com/package/%40kobenfang%2Fdsh-eyes",
		category: "视觉多模态",
		icon: "👀",
		tags: [
			"视觉",
			"技能",
			"图像识别",
			"Skill"
		]
	},
	"@goodandready/dsh-vision-bridge": {
		id: "@goodandready/dsh-vision-bridge",
		name: "视觉桥接枢纽",
		description: "旗舰多模态视觉枢纽，约 40 个工具，支持图像/视频/音频处理，AI 多模态能力全面增强，是 DSH 最强大的视觉处理插件。",
		homepage: "https://github.com/GooDAnDReaDY/dsh-vision-bridge",
		category: "视觉多模态",
		icon: "🌉",
		tags: [
			"视觉",
			"多模态",
			"图像",
			"视频",
			"音频",
			"40+工具"
		]
	},
	"dsh-image-gen": {
		id: "dsh-image-gen",
		name: "图像生成",
		description: "为 DSH 带来 ChatGPT 式图像生成，由 Gemini 驱动，支持海报/Banner/人像等生成，AI 绘图更简单，直接在对话中生成和展示图片。",
		homepage: "https://github.com/shanliuling/dsh-image-gen#readme",
		category: "视觉多模态",
		icon: "🎨",
		tags: [
			"图像生成",
			"绘图",
			"Gemini",
			"AI绘画"
		]
	},
	"@flowingspring/dsh-voco": {
		id: "@flowingspring/dsh-voco",
		name: "语音对话",
		description: "DSH 持久语音对话，云端语音识别，支持语音输入和输出，解放双手，自然对话，提供沉浸式语音交互体验。",
		homepage: "https://github.com/lgquan/dsh-voco#readme",
		category: "视觉多模态",
		icon: "🎤",
		tags: [
			"语音",
			"对话",
			"语音识别",
			"TTS",
			"云端"
		]
	},
	"dsh-agent-voice": {
		id: "dsh-agent-voice",
		name: "Agent 语音",
		description: "给 DSH Agent 一个声音，它会朗读回复，支持语音合成，让 AI 回复更有温度，可配置不同音色和语速。",
		homepage: "https://github.com/meliodascz89/dsh-agent-voice#readme",
		category: "视觉多模态",
		icon: "🔊",
		tags: [
			"语音",
			"TTS",
			"朗读",
			"语音合成"
		]
	},
	"@wenbin_wb/dsh-bridge": {
		id: "@wenbin_wb/dsh-bridge",
		name: "移动端桥接",
		description: "手机扫码即可在移动端/公网继续用 DSH，人不在电脑前也能接着干。一键局域网二维码、Cloudflare 公网隧道、自建隧道与微信接入，支持安全认证。",
		homepage: "https://github.com/wenbin-wb/dsh-bridge",
		category: "移动远程",
		icon: "📱",
		tags: [
			"移动端",
			"桥接",
			"公网",
			"二维码",
			"Cloudflare",
			"微信"
		]
	},
	"dsh-pocket": {
		id: "dsh-pocket",
		name: "口袋 DSH",
		description: "把 DSH 装进口袋，一个包、一个设置页，手机扫码即同步访问电脑上的 DSH（局域网 + 公网，实时同屏），随时随地继续工作。",
		homepage: "https://github.com/shaobeichen/dsh-pocket",
		category: "移动远程",
		icon: "👖",
		tags: [
			"口袋",
			"移动端",
			"远程访问",
			"同屏",
			"局域网"
		]
	},
	"dsh-mobile": {
		id: "dsh-mobile",
		name: "移动端适配",
		description: "DSH 移动端适配与安全访问插件，支持局域网、远程连接、Android App 和手机浏览器，提供移动端优化的界面和安全的远程访问。",
		homepage: "https://github.com/saya-ch/dsh-mobile#readme",
		category: "移动远程",
		icon: "📲",
		tags: [
			"移动端",
			"适配",
			"远程",
			"Android",
			"安全访问"
		]
	},
	"dsh-remote": {
		id: "dsh-remote",
		name: "远程工作助手",
		description: "DSH 远程工作助手，连接 SSH（密码/密钥），远程文件操作，命令执行，远程开发更便捷，支持多服务器管理和文件传输。",
		homepage: "https://github.com/flymysql/dsh-remote",
		category: "移动远程",
		icon: "🔗",
		tags: [
			"远程",
			"SSH",
			"远程开发",
			"文件操作",
			"命令执行"
		]
	},
	"ds-harness-remote": {
		id: "ds-harness-remote",
		name: "加密远程访问",
		description: "端到端加密远程访问 DSH 和环境，安全的远程连接，保护数据传输安全，支持多设备访问和权限管理。",
		homepage: "https://github.com/liguobao/ds-harness-remote#readme",
		category: "移动远程",
		icon: "🔒",
		tags: [
			"远程",
			"加密",
			"E2EE",
			"安全访问",
			"端到端"
		]
	},
	"dsh-remote-plugin": {
		id: "dsh-remote-plugin",
		name: "DSH Remote 官方插件",
		description: "DSH Remote 官方 bundle 插件，DSH 左侧原生边栏入口 + 右侧抽屉内嵌管理控制台，内置网关随 DSH 启动，提供官方级远程访问体验。",
		homepage: "https://github.com/Blank-not-black/dsh-Remote",
		category: "移动远程",
		icon: "📡",
		tags: [
			"Remote",
			"官方",
			"网关",
			"远程管理",
			"原生边栏"
		]
	},
	"pi2dsh": {
		id: "pi2dsh",
		name: "Pi 生态桥接",
		description: "桥接 Pi 和 DSH 生态系统，通用 Pi 技能适配层，让 Pi 生态的技能和工具可以在 DSH 中使用，扩展 DSH 的能力边界。",
		homepage: "https://github.com/weijiafu14/pi2dsh#readme",
		category: "移动远程",
		icon: "🥧",
		tags: [
			"Pi",
			"桥接",
			"生态",
			"技能适配"
		]
	},
	"dsh-univer-office": {
		id: "dsh-univer-office",
		name: "Univer Office 办公",
		description: "DSH × Univer 集成，捆绑协作网关和查看器，内联电子表格/文档/幻灯片，AI 辅助办公全流程，支持多人实时协作和文档编辑。",
		homepage: "https://github.com/dream-num/dsh-univer-office",
		category: "办公效率",
		icon: "📊",
		tags: [
			"Office",
			"电子表格",
			"文档",
			"幻灯片",
			"协作",
			"Univer"
		]
	},
	"@xmanrui/dsh-im": {
		id: "@xmanrui/dsh-im",
		name: "多渠道 IM 接入",
		description: "把十一种 IM 渠道和公网 AI Office 接入本机 DSH，支持微信/飞书/钉钉/Telegram/Discord/Slack 等，随时随地用 AI 处理消息和任务。",
		homepage: "https://github.com/xmanrui/dsh-im",
		category: "办公效率",
		icon: "💬",
		tags: [
			"IM",
			"多渠道",
			"微信",
			"飞书",
			"钉钉",
			"Telegram",
			"11种渠道"
		]
	},
	"dsh-feishu-bot": {
		id: "dsh-feishu-bot",
		name: "飞书 Bot 接入",
		description: "把 DSH 装进飞书/Lark 的 bot，扫码即用，DSH Web 可视化设置，流式卡片，项目工作区，并行任务，多角色，企业级 AI 助手。",
		homepage: "https://github.com/PlutoKeating/dsh-lark-bot#readme",
		category: "办公效率",
		icon: "🐦",
		tags: [
			"飞书",
			"Lark",
			"Bot",
			"企业协作",
			"流式卡片",
			"并行任务"
		]
	},
	"dsh-lark-bot": {
		id: "dsh-lark-bot",
		name: "Lark Bot 接入",
		description: "把 DSH 装进飞书/Lark 的 bot，扫码即用，DSH Web 可视化设置，流式卡片，项目工作区，并行任务，多角色，企业级 AI 助手。",
		homepage: "https://github.com/PlutoKeating/dsh-lark-bot#readme",
		category: "办公效率",
		icon: "🕊️",
		tags: [
			"Lark",
			"飞书",
			"Bot",
			"企业协作",
			"流式卡片"
		]
	},
	"dsh-office-tools": {
		id: "dsh-office-tools",
		name: "Office 工具集",
		description: "DSH 模型面向 Office 工具，创建/读取/更新 Word/Excel/PPT，AI 辅助文档处理，支持复杂格式和模板，让 AI 直接操作 Office 文档。",
		homepage: "https://github.com/kw78/dsh-office-tools#readme",
		category: "办公效率",
		icon: "📝",
		tags: [
			"Office",
			"Word",
			"Excel",
			"PPT",
			"文档处理"
		]
	},
	"dsh-excel-chat": {
		id: "dsh-excel-chat",
		name: "Excel 对话",
		description: "在 DSH 中与 Excel 对话，创建/编辑电子表格，自然语言操作表格，数据处理更简单，支持公式生成和数据分析。",
		homepage: "https://github.com/hccccc01333/dsh-excel-chat",
		category: "办公效率",
		icon: "📈",
		tags: [
			"Excel",
			"电子表格",
			"对话式操作",
			"数据分析"
		]
	},
	"dsh-office": {
		id: "dsh-office",
		name: "Agent Office 仪表板",
		description: "DSH Agent-office 仪表板，6 列看板，任务/项目/文档/会议/邮件/日程统一管理，AI 办公中枢，提升工作效率。",
		homepage: "https://github.com/Fayelin12/dsh-office#readme",
		category: "办公效率",
		icon: "🏢",
		tags: [
			"Office",
			"仪表板",
			"看板",
			"任务管理",
			"6列"
		]
	},
	"dsh-wecom": {
		id: "dsh-wecom",
		name: "企业微信 Bot",
		description: "dsh-wecom 企业微信 AI Bot 渠道，每个会话独立，支持企业微信消息接入 DSH，企业级 AI 助手，支持消息推送和交互式卡片。",
		homepage: "https://github.com/TtTRz/dsh-wecom#readme",
		category: "办公效率",
		icon: "🏭",
		tags: [
			"企业微信",
			"WeCom",
			"Bot",
			"企业级",
			"消息接入"
		]
	},
	"dsh-wechat": {
		id: "dsh-wechat",
		name: "微信桥接",
		description: "桥接微信（iLink bot）到 DSH，微信消息直接接入 AI，随时随地用 DSH 处理消息和任务，支持个人微信和微信群。",
		homepage: "https://github.com/pan17/dsh-wechat#readme",
		category: "办公效率",
		icon: "💚",
		tags: [
			"微信",
			"WeChat",
			"桥接",
			"消息接入",
			"iLink"
		]
	},
	"@kriskwok/dsh-feishu-gateway": {
		id: "@kriskwok/dsh-feishu-gateway",
		name: "飞书网关",
		description: "DSH 原生飞书（Lark）网关，与飞书对话，支持消息/文档/日历/任务双向同步，企业协作无缝衔接，提供完整的飞书 API 封装。",
		homepage: "https://github.com/kriskwok/dsh-feishu-gateway",
		category: "办公效率",
		icon: "🌉",
		tags: [
			"飞书",
			"Lark",
			"网关",
			"企业协作",
			"双向同步"
		]
	},
	"@huanlin/dsh-plugin-better-sidebar-plugin-office": {
		id: "@huanlin/dsh-plugin-better-sidebar-plugin-office",
		name: "Office 文件预览",
		description: "DSH Web 插件，Office 文件预览器（.docx/.xlsx/.pptx），在 DSH 中直接预览 Office 文档，无需下载打开，提升办公效率。",
		homepage: "https://www.npmjs.com/package/%40huanlin%2Fdsh-plugin-better-sidebar-plugin-office",
		category: "办公效率",
		icon: "📄",
		tags: [
			"Office",
			"文件预览",
			"docx",
			"xlsx",
			"pptx"
		]
	},
	"dsh-fund-research": {
		id: "dsh-fund-research",
		name: "基金研究",
		description: "DSH 中国公募基金研究插件，收集基金数据，分析业绩/持仓/风险/评级，辅助投资决策，专业金融工具，支持基金对比和筛选。",
		homepage: "https://github.com/PerryLink/dsh-fund-research#readme",
		category: "金融数据",
		icon: "📊",
		tags: [
			"基金",
			"公募",
			"投资研究",
			"金融",
			"业绩分析"
		]
	},
	"dsh-xueqiu": {
		id: "dsh-xueqiu",
		name: "雪球行情面板",
		description: "雪球 mini 行情面板，DSH 免登录 A股/港美股实时行情，K线（蜡烛/成交量/均线），分时图，热榜，搜索，7x24 快讯，投资必备工具。",
		homepage: "https://github.com/wanderer-yk/dsh-xueqiu#readme",
		category: "金融数据",
		icon: "📈",
		tags: [
			"雪球",
			"股票",
			"行情",
			"A股",
			"港股",
			"美股",
			"K线",
			"7x24快讯"
		]
	},
	"dsh-cost-meter": {
		id: "dsh-cost-meter",
		name: "会话费用统计",
		description: "DSH 会话费用统计插件，本会话成本/当日费用/历史记录与官方价格同步，支持多厂商多模型价格计费（内置 90+ 模型价格目录），费用一目了然。",
		homepage: "https://github.com/Han-1413141/dsh-cost-meter#readme",
		category: "金融数据",
		icon: "💰",
		tags: [
			"费用统计",
			"成本",
			"计费",
			"模型价格",
			"90+模型"
		]
	},
	"@kenz1117/dsh-ui-usage-billing": {
		id: "@kenz1117/dsh-ui-usage-billing",
		name: "用量计费仪表板",
		description: "DSH 用量计费仪表板，侧边栏成本指标 + 完整仪表板，详细的 Token/费用统计和趋势分析，把每一分模型开销看得清清楚楚。",
		homepage: "https://github.com/kenz1117/dsh-ui-usage-billing",
		category: "金融数据",
		icon: "🧾",
		tags: [
			"用量",
			"计费",
			"仪表板",
			"成本分析",
			"Token统计"
		]
	},
	"dsh-quant": {
		id: "dsh-quant",
		name: "量化交易 OS",
		description: "🐳 The Everything-Plugin Quant OS，AI 原生 & DSH 原生量化交易系统，支持策略回测/实盘交易/数据分析/风险管理，是 DSH 最强大的量化插件。",
		homepage: "https://www.npmjs.com/package/dsh-quant",
		category: "金融数据",
		icon: "🐳",
		tags: [
			"量化",
			"交易",
			"回测",
			"实盘",
			"风险管理",
			"Quant OS"
		]
	},
	"clawock-dsh": {
		id: "clawock-dsh",
		name: "投资决策助手",
		description: "DSH 投资决策插件，基于证据的投资分析，风险评估，组合管理，辅助理性投资决策，提供专业的投资分析框架和工具。",
		homepage: "https://kcnyu.github.io/clawock/",
		category: "金融数据",
		icon: "📉",
		tags: [
			"投资",
			"决策",
			"风险评估",
			"组合管理",
			"证据驱动"
		]
	},
	"dsh-server-deck": {
		id: "dsh-server-deck",
		name: "服务器卡片仪表板",
		description: "DSH 服务器卡片仪表板，已连接服务器的卡片视图（在线状态/CPU/内存/磁盘/延迟），点卡片进入 xterm.js 交互终端，独立趋势视图记录并可视化 CPU/内存/磁盘变化。",
		homepage: "https://github.com/meyaomiao/dsh-server-deck",
		category: "系统运维",
		icon: "🖥️",
		tags: [
			"服务器",
			"监控",
			"仪表板",
			"终端",
			"CPU",
			"内存",
			"xterm.js"
		]
	},
	"dsh-win32": {
		id: "dsh-win32",
		name: "Windows 适配修复",
		description: "修复和诊断原生 Windows 上的 DSH，官方 PowerShell 脚本，工作区管理，Windows 特定问题解决方案，让 DSH 在 Windows 上稳定运行。",
		homepage: "https://github.com/sjh9714/dsh-win32#readme",
		category: "系统运维",
		icon: "🪟",
		tags: [
			"Windows",
			"适配",
			"修复",
			"诊断",
			"PowerShell",
			"官方"
		]
	},
	"@gehennawu/dsh-service": {
		id: "@gehennawu/dsh-service",
		name: "Web 运维面板",
		description: "DSH Web 运维面板，安全重启、健康监控、备份和 Linux 权限维护，服务器运维一站式管理，提供可视化的运维操作界面。",
		homepage: "https://github.com/gehennawu/dsh-service",
		category: "系统运维",
		icon: "⚙️",
		tags: [
			"运维",
			"监控",
			"备份",
			"Linux",
			"安全重启"
		]
	},
	"dsh-plugin-ops": {
		id: "dsh-plugin-ops",
		name: "插件运维",
		description: "DSH 插件运维，预启动健康门（扫描/诊断/修复），插件生命周期管理，确保插件稳定运行，提供插件健康检查和自动修复能力。",
		homepage: "https://github.com/f-infinite-z/dsh-plugin-ops#readme",
		category: "系统运维",
		icon: "🔧",
		tags: [
			"运维",
			"健康检查",
			"插件管理",
			"诊断",
			"自动修复"
		]
	},
	"dsh-mnemon": {
		id: "dsh-mnemon",
		name: "三层记忆控制平面",
		description: "可组合的三层记忆控制平面，持久运行时记忆 + 会话记忆 + 长期知识，支持记忆检索和管理，提供灵活的记忆架构，让 AI 拥有长期记忆。",
		homepage: "https://github.com/omdsh-dev/dsh-mnemon",
		category: "数据记忆",
		icon: "🧠",
		tags: [
			"记忆",
			"三层架构",
			"知识管理",
			"长期记忆",
			"可组合"
		]
	},
	"dsh-memory-eternal": {
		id: "dsh-memory-eternal",
		name: "记忆核心",
		description: "自研 DSH 记忆插件，不移植任何既有框架，对话结束后自动沉淀知识卡到本地 Markdown，支持语义检索，让 AI 的记忆持久化和可检索。",
		homepage: "https://github.com/EternalNight996/dsh-memory-eternal",
		category: "数据记忆",
		icon: "💾",
		tags: [
			"记忆",
			"知识沉淀",
			"Markdown",
			"语义检索",
			"自研"
		]
	},
	"dsh-context": {
		id: "dsh-context",
		name: "上下文洞察管理",
		description: "DSH 上下文洞察和管理插件，上下文仪表板，统计/组成/趋势/事件/消息全视图，右侧栏面板和 /context 命令，让上下文管理可视化和可操作。",
		homepage: "https://github.com/bowenliang123/dsh-context",
		category: "数据记忆",
		icon: "🔍",
		tags: [
			"上下文",
			"洞察",
			"管理",
			"仪表板",
			"趋势分析"
		]
	},
	"dsh-session-manager": {
		id: "dsh-session-manager",
		name: "会话管理器",
		description: "DSH Web UI 会话管理器，删除会话、归档会话、会话搜索、批量操作，高效管理对话历史，保持会话列表整洁。",
		homepage: "https://github.com/hkkz9522/dsh-session-manager",
		category: "数据记忆",
		icon: "📂",
		tags: [
			"会话管理",
			"归档",
			"删除",
			"批量操作",
			"搜索"
		]
	},
	"@morlay/session-rdb": {
		id: "@morlay/session-rdb",
		name: "RDB 持久化会话",
		description: "DSH 的 RDB 持久化会话后端，实现会话持久化和检索，支持关系型数据库存储，数据更安全，支持大规模会话存储和高效查询。",
		homepage: "https://github.com/morlay/session-rdb.git",
		category: "数据记忆",
		icon: "🗄️",
		tags: [
			"持久化",
			"RDB",
			"会话存储",
			"关系型数据库"
		]
	},
	"@morlay/session-branch": {
		id: "@morlay/session-branch",
		name: "会话分支管理",
		description: "DSH 的 rewind/retry/fork 提供者抽象和高级服务，支持会话分支和时间线管理，灵活回溯，提供分支式会话编辑能力。",
		homepage: "https://github.com/morlay/better-session.git",
		category: "数据记忆",
		icon: "🌿",
		tags: [
			"会话分支",
			"回溯",
			"时间线",
			"rewind",
			"fork"
		]
	},
	"@morlay/ui-conversation-message-actions": {
		id: "@morlay/ui-conversation-message-actions",
		name: "消息操作增强",
		description: "Rewind/retry/fork 编排（host）+ 对话消息操作 UI，提供消息级别的回溯、重试、分支功能，让对话管理更灵活。",
		homepage: "https://github.com/morlay/better-session.git",
		category: "数据记忆",
		icon: "🔄",
		tags: [
			"消息操作",
			"rewind",
			"retry",
			"fork",
			"对话管理"
		]
	},
	"@michengai/dsh-archive-manager": {
		id: "@michengai/dsh-archive-manager",
		name: "归档管理器",
		description: "NPM 可安装的 DSH Web 插件，用于管理已归档会话，支持归档/恢复/搜索/批量操作，让会话归档管理更便捷。",
		homepage: "https://github.com/michengai/dsh-archive-manager",
		category: "数据记忆",
		icon: "📦",
		tags: [
			"归档",
			"会话管理",
			"恢复",
			"批量操作"
		]
	},
	"meow-memory": {
		id: "meow-memory",
		name: "跨会话项目记忆",
		description: "DSH 跨会话项目记忆，七层记忆架构，支持项目级知识沉淀和跨会话检索，让 AI 在不同会话间保持记忆连续性。",
		homepage: "https://github.com/Phant0Meow/dsh-meow-memory#readme",
		category: "数据记忆",
		icon: "🐱",
		tags: [
			"记忆",
			"跨会话",
			"项目记忆",
			"七层架构"
		]
	},
	"@lemoncat7/dsh-knowledge": {
		id: "@lemoncat7/dsh-knowledge",
		name: "知识库管理",
		description: "DSH 本地和远程知识库，支持向量检索、知识管理、RAG 增强，让 AI 更懂你的业务，提供强大的知识检索和问答能力。",
		homepage: "https://github.com/lemoncat7/dsh-knowledge",
		category: "数据记忆",
		icon: "📚",
		tags: [
			"知识库",
			"RAG",
			"向量检索",
			"本地",
			"远程"
		]
	},
	"billion-context-dsh": {
		id: "billion-context-dsh",
		name: "十亿上下文管理",
		description: "DSH 主动上下文修剪（ACP），模型感知的上下文管理，支持超长上下文高效利用，让十亿级上下文变得可管理和可操作。",
		homepage: "https://www.npmjs.com/package/billion-context-dsh",
		category: "数据记忆",
		icon: "🌌",
		tags: [
			"上下文",
			"修剪",
			"长上下文",
			"ACP",
			"十亿级"
		]
	},
	"@roarpeng/graphflow": {
		id: "@roarpeng/graphflow",
		name: "GraphFlow 记忆",
		description: "本地优先的记忆和上下文管理，面向编码代理，提供知识图谱和上下文流管理，让 AI 的记忆更结构化和可追溯。",
		homepage: "https://github.com/Roarpeng/GraphFlow",
		category: "数据记忆",
		icon: "🔗",
		tags: [
			"记忆",
			"知识图谱",
			"本地优先",
			"编码代理",
			"上下文"
		]
	},
	"dsh-strata": {
		id: "dsh-strata",
		name: "会话分层",
		description: "DSH Web GUI 的会话分层，转录和会话管理，提供分层级的会话视图和管理能力，让长会话更易浏览和管理。",
		homepage: "https://github.com/jsdvjx/dsh-strata",
		category: "数据记忆",
		icon: "📑",
		tags: [
			"会话分层",
			"转录",
			"会话管理",
			"长会话"
		]
	},
	"dsh-omni-router": {
		id: "dsh-omni-router",
		name: "Omni 可靠性路由",
		description: "DSH 可靠性和编排控制平面，智能模型路由，故障自动转移，负载均衡，提升 AI 服务稳定性，提供企业级的模型路由能力。",
		homepage: "https://www.npmjs.com/package/dsh-omni-router",
		category: "模型路由",
		icon: "🔀",
		tags: [
			"路由",
			"可靠性",
			"故障转移",
			"负载均衡",
			"编排"
		]
	},
	"dsh-plugin-model-proxy": {
		id: "dsh-plugin-model-proxy",
		name: "模型代理路由",
		description: "DSH 按模型代理路由（http/https/socks5/socks5h），带设置 UI，每个模型可配置独立代理，解决网络限制，支持按用途过滤和凭证管理。",
		homepage: "https://www.npmjs.com/package/dsh-plugin-model-proxy",
		category: "模型路由",
		icon: "🌐",
		tags: [
			"代理",
			"模型路由",
			"socks5",
			"http代理",
			"设置UI"
		]
	},
	"dsh-llm-fallbacks": {
		id: "dsh-llm-fallbacks",
		name: "LLM 自动降级",
		description: "DSH 自动提供商/模型降级链，主模型失败时自动切换到备用模型，保证服务不中断，提供可配置的降级策略和优先级。",
		homepage: "https://github.com/omdsh-dev/dsh-llm-fallbacks#readme",
		category: "模型路由",
		icon: "🛡️",
		tags: [
			"降级",
			"故障转移",
			"多模型",
			"自动切换",
			"高可用"
		]
	},
	"@goodandready/dsh-subscriptions": {
		id: "@goodandready/dsh-subscriptions",
		name: "多平台订阅接入",
		description: "使用 ChatGPT Codex、Claude、Grok、Antigravity、Kimi、GLM、Cursor、Kiro、Copilot 等订阅，统一接入 DSH，一个插件管理所有订阅。",
		homepage: "https://github.com/GooDAnDReaDY/dsh-subscriptions",
		category: "模型路由",
		icon: "🎫",
		tags: [
			"订阅",
			"多平台",
			"模型接入",
			"ChatGPT",
			"Claude",
			"Grok",
			"9+平台"
		]
	},
	"@goodandready/dsh-key-rotation": {
		id: "@goodandready/dsh-key-rotation",
		name: "API Key 轮询",
		description: "DSH 按提供商 API Key 轮询，密钥池管理，自动轮换，提升 API 调用稳定性和配额利用率，支持按提供商配置独立密钥池。",
		homepage: "https://github.com/GooDAnDReaDY/dsh-key-rotation",
		category: "模型路由",
		icon: "🔑",
		tags: [
			"API Key",
			"轮询",
			"密钥管理",
			"密钥池",
			"配额"
		]
	},
	"dsh-agy-link": {
		id: "dsh-agy-link",
		name: "Antigravity 模型接入",
		description: "Google Antigravity（agy CLI）模型接入 DSH，支持 Gemini 系列模型，无缝切换，提供 Google 最新模型的接入能力。",
		homepage: "https://github.com/amlyczz/dsh-agy-link#readme",
		category: "模型路由",
		icon: "🚀",
		tags: [
			"Antigravity",
			"Gemini",
			"模型接入",
			"Google"
		]
	},
	"dsh-coding-subscription-oauth": {
		id: "dsh-coding-subscription-oauth",
		name: "编码订阅 OAuth",
		description: "DSH 编码订阅 OAuth，SuperGrok/Grok Business 接入，支持 X Premium 订阅，无需 API Key，通过 OAuth 安全接入编码模型。",
		homepage: "https://github.com/lninghaha/dsh-coding-subscription-oauth#readme",
		category: "模型路由",
		icon: "🔐",
		tags: [
			"OAuth",
			"Grok",
			"订阅",
			"X Premium",
			"编码模型"
		]
	},
	"dsh-codex-subscription": {
		id: "dsh-codex-subscription",
		name: "Codex 订阅接入",
		description: "使用 ChatGPT 和 Codex 订阅，通过 OAuth 接入，支持配额、安全降级和用量统计，无需额外 API Key，直接使用订阅额度。",
		homepage: "https://github.com/WSL043/dsh-codex-subscription",
		category: "模型路由",
		icon: "📝",
		tags: [
			"Codex",
			"订阅",
			"OAuth",
			"ChatGPT",
			"配额"
		]
	},
	"dsh-codex-connect": {
		id: "dsh-codex-connect",
		name: "Codex 模型连接",
		description: "通过 ChatGPT OAuth 接入 Codex 模型，在 DSH 中使用 GPT-4o/Codex 系列模型，支持配额管理和安全降级，提供 OpenAI 模型接入。",
		homepage: "https://github.com/franksong2702/dsh-codex-connect#readme",
		category: "模型路由",
		icon: "🔗",
		tags: [
			"Codex",
			"ChatGPT",
			"OAuth",
			"模型接入",
			"GPT-4o"
		]
	},
	"@eddyskywalker/dsh-chatgpt-subscription": {
		id: "@eddyskywalker/dsh-chatgpt-subscription",
		name: "ChatGPT 订阅接入",
		description: "DSH provider 插件，通过 ChatGPT 订阅访问 Codex，支持订阅额度管理和模型切换，让 ChatGPT Plus 用户在 DSH 中使用 Codex 模型。",
		homepage: "https://github.com/Aa728848/dsh-chatgpt-subscription#readme",
		category: "模型路由",
		icon: "💬",
		tags: [
			"ChatGPT",
			"订阅",
			"Codex",
			"provider",
			"Plus"
		]
	},
	"dsh-routing-suite": {
		id: "dsh-routing-suite",
		name: "智能路由套件",
		description: "轻量级、可选择的智能路由模式，为 DSH 提供灵活的模型路由能力，支持按任务类型自动选择最优模型，提升响应质量和速度。",
		homepage: "https://github.com/dragonbaba/dsh-routing-suite#readme",
		category: "模型路由",
		icon: "🧭",
		tags: [
			"智能路由",
			"模型选择",
			"轻量级",
			"任务类型"
		]
	},
	"dsh-plugin": {
		id: "dsh-plugin",
		name: "社区插件市场",
		description: "DSH 社区插件市场，按官方插件规范构建，浏览/搜索/一键安装，发现优质 DSH 插件，提供完整的插件市场体验。",
		homepage: "https://dsh-plugin.org",
		category: "插件生态",
		icon: "🏪",
		tags: [
			"插件市场",
			"社区",
			"一键安装",
			"官方规范"
		]
	},
	"dshmarket": {
		id: "dshmarket",
		name: "可视化插件市场",
		description: "DSH 内可视化插件市场，浏览、搜索和一键安装，插件发现和管理更便捷，提供现代化的插件市场界面。",
		homepage: "https://dshmarket.com",
		category: "插件生态",
		icon: "🛒",
		tags: [
			"插件市场",
			"可视化",
			"一键安装",
			"浏览"
		]
	},
	"dsh-find-plugin": {
		id: "dsh-find-plugin",
		name: "插件发现",
		description: "在 Agent 内查找 DSH 插件，实时 GitHub dsh-plugin 话题搜索，AI 帮你发现需要的插件，支持按功能搜索和推荐。",
		homepage: "https://github.com/awesome-dsh-plugin/dsh-find-plugin#readme",
		category: "插件生态",
		icon: "🔎",
		tags: [
			"插件发现",
			"GitHub",
			"搜索",
			"推荐"
		]
	},
	"dsh-plugin-catalog": {
		id: "dsh-plugin-catalog",
		name: "插件目录",
		description: "DSH 插件目录（3561 条目），DeepSeek 官方维护，最全的 DSH 插件索引和分类，提供权威的插件目录服务。",
		homepage: "https://awesome-dsh-plugin.com",
		category: "插件生态",
		icon: "📑",
		tags: [
			"插件目录",
			"官方",
			"索引",
			"3561条目"
		]
	},
	"dsh-plugin-shop": {
		id: "dsh-plugin-shop",
		name: "插件商店",
		description: "DSH 插件商店，浏览、安装、启用和管理插件，一站式插件生命周期管理，提供完整的插件商店体验。",
		homepage: "https://github.com/LivXue/dsh-plugin-shop",
		category: "插件生态",
		icon: "🏬",
		tags: [
			"插件商店",
			"管理",
			"生命周期",
			"浏览"
		]
	},
	"dshhub-market": {
		id: "dshhub-market",
		name: "口令插件市场",
		description: "DSH 口令插件市场客户端，输码解锁插件，连接创作者与买家（DSHHub.co 驱动），支持付费插件和口令分发。",
		homepage: "https://www.dshhub.co",
		category: "插件生态",
		icon: "🎟️",
		tags: [
			"插件市场",
			"口令",
			"付费插件",
			"DSHHub"
		]
	},
	"@1e0zj/dsh-plugin-mall": {
		id: "@1e0zj/dsh-plugin-mall",
		name: "插件商城",
		description: "dsh 插件市场，搜索 GitHub dsh-plugin 话题下的插件仓库，一键安装到本地 dsh profile，提供 GitHub 源的插件商城。",
		homepage: "https://github.com/1e0zj/dsh-plugin-mall",
		category: "插件生态",
		icon: "🏛️",
		tags: [
			"插件商城",
			"GitHub",
			"一键安装",
			"话题搜索"
		]
	},
	"upstream-radar": {
		id: "upstream-radar",
		name: "依赖兼容性监控",
		description: "DSH 插件的持续依赖和兼容性监控，自动检测上游更新和破坏性变更，提前预警，保障插件生态稳定。",
		homepage: "https://github.com/MicroMilo/upstream-radar#readme",
		category: "插件生态",
		icon: "📡",
		tags: [
			"监控",
			"依赖管理",
			"兼容性",
			"上游更新",
			"预警"
		]
	},
	"dsh-plugin-updates": {
		id: "dsh-plugin-updates",
		name: "插件更新通知",
		description: "DSH 插件目录的每个插件更新说明，及时了解插件新功能和变更，支持更新提醒，让你第一时间获取插件更新信息。",
		homepage: "https://awesome-dsh-plugin.com",
		category: "插件生态",
		icon: "🔔",
		tags: [
			"更新通知",
			"插件管理",
			"变更日志",
			"提醒"
		]
	},
	"dsh-webui-auth": {
		id: "dsh-webui-auth",
		name: "WebUI 认证",
		description: "DSH 持久 WebUI 认证插件，配置账户密码，保护 Web 界面安全访问，防止未授权访问，支持多用户和权限管理。",
		homepage: "https://www.npmjs.com/package/dsh-webui-auth",
		category: "安全认证",
		icon: "🔐",
		tags: [
			"认证",
			"WebUI",
			"安全",
			"登录",
			"账户密码"
		]
	},
	"dsh-config-manager": {
		id: "dsh-config-manager",
		name: "配置管理器",
		description: "备份、恢复、导出、导入、迁移和同步 DSH 配置，配置管理更安全，迁移更便捷，支持多设备配置同步和版本管理。",
		homepage: "https://github.com/xiajiajun516/dsh-config-manager#readme",
		category: "安全认证",
		icon: "⚙️",
		tags: [
			"配置管理",
			"备份",
			"恢复",
			"迁移",
			"同步"
		]
	},
	"dsh-harmony": {
		id: "dsh-harmony",
		name: "DSH 补丁库",
		description: "用于修补、替换和装饰 DSH 的库，提供灵活的插件开发工具，支持运行时补丁和功能扩展，是插件开发者的得力助手。",
		homepage: "https://github.com/memorax-ai/dsh-harmony#readme",
		category: "安全认证",
		icon: "🎵",
		tags: [
			"补丁库",
			"开发工具",
			"运行时补丁",
			"装饰"
		]
	},
	"dsh-novel-writer": {
		id: "dsh-novel-writer",
		name: "小说写作助手",
		description: "小说写作助手插件（v4.1.1），句式/情感/意象分析、伏笔设定管理、本地语义检索、氛围光谱、风格画像报告、文笔六维基线，专业小说创作工具。",
		homepage: "https://github.com/siweina/dsh-novel-writer",
		category: "研究学习",
		icon: "✍️",
		tags: [
			"小说",
			"写作",
			"文学分析",
			"伏笔管理",
			"风格画像"
		]
	},
	"dsh-qingagent": {
		id: "dsh-qingagent",
		name: "AI 写作助手",
		description: "AI 写作助手插件，起草和润色文章，支持多种文体，写作质量提升，AI 辅助创作，提供专业的写作建议和优化。",
		homepage: "https://github.com/void2anything/dsh-qingagent#readme",
		category: "研究学习",
		icon: "📝",
		tags: [
			"写作",
			"AI助手",
			"润色",
			"创作",
			"多文体"
		]
	},
	"lunheng-article-pipeline": {
		id: "lunheng-article-pipeline",
		name: "论衡长文流水线",
		description: "论衡（lunheng-article-pipeline），多 Agent 深度长文流水线技能包，高质量长文写作全流程，提供专业的长文创作能力。",
		homepage: "https://github.com/zuoyunlai/lunheng-article-pipeline-dsh#readme",
		category: "研究学习",
		icon: "📜",
		tags: [
			"长文",
			"流水线",
			"多Agent",
			"写作",
			"深度"
		]
	},
	"gongwen-skill": {
		id: "gongwen-skill",
		name: "公文处理专家",
		description: "公文全流程处理专家，GB/T 9704 格式检查/修复/内容优化/模板生成/版式注入，党政机关公文标准，提供专业的公文处理能力。",
		homepage: "https://github.com/linhut/gongwen-skill#readme",
		category: "研究学习",
		icon: "📋",
		tags: [
			"公文",
			"GB/T 9704",
			"格式检查",
			"模板生成",
			"党政机关"
		]
	},
	"@sunjuntao/dsh-prompt-library": {
		id: "@sunjuntao/dsh-prompt-library",
		name: "提示词库",
		description: "DSH 提示词库插件，集中管理提示词（增删改查、标签分类、导入导出、AI 优化），聊天快捷收录与调用，附会话监控与文件预览。",
		homepage: "https://github.com/master1Sun/dsh-prompt-library#readme",
		category: "研究学习",
		icon: "📚",
		tags: [
			"提示词",
			"库管理",
			"AI优化",
			"快捷调用",
			"标签分类"
		]
	},
	"dsh-vibe-math": {
		id: "dsh-vibe-math",
		name: "多智能体数学解题",
		description: "多智能体数学问题求解与验证框架，提供专业的数学解题能力，支持复杂数学问题的分解、求解和验证，是数学学习和研究的得力助手。",
		homepage: "https://github.com/ChongCyrus/Vibe-Mathematics#readme",
		category: "研究学习",
		icon: "🔢",
		tags: [
			"数学",
			"多智能体",
			"解题",
			"验证",
			"框架"
		]
	},
	"@waterwx/dsh-novel-forge": {
		id: "@waterwx/dsh-novel-forge",
		name: "小说锻造工作台",
		description: "AI 编译纯文本小说工作台，导入小说大纲，AI 辅助创作和编辑，提供专业的小说创作环境，支持长篇小说的结构化创作。",
		homepage: "https://github.com/watersxya/dsh-novel-forge",
		category: "研究学习",
		icon: "⚒️",
		tags: [
			"小说",
			"创作工作台",
			"AI编译",
			"大纲",
			"长篇"
		]
	},
	"dsh-mcp-connector": {
		id: "dsh-mcp-connector",
		name: "MCP 连接器",
		description: "DSH MCP 连接器和 MCP Server 市场，连接外部工具和服务，扩展 DSH 能力边界，支持 MCP 协议的工具接入和管理。",
		homepage: "https://github.com/duhu2000/dsh-mcp-connector#readme",
		category: "API集成",
		icon: "🔌",
		tags: [
			"MCP",
			"连接器",
			"市场",
			"外部工具",
			"协议"
		]
	},
	"dsh-mcp-panel": {
		id: "dsh-mcp-panel",
		name: "MCP 管理控制台",
		description: "官方 DSH MCP 的 MCP 管理控制台，可视化管理 MCP 服务器，配置和监控更便捷，提供官方级的 MCP 管理体验。",
		homepage: "https://github.com/PerryLink/dsh-mcp-panel#readme",
		category: "API集成",
		icon: "🎛️",
		tags: [
			"MCP",
			"管理",
			"控制台",
			"官方",
			"可视化"
		]
	},
	"@microi.net/cli": {
		id: "@microi.net/cli",
		name: "Microi 吾码 CLI",
		description: "Microi 吾码 AI 开发 CLI 与多宿主 Plugin，服务器连接、Skills、MCP、V8 同步和低代码交付，提供完整的 AI 开发工具链。",
		homepage: "https://microi.net/doc/v8-engine/vs-code-plugin.html",
		category: "API集成",
		icon: "⚡",
		tags: [
			"CLI",
			"MCP",
			"Skills",
			"低代码",
			"多宿主",
			"V8"
		]
	},
	"huaweicloud-devkit": {
		id: "huaweicloud-devkit",
		name: "华为云开发工具包",
		description: "帮助编码代理使用华为云 Skills 的 Agent 工具包，接入华为云服务，云原生开发更便捷，提供华为云生态的完整接入能力。",
		homepage: "https://github.com/huaweicloud/huaweicloud-devkit#readme",
		category: "API集成",
		icon: "☁️",
		tags: [
			"华为云",
			"云服务",
			"开发工具包",
			"Skills",
			"云原生"
		]
	},
	"@tt-a1i/archify-dsh": {
		id: "@tt-a1i/archify-dsh",
		name: "Archify 架构分析",
		description: "Archify 的 DSH 集成，Skill-only bundle，提供运行时架构映射能力，分析代码库的组件、依赖和信任边界，生成架构可视化。",
		homepage: "https://github.com/tt-a1i/archify/tree/main/integrations/deepseek-harness",
		category: "API集成",
		icon: "🏗️",
		tags: [
			"架构分析",
			"Archify",
			"Skill",
			"代码库",
			"可视化"
		]
	},
	"dsh-better-edit": {
		id: "dsh-better-edit",
		name: "增强编辑工具",
		description: "哈希锚定的 read/edit/undo_last_edit 工具，更安全的文件编辑体验，支持精确位置定位和撤销，提供更可靠的文件编辑能力。",
		homepage: "https://github.com/Rianico/dsh-better-edit",
		category: "开发工具",
		icon: "✏️",
		tags: [
			"编辑",
			"文件操作",
			"哈希锚定",
			"撤销",
			"安全"
		]
	},
	"dsh-chat-import": {
		id: "dsh-chat-import",
		name: "对话历史导入",
		description: "从 Claude Code/Codex/ChatGPT/Cursor/Gemini/Reasonix/Pi 等平台导入对话历史到 DSH，无缝迁移，支持多种平台的对话格式转换。",
		homepage: "https://github.com/Nwflower/dsh-chat-import",
		category: "开发工具",
		icon: "📥",
		tags: [
			"导入",
			"对话历史",
			"迁移",
			"多平台",
			"格式转换"
		]
	},
	"dsh-movein": {
		id: "dsh-movein",
		name: "Claude Code 迁移",
		description: "用现有的 Claude Code 设置体验 DSH，自动迁移配置、提示词和工作流，降低迁移成本，让 Claude Code 用户平滑过渡到 DSH。",
		homepage: "https://github.com/sjh9714/dsh-movein#readme",
		category: "开发工具",
		icon: "🏠",
		tags: [
			"迁移",
			"Claude Code",
			"配置导入",
			"平滑过渡"
		]
	},
	"dsh-client-auto-continue": {
		id: "dsh-client-auto-continue",
		name: "自动继续",
		description: "DSH Web UI 插件，自动发送本地化的 continue 提示，当回复被截断时自动继续，让长回复更完整，支持自定义继续提示。",
		homepage: "https://github.com/HsiangNianian/dsh-auto-continue",
		category: "开发工具",
		icon: "⏩",
		tags: [
			"自动继续",
			"长回复",
			"截断",
			"本地化",
			"自定义"
		]
	},
	"dsh-plugin-ima-sync": {
		id: "dsh-plugin-ima-sync",
		name: "IMA 进度同步",
		description: "DSH 插件，自动上传对话进度到腾讯 IMA，支持对话云同步和多设备访问，让你的对话随时随地可用。",
		homepage: "https://github.com/nan1010082085/dsh-plugin-ima-sync#readme",
		category: "开发工具",
		icon: "☁️",
		tags: [
			"同步",
			"腾讯IMA",
			"云同步",
			"对话进度",
			"多设备"
		]
	},
	"dsh-session-log-repair": {
		id: "dsh-session-log-repair",
		name: "会话日志修复",
		description: "DSH 会话日志修复插件，扫描每个存储的会话，检测和修复损坏的日志，保障会话数据完整性，提供会话修复工具。",
		homepage: "https://github.com/jsoncode/dsh-session-log-repair#readme",
		category: "开发工具",
		icon: "🔧",
		tags: [
			"修复",
			"会话日志",
			"数据完整性",
			"扫描",
			"损坏修复"
		]
	},
	"deepseek-harness-zh_pro": {
		id: "deepseek-harness-zh_pro",
		name: "中文增强插件",
		description: "综合性增强插件，界面优化、布局调整与提示词注入等更多功能，为中文用户提供更好的 DSH 体验，包含多项中文优化。",
		homepage: "https://github.com/magian1127/deepseek-harness-zh_pro#readme",
		category: "开发工具",
		icon: "🇨🇳",
		tags: [
			"中文",
			"增强",
			"界面优化",
			"提示词注入",
			"综合"
		]
	},
	"@goodandready/dsh-russian-lang": {
		id: "@goodandready/dsh-russian-lang",
		name: "俄语本地化",
		description: "DSH 俄语本地化（DSH v0.1.5-rc.1+），提供完整的俄语界面翻译和本地化支持，让俄语用户更好地使用 DSH。",
		homepage: "https://github.com/GooDAnDReaDY/dsh-russian-lang",
		category: "开发工具",
		icon: "🇷🇺",
		tags: [
			"俄语",
			"本地化",
			"翻译",
			"界面"
		]
	},
	"@huanlin/dsh-plugin-better-locale": {
		id: "@huanlin/dsh-plugin-better-locale",
		name: "多语言支持",
		description: "DSH Web 插件，通过 DSH v0.1.5-rc.1 原生第三方语言 API（locale.addLanguage），提供多语言支持和自定义语言包能力。",
		homepage: "https://www.npmjs.com/package/%40huanlin%2Fdsh-plugin-better-locale",
		category: "开发工具",
		icon: "🌍",
		tags: [
			"多语言",
			"本地化",
			"语言包",
			"locale API"
		]
	},
	"@lk251066/dsh-tui": {
		id: "@lk251066/dsh-tui",
		name: "多会话终端工作台",
		description: "DSH 多会话终端工作台插件，提供终端风格的多会话管理界面，支持会话切换和终端操作，适合喜欢终端风格的用户。",
		homepage: "https://github.com/lk251066/dsh-tui-pro#readme",
		category: "UI界面增强",
		icon: "🖥️",
		tags: [
			"终端",
			"TUI",
			"多会话",
			"工作台"
		]
	},
	"@goodandready/dsh-live-canvas": {
		id: "@goodandready/dsh-live-canvas",
		name: "实时预览画布",
		description: "浏览器内交互式画布，实时预览 HTML、React 组件、SVG 等，支持热更新和即时反馈，让前端开发更直观。",
		homepage: "https://github.com/GooDAnDReaDY/dsh-live-canvas",
		category: "开发工具",
		icon: "🎨",
		tags: [
			"画布",
			"实时预览",
			"HTML",
			"React",
			"SVG"
		]
	},
	"beauticode-dsh": {
		id: "beauticode-dsh",
		name: "美化背景插件",
		description: "Cordis 插件，为 DSH Web 界面提供图片/视频背景，支持自定义背景图片和视频，让界面更美观个性化。",
		homepage: "https://github.com/starsstreaming/beautiCode#readme",
		category: "UI界面增强",
		icon: "🖼️",
		tags: [
			"背景",
			"美化",
			"图片",
			"视频"
		]
	},
	"dsh-pdf-edit": {
		id: "dsh-pdf-edit",
		name: "PDF 编辑器",
		description: "样式锁定的 PDF 编辑器插件，AI 编辑文本，原生渲染预览，支持 PDF 文档的智能编辑和格式保持。",
		homepage: "https://github.com/Whatsmore-nf/dsh-pdf-edit#readme",
		category: "办公效率",
		icon: "📄",
		tags: [
			"PDF",
			"编辑器",
			"AI编辑",
			"样式锁定"
		]
	},
	"@kazecreator/dsh-settings-pro": {
		id: "@kazecreator/dsh-settings-pro",
		name: "设置增强插件",
		description: "DSH settings-pro 插件，IM 桥接（Telegram/WeChat）、DeepSeek 用量统计、设置页增强等多项功能，提升 DSH 使用体验。",
		homepage: "https://github.com/kazecreator/dsh-settings-pro",
		category: "开发工具",
		icon: "⚙️",
		tags: [
			"设置增强",
			"IM桥接",
			"用量统计",
			"Telegram",
			"微信"
		]
	},
	"dsh-tauri": {
		id: "dsh-tauri",
		name: "Tauri 桌面壳基础",
		description: "DSH Tauri 桌面壳的基础插件，提供无宿主行为的 host half，以及运行在 DSH iframe 中的客户端消息桥，是 Tauri 桌面端的基础能力。",
		homepage: "https://github.com/dsh-tauri-desk/dsh-tauri-plugins#readme",
		category: "开发工具",
		icon: "🦀",
		tags: [
			"Tauri",
			"桌面壳",
			"基础插件",
			"消息桥"
		]
	},
	"dsh-plugin-subscriptions": {
		id: "dsh-plugin-subscriptions",
		name: "多平台订阅接入",
		description: "使用 ChatGPT (Codex)、Claude、Grok (X Premium) 和 GitHub Copilot 订阅，统一接入 DSH，一个插件管理多个平台订阅。",
		homepage: "https://github.com/V1ki/dsh-plugin-subscriptions#readme",
		category: "模型路由",
		icon: "🎫",
		tags: [
			"订阅",
			"多平台",
			"ChatGPT",
			"Claude",
			"Grok",
			"Copilot"
		]
	},
	"dsh-tiddlywiki": {
		id: "dsh-tiddlywiki",
		name: "TiddlyWiki 知识库",
		description: "TiddlyWiki 5 作为 DSH 持久化知识库，提供十五个 tiddlywiki_* agent 工具，支持知识管理和双向链接。",
		homepage: "https://github.com/bbqisbbq/dsh-tiddlywiki#readme",
		category: "数据记忆",
		icon: "📚",
		tags: [
			"TiddlyWiki",
			"知识库",
			"持久化",
			"双向链接"
		]
	},
	"dsh-any-background": {
		id: "dsh-any-background",
		name: "自定义背景",
		description: "DSH 外观插件，自定义主题色（PS 风格色轮）、背景图片、渐变等，提供丰富的界面个性化选项。",
		homepage: "https://github.com/Tkingxiao/dsh-any-background#readme",
		category: "UI界面增强",
		icon: "🎨",
		tags: [
			"背景",
			"主题色",
			"个性化",
			"色轮"
		]
	},
	"aqua-deepseek": {
		id: "aqua-deepseek",
		name: "价格鱼缸浮窗",
		description: "DeepSeek API 实时价格鱼缸浮窗，一键装进 DSH，像素风陪伴式动画，自动跟随峰谷时段变化，可爱又实用。",
		homepage: "https://github.com/xiaoyu7044/aqua-deepseek#readme",
		category: "金融数据",
		icon: "🐠",
		tags: [
			"价格",
			"鱼缸",
			"浮窗",
			"像素风",
			"峰谷定价"
		]
	},
	"dsh-permission-rules": {
		id: "dsh-permission-rules",
		name: "权限规则引擎",
		description: "声明式 Claude Code 风格权限规则，加上 Codex 风格进程级权限控制，提供细粒度的 Agent 权限管理。",
		homepage: "https://github.com/PerryLink/dsh-permission-rules#readme",
		category: "安全认证",
		icon: "🔐",
		tags: [
			"权限",
			"规则引擎",
			"Claude Code",
			"进程级"
		]
	},
	"dsh-codex-sync": {
		id: "dsh-codex-sync",
		name: "Codex 双向同步",
		description: "双向 Codex↔DSH 桥接，从 ~/.codex/skills 导入技能，带工作区的会话导入，让 Codex 用户平滑迁移到 DSH。",
		homepage: "https://github.com/Walvez/dsh-codex-sync",
		category: "开发工具",
		icon: "🔄",
		tags: [
			"Codex",
			"同步",
			"技能导入",
			"会话导入"
		]
	},
	"dsh-smooth-stream": {
		id: "dsh-smooth-stream",
		name: "流畅流式渲染",
		description: "DSH 回复的流畅流式渲染和丝滑滚动，包括打字机效果和平滑滚动优化，提升对话体验。",
		homepage: "https://laplace-bit.github.io/dsh-smooth-stream/",
		category: "UI界面增强",
		icon: "✨",
		tags: [
			"流式渲染",
			"平滑滚动",
			"打字机",
			"体验优化"
		]
	},
	"dsh-ssh-tui": {
		id: "dsh-ssh-tui",
		name: "SSH 终端 TUI",
		description: "SSH 友好的交互式终端 TUI 插件，为 DSH 提供 SSH 终端连接和交互能力，支持远程服务器操作。",
		homepage: "https://github.com/cyjyyd/dsh-ssh-tui#readme",
		category: "系统运维",
		icon: "🔑",
		tags: [
			"SSH",
			"终端",
			"TUI",
			"远程服务器"
		]
	},
	"dsh-auth-gate": {
		id: "dsh-auth-gate",
		name: "应用层认证",
		description: "DSH Web 界面的应用层认证插件，提供登录认证和访问控制，保护 Web 界面安全。",
		homepage: "https://github.com/TecFancy/dsh-auth-gate",
		category: "安全认证",
		icon: "🚪",
		tags: [
			"认证",
			"应用层",
			"访问控制",
			"登录"
		]
	},
	"dsh-browser": {
		id: "dsh-browser",
		name: "浏览器自动化",
		description: "基于 Playwright 的浏览器自动化，支持打开/点击/输入/截图等操作，让 AI 直接操控浏览器完成复杂任务。",
		homepage: "https://github.com/ben7am1n/dsh-browser#readme",
		category: "搜索联网",
		icon: "🌐",
		tags: [
			"浏览器",
			"自动化",
			"Playwright",
			"截图"
		]
	},
	"@goodandready/dsh-voice": {
		id: "@goodandready/dsh-voice",
		name: "语音输入",
		description: "DSH 语音输入，按停顿分块的听写和语音消息，支持语音转文字，解放双手自然对话。",
		homepage: "https://github.com/GooDAnDReaDY/dsh-voice",
		category: "视觉多模态",
		icon: "🎤",
		tags: [
			"语音输入",
			"听写",
			"语音消息",
			"ASR"
		]
	},
	"dsh-prompt-history": {
		id: "dsh-prompt-history",
		name: "提示词历史",
		description: "DSH Web 插件，终端风格的输入框，bash 风格的 Up/Down 提示词历史导航，快速复用历史提示词。",
		homepage: "https://github.com/Xiaofei-fei/dsh-prompt-history#readme",
		category: "开发工具",
		icon: "📜",
		tags: [
			"提示词",
			"历史",
			"终端风格",
			"导航"
		]
	},
	"dsh-notify-me": {
		id: "dsh-notify-me",
		name: "桌面消息提醒",
		description: "DSH 桌面消息提醒插件，模型需要你操作（审批/方案确认/提问）或回复在后台完成时，系统通知+提示音+标签页标题提醒，可设置开关和通知语言。",
		homepage: "https://github.com/chromoany/dsh-notify-me#readme",
		category: "系统运维",
		icon: "🔔",
		tags: [
			"提醒",
			"桌面通知",
			"审批",
			"后台完成"
		]
	},
	"iterate-plugin": {
		id: "iterate-plugin",
		name: "迭代闭环插件",
		description: "将 iterate 技能变成自主闭环 harness 的 DSH 插件，支持自主迭代和闭环执行，提升任务完成度。",
		homepage: "https://github.com/jingzhao-l/iterate-skill/tree/main/harness/iterate-plugin",
		category: "开发工具",
		icon: "🔁",
		tags: [
			"迭代",
			"闭环",
			"自主执行",
			"harness"
		]
	},
	"dsh-tauri-panel": {
		id: "dsh-tauri-panel",
		name: "Tauri 面板扩展",
		description: "Tauri 桌面端面板能力的扩展入口，提供稳定的插件包结构和客户端注入点，后续面板组件将在此基础上演进。",
		homepage: "https://github.com/dsh-tauri-desk/dsh-tauri-plugins#readme",
		category: "开发工具",
		icon: "📋",
		tags: [
			"Tauri",
			"面板",
			"扩展入口",
			"桌面端"
		]
	},
	"dsh-deepread": {
		id: "dsh-deepread",
		name: "AI 深度阅读",
		description: "DSH 和 dsh-TUI 的 AI 深度阅读助手，提取可追溯的引用和摘要，支持长文档深度理解和分析。",
		homepage: "https://github.com/xiehuan123/dsh-deepread#readme",
		category: "研究学习",
		icon: "📖",
		tags: [
			"深度阅读",
			"AI阅读",
			"引用提取",
			"长文档"
		]
	},
	"dsh-usage-stats": {
		id: "dsh-usage-stats",
		name: "用量统计分析",
		description: "轻量级 DSH 用量分析，Token 趋势、活动热力图、使用统计可视化，让你清楚了解 AI 使用情况。",
		homepage: "https://github.com/lanlandeli/dsh-usage-stats#readme",
		category: "金融数据",
		icon: "📊",
		tags: [
			"用量统计",
			"Token",
			"趋势",
			"热力图"
		]
	},
	"@mrrisega/dsh-remote": {
		id: "@mrrisega/dsh-remote",
		name: "手机远程控制",
		description: "手机远程控制 DSH Web，从任何手机浏览器远程访问和控制 DSH，随时随地继续工作。",
		homepage: "https://github.com/mrrisega/dsh-remote",
		category: "移动远程",
		icon: "📱",
		tags: [
			"远程控制",
			"手机",
			"远程访问",
			"移动端"
		]
	},
	"@lemoncat7/dsh-ssh": {
		id: "@lemoncat7/dsh-ssh",
		name: "SSH 安全工具集",
		description: "安全 SSH、FTP/FTPS/SFTP 文件传输、浏览器终端、代理、端口转发，提供完整的远程服务器管理工具集。",
		homepage: "https://github.com/lemoncat7/dsh-ssh",
		category: "系统运维",
		icon: "🔐",
		tags: [
			"SSH",
			"FTP",
			"SFTP",
			"终端",
			"端口转发",
			"代理"
		]
	},
	"@dttxorg/deepseekeyes": {
		id: "@dttxorg/deepseekeyes",
		name: "可审计视觉运行时",
		description: "可审计的视觉和跨平台 Computer Use 运行时，提供安全可追溯的视觉能力和计算机操作能力。",
		homepage: "https://github.com/dttxorg/deepseekeyes",
		category: "视觉多模态",
		icon: "👁️",
		tags: [
			"视觉",
			"Computer Use",
			"可审计",
			"跨平台"
		]
	},
	"dsh-mimir": {
		id: "dsh-mimir",
		name: "研究助手套件",
		description: "研究助手插件套件，包含文献搜索、研究 Wiki、LaTeX 编译等学术工具，为科研工作者提供完整的研究工作流。",
		homepage: "https://github.com/1692775560/dsh-Mimir-Academic-research",
		category: "研究学习",
		icon: "🔬",
		tags: [
			"研究助手",
			"文献搜索",
			"Wiki",
			"LaTeX",
			"学术"
		]
	},
	"dsh-legal-suite": {
		id: "dsh-legal-suite",
		name: "法律行业套件",
		description: "AI 驱动的法律行业案件管理与 Agent 工具，诉讼案件/非诉项目/任务中心/期限引擎/技能与 MCP，Agent 预设直接办案。",
		homepage: "https://www.npmjs.com/package/dsh-legal-suite",
		category: "办公效率",
		icon: "⚖️",
		tags: [
			"法律",
			"案件管理",
			"诉讼",
			"非诉",
			"期限引擎"
		]
	},
	"dsh-workbench": {
		id: "dsh-workbench",
		name: "右侧文件工作台",
		description: "DSH Web 右侧文件工作台，提供文件浏览和管理面板，让文件操作更便捷。",
		homepage: "https://github.com/lee259/dsh-workbench#readme",
		category: "UI界面增强",
		icon: "📁",
		tags: [
			"文件工作台",
			"右侧面板",
			"文件管理"
		]
	},
	"dsh-mcp-sync": {
		id: "dsh-mcp-sync",
		name: "MCP 同步工具",
		description: "连接 MCP 服务器，发现工具并注册为直接可用的 DSH 工具，让 MCP 工具在 DSH 中原生使用。",
		homepage: "https://github.com/nan1010082085/dsh-mcp-sync#readme",
		category: "API集成",
		icon: "🔌",
		tags: [
			"MCP",
			"同步",
			"工具注册",
			"服务器"
		]
	},
	"@hytime/dsh-client-ui-shortcuts": {
		id: "@hytime/dsh-client-ui-shortcuts",
		name: "键盘快捷键",
		description: "DSH Web 客户端的配置感知键盘快捷键，支持自定义快捷键和配置文件，提升操作效率。",
		homepage: "https://github.com/hytime/dsh-client-ui-shortcuts",
		category: "开发工具",
		icon: "⌨️",
		tags: [
			"快捷键",
			"键盘",
			"自定义",
			"效率"
		]
	},
	"dsh-plugin-capabilities": {
		id: "dsh-plugin-capabilities",
		name: "技能与MCP管理",
		description: "在 Web UI 设置页管理 DSH 的技能与 MCP 服务器，提供可视化的技能和 MCP 管理界面。",
		homepage: "https://github.com/qinyre/dsh-plugin-capabilities#readme",
		category: "API集成",
		icon: "🎛️",
		tags: [
			"技能管理",
			"MCP管理",
			"设置页",
			"可视化"
		]
	},
	"@kubor/dsh-bloom-theme": {
		id: "@kubor/dsh-bloom-theme",
		name: "Bloom 玻璃主题",
		description: "Bloom for DSH 玻璃+莫兰迪主题，10 套 OKLCH 配色（雾蓝/朱砂/花瓣/涟漪/鼠尾草/暖石/青金/琥珀/极光/薰衣草），明暗自适应，磨砂玻璃效果。",
		homepage: "https://github.com/webkubor/dsh-bloom-theme#readme",
		category: "UI界面增强",
		icon: "🌸",
		tags: [
			"主题",
			"玻璃拟态",
			"莫兰迪",
			"OKLCH",
			"10套配色"
		]
	},
	"dsh-settings-nav-organizer": {
		id: "dsh-settings-nav-organizer",
		name: "设置导航整理",
		description: "整理 DSH 设置面板导航，将第三方插件条目折叠到可折叠分类下，让设置页更整洁有序。",
		homepage: "https://github.com/zhengjy01/dsh-settings-nav-organizer#readme",
		category: "UI界面增强",
		icon: "🗂️",
		tags: [
			"设置",
			"导航整理",
			"折叠",
			"第三方插件"
		]
	},
	"dsh-local-ai": {
		id: "dsh-local-ai",
		name: "本地模型集成",
		description: "本地模型（Ollama）集成，发现、拉取、删除和管理本地模型，让 DSH 支持本地大模型运行。",
		homepage: "https://github.com/PerryLink/dsh-local-ai#readme",
		category: "模型路由",
		icon: "🏠",
		tags: [
			"本地模型",
			"Ollama",
			"模型管理",
			"离线"
		]
	},
	"dsh-vision-proxy": {
		id: "dsh-vision-proxy",
		name: "视觉代理",
		description: "DeepSeek 大脑 + 自动图像转录，为 DSH 提供视觉能力，通过 deepseek 代理实现图像理解。",
		homepage: "https://github.com/Flyvhidbwo/dsh-vision-proxy#readme",
		category: "视觉多模态",
		icon: "👁️",
		tags: [
			"视觉",
			"代理",
			"图像转录",
			"DeepSeek"
		]
	},
	"dsh-tauri-ui": {
		id: "dsh-tauri-ui",
		name: "Tauri 界面扩展",
		description: "为 DSH 提供 Tauri 风格的客户端界面扩展，目前包含将设置对话框改造成左侧停靠设置栏的功能。",
		homepage: "https://github.com/dsh-tauri-desk/dsh-tauri-plugins#readme",
		category: "UI界面增强",
		icon: "🎨",
		tags: [
			"Tauri",
			"界面扩展",
			"设置栏",
			"左侧停靠"
		]
	},
	"dsh-status-rotator": {
		id: "dsh-status-rotator",
		name: "状态栏梗图机",
		description: "将 DSH Web 状态栏变成 1063 短语的梗图机器，阶段感知的短语轮换，让状态栏更有趣。",
		homepage: "https://github.com/01Virex/dsh-status-rotator#readme",
		category: "UI界面增强",
		icon: "😄",
		tags: [
			"状态栏",
			"梗图",
			"短语",
			"趣味"
		]
	},
	"dsh-tray-launcher": {
		id: "dsh-tray-launcher",
		name: "Windows 托盘启动器",
		description: "DSH 的 Windows 桌面托盘启动器（纯 PowerShell，比桌面壳轻量），无窗口运行 dsh web，托盘右键切换图标、开关和退出。",
		homepage: "https://github.com/fancr-code/dsh-tray-launcher#readme",
		category: "系统运维",
		icon: "📥",
		tags: [
			"托盘",
			"Windows",
			"启动器",
			"PowerShell",
			"轻量"
		]
	},
	"dsh-tool-vision": {
		id: "dsh-tool-vision",
		name: "外置视觉模型",
		description: "DSH 外置视觉模型插件，inspect_image 把本地图片或 http(s) 图片 URL 发给任意 OpenAI 兼容端点，视觉能力可插拔。",
		homepage: "https://github.com/Scorp1o117/dsh-tool-vision",
		category: "视觉多模态",
		icon: "🔧",
		tags: [
			"视觉",
			"外置模型",
			"OpenAI兼容",
			"可插拔"
		]
	},
	"@goodandready/dsh-lanmode": {
		id: "@goodandready/dsh-lanmode",
		name: "局域网访问",
		description: "DSH Web UI 的局域网和反向代理访问，返回设置好的访问地址，支持局域网和公网访问配置。",
		homepage: "https://github.com/GooDAnDReaDY/dsh-lanmode",
		category: "移动远程",
		icon: "🌐",
		tags: [
			"局域网",
			"反向代理",
			"远程访问",
			"公网"
		]
	},
	"deepseek-vl-support": {
		id: "deepseek-vl-support",
		name: "DeepSeek 视觉支持",
		description: "为 DeepSeek（纯文本）模型在 Claude Code、Codex 和 Agent Plugins 中提供视觉能力，让纯文本模型也能看图。",
		homepage: "https://www.npmjs.com/package/deepseek-vl-support",
		category: "视觉多模态",
		icon: "👁️",
		tags: [
			"DeepSeek",
			"视觉",
			"VL",
			"多平台"
		]
	},
	"dsh-testkit": {
		id: "dsh-testkit",
		name: "插件测试工具包",
		description: "DSH 插件的真实主机发布门，提供插件测试和发布前的质量检查工具，确保插件质量。",
		homepage: "https://github.com/iiwish/dsh-testkit#readme",
		category: "开发工具",
		icon: "🧪",
		tags: [
			"测试",
			"工具包",
			"发布门",
			"质量检查"
		]
	},
	"@mstar-harness/dsh": {
		id: "@mstar-harness/dsh",
		name: "Morning Star 插件",
		description: "Morning Star harness dsh Cordis 功能插件，进程内执行，提供 Morning Star 相关的功能集成。",
		homepage: "https://github.com/btspoony/mstar-harness#readme",
		category: "开发工具",
		icon: "⭐",
		tags: [
			"Morning Star",
			"Cordis",
			"功能插件"
		]
	},
	"dsh-concurrency-guard": {
		id: "dsh-concurrency-guard",
		name: "并发请求监控",
		description: "DSH 并发请求监控与门闩，挂钩 llm/stream 瀑布，统计全部在途模型请求并按来源分类（主会话/子代理/插件/压缩/标题），达到上限自动限流。",
		homepage: "https://github.com/fu827707013/dsh-concurrency-guard",
		category: "系统运维",
		icon: "🚦",
		tags: [
			"并发",
			"监控",
			"限流",
			"请求统计",
			"门闩"
		]
	},
	"dsh-memento": {
		id: "dsh-memento",
		name: "有界分层记忆",
		description: "有界、分层、审批门控、可审计的跨会话记忆，提供安全可控的长期记忆能力。",
		homepage: "https://github.com/PerryLink/dsh-memento#readme",
		category: "数据记忆",
		icon: "🧠",
		tags: [
			"记忆",
			"有界",
			"分层",
			"审批",
			"可审计"
		]
	},
	"dsh-checkpoint-rewind": {
		id: "dsh-checkpoint-rewind",
		name: "检查点回溯",
		description: "统一 DSH 检查点，会话+工作区+配置三态快照，支持一键回溯和恢复，让你随时回到之前的状态。",
		homepage: "https://github.com/PerryLink/dsh-checkpoint-rewind#readme",
		category: "数据记忆",
		icon: "⏪",
		tags: [
			"检查点",
			"回溯",
			"快照",
			"三态",
			"恢复"
		]
	},
	"dsh-tauri-worktree": {
		id: "dsh-tauri-worktree",
		name: "Git Worktree 隔离",
		description: "为 DSH 会话提供 Git worktree 隔离，每个工作树会话拥有独立目录，Agent 可以安全地修改代码而不影响主工作区。",
		homepage: "https://github.com/dsh-tauri-desk/dsh-tauri-plugins#readme",
		category: "开发工具",
		icon: "🌳",
		tags: [
			"Git",
			"worktree",
			"隔离",
			"会话隔离"
		]
	},
	"@eternalnight/dsh-theme": {
		id: "@eternalnight/dsh-theme",
		name: "主题皮肤插件",
		description: "DSH 主题皮肤插件，给 DSH Web GUI 换背景（内置主题/静态图片/动态视频环绕跟随帧），设置页与侧边栏底部一键切换。",
		homepage: "https://github.com/EternalNight996/dsh-theme",
		category: "UI界面增强",
		icon: "🎨",
		tags: [
			"主题",
			"皮肤",
			"背景",
			"动态视频",
			"一键切换"
		]
	},
	"dsh-full-remote": {
		id: "dsh-full-remote",
		name: "完整远程访问",
		description: "DSH 远程访问插件，令牌门控的反向代理，保持设置安全，提供完整的远程访问能力。",
		homepage: "https://github.com/JUANWANG-BUAA/dsh-full-remote#readme",
		category: "移动远程",
		icon: "🔐",
		tags: [
			"远程访问",
			"反向代理",
			"令牌",
			"安全"
		]
	},
	"dsh-deepseek-balance-widget": {
		id: "dsh-deepseek-balance-widget",
		name: "多厂商余额挂件",
		description: "DSH Web 侧边栏多厂商 AI 余额挂件，实时自动刷新的余额显示，支持多个 AI 提供商的余额查询。",
		homepage: "https://github.com/crazy-L118/dsh-deepseek-balance-widget#readme",
		category: "金融数据",
		icon: "💰",
		tags: [
			"余额",
			"多厂商",
			"挂件",
			"侧边栏",
			"实时刷新"
		]
	},
	"@awiki/dsh-plugin": {
		id: "@awiki/dsh-plugin",
		name: "AWiki 身份消息",
		description: "AWiki 身份和消息插件，为 DSH 提供 AWiki 平台的身份认证和消息集成能力。",
		homepage: "https://github.com/AgentConnect/dsh-awiki#readme",
		category: "API集成",
		icon: "📡",
		tags: [
			"AWiki",
			"身份",
			"消息",
			"集成"
		]
	},
	"dsh-knowledge": {
		id: "dsh-knowledge",
		name: "Cherry Studio 知识库",
		description: "Cherry Studio 风格的知识库系统，支持知识库、文档管理、向量检索，提供强大的知识管理和 RAG 能力。",
		homepage: "https://github.com/Soren-ABT/dsh-knowledge",
		category: "数据记忆",
		icon: "📚",
		tags: [
			"知识库",
			"Cherry Studio",
			"RAG",
			"向量检索",
			"文档管理"
		]
	},
	"@isomoes/dsh-ikanban": {
		id: "@isomoes/dsh-ikanban",
		name: "iKanban 看板",
		description: "键盘导向的 iKanban Web 应用 bundle，为 DSH 提供看板管理能力，支持键盘快捷操作。",
		homepage: "https://github.com/isomoes/ikanban#readme",
		category: "办公效率",
		icon: "📋",
		tags: [
			"看板",
			"iKanban",
			"键盘导向",
			"任务管理"
		]
	},
	"@noob-stupid/dsh-plugin-console": {
		id: "@noob-stupid/dsh-plugin-console",
		name: "插件管理控制台",
		description: "DSH 插件管理面板和市场，一键启用/禁用，多源插件管理，提供完整的插件生命周期管理界面。",
		homepage: "https://github.com/noob-stupid/dsh-plugin-console",
		category: "插件生态",
		icon: "🎛️",
		tags: [
			"插件管理",
			"控制台",
			"市场",
			"一键启用"
		]
	},
	"dsh-dingo": {
		id: "dsh-dingo",
		name: "声音提醒插件",
		description: "DSH 声音提醒+对话直达插件，多对话并行时哪个对话有回复就出声提醒，点右上角卡片直达对应对话，切到别的应用时还有系统级通知。",
		homepage: "https://github.com/february2015/dsh-dingo",
		category: "系统运维",
		icon: "🔔",
		tags: [
			"声音提醒",
			"对话直达",
			"多对话",
			"系统通知"
		]
	},
	"dsh-auto-review": {
		id: "dsh-auto-review",
		name: "AI 自动审核",
		description: "第二模型 AI 自动审核 DSH 审批请求，只读审核员模式，提供智能审批辅助，减少人工审核负担。",
		homepage: "https://github.com/PerryLink/dsh-auto-review#readme",
		category: "安全认证",
		icon: "✅",
		tags: [
			"自动审核",
			"AI审核",
			"审批",
			"第二模型"
		]
	},
	"@crazy_th/dsh-computer-use": {
		id: "@crazy_th/dsh-computer-use",
		name: "Windows Computer Use",
		description: "DSH 原生 Windows Computer Use 工具，让 AI 直接操作 Windows 桌面，完成复杂的计算机操作任务。",
		homepage: "https://github.com/ThreeBody6666/dsh-computer-use#readme",
		category: "系统运维",
		icon: "🖥️",
		tags: [
			"Computer Use",
			"Windows",
			"桌面操作",
			"自动化"
		]
	},
	"@huiliyi37/dsh-office": {
		id: "@huiliyi37/dsh-office",
		name: "Office 文档工具",
		description: "Office 文档工具（xlsx/pdf/pptx/docx），生成、读取、编辑和转换，提供完整的 Office 文档处理能力。",
		homepage: "https://www.npmjs.com/package/%40huiliyi37%2Fdsh-office",
		category: "办公效率",
		icon: "📄",
		tags: [
			"Office",
			"xlsx",
			"pdf",
			"pptx",
			"docx",
			"文档处理"
		]
	},
	"@goodandready/dsh-tts": {
		id: "@goodandready/dsh-tts",
		name: "文本转语音",
		description: "DSH 文本转语音，在 Web UI 中朗读 Agent 回复，提供可配置的语音合成，让 AI 回复可以\"听\"。",
		homepage: "https://github.com/GooDAnDReaDY/dsh-tts",
		category: "视觉多模态",
		icon: "🔊",
		tags: [
			"TTS",
			"文本转语音",
			"朗读",
			"语音合成"
		]
	},
	"dsh-harbor-evolution": {
		id: "dsh-harbor-evolution",
		name: "Harbor 会话演进",
		description: "DSH 插件和 Skill，用于 Harbor Candidate 和历史会话演进，提供会话管理和演进能力。",
		homepage: "https://github.com/istarwyh/harbor-self-evolving#readme",
		category: "数据记忆",
		icon: "🚢",
		tags: [
			"Harbor",
			"会话演进",
			"历史会话",
			"Skill"
		]
	},
	"@p-dsh-market/conversation-knowledge-map": {
		id: "@p-dsh-market/conversation-knowledge-map",
		name: "对话知识图谱",
		description: "DSH 多对话思维导图与静态知识图谱，将多对话内容可视化，提供知识管理和关联分析能力。",
		homepage: "https://www.npmjs.com/package/%40p-dsh-market%2Fconversation-knowledge-map",
		category: "数据记忆",
		icon: "🗺️",
		tags: [
			"知识图谱",
			"思维导图",
			"多对话",
			"可视化"
		]
	},
	"dshbase-catalog": {
		id: "dshbase-catalog",
		name: "dshbase 目录查询",
		description: "在 DSH 内部查询 dshbase 插件目录，支持搜索、列表和详情查看，提供便捷的插件目录访问。",
		homepage: "https://www.npmjs.com/package/dshbase-catalog",
		category: "插件生态",
		icon: "📑",
		tags: [
			"dshbase",
			"目录",
			"插件查询",
			"搜索"
		]
	},
	"dsh-plugin-install": {
		id: "dsh-plugin-install",
		name: "插件安装工具",
		description: "在设置页里按包名安装任意 dsh 插件，提供便捷的插件安装界面，无需命令行操作。",
		homepage: "https://github.com/qinyre/dsh-plugin-install#readme",
		category: "插件生态",
		icon: "📦",
		tags: [
			"插件安装",
			"设置页",
			"包名",
			"便捷安装"
		]
	},
	"dsh-session-pin": {
		id: "dsh-session-pin",
		name: "会话置顶",
		description: "将会话和工作区置顶到 DSH 侧边栏顶部，支持个性化置顶排序，让重要会话触手可及。",
		homepage: "https://github.com/PerryLink/dsh-session-pin#readme",
		category: "UI界面增强",
		icon: "📌",
		tags: [
			"会话置顶",
			"工作区",
			"侧边栏",
			"排序"
		]
	},
	"@aiwayds/dsh-dcp": {
		id: "@aiwayds/dsh-dcp",
		name: "确定性上下文压缩",
		description: "DSH 确定性上下文压缩后端，零幻觉的压缩算法，提供安全可靠的上下文压缩能力。",
		homepage: "https://github.com/fan56/dsh-dcp",
		category: "数据记忆",
		icon: "🗜️",
		tags: [
			"上下文压缩",
			"确定性",
			"零幻觉",
			"DCP"
		]
	},
	"@dsh-enhanced/acp": {
		id: "@dsh-enhanced/acp",
		name: "ACP 协议代理",
		description: "将 DSH 用作 Agent Client Protocol (ACP) stdio agent，提供 ACP 协议兼容能力。",
		homepage: "https://github.com/22-ai-00/dsh-enhanced",
		category: "API集成",
		icon: "🔌",
		tags: [
			"ACP",
			"Agent Client Protocol",
			"stdio",
			"协议代理"
		]
	},
	"dsh-plugin-lookatstudy": {
		id: "dsh-plugin-lookatstudy",
		name: "学习课程生成",
		description: "将任意 Markdown、本地文件夹或 GitHub 学习仓库变成 DSH 中的引导式课程，提供结构化学习体验。",
		homepage: "https://github.com/Kaiji-Z/dsh-plugin-lookatstudy#readme",
		category: "研究学习",
		icon: "🎓",
		tags: [
			"学习",
			"课程",
			"引导式",
			"Markdown",
			"GitHub"
		]
	},
	"@goodandready/dsh-cron": {
		id: "@goodandready/dsh-cron",
		name: "定时任务",
		description: "DSH 定时 cron 任务、后台自动化和 Agent 执行，支持定时任务调度和自动化工作流。",
		homepage: "https://github.com/GooDAnDReaDY/dsh-cron",
		category: "系统运维",
		icon: "⏰",
		tags: [
			"cron",
			"定时任务",
			"后台自动化",
			"调度"
		]
	},
	"dsh-desktop-windows": {
		id: "dsh-desktop-windows",
		name: "Windows 桌面版",
		description: "DSH 桌面版（Windows），Electron 桌面壳，双击即开，提供 Windows 桌面应用体验。",
		homepage: "https://github.com/ReachGa0/dsh-desktop#readme",
		category: "系统运维",
		icon: "🪟",
		tags: [
			"Windows",
			"桌面版",
			"Electron",
			"桌面壳"
		]
	},
	"@goodandready/dsh-model-sync": {
		id: "@goodandready/dsh-model-sync",
		name: "模型目录同步",
		description: "API-key DSH 提供商的自动模型目录同步，自动获取和更新可用模型列表，保持模型信息最新。",
		homepage: "https://github.com/GooDAnDReaDY/dsh-model-sync",
		category: "模型路由",
		icon: "🔄",
		tags: [
			"模型同步",
			"模型目录",
			"API-key",
			"自动更新"
		]
	},
	"dsh-plugin-vajraclaw": {
		id: "dsh-plugin-vajraclaw",
		name: "高风险命令防护",
		description: "DSH 本地工具调用故障保护，阻止固定列表的高风险 shell 模式，提供安全的命令执行防护。",
		homepage: "https://dr-os.io",
		category: "安全认证",
		icon: "🛡️",
		tags: [
			"安全防护",
			"高风险命令",
			"shell",
			"故障保护"
		]
	},
	"@goodandready/dsh-image-gen": {
		id: "@goodandready/dsh-image-gen",
		name: "图像生成工具",
		description: "DSH 图像生成，可插拔提供商的 generate_image 工具，支持多种图像生成服务，灵活切换。",
		homepage: "https://github.com/GooDAnDReaDY/dsh-image-gen",
		category: "视觉多模态",
		icon: "🎨",
		tags: [
			"图像生成",
			"可插拔",
			"generate_image",
			"多提供商"
		]
	},
	"dsh-gitbash-shell": {
		id: "dsh-gitbash-shell",
		name: "Git Bash Shell",
		description: "DSH 插件，在 Windows 上通过 Git for Windows bash 运行每个 Agent shell 命令，提供类 Unix 环境。",
		homepage: "https://github.com/KannaKuron/dsh-gitbash-shell",
		category: "开发工具",
		icon: "🐚",
		tags: [
			"Git Bash",
			"Shell",
			"Windows",
			"Unix环境"
		]
	},
	"dsh-bloub-mood": {
		id: "dsh-bloub-mood",
		name: "心情图标插件",
		description: "DSH 心情图标插件，把 web 端 logo/状态点换成 bloub 心情形象（8 形状×12 色×16 表情），随会话状态自动变化，有趣又治愈。",
		homepage: "https://github.com/Yuuhann1999/dsh-bloub-mood#readme",
		category: "UI界面增强",
		icon: "😊",
		tags: [
			"心情图标",
			"bloub",
			"动态表情",
			"治愈",
			"个性化"
		]
	},
	"relay-dsh-plugin-codex": {
		id: "relay-dsh-plugin-codex",
		name: "Codex 会话后端",
		description: "由 Codex App Server 驱动的 DSH Codex 会话后端，提供 Codex 兼容的会话管理能力。",
		homepage: "https://github.com/yangbobo2021/relay-dsh-plugin-codex#readme",
		category: "开发工具",
		icon: "🔌",
		tags: [
			"Codex",
			"会话后端",
			"App Server",
			"兼容"
		]
	},
	"@khorsheed/dsh-ankh-guard": {
		id: "@khorsheed/dsh-ankh-guard",
		name: "自修改重启防护",
		description: "自修改重启的硬门，绿色构建凭证绑定到当前提交，防止不安全的自修改重启。",
		homepage: "https://github.com/khorsheed/dsh-ankh-guard",
		category: "安全认证",
		icon: "🛡️",
		tags: [
			"安全防护",
			"自修改",
			"重启",
			"构建凭证"
		]
	},
	"dsh-lsp-actions": {
		id: "dsh-lsp-actions",
		name: "LSP 操作面板",
		description: "DSH 的 LSP 操作面板，诊断、格式化、补全、代码操作，提供语言服务器协议的完整集成。",
		homepage: "https://github.com/PerryLink/dsh-lsp-actions#readme",
		category: "开发工具",
		icon: "🔧",
		tags: [
			"LSP",
			"诊断",
			"格式化",
			"补全",
			"代码操作"
		]
	},
	"dsh-image-pathify": {
		id: "dsh-image-pathify",
		name: "图片路径管理",
		description: "DSH 插件，让纯文本模型接收粘贴的图片，并分析图片内容，提供灵活的图片处理能力。",
		homepage: "https://github.com/dami9527/dsh-image-pathify#readme",
		category: "视觉多模态",
		icon: "🖼️",
		tags: [
			"图片",
			"路径管理",
			"粘贴图片",
			"图像分析"
		]
	},
	"@alpacachen/dsh-kanban": {
		id: "@alpacachen/dsh-kanban",
		name: "看板插件",
		description: "DSH 看板插件，提供 Board 标签页、卡片评论和 15+ 功能，支持任务看板管理。",
		homepage: "https://github.com/alpacachen/dsh-kanban",
		category: "办公效率",
		icon: "📋",
		tags: [
			"看板",
			"任务管理",
			"卡片",
			"Board"
		]
	},
	"dsh-codex-timeline": {
		id: "dsh-codex-timeline",
		name: "Codex 时间线",
		description: "官方 DSH Codex 的搜索、收藏、分支和个性化，提供 Codex 风格的会话时间线管理。",
		homepage: "https://github.com/Wine-Red/dsh-codex-timeline#readme",
		category: "数据记忆",
		icon: "📅",
		tags: [
			"Codex",
			"时间线",
			"搜索",
			"收藏",
			"分支"
		]
	},
	"dsh-ai4scholar": {
		id: "dsh-ai4scholar",
		name: "学术研究工具",
		description: "AI4Scholar for DSH，38 个原生学术工具，Semantic Scholar 集成，提供完整的学术研究工作流。",
		homepage: "https://ai4scholar.net?src=dsh",
		category: "研究学习",
		icon: "🎓",
		tags: [
			"学术",
			"研究",
			"Semantic Scholar",
			"38工具"
		]
	},
	"dsh-quota-panel": {
		id: "dsh-quota-panel",
		name: "配额面板",
		description: "DSH Web 界面的提供商配额/余额挂件，可折叠的概览卡片，支持多提供商配额查询。",
		homepage: "https://github.com/wenzetan/dsh-quota-panel#readme",
		category: "金融数据",
		icon: "📊",
		tags: [
			"配额",
			"余额",
			"面板",
			"多提供商"
		]
	},
	"@alpacachen/dsh-automation": {
		id: "@alpacachen/dsh-automation",
		name: "持久化自动化",
		description: "DSH 持久化的 Agent 创建自动化，支持自动化任务的创建、调度和执行。",
		homepage: "https://github.com/alpacachen/dsh-automation",
		category: "系统运维",
		icon: "🤖",
		tags: [
			"自动化",
			"持久化",
			"调度",
			"Agent"
		]
	},
	"dsh-selfupdater": {
		id: "dsh-selfupdater",
		name: "自更新插件",
		description: "DSH 自更新插件，通过分离交换脚本进行 DSH 核心升级，提供安全的自更新能力。",
		homepage: "https://www.npmjs.com/package/dsh-selfupdater",
		category: "系统运维",
		icon: "🔄",
		tags: [
			"自更新",
			"核心升级",
			"分离交换",
			"安全"
		]
	},
	"@agi-fans/dsh-tui": {
		id: "@agi-fans/dsh-tui",
		name: "终端 UI 库",
		description: "仅库的 Cordis 插件套件，用于 DSH 终端展示和交互，提供终端 UI 组件库。",
		homepage: "https://omdsh.agi.fans/",
		category: "开发工具",
		icon: "🖥️",
		tags: [
			"TUI",
			"终端UI",
			"组件库",
			"Cordis"
		]
	},
	"dsh-crew": {
		id: "dsh-crew",
		name: "角色 Agent 团队",
		description: "DSH 插件，将工作作为小型角色 Agent 团队运行（产品经理/工程师/测试等），提供多角色协作能力。",
		homepage: "https://github.com/stuarthu/dsh-crew#readme",
		category: "开发工具",
		icon: "👥",
		tags: [
			"多Agent",
			"角色团队",
			"协作",
			"Crew"
		]
	},
	"dsh-archived-chats": {
		id: "dsh-archived-chats",
		name: "会话档案",
		description: "DSH 会话档案，从设置中安全批量归档工作区会话，按工作区浏览和全文搜索归档聊天，原生只读预览。",
		homepage: "https://github.com/Ultronen/dsh-archived-chats",
		category: "数据记忆",
		icon: "📦",
		tags: [
			"会话档案",
			"归档",
			"全文搜索",
			"只读预览"
		]
	},
	"dsh-peak-indicator": {
		id: "dsh-peak-indicator",
		name: "峰谷计价标记",
		description: "DeepSeek API 高峰/闲时（峰谷）计价标记，会话头部显示当前处于高峰还是闲时（半价）时段。",
		homepage: "https://github.com/future007s/dsh-peak-indicator#readme",
		category: "金融数据",
		icon: "📈",
		tags: [
			"峰谷计价",
			"高峰",
			"闲时",
			"半价",
			"DeepSeek"
		]
	},
	"dsh-plugin-marketplace": {
		id: "dsh-plugin-marketplace",
		name: "内置插件市场",
		description: "DSH Web UI 内置插件市场，在设置页直接浏览 github.com/topics/dsh-plugin，支持搜索、按 Star 排序。",
		homepage: "https://github.com/Scorp1o117/dsh-plugin-marketplace",
		category: "插件生态",
		icon: "🏪",
		tags: [
			"插件市场",
			"内置",
			"GitHub",
			"搜索",
			"Star排序"
		]
	},
	"dsh-plugin-wiki-tools": {
		id: "dsh-plugin-wiki-tools",
		name: "Obsidian Wiki 工具",
		description: "DSH 原生 Obsidian wiki 仓库工具，wiki_query、wiki_write 等，提供完整的 Obsidian 知识库操作能力。",
		homepage: "https://github.com/Lion-1209/dsh-plugin-wiki-tools#readme",
		category: "数据记忆",
		icon: "📝",
		tags: [
			"Obsidian",
			"Wiki",
			"知识库",
			"wiki_query"
		]
	},
	"@max-null/dsh-plugin-center": {
		id: "@max-null/dsh-plugin-center",
		name: "插件中心",
		description: "DSH 插件中心，已安装元数据、社区市场、更新管理，提供完整的插件中心管理界面。",
		homepage: "https://github.com/max-null/dsh-plugin-center",
		category: "插件生态",
		icon: "🎛️",
		tags: [
			"插件中心",
			"元数据",
			"社区市场",
			"更新管理"
		]
	},
	"dsh-xray": {
		id: "dsh-xray",
		name: "X 光诊断",
		description: "DSH 的 X 光，诊断实际加载了什么、为什么加载，提供插件加载状态的深度诊断能力。",
		homepage: "https://github.com/alloevil/dsh-xray#readme",
		category: "开发工具",
		icon: "🔍",
		tags: [
			"诊断",
			"X-ray",
			"插件加载",
			"调试"
		]
	},
	"dsh-project-orchestrator": {
		id: "dsh-project-orchestrator",
		name: "项目编排工作台",
		description: "本地优先的 AI 项目编排工作台和 CLI 插件，提供项目级的 AI 编排和管理能力。",
		homepage: "https://github.com/zhangz-2018/dsh-project-orchestrator#readme",
		category: "开发工具",
		icon: "🎼",
		tags: [
			"项目编排",
			"工作台",
			"CLI",
			"本地优先"
		]
	},
	"dsh-map-tools": {
		id: "dsh-map-tools",
		name: "地图路由工具",
		description: "DSH 地图和路由工具，驾车/公交/步行/骑行路线规划，提供完整的地图和导航能力。",
		homepage: "https://github.com/HorusJiang/dsh-map-tools#readme",
		category: "API集成",
		icon: "🗺️",
		tags: [
			"地图",
			"路由",
			"导航",
			"路线规划"
		]
	},
	"picturereader": {
		id: "picturereader",
		name: "统一图像理解",
		description: "DSH 统一图像理解插件，视觉双引擎适配，提供灵活的图像理解和分析能力。",
		homepage: "https://github.com/jing-hy/picturereader#readme",
		category: "视觉多模态",
		icon: "👁️",
		tags: [
			"图像理解",
			"统一",
			"双引擎",
			"视觉"
		]
	},
	"@perrylink/dsh-github": {
		id: "@perrylink/dsh-github",
		name: "GitHub CI 集成",
		description: "官方级 GitHub CI for DSH，复合动作（PR 审查/修复），提供完整的 GitHub 持续集成能力。",
		homepage: "https://github.com/perrylink/dsh-github",
		category: "开发工具",
		icon: "🐙",
		tags: [
			"GitHub",
			"CI",
			"PR审查",
			"复合动作"
		]
	},
	"wallpaper-engine-dsh": {
		id: "wallpaper-engine-dsh",
		name: "Wallpaper Engine 壁纸",
		description: "Wallpaper Engine 库作为 DSH Web GUI 背景，视频/网页/静态壁纸，提供动态壁纸能力。",
		homepage: "https://github.com/Weilv-D/wallpaper-engine-dsh#readme",
		category: "UI界面增强",
		icon: "🖼️",
		tags: [
			"Wallpaper Engine",
			"壁纸",
			"动态背景",
			"视频"
		]
	},
	"@kiwifruit/dsh-jit-viewer": {
		id: "@kiwifruit/dsh-jit-viewer",
		name: "文档预览浮层",
		description: "jit-viewer 的 DSH 插件适配，工具 preview_document + Web 预览浮层，第一版支持 PDF+Office 文档预览。",
		homepage: "https://www.npmjs.com/package/%40kiwifruit%2Fdsh-jit-viewer",
		category: "办公效率",
		icon: "👁️",
		tags: [
			"文档预览",
			"PDF",
			"Office",
			"浮层"
		]
	},
	"dsh-output-styles": {
		id: "dsh-output-styles",
		name: "输出样式切换",
		description: "Claude Code outputStyles 等效的运行时输出样式切换，提供灵活的输出样式管理。",
		homepage: "https://github.com/PerryLink/dsh-output-styles#readme",
		category: "开发工具",
		icon: "🎨",
		tags: [
			"输出样式",
			"运行时切换",
			"Claude Code",
			"outputStyles"
		]
	},
	"dsh-advisor": {
		id: "dsh-advisor",
		name: "顾问审查模式",
		description: "移植 omp advisor 子系统的 DSH 插件包，每会话审查员模式，提供智能代码审查和建议。",
		homepage: "https://github.com/omdsh-dev/dsh-advisor#readme",
		category: "开发工具",
		icon: "🧐",
		tags: [
			"顾问",
			"审查",
			"代码审查",
			"omp"
		]
	},
	"dsh-milestone": {
		id: "dsh-milestone",
		name: "里程碑时间线",
		description: "Git 风格的里程碑时间线，悬停查看元数据，点击跳转，提供项目里程碑的可视化管理。",
		homepage: "https://www.npmjs.com/package/dsh-milestone",
		category: "开发工具",
		icon: "🏁",
		tags: [
			"里程碑",
			"时间线",
			"Git风格",
			"可视化"
		]
	},
	"dsh-oc-file-links": {
		id: "dsh-oc-file-links",
		name: "逐轮产出物卡片",
		description: "DSH 逐轮产出物卡片插件，每轮（assistant 回答下方）显示该轮真正产出的文件与网址，精确按轮归属。",
		homepage: "https://www.npmjs.com/package/dsh-oc-file-links",
		category: "UI界面增强",
		icon: "📎",
		tags: [
			"产出物",
			"文件卡片",
			"逐轮",
			"归属"
		]
	},
	"dsh-composer-history": {
		id: "dsh-composer-history",
		name: "输入历史",
		description: "DSH Web 输入框的终端风格输入历史，边缘优先架构，提供便捷的历史输入复用。",
		homepage: "https://github.com/PerryLink/dsh-composer-history#readme",
		category: "开发工具",
		icon: "📜",
		tags: [
			"输入历史",
			"终端风格",
			"复用",
			"边缘优先"
		]
	},
	"@moguiyu/dsh-tool-tavily-search": {
		id: "@moguiyu/dsh-tool-tavily-search",
		name: "Tavily 搜索工具",
		description: "DSH 可选的高级 Tavily 模型工具（搜索、提取、地图、编码），提供强大的 Tavily 搜索能力。",
		homepage: "https://github.com/moguiyu/dsh-tavily#readme",
		category: "搜索联网",
		icon: "🔍",
		tags: [
			"Tavily",
			"搜索",
			"提取",
			"地图",
			"高级工具"
		]
	},
	"dsh-observe": {
		id: "dsh-observe",
		name: "可观测性导出",
		description: "DSH 的 OpenTelemetry 和 Langfuse 可观测性导出，turn/step 级别追踪，提供完整的可观测性能力。",
		homepage: "https://github.com/PerryLink/dsh-observe#readme",
		category: "系统运维",
		icon: "📊",
		tags: [
			"可观测性",
			"OpenTelemetry",
			"Langfuse",
			"追踪"
		]
	},
	"@agi-fans/oh-my-dsh": {
		id: "@agi-fans/oh-my-dsh",
		name: "oh-my-dsh TUI",
		description: "omdsh：键盘优先的 DSH TUI 编码代理，运行在 DSH 运行时之上，提供终端风格的编码体验。",
		homepage: "https://github.com/agi-fans/oh-my-dsh",
		category: "开发工具",
		icon: "⌨️",
		tags: [
			"TUI",
			"键盘优先",
			"编码代理",
			"omdsh"
		]
	},
	"@lanbaolu/dsh-fail-soft": {
		id: "@lanbaolu/dsh-fail-soft",
		name: "坏插件隔离",
		description: "自动隔离损坏插件，让 DSH 在坏插件面前照常启动，坏插件被禁用、其余插件正常装配，提供隔离管理与一键恢复 UI。",
		homepage: "https://github.com/lanbaolu/dsh-fail-soft",
		category: "系统运维",
		icon: "🛡️",
		tags: [
			"故障隔离",
			"坏插件",
			"自动禁用",
			"恢复"
		]
	},
	"dsh-usage-billing": {
		id: "dsh-usage-billing",
		name: "用量消费统计",
		description: "DSH 用量与消费统计插件，按 2026-08-17 调价前后峰谷价格计费，含主界面汇总面板、会话级明细与图表。",
		homepage: "https://www.npmjs.com/package/dsh-usage-billing",
		category: "金融数据",
		icon: "💰",
		tags: [
			"用量统计",
			"消费",
			"峰谷价格",
			"图表",
			"明细"
		]
	},
	"dsh-mpkg-wallpaper": {
		id: "dsh-mpkg-wallpaper",
		name: "mpkg 壁纸引擎",
		description: "DSH Web 壁纸引擎 Wallpaper Engine mpkg 背景插件，浏览器内直接解析 .mpkg（preview.gif 动态背景/内嵌 mp4 视频）。",
		homepage: "https://github.com/XHR666/dsh-mpkg-wallpaper",
		category: "UI界面增强",
		icon: "🖼️",
		tags: [
			"壁纸",
			"mpkg",
			"Wallpaper Engine",
			"动态背景"
		]
	},
	"dsh-auto-classifier": {
		id: "dsh-auto-classifier",
		name: "自动权限分类",
		description: "DSH 自主（自动）模式权限分类器，Claude-Code 风格的权限自动分类，提供智能的权限管理。",
		homepage: "https://github.com/PAKIKNOWLEDGE/dsh-auto-classifier#readme",
		category: "安全认证",
		icon: "🎯",
		tags: [
			"权限分类",
			"自动模式",
			"Claude-Code",
			"智能"
		]
	},
	"dsh-updater-npm": {
		id: "dsh-updater-npm",
		name: "npm 更新器",
		description: "DSH 更新器 + 官方文档同步插件，一键 npm 更新和文档同步，提供便捷的版本管理。",
		homepage: "https://github.com/SiriusWJ/dsh-updater-npm#readme",
		category: "系统运维",
		icon: "🔄",
		tags: [
			"更新器",
			"npm",
			"文档同步",
			"一键更新"
		]
	},
	"dsh-email": {
		id: "dsh-email",
		name: "邮件插件",
		description: "DSH 邮件插件，IMAP/SMTP 收发、搜索、回复转发、邮件整理与增量收件，支持多邮箱预设、发信审批及 Web 设置与新邮件通知。",
		homepage: "https://github.com/STARDUSTLC666/dsh-email#readme",
		category: "办公效率",
		icon: "📧",
		tags: [
			"邮件",
			"IMAP",
			"SMTP",
			"收发",
			"多邮箱"
		]
	},
	"dsh-acp-server": {
		id: "dsh-acp-server",
		name: "ACP 服务器",
		description: "DSH 的 Agent Client Protocol (ACP) 服务器插件，驱动 ACP 协议兼容的客户端连接。",
		homepage: "https://github.com/dushaobindoudou/dsh-acp#readme",
		category: "API集成",
		icon: "🖥️",
		tags: [
			"ACP",
			"服务器",
			"Agent Client Protocol",
			"协议"
		]
	},
	"@hyzyn/dsh-safe": {
		id: "@hyzyn/dsh-safe",
		name: "启动保险丝",
		description: "DSH 启动保险丝，社区插件不兼容导致 DSH 启动失败时，自动禁用坏插件并重试，保障启动稳定性。",
		homepage: "https://github.com/hyzyn/dsh-safe",
		category: "系统运维",
		icon: "🔒",
		tags: [
			"启动保险丝",
			"安全启动",
			"自动禁用",
			"稳定性"
		]
	},
	"dsh-chat-sync": {
		id: "dsh-chat-sync",
		name: "对话历史同步",
		description: "DSH 插件，自动导入本地 AI CLI 对话（Claude Code、Codex CLI、Cursor 等），提供多平台对话历史同步。",
		homepage: "https://github.com/nan1010082085/dsh-chat-sync#readme",
		category: "数据记忆",
		icon: "🔄",
		tags: [
			"对话同步",
			"历史导入",
			"Claude Code",
			"Codex",
			"Cursor"
		]
	},
	"dsh-voice-mode": {
		id: "dsh-voice-mode",
		name: "全双工语音",
		description: "DSH 全双工语音插件，本地 zipformer2 流式 ASR（近零延迟），提供实时语音交互能力。",
		homepage: "https://github.com/qishuilalala/dsh-voice-mode#readme",
		category: "视觉多模态",
		icon: "🎙️",
		tags: [
			"全双工",
			"语音",
			"ASR",
			"流式",
			"低延迟"
		]
	},
	"dsh-tool-normalizer": {
		id: "dsh-tool-normalizer",
		name: "工具归一化",
		description: "自愈、参数归一化、Code-Mode 桥接和执行诊断，提供工具调用的标准化和容错能力。",
		homepage: "https://github.com/merenguesL/dsh-tool-normalizer#readme",
		category: "开发工具",
		icon: "🔧",
		tags: [
			"工具归一化",
			"自愈",
			"参数归一化",
			"Code-Mode",
			"诊断"
		]
	},
	"dsh-plugin-vetting": {
		id: "dsh-plugin-vetting",
		name: "插件安全审查",
		description: "装插件前先体检，第三方插件=进程内全权限代码，这个工具让\"盲装\"变成\"知情安装\"，恶意模式、越权路径、未检查依赖一目了然。",
		homepage: "https://github.com/truelove-dreamer/dsh-plugin-vetting#readme",
		category: "安全认证",
		icon: "🔍",
		tags: [
			"插件审查",
			"安全",
			"体检",
			"恶意检测",
			"越权"
		]
	},
	"dsh-auth": {
		id: "dsh-auth",
		name: "Caddy 认证",
		description: "Caddy 前端的管理员认证包，为 DSH 提供基于 Caddy 的安全认证和访问控制。",
		homepage: "https://github.com/hxy91819/dsh-auth#readme",
		category: "安全认证",
		icon: "🔐",
		tags: [
			"Caddy",
			"认证",
			"管理员",
			"访问控制"
		]
	},
	"dsh-stock-watch": {
		id: "dsh-stock-watch",
		name: "A股盯盘插件",
		description: "A股自选股实时行情盯盘插件，DSH Web 右上角可折叠弹窗（分时/K线/目标价/主题切换/可拖动/添加股票分组）。",
		homepage: "https://www.npmjs.com/package/dsh-stock-watch",
		category: "金融数据",
		icon: "📈",
		tags: [
			"A股",
			"盯盘",
			"实时行情",
			"K线",
			"自选股"
		]
	},
	"@lemoncat7/dsh-partner": {
		id: "@lemoncat7/dsh-partner",
		name: "AI 伙伴",
		description: "长寿 AI 伙伴，带微信渠道路由，提供持久化的 AI 陪伴和交互能力。",
		homepage: "https://github.com/lemoncat7/dsh-partner",
		category: "办公效率",
		icon: "🤝",
		tags: [
			"AI伙伴",
			"长寿",
			"微信",
			"陪伴"
		]
	},
	"dsh-daoing-memory": {
		id: "dsh-daoing-memory",
		name: "自进化记忆",
		description: "DSH 自进化记忆，获得的经验、日记/事实记忆，提供持续学习和自我进化的记忆能力。",
		homepage: "https://github.com/daoing/dsh-daoing-memory",
		category: "数据记忆",
		icon: "🧠",
		tags: [
			"自进化",
			"记忆",
			"经验",
			"日记",
			"持续学习"
		]
	},
	"oh-my-knowledge": {
		id: "oh-my-knowledge",
		name: "OMK 知识管理",
		description: "OMK — Observe. Measure. Know. 证据驱动的 AI 应用知识变更，提供科学的知识管理方法。",
		homepage: "https://oh-my-knowledge.pages.dev",
		category: "数据记忆",
		icon: "📚",
		tags: [
			"OMK",
			"知识管理",
			"证据驱动",
			"Observe",
			"Measure"
		]
	},
	"dsh-quota": {
		id: "dsh-quota",
		name: "会员配额挂件",
		description: "DSH 右下角会员配额药丸，面板显示详细配额使用情况，提供直观的配额管理视图。",
		homepage: "https://github.com/Minokun/dsh-quota#readme",
		category: "金融数据",
		icon: "🎫",
		tags: [
			"配额",
			"会员",
			"挂件",
			"使用情况"
		]
	},
	"dsh-diagram": {
		id: "dsh-diagram",
		name: "Excalidraw 图表",
		description: "将 DSH 中的文章变成可编辑的 Excalidraw 画布，提供手绘风格的图表和可视化能力。",
		homepage: "https://github.com/hanzhangzzz/dsh-diagram#readme",
		category: "UI界面增强",
		icon: "✏️",
		tags: [
			"Excalidraw",
			"图表",
			"手绘",
			"可视化",
			"画布"
		]
	},
	"dsh-kb-rag": {
		id: "dsh-kb-rag",
		name: "文献知识库 RAG",
		description: "DSH 本地文献知识库 RAG，混合 BM25 + 向量检索，提供专业的文献检索和问答能力。",
		homepage: "https://github.com/Breeze136/dsh-kb-rag#readme",
		category: "研究学习",
		icon: "📖",
		tags: [
			"RAG",
			"知识库",
			"文献",
			"BM25",
			"向量检索"
		]
	},
	"@dshline/dshline": {
		id: "@dshline/dshline",
		name: "dshline 终端",
		description: "终端原生的 DSH 插件生态前端，提供终端风格的插件浏览和管理界面。",
		homepage: "https://dshline.xyz",
		category: "UI界面增强",
		icon: "💻",
		tags: [
			"终端",
			"dshline",
			"插件生态",
			"前端"
		]
	},
	"dsh-meme": {
		id: "dsh-meme",
		name: "表情包插件",
		description: "DSH 表情包插件，内置官方-001 与大肥鱼两套图库，设置页扫描切换，send_meme 发图（Web/QQ）。",
		homepage: "https://yyh-001.github.io/dsh-meme/",
		category: "UI界面增强",
		icon: "😄",
		tags: [
			"表情包",
			"meme",
			"图库",
			"send_meme",
			"大肥鱼"
		]
	},
	"dsh-plugin-balance": {
		id: "dsh-plugin-balance",
		name: "额度悬浮窗",
		description: "DeepSeek / OpenCode Go / OpenAI 额度悬浮窗，输入框上方显示，支持 DSH 模型列表同步、自定义额度接口、可拖动、主题适配。",
		homepage: "https://github.com/Andrew111888/dsh-plugin-balance",
		category: "金融数据",
		icon: "💰",
		tags: [
			"额度",
			"悬浮窗",
			"DeepSeek",
			"OpenCode",
			"OpenAI"
		]
	},
	"dsh-ai-team": {
		id: "dsh-ai-team",
		name: "AI 软件团队",
		description: "DSH 插件，无人值守的 AI 软件团队，给它一台裸 Linux 服务器和一组需求，自动完成软件开发全流程。",
		homepage: "https://github.com/yunqiangwu/dsh-ai-team#readme",
		category: "开发工具",
		icon: "👨‍💻",
		tags: [
			"AI团队",
			"无人值守",
			"软件开发",
			"自动化"
		]
	},
	"dsh-f": {
		id: "dsh-f",
		name: "飞书流式卡片",
		description: "将 DSH 桥接到飞书/Lark，带流式卡片、项目工作区、并行任务，提供完整的飞书集成体验。",
		homepage: "https://github.com/PlutoKeating/dsh-lark-bot#readme",
		category: "办公效率",
		icon: "🐦",
		tags: [
			"飞书",
			"Lark",
			"流式卡片",
			"项目工作区",
			"并行任务"
		]
	},
	"dsh-plugin-usage-meter": {
		id: "dsh-plugin-usage-meter",
		name: "用量费用仪表",
		description: "API 用量/费用/余额仪表，DSH 网页插件，按钮式用量条实时报价并显示余额，面板含按模型堆叠柱状图（当日逐小时×峰谷档位）。",
		homepage: "https://github.com/fancr-code/dsh-plugin-usage-meter#readme",
		category: "金融数据",
		icon: "📊",
		tags: [
			"用量",
			"费用",
			"余额",
			"仪表",
			"柱状图",
			"峰谷"
		]
	},
	"@max-null/dsh-memory": {
		id: "@max-null/dsh-memory",
		name: "纯文本记忆",
		description: "DSH 跨会话纯文本记忆插件，确定性 BM25 检索，提供简单可靠的长期记忆能力。",
		homepage: "https://github.com/max-null/dsh-memory",
		category: "数据记忆",
		icon: "📝",
		tags: [
			"记忆",
			"纯文本",
			"跨会话",
			"BM25",
			"确定性"
		]
	},
	"dsh-research-report": {
		id: "dsh-research-report",
		name: "研究报告引擎",
		description: "DSH 可验证研究报告引擎，内容寻址证据链，提供专业的研究报告生成和验证能力。",
		homepage: "https://github.com/PerryLink/dsh-research-report#readme",
		category: "研究学习",
		icon: "📑",
		tags: [
			"研究报告",
			"可验证",
			"证据链",
			"内容寻址"
		]
	},
	"dsh-remote-desktop": {
		id: "dsh-remote-desktop",
		name: "远程桌面",
		description: "DSH 手机远程访问 + 远程桌面，内置本地代理(8090)+配置面板+远程屏幕/鼠标/键盘，配合任意内网穿透工具把公网 URL 变成远程桌面。",
		homepage: "https://www.npmjs.com/package/dsh-remote-desktop",
		category: "移动远程",
		icon: "🖥️",
		tags: [
			"远程桌面",
			"手机访问",
			"本地代理",
			"内网穿透",
			"远程控制"
		]
	},
	"dsh-retrace": {
		id: "dsh-retrace",
		name: "回溯编辑",
		description: "Retrace · 回溯，召回、编辑并重发、重新生成，以及对话/产物版本控制，提供完整的会话回溯能力。",
		homepage: "https://github.com/yamingmou/dsh-retrace#readme",
		category: "数据记忆",
		icon: "⏪",
		tags: [
			"回溯",
			"编辑重发",
			"版本控制",
			"召回",
			"Retrace"
		]
	},
	"dsh-vision-router": {
		id: "dsh-vision-router",
		name: "视觉路由",
		description: "纯文本 DSH Agent 的眼睛，内置免费视觉链（无需 Key），提供零配置的视觉能力接入。",
		homepage: "https://github.com/ysr666/dsh-vision-router",
		category: "视觉多模态",
		icon: "👁️",
		tags: [
			"视觉",
			"路由",
			"免费",
			"无需Key",
			"零配置"
		]
	}
};
/**
* 获取资源元信息
* @param id 资源ID（包名）
* @returns 资源元信息，如果不存在返回 null
*/
function getResourceMeta(id) {
	return PLUGIN_META_DATABASE[id] || null;
}
/**
* 获取资源描述（优先使用数据库中的描述，其次使用传入的描述）
* @param id 资源ID
* @param fallbackDescription 备用描述
* @returns 最终描述
*/
function getResourceDescription(id, fallbackDescription = "") {
	const meta = PLUGIN_META_DATABASE[id];
	if (meta && meta.description) return meta.description;
	return fallbackDescription || "暂无描述";
}
/**
* 获取资源源网站链接
* @param id 资源ID
* @returns 源网站链接，如果不存在返回 npm 搜索链接
*/
function getResourceHomepage(id) {
	const meta = PLUGIN_META_DATABASE[id];
	if (meta && meta.homepage) return meta.homepage;
	return `https://www.npmjs.com/search?q=${encodeURIComponent(id)}`;
}
/**
* 获取资源分类（优先使用数据库中的分类）
* @param id 资源ID
* @param fallbackCategory 备用分类
* @returns 最终分类
*/
function getResourceCategory(id, fallbackCategory = "其他") {
	const meta = PLUGIN_META_DATABASE[id];
	if (meta && meta.category) return meta.category;
	return fallbackCategory;
}
//#endregion
//#region src/host/npm-fetcher.ts
/** npm registry 搜索 API 基础 URL */
const NPM_SEARCH_API = "https://registry.npmjs.org/-/v1/search";
/** 搜索关键词列表（按优先级排序） */
const SEARCH_KEYWORDS = [
	"keywords:dsh-plugin",
	"keywords:deepseek-harness",
	"keywords:dsh-preset",
	"keywords:dsh-skill",
	"dsh-plugin",
	"deepseek-harness plugin"
];
/** 单次搜索最大结果数 */
const SEARCH_SIZE = 250;
/**
* 从 npm registry 抓取 DSH 插件列表
* @param ctx 工作台上下文
* @returns 标准化后的 npm 资源列表
*/
async function fetchNpmPlugins(ctx) {
	const result = [];
	const seenIds = /* @__PURE__ */ new Set();
	ctx.logger?.info("[NPM] 开始从 npm registry 抓取 DSH 插件...");
	try {
		for (const keyword of SEARCH_KEYWORDS) try {
			const packages = await searchNpmPackages(ctx, keyword);
			ctx.logger?.info(`[NPM] 关键词 "${keyword}" 找到 ${packages.length} 个包`);
			for (const pkg of packages) {
				if (seenIds.has(pkg.name)) continue;
				seenIds.add(pkg.name);
				if (!isDSHPlugin(pkg)) continue;
				if (!isValidSemver(pkg.version)) continue;
				const type = detectResourceType(pkg);
				const autoCategory = classifyResource(pkg.name, pkg.description || "", pkg.keywords || []);
				const category = getResourceCategory(pkg.name, autoCategory);
				const description = getResourceDescription(pkg.name, pkg.description || "");
				const npmHomepage = pkg.links?.homepage || pkg.links?.repository || "";
				const dbHomepage = getResourceHomepage(pkg.name);
				let homepage = npmHomepage;
				if (!homepage || !homepage.startsWith("http")) homepage = dbHomepage;
				if (!homepage || !homepage.startsWith("http")) homepage = `https://www.npmjs.com/package/${encodeURIComponent(pkg.name)}`;
				const resource = createDefaultResource({
					id: pkg.name,
					name: pkg.name,
					type,
					category,
					description,
					author: pkg.author?.name || "unknown",
					source: "npm",
					isOfficial: pkg.author?.name === "deepseek-ai",
					isInstalled: false,
					latestVersion: pkg.version,
					localVersion: "",
					adaptVersion: "all",
					updateTime: pkg.date ? new Date(pkg.date).getTime() : Date.now(),
					star: 0,
					fork: 0,
					installCmd: `dsh plugin --profile web add ${pkg.name}`,
					homepage,
					configPath: ""
				});
				result.push(resource);
			}
		} catch (err) {
			ctx.logger?.warn(`[NPM] 关键词 "${keyword}" 搜索失败`, err);
		}
		const typeCount = {
			plugin: result.filter((r) => r.type === "plugin").length,
			preset: result.filter((r) => r.type === "preset").length,
			app: result.filter((r) => r.type === "app").length,
			skill: result.filter((r) => r.type === "skill").length
		};
		ctx.logger?.info(`[NPM] 抓取完成：共 ${result.length} 个资源（插件${typeCount.plugin}/预设${typeCount.preset}/应用${typeCount.app}/Skill${typeCount.skill}）`);
		if (result.length > 0) {
			const names = result.slice(0, 10).map((r) => r.name);
			ctx.logger?.info(`[NPM] 前10个: ${names.join(", ")}`);
		}
		return result;
	} catch (err) {
		ctx.logger?.warn("[NPM] 抓取失败，降级为空列表", err);
		return result;
	}
}
/**
* 搜索 npm 包
*/
async function searchNpmPackages(ctx, text) {
	const url = `${NPM_SEARCH_API}?text=${encodeURIComponent(text)}&size=${SEARCH_SIZE}`;
	const res = await ctx.http.get(url, { timeout: 15e3 });
	if (res.status !== 200 || !res.data) return [];
	return (res.data.objects || []).map((obj) => obj.package);
}
/**
* 判断是否是 DSH 插件
*/
function isDSHPlugin(pkg) {
	const keywords = pkg.keywords || [];
	const name = pkg.name.toLowerCase();
	const description = (pkg.description || "").toLowerCase();
	const dshKeywords = [
		"dsh",
		"deepseek-harness",
		"dsh-plugin",
		"dsh-preset",
		"dsh-skill"
	];
	if (keywords.some((k) => dshKeywords.some((dk) => k.toLowerCase().includes(dk)))) return true;
	if (name.startsWith("dsh-") || name.includes("deepseek-harness")) return true;
	if (description.includes("deepseek harness") || description.includes("dsh plugin")) return true;
	return false;
}
/**
* 根据包信息判断资源类型
*/
function detectResourceType(pkg) {
	const keywords = (pkg.keywords || []).map((k) => k.toLowerCase());
	const name = pkg.name.toLowerCase();
	if (keywords.includes("dsh-preset") || keywords.includes("preset")) return "preset";
	if (keywords.includes("dsh-skill") || keywords.includes("skill")) return "skill";
	if (keywords.includes("dsh-app") || keywords.includes("app") || keywords.includes("agent")) return "app";
	if (name.includes("preset") || name.includes("template")) return "preset";
	if (name.includes("skill")) return "skill";
	if (name.includes("app") || name.includes("agent") || name.includes("workflow")) return "app";
	return "plugin";
}
//#endregion
//#region src/host/dshdesktop-fetcher.ts
/**
* dshdesktop.com 已知预设列表（从预设页面提取）
* 这些预设是社区分享的工作配方，包含角色、技能和工具的组合
*/
const DSHDESKTOP_PRESETS = [
	{
		id: "image-production-en-mode",
		name: "图像制作模式",
		description: "从视觉 Brief、生成与编辑到多规格适配和质量检查，完成可复现、保留来源的图像生产流程。",
		author: "dshdesktop",
		category: "图像制作",
		usageCount: 1788
	},
	{
		id: "scientific-evidence-en-mode",
		name: "科研证据模式",
		description: "完成研究问题拆解、论文检索与比较、主张和引用核验、证据矩阵、结构化综述、研究空白分析和更新简报。",
		author: "dshdesktop",
		category: "资料研究",
		usageCount: 1697
	},
	{
		id: "video-production-en-mode",
		name: "视频制作模式",
		description: "通过可追溯的策划、剪辑、字幕、音频、版本适配和技术质检流程完成视频交付。",
		author: "dshdesktop",
		category: "视频制作",
		usageCount: 1235
	},
	{
		id: "motion-graphics-en-mode",
		name: "动效制作模式",
		description: "设计并实现可复用的动效系统、程序化视频、合成遮罩流程和渲染质量验证。",
		author: "dshdesktop",
		category: "动效设计",
		usageCount: 587
	},
	{
		id: "minimal-v3",
		name: "极简模式（Windows 适配）",
		description: "面向 Windows 的轻量编码 Agent，在极简模式基础上加入 PowerShell，以及 read、write、edit、glob 和 grep 等常用文件工具。",
		author: "provance_initial",
		category: "编码开发",
		usageCount: 543
	},
	{
		id: "contract-review-en-mode",
		name: "合同审查模式",
		description: "完成合同分流、条款审查、版本比较、红线建议、谈判简报和终稿核验，并保留可追溯的审查依据。",
		author: "dshdesktop",
		category: "法律合规",
		usageCount: 383
	},
	{
		id: "orchestrator",
		name: "分解委派模式",
		description: "主对话只负责拆分、派发、验证与汇总，每个子任务交给全新 worker 执行和自验，关键结论由独立审计 worker 复核，共享产物最后由集成 worker 合并。",
		author: "2969617467",
		category: "任务管理",
		usageCount: 309
	},
	{
		id: "apple-development-en-mode",
		name: "Apple 开发模式",
		description: "借助 Xcode 工具完成 Apple 全平台代码解释、功能开发、缺陷诊断、界面工程、架构演进、性能优化和发布核验。",
		author: "dshdesktop",
		category: "编码开发",
		usageCount: 280
	},
	{
		id: "image-generation-mode",
		name: "图像生成模式",
		description: "专门用来生成图片，适用于海报、Banner、人像等。模式会根据使用者需求逐项核验，针对未达标硬性指标重新生成，完成后诚实标注。",
		author: "liqingb0220",
		category: "图像制作",
		usageCount: 210
	},
	{
		id: "lim-any",
		name: "大型任务拆分器",
		description: "一种思维模式配方：把大型任务拆成边界清晰的小步骤，短思考、小任务、即时验证。实测在输出质量、速度、思维链与 Token 规划效率上表现优秀。",
		author: "1614757134",
		category: "任务管理",
		usageCount: 178
	},
	{
		id: "data-analysis-mode",
		name: "数据分析模式",
		description: "用来分析数据文件，适用于表格核算、指标口径、趋势与分布等。模式会先摸清数据情况再动手，去重、补缺、剔除异常都会明说，不静默处理。",
		author: "liqingb0220",
		category: "数据分析",
		usageCount: 168
	},
	{
		id: "apple-dev",
		name: "Apple 开发模式（Xcode集成）",
		description: "集成 Xcode MCP 工具、Apple 平台技能和 Xcode Intelligence 风格工作方式，适用于 Swift、SwiftUI、App Intents、UIKit 与安全审计开发。",
		author: "qinrui",
		category: "编码开发",
		usageCount: 154
	},
	{
		id: "agentic-ci-security-en-mode",
		name: "Agentic CI 安全模式",
		description: "盘点、审阅、审计、调查、修复并核验 GitHub Actions 中 AI Agent 的数据流、权限和信任边界。",
		author: "dshdesktop",
		category: "安全审计",
		usageCount: 147
	},
	{
		id: "req-mgr",
		name: "需求分析与需求管理",
		description: "配置 GitHub 仓库、分支和需求目录后，检索已有需求并拉取最新代码，结合实现分析新需求、给出建议，再由用户决定是否写入需求库并维护索引。",
		author: "binfeng",
		category: "项目管理",
		usageCount: 142
	},
	{
		id: "delepi",
		name: "Delepi 精准交付模式",
		description: "基于 Delepi 双智能体协作方法论，内置问题诊断、方案设计、调查研究、视觉设计、执行变更、用例编写、用例执行和自动化交互八套工作法，强调证据链、反证法与可验收交付。",
		author: "657427356",
		category: "任务管理",
		usageCount: 89
	},
	{
		id: "cache-tuned",
		name: "缓存优化编码 Agent",
		description: "标准编码 Agent（standard）的逐字节副本，为 DeepSeek 前缀缓存友好而调优：更晚压缩、更晚剪枝工具结果，缓存失效更少、热前缀存活更久。",
		author: "15103102590",
		category: "编码开发",
		usageCount: 86
	},
	{
		id: "business-research-decision-mode",
		name: "商业调研与决策模式",
		description: "用来做商业决策，适用于定价、预算分配、采购选型、招聘与自动化取舍、新市场进入等。模式会先检查各方案是否满足硬性约束，把事实、假设和判断分开。",
		author: "liqingb0220",
		category: "商业分析",
		usageCount: 74
	},
	{
		id: "metatutor",
		name: "MetaTutor：Meta 分析导师",
		description: "Meta 分析与系统综述学习导师，提供单流程实操、全流程演练、写作示范与仿写，并根据三级学习画像自适应教学和 rubric 评分。",
		author: "2874909789",
		category: "教育学习",
		usageCount: 64
	},
	{
		id: "export-document-consistency-checker",
		name: "外贸单证一致性核验员",
		description: "扫描采购订单、商业发票、装箱单和提单草稿等外贸单据，抽取关键字段、建立跨文件一致性矩阵、复算金额数量重量，并标记严重问题、待复核项与一致项。",
		author: "wangyu",
		category: "文档工作",
		usageCount: 60
	},
	{
		id: "design-spec-research",
		name: "设计规范调研模式",
		description: "针对每个组件调研主流设计系统，再结合项目设计原则与必读的元文档写作规范，产出可追溯、属于当前项目的组件设计规范。",
		author: "kinyoo1126",
		category: "设计规范",
		usageCount: 50
	},
	{
		id: "electron-code-dedup",
		name: "Electron 代码去重审计",
		description: "只读扫描 Electron 项目的 main、preload、renderer 和 shared 分层，识别精确重复、近似重复及可抽取公共逻辑，并按优先级输出改造建议，默认不修改业务代码。",
		author: "wanglu",
		category: "编码开发",
		usageCount: 48
	},
	{
		id: "architect-review",
		name: "建筑录入评审工作台",
		description: "面向建筑、景观、室内和规划方案的三段式工作台：录入 PPT/PDF 文本，生成逐页全屏演示，再输出包含立面专项分析的综合评审报告。",
		author: "618largo",
		category: "文档工作",
		usageCount: 48
	},
	{
		id: "gtm-strategy",
		name: "GTM 策略顾问",
		description: "内置 STP、波特五力、AARRR、JTBD 等全套 GTM 框架的策略顾问。帮助创业者和产品团队制定可执行的上市场策略。",
		author: "cinderzhan",
		category: "商业分析",
		usageCount: 32
	},
	{
		id: "nexus-sdlc",
		name: "Nexus 规范研发模式",
		description: "遵循 Nexus 规范研发工作配方：主会话充当控制面与协调者，严格执行「Claude Code 规划 → Codex 开发/自测 → Claude Code 审查 → 修复/复审 → 知识提炼」的确定性双引擎协同。",
		author: "382716335",
		category: "编码开发",
		usageCount: 26
	}
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
async function fetchDshDesktopPresets(ctx) {
	const result = [];
	ctx.logger?.info("[Preset] 从 dshdesktop.com 获取预设列表...");
	try {
		for (const preset of DSHDESKTOP_PRESETS) {
			const resource = createDefaultResource({
				id: `dshdesktop:${preset.id}`,
				name: preset.name,
				type: "preset",
				category: preset.category,
				description: preset.description,
				author: preset.author,
				source: "npm",
				isOfficial: false,
				isInstalled: false,
				latestVersion: "1.0.0",
				localVersion: "",
				adaptVersion: "all",
				updateTime: Date.now(),
				star: preset.usageCount,
				fork: 0,
				installCmd: `# 预设安装说明：\n# 1. 访问 https://dshdesktop.com/preset/zh/ 查看详情\n# 2. 复制预设配置到 ~/.dsh/.agent-presets/${preset.id}/\n# 3. 或通过 DSH Desktop 导入 .dshpreset 文件`,
				homepage: `https://dshdesktop.com/preset/zh/#${preset.id}`,
				configPath: `~/.dsh/.agent-presets/${preset.id}/`
			});
			result.push(resource);
		}
		ctx.logger?.info(`[Preset] dshdesktop.com 预设获取完成：共 ${result.length} 个预设`);
		if (result.length > 0) {
			const names = result.slice(0, 5).map((r) => r.name);
			ctx.logger?.info(`[Preset] 前5个: ${names.join(", ")}`);
		}
		return result;
	} catch (err) {
		ctx.logger?.warn("[Preset] dshdesktop.com 预设获取失败，降级为空列表", err);
		return result;
	}
}
//#endregion
//#region src/host/data-processor.ts
/**
* DSH 科技风工作台 - 数据处理与缓存调度模块
* 包含：双源去重、归一化清洗、本地状态联动、增量落库、定时任务、容错兜底、总调度
* 基于双源数据抓取全流程 阶段3-阶段8 1:1 实现
*/
/**
* 多源智能去重与优先级覆盖（四源版本）
*
* 优先级：本地已安装 > npm registry > dshdesktop > GitHub
*   - 本地已安装：最权威，保留安装状态
*   - npm registry：主要外部数据源，数据完整
*   - dshdesktop：社区预设，补充预设数据
*   - GitHub：补充数据源，可能不稳定
*
* @param localList 本地已安装插件列表
* @param npmList npm registry 搜索结果
* @param dshdesktopList dshdesktop.com 预设列表
* @param githubList GitHub 抓取结果
* @returns 去重合并后的资源列表
*/
function mergeMultiSource(localList, npmList, dshdesktopList, githubList) {
	const finalMap = /* @__PURE__ */ new Map();
	for (const item of localList) if (item?.id) finalMap.set(item.id, item);
	for (const item of npmList) {
		if (!item?.id) continue;
		const exist = finalMap.get(item.id);
		if (!exist) finalMap.set(item.id, item);
		else {
			if (compareVersion(item.latestVersion, exist.latestVersion) > 0) {
				exist.latestVersion = item.latestVersion;
				exist.updateAvailable = true;
			}
			exist.updateTime = Math.max(exist.updateTime, item.updateTime);
			continue;
		}
	}
	for (const item of dshdesktopList) {
		if (!item?.id) continue;
		const exist = finalMap.get(item.id);
		if (!exist) finalMap.set(item.id, item);
		else {
			if (item.star && item.star > (exist.star || 0)) exist.star = item.star;
			continue;
		}
	}
	for (const item of githubList) {
		if (!item?.id) continue;
		const exist = finalMap.get(item.id);
		if (!exist) finalMap.set(item.id, item);
		else {
			if (item.star && item.star > (exist.star || 0)) exist.star = item.star;
			if (item.fork && item.fork > (exist.fork || 0)) exist.fork = item.fork;
			continue;
		}
	}
	const finalList = Array.from(finalMap.values());
	for (const item of finalList) {
		if (!item?.id) continue;
		const meta = getResourceMeta(item.id);
		if (meta) {
			if (meta.description) item.description = meta.description;
			if (meta.category) item.category = meta.category;
			if (meta.homepage) item.homepage = meta.homepage;
		}
	}
	return finalList;
}
/**
* 全量数据归一化清洗
*
* 通用字段强制归一规则：
*   - 版本字段：统一转为 SemVer 标准格式，非法版本置为 0.0.0
*   - 时间字段：统一时间戳格式化
*   - 空描述兜底：无描述自动填充「社区开源资源，点击查看详情」
*   - 来源标记：严格区分 market / github
*
* @param list 合并后的混合资源池
* @returns 归一化后的资源列表
*/
function normalizeResourceList(list) {
	return list.map((item) => {
		const ver = normalizeVersion(item.latestVersion);
		const desc = item.description?.trim() || "社区开源资源，点击查看详情";
		const name = item.name?.trim() || item.id || "未命名资源";
		const updateTime = typeof item.updateTime === "number" && !isNaN(item.updateTime) ? item.updateTime : Date.now();
		return {
			...item,
			name,
			latestVersion: ver,
			description: desc,
			updateTime,
			star: typeof item.star === "number" ? item.star : 0,
			fork: typeof item.fork === "number" ? item.fork : 0,
			isInstalled: !!item.isInstalled,
			isEnabled: !!item.isEnabled,
			updateAvailable: !!item.updateAvailable,
			isOfficial: !!item.isOfficial
		};
	});
}
/**
* 本地环境状态联动匹配
*
* 抓取的云端数据与本地 DSH 运行环境双向联动：
*   - 插件管理：匹配本地已安装插件列表、启停状态、本地版本，生成更新提醒
*   - 预设管理：比对本地 Profile 预设文件，标记已导入/未导入
*   - 应用管理：关联本地工作流/Agent 应用运行状态
*
* @param ctx 工作台上下文
* @param list 归一化后的资源列表
* @returns 联动本地状态后的资源列表
*/
async function syncLocalEnvStatus(ctx, list) {
	let localPlugins = [];
	try {
		if (ctx.plugin?.getInstalledList) localPlugins = await ctx.plugin.getInstalledList();
	} catch (err) {
		ctx.logger?.warn("读取本地插件列表失败", err);
	}
	let localPresets = [];
	try {
		if (ctx.profileService?.getPresetList) localPresets = await ctx.profileService.getPresetList();
	} catch (err) {
		ctx.logger?.warn("读取本地预设列表失败", err);
	}
	let localApps = [];
	try {
		if (ctx.workflow?.getAppList) localApps = await ctx.workflow.getAppList();
	} catch (err) {
		ctx.logger?.warn("读取本地应用列表失败", err);
	}
	return list.map((item) => {
		const updated = { ...item };
		if (item.type === "plugin") {
			const local = localPlugins.find((p) => p.id === item.id || p.id === item.name);
			if (local) {
				updated.isInstalled = true;
				updated.isEnabled = local.enabled;
				updated.localVersion = local.version || "0.0.0";
				updated.updateAvailable = compareVersion(item.latestVersion, local.version || "0.0.0") > 0;
			}
		} else if (item.type === "preset") {
			if (localPresets.find((p) => p.id === item.id || p.name === item.name)) {
				updated.isInstalled = true;
				updated.isEnabled = true;
			}
		} else if (item.type === "app") {
			if (localApps.find((a) => a.id === item.id || a.name === item.name)) {
				updated.isInstalled = true;
				updated.isEnabled = true;
			}
		}
		return updated;
	});
}
/**
* 分层增量缓存落库
*
* 双层缓存存储机制：
*   - 内存缓存：页面常驻缓存，切换标签无刷新
*   - 文件持久化：归一化数据落地 $DSH_HOME/cache/workbench/
*
* 增量更新逻辑：
*   - 不做全量覆盖，仅比对云端更新时间、版本号
*   - 本地已安装资源自动比对云端版本，标记可更新状态
*
* @param ctx 工作台上下文
* @param list 最终资源列表
* @param cacheExpireSeconds 缓存过期时间（秒）
*/
async function saveCacheIncrement(ctx, list, cacheExpireSeconds = CACHE_EXPIRE_SECONDS) {
	const now = Date.now();
	const cacheData = {
		updateTime: now,
		expireTime: now + cacheExpireSeconds * 1e3,
		pluginList: list.filter((i) => i.type === "plugin"),
		presetList: list.filter((i) => i.type === "preset"),
		appList: list.filter((i) => i.type === "app"),
		skillList: list.filter((i) => i.type === "skill")
	};
	ctx.cache?.set("workbench_data", cacheData);
	await saveLocalCache(ctx, cacheData);
	ctx.logger?.info(`[Cache] 落库完成：插件 ${cacheData.pluginList.length} 个，预设 ${cacheData.presetList.length} 个，应用 ${cacheData.appList.length} 个，Skill ${cacheData.skillList.length} 个，过期时间 ${new Date(cacheData.expireTime).toISOString()}`);
}
/**
* 设置后台 24h 定时增量同步任务
*
* 定时任务：每24小时整点执行增量同步，后台静默运行
* 启动触发：服务启动只校验缓存时间戳，过期才增量更新
* 操作事件触发：用户安装/卸载/配置修改后，仅刷新本地状态字段
*
* @param ctx 工作台上下文
* @param config 插件配置
*/
function setupWorkbenchSchedule(ctx, config) {
	if (!ctx.schedule?.create) {
		ctx.logger?.warn("[Schedule] 当前环境不支持定时任务，跳过后台同步");
		return;
	}
	ctx.schedule.create("workbench-fetch", "0 0 * * *", async () => {
		ctx.logger?.info("[Schedule] 后台定时增量同步开始");
		try {
			await fetchDoubleSourceData(ctx, config, false);
		} catch (err) {
			ctx.logger?.warn("[Schedule] 后台定时同步失败", err);
		}
	});
	ctx.logger?.info("[Schedule] 后台24h定时同步任务已注册");
}
/**
* 双源抓取总入口
*
* 完整流程串联：
*   阶段0：初始化鉴权 + 缓存拦截
*   阶段1：主源同步抓取（Market 优先串行）
*   阶段2：副源异步抓取（GitHub 并行不阻塞）
*   阶段3：双源去重 & 优先级覆盖
*   阶段4：数据归一化清洗
*   阶段5：联动本地环境状态
*   阶段6：分层增量落库
*   阶段7：返回最终渲染数据
*
* @param ctx 工作台上下文
* @param config 插件配置
* @param forceRefresh 是否强制全量刷新（用户手动刷新）
* @returns 按类型分组的最终资源列表
*/
async function fetchDoubleSourceData(ctx, config, forceRefresh = false) {
	const startTime = Date.now();
	ctx.logger?.info(`[Fetch] 双源抓取开始，forceRefresh=${forceRefresh}`);
	const { marketToken, githubToken } = await initAuth(ctx, config);
	const cache = await getLocalCache(ctx);
	if (!forceRefresh && cache && Date.now() < cache.expireTime) {
		ctx.logger?.info(`[Fetch] 缓存未过期，直接复用（更新于 ${new Date(cache.updateTime).toISOString()}）`);
		return {
			...renderCacheData(cache),
			fromCache: true,
			updateTime: cache.updateTime
		};
	}
	const oldCache = cache;
	try {
		ctx.logger?.info("[Fetch] 阶段1a：本地已安装插件读取");
		const localResourceList = await fetchLocalInstalledPlugins(ctx);
		ctx.logger?.info("[Fetch] 阶段1b：npm registry 搜索");
		const npmResourceList = await fetchNpmPlugins(ctx);
		ctx.logger?.info("[Fetch] 阶段1c：dshdesktop.com 预设抓取");
		const dshdesktopPresetList = await fetchDshDesktopPresets(ctx);
		ctx.logger?.info("[Fetch] 阶段2：GitHub 副源抓取");
		const githubResourceList = await fetchGithubSource(ctx, githubToken, config.customRepos, config.customPresetRepos, config.customAppRepos);
		ctx.logger?.info("[Fetch] 阶段3：多源去重合并");
		const mergedList = mergeMultiSource(localResourceList, npmResourceList, dshdesktopPresetList, githubResourceList);
		ctx.logger?.info("[Fetch] 阶段4：数据归一化清洗");
		const standardList = normalizeResourceList(mergedList);
		ctx.logger?.info("[Fetch] 阶段5：本地环境状态联动");
		const finalList = await syncLocalEnvStatus(ctx, standardList);
		ctx.logger?.info("[Fetch] 阶段6：增量缓存落库");
		await saveCacheIncrement(ctx, finalList, config.cacheExpireSeconds);
		const duration = Date.now() - startTime;
		ctx.logger?.info(`[Fetch] 完成：共 ${finalList.length} 个资源，耗时 ${duration}ms`);
		return {
			plugins: finalList.filter((i) => i.type === "plugin"),
			presets: finalList.filter((i) => i.type === "preset"),
			apps: finalList.filter((i) => i.type === "app"),
			skills: finalList.filter((i) => i.type === "skill"),
			fromCache: false,
			updateTime: Date.now()
		};
	} catch (err) {
		ctx.logger?.warn("[Fetch] 双源抓取异常，降级为旧缓存", err);
		if (oldCache) return {
			...renderCacheData(oldCache),
			fromCache: true,
			updateTime: oldCache.updateTime
		};
		return {
			plugins: [],
			presets: [],
			apps: [],
			skills: [],
			fromCache: false,
			updateTime: Date.now()
		};
	}
}
//#endregion
//#region src/host/plugin-cli.ts
/**
* dsh-tech-workbench 插件生命周期管理 - CLI 命令包装器（方案A：命令转发）
*
* 设计原则（09-18 复盘定稿）：
* - 不自己写包管理：安装/卸载转发 `dsh plugin --profile <p> add/remove`
* - 启用/停用只写 cordis.patch.yml 的托管区块（managed block），
*   由 profile 的 patchReload:live（watchUserPatches）热生效
* - 只触碰托管区块内的行，用户在文件其余部分手写的补丁原样保留
* - 受保护插件（基座/工作台自身/认证/桥）拒绝停用与卸载
*
* v2.4 修复：
* - 旧版在 async 上下文误用 fs.promises.readFileSync/writeFileSync（必然 TypeError）
* - 路由 action/id 解析错误（/plugin/list、/plugin/install 曾被解析为未知操作）
*/
const DEFAULT_PROFILE = "web";
/**
* 受保护插件：卸载/停用会破坏 Harness 自身或本工作台，一律拒绝。
* （前缀匹配：@deepseek-ai/ 下的基座按精确 id 列出）
*/
const PROTECTED_PLUGIN_IDS = [
	"@deepseek-ai/dsh-base",
	"@deepseek-ai/dsh-web-app",
	"dsh-tech-workbench",
	"dsh-webui-auth",
	"@wenbin_wb/dsh-bridge"
];
function isProtectedPlugin(id) {
	return PROTECTED_PLUGIN_IDS.includes(id);
}
function profileDir(opts) {
	const home = opts.dshHome || process.env.DSH_HOME || path.join(process.env.HOME || "~", ".dsh");
	return path.join(home, "profiles", opts.profile || DEFAULT_PROFILE);
}
function packageJsonPath(opts) {
	return path.join(profileDir(opts), "package.json");
}
function patchFilePath(opts) {
	return path.join(profileDir(opts), "cordis.patch.yml");
}
/**
* 规范化来源：生成 dsh plugin add 可接受的格式
*   "https://github.com/o/r" → "github:o/r"
*   "github.com/o/r"         → "github:o/r"
*   "o/r"                    → "github:o/r"
*   "@scope/pkg[@ver]" / "pkg[@ver]" → 原样（npm）
*/
function normalizeSource(source) {
	const trimmed = (source || "").trim();
	if (!trimmed) throw new Error("来源不能为空");
	const httpsMatch = trimmed.match(/^https?:\/\/github\.com\/([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/);
	if (httpsMatch) return `github:${httpsMatch[1]}`;
	const githubMatch = trimmed.match(/^github\.com\/([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/);
	if (githubMatch) return `github:${githubMatch[1]}`;
	if (trimmed.includes("/") && !trimmed.startsWith("@") && !trimmed.startsWith("github:")) {
		const parts = trimmed.split("/");
		if (parts.length === 2 && parts[0].length > 0 && parts[1].length > 0) return `github:${trimmed}`;
	}
	return trimmed;
}
function runDshPlugin(args, opts, timeoutMs) {
	const bin = opts.dshBin || "dsh";
	const result = spawnSync(bin, args, {
		cwd: profileDir(opts),
		stdio: "pipe",
		encoding: "utf-8",
		timeout: timeoutMs
	});
	if (result.error) return {
		ok: false,
		data: null,
		error: `无法执行 ${bin}: ${result.error.message}`,
		exitCode: 127
	};
	return {
		ok: result.status === 0,
		data: {
			stdout: result.stdout || "",
			stderr: result.stderr || ""
		},
		error: result.status === 0 ? null : result.stderr || result.stdout || "命令失败",
		exitCode: result.status ?? 1
	};
}
/** 安装插件：dsh plugin --profile <p> add <source> */
function installPlugin(source, opts = {}) {
	let normalized;
	try {
		normalized = normalizeSource(source);
	} catch (err) {
		return {
			ok: false,
			data: null,
			error: err.message,
			exitCode: 400
		};
	}
	const run = runDshPlugin([
		"plugin",
		"--profile",
		opts.profile || DEFAULT_PROFILE,
		"add",
		normalized
	], opts, 18e4);
	if (run.ok) return {
		ok: true,
		data: {
			source: normalized,
			stdout: run.data?.stdout
		},
		error: null,
		exitCode: 0
	};
	return {
		ok: false,
		data: null,
		error: run.error,
		exitCode: run.exitCode
	};
}
/** 卸载插件：先摘除托管区块，再 dsh plugin remove */
function uninstallPlugin(id, opts = {}) {
	if (isProtectedPlugin(id)) return {
		ok: false,
		data: null,
		error: `插件 ${id} 受保护，拒绝卸载`,
		exitCode: 403
	};
	try {
		setPluginDisabled(id, false, opts);
	} catch {}
	const run = runDshPlugin([
		"plugin",
		"--profile",
		opts.profile || DEFAULT_PROFILE,
		"remove",
		id
	], opts, 12e4);
	if (run.ok) return {
		ok: true,
		data: { id },
		error: null,
		exitCode: 0
	};
	return {
		ok: false,
		data: null,
		error: run.error,
		exitCode: run.exitCode
	};
}
/** 更新/回退到指定版本：dsh plugin add <id>@<version>（npm 语义） */
function updatePlugin(id, opts = {}) {
	const target = opts.version ? `${id}@${opts.version}` : id;
	const run = runDshPlugin([
		"plugin",
		"--profile",
		opts.profile || DEFAULT_PROFILE,
		"add",
		target
	], opts, 18e4);
	if (run.ok) return {
		ok: true,
		data: {
			id,
			version: opts.version || "latest"
		},
		error: null,
		exitCode: 0
	};
	return {
		ok: false,
		data: null,
		error: run.error,
		exitCode: run.exitCode
	};
}
/** 回退插件到指定版本（必须显式给版本） */
function rollbackPlugin(id, version, opts = {}) {
	if (!version) return {
		ok: false,
		data: null,
		error: "回退必须指定目标版本",
		exitCode: 400
	};
	if (isProtectedPlugin(id)) return {
		ok: false,
		data: null,
		error: `插件 ${id} 受保护，拒绝回退`,
		exitCode: 403
	};
	return updatePlugin(id, {
		...opts,
		version
	});
}
/** 启用插件：托管区块中移除 disabled 标记 */
function enablePlugin(id, opts = {}) {
	try {
		setPluginDisabled(id, false, opts);
		return {
			ok: true,
			data: {
				id,
				enabled: true
			},
			error: null,
			exitCode: 0
		};
	} catch (err) {
		return {
			ok: false,
			data: null,
			error: err.message,
			exitCode: 1
		};
	}
}
/** 停用插件：托管区块写入 disabled: true */
function disablePlugin(id, opts = {}) {
	if (isProtectedPlugin(id)) return {
		ok: false,
		data: null,
		error: `插件 ${id} 受保护，拒绝停用`,
		exitCode: 403
	};
	try {
		setPluginDisabled(id, true, opts);
		return {
			ok: true,
			data: {
				id,
				enabled: false
			},
			error: null,
			exitCode: 0
		};
	} catch (err) {
		return {
			ok: false,
			data: null,
			error: err.message,
			exitCode: 1
		};
	}
}
/** 列出 profile 已安装插件（package.json deps + bundles + 托管区块停用态） */
async function listPlugins(opts = {}) {
	try {
		const pkgJson = JSON.parse(await promises.readFile(packageJsonPath(opts), "utf-8"));
		const deps = pkgJson.dependencies || {};
		const bundles = pkgJson.dsh?.profile?.bundles || [];
		const disabled = getDisabledSetSync(patchFilePath(opts));
		const inserted = getPatchEntryIdsSync(patchFilePath(opts));
		const NON_PLUGIN = /* @__PURE__ */ new Set(["react", "react-dom"]);
		const plugins = [];
		for (const [id, version] of Object.entries(deps)) {
			if (NON_PLUGIN.has(id)) continue;
			plugins.push({
				id,
				name: id,
				version,
				installType: bundles.includes(id) ? "bundle" : "insert",
				enabled: !disabled.has(id),
				updateAvailable: false,
				protected: isProtectedPlugin(id)
			});
		}
		for (const id of inserted) {
			if (NON_PLUGIN.has(id) || deps[id]) continue;
			plugins.push({
				id,
				name: id,
				version: "patch-insert",
				installType: "insert",
				enabled: !disabled.has(id),
				updateAvailable: false,
				protected: isProtectedPlugin(id)
			});
		}
		plugins.sort((a, b) => a.id.localeCompare(b.id));
		return {
			ok: true,
			data: plugins,
			error: null,
			exitCode: 0
		};
	} catch (err) {
		return {
			ok: false,
			data: null,
			error: err.message,
			exitCode: 1
		};
	}
}
/** 版本历史：本地可知的仅当前安装版本（远端历史由前端数据层提供） */
async function getVersions(id, opts = {}) {
	try {
		const current = JSON.parse(await promises.readFile(packageJsonPath(opts), "utf-8")).dependencies?.[id];
		if (!current) return {
			ok: false,
			data: null,
			error: `插件 ${id} 未安装`,
			exitCode: 404
		};
		return {
			ok: true,
			data: { versions: [{
				version: String(current).replace(/^file:.*$/, "local"),
				installedAt: "",
				backedUp: false,
				backupPath: null
			}] },
			error: null,
			exitCode: 0
		};
	} catch (err) {
		return {
			ok: false,
			data: null,
			error: err.message,
			exitCode: 1
		};
	}
}
const MANAGED_BEGIN = "# === dsh-tech-workbench managed block begin ===";
const MANAGED_END = "# === dsh-tech-workbench managed block end ===";
/** 解析托管区块内容 → Map<id, disabled> */
function parseManagedBlock(content) {
	const map = /* @__PURE__ */ new Map();
	const lines = content.split("\n");
	let inBlock = false;
	let currentId = null;
	for (const line of lines) {
		const t = line.trim();
		if (t === "# === dsh-tech-workbench managed block begin ===") {
			inBlock = true;
			continue;
		}
		if (t === "# === dsh-tech-workbench managed block end ===") {
			inBlock = false;
			currentId = null;
			continue;
		}
		if (!inBlock) continue;
		if (t.startsWith("- id:")) {
			currentId = t.slice(5).trim();
			if (currentId) map.set(currentId, false);
		} else if (t.startsWith("disabled:") && currentId) map.set(currentId, /true/.test(t));
	}
	return map;
}
/** 全文件扫描（只读）：某 id 是否在任意位置被 disabled: true */
function collectDisabledIds(content) {
	const disabled = /* @__PURE__ */ new Set();
	const lines = content.split("\n");
	let currentId = null;
	let sawDisabledTrue = false;
	for (const line of lines) {
		const t = line.trim();
		if (t.startsWith("- id:")) {
			if (currentId && sawDisabledTrue) disabled.add(currentId);
			currentId = t.slice(5).trim();
			sawDisabledTrue = false;
		} else if (currentId && t.startsWith("disabled:")) {
			if (/true/.test(t)) sawDisabledTrue = true;
		}
	}
	if (currentId && sawDisabledTrue) disabled.add(currentId);
	return disabled;
}
/** 全文件扫描（只读）：补丁中出现过的所有条目 id */
function collectPatchEntryIds(content) {
	const ids = [];
	for (const line of content.split("\n")) {
		const t = line.trim();
		if (t.startsWith("- id:")) {
			const id = t.slice(5).trim();
			if (id && !ids.includes(id)) ids.push(id);
		}
	}
	return ids;
}
function getDisabledSetSync(patchFile) {
	try {
		return collectDisabledIds(readFileSync(patchFile, "utf-8"));
	} catch {
		return /* @__PURE__ */ new Set();
	}
}
function getPatchEntryIdsSync(patchFile) {
	try {
		return collectPatchEntryIds(readFileSync(patchFile, "utf-8"));
	} catch {
		return [];
	}
}
/**
* 设置插件停用状态：只重写托管区块。
* - 文件不存在/为空 → 创建 `[]` 或托管区块
* - 根是 flow 列表 `[]` 且首次写托管条目 → 用托管区块替换该空行
* - 根是 flow 列表但有内容 → 拒绝（不敢自动改写用户 YAML）
*/
function setPluginDisabled(id, disabled, opts = {}) {
	const file = patchFilePath(opts);
	let content = "";
	try {
		content = readFileSync(file, "utf-8");
	} catch {
		content = "";
	}
	const managed = parseManagedBlock(content);
	const hadManaged = content.includes(MANAGED_BEGIN);
	if (disabled) managed.set(id, true);
	else managed.delete(id);
	const stripped = content.split("\n").filter((l) => !l.trim().startsWith("#")).join("\n");
	const hasFlowRoot = /^\s*\[.*\]\s*$/.test(stripped) && stripped.trim() !== "";
	const flowIsEmpty = /^\s*\[\s*\]\s*$/.test(stripped);
	if (hasFlowRoot && !flowIsEmpty && !hadManaged) throw new Error("cordis.patch.yml 使用了非空 flow 列表格式，无法安全追加托管区块，请改为块序列（- id: ...）后重试");
	const blockLines = [];
	const entries = [...managed.entries()].filter(([, d]) => d).sort(([a], [b]) => a.localeCompare(b));
	if (entries.length > 0) {
		blockLines.push(MANAGED_BEGIN, "# 此区块由 Meta管理 面板自动维护，请勿手动编辑", MANAGED_END);
		blockLines.splice(1, 0, ...entries.map(([pid]) => `- id: ${pid}\n  disabled: true`).flatMap((s) => s.split("\n")));
	}
	let baseLines;
	if (!content.trim() || flowIsEmpty) baseLines = blockLines.length > 0 ? [] : ["[]"];
	else {
		const out = [];
		let inBlock = false;
		for (const line of content.split("\n")) {
			const t = line.trim();
			if (t === "# === dsh-tech-workbench managed block begin ===") {
				inBlock = true;
				continue;
			}
			if (t === "# === dsh-tech-workbench managed block end ===") {
				inBlock = false;
				continue;
			}
			if (!inBlock) out.push(line);
		}
		while (out.length && out[out.length - 1].trim() === "") out.pop();
		baseLines = out;
	}
	const finalLines = [...baseLines];
	if (blockLines.length > 0) {
		if (finalLines.length > 0) finalLines.push("");
		finalLines.push(...blockLines);
	} else if (finalLines.length === 0) finalLines.push("[]");
	mkdirSync(path.dirname(file), { recursive: true });
	writeFileSync(file, finalLines.join("\n") + "\n", "utf-8");
}
//#endregion
//#region src/host/preset-cli.ts
/**
* dsh-tech-workbench 二期 - 预设（Agent Preset）维护
*
* 基于 host 的 `agentPresets` 名册服务（@deepseek-ai/dsh-agent-presets）：
* - list / read / copy / remove / standingKeyFor 全部走服务，不猜路径
* - 组合文本编辑（save）只允许 trust==='user' 的预设（system 随部署分发，禁写）
* - 预设 id 必须匹配 PRESET_ID（目录名片段，防路径逃逸）
*
* 护栏规则与 editing-cordis-compositions 纪律一致：
* 绝不写随部署分发的 agent-presets 目录；用户自建的预设可建/改/删。
*/
/** 预设目录名合法格式（与 dsh-agent-presets PRESET_ID 一致） */
const PRESET_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
function ok$1(data) {
	return {
		ok: true,
		data,
		error: null,
		exitCode: 0
	};
}
function fail$1(error, exitCode = 1) {
	return {
		ok: false,
		data: null,
		error,
		exitCode
	};
}
/** 列出本机全部预设（system + user） */
async function listPresets(roster) {
	if (!roster) return fail$1("agentPresets 服务不可用（当前 profile 未装配预设名册）");
	try {
		return ok$1((await roster.list()).map((p) => ({ ...p })));
	} catch (err) {
		return fail$1(err?.message || "读取预设名册失败");
	}
}
/** 读取预设的组合文本（agent.cordis.yml 原文） */
async function readPresetComposition(roster, id) {
	if (!roster) return fail$1("agentPresets 服务不可用");
	if (!PRESET_ID_PATTERN.test(id)) return fail$1(`预设 id 非法: ${id}`, 400);
	try {
		const preset = await roster.resolve(id);
		const content = await roster.read(id);
		return ok$1({
			id: preset.id,
			trust: preset.trust,
			content
		});
	} catch (err) {
		return fail$1(err?.message || `读取预设 ${id} 失败`, 404);
	}
}
/**
* 编辑用户预设的组合文本。
* 双重护栏：id 合法 + resolve 后 trust 必须为 'user'；system 一律 403。
*/
async function savePresetComposition(roster, id, content) {
	if (!roster) return fail$1("agentPresets 服务不可用");
	if (!PRESET_ID_PATTERN.test(id)) return fail$1(`预设 id 非法: ${id}`, 400);
	if (typeof content !== "string" || content.length === 0) return fail$1("内容不能为空", 400);
	if (content.length > 262144) return fail$1("内容超过 256KB 上限", 400);
	try {
		const preset = await roster.resolve(id);
		if (preset.trust !== "user") return fail$1(`预设 ${id} 随部署分发（trust=system），拒绝写入；如需修改请用「复制为新预设」`, 403);
		await promises.writeFile(preset.path, content, "utf-8");
		return ok$1({ id });
	} catch (err) {
		return fail$1(err?.message || `保存预设 ${id} 失败`);
	}
}
/** 从现有预设复制出用户新预设 */
async function copyPreset(roster, from, id, name) {
	if (!roster) return fail$1("agentPresets 服务不可用");
	if (!PRESET_ID_PATTERN.test(from)) return fail$1(`来源预设 id 非法: ${from}`, 400);
	if (!PRESET_ID_PATTERN.test(id)) return fail$1(`新预设 id 非法（需匹配 ${PRESET_ID_PATTERN}）: ${id}`, 400);
	try {
		await roster.copy(from, id, name || void 0);
		return ok$1({ id });
	} catch (err) {
		return fail$1(err?.message || `复制预设 ${from} → ${id} 失败`);
	}
}
/** 删除用户预设（system 由名册自身拒绝，这里再挡一层） */
async function deletePreset(roster, id) {
	if (!roster) return fail$1("agentPresets 服务不可用");
	if (!PRESET_ID_PATTERN.test(id)) return fail$1(`预设 id 非法: ${id}`, 400);
	try {
		if ((await roster.resolve(id)).trust !== "user") return fail$1(`预设 ${id} 随部署分发，拒绝删除`, 403);
		await roster.remove(id);
		return ok$1({ id });
	} catch (err) {
		return fail$1(err?.message || `删除预设 ${id} 失败`);
	}
}
/**
* 挂载校验：真正组合该预设的插件子树（standingKeyFor）。
* 成功 = 组合可挂载；失败返回具体原因（缺包/非法 config/未激活行/服务越权发布）。
*/
async function validatePreset(roster, id) {
	if (!roster) return fail$1("agentPresets 服务不可用");
	if (!PRESET_ID_PATTERN.test(id)) return fail$1(`预设 id 非法: ${id}`, 400);
	try {
		await roster.standingKeyFor(id);
		return ok$1({
			id,
			mounted: true
		});
	} catch (err) {
		return fail$1(err?.message || `预设 ${id} 挂载校验失败`);
	}
}
//#endregion
//#region src/host/skill-cli.ts
/**
* dsh-tech-workbench 二期 - 技能（Skill）维护
*
* 技能发现由 @deepseek-ai/dsh-skill-filesystem 提供者扫描多个根目录
* （project / custom / user / bundled），并带 catalog 监听热更新。
* 本模块只维护 **用户技能根**（默认 `<DSH_HOME>/skills`）：
* - 目录型技能：<root>/<name>/SKILL.md（frontmatter + 正文，可带子资源）
* - 扁平技能：<root>/<name>.md
*
* 所有 name 都做净化与路径收敛校验（拒绝 .. / 绝对路径 / 分隔符），
* 读写删除一律限定在用户根内，bundled/system 技能只读。
*/
function ok(data) {
	return {
		ok: true,
		data,
		error: null,
		exitCode: 0
	};
}
function fail(error, exitCode = 1) {
	return {
		ok: false,
		data: null,
		error,
		exitCode
	};
}
function userSkillsRoot(opts = {}) {
	if (opts.skillsDir) return path$1.resolve(opts.skillsDir);
	const home = opts.dshHome || process.env.DSH_HOME || path$1.join(process.env.HOME || "~", ".dsh");
	return path$1.join(home, "skills");
}
/** 技能名净化：只允许字母/数字/连字符/下划线/点/中文，拒绝任何路径分隔 */
function sanitizeSkillName(name) {
	const trimmed = (name || "").trim();
	if (!trimmed) return null;
	if (trimmed === "." || trimmed === "..") return null;
	if (!/^[A-Za-z0-9._\u4e00-\u9fa5-]+$/.test(trimmed)) return null;
	if (trimmed.includes("/") || trimmed.includes("\\")) return null;
	return trimmed;
}
/** 把 name 解析到用户根内的条目目录/文件，越界返回 null */
function resolveInRoot(root, name) {
	const safe = sanitizeSkillName(name);
	if (!safe) return null;
	const target = path$1.resolve(root, safe);
	const rel = path$1.relative(path$1.resolve(root), target);
	if (!rel || rel.startsWith("..") || path$1.isAbsolute(rel)) return null;
	return target;
}
/** 解析 SKILL.md 的 YAML frontmatter（只取 name/description 标量） */
function parseFrontmatter(content) {
	const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!m) return {};
	const out = {};
	for (const line of m[1].split(/\r?\n/)) {
		const kv = line.match(/^(name|description)\s*:\s*(.*)$/);
		if (!kv) continue;
		let v = kv[2].trim();
		if (v.startsWith("\"") && v.endsWith("\"") || v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1);
		out[kv[1]] = v;
	}
	return out;
}
/** 新技能模板 */
function skillTemplate(name, description) {
	return [
		"---",
		`name: ${name}`,
		`description: ${description || `${name} 技能：在此描述触发场景与能力`}`,
		"---",
		"",
		`# ${name}`,
		"",
		"## 使用说明",
		"",
		"- TODO: 这个技能做什么、何时触发",
		"- TODO: 步骤 / 脚本 / 资源引用",
		""
	].join("\n");
}
/** 列出用户技能根下所有技能 */
async function listSkills(opts = {}) {
	const root = userSkillsRoot(opts);
	try {
		await promises.mkdir(root, { recursive: true });
		const dirents = await promises.readdir(root, { withFileTypes: true });
		const entries = [];
		for (const d of dirents) {
			if (d.name.startsWith(".") || d.name.startsWith("_")) continue;
			try {
				if (d.isDirectory()) {
					const entryPath = path$1.join(root, d.name, "SKILL.md");
					let st;
					try {
						st = await promises.stat(entryPath);
					} catch {
						continue;
					}
					const fm = parseFrontmatter(await promises.readFile(entryPath, "utf-8"));
					const sub = await promises.readdir(path$1.join(root, d.name));
					entries.push({
						name: d.name,
						displayName: fm.name || d.name,
						description: fm.description || "",
						layout: "dir",
						entryPath,
						editable: true,
						sizeBytes: st.size,
						mtimeMs: st.mtimeMs,
						resourceCount: sub.filter((s) => s !== "SKILL.md").length
					});
				} else if (d.isFile() && d.name.endsWith(".md")) {
					const entryPath = path$1.join(root, d.name);
					const st = await promises.stat(entryPath);
					const fm = parseFrontmatter(await promises.readFile(entryPath, "utf-8"));
					const nm = d.name.replace(/\.md$/, "");
					entries.push({
						name: nm,
						displayName: fm.name || nm,
						description: fm.description || "",
						layout: "flat",
						entryPath,
						editable: true,
						sizeBytes: st.size,
						mtimeMs: st.mtimeMs,
						resourceCount: 0
					});
				}
			} catch {}
		}
		entries.sort((a, b) => a.name.localeCompare(b.name));
		return ok(entries);
	} catch (err) {
		return fail(err?.message || `读取技能目录失败: ${root}`);
	}
}
/** 读取技能入口文件内容 */
async function readSkill(name, opts = {}) {
	const target = resolveInRoot(userSkillsRoot(opts), name);
	if (!target) return fail(`技能名非法: ${name}`, 400);
	try {
		let entryPath = path$1.join(target, "SKILL.md");
		try {
			await promises.stat(entryPath);
		} catch {
			entryPath = `${target}.md`;
		}
		return ok({
			name,
			content: await promises.readFile(entryPath, "utf-8")
		});
	} catch (err) {
		return fail(err?.message || `读取技能 ${name} 失败`, 404);
	}
}
/** 新建技能（目录型 SKILL.md 模板） */
async function createSkill(name, description, opts = {}) {
	const target = resolveInRoot(userSkillsRoot(opts), name);
	if (!target) return fail(`技能名非法（允许字母/数字/-_./中文，禁止路径分隔）: ${name}`, 400);
	try {
		const exists = await promises.stat(target).then(() => true, () => false);
		const existsFlat = await promises.stat(`${target}.md`).then(() => true, () => false);
		if (exists || existsFlat) return fail(`技能 ${name} 已存在`, 409);
		await promises.mkdir(target, { recursive: true });
		await promises.writeFile(path$1.join(target, "SKILL.md"), skillTemplate(path$1.basename(target), description), "utf-8");
		return ok({ name });
	} catch (err) {
		return fail(err?.message || `创建技能 ${name} 失败`);
	}
}
/** 保存技能入口文件内容 */
async function saveSkill(name, content, opts = {}) {
	const target = resolveInRoot(userSkillsRoot(opts), name);
	if (!target) return fail(`技能名非法: ${name}`, 400);
	if (typeof content !== "string") return fail("内容不能为空", 400);
	if (content.length > 524288) return fail("内容超过 512KB 上限", 400);
	try {
		let entryPath = path$1.join(target, "SKILL.md");
		let isDir = true;
		try {
			await promises.stat(entryPath);
		} catch {
			entryPath = `${target}.md`;
			isDir = false;
			if (!await promises.stat(entryPath).then(() => true, () => false)) return fail(`技能 ${name} 不存在`, 404);
		}
		if (isDir) await promises.mkdir(path$1.dirname(entryPath), { recursive: true });
		await promises.writeFile(entryPath, content, "utf-8");
		return ok({ name });
	} catch (err) {
		return fail(err?.message || `保存技能 ${name} 失败`);
	}
}
/** 删除技能（目录整体删除，仅限用户根内） */
async function deleteSkill(name, opts = {}) {
	const target = resolveInRoot(userSkillsRoot(opts), name);
	if (!target) return fail(`技能名非法: ${name}`, 400);
	try {
		if (await promises.stat(target).then(() => "dir", () => null) === "dir") await promises.rm(target, {
			recursive: true,
			force: true
		});
		else {
			const flat = `${target}.md`;
			await promises.stat(flat);
			await promises.rm(flat, { force: true });
		}
		return ok({ name });
	} catch (err) {
		if (err?.code === "ENOENT") return fail(`技能 ${name} 不存在`, 404);
		return fail(err?.message || `删除技能 ${name} 失败`);
	}
}
//#endregion
//#region src/index.ts
const PLUGIN_ID = "dsh-tech-workbench";
const VERSION = "2.4.0";
const name = "dsh-tech-workbench";
/**
* 内存中的最新数据（避免每次请求都读文件）
*/
let memoryData = null;
let isFetching = false;
let fetchPromise = null;
/**
* 解析插件配置，填充默认值
*/
function resolveConfig(config) {
	return {
		githubToken: config.githubToken || "",
		customRepos: Array.isArray(config.customRepos) ? config.customRepos : [],
		customPresetRepos: Array.isArray(config.customPresetRepos) ? config.customPresetRepos : [],
		customAppRepos: Array.isArray(config.customAppRepos) ? config.customAppRepos : [],
		cacheExpireSeconds: config.cacheExpireSeconds ?? 86400,
		profile: config.profile || "web",
		dshHome: config.dshHome || process.env.DSH_HOME || path$1.join(__require("os").homedir(), ".dsh"),
		dshBin: config.dshBin || "dsh"
	};
}
/**
* 安全获取 ctx 上的可选服务（rejectGuard 可能抛错，用 try-catch 降级）
*/
function safeGetService(ctx, key) {
	try {
		return ctx[key];
	} catch {
		return;
	}
}
/**
* 安全获取 logger：优先 ctx.logger，降级到 console
*/
function getLogger(ctx) {
	const ctxLogger = safeGetService(ctx, "logger");
	if (ctxLogger && typeof ctxLogger.info === "function") return ctxLogger;
	return {
		info: (...args) => console.log(`[${PLUGIN_ID}]`, ...args),
		warn: (...args) => console.warn(`[${PLUGIN_ID}]`, ...args),
		error: (...args) => console.error(`[${PLUGIN_ID}]`, ...args)
	};
}
/**
* 基于 Node.js 原生 fs/promises 构建 WorkbenchContext.fs
*/
function buildNativeFs() {
	return {
		exists: async (p) => {
			try {
				await fs.promises.access(p);
				return true;
			} catch {
				return false;
			}
		},
		readFile: async (p, encoding = "utf-8") => {
			return fs.promises.readFile(p, encoding);
		},
		writeFile: async (p, data) => {
			await fs.promises.mkdir(path$1.dirname(p), { recursive: true });
			await fs.promises.writeFile(p, data, "utf-8");
		},
		mkdir: async (p, options) => {
			await fs.promises.mkdir(p, options || { recursive: true });
		}
	};
}
/**
* 基于 Node.js 原生 fetch 构建 WorkbenchContext.http
*/
function buildNativeHttp() {
	return {
		request: async (options) => {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), options.timeout || 15e3);
			try {
				const res = await fetch(options.url, {
					method: options.method || "GET",
					headers: options.headers || {},
					body: options.data ? JSON.stringify(options.data) : void 0,
					signal: controller.signal
				});
				clearTimeout(timeout);
				const text = await res.text();
				let data;
				try {
					data = JSON.parse(text);
				} catch {
					data = text;
				}
				return {
					data,
					status: res.status
				};
			} catch (err) {
				clearTimeout(timeout);
				return {
					data: null,
					status: 0
				};
			}
		},
		get: async (url, options) => {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), options?.timeout || 15e3);
			try {
				const res = await fetch(url, {
					headers: options?.headers || {},
					signal: controller.signal
				});
				clearTimeout(timeout);
				const text = await res.text();
				let data;
				try {
					data = JSON.parse(text);
				} catch {
					data = text;
				}
				return {
					data,
					status: res.status
				};
			} catch (err) {
				clearTimeout(timeout);
				return {
					data: null,
					status: 0
				};
			}
		}
	};
}
/**
* 构建工作台上下文（全部基于 Node.js 原生 API，不依赖 DSH 服务）
*/
function buildWorkbenchContext(ctx) {
	return {
		env: {
			DSH_HOME: process.env.DSH_HOME || path$1.join(__require("os").homedir(), ".dsh"),
			VERSION: process.env.DSH_VERSION || ""
		},
		fs: buildNativeFs(),
		http: buildNativeHttp(),
		config: { get: async (_key) => ({}) },
		profile: safeGetService(ctx, "profile"),
		logger: getLogger(ctx),
		cache: safeGetService(ctx, "cache"),
		utils: safeGetService(ctx, "utils"),
		dialog: safeGetService(ctx, "dialog"),
		schedule: safeGetService(ctx, "schedule"),
		plugin: safeGetService(ctx, "plugin"),
		profileService: safeGetService(ctx, "profileService"),
		workflow: safeGetService(ctx, "workflow"),
		market: safeGetService(ctx, "market")
	};
}
/**
* 触发数据抓取（带防抖，避免并发重复请求）
*/
async function triggerFetch(wbCtx, config, force) {
	if (isFetching && fetchPromise) return fetchPromise;
	isFetching = true;
	fetchPromise = fetchDoubleSourceData(wbCtx, config, force).then((result) => {
		memoryData = result;
		return result;
	}).finally(() => {
		isFetching = false;
		fetchPromise = null;
	});
	return fetchPromise;
}
/**
* 发送 JSON 响应
*/
function sendJson(res, statusCode, data) {
	res.writeHead(statusCode, {
		"Content-Type": "application/json; charset=utf-8",
		"Cache-Control": "no-store"
	});
	res.end(JSON.stringify(data));
}
/**
* 解析请求体（JSON）
*/
function parseBody(req) {
	return new Promise((resolve) => {
		let body = "";
		req.on("data", (chunk) => {
			body += chunk.toString();
		});
		req.on("end", () => {
			try {
				resolve(body ? JSON.parse(body) : {});
			} catch {
				resolve({});
			}
		});
		req.on("error", () => resolve({}));
	});
}
function decodeSegment(s) {
	try {
		return decodeURIComponent(s);
	} catch {
		return s;
	}
}
async function handleAdminRoute(pathname, method, req, res, deps) {
	if (!pathname.startsWith("/workbench/api/")) return false;
	const parts = pathname.split("/").filter(Boolean);
	if (parts.length < 3) return false;
	const kind = parts[2];
	if (kind !== "plugin" && kind !== "preset" && kind !== "skill") return false;
	const started = Date.now();
	let body = {};
	if (method === "POST" || method === "PUT" || method === "DELETE") body = await parseBody(req);
	const rest = parts.slice(3);
	const action = rest[0];
	const target = rest.length > 1 ? decodeSegment(rest.slice(1).join("/")) : "";
	const send = (result, statusHint = 200) => {
		sendJson(res, result.ok ? 200 : result.exitCode === 403 ? 403 : result.exitCode === 404 ? 404 : result.exitCode === 400 ? 400 : statusHint, {
			ok: result.ok,
			data: result.data,
			errorCode: result.ok ? null : "OPERATION_FAILED",
			errorMessage: result.error,
			durationMs: Date.now() - started
		});
	};
	try {
		if (kind === "plugin") switch (action) {
			case "list": return send(await listPlugins(deps.cliOpts), 200), true;
			case "install": return send(installPlugin(body?.source || target, deps.cliOpts), 200), true;
			case "uninstall": return send(uninstallPlugin(target, deps.cliOpts), 200), true;
			case "enable": return send(enablePlugin(target, deps.cliOpts), 200), true;
			case "disable": return send(disablePlugin(target, deps.cliOpts), 200), true;
			case "update": return send(updatePlugin(target, {
				...deps.cliOpts,
				version: body?.version
			}), 200), true;
			case "rollback": return send(rollbackPlugin(target, body?.version || "", deps.cliOpts), 200), true;
			case "versions": return send(await getVersions(target, deps.cliOpts), 200), true;
			default:
				sendJson(res, 400, {
					ok: false,
					data: null,
					errorCode: "UNKNOWN_ACTION",
					errorMessage: `未知插件操作: ${action}`,
					durationMs: Date.now() - started
				});
				return true;
		}
		if (kind === "preset") {
			const roster = deps.getRoster();
			switch (action) {
				case "list": return send(await listPresets(roster), 200), true;
				case "composition": return send(await readPresetComposition(roster, target), 200), true;
				case "copy": return send(await copyPreset(roster, body?.from, body?.id, body?.name), 200), true;
				case "save": return send(await savePresetComposition(roster, body?.id, body?.content), 200), true;
				case "validate": return send(await validatePreset(roster, body?.id || target), 200), true;
				case "delete": return send(await deletePreset(roster, body?.id || target), 200), true;
				default:
					sendJson(res, 400, {
						ok: false,
						data: null,
						errorCode: "UNKNOWN_ACTION",
						errorMessage: `未知预设操作: ${action}`,
						durationMs: Date.now() - started
					});
					return true;
			}
		}
		if (kind === "skill") {
			const skillOpts = { dshHome: deps.cliOpts.dshHome };
			switch (action) {
				case "list": return send(await listSkills(skillOpts), 200), true;
				case "content": return send(await readSkill(target, skillOpts), 200), true;
				case "create": return send(await createSkill(body?.name, body?.description || "", skillOpts), 200), true;
				case "save": return send(await saveSkill(body?.name, body?.content, skillOpts), 200), true;
				case "delete": return send(await deleteSkill(body?.name, skillOpts), 200), true;
				default:
					sendJson(res, 400, {
						ok: false,
						data: null,
						errorCode: "UNKNOWN_ACTION",
						errorMessage: `未知技能操作: ${action}`,
						durationMs: Date.now() - started
					});
					return true;
			}
		}
	} catch (err) {
		deps.logger?.error?.(`维护路由异常 ${method} ${pathname}`, err);
		sendJson(res, 500, {
			ok: false,
			data: null,
			errorCode: "INTERNAL",
			errorMessage: err?.message || "Internal Server Error",
			durationMs: Date.now() - started
		});
		return true;
	}
	return false;
}
/**
* 插件主入口
* @param ctx Cordis 上下文
* @param config 插件配置（来自 cordis.patch.yml 的 config 字段）
*/
function apply(ctx, config = {}) {
	const resolvedConfig = resolveConfig(config);
	const wbCtx = buildWorkbenchContext(ctx);
	const logger = wbCtx.logger ?? console;
	const adminDeps = {
		cliOpts: {
			profile: resolvedConfig.profile,
			dshHome: resolvedConfig.dshHome,
			dshBin: resolvedConfig.dshBin
		},
		getRoster: () => {
			try {
				return ctx.get?.("agentPresets");
			} catch {
				return;
			}
		},
		logger
	};
	logger.info(`正在挂载 v${VERSION}...`);
	logger.info(`配置：githubToken=${resolvedConfig.githubToken ? "已配置" : "未配置"}, customRepos=${resolvedConfig.customRepos.length}个, customPresetRepos=${resolvedConfig.customPresetRepos.length}个, customAppRepos=${resolvedConfig.customAppRepos.length}个`);
	try {
		ctx.inject(["webServer"], (wctx) => {
			wctx.effect(() => {
				const handler = async (req, res) => {
					const url = new URL(req.url, "http://localhost");
					const pathname = url.pathname;
					try {
						if (pathname === "/workbench/api/data" && req.method === "GET") {
							const force = url.searchParams.get("force") === "true";
							const noCache = url.searchParams.get("nocache") === "true";
							if (!force && !noCache && memoryData) {
								sendJson(res, 200, {
									ok: true,
									data: memoryData,
									fromMemory: true
								});
								return;
							}
							sendJson(res, 200, {
								ok: true,
								data: await triggerFetch(wbCtx, resolvedConfig, force),
								fromMemory: false
							});
							return;
						}
						if (pathname === "/workbench/api/refresh" && req.method === "POST") {
							sendJson(res, 200, {
								ok: true,
								message: "数据已刷新",
								data: await triggerFetch(wbCtx, resolvedConfig, true)
							});
							return;
						}
						if (pathname === "/workbench/api/config" && req.method === "GET") {
							sendJson(res, 200, {
								ok: true,
								config: {
									cacheExpireSeconds: resolvedConfig.cacheExpireSeconds,
									githubTokenConfigured: !!resolvedConfig.githubToken,
									customReposCount: resolvedConfig.customRepos.length,
									customPresetReposCount: resolvedConfig.customPresetRepos.length,
									customAppReposCount: resolvedConfig.customAppRepos.length
								},
								version: VERSION
							});
							return;
						}
						if (pathname === "/workbench/api/status" && req.method === "GET") {
							const cache = await getLocalCache(wbCtx);
							sendJson(res, 200, {
								ok: true,
								plugin: PLUGIN_ID,
								version: VERSION,
								status: "running",
								memoryCache: memoryData ? {
									plugins: memoryData.plugins.length,
									presets: memoryData.presets.length,
									apps: memoryData.apps.length,
									updateTime: memoryData.updateTime,
									fromCache: memoryData.fromCache
								} : null,
								fileCache: cache ? {
									updateTime: cache.updateTime,
									expireTime: cache.expireTime,
									expired: Date.now() > cache.expireTime,
									plugins: cache.pluginList.length,
									presets: cache.presetList.length,
									apps: cache.appList.length
								} : null,
								isFetching
							});
							return;
						}
						if (pathname === "/workbench/api/cache" && req.method === "GET") {
							const cache = await getLocalCache(wbCtx);
							if (cache) sendJson(res, 200, {
								ok: true,
								cache: renderCacheData(cache),
								meta: {
									updateTime: cache.updateTime,
									expireTime: cache.expireTime
								}
							});
							else sendJson(res, 200, {
								ok: true,
								cache: null,
								message: "无缓存数据"
							});
							return;
						}
						if (pathname === "/workbench/api/cache/clear" && req.method === "POST") {
							memoryData = null;
							try {
								const cachePath = path$1.join(wbCtx.env.DSH_HOME, "cache", "workbench", "index.json");
								await wbCtx.fs.writeFile(cachePath, JSON.stringify({
									updateTime: 0,
									expireTime: 0,
									pluginList: [],
									presetList: [],
									appList: []
								}));
							} catch (err) {}
							sendJson(res, 200, {
								ok: true,
								message: "缓存已清空"
							});
							return;
						}
						if (pathname === "/workbench" || pathname === "/workbench/") {
							sendJson(res, 200, {
								ok: true,
								plugin: PLUGIN_ID,
								version: VERSION,
								description: "DSH 插件/预设/应用统一工作台，侧边栏重构，双源数据抓取（Market+GitHub）",
								endpoints: [
									"GET  /workbench/api/data",
									"POST /workbench/api/refresh",
									"GET  /workbench/api/config",
									"GET  /workbench/api/status",
									"GET  /workbench/api/cache",
									"POST /workbench/api/cache/clear",
									"GET  /workbench/api/plugin/list | POST install|uninstall/:id|enable/:id|disable/:id|update/:id|rollback/:id | GET versions/:id",
									"GET  /workbench/api/preset/list | GET composition/:id | POST copy|save|validate|delete",
									"GET  /workbench/api/skill/list | GET content/:name | POST create|save|delete"
								]
							});
							return;
						}
						if (await handleAdminRoute(pathname, req.method || "GET", req, res, adminDeps)) return;
						sendJson(res, 404, {
							ok: false,
							error: "Not Found",
							path: pathname
						});
					} catch (err) {
						logger.error(`HTTP 接口异常: ${pathname}`, err);
						sendJson(res, 500, {
							ok: false,
							error: err?.message || "Internal Server Error"
						});
					}
				};
				wctx.webServer.register({
					kind: "prefix",
					path: "/workbench",
					handler
				});
				logger.info("HTTP 接口已注册: /workbench/api/*");
			});
		});
	} catch (err) {
		logger.warn("webServer 注入失败（非致命，HTTP 接口不可用）:", err);
	}
	setTimeout(async () => {
		try {
			logger.info("后台初始化数据抓取...");
			await triggerFetch(wbCtx, resolvedConfig, false);
			logger.info("数据初始化完成");
		} catch (err) {
			logger.warn("数据初始化失败，将在首次访问时重试", err);
		}
	}, 2e3);
	try {
		setupWorkbenchSchedule(wbCtx, resolvedConfig);
	} catch (err) {
		logger.warn("定时任务注册失败（非致命）:", err);
	}
	logger.info(`挂载完成 v${VERSION}`);
}
//#endregion
export { PLUGIN_ID, VERSION, apply, apply as default, name };
