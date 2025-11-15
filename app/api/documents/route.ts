import { NextRequest, NextResponse } from "next/server"

import { Timestamp } from "firebase-admin/firestore"

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

    const payload = await request.json()
    const {
      fileName,
      storageUrl,
      provider,
      providerId,
      category,
      amount,
      totalAmount,
      currency,
      dueDate,
      issueDate,
      periodStart,
      periodEnd,
      manualEntry,
      textExtract,
    } = payload ?? {}

    if (!fileName) {
      return NextResponse.json({ error: "Missing fileName" }, { status: 400 })
    }

    const toTimestamp = (value?: string | null) => {
      if (!value) return null
      return Timestamp.fromDate(new Date(`${value}T00:00:00Z`))
    }

    const docData: Record<string, unknown> = {
      userId: decoded.uid,
      fileName,
      storageUrl: storageUrl ?? null,
      pdfUrl: storageUrl ?? null,
      status: storageUrl ? "pending" : "needs_review",
      uploadedAt: new Date(),
      manualEntry: Boolean(manualEntry),
    }

    if (provider !== undefined) docData.provider = provider || null
    if (providerId !== undefined) docData.providerId = providerId || null
    if (category !== undefined) docData.category = category || null
    if (amount !== undefined) docData.amount = amount ?? null
    if (totalAmount !== undefined) docData.totalAmount = totalAmount ?? null
    if (currency !== undefined) docData.currency = currency || null
    if (textExtract !== undefined) docData.textExtract = textExtract ?? null

    docData.dueDate = toTimestamp(dueDate)
    docData.issueDate = toTimestamp(issueDate)
    docData.periodStart = toTimestamp(periodStart)
    docData.periodEnd = toTimestamp(periodEnd)

    const docRef = await adminFirestore.collection("documents").add(docData)

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
