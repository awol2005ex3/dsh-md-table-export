本文档面向**不克隆 `deepseek-harness` 主仓库**的开发者，指导如何以独立 npm 包形式开发、调试并发布 `dsh` 插件。

#### 第一步：初始化独立插件项目

1.  创建新目录并初始化 `package.json`：
    ```json
    {
      "name": "my-dsh-plugin",
      "version": "1.0.0",
      "type": "module",
      "main": "lib/index.js",
      "types": "lib/index.d.ts",
      "peerDependencies": {
        "@deepseek-ai/cordis": "^x.x.x"
      },
      "devDependencies": {
        "@deepseek-ai/cordis": "^x.x.x",
        "@deepseek-ai/schemastery": "^x.x.x",
        "@deepseek-ai/dsh-tools": "^x.x.x", 
        "tsx": "^4.0.0",
        "typescript": "^5.0.0"
      },
      "dsh": {
        "bundle": {
          "patch": "./cordis.patch.yml"
        }
      }
    }
    ```
    > **注意（重要）**：`dsh.bundle` 只有在声明了 `patch` 字段时才会被 profile 当作
    > bundle 层——CLI 的判定逻辑是 `dsh.bundle.patch !== undefined`
    > （见主仓库 `apps/cli/src/plugin.ts` 的 `reconcilePlugins`）。老教程里常见的
    > `"bundle": "headless"` 字符串写法**不会被识别**，装进 profile 后只会有告警、两半都不生效。
    > 同时还需在项目根目录创建 `cordis.patch.yml` 把插件行插进配置树，例如：
    >
    > ```yaml
    > - insert:
    >     - id: my-dsh-plugin
    >       name: my-dsh-plugin
    > ```

2.  创建 `tsconfig.json`，启用严格模式与 ESM 模块解析。

#### 第二步：编写插件核心代码

在 `src/index.ts` 中遵循四导出规范：

```typescript
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
// 若开发工具插件，引入 defineTool
// import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'my-dsh-plugin'

// 1. 声明必需服务依赖
export const inject = ['tools'] 

// 2. 声明式配置 Schema
export interface Config {
  apiKey: string
  timeout?: number
}
export const Config: z<Config> = z.object({
  apiKey: z.string().required(),
  timeout: z.number().default(30000),
})

// 3. 插件主体（命名导出，禁止 default export）
export function apply(ctx: Context, config: Config) {
  // 注册工具示例
  ctx.tools.register(defineTool({ /* ... */ }))

  // 注册事件钩子示例（waterfall 必须调 next）
  ctx.on('tools/pre-execute', async (exec, next) => {
    if (!config.apiKey) return { kind: 'deny', reason: 'Missing API Key' }
    return next()
  })

  // 可逆副作用
  ctx.effect(() => {
    const timer = setInterval(() => ctx.logger.info('heartbeat'), 60000)
    return () => clearInterval(timer)
  })
}
```

#### 第三步：本地调试（无需主仓库源码）

由于不依赖主仓库源码，你需要一个已安装 `dsh` 的运行环境来进行挂载测试：

1.  **直接用 npx 运行 dsh CLI**（无需全局安装）：
    ```bash
    npx @deepseek-ai/dsh --help
    ```

2.  **链接本地插件到 dsh profile**：
    在你的插件目录下执行：
    ```bash
    # 将当前开发中的插件添加到 headless profile
    dsh plugin --profile headless add .
    ```
    > 相对路径 `.` 锚定到当前命令行目录。`dsh plugin add` 底层调用 pnpm，会自动处理 workspace 链接。

3.  **验证配置组合树**：
    ```bash
    dsh --profile headless --dump-config
    ```
    确认输出中包含你的插件 ID 及正确的 config 值。

4.  **运行测试任务**：
    ```bash
    # 需要 DEEPSEEK_API_KEY 环境变量
    dsh --profile headless "请帮我测试 my-dsh-plugin 的功能"
    ```

#### 第四步：配置与覆盖（Overlay）

在不修改插件代码的情况下调整行为：

1.  创建 `my-overlay.yml`：
    ```yaml
    - id: my-dsh-plugin
      config:
        apiKey: !!js "process.env.MY_PLUGIN_KEY"
        timeout: 60000
    ```
2.  临时应用覆盖进行测试：
    ```bash
    dsh --profile headless --patch ./my-overlay.yml "测试任务"
    ```
    > **关键规则**：Patch 是按 `id` 整体替换 `config`，不是深合并。如果原插件有其他必填字段，overlay 中必须完整写出。

#### 第五步：质量门与发布

在发布前，独立插件项目应自行保证以下质量：

| 检查项 | 命令/方法 | 说明 |
| :--- | :--- | :--- |
| 类型安全 | `tsc --noEmit` | 确保无 any 逃逸，strict 模式通过 |
| 单元测试 | `vitest` | 建议 mock Context 测试纯逻辑 |
| 集成测试 | `dsh --profile headless --patch test.yml` | 真实 Loader 启动验证 |
| HMR 安全 | 手动触发重载或编写 fiber 释放测试 | 确保 effect/on 注册可逆 |
| 文档完整性 | README.md | 包含 Model Experience 段、Known Limitations、Config 说明 |

#### 第六步：常见问题自查

*   **插件未生效**：检查 `name` 拼写；运行 `--dump-config` 确认是否在组合树中；确认 `inject` 的服务是否在当前 profile 中存在。
*   **Waterfall 钩子阻断流程**：检查是否遗漏 `next()` 调用。
*   **配置修改无效**：确认 patch 是否完整覆盖了所有字段；确认 `!!js` 是否用在了合法位置。
*   **模型看不到工具**：检查工具是否被 scope/restrict 过滤；确认 `defineTool` 的 description 是否清晰。
*   **热重载后状态残留**：检查是否有裸写的副作用未包裹在 `ctx.effect()` 中。

通过以上步骤，你可以在完全独立的项目中完成 `dsh` 插件的**主机侧（Node 半）**全生命周期开发，仅在调试阶段通过 CLI 与 `dsh` 运行时进行松耦合交互。

---

#### 补充（2026-08）：Web 客户端半（浏览器 bundle）

较新版 deepseek-harness 的客户端模块系统允许独立包把自己的 JS 送进浏览器
（详见本仓库根目录 [AGENTS.md](../AGENTS.md) 的“双交付架构”一节）。要点：

1. **一个包、两个半**：`package.json` 同时声明
   - `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }` —— Node 半进配置树；
   - `"client": { "platform": "web", "immediately": true }` + `exports["./client"]` —— 浏览器半进启动图。
2. **安装一律用 web profile**：`npx @deepseek-ai/dsh plugin --profile web add .`
   之后**重启宿主**才生效（插件集合在启动时扫描缓存）。
3. **exports 必须放行 `./package.json`**：宿主用
   `require.resolve('<pkg>/package.json')` 读元数据；不放行会抛
   `ERR_PACKAGE_PATH_NOT_EXPORTED`，该包被永久标记为非客户端行——症状是
   Node 工具正常但 Web 按钮 404 静默缺失。
4. **bundle 契约**：`lib/client.js` 必须是“惰性 CJS 闭包工厂”脚本，执行时只调用
   `window.__ModuleLoader__.load({ id, factory })`；构建可参考本仓库的
   `scripts/wrap-client.mjs`。

本仓库（dsh-md-table-export）即是按此双半架构完成的参考实现。