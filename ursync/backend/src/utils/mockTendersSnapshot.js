// src/utils/mockTendersSnapshot.js
// Direct copy of the ongoing/upcoming/completed arrays from the old
// src/data/tenders.js, used only by seedTenders.js. Delete this file once
// real tenders are being created through the app instead of seeded.
module.exports = {
  ongoing: [
    {
      id: 'TN/PWD/2024/001',
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop',
      title: 'Construction of NH-44 Junction Road',
      department: 'Public Works Department',
      departmentCode: 'PWD',
      organization: 'Tamil Nadu PWD',
      location: 'Tiruchirappalli',
      value: '₹ 4.85 Crore',
      startDate: '2024-01-10',
      closingDate: '2024-07-15',
      category: 'Infrastructure',
      description: 'Construction of 4-lane road connecting NH-44 to Ariyamangalam bypass.',
      documentUrl: '/sample-tender.pdf',
    },
    {
      id: 'TN/TANGEDCO/2024/042',
      image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400&h=200&fit=crop',
      title: '33 KV Substation Equipment Supply',
      department: 'Tamil Nadu Generation and Distribution Corporation',
      departmentCode: 'TANGEDCO',
      organization: 'TANGEDCO',
      location: 'Srirangam, Tiruchirappalli',
      value: '₹ 12.30 Crore',
      startDate: '2024-02-01',
      closingDate: '2024-08-28',
      category: 'Energy',
      description: 'Supply and installation of 33KV substation equipment.',
      documentUrl: '/sample-tender.pdf',
    },
  ],
  upcoming: [
    {
      id: 'TN/PWD/2024/055',
      image: 'https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=400&h=200&fit=crop',
      title: 'Bridge Rehabilitation — Cauvery River',
      department: 'Public Works Department',
      departmentCode: 'PWD',
      organization: 'Tamil Nadu PWD',
      location: 'Tiruchirappalli',
      value: '₹ 18.50 Crore',
      startDate: '2024-10-01',
      closingDate: '2025-04-30',
      category: 'Infrastructure',
      description: 'Rehabilitation of aging bridge structure over Cauvery River.',
      documentUrl: '/sample-tender.pdf',
    },
  ],
  completed: [
    {
      id: 'TN/PWD/2023/077',
      image: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=400&h=200&fit=crop',
      title: 'East Coast Road Widening — Phase 1',
      department: 'Public Works Department',
      departmentCode: 'PWD',
      organization: 'Tamil Nadu PWD',
      location: 'Chennai to Mahabalipuram',
      value: '₹ 32.00 Crore',
      startDate: '2023-01-10',
      closingDate: '2023-12-31',
      category: 'Infrastructure',
      description: 'Road widening of East Coast Road Phase 1 completed successfully.',
      documentUrl: '/sample-tender.pdf',
    },
  ],
}

// NOTE: this is a trimmed sample. Copy the FULL arrays from your existing
// src/data/tenders.js into this file before running the seed script, so
// every tender you already have gets migrated (not just these examples).
