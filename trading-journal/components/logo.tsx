"use client"

import * as React from "react"
import Image from "next/image"
import { useUserStore } from "@/stores"

export function Logo({ width = 120, height = 32 }: { width?: number; height?: number }) {
  const theme = useUserStore((state) => state.user?.preferences?.theme || "system")
  const [mounted, setMounted] = React.useState(false)
  const [currentTheme, setCurrentTheme] = React.useState<"light" | "dark">("dark")

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (!mounted) return

    let effectiveTheme: "light" | "dark" = "dark"

    if (theme === "system") {
      effectiveTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
    } else {
      effectiveTheme = theme as "light" | "dark"
    }

    setCurrentTheme(effectiveTheme)

    // Listen for system theme changes
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      const handleChange = (e: MediaQueryListEvent) => {
        setCurrentTheme(e.matches ? "dark" : "light")
      }
      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    }
  }, [theme, mounted])

  if (!mounted) {
    // Return placeholder during SSR to prevent hydration mismatch
    return <div style={{ width, height }} />
  }

  const logoSrc = currentTheme === "dark"
    ? "/2gs-dark-logo.png"
    : "/2gs-light-logo.png"

  return (
    <Image
      src={logoSrc}
      alt="2GS Trading Logo"
      width={width}
      height={height}
      priority
      className="object-contain"
    />
  )
}
