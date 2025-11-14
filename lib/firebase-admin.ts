import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { getStorage } from "firebase-admin/storage"

const projectId = process.env.FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
const storageBucket =
  process.env.FIREBASE_STORAGE_BUCKET && process.env.FIREBASE_STORAGE_BUCKET.includes(".")
    ? process.env.FIREBASE_STORAGE_BUCKET
    : projectId
      ? `${projectId}.appspot.com`
      : undefined

if (!projectId || !clientEmail || !privateKey) {
  throw new Error("Missing Firebase Admin credentials. Check FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY.")
}

const adminApp =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        storageBucket,
      })

const adminAuth = getAuth(adminApp)
const adminFirestore = getFirestore(adminApp)
const adminStorage = getStorage(adminApp)

export { adminApp, adminAuth, adminFirestore, adminStorage }
