// src/pages/dashboard/ValueWisePercentageDistribution.jsx
// Distribution Analysis → Percentage Distribution → Value Wise.
import React from 'react'
import PercentageDistributionBase from './PercentageDistributionBase'

export default function ValueWisePercentageDistribution({ fyTo }) {
  return (
    <PercentageDistributionBase
      fyTo={fyTo}
      metricKey="value"
      unitLabel="Value of Tenders"
    />
  )
}