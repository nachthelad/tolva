import { firestore } from "./firebase"
import { collection, addDoc, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore"

export interface Provider {
  id: string
  name: string
  category: string
}

export interface BillDocument {
  id: string
  userId: string
  fileName: string
  storageUrl: string
  uploadedAt: Date
  provider?: string
  amount?: number
  dueDate?: string
  status: "pending" | "parsed" | "error"
  parsedData?: Record<string, any>
}

// Providers
export async function getProviders(): Promise<Provider[]> {
  try {
    const querySnapshot = await getDocs(collection(firestore, "providers"))
    return querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as Provider,
    )
  } catch (error) {
    console.error("Error fetching providers:", error)
    return []
  }
}

// Documents
export async function createDocument(userId: string, documentData: Omit<BillDocument, "id">): Promise<string> {
  const docRef = await addDoc(collection(firestore, "documents"), {
    ...documentData,
    uploadedAt: new Date(),
  })
  return docRef.id
}

export async function getUserDocuments(userId: string): Promise<BillDocument[]> {
  const q = query(collection(firestore, "documents"), where("userId", "==", userId))
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
        uploadedAt: doc.data().uploadedAt?.toDate(),
      }) as BillDocument,
  )
}

export async function getDocument(docId: string): Promise<BillDocument | null> {
  const docRef = doc(firestore, "documents", docId)
  const docSnapshot = await getDoc(docRef)
  if (docSnapshot.exists()) {
    return {
      id: docSnapshot.id,
      ...docSnapshot.data(),
      uploadedAt: docSnapshot.data().uploadedAt?.toDate(),
    } as BillDocument
  }
  return null
}

export async function updateDocument(docId: string, updates: Partial<BillDocument>) {
  const docRef = doc(firestore, "documents", docId)
  await updateDoc(docRef, updates)
}

export async function deleteDocument(docId: string) {
  const docRef = doc(firestore, "documents", docId)
  await deleteDoc(docRef)
}
