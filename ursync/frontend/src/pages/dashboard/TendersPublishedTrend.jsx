// src/pages/dashboard/TendersPublishedTrend.jsx
// Last 12 Months Trend → No. of Tenders Published (the default sub-option
// for this sidebar section).
import React from 'react'
import LastTwelveMonthsTrendBase from './LastTwelveMonthsTrendBase'

export default function TendersPublishedTrend() {
  return (
    <LastTwelveMonthsTrendBase
      tag="L1"
      title="Number Of Tenders Published"
      badgeLabel="No.of Tenders Published"
      metricKey="tenders"
      unitLabel="No. Of Tenders"
      lineColor="#1A4A8C"
    />
  )
}