// src/pages/dashboard/BidsReceivedTrend.jsx
// Last 12 Months Trend → No. of Bids Received.
import React from 'react'
import LastTwelveMonthsTrendBase from './LastTwelveMonthsTrendBase'

export default function BidsReceivedTrend() {
  return (
    <LastTwelveMonthsTrendBase
      tag="L2"
      title="Number Of Bids Received"
      badgeLabel="No.of Bids Received"
      metricKey="bids"
      unitLabel="No. Of Bids"
      lineColor="#D97706"
    />
  )
}