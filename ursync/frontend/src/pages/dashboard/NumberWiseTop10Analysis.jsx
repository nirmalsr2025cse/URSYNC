// src/pages/dashboard/NumberWiseTop10Analysis.jsx
// Descriptive Analysis → Top 10 Analysis → Number Wise.
import React from 'react'
import Top10AnalysisBase from './Top10AnalysisBase'

export default function NumberWiseTop10Analysis({ fyTo }) {
  return (
    <Top10AnalysisBase
      fyTo={fyTo}
      sortKey="tenders"
      tagBase={1}
      unitLabel="No. of Tenders"
      barColorKey="blue"
    />
  )
}