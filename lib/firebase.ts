import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app"
import { getAuth, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getStorage, type FirebaseStorage } from "firebase/storage"

type FirebaseServices = {
  app: FirebaseApp
  auth: Auth
  firestore: Firestore
  storage: FirebaseStorage
}

const firebaseEnv = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
} as const

const firebaseConfig: FirebaseOptions = {
  apiKey: firebaseEnv.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: firebaseEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: firebaseEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: firebaseEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: firebaseEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: firebaseEnv.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const missingKeys = Object.entries(firebaseEnv)
  .filter(([, value]) => !value)
  .map(([key]) => key)

let services: FirebaseServices | null = null

if (missingKeys.length > 0) {
  console.warn(
    `Firebase environment variables missing: ${missingKeys.join(
      ", "
    )}. Add them to your .env.local file to enable authentication.`
  )
} else {
  try {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
    services = {
      app,
      auth: getAuth(app),
      firestore: getFirestore(app),
      storage: getStorage(app),
    }
  } catch (error) {
    console.error("Firebase initialization error:", error)
  }
}

export const auth = services?.auth ?? null
export const firestore = services?.firestore ?? null
export const storage = services?.storage ?? null
