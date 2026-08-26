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
  headers: string[]
  /** Data rows; every row is padded/truncated to the header column count. */
  rows: string[][]
  /** 1-based line number of the header row in the source (for diagnostics). */
  startLine: number
}

const ALIGN_ROW = /^\s*\|?[\s:|-]+\|?\s*$/
const SEPARATOR_CELL = /^\s*:?-+:?\s*$/

/** Split one raw table line into trimmed cells, honoring escaped pipes `\|`. */
function splitRow(line: string): string[] {
  let s = line.trim()
  if (s.startsWith('|')) s = s.slice(1)
  if (s.endsWith('|')) s = s.slice(0, -1)
  // Split only on pipes that are not escaped; then unescape the survivors.
  return s.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, '|'))
}

function isAlignmentRow(line: string): boolean {
  if (!ALIGN_ROW.test(line)) return false
  // Every non-empty cell must look like an alignment spec (`:-`, `:-:`, `---`).
  const cells = splitRow(line).filter((c) => c.length > 0)
  if (cells.length === 0) return false
  return cells.every((c) => SEPARATOR_CELL.test(c))
}

/**
 * Extract all Markdown tables from `markdown`.
 * Returns an empty array when none are found.
 */
export function parseMarkdownTables(markdown: string): ParsedTable[] {
  const lines = markdown.split(/\r?\n/)
  const tables: ParsedTable[] = []
  let i = 0

  while (i < lines.length) {
    const headerLine = lines[i]!

    // A header row must contain a pipe and must not itself be an alignment row.
    if (!headerLine.includes('|') || isAlignmentRow(headerLine)) {
      i++
      continue
    }

    // Must be followed by an alignment row to qualify as a table.
    const nextLine = lines[i + 1]
    if (nextLine === undefined || !isAlignmentRow(nextLine)) {
      i++
      continue
    }

    const headers = splitRow(headerLine)
    const colCount = headers.length
    const table: ParsedTable = { headers, rows: [], startLine: i + 1 }

    i += 2
    while (i < lines.length) {
      const rowLine = lines[i]!
      if (!rowLine.includes('|') || isAlignmentRow(rowLine)) break

      const cells = splitRow(rowLine)
      while (cells.length < colCount) cells.push('')
      table.rows.push(cells.slice(0, colCount))
      i++
    }

    tables.push(table)
  }

  return tables
}
