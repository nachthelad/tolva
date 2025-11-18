import { z } from "zod"

export class EnvValidationError extends Error {
  readonly scope: "client" | "server"
  readonly issues: string[]

  constructor(scope: "client" | "server", issues: string[]) {
    const description = issues.length ? issues.join("; ") : "Unknown validation failure"
    super(`Missing or invalid ${scope} environment variables: ${description}`)
    this.scope = scope
    this.issues = issues
  }
}

const clientEnvSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1, "NEXT_PUBLIC_FIREBASE_API_KEY is required"),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1, "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is required"),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1, "NEXT_PUBLIC_FIREBASE_PROJECT_ID is required"),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z
    .string()
    .min(1, "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is required"),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z
    .string()
    .min(1, "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID is required"),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1, "NEXT_PUBLIC_FIREBASE_APP_ID is required"),
})

const serverEnvSchema = z.object({
  FIREBASE_PROJECT_ID: z.string().min(1, "FIREBASE_PROJECT_ID is required"),
  FIREBASE_CLIENT_EMAIL: z.string().min(1, "FIREBASE_CLIENT_EMAIL is required"),
  FIREBASE_PRIVATE_KEY: z.string().min(1, "FIREBASE_PRIVATE_KEY is required"),
  FIREBASE_STORAGE_BUCKET: z.string().optional(),
})

export type ClientEnv = z.infer<typeof clientEnvSchema>
export type ServerEnv = z.infer<typeof serverEnvSchema>

let cachedClientEnv: ClientEnv | null = null
let cachedServerEnv: ServerEnv | null = null

function formatIssues(error: z.ZodError): string[] {
  const fieldErrors = error.flatten().fieldErrors
  const issues: string[] = []
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (!messages?.length) continue
    for (const message of messages) {
      issues.push(`${field}: ${message}`)
    }
  }
  const formErrors = error.flatten().formErrors
  issues.push(...formErrors)
  return issues
}

function validateEnv<T extends ClientEnv | ServerEnv>(
  schema: z.ZodSchema<T>,
  values: Record<string, string | undefined>,
  scope: "client" | "server",
): T {
  const result = schema.safeParse(values)
  if (!result.success) {
    throw new EnvValidationError(scope, formatIssues(result.error))
  }
  return result.data
}

export function getClientEnv(): ClientEnv {
  if (cachedClientEnv) {
    return cachedClientEnv
  }
  cachedClientEnv = validateEnv(
    clientEnvSchema,
    {
      NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    },
    "client",
  )
  return cachedClientEnv
}

export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) {
    return cachedServerEnv
  }
  cachedServerEnv = validateEnv(
    serverEnvSchema,
    {
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
      FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
    },
    "server",
  )
  return cachedServerEnv
}

export function isClientEnvConfigured(): boolean {
  try {
    getClientEnv()
    return true
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        error instanceof Error
          ? error.message
          : "Client environment variables are missing or invalid.",
      )
    }
    return false
  }
}
