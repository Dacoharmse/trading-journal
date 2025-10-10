'use client'

import React from 'react'
import { Plus, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Confluence } from '@/types/supabase'

export default function ConfluencesPage() {
  const supabase = createClient()

  const [confluences, setConfluences] = React.useState<Confluence[]>([])
  const [loading, setLoading] = React.useState(true)
  const [editingConfluence, setEditingConfluence] = React.useState<Partial<Confluence> | null>(null)
  const [modalOpen, setModalOpen] = React.useState(false)

  // Form state
  const [label, setLabel] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [active, setActive] = React.useState(true)

  React.useEffect(() => {
    fetchConfluences()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchConfluences = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('confluences')
      .select('*')
      .order('label')

    if (error) {
      console.error('Error fetching confluences:', error)
    } else {
      setConfluences(data || [])
    }
    setLoading(false)
  }

  const handleNew = () => {
    setEditingConfluence(null)
    setLabel('')
    setDescription('')
    setActive(true)
    setModalOpen(true)
  }

  const handleEdit = (confluence: Confluence) => {
    setEditingConfluence(confluence)
    setLabel(confluence.label)
    setDescription(confluence.description || '')
    setActive(confluence.active)
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!label.trim()) {
      alert('Label is required')
      return
    }

    const confluenceData = {
      label: label.trim(),
      description: description.trim() || null,
      active,
    }

    if (editingConfluence?.id) {
      // Update
      const { error } = await supabase
        .from('confluences')
        .update(confluenceData)
        .eq('id', editingConfluence.id)

      if (error) {
        console.error('Error updating confluence:', error)
        alert('Failed to update confluence')
        return
      }
    } else {
      // Insert
      const { error } = await supabase.from('confluences').insert(confluenceData)

      if (error) {
        console.error('Error creating confluence:', error)
        alert('Failed to create confluence')
        return
      }
    }

    setModalOpen(false)
    fetchConfluences()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this confluence? It may be in use by trades.')) return

    const { error } = await supabase.from('confluences').delete().eq('id', id)

    if (error) {
      console.error('Error deleting confluence:', error)
      alert('Failed to delete confluence. It may be in use by trades.')
      return
    }

    fetchConfluences()
  }

  const handleToggleActive = async (confluence: Confluence) => {
    const { error } = await supabase
      .from('confluences')
      .update({ active: !confluence.active })
      .eq('id', confluence.id)

    if (error) {
      console.error('Error toggling confluence:', error)
      return
    }

    fetchConfluences()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Confluences
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage confluence factors for trade analysis
            </p>
          </div>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            <Plus className="w-5 h-5" />
            New Confluence
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : confluences.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No confluences yet</p>
            <button
              onClick={handleNew}
              className="text-blue-600 hover:text-blue-700"
            >
              Create your first confluence
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Label
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {confluences.map((confluence) => (
                  <tr
                    key={confluence.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {confluence.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {confluence.description || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleActive(confluence)}
                        className="inline-flex items-center"
                      >
                        {confluence.active ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(confluence)}
                          className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(confluence.id)}
                          className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setModalOpen(false)}
          />

          <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {editingConfluence ? 'Edit Confluence' : 'New Confluence'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Label */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Label *
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  placeholder="e.g. PDH/PDL, VWAP, 50EMA"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 resize-none"
                  placeholder="Optional notes about this confluence factor"
                />
              </div>

              {/* Active */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="modal-active"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                />
                <label
                  htmlFor="modal-active"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Active (show in trade form)
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={handleSave}
                disabled={!label.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
