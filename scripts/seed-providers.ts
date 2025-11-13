import { initializeApp } from "firebase/app"
import { getFirestore, collection, addDoc } from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
const firestore = getFirestore(app)

const providers = [
  { name: "Electric Company", category: "Utilities" },
  { name: "Water Department", category: "Utilities" },
  { name: "Internet Provider", category: "Communications" },
  { name: "Mobile Phone", category: "Communications" },
  { name: "Gym Membership", category: "Fitness" },
  { name: "Streaming Service", category: "Entertainment" },
]

async function seedProviders() {
  try {
    console.log("Seeding providers...")
    for (const provider of providers) {
      await addDoc(collection(firestore, "providers"), provider)
    }
    console.log("✓ Providers seeded successfully")
  } catch (error) {
    console.error("Error seeding providers:", error)
  }
  process.exit(0)
}

seedProviders()
