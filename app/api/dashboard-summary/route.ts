import { NextRequest, NextResponse } from "next/server"

import { adminAuth, adminFirestore } from "@/lib/firebase-admin"
import { Timestamp } from "firebase-admin/firestore"

const COLLECTION = "dashboardSummaries"

export async function GET(request: NextRequest) {
  try {
    const { uid } = await authenticate(request)
    const docRef = adminFirestore.collection(COLLECTION).doc(uid)
    const snapshot = await docRef.get()
    if (!snapshot.exists) {
      return NextResponse.json({ summary: null })
    }
    const data = snapshot.data()
    return NextResponse.json({
      summary: {
        totals: data?.totals ?? null,
        categories: data?.categories ?? null,
        incomeSources: data?.incomeSources ?? null,
        updatedAt: data?.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data?.updatedAt ?? null,
      },
    })
  } catch (error) {
    console.error("Dashboard summary GET error:", error)
    return NextResponse.json({ summary: null }, { status: 200 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { uid } = await authenticate(request)
    const payload = await request.json()
    const docRef = adminFirestore.collection(COLLECTION).doc(uid)
    await docRef.set(
      {
        totals: payload.totals ?? {},
        categories: payload.categories ?? {},
        incomeSources: payload.incomeSources ?? {},
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Dashboard summary POST error:", error)
    return NextResponse.json({ error: "Failed to save summary" }, { status: 500 })
  }
}

async function authenticate(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? ""
  if (!authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized")
  }
  const token = authHeader.slice(7)
  const decoded = await adminAuth.verifyIdToken(token)
  return { uid: decoded.uid }
}
