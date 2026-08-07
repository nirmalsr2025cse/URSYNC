// src/components/TenderCardGrid.jsx
//
// Reusable grid/list renderer for TenderCard instances.
// Any page (Home, TenderByDepartment, CancelledRetendered, etc.) can import
// this component, pass its own filtered array of tenders, and get a fully
// consistent card layout without duplicating rendering logic.
//
// Props:
//   tenders      – array of tender objects (required)
//   viewMode     – 'grid' | 'list'  (default: 'grid')
//   onCardClick  – (tender, idx) => void  (optional; called when a card is clicked)
//   activeMarker – index of the highlighted card (optional)
//   className    – extra classes for the outer wrapper (optional)
//   cardFooter   – (tender) => ReactNode  — optional per-card footer content
//
// Empty / loading states are NOT handled here — pages keep that responsibility
// so each page can show page-specific messaging.
//
import React from 'react'
import TenderCard from './TenderCard'

export default function TenderCardGrid({
  tenders = [],
  viewMode = 'grid',
  onCardClick,
  activeMarker = null,
  className = '',
  cardFooter,
}) {
  if (!tenders || tenders.length === 0) return null

  const isGrid = viewMode !== 'list'

  return (
    <div
      className={[
        isGrid
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch'
          : 'flex flex-col gap-3',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {tenders.map((tender, idx) =>
        isGrid ? (
          <div key={tender.id} className="flex">
            <TenderCard
              tender={tender}
              viewMode="grid"
              className="flex-1"
              highlighted={activeMarker === idx}
              onClick={onCardClick ? () => onCardClick(tender, idx) : undefined}
              footer={cardFooter ? cardFooter(tender) : false}
            />
          </div>
        ) : (
          <TenderCard
            key={tender.id}
            tender={tender}
            viewMode="list"
            highlighted={activeMarker === idx}
            onClick={onCardClick ? () => onCardClick(tender, idx) : undefined}
            footer={cardFooter ? cardFooter(tender) : false}
          />
        )
      )}
    </div>
  )
}
