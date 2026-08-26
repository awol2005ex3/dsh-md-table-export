import { existsSync } from 'node:fs'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { exportMarkdownTablesToExcel } from '../src/export-excel'

const SAMPLE = [
  '# Comparison',
  '',
  '| Model | Acc |',
  '| --- | --- |',
  '| A | 0.91 |',
  '| B | 0.88 |',
].join('\n')

describe('exportMarkdownTablesToExcel', () => {
  const dirs: string[] = []

  afterEach(() => {
    // Best-effort cleanup; not asserting on it.
    for (const d of dirs) {
      try {
        // Node 14+ has rmSync; ignore failures in constrained envs.
        require('node:fs').rmSync(d, { recursive: true, force: true })
      } catch {
        /* noop */
      }
    }
    dirs.length = 0
  })

  it('writes a single-sheet xlsx when sheetPerTable is false', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dsh-test-'))
    dirs.push(dir)

    const result = exportMarkdownTablesToExcel({
      markdown: SAMPLE,
      outputDir: dir,
      fileName: 'out',
      sheetPerTable: false,
    })

    expect(result.tableCount).toBe(1)
    expect(result.sheetCount).toBe(1)
    expect(existsSync(result.file)).toBe(true)

    const wb = XLSX.readFile(result.file)
    const ws = wb.Sheets[wb.SheetNames[0]!]!
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][]
    expect(aoa[0]).toEqual(['Model', 'Acc'])
    expect(aoa[1]).toEqual(['A', '0.91'])
  })

  it('writes one sheet per table when sheetPerTable is true', () => {
    const md = [
      '| A | B |',
      '| --- | --- |',
      '| 1 | 2 |',
      '',
      '| X | Y |',
      '| --- | --- |',
      '| 3 | 4 |',
    ].join('\n')
    const dir = mkdtempSync(join(tmpdir(), 'dsh-test-'))
    dirs.push(dir)

    const result = exportMarkdownTablesToExcel({
      markdown: md,
      outputDir: dir,
      sheetPerTable: true,
    })

    expect(result.tableCount).toBe(2)
    expect(result.sheetCount).toBe(2)
  })

  it('throws when no table is present', () => {
    expect(() =>
      exportMarkdownTablesToExcel({ markdown: 'no tables here', outputDir: tmpdir() }),
    ).toThrow(/no markdown tables/i)
  })
})
