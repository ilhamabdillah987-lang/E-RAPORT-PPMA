import React from 'react';
import { Santri, RaportSettings, MataPelajaran, NilaiSantri } from '../../types';
import { RaportKop } from './RaportKop';
import { RaportHeaderMeta } from './RaportHeaderMeta';
import { calculateScoreLetter } from '../../utils/helpers';

interface RaportAkademikProps {
  santri: Santri;
  settings: RaportSettings;
  mapelList: MataPelajaran[];
  nilaiSantri?: NilaiSantri;
}

export const RaportAkademik: React.FC<RaportAkademikProps> = ({
  santri,
  settings,
  mapelList,
  nilaiSantri,
}) => {
  // Group subjects by category
  const categories = Array.from(new Set(mapelList.map((m) => m.kategori)));

  return (
    <div className="print-page bg-white w-full max-w-[210mm] mx-auto min-h-[290mm] p-8 sm:p-10 flex flex-col justify-between shadow-md print:shadow-none border border-slate-200 print:border-none text-black font-sans">
      <div>
        {/* Kop Surat */}
        <RaportKop settings={settings} />

        {/* Header Metadata */}
        <RaportHeaderMeta santri={santri} settings={settings} />

        {/* Section Heading */}
        <div className="mb-2">
          <h3 className="font-extrabold text-sm uppercase underline tracking-wider text-black">
            A. NILAI TULIS & LISAN
          </h3>
        </div>

        {/* Academic Grades Table (Enlarged and optimized for clarity & legibility) */}
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse border-2 border-black text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-100/75 print:bg-transparent font-extrabold text-center border-b-2 border-black">
                <th rowSpan={2} className="border border-black p-2 sm:p-2.5 w-12 text-center align-middle">
                  NO
                </th>
                <th rowSpan={2} className="border border-black p-2 sm:p-2.5 text-center align-middle">
                  MATA PELAJARAN
                </th>
                <th rowSpan={2} className="border border-black p-2 sm:p-2.5 w-16 text-center align-middle">
                  KKM
                </th>
                <th colSpan={2} className="border border-black p-2 text-center">
                  NILAI TULIS
                </th>
                <th colSpan={2} className="border border-black p-2 text-center">
                  NILAI LISAN
                </th>
              </tr>
              <tr className="bg-slate-50 print:bg-transparent font-bold text-center border-b-2 border-black text-xs">
                <th className="border border-black py-1.5 px-2 w-16 text-center">SKOR</th>
                <th className="border border-black py-1.5 px-2 w-20 text-center">HURUF</th>
                <th className="border border-black py-1.5 px-2 w-16 text-center">SKOR</th>
                <th className="border border-black py-1.5 px-2 w-20 text-center">HURUF</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((kategori) => {
                const categoryMapels = mapelList.filter((m) => m.kategori === kategori);
                return (
                  <React.Fragment key={kategori}>
                    {/* Category Header Row */}
                    <tr className="bg-slate-100 print:bg-slate-50 font-black border-t-2 border-b border-black">
                      <td colSpan={7} className="border border-black px-3 py-1.5 text-black font-extrabold text-xs sm:text-sm uppercase tracking-wide">
                        {kategori}
                      </td>
                    </tr>
                    {/* Subject Rows */}
                    {categoryMapels.map((mapel, index) => {
                      const item = nilaiSantri?.akademik?.[mapel.id];
                      const tulisSkor = item?.tulis?.skor ?? 0;
                      const tulisHuruf = item?.tulis?.huruf && item?.tulis?.huruf !== '-' 
                        ? item.tulis.huruf 
                        : (tulisSkor > 0 ? calculateScoreLetter(tulisSkor, mapel.kkm) : '-');
                      
                      const lisanSkor = item?.lisan?.skor ?? 0;
                      const lisanHuruf = item?.lisan?.huruf && item?.lisan?.huruf !== '-'
                        ? item.lisan.huruf
                        : (lisanSkor > 0 ? calculateScoreLetter(lisanSkor, mapel.kkm) : '-');

                      return (
                        <tr key={mapel.id} className="hover:bg-slate-50/80 border-b border-black">
                          <td className="border border-black text-center font-bold py-2 px-1">
                            {index + 1}
                          </td>
                          <td className="border border-black px-3 py-2 font-bold text-slate-900 text-xs sm:text-sm">
                            {mapel.nama}
                          </td>
                          <td className="border border-black text-center font-bold py-2 px-1 text-xs sm:text-sm">
                            {mapel.kkm}
                          </td>
                          <td className="border border-black text-center font-extrabold py-2 px-1 text-xs sm:text-sm">
                            {tulisSkor}
                          </td>
                          <td className="border border-black text-center font-semibold py-2 px-1 text-xs sm:text-sm">
                            {tulisHuruf}
                          </td>
                          <td className="border border-black text-center font-extrabold py-2 px-1 text-xs sm:text-sm">
                            {lisanSkor}
                          </td>
                          <td className="border border-black text-center font-semibold py-2 px-1 text-xs sm:text-sm">
                            {lisanHuruf}
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

      {/* Tanda Tangan & Tanggal Cetak Raport */}
      <div className="mt-8 pt-4">
        <div className="grid grid-cols-2 gap-8 text-xs sm:text-sm text-black">
          {/* Sisi Kiri: Orang Tua / Wali Santri */}
          <div className="text-center flex flex-col items-center">
            <p className="font-bold">Mengetahui,</p>
            <p className="font-bold">Orang Tua / Wali Santri</p>
            <div className="h-24 sm:h-28 flex flex-col justify-end items-center">
              <div className="flex items-center text-xs sm:text-sm font-bold text-black">
                <span>(</span>
                <span className="w-48 border-b-2 border-black mx-1 inline-block"></span>
                <span>)</span>
              </div>
            </div>
          </div>

          {/* Sisi Kanan: Tanggal Cetak Raport & Wali Kelas */}
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

        {/* Note / Info KKM */}
        <div className="text-[10px] text-slate-600 print:text-black mt-6 flex justify-between items-center border-t border-slate-300 pt-2">
          <span>* KKM: Kriteria Ketuntasan Minimal ({mapelList[0]?.kkm || 40})</span>
          <span className="italic">{settings.namaPesantren || 'Pondok Pesantren Modern Al-Hikmah'}</span>
        </div>
      </div>
    </div>
  );
};
