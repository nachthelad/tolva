import type { DocumentSnapshot } from "firebase-admin/firestore"

type MaybeTimestamp = {
  toDate?: () => Date
}

function toDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === "string") {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  if (typeof value === "object" && value !== null && "toDate" in (value as MaybeTimestamp)) {
    try {
      return (value as MaybeTimestamp).toDate?.() ?? null
    } catch {
      return null
    }
  }
  return null
}

function toIsoDate(value: unknown): string | null {
  const parsed = toDate(value)
  if (!parsed) return null
  return parsed.toISOString().slice(0, 10)
}

function toIsoDateTime(value: unknown): string | null {
  const parsed = toDate(value)
  if (!parsed) return null
  return parsed.toISOString()
}

export function serializeDocumentSnapshot(doc: DocumentSnapshot): Record<string, any> {
  const data = doc.data() ?? {}
  const { id: _ignoredId, ...rest } = data as Record<string, unknown>

  return {
    ...rest,
    id: doc.id,
    uploadedAt: toIsoDateTime(data.uploadedAt),
    issueDate: toIsoDate(data.issueDate),
    dueDate: toIsoDate(data.dueDate),
    periodStart: toIsoDate(data.periodStart),
    periodEnd: toIsoDate(data.periodEnd),
    lastParsedAt: toIsoDateTime(data.lastParsedAt),
  }
}
