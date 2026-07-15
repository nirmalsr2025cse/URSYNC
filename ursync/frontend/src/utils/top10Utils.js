// src/utils/top10Utils.js
// Shared ranking helper for the Top 10 Analysis pages. Both
// NumberWiseTop10Analysis and ValueWiseTop10Analysis call this — same
// scaling/sorting logic, different sortKey.
import { TOP10_PUBLISHING_ENTITIES, CATEGORY_SPLIT } from '../data/dashboardMockData'

const CATEGORY_RATIO = {
  goods: CATEGORY_SPLIT.Goods,
  services: CATEGORY_SPLIT.Services,
  works: CATEGORY_SPLIT.Works,
}

/**
 * sortKey: 'tenders' | 'value'
 * categoryKey: undefined (all categories) | 'goods' | 'services' | 'works'
 * Returns { top10, all, total } — `all` and `total` back the table view
 * (Show N entries / Search / pagination), `top10` backs the chart.
 */
export function getTop10Entities(sortKey, categoryKey) {
  const ratio = categoryKey ? CATEGORY_RATIO[categoryKey] : 1
  const scaled = TOP10_PUBLISHING_ENTITIES.map((e) => ({
    name: e.name,
    tenders: Math.round(e.tenders * ratio),
    value: Math.round(e.value * ratio * 100) / 100,
    bids: Math.round(e.bids * ratio),
  }))
  const sorted = [...scaled]
    .sort((a, b) => b[sortKey] - a[sortKey])
    .map((row, i) => ({ sNo: i + 1, ...row }))

  return { top10: sorted.slice(0, 10), all: sorted, total: sorted.length }
}