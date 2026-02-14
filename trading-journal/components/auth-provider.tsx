"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { XCircle } from "lucide-react"

const WHOP_CHECK_INTERVAL = 30 * 60 * 1000 // 30 minutes

/**
 * Auth Provider - Redirects to login if not authenticated
 * Also verifies WHOP membership on login
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isLoading, setIsLoading] = React.useState(true)
  const [isAuthenticated, setIsAuthenticated] = React.useState(false)
  const [membershipBlocked, setMembershipBlocked] = React.useState(false)
  const [membershipError, setMembershipError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const supabase = createClient()
    const publicRoutes = ['/auth/login', '/auth/register']
    let mounted = true

    const checkWhopMembership = async (): Promise<boolean> => {
      // Check if we recently verified (within 30 min)
      try {
        const lastCheck = sessionStorage.getItem('whop_last_check')
        const cachedResult = sessionStorage.getItem('whop_check_result')
        const now = Date.now()

        if (lastCheck && cachedResult && (now - parseInt(lastCheck)) < WHOP_CHECK_INTERVAL) {
          return cachedResult === 'ok'
        }
      } catch {
        // sessionStorage may not be available
      }

      try {
        const res = await fetch('/api/whop/check', { method: 'POST' })
        const data = await res.json()

        try {
          sessionStorage.setItem('whop_last_check', String(Date.now()))
          sessionStorage.setItem('whop_check_result', data.verified ? 'ok' : 'blocked')
          if (!data.verified) {
            sessionStorage.setItem('whop_check_error', data.error || 'Membership expired')
          }
        } catch {
          // sessionStorage may not be available
        }

        if (!data.verified && !data.fallback) {
          return false
        }

        return true
      } catch {
        // If check fails, allow access (fail open)
        return true
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (session) {
        // Verify WHOP membership
        const membershipValid = await checkWhopMembership()

        if (!mounted) return

        if (!membershipValid) {
          setMembershipBlocked(true)
          try {
            setMembershipError(
              sessionStorage.getItem('whop_check_error') || 'Your WHOP membership is no longer active.'
            )
          } catch {
            setMembershipError('Your WHOP membership is no longer active.')
          }
          setIsAuthenticated(false)
          setIsLoading(false)
          await supabase.auth.signOut()
          return
        }

        setMembershipBlocked(false)
        setMembershipError(null)
        setIsAuthenticated(true)
      } else {
        setIsAuthenticated(false)
        if (!publicRoutes.includes(pathname)) {
          router.push('/auth/login')
        }
      }

      setIsLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [pathname, router])

  if (membershipBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold">Membership Expired</h2>
          <p className="text-muted-foreground">
            {membershipError}
          </p>
          <p className="text-sm text-muted-foreground">
            Please renew your Trading Mastery subscription on WHOP to regain access.
          </p>
          <div className="flex gap-2 justify-center">
            <a
              href="https://whop.com/2g-s-trading/trading-mastery-77/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Renew on WHOP
            </a>
            <button
              onClick={() => {
                setMembershipBlocked(false)
                setMembershipError(null)
                try {
                  sessionStorage.removeItem('whop_last_check')
                  sessionStorage.removeItem('whop_check_result')
                  sessionStorage.removeItem('whop_check_error')
                } catch {
                  // ignore
                }
                router.push('/auth/login')
              }}
              className="px-4 py-2 border rounded-md hover:bg-accent"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const publicRoutes = ['/auth/login', '/auth/register']
  if (publicRoutes.includes(pathname)) {
    return <>{children}</>
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
