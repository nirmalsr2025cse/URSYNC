// src/pages/TenderCumAuction.jsx
import React from 'react'
import { useNavigate } from 'react-router-dom'

const STEPS = [
  'The Tender Cum Auction can be enabled by the department users having the roles: Nodal Officer and Procurement Officer Admin (Tender Creator).',
  'After Successful DSC Login, Click the Org Hierarchy Master menu under the Master Management.',
  'In the Organisation Details, Click the Edit icon against the Organisation Chain.',
  'Under the Organisation Creation Process List, click the Action icon in the Auction properties.',
  'After entering the required details, Click Save to apply the changes in the auction properties against the organisation chain.',
]

const PROPERTIES = [
  {
    term: 'Auction Elapse time in minutes:',
    desc: 'The time period (in minutes) before the auction end that triggers an automatic extension if a bid is received within it.',
  },
  {
    term: 'Auction Bid Auto Extensions in minutes:',
    desc: 'Minutes by which the auction should be extended automatically.',
  },
  {
    term: 'Auto Extension Restriction Required:',
    desc: 'If restriction is required in auto extension – Yes/No',
  },
]

const IF_YES_AUTO = [
  {
    term: 'Number of Extension to Required:',
    desc: 'desired value',
  },
  {
    term: 'Max Seal Percentage:',
    desc: 'The maximum percentage a bidder can reduce or increase their bid price from the current price (0% to 100%).',
  },
]

const ELIMINATION = [
  {
    term: 'Bidders Elimination Process Required:',
    desc: 'If elimination process required – Yes/No',
  },
]

const IF_YES_ELIMINATION = [
  {
    term: 'Allow Preferential Bidder Elimination:',
    desc: 'If Preferential Bidder elimination is required – Yes/No',
  },
  {
    term: 'Minimum Bidder for Elimination:',
    desc: 'If the minimum number of bids has been received, say 4 then system will initiate the Bidder Elimination process.',
  },
  {
    term: 'Number of Bidder to Eliminate:',
    desc: 'The number of bidders needs to be eliminated by the system.',
  },
  {
    term: 'IsSpecification Document To Be Uploaded:',
    desc: 'Should be selected as No',
  },
  {
    term: 'Show Specification Document To Bidders:',
    desc: 'Should be selected as No',
  },
  {
    term: 'Minimum Required Bids to start Live Auction:',
    desc: '2',
  },
]

export default function TenderCumAuction() {
  const navigate = useNavigate()

  return (
    <div className="p-4 md:p-6 lg:p-8 min-h-screen animate-fade-in">

      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <div>
          <h1 className="text-xl font-display font-bold text-tn-navy">
            Tender Cum Auction
          </h1>
          <p className="text-sm text-tn-muted mt-0.5">
            Steps and configuration details for enabling the Tender Cum Auction process.
          </p>
        </div>

        <nav className="text-xs text-tn-muted flex items-center gap-1.5 flex-wrap" aria-label="Breadcrumb">
          <span>Home</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-tn-blue font-medium">Tender Cum Auction</span>
        </nav>
      </div>

      {/* ── Main Content Card ──────────────────────────────────────────── */}
      <div className="bg-white border border-[#FFE5BF] rounded-2xl p-6 lg:p-8 shadow-sm space-y-6">

        {/* ── Section Title ──────────────────────────────────────────── */}
        <h2 className="text-base font-bold text-[#0A2240] border-b border-[#FFE5BF] pb-3">
          Steps to be followed to enable Tender Cum Auction
        </h2>

        {/* ── Numbered Steps ─────────────────────────────────────────── */}
        <ol className="space-y-3">
          {STEPS.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#0A2240] text-white text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <p className="text-sm text-[#6B7A8D] leading-relaxed">{step}</p>
            </li>
          ))}
        </ol>

        {/* ── Divider ────────────────────────────────────────────────── */}
        <div className="border-t border-[#FFE5BF]" />

        {/* ── Auction Properties ─────────────────────────────────────── */}
        <div className="space-y-4">
          <p className="text-sm text-[#6B7A8D] italic">
            Information about the auction properties:
          </p>

          {/* Core properties */}
          <div className="space-y-3">
            {PROPERTIES.map((p, i) => (
              <PropertyRow key={i} term={p.term} desc={p.desc} />
            ))}
          </div>

          {/* If Yes — Auto Extension */}
          <SectionLabel text="If Yes (Auto Extension Restriction is Required)" />
          <div className="space-y-3 pl-4 border-l-2 border-[#FFE5BF]">
            {IF_YES_AUTO.map((p, i) => (
              <PropertyRow key={i} term={p.term} desc={p.desc} />
            ))}
          </div>

          {/* Elimination */}
          <div className="space-y-3 mt-2">
            {ELIMINATION.map((p, i) => (
              <PropertyRow key={i} term={p.term} desc={p.desc} />
            ))}
          </div>

          {/* If Yes — Elimination */}
          <SectionLabel text="If Yes (Bidders Elimination Process is Required)" />
          <div className="space-y-3 pl-4 border-l-2 border-[#FFE5BF]">
            {IF_YES_ELIMINATION.map((p, i) => (
              <PropertyRow key={i} term={p.term} desc={p.desc} />
            ))}
          </div>
        </div>

        {/* ── Divider ────────────────────────────────────────────────── */}
        <div className="border-t border-[#FFE5BF]" />

        {/* ── Contact Note ───────────────────────────────────────────── */}
        <p className="text-sm text-[#F62440] font-medium">
          For any doubts/clarifications, contact helpdesk using the details given in the contact us page
        </p>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
function PropertyRow({ term, desc }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 text-sm">
      <span className="font-semibold text-[#1A4A8C] flex-shrink-0">{term}</span>
      <span className="text-[#6B7A8D] leading-relaxed">{desc}</span>
    </div>
  )
}

function SectionLabel({ text }) {
  return (
    <div className="flex items-center gap-2 mt-4">
      <div className="w-1.5 h-5 rounded-full bg-[#0A2240] flex-shrink-0" />
      <p className="text-sm font-bold text-[#0A2240]">{text}</p>
    </div>
  )
}