"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  Calendar,
  BookOpen,
  Settings,
  FileText,
  PieChart,
  Wallet,
  Trophy,
  Users,
  LogOut,
  Beaker,
  Shield,
  UserCheck,
  GraduationCap,
  MessageSquare,
  Bell,
  Eye,
  Share2,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getCurrentUserProfile } from "@/lib/auth-utils"
import type { UserProfile } from "@/types/mentorship"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { Logo } from "@/components/logo"

// Trading Journal Navigation Items
const mainNavItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Trades",
    url: "/trades",
    icon: TrendingUp,
  },
  {
    title: "Calendar",
    url: "/calendar",
    icon: Calendar,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
  },
  {
    title: "Reports",
    url: "/reports",
    icon: FileText,
  },
]

const tradingTools = [
  {
    title: "Playbook",
    url: "/playbook",
    icon: BookOpen,
    description: "Trading strategies and rules",
  },
  {
    title: "Backtesting Lab",
    url: "/backtesting",
    icon: Beaker,
    description: "Validate strategies with backtests",
  },
  {
    title: "Performance",
    url: "/performance",
    icon: Trophy,
    description: "Track your progress",
  },
  {
    title: "Risk Management",
    url: "/risk",
    icon: PieChart,
    description: "Manage your risk",
  },
]

const dataTools = [
  {
    title: "Accounts",
    url: "/accounts",
    icon: Wallet,
    description: "Manage accounts",
  },
]

const adminNavItems = [
  {
    title: "Admin Dashboard",
    url: "/admin",
    icon: Shield,
    description: "Admin control panel",
  },
  {
    title: "Manage Users",
    url: "/admin/users",
    icon: Users,
    description: "User management",
  },
  {
    title: "Mentor Applications",
    url: "/admin/mentors/applications",
    icon: GraduationCap,
    description: "Review mentor applications",
  },
]

const mentorNavItems = [
  {
    title: "Mentor Dashboard",
    url: "/mentor",
    icon: UserCheck,
    description: "Your mentor dashboard",
  },
  {
    title: "Trade Reviews",
    url: "/mentor/reviews",
    icon: MessageSquare,
    description: "Review student trades",
  },
  {
    title: "My Students",
    url: "/mentor/students",
    icon: Users,
    description: "Manage students",
  },
  {
    title: "Share Playbook",
    url: "/mentor/playbooks",
    icon: Share2,
    description: "Share playbooks with students",
  },
  {
    title: "Publish Trade",
    url: "/mentor/publish",
    icon: Eye,
    description: "Publish educational trades",
  },
]

const bottomItems = [
  {
    title: "Community",
    url: "/community",
    icon: Users,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter()
  const [userEmail, setUserEmail] = React.useState<string | null>(null)
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null)
  const [unreadNotifications, setUnreadNotifications] = React.useState(0)

  React.useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserEmail(user?.email || null)

      if (user) {
        // Get user profile with role information
        const profile = await getCurrentUserProfile()
        setUserProfile(profile)

        // Get unread notifications count
        if (profile) {
          const { count } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', profile.id)
            .eq('is_read', false)

          setUnreadNotifications(count || 0)
        }
      }
    }
    checkUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email || null)
      if (!session) {
        setUserProfile(null)
        setUnreadNotifications(0)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/" className="flex items-center justify-center w-full py-4">
              <Logo width={140} height={38} />
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* New Trade Button */}
        <SidebarGroup className="px-2 py-2">
          <Button
            className="w-full bg-black hover:bg-gray-800 text-white dark:bg-white dark:text-black dark:hover:bg-gray-200"
            onClick={() => router.push('/trades?new=true')}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Trade
          </Button>
        </SidebarGroup>

        {/* Admin Section - Only visible to admins */}
        {userProfile?.role === 'admin' && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.description}>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Mentor Section - Only visible to approved mentors */}
        {userProfile?.is_mentor && userProfile?.mentor_approved && (
          <SidebarGroup>
            <SidebarGroupLabel>Mentorship</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {mentorNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.description}>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Trading Tools */}
        <SidebarGroup>
          <SidebarGroupLabel>Trading Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {tradingTools.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.description}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Data & Import */}
        <SidebarGroup>
          <SidebarGroupLabel>Data</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dataTools.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.description}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {/* Notifications */}
          {userProfile && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/notifications" className="relative">
                  <Bell />
                  <span>Notifications</span>
                  {unreadNotifications > 0 && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs rounded-full h-5 min-w-5 flex items-center justify-center px-1">
                      {unreadNotifications > 99 ? '99+' : unreadNotifications}
                    </span>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {/* Apply to be a Mentor - Show if not a mentor */}
          {userProfile && !userProfile.is_mentor && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/mentor/apply">
                  <GraduationCap />
                  <span>Become a Mentor</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {userEmail && (
            <SidebarMenuItem>
              <div className="px-2 py-2 text-xs text-muted-foreground truncate">
                {userEmail}
              </div>
            </SidebarMenuItem>
          )}
          {bottomItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <Link href={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          {userEmail && (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleSignOut}>
                <LogOut />
                <span>Sign Out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {!userEmail && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/auth/login">
                  <LogOut />
                  <span>Sign In</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
