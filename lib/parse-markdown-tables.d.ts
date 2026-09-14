/**
 * Markdown pipe-table parser.
 *
 * Pure, dependency-free extraction of GitHub-flavored Markdown tables from an
 * arbitrary string. A table is recognized by the canonical two-line shape:
 *
 *   | Header A | Header B |      <- header row (contains a pipe)
 *   | --- | --- |              <- alignment row (only `-`, `:`, spaces, pipes)
 *
 * Every subsequent pipe-row until a blank/non-table line is a data row.
 * This mirrors how DeepSeek Harness renders assistant messages, so tables
 * wrapped in ```markdown fences or embedded in prose are still detected.
 */
export interface ParsedTable {
    /** Column headers, trimmed. */
    headers: string[];
    /** Data rows; every row is padded/truncated to the header column count. */
    rows: string[][];
    /** 1-based line number of the header row in the source (for diagnostics). */
    startLine: number;
}
/**
 * Extract all Markdown tables from `markdown`.
 * Returns an empty array when none are found.
 */
export declare function parseMarkdownTables(markdown: string): ParsedTable[];
