// src/pages/dashboard/ValueWiseTop10Analysis.jsx
// Descriptive Analysis → Top 10 Analysis → Value Wise.
import React from 'react'
import Top10AnalysisBase from './Top10AnalysisBase'

export default function ValueWiseTop10Analysis({ fyTo }) {
  return (
    <Top10AnalysisBase
      fyTo={fyTo}
      sortKey="value"
      tagBase={5}
      unitLabel="Value of Tenders(Rs. in Lakhs)"
      barColorKey="emerald"
    />
  )
}