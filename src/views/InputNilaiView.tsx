import React, { useState, useMemo, useEffect } from 'react';
import {
  Santri,
  MataPelajaran,
  NilaiSantri,
  RaportSettings,
  EkstrakurikulerItem,
  AppUser,
} from '../types';
import { calculateScoreLetter, calculateSantriRerata, terbilangAngka } from '../utils/helpers';
import { KELAS_OPTIONS } from '../data/defaultData';
import {
  exportSantriTemplate,
  exportNilaiTemplate,
} from '../utils/excelTemplates';
import * as XLSX from 'xlsx';
import {
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Award,
  Heart,
  BookOpen,
  Clock,
  AlertCircle,
  Table,
  UserCheck,
  Sparkles,
  Search,
  School,
  Check,
  GraduationCap,
  RefreshCw,
  Users,
  ArrowRight,
  Download,
  Upload,
  FileSpreadsheet,
} from 'lucide-react';

interface InputNilaiViewProps {
  santriList: Santri[];
  mapelList: MataPelajaran[];
  nilaiMap: Record<string, NilaiSantri>;
  settings: RaportSettings;
  currentUser?: AppUser;
  onSaveNilai: (nilai: NilaiSantri) => void;
  onBatchSaveNilai?: (updatedMap: Record<string, NilaiSantri>) => void;
  onRefreshData?: () => Promise<void> | void;
}

export const InputNilaiView: React.FC<InputNilaiViewProps> = ({
  santriList,
  mapelList,
  nilaiMap,
  settings,
  currentUser,
  onSaveNilai,
  onBatchSaveNilai,
  onRefreshData,
}) => {
  const isGuru = currentUser?.role === 'guru';
  const [isRefreshing, setIsRefreshing] = useState(false);

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

    // Sort: classes that have students come first
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

  // Selected Class State (Allows Guru to switch between classes they teach)
  const [selectedClass, setSelectedClass] = useState<string>(() => {
    if (currentUser?.role === 'walikelas' && (currentUser.kelasAkses || currentUser.assignedClass)) {
      return (currentUser.kelasAkses || currentUser.assignedClass || settings.namaKelas).trim();
    }
    // For guru, find the first class that actually has santri
    const firstWithSantri = santriList.find((s) => (s.kelasSaatIni || '').trim());
    if (firstWithSantri?.kelasSaatIni) {
      return firstWithSantri.kelasSaatIni.trim();
    }
    return settings.namaKelas || '7 MTS PUTRA';
  });

  // Filtered santri list based on selectedClass
  const displayedSantriList = useMemo(() => {
    let list = santriList;
    if (selectedClass && selectedClass !== 'all' && selectedClass !== 'Semua Kelas') {
      list = santriList.filter(
        (s) =>
          (s.kelasSaatIni || '').trim().toLowerCase() === selectedClass.trim().toLowerCase()
      );
    }
    return [...list].sort((a, b) => {
      const aNo = a.nomorUrutAbsen || 9999;
      const bNo = b.nomorUrutAbsen || 9999;
      if (aNo !== bNo) return aNo - bNo;
      return (a.namaLengkap || '').localeCompare(b.namaLengkap || '');
    });
  }, [santriList, selectedClass]);

  // Determine subjects assigned to this Guru (or all subjects if Wali Kelas/Admin)
  const assignedMapelList = useMemo(() => {
    if (!isGuru) return mapelList;

    const assignedIds = currentUser?.assignedMapelIds || [];
    const assignedNames = currentUser?.mapelAkses || [];

    if (assignedIds.length === 0 && assignedNames.length === 0) {
      return [];
    }

    return mapelList.filter(
      (m) => assignedIds.includes(m.id) || assignedNames.includes(m.nama)
    );
  }, [isGuru, currentUser, mapelList]);

  // Selected subject for Guru fast table mode
  const [selectedGuruMapelId, setSelectedGuruMapelId] = useState<string>(
    assignedMapelList[0]?.id || ''
  );

  useEffect(() => {
    if (assignedMapelList.length > 0 && !assignedMapelList.some((m) => m.id === selectedGuruMapelId)) {
      setSelectedGuruMapelId(assignedMapelList[0].id);
    }
  }, [assignedMapelList, selectedGuruMapelId]);

  // View mode for Guru: 'table' (input all santri at once) or 'single' (per santri card)
  const [guruViewMode, setGuruViewMode] = useState<'table' | 'single'>('table');

  // Single-student state based on displayedSantriList
  const [selectedSantriId, setSelectedSantriId] = useState<string>(
    displayedSantriList[0]?.id || ''
  );
  const [activeTab, setActiveTab] = useState<'akademik' | 'sikap' | 'ekstra' | 'kehadiran'>('akademik');
  const [toastMessage, setToastMessage] = useState<string>('');

  // Keep selectedSantriId synced when class changes
  useEffect(() => {
    if (displayedSantriList.length > 0) {
      if (!displayedSantriList.some((s) => s.id === selectedSantriId)) {
        const nextId = displayedSantriList[0].id;
        setSelectedSantriId(nextId);
        setFormNilai(getInitialNilai(nextId));
      }
    } else {
      setSelectedSantriId('');
    }
  }, [displayedSantriList]);

  const currentSantri =
    displayedSantriList.find((s) => s.id === selectedSantriId) || displayedSantriList[0];

  // Helper to build default empty NilaiSantri
  const getInitialNilai = (sId: string): NilaiSantri => {
    return (
      nilaiMap[sId] || {
        id: `nilai-${sId}-${settings.semester}-${settings.tahunPelajaran}`,
        santriId: sId,
        kelas: selectedClass !== 'Semua Kelas' ? selectedClass : settings.namaKelas,
        semester: settings.semester,
        tahunPelajaran: settings.tahunPelajaran,
        akademik: {},
        sikap: {
          spiritual: 'Tulis deskripsi sikap spiritual...',
          sosial: 'Tulis deskripsi sikap sosial...',
        },
        ekstrakurikuler: [],
        kehadiran: { sakit: 0, izin: 0, tanpaKeterangan: 0 },
        updatedAt: new Date().toISOString(),
      }
    );
  };

  const [formNilai, setFormNilai] = useState<NilaiSantri>(() =>
    getInitialNilai(currentSantri?.id || '')
  );

  // Sync data handler from Wali Kelas
  const handleSyncData = async () => {
    setIsRefreshing(true);
    try {
      if (onRefreshData) {
        await onRefreshData();
      }
      setToastMessage('Data santri & nilai berhasil disinkronkan dengan input Wali Kelas!');
    } catch {
      setToastMessage('Gagal menyinkronkan data.');
    } finally {
      setIsRefreshing(false);
      setTimeout(() => setToastMessage(''), 3500);
    }
  };

  // When selected student changes in single mode
  const handleSelectSantri = (id: string) => {
    setSelectedSantriId(id);
    setFormNilai(getInitialNilai(id));
  };

  // When score changes in single mode
  const handleScoreChange = (
    mapelId: string,
    field: 'tulis' | 'lisan',
    valueStr: string,
    kkm: number
  ) => {
    const num = Math.min(100, Math.max(0, Number(valueStr) || 0));
    const letter = calculateScoreLetter(num, kkm);

    setFormNilai((prev) => {
      const existing = prev.akademik[mapelId] || {
        tulis: { skor: 0, huruf: '-' },
        lisan: { skor: 0, huruf: '-' },
      };

      return {
        ...prev,
        akademik: {
          ...prev.akademik,
          [mapelId]: {
            ...existing,
            [field]: {
              skor: num,
              huruf: letter,
            },
          },
        },
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const handleAddEkstra = () => {
    const newItem: EkstrakurikulerItem = {
      id: 'ek-' + Date.now(),
      kegiatan: '',
      keterangan: 'Aktif mengikuti kegiatan dengan baik dan bersemangat.',
    };
    setFormNilai((prev) => ({
      ...prev,
      ekstrakurikuler: [...prev.ekstrakurikuler, newItem],
    }));
  };

  const handleRemoveEkstra = (id: string) => {
    setFormNilai((prev) => ({
      ...prev,
      ekstrakurikuler: prev.ekstrakurikuler.filter((e) => e.id !== id),
    }));
  };

  const handleSaveSingle = () => {
    if (!currentSantri) return;

    // Merge with existing nilai in map to preserve other subjects
    const existing = nilaiMap[currentSantri.id] || formNilai;
    const merged: NilaiSantri = {
      ...existing,
      akademik: {
        ...existing.akademik,
        ...formNilai.akademik,
      },
      // If wali kelas, also save sikap, ekstra, kehadiran
      ...(!isGuru
        ? {
            sikap: formNilai.sikap,
            ekstrakurikuler: formNilai.ekstrakurikuler,
            kehadiran: formNilai.kehadiran,
          }
        : {}),
      updatedAt: new Date().toISOString(),
    };

    onSaveNilai(merged);
    setToastMessage(`Nilai untuk santri "${currentSantri.namaLengkap}" berhasil disimpan!`);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Fast table mode state for Guru (stores changes per santri for selected subject)
  const [tableScores, setTableScores] = useState<
    Record<string, { tulis: number; lisan: number }>
  >({});

  // Populate fast table scores whenever selected mapel or displayedSantriList or nilaiMap changes
  useEffect(() => {
    if (!selectedGuruMapelId) return;

    const initialMap: Record<string, { tulis: number; lisan: number }> = {};
    displayedSantriList.forEach((s) => {
      const existing = nilaiMap[s.id]?.akademik?.[selectedGuruMapelId];
      initialMap[s.id] = {
        tulis: existing?.tulis?.skor ?? 0,
        lisan: existing?.lisan?.skor ?? 0,
      };
    });
    setTableScores(initialMap);
  }, [selectedGuruMapelId, displayedSantriList, nilaiMap]);

  const handleTableScoreChange = (
    sId: string,
    field: 'tulis' | 'lisan',
    val: string
  ) => {
    const num = Math.min(100, Math.max(0, Number(val) || 0));
    setTableScores((prev) => ({
      ...prev,
      [sId]: {
        ...(prev[sId] || { tulis: 0, lisan: 0 }),
        [field]: num,
      },
    }));
  };

  const handleSaveAllTable = () => {
    if (!selectedGuruMapelId || displayedSantriList.length === 0) return;
    const selectedMapel = mapelList.find((m) => m.id === selectedGuruMapelId);
    const kkm = selectedMapel?.kkm || 40;

    const updatedNilaiMap: Record<string, NilaiSantri> = { ...nilaiMap };

    displayedSantriList.forEach((s) => {
      const existing = updatedNilaiMap[s.id] || getInitialNilai(s.id);
      const row = tableScores[s.id] || { tulis: 0, lisan: 0 };

      const tulisLetter = calculateScoreLetter(row.tulis, kkm);
      const lisanLetter = calculateScoreLetter(row.lisan, kkm);

      updatedNilaiMap[s.id] = {
        ...existing,
        akademik: {
          ...existing.akademik,
          [selectedGuruMapelId]: {
            tulis: { skor: row.tulis, huruf: tulisLetter },
            lisan: { skor: row.lisan, huruf: lisanLetter },
          },
        },
        updatedAt: new Date().toISOString(),
      };
    });

    if (onBatchSaveNilai) {
      onBatchSaveNilai(updatedNilaiMap);
    } else {
      Object.values(updatedNilaiMap).forEach((n) => onSaveNilai(n));
    }

    const classLabel = selectedClass === 'Semua Kelas' ? 'Semua Kelas' : `Kelas ${selectedClass}`;
    setToastMessage(
      `Berhasil menyimpan nilai mata pelajaran "${selectedMapel?.nama}" untuk ${displayedSantriList.length} santri (${classLabel})!`
    );
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleQuickFill = (field: 'tulis' | 'lisan') => {
    const classLabel = selectedClass === 'Semua Kelas' ? 'semua kelas' : `kelas ${selectedClass}`;
    const inputVal = prompt(
      `Masukkan nilai ${field.toUpperCase()} seragam untuk ${displayedSantriList.length} santri (${classLabel}) (0 - 100):`,
      '80'
    );
    if (inputVal === null) return;
    const num = Math.min(100, Math.max(0, Number(inputVal) || 0));

    setTableScores((prev) => {
      const next = { ...prev };
      displayedSantriList.forEach((s) => {
        next[s.id] = {
          ...(next[s.id] || { tulis: 0, lisan: 0 }),
          [field]: num,
        };
      });
      return next;
    });
  };

  const currentIndex = displayedSantriList.findIndex((s) => s.id === selectedSantriId);
  const handlePrev = () => {
    if (currentIndex > 0) {
      handleSelectSantri(displayedSantriList[currentIndex - 1].id);
    }
  };
  const handleNext = () => {
    if (currentIndex < displayedSantriList.length - 1) {
      handleSelectSantri(displayedSantriList[currentIndex + 1].id);
    }
  };

  const handleSaveAndNext = () => {
    handleSaveSingle();
    if (currentIndex < displayedSantriList.length - 1) {
      handleSelectSantri(displayedSantriList[currentIndex + 1].id);
    }
  };

  const activeSubjects = isGuru ? assignedMapelList : mapelList;
  const categories = Array.from(new Set(activeSubjects.map((m) => m.kategori)));
  const rerata = calculateSantriRerata(formNilai, activeSubjects);

  // Selected mapel object for teacher table
  const currentGuruMapel = assignedMapelList.find((m) => m.id === selectedGuruMapelId);

  // Download official template matching user requests and screenshots
  const handleDownloadNilaiTemplate = () => {
    try {
      const targetMapels = isGuru ? assignedMapelList : mapelList;
      exportNilaiTemplate(targetMapels, displayedSantriList, nilaiMap, selectedClass);
      setToastMessage(`✓ Template Nilai (${selectedClass}) berhasil diunduh!`);
      setTimeout(() => setToastMessage(''), 3500);
    } catch (err: any) {
      setToastMessage(`Gagal mengunduh template nilai: ${err.message || err}`);
      setTimeout(() => setToastMessage(''), 3500);
    }
  };

  const handleDownloadSantriTemplate = () => {
    try {
      exportSantriTemplate(displayedSantriList, selectedClass);
      setToastMessage(`✓ Template Data Santri (${selectedClass}) berhasil diunduh!`);
      setTimeout(() => setToastMessage(''), 3500);
    } catch (err: any) {
      setToastMessage(`Gagal mengunduh template data santri: ${err.message || err}`);
      setTimeout(() => setToastMessage(''), 3500);
    }
  };

  // Upload grades directly from filled Excel template
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawMatrix: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (!rawMatrix || rawMatrix.length < 2) {
          setToastMessage('File Excel kosong atau format tidak sesuai.');
          setTimeout(() => setToastMessage(''), 3500);
          return;
        }

        let updatedCount = 0;
        const newTableScores = { ...tableScores };

        const row0 = (rawMatrix[0] || []).map((c: any) => String(c || '').trim().toUpperCase());
        const row1 = (rawMatrix[1] || []).map((c: any) => String(c || '').trim().toUpperCase());

        let targetTulisCol = -1;
        let targetLisanCol = -1;

        if (selectedGuruMapelId) {
          const mapelObj = mapelList.find((m) => m.id === selectedGuruMapelId);
          const mapelName = mapelObj?.nama.toUpperCase() || '';

          for (let c = 3; c < Math.max(row0.length, row1.length); c++) {
            const h0 = row0[c] || '';
            const h1 = row1[c] || '';

            if (h0.includes(mapelName) || mapelName.includes(h0) || h0 === mapelName) {
              if (h1.includes('TULIS') || h1 === 'T') targetTulisCol = c;
              if (h1.includes('LISAN') || h1 === 'L') targetLisanCol = c;
            }
          }
        }

        if (targetTulisCol === -1) {
          for (let c = 0; c < row1.length; c++) {
            if (row1[c].includes('TULIS')) targetTulisCol = c;
            if (row1[c].includes('LISAN')) targetLisanCol = c;
          }
        }

        const startRow = rawMatrix.length >= 3 && (row1.includes('TULIS') || row1.includes('LISAN')) ? 2 : 1;

        for (let r = startRow; r < rawMatrix.length; r++) {
          const rowData = rawMatrix[r];
          if (!rowData || rowData.length === 0) continue;

          const namaVal = String(rowData[1] || '').trim();
          const nisVal = String(rowData[2] || '').trim();

          const target = displayedSantriList.find((s) => {
            if (nisVal && s.nis && (nisVal.includes(s.nis) || s.nis.includes(nisVal))) return true;
            if (namaVal && s.namaLengkap.toLowerCase().trim() === namaVal.toLowerCase().trim()) return true;
            return false;
          });

          if (target) {
            const tulisVal = targetTulisCol >= 0 ? Number(rowData[targetTulisCol]) || 0 : 0;
            const lisanVal = targetLisanCol >= 0 ? Number(rowData[targetLisanCol]) || 0 : 0;

            newTableScores[target.id] = {
              tulis: Math.min(100, Math.max(0, tulisVal)),
              lisan: Math.min(100, Math.max(0, lisanVal)),
            };
            updatedCount++;
          }
        }

        setTableScores(newTableScores);
        setToastMessage(`✓ Berhasil memuat nilai ${updatedCount} santri dari file Excel! Tekan tombol "Simpan Semua Nilai" untuk menyimpan.`);
        setTimeout(() => setToastMessage(''), 5500);
      } catch (err: any) {
        setToastMessage(`Gagal membaca file Excel: ${err.message || err}`);
        setTimeout(() => setToastMessage(''), 4000);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // If role is guru and admin hasn't assigned any subjects yet
  if (isGuru && assignedMapelList.length === 0) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto py-8">
        <div className="bg-white rounded-3xl border border-amber-200 shadow-sm p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900">
              Mata Pelajaran Belum Ditentukan
            </span>
            <h2 className="text-xl font-black text-slate-900 uppercase mt-2">
              Akun Guru Belum Diberikan Penugasan Mapel
            </h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto mt-1 leading-relaxed">
              Halo <strong>{currentUser?.namaLengkap || currentUser?.fullName}</strong>.
              Administrator Pondok Pesantren belum menentukan mata pelajaran yang Anda ajarkan.
            </p>
          </div>

          <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 text-xs text-amber-900 text-left space-y-1.5 max-w-md mx-auto">
            <p className="font-bold flex items-center gap-1.5">
              <School className="w-4 h-4 text-amber-700" />
              Langkah Penyelesaian:
            </p>
            <ol className="list-decimal pl-5 space-y-1 text-[11px] text-amber-800">
              <li>Hubungi Administrator atau Kepala Kepesantrenan.</li>
              <li>Minta Admin membuka menu <strong>"Manajemen Akun Guru & Akses"</strong>.</li>
              <li>Klik tombol <strong>Edit</strong> pada akun Anda dan centang mata pelajaran yang Anda ampu.</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-500 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-bold text-xs">{toastMessage}</span>
        </div>
      )}

      {/* Guru Header Info Banner */}
      {isGuru && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800">
                Portal Guru Pengajar
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-600">
                {currentUser?.namaLengkap || currentUser?.fullName}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              Input Nilai Mata Pelajaran yang Diajarkan
            </h2>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className="text-[11px] font-bold text-slate-500">Mata Pelajaran Anda:</span>
              {assignedMapelList.map((m) => (
                <span
                  key={m.id}
                  className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200"
                >
                  {m.nama} (KKM: {m.kkm})
                </span>
              ))}
            </div>
          </div>

          {/* View Mode Switcher for Guru */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl shrink-0">
            <button
              type="button"
              onClick={() => setGuruViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                guruViewMode === 'table'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Tabel Cepat Kelas</span>
            </button>
            <button
              type="button"
              onClick={() => setGuruViewMode('single')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                guruViewMode === 'single'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Lembar Per Santri</span>
            </button>
          </div>
        </div>
      )}

      {/* PILIHAN KELAS & SINKRONISASI DATA SANTRI WALI KELAS */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Label & Dropdown */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-slate-700">
              <GraduationCap className={`w-4 h-4 ${isGuru ? 'text-blue-600' : 'text-emerald-600'}`} />
              <label className="text-xs font-black uppercase tracking-wide">
                Pilih Kelas yang Dinilai:
              </label>
            </div>

            <div className="relative">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className={`px-3.5 py-2 pr-8 rounded-xl text-xs font-black border-2 cursor-pointer shadow-xs transition-all ${
                  isGuru
                    ? 'bg-blue-50/80 border-blue-300 text-blue-950 focus:ring-2 focus:ring-blue-600'
                    : 'bg-emerald-50/80 border-emerald-300 text-emerald-950 focus:ring-2 focus:ring-emerald-600'
                }`}
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
                {displayedSantriList.length} Santri{' '}
                {selectedClass !== 'Semua Kelas' ? `di ${selectedClass}` : 'Total'}
              </span>
            </span>
          </div>

          {/* Action Buttons: Template Download, Excel Upload, and Sync */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Download Template Nilai (.xlsx) */}
            <button
              type="button"
              onClick={handleDownloadNilaiTemplate}
              className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-xs border ${
                isGuru
                  ? 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}
              title={`Unduh template Excel format resmi untuk kelas ${selectedClass}`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Template Nilai (.xlsx)</span>
            </button>

            {/* Download Template Data Santri (.xlsx) */}
            <button
              type="button"
              onClick={handleDownloadSantriTemplate}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-xs border border-slate-200"
              title={`Unduh template buku induk santri kelas ${selectedClass}`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
              <span>Template Santri (.xlsx)</span>
            </button>

            {/* Upload Nilai from Excel */}
            <label
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-xs border border-slate-200"
              title="Unggah nilai dari file Excel yang sudah diisi"
            >
              <Upload className="w-3.5 h-3.5 text-slate-600" />
              <span>Upload Nilai Excel</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleExcelUpload}
                className="hidden"
              />
            </label>

            {/* Sync Button from Wali Kelas */}
            <button
              type="button"
              onClick={handleSyncData}
              disabled={isRefreshing}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-xs border border-slate-200"
              title="Perbarui data santri terbaru yang diinput oleh Wali Kelas"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Menyinkronkan...' : 'Sinkron Data Wali Kelas'}</span>
            </button>
          </div>
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
                      ? isGuru
                        ? 'bg-blue-700 text-white shadow-xs'
                        : 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{cls}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}

          {santriList.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedClass('Semua Kelas')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedClass === 'Semua Kelas'
                  ? isGuru
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span>Semua Santri</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  selectedClass === 'Semua Kelas'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {santriList.length}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* GURU MODE 1: TABEL CEPAT KELAS (INPUT SEMUA SANTRI SEKALIGUS) */}
      {isGuru && guruViewMode === 'table' && (
        <div className="space-y-4">
          {/* Subject Selector & Quick Actions Toolbar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs font-bold text-slate-700 uppercase">
                Pilih Mata Pelajaran:
              </label>
              <select
                value={selectedGuruMapelId}
                onChange={(e) => setSelectedGuruMapelId(e.target.value)}
                className="px-3.5 py-2 bg-blue-50 border border-blue-300 rounded-xl text-xs font-black text-blue-900 focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                {assignedMapelList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nama} (KKM: {m.kkm}) — {m.kategori}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-400 hidden md:inline">•</span>
              <span className="text-xs font-bold text-slate-600">
                Kelas: <span className="text-blue-700 uppercase font-black">{selectedClass}</span> ({displayedSantriList.length} Santri)
              </span>
            </div>

            {/* Quick Bulk Tools & Save All */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('tulis')}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1"
                title="Isi nilai tulis yang sama untuk semua santri di kelas ini"
              >
                <Sparkles className="w-3 h-3 text-blue-600" />
                Isi Massal Tulis
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('lisan')}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1"
                title="Isi nilai lisan yang sama untuk semua santri di kelas ini"
              >
                <Sparkles className="w-3 h-3 text-emerald-600" />
                Isi Massal Lisan
              </button>
              <button
                type="button"
                onClick={handleSaveAllTable}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-black rounded-xl text-xs shadow-md shadow-blue-900/10 cursor-pointer transition-all flex items-center gap-1.5 active:scale-[0.99]"
              >
                <Save className="w-4 h-4" />
                Simpan Semua Nilai ({currentGuruMapel?.nama || 'Mapel'})
              </button>
            </div>
          </div>

          {/* Table of Students for this Subject */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-3.5 w-12 text-center">No</th>
                    <th className="p-3.5 w-16 text-center">Absen</th>
                    <th className="p-3.5 w-28">NIS</th>
                    <th className="p-3.5">Nama Lengkap Santri</th>
                    <th className="p-3.5 w-32 text-center">
                      Nilai Tulis (0-100)
                    </th>
                    <th className="p-3.5 w-32 text-center">
                      Nilai Lisan (0-100)
                    </th>
                    <th className="p-3.5 w-28 text-center">
                      Nilai Akhir
                    </th>
                    <th className="p-3.5 w-24 text-center">
                      Predikat
                    </th>
                    <th className="p-3.5 w-28 text-center">
                      Status KKM
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedSantriList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">
                        <div className="max-w-md mx-auto space-y-2 py-4">
                          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                          <p className="font-bold text-slate-700 text-sm">
                            Belum Ada Data Santri di Kelas "{selectedClass}"
                          </p>
                          <p className="text-xs text-slate-500">
                            Data santri yang diinput atau diimpor oleh Wali Kelas {selectedClass} akan otomatis masuk ke sini untuk dinilai.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    displayedSantriList.map((s, idx) => {
                      const row = tableScores[s.id] || { tulis: 0, lisan: 0 };
                      const avg = Math.round((row.tulis + row.lisan) / 2);
                      const kkm = currentGuruMapel?.kkm || 40;
                      const letter = calculateScoreLetter(avg, kkm);
                      const isTuntas = avg >= kkm;

                      return (
                        <tr key={s.id} className="hover:bg-blue-50/40 transition-colors">
                          <td className="p-3.5 text-center font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="p-3.5 text-center font-extrabold text-slate-700">
                            {s.nomorUrutAbsen || idx + 1}
                          </td>
                          <td className="p-3.5 font-mono text-slate-500 font-bold">
                            {s.nis}
                          </td>
                          <td className="p-3.5">
                            <span className="font-bold text-slate-900 text-xs">
                              {s.namaLengkap}
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={row.tulis || ''}
                              placeholder="0"
                              onChange={(e) =>
                                handleTableScoreChange(s.id, 'tulis', e.target.value)
                              }
                              className="w-20 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-xs"
                            />
                          </td>
                          <td className="p-2.5 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={row.lisan || ''}
                              placeholder="0"
                              onChange={(e) =>
                                handleTableScoreChange(s.id, 'lisan', e.target.value)
                              }
                              className="w-20 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-xs"
                            />
                          </td>
                          <td className="p-3.5 text-center">
                            <span className="font-mono font-black text-slate-900 text-xs">
                              {avg > 0 ? avg : '-'}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[11px] font-black ${
                                letter === 'A'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : letter === 'B'
                                  ? 'bg-blue-100 text-blue-800'
                                  : letter === 'C'
                                  ? 'bg-amber-100 text-amber-800'
                                  : letter === 'D'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {letter}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            {avg > 0 ? (
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isTuntas
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {isTuntas ? 'Tuntas' : 'Remidi'}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Save Bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-500 font-medium">
                Pastikan seluruh nilai telah diisi dengan benar sebelum menekan tombol simpan.
              </span>
              <button
                type="button"
                onClick={handleSaveAllTable}
                className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-black rounded-xl text-xs shadow-md shadow-blue-900/10 cursor-pointer transition-all flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                Simpan Semua Nilai ({currentGuruMapel?.nama || 'Mapel'})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GURU MODE 2 (LEMBAR PER SANTRI) ATAU MODE DEFAULT WALI KELAS */}
      {(!isGuru || guruViewMode === 'single') && (
        <>
          {displayedSantriList.length === 0 ? (
            <div className="bg-white rounded-3xl border border-amber-200 shadow-sm p-8 text-center space-y-4">
              <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase">
                  Belum Ada Data Santri di Kelas {selectedClass}
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto mt-1 leading-relaxed">
                  Data santri yang diinput oleh <strong>Wali Kelas {selectedClass}</strong> (melalui menu Identitas Santri atau Import Excel) akan otomatis muncul di sini untuk dinilai per santri.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {availableClasses
                  .filter((c) => (studentCountPerClass[c] || 0) > 0)
                  .map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedClass(c)}
                      className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl text-xs font-bold border border-blue-200 cursor-pointer transition-all"
                    >
                      Buka {c} ({studentCountPerClass[c]} Santri)
                    </button>
                  ))}
                <button
                  type="button"
                  onClick={() => setSelectedClass('Semua Kelas')}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-200 cursor-pointer transition-all"
                >
                  Tampilkan Semua Santri ({santriList.length})
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Header Selector Card */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                      isGuru ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {currentSantri?.nomorUrutAbsen || currentIndex + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-slate-900 uppercase">
                        {currentSantri?.namaLengkap}
                      </h2>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                        NIS: {currentSantri?.nis || '-'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Kelas:{' '}
                      <span className={`font-bold ${isGuru ? 'text-blue-700' : 'text-emerald-700'}`}>
                        {currentSantri?.kelasSaatIni || selectedClass || settings.namaKelas}
                      </span>{' '}
                      • Semester:{' '}
                      <span className={`font-bold ${isGuru ? 'text-blue-700' : 'text-emerald-700'}`}>
                        {settings.semester}
                      </span>{' '}
                      • TA: {settings.tahunPelajaran}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Student Dropdown Selector */}
                  <select
                    value={selectedSantriId}
                    onChange={(e) => handleSelectSantri(e.target.value)}
                    className={`px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 ${
                      isGuru ? 'focus:ring-blue-600' : 'focus:ring-emerald-600'
                    }`}
                  >
                    {displayedSantriList.map((s, idx) => (
                      <option key={s.id} value={s.id}>
                        {s.nomorUrutAbsen ? `${s.nomorUrutAbsen}. ` : `${idx + 1}. `}
                        {s.namaLengkap} ({s.nis || 'No NIS'})
                      </option>
                    ))}
                  </select>

                  {/* Prev / Next Santri */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handlePrev}
                      disabled={currentIndex <= 0}
                      className="p-2 border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                      title="Santri Sebelumnya"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-600" />
                    </button>
                    <span className="text-[11px] font-bold text-slate-500 px-1 whitespace-nowrap">
                      {currentIndex + 1} / {displayedSantriList.length}
                    </span>
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={currentIndex >= displayedSantriList.length - 1}
                      className="p-2 border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                      title="Santri Selanjutnya"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>

                  {/* Save Button */}
                  <button
                    type="button"
                    onClick={handleSaveSingle}
                    className={`flex items-center gap-2 px-4 py-2.5 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer ${
                      isGuru
                        ? 'bg-blue-700 hover:bg-blue-800 shadow-blue-900/10'
                        : 'bg-emerald-700 hover:bg-emerald-800 shadow-emerald-900/10'
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    Simpan Nilai
                  </button>

                  {/* Save & Next Button */}
                  {currentIndex < displayedSantriList.length - 1 && (
                    <button
                      type="button"
                      onClick={handleSaveAndNext}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-900/10 transition-all cursor-pointer"
                      title="Simpan nilai santri ini dan langsung buka santri nomor berikutnya"
                    >
                      <span>Simpan & Lanjut</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

          {/* Tabs Navigation (For Wali Kelas: 4 tabs, For Guru: only Nilai Akademik) */}
          {!isGuru && (
            <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('akademik')}
                className={`flex items-center gap-2 px-5 py-3 font-bold text-xs border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'akademik'
                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                A. Nilai Akademik (Tulis & Lisan)
                <span className="ml-1 text-[11px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-extrabold">
                  Rerata: {rerata.toFixed(1)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('sikap')}
                className={`flex items-center gap-2 px-5 py-3 font-bold text-xs border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'sikap'
                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Heart className="w-4 h-4" />
                B. Nilai Sikap (Spiritual & Sosial)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ekstra')}
                className={`flex items-center gap-2 px-5 py-3 font-bold text-xs border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'ekstra'
                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Award className="w-4 h-4" />
                C. Ekstrakurikuler ({formNilai.ekstrakurikuler?.length || 0})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('kehadiran')}
                className={`flex items-center gap-2 px-5 py-3 font-bold text-xs border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'kehadiran'
                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Clock className="w-4 h-4" />
                D. Kehadiran / Absensi
              </button>
            </div>
          )}

          {/* TAB 1: NILAI AKADEMIK (TULIS & LISAN) */}
          {(activeTab === 'akademik' || isGuru) && (
            <div className="space-y-6">
              {isGuru && (
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-2xl flex items-center justify-between text-xs text-blue-900">
                  <span className="font-bold">
                    Menampilkan {activeSubjects.length} Mata Pelajaran yang Anda Ampu
                  </span>
                  <span className="text-[11px] font-semibold text-blue-700">
                    Nilai otomatis tersinkronisasi ke Raport Kelas
                  </span>
                </div>
              )}

              {categories.map((kategori) => {
                const mapelInCat = activeSubjects.filter((m) => m.kategori === kategori);
                return (
                  <div
                    key={kategori}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
                  >
                    <div
                      className={`px-5 py-3 text-white flex items-center justify-between ${
                        isGuru
                          ? 'bg-linear-to-r from-blue-900 to-indigo-900'
                          : 'bg-linear-to-r from-emerald-900 to-teal-900'
                      }`}
                    >
                      <h3 className="font-black text-xs uppercase tracking-wider">
                        {kategori}
                      </h3>
                      <span className="text-[11px] font-bold text-white/80">
                        {mapelInCat.length} Pelajaran
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {mapelInCat.map((mapel) => {
                        const nilaiItem = formNilai.akademik?.[mapel.id];
                        const tulisVal = nilaiItem?.tulis?.skor ?? 0;
                        const lisanVal = nilaiItem?.lisan?.skor ?? 0;
                        const rerataMapel =
                          tulisVal > 0 || lisanVal > 0
                            ? Math.round((tulisVal + lisanVal) / 2)
                            : 0;

                        return (
                          <div
                            key={mapel.id}
                            className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                          >
                            <div className="flex items-center gap-3 md:w-1/3">
                              <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                                {mapel.nomorUrut}
                              </span>
                              <div>
                                <h4 className="font-bold text-xs sm:text-sm text-slate-800">
                                  {mapel.nama}
                                </h4>
                                <span className="text-[10px] text-slate-400 font-semibold">
                                  KKM: {mapel.kkm}
                                </span>
                              </div>
                            </div>

                            {/* Inputs: Tulis & Lisan */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:w-2/3 items-center">
                              {/* 1. Nilai Tulis */}
                              <div className="space-y-1">
                                <label className="text-[10px] font-extrabold uppercase text-slate-500">
                                  Tulis (0-100)
                                </label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={tulisVal || ''}
                                    placeholder="0"
                                    onChange={(e) =>
                                      handleScoreChange(
                                        mapel.id,
                                        'tulis',
                                        e.target.value,
                                        mapel.kkm
                                      )
                                    }
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold text-xs focus:bg-white focus:ring-2 focus:ring-emerald-600"
                                  />
                                  <span className="text-xs font-mono font-bold text-emerald-800 w-5">
                                    {nilaiItem?.tulis?.huruf || '-'}
                                  </span>
                                </div>
                                <div className="text-[9px] text-slate-400 truncate">
                                  {terbilangAngka(tulisVal)}
                                </div>
                              </div>

                              {/* 2. Nilai Lisan */}
                              <div className="space-y-1">
                                <label className="text-[10px] font-extrabold uppercase text-slate-500">
                                  Lisan (0-100)
                                </label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={lisanVal || ''}
                                    placeholder="0"
                                    onChange={(e) =>
                                      handleScoreChange(
                                        mapel.id,
                                        'lisan',
                                        e.target.value,
                                        mapel.kkm
                                      )
                                    }
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold text-xs focus:bg-white focus:ring-2 focus:ring-emerald-600"
                                  />
                                  <span className="text-xs font-mono font-bold text-emerald-800 w-5">
                                    {nilaiItem?.lisan?.huruf || '-'}
                                  </span>
                                </div>
                                <div className="text-[9px] text-slate-400 truncate">
                                  {terbilangAngka(lisanVal)}
                                </div>
                              </div>

                              {/* 3. Nilai Akhir / Rerata */}
                              <div className="space-y-1 text-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-extrabold uppercase text-slate-500 block">
                                  Nilai Akhir
                                </span>
                                <span className="text-sm font-black text-slate-800">
                                  {rerataMapel > 0 ? rerataMapel : '-'}
                                </span>
                              </div>

                              {/* 4. Status Predikat */}
                              <div className="space-y-1 text-center bg-emerald-50/50 p-2 rounded-xl border border-emerald-100">
                                <span className="text-[10px] font-extrabold uppercase text-emerald-800 block">
                                  Predikat
                                </span>
                                <span className="text-xs font-black text-emerald-700">
                                  {rerataMapel >= mapel.kkm ? 'Tuntas' : 'Remidi'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: SIKAP (KHUSUS WALI KELAS) */}
          {!isGuru && activeTab === 'sikap' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
              <h3 className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-600" />
                Penilaian Sikap Spiritual & Sosial
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Deskripsi Sikap Spiritual
                  </label>
                  <textarea
                    rows={4}
                    value={formNilai.sikap?.spiritual || ''}
                    onChange={(e) =>
                      setFormNilai((prev) => ({
                        ...prev,
                        sikap: { ...prev.sikap, spiritual: e.target.value },
                      }))
                    }
                    placeholder="Contoh: Selalu taat menjalankan ibadah sholat fardhu berjamaah dan istiqomah tilawah Al-Qur'an..."
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Deskripsi Sikap Sosial
                  </label>
                  <textarea
                    rows={4}
                    value={formNilai.sikap?.sosial || ''}
                    onChange={(e) =>
                      setFormNilai((prev) => ({
                        ...prev,
                        sikap: { ...prev.sikap, sosial: e.target.value },
                      }))
                    }
                    placeholder="Contoh: Menunjukkan sikap santun, hormat kepada asatidz, dan peduli terhadap teman asrama..."
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EKSTRAKURIKULER (KHUSUS WALI KELAS) */}
          {!isGuru && activeTab === 'ekstra' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600" />
                  Kegiatan Ekstrakurikuler Santri
                </h3>
                <button
                  type="button"
                  onClick={handleAddEkstra}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Kegiatan
                </button>
              </div>

              <div className="space-y-3">
                {formNilai.ekstrakurikuler?.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">
                    Belum ada kegiatan ekstrakurikuler yang ditambahkan untuk santri ini.
                  </p>
                ) : (
                  formNilai.ekstrakurikuler?.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3"
                    >
                      <span className="text-xs font-bold text-slate-400 w-5 text-center">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={item.kegiatan}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormNilai((prev) => ({
                            ...prev,
                            ekstrakurikuler: prev.ekstrakurikuler.map((ek) =>
                              ek.id === item.id ? { ...ek, kegiatan: val } : ek
                            ),
                          }));
                        }}
                        placeholder="Nama Kegiatan (contoh: Pramuka / Muhadharah)"
                        className="w-1/3 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                      />
                      <input
                        type="text"
                        value={item.keterangan}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormNilai((prev) => ({
                            ...prev,
                            ekstrakurikuler: prev.ekstrakurikuler.map((ek) =>
                              ek.id === item.id ? { ...ek, keterangan: val } : ek
                            ),
                          }));
                        }}
                        placeholder="Keterangan / Predikat capaian"
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveEkstra(item.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: KEHADIRAN / ABSENSI (KHUSUS WALI KELAS) */}
          {!isGuru && activeTab === 'kehadiran' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
              <h3 className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                Catatan Kehadiran / Ketidakhadiran (Hari)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-slate-700">
                    Sakit (Hari)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formNilai.kehadiran?.sakit ?? 0}
                    onChange={(e) =>
                      setFormNilai((prev) => ({
                        ...prev,
                        kehadiran: {
                          ...prev.kehadiran,
                          sakit: Number(e.target.value) || 0,
                        },
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-slate-700">
                    Izin (Hari)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formNilai.kehadiran?.izin ?? 0}
                    onChange={(e) =>
                      setFormNilai((prev) => ({
                        ...prev,
                        kehadiran: {
                          ...prev.kehadiran,
                          izin: Number(e.target.value) || 0,
                        },
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-slate-700">
                    Tanpa Keterangan
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formNilai.kehadiran?.tanpaKeterangan ?? 0}
                    onChange={(e) =>
                      setFormNilai((prev) => ({
                        ...prev,
                        kehadiran: {
                          ...prev.kehadiran,
                          tanpaKeterangan: Number(e.target.value) || 0,
                        },
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold text-sm"
                  />
                </div>
              </div>
            </div>
          )}
            </>
          )}
        </>
      )}
    </div>
  );
};
