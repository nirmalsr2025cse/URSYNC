// src/data/tenders.js
// This is MOCK data for frontend development.
// Replace with real API calls when backend is ready.

export const tenders = {
  ongoing: [
    {
      id: "TN/PWD/2024/001",
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop',
      title: "Construction of NH-44 Junction Road",
      department: "Public Works Department",
      departmentCode: "PWD",
      organization: "Tamil Nadu PWD",
      location: "Tiruchirappalli",
      value: "₹ 4.85 Crore",
      startDate: "2024-01-10",
      closingDate: "2024-07-15",
      status: "Ongoing",
      category: "Infrastructure",
      description: "Construction of 4-lane road connecting NH-44 to Ariyamangalam bypass.",
      documentUrl: '/sample-tender.pdf'
    },
    {
      id: "TN/TANGEDCO/2024/042",
      image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400&h=200&fit=crop',
      title: "33 KV Substation Equipment Supply",
      department: "Tamil Nadu Generation and Distribution Corporation",
      departmentCode: "TANGEDCO",
      organization: "TANGEDCO",
      location: "Srirangam, Tiruchirappalli",
      value: "₹ 12.30 Crore",
      startDate: "2024-02-01",
      closingDate: "2024-08-28",
      status: "Ongoing",
      category: "Energy",
      description: "Supply and installation of 33KV substation equipment.",
      documentUrl: '/sample-tender.pdf'
    },
    {
      id: "TN/TWAD/2024/018",
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=200&fit=crop', 
      title: "Underground Drinking Water Pipeline",
      department: "Tamil Nadu Water and Drainage Board",
      departmentCode: "TWAD",
      organization: "TWAD Board",
      location: "Thillai Nagar, Tiruchirappalli",
      value: "₹ 7.20 Crore",
      startDate: "2024-01-20",
      closingDate: "2024-09-10",
      status: "Ongoing",
      category: "Water & Sanitation",
      description: "Laying of underground drinking water pipeline network.",
      documentUrl: '/sample-tender.pdf'
    },
    {
      id: "TN/HEALTH/2024/009",
      image: 'https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?w=400&h=200&fit=crop',
      title: "Medical Equipment Supply — District Hospital",
      department: "Department of Health and Family Welfare",
      departmentCode: "HEALTH",
      organization: "Directorate of Medical Services",
      location: "Manapparai, Tiruchirappalli",
      value: "₹ 3.60 Crore",
      startDate: "2024-03-01",
      closingDate: "2024-09-05",
      status: "Ongoing",
      category: "Healthcare",
      description: "Procurement of advanced medical equipment for district hospital.",
      documentUrl: '/sample-tender.pdf'
    },
    {
      id: "TN/CORP/2024/007",
      image: 'https://images.unsplash.com/photo-1617369120004-4fc70312c5e6?w=400&h=200&fit=crop',
      title: "Woraiyur Parks and Playgrounds Development",
      department: "Tiruchirappalli City Municipal Corporation",
      departmentCode: "TCMC",
      organization: "TCMC",
      location: "Woraiyur, Tiruchirappalli",
      value: "₹ 1.95 Crore",
      startDate: "2024-02-15",
      closingDate: "2024-07-30",
      status: "Ongoing",
      category: "Urban Development",
      description: "Development of parks and playgrounds in Woraiyur zone.",
      documentUrl: '/sample-tender.pdf'
    },
    {
      id: "TN/EDU/2024/003",
      image: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400&h=200&fit=crop',
      title: "School Infrastructure Renovation — Zone 3",
      department: "School Education Department",
      departmentCode: "EDUCATION",
      organization: "School Education Department",
      location: "Chennai",
      value: "₹ 2.40 Crore",
      startDate: "2024-01-05",
      closingDate: "2024-08-20",
      status: "Ongoing",
      category: "Education",
      description: "Renovation of government school buildings in Zone 3.",
      documentUrl: '/sample-tender.pdf'
    },
  ],

  upcoming: [
    {
      id: "TN/PWD/2024/055",
      image: 'https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=400&h=200&fit=crop',
      title: "Bridge Rehabilitation — Cauvery River",
      department: "Public Works Department",
      departmentCode: "PWD",
      organization: "Tamil Nadu PWD",
      location: "Tiruchirappalli",
      value: "₹ 18.50 Crore",
      startDate: "2024-10-01",
      closingDate: "2025-04-30",
      status: "Upcoming",
      category: "Infrastructure",
      description: "Rehabilitation of aging bridge structure over Cauvery River.",
      documentUrl: '/sample-tender.pdf'
    },
    {
      id: "TN/TNHB/2024/031",
      image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=200&fit=crop',
      title: "500 EWS Housing Units Construction",
      department: "Tamil Nadu Housing Board",
      departmentCode: "TNHB",
      organization: "TNHB",
      location: "Tiruchirappalli District",
      value: "₹ 22.50 Crore",
      startDate: "2024-11-01",
      closingDate: "2025-06-30",
      status: "Upcoming",
      category: "Housing",
      description: "Construction of 500 economically weaker section housing units.",
      documentUrl: '/sample-tender.pdf'
    },
    {
      id: "TN/TANGEDCO/2024/088",
      image: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=400&h=200&fit=crop',
      title: "Solar Power Plant Installation — 10MW",
      department: "Tamil Nadu Generation and Distribution Corporation",
      departmentCode: "TANGEDCO",
      organization: "TANGEDCO",
      location: "Madurai",
      value: "₹ 45.00 Crore",
      startDate: "2024-10-15",
      closingDate: "2025-05-15",
      status: "Upcoming",
      category: "Energy",
      description: "Installation of 10MW solar power plant for government buildings.",
      documentUrl: '/sample-tender.pdf'
    },
    {
      id: "TN/HEALTH/2024/022",
      image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=200&fit=crop',
      title: "Primary Health Centre Construction — Rural",
      department: "Department of Health and Family Welfare",
      departmentCode: "HEALTH",
      organization: "Directorate of Medical Services",
      location: "Virudhunagar",
      value: "₹ 5.80 Crore",
      startDate: "2024-12-01",
      closingDate: "2025-07-01",
      status: "Upcoming",
      category: "Healthcare",
      description: "Construction of 8 primary health centres in rural areas.",
      documentUrl: '/sample-tender.pdf'
    },
  ],

  completed: [
    {
      id: "TN/PWD/2023/077",
      image: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=400&h=200&fit=crop',
      title: "East Coast Road Widening — Phase 1",
      department: "Public Works Department",
      departmentCode: "PWD",
      organization: "Tamil Nadu PWD",
      location: "Chennai to Mahabalipuram",
      value: "₹ 32.00 Crore",
      startDate: "2023-01-10",
      closingDate: "2023-12-31",
      status: "Completed",
      category: "Infrastructure",
      description: "Road widening of East Coast Road Phase 1 completed successfully.",
      documentUrl: '/sample-tender.pdf'
    },
    {
      id: "TN/TWAD/2023/011",
      image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=200&fit=crop',
      title: "Sewage Treatment Plant Upgrade",
      department: "Tamil Nadu Water and Drainage Board",
      departmentCode: "TWAD",
      organization: "TWAD Board",
      location: "Coimbatore",
      value: "₹ 9.75 Crore",
      startDate: "2023-02-01",
      closingDate: "2023-11-30",
      status: "Completed",
      category: "Water & Sanitation",
      description: "Upgrade of sewage treatment plant capacity from 10 MLD to 25 MLD.",
      documentUrl: '/sample-tender.pdf'
    },
    {
      id: "TN/CORP/2023/015",
      image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&h=200&fit=crop',
      title: "LED Street Light Installation — City Wide",
      department: "Tiruchirappalli City Municipal Corporation",
      departmentCode: "TCMC",
      organization: "TCMC",
      location: "Tiruchirappalli",
      value: "₹ 6.20 Crore",
      startDate: "2023-03-15",
      closingDate: "2023-10-15",
      status: "Completed",
      category: "Urban Development",
      description: "City-wide replacement of conventional street lights with LED.",
      documentUrl: '/sample-tender.pdf'
    },
    {
      id: "TN/EDU/2023/008",
      image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=200&fit=crop',
      title: "Smart Classroom Setup — 200 Schools",
      department: "School Education Department",
      departmentCode: "EDUCATION",
      organization: "School Education Department",
      location: "Tamil Nadu",
      value: "₹ 14.00 Crore",
      startDate: "2023-04-01",
      closingDate: "2023-12-31",
      status: "Completed",
      category: "Education",
      description: "Installation of smart classroom equipment in 200 government schools.",
      documentUrl: '/sample-tender.pdf'
    },
    {
      id: "TN/HEALTH/2023/005",
      image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=200&fit=crop',
      title: "Ambulance Fleet Procurement",
      department: "Department of Health and Family Welfare",
      departmentCode: "HEALTH",
      organization: "Directorate of Medical Services",
      location: "Tamil Nadu",
      value: "₹ 8.40 Crore",
      startDate: "2023-01-20",
      closingDate: "2023-08-20",
      status: "Completed",
      category: "Healthcare",
      description: "Procurement of 50 advanced life support ambulances.",
      documentUrl: '/sample-tender.pdf'
    },
  ],
}

// Department codes mapped to role — used for frontend filtering
// When backend is ready, this filtering moves server-side
export const ROLE_DEPARTMENT_MAP = {
  department_employee: null,   // backend filters by logged-in user's department
  department_head:     null,   // backend filters by logged-in user's department
  administrator:       null,   // sees all — backend returns all
  financial:           null,   // backend filters financial-relevant tenders
  tender_authority:    null,   // backend filters assigned tenders
  public:              null,   // sees all public tenders
}

// Frontend-only demo filter — shows sample department filtering per role
// REMOVE THIS when backend is connected
export const DEMO_ROLE_DEPARTMENT = {
  department_employee: 'PWD',
  department_head:     'TANGEDCO',
  financial:           'TWAD',
  tender_authority:    'HEALTH',
  administrator:       null,   // sees all
  public:              null,   // sees all
}