import type React from "react"
import { redirect } from "next/navigation"

import { ProtectedRoute } from "@/components/protected-route"
import { Sidebar } from "@/components/sidebar"
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
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 min-h-screen bg-background">
        <ProtectedRoute>{children}</ProtectedRoute>
      </main>
    </div>
  )
}
