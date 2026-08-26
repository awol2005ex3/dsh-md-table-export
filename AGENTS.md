# AGENTS.md — dsh-md-table-export

> 供 AI 代理与协作者快速理解本仓库的 **代码地图** 与 **开发规范**。
> 用户侧用法见 [README.md](./README.md)；本地 dsh 插件开发规范见 `docs/DeepSeek Harness 插件独立开发操作步骤文档.md`。

---

## 1. 项目定位

DeepSeek Harness（`dsh`）插件：**把对话内容里的 Markdown 表格导出为 Excel (.xlsx)**。

双交付架构（两条互补路径，共享"解析 → 导出"思路）：

| 路径 | 形态 | 作用 | 目录 |
| --- | --- | --- | --- |
| 主机侧 | dsh Cordis 插件（headless bundle） | 向 agent 注册 `export_md_tables_to_excel` 工具，让模型能主动导出 | `src/` |
| 界面侧 | Tampermonkey 用户脚本 | 在 dsh Web 对话页给每个渲染后的 `<table>` 加"导出 Excel"按钮 | `userscript/` |

> **为什么 Web 走用户脚本**：dsh 官方 Web 扩展点是 `ConversationNodeDefinition` + 注入 `conversation.chat.node` 槽位，但必须编译进 web-app bundle，独立开发者无法零构建实现。用户脚本扫描渲染后的 DOM，可直接落地界面侧导出。进阶的原生节点方案见 README。

---

## 2. 代码地图（Code Map）

```
dsh-md-table-export/
├── package.json            # 元信息 + 脚本 + 依赖；含 "dsh": { "bundle": "headless" }
├── tsconfig.json           # strict TypeScript 配置（产物输出到 lib/）
├── AGENTS.md               # 本文件：代码地图 + 开发规范
├── README.md               # 用户面向：架构/安装/用法/限制/扩展点映射
├── docs/
│   └── DeepSeek Harness 插件独立开发操作步骤文档.md  # 本地 dsh 插件开发规范（四导出）
├── src/                    # 主机插件源码（TypeScript，编译为 lib/）
│   ├── index.ts            # 插件入口：四导出 name/inject/Config/apply
│   ├── tool.ts             # createExportTool() → defineTool('export_md_tables_to_excel')
│   ├── export-excel.ts     # exportMarkdownTablesToExcel() → 写 .xlsx
│   └── parse-markdown-tables.ts  # parseMarkdownTables()：纯函数解析 MD 表格
├── test/                   # vitest 单测（覆盖解析 + 导出）
│   ├── parse-markdown-tables.test.ts
│   └── export-excel.test.ts
├── userscript/
│   └── dsh-web-md-table-export.user.js   # Web 导出按钮（Tampermonkey）
└── lib/                    # tsc 编译产物（index.js / .d.ts 等）—— **不要手动编辑**
```

### 2.1 `src/index.ts` — 插件入口（四导出规范）
- 必须导出 4 个符号（dsh 插件契约）：
  - `name = 'dsh-md-table-export'`（插件 id，组合树内唯一）
  - `inject = ['tools']`（声明依赖的服务）
  - `Config`（schemastery `Schema.object`，含 `defaultOutputDir` / `sheetPerTable`）
  - `apply(ctx, config)` 入口
- `apply` 通过 `ctx.effect(() => { ... return ctx.tools.register(tool) })` 注册工具，**回调必须返回 disposer**（`ctx.tools.register()` 返回 `() => void`），保证 HMR/卸载可清理。

### 2.2 `src/tool.ts` — 工具定义
- `createExportTool(config)` 用 `defineTool` 注册 `export_md_tables_to_excel`。
- 入参：`markdown`（必填）、`outputDir`、`fileName`、`sheetPerTable`。
- 出参 schema 为 object，**必须带 `additionalProperties: false`**（见 §4 坑位）。
- `execute(args, exec)` 调用 `exportMarkdownTablesToExcel`；`exec.signal` 需保持被遵守（取消信号）。

### 2.3 `src/export-excel.ts` — 导出核心
- `exportMarkdownTablesToExcel(opts): ExportResult`：`opts.markdown` → 解析 → 写出 `.xlsx`。
- `opts.sheetPerTable = true`：每表一 sheet；否则所有表堆叠进一个名为 `Tables` 的 sheet（表间空一行）。
- `sanitizeSheetName()`：工作表名 ≤28 字符、去除 `\ / ? * [ ] :`。
- 无表格时抛错（调用方可向上暴露）。

### 2.4 `src/parse-markdown-tables.ts` — 解析核心（纯函数）
- `parseMarkdownTables(markdown): ParsedTable[]`：识别"表头行(含 `|`) + 对齐行(仅 `-` `:` 空格 `|`)"。
- 支持：对齐标记（`:---` `:---:` `---:`）、多表共存、代码围栏内表格、转义 `\|`、行列宽对齐（短行补空、长行截断到表头列数）。
- `splitRow()` 用负向先行 `(?<!\\)\|` 只在未转义竖线处拆分，再 `\|` → `|`。
- 返回 `ParsedTable { headers, rows, startLine }`，`startLine` 为 1-based 表头行号（诊断用）。

### 2.5 `test/` — 单测
- 解析 7 例（简单表 / 对齐 / 多表 / 无对齐行 / 代码围栏 / 转义竖线 / 行列对齐 / 行号）。
- 导出 3 例（单 sheet / 每表一 sheet / 无表抛错）。
- 跑 `npm test`（= `vitest run`）。

### 2.6 `userscript/dsh-web-md-table-export.user.js`
- `@require` SheetJS CDN；`@match` 覆盖 `localhost` / `127.0.0.1`（HTTP+HTTPS）。
- 扫描渲染后的 `<table>`（dsh Web 把 MD 表格渲染为 HTML `<table>`），每张表挂"导出 Excel"按钮；右下角浮动"导出全部表格"（每表一 sheet）。
- 若 dsh Web 跑在其他 origin/端口，补 `@match` 行。

---

## 3. 开发流程（标准命令）

```bash
npm install            # 安装依赖（xlsx, dsh 包, vitest, tsx, typescript）
npm run typecheck     # tsc --noEmit，strict 必须通过
npm test              # vitest run，解析+导出共 11 例必须全绿
npm run build         # tsc 编译到 lib/（产出 .js + .d.ts）
npm run test:watch    # vitest 监听模式（开发中）
```

质量门顺序建议：**改代码 → `typecheck` → `test` → `build`**，三者皆过再提交。

---

## 4. 关键约束 / 已踩坑（务必遵守）

1. **`output.schema` 的 object 必须带 `additionalProperties`**
   - 用 `additionalProperties: false` 可让 `InferValue` 精确等于 props，避免 `execute` 返回值类型不匹配。
   - （用 `true` 会引入 `Record<string, JsonValue>` 索引签名，导致 `ExportResult` 不可赋值给 `InferValue`。）

2. **`ctx.effect` 回调必须返回 disposer**
   - `ctx.tools.register()` 返回 `() => void`，必须 `return` 它。返回 `void` 会在 strict 下报类型错（SyncEffect 要求 Disposable/Iterable）。

3. **解析器对未转义 `|` 敏感**：cell 内真竖线必须写作 `\|`，否则会被当成分列符。

4. **`lib/` 是编译产物**：只改 `src/`，不要直接编辑 `lib/`。

5. **依赖版本锁定**（已验证可编译）：
   - `@deepseek-ai/cordis@^4.0.1`、`@deepseek-ai/dsh-tools@^0.0.1-rc.1`、`@deepseek-ai/schemastery@^3.18.1`、`xlsx@^0.18.5`。
   - `package.json` 必须 `"type": "module"` 且 `"dsh": { "bundle": "headless" }`。

---

## 5. 开发约定（与用户约定保持一致）

- **代码与文档同步**：任何 `src/`、`userscript/` 的接口/行为变更，同步更新 `README.md` 与本文（AGENTS.md）。新增/修改导出点，补单测。
- **纯函数优先**：解析/导出逻辑保持无副作用、可单测；I/O（写文件、DOM）集中在边界层（`export-excel.ts` 写盘、`userscript` 操作 DOM）。
- **中文注释 + 英文标识符**：注释用中文，代码符号用英文（与现有文件风格一致）。
- **不硬编码配置**：输出目录、每表一 sheet 等均为可配置项（插件 Config / 工具参数 / 用户脚本常量）。
- **提交前自检**：类型、单测、构建三者全过；不要带 `console.log` 调试残留进 `src/`（用户脚本允许必要 `console.error` + `alert`）。

---

## 6. 如何扩展（常见任务入口）

| 想要的能力 | 改动位置 |
| --- | --- |
| 改导出文件名/默认目录 | `Config`（`src/index.ts`）+ `execute`（`src/tool.ts`）+ `ExportOptions`（`src/export-excel.ts`） |
| 支持 CSV / 多 sheet 命名规则 | `src/export-excel.ts` 的 `sanitizeSheetName` 与 `XLSX.writeFile` 段 |
| 增强解析（如表格标题、合并单元格） | `parseMarkdownTables` 与 `ParsedTable`（`src/parse-markdown-tables.ts`），并补 `test/` |
| Web 按钮样式/触发逻辑/目标 origin | `userscript/dsh-web-md-table-export.user.js` 的 `@match` 与 `makeButton`/`exportTable` |
| 升级 dsh 包版本 | `package.json` peer/devDeps，并复跑 §3 质量门（重点看 §4 约束是否仍成立） |

> 进阶：若改为 dsh 原生 `conversation.chat.node` 客户端插件（需 from-source 构建 web-app），参见 README 的"原生节点进阶方案"段。
