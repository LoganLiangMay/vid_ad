# Complete File Structure - Firebase Auth Implementation

## Project Directory Tree

```
vid_ad/
├── app/                              # Next.js app directory
│   ├── layout.tsx                    # Root layout with AuthProvider
│   ├── page.tsx                      # Home page
│   ├── auth/
│   │   ├── login/
│   │   │   └── page.tsx             # Login page (mock implementation)
│   │   ├── signup/
│   │   │   └── page.tsx             # Signup page (mock implementation)
│   │   └── reset-password/
│   │       └── page.tsx             # Password reset page
│   ├── dashboard/
│   │   └── page.tsx                 # Protected dashboard (example)
│   ├── generate/                    # Other pages...
│   ├── api/
│   │   ├── generate-scenes/
│   │   │   └── route.ts            # API route example
│   │   └── regenerate-scene/
│   │       └── route.ts            # API route example
│   └── globals.css                 # Global styles
│
├── lib/                             # Utility functions and configs
│   ├── firebase/
│   │   ├── config.ts               # Client-side Firebase setup
│   │   └── admin.ts                # Server-side Firebase Admin
│   ├── contexts/
│   │   └── AuthContext.tsx         # Auth state management
│   ├── auth/
│   │   └── cookies.ts              # Cookie utilities
│   ├── services/
│   ├── schemas/
│   ├── aws/
│   └── ...
│
├── functions/                       # Firebase Cloud Functions
│   ├── src/
│   │   ├── auth.ts                 # Auth triggers & functions
│   │   ├── index.ts                # Function exports
│   │   ├── openai.ts               # OpenAI integrations
│   │   ├── prompts.ts              # Prompt generation
│   │   ├── replicate.ts            # Replicate API
│   │   └── video.ts                # Video processing
│   ├── lib/                        # Compiled functions
│   ├── package.json
│   └── tsconfig.json
│
├── components/                     # Reusable React components
│
├── middleware.ts                   # Route protection middleware
│
├── firestore.rules                # Firestore security rules
├── storage.rules                  # Cloud Storage rules
├── firestore.indexes.json         # Firestore indexes
│
├── .env.example                   # Example env variables
├── .env.local                     # Actual env (in .gitignore)
│
├── .firebase/                     # Firebase emulator data
│
├── .firebaserc                    # Firebase project config
├── firebase.json                  # Firebase CLI config
│
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
├── next.config.mjs               # Next.js config
│
├── AUTH_ARCHITECTURE_REFERENCE.md # This architecture doc (NEW)
└── QUICK_AUTH_IMPLEMENTATION.md   # Implementation guide (NEW)
```

---

## File Categories & Their Purposes

### Core Firebase Configuration (2 files)

#### `lib/firebase/config.ts` - Client-Side Setup
- Initializes Firebase SDK with public API keys
- Exports: `auth`, `firestore`, `storage`, `analytics`, `functions`
- Uses environment variables prefixed with `NEXT_PUBLIC_`
- Singleton pattern to prevent multiple initializations
- Optional: Firebase Emulator connection for development

```
Dependencies: firebase SDK
Size: ~65 lines
Used by: All client components that need Firebase
```

#### `lib/firebase/admin.ts` - Server-Side Setup
- Initializes Firebase Admin SDK with service account
- Exports: `adminAuth`, `adminDb`, `adminStorage`
- Uses private environment variables (no NEXT_PUBLIC_ prefix)
- Helper functions: verifyIdToken, createCustomToken, getUserByEmail, setCustomUserClaims

```
Dependencies: firebase-admin SDK
Size: ~64 lines
Used by: Cloud Functions, Server-side API routes
```

---

### Authentication State Management (1 file)

#### `lib/contexts/AuthContext.tsx` - State Provider
- React Context for global auth state
- Manages: currentUser, userProfile, loading, error
- Methods: signup, login, logout, resetPassword, updateUserProfile
- Firestore integration: Creates/updates user profiles in `/users/{uid}`
- Session management: 30-day expiry, "remember me" feature
- Real-time sync: Listens to Firebase auth state changes

```
Dependencies: firebase/auth, firebase/firestore, React
Size: ~297 lines
Used by: All components via useAuth() hook
```

---

### Cookie Management (1 file)

#### `lib/auth/cookies.ts` - Secure Token Storage
- HTTP-only cookie utilities
- Functions: setAuthCookie, getAuthCookie, clearAuthCookie
- Secure in production, SameSite lax, 30-day expiry

```
Dependencies: next/headers
Size: ~33 lines
Used by: Server-side auth operations, middleware
```

---

### Route Protection (1 file)

#### `middleware.ts` - Request Interception
- Checks authentication on protected routes
- Redirects unauthenticated users to /auth/login
- Prevents authenticated users from accessing auth pages
- Returns 401 for unauthenticated API calls
- Skips static files and Next.js internals

```
Dependencies: next/server
Size: ~95 lines
Runs on: Every request to app
```

---

### Authentication UI (3 files)

#### `app/auth/login/page.tsx` - Login Form
- Email/password form
- Social sign-in buttons (Google, Apple)
- "Forgot password?" link
- Sign up link
- Currently: Mock implementation with TODOs

```
Component type: Client ('use client')
Size: ~182 lines
Route: /auth/login
```

#### `app/auth/signup/page.tsx` - Signup Form
- Email/password form
- Social sign-up buttons
- Terms & privacy policy links
- Sign in link
- Currently: Mock implementation with TODOs

```
Component type: Client ('use client')
Size: ~187 lines
Route: /auth/signup
```

#### `app/auth/reset-password/page.tsx` - Password Reset
- Email input for password reset
- Not examined in detail

```
Route: /auth/reset-password
```

---

### Root Layout (1 file)

#### `app/layout.tsx` - App Wrapper
- Wraps entire app with `<AuthProvider>`
- Sets global metadata
- Global styles

```
Component type: Server component (RSC)
Size: ~33 lines
Runs: On app initialization
```

---

### Protected Pages (1 file as example)

#### `app/dashboard/page.tsx` - Protected Route Example
- Checks for auth cookie on mount
- Redirects to login if not authenticated
- Displays user statistics
- Logout button
- Currently: Mock auth check, not using AuthContext

```
Component type: Client ('use client')
Size: ~147 lines
Route: /dashboard (protected by middleware)
```

---

### Firestore Rules (1 file)

#### `firestore.rules` - Database Security
- User collection: Owner-only read/update
- Project collection: Owner + collaborators can access
- Video collection: Owner + public videos accessible
- Admin overrides
- Helper functions: isAuth(), isOwner(), isAdmin()

```
Language: Firestore Rules 2.0
Size: ~82 lines
Deployed to: Firebase Console
```

---

### Cloud Functions (1 file - Auth Functions)

#### `functions/src/auth.ts` - Server-Side Auth Logic
- `onUserCreate`: Triggered when auth user created
  - Creates Firestore user document
  - Initializes subscription (free tier)
  - Sets default preferences
- `onUserDelete`: Triggered when auth user deleted
  - Deletes user document
  - Deletes user's projects (batch)
- `updateLastLogin`: Callable function
  - Updates lastLogin timestamp

```
Dependencies: firebase-functions, firebase-admin
Size: ~91 lines
Deployed to: Firebase Cloud Functions
```

---

### Configuration Files

#### `.env.example` - Template
- Public Firebase config keys
- Lists all required environment variables
- No secrets included

#### `.env.local` - Actual Secrets (in .gitignore)
- Public Firebase keys (with real values)
- Private Firebase Admin keys
- Should never be committed

#### `firebase.json` - Firebase CLI Config
- Project ID reference
- Hosting config
- Functions config

#### `.firebaserc` - Firebase Project Reference
- Active Firebase project ID
- Aliases for different environments

#### `firestore.indexes.json` - Firestore Indexes
- Custom indexes for complex queries
- Auto-generated by Firebase

---

## Data Flow Diagram

```
User Opens App
    ↓
Next.js Loads → app/layout.tsx
    ↓
<AuthProvider> wraps app
    ↓
AuthContext.tsx runs onAuthStateChanged()
    ↓
Checks Firebase Auth state
    ├→ User is logged in:
    │   ├ Fetch Firestore /users/{uid}
    │   ├ Set currentUser & userProfile
    │   └ Render app normally
    │
    └→ User is not logged in:
        └ Set currentUser = null
        
User visits protected route
    ↓
middleware.ts checks cookie
    ├→ Has 'authToken' cookie:
    │   └ Allow access
    └→ No cookie:
        └ Redirect to /auth/login?returnUrl=/dashboard
        
User signs up:
    /auth/signup page
        ↓
    handleEmailSignUp() [currently mock]
        ↓
    Should call: useAuth().signup(email, password, displayName)
        ↓
    AuthContext.signup():
    ├ createUserWithEmailAndPassword(auth, email, password)
    ├ updateProfile(user, {displayName})
    ├ createUserProfile() → writes to Firestore /users/{uid}
    └ Returns UserCredential
        ↓
    Cloud Function trigger: onUserCreate()
        ↓
    Creates additional Firestore doc with defaults
        ↓
    Route to /dashboard
        ↓
    Set authToken cookie

User logs in:
    /auth/login page
        ↓
    handleEmailLogin() [currently mock]
        ↓
    Should call: useAuth().login(email, password, rememberMe)
        ↓
    AuthContext.login():
    ├ setPersistence() - local or session based on rememberMe
    ├ signInWithEmailAndPassword(auth, email, password)
    ├ createUserProfile() - fetch/sync Firestore doc
    ├ Set sessionStartTime if rememberMe=true
    └ Returns UserCredential
        ↓
    Route to /dashboard
        ↓
    Set authToken cookie

User logs out:
    Click logout button
        ↓
    useAuth().logout()
        ↓
    AuthContext.logout():
    ├ signOut(auth)
    ├ Clear localStorage.sessionStartTime
    └ Set currentUser = null
        ↓
    Clear authToken cookie
        ↓
    Redirect to /auth/login
```

---

## Key Integrations

### 1. Firebase Auth ↔ Firestore
```
Auth User Created
    ↓ Firebase Auth Event
Cloud Function (onUserCreate)
    ↓ Server-side
Firestore /users/{uid} Document Created
    ↓
AuthContext fetches & syncs
```

### 2. Client ↔ Middleware ↔ Server
```
Client requests protected route
    ↓
Middleware checks authToken cookie
    ↓
If no cookie: Redirect to login
If cookie exists: Allow access
```

### 3. AuthContext ↔ Components
```
useAuth() hook in component
    ↓
Accesses auth state from context
    ↓
Can call signup/login/logout methods
    ↓
State changes propagate to all components
```

---

## Environment Variables Mapping

### Public Variables (Safe in Browser)
```
NEXT_PUBLIC_FIREBASE_API_KEY          → Sent to client
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN      → Used by Firebase SDK
NEXT_PUBLIC_FIREBASE_PROJECT_ID       → Public project identifier
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET   → Public storage
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID → Analytics
NEXT_PUBLIC_FIREBASE_APP_ID           → App identifier
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID   → Analytics ID
```

### Private Variables (Server-Only)
```
FIREBASE_ADMIN_PROJECT_ID             → Used by Admin SDK
FIREBASE_ADMIN_PRIVATE_KEY            → KEEP SECRET - never expose
FIREBASE_ADMIN_CLIENT_EMAIL           → Service account email
```

---

## Testing Paths

### Signup Flow
1. Navigate to `/auth/signup`
2. Fill in email, password, display name
3. Click "Sign up" button
4. Check:
   - Firebase Auth user created
   - Firestore `/users/{uid}` document exists
   - Redirected to `/dashboard`

### Login Flow
1. Navigate to `/auth/login`
2. Fill in email, password
3. Check "Remember me" (optional)
4. Click "Sign in" button
5. Check:
   - Auth state updates
   - User profile loaded from Firestore
   - Redirected to `/dashboard`

### Protected Route
1. Log in first
2. Navigate to `/dashboard`
3. Should see content
4. Log out
5. Try to navigate back to `/dashboard`
6. Should redirect to `/auth/login`

---

## Common Modifications

### Add Social Sign-In (Google/Apple)
- In `AuthContext.tsx`, add methods for `signInWithGoogle()`, `signInWithApple()`
- In login/signup pages, update TODO button handlers
- Keep same `createUserProfile()` pattern

### Add Email Verification
- After signup, call `sendEmailVerification(user)`
- Check `user.emailVerified` before allowing dashboard access
- Update middleware to check verification status

### Add Multi-factor Authentication
- Use Firebase Auth MFA APIs
- Store MFA preference in Firestore user document
- Require MFA challenge on login

### Customize User Profile Fields
- Expand `UserProfile` interface with additional fields
- Update `createUserProfile()` to include new fields
- Update Firestore security rules if needed

### Change Session Expiry
- Modify `AUTH_COOKIE_MAX_AGE` in `cookies.ts`
- Update `checkSessionExpiry()` logic in `AuthContext.tsx`
- Adjust days threshold (currently 30)

