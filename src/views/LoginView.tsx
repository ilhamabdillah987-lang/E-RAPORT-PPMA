import React, { useState } from 'react';
import { AppUser, RaportSettings } from '../types';
import { Lock, User, Shield, GraduationCap, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface LoginViewProps {
  users: AppUser[];
  settings: RaportSettings;
  onLogin: (user: AppUser) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ users, settings, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const matchedUser = users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
    );

    if (matchedUser) {
      onLogin(matchedUser);
    } else {
      setError('Username atau password salah. Silakan hubungi admin pesantren.');
    }
  };

  const handleQuickLogin = (role: 'admin' | 'walikelas') => {
    const targetUser = users.find((u) => u.role === role);
    if (targetUser) {
      setUsername(targetUser.username);
      setPassword(targetUser.password);
      onLogin(targetUser);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-emerald-900 via-teal-900 to-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100">
      <div className="w-full max-w-md bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-emerald-500/20">
        {/* Header Branding */}
        <div className="bg-linear-to-b from-emerald-800 to-emerald-950 p-8 text-center text-white relative">
          <div className="mx-auto w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl p-2 flex items-center justify-center border border-white/20 shadow-inner mb-4">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="w-16 h-16 object-contain" />
            ) : (
              <GraduationCap className="w-10 h-10 text-emerald-300" />
            )}
          </div>
          <h1 className="text-xs uppercase font-bold tracking-widest text-emerald-200">
            {settings.namaYayasan}
          </h1>
          <h2 className="text-lg sm:text-xl font-black tracking-wide uppercase mt-1">
            {settings.namaPesantren}
          </h2>
          <p className="text-xs text-emerald-100/80 mt-1">
            Sistem Informasi Raport Digital Santri
          </p>
        </div>

        {/* Login Form */}
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username akun"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white font-bold rounded-xl text-sm shadow-md shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Shield className="w-4 h-4" />
              Masuk ke Aplikasi
            </button>
          </form>

          {/* Quick Demo Logins */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">
              Akun Demo Siap Pakai:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                className="p-2.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition-all group cursor-pointer"
              >
                <div className="font-bold text-slate-800 group-hover:text-emerald-800">
                  Admin Pesantren
                </div>
                <div className="text-[11px] text-slate-500">User: admin</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('walikelas')}
                className="p-2.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition-all group cursor-pointer"
              >
                <div className="font-bold text-slate-800 group-hover:text-emerald-800">
                  Wali Kelas 7
                </div>
                <div className="text-[11px] text-slate-500">User: walikelas7</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-emerald-200/60 mt-6 text-center">
        © {new Date().getFullYear()} Pondok Pesantren Modern Al-Hikmah. Terintegrasi Google Sheets.
      </p>
    </div>
  );
};
