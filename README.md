# dsh-md-table-export

DeepSeek Harness（`dsh`）插件：把对话内容里的 **Markdown 表格** 一键导出为 **Excel（`.xlsx`）**。

> 需求来源：对 deepseek-harness web 的对话内容中 markdown table 格式内容增加 Excel 导出功能。

本仓库同时交付两部分，覆盖“模型侧”和“界面侧”两条路径：

| 部分 | 形态 | 作用 |
| --- | --- | --- |
| `src/` → `dsh` 主机插件 | Cordis 插件（headless bundle） | 向 agent 注册 `export_md_tables_to_excel` 工具，让模型能主动把对话里的表格写成 Excel 文件。 |
| `userscript/dsh-web-md-table-export.user.js` | 浏览器用户脚本（Tampermonkey / Violentmonkey） | 在 dsh Web 对话页的每个渲染后的表格上挂“导出 Excel”按钮，并在右下角提供“导出全部表格”。 |

---

## 为什么是“两部分”

`dsh` 的扩展模型是 **Everything is a Plugin**，所有能力都挂在 Cordis 上下文上（`docs/cookbook/extension-cookbook.md`）：

- **主机侧（host）**：工具通过 `ctx.tools.register(defineTool({...}))` 注册，由 loader 组合进插件树。这正是本仓库 `src/` 做的事，完全独立于主仓库源码，按照《DeepSeek Harness 插件独立开发操作步骤文档》的 `headless` bundle 规范开发。
- **Web 客户端侧（Web Client）**：要在聊天界面里“给表格加按钮”，官方机制是注册 `ConversationNodeDefinition` 并注入 `conversation.chat.node` 槽位（`docs/cookbook/adding-a-conversation-node.md`）。但该机制前提是 **把客户端插件编译进 web-app bundle**，独立开发者不 fork 主仓库无法做到。

因此，针对“独立插件、零构建、直接给 web 对话加导出按钮”这一诉求，最务实的方案是 **浏览器用户脚本**：它直接扫描 dsh Web 渲染出的 `<table>` DOM 元素（Markdown 表格在 Web 端会被渲染成 HTML `<table>`），无需任何 dsh 内部接口。若你确实在 from-source 构建 web-app，可参考文末“原生客户端节点（进阶）”把按钮做进插件树。

---

## 目录结构

```
dsh-md-table-export/
├── package.json                 # dsh.bundle: "headless"，peerDeps 指向 @deepseek-ai/*
├── tsconfig.json                # strict + NodeNext
├── README.md
├── src/
│   ├── index.ts                 # 插件四导出规范：name / inject / Config / apply
│   ├── tool.ts                  # defineTool 注册 export_md_tables_to_excel
│   ├── parse-markdown-tables.ts # 纯函数：从文本解析 Markdown 表格
│   └── export-excel.ts          # 纯函数：表格 -> .xlsx（基于 xlsx）
├── test/
│   ├── parse-markdown-tables.test.ts
│   └── export-excel.test.ts
└── userscript/
    └── dsh-web-md-table-export.user.js   # Web 端导出按钮（Tampermonkey）
```

---

## 一、安装主机插件（dsh tool）

```bash
# 1. 安装依赖（独立仓库，按本地文档规范）
npm install
# 或 pnpm install

# 2. 类型检查 + 单元测试（质量门）
npm run typecheck
npm test

# 3. 把当前插件加入 headless profile
dsh plugin --profile headless add .

# 4. 确认已组合进插件树
dsh --profile headless --dump-config
# 输出中应能看到 id: dsh-md-table-export

# 5. 让模型使用（需要 DEEPSEEK_API_KEY）
dsh --profile headless "把上面那个对比表格导出成 Excel 保存到 /tmp"
```

### 工具参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `markdown` | string | ✅ | 包含一个或多个 pipe 表格的 Markdown / 文本。 |
| `outputDir` | string | | 写出目录；缺省用插件 `defaultOutputDir` 或进程 cwd。 |
| `fileName` | string | | 文件名（不含扩展名），默认 `markdown-tables`。 |
| `sheetPerTable` | boolean | | `true` 时每个表格单独一个 worksheet；否则堆叠进同一个 `Tables` 表。 |

### 配置（overlay / cordis.yml）

```yaml
- id: dsh-md-table-export
  name: dsh-md-table-export
  config:
    defaultOutputDir: "/tmp/dsh-exports"
    sheetPerTable: false
```

> 注意：patch 是按 `id` 整体替换 `config`（非深合并），overlay 需写全字段。

---

## 二、安装 Web 端导出按钮（用户脚本）

1. 安装浏览器扩展：Tampermonkey（或 Violentmonkey）。
2. 新建脚本，把 `userscript/dsh-web-md-table-export.user.js` 全量粘贴进去并保存。
3. 打开 dsh Web 对话页（默认本地 `http://localhost:*` / `http://127.0.0.1:*`）。
   - 若你的 dsh web 跑在别的 origin/端口，请在该脚本顶部补一行 `// @match <你的地址>/*`。
4. 效果：
   - 每个渲染出的 Markdown 表格上方出现 **“导出 Excel”** 按钮 → 导出该表为 `dsh-table.xlsx`。
   - 页面右下角出现 **“导出全部表格为 Excel”** 浮动按钮 → 把本页所有表格汇成一个工作簿（每表一 sheet）`dsh-tables-all.xlsx`。

> 用户脚本依赖 `XLSX` 全局对象，通过 `@require https://cdn.sheetjs.com/xlsx-0.18.5/package/dist/xlsx.full.min.js` 自动加载，无需本地构建。导出完全在浏览器本地完成，不上传任何数据。

---

## 三、核心逻辑说明

- **解析**（`parse-markdown-tables.ts`）：识别 GitHub 风格表格的经典两行结构——表头行（含 `|`）+ 对齐行（仅 `-`、`:`、空格、管道）。随后逐行读取数据行，自动对齐列宽（短行补空、长行截断），支持转义管道 `\|`、代码围栏内表格、多表共存。
- **导出**（`export-excel.ts`）：基于 `xlsx`，单表时堆叠进 `Tables` 表（表间空一行），或按 `sheetPerTable` 每表一 sheet；自动创建输出目录，文件名做 Excel 工作表名合法性清洗。
- 主机工具与 Web 脚本**共用同一套“Markdown 表格”语义**，保证两边导出的内容一致。

---

## 四、Model Experience（模型可见行为）

当对话中出现表格、用户要求“导出 / 下载 / 存成 Excel”时，模型应调用 `export_md_tables_to_excel`，传入对话中的原始 Markdown（含表格的文本）。工具返回写出文件的绝对路径，并以文本卡片告知用户“已导出 N 个表格到 <path>”。

---

## 五、Known Limitations（已知限制）

- 主机工具的 `markdown` 需由调用方提供原文；它不会主动去“读”当前 web 界面。浏览器侧的导出按钮负责界面交互，两者通过“同一份表格内容”自然衔接。
- 解析器按行识别表格，不处理跨行合并单元格（Markdown 表格本身无 rowspan/colspan 语义）。
- Web 用户脚本依赖 dsh Web 把表格渲染为 `<table>`；若某自定义渲染器改用 div 网格，需相应调整选择器。
- 主机插件 `xlsx` 运行时依赖通过 npm 安装；用户脚本通过 CDN 加载 `xlsx`。

---

## 六、质量门（与本地文档一致）

| 检查项 | 命令 |
| --- | --- |
| 类型安全 | `npm run typecheck`（`strict`，无 any 逃逸） |
| 单元测试 | `npm test`（vitest，覆盖解析与导出） |
| 组合验证 | `dsh --profile headless --dump-config` |
| HMR 安全 | 注册全部包在 `ctx.effect()` 内，可热重载/卸载 |

---

## 七、原生客户端节点（进阶，from-source 构建时）

若你在构建 `packages/bundle/web-app` 时把本插件一起编入，可把“导出按钮”做成真正的 `ConversationNodeDefinition`：

```ts
// client 子包示意（需 @deepseek-ai/dsh-client-runtime/client、dsh-client-ui-conversation/client）
export const inject = ['conversationEvents', 'slots']
export function apply(ctx: ClientContext) {
  ctx.conversationEvents.register(myTableExportDefinition)
  ctx.slots.inject('conversation.chat.node', () =>
    ctx.slots.register({ name: 'conversation.chat.node', key: 'md-table-export' }, MyButtonView))
}
```

要点见 `docs/cookbook/adding-a-conversation-node.md`：每个业务节点需有稳定 `id`、可回放的 `SessionEventMap`（`@mode emit`），并在 `match/start/update/buildViewNode` 中维护不可变 State。该路径需改动 web-app 构建，不在本独立仓库默认交付范围内。

---

## License

MIT
