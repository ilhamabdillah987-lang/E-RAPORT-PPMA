import React, { useState, useMemo } from 'react';
import { AppUser, RaportSettings, MataPelajaran } from '../types';
import { DEFAULT_MAPEL } from '../data/defaultData';
import {
  UserPlus,
  Users,
  Trash2,
  Key,
  Shield,
  CheckCircle2,
  X,
  Edit2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  School,
  UserCheck,
  Search,
  Filter,
  BookOpen,
  GraduationCap,
} from 'lucide-react';

interface UserManagementViewProps {
  users: AppUser[];
  currentUser: AppUser;
  settings: RaportSettings;
  mapelList?: MataPelajaran[];
  onAddUser: (user: AppUser) => void;
  onUpdateUser: (user: AppUser) => void;
  onDeleteUser: (id: string) => void;
  onSetActiveWaliKelas?: (user: AppUser) => void;
}

const KELAS_OPTIONS = [
  '7 MTS PUTRA',
  '7 MTS PUTRI',
  '8 MTS PUTRA',
  '8 MTS PUTRI',
  '9 MTS PUTRA',
  '9 MTS PUTRI',
  '10 MA PUTRA',
  '10 MA PUTRI',
  '11 MA PUTRA',
  '11 MA PUTRI',
  '12 MA PUTRA',
  '12 MA PUTRI',
];

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  currentUser,
  settings,
  mapelList = DEFAULT_MAPEL,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onSetActiveWaliKelas,
}) => {
  // Tabs & filters
  const [filterRole, setFilterRole] = useState<'all' | 'walikelas' | 'admin' | 'guru'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  // Form states for Create
  const [namaLengkap, setNamaLengkap] = useState('');
  const [nip, setNip] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'walikelas' | 'guru' | 'admin'>('walikelas');
  const [kelasAkses, setKelasAkses] = useState('7 MTS PUTRA');
  const [customKelas, setCustomKelas] = useState('');
  const [selectedMapelIds, setSelectedMapelIds] = useState<string[]>([]);

  // Feedback states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Categories of mata pelajaran
  const categories = useMemo(() => {
    return Array.from(new Set(mapelList.map((m) => m.kategori)));
  }, [mapelList]);

  // Quick password generator
  const generateRandomPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let res = 'hikmah';
    for (let i = 0; i < 4; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  const handleOpenCreateModal = (defaultRole: 'walikelas' | 'guru' | 'admin' = 'walikelas') => {
    setRole(defaultRole);
    setNamaLengkap('');
    setNip('');
    setUsername('');
    setPassword(generateRandomPassword());
    setShowPassword(true);
    setKelasAkses(defaultRole === 'guru' ? 'Semua Kelas' : '7 MTS PUTRA');
    setCustomKelas('');
    setSelectedMapelIds([]);
    setIsCreateModalOpen(true);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();

    if (users.some((u) => u.username.toLowerCase() === username.trim().toLowerCase())) {
      alert('Username tersebut sudah digunakan. Silakan gunakan username lain.');
      return;
    }

    if (role === 'guru' && selectedMapelIds.length === 0) {
      if (!window.confirm('Anda belum mencentang mata pelajaran yang diajar untuk guru ini. Tetap simpan? (Mata pelajaran dapat ditentukan nanti)')) {
        return;
      }
    }

    const assigned = kelasAkses === 'LAINNYA' ? customKelas.trim() : kelasAkses;
    const mapelNames = mapelList
      .filter((m) => selectedMapelIds.includes(m.id))
      .map((m) => m.nama);

    const newUser: AppUser = {
      id: 'user-' + Date.now(),
      username: username.trim(),
      password: password.trim(),
      fullName: namaLengkap.trim(),
      namaLengkap: namaLengkap.trim(),
      nip: nip.trim() || undefined,
      role: role,
      assignedClass: role === 'walikelas' ? assigned : role === 'guru' ? assigned : undefined,
      kelasAkses: role === 'walikelas' ? assigned : role === 'guru' ? assigned : undefined,
      assignedMapelIds: role === 'guru' ? selectedMapelIds : undefined,
      mapelAkses: role === 'guru' ? mapelNames : undefined,
      createdAt: new Date().toISOString(),
    };

    onAddUser(newUser);
    setIsCreateModalOpen(false);
    setSuccessMsg(
      `Akun ${
        newUser.role === 'walikelas'
          ? 'Wali Kelas'
          : newUser.role === 'guru'
          ? 'Guru Pengajar'
          : 'Administrator'
      } "${newUser.namaLengkap}" (Username: ${newUser.username}) berhasil dibuat!`
    );
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleOpenEditModal = (user: AppUser) => {
    // If assignedMapelIds is not set yet, but mapelAkses (names) are, sync them
    let initialMapelIds = user.assignedMapelIds || [];
    if (initialMapelIds.length === 0 && user.mapelAkses && user.mapelAkses.length > 0) {
      initialMapelIds = mapelList
        .filter((m) => user.mapelAkses?.includes(m.nama))
        .map((m) => m.id);
    }

    setEditingUser({
      ...user,
      assignedMapelIds: initialMapelIds,
    });
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    // Check duplicate username if changed
    const duplicate = users.find(
      (u) =>
        u.id !== editingUser.id &&
        u.username.toLowerCase() === editingUser.username.trim().toLowerCase()
    );
    if (duplicate) {
      alert('Username tersebut sudah digunakan oleh akun lain.');
      return;
    }

    const currentMapelIds = editingUser.assignedMapelIds || [];
    const mapelNames = mapelList
      .filter((m) => currentMapelIds.includes(m.id))
      .map((m) => m.nama);

    const updatedUser: AppUser = {
      ...editingUser,
      username: editingUser.username.trim(),
      password: editingUser.password.trim(),
      fullName: (editingUser.namaLengkap || editingUser.fullName).trim(),
      namaLengkap: (editingUser.namaLengkap || editingUser.fullName).trim(),
      assignedClass:
        editingUser.role === 'walikelas' || editingUser.role === 'guru'
          ? editingUser.kelasAkses || editingUser.assignedClass
          : undefined,
      kelasAkses:
        editingUser.role === 'walikelas' || editingUser.role === 'guru'
          ? editingUser.kelasAkses || editingUser.assignedClass
          : undefined,
      assignedMapelIds: editingUser.role === 'guru' ? currentMapelIds : undefined,
      mapelAkses: editingUser.role === 'guru' ? mapelNames : undefined,
    };

    onUpdateUser(updatedUser);
    setEditingUser(null);
    setSuccessMsg(`Data akun "${updatedUser.namaLengkap}" berhasil diperbarui!`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleCopyCredentials = (user: AppUser) => {
    const mapelInfo =
      user.role === 'guru'
        ? `Mata Pelajaran: ${
            user.mapelAkses && user.mapelAkses.length > 0
              ? user.mapelAkses.join(', ')
              : user.assignedMapelIds && user.assignedMapelIds.length > 0
              ? mapelList
                  .filter((m) => user.assignedMapelIds?.includes(m.id))
                  .map((m) => m.nama)
                  .join(', ')
              : 'Semua / Belum diatur'
          }\n`
        : '';

    const text =
      `*AKUN RAPORT PONDOK PESANTREN AL-HIKMAH*\n` +
      `Nama: ${user.namaLengkap || user.fullName}\n` +
      `Peran: ${
        user.role === 'walikelas'
          ? 'Wali Kelas'
          : user.role === 'admin'
          ? 'Administrator'
          : 'Guru Pengajar'
      }\n` +
      (user.role === 'walikelas'
        ? `Kelas Binaan: ${user.kelasAkses || user.assignedClass || '-'}\n`
        : '') +
      mapelInfo +
      `Username: ${user.username}\n` +
      `Password: ${user.password}\n` +
      `Aplikasi: Raport Digital Santri`;

    navigator.clipboard.writeText(text);
    setCopiedId(user.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchRole = filterRole === 'all' ? true : u.role === filterRole;
    const name = (u.namaLengkap || u.fullName || '').toLowerCase();
    const uname = u.username.toLowerCase();
    const kls = (u.kelasAkses || u.assignedClass || '').toLowerCase();
    const mapel = (u.mapelAkses || []).join(' ').toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q || name.includes(q) || uname.includes(q) || kls.includes(q) || mapel.includes(q);
    return matchRole && matchSearch;
  });

  const totalWaliKelas = users.filter((u) => u.role === 'walikelas').length;
  const totalGuru = users.filter((u) => u.role === 'guru').length;
  const totalAdmin = users.filter((u) => u.role === 'admin').length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800">
              Hak Akses Administrator
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-600">
              {users.length} Akun Terdaftar ({totalWaliKelas} Wali Kelas, {totalGuru} Guru)
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
            Manajemen Akun Guru, Wali Kelas & Akses
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Buatkan username & password untuk Guru Pengajar dan Wali Kelas serta tentukan mata pelajaran yang diajarkan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenCreateModal('guru')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-900/10 cursor-pointer transition-all shrink-0"
          >
            <BookOpen className="w-4 h-4" />
            + Buat Akun Guru & Mapel
          </button>
          <button
            type="button"
            onClick={() => handleOpenCreateModal('walikelas')}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-900/10 cursor-pointer transition-all shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            + Akun Wali Kelas
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="flex items-center gap-3 text-emerald-900 bg-emerald-50 px-4 py-3 rounded-2xl text-xs font-bold border border-emerald-200 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Info Card: Wali Kelas Aktif saat ini di Format Cetak Raport */}
      <div className="bg-linear-to-r from-emerald-900 to-teal-900 text-white p-5 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
            <School className="w-4 h-4" />
            Wali Kelas Aktif Pada Format Cetak Raport Saat Ini:
          </div>
          <div className="text-base font-black tracking-wide">
            {settings.namaWaliKelas || 'Belum Ditetapkan'}{' '}
            {settings.nipWaliKelas ? (
              <span className="text-xs font-normal text-emerald-200">({settings.nipWaliKelas})</span>
            ) : null}
          </div>
          <div className="text-xs text-emerald-200">
            Kelas Binaan:{' '}
            <span className="font-bold text-white uppercase bg-emerald-800/80 px-2 py-0.5 rounded-md">
              {settings.namaKelas}
            </span>
          </div>
        </div>

        <div className="text-xs text-emerald-100/80 bg-white/10 p-3 rounded-2xl border border-white/10 max-w-sm">
          💡 <strong>Tips Admin:</strong> Klik tombol <em>"Jadikan Wali Kelas di Raport"</em> pada daftar di bawah untuk langsung menetapkan nama wali kelas pada lembar cetak raport. Untuk akun <strong>Guru Pengajar</strong>, Anda dapat menentukan mata pelajaran apa saja yang diampunya.
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Role Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilterRole('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterRole === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Pengguna ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterRole('guru')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filterRole === 'guru'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Guru Pengajar ({totalGuru})
          </button>
          <button
            type="button"
            onClick={() => setFilterRole('walikelas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filterRole === 'walikelas'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Wali Kelas ({totalWaliKelas})
          </button>
          <button
            type="button"
            onClick={() => setFilterRole('admin')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filterRole === 'admin'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Administrator ({totalAdmin})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama / username / mapel..."
            className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:bg-white"
          />
        </div>
      </div>

      {/* Tabel Daftar Pengguna */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="p-4 w-12 text-center">No</th>
                <th className="p-4">Identitas & Nama Lengkap</th>
                <th className="p-4">Kredensial Login</th>
                <th className="p-4">Peran (Role)</th>
                <th className="p-4">Tugas / Mapel yang Diajar</th>
                <th className="p-4 text-center w-48">Aksi Administrator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                    Tidak ada akun yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, i) => {
                  const isCurrentActiveWali =
                    u.role === 'walikelas' &&
                    settings.namaWaliKelas.toLowerCase() ===
                      (u.namaLengkap || u.fullName).toLowerCase();

                  // Find assigned mapel objects
                  const assignedMapels = mapelList.filter(
                    (m) =>
                      u.assignedMapelIds?.includes(m.id) ||
                      u.mapelAkses?.includes(m.nama)
                  );

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCurrentActiveWali ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      {/* No */}
                      <td className="p-4 text-center font-bold text-slate-400">{i + 1}</td>

                      {/* Nama & NIP */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                              u.role === 'admin'
                                ? 'bg-purple-100 text-purple-800'
                                : u.role === 'walikelas'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {(u.namaLengkap || u.fullName || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{u.namaLengkap || u.fullName}</span>
                              {isCurrentActiveWali && (
                                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-emerald-600 text-white tracking-wider">
                                  Aktif di Raport
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-normal">
                              {u.nip ? `NIP: ${u.nip}` : 'NIP: -'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Username & Password */}
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold text-slate-400">
                              User:
                            </span>
                            <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                              {u.username}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold text-slate-400">
                              Pass:
                            </span>
                            <span className="font-mono font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-100">
                              {u.password}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyCredentials(u)}
                              className="p-1 hover:bg-slate-200 text-slate-500 rounded transition-colors cursor-pointer"
                              title="Salin Kredensial untuk WhatsApp"
                            >
                              {copiedId === u.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            u.role === 'admin'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : u.role === 'walikelas'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {u.role === 'admin' ? (
                            <>
                              <Shield className="w-3 h-3" />
                              Administrator
                            </>
                          ) : u.role === 'walikelas' ? (
                            <>
                              <UserCheck className="w-3 h-3" />
                              Wali Kelas
                            </>
                          ) : (
                            <>
                              <BookOpen className="w-3 h-3" />
                              Guru Pengajar
                            </>
                          )}
                        </span>
                      </td>

                      {/* Tugas / Mapel yang Diajar */}
                      <td className="p-4">
                        {u.role === 'walikelas' ? (
                          <div>
                            <div className="font-bold text-slate-800 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 inline-block">
                              Kelas: {u.kelasAkses || u.assignedClass || 'Belum diatur'}
                            </div>
                          </div>
                        ) : u.role === 'guru' ? (
                          <div className="space-y-1 max-w-xs">
                            {assignedMapels.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {assignedMapels.map((m) => (
                                  <span
                                    key={m.id}
                                    className="bg-blue-50 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-blue-200 truncate"
                                    title={m.nama}
                                  >
                                    {m.nama}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 font-medium inline-block">
                                Belum ada mapel (Klik edit)
                              </span>
                            )}
                            <div className="text-[10px] text-slate-400">
                              Kelas: {u.kelasAkses || u.assignedClass || 'Semua Kelas'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium">Semua Akses Sistem</span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Tetapkan sebagai Wali Kelas Aktif */}
                          {u.role === 'walikelas' && onSetActiveWaliKelas && (
                            <button
                              type="button"
                              onClick={() => {
                                onSetActiveWaliKelas(u);
                                setSuccessMsg(
                                  `"${
                                    u.namaLengkap || u.fullName
                                  }" sekarang ditetapkan sebagai Wali Kelas aktif di Raport!`
                                );
                                setTimeout(() => setSuccessMsg(''), 3000);
                              }}
                              className={`px-2.5 py-1.5 rounded-xl font-bold text-[10px] cursor-pointer transition-all flex items-center gap-1 ${
                                isCurrentActiveWali
                                  ? 'bg-emerald-700 text-white shadow-xs'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                              title="Terapkan nama wali kelas dan kelas binaan ke format cetak raport"
                            >
                              <UserCheck className="w-3 h-3" />
                              <span>{isCurrentActiveWali ? 'Sedang Dipakai' : 'Pilih Raport'}</span>
                            </button>
                          )}

                          {/* Edit User / Atur Mapel Guru / Reset Password */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(u)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors border border-slate-200"
                            title={
                              u.role === 'guru'
                                ? 'Edit Akun & Atur Mata Pelajaran yang Diajar'
                                : 'Edit Akun & Reset Kata Sandi'
                            }
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          {u.id !== currentUser.id ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Hapus akun ${u.namaLengkap || u.fullName} (${u.username})?`
                                  )
                                ) {
                                  onDeleteUser(u.id);
                                }
                              }}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors border border-rose-200"
                              title="Hapus Akun Pengguna"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-semibold px-1">
                              (Anda)
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: BUAT AKUN BARU OLEH ADMIN */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="p-5 bg-linear-to-r from-slate-900 to-slate-800 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  Buat Akun Guru Pengajar / Wali Kelas Baru
                </h3>
                <p className="text-[11px] text-slate-300">
                  Dikelola langsung oleh Administrator Pondok Pesantren
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              {/* Role Selection */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1.5">
                  1. Pilih Peran Pengguna (Role)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRole('guru');
                      setKelasAkses('Semua Kelas');
                    }}
                    className={`py-2 px-3 rounded-xl font-bold text-center border cursor-pointer transition-all ${
                      role === 'guru'
                        ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Guru Pengajar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRole('walikelas');
                      setKelasAkses('7 MTS PUTRA');
                    }}
                    className={`py-2 px-3 rounded-xl font-bold text-center border cursor-pointer transition-all ${
                      role === 'walikelas'
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Wali Kelas
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`py-2 px-3 rounded-xl font-bold text-center border cursor-pointer transition-all ${
                      role === 'admin'
                        ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Administrator
                  </button>
                </div>
              </div>

              {/* Nama Lengkap & NIP */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    2. Nama Lengkap & Gelar
                  </label>
                  <input
                    type="text"
                    required
                    value={namaLengkap}
                    onChange={(e) => setNamaLengkap(e.target.value)}
                    placeholder={
                      role === 'guru'
                        ? 'e.g. Ustadz Abdullah, S.Pd.I.'
                        : 'e.g. Ustadz Ahmad, M.Pd.'
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    NIP / No. Induk
                  </label>
                  <input
                    type="text"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="e.g. 198203..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* KHUSUS GURU: Tentukan Mata Pelajaran yang Diajarkan */}
              {role === 'guru' && (
                <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-blue-950 uppercase text-[11px] flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-700" />
                      3. Tentukan Mata Pelajaran yang Diajar oleh Guru Ini:
                    </label>
                    <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                      {selectedMapelIds.length} Mapel Dipilih
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-800">
                    Guru ini nantinya hanya dapat menginput nilai untuk mata pelajaran yang dicentang oleh Admin di bawah ini:
                  </p>

                  {/* List of Subjects by Category */}
                  <div className="max-h-48 overflow-y-auto space-y-2.5 bg-white p-3 rounded-xl border border-blue-200">
                    {categories.map((cat) => {
                      const catMapels = mapelList.filter((m) => m.kategori === cat);
                      const allCatSelected = catMapels.every((m) =>
                        selectedMapelIds.includes(m.id)
                      );
                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                            <span>{cat}</span>
                            <button
                              type="button"
                              onClick={() => {
                                if (allCatSelected) {
                                  setSelectedMapelIds((prev) =>
                                    prev.filter((id) => !catMapels.some((m) => m.id === id))
                                  );
                                } else {
                                  setSelectedMapelIds((prev) =>
                                    Array.from(new Set([...prev, ...catMapels.map((m) => m.id)]))
                                  );
                                }
                              }}
                              className="text-[10px] text-blue-700 hover:text-blue-900 font-bold underline cursor-pointer"
                            >
                              {allCatSelected ? 'Batal Semua' : 'Pilih Semua'}
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pl-1">
                            {catMapels.map((m) => {
                              const isChecked = selectedMapelIds.includes(m.id);
                              return (
                                <label
                                  key={m.id}
                                  className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                                    isChecked
                                      ? 'bg-blue-50 border-blue-400 text-blue-950 font-bold'
                                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedMapelIds((prev) => [...prev, m.id]);
                                      } else {
                                        setSelectedMapelIds((prev) =>
                                          prev.filter((id) => id !== m.id)
                                        );
                                      }
                                    }}
                                    className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                  />
                                  <span className="truncate">{m.nama}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Kelas Binaan (Jika Wali Kelas) */}
              {role === 'walikelas' && (
                <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-2">
                  <label className="block font-bold text-emerald-900 uppercase">
                    3. Tetapkan Kelas Binaan Wali Kelas
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={kelasAkses}
                      onChange={(e) => setKelasAkses(e.target.value)}
                      className="px-3 py-2 bg-white border border-emerald-300 rounded-xl font-bold text-slate-800"
                    >
                      {KELAS_OPTIONS.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                      <option value="LAINNYA">+ Ketik Kelas Lain...</option>
                    </select>

                    {kelasAkses === 'LAINNYA' ? (
                      <input
                        type="text"
                        required
                        value={customKelas}
                        onChange={(e) => setCustomKelas(e.target.value)}
                        placeholder="Ketik nama kelas..."
                        className="px-3 py-2 bg-white border border-emerald-300 rounded-xl font-bold text-slate-800 uppercase"
                      />
                    ) : (
                      <div className="flex items-center text-[11px] text-emerald-800 font-medium px-2">
                        Wali kelas akan mengelola kelas ini
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Username & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    4. Buatkan Username
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={role === 'guru' ? 'e.g. gurunahwu' : 'e.g. walikelas7a'}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 uppercase">
                      5. Buatkan Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setPassword(generateRandomPassword())}
                      className="text-[10px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" /> Acak
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan kata sandi"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Simpan & Buat Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT AKUN & UBAH MATA PELAJARAN / PASSWORD */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-emerald-400" />
                  Edit Akun & Atur Penugasan
                </h3>
                <p className="text-[11px] text-slate-300">
                  Ubah data, mata pelajaran yang diajarkan, atau reset password
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Nama Lengkap Pemilik Akun
                </label>
                <input
                  type="text"
                  required
                  value={editingUser.namaLengkap || editingUser.fullName}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      namaLengkap: e.target.value,
                      fullName: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    NIP / No. Identitas
                  </label>
                  <input
                    type="text"
                    value={editingUser.nip || ''}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        nip: e.target.value,
                      })
                    }
                    placeholder="e.g. 19820..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Peran (Role)
                  </label>
                  <select
                    value={editingUser.role}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        role: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  >
                    <option value="guru">Guru Pengajar</option>
                    <option value="walikelas">Wali Kelas</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              {/* JIKA GURU: Tentukan Mata Pelajaran yang Diajar */}
              {editingUser.role === 'guru' && (
                <div className="p-3.5 bg-blue-50/80 rounded-2xl border border-blue-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-blue-950 uppercase text-[11px] flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-700" />
                      Mata Pelajaran yang Diajarkan oleh Guru Ini:
                    </label>
                    <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                      {(editingUser.assignedMapelIds || []).length} Mapel Terpilih
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-2.5 bg-white p-3 rounded-xl border border-blue-200">
                    {categories.map((cat) => {
                      const catMapels = mapelList.filter((m) => m.kategori === cat);
                      const currentIds = editingUser.assignedMapelIds || [];
                      const allCatSelected = catMapels.every((m) => currentIds.includes(m.id));

                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                            <span>{cat}</span>
                            <button
                              type="button"
                              onClick={() => {
                                if (allCatSelected) {
                                  setEditingUser({
                                    ...editingUser,
                                    assignedMapelIds: currentIds.filter(
                                      (id) => !catMapels.some((m) => m.id === id)
                                    ),
                                  });
                                } else {
                                  setEditingUser({
                                    ...editingUser,
                                    assignedMapelIds: Array.from(
                                      new Set([...currentIds, ...catMapels.map((m) => m.id)])
                                    ),
                                  });
                                }
                              }}
                              className="text-[10px] text-blue-700 hover:text-blue-900 font-bold underline cursor-pointer"
                            >
                              {allCatSelected ? 'Batal Semua' : 'Pilih Semua'}
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pl-1">
                            {catMapels.map((m) => {
                              const isChecked = currentIds.includes(m.id);
                              return (
                                <label
                                  key={m.id}
                                  className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                                    isChecked
                                      ? 'bg-blue-50 border-blue-400 text-blue-950 font-bold'
                                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setEditingUser({
                                          ...editingUser,
                                          assignedMapelIds: [...currentIds, m.id],
                                        });
                                      } else {
                                        setEditingUser({
                                          ...editingUser,
                                          assignedMapelIds: currentIds.filter((id) => id !== m.id),
                                        });
                                      }
                                    }}
                                    className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                  />
                                  <span className="truncate">{m.nama}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* JIKA WALI KELAS */}
              {editingUser.role === 'walikelas' && (
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Kelas Binaan (Akses Kelas)
                  </label>
                  <input
                    type="text"
                    required
                    value={editingUser.kelasAkses || editingUser.assignedClass || ''}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        kelasAkses: e.target.value,
                        assignedClass: e.target.value,
                      })
                    }
                    placeholder="e.g. 7 MTS PUTRA"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:bg-white uppercase"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Username Akun
                  </label>
                  <input
                    type="text"
                    required
                    value={editingUser.username}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        username: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 uppercase">
                      Password Baru
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingUser({
                          ...editingUser,
                          password: generateRandomPassword(),
                        })
                      }
                      className="text-[10px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" /> Acak
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={editingUser.password}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        password: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
