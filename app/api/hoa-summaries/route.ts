import { NextRequest, NextResponse } from "next/server"

import { adminAuth, adminFirestore } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") ?? ""
    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const decoded = await adminAuth.verifyIdToken(token)

    const { searchParams } = request.nextUrl
    const buildingCode = searchParams.get("buildingCode")
    const unitCode = searchParams.get("unitCode")

    let queryRef = adminFirestore.collection("hoaSummaries").where("userId", "==", decoded.uid)

    if (buildingCode) {
      queryRef = queryRef.where("buildingCode", "==", buildingCode)
    }
    if (unitCode) {
      queryRef = queryRef.where("unitCode", "==", unitCode)
    }

    const snapshot = await queryRef.get()

    const toIsoString = (value: unknown): string | null => {
      if (!value) return null
      if (value instanceof Date) return value.toISOString()
      if (typeof value === "string") return value
      if (typeof value === "object" && value !== null && "toDate" in value) {
        try {
          return (value as { toDate: () => Date }).toDate().toISOString()
        } catch {
          return null
        }
      }
      return null
    }

    const summaries = snapshot.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          createdAt: toIsoString(data.createdAt),
          updatedAt: toIsoString(data.updatedAt),
        }
      })
      .sort((a, b) => {
        if (!a.periodKey || !b.periodKey) return 0
        return b.periodKey.localeCompare(a.periodKey)
      })

    return NextResponse.json({ summaries })
  } catch (error) {
    console.error("hoaSummaries GET error:", error)
    return NextResponse.json({ error: "Failed to load HOA summaries" }, { status: 500 })
  }
}
