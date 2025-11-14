import { NextRequest, NextResponse } from "next/server"

import { adminAuth, adminStorage } from "@/lib/firebase-admin"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") ?? ""
    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const decoded = await adminAuth.verifyIdToken(token)

    const formData = await request.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 })
    }

    const userId = decoded.uid
    const originalName = (formData.get("fileName") as string) || file.name || "upload"
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_")
    const filePath = `bills/${userId}/${Date.now()}_${safeName}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const bucket = adminStorage.bucket()
    await bucket.file(filePath).save(buffer, {
      contentType: file.type || "application/octet-stream",
      resumable: false,
    })

    const storageUrl = `https://storage.googleapis.com/${bucket.name}/${encodeURIComponent(filePath)}`

    return NextResponse.json({ storageUrl, filePath })
  } catch (error) {
    console.error("Server upload error:", error)
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
  }
}
