import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// Server Data Store File
const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default initial state for server store
const INITIAL_USERS = [
  {
    id: 'user-admin',
    username: 'admin',
    password: 'alhikmah123',
    fullName: 'Administrator Pesantren',
    namaLengkap: 'Administrator Pesantren',
    role: 'admin',
    createdAt: '2025-07-01',
  },
  {
    id: 'user-walikelas',
    username: 'walikelas7',
    password: 'guru123',
    fullName: 'Wali Kelas',
    namaLengkap: '',
    role: 'walikelas',
    assignedClass: '7 MTS PUTRA',
    kelasAkses: '7 MTS PUTRA',
    createdAt: '2025-07-01',
  },
  {
    id: 'user-guru',
    username: 'guru',
    password: 'guru123',
    fullName: 'Ustadz Pengajar',
    namaLengkap: 'Ustadz Pengajar',
    role: 'guru',
    assignedClass: 'Semua Kelas',
    kelasAkses: 'Semua Kelas',
    assignedMapelIds: ['ar-1', 'ar-3'],
    mapelAkses: ['Asasul Mubtadiin Fi Ilmi Nahwi', 'Asasul Mubtadiin Fi Ilmi Shorfi'],
    createdAt: '2025-07-01',
  },
];

const INITIAL_SETTINGS = {
  namaYayasan: 'YAYASAN PENDIDIKAN ISLAM AL-HIKMAH',
  namaPesantren: 'PONDOK PESANTREN MODERN AL-HIKMAH',
  alamatPesantren: 'Jl. Al-Hikmah Kp. Pondok Jaya RT.05/01 Desa Pondok Jaya Kecamatan Sepatan Kabupaten Tangerang Provinsi Banten',
  namaKelas: '7 MTS PUTRA',
  semester: 'GANJIL',
  tahunPelajaran: '2025/2026',
  kotaCetak: 'Tangerang',
  tanggalCetak: '20 Desember 2025',
  namaWaliKelas: '',
  nipWaliKelas: '',
  namaKepalaKepesantrenan: '',
  tanggalKenaikanKelulusan: '25 Juni 2026',
  logoUrl: '',
  googleSheetWebAppUrl: '',
};

interface ServerStore {
  users: any[];
  settings: any;
  santriList: any[];
  nilaiMap: Record<string, any>;
  lastUpdated: string;
  lastPushedToGuru?: {
    timestamp: string;
    namaKelas: string;
    pushedBy: string;
    count: number;
  };
}

function loadStore(): ServerStore {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const data = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        if (!Array.isArray(parsed.users) || parsed.users.length === 0) {
          parsed.users = INITIAL_USERS;
        }
        if (!parsed.settings) {
          parsed.settings = INITIAL_SETTINGS;
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading store file, initializing defaults:', err);
  }

  const defaultStore: ServerStore = {
    users: INITIAL_USERS,
    settings: INITIAL_SETTINGS,
    santriList: [],
    nilaiMap: {},
    lastUpdated: new Date().toISOString(),
  };

  saveStore(defaultStore);
  return defaultStore;
}

function saveStore(store: ServerStore) {
  try {
    store.lastUpdated = new Date().toISOString();
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving store to file:', err);
  }
}

// In-memory cache synced with disk
let currentStore = loadStore();

// --- API ROUTES FIRST ---

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth Login Route - Centralized verification across all devices & accounts
// Works regardless of which Google account is active on the client browser/device
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username dan password wajib diisi' });
    }
    const cleanUser = String(username).trim().toLowerCase();
    const cleanPass = String(password).trim();

    // Reload store from disk if available to guarantee freshest data across instances
    try {
      if (fs.existsSync(STORE_FILE)) {
        const fileData = fs.readFileSync(STORE_FILE, 'utf-8');
        const parsed = JSON.parse(fileData);
        if (parsed && Array.isArray(parsed.users) && parsed.users.length > 0) {
          currentStore.users = parsed.users;
        }
      }
    } catch (e) {}

    // Match by username OR email (case-insensitive)
    const user = currentStore.users.find((u) => {
      const uName = (u.username || '').trim().toLowerCase();
      const uEmail = (u.email || '').trim().toLowerCase();
      return uName === cleanUser || (cleanUser.includes('@') && uEmail === cleanUser);
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: `Username atau email "${username.trim()}" tidak ditemukan. Pastikan akun sudah dibuat atau didaftarkan.`,
      });
    }

    const expectedPass = String(user.password || '').trim();
    if (expectedPass && expectedPass !== '-' && expectedPass !== cleanPass && user.password !== password) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_PASSWORD',
        message: `Password yang Anda masukkan salah untuk akun "${user.username}".`,
      });
    }

    return res.json({ success: true, user, allUsers: currentStore.users });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Dedicated Registration Route for Wali Kelas / Guru (Universal cross-device setup)
app.post('/api/auth/register', (req, res) => {
  try {
    const {
      username,
      password,
      fullName,
      namaLengkap,
      role = 'walikelas',
      assignedClass,
      kelasAkses,
      assignedMapelIds,
      mapelAkses,
      nip,
      email,
      photoUrl,
      googleUid,
      authProvider = 'google',
    } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username dan password wajib diisi' });
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const cleanPassword = String(password).trim();
    const displayName = String(namaLengkap || fullName || username).trim();

    const existingIdx = currentStore.users.findIndex(
      (u) => (u.username || '').trim().toLowerCase() === cleanUsername
    );

    const newUser: any = {
      id: req.body?.id || `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      username: cleanUsername,
      password: cleanPassword,
      fullName: displayName,
      namaLengkap: displayName,
      role,
      assignedClass: assignedClass || kelasAkses || (role === 'walikelas' ? '7 MTS PUTRA' : 'Semua Kelas'),
      kelasAkses: kelasAkses || assignedClass || (role === 'walikelas' ? '7 MTS PUTRA' : 'Semua Kelas'),
      assignedMapelIds: assignedMapelIds || [],
      mapelAkses: mapelAkses || [],
      nip: nip || '',
      email: email || '',
      photoUrl: photoUrl || '',
      googleUid: googleUid || '',
      authProvider: authProvider || 'credentials',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      currentStore.users[existingIdx] = { ...currentStore.users[existingIdx], ...newUser };
    } else {
      currentStore.users.push(newUser);
    }

    saveStore(currentStore);
    res.json({ success: true, user: newUser, allUsers: currentStore.users });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Bidirectional User Sync - Merges client accounts with server accounts
app.post('/api/users/sync', (req, res) => {
  try {
    const clientUsers = Array.isArray(req.body)
      ? req.body
      : Array.isArray(req.body?.users)
      ? req.body.users
      : req.body?.user
      ? [req.body.user]
      : [];

    if (clientUsers.length > 0) {
      clientUsers.forEach((clientUser: any) => {
        if (!clientUser || !clientUser.username) return;
        const cleanUser = String(clientUser.username).trim().toLowerCase();
        const existingIdx = currentStore.users.findIndex(
          (u) =>
            (u.username || '').trim().toLowerCase() === cleanUser ||
            (u.id && clientUser.id && u.id === clientUser.id)
        );
        if (existingIdx >= 0) {
          currentStore.users[existingIdx] = { ...currentStore.users[existingIdx], ...clientUser };
        } else {
          currentStore.users.push(clientUser);
        }
      });
      saveStore(currentStore);
    }
    res.json({ success: true, users: currentStore.users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 1. Get all users (Called on any device/Google account)
app.get('/api/users', (req, res) => {
  res.json(currentStore.users);
});

// 2. Add / Upsert user (Supports single user object, { user: ... }, { users: [...] }, or raw array)
app.post('/api/users', (req, res) => {
  try {
    const body = req.body;
    let listToAdd: any[] = [];

    if (Array.isArray(body)) {
      listToAdd = body;
    } else if (Array.isArray(body?.users)) {
      listToAdd = body.users;
    } else if (body?.user && typeof body.user === 'object') {
      listToAdd = [body.user];
    } else if (body && body.username) {
      listToAdd = [body];
    }

    if (listToAdd.length === 0) {
      return res.status(400).json({ error: 'Data user tidak valid atau username kosong' });
    }

    let lastSavedUser: any = null;
    listToAdd.forEach((newUser) => {
      if (!newUser || !newUser.username) return;
      const cleanUsername = String(newUser.username).trim().toLowerCase();
      const existingIndex = currentStore.users.findIndex(
        (u) =>
          (u.username || '').trim().toLowerCase() === cleanUsername ||
          (u.id && newUser.id && u.id === newUser.id)
      );

      if (existingIndex >= 0) {
        currentStore.users[existingIndex] = { ...currentStore.users[existingIndex], ...newUser };
        lastSavedUser = currentStore.users[existingIndex];
      } else {
        currentStore.users.push(newUser);
        lastSavedUser = newUser;
      }
    });

    saveStore(currentStore);
    res.json({ success: true, user: lastSavedUser, count: listToAdd.length, allUsers: currentStore.users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Update existing user
app.put('/api/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updated = req.body;
    const index = currentStore.users.findIndex((u) => u.id === id);

    if (index >= 0) {
      currentStore.users[index] = { ...currentStore.users[index], ...updated };
      saveStore(currentStore);
      res.json({ success: true, user: currentStore.users[index], allUsers: currentStore.users });
    } else {
      res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Delete user
app.delete('/api/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    currentStore.users = currentStore.users.filter((u) => u.id !== id);
    saveStore(currentStore);
    res.json({ success: true, allUsers: currentStore.users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Settings
app.get('/api/settings', (req, res) => {
  res.json(currentStore.settings);
});

app.post('/api/settings', (req, res) => {
  try {
    currentStore.settings = { ...currentStore.settings, ...req.body };
    saveStore(currentStore);
    res.json({ success: true, settings: currentStore.settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Santri
app.get('/api/santri', (req, res) => {
  res.json(currentStore.santriList || []);
});

app.post('/api/santri', (req, res) => {
  try {
    if (Array.isArray(req.body)) {
      currentStore.santriList = req.body;
      saveStore(currentStore);

      // Background auto-sync to Google Apps Script if URL is configured
      const gasUrl = currentStore.settings?.googleSheetWebAppUrl;
      if (gasUrl && typeof gasUrl === 'string' && gasUrl.startsWith('http')) {
        fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'syncSantriList',
            santriList: currentStore.santriList,
            timestamp: new Date().toISOString(),
          }),
          redirect: 'follow',
        }).catch((err) => console.warn('Background GAS auto-sync warning:', err.message));
      }
    }
    res.json({ success: true, count: (currentStore.santriList || []).length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dedicated Endpoint: Push Data Santri ke Akun Guru
app.post('/api/santri/push-to-guru', (req, res) => {
  try {
    const { santriList, namaKelas, pushedBy } = req.body || {};
    if (Array.isArray(santriList)) {
      currentStore.santriList = santriList;
    }
    currentStore.lastPushedToGuru = {
      timestamp: new Date().toISOString(),
      namaKelas: String(namaKelas || currentStore.settings?.namaKelas || 'Semua Kelas').trim(),
      pushedBy: String(pushedBy || 'Wali Kelas').trim(),
      count: (currentStore.santriList || []).length,
    };
    saveStore(currentStore);
    res.json({
      success: true,
      message: `Berhasil mengirim ${currentStore.santriList.length} data santri ke akun guru.`,
      lastPushedToGuru: currentStore.lastPushedToGuru,
      count: currentStore.santriList.length,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/santri/push-status', (req, res) => {
  res.json({
    lastPushedToGuru: currentStore.lastPushedToGuru || null,
    totalSantri: (currentStore.santriList || []).length,
  });
});

// 7. Nilai
app.get('/api/nilai', (req, res) => {
  res.json(currentStore.nilaiMap || {});
});

app.post('/api/nilai', (req, res) => {
  try {
    if (req.body && typeof req.body === 'object') {
      currentStore.nilaiMap = req.body;
      saveStore(currentStore);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Full State Sync
app.get('/api/sync-all', (req, res) => {
  res.json({
    users: currentStore.users,
    settings: currentStore.settings,
    santriList: currentStore.santriList,
    nilaiMap: currentStore.nilaiMap,
    lastUpdated: currentStore.lastUpdated,
    lastPushedToGuru: currentStore.lastPushedToGuru || null,
  });
});

app.post('/api/sync-all', (req, res) => {
  try {
    const { users, settings, santriList, nilaiMap } = req.body;
    if (Array.isArray(users)) currentStore.users = users;
    if (settings && typeof settings === 'object') currentStore.settings = settings;
    if (Array.isArray(santriList)) currentStore.santriList = santriList;
    if (nilaiMap && typeof nilaiMap === 'object') currentStore.nilaiMap = nilaiMap;
    saveStore(currentStore);
    res.json({ success: true, lastUpdated: currentStore.lastUpdated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Google Apps Script Database Sync Proxy
app.post('/api/gas/sync', async (req, res) => {
  try {
    const { webAppUrl, payload } = req.body || {};
    const targetUrl = webAppUrl || currentStore.settings?.googleSheetWebAppUrl;

    if (!targetUrl || !targetUrl.startsWith('http')) {
      return res.status(400).json({ success: false, message: 'URL Google Apps Script tidak valid' });
    }

    const gasResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload || { santriList: currentStore.santriList }),
      redirect: 'follow',
    });

    const responseText = await gasResponse.text();
    let responseJson = {};
    try {
      responseJson = JSON.parse(responseText);
    } catch (e) {
      responseJson = { raw: responseText };
    }

    res.json({
      success: gasResponse.ok,
      status: gasResponse.status,
      ...responseJson,
    });
  } catch (err: any) {
    console.error('GAS proxy sync error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/gas/fetch', async (req, res) => {
  try {
    const targetUrl = (req.query.url as string) || currentStore.settings?.googleSheetWebAppUrl;
    if (!targetUrl || !targetUrl.startsWith('http')) {
      return res.status(400).json({ success: false, message: 'URL Google Apps Script tidak valid' });
    }

    const gasResponse = await fetch(targetUrl, {
      method: 'GET',
      redirect: 'follow',
    });

    const responseText = await gasResponse.text();
    let responseJson = {};
    try {
      responseJson = JSON.parse(responseText);
    } catch (e) {
      responseJson = { raw: responseText };
    }

    res.json(responseJson);
  } catch (err: any) {
    console.error('GAS proxy fetch error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- VITE MIDDLEWARE OR STATIC SERVING ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Raport Digital Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
