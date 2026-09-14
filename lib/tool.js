import { defineTool } from '@deepseek-ai/dsh-tools';
import { exportMarkdownTablesToExcel } from './export-excel.js';
/**
 * Build the `export_md_tables_to_excel` tool bound to the plugin's config.
 * The tool is the host-side half of this plugin: it lets the agent turn any
 * Markdown tables that appeared in the conversation into a downloadable Excel
 * file. The Web-Client half lives in `userscript/`.
 */
export function createExportTool(config) {
    return defineTool({
        name: 'export_md_tables_to_excel',
        description: [
            'Export one or more Markdown pipe-tables found in text into a single .xlsx Excel file.',
            'Use this when the user wants to download or save tables (comparison tables, data tables,',
            'leaderboards, etc.) that appeared in the conversation as Excel. Accepts raw Markdown or any',
            'text that contains pipe-table blocks.',
        ].join(' '),
        parameters: {
            markdown: {
                type: 'string',
                required: true,
                description: 'The Markdown/text containing one or more pipe tables to export.',
            },
            outputDir: {
                type: 'string',
                description: 'Directory to write the .xlsx into. Falls back to the plugin defaultOutputDir or the current working directory.',
            },
            fileName: {
                type: 'string',
                description: 'Output file base name without extension. Defaults to "markdown-tables".',
            },
            sheetPerTable: {
                type: 'boolean',
                description: 'If true, each table gets its own worksheet; otherwise all tables are stacked into one "Tables" sheet.',
            },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    file: { type: 'string' },
                    sheetCount: { type: 'number' },
                    tableCount: { type: 'number' },
                },
            },
            render: (_args, value) => [
                {
                    type: 'text',
                    text: `Exported ${value.tableCount} table(s) to ${value.file} (${value.sheetCount} sheet(s)).`,
                },
            ],
        },
        async execute(args, exec) {
            const result = exportMarkdownTablesToExcel({
                markdown: args.markdown,
                outputDir: args.outputDir || config.defaultOutputDir,
                fileName: args.fileName,
                sheetPerTable: args.sheetPerTable !== undefined ? args.sheetPerTable : config.sheetPerTable,
            });
            // Keep the cancel signal alive so a long export respects agent shutdown.
            void exec.signal;
            return result;
        },
    });
}
