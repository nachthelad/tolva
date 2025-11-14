import { NextRequest, NextResponse } from "next/server"

import { adminAuth, adminFirestore } from "@/lib/firebase-admin"
import { serializeDocumentSnapshot } from "@/lib/server/document-serializer"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") ?? ""
    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const decoded = await adminAuth.verifyIdToken(token)

    const { fileName, storageUrl } = await request.json()

    if (!fileName || !storageUrl) {
      return NextResponse.json({ error: "Missing fileName or storageUrl" }, { status: 400 })
    }

    const docRef = await adminFirestore.collection("documents").add({
      userId: decoded.uid,
      fileName,
      storageUrl,
      pdfUrl: storageUrl,
      status: "pending",
      uploadedAt: new Date(),
    })

    return NextResponse.json({ documentId: docRef.id })
  } catch (error) {
    console.error("Server create document error:", error)
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") ?? ""
    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const decoded = await adminAuth.verifyIdToken(token)

    const snapshot = await adminFirestore.collection("documents").where("userId", "==", decoded.uid).get()

    const documents = snapshot.docs
      .map((doc) => serializeDocumentSnapshot(doc))
      .sort((a, b) => {
        const aDate = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0
        const bDate = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0
        return bDate - aDate
      })

    return NextResponse.json({ documents })
  } catch (error) {
    console.error("Server list documents error:", error)
    return NextResponse.json({ error: "Failed to load documents" }, { status: 500 })
  }
}
