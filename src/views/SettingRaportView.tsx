import React, { useState } from 'react';
import { RaportSettings, AppUser } from '../types';
import { Save, CheckCircle2, Settings as SettingsIcon, Calendar, User, Building, MapPin, UserCheck, Shield } from 'lucide-react';

interface SettingRaportViewProps {
  settings: RaportSettings;
  users?: AppUser[];
  onSaveSettings: (newSettings: RaportSettings) => void;
  onNavigateToUserManagement?: () => void;
}

export const SettingRaportView: React.FC<SettingRaportViewProps> = ({
  settings,
  users = [],
  onSaveSettings,
  onNavigateToUserManagement,
}) => {
  const [formData, setFormData] = useState<RaportSettings>({ ...settings });
  const [saved, setSaved] = useState(false);

  const walikelasUsers = users.filter((u) => u.role === 'walikelas');

  const handleSelectWaliKelas = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedUsername = e.target.value;
    if (!selectedUsername) return;

    const found = walikelasUsers.find((u) => u.username === selectedUsername);
    if (found) {
      setFormData((prev) => ({
        ...prev,
        namaWaliKelas: found.namaLengkap || found.fullName,
        nipWaliKelas: found.nip || prev.nipWaliKelas || '',
        namaKelas: found.kelasAkses || found.assignedClass || prev.namaKelas,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 uppercase">
            Pengaturan Format Raport
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Atur parameter kelas, pejabat penandatangan, serta tanggal cetak dan kenaikan
          </p>
        </div>

        {saved && (
          <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-200 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Pengaturan Berhasil Disimpan</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Pengaturan Utama Raport (Sesuai Permintaan User) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-emerald-800 flex items-center gap-2 border-b pb-2">
            <SettingsIcon className="w-4 h-4" />
            Parameter Utama Raport
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* 1. Nama Kelas */}
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1.5">
                1. Nama Kelas
              </label>
              <input
                type="text"
                required
                value={formData.namaKelas}
                onChange={(e) => setFormData({ ...formData, namaKelas: e.target.value })}
                placeholder="e.g. 7 MTS PUTRA"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:bg-white"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Ditampilkan pada Cover, Kop Surat, dan Legger Nilai
              </span>
            </div>

            {/* 2. Tanggal Cetak Raport */}
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1.5">
                2. Tanggal Cetak Raport
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={formData.tanggalCetak}
                  onChange={(e) => setFormData({ ...formData, tanggalCetak: e.target.value })}
                  placeholder="e.g. 20 Desember 2025"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Ditampilkan pada kolom tanda tangan wali kelas & kepala
              </span>
            </div>

            {/* 3. Nama Wali Kelas & NIP */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-slate-700 uppercase">
                    3. Nama Wali Kelas
                  </label>
                  {walikelasUsers.length > 0 && (
                    <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      Daftar Akun Admin
                    </span>
                  )}
                </div>

                {walikelasUsers.length > 0 && (
                  <div className="mb-2 p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-200">
                    <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                      Pilih dari Wali Kelas yang Dibuat Admin:
                    </label>
                    <select
                      onChange={handleSelectWaliKelas}
                      defaultValue=""
                      className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-semibold text-slate-800"
                    >
                      <option value="" disabled>-- Pilih Asatidz / Wali Kelas --</option>
                      {walikelasUsers.map((w) => (
                        <option key={w.id} value={w.username}>
                          {w.namaLengkap || w.fullName} ({w.kelasAkses || w.assignedClass || 'Umum'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formData.namaWaliKelas}
                    onChange={(e) => setFormData({ ...formData, namaWaliKelas: e.target.value })}
                    placeholder="Masukkan nama lengkap & gelar wali kelas"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1.5">
                  NIP / NIY Wali Kelas
                </label>
                <input
                  type="text"
                  value={formData.nipWaliKelas}
                  onChange={(e) => setFormData({ ...formData, nipWaliKelas: e.target.value })}
                  placeholder="Nomor Induk Pegawai / NIY (opsional)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
              </div>
            </div>

            {/* 4. Nama Kepala Kepesantrenan */}
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1.5">
                4. Nama Kepala Kepesantrenan
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={formData.namaKepalaKepesantrenan}
                  onChange={(e) =>
                    setFormData({ ...formData, namaKepalaKepesantrenan: e.target.value })
                  }
                  placeholder="Masukkan nama kepala kepesantrenan"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
              </div>
            </div>

            {/* 5. Tanggal Kenaikan/Kelulusan */}
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 uppercase mb-1.5">
                5. Tanggal Kenaikan / Kelulusan
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={formData.tanggalKenaikanKelulusan}
                  onChange={(e) => setFormData({ ...formData, tanggalKenaikanKelulusan: e.target.value })}
                  placeholder="e.g. 25 Juni 2026"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Digunakan sebagai tanggal penetapan pada lembar kenaikan kelas masal
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Identitas Lembaga & Periode */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-emerald-800 flex items-center gap-2 border-b pb-2">
            <Building className="w-4 h-4" />
            Identitas Lembaga Pesantren & Kop Surat
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1.5">
                Nama Yayasan
              </label>
              <input
                type="text"
                value={formData.namaYayasan}
                onChange={(e) => setFormData({ ...formData, namaYayasan: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1.5">
                Nama Pesantren
              </label>
              <input
                type="text"
                value={formData.namaPesantren}
                onChange={(e) => setFormData({ ...formData, namaPesantren: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 uppercase mb-1.5">
                Alamat Lengkap Pesantren
              </label>
              <input
                type="text"
                value={formData.alamatPesantren}
                onChange={(e) => setFormData({ ...formData, alamatPesantren: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1.5">
                Semester
              </label>
              <select
                value={formData.semester}
                onChange={(e) =>
                  setFormData({ ...formData, semester: e.target.value as 'GANJIL' | 'GENAP' })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              >
                <option value="GANJIL">GANJIL</option>
                <option value="GENAP">GENAP</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1.5">
                Tahun Pelajaran
              </label>
              <input
                type="text"
                value={formData.tahunPelajaran}
                onChange={(e) => setFormData({ ...formData, tahunPelajaran: e.target.value })}
                placeholder="2025/2026"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1.5">
                Kota Penandatanganan
              </label>
              <input
                type="text"
                value={formData.kotaCetak}
                onChange={(e) => setFormData({ ...formData, kotaCetak: e.target.value })}
                placeholder="Tangerang"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-8 py-3 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-bold rounded-2xl text-xs flex items-center gap-2 shadow-md shadow-emerald-900/10 cursor-pointer transition-all"
          >
            <Save className="w-4 h-4" />
            Simpan Seluruh Pengaturan
          </button>
        </div>
      </form>
    </div>
  );
};
