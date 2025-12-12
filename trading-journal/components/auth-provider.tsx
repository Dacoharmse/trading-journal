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
  const supabase = React.useMemo(() => createClient(), [])
  const hasCheckedAuth = React.useRef(false)

  // Initial auth check only
  React.useEffect(() => {
    if (hasCheckedAuth.current) return

    const checkAuth = async () => {
      // Public routes that don't require authentication
      const publicRoutes = ['/auth/login', '/auth/register']

      if (publicRoutes.includes(pathname)) {
        setIsLoading(false)
        setIsAuthenticated(false)
        hasCheckedAuth.current = true
        return
      }

      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setIsAuthenticated(false)
        setIsLoading(false)
        hasCheckedAuth.current = true
        router.push('/auth/login')
        return
      }

      setIsAuthenticated(true)
      setIsLoading(false)
      hasCheckedAuth.current = true
    }

    checkAuth()
  }, [pathname, router, supabase])

  // Set up auth state listener only once
  React.useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const publicRoutes = ['/auth/login', '/auth/register']
      if (!session && !publicRoutes.includes(pathname)) {
        setIsAuthenticated(false)
        router.push('/auth/login')
      } else if (session) {
        setIsAuthenticated(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [pathname, router, supabase])

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
