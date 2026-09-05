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
const District = require('../models/District')

// Helper to format numbers with Indian comma grouping
function formatIndianNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '0'
  return Number(num).toLocaleString('en-IN')
}

// Helper to format currency values strictly converted to Crores (₹... Cr)
function formatIndianCurrency(amount) {
  if (!amount || isNaN(amount)) return '₹0 Cr'
  const val = Number(amount)
  // 1 Crore = 10,000,000 (10^7)
  const cr = val / 10000000
  if (cr === 0) return '₹0 Cr'

  if (cr >= 1) {
    const formatted = cr.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
    return `₹${formatted} Cr`
  }

  // Fractional Crores (< 1 Cr)
  const formatted = cr.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })
  return `₹${formatted} Cr`
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

// ── Helper to calculate value in Crores ───────────────────────────────────────
function toCrores(amount) {
  if (!amount || isNaN(amount)) return 0
  const cr = Number(amount) / 10000000
  return Number(cr.toFixed(4))
}

// ── GET /api/dashboard/value-wise ─────────────────────────────────────────────
exports.getValueWiseAnalysis = async (req, res) => {
  try {
    const { fyFrom, fyTo } = req.query
    const fyRange = buildFyRangeList(fyFrom, fyTo)

    // Fetch active published tenders (excluding Rejected, Cancelled, Deleted)
    const tenders = await Tender.find(VALID_TENDER_MATCH)
      .populate('categoryId', 'name type')
      .lean()

    const createTenders = await CreateTender.find({ isDeleted: { $ne: true } })
      .select('tenderId tenderType status application')
      .lean()

    const createTenderMap = new Map()
    for (const ct of createTenders) {
      if (ct.tenderId) createTenderMap.set(ct.tenderId, ct)
    }

    const finalBidders = await FinalBidders.find().select('tenderId applications').lean()
    const awardedTenderIds = new Set(
      finalBidders
        .filter((fb) => fb.applications && fb.applications.length > 0)
        .map((fb) => String(fb.tenderId))
    )

    const biddersLists = await BiddersList.find().select('tenderId applications').lean()
    const biddersListMap = new Map()
    for (const bl of biddersLists) {
      biddersListMap.set(String(bl.tenderId), bl)
    }

    // Accumulators for values in Crores
    const publishedVal = new Map()
    const categoryVal = new Map()
    const typeVal = new Map()
    const stageVal = new Map()

    for (const fy of fyRange) {
      publishedVal.set(fy, 0)
      categoryVal.set(fy, { Works: 0, Goods: 0, Services: 0, Consultancy: 0 })
      typeVal.set(fy, { 'Open Tender': 0, 'Limited Tender': 0, 'Single Tender': 0, EOI: 0 })
      stageVal.set(fy, {
        Published: 0,
        'Bid Submission': 0,
        'Technical Evaluation': 0,
        'Financial Evaluation': 0,
        Awarded: 0,
      })
    }

    for (const t of tenders) {
      const tenderDate = t.startDate || t.createdAt || t.closingDate
      const fy = getFinancialYear(tenderDate)
      if (!fy || !publishedVal.has(fy)) continue

      const valCr = toCrores(t.estimatedValue)

      // TR5: Total Value Published
      publishedVal.set(fy, Number((publishedVal.get(fy) + valCr).toFixed(4)))

      // TR6: Category Wise Value
      const catEntry = categoryVal.get(fy)
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
      catEntry[catKey] = Number(((catEntry[catKey] || 0) + valCr).toFixed(4))

      // TR7: Type Wise Value
      const typeEntry = typeVal.get(fy)
      const ctDoc = createTenderMap.get(t.tenderCode)
      const rawType = (t.tenderType || ctDoc?.tenderType || 'Open').toLowerCase()
      let typeKey = 'Open Tender'
      if (rawType.includes('limited')) typeKey = 'Limited Tender'
      else if (rawType.includes('single')) typeKey = 'Single Tender'
      else if (rawType.includes('eoi') || rawType.includes('expression')) typeKey = 'EOI'
      else typeKey = 'Open Tender'

      typeEntry[typeKey] = Number(((typeEntry[typeKey] || 0) + valCr).toFixed(4))

      // TR8: Stage Wise Value
      const stageEntry = stageVal.get(fy)
      stageEntry.Published = Number((stageEntry.Published + valCr).toFixed(4))

      const tIdStr = String(t._id)
      const bl = biddersListMap.get(tIdStr)
      const hasApplications = (bl?.applications && bl.applications.length > 0) || t.application === 'Open' || t.application === 'Completed'
      if (hasApplications) {
        stageEntry['Bid Submission'] = Number((stageEntry['Bid Submission'] + valCr).toFixed(4))
      }

      const hasDocApproved = t.isDocumentVerified || bl?.applications?.some((a) => a.isDocumentApproved)
      if (hasDocApproved || hasApplications) {
        stageEntry['Technical Evaluation'] = Number((stageEntry['Technical Evaluation'] + valCr).toFixed(4))
      }

      const hasFinEval = t.isFinalizedBidders || awardedTenderIds.has(tIdStr) || t.financialField
      if (hasFinEval || hasDocApproved) {
        stageEntry['Financial Evaluation'] = Number((stageEntry['Financial Evaluation'] + valCr).toFixed(4))
      }

      if (awardedTenderIds.has(tIdStr) || (t.status === 'Completed' && t.isFinalizedBidders)) {
        stageEntry.Awarded = Number((stageEntry.Awarded + valCr).toFixed(4))
      }
    }

    const tendersPublished = fyRange.map((fy) => ({
      fy,
      value: publishedVal.get(fy) || 0,
    }))

    const categoryWise = fyRange.map((fy) => ({
      fy,
      ...categoryVal.get(fy),
    }))

    const typeWise = fyRange.map((fy) => ({
      fy,
      ...typeVal.get(fy),
    }))

    const stageWise = fyRange.map((fy) => ({
      fy,
      ...stageVal.get(fy),
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
    console.error('Error in getValueWiseAnalysis:', error)
    return res.status(500).json({ success: false, message: 'Failed to fetch value-wise analysis' })
  }
}

// ── GET /api/dashboard/number-value-wise ───────────────────────────────────────
exports.getNumberValueWiseAnalysis = async (req, res) => {
  try {
    const { fyFrom, fyTo } = req.query
    const fyRange = buildFyRangeList(fyFrom, fyTo)

    // Run both queries simultaneously or combine
    const tenders = await Tender.find(VALID_TENDER_MATCH)
      .populate('categoryId', 'name type')
      .lean()

    const createTenders = await CreateTender.find({ isDeleted: { $ne: true } })
      .select('tenderId tenderType status application')
      .lean()

    const createTenderMap = new Map()
    for (const ct of createTenders) {
      if (ct.tenderId) createTenderMap.set(ct.tenderId, ct)
    }

    const finalBidders = await FinalBidders.find().select('tenderId applications').lean()
    const awardedTenderIds = new Set(
      finalBidders
        .filter((fb) => fb.applications && fb.applications.length > 0)
        .map((fb) => String(fb.tenderId))
    )

    const biddersLists = await BiddersList.find().select('tenderId applications').lean()
    const biddersListMap = new Map()
    for (const bl of biddersLists) {
      biddersListMap.set(String(bl.tenderId), bl)
    }

    // Number Maps
    const publishedCount = new Map()
    const categoryCount = new Map()
    const typeCount = new Map()
    const stageCount = new Map()

    // Value Maps (in Crores)
    const publishedVal = new Map()
    const categoryVal = new Map()
    const typeVal = new Map()
    const stageVal = new Map()

    for (const fy of fyRange) {
      publishedCount.set(fy, 0)
      categoryCount.set(fy, { Works: 0, Goods: 0, Services: 0, Consultancy: 0 })
      typeCount.set(fy, { 'Open Tender': 0, 'Limited Tender': 0, 'Single Tender': 0, EOI: 0 })
      stageCount.set(fy, {
        Published: 0,
        'Bid Submission': 0,
        'Technical Evaluation': 0,
        'Financial Evaluation': 0,
        Awarded: 0,
      })

      publishedVal.set(fy, 0)
      categoryVal.set(fy, { Works: 0, Goods: 0, Services: 0, Consultancy: 0 })
      typeVal.set(fy, { 'Open Tender': 0, 'Limited Tender': 0, 'Single Tender': 0, EOI: 0 })
      stageVal.set(fy, {
        Published: 0,
        'Bid Submission': 0,
        'Technical Evaluation': 0,
        'Financial Evaluation': 0,
        Awarded: 0,
      })
    }

    for (const t of tenders) {
      const tenderDate = t.startDate || t.createdAt || t.closingDate
      const fy = getFinancialYear(tenderDate)
      if (!fy || !publishedCount.has(fy)) continue

      const valCr = toCrores(t.estimatedValue)

      // TR9: Count & Value
      publishedCount.set(fy, publishedCount.get(fy) + 1)
      publishedVal.set(fy, Number((publishedVal.get(fy) + valCr).toFixed(4)))

      // TR10: Category Count & Value
      const catCountEntry = categoryCount.get(fy)
      const catValEntry = categoryVal.get(fy)
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
      catCountEntry[catKey] = (catCountEntry[catKey] || 0) + 1
      catValEntry[catKey] = Number(((catValEntry[catKey] || 0) + valCr).toFixed(4))

      // TR11: Type Count & Value
      const typeCountEntry = typeCount.get(fy)
      const typeValEntry = typeVal.get(fy)
      const ctDoc = createTenderMap.get(t.tenderCode)
      const rawType = (t.tenderType || ctDoc?.tenderType || 'Open').toLowerCase()
      let typeKey = 'Open Tender'
      if (rawType.includes('limited')) typeKey = 'Limited Tender'
      else if (rawType.includes('single')) typeKey = 'Single Tender'
      else if (rawType.includes('eoi') || rawType.includes('expression')) typeKey = 'EOI'
      else typeKey = 'Open Tender'

      typeCountEntry[typeKey] = (typeCountEntry[typeKey] || 0) + 1
      typeValEntry[typeKey] = Number(((typeValEntry[typeKey] || 0) + valCr).toFixed(4))

      // TR12: Stage Count & Value
      const stageCountEntry = stageCount.get(fy)
      const stageValEntry = stageVal.get(fy)

      stageCountEntry.Published += 1
      stageValEntry.Published = Number((stageValEntry.Published + valCr).toFixed(4))

      const tIdStr = String(t._id)
      const bl = biddersListMap.get(tIdStr)
      const hasApplications = (bl?.applications && bl.applications.length > 0) || t.application === 'Open' || t.application === 'Completed'
      if (hasApplications) {
        stageCountEntry['Bid Submission'] += 1
        stageValEntry['Bid Submission'] = Number((stageValEntry['Bid Submission'] + valCr).toFixed(4))
      }

      const hasDocApproved = t.isDocumentVerified || bl?.applications?.some((a) => a.isDocumentApproved)
      if (hasDocApproved || hasApplications) {
        stageCountEntry['Technical Evaluation'] += 1
        stageValEntry['Technical Evaluation'] = Number((stageValEntry['Technical Evaluation'] + valCr).toFixed(4))
      }

      const hasFinEval = t.isFinalizedBidders || awardedTenderIds.has(tIdStr) || t.financialField
      if (hasFinEval || hasDocApproved) {
        stageCountEntry['Financial Evaluation'] += 1
        stageValEntry['Financial Evaluation'] = Number((stageValEntry['Financial Evaluation'] + valCr).toFixed(4))
      }

      if (awardedTenderIds.has(tIdStr) || (t.status === 'Completed' && t.isFinalizedBidders)) {
        stageCountEntry.Awarded += 1
        stageValEntry.Awarded = Number((stageValEntry.Awarded + valCr).toFixed(4))
      }
    }

    const numberData = {
      tendersPublished: fyRange.map((fy) => ({ fy, count: publishedCount.get(fy) || 0 })),
      categoryWise: fyRange.map((fy) => ({ fy, ...categoryCount.get(fy) })),
      typeWise: fyRange.map((fy) => ({ fy, ...typeCount.get(fy) })),
      stageWise: fyRange.map((fy) => ({ fy, ...stageCount.get(fy) })),
    }

    const valueData = {
      tendersPublished: fyRange.map((fy) => ({ fy, value: publishedVal.get(fy) || 0 })),
      categoryWise: fyRange.map((fy) => ({ fy, ...categoryVal.get(fy) })),
      typeWise: fyRange.map((fy) => ({ fy, ...typeVal.get(fy) })),
      stageWise: fyRange.map((fy) => ({ fy, ...stageVal.get(fy) })),
    }

    return res.json({
      success: true,
      data: {
        numberData,
        valueData,
      },
    })
  } catch (error) {
    console.error('Error in getNumberValueWiseAnalysis:', error)
    return res.status(500).json({ success: false, message: 'Failed to fetch number-value-wise analysis' })
  }
}

// ── GET /api/dashboard/percentage-wise ─────────────────────────────────────────
exports.getPercentageWiseAnalysis = async (req, res) => {
  try {
    const { fyFrom, fyTo } = req.query
    const fyRange = buildFyRangeList(fyFrom, fyTo)

    // Find all tenders for calculating Valid vs Cancelled vs Retendered
    const tenders = await Tender.find({ isDeleted: { $ne: true } }).lean()

    const numberMap = new Map()
    const valueMap = new Map()

    for (const fy of fyRange) {
      numberMap.set(fy, { cancelled: 0, retender: 0, valid: 0 })
      valueMap.set(fy, { cancelled: 0, retender: 0, valid: 0 })
    }

    for (const t of tenders) {
      const tenderDate = t.startDate || t.createdAt || t.closingDate
      const fy = getFinancialYear(tenderDate)
      if (!fy || !numberMap.has(fy)) continue

      const numEntry = numberMap.get(fy)
      const valEntry = valueMap.get(fy)
      const valCr = toCrores(t.estimatedValue)

      if (t.isCancelled) {
        numEntry.cancelled += 1
        valEntry.cancelled = Number((valEntry.cancelled + valCr).toFixed(4))
      } else if (t.isRetendered) {
        numEntry.retender += 1
        valEntry.retender = Number((valEntry.retender + valCr).toFixed(4))
      } else if (t.status !== 'Rejected') {
        numEntry.valid += 1
        valEntry.valid = Number((valEntry.valid + valCr).toFixed(4))
      }
    }

    const byNumber = fyRange.map((fy) => ({
      fy,
      ...numberMap.get(fy),
    }))

    const byValue = fyRange.map((fy) => ({
      fy,
      ...valueMap.get(fy),
    }))

    return res.json({
      success: true,
      data: {
        byNumber,
        byValue,
      },
    })
  } catch (error) {
    console.error('Error in getPercentageWiseAnalysis:', error)
    return res.status(500).json({ success: false, message: 'Failed to fetch percentage-wise analysis' })
  }
}

// ── GET /api/dashboard/bids-awarded ───────────────────────────────────────────
exports.getBidsAwardedAnalysis = async (req, res) => {
  try {
    const { fyFrom, fyTo } = req.query
    const fyRange = buildFyRangeList(fyFrom, fyTo)

    // Fetch active published tenders (excluding Rejected, Cancelled, Deleted)
    const tenders = await Tender.find(VALID_TENDER_MATCH)
      .populate('categoryId', 'name type')
      .populate('departmentId', 'name code')
      .lean()

    const createTenders = await CreateTender.find({ isDeleted: { $ne: true } })
      .select('tenderId tenderType status application')
      .lean()

    const createTenderMap = new Map()
    for (const ct of createTenders) {
      if (ct.tenderId) createTenderMap.set(ct.tenderId, ct)
    }

    const finalBidders = await FinalBidders.find().select('tenderId departmentId applications').lean()
    const awardedTenderIds = new Set(
      finalBidders
        .filter((fb) => fb.applications && fb.applications.length > 0)
        .map((fb) => String(fb.tenderId))
    )

    const departments = await Department.find({ isActive: { $ne: false } }).lean()

    // 1. TR15: Tenders (Count & Value in Crores per FY)
    const tendersMap = new Map()
    for (const fy of fyRange) {
      tendersMap.set(fy, { count: 0, value: 0 })
    }

    // 2. TR16: Category Wise (Count & Value in Crores for the selected range)
    const categoryCount = { Works: 0, Goods: 0, Services: 0, Consultancy: 0 }
    const categoryValue = { Works: 0, Goods: 0, Services: 0, Consultancy: 0 }

    // 3. TR17: Type Wise (Count & Value in Crores for the selected range)
    const typeCount = { 'Open Tender': 0, 'Limited Tender': 0, 'Single Tender': 0, EOI: 0 }
    const typeValue = { 'Open Tender': 0, 'Limited Tender': 0, 'Single Tender': 0, EOI: 0 }

    // 4. TR18: Organization Wise tracking
    const deptStatsMap = new Map()
    for (const d of departments) {
      deptStatsMap.set(String(d._id), {
        name: d.name,
        noOfTenders: 0,
        valOfTenders: 0,
        bidsAwardedCount: 0,
        bidsAwardedValue: 0,
      })
    }

    for (const t of tenders) {
      const tenderDate = t.startDate || t.createdAt || t.closingDate
      const fy = getFinancialYear(tenderDate)
      if (!fy || !tendersMap.has(fy)) continue

      const valCr = toCrores(t.estimatedValue)
      const valLakhs = Number(((t.estimatedValue || 0) / 100000).toFixed(2))

      const tIdStr = String(t._id)
      const isAwarded = awardedTenderIds.has(tIdStr) || (t.status === 'Completed' && t.isFinalizedBidders)

      const deptIdStr = t.departmentId ? String(t.departmentId._id || t.departmentId) : null
      if (deptIdStr && deptStatsMap.has(deptIdStr)) {
        const dStat = deptStatsMap.get(deptIdStr)
        dStat.noOfTenders += 1
        dStat.valOfTenders = Number((dStat.valOfTenders + valLakhs).toFixed(2))
        if (isAwarded) {
          dStat.bidsAwardedCount += 1
          dStat.bidsAwardedValue = Number((dStat.bidsAwardedValue + valLakhs).toFixed(2))
        }
      }

      if (isAwarded) {
        // TR15
        const tEntry = tendersMap.get(fy)
        tEntry.count += 1
        tEntry.value = Number((tEntry.value + valCr).toFixed(4))

        // TR16: Category
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
        categoryCount[catKey] += 1
        categoryValue[catKey] = Number((categoryValue[catKey] + valCr).toFixed(4))

        // TR17: Type
        const ctDoc = createTenderMap.get(t.tenderCode)
        const rawType = (t.tenderType || ctDoc?.tenderType || 'Open').toLowerCase()
        let typeKey = 'Open Tender'
        if (rawType.includes('limited')) typeKey = 'Limited Tender'
        else if (rawType.includes('single')) typeKey = 'Single Tender'
        else if (rawType.includes('eoi') || rawType.includes('expression')) typeKey = 'EOI'
        else typeKey = 'Open Tender'

        typeCount[typeKey] += 1
        typeValue[typeKey] = Number((typeValue[typeKey] + valCr).toFixed(4))
      }
    }

    const tendersList = fyRange.map((fy) => ({
      fy,
      count: tendersMap.get(fy).count,
      value: tendersMap.get(fy).value,
    }))

    const organizations = Array.from(deptStatsMap.values()).map((d, index) => ({
      sNo: index + 1,
      name: d.name,
      noOfTenders: d.noOfTenders,
      valOfTenders: d.valOfTenders,
      bidsAwardedCount: d.bidsAwardedCount,
      bidsAwardedValue: d.bidsAwardedValue,
    }))

    return res.json({
      success: true,
      data: {
        tenders: tendersList,
        categoryCount,
        categoryValue,
        typeCount,
        typeValue,
        organizations,
      },
    })
  } catch (error) {
    console.error('Error in getBidsAwardedAnalysis:', error)
    return res.status(500).json({ success: false, message: 'Failed to fetch bids awarded analysis' })
  }
}

// ── GET /api/dashboard/bidder-wise ────────────────────────────────────────────
exports.getBidderWiseAnalysis = async (req, res) => {
  try {
    const { fyFrom, fyTo } = req.query
    const fyRange = buildFyRangeList(fyFrom, fyTo)

    const bidderRoles = await Role.find({ name: { $in: ['tender_person', 'public'] } }).select('_id')
    const bidderRoleIds = bidderRoles.map((r) => r._id)

    // Fetch registered bidder users
    const bidders = await User.find({
      isDeleted: { $ne: true },
      $or: [
        { roleId: { $in: bidderRoleIds } },
        { accountType: { $in: ['Individual', 'Organization'] }, departmentId: null },
      ],
    }).lean()

    // Fetch applications to see if any bidder has company/organization data
    const biddersLists = await BiddersList.find().select('applications').lean()
    const msmeUserIds = new Set()
    for (const bl of biddersLists) {
      if (bl.applications) {
        for (const a of bl.applications) {
          const form = a.formData || {}
          if (
            form.companyName ||
            form.companyRegNo ||
            form.gstNumber ||
            form.isMsme ||
            form.msme
          ) {
            msmeUserIds.add(String(a.userId))
          }
        }
      }
    }

    const currentFy = buildFyRangeList(null, null)[buildFyRangeList(null, null).length - 1]

    const statsMap = new Map()
    for (const fy of fyRange) {
      statsMap.set(fy, { msme: 0, nonMsme: 0, total: 0 })
    }

    for (const u of bidders) {
      const uDate = u.createdAt || u.updatedAt
      let fy = uDate ? getFinancialYear(uDate) : currentFy
      if (!fy || !statsMap.has(fy)) {
        fy = currentFy
      }
      if (!statsMap.has(fy)) continue

      const entry = statsMap.get(fy)
      const uIdStr = String(u._id)
      const isMsme =
        u.isMsme === true ||
        u.accountType === 'Organization' ||
        msmeUserIds.has(uIdStr)

      if (isMsme) {
        entry.msme += 1
      } else {
        entry.nonMsme += 1
      }
      entry.total += 1
    }

    const result = fyRange.map((fy) => ({
      fy,
      msme: statsMap.get(fy).msme,
      nonMsme: statsMap.get(fy).nonMsme,
      total: statsMap.get(fy).total,
    }))

    return res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Error in getBidderWiseAnalysis:', error)
    return res.status(500).json({ success: false, message: 'Failed to fetch bidder-wise analysis' })
  }
}

// ── GET /api/dashboard/bid-analysis ───────────────────────────────────────────
exports.getBidAnalysis = async (req, res) => {
  try {
    const { fyFrom, fyTo } = req.query
    const fyRange = buildFyRangeList(fyFrom, fyTo)

    // Fetch active published tenders (excluding Rejected, Cancelled, Deleted)
    const tenders = await Tender.find(VALID_TENDER_MATCH)
      .populate('categoryId', 'name type')
      .lean()

    const biddersLists = await BiddersList.find().select('tenderId applications').lean()
    const bidsPerTenderMap = new Map()
    for (const bl of biddersLists) {
      const count = (bl.applications && bl.applications.length) || 0
      bidsPerTenderMap.set(String(bl.tenderId), count)
    }

    const appliedBidders = await AppliedBidder.find().select('tenderId').lean()
    for (const ab of appliedBidders) {
      const tIdStr = String(ab.tenderId)
      bidsPerTenderMap.set(tIdStr, (bidsPerTenderMap.get(tIdStr) || 0) + 1)
    }

    // Accumulators for each sub-tab
    const receivedMap = new Map()
    const goodsMap = new Map()
    const servicesMap = new Map()
    const worksMap = new Map()

    for (const fy of fyRange) {
      receivedMap.set(fy, { tenders: 0, bids: 0, value: 0 })
      goodsMap.set(fy, { tenders: 0, bids: 0, value: 0 })
      servicesMap.set(fy, { tenders: 0, bids: 0, value: 0 })
      worksMap.set(fy, { tenders: 0, bids: 0, value: 0 })
    }

    for (const t of tenders) {
      const tenderDate = t.startDate || t.createdAt || t.closingDate
      const fy = getFinancialYear(tenderDate)
      if (!fy || !receivedMap.has(fy)) continue

      const tIdStr = String(t._id)
      const bidsCount = bidsPerTenderMap.get(tIdStr) || 0
      const valCr = toCrores(t.estimatedValue)

      // Category resolution
      let catKey = 'Works'
      if (t.procurementType) {
        if (t.procurementType === 'Goods') catKey = 'Goods'
        else if (t.procurementType === 'Services' || t.procurementType === 'Consultancy') catKey = 'Services'
        else catKey = 'Works'
      } else if (t.categoryId?.name) {
        const catName = t.categoryId.name.toLowerCase()
        if (catName.includes('goods') || catName.includes('energy') || catName.includes('equipment')) {
          catKey = 'Goods'
        } else if (catName.includes('water') || catName.includes('health') || catName.includes('education') || catName.includes('sanitation') || catName.includes('consult')) {
          catKey = 'Services'
        } else {
          catKey = 'Works'
        }
      }

      // Total Received
      const rec = receivedMap.get(fy)
      rec.tenders += 1
      rec.bids += bidsCount
      rec.value = Number((rec.value + valCr).toFixed(4))

      // Category Specific
      if (catKey === 'Goods') {
        const g = goodsMap.get(fy)
        g.tenders += 1
        g.bids += bidsCount
        g.value = Number((g.value + valCr).toFixed(4))
      } else if (catKey === 'Services') {
        const s = servicesMap.get(fy)
        s.tenders += 1
        s.bids += bidsCount
        s.value = Number((s.value + valCr).toFixed(4))
      } else {
        const w = worksMap.get(fy)
        w.tenders += 1
        w.bids += bidsCount
        w.value = Number((w.value + valCr).toFixed(4))
      }
    }

    const formatOutput = (map) =>
      fyRange.map((fy) => {
        const entry = map.get(fy)
        const avg = entry.tenders > 0 ? Number((entry.bids / entry.tenders).toFixed(2)) : 0
        return {
          fy,
          tenders: entry.tenders,
          bids: entry.bids,
          value: entry.value,
          avgBidsPerTender: avg,
        }
      })

    return res.json({
      success: true,
      data: {
        received: formatOutput(receivedMap),
        goods: formatOutput(goodsMap),
        services: formatOutput(servicesMap),
        works: formatOutput(worksMap),
      },
    })
  } catch (error) {
    console.error('Error in getBidAnalysis:', error)
    return res.status(500).json({ success: false, message: 'Failed to fetch bid analysis' })
  }
}

// ── GET /api/dashboard/top10-analysis ─────────────────────────────────────────
exports.getTop10Analysis = async (req, res) => {
  try {
    const { fy, category, sortBy = 'tenders' } = req.query
    const targetFy = fy || getFinancialYear(new Date())

    const departments = await Department.find({ isActive: { $ne: false } }).lean()
    const tenders = await Tender.find(VALID_TENDER_MATCH)
      .populate('categoryId', 'name type')
      .populate('departmentId', 'name code')
      .lean()

    const biddersLists = await BiddersList.find().select('tenderId applications').lean()
    const bidsPerTenderMap = new Map()
    for (const bl of biddersLists) {
      const count = (bl.applications && bl.applications.length) || 0
      bidsPerTenderMap.set(String(bl.tenderId), count)
    }

    const appliedBidders = await AppliedBidder.find().select('tenderId').lean()
    for (const ab of appliedBidders) {
      const tIdStr = String(ab.tenderId)
      bidsPerTenderMap.set(tIdStr, (bidsPerTenderMap.get(tIdStr) || 0) + 1)
    }

    // Map departments
    const deptMap = new Map()
    for (const d of departments) {
      deptMap.set(String(d._id), {
        id: String(d._id),
        name: d.name,
        code: d.code,
        tenders: 0,
        value: 0,
        bids: 0,
      })
    }

    for (const t of tenders) {
      const tenderDate = t.startDate || t.createdAt || t.closingDate
      const tenderFy = getFinancialYear(tenderDate)
      if (tenderFy !== targetFy) continue

      // Category matching
      let catKey = 'works'
      if (t.procurementType) {
        const pt = t.procurementType.toLowerCase()
        if (pt === 'goods') catKey = 'goods'
        else if (pt === 'services' || pt === 'consultancy') catKey = 'services'
        else catKey = 'works'
      } else if (t.categoryId?.name) {
        const catName = t.categoryId.name.toLowerCase()
        if (catName.includes('goods') || catName.includes('energy') || catName.includes('equipment')) {
          catKey = 'goods'
        } else if (catName.includes('water') || catName.includes('health') || catName.includes('education') || catName.includes('sanitation') || catName.includes('consult')) {
          catKey = 'services'
        } else {
          catKey = 'works'
        }
      }

      if (category && category !== 'all' && catKey !== category.toLowerCase()) {
        continue
      }

      const deptIdStr = t.departmentId ? String(t.departmentId._id || t.departmentId) : null
      if (deptIdStr && deptMap.has(deptIdStr)) {
        const entry = deptMap.get(deptIdStr)
        const valLakhs = Number(((t.estimatedValue || 0) / 100000).toFixed(2))
        const bids = bidsPerTenderMap.get(String(t._id)) || 0

        entry.tenders += 1
        entry.value = Number((entry.value + valLakhs).toFixed(2))
        entry.bids += bids
      }
    }

    const allEntities = Array.from(deptMap.values())
    const sortField = sortBy === 'value' ? 'value' : 'tenders'
    allEntities.sort((a, b) => b[sortField] - a[sortField])

    const allWithRank = allEntities.map((e, index) => ({
      sNo: index + 1,
      ...e,
    }))

    const top10 = allWithRank.slice(0, 10)

    return res.json({
      success: true,
      data: {
        top10,
        all: allWithRank,
        total: allWithRank.length,
      },
    })
  } catch (error) {
    console.error('Error in getTop10Analysis:', error)
    return res.status(500).json({ success: false, message: 'Failed to fetch top 10 analysis' })
  }
}

// ── GET /api/dashboard/last-12-months-trend ──────────────────────────────────
exports.getLast12MonthsTrend = async (req, res) => {
  try {
    const TREND_MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const months = []
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() // 0 - 11

    for (let i = 11; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1)
      const y = d.getFullYear()
      const m = d.getMonth()
      const label = `${TREND_MONTH_LABELS[m]}-${y}`
      const start = new Date(y, m, 1, 0, 0, 0, 0)
      const end = new Date(y, m + 1, 0, 23, 59, 59, 999)
      months.push({
        label,
        year: y,
        monthIndex: m,
        start,
        end,
        tenders: 0,
        value: 0,
        bids: 0,
        entitiesSet: new Set(),
      })
    }

    // Fetch active published tenders (excluding Rejected, Cancelled, Deleted)
    const tenders = await Tender.find(VALID_TENDER_MATCH)
      .select('estimatedValue departmentId startDate closingDate createdAt')
      .lean()

    // Fetch BiddersList applications
    const biddersLists = await BiddersList.find()
      .select('tenderId applications')
      .lean()

    // Fetch AppliedBidder
    const appliedBidders = await AppliedBidder.find()
      .select('tenderId appliedAt createdAt applicationTime paidAt')
      .lean()

    // Map tender ID to tender date
    const tenderDateMap = new Map()
    for (const t of tenders) {
      const d = t.startDate || t.createdAt || t.closingDate
      if (d) tenderDateMap.set(String(t._id), new Date(d))
    }

    // Accumulate tenders, value, publishing entities
    for (const t of tenders) {
      const d = t.startDate || t.createdAt || t.closingDate
      if (!d) continue
      const tenderDate = new Date(d)
      if (isNaN(tenderDate.getTime())) continue

      for (const m of months) {
        if (tenderDate >= m.start && tenderDate <= m.end) {
          m.tenders += 1
          const valCr = (t.estimatedValue || 0) / 10000000
          m.value += valCr
          if (t.departmentId) {
            m.entitiesSet.add(String(t.departmentId._id || t.departmentId))
          }
          break
        }
      }
    }

    // Accumulate bids from BiddersList
    for (const bl of biddersLists) {
      if (!bl.applications) continue
      for (const app of bl.applications) {
        const appDateRaw = app.applicationSubmissionDateTime || app.createdAt || app.paidAt || tenderDateMap.get(String(bl.tenderId))
        if (!appDateRaw) continue
        const appDate = new Date(appDateRaw)
        if (isNaN(appDate.getTime())) continue

        for (const m of months) {
          if (appDate >= m.start && appDate <= m.end) {
            m.bids += 1
            break
          }
        }
      }
    }

    // Accumulate bids from AppliedBidder
    for (const ab of appliedBidders) {
      const abDateRaw = ab.paidAt || ab.applicationTime || ab.appliedAt || ab.createdAt || tenderDateMap.get(String(ab.tenderId))
      if (!abDateRaw) continue
      const abDate = new Date(abDateRaw)
      if (isNaN(abDate.getTime())) continue

      for (const m of months) {
        if (abDate >= m.start && abDate <= m.end) {
          m.bids += 1
          break
        }
      }
    }

    const data = months.map((m) => ({
      label: m.label,
      year: m.year,
      monthIndex: m.monthIndex,
      tenders: m.tenders,
      value: Number(m.value.toFixed(2)),
      bids: m.bids,
      entities: m.entitiesSet.size,
    }))

    return res.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('Error in getLast12MonthsTrend:', error)
    return res.status(500).json({ success: false, message: 'Failed to fetch last 12 months trend' })
  }
}

// ── GET /api/dashboard/year-over-year ────────────────────────────────────────
exports.getYearOverYearAnalysis = async (req, res) => {
  try {
    const { fy, fyTo } = req.query
    const targetFy = fy || fyTo || `${getCurrentFyStartYear()}-${String((getCurrentFyStartYear() + 1) % 100).padStart(2, '0')}`
    const startYear = parseInt(targetFy.split('-')[0], 10)

    const FY_MONTH_ORDER = [
      { name: 'Apr', jsMonth: 3 }, { name: 'May', jsMonth: 4 }, { name: 'Jun', jsMonth: 5 },
      { name: 'Jul', jsMonth: 6 }, { name: 'Aug', jsMonth: 7 }, { name: 'Sep', jsMonth: 8 },
      { name: 'Oct', jsMonth: 9 }, { name: 'Nov', jsMonth: 10 }, { name: 'Dec', jsMonth: 11 },
      { name: 'Jan', jsMonth: 0 }, { name: 'Feb', jsMonth: 1 }, { name: 'Mar', jsMonth: 2 },
    ]

    const years = [startYear - 2, startYear - 1, startYear]

    // Map: fyStartYear -> array of 12 numbers (counts)
    const countsByYear = new Map()
    for (const y of years) {
      countsByYear.set(y, new Array(12).fill(0))
    }

    // Fetch active published tenders (excluding Rejected, Cancelled, Deleted)
    const tenders = await Tender.find(VALID_TENDER_MATCH)
      .select('startDate closingDate createdAt')
      .lean()

    for (const t of tenders) {
      const d = t.startDate || t.createdAt || t.closingDate
      if (!d) continue
      const dateObj = new Date(d)
      if (isNaN(dateObj.getTime())) continue

      const tCalYear = dateObj.getFullYear()
      const tJsMonth = dateObj.getMonth()

      // Financial year start year: Apr-Dec is current year, Jan-Mar is previous year
      const tFyStartYear = tJsMonth >= 3 ? tCalYear : tCalYear - 1

      if (countsByYear.has(tFyStartYear)) {
        // Month index in FY: Apr(3)->0, May(4)->1, ... Dec(11)->8, Jan(0)->9, Feb(1)->10, Mar(2)->11
        const fyMonthIdx = tJsMonth >= 3 ? tJsMonth - 3 : tJsMonth + 9
        const arr = countsByYear.get(tFyStartYear)
        arr[fyMonthIdx] += 1
      }
    }

    const currentFYLabel = `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`
    const prevStartYear = startYear - 1
    const previousFYLabel = `${prevStartYear}-${String((prevStartYear + 1) % 100).padStart(2, '0')}`

    const current = countsByYear.get(startYear) || new Array(12).fill(0)
    const previous = countsByYear.get(prevStartYear) || new Array(12).fill(0)

    const growth = current.map((c, i) => {
      const p = previous[i]
      if (!p && !c) return 0
      if (!p && c > 0) return 100
      return Number((((c - p) / p) * 100).toFixed(2))
    })

    const yoy = {
      labels: FY_MONTH_ORDER.map((m) => m.name),
      currentFYLabel,
      previousFYLabel,
      current,
      previous,
      growth,
    }

    const last3 = {
      labels: FY_MONTH_ORDER.map((m) => m.name),
      series: years.map((y) => ({
        label: `${y}-${String((y + 1) % 100).padStart(2, '0')}`,
        data: countsByYear.get(y) || new Array(12).fill(0),
      })),
    }

    return res.json({
      success: true,
      data: {
        yoy,
        last3,
      },
    })
  } catch (error) {
    console.error('Error in getYearOverYearAnalysis:', error)
    return res.status(500).json({ success: false, message: 'Failed to fetch year over year analysis' })
  }
}

// ── GET /api/dashboard/percentage-distribution ──────────────────────────────
exports.getPercentageDistribution = async (req, res) => {
  try {
    const { fy, fyTo, metric = 'tenders' } = req.query
    const targetFy = fy || fyTo || `${getCurrentFyStartYear()}-${String((getCurrentFyStartYear() + 1) % 100).padStart(2, '0')}`

    // Fetch all active departments
    const departments = await Department.find({ isActive: { $ne: false } })
      .select('_id name code')
      .lean()

    // Fetch valid published tenders
    const tenders = await Tender.find(VALID_TENDER_MATCH)
      .select('departmentId estimatedValue startDate closingDate createdAt')
      .lean()

    const deptStatsMap = new Map()
    for (const d of departments) {
      deptStatsMap.set(String(d._id), {
        id: String(d._id),
        name: d.name,
        code: d.code,
        tendersCount: 0,
        totalValue: 0,
      })
    }

    // Filter tenders for target financial year
    for (const t of tenders) {
      const d = t.startDate || t.createdAt || t.closingDate
      const tenderFy = getFinancialYear(d)
      if (tenderFy !== targetFy) continue

      const deptIdStr = t.departmentId ? String(t.departmentId._id || t.departmentId) : null
      if (deptIdStr && deptStatsMap.has(deptIdStr)) {
        const entry = deptStatsMap.get(deptIdStr)
        entry.tendersCount += 1
        entry.totalValue += (t.estimatedValue || 0)
      }
    }

    const allDepts = Array.from(deptStatsMap.values())
    const isValue = metric === 'value'
    const sortField = isValue ? 'totalValue' : 'tendersCount'
    allDepts.sort((a, b) => b[sortField] - a[sortField])

    // Compute total base across all departments
    const totalBase = allDepts.reduce((sum, d) => sum + d[sortField], 0)

    // Calculate percentage for each
    const rows = allDepts.map((d) => {
      const pct = totalBase > 0 ? (d[sortField] / totalBase) * 100 : 0
      return {
        name: d.name,
        code: d.code,
        percentage: Number(pct.toFixed(2)),
        amount: isValue
          ? Number(((d.totalValue || 0) / 100000).toFixed(2)) // Rs in Lakhs
          : d.tendersCount,
      }
    })

    const nonZeroRows = rows.filter((r) => r.percentage > 0)
    const finalRows = (nonZeroRows.length > 0 ? nonZeroRows : rows).slice(0, 20)

    const sumPct = finalRows.reduce((sum, r) => sum + r.percentage, 0)
    if (sumPct > 0 && Math.abs(sumPct - 100) > 0.05) {
      finalRows.forEach((r) => {
        r.percentage = Number(((r.percentage / sumPct) * 100).toFixed(2))
      })
    }

    return res.json({
      success: true,
      data: finalRows,
      total: finalRows.length,
    })
  } catch (error) {
    console.error('Error in getPercentageDistribution:', error)
    return res.status(500).json({ success: false, message: 'Failed to fetch percentage distribution' })
  }
}

// ── GET /api/dashboard/bidder-distribution ──────────────────────────────────
exports.getBidderDistribution = async (req, res) => {
  try {
    const ALL_TN_DISTRICTS = [
      'Ariyalur',
      'Chengalpattu',
      'Chennai',
      'Coimbatore',
      'Cuddalore',
      'Dharmapuri',
      'Dindigul',
      'Erode',
      'Kallakurichi',
      'Kanchipuram',
      'Kanniyakumari',
      'Karur',
      'Krishnagiri',
      'Madurai',
      'Mayiladuthurai',
      'Nagapattinam',
      'Namakkal',
      'Nilgiris',
      'Perambalur',
      'Pudukkottai',
      'Ramanathapuram',
      'Ranipet',
      'Salem',
      'Sivaganga',
      'Tenkasi',
      'Thanjavur',
      'Theni',
      'Thiruvallur',
      'Thiruvarur',
      'Thoothukudi',
      'Tiruchirappalli',
      'Tirunelveli',
      'Tirupattur',
      'Tiruppur',
      'Tiruvannamalai',
      'Vellore',
      'Viluppuram',
      'Virudhunagar',
    ]

    function normalizeTnDistrict(name) {
      if (!name) return null
      const cleaned = name.trim().toLowerCase().replace(/[^a-z]/g, '')
      for (const d of ALL_TN_DISTRICTS) {
        const dCleaned = d.toLowerCase().replace(/[^a-z]/g, '')
        if (cleaned === dCleaned) return d
      }
      const aliases = {
        kanyakumari: 'Kanniyakumari',
        tirupathur: 'Tirupattur',
        tiruvallur: 'Thiruvallur',
        tiruvarur: 'Thiruvarur',
        trichy: 'Tiruchirappalli',
        tuticorin: 'Thoothukudi',
        tiruvanamalai: 'Tiruvannamalai',
      }
      if (aliases[cleaned]) return aliases[cleaned]
      return null
    }

    // Initialize map for all 38 districts
    const districtCounts = new Map()
    for (const dName of ALL_TN_DISTRICTS) {
      districtCounts.set(dName, 0)
    }

    // Fetch DB districts to map ObjectId -> District Name
    const dbDistricts = await District.find().select('_id name').lean()
    const dbDistrictIdToNameMap = new Map()
    for (const d of dbDistricts) {
      const canonical = normalizeTnDistrict(d.name) || d.name
      dbDistrictIdToNameMap.set(String(d._id), canonical)
    }

    // Fetch registered bidders from User collection
    const bidderRoles = await Role.find({ name: { $in: ['tender_person', 'public'] } }).select('_id')
    const bidderRoleIds = bidderRoles.map((r) => r._id)

    const bidders = await User.find({
      isDeleted: { $ne: true },
      $or: [
        { roleId: { $in: bidderRoleIds } },
        { accountType: { $in: ['Individual', 'Organization'] }, departmentId: null },
      ],
    }).select('district').lean()

    let assignedCount = 0
    for (const b of bidders) {
      if (b.district) {
        const distName = dbDistrictIdToNameMap.get(String(b.district._id || b.district))
        const canonical = normalizeTnDistrict(distName)
        if (canonical && districtCounts.has(canonical)) {
          districtCounts.set(canonical, districtCounts.get(canonical) + 1)
          assignedCount += 1
        }
      }
    }

    // Map applications from BiddersList and AppliedBidder to tender districts
    const [biddersLists, appliedBidders, tenders] = await Promise.all([
      BiddersList.find().select('tenderId applications').lean(),
      AppliedBidder.find().select('tenderId').lean(),
      Tender.find(VALID_TENDER_MATCH).select('_id districtId').lean(),
    ])

    const tenderDistrictMap = new Map()
    for (const t of tenders) {
      if (t.districtId) {
        const rawDistName = dbDistrictIdToNameMap.get(String(t.districtId._id || t.districtId))
        const canonical = normalizeTnDistrict(rawDistName)
        if (canonical) {
          tenderDistrictMap.set(String(t._id), canonical)
        }
      }
    }

    for (const bl of biddersLists) {
      const distName = tenderDistrictMap.get(String(bl.tenderId))
      if (distName && districtCounts.has(distName)) {
        const appCount = bl.applications?.length || 0
        districtCounts.set(distName, districtCounts.get(distName) + appCount)
        assignedCount += appCount
      }
    }

    for (const ab of appliedBidders) {
      const distName = tenderDistrictMap.get(String(ab.tenderId))
      if (distName && districtCounts.has(distName)) {
        districtCounts.set(distName, districtCounts.get(distName) + 1)
        assignedCount += 1
      }
    }

    const totalBiddersCount = assignedCount > 0 ? assignedCount : bidders.length

    // Build full 38-district output
    const allRows = ALL_TN_DISTRICTS.map((name) => {
      const count = districtCounts.get(name) || 0
      const pct = totalBiddersCount > 0 ? (count / totalBiddersCount) * 100 : 0
      return {
        name,
        count,
        percentage: Number(pct.toFixed(2)),
      }
    })

    // Sort by count descending, then alphabetical
    allRows.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return a.name.localeCompare(b.name)
    })

    // Re-normalize non-zero percentages to sum cleanly to 100% if needed
    const sumPct = allRows.reduce((sum, r) => sum + r.percentage, 0)
    if (sumPct > 0 && Math.abs(sumPct - 100) > 0.05) {
      const nonZeroRows = allRows.filter((r) => r.percentage > 0)
      const nonZeroSum = nonZeroRows.reduce((sum, r) => sum + r.percentage, 0)
      if (nonZeroSum > 0) {
        nonZeroRows.forEach((r) => {
          r.percentage = Number(((r.percentage / nonZeroSum) * 100).toFixed(2))
        })
      }
    }

    return res.json({
      success: true,
      data: allRows,
      totalDistricts: allRows.length,
      totalBidders: totalBiddersCount,
    })
  } catch (error) {
    console.error('Error in getBidderDistribution:', error)
    return res.status(500).json({ success: false, message: 'Failed to fetch bidder distribution' })
  }
}

// ── GET /api/dashboard/kpi-analysis ──────────────────────────────────────────
exports.getKpiAnalysis = async (req, res) => {
  try {
    const { section = 'tenderPublished', subTab = 'docDownload', fyFrom = '2021-22', fyTo = '2026-27' } = req.query
    const fyRange = buildFyRangeList(fyFrom, fyTo)

    // Fetch active published tenders (excluding Rejected, Cancelled, Deleted)
    const tenders = await Tender.find(VALID_TENDER_MATCH)
      .select('tenderCode tenderType startDate closingDate applicationStartDate applicationEndDate applicationDeadline isDocumentApproved isFinalizedBidders financialField createdAt')
      .lean()

    const createTenders = await CreateTender.find({ isDeleted: { $ne: true } })
      .select('tenderId tenderType')
      .lean()
    const ctMap = new Map()
    for (const ct of createTenders) {
      if (ct.tenderId) ctMap.set(ct.tenderId, ct)
    }

    const finalBidders = await FinalBidders.find().select('tenderId applications updatedAt createdAt').lean()
    const finalBiddersMap = new Map()
    for (const fb of finalBidders) {
      if (fb.tenderId) finalBiddersMap.set(String(fb.tenderId), fb)
    }

    function resolveTenderType(t) {
      const ct = ctMap.get(t.tenderCode)
      const raw = (t.tenderType || ct?.tenderType || 'Open').toLowerCase()
      if (raw.includes('limited')) return 'Limited'
      if (raw.includes('open')) return 'Open'
      return 'Others'
    }

    const statsMap = new Map()
    for (const fy of fyRange) {
      statsMap.set(fy, {
        Open: { sum: 0, count: 0 },
        Limited: { sum: 0, count: 0 },
        Others: { sum: 0, count: 0 },
      })
    }

    for (const t of tenders) {
      const tenderDate = t.startDate || t.createdAt || t.closingDate
      const fy = getFinancialYear(tenderDate)
      if (!fy || !statsMap.has(fy)) continue

      const typeKey = resolveTenderType(t)
      const bucket = statsMap.get(fy)[typeKey]

      const startMs = new Date(t.startDate || t.createdAt).getTime()
      const closeMs = t.closingDate ? new Date(t.closingDate).getTime() : startMs + 30 * 86400000
      const appStartMs = t.applicationStartDate ? new Date(t.applicationStartDate).getTime() : startMs + 3 * 86400000
      const appEndMs = t.applicationEndDate ? new Date(t.applicationEndDate).getTime() : startMs + 15 * 86400000
      const appDeadlineMs = t.applicationDeadline ? new Date(t.applicationDeadline).getTime() : closeMs

      const fb = finalBiddersMap.get(String(t._id))
      const awardMs = fb ? new Date(fb.updatedAt || fb.createdAt).getTime() : closeMs + 20 * 86400000

      let val = 0

      if (section === 'tenderPublished') {
        if (subTab === 'docDownload') {
          val = Math.max(1, Math.round((appStartMs - startMs) / 86400000))
        } else if (subTab === 'techOpening') {
          val = Math.max(2, Math.round((appEndMs - startMs) / 86400000))
        } else if (subTab === 'techEvaluation') {
          val = Math.max(5, Math.round((appEndMs + 7 * 86400000 - startMs) / 86400000))
        } else if (subTab === 'finOpening') {
          val = Math.max(10, Math.round((appDeadlineMs - startMs) / 86400000))
        } else {
          val = Math.max(15, Math.round((closeMs - startMs) / 86400000))
        }
        bucket.sum += val
        bucket.count += 1
      } else if (section === 'bidsSubmission') {
        val = Math.max(1, Math.round((closeMs - startMs) / 86400000))
        bucket.sum += val
        bucket.count += 1
      } else if (section === 'techAndFin') {
        if (subTab === 'techOpenEval') {
          val = Math.max(2, Math.round(7))
        } else if (subTab === 'techEvalFinOpen') {
          val = Math.max(3, Math.round(Math.abs(appDeadlineMs - (appEndMs + 7 * 86400000)) / 86400000))
        } else if (subTab === 'finOpenFinEval') {
          val = Math.max(2, Math.round(Math.abs(closeMs - appDeadlineMs) / 86400000))
        } else {
          val = Math.max(5, Math.round(Math.abs(appDeadlineMs - appEndMs) / 86400000))
        }
        bucket.sum += val
        bucket.count += 1
      } else if (section === 'bidsAwarded') {
        if (subTab === 'publishToAwarded') {
          val = Math.max(5, Math.round(Math.abs(awardMs - startMs) / 86400000))
        } else if (subTab === 'finOpenToAwarded') {
          val = Math.max(2, Math.round(Math.abs(awardMs - appDeadlineMs) / 86400000))
        } else {
          val = Math.max(3, Math.round(Math.abs(awardMs - appEndMs) / 86400000))
        }
        bucket.sum += val
        bucket.count += 1
      } else if (section === 'bidsValidityPeriod') {
        const daysToAward = Math.round((awardMs - closeMs) / 86400000)
        const isWithin = daysToAward <= 90
        val = subTab === 'withinValidity' ? (isWithin ? 1 : 0) : (isWithin ? 0 : 1)
        bucket.sum += val
        bucket.count += 1
      }
    }

    const rows = fyRange.map((fy) => {
      const entry = statsMap.get(fy)
      if (section === 'bidsValidityPeriod') {
        const openPct = entry.Open.count > 0 ? Math.round((entry.Open.sum / entry.Open.count) * 100) : 0
        const limPct = entry.Limited.count > 0 ? Math.round((entry.Limited.sum / entry.Limited.count) * 100) : 0
        const othPct = entry.Others.count > 0 ? Math.round((entry.Others.sum / entry.Others.count) * 100) : 0
        return {
          fy,
          Open: openPct,
          Limited: limPct,
          Others: othPct,
        }
      }

      const openAvg = entry.Open.count > 0 ? Math.round(entry.Open.sum / entry.Open.count) : 0
      const limAvg = entry.Limited.count > 0 ? Math.round(entry.Limited.sum / entry.Limited.count) : 0
      const othAvg = entry.Others.count > 0 ? Math.round(entry.Others.sum / entry.Others.count) : 0

      return {
        fy,
        Open: openAvg,
        Limited: limAvg,
        Others: othAvg,
      }
    })

    return res.json({
      success: true,
      data: rows,
    })
  } catch (error) {
    console.error('Error in getKpiAnalysis:', error)
    return res.status(500).json({ success: false, message: 'Failed to fetch KPI analysis' })
  }
}

// ── GET /api/dashboard/msr-report ───────────────────────────────────────────
exports.getMsrReport = async (req, res) => {
  try {
    const { year = '2024-25', month = 'May' } = req.query

    const ALL_TN_DISTRICTS = [
      'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri', 'Dindigul',
      'Erode', 'Kallakurichi', 'Kanchipuram', 'Kanniyakumari', 'Karur', 'Krishnagiri', 'Madurai',
      'Mayiladuthurai', 'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai',
      'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi', 'Thanjavur', 'Theni',
      'Thiruvallur', 'Thiruvarur', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli', 'Tirupattur',
      'Tiruppur', 'Tiruvannamalai', 'Vellore', 'Viluppuram', 'Virudhunagar',
    ]

    function normalizeTnDistrict(name) {
      if (!name) return null
      const cleaned = name.trim().toLowerCase().replace(/[^a-z]/g, '')
      for (const d of ALL_TN_DISTRICTS) {
        const dCleaned = d.toLowerCase().replace(/[^a-z]/g, '')
        if (cleaned === dCleaned) return d
      }
      const aliases = {
        kanyakumari: 'Kanniyakumari',
        tirupathur: 'Tirupattur',
        tiruvallur: 'Thiruvallur',
        tiruvarur: 'Thiruvarur',
        trichy: 'Tiruchirappalli',
        tuticorin: 'Thoothukudi',
        tiruvanamalai: 'Tiruvannamalai',
      }
      if (aliases[cleaned]) return aliases[cleaned]
      return null
    }

    const MONTH_MAP = {
      jan: 0, january: 0,
      feb: 1, february: 1,
      mar: 2, march: 2,
      apr: 3, april: 3,
      may: 4,
      jun: 5, june: 5,
      jul: 6, july: 6,
      aug: 7, august: 7,
      sep: 8, sept: 8, september: 8,
      oct: 9, october: 9,
      nov: 10, november: 10,
      dec: 11, december: 11,
    }

    const mKey = String(month).trim().toLowerCase()
    const targetCalMonth = MONTH_MAP[mKey] !== undefined ? MONTH_MAP[mKey] : 4 // default May (4)

    let fyStartYear = 2024
    if (typeof year === 'string' && year.includes('-')) {
      const parts = year.split('-')
      fyStartYear = parseInt(parts[0], 10) || 2024
    } else {
      fyStartYear = parseInt(year, 10) || 2024
    }

    const targetCalYear = targetCalMonth >= 3 ? fyStartYear : fyStartYear + 1
    const prevCalMonth = (targetCalMonth + 11) % 12
    const prevCalYear = targetCalMonth === 0 ? targetCalYear - 1 : targetCalYear

    // Selected month FY index: Apr (0) to Mar (11)
    const targetFyMonthIdx = (targetCalMonth + 9) % 12
    const targetFyLabel = `${fyStartYear}-${String((fyStartYear + 1) % 100).padStart(2, '0')}`

    const dbDistricts = await District.find().select('_id name').lean()
    const dbDistrictMap = new Map()
    for (const d of dbDistricts) {
      const canonical = normalizeTnDistrict(d.name) || d.name
      dbDistrictMap.set(String(d._id), canonical)
    }

    const finalBidders = await FinalBidders.find().select('tenderId').lean()
    const awardedTenderIds = new Set(finalBidders.map((fb) => String(fb.tenderId)))

    const tenders = await Tender.find(VALID_TENDER_MATCH)
      .select('districtId estimatedValue startDate closingDate createdAt isFinalizedBidders')
      .lean()

    const districtStats = new Map()
    for (const dName of ALL_TN_DISTRICTS) {
      districtStats.set(dName, {
        name: dName,
        monthTenders: 0,
        monthValue: 0,
        prevTenders: 0,
        prevValue: 0,
        cumFyTenders: 0,
        cumFyValue: 0,
        inceptionTenders: 0,
        inceptionValue: 0,
        awardedTenders: 0,
        awardedValue: 0,
      })
    }

    for (const t of tenders) {
      const rawDistName = t.districtId ? dbDistrictMap.get(String(t.districtId._id || t.districtId)) : null
      const distName = normalizeTnDistrict(rawDistName)
      if (!distName || !districtStats.has(distName)) continue

      const entry = districtStats.get(distName)
      const tenderDate = new Date(t.startDate || t.createdAt || t.closingDate)
      const tCalYear = tenderDate.getFullYear()
      const tCalMonth = tenderDate.getMonth()
      const valCr = toCrores(t.estimatedValue)
      const tFy = getFinancialYear(tenderDate)

      // Inception
      entry.inceptionTenders += 1
      entry.inceptionValue = Number((entry.inceptionValue + valCr).toFixed(4))

      // Selected Month
      if (tCalYear === targetCalYear && tCalMonth === targetCalMonth) {
        entry.monthTenders += 1
        entry.monthValue = Number((entry.monthValue + valCr).toFixed(4))
      }

      // Prev Month
      if (tCalYear === prevCalYear && tCalMonth === prevCalMonth) {
        entry.prevTenders += 1
        entry.prevValue = Number((entry.prevValue + valCr).toFixed(4))
      }

      // Cumulative FY up to selected month
      if (tFy === targetFyLabel) {
        const tFyMonthIdx = (tCalMonth + 9) % 12
        if (tFyMonthIdx <= targetFyMonthIdx) {
          entry.cumFyTenders += 1
          entry.cumFyValue = Number((entry.cumFyValue + valCr).toFixed(4))
        }

        // Awarded during FY
        const isAwarded = awardedTenderIds.has(String(t._id)) || t.isFinalizedBidders
        if (isAwarded) {
          entry.awardedTenders += 1
          entry.awardedValue = Number((entry.awardedValue + valCr).toFixed(4))
        }
      }
    }

    const rows = ALL_TN_DISTRICTS.map((name, index) => {
      const s = districtStats.get(name)
      return {
        sno: index + 1,
        name,
        monthTenders: s.monthTenders,
        monthValue: s.monthValue,
        prevTenders: s.prevTenders,
        prevValue: s.prevValue,
        cumFyTenders: s.cumFyTenders,
        cumFyValue: s.cumFyValue,
        inceptionTenders: s.inceptionTenders,
        inceptionValue: s.inceptionValue,
        awardedTenders: s.awardedTenders,
        awardedValue: s.awardedValue,
      }
    })

    return res.json({
      success: true,
      data: rows,
      total: rows.length,
    })
  } catch (error) {
    console.error('Error in getMsrReport:', error)
    return res.status(500).json({ success: false, message: 'Failed to fetch MSR report' })
  }
}







