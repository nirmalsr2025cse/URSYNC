// src/pages/CreateSavedTenders.jsx
import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MOCK_SAVED_TENDERS, STATUS_CONFIG, PRIORITY_CONFIG, TENDER_CATEGORIES } from '../data/tenderMockData'
import {useRole} from '../components/RoleContext'
import Pagination, { useResponsiveItemsPerPage } from '../components/Pagination'

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatAmount(amt) {
  return '₹ ' + amt
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const sc = STATUS_CONFIG[status] || STATUS_CONFIG['Draft']
  return (
    <span className={['inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border', sc.bg, sc.text, sc.border].join(' ')}>
      <span className={['w-1.5 h-1.5 rounded-full flex-shrink-0', sc.dot].join(' ')} />
      {status}
    </span>
  )
}

// ── Priority Badge ────────────────────────────────────────────────────────────
function PriorityBadge({ priority }) {
  const pc = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG['Low']
  return (
    <span className={['text-[10px] font-semibold px-2 py-0.5 rounded-full', pc.bg, pc.text].join(' ')}>
      {priority}
    </span>
  )
}

// ── Saved Tender Card ─────────────────────────────────────────────────────────
function SavedTenderCard({ tender, onView, onEdit, onDelete }) {
  return (
    <div className="bg-white border border-[#FFE5BF] rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
      <div className="h-48 overflow-hidden bg-[#FFF2DB]">
        <img
            src={tender.image}
            alt={tender.projectName}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
        />
        </div>
      {/* Top color bar */}
      <div className={['h-1 w-full', STATUS_CONFIG[tender.status]?.dot.replace('bg-', 'bg-') || 'bg-gray-400'].join(' ')} />

      <div className="p-4 flex flex-col flex-1 gap-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <StatusBadge status={tender.status} />
          <PriorityBadge priority={tender.priority} />
        </div>

        {/* ID */}
        <p className="text-[10px] font-mono text-[#6B7A8D] uppercase tracking-wide">{tender.id}</p>

        {/* Project name */}
        <h3 className="text-sm font-bold text-[#0A2240] leading-snug line-clamp-2">{tender.projectName}</h3>

        {/* Description */}
        <p className="text-xs text-[#6B7A8D] line-clamp-2 leading-relaxed">{tender.description}</p>

        {/* Meta */}
        <div className="space-y-1.5 text-xs text-[#6B7A8D] pt-2 border-t border-[#FFE5BF]">
          <MetaRow icon="building" label={tender.department} />
          <MetaRow icon="tag"      label={tender.category + ' · ' + tender.tenderType} />
          <MetaRow icon="location" label={tender.district + ', ' + tender.village} />
          <div className="flex items-center justify-between pt-1">
            <MetaRow icon="calendar" label={'Start: ' + formatDate(tender.startDate)} />
            <MetaRow icon="calendar" label={'End: ' + formatDate(tender.endDate)} />
          </div>
        </div>

        {/* Amount + Last Updated */}
        <div className="flex items-center justify-between pt-1 border-t border-[#FFE5BF]">
          <p className="text-sm font-extrabold text-[#0A2240]">{formatAmount(tender.amount)}</p>
          <p className="text-[10px] text-[#6B7A8D]">Updated {formatDate(tender.lastUpdated)}</p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => onView(tender)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#FFF2DB] text-[#0A2240] border border-[#FFE5BF] hover:bg-[#FFE5BF] transition-colors"
          >
            <EyeIcon /> View
          </button>
          <button
            onClick={() => onEdit(tender)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#1A4A8C] text-white hover:bg-[#0A2240] transition-colors"
          >
            <EditIcon /> Edit
          </button>
          <button
            onClick={() => onDelete(tender)}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 transition-colors flex-shrink-0"
            title="Delete"
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CreateSavedTenders() {
  const navigate = useNavigate()
  const { role } = useRole();
  console.log('Current role:', role); // Debugging line to check the current role 
  const [tenders, setTenders]     = useState(MOCK_SAVED_TENDERS)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState('All')
  const [catFilter, setCat]       = useState('All')
  const [toast, setToast]         = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = useResponsiveItemsPerPage()
  console.log("Total Mock Tenders:", MOCK_SAVED_TENDERS.length);

  // Show toast
  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }
  const visibleTenders = tenders.filter((tender) => {
    if (role === 'department_head') {
      return (
        tender.createdByRole === 'department_employee' ||
        tender.createdByRole === 'department_head'
      );
    }

    else if (role === 'department_employee') {
      return tender.createdByRole === 'department_employee';
    }

    return true;
  });
  // Filtered list
  const filtered = useMemo(() => {
    return visibleTenders.filter((tender) => {
      const matchesSearch =
        tender.projectName.toLowerCase().includes(search.toLowerCase()) ||
        tender.department.toLowerCase().includes(search.toLowerCase()) ||
        tender.id.toLowerCase().includes(search.toLowerCase()) ||
        tender.district.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === 'All' || tender.status === statusFilter;

      const matchesCategory =
        catFilter === 'All' || tender.category === catFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [visibleTenders, search, statusFilter, catFilter]);

   const handleView = (tender) => {
    navigate('/tender-view', {
      state: {
        tender,
        role,
      },
    });
  };

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const paginatedTenders = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );


  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, catFilter, role, itemsPerPage]);

  
  function handleEdit(tender) {
    navigate('/create-tender', { state: { tender } })
  }

  function confirmDelete(tender) {
    setDeleteModal(tender)
  }

  function handleDelete() {
    setTenders(prev => prev.filter(t => t.id !== deleteModal.id))
    setDeleteModal(null)
    showToast('Tender deleted successfully.', 'error')
  }

  const statusOptions = ['All', 'Draft', 'Pending Approval', 'Sent to Head', 'Sent to Administrator', 'Approved', 'Rejected']
  const categoryOptions = ['All', ...TENDER_CATEGORIES]


  return (
    <div className="p-4 lg:p-6 space-y-5 relative">

      {/* ── Toast ─────────────────────────────────────────────────────── */}
      {toast && (
        <div className={[
          'fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold',
          'flex items-center gap-2 animate-fade-in',
          toast.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        ].join(' ')}>
          {toast.type === 'error'
            ? <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
            : <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
          }
          {toast.msg}
        </div>
      )}

      {/* ── Delete Modal ───────────────────────────────────────────────── */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4 mx-auto">
              <TrashIcon className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="text-base font-bold text-[#0A2240] text-center mb-2">Delete Tender</h3>
            <p className="text-sm text-[#6B7A8D] text-center mb-6">
              Are you sure you want to delete <span className="font-semibold text-[#0A2240]">"{deleteModal.projectName}"</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border border-[#FFE5BF] text-[#0A2240] hover:bg-[#FFF2DB] transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#F62440] text-white hover:bg-red-600 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-[#0A2240]">Create & Saved Tenders</h1>
          <p className="text-sm text-[#6B7A8D] mt-0.5">Manage all your department tenders in one place.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#6B7A8D] bg-white border border-[#FFE5BF] px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {filtered.length} tender{filtered.length !== 1 ? 's' : ''} found
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7A8D]"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by project name, ID, district..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] placeholder-[#6B7A8D] focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7A8D] hover:text-[#0A2240]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => setStatus(e.target.value)}
          className="px-4 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all cursor-pointer"
        >
          {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Category filter */}
        <select
          value={catFilter}
          onChange={e => setCat(e.target.value)}
          className="px-4 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all cursor-pointer"
        >
          {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Clear filters */}
        {(search || statusFilter !== 'All' || catFilter !== 'All') && (
          <button
            onClick={() => { setSearch(''); setStatus('All'); setCat('All') }}
            className="px-4 py-2.5 text-sm font-semibold text-[#F62440] border border-red-200 rounded-xl hover:bg-red-50 transition-colors whitespace-nowrap"
          >
            Clear All
          </button>
        )}
      </div>

      {/* ── Cards Grid ─────────────────────────────────────────────────── */}
      {filtered.length > 0 ? (
        <div key={currentPage} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch pb-24 animate-fade-in">
          {paginatedTenders.map(tender => (
            <SavedTenderCard
              key={tender.id}
              tender={tender}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={confirmDelete}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[#FFE5BF] border-dashed">
          <div className="w-14 h-14 rounded-full bg-[#FFF2DB] flex items-center justify-center mb-4 border border-[#FFE5BF]">
            <svg className="w-6 h-6 text-[#6B7A8D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="font-bold text-[#0A2240] mb-1">No tenders found</p>
          <p className="text-sm text-[#6B7A8D]">Try adjusting your search or filters.</p>
        </div>
      )}
      {/* ── Pagination Controls ──────────────────────────────────────── */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
      {/* ── Floating Action Button ──────────────────────────────────────── */}
      <button
        onClick={() => navigate('/create-tender')}
        className="fixed bottom-8 right-8 z-40 w-14 h-14 rounded-full bg-[#F62440] text-white shadow-lg flex items-center justify-center hover:bg-red-600 hover:scale-110 hover:shadow-xl transition-all duration-200 active:scale-95"
        title="Create New Tender"
        aria-label="Create New Tender"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  )
}

// ── Small Icon Components ─────────────────────────────────────────────────────
function MetaRow({ icon, label }) {
  const icons = {
    building: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />,
    tag:      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />,
    location: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></>,
    calendar: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
  }
  return (
    <div className="flex items-start gap-1.5">
      <svg className="w-3 h-3 mt-px flex-shrink-0 text-[#1A4A8C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {icons[icon]}
      </svg>
      <span className="leading-snug truncate">{label}</span>
    </div>
  )
}

function EyeIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )
}

function TrashIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}