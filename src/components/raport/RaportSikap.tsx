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
    <div className="print-page bg-white w-full max-w-[210mm] mx-auto min-h-[290mm] p-10 sm:p-12 flex flex-col justify-between shadow-md print:shadow-none border border-slate-200 print:border-none text-black font-sans">
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
              <td className="border border-black p-4 font-bold text-center align-middle bg-slate-50/40 print:bg-transparent">
                Sikap Spiritual
              </td>
              <td className="border border-black p-4 text-justify leading-relaxed">
                {spiritualDesc}
              </td>
            </tr>
            <tr className="border-b border-black">
              <td className="border border-black p-4 font-bold text-center align-middle bg-slate-50/40 print:bg-transparent">
                Sikap Sosial
              </td>
              <td className="border border-black p-4 text-justify leading-relaxed">
                {sosialDesc}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Signature Section */}
      <div className="mt-16 pt-8 grid grid-cols-2 gap-8 text-xs text-black">
        {/* Left: Orang Tua */}
        <div className="text-center flex flex-col items-center">
          <p className="font-bold">Mengetahui,</p>
          <p className="font-bold">Orang Tua/Wali Santri</p>
          <div className="h-28 flex items-end">
            <div className="w-48 border-b-2 border-dashed border-black"></div>
          </div>
        </div>

        {/* Right: Wali Kelas */}
        <div className="text-center flex flex-col items-center">
          <p className="font-bold">
            {settings.kotaCetak || 'Tangerang'}, {settings.tanggalCetak || '20 Desember 2025'}
          </p>
          <p className="font-bold">Wali Kelas,</p>
          <div className="h-28 flex flex-col justify-end items-center">
            <div className="w-48 border-b-2 border-dashed border-black mb-1"></div>
            <p className="font-bold uppercase text-[11px]">
              {settings.namaWaliKelas || 'Wali Kelas 7 MTS PUTRA'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
