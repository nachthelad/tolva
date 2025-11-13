import { storage } from "./firebase"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"

export async function uploadBillFile(userId: string, file: File): Promise<string> {
  const timestamp = Date.now()
  const fileName = `${timestamp}_${file.name}`
  const storageRef = ref(storage, `bills/${userId}/${fileName}`)

  await uploadBytes(storageRef, file)
  const url = await getDownloadURL(storageRef)
  return url
}

export async function deleteBillFile(filePath: string) {
  const storageRef = ref(storage, filePath)
  await deleteObject(storageRef)
}
