# Complete Firebase Setup Guide (From Scratch)

This document provides a step-by-step guide to set up a brand-new **Google Firebase Account & Project** from scratch for **Dukandar Shandar 2.0**.

---

## 📋 Prerequisite Overview

Setting up Firebase for this application enables:
1. **Realtime Support Chat** (Firestore database)
2. **In-App Notifications** (Firestore database)
3. **FCM Web Push Notifications** (Firebase Cloud Messaging)
4. **Firebase Auth Bridge** (Session-linked custom tokens)

---

## 🚀 Step 1: Create a New Firebase Account & Project

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Log in with your Google Account (or create a new Google Account).
3. Click **"Add project"** (or **"Create a project"**).
4. Enter a **Project Name** (e.g., `dukandar-shandar-prod`).
5. (Optional) Choose whether to enable Google Analytics.
6. Click **"Create Project"** and wait for provisioning to finish (takes ~10 seconds).
7. Click **"Continue"** to enter your project dashboard.

---

## 🔐 Step 2: Enable Firebase Authentication

1. In the left navigation menu, click **Build** → **Authentication**.
2. Click **"Get Started"**.
3. Go to the **"Sign-in method"** tab.
4. Enable **"Anonymous"** authentication (this allows initial fallback guest sessions before user custom token exchange).
5. Click **Save**.

---

## 🗄️ Step 3: Create Firestore Database

1. In the left menu, click **Build** → **Firestore Database**.
2. Click **"Create database"**.
3. **Database ID**: Leave as `(default)`.
4. **Location**: Select the region closest to your target audience (e.g., `asia-south1` / Mumbai or `us-central1`).
5. **Security Rules**: Choose **"Start in production mode"** (we will deploy our secure rules in Step 7).
6. Click **"Create"**.

---

## 📱 Step 4: Register Web App & Get Public API Keys

1. Click the **Gear icon ⚙️** (next to Project Overview) → **Project Settings**.
2. Scroll down to **"Your apps"** section at the bottom.
3. Click the **Web icon (`</>`)** to add a Web App.
4. Enter App nickname: `Dukandar Shandar Web`.
5. *(Do NOT check Firebase Hosting unless you plan to host the Next.js app on Firebase Hosting).*
6. Click **"Register app"**.
7. Copy the configuration values from `const firebaseConfig = { ... }`:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

---

## 🔑 Step 5: Generate Admin SDK Service Account (Server Keys)

1. In **Project Settings ⚙️**, go to the **"Service accounts"** tab.
2. Ensure **Firebase Admin SDK** (Node.js) is selected.
3. Click **"Generate new private key"**.
4. A `.json` key file will download to your computer.
5. Open the downloaded JSON file and locate:
   - `project_id`
   - `client_email`
   - `private_key`

> ⚠️ **IMPORTANT**: Never commit this JSON file or the `private_key` to Git!

---

## 🔔 Step 6: Generate FCM Web Push VAPID Key

1. In **Project Settings ⚙️**, go to the **"Cloud Messaging"** tab.
2. Under **"Web configuration"** section:
3. Find **"Web Push certificates"**.
4. Click **"Generate key pair"**.
5. Copy the generated Key string. This is your `NEXT_PUBLIC_FIREBASE_VAPID_KEY`.

---

## 🛠️ Step 7: Deploy Security Rules & Composite Indexes

Deploy the application's Firestore rules and indexes using the Firebase CLI:

### 1. Install Firebase CLI (if not already installed)
```bash
npm install -g firebase-tools
```

### 2. Login to your Firebase Account
```bash
firebase login
```

### 3. Select your new Firebase Project
```bash
firebase use --add
# Select your newly created project from the list and give it an alias like 'default'
```

### 4. Deploy Rules & Indexes from project repository
From the project root directory, run:
```bash
firebase deploy --only firestore:rules,firestore:indexes
```

---

## ⚙️ Step 8: Configure Environment Variables (`.env.local` / Vercel)

Add the following variables to your `.env.local` file (for local development) and to **Vercel Project Settings → Environment Variables** (for production):

```env
# ==========================================
# FIREBASE PUBLIC CLIENT CONFIG (Browser)
# ==========================================
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSy..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="dukandar-shandar-prod.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="dukandar-shandar-prod"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="dukandar-shandar-prod.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789012"
NEXT_PUBLIC_FIREBASE_APP_ID="1:123456789012:web:abcdef123456789"
NEXT_PUBLIC_FIREBASE_VAPID_KEY="BElx..."
NEXT_PUBLIC_CHAT_ENABLED="true"

# ==========================================
# FIREBASE ADMIN SERVER CONFIG (Server API)
# ==========================================
FIREBASE_PROJECT_ID="dukandar-shandar-prod"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@dukandar-shandar-prod.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

> 💡 **Note on `FIREBASE_PRIVATE_KEY`**: Ensure all newlines in the key are represented as `\n` if enclosed in quotes in `.env.local`.

---

## ✅ Step 9: Verify Setup

1. Start your local server: `npm run dev`.
2. Open DevTools console & Network tab.
3. Log in as a customer user.
4. Verify `/api/firebase/token` returns `{ success: true, token: "..." }`.
5. Open `/support` page and send a test message.
6. Open `/admin/support` in another browser/incognito window to confirm realtime message sync!
