// src/data/finalBidderMockData.js

// ── Mock data for bidders whose selection has been finalized (moved to Edit → Final Bidder flow) ──
const INITIAL_FINAL_BIDDERS = [
  {
    applicationId: 'APP-2024-101',
    applicantName: 'Rajesh Kumar',
    companyName: 'Kumar Constructions Pvt Ltd',
    mobile: '+91 98765 43210',
    email: 'rajesh@kumarconstructions.com',
    district: 'Coimbatore',
    experience: '12 years',
    bidAmount: '₹ 45,00,000',
    submittedDate: '2026-05-12',
    documents: [
      { name: 'Company Registration.pdf', url: '#' },
      { name: 'Experience Certificate.pdf', url: '#' },
      { name: 'Financial Statement.pdf', url: '#' },
    ],
    tenderId: 'TND-2024-045',
    tenderTitle: 'Construction of Rural Road - Phase 2',
    department: 'Public Works Department',
    tenderValue: '₹ 50,00,000',
    approvalStatus: 'Finalized',
  },
  {
    applicationId: 'APP-2024-108',
    applicantName: 'Priya Selvam',
    companyName: 'Selvam Infra Solutions',
    mobile: '+91 90000 12345',
    email: 'priya@selvaminfra.com',
    district: 'Madurai',
    experience: '8 years',
    bidAmount: '₹ 32,50,000',
    submittedDate: '2026-05-18',
    documents: [
      { name: 'Company Registration.pdf', url: '#' },
      { name: 'Tax Compliance.pdf', url: '#' },
    ],
    tenderId: 'TND-2024-051',
    tenderTitle: 'Municipal Water Pipeline Upgrade',
    department: 'Water Resources Department',
    tenderValue: '₹ 38,00,000',
    approvalStatus: 'Finalized',
  },
  {
    applicationId: 'APP-2024-113',
    applicantName: 'Arun Prakash',
    companyName: 'Prakash Builders & Co.',
    mobile: '+91 98111 22334',
    email: 'arun@prakashbuilders.com',
    district: 'Trichy',
    experience: '15 years',
    bidAmount: '₹ 61,20,000',
    submittedDate: '2026-05-20',
    documents: [
      { name: 'Company Registration.pdf', url: '#' },
      { name: 'Experience Certificate.pdf', url: '#' },
      { name: 'Bank Guarantee.pdf', url: '#' },
      { name: 'Safety Compliance.pdf', url: '#' },
    ],
    tenderId: 'TND-2024-059',
    tenderTitle: 'School Building Renovation',
    department: 'Education Department',
    tenderValue: '₹ 65,00,000',
    approvalStatus: 'Finalized',
  },
]

// Module-level store so state persists across navigation (List <-> Details)
let finalBiddersStore = [...INITIAL_FINAL_BIDDERS]

export function getFinalBidders() {
  return finalBiddersStore
}

export function getFinalBidderById(applicationId) {
  return finalBiddersStore.find((b) => b.applicationId === applicationId)
}

export function removeFinalBidder(applicationId) {
  finalBiddersStore = finalBiddersStore.filter((b) => b.applicationId !== applicationId)
}