# API Client helpers

The `lib/api-client.ts` module provides a thin wrapper around `fetch` for calling the app's authenticated API routes from client components. It automatically:

- Retrieves the current Firebase ID token (using the callback you pass in).
- Injects the `Authorization: Bearer <token>` header.
- Parses JSON responses with shared Zod schemas from `lib/api-schemas.ts`.
- Throws a typed `ApiError` that exposes `status`, `code`, and `details` fields.
- Retries transient errors (HTTP 408/425/429/5xx or network failures) with a short exponential backoff.

## Creating a client instance

```ts
import { createApiClient } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"

const { user } = useAuth()
const apiClient = useMemo(() => {
  if (!user) return null
  return createApiClient({ getToken: () => user.getIdToken() })
}, [user])
```

The only required option is `getToken`, a function that resolves to the current Firebase ID token. Optional `baseUrl`, `retries`, and `retryDelayMs` can be provided for advanced scenarios (e.g., testing against a staging host).

## Available helpers

The client exposes strongly-typed methods that reuse the server validation schemas defined in `lib/api-schemas.ts`:

- `listDocuments()` → `Promise<BillDocument[]>` – loads the current user's documents and normalizes timestamps to `Date` objects.
- `createDocument(payload: CreateDocumentInput)` → `Promise<string>` – validates and creates a document record, returning the new `documentId`.
- `triggerParse(documentId: string)` → `Promise<void>` – requests parsing for a document via `/api/parse`.
- `fetchDashboardSummary()` → `Promise<DashboardSummary | null>` – retrieves the cached dashboard summary if one exists.
- `saveDashboardSummary(summary: DashboardSummary)` → `Promise<void>` – persists dashboard summary metrics.
- `uploadFile(file: File, fileName?: string)` → `Promise<string>` – uploads a file through the server endpoint and returns the resulting `storageUrl`.

Because these helpers validate requests and responses with shared Zod schemas, UI components can rely on consistent shapes without duplicating parsing code.

## Error handling

Errors thrown by the helpers are instances of `ApiError`. You can display user-friendly messages or branch on status codes:

```ts
try {
  await apiClient.triggerParse(documentId)
} catch (error) {
  if (error instanceof ApiError && error.status === 401) {
    // Prompt the user to re-authenticate
  } else {
    console.error("Parse failed", error)
  }
}
```

## Adding new endpoints

When building a new feature:

1. Define or reuse a Zod schema in `lib/api-schemas.ts` for the request/response payload.
2. Import that schema in both the API route and `lib/api-client.ts` to ensure server + client validation stay in sync.
3. Extend the client with a new helper that calls the route using `request()`.
4. Document the helper here so the next contributor knows it exists.
