"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

/**
 * Auth Provider - Redirects to login if not authenticated
 * Wraps the entire app to protect routes
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isLoading, setIsLoading] = React.useState(true)
  const [isAuthenticated, setIsAuthenticated] = React.useState(false)
  const [isActive, setIsActive] = React.useState(true)

  // Single effect - rely ONLY on auth state listener, skip initial getSession call
  React.useEffect(() => {
    const supabase = createClient()
    const publicRoutes = ['/auth/login', '/auth/register']
    let mounted = true

    console.log('[AuthProvider] Setting up auth listener')

    // Check if user account is active
    const checkActiveStatus = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('is_active, role')
          .eq('user_id', userId)
          .single()

        if (error) {
          console.error('[AuthProvider] Failed to check active status:', error)
          return true // Allow access if check fails
        }

        // Admins are always active
        if (data?.role === 'admin') return true

        return data?.is_active ?? false
      } catch {
        return true // Allow access if check fails
      }
    }

    // Set up auth state listener - this will fire INITIAL_SESSION immediately
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      console.log('[AuthProvider] Auth event:', event, 'Session:', session ? 'exists' : 'none')

      // Update authentication state based on session
      if (session) {
        console.log('[AuthProvider] User authenticated')
        setIsAuthenticated(true)

        // Check if user is active
        const active = await checkActiveStatus(session.user.id)
        if (mounted) {
          setIsActive(active)
          setIsLoading(false)
          if (!active) {
            console.log('[AuthProvider] User account is not active')
          }
        }
      } else {
        console.log('[AuthProvider] User not authenticated')
        setIsAuthenticated(false)
        setIsActive(true)
        setIsLoading(false)

        // Only redirect if on protected route
        if (!publicRoutes.includes(pathname)) {
          console.log('[AuthProvider] Redirecting to login')
          router.push('/auth/login')
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [pathname, router])

  // Show loading state while checking auth
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

  // Show login page content immediately for public routes
  const publicRoutes = ['/auth/login', '/auth/register']
  if (publicRoutes.includes(pathname)) {
    return <>{children}</>
  }

  // Only show protected content if authenticated
  if (!isAuthenticated) {
    return null
  }

  // Show pending approval screen for inactive users
  if (!isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
            <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Account Pending Approval</h2>
          <p className="text-muted-foreground mb-6">
            Your account is currently being reviewed by an administrator.
            You will be able to access the trading journal once your WHOP membership has been verified and your account has been approved.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            If you believe this is an error, please contact support.
          </p>
          <button
            onClick={async () => {
              const supabase = createClient()
              await supabase.auth.signOut()
              router.push('/auth/login')
            }}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
