/**
 * Trade Selectors and Utilities
 * Re-exports from trade-calculations.ts and trade-formatting.ts for backwards compatibility
 * New code should import from those modules directly
 */

// Re-export all calculation functions
export {
  calculateR,
  calculateTotalFees,
  calculateNetPnL,
  calculateHoldTime,
  calculateProfitFactor,
  calculateExpectancyR as calculateExpectancy,
  calculateWinRate,
  calculateTotalPnL,
  calculateTotalR,
  removeOutliers,
  getTradeResult,
} from './trade-calculations'

// Re-export all formatting functions
export {
  formatHoldTime,
  formatPnL,
  formatR,
  getCurrencySymbol,
  getDirectionIcon,
  getPnLColorClass,
  getDirectionColorClass,
  parseTags,
  parseConfluences,
  formatChips,
} from './trade-formatting'

// This file now re-exports all functions from the consolidated modules
// All duplicate implementations have been removed
