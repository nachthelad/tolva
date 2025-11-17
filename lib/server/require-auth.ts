import "server-only"

import { cookies } from "next/headers"
import type { DecodedIdToken } from "firebase-admin/auth"

import { getAdminAuth } from "@/lib/firebase-admin"
import { AUTH_COOKIE_NAME } from "@/lib/constants/auth"

export async function verifyAuthFromCookies(): Promise<DecodedIdToken | null> {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value
  if (!token) {
    return null
  }

  try {
    return await getAdminAuth().verifyIdToken(token)
  } catch (error) {
    console.warn("Invalid auth cookie", error)
    return null
  }
}
