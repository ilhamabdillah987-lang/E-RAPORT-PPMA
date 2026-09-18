import React, { useState } from 'react';
import { Santri, RaportSettings, MataPelajaran, NilaiSantri } from '../../types';
import { RaportKop } from './RaportKop';
import { calculateSantriRerata } from '../../utils/helpers';
import { Layers, FileSpreadsheet } from 'lucide-react';
import { exportAllDataXLSX } from '../../utils/googleSheets';

interface RaportLeggerProps {
  santriList: Santri[];
  settings: RaportSettings;
  mapelList: MataPelajaran[];
  nilaiMap: Record<string, NilaiSantri>;
}

export const RaportLegger: React.FC<RaportLeggerProps> = ({
  santriList,
  settings,
  mapelList,
  nilaiMap,
}) => {
  const [viewMode, setViewMode] = useState<'ringkas' | 'lengkap'>('ringkas');

  // Calculate scores and ranks
  const rankedSantri = santriList
    .map((santri) => {
      const n = nilaiMap[santri.id];
      const rerata = calculateSantriRerata(n, mapelList);
      return {
        santri,
        rerata,
      };
    })
    .sort((a, b) => b.rerata - a.rerata)
    .map((item, index) => ({
      ...item,
      ranking: index + 1,
    }));

  return (
    <div className="print-page bg-white w-full max-w-[210mm] mx-auto min-h-[290mm] p-10 sm:p-12 flex flex-col justify-between shadow-md print:shadow-none border border-slate-200 print:border-none text-black font-sans">
      <div>
        {/* Toggle Mode in UI (Hidden in Print) */}
        <div className="no-print flex justify-between items-center bg-slate-100 p-2.5 rounded-xl mb-4 border border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Tampilan Legger:</span>
            <button
              type="button"
              onClick={() => setViewMode('ringkas')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                viewMode === 'ringkas'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200'
              }`}
            >
              Ringkas (Sesuai Contoh)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('lengkap')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                viewMode === 'lengkap'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200'
              }`}
            >
              Matriks Lengkap Semua Mapel
            </button>
          </div>

          <button
            type="button"
            onClick={() => exportAllDataXLSX(santriList, mapelList, nilaiMap)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-all shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export Excel
          </button>
        </div>

        {/* Kop Surat */}
        <RaportKop settings={settings} />

        {/* Title */}
        <div className="text-center my-6">
          <h2 className="text-base sm:text-lg font-black tracking-wide uppercase text-black font-sans">
            LEDGER PERKEMBANGAN NILAI SANTRI
          </h2>
          <h3 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-black font-sans mt-1">
            KELAS {settings.namaKelas} - TA {settings.tahunPelajaran}
          </h3>
        </div>

        {/* Legger Table - Ringkas (Matches Screenshot 126 exactly) */}
        {viewMode === 'ringkas' ? (
          <table className="w-full border-collapse border-2 border-black text-xs">
            <thead>
              <tr className="bg-slate-100/70 print:bg-transparent font-bold text-center border-b-2 border-black">
                <th className="border border-black p-2 w-14">NO</th>
                <th className="border border-black p-2 text-center uppercase">
                  NAMA LENGKAP SANTRI
                </th>
                <th className="border border-black p-2 w-28 uppercase text-center">
                  SKOR RERATA
                </th>
                <th className="border border-black p-2 w-24 uppercase text-center">
                  RANKING
                </th>
              </tr>
            </thead>
            <tbody>
              {rankedSantri.map((item, idx) => (
                <tr key={item.santri.id} className="border-b border-black hover:bg-slate-50">
                  <td className="border border-black p-2 text-center font-bold">
                    {idx + 1}
                  </td>
                  <td className="border border-black p-2 font-bold px-3">
                    {item.santri.namaLengkap}
                  </td>
                  <td className="border border-black p-2 text-center font-extrabold text-sm">
                    {item.rerata.toFixed(2)}
                  </td>
                  <td className="border border-black p-2 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-200/90 text-black font-extrabold text-xs border border-yellow-400">
                      {item.ranking}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          /* Matriks Lengkap Semua Mapel */
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border-2 border-black text-[10px]">
              <thead>
                <tr className="bg-slate-100/70 font-bold text-center border-b border-black">
                  <th rowSpan={2} className="border border-black p-1 w-8">NO</th>
                  <th rowSpan={2} className="border border-black p-1 text-left min-w-32">NAMA SANTRI</th>
                  {mapelList.map((m) => (
                    <th key={m.id} colSpan={2} className="border border-black p-1 max-w-16 truncate">
                      {m.nama.slice(0, 10)}..
                    </th>
                  ))}
                  <th rowSpan={2} className="border border-black p-1 w-12">RERATA</th>
                  <th rowSpan={2} className="border border-black p-1 w-10">RANK</th>
                </tr>
                <tr className="bg-slate-50 font-semibold text-center border-b border-black">
                  {mapelList.map((m) => (
                    <React.Fragment key={m.id}>
                      <th className="border border-black px-1 py-0.5">T</th>
                      <th className="border border-black px-1 py-0.5">L</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rankedSantri.map((item, idx) => {
                  const n = nilaiMap[item.santri.id];
                  return (
                    <tr key={item.santri.id} className="border-b border-black hover:bg-slate-50 text-center">
                      <td className="border border-black p-1 font-bold">{idx + 1}</td>
                      <td className="border border-black p-1 font-bold text-left px-2">{item.santri.namaLengkap}</td>
                      {mapelList.map((m) => {
                        const cell = n?.akademik?.[m.id];
                        return (
                          <React.Fragment key={m.id}>
                            <td className="border border-black p-1">{cell?.tulis?.skor || 0}</td>
                            <td className="border border-black p-1">{cell?.lisan?.skor || 0}</td>
                          </React.Fragment>
                        );
                      })}
                      <td className="border border-black p-1 font-extrabold">{item.rerata.toFixed(1)}</td>
                      <td className="border border-black p-1 font-extrabold">{item.ranking}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Signature Section */}
      <div className="mt-16 pt-8 grid grid-cols-2 gap-8 text-xs sm:text-sm text-black">
        <div className="text-center flex flex-col items-center">
          <p className="font-bold">Mengetahui,</p>
          <p className="font-bold">Kepala Kepesantrenan</p>
          <div className="h-24 sm:h-28 flex flex-col justify-end items-center">
            <p className="font-extrabold uppercase underline decoration-1 underline-offset-4 text-xs sm:text-sm">
              {settings.namaKepalaKepesantrenan || 'KH. Syamsuddin Mahmud, Lc.'}
            </p>
          </div>
        </div>

        <div className="text-center flex flex-col items-center">
          <p className="font-bold">
            {settings.kotaCetak || 'Tangerang'}, {settings.tanggalCetak || '20 Desember 2025'}
          </p>
          <p className="font-bold">Wali Kelas,</p>
          <div className="h-24 sm:h-28 flex flex-col justify-end items-center">
            <p className="font-extrabold uppercase underline decoration-1 underline-offset-4 text-xs sm:text-sm">
              {settings.namaWaliKelas || 'Wali Kelas 7 MTS PUTRA'}
            </p>
            {settings.nipWaliKelas ? (
              <p className="text-[11px] font-semibold text-slate-700 mt-1">
                NIP. {settings.nipWaliKelas}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
