'use client'

import React from 'react'
import { X } from 'lucide-react'

interface BulkEditModalProps {
  open: boolean
  selectedCount: number
  onClose: () => void
  onSave: (updates: BulkEditUpdates) => void
}

export interface BulkEditUpdates {
  addTags?: string[]
  removeTags?: string[]
  addConfluences?: string[]
  removeConfluences?: string[]
  setStrategy?: string
  setSession?: 'asia' | 'london' | 'ny' | null
  setRuleBreaks?: string[]
}

export function BulkEditModal({ open, selectedCount, onClose, onSave }: BulkEditModalProps) {
  const [addTags, setAddTags] = React.useState('')
  const [removeTags, setRemoveTags] = React.useState('')
  const [addConfluences, setAddConfluences] = React.useState('')
  const [removeConfluences, setRemoveConfluences] = React.useState('')
  const [strategy, setStrategy] = React.useState('')
  const [session, setSession] = React.useState<'asia' | 'london' | 'ny' | ''>('')
  const [ruleBreaks, setRuleBreaks] = React.useState<Record<string, boolean>>({
    'FOMO Entry': false,
    'Wrong Size': false,
    'Moved Stop': false,
    'No Stop': false,
    'Revenge Trade': false,
    'Against Plan': false,
  })

  const handleSave = () => {
    const updates: BulkEditUpdates = {}

    if (addTags.trim()) {
      updates.addTags = addTags.split(',').map((t) => t.trim()).filter(Boolean)
    }

    if (removeTags.trim()) {
      updates.removeTags = removeTags.split(',').map((t) => t.trim()).filter(Boolean)
    }

    if (addConfluences.trim()) {
      updates.addConfluences = addConfluences.split(',').map((c) => c.trim()).filter(Boolean)
    }

    if (removeConfluences.trim()) {
      updates.removeConfluences = removeConfluences.split(',').map((c) => c.trim()).filter(Boolean)
    }

    if (strategy.trim()) {
      updates.setStrategy = strategy.trim()
    }

    if (session) {
      updates.setSession = session
    }

    const selectedRuleBreaks = Object.entries(ruleBreaks)
      .filter(([_, checked]) => checked)
      .map(([rule]) => rule)

    if (selectedRuleBreaks.length > 0) {
      updates.setRuleBreaks = selectedRuleBreaks
    }

    onSave(updates)
    handleReset()
  }

  const handleReset = () => {
    setAddTags('')
    setRemoveTags('')
    setAddConfluences('')
    setRemoveConfluences('')
    setStrategy('')
    setSession('')
    setRuleBreaks({
      'FOMO Entry': false,
      'Wrong Size': false,
      'Moved Stop': false,
      'No Stop': false,
      'Revenge Trade': false,
      'Against Plan': false,
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Bulk Edit Trades</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Editing {selectedCount} selected trade{selectedCount !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Tags */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Tags</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                  Add tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={addTags}
                  onChange={(e) => setAddTags(e.target.value)}
                  placeholder="e.g., breakout, momentum"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                  Remove tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={removeTags}
                  onChange={(e) => setRemoveTags(e.target.value)}
                  placeholder="e.g., scalp, test"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Confluences */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Confluences</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                  Add confluences (comma-separated)
                </label>
                <input
                  type="text"
                  value={addConfluences}
                  onChange={(e) => setAddConfluences(e.target.value)}
                  placeholder="e.g., EMA bounce, support level"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                  Remove confluences (comma-separated)
                </label>
                <input
                  type="text"
                  value={removeConfluences}
                  onChange={(e) => setRemoveConfluences(e.target.value)}
                  placeholder="e.g., volume spike"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Strategy */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Strategy</h3>
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                Set strategy (will overwrite existing)
              </label>
              <input
                type="text"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                placeholder="e.g., Scalp, Swing, Breakout"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Session */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Session</h3>
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                Set trading session (will overwrite existing)
              </label>
              <select
                value={session}
                onChange={(e) => setSession(e.target.value as 'asia' | 'london' | 'ny' | '')}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- No change --</option>
                <option value="asia">Asia</option>
                <option value="london">London</option>
                <option value="ny">New York</option>
              </select>
            </div>
          </div>

          {/* Rule Breaks */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Mark Rule Breaks</h3>
            <div className="space-y-2">
              {Object.keys(ruleBreaks).map((rule) => (
                <label
                  key={rule}
                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={ruleBreaks[rule]}
                    onChange={(e) =>
                      setRuleBreaks((prev) => ({ ...prev, [rule]: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{rule}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
              Checked rules will be added to selected trades (existing rule breaks will be preserved)
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900">
          <button
            onClick={() => {
              handleReset()
              onClose()
            }}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Apply to {selectedCount} Trade{selectedCount !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
