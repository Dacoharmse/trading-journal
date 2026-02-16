"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { UserGuide } from "@/components/user-guide"

/**
 * Layout Content - Conditionally renders sidebar based on route
 * Auth pages get a clean full-screen layout
 * App pages get the sidebar layout
 */
export function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [guideOpen, setGuideOpen] = React.useState(false)

  // Auto-show guide on first visit
  React.useEffect(() => {
    try {
      const seen = localStorage.getItem('trading_journal_guide_seen')
      if (!seen) {
        setGuideOpen(true)
      }
    } catch {
      // localStorage may not be available
    }
  }, [])

  // Listen for sidebar "open guide" event
  React.useEffect(() => {
    const handler = () => setGuideOpen(true)
    window.addEventListener('open-user-guide', handler)
    return () => window.removeEventListener('open-user-guide', handler)
  }, [])

  // Auth pages should not have the sidebar
  const isAuthPage = pathname?.startsWith('/auth')

  if (isAuthPage) {
    return <>{children}</>
  }

  // Regular app pages get the sidebar
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 w-full">
        <div className="flex items-center gap-2 border-b px-4 py-2">
          <SidebarTrigger />
        </div>
        <div className="flex-1">
          {children}
        </div>
      </main>
      <UserGuide open={guideOpen} onOpenChange={setGuideOpen} />
    </SidebarProvider>
  )
}
