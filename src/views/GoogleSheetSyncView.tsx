import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Santri, MataPelajaran, NilaiSantri, RaportSettings, AppUser } from '../types';
import { syncToGoogleSheets, fetchFromGoogleSheets, GOOGLE_APPS_SCRIPT_TEMPLATE } from '../utils/googleSheets';
import {
  initGoogleAuth,
  signInWithGoogle,
  googleSignOut,
  getCachedAccessToken,
} from '../services/googleAuth';
import {
  createNewRaportSpreadsheet,
  writeAllDataToSpreadsheet,
  readAllDataFromSpreadsheet,
  listDriveSpreadsheets,
  extractSpreadsheetId,
  GoogleSpreadsheetItem,
} from '../services/googleSheetsApi';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import {
  Database,
  UploadCloud,
  DownloadCloud,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  PlusCircle,
  LogOut,
  Sparkles,
  Info,
  ShieldCheck,
  CheckSquare,
} from 'lucide-react';

import {
  DEFAULT_GAS_PROJECT_ID,
  DEFAULT_GAS_PROJECT_URL,
  GAS_DATABASE_CODE,
  getGasWebAppUrl,
  setGasWebAppUrl as saveGasWebAppUrl,
  isGasAutoSyncEnabled,
  setGasAutoSyncEnabled as saveGasAutoSyncEnabled,
  syncSantriToGas,
  fetchSantriFromGas,
  testGasConnection,
} from '../services/googleSheetsGasService';

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
  // Mode selection: default to 'apps-script' (Google Apps Script Database)
  const [activeMode, setActiveMode] = useState<'apps-script' | 'direct-api'>('apps-script');

  // Google OAuth Auth State
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Active Google Spreadsheet ID / Link
  const [spreadsheetIdInput, setSpreadsheetIdInput] = useState<string>(
    localStorage.getItem('alhikmah_active_sheet_id') || ''
  );
  const [recentDriveSheets, setRecentDriveSheets] = useState<GoogleSpreadsheetItem[]>([]);
  const [isLoadingSheets, setIsLoadingSheets] = useState(false);

  // Operation states
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Confirmation modal for destructive / mutating operations
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);

  // Google Apps Script state
  const [webAppUrl, setWebAppUrlState] = useState<string>(() => {
    return getGasWebAppUrl();
  });
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    return isGasAutoSyncEnabled();
  });
  const [lastGasSync, setLastGasSync] = useState<string>(() => {
    return localStorage.getItem('alhikmah_last_gas_sync') || '';
  });
  const [connectedSpreadsheetUrl, setConnectedSpreadsheetUrl] = useState<string>(() => {
    return localStorage.getItem('alhikmah_gas_spreadsheet_url') || '';
  });
  const [copied, setCopied] = useState(false);


  // Init Google Auth listener on mount
  useEffect(() => {
    const unsubscribe = initGoogleAuth(
      (user, token) => {
        setGoogleUser(user);
        setAccessToken(token);
        fetchDriveFiles(token);
      },
      () => {
        setGoogleUser(null);
        setAccessToken(null);
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const showStatus = (type: 'success' | 'error' | 'info', message: string) => {
    setStatusMsg({ type, message });
    if (type === 'success') {
      setTimeout(() => setStatusMsg(null), 5000);
    }
  };

  // Google Sign-In handler
  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    setStatusMsg(null);
    try {
      const result = await signInWithGoogle();
      if (result) {
        setGoogleUser(result.user);
        setAccessToken(result.accessToken);
        showStatus('success', `Berhasil terhubung dengan Google Account: ${result.user.email}`);
        fetchDriveFiles(result.accessToken);
      }
    } catch (err: any) {
      showStatus('error', `Gagal menghubungkan Google Account: ${err.message || err}`);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    await googleSignOut();
    setGoogleUser(null);
    setAccessToken(null);
    showStatus('info', 'Telah keluar dari akun Google.');
  };

  // Fetch recent spreadsheets from user's Drive
  const fetchDriveFiles = async (token: string) => {
    setIsLoadingSheets(true);
    try {
      const files = await listDriveSpreadsheets(token);
      setRecentDriveSheets(files);
    } catch (err) {
      console.warn('Cannot fetch drive sheets:', err);
    } finally {
      setIsLoadingSheets(false);
    }
  };

  // 1. Create a brand new Google Spreadsheet in Drive
  const handleCreateNewSpreadsheet = async () => {
    const currentToken = accessToken || getCachedAccessToken();
    if (!currentToken) {
      showStatus('error', 'Silakan masuk dengan Google terlebih dahulu.');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Buat Spreadsheet Raport Baru di Google Drive?',
      description: `Sistem akan membuat file spreadsheet baru dengan judul "Raport Santri Al-Hikmah - ${settings.tahunPelajaran.replace('/', '-')}" di Google Drive Anda, dan mengisinya dengan data santri (${santriList.length} orang), nilai, dan pengaturan raport saat ini.`,
      confirmLabel: 'Ya, Buat Spreadsheet',
      onConfirm: async () => {
        setConfirmDialog(null);
        setIsProcessing(true);
        setStatusMsg(null);
        try {
          const res = await createNewRaportSpreadsheet(
            currentToken,
            `Raport Santri Al-Hikmah - ${settings.namaKelas} (${settings.tahunPelajaran.replace('/', '-')})`,
            santriList,
            mapelList,
            nilaiMap,
            settings
          );

          setSpreadsheetIdInput(res.spreadsheetId);
          localStorage.setItem('alhikmah_active_sheet_id', res.spreadsheetId);
          showStatus(
            'success',
            `Spreadsheet baru berhasil dibuat di Google Drive Anda! ID: ${res.spreadsheetId}`
          );
          fetchDriveFiles(currentToken);
        } catch (err: any) {
          showStatus('error', `Gagal membuat spreadsheet: ${err.message || err}`);
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  // 2. Push / Sync data to selected Google Spreadsheet (Destructive update requires confirmation)
  const handlePushToGoogleSpreadsheet = async () => {
    const currentToken = accessToken || getCachedAccessToken();
    if (!currentToken) {
      showStatus('error', 'Silakan masuk dengan Google terlebih dahulu.');
      return;
    }

    const cleanId = extractSpreadsheetId(spreadsheetIdInput);
    if (!cleanId) {
      showStatus('error', 'Masukkan ID atau Tautan (URL) Google Spreadsheet yang dituju.');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Perbarui Data di Google Spreadsheet?',
      description: `Tindakan ini akan memperbarui isi lembar kerja "Buku_Induk_Santri", "Legger_Nilai", dan "Pengaturan_Raport" pada Google Spreadsheet dengan ID ${cleanId}. Data lama pada lembar tersebut akan diperbarui dengan data terkini (${santriList.length} Santri).`,
      confirmLabel: 'Ya, Perbarui Spreadsheet',
      onConfirm: async () => {
        setConfirmDialog(null);
        setIsProcessing(true);
        setStatusMsg(null);
        try {
            await writeAllDataToSpreadsheet(
              currentToken,
              cleanId,
              santriList,
              mapelList,
              nilaiMap,
              settings,
              users
            );
            localStorage.setItem('alhikmah_active_sheet_id', cleanId);
            showStatus('success', 'Data santri, raport, dan akun pengguna berhasil disinkronkan ke Google Spreadsheet!');
        } catch (err: any) {
          showStatus('error', `Gagal memperbarui spreadsheet: ${err.message || err}`);
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  // 3. Pull data from Google Spreadsheet (Overwriting local state requires confirmation)
  const handlePullFromGoogleSpreadsheet = async () => {
    const currentToken = accessToken || getCachedAccessToken();
    if (!currentToken) {
      showStatus('error', 'Silakan masuk dengan Google terlebih dahulu.');
      return;
    }

    const cleanId = extractSpreadsheetId(spreadsheetIdInput);
    if (!cleanId) {
      showStatus('error', 'Masukkan ID atau Tautan (URL) Google Spreadsheet yang dituju.');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Tarik & Timpa Data dari Google Spreadsheet?',
      description: `Tindakan ini akan membaca isi Google Spreadsheet (${cleanId}) dan memperbarui daftar santri serta pengaturan raport di aplikasi ini. Data di memori peramban Anda akan diperbarui sesuai data di spreadsheet.`,
      confirmLabel: 'Ya, Tarik Data',
      onConfirm: async () => {
        setConfirmDialog(null);
        setIsProcessing(true);
        setStatusMsg(null);
        try {
          const result = await readAllDataFromSpreadsheet(currentToken, cleanId);
          if (result.santriList || result.settings || result.users) {
            onUpdateAllData({
              santriList: result.santriList,
              settings: result.settings ? ({ ...settings, ...result.settings } as any) : undefined,
              users: result.users,
            });
            localStorage.setItem('alhikmah_active_sheet_id', cleanId);
            showStatus(
              'success',
              `Berhasil menarik ${result.santriList?.length || 0} data santri dan ${result.users?.length || 0} akun pengguna dari Google Spreadsheet!`
            );
          } else {
            showStatus('info', 'Tidak ditemukan data santri pada sheet "Buku_Induk_Santri".');
          }
        } catch (err: any) {
          showStatus('error', `Gagal menarik data dari spreadsheet: ${err.message || err}`);
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  // Google Apps Script (Webhook) Handlers
  const handlePushToSheetsGAS = async () => {
    if (!webAppUrl.trim()) {
      showStatus('info', 'Masukkan URL Google Apps Script Web App terlebih dahulu.');
      return;
    }

    setIsProcessing(true);
    setStatusMsg(null);
    try {
      const res = await syncSantriToGas(santriList, webAppUrl.trim(), {
        nilaiMap,
        settings,
        users,
      });

      if (res.success) {
        const now = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
        setLastGasSync(now);
        if (res.spreadsheetUrl) {
          setConnectedSpreadsheetUrl(res.spreadsheetUrl);
          localStorage.setItem('alhikmah_gas_spreadsheet_url', res.spreadsheetUrl);
        }
        showStatus('success', res.message || 'Berhasil menyinkronkan seluruh data santri ke Google Sheet!');
      } else {
        showStatus('error', res.message || 'Gagal menyinkronkan data.');
      }
    } catch (e: any) {
      showStatus('error', `Terjadi kendala: ${e.message || e}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePullFromSheetsGAS = async () => {
    if (!webAppUrl.trim()) {
      showStatus('error', 'Masukkan URL Google Apps Script Web App terlebih dahulu.');
      return;
    }

    setIsProcessing(true);
    setStatusMsg(null);
    try {
      const res = await fetchSantriFromGas(webAppUrl.trim());
      if (res.success && res.santriList && res.santriList.length > 0) {
        onUpdateAllData({ santriList: res.santriList });
        if (res.spreadsheetUrl) {
          setConnectedSpreadsheetUrl(res.spreadsheetUrl);
          localStorage.setItem('alhikmah_gas_spreadsheet_url', res.spreadsheetUrl);
        }
        showStatus('success', `Berhasil menarik ${res.santriList.length} data santri dari Google Sheet!`);
      } else {
        showStatus('error', res.message || 'Tidak ada data santri ditemukan di Google Sheet.');
      }
    } catch (e: any) {
      showStatus('error', `Gagal mengambil data: ${e.message || e}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTestConnectionGAS = async () => {
    if (!webAppUrl.trim()) {
      showStatus('error', 'Masukkan URL Web App terlebih dahulu.');
      return;
    }

    setIsProcessing(true);
    setStatusMsg(null);
    try {
      const res = await testGasConnection(webAppUrl.trim());
      if (res.success) {
        const ssUrl = res.data?.spreadsheetUrl;
        if (ssUrl) {
          setConnectedSpreadsheetUrl(ssUrl);
          localStorage.setItem('alhikmah_gas_spreadsheet_url', ssUrl);
        }
        showStatus('success', `Koneksi Google Apps Script Berhasil! ${res.data?.spreadsheetName ? `Spreadsheet: "${res.data.spreadsheetName}"` : ''}`);
      } else {
        showStatus('error', res.message || 'Koneksi gagal.');
      }
    } catch (e: any) {
      showStatus('error', `Koneksi gagal: ${e.message || e}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleAutoSync = () => {
    const nextVal = !autoSyncEnabled;
    setAutoSyncEnabled(nextVal);
    saveGasAutoSyncEnabled(nextVal);
    showStatus('info', nextVal ? 'Sinkronisasi otomatis saat input data santri diaktifkan.' : 'Sinkronisasi otomatis dinonaktifkan.');
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const cleanSpreadsheetId = extractSpreadsheetId(spreadsheetIdInput);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
              Google Workspace Integration
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-600">
              Sinkronisasi Cloud Dua Arah
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
            Integrasi Google Sheets & Drive
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Kelola, sinkronkan data santri, dan buat spreadsheet raport otomatis di Google Drive Anda.
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setActiveMode('direct-api')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMode === 'direct-api'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Google Workspace API (Resmi)
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('apps-script')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMode === 'apps-script'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Web App Skrip (GAS)
          </button>
        </div>
      </div>

      {/* Status Banner */}
      {statusMsg && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold shadow-xs animate-in fade-in ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : statusMsg.type === 'error'
              ? 'bg-rose-50 text-rose-900 border border-rose-200'
              : 'bg-blue-50 text-blue-900 border border-blue-200'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-slate-600 shrink-0" />
          )}
          <span>{statusMsg.message}</span>
        </div>
      )}

      {/* MODE 1: OFFICIAL GOOGLE WORKSPACE API INTEGRATION */}
      {activeMode === 'direct-api' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Account Authentication Banner */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {googleUser ? (
                googleUser.photoURL ? (
                  <img
                    src={googleUser.photoURL}
                    alt={googleUser.displayName || 'Google User'}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-2xl border-2 border-emerald-500 shadow-xs object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-bold text-lg shadow-xs">
                    {(googleUser.displayName || googleUser.email || 'G').charAt(0).toUpperCase()}
                  </div>
                )
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center font-bold shadow-xs">
                  <Database className="w-6 h-6" />
                </div>
              )}

              <div>
                {googleUser ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900">
                        {googleUser.displayName || 'Pengguna Google'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                        Terhubung
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-medium">{googleUser.email}</div>
                  </>
                ) : (
                  <>
                    <div className="text-sm font-black text-slate-900">
                      Akun Google Belum Terhubung
                    </div>
                    <div className="text-xs text-slate-500">
                      Masuk dengan Google untuk mengizinkan aplikasi membuat dan menyinkronkan data langsung ke Google Sheets Anda.
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="shrink-0">
              {googleUser ? (
                <button
                  type="button"
                  onClick={handleGoogleLogout}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-all border border-slate-200"
                >
                  <LogOut className="w-4 h-4" />
                  Putuskan Akun
                </button>
              ) : (
                <GoogleSignInButton
                  onClick={handleGoogleLogin}
                  loading={isSigningIn}
                  text="Masuk dengan Google"
                />
              )}
            </div>
          </div>

          {/* Direct Sheets Operations */}
          {googleUser ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Actions */}
              <div className="lg:col-span-2 space-y-6">
                {/* 1. Create New Spreadsheet Card */}
                <div className="bg-linear-to-r from-emerald-800 to-teal-900 text-white p-6 rounded-3xl shadow-xs space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-700 text-emerald-100 border border-emerald-600">
                        Otomatisasi Google Drive
                      </span>
                      <h3 className="text-lg font-black mt-1">
                        Buat Spreadsheet Raport Baru Otomatis
                      </h3>
                      <p className="text-xs text-emerald-100/90 leading-relaxed mt-1">
                        Sistem akan otomatis membuat file Google Spreadsheet baru di Google Drive Anda dengan lembar Buku Induk, Legger Nilai, dan Pengaturan Raport lengkap.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleCreateNewSpreadsheet}
                      className="px-5 py-3 bg-white hover:bg-emerald-50 text-emerald-950 font-black rounded-2xl text-xs shadow-lg cursor-pointer transition-all shrink-0 flex items-center gap-2 disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-700" />
                      ) : (
                        <PlusCircle className="w-4 h-4 text-emerald-700" />
                      )}
                      Buat di Google Drive
                    </button>
                  </div>
                </div>

                {/* 2. Target Spreadsheet Selector & Sync Buttons */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                      ID atau URL Google Spreadsheet Yang Dituju
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={spreadsheetIdInput}
                        onChange={(e) => {
                          setSpreadsheetIdInput(e.target.value);
                          const extracted = extractSpreadsheetId(e.target.value);
                          if (extracted) {
                            localStorage.setItem('alhikmah_active_sheet_id', extracted);
                          }
                        }}
                        placeholder="Contoh: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms atau paste URL Spreadsheet"
                        className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                      />

                      {cleanSpreadsheetId && (
                        <a
                          href={`https://docs.google.com/spreadsheets/d/${cleanSpreadsheetId}/edit`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs border border-slate-200 cursor-pointer transition-all shrink-0"
                          title="Buka Spreadsheet di Tab Baru"
                        >
                          <ExternalLink className="w-4 h-4 text-slate-600" />
                          Buka di Sheets
                        </a>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      Anda dapat memasukkan ID dokumen atau menempelkan seluruh tautan URL Google Sheets dari peramban Anda.
                    </p>
                  </div>

                  {/* Sync Action Buttons */}
                  <div className="pt-2 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={isProcessing || !cleanSpreadsheetId}
                      onClick={handlePushToGoogleSpreadsheet}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-900/10 cursor-pointer transition-all disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <UploadCloud className="w-4 h-4" />
                      )}
                      Simpan / Update ke Google Sheet
                    </button>

                    <button
                      type="button"
                      disabled={isProcessing || !cleanSpreadsheetId}
                      onClick={handlePullFromGoogleSpreadsheet}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs border border-slate-200 cursor-pointer transition-all disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <DownloadCloud className="w-4 h-4 text-slate-600" />
                      )}
                      Tarik Data dari Google Sheet
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Recent Spreadsheets in Google Drive */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                      Spreadsheet di Google Drive
                    </h4>
                    <button
                      type="button"
                      disabled={isLoadingSheets}
                      onClick={() => accessToken && fetchDriveFiles(accessToken)}
                      className="text-[11px] text-emerald-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingSheets ? 'animate-spin' : ''}`} />
                      Segarkan
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 mb-3">
                    Klik pada salah satu spreadsheet di bawah untuk memilihnya sebagai target sinkronisasi:
                  </p>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {recentDriveSheets.length === 0 ? (
                      <div className="p-4 bg-slate-50 rounded-2xl text-center text-xs text-slate-400">
                        {isLoadingSheets
                          ? 'Memuat daftar file dari Google Drive...'
                          : 'Belum ada spreadsheet terdeteksi di Drive Anda.'}
                      </div>
                    ) : (
                      recentDriveSheets.map((item) => {
                        const isSelected = cleanSpreadsheetId === item.id;
                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              setSpreadsheetIdInput(item.id);
                              localStorage.setItem('alhikmah_active_sheet_id', item.id);
                            }}
                            className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="truncate">{item.name}</span>
                              {isSelected && (
                                <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                              ID: {item.id}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-400">
                  Total santri siap disinkronkan: <strong>{santriList.length} Santri</strong>
                </div>
              </div>
            </div>
          ) : (
            /* Card explaining the Google Workspace setup if not signed in */
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs text-center max-w-xl mx-auto space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-slate-900 uppercase">
                Hubungkan dengan Google Sheets Resmi
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Aplikasi ini mendukung integrasi langsung ke Google Drive & Sheets menggunakan Google Workspace API. Anda dapat membuat file spreadsheet baru dengan 1 klik atau menyinkronkan data langsung ke spreadsheet yang sudah ada.
              </p>
              <div className="pt-2">
                <GoogleSignInButton
                  onClick={handleGoogleLogin}
                  loading={isSigningIn}
                  text="Masuk dengan Akun Google"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 2: GOOGLE APPS SCRIPT DATABASE (LINKED PROJECT) */}
      {activeMode === 'apps-script' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Linked Project Banner */}
          <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-3xl p-6 text-white shadow-md border border-emerald-700/60 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-400 text-emerald-950">
                  Database Google Apps Script Aktif
                </span>
                <span className="text-emerald-300 text-xs font-mono">ID: {DEFAULT_GAS_PROJECT_ID}</span>
              </div>
              <h3 className="text-lg font-black text-white">
                Proyek Script: 1UYYIOgxgT3uW4l6SYrTsx35pGjJN4r1eZEiGeGv7Xgi32EgTjUAz-JTP
              </h3>
              <p className="text-xs text-emerald-100/90 leading-relaxed max-w-2xl">
                Proyek Google Apps Script Anda siap dijadikan database utama aplikasi ini. Seluruh data santri yang di-input atau diedit oleh wali kelas akan otomatis tersimpan dan terbarui ke dalam Google Sheet secara real-time.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
              <a
                href={DEFAULT_GAS_PROJECT_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-emerald-50 text-emerald-950 font-black rounded-xl text-xs shadow-md transition-all cursor-pointer"
              >
                <span>Buka Editor Script</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={handleCopyScript}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700/80 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs border border-emerald-500/50 transition-all cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Kode Tersalin!' : 'Salin Kode Database'}</span>
              </button>
            </div>
          </div>

          {/* Web App Connection & Auto Sync Settings */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-700" />
                  Koneksi Endpoint Web App
                </h3>
                <p className="text-xs text-slate-500">
                  Masukkan Web App Exec URL yang didapat dari menu <strong>Deploy &gt; New deployment</strong> di Google Apps Script.
                </p>
              </div>

              {/* Auto Sync Toggle */}
              <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200 shrink-0">
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-900">Auto-Sync Realtime</div>
                  <div className="text-[10px] text-slate-500">Simpan otomatis saat input santri</div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleAutoSync}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    autoSyncEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      autoSyncEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Input URL */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                URL Web App Google Apps Script
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={webAppUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    setWebAppUrlState(val);
                    saveGasWebAppUrl(val);
                  }}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
                <button
                  type="button"
                  disabled={isProcessing || !webAppUrl.trim()}
                  onClick={handleTestConnectionGAS}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs border border-slate-200 cursor-pointer transition-all disabled:opacity-50 shrink-0 flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Test Koneksi</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Contoh: <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-800">https://script.google.com/macros/s/AKfycbx.../exec</code>
              </p>
            </div>

            {/* Status Info Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Santri di Aplikasi:</span>
                <span className="font-bold text-slate-900">{santriList.length} Santri Terdaftar</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Status Sinkronisasi Otomatis:</span>
                <span className={`font-bold inline-flex items-center gap-1.5 ${autoSyncEnabled ? 'text-emerald-700' : 'text-slate-500'}`}>
                  <span className={`w-2 h-2 rounded-full ${autoSyncEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  {autoSyncEnabled ? 'Aktif (Real-time)' : 'Non-aktif'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Terakhir Disinkronkan:</span>
                <span className="font-semibold text-slate-700">{lastGasSync || 'Belum pernah'}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={handlePushToSheetsGAS}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-900/10 cursor-pointer transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <UploadCloud className="w-4 h-4" />
                )}
                Sinkronkan Seluruh Santri Sekarang ({santriList.length})
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handlePullFromSheetsGAS}
                className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-xl text-xs border border-slate-200 cursor-pointer transition-all disabled:opacity-50"
              >
                <DownloadCloud className="w-4 h-4 text-slate-600" />
                Tarik Data dari Google Sheet
              </button>

              {connectedSpreadsheetUrl && (
                <a
                  href={connectedSpreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs border border-emerald-200 transition-all cursor-pointer ml-auto"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  <span>Buka Google Sheet Database ↗</span>
                </a>
              )}
            </div>
          </div>

          {/* Quick Step Guide */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-700" />
              Panduan Pemasangan di Editor Google Apps Script (1 Menit)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="w-6 h-6 rounded-full bg-emerald-700 text-white font-black flex items-center justify-center text-[11px]">
                  1
                </div>
                <h4 className="font-bold text-slate-900">Buka Proyek Script</h4>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Buka tautan proyek{' '}
                  <a
                    href={DEFAULT_GAS_PROJECT_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 font-bold underline inline-flex items-center gap-0.5"
                  >
                    Apps Script Anda <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="w-6 h-6 rounded-full bg-emerald-700 text-white font-black flex items-center justify-center text-[11px]">
                  2
                </div>
                <h4 className="font-bold text-slate-900">Paste Kode Database</h4>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Hapus kode default di file <code className="bg-slate-200 px-1 rounded">Code.gs</code>, lalu paste kode yang telah disalin. Tekan <strong>Ctrl + S</strong> untuk menyimpan.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="w-6 h-6 rounded-full bg-emerald-700 text-white font-black flex items-center justify-center text-[11px]">
                  3
                </div>
                <h4 className="font-bold text-slate-900">Deploy sebagai Web App</h4>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Klik <strong>Deploy &gt; New deployment</strong>. Pilih jenis <strong>Web app</strong>. Atur <em>Execute as: Me</em> dan <strong>Who has access: Anyone</strong>.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="w-6 h-6 rounded-full bg-emerald-700 text-white font-black flex items-center justify-center text-[11px]">
                  4
                </div>
                <h4 className="font-bold text-slate-900">Tempel Web App URL</h4>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Salin <strong>Web app URL</strong> yang dihasilkan, lalu tempelkan pada kolom URL di atas dan klik <strong>Test Koneksi</strong>.
                </p>
              </div>
            </div>

            {/* Code Box */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase">
                  Isi Kode Skrip (Code.gs)
                </span>
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="flex items-center gap-1 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg text-xs border border-emerald-200 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Tersalin' : 'Salin Kode'}</span>
                </button>
              </div>
              <div className="relative bg-slate-950 rounded-2xl p-4 text-emerald-300 font-mono text-[11px] overflow-x-auto max-h-64 border border-slate-800 shadow-inner">
                <pre>{GAS_DATABASE_CODE}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Modal (Required by Workspace Integration guidelines for destructive mutations) */}
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
