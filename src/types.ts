export type UserRole = 'admin' | 'walikelas' | 'guru';

export interface AppUser {
  id: string;
  username: string;
  password: string;
  fullName: string;
  namaLengkap?: string;
  role: UserRole;
  assignedClass?: string;
  kelasAkses?: string;
  nip?: string;
  createdAt: string;
}

export interface Santri {
  id: string;
  nomorUrutAbsen: number;
  namaLengkap: string;
  nis: string;
  nisn: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: 'Laki-laki' | 'Perempuan';
  agama: string; // Default: 'Islam'
  statusKeluarga: string; // 'Anak Kandung', etc.
  anakKe: number | string;
  alamatSantri: string;
  teleponRumah: string;
  sekolahAsal: string;
  diterimaKelas: string; // e.g. '7 MTS PUTRA'
  diterimaTanggal: string; // e.g. '15 Juli 2025'
  
  // Orang Tua
  namaAyah: string;
  namaIbu: string;
  alamatOrangTua: string;
  teleponOrangTua: string;
  pekerjaanAyah: string;
  pekerjaanIbu: string;

  // Wali
  namaWali?: string;
  alamatWali?: string;
  teleponWali?: string;
  pekerjaanWali?: string;

  // Status Akademik
  kelasSaatIni: string; // e.g. '7 MTS PUTRA'
  statusSantri: 'Aktif' | 'Lulus' | 'Tidak Naik' | 'Pindah';
  fotoUrl?: string;
}

export interface MataPelajaran {
  id: string;
  kategori: string; // '1. BAHASA ARAB', '2. AGAMA', '3. BAHASA INGGRIS', etc.
  nomorUrut: number;
  nama: string;
  kkm: number;
}

export interface NilaiItem {
  skor: number;
  huruf: string; // e.g. '-', 'A', 'B', 'C', 'D' or Terbilang
}

export interface NilaiMataPelajaran {
  tulis: NilaiItem;
  lisan: NilaiItem;
}

export interface NilaiSikap {
  spiritual: string;
  sosial: string;
}

export interface EkstrakurikulerItem {
  id: string;
  kegiatan: string;
  keterangan: string;
}

export interface Kehadiran {
  sakit: number;
  izin: number;
  tanpaKeterangan: number;
}

export interface NilaiSantri {
  id: string;
  santriId: string;
  kelas: string;
  semester: 'GANJIL' | 'GENAP';
  tahunPelajaran: string; // '2025/2026'
  akademik: Record<string, NilaiMataPelajaran>; // key is mapelId
  sikap: NilaiSikap;
  ekstrakurikuler: EkstrakurikulerItem[];
  kehadiran: Kehadiran;
  updatedAt: string;
}

export interface RaportSettings {
  namaYayasan: string;
  namaPesantren: string;
  alamatPesantren: string;
  namaKelas: string;
  semester: 'GANJIL' | 'GENAP';
  tahunPelajaran: string;
  kotaCetak: string;
  tanggalCetak: string;
  namaWaliKelas: string;
  nipWaliKelas: string;
  namaKepalaKepesantrenan: string;
  tanggalKenaikanKelulusan: string;
  tanggalKenaikan?: string;
  logoUrl: string;
  googleSheetWebAppUrl?: string;
  googleSpreadsheetId?: string;
  lastGoogleSheetSync?: string;
}

export interface PrintOptions {
  cover: boolean;
  identitas: boolean;
  akademik: boolean;
  sikap: boolean;
  ekstraAbsensi: boolean;
  legger: boolean;
}
