"use client"

import { useMemo } from "react"

import { useAuth } from "@/lib/auth-context"

export function useProtectedRouteState() {
  const { user, loading } = useAuth()

  const state = useMemo(() => {
    const isAuthenticated = Boolean(user)
    return {
      isChecking: loading,
      isAuthenticated,
      errorMessage: loading || isAuthenticated ? null : "Your session has expired. Please sign in again.",
    }
  }, [loading, user])

  return state
}
