"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Target } from "lucide-react"

export default function GoalsPage() {
  return (
    <div className="flex-1 p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            <CardTitle>Goals & Targets</CardTitle>
          </div>
          <CardDescription>
            Set and track your trading goals and performance targets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground space-y-4">
            <Target className="h-12 w-12 opacity-50" />
            <div className="text-center">
              <p className="text-lg font-medium">Goals & Targets Coming Soon</p>
              <p className="text-sm">Define goals and monitor your progress toward achieving them</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
