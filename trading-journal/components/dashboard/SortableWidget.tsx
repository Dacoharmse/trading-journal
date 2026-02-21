'use client'

import * as React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Eye, EyeOff } from 'lucide-react'

interface SortableWidgetProps {
  id: string
  label: string
  isEditMode: boolean
  isHidden: boolean
  onToggle: () => void
  children: React.ReactNode
}

export function SortableWidget({
  id,
  label,
  isEditMode,
  isHidden,
  onToggle,
  children,
}: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  // Hidden and not in edit mode — render nothing
  if (isHidden && !isEditMode) return null

  return (
    <div ref={setNodeRef} style={style}>
      {isEditMode && (
        <div className="flex items-center gap-2 px-3 py-1.5 mb-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-t-lg border border-b-0 border-neutral-200 dark:border-neutral-700">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 touch-none"
            aria-label="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <span className="flex-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 select-none">
            {label}
          </span>
          {/* Visibility toggle */}
          <button
            onClick={onToggle}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            aria-label={isHidden ? 'Show widget' : 'Hide widget'}
          >
            {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      )}
      <div
        className={[
          isDragging ? 'opacity-50' : '',
          isHidden ? 'opacity-30 pointer-events-none select-none' : '',
        ].join(' ')}
      >
        {children}
      </div>
    </div>
  )
}
