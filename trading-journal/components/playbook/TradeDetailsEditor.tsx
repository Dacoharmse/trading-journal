'use client'

import * as React from 'react'
import { Plus, X, GripVertical, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

export interface TradeDetailDraft {
  id: string
  playbook_id?: string
  label: string
  type: 'detail' | 'invalidation' | 'consideration' | 'checklist'
  weight: number
  primary_item: boolean
  sort: number
}

interface TradeDetailsEditorProps {
  details: TradeDetailDraft[]
  onAddDetail: (type?: TradeDetailDraft['type']) => void
  onUpdateDetail: (id: string, updates: Partial<TradeDetailDraft>) => void
  onRemoveDetail: (id: string) => void
  onReorderDetails: (fromIndex: number, toIndex: number) => void
}

export function TradeDetailsEditor({
  details,
  onAddDetail,
  onUpdateDetail,
  onRemoveDetail,
  onReorderDetails,
}: TradeDetailsEditorProps) {
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null)

  const sections = React.useMemo(() => {
    return {
      detail: details.filter((d) => d.type === 'detail').sort((a, b) => a.sort - b.sort),
      invalidation: details
        .filter((d) => d.type === 'invalidation')
        .sort((a, b) => a.sort - b.sort),
      consideration: details
        .filter((d) => d.type === 'consideration')
        .sort((a, b) => a.sort - b.sort),
      checklist: details.filter((d) => d.type === 'checklist').sort((a, b) => a.sort - b.sort),
    }
  }, [details])

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (event: React.DragEvent, index: number) => {
    event.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    onReorderDetails(draggedIndex, index)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const renderDetailRow = (detail: TradeDetailDraft, index: number) => (
    <div
      key={detail.id}
      draggable
      onDragStart={() => handleDragStart(index)}
      onDragOver={(e) => handleDragOver(e, index)}
      onDragEnd={handleDragEnd}
      className={cn(
        'flex items-center gap-2 rounded-lg border border-neutral-200/70 bg-white p-3',
        'dark:border-neutral-800/60 dark:bg-black',
        draggedIndex === index && 'opacity-50'
      )}
    >
      <GripVertical className="h-4 w-4 cursor-grab text-neutral-400" />
      <Input
        value={detail.label}
        onChange={(e) => onUpdateDetail(detail.id, { label: e.target.value })}
        placeholder={`Enter ${detail.type}...`}
        className="flex-1"
      />
      {(detail.type === 'invalidation' || detail.type === 'checklist') && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-neutral-600 dark:text-neutral-400">
            {detail.type === 'invalidation' ? 'Hard stop' : 'Primary'}
          </label>
          <Switch
            checked={detail.primary_item}
            onCheckedChange={(checked) => onUpdateDetail(detail.id, { primary_item: checked })}
          />
        </div>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemoveDetail(detail.id)}
        className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Trade Details */}
      <div className="space-y-3 rounded-xl border border-neutral-200/70 bg-white p-6 dark:border-neutral-800/60 dark:bg-black">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Trade Details
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Core setup structure: entry criteria, stop/target placement, execution specifics.
            </p>
          </div>
          <Button
            onClick={() => onAddDetail('detail')}
            variant="outline"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Detail
          </Button>
        </div>
        <div className="space-y-2">
          {sections.detail.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 italic">
              No trade details yet. Add the core 3-5 lines describing your setup.
            </p>
          ) : (
            sections.detail.map((detail, idx) => renderDetailRow(detail, idx))
          )}
        </div>
      </div>

      {/* Invalidations */}
      <div className="space-y-3 rounded-xl border border-red-200/70 bg-red-50/50 p-6 dark:border-red-900/60 dark:bg-black">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              Invalidations
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Conditions that void the setup. If present during trade entry → auto grade F.
            </p>
          </div>
          <Button
            onClick={() => onAddDetail('invalidation')}
            variant="outline"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Invalidation
          </Button>
        </div>
        <div className="space-y-2">
          {sections.invalidation.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 italic">
              No invalidations defined. Add conditions that would disqualify this setup.
            </p>
          ) : (
            sections.invalidation.map((detail, idx) => renderDetailRow(detail, idx))
          )}
        </div>
      </div>

      {/* Considerations */}
      <div className="space-y-3 rounded-xl border border-neutral-200/70 bg-white p-6 dark:border-neutral-800/60 dark:bg-black">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Other Considerations
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Trade management notes, BE rules, exit considerations (not scored).
            </p>
          </div>
          <Button
            onClick={() => onAddDetail('consideration')}
            variant="outline"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Consideration
          </Button>
        </div>
        <div className="space-y-2">
          {sections.consideration.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 italic">
              No considerations yet. Add optional management or exit guidance.
            </p>
          ) : (
            sections.consideration.map((detail, idx) => renderDetailRow(detail, idx))
          )}
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-3 rounded-xl border border-emerald-200/70 bg-emerald-50/50 p-6 dark:border-emerald-900/60 dark:bg-black">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Pre-Trade Checklist
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Yes/No items verified before entry. Scored as part of setup grade.
            </p>
          </div>
          <Button
            onClick={() => onAddDetail('checklist')}
            variant="outline"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Checklist Item
          </Button>
        </div>
        <div className="space-y-2">
          {sections.checklist.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 italic">
              No checklist items yet. Add binary yes/no checks for this setup.
            </p>
          ) : (
            sections.checklist.map((detail, idx) => renderDetailRow(detail, idx))
          )}
        </div>
      </div>
    </div>
  )
}
