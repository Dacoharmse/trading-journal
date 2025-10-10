"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Play } from "lucide-react"

export default function ReplayPage() {
  return (
    <div className="flex-1 p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            <CardTitle>Trade Replay</CardTitle>
          </div>
          <CardDescription>
            Review and analyze past trades with chart replay functionality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground space-y-4">
            <Play className="h-12 w-12 opacity-50" />
            <div className="text-center">
              <p className="text-lg font-medium">Trade Replay Coming Soon</p>
              <p className="text-sm">Replay your trades with synchronized charts and notes</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
