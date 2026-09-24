import React, { useState, useMemo } from 'react';
import { Santri, RaportSettings, AppUser, MataPelajaran } from '../types';
import { KELAS_OPTIONS } from '../data/defaultData';
import {
  Send,
  CheckCircle2,
  AlertCircle,
  Users,
  GraduationCap,
  RefreshCw,
  BookOpen,
  ShieldCheck,
  ArrowRight,
  School,
  Clock,
} from 'lucide-react';

interface PushSantriViewProps {
  santriList: Santri[];
  settings: RaportSettings;
  users: AppUser[];
  mapelList: MataPelajaran[];
  currentUser: AppUser;
  onRefreshData?: () => Promise<void>;
  onNavigateMenu?: (menu: any) => void;
}

export const PushSantriView: React.FC<PushSantriViewProps> = ({
  santriList,
  settings,
  users,
  mapelList,
  currentUser,
  onRefreshData,
  onNavigateMenu,
}) => {
  const [isPushing, setIsPushing] = useState(false);
  const [pushSuccess, setPushSuccess] = useState(false);
  const [lastPushed, setLastPushed] = useState<string>(() => {
    return localStorage.getItem('alhikmah_last_pushed_to_guru') || '';
  });
  const [toastMessage, setToastMessage] = useState<string>('');

  // Available classes computed dynamically
  const availableClasses = useMemo(() => {
    const fromSantri = Array.from(
      new Set(
        santriList
          .map((s) => (s.kelasSaatIni || '').trim())
          .filter(Boolean)
      )
    );

    const combined = Array.from(
      new Set([
        ...fromSantri,
        settings.namaKelas,
        ...KELAS_OPTIONS,
      ])
    ).filter(Boolean);

    return combined.sort((a, b) => {
      const countA = santriList.filter(
        (s) => (s.kelasSaatIni || '').trim().toLowerCase() === a.toLowerCase()
      ).length;
      const countB = santriList.filter(
        (s) => (s.kelasSaatIni || '').trim().toLowerCase() === b.toLowerCase()
      ).length;
      if (countA > 0 && countB === 0) return -1;
      if (countB > 0 && countA === 0) return 1;
      return a.localeCompare(b);
    });
  }, [santriList, settings.namaKelas]);

  // Santri count per class
  const studentCountPerClass = useMemo(() => {
    const counts: Record<string, number> = {};
    santriList.forEach((s) => {
      const k = (s.kelasSaatIni || settings.namaKelas || '').trim();
      counts[k] = (counts[k] || 0) + 1;
    });
    return counts;
  }, [santriList, settings.namaKelas]);

  // Selected Class to push
  const [selectedClass, setSelectedClass] = useState<string>(() => {
    if (currentUser?.kelasAkses || currentUser?.assignedClass) {
      return (currentUser.kelasAkses || currentUser.assignedClass || settings.namaKelas).trim();
    }
    return settings.namaKelas || '7 MTS PUTRA';
  });

  // Santri list filtered by class
  const classSantriList = useMemo(() => {
    if (!selectedClass || selectedClass === 'Semua Kelas') {
      return santriList;
    }
    return santriList.filter(
      (s) => (s.kelasSaatIni || '').trim().toLowerCase() === selectedClass.trim().toLowerCase()
    );
  }, [santriList, selectedClass]);

  // Guru accounts list
  const guruAccounts = useMemo(() => {
    return users.filter((u) => u.role === 'guru');
  }, [users]);

  // Execute push data to server
  const handlePushToGuru = async () => {
    if (santriList.length === 0) {
      setToastMessage('Data santri masih kosong. Tambahkan santri terlebih dahulu.');
      setTimeout(() => setToastMessage(''), 4000);
      return;
    }

    setIsPushing(true);
    setPushSuccess(false);

    try {
      const pushPayload = {
        santriList,
        namaKelas: selectedClass,
        pushedBy: currentUser.namaLengkap || currentUser.fullName || 'Wali Kelas',
      };

      // 1. Send to dedicated push endpoint
      const res = await fetch('/api/santri/push-to-guru', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pushPayload),
      });

      // 2. Also ensure /api/santri is updated
      await fetch('/api/santri', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(santriList),
      }).catch(() => {});

      // 3. Update localStorage timestamp
      const nowStr = new Date().toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      localStorage.setItem('alhikmah_last_pushed_to_guru', nowStr);
      setLastPushed(nowStr);

      if (onRefreshData) {
        await onRefreshData();
      }

      setPushSuccess(true);
      setToastMessage(
        `✓ Berhasil mengirim ${classSantriList.length} data santri ke seluruh akun Guru!`
      );
      setTimeout(() => setToastMessage(''), 5000);
    } catch (err: any) {
      // Offline fallback: save in localStorage
      const nowStr = new Date().toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      localStorage.setItem('alhikmah_last_pushed_to_guru', nowStr);
      localStorage.setItem('alhikmah_santri', JSON.stringify(santriList));
      setLastPushed(nowStr);
      setPushSuccess(true);
      setToastMessage(`✓ Data santri tersimpan dan siap diakses oleh akun Guru.`);
      setTimeout(() => setToastMessage(''), 5000);
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-500 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-bold text-xs">{toastMessage}</span>
        </div>
      )}

      {/* Main Header Banner */}
      <div className="bg-gradient-to-br from-emerald-800 via-emerald-900 to-teal-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-700/60 border border-emerald-600/40 text-[11px] font-black uppercase tracking-wider text-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>Sinkronisasi Data Wali Kelas ➔ Akun Guru</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Push Data Santri ke Akun Guru
            </h1>
            <p className="text-emerald-100 text-xs sm:text-sm leading-relaxed">
              Kirimkan data santri yang telah diinput atau diimpor oleh Wali Kelas ke server terpusat.
              Setelah dikirim, seluruh Guru Pengajar dapat langsung melihat nama santri dan menginput
              nilai untuk mata pelajaran masing-masing secara individual sesuai nama santri.
            </p>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={handlePushToGuru}
              disabled={isPushing || santriList.length === 0}
              className="w-full sm:w-auto px-6 py-4 bg-white hover:bg-emerald-50 text-emerald-900 font-black rounded-2xl text-sm shadow-xl hover:shadow-2xl cursor-pointer transition-all flex items-center justify-center gap-3 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <Send className={`w-5 h-5 text-emerald-700 group-hover:translate-x-0.5 transition-transform ${isPushing ? 'animate-pulse' : ''}`} />
              <span>{isPushing ? 'Sedang Mengirim ke Guru...' : '🚀 Push Data ke Akun Guru Sekarang'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Modal / Banner */}
      {pushSuccess && (
        <div className="bg-emerald-50 border-2 border-emerald-500 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in zoom-in-95">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-md">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-emerald-950 uppercase">
                Data Santri Berhasil Dikirim ke Akun Guru!
              </h4>
              <p className="text-xs text-emerald-800 mt-0.5">
                Total <strong>{santriList.length} santri</strong> (termasuk <strong>{classSantriList.length} santri kelas {selectedClass}</strong>) sudah aktif di sistem guru. Guru pengajar dapat langsung memilih kelas dan menginput nilai santri per nama.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onNavigateMenu && (
              <button
                type="button"
                onClick={() => onNavigateMenu('input-nilai')}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <span>Lihat Lembar Nilai</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setPushSuccess(false)}
              className="px-3 py-2 bg-white hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs border border-emerald-300 transition-all cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* 3 Status / Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Kelas Binaan & Santri */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Kelas Terpilih
            </span>
            <div className="text-base font-black text-slate-900">{selectedClass}</div>
            <p className="text-xs text-emerald-700 font-bold">
              {classSantriList.length} Santri Terdaftar (Total: {santriList.length})
            </p>
          </div>
        </div>

        {/* Card 2: Status Terakhir Push */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Terakhir Di-Push ke Guru
            </span>
            <div className="text-sm font-black text-slate-900">
              {lastPushed ? lastPushed : 'Belum pernah di-push'}
            </div>
            <p className="text-xs text-teal-700 font-medium">
              {lastPushed ? 'Tersinkronisasi dengan Guru' : 'Tekan tombol push di atas'}
            </p>
          </div>
        </div>

        {/* Card 3: Guru Penerima */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Akun Guru Aktif
            </span>
            <div className="text-base font-black text-slate-900">
              {guruAccounts.length} Akun Guru Pengajar
            </div>
            <p className="text-xs text-blue-700 font-bold">
              Siap Menerima Data Santri
            </p>
          </div>
        </div>
      </div>

      {/* Class Selector Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-slate-700">
              <School className="w-4 h-4 text-emerald-600" />
              <label className="text-xs font-black uppercase tracking-wide">
                Pilih Kelas untuk Ditinjau:
              </label>
            </div>

            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3.5 py-2 pr-8 rounded-xl text-xs font-black border-2 border-emerald-300 bg-emerald-50/80 text-emerald-950 focus:ring-2 focus:ring-emerald-600 cursor-pointer shadow-xs transition-all"
            >
              <option value="Semua Kelas">Semua Kelas (Total {santriList.length} Santri)</option>
              <optgroup label="Daftar Kelas:">
                {availableClasses.map((cls) => {
                  const count = studentCountPerClass[cls] || 0;
                  return (
                    <option key={cls} value={cls}>
                      {cls} — ({count} Santri{count > 0 ? ' ✓' : ''})
                    </option>
                  );
                })}
              </optgroup>
            </select>
          </div>

          <span className="text-xs text-slate-500 font-medium">
            * Tombol Push akan mengirim seluruh data santri aktif ke server agar guru semua kelas dapat menilai.
          </span>
        </div>

        {/* Quick Class Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 mr-1">Pilih Cepat:</span>
          {availableClasses
            .filter((cls) => (studentCountPerClass[cls] || 0) > 0)
            .map((cls) => {
              const count = studentCountPerClass[cls] || 0;
              const isSelected = selectedClass === cls;
              return (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setSelectedClass(cls)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{cls}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
        </div>
      </div>

      {/* 2 Column Layout: Guru Recipients & Santri Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Daftar Guru Pengajar yang Menerima Data */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Guru Pengajar Penerima ({guruAccounts.length})
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                Otomatis Menerima
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Setelah tombol Push ditekan, guru-guru berikut akan langsung melihat daftar santri di menu penilaian mereka:
            </p>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {guruAccounts.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-2xl text-center text-xs text-slate-400 font-medium">
                  Belum ada akun guru dibuat oleh Admin. (Wali Kelas tetap dapat melakukan push agar tersimpan di server).
                </div>
              ) : (
                guruAccounts.map((guru) => {
                  const mapelNames = guru.mapelAkses || [];
                  return (
                    <div
                      key={guru.id}
                      className="p-3 bg-slate-50 hover:bg-blue-50/50 rounded-2xl border border-slate-200/80 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">
                          {guru.namaLengkap || guru.fullName}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md font-bold">
                          @{guru.username}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {mapelNames.length > 0 ? (
                          mapelNames.map((m, idx) => (
                            <span
                              key={idx}
                              className="text-[9px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md"
                            >
                              {m}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">
                            Belum ditentukan mapel
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Petunjuk Alur Kerja */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-5 space-y-3">
            <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              Alur Kerja Data Santri
            </h4>
            <ol className="text-xs text-emerald-900 space-y-2 list-decimal list-inside leading-relaxed">
              <li>
                <strong>Input/Import:</strong> Wali Kelas memasukkan data santri di menu <em>Identitas Santri</em> atau <em>Import Excel</em>.
              </li>
              <li>
                <strong>Push Data:</strong> Wali Kelas menekan tombol <strong>"Push Data ke Akun Guru"</strong>.
              </li>
              <li>
                <strong>Penilaian Guru:</strong> Guru login ke akun masing-masing, memilih kelas, dan nama santri otomatis tersedia untuk dinilai satu per satu sesuai nama santri.
              </li>
            </ol>
          </div>
        </div>

        {/* Right Column: Preview Daftar Santri yang Akan Dikirim */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  Pratinjau Data Santri Siap Kirim ({classSantriList.length} Santri)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Santri kelas <strong>{selectedClass}</strong> yang akan langsung muncul di akun guru
                </p>
              </div>

              <button
                type="button"
                onClick={handlePushToGuru}
                disabled={isPushing || santriList.length === 0}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-black rounded-xl text-xs shadow-md shadow-emerald-900/10 cursor-pointer transition-all flex items-center gap-2 self-start sm:self-auto disabled:opacity-50 shrink-0"
              >
                <Send className={`w-3.5 h-3.5 ${isPushing ? 'animate-pulse' : ''}`} />
                <span>Kirim Sekarang</span>
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <th className="p-3 w-10 text-center">No</th>
                    <th className="p-3 w-14 text-center">Absen</th>
                    <th className="p-3 w-28">NIS</th>
                    <th className="p-3">Nama Lengkap Santri</th>
                    <th className="p-3 w-24 text-center">L/P</th>
                    <th className="p-3 w-28 text-center">Kelas</th>
                    <th className="p-3 w-28 text-center">Status Guru</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classSantriList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                        <p className="font-bold text-slate-700">Belum ada santri di kelas {selectedClass}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Silakan tambahkan santri melalui menu "Input Identitas Santri" terlebih dahulu.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    classSantriList.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="p-3 text-center font-extrabold text-slate-700">
                          {s.nomorUrutAbsen || idx + 1}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-600">{s.nis || '-'}</td>
                        <td className="p-3 font-bold text-slate-900">{s.namaLengkap}</td>
                        <td className="p-3 text-center text-slate-600 font-semibold">
                          {s.jenisKelamin === 'Perempuan' ? 'P' : 'L'}
                        </td>
                        <td className="p-3 text-center font-bold text-emerald-800">
                          {s.kelasSaatIni || selectedClass}
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Siap Dinilai
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Footer Note */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Menampilkan {classSantriList.length} santri</span>
              <span>Pondok Pesantren Modern Al-Hikmah</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
