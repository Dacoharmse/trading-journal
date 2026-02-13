/**
 * Trade calculation utilities for pips/R-first workflow
 */

/**
 * Calculate realized R-multiple from pips
 * @param pips Realized pips/points (with sign)
 * @param stopPips Planned stop distance in pips (absolute value)
 * @param riskR Risk per trade in R (usually 1.0)
 * @returns Realized R-multiple or null if insufficient data
 */
export function rFromPips(
  pips: number | null | undefined,
  stopPips: number | null | undefined,
  riskR = 1.0
): number | null {
  if (pips == null || stopPips == null || stopPips === 0) return null
  return (pips / stopPips) * riskR
}

/**
 * Parse R:R notation to number
 * Supports: "1:2" -> 2, "2" -> 2, 2 -> 2
 * @param rr R:R input in various formats
 * @returns Parsed R:R value or null
 */
export function parseRR(rr: string | number | null | undefined): number | null {
  if (rr == null) return null
  if (typeof rr === 'number') return rr

  const s = rr.replace(/\s/g, '')
  if (s.includes(':')) {
    const parts = s.split(':').map(Number)
    if (parts.length === 2 && isFinite(parts[1])) {
      return parts[1]
    }
  }

  const n = Number(s)
  return isFinite(n) ? n : null
}

// Re-export formatR from trade-formatting.ts for backwards compatibility
export { formatR } from './trade-formatting'

/**
 * Format pips/points for display
 * @param pips Pips value
 * @param assetClass Asset class (affects label)
 * @param showSign Whether to show + for positive values
 * @returns Formatted string (e.g., "+45.2 pips", "-10 points")
 */
export function formatPips(
  pips: number | null | undefined,
  assetClass: string = 'FX',
  showSign = true
): string {
  if (pips == null) return '—'
  const label = assetClass === 'FX' ? 'pips' : 'points'
  const sign = showSign && pips > 0 ? '+' : ''
  const decimals = assetClass === 'FX' ? 1 : 0
  return `${sign}${pips.toFixed(decimals)} ${label}`
}

/**
 * Calculate position size based on account risk and stop distance
 * @param accountBalance Account balance
 * @param riskPercent Risk percentage (e.g., 1.0 for 1%)
 * @param stopPips Stop distance in pips
 * @param pipValue Value per pip per lot
 * @returns Position size in lots
 */
export function calculatePositionSize(
  accountBalance: number,
  riskPercent: number,
  stopPips: number,
  pipValue: number
): number | null {
  if (stopPips === 0 || pipValue === 0) return null
  const riskAmount = accountBalance * (riskPercent / 100)
  return riskAmount / (stopPips * pipValue)
}

/**
 * Get pip/point label based on asset class
 */
export function getPipsLabel(assetClass: string = 'FX'): string {
  return assetClass === 'FX' ? 'pips' : 'points'
}

/**
 * Validate numeric input for trade fields
 */
export function validateTradeNumber(
  value: string | number | null | undefined,
  min?: number,
  max?: number
): { valid: boolean; value: number | null; error?: string } {
  if (value === null || value === undefined || value === '') {
    return { valid: true, value: null }
  }

  const num = typeof value === 'string' ? parseFloat(value) : value

  if (!isFinite(num)) {
    return { valid: false, value: null, error: 'Invalid number' }
  }

  if (min !== undefined && num < min) {
    return { valid: false, value: null, error: `Must be at least ${min}` }
  }

  if (max !== undefined && num > max) {
    return { valid: false, value: null, error: `Must be at most ${max}` }
  }

  return { valid: true, value: num }
}

/**
 * Calculate planned R:R from target and stop pips
 */
export function calculatePlannedRR(
  targetPips: number | null | undefined,
  stopPips: number | null | undefined
): number | null {
  if (targetPips == null || stopPips == null || stopPips === 0) return null
  return Math.abs(targetPips) / Math.abs(stopPips)
}
