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

