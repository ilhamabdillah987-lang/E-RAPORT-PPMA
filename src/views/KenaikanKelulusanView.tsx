import React, { useState } from 'react';
import { Santri, RaportSettings, MataPelajaran, NilaiSantri } from '../types';
import { calculateSantriRerata } from '../utils/helpers';
import { CheckCircle2, UserCheck, GraduationCap, ArrowUpRight, AlertCircle, ShieldAlert } from 'lucide-react';

interface KenaikanKelulusanViewProps {
  santriList: Santri[];
  settings: RaportSettings;
  mapelList: MataPelajaran[];
  nilaiMap: Record<string, NilaiSantri>;
  onBatchUpdateSantri: (updatedSantri: Santri[]) => void;
}

export const KenaikanKelulusanView: React.FC<KenaikanKelulusanViewProps> = ({
  santriList,
  settings,
  mapelList,
  nilaiMap,
  onBatchUpdateSantri,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(santriList.map((s) => s.id));
  const [actionMode, setActionMode] = useState<'naik' | 'lulus'>('naik');
  const [targetKelas, setTargetKelas] = useState<string>('8 MTS PUTRA');
  const [tanggalAksi, setTanggalAksi] = useState<string>(settings.tanggalKenaikanKelulusan || settings.tanggalKenaikan || '25 Juni 2026');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const toggleSelectAll = () => {
    if (selectedIds.length === santriList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(santriList.map((s) => s.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExecute = () => {
    if (selectedIds.length === 0) {
      alert('Pilih minimal satu santri untuk diproses.');
      return;
    }

    const actionText =
      actionMode === 'naik'
        ? `Naikan ${selectedIds.length} santri ke kelas ${targetKelas}?`
        : `Luluskan ${selectedIds.length} santri secara masal per tanggal ${tanggalAksi}?`;

    if (!window.confirm(actionText)) return;

    const updated = santriList.map((s) => {
      if (selectedIds.includes(s.id)) {
        if (actionMode === 'naik') {
          return {
            ...s,
            kelasSaatIni: targetKelas,
            statusSantri: 'Aktif' as const,
          };
        } else {
          return {
            ...s,
            statusSantri: 'Lulus' as const,
          };
        }
      }
      return s;
    });

    onBatchUpdateSantri(updated);
    setSuccessMsg(
      actionMode === 'naik'
        ? `Berhasil menaikkan ${selectedIds.length} santri ke ${targetKelas}!`
        : `Berhasil meluluskan ${selectedIds.length} santri!`
    );
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 uppercase">
            Menu Kenaikan & Kelulusan Masal
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Proses kenaikan tingkat kelas atau penetapan kelulusan santri secara serentak
          </p>
        </div>

        {successMsg && (
          <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-200 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* Action Setup Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Action Choice */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-2">
              Jenis Tindakan Masal
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActionMode('naik')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  actionMode === 'naik'
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                Naik Kelas
              </button>
              <button
                type="button"
                onClick={() => setActionMode('lulus')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  actionMode === 'lulus'
                    ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                Luluskan
              </button>
            </div>
          </div>

          {/* Target Class (If Naik Kelas) */}
          {actionMode === 'naik' ? (
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-2">
                Pindah ke Tingkat / Kelas Baru
              </label>
              <input
                type="text"
                value={targetKelas}
                onChange={(e) => setTargetKelas(e.target.value)}
                placeholder="e.g. 8 MTS PUTRA"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:bg-white"
              />
            </div>
          ) : (
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-2">
                Tanggal Penetapan Kelulusan
              </label>
              <input
                type="text"
                value={tanggalAksi}
                onChange={(e) => setTanggalAksi(e.target.value)}
                placeholder="e.g. 25 Juni 2026"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>
          )}

          {/* Execute Button */}
          <div className="flex flex-col justify-end">
            <button
              type="button"
              onClick={handleExecute}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 text-white shadow-md cursor-pointer transition-all ${
                actionMode === 'naik'
                  ? 'bg-emerald-700 hover:bg-emerald-800 shadow-emerald-900/10'
                  : 'bg-blue-700 hover:bg-blue-800 shadow-blue-900/10'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              Eksekusi ({selectedIds.length} Santri Terpilih)
            </button>
          </div>
        </div>
      </div>

      {/* Santri Selection Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="select-all-santri"
              checked={selectedIds.length === santriList.length && santriList.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 accent-emerald-700 rounded cursor-pointer"
            />
            <label htmlFor="select-all-santri" className="font-bold text-slate-800 cursor-pointer">
              Pilih Semua ({santriList.length} Santri)
            </label>
          </div>
          <span className="font-semibold text-slate-600">
            Terpilih: <strong className="text-emerald-800">{selectedIds.length}</strong> santri
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px]">
              <tr>
                <th className="p-3 w-10 text-center">Pilih</th>
                <th className="p-3 w-12 text-center">No</th>
                <th className="p-3">Nama Santri</th>
                <th className="p-3">NIS</th>
                <th className="p-3">Kelas Saat Ini</th>
                <th className="p-3 text-center">Rerata Nilai</th>
                <th className="p-3 text-center">Status Saat Ini</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {santriList.map((santri) => {
                const isSelected = selectedIds.includes(santri.id);
                const n = nilaiMap[santri.id];
                const rerata = calculateSantriRerata(n, mapelList);

                return (
                  <tr
                    key={santri.id}
                    onClick={() => toggleSelectOne(santri.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-emerald-50/40' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(santri.id)}
                        className="w-4 h-4 accent-emerald-700 rounded cursor-pointer"
                      />
                    </td>
                    <td className="p-3 text-center font-bold text-slate-500">
                      {santri.nomorUrutAbsen}
                    </td>
                    <td className="p-3 font-bold text-slate-900">
                      {santri.namaLengkap}
                    </td>
                    <td className="p-3 text-slate-600 font-semibold">
                      {santri.nis}
                    </td>
                    <td className="p-3 font-bold text-emerald-800">
                      {santri.kelasSaatIni}
                    </td>
                    <td className="p-3 text-center font-extrabold text-slate-800">
                      {rerata > 0 ? rerata.toFixed(1) : '-'}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
