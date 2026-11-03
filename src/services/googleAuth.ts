import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  updateDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { AppUser, UserRole } from '../types';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Test connection on boot per Firebase specification
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// Standardized Firestore Error Handling per Firebase Skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');

let cachedAccessToken: string | null = null;

export const getCachedAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      if (!user) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

/**
 * Sign in or Register using official Firebase Google Sign-In with popup.
 * 1. Shows available Google accounts for user to choose.
 * 2. If user exists in Firestore, logs them in immediately.
 * 3. If new user, creates their profile in Firestore automatically.
 * 4. Ensures 1 Google Account has exactly 1 profile tied to its Firebase UID.
 */
export async function signInOrRegisterWithGoogle(preferredRole: 'walikelas' | 'guru' = 'walikelas'): Promise<{
  appUser: AppUser;
  isNewUser: boolean;
}> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || 'google-auth-verified';

    const gUser = result.user;
    const uid = gUser.uid;
    const email = gUser.email || '';
    const cleanEmail = email.toLowerCase().trim();
    const cleanUsername = cleanEmail ? cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_.-]/g, '') : `user_${uid.slice(0, 6)}`;
    const displayName = gUser.displayName || cleanUsername || 'Pengguna Google';
    const photoUrl = gUser.photoURL || '';

    // Check if user already exists in Firestore
    const existing = await fetchUserFromFirestore(uid);

    if (existing) {
      // User already registered - update lastLoginAt
      const now = new Date().toISOString();
      try {
        await updateDoc(doc(db, 'users', uid), {
          lastLoginAt: now,
          photoUrl: photoUrl || existing.photoUrl || '',
          updatedAt: now,
        });
      } catch (e) {
        // Fallback update
      }

      const updatedUser: AppUser = {
        ...existing,
        lastLoginAt: now,
        photoUrl: photoUrl || existing.photoUrl,
      };

      return { appUser: updatedUser, isNewUser: false };
    }

    // Determine initial role: admin if matching master email, else user's preferred role
    const isAdmin = cleanEmail === 'ilhamabdillah987@gmail.com';
    const role: UserRole = isAdmin ? 'admin' : preferredRole;
    const now = new Date().toISOString();

    const newUser: AppUser = {
      id: uid,
      googleUid: uid,
      username: cleanUsername,
      fullName: displayName,
      namaLengkap: displayName,
      email: cleanEmail,
      photoUrl,
      role,
      status: 'active',
      assignedClass: role === 'walikelas' ? '7 MTS PUTRA' : '',
      kelasAkses: role === 'walikelas' ? '7 MTS PUTRA' : '',
      assignedMapelIds: [],
      mapelAkses: [],
      nip: '',
      authProvider: 'google',
      createdAt: now,
      lastLoginAt: now,
    };

    // Save profile to Cloud Firestore
    await saveUserToFirestore(newUser);

    return { appUser: newUser, isNewUser: true };
  } catch (error: any) {
    console.error('Google Sign-in / Registration error:', error);
    throw error;
  }
}

/**
 * Standard Firebase Google Sign-In wrapper
 */
export const signInWithGoogle = async (): Promise<{ user: User; accessToken: string }> => {
  const result = await signInWithPopup(auth, googleProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  cachedAccessToken = credential?.accessToken || 'google-auth-verified';
  return { user: result.user, accessToken: cachedAccessToken };
};

/**
 * Signs out from Firebase Authentication
 */
export const googleSignOut = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

/**
 * Listens to Firebase Auth state changes.
 * Automatically restores session on page reload or across devices.
 */
export function listenToAuthState(
  onUserDetected: (appUser: AppUser) => void,
  onLoggedOut: () => void
): () => void {
  return onAuthStateChanged(auth, async (fbUser: User | null) => {
    if (fbUser) {
      try {
        const profile = await fetchUserFromFirestore(fbUser.uid);
        if (profile) {
          onUserDetected(profile);
          return;
        }

        // If authenticated in Firebase but no Firestore document yet (e.g. edge case)
        const cleanEmail = (fbUser.email || '').toLowerCase().trim();
        const cleanUsername = cleanEmail ? cleanEmail.split('@')[0] : `user_${fbUser.uid.slice(0, 6)}`;
        const isAdmin = cleanEmail === 'ilhamabdillah987@gmail.com';

        const autoUser: AppUser = {
          id: fbUser.uid,
          googleUid: fbUser.uid,
          username: cleanUsername,
          fullName: fbUser.displayName || cleanUsername,
          namaLengkap: fbUser.displayName || cleanUsername,
          email: cleanEmail,
          photoUrl: fbUser.photoURL || '',
          role: isAdmin ? 'admin' : 'walikelas',
          status: 'active',
          assignedClass: '7 MTS PUTRA',
          kelasAkses: '7 MTS PUTRA',
          authProvider: 'google',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };

        await saveUserToFirestore(autoUser);
        onUserDetected(autoUser);
      } catch (err) {
        console.warn('Failed to load user profile on auth state change:', err);
      }
    } else {
      onLoggedOut();
    }
  });
}

/**
 * Persists an AppUser into Firestore /users/{uid}
 * Enables cross-device authentication and account synchronization.
 */
export async function saveUserToFirestore(user: AppUser): Promise<void> {
  const docId = user.googleUid || user.id;
  const pathForWrite = `users/${docId}`;
  try {
    await setDoc(doc(db, 'users', docId), {
      uid: docId,
      username: user.username,
      password: user.password || '',
      fullName: user.fullName || user.namaLengkap || '',
      email: user.email || '',
      photoUrl: user.photoUrl || '',
      role: user.role,
      status: user.status || 'active',
      assignedClass: user.assignedClass || user.kelasAkses || '',
      kelasAkses: user.kelasAkses || user.assignedClass || '',
      assignedMapelIds: user.assignedMapelIds || [],
      mapelAkses: user.mapelAkses || [],
      nip: user.nip || '',
      authProvider: user.authProvider || 'google',
      createdAt: user.createdAt || new Date().toISOString(),
      lastLoginAt: user.lastLoginAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathForWrite);
  }
}

/**
 * Fetches user profile from Firestore /users/{uid}
 */
export async function fetchUserFromFirestore(uid: string): Promise<AppUser | null> {
  const pathForGet = `users/${uid}`;
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        id: data.uid || uid,
        googleUid: data.uid || uid,
        username: data.username,
        password: data.password,
        fullName: data.fullName,
        namaLengkap: data.fullName,
        role: data.role,
        email: data.email,
        photoUrl: data.photoUrl || '',
        status: data.status || 'active',
        assignedClass: data.assignedClass,
        kelasAkses: data.kelasAkses,
        assignedMapelIds: data.assignedMapelIds || [],
        mapelAkses: data.mapelAkses || [],
        nip: data.nip || '',
        authProvider: data.authProvider || 'google',
        createdAt: data.createdAt,
        lastLoginAt: data.lastLoginAt,
      };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, pathForGet);
  }
}
