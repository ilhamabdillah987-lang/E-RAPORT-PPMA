import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Santri, MataPelajaran, NilaiSantri, RaportSettings } from '../types';
import { exportSantriTemplate, exportNilaiTemplate, exportAllDataXLSX } from '../utils/googleSheets';
import { Download, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface ImportExportViewProps {
  santriList: Santri[];
  mapelList: MataPelajaran[];
  nilaiMap: Record<string, NilaiSantri>;
  settings: RaportSettings;
  onImportSantri: (newSantri: Santri[]) => void;
  onImportNilai: (newNilaiMap: Record<string, NilaiSantri>) => void;
}

export const ImportExportView: React.FC<ImportExportViewProps> = ({
  santriList,
  mapelList,
  nilaiMap,
  settings,
  onImportSantri,
  onImportNilai,
}) => {
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Handle Excel Import for Santri
  const handleSantriFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatusMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rows || rows.length === 0) {
          setStatusMsg({ type: 'error', text: 'File Excel kosong atau format tidak sesuai.' });
          setIsProcessing(false);
          return;
        }

        const importedSantri: Santri[] = rows.map((r, i) => ({
          id: 'santri-' + (Date.now() + i),
          nomorUrutAbsen: Number(r['No Absen']) || i + 1,
          namaLengkap: String(r['Nama Lengkap'] || r['Nama'] || 'Santri Baru'),
          nis: String(r['NIS'] || `252607${100 + i}`),
          nisn: String(r['NISN'] || ''),
          tempatLahir: String(r['Tempat Lahir'] || 'Tangerang'),
          tanggalLahir: String(r['Tanggal Lahir'] || '10 Juni 2012'),
          jenisKelamin: r['Jenis Kelamin']?.toString().includes('P') ? 'Perempuan' : 'Laki-laki',
          agama: String(r['Agama'] || 'Islam'),
          statusKeluarga: String(r['Status Keluarga'] || 'Anak Kandung'),
          anakKe: r['Anak Ke'] || 1,
          alamatSantri: String(r['Alamat Santri'] || r['Alamat'] || '-'),
          teleponRumah: String(r['Telepon Rumah'] || r['No Telp'] || '-'),
          sekolahAsal: String(r['Sekolah Asal'] || '-'),
          diterimaKelas: String(r['Diterima Di Kelas'] || settings.namaKelas),
          diterimaTanggal: String(r['Diterima Pada Tanggal'] || '15 Juli 2025'),
          namaAyah: String(r['Nama Ayah'] || '-'),
          namaIbu: String(r['Nama Ibu'] || '-'),
          alamatOrangTua: String(r['Alamat Orang Tua'] || '-'),
          teleponOrangTua: String(r['Telepon Orang Tua'] || '-'),
          pekerjaanAyah: String(r['Pekerjaan Ayah'] || '-'),
          pekerjaanIbu: String(r['Pekerjaan Ibu'] || '-'),
          namaWali: String(r['Nama Wali'] || '-'),
          alamatWali: String(r['Alamat Wali'] || '-'),
          teleponWali: String(r['Telepon Wali'] || '-'),
          pekerjaanWali: String(r['Pekerjaan Wali'] || '-'),
          kelasSaatIni: String(r['Kelas Saat Ini'] || settings.namaKelas),
          statusSantri: 'Aktif',
        }));

        onImportSantri(importedSantri);
        setStatusMsg({
          type: 'success',
          text: `Berhasil mengimpor ${importedSantri.length} data identitas santri!`
        });
      } catch (err: any) {
        setStatusMsg({
          type: 'error',
          text: `Gagal membaca file Excel: ${err.message || err}`
        });
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Handle Excel Import for Nilai
  const handleNilaiFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatusMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rows || rows.length === 0) {
          setStatusMsg({ type: 'error', text: 'File Excel nilai kosong.' });
          setIsProcessing(false);
          return;
        }

        const updatedNilaiMap = { ...nilaiMap };
        let matchedCount = 0;

        rows.forEach((r) => {
          const nis = String(r['NIS'] || '').trim();
          const targetSantri = santriList.find((s) => s.nis.trim() === nis);

          if (targetSantri) {
            matchedCount++;
            const existing = updatedNilaiMap[targetSantri.id] || {
              id: `nilai-${targetSantri.id}-${settings.semester}-${settings.tahunPelajaran}`,
              santriId: targetSantri.id,
              kelas: settings.namaKelas,
              semester: settings.semester,
              tahunPelajaran: settings.tahunPelajaran,
              akademik: {},
              sikap: {
                spiritual: r['Sikap Spiritual'] || 'Tulis deskripsi sikap spiritual...',
                sosial: r['Sikap Sosial'] || 'Tulis deskripsi sikap sosial...'
              },
              ekstrakurikuler: [],
              kehadiran: {
                sakit: Number(r['Sakit']) || 0,
                izin: Number(r['Izin']) || 0,
                tanpaKeterangan: Number(r['Tanpa Keterangan']) || 0
              },
              updatedAt: new Date().toISOString()
            };

            // Map academic scores
            mapelList.forEach((m) => {
              const tulisVal = Number(r[`${m.nama} (Tulis)`]) || 0;
              const lisanVal = Number(r[`${m.nama} (Lisan)`]) || 0;

              existing.akademik[m.id] = {
                tulis: { skor: tulisVal, huruf: tulisVal > 0 ? (tulisVal >= 85 ? 'A' : tulisVal >= 75 ? 'B' : 'C') : '-' },
                lisan: { skor: lisanVal, huruf: lisanVal > 0 ? (lisanVal >= 85 ? 'A' : lisanVal >= 75 ? 'B' : 'C') : '-' }
              };
            });

            updatedNilaiMap[targetSantri.id] = existing;
          }
        });

        onImportNilai(updatedNilaiMap);
        setStatusMsg({
          type: 'success',
          text: `Berhasil mengimpor nilai untuk ${matchedCount} santri terdaftar!`
        });
      } catch (err: any) {
        setStatusMsg({
          type: 'error',
          text: `Gagal membaca file nilai Excel: ${err.message || err}`
        });
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 uppercase">
            Import & Export Template Nilai & Identitas
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Unduh template format resmi pesantren atau unggah file spreadsheet untuk pengisian masal
          </p>
        </div>

        <button
          type="button"
          onClick={() => exportAllDataXLSX(santriList, mapelList, nilaiMap)}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer transition-all shrink-0"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Export Seluruh Raport (Excel)
        </button>
      </div>

      {/* Alert Status */}
      {statusMsg && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* 2 Big Cards: Identitas & Nilai */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Identitas Santri */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold mb-4">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900 mb-1">
              Template Identitas Santri
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              Berisi format kolom 17 poin keterangan diri santri (Nama, NIS, Tempat Tanggal Lahir, Alamat, Orang Tua, dll) siap diisi di Microsoft Excel atau Google Sheets.
            </p>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
              <span className="text-[11px] font-bold text-slate-700 block mb-2">
                Langkah-langkah:
              </span>
              <ol className="text-xs text-slate-600 list-decimal list-inside space-y-1">
                <li>Klik tombol <strong>Download Template</strong> di bawah</li>
                <li>Buka file di Excel atau Google Sheets, isi data santri</li>
                <li>Unggah kembali file tersebut pada tombol Upload</li>
              </ol>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={exportSantriTemplate}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
            >
              <Download className="w-4 h-4" />
              Download Template Identitas (.xlsx)
            </button>

            <label className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-200">
              <Upload className="w-4 h-4" />
              Upload File Identitas Santri
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleSantriFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Card 2: Nilai Santri */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold mb-4">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900 mb-1">
              Template Nilai Santri
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              Template tabel nilai yang memuat seluruh mata pelajaran Bahasa Arab, Agama, Bahasa Inggris (Tulis & Lisan), deskripsi sikap, serta absensi kehadiran.
            </p>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
              <span className="text-[11px] font-bold text-slate-700 block mb-2">
                Informasi Pengisian Nilai:
              </span>
              <ul className="text-xs text-slate-600 list-disc list-inside space-y-1">
                <li>Kolom mata pelajaran terisi otomatis sesuai santri di kelas</li>
                <li>Skor diisi angka 0 - 100</li>
                <li>Predikat huruf dan KKM 40 otomatis diolah oleh sistem</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => exportNilaiTemplate(mapelList, santriList)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
            >
              <Download className="w-4 h-4" />
              Download Template Nilai (.xlsx)
            </button>

            <label className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-200">
              <Upload className="w-4 h-4" />
              Upload File Nilai Santri
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleNilaiFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
