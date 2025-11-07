# Firebase Authentication & Firestore Architecture - Summary

## Project Overview
The vid_ad project (AI Video Ad Generator) implements a complete Firebase authentication and Firestore integration pattern using Next.js 16 with TypeScript.

---

## 1. Firebase Configuration

### File: `/Applications/Gauntlet/marin/vid_ad/lib/firebase/config.ts`

**Purpose:** Client-side Firebase initialization and service exports

**Key Features:**
- Initializes Firebase with environment variables
- Exports Auth, Firestore, Storage, Analytics, and Functions services
- Supports Firebase Emulator for local development
- Handles SSR/CSR compatibility with conditional window checks

**Code Pattern:**
```typescript
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Singleton pattern - prevent multiple initializations
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0]!;
}
```

**Environment Variables Required:**
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abc...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

---

## 2. Admin SDK (Server-Side)

### File: `/Applications/Gauntlet/marin/vid_ad/lib/firebase/admin.ts`

**Purpose:** Server-side Firebase Admin SDK initialization for secure operations

**Key Features:**
- Admin authentication with service account credentials
- Token verification and custom claims
- User management utilities
- Only runs on server (Node.js environment)

**Code Pattern:**
```typescript
import { initializeApp, getApps, cert, ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const serviceAccount: ServiceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
};

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: `${process.env.FIREBASE_ADMIN_PROJECT_ID}.appspot.com`,
  });
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
export const adminStorage = getStorage();
```

**Helper Functions:**
- `verifyIdToken(token)` - Verify Firebase ID tokens
- `createCustomToken(uid, claims)` - Generate custom tokens
- `getUserByEmail(email)` - Look up users by email
- `setCustomUserClaims(uid, claims)` - Set custom claims for authorization

**Environment Variables Required:**
```
FIREBASE_ADMIN_PROJECT_ID=project-id
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@project.iam.gserviceaccount.com
```

---

## 3. Authentication Context & Provider

### File: `/Applications/Gauntlet/marin/vid_ad/lib/contexts/AuthContext.tsx`

**Purpose:** Central authentication state management using React Context

**Architecture:**
- Client-side context provider with useAuth hook
- Manages user authentication state and Firestore user profiles
- Handles signup, login, logout, and password reset
- Session persistence with 30-day expiry for "remember me" feature
- Real-time sync with Firebase auth state

**TypeScript Interfaces:**
```typescript
interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Date;
  lastLogin: Date;
  metadata?: Record<string, any>;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signup: (email: string, password: string, displayName?: string) => Promise<UserCredential>;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<UserCredential>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  clearError: () => void;
  checkSessionExpiry: () => void;
}
```

**Key Methods:**

1. **signup(email, password, displayName)**
   - Creates Firebase Auth user
   - Updates profile with displayName
   - Creates Firestore user document
   - Stores in AuthContext

2. **login(email, password, rememberMe)**
   - Sets persistence (local/session based on rememberMe)
   - Signs in with email/password
   - Creates/updates Firestore user profile
   - Stores session start time for 30-day expiry
   - Returns UserCredential

3. **createUserProfile(user, additionalData)**
   - Creates user document in Firestore at `/users/{uid}`
   - Updates lastLogin timestamp on re-login
   - Fetches and syncs profile data

4. **checkSessionExpiry()**
   - Checks if 30 days have passed since login
   - Auto-logs out expired sessions
   - Runs hourly via setInterval

**Usage Example:**
```typescript
'use client';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function MyComponent() {
  const { currentUser, userProfile, signup, login, logout, loading } = useAuth();

  const handleLogin = async (email, password) => {
    await login(email, password, true); // true = remember me
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {currentUser ? (
        <>
          <p>Welcome, {userProfile?.displayName}</p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <p>Please log in</p>
      )}
    </div>
  );
}
```

---

## 4. Cookie Management

### File: `/Applications/Gauntlet/marin/vid_ad/lib/auth/cookies.ts`

**Purpose:** HTTP-only cookie handling for authentication tokens

**Key Features:**
- Sets httpOnly cookies (inaccessible to JavaScript)
- Secure in production (HTTPS only)
- 30-day expiry
- SameSite lax for CSRF protection

**Functions:**
```typescript
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
  });
}

export async function getAuthCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE_NAME);
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}
```

---

## 5. Middleware - Route Protection

### File: `/Applications/Gauntlet/marin/vid_ad/middleware.ts`

**Purpose:** Next.js middleware for protecting routes and redirects

**Features:**
- Checks for authentication cookie on protected routes
- Redirects unauthenticated users to login
- Prevents authenticated users from accessing auth pages
- Returns 401 for unauthenticated API calls
- Preserves returnUrl for post-login redirect

**Protected Routes:**
```typescript
const protectedRoutes = [
  '/dashboard',
  '/projects',
  '/settings',
  '/profile',
  '/api/projects',
  '/api/videos',
  '/api/user',
];
```

**Logic Flow:**
1. Skip middleware for static files and Next.js internals
2. Check if route is protected
3. Get session cookie (`__session` or `authToken`)
4. If protected + no session → redirect to `/auth/login?returnUrl=...`
5. If authenticated + at `/auth/login|signup` → redirect to `/dashboard`
6. If API route + no session → return 401 JSON error

---

## 6. Authentication UI Components

### Login Page: `/Applications/Gauntlet/marin/vid_ad/app/auth/login/page.tsx`

**Features:**
- Email/password login form
- Social sign-in buttons (Google, Apple)
- Error display
- Loading states
- Links to signup and password reset
- Currently uses mock implementation (TODOs for Firebase integration)

**Current Implementation (Mock):**
```typescript
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // TODO: Replace with actual Firebase integration
      // await login(email, password);
      document.cookie = 'authToken=mock-email-token; path=/';
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
}
```

### Signup Page: `/Applications/Gauntlet/marin/vid_ad/app/auth/signup/page.tsx`

**Features:**
- Email/password signup form
- Social sign-up buttons (Google, Apple)
- Terms and Privacy Policy links
- Similar structure to login page
- Also has TODO markers for Firebase integration

---

## 7. Root Layout - AuthProvider Wrapper

### File: `/Applications/Gauntlet/marin/vid_ad/app/layout.tsx`

**Purpose:** Wraps entire app with AuthProvider context

```typescript
import { AuthProvider } from '@/lib/contexts/AuthContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <AuthProvider>
          <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
```

---

## 8. Firestore Rules & Security

### File: `/Applications/Gauntlet/marin/vid_ad/firestore.rules`

**Collections & Access Control:**

**Users Collection (`/users/{userId}`)**
- Read: Owner or admin
- Create: Any authenticated user (their own doc)
- Update: Owner only (can't change email/createdAt)
- Delete: Admin only

**Projects Collection (`/projects/{projectId}`)**
- Read: Owner, collaborators, or admin
- Create: Authenticated users (must own it)
- Update: Owner or admin
- Delete: Owner or admin

**Videos Collection (`/videos/{videoId}`)**
- Read: Owner, public=true, or admin
- Create: Authenticated users (must own it)
- Update: Owner only
- Delete: Owner or admin

**Helper Functions:**
```
isAuthenticated() → request.auth != null
isOwner(userId) → isAuthenticated() && request.auth.uid == userId
isAdmin() → isAuthenticated() && request.auth.token.admin == true
```

---

## 9. Cloud Functions - Auth Triggers

### File: `/Applications/Gauntlet/marin/vid_ad/functions/src/auth.ts`

**Purpose:** Server-side auth event handlers and utilities

**Triggers:**

1. **onUserCreate** - Triggered when Firebase Auth user is created
   - Creates Firestore user document
   - Initializes subscription plan (free tier)
   - Sets default preferences (theme, notifications, language)
   - Initializes stats tracking

2. **onUserDelete** - Triggered when Firebase Auth user is deleted
   - Deletes user document from Firestore
   - Deletes all user's projects
   - Deletes related data (batch operation)

3. **updateLastLogin** - Callable Cloud Function
   - Updates lastLogin timestamp in user doc
   - Requires authentication
   - Returns success/error status

**User Document Schema:**
```typescript
{
  uid: string,
  email: string,
  displayName: string,
  photoURL: string,
  createdAt: Timestamp,
  lastLogin: Timestamp,
  subscription: {
    plan: 'free' | 'pro' | 'enterprise',
    creditsRemaining: number,
    creditsUsed: number,
    resetDate: Timestamp | null
  },
  preferences: {
    theme: 'light' | 'dark',
    emailNotifications: boolean,
    language: string
  },
  stats: {
    videosGenerated: number,
    totalProcessingTime: number,
    storageUsed: number
  }
}
```

---

## 10. Dashboard Page - Protected Example

### File: `/Applications/Gauntlet/marin/vid_ad/app/dashboard/page.tsx`

**Features:**
- Protected route (redirects to login if no auth cookie)
- Displays user statistics
- Quick action buttons
- Logout functionality
- Currently uses mock auth cookie (not integrated with AuthContext)

**Current Implementation:**
```typescript
'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Check if auth cookie exists (mock implementation)
    const hasAuth = document.cookie.includes('authToken=');
    if (!hasAuth) {
      router.push('/auth/login');
    }
  }, [router]);

  const handleLogout = () => {
    document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    router.push('/auth/login');
  };

  return (
    // Dashboard UI with stats cards and quick actions
  );
}
```

---

## 11. Environment Variables Structure

### File: `/Applications/Gauntlet/marin/vid_ad/.env.example`

```env
# Firebase Configuration (Public)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (Server-side only - in .env.local)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_PRIVATE_KEY=
FIREBASE_ADMIN_CLIENT_EMAIL=

# Optional
NODE_ENV=development
USE_FIREBASE_EMULATORS=false
```

---

## 12. Setup & Configuration Docs

### Firebase Setup: `/Applications/Gauntlet/marin/vid_ad/FIREBASE_SETUP.md`
- Complete Firebase project creation guide
- Service account key generation
- Environment variable configuration
- Test endpoints: `/test-firebase`, `/api/firebase-test`

### Firestore Enable: `/Applications/Gauntlet/marin/vid_ad/ENABLE_FIRESTORE.md`
- Quick steps to enable Firestore database
- Database creation process
- Security rules for production
- Direct Firebase Console links

---

## Complete Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App (Client)                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Root Layout (app/layout.tsx)                 │  │
│  │  - Wraps app with <AuthProvider>                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │    AuthContext & Provider (lib/contexts/)            │  │
│  │  - Manages currentUser & userProfile state           │  │
│  │  - Provides signup, login, logout methods            │  │
│  │  - Syncs with Firestore /users/{uid}                │  │
│  │  - Handles session expiry (30 days)                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │    Pages & Components                                │  │
│  │  - /auth/login (LoginPage)                           │  │
│  │  - /auth/signup (SignUpPage)                         │  │
│  │  - /dashboard (ProtectedPage)                        │  │
│  │  - useAuth() hook in components                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Firebase Client SDK (lib/firebase/config.ts)        │  │
│  │  - Exports: auth, firestore, storage, functions     │  │
│  │  - Singleton pattern initialization                 │  │
│  │  - Uses public env vars (NEXT_PUBLIC_*)            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP
┌─────────────────────────────────────────────────────────────┐
│                   Next.js Server                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │      Middleware (middleware.ts)                      │  │
│  │  - Checks auth cookies on protected routes           │  │
│  │  - Redirects unauthenticated users to /auth/login   │  │
│  │  - Protects API endpoints (returns 401)            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   Firebase Admin SDK (lib/firebase/admin.ts)        │  │
│  │  - Token verification                               │  │
│  │  - Custom claims management                         │  │
│  │  - User management utilities                        │  │
│  │  - Uses service account credentials                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │    Cookies (lib/auth/cookies.ts)                     │  │
│  │  - setAuthCookie() - httpOnly, 30-day               │  │
│  │  - getAuthCookie() - server-side retrieval           │  │
│  │  - clearAuthCookie() - on logout                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │    Cloud Functions (functions/src/auth.ts)           │  │
│  │  - onUserCreate() → Create Firestore user doc      │  │
│  │  - onUserDelete() → Delete user & projects          │  │
│  │  - updateLastLogin() → Callable function            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↕ Firebase REST API
┌─────────────────────────────────────────────────────────────┐
│                   Firebase Backend                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   Firebase Authentication                            │  │
│  │  - Email/Password auth                              │  │
│  │  - Google OAuth                                      │  │
│  │  - Apple OAuth                                       │  │
│  │  - ID token generation                              │  │
│  │  - Session management                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   Firestore Database                                 │  │
│  │  Collections:                                        │  │
│  │  - /users/{uid} → User profiles                      │  │
│  │  - /projects/{projectId} → Video projects           │  │
│  │  - /videos/{videoId} → Generated videos             │  │
│  │  - /templates/{templateId} → Templates (read-only)  │  │
│  │  - /subscriptions/{uid} → Subscription data         │  │
│  │  - Security rules in firestore.rules                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   Cloud Functions Runtime                            │  │
│  │  - Auth triggers                                     │  │
│  │  - Callable functions                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Patterns to Replicate

### 1. **Dual Firebase Initialization**
```typescript
// Client config - imports from process.env.NEXT_PUBLIC_*
import { auth, firestore } from '@/lib/firebase/config';

// Server config - imports from process.env (no NEXT_PUBLIC_)
import { adminAuth, adminDb } from '@/lib/firebase/admin';
```

### 2. **Context-based State Management**
```typescript
'use client'; // Client component
import { createContext, useContext } from 'react';

export const AuthContext = createContext<AuthContextType | undefined>();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be within AuthProvider');
  return context;
}

export function AuthProvider({ children }) {
  // State management and Firebase listeners
  return <AuthContext.Provider value={...}>{children}</AuthContext.Provider>;
}
```

### 3. **Firestore User Document on Auth**
```typescript
// In AuthContext signup/login methods
const userRef = doc(db, 'users', user.uid);
await setDoc(userRef, {
  email: user.email,
  displayName: user.displayName,
  createdAt: serverTimestamp(),
  lastLogin: serverTimestamp(),
  // additional fields
});
```

### 4. **Protected Routes Middleware**
```typescript
// middleware.ts
const sessionCookie = request.cookies.get('authToken')?.value;

if (isProtectedRoute && !sessionCookie) {
  const url = request.nextUrl.clone();
  url.pathname = '/auth/login';
  url.searchParams.set('returnUrl', pathname);
  return NextResponse.redirect(url);
}
```

### 5. **Cloud Function Auth Triggers**
```typescript
// functions/src/auth.ts
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  await db.collection('users').doc(user.uid).set({
    email: user.email,
    displayName: user.displayName,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    // Initialize defaults
  });
});
```

### 6. **Session Persistence with Expiry**
```typescript
const login = async (email, password, rememberMe = false) => {
  // Local persistence = 30 days, Session persistence = until tab closes
  await setPersistence(
    auth,
    rememberMe ? browserLocalPersistence : browserSessionPersistence
  );

  // Track session start for 30-day expiry
  if (rememberMe) {
    localStorage.setItem('sessionStartTime', new Date().toISOString());
  }
};

const checkSessionExpiry = () => {
  const sessionStartTime = localStorage.getItem('sessionStartTime');
  if (sessionStartTime) {
    const daysDifference = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDifference > 30) {
      logout();
    }
  }
};
```

---

## Summary of File Locations

| Component | File Path |
|-----------|-----------|
| Firebase Config (Client) | `/lib/firebase/config.ts` |
| Firebase Admin SDK | `/lib/firebase/admin.ts` |
| Auth Context & Hook | `/lib/contexts/AuthContext.tsx` |
| Cookie Utilities | `/lib/auth/cookies.ts` |
| Route Protection | `/middleware.ts` |
| Login Page | `/app/auth/login/page.tsx` |
| Signup Page | `/app/auth/signup/page.tsx` |
| Protected Page | `/app/dashboard/page.tsx` |
| Root Layout | `/app/layout.tsx` |
| Firestore Rules | `/firestore.rules` |
| Cloud Functions - Auth | `/functions/src/auth.ts` |
| Setup Docs | `/FIREBASE_SETUP.md` |
| Firestore Setup | `/ENABLE_FIRESTORE.md` |
| Environment Vars | `/.env.example` |

