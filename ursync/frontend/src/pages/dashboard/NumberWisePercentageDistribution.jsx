// src/pages/dashboard/NumberWisePercentageDistribution.jsx
// Distribution Analysis → Percentage Distribution → Number Wise.
import React from 'react'
import PercentageDistributionBase from './PercentageDistributionBase'

export default function NumberWisePercentageDistribution({ fyTo }) {
  return (
    <PercentageDistributionBase
      fyTo={fyTo}
      metricKey="tenders"
      unitLabel="Number of Tenders"
    />
  )
}