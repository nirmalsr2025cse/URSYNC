import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronRight, LayoutGrid, List as ListIcon, ClipboardList } from "lucide-react";
import OrganizationSearchCard from "../components/OrganizationSearchCard.jsx";
import TenderCard from "../components/TenderCard.jsx";
import TenderTable from "../components/TenderTable.jsx";
import TenderDetailsModal from "../components/TenderDetailsModal.jsx";
import Pagination from "../components/Pagination.jsx";
import { organizationTenderApi } from "../api/organizationTenderApi.js";

const PAGE_SIZE = 9;

const initialFilters = {
  organization: "",
  organizationType: "",
  tenderCategory: "",
  productCategory: "",
  expiry: "",
  district: "",
};

// Map the "Tender Expire" UI option to the backend's status enum
const expiryToStatus = {
  Open: "OPEN",
  "Closing Soon": "CLOSING SOON",
  Expired: "EXPIRED",
};

export default function TendersByOrganization() {
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [keyword, setKeyword] = useState("");
  const [tenders, setTenders] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedTender, setSelectedTender] = useState(null);

  const hasActiveFilters = useMemo(() => {
    return Object.values(appliedFilters).some((v) => v !== "");
  }, [appliedFilters]);

  const fetchTenders = useCallback(async (page = 1) => {
    setLoading(true);
    setError("");
    try {
      let response;

      if (keyword.trim()) {
        // Keyword search takes precedence (real-time search across multiple fields)
        response = await organizationTenderApi.search(keyword.trim());
        const data = response.data.data || [];
        setTenders(data);
        setTotal(data.length);
        setTotalPages(1);
        setCurrentPage(1);
      } else if (hasActiveFilters) {
        const backendFilters = {
          organization: appliedFilters.organization || undefined,
          organizationType: appliedFilters.organizationType || undefined,
          tenderCategory: appliedFilters.tenderCategory || undefined,
          productCategory: appliedFilters.productCategory || undefined,
          district: appliedFilters.district || undefined,
          status: appliedFilters.expiry ? expiryToStatus[appliedFilters.expiry] : undefined,
        };
        response = await organizationTenderApi.filter(backendFilters, page, PAGE_SIZE);
        setTenders(response.data.data || []);
        setTotal(response.data.total || 0);
        setTotalPages(response.data.totalPages || 1);
        setCurrentPage(response.data.page || 1);
      } else {
        response = await organizationTenderApi.getAll(page, PAGE_SIZE);
        setTenders(response.data.data || []);
        setTotal(response.data.total || 0);
        setTotalPages(response.data.totalPages || 1);
        setCurrentPage(response.data.page || 1);
      }
    } catch (err) {
      console.error(err);
      setError(
        "Unable to load tenders right now. Please check that the backend server is running and try again."
      );
      setTenders([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters, hasActiveFilters, keyword]);

  useEffect(() => {
    fetchTenders(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters, keyword]);

  const handleSearch = () => {
    setAppliedFilters(filters);
  };

  const handleReset = () => {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setKeyword("");
  };

  const handlePageChange = (page) => {
    fetchTenders(page);
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
        <span>Home</span>
        <ChevronRight size={13} />
        <span className="text-govblue-700 font-semibold">Tenders by Organization</span>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-govblue-900">Tenders by Organization</h1>
      <p className="text-sm text-slate-500 mt-1 mb-5">
        Search active tenders across Tamil Nadu by organization or department.
      </p>

      {/* Search & Filters */}
      <OrganizationSearchCard
        filters={filters}
        onFilterChange={setFilters}
        onSearch={handleSearch}
        onReset={handleReset}
      />

      {/* Real-time keyword search bar */}
      <div className="mt-4">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Quick search by Tender ID, Project Name, Organization, Department, or District..."
          className="w-full px-4 py-2.5 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-govblue-400 focus:border-govblue-400 bg-white shadow-card"
        />
      </div>

      {/* Results header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-6 mb-4">
        <div className="flex items-center gap-2">
          <ClipboardList size={20} className="text-rust-600" />
          <h2 className="text-lg font-bold text-rust-900">Organization Tender Results</h2>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <span className="bg-cream-100 text-rust-700 text-sm font-semibold px-4 py-1.5 rounded-full">
            {loading ? "Loading…" : `${total} tender${total === 1 ? "" : "s"} found`}
          </span>

          <div className="flex items-center gap-1.5 bg-white border border-rust-100 rounded-md p-1 shadow-card">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "grid"
                  ? "bg-rust-500 text-white"
                  : "text-rust-400 hover:bg-cream-100"
              }`}
              title="Grid View"
            >
              <LayoutGrid size={17} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "list"
                  ? "bg-rust-500 text-white"
                  : "text-rust-400 hover:bg-cream-100"
              }`}
              title="List View"
            >
              <ListIcon size={17} />
            </button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4 mb-4">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-72 bg-white rounded-2xl border border-rust-100 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && tenders.length === 0 && (
        <div className="bg-white rounded-2xl border border-rust-100 shadow-card p-10 text-center">
          <p className="text-rust-500 text-sm">
            No tenders found matching your search. Try adjusting filters or search terms.
          </p>
        </div>
      )}

      {/* Results: grid or table */}
      {!loading && !error && tenders.length > 0 && (
        <>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {tenders.map((tender) => (
                <TenderCard
                  key={tender._id || tender.tenderId}
                  tender={tender}
                  onViewDetails={setSelectedTender}
                />
              ))}
            </div>
          ) : (
            <TenderTable tenders={tenders} onViewDetails={setSelectedTender} />
          )}

          {!keyword.trim() && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}

      <TenderDetailsModal tender={selectedTender} onClose={() => setSelectedTender(null)} />
    </div>
  );
}
