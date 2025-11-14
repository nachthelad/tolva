"use client"

import { useAuth } from "@/lib/auth-context"
import { useEffect, useState } from "react"
import type { BillDocument } from "@/lib/firestore-helpers"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { FileText, Loader2 } from "lucide-react"

export default function DocumentsPage() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<BillDocument[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchDocuments = async () => {
      try {
        const token = await user.getIdToken()
        const response = await fetch("/api/documents", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error ?? "Failed to load documents")
        }

        const data = await response.json()
        const docs = (data.documents as BillDocument[]).map((doc) => ({
          ...doc,
          uploadedAt: doc.uploadedAt ? new Date(doc.uploadedAt) : new Date(),
        }))

        setDocuments(docs)
      } catch (error) {
        console.error("Error fetching documents:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDocuments()
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading documents...</div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 bg-slate-950 text-slate-100 min-h-screen space-y-8">
      <div>
        <p className="text-sm uppercase tracking-wide text-slate-500">Library</p>
        <h1 className="text-3xl font-bold">Documents</h1>
        <p className="text-slate-400 mt-2">View and manage your uploaded bills.</p>
      </div>

      {documents.length === 0 ? (
        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="pt-12 text-center text-slate-400">
            <FileText className="w-12 h-12 mx-auto mb-4 text-slate-600" />
            <p className="mb-4">No documents yet.</p>
            <Link href="/upload">
              <Button className="bg-emerald-500 text-slate-900 hover:bg-emerald-400">Upload Your First Bill</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => (
            <Link key={doc.id} href={`/documents/${doc.id}`}>
              <Card className="cursor-pointer transition border-slate-800 bg-slate-900/70 hover:border-slate-700">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <FileText className="w-6 h-6 text-slate-500" />
                      <div className="flex-1">
                        <h3 className="font-medium text-slate-100">{doc.fileName}</h3>
                        <p className="text-sm text-slate-500">{doc.uploadedAt.toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      {doc.status === "pending" && (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Parsing...
                        </div>
                      )}
                      {doc.status === "parsed" && (
                        <span className="font-medium text-emerald-400">
                          ARS ${doc.amount ?? doc.totalAmount ?? "-"}
                        </span>
                      )}
                      {doc.status === "needs_review" && <span className="text-amber-400">Needs review</span>}
                      {doc.status === "error" && <span className="text-red-400">Error</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
