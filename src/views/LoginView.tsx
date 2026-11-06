import React, { useState, useMemo, useEffect } from 'react';
import { AppUser, RaportSettings } from '../types';
import {
  Lock,
  User,
  Shield,
  GraduationCap,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  School,
  ArrowRight,
  Info,
  CheckCircle2,
  KeyRound,
  BookOpen,
  RefreshCw,
  QrCode,
  Check,
  Sparkles,
  X,
  UserPlus,
} from 'lucide-react';
import {
  fetchSharedUsers,
  applySyncCode,
  syncFromUrlHash,
  saveSharedUsers,
} from '../services/cloudSync';
import {
  saveUserToFirestore,
  db,
} from '../services/googleAuth';
import { doc, getDoc } from 'firebase/firestore';
import { syncUsersToFirestore } from '../services/firestoreSync';
import {
  findAccountInRegistry,
  findAccountsByEmail,
  verifyRegistryPassword,
  registryToAppUser,
  saveAccountToFirestoreRegistry,
  migrateLocalAccountsToRegistry,
  FirebaseConnectionError,
} from '../services/accountAuthService';
import { RegistrationModal } from '../components/RegistrationModal';
import { MataPelajaran } from '../types';

interface LoginViewProps {
  users: AppUser[];
  settings: RaportSettings;
  mapelList?: MataPelajaran[];
  onLogin: (user: AppUser) => void;
  onRegisterUser?: (user: AppUser) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  users,
  settings,
  mapelList = [],
  onLogin,
  onRegisterUser,
}) => {
  // Mode selection: 'guru' (default / newly requested), 'walikelas', or 'admin'
  const [loginMode, setLoginMode] = useState<'guru' | 'walikelas' | 'admin'>('guru');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [serverUsers, setServerUsers] = useState<AppUser[] | null>(null);
  const [isRefreshingCloud, setIsRefreshingCloud] = useState(false);
  const [cloudStatusMsg, setCloudStatusMsg] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [manualSyncCode, setManualSyncCode] = useState('');
  const [syncCodeResult, setSyncCodeResult] = useState<string | null>(null);

  // Registration Modal & Notice states
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [regInitialRole, setRegInitialRole] = useState<'walikelas' | 'guru'>('guru');
  const [regNotice, setRegNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const handleOpenRegister = (desiredRole: 'walikelas' | 'guru' = 'guru') => {
    setRegInitialRole(desiredRole);
    setIsRegModalOpen(true);
  };

  // Fetch users from cloud relay, server, and URL hash & migrate to Firestore registry
  useEffect(() => {
    // 1. Check URL hash for direct instant sync
    const urlSync = syncFromUrlHash();
    if (urlSync && urlSync.users.length > 0) {
      setServerUsers(urlSync.users);
      setCloudStatusMsg({
        type: 'success',
        text: `Sinkronisasi Tautan Berhasil! ${urlSync.users.length} akun pengguna dari Admin telah dimuat.`,
      });
      migrateLocalAccountsToRegistry(urlSync.users).catch(() => {});
      return;
    }

    // 2. Fetch from cloud relay and server
    fetchSharedUsers().then((shared) => {
      if (shared && shared.length > 0) {
        setServerUsers(shared);
        migrateLocalAccountsToRegistry(shared).catch(() => {});
      }
    });

    // 3. Fetch from Cloud Firestore school_data/users (Cross-device & cross-IP immediate sync)
    if (db) {
      getDoc(doc(db, 'school_data', 'users'))
        .then((snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (Array.isArray(data.items) && data.items.length > 0) {
              setServerUsers((prev) => {
                const current = prev || allUsers;
                const merged = [...current];
                data.items.forEach((item: AppUser) => {
                  if (
                    item.username &&
                    !merged.some(
                      (m) =>
                        (m.username || '').trim().toLowerCase() ===
                        item.username.trim().toLowerCase()
                    )
                  ) {
                    merged.push(item);
                  }
                });
                return merged;
              });
            }
          }
        })
        .catch(() => {});
    }
  }, []);

  // Check URL hash for registration flow (e.g. #daftar)
  useEffect(() => {
    if (window.location.hash.includes('daftar')) {
      setRegNotice({
        type: 'info',
        text: 'Silakan klik tombol "Daftar Akun Baru" di bawah untuk membuat username dan password Anda.',
      });
    }
  }, []);

  const handleCompleteRegistration = async (newUser: AppUser) => {
    setIsRegModalOpen(false);

    const cleanUsername = newUser.username.trim().toLowerCase();
    const cleanEmail = (newUser.email || '').trim().toLowerCase();
    const normalizedUser: AppUser = {
      ...newUser,
      username: cleanUsername,
      email: cleanEmail,
    };

    // 1. Invoke onRegisterUser callback
    if (onRegisterUser) {
      onRegisterUser(normalizedUser);
    }

    // 2. Save to local storage & cloud sync
    const cleanList = allUsers.filter(
      (u) =>
        (u.username || '').trim().toLowerCase() !== cleanUsername &&
        u.id !== normalizedUser.id
    );
    const next = [...cleanList, normalizedUser];
    setServerUsers(next);
    try {
      localStorage.setItem('alhikmah_users', JSON.stringify(next));
      await saveSharedUsers(next);
    } catch (e) {}

    // 3. Save to Cloud Firestore centralized account_registry (Universal cross-device)
    try {
      await saveAccountToFirestoreRegistry(normalizedUser, newUser.password);
    } catch (e) {
      console.warn('Error saving to account registry:', e);
    }

    // 4. Save to backend server dedicated endpoints (/api/auth/register & /api/users)
    try {
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedUser),
      });
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedUser),
      });
      await fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: next }),
      });
    } catch (e) {}

    // 5. Save to Firebase Firestore /users/{uid} and school_data/users
    try {
      await saveUserToFirestore(normalizedUser);
      await syncUsersToFirestore(next, normalizedUser.username);
    } catch (fsErr) {
      console.warn('Firestore user save notice:', fsErr);
    }

    setRegNotice({
      type: 'success',
      text: `Pendaftaran Berhasil! Akun "${normalizedUser.username}" telah aktif dan tersimpan di database online. Anda dapat langsung login di HP, Laptop, atau komputer manapun dengan Username & Password ini.`,
    });

    setTimeout(() => {
      onLogin(normalizedUser);
    }, 600);
  };

  const handleManualRefreshCloud = async () => {
    setIsRefreshingCloud(true);
    setCloudStatusMsg(null);
    try {
      const fresh = await fetchSharedUsers();
      if (fresh && fresh.length > 0) {
        setServerUsers(fresh);
        setCloudStatusMsg({
          type: 'success',
          text: `Berhasil menyinkronkan! ${fresh.length} akun pengguna terbaru telah aktif.`,
        });
      } else {
        setCloudStatusMsg({
          type: 'info',
          text: 'Data akun sudah sinkron dengan versi terbaru.',
        });
      }
    } catch (e: any) {
      setCloudStatusMsg({
        type: 'error',
        text: `Gagal memperbarui dari cloud: ${e.message || e}`,
      });
    } finally {
      setIsRefreshingCloud(false);
    }
  };

  const handleApplySyncCode = () => {
    if (!manualSyncCode.trim()) return;
    const res = applySyncCode(manualSyncCode.trim());
    if (res && res.users.length > 0) {
      setServerUsers(res.users);
      setSyncCodeResult(`Berhasil! ${res.users.length} akun pengguna telah dimuat.`);
      setTimeout(() => {
        setIsSyncModalOpen(false);
        setSyncCodeResult(null);
        setManualSyncCode('');
      }, 1500);
    } else {
      setSyncCodeResult('Kode sinkronisasi tidak valid. Pastikan Anda menyalin kode lengkap dari Admin.');
    }
  };

  // Always sync with the latest server/localStorage users list
  const allUsers = useMemo<AppUser[]>(() => {
    if (serverUsers && serverUsers.length > 0) {
      return serverUsers;
    }
    try {
      const saved = localStorage.getItem('alhikmah_users');
      if (saved) {
        const parsed: AppUser[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error reading users in LoginView:', e);
    }
    return users;
  }, [serverUsers, users]);

  // Registered Guru list created by Admin
  const registeredGuru = useMemo(() => {
    return allUsers.filter((u) => u.role === 'guru');
  }, [allUsers]);

  // Registered Wali Kelas list created by Admin
  const registeredWaliKelas = useMemo(() => {
    return allUsers.filter((u) => u.role === 'walikelas');
  }, [allUsers]);

  const handleSelectUser = (user: AppUser) => {
    setUsername(user.username);
    setPassword('');
    setError('');
    const passInput = document.getElementById('login-password-input');
    if (passInput) {
      passInput.focus();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanUsername) {
      setError('Silakan masukkan username atau email akun Anda.');
      return;
    }

    if (!cleanPassword) {
      setError('Silakan masukkan password akun Anda.');
      return;
    }

    let firestoreConnectionFailed = false;

    // 1. Direct Cloud Firestore Central Registry Check (Universal Cross-Device across all HP / Laptop / PC)
    try {
      const regAccount = await findAccountInRegistry(cleanUsername);
      if (regAccount) {
        const isMatch = await verifyRegistryPassword(cleanPassword, regAccount);
        if (isMatch) {
          const appUser = registryToAppUser(regAccount, cleanPassword);
          const cleanList = allUsers.filter(
            (u) =>
              (u.username || '').trim().toLowerCase() !== cleanUsername &&
              u.id !== appUser.id
          );
          const updated = [...cleanList, appUser];
          setServerUsers(updated);
          try {
            localStorage.setItem('alhikmah_users', JSON.stringify(updated));
            saveSharedUsers(updated).catch(() => {});
          } catch (e) {}

          onLogin(appUser);
          return;
        } else {
          setError(
            `Password yang Anda masukkan salah untuk akun "${regAccount.username}". Periksa kembali huruf besar/kecil Anda.`
          );
          return;
        }
      }
    } catch (fsErr: any) {
      console.warn('Firestore registry query notice:', fsErr);
      if (
        fsErr instanceof FirebaseConnectionError ||
        fsErr?.message?.includes('Firebase') ||
        fsErr?.message?.includes('offline')
      ) {
        firestoreConnectionFailed = true;
      }
    }

    // 2. Centralized server-side verification (/api/auth/login)
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password: cleanPassword }),
      });
      const data = await resp.json();
      if (resp.ok && data.success && data.user) {
        if (Array.isArray(data.allUsers)) {
          setServerUsers(data.allUsers);
          try {
            localStorage.setItem('alhikmah_users', JSON.stringify(data.allUsers));
          } catch (e) {}
        }
        // Auto-save to Firestore registry in background
        saveAccountToFirestoreRegistry(data.user, cleanPassword).catch(() => {});
        onLogin(data.user);
        return;
      } else if (data.code === 'INVALID_PASSWORD') {
        setError(data.message || `Password yang Anda masukkan salah untuk akun "${cleanUsername}".`);
        return;
      }
    } catch (apiErr) {
      // Server offline / network fallback
    }

    // 3. Check client state / local accounts
    const matchedUser = allUsers.find(
      (u) =>
        (u.username || '').trim().toLowerCase() === cleanUsername ||
        (u.email && u.email.trim().toLowerCase() === cleanUsername)
    );

    if (matchedUser) {
      const expectedPassword = matchedUser.password || '';
      if (
        expectedPassword &&
        expectedPassword !== '-' &&
        expectedPassword !== password &&
        expectedPassword.trim() !== cleanPassword
      ) {
        setError(
          `Password yang Anda masukkan salah untuk akun "${matchedUser.username}". Silakan periksa kembali huruf besar/kecil atau hubungi Admin.`
        );
        return;
      }

      // Auto-save to Firestore registry in background
      saveAccountToFirestoreRegistry(matchedUser, cleanPassword).catch(() => {});
      onLogin(matchedUser);
      return;
    }

    // 4. Handle connection error vs account not found
    if (firestoreConnectionFailed) {
      setError(
        'Koneksi ke database online Firebase gagal. Periksa koneksi internet Anda dan coba beberapa saat lagi.'
      );
      return;
    }

    if (loginMode === 'guru') {
      setError(
        `Username / Akun "${username.trim()}" tidak ditemukan. Silakan klik tombol "Daftar Akun Baru" di atas untuk mendaftarkan akun Anda.`
      );
    } else if (loginMode === 'walikelas') {
      setError(
        `Username / Akun "${username.trim()}" tidak ditemukan. Silakan klik tombol "Daftar Akun Baru" di atas untuk mendaftarkan akun Anda.`
      );
    } else {
      setError(`Username "${username.trim()}" tidak ditemukan sebagai Administrator.`);
    }
  };

  const handleQuickAdminLogin = () => {
    const adminUser = allUsers.find((u) => u.role === 'admin');
    if (adminUser) {
      setUsername(adminUser.username);
      setPassword(adminUser.password || '');
      onLogin(adminUser);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-emerald-950 via-teal-950 to-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100">
      <div className="w-full max-w-lg bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-emerald-500/20">
        {/* Header Branding */}
        <div className="bg-linear-to-b from-emerald-800 to-emerald-950 p-6 sm:p-8 text-center text-white relative">
          {settings.logoUrl ? (
            <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 bg-white/10 backdrop-blur-md rounded-2xl p-2 flex items-center justify-center border border-white/20 shadow-xl mb-4 group">
              <img
                src={settings.logoUrl}
                alt="Logo Pesantren"
                className="w-full h-full object-contain filter drop-shadow-md transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          ) : null}
          <h1 className="text-[11px] sm:text-xs uppercase font-bold tracking-widest text-emerald-200">
            {settings.namaYayasan}
          </h1>
          {settings.namaPesantren?.toUpperCase().includes('AL-HIKMAH') ? (
            <h2 className="uppercase font-black tracking-wide mt-1 leading-tight">
              <span className="block text-xs sm:text-sm font-extrabold text-emerald-100/90 tracking-wider">
                {settings.namaPesantren.toUpperCase().replace('AL-HIKMAH', '').trim() || 'PONDOK PESANTREN MODERN'}
              </span>
              <span className="block text-xl sm:text-2xl font-black text-white tracking-widest mt-0.5">
                AL-HIKMAH
              </span>
            </h2>
          ) : (
            <h2 className="text-lg sm:text-xl font-black tracking-wide uppercase mt-0.5">
              {settings.namaPesantren}
            </h2>
          )}
          <p className="text-xs text-emerald-100/80 mt-1">
            Sistem Informasi Pengelolaan & Raport Digital Santri
          </p>
        </div>

        {/* PENDAFTARAN MANDIRI (GURU & WALI KELAS) */}
        <div className="p-4 sm:p-5 bg-linear-to-b from-emerald-50/90 via-teal-50/60 to-slate-50 border-b border-emerald-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-700 text-white shadow-xs">
                  <UserPlus className="w-3 h-3" />
                  Pendaftaran Mandiri
                </span>
                <span className="text-[11px] font-bold text-emerald-950">
                  Guru & Wali Kelas
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Belum punya akun? Buat <strong>Username</strong> dan <strong>Password</strong> Anda sendiri untuk login langsung dari perangkat manapun.
              </p>
            </div>

            <button
              type="button"
              id="btn-open-register"
              onClick={() => handleOpenRegister(loginMode === 'guru' ? 'guru' : 'walikelas')}
              className="w-full sm:w-auto py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 active:scale-[0.98]"
            >
              <UserPlus className="w-4 h-4" />
              <span>Daftar Akun Baru</span>
            </button>
          </div>

          {regNotice && (
            <div
              className={`p-3 rounded-2xl mt-3 text-xs flex items-start gap-2.5 font-medium animate-in fade-in ${
                regNotice.type === 'success'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : regNotice.type === 'error'
                  ? 'bg-rose-100 text-rose-900 border border-rose-300'
                  : 'bg-blue-100 text-blue-900 border border-blue-300'
              }`}
            >
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{regNotice.text}</span>
            </div>
          )}
        </div>

        {/* Separator / Divider */}
        <div className="relative py-2 bg-slate-100 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <span className="relative px-3 bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-500">
            Masuk Menggunakan Akun Terdaftar
          </span>
        </div>

        {/* Tab Menu Pilihan Login: Guru | Wali Kelas | Admin */}
        <div className="p-2 sm:p-3 bg-slate-100/80 border-b border-slate-200">
          <div className="grid grid-cols-3 gap-1.5 bg-slate-200/80 p-1.5 rounded-2xl">
            <button
              type="button"
              id="tab-login-guru"
              onClick={() => {
                setLoginMode('guru');
                setError('');
              }}
              className={`py-2.5 px-2 rounded-xl text-xs sm:text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                loginMode === 'guru'
                  ? 'bg-blue-700 text-white shadow-md shadow-blue-900/20'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span>Login Guru</span>
            </button>

            <button
              type="button"
              id="tab-login-walikelas"
              onClick={() => {
                setLoginMode('walikelas');
                setError('');
              }}
              className={`py-2.5 px-2 rounded-xl text-xs sm:text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                loginMode === 'walikelas'
                  ? 'bg-emerald-700 text-white shadow-md shadow-emerald-900/20'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Login Wali Kelas</span>
            </button>

            <button
              type="button"
              id="tab-login-admin"
              onClick={() => {
                setLoginMode('admin');
                setError('');
              }}
              className={`py-2.5 px-2 rounded-xl text-xs sm:text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                loginMode === 'admin'
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-950/20'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span>Login Admin</span>
            </button>
          </div>
        </div>

        {/* Form Container */}
        <div className="p-6 sm:p-8">
          {/* Banner Context Info */}
          {loginMode === 'guru' ? (
            <div className="mb-5 p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3">
              <BookOpen className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900 leading-relaxed">
                <p className="font-bold text-blue-950">Portal Masuk Guru Pengajar</p>
                <p className="text-[11px] text-blue-800 mt-0.5">
                  Masukkan <strong>Username</strong> dan <strong>Password</strong> yang telah
                  dibuatkan Admin untuk menginput nilai mata pelajaran yang Anda ajarkan.
                </p>
              </div>
            </div>
          ) : loginMode === 'walikelas' ? null : (
            <div className="mb-5 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
              <Shield className="w-5 h-5 text-slate-800 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-800 leading-relaxed">
                <p className="font-bold text-slate-950">Portal Administrator Pesantren</p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Akses penuh untuk mengelola pengguna, menentukan mata pelajaran guru, membuatkan akun,
                  dan mengatur kurikulum raport santri.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-semibold leading-relaxed">{error}</span>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {loginMode === 'guru'
                    ? 'Username Guru Pengajar'
                    : loginMode === 'walikelas'
                    ? 'Username Wali Kelas'
                    : 'Username Administrator'}
                </label>
                {(loginMode === 'guru' || loginMode === 'walikelas') && (
                  <button
                    type="button"
                    onClick={() => handleOpenRegister(loginMode)}
                    className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer flex items-center gap-1"
                  >
                    <UserPlus className="w-3 h-3" />
                    + Buat Akun Baru
                  </button>
                )}
              </div>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-username-input"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={
                    loginMode === 'guru'
                      ? 'Masukkan username guru (contoh: ahmad_guru)'
                      : loginMode === 'walikelas'
                      ? 'Masukkan username wali kelas (contoh: saskiah)'
                      : 'Masukkan username admin'
                  }
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password / Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password akun"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className={`w-full mt-2 py-3 text-white font-black rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] ${
                loginMode === 'guru'
                  ? 'bg-blue-700 hover:bg-blue-800 shadow-blue-900/20'
                  : loginMode === 'walikelas'
                  ? 'bg-emerald-700 hover:bg-emerald-800 shadow-emerald-900/20'
                  : 'bg-slate-900 hover:bg-slate-800 shadow-slate-950/20'
              }`}
            >
              {loginMode === 'guru' ? (
                <>
                  <BookOpen className="w-4 h-4" />
                  Masuk Sebagai Guru Pengajar
                </>
              ) : loginMode === 'walikelas' ? (
                <>
                  <UserCheck className="w-4 h-4" />
                  Masuk Sebagai Wali Kelas
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Masuk Sebagai Administrator
                </>
              )}
            </button>

            {(loginMode === 'guru' || loginMode === 'walikelas') && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => handleOpenRegister(loginMode)}
                  className="text-xs text-slate-600 hover:text-emerald-700 font-semibold cursor-pointer transition-colors"
                >
                  Belum punya akun? <strong className="text-emerald-700 underline">Daftar Akun Baru Sekarang</strong>
                </button>
              </div>
            )}
          </form>

          {/* Quick Helper: List of Registered Guru Accounts */}
          {loginMode === 'guru' && (
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                  Akun Guru Terdaftar di Sistem:
                </span>
                <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {registeredGuru.length} Akun
                </span>
              </div>

              {registeredGuru.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {registeredGuru.map((g) => (
                    <div
                      key={g.id}
                      onClick={() => handleSelectUser(g)}
                      className="p-2.5 bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 rounded-xl flex items-center justify-between cursor-pointer transition-all group"
                      title="Klik untuk memilih akun ini dan mengisi username secara otomatis"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        {g.photoUrl ? (
                          <img
                            src={g.photoUrl}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-lg object-cover shrink-0 border border-slate-200"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0">
                            {(g.namaLengkap || g.fullName || 'G')[0]}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-xs truncate group-hover:text-blue-900 flex items-center gap-1.5">
                            <span className="truncate">{g.namaLengkap || g.fullName || 'Guru Pengajar'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span className="font-mono text-blue-700 font-semibold truncate">
                              @{g.username}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="truncate bg-blue-100/70 text-blue-800 px-1.5 py-0.2 rounded text-[10px] font-semibold">
                              {g.mapelAkses && g.mapelAkses.length > 0
                                ? `${g.mapelAkses.length} Mapel Diajar`
                                : g.assignedMapelIds && g.assignedMapelIds.length > 0
                                ? `${g.assignedMapelIds.length} Mapel Diajar`
                                : 'Semua Mapel'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectUser(g);
                        }}
                        className="text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1 shrink-0 text-blue-700 hover:text-blue-900 bg-white hover:bg-blue-100/80 border-slate-200 hover:border-blue-300"
                        title="Pilih akun ini dan isi username secara otomatis"
                      >
                        Pilih
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-blue-900">
                  <p className="font-bold">Belum ada akun Guru yang terdaftar.</p>
                  <p className="mt-0.5 text-blue-800">
                    Guru Pengajar dapat mendaftar mandiri secara langsung dengan mengklik tombol{' '}
                    <strong>"Daftar Akun Baru"</strong> di bagian atas.
                  </p>
                </div>
              )}

              <p className="text-[10px] text-slate-400 mt-2.5 text-center">
                💡 Klik tombol <strong>"Pilih"</strong> pada nama akun Anda untuk mengisi username otomatis, lalu masukkan password Anda.
              </p>
            </div>
          )}

          {/* Quick Helper: List of Registered Wali Kelas Accounts */}
          {loginMode === 'walikelas' && (
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                  Akun Wali Kelas Terdaftar di Sistem:
                </span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {registeredWaliKelas.length} Akun
                </span>
              </div>

              {registeredWaliKelas.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {registeredWaliKelas.map((w) => (
                    <div
                      key={w.id}
                      onClick={() => handleSelectUser(w)}
                      className="p-2.5 bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 rounded-xl flex items-center justify-between cursor-pointer transition-all group"
                      title="Klik untuk memilih akun ini dan mengisi username secara otomatis"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        {w.photoUrl ? (
                          <img
                            src={w.photoUrl}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-lg object-cover shrink-0 border border-slate-200"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                            {(w.namaLengkap || w.fullName || 'W')[0]}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-xs truncate group-hover:text-emerald-950 flex items-center gap-1.5">
                            <span className="truncate">{w.namaLengkap || w.fullName || 'Wali Kelas'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span className="font-mono text-emerald-700 font-semibold truncate">
                              @{w.username}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="truncate bg-slate-200/70 px-1.5 py-0.2 rounded text-[10px] text-slate-700 font-medium">
                              {w.kelasAkses || w.assignedClass || 'Semua Kelas'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectUser(w);
                        }}
                        className="text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1 shrink-0 text-emerald-700 hover:text-emerald-900 bg-white hover:bg-emerald-100/80 border-slate-200 hover:border-emerald-300"
                        title="Pilih akun ini dan isi username secara otomatis"
                      >
                        Pilih
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                  <p className="font-bold">Belum ada akun Wali Kelas yang terdaftar.</p>
                  <p className="mt-0.5 text-amber-700">
                    Wali Kelas dapat mendaftar mandiri secara langsung dengan mengklik tombol{' '}
                    <strong>"Daftar Akun Baru"</strong> di bagian atas.
                  </p>
                </div>
              )}

              <p className="text-[10px] text-slate-400 mt-2.5 text-center">
                💡 Klik tombol <strong>"Pilih"</strong> pada nama akun Anda untuk mengisi username otomatis, lalu masukkan password Anda.
              </p>
            </div>
          )}

          {/* Quick Demo for Admin */}
          {loginMode === 'admin' && (
            <div className="mt-6 pt-5 border-t border-slate-100">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center mb-2.5">
                Akses Cepat Akun Administrator:
              </p>
              <button
                type="button"
                onClick={handleQuickAdminLogin}
                className="w-full p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-all flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <div className="font-bold text-slate-800 text-xs group-hover:text-slate-950">
                    Masuk Cepat Sebagai Admin Default
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Username: <span className="font-bold text-slate-700">admin</span> | Password:{' '}
                    <span className="font-bold text-slate-700">alhikmah123</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 shrink-0" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Pendaftaran Mandiri Username & Password */}
      {isRegModalOpen && (
        <RegistrationModal
          isOpen={isRegModalOpen}
          onClose={() => setIsRegModalOpen(false)}
          initialRole={regInitialRole}
          mapelList={mapelList}
          existingUsers={allUsers}
          onCompleteRegistration={handleCompleteRegistration}
        />
      )}

      <p className="text-xs text-emerald-200/60 mt-6 text-center">
        © {new Date().getFullYear()} Pondok Pesantren Modern Al-Hikmah. Sistem Raport Digital Santri.
      </p>
    </div>
  );
};
