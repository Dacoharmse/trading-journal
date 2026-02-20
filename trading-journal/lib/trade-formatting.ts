/**
 * Trade Formatting Utilities
 * Unified formatting functions for displaying trade data
 */

import { Trade } from '@/types/supabase'
import { calculateR } from './trade-calculations'

/**
 * Format hold time as human-readable string
 * @param minutes - Hold time in minutes
 * @returns Formatted string
 */
export function formatHoldTime(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return 'N/A'

  if (minutes < 60) return `${minutes}m`
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`
}

/**
 * Get currency symbol
 * @param currency - Currency code
 * @returns Currency symbol
 */
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    ZAR: 'R',
    EUR: '€',
    GBP: '£',
  }
  return symbols[currency] || currency
}

/**
 * Format P&L with currency symbol and thousands separator
 * @param value - P&L value
 * @param currency - Currency code (default: USD)
 * @returns Formatted P&L string
 */
export function formatPnL(value: number, currency: string = 'USD'): string {
  const symbol = getCurrencySymbol(currency)
  const abs = Math.abs(value)
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs)

  return value >= 0 ? `+${symbol}${formatted}` : `-${symbol}${formatted}`
}

/**
 * Format currency value
 * @param value - Currency value
 * @param currency - Currency code (default: USD)
 * @returns Formatted currency string
 */
export function formatCurrency(value: number, currency: string = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${getCurrencySymbol(currency)}${value.toFixed(0)}`
  }
}

/**
 * Format R-multiple for display
 * @param r - R-multiple value
 * @param showSign - Whether to show + for positive values (default: true)
 * @returns Formatted string (e.g., "+2.5R", "-0.8R", "N/A" for null)
 */
export function formatR(r: number | null | undefined, showSign = true): string {
  if (r === null || r === undefined) return 'N/A'
  const sign = showSign && r >= 0 ? '+' : ''
  return `${sign}${r.toFixed(2)}R`
}

/**
 * Format percentage
 * @param value - Percentage value (0-100)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Format profit factor
 * @param value - Profit factor value
 * @returns Formatted profit factor string
 */
export function formatProfitFactor(value: number): string {
  if (value === Infinity) return '∞'
  return value.toFixed(2)
}

/**
 * Get P&L color class for Tailwind
 * @param value - P&L value
 * @returns Tailwind class string
 */
export function getPnLColorClass(value: number): string {
  if (value > 0) return 'text-green-600 dark:text-green-400'
  if (value < 0) return 'text-red-600 dark:text-red-400'
  return 'text-gray-600 dark:text-gray-400'
}

/**
 * Get direction color class for Tailwind
 * @param trade - Trade object
 * @returns Tailwind class string
 */
export function getDirectionColorClass(trade: Trade): string {
  const r = calculateR(trade)
  if (r === null) return 'text-gray-600 dark:text-gray-400'

  // Color based on whether trade was profitable
  if (r > 0) return 'text-green-600 dark:text-green-400'
  return 'text-red-600 dark:text-red-400'
}

/**
 * Get direction icon
 * @param direction - Trade direction
 * @returns Direction icon string
 */
export function getDirectionIcon(direction: 'long' | 'short'): string {
  return direction === 'long' ? '▲' : '▼'
}

/**
 * Parse comma-separated tags
 * @param tags - Tags string or null
 * @returns Array of tags
 */
export function parseTags(tags: string | string[] | null | undefined): string[] {
  if (!tags || (Array.isArray(tags) && tags.length === 0)) return []
  if (Array.isArray(tags)) return tags.filter(Boolean)
  return tags.split(',').map(t => t.trim()).filter(Boolean)
}

/**
 * Parse comma-separated confluences
 * @param confluences - Confluences string or null
 * @returns Array of confluences
 */
export function parseConfluences(confluences: string | string[] | null | undefined): string[] {
  if (!confluences || (Array.isArray(confluences) && confluences.length === 0)) return []
  if (Array.isArray(confluences)) return confluences.filter(Boolean)
  return confluences.split(',').map(c => c.trim()).filter(Boolean)
}

/**
 * Format tags/confluences for display with overflow
 * @param items - Array of items
 * @param maxVisible - Maximum number of visible items (default: 3)
 * @returns Object with visible items and overflow count
 */
export function formatChips(items: string[], maxVisible: number = 3): { visible: string[]; overflow: number } {
  if (items.length <= maxVisible) {
    return { visible: items, overflow: 0 }
  }

  return {
    visible: items.slice(0, maxVisible),
    overflow: items.length - maxVisible,
  }
}
