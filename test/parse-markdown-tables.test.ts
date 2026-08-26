import { describe, expect, it } from 'vitest'
import { parseMarkdownTables } from '../src/parse-markdown-tables'

describe('parseMarkdownTables', () => {
  it('parses a simple 2-column table', () => {
    const md = [
      '# Report',
      '',
      '| Name | Score |',
      '| --- | --- |',
      '| Alice | 90 |',
      '| Bob | 85 |',
    ].join('\n')

    const tables = parseMarkdownTables(md)
    expect(tables).toHaveLength(1)
    expect(tables[0]!.headers).toEqual(['Name', 'Score'])
    expect(tables[0]!.rows).toEqual([
      ['Alice', '90'],
      ['Bob', '85'],
    ])
  })

  it('handles alignment markers (left/center/right)', () => {
    const md = [
      '| A | B | C |',
      '| :--- | :---: | ---: |',
      '| 1 | 2 | 3 |',
    ].join('\n')

    const tables = parseMarkdownTables(md)
    expect(tables).toHaveLength(1)
    expect(tables[0]!.headers).toEqual(['A', 'B', 'C'])
    expect(tables[0]!.rows).toEqual([['1', '2', '3']])
  })

  it('parses multiple tables separated by prose', () => {
    const md = [
      '| X | Y |',
      '| --- | --- |',
      '| 1 | 2 |',
      '',
      'Some text in between.',
      '',
      '| P | Q |',
      '| --- | --- |',
      '| 3 | 4 |',
    ].join('\n')

    const tables = parseMarkdownTables(md)
    expect(tables).toHaveLength(2)
    expect(tables[0]!.rows).toEqual([['1', '2']])
    expect(tables[1]!.rows).toEqual([['3', '4']])
  })

  it('returns no tables when there is no alignment row', () => {
    const md = ['| Name | Score |', 'just a row with a pipe | not a table |'].join('\n')
    expect(parseMarkdownTables(md)).toHaveLength(0)
  })

  it('extracts tables even when wrapped in a code fence', () => {
    const md = ['```markdown', '| H1 | H2 |', '| --- | --- |', '| a | b |', '```'].join('\n')
    const tables = parseMarkdownTables(md)
    expect(tables).toHaveLength(1)
    expect(tables[0]!.headers).toEqual(['H1', 'H2'])
  })

  it('honors escaped pipes inside cells', () => {
    const md = [
      '| Col A | Col B |',
      '| --- | --- |',
      '| a \\| b | c |',
    ].join('\n')
    const tables = parseMarkdownTables(md)
    expect(tables[0]!.rows[0]).toEqual(['a | b', 'c'])
  })

  it('pads short rows and truncates long rows to the header width', () => {
    const md = [
      '| A | B | C |',
      '| --- | --- | --- |',
      '| 1 | 2 |',
      '| 1 | 2 | 3 | 4 |',
    ].join('\n')
    const tables = parseMarkdownTables(md)
    expect(tables[0]!.rows[0]).toEqual(['1', '2', ''])
    expect(tables[0]!.rows[1]).toEqual(['1', '2', '3'])
  })

  it('reports the header line number', () => {
    const md = ['line1', '', '| A | B |', '| --- | --- |', '| 1 | 2 |'].join('\n')
    const tables = parseMarkdownTables(md)
    expect(tables[0]!.startLine).toBe(3)
  })
})
