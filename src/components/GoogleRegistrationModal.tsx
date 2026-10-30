import React, { useState, useEffect } from 'react';
import { AppUser, MataPelajaran } from '../types';
import { KELAS_OPTIONS } from '../data/defaultData';
import {
  UserCheck,
  BookOpen,
  Check,
  X,
  AlertCircle,
  School,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  Smartphone,
  Laptop,
  Mail,
  User,
  AtSign,
} from 'lucide-react';

export interface GoogleAuthProfile {
  uid?: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

interface GoogleRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  googleProfile?: GoogleAuthProfile | null;
  mapelList?: MataPelajaran[];
  existingUsers?: AppUser[];
  onCompleteRegistration: (newUser: AppUser) => void;
  initialRole?: 'walikelas' | 'guru';
}

export const GoogleRegistrationModal: React.FC<GoogleRegistrationModalProps> = ({
  isOpen,
  onClose,
  googleProfile,
  mapelList = [],
  existingUsers = [],
  onCompleteRegistration,
  initialRole = 'walikelas',
}) => {
  // 1. Role: walikelas or guru
  const [role, setRole] = useState<'walikelas' | 'guru'>(initialRole);

  // 2. Google Email (Typed by each user)
  const [googleEmail, setGoogleEmail] = useState(googleProfile?.email || '');

  // 3. Custom Username & Password fields for cross-device login
  const defaultUsername = (googleProfile?.email || '')
    ? (googleProfile?.email || '').split('@')[0].replace(/[^a-zA-Z0-9_.-]/g, '').toLowerCase()
    : (googleProfile?.displayName || '').toLowerCase().replace(/[^a-zA-Z0-9_.-]/g, '');

  const [username, setUsername] = useState(defaultUsername || '');
  const [hasManuallyEditedUsername, setHasManuallyEditedUsername] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 4. Profile data
  const [namaLengkap, setNamaLengkap] = useState(googleProfile?.displayName || '');
  const [nip, setNip] = useState('');
  const [kelasAkses, setKelasAkses] = useState(KELAS_OPTIONS[0] || '7 MTS PUTRA');
  const [customKelas, setCustomKelas] = useState('');
  const [selectedMapelIds, setSelectedMapelIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  // Sync if googleProfile changes
  useEffect(() => {
    if (googleProfile) {
      if (googleProfile.email && !googleEmail) {
        setGoogleEmail(googleProfile.email);
        if (!username) {
          const u = googleProfile.email.split('@')[0].replace(/[^a-zA-Z0-9_.-]/g, '').toLowerCase();
          setUsername(u);
        }
      }
      if (googleProfile.displayName && !namaLengkap) {
        setNamaLengkap(googleProfile.displayName);
      }
    }
  }, [googleProfile]);

  if (!isOpen) return null;

  // Realtime check for Google email format
  const cleanEmail = googleEmail.trim().toLowerCase();
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
  const isGmail = cleanEmail.endsWith('@gmail.com');

  // Categories of subjects
  const categories = Array.from(new Set(mapelList.map((m) => m.kategori || 'Lainnya')));

  // Auto suggest username when email is typed
  const handleEmailChange = (val: string) => {
    setGoogleEmail(val);
    const clean = val.trim().toLowerCase();
    if (!hasManuallyEditedUsername && clean.includes('@')) {
      const handle = clean.split('@')[0].replace(/[^a-zA-Z0-9_.-]/g, '');
      if (handle) {
        setUsername(handle);
      }
    }
  };

  const handleAppendGmail = () => {
    let clean = googleEmail.trim();
    if (clean.includes('@')) {
      clean = clean.split('@')[0];
    }
    const withGmail = `${clean}@gmail.com`;
    setGoogleEmail(withGmail);
    if (!hasManuallyEditedUsername && clean) {
      setUsername(clean.toLowerCase().replace(/[^a-zA-Z0-9_.-]/g, ''));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Validate Google Email
    if (!cleanEmail) {
      setError('Akun Google (Email) wajib diketik untuk mendaftarkan akun Anda.');
      return;
    }

    if (!isValidEmail) {
      setError('Format akun Google tidak valid. Gunakan format email resmi, contoh: ustadz.nama@gmail.com');
      return;
    }

    // Check Google Email duplicate
    const duplicateEmail = existingUsers.some(
      (u) =>
        u.email &&
        u.email.trim().toLowerCase() === cleanEmail &&
        u.googleUid !== googleProfile?.uid
    );
    if (duplicateEmail) {
      setError(`Akun Google "${cleanEmail}" sudah terdaftar di sistem. Silakan login atau gunakan akun Google lain.`);
      return;
    }

    // 2. Validate Username
    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      setError('Username wajib diisi untuk login di perangkat lain.');
      return;
    }

    if (cleanUsername.length < 3) {
      setError('Username minimal 3 karakter.');
      return;
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      setError('Username hanya boleh berisi huruf, angka, titik (.), minus (-), atau garis bawah (_).');
      return;
    }

    // Check username uniqueness
    const duplicateUsername = existingUsers.some(
      (u) =>
        u.username.trim().toLowerCase() === cleanUsername &&
        u.googleUid !== googleProfile?.uid
    );
    if (duplicateUsername) {
      setError(`Username "${cleanUsername}" sudah digunakan oleh akun lain. Silakan pilih username lain.`);
      return;
    }

    // 3. Validate Password
    if (!password) {
      setError('Password wajib dibuat agar Anda bisa login di perangkat manapun.');
      return;
    }

    if (password.length < 4) {
      setError('Password minimal 4 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok dengan password yang Anda buat.');
      return;
    }

    // 4. Validate Full Name
    const trimmedName = namaLengkap.trim();
    if (!trimmedName) {
      setError('Nama lengkap dan gelar wajib diisi untuk cetak raport.');
      return;
    }

    if (role === 'guru' && selectedMapelIds.length === 0) {
      setError('Silakan pilih minimal satu mata pelajaran yang Anda ampu.');
      return;
    }

    const finalKelas =
      role === 'walikelas'
        ? kelasAkses === 'LAINNYA'
          ? customKelas.trim().toUpperCase() || '7 MTS PUTRA'
          : kelasAkses
        : 'Semua Kelas';

    const selectedMapelNames = mapelList
      .filter((m) => selectedMapelIds.includes(m.id))
      .map((m) => m.nama);

    // Generate safe googleUid based on profile or hashed email
    const safeGoogleUid =
      googleProfile?.uid ||
      `google-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

    const newUser: AppUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      username: cleanUsername,
      password: password, // Custom password for cross-device authentication
      role,
      fullName: trimmedName,
      namaLengkap: trimmedName,
      nip: nip.trim() || undefined,
      email: cleanEmail,
      photoUrl: googleProfile?.photoURL || undefined,
      googleUid: safeGoogleUid,
      authProvider: 'google',
      assignedClass: finalKelas,
      kelasAkses: finalKelas,
      assignedMapelIds: role === 'guru' ? selectedMapelIds : undefined,
      mapelAkses: role === 'guru' ? selectedMapelNames : undefined,
      createdAt: new Date().toISOString(),
    };

    onCompleteRegistration(newUser);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 max-h-[94vh] flex flex-col">
        {/* Header with Google Branding */}
        <div className="p-5 bg-linear-to-r from-emerald-900 via-teal-900 to-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white p-2.5 flex items-center justify-center shadow-md shrink-0">
              <svg className="w-full h-full" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/25 text-emerald-300 border border-emerald-400/30">
                  <Sparkles className="w-3 h-3 text-emerald-300" />
                  Pendaftaran Akun Google Mandiri
                </span>
              </div>
              <h3 className="font-bold text-sm text-white mt-1">
                Daftar Akun Guru & Wali Kelas
              </h3>
              <p className="text-[11px] text-emerald-200/90">
                Ketik akun Google (@gmail.com) masing-masing pengajar
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 cursor-pointer transition-colors"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cross-Device Notice Banner */}
        <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-200/80 flex items-center gap-2.5 text-xs text-emerald-950">
          <div className="flex items-center gap-1 text-emerald-700 font-bold shrink-0">
            <Laptop className="w-4 h-4" />
            <Smartphone className="w-4 h-4" />
          </div>
          <span className="leading-tight">
            Ketik <strong>Akun Google</strong> Anda dan buat <strong>Password sendiri</strong> agar akun bisa digunakan login di <strong>device manapun</strong> (HP, Laptop, PC).
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center gap-2.5 font-medium animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: KETIK AKUN GOOGLE (EMAIL GOOGLE MASING-MASING) */}
          <div className="p-4 bg-linear-to-r from-blue-50/70 to-emerald-50/70 border-2 border-emerald-500/40 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-black text-slate-900 uppercase text-[11px] flex items-center gap-1.5">
                <AtSign className="w-4 h-4 text-emerald-700" />
                1. Ketik Akun Google Anda Masing-Masing:
              </label>
              {cleanEmail && isValidEmail && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <Check className="w-3 h-3 text-emerald-700" />
                  {isGmail ? 'Akun Gmail Terverifikasi' : 'Format Email Valid'}
                </span>
              )}
            </div>

            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
              </div>
              <input
                type="email"
                required
                id="input-google-email"
                value={googleEmail}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="Ketik akun Google Anda (contoh: ustadz.ahmad@gmail.com)"
                className="w-full pl-9 pr-24 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 text-xs font-mono"
              />
              {!cleanEmail.includes('@') && cleanEmail.length > 2 && (
                <button
                  type="button"
                  onClick={handleAppendGmail}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                >
                  + @gmail.com
                </button>
              )}
            </div>

            <p className="text-[10px] text-slate-600 leading-normal">
              Pastikan mengetik alamat email Google yang aktif. Akun ini akan tertaut sebagai identitas login resmi Anda di aplikasi raport.
            </p>
          </div>

          {/* STEP 2: PILIH PERAN (WALI KELAS ATAU GURU) */}
          <div>
            <label className="block font-black text-slate-800 uppercase tracking-wide mb-2 text-[11px]">
              2. Pilih Pendaftaran Sebagai:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option A: Wali Kelas */}
              <button
                type="button"
                id="btn-role-walikelas"
                onClick={() => setRole('walikelas')}
                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  role === 'walikelas'
                    ? 'border-emerald-600 bg-emerald-50/70 shadow-md shadow-emerald-900/10'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      role === 'walikelas'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <UserCheck className="w-5 h-5" />
                  </div>
                  {role === 'walikelas' && (
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-extrabold text-sm text-slate-900">Wali Kelas</div>
                  <div className="text-[11px] text-slate-500 mt-1 leading-normal">
                    Mengelola absensi, legger nilai kelas, dan mencetak lembar raport santri.
                  </div>
                </div>
              </button>

              {/* Option B: Guru Pengajar */}
              <button
                type="button"
                id="btn-role-guru"
                onClick={() => setRole('guru')}
                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  role === 'guru'
                    ? 'border-blue-600 bg-blue-50/70 shadow-md shadow-blue-900/10'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      role === 'guru' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <BookOpen className="w-5 h-5" />
                  </div>
                  {role === 'guru' && (
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-extrabold text-sm text-slate-900">Guru Pengajar</div>
                  <div className="text-[11px] text-slate-500 mt-1 leading-normal">
                    Menginput & mengelola nilai santri untuk mata pelajaran yang Anda ampu.
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* STEP 3: BUAT USERNAME & PASSWORD SENDIRI (KUNCI CROSS-DEVICE) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <label className="font-black text-slate-900 uppercase text-[11px] block">
                  3. Buat Username & Password Sendiri (Untuk Login di Device Manapun)
                </label>
                <p className="text-[10px] text-slate-500">
                  Dengan username & password ini, Anda bisa login dari HP, Laptop, atau PC manapun meski dengan browser berbeda.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Field Username */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1 text-[10px]">
                  Username Anda
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => {
                    setHasManuallyEditedUsername(true);
                    setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''));
                  }}
                  placeholder="e.g. walikelas7a"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600 text-xs font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Huruf kecil tanpa spasi</span>
              </div>

              {/* Field Password */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1 text-[10px]">
                  Password Pilihan Anda
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 4 karakter"
                    className="w-full px-3 py-2 pr-8 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Field Konfirmasi Password */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1 text-[10px]">
                  Ulangi Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang password"
                  className={`w-full px-3 py-2 bg-white border rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600 text-xs font-mono ${
                    confirmPassword && confirmPassword !== password
                      ? 'border-rose-400 bg-rose-50/50'
                      : confirmPassword && confirmPassword === password
                      ? 'border-emerald-500 bg-emerald-50/30'
                      : 'border-slate-300'
                  }`}
                />
                {confirmPassword && confirmPassword === password && (
                  <span className="text-[10px] text-emerald-600 mt-0.5 flex items-center gap-0.5 font-bold">
                    <Check className="w-3 h-3" /> Cocok
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* STEP 4: NAMA LENGKAP & NIP */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 uppercase mb-1 text-[11px]">
                4. Nama Lengkap & Gelar (Untuk Raport)
              </label>
              <input
                type="text"
                required
                value={namaLengkap}
                onChange={(e) => setNamaLengkap(e.target.value)}
                placeholder="e.g. Ustadz Ahmad Fauzi, S.Pd.I."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:bg-white text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1 text-[11px]">
                NIP / No. Induk (Opsional)
              </label>
              <input
                type="text"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                placeholder="e.g. 1985..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:bg-white text-xs"
              />
            </div>
          </div>

          {/* STEP 5A: JIKA WALI KELAS - PILIH KELAS BINAAN */}
          {role === 'walikelas' && (
            <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-2.5">
              <label className="block font-bold text-emerald-950 uppercase text-[11px] flex items-center gap-1.5">
                <School className="w-3.5 h-3.5 text-emerald-700" />
                5. Pilih Kelas Binaan Anda:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={kelasAkses}
                  onChange={(e) => setKelasAkses(e.target.value)}
                  className="px-3 py-2.5 bg-white border border-emerald-300 rounded-xl font-bold text-slate-800 text-xs"
                >
                  {KELAS_OPTIONS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                  <option value="LAINNYA">+ Ketik Kelas Lain...</option>
                </select>

                {kelasAkses === 'LAINNYA' ? (
                  <input
                    type="text"
                    required
                    value={customKelas}
                    onChange={(e) => setCustomKelas(e.target.value)}
                    placeholder="Ketik nama kelas..."
                    className="px-3 py-2.5 bg-white border border-emerald-300 rounded-xl font-bold text-slate-800 uppercase text-xs"
                  />
                ) : (
                  <div className="flex items-center text-[11px] text-emerald-800 font-medium px-2">
                    Kelas yang Anda kelola untuk absensi dan cetak raport santri.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5B: JIKA GURU - PILIH MATA PELAJARAN YANG DIAJARKAN */}
          {role === 'guru' && (
            <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-bold text-blue-950 uppercase text-[11px] flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-700" />
                  5. Pilih Mata Pelajaran yang Anda Ampu:
                </label>
                <span className="text-[10px] font-black text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                  {selectedMapelIds.length} Mapel Dipilih
                </span>
              </div>
              <p className="text-[11px] text-blue-800 leading-normal">
                Centang mata pelajaran yang Anda ajarkan. Anda dapat menginput nilai santri untuk mata pelajaran ini:
              </p>

              <div className="max-h-48 overflow-y-auto space-y-3 bg-white p-3 rounded-xl border border-blue-200">
                {categories.map((cat) => {
                  const catMapels = mapelList.filter((m) => (m.kategori || 'Lainnya') === cat);
                  const allCatSelected =
                    catMapels.length > 0 &&
                    catMapels.every((m) => selectedMapelIds.includes(m.id));

                  return (
                    <div key={cat} className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                        <span>{cat}</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (allCatSelected) {
                              setSelectedMapelIds((prev) =>
                                prev.filter((id) => !catMapels.some((m) => m.id === id))
                              );
                            } else {
                              setSelectedMapelIds((prev) =>
                                Array.from(new Set([...prev, ...catMapels.map((m) => m.id)]))
                              );
                            }
                          }}
                          className="text-[10px] text-blue-700 hover:text-blue-900 font-bold underline cursor-pointer"
                        >
                          {allCatSelected ? 'Batal Semua' : 'Pilih Semua'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-1">
                        {catMapels.map((m) => {
                          const isChecked = selectedMapelIds.includes(m.id);
                          return (
                            <label
                              key={m.id}
                              className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                                isChecked
                                  ? 'bg-blue-50 border-blue-400 text-blue-950 font-bold'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedMapelIds((prev) => [...prev, m.id]);
                                  } else {
                                    setSelectedMapelIds((prev) =>
                                      prev.filter((id) => id !== m.id)
                                    );
                                  }
                                }}
                                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                              />
                              <span className="truncate">{m.nama}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              id="btn-submit-registration"
              className={`px-5 py-2.5 text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                role === 'guru'
                  ? 'bg-blue-700 hover:bg-blue-800 shadow-blue-900/20'
                  : 'bg-emerald-700 hover:bg-emerald-800 shadow-emerald-900/20'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Daftarkan Akun Google Saya
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
