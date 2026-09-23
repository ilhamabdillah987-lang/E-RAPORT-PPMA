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
} from 'lucide-react';

export interface GoogleAuthProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface GoogleRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  googleProfile: GoogleAuthProfile;
  mapelList?: MataPelajaran[];
  onCompleteRegistration: (newUser: AppUser) => void;
}

export const GoogleRegistrationModal: React.FC<GoogleRegistrationModalProps> = ({
  isOpen,
  onClose,
  googleProfile,
  mapelList = [],
  onCompleteRegistration,
}) => {
  const [role, setRole] = useState<'guru' | 'walikelas'>('guru');
  const [namaLengkap, setNamaLengkap] = useState(googleProfile.displayName || '');
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

    const trimmedName = namaLengkap.trim();
    if (!trimmedName) {
      setError('Nama lengkap dan gelar wajib diisi.');
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

    // Generate safe username from Google email or displayName
    const baseUsername = googleProfile.email
      ? googleProfile.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '')
      : trimmedName.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');

    const newUser: AppUser = {
      id: `google-${googleProfile.uid || Date.now()}`,
      username: baseUsername || `user_${Date.now()}`,
      password: '-', // Authenticated via Google
      role,
      fullName: trimmedName,
      namaLengkap: trimmedName,
      nip: nip.trim() || undefined,
      email: googleProfile.email || undefined,
      photoUrl: googleProfile.photoURL || undefined,
      googleUid: googleProfile.uid,
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
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 max-h-[92vh] flex flex-col">
        {/* Header with Google User Info */}
        <div className="p-5 bg-linear-to-r from-emerald-900 via-teal-900 to-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            {googleProfile.photoURL ? (
              <img
                src={googleProfile.photoURL}
                alt="Foto Profil Google"
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-2xl object-cover border-2 border-white/30 shadow-md"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center font-black text-lg border border-white/20">
                {(googleProfile.displayName || 'G')[0].toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <Sparkles className="w-3 h-3 text-emerald-300" />
                  Akun Google Terverifikasi
                </span>
              </div>
              <h3 className="font-bold text-sm text-white mt-0.5">
                {googleProfile.displayName || 'Pengguna Google'}
              </h3>
              <p className="text-[11px] text-emerald-200/80 font-mono">
                {googleProfile.email || 'Google Account'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: PILIH PERAN (GURU ATAU WALI KELAS) */}
          <div>
            <label className="block font-black text-slate-800 uppercase tracking-wide mb-2 text-[11px]">
              1. Pilih Pendaftaran Sebagai:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option A: Guru Pengajar */}
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
                    Menginput & mengelola nilai santri untuk mata pelajaran yang Anda ajarkan.
                  </div>
                </div>
              </button>

              {/* Option B: Wali Kelas */}
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
            </div>
          </div>

          {/* STEP 2: NAMA LENGKAP & GELAR */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 uppercase mb-1 text-[11px]">
                2. Nama Lengkap & Gelar
              </label>
              <input
                type="text"
                required
                value={namaLengkap}
                onChange={(e) => setNamaLengkap(e.target.value)}
                placeholder="e.g. Ustadz Ahmad, S.Pd.I."
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

          {/* STEP 3A: JIKA GURU - PILIH MATA PELAJARAN YANG DIAJARKAN */}
          {role === 'guru' && (
            <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-bold text-blue-950 uppercase text-[11px] flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-700" />
                  3. Pilih Mata Pelajaran yang Anda Ampu:
                </label>
                <span className="text-[10px] font-black text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                  {selectedMapelIds.length} Mapel Dipilih
                </span>
              </div>
              <p className="text-[11px] text-blue-800 leading-normal">
                Centang mata pelajaran yang Anda ajarkan. Anda akan dapat menginput nilai santri untuk mata pelajaran ini:
              </p>

              <div className="max-h-52 overflow-y-auto space-y-3 bg-white p-3 rounded-xl border border-blue-200">
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

          {/* STEP 3B: JIKA WALI KELAS - TETAPKAN KELAS BINAAN */}
          {role === 'walikelas' && (
            <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-2.5">
              <label className="block font-bold text-emerald-950 uppercase text-[11px] flex items-center gap-1.5">
                <School className="w-3.5 h-3.5 text-emerald-700" />
                3. Pilih Kelas Binaan Anda:
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
                    Anda akan mengelola kelas ini di E-Raport
                  </div>
                )}
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
              className={`px-5 py-2.5 text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer ${
                role === 'guru'
                  ? 'bg-blue-700 hover:bg-blue-800 shadow-blue-900/20'
                  : 'bg-emerald-700 hover:bg-emerald-800 shadow-emerald-900/20'
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
