import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  collection,
  addDoc,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './googleAuth';
import { Santri, MataPelajaran, NilaiSantri, RaportSettings, AppUser } from '../types';

export interface SchoolSyncPayload {
  santriList?: Santri[];
  nilaiMap?: Record<string, NilaiSantri>;
  settings?: RaportSettings;
  mapelList?: MataPelajaran[];
  users?: AppUser[];
}

/**
 * Real-time listener for school data in Cloud Firestore.
 * Ensures updates made on any device (phone, laptop, desktop) reflect immediately everywhere.
 */
export function subscribeToSchoolData(callbacks: {
  onSantriUpdate?: (santriList: Santri[]) => void;
  onNilaiUpdate?: (nilaiMap: Record<string, NilaiSantri>) => void;
  onSettingsUpdate?: (settings: RaportSettings) => void;
  onMapelUpdate?: (mapelList: MataPelajaran[]) => void;
  onUsersUpdate?: (users: AppUser[]) => void;
}): () => void {
  const unsubscribers: Unsubscribe[] = [];

  try {
    // 1. Santri listener
    if (callbacks.onSantriUpdate) {
      const unsubSantri = onSnapshot(
        doc(db, 'school_data', 'santri'),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (Array.isArray(data.items)) {
              callbacks.onSantriUpdate?.(data.items);
            }
          }
        },
        (error) => {
          console.warn('Firestore santri listener error:', error);
        }
      );
      unsubscribers.push(unsubSantri);
    }

    // 2. Nilai listener
    if (callbacks.onNilaiUpdate) {
      const unsubNilai = onSnapshot(
        doc(db, 'school_data', 'nilai'),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data.items && typeof data.items === 'object') {
              callbacks.onNilaiUpdate?.(data.items);
            }
          }
        },
        (error) => {
          console.warn('Firestore nilai listener error:', error);
        }
      );
      unsubscribers.push(unsubNilai);
    }

    // 3. Settings listener
    if (callbacks.onSettingsUpdate) {
      const unsubSettings = onSnapshot(
        doc(db, 'school_data', 'settings'),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data.items && typeof data.items === 'object') {
              callbacks.onSettingsUpdate?.(data.items);
            }
          }
        },
        (error) => {
          console.warn('Firestore settings listener error:', error);
        }
      );
      unsubscribers.push(unsubSettings);
    }

    // 4. Mapel listener
    if (callbacks.onMapelUpdate) {
      const unsubMapel = onSnapshot(
        doc(db, 'school_data', 'mapel'),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (Array.isArray(data.items)) {
              callbacks.onMapelUpdate?.(data.items);
            }
          }
        },
        (error) => {
          console.warn('Firestore mapel listener error:', error);
        }
      );
      unsubscribers.push(unsubMapel);
    }

    // 5. Users listener
    if (callbacks.onUsersUpdate) {
      const unsubUsers = onSnapshot(
        doc(db, 'school_data', 'users'),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (Array.isArray(data.items)) {
              callbacks.onUsersUpdate?.(data.items);
            }
          }
        },
        (error) => {
          console.warn('Firestore users listener error:', error);
        }
      );
      unsubscribers.push(unsubUsers);
    }
  } catch (err) {
    console.warn('Error establishing Firestore listeners:', err);
  }

  return () => {
    unsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch (e) {}
    });
  };
}

/**
 * Saves Santri list to Cloud Firestore
 */
export async function syncSantriToFirestore(
  santriList: Santri[],
  updaterName?: string
): Promise<void> {
  const path = 'school_data/santri';
  try {
    await setDoc(doc(db, 'school_data', 'santri'), {
      dataType: 'santri',
      items: santriList,
      count: santriList.length,
      updatedAt: new Date().toISOString(),
      updatedBy: updaterName || 'system',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Saves Nilai map to Cloud Firestore
 */
export async function syncNilaiToFirestore(
  nilaiMap: Record<string, NilaiSantri>,
  updaterName?: string
): Promise<void> {
  const path = 'school_data/nilai';
  try {
    await setDoc(doc(db, 'school_data', 'nilai'), {
      dataType: 'nilai',
      items: nilaiMap,
      count: Object.keys(nilaiMap).length,
      updatedAt: new Date().toISOString(),
      updatedBy: updaterName || 'system',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Saves Settings to Cloud Firestore
 */
export async function syncSettingsToFirestore(
  settings: RaportSettings,
  updaterName?: string
): Promise<void> {
  const path = 'school_data/settings';
  try {
    await setDoc(doc(db, 'school_data', 'settings'), {
      dataType: 'settings',
      items: settings,
      updatedAt: new Date().toISOString(),
      updatedBy: updaterName || 'system',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Saves Mapel list to Cloud Firestore
 */
export async function syncMapelToFirestore(
  mapelList: MataPelajaran[],
  updaterName?: string
): Promise<void> {
  const path = 'school_data/mapel';
  try {
    await setDoc(doc(db, 'school_data', 'mapel'), {
      dataType: 'mapel',
      items: mapelList,
      count: mapelList.length,
      updatedAt: new Date().toISOString(),
      updatedBy: updaterName || 'system',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Saves Users list to Cloud Firestore
 */
export async function syncUsersToFirestore(
  users: AppUser[],
  updaterName?: string
): Promise<void> {
  const path = 'school_data/users';
  try {
    await setDoc(doc(db, 'school_data', 'users'), {
      dataType: 'users',
      items: users,
      count: users.length,
      updatedAt: new Date().toISOString(),
      updatedBy: updaterName || 'system',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Adds an audit log record for traceability across devices
 */
export async function logAuditTrail(
  action: string,
  performedBy: string,
  details: string
): Promise<void> {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      action,
      performedBy,
      details,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('Audit log write error:', e);
  }
}

/**
 * Automatic migration helper:
 * If Cloud Firestore has not been initialized with school data yet,
 * migrates the existing local data into Firestore so no data is ever lost.
 */
export async function migrateInitialDataToFirestore(localData: {
  santriList: Santri[];
  nilaiMap: Record<string, NilaiSantri>;
  settings: RaportSettings;
  mapelList: MataPelajaran[];
  users: AppUser[];
  userEmail?: string;
}): Promise<void> {
  try {
    const santriDoc = await getDoc(doc(db, 'school_data', 'santri'));
    if (!santriDoc.exists() && localData.santriList.length > 0) {
      await syncSantriToFirestore(localData.santriList, localData.userEmail || 'migration');
    }

    const settingsDoc = await getDoc(doc(db, 'school_data', 'settings'));
    if (!settingsDoc.exists() && localData.settings) {
      await syncSettingsToFirestore(localData.settings, localData.userEmail || 'migration');
    }

    const nilaiDoc = await getDoc(doc(db, 'school_data', 'nilai'));
    if (!nilaiDoc.exists() && Object.keys(localData.nilaiMap).length > 0) {
      await syncNilaiToFirestore(localData.nilaiMap, localData.userEmail || 'migration');
    }

    const mapelDoc = await getDoc(doc(db, 'school_data', 'mapel'));
    if (!mapelDoc.exists() && localData.mapelList.length > 0) {
      await syncMapelToFirestore(localData.mapelList, localData.userEmail || 'migration');
    }

    const usersDoc = await getDoc(doc(db, 'school_data', 'users'));
    if (!usersDoc.exists() && localData.users.length > 0) {
      await syncUsersToFirestore(localData.users, localData.userEmail || 'migration');
    }
  } catch (e) {
    console.warn('Migration to Firestore notice:', e);
  }
}
