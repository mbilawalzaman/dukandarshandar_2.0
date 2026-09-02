# Firebase setup notes

## Deploy Firestore rules and indexes (required)

Indexes are **not** created automatically until you deploy them or click the link in a Firestore error.

```bash
# Install Firebase CLI once: npm i -g firebase-tools
firebase login
firebase use dukandar-shandar
firebase deploy --only firestore:rules,firestore:indexes
```

Or when you see `FAILED_PRECONDITION: The query requires an index`, **click the URL in the error** → Firebase Console → **Create index** → wait until status is **Enabled** (often 2–5 minutes).

Required composite indexes (also in `firebase/firestore.indexes.json`):

- `conversations`: `type` + `updatedAt`
- `conversationMembers`: `userId` + `archived` + `updatedAt`
- `notifications`: `userId` + `createdAt`

## Local emulators

```bash
npm run emulators:firebase
```

Set in `.env.local` for emulator testing:

```
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
```

## Manual verification (Phase 1 exit)

1. Log in as a customer (not guest).
2. Open browser devtools → Network.
3. Confirm `POST /api/firebase/token` returns `{ success: true, token }`.
4. Open `/support` and send a message.
5. Log in as admin → `/admin/support` and reply.

## Security rules

Rules live in `firebase/firestore.rules`. All client writes are denied; backend uses Admin SDK.
