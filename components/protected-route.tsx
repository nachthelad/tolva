"use client"

import Link from "next/link"
import type React from "react"

import { useProtectedRouteState } from "@/lib/hooks/use-protected-route"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isChecking, isAuthenticated, errorMessage } = useProtectedRouteState()

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">{errorMessage ?? "You have been signed out."}</p>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            Return to sign in
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
