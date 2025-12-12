"use client"

import * as React from "react"
import { useRouter, useParams } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Target,
  Brain,
  Lightbulb,
  AlertTriangle,
  Trophy,
  Save,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { WeeklyReview, WinningTradeAnalysis, LosingTradeAnalysis, Trade } from "@/types/supabase"
import { format, parseISO } from "date-fns"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

const STEPS = [
  { id: 1, title: "Overview", icon: Target },
  { id: 2, title: "Winning Trades", icon: TrendingUp },
  { id: 3, title: "Losing Trades", icon: TrendingDown },
  { id: 4, title: "Missed Trades", icon: AlertTriangle },
  { id: 5, title: "Performance", icon: Brain },
  { id: 6, title: "Patterns", icon: Lightbulb },
  { id: 7, title: "Summary", icon: Trophy },
]

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value)
}

export default function WeeklyReviewWizardPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const reviewId = params.id as string

  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [currentStep, setCurrentStep] = React.useState(1)
  const [review, setReview] = React.useState<WeeklyReview | null>(null)
  const [weekTrades, setWeekTrades] = React.useState<Trade[]>([])

  // Form state
  const [winningAnalysis, setWinningAnalysis] = React.useState<WinningTradeAnalysis[]>([])
  const [losingAnalysis, setLosingAnalysis] = React.useState<LosingTradeAnalysis[]>([])
  const [missedTradeDescription, setMissedTradeDescription] = React.useState("")
  const [missedTradeReason, setMissedTradeReason] = React.useState("")
  const [missedTradePrevention, setMissedTradePrevention] = React.useState("")
  const [weekVsLastWeek, setWeekVsLastWeek] = React.useState("")
  const [processRating, setProcessRating] = React.useState(5)
  const [processNotes, setProcessNotes] = React.useState("")
  const [mindsetImpact, setMindsetImpact] = React.useState("")
  const [improvementActions, setImprovementActions] = React.useState("")
  const [strengthIdentified, setStrengthIdentified] = React.useState("")
  const [strengthCause, setStrengthCause] = React.useState("")
  const [strengthImportance, setStrengthImportance] = React.useState("")
  const [strengthActions, setStrengthActions] = React.useState("")
  const [mistakeIdentified, setMistakeIdentified] = React.useState("")
  const [mistakeCause, setMistakeCause] = React.useState("")
  const [mistakeImportance, setMistakeImportance] = React.useState("")
  const [mistakeActions, setMistakeActions] = React.useState("")
  const [goalsNextWeek, setGoalsNextWeek] = React.useState("")
  const [keyTakeaways, setKeyTakeaways] = React.useState("")

  React.useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      // Fetch review
      const { data: reviewData, error: reviewError } = await supabase
        .from("weekly_reviews")
        .select("*")
        .eq("id", reviewId)
        .single()

      if (reviewError || !reviewData) {
        router.push("/review")
        return
      }

      setReview(reviewData)

      // Load existing data into form
      if (reviewData.winning_trades_analysis) {
        setWinningAnalysis(reviewData.winning_trades_analysis)
      }
      if (reviewData.losing_trades_analysis) {
        setLosingAnalysis(reviewData.losing_trades_analysis)
      }
      setMissedTradeDescription(reviewData.missed_trade_description || "")
      setMissedTradeReason(reviewData.missed_trade_reason || "")
      setMissedTradePrevention(reviewData.missed_trade_prevention || "")
      setWeekVsLastWeek(reviewData.week_vs_last_week || "")
      setProcessRating(reviewData.process_execution_rating || 5)
      setProcessNotes(reviewData.process_execution_notes || "")
      setMindsetImpact(reviewData.previous_week_mindset_impact || "")
      setImprovementActions(reviewData.improvement_actions || "")
      setStrengthIdentified(reviewData.strength_identified || "")
      setStrengthCause(reviewData.strength_cause || "")
      setStrengthImportance(reviewData.strength_importance || "")
      setStrengthActions(reviewData.strength_action_steps || "")
      setMistakeIdentified(reviewData.mistake_identified || "")
      setMistakeCause(reviewData.mistake_cause || "")
      setMistakeImportance(reviewData.mistake_importance || "")
      setMistakeActions(reviewData.mistake_action_steps || "")
      setGoalsNextWeek(reviewData.goals_for_next_week || "")
      setKeyTakeaways(reviewData.key_takeaways || "")

      // Fetch trades for the week
      const { data: trades } = await supabase
        .from("trades")
        .select("*")
        .gte("entry_date", reviewData.week_start)
        .lte("entry_date", reviewData.week_end)
        .order("entry_date", { ascending: true })

      if (trades) {
        setWeekTrades(trades)

        // Initialize analysis arrays if empty
        const winners = trades.filter((t) => (t.pnl || 0) > 0)
        const losers = trades.filter((t) => (t.pnl || 0) < 0)

        if (winningAnalysis.length === 0 && winners.length > 0) {
          setWinningAnalysis(
            winners.map((t) => ({
              trade_id: t.id,
              symbol: t.symbol,
              pnl: t.pnl || 0,
              would_take_again: true,
            }))
          )
        }

        if (losingAnalysis.length === 0 && losers.length > 0) {
          setLosingAnalysis(
            losers.map((t) => ({
              trade_id: t.id,
              symbol: t.symbol,
              pnl: t.pnl || 0,
              would_take_again: true,
            }))
          )
        }

        // Update review with stats
        const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0)
        const winRate = trades.length > 0 ? (winners.length / trades.length) * 100 : 0
        const bestTrade = winners.length > 0 ? winners.reduce((a, b) => ((a.pnl || 0) > (b.pnl || 0) ? a : b)) : null
        const worstTrade = losers.length > 0 ? losers.reduce((a, b) => ((a.pnl || 0) < (b.pnl || 0) ? a : b)) : null

        await supabase
          .from("weekly_reviews")
          .update({
            total_trades: trades.length,
            winning_trades: winners.length,
            losing_trades: losers.length,
            total_pnl: totalPnl,
            win_rate: winRate,
            best_trade_id: bestTrade?.id || null,
            worst_trade_id: worstTrade?.id || null,
          })
          .eq("id", reviewId)

        setReview((prev) =>
          prev
            ? {
                ...prev,
                total_trades: trades.length,
                winning_trades: winners.length,
                losing_trades: losers.length,
                total_pnl: totalPnl,
                win_rate: winRate,
              }
            : null
        )
      }

      setLoading(false)
    }

    fetchData()
  }, [reviewId, router])

  const saveProgress = async (complete = false) => {
    setSaving(true)
    const supabase = createClient()

    const updateData: Partial<WeeklyReview> = {
      winning_trades_analysis: winningAnalysis,
      losing_trades_analysis: losingAnalysis,
      missed_trade_description: missedTradeDescription || null,
      missed_trade_reason: missedTradeReason || null,
      missed_trade_prevention: missedTradePrevention || null,
      week_vs_last_week: weekVsLastWeek || null,
      process_execution_rating: processRating,
      process_execution_notes: processNotes || null,
      previous_week_mindset_impact: mindsetImpact || null,
      improvement_actions: improvementActions || null,
      strength_identified: strengthIdentified || null,
      strength_cause: strengthCause || null,
      strength_importance: strengthImportance || null,
      strength_action_steps: strengthActions || null,
      mistake_identified: mistakeIdentified || null,
      mistake_cause: mistakeCause || null,
      mistake_importance: mistakeImportance || null,
      mistake_action_steps: mistakeActions || null,
      goals_for_next_week: goalsNextWeek || null,
      key_takeaways: keyTakeaways || null,
      status: complete ? "completed" : "in_progress",
    }

    if (complete) {
      (updateData as any).completed_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from("weekly_reviews")
      .update(updateData)
      .eq("id", reviewId)

    setSaving(false)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save review",
        variant: "destructive",
      })
    } else {
      toast({
        title: complete ? "Review Completed!" : "Progress Saved",
        description: complete
          ? "Your weekly review has been completed."
          : "Your progress has been saved.",
      })

      if (complete) {
        router.push("/review")
      }
    }
  }

  const updateWinningAnalysis = (tradeId: string, field: keyof WinningTradeAnalysis, value: any) => {
    setWinningAnalysis((prev) =>
      prev.map((a) => (a.trade_id === tradeId ? { ...a, [field]: value } : a))
    )
  }

  const updateLosingAnalysis = (tradeId: string, field: keyof LosingTradeAnalysis, value: any) => {
    setLosingAnalysis((prev) =>
      prev.map((a) => (a.trade_id === tradeId ? { ...a, [field]: value } : a))
    )
  }

  const winningTrades = weekTrades.filter((t) => (t.pnl || 0) > 0)
  const losingTrades = weekTrades.filter((t) => (t.pnl || 0) < 0)
  const progress = (currentStep / STEPS.length) * 100

  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <p className="text-muted-foreground">Loading review...</p>
      </div>
    )
  }

  if (!review) {
    return null
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/review")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Weekly Review</h1>
            <p className="text-muted-foreground">
              {format(parseISO(review.week_start), "MMM d")} -{" "}
              {format(parseISO(review.week_end), "MMM d, yyyy")}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => saveProgress(false)} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Progress"}
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Step {currentStep} of {STEPS.length}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {STEPS.map((step) => {
          const Icon = step.icon
          return (
            <Button
              key={step.id}
              variant={currentStep === step.id ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentStep(step.id)}
              className={cn(
                "flex-shrink-0",
                currentStep === step.id && "ring-2 ring-primary ring-offset-2"
              )}
            >
              <Icon className="mr-2 h-4 w-4" />
              {step.title}
            </Button>
          )
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {/* Step 1: Overview */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">Week Overview</h2>
                <p className="text-muted-foreground">
                  Review your trading performance for this week
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold">{review.total_trades}</p>
                    <p className="text-sm text-muted-foreground">Total Trades</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-green-500">{review.winning_trades}</p>
                    <p className="text-sm text-muted-foreground">Winners</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-red-500">{review.losing_trades}</p>
                    <p className="text-sm text-muted-foreground">Losers</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p
                      className={cn(
                        "text-3xl font-bold",
                        review.total_pnl >= 0 ? "text-green-500" : "text-red-500"
                      )}
                    >
                      {formatCurrency(review.total_pnl)}
                    </p>
                    <p className="text-sm text-muted-foreground">Total P&L</p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-center">
                <div className="text-center p-6 bg-muted rounded-lg">
                  <p className="text-5xl font-bold">{review.win_rate?.toFixed(0) || 0}%</p>
                  <p className="text-muted-foreground">Win Rate</p>
                </div>
              </div>

              {weekTrades.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No trades found for this week.</p>
                  <p className="text-sm">You can still complete the review with reflections.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Winning Trades */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold flex items-center justify-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Winning Trades Analysis
                </h2>
                <p className="text-muted-foreground">
                  Analyze each winning trade to understand what worked
                </p>
              </div>

              {winningTrades.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No winning trades this week.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {winningAnalysis.map((analysis, index) => {
                    const trade = weekTrades.find((t) => t.id === analysis.trade_id)
                    return (
                      <Card key={analysis.trade_id} className="border-green-200 dark:border-green-800">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">
                              {trade?.symbol} - {formatCurrency(analysis.pnl)}
                            </CardTitle>
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                              Winner
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-3">
                            <Label className="font-medium">
                              Would you take this trade again without knowing the outcome was a win?
                            </Label>
                            <RadioGroup
                              value={analysis.would_take_again ? "yes" : "no"}
                              onValueChange={(v) =>
                                updateWinningAnalysis(analysis.trade_id, "would_take_again", v === "yes")
                              }
                              className="flex gap-4"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yes" id={`win-yes-${index}`} />
                                <Label htmlFor={`win-yes-${index}`}>Yes</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id={`win-no-${index}`} />
                                <Label htmlFor={`win-no-${index}`}>No</Label>
                              </div>
                            </RadioGroup>
                          </div>

                          {analysis.would_take_again ? (
                            <>
                              <div className="space-y-2">
                                <Label>What would you improve with your execution?</Label>
                                <Textarea
                                  value={analysis.execution_improvement || ""}
                                  onChange={(e) =>
                                    updateWinningAnalysis(analysis.trade_id, "execution_improvement", e.target.value)
                                  }
                                  placeholder="Entry timing, position size, etc."
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>How could you have managed this trade to increase profit?</Label>
                                <Textarea
                                  value={analysis.profit_management || ""}
                                  onChange={(e) =>
                                    updateWinningAnalysis(analysis.trade_id, "profit_management", e.target.value)
                                  }
                                  placeholder="Trailing stop, scaling out, etc."
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>What can you do to repeat this type of trade?</Label>
                                <Textarea
                                  value={analysis.repeat_strategy || ""}
                                  onChange={(e) =>
                                    updateWinningAnalysis(analysis.trade_id, "repeat_strategy", e.target.value)
                                  }
                                  placeholder="Pattern recognition, setup criteria, etc."
                                />
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="space-y-2">
                                <Label>Where did you deviate from your plan and why?</Label>
                                <Textarea
                                  value={analysis.plan_deviation || ""}
                                  onChange={(e) =>
                                    updateWinningAnalysis(analysis.trade_id, "plan_deviation", e.target.value)
                                  }
                                  placeholder="Describe the deviation..."
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>How could this flawed win have been avoided?</Label>
                                <Textarea
                                  value={analysis.flawed_win_prevention || ""}
                                  onChange={(e) =>
                                    updateWinningAnalysis(analysis.trade_id, "flawed_win_prevention", e.target.value)
                                  }
                                  placeholder="Prevention strategies..."
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>What specifically was done incorrectly despite the outcome?</Label>
                                <Textarea
                                  value={analysis.incorrect_execution || ""}
                                  onChange={(e) =>
                                    updateWinningAnalysis(analysis.trade_id, "incorrect_execution", e.target.value)
                                  }
                                  placeholder="Incorrect actions..."
                                />
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Losing Trades */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold flex items-center justify-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                  Losing Trades Analysis
                </h2>
                <p className="text-muted-foreground">
                  Analyze each losing trade to understand what went wrong
                </p>
              </div>

              {losingTrades.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No losing trades this week. Great job!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {losingAnalysis.map((analysis, index) => {
                    const trade = weekTrades.find((t) => t.id === analysis.trade_id)
                    return (
                      <Card key={analysis.trade_id} className="border-red-200 dark:border-red-800">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">
                              {trade?.symbol} - {formatCurrency(analysis.pnl)}
                            </CardTitle>
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
                              Loser
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-3">
                            <Label className="font-medium">
                              Would you take this trade again without knowing the outcome was a loss?
                            </Label>
                            <RadioGroup
                              value={analysis.would_take_again ? "yes" : "no"}
                              onValueChange={(v) =>
                                updateLosingAnalysis(analysis.trade_id, "would_take_again", v === "yes")
                              }
                              className="flex gap-4"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yes" id={`lose-yes-${index}`} />
                                <Label htmlFor={`lose-yes-${index}`}>Yes</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id={`lose-no-${index}`} />
                                <Label htmlFor={`lose-no-${index}`}>No</Label>
                              </div>
                            </RadioGroup>
                          </div>

                          {analysis.would_take_again ? (
                            <>
                              <div className="space-y-2">
                                <Label>Was there any logical way to avoid this loss?</Label>
                                <Textarea
                                  value={analysis.loss_avoidance || ""}
                                  onChange={(e) =>
                                    updateLosingAnalysis(analysis.trade_id, "loss_avoidance", e.target.value)
                                  }
                                  placeholder="Could anything have been done differently?"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>What was done well despite the outcome?</Label>
                                <Textarea
                                  value={analysis.done_well || ""}
                                  onChange={(e) =>
                                    updateLosingAnalysis(analysis.trade_id, "done_well", e.target.value)
                                  }
                                  placeholder="Proper execution, risk management, etc."
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Were emotions controlled after realizing this loss?</Label>
                                <Textarea
                                  value={analysis.emotions_controlled || ""}
                                  onChange={(e) =>
                                    updateLosingAnalysis(analysis.trade_id, "emotions_controlled", e.target.value)
                                  }
                                  placeholder="Emotional response..."
                                />
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="space-y-2">
                                <Label>Where did you deviate from your plan and why?</Label>
                                <Textarea
                                  value={analysis.plan_deviation || ""}
                                  onChange={(e) =>
                                    updateLosingAnalysis(analysis.trade_id, "plan_deviation", e.target.value)
                                  }
                                  placeholder="Describe the deviation..."
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>What were the warning signs leading into this trade?</Label>
                                <Textarea
                                  value={analysis.warning_signs || ""}
                                  onChange={(e) =>
                                    updateLosingAnalysis(analysis.trade_id, "warning_signs", e.target.value)
                                  }
                                  placeholder="Red flags you may have ignored..."
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>How did you respond and did it impact following trades?</Label>
                                <Textarea
                                  value={analysis.outcome_response || ""}
                                  onChange={(e) =>
                                    updateLosingAnalysis(analysis.trade_id, "outcome_response", e.target.value)
                                  }
                                  placeholder="Your response and subsequent impact..."
                                />
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Missed Trades */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold flex items-center justify-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Missed Opportunities
                </h2>
                <p className="text-muted-foreground">
                  Reflect on any valid trades you missed this week
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Is there a valid trade that you missed this week?</Label>
                  <Textarea
                    value={missedTradeDescription}
                    onChange={(e) => setMissedTradeDescription(e.target.value)}
                    placeholder="Describe the setup and what you missed..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>What was the reason for missing it?</Label>
                  <Textarea
                    value={missedTradeReason}
                    onChange={(e) => setMissedTradeReason(e.target.value)}
                    placeholder="Fear, distraction, not watching, hesitation, etc."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>How can you get onside with a similar move in the future?</Label>
                  <Textarea
                    value={missedTradePrevention}
                    onChange={(e) => setMissedTradePrevention(e.target.value)}
                    placeholder="Alerts, better preparation, process changes, etc."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Performance */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold flex items-center justify-center gap-2">
                  <Brain className="h-5 w-5 text-purple-500" />
                  Overall Performance
                </h2>
                <p className="text-muted-foreground">
                  Evaluate your trading process and mindset this week
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>
                    What did you do this week that you did not do last week? How did it impact the outcome?
                  </Label>
                  <Textarea
                    value={weekVsLastWeek}
                    onChange={(e) => setWeekVsLastWeek(e.target.value)}
                    placeholder="New habits, strategies, or behaviors..."
                    rows={3}
                  />
                </div>

                <div className="space-y-4">
                  <Label>
                    Did you execute your process better this week compared to previous week? (1-10)
                  </Label>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">Poor</span>
                    <Slider
                      value={[processRating]}
                      onValueChange={(v) => setProcessRating(v[0])}
                      min={1}
                      max={10}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">Excellent</span>
                    <Badge variant="secondary" className="ml-2 text-lg">
                      {processRating}
                    </Badge>
                  </div>
                  <Textarea
                    value={processNotes}
                    onChange={(e) => setProcessNotes(e.target.value)}
                    placeholder="Notes on your process execution..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Did results from the previous week impact your mindset this week?
                  </Label>
                  <Textarea
                    value={mindsetImpact}
                    onChange={(e) => setMindsetImpact(e.target.value)}
                    placeholder="Positive or negative mindset impacts..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    What actions must be taken now to ensure improvement next week?
                  </Label>
                  <Textarea
                    value={improvementActions}
                    onChange={(e) => setImprovementActions(e.target.value)}
                    placeholder="Specific action items..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Patterns */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold flex items-center justify-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  Patterns & Improvements
                </h2>
                <p className="text-muted-foreground">
                  Identify repeating patterns in your trading
                </p>
              </div>

              {/* Strengths */}
              <Card className="border-green-200 dark:border-green-800">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    Repeating Strengths
                  </CardTitle>
                  <CardDescription>
                    Positive patterns resulting in good outcomes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Identify: What strengths did you notice?</Label>
                    <Textarea
                      value={strengthIdentified}
                      onChange={(e) => setStrengthIdentified(e.target.value)}
                      placeholder="Describe the positive patterns..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cause: What caused these positive decisions?</Label>
                    <Textarea
                      value={strengthCause}
                      onChange={(e) => setStrengthCause(e.target.value)}
                      placeholder="Root causes of success..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Purpose: Why is it important to continue these?</Label>
                    <Textarea
                      value={strengthImportance}
                      onChange={(e) => setStrengthImportance(e.target.value)}
                      placeholder="Impact on trading performance..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Action: Steps to further improve them?</Label>
                    <Textarea
                      value={strengthActions}
                      onChange={(e) => setStrengthActions(e.target.value)}
                      placeholder="Specific actions to build on strengths..."
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Mistakes */}
              <Card className="border-red-200 dark:border-red-800">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    Repeating Mistakes
                  </CardTitle>
                  <CardDescription>
                    Negative patterns resulting in poor outcomes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Identify: What mistakes did you notice?</Label>
                    <Textarea
                      value={mistakeIdentified}
                      onChange={(e) => setMistakeIdentified(e.target.value)}
                      placeholder="Describe the negative patterns..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cause: What caused these poor decisions?</Label>
                    <Textarea
                      value={mistakeCause}
                      onChange={(e) => setMistakeCause(e.target.value)}
                      placeholder="Root causes of mistakes..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Purpose: Why is it important to remove these?</Label>
                    <Textarea
                      value={mistakeImportance}
                      onChange={(e) => setMistakeImportance(e.target.value)}
                      placeholder="Impact on trading performance..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Action: Steps to avoid them going forward?</Label>
                    <Textarea
                      value={mistakeActions}
                      onChange={(e) => setMistakeActions(e.target.value)}
                      placeholder="Specific actions to prevent mistakes..."
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 7: Summary */}
          {currentStep === 7 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold flex items-center justify-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Summary & Goals
                </h2>
                <p className="text-muted-foreground">
                  Summarize your takeaways and set goals for next week
                </p>
              </div>

              {/* Week Stats Summary */}
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{review.total_trades}</p>
                      <p className="text-xs text-muted-foreground">Trades</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{review.win_rate?.toFixed(0) || 0}%</p>
                      <p className="text-xs text-muted-foreground">Win Rate</p>
                    </div>
                    <div>
                      <p
                        className={cn(
                          "text-2xl font-bold",
                          review.total_pnl >= 0 ? "text-green-500" : "text-red-500"
                        )}
                      >
                        {formatCurrency(review.total_pnl)}
                      </p>
                      <p className="text-xs text-muted-foreground">P&L</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{processRating}/10</p>
                      <p className="text-xs text-muted-foreground">Process</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Key Takeaways from this Week</Label>
                  <Textarea
                    value={keyTakeaways}
                    onChange={(e) => setKeyTakeaways(e.target.value)}
                    placeholder="What are the most important lessons from this week?"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Goals for Next Week</Label>
                  <Textarea
                    value={goalsNextWeek}
                    onChange={(e) => setGoalsNextWeek(e.target.value)}
                    placeholder="What specific goals do you want to achieve next week?"
                    rows={4}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex justify-center">
                <Button
                  size="lg"
                  onClick={() => saveProgress(true)}
                  disabled={saving}
                  className="px-8"
                >
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  {saving ? "Completing..." : "Complete Review"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        <Button
          onClick={() => setCurrentStep((s) => Math.min(STEPS.length, s + 1))}
          disabled={currentStep === STEPS.length}
        >
          Next
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
