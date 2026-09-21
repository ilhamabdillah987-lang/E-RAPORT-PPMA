import React from 'react';
import { Santri, RaportSettings } from '../../types';

interface RaportCoverProps {
  santri: Santri;
  settings: RaportSettings;
}

export const RaportCover: React.FC<RaportCoverProps> = ({ santri, settings }) => {
  return (
    <div className="print-page bg-white w-full max-w-[210mm] mx-auto min-h-[290mm] p-12 sm:p-16 flex flex-col justify-between items-center text-center shadow-md print:shadow-none border border-slate-200 print:border-none relative">
      {/* Top Logo Container */}
      <div className="pt-10 flex flex-col items-center">
        <div className="w-36 h-36 flex flex-col items-center justify-center mb-8">
          <img
            src={settings.logoUrl || '/logo-alhikmah.svg'}
            alt="Logo Pesantren Al-Hikmah"
            className="w-32 h-32 object-contain filter drop-shadow-sm"
          />
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wider text-slate-900 font-cinzel uppercase mt-2">
          LAPORAN HASIL BELAJAR
        </h1>
        {settings.namaPesantren?.toUpperCase().includes('AL-HIKMAH') ? (
          <div className="uppercase mt-3 leading-snug">
            <p className="text-xs sm:text-sm font-bold tracking-widest text-slate-700">
              {settings.namaPesantren.toUpperCase().replace('AL-HIKMAH', '').trim() || 'PONDOK PESANTREN MODERN'}
            </p>
            <p className="text-base sm:text-lg font-black tracking-widest text-slate-900 mt-0.5">
              AL-HIKMAH
            </p>
          </div>
        ) : (
          <p className="text-xs sm:text-sm font-semibold tracking-widest text-slate-700 uppercase mt-2">
            {settings.namaPesantren || 'PONDOK PESANTREN MODERN AL-HIKMAH'}
          </p>
        )}
      </div>

      {/* Santri Card Box */}
      <div className="w-full max-w-md my-8 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="mb-6">
          <p className="text-[11px] font-medium tracking-widest text-slate-500 uppercase mb-2">
            NAMA SANTRI
          </p>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-wide">
            {santri.namaLengkap}
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 text-center">
          <div>
            <p className="text-[10px] font-medium tracking-widest text-slate-400 uppercase mb-1">
              NIS / NISN
            </p>
            <p className="text-sm font-bold text-slate-800">
              {santri.nis || '-'}{santri.nisn ? ` / ${santri.nisn}` : ''}
            </p>
          </div>
          <div className="border-l border-slate-100 pl-4">
            <p className="text-[10px] font-medium tracking-widest text-slate-400 uppercase mb-1">
              TINGKAT KELAS
            </p>
            <p className="text-sm font-bold text-slate-800 uppercase">
              {settings.namaKelas || santri.kelasSaatIni}
            </p>
          </div>
        </div>
      </div>

      {/* Semester & Year Section */}
      <div className="pb-16 flex flex-col items-center">
        <div className="inline-block pb-1.5 border-b-2 border-slate-900">
          <span className="text-sm sm:text-base font-bold tracking-widest text-slate-900 uppercase">
            SEMESTER {settings.semester}
          </span>
        </div>
        <p className="text-xs sm:text-sm font-medium tracking-widest text-slate-700 uppercase mt-4">
          TAHUN PELAJARAN {settings.tahunPelajaran}
        </p>
      </div>
    </div>
  );
};
