// src/utils/financialYearUtils.js
// Pure date and financial year utilities for dynamic live calculations

export function buildFinancialYears(startYear, endYear) {
  const years = []
  for (let y = startYear; y <= endYear; y++) {
    years.push(`${y}-${String((y + 1) % 100).padStart(2, '0')}`)
  }
  return years
}

export function getCurrentFinancialYear() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0 = Jan, 3 = Apr, 11 = Dec
  const startYear = month >= 3 ? year : year - 1
  const endYear = startYear + 1
  return {
    startYear,
    endYear,
    fyString: `${startYear}-${String(endYear % 100).padStart(2, '0')}`,
  }
}

// Generates dynamic rolling default FY range of 6 years (e.g. 2021-22 to 2026-27; next year 2022-23 to 2027-28)
export function getDefaultRollingFyRange(windowSize = 6) {
  const { startYear } = getCurrentFinancialYear()
  const fromStartYear = startYear - (windowSize - 1)
  const fromEndYear = fromStartYear + 1
  const toEndYear = startYear + 1
  return {
    fyFrom: `${fromStartYear}-${String(fromEndYear % 100).padStart(2, '0')}`,
    fyTo: `${startYear}-${String(toEndYear % 100).padStart(2, '0')}`,
  }
}

// 2007-08 … dynamic current FY (e.g. 2026-27, 2027-28, etc.)
export const FINANCIAL_YEARS = buildFinancialYears(2007, getCurrentFinancialYear().startYear)

export const YEAR_RANGE_OPTIONS = (() => {
  const ranges = []
  for (let i = 0; i + 1 < FINANCIAL_YEARS.length; i++) {
    ranges.push(`${FINANCIAL_YEARS[i].split('-')[0]}–${FINANCIAL_YEARS[i + 1].split('-')[0]}`)
  }
  return ranges
})()

export const MSR_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]
