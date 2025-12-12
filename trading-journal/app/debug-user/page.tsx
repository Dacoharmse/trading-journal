"use client"

import { useEffect, useState } from "react"
import { useUserStore } from "@/stores"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DebugUserPage() {
  const user = useUserStore((state) => state.user)
  const fetchUser = useUserStore((state) => state.fetchUser)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      await fetchUser()
      setLoading(false)
    }
    load()
  }, [fetchUser])

  if (loading) {
    return <div className="p-8">Loading user data...</div>
  }

  return (
    <div className="p-8">
      <Card>
        <CardHeader>
          <CardTitle>User Data Debug</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg overflow-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
