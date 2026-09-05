// src/pages/Approvement.jsx
// TENDERS are wired to the real backend:
//   GET   /api/approvement/tenders
//   PATCH /api/approvement/tenders/:id/approve
//   PATCH /api/approvement/tenders/:id/reject
// department_head sees only tenders 'Sent to Head' addressed to them;
// administrator sees only tenders 'Sent to Administrator' addressed to
// them — both enforced server-side (see approvementController.js).
//
// BIDDERS are now ALSO wired to the real backend:
//   GET   /api/approvement/bidders
// This lists tenders ready for bidder finalization — isDocumentVerified
// true, isFinalizedBidders false, applicationDeadline still in the
// future — enforced server-side (see getBidderFinalizationTenders in
// approvementController.js). Once a tender's isFinalizedBidders flips to
// true, it stops coming back from this endpoint and disappears from this
// page on the next fetch/refresh.
//
// NOTE: "Bidders" cards on this page are tender-shaped (not individual
// bidder-company records) — Approve/Reject actions were intentionally
// dropped for this tab since finalizing bidders isn't a binary
// approve/reject action. Use "View" / "Finalize Bidders" to open the
// tender's bidder finalization flow at /finalbidder/:id.

import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Pagination, { useResponsiveItemsPerPage } from '../components/Pagination'
import { useRole, ROLES } from "../components/RoleContext";
import { useApi } from '../api/client'
import {
  TENDER_APPROVAL_STATUS_CONFIG,
  PRIORITY_CONFIG,
  APPROVAL_TENDER_CATEGORIES,
  APPROVAL_TENDER_STATUSES,
} from '../constants/approvementConstants';

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status, config }) {
  const sc = config[status] || Object.values(config)[0]
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

// ── Meta Row ──────────────────────────────────────────────────────────────────
function MetaRow({ icon, label }) {
  const icons = {
    building: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />,
    tag:      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />,
    location: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></>,
    calendar: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    money:    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
    exp:      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />,
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

// ── Tender Card ───────────────────────────────────────────────────────────────
// Card itself no longer navigates on click — only the explicit View button does.
// Delete icon is restricted to department_employee.
function TenderApprovementCard({ tender, role, onView, onEdit, onConfirmApprove, onConfirmReject, onDelete }) {
  return (
    <div
      className="bg-white border border-[#FFE5BF] rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col h-full"
    >
      <div className="h-48 overflow-hidden bg-[#FFF2DB]">
        <img src={tender.image} alt={tender.projectName} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
      </div>
      <div className={['h-1 w-full', TENDER_APPROVAL_STATUS_CONFIG[tender.status]?.dot || 'bg-gray-400'].join(' ')} />
      <div className="p-4 flex flex-col flex-1 gap-3">
        <div className="flex items-start justify-between gap-2">
          <StatusBadge status={tender.status} config={TENDER_APPROVAL_STATUS_CONFIG} />
          <PriorityBadge priority={tender.priority} />
        </div>
        <p className="text-[10px] font-mono text-[#6B7A8D] uppercase tracking-wide">{tender.id}</p>
        <h3 className="text-sm font-bold text-[#0A2240] leading-snug line-clamp-2">{tender.projectName}</h3>
        <p className="text-xs text-[#6B7A8D] line-clamp-2 leading-relaxed">{tender.description}</p>
        <div className="space-y-1.5 text-xs text-[#6B7A8D] pt-2 border-t border-[#FFE5BF]">
          <MetaRow icon="building" label={tender.department} />
          <MetaRow icon="tag" label={tender.category + ' · ' + tender.tenderType} />
          <MetaRow icon="location" label={tender.district} />
          <div className="flex items-center justify-between pt-1">
            <MetaRow icon="calendar" label={'Start: ' + formatDate(tender.startDate)} />
            <MetaRow icon="calendar" label={'End: ' + formatDate(tender.endDate)} />
          </div>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-[#FFE5BF]">
          <p className="text-sm font-extrabold text-[#0A2240]">₹ {tender.amount}</p>
          <p className="text-[10px] text-[#6B7A8D]">Updated {formatDate(tender.lastUpdated)}</p>
        </div>

        {/* ── Action row: pinned to bottom via mt-auto so buttons line up ── */}
        {/* across cards regardless of description/meta length above them. ── */}
        {/* Every button MUST stopPropagation. ── */}
        <div className="flex items-center gap-2 pt-1 mt-auto">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onConfirmReject(tender)
            }}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-tn-sky text-white border border-tn-sky hover:bg-tn-sky transition-colors">
            <RejectIcon /> Reject
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              onView(tender)
            }}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#FFF2DB] text-[#0A2240] border border-[#FFE5BF] hover:bg-[#FFE5BF] transition-colors"
          >
            <EyeIcon /> View
          </button>

          {role === ROLES.ADMINISTRATOR ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onConfirmApprove(tender)
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-tn-blue text-white transition-colors"
            >
              <ApproveIcon /> Approve
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(tender)
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#1A4A8C] text-white hover:bg-[#0A2240] transition-colors"
            >
              <EditIcon /> Edit
            </button>
          )}

          {role === ROLES.DEPARTMENT_HEAD && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(tender)
              }}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 transition-colors flex-shrink-0"
              title="Delete"
            >
              <TrashIcon />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Bidder Card ───────────────────────────────────────────────────────────────
// Renders tenders that are ready for bidder finalization (real backend
// data — see GET /api/approvement/bidders). No delete icon, no
// Approve/Reject here: finalizing bidders isn't a binary approve/reject
// action, it opens the finalization flow via "Finalize Bidders".
function BidderApprovementCard({ bidder, onView, onEdit }) {
  return (
    <div className="bg-white border border-[#FFE5BF] rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col h-full">
      <div className="h-48 overflow-hidden bg-[#FFF2DB]">
        <img src={bidder.image} alt={bidder.projectName} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
      </div>
      <div className="h-1 w-full bg-[#1A4A8C]" />
      <div className="p-4 flex flex-col flex-1 gap-3">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
            Ready for Bidder Finalization
          </span>
        </div>
        <p className="text-[10px] font-mono text-[#6B7A8D] uppercase tracking-wide">{bidder.id}</p>
        <h3 className="text-sm font-bold text-[#0A2240] leading-snug line-clamp-2">{bidder.projectName}</h3>
        <p className="text-xs text-[#6B7A8D] line-clamp-2 leading-relaxed">{bidder.description}</p>
        <div className="space-y-1.5 text-xs text-[#6B7A8D] pt-2 border-t border-[#FFE5BF]">
          <MetaRow icon="building" label={bidder.department} />
          <MetaRow icon="tag" label={bidder.category} />
          <MetaRow icon="location" label={bidder.district} />
          <MetaRow icon="calendar" label={'Deadline: ' + formatDate(bidder.applicationDeadline)} />
          <MetaRow icon="exp" label={'Approved applicants: ' + (bidder.approvedApplicationCount ?? 0)} />
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-[#FFE5BF]">
          <p className="text-sm font-extrabold text-[#0A2240]">₹ {bidder.amount}</p>
          <p className="text-[10px] text-[#6B7A8D]">Updated {formatDate(bidder.lastUpdated)}</p>
        </div>
        {/* ── Action row: pinned to bottom via mt-auto so buttons line up ── */}
        <div className="flex items-center gap-2 pt-1 mt-auto">
          <button onClick={() => onView(bidder)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#FFF2DB] text-[#0A2240] border border-[#FFE5BF] hover:bg-[#FFE5BF] transition-colors">
            <ApproveIcon /> Approve
          </button>

          <button onClick={() => onEdit(bidder)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#1A4A8C] text-white hover:bg-[#0A2240] transition-colors">
            <EditIcon /> Finalize Bidders
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="bg-white border border-[#FFE5BF] rounded-2xl overflow-hidden animate-pulse">
      <div className="h-48 bg-[#FFF2DB]" />
      <div className="h-1 bg-[#FFE5BF]" />
      <div className="p-4 space-y-3">
        <div className="flex justify-between">
          <div className="h-5 w-24 bg-[#FFE5BF] rounded-full" />
          <div className="h-5 w-16 bg-[#FFE5BF] rounded-full" />
        </div>
        <div className="h-3 w-32 bg-[#FFE5BF] rounded" />
        <div className="h-4 w-full bg-[#FFE5BF] rounded" />
        <div className="h-4 w-3/4 bg-[#FFE5BF] rounded" />
        <div className="space-y-1.5 pt-2 border-t border-[#FFE5BF]">
          <div className="h-3 w-full bg-[#FFE5BF] rounded" />
          <div className="h-3 w-2/3 bg-[#FFE5BF] rounded" />
          <div className="h-3 w-3/4 bg-[#FFE5BF] rounded" />
        </div>
        <div className="h-7 w-full bg-[#FFE5BF] rounded-lg" />
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Approvement() {
  const navigate    = useNavigate()
  const location    = useLocation()
  const itemsPerPage = useResponsiveItemsPerPage()
  const rootPath    = location.state?.fromPath || location.pathname
  const { apiFetch } = useApi()

  const [activeTab,      setActiveTab]      = useState('tenders')
  const [animating,      setAnimating]      = useState(false)
  const [loading,        setLoading]        = useState(false)
  const [search,         setSearch]         = useState('')
  const [statusFilter,   setStatusFilter]   = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [currentPage,    setCurrentPage]    = useState(1)

  // Tenders: real backend data (CreateTender / approval workflow).
  const [approvalTenders, setApprovalTenders] = useState([]);
  const [tendersLoading,  setTendersLoading]  = useState(true);
  const [tendersError,    setTendersError]    = useState(null);

  // Bidders: real backend data (Tender model — ready for bidder finalization).
  const [approvalBidders, setApprovalBidders] = useState([]);
  const [biddersLoading,  setBiddersLoading]  = useState(true);
  const [biddersError,    setBiddersError]    = useState(null);

  const [approveModal, setApproveModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);

  const [deleteModal, setDeleteModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [toast, setToast] = useState(null);

  const { role } = useRole();

  // ── Fetch tenders for the Approvement queue ───────────────────────────────
  // Backend scopes this per-role already (department_head -> Sent to Head
  // addressed to them; administrator -> Sent to Administrator addressed to
  // them), so the frontend just renders whatever comes back.
  function fetchApprovementTenders() {
    setTendersLoading(true)
    setTendersError(null)
    apiFetch('/approvement/tenders')
      .then((res) => {
        setApprovalTenders(res.data || [])
      })
      .catch((err) => {
        setTendersError(err.message || 'Failed to load tenders for approvement.')
      })
      .finally(() => {
        setTendersLoading(false)
      })
  }

  // ── Fetch tenders ready for bidder finalization ───────────────────────────
  // Backend scopes this already (isDocumentVerified: true,
  // isFinalizedBidders: false, applicationDeadline in the future), so the
  // frontend just renders whatever comes back. Once a tender's
  // isFinalizedBidders flips to true server-side, it stops being returned
  // here — refetch (e.g. after returning from the finalize flow) to drop
  // it from the list.
  function fetchBidderFinalizationTenders() {
    setBiddersLoading(true)
    setBiddersError(null)
    apiFetch('/approvement/bidders')
      .then((res) => {
        setApprovalBidders(res.data || [])
      })
      .catch((err) => {
        setBiddersError(err.message || 'Failed to load bidder finalization queue.')
      })
      .finally(() => {
        setBiddersLoading(false)
      })
  }

  useEffect(() => {
    fetchApprovementTenders()
    fetchBidderFinalizationTenders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const categoryOptions = activeTab === 'tenders'
    ? ['All', ...APPROVAL_TENDER_CATEGORIES]
    : ['All', ...new Set(approvalBidders.map(b => b.category).filter(Boolean))]

  const statusOptions = APPROVAL_TENDER_STATUSES

  function switchTab(id) {
    if (id === activeTab) return
    setAnimating(true)
    setLoading(true)
    setSearch(''); setStatusFilter('All'); setCategoryFilter('All'); setCurrentPage(1)
    setTimeout(() => {
      setActiveTab(id)
      setAnimating(false)
      setLoading(false)
    }, 200)
  }

  function handleClear() {
    setSearch(''); setStatusFilter('All'); setCategoryFilter('All'); setCurrentPage(1)
  }

  const filtered = useMemo(() => {
    let data = activeTab === "tenders" ? approvalTenders : approvalBidders;

    // Both tabs are already correctly scoped server-side:
    //   tenders  -> "Sent to Head" / "Sent to Administrator" addressed to
    //               this exact user.
    //   bidders  -> isDocumentVerified true, isFinalizedBidders false,
    //               applicationDeadline still in the future.
    // No extra client-side status filter needed for either tab.

    return data.filter((item) => {
        const q = search.trim().toLowerCase();

        const matchesSearch = !q || (
            (item.id || '').toLowerCase().includes(q) ||
            (item.projectName || '').toLowerCase().includes(q) ||
            (item.department || '').toLowerCase().includes(q) ||
            (item.district || '').toLowerCase().includes(q)
        );

        const matchesCategory =
        categoryFilter === "All" || item.category === categoryFilter;

        return matchesSearch && matchesCategory;
    });
    }, [
    activeTab,
    approvalTenders,
    approvalBidders,
    search,
    categoryFilter,
    ]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginated  = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filtered.slice(start, start + itemsPerPage)
  }, [filtered, currentPage, itemsPerPage])

  useEffect(() => { setCurrentPage(1) }, [search, statusFilter, categoryFilter, activeTab])

  // Tenders go to /tender-view with the tender data + role + fromPath so
  // TenderView's Edit button (and the Sidebar's fromPath chain) keep working.
  //
  // Bidders tab "View" -> FinalBidder page in read-only "view" mode
  // (shows every application for the tender, no Approve button).
  // Bidders tab card's `id` is the tender's human-readable code
  // (t.tenderCode — see formatBidderFinalizationTender in
  // approvementController.js), which is what the FinalBidder route +
  // backend lookup (/api/finalbidders/by-tender/:tenderCode) expect.
  function handleView(item) {
    if (activeTab === 'bidders') {
      navigate('/finalbidder/' + encodeURIComponent(item.id), {
        state: { tender: item, fromPath: rootPath, initialView: 'main' },
      })
      return
    }
    navigate('/tender-view/'+ encodeURIComponent(item.id), { state: { tender: item, role, fromPath: rootPath } })
  }

  function handleEdit(item) {
    if (activeTab === 'bidders') {
      navigate('/finalbidder/' + encodeURIComponent(item.id), {
        state: { tender: item, fromPath: rootPath, initialView: 'final' },
      })
      return
    }
    // CreateTender.jsx's edit form expects `id` to be the real Mongo _id
    // (it becomes tenderRecordId, used directly in PUT/PATCH URLs). The
    // Approvement queue's `id` field is the human-readable tender code
    // instead (e.g. "TN/PWD/2026/001") — swap in `recordId` here so Save
    // and Send-to-Administrator hit a valid ObjectId route. `tenderId`
    // (the business code, shown read-only on the form) is untouched.
    const tenderForEdit = { ...item, id: item.recordId }
    navigate('/create-tender/'+ encodeURIComponent(item.id), {
      state: { tender: tenderForEdit, type: activeTab, fromPath: rootPath },
    })
  }

  function confirmApprove(tender) {
    setApproveModal(tender);
    }

    function handleApprove() {
    // Approve is only wired for the Tenders tab — Bidders has no
    // approve/reject action (see BidderApprovementCard).
    const target = approveModal
    setApproveModal(null)

    apiFetch(`/approvement/tenders/${target.recordId}/approve`, { method: 'PATCH' })
      .then(() => {
        showToast(`Tender "${target.id}" approved successfully.`, "success")
        // Approved tenders leave the approvement queue entirely, so just
        // remove it from the local list rather than re-fetching everything.
        setApprovalTenders(prev => prev.filter(t => t.recordId !== target.recordId))
      })
      .catch((err) => {
        showToast(err.message || 'Failed to approve tender.', 'error')
      })
    }

    function confirmReject(tender) {
        setRejectReason('')
        setRejectModal(tender);
    }

    function handleReject() {
        // Reject is only wired for the Tenders tab — Bidders has no
        // approve/reject action (see BidderApprovementCard).
        const reason = rejectReason.trim()
        if (!reason) {
          showToast('Please enter a reason for rejection.', 'error')
          return
        }

        const target = rejectModal
        setRejectModal(null)

        apiFetch(`/approvement/tenders/${target.recordId}/reject`, {
          method: 'PATCH',
          body: JSON.stringify({ reason }),
        })
          .then(() => {
            showToast(`Tender "${target.id}" rejected successfully.`, "error")
            setApprovalTenders(prev => prev.filter(t => t.recordId !== target.recordId))
          })
          .catch((err) => {
            showToast(err.message || 'Failed to reject tender.', 'error')
          })
    }

  const hasFilters = search || statusFilter !== 'All' || categoryFilter !== 'All'

  const tenderCount = approvalTenders.length
  const bidderCount = approvalBidders.length

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function confirmDelete(item) {
    setDeleteModal(item);
    }

    function handleDelete() {
    // NOTE: no delete endpoint was requested for the Approvement queue —
    // this still only updates local state. Wire this to a real
    // DELETE/soft-delete endpoint if department heads should be able to
    // delete from here. Delete is Tenders-tab only (see
    // TenderApprovementCard — DEPARTMENT_HEAD only); Bidders has no
    // delete icon at all.
    setApprovalTenders(prev =>
      prev.filter(t => t.recordId !== deleteModal.recordId)
    );

    setDeleteModal(null);
    showToast("Deleted successfully.", "error");
    }
  return (
    <div className="p-4 lg:p-6 space-y-5 relative animate-fade-in">
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

      {/* ── Delete Modal (Tenders tab only) ───────────────────────────── */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4 mx-auto">
              <TrashIcon className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="text-base font-bold text-[#0A2240] text-center mb-2">Delete Item</h3>
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

      {approveModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-fade-in">

            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-4 mx-auto">
                <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                />
                </svg>
            </div>

            <h3 className="text-lg font-bold text-[#0A2240] text-center mb-2">
                Approve Tender
            </h3>

            <p className="text-sm text-[#6B7A8D] text-center leading-6 mb-6">
                Are you sure you want to approve this tender?
                <br />
                <span className="font-bold text-[#0A2240]">
                {approveModal.id}
                </span>
                <br /><br />
                Once approved, this tender will be marked as
                <span className="font-semibold">
                {" "}Approved
                </span>
                {" "}and cannot be edited.
            </p>

            <div className="flex gap-3">

                <button
                onClick={() => setApproveModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border border-[#FFE5BF] text-[#0A2240] hover:bg-[#FFF2DB] transition-colors"
                >
                Cancel
                </button>

                <button
                onClick={handleApprove}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-tn-blue text-white transition-colors"
                >
                Confirm
                </button>

            </div>

            </div>
        </div>
        )}

        {rejectModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">

            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <RejectIcon />
            </div>

            <h3 className="text-lg font-bold text-center text-[#0A2240]">
                Reject Tender
            </h3>

            <p className="text-sm text-center text-[#6B7A8D] mt-3">
                Are you sure you want to reject
                <br />
                <span className="font-bold text-[#0A2240]">
                {rejectModal.id}
                </span>
                ?
            </p>

            <div className="mt-4 text-left">
                <label className="block text-xs font-semibold text-[#0A2240] mb-1.5">
                    Reason for rejection <span className="text-[#F62440]">*</span>
                </label>
                <textarea
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    rows={3}
                    placeholder="Explain why this tender is being rejected..."
                    className="w-full px-4 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] placeholder-[#6B7A8D] focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition-all resize-none"
                />
            </div>

            <div className="flex gap-3 mt-6">
                <button
                onClick={() => setRejectModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#FFE5BF]"
                >
                Cancel
                </button>

                <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                Confirm
                </button>
            </div>

            </div>
        </div>
        )}

      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-display font-bold text-tn-navy">Approvement</h1>
          <p className="text-sm text-tn-muted mt-0.5">
            Review and approve tenders and bidder finalization requests.
          </p>
        </div>
        <nav className="flex items-center gap-1.5 text-xs text-tn-muted">
          <span>Home</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-[#1A4A8C] font-medium">Approvement</span>
        </nav>
      </div>

      {/* ── Tab Bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="inline-flex items-center bg-white border border-[#FFE5BF] rounded-full p-1 shadow-sm gap-1">
          {[
            { id: 'tenders', label: 'Tenders', count: tenderCount },
            { id: 'bidders', label: 'Bidders', count: bidderCount },
          ].map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={[
                  'flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200',
                  isActive
                    ? 'bg-[#0A2240] text-white shadow-sm'
                    : 'text-[#1A4A8C] border border-[#FFE5BF] bg-transparent hover:bg-[#FFF2DB]',
                ].join(' ')}
              >
                {tab.label}
                <span className={['text-[10px] font-bold px-1.5 py-0.5 rounded-full', isActive ? 'bg-white/20 text-white' : 'bg-[#FFF2DB] text-[#0A2240]'].join(' ')}>
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>
        <span className="text-xs font-medium text-[#6B7A8D] bg-white border border-[#FFE5BF] px-3 py-1.5 rounded-full whitespace-nowrap">
          {filtered.length} {activeTab === 'tenders' ? 'tender' : 'bidder'}{filtered.length !== 1 ? 's' : ''} found
        </span>
      </div>

      {/* ── Search & Filters ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
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
            placeholder={activeTab === 'tenders'
              ? 'Search by Tender ID, Project Name, Department or District...'
              : 'Search by Tender ID, Project Name, Department or District...'
            }
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
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-4 py-2.5 text-sm border border-[#FFE5BF] rounded-xl bg-white text-[#0A2240] focus:outline-none focus:ring-2 focus:ring-[#1A4A8C]/30 focus:border-[#1A4A8C] transition-all cursor-pointer"
        >
          {categoryOptions.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
        </select>
        {hasFilters && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-tn-muted hover:text-tn-danger underline ml-1"
            >
            Clear all
        </button>
        )}
      </div>

      {/* ── Tenders error state ────────────────────────────────────────── */}
      {activeTab === 'tenders' && tendersError && (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-red-200 border-dashed">
          <p className="font-bold text-red-600 mb-1">Couldn't load tenders.</p>
          <p className="text-sm text-[#6B7A8D] mb-4">{tendersError}</p>
          <button
            onClick={fetchApprovementTenders}
            className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-[#1A4A8C] text-white hover:bg-[#0A2240] transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Bidders error state ────────────────────────────────────────── */}
      {activeTab === 'bidders' && biddersError && (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-red-200 border-dashed">
          <p className="font-bold text-red-600 mb-1">Couldn't load bidder finalization queue.</p>
          <p className="text-sm text-[#6B7A8D] mb-4">{biddersError}</p>
          <button
            onClick={fetchBidderFinalizationTenders}
            className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-[#1A4A8C] text-white hover:bg-[#0A2240] transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Cards Grid ──────────────────────────────────────────────────── */}
      {!((activeTab === 'tenders' && tendersError) || (activeTab === 'bidders' && biddersError)) && (
      <div className={['transition-opacity duration-150', animating ? 'opacity-0' : 'opacity-100'].join(' ')}>
        {loading || (activeTab === 'tenders' ? tendersLoading : biddersLoading) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => <CardSkeleton key={i} />)}
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[#FFE5BF] border-dashed">
            <div className="w-14 h-14 rounded-full bg-[#FFF2DB] flex items-center justify-center mb-4 border border-[#FFE5BF]">
              <svg className="w-6 h-6 text-[#6B7A8D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="font-bold text-[#0A2240] mb-1">
              No {activeTab === 'tenders' ? 'tenders' : 'bidders'} found
            </p>
            <p className="text-sm text-[#6B7A8D]">Try adjusting your search or filters.</p>
            {hasFilters && (
              <button onClick={handleClear} className="mt-4 text-xs font-semibold text-[#1A4A8C] hover:underline">
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch">
            {activeTab === 'tenders'
              ? paginated.map(tender => (
                  <TenderApprovementCard
                        key={tender.recordId}
                        tender={tender}
                        role={role}
                        onView={handleView}
                        onEdit={handleEdit}
                        onConfirmApprove={confirmApprove}
                        onConfirmReject={confirmReject}
                        onDelete={confirmDelete}
                    />
                ))
              : paginated.map(bidder => (
                  <BidderApprovementCard
                        key={bidder.recordId}
                        bidder={bidder}
                        onView={handleView}
                        onEdit={handleEdit}
                    />
                ))
            }
          </div>
        )}
      </div>
      )}

      {/* ── Pagination ──────────────────────────────────────────────────── */}
      {!loading && !(activeTab === 'tenders' ? tendersLoading : biddersLoading) && filtered.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  )
}

// ── Icon Components ───────────────────────────────────────────────────────────
function EyeIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}
function RejectIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
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
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}
function ApproveIcon() {
  return (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}