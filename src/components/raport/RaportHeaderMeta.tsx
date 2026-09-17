import React from 'react';
import { Santri, RaportSettings } from '../../types';

interface RaportHeaderMetaProps {
  santri: Santri;
  settings: RaportSettings;
}

export const RaportHeaderMeta: React.FC<RaportHeaderMetaProps> = ({ santri, settings }) => {
  return (
    <div className="grid grid-cols-2 gap-4 text-xs text-black font-semibold mb-3">
      <div className="space-y-1">
        <div className="flex">
          <span className="w-32 inline-block">Nama Santri</span>
          <span className="mr-2">:</span>
          <span className="font-bold uppercase tracking-wide">{santri.namaLengkap}</span>
        </div>
        <div className="flex">
          <span className="w-32 inline-block">NIS/NISN</span>
          <span className="mr-2">:</span>
          <span>{santri.nis}{santri.nisn ? ` / ${santri.nisn}` : ''}</span>
        </div>
        <div className="flex">
          <span className="w-32 inline-block">Nomor Urut Absen</span>
          <span className="mr-2">:</span>
          <span>{santri.nomorUrutAbsen}</span>
        </div>
      </div>

      <div className="space-y-1 pl-4">
        <div className="flex">
          <span className="w-32 inline-block">Kelas</span>
          <span className="mr-2">:</span>
          <span className="font-bold">{settings.namaKelas || santri.kelasSaatIni}</span>
        </div>
        <div className="flex items-center">
          <span className="w-32 inline-block">Semester</span>
          <span className="mr-2">:</span>
          <span className="px-2 py-0.5 border border-emerald-600 rounded text-black font-bold text-[11px] inline-block">
            {settings.semester}
          </span>
        </div>
        <div className="flex">
          <span className="w-32 inline-block">Tahun Pelajaran</span>
          <span className="mr-2">:</span>
          <span>{settings.tahunPelajaran}</span>
        </div>
      </div>
    </div>
  );
};
