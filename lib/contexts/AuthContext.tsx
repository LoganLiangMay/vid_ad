'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  OAuthProvider,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  UserCredential,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { auth, firestore as db } from '@/lib/firebase/config';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

// TypeScript interfaces
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
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  clearError: () => void;
  checkSessionExpiry: () => void;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Auth Provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create user profile in Firestore
  const createUserProfile = async (user: User, additionalData?: Partial<UserProfile>) => {
    if (!user) return;

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

      try {
        await setDoc(userRef, {
          ...profile,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        });
        setUserProfile(profile);
      } catch (err) {
        console.error('Error creating user profile:', err);
        setError('Failed to create user profile');
      }
    } else {
      // Update last login
      await updateDoc(userRef, {
        lastLogin: serverTimestamp()
      });
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
    }
  };

  // Signup function
  const signup = async (email: string, password: string, displayName?: string) => {
    setError(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);

      // Update display name if provided
      if (displayName && result.user) {
        await updateProfile(result.user, { displayName });
      }

      // Create user profile in Firestore
      await createUserProfile(result.user, { displayName });

      // Create session cookie for middleware
      await createSessionCookie(result.user);

      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Create session cookie via API
  const createSessionCookie = async (user: User) => {
    try {
      console.log('🍪 [AuthContext] Creating session cookie for user:', user.email);
      const idToken = await user.getIdToken();
      console.log('🔑 [AuthContext] Got ID token, calling /api/auth/session');

      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        console.error('❌ [AuthContext] Failed to create session cookie:', response.status);
        const error = await response.text();
        console.error('Error details:', error);
      } else {
        console.log('✅ [AuthContext] Session cookie created successfully');
      }
    } catch (err) {
      console.error('❌ [AuthContext] Error creating session cookie:', err);
    }
  };

  // Login function with remember me option
  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    setError(null);
    try {
      // Set persistence based on remember me option
      // If remember me is true, use LOCAL persistence (30 days)
      // If false, use SESSION persistence (until browser closes)
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);

      const result = await signInWithEmailAndPassword(auth, email, password);

      // Update user profile last login
      if (result.user) {
        await createUserProfile(result.user);

        // Create session cookie for middleware
        await createSessionCookie(result.user);

        // Store session start time for 30-day expiry tracking
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

  // Login with Google (using redirect)
  const loginWithGoogle = async () => {
    setError(null);
    try {
      // Store the intended destination before redirect
      if (typeof window !== 'undefined') {
        const returnUrl = new URLSearchParams(window.location.search).get('returnUrl') || '/dashboard';
        localStorage.setItem('authRedirectUrl', returnUrl);
      }

      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      await signInWithRedirect(auth, provider);
      // User will be redirected, and result will be handled in useEffect
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Login with Apple (using redirect)
  const loginWithApple = async () => {
    setError(null);
    try {
      // Store the intended destination before redirect
      if (typeof window !== 'undefined') {
        const returnUrl = new URLSearchParams(window.location.search).get('returnUrl') || '/dashboard';
        localStorage.setItem('authRedirectUrl', returnUrl);
      }

      const provider = new OAuthProvider('apple.com');
      await signInWithRedirect(auth, provider);
      // User will be redirected, and result will be handled in useEffect
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Logout function
  const logout = async () => {
    setError(null);
    try {
      // Clear server-side session cookie
      await fetch('/api/auth/logout', { method: 'POST' });

      await signOut(auth);
      setUserProfile(null);
      // Clear session data
      localStorage.removeItem('sessionStartTime');
      localStorage.removeItem('oauthSuccess');
      localStorage.removeItem('authRedirectUrl');
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Check if session has expired (30 days)
  const checkSessionExpiry = () => {
    const sessionStartTime = localStorage.getItem('sessionStartTime');
    if (sessionStartTime && currentUser) {
      const startDate = new Date(sessionStartTime);
      const now = new Date();
      const daysDifference = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

      // If more than 30 days have passed, force logout
      if (daysDifference > 30) {
        logout();
        setError('Your session has expired after 30 days. Please log in again.');
      }
    }
  };

  // Reset password function
  const resetPassword = async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Update user profile
  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser) {
      setError('No user logged in');
      return;
    }

    setError(null);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, data);

      // Update local state
      setUserProfile(prev => prev ? { ...prev, ...data } : null);

      // Update Firebase Auth profile if displayName or photoURL changed
      if (data.displayName !== undefined || data.photoURL !== undefined) {
        await updateProfile(currentUser, {
          displayName: data.displayName || currentUser.displayName,
          photoURL: data.photoURL || currentUser.photoURL
        });
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Clear error
  const clearError = () => setError(null);

  // Set up auth state listener and session expiry checker
  useEffect(() => {
    let mounted = true;

    // Timeout protection - prevent infinite loading
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth initialization timed out, setting loading to false');
        setLoading(false);
      }
    }, 5000);

    // Handle redirect result from OAuth providers FIRST, before onAuthStateChanged
    const initAuth = async () => {
      try {
        console.log('🔄 [AuthContext] Checking for OAuth redirect result...');
        // Check for OAuth redirect result
        const result = await getRedirectResult(auth);

        if (result && result.user) {
          console.log('✅ [AuthContext] OAuth redirect successful, user:', result.user.email);

          // Create session cookie for middleware
          console.log('🍪 [AuthContext] About to create session cookie...');
          await createSessionCookie(result.user);
          console.log('✅ [AuthContext] Session cookie creation completed');

          // Create or update user profile (don't block on this)
          createUserProfile(result.user).catch(err => {
            console.error('❌ [AuthContext] Error creating user profile:', err);
          });

          localStorage.setItem('sessionStartTime', new Date().toISOString());

          // Mark that we've successfully handled OAuth
          localStorage.setItem('oauthSuccess', 'true');
          console.log('✅ [AuthContext] OAuth flow completed, marked as success');
        } else {
          console.log('ℹ️ [AuthContext] No OAuth redirect result found');
        }
      } catch (err: any) {
        console.error('❌ [AuthContext] OAuth redirect error:', err);
        setError(err.message || 'Failed to sign in with OAuth provider');
      }
    };

    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!mounted) return;

      setCurrentUser(user);

      if (user) {
        // Get user profile from Firestore
        const userRef = doc(db, 'users', user.uid);

        try {
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
            // Create profile if it doesn't exist (non-blocking)
            createUserProfile(user).catch(err => {
              console.error('Error creating user profile in auth listener:', err);
            });
          }

          // Check session expiry on auth state change
          checkSessionExpiry();
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
      clearTimeout(timeout);
    });

    // Set up interval to check session expiry every hour
    const intervalId = setInterval(() => {
      checkSessionExpiry();
    }, 60 * 60 * 1000); // Check every hour

    return () => {
      mounted = false;
      clearTimeout(timeout);
      unsubscribe();
      clearInterval(intervalId);
    };
  }, []);

  const value: AuthContextType = {
    currentUser,
    userProfile,
    loading,
    error,
    signup,
    login,
    loginWithGoogle,
    loginWithApple,
    logout,
    resetPassword,
    updateUserProfile,
    clearError,
    checkSessionExpiry
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}