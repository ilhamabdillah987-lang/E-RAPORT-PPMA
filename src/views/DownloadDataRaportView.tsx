import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Santri, MataPelajaran, NilaiSantri, RaportSettings } from '../types';
import {
  exportAllDataCustomXLSX,
  exportSantriTemplate,
  exportNilaiTemplate,
  exportLeggerXLSX,
} from '../utils/excelTemplates';
import {
  Download,
  FileSpreadsheet,
  Printer,
  FileText,
  CheckCircle2,
  Database,
  Users,
  Award,
  Calendar,
  Filter,
  ArrowDownToLine,
  Eye,
  ExternalLink,
  PlusCircle,
  RefreshCw,
  UploadCloud,
  ShieldCheck,
  LogOut,
  AlertCircle,
} from 'lucide-react';
import { PrintRaportView } from './PrintRaportView';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import {
  initGoogleAuth,
  signInWithGoogle,
  googleSignOut,
  getCachedAccessToken,
} from '../services/googleAuth';
import {
  createNewRaportSpreadsheet,
  writeAllDataToSpreadsheet,
  extractSpreadsheetId,
} from '../services/googleSheetsApi';
import { User } from 'firebase/auth';

interface DownloadDataRaportViewProps {
  santriList: Santri[];
  mapelList: MataPelajaran[];
  nilaiMap: Record<string, NilaiSantri>;
  settings: RaportSettings;
}

export const DownloadDataRaportView: React.FC<DownloadDataRaportViewProps> = ({
  santriList,
  mapelList,
  nilaiMap,
  settings,
}) => {
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'excel' | 'pdf' | 'sheets' | 'backup'>('excel');
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState<string>('');

  // Google Auth State
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isProcessingSheets, setIsProcessingSheets] = useState(false);
  const [sheetsTargetId, setSheetsTargetId] = useState<string>(
    localStorage.getItem('alhikmah_active_sheet_id') || ''
  );
  const [sheetsFeedback, setSheetsFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    const unsub = initGoogleAuth(
      (user, token) => {
        setGoogleUser(user);
        setAccessToken(token);
      },
      () => {
        setGoogleUser(null);
        setAccessToken(null);
      }
    );
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    setSheetsFeedback(null);
    try {
      const res = await signInWithGoogle();
      if (res) {
        setGoogleUser(res.user);
        setAccessToken(res.accessToken);
        setSheetsFeedback({
          type: 'success',
          message: `Berhasil terhubung ke akun Google: ${res.user.email}`,
        });
      }
    } catch (e: any) {
      setSheetsFeedback({
        type: 'error',
        message: `Gagal login Google: ${e.message || e}`,
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    await googleSignOut();
    setGoogleUser(null);
    setAccessToken(null);
  };

  // Extract unique classes
  const availableClasses = Array.from(
    new Set(santriList.map((s) => s.kelasSaatIni).filter(Boolean))
  );

  // Filtered santri by class
  const filteredSantri =
    selectedClass === 'all'
      ? santriList
      : santriList.filter((s) => s.kelasSaatIni === selectedClass);

  // Stats calculation
  const totalSantri = filteredSantri.length;
  const santriWithNilaiCount = filteredSantri.filter((s) => {
    const n = nilaiMap[s.id];
    return n && Object.keys(n.akademik || {}).length > 0;
  }).length;

  const showSuccess = (msg: string) => {
    setDownloadSuccessMsg(msg);
    setTimeout(() => setDownloadSuccessMsg(''), 4000);
  };

  // Download Legger Nilai Saja (.xlsx) - Styled matching Screenshot 92
  const handleDownloadLeggerOnly = async () => {
    await exportLeggerXLSX(
      mapelList,
      filteredSantri,
      nilaiMap,
      settings,
      selectedClass === 'all' ? '' : selectedClass
    );
    showSuccess('File Rekap Legger Nilai Raport Excel berhasil diunduh!');
  };

  // Download Identitas Santri Saja (.xlsx) - Styled matching Screenshot 89
  const handleDownloadIdentitasOnly = async () => {
    await exportSantriTemplate(
      filteredSantri,
      selectedClass === 'all' ? '' : selectedClass
    );
    showSuccess('Buku Induk Data Identitas Santri Excel berhasil diunduh!');
  };

  // Download Backup JSON
  const handleDownloadBackupJSON = () => {
    const backupData = {
      tanggalExport: new Date().toISOString(),
      pondokPesantren: settings.namaPesantren,
      tahunPelajaran: settings.tahunPelajaran,
      semester: settings.semester,
      settings: settings,
      santriList: filteredSantri,
      mapelList: mapelList,
      nilaiMap: nilaiMap,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_Raport_Al_Hikmah_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess('File Cadangan Database Raport (JSON) berhasil diunduh!');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
              Pusat Unduh Administrator
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-600">
              {settings.namaPesantren}
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
            Download Data Raport Santri
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Unduh seluruh berkas raport santri, rekapitulasi legger nilai (Excel), buku induk santri, serta cetak dokumen PDF resmi.
          </p>
        </div>

        {/* Filter Kelas */}
        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 shrink-0">
          <Filter className="w-4 h-4 text-slate-500 ml-1" />
          <span className="text-xs font-bold text-slate-700">Filter Kelas:</span>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 cursor-pointer"
          >
            <option value="all">Semua Kelas ({santriList.length} Santri)</option>
            {availableClasses.map((cls) => (
              <option key={cls} value={cls}>
                Kelas {cls}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Success Notification */}
      {downloadSuccessMsg && (
        <div className="flex items-center gap-3 text-emerald-900 bg-emerald-50 px-4 py-3 rounded-2xl text-xs font-bold border border-emerald-200 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{downloadSuccessMsg}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">
              Total Santri {selectedClass !== 'all' ? `(${selectedClass})` : ''}
            </div>
            <div className="text-2xl font-black text-slate-900">
              {totalSantri} <span className="text-xs font-semibold text-slate-500">Santri</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">
              Sudah Diisi Nilai
            </div>
            <div className="text-2xl font-black text-teal-900">
              {santriWithNilaiCount}{' '}
              <span className="text-xs font-semibold text-slate-500">
                / {totalSantri} Santri
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">
              Semester & Tahun Ajaran
            </div>
            <div className="text-sm font-black text-slate-900">
              Semester {settings.semester}
            </div>
            <div className="text-xs text-slate-500 font-semibold">
              T.A. {settings.tahunPelajaran}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('excel')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs cursor-pointer transition-all ${
            activeTab === 'excel'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Unduh File Excel (.xlsx)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sheets')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs cursor-pointer transition-all ${
            activeTab === 'sheets'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          Simpan ke Google Sheets (Drive)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pdf')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs cursor-pointer transition-all ${
            activeTab === 'pdf'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Printer className="w-4 h-4" />
          Cetak & Unduh Dokumen Raport (PDF / A4)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs cursor-pointer transition-all ${
            activeTab === 'backup'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          Cadangan Database (JSON)
        </button>
      </div>

      {/* TAB 1: EXCEL DOWNLOAD */}
      {activeTab === 'excel' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Main Download Card */}
          <div className="bg-linear-to-r from-emerald-800 to-teal-900 text-white p-7 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-700 text-emerald-100 border border-emerald-600">
                Paling Sering Digunakan
              </span>
              <h3 className="text-xl font-black">
                Download Seluruh Data Raport (Excel .xlsx)
              </h3>
              <p className="text-xs text-emerald-100/90 max-w-xl leading-relaxed">
                Mengunduh file Excel lengkap berisi 2 Sheet: Sheet 1 (Identitas Lengkap 17 Poin Santri) dan Sheet 2 (Legger Nilai Lengkap seluruh mapel, nilai tulis, lisan, rata-rata, absensi kehadiran).
              </p>
            </div>

            <button
              type="button"
              onClick={async () => {
                await exportAllDataCustomXLSX(filteredSantri, mapelList, nilaiMap, settings);
                showSuccess('Data Raport Lengkap Excel berhasil diunduh!');
              }}
              className="px-6 py-3.5 bg-white hover:bg-emerald-50 text-emerald-900 font-black rounded-2xl text-xs shadow-lg cursor-pointer transition-all flex items-center gap-2 shrink-0"
            >
              <Download className="w-5 h-5 text-emerald-700" />
              Download Raport Lengkap (.xlsx)
            </button>
          </div>

          {/* Grid of Specialized Excel Downloads */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Legger Nilai */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold mb-4">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-black text-slate-900 uppercase mb-1.5">
                  Rekap Legger Nilai
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Format tabel legger nilai santri per mata pelajaran untuk pembagian raport dan pengarsipan wali kelas.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadLeggerOnly}
                className="w-full py-2.5 px-4 bg-teal-50 hover:bg-teal-100 text-teal-900 font-bold rounded-xl text-xs border border-teal-200 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <ArrowDownToLine className="w-4 h-4" />
                Download Legger (.xlsx)
              </button>
            </div>

            {/* Card 2: Identitas Buku Induk */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold mb-4">
                  <Users className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-black text-slate-900 uppercase mb-1.5">
                  Buku Induk Identitas
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Rekapitulasi 17 poin keterangan diri seluruh santri (NIS, NISN, TTL, Orang Tua, dan Alamat).
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadIdentitasOnly}
                className="w-full py-2.5 px-4 bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold rounded-xl text-xs border border-blue-200 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <ArrowDownToLine className="w-4 h-4" />
                Download Identitas (.xlsx)
              </button>
            </div>

            {/* Card 3: Template Kosong */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold mb-4">
                  <Download className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-black text-slate-900 uppercase mb-1.5">
                  Template Format Kosong
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Unduh template Excel kosong untuk dibagikan kepada guru mata pelajaran atau wali kelas baru.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await exportNilaiTemplate(
                      mapelList,
                      filteredSantri,
                      nilaiMap,
                      selectedClass === 'all' ? '' : selectedClass
                    );
                    showSuccess('Template Nilai Excel berhasil diunduh!');
                  }}
                  className="flex-1 py-2.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-xl text-[11px] border border-amber-200 flex items-center justify-center gap-1 cursor-pointer transition-all"
                >
                  Template Nilai
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await exportSantriTemplate(
                      filteredSantri,
                      selectedClass === 'all' ? '' : selectedClass
                    );
                    showSuccess('Template Santri Excel berhasil diunduh!');
                  }}
                  className="flex-1 py-2.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-[11px] border border-slate-200 flex items-center justify-center gap-1 cursor-pointer transition-all"
                >
                  Template Santri
                </button>
              </div>
            </div>
          </div>

          {/* Quick Table of Santri */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-800 uppercase">
                Daftar Santri & Status Raport ({filteredSantri.length} Santri)
              </h4>
              <span className="text-[11px] font-semibold text-slate-500">
                Kelas: {selectedClass === 'all' ? 'Semua Kelas' : selectedClass}
              </span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] sticky top-0">
                  <tr>
                    <th className="p-3 w-10 text-center">No</th>
                    <th className="p-3">NIS</th>
                    <th className="p-3">Nama Santri</th>
                    <th className="p-3">Kelas</th>
                    <th className="p-3 text-center">Status Nilai</th>
                    <th className="p-3 text-center">Rata-Rata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSantri.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                        Tidak ada data santri pada kelas ini.
                      </td>
                    </tr>
                  ) : (
                    filteredSantri.map((s, i) => {
                      const n = nilaiMap[s.id];
                      const hasNilai = n && Object.keys(n.akademik || {}).length > 0;

                      let totalScore = 0;
                      let subjectCount = 0;
                      if (hasNilai) {
                        mapelList.forEach((m) => {
                          const item = n.akademik?.[m.id];
                          if (item) {
                            const avg = ((item.tulis?.skor || 0) + (item.lisan?.skor || 0)) / 2;
                            totalScore += avg;
                            subjectCount++;
                          }
                        });
                      }
                      const finalAvg = subjectCount > 0 ? (totalScore / subjectCount).toFixed(1) : '-';

                      return (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="p-3 text-center font-bold text-slate-400">{s.nomorUrutAbsen || i + 1}</td>
                          <td className="p-3 font-mono text-slate-600">{s.nis}</td>
                          <td className="p-3 font-bold text-slate-900">{s.namaLengkap}</td>
                          <td className="p-3 text-slate-600">{s.kelasSaatIni}</td>
                          <td className="p-3 text-center">
                            {hasNilai ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Lengkap
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                                Belum Lengkap
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center font-bold text-slate-800">
                            {finalAvg}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PDF & PRINT PREVIEW */}
      {activeTab === 'pdf' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-center justify-between text-xs text-blue-900 font-semibold">
            <div className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-blue-700 shrink-0" />
              <span>
                Pratinjau cetak resmi raport santri format A4 Pondok Pesantren Modern Al-Hikmah. Anda dapat memilih santri atau mencetak seluruh raport sekaligus ke PDF.
              </span>
            </div>
          </div>

          <PrintRaportView
            santriList={filteredSantri}
            settings={settings}
            mapelList={mapelList}
            nilaiMap={nilaiMap}
          />
        </div>
      )}

      {/* TAB: GOOGLE SHEETS CLOUD SYNC */}
      {activeTab === 'sheets' && (
        <div className="bg-white p-7 rounded-3xl border border-slate-200 shadow-xs space-y-6 animate-in fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                  Google Workspace
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-semibold text-slate-600">Google Drive & Sheets API</span>
              </div>
              <h3 className="text-base font-black text-slate-900 uppercase">
                Simpan Langsung ke Google Sheets
              </h3>
              <p className="text-xs text-slate-500">
                Ekspor data santri ({filteredSantri.length} Santri) dan legger nilai langsung ke spreadsheet di Google Drive Anda.
              </p>
            </div>

            {googleUser ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-900">{googleUser.displayName || 'Akun Google'}</div>
                  <div className="text-[11px] text-slate-500">{googleUser.email}</div>
                </div>
                <button
                  type="button"
                  onClick={handleGoogleLogout}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 inline mr-1" />
                  Keluar
                </button>
              </div>
            ) : (
              <GoogleSignInButton
                onClick={handleGoogleLogin}
                loading={isSigningIn}
                text="Masuk dengan Google"
              />
            )}
          </div>

          {sheetsFeedback && (
            <div
              className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold ${
                sheetsFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border border-rose-200'
              }`}
            >
              {sheetsFeedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span>{sheetsFeedback.message}</span>
            </div>
          )}

          {googleUser ? (
            <div className="space-y-6">
              {/* Option 1: Create New */}
              <div className="bg-linear-to-r from-emerald-800 to-teal-900 text-white p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="font-black text-sm">Buat Spreadsheet Raport Baru Otomatis</h4>
                  <p className="text-xs text-emerald-100/90 mt-1">
                    Membuat berkas Google Sheet baru di Drive Anda yang berisi Buku Induk ({filteredSantri.length} santri), Legger Nilai, dan Pengaturan.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isProcessingSheets}
                  onClick={() => {
                    const token = accessToken || getCachedAccessToken();
                    if (!token) {
                      setSheetsFeedback({ type: 'error', message: 'Silakan masuk dengan Google terlebih dahulu' });
                      return;
                    }
                    setConfirmDialog({
                      isOpen: true,
                      title: 'Buat Spreadsheet Raport Baru di Drive?',
                      description: `Sistem akan membuat file spreadsheet baru di Google Drive Anda untuk kelas ${selectedClass === 'all' ? 'Semua Kelas' : selectedClass} (${filteredSantri.length} Santri).`,
                      confirmLabel: 'Ya, Buat File',
                      onConfirm: async () => {
                        setConfirmDialog(null);
                        setIsProcessingSheets(true);
                        setSheetsFeedback(null);
                        try {
                          const res = await createNewRaportSpreadsheet(
                            token,
                            `Raport Santri - ${selectedClass === 'all' ? 'Semua Kelas' : selectedClass} (${settings.tahunPelajaran.replace('/', '-')})`,
                            filteredSantri,
                            mapelList,
                            nilaiMap,
                            settings
                          );
                          setSheetsTargetId(res.spreadsheetId);
                          localStorage.setItem('alhikmah_active_sheet_id', res.spreadsheetId);
                          setSheetsFeedback({
                            type: 'success',
                            message: `Spreadsheet baru berhasil dibuat! ID: ${res.spreadsheetId}`,
                          });
                        } catch (err: any) {
                          setSheetsFeedback({
                            type: 'error',
                            message: `Gagal membuat spreadsheet: ${err.message || err}`,
                          });
                        } finally {
                          setIsProcessingSheets(false);
                        }
                      },
                    });
                  }}
                  className="px-5 py-2.5 bg-white hover:bg-emerald-50 text-emerald-950 font-black rounded-xl text-xs cursor-pointer transition-all shrink-0 flex items-center gap-2 shadow-md disabled:opacity-50"
                >
                  {isProcessingSheets ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-700" /> : <PlusCircle className="w-4 h-4 text-emerald-700" />}
                  Buat di Google Drive
                </button>
              </div>

              {/* Option 2: Existing Spreadsheet Target */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Atau Perbarui Spreadsheet Yang Sudah Ada (ID / URL):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sheetsTargetId}
                    onChange={(e) => {
                      setSheetsTargetId(e.target.value);
                      const clean = extractSpreadsheetId(e.target.value);
                      if (clean) localStorage.setItem('alhikmah_active_sheet_id', clean);
                    }}
                    placeholder="Masukkan ID atau paste tautan URL Spreadsheet"
                    className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-600"
                  />
                  {sheetsTargetId && (
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${extractSpreadsheetId(sheetsTargetId)}/edit`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 shrink-0"
                    >
                      <ExternalLink className="w-4 h-4 text-slate-500" />
                      Buka di Sheets
                    </a>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isProcessingSheets || !sheetsTargetId}
                  onClick={() => {
                    const token = accessToken || getCachedAccessToken();
                    const clean = extractSpreadsheetId(sheetsTargetId);
                    if (!token || !clean) return;
                    setConfirmDialog({
                      isOpen: true,
                      title: 'Perbarui Data ke Spreadsheet?',
                      description: `Data santri (${filteredSantri.length} Santri) dan legger nilai akan disimpan dan memperbarui spreadsheet ${clean}.`,
                      confirmLabel: 'Ya, Simpan ke Spreadsheet',
                      onConfirm: async () => {
                        setConfirmDialog(null);
                        setIsProcessingSheets(true);
                        setSheetsFeedback(null);
                        try {
                          await writeAllDataToSpreadsheet(
                            token,
                            clean,
                            filteredSantri,
                            mapelList,
                            nilaiMap,
                            settings
                          );
                          setSheetsFeedback({
                            type: 'success',
                            message: 'Data santri dan legger nilai berhasil disimpan ke Google Spreadsheet!',
                          });
                        } catch (err: any) {
                          setSheetsFeedback({
                            type: 'error',
                            message: `Gagal memperbarui spreadsheet: ${err.message || err}`,
                          });
                        } finally {
                          setIsProcessingSheets(false);
                        }
                      },
                    });
                  }}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs cursor-pointer transition-all flex items-center gap-2 shadow-xs disabled:opacity-50"
                >
                  {isProcessingSheets ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  Simpan ke Google Spreadsheet Ini
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
              <FileSpreadsheet className="w-10 h-10 text-emerald-700 mx-auto" />
              <div className="text-xs font-bold text-slate-700">Hubungkan Akun Google untuk Menggunakan Fitur Ini</div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Masuk dengan akun Google Anda untuk menyimpan data raport langsung ke Google Sheets di Google Drive pribadi Anda.
              </p>
              <div className="pt-2">
                <GoogleSignInButton
                  onClick={handleGoogleLogin}
                  loading={isSigningIn}
                  text="Masuk dengan Google"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BACKUP DATABASE */}
      {activeTab === 'backup' && (
        <div className="bg-white p-7 rounded-3xl border border-slate-200 shadow-xs space-y-6 animate-in fade-in">
          <div>
            <h3 className="text-base font-black text-slate-900 uppercase mb-1">
              Cadangan Database Raport (Offline Backup)
            </h3>
            <p className="text-xs text-slate-500 max-w-xl">
              Simpan salinan cadangan seluruh data raport (Santri, Nilai, Pengaturan Raport, dan Daftar Pengguna) dalam format file JSON. File ini berguna untuk arsip semester atau dipindahkan ke komputer lain.
            </p>
          </div>

          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="font-bold text-slate-800 text-xs">
                Status Data Saat Ini:
              </div>
              <div className="text-xs text-slate-500">
                • {santriList.length} Santri Terdaftar | • {mapelList.length} Mata Pelajaran | • {Object.keys(nilaiMap).length} Rekor Nilai
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadBackupJSON}
              className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all shrink-0"
            >
              <Database className="w-4 h-4 text-emerald-400" />
              Unduh File Cadangan (JSON)
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Modal */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-emerald-800">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
              </div>
              <h3 className="text-sm font-black text-slate-900 uppercase">
                {confirmDialog.title}
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {confirmDialog.description}
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs transition-all"
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
