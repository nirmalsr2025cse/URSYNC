// src/utils/departmentCategoryConfig.js

const PRIMARY_CATEGORIES = [
  'ROAD',
  'BUILD',
  'WATER',
  'POWER',
  'IT',
  'AGRI',
  'SERVICES',
]

// Map department to its unique static Category (ROAD, BUILD, WATER, POWER, IT, AGRI, SERVICES)
const DEPARTMENT_TO_CATEGORY = {
  'Highways Department': 'ROAD',
  'Rural Development and Panchayat Raj Department': 'ROAD',
  'Highways & Minor Ports': 'ROAD',
  'Rural Development': 'ROAD',

  'Tamil Nadu Water Supply and Drainage Board': 'WATER',
  'Municipal Administration and Water Supply Department': 'WATER',
  'Water Resources Department': 'WATER',
  'Municipal Administration': 'WATER',

  'Public Works Department': 'BUILD',
  'Housing and Urban Development Department': 'BUILD',
  'School Education Department': 'BUILD',
  'Health and Family Welfare Department': 'BUILD',
  'School Education': 'BUILD',
  'Health & Family Welfare': 'BUILD',

  'Tamil Nadu Generation and Distribution Corporation': 'POWER',

  'Information Technology Department': 'IT',
  'Higher Education Department': 'IT',
  'Information Technology': 'IT',

  'Agriculture Department': 'AGRI',
  'Agriculture Engineering': 'AGRI',

  'Social Welfare Department': 'SERVICES',
  'Tourism Department': 'SERVICES',
  'Industries Department': 'SERVICES',
  'Micro Small and Medium Enterprises Department': 'SERVICES',
  'Forest Department': 'SERVICES',
  'Fisheries Department': 'SERVICES',
  'Transport Department': 'SERVICES',
}

// Map department names to their standard short code for tenderId generation (e.g. TN/PWD/2026/1)
const DEPARTMENT_CODES = {
  'Highways Department': 'HIGHWAYS',
  'Public Works Department': 'PWD',
  'Rural Development and Panchayat Raj Department': 'RDPR',
  'Tamil Nadu Water Supply and Drainage Board': 'TWAD',
  'Municipal Administration and Water Supply Department': 'MAWS',
  'Water Resources Department': 'WRD',
  'Housing and Urban Development Department': 'HUD',
  'School Education Department': 'SED',
  'Health and Family Welfare Department': 'HFW',
  'Tamil Nadu Generation and Distribution Corporation': 'TANGEDCO',
  'Information Technology Department': 'ITD',
  'Higher Education Department': 'HED',
  'Agriculture Department': 'AGRI',
  'Social Welfare Department': 'SWD',
  'Tourism Department': 'TOURISM',
  'Industries Department': 'IND',
  'Micro Small and Medium Enterprises Department': 'MSME',
  'Forest Department': 'FOREST',
  'Fisheries Department': 'FISH',
  'Transport Department': 'TRANS',
  // Short/generic variations
  'Highways & Minor Ports': 'HIGHWAYS',
  'School Education': 'SED',
  'Rural Development': 'RDPR',
  'Information Technology': 'ITD',
  'Health & Family Welfare': 'HFW',
  'Municipal Administration': 'MAWS',
  'Agriculture Engineering': 'AGRI',
}

function getCategoryForDepartment(deptName) {
  if (!deptName) return 'BUILD'
  const trimmed = deptName.trim()
  if (DEPARTMENT_TO_CATEGORY[trimmed]) {
    return DEPARTMENT_TO_CATEGORY[trimmed]
  }
  for (const [key, cat] of Object.entries(DEPARTMENT_TO_CATEGORY)) {
    if (key.toLowerCase() === trimmed.toLowerCase()) return cat
    if (trimmed.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(trimmed.toLowerCase())) {
      return cat
    }
  }
  return 'BUILD'
}

function getDepartmentCode(deptName, existingCode) {
  if (existingCode && existingCode.trim()) {
    return existingCode.trim().toUpperCase()
  }
  if (!deptName) return 'GEN'
  const trimmed = deptName.trim()
  if (DEPARTMENT_CODES[trimmed]) {
    return DEPARTMENT_CODES[trimmed]
  }
  // Try case-insensitive / partial match
  for (const [key, code] of Object.entries(DEPARTMENT_CODES)) {
    if (key.toLowerCase() === trimmed.toLowerCase()) return code
    if (trimmed.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(trimmed.toLowerCase())) {
      return code
    }
  }
  // Fallback: extract initials or clean slug
  const words = trimmed.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return words.map(w => w[0]).join('').toUpperCase()
  }
  return trimmed.slice(0, 4).toUpperCase() || 'GEN'
}

module.exports = {
  PRIMARY_CATEGORIES,
  DEPARTMENT_TO_CATEGORY,
  DEPARTMENT_CODES,
  getCategoryForDepartment,
  getDepartmentCode,
}
