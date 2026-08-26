// ==UserScript==
// @name         DSH Markdown Table → Excel Exporter
// @namespace    https://github.com/dsh-plugins/md-table-export
// @version      1.0.0
// @description  Add "导出 Excel" buttons to Markdown tables rendered in the DeepSeek Harness web conversation, and a floating "导出全部表格" button.
// @author       dsh-md-table-export
// @match        http://localhost/*
// @match        http://127.0.0.1/*
// @match        https://localhost/*
// @match        https://127.0.0.1/*
// @grant        none
// @require      https://cdn.sheetjs.com/xlsx-0.18.5/package/dist/xlsx.full.min.js
// ==/UserScript==

/*
 * Companion to the `dsh-md-table-export` host plugin.
 *
 * The dsh Web Client is a React bundle; adding a first-party conversation node
 * requires composing a client plugin into the web-app build. For an independent
 * developer the zero-build path is a userscript: it scans the rendered DOM for
 * <table> elements (the Web Client renders Markdown tables to HTML <table>),
 * wraps each with an "导出 Excel" button, and offers a floating button to
 * export every table on the page into one workbook (one sheet per table).
 *
 * If your dsh web runs on a different origin/port, add a matching @match line.
 */

;(function () {
  'use strict'

  const BTN_CLASS = 'dsh-md-export-btn'

  function style(el, css) {
    el.style.cssText += css
  }

  function makeButton(label, onClick) {
    const btn = document.createElement('button')
    btn.textContent = label
    btn.className = BTN_CLASS
    style(
      btn,
      'margin:4px 6px 4px 0;padding:3px 10px;font-size:12px;cursor:pointer;' +
        'border:1px solid #d0d7de;background:#f6f8fa;color:#1f2328;border-radius:6px;',
    )
    btn.addEventListener('click', function (e) {
      e.preventDefault()
      e.stopPropagation()
      onClick()
    })
    return btn
  }

  function exportTable(table, fileName) {
    try {
      const wb = XLSX.utils.table_to_book(table, { sheet: 'Table', raw: true })
      XLSX.writeFile(wb, fileName)
    } catch (err) {
      console.error('[dsh-md-table-export] export failed', err)
      window.alert('导出失败: ' + (err && err.message ? err.message : err))
    }
  }

  function processTable(table) {
    if (table.dataset.dshProcessed) return
    table.dataset.dshProcessed = '1'

    const wrap = document.createElement('div')
    wrap.style.cssText = 'margin:8px 0;'

    const bar = document.createElement('div')
    bar.style.cssText = 'margin-bottom:4px;'
    bar.appendChild(
      makeButton('导出 Excel', function () {
        exportTable(table, 'dsh-table.xlsx')
      }),
    )
    wrap.appendChild(bar)

    table.parentNode.insertBefore(wrap, table)
    wrap.appendChild(table)
  }

  function scan() {
    document.querySelectorAll('table').forEach(processTable)
  }

  function exportAll() {
    const tables = Array.prototype.slice
      .call(document.querySelectorAll('table'))
      .filter(function (t) {
        return !t.dataset.dshSkip
      })
    if (tables.length === 0) {
      window.alert('当前页面没有可导出的表格')
      return
    }
    const wb = XLSX.utils.book_new()
    tables.forEach(function (t, i) {
      const ws = XLSX.utils.table_to_sheet(t, { raw: true })
      XLSX.utils.book_append_sheet(wb, ws, ('Table' + (i + 1)).slice(0, 28))
    })
    XLSX.writeFile(wb, 'dsh-tables-all.xlsx')
  }

  function ensureToolbar() {
    if (document.getElementById('dsh-md-export-all')) return
    const btn = document.createElement('button')
    btn.id = 'dsh-md-export-all'
    btn.textContent = '导出全部表格为 Excel'
    style(
      btn,
      'position:fixed;right:16px;bottom:16px;z-index:2147483647;padding:9px 14px;' +
        'font-size:13px;cursor:pointer;background:#1f6feb;color:#fff;border:none;' +
        'border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.3);',
    )
    btn.addEventListener('click', exportAll)
    document.body.appendChild(btn)
  }

  function init() {
    ensureToolbar()
    scan()
    // Catch tables rendered during streaming / lazy hydration.
    const obs = new MutationObserver(function () {
      scan()
    })
    obs.observe(document.body, { childList: true, subtree: true })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
