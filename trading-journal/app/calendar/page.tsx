"use client"

import * as React from "react"
import { useShallow } from "zustand/react/shallow"
import { useTradeStore, useAccountStore } from "@/stores"
import { useDashboardFilters } from "@/stores/dashboard-filters"
import { CalendarGrid, DailyDrawer, StreakCounter } from "@/components/calendar"
import { WeeklySummary } from "@/components/calendar/WeeklySummary"
import { CalendarStatistics } from "@/components/calendar/CalendarStatistics"
import { groupTradesByDay, calculateStreaks, type DailyStats } from "@/lib/calendar-utils"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Share2 } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export default function CalendarPage() {
  const [currentYear, setCurrentYear] = React.useState(() => new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = React.useState(() => new Date().getMonth())
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null)
  const [selectedStats, setSelectedStats] = React.useState<DailyStats | undefined>(undefined)
  const [drawerOpen, setDrawerOpen] = React.useState(false)

  const trades = useTradeStore((state) => state.trades)
  const fetchTrades = useTradeStore((state) => state.fetchTrades)
  const accounts = useAccountStore((state) => state.accounts)
  const fetchAccounts = useAccountStore((state) => state.fetchAccounts)

  const filters = useDashboardFilters(useShallow((state) => state.filters))
  const { toast } = useToast()

  // Fetch data on mount
  React.useEffect(() => {
    void fetchTrades()
    void fetchAccounts()
  }, [fetchTrades, fetchAccounts])

  // Get display currency
  const displayCurrency = React.useMemo(() => {
    if (filters.units === 'r') return 'R'

    if (filters.accountId !== 'all') {
      const account = accounts.find(a => a.id === filters.accountId)
      return account?.currency || 'USD'
    }

    return filters.baseCurrency
  }, [filters.accountId, filters.units, filters.baseCurrency, accounts])

  // Filter trades by account
  const filteredTrades = React.useMemo(() => {
    if (filters.accountId === 'all') return trades
    return trades.filter(t => t.account_id === filters.accountId)
  }, [trades, filters.accountId])

  // Group trades by day
  const dailyStats = React.useMemo(() => {
    return groupTradesByDay(filteredTrades, filters.units)
  }, [filteredTrades, filters.units])

  // Calculate streaks
  const streaks = React.useMemo(() => {
    return calculateStreaks(dailyStats)
  }, [dailyStats])

  // Find best day
  const bestDay = React.useMemo(() => {
    let best: { date: string; value: number } | null = null

    dailyStats.forEach((stats, date) => {
      const value = filters.units === 'r' ? stats.totalR : stats.totalPnL
      if (!best || value > best.value) {
        best = { date, value }
      }
    })

    return best?.date
  }, [dailyStats, filters.units])

  const handleDateClick = (date: Date, stats: DailyStats | undefined) => {
    if (stats && stats.trades > 0) {
      setSelectedDate(date)
      setSelectedStats(stats)
      setDrawerOpen(true)
    }
  }

  const handleMonthChange = (year: number, month: number) => {
    setCurrentYear(year)
    setCurrentMonth(month)
  }

  const handleShare = async () => {
    const monthName = new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    const shareText = `My Trading Calendar - ${monthName}\n\nCheck out my trading performance!`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Trading Calendar - ${monthName}`,
          text: shareText,
        })
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          toast({
            title: "Share failed",
            description: "Could not share calendar",
            variant: "destructive",
          })
        }
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareText)
        toast({
          title: "Copied to clipboard",
          description: "Calendar info copied to clipboard",
        })
      } catch (err) {
        toast({
          title: "Share not supported",
          description: "Sharing is not supported on this device",
          variant: "destructive",
        })
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <h1 className="text-3xl font-bold text-foreground">Trading Calendar</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Daily performance overview and streak tracking
            </p>
          </div>

          {/* Units Toggle and Share */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Display:</span>
              <div className="flex gap-1 bg-white/60 dark:bg-neutral-800/60 rounded-lg p-1 shadow-sm">
                <button
                  onClick={() => useDashboardFilters.getState().setUnits('currency')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    filters.units === 'currency'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'hover:bg-muted text-muted-foreground'
                  }`}
                >
                  Currency
                </button>
                <button
                  onClick={() => useDashboardFilters.getState().setUnits('r')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    filters.units === 'r'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'hover:bg-muted text-muted-foreground'
                  }`}
                >
                  R
                </button>
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        {/* Streak Counters */}
        <StreakCounter
          currentStreak={streaks.currentStreak}
          currentStreakType={streaks.currentStreakType}
          bestWinStreak={streaks.bestWinStreak}
          bestWinStreakDates={streaks.bestWinStreakDates}
          worstLossStreak={streaks.worstLossStreak}
          worstLossStreakDates={streaks.worstLossStreakDates}
        />

        {/* Calendar Grid with Weekly Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          {/* Calendar */}
          <div className="bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm rounded-lg border border-neutral-200 dark:border-neutral-700 p-6 shadow-lg">
            <CalendarGrid
              year={currentYear}
              month={currentMonth}
              dailyStats={dailyStats}
              displayUnit={filters.units}
              currency={displayCurrency}
              bestDay={bestDay}
              onDateClick={handleDateClick}
              onMonthChange={handleMonthChange}
            />
          </div>

          {/* Weekly Summary */}
          <div className="lg:block">
            <WeeklySummary
              year={currentYear}
              month={currentMonth}
              dailyStats={dailyStats}
              displayUnit={filters.units}
              currency={displayCurrency}
            />
          </div>
        </div>

        {/* Statistics Cards */}
        <CalendarStatistics
          dailyStats={dailyStats}
          displayUnit={filters.units}
          currency={displayCurrency}
        />

        {/* Daily Drawer */}
        <DailyDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          date={selectedDate}
          stats={selectedStats}
          currency={displayCurrency}
        />
      </div>
    </div>
  )
}
