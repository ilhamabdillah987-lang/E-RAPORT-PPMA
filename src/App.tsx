/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Santri,
  MataPelajaran,
  NilaiSantri,
  RaportSettings,
  AppUser,
} from './types';
import {
  DEFAULT_SANTRI_LIST,
  DEFAULT_MAPEL_LIST,
  DEFAULT_RAPORT_SETTINGS,
  DEFAULT_USERS,
  DEFAULT_NILAI_MAP,
} from './data/defaultData';
import { LoginView } from './views/LoginView';
import { InputNilaiView } from './views/InputNilaiView';
import { IdentitasSantriView } from './views/IdentitasSantriView';
import { ImportExportView } from './views/ImportExportView';
import { PrintRaportView } from './views/PrintRaportView';
import { UploadLogoView } from './views/UploadLogoView';
import { KenaikanKelulusanView } from './views/KenaikanKelulusanView';
import { SettingRaportView } from './views/SettingRaportView';
import { GoogleSheetSyncView } from './views/GoogleSheetSyncView';
import { UserManagementView } from './views/UserManagementView';
import { DownloadDataRaportView } from './views/DownloadDataRaportView';
import {
  fetchSharedUsers,
  saveSharedUsers,
  syncFromUrlHash,
} from './services/cloudSync';

import {
  PenTool,
  Users,
  FileSpreadsheet,
  Printer,
  Image as ImageIcon,
  UserCheck,
  Settings,
  Database,
  ShieldAlert,
  LogOut,
  Menu,
  X,
  GraduationCap,
  Sparkles,
  Download,
  UserPlus,
} from 'lucide-react';

export default function App() {
  // Persistence state
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      localStorage.removeItem('alhikmah_current_user');
      const session = sessionStorage.getItem('alhikmah_session_user');
      if (session && session !== 'undefined' && session !== 'null') {
        const parsed = JSON.parse(session);
        if (parsed && typeof parsed === 'object' && parsed.id && parsed.role) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Session load error:', e);
    }
    return null;
  });

  const [users, setUsers] = useState<AppUser[]>(() => {
    try {
      const saved = localStorage.getItem('alhikmah_users');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((u) => {
            if (!u) return u;
            if (
              u.fullName === 'Ustadz H. Ahmad Fauzi, S.Pd.I.' ||
              u.namaLengkap === 'Ustadz H. Ahmad Fauzi, S.Pd.I.'
            ) {
              return {
                ...u,
                fullName: 'Wali Kelas',
                namaLengkap: '',
              };
            }
            return u;
          });
        }
      }
    } catch (e) {
      console.error('Users load error:', e);
    }
    return DEFAULT_USERS;
  });

  const [settings, setSettings] = useState<RaportSettings>(() => {
    try {
      const saved = localStorage.getItem('alhikmah_settings');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const merged: RaportSettings = { ...DEFAULT_RAPORT_SETTINGS, ...parsed };
          if (merged.namaWaliKelas === 'Ustadz H. Ahmad Fauzi, S.Pd.I.') {
            merged.namaWaliKelas = '';
          }
          if (merged.nipWaliKelas === '19840512 201001 1 008') {
            merged.nipWaliKelas = '';
          }
          if (merged.namaKepalaKepesantrenan === 'KH. Syamsuddin Mahmud, Lc.') {
            merged.namaKepalaKepesantrenan = '';
          }
          if (merged.namaPesantren === 'PESANTREN MODERN AL-HIKMAH' || !merged.namaPesantren) {
            merged.namaPesantren = 'PONDOK PESANTREN MODERN AL-HIKMAH';
          }
          if (merged.logoUrl === '/logo-alhikmah.svg' || merged.logoUrl?.includes('viewBox="0 0 120 120"')) {
            merged.logoUrl = '';
          }
          return merged;
        }
      }
    } catch (e) {
      console.error('Settings load error:', e);
    }
    return DEFAULT_RAPORT_SETTINGS;
  });

  const [santriList, setSantriList] = useState<Santri[]>(() => {
    try {
      const saved = localStorage.getItem('alhikmah_santri');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const sampleIds = ['santri-1', 'santri-2', 'santri-3', 'santri-4'];
          const sampleNames = ['wGW', 'Muhammad Zaidan Al-Fatih', 'Ahmad Faris Hidayat', 'Bilal Ramadhan'];
          return parsed.filter(
            (s) => s && !sampleIds.includes(s.id) && !sampleNames.includes(s.namaLengkap)
          );
        }
      }
    } catch (e) {
      console.error('Santri load error:', e);
    }
    return DEFAULT_SANTRI_LIST;
  });

  const [mapelList, setMapelList] = useState<MataPelajaran[]>(() => {
    try {
      const saved = localStorage.getItem('alhikmah_mapel');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}
    return DEFAULT_MAPEL_LIST;
  });

  const [nilaiMap, setNilaiMap] = useState<Record<string, NilaiSantri>>(() => {
    try {
      const saved = localStorage.getItem('alhikmah_nilai_map');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          delete parsed['santri-1'];
          delete parsed['santri-2'];
          delete parsed['santri-3'];
          delete parsed['santri-4'];
          return parsed;
        }
      }
    } catch (e) {}
    return DEFAULT_NILAI_MAP;
  });

  // Current active menu
  const [currentMenu, setCurrentMenu] = useState<
    | 'input-nilai'
    | 'identitas-santri'
    | 'import-export'
    | 'print-raport'
    | 'upload-logo'
    | 'lulus-naik'
    | 'setting-raport'
    | 'google-sheets'
    | 'user-management'
    | 'download-raport'
  >('input-nilai');

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Initial cleanup of old sample data from localStorage
  useEffect(() => {
    try {
      localStorage.removeItem('alhikmah_current_user');

      const savedSettings = localStorage.getItem('alhikmah_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        let modified = false;
        if (parsed.namaWaliKelas === 'Ustadz H. Ahmad Fauzi, S.Pd.I.') {
          parsed.namaWaliKelas = '';
          modified = true;
        }
        if (parsed.nipWaliKelas === '19840512 201001 1 008') {
          parsed.nipWaliKelas = '';
          modified = true;
        }
        if (parsed.namaKepalaKepesantrenan === 'KH. Syamsuddin Mahmud, Lc.') {
          parsed.namaKepalaKepesantrenan = '';
          modified = true;
        }
        if (parsed.namaPesantren === 'PESANTREN MODERN AL-HIKMAH' || !parsed.namaPesantren) {
          parsed.namaPesantren = 'PONDOK PESANTREN MODERN AL-HIKMAH';
          modified = true;
        }
        if (parsed.logoUrl === '/logo-alhikmah.svg' || parsed.logoUrl?.includes('viewBox="0 0 120 120"')) {
          parsed.logoUrl = '';
          modified = true;
        }
        if (modified) {
          localStorage.setItem('alhikmah_settings', JSON.stringify(parsed));
          setSettings(parsed);
        }
      }

      const savedSantri = localStorage.getItem('alhikmah_santri');
      if (savedSantri) {
        const parsed: Santri[] = JSON.parse(savedSantri);
        const sampleIds = ['santri-1', 'santri-2', 'santri-3', 'santri-4'];
        const sampleNames = ['wGW', 'Muhammad Zaidan Al-Fatih', 'Ahmad Faris Hidayat', 'Bilal Ramadhan'];
        const hasSample = parsed.some(
          (s) => sampleIds.includes(s.id) || sampleNames.includes(s.namaLengkap)
        );
        if (hasSample) {
          const cleaned = parsed.filter(
            (s) => !sampleIds.includes(s.id) && !sampleNames.includes(s.namaLengkap)
          );
          localStorage.setItem('alhikmah_santri', JSON.stringify(cleaned));
          setSantriList(cleaned);
        }
      }

      const savedUsers = localStorage.getItem('alhikmah_users');
      if (savedUsers) {
        const parsed: AppUser[] = JSON.parse(savedUsers);
        let modified = false;
        const cleanedUsers = parsed.map((u) => {
          if (
            u.fullName === 'Ustadz H. Ahmad Fauzi, S.Pd.I.' ||
            u.namaLengkap === 'Ustadz H. Ahmad Fauzi, S.Pd.I.'
          ) {
            modified = true;
            return {
              ...u,
              fullName: 'Wali Kelas',
              namaLengkap: '',
            };
          }
          return u;
        });
        if (modified) {
          localStorage.setItem('alhikmah_users', JSON.stringify(cleanedUsers));
          setUsers(cleanedUsers);
        }
      }

      const savedNilai = localStorage.getItem('alhikmah_nilai_map');
      if (savedNilai) {
        const parsed = JSON.parse(savedNilai);
        if (parsed['santri-1'] || parsed['santri-2'] || parsed['santri-3'] || parsed['santri-4']) {
          delete parsed['santri-1'];
          delete parsed['santri-2'];
          delete parsed['santri-3'];
          delete parsed['santri-4'];
          localStorage.setItem('alhikmah_nilai_map', JSON.stringify(parsed));
          setNilaiMap(parsed);
        }
      }
    } catch (e) {
      console.error('Storage cleanup error:', e);
    }
  }, []);

  // Background fetch from cloud relay and server to keep users and data synchronized across all devices & Vercel
  useEffect(() => {
    // 1. Fetch shared users across devices (Vercel, mobile, desktop)
    fetchSharedUsers().then((sharedUsers) => {
      if (sharedUsers && sharedUsers.length > 0) {
        setUsers(sharedUsers);
      }
    });

    // 2. Check if URL contains instant sync settings
    const urlSync = syncFromUrlHash();
    if (urlSync?.settings) {
      setSettings((prev) => ({ ...prev, ...urlSync.settings }));
    }

    // 3. Background fetch from server if Express / Node backend is reachable
    fetch('/api/sync-all')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Server unreachable');
      })
      .then((data) => {
        if (data) {
          if (Array.isArray(data.users) && data.users.length > 0) {
            setUsers(data.users);
            localStorage.setItem('alhikmah_users', JSON.stringify(data.users));
          }
          if (data.settings && typeof data.settings === 'object') {
            setSettings((prev) => ({ ...prev, ...data.settings }));
            localStorage.setItem('alhikmah_settings', JSON.stringify(data.settings));
          }
          if (Array.isArray(data.santriList) && data.santriList.length > 0) {
            setSantriList(data.santriList);
            localStorage.setItem('alhikmah_santri', JSON.stringify(data.santriList));
          }
          if (data.nilaiMap && typeof data.nilaiMap === 'object' && Object.keys(data.nilaiMap).length > 0) {
            setNilaiMap(data.nilaiMap);
            localStorage.setItem('alhikmah_nilai_map', JSON.stringify(data.nilaiMap));
          }
        }
      })
      .catch(() => {
        // Fallback silently to client storage / cloud relay
      });
  }, []);

  // Sync to SessionStorage and LocalStorage
  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('alhikmah_session_user', JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem('alhikmah_session_user');
      localStorage.removeItem('alhikmah_current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('alhikmah_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('alhikmah_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('alhikmah_santri', JSON.stringify(santriList));
  }, [santriList]);

  useEffect(() => {
    localStorage.setItem('alhikmah_mapel', JSON.stringify(mapelList));
  }, [mapelList]);

  useEffect(() => {
    localStorage.setItem('alhikmah_nilai_map', JSON.stringify(nilaiMap));
  }, [nilaiMap]);

  // Handlers
  const handleLogin = (user: AppUser) => {
    setCurrentUser(user);
    if (user.role === 'admin') {
      setCurrentMenu('user-management');
    } else {
      setCurrentMenu('input-nilai');
      if (user.role === 'walikelas') {
        setSettings((prev) => ({
          ...prev,
          namaWaliKelas: user.namaLengkap || user.fullName || prev.namaWaliKelas,
          nipWaliKelas: user.nip || prev.nipWaliKelas,
          namaKelas: user.kelasAkses || user.assignedClass || prev.namaKelas,
        }));
      }
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('alhikmah_session_user');
    localStorage.removeItem('alhikmah_current_user');
  };

  const handleSaveNilai = (newNilai: NilaiSantri) => {
    setNilaiMap((prev) => {
      const next = {
        ...prev,
        [newNilai.santriId]: newNilai,
      };
      fetch('/api/nilai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      }).catch(() => {});
      return next;
    });
  };

  const handleSaveSantri = (santri: Santri) => {
    setSantriList((prev) => {
      const idx = prev.findIndex((s) => s.id === santri.id);
      let updated: Santri[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = santri;
      } else {
        updated = [...prev, santri];
      }
      fetch('/api/santri', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).catch(() => {});
      return updated;
    });
  };

  const handleDeleteSantri = (id: string) => {
    setSantriList((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      fetch('/api/santri', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).catch(() => {});
      return updated;
    });
  };

  const handleImportSantri = (imported: Santri[]) => {
    setSantriList(imported);
    fetch('/api/santri', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(imported),
    }).catch(() => {});
  };

  const handleImportNilai = (importedMap: Record<string, NilaiSantri>) => {
    setNilaiMap(importedMap);
    fetch('/api/nilai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(importedMap),
    }).catch(() => {});
  };

  const handleUpdateLogo = (logoUrl: string) => {
    setSettings((prev) => {
      const next = { ...prev, logoUrl };
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      }).catch(() => {});
      return next;
    });
  };

  const handleBatchUpdateSantri = (updated: Santri[]) => {
    setSantriList(updated);
    fetch('/api/santri', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});
  };

  const handleSaveSettings = (newSettings: RaportSettings) => {
    setSettings(newSettings);
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
    }).catch(() => {});
  };

  const handleAddUser = (user: AppUser) => {
    setUsers((prev) => {
      const next = [...prev, user];
      try {
        localStorage.setItem('alhikmah_users', JSON.stringify(next));
      } catch (e) {}
      saveSharedUsers(next).catch(() => {});
      return next;
    });

    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    }).catch((err) => console.error('Error saving user to server:', err));
  };

  const handleUpdateUser = (updatedUser: AppUser) => {
    setUsers((prev) => {
      const next = prev.map((u) => (u.id === updatedUser.id ? updatedUser : u));
      try {
        localStorage.setItem('alhikmah_users', JSON.stringify(next));
      } catch (e) {}
      saveSharedUsers(next).catch(() => {});
      return next;
    });
    if (currentUser && currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }

    fetch(`/api/users/${updatedUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedUser),
    }).catch((err) => console.error('Error updating user on server:', err));
  };

  const handleDeleteUser = (id: string) => {
    setUsers((prev) => {
      const next = prev.filter((u) => u.id !== id);
      try {
        localStorage.setItem('alhikmah_users', JSON.stringify(next));
      } catch (e) {}
      saveSharedUsers(next).catch(() => {});
      return next;
    });

    fetch(`/api/users/${id}`, {
      method: 'DELETE',
    }).catch((err) => console.error('Error deleting user on server:', err));
  };

  const handleSetActiveWaliKelas = (waliKelas: AppUser) => {
    const waliName = waliKelas.namaLengkap || waliKelas.fullName || '';
    const waliNip = waliKelas.nip || '';
    const waliKelasBinaan = waliKelas.kelasAkses || waliKelas.assignedClass || settings?.namaKelas || '7 MTS PUTRA';

    setSettings((prev) => {
      const next = {
        ...prev,
        namaWaliKelas: waliName,
        nipWaliKelas: waliNip || prev.nipWaliKelas || '',
        namaKelas: waliKelasBinaan,
      };
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      }).catch(() => {});
      return next;
    });
  };

  const handleUpdateAllDataFromSheet = (data: {
    santriList?: Santri[];
    mapelList?: MataPelajaran[];
    nilaiMap?: Record<string, NilaiSantri>;
    settings?: RaportSettings;
    users?: AppUser[];
  }) => {
    if (data.santriList) setSantriList(data.santriList);
    if (data.mapelList) setMapelList(data.mapelList);
    if (data.nilaiMap) setNilaiMap(data.nilaiMap);
    if (data.settings) setSettings(data.settings);
    if (data.users) setUsers(data.users);

    fetch('/api/sync-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {});
  };

  const handleBatchSaveNilai = (updatedMap: Record<string, NilaiSantri>) => {
    setNilaiMap(updatedMap);
    try {
      localStorage.setItem('alhikmah_nilai_map', JSON.stringify(updatedMap));
    } catch (e) {}

    fetch('/api/nilai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedMap),
    }).catch(() => {});
  };

  // If not logged in, show Login Screen
  if (!currentUser) {
    return <LoginView users={users} settings={settings} onLogin={handleLogin} />;
  }

  // Navigation Items:
  // Role-based navigation:
  // 1. Admin: 'user-management' (Manajemen Akun Guru & Wali Kelas) & 'download-raport'
  // 2. Guru: ONLY 'input-nilai' (Input Nilai Mata Pelajaran yang Diajarkan)
  // 3. Wali Kelas: full suite of Raport tools
  const navItems =
    currentUser.role === 'admin'
      ? [
          {
            id: 'user-management' as const,
            label: 'Manajemen Akun Guru & Wali Kelas',
            icon: UserPlus,
            desc: 'Buat Akun Guru & Tentukan Mapel yang Diajarkan',
          },
          {
            id: 'upload-logo' as const,
            label: 'Upload Logo Pesantren',
            icon: ImageIcon,
            desc: 'Upload Logo untuk Login, Kop & Cover Raport',
          },
          {
            id: 'download-raport' as const,
            label: 'Download Data Raport',
            icon: Download,
            desc: 'Unduh Rekap Nilai, Legger & Raport',
          },
        ]
      : currentUser.role === 'guru'
      ? [
          {
            id: 'input-nilai' as const,
            label: 'Input Nilai Mata Pelajaran',
            icon: PenTool,
            desc: 'Input Nilai Sesuai Mapel yang Diajarkan',
          },
        ]
      : [
          {
            id: 'input-nilai' as const,
            label: 'Input Nilai',
            icon: PenTool,
            desc: 'Tulis, Lisan, Sikap, Ekskul, Absensi',
          },
          {
            id: 'identitas-santri' as const,
            label: 'Input Identitas Santri',
            icon: Users,
            desc: 'Data 17 Poin Santri & Foto',
          },
          {
            id: 'import-export' as const,
            label: 'Import & Export Template',
            icon: FileSpreadsheet,
            desc: 'Download/Upload Excel Masal',
          },
          {
            id: 'print-raport' as const,
            label: 'Print Raport',
            icon: Printer,
            desc: 'Cover, Identitas, Nilai, Legger',
          },
          {
            id: 'lulus-naik' as const,
            label: 'Luluskan / Naikan Santri',
            icon: UserCheck,
            desc: 'Proses Tingkat Santri Masal',
          },
          {
            id: 'setting-raport' as const,
            label: 'Setting Raport',
            icon: Settings,
            desc: 'Kelas, Wali, Kepala, Tanggal',
          },
          {
            id: 'google-sheets' as const,
            label: 'Database Google Sheet',
            icon: Database,
            desc: 'Sinkronisasi Cloud Spreadsheet',
          },
        ];

  // Enforce role-based menu access
  const effectiveMenu =
    currentUser.role === 'admin'
      ? currentMenu === 'download-raport' || currentMenu === 'upload-logo'
        ? currentMenu
        : 'user-management'
      : currentUser.role === 'guru'
      ? 'input-nilai'
      : currentMenu === 'upload-logo' || currentMenu === 'user-management' || currentMenu === 'download-raport'
      ? 'input-nilai'
      : currentMenu;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans flex flex-col">
      {/* Top Navbar (Hidden in Print) */}
      <header className="no-print sticky top-0 z-40 bg-emerald-900 text-white shadow-md border-b border-emerald-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Pesantren Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-emerald-200 hover:text-white hover:bg-emerald-800 rounded-xl cursor-pointer"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {settings.logoUrl ? (
              <div className="w-10 h-10 bg-white rounded-xl p-0.5 flex items-center justify-center shadow-xs">
                <img
                  src={settings.logoUrl}
                  alt="Logo Pesantren"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : null}

            <div>
              <h1 className="text-xs uppercase font-extrabold tracking-widest text-emerald-300">
                RAPORT SANTRI DIGITAL
              </h1>
              <p className="text-sm font-bold text-white tracking-wide truncate max-w-[200px] sm:max-w-none">
                {settings.namaPesantren}
              </p>
            </div>
          </div>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-white">
                {currentUser.namaLengkap || currentUser.fullName}
              </span>
              <span className="text-[10px] text-emerald-300 font-semibold uppercase tracking-wider">
                {currentUser.role === 'admin'
                  ? 'Administrator'
                  : currentUser.role === 'walikelas'
                  ? `Wali Kelas (${currentUser.kelasAkses || currentUser.assignedClass || settings.namaKelas})`
                  : 'Guru Pengajar'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="p-2 text-emerald-200 hover:text-white hover:bg-emerald-800 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
              title="Keluar (Logout)"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>

        {/* Horizontal Navigation Bar for Desktop */}
        <div className="hidden lg:block bg-emerald-950/60 border-t border-emerald-800/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-1 overflow-x-auto py-1.5 scrollbar-none">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = effectiveMenu === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentMenu(item.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-emerald-200/90 hover:text-white hover:bg-emerald-800/50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-emerald-950 border-t border-emerald-800 px-4 py-3 space-y-1 animate-in slide-in-from-top-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = effectiveMenu === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentMenu(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white'
                      : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <div>
                    <div>{item.label}</div>
                    <div className="text-[10px] text-emerald-300/70 font-normal">
                      {item.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Content View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {effectiveMenu === 'input-nilai' && (
          <InputNilaiView
            santriList={santriList}
            mapelList={mapelList}
            nilaiMap={nilaiMap}
            settings={settings}
            currentUser={currentUser}
            onSaveNilai={handleSaveNilai}
            onBatchSaveNilai={handleBatchSaveNilai}
          />
        )}

        {effectiveMenu === 'identitas-santri' && (
          <IdentitasSantriView
            santriList={santriList}
            settings={settings}
            onSaveSantri={handleSaveSantri}
            onDeleteSantri={handleDeleteSantri}
          />
        )}

        {effectiveMenu === 'import-export' && (
          <ImportExportView
            santriList={santriList}
            mapelList={mapelList}
            nilaiMap={nilaiMap}
            settings={settings}
            onImportSantri={handleImportSantri}
            onImportNilai={handleImportNilai}
          />
        )}

        {effectiveMenu === 'print-raport' && (
          <PrintRaportView
            santriList={santriList}
            settings={settings}
            mapelList={mapelList}
            nilaiMap={nilaiMap}
          />
        )}

        {effectiveMenu === 'upload-logo' && (
          <UploadLogoView settings={settings} onUpdateLogo={handleUpdateLogo} />
        )}

        {effectiveMenu === 'lulus-naik' && (
          <KenaikanKelulusanView
            santriList={santriList}
            settings={settings}
            mapelList={mapelList}
            nilaiMap={nilaiMap}
            onBatchUpdateSantri={handleBatchUpdateSantri}
          />
        )}

        {effectiveMenu === 'setting-raport' && (
          <SettingRaportView
            settings={settings}
            users={users}
            onSaveSettings={handleSaveSettings}
            onNavigateToUserManagement={() => setCurrentMenu('user-management')}
          />
        )}

        {effectiveMenu === 'google-sheets' && (
          <GoogleSheetSyncView
            santriList={santriList}
            mapelList={mapelList}
            nilaiMap={nilaiMap}
            settings={settings}
            users={users}
            onUpdateAllData={handleUpdateAllDataFromSheet}
          />
        )}

        {effectiveMenu === 'user-management' && currentUser.role === 'admin' && (
          <UserManagementView
            users={users}
            currentUser={currentUser}
            settings={settings}
            mapelList={mapelList}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onSetActiveWaliKelas={handleSetActiveWaliKelas}
          />
        )}

        {effectiveMenu === 'download-raport' && currentUser.role === 'admin' && (
          <DownloadDataRaportView
            santriList={santriList}
            mapelList={mapelList}
            nilaiMap={nilaiMap}
            settings={settings}
          />
        )}
      </main>

      {/* Footer (Hidden in print) */}
      <footer className="no-print bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © {new Date().getFullYear()} <strong>{settings.namaPesantren}</strong> • Sistem Raport Santri Terpadu
          </span>
          <span className="text-[11px] text-slate-400">
            Terhubung ke Google Spreadsheet Database • Versi 2.5
          </span>
        </div>
      </footer>
    </div>
  );
}
