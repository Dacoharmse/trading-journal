'use client'

import React from 'react'
import { Plus, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Strategy } from '@/types/supabase'

export default function StrategiesPage() {
  const supabase = createClient()

  const [strategies, setStrategies] = React.useState<Strategy[]>([])
  const [loading, setLoading] = React.useState(true)
  const [editingStrategy, setEditingStrategy] = React.useState<Partial<Strategy> | null>(null)
  const [drawerOpen, setDrawerOpen] = React.useState(false)

  // Form state
  const [name, setName] = React.useState('')
  const [type, setType] = React.useState<Strategy['type']>('Other')
  const [rules, setRules] = React.useState('')
  const [sessions, setSessions] = React.useState<string[]>([])
  const [active, setActive] = React.useState(true)

  React.useEffect(() => {
    fetchStrategies()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchStrategies = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('strategies')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching strategies:', error)
    } else {
      setStrategies(data || [])
    }
    setLoading(false)
  }

  const handleNew = () => {
    setEditingStrategy(null)
    setName('')
    setType('Other')
    setRules('')
    setSessions([])
    setActive(true)
    setDrawerOpen(true)
  }

  const handleEdit = (strategy: Strategy) => {
    setEditingStrategy(strategy)
    setName(strategy.name)
    setType(strategy.type)
    setRules(strategy.rules || '')
    setSessions(strategy.sessions || [])
    setActive(strategy.active)
    setDrawerOpen(true)
  }

  const handleSave = async () => {
    const strategyData = {
      name,
      type,
      rules: rules || null,
      sessions: sessions.length > 0 ? sessions : null,
      active,
    }

    if (editingStrategy?.id) {
      // Update
      const { error } = await supabase
        .from('strategies')
        .update(strategyData)
        .eq('id', editingStrategy.id)

      if (error) {
        console.error('Error updating strategy:', error)
        alert('Failed to update strategy')
        return
      }
    } else {
      // Insert
      const { error } = await supabase.from('strategies').insert(strategyData)

      if (error) {
        console.error('Error creating strategy:', error)
        alert('Failed to create strategy')
        return
      }
    }

    setDrawerOpen(false)
    fetchStrategies()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this strategy? Trades using it will not be affected.')) return

    const { error } = await supabase.from('strategies').delete().eq('id', id)

    if (error) {
      console.error('Error deleting strategy:', error)
      alert('Failed to delete strategy')
      return
    }

    fetchStrategies()
  }

  const toggleSession = (session: string) => {
    if (sessions.includes(session)) {
      setSessions(sessions.filter((s) => s !== session))
    } else {
      setSessions([...sessions, session])
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Strategies
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your trading playbook
            </p>
          </div>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            <Plus className="w-5 h-5" />
            New Strategy
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : strategies.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No strategies yet</p>
            <button
              onClick={handleNew}
              className="text-blue-600 hover:text-blue-700"
            >
              Create your first strategy
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {strategies.map((strategy) => (
              <div
                key={strategy.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {strategy.name}
                    </h3>
                    <span className="inline-block px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 mt-1">
                      {strategy.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {strategy.active ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {strategy.sessions && strategy.sessions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {strategy.sessions.map((sess) => (
                      <span
                        key={sess}
                        className="px-2 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                      >
                        {sess}
                      </span>
                    ))}
                  </div>
                )}

                {strategy.rules && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-3">
                    {strategy.rules}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-800">
                  <button
                    onClick={() => handleEdit(strategy)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950 rounded"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(strategy.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDrawerOpen(false)}
          />

          <div className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-white dark:bg-gray-900 shadow-xl overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  {editingStrategy ? 'Edit Strategy' : 'New Strategy'}
                </h2>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                    placeholder="e.g. London Breakout"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Type *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as Strategy['type'])}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  >
                    <option value="Breakout">Breakout</option>
                    <option value="Reversion">Reversion</option>
                    <option value="Trend">Trend</option>
                    <option value="News">News</option>
                    <option value="ICT">ICT</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Sessions */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Sessions
                  </label>
                  <div className="flex gap-2">
                    {['Asia', 'London', 'NY'].map((sess) => (
                      <button
                        key={sess}
                        type="button"
                        onClick={() => toggleSession(sess)}
                        className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                          sessions.includes(sess)
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                            : 'border-gray-300 dark:border-gray-700'
                        }`}
                      >
                        {sess}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rules */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Rules & Checklist
                  </label>
                  <textarea
                    value={rules}
                    onChange={(e) => setRules(e.target.value)}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 resize-none font-mono text-sm"
                    placeholder="Enter your trading rules, entry criteria, exit rules, etc. Supports Markdown."
                  />
                </div>

                {/* Active */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600"
                  />
                  <label htmlFor="active" className="text-sm font-medium">
                    Active (show in trade form)
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={handleSave}
                  disabled={!name}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
