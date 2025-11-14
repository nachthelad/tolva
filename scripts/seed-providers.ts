import dotenv from "dotenv"
import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

import { PROVIDERS } from "../lib/providers"

dotenv.config({ path: ".env.local" })
dotenv.config()

const requiredEnv = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
] as const

const missing = requiredEnv.filter((key) => !process.env[key])

if (missing.length > 0) {
  throw new Error(`Missing required Firebase env variables: ${missing.join(", ")}`)
}

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      })

const db = getFirestore(app)

async function seedProviders() {
  console.log("Seeding providers...")

  for (const provider of PROVIDERS) {
    await db.collection("providers").doc(provider.id).set(provider)
  }

  console.log("Providers seeded successfully")
  process.exit(0)
}

seedProviders().catch((error) => {
  console.error("Failed to seed providers:", error)
  process.exit(1)
})
