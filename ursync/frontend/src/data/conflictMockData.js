// src/data/conflictMockData.js
// Sample conflict data — frontend demonstration only. No backend/API integration.
// A conflict is derived when two or more Upcoming tenders share a common
// geographical area (District / Taluk / Village) and their timelines
// overlap or begin within ~1 month of each other.

export const CONFLICT_LEVELS = ['High', 'Medium', 'Low']

export const CONFLICT_REASONS = [
  'Timeline Overlap',
  'Same Construction Area',
  'Resource Clash',
  'Budget Clash',
  'Utility Interference',
  'Road Closure Conflict',
]

export const IMPACT_TYPES = [
  'Traffic Delay',
  'Budget Delay',
  'Construction Delay',
  'Resource Allocation Issue',
  'Public Inconvenience',
]

export const CONFLICTS = [
  {
    id: 'CNF-1001',
    level: 'High',
    title: 'Overlapping Road Works in Coimbatore North',
    overview:
      'Two upcoming tenders target the same stretch of road within the same month, risking construction clashes and traffic disruption.',
    tender1: {
      name: 'Coimbatore North Road Widening Project',
      department: 'Highways Department',
      startDate: '2026-08-10',
    },
    tender2: {
      name: 'Underground Drainage Renewal — Ward 12',
      department: 'Municipal Works',
      startDate: '2026-08-28',
    },
    location: {
      district: 'Coimbatore',
      taluk: 'Coimbatore North',
      village: 'R.S. Puram',
    },
    timeDifferenceDays: 18,
    reason: 'Same Construction Area',
    priority: 'Critical',
    impact: ['Traffic Delay', 'Construction Delay'],
    lastUpdated: '2026-07-08',
    summary: {
      locationMatch: true,
      timelineMatch: true,
      resourceConflict: true,
      departmentConflict: true,
    },
  },
  {
    id: 'CNF-1002',
    level: 'Medium',
    title: 'Budget Overlap in Salem Irrigation Zone',
    overview:
      'Two irrigation-linked tenders draw from overlapping budget allocations for the same fiscal quarter in nearby villages.',
    tender1: {
      name: 'Salem Canal Modernization Phase II',
      department: 'Water Resources Department',
      startDate: '2026-09-02',
    },
    tender2: {
      name: 'Salem Rural Water Supply Upgrade',
      department: 'Rural Development',
      startDate: '2026-09-25',
    },
    location: {
      district: 'Salem',
      taluk: 'Attur',
      village: 'Vaiyampatti',
    },
    timeDifferenceDays: 23,
    reason: 'Budget Clash',
    priority: 'High',
    impact: ['Budget Delay', 'Resource Allocation Issue'],
    lastUpdated: '2026-07-06',
    summary: {
      locationMatch: true,
      timelineMatch: true,
      resourceConflict: true,
      departmentConflict: true,
    },
  },
  {
    id: 'CNF-1003',
    level: 'Medium',
    title: 'Utility Line Interference near Madurai Bypass',
    overview:
      'Electrical line relocation and road bypass tenders are scheduled close together in the same taluk, risking utility interference.',
    tender1: {
      name: 'Madurai Bypass Extension — Package 4',
      department: 'Highways Department',
      startDate: '2026-08-15',
    },
    tender2: {
      name: 'TANGEDCO Feeder Line Relocation',
      department: 'TANGEDCO',
      startDate: '2026-09-10',
    },
    location: {
      district: 'Madurai',
      taluk: 'Melur',
      village: 'Alanganallur',
    },
    timeDifferenceDays: 26,
    reason: 'Utility Interference',
    priority: 'Medium',
    impact: ['Construction Delay', 'Public Inconvenience'],
    lastUpdated: '2026-07-05',
    summary: {
      locationMatch: true,
      timelineMatch: true,
      resourceConflict: false,
      departmentConflict: true,
    },
  },
  {
    id: 'CNF-1004',
    level: 'High',
    title: 'Simultaneous Road Closure Requests in Trichy',
    overview:
      'Both tenders require full road closure on overlapping dates within the same village, causing severe public inconvenience.',
    tender1: {
      name: 'Trichy Fort Area Heritage Road Repair',
      department: 'Municipal Works',
      startDate: '2026-08-05',
    },
    tender2: {
      name: 'Stormwater Drain Cross-Connection Works',
      department: 'Public Works Department',
      startDate: '2026-08-20',
    },
    location: {
      district: 'Tiruchirappalli',
      taluk: 'Srirangam',
      village: 'Fort Area',
    },
    timeDifferenceDays: 15,
    reason: 'Road Closure Conflict',
    priority: 'Critical',
    impact: ['Traffic Delay', 'Public Inconvenience'],
    lastUpdated: '2026-07-09',
    summary: {
      locationMatch: true,
      timelineMatch: true,
      resourceConflict: true,
      departmentConflict: true,
    },
  },
  {
    id: 'CNF-1005',
    level: 'Low',
    title: 'Resource Allocation Clash in Erode',
    overview:
      'Both projects require the same heavy machinery vendor pool during a similar window, though locations are only partially overlapping.',
    tender1: {
      name: 'Erode Bridge Strengthening Works',
      department: 'Highways Department',
      startDate: '2026-09-12',
    },
    tender2: {
      name: 'Erode Market Complex Renovation',
      department: 'Highways Department',
      startDate: '2026-10-05',
    },
    location: {
      district: 'Erode',
      taluk: 'Erode',
      village: 'Perundurai Road',
    },
    timeDifferenceDays: 23,
    reason: 'Resource Clash',
    priority: 'Low',
    impact: ['Resource Allocation Issue'],
    lastUpdated: '2026-07-03',
    summary: {
      locationMatch: true,
      timelineMatch: true,
      resourceConflict: true,
      departmentConflict: false,
    },
  },
  {
    id: 'CNF-1006',
    level: 'Medium',
    title: 'Timeline Overlap in Tirunelveli Village Roads',
    overview:
      'Two village-level road tenders begin within the same month in adjoining panchayats, raising coordination concerns.',
    tender1: {
      name: 'Tirunelveli Village Road Concretization',
      department: 'Rural Development',
      startDate: '2026-08-22',
    },
    tender2: {
      name: 'Panchayat Link Road Improvement',
      department: 'Highways Department',
      startDate: '2026-09-15',
    },
    location: {
      district: 'Tirunelveli',
      taluk: 'Ambasamudram',
      village: 'Kallidaikurichi',
    },
    timeDifferenceDays: 24,
    reason: 'Timeline Overlap',
    priority: 'Medium',
    impact: ['Construction Delay'],
    lastUpdated: '2026-07-04',
    summary: {
      locationMatch: true,
      timelineMatch: true,
      resourceConflict: false,
      departmentConflict: true,
    },
  },
  {
    id: 'CNF-1007',
    level: 'High',
    title: 'Construction Area Overlap in Vellore',
    overview:
      'Both tenders mark the same construction zone in their site plans, with start dates only 10 days apart.',
    tender1: {
      name: 'Vellore Fort Road Beautification',
      department: 'Municipal Works',
      startDate: '2026-08-01',
    },
    tender2: {
      name: 'Underground Cabling — Vellore Central',
      department: 'TANTRANSCO',
      startDate: '2026-08-11',
    },
    location: {
      district: 'Vellore',
      taluk: 'Vellore',
      village: 'Fort Locality',
    },
    timeDifferenceDays: 10,
    reason: 'Same Construction Area',
    priority: 'Critical',
    impact: ['Construction Delay', 'Traffic Delay'],
    lastUpdated: '2026-07-09',
    summary: {
      locationMatch: true,
      timelineMatch: true,
      resourceConflict: true,
      departmentConflict: true,
    },
  },
]