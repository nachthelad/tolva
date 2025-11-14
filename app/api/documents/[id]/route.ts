import { NextRequest, NextResponse } from "next/server"

import { adminAuth, adminFirestore } from "@/lib/firebase-admin"
import { serializeDocumentSnapshot } from "@/lib/server/document-serializer"
import { Timestamp } from "firebase-admin/firestore"

type RouteContext = {
  params: Promise<{ id: string }> | { id: string }
}

async function resolveParams(params: RouteContext["params"]) {
  return typeof (params as any).then === "function" ? await (params as Promise<{ id: string }>) : (params as { id: string })
}

async function getAuthorizedDocument(request: NextRequest, params: RouteContext["params"]) {
  const authHeader = request.headers.get("authorization") ?? ""
  if (!authHeader.startsWith("Bearer ")) {
    return { errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const token = authHeader.slice(7)
  const decoded = await adminAuth.verifyIdToken(token)

  const resolvedParams = await resolveParams(params)
  const docRef = adminFirestore.collection("documents").doc(resolvedParams.id)
  const docSnapshot = await docRef.get()

  if (!docSnapshot.exists) {
    return { errorResponse: NextResponse.json({ error: "Document not found" }, { status: 404 }) }
  }

  const documentData = docSnapshot.data()
  if (documentData?.userId && documentData.userId !== decoded.uid) {
    return { errorResponse: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }

  return { docRef, docSnapshot }
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await getAuthorizedDocument(request, context.params)
    if ("errorResponse" in authResult && authResult.errorResponse) {
      return authResult.errorResponse
    }

    return NextResponse.json(serializeDocumentSnapshot(authResult.docSnapshot))
  } catch (error) {
    console.error("Document GET error:", error)
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await getAuthorizedDocument(request, context.params)
    if ("errorResponse" in authResult && authResult.errorResponse) {
      return authResult.errorResponse
    }

    const { docRef } = authResult
    const { provider, amount, dueDate, status } = await request.json()

    const updates: Record<string, any> = {}

    if (provider !== undefined) updates.provider = provider || null
    if (amount !== undefined) updates.amount = amount ?? null
    if (status) updates.status = status

    if (dueDate !== undefined) {
      updates.dueDate = dueDate ? Timestamp.fromDate(new Date(`${dueDate}T00:00:00Z`)) : null
    }

    updates.updatedAt = new Date()

    await docRef.update(updates)
    const updatedSnapshot = await docRef.get()

    return NextResponse.json(serializeDocumentSnapshot(updatedSnapshot))
  } catch (error) {
    console.error("Document PATCH error:", error)
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await getAuthorizedDocument(request, context.params)
    if ("errorResponse" in authResult && authResult.errorResponse) {
      return authResult.errorResponse
    }

    const { docRef } = authResult
    await docRef.delete()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Document DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 })
  }
}
