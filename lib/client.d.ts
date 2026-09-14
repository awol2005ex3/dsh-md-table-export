/**
 * Web 客户端 bundle 模块体。
 *
 * 构建契约（deepseek-harness packages/client/tsdown.client.ts 的闭包工厂格式）：
 * 本文件经 tsc 编译后，由 scripts/wrap-client.mjs 包上
 *   banner: window.__ModuleLoader__.load({ id, factory: (require) => {
 *   intro : var module = { exports: {} }; var exports = module.exports;
 *   footer: return module.exports; } });
 * 成为惰性 CJS bundle。副作用全部位于工厂闭包内，待浏览器 shell 物化时运行。
 *
 * 因此本文件刻意不含任何 import/export 语句；DOM 逻辑与原油猴脚本一致：
 * 给每个渲染后的表格挂"导出 Excel"按钮，右下角浮动"导出全部表格"。
 * SheetJS 由 CDN 动态注入。
 */
export {};
