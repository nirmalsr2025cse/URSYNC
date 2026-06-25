// src/components/Pagination.jsx
import React, { useState, useEffect } from 'react'

/**
 * Reusable Pagination component.
 *
 * Props:
 *   currentPage        — current active page (number)
 *   totalPages         — total number of pages (number)
 *   onPageChange       — (page: number) => void
 *   responsive         — boolean (default false). When true, exposes itemsPerPage
 *                        that auto-adjusts: 2 mobile / 4 tablet / 6 desktop.
 *                        Use the exported useResponsiveItemsPerPage() hook instead
 *                        if you need the value in the parent.
 */
export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  // Build visible page window: currentPage, currentPage+1, currentPage+2 (capped at totalPages)
  const getVisiblePages = () => {
    const pages = []
    const start = Math.max(1, currentPage)
    const end   = Math.min(totalPages, currentPage + 2)
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  }

  const visiblePages = getVisiblePages()

  return (
    <div className="flex items-center justify-center gap-1 mt-8 pb-4 flex-wrap">

      {/* Previous */}
      <button
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="flex items-center gap-1 px-2.5 py-2 rounded-lg border border-[#FFE5BF]
                   bg-white text-[#0A2240] text-sm font-medium
                   disabled:opacity-40 disabled:cursor-not-allowed
                   hover:bg-[#FFF2DB] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Previous
      </button>

      {/* Leading ellipsis */}
      {currentPage > 1 && (
        <span className="px-2 text-[#6B7A8D] font-semibold select-none">…</span>
      )}

      {/* Page buttons */}
      {visiblePages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={[
            'w-10 h-10 rounded-lg text-sm font-semibold transition-colors',
            page === currentPage
              ? 'bg-[#1A4A8C] text-white shadow-sm'
              : 'bg-white border border-[#FFE5BF] text-[#0A2240] hover:bg-[#FFF2DB]',
          ].join(' ')}
        >
          {page}
        </button>
      ))}

      {/* Trailing ellipsis */}
      {visiblePages[visiblePages.length - 1] < totalPages && (
        <span className="px-2 text-[#6B7A8D] font-semibold select-none">…</span>
      )}

      {/* Next */}
      <button
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="flex items-center gap-1 px-2.5 py-2 rounded-lg border border-[#FFE5BF]
                   bg-white text-[#0A2240] text-sm font-medium
                   disabled:opacity-40 disabled:cursor-not-allowed
                   hover:bg-[#FFF2DB] transition-colors"
      >
        Next
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}

/**
 * Hook: returns itemsPerPage that auto-adjusts on window resize.
 * Use this in any page that needs responsive pagination.
 *
 * Usage:
 *   const itemsPerPage = useResponsiveItemsPerPage()
 */
export function useResponsiveItemsPerPage(mobile = 2, tablet = 4, desktop = 6) {
  const getItems = () => {
    const w = window.innerWidth
    if (w < 640)  return mobile
    if (w < 1024) return tablet
    return desktop
  }

  const [itemsPerPage, setItemsPerPage] = useState(getItems)

  useEffect(() => {
    const handler = () => setItemsPerPage(getItems())
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return itemsPerPage
}