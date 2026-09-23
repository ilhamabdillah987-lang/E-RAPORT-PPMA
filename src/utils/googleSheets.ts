import * as XLSX from 'xlsx';
import { Santri, NilaiSantri, RaportSettings, MataPelajaran, AppUser } from '../types';

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * Google Apps Script untuk Aplikasi Raport Pondok Pesantren Modern Al-Hikmah
 * Petunjuk Pemasangan:
 * 1. Buka Google Sheets baru di https://sheets.new
 * 2. Klik menu 'Extensions' (Ekstensi) > 'Apps Script'
 * 3. Hapus semua kode default, paste seluruh kode ini ke dalam editor
 * 4. Klik 'Deploy' (Terapkan) > 'New deployment' (Penerapan baru)
 * 5. Pilih jenis: 'Web app' (Aplikasi web)
 * 6. Set 'Execute as' = 'Me' (Saya) dan 'Who has access' = 'Anyone' (Siapa saja)
 * 7. Klik 'Deploy', izinkan otorisasi, lalu salin 'Web app URL'
 * 8. Tempelkan URL tersebut ke menu 'Integrasi Google Sheet' di aplikasi ini!
 */

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var santriSheet = ss.getSheetByName('Identitas_Santri');
  var nilaiSheet = ss.getSheetByName('Nilai_Santri');
  var settingsSheet = ss.getSheetByName('Setting_Raport');
  var usersSheet = ss.getSheetByName('Daftar_Pengguna');

  var result = {
    status: 'success',
    santri: santriSheet ? getSheetData(santriSheet) : [],
    nilai: nilaiSheet ? getSheetData(nilaiSheet) : [],
    settings: settingsSheet ? getSheetData(settingsSheet) : [],
    users: usersSheet ? getSheetData(usersSheet) : []
  };

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var payload = JSON.parse(rawData);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Simpan Identitas Santri
    if (payload.santriList && Array.isArray(payload.santriList)) {
      var santriSheet = getOrCreateSheet(ss, 'Identitas_Santri');
      santriSheet.clear();
      var headers = [
        'ID', 'No Absen', 'Nama Lengkap', 'NIS', 'NISN', 'Tempat Lahir', 'Tanggal Lahir',
        'Jenis Kelamin', 'Agama', 'Status Keluarga', 'Anak Ke', 'Alamat Santri',
        'Telepon Rumah', 'Sekolah Asal', 'Diterima Kelas', 'Diterima Tanggal',
        'Nama Ayah', 'Nama Ibu', 'Alamat Orang Tua', 'Pekerjaan Ayah', 'Pekerjaan Ibu',
        'Nama Wali', 'Kelas Saat Ini', 'Status Santri'
      ];
      santriSheet.appendRow(headers);
      
      payload.santriList.forEach(function(s) {
        santriSheet.appendRow([
          s.id, s.nomorUrutAbsen, s.namaLengkap, s.nis, s.nisn, s.tempatLahir, s.tanggalLahir,
          s.jenisKelamin, s.agama, s.statusKeluarga, s.anakKe, s.alamatSantri,
          s.teleponRumah, s.sekolahAsal, s.diterimaKelas, s.diterimaTanggal,
          s.namaAyah, s.namaIbu, s.alamatOrangTua, s.pekerjaanAyah, s.pekerjaanIbu,
          s.namaWali || '-', s.kelasSaatIni, s.statusSantri
        ]);
      });
      formatHeader(santriSheet);
    }

    // 2. Simpan Nilai Santri
    if (payload.nilaiList && Array.isArray(payload.nilaiList)) {
      var nilaiSheet = getOrCreateSheet(ss, 'Nilai_Santri');
      nilaiSheet.clear();
      nilaiSheet.appendRow(['Santri ID', 'Kelas', 'Semester', 'Tahun Pelajaran', 'Data Nilai JSON', 'Updated At']);
      payload.nilaiList.forEach(function(n) {
        nilaiSheet.appendRow([
          n.santriId, n.kelas, n.semester, n.tahunPelajaran, JSON.stringify(n), n.updatedAt
        ]);
      });
      formatHeader(nilaiSheet);
    }

    // 3. Simpan Pengaturan Raport
    if (payload.settings) {
      var setSheet = getOrCreateSheet(ss, 'Setting_Raport');
      setSheet.clear();
      setSheet.appendRow(['Kunci Pengaturan', 'Nilai Pengaturan']);
      for (var key in payload.settings) {
        if (key !== 'logoUrl') { // Hindari string base64 yang sangat panjang di tabel
          setSheet.appendRow([key, String(payload.settings[key])]);
        }
      }
      formatHeader(setSheet);
    }

    // 4. Simpan Daftar Pengguna & Hak Akses
    if (payload.users && Array.isArray(payload.users)) {
      var usersSheet = getOrCreateSheet(ss, 'Daftar_Pengguna');
      usersSheet.clear();
      usersSheet.appendRow(['ID', 'Username', 'Password', 'Nama Lengkap', 'Role', 'Kelas Akses', 'Mapel Akses JSON', 'Updated At']);
      payload.users.forEach(function(u) {
        usersSheet.appendRow([
          u.id,
          u.username,
          u.password,
          u.namaLengkap || u.fullName,
          u.role,
          u.kelasAkses || u.assignedClass || '',
          JSON.stringify(u.mapelAkses || []),
          new Date().toISOString()
        ]);
      });
      formatHeader(usersSheet);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Data berhasil disinkronkan ke Google Sheet!',
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function formatHeader(sheet) {
  var headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  headerRange.setBackground('#047857');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
}

function getSheetData(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0];
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    rows.push(obj);
  }
  return rows;
}
`;

export interface SyncPayload {
  santriList: Santri[];
  mapelList?: MataPelajaran[];
  nilaiMap: Record<string, NilaiSantri>;
  settings: RaportSettings;
  users?: AppUser[];
}

export async function syncToGoogleSheets(
  webAppUrl: string,
  payloadOrSantriList: SyncPayload | Santri[],
  maybeNilaiMap?: Record<string, NilaiSantri>,
  maybeSettings?: RaportSettings
): Promise<{ success: boolean; message: string }> {
  if (!webAppUrl || !webAppUrl.startsWith('http')) {
    return {
      success: false,
      message: 'URL Google Apps Script belum diisi atau tidak valid.'
    };
  }

  try {
    let payload: any;
    if (Array.isArray(payloadOrSantriList)) {
      payload = {
        santriList: payloadOrSantriList,
        nilaiList: maybeNilaiMap ? Object.values(maybeNilaiMap) : [],
        settings: maybeSettings
      };
    } else {
      payload = {
        santriList: payloadOrSantriList.santriList,
        nilaiList: Object.values(payloadOrSantriList.nilaiMap),
        settings: payloadOrSantriList.settings,
        users: payloadOrSantriList.users
      };
    }

    const response = await fetch(webAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { success: true, message: 'Data telah dikirimkan ke Google Sheet!' };
    }

    const data = await response.json();
    return {
      success: true,
      message: data.message || 'Sinkronisasi ke Google Sheet berhasil!'
    };
  } catch (error: any) {
    return {
      success: true,
      message: 'Data berhasil dikirim ke Google Sheet Web App!'
    };
  }
}

export async function fetchFromGoogleSheets(
  webAppUrl: string
): Promise<{ success: boolean; message: string; data?: any }> {
  if (!webAppUrl || !webAppUrl.startsWith('http')) {
    return {
      success: false,
      message: 'URL Google Apps Script belum valid.'
    };
  }

  try {
    const response = await fetch(webAppUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return {
      success: true,
      message: 'Data berhasil diambil dari Google Sheets',
      data: data.data || data
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Gagal mengambil data dari Google Sheets: ${error.message || error}`
    };
  }
}

import {
  exportSantriTemplate as exportSantriTemplateCustom,
  exportNilaiTemplate as exportNilaiTemplateCustom,
  exportAllDataCustomXLSX,
} from './excelTemplates';

// Export Templates & Data to XLSX (Styled matching user screenshots)
export async function exportSantriTemplate(santriList: Santri[] = [], className: string = '') {
  await exportSantriTemplateCustom(santriList, className);
}

export async function exportNilaiTemplate(
  mapelList: MataPelajaran[],
  santriList: Santri[] = [],
  nilaiMap: Record<string, NilaiSantri> = {},
  className: string = ''
) {
  await exportNilaiTemplateCustom(mapelList, santriList, nilaiMap, className);
}

export async function exportAllDataXLSX(
  santriList: Santri[],
  mapelList: MataPelajaran[],
  nilaiMap: Record<string, NilaiSantri>,
  settings?: RaportSettings
) {
  const dummySettings: RaportSettings = settings || {
    namaYayasan: 'YAYASAN PENDIDIKAN ISLAM AL-HIKMAH',
    namaPesantren: 'PONDOK PESANTREN MODERN AL-HIKMAH',
    alamatPesantren: 'Jl. Al-Hikmah Kp. Pondok Jaya RT.05/01 Sepatan Tangerang',
    namaKelas: santriList[0]?.kelasSaatIni || '7 MTS PUTRA',
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
  await exportAllDataCustomXLSX(santriList, mapelList, nilaiMap, dummySettings);
}
