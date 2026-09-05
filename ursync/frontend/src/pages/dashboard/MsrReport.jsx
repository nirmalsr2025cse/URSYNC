// src/pages/dashboard/MsrReport.jsx
// Monthly Report → MSR Report → Districts Data Analysis.
// FY/Month are controlled by the Dashboard sidebar (see DashboardSidebar's
// 'monthly' branch) and passed in as props — this component no longer owns
// that state itself, so the sidebar and the table headline always agree.
import React, { useState, useEffect, useMemo } from 'react'
import Icon from '../../components/Icon'
import Pagination from '../../components/Pagination'
import { useApi } from '../../api/client'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const COLUMN_GROUPS = [
  { label: 'During the Month of', span: 2 },
  { label: 'Previous Month', span: 2 },
  { label: 'From April Up to Selected Month', span: 2 },
  { label: 'Cumulative since inception', span: 2 },
  { label: 'Bids Awarded During Selected Financial Year', span: 2 },
]

const COLUMNS = [
  { key: 'sno', label: 'S.No.', sortable: true },
  { key: 'name', label: 'Districts', sortable: true },
  { key: 'monthTenders', label: 'No. Of Tenders', sortable: true },
  { key: 'monthValue', label: 'Value of Tenders (Rs. in Crores)', sortable: true, decimals: 2 },
  { key: 'prevTenders', label: 'No. Of Tenders', sortable: true },
  { key: 'prevValue', label: 'Value of Tenders (Rs. in Crores)', sortable: true, decimals: 2 },
  { key: 'cumFyTenders', label: 'No. Of Tenders', sortable: true },
  { key: 'cumFyValue', label: 'Value of Tenders (Rs. in Crores)', sortable: true, decimals: 2 },
  { key: 'inceptionTenders', label: 'No. Of Tenders', sortable: true },
  { key: 'inceptionValue', label: 'Value of Tenders (Rs. in Crores)', sortable: true, decimals: 2 },
  { key: 'awardedTenders', label: 'No. Of Tenders', sortable: true },
  { key: 'awardedValue', label: 'Contract Value (Rs. in Crores)', sortable: true, decimals: 2 },
]

const ENTRIES_OPTIONS = [10, 25, 50, 100]

function formatNumber(value, decimals = 0) {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export default function MsrReport({ msrYear = '2024-25', msrMonth = 'May' }) {
  const { apiFetch } = useApi()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [entriesPerPage, setEntriesPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    let isMounted = true
    async function fetchData() {
      try {
        setLoading(true)
        const res = await apiFetch(`/dashboard/msr-report?year=${encodeURIComponent(msrYear)}&month=${encodeURIComponent(msrMonth)}`)
        if (isMounted && res?.success && Array.isArray(res.data)) {
          setData(res.data)
        }
      } catch (err) {
        console.error('Failed to fetch MSR report data:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchData()
    return () => {
      isMounted = false
    }
  }, [apiFetch, msrYear, msrMonth])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let rows = q ? data.filter((r) => r.name.toLowerCase().includes(q)) : data
    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const va = a[sortKey], vb = b[sortKey]
        const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return rows
  }, [data, search, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / entriesPerPage))
  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage
    return filtered.slice(start, start + entriesPerPage)
  }, [filtered, currentPage, entriesPerPage])

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setCurrentPage(1)
  }

  function handleSearchChange(value) {
    setSearch(value)
    setCurrentPage(1)
  }

  function handleEntriesChange(value) {
    setEntriesPerPage(Number(value))
    setCurrentPage(1)
  }

  function handleExportExcel() {
    if (!filtered || filtered.length === 0) return

    const header1 = [
      'S.No.',
      'Districts',
      'During the Month of',
      '',
      'Previous Month',
      '',
      'From April Up to Selected Month',
      '',
      'Cumulative since inception',
      '',
      'Bids Awarded During Selected Financial Year',
      '',
    ]

    const header2 = [
      '',
      '',
      'No. Of Tenders',
      'Value of Tenders (Rs. in Crores)',
      'No. Of Tenders',
      'Value of Tenders (Rs. in Crores)',
      'No. Of Tenders',
      'Value of Tenders (Rs. in Crores)',
      'No. Of Tenders',
      'Value of Tenders (Rs. in Crores)',
      'No. Of Tenders',
      'Contract Value (Rs. in Crores)',
    ]

    const rows = filtered.map((r, idx) => [
      idx + 1,
      r.name,
      r.monthTenders,
      r.monthValue,
      r.prevTenders,
      r.prevValue,
      r.cumFyTenders,
      r.cumFyValue,
      r.inceptionTenders,
      r.inceptionValue,
      r.awardedTenders,
      r.awardedValue,
    ])

    const wsData = [
      [`Districts Data Analysis - Fin Year ${msrYear} (${msrMonth})`],
      [],
      header1,
      header2,
      ...rows,
    ]

    const ws = XLSX.utils.aoa_to_sheet(wsData)
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
      { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } },
      { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } },
      { s: { r: 2, c: 2 }, e: { r: 2, c: 3 } },
      { s: { r: 2, c: 4 }, e: { r: 2, c: 5 } },
      { s: { r: 2, c: 6 }, e: { r: 2, c: 7 } },
      { s: { r: 2, c: 8 }, e: { r: 2, c: 9 } },
      { s: { r: 2, c: 10 }, e: { r: 2, c: 11 } },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Districts Data')
    XLSX.writeFile(wb, `MSR_Districts_Data_Analysis_${msrYear}_${msrMonth}.xlsx`)
  }

  function handleExportPdf() {
    if (!filtered || filtered.length === 0) return

    const doc = new jsPDF('landscape', 'pt', 'a4')

    doc.setFontSize(13)
    doc.setTextColor(10, 34, 64)
    doc.text(`Districts Data Analysis - Fin Year ${msrYear} (${msrMonth})`, 30, 32)
    doc.setFontSize(8.5)
    doc.setTextColor(107, 122, 141)
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 30, 46)

    const head = [
      [
        { content: 'S.No.', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Districts', rowSpan: 2, styles: { valign: 'middle', halign: 'left' } },
        { content: 'During the Month of', colSpan: 2, styles: { halign: 'center' } },
        { content: 'Previous Month', colSpan: 2, styles: { halign: 'center' } },
        { content: 'From April Up to Selected Month', colSpan: 2, styles: { halign: 'center' } },
        { content: 'Cumulative since inception', colSpan: 2, styles: { halign: 'center' } },
        { content: 'Bids Awarded During Selected FY', colSpan: 2, styles: { halign: 'center' } },
      ],
      [
        { content: 'No.', styles: { halign: 'right' } },
        { content: 'Value (Cr)', styles: { halign: 'right' } },
        { content: 'No.', styles: { halign: 'right' } },
        { content: 'Value (Cr)', styles: { halign: 'right' } },
        { content: 'No.', styles: { halign: 'right' } },
        { content: 'Value (Cr)', styles: { halign: 'right' } },
        { content: 'No.', styles: { halign: 'right' } },
        { content: 'Value (Cr)', styles: { halign: 'right' } },
        { content: 'No.', styles: { halign: 'right' } },
        { content: 'Value (Cr)', styles: { halign: 'right' } },
      ],
    ]

    const body = filtered.map((r, idx) => [
      idx + 1,
      r.name,
      formatNumber(r.monthTenders),
      formatNumber(r.monthValue, 2),
      formatNumber(r.prevTenders),
      formatNumber(r.prevValue, 2),
      formatNumber(r.cumFyTenders),
      formatNumber(r.cumFyValue, 2),
      formatNumber(r.inceptionTenders),
      formatNumber(r.inceptionValue, 2),
      formatNumber(r.awardedTenders),
      formatNumber(r.awardedValue, 2),
    ])

    autoTable(doc, {
      startY: 56,
      head: head,
      body: body,
      theme: 'grid',
      headStyles: {
        fillColor: [10, 34, 64],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [10, 34, 64],
      },
      alternateRowStyles: {
        fillColor: [244, 248, 252],
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 26 },
        1: { halign: 'left', cellWidth: 80 },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right' },
        8: { halign: 'right' },
        9: { halign: 'right' },
        10: { halign: 'right' },
        11: { halign: 'right' },
      },
      margin: { top: 30, left: 24, right: 24, bottom: 24 },
    })

    doc.save(`MSR_Districts_Data_Analysis_${msrYear}_${msrMonth}.pdf`)
  }

  function handlePrint() {
    if (!filtered || filtered.length === 0) return

    const printWindow = window.open('', '_blank', 'width=1100,height=750')
    if (!printWindow) return

    const rowsHtml = filtered
      .map(
        (r, i) => `
        <tr style="background-color: ${i % 2 === 0 ? '#F4F8FC' : '#FFFFFF'};">
          <td style="padding: 6px 8px; border: 1px solid #D1D5DB; text-align: center;">${i + 1}</td>
          <td style="padding: 6px 8px; border: 1px solid #D1D5DB; font-weight: 600;">${r.name}</td>
          <td style="padding: 6px 8px; border: 1px solid #D1D5DB; text-align: right;">${formatNumber(r.monthTenders)}</td>
          <td style="padding: 6px 8px; border: 1px solid #D1D5DB; text-align: right;">${formatNumber(r.monthValue, 2)}</td>
          <td style="padding: 6px 8px; border: 1px solid #D1D5DB; text-align: right;">${formatNumber(r.prevTenders)}</td>
          <td style="padding: 6px 8px; border: 1px solid #D1D5DB; text-align: right;">${formatNumber(r.prevValue, 2)}</td>
          <td style="padding: 6px 8px; border: 1px solid #D1D5DB; text-align: right;">${formatNumber(r.cumFyTenders)}</td>
          <td style="padding: 6px 8px; border: 1px solid #D1D5DB; text-align: right;">${formatNumber(r.cumFyValue, 2)}</td>
          <td style="padding: 6px 8px; border: 1px solid #D1D5DB; text-align: right;">${formatNumber(r.inceptionTenders)}</td>
          <td style="padding: 6px 8px; border: 1px solid #D1D5DB; text-align: right;">${formatNumber(r.inceptionValue, 2)}</td>
          <td style="padding: 6px 8px; border: 1px solid #D1D5DB; text-align: right;">${formatNumber(r.awardedTenders)}</td>
          <td style="padding: 6px 8px; border: 1px solid #D1D5DB; text-align: right;">${formatNumber(r.awardedValue, 2)}</td>
        </tr>
      `
      )
      .join('')

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Districts Data Analysis - Fin Year ${msrYear} (${msrMonth})</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 16px; color: #0A2240; }
            h2 { margin: 0 0 4px 0; color: #0A2240; font-size: 16px; }
            p.sub { margin: 0 0 14px 0; color: #6B7A8D; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th { background-color: #0A2240; color: #FFFFFF; padding: 5px 6px; border: 1px solid #0A2240; font-weight: 600; }
            @media print {
              body { padding: 0; }
              @page { size: landscape; margin: 8mm; }
            }
          </style>
        </head>
        <body>
          <h2>Districts Data Analysis - Fin Year ${msrYear} (${msrMonth})</h2>
          <p class="sub">Generated from E-Procurement Portal on ${new Date().toLocaleDateString('en-IN')}</p>
          <table>
            <thead>
              <tr>
                <th rowspan="2" style="text-align: center;">S.No.</th>
                <th rowspan="2" style="text-align: left;">Districts</th>
                <th colspan="2" style="text-align: center;">During the Month of</th>
                <th colspan="2" style="text-align: center;">Previous Month</th>
                <th colspan="2" style="text-align: center;">From April Up to Selected Month</th>
                <th colspan="2" style="text-align: center;">Cumulative since inception</th>
                <th colspan="2" style="text-align: center;">Bids Awarded During Selected Financial Year</th>
              </tr>
              <tr>
                <th style="text-align: right;">No. Of Tenders</th>
                <th style="text-align: right;">Value (Rs. in Cr)</th>
                <th style="text-align: right;">No. Of Tenders</th>
                <th style="text-align: right;">Value (Rs. in Cr)</th>
                <th style="text-align: right;">No. Of Tenders</th>
                <th style="text-align: right;">Value (Rs. in Cr)</th>
                <th style="text-align: right;">No. Of Tenders</th>
                <th style="text-align: right;">Value (Rs. in Cr)</th>
                <th style="text-align: right;">No. Of Tenders</th>
                <th style="text-align: right;">Value (Rs. in Cr)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(htmlContent)
    printWindow.document.close()
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-tn-blue text-white px-4 py-2.5 text-sm font-semibold">
        MSR Report
      </div>

      <div className="inline-block px-4 py-2 rounded-full bg-red-500 text-white text-sm font-semibold">
        Districts Data Analysis
      </div>

      <div className="bg-white rounded-2xl border border-tn-border p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="font-bold text-tn-navy text-sm flex items-center gap-1.5">
            <Icon name="doc" className="w-4 h-4 text-tn-blue" />
            Districts Data Analysis - Fin Year {msrYear} ({msrMonth})
          </h3>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 rounded-md border border-tn-border text-xs font-semibold text-tn-navy hover:bg-tn-light transition-colors"
            >
              Excel
            </button>
            <button
              onClick={handleExportPdf}
              className="px-3 py-1.5 rounded-md border border-tn-border text-xs font-semibold text-tn-navy hover:bg-tn-light transition-colors"
            >
              PDF
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-md border border-tn-border text-xs font-semibold text-tn-navy hover:bg-tn-light transition-colors"
            >
              Print
            </button>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <label className="text-xs text-tn-muted flex items-center gap-1.5">
              Show
              <select
                value={entriesPerPage}
                onChange={(e) => handleEntriesChange(e.target.value)}
                className="border border-tn-border rounded-md px-2 py-1 text-xs text-tn-navy"
              >
                {ENTRIES_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              entries
            </label>
            <label className="text-xs text-tn-muted flex items-center gap-1.5">
              Search:
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="border border-tn-border rounded-md px-2 py-1 text-xs text-tn-navy w-40"
                placeholder="District name"
              />
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-tn-navy text-white">
                <th rowSpan={2} className="px-3 py-2 text-left align-middle whitespace-nowrap">
                  <SortableHeader col={COLUMNS[0]} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th rowSpan={2} className="px-3 py-2 text-left align-middle whitespace-nowrap">
                  <SortableHeader col={COLUMNS[1]} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                </th>
                {COLUMN_GROUPS.map((g) => (
                  <th key={g.label} colSpan={g.span} className="px-3 py-2 text-center border-l border-white/20 whitespace-nowrap">
                    {g.label}
                  </th>
                ))}
              </tr>
              <tr className="bg-tn-navy text-white">
                {COLUMNS.slice(2).map((col) => (
                  <th key={col.key} className="px-3 py-2 text-right border-l border-white/20 whitespace-nowrap">
                    <SortableHeader col={col} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-3 py-12 text-center text-tn-muted">
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-tn-blue border-t-transparent rounded-full animate-spin mr-2" />
                      Loading MSR report data…
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {pageRows.map((row, i) => (
                    <tr key={row.sno} className={i % 2 === 0 ? 'bg-tn-light/40' : 'bg-white'}>
                      <td className="px-3 py-2 text-tn-muted">{row.sno}</td>
                      <td className="px-3 py-2 text-tn-navy font-medium whitespace-nowrap">{row.name}</td>
                      {COLUMNS.slice(2).map((col) => (
                        <td key={col.key} className="px-3 py-2 text-right text-tn-navy">
                          {formatNumber(row[col.key], col.decimals || 0)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {pageRows.length === 0 && (
                    <tr>
                      <td colSpan={COLUMNS.length} className="px-3 py-8 text-center text-tn-muted">
                        No matching records found.
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>
    </div>
  )
}

function SortableHeader({ col, sortKey, sortDir, onSort, align = 'left' }) {
  const isActive = sortKey === col.key
  return (
    <button
      onClick={() => col.sortable && onSort(col.key)}
      className={`flex items-center gap-1 font-semibold ${align === 'right' ? 'ml-auto flex-row-reverse' : ''} ${col.sortable ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <span>{col.label}</span>
      {col.sortable && (
        <span className="text-[10px] opacity-80">
          {isActive ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      )}
    </button>
  )
}