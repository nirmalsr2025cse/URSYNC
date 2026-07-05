import React, { useState, useMemo } from "react";
import { ChevronRight, Archive as ArchiveIcon } from "lucide-react";
import ArchiveSearchCard from "../components/ArchiveSearchCard";
import TenderCard, { TenderCardSkeleton } from "../components/TenderCard";
import Pagination from "../components/Pagination.jsx";
import { tenders } from "../data/tenders.js";
import { useNavigate , useLocation } from 'react-router-dom'

// Flatten { ongoing, upcoming, completed } → single flat array
const allTenders = Object.values(tenders).flat();

const PAGE_SIZE = 6;

export default function ArchiveTenderPage() {
  const [tenderId, setTenderId] = useState("");
  const [appliedTenderId, setAppliedTenderId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [activeMarker, setActiveMarker] = useState(null);
  const navigate = useNavigate()
  const location = useLocation()

  const rootPath = location.state?.fromPath||location.pathname

  // All filtering happens client-side against the local sample data.
  const filteredTenders = useMemo(() => {
    if (appliedTenderId === null) return [];
    let result = [...allTenders];
    const idQuery = appliedTenderId.trim().toLowerCase();
    if (idQuery) {
      result = result.filter(
        (t) =>
          t.id.toLowerCase().includes(idQuery) ||
          t.organization.toLowerCase().includes(idQuery)
      );
    }
    return result;
  }, [appliedTenderId]);

  const totalPages = Math.max(1, Math.ceil(filteredTenders.length / PAGE_SIZE));

  const paginatedTenders = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredTenders.slice(start, start + PAGE_SIZE);
  }, [filteredTenders, currentPage]);

  const handleTenderIdSearch = () => {
    if (tenderId.trim().length === 0) {
      setAppliedTenderId(null);
      setSearched(false);
      return;
    }
    setActiveMarker(null);
    setLoading(true);
    setSearched(true);
    setTimeout(() => {
      setAppliedTenderId(tenderId);
      setCurrentPage(1);
      setLoading(false);
    }, 600);
  };

  const handleReset = () => {
    setTenderId("");
    setAppliedTenderId(null);
    setCurrentPage(1);
    setSearched(false);
    setActiveMarker(null);
  };

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
      <ArchiveSearchCard
        tenderId={tenderId}
        onTenderIdChange={setTenderId}
        onTenderIdSearch={handleTenderIdSearch}
        onReset={handleReset}
      />

      {/* ── Results header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-tn-navy flex items-center gap-2">
          <ArchiveIcon className="w-4 h-4 text-tn-blue" />
          Archived Tender Results
        </h2>
        {!loading && searched && filteredTenders.length > 0 && (
          <span className="text-xs font-medium text-tn-muted bg-tn-light px-2.5 py-1 rounded-full border border-tn-border">
            {filteredTenders.length} tender{filteredTenders.length !== 1 ? "s" : ""} found
          </span>
        )}
      </div>

      {/* ── Loading skeletons ────────────────────────────────────────────── */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <TenderCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* ── Results grid ─────────────────────────────────────────────────── */}
      {!loading && searched && filteredTenders.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          {paginatedTenders.map((tender, idx) => (
            <div key={tender.id} className="flex">
              <TenderCard
                tender={tender}
                className="flex-1"
                highlighted={activeMarker === idx}
                onClick={() => {
                  setActiveMarker(idx)
                  navigate('/tender-details-view/' + encodeURIComponent(tender.id), { state: { tender , fromPath:rootPath} })
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {!loading && searched && filteredTenders.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* ── No results after search ──────────────────────────────────────── */}
      {!loading && searched && filteredTenders.length === 0 && (
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

      {/* ── Pre-search empty state ────────────────────────────────────────── */}
      {!searched && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-dashed border-tn-border">
          <div className="w-14 h-14 rounded-full bg-tn-light flex items-center justify-center mb-4 border border-tn-border">
            <ArchiveIcon className="w-7 h-7 text-tn-blue" />
          </div>
          <h3 className="font-semibold text-tn-navy mb-1">Search for archived tenders</h3>
          <p className="text-sm text-tn-muted max-w-xs">
            Enter a Tender ID or organisation name above to find archived tenders.
          </p>
        </div>
      )}

    </div>
  );
}