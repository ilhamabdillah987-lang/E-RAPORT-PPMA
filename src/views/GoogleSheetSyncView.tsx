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
  // Mode selection: 'direct-api' (Google Workspace API) or 'apps-script' (Webhook)
  const [activeMode, setActiveMode] = useState<'direct-api' | 'apps-script'>('direct-api');

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

  // Google Apps Script state (legacy / alternative)
  const [webAppUrl, setWebAppUrl] = useState<string>(
    localStorage.getItem('alhikmah_gas_url') || ''
  );
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
      showStatus('info', 'Masukkan URL Google Apps Script Web App di bawah.');
      return;
    }

    setIsProcessing(true);
    setStatusMsg(null);
    try {
      const res = await syncToGoogleSheets(webAppUrl, {
        santriList,
        mapelList,
        nilaiMap,
        settings,
        users,
      });

      if (res.success) {
        showStatus('success', 'Berhasil menyinkronkan seluruh database ke Google Sheet via Web App!');
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
      const res = await fetchFromGoogleSheets(webAppUrl);
      if (res.success && res.data) {
        onUpdateAllData(res.data);
        showStatus('success', 'Berhasil mengunduh data terbaru dari Google Spreadsheet via Web App!');
      } else {
        showStatus('error', res.message || 'Data tidak ditemukan di Google Spreadsheet.');
      }
    } catch (e: any) {
      showStatus('error', `Gagal mengambil data: ${e.message || e}`);
    } finally {
      setIsProcessing(false);
    }
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

      {/* MODE 2: ALTERNATIVE APPS SCRIPT WEB APP */}
      {activeMode === 'apps-script' && (
        <div className="space-y-6 animate-in fade-in">
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
                onChange={(e) => {
                  setWebAppUrl(e.target.value);
                  localStorage.setItem('alhikmah_gas_url', e.target.value);
                }}
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
                disabled={isProcessing}
                onClick={handlePushToSheetsGAS}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-900/10 cursor-pointer transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <UploadCloud className="w-4 h-4" />
                )}
                Simpan / Push ke Google Sheet
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handlePullFromSheetsGAS}
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
                <li>
                  Buka spreadsheet baru di{' '}
                  <a
                    href="https://sheets.new"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 underline font-bold inline-flex items-center gap-0.5"
                  >
                    sheets.new <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  Klik menu <strong>Extensions (Ekstensi) &gt; Apps Script</strong>
                </li>
                <li>
                  Hapus kode bawaan, lalu <strong>Paste</strong> skrip yang telah disalin di bawah ini
                </li>
                <li>
                  Klik tombol <strong>Deploy &gt; New deployment</strong>
                </li>
                <li>
                  Pilih jenis <strong>Web App</strong>, atur <em>Who has access</em> ke <strong>Anyone (Siapa saja)</strong>
                </li>
                <li>
                  Klik <strong>Deploy</strong>, lalu salin URL Web App dan tempelkan pada kolom di atas
                </li>
              </ol>
            </div>

            {/* Code Block */}
            <div className="relative bg-slate-900 rounded-2xl p-4 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-60 border border-slate-800">
              <pre>{GOOGLE_APPS_SCRIPT_TEMPLATE}</pre>
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
