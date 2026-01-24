'use client'

import * as React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ChevronDown, ChevronUp, X, Filter, Calendar } from 'lucide-react'
import type { Trade } from '@/types/supabase'

export interface AnalyticsFilters {
  dateFrom: string
  dateTo: string
  symbols: string[]
  direction: 'all' | 'long' | 'short'
  session: string[]
  sessionHour: string[]
  minR: number | null
  maxR: number | null
  outcome: 'all' | 'win' | 'loss'
  setupGrade: string[]
  dayOfWeek: string[]
  emotionalState: string[]
  strategy: string[]
}

interface AdvancedFiltersProps {
  filters: AnalyticsFilters
  onFiltersChange: (filters: AnalyticsFilters) => void
  allTrades: Trade[]
}

export function AdvancedFilters({ filters, onFiltersChange, allTrades }: AdvancedFiltersProps) {
  const [expanded, setExpanded] = React.useState(true)

  // Extract unique values
  const uniqueSymbols = React.useMemo(() => {
    return Array.from(new Set(allTrades.map(t => t.symbol))).sort()
  }, [allTrades])

  const uniqueStrategies = React.useMemo(() => {
    return Array.from(new Set(allTrades.map(t => t.strategy).filter(Boolean) as string[])).sort()
  }, [allTrades])

  const updateFilter = <K extends keyof AnalyticsFilters>(key: K, value: AnalyticsFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const toggleArrayFilter = <K extends keyof AnalyticsFilters>(key: K, value: string) => {
    const currentArray = filters[key] as string[]
    const newArray = currentArray.includes(value)
      ? currentArray.filter(v => v !== value)
      : [...currentArray, value]
    updateFilter(key, newArray as AnalyticsFilters[K])
  }

  const resetFilters = () => {
    onFiltersChange({
      dateFrom: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dateTo: new Date().toISOString().split('T')[0],
      symbols: [],
      direction: 'all',
      session: [],
      sessionHour: [],
      minR: null,
      maxR: null,
      outcome: 'all',
      setupGrade: [],
      dayOfWeek: [],
      emotionalState: [],
      strategy: [],
    })
  }

  const activeFilterCount = React.useMemo(() => {
    let count = 0
    if (filters.symbols.length > 0) count++
    if (filters.direction !== 'all') count++
    if (filters.session.length > 0) count++
    if (filters.sessionHour.length > 0) count++
    if (filters.minR !== null) count++
    if (filters.maxR !== null) count++
    if (filters.outcome !== 'all') count++
    if (filters.setupGrade.length > 0) count++
    if (filters.dayOfWeek.length > 0) count++
    if (filters.emotionalState.length > 0) count++
    if (filters.strategy.length > 0) count++
    return count
  }, [filters])

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const emotionalStates = ['Confident', 'Anxious', 'Calm', 'Excited', 'Frustrated', 'Neutral']

  return (
    <Card className="border-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm shadow-lg">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Advanced Filters
            </h3>
            {activeFilterCount > 0 && (
              <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-600 text-white rounded-full">
                {activeFilterCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => updateFilter('dateFrom', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])}
              variant="ghost"
              size="sm"
              className="text-xs"
            >
              <Calendar className="w-3 h-3 mr-1" />
              30D
            </Button>
            <Button
              onClick={() => updateFilter('dateFrom', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])}
              variant="ghost"
              size="sm"
              className="text-xs"
            >
              90D
            </Button>
            {activeFilterCount > 0 && (
              <Button
                onClick={resetFilters}
                variant="ghost"
                size="sm"
                className="text-xs text-red-600 hover:text-red-700"
              >
                <X className="w-3 h-3 mr-1" />
                Reset
              </Button>
            )}
            <Button
              onClick={() => setExpanded(!expanded)}
              variant="ghost"
              size="sm"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="space-y-4">
            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1.5 block text-neutral-700 dark:text-neutral-300">
                  From Date
                </Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => updateFilter('dateFrom', e.target.value)}
                  className="text-sm h-9"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block text-neutral-700 dark:text-neutral-300">
                  To Date
                </Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => updateFilter('dateTo', e.target.value)}
                  className="text-sm h-9"
                />
              </div>
            </div>

            {/* Quick Filters Row */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1.5 block text-neutral-700 dark:text-neutral-300">
                  Direction
                </Label>
                <div className="flex gap-1.5">
                  {['all', 'long', 'short'].map(dir => (
                    <button
                      key={dir}
                      onClick={() => updateFilter('direction', dir as any)}
                      className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                        filters.direction === dir
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {dir === 'all' ? 'All' : dir === 'long' ? '▲ Long' : '▼ Short'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1.5 block text-neutral-700 dark:text-neutral-300">
                  Outcome
                </Label>
                <div className="flex gap-1.5">
                  {['all', 'win', 'loss'].map(out => (
                    <button
                      key={out}
                      onClick={() => updateFilter('outcome', out as any)}
                      className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                        filters.outcome === out
                          ? out === 'win' ? 'bg-green-600 text-white' : out === 'loss' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                          : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {out.charAt(0).toUpperCase() + out.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1.5 block text-neutral-700 dark:text-neutral-300">
                  R Range
                </Label>
                <div className="flex gap-1.5">
                  <Input
                    type="number"
                    step="0.5"
                    value={filters.minR ?? ''}
                    onChange={(e) => updateFilter('minR', e.target.value ? Number(e.target.value) : null)}
                    placeholder="Min"
                    className="text-xs h-9"
                  />
                  <Input
                    type="number"
                    step="0.5"
                    value={filters.maxR ?? ''}
                    onChange={(e) => updateFilter('maxR', e.target.value ? Number(e.target.value) : null)}
                    placeholder="Max"
                    className="text-xs h-9"
                  />
                </div>
              </div>
            </div>

            {/* Symbols */}
            {uniqueSymbols.length > 0 && (
              <div>
                <Label className="text-xs font-semibold mb-1.5 block text-neutral-700 dark:text-neutral-300">
                  Symbols ({filters.symbols.length} selected)
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {uniqueSymbols.map(symbol => (
                    <button
                      key={symbol}
                      onClick={() => toggleArrayFilter('symbols', symbol)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all ${
                        filters.symbols.includes(symbol)
                          ? 'bg-blue-600 text-white shadow-sm scale-105'
                          : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {symbol}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sessions */}
            <div>
              <Label className="text-xs font-semibold mb-1.5 block text-neutral-700 dark:text-neutral-300">
                Trading Sessions
              </Label>
              <div className="flex gap-2">
                {['Asia', 'London', 'NY'].map(sess => (
                  <button
                    key={sess}
                    onClick={() => toggleArrayFilter('session', sess)}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                      filters.session.includes(sess)
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {sess}
                  </button>
                ))}
              </div>
            </div>

            {/* Session Hours */}
            <div>
              <Label className="text-xs font-semibold mb-1.5 block text-neutral-700 dark:text-neutral-300">
                Session Hours
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Asia</div>
                  <div className="flex gap-1">
                    {['A1', 'A2', 'A3', 'A4'].map(hour => (
                      <button
                        key={hour}
                        onClick={() => toggleArrayFilter('sessionHour', hour)}
                        className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-all ${
                          filters.sessionHour.includes(hour)
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                        }`}
                      >
                        {hour}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">London</div>
                  <div className="flex gap-1">
                    {['L1', 'L2', 'L3'].map(hour => (
                      <button
                        key={hour}
                        onClick={() => toggleArrayFilter('sessionHour', hour)}
                        className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-all ${
                          filters.sessionHour.includes(hour)
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                        }`}
                      >
                        {hour}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">New York</div>
                  <div className="flex gap-1">
                    {['NY1', 'NY2', 'NY3'].map(hour => (
                      <button
                        key={hour}
                        onClick={() => toggleArrayFilter('sessionHour', hour)}
                        className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-all ${
                          filters.sessionHour.includes(hour)
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                        }`}
                      >
                        {hour}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Day of Week */}
            <div>
              <Label className="text-xs font-semibold mb-1.5 block text-neutral-700 dark:text-neutral-300">
                Day of Week
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {daysOfWeek.map(day => (
                  <button
                    key={day}
                    onClick={() => toggleArrayFilter('dayOfWeek', day)}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                      filters.dayOfWeek.includes(day)
                        ? 'bg-green-600 text-white shadow-sm'
                        : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {day.substring(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            {/* Setup Grade */}
            <div>
              <Label className="text-xs font-semibold mb-1.5 block text-neutral-700 dark:text-neutral-300">
                Setup Quality Grade
              </Label>
              <div className="flex gap-1.5">
                {['A+', 'A', 'B', 'C', 'D', 'F'].map(grade => (
                  <button
                    key={grade}
                    onClick={() => toggleArrayFilter('setupGrade', grade)}
                    className={`flex-1 px-2 py-1.5 text-xs font-bold rounded transition-all ${
                      filters.setupGrade.includes(grade)
                        ? grade.startsWith('A') ? 'bg-green-600 text-white' : grade === 'B' ? 'bg-blue-600 text-white' : grade === 'C' ? 'bg-yellow-600 text-white' : 'bg-red-600 text-white'
                        : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {grade}
                  </button>
                ))}
              </div>
            </div>

            {/* Emotional State */}
            <div>
              <Label className="text-xs font-semibold mb-1.5 block text-neutral-700 dark:text-neutral-300">
                Emotional State
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {emotionalStates.map(state => (
                  <button
                    key={state}
                    onClick={() => toggleArrayFilter('emotionalState', state)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all ${
                      filters.emotionalState.includes(state)
                        ? 'bg-orange-600 text-white shadow-sm'
                        : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {state}
                  </button>
                ))}
              </div>
            </div>

            {/* Strategy */}
            {uniqueStrategies.length > 0 && (
              <div>
                <Label className="text-xs font-semibold mb-1.5 block text-neutral-700 dark:text-neutral-300">
                  Strategy
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {uniqueStrategies.map(strat => (
                    <button
                      key={strat}
                      onClick={() => toggleArrayFilter('strategy', strat)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                        filters.strategy.includes(strat)
                          ? 'bg-teal-600 text-white shadow-sm'
                          : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {strat}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
