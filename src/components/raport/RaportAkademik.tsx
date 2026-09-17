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
    <div className="print-page bg-white w-full max-w-[210mm] mx-auto min-h-[290mm] p-10 sm:p-12 flex flex-col justify-between shadow-md print:shadow-none border border-slate-200 print:border-none text-black font-sans">
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

        {/* Academic Grades Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse border-2 border-black text-xs">
            <thead>
              <tr className="bg-slate-100/60 print:bg-transparent font-bold text-center border-b-2 border-black">
                <th rowSpan={2} className="border border-black p-1.5 w-10">
                  NO
                </th>
                <th rowSpan={2} className="border border-black p-1.5 text-center">
                  MATA PELAJARAN
                </th>
                <th rowSpan={2} className="border border-black p-1.5 w-14">
                  KKM
                </th>
                <th colSpan={2} className="border border-black p-1">
                  NILAI TULIS
                </th>
                <th colSpan={2} className="border border-black p-1">
                  NILAI LISAN
                </th>
              </tr>
              <tr className="bg-slate-50 print:bg-transparent font-bold text-center border-b-2 border-black text-[11px]">
                <th className="border border-black p-1 w-14">SKOR</th>
                <th className="border border-black p-1 w-14">HURUF</th>
                <th className="border border-black p-1 w-14">SKOR</th>
                <th className="border border-black p-1 w-14">HURUF</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((kategori) => {
                const categoryMapels = mapelList.filter((m) => m.kategori === kategori);
                return (
                  <React.Fragment key={kategori}>
                    {/* Category Header Row */}
                    <tr className="bg-slate-100/80 print:bg-slate-50 font-bold border-t-2 border-b border-black">
                      <td colSpan={7} className="border border-black px-2 py-1 text-black font-extrabold text-xs">
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
                        <tr key={mapel.id} className="hover:bg-slate-50 border-b border-black">
                          <td className="border border-black text-center font-bold p-1">
                            {index + 1}
                          </td>
                          <td className="border border-black px-2 py-1 font-bold text-slate-900">
                            {mapel.nama}
                          </td>
                          <td className="border border-black text-center font-bold p-1">
                            {mapel.kkm}
                          </td>
                          <td className="border border-black text-center font-bold p-1">
                            {tulisSkor}
                          </td>
                          <td className="border border-black text-center font-medium p-1">
                            {tulisHuruf}
                          </td>
                          <td className="border border-black text-center font-bold p-1">
                            {lisanSkor}
                          </td>
                          <td className="border border-black text-center font-medium p-1">
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

      {/* Note / Info */}
      <div className="text-[10px] text-slate-600 print:text-black mt-4 flex justify-between items-center border-t border-slate-300 pt-2">
        <span>* KKM: Kriteria Ketuntasan Minimal (40)</span>
        <span className="italic">Pondok Pesantren Modern Al-Hikmah</span>
      </div>
    </div>
  );
};
