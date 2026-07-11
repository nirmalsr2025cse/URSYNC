// src/data/conflictMessagesMockData.js
// Sample message thread data — frontend demonstration only. No backend/API
// integration. Keyed by Conflict ID so each conflict has its own thread.
// When connecting the backend, replace with a real messages API keyed by
// conflict/tender ID, and swap the hardcoded `sender`/`self` flags for the
// authenticated user's identity.

export const CONFLICT_MESSAGES = {
  'CNF-1001': [
    {
      id: 'MSG-1',
      sender: 'System',
      self: false,
      text: 'Conflict CNF-1001 was detected automatically between two upcoming tenders in Coimbatore North.',
      time: '2026-07-05T09:15:00',
    },
    {
      id: 'MSG-2',
      sender: 'Department Head',
      self: false,
      text: 'Please review the timeline overlap and confirm if Project 2 can be rescheduled.',
      time: '2026-07-06T10:30:00',
    },
    {
      id: 'MSG-3',
      sender: 'You',
      self: true,
      text: 'Checked with the site engineer — a 20 day delay on Project 2 should resolve the overlap.',
      time: '2026-07-07T14:05:00',
    },
    {
      id: 'MSG-4',
      sender: 'Department Head',
      self: false,
      text: 'Sounds good. Please go ahead and update the schedule.',
      time: '2026-07-08T09:45:00',
    },
  ],
  'CNF-1002': [
    {
      id: 'MSG-1',
      sender: 'System',
      self: false,
      text: 'Conflict CNF-1002 was detected automatically — overlapping budget allocations in Salem.',
      time: '2026-07-04T11:00:00',
    },
    {
      id: 'MSG-2',
      sender: 'Water Resources Department',
      self: false,
      text: 'We can shift our canal works by two weeks if needed.',
      time: '2026-07-05T16:20:00',
    },
  ],
}

// Fallback thread used for any conflict ID without a dedicated mock thread.
export const DEFAULT_CONFLICT_MESSAGES = [
  {
    id: 'MSG-1',
    sender: 'System',
    self: false,
    text: 'This conflict was detected automatically. Start a conversation below to coordinate a resolution.',
    time: '2026-07-05T09:00:00',
  },
]