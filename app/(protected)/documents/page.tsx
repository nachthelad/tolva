"use client"

import { useAuth } from "@/lib/auth-context"
import { useEffect, useState } from "react"
import { getUserDocuments, type BillDocument } from "@/lib/firestore-helpers"
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
        const docs = await getUserDocuments(user.uid)
        setDocuments(docs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime()))
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
      <div className="p-8 flex items-center justify-center">
        <div className="text-muted-foreground">Loading documents...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Documents</h1>
        <p className="text-muted-foreground mt-2">View and manage your uploaded bills</p>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="pt-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No documents yet</p>
            <Link href="/upload">
              <Button>Upload Your First Bill</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => (
            <Link key={doc.id} href={`/documents/${doc.id}`}>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <FileText className="w-6 h-6 text-muted-foreground" />
                      <div className="flex-1">
                        <h3 className="font-medium">{doc.fileName}</h3>
                        <p className="text-sm text-muted-foreground">{doc.uploadedAt.toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {doc.status === "pending" && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Parsing...
                        </div>
                      )}
                      {doc.status === "parsed" && (
                        <span className="text-sm font-medium text-green-600">${doc.amount}</span>
                      )}
                      {doc.status === "error" && <span className="text-sm text-destructive">Error</span>}
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
