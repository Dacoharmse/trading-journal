'use client'

import * as React from 'react'
import type { Backtest } from '@/lib/backtest-selectors'
import { BacktestTradeCard } from './BacktestTradeCard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search } from 'lucide-react'

interface TradesOverviewProps {
  backtests: Backtest[]
  onEdit?: (backtest: Backtest) => void
  onDelete?: (backtest: Backtest) => void
}

export function TradesOverview({ backtests, onEdit, onDelete }: TradesOverviewProps) {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [filterOutcome, setFilterOutcome] = React.useState<string>('all')
  const [filterGrade, setFilterGrade] = React.useState<string>('all')
  const [sortBy, setSortBy] = React.useState<string>('date-desc')

  // Get unique grades
  const grades = React.useMemo(() => {
    const uniqueGrades = new Set(
      backtests.filter((b) => b.setup_grade).map((b) => b.setup_grade!)
    )
    return Array.from(uniqueGrades).sort()
  }, [backtests])

  // Filter and sort
  const filteredBacktests = React.useMemo(() => {
    let filtered = [...backtests]

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (b) =>
          b.symbol.toLowerCase().includes(term) ||
          b.session?.toLowerCase().includes(term) ||
          b.notes?.toLowerCase().includes(term)
      )
    }

    // Outcome filter
    if (filterOutcome !== 'all') {
      if (filterOutcome === 'win') {
        filtered = filtered.filter((b) => b.result_r > 0)
      } else if (filterOutcome === 'loss') {
        filtered = filtered.filter((b) => b.result_r <= 0)
      } else {
        filtered = filtered.filter((b) => b.outcome === filterOutcome)
      }
    }

    // Grade filter
    if (filterGrade !== 'all') {
      filtered = filtered.filter((b) => b.setup_grade === filterGrade)
    }

    // Sort
    switch (sortBy) {
      case 'date-desc':
        filtered.sort((a, b) => b.entry_date.localeCompare(a.entry_date))
        break
      case 'date-asc':
        filtered.sort((a, b) => a.entry_date.localeCompare(b.entry_date))
        break
      case 'result-desc':
        filtered.sort((a, b) => b.result_r - a.result_r)
        break
      case 'result-asc':
        filtered.sort((a, b) => a.result_r - b.result_r)
        break
      case 'grade-desc':
        filtered.sort((a, b) => {
          const gradeOrder = { 'A+': 6, A: 5, B: 4, C: 3, D: 2, F: 1 }
          const aGrade = (gradeOrder[a.setup_grade as keyof typeof gradeOrder] || 0)
          const bGrade = (gradeOrder[b.setup_grade as keyof typeof gradeOrder] || 0)
          return bGrade - aGrade
        })
        break
    }

    return filtered
  }, [backtests, searchTerm, filterOutcome, filterGrade, sortBy])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-lg border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800/60 dark:bg-slate-900/60">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {/* Search */}
          <div>
            <Label className="text-xs">Search</Label>
            <div className="relative mt-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Symbol, session, notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Outcome filter */}
          <div>
            <Label className="text-xs">Outcome</Label>
            <Select value={filterOutcome} onValueChange={setFilterOutcome}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outcomes</SelectItem>
                <SelectItem value="win">Wins Only</SelectItem>
                <SelectItem value="loss">Losses Only</SelectItem>
                <SelectItem value="breakeven">Breakeven</SelectItem>
                <SelectItem value="closed">Closed Early</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Grade filter */}
          <div>
            <Label className="text-xs">Grade</Label>
            <Select value={filterGrade} onValueChange={setFilterGrade}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {grades.map((grade) => (
                  <SelectItem key={grade} value={grade}>
                    {grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort */}
          <div>
            <Label className="text-xs">Sort By</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Date (Newest)</SelectItem>
                <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                <SelectItem value="result-desc">Result (Best)</SelectItem>
                <SelectItem value="result-asc">Result (Worst)</SelectItem>
                <SelectItem value="grade-desc">Grade (Highest)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Showing {filteredBacktests.length} of {backtests.length} trades
        </div>
      </div>

      {/* Trades Grid */}
      {filteredBacktests.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white/80 p-12 text-center dark:border-slate-700 dark:bg-slate-900/60">
          <p className="text-slate-600 dark:text-slate-400">
            No trades match your filters
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredBacktests.map((backtest) => (
            <BacktestTradeCard
              key={backtest.id}
              backtest={backtest}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
