import React from 'react';
import { Santri, RaportSettings, NilaiSantri } from '../../types';
import { RaportKop } from './RaportKop';
import { RaportHeaderMeta } from './RaportHeaderMeta';

interface RaportEkstraAbsensiProps {
  santri: Santri;
  settings: RaportSettings;
  nilaiSantri?: NilaiSantri;
}

export const RaportEkstraAbsensi: React.FC<RaportEkstraAbsensiProps> = ({
  santri,
  settings,
  nilaiSantri,
}) => {
  const ekstrakurikuler = nilaiSantri?.ekstrakurikuler || [];
  const kehadiran = nilaiSantri?.kehadiran || { sakit: 0, izin: 0, tanpaKeterangan: 0 };

  return (
    <div className="print-page bg-white w-full max-w-[210mm] mx-auto min-h-[290mm] p-10 sm:p-12 flex flex-col justify-between shadow-md print:shadow-none border border-slate-200 print:border-none text-black font-sans">
      <div>
        {/* Kop Surat */}
        <RaportKop settings={settings} />

        {/* Header Metadata */}
        <RaportHeaderMeta santri={santri} settings={settings} />

        {/* Section C: Ekstrakurikuler */}
        <div className="mb-2 mt-4">
          <h3 className="font-extrabold text-sm uppercase underline tracking-wider text-black">
            C. EKSTRAKURIKULER
          </h3>
        </div>

        <table className="w-full border-collapse border-2 border-black text-xs mb-8">
          <thead>
            <tr className="bg-slate-100/70 print:bg-transparent font-bold text-center border-b-2 border-black">
              <th className="border border-black p-2 w-1/3 uppercase">
                KEGIATAN / PROGRAM
              </th>
              <th className="border border-black p-2 uppercase text-center">
                KETERANGAN PERKEMBANGAN
              </th>
            </tr>
          </thead>
          <tbody>
            {ekstrakurikuler.length > 0 ? (
              ekstrakurikuler.map((ek) => (
                <tr key={ek.id} className="border-b border-black">
                  <td className="border border-black p-2.5 font-bold align-top">
                    {ek.kegiatan}
                  </td>
                  <td className="border border-black p-2.5 leading-relaxed align-top">
                    {ek.keterangan}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-black">
                <td colSpan={2} className="border border-black p-3.5 text-center italic font-bold text-black bg-slate-50/30">
                  Tidak ada data kegiatan ekstrakurikuler yang diikuti
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Section D: Kehadiran */}
        <div className="mb-2">
          <h3 className="font-extrabold text-sm uppercase underline tracking-wider text-black">
            D. KEHADIRAN
          </h3>
        </div>

        <table className="w-full border-collapse border-2 border-black text-xs">
          <thead>
            <tr className="bg-slate-100/70 print:bg-transparent font-bold text-center border-b-2 border-black">
              <th className="border border-black p-2 text-left uppercase pl-4 w-3/5">
                KETERANGAN
              </th>
              <th className="border border-black p-2 uppercase text-center">
                JUMLAH (HARI)
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-black">
              <td className="border border-black p-2 pl-4 font-bold">
                Sakit
              </td>
              <td className="border border-black p-2 text-center font-bold">
                {kehadiran.sakit ?? 0}
              </td>
            </tr>
            <tr className="border-b border-black">
              <td className="border border-black p-2 pl-4 font-bold">
                Izin
              </td>
              <td className="border border-black p-2 text-center font-bold">
                {kehadiran.izin ?? 0}
              </td>
            </tr>
            <tr className="border-b border-black">
              <td className="border border-black p-2 pl-4 font-bold">
                Tanpa Keterangan
              </td>
              <td className="border border-black p-2 text-center font-bold">
                {kehadiran.tanpaKeterangan ?? 0}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Signature Section */}
      <div className="mt-16 pt-8 grid grid-cols-2 gap-8 text-xs sm:text-sm text-black">
        {/* Left: Orang Tua */}
        <div className="text-center flex flex-col items-center">
          <p className="font-bold">Mengetahui,</p>
          <p className="font-bold">Orang Tua/Wali Santri</p>
          <div className="h-24 sm:h-28 flex flex-col justify-end items-center">
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
