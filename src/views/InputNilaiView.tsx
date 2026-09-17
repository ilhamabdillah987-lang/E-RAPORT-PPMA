import React, { useState } from 'react';
import { Santri, MataPelajaran, NilaiSantri, RaportSettings, EkstrakurikulerItem } from '../types';
import { calculateScoreLetter, calculateSantriRerata } from '../utils/helpers';
import { Save, Plus, Trash2, CheckCircle2, ChevronRight, ChevronLeft, Award, Heart, BookOpen, Clock } from 'lucide-react';

interface InputNilaiViewProps {
  santriList: Santri[];
  mapelList: MataPelajaran[];
  nilaiMap: Record<string, NilaiSantri>;
  settings: RaportSettings;
  onSaveNilai: (nilai: NilaiSantri) => void;
}

export const InputNilaiView: React.FC<InputNilaiViewProps> = ({
  santriList,
  mapelList,
  nilaiMap,
  settings,
  onSaveNilai,
}) => {
  const [selectedSantriId, setSelectedSantriId] = useState<string>(santriList[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'akademik' | 'sikap' | 'ekstra' | 'kehadiran'>('akademik');
  const [toastMessage, setToastMessage] = useState<string>('');

  const currentSantri = santriList.find((s) => s.id === selectedSantriId) || santriList[0];
  
  // Local state for current edited nilai
  const currentNilai = (currentSantri ? nilaiMap[currentSantri.id] : null) || {
    id: `nilai-${currentSantri?.id || 'temp'}-${settings.semester}-${settings.tahunPelajaran}`,
    santriId: currentSantri?.id || '',
    kelas: settings.namaKelas,
    semester: settings.semester,
    tahunPelajaran: settings.tahunPelajaran,
    akademik: {},
    sikap: {
      spiritual: 'Tulis deskripsi sikap spiritual...',
      sosial: 'Tulis deskripsi sikap sosial...'
    },
    ekstrakurikuler: [],
    kehadiran: { sakit: 0, izin: 0, tanpaKeterangan: 0 },
    updatedAt: new Date().toISOString()
  };

  const [formNilai, setFormNilai] = useState<NilaiSantri>(currentNilai);

  // When selected student changes
  const handleSelectSantri = (id: string) => {
    setSelectedSantriId(id);
    const targetSantri = santriList.find((s) => s.id === id);
    if (targetSantri && nilaiMap[targetSantri.id]) {
      setFormNilai(nilaiMap[targetSantri.id]);
    } else if (targetSantri) {
      setFormNilai({
        id: `nilai-${targetSantri.id}-${settings.semester}-${settings.tahunPelajaran}`,
        santriId: targetSantri.id,
        kelas: settings.namaKelas,
        semester: settings.semester,
        tahunPelajaran: settings.tahunPelajaran,
        akademik: {},
        sikap: {
          spiritual: 'Tulis deskripsi sikap spiritual...',
          sosial: 'Tulis deskripsi sikap sosial...'
        },
        ekstrakurikuler: [],
        kehadiran: { sakit: 0, izin: 0, tanpaKeterangan: 0 },
        updatedAt: new Date().toISOString()
      });
    }
  };

  const handleScoreChange = (
    mapelId: string,
    field: 'tulis' | 'lisan',
    valueStr: string,
    kkm: number
  ) => {
    const num = Math.min(100, Math.max(0, Number(valueStr) || 0));
    const letter = calculateScoreLetter(num, kkm);

    setFormNilai((prev) => {
      const existing = prev.akademik[mapelId] || {
        tulis: { skor: 0, huruf: '-' },
        lisan: { skor: 0, huruf: '-' }
      };

      return {
        ...prev,
        akademik: {
          ...prev.akademik,
          [mapelId]: {
            ...existing,
            [field]: {
              skor: num,
              huruf: letter
            }
          }
        },
        updatedAt: new Date().toISOString()
      };
    });
  };

  const handleAddEkstra = () => {
    const newItem: EkstrakurikulerItem = {
      id: 'ek-' + Date.now(),
      kegiatan: '',
      keterangan: 'Aktif mengikuti kegiatan dengan baik dan bersemangat.'
    };
    setFormNilai((prev) => ({
      ...prev,
      ekstrakurikuler: [...prev.ekstrakurikuler, newItem]
    }));
  };

  const handleRemoveEkstra = (id: string) => {
    setFormNilai((prev) => ({
      ...prev,
      ekstrakurikuler: prev.ekstrakurikuler.filter((e) => e.id !== id)
    }));
  };

  const handleSave = () => {
    onSaveNilai(formNilai);
    setToastMessage(`Nilai untuk santri ${currentSantri.namaLengkap} berhasil disimpan!`);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const currentIndex = santriList.findIndex((s) => s.id === selectedSantriId);
  const handlePrev = () => {
    if (currentIndex > 0) {
      handleSelectSantri(santriList[currentIndex - 1].id);
    }
  };
  const handleNext = () => {
    if (currentIndex < santriList.length - 1) {
      handleSelectSantri(santriList[currentIndex + 1].id);
    }
  };

  const categories = Array.from(new Set(mapelList.map((m) => m.kategori)));
  const rerata = calculateSantriRerata(formNilai, mapelList);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-800 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-600 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-300" />
          <span className="font-semibold text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Header Selector Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg">
            {currentSantri?.nomorUrutAbsen || 1}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 uppercase">
                {currentSantri?.namaLengkap}
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                NIS: {currentSantri?.nis}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Kelas: <span className="font-bold text-emerald-700">{settings.namaKelas}</span> • Semester: <span className="font-bold text-emerald-700">{settings.semester}</span> • TA: {settings.tahunPelajaran}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Student Dropdown Selector */}
          <select
            value={selectedSantriId}
            onChange={(e) => handleSelectSantri(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-600"
          >
            {santriList.map((s) => (
              <option key={s.id} value={s.id}>
                Absen {s.nomorUrutAbsen}. {s.namaLengkap} ({s.nis})
              </option>
            ))}
          </select>

          {/* Navigation Prev/Next */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentIndex <= 0}
              onClick={handlePrev}
              title="Santri Sebelumnya"
              className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 text-slate-700" />
            </button>
            <button
              type="button"
              disabled={currentIndex >= santriList.length - 1}
              onClick={handleNext}
              title="Santri Selanjutnya"
              className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 text-slate-700" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-900/10 cursor-pointer transition-all"
          >
            <Save className="w-4 h-4" />
            Simpan Nilai
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('akademik')}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-xs border-b-2 transition-all cursor-pointer ${
            activeTab === 'akademik'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          A. Nilai Akademik (Tulis & Lisan)
          <span className="ml-1 text-[11px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-extrabold">
            Rerata: {rerata.toFixed(1)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sikap')}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-xs border-b-2 transition-all cursor-pointer ${
            activeTab === 'sikap'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Heart className="w-4 h-4" />
          B. Nilai Sikap (Spiritual & Sosial)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ekstra')}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-xs border-b-2 transition-all cursor-pointer ${
            activeTab === 'ekstra'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          C. Ekstrakurikuler ({formNilai.ekstrakurikuler?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('kehadiran')}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-xs border-b-2 transition-all cursor-pointer ${
            activeTab === 'kehadiran'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          D. Kehadiran / Absensi
        </button>
      </div>

      {/* Tab 1: Nilai Akademik */}
      {activeTab === 'akademik' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-600">
              Isi skor (0 - 100). Huruf predikat (A / B / C / D) akan terhitung otomatis berdasarkan KKM 40.
            </span>
            <div className="flex gap-4 font-bold text-slate-700">
              <span>Total Mapel: {mapelList.length}</span>
              <span className="text-emerald-700">Rata-Rata: {rerata.toFixed(2)}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px]">
                <tr>
                  <th className="p-3 w-12 text-center">NO</th>
                  <th className="p-3">MATA PELAJARAN</th>
                  <th className="p-3 w-16 text-center">KKM</th>
                  <th className="p-3 w-28 text-center bg-blue-50/50 text-blue-900">
                    NILAI TULIS
                  </th>
                  <th className="p-3 w-20 text-center bg-blue-50/50 text-blue-900">
                    PREDIKAT
                  </th>
                  <th className="p-3 w-28 text-center bg-emerald-50/50 text-emerald-900">
                    NILAI LISAN
                  </th>
                  <th className="p-3 w-20 text-center bg-emerald-50/50 text-emerald-900">
                    PREDIKAT
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((kategori) => {
                  const mapels = mapelList.filter((m) => m.kategori === kategori);
                  return (
                    <React.Fragment key={kategori}>
                      <tr className="bg-slate-50/90 font-extrabold text-slate-900 border-t border-slate-200">
                        <td colSpan={7} className="px-4 py-2 text-emerald-800 text-xs">
                          {kategori}
                        </td>
                      </tr>
                      {mapels.map((mapel, index) => {
                        const item = formNilai.akademik?.[mapel.id];
                        const tulisSkor = item?.tulis?.skor ?? 0;
                        const tulisHuruf = item?.tulis?.huruf || (tulisSkor > 0 ? calculateScoreLetter(tulisSkor, mapel.kkm) : '-');
                        const lisanSkor = item?.lisan?.skor ?? 0;
                        const lisanHuruf = item?.lisan?.huruf || (lisanSkor > 0 ? calculateScoreLetter(lisanSkor, mapel.kkm) : '-');

                        return (
                          <tr key={mapel.id} className="hover:bg-slate-50/80">
                            <td className="p-3 text-center font-bold text-slate-500">
                              {index + 1}
                            </td>
                            <td className="p-3 font-bold text-slate-800">
                              {mapel.nama}
                            </td>
                            <td className="p-3 text-center font-semibold text-slate-600">
                              {mapel.kkm}
                            </td>
                            {/* Nilai Tulis */}
                            <td className="p-2 text-center bg-blue-50/20">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={tulisSkor}
                                onChange={(e) =>
                                  handleScoreChange(mapel.id, 'tulis', e.target.value, mapel.kkm)
                                }
                                className="w-20 text-center py-1.5 px-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                            </td>
                            <td className="p-2 text-center font-black text-slate-700 bg-blue-50/20">
                              <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                                {tulisHuruf}
                              </span>
                            </td>
                            {/* Nilai Lisan */}
                            <td className="p-2 text-center bg-emerald-50/20">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={lisanSkor}
                                onChange={(e) =>
                                  handleScoreChange(mapel.id, 'lisan', e.target.value, mapel.kkm)
                                }
                                className="w-20 text-center py-1.5 px-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                              />
                            </td>
                            <td className="p-2 text-center font-black text-slate-700 bg-emerald-50/20">
                              <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                {lisanHuruf}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Nilai Sikap */}
      {activeTab === 'sikap' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-900">
                Deskripsi Sikap Spiritual
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setFormNilai((p) => ({
                      ...p,
                      sikap: {
                        ...p.sikap,
                        spiritual:
                          'Selalu taat menjalankan ibadah sholat fardhu berjamaah tepat waktu di masjid, istiqomah membaca Al-Qur\'an dan menghafal surat-surat pilihan, serta senantiasa berdoa sebelum dan sesudah beraktivitas.'
                      }
                    }))
                  }
                  className="text-[11px] text-emerald-700 hover:underline font-bold"
                >
                  + Gunakan Template Baik
                </button>
              </div>
            </div>
            <textarea
              rows={4}
              value={formNilai.sikap?.spiritual || ''}
              onChange={(e) =>
                setFormNilai((p) => ({
                  ...p,
                  sikap: { ...p.sikap, spiritual: e.target.value }
                }))
              }
              placeholder="Tulis deskripsi capaian sikap spiritual santri..."
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:bg-white leading-relaxed"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-900">
                Deskripsi Sikap Sosial
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setFormNilai((p) => ({
                      ...p,
                      sikap: {
                        ...p.sikap,
                        sosial:
                          'Menunjukkan sikap sopan santun dan tawadhu kepada para asatidz, memiliki kepedulian tinggi terhadap kebersihan lingkungan pondok, disiplin terhadap tata tertib, serta mampu bekerjasama dan saling tolong menolong antar teman asrama.'
                      }
                    }))
                  }
                  className="text-[11px] text-emerald-700 hover:underline font-bold"
                >
                  + Gunakan Template Baik
                </button>
              </div>
            </div>
            <textarea
              rows={4}
              value={formNilai.sikap?.sosial || ''}
              onChange={(e) =>
                setFormNilai((p) => ({
                  ...p,
                  sikap: { ...p.sikap, sosial: e.target.value }
                }))
              }
              placeholder="Tulis deskripsi capaian sikap sosial santri..."
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:bg-white leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* Tab 3: Ekstrakurikuler */}
      {activeTab === 'ekstra' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Daftar Kegiatan Ekstrakurikuler
              </h3>
              <p className="text-xs text-slate-500">
                Jika santri tidak mengikuti kegiatan, tabel raport akan menampilkan: "Tidak ada data kegiatan ekstrakurikuler yang diikuti"
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddEkstra}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tambah Kegiatan
            </button>
          </div>

          {formNilai.ekstrakurikuler?.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500">
              Belum ada ekstrakurikuler yang ditambahkan untuk santri ini.
            </div>
          ) : (
            <div className="space-y-3">
              {formNilai.ekstrakurikuler.map((ek, index) => (
                <div
                  key={ek.id}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row gap-3 items-start md:items-center"
                >
                  <div className="w-full md:w-1/3">
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Nama Kegiatan #{index + 1}
                    </label>
                    <input
                      type="text"
                      value={ek.kegiatan}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormNilai((prev) => ({
                          ...prev,
                          ekstrakurikuler: prev.ekstrakurikuler.map((item) =>
                            item.id === ek.id ? { ...item, kegiatan: val } : item
                          )
                        }));
                      }}
                      placeholder="e.g. Pramuka / Muhadharah / Silat"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div className="flex-1 w-full">
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Keterangan Perkembangan
                    </label>
                    <input
                      type="text"
                      value={ek.keterangan}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormNilai((prev) => ({
                          ...prev,
                          ekstrakurikuler: prev.ekstrakurikuler.map((item) =>
                            item.id === ek.id ? { ...item, keterangan: val } : item
                          )
                        }));
                      }}
                      placeholder="Keterangan keaktifan dan capaian santri..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveEkstra(ek.id)}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all self-end md:self-center cursor-pointer"
                    title="Hapus Kegiatan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Kehadiran */}
      {activeTab === 'kehadiran' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs max-w-xl">
          <h3 className="font-bold text-sm text-slate-900">
            Rekap Kehadiran / Absensi Semester Ini
          </h3>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
              <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
                Sakit
              </label>
              <input
                type="number"
                min={0}
                value={formNilai.kehadiran?.sakit ?? 0}
                onChange={(e) =>
                  setFormNilai((p) => ({
                    ...p,
                    kehadiran: {
                      ...p.kehadiran,
                      sakit: Math.max(0, Number(e.target.value) || 0)
                    }
                  }))
                }
                className="w-full text-center py-2 bg-white border border-slate-200 rounded-xl font-extrabold text-lg text-slate-900 focus:ring-2 focus:ring-emerald-600"
              />
              <span className="text-[10px] text-slate-400 mt-1 block font-semibold">Hari</span>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
              <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
                Izin
              </label>
              <input
                type="number"
                min={0}
                value={formNilai.kehadiran?.izin ?? 0}
                onChange={(e) =>
                  setFormNilai((p) => ({
                    ...p,
                    kehadiran: {
                      ...p.kehadiran,
                      izin: Math.max(0, Number(e.target.value) || 0)
                    }
                  }))
                }
                className="w-full text-center py-2 bg-white border border-slate-200 rounded-xl font-extrabold text-lg text-slate-900 focus:ring-2 focus:ring-emerald-600"
              />
              <span className="text-[10px] text-slate-400 mt-1 block font-semibold">Hari</span>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
              <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
                Tanpa Ket.
              </label>
              <input
                type="number"
                min={0}
                value={formNilai.kehadiran?.tanpaKeterangan ?? 0}
                onChange={(e) =>
                  setFormNilai((p) => ({
                    ...p,
                    kehadiran: {
                      ...p.kehadiran,
                      tanpaKeterangan: Math.max(0, Number(e.target.value) || 0)
                    }
                  }))
                }
                className="w-full text-center py-2 bg-white border border-slate-200 rounded-xl font-extrabold text-lg text-slate-900 focus:ring-2 focus:ring-emerald-600"
              />
              <span className="text-[10px] text-slate-400 mt-1 block font-semibold">Hari</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
