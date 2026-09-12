/**
 * DSH 科技风工作台 - 全局类型声明
 * 声明 Node.js 全局变量和 DSH 运行时类型
 * 实际构建环境（tsdown + DSH）会提供完整类型，此文件用于开发期类型检查
 */

// Node.js Buffer 类声明（同时作为值和类型）
declare class Buffer {
  constructor(data: string | Uint8Array, encoding?: string);
  toString(encoding?: string): string;
  static from(data: string, encoding?: string): Buffer;
  static from(data: Uint8Array): Buffer;
  static isBuffer(obj: any): boolean;
}

declare const process: {
  env: Record<string, string | undefined>;
  version: string;
  platform: string;
  cwd(): string;
};

// DSH Cordis 上下文类型（简化版，实际由 @deepseek-ai/cordis 提供）
declare module '@deepseek-ai/cordis' {
  export interface Context {
    [key: string]: any;
    inject(deps: string[], fn: (ctx: any) => void): void;
    effect(fn: () => (() => void) | void): void;
    on(event: string, handler: (...args: any[]) => void): void;
    logger?: {
      info(msg: string): void;
      warn(msg: string, err?: any): void;
      error(msg: string, err?: any): void;
    };
  }
}
