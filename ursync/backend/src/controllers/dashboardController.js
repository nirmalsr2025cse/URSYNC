// src/controllers/dashboardController.js
const Tender = require('../models/Tender')
const CreateTender = require('../models/CreateTender')
const Department = require('../models/Department')
const User = require('../models/User')
const Role = require('../models/Role')
const BiddersList = require('../models/BiddersList')
const AppliedBidder = require('../models/AppliedBidder')
const Category = require('../models/Category')
const FinalBidders = require('../models/FinalBidders')

// Helper to format numbers with Indian comma grouping
function formatIndianNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '0'
  return Number(num).toLocaleString('en-IN')
}

// Helper to format currency values strictly in Crores (₹... Cr)
function formatIndianCurrency(amount) {
  if (!amount || isNaN(amount)) return '₹0 Cr'
  const val = Number(amount)
  // 1 Crore = 10,000,000 (10^7)
  const cr = val / 10000000
  if (cr === 0) return '₹0 Cr'
  if (cr >= 1000000) {
    return `₹${cr.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr`
  }
  if (cr >= 1) {
    return `₹${cr.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Cr`
  }
  return `₹${cr.toFixed(2).replace(/\.?0+$/, '') || '0'} Cr`
}

// Helper: Get current Financial Year start year (e.g. 2026 for 2026-27)
function getCurrentFyStartYear() {
  const d = new Date()
  const month = d.getMonth()
  const year = d.getFullYear()
  return month >= 3 ? year : year - 1
}

// Helper: Given a Date object or date string, determine its Financial Year (e.g. '2026-27')
function getFinancialYear(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date()
  if (isNaN(d.getTime())) return null
  const month = d.getMonth() // 0 = Jan, 3 = Apr, 11 = Dec
  const year = d.getFullYear()
  const startYear = month >= 3 ? year : year - 1
  const endYear = startYear + 1
  return `${startYear}-${String(endYear % 100).padStart(2, '0')}`
}

// Helper: Build an array of FY strings between fyFrom and fyTo inclusive (defaults to 6-year rolling window)
function buildFyRangeList(fyFrom, fyTo) {
  const currentStartYear = getCurrentFyStartYear()
  const defaultFromStart = currentStartYear - 5 // Dynamic rolling 6-year window (e.g. 2021 for 2026)

  const startYear = fyFrom ? parseInt(fyFrom.split('-')[0], 10) : defaultFromStart
  const endYear = fyTo ? parseInt(fyTo.split('-')[0], 10) : currentStartYear
  const list = []
  const min = Math.min(startYear, endYear)
  const max = Math.max(startYear, endYear)
  for (let y = min; y <= max; y++) {
    list.push(`${y}-${String((y + 1) % 100).padStart(2, '0')}`)
  }
  return list
}

const VALID_TENDER_MATCH = {
  isDeleted: { $ne: true },
  isCancelled: { $ne: true },
  isRejected: { $ne: true },
  status: { $ne: 'Rejected' },
}

// ── GET /api/dashboard/overview-stats ─────────────────────────────────────────
exports.getOverviewStats = async (req, res) => {
  try {
    // 1. Tenders Published & Total Value (Excludes Rejected, Cancelled, Deleted)
    const tenderStats = await Tender.aggregate([
      { $match: VALID_TENDER_MATCH },
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          totalValue: { $sum: '$estimatedValue' },
        },
      },
    ])

    const totalTendersCount = tenderStats[0]?.totalCount || 0
    const totalTenderValue = tenderStats[0]?.totalValue || 0

    // 2. Bids Received (BiddersList applications + AppliedBidder count)
    const [biddersListStats, appliedBidderCount] = await Promise.all([
      BiddersList.aggregate([
        { $unwind: { path: '$applications', preserveNullAndEmptyArrays: false } },
        { $count: 'totalBids' },
      ]),
      AppliedBidder.countDocuments(),
    ])

    const totalBidsReceived = (biddersListStats[0]?.totalBids || 0) + appliedBidderCount

    // 3. Organizations (Active registered departments)
    const totalOrganizations = await Department.countDocuments({
      isActive: { $ne: false },
    })

    // 4. Bidders & Dept. Users
    const [bidderRoles, deptRoles] = await Promise.all([
      Role.find({ name: { $in: ['tender_person', 'public'] } }).select('_id'),
      Role.find({
        name: {
          $in: [
            'department_employee',
            'department_head',
            'administrator',
            'financial',
            'tender_authority',
          ],
        },
      }).select('_id'),
    ])

    const bidderRoleIds = bidderRoles.map((r) => r._id)
    const deptRoleIds = deptRoles.map((r) => r._id)

    const [totalBidders, totalDeptUsers] = await Promise.all([
      User.countDocuments({
        isDeleted: { $ne: true },
        $or: [
          { roleId: { $in: bidderRoleIds } },
          { accountType: { $in: ['Individual', 'Organization'] }, departmentId: null },
        ],
      }),
      User.countDocuments({
        isDeleted: { $ne: true },
        $or: [
          { roleId: { $in: deptRoleIds } },
          { departmentId: { $ne: null } },
        ],
      }),
    ])

    const stats = [
      {
        label: 'Tenders Published',
        value: formatIndianNumber(totalTendersCount),
        sub: '2007 – Till Date',
        icon: 'doc',
        tone: 'blue',
      },
      {
        label: 'Tender Value (Approx.)',
        value: formatIndianCurrency(totalTenderValue),
        sub: 'Cumulative Value',
        icon: 'rupee',
        tone: 'emerald',
      },
      {
        label: 'Bids Received',
        value: formatIndianNumber(totalBidsReceived),
        sub: 'Cumulative',
        icon: 'inbox',
        tone: 'amber',
      },
      {
        label: 'Organizations',
        value: formatIndianNumber(totalOrganizations),
        sub: 'Registered',
        icon: 'building',
        tone: 'navy',
      },
      {
        label: 'Bidders',
        value: formatIndianNumber(totalBidders),
        sub: 'Registered',
        icon: 'users',
        tone: 'red',
      },
      {
        label: 'Dept. Users',
        value: formatIndianNumber(totalDeptUsers),
        sub: 'Active Users',
        icon: 'usercheck',
        tone: 'slate',
      },
    ]

    return res.json({ success: true, stats })
  } catch (error) {
    console.error('Error in getOverviewStats:', error)
    return res.status(500).json({ success: false, message: 'Failed to fetch overview stats' })
  }
}

// ── GET /api/dashboard/number-wise ────────────────────────────────────────────
exports.getNumberWiseAnalysis = async (req, res) => {
  try {
    const { fyFrom = '2021-22', fyTo = '2026-27' } = req.query
    const fyRange = buildFyRangeList(fyFrom, fyTo)

    // Fetch all active published tenders (excluding Rejected, Cancelled, Deleted)
    const tenders = await Tender.find(VALID_TENDER_MATCH)
      .populate('categoryId', 'name type')
      .lean()

    // Fetch create tender drafts for tenderType resolution if needed
    const createTenders = await CreateTender.find({ isDeleted: { $ne: true } })
      .select('tenderId tenderType status application')
      .lean()

    const createTenderMap = new Map()
    for (const ct of createTenders) {
      if (ct.tenderId) createTenderMap.set(ct.tenderId, ct)
    }

    // Fetch FinalBidders to identify awarded tenders
    const finalBidders = await FinalBidders.find().select('tenderId applications').lean()
    const awardedTenderIds = new Set(
      finalBidders
        .filter((fb) => fb.applications && fb.applications.length > 0)
        .map((fb) => String(fb.tenderId))
    )

    // Fetch BiddersList to check application stages
    const biddersLists = await BiddersList.find().select('tenderId applications').lean()
    const biddersListMap = new Map()
    for (const bl of biddersLists) {
      biddersListMap.set(String(bl.tenderId), bl)
    }

    // Initialize accumulators for each FY in range
    const publishedMap = new Map()
    const categoryMap = new Map()
    const typeMap = new Map()
    const stageMap = new Map()

    for (const fy of fyRange) {
      publishedMap.set(fy, 0)
      categoryMap.set(fy, { Works: 0, Goods: 0, Services: 0, Consultancy: 0 })
      typeMap.set(fy, { 'Open Tender': 0, 'Limited Tender': 0, 'Single Tender': 0, EOI: 0 })
      stageMap.set(fy, {
        Published: 0,
        'Bid Submission': 0,
        'Technical Evaluation': 0,
        'Financial Evaluation': 0,
        Awarded: 0,
      })
    }

    // Group each tender into its corresponding Financial Year
    for (const t of tenders) {
      const tenderDate = t.startDate || t.createdAt || t.closingDate
      const fy = getFinancialYear(tenderDate)
      if (!fy || !publishedMap.has(fy)) continue

      // TR1: Tenders Published Count
      publishedMap.set(fy, publishedMap.get(fy) + 1)

      // TR2: Category Wise
      const catEntry = categoryMap.get(fy)
      let catKey = 'Works'
      if (t.procurementType) {
        if (t.procurementType === 'Works') catKey = 'Works'
        else if (t.procurementType === 'Goods') catKey = 'Goods'
        else if (t.procurementType === 'Services') catKey = 'Services'
        else if (t.procurementType === 'Consultancy') catKey = 'Consultancy'
      } else if (t.categoryId?.name) {
        const catName = t.categoryId.name.toLowerCase()
        if (catName.includes('infrastructure') || catName.includes('construction') || catName.includes('road')) {
          catKey = 'Works'
        } else if (catName.includes('goods') || catName.includes('energy') || catName.includes('equipment')) {
          catKey = 'Goods'
        } else if (catName.includes('water') || catName.includes('health') || catName.includes('sanitation')) {
          catKey = 'Services'
        } else if (catName.includes('education') || catName.includes('consult')) {
          catKey = 'Consultancy'
        } else {
          catKey = 'Works'
        }
      }
      catEntry[catKey] = (catEntry[catKey] || 0) + 1

      // TR3: Type Wise
      const typeEntry = typeMap.get(fy)
      const ctDoc = createTenderMap.get(t.tenderCode)
      const rawType = (t.tenderType || ctDoc?.tenderType || 'Open').toLowerCase()
      let typeKey = 'Open Tender'
      if (rawType.includes('limited')) typeKey = 'Limited Tender'
      else if (rawType.includes('single')) typeKey = 'Single Tender'
      else if (rawType.includes('eoi') || rawType.includes('expression')) typeKey = 'EOI'
      else typeKey = 'Open Tender'

      typeEntry[typeKey] = (typeEntry[typeKey] || 0) + 1

      // TR4: Stage Wise
      const stageEntry = stageMap.get(fy)
      stageEntry.Published += 1

      const tIdStr = String(t._id)
      const bl = biddersListMap.get(tIdStr)
      const hasApplications = (bl?.applications && bl.applications.length > 0) || t.application === 'Open' || t.application === 'Completed'
      if (hasApplications) {
        stageEntry['Bid Submission'] += 1
      }

      const hasDocApproved = t.isDocumentVerified || bl?.applications?.some((a) => a.isDocumentApproved)
      if (hasDocApproved || hasApplications) {
        stageEntry['Technical Evaluation'] += 1
      }

      const hasFinEval = t.isFinalizedBidders || awardedTenderIds.has(tIdStr) || t.financialField
      if (hasFinEval || hasDocApproved) {
        stageEntry['Financial Evaluation'] += 1
      }

      if (awardedTenderIds.has(tIdStr) || (t.status === 'Completed' && t.isFinalizedBidders)) {
        stageEntry.Awarded += 1
      }
    }

    // Format output arrays matching the required chart structure
    const tendersPublished = fyRange.map((fy) => ({
      fy,
      count: publishedMap.get(fy) || 0,
    }))

    const categoryWise = fyRange.map((fy) => ({
      fy,
      ...categoryMap.get(fy),
    }))

    const typeWise = fyRange.map((fy) => ({
      fy,
      ...typeMap.get(fy),
    }))

    const stageWise = fyRange.map((fy) => ({
      fy,
      ...stageMap.get(fy),
    }))

    return res.json({
      success: true,
      data: {
        tendersPublished,
        categoryWise,
        typeWise,
        stageWise,
      },
    })
  } catch (error) {
    console.error('Error in getNumberWiseAnalysis:', error)
    return res.status(500).json({ success: false, message: 'Failed to fetch number-wise analysis' })
  }
}
