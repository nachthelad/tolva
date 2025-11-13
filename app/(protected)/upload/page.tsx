"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { createDocument } from "@/lib/firestore-helpers"
import { uploadBillFile } from "@/lib/storage-helpers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload } from "lucide-react"

export default function UploadPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type === "application/pdf" || selectedFile.type.startsWith("image/")) {
        setFile(selectedFile)
        setError(null)
      } else {
        setError("Please select a PDF or image file")
      }
    }
  }

  const handleUpload = async () => {
    if (!file || !user) return

    setLoading(true)
    setError(null)

    try {
      // Upload file to storage
      const storageUrl = await uploadBillFile(user.uid, file)

      // Create document record in Firestore
      const docId = await createDocument(user.uid, {
        userId: user.uid,
        fileName: file.name,
        storageUrl,
        status: "pending",
      })

      // Trigger parsing (call API route)
      await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: docId }),
      })

      router.push("/documents")
    } catch (err) {
      console.error("Upload error:", err)
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Upload Bill</h1>
        <p className="text-muted-foreground mt-2">Upload a bill to automatically parse and track it</p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Select Bill File</CardTitle>
          <CardDescription>Upload PDF or image files</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <input type="file" accept=".pdf,image/*" onChange={handleFileChange} className="hidden" id="file-input" />
            <label htmlFor="file-input" className="cursor-pointer">
              <span className="text-sm font-medium">Click to select</span>
              {file && <p className="text-xs text-muted-foreground mt-2">{file.name}</p>}
            </label>
          </div>

          {error && <div className="text-sm text-destructive">{error}</div>}

          <Button onClick={handleUpload} disabled={!file || loading} className="w-full">
            {loading ? "Uploading..." : "Upload Bill"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
