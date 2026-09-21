import React, { useState } from 'react';
import { Santri, RaportSettings } from '../types';
import { Plus, Search, Edit2, Trash2, UserCheck, X, Image as ImageIcon } from 'lucide-react';

interface IdentitasSantriViewProps {
  santriList: Santri[];
  settings: RaportSettings;
  onSaveSantri: (santri: Santri) => void;
  onDeleteSantri: (id: string) => void;
}

export const IdentitasSantriView: React.FC<IdentitasSantriViewProps> = ({
  santriList,
  settings,
  onSaveSantri,
  onDeleteSantri,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSantri, setEditingSantri] = useState<Santri | null>(null);

  const emptySantri: Santri = {
    id: '',
    nomorUrutAbsen: santriList.length + 1,
    namaLengkap: '',
    nis: '',
    nisn: '',
    tempatLahir: 'Tangerang',
    tanggalLahir: '',
    jenisKelamin: 'Laki-laki',
    agama: 'Islam',
    statusKeluarga: 'Anak Kandung',
    anakKe: 1,
    alamatSantri: '',
    teleponRumah: '',
    sekolahAsal: '',
    diterimaKelas: settings.namaKelas,
    diterimaTanggal: '15 Juli 2025',
    namaAyah: '',
    namaIbu: '',
    alamatOrangTua: '',
    teleponOrangTua: '',
    pekerjaanAyah: '',
    pekerjaanIbu: '',
    namaWali: '-',
    alamatWali: '-',
    teleponWali: '-',
    pekerjaanWali: '-',
    kelasSaatIni: settings.namaKelas,
    statusSantri: 'Aktif',
    fotoUrl: '',
  };

  const [formData, setFormData] = useState<Santri>(emptySantri);

  const handleOpenAdd = () => {
    setEditingSantri(null);
    setFormData({
      ...emptySantri,
      id: 'santri-' + Date.now(),
      nomorUrutAbsen: santriList.length + 1,
      diterimaKelas: settings.namaKelas,
      kelasSaatIni: settings.namaKelas,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Santri) => {
    setEditingSantri(s);
    setFormData({ ...s });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSantri(formData);
    setIsModalOpen(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setFormData((prev) => ({ ...prev, fotoUrl: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const filtered = santriList.filter(
    (s) =>
      s.namaLengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.nis.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.nisn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 uppercase">
            Data Identitas Santri
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Total {santriList.length} Santri terdaftar di {settings.namaKelas}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama atau NIS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white w-52 sm:w-64"
            />
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            Tambah Santri
          </button>
        </div>
      </div>

      {/* Santri Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px]">
              <tr>
                <th className="p-3 w-12 text-center">No</th>
                <th className="p-3 w-14 text-center">Foto</th>
                <th className="p-3">Nama Lengkap</th>
                <th className="p-3">NIS / NISN</th>
                <th className="p-3">Tempat, Tgl Lahir</th>
                <th className="p-3">L/P</th>
                <th className="p-3">Kelas</th>
                <th className="p-3">Orang Tua (Ayah / Ibu)</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 font-medium">
                    Tidak ada data santri yang cocok.
                  </td>
                </tr>
              ) : (
                filtered.map((santri) => (
                  <tr key={santri.id} className="hover:bg-slate-50/80">
                    <td className="p-3 text-center font-bold text-slate-500">
                      {santri.nomorUrutAbsen}
                    </td>
                    <td className="p-3 text-center">
                      <div className="w-8 h-10 border border-slate-300 rounded overflow-hidden mx-auto bg-slate-100 flex items-center justify-center">
                        {santri.fotoUrl ? (
                          <img
                            src={santri.fotoUrl}
                            alt="Santri"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-bold text-slate-900">
                      {santri.namaLengkap}
                    </td>
                    <td className="p-3 text-slate-600 font-semibold">
                      {santri.nis} {santri.nisn ? ` / ${santri.nisn}` : ''}
                    </td>
                    <td className="p-3 text-slate-600">
                      {santri.tempatLahir ? `${santri.tempatLahir}, ${santri.tanggalLahir}` : santri.tanggalLahir || '-'}
                    </td>
                    <td className="p-3 font-semibold text-slate-700">
                      {santri.jenisKelamin === 'Laki-laki' ? 'L' : 'P'}
                    </td>
                    <td className="p-3 font-bold text-emerald-800">
                      {santri.kelasSaatIni}
                    </td>
                    <td className="p-3 text-slate-600">
                      <div className="font-semibold">{santri.namaAyah || '-'}</div>
                      <div className="text-[10px] text-slate-400">{santri.namaIbu || '-'}</div>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          santri.statusSantri === 'Aktif'
                            ? 'bg-emerald-100 text-emerald-800'
                            : santri.statusSantri === 'Lulus'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {santri.statusSantri}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(santri)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                          title="Edit Santri"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Yakin ingin menghapus santri ${santri.namaLengkap}?`)) {
                              onDeleteSantri(santri.id);
                            }
                          }}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          title="Hapus Santri"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit (Full 17 Points matching Raport Sheet 122) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 my-8 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 bg-emerald-800 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm uppercase tracking-wide">
                  {editingSantri ? 'Edit Data Identitas Santri' : 'Tambah Santri Baru'}
                </h3>
                <p className="text-[11px] text-emerald-200">
                  Formulir lengkap 17 poin sesuai format raport Pondok Pesantren Modern Al-Hikmah
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-700 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
              {/* Bagian 1: Identitas Pribadi */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-slate-800 uppercase tracking-wider border-b pb-1 text-[11px] text-emerald-800">
                  I. Keterangan Diri Santri
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      1. No Urut Absen
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.nomorUrutAbsen}
                      onChange={(e) =>
                        setFormData({ ...formData, nomorUrutAbsen: Number(e.target.value) || 1 })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      Nama Lengkap Peserta Didik
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.namaLengkap}
                      onChange={(e) => setFormData({ ...formData, namaLengkap: e.target.value })}
                      placeholder="e.g. Ahmad Fauzan"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      2. NIS (Nomor Induk Santri)
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nis}
                      onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                      placeholder="e.g. 252607001"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      NISN (Opsional)
                    </label>
                    <input
                      type="text"
                      value={formData.nisn}
                      onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                      placeholder="e.g. 0091823712"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      3. Tempat Lahir
                    </label>
                    <input
                      type="text"
                      value={formData.tempatLahir}
                      onChange={(e) => setFormData({ ...formData, tempatLahir: e.target.value })}
                      placeholder="Tangerang"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Tanggal Lahir
                    </label>
                    <input
                      type="text"
                      value={formData.tanggalLahir}
                      onChange={(e) => setFormData({ ...formData, tanggalLahir: e.target.value })}
                      placeholder="e.g. 14 Mei 2012"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      4. Jenis Kelamin
                    </label>
                    <select
                      value={formData.jenisKelamin}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          jenisKelamin: e.target.value as 'Laki-laki' | 'Perempuan',
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                    >
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">5. Agama</label>
                    <input
                      type="text"
                      value={formData.agama}
                      onChange={(e) => setFormData({ ...formData, agama: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      6. Status Keluarga
                    </label>
                    <input
                      type="text"
                      value={formData.statusKeluarga}
                      onChange={(e) => setFormData({ ...formData, statusKeluarga: e.target.value })}
                      placeholder="Anak Kandung"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">7. Anak ke</label>
                    <input
                      type="text"
                      value={formData.anakKe}
                      onChange={(e) => setFormData({ ...formData, anakKe: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      8. Alamat Peserta Didik
                    </label>
                    <textarea
                      rows={2}
                      value={formData.alamatSantri}
                      onChange={(e) => setFormData({ ...formData, alamatSantri: e.target.value })}
                      placeholder="Alamat lengkap santri..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      9. No Telepon Rumah / HP
                    </label>
                    <input
                      type="text"
                      value={formData.teleponRumah}
                      onChange={(e) => setFormData({ ...formData, teleponRumah: e.target.value })}
                      placeholder="0812..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl mb-2"
                    />
                    <label className="block font-bold text-slate-700 mb-1">
                      10. Sekolah Asal
                    </label>
                    <input
                      type="text"
                      value={formData.sekolahAsal}
                      onChange={(e) => setFormData({ ...formData, sekolahAsal: e.target.value })}
                      placeholder="SDN / MI Asal"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      11. Diterima di Pesantren (Kelas)
                    </label>
                    <input
                      type="text"
                      value={formData.diterimaKelas}
                      onChange={(e) => setFormData({ ...formData, diterimaKelas: e.target.value })}
                      placeholder="7 MTS PUTRA"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Pada Tanggal
                    </label>
                    <input
                      type="text"
                      value={formData.diterimaTanggal}
                      onChange={(e) => setFormData({ ...formData, diterimaTanggal: e.target.value })}
                      placeholder="15 Juli 2025"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Bagian 2: Orang Tua & Wali */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-slate-800 uppercase tracking-wider border-b pb-1 text-[11px] text-emerald-800">
                  II. Keterangan Orang Tua & Wali
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      12.a. Nama Ayah
                    </label>
                    <input
                      type="text"
                      value={formData.namaAyah}
                      onChange={(e) => setFormData({ ...formData, namaAyah: e.target.value })}
                      placeholder="Nama ayah kandung"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      12.b. Nama Ibu
                    </label>
                    <input
                      type="text"
                      value={formData.namaIbu}
                      onChange={(e) => setFormData({ ...formData, namaIbu: e.target.value })}
                      placeholder="Nama ibu kandung"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      13. Alamat Orang Tua
                    </label>
                    <input
                      type="text"
                      value={formData.alamatOrangTua}
                      onChange={(e) => setFormData({ ...formData, alamatOrangTua: e.target.value })}
                      placeholder="Alamat orang tua..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      14. Telepon Orang Tua
                    </label>
                    <input
                      type="text"
                      value={formData.teleponOrangTua}
                      onChange={(e) => setFormData({ ...formData, teleponOrangTua: e.target.value })}
                      placeholder="08..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Pekerjaan Ayah
                    </label>
                    <input
                      type="text"
                      value={formData.pekerjaanAyah}
                      onChange={(e) => setFormData({ ...formData, pekerjaanAyah: e.target.value })}
                      placeholder="e.g. Wiraswasta / PNS"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Pekerjaan Ibu
                    </label>
                    <input
                      type="text"
                      value={formData.pekerjaanIbu}
                      onChange={(e) => setFormData({ ...formData, pekerjaanIbu: e.target.value })}
                      placeholder="e.g. Ibu Rumah Tangga"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      15. Nama Wali (Bila ada)
                    </label>
                    <input
                      type="text"
                      value={formData.namaWali}
                      onChange={(e) => setFormData({ ...formData, namaWali: e.target.value })}
                      placeholder="-"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      17. Pekerjaan Wali
                    </label>
                    <input
                      type="text"
                      value={formData.pekerjaanWali}
                      onChange={(e) => setFormData({ ...formData, pekerjaanWali: e.target.value })}
                      placeholder="-"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Bagian 3: Foto & Status Santri */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-slate-800 uppercase tracking-wider border-b pb-1 text-[11px] text-emerald-800">
                  III. Foto Pas Santri & Status
                </h4>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-24 h-32 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                    {formData.fotoUrl ? (
                      <img
                        src={formData.fotoUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold text-center">
                        PAS FOTO<br />3 X 4 CM
                      </span>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <label className="block font-bold text-slate-700">
                      Upload Foto Santri (3x4)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="text-xs file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
                    />
                    {formData.fotoUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, fotoUrl: '' })}
                        className="text-[11px] text-rose-600 font-bold block hover:underline"
                      >
                        Hapus Foto
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Kelas Saat Ini
                    </label>
                    <input
                      type="text"
                      value={formData.kelasSaatIni}
                      onChange={(e) => setFormData({ ...formData, kelasSaatIni: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Status Santri
                    </label>
                    <select
                      value={formData.statusSantri}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          statusSantri: e.target.value as any,
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Lulus">Lulus</option>
                      <option value="Tidak Naik">Tidak Naik</option>
                      <option value="Pindah">Pindah</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Simpan Data Santri
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
