export interface ExportOptions {
    /** Raw markdown / text that contains one or more pipe tables. */
    markdown: string;
    /** Directory to write the .xlsx into. Defaults to `process.cwd()`. */
    outputDir?: string;
    /** Output base name without extension. Defaults to `markdown-tables`. */
    fileName?: string;
    /** When true, each table becomes its own worksheet. */
    sheetPerTable?: boolean;
}
export interface ExportResult {
    /** Absolute path of the written .xlsx file. */
    file: string;
    /** Number of worksheets in the workbook. */
    sheetCount: number;
    /** Number of markdown tables detected and exported. */
    tableCount: number;
}
/**
 * Parse the Markdown tables inside `markdown` and write them to a single
 * .xlsx file. Throws when no table is found so the caller can surface it.
 */
export declare function exportMarkdownTablesToExcel(opts: ExportOptions): ExportResult;
