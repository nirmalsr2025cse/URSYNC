// src/pages/dashboard/TenderPublishingEntitiesTrend.jsx
// Last 12 Months Trend → No. of Tender Publishing Entities.
import React from 'react'
import LastTwelveMonthsTrendBase from './LastTwelveMonthsTrendBase'

export default function TenderPublishingEntitiesTrend() {
  return (
    <LastTwelveMonthsTrendBase
      tag="L3"
      title="No. of Tender Publishing Entities"
      badgeLabel="No. of Tender Publishing Entities"
      metricKey="entities"
      unitLabel="No. of Tender Publishing Entities"
      lineColor="#0A2240"
    />
  )
}