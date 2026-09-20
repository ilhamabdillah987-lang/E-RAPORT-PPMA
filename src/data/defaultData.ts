import { AppUser, MataPelajaran, RaportSettings, Santri, NilaiSantri } from '../types';

export const DEFAULT_LOGO_SVG = '';

export const DEFAULT_SETTINGS: RaportSettings = {
  namaYayasan: 'YAYASAN PENDIDIKAN ISLAM AL-HIKMAH',
  namaPesantren: 'PESANTREN MODERN AL-HIKMAH',
  alamatPesantren: 'Jl. Al-Hikmah Kp. Pondok Jaya RT.05/01 Desa Pondok Jaya Kecamatan Sepatan Kabupaten Tangerang Provinsi Banten',
  namaKelas: '7 MTS PUTRA',
  semester: 'GANJIL',
  tahunPelajaran: '2025/2026',
  kotaCetak: 'Tangerang',
  tanggalCetak: '20 Desember 2025',
  namaWaliKelas: '',
  nipWaliKelas: '',
  namaKepalaKepesantrenan: '',
  tanggalKenaikanKelulusan: '25 Juni 2026',
  logoUrl: '',
  googleSheetWebAppUrl: '',
};

export const DEFAULT_USERS: AppUser[] = [
  {
    id: 'user-admin',
    username: 'admin',
    password: 'alhikmah123',
    fullName: 'Administrator Pesantren',
    namaLengkap: 'Administrator Pesantren',
    role: 'admin',
    createdAt: '2025-07-01',
  },
  {
    id: 'user-walikelas',
    username: 'walikelas7',
    password: 'guru123',
    fullName: 'Wali Kelas',
    namaLengkap: '',
    role: 'walikelas',
    assignedClass: '7 MTS PUTRA',
    kelasAkses: '7 MTS PUTRA',
    createdAt: '2025-07-01',
  },
  {
    id: 'user-guru',
    username: 'guru',
    password: 'guru123',
    fullName: 'Ustadz Pengajar',
    namaLengkap: 'Ustadz Pengajar',
    role: 'guru',
    assignedClass: 'Semua Kelas',
    kelasAkses: 'Semua Kelas',
    assignedMapelIds: ['ar-1', 'ar-3'],
    mapelAkses: ['Asasul Mubtadiin Fi Ilmi Nahwi', 'Asasul Mubtadiin Fi Ilmi Shorfi'],
    createdAt: '2025-07-01',
  },
];

export const DEFAULT_MAPEL: MataPelajaran[] = [
  // 1. BAHASA ARAB
  { id: 'ar-1', kategori: '1. BAHASA ARAB', nomorUrut: 1, nama: 'Asasul Mubtadiin Fi Ilmi Nahwi', kkm: 40 },
  { id: 'ar-2', kategori: '1. BAHASA ARAB', nomorUrut: 2, nama: 'Mutammimah', kkm: 40 },
  { id: 'ar-3', kategori: '1. BAHASA ARAB', nomorUrut: 3, nama: 'Asasul Mubtadiin Fi Ilmi Shorfi', kkm: 40 },
  { id: 'ar-4', kategori: '1. BAHASA ARAB', nomorUrut: 4, nama: 'Durusullughah', kkm: 40 },
  { id: 'ar-5', kategori: '1. BAHASA ARAB', nomorUrut: 5, nama: 'Qiraatul Kutub', kkm: 40 },
  { id: 'ar-6', kategori: '1. BAHASA ARAB', nomorUrut: 6, nama: "Imla'", kkm: 40 },
  
  // 2. AGAMA
  { id: 'ag-1', kategori: '2. AGAMA', nomorUrut: 1, nama: "Al-Qur'an", kkm: 40 },
  { id: 'ag-2', kategori: '2. AGAMA', nomorUrut: 2, nama: 'Tajwid', kkm: 40 },
  { id: 'ag-3', kategori: '2. AGAMA', nomorUrut: 3, nama: 'Fiqih Qouliyah', kkm: 40 },
  { id: 'ag-4', kategori: '2. AGAMA', nomorUrut: 4, nama: "Fiqih Fi'liyah", kkm: 40 },

  // 3. BAHASA INGGRIS
  { id: 'en-1', kategori: '3. BAHASA INGGRIS', nomorUrut: 1, nama: 'Grammar', kkm: 40 },
  { id: 'en-2', kategori: '3. BAHASA INGGRIS', nomorUrut: 2, nama: 'Stories For You', kkm: 40 },
  { id: 'en-3', kategori: '3. BAHASA INGGRIS', nomorUrut: 3, nama: 'Speaking', kkm: 40 },
  { id: 'en-4', kategori: '3. BAHASA INGGRIS', nomorUrut: 4, nama: 'Dictation', kkm: 40 },
  { id: 'en-5', kategori: '3. BAHASA INGGRIS', nomorUrut: 5, nama: 'Vocabularies', kkm: 40 },
];

export const DEFAULT_SANTRI: Santri[] = [];

export function createEmptyNilaiSantri(santriId: string, kelas: string): NilaiSantri {
  const akademik: Record<string, { tulis: { skor: number; huruf: string }; lisan: { skor: number; huruf: string } }> = {};
  
  DEFAULT_MAPEL.forEach(m => {
    akademik[m.id] = {
      tulis: { skor: 0, huruf: '-' },
      lisan: { skor: 0, huruf: '-' }
    };
  });

  return {
    id: `nilai-${santriId}-GANJIL-2025/2026`,
    santriId,
    kelas,
    semester: 'GANJIL',
    tahunPelajaran: '2025/2026',
    akademik,
    sikap: {
      spiritual: '',
      sosial: ''
    },
    ekstrakurikuler: [],
    kehadiran: {
      sakit: 0,
      izin: 0,
      tanpaKeterangan: 0
    },
    updatedAt: new Date().toISOString()
  };
}

export const INITIAL_NILAI: Record<string, NilaiSantri> = {};

export const DEFAULT_RAPORT_SETTINGS = DEFAULT_SETTINGS;
export const DEFAULT_MAPEL_LIST = DEFAULT_MAPEL;
export const DEFAULT_SANTRI_LIST = DEFAULT_SANTRI;
export const DEFAULT_NILAI_MAP = INITIAL_NILAI;
