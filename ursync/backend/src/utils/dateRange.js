// src/utils/dateRange.js
// Builds a Mongo match object for a date field given optional from/to strings.
// - only `from`  -> field >= from (from that day up to now/forever)
// - only `to`    -> field <= end-of-that-day (everything up to and including that date)
// - both         -> field between from and end-of-to (inclusive)
// - neither      -> no constraint (returns null so caller can skip the stage)
function buildDateRangeMatch(field, from, to) {
  if (!from && !to) return null

  const range = {}
  if (from) {
    const fromDate = new Date(from)
    fromDate.setHours(0, 0, 0, 0)
    range.$gte = fromDate
  }
  if (to) {
    const toDate = new Date(to)
    toDate.setHours(23, 59, 59, 999) // inclusive of the whole "to" day
    range.$lte = toDate
  }

  return { [field]: range }
}

module.exports = { buildDateRangeMatch }