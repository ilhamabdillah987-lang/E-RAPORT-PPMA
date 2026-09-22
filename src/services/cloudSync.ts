import { AppUser, RaportSettings } from '../types';
import { DEFAULT_USERS } from '../data/defaultData';

// Primary Cloud Storage Object ID for Pondok Pesantren Modern Al-Hikmah
// This cloud object is shared globally across all browsers, mobile devices, and Vercel instances.
const CLOUD_OBJECT_ID = 'ff808181a09d98f701a0c7a88e8e6878';
const CLOUD_API_BASE = 'https://api.restful-api.dev/objects';

/**
 * Merge users ensuring all default admin/walikelas accounts exist,
 * while preserving any custom users created by the Admin.
 */
export function mergeUsers(remoteUsers: AppUser[], localUsers: AppUser[]): AppUser[] {
  const map = new Map<string, AppUser>();

  // 1. Seed defaults first
  DEFAULT_USERS.forEach((u) => {
    map.set(u.id, u);
  });

  // 2. Overlay local users
  localUsers.forEach((u) => {
    if (u && u.id && u.username) {
      map.set(u.id, u);
    }
  });

  // 3. Overlay remote users (higher authority for cloud sync)
  remoteUsers.forEach((u) => {
    if (u && u.id && u.username) {
      map.set(u.id, u);
    }
  });

  return Array.from(map.values());
}

/**
 * Fetch users from all available sources:
 * 1. URL Hash / Query Parameter (?sync= or #sync=)
 * 2. Cloud Relay (api.restful-api.dev)
 * 3. Express backend (/api/users)
 * 4. Google Apps Script Web App (if configured)
 * 5. LocalStorage fallback
 */
export async function fetchSharedUsers(): Promise<AppUser[]> {
  let localUsers: AppUser[] = [];
  try {
    const saved = localStorage.getItem('alhikmah_users');
    if (saved) {
      localUsers = JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Error reading local users:', e);
  }

  // 1. Check URL for Instant Sync Token (#sync=... or ?sync=...)
  const urlSyncResult = syncFromUrlHash();
  if (urlSyncResult && urlSyncResult.users && urlSyncResult.users.length > 0) {
    const merged = mergeUsers(urlSyncResult.users, localUsers);
    try {
      localStorage.setItem('alhikmah_users', JSON.stringify(merged));
    } catch (e) {}
    // Also push to cloud relay so everyone else gets them too
    saveSharedUsers(merged).catch(() => {});
    return merged;
  }

  // 2. Fetch from Cloud Relay (works on Vercel, localhost, mobile, etc.)
  try {
    const cloudRes = await fetch(`${CLOUD_API_BASE}/${CLOUD_OBJECT_ID}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (cloudRes.ok) {
      const json = await cloudRes.json();
      const cloudUsers = json?.data?.users;
      if (Array.isArray(cloudUsers) && cloudUsers.length > 0) {
        const merged = mergeUsers(cloudUsers, localUsers);
        try {
          localStorage.setItem('alhikmah_users', JSON.stringify(merged));
        } catch (e) {}
        return merged;
      }
    }
  } catch (err) {
    console.warn('Cloud relay fetch warning:', err);
  }

  // 3. Fetch from Express / Vercel Serverless /api/users
  try {
    const apiRes = await fetch('/api/users');
    if (apiRes.ok) {
      const apiUsers = await apiRes.json();
      if (Array.isArray(apiUsers) && apiUsers.length > 0) {
        const merged = mergeUsers(apiUsers, localUsers);
        try {
          localStorage.setItem('alhikmah_users', JSON.stringify(merged));
        } catch (e) {}
        return merged;
      }
    }
  } catch (e) {
    // Expected on static Vercel if /api/users is not deployed as serverless
  }

  // 4. Return local or default
  return localUsers.length > 0 ? localUsers : DEFAULT_USERS;
}

/**
 * Save users to Cloud Relay, LocalStorage, Express server, and Google Sheet Web App
 */
export async function saveSharedUsers(users: AppUser[]): Promise<boolean> {
  // 1. LocalStorage
  try {
    localStorage.setItem('alhikmah_users', JSON.stringify(users));
  } catch (e) {}

  let cloudSuccess = false;

  // 2. Save to Cloud Relay
  try {
    const payload = {
      name: 'alhikmah_users_prod',
      data: {
        users,
        updatedAt: new Date().toISOString(),
      },
    };

    const res = await fetch(`${CLOUD_API_BASE}/${CLOUD_OBJECT_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      cloudSuccess = true;
    }
  } catch (err) {
    console.warn('Could not save to cloud relay:', err);
  }

  // 3. Save to Express server (/api/users)
  try {
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users }),
    });
  } catch (e) {}

  // 4. If Google Sheet Web App URL is configured, save there too
  try {
    const gasUrl = localStorage.getItem('alhikmah_gas_url');
    if (gasUrl && gasUrl.startsWith('http')) {
      await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveUsers', users }),
        mode: 'no-cors',
      });
    }
  } catch (e) {}

  return cloudSuccess;
}

/**
 * Encodes users and settings into a compact URL-safe Base64 string
 */
export function createSyncCode(users: AppUser[], settings?: RaportSettings): string {
  try {
    const cleanUsers = users.map((u) => ({
      id: u.id,
      u: u.username,
      p: u.password,
      n: u.namaLengkap || u.fullName,
      r: u.role,
      k: u.kelasAkses || u.assignedClass || '',
      m: u.mapelAkses || [],
      mid: u.assignedMapelIds || [],
      nip: u.nip || '',
    }));

    const cleanSettings = settings
      ? {
          k: settings.namaKelas,
          w: settings.namaWaliKelas,
          wn: settings.nipWaliKelas,
          s: settings.semester,
          t: settings.tahunPelajaran,
        }
      : undefined;

    const data = { v: 1, u: cleanUsers, s: cleanSettings };
    const json = JSON.stringify(data);
    return btoa(encodeURIComponent(json));
  } catch (e) {
    console.error('Failed to create sync code:', e);
    return '';
  }
}

/**
 * Decodes a sync code back into AppUser array
 */
export function applySyncCode(code: string): { users: AppUser[]; settings?: any } | null {
  try {
    const json = decodeURIComponent(atob(code.trim()));
    const parsed = JSON.parse(json);

    if (parsed && Array.isArray(parsed.u)) {
      const restoredUsers: AppUser[] = parsed.u.map((item: any) => ({
        id: item.id || `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        username: item.u,
        password: item.p,
        namaLengkap: item.n,
        fullName: item.n,
        role: item.r || 'guru',
        kelasAkses: item.k,
        assignedClass: item.k,
        mapelAkses: item.m || [],
        assignedMapelIds: item.mid || [],
        nip: item.nip || '',
        createdAt: new Date().toISOString(),
      }));

      return { users: restoredUsers, settings: parsed.s };
    }
  } catch (e) {
    console.error('Failed to parse sync code:', e);
  }
  return null;
}

/**
 * Creates a 1-click shareable link (e.g. for WhatsApp group)
 */
export function createShareableSyncUrl(users: AppUser[], settings?: RaportSettings, baseUrl?: string): string {
  const code = createSyncCode(users, settings);
  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://e-raport-ppma.vercel.app');
  return `${origin}/#sync=${code}`;
}

export const generateSyncUrl = (users: AppUser[], baseUrl?: string, settings?: RaportSettings): string => {
  return createShareableSyncUrl(users, settings, baseUrl);
};

export const generateSyncCode = (users: AppUser[], settings?: RaportSettings): string => {
  return createSyncCode(users, settings);
};

/**
 * Checks window.location.hash or query params for #sync=...
 */
export function syncFromUrlHash(): { users: AppUser[]; settings?: any } | null {
  if (typeof window === 'undefined') return null;

  try {
    let token = '';
    const hash = window.location.hash;
    if (hash && hash.includes('sync=')) {
      token = hash.split('sync=')[1]?.split('&')[0];
    } else {
      const searchParams = new URLSearchParams(window.location.search);
      token = searchParams.get('sync') || '';
    }

    if (token) {
      const result = applySyncCode(token);
      if (result) {
        // Clean URL without triggering page reload
        if (window.history && window.history.replaceState) {
          const cleanUrl = window.location.pathname;
          window.history.replaceState(null, '', cleanUrl);
        }
        return result;
      }
    }
  } catch (e) {
    console.warn('URL sync error:', e);
  }

  return null;
}

/**
 * Exports users to a downloaded JSON file
 */
export function exportUsersFile(users: AppUser[]): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(users, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `akun_pengguna_alhikmah_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Imports users from a JSON file
 */
export function importUsersFromFile(file: File): Promise<AppUser[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          resolve(parsed);
        } else {
          reject(new Error('Format file JSON tidak valid (harus array pengguna)'));
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsText(file);
  });
}
