import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';

interface LoginViewProps {
  users: AppUser[];
  settings: RaportSettings;
  onLogin: (user: AppUser) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ users, settings, onLogin }) => {
  // Mode selection: 'guru' (default / newly requested), 'walikelas', or 'admin'
  const [loginMode, setLoginMode] = useState<'guru' | 'walikelas' | 'admin'>('guru');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Always sync with the latest localStorage users list if available
  const allUsers = useMemo<AppUser[]>(() => {
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
  }, [users]);

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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanUsername) {
      setError('Silakan masukkan username akun Anda.');
      return;
    }
    if (!cleanPassword) {
      setError('Silakan masukkan password akun Anda.');
      return;
    }

    // 1. Check if user exists by username (case-insensitive)
    const matchedUser = allUsers.find(
      (u) => u.username.trim().toLowerCase() === cleanUsername
    );

    if (!matchedUser) {
      if (loginMode === 'guru') {
        setError(
          `Username "${username.trim()}" tidak ditemukan. Pastikan Anda menggunakan username Guru Pengajar yang telah dibuatkan oleh Admin di akun admin.`
        );
      } else if (loginMode === 'walikelas') {
        setError(
          `Username "${username.trim()}" tidak ditemukan. Pastikan Anda menggunakan username Wali Kelas yang telah dibuatkan oleh Admin di akun admin.`
        );
      } else {
        setError(`Username "${username.trim()}" tidak ditemukan sebagai Administrator.`);
      }
      return;
    }

    // 2. Validate Password (supports exact match or trimmed match)
    if (matchedUser.password !== password && matchedUser.password.trim() !== cleanPassword) {
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
      setPassword(adminUser.password);
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
                      title="Klik untuk memilih akun ini dan mengisi username secara otomatis"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-slate-900 text-xs truncate group-hover:text-blue-900">
                          {g.namaLengkap || g.fullName || 'Guru Pengajar'}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span className="font-mono text-blue-700 font-semibold">
                            user: {g.username}
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

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectUser(g);
                        }}
                        className="text-[11px] font-bold text-blue-700 group-hover:text-blue-900 bg-white group-hover:bg-blue-100/80 px-2.5 py-1.5 rounded-lg border border-slate-200 group-hover:border-blue-300 transition-all flex items-center gap-1 shrink-0"
                      >
                        Pilih
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-blue-900">
                  <p className="font-bold">Belum ada akun Guru yang dibuatkan oleh Admin.</p>
                  <p className="mt-0.5 text-blue-800">
                    Silakan login sebagai <strong>Administrator</strong> lalu buatkan akun guru baru
                    serta tentukan mata pelajaran yang diajarkan pada menu Manajemen Pengguna.
                  </p>
                </div>
              )}

              <p className="text-[10px] text-slate-400 mt-2.5 text-center">
                💡 Klik tombol <strong>"Pilih"</strong> pada salah satu akun di atas untuk mengisi
                username secara otomatis.
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
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-slate-900 text-xs truncate group-hover:text-emerald-900">
                          {w.namaLengkap || w.fullName || 'Wali Kelas'}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span className="font-mono text-emerald-700 font-semibold">
                            user: {w.username}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="truncate bg-slate-200/70 px-1.5 py-0.2 rounded text-[10px] text-slate-700 font-medium">
                            {w.kelasAkses || w.assignedClass || 'Semua Kelas'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectUser(w);
                        }}
                        className="text-[11px] font-bold text-emerald-700 group-hover:text-emerald-900 bg-white group-hover:bg-emerald-100/80 px-2.5 py-1.5 rounded-lg border border-slate-200 group-hover:border-emerald-300 transition-all flex items-center gap-1 shrink-0"
                      >
                        Pilih
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                  <p className="font-bold">Belum ada akun Wali Kelas yang dibuatkan oleh Admin.</p>
                  <p className="mt-0.5 text-amber-700">
                    Silakan login sebagai <strong>Administrator</strong> (menu di atas) lalu buka menu{' '}
                    <strong>"Manajemen Pengguna"</strong> untuk membuatkan akun.
                  </p>
                </div>
              )}

              <p className="text-[10px] text-slate-400 mt-2.5 text-center">
                💡 Klik tombol <strong>"Pilih"</strong> pada salah satu akun di atas untuk mengisi
                username secara otomatis.
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

      <p className="text-xs text-emerald-200/60 mt-6 text-center">
        © {new Date().getFullYear()} Pondok Pesantren Modern Al-Hikmah. Terintegrasi Google Sheets.
      </p>
    </div>
  );
};
