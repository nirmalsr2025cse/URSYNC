// src/pages/dashboard/MsrReport.jsx
// Monthly Report → MSR Report → Districts Data Analysis.
// FY/Month are controlled by the Dashboard sidebar (see DashboardSidebar's
// 'monthly' branch) and passed in as props — this component no longer owns
// that state itself, so the sidebar and the table headline always agree.
import React, { useState, useMemo } from 'react'
import Icon from '../../components/Icon'
import Pagination from '../../components/Pagination'
import { MSR_DISTRICTS_DATA } from '../../data/dashboardMockData'

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
  return Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export default function MsrReport({ msrYear, msrMonth }) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [entriesPerPage, setEntriesPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let rows = q ? MSR_DISTRICTS_DATA.filter((r) => r.name.toLowerCase().includes(q)) : MSR_DISTRICTS_DATA
    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const va = a[sortKey], vb = b[sortKey]
        const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return rows
  }, [search, sortKey, sortDir])

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
            <button className="px-3 py-1.5 rounded-md border border-tn-border text-xs font-semibold text-tn-navy hover:bg-tn-light">
              Excel
            </button>
            <button className="px-3 py-1.5 rounded-md border border-tn-border text-xs font-semibold text-tn-navy hover:bg-tn-light">
              PDF
            </button>
            <button className="px-3 py-1.5 rounded-md border border-tn-border text-xs font-semibold text-tn-navy hover:bg-tn-light">
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