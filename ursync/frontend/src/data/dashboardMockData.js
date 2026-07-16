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