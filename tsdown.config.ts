/**
 * DSH 科技风工作台插件 - tsdown 双产物构建配置
 * Host 半侧：Node ESM；Client 半侧：浏览器 CJS factory 包装
 */
const TABLE_EXTERNALS = ['react', 'react/jsx-runtime', 'react-dom'];

export default [
  {
    // Host 半侧：Node ESM
    name: 'dsh-tech-workbench',
    entry: ['src/index.ts'],
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2023',
    fixedExtension: false,
    dts: false,
    clean: false,
    sourcemap: false,
  },
  {
    // Client 半侧：浏览器单文件 lazy-CJS factory
    name: 'dsh-tech-workbench/client',
    entry: { client: 'src/client/index.tsx' },
    outDir: 'lib',
    format: ['cjs'],
    platform: 'browser',
    dts: false,
    sourcemap: true,
    clean: false,
    fixedExtension: false,
    deps: {
      neverBundle: (spec) => TABLE_EXTERNALS.includes(spec),
      alwaysBundle: (spec) => !TABLE_EXTERNALS.includes(spec),
    },
    outputOptions: {
      entryFileNames: 'client.js',
      sourcemapExcludeSources: false,
      banner:
        'window.__ModuleLoader__.load({ id: "dsh-tech-workbench", factory: (require) => {',
      intro:
        'var module = { exports: {} }; var exports = module.exports;',
      footer: 'return module.exports; } });',
    },
  },
];
