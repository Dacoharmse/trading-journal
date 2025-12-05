'use client'

import * as React from 'react'
import { GripVertical, Trash2, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { RuleDraft } from './types'

interface RulesEditorProps {
  rules: RuleDraft[]
  onAddRule: () => void
  onUpdateRule: (id: string, updates: Partial<RuleDraft>) => void
  onRemoveRule: (id: string) => void
  onReorderRules: (fromIndex: number, toIndex: number) => void
}

export function RulesEditor({
  rules,
  onAddRule,
  onUpdateRule,
  onRemoveRule,
  onReorderRules,
}: RulesEditorProps) {
  const sortedRules = React.useMemo(
    () => [...rules].sort((a, b) => a.sort - b.sort),
    [rules]
  )

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, index: number) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    event.preventDefault()
    const fromIndex = Number(event.dataTransfer.getData('text/plain'))
    if (!Number.isNaN(fromIndex) && fromIndex !== dropIndex) {
      onReorderRules(fromIndex, dropIndex)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Rules
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Define the checklist items you evaluate before entering a trade.
          </p>
        </div>
        <Button onClick={onAddRule} size="sm">
          <Plus className="h-4 w-4" />
          Add Rule
        </Button>
      </div>

      {sortedRules.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300/70 p-8 text-center dark:border-neutral-700/60">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No rules yet. Add rules to describe your ideal setup.
          </p>
          <Button className="mt-4" variant="outline" onClick={onAddRule}>
            <Plus className="h-4 w-4" />
            Add first rule
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedRules.map((rule, index) => (
            <div
              key={rule.id}
              draggable
              onDragStart={(event) => handleDragStart(event, index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDrop(event, index)}
              className="bg-white dark:bg-black relative flex flex-col gap-3 rounded-lg border border-neutral-200/70 p-4 transition-shadow dark:border-neutral-800/60"
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
                    value={rule.label}
                    placeholder="Describe the rule"
                    onChange={(event) => onUpdateRule(rule.id, { label: event.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[200px_1fr_40px] sm:items-end">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    Type
                  </label>
                  <Select
                    value={rule.type}
                    onValueChange={(value) => {
                      const type = value as RuleDraft['type']
                      const weight = type === 'must' ? 10 : type === 'should' ? 5 : 1
                      onUpdateRule(rule.id, { type, weight })
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="must">Must (Weight: 10)</SelectItem>
                      <SelectItem value="should">Should (Weight: 5)</SelectItem>
                      <SelectItem value="optional">Optional (Weight: 1)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Weight is automatically assigned based on type.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveRule(rule.id)}
                  className="h-9 w-9 self-center rounded-md border border-neutral-200/70 text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:border-neutral-800/60 dark:text-neutral-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                  aria-label="Delete rule"
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
