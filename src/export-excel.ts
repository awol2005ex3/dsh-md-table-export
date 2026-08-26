import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import * as XLSX from 'xlsx'
import { parseMarkdownTables } from './parse-markdown-tables.js'

export interface ExportOptions {
  /** Raw markdown / text that contains one or more pipe tables. */
  markdown: string
  /** Directory to write the .xlsx into. Defaults to `process.cwd()`. */
  outputDir?: string
  /** Output base name without extension. Defaults to `markdown-tables`. */
  fileName?: string
  /** When true, each table becomes its own worksheet. */
  sheetPerTable?: boolean
}

export interface ExportResult {
  /** Absolute path of the written .xlsx file. */
  file: string
  /** Number of worksheets in the workbook. */
  sheetCount: number
  /** Number of markdown tables detected and exported. */
  tableCount: number
}

/** Excel worksheet names are capped at 31 chars and forbid a few symbols. */
function sanitizeSheetName(seed: string, fallback: string): string {
  const cleaned = seed.replace(/[\\/?*[\]:]/g, ' ').replace(/\s+/g, ' ').trim()
  const base = (cleaned || fallback).slice(0, 28)
  return base
}

/**
 * Parse the Markdown tables inside `markdown` and write them to a single
 * .xlsx file. Throws when no table is found so the caller can surface it.
 */
export function exportMarkdownTablesToExcel(opts: ExportOptions): ExportResult {
  const tables = parseMarkdownTables(opts.markdown)
  if (tables.length === 0) {
    throw new Error('No Markdown tables found in the provided content.')
  }

  const outputDir = opts.outputDir?.trim() || process.cwd()
  mkdirSync(outputDir, { recursive: true })

  const baseName = (opts.fileName || 'markdown-tables').replace(/\.xlsx$/i, '')
  const fileName = `${baseName}.xlsx`
  const filePath = join(outputDir, fileName)

  const wb = XLSX.utils.book_new()

  if (opts.sheetPerTable) {
    tables.forEach((table, idx) => {
      const aoa: unknown[][] = [table.headers, ...table.rows]
      const ws = XLSX.utils.aoa_to_sheet(aoa)
      const name = sanitizeSheetName(table.headers[0] ?? '', `Table${idx + 1}`)
      XLSX.utils.book_append_sheet(wb, ws, name)
    })
  } else {
    // Stack every table into one "Tables" sheet, separated by a blank row.
    const aoa: unknown[][] = []
    tables.forEach((table, idx) => {
      if (idx > 0) aoa.push([])
      aoa.push(table.headers)
      for (const row of table.rows) aoa.push(row)
    })
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    XLSX.utils.book_append_sheet(wb, ws, 'Tables')
  }

  XLSX.writeFile(wb, filePath)

  return {
    file: filePath,
    sheetCount: wb.SheetNames.length,
    tableCount: tables.length,
  }
}
