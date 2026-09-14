export interface ToolConfig {
    /** Fallback directory for exported .xlsx files (used when a call omits outputDir). */
    defaultOutputDir?: string;
    /** Default worksheet layout when a call omits sheetPerTable. */
    sheetPerTable?: boolean;
}
/**
 * Build the `export_md_tables_to_excel` tool bound to the plugin's config.
 * The tool is the host-side half of this plugin: it lets the agent turn any
 * Markdown tables that appeared in the conversation into a downloadable Excel
 * file. The Web-Client half lives in `userscript/`.
 */
export declare function createExportTool(config: ToolConfig): import("@deepseek-ai/dsh-tools").ToolDefinition;
