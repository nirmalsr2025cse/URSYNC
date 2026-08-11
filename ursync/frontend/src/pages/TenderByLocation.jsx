import React, { useState, useRef, useEffect, useMemo } from 'react'
import MapComponent from '../components/MapComponent'
import { getTendersByDistrict } from '../services/locationService'
import { TN_DISTRICTS, TN_TALUKS_BY_DISTRICT_NAME } from '../data/tnDistrictsTaluks'
import Pagination from '../components/Pagination'
import { useNavigate, useLocation } from 'react-router-dom'

// Status -> marker dot color. Ongoing = green, Upcoming = gold/yellow, Completed = navy.
const STATUS_MARKER_COLOR = {
  Ongoing: '#22C55E',
  Upcoming: '#F5B301',
  Completed: '#0A2240',
}

export default function TendersByLocation() {
  // ── District / Taluk selection state ─────────────────────────────────
  // Districts are 100% static — always show all of them, no API call,
  // no loading state, no dependency on anything else succeeding.
  const districts = TN_DISTRICTS // [{ id, name }]
  const [selectedDistrict, setSelectedDistrict]  = useState(null) // { id, name }

  const [taluks,        setTaluks]       = useState([]) // static list for the selected district
  const [selectedTaluk, setSelectedTaluk] = useState('')

  // ── Results state ───────────────────────────────────────────────────
  const [tenders,       setTenders]       = useState([])
  const [center,        setCenter]        = useState(null)
  const [tendersWithCoords, setTendersWithCoords] = useState([])
  const [activeMarkerId, setActiveMarkerId] = useState(null)
  const [loadingMap,    setLoadingMap]    = useState(false)
  const [loadingList,   setLoadingList]   = useState(false)
  const [error,         setError]         = useState(null)
  const [searched,      setSearched]      = useState(false)
  const [currentPage,   setCurrentPage]   = useState(1)
  const [activeTab,     setActiveTab]     = useState('all')

  const navigate = useNavigate()
  const location = useLocation()
  const rootPath = location.state?.rootPath || location.pathname

  const rowRefs = useRef({})

  // NOTE: Tender.status (see models/Tender.js) only ever holds one of
  // 'Ongoing' | 'Upcoming' | 'Completed'. Cancelled tenders are filtered
  // out entirely in fetchTenders() before they ever hit state, so they
  // never appear in this page, the tabs, the counts, or the map.
  // The tabs below must filter on those exact values — filtering on
  // 'Open' / 'Closing Soon' / 'Closed' (which never appear in the schema)
  // silently returns zero results.
  const tabTenders = activeTab === 'all'       ? tenders
                 : activeTab === 'ongoing'   ? tenders.filter((t) => t.status === 'Ongoing')
                 : activeTab === 'upcoming'  ? tenders.filter((t) => t.status === 'Upcoming')
                 : activeTab === 'completed' ? tenders.filter((t) => t.status === 'Completed')
                 : tenders

  const ITEMS_PER_PAGE = 10
  const totalPages = Math.ceil(tabTenders.length / ITEMS_PER_PAGE)

  // Map should only ever show points for whatever the active tab contains —
  // so both the list and the map stay in sync with the tab count.
  const tabTendersWithCoords = useMemo(
    () => tabTenders.filter((t) => t.latitude != null && t.longitude != null),
    [tabTenders]
  )

  // Markers rebuilt from the tab-filtered tenders, each colored by status.
  // MapComponent is expected to read `color` per place and paint the dot
  // with it — if it currently hardcodes marker color, that's the one
  // change needed on that component's side to pick this up.
  const markers = useMemo(
    () => tabTendersWithCoords.map((t) => ({
      lat: t.latitude,
      lng: t.longitude,
      title: t.title,
      color: STATUS_MARKER_COLOR[t.status] || '#1A4A8C',
    })),
    [tabTendersWithCoords]
  )

  // ── Fetch tenders for the current district/taluk selection ─────────
  // We send the district NAME (not the static slug id) since the backend
  // resolves tenders by matching the District collection's `name` field —
  // it never sees or needs our local static ids.
  const fetchTenders = async (districtName, taluk) => {
    setError(null)
    setLoadingMap(true)
    setLoadingList(true)
    setSearched(true)
    setActiveMarkerId(null)
    setActiveTab('all')

    const { data, error: fErr } = await getTendersByDistrict(districtName, taluk)

    setLoadingMap(false)
    setLoadingList(false)

    if (fErr) {
      setError(fErr)
      setTenders([])
      setTendersWithCoords([])
      setCenter(null)
      return
    }

    // Cancelled tenders are excluded here so they never show up anywhere
    // on this page — list, tabs/counts, or map markers.
    const list = (data.tenders || []).filter((t) => t.status !== 'Cancelled')
    setTenders(list)
    setCenter(data.center || null)
    setTendersWithCoords(list.filter((t) => t.latitude != null && t.longitude != null))
    setCurrentPage(1)
  }

  // ── District dropdown change ────────────────────────────────────────
  const handleDistrictChange = (e) => {
    const districtId = e.target.value

    if (!districtId) {
      setSelectedDistrict(null)
      setSelectedTaluk('')
      setTaluks([])
      return
    }

    const district = districts.find((d) => d.id === districtId)
    if (!district) return

    setSelectedDistrict(district)
    setSelectedTaluk('')
    setTaluks(TN_TALUKS_BY_DISTRICT_NAME[district.name] || [])

    fetchTenders(district.name, '')
  }

  // ── Taluk dropdown change ───────────────────────────────────────────
  const handleTalukChange = (e) => {
    const taluk = e.target.value
    setSelectedTaluk(taluk)
    if (selectedDistrict) fetchTenders(selectedDistrict.name, taluk)
  }

  const handleClearAll = () => {
    setSelectedDistrict(null)
    setSelectedTaluk('')
    setTaluks([])
    setTenders([])
    setTendersWithCoords([])
    setCenter(null)
    setActiveMarkerId(null)
    setError(null)
    setSearched(false)
    setCurrentPage(1)
    setActiveTab('all')
  }

  // ── Map marker click -> highlight + (gently) reveal matching list row ──
  // Index is looked up against tabTendersWithCoords since that's the exact
  // array the markers on the map were built from.
  //
  // IMPORTANT: block: 'nearest' (not 'center') is used deliberately here.
  // 'center' forces every scrollable ancestor — including the page and the
  // sidebar — to re-center on the row, which caused the whole page/sidebar
  // to jump on every marker click. 'nearest' only scrolls a container if
  // the row isn't already visible in it, so unrelated ancestors stay put.
  const handleMarkerClick = (idx) => {
    const tender = tabTendersWithCoords[idx]
    if (!tender) return
    setActiveMarkerId(tender.id)

    // If the highlighted tender isn't on the currently visible page, jump
    // to the page that contains it so the highlight is actually visible.
    const posInTab = tabTenders.findIndex((t) => t.id === tender.id)
    if (posInTab !== -1) {
      const pageForTender = Math.floor(posInTab / ITEMS_PER_PAGE) + 1
      if (pageForTender !== currentPage) setCurrentPage(pageForTender)
    }

    const el = rowRefs.current[tender.id]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  }

  const handleRowClick = (tender) => {
    setActiveMarkerId(tender.id)
    navigate('/tender-details-view/' + encodeURIComponent(tender.id), { state: { tender, fromPath: rootPath } })
  }

  const googleMapsUrl = (tender) => {
    if (tender.latitude != null && tender.longitude != null) {
      return `https://www.google.com/maps/search/?api=1&query=${tender.latitude},${tender.longitude}`
    }
    const q = encodeURIComponent([tender.village, tender.taluk, tender.location].filter(Boolean).join(', '))
    return `https://www.google.com/maps/search/?api=1&query=${q}`
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
            Search active tenders across Tamil Nadu by district and taluk.
          </p>
        </div>

        <nav className="text-xs text-tn-muted flex items-center gap-1.5" aria-label="Breadcrumb">
          <span>Home</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-tn-blue font-medium">Tenders by Location</span>
        </nav>
      </div>

      {/* ── Section 1: District + Taluk dropdowns ────────────────────────── */}
      <section className="bg-white rounded-xl border border-tn-border p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">

          {/* District dropdown */}
          <div className="flex-1">
            <label htmlFor="district-select" className="text-xs font-semibold text-tn-navy mb-1 block">
              District
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                <svg className="w-4 h-4 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <select
                id="district-select"
                value={selectedDistrict?.id || ''}
                onChange={handleDistrictChange}
                className="w-full appearance-none pl-10 pr-9 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all"
              >
                <option value="">Select a district</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 pr-3 flex items-center">
                <svg className="w-4 h-4 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Taluk dropdown */}
          <div className="flex-1">
            <label htmlFor="taluk-select" className="text-xs font-semibold text-tn-navy mb-1 block">
              Taluk <span className="font-normal text-tn-muted">(optional)</span>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                <svg className="w-4 h-4 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <select
                id="taluk-select"
                value={selectedTaluk}
                onChange={handleTalukChange}
                disabled={!selectedDistrict}
                className="w-full appearance-none pl-10 pr-9 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all disabled:bg-tn-light disabled:cursor-not-allowed"
              >
                <option value="">{selectedDistrict ? 'All taluks' : 'Select a district first'}</option>
                {taluks.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 pr-3 flex items-center">
                <svg className="w-4 h-4 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {selectedDistrict && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-tn-muted hover:text-tn-danger underline self-center sm:self-end mb-1"
            >
              Clear all
            </button>
          )}
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
          {markers.length > 0 && (
            <div className="flex items-center gap-3 text-xs text-tn-muted">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: STATUS_MARKER_COLOR.Ongoing }} />
                Ongoing
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: STATUS_MARKER_COLOR.Upcoming }} />
                Upcoming
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: STATUS_MARKER_COLOR.Completed }} />
                Completed
              </span>
              <span>{markers.length} on map</span>
            </div>
          )}
        </div>

        <MapComponent
          center={center}
          places={markers}
          activeIndex={activeMarkerId != null ? tabTendersWithCoords.findIndex((t) => t.id === activeMarkerId) : null}
          onMarkerClick={handleMarkerClick}
          loading={loadingMap}
        />
      </section>

      {/* ── Section 3: Tender list ────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-tn-navy flex items-center gap-2">
            <svg className="w-4 h-4 text-tn-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Tender Results
          </h2>
          {tenders.length > 0 && !loadingList && (
            <span className="text-xs font-medium text-tn-muted bg-tn-light
                             px-2.5 py-1 rounded-full border border-tn-border">
              {tenders.length} tender{tenders.length !== 1 ? 's' : ''} found
            </span>
          )}
        </div>

        {/* Loading skeleton rows */}
        {loadingList && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-tn-border p-4 animate-pulse">
                <div className="h-4 w-1/3 bg-tn-light rounded mb-2" />
                <div className="h-3 w-2/3 bg-tn-light rounded" />
              </div>
            ))}
          </div>
        )}

        {!loadingList && tenders.length > 0 && (
          <div className="overflow-x-auto mb-4 pb-1">
            <div className="inline-flex items-center bg-white border border-tn-border rounded-full p-1 shadow-sm gap-1 min-w-max">
              {[
                { id: 'all',       label: 'All',       count: tenders.length },
                { id: 'ongoing',   label: 'Ongoing',   count: tenders.filter((t) => t.status === 'Ongoing').length },
                { id: 'upcoming',  label: 'Upcoming',  count: tenders.filter((t) => t.status === 'Upcoming').length },
                { id: 'completed', label: 'Completed', count: tenders.filter((t) => t.status === 'Completed').length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setCurrentPage(1); setActiveMarkerId(null) }}
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

        {/* Results list */}
        {!loadingList && tenders.length > 0 && (
          <div key={currentPage} className="space-y-3 animate-fade-in">
            {tabTenders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((tender) => (
              <div
                key={tender.id}
                ref={(el) => { rowRefs.current[tender.id] = el }}
                className={[
                  'bg-white rounded-xl border p-4 flex items-center justify-between gap-4 transition-all',
                  activeMarkerId === tender.id
                    ? 'border-tn-blue ring-2 ring-tn-blue/30'
                    : 'border-tn-border hover:border-tn-blue/40',
                ].join(' ')}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: STATUS_MARKER_COLOR[tender.status] || '#1A4A8C' }}
                    />
                    <h3 className="font-semibold text-tn-navy text-sm truncate">{tender.title}</h3>
                    <span className={[
                      'text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0',
                      tender.status === 'Ongoing' ? 'bg-green-100 text-green-700'
                        : tender.status === 'Upcoming' ? 'bg-tn-light text-tn-blue'
                        : 'bg-gray-100 text-gray-500',
                    ].join(' ')}>
                      {tender.status}
                    </span>
                  </div>
                  <p className="text-xs text-tn-muted mt-1 line-clamp-2">{tender.description}</p>
                  <p className="text-[11px] text-tn-muted mt-1">
                    {[tender.village, tender.taluk, tender.location].filter(Boolean).join(', ')} · {tender.value}
                  </p>
                </div>

                {/* Navigation to /tender-details-view now happens ONLY from
                    the View button below — the row itself is no longer
                    clickable, and the Map link opens Google Maps directly. */}
                <div className="flex-shrink-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRowClick(tender)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-white
                               bg-tn-navy rounded-full px-3 py-1.5 hover:opacity-90 transition-opacity"
                  >
                    View
                  </button>

                  <a
                    href={googleMapsUrl(tender)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold text-tn-blue
                               border border-tn-border rounded-full px-3 py-1.5 hover:bg-tn-light transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Map
                  </a>
                </div>
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
        {!loadingList && searched && tenders.length === 0 && !error && (
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
              There are no active tenders matching {selectedDistrict?.name}
              {selectedTaluk ? `, ${selectedTaluk}` : ''}. Try a different district or taluk.
            </p>
          </div>
        )}

        {/* Pre-search empty state */}
        {!searched && !loadingList && (
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
              Select a district above to view active government tenders there — then narrow down by taluk.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}