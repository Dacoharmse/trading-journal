"use client"

import * as React from "react"

interface GaugeProps {
  value: number // 0-100
  size?: number
  strokeWidth?: number
  color?: string
  label?: string
  sublabel?: string
  showValue?: boolean
}

export function Gauge({
  value,
  size = 100,
  strokeWidth = 12,
  color = "#22c55e",
  label,
  sublabel,
  showValue = true
}: GaugeProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted-foreground/20"
        />

        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
        />

        {/* Center text */}
        {showValue && (
          <text
            x={size / 2}
            y={size / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-foreground font-bold transform rotate-90"
            style={{ fontSize: size * 0.2 }}
          >
            {Math.round(value)}%
          </text>
        )}
      </svg>

      {label && (
        <div className="mt-2 text-center">
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          {sublabel && (
            <div className="text-xs text-muted-foreground/70">{sublabel}</div>
          )}
        </div>
      )}
    </div>
  )
}
