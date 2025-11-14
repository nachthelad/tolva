import { storage } from "./firebase"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"

function getStorageInstance() {
  if (!storage) {
    throw new Error("Firebase storage is not configured. Check your Firebase environment variables.")
  }
  return storage
}

export async function uploadBillFile(userId: string, file: File): Promise<string> {
  const timestamp = Date.now()
  const fileName = `${timestamp}_${file.name}`
  const storageRef = ref(getStorageInstance(), `bills/${userId}/${fileName}`)

  await uploadBytes(storageRef, file)
  const url = await getDownloadURL(storageRef)
  return url
}

export async function deleteBillFile(filePath: string) {
  const storageRef = ref(getStorageInstance(), filePath)
  await deleteObject(storageRef)
}
