'use client'

import React from 'react'

export default function TradesError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error('[Trades page error]', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
          {error.message || 'An unexpected error occurred on the trades page.'}
        </p>
        {error.digest && (
          <p className="text-xs text-neutral-500 dark:text-neutral-500 mb-4 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex gap-2 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 text-sm font-medium text-white bg-neutral-700 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            Try again
          </button>
          <button
            onClick={() => {
              // Clear persisted trades-filters store to fix stale column state
              try {
                localStorage.removeItem('trades-filters')
              } catch {}
              window.location.href = '/trades'
            }}
            className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
          >
            Reset &amp; Reload
          </button>
        </div>
      </div>
    </div>
  )
}
