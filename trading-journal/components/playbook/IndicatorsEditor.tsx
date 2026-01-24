'use client'

import * as React from 'react'
import { Plus, X, GripVertical, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

export interface IndicatorDraft {
  id: string
  playbook_id?: string
  name: string
  url: string
  description: string | null
  sort: number
}

interface IndicatorsEditorProps {
  indicators: IndicatorDraft[]
  onAddIndicator: () => void
  onUpdateIndicator: (id: string, updates: Partial<IndicatorDraft>) => void
  onRemoveIndicator: (id: string) => void
  onReorderIndicators: (fromIndex: number, toIndex: number) => void
  readOnly?: boolean
}

export function IndicatorsEditor({
  indicators,
  onAddIndicator,
  onUpdateIndicator,
  onRemoveIndicator,
  onReorderIndicators,
  readOnly = false,
}: IndicatorsEditorProps) {
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null)

  const sortedIndicators = React.useMemo(() => {
    return [...indicators].sort((a, b) => a.sort - b.sort)
  }, [indicators])

  const handleDragStart = (index: number) => {
    if (readOnly) return
    setDraggedIndex(index)
  }

  const handleDragOver = (event: React.DragEvent, index: number) => {
    event.preventDefault()
    if (readOnly || draggedIndex === null || draggedIndex === index) return
    onReorderIndicators(draggedIndex, index)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  return (
    <div className="space-y-6">
      <div className={cn(
        "rounded-xl border border-neutral-200/70 bg-white p-6 dark:border-neutral-800/60 dark:bg-black",
        readOnly && "pointer-events-none opacity-90"
      )}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              TradingView Indicators
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Recommended indicators for this strategy. Add links to TradingView scripts.
            </p>
          </div>
          {!readOnly && (
            <Button onClick={onAddIndicator} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Indicator
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {sortedIndicators.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 italic text-center py-8">
              No indicators added yet. Add TradingView indicator links to help you execute this playbook.
            </p>
          ) : (
            sortedIndicators.map((indicator, index) => (
              <div
                key={indicator.id}
                draggable={!readOnly}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  'rounded-lg border border-neutral-200/70 bg-neutral-50/50 p-4 dark:border-neutral-800/60 dark:bg-neutral-900/30',
                  draggedIndex === index && 'opacity-50',
                  !readOnly && 'transition-shadow hover:shadow-md'
                )}
              >
                <div className="flex items-start gap-3">
                  {!readOnly && (
                    <GripVertical className="h-5 w-5 cursor-grab text-neutral-400 mt-1 flex-shrink-0" />
                  )}

                  <div className="flex-1 space-y-3">
                    {/* Name */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                        Indicator Name
                      </label>
                      <Input
                        value={indicator.name}
                        onChange={(e) => onUpdateIndicator(indicator.id, { name: e.target.value })}
                        placeholder="e.g. Smart Money Concepts, Volume Profile"
                        className="bg-white dark:bg-black"
                        disabled={readOnly}
                      />
                    </div>

                    {/* URL */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                        TradingView URL
                      </label>
                      <div className="flex gap-2">
                        <Input
                          value={indicator.url}
                          onChange={(e) => onUpdateIndicator(indicator.id, { url: e.target.value })}
                          placeholder="https://www.tradingview.com/script/..."
                          className="bg-white dark:bg-black flex-1"
                          disabled={readOnly}
                        />
                        {indicator.url && (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="flex-shrink-0"
                          >
                            <a
                              href={indicator.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                        Description (optional)
                      </label>
                      <Textarea
                        value={indicator.description || ''}
                        onChange={(e) => onUpdateIndicator(indicator.id, { description: e.target.value || null })}
                        placeholder="How do you use this indicator in this strategy?"
                        rows={2}
                        className="bg-white dark:bg-black"
                        disabled={readOnly}
                      />
                    </div>
                  </div>

                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveIndicator(indicator.id)}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950 flex-shrink-0 mt-1"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
