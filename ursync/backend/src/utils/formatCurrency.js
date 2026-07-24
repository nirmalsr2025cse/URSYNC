// src/utils/formatCurrency.js
// Converts a raw INR number (e.g. 48500000) into the display string the
// frontend previously got for free from mock data (e.g. "₹ 4.85 Crore").
function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '—'
  if (amount >= 1e7) return `₹ ${(amount / 1e7).toFixed(2)} Crore`
  if (amount >= 1e5) return `₹ ${(amount / 1e5).toFixed(2)} Lakh`
  return `₹ ${amount.toLocaleString('en-IN')}`
}

module.exports = formatCurrency
