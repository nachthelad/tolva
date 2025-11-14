import { NextRequest, NextResponse } from "next/server"

import { adminAuth, adminFirestore } from "@/lib/firebase-admin"
import { Timestamp } from "firebase-admin/firestore"

type RouteParams = { id: string }

async function authenticate(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? ""
  if (!authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized")
  }
  const token = authHeader.slice(7)
  const decoded = await adminAuth.verifyIdToken(token)
  return decoded.uid
}

async function resolveParams(params: RouteParams | Promise<RouteParams>): Promise<RouteParams> {
  if (typeof (params as Promise<RouteParams>).then === "function") {
    return await (params as Promise<RouteParams>)
  }
  return params as RouteParams
}

async function getOwnedIncomeDoc(uid: string, incomeId: string) {
  if (!incomeId) {
    throw new Error("NotFound")
  }
  const docRef = adminFirestore.collection("incomeEntries").doc(incomeId)
  const snapshot = await docRef.get()
  if (!snapshot.exists) {
    throw new Error("NotFound")
  }
  const data = snapshot.data()
  if (!data || data.userId !== uid) {
    throw new Error("Forbidden")
  }
  return { docRef, snapshot, data }
}

export async function PATCH(request: NextRequest, context: { params: RouteParams } | { params: Promise<RouteParams> }) {
  try {
    const uid = await authenticate(request)
    const params = await resolveParams(context.params)
    const incomeId = params.id
    const { docRef } = await getOwnedIncomeDoc(uid, incomeId)

    const body = await request.json()
    const updates: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
    }

    if (body.amount !== undefined) {
      const amount = Number.parseFloat(body.amount)
      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
      }
      updates.amount = amount
    }

    if (body.source !== undefined) {
      const source = String(body.source ?? "").trim()
      if (!source) {
        return NextResponse.json({ error: "Source is required" }, { status: 400 })
      }
      updates.source = source
    }

    if (body.date) {
      updates.date = Timestamp.fromDate(new Date(body.date))
    }

    await docRef.update(updates)
    const updatedSnapshot = await docRef.get()
    const updatedData = updatedSnapshot.data()
    return NextResponse.json({
      id: updatedSnapshot.id,
      amount: updatedData?.amount ?? 0,
      source: updatedData?.source ?? "Unknown",
      date: updatedData?.date?.toDate ? updatedData.date.toDate().toISOString() : new Date().toISOString(),
      currency: updatedData?.currency ?? "ARS",
    })
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error?.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (error?.message === "NotFound") {
      return NextResponse.json({ error: "Income entry not found" }, { status: 404 })
    }
    console.error("Income PATCH error:", error)
    return NextResponse.json({ error: "Failed to update income entry" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: { params: RouteParams } | { params: Promise<RouteParams> }) {
  try {
    const uid = await authenticate(request)
    const params = await resolveParams(context.params)
    const incomeId = params.id
    const { docRef } = await getOwnedIncomeDoc(uid, incomeId)
    await docRef.delete()
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error?.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (error?.message === "NotFound") {
      return NextResponse.json({ error: "Income entry not found" }, { status: 404 })
    }
    console.error("Income DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete income entry" }, { status: 500 })
  }
}
