"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CalendarDays,
  Plus,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Target,
  CheckCircle2,
  Clock,
  FileText,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { WeeklyReview } from "@/types/supabase"
import { format, startOfWeek, endOfWeek, subWeeks, parseISO } from "date-fns"
import { cn } from "@/lib/utils"

function getWeekDateRange(date: Date = new Date()) {
  const start = startOfWeek(date, { weekStartsOn: 1 }) // Monday
  const end = endOfWeek(date, { weekStartsOn: 1 }) // Sunday
  return { start, end }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value)
}

export default function WeeklyReviewListPage() {
  const router = useRouter()
  const [reviews, setReviews] = React.useState<WeeklyReview[]>([])
  const [loading, setLoading] = React.useState(true)
  const [currentWeekReview, setCurrentWeekReview] = React.useState<WeeklyReview | null>(null)

  React.useEffect(() => {
    const fetchReviews = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      // Fetch all reviews
      const { data, error } = await supabase
        .from("weekly_reviews")
        .select("*")
        .eq("user_id", user.id)
        .order("week_start", { ascending: false })

      if (!error && data) {
        setReviews(data)

        // Check if current week has a review
        const { start } = getWeekDateRange()
        const currentWeekStart = format(start, "yyyy-MM-dd")
        const existing = data.find((r) => r.week_start === currentWeekStart)
        setCurrentWeekReview(existing || null)
      }

      setLoading(false)
    }

    fetchReviews()
  }, [])

  const handleStartCurrentWeekReview = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    const { start, end } = getWeekDateRange()
    const weekStart = format(start, "yyyy-MM-dd")
    const weekEnd = format(end, "yyyy-MM-dd")

    // Check if review already exists
    if (currentWeekReview) {
      router.push(`/review/${currentWeekReview.id}`)
      return
    }

    // Create new review
    const { data, error } = await supabase
      .from("weekly_reviews")
      .insert({
        user_id: user.id,
        week_start: weekStart,
        week_end: weekEnd,
        status: "in_progress",
        winning_trades_analysis: [],
        losing_trades_analysis: [],
      })
      .select()
      .single()

    if (!error && data) {
      router.push(`/review/${data.id}`)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        )
      case "in_progress":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300">
            <Clock className="mr-1 h-3 w-3" />
            In Progress
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary">
            <FileText className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        )
    }
  }

  const { start: currentWeekStart, end: currentWeekEnd } = getWeekDateRange()

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Weekly Reviews</h1>
          <p className="text-muted-foreground mt-1">
            Analyze your trading week and identify areas for improvement
          </p>
        </div>
      </div>

      {/* Current Week Card */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                This Week&apos;s Review
              </CardTitle>
              <CardDescription className="mt-1">
                {format(currentWeekStart, "MMM d")} - {format(currentWeekEnd, "MMM d, yyyy")}
              </CardDescription>
            </div>
            {currentWeekReview && getStatusBadge(currentWeekReview.status)}
          </div>
        </CardHeader>
        <CardContent>
          {currentWeekReview ? (
            <div className="space-y-4">
              {currentWeekReview.status === "completed" ? (
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-background rounded-lg">
                    <p className="text-2xl font-bold">{currentWeekReview.total_trades}</p>
                    <p className="text-xs text-muted-foreground">Total Trades</p>
                  </div>
                  <div className="text-center p-3 bg-background rounded-lg">
                    <p className="text-2xl font-bold text-green-500">{currentWeekReview.winning_trades}</p>
                    <p className="text-xs text-muted-foreground">Winners</p>
                  </div>
                  <div className="text-center p-3 bg-background rounded-lg">
                    <p className="text-2xl font-bold text-red-500">{currentWeekReview.losing_trades}</p>
                    <p className="text-xs text-muted-foreground">Losers</p>
                  </div>
                  <div className="text-center p-3 bg-background rounded-lg">
                    <p className={cn(
                      "text-2xl font-bold",
                      currentWeekReview.total_pnl >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {formatCurrency(currentWeekReview.total_pnl)}
                    </p>
                    <p className="text-xs text-muted-foreground">P&L</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Continue where you left off and complete your weekly review.
                </p>
              )}
              <Button onClick={() => router.push(`/review/${currentWeekReview.id}`)} className="w-full">
                {currentWeekReview.status === "completed" ? "View Review" : "Continue Review"}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You haven&apos;t started your weekly review yet. Take time to reflect on your trades
                and identify patterns in your trading.
              </p>
              <Button onClick={handleStartCurrentWeekReview} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Start Weekly Review
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Reviews */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Past Reviews</h2>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading reviews...</div>
        ) : reviews.filter((r) => r.week_start !== format(currentWeekStart, "yyyy-MM-dd")).length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No past reviews yet.</p>
              <p className="text-sm">Complete your first weekly review to see it here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {reviews
              .filter((r) => r.week_start !== format(currentWeekStart, "yyyy-MM-dd"))
              .map((review) => (
                <Card
                  key={review.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => router.push(`/review/${review.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-muted">
                          <CalendarDays className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {format(parseISO(review.week_start), "MMM d")} -{" "}
                            {format(parseISO(review.week_end), "MMM d, yyyy")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {review.total_trades} trades | {review.win_rate?.toFixed(0) || 0}% win rate
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p
                            className={cn(
                              "text-lg font-semibold",
                              review.total_pnl >= 0 ? "text-green-500" : "text-red-500"
                            )}
                          >
                            {review.total_pnl >= 0 ? (
                              <TrendingUp className="inline mr-1 h-4 w-4" />
                            ) : (
                              <TrendingDown className="inline mr-1 h-4 w-4" />
                            )}
                            {formatCurrency(review.total_pnl)}
                          </p>
                        </div>
                        {getStatusBadge(review.status)}
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
