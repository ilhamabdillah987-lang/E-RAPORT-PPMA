import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Santri, MataPelajaran, NilaiSantri, RaportSettings } from '../types';
import {
  exportSantriTemplate,
  exportNilaiTemplate,
  exportAllDataCustomXLSX,
} from '../utils/excelTemplates';
import { KELAS_OPTIONS } from '../data/defaultData';
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  GraduationCap,
  Users,
  School,
} from 'lucide-react';

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

  // Available classes computed dynamically from santriList, settings, and standard list
  const availableClasses = useMemo(() => {
    const fromSantri = Array.from(
      new Set(
        santriList
          .map((s) => (s.kelasSaatIni || '').trim())
          .filter(Boolean)
      )
    );

    const combined = Array.from(
      new Set([
        ...fromSantri,
        settings.namaKelas,
        ...KELAS_OPTIONS,
      ])
    ).filter(Boolean);

    return combined.sort((a, b) => {
      const countA = santriList.filter(
        (s) => (s.kelasSaatIni || '').trim().toLowerCase() === a.toLowerCase()
      ).length;
      const countB = santriList.filter(
        (s) => (s.kelasSaatIni || '').trim().toLowerCase() === b.toLowerCase()
      ).length;
      if (countA > 0 && countB === 0) return -1;
      if (countB > 0 && countA === 0) return 1;
      return a.localeCompare(b);
    });
  }, [santriList, settings.namaKelas]);

  // Santri count per class
  const studentCountPerClass = useMemo(() => {
    const counts: Record<string, number> = {};
    santriList.forEach((s) => {
      const k = (s.kelasSaatIni || settings.namaKelas || '').trim();
      counts[k] = (counts[k] || 0) + 1;
    });
    return counts;
  }, [santriList, settings.namaKelas]);

  // Selected class for downloading specific template
  const [selectedClass, setSelectedClass] = useState<string>(() => {
    const firstWithSantri = santriList.find((s) => (s.kelasSaatIni || '').trim());
    return firstWithSantri?.kelasSaatIni || settings.namaKelas || '7 MTS PUTRA';
  });

  // Filtered santri list for template export
  const filteredSantriList = useMemo(() => {
    if (!selectedClass || selectedClass === 'all' || selectedClass === 'Semua Kelas') {
      return santriList;
    }
    return santriList.filter(
      (s) => (s.kelasSaatIni || '').trim().toLowerCase() === selectedClass.trim().toLowerCase()
    );
  }, [santriList, selectedClass]);

  // Handle Excel Import for Santri (supports standard & Screenshot 89 green-header format)
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

        const importedSantri: Santri[] = [];

        rows.forEach((r, i) => {
          const rawName = String(
            r['NAMA SANTRI'] || r['Nama Lengkap'] || r['Nama'] || ''
          ).trim();

          // Skip completely empty template rows where name is blank
          if (!rawName) return;

          // NIS & NISN parsing
          let nis = String(
            r['NIS/NISN (UTAMA)'] || r['NIS'] || r['NIS/NISN'] || `252607${100 + i}`
          ).trim();
          let nisn = String(
            r['NIS / NISN (IDENTITAS)'] || r['NISN'] || ''
          ).trim();

          if (nis.includes('/')) {
            const parts = nis.split('/');
            nis = parts[0].trim();
            if (!nisn && parts[1]) {
              nisn = parts[1].trim();
            }
          }
          if (nisn.includes('/')) {
            const parts = nisn.split('/');
            if (parts[1]) nisn = parts[1].trim();
          }

          // TTL parsing (handles "Tangerang, 10 Juni 2012" or separate fields)
          const ttlRaw = String(r['Tempat, Tanggal Lahir'] || '').trim();
          let tempatLahir = String(r['Tempat Lahir'] || '').trim();
          let tanggalLahir = String(r['Tanggal Lahir'] || '').trim();

          if (ttlRaw) {
            if (ttlRaw.includes(',')) {
              const parts = ttlRaw.split(',');
              tempatLahir = parts[0].trim();
              tanggalLahir = parts.slice(1).join(',').trim();
            } else if (!tempatLahir) {
              tempatLahir = ttlRaw;
            }
          }

          if (!tempatLahir) tempatLahir = 'Tangerang';
          if (!tanggalLahir) tanggalLahir = '10 Juni 2012';

          const noUrut = Number(r['NO'] || r['No Absen']) || i + 1;
          const jenisKelamin = r['Jenis Kelamin']?.toString().toUpperCase().includes('P')
            ? 'Perempuan'
            : 'Laki-laki';

          importedSantri.push({
            id: 'santri-' + (Date.now() + i),
            nomorUrutAbsen: noUrut,
            namaLengkap: rawName,
            nis: nis,
            nisn: nisn,
            tempatLahir: tempatLahir,
            tanggalLahir: tanggalLahir,
            jenisKelamin: jenisKelamin,
            agama: String(r['Agama'] || 'Islam'),
            statusKeluarga: String(r['Status dalam Keluarga'] || r['Status Keluarga'] || 'Anak Kandung'),
            anakKe: Number(r['Anak ke-'] || r['Anak Ke']) || 1,
            alamatSantri: String(r['Alamat Peserta Didik'] || r['Alamat Santri'] || r['Alamat'] || '-'),
            teleponRumah: String(r['Nomor Telepon Rumah'] || r['Telepon Rumah'] || r['No Telp'] || '-'),
            sekolahAsal: String(r['Sekolah Asal'] || '-'),
            diterimaKelas: String(r['Di Pesantren Diterima di Kelas'] || r['Diterima Di Kelas'] || settings.namaKelas),
            diterimaTanggal: String(r['Di Pesantren Diterima Pada Tanggal'] || r['Diterima Pada Tanggal'] || '15 Juli 2025'),
            namaAyah: String(r['Nama Ayah'] || '-'),
            namaIbu: String(r['Nama Ibu'] || '-'),
            alamatOrangTua: String(r['Alamat Orang Tua'] || '-'),
            teleponOrangTua: String(r['Nomor Telepon Orang Tua'] || r['Telepon Orang Tua'] || '-'),
            pekerjaanAyah: String(r['Pekerjaan Ayah'] || '-'),
            pekerjaanIbu: String(r['Pekerjaan Ibu'] || '-'),
            namaWali: String(r['Nama Wali'] || '-'),
            alamatWali: String(r['Alamat Wali'] || '-'),
            teleponWali: String(r['Nomor Telepon Wali'] || r['Telepon Wali'] || '-'),
            pekerjaanWali: String(r['Pekerjaan Wali'] || '-'),
            kelasSaatIni: String(r['Kelas Saat Ini'] || settings.namaKelas),
            statusSantri: 'Aktif',
          });
        });

        if (importedSantri.length === 0) {
          setStatusMsg({
            type: 'error',
            text: 'Tidak ada baris data santri yang terbaca. Pastikan kolom NAMA SANTRI telah diisi.',
          });
          setIsProcessing(false);
          return;
        }

        onImportSantri(importedSantri);
        setStatusMsg({
          type: 'success',
          text: `Berhasil mengimpor ${importedSantri.length} data identitas santri!`,
        });
      } catch (err: any) {
        setStatusMsg({
          type: 'error',
          text: `Gagal membaca file Excel: ${err.message || err}`,
        });
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Handle Excel Import for Nilai (supports both 2-tier header Screenshot 92 & 1-tier header)
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

        const rawMatrix: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (!rawMatrix || rawMatrix.length < 2) {
          setStatusMsg({ type: 'error', text: 'File Excel nilai kosong atau format tidak sesuai.' });
          setIsProcessing(false);
          return;
        }

        // Check if Row 1 or Row 2 indicates a 2-tier header structure (Screenshot 92)
        const row1 = rawMatrix[1] || [];
        const isTwoTierHeader = row1.some(
          (c) =>
            typeof c === 'string' &&
            (c.trim().toUpperCase() === 'TULIS' || c.trim().toUpperCase() === 'LISAN')
        );

        const updatedNilaiMap = { ...nilaiMap };
        let matchedCount = 0;

        if (isTwoTierHeader && rawMatrix.length >= 3) {
          // Row 0 has Mapel names (merged 2 columns)
          // Row 1 has 'TULIS', 'LISAN'
          // Row 2 onwards has student data
          const row0 = rawMatrix[0] || [];

          // Map column indices to mapel and score type
          const columnMapping: {
            colIndex: number;
            mapelId?: string;
            type: 'tulis' | 'lisan' | 'spiritual' | 'sosial' | 'sakit' | 'izin' | 'alpha';
          }[] = [];

          let lastMapelName = '';
          for (let c = 3; c < Math.max(row0.length, row1.length); c++) {
            const h0 = row0[c] ? String(row0[c]).trim() : '';
            if (h0) lastMapelName = h0;

            const h1 = row1[c] ? String(row1[c]).trim().toUpperCase() : '';

            // Check if this is Kehadiran or Sikap
            if (h0.toUpperCase().includes('SPIRITUAL') || h1.includes('SPIRITUAL')) {
              columnMapping.push({ colIndex: c, type: 'spiritual' });
            } else if (h0.toUpperCase().includes('SOSIAL') || h1.includes('SOSIAL')) {
              columnMapping.push({ colIndex: c, type: 'sosial' });
            } else if (h1 === 'SAKIT' || h1 === 'S') {
              columnMapping.push({ colIndex: c, type: 'sakit' });
            } else if (h1 === 'IZIN' || h1 === 'I') {
              columnMapping.push({ colIndex: c, type: 'izin' });
            } else if (h1 === 'ALPHA' || h1 === 'A' || h1.includes('TANPA')) {
              columnMapping.push({ colIndex: c, type: 'alpha' });
            } else {
              // Subject Tulis / Lisan
              const matchedMapel = mapelList.find(
                (m) =>
                  m.nama.toLowerCase() === lastMapelName.toLowerCase() ||
                  lastMapelName.toLowerCase().includes(m.nama.toLowerCase()) ||
                  m.nama.toLowerCase().includes(lastMapelName.toLowerCase())
              );

              if (matchedMapel) {
                const isLisan = h1 === 'LISAN';
                columnMapping.push({
                  colIndex: c,
                  mapelId: matchedMapel.id,
                  type: isLisan ? 'lisan' : 'tulis',
                });
              }
            }
          }

          // Parse data rows (starting at index 2)
          for (let r = 2; r < rawMatrix.length; r++) {
            const rowData = rawMatrix[r];
            if (!rowData || rowData.length === 0) continue;

            const namaVal = String(rowData[1] || '').trim();
            const nisVal = String(rowData[2] || '').trim();

            if (!namaVal && !nisVal) continue;

            // Find matching santri
            let targetSantri = santriList.find((s) => {
              if (nisVal) {
                const sNis = s.nis.trim();
                const sNisn = s.nisn?.trim() || '';
                return (
                  nisVal === sNis ||
                  nisVal.startsWith(sNis) ||
                  (sNisn && (nisVal === sNisn || nisVal.includes(sNisn)))
                );
              }
              return false;
            });

            if (!targetSantri && namaVal) {
              targetSantri = santriList.find(
                (s) => s.namaLengkap.trim().toLowerCase() === namaVal.toLowerCase()
              );
            }

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
                  spiritual: 'Tulis deskripsi sikap spiritual...',
                  sosial: 'Tulis deskripsi sikap sosial...',
                },
                ekstrakurikuler: [],
                kehadiran: {
                  sakit: 0,
                  izin: 0,
                  tanpaKeterangan: 0,
                },
                updatedAt: new Date().toISOString(),
              };

              columnMapping.forEach((mapping) => {
                const cellVal = rowData[mapping.colIndex];
                if (cellVal === undefined || cellVal === null || cellVal === '') return;

                if (mapping.mapelId) {
                  const numVal = Number(cellVal) || 0;
                  const currentAkademik = existing.akademik[mapping.mapelId] || {
                    tulis: { skor: 0, huruf: '-' },
                    lisan: { skor: 0, huruf: '-' },
                  };

                  if (mapping.type === 'tulis') {
                    currentAkademik.tulis = {
                      skor: numVal,
                      huruf: numVal > 0 ? (numVal >= 85 ? 'A' : numVal >= 75 ? 'B' : 'C') : '-',
                    };
                  } else if (mapping.type === 'lisan') {
                    currentAkademik.lisan = {
                      skor: numVal,
                      huruf: numVal > 0 ? (numVal >= 85 ? 'A' : numVal >= 75 ? 'B' : 'C') : '-',
                    };
                  }
                  existing.akademik[mapping.mapelId] = currentAkademik;
                } else if (mapping.type === 'spiritual') {
                  existing.sikap.spiritual = String(cellVal);
                } else if (mapping.type === 'sosial') {
                  existing.sikap.sosial = String(cellVal);
                } else if (mapping.type === 'sakit') {
                  existing.kehadiran.sakit = Number(cellVal) || 0;
                } else if (mapping.type === 'izin') {
                  existing.kehadiran.izin = Number(cellVal) || 0;
                } else if (mapping.type === 'alpha') {
                  existing.kehadiran.tanpaKeterangan = Number(cellVal) || 0;
                }
              });

              updatedNilaiMap[targetSantri.id] = existing;
            }
          }
        } else {
          // Standard single-tier header
          const rows: any[] = XLSX.utils.sheet_to_json(ws);
          rows.forEach((r) => {
            const nis = String(r['NIS'] || r['NIS/NISN'] || '').trim();
            const nama = String(r['NAMA SANTRI'] || r['Nama Santri'] || r['Nama'] || '').trim();

            let targetSantri = santriList.find((s) => s.nis.trim() === nis);
            if (!targetSantri && nama) {
              targetSantri = santriList.find(
                (s) => s.namaLengkap.trim().toLowerCase() === nama.toLowerCase()
              );
            }

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
                  sosial: r['Sikap Sosial'] || 'Tulis deskripsi sikap sosial...',
                },
                ekstrakurikuler: [],
                kehadiran: {
                  sakit: Number(r['Sakit']) || 0,
                  izin: Number(r['Izin']) || 0,
                  tanpaKeterangan: Number(r['Tanpa Keterangan'] || r['Alpha']) || 0,
                },
                updatedAt: new Date().toISOString(),
              };

              mapelList.forEach((m) => {
                const tulisVal = Number(r[`${m.nama} (Tulis)`] || r[`${m.nama} (T)`]) || 0;
                const lisanVal = Number(r[`${m.nama} (Lisan)`] || r[`${m.nama} (L)`]) || 0;

                existing.akademik[m.id] = {
                  tulis: {
                    skor: tulisVal,
                    huruf: tulisVal > 0 ? (tulisVal >= 85 ? 'A' : tulisVal >= 75 ? 'B' : 'C') : '-',
                  },
                  lisan: {
                    skor: lisanVal,
                    huruf: lisanVal > 0 ? (lisanVal >= 85 ? 'A' : lisanVal >= 75 ? 'B' : 'C') : '-',
                  },
                };
              });

              updatedNilaiMap[targetSantri.id] = existing;
            }
          });
        }

        onImportNilai(updatedNilaiMap);
        setStatusMsg({
          type: 'success',
          text: `Berhasil mengimpor nilai untuk ${matchedCount} santri terdaftar!`,
        });
      } catch (err: any) {
        setStatusMsg({
          type: 'error',
          text: `Gagal membaca file nilai Excel: ${err.message || err}`,
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
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
              Format Standar Excel Pesantren
            </span>
          </div>
          <h2 className="text-lg font-black text-slate-900 uppercase">
            Import & Export Template Nilai & Identitas
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Unduh template format resmi bergaris border dan warna khas (Hijau Header & Kuning Isian) atau unggah file spreadsheet.
          </p>
        </div>

        <button
          type="button"
          onClick={() => exportAllDataCustomXLSX(santriList, mapelList, nilaiMap, settings)}
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

      {/* Pilihan Kelas untuk Unduh Template */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-slate-700">
              <GraduationCap className="w-4 h-4 text-emerald-600" />
              <label className="text-xs font-black uppercase tracking-wide">
                Pilih Kelas untuk Template:
              </label>
            </div>

            <div className="relative">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-3.5 py-2 pr-8 rounded-xl text-xs font-black border-2 border-emerald-300 bg-emerald-50/80 text-emerald-950 focus:ring-2 focus:ring-emerald-600 cursor-pointer shadow-xs transition-all"
              >
                <option value="Semua Kelas">Semua Kelas (Total {santriList.length} Santri)</option>
                <optgroup label="Daftar Kelas:">
                  {availableClasses.map((cls) => {
                    const count = studentCountPerClass[cls] || 0;
                    return (
                      <option key={cls} value={cls}>
                        {cls} — ({count} Santri{count > 0 ? ' ✓' : ''})
                      </option>
                    );
                  })}
                </optgroup>
              </select>
            </div>

            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>
                {filteredSantriList.length} Santri{' '}
                {selectedClass !== 'Semua Kelas' ? `di ${selectedClass}` : 'Total'}
              </span>
            </span>
          </div>

          <span className="text-xs text-slate-500 font-medium">
            Template akan otomatis memuat nama & NIS santri kelas terpilih.
          </span>
        </div>

        {/* Quick Class Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
            <School className="w-3 h-3 text-slate-400" />
            Pilih Cepat:
          </span>
          {availableClasses
            .filter((cls) => (studentCountPerClass[cls] || 0) > 0)
            .map((cls) => {
              const count = studentCountPerClass[cls] || 0;
              const isSelected = selectedClass === cls;
              return (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setSelectedClass(cls)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{cls}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
        </div>
      </div>

      {/* 2 Big Cards: Identitas & Nilai */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Identitas Santri (Matching Screenshot 89) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <Download className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Header Hijau + Kuning
              </span>
            </div>
            <h3 className="text-base font-black text-slate-900 mb-1">
              Template Identitas Santri
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Format buku induk santri dengan header hijau dan tabel sel kuning bergaris hitam: Kolom <strong>NO</strong>, <strong>NAMA SANTRI</strong>, <strong>NIS/NISN (UTAMA)</strong>, <strong>NIS / NISN (IDENTITAS)</strong>, <strong>Tempat, Tanggal Lahir</strong>, hingga data orang tua & alamat.
            </p>

            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 mb-6">
              <span className="text-[11px] font-bold text-emerald-900 block mb-2">
                Format Sesuai Template Pesantren:
              </span>
              <ul className="text-xs text-emerald-800 list-disc list-inside space-y-1">
                <li>Header Hijau Zamrud dengan teks putih tebal di baris pertama</li>
                <li>Baris data berwarna Kuning lembut bergaris border tipis rapi</li>
                <li>Mendukung impor kembali secara otomatis setelah diisi di Excel</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => exportSantriTemplate(filteredSantriList, selectedClass)}
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
            >
              <Download className="w-4 h-4" />
              Download Template Data Santri ({selectedClass}) (.xlsx)
            </button>

            <label className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-200">
              <Upload className="w-4 h-4" />
              Upload File Data Santri
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleSantriFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Card 2: Nilai Santri (Matching Screenshot 92) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Header 2 Tingkat (Tulis & Lisan)
              </span>
            </div>
            <h3 className="text-base font-black text-slate-900 mb-1">
              Template Nilai Santri
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Format legger nilai mata pelajaran pesantren dengan header hijau sage bergaris hitam: <strong>NO</strong>, <strong>NAMA SANTRI</strong>, <strong>NIS/NISN</strong>, serta kolom gabung untuk setiap mapel dengan subkolom <strong>TULIS</strong> & <strong>LISAN</strong>.
            </p>

            <div className="p-4 bg-teal-50/60 rounded-2xl border border-teal-100 mb-6">
              <span className="text-[11px] font-bold text-teal-900 block mb-2">
                Format Sesuai Template Pesantren:
              </span>
              <ul className="text-xs text-teal-800 list-disc list-inside space-y-1">
                <li>Header 2 tingkat: Nama kitab/mapel di atas, TULIS & LISAN di bawah</li>
                <li>Sel isian nilai berwarna kuning dengan nomor urut 1, 2, 3... berurutan</li>
                <li>Otomatis memuat santri kelas aktif atau template kosong 30 baris</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => exportNilaiTemplate(mapelList, filteredSantriList, nilaiMap, selectedClass)}
              className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
            >
              <Download className="w-4 h-4" />
              Download Template Nilai ({selectedClass}) (.xlsx)
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
