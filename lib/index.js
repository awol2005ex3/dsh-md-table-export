import Schema from '@deepseek-ai/schemastery';
import { createExportTool } from './tool.js';
/** Plugin id — must be unique within the composed plugin tree. */
export const name = 'dsh-md-table-export';
/** Declare the services this plugin needs; the loader waits for them. */
export const inject = ['tools'];
export const Config = Schema.object({
    defaultOutputDir: Schema.string().description('Default directory for exported Excel files. Falls back to the process working directory when empty.'),
    sheetPerTable: Schema.boolean()
        .default(false)
        .description('Put each table on its own worksheet by default.'),
});
/**
 * Plugin entry point (named export, no default export).
 * Registers the Markdown-table → Excel tool as a reversible effect so HMR and
 * plugin disposal clean it up automatically.
 */
export function apply(ctx, config) {
    // Return the tool's disposer so the effect is reversible under HMR / unload.
    ctx.effect(() => {
        const tool = createExportTool(config);
        ctx.logger.info('dsh-md-table-export: registered export_md_tables_to_excel tool');
        return ctx.tools.register(tool);
    });
}
