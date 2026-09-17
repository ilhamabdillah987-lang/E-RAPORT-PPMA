import React, { useState } from 'react';
import { Santri, MataPelajaran, NilaiSantri, RaportSettings, AppUser } from '../types';
import { syncToGoogleSheets, fetchFromGoogleSheets, GOOGLE_APPS_SCRIPT_TEMPLATE } from '../utils/googleSheets';
import { Database, UploadCloud, DownloadCloud, Copy, Check, ExternalLink, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface GoogleSheetSyncViewProps {
  santriList: Santri[];
  mapelList: MataPelajaran[];
  nilaiMap: Record<string, NilaiSantri>;
  settings: RaportSettings;
  users: AppUser[];
  onUpdateAllData: (data: {
    santriList?: Santri[];
    mapelList?: MataPelajaran[];
    nilaiMap?: Record<string, NilaiSantri>;
    settings?: RaportSettings;
    users?: AppUser[];
  }) => void;
}

export const GoogleSheetSyncView: React.FC<GoogleSheetSyncViewProps> = ({
  santriList,
  mapelList,
  nilaiMap,
  settings,
  users,
  onUpdateAllData,
}) => {
  const [webAppUrl, setWebAppUrl] = useState<string>(
    localStorage.getItem('alhikmah_gas_url') || ''
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSaveUrl = (url: string) => {
    setWebAppUrl(url);
    localStorage.setItem('alhikmah_gas_url', url);
  };

  const handlePushToSheets = async () => {
    if (!webAppUrl.trim()) {
      setSyncStatus({
        type: 'info',
        message: 'Data saat ini tersimpan aman di penyimpanan lokal peramban (Local Database). Masukkan Web App URL di bawah jika ingin mengkoneksikan langsung ke Google Spreadsheet.'
      });
      return;
    }

    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const res = await syncToGoogleSheets(webAppUrl, {
        santriList,
        mapelList,
        nilaiMap,
        settings,
        users,
      });

      if (res.success) {
        setSyncStatus({
          type: 'success',
          message: 'Berhasil menyinkronkan seluruh database santri, nilai, dan pengaturan ke Google Sheet!'
        });
      } else {
        setSyncStatus({
          type: 'error',
          message: res.message || 'Gagal menyinkronkan data ke Google Sheet.'
        });
      }
    } catch (e: any) {
      setSyncStatus({
        type: 'error',
        message: `Terjadi kendala: ${e.message || e}`
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromSheets = async () => {
    if (!webAppUrl.trim()) {
      setSyncStatus({
        type: 'error',
        message: 'Masukkan URL Google Apps Script Web App terlebih dahulu.'
      });
      return;
    }

    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const res = await fetchFromGoogleSheets(webAppUrl);
      if (res.success && res.data) {
        onUpdateAllData(res.data);
        setSyncStatus({
          type: 'success',
          message: 'Berhasil mengunduh data terbaru dari Google Spreadsheet!'
        });
      } else {
        setSyncStatus({
          type: 'error',
          message: res.message || 'Data tidak ditemukan di Google Spreadsheet.'
        });
      }
    } catch (e: any) {
      setSyncStatus({
        type: 'error',
        message: `Gagal mengambil data: ${e.message || e}`
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 uppercase">
            Database Google Spreadsheet
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Integrasi cloud database dua arah (Two-Way Sync) dengan Google Sheets
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-bold text-slate-700">Database Ready</span>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncStatus && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold ${
            syncStatus.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : syncStatus.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          {syncStatus.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-slate-600 shrink-0" />
          )}
          <span>{syncStatus.message}</span>
        </div>
      )}

      {/* URL Configuration Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-700" />
          Koneksi Google Apps Script Web App
        </h3>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
            URL Web App Google Apps Script
          </label>
          <input
            type="url"
            value={webAppUrl}
            onChange={(e) => handleSaveUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/.../exec"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:bg-white"
          />
          <p className="text-[11px] text-slate-500 mt-1.5">
            Dapatkan URL ini setelah menerapkan kode skrip di bawah sebagai Web App di Google Sheets Anda.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            disabled={isSyncing}
            onClick={handlePushToSheets}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-900/10 cursor-pointer transition-all disabled:opacity-50"
          >
            {isSyncing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <UploadCloud className="w-4 h-4" />
            )}
            Simpan / Push ke Google Sheet
          </button>

          <button
            type="button"
            disabled={isSyncing}
            onClick={handlePullFromSheets}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs border border-slate-200 cursor-pointer transition-all disabled:opacity-50"
          >
            <DownloadCloud className="w-4 h-4 text-slate-600" />
            Tarik Data dari Google Sheet
          </button>
        </div>
      </div>

      {/* Google Apps Script Code Instructions */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Kode Skrip Penghubung Google Sheets (GAS)
            </h3>
            <p className="text-xs text-slate-500">
              Salin kode skrip ini dan tempelkan pada menu <strong>Ekstensi &gt; Apps Script</strong> di Google Sheets Anda
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopyScript}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs border border-emerald-200 cursor-pointer transition-all shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Salin Kode Skrip</span>
              </>
            )}
          </button>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
          <p className="font-bold text-slate-800">Petunjuk Pemasangan Cepat (1 Menit):</p>
          <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
            <li>Buka spreadsheet baru di <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-emerald-700 underline font-bold inline-flex items-center gap-0.5">sheets.new <ExternalLink className="w-3 h-3" /></a></li>
            <li>Klik menu <strong>Extensions (Ekstensi) &gt; Apps Script</strong></li>
            <li>Hapus kode bawaan, lalu <strong>Paste</strong> skrip yang telah disalin di bawah ini</li>
            <li>Klik tombol <strong>Deploy &gt; New deployment</strong></li>
            <li>Pilih jenis <strong>Web App</strong>, atur <em>Who has access</em> ke <strong>Anyone (Siapa saja)</strong></li>
            <li>Klik <strong>Deploy</strong>, lalu salin URL Web App dan tempelkan pada kolom di atas</li>
          </ol>
        </div>

        {/* Code Block */}
        <div className="relative bg-slate-900 rounded-2xl p-4 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-60 border border-slate-800">
          <pre>{GOOGLE_APPS_SCRIPT_TEMPLATE}</pre>
        </div>
      </div>
    </div>
  );
};
