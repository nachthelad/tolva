import type React from "react"
import { redirect } from "next/navigation"

import { ProtectedRoute } from "@/components/protected-route"
import { Sidebar } from "@/components/sidebar"
import { AmountVisibilityProvider } from "@/components/amount-visibility"
import { verifyAuthFromCookies } from "@/lib/server/require-auth"

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const auth = await verifyAuthFromCookies()
  if (!auth) {
    redirect("/auth/login")
  }

  return (
    <AmountVisibilityProvider>
      <div className="flex min-h-screen bg-background text-foreground">
        <Sidebar />
        <main className="flex-1 min-h-screen bg-background">
          <ProtectedRoute>{children}</ProtectedRoute>
        </main>
      </div>
    </AmountVisibilityProvider>
  )
}
