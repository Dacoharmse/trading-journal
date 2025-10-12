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

  // Fetch data from Supabase on mount
  React.useEffect(() => {
    fetchUser()
  }, [fetchUser])

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
                  const formData = new FormData(e.currentTarget)
                  const profileData = {
                    email: formData.get("email") as string,
                    profile: {
                      full_name: formData.get("full_name") as string,
                      bio: formData.get("bio") as string,
                      phone: formData.get("phone") as string,
                      country: formData.get("country") as string,
                      experience_level: formData.get("experience_level") as any,
                      years_of_experience: formData.get("years_of_experience")
                        ? parseInt(formData.get("years_of_experience") as string)
                        : undefined,
                      trading_style: formData.get("trading_style") as any,
                      twitter_handle: formData.get("twitter_handle") as string,
                      linkedin_url: formData.get("linkedin_url") as string,
                    },
                  }
                  useUserStore.getState().updateProfile(profileData)
                  alert("Profile updated successfully!")
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
                      defaultValue={useUserStore.getState().user?.email || ""}
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
                      defaultValue={
                        useUserStore.getState().user?.profile?.full_name || ""
                      }
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      name="bio"
                      placeholder="Tell us about yourself and your trading journey..."
                      rows={4}
                      defaultValue={useUserStore.getState().user?.profile?.bio || ""}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      defaultValue={useUserStore.getState().user?.profile?.phone || ""}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      name="country"
                      placeholder="United States"
                      defaultValue={
                        useUserStore.getState().user?.profile?.country || ""
                      }
                    />
                  </div>

                  <Separator className="md:col-span-2" />

                  <div className="space-y-2">
                    <Label htmlFor="experience_level">Experience Level</Label>
                    <Select
                      name="experience_level"
                      defaultValue={
                        useUserStore.getState().user?.profile?.experience_level ||
                        "beginner"
                      }
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
                      defaultValue={
                        useUserStore.getState().user?.profile?.years_of_experience ||
                        ""
                      }
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="trading_style">Primary Trading Style</Label>
                    <Select
                      name="trading_style"
                      defaultValue={
                        useUserStore.getState().user?.profile?.trading_style ||
                        "day_trading"
                      }
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

                  <Separator className="md:col-span-2" />

                  <div className="space-y-2">
                    <Label htmlFor="twitter_handle">Twitter/X Handle</Label>
                    <Input
                      id="twitter_handle"
                      name="twitter_handle"
                      placeholder="@yourhandle"
                      defaultValue={
                        useUserStore.getState().user?.profile?.twitter_handle || ""
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="linkedin_url">LinkedIn Profile URL</Label>
                    <Input
                      id="linkedin_url"
                      name="linkedin_url"
                      type="url"
                      placeholder="https://linkedin.com/in/yourprofile"
                      defaultValue={
                        useUserStore.getState().user?.profile?.linkedin_url || ""
                      }
                    />
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
                  const formData = new FormData(e.currentTarget)
                  const preferencesData = {
                    default_broker: formData.get("default_broker") as any,
                    currency: formData.get("currency") as any,
                    theme: formData.get("theme") as any,
                    timezone: formData.get("timezone") as string,
                    default_chart_type: formData.get("default_chart_type") as any,
                    items_per_page: formData.get("items_per_page")
                      ? parseInt(formData.get("items_per_page") as string)
                      : 50,
                    default_date_range: formData.get("default_date_range") as any,
                    show_pnl_percentage: formData.get("show_pnl_percentage") === "on",
                    max_risk_per_trade: formData.get("max_risk_per_trade")
                      ? parseFloat(formData.get("max_risk_per_trade") as string)
                      : undefined,
                    max_daily_loss: formData.get("max_daily_loss")
                      ? parseFloat(formData.get("max_daily_loss") as string)
                      : undefined,
                    max_position_size: formData.get("max_position_size")
                      ? parseFloat(formData.get("max_position_size") as string)
                      : undefined,
                  }
                  useUserStore.getState().updatePreferences(preferencesData)
                  alert("Preferences saved successfully!")
                }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">General Settings</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="theme">Theme</Label>
                      <Select
                        name="theme"
                        defaultValue={user?.preferences?.theme || "system"}
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
                        name="currency"
                        defaultValue={user?.preferences?.currency || "USD"}
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
                        name="timezone"
                        defaultValue={
                          user?.preferences?.timezone ||
                          Intl.DateTimeFormat().resolvedOptions().timeZone
                        }
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
                      <Select name="default_broker" defaultValue="">
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
                        name="default_chart_type"
                        defaultValue={user?.preferences?.default_chart_type || "candlestick"}
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
                        name="items_per_page"
                        defaultValue={
                          (user?.preferences?.items_per_page || 50).toString()
                        }
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
                        name="default_date_range"
                        defaultValue={user?.preferences?.default_date_range || "30d"}
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
                        name="show_pnl_percentage"
                        defaultChecked={user?.preferences?.show_pnl_percentage}
                      />
                      <Label htmlFor="show_pnl_percentage">
                        Show P&L as Percentage
                      </Label>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Risk Management</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="max_risk_per_trade">
                        Max Risk Per Trade (%)
                      </Label>
                      <Input
                        id="max_risk_per_trade"
                        name="max_risk_per_trade"
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        placeholder="2.0"
                        defaultValue={user?.preferences?.max_risk_per_trade || ""}
                      />
                      <p className="text-xs text-muted-foreground">
                        Maximum percentage of capital to risk per trade
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max_daily_loss">Max Daily Loss ($)</Label>
                      <Input
                        id="max_daily_loss"
                        name="max_daily_loss"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="500.00"
                        defaultValue={user?.preferences?.max_daily_loss || ""}
                      />
                      <p className="text-xs text-muted-foreground">
                        Stop trading if daily loss exceeds this amount
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max_position_size">
                        Max Position Size ($)
                      </Label>
                      <Input
                        id="max_position_size"
                        name="max_position_size"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="10000.00"
                        defaultValue={user?.preferences?.max_position_size || ""}
                      />
                      <p className="text-xs text-muted-foreground">
                        Maximum dollar amount per position
                      </p>
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
                  const formData = new FormData(e.currentTarget)
                  const notificationPrefs = {
                    email_notifications: formData.get("email_notifications") === "on",
                    daily_summary_email: formData.get("daily_summary_email") === "on",
                    weekly_report_email: formData.get("weekly_report_email") === "on",
                  }
                  useUserStore.getState().updatePreferences(notificationPrefs)
                  alert("Notification preferences saved successfully!")
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
                        name="email_notifications"
                        defaultChecked={user?.preferences?.email_notifications ?? true}
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
                        name="daily_summary_email"
                        defaultChecked={user?.preferences?.daily_summary_email ?? false}
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
                        name="weekly_report_email"
                        defaultChecked={user?.preferences?.weekly_report_email ?? false}
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
                        <Label className="text-base">Profit Target Reached</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when you reach your profit targets on prop firm accounts
                        </p>
                      </div>
                      <Switch defaultChecked={true} />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Drawdown Warnings</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive alerts when approaching maximum drawdown limits
                        </p>
                      </div>
                      <Switch defaultChecked={true} />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Daily Loss Limit</Label>
                        <p className="text-sm text-muted-foreground">
                          Alert when you reach your maximum daily loss threshold
                        </p>
                      </div>
                      <Switch defaultChecked={true} />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Trade Reminders</Label>
                        <p className="text-sm text-muted-foreground">
                          Remind you to journal trades that haven't been closed
                        </p>
                      </div>
                      <Switch defaultChecked={false} />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Performance Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Winning Streaks</Label>
                        <p className="text-sm text-muted-foreground">
                          Celebrate your winning streaks with notifications
                        </p>
                      </div>
                      <Switch defaultChecked={true} />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">New Personal Best</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when you achieve a new personal best day
                        </p>
                      </div>
                      <Switch defaultChecked={true} />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Milestone Achievements</Label>
                        <p className="text-sm text-muted-foreground">
                          Notifications for reaching trade count or profit milestones
                        </p>
                      </div>
                      <Switch defaultChecked={true} />
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
                <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
                <div className="rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <Label className="text-base">
                        Two-Factor Authentication (2FA)
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account by requiring a
                        verification code in addition to your password
                      </p>
                      {user?.two_factor_enabled ? (
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant="default">Enabled</Badge>
                          <p className="text-xs text-muted-foreground">
                            Your account is protected with 2FA
                          </p>
                        </div>
                      ) : (
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant="outline">Disabled</Badge>
                          <p className="text-xs text-muted-foreground">
                            Enable 2FA to secure your account
                          </p>
                        </div>
                      )}
                    </div>
                    <Button
                      variant={user?.two_factor_enabled ? "destructive" : "default"}
                      onClick={() => {
                        const newState = !user?.two_factor_enabled
                        useUserStore.getState().updateProfile({
                          two_factor_enabled: newState,
                        })
                        alert(
                          newState
                            ? "Two-factor authentication enabled!"
                            : "Two-factor authentication disabled!"
                        )
                      }}
                    >
                      {user?.two_factor_enabled ? "Disable" : "Enable"} 2FA
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">API Access</h3>
                <div className="rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <Label className="text-base">API Access</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable API access to integrate with third-party applications and
                        trading platforms
                      </p>
                      {user?.api_access_enabled && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <code className="rounded bg-muted px-2 py-1 text-xs">
                              api_key_xxxxxxxxxxxxxxxx
                            </code>
                            <Button size="sm" variant="outline">
                              Copy
                            </Button>
                          </div>
                          <Button size="sm" variant="outline">
                            Regenerate API Key
                          </Button>
                        </div>
                      )}
                    </div>
                    <Switch
                      checked={user?.api_access_enabled ?? false}
                      onCheckedChange={(checked) => {
                        useUserStore.getState().updateProfile({
                          api_access_enabled: checked,
                        })
                      }}
                    />
                  </div>
                </div>
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
