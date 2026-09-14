window.__ModuleLoader__.load({ id: "dsh-md-table-export", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
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
const PLUGIN_ID = 'dsh-md-table-export';
const SHEETJS_CDN = 'https://cdn.sheetjs.com/xlsx-0.18.5/package/dist/xlsx.full.min.js';
const BTN_CLASS = 'dsh-md-export-btn';
const ALL_BTN_ID = 'dsh-md-export-all';
/* 浏览器全局的窄访问面 */
const win = window;
function alertError(err, prefix) {
    const message = err instanceof Error ? err.message : String(err);
    // 边界层允许 console.error + alert（无 ctx.logger 可用的浏览器端）
    console.error(`[${PLUGIN_ID}]`, err);
    window.alert(`${prefix}: ${message}`);
}
/* ── SheetJS 加载（CDN 动态注入） ── */
let sheetJsPromise;
function loadSheetJs() {
    if (win.XLSX !== undefined)
        return Promise.resolve(win.XLSX);
    if (sheetJsPromise !== undefined)
        return sheetJsPromise;
    sheetJsPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = SHEETJS_CDN;
        script.onload = () => {
            if (win.XLSX !== undefined)
                resolve(win.XLSX);
            else
                reject(new Error('SheetJS 已加载但未暴露 XLSX 全局对象'));
        };
        script.onerror = () => reject(new Error('无法从 CDN 加载 SheetJS（xlsx），请检查网络'));
        document.head.appendChild(script);
    });
    return sheetJsPromise;
}
/* ── 导出动作 ── */
/** 工作表名清洗：≤28 字符、去除非法字符（与主机侧 sanitizeSheetName 同语义）。 */
function sanitizeSheetName(name) {
    return name.replace(/[/\\?*[\]:]/g, '').slice(0, 28) || 'Table';
}
async function exportTable(table) {
    try {
        const XLSX = await loadSheetJs();
        const wb = XLSX.utils.table_to_book(table, { raw: true });
        XLSX.writeFile(wb, `${PLUGIN_ID}-table.xlsx`);
    }
    catch (err) {
        alertError(err, '导出失败');
    }
}
async function exportAllTables() {
    try {
        const tables = Array.from(document.querySelectorAll('table'));
        if (tables.length === 0) {
            window.alert('当前页面没有可导出的表格');
            return;
        }
        const XLSX = await loadSheetJs();
        const wb = XLSX.utils.book_new();
        tables.forEach((table, index) => {
            const ws = XLSX.utils.table_to_sheet(table, { raw: true });
            XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(`Table${index + 1}`));
        });
        XLSX.writeFile(wb, `${PLUGIN_ID}-tables-all.xlsx`);
    }
    catch (err) {
        alertError(err, '导出失败');
    }
}
/* ── 按钮 DOM 注入 ── */
function makeButton(label, onClick) {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.className = BTN_CLASS;
    btn.style.cssText =
        'margin:4px 6px 4px 0;padding:3px 10px;font-size:12px;cursor:pointer;' +
            'border:1px solid #d0d7de;background:#f6f8fa;color:#1f2328;border-radius:6px;';
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
    });
    return btn;
}
function processTable(table) {
    if (table.dataset.dshProcessed === '1')
        return;
    table.dataset.dshProcessed = '1';
    const bar = document.createElement('div');
    bar.style.cssText = 'margin:8px 0 4px;';
    bar.appendChild(makeButton('导出 Excel', () => void exportTable(table)));
    table.parentNode?.insertBefore(bar, table);
}
function ensureToolbar() {
    if (document.getElementById(ALL_BTN_ID) !== null)
        return;
    const btn = makeButton('导出全部表格为 Excel', () => void exportAllTables());
    btn.id = ALL_BTN_ID;
    btn.style.cssText +=
        'position:fixed;right:16px;bottom:16px;z-index:2147483647;padding:9px 14px;' +
            'font-size:13px;background:#1f6feb;color:#fff;border:none;border-radius:8px;' +
            'box-shadow:0 2px 8px rgba(0,0,0,.3);margin:0;';
    document.body.appendChild(btn);
}
function scan() {
    document.querySelectorAll('table').forEach(processTable);
}
function startDomExport() {
    ensureToolbar();
    scan();
    // 捕捉流式渲染 / 懒加载水合过程中新出现的表格。
    new MutationObserver(() => scan()).observe(document.body, { childList: true, subtree: true });
}
/* ── 客户端插件契约（浏览器半 fiber 使用；inject 不依赖任何宿主服务） ── */
function apply() {
    // 物化可能早于 DOM 就绪；就绪后再启动扫描。
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startDomExport);
    }
    else {
        startDomExport();
    }
}
// 工厂返回值即插件模块表：loader 从中读取 name / inject / apply 组装 fiber。
module.exports = { name: PLUGIN_ID, inject: [], apply };
return module.exports; } });
