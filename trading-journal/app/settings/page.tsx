"use client"

import * as React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Settings,
  User,
  Bell,
  Shield,
} from "lucide-react"
import { Broker } from "@/types"
import { useUserStore } from "@/stores"
import { useToast } from "@/hooks/use-toast"

const brokerOptions = [
  Broker.TD_AMERITRADE,
  Broker.INTERACTIVE_BROKERS,
  Broker.CHARLES_SCHWAB,
  Broker.E_TRADE,
  Broker.FIDELITY,
  Broker.ROBINHOOD,
  Broker.WEBULL,
  Broker.TASTYTRADE,
  Broker.TRADESTATION,
  Broker.THINKORSWIM,
  Broker.XM,
  Broker.EXNESS,
]

export default function SettingsPage() {
  const user = useUserStore((state) => state.user)
  const fetchUser = useUserStore((state) => state.fetchUser)
  const { toast } = useToast()

  // State for controlled form inputs - Profile
  const [fullName, setFullName] = React.useState("")
  const [experienceLevel, setExperienceLevel] = React.useState("beginner")
  const [yearsOfExperience, setYearsOfExperience] = React.useState("")
  const [tradingStyle, setTradingStyle] = React.useState("day_trading")

  // State for controlled form inputs - Preferences
  const [theme, setTheme] = React.useState("system")
  const [currency, setCurrency] = React.useState("USD")
  const [timezone, setTimezone] = React.useState(Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [defaultBroker, setDefaultBroker] = React.useState("")
  const [defaultChartType, setDefaultChartType] = React.useState("candlestick")
  const [itemsPerPage, setItemsPerPage] = React.useState("50")
  const [defaultDateRange, setDefaultDateRange] = React.useState("30d")
  const [showPnlPercentage, setShowPnlPercentage] = React.useState(false)

  // State for notification preferences
  const [emailNotifications, setEmailNotifications] = React.useState(true)
  const [dailySummaryEmail, setDailySummaryEmail] = React.useState(false)
  const [weeklyReportEmail, setWeeklyReportEmail] = React.useState(false)
  const [profitTargetAlerts, setProfitTargetAlerts] = React.useState(true)
  const [drawdownWarnings, setDrawdownWarnings] = React.useState(true)
  const [dailyLossAlerts, setDailyLossAlerts] = React.useState(true)
  const [tradeReminders, setTradeReminders] = React.useState(false)
  const [winningStreakNotifications, setWinningStreakNotifications] = React.useState(true)
  const [personalBestNotifications, setPersonalBestNotifications] = React.useState(true)
  const [milestoneNotifications, setMilestoneNotifications] = React.useState(true)

  // Fetch data from Supabase on mount
  React.useEffect(() => {
    fetchUser()
  }, [fetchUser])

  // Update form state when user data loads
  React.useEffect(() => {
    if (user) {
      // Profile fields
      setFullName(user.profile?.full_name || "")
      setExperienceLevel(user.profile?.experience_level || "beginner")
      setYearsOfExperience(user.profile?.years_of_experience?.toString() || "")
      setTradingStyle(user.profile?.trading_style || "day_trading")

      // Preferences fields
      setTheme(user.preferences?.theme || "system")
      setCurrency(user.preferences?.currency || "USD")
      setTimezone(user.preferences?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone)
      setDefaultBroker(user.preferences?.default_broker || "")
      setDefaultChartType(user.preferences?.default_chart_type || "candlestick")
      setItemsPerPage((user.preferences?.items_per_page || 50).toString())
      setDefaultDateRange(user.preferences?.default_date_range || "30d")
      setShowPnlPercentage(user.preferences?.show_pnl_percentage || false)

      // Notification preferences
      setEmailNotifications(user.preferences?.email_notifications ?? true)
      setDailySummaryEmail(user.preferences?.daily_summary_email ?? false)
      setWeeklyReportEmail(user.preferences?.weekly_report_email ?? false)
      setProfitTargetAlerts(user.preferences?.profit_target_alerts ?? true)
      setDrawdownWarnings(user.preferences?.drawdown_warnings ?? true)
      setDailyLossAlerts(user.preferences?.daily_loss_alerts ?? true)
      setTradeReminders(user.preferences?.trade_reminders ?? false)
      setWinningStreakNotifications(user.preferences?.winning_streak_notifications ?? true)
      setPersonalBestNotifications(user.preferences?.personal_best_notifications ?? true)
      setMilestoneNotifications(user.preferences?.milestone_notifications ?? true)
    }
  }, [user])

  return (
    <div className="flex-1 p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your trading journal preferences and configuration
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="profile">
            <User className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <Settings className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Preferences</span>
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>
                Manage your personal information and trading profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const profileData = {
                    email: user?.email || "",
                    profile: {
                      full_name: fullName,
                      experience_level: experienceLevel as any,
                      years_of_experience: yearsOfExperience
                        ? parseInt(yearsOfExperience)
                        : undefined,
                      trading_style: tradingStyle as any,
                    },
                  }
                  useUserStore.getState().updateProfile(profileData)
                  toast({
                    title: "Success",
                    description: "Profile updated successfully!",
                  })
                }}
                className="space-y-6"
              >
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={user?.email || ""}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed
                    </p>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      name="full_name"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>

                  <Separator className="md:col-span-2" />

                  <div className="space-y-2">
                    <Label htmlFor="experience_level">Experience Level</Label>
                    <Select
                      value={experienceLevel}
                      onValueChange={setExperienceLevel}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="years_of_experience">Years of Experience</Label>
                    <Input
                      id="years_of_experience"
                      name="years_of_experience"
                      type="number"
                      min="0"
                      max="50"
                      placeholder="5"
                      value={yearsOfExperience}
                      onChange={(e) => setYearsOfExperience(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="trading_style">Primary Trading Style</Label>
                    <Select
                      value={tradingStyle}
                      onValueChange={setTradingStyle}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day_trading">Day Trading</SelectItem>
                        <SelectItem value="swing_trading">Swing Trading</SelectItem>
                        <SelectItem value="scalping">Scalping</SelectItem>
                        <SelectItem value="position_trading">
                          Position Trading
                        </SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                </div>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                  <Button type="submit">Save Profile</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Trading Preferences</CardTitle>
              <CardDescription>
                Customize your trading journal experience and default settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  useUserStore.getState().updatePreferences({
                    default_broker: defaultBroker || undefined,
                    currency: currency,
                    theme: theme,
                    timezone: timezone,
                    default_chart_type: defaultChartType,
                    items_per_page: parseInt(itemsPerPage),
                    default_date_range: defaultDateRange,
                    show_pnl_percentage: showPnlPercentage,
                  } as any)
                  toast({
                    title: "Success",
                    description: "Preferences saved successfully!",
                  })
                }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">General Settings</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="theme">Theme</Label>
                      <Select
                        value={theme}
                        onValueChange={setTheme}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="currency">Preferred Currency</Label>
                      <Select
                        value={currency}
                        onValueChange={setCurrency}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="GBP">GBP - British Pound</SelectItem>
                          <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                          <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                          <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                          <SelectItem value="ZAR">ZAR - South African Rand</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select
                        value={timezone}
                        onValueChange={setTimezone}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/New_York">
                            Eastern Time (ET)
                          </SelectItem>
                          <SelectItem value="America/Chicago">
                            Central Time (CT)
                          </SelectItem>
                          <SelectItem value="America/Denver">
                            Mountain Time (MT)
                          </SelectItem>
                          <SelectItem value="America/Los_Angeles">
                            Pacific Time (PT)
                          </SelectItem>
                          <SelectItem value="Europe/London">
                            London (GMT)
                          </SelectItem>
                          <SelectItem value="Europe/Paris">
                            Paris (CET)
                          </SelectItem>
                          <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                          <SelectItem value="Asia/Shanghai">
                            Shanghai (CST)
                          </SelectItem>
                          <SelectItem value="Australia/Sydney">
                            Sydney (AEDT)
                          </SelectItem>
                          <SelectItem value="Africa/Johannesburg">
                            Johannesburg (SAST)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="default_broker">Default Broker</Label>
                      <Select
                        value={defaultBroker}
                        onValueChange={setDefaultBroker}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          {brokerOptions.map((broker) => (
                            <SelectItem key={broker} value={broker}>
                              {broker}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Display Settings</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="default_chart_type">Default Chart Type</Label>
                      <Select
                        value={defaultChartType}
                        onValueChange={setDefaultChartType}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="candlestick">Candlestick</SelectItem>
                          <SelectItem value="line">Line</SelectItem>
                          <SelectItem value="bar">Bar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="items_per_page">Items Per Page</Label>
                      <Select
                        value={itemsPerPage}
                        onValueChange={setItemsPerPage}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="default_date_range">
                        Default Date Range
                      </Label>
                      <Select
                        value={defaultDateRange}
                        onValueChange={setDefaultDateRange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7d">Last 7 Days</SelectItem>
                          <SelectItem value="30d">Last 30 Days</SelectItem>
                          <SelectItem value="90d">Last 90 Days</SelectItem>
                          <SelectItem value="1y">Last Year</SelectItem>
                          <SelectItem value="all">All Time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="show_pnl_percentage"
                        checked={showPnlPercentage}
                        onCheckedChange={setShowPnlPercentage}
                      />
                      <Label htmlFor="show_pnl_percentage">
                        Show P&L as Percentage
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                  <Button type="submit">Save Preferences</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Manage how and when you receive notifications about your trading activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const notificationPrefs = {
                    email_notifications: emailNotifications,
                    daily_summary_email: dailySummaryEmail,
                    weekly_report_email: weeklyReportEmail,
                    profit_target_alerts: profitTargetAlerts,
                    drawdown_warnings: drawdownWarnings,
                    daily_loss_alerts: dailyLossAlerts,
                    trade_reminders: tradeReminders,
                    winning_streak_notifications: winningStreakNotifications,
                    personal_best_notifications: personalBestNotifications,
                    milestone_notifications: milestoneNotifications,
                  }
                  useUserStore.getState().updatePreferences(notificationPrefs)
                  toast({
                    title: "Success",
                    description: "Notification preferences saved successfully!",
                  })
                }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Email Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label htmlFor="email_notifications" className="text-base">
                          Email Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Receive email notifications about your trading activity
                        </p>
                      </div>
                      <Switch
                        id="email_notifications"
                        checked={emailNotifications}
                        onCheckedChange={setEmailNotifications}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label htmlFor="daily_summary_email" className="text-base">
                          Daily Summary
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Get a daily email with your trading performance summary
                        </p>
                      </div>
                      <Switch
                        id="daily_summary_email"
                        checked={dailySummaryEmail}
                        onCheckedChange={setDailySummaryEmail}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label htmlFor="weekly_report_email" className="text-base">
                          Weekly Report
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Receive a comprehensive weekly performance report every Monday
                        </p>
                      </div>
                      <Switch
                        id="weekly_report_email"
                        checked={weeklyReportEmail}
                        onCheckedChange={setWeeklyReportEmail}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Trading Alerts</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label htmlFor="profit_target_alerts" className="text-base">Profit Target Reached</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when you reach your profit targets on prop firm accounts
                        </p>
                      </div>
                      <Switch
                        id="profit_target_alerts"
                        checked={profitTargetAlerts}
                        onCheckedChange={setProfitTargetAlerts}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label htmlFor="drawdown_warnings" className="text-base">Drawdown Warnings</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive alerts when approaching maximum drawdown limits
                        </p>
                      </div>
                      <Switch
                        id="drawdown_warnings"
                        checked={drawdownWarnings}
                        onCheckedChange={setDrawdownWarnings}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label htmlFor="daily_loss_alerts" className="text-base">Daily Loss Limit</Label>
                        <p className="text-sm text-muted-foreground">
                          Alert when you reach your maximum daily loss threshold
                        </p>
                      </div>
                      <Switch
                        id="daily_loss_alerts"
                        checked={dailyLossAlerts}
                        onCheckedChange={setDailyLossAlerts}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label htmlFor="trade_reminders" className="text-base">Trade Reminders</Label>
                        <p className="text-sm text-muted-foreground">
                          Remind you to journal trades that haven't been closed
                        </p>
                      </div>
                      <Switch
                        id="trade_reminders"
                        checked={tradeReminders}
                        onCheckedChange={setTradeReminders}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Performance Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label htmlFor="winning_streak_notifications" className="text-base">Winning Streaks</Label>
                        <p className="text-sm text-muted-foreground">
                          Celebrate your winning streaks with notifications
                        </p>
                      </div>
                      <Switch
                        id="winning_streak_notifications"
                        checked={winningStreakNotifications}
                        onCheckedChange={setWinningStreakNotifications}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label htmlFor="personal_best_notifications" className="text-base">New Personal Best</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when you achieve a new personal best day
                        </p>
                      </div>
                      <Switch
                        id="personal_best_notifications"
                        checked={personalBestNotifications}
                        onCheckedChange={setPersonalBestNotifications}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label htmlFor="milestone_notifications" className="text-base">Milestone Achievements</Label>
                        <p className="text-sm text-muted-foreground">
                          Notifications for reaching trade count or profit milestones
                        </p>
                      </div>
                      <Switch
                        id="milestone_notifications"
                        checked={milestoneNotifications}
                        onCheckedChange={setMilestoneNotifications}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                  <Button type="submit">Save Preferences</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your account security, password, and authentication settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Password</h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const formData = new FormData(e.currentTarget)
                    const currentPassword = formData.get("current_password")
                    const newPassword = formData.get("new_password")
                    const confirmPassword = formData.get("confirm_password")

                    if (newPassword !== confirmPassword) {
                      alert("New passwords don't match!")
                      return
                    }

                    if ((newPassword as string).length < 8) {
                      alert("Password must be at least 8 characters long")
                      return
                    }

                    alert("Password updated successfully!")
                    e.currentTarget.reset()
                  }}
                  className="space-y-4"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="current_password">Current Password</Label>
                      <Input
                        id="current_password"
                        name="current_password"
                        type="password"
                        placeholder="Enter current password"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new_password">New Password</Label>
                      <Input
                        id="new_password"
                        name="new_password"
                        type="password"
                        placeholder="Enter new password"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Must be at least 8 characters
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm_password">
                        Confirm New Password
                      </Label>
                      <Input
                        id="confirm_password"
                        name="confirm_password"
                        type="password"
                        placeholder="Confirm new password"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit">Update Password</Button>
                  </div>
                </form>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Session Management</h3>
                <div className="space-y-3">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Current Session</p>
                        <p className="text-sm text-muted-foreground">
                          Chrome on Windows • Active now
                        </p>
                      </div>
                      <Badge>This device</Badge>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <p className="text-sm text-muted-foreground">
                      No other active sessions
                    </p>
                    <Button variant="outline" size="sm">
                      Sign Out All Devices
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-destructive">
                  Danger Zone
                </h3>
                <div className="rounded-lg border border-destructive p-4">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-base">Delete Account</Label>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete your account and all associated data. This
                        action cannot be undone.
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        if (
                          confirm(
                            "Are you sure you want to delete your account? This action cannot be undone!"
                          )
                        ) {
                          alert(
                            "Account deletion would be processed here. (Demo mode - not actually deleting)"
                          )
                        }
                      }}
                    >
                      Delete Account
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
