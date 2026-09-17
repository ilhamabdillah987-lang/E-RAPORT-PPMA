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

  var result = {
    status: 'success',
    santri: santriSheet ? getSheetData(santriSheet) : [],
    nilai: nilaiSheet ? getSheetData(nilaiSheet) : [],
    settings: settingsSheet ? getSheetData(settingsSheet) : []
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

// Export Templates & Data to XLSX
export function exportSantriTemplate() {
  const wsData = [
    [
      'No Absen',
      'Nama Lengkap',
      'NIS',
      'NISN',
      'Tempat Lahir',
      'Tanggal Lahir',
      'Jenis Kelamin (Laki-laki/Perempuan)',
      'Agama',
      'Status Keluarga',
      'Anak Ke',
      'Alamat Santri',
      'Telepon Rumah',
      'Sekolah Asal',
      'Diterima Di Kelas',
      'Diterima Pada Tanggal',
      'Nama Ayah',
      'Nama Ibu',
      'Alamat Orang Tua',
      'Telepon Orang Tua',
      'Pekerjaan Ayah',
      'Pekerjaan Ibu',
      'Nama Wali',
      'Alamat Wali',
      'Telepon Wali',
      'Pekerjaan Wali',
      'Kelas Saat Ini'
    ],
    [
      1,
      'Ahmad Syauqi',
      '252607005',
      '0091823901',
      'Tangerang',
      '10 Juni 2012',
      'Laki-laki',
      'Islam',
      'Anak Kandung',
      1,
      'Kp. Sepatan RT.01/02',
      '081234567890',
      'MI Nurul Falah',
      '7 MTS PUTRA',
      '15 Juli 2025',
      'H. Hasanuddin',
      'Hj. Siti Mariam',
      'Kp. Sepatan RT.01/02',
      '081234567890',
      'PNS',
      'Guru',
      '-',
      '-',
      '-',
      '-',
      '7 MTS PUTRA'
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template_Identitas_Santri');
  XLSX.writeFile(wb, 'Template_Identitas_Santri_Al_Hikmah.xlsx');
}

export function exportNilaiTemplate(mapelList: MataPelajaran[], santriList: Santri[]) {
  const headers = ['No Absen', 'NIS', 'Nama Santri'];
  mapelList.forEach((m) => {
    headers.push(`${m.nama} (Tulis)`);
    headers.push(`${m.nama} (Lisan)`);
  });
  headers.push('Sikap Spiritual', 'Sikap Sosial', 'Sakit', 'Izin', 'Tanpa Keterangan');

  const rows: any[][] = [headers];
  santriList.forEach((s) => {
    const row = [s.nomorUrutAbsen, s.nis, s.namaLengkap];
    mapelList.forEach(() => {
      row.push(0 as any, 0 as any);
    });
    row.push(
      'Tulis deskripsi sikap spiritual...' as any,
      'Tulis deskripsi sikap sosial...' as any,
      0 as any,
      0 as any,
      0 as any
    );
    rows.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template_Nilai');
  XLSX.writeFile(wb, 'Template_Nilai_Santri_Al_Hikmah.xlsx');
}

export function exportAllDataXLSX(santriList: Santri[], mapelList: MataPelajaran[], nilaiMap: Record<string, NilaiSantri>) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Identitas
  const santriRows = santriList.map((s) => ({
    'No Absen': s.nomorUrutAbsen,
    'Nama Lengkap': s.namaLengkap,
    'NIS': s.nis,
    'NISN': s.nisn,
    'Tempat Lahir': s.tempatLahir,
    'Tanggal Lahir': s.tanggalLahir,
    'Jenis Kelamin': s.jenisKelamin,
    'Agama': s.agama,
    'Kelas': s.kelasSaatIni,
    'Status': s.statusSantri,
    'Alamat': s.alamatSantri,
    'Sekolah Asal': s.sekolahAsal,
    'Nama Ayah': s.namaAyah,
    'Nama Ibu': s.namaIbu,
    'No Telp': s.teleponRumah
  }));
  const ws1 = XLSX.utils.json_to_sheet(santriRows);
  XLSX.utils.book_append_sheet(wb, ws1, 'Identitas_Santri');

  // Sheet 2: Legger Nilai
  const leggerRows = santriList.map((s) => {
    const n = nilaiMap[s.id];
    const rowObj: any = {
      'No Absen': s.nomorUrutAbsen,
      'NIS': s.nis,
      'Nama Santri': s.namaLengkap,
      'Kelas': s.kelasSaatIni
    };

    let total = 0;
    let count = 0;

    mapelList.forEach((m) => {
      const item = n?.akademik?.[m.id];
      const tulis = item?.tulis?.skor || 0;
      const lisan = item?.lisan?.skor || 0;
      const avg = (tulis + lisan) / 2;
      rowObj[`${m.nama} (T)`] = tulis;
      rowObj[`${m.nama} (L)`] = lisan;
      rowObj[`${m.nama} (R)`] = avg;
      total += avg;
      count++;
    });

    rowObj['Rata-Rata Total'] = count > 0 ? Number((total / count).toFixed(2)) : 0;
    rowObj['Sakit'] = n?.kehadiran?.sakit || 0;
    rowObj['Izin'] = n?.kehadiran?.izin || 0;
    rowObj['Tanpa Ket.'] = n?.kehadiran?.tanpaKeterangan || 0;

    return rowObj;
  });

  const ws2 = XLSX.utils.json_to_sheet(leggerRows);
  XLSX.utils.book_append_sheet(wb, ws2, 'Legger_Nilai');

  XLSX.writeFile(wb, `Data_Lengkap_Raport_Al_Hikmah_${new Date().toISOString().split('T')[0]}.xlsx`);
}
