'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserProfile } from '@/lib/auth-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DebugProfilePage() {
  const supabase = React.useMemo(() => createClient(), [])
  const [authUser, setAuthUser] = React.useState<any>(null)
  const [profile, setProfile] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true)

      // Get auth user
      const { data: { user } } = await supabase.auth.getUser()
      setAuthUser(user)

      // Get profile
      if (user) {
        const profileData = await getCurrentUserProfile()
        setProfile(profileData)
      }

      setLoading(false)
    }

    loadData()
  }, [supabase])

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <h1 className="text-3xl font-bold">Debug: User Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>Auth User</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs overflow-auto bg-muted p-4 rounded">
            {JSON.stringify(authUser, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Profile (from user_profiles table)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs overflow-auto bg-muted p-4 rounded">
            {JSON.stringify(profile, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
