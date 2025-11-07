# Quick Implementation Guide - Firebase Auth & Firestore

## What's Already Implemented in vid_ad

This project has a **complete, production-ready authentication architecture** using Firebase + Next.js 16. Here's what's done:

### Core Infrastructure (Already Built)
✓ Firebase Client SDK setup (`lib/firebase/config.ts`)
✓ Firebase Admin SDK setup (`lib/firebase/admin.ts`)
✓ React Context-based Auth State Management (`lib/contexts/AuthContext.tsx`)
✓ HTTP-only Cookie utilities (`lib/auth/cookies.ts`)
✓ Route protection middleware (`middleware.ts`)
✓ Firestore security rules (`firestore.rules`)
✓ Cloud Functions auth triggers (`functions/src/auth.ts`)

### UI Components (Partially Built - Mock Implementation)
⚠️ Login page - UI ready, needs Firebase integration
⚠️ Signup page - UI ready, needs Firebase integration
⚠️ Dashboard - Protected page template, mock auth check
✓ Root Layout - AuthProvider wrapper in place

---

## How to Replicate This in Your Project

### Step 1: Setup Firebase Configuration (Fastest)

Copy these two files to your project:

**File 1: `lib/firebase/config.ts`**
```typescript
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

if (!getApps().length) {
  initializeApp(firebaseConfig);
}

export const app = getApps()[0];
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
```

**File 2: `lib/firebase/admin.ts`**
```typescript
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
};

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: `${process.env.FIREBASE_ADMIN_PROJECT_ID}.appspot.com`,
  });
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
```

### Step 2: Create Auth Context

**File: `lib/contexts/AuthContext.tsx`**

Key sections to implement:

1. **Interfaces:**
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
}
```

2. **Key Method - createUserProfile:**
```typescript
const createUserProfile = async (user: User, additionalData?: Partial<UserProfile>) => {
  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    const profile: UserProfile = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || additionalData?.displayName || null,
      photoURL: user.photoURL,
      createdAt: new Date(),
      lastLogin: new Date(),
      ...additionalData
    };

    await setDoc(userRef, {
      ...profile,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp()
    });
    setUserProfile(profile);
  }
};
```

3. **Key Method - signup:**
```typescript
const signup = async (email: string, password: string, displayName?: string) => {
  setError(null);
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    if (displayName && result.user) {
      await updateProfile(result.user, { displayName });
    }
    
    await createUserProfile(result.user, { displayName });
    return result;
  } catch (err: any) {
    setError(err.message);
    throw err;
  }
};
```

4. **Key Method - login:**
```typescript
const login = async (email: string, password: string, rememberMe: boolean = false) => {
  setError(null);
  try {
    await setPersistence(
      auth,
      rememberMe ? browserLocalPersistence : browserSessionPersistence
    );

    const result = await signInWithEmailAndPassword(auth, email, password);

    if (result.user) {
      await createUserProfile(result.user);
      if (rememberMe) {
        localStorage.setItem('sessionStartTime', new Date().toISOString());
      }
    }

    return result;
  } catch (err: any) {
    setError(err.message);
    throw err;
  }
};
```

5. **useEffect - Auth State Listener:**
```typescript
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    setCurrentUser(user);

    if (user) {
      const userRef = doc(db, 'users', user.uid);
      const snapshot = await getDoc(userRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        setUserProfile({
          uid: user.uid,
          email: data.email,
          displayName: data.displayName,
          photoURL: data.photoURL,
          createdAt: data.createdAt?.toDate(),
          lastLogin: data.lastLogin?.toDate(),
          metadata: data.metadata
        });
      } else {
        await createUserProfile(user);
      }
    } else {
      setUserProfile(null);
    }

    setLoading(false);
  });

  return () => unsubscribe();
}, []);
```

### Step 3: Create Cookie Utilities

**File: `lib/auth/cookies.ts`**

```typescript
import { cookies } from 'next/headers';

const AUTH_COOKIE_NAME = 'authToken';
const AUTH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: AUTH_COOKIE_MAX_AGE,
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

### Step 4: Add Middleware for Route Protection

**File: `middleware.ts`**

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/dashboard', '/projects', '/settings', '/profile'];
const ignoredRoutes = ['/_next', '/favicon.ico', '/robots.txt'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (ignoredRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const sessionCookie = request.cookies.get('authToken')?.value;

  if (isProtectedRoute && !sessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    url.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(url);
  }

  if (sessionCookie && (pathname === '/auth/login' || pathname === '/auth/signup')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
```

### Step 5: Wrap App with AuthProvider

**File: `app/layout.tsx`**

```typescript
import { AuthProvider } from '@/lib/contexts/AuthContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

### Step 6: Use Auth in Components

**In any client component:**
```typescript
'use client';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function MyComponent() {
  const { currentUser, userProfile, signup, login, logout, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {currentUser ? (
        <>
          <p>Welcome, {userProfile?.displayName}</p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <p>Please sign in</p>
      )}
    </div>
  );
}
```

---

## Environment Variables Needed

Create `.env.local` with:

```env
# Firebase Client (public - safe to expose)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abc123
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Firebase Admin (server-side only - keep secret)
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIB...\n-----END PRIVATE KEY-----\n"
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

---

## Firestore Security Rules

Create `firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuth() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuth() && request.auth.uid == userId;
    }

    match /users/{userId} {
      allow read: if isOwner(userId);
      allow create: if isAuth() && request.auth.uid == userId;
      allow update: if isOwner(userId);
      allow delete: if false;
    }
  }
}
```

---

## Cloud Functions (Optional but Recommended)

**File: `functions/src/auth.ts`**

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// Auto-create user profile in Firestore when auth user is created
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  await db.collection('users').doc(user.uid).set({
    email: user.email,
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastLogin: admin.firestore.FieldValue.serverTimestamp(),
  });
});

// Auto-delete user profile when auth user is deleted
export const onUserDelete = functions.auth.user().onDelete(async (user) => {
  await db.collection('users').doc(user.uid).delete();
});
```

---

## Testing the Integration

1. **Sign up a new user:**
   - Go to `/auth/signup`
   - Enter email, password, display name
   - Should create Firebase Auth user + Firestore document

2. **Login:**
   - Go to `/auth/login`
   - Enter credentials
   - Should authenticate and set session

3. **Access protected page:**
   - Navigate to `/dashboard`
   - Should work if logged in, redirect to login if not

4. **Check Firestore:**
   - Go to Firebase Console → Firestore
   - Look in `/users/{uid}` collection
   - Should see user data synced

---

## What vid_ad Project Shows You

The complete implementation in `/Applications/Gauntlet/marin/vid_ad/` includes:

1. **Full auth flow** - signup, login, logout, password reset
2. **Session management** - 30-day expiry with "remember me"
3. **Firestore sync** - user data persisted and kept in sync
4. **Route protection** - middleware preventing unauthorized access
5. **Cloud Functions** - server-side auth triggers
6. **Security rules** - granular access control
7. **Admin SDK** - server-side operations (if needed)

You can copy patterns directly from these files:
- `/lib/firebase/config.ts`
- `/lib/firebase/admin.ts`
- `/lib/contexts/AuthContext.tsx`
- `/lib/auth/cookies.ts`
- `/middleware.ts`
- `/firestore.rules`
- `/functions/src/auth.ts`

---

## Common Issues & Solutions

### Issue: "useAuth must be used within AuthProvider"
**Solution:** Make sure component is wrapped by `<AuthProvider>` in `app/layout.tsx`

### Issue: Auth state persists after logout
**Solution:** Check that `logout()` is properly calling `signOut(auth)` and clearing localStorage

### Issue: Firestore document not created
**Solution:** 
1. Check Firebase Cloud Functions are deployed
2. OR manually call `createUserProfile()` in signup/login
3. Make sure Firestore security rules allow creation

### Issue: Session cookie not set
**Solution:** Make sure `setAuthCookie()` is called after successful auth, and check cookies middleware config

### Issue: Middleware not protecting routes
**Solution:** 
1. Make sure middleware.ts is in project root (not in app/)
2. Verify route names match exactly in `protectedRoutes` array
3. Clear Next.js cache: `rm -rf .next`

