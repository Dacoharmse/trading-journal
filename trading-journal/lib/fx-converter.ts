/**
 * FX Converter - Currency conversion utilities
 * Handles multi-currency trade P&L normalization
 */

import type { BaseCurrency } from '@/stores/dashboard-filters'

/**
 * FX Rate cache
 * In production, this would come from a database table:
 * fx_rates (date, from_ccy, to_ccy, rate)
 */
const FX_RATES: Record<string, Record<string, number>> = {
  // Base rates (as of 2025-10-08)
  'USD': {
    'USD': 1.0,
    'ZAR': 18.50,
    'EUR': 0.92,
    'GBP': 0.79,
  },
  'ZAR': {
    'USD': 0.054,
    'ZAR': 1.0,
    'EUR': 0.050,
    'GBP': 0.043,
  },
  'EUR': {
    'USD': 1.09,
    'ZAR': 20.15,
    'EUR': 1.0,
    'GBP': 0.86,
  },
  'GBP': {
    'USD': 1.27,
    'ZAR': 23.48,
    'EUR': 1.16,
    'GBP': 1.0,
  },
}

/**
 * Convert P&L from one currency to another
 *
 * @param pnl - Profit/loss amount
 * @param from - Source currency
 * @param to - Target currency
 * @param date - Trade date (ISO string) - currently unused, but will be used for historical rates
 * @returns Converted P&L amount
 */
export function convertPnL(
  pnl: number,
  from: string,
  to: string,
  date?: string
): number {
  // Same currency, no conversion needed
  if (from === to) return pnl

  // Normalize currency codes to uppercase
  const fromCcy = from.toUpperCase()
  const toCcy = to.toUpperCase()

  // Get conversion rate
  const rate = getFxRate(fromCcy, toCcy, date)

  return pnl * rate
}

/**
 * Get FX rate for a currency pair on a specific date
 * Falls back to current rate if historical rate not found
 *
 * @param from - Source currency code
 * @param to - Target currency code
 * @param date - ISO date string (optional)
 * @returns Exchange rate
 */
export function getFxRate(
  from: string,
  to: string,
  date?: string
): number {
  if (from === to) return 1.0

  // TODO: Implement historical rate lookup from database
  // For now, use static rates

  const fromRates = FX_RATES[from]
  if (!fromRates) {
    console.warn(`FX rate not found for ${from}, defaulting to 1.0`)
    return 1.0
  }

  const rate = fromRates[to]
  if (!rate) {
    console.warn(`FX rate not found for ${from}→${to}, defaulting to 1.0`)
    return 1.0
  }

  return rate
}

/**
 * Get the last available FX rate date
 * Used for displaying FX rate staleness warning
 *
 * @returns ISO date string of last FX rate update
 */
export function getLastFxRateDate(): string {
  // TODO: Query database for max(date) from fx_rates
  return '2025-10-08'
}

/**
 * Format currency amount with proper symbol and decimals
 *
 * @param value - Amount to format
 * @param currency - Currency code
 * @returns Formatted string
 */
export function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  } catch (error) {
    // Fallback for unsupported currencies
    return `${currency} ${value.toFixed(0)}`
  }
}

/**
 * Get currency symbol
 *
 * @param currency - Currency code
 * @returns Currency symbol (e.g., $, R, €, £)
 */
export function getCurrencySymbol(currency: BaseCurrency): string {
  const symbols: Record<BaseCurrency, string> = {
    'USD': '$',
    'ZAR': 'R',
    'EUR': '€',
    'GBP': '£',
  }
  return symbols[currency] || currency
}

/**
 * Check if FX rates are available for a currency pair
 *
 * @param from - Source currency
 * @param to - Target currency
 * @returns True if rate is available
 */
export function hasFxRate(from: string, to: string): boolean {
  if (from === to) return true
  return !!(FX_RATES[from]?.[to])
}
