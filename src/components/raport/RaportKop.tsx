import React from 'react';
import { RaportSettings } from '../../types';

interface RaportKopProps {
  settings: RaportSettings;
}

export const RaportKop: React.FC<RaportKopProps> = ({ settings }) => {
  return (
    <div className="flex items-center gap-4 border-b-2 border-black pb-2 mb-3">
      <div className="w-20 h-20 shrink-0 flex items-center justify-center p-0.5">
        <img
          src={settings.logoUrl || '/logo-alhikmah.svg'}
          alt="Logo Pesantren Al-Hikmah"
          className="w-full h-full object-contain"
        />
      </div>

      <div className="flex-1 text-center pr-4">
        <h3 className="font-bold text-sm tracking-wider uppercase text-black font-sans leading-tight">
          {settings.namaYayasan}
        </h3>
        {settings.namaPesantren?.toUpperCase().includes('AL-HIKMAH') ? (
          <h2 className="font-extrabold uppercase text-black font-sans mt-0.5 leading-tight">
            <span className="block text-sm tracking-wide">
              {settings.namaPesantren.toUpperCase().replace('AL-HIKMAH', '').trim() || 'PONDOK PESANTREN MODERN'}
            </span>
            <span className="block text-xl font-black tracking-wider mt-0.5">
              AL-HIKMAH
            </span>
          </h2>
        ) : (
          <h2 className="font-extrabold text-lg tracking-wide uppercase text-black font-sans mt-0.5 leading-tight">
            {settings.namaPesantren}
          </h2>
        )}
        <p className="text-[11px] leading-tight text-black mt-1 font-normal max-w-xl mx-auto">
          {settings.alamatPesantren}
        </p>
      </div>
    </div>
  );
};
