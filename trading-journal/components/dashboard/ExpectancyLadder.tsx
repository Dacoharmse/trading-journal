"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { InfoIcon } from "lucide-react"
import type { Trade } from "@/types/trade"
import { calculateR } from "@/lib/trade-stats"

interface ExpectancyLadderProps {
  trades: Trade[]
}

export function ExpectancyLadder({ trades }: ExpectancyLadderProps) {
  const metrics = React.useMemo(() => {
    const rTrades = trades
      .map(t => calculateR(t))
      .filter((r): r is number => r !== null)

    if (rTrades.length === 0) {
      return {
        winRate: 0,
        avgWinR: 0,
        avgLossR: 0,
        netR: 0,
        expectancyR: 0,
      }
    }

    const winningTrades = rTrades.filter(r => r > 0)
    const losingTrades = rTrades.filter(r => r < 0)

    const winRate = (winningTrades.length / rTrades.length) * 100
    const avgWinR = winningTrades.length > 0
      ? winningTrades.reduce((a, b) => a + b, 0) / winningTrades.length
      : 0
    const avgLossR = losingTrades.length > 0
      ? losingTrades.reduce((a, b) => a + b, 0) / losingTrades.length
      : 0

    // Expectancy = (Win% × AvgWinR) − ((1−Win%) × |AvgLossR|)
    const expectancyR = (winRate / 100) * avgWinR + ((1 - winRate / 100) * avgLossR)
    const netR = rTrades.reduce((a, b) => a + b, 0)

    return {
      winRate: Number(winRate.toFixed(2)),
      avgWinR: Number(avgWinR.toFixed(2)),
      avgLossR: Number(Math.abs(avgLossR).toFixed(2)),
      netR: Number(netR.toFixed(2)),
      expectancyR: Number(expectancyR.toFixed(2)),
    }
  }, [trades])

  const improvementHint = React.useMemo(() => {
    const { winRate, avgWinR, avgLossR, expectancyR } = metrics

    if (expectancyR <= 0) {
      return "No positive edge detected. Consider reviewing your strategy."
    }

    // Calculate impact of improving each lever by 10%
    const improveWinRate = ((winRate + 10) / 100) * avgWinR - ((1 - (winRate + 10) / 100) * avgLossR)
    const improveAvgWin = (winRate / 100) * (avgWinR * 1.1) - ((1 - winRate / 100) * avgLossR)
    const improveAvgLoss = (winRate / 100) * avgWinR - ((1 - winRate / 100) * (avgLossR * 0.9))

    const impacts = [
      { lever: "Win Rate", impact: improveWinRate - expectancyR },
      { lever: "Avg Win", impact: improveAvgWin - expectancyR },
      { lever: "Avg Loss", impact: improveAvgLoss - expectancyR },
    ]

    const bestLever = impacts.reduce((a, b) => a.impact > b.impact ? a : b)
    return `Focus on improving ${bestLever.lever} (+${bestLever.impact.toFixed(2)}R potential)`
  }, [metrics])

  return (
    <Card className="bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-800/80 dark:to-slate-900/60 backdrop-blur-sm border-slate-200 dark:border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Expectancy Breakdown</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="text-xs">
                  <strong>Expectancy (R)</strong> = Your average profit per trade in risk units.
                  <br /><br />
                  Formula: (Win% × AvgWinR) − ((1−Win%) × |AvgLossR|)
                  <br /><br />
                  Positive = edge exists. Focus on the lever with highest improvement potential.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Formula breakdown */}
        <div className="text-xs font-mono text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Win% × AvgWinR</span>
            <span className="text-green-600 dark:text-green-400">
              {metrics.winRate.toFixed(1)}% × {metrics.avgWinR.toFixed(2)}R
            </span>
          </div>
          <div className="flex justify-between">
            <span>Loss% × AvgLossR</span>
            <span className="text-red-600 dark:text-red-400">
              {(100 - metrics.winRate).toFixed(1)}% × {metrics.avgLossR.toFixed(2)}R
            </span>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent" />
          <div className="flex justify-between font-semibold text-sm">
            <span>Expectancy</span>
            <span className={metrics.expectancyR > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
              {metrics.expectancyR > 0 ? "+" : ""}{metrics.expectancyR.toFixed(2)}R
            </span>
          </div>
        </div>

        {/* Net R */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Net R (Total)</span>
            <span className={`font-semibold ${metrics.netR > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {metrics.netR > 0 ? "+" : ""}{metrics.netR.toFixed(2)}R
            </span>
          </div>
        </div>

        {/* Improvement hint */}
        <div className="pt-2 text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/20 p-2 rounded border border-amber-200 dark:border-amber-900">
          💡 {improvementHint}
        </div>
      </CardContent>
    </Card>
  )
}
