# Local development without Firebase credentials

Some contributors only need to exercise UI flows or parser helpers locally and may not have Firebase
credentials. The runtime now validates environment variables in `lib/env.ts` and throws
`FirebaseClientInitializationError`/`FirebaseAdminInitializationError` when the SDKs are required but not
configured. This section summarizes the available fallbacks.

## Client helpers

- Client-side imports call `getFirebaseAuth()`/`getFirebaseStorage()` lazily. When the Firebase web SDK is
  not configured the getters throw `FirebaseClientInitializationError` which components can catch to skip
  client-only behavior.
- `AuthProvider` already handles this error by logging a warning and exposing `{ user: null, loading: false }`
  so the shell renders without blocking on Firebase. The upload page similarly falls back to the `/api/upload`
  route when storage credentials are missing or unauthorized.
- Stories/tests that need an authenticated user can provide their own mock implementation of the context:

```tsx
import type { ReactNode } from "react"
import type { User } from "firebase/auth"
import { AuthContext } from "@/lib/auth-context"

export function MockAuthProvider({ children, user }: { children: ReactNode; user: User }) {
  return (
    <AuthContext.Provider value={{ user, loading: false, signOut: async () => {} }}>
      {children}
    </AuthContext.Provider>
  )
}
```

Wrap only the story or test that needs `useAuth` so regular pages keep using the real provider when
credentials exist.

## Server helpers

- Server routes call `getAdminApp()`/`getAdminAuth()`/`getAdminFirestore()`/`getAdminStorage()` only when the
  handler executes. Tests or Storybook environments that never hit the API will no longer fail at import time.
- When a server route is invoked without credentials the helper throws `FirebaseAdminInitializationError`.
  Catch this error near the top of the handler to return a helpful `503` or custom mock response if you want
  to simulate data locally.

## Mocking API responses

For complete offline development you can mock authenticated API responses with static fixtures:

1. In a local-only route handler, catch `FirebaseAdminInitializationError` and return a hard-coded payload.
2. Alternatively, route requests through MSW/Playwright interceptors and respond with canned data while the
   real server stays dormant.

These options keep UI development productive even when Firebase credentials are unavailable.
