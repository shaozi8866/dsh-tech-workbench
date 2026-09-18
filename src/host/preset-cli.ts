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

import { promises as fsp } from 'node:fs';
import type { CliResult } from './plugin-cli';

/** 名册返回的预设形状（dsh-agent-presets AgentPreset 的结构化子集） */
export interface AgentPresetView {
  id: string;
  trust: 'system' | 'user';
  path: string;
  name?: string;
  description?: string;
  order?: number;
  broken?: string;
}

/** agentPresets 服务的方法子集（运行时来自 ctx 注入，不 import dsh 包） */
export interface AgentPresetsService {
  list(): Promise<AgentPresetView[]>;
  read(id: string): Promise<string>;
  copy(from: string, id: string, name?: string): Promise<void>;
  remove(id: string): Promise<void>;
  standingKeyFor(id?: string): Promise<unknown>;
  resolve(id?: string): Promise<AgentPresetView>;
}

/** 预设目录名合法格式（与 dsh-agent-presets PRESET_ID 一致） */
export const PRESET_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

function ok<T>(data: T): CliResult<T> {
  return { ok: true, data, error: null, exitCode: 0 };
}
function fail(error: string, exitCode = 1): CliResult {
  return { ok: false, data: null, error, exitCode };
}

/** 列出本机全部预设（system + user） */
export async function listPresets(roster: AgentPresetsService | undefined): Promise<CliResult<AgentPresetView[]>> {
  if (!roster) return fail('agentPresets 服务不可用（当前 profile 未装配预设名册）');
  try {
    const list = await roster.list();
    return ok(list.map((p) => ({ ...p })));
  } catch (err: any) {
    return fail(err?.message || '读取预设名册失败');
  }
}

/** 读取预设的组合文本（agent.cordis.yml 原文） */
export async function readPresetComposition(
  roster: AgentPresetsService | undefined,
  id: string,
): Promise<CliResult<{ id: string; trust: string; content: string }>> {
  if (!roster) return fail('agentPresets 服务不可用');
  if (!PRESET_ID_PATTERN.test(id)) return fail(`预设 id 非法: ${id}`, 400);
  try {
    const preset = await roster.resolve(id);
    const content = await roster.read(id);
    return ok({ id: preset.id, trust: preset.trust, content });
  } catch (err: any) {
    return fail(err?.message || `读取预设 ${id} 失败`, 404);
  }
}

/**
 * 编辑用户预设的组合文本。
 * 双重护栏：id 合法 + resolve 后 trust 必须为 'user'；system 一律 403。
 */
export async function savePresetComposition(
  roster: AgentPresetsService | undefined,
  id: string,
  content: string,
): Promise<CliResult<{ id: string }>> {
  if (!roster) return fail('agentPresets 服务不可用');
  if (!PRESET_ID_PATTERN.test(id)) return fail(`预设 id 非法: ${id}`, 400);
  if (typeof content !== 'string' || content.length === 0) return fail('内容不能为空', 400);
  if (content.length > 256 * 1024) return fail('内容超过 256KB 上限', 400);
  try {
    const preset = await roster.resolve(id);
    if (preset.trust !== 'user') {
      return fail(`预设 ${id} 随部署分发（trust=system），拒绝写入；如需修改请用「复制为新预设」`, 403);
    }
    // 只写名册登记过的组合文件路径本身（resolve 给出的 path 由名册解析，无逃逸面）
    await fsp.writeFile(preset.path, content, 'utf-8');
    return ok({ id });
  } catch (err: any) {
    return fail(err?.message || `保存预设 ${id} 失败`);
  }
}

/** 从现有预设复制出用户新预设 */
export async function copyPreset(
  roster: AgentPresetsService | undefined,
  from: string,
  id: string,
  name?: string,
): Promise<CliResult<{ id: string }>> {
  if (!roster) return fail('agentPresets 服务不可用');
  if (!PRESET_ID_PATTERN.test(from)) return fail(`来源预设 id 非法: ${from}`, 400);
  if (!PRESET_ID_PATTERN.test(id)) return fail(`新预设 id 非法（需匹配 ${PRESET_ID_PATTERN}）: ${id}`, 400);
  try {
    await roster.copy(from, id, name || undefined);
    return ok({ id });
  } catch (err: any) {
    return fail(err?.message || `复制预设 ${from} → ${id} 失败`);
  }
}

/** 删除用户预设（system 由名册自身拒绝，这里再挡一层） */
export async function deletePreset(
  roster: AgentPresetsService | undefined,
  id: string,
): Promise<CliResult<{ id: string }>> {
  if (!roster) return fail('agentPresets 服务不可用');
  if (!PRESET_ID_PATTERN.test(id)) return fail(`预设 id 非法: ${id}`, 400);
  try {
    const preset = await roster.resolve(id);
    if (preset.trust !== 'user') return fail(`预设 ${id} 随部署分发，拒绝删除`, 403);
    await roster.remove(id);
    return ok({ id });
  } catch (err: any) {
    return fail(err?.message || `删除预设 ${id} 失败`);
  }
}

/**
 * 挂载校验：真正组合该预设的插件子树（standingKeyFor）。
 * 成功 = 组合可挂载；失败返回具体原因（缺包/非法 config/未激活行/服务越权发布）。
 */
export async function validatePreset(
  roster: AgentPresetsService | undefined,
  id: string,
): Promise<CliResult<{ id: string; mounted: true }>> {
  if (!roster) return fail('agentPresets 服务不可用');
  if (!PRESET_ID_PATTERN.test(id)) return fail(`预设 id 非法: ${id}`, 400);
  try {
    await roster.standingKeyFor(id);
    return ok({ id, mounted: true });
  } catch (err: any) {
    return fail(err?.message || `预设 ${id} 挂载校验失败`);
  }
}
