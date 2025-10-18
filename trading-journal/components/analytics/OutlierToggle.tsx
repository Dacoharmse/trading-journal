'use client'

import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'

interface OutlierToggleProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
  trimmedCount?: number
  totalCount?: number
}

export function OutlierToggle({
  enabled,
  onChange,
  trimmedCount,
  totalCount,
}: OutlierToggleProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-neutral-200/70 bg-white/80 p-4 dark:border-neutral-800/60 dark:bg-neutral-900/60">
      <div className="flex items-center gap-3">
        <Switch checked={enabled} onCheckedChange={onChange} />
        <div>
          <div className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
            Trim Outliers
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            Remove top/bottom 2.5% by R multiple
          </div>
        </div>
      </div>

      {enabled && trimmedCount !== undefined && totalCount !== undefined && (
        <Badge variant="secondary" className="text-xs">
          {trimmedCount} of {totalCount} trades removed
        </Badge>
      )}
    </div>
  )
}
