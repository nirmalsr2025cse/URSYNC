import React, { useState, useRef } from 'react'
import MapComponent from '../components/MapComponent'
import LocationSelector from '../components/LocationSelector'
import TenderCard, { TenderCardSkeleton } from '../components/TenderCard'
import { getMockNearbyLocations } from '../services/locationService'
import { getMockTendersByLocation } from '../services/tenderService'
import Pagination from '../components/Pagination'

export default function TendersByLocation() {
  const [query,         setQuery]         = useState('')
  const [locationData,  setLocationData]  = useState(null)   // { center, places }
  const [tenders,       setTenders]       = useState([])
  const [activeMarker,  setActiveMarker]  = useState(null)
  const [loadingMap,    setLoadingMap]    = useState(false)
  const [loadingCards,  setLoadingCards]  = useState(false)
  const [error,         setError]         = useState(null)
  const [searched,      setSearched]      = useState(false)
  const [currentPage,   setCurrentPage]   = useState(1)
  const [activeTab, setActiveTab] = useState('all')

  const tabTenders = activeTab === 'all'         ? tenders
                 : activeTab === 'open'        ? tenders.filter((t) => t.status === 'Open')
                 : activeTab === 'closingsoon' ? tenders.filter((t) => t.status === 'Closing Soon')
                 : activeTab === 'closed'      ? tenders.filter((t) => t.status === 'Closed')
                 : tenders

  const ITEMS_PER_PAGE = 6
  const totalPages = Math.ceil(tabTenders.length / ITEMS_PER_PAGE)
  const paginated  = tenders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const cardRefs = useRef({})

  const handleSearch = async (e) => {
    e?.preventDefault()
    if (!query.trim()) return

    setError(null)
    setLoadingMap(true)
    setLoadingCards(true)
    setSearched(true)
    setActiveMarker(null)
    setActiveTab('all')

    // Fetch location data and tenders in parallel
    const [locResult, tenderResult] = await Promise.all([
      getMockNearbyLocations(query),     // swap with getNearbyLocations(query) for real API
      getMockTendersByLocation(query),   // swap with getTendersByLocation(query)  for real API
    ])

    setLoadingMap(false)

    if (locResult.error) {
      setError(locResult.error)
      setLocationData(null)
    } else {
      setLocationData(locResult.data)
    }

    setTenders(tenderResult.data || [])
    setCurrentPage(1)  // Reset to first page on new search
    setLoadingCards(false)
  }

  const handleClear = () => {
    setQuery('')
    setLocationData(null)
    setTenders([])
    setActiveMarker(null)
    setError(null)
    setSearched(false)
    setCurrentPage(1)
    setActiveTab('all')
  }

  const handleMarkerClick = (idx) => {
    setActiveMarker(idx)
    const el = cardRefs.current[idx]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const handleCardClick = (idx) => {
    setActiveMarker(idx)
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-fade-in">

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-display font-bold text-tn-navy">
            Tenders by Location
          </h1>
          <p className="text-sm text-tn-muted mt-0.5">
            Search active tenders across Tamil Nadu by district or locality.
          </p>
        </div>

        {/* Breadcrumb */}
        <nav className="text-xs text-tn-muted flex items-center gap-1.5" aria-label="Breadcrumb">
          <span>Home</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-tn-blue font-medium">Tenders by Location</span>
        </nav>
      </div>

      {/* ── Section 1: Search ──────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-tn-border p-5 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
              <svg className="w-4 h-4 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter location to search tenders (e.g., Tiruchirappalli)"
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all"
              aria-label="Location search"
            />
          </div>
          <button
            type="submit"
            disabled={loadingMap || !query.trim()}
            className="btn-primary flex items-center justify-center gap-2 min-w-[120px]"
          >
            {loadingMap ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Searching…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search
              </>
            )}
          </button>
          {query.trim() && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-tn-muted hover:text-tn-danger underline self-center"
            >
              Clear all
            </button>
          )}
        </form>

        {/* Quick chips */}
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="text-xs text-tn-muted mr-1 self-center">Popular:</span>
          {['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem'].map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => { setQuery(city); }}
              className="text-xs px-3 py-1 rounded-full border border-tn-border
                         bg-tn-light text-tn-blue hover:bg-tn-blue hover:text-white
                         transition-colors font-medium"
            >
              {city}
            </button>
          ))}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200
                          rounded-lg px-4 py-3 text-sm text-tn-danger" role="alert">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {error}
          </div>
        )}
      </section>

      {/* ── Section 2: Map ─────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-tn-navy flex items-center gap-2">
            <svg className="w-4 h-4 text-tn-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Location Map
          </h2>
          {locationData?.places?.length > 0 && (
            <span className="text-xs text-tn-muted">
              Click a marker to highlight the matching tender card
            </span>
          )}
        </div>

        <MapComponent
          center={locationData?.center}
          places={locationData?.places || []}
          activeIndex={activeMarker}
          onMarkerClick={handleMarkerClick}
          loading={loadingMap}
        />
      </section>

      {/* ── Section 4: Directions (above cards is fine per spec) ───────── */}
      {searched && (
        <LocationSelector
          places={locationData?.places || []}
          disabled={loadingMap}
        />
      )}

      {/* ── Section 3: Tender Cards ────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-tn-navy flex items-center gap-2">
            <svg className="w-4 h-4 text-tn-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Tender Results
          </h2>
          {tenders.length > 0 && !loadingCards && (
            <span className="text-xs font-medium text-tn-muted bg-tn-light
                             px-2.5 py-1 rounded-full border border-tn-border">
              {tenders.length} tender{tenders.length !== 1 ? 's' : ''} found
            </span>
          )}
        </div>

        {/* Loading skeletons */}
        {loadingCards && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => <TenderCardSkeleton key={i} />)}
          </div>
        )}

        {!loadingCards && tenders.length > 0 && (
          <div className="overflow-x-auto mb-4 pb-1">
            <div className="inline-flex items-center bg-white border border-tn-border rounded-full p-1 shadow-sm gap-1 min-w-max">
              {[
                { id: 'all',          label: 'All',          count: tenders.length },
                { id: 'open',         label: 'Open',         count: tenders.filter((t) => t.status === 'Open').length },
                { id: 'closingsoon',  label: 'Closing Soon', count: tenders.filter((t) => t.status === 'Closing Soon').length },
                { id: 'closed',       label: 'Closed',       count: tenders.filter((t) => t.status === 'Closed').length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setCurrentPage(1) }}
                  className={[
                    'flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200',
                    activeTab === tab.id
                      ? 'bg-tn-navy text-white shadow-sm'
                      : 'text-tn-blue border border-tn-border bg-transparent hover:bg-tn-light',
                  ].join(' ')}
                >
                  {tab.label}
                  <span className={[
                    'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                    activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-tn-light text-tn-navy',
                  ].join(' ')}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results grid */}
        {!loadingCards && tenders.length > 0 && (
          <div key={currentPage} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch animate-fade-in">
            {tabTenders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((tender, idx) => (
              <div
                key={tender.id}
                ref={(el) => { cardRefs.current[idx] = el }}
                className="flex"
              >
                <TenderCard
                  tender={tender}
                  highlighted={activeMarker === idx}
                  onClick={() => handleCardClick(idx)}
                  className="flex-1"
                />
              </div>
            ))}
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />

        {/* Empty state — after search, no results */}
        {!loadingCards && searched && tenders.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-tn-light flex items-center
                            justify-center mb-4 border border-tn-border">
              <svg className="w-7 h-7 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="font-semibold text-tn-navy mb-1">No tenders found</h3>
            <p className="text-sm text-tn-muted max-w-xs">
              There are no active tenders matching "{query}". Try a different location or district name.
            </p>
          </div>
        )}

        {/* Pre-search empty state */}
        {!searched && !loadingCards && (
          <div className="flex flex-col items-center justify-center py-16 text-center
                          bg-white rounded-xl border border-tn-border border-dashed">
            <div className="w-14 h-14 rounded-full bg-tn-light flex items-center
                            justify-center mb-4 border border-tn-border">
              <svg className="w-7 h-7 text-tn-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-tn-navy mb-1">Search for tenders</h3>
            <p className="text-sm text-tn-muted max-w-xs">
              Enter a district, city, or locality name above to view active government tenders in that area.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}