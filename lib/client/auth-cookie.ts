"use client"

import { AUTH_COOKIE_NAME } from "@/lib/constants/auth"

function buildCookieAttributes(expires?: Date): string {
  const attributes = ["Path=/", "SameSite=Lax"]
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    attributes.push("Secure")
  }
  if (expires) {
    attributes.push(`Expires=${expires.toUTCString()}`)
  }
  return attributes.join("; ")
}

function parseExpiration(expirationTime?: string | Date): Date | undefined {
  if (!expirationTime) {
    return undefined
  }
  if (expirationTime instanceof Date) {
    return expirationTime
  }
  const timestamp = Date.parse(expirationTime)
  if (Number.isNaN(timestamp)) {
    return undefined
  }
  return new Date(timestamp)
}

export function persistAuthCookie(token: string, expirationTime?: string | Date) {
  if (typeof document === "undefined") {
    return
  }
  const expires = parseExpiration(expirationTime)
  const attributes = buildCookieAttributes(expires)
  document.cookie = `${AUTH_COOKIE_NAME}=${token}; ${attributes}`
}

export function clearAuthCookie() {
  if (typeof document === "undefined") {
    return
  }
  document.cookie = `${AUTH_COOKIE_NAME}=; Path=/; SameSite=Lax; Max-Age=0`
}
