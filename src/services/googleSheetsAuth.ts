/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut,
  Auth
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize or reuse Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth: Auth = getAuth(app);

// Configure Google Auth Provider with Google Sheets scopes
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;

// In-memory access token cache. NEVER store in localStorage or sessionStorage.
let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;

/**
 * Initialize Google Auth State Listener.
 * Automatically clears in-memory token on sign-out.
 */
export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      cachedUser = user;
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // User logged in via Firebase session, waiting for explicit interaction if token needed
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      }
    } else {
      cachedUser = null;
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Sign In with Google using official Popup flow to obtain OAuth accessToken
 * with https://www.googleapis.com/auth/spreadsheets permission.
 */
export const signInWithGoogle = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Sheets OAuth access token.');
    }

    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;

    return { 
      user: result.user, 
      accessToken: cachedAccessToken 
    };
  } catch (error: any) {
    console.error('[Google Sheets Auth] Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Retrieve cached in-memory access token
 */
export const getGoogleAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Set token manually if restored in session memory
 */
export const setCachedGoogleAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

/**
 * Get currently authenticated Google user
 */
export const getCurrentGoogleUser = (): User | null => {
  return cachedUser || auth.currentUser;
};

/**
 * Check if authenticated with Google token
 */
export const isGoogleAuthenticated = (): boolean => {
  return !!cachedAccessToken && !!auth.currentUser;
};

/**
 * Sign out of Google
 */
export const signOutGoogle = async (): Promise<void> => {
  try {
    await signOut(auth);
  } finally {
    cachedAccessToken = null;
    cachedUser = null;
  }
};
