import React from 'react';
import { Santri, RaportSettings } from '../../types';

interface RaportIdentitasProps {
  santri: Santri;
  settings: RaportSettings;
}

export const RaportIdentitas: React.FC<RaportIdentitasProps> = ({ santri, settings }) => {
  return (
    <div className="print-page bg-white w-full max-w-[210mm] mx-auto min-h-[297mm] p-8 sm:p-10 print:p-0 flex flex-col justify-between shadow-xl shadow-slate-300/50 print:shadow-none border border-slate-300 print:border-none text-black font-sans">
      <div>
        {/* Title */}
        <h2 className="text-center font-extrabold text-base sm:text-lg tracking-wider uppercase border-b-2 border-black pb-2.5 mb-5">
          KETERANGAN TENTANG DIRI PESERTA DIDIK
        </h2>

        {/* 17 Points Form - Larger Font (text-[13px] / sm:text-sm) */}
        <div className="space-y-1.5 sm:space-y-2 text-[13px] sm:text-sm leading-snug">
          {/* 1 */}
          <div className="flex items-start">
            <span className="w-7 font-bold shrink-0">1.</span>
            <span className="w-60 shrink-0">Nama Peserta Didik (Lengkap)</span>
            <span className="w-4 shrink-0">:</span>
            <span className="flex-1 font-bold">{santri.namaLengkap}</span>
          </div>

          {/* 2 */}
          <div className="flex items-start">
            <span className="w-7 font-bold shrink-0">2.</span>
            <span className="w-60 shrink-0">NIS / NISN</span>
            <span className="w-4 shrink-0">:</span>
            <span className="flex-1 font-semibold">{santri.nis}{santri.nisn ? ` / ${santri.nisn}` : ''}</span>
          </div>

          {/* 3 */}
          <div className="flex items-start">
            <span className="w-7 font-bold shrink-0">3.</span>
            <span className="w-60 shrink-0">Tempat, Tanggal Lahir</span>
            <span className="w-4 shrink-0">:</span>
            <span className="flex-1">
              {santri.tempatLahir ? `${santri.tempatLahir}, ${santri.tanggalLahir}` : santri.tanggalLahir || '-'}
            </span>
          </div>

          {/* 4 */}
          <div className="flex items-start">
            <span className="w-7 font-bold shrink-0">4.</span>
            <span className="w-60 shrink-0">Jenis Kelamin</span>
            <span className="w-4 shrink-0">:</span>
            <span className="flex-1">{santri.jenisKelamin}</span>
          </div>

          {/* 5 */}
          <div className="flex items-start">
            <span className="w-7 font-bold shrink-0">5.</span>
            <span className="w-60 shrink-0">Agama</span>
            <span className="w-4 shrink-0">:</span>
            <span className="flex-1 font-semibold">{santri.agama || 'Islam'}</span>
          </div>

          {/* 6 */}
          <div className="flex items-start">
            <span className="w-7 font-bold shrink-0">6.</span>
            <span className="w-60 shrink-0">Status dalam Keluarga</span>
            <span className="w-4 shrink-0">:</span>
            <span className="flex-1">{santri.statusKeluarga || 'Anak Kandung'}</span>
          </div>

          {/* 7 */}
          <div className="flex items-start">
            <span className="w-7 font-bold shrink-0">7.</span>
            <span className="w-60 shrink-0">Anak ke</span>
            <span className="w-4 shrink-0">:</span>
            <span className="flex-1">{santri.anakKe || '1'}</span>
          </div>

          {/* 8 */}
          <div className="flex items-start">
            <span className="w-7 font-bold shrink-0">8.</span>
            <span className="w-60 shrink-0">Alamat Peserta Didik</span>
            <span className="w-4 shrink-0">:</span>
            <span className="flex-1 leading-relaxed">{santri.alamatSantri || '-'}</span>
          </div>

          {/* 9 */}
          <div className="flex items-start">
            <span className="w-7 font-bold shrink-0">9.</span>
            <span className="w-60 shrink-0">Nomor Telepon Rumah</span>
            <span className="w-4 shrink-0">:</span>
            <span className="flex-1">{santri.teleponRumah || '-'}</span>
          </div>

          {/* 10 */}
          <div className="flex items-start">
            <span className="w-7 font-bold shrink-0">10.</span>
            <span className="w-60 shrink-0">Sekolah Asal</span>
            <span className="w-4 shrink-0">:</span>
            <span className="flex-1">{santri.sekolahAsal || '-'}</span>
          </div>

          {/* 11 */}
          <div className="flex items-start">
            <span className="w-7 font-bold shrink-0">11.</span>
            <span className="w-60 shrink-0 font-semibold">Diterima di pesantren ini</span>
            <span className="w-4 shrink-0">:</span>
            <span className="flex-1"></span>
          </div>
          <div className="flex items-start pl-7">
            <span className="w-60 shrink-0">Di kelas</span>
            <span className="w-4 shrink-0">:</span>
            <span className="flex-1 font-semibold">{santri.diterimaKelas || settings.namaKelas}</span>
          </div>
          <div className="flex items-start pl-7">
            <span className="w-60 shrink-0">Pada tanggal</span>
            <span className="w-4 shrink-0">:</span>
            <span className="flex-1">{santri.diterimaTanggal || '-'}</span>
          </div>

          {/* 12 */}
          <div className="flex items-start">
            <span className="w-7 font-bold shrink-0">12.</span>
            <span className="w-60 shrink-0 font-semibold">Nama Orang Tua</span>
            <span className="w-4 shrink-0">:</span>
            <span className="flex-1"></span>
          </div>
          <div className="flex items-start pl-7">
            <span className="w-60 shrink-0">a. Ayah</span>
            <span className="w-4 shrink-0">:</span>
            <span className="flex-1 font-semibold">{santri.namaAyah || '-'}</span>
          </div>
          <div className="flex items-start pl-7">
            <span className="w-60 shrink-0">b. Ibu</span>
            <span className="w-4 shrink-0">:</span>
            <span className="flex-1 font-semibold">{santri.namaIbu || '-'}</span>
          </div>

          {/* 13 */}
          <div className="flex items-start">
            <span className="w-7 font-bold shrink-0">13.</span>
            <span className="w-60 shrink-0">Alamat Orang Tua</span>
            <span className="w-4 shrink-0">:</span>
            <span className="flex-1 leading-relaxed">{santri.alamatOrangTua || santri.alamatSantri || '-'}</span>
          </div>

          {/* 14 */}
          <div className="flex items-start">
            <span className="w-7 font-bold shrink-0">14.</span>
            <span className="w-60 shrink-0">Nomor Telepon Rumah</span>
            <span className="w-4 shrink-0">:</span>
            <span className="flex-1">{santri.teleponOrangTua || santri.teleponRumah || '-'}</span>
          </div>
          <div className="flex items-start pl-7">
            <span className="w-60 shrink-0 font-semibold">Pekerjaan Orang Tua</span>
            <span className="w-4 shrink-0">:</span>
            <span className="flex-1"></span>
          </div>
          <div className="flex items-start pl-7">
            <span className="w-60 shrink-0">a. Ayah</span>
            <span className="w-4 shrink-0">:</span>
            <span className="flex-1">{santri.pekerjaanAyah || '-'}</span>
          </div>
          <div className="flex items-start pl-7">
            <span className="w-60 shrink-0">b. Ibu</span>
            <span className="w-4 shrink-0">:</span>
            <span className="flex-1">{santri.pekerjaanIbu || '-'}</span>
          </div>

          {/* 15 */}
          <div className="flex items-start">
            <span className="w-7 font-bold shrink-0">15.</span>
            <span className="w-60 shrink-0">Nama Wali Peserta Didik</span>
            <span className="w-4 shrink-0">:</span>
            <span className="flex-1">{santri.namaWali || '-'}</span>
          </div>

          {/* 16 */}
          <div className="flex items-start">
            <span className="w-7 font-bold shrink-0">16.</span>
            <span className="w-60 shrink-0">Alamat Wali Peserta Didik</span>
            <span className="w-4 shrink-0">:</span>
            <span className="flex-1 leading-relaxed">{santri.alamatWali || '-'}</span>
          </div>
          <div className="flex items-start pl-7">
            <span className="w-60 shrink-0">Nomor Telepon Rumah</span>
            <span className="w-4 shrink-0">:</span>
            <span className="flex-1">{santri.teleponWali || '-'}</span>
          </div>

          {/* 17 */}
          <div className="flex items-start">
            <span className="w-7 font-bold shrink-0">17.</span>
            <span className="w-60 shrink-0">Pekerjaan Wali Peserta Didik</span>
            <span className="w-4 shrink-0">:</span>
            <span className="flex-1">{santri.pekerjaanWali || '-'}</span>
          </div>
        </div>
      </div>

      {/* Bottom Footer: Photo Box & Signature */}
      <div className="mt-6 pt-3 flex justify-between items-end">
        {/* Pas Foto 3x4 */}
        <div className="w-24 h-32 border-2 border-black flex flex-col items-center justify-center p-1 bg-white">
          {santri.fotoUrl ? (
            <img src={santri.fotoUrl} alt="Foto Santri" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center font-bold text-[11px] text-black">
              PAS FOTO<br />3 X 4 CM
            </div>
          )}
        </div>

        {/* Signature */}
        <div className="text-center text-xs sm:text-sm text-black pr-4">
          <p className="font-semibold">
            {settings.kotaCetak || 'Tangerang'}, {settings.tanggalCetak || '20 Desember 2025'}
          </p>
          <p className="font-bold tracking-wide uppercase mt-1">
            KEPALA KEPESANTRENAN,
          </p>
          <div className="h-20 flex flex-col justify-end items-center">
            {settings.namaKepalaKepesantrenan ? (
              <p className="font-extrabold underline decoration-1 underline-offset-4 text-sm sm:text-base">
                {settings.namaKepalaKepesantrenan}
              </p>
            ) : (
              <div className="flex items-center text-sm sm:text-base font-bold text-black">
                <span>(</span>
                <span className="w-48 border-b-2 border-black mx-1 inline-block"></span>
                <span>)</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
