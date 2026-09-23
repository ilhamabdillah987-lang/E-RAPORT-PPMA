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
} from 'lucide-react';
import {
  fetchSharedUsers,
  applySyncCode,
  syncFromUrlHash,
  saveSharedUsers,
} from '../services/cloudSync';
import { signInWithGoogle } from '../services/googleAuth';
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
  const [googleProfileForReg, setGoogleProfileForReg] = useState<GoogleAuthProfile | null>(null);
  const [isGoogleRegModalOpen, setIsGoogleRegModalOpen] = useState(false);
  const [googleNotice, setGoogleNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Fetch users from cloud relay, server, and URL hash
  useEffect(() => {
    // 1. Check URL hash for direct instant sync
    const urlSync = syncFromUrlHash();
    if (urlSync && urlSync.users.length > 0) {
      setServerUsers(urlSync.users);
      setCloudStatusMsg({
        type: 'success',
        text: `Sinkronisasi Tautan Berhasil! ${urlSync.users.length} akun pengguna dari Admin telah dimuat.`,
      });
      return;
    }

    // 2. Fetch from cloud relay and server
    fetchSharedUsers().then((shared) => {
      if (shared && shared.length > 0) {
        setServerUsers(shared);
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

  const handleStartGoogleAuth = async (mode: 'daftar' | 'masuk') => {
    setIsGoogleLoading(true);
    setGoogleNotice(null);
    setError('');

    try {
      const { user: gUser } = await signInWithGoogle();
      const profile: GoogleAuthProfile = {
        uid: gUser.uid,
        email: gUser.email,
        displayName: gUser.displayName,
        photoURL: gUser.photoURL,
      };

      const cleanEmail = (gUser.email || '').toLowerCase().trim();
      const cleanUsername = cleanEmail ? cleanEmail.split('@')[0] : '';

      // Match against existing users
      const existingUser = allUsers.find(
        (u) =>
          (u.googleUid && u.googleUid === gUser.uid) ||
          (cleanEmail && u.email && u.email.toLowerCase().trim() === cleanEmail) ||
          (cleanUsername && (u.username || '').toLowerCase().trim() === cleanUsername)
      );

      if (existingUser && mode === 'masuk') {
        setGoogleNotice({
          type: 'success',
          text: `Selamat datang kembali, ${existingUser.namaLengkap || existingUser.fullName}! Sedang mengalihkan...`,
        });
        setTimeout(() => {
          onLogin(existingUser);
        }, 600);
        return;
      }

      if (existingUser && mode === 'daftar') {
        setGoogleNotice({
          type: 'info',
          text: `Akun Google (${gUser.email}) sudah terdaftar sebagai ${
            existingUser.role === 'guru' ? 'Guru Pengajar' : 'Wali Kelas'
          } (${existingUser.namaLengkap || existingUser.fullName}). Otomatis masuk...`,
        });
        setTimeout(() => {
          onLogin(existingUser);
        }, 800);
        return;
      }

      // If user does not exist yet (or explicit registration requested):
      setGoogleProfileForReg(profile);
      setIsGoogleRegModalOpen(true);
    } catch (err: any) {
      console.error('Google auth error:', err);
      if (
        err.code === 'auth/popup-closed-by-user' ||
        err.code === 'auth/cancelled-popup-request'
      ) {
        return;
      }

      // If popup blocked or preview domain limitation, show friendly message & allow manual entry modal
      setGoogleNotice({
        type: 'error',
        text:
          err.code === 'auth/popup-blocked'
            ? 'Popup Google diblokir browser. Anda dapat mendaftar mandiri dengan mengisi form pendaftaran.'
            : `Pemberitahuan Google: ${err.message || 'Gagal menghubungkan ke Google'}. Anda dapat melanjutkan pendaftaran mandiri.`,
      });

      // Also allow direct registration fallback modal
      setGoogleProfileForReg({
        uid: `user-${Date.now()}`,
        email: '',
        displayName: '',
        photoURL: '',
      });
      setIsGoogleRegModalOpen(true);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleCompleteGoogleRegistration = async (newUser: AppUser) => {
    setIsGoogleRegModalOpen(false);
    setGoogleProfileForReg(null);

    // 1. Invoke onRegisterUser
    if (onRegisterUser) {
      onRegisterUser(newUser);
    }

    // 2. Save to local storage & cloud sync
    try {
      const next = [...allUsers, newUser];
      setServerUsers(next);
      localStorage.setItem('alhikmah_users', JSON.stringify(next));
      await saveSharedUsers(next);
    } catch (e) {}

    // 3. Post to backend API
    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    }).catch(() => {});

    setGoogleNotice({
      type: 'success',
      text: `Pendaftaran Berhasil! Selamat datang, ${newUser.namaLengkap}. Mengalihkan ke sistem E-Raport...`,
    });

    setTimeout(() => {
      onLogin(newUser);
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
    if (user.authProvider === 'google') {
      onLogin(user);
      return;
    }
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

    // 1. Check if user exists by username or email (case-insensitive)
    let matchedUser = allUsers.find(
      (u) =>
        u.username.trim().toLowerCase() === cleanUsername ||
        (u.email && u.email.trim().toLowerCase() === cleanUsername)
    );

    // If not found in current local state, do a fast live fetch from cloud relay
    if (!matchedUser) {
      try {
        const liveUsers = await fetchSharedUsers();
        if (liveUsers && liveUsers.length > 0) {
          setServerUsers(liveUsers);
          const found = liveUsers.find(
            (u) =>
              u.username.trim().toLowerCase() === cleanUsername ||
              (u.email && u.email.trim().toLowerCase() === cleanUsername)
          );
          if (found) {
            matchedUser = found;
          }
        }
      } catch (e) {}
    }

    if (!matchedUser) {
      if (loginMode === 'guru') {
        setError(
          `Username / Akun "${username.trim()}" tidak ditemukan. Silakan gunakan tombol "Daftar Akun Google" di atas atau hubungi Admin.`
        );
      } else if (loginMode === 'walikelas') {
        setError(
          `Username / Akun "${username.trim()}" tidak ditemukan. Silakan gunakan tombol "Daftar Akun Google" di atas atau hubungi Admin.`
        );
      } else {
        setError(`Username "${username.trim()}" tidak ditemukan sebagai Administrator.`);
      }
      return;
    }

    // If user is registered with Google OAuth, allow direct entry
    if (matchedUser.authProvider === 'google') {
      onLogin(matchedUser);
      return;
    }

    if (!cleanPassword) {
      setError('Silakan masukkan password akun Anda.');
      return;
    }

    // 2. Validate Password (supports exact match or trimmed match)
    const expectedPassword = matchedUser.password || '';
    if (expectedPassword !== password && expectedPassword.trim() !== cleanPassword) {
      setError(
        `Password yang Anda masukkan salah untuk akun "${matchedUser.username}". Silakan periksa kembali huruf besar/kecil atau hubungi Admin.`
      );
      return;
    }

    // 3. Complete login
    onLogin(matchedUser);
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Tombol 1: Daftar dengan Akun Google */}
            <button
              type="button"
              id="btn-google-register"
              disabled={isGoogleLoading}
              onClick={() => handleStartGoogleAuth('daftar')}
              className="w-full py-3 px-3.5 bg-white hover:bg-slate-50 text-slate-800 font-black text-xs rounded-2xl border-2 border-emerald-500/50 hover:border-emerald-600 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>{isGoogleLoading ? 'Menghubungkan...' : 'Daftar Akun Google'}</span>
            </button>

            {/* Tombol 2: Masuk dengan Akun Google */}
            <button
              type="button"
              id="btn-google-login"
              disabled={isGoogleLoading}
              onClick={() => handleStartGoogleAuth('masuk')}
              className="w-full py-3 px-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs rounded-2xl shadow-md shadow-emerald-950/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
            >
              <svg className="w-4 h-4 shrink-0 brightness-200" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>{isGoogleLoading ? 'Menghubungkan...' : 'Masuk Akun Google'}</span>
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
          ) : loginMode === 'walikelas' ? (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
              <School className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900 leading-relaxed">
                <p className="font-bold text-emerald-950">Portal Masuk Wali Kelas</p>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  Masukkan <strong>Username</strong> dan <strong>Password</strong> yang telah
                  dibuatkan oleh Admin Pesantren untuk menginput nilai dan mencetak raport kelas Anda.
                </p>
              </div>
            </div>
          ) : (
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
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {loginMode === 'guru'
                  ? 'Username Guru Pengajar'
                  : loginMode === 'walikelas'
                  ? 'Username Wali Kelas'
                  : 'Username Administrator'}
              </label>
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
                      ? 'Masukkan username guru (misal: guru)'
                      : loginMode === 'walikelas'
                      ? 'Masukkan username wali kelas (misal: walikelas7)'
                      : 'Masukkan username admin'
                  }
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-medium"
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
                        className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1 shrink-0 ${
                          g.authProvider === 'google'
                            ? 'text-white bg-blue-700 hover:bg-blue-800 border-blue-700 shadow-xs'
                            : 'text-blue-700 group-hover:text-blue-900 bg-white group-hover:bg-blue-100/80 border-slate-200 group-hover:border-blue-300'
                        }`}
                      >
                        {g.authProvider === 'google' ? 'Masuk' : 'Pilih'}
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
                💡 Klik tombol <strong>"Masuk"</strong> pada akun Google Anda atau <strong>"Pilih"</strong> untuk mengisi username otomatis.
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
                        className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1 shrink-0 ${
                          w.authProvider === 'google'
                            ? 'text-white bg-emerald-700 hover:bg-emerald-800 border-emerald-700 shadow-xs'
                            : 'text-emerald-700 group-hover:text-emerald-900 bg-white group-hover:bg-emerald-100/80 border-slate-200 group-hover:border-emerald-300'
                        }`}
                      >
                        {w.authProvider === 'google' ? 'Masuk' : 'Pilih'}
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
                💡 Klik tombol <strong>"Masuk"</strong> pada akun Google Anda atau <strong>"Pilih"</strong> untuk mengisi username otomatis.
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

      {/* Modal Pendaftaran Mandiri Akun Google */}
      {isGoogleRegModalOpen && googleProfileForReg && (
        <GoogleRegistrationModal
          isOpen={isGoogleRegModalOpen}
          onClose={() => {
            setIsGoogleRegModalOpen(false);
            setGoogleProfileForReg(null);
          }}
          googleProfile={googleProfileForReg}
          mapelList={mapelList}
          onCompleteRegistration={handleCompleteGoogleRegistration}
        />
      )}

      <p className="text-xs text-emerald-200/60 mt-6 text-center">
        © {new Date().getFullYear()} Pondok Pesantren Modern Al-Hikmah. Terintegrasi Google Sheets.
      </p>
    </div>
  );
};
