"use client"

import type React from "react"
import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from "firebase/auth"

import { FirebaseClientInitializationError, getFirebaseAuth } from "./firebase"

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const getAuthInstance = useMemo(() => {
    return () => {
      try {
        return getFirebaseAuth()
      } catch (error) {
        if (error instanceof FirebaseClientInitializationError) {
          console.warn("Firebase auth unavailable:", error.message)
          return null
        }
        throw error
      }
    }
  }, [])

  useEffect(() => {
    const auth = getAuthInstance()
    if (!auth) {
      setLoading(false)
      setUser(null)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [getAuthInstance])

  const signOut = async () => {
    const auth = getAuthInstance()
    if (!auth) {
      console.warn("Attempted to sign out without Firebase auth configured.")
      return
    }

    try {
      await firebaseSignOut(auth)
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }

  return <AuthContext.Provider value={{ user, loading, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
