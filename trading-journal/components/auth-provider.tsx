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

  // Single effect - rely ONLY on auth state listener, skip initial getSession call
  React.useEffect(() => {
    const supabase = createClient()
    const publicRoutes = ['/auth/login', '/auth/register']
    let mounted = true

    console.log('[AuthProvider] Setting up auth listener')

    // Set up auth state listener - this will fire INITIAL_SESSION immediately
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      console.log('[AuthProvider] Auth event:', event, 'Session:', session ? 'exists' : 'none')

      // Always update loading state to false on any auth event
      setIsLoading(false)

      // Update authentication state based on session
      if (session) {
        console.log('[AuthProvider] User authenticated')
        setIsAuthenticated(true)
      } else {
        console.log('[AuthProvider] User not authenticated')
        setIsAuthenticated(false)

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

  return <>{children}</>
}
