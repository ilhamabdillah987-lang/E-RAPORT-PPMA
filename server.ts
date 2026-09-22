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
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username dan password wajib diisi' });
    }
    const cleanUser = String(username).trim().toLowerCase();
    const cleanPass = String(password).trim();

    const user = currentStore.users.find(
      (u) => (u.username || '').trim().toLowerCase() === cleanUser
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: `Username "${username.trim()}" tidak ditemukan. Pastikan username sudah dibuat oleh Admin.`,
      });
    }

    if (user.password !== password && (user.password || '').trim() !== cleanPass) {
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

// Bidirectional User Sync - Merges client accounts with server accounts
app.post('/api/users/sync', (req, res) => {
  try {
    const clientUsers = req.body?.users;
    if (Array.isArray(clientUsers) && clientUsers.length > 0) {
      clientUsers.forEach((clientUser) => {
        if (!clientUser || !clientUser.username) return;
        const cleanUser = clientUser.username.trim().toLowerCase();
        const existingIdx = currentStore.users.findIndex(
          (u) => (u.username || '').trim().toLowerCase() === cleanUser || u.id === clientUser.id
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

// 2. Add new user (Called when Admin creates a user)
app.post('/api/users', (req, res) => {
  try {
    const newUser = req.body;
    if (!newUser || !newUser.username) {
      return res.status(400).json({ error: 'Username wajib diisi' });
    }

    const cleanUsername = newUser.username.trim().toLowerCase();
    const existingIndex = currentStore.users.findIndex(
      (u) => (u.username || '').trim().toLowerCase() === cleanUsername
    );

    if (existingIndex >= 0) {
      // Update existing if ID matches or replace
      currentStore.users[existingIndex] = { ...currentStore.users[existingIndex], ...newUser };
    } else {
      currentStore.users.push(newUser);
    }

    saveStore(currentStore);
    res.json({ success: true, user: newUser, allUsers: currentStore.users });
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
    }
    res.json({ success: true, count: (currentStore.santriList || []).length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
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
