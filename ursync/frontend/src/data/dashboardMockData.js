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

// Preset ranges for the single "Select Year Range" control used by
// Year Over Year — each option is a consecutive year pair (step of 1).
export const YEAR_RANGE_OPTIONS = (() => {
  const ranges = []
  for (let i = 0; i + 1 < FINANCIAL_YEARS.length; i++) {
    ranges.push(`${FINANCIAL_YEARS[i].split('-')[0]}–${FINANCIAL_YEARS[i + 1].split('-')[0]}`)
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
export const CATEGORY_SPLIT = { Works: 0.42, Goods: 0.28, Services: 0.20, Consultancy: 0.10 }
export const TENDERS_CATEGORY_WISE = TENDERS_PUBLISHED_BY_FY.map(({ fy, count }) => ({
  fy,
  Works: Math.round(count * CATEGORY_SPLIT.Works),
  Goods: Math.round(count * CATEGORY_SPLIT.Goods),
  Services: Math.round(count * CATEGORY_SPLIT.Services),
  Consultancy: Math.round(count * CATEGORY_SPLIT.Consultancy),
}))

// ── TR3: Tenders type wise — derived as a share of the TR1 total ───────────
export const TYPE_SPLIT = { 'Open Tender': 0.65, 'Limited Tender': 0.20, 'Single Tender': 0.10, EOI: 0.05 }
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

// ── TR13/TR14: Valid / Cancelled / Retender split, by number and by value ──
// Valid Tender = Tender Published - (Cancelled Tenders + Retenders)
const CANCELLED_RATIO = 0.045
const RETENDER_RATIO = 0.007

export const TENDERS_PERCENTAGE_BY_FY = TENDERS_PUBLISHED_BY_FY.map(({ fy, count }) => {
  const cancelled = Math.round(count * CANCELLED_RATIO)
  const retender = Math.round(count * RETENDER_RATIO)
  return { fy, cancelled, retender, valid: count - cancelled - retender }
})

export const TENDERS_VALUE_PERCENTAGE_BY_FY = TENDERS_VALUE_BY_FY.map(({ fy, value }) => {
  const cancelled = Math.round(value * CANCELLED_RATIO)
  const retender = Math.round(value * RETENDER_RATIO)
  return { fy, cancelled, retender, valid: value - cancelled - retender }
})

// ── TR15: Bids Awarded — Number/Value by financial year ─────────────────────
// Last 6 years match the reference mock closely; earlier years are a
// plausible smaller/growing lead-in, same approach as TENDERS_PUBLISHED_BY_FY.
export const BIDS_AWARDED_BY_FY = [
  { fy: '2007-08', count: 980, value: 1450 },
  { fy: '2008-09', count: 1320, value: 1980 },
  { fy: '2009-10', count: 1710, value: 2600 },
  { fy: '2010-11', count: 2150, value: 3400 },
  { fy: '2011-12', count: 2680, value: 4300 },
  { fy: '2012-13', count: 3120, value: 5200 },
  { fy: '2013-14', count: 3610, value: 6100 },
  { fy: '2014-15', count: 4080, value: 7050 },
  { fy: '2015-16', count: 4460, value: 7900 },
  { fy: '2016-17', count: 3950, value: 6800 },
  { fy: '2017-18', count: 5060, value: 8900 },
  { fy: '2018-19', count: 6280, value: 11200 },
  { fy: '2019-20', count: 7300, value: 13400 },
  { fy: '2020-21', count: 3200, value: 5600 },
  { fy: '2021-22', count: 5119, value: 12301.24 },
  { fy: '2022-23', count: 11079, value: 27243.48 },
  { fy: '2023-24', count: 49116, value: 68291.5 },
  { fy: '2024-25', count: 39374, value: 168888.18 },
  { fy: '2025-26', count: 69545, value: 1317753.59 },
  { fy: '2026-27', count: 324, value: 147.85 },
]

// ── TR16: Bids Awarded — category wise (count + value, same split ratios) ──
export const BIDS_AWARDED_CATEGORY_WISE_COUNT = BIDS_AWARDED_BY_FY.map(({ fy, count }) => ({
  fy,
  Works: Math.round(count * CATEGORY_SPLIT.Works),
  Goods: Math.round(count * CATEGORY_SPLIT.Goods),
  Services: Math.round(count * CATEGORY_SPLIT.Services),
  Consultancy: Math.round(count * CATEGORY_SPLIT.Consultancy),
}))
export const BIDS_AWARDED_CATEGORY_WISE_VALUE = BIDS_AWARDED_BY_FY.map(({ fy, value }) => ({
  fy,
  Works: Math.round(value * CATEGORY_SPLIT.Works * 100) / 100,
  Goods: Math.round(value * CATEGORY_SPLIT.Goods * 100) / 100,
  Services: Math.round(value * CATEGORY_SPLIT.Services * 100) / 100,
  Consultancy: Math.round(value * CATEGORY_SPLIT.Consultancy * 100) / 100,
}))

// ── TR17: Bids Awarded — type wise (count + value, same split ratios) ──────
export const BIDS_AWARDED_TYPE_WISE_COUNT = BIDS_AWARDED_BY_FY.map(({ fy, count }) => ({
  fy,
  'Open Tender': Math.round(count * TYPE_SPLIT['Open Tender']),
  'Limited Tender': Math.round(count * TYPE_SPLIT['Limited Tender']),
  'Single Tender': Math.round(count * TYPE_SPLIT['Single Tender']),
  EOI: Math.round(count * TYPE_SPLIT.EOI),
}))
export const BIDS_AWARDED_TYPE_WISE_VALUE = BIDS_AWARDED_BY_FY.map(({ fy, value }) => ({
  fy,
  'Open Tender': Math.round(value * TYPE_SPLIT['Open Tender'] * 100) / 100,
  'Limited Tender': Math.round(value * TYPE_SPLIT['Limited Tender'] * 100) / 100,
  'Single Tender': Math.round(value * TYPE_SPLIT['Single Tender'] * 100) / 100,
  EOI: Math.round(value * TYPE_SPLIT.EOI * 100) / 100,
}))

// ── TR18: Bids Awarded — organization wise (table, Rs. in Lakhs) ────────────
export const BIDS_AWARDED_ORGANIZATIONS = [
  { sNo: 1, name: 'Tamilnadu Newsprint and Papers Limited', noOfTenders: 571, valOfTenders: 76315.27, bidsAwardedCount: 74, bidsAwardedValue: 9105.93 },
  { sNo: 2, name: 'Rural Development and Panchayat Raj Department', noOfTenders: 1334, valOfTenders: 20969.98, bidsAwardedCount: 56, bidsAwardedValue: 556.61 },
  { sNo: 3, name: 'Tamil Nadu Housing Board', noOfTenders: 253, valOfTenders: 1942.15, bidsAwardedCount: 39, bidsAwardedValue: 346.13 },
  { sNo: 4, name: 'MAWS', noOfTenders: 2588, valOfTenders: 131054.13, bidsAwardedCount: 26, bidsAwardedValue: 305.64 },
  { sNo: 5, name: 'Directorate of Technical Education', noOfTenders: 586, valOfTenders: 456.36, bidsAwardedCount: 23, bidsAwardedValue: 24.16 },
  { sNo: 6, name: 'Tamil Nadu Police Housing Corporation', noOfTenders: 61, valOfTenders: 6157.66, bidsAwardedCount: 15, bidsAwardedValue: 350.00 },
  { sNo: 7, name: 'Tamil Nadu Water Supply and Drainage Board', noOfTenders: 742, valOfTenders: 18420.55, bidsAwardedCount: 62, bidsAwardedValue: 2210.40 },
  { sNo: 8, name: 'Highways Department', noOfTenders: 1980, valOfTenders: 245310.80, bidsAwardedCount: 118, bidsAwardedValue: 15420.75 },
  { sNo: 9, name: 'Tamil Nadu Medical Services Corporation', noOfTenders: 410, valOfTenders: 9870.42, bidsAwardedCount: 31, bidsAwardedValue: 890.22 },
  { sNo: 10, name: 'Chennai Metropolitan Water Supply and Sewerage Board', noOfTenders: 305, valOfTenders: 14260.90, bidsAwardedCount: 28, bidsAwardedValue: 1120.35 },
  { sNo: 11, name: 'Road Department', noOfTenders: 305, valOfTenders: 14260.90, bidsAwardedCount: 28, bidsAwardedValue: 1120.35 },
  { sNo: 12, name: 'PWD', noOfTenders: 305, valOfTenders: 14260.90, bidsAwardedCount: 28, bidsAwardedValue: 1120.35 },
  { sNo: 13, name: 'Chennai Metropolitan Water Supply', noOfTenders: 305, valOfTenders: 14260.90, bidsAwardedCount: 28, bidsAwardedValue: 1120.35 },
  { sNo: 14, name: 'Sewerage Board', noOfTenders: 305, valOfTenders: 14260.90, bidsAwardedCount: 28, bidsAwardedValue: 1120.35 },
  { sNo: 15, name: 'Chennai Metropolitan Water Supply and Sewerage Board', noOfTenders: 305, valOfTenders: 14260.90, bidsAwardedCount: 28, bidsAwardedValue: 1120.35 },
  { sNo: 16, name: 'Chennai Metropolitan Water Supply and Sewerage Board', noOfTenders: 305, valOfTenders: 14260.90, bidsAwardedCount: 28, bidsAwardedValue: 1120.35 },
]

// ── BI1: MSME vs Non-MSME bidders, by financial year ────────────────────────
// MSME is 0 across the board here, same as the reference mock — this looks
// like a real data-capture gap on the live portal (MSME flag not being
// populated) rather than an intentional "no MSME bidders" story. Swap in
// real ratios once that's available; the chart already handles a non-zero
// MSME series without any code changes.
export const BIDDER_MSME_BY_FY = [
  { fy: '2007-08', msme: 0, nonMsme: 620 },
  { fy: '2008-09', msme: 0, nonMsme: 850 },
  { fy: '2009-10', msme: 0, nonMsme: 1120 },
  { fy: '2010-11', msme: 0, nonMsme: 1450 },
  { fy: '2011-12', msme: 0, nonMsme: 1820 },
  { fy: '2012-13', msme: 0, nonMsme: 2200 },
  { fy: '2013-14', msme: 0, nonMsme: 2650 },
  { fy: '2014-15', msme: 0, nonMsme: 3080 },
  { fy: '2015-16', msme: 0, nonMsme: 3400 },
  { fy: '2016-17', msme: 0, nonMsme: 3000 },
  { fy: '2017-18', msme: 0, nonMsme: 3850 },
  { fy: '2018-19', msme: 0, nonMsme: 4700 },
  { fy: '2019-20', msme: 0, nonMsme: 5500 },
  { fy: '2020-21', msme: 0, nonMsme: 2400 },
  { fy: '2021-22', msme: 0, nonMsme: 3948 },
  { fy: '2022-23', msme: 0, nonMsme: 7247 },
  { fy: '2023-24', msme: 0, nonMsme: 13428 },
  { fy: '2024-25', msme: 0, nonMsme: 5184 },
  { fy: '2025-26', msme: 0, nonMsme: 7197 },
  { fy: '2026-27', msme: 0, nonMsme: 596 },
].map((r) => ({ ...r, total: r.msme + r.nonMsme }))

// ── B1: Bids Analysis — No. of Tenders vs No. of Bids received, by FY ──────
// Last 6 years match the reference mock; earlier years reuse
// TENDERS_PUBLISHED_BY_FY's counts for the tenders side, with bids scaled
// up ~1.7x (roughly the ratio seen across the mock's recent years).
const BIDS_RECEIVED_OVERRIDES = {
  '2021-22': { tenders: 28896, bids: 56702 },
  '2022-23': { tenders: 81780, bids: 132521 },
  '2023-24': { tenders: 174784, bids: 293932 },
  '2024-25': { tenders: 95047, bids: 176554 },
  '2025-26': { tenders: 165088, bids: 283534 },
  '2026-27': { tenders: 10763, bids: 16564 },
}
export const BIDS_RECEIVED_BY_FY = TENDERS_PUBLISHED_BY_FY.map(({ fy, count }) => {
  const override = BIDS_RECEIVED_OVERRIDES[fy]
  if (override) return { fy, ...override }
  return { fy, tenders: count, bids: Math.round(count * 1.7) }
})

// ── B2–B4: Bids Analysis — by tender category (same split ratios as TR2) ───
function bidsReceivedByCategory(categoryKey) {
  const ratio = CATEGORY_SPLIT[categoryKey]
  return BIDS_RECEIVED_BY_FY.map(({ fy, tenders, bids }) => ({
    fy,
    tenders: Math.round(tenders * ratio),
    bids: Math.round(bids * ratio),
  }))
}
export const BIDS_RECEIVED_GOODS = bidsReceivedByCategory('Goods')
export const BIDS_RECEIVED_SERVICES = bidsReceivedByCategory('Services')
export const BIDS_RECEIVED_WORKS = bidsReceivedByCategory('Works')

// ── Top 10 Analysis — Tender Publishing Entities (140 total) ────────────────
// The first 13 rows are the entities visible in the reference mock — figures
// match exactly (same set, whether sorted by tenders or by value). The rest
// is a deterministically-generated tail (mulberry32 seeded PRNG, not
// Math.random) so page reloads don't reshuffle the numbers, filling the
// list out to the "Top 140" the reference header shows.
const TOP10_KNOWN_ENTITIES = [
  { name: 'Rural Development and Panchayat Raj Department', tenders: 72604, value: 990363.51, bids: 108684 },
  { name: 'MAWS', tenders: 27575, value: 1767926.70, bids: 32155 },
  { name: 'Directorate of Town Panchayats', tenders: 23077, value: 693846.81, bids: 31257 },
  { name: 'SE- (RD),TN', tenders: 11692, value: 415866.10, bids: 11262 },
  { name: 'TNEB Limited', tenders: 11496, value: 3998212.04, bids: 25601 },
  { name: 'Corporation of Chennai', tenders: 8938, value: 561487.86, bids: 20172 },
  { name: 'Department of Sugar', tenders: 3622, value: 80956.76, bids: 13081 },
  { name: 'Highways', tenders: 2418, value: 1294151.49, bids: 7765 },
  { name: 'PWD', tenders: 2197, value: 518498.43, bids: 5319 },
  { name: 'Directorate of Technical Education', tenders: 1775, value: 410184.56, bids: 5689 },
  { name: 'CMWSS Board', tenders: 243, value: 1059468.94, bids: 1058 },
  { name: 'Tamil Nadu Civil Supplies Corporation', tenders: 829, value: 900614.39, bids: 2241 },
  { name: 'TWAD', tenders: 159, value: 490126.62, bids: 364 },
]

function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const TOP10_NAME_PREFIXES = ['District Collectorate', 'Municipal Corporation', 'Panchayat Union', 'Directorate of', 'Department of', 'Board of', 'Corporation of']
const TOP10_NAME_SUFFIXES = ['Chennai', 'Coimbatore', 'Madurai', 'Trichy', 'Salem', 'Tirunelveli', 'Vellore', 'Erode', 'Thanjavur', 'Dindigul', 'Kanchipuram', 'Cuddalore', 'Karur', 'Namakkal', 'Sivaganga', 'Theni', 'Nagercoil', 'Krishnagiri', 'Ariyalur', 'Perambalur']

function generateTop10Tail(count, seed) {
  const rand = mulberry32(seed)
  const entries = []
  for (let i = 0; i < count; i++) {
    const prefix = TOP10_NAME_PREFIXES[Math.floor(rand() * TOP10_NAME_PREFIXES.length)]
    const suffix = TOP10_NAME_SUFFIXES[Math.floor(rand() * TOP10_NAME_SUFFIXES.length)]
    const scale = 1 - i / (count + 20) // trends downward with rank
    const tenders = Math.max(5, Math.round(150 * scale * (0.4 + rand() * 0.6)))
    const value = Math.round(tenders * (20 + rand() * 60) * 100) / 100
    const bids = Math.round(tenders * (1.2 + rand() * 1.8))
    entries.push({ name: `${prefix} ${suffix} ${i + 1}`, tenders, value, bids })
  }
  return entries
}

export const TOP10_PUBLISHING_ENTITIES = [...TOP10_KNOWN_ENTITIES, ...generateTop10Tail(127, 42)]
  .map((e, i) => ({ sNo: i + 1, ...e }))

// ── Last 12 Months Trend (L1/L2/L3 sidebar pages) ───────────────────────────
// Unlike every other export above (fixed by-financial-year arrays), this is
// generated from the *actual current date* each time it's called — the
// visible window is always "the 12 months ending with the current month"
// and rolls forward automatically once a new month starts, with no mock
// data to edit by hand. Numbers are deterministic per calendar month
// (seeded off year*12+monthIndex, reusing the mulberry32 PRNG already
// defined above for the Top 10 tail) so re-rendering/reloading never
// reshuffles a given month's values — only real time passing changes what
// the window shows.
const TREND_MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function generateTrendMonthRow(year, monthIndex) {
  const seedKey = year * 12 + monthIndex
  const rand = mulberry32(seedKey * 7919 + 13)

  const wave = Math.sin(seedKey / 2.3) // slow oscillation across months
  const noise = (rand() - 0.5)

  const tenders = Math.max(50, Math.round(9000 + wave * 9000 + noise * 4000))
  const valueCr = Math.round((tenders * (1.1 + rand() * 0.6)) * 100) / 100
  const bids = Math.round(tenders * (1.6 + rand() * 0.9))
  const entities = Math.max(10, Math.round(900 + wave * 700 + noise * 500))

  return {
    label: `${TREND_MONTH_LABELS[monthIndex]}-${year}`,
    year,
    monthIndex,
    tenders,
    value: valueCr,
    bids,
    entities,
  }
}

/**
 * Returns the 12 months ending with the current calendar month (oldest
 * first), each shaped as:
 *   { label: 'Jul-2026', year, monthIndex, tenders, value, bids, entities }
 * Called fresh (no caching) so it always reflects "today" — once a new
 * month begins, the window includes it and drops the oldest month
 * automatically, with no code or data changes required.
 */
export function getLastTwelveMonths(referenceDate = new Date()) {
  const rows = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1)
    rows.push(generateTrendMonthRow(d.getFullYear(), d.getMonth()))
  }
  return rows
}

// ── Year Over Year (Y1/Y2 sidebar page) ──────────────────────────────────────
// Financial-year-ordered (Apr → Mar) monthly tender counts, reusing the same
// generateTrendMonthRow() helper as getLastTwelveMonths() above so numbers
// stay consistent across pages. Months that haven't happened yet in the
// *real* calendar (relative to referenceDate) come back as 0, matching the
// reference mock's "current partial year" look — e.g. selecting the FY
// that's still in progress shows real data through the current month and
// zero afterward, with no manual updates needed as time passes.
const FY_MONTH_ORDER = [
  { name: 'Apr', jsMonth: 3 }, { name: 'May', jsMonth: 4 }, { name: 'Jun', jsMonth: 5 },
  { name: 'Jul', jsMonth: 6 }, { name: 'Aug', jsMonth: 7 }, { name: 'Sep', jsMonth: 8 },
  { name: 'Oct', jsMonth: 9 }, { name: 'Nov', jsMonth: 10 }, { name: 'Dec', jsMonth: 11 },
  { name: 'Jan', jsMonth: 0 }, { name: 'Feb', jsMonth: 1 }, { name: 'Mar', jsMonth: 2 },
]

function fyLabel(startYear) {
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`
}

// One financial year (Apr of fyStartYear → Mar of fyStartYear+1) as 12
// monthly tender counts, zeroing out any month later than referenceDate.
function buildFyMonthlyTenders(fyStartYear, referenceDate) {
  return FY_MONTH_ORDER.map(({ jsMonth }, i) => {
    const calYear = i < 9 ? fyStartYear : fyStartYear + 1 // Apr-Dec vs Jan-Mar
    const isFuture =
      calYear > referenceDate.getFullYear() ||
      (calYear === referenceDate.getFullYear() && jsMonth > referenceDate.getMonth())
    if (isFuture) return 0
    return generateTrendMonthRow(calYear, jsMonth).tenders
  })
}

/**
 * Y1: current FY vs previous FY, month by month, plus % growth over the
 * same month last year. fyTo is a "2026-27"-style label (matches the
 * sidebar's Financial Year Filter value).
 */
export function getYearOverYearTenders(fyTo, referenceDate = new Date()) {
  const startYear = parseInt(fyTo.split('-')[0], 10)
  const prevStartYear = startYear - 1

  const current = buildFyMonthlyTenders(startYear, referenceDate)
  const previous = buildFyMonthlyTenders(prevStartYear, referenceDate)

  const growth = current.map((c, i) => {
    const p = previous[i]
    if (!p) return null // no prior-year base to compare against
    return Math.round(((c - p) / p) * 10000) / 100
  })

  return {
    labels: FY_MONTH_ORDER.map((m) => m.name),
    currentFYLabel: fyLabel(startYear),
    previousFYLabel: fyLabel(prevStartYear),
    current,
    previous,
    growth,
  }
}

/**
 * Y2: the selected FY plus the two FYs before it, month by month — three
 * bar series, no growth line.
 */
export function getLastThreeYearsTrend(fyTo, referenceDate = new Date()) {
  const startYear = parseInt(fyTo.split('-')[0], 10)
  const years = [startYear - 2, startYear - 1, startYear]
  return {
    labels: FY_MONTH_ORDER.map((m) => m.name),
    series: years.map((y) => ({
      label: fyLabel(y),
      data: buildFyMonthlyTenders(y, referenceDate),
    })),
  }
}

// ── Distribution Analysis → Percentage Distribution ──────────────────────────
// "Central Organisations (Top 20)" pie/donut data. The first 15 names and
// percentages match the reference mock exactly (Number Wise, FY 2026-27);
// the reference list is cut off at 15 rows in the screenshot but its
// header says "Top 20", so 5 more entries are added deterministically
// (mulberry32-seeded, reusing the file's existing PRNG) so the pie always
// has a full Top 20 and sums to 100%.
const CENTRAL_ORG_NAMES = [
  'Airports Authority of India',
  'Archaeological Survey of India',
  'Bhabha Atomic Research Centre',
  'Bharat Sanchar Nigam Limited (Govt of India Enterprise)',
  'DG, Indo-Tibetan Border Police Force',
  'Damodar Valley Corporation',
  'Defence Research and Development Organisation',
  'Delhi Development Authority',
  'Department of Posts',
  'Directorate General Defence Estates',
  'E-IN-C BRANCH - MILITARY ENGINEER SERVICES',
  'Employees State Insurance Corporation',
  'Food Corporation of India',
  'IHQ of MoD (Army)-(OSCC)',
  'Ministry of Road Transport and Highways',
  'Central Water Commission',
  'National Highways Authority of India',
  'Central Public Works Department',
  'Indian Railways Construction Company',
  'Geological Survey of India',
]

// Known percentages for the first 15 (Number Wise, FY 2026-27) — matches
// the reference mock. Remaining 5 share the leftover percentage, split
// deterministically below rather than hand-typed (the reference screenshot
// is cut off before showing them).
const CENTRAL_ORG_BASE_PCT_KNOWN = [
  1.63, 1.46, 0.47, 3.75, 0.96, 0.62, 0.87, 3.59, 1.92, 1.40, 57.49, 0.57, 0.77, 6.66, 1.92,
]

function splitRemainder(totalPct, count, seed) {
  const rand = mulberry32(seed)
  const weights = Array.from({ length: count }, () => 0.4 + rand() * 0.6)
  const weightSum = weights.reduce((a, b) => a + b, 0)
  return weights.map((w) => Math.round((w / weightSum) * totalPct * 100) / 100)
}

const CENTRAL_ORG_BASE_PCT = [
  ...CENTRAL_ORG_BASE_PCT_KNOWN,
  ...splitRemainder(100 - CENTRAL_ORG_BASE_PCT_KNOWN.reduce((a, b) => a + b, 0), 5, 901),
]

// Deterministically perturbs the base percentage set and renormalizes to
// 100 — used to give "Value Wise" and any FY other than 2026-27 a related
// but distinct distribution, instead of just reusing identical numbers.
function seededPercentVariant(basePct, seed) {
  const rand = mulberry32(seed)
  const perturbed = basePct.map((p) => Math.max(0.05, p * (0.7 + rand() * 0.6)))
  const sum = perturbed.reduce((a, b) => a + b, 0)
  return perturbed.map((p) => Math.round((p / sum) * 10000) / 100)
}

/**
 * metric: 'tenders' (Number Wise) | 'value' (Value Wise)
 * Returns 20 rows sorted by descending share:
 *   { name, percentage, amount }
 * where `amount` is a No. of Tenders count for 'tenders' or a Rs.-in-Lakhs
 * figure for 'value'. FY 2026-27 + 'tenders' reproduces the reference
 * mock's exact percentages; every other FY/metric combination is a
 * deterministic variant seeded off both, so changing either control
 * changes the chart while staying stable across re-renders.
 */
export function getCentralOrganisationsDistribution(fyTo, metric) {
  const startYear = parseInt(fyTo.split('-')[0], 10)
  const isReferenceCase = metric === 'tenders' && fyTo === '2026-27'
  const seed = (metric === 'value' ? 7 : 3) * (startYear + 1) + 11

  const percentages = isReferenceCase
    ? CENTRAL_ORG_BASE_PCT
    : seededPercentVariant(CENTRAL_ORG_BASE_PCT, seed)

  const totalBase = metric === 'value' ? 850000 : 5000

  return CENTRAL_ORG_NAMES.map((name, i) => ({
    name,
    percentage: percentages[i],
    amount: Math.round((totalBase * percentages[i]) / 100 * 100) / 100,
  })).sort((a, b) => b.percentage - a.percentage)
}

// ── Distribution Analysis → Bidder Distribution ──────────────────────────────
// District-wise (not state-wise) registered-bidder distribution across
// Tamil Nadu, for the "Bidder Distribution" sidebar page (no sub-metrics,
// no FY filter — a single cumulative view). One district (Chennai, as the
// commercial/registration hub) dominates the share, echoing the reference
// mock's single-slice-heavy pattern; the rest is split deterministically
// (mulberry32-seeded, reusing the file's existing PRNG) across the
// remaining 37 districts so it always sums to 100%.
const TAMIL_NADU_DISTRICTS = [
  'Chennai', 'Ariyalur', 'Chengalpattu', 'Coimbatore', 'Cuddalore', 'Dharmapuri',
  'Dindigul', 'Erode', 'Kallakurichi', 'Kanchipuram', 'Kanyakumari', 'Karur',
  'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam', 'Namakkal',
  'Nilgiris', 'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Salem',
  'Sivaganga', 'Tenkasi', 'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli',
  'Tirunelveli', 'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai',
  'Tiruvarur', 'Vellore', 'Viluppuram', 'Virudhunagar',
]

const CHENNAI_SHARE_PCT = 58.4 // dominant district, echoes the reference mock's heavy single slice

/**
 * Returns 38 rows (one per TN district) sorted by descending share:
 *   { name, percentage, amount }
 * `amount` is an estimated registered-bidder count, derived from the
 * portal-wide "Bidders Registered" figure in OVERVIEW_STATS.
 */
export function getBidderDistributionByDistrict() {
  const rand = mulberry32(4177)
  const remainderCount = TAMIL_NADU_DISTRICTS.length - 1
  const weights = Array.from({ length: remainderCount }, () => 0.3 + rand() * 0.7)
  const weightSum = weights.reduce((a, b) => a + b, 0)
  const remainderPct = 100 - CHENNAI_SHARE_PCT

  const percentages = [CHENNAI_SHARE_PCT, ...weights.map((w) => Math.round((w / weightSum) * remainderPct * 100) / 100)]

  const totalBidders = 52860 // matches OVERVIEW_STATS' "Bidders Registered" figure

  return TAMIL_NADU_DISTRICTS.map((name, i) => ({
    name,
    percentage: percentages[i],
    amount: Math.round((totalBidders * percentages[i]) / 100),
  })).sort((a, b) => b.percentage - a.percentage)
}

// ── Key Performance Indicators → Tender Published ────────────────────────────
// Avg. no. of days between "Tender Published" and each downstream milestone
// (K1–K5), split by tender type (Open / Limited / Others). K5 ("Published
// to Fin. Evaluation" — the full pipeline) matches the reference mock's
// last 6 years exactly, including 2026-27 coming back as 0/0/0 since that
// year hasn't run its course yet. Earlier years are a plausible steady
// lead-in. K1–K4 are derived as a fraction of the K5 (full pipeline) days,
// since each is an earlier checkpoint in the same process — e.g. document
// download happens much sooner after publishing than financial evaluation
// does.
const KPI_TENDER_PUBLISHED_K5_BASE = [
  { fy: '2007-08', Open: 65, Limited: 110, Others: 58 },
  { fy: '2008-09', Open: 68, Limited: 115, Others: 60 },
  { fy: '2009-10', Open: 70, Limited: 120, Others: 62 },
  { fy: '2010-11', Open: 72, Limited: 125, Others: 64 },
  { fy: '2011-12', Open: 74, Limited: 130, Others: 66 },
  { fy: '2012-13', Open: 76, Limited: 135, Others: 68 },
  { fy: '2013-14', Open: 78, Limited: 140, Others: 70 },
  { fy: '2014-15', Open: 80, Limited: 145, Others: 72 },
  { fy: '2015-16', Open: 82, Limited: 150, Others: 74 },
  { fy: '2016-17', Open: 79, Limited: 148, Others: 71 },
  { fy: '2017-18', Open: 84, Limited: 155, Others: 76 },
  { fy: '2018-19', Open: 87, Limited: 160, Others: 79 },
  { fy: '2019-20', Open: 89, Limited: 165, Others: 82 },
  { fy: '2020-21', Open: 95, Limited: 175, Others: 90 },
  { fy: '2021-22', Open: 100, Limited: 181, Others: 88 },
  { fy: '2022-23', Open: 90, Limited: 163, Others: 46 },
  { fy: '2023-24', Open: 91, Limited: 142, Others: 103 },
  { fy: '2024-25', Open: 75, Limited: 75, Others: 60 },
  { fy: '2025-26', Open: 56, Limited: 75, Others: 55 },
  { fy: '2026-27', Open: 0, Limited: 0, Others: 0 },
]

const KPI_STAGE_RATIOS = {
  docDownload: 0.12,
  techOpening: 0.35,
  techEvaluation: 0.58,
  finOpening: 0.78,
  finEvaluation: 1,
}

// stageKey: 'docDownload' | 'techOpening' | 'techEvaluation' | 'finOpening' | 'finEvaluation'
export function getKpiTenderPublishedStage(stageKey) {
  const ratio = KPI_STAGE_RATIOS[stageKey] ?? 1
  return KPI_TENDER_PUBLISHED_K5_BASE.map((row) => ({
    fy: row.fy,
    Open: row.fy === '2026-27' ? 0 : Math.round(row.Open * ratio),
    Limited: row.fy === '2026-27' ? 0 : Math.round(row.Limited * ratio),
    Others: row.fy === '2026-27' ? 0 : Math.round(row.Others * ratio),
  }))
}

const KPI_BIDS_SUBMISSION_BASE = [
  { fy: '2007-08', Open: 10, Limited: 110, Others: 190 },
  { fy: '2008-09', Open: 20, Limited: 115, Others: 180 },
  { fy: '2009-10', Open: 30, Limited: 120, Others: 170 },
  { fy: '2010-11', Open: 40, Limited: 125, Others: 160 },
  { fy: '2011-12', Open: 50, Limited: 130, Others: 150 },
  { fy: '2012-13', Open: 60, Limited: 135, Others: 140 },
  { fy: '2013-14', Open: 70, Limited: 140, Others: 130 },
  { fy: '2014-15', Open: 80, Limited: 145, Others: 120 },
  { fy: '2015-16', Open: 90, Limited: 150, Others: 110 },
  { fy: '2016-17', Open: 100, Limited: 148, Others: 100 },
  { fy: '2017-18', Open: 110, Limited: 155, Others: 90 },
  { fy: '2018-19', Open: 120, Limited: 160, Others: 80 },
  { fy: '2019-20', Open: 130, Limited: 165, Others: 70 },
  { fy: '2020-21', Open: 140, Limited: 175, Others: 60 },
  { fy: '2021-22', Open: 150, Limited: 181, Others: 50 },
  { fy: '2022-23', Open: 160, Limited: 163, Others: 40 },
  { fy: '2023-24', Open: 170, Limited: 142, Others: 30 },
  { fy: '2024-25', Open: 180, Limited: 75, Others: 20 },
  { fy: '2025-26', Open: 190, Limited: 75, Others: 10 },
  { fy: '2026-27', Open: 0, Limited: 0, Others: 0 },
]

const KPI_BIDS_SUBMISSION_RATIOS = {
  submitted: 1,
  qualified: 0.72,
  rejected: 0.18,
}

export function getKpiBidsSubmissionByFy(stageKey) {
  const ratio = KPI_BIDS_SUBMISSION_RATIOS[stageKey] ?? 1
  return KPI_BIDS_SUBMISSION_BASE.map((row) => ({
    fy: row.fy,
    Open: row.fy === '2026-27' ? 0 : Math.round(row.Open * ratio),
    Limited: row.fy === '2026-27' ? 0 : Math.round(row.Limited * ratio),
    Others: row.fy === '2026-27' ? 0 : Math.round(row.Others * ratio),
  }))
}

// ── KPI: Tech. and Fin. ──────────────────────────────────────────────────
// One row per FY, per K-metric. 2026-27 is the current/in-progress FY so
// it's zeroed, same convention as the other KPI base data.
export const KPI_TECH_OPEN_EVAL = [
  { fy: '2007-08', Limited: 6,  Open: 10, Others: 4 },
  { fy: '2008-09', Limited: 7,  Open: 11, Others: 5 },
  { fy: '2009-10', Limited: 7,  Open: 12, Others: 5 },
  { fy: '2010-11', Limited: 8,  Open: 13, Others: 6 },
  { fy: '2011-12', Limited: 8,  Open: 14, Others: 6 },
  { fy: '2012-13', Limited: 9,  Open: 15, Others: 7 },
  { fy: '2013-14', Limited: 9,  Open: 16, Others: 7 },
  { fy: '2014-15', Limited: 10, Open: 17, Others: 8 },
  { fy: '2015-16', Limited: 10, Open: 18, Others: 8 },
  { fy: '2016-17', Limited: 11, Open: 19, Others: 9 },
  { fy: '2017-18', Limited: 11, Open: 20, Others: 9 },
  { fy: '2018-19', Limited: 12, Open: 21, Others: 10 },
  { fy: '2019-20', Limited: 12, Open: 22, Others: 10 },
  { fy: '2020-21', Limited: 13, Open: 23, Others: 11 },
  { fy: '2021-22', Limited: 14, Open: 28, Others: 68 },
  { fy: '2022-23', Limited: 16, Open: 20, Others: 12 },
  { fy: '2023-24', Limited: 18, Open: 23, Others: 23 },
  { fy: '2024-25', Limited: 15, Open: 24, Others: 9 },
  { fy: '2025-26', Limited: 11, Open: 18, Others: 9 },
  { fy: '2026-27', Limited: 0,  Open: 0,  Others: 0 },
]

// Derived placeholders for the other three K-metrics until real numbers
// land — same base FY/row shape, scaled by a ratio. Swap for real data
// whenever it's available; the component doesn't care how these are built.
function scaleKpiRows(base, ratio) {
  return base.map((row) => ({
    fy: row.fy,
    Limited: row.fy === '2026-27' ? 0 : Math.round(row.Limited * ratio),
    Open: row.fy === '2026-27' ? 0 : Math.round(row.Open * ratio),
    Others: row.fy === '2026-27' ? 0 : Math.round(row.Others * ratio),
  }))
}

export const KPI_TECH_EVAL_FIN_OPEN = scaleKpiRows(KPI_TECH_OPEN_EVAL, 0.55)
export const KPI_FIN_OPEN_FIN_EVAL = scaleKpiRows(KPI_TECH_OPEN_EVAL, 0.35)
export const KPI_TECH_OPEN_FIN_OPEN = KPI_TECH_OPEN_EVAL

// ── KPI: Bids Awarded ─────────────────────────────────────────────────────
// One row per FY, per K-metric. 2026-27 is the current/in-progress FY so
// it's zeroed. K11 values for 2021-22 → 2025-26 are the real figures from
// the reference dashboard; earlier years and K12/K13 are placeholders —
// swap in real numbers once available.
export const KPI_PUBLISH_TO_AWARDED = [
  { fy: '2007-08', Others: 40,  Open: 55,  Limited: 15 },
  { fy: '2008-09', Others: 45,  Open: 60,  Limited: 17 },
  { fy: '2009-10', Others: 50,  Open: 65,  Limited: 18 },
  { fy: '2010-11', Others: 55,  Open: 70,  Limited: 20 },
  { fy: '2011-12', Others: 60,  Open: 75,  Limited: 22 },
  { fy: '2012-13', Others: 65,  Open: 80,  Limited: 24 },
  { fy: '2013-14', Others: 70,  Open: 85,  Limited: 26 },
  { fy: '2014-15', Others: 75,  Open: 90,  Limited: 28 },
  { fy: '2015-16', Others: 80,  Open: 95,  Limited: 30 },
  { fy: '2016-17', Others: 85,  Open: 100, Limited: 32 },
  { fy: '2017-18', Others: 90,  Open: 105, Limited: 34 },
  { fy: '2018-19', Others: 95,  Open: 110, Limited: 36 },
  { fy: '2019-20', Others: 100, Open: 115, Limited: 38 },
  { fy: '2020-21', Others: 110, Open: 130, Limited: 42 },
  { fy: '2021-22', Others: 156, Open: 190, Limited: 40 },
  { fy: '2022-23', Others: 244, Open: 164, Limited: 53 },
  { fy: '2023-24', Others: 109, Open: 129, Limited: 51 },
  { fy: '2024-25', Others: 66,  Open: 111, Limited: 49 },
  { fy: '2025-26', Others: 65,  Open: 80,  Limited: 48 },
  { fy: '2026-27', Others: 0,   Open: 0,   Limited: 0 },
]

// Derived placeholders for the other two K-metrics until real numbers
// land — same base FY/row shape, scaled by a ratio.
function scaleKpiAwardedRows(base, ratio) {
  return base.map((row) => ({
    fy: row.fy,
    Others: row.fy === '2026-27' ? 0 : Math.round(row.Others * ratio),
    Open: row.fy === '2026-27' ? 0 : Math.round(row.Open * ratio),
    Limited: row.fy === '2026-27' ? 0 : Math.round(row.Limited * ratio),
  }))
}

export const KPI_FIN_OPEN_TO_AWARDED = scaleKpiAwardedRows(KPI_PUBLISH_TO_AWARDED, 0.42)
export const KPI_TECH_OPEN_TO_AWARDED = scaleKpiAwardedRows(KPI_PUBLISH_TO_AWARDED, 0.65)

// ── KPI: Bids Validity Period ────────────────────────────────────────────
// One row per FY, per K-metric. Values are percentages (0-100), so they
// don't get the ₹/count treatment other KPI rows do. 2026-27 is the
// current/in-progress FY so it's zeroed.
export const KPI_AWARDED_WITHIN_VALIDITY = [
  { fy: '2007-08', Open: 40, Others: 55, Limited: 50 },
  { fy: '2008-09', Open: 42, Others: 57, Limited: 52 },
  { fy: '2009-10', Open: 44, Others: 58, Limited: 53 },
  { fy: '2010-11', Open: 45, Others: 59, Limited: 55 },
  { fy: '2011-12', Open: 46, Others: 60, Limited: 56 },
  { fy: '2012-13', Open: 47, Others: 61, Limited: 57 },
  { fy: '2013-14', Open: 48, Others: 62, Limited: 58 },
  { fy: '2014-15', Open: 49, Others: 63, Limited: 59 },
  { fy: '2015-16', Open: 50, Others: 64, Limited: 60 },
  { fy: '2016-17', Open: 51, Others: 65, Limited: 61 },
  { fy: '2017-18', Open: 52, Others: 66, Limited: 62 },
  { fy: '2018-19', Open: 53, Others: 67, Limited: 63 },
  { fy: '2019-20', Open: 54, Others: 68, Limited: 64 },
  { fy: '2020-21', Open: 55, Others: 69, Limited: 65 },
  { fy: '2021-22', Open: 48, Others: 66, Limited: 71 },
  { fy: '2022-23', Open: 52, Others: 83, Limited: 57 },
  { fy: '2023-24', Open: 64, Others: 60, Limited: 39 },
  { fy: '2024-25', Open: 69, Others: 44, Limited: 62 },
  { fy: '2025-26', Open: 76, Others: 62, Limited: 60 },
  { fy: '2026-27', Open: 0,  Others: 0,  Limited: 0 },
]

// K15: "beyond validity period" is the natural complement of K14 (100 -
// within%), per series, per FY — placeholder until real data is available.
export const KPI_AWARDED_BEYOND_VALIDITY = KPI_AWARDED_WITHIN_VALIDITY.map((row) => ({
  fy: row.fy,
  Open: row.fy === '2026-27' ? 0 : 100 - row.Open,
  Others: row.fy === '2026-27' ? 0 : 100 - row.Others,
  Limited: row.fy === '2026-27' ? 0 : 100 - row.Limited,
}))


export const MSR_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// ── MSR Report: District-wise Data Analysis (Tamil Nadu) ─────────────────
// One row per TN district, for a given FY + month selection. Real app:
// this would be an API call keyed by { fy, month }; wired as static mock
// data for now so the page/table/pagination can be built and tested.
export const MSR_DISTRICTS_DATA = [
  { sno: 1,  name: 'Ariyalur',            monthTenders: 210,   monthValue: 320.45,   prevTenders: 195,   prevValue: 290.10,   cumFyTenders: 610,   cumFyValue: 980.00,    inceptionTenders: 18420,  inceptionValue: 42100.50,  awardedTenders: 480,  awardedValue: 610.20 },
  { sno: 2,  name: 'Chengalpattu',        monthTenders: 1840,  monthValue: 4200.80,  prevTenders: 1720,  prevValue: 3890.30,  cumFyTenders: 5200,  cumFyValue: 11400.00,  inceptionTenders: 210340, inceptionValue: 480230.60, awardedTenders: 3980, awardedValue: 5620.90 },
  { sno: 3,  name: 'Chennai',             monthTenders: 3420,  monthValue: 9800.60,  prevTenders: 3180,  prevValue: 8900.40,  cumFyTenders: 9800,  cumFyValue: 26400.00,  inceptionTenders: 480560, inceptionValue: 1120450.30,awardedTenders: 7620, awardedValue: 12400.55 },
  { sno: 4,  name: 'Coimbatore',          monthTenders: 2960,  monthValue: 7100.25,  prevTenders: 2740,  prevValue: 6400.10,  cumFyTenders: 8100,  cumFyValue: 18900.00,  inceptionTenders: 398450, inceptionValue: 860230.40, awardedTenders: 6210, awardedValue: 9840.35 },
  { sno: 5,  name: 'Cuddalore',           monthTenders: 980,   monthValue: 1850.30,  prevTenders: 910,   prevValue: 1620.20,  cumFyTenders: 2780,  cumFyValue: 4900.00,   inceptionTenders: 112340, inceptionValue: 240560.80, awardedTenders: 2140, awardedValue: 2980.44 },
  { sno: 6,  name: 'Dharmapuri',          monthTenders: 640,   monthValue: 1120.40,  prevTenders: 590,   prevValue: 980.15,   cumFyTenders: 1820,  cumFyValue: 3100.00,   inceptionTenders: 76340,  inceptionValue: 148230.60, awardedTenders: 1420, awardedValue: 1890.22 },
  { sno: 7,  name: 'Dindigul',            monthTenders: 870,   monthValue: 1640.55,  prevTenders: 800,   prevValue: 1420.30,  cumFyTenders: 2460,  cumFyValue: 4300.00,   inceptionTenders: 98450,  inceptionValue: 192340.70, awardedTenders: 1890, awardedValue: 2450.18 },
  { sno: 8,  name: 'Erode',               monthTenders: 1320,  monthValue: 2900.70,  prevTenders: 1240,  prevValue: 2600.40,  cumFyTenders: 3800,  cumFyValue: 7600.00,   inceptionTenders: 168230, inceptionValue: 340450.90, awardedTenders: 2860, awardedValue: 3980.60 },
  { sno: 9,  name: 'Kallakurichi',        monthTenders: 420,   monthValue: 780.20,   prevTenders: 390,   prevValue: 680.10,   cumFyTenders: 1180,  cumFyValue: 2000.00,   inceptionTenders: 42340,  inceptionValue: 82340.30,  awardedTenders: 980,  awardedValue: 1240.15 },
  { sno: 10, name: 'Kanchipuram',         monthTenders: 1580,  monthValue: 3400.60,  prevTenders: 1460,  prevValue: 3000.30,  cumFyTenders: 4500,  cumFyValue: 9200.00,   inceptionTenders: 182340, inceptionValue: 398450.60, awardedTenders: 3240, awardedValue: 4620.28 },
  { sno: 11, name: 'Kanyakumari',         monthTenders: 760,   monthValue: 1420.35,  prevTenders: 700,   prevValue: 1240.20,  cumFyTenders: 2140,  cumFyValue: 3700.00,   inceptionTenders: 86340,  inceptionValue: 168230.50, awardedTenders: 1640, awardedValue: 2140.30 },
  { sno: 12, name: 'Karur',               monthTenders: 540,   monthValue: 980.40,   prevTenders: 500,   prevValue: 850.20,   cumFyTenders: 1520,  cumFyValue: 2600.00,   inceptionTenders: 58230,  inceptionValue: 112340.40, awardedTenders: 1180, awardedValue: 1520.18 },
  { sno: 13, name: 'Krishnagiri',         monthTenders: 780,   monthValue: 1480.50,  prevTenders: 720,   prevValue: 1280.30,  cumFyTenders: 2200,  cumFyValue: 3800.00,   inceptionTenders: 92340,  inceptionValue: 180230.60, awardedTenders: 1720, awardedValue: 2280.24 },
  { sno: 14, name: 'Madurai',             monthTenders: 1920,  monthValue: 4400.70,  prevTenders: 1780,  prevValue: 3900.40,  cumFyTenders: 5400,  cumFyValue: 11800.00,  inceptionTenders: 224560, inceptionValue: 490340.70, awardedTenders: 4120, awardedValue: 5980.42 },
  { sno: 15, name: 'Mayiladuthurai',      monthTenders: 380,   monthValue: 680.25,   prevTenders: 350,   prevValue: 600.15,   cumFyTenders: 1080,  cumFyValue: 1800.00,   inceptionTenders: 38230,  inceptionValue: 72340.30,  awardedTenders: 880,  awardedValue: 1080.12 },
  { sno: 16, name: 'Nagapattinam',        monthTenders: 460,   monthValue: 840.30,   prevTenders: 420,   prevValue: 730.20,   cumFyTenders: 1300,  cumFyValue: 2200.00,   inceptionTenders: 46340,  inceptionValue: 88450.40,  awardedTenders: 1020, awardedValue: 1290.15 },
  { sno: 17, name: 'Namakkal',            monthTenders: 680,   monthValue: 1240.40,  prevTenders: 630,   prevValue: 1080.25,  cumFyTenders: 1920,  cumFyValue: 3300.00,   inceptionTenders: 78340,  inceptionValue: 152340.50, awardedTenders: 1480, awardedValue: 1920.20 },
  { sno: 18, name: 'Nilgiris',            monthTenders: 320,   monthValue: 560.20,   prevTenders: 300,   prevValue: 480.10,   cumFyTenders: 900,   cumFyValue: 1500.00,   inceptionTenders: 32340,  inceptionValue: 60230.20,  awardedTenders: 720,  awardedValue: 890.08 },
  { sno: 19, name: 'Perambalur',          monthTenders: 190,   monthValue: 340.15,   prevTenders: 175,   prevValue: 290.10,   cumFyTenders: 550,   cumFyValue: 900.00,    inceptionTenders: 18230,  inceptionValue: 34230.20,  awardedTenders: 440,  awardedValue: 540.10 },
  { sno: 20, name: 'Pudukkottai',         monthTenders: 620,   monthValue: 1100.35,  prevTenders: 570,   prevValue: 960.20,   cumFyTenders: 1760,  cumFyValue: 3000.00,   inceptionTenders: 72340,  inceptionValue: 138230.40, awardedTenders: 1360, awardedValue: 1740.18 },
  { sno: 21, name: 'Ramanathapuram',      monthTenders: 480,   monthValue: 860.30,   prevTenders: 440,   prevValue: 750.20,   cumFyTenders: 1360,  cumFyValue: 2300.00,   inceptionTenders: 54230,  inceptionValue: 102340.30, awardedTenders: 1060, awardedValue: 1340.14 },
  { sno: 22, name: 'Ranipet',             monthTenders: 720,   monthValue: 1340.45,  prevTenders: 660,   prevValue: 1160.30,  cumFyTenders: 2040,  cumFyValue: 3500.00,   inceptionTenders: 82340,  inceptionValue: 160230.50, awardedTenders: 1580, awardedValue: 2040.22 },
  { sno: 23, name: 'Salem',               monthTenders: 1680,  monthValue: 3700.60,  prevTenders: 1560,  prevValue: 3300.40,  cumFyTenders: 4800,  cumFyValue: 10200.00,  inceptionTenders: 196340, inceptionValue: 420450.60, awardedTenders: 3620, awardedValue: 5120.36 },
  { sno: 24, name: 'Sivaganga',           monthTenders: 440,   monthValue: 800.25,   prevTenders: 400,   prevValue: 690.20,   cumFyTenders: 1240,  cumFyValue: 2100.00,   inceptionTenders: 48340,  inceptionValue: 92340.30,  awardedTenders: 960,  awardedValue: 1220.13 },
  { sno: 25, name: 'Tenkasi',             monthTenders: 390,   monthValue: 700.20,   prevTenders: 360,   prevValue: 610.15,   cumFyTenders: 1100,  cumFyValue: 1900.00,   inceptionTenders: 40340,  inceptionValue: 76340.30,  awardedTenders: 860,  awardedValue: 1080.11 },
  { sno: 26, name: 'Thanjavur',           monthTenders: 1140,  monthValue: 2400.50,  prevTenders: 1060,  prevValue: 2100.30,  cumFyTenders: 3240,  cumFyValue: 6300.00,   inceptionTenders: 134340, inceptionValue: 260340.60, awardedTenders: 2420, awardedValue: 3220.28 },
  { sno: 27, name: 'Theni',               monthTenders: 420,   monthValue: 760.25,   prevTenders: 390,   prevValue: 660.20,   cumFyTenders: 1180,  cumFyValue: 2000.00,   inceptionTenders: 44340,  inceptionValue: 84340.30,  awardedTenders: 920,  awardedValue: 1160.12 },
  { sno: 28, name: 'Thoothukudi',         monthTenders: 860,   monthValue: 1620.40,  prevTenders: 800,   prevValue: 1420.30,  cumFyTenders: 2440,  cumFyValue: 4200.00,   inceptionTenders: 96340,  inceptionValue: 186340.50, awardedTenders: 1880, awardedValue: 2440.20 },
  { sno: 29, name: 'Tiruchirappalli',     monthTenders: 1740,  monthValue: 3800.55,  prevTenders: 1620,  prevValue: 3400.40,  cumFyTenders: 4960,  cumFyValue: 10600.00,  inceptionTenders: 204340, inceptionValue: 440340.60, awardedTenders: 3760, awardedValue: 5340.34 },
  { sno: 30, name: 'Tirunelveli',         monthTenders: 940,   monthValue: 1780.45,  prevTenders: 870,   prevValue: 1560.30,  cumFyTenders: 2660,  cumFyValue: 4600.00,   inceptionTenders: 106340, inceptionValue: 204340.50, awardedTenders: 2060, awardedValue: 2660.22 },
  { sno: 31, name: 'Tirupattur',          monthTenders: 340,   monthValue: 620.20,   prevTenders: 310,   prevValue: 540.15,   cumFyTenders: 960,   cumFyValue: 1600.00,   inceptionTenders: 34340,  inceptionValue: 64340.30,  awardedTenders: 760,  awardedValue: 940.10 },
  { sno: 32, name: 'Tiruppur',            monthTenders: 1260,  monthValue: 2700.50,  prevTenders: 1170,  prevValue: 2380.30,  cumFyTenders: 3560,  cumFyValue: 7400.00,   inceptionTenders: 148340, inceptionValue: 300340.60, awardedTenders: 2680, awardedValue: 3660.30 },
  { sno: 33, name: 'Tiruvallur',          monthTenders: 1420,  monthValue: 3100.55,  prevTenders: 1320,  prevValue: 2740.40,  cumFyTenders: 4020,  cumFyValue: 8400.00,   inceptionTenders: 166340, inceptionValue: 340340.60, awardedTenders: 3020, awardedValue: 4180.32 },
  { sno: 34, name: 'Tiruvannamalai',      monthTenders: 680,   monthValue: 1240.35,  prevTenders: 630,   prevValue: 1080.25,  cumFyTenders: 1920,  cumFyValue: 3300.00,   inceptionTenders: 78340,  inceptionValue: 150340.40, awardedTenders: 1480, awardedValue: 1900.18 },
  { sno: 35, name: 'Tiruvarur',           monthTenders: 360,   monthValue: 640.20,   prevTenders: 330,   prevValue: 560.15,   cumFyTenders: 1020,  cumFyValue: 1700.00,   inceptionTenders: 36340,  inceptionValue: 68340.30,  awardedTenders: 800,  awardedValue: 1000.10 },
  { sno: 36, name: 'Vellore',             monthTenders: 900,   monthValue: 1700.40,  prevTenders: 840,   prevValue: 1500.30,  cumFyTenders: 2560,  cumFyValue: 4400.00,   inceptionTenders: 100340, inceptionValue: 194340.50, awardedTenders: 1960, awardedValue: 2560.22 },
  { sno: 37, name: 'Viluppuram',          monthTenders: 820,   monthValue: 1520.35,  prevTenders: 760,   prevValue: 1320.25,  cumFyTenders: 2320,  cumFyValue: 4000.00,   inceptionTenders: 90340,  inceptionValue: 174340.40, awardedTenders: 1780, awardedValue: 2320.20 },
  { sno: 38, name: 'Virudhunagar',        monthTenders: 620,   monthValue: 1120.30,  prevTenders: 570,   prevValue: 960.20,   cumFyTenders: 1760,  cumFyValue: 3000.00,   inceptionTenders: 68340,  inceptionValue: 132340.40, awardedTenders: 1340, awardedValue: 1720.16 },
]