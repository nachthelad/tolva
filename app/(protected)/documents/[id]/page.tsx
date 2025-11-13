"use client"

import { useAuth } from "@/lib/auth-context"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { getDocument, updateDocument, deleteDocument, type BillDocument } from "@/lib/firestore-helpers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ChevronLeft, Trash2 } from "lucide-react"

export default function DocumentDetailPage() {
  const { user } = useAuth()
  const params = useParams()
  const router = useRouter()
  const docId = params.id as string

  const [document, setDocument] = useState<BillDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState<Partial<BillDocument>>({})

  useEffect(() => {
    if (!user || !docId) return

    const fetchDocument = async () => {
      try {
        const doc = await getDocument(docId)
        if (doc && doc.userId === user.uid) {
          setDocument(doc)
          setFormData(doc)
        }
      } catch (error) {
        console.error("Error fetching document:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDocument()
  }, [user, docId])

  const handleSave = async () => {
    if (!docId) return

    try {
      await updateDocument(docId, formData)
      setDocument((prev) => (prev ? { ...prev, ...formData } : null))
      setEditing(false)
    } catch (error) {
      console.error("Error saving document:", error)
    }
  }

  const handleDelete = async () => {
    if (!docId || !confirm("Are you sure?")) return

    try {
      await deleteDocument(docId)
      router.push("/documents")
    } catch (error) {
      console.error("Error deleting document:", error)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-muted-foreground">Loading document...</div>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Document not found</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <Link href="/documents" className="flex items-center gap-2 mb-8 text-primary hover:underline">
        <ChevronLeft className="w-4 h-4" />
        Back to Documents
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{document.fileName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium block mb-2">Provider</label>
              <input
                type="text"
                value={formData.provider || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, provider: e.target.value }))}
                disabled={!editing}
                className="w-full px-3 py-2 border rounded-md bg-background disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Amount</label>
              <input
                type="number"
                value={formData.amount || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, amount: Number.parseFloat(e.target.value) }))}
                disabled={!editing}
                className="w-full px-3 py-2 border rounded-md bg-background disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Due Date</label>
              <input
                type="date"
                value={formData.dueDate || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                disabled={!editing}
                className="w-full px-3 py-2 border rounded-md bg-background disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Status</label>
              <select
                value={formData.status || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as any }))}
                disabled={!editing}
                className="w-full px-3 py-2 border rounded-md bg-background disabled:opacity-50"
              >
                <option value="pending">Pending</option>
                <option value="parsed">Parsed</option>
                <option value="error">Error</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            {!editing ? (
              <>
                <Button onClick={() => setEditing(true)}>Edit</Button>
                <Button onClick={handleDelete} variant="destructive" className="ml-auto">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleSave}>Save</Button>
                <Button onClick={() => setEditing(false)} variant="outline">
                  Cancel
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
