import { AppUser, MataPelajaran, RaportSettings, Santri, NilaiSantri } from '../types';

export const DEFAULT_LOGO_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120"><rect width="120" height="120" rx="16" fill="%23f0fdf4"/><circle cx="60" cy="60" r="48" fill="%23047857" stroke="%23065f46" stroke-width="2"/><path d="M40 78 C40 50 60 36 60 36 C60 36 80 50 80 78 C72 74 68 76 60 72 C52 76 48 74 40 78 Z" fill="%23ffffff"/><path d="M60 26 L60 35 M55 31 L65 31" stroke="%23facc15" stroke-width="2.5" stroke-linecap="round"/><circle cx="60" cy="50" r="4" fill="%23facc15"/><text x="60" y="96" font-family="Arial, sans-serif" font-size="8.5" font-weight="bold" fill="%23ffffff" text-anchor="middle" letter-spacing="1">AL-HIKMAH</text><text x="60" y="106" font-family="Arial, sans-serif" font-size="6.5" fill="%23bbf7d0" text-anchor="middle">SEPATAN - TANGERANG</text></svg>`;

export const DEFAULT_SETTINGS: RaportSettings = {
  namaYayasan: 'YAYASAN PENDIDIKAN ISLAM AL-HIKMAH',
  namaPesantren: 'PESANTREN MODERN AL-HIKMAH',
  alamatPesantren: 'Jl. Al-Hikmah Kp. Pondok Jaya RT.05/01 Desa Pondok Jaya Kecamatan Sepatan Kabupaten Tangerang Provinsi Banten',
  namaKelas: '7 MTS PUTRA',
  semester: 'GANJIL',
  tahunPelajaran: '2025/2026',
  kotaCetak: 'Tangerang',
  tanggalCetak: '20 Desember 2025',
  namaWaliKelas: 'Ustadz H. Ahmad Fauzi, S.Pd.I.',
  nipWaliKelas: '19840512 201001 1 008',
  namaKepalaKepesantrenan: 'KH. Syamsuddin Mahmud, Lc.',
  tanggalKenaikanKelulusan: '25 Juni 2026',
  logoUrl: DEFAULT_LOGO_SVG,
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
    fullName: 'Ustadz H. Ahmad Fauzi, S.Pd.I.',
    namaLengkap: 'Ustadz H. Ahmad Fauzi, S.Pd.I.',
    role: 'walikelas',
    assignedClass: '7 MTS PUTRA',
    kelasAkses: '7 MTS PUTRA',
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

export const DEFAULT_SANTRI: Santri[] = [
  {
    id: 'santri-1',
    nomorUrutAbsen: 1,
    namaLengkap: 'wGW',
    nis: 'wEFW',
    nisn: '0091827361',
    tempatLahir: 'Tangerang',
    tanggalLahir: '14 Mei 2012',
    jenisKelamin: 'Laki-laki',
    agama: 'Islam',
    statusKeluarga: 'Anak Kandung',
    anakKe: 1,
    alamatSantri: 'Kp. Pondok Jaya RT.02/03 Sepatan, Kab. Tangerang',
    teleponRumah: '081298765432',
    sekolahAsal: 'SD Negeri Sepatan 1',
    diterimaKelas: '7 MTS PUTRA',
    diterimaTanggal: '15 Juli 2025',
    namaAyah: 'H. Suherman',
    namaIbu: 'Hj. Aminah',
    alamatOrangTua: 'Kp. Pondok Jaya RT.02/03 Sepatan, Kab. Tangerang',
    teleponOrangTua: '081298765432',
    pekerjaanAyah: 'Wiraswasta',
    pekerjaanIbu: 'Ibu Rumah Tangga',
    namaWali: '-',
    alamatWali: '-',
    teleponWali: '-',
    pekerjaanWali: '-',
    kelasSaatIni: '7 MTS PUTRA',
    statusSantri: 'Aktif',
  },
  {
    id: 'santri-2',
    nomorUrutAbsen: 2,
    namaLengkap: 'Muhammad Zaidan Al-Fatih',
    nis: '252607002',
    nisn: '0092348172',
    tempatLahir: 'Jakarta',
    tanggalLahir: '21 Agustus 2012',
    jenisKelamin: 'Laki-laki',
    agama: 'Islam',
    statusKeluarga: 'Anak Kandung',
    anakKe: 2,
    alamatSantri: 'Perum Sepatan Residence Blok C No. 12',
    teleponRumah: '085712349876',
    sekolahAsal: 'MI Al-Falah',
    diterimaKelas: '7 MTS PUTRA',
    diterimaTanggal: '15 Juli 2025',
    namaAyah: 'Drs. H. Mulyadi',
    namaIbu: 'Siti Nurjanah, S.Pd.',
    alamatOrangTua: 'Perum Sepatan Residence Blok C No. 12',
    teleponOrangTua: '085712349876',
    pekerjaanAyah: 'PNS',
    pekerjaanIbu: 'Guru',
    namaWali: '-',
    alamatWali: '-',
    teleponWali: '-',
    pekerjaanWali: '-',
    kelasSaatIni: '7 MTS PUTRA',
    statusSantri: 'Aktif',
  },
  {
    id: 'santri-3',
    nomorUrutAbsen: 3,
    namaLengkap: 'Ahmad Faris Hidayat',
    nis: '252607003',
    nisn: '0098471923',
    tempatLahir: 'Serang',
    tanggalLahir: '03 Januari 2012',
    jenisKelamin: 'Laki-laki',
    agama: 'Islam',
    statusKeluarga: 'Anak Kandung',
    anakKe: 1,
    alamatSantri: 'Jl. Raya Mauk KM 14 Sepatan Tangerang',
    teleponRumah: '087812984567',
    sekolahAsal: 'SDIT Darussalam',
    diterimaKelas: '7 MTS PUTRA',
    diterimaTanggal: '15 Juli 2025',
    namaAyah: 'H. Ridwan Hakim',
    namaIbu: 'Khadijah',
    alamatOrangTua: 'Jl. Raya Mauk KM 14 Sepatan Tangerang',
    teleponOrangTua: '087812984567',
    pekerjaanAyah: 'Pedagang',
    pekerjaanIbu: 'Ibu Rumah Tangga',
    namaWali: '-',
    alamatWali: '-',
    teleponWali: '-',
    pekerjaanWali: '-',
    kelasSaatIni: '7 MTS PUTRA',
    statusSantri: 'Aktif',
  },
  {
    id: 'santri-4',
    nomorUrutAbsen: 4,
    namaLengkap: 'Bilal Ramadhan',
    nis: '252607004',
    nisn: '0095812398',
    tempatLahir: 'Tangerang',
    tanggalLahir: '18 September 2012',
    jenisKelamin: 'Laki-laki',
    agama: 'Islam',
    statusKeluarga: 'Anak Kandung',
    anakKe: 3,
    alamatSantri: 'Kp. Pisangan RT.01/02 Sepatan',
    teleponRumah: '081389012345',
    sekolahAsal: 'SDN Sepatan 2',
    diterimaKelas: '7 MTS PUTRA',
    diterimaTanggal: '15 Juli 2025',
    namaAyah: 'Syahril Anwar',
    namaIbu: 'Rohimah',
    alamatOrangTua: 'Kp. Pisangan RT.01/02 Sepatan',
    teleponOrangTua: '081389012345',
    pekerjaanAyah: 'Karyawan Swasta',
    pekerjaanIbu: 'Ibu Rumah Tangga',
    namaWali: '-',
    alamatWali: '-',
    teleponWali: '-',
    pekerjaanWali: '-',
    kelasSaatIni: '7 MTS PUTRA',
    statusSantri: 'Aktif',
  }
];

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
      spiritual: 'Tulis deskripsi sikap spiritual...',
      sosial: 'Tulis deskripsi sikap sosial...'
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

export const INITIAL_NILAI: Record<string, NilaiSantri> = {
  'santri-1': {
    id: 'nilai-santri-1-GANJIL-2025/2026',
    santriId: 'santri-1',
    kelas: '7 MTS PUTRA',
    semester: 'GANJIL',
    tahunPelajaran: '2025/2026',
    akademik: {
      'ar-1': { tulis: { skor: 0, huruf: '-' }, lisan: { skor: 0, huruf: '-' } },
      'ar-2': { tulis: { skor: 0, huruf: '-' }, lisan: { skor: 0, huruf: '-' } },
      'ar-3': { tulis: { skor: 0, huruf: '-' }, lisan: { skor: 0, huruf: '-' } },
      'ar-4': { tulis: { skor: 0, huruf: '-' }, lisan: { skor: 0, huruf: '-' } },
      'ar-5': { tulis: { skor: 0, huruf: '-' }, lisan: { skor: 0, huruf: '-' } },
      'ar-6': { tulis: { skor: 0, huruf: '-' }, lisan: { skor: 0, huruf: '-' } },
      'ag-1': { tulis: { skor: 0, huruf: '-' }, lisan: { skor: 0, huruf: '-' } },
      'ag-2': { tulis: { skor: 0, huruf: '-' }, lisan: { skor: 0, huruf: '-' } },
      'ag-3': { tulis: { skor: 0, huruf: '-' }, lisan: { skor: 0, huruf: '-' } },
      'ag-4': { tulis: { skor: 0, huruf: '-' }, lisan: { skor: 0, huruf: '-' } },
      'en-1': { tulis: { skor: 0, huruf: '-' }, lisan: { skor: 0, huruf: '-' } },
      'en-2': { tulis: { skor: 0, huruf: '-' }, lisan: { skor: 0, huruf: '-' } },
      'en-3': { tulis: { skor: 0, huruf: '-' }, lisan: { skor: 0, huruf: '-' } },
      'en-4': { tulis: { skor: 0, huruf: '-' }, lisan: { skor: 0, huruf: '-' } },
      'en-5': { tulis: { skor: 0, huruf: '-' }, lisan: { skor: 0, huruf: '-' } },
    },
    sikap: {
      spiritual: 'Tulis deskripsi sikap spiritual...',
      sosial: 'Tulis deskripsi sikap sosial...'
    },
    ekstrakurikuler: [],
    kehadiran: {
      sakit: 0,
      izin: 0,
      tanpaKeterangan: 0
    },
    updatedAt: new Date().toISOString()
  },
  'santri-2': {
    id: 'nilai-santri-2-GANJIL-2025/2026',
    santriId: 'santri-2',
    kelas: '7 MTS PUTRA',
    semester: 'GANJIL',
    tahunPelajaran: '2025/2026',
    akademik: {
      'ar-1': { tulis: { skor: 85, huruf: 'A' }, lisan: { skor: 88, huruf: 'A' } },
      'ar-2': { tulis: { skor: 82, huruf: 'B' }, lisan: { skor: 80, huruf: 'B' } },
      'ar-3': { tulis: { skor: 78, huruf: 'B' }, lisan: { skor: 85, huruf: 'A' } },
      'ar-4': { tulis: { skor: 90, huruf: 'A' }, lisan: { skor: 92, huruf: 'A' } },
      'ar-5': { tulis: { skor: 85, huruf: 'A' }, lisan: { skor: 86, huruf: 'A' } },
      'ar-6': { tulis: { skor: 88, huruf: 'A' }, lisan: { skor: 85, huruf: 'A' } },
      'ag-1': { tulis: { skor: 95, huruf: 'A' }, lisan: { skor: 96, huruf: 'A' } },
      'ag-2': { tulis: { skor: 90, huruf: 'A' }, lisan: { skor: 92, huruf: 'A' } },
      'ag-3': { tulis: { skor: 84, huruf: 'B' }, lisan: { skor: 86, huruf: 'A' } },
      'ag-4': { tulis: { skor: 88, huruf: 'A' }, lisan: { skor: 90, huruf: 'A' } },
      'en-1': { tulis: { skor: 80, huruf: 'B' }, lisan: { skor: 82, huruf: 'B' } },
      'en-2': { tulis: { skor: 85, huruf: 'A' }, lisan: { skor: 85, huruf: 'A' } },
      'en-3': { tulis: { skor: 86, huruf: 'A' }, lisan: { skor: 88, huruf: 'A' } },
      'en-4': { tulis: { skor: 82, huruf: 'B' }, lisan: { skor: 84, huruf: 'B' } },
      'en-5': { tulis: { skor: 90, huruf: 'A' }, lisan: { skor: 90, huruf: 'A' } },
    },
    sikap: {
      spiritual: 'Selalu disiplin dalam shalat lima waktu berjamaah, tartil membaca Al-Qur\'an, dan menunjukkan adab yang sangat baik kepada ustadz.',
      sosial: 'Menunjukkan sikap tolong menolong yang tinggi dengan sesama santri di asrama, santun dalam bertutur kata, dan aktif menjaga kebersihan.'
    },
    ekstrakurikuler: [
      { id: 'ek-1', kegiatan: 'Muhadharah (Khitobah 3 Bahasa)', keterangan: 'Sangat percaya diri dalam membawakan pidato Bahasa Arab dan Inggris di panggung.' },
      { id: 'ek-2', kegiatan: 'Pramuka Penggalang', keterangan: 'Aktif mengikuti kegiatan kepramukaan dan menguasai sandi morse serta semaphore.' }
    ],
    kehadiran: {
      sakit: 1,
      izin: 0,
      tanpaKeterangan: 0
    },
    updatedAt: new Date().toISOString()
  }
};

export const DEFAULT_RAPORT_SETTINGS = DEFAULT_SETTINGS;
export const DEFAULT_MAPEL_LIST = DEFAULT_MAPEL;
export const DEFAULT_SANTRI_LIST = DEFAULT_SANTRI;
export const DEFAULT_NILAI_MAP = INITIAL_NILAI;
