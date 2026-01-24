'use client'

import React from 'react'
import { X, AlertCircle } from 'lucide-react'
import type { Trade, Account, EmotionalState } from '@/types/supabase'
import { EMOTIONAL_STATES } from '@/types/supabase'
import { calculateR, formatR, formatPnL } from '@/lib/trades-selectors'

interface TradeFormModalProps {
  open: boolean
  trade: Trade | null
  accounts: Account[]
  onClose: () => void
  onSave: (trade: Partial<Trade>) => void
}

export function TradeFormModal({ open, trade, accounts, onClose, onSave }: TradeFormModalProps) {
  const isEdit = Boolean(trade)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  // Form state
  const [formData, setFormData] = React.useState<Partial<Trade>>({
    account_id: '',
    symbol: '',
    direction: 'long',
    entry_price: null,
    stop_price: null,
    exit_price: null,
    size: null,
    entry_date: new Date().toISOString().split('T')[0],
    entry_time: new Date().toTimeString().slice(0, 5),
    exit_date: '',
    exit_time: '',
    strategy: '',
    session: null,
    session_hour: null,
    confluences: '',
    tags: '',
    notes: '',
    commission: null,
    swap: null,
    slippage: null,
    rule_breaks: '',
    emotional_state: null,
  })

  // Populate form when editing
  React.useEffect(() => {
    if (trade) {
      setFormData({
        account_id: trade.account_id,
        symbol: trade.symbol,
        direction: trade.direction,
        entry_price: trade.entry_price,
        stop_price: trade.stop_price,
        exit_price: trade.exit_price,
        size: trade.size,
        entry_date: trade.entry_date?.split('T')[0] || '',
        entry_time: trade.entry_time || '',
        exit_date: trade.exit_date?.split('T')[0] || '',
        exit_time: trade.exit_time || '',
        strategy: trade.strategy || '',
        session: trade.session,
        session_hour: trade.session_hour || null,
        confluences: trade.confluences || '',
        tags: trade.tags || '',
        notes: trade.notes || '',
        commission: trade.commission,
        swap: trade.swap,
        slippage: trade.slippage,
        rule_breaks: trade.rule_breaks || '',
        emotional_state: trade.emotional_state || null,
      })
    } else {
      // Reset for new trade
      setFormData({
        account_id: accounts[0]?.id || '',
        symbol: '',
        direction: 'long',
        entry_price: null,
        stop_price: null,
        exit_price: null,
        size: null,
        entry_date: new Date().toISOString().split('T')[0],
        entry_time: new Date().toTimeString().slice(0, 5),
        exit_date: '',
        exit_time: '',
        strategy: '',
        session: null,
        session_hour: null,
        confluences: '',
        tags: '',
        notes: '',
        commission: null,
        swap: null,
        slippage: null,
        rule_breaks: '',
        emotional_state: null,
      })
    }
    setErrors({})
  }, [trade, accounts, open])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.account_id) newErrors.account_id = 'Account is required'
    if (!formData.symbol?.trim()) newErrors.symbol = 'Symbol is required'
    if (!formData.entry_date) newErrors.entry_date = 'Entry date is required'

    if (formData.entry_price !== null && formData.entry_price <= 0) {
      newErrors.entry_price = 'Entry price must be positive'
    }
    if (formData.stop_price !== null && formData.stop_price <= 0) {
      newErrors.stop_price = 'Stop price must be positive'
    }
    if (formData.exit_price !== null && formData.exit_price <= 0) {
      newErrors.exit_price = 'Exit price must be positive'
    }
    if (formData.size !== null && formData.size <= 0) {
      newErrors.size = 'Size must be positive'
    }

    if (formData.exit_date && formData.entry_date) {
      const entryDateTime = new Date(`${formData.entry_date}T${formData.entry_time || '00:00'}`)
      const exitDateTime = new Date(`${formData.exit_date}T${formData.exit_time || '00:00'}`)
      if (exitDateTime < entryDateTime) {
        newErrors.exit_date = 'Exit must be after entry'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    // Calculate P&L and R
    let pnl = 0
    let r_multiple = null

    if (formData.entry_price && formData.exit_price && formData.size) {
      const pnlPerUnit = formData.exit_price - formData.entry_price
      const multiplier = formData.direction === 'long' ? 1 : -1
      pnl = pnlPerUnit * formData.size * multiplier

      if (formData.stop_price) {
        const risk = Math.abs(formData.entry_price - formData.stop_price)
        if (risk > 0) {
          r_multiple = (pnlPerUnit * multiplier) / risk
        }
      }
    }

    const account = accounts.find((a) => a.id === formData.account_id)

    const tradeData: Partial<Trade> = {
      ...formData,
      pnl,
      r_multiple,
      currency: account?.currency || 'USD',
      symbol: formData.symbol?.toUpperCase(),
      opened_at: formData.entry_date && formData.entry_time
        ? `${formData.entry_date}T${formData.entry_time}:00`
        : formData.entry_date
        ? `${formData.entry_date}T00:00:00`
        : undefined,
      closed_at: formData.exit_date && formData.exit_time
        ? `${formData.exit_date}T${formData.exit_time}:00`
        : formData.exit_date
        ? `${formData.exit_date}T00:00:00`
        : undefined,
    }

    if (isEdit) {
      tradeData.id = trade!.id
    }

    onSave(tradeData)
    onClose()
  }

  const updateField = (field: keyof Trade, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Preview calculation
  const previewTrade: Partial<Trade> = {
    ...formData,
    direction: formData.direction || 'long',
    entry_price: formData.entry_price || undefined,
    stop_price: formData.stop_price || undefined,
    exit_price: formData.exit_price || undefined,
  }
  const previewR = calculateR(previewTrade as Trade)
  const account = accounts.find((a) => a.id === formData.account_id)

  let previewPnL = 0
  if (formData.entry_price && formData.exit_price && formData.size) {
    const pnlPerUnit = formData.exit_price - formData.entry_price
    const multiplier = formData.direction === 'long' ? 1 : -1
    previewPnL = pnlPerUnit * formData.size * multiplier
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl w-full max-w-4xl mx-4 my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 bg-white dark:bg-neutral-900 z-10">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            {isEdit ? 'Edit Trade' : 'New Trade'}
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div className="space-y-6">
            {/* Account & Symbol Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Account *
                </label>
                <select
                  value={formData.account_id}
                  onChange={(e) => updateField('account_id', e.target.value)}
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${
                    errors.account_id
                      ? 'border-red-500'
                      : 'border-neutral-200 dark:border-neutral-700'
                  } bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500`}
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency})
                    </option>
                  ))}
                </select>
                {errors.account_id && (
                  <p className="text-xs text-red-600 mt-1">{errors.account_id}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Symbol *
                </label>
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) => updateField('symbol', e.target.value.toUpperCase())}
                  placeholder="AAPL, EURUSD, etc."
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${
                    errors.symbol
                      ? 'border-red-500'
                      : 'border-neutral-200 dark:border-neutral-700'
                  } bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500`}
                />
                {errors.symbol && (
                  <p className="text-xs text-red-600 mt-1">{errors.symbol}</p>
                )}
              </div>
            </div>

            {/* Direction */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Direction *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="long"
                    checked={formData.direction === 'long'}
                    onChange={(e) => updateField('direction', e.target.value)}
                    className="w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">Long ▲</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="short"
                    checked={formData.direction === 'short'}
                    onChange={(e) => updateField('direction', e.target.value)}
                    className="w-4 h-4 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">Short ▼</span>
                </label>
              </div>
            </div>

            {/* Prices Row */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Entry Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.entry_price || ''}
                  onChange={(e) => updateField('entry_price', e.target.value ? parseFloat(e.target.value) : null)}
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${
                    errors.entry_price
                      ? 'border-red-500'
                      : 'border-neutral-200 dark:border-neutral-700'
                  } bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500`}
                />
                {errors.entry_price && (
                  <p className="text-xs text-red-600 mt-1">{errors.entry_price}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Stop Loss
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.stop_price || ''}
                  onChange={(e) => updateField('stop_price', e.target.value ? parseFloat(e.target.value) : null)}
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${
                    errors.stop_price
                      ? 'border-red-500'
                      : 'border-neutral-200 dark:border-neutral-700'
                  } bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500`}
                />
                {errors.stop_price && (
                  <p className="text-xs text-red-600 mt-1">{errors.stop_price}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Exit Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.exit_price || ''}
                  onChange={(e) => updateField('exit_price', e.target.value ? parseFloat(e.target.value) : null)}
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${
                    errors.exit_price
                      ? 'border-red-500'
                      : 'border-neutral-200 dark:border-neutral-700'
                  } bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500`}
                />
                {errors.exit_price && (
                  <p className="text-xs text-red-600 mt-1">{errors.exit_price}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Size
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.size || ''}
                  onChange={(e) => updateField('size', e.target.value ? parseFloat(e.target.value) : null)}
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${
                    errors.size
                      ? 'border-red-500'
                      : 'border-neutral-200 dark:border-neutral-700'
                  } bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500`}
                />
                {errors.size && (
                  <p className="text-xs text-red-600 mt-1">{errors.size}</p>
                )}
              </div>
            </div>

            {/* Preview */}
            {(formData.entry_price && formData.stop_price && formData.exit_price) && (
              <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-950/30 border border-neutral-200 dark:border-neutral-900">
                <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-400 text-sm font-medium mb-2">
                  <AlertCircle className="w-4 h-4" />
                  Preview
                </div>
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-neutral-600 dark:text-neutral-400">R Multiple: </span>
                    <span className={`font-bold ${previewR && previewR > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatR(previewR)}
                    </span>
                  </div>
                  {formData.size && (
                    <div>
                      <span className="text-neutral-600 dark:text-neutral-400">P&L: </span>
                      <span className={`font-bold ${previewPnL > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatPnL(previewPnL, account?.currency || 'USD')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Date/Time Row */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Entry Date *
                </label>
                <input
                  type="date"
                  value={formData.entry_date}
                  onChange={(e) => updateField('entry_date', e.target.value)}
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${
                    errors.entry_date
                      ? 'border-red-500'
                      : 'border-neutral-200 dark:border-neutral-700'
                  } bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500`}
                />
                {errors.entry_date && (
                  <p className="text-xs text-red-600 mt-1">{errors.entry_date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Entry Time
                </label>
                <input
                  type="time"
                  value={formData.entry_time}
                  onChange={(e) => updateField('entry_time', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Exit Date
                </label>
                <input
                  type="date"
                  value={formData.exit_date}
                  onChange={(e) => updateField('exit_date', e.target.value)}
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${
                    errors.exit_date
                      ? 'border-red-500'
                      : 'border-neutral-200 dark:border-neutral-700'
                  } bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500`}
                />
                {errors.exit_date && (
                  <p className="text-xs text-red-600 mt-1">{errors.exit_date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Exit Time
                </label>
                <input
                  type="time"
                  value={formData.exit_time}
                  onChange={(e) => updateField('exit_time', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                />
              </div>
            </div>

            {/* Strategy & Session */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Strategy
                </label>
                <input
                  type="text"
                  value={formData.strategy}
                  onChange={(e) => updateField('strategy', e.target.value)}
                  placeholder="Scalp, Swing, Breakout, etc."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Session
                </label>
                <select
                  value={formData.session || ''}
                  onChange={(e) => updateField('session', e.target.value || null)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                >
                  <option value="">-- Select --</option>
                  <option value="asia">Asia</option>
                  <option value="london">London</option>
                  <option value="ny">New York</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Session Hour
                </label>
                <select
                  value={formData.session_hour || ''}
                  onChange={(e) => updateField('session_hour', e.target.value || null)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                >
                  <option value="">-- Select --</option>
                  <optgroup label="Asia">
                    <option value="A1">A1 - First Hour</option>
                    <option value="A2">A2 - Second Hour</option>
                    <option value="A3">A3 - Third Hour</option>
                    <option value="A4">A4 - Fourth Hour</option>
                  </optgroup>
                  <optgroup label="London">
                    <option value="L1">L1 - First Hour</option>
                    <option value="L2">L2 - Second Hour</option>
                    <option value="L3">L3 - Third Hour</option>
                  </optgroup>
                  <optgroup label="New York">
                    <option value="NY1">NY1 - First Hour</option>
                    <option value="NY2">NY2 - Second Hour</option>
                    <option value="NY3">NY3 - Third Hour</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Emotional State */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Emotional State
              </label>
              <select
                value={formData.emotional_state || ''}
                onChange={(e) => updateField('emotional_state', e.target.value || null)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500"
              >
                <option value="">-- Select your emotional state --</option>
                {EMOTIONAL_STATES.map((state) => (
                  <option key={state.value} value={state.value}>
                    {state.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                How were you feeling when you took this trade?
              </p>
            </div>

            {/* Confluences & Tags */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Confluences (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.confluences}
                  onChange={(e) => updateField('confluences', e.target.value)}
                  placeholder="EMA bounce, support level, etc."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => updateField('tags', e.target.value)}
                  placeholder="breakout, momentum, etc."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                />
              </div>
            </div>

            {/* Fees Row */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Commission
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.commission || ''}
                  onChange={(e) => updateField('commission', e.target.value ? parseFloat(e.target.value) : null)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Swap
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.swap || ''}
                  onChange={(e) => updateField('swap', e.target.value ? parseFloat(e.target.value) : null)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Slippage
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.slippage || ''}
                  onChange={(e) => updateField('slippage', e.target.value ? parseFloat(e.target.value) : null)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                rows={4}
                placeholder="Trade setup, reasoning, market conditions, etc."
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500"
              />
            </div>

            {/* Rule Breaks */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Rule Breaks (comma-separated)
              </label>
              <input
                type="text"
                value={formData.rule_breaks}
                onChange={(e) => updateField('rule_breaks', e.target.value)}
                placeholder="FOMO Entry, Moved Stop, etc."
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 sticky bottom-0 bg-white dark:bg-neutral-900">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-neutral-700 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            {isEdit ? 'Save Changes' : 'Create Trade'}
          </button>
        </div>
      </div>
    </div>
  )
}
