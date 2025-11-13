import { type NextRequest, NextResponse } from "next/server"
import { getDocument, updateDocument } from "@/lib/firestore-helpers"

export async function POST(request: NextRequest) {
  try {
    const { documentId } = await request.json()

    if (!documentId) {
      return NextResponse.json({ error: "Missing documentId" }, { status: 400 })
    }

    // Fetch document from Firestore
    const document = await getDocument(documentId)

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Call Python parsing microservice
    // This is a placeholder - in production, integrate with your Python service
    const parsedData = await callPythonParser(document.storageUrl)

    // Update document with parsed data
    await updateDocument(documentId, {
      status: "parsed",
      parsedData,
      provider: parsedData?.provider,
      amount: parsedData?.amount,
      dueDate: parsedData?.dueDate,
    })

    return NextResponse.json({ success: true, documentId })
  } catch (error) {
    console.error("Parse error:", error)
    return NextResponse.json({ error: "Failed to parse document" }, { status: 500 })
  }
}

async function callPythonParser(fileUrl: string) {
  // TODO: Replace with actual Python microservice endpoint
  // Example: const response = await fetch('https://your-python-service.com/parse', { ... })

  // Mock response for demonstration
  return {
    provider: "Electric Company",
    amount: 125.5,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    account: "12345678",
  }
}
