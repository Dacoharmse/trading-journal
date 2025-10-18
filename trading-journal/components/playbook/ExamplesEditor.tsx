'use client'

import * as React from 'react'
import { Plus, X, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { ChartPaste, type MediaItem } from '@/components/trades/ChartPaste'

export interface ExampleDraft {
  id: string
  playbook_id?: string
  media_urls: string[]
  caption?: string | null
  sort: number
}

interface ExamplesEditorProps {
  examples: ExampleDraft[]
  onAddExample: () => void
  onUpdateExample: (id: string, updates: Partial<ExampleDraft>) => void
  onRemoveExample: (id: string) => void
  userId: string
  playbookId?: string | null
}

export function ExamplesEditor({
  examples,
  onAddExample,
  onUpdateExample,
  onRemoveExample,
  userId,
  playbookId,
}: ExamplesEditorProps) {
  const sortedExamples = React.useMemo(
    () => [...examples].sort((a, b) => a.sort - b.sort),
    [examples]
  )

  const handleMediaChange = (exampleId: string, media: MediaItem[]) => {
    onUpdateExample(exampleId, { media_urls: media.map((m) => m.url) })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-neutral-200/70 bg-white/70 p-6 dark:border-neutral-800/60 dark:bg-neutral-900/60">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Example Trades
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Upload or paste screenshots from TradingView showing ideal setups for this playbook.
            </p>
          </div>
          <Button onClick={onAddExample} variant="outline" size="sm">
            <Plus className="mr-1 h-4 w-4" />
            Add Example
          </Button>
        </div>

        {sortedExamples.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 p-12 dark:border-neutral-700 dark:bg-neutral-900/50">
            <ImageIcon className="mb-3 h-12 w-12 text-neutral-400" />
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              No examples yet
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500">
              Add example trades to help visualize this playbook
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedExamples.map((example, idx) => (
              <div
                key={example.id}
                className="rounded-lg border border-neutral-200/70 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Example {idx + 1}
                    </label>
                    <Textarea
                      value={example.caption || ''}
                      onChange={(e) =>
                        onUpdateExample(example.id, {
                          caption: e.target.value || null,
                        })
                      }
                      placeholder="Optional caption describing this example..."
                      rows={2}
                      className="mt-2"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveExample(example.id)}
                    className="ml-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <ChartPaste
                  media={example.media_urls.map((url) => ({ url, kind: 'image' as const }))}
                  onChange={(media) => handleMediaChange(example.id, media)}
                  userId={userId}
                  tradeId={playbookId || undefined}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {sortedExamples.length > 0 && (
        <div className="rounded-lg border border-blue-200/70 bg-blue-50/50 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            <strong>Tip:</strong> Examples will appear in the playbook detail view and help you
            quickly recall what an ideal setup looks like before entering a trade.
          </p>
        </div>
      )}
    </div>
  )
}
