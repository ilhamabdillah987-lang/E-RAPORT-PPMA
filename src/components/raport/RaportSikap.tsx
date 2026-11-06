import React from 'react';
import { Santri, RaportSettings, NilaiSantri } from '../../types';
import { RaportKop } from './RaportKop';
import { RaportHeaderMeta } from './RaportHeaderMeta';

interface RaportSikapProps {
  santri: Santri;
  settings: RaportSettings;
  nilaiSantri?: NilaiSantri;
}

export const RaportSikap: React.FC<RaportSikapProps> = ({
  santri,
  settings,
  nilaiSantri,
}) => {
  const spiritualDesc = nilaiSantri?.sikap?.spiritual || 'Tulis deskripsi sikap spiritual...';
  const sosialDesc = nilaiSantri?.sikap?.sosial || 'Tulis deskripsi sikap sosial...';

  return (
    <div className="print-page bg-white w-full max-w-[210mm] mx-auto min-h-[297mm] p-8 sm:p-10 print:p-0 flex flex-col justify-between shadow-xl shadow-slate-300/50 print:shadow-none border border-slate-300 print:border-none text-black font-sans">
      <div>
        {/* Kop Surat */}
        <RaportKop settings={settings} />

        {/* Header Metadata */}
        <RaportHeaderMeta santri={santri} settings={settings} />

        {/* Section Heading */}
        <div className="mb-2">
          <h3 className="font-extrabold text-sm uppercase underline tracking-wider text-black">
            B. SIKAP
          </h3>
        </div>

        {/* Sikap Table */}
        <table className="w-full border-collapse border-2 border-black text-xs">
          <thead>
            <tr className="bg-slate-100/70 print:bg-transparent font-bold text-center border-b-2 border-black">
              <th className="border border-black p-2.5 w-44 uppercase">
                ASPEK PENILAIAN
              </th>
              <th className="border border-black p-2.5 uppercase text-center">
                DESKRIPSI CAPAIAN
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-black">
              <td className="border border-black p-4 font-bold text-center align-top bg-slate-50/40 print:bg-transparent w-44">
                Sikap Spiritual
              </td>
              <td className="border border-black p-5 text-justify leading-relaxed align-top h-48 print:h-44">
                {spiritualDesc}
              </td>
            </tr>
            <tr className="border-b border-black">
              <td className="border border-black p-4 font-bold text-center align-top bg-slate-50/40 print:bg-transparent w-44">
                Sikap Sosial
              </td>
              <td className="border border-black p-5 text-justify leading-relaxed align-top h-48 print:h-44">
                {sosialDesc}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Signature Section */}
      <div className="mt-10 pt-4 grid grid-cols-2 gap-8 text-xs sm:text-sm text-black">
        {/* Left: Orang Tua */}
        <div className="text-center flex flex-col items-center">
          <p className="font-bold">Mengetahui,</p>
          <p className="font-bold">Orang Tua/Wali Santri</p>
          <div className="h-20 sm:h-24 print:h-20 flex flex-col justify-end items-center">
            <div className="flex items-center text-xs sm:text-sm font-bold text-black">
              <span>(</span>
              <span className="w-48 border-b-2 border-black mx-1 inline-block"></span>
              <span>)</span>
            </div>
          </div>
        </div>

        {/* Right: Wali Kelas */}
        <div className="text-center flex flex-col items-center">
          <p className="font-bold">
            {settings.kotaCetak || 'Tangerang'}, {settings.tanggalCetak || '20 Desember 2025'}
          </p>
          <p className="font-bold">Wali Kelas,</p>
          <div className="h-20 sm:h-24 print:h-20 flex flex-col justify-end items-center">
            {settings.namaWaliKelas ? (
              <p className="font-extrabold underline decoration-1 underline-offset-4 text-xs sm:text-sm">
                {settings.namaWaliKelas}
              </p>
            ) : (
              <div className="flex items-center text-xs sm:text-sm font-bold text-black">
                <span>(</span>
                <span className="w-48 border-b-2 border-black mx-1 inline-block"></span>
                <span>)</span>
              </div>
            )}
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
