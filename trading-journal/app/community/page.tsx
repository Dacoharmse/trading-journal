"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users } from "lucide-react"

export default function CommunityPage() {
  return (
    <div className="flex-1 p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>Community</CardTitle>
          </div>
          <CardDescription>
            Share insights, learn from others, and connect with traders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground space-y-4">
            <Users className="h-12 w-12 opacity-50" />
            <div className="text-center">
              <p className="text-lg font-medium">Community Features Coming Soon</p>
              <p className="text-sm">Connect with other traders and share trading insights</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
