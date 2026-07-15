// src/components/dashboard/DataTable.jsx
// Generic "Show N entries / Search / sortable columns" table, matching the
// reference mock's Organization Wise view. Reusable for any future
// table-only Dashboard sub-tab — just pass different columns/rows.
import React, { useState, useMemo, useEffect } from 'react'
import Pagination from '../Pagination'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

export default function DataTable({ columns, rows, searchKeys }) {
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0])
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState(columns[0]?.key)
  const [sortDir, setSortDir] = useState('asc')
  const [currentPage, setCurrentPage] = useState(1)

  const filtered = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.trim().toLowerCase()
    return rows.filter((row) =>
      (searchKeys || columns.map((c) => c.key)).some((key) =>
        String(row[key] ?? '').toLowerCase().includes(q)
      )
    )
  }, [rows, search, searchKeys, columns])

  const sorted = useMemo(() => {
    const copy = [...filtered]
    copy.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av))
    })
    return copy
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))

  // Whenever the search term, page size, sort, or the underlying rows
  // change, the previous currentPage may no longer be valid (e.g. it was
  // page 4 of a 6-page list and a search just narrowed it to 2 pages) —
  // reset back to page 1 rather than showing an out-of-range blank page.
  useEffect(() => {
    setCurrentPage(1)
  }, [search, pageSize, sortKey, sortDir, rows])

  const visible = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <label className="flex items-center gap-2 text-xs text-tn-muted">
          Show
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="border border-tn-border rounded-md px-2 py-1 text-xs text-tn-navy focus:outline-none focus:ring-1 focus:ring-tn-blue/40"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          entries
        </label>

        <label className="flex items-center gap-2 text-xs text-tn-muted">
          Search:
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-tn-border rounded-md px-2 py-1 text-xs text-tn-navy w-48 focus:outline-none focus:ring-1 focus:ring-tn-blue/40"
          />
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-tn-border">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-tn-blue text-white">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className={`px-3 py-2.5 font-semibold whitespace-nowrap cursor-pointer select-none ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <span className="text-[9px] opacity-80">
                      {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-6 text-center text-tn-muted">
                  No matching records found.
                </td>
              </tr>
            ) : (
              visible.map((row, i) => (
                <tr key={row.sNo ?? i} className={i % 2 === 0 ? 'bg-white' : 'bg-tn-light/50'}>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-3 py-2 text-tn-navy whitespace-nowrap ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                    >
                      {col.format ? col.format(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-tn-muted">
        Showing {visible.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
        {' '}to {(currentPage - 1) * pageSize + visible.length} of {filtered.length} entries
        {filtered.length !== rows.length ? ` (filtered from ${rows.length} total)` : ''}
      </p>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  )
}