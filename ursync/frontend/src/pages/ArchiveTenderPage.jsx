import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChevronRight, Archive as ArchiveIcon, Search } from "lucide-react";
import TenderCard, { TenderCardSkeleton } from "../components/TenderCard";
import Pagination from "../components/Pagination.jsx";
import { useNavigate, useLocation } from 'react-router-dom'
import { useApi } from '../api/client'

const PAGE_SIZE = 6;
const SEARCH_DEBOUNCE_MS = 350;

export default function ArchiveTenderPage() {
  const { apiFetch } = useApi()
  const [tenderId, setTenderId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [results, setResults] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeMarker, setActiveMarker] = useState(null);

  const navigate = useNavigate()
  const location = useLocation()
  const rootPath = location.state?.fromPath || location.pathname

  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);
  const isFirstRun = useRef(true);

  const fetchArchivedTenders = useCallback(async (query, page) => {
    const myRequestId = ++requestIdRef.current
    setError(null)
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (query) params.set('search', query)
      params.set('page', String(page))
      params.set('limit', String(PAGE_SIZE))

      const data = await apiFetch(`/tenders/archive?${params.toString()}`)
      if (myRequestId !== requestIdRef.current) return

      setResults(data.tenders || [])
      setTotalCount(data.totalCount || 0)
      setTotalPages(data.totalPages || 1)
      setActiveMarker(null)
    } catch (err) {
      if (myRequestId !== requestIdRef.current) return
      console.error('Archive search failed:', err)
      setError(err.message || 'Failed to load archived tenders. Please try again.')
      setResults([])
      setTotalCount(0)
      setTotalPages(1)
    } finally {
      if (myRequestId === requestIdRef.current) setLoading(false)
    }
  }, [apiFetch])

  // ── Load all archived tenders on mount ────────────────────────────────
  useEffect(() => {
    fetchArchivedTenders('', 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Auto-search: debounced on every keystroke ─────────────────────────
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setCurrentPage(1)
      fetchArchivedTenders(tenderId, 1)
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(debounceRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenderId])

  const handleReset = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setTenderId("")
    setCurrentPage(1)
    fetchArchivedTenders('', 1)
  };

  const handlePageChange = (page) => {
    setCurrentPage(page)
    fetchArchivedTenders(tenderId, page)
  };

  const hasQuery = tenderId.trim().length > 0;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-fade-in">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-display font-bold text-tn-navy">
            Tenders in Archive
          </h1>
          <p className="text-sm text-tn-muted mt-0.5">
            Browse previously closed and archived tenders across Tamil Nadu.
          </p>
        </div>

        <nav
          className="text-xs text-tn-muted flex items-center gap-1.5"
          aria-label="Breadcrumb"
        >
          <span>Home</span>
          <ChevronRight size={13} />
          <span className="text-tn-blue font-medium">Tenders in Archive</span>
        </nav>
      </div>

      {/* ── Search ───────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-tn-border p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
              <Search className="w-4 h-4 text-tn-muted" />
            </div>
            <input
              type="text"
              value={tenderId}
              onChange={(e) => setTenderId(e.target.value)}
              placeholder="Search by Tender ID or organisation name"
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all"
              aria-label="Search archived tenders"
            />
            {loading && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <div className="w-4 h-4 border-2 border-tn-blue border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          {hasQuery && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-tn-muted hover:text-tn-danger underline whitespace-nowrap self-center"
            >
              Clear all
            </button>
          )}
        </div>
      </section>

      {/* ── Results header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-tn-navy flex items-center gap-2">
          <ArchiveIcon className="w-4 h-4 text-tn-blue" />
          Archived Tender Results
        </h2>
        {!loading && (
          <span className="text-xs font-medium text-tn-muted bg-tn-light px-2.5 py-1 rounded-full border border-tn-border">
            {totalCount} tender{totalCount !== 1 ? "s" : ""} found
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-tn-danger" role="alert">
          {error}
        </div>
      )}

      {/* ── Loading skeletons ────────────────────────────────────────────── */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <TenderCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* ── Results grid ─────────────────────────────────────────────────── */}
      {!loading && results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          {results.map((tender, idx) => (
            <div key={tender.id} className="flex">
              <TenderCard
                tender={tender}
                className="flex-1"
                highlighted={activeMarker === idx}
                onClick={() => {
                  setActiveMarker(idx)
                  navigate('/tender-details-view/' + encodeURIComponent(tender.id), { state: { tender, fromPath: rootPath } })
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {!loading && results.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}

      {/* ── No results ───────────────────────────────────────────────────── */}
      {!loading && results.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-tn-border">
          <div className="w-14 h-14 rounded-full bg-tn-light flex items-center justify-center mb-4 border border-tn-border">
            <ArchiveIcon className="w-7 h-7 text-tn-muted" />
          </div>
          <h3 className="font-semibold text-tn-navy mb-1">No archived tenders found</h3>
          <p className="text-sm text-tn-muted max-w-xs">
            No archived tenders match your search. Try a different Tender ID or organisation name.
          </p>
          <button onClick={handleReset} className="mt-4 btn-secondary text-sm">
            Reset Search
          </button>
        </div>
      )}

    </div>
  );
}