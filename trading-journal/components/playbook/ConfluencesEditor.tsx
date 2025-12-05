'use client'

import * as React from 'react'
import { GripVertical, Trash2, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import type { ConfluenceDraft } from './types'

interface ConfluencesEditorProps {
  confluences: ConfluenceDraft[]
  onAddConfluence: () => void
  onUpdateConfluence: (id: string, updates: Partial<ConfluenceDraft>) => void
  onRemoveConfluence: (id: string) => void
  onReorderConfluences: (fromIndex: number, toIndex: number) => void
}

export function ConfluencesEditor({
  confluences,
  onAddConfluence,
  onUpdateConfluence,
  onRemoveConfluence,
  onReorderConfluences,
}: ConfluencesEditorProps) {
  const sorted = React.useMemo(
    () => [...confluences].sort((a, b) => a.sort - b.sort),
    [confluences]
  )

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, index: number) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    event.preventDefault()
    const fromIndex = Number(event.dataTransfer.getData('text/plain'))
    if (!Number.isNaN(fromIndex) && fromIndex !== dropIndex) {
      onReorderConfluences(fromIndex, dropIndex)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Confluences
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Track the supporting signals that add weight to your setup.
          </p>
        </div>
        <Button onClick={onAddConfluence} size="sm">
          <Plus className="h-4 w-4" />
          Add Confluence
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300/70 p-8 text-center dark:border-neutral-700/60">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No confluences yet. Add market structure, liquidity, or other supporting factors.
          </p>
          <Button className="mt-4" variant="outline" onClick={onAddConfluence}>
            <Plus className="h-4 w-4" />
            Add first confluence
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((confluence, index) => (
            <div
              key={confluence.id}
              draggable
              onDragStart={(event) => handleDragStart(event, index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDrop(event, index)}
              className="bg-white dark:bg-black flex flex-col gap-3 rounded-lg border border-neutral-200/70 p-4 transition-shadow dark:border-neutral-800/60"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200/80 bg-neutral-100 text-neutral-500 dark:border-neutral-700/70 dark:bg-neutral-900 dark:text-neutral-400"
                  aria-label="Drag to reorder"
                >
                  <GripVertical className="h-4 w-4" />
                </button>

                <div className="flex-1 space-y-2">
                  <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    Label
                  </label>
                  <Input
                    value={confluence.label}
                    placeholder="Describe the confluence"
                    onChange={(event) =>
                      onUpdateConfluence(confluence.id, { label: event.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <label className="flex items-center justify-between text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    <span>Primary Confluence {confluence.primary_confluence ? '(Weight: 10)' : '(Weight: 3)'}</span>
                    <Switch
                      checked={confluence.primary_confluence}
                      onCheckedChange={(checked) => {
                        const weight = checked ? 10 : 3
                        onUpdateConfluence(confluence.id, { primary_confluence: checked, weight })
                      }}
                    />
                  </label>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Primary confluences automatically receive higher weight (10 vs 3).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveConfluence(confluence.id)}
                  className="h-9 w-9 self-center rounded-md border border-neutral-200/70 text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:border-neutral-800/60 dark:text-neutral-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                  aria-label="Delete confluence"
                >
                  <Trash2 className="mx-auto h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
