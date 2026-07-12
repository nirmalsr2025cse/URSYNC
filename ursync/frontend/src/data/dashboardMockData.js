// src/data/dashboardMockData.js
// ── Mock chart data for the E-procurement Dashboard module ──────────────────
// Covers: Descriptive Analysis → Tender Analysis → Number Wise (the only
// section wired up in this pass). Replace with live API data once the
// backend endpoints are available — shapes are kept simple on purpose so
// swapping a fetch() in for each export is a drop-in change later.

function buildFinancialYears(startYear, endYear) {
  const years = []
  for (let y = startYear; y <= endYear; y++) {
    years.push(`${y}-${String((y + 1) % 100).padStart(2, '0')}`)
  }
  return years
}

// 2007-08 … 2026-27 ("2007 – Till Date" per the overview stat card)
export const FINANCIAL_YEARS = buildFinancialYears(2007, 2026)

// Preset ranges for the single "Select Year Range" control used by
// Year Over Year (sidebar-only for now, not yet wired to a page).
export const YEAR_RANGE_OPTIONS = (() => {
  const ranges = []
  for (let i = 0; i + 5 < FINANCIAL_YEARS.length; i++) {
    ranges.push(`${FINANCIAL_YEARS[i].split('-')[0]}–${FINANCIAL_YEARS[i + 5].split('-')[0]}`)
  }
  return ranges
})()

// ── Portal-wide overview stats (top stat card row) ──────────────────────────
export const OVERVIEW_STATS = [
  { label: 'Tenders Published', value: '8,65,773', sub: '2007 – Till Date', icon: 'doc', tone: 'blue' },
  { label: 'Tender Value (Approx.)', value: '₹6,58,420 Cr', sub: 'Cumulative Value', icon: 'rupee', tone: 'emerald' },
  { label: 'Bids Received', value: '13,42,650', sub: 'Cumulative', icon: 'inbox', tone: 'amber' },
  { label: 'Organizations', value: '4,120', sub: 'Registered', icon: 'building', tone: 'navy' },
  { label: 'Bidders', value: '52,860', sub: 'Registered', icon: 'users', tone: 'red' },
  { label: 'Dept. Users', value: '11,240', sub: 'Active Users', icon: 'usercheck', tone: 'slate' },
]

// ── TR1: No. of tenders published, by financial year ────────────────────────
export const TENDERS_PUBLISHED_BY_FY = [
  { fy: '2007-08', count: 6200 },
  { fy: '2008-09', count: 8450 },
  { fy: '2009-10', count: 10900 },
  { fy: '2010-11', count: 13600 },
  { fy: '2011-12', count: 16800 },
  { fy: '2012-13', count: 19200 },
  { fy: '2013-14', count: 22450 },
  { fy: '2014-15', count: 25100 },
  { fy: '2015-16', count: 27300 },
  { fy: '2016-17', count: 24800 },
  { fy: '2017-18', count: 31500 },
  { fy: '2018-19', count: 38900 },
  { fy: '2019-20', count: 45200 },
  { fy: '2020-21', count: 19750 },
  { fy: '2021-22', count: 28896 },
  { fy: '2022-23', count: 81780 },
  { fy: '2023-24', count: 174784 },
  { fy: '2024-25', count: 95047 },
  { fy: '2025-26', count: 165088 },
  { fy: '2026-27', count: 10028 },
]

// ── TR2: Tenders category wise — derived as a share of the TR1 total ────────
const CATEGORY_SPLIT = { Works: 0.42, Goods: 0.28, Services: 0.20, Consultancy: 0.10 }
export const TENDERS_CATEGORY_WISE = TENDERS_PUBLISHED_BY_FY.map(({ fy, count }) => ({
  fy,
  Works: Math.round(count * CATEGORY_SPLIT.Works),
  Goods: Math.round(count * CATEGORY_SPLIT.Goods),
  Services: Math.round(count * CATEGORY_SPLIT.Services),
  Consultancy: Math.round(count * CATEGORY_SPLIT.Consultancy),
}))

// ── TR3: Tenders type wise — derived as a share of the TR1 total ───────────
const TYPE_SPLIT = { 'Open Tender': 0.65, 'Limited Tender': 0.20, 'Single Tender': 0.10, EOI: 0.05 }
export const TENDERS_TYPE_WISE = TENDERS_PUBLISHED_BY_FY.map(({ fy, count }) => ({
  fy,
  'Open Tender': Math.round(count * TYPE_SPLIT['Open Tender']),
  'Limited Tender': Math.round(count * TYPE_SPLIT['Limited Tender']),
  'Single Tender': Math.round(count * TYPE_SPLIT['Single Tender']),
  EOI: Math.round(count * TYPE_SPLIT.EOI),
}))

// ── TR4: Tenders stage wise — funnel, relative to the TR1 total ────────────
const STAGE_SPLIT = {
  Published: 1,
  'Bid Submission': 0.82,
  'Technical Evaluation': 0.71,
  'Financial Evaluation': 0.65,
  Awarded: 0.58,
}
export const TENDERS_STAGE_WISE = TENDERS_PUBLISHED_BY_FY.map(({ fy, count }) => ({
  fy,
  Published: Math.round(count * STAGE_SPLIT.Published),
  'Bid Submission': Math.round(count * STAGE_SPLIT['Bid Submission']),
  'Technical Evaluation': Math.round(count * STAGE_SPLIT['Technical Evaluation']),
  'Financial Evaluation': Math.round(count * STAGE_SPLIT['Financial Evaluation']),
  Awarded: Math.round(count * STAGE_SPLIT.Awarded),
}))

// ── TR5: Value of tenders published, by financial year (Rs. in Crores) ─────
export const TENDERS_VALUE_BY_FY = [
  { fy: '2007-08', value: 9800 },
  { fy: '2008-09', value: 12400 },
  { fy: '2009-10', value: 15800 },
  { fy: '2010-11', value: 19500 },
  { fy: '2011-12', value: 24200 },
  { fy: '2012-13', value: 28700 },
  { fy: '2013-14', value: 33200 },
  { fy: '2014-15', value: 37700 },
  { fy: '2015-16', value: 41200 },
  { fy: '2016-17', value: 36500 },
  { fy: '2017-18', value: 46800 },
  { fy: '2018-19', value: 58200 },
  { fy: '2019-20', value: 67300 },
  { fy: '2020-21', value: 29800 },
  { fy: '2021-22', value: 42621 },
  { fy: '2022-23', value: 74560 },
  { fy: '2023-24', value: 169460 },
  { fy: '2024-25', value: 112606 },
  { fy: '2025-26', value: 181613 },
  { fy: '2026-27', value: 7963 },
]

// ── TR6: Tender value category wise — same split ratios as TR2 ─────────────
export const TENDERS_VALUE_CATEGORY_WISE = TENDERS_VALUE_BY_FY.map(({ fy, value }) => ({
  fy,
  Works: Math.round(value * CATEGORY_SPLIT.Works),
  Goods: Math.round(value * CATEGORY_SPLIT.Goods),
  Services: Math.round(value * CATEGORY_SPLIT.Services),
  Consultancy: Math.round(value * CATEGORY_SPLIT.Consultancy),
}))

// ── TR7: Tender value type wise — same split ratios as TR3 ──────────────────
export const TENDERS_VALUE_TYPE_WISE = TENDERS_VALUE_BY_FY.map(({ fy, value }) => ({
  fy,
  'Open Tender': Math.round(value * TYPE_SPLIT['Open Tender']),
  'Limited Tender': Math.round(value * TYPE_SPLIT['Limited Tender']),
  'Single Tender': Math.round(value * TYPE_SPLIT['Single Tender']),
  EOI: Math.round(value * TYPE_SPLIT.EOI),
}))

// ── TR8: Tender value stage wise — same funnel ratios as TR4 ────────────────
export const TENDERS_VALUE_STAGE_WISE = TENDERS_VALUE_BY_FY.map(({ fy, value }) => ({
  fy,
  Published: Math.round(value * STAGE_SPLIT.Published),
  'Bid Submission': Math.round(value * STAGE_SPLIT['Bid Submission']),
  'Technical Evaluation': Math.round(value * STAGE_SPLIT['Technical Evaluation']),
  'Financial Evaluation': Math.round(value * STAGE_SPLIT['Financial Evaluation']),
  Awarded: Math.round(value * STAGE_SPLIT.Awarded),
}))