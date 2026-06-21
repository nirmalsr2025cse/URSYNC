import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

/**
 * Fetch tenders for a given location.
 * GET /api/tenders/by-location?location=<value>
 */
export async function getTendersByLocation(location) {
  try {
    const { data } = await api.get('/tenders/by-location', {
      params: { location },
    })
    return { data, error: null }
  } catch (err) {
    const message =
      err.response?.data?.message ||
      err.message ||
      'Failed to fetch tenders. Please try again.'
    return { data: null, error: message }
  }
}

// ── Mock data ────────────────────────────────────────────────────────────────
const STATUS = { OPEN: 'Open', CLOSING: 'Closing Soon', CLOSED: 'Closed' }

export async function getMockTendersByLocation(location) {
  await new Promise((r) => setTimeout(r, 800))

  const tenders = [
    {
      id: 'TN/PWD/2024/001',
      title: 'Construction of Road from NH-44 to Ariyamangalam',
      department: 'Public Works Department',
      organization: 'Tamil Nadu PWD',
      location: 'Ariyamangalam, Tiruchirappalli',
      closingDate: '2024-03-15',
      status: STATUS.OPEN,
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop',
      value: '₹ 4.85 Crore',
    },
    {
      id: 'TN/TANGEDCO/2024/042',
      title: 'Supply and Installation of 33 KV Substation Equipment',
      department: 'Tamil Nadu Generation and Distribution Corporation',
      organization: 'TANGEDCO',
      location: 'Srirangam, Tiruchirappalli',
      closingDate: '2024-02-28',
      status: STATUS.CLOSING,
      image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400&h=200&fit=crop',
      value: '₹ 12.30 Crore',
    },
    {
      id: 'TN/TWAD/2024/018',
      title: 'Laying of Underground Drinking Water Pipeline',
      department: 'Tamil Nadu Water and Drainage Board',
      organization: 'TWAD Board',
      location: 'Thillai Nagar, Tiruchirappalli',
      closingDate: '2024-04-10',
      status: STATUS.OPEN,
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=200&fit=crop',
      value: '₹ 7.20 Crore',
    },
    {
      id: 'TN/CORP/2024/007',
      title: 'Development of Woraiyur Parks and Playgrounds',
      department: 'Tiruchirappalli City Municipal Corporation',
      organization: 'TCMC',
      location: 'Woraiyur, Tiruchirappalli',
      closingDate: '2024-03-30',
      status: STATUS.OPEN,
      image: 'https://images.unsplash.com/photo-1617369120004-4fc70312c5e6?w=400&h=200&fit=crop',
      value: '₹ 1.95 Crore',
    },
    {
      id: 'TN/TNHB/2024/031',
      title: 'Construction of 500 EWS Housing Units',
      department: 'Tamil Nadu Housing Board',
      organization: 'TNHB',
      location: 'Tiruchirappalli District',
      closingDate: '2024-02-20',
      status: STATUS.CLOSED,
      image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=200&fit=crop',
      value: '₹ 22.50 Crore',
    },
    {
      id: 'TN/HEALTH/2024/009',
      title: 'Medical Equipment Supply for District Hospital',
      department: 'Department of Health and Family Welfare',
      organization: 'Directorate of Medical Services',
      location: 'Manapparai, Tiruchirappalli',
      closingDate: '2024-04-05',
      status: STATUS.OPEN,
      image: 'https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?w=400&h=200&fit=crop',
      value: '₹ 3.60 Crore',
    },
  ]

  return { data: tenders, error: null }
}