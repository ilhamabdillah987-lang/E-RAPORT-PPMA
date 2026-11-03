import { doc, getDoc, setDoc, getDocs, collection } from 'firebase/firestore';
import { db } from './googleAuth';
import { AppUser } from '../types';

export class FirebaseConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FirebaseConnectionError';
  }
}

/**
 * Standard SHA-256 salted password hashing using native Web Crypto API.
 * Ensures passwords are NEVER stored in plain text in Cloud Firestore.
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${password.trim()}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a random cryptographic salt
 */
export function generateSalt(length = 16): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface RegistryAccount {
  uid: string;
  username: string;
  email: string;
  fullName: string;
  role: 'admin' | 'walikelas' | 'guru';
  passwordHash: string;
  salt: string;
  assignedClass?: string;
  kelasAkses?: string;
  assignedMapelIds?: string[];
  mapelAkses?: string[];
  nip?: string;
  photoUrl?: string;
  authProvider?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Normalizes email for safe document IDs
 */
export function sanitizeEmailDocId(email: string): string {
  const clean = email.trim().toLowerCase();
  return 'email_' + clean.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

/**
 * Saves or updates an account in Firestore account_registry collection.
 * Normalizes username to lowercase.
 * Computes salted hash for password (no plaintext stored).
 */
export async function saveAccountToFirestoreRegistry(
  user: AppUser,
  rawPassword?: string
): Promise<RegistryAccount> {
  const cleanUsername = (user.username || '').trim().toLowerCase();
  if (!cleanUsername) {
    throw new Error('Username tidak boleh kosong');
  }

  const cleanEmail = (user.email || '').trim().toLowerCase();
  const uid = user.googleUid || user.id || `user_${cleanUsername}`;
  const now = new Date().toISOString();

  let salt = generateSalt();
  let pwdHash = '';

  const passToHash = rawPassword || user.password || 'guru123';
  pwdHash = await hashPassword(passToHash, salt);

  const registryData: RegistryAccount = {
    uid,
    username: cleanUsername,
    email: cleanEmail,
    fullName: user.namaLengkap || user.fullName || cleanUsername,
    role: user.role,
    passwordHash: pwdHash,
    salt,
    assignedClass: user.assignedClass || user.kelasAkses || '',
    kelasAkses: user.kelasAkses || user.assignedClass || '',
    assignedMapelIds: user.assignedMapelIds || [],
    mapelAkses: user.mapelAkses || [],
    nip: user.nip || '',
    photoUrl: user.photoUrl || '',
    authProvider: user.authProvider || 'google',
    createdAt: user.createdAt || now,
    updatedAt: now,
  };

  try {
    // 1. Primary document indexed by normalized username
    await setDoc(doc(db, 'account_registry', cleanUsername), registryData);

    // 2. Secondary document indexed by email and multi-username index
    if (cleanEmail) {
      const emailDocId = sanitizeEmailDocId(cleanEmail);
      await setDoc(doc(db, 'account_registry', emailDocId), registryData);

      // Multi-username index per Google account email
      const emailIdxDocId = 'email_idx_' + cleanEmail.replace(/[^a-zA-Z0-9_.-]/g, '_');
      try {
        const existingIdxSnap = await getDoc(doc(db, 'account_registry', emailIdxDocId));
        let list: string[] = [];
        if (existingIdxSnap.exists()) {
          const d = existingIdxSnap.data();
          if (Array.isArray(d.usernames)) {
            list = d.usernames;
          }
        }
        if (!list.includes(cleanUsername)) {
          list.push(cleanUsername);
        }
        await setDoc(doc(db, 'account_registry', emailIdxDocId), {
          email: cleanEmail,
          usernames: list,
          updatedAt: now,
        });
      } catch (idxErr) {
        // Non-fatal
      }
    }
  } catch (error: any) {
    console.error('Failed to write to account_registry in Firestore:', error);
    if (
      error?.message?.includes('offline') ||
      error?.code === 'unavailable' ||
      error?.message?.includes('network')
    ) {
      throw new FirebaseConnectionError(
        'Koneksi ke server database Firebase gagal. Periksa koneksi internet Anda.'
      );
    }
    throw error;
  }

  return registryData;
}

/**
 * Finds all accounts registered under a specific Google account email
 */
export async function findAccountsByEmail(email: string): Promise<RegistryAccount[]> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return [];

  const emailIdxDocId = 'email_idx_' + cleanEmail.replace(/[^a-zA-Z0-9_.-]/g, '_');
  try {
    const idxSnap = await getDoc(doc(db, 'account_registry', emailIdxDocId));
    if (idxSnap.exists()) {
      const d = idxSnap.data();
      if (Array.isArray(d.usernames) && d.usernames.length > 0) {
        const accounts: RegistryAccount[] = [];
        for (const u of d.usernames) {
          try {
            const uSnap = await getDoc(doc(db, 'account_registry', u));
            if (uSnap.exists()) {
              accounts.push(uSnap.data() as RegistryAccount);
            }
          } catch (e) {}
        }
        if (accounts.length > 0) return accounts;
      }
    }

    // Fallback: single document
    const singleDocId = sanitizeEmailDocId(cleanEmail);
    const singleSnap = await getDoc(doc(db, 'account_registry', singleDocId));
    if (singleSnap.exists()) {
      return [singleSnap.data() as RegistryAccount];
    }
  } catch (e) {
    console.warn('findAccountsByEmail notice:', e);
  }
  return [];
}

/**
 * Searches Firestore account_registry by username OR email.
 * Cross-device: accessible before Firebase Auth session is active.
 * Throws FirebaseConnectionError on network/offline issues.
 */
export async function findAccountInRegistry(
  identifier: string
): Promise<RegistryAccount | null> {
  const cleanId = identifier.trim().toLowerCase();
  if (!cleanId) return null;

  try {
    // 1. Try finding by username
    const userDocRef = doc(db, 'account_registry', cleanId);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
      return userSnap.data() as RegistryAccount;
    }

    // 2. If identifier has '@', try email lookup
    if (cleanId.includes('@')) {
      const accounts = await findAccountsByEmail(cleanId);
      if (accounts.length > 0) {
        return accounts[0];
      }
    }

    return null;
  } catch (error: any) {
    console.warn('Error reading from Firestore account_registry:', error);
    const msg = error?.message || String(error);
    if (
      msg.includes('offline') ||
      msg.includes('network') ||
      error?.code === 'unavailable' ||
      error?.code === 'failed-precondition'
    ) {
      throw new FirebaseConnectionError(
        'Tidak dapat terhubung ke database online Firebase. Periksa koneksi internet Anda.'
      );
    }
    throw error;
  }
}

/**
 * Validates password against salted hash or legacy plain text.
 */
export async function verifyRegistryPassword(
  rawPassword: string,
  account: RegistryAccount
): Promise<boolean> {
  const cleanPass = rawPassword.trim();
  if (!cleanPass) return false;

  // 1. Check salted hash
  if (account.passwordHash && account.salt) {
    const computed = await hashPassword(cleanPass, account.salt);
    if (computed === account.passwordHash) {
      return true;
    }
  }

  // 2. Legacy check (if migrated with raw password)
  const legacyPass = (account as any).password;
  if (legacyPass && (legacyPass === cleanPass || legacyPass === rawPassword)) {
    // Auto-upgrade to secure hash
    saveAccountToFirestoreRegistry(
      {
        id: account.uid,
        username: account.username,
        role: account.role,
        fullName: account.fullName,
        email: account.email,
        assignedClass: account.assignedClass,
        kelasAkses: account.kelasAkses,
        createdAt: account.createdAt || new Date().toISOString(),
      },
      cleanPass
    ).catch(() => {});
    return true;
  }

  return false;
}

/**
 * Transforms RegistryAccount into AppUser format for session
 */
export function registryToAppUser(reg: RegistryAccount, rawPass?: string): AppUser {
  return {
    id: reg.uid,
    googleUid: reg.uid,
    username: reg.username,
    password: rawPass || '',
    fullName: reg.fullName,
    namaLengkap: reg.fullName,
    email: reg.email,
    photoUrl: reg.photoUrl || '',
    role: reg.role,
    status: 'active',
    assignedClass: reg.assignedClass || reg.kelasAkses || '',
    kelasAkses: reg.kelasAkses || reg.assignedClass || '',
    assignedMapelIds: reg.assignedMapelIds || [],
    mapelAkses: reg.mapelAkses || [],
    nip: reg.nip || '',
    authProvider: reg.authProvider === 'local' ? 'local' : 'google',
    createdAt: reg.createdAt || new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };
}

/**
 * Migrates local user accounts to Cloud Firestore registry on startup.
 * Ensures existing accounts (e.g. saskiah, walikelas7, guru, admin)
 * are immediately queryable from any phone, laptop, or other device.
 */
export async function migrateLocalAccountsToRegistry(users: AppUser[]): Promise<void> {
  if (!Array.isArray(users) || users.length === 0) return;

  for (const u of users) {
    if (!u || !u.username) continue;
    const cleanUname = u.username.trim().toLowerCase();
    try {
      const existing = await getDoc(doc(db, 'account_registry', cleanUname));
      if (!existing.exists()) {
        await saveAccountToFirestoreRegistry(u, u.password || 'guru123');
      }
    } catch (e) {
      // Background migration non-fatal
    }
  }
}
