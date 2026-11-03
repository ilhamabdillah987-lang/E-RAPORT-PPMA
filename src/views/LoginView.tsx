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
} from 'lucide-react';
import {
  fetchSharedUsers,
  applySyncCode,
  syncFromUrlHash,
  saveSharedUsers,
} from '../services/cloudSync';
import {
  signInWithGoogle,
  saveUserToFirestore,
  fetchUserFromFirestore,
  signInOrRegisterWithGoogle,
} from '../services/googleAuth';
import {
  findAccountInRegistry,
  findAccountsByEmail,
  verifyRegistryPassword,
  registryToAppUser,
  saveAccountToFirestoreRegistry,
  migrateLocalAccountsToRegistry,
  FirebaseConnectionError,
} from '../services/accountAuthService';
import {
  GoogleRegistrationModal,
  GoogleAuthProfile,
} from '../components/GoogleRegistrationModal';
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

  // Google Registration & Login states
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGoogleChoiceOpen, setIsGoogleChoiceOpen] = useState(false);
  const [googleProfileForReg, setGoogleProfileForReg] = useState<GoogleAuthProfile | null>(null);
  const [isGoogleRegModalOpen, setIsGoogleRegModalOpen] = useState(false);
  const [regInitialRole, setRegInitialRole] = useState<'walikelas' | 'guru'>('walikelas');
  const [googleNotice, setGoogleNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const handleOpenDirectGoogleReg = (desiredRole: 'walikelas' | 'guru' = 'walikelas') => {
    setRegInitialRole(desiredRole);
    setGoogleProfileForReg({
      uid: '',
      email: '',
      displayName: '',
      photoURL: '',
    });
    setIsGoogleRegModalOpen(true);
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
  }, []);

  // Check URL hash for registration flow (e.g. #daftar-google)
  useEffect(() => {
    if (window.location.hash.includes('daftar-google') || window.location.hash.includes('daftar')) {
      setGoogleNotice({
        type: 'info',
        text: 'Silakan klik tombol "Daftar dengan Akun Google" di bawah untuk mendaftar sebagai Guru Pengajar atau Wali Kelas.',
      });
    }
  }, []);

  const [multipleAccountsForGoogle, setMultipleAccountsForGoogle] = useState<AppUser[] | null>(null);
  const [googleEmailForMultiple, setGoogleEmailForMultiple] = useState<string>('');

  const handleStartGoogleAuth = async (mode: 'daftar' | 'masuk') => {
    setIsGoogleLoading(true);
    setGoogleNotice(null);
    setError('');

    try {
      const { user: gUser } = await signInWithGoogle();
      const cleanEmail = (gUser.email || '').toLowerCase().trim();
      const displayName = gUser.displayName || '';
      const photoURL = gUser.photoURL || '';

      // MODE: DAFTAR AKUN BARU DENGAN GOOGLE
      // Membuka modal pendaftaran username baru untuk akun Google ini (bisa banyak username)
      if (mode === 'daftar') {
        setRegInitialRole(loginMode === 'guru' ? 'guru' : 'walikelas');
        setGoogleProfileForReg({
          uid: gUser.uid,
          email: cleanEmail,
          displayName,
          photoURL,
        });
        setIsGoogleRegModalOpen(true);
        return;
      }

      // MODE: MASUK DENGAN AKUN GOOGLE
      // Cari semua username yang sudah didaftarkan menggunakan akun Google ini
      let matchedAccounts: AppUser[] = [];
      try {
        const regList = await findAccountsByEmail(cleanEmail);
        if (regList && regList.length > 0) {
          matchedAccounts = regList.map((r) => registryToAppUser(r));
        }
      } catch (fsErr) {
        console.warn('findAccountsByEmail warning:', fsErr);
      }

      // Gabungkan dengan akun lokal/server jika ada
      const localMatches = allUsers.filter(
        (u) => u.email && u.email.trim().toLowerCase() === cleanEmail
      );
      localMatches.forEach((lu) => {
        if (
          !matchedAccounts.some(
            (m) => (m.username || '').toLowerCase() === (lu.username || '').toLowerCase()
          )
        ) {
          matchedAccounts.push(lu);
        }
      });

      if (matchedAccounts.length > 1) {
        // Satu akun Google ini punya banyak username! Tampilkan pilihan username
        setMultipleAccountsForGoogle(matchedAccounts);
        setGoogleEmailForMultiple(cleanEmail);
        return;
      } else if (matchedAccounts.length === 1) {
        // Tepat 1 akun, langsung masuk
        const single = matchedAccounts[0];
        setGoogleNotice({
          type: 'success',
          text: `Selamat datang kembali, ${single.namaLengkap || single.fullName}! Sedang mengalihkan ke dashboard...`,
        });
        setTimeout(() => {
          onLogin(single);
        }, 500);
        return;
      } else {
        // Belum ada username yang terdaftar untuk akun Google ini, arahkan ke pendaftaran
        setGoogleNotice({
          type: 'info',
          text: `Akun Google (${cleanEmail}) belum memiliki username terdaftar. Silakan buat username pertama Anda.`,
        });
        setRegInitialRole(loginMode === 'guru' ? 'guru' : 'walikelas');
        setGoogleProfileForReg({
          uid: gUser.uid,
          email: cleanEmail,
          displayName,
          photoURL,
        });
        setIsGoogleRegModalOpen(true);
        return;
      }
    } catch (err: any) {
      console.error('Google auth error:', err);
      if (
        err.code === 'auth/popup-closed-by-user' ||
        err.code === 'auth/cancelled-popup-request'
      ) {
        return;
      }

      setGoogleNotice({
        type: 'error',
        text:
          err.code === 'auth/popup-blocked'
            ? 'Popup Google diblokir browser. Izinkan popup untuk login dengan Google atau gunakan formulir di bawah.'
            : `Pemberitahuan Google: ${err.message || 'Gagal menghubungkan ke Google'}. Silakan coba kembali atau gunakan login manual.`,
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleCompleteGoogleRegistration = async (newUser: AppUser) => {
    setIsGoogleRegModalOpen(false);
    setGoogleProfileForReg(null);

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

    // 5. Save to Firebase Firestore /users/{uid}
    try {
      await saveUserToFirestore(normalizedUser);
    } catch (fsErr) {
      console.warn('Firestore user save notice:', fsErr);
    }

    setGoogleNotice({
      type: 'success',
      text: `Pendaftaran Berhasil! Akun "${normalizedUser.username}" telah tersimpan di Cloud Firestore. Anda dapat login di HP, Laptop, atau perangkat manapun dengan Username & Password ini.`,
    });

    setTimeout(() => {
      onLogin(normalizedUser);
    }, 700);
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
        `Username / Akun "${username.trim()}" tidak ditemukan. Silakan gunakan tombol "Masuk / Daftar dengan Google" di atas atau hubungi Admin.`
      );
    } else if (loginMode === 'walikelas') {
      setError(
        `Username / Akun "${username.trim()}" tidak ditemukan. Silakan gunakan tombol "Masuk / Daftar dengan Google" di atas untuk mendaftarkan akun Wali Kelas Anda.`
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

        {/* GOOGLE SELF-REGISTRATION & LOGIN SECTION */}
        <div className="p-4 sm:p-5 bg-linear-to-b from-emerald-50/90 via-teal-50/60 to-slate-50 border-b border-emerald-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs">
              <Sparkles className="w-3 h-3" />
              Pendaftaran & Masuk Mandiri
            </span>
            <span className="text-[11px] font-bold text-emerald-950">
              Guru & Wali Kelas
            </span>
          </div>

          <p className="text-xs text-slate-600 mb-3.5 leading-relaxed">
            Tidak perlu menunggu dibuatkan akun oleh Admin. Silakan gunakan <strong>Akun Google</strong> Anda untuk mendaftar langsung sebagai <strong>Guru Pengajar</strong> atau <strong>Wali Kelas</strong>.
          </p>

          {googleNotice && (
            <div
              className={`p-3 rounded-2xl mb-3.5 text-xs flex items-start gap-2.5 font-medium animate-in fade-in ${
                googleNotice.type === 'success'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : googleNotice.type === 'error'
                  ? 'bg-rose-100 text-rose-900 border border-rose-300'
                  : 'bg-blue-100 text-blue-900 border border-blue-300'
              }`}
            >
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{googleNotice.text}</span>
            </div>
          )}

          <div className="space-y-3">
            {/* SATU TOMBOL TUNGGAL: MASUK / DAFTAR DENGAN GOOGLE */}
            <button
              type="button"
              id="btn-google-auth-main"
              disabled={isGoogleLoading}
              onClick={() => setIsGoogleChoiceOpen(true)}
              className="w-full py-3.5 px-4 sm:px-5 bg-white hover:bg-emerald-50/60 text-slate-800 font-extrabold text-xs sm:text-sm rounded-2xl border-2 border-emerald-600/30 hover:border-emerald-600 shadow-md hover:shadow-lg transition-all flex items-center justify-between cursor-pointer active:scale-[0.99] disabled:opacity-50 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 shrink-0">
                  <svg className="w-full h-full" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                </div>
                <div className="text-left">
                  <div className="font-black text-xs sm:text-sm text-slate-900 group-hover:text-emerald-900">
                    {isGoogleLoading ? 'Menghubungkan ke Google...' : 'Masuk / Daftar dengan Google'}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-500 font-normal">
                    Pilih akun Google Anda untuk masuk atau mendaftar
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition-transform shrink-0" />
            </button>

            {/* Tombol Opsi: Daftar dengan Mengetik Akun Google Sendiri */}
            <button
              type="button"
              id="btn-google-type-register"
              onClick={() => handleOpenDirectGoogleReg(loginMode === 'guru' ? 'guru' : 'walikelas')}
              className="w-full py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-all flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Atau Buat Username & Password Sendiri (+ Ketik Akun Google)</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* Separator / Divider */}
        <div className="relative py-2.5 bg-slate-100 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <span className="relative px-3 bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-500">
            Atau Masuk Akun Manual / Admin
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
                    ? 'Username atau Email Google Guru'
                    : loginMode === 'walikelas'
                    ? 'Username atau Email Google Wali Kelas'
                    : 'Username Administrator'}
                </label>
                {(loginMode === 'guru' || loginMode === 'walikelas') && (
                  <button
                    type="button"
                    onClick={() => handleOpenDirectGoogleReg(loginMode)}
                    className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer"
                  >
                    + Daftar Akun Google
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
                      ? 'Ketik email Google (e.g. guru@gmail.com) atau username'
                      : loginMode === 'walikelas'
                      ? 'Ketik email Google (e.g. walikelas@gmail.com) atau username'
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
                      title={
                        g.authProvider === 'google'
                          ? 'Klik untuk langsung masuk dengan Akun Google ini'
                          : 'Klik untuk memilih akun ini dan mengisi username secara otomatis'
                      }
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
                            {g.authProvider === 'google' && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[9px] font-black rounded-full shrink-0">
                                Google
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span className="font-mono text-blue-700 font-semibold truncate">
                              {g.email || `user: ${g.username}`}
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
                    <strong>"Daftar Akun Google"</strong> di bagian atas.
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
                      title={
                        w.authProvider === 'google'
                          ? 'Klik untuk langsung masuk dengan Akun Google ini'
                          : 'Klik untuk memilih akun ini dan mengisi username secara otomatis'
                      }
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
                          <div className="font-bold text-slate-900 text-xs truncate group-hover:text-emerald-900 flex items-center gap-1.5">
                            <span className="truncate">{w.namaLengkap || w.fullName || 'Wali Kelas'}</span>
                            {w.authProvider === 'google' && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded-full shrink-0">
                                Google
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span className="font-mono text-emerald-700 font-semibold truncate">
                              {w.email || `user: ${w.username}`}
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
                    <strong>"Daftar Akun Google"</strong> di bagian atas.
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

      {/* Modal Pilihan Akses Akun Google: Masuk atau Daftar */}
      {isGoogleChoiceOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-500/20 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 shrink-0">
                  <svg className="w-full h-full" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Akses Akun Google</h3>
                  <p className="text-[11px] text-slate-500">Pilih masuk akun atau daftar akun baru</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGoogleChoiceOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-5 space-y-3">
              {/* Opsi 1: Masuk dengan Google */}
              <button
                type="button"
                id="btn-choice-masuk-google"
                onClick={() => {
                  setIsGoogleChoiceOpen(false);
                  handleStartGoogleAuth('masuk');
                }}
                className="w-full p-4 rounded-2xl border-2 border-emerald-600/30 hover:border-emerald-600 bg-emerald-50/40 hover:bg-emerald-50 text-left transition-all flex items-center justify-between group cursor-pointer shadow-xs"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-black text-xs sm:text-sm text-emerald-950 group-hover:text-emerald-800">
                      Masuk dengan Akun Google
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      Sudah punya akun? Masuk langsung dengan akun Google Anda
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-700 group-hover:translate-x-1 transition-transform shrink-0" />
              </button>

              {/* Opsi 2: Daftar dengan Google */}
              <button
                type="button"
                id="btn-choice-daftar-google"
                onClick={() => {
                  setIsGoogleChoiceOpen(false);
                  handleStartGoogleAuth('daftar');
                }}
                className="w-full p-4 rounded-2xl border-2 border-blue-600/30 hover:border-blue-600 bg-blue-50/40 hover:bg-blue-50 text-left transition-all flex items-center justify-between group cursor-pointer shadow-xs"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-black text-xs sm:text-sm text-blue-950 group-hover:text-blue-800">
                      Daftar Akun Baru dengan Google
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      Belum terdaftar? Buat profil Guru atau Wali Kelas baru
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-blue-700 group-hover:translate-x-1 transition-transform shrink-0" />
              </button>
            </div>

            <div className="pt-3 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsGoogleChoiceOpen(false);
                  handleOpenDirectGoogleReg(loginMode === 'guru' ? 'guru' : 'walikelas');
                }}
                className="text-xs font-bold text-slate-600 hover:text-emerald-700 underline cursor-pointer"
              >
                Atau buat username & password sendiri (+ ketik akun Google)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pemilih Akun Jika 1 Akun Google Memiliki Banyak Username */}
      {multipleAccountsForGoogle && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-emerald-500/20 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 shrink-0">
                  <svg className="w-full h-full" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Pilih Username Akun</h3>
                  <p className="text-[11px] text-slate-500 truncate max-w-[280px]">
                    Akun Google: <strong className="text-slate-800">{googleEmailForMultiple}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMultipleAccountsForGoogle(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 overflow-y-auto space-y-2.5 flex-1 pr-1">
              <p className="text-xs text-slate-600 mb-2">
                Akun Google ini terdaftar dengan <strong>{multipleAccountsForGoogle.length} username</strong>. Silakan pilih akun yang ingin Anda gunakan untuk masuk:
              </p>

              {multipleAccountsForGoogle.map((acc) => (
                <div
                  key={acc.id || acc.username}
                  onClick={() => {
                    setMultipleAccountsForGoogle(null);
                    setGoogleNotice({
                      type: 'success',
                      text: `Selamat datang kembali, ${acc.namaLengkap || acc.fullName}! Sedang mengalihkan ke dashboard...`,
                    });
                    setTimeout(() => onLogin(acc), 400);
                  }}
                  className="p-3.5 bg-slate-50 hover:bg-emerald-50/70 border-2 border-slate-200 hover:border-emerald-600 rounded-2xl flex items-center justify-between cursor-pointer transition-all group shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    {acc.photoUrl ? (
                      <img
                        src={acc.photoUrl}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-sm shrink-0">
                        {(acc.namaLengkap || acc.fullName || acc.username)[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-emerald-950 truncate">
                        {acc.namaLengkap || acc.fullName}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                        <span className="font-mono font-bold text-emerald-700">
                          @{acc.username}
                        </span>
                        <span>•</span>
                        <span className="font-medium px-2 py-0.2 rounded-full text-[10px] bg-slate-200/70 text-slate-700">
                          {acc.role === 'admin'
                            ? 'Administrator'
                            : acc.role === 'walikelas'
                            ? `Wali Kelas ${acc.kelasAkses || acc.assignedClass || ''}`
                            : 'Guru Pengajar'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="px-3.5 py-1.5 bg-emerald-700 group-hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    <span>Masuk</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  const email = googleEmailForMultiple;
                  setMultipleAccountsForGoogle(null);
                  setRegInitialRole(loginMode === 'guru' ? 'guru' : 'walikelas');
                  setGoogleProfileForReg({
                    uid: '',
                    email: email,
                    displayName: '',
                    photoURL: '',
                  });
                  setIsGoogleRegModalOpen(true);
                }}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>+ Daftarkan Username Baru dengan Akun Google ini</span>
              </button>

              <button
                type="button"
                onClick={() => setMultipleAccountsForGoogle(null)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pendaftaran Mandiri Akun Google */}
      {isGoogleRegModalOpen && (
        <GoogleRegistrationModal
          isOpen={isGoogleRegModalOpen}
          onClose={() => {
            setIsGoogleRegModalOpen(false);
            setGoogleProfileForReg(null);
          }}
          initialRole={regInitialRole}
          googleProfile={googleProfileForReg}
          mapelList={mapelList}
          existingUsers={allUsers}
          onCompleteRegistration={handleCompleteGoogleRegistration}
        />
      )}

      <p className="text-xs text-emerald-200/60 mt-6 text-center">
        © {new Date().getFullYear()} Pondok Pesantren Modern Al-Hikmah. Terintegrasi Google Sheets.
      </p>
    </div>
  );
};
