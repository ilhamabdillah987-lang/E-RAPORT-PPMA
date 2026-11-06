import React, { useState } from 'react';
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
  User,
  UserPlus,
  Laptop,
  Smartphone,
} from 'lucide-react';

export interface GoogleAuthProfile {
  uid?: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

export interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapelList?: MataPelajaran[];
  existingUsers?: AppUser[];
  onCompleteRegistration: (newUser: AppUser) => void;
  initialRole?: 'walikelas' | 'guru';
  googleProfile?: GoogleAuthProfile | null;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
  mapelList = [],
  existingUsers = [],
  onCompleteRegistration,
  initialRole = 'walikelas',
}) => {
  // 1. Role: walikelas or guru
  const [role, setRole] = useState<'walikelas' | 'guru'>(initialRole);

  // 2. Custom Username & Password
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 3. Profile details
  const [namaLengkap, setNamaLengkap] = useState('');
  const [nip, setNip] = useState('');
  const [kelasAkses, setKelasAkses] = useState(KELAS_OPTIONS[0] || '7 MTS PUTRA');
  const [customKelas, setCustomKelas] = useState('');
  const [selectedMapelIds, setSelectedMapelIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  // Categories of subjects
  const categories = Array.from(new Set(mapelList.map((m) => m.kategori || 'Lainnya')));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Validate Username
    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      setError('Username wajib diisi.');
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
      (u) => (u.username || '').trim().toLowerCase() === cleanUsername
    );
    if (duplicateUsername) {
      setError(`Username "${cleanUsername}" sudah digunakan oleh akun lain. Silakan gunakan username lain.`);
      return;
    }

    // 2. Validate Password
    if (!password) {
      setError('Password wajib dibuat.');
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

    // 3. Validate Full Name
    const trimmedName = namaLengkap.trim();
    if (!trimmedName) {
      setError('Nama lengkap dan gelar wajib diisi untuk pencetakan raport santri.');
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

    const newUser: AppUser = {
      id: `user-${cleanUsername}-${Date.now().toString(36)}`,
      username: cleanUsername,
      password: password,
      role,
      fullName: trimmedName,
      namaLengkap: trimmedName,
      nip: nip.trim() || undefined,
      authProvider: 'local',
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
        {/* Header */}
        <div className="p-5 bg-linear-to-r from-emerald-900 via-teal-900 to-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 p-2.5 flex items-center justify-center shadow-md shrink-0">
              <UserPlus className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/25 text-emerald-300 border border-emerald-400/30">
                  <Sparkles className="w-3 h-3 text-emerald-300" />
                  Pendaftaran Akun Baru
                </span>
              </div>
              <h3 className="font-bold text-sm text-white mt-1">
                Daftar Akun Guru & Wali Kelas
              </h3>
              <p className="text-[11px] text-emerald-200/90">
                Buat username & password sendiri untuk login di perangkat mana saja
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
            Akun langsung aktif dan tersimpan online. Anda dapat login di <strong>HP, Laptop, atau PC manapun</strong> menggunakan Username & Password ini.
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

          {/* STEP 1: PILIH PERAN (WALI KELAS ATAU GURU) */}
          <div>
            <label className="block font-black text-slate-800 uppercase tracking-wide mb-2 text-[11px]">
              1. Pilih Peran Anda di Pesantren:
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
                      role === 'walikelas' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
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

          {/* STEP 2: BUAT USERNAME & PASSWORD SENDIRI */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <label className="font-black text-slate-900 uppercase text-[11px] block">
                  2. Buat Username & Password (Untuk Login):
                </label>
                <p className="text-[10px] text-slate-500">
                  Gunakan username dan password ini setiap kali masuk ke aplikasi dari perangkat manapun.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Field Username */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1 text-[10px]">
                  Username Anda
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder="e.g. saskiah"
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600 text-xs font-mono"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Huruf kecil tanpa spasi</span>
              </div>

              {/* Field Password */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1 text-[10px]">
                  Password Pilihan
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 4 karakter"
                    className="w-full pl-8 pr-8 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600 text-xs font-mono"
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
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password"
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600 text-xs font-mono"
                  />
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <span className="text-[10px] text-rose-500 mt-0.5 block">Password tidak sama</span>
                )}
              </div>
            </div>
          </div>

          {/* STEP 3: NAMA LENGKAP & GELAR PENGGUNA */}
          <div className="space-y-3">
            <div>
              <label className="block font-black text-slate-800 uppercase tracking-wide mb-1 text-[11px]">
                3. Nama Lengkap & Gelar (Untuk Tercetak di Raport):
              </label>
              <input
                type="text"
                required
                id="input-full-name"
                value={namaLengkap}
                onChange={(e) => setNamaLengkap(e.target.value)}
                placeholder="Contoh: Ustadzah Saskiah Putri, S.Pd.I."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-600 text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1 text-[10px]">
                NIP / Nomor Induk Pegawai (Opsional):
              </label>
              <input
                type="text"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                placeholder="Contoh: 19850314 201101 1 003 (Kosongkan bila tidak ada)"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-600 text-xs"
              />
            </div>
          </div>

          {/* STEP 4: KELAS BINAAN (UNTUK WALI KELAS) ATAU MAPEL (UNTUK GURU) */}
          {role === 'walikelas' ? (
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2.5">
              <div className="flex items-center gap-2">
                <School className="w-4 h-4 text-emerald-700 shrink-0" />
                <label className="font-black text-emerald-950 uppercase text-[11px]">
                  4. Pilih Kelas Binaan Anda:
                </label>
              </div>

              <select
                value={kelasAkses}
                onChange={(e) => setKelasAkses(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-emerald-300 rounded-xl font-bold text-emerald-950 focus:ring-2 focus:ring-emerald-600 text-xs"
              >
                {KELAS_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
                <option value="LAINNYA">Lainnya (Ketik Manual)...</option>
              </select>

              {kelasAkses === 'LAINNYA' && (
                <input
                  type="text"
                  required
                  value={customKelas}
                  onChange={(e) => setCustomKelas(e.target.value)}
                  placeholder="Ketik nama kelas (Contoh: 10 SMA PUTRA)"
                  className="w-full px-3.5 py-2 bg-white border border-emerald-400 rounded-xl font-bold uppercase text-xs"
                />
              )}

              <p className="text-[10px] text-emerald-800">
                Sebagai Wali Kelas, Anda akan otomatis terhubung ke leger dan data santri kelas ini.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-700 shrink-0" />
                  <label className="font-black text-blue-950 uppercase text-[11px]">
                    4. Pilih Mata Pelajaran yang Anda Ampu:
                  </label>
                </div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full">
                  {selectedMapelIds.length} Mapel Dipilih
                </span>
              </div>

              {mapelList.length === 0 ? (
                <p className="text-slate-500 italic">Daftar mata pelajaran belum diatur oleh Administrator.</p>
              ) : (
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {categories.map((kat) => {
                    const mapelsInKat = mapelList.filter((m) => (m.kategori || 'Lainnya') === kat);
                    return (
                      <div key={kat} className="space-y-1.5">
                        <div className="text-[10px] font-black uppercase text-blue-900 tracking-wider bg-blue-100/60 px-2 py-0.5 rounded-md">
                          {kat}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-1">
                          {mapelsInKat.map((mapel) => {
                            const isChecked = selectedMapelIds.includes(mapel.id);
                            return (
                              <label
                                key={mapel.id}
                                className={`p-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                                  isChecked
                                    ? 'bg-blue-100/80 border-blue-400 text-blue-950 font-bold'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedMapelIds([...selectedMapelIds, mapel.id]);
                                    } else {
                                      setSelectedMapelIds(selectedMapelIds.filter((id) => id !== mapel.id));
                                    }
                                  }}
                                  className="w-3.5 h-3.5 text-blue-600 rounded-sm focus:ring-blue-500"
                                />
                                <span className="text-[11px] leading-tight truncate">{mapel.nama}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer transition-all text-xs"
            >
              Batal
            </button>
            <button
              type="submit"
              id="btn-submit-registration"
              className={`px-6 py-2.5 rounded-xl text-white font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
                role === 'walikelas'
                  ? 'bg-emerald-700 hover:bg-emerald-800 shadow-emerald-900/20'
                  : 'bg-blue-700 hover:bg-blue-800 shadow-blue-900/20'
              }`}
            >
              <Check className="w-4 h-4" />
              Selesaikan Pendaftaran & Masuk
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Backwards compatibility alias
export const GoogleRegistrationModal = RegistrationModal;
