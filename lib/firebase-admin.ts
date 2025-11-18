import { cert, getApps, initializeApp, type App } from "firebase-admin/app"
import { getAuth, type Auth } from "firebase-admin/auth"
import { getFirestore, type Firestore } from "firebase-admin/firestore"
import { getStorage, type Storage } from "firebase-admin/storage"

import { EnvValidationError, getServerEnv } from "./env"

export class FirebaseAdminInitializationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message)
    if (options?.cause) {
      this.cause = options.cause
    }
    this.name = "FirebaseAdminInitializationError"
  }
}

let cachedApp: App | null = null
let cachedAuth: Auth | null = null
let cachedFirestore: Firestore | null = null
let cachedStorage: Storage | null = null
let cachedError: FirebaseAdminInitializationError | null = null

function buildAdminApp(): App {
  const env = getServerEnv()
  const projectId = env.FIREBASE_PROJECT_ID
  const clientEmail = env.FIREBASE_CLIENT_EMAIL
  const privateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
  const storageBucket = env.FIREBASE_STORAGE_BUCKET && env.FIREBASE_STORAGE_BUCKET.includes(".")
    ? env.FIREBASE_STORAGE_BUCKET
    : `${projectId}.appspot.com`

  return (
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket,
    })
  )
}

function ensureAdminApp(): App {
  if (cachedApp) {
    return cachedApp
  }

  if (cachedError) {
    throw cachedError
  }

  try {
    cachedApp = buildAdminApp()
    return cachedApp
  } catch (error) {
    const wrapped =
      error instanceof FirebaseAdminInitializationError
        ? error
        : new FirebaseAdminInitializationError(
            error instanceof EnvValidationError
              ? error.message
              : error instanceof Error
                ? error.message
                : "Unknown Firebase Admin initialization error",
            { cause: error },
          )
    cachedError = wrapped
    throw wrapped
  }
}

export function getAdminApp(): App {
  return ensureAdminApp()
}

export function getAdminAuth(): Auth {
  if (!cachedAuth) {
    cachedAuth = getAuth(ensureAdminApp())
  }
  return cachedAuth
}

export function getAdminFirestore(): Firestore {
  if (!cachedFirestore) {
    cachedFirestore = getFirestore(ensureAdminApp())
  }
  return cachedFirestore
}

export function getAdminStorage(): Storage {
  if (!cachedStorage) {
    cachedStorage = getStorage(ensureAdminApp())
  }
  return cachedStorage
}
