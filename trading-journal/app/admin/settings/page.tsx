'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Shield,
  Mail,
  Bell,
  Database,
  Globe,
  Lock,
  Users,
  AlertTriangle,
  Save,
  RefreshCw,
} from 'lucide-react'
import { requireAdmin } from '@/lib/auth-utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function AdminSettingsPage() {
  const router = useRouter()
  const { addToast } = useToast()

  const [loading, setLoading] = React.useState(true)
  const [authorized, setAuthorized] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  // General Settings
  const [siteName, setSiteName] = React.useState('Trading Journal')
  const [siteDescription, setSiteDescription] = React.useState('Track and analyze your trading performance')
  const [supportEmail, setSupportEmail] = React.useState('support@tradingjournal.com')
  const [maintenanceMode, setMaintenanceMode] = React.useState(false)

  // Email Settings
  const [emailNotifications, setEmailNotifications] = React.useState(true)
  const [welcomeEmail, setWelcomeEmail] = React.useState(true)
  const [weeklyReports, setWeeklyReports] = React.useState(true)
  const [tradingAlerts, setTradingAlerts] = React.useState(true)

  // User Settings
  const [allowRegistration, setAllowRegistration] = React.useState(true)
  const [requireEmailVerification, setRequireEmailVerification] = React.useState(true)
  const [maxAccountsPerUser, setMaxAccountsPerUser] = React.useState('5')
  const [defaultRole, setDefaultRole] = React.useState('trader')

  // Security Settings
  const [sessionTimeout, setSessionTimeout] = React.useState('7')
  const [passwordMinLength, setPasswordMinLength] = React.useState('8')
  const [requireStrongPassword, setRequireStrongPassword] = React.useState(true)
  const [enable2FA, setEnable2FA] = React.useState(false)

  // Notification Settings
  const [pushNotifications, setPushNotifications] = React.useState(true)
  const [inAppNotifications, setInAppNotifications] = React.useState(true)
  const [mentorNotifications, setMentorNotifications] = React.useState(true)

  // Data & Privacy
  const [dataRetentionDays, setDataRetentionDays] = React.useState('365')
  const [allowDataExport, setAllowDataExport] = React.useState(true)
  const [anonymizeDeletedUsers, setAnonymizeDeletedUsers] = React.useState(true)

  // Check authorization
  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        await requireAdmin()
        setAuthorized(true)
      } catch (error) {
        router.push('/')
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [router])

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      // Here you would save settings to a database table
      // For now, we'll just show a success message
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call

      addToast('All settings have been updated successfully', 'success')
    } catch (error) {
      addToast('Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleResetDefaults = () => {
    if (confirm('Are you sure you want to reset all settings to default values?')) {
      // Reset all settings to defaults
      setSiteName('Trading Journal')
      setSiteDescription('Track and analyze your trading performance')
      setSupportEmail('support@tradingjournal.com')
      setMaintenanceMode(false)
      setEmailNotifications(true)
      setWelcomeEmail(true)
      setWeeklyReports(true)
      setTradingAlerts(true)
      setAllowRegistration(true)
      setRequireEmailVerification(true)
      setMaxAccountsPerUser('5')
      setDefaultRole('trader')
      setSessionTimeout('7')
      setPasswordMinLength('8')
      setRequireStrongPassword(true)
      setEnable2FA(false)
      setPushNotifications(true)
      setInAppNotifications(true)
      setMentorNotifications(true)
      setDataRetentionDays('365')
      setAllowDataExport(true)
      setAnonymizeDeletedUsers(true)

      addToast('All settings have been reset to default values', 'success')
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading settings...</div>
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-red-600" />
          <h2 className="mt-4 text-2xl font-bold">Access Denied</h2>
          <p className="mt-2 text-muted-foreground">
            You need administrator privileges to access this page
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure platform settings and preferences
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleResetDefaults}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset Defaults
          </Button>
          <Button onClick={handleSaveSettings} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                General Settings
              </CardTitle>
              <CardDescription>
                Basic platform configuration and branding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="Trading Journal"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteDescription">Site Description</Label>
                <Input
                  id="siteDescription"
                  value={siteDescription}
                  onChange={(e) => setSiteDescription(e.target.value)}
                  placeholder="Track and analyze your trading performance"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="support@tradingjournal.com"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Temporarily disable access to the platform
                  </p>
                </div>
                <Switch
                  checked={maintenanceMode}
                  onCheckedChange={setMaintenanceMode}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Settings */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Settings
              </CardTitle>
              <CardDescription>
                Configure user registration and account limits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Registration</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow new users to create accounts
                  </p>
                </div>
                <Switch
                  checked={allowRegistration}
                  onCheckedChange={setAllowRegistration}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Email Verification</Label>
                  <p className="text-sm text-muted-foreground">
                    Users must verify their email before accessing features
                  </p>
                </div>
                <Switch
                  checked={requireEmailVerification}
                  onCheckedChange={setRequireEmailVerification}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="maxAccounts">Max Accounts Per User</Label>
                <Input
                  id="maxAccounts"
                  type="number"
                  value={maxAccountsPerUser}
                  onChange={(e) => setMaxAccountsPerUser(e.target.value)}
                  min="1"
                  max="20"
                />
                <p className="text-sm text-muted-foreground">
                  Maximum number of trading accounts a user can create
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultRole">Default User Role</Label>
                <Select value={defaultRole} onValueChange={setDefaultRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trader">Trader</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Role assigned to new users upon registration
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Settings
              </CardTitle>
              <CardDescription>
                Configure email notifications and communication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable system email notifications
                  </p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Welcome Email</Label>
                  <p className="text-sm text-muted-foreground">
                    Send welcome email to new users
                  </p>
                </div>
                <Switch
                  checked={welcomeEmail}
                  onCheckedChange={setWelcomeEmail}
                  disabled={!emailNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Weekly Reports</Label>
                  <p className="text-sm text-muted-foreground">
                    Send weekly trading performance reports
                  </p>
                </div>
                <Switch
                  checked={weeklyReports}
                  onCheckedChange={setWeeklyReports}
                  disabled={!emailNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Trading Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Send alerts for important trading events
                  </p>
                </div>
                <Switch
                  checked={tradingAlerts}
                  onCheckedChange={setTradingAlerts}
                  disabled={!emailNotifications}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Configure authentication and security policies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Session Timeout (days)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(e.target.value)}
                  min="1"
                  max="30"
                />
                <p className="text-sm text-muted-foreground">
                  Number of days before user sessions expire
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="passwordMinLength">Minimum Password Length</Label>
                <Input
                  id="passwordMinLength"
                  type="number"
                  value={passwordMinLength}
                  onChange={(e) => setPasswordMinLength(e.target.value)}
                  min="6"
                  max="32"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Strong Passwords</Label>
                  <p className="text-sm text-muted-foreground">
                    Enforce uppercase, lowercase, numbers, and special characters
                  </p>
                </div>
                <Switch
                  checked={requireStrongPassword}
                  onCheckedChange={setRequireStrongPassword}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow users to enable 2FA for additional security
                  </p>
                </div>
                <Switch
                  checked={enable2FA}
                  onCheckedChange={setEnable2FA}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Configure in-app and push notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable browser push notifications
                  </p>
                </div>
                <Switch
                  checked={pushNotifications}
                  onCheckedChange={setPushNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>In-App Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Show notification bell in the app
                  </p>
                </div>
                <Switch
                  checked={inAppNotifications}
                  onCheckedChange={setInAppNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Mentor Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify mentors of student requests
                  </p>
                </div>
                <Switch
                  checked={mentorNotifications}
                  onCheckedChange={setMentorNotifications}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy & Data Settings */}
        <TabsContent value="privacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Privacy & Data Settings
              </CardTitle>
              <CardDescription>
                Configure data retention and privacy policies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="dataRetention">Data Retention Period (days)</Label>
                <Input
                  id="dataRetention"
                  type="number"
                  value={dataRetentionDays}
                  onChange={(e) => setDataRetentionDays(e.target.value)}
                  min="30"
                  max="3650"
                />
                <p className="text-sm text-muted-foreground">
                  How long to keep deleted user data before permanent removal
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Data Export</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow users to export their data
                  </p>
                </div>
                <Switch
                  checked={allowDataExport}
                  onCheckedChange={setAllowDataExport}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Anonymize Deleted Users</Label>
                  <p className="text-sm text-muted-foreground">
                    Remove personal information from deleted accounts
                  </p>
                </div>
                <Switch
                  checked={anonymizeDeletedUsers}
                  onCheckedChange={setAnonymizeDeletedUsers}
                />
              </div>

              <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm space-y-1">
                    <p className="font-medium text-yellow-900 dark:text-yellow-100">
                      GDPR Compliance
                    </p>
                    <p className="text-yellow-800 dark:text-yellow-200">
                      Ensure your data retention policies comply with GDPR and other applicable regulations.
                      Users have the right to request deletion of their personal data.
                    </p>
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
