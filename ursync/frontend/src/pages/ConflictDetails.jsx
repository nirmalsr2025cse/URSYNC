// src/pages/ConflictDetails.jsx
import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { CONFLICTS } from '../data/conflictMockData'
import { CONFLICT_MESSAGES, DEFAULT_CONFLICT_MESSAGES } from '../data/conflictMessagesMockData'
import { useRole, ROLES } from '../components/RoleContext'
import { MessageCircle } from "lucide-react";

// ── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function formatDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

const LEVEL_STYLES = {
  High:   { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-600',    icon: 'text-red-500'    },
  Medium: { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  icon: 'text-amber-500'  },
  Low:    { bg: 'bg-emerald-50',border: 'border-emerald-200',text: 'text-emerald-700',icon: 'text-emerald-500'},
}

// ── Sample AI recommendations (frontend demo only) ───────────────────────────
const AI_SOLUTIONS = [
  {
    rank: 1,
    title: 'Reschedule Project 2 (Best Option)',
    description: 'Delay the start date of "Underground Drainage Renewal — Ward 12" by 20 days to avoid timeline overlap.',
    effectiveness: 92,
    tag: 'Best',
    tagColor: 'bg-emerald-100 text-emerald-700',
    rankColor: 'bg-emerald-500',
  },
  {
    rank: 2,
    title: 'Reschedule Project 1',
    description: 'Delay the start date of "Coimbatore North Road Widening Project" by 15 days.',
    effectiveness: 78,
    tag: 'Good',
    tagColor: 'bg-amber-100 text-amber-700',
    rankColor: 'bg-amber-500',
  },
  {
    rank: 3,
    title: 'Phase-wise Execution',
    description: 'Execute both projects in phases by splitting the work zones and time windows.',
    effectiveness: 70,
    tag: 'Fair',
    tagColor: 'bg-blue-100 text-blue-700',
    rankColor: 'bg-blue-500',
  },
  {
    rank: 4,
    title: 'Resource Reallocation',
    description: 'Allocate additional manpower and machinery to handle both projects simultaneously.',
    effectiveness: 55,
    tag: 'Low',
    tagColor: 'bg-gray-100 text-gray-600',
    rankColor: 'bg-tn-navy',
  },
  {
    rank: 5,
    title: 'Split Work Zones',
    description: 'Divide the shared stretch into two non-overlapping work zones so both crews can proceed in parallel.',
    effectiveness: 52,
    tag: 'Fair',
    tagColor: 'bg-blue-100 text-blue-700',
    rankColor: 'bg-blue-500',
  },
  {
    rank: 6,
    title: 'Night-Shift Execution',
    description: 'Shift one project to night hours to reduce daytime traffic and resource clashes.',
    effectiveness: 48,
    tag: 'Fair',
    tagColor: 'bg-blue-100 text-blue-700',
    rankColor: 'bg-blue-500',
  },
  {
    rank: 7,
    title: 'Temporary Traffic Diversion',
    description: 'Set up a temporary diversion route to allow both projects to proceed without full road closure.',
    effectiveness: 44,
    tag: 'Low',
    tagColor: 'bg-gray-100 text-gray-600',
    rankColor: 'bg-tn-navy',
  },
  {
    rank: 8,
    title: 'Joint Department Coordination',
    description: 'Form a joint coordination committee between both departments to align schedules weekly.',
    effectiveness: 40,
    tag: 'Low',
    tagColor: 'bg-gray-100 text-gray-600',
    rankColor: 'bg-tn-navy',
  },
  {
    rank: 9,
    title: 'Shared Equipment Pool',
    description: 'Pool machinery and barricades between both tenders to reduce procurement delays.',
    effectiveness: 37,
    tag: 'Low',
    tagColor: 'bg-gray-100 text-gray-600',
    rankColor: 'bg-tn-navy',
  },
  {
    rank: 10,
    title: 'Defer to Next Quarter',
    description: 'Postpone the lower-priority project entirely to the next fiscal quarter.',
    effectiveness: 30,
    tag: 'Low',
    tagColor: 'bg-gray-100 text-gray-600',
    rankColor: 'bg-tn-navy',
  },
]

const AI_INSIGHTS = [
  { icon: 'clock',    title: 'Location Proximity', text: 'Both projects are in the same stretch of Coimbatore North, Tamil Nadu.' },
  { icon: 'overlap',  title: 'Resource Overlap',   text: 'Both projects require excavation machinery and road barriers.' },
  { icon: 'public',   title: 'Public Impact',      text: 'Overlap may cause traffic congestion and public inconvenience.' },
  { icon: 'weather',  title: 'Weather Factor',     text: 'Monsoon period may increase construction delays.' },
]

const INSIGHT_ICON_PATHS = {
  clock:   'M12 8v4l2.5 2.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  overlap: 'M17 20.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM7 20.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM12 3l4 8H8l4-8z',
  public:  'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87M9 7a4 4 0 118 0 4 4 0 01-8 0z',
  weather: 'M20 16.5A4.5 4.5 0 0015.5 12h-.34a6 6 0 10-9.32 6.02M8 21l2-3m3 3l2-3m-6 0h6',
}

// ── Tab bar (styled like ReportsFeedbacks.jsx) ───────────────────────────────
const TABS = [
  { id: 'conflict',  label: 'Conflict',   icon: 'warning' },
  { id: 'ai_suggest', label: 'AI Suggest', icon: 'sparkle' },
]

// ── Demo department for the logged-in Department Employee (frontend only) ──
// When connecting the backend, replace with the department from the auth/JWT.
const DEMO_EMPLOYEE_DEPARTMENT = 'Highways Department'

export default function ConflictDetails() {
  const navigate = useNavigate()
  const params = useParams()
  const location = useLocation()
  const { role } = useRole()
  const messagesEndRef = useRef(null)

  // ── Data source priority ───────────────────────────────────────────────
  // 1) The exact conflict object passed from the card the user clicked
  //    (location.state.conflict) — renders precisely what was shown there,
  //    no re-lookup needed.
  // 2) Fallback: look it up from CONFLICTS by the :id route param, for
  //    direct links, page refreshes, or shared URLs.
  // 3) Final fallback: first record, so the page never renders empty.
  const conflict = useMemo(() => {
    if (location.state?.conflict) return location.state.conflict
    const byId = CONFLICTS.find((c) => c.id === params.id)
    return byId || CONFLICTS[0]
  }, [location.state, params.id])

  // Edit is only enabled for Department Head — every other role never
  // sees the button at all (hidden, not just disabled).
  const normalizedRole = String(role || '').trim().toLowerCase()
  const canEdit = normalizedRole === ROLES.DEPARTMENT_HEAD.toLowerCase()
  const applyChanges = normalizedRole === ROLES.DEPARTMENT_HEAD.toLowerCase()

  // Which tender in this conflict belongs to the logged-in employee's own
  // department — that's the one they're allowed to reschedule.
  const myTender = useMemo(() => {
    if (conflict.tender1.department === DEMO_EMPLOYEE_DEPARTMENT) return conflict.tender1
    if (conflict.tender2.department === DEMO_EMPLOYEE_DEPARTMENT) return conflict.tender2
    return conflict.tender1 // fallback
  }, [conflict])

  const [activeTab, setActiveTab] = useState('conflict')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editDate, setEditDate] = useState(myTender.startDate)
  const [toast, setToast] = useState(null)

  // ── Messages (per-conflict chat thread, frontend demo only) ─────────────
  const [messagePanelOpen, setMessagePanelOpen] = useState(false)
  const [messages, setMessages] = useState(
    () => CONFLICT_MESSAGES[conflict.id] || DEFAULT_CONFLICT_MESSAGES
  )
  const [messageDraft, setMessageDraft] = useState('')

  // ── View All Recommendations panel ───────────────────────────────────────
  const [allRecommendationsOpen, setAllRecommendationsOpen] = useState(false)

  function formatMessageTime(t) {
    return new Date(t).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    })
  }

  function handleSendMessage() {
    const text = messageDraft.trim()
    if (!text) return
    setMessages((prev) => [
      ...prev,
      {
        id: `MSG-${prev.length + 1}`,
        sender: 'You',
        self: true,
        text,
        time: new Date().toISOString(),
      },
    ])
    setMessageDraft('')
  }

  const styles = LEVEL_STYLES[conflict.level] || LEVEL_STYLES.Medium

  function showToast(message) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  function openEditModal() {
    if (!canEdit) return
    setEditDate(myTender.startDate)
    setEditModalOpen(true)
  }

  function handleCancelEdit() {
    setEditModalOpen(false)
  }

  function handleApplyEdit() {
    setEditModalOpen(false)
    navigate('/conflicts', {
      state: {
        appliedMessage: `"${myTender.name}" schedule updated to ${formatDate(editDate)}.`,
      },
    })
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-fade-in min-h-screen">

      {/* ── Toast ─────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-fade-in">
          <div className="flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border text-sm font-medium bg-emerald-50 text-emerald-700 border-emerald-200">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{toast}</span>
          </div>
        </div>
      )}

      {/* ── Edit Modal ────────────────────────────────────────────────── */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-tn-border p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-bold text-tn-navy mb-1">Edit Tender Schedule</h3>
            <p className="text-xs text-tn-muted mb-5">
              Conflict ID: <span className="font-mono font-semibold text-tn-navy">{conflict.id}</span>
            </p>

            {/* Tender name (read-only, matched to the employee's department) */}
            <div className="bg-tn-light border border-tn-border rounded-lg px-3 py-2.5 mb-4">
              <p className="text-[10px] text-tn-muted uppercase tracking-wide mb-0.5">Tender</p>
              <p className="text-sm font-semibold text-tn-navy leading-snug">{myTender.name}</p>
              <p className="text-[11px] text-tn-muted mt-0.5">{myTender.department}</p>
            </div>

            {/* Date field */}
            <label className="block text-xs font-semibold text-tn-navy mb-1.5">Project Start Date</label>
            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="w-full px-3 py-2 mb-6 text-sm border border-tn-border rounded-lg text-tn-navy focus:outline-none focus:ring-2 focus:ring-tn-blue/30 focus:border-tn-blue"
            />

            <div className="flex gap-3">
              <button onClick={handleCancelEdit} className="flex-1 btn-secondary">
                Cancel
              </button>
              <button onClick={handleApplyEdit} className="flex-1 btn-primary focus:outline-none focus:ring-0">
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-tn-muted hover:text-tn-blue transition-colors w-fit"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Conflicts
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-display font-bold text-tn-navy">Conflict Details</h1>
            <p className="text-sm text-tn-muted mt-0.5">
              {activeTab === 'conflict'
                ? 'Detailed analysis of conflicting upcoming tenders.'
                : 'AI-powered recommendations to resolve this conflict smartly.'}
            </p>
          </div>

          {/* Top-right actions: Export Report + Edit (blue) — no Change button */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {canEdit && activeTab === 'conflict' && (
              <button
                onClick={openEditModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-tn-blue hover:bg-tn-navy shadow-sm transition-colors duration-200"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab bar (same pill style as Reports & Feedbacks) ─────────────── */}
      <div className="inline-flex items-center bg-white border border-tn-border rounded-full p-1 shadow-sm gap-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 flex items-center gap-1.5',
                isActive
                  ? 'bg-tn-navy text-white shadow-sm'
                  : 'text-tn-blue border border-tn-border bg-transparent hover:bg-tn-light',
              ].join(' ')}
            >
              {tab.icon === 'warning' ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              )}
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Conflict Tab ──────────────────────────────────────────────── */}
      {activeTab === 'conflict' && (
        <div className="space-y-6">

          {/* Level banner */}
          <div className={`flex flex-col lg:flex-row lg:items-center gap-4 rounded-2xl border ${styles.border} ${styles.bg} px-5 py-4`}>
            <div className="flex items-center gap-3 lg:pr-5 lg:border-r lg:border-tn-border">
              <svg className={`w-8 h-8 flex-shrink-0 ${styles.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
                  d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <div>
                <p className={`font-bold text-sm ${styles.text}`}>{conflict.level} Conflict</p>
                <p className="text-[11px] text-tn-muted">Conflict ID: {conflict.id}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 flex-1">
              <MiniStat icon="mappin" label="Conflict Title" value={conflict.title} />
              <MiniStat icon="location" label="Common Location" value={`${conflict.location.district}, Tamil Nadu`} />
              <MiniStat icon="clock" label="Time Difference" value={`${conflict.timeDifferenceDays} Days`} />
              <MiniStat icon="tag" label="Conflict Reason" value={conflict.reason} />
              <MiniStat icon="calendar" label="Detected On" value={formatDateTime(conflict.lastUpdated)} />
              <MiniStat icon="calendarCheck" label="Last Updated" value={formatDate(conflict.lastUpdated)} />
            </div>
          </div>

          {/* Conflicting Projects */}
          <div>
            <h2 className="font-bold text-tn-navy text-base mb-1">Conflicting Projects</h2>
            <p className="text-xs text-tn-muted mb-4">Two upcoming tenders that are causing this conflict</p>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-center">
              <ProjectCard label="Project 1" tender={conflict.tender1} />
              <div className="flex justify-center">
                <div className="w-24 h-24 rounded-full bg-red-50 border-2 border-red-200 flex flex-col items-center justify-center text-red-500">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <span className="text-[11px] font-bold mt-1">CONFLICT</span>
                </div>
              </div>
              <ProjectCard label="Project 2" tender={conflict.tender2} />
            </div>
          </div>

          {/* Timeline / Impact / Overview row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Timeline Overlap */}
            <div className="bg-white rounded-2xl border border-tn-border p-5">
              <h3 className="font-bold text-tn-navy text-sm mb-4 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-tn-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l2.5 2.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Timeline Overlap
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-tn-muted mb-1">
                    Project 1 Duration <span className="float-right">19 Days</span>
                  </p>
                  <div className="h-2 rounded-full bg-tn-light overflow-hidden">
                    <div className="h-full bg-tn-blue rounded-full" style={{ width: '70%' }} />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-tn-muted mb-1">
                    Project 2 Duration <span className="float-right">14 Days</span>
                  </p>
                  <div className="h-2 rounded-full bg-tn-light overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '50%' }} />
                  </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600 font-medium">
                  Overlap Period: 1 Day
                </div>
              </div>
            </div>

            {/* Impact Analysis */}
            <div className="bg-white rounded-2xl border border-tn-border p-5">
              <h3 className="font-bold text-tn-navy text-sm mb-4 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-tn-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 012-2h2a2 2 0 012 2v6m-9 0h14M5 19V9a2 2 0 012-2h10a2 2 0 012 2v10" />
                </svg>
                Impact Analysis
              </h3>
              <div className="space-y-3">
                {(conflict.impact || []).map((label) => (
                  <div key={label} className="flex items-center justify-between text-xs">
                    <span className="text-tn-muted">{label}</span>
                    <span className="px-2 py-0.5 rounded-full font-semibold bg-red-50 text-red-600">
                      High
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600 font-semibold text-center">
                Overall Impact: {conflict.level}
              </div>
            </div>

            {/* Conflict Overview + Risk Score */}
            <div className="bg-white rounded-2xl border border-tn-border p-5">
              <h3 className="font-bold text-tn-navy text-sm mb-4 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-tn-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Conflict Overview
              </h3>
              <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
                <div className="space-y-2 text-xs">
                  <OverviewRow label="Location Match" active={conflict.summary?.locationMatch} />
                  <OverviewRow label="Timeline Overlap" active={conflict.summary?.timelineMatch} />
                  <OverviewRow label="Resource Conflict" active={conflict.summary?.resourceConflict} />
                  <OverviewRow label="Department Conflict" active={conflict.summary?.departmentConflict} />
                </div>
                <RiskDonut
                  score={conflict.level === 'High' ? 85 : conflict.level === 'Medium' ? 55 : 25}
                  level={conflict.level}
                />
              </div>
            </div>
          </div>

          {/* Additional Info + Activity Log */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-tn-border p-5">
              <h3 className="font-bold text-tn-navy text-sm mb-4">Additional Information</h3>
              <div className="grid grid-cols-2 gap-y-3 text-xs">
                <InfoItem label="Conflict Reason" value={conflict.reason} />
                <InfoItem
                  label="Departments Involved"
                  value={
                    conflict.tender1.department === conflict.tender2.department
                      ? '1 Department'
                      : '2 Departments'
                  }
                />
                <InfoItem label="Priority Level" value={conflict.priority} isBadge />
                <InfoItem label="Common Location" value={`${conflict.location.district}, ${conflict.location.taluk}, ${conflict.location.village}`} />
                <InfoItem label="Time Difference" value={`${conflict.timeDifferenceDays} Days`} />
                <InfoItem label="Last Updated" value={formatDate(conflict.lastUpdated)} />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-tn-border p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-tn-navy text-sm">Activity Log</h3>
                <button className="text-xs text-tn-blue font-medium hover:underline">View All</button>
              </div>
              <div className="space-y-3">
                {[
                  { time: formatDateTime(conflict.lastUpdated), text: 'Conflict details updated', by: 'Department Head' },
                  { time: formatDateTime(conflict.lastUpdated), text: 'Conflict detected automatically', by: 'System' },
                  { time: formatDateTime(conflict.lastUpdated), text: 'Projects data analyzed', by: 'System' },
                ].map((log, idx) => (
                  <div key={idx} className="flex gap-3 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-tn-blue mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-tn-navy font-medium">{log.text}</p>
                      <p className="text-tn-muted">{log.time} · by {log.by}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Suggest Tab (no Change button) ────────────────────────── */}
      {activeTab === 'ai_suggest' && (
        <div className="space-y-6">

          {/* AI Assistant banner */}
          <div className="rounded-2xl bg-tn-navy text-white p-6 flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="flex items-center gap-4 lg:pr-6 lg:border-r lg:border-white/20">
              <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
                    d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 7h10v10H7V7z" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-sm">AI Conflict Assistant</p>
                <p className="text-xs text-white/70 max-w-xs">
                  Our AI has analyzed 4 key parameters and generated smart recommendations to minimize impact and resolve the conflict efficiently.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 flex-1">
              <AiStat label="Confidence Score" value="94%" sub="High Confidence" />
              <AiStat label="Impact Reduction" value="85%" sub="Potential Reduction" />
              <AiStat label="Best Resolution" value="Reschedule" sub="Project 2" />
              <AiStat label="Effort Required" value="Low" sub="Implementation" />
              <AiStat label="Est. Savings" value="₹12.6 L" sub="Cost Avoidance" />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            {/* Top AI Recommended Solutions */}
            <div className="bg-white rounded-2xl border border-tn-border p-5">
              <h3 className="font-bold text-tn-navy text-sm mb-1">Top AI Recommended Solutions</h3>
              <p className="text-[11px] text-tn-muted mb-4">Ranked by effectiveness &amp; feasibility</p>
              <div className="space-y-3">
                {AI_SOLUTIONS.slice(0, 4).map((sol) => (
                  <div key={sol.rank} className="flex items-start gap-3 border border-tn-border rounded-xl p-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 ${sol.rankColor}`}>
                      {sol.rank}
                    </span>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-tn-navy">{sol.title}</p>
                      <p className="text-[11px] text-tn-muted mt-0.5">{sol.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold text-tn-navy">{sol.effectiveness}%</p>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${sol.tagColor}`}>{sol.tag}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setAllRecommendationsOpen(true)}
                className="w-full btn-secondary text-xs mt-4 flex items-center justify-center gap-1 focus:outline-none focus:ring-0"
              >
                View All Recommendations
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* AI Recommendation Preview */}
            <div className="bg-white rounded-2xl border border-tn-border p-5">
              <h3 className="font-bold text-tn-navy text-sm mb-1">AI Recommendation Preview</h3>
              <p className="text-[11px] text-tn-muted mb-4">Preview of the best recommended resolution</p>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <span className="inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full mb-2">
                  Recommended
                </span>
                <p className="text-sm font-bold text-tn-navy">Reschedule Project 2</p>
                <p className="text-xs text-tn-muted mb-3">{conflict.tender2.name}</p>

                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-tn-muted">Current Start Date</span>
                  <span className="font-semibold text-tn-navy">{formatDate(conflict.tender2.startDate)}</span>
                </div>
                <div className="flex justify-center my-1">
                  <svg className="w-4 h-4 text-tn-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m0 0l-5-5m5 5l5-5" />
                  </svg>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-tn-muted">Proposed Start Date</span>
                  <span className="font-semibold text-tn-navy flex items-center gap-1.5">
                    {formatDate(conflict.tender2.startDate)}
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">+20 Days</span>
                  </span>
                </div>
              </div>

              <div className="bg-tn-light rounded-xl p-4 mt-4">
                <p className="text-xs font-semibold text-tn-navy mb-2">Why is this the best option?</p>
                <ul className="space-y-1.5 text-[11px] text-tn-muted">
                  {[
                    'Eliminates timeline overlap completely',
                    'Minimal impact on overall project completion',
                    'No additional cost involved',
                    'Resources remain optimally utilized',
                    'Lower risk of public inconvenience',
                  ].map((point) => (
                    <li key={point} className="flex items-center gap-1.5">
                      <svg className="w-3 h-3 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M5 13l4 4L19 7" />
                      </svg>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              {applyChanges && (
                <button
                  onClick={() => showToast('Recommended change applied successfully.')}
                  className="w-full btn-primary text-xs mt-4 focus:outline-none focus:ring-0"
                >
                  Apply This Change
                </button>
              )}
            </div>

            {/* Impact Analysis of Recommended Change */}
            <div className="bg-white rounded-2xl border border-tn-border p-5">
              <h3 className="font-bold text-tn-navy text-sm mb-4">Impact Analysis of Recommended Change</h3>
              <div className="grid grid-cols-2 gap-3">
                <ImpactStat label="Conflict Risk" value="-85%" sub="Significant Reduction" tone="emerald" />
                <ImpactStat label="Timeline Extension" value="+20 Days" sub="For Project 2" tone="amber" />
                <ImpactStat label="Cost Impact" value="₹0.00" sub="No Additional Cost" tone="blue" />
                <ImpactStat label="Resource Impact" value="Low" sub="Minimal Impact" tone="blue" />
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold text-tn-navy mb-2">Timeline Comparison</p>
                <div className="space-y-2 text-[11px] text-tn-muted">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-tn-blue flex-shrink-0" />
                    Project 1 (Current): {formatDate(conflict.tender1.startDate)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    Project 2 (Proposed): {formatDate(conflict.tender2.startDate)}
                  </div>
                </div>
              </div>

              <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                No overlap after applying the recommended change.
              </div>
            </div>
          </div>

          {/* Additional AI Insights */}
          <div className="bg-white rounded-2xl border border-tn-border p-5">
            <h3 className="font-bold text-tn-navy text-sm mb-4">Additional AI Insights</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {AI_INSIGHTS.map((insight) => (
                <div key={insight.title} className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-tn-light flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-tn-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={INSIGHT_ICON_PATHS[insight.icon]} />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-tn-navy">{insight.title}</p>
                    <p className="text-[11px] text-tn-muted mt-0.5">{insight.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── View All Recommendations Panel ───────────────────────────── */}
      {allRecommendationsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-tn-border w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-tn-border flex-shrink-0">
              <div>
                <h3 className="text-base font-bold text-tn-navy">All AI Recommendations</h3>
                <p className="text-[11px] text-tn-muted mt-0.5">
                  {AI_SOLUTIONS.length} suggestion{AI_SOLUTIONS.length !== 1 ? 's' : ''} for {conflict.id}, ranked by effectiveness
                </p>
              </div>
              <button
                onClick={() => setAllRecommendationsOpen(false)}
                className="text-tn-muted hover:text-tn-navy transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Full list (1 to 10 recommendations) */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {AI_SOLUTIONS.map((sol) => (
                <div key={sol.rank} className="flex items-start gap-3 border border-tn-border rounded-xl p-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 ${sol.rankColor}`}>
                    {sol.rank}
                  </span>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-tn-navy">{sol.title}</p>
                    <p className="text-[11px] text-tn-muted mt-0.5">{sol.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-tn-navy">{sol.effectiveness}%</p>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${sol.tagColor}`}>{sol.tag}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-tn-border flex-shrink-0">
              <button
                onClick={() => setAllRecommendationsOpen(false)}
                className="w-full btn-secondary text-xs focus:outline-none focus:ring-0"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating Message Button (bottom-right) ───────────────────── */}
      <button
        onClick={() => setMessagePanelOpen((open) => !open)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-tn-blue hover:bg-tn-navy shadow-lg flex items-center justify-center text-white transition-colors duration-200"
        title="Messages"
      >
        <MessageCircle className="w-6 h-6" />
        {messages.length > 0 && !messagePanelOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
            {messages.length}
          </span>
        )}
      </button>

      {/* ── Message Panel ─────────────────────────────────────────────── */}
      {messagePanelOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-tn-border flex flex-col overflow-hidden animate-fade-in max-h-[70vh]">
          {/* Panel header */}
          <div className="bg-tn-navy text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div>
              <p className="text-sm font-bold">Conflict Discussion</p>
              <p className="text-[11px] text-white/70">{conflict.id} · {myTender.name}</p>
            </div>
            <button
              onClick={() => setMessagePanelOpen(false)}
              className="text-white/70 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Message history */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-tn-cream/40" style={{ minHeight: '220px' }}>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.self ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-xl px-3 py-2 ${
                  msg.self
                    ? 'bg-tn-blue text-white rounded-br-sm'
                    : 'bg-white border border-tn-border text-tn-navy rounded-bl-sm'
                }`}>
                  {!msg.self && (
                    <p className="text-[10px] font-semibold text-tn-blue mb-0.5">{msg.sender}</p>
                  )}
                  <p className="text-xs leading-relaxed">{msg.text}</p>
                  <p className={`text-[9px] mt-1 ${msg.self ? 'text-white/70' : 'text-tn-muted'}`}>
                    {formatMessageTime(msg.time)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} /> {/* Dummy div to scroll into view */}
          </div>

          {/* Send box */}
          <div className="border-t border-tn-border p-3 flex items-center gap-2 flex-shrink-0">
            <input
              type="text"
              value={messageDraft}
              onChange={(e) => setMessageDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type a message…"
              className="flex-1 px-3 py-2 text-xs border border-tn-border rounded-lg text-tn-navy focus:outline-none focus:ring-2 focus:ring-tn-blue/30 focus:border-tn-blue"
            />
            <button
              onClick={handleSendMessage}
              disabled={!messageDraft.trim()}
              className="w-9 h-9 rounded-lg bg-tn-blue hover:bg-tn-navy disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white flex-shrink-0 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────
function MiniStat({ label, value }) {
  return (
    <div>
      <p className="text-[10px] text-tn-muted uppercase tracking-wide">{label}</p>
      <p className="text-xs font-semibold text-tn-navy truncate" title={value}>{value}</p>
    </div>
  )
}

function ProjectCard({ label, tender }) {
  return (
    <div className="bg-white rounded-2xl border border-tn-border overflow-hidden">
      <div className="px-4 pt-3">
        <span className="text-[10px] font-semibold text-tn-blue bg-tn-light px-2 py-0.5 rounded-full">{label}</span>
      </div>
      <div className="p-4 pt-2">
        <p className="font-bold text-sm text-tn-navy mb-2">{tender.name}</p>
        <div className="space-y-1 text-[11px] text-tn-muted">
          <p>Department: <span className="text-tn-navy font-medium">{tender.department}</span></p>
          <p>Start Date: <span className="text-tn-navy font-medium">{formatDate(tender.startDate)}</span></p>
        </div>
      </div>
    </div>
  )
}

function OverviewRow({ label, active }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-tn-muted">{label}</span>
      <span className={active ? 'text-emerald-600' : 'text-red-500'}>
        {active ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </span>
    </div>
  )
}

function RiskDonut({ score, level }) {
  const radius = 30
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const strokeColor = level === 'High' ? '#C0392B' : level === 'Medium' ? '#F59E0B' : '#1A7A3C'
  const badgeClass =
    level === 'High'
      ? 'text-red-600 bg-red-50'
      : level === 'Medium'
      ? 'text-amber-700 bg-amber-50'
      : 'text-emerald-700 bg-emerald-50'

  return (
    <div className="flex flex-col items-center">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="#FFE5BF" strokeWidth="8" />
        <circle
          cx="40" cy="40" r={radius} fill="none" stroke={strokeColor} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 40 40)"
        />
        <text x="40" y="37" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#0A2240">{score}</text>
        <text x="40" y="49" textAnchor="middle" fontSize="8" fill="#6B7A8D">/100</text>
      </svg>
      <p className="text-[10px] font-semibold text-tn-navy mt-1">Risk Score</p>
      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5 ${badgeClass}`}>
        {level} Risk
      </span>
    </div>
  )
}

function InfoItem({ label, value, isBadge }) {
  return (
    <div>
      <p className="text-tn-muted mb-0.5">{label}</p>
      {isBadge ? (
        <span className="inline-block text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
          {value}
        </span>
      ) : (
        <p className="font-semibold text-tn-navy">{value}</p>
      )}
    </div>
  )
}

function AiStat({ label, value, sub }) {
  return (
    <div className="bg-white/10 rounded-xl px-3 py-2.5 text-center">
      <p className="text-[10px] text-white/60 mb-1">{label}</p>
      <p className="text-sm font-bold text-white">{value}</p>
      <p className="text-[9px] text-white/50">{sub}</p>
    </div>
  )
}

function ImpactStat({ label, value, sub, tone }) {
  const toneMap = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    amber:   'bg-amber-50 border-amber-200 text-amber-700',
    blue:    'bg-blue-50 border-blue-200 text-tn-blue',
  }
  return (
    <div className={`rounded-xl border px-3 py-3 ${toneMap[tone]}`}>
      <p className="text-[10px] opacity-80 mb-1">{label}</p>
      <p className="text-base font-bold">{value}</p>
      <p className="text-[10px] opacity-70">{sub}</p>
    </div>
  )
}