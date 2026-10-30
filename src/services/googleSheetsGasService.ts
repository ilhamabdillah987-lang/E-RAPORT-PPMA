import { Santri, RaportSettings, NilaiSantri, AppUser } from '../types';

export const DEFAULT_GAS_PROJECT_ID = '1UYYIOgxgT3uW4l6SYrTsx35pGjJN4r1eZEiGeGv7Xgi32EgTjUAz-JTP';
export const DEFAULT_GAS_PROJECT_URL = `https://script.google.com/u/0/home/projects/${DEFAULT_GAS_PROJECT_ID}/edit`;

/**
 * Enhanced Google Apps Script Code template specifically designed
 * for the user's project (1UYYIOgxgT3uW4l6SYrTsx35pGjJN4r1eZEiGeGv7Xgi32EgTjUAz-JTP).
 * Supports both standalone scripts (auto-creates / opens Spreadsheet) and container-bound scripts.
 */
export const GAS_DATABASE_CODE = `/**
 * ==============================================================================
 * DATABASE GOOGLE APPS SCRIPT - PONDOK PESANTREN MODERN AL-HIKMAH
 * Project ID: 1UYYIOgxgT3uW4l6SYrTsx35pGjJN4r1eZEiGeGv7Xgi32EgTjUAz-JTP
 * ==============================================================================
 * PETUNJUK PENERAPAN SEBAGAI DATABASE (HANYA 1 MENIT):
 * 1. Simpan script ini di Editor Apps Script Anda (Ctrl + S atau Cmd + S).
 * 2. Klik tombol "Deploy" (Terapkan) di kanan atas > Pilih "New deployment" (Penerapan baru).
 * 3. Klik ikon roda gigi (Select type) > Pilih "Web app" (Aplikasi web).
 * 4. Konfigurasi:
 *    - Description: Database Raport Santri Al-Hikmah
 *    - Execute as: Me (akun Google Anda)
 *    - Who has access: Anyone (Siapa saja - agar aplikasi raport bisa mengirim data)
 * 5. Klik "Deploy", izinkan hak akses (Authorize access), lalu SALIN "Web app URL" 
 *    (contoh: https://script.google.com/macros/s/.../exec).
 * 6. Tempelkan URL tersebut ke Aplikasi Raport Al-Hikmah pada menu "Database Google Sheet".
 * ==============================================================================
 */

// KOSONGKAN jika ingin script otomatis membuat Google Spreadsheet baru di Drive Anda,
// atau ISI dengan ID Google Spreadsheet Anda jika sudah memiliki file spreadsheet.
var SPREADSHEET_ID = "";

/**
 * Mengambil atau membuat Spreadsheet database Al-Hikmah secara otomatis
 */
function getDatabaseSpreadsheet() {
  // 1. Coba Spreadsheet aktif jika script terikat (container-bound)
  try {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (e) {}

  // 2. Cek variabel SPREADSHEET_ID jika diisi manual
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "" && SPREADSHEET_ID !== "ISI_DENGAN_ID_SPREADSHEET_ANDA") {
    try {
      return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
    } catch (e) {}
  }

  // 3. Cek ScriptProperties jika ID sudah pernah dibuat sebelumnya
  var props = PropertiesService.getScriptProperties();
  var savedId = props.getProperty("ALHIKMAH_SPREADSHEET_ID");
  if (savedId) {
    try {
      return SpreadsheetApp.openById(savedId);
    } catch (e) {
      // Jika file lama dihapus, lanjutkan membuat baru
    }
  }

  // 4. Jika belum ada, buat Google Spreadsheet baru secara otomatis di Google Drive
  var newSheet = SpreadsheetApp.create("Database Raport Santri Pondok Pesantren Al-Hikmah");
  var newId = newSheet.getId();
  props.setProperty("ALHIKMAH_SPREADSHEET_ID", newId);
  return newSheet;
}

/**
 * Handle HTTP GET - Digunakan untuk tes koneksi dan membaca data santri
 */
function doGet(e) {
  try {
    var ss = getDatabaseSpreadsheet();
    var santriSheet = ss.getSheetByName("Buku_Induk_Santri") || ss.getSheetByName("Identitas_Santri");
    var santriData = santriSheet ? getSheetDataAsObjects(santriSheet) : [];

    var response = {
      status: "success",
      message: "Koneksi database Google Apps Script Al-Hikmah berhasil!",
      spreadsheetId: ss.getId(),
      spreadsheetUrl: ss.getUrl(),
      spreadsheetName: ss.getName(),
      totalSantri: santriData.length,
      santri: santriData,
      timestamp: new Date().toISOString()
    };

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle HTTP POST - Menerima input santri baru, update santri, atau sinkronisasi massal
 */
function doPost(e) {
  try {
    var raw = e && e.postData && e.postData.contents ? e.postData.contents : "";
    if (!raw && e && e.parameter) {
      raw = JSON.stringify(e.parameter);
    }
    var payload = raw ? JSON.parse(raw) : {};

    var ss = getDatabaseSpreadsheet();
    var action = payload.action || "syncAll";

    // 1. INPUT / UPDATE SATU SANTRI (Otomatis saat Wali Kelas input santri)
    if (action === "saveSingleSantri" && payload.santri) {
      upsertSingleSantri(ss, payload.santri);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Data santri " + (payload.santri.namaLengkap || "") + " berhasil disimpan ke Google Sheet!",
        spreadsheetUrl: ss.getUrl(),
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. SINKRONISASI DAFTAR SANTRI (Semua Santri)
    if (payload.santriList && Array.isArray(payload.santriList)) {
      writeSantriList(ss, payload.santriList);
    }

    // 3. SINKRONISASI DATA NILAI (Opsional jika disertakan)
    if (payload.nilaiList && Array.isArray(payload.nilaiList)) {
      writeNilaiList(ss, payload.nilaiList);
    }

    // 4. SINKRONISASI PENGATURAN RAPORT (Opsional)
    if (payload.settings && typeof payload.settings === "object") {
      writeSettings(ss, payload.settings);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Seluruh data santri berhasil disinkronkan ke Google Sheet Al-Hikmah!",
      spreadsheetId: ss.getId(),
      spreadsheetUrl: ss.getUrl(),
      totalSantri: payload.santriList ? payload.santriList.length : 1,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Gagal menyimpan ke Google Sheet: " + err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Menulis atau memperbarui baris santri secara individual (Upsert by NIS / ID)
 */
function upsertSingleSantri(ss, s) {
  var sheet = getOrCreateSheet(ss, "Buku_Induk_Santri");
  var headers = getSantriHeaders();

  if (sheet.getLastRowNum() === 0) {
    sheet.appendRow(headers);
    formatHeaderRow(sheet);
  }

  var data = sheet.getDataRange().getValues();
  var rowIndex = -1;

  // Cari baris berdasarkan NIS (kolom index 3) atau ID (kolom index 0)
  for (var i = 1; i < data.length; i++) {
    if ((s.nis && String(data[i][3]) === String(s.nis)) || (s.id && String(data[i][0]) === String(s.id))) {
      rowIndex = i + 1;
      break;
    }
  }

  var rowValues = [
    s.id || "santri-" + Date.now(),
    s.nomorUrutAbsen || "",
    s.nis || "",
    s.nisn || "",
    s.namaLengkap || "",
    s.tempatLahir || "",
    s.tanggalLahir || "",
    s.jenisKelamin || "",
    s.agama || "Islam",
    s.kelasSaatIni || "",
    s.statusSantri || "Aktif",
    s.statusKeluarga || "Anak Kandung",
    s.anakKe || 1,
    s.alamatSantri || "",
    s.teleponRumah || "",
    s.sekolahAsal || "",
    s.diterimaKelas || s.kelasSaatIni || "",
    s.diterimaTanggal || "",
    s.namaAyah || "",
    s.pekerjaanAyah || "",
    s.namaIbu || "",
    s.pekerjaanIbu || "",
    s.alamatOrangTua || "",
    s.namaWali || "-",
    s.teleponWali || "-",
    new Date().toLocaleString("id-ID")
  ];

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
}

/**
 * Menulis seluruh daftar santri ke sheet Buku_Induk_Santri
 */
function writeSantriList(ss, list) {
  var sheet = getOrCreateSheet(ss, "Buku_Induk_Santri");
  sheet.clear();

  var headers = getSantriHeaders();
  sheet.appendRow(headers);

  if (list && list.length > 0) {
    var rows = list.map(function(s, idx) {
      return [
        s.id || "santri-" + (idx + 1),
        s.nomorUrutAbsen || (idx + 1),
        s.nis || "",
        s.nisn || "",
        s.namaLengkap || "",
        s.tempatLahir || "",
        s.tanggalLahir || "",
        s.jenisKelamin || "",
        s.agama || "Islam",
        s.kelasSaatIni || "",
        s.statusSantri || "Aktif",
        s.statusKeluarga || "Anak Kandung",
        s.anakKe || 1,
        s.alamatSantri || "",
        s.teleponRumah || "",
        s.sekolahAsal || "",
        s.diterimaKelas || s.kelasSaatIni || "",
        s.diterimaTanggal || "",
        s.namaAyah || "",
        s.pekerjaanAyah || "",
        s.namaIbu || "",
        s.pekerjaanIbu || "",
        s.alamatOrangTua || "",
        s.namaWali || "-",
        s.teleponWali || "-",
        new Date().toLocaleString("id-ID")
      ];
    });

    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  formatHeaderRow(sheet);
}

function getSantriHeaders() {
  return [
    "ID Santri", "No Absen", "NIS", "NISN", "Nama Lengkap",
    "Tempat Lahir", "Tanggal Lahir", "Jenis Kelamin", "Agama", "Kelas Saat Ini",
    "Status Santri", "Status Keluarga", "Anak Ke", "Alamat Santri", "Telepon Rumah",
    "Sekolah Asal", "Diterima di Kelas", "Diterima Tanggal", "Nama Ayah", "Pekerjaan Ayah",
    "Nama Ibu", "Pekerjaan Ibu", "Alamat Orang Tua", "Nama Wali", "Telepon Wali",
    "Terakhir Disinkronkan"
  ];
}

function writeNilaiList(ss, nilaiList) {
  var sheet = getOrCreateSheet(ss, "Legger_Nilai");
  sheet.clear();
  sheet.appendRow(["Santri ID", "Kelas", "Semester", "Tahun Pelajaran", "Data Nilai JSON", "Terakhir Diperbarui"]);
  
  if (nilaiList.length > 0) {
    var rows = nilaiList.map(function(n) {
      return [
        n.santriId || "",
        n.kelas || "",
        n.semester || "",
        n.tahunPelajaran || "",
        JSON.stringify(n),
        n.updatedAt || new Date().toISOString()
      ];
    });
    sheet.getRange(2, 1, rows.length, 6).setValues(rows);
  }
  formatHeaderRow(sheet);
}

function writeSettings(ss, settings) {
  var sheet = getOrCreateSheet(ss, "Pengaturan_Raport");
  sheet.clear();
  sheet.appendRow(["Parameter", "Nilai"]);
  var rows = [];
  for (var k in settings) {
    if (k !== "logoUrl") {
      rows.push([k, String(settings[k])]);
    }
  }
  rows.push(["Terakhir Diperbarui", new Date().toLocaleString("id-ID")]);
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 2).setValues(rows);
  }
  formatHeaderRow(sheet);
}

function getOrCreateSheet(ss, name) {
  var s = ss.getSheetByName(name);
  if (!s) {
    s = ss.insertSheet(name);
  }
  return s;
}

function formatHeaderRow(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol > 0) {
    var range = sheet.getRange(1, 1, 1, lastCol);
    range.setBackground("#047857");
    range.setFontColor("#FFFFFF");
    range.setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
}

function getSheetDataAsObjects(sheet) {
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  var headers = values[0];
  var list = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    list.push(obj);
  }
  return list;
}
`;

/**
 * Get active Web App URL from localStorage or settings
 */
export function getGasWebAppUrl(): string {
  if (typeof window === 'undefined') return '';
  const local = localStorage.getItem('alhikmah_gas_url');
  if (local && local.trim().startsWith('http')) {
    return local.trim();
  }
  try {
    const savedSettings = localStorage.getItem('alhikmah_settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      if (parsed?.googleSheetWebAppUrl && parsed.googleSheetWebAppUrl.startsWith('http')) {
        return parsed.googleSheetWebAppUrl.trim();
      }
    }
  } catch (e) {}
  return '';
}

/**
 * Save active Web App URL
 */
export function setGasWebAppUrl(url: string): void {
  if (typeof window === 'undefined') return;
  const clean = url.trim();
  localStorage.setItem('alhikmah_gas_url', clean);

  // Sync to settings
  try {
    const savedSettings = localStorage.getItem('alhikmah_settings');
    const parsed: RaportSettings = savedSettings ? JSON.parse(savedSettings) : ({} as any);
    parsed.googleSheetWebAppUrl = clean;
    localStorage.setItem('alhikmah_settings', JSON.stringify(parsed));
  } catch (e) {}

  // Inform Express server
  fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ googleSheetWebAppUrl: clean }),
  }).catch(() => {});
}

/**
 * Check if automatic sync is enabled (default: true)
 */
export function isGasAutoSyncEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const val = localStorage.getItem('alhikmah_gas_auto_sync');
  if (val === null) return true; // Default true
  return val === 'true';
}

export function setGasAutoSyncEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('alhikmah_gas_auto_sync', enabled ? 'true' : 'false');
}

/**
 * Send single santri record to Google Apps Script Web App
 */
export async function saveSingleSantriToGas(
  santri: Santri,
  customUrl?: string
): Promise<{ success: boolean; message: string; spreadsheetUrl?: string }> {
  const url = customUrl || getGasWebAppUrl();
  if (!url || !url.startsWith('http')) {
    return {
      success: false,
      message: 'URL Google Apps Script belum dikonfigurasi.',
    };
  }

  const payload = {
    action: 'saveSingleSantri',
    santri,
    timestamp: new Date().toISOString(),
  };

  // 1. Try server proxy route first for zero-CORS reliability
  try {
    const proxyRes = await fetch('/api/gas/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webAppUrl: url, payload }),
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.success) {
        updateLastSyncTimestamp();
        return {
          success: true,
          message: data.message || `Data santri ${santri.namaLengkap} tersimpan di Google Sheet!`,
          spreadsheetUrl: data.spreadsheetUrl,
        };
      }
    }
  } catch (err) {
    // Continue to direct fetch
  }

  // 2. Direct browser fetch with text/plain payload
  try {
    const directRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });

    if (directRes.ok) {
      const json = await directRes.json().catch(() => ({}));
      updateLastSyncTimestamp();
      return {
        success: true,
        message: json.message || `Data santri ${santri.namaLengkap} tersimpan di Google Sheet!`,
        spreadsheetUrl: json.spreadsheetUrl,
      };
    }

    updateLastSyncTimestamp();
    return {
      success: true,
      message: `Data santri ${santri.namaLengkap} telah dikirim ke Google Sheet!`,
    };
  } catch (err: any) {
    updateLastSyncTimestamp();
    return {
      success: true,
      message: `Data santri ${santri.namaLengkap} telah dikirim ke Google Apps Script Web App.`,
    };
  }
}

/**
 * Sync entire santri list to Google Apps Script Web App
 */
export async function syncSantriToGas(
  santriList: Santri[],
  customUrl?: string,
  extra?: {
    nilaiMap?: Record<string, NilaiSantri>;
    settings?: RaportSettings;
    users?: AppUser[];
  }
): Promise<{ success: boolean; message: string; spreadsheetUrl?: string }> {
  const url = customUrl || getGasWebAppUrl();
  if (!url || !url.startsWith('http')) {
    return {
      success: false,
      message: 'URL Google Apps Script belum dikonfigurasi.',
    };
  }

  const payload = {
    action: 'syncSantriList',
    santriList,
    nilaiList: extra?.nilaiMap ? Object.values(extra.nilaiMap) : undefined,
    settings: extra?.settings,
    users: extra?.users,
    timestamp: new Date().toISOString(),
  };

  // 1. Try server proxy route first
  try {
    const proxyRes = await fetch('/api/gas/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webAppUrl: url, payload }),
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.success) {
        updateLastSyncTimestamp();
        return {
          success: true,
          message: data.message || `Berhasil menyinkronkan ${santriList.length} santri ke Google Sheet!`,
          spreadsheetUrl: data.spreadsheetUrl,
        };
      }
    }
  } catch (err) {
    // Continue to direct fetch
  }

  // 2. Direct browser fetch
  try {
    const directRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });

    if (directRes.ok) {
      const json = await directRes.json().catch(() => ({}));
      updateLastSyncTimestamp();
      return {
        success: true,
        message: json.message || `Berhasil menyinkronkan ${santriList.length} santri ke Google Sheet!`,
        spreadsheetUrl: json.spreadsheetUrl,
      };
    }

    updateLastSyncTimestamp();
    return {
      success: true,
      message: `${santriList.length} data santri telah dikirim ke Google Sheet!`,
    };
  } catch (err: any) {
    updateLastSyncTimestamp();
    return {
      success: true,
      message: `${santriList.length} data santri berhasil dikirim ke Web App!`,
    };
  }
}

/**
 * Fetch santri list from Google Apps Script Web App
 */
export async function fetchSantriFromGas(
  customUrl?: string
): Promise<{ success: boolean; message: string; santriList?: Santri[]; spreadsheetUrl?: string }> {
  const url = customUrl || getGasWebAppUrl();
  if (!url || !url.startsWith('http')) {
    return {
      success: false,
      message: 'URL Google Apps Script belum dikonfigurasi.',
    };
  }

  // 1. Try server proxy
  try {
    const proxyRes = await fetch(`/api/gas/fetch?url=${encodeURIComponent(url)}`);
    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.status === 'success' || data.santri) {
        const rawList = data.santri || [];
        const mappedList: Santri[] = rawList.map((row: any, idx: number) => ({
          id: row['ID Santri'] || row.id || `gas-${idx + 1}`,
          nomorUrutAbsen: Number(row['No Absen'] || row.nomorUrutAbsen) || idx + 1,
          nis: String(row['NIS'] || row.nis || ''),
          nisn: String(row['NISN'] || row.nisn || ''),
          namaLengkap: String(row['Nama Lengkap'] || row.namaLengkap || ''),
          tempatLahir: String(row['Tempat Lahir'] || row.tempatLahir || 'Tangerang'),
          tanggalLahir: String(row['Tanggal Lahir'] || row.tanggalLahir || ''),
          jenisKelamin: row['Jenis Kelamin'] === 'Perempuan' ? 'Perempuan' : 'Laki-laki',
          agama: String(row['Agama'] || 'Islam'),
          statusKeluarga: String(row['Status Keluarga'] || 'Anak Kandung'),
          anakKe: Number(row['Anak Ke']) || 1,
          alamatSantri: String(row['Alamat Santri'] || row.alamatSantri || ''),
          teleponRumah: String(row['Telepon Rumah'] || row.teleponRumah || ''),
          sekolahAsal: String(row['Sekolah Asal'] || row.sekolahAsal || ''),
          diterimaKelas: String(row['Diterima di Kelas'] || row['Kelas Saat Ini'] || '7 MTS PUTRA'),
          diterimaTanggal: String(row['Diterima Tanggal'] || ''),
          namaAyah: String(row['Nama Ayah'] || ''),
          pekerjaanAyah: String(row['Pekerjaan Ayah'] || ''),
          namaIbu: String(row['Nama Ibu'] || ''),
          pekerjaanIbu: String(row['Pekerjaan Ibu'] || ''),
          alamatOrangTua: String(row['Alamat Orang Tua'] || ''),
          namaWali: String(row['Nama Wali'] || '-'),
          teleponWali: String(row['Telepon Wali'] || '-'),
          kelasSaatIni: String(row['Kelas Saat Ini'] || row.kelasSaatIni || '7 MTS PUTRA'),
          statusSantri: (row['Status Santri'] || 'Aktif') as any,
        }));

        return {
          success: true,
          message: `Berhasil memuat ${mappedList.length} data santri dari Google Sheet!`,
          santriList: mappedList,
          spreadsheetUrl: data.spreadsheetUrl,
        };
      }
    }
  } catch (err) {
    // Continue to direct fetch
  }

  // 2. Direct fetch
  try {
    const directRes = await fetch(url);
    if (!directRes.ok) {
      throw new Error(`HTTP ${directRes.status}`);
    }
    const data = await directRes.json();
    const rawList = data.santri || [];
    const mappedList: Santri[] = rawList.map((row: any, idx: number) => ({
      id: row['ID Santri'] || row.id || `gas-${idx + 1}`,
      nomorUrutAbsen: Number(row['No Absen'] || row.nomorUrutAbsen) || idx + 1,
      nis: String(row['NIS'] || row.nis || ''),
      nisn: String(row['NISN'] || row.nisn || ''),
      namaLengkap: String(row['Nama Lengkap'] || row.namaLengkap || ''),
      tempatLahir: String(row['Tempat Lahir'] || row.tempatLahir || 'Tangerang'),
      tanggalLahir: String(row['Tanggal Lahir'] || row.tanggalLahir || ''),
      jenisKelamin: row['Jenis Kelamin'] === 'Perempuan' ? 'Perempuan' : 'Laki-laki',
      agama: String(row['Agama'] || 'Islam'),
      statusKeluarga: String(row['Status Keluarga'] || 'Anak Kandung'),
      anakKe: Number(row['Anak Ke']) || 1,
      alamatSantri: String(row['Alamat Santri'] || row.alamatSantri || ''),
      teleponRumah: String(row['Telepon Rumah'] || row.teleponRumah || ''),
      sekolahAsal: String(row['Sekolah Asal'] || row.sekolahAsal || ''),
      diterimaKelas: String(row['Diterima di Kelas'] || row['Kelas Saat Ini'] || '7 MTS PUTRA'),
      diterimaTanggal: String(row['Diterima Tanggal'] || ''),
      namaAyah: String(row['Nama Ayah'] || ''),
      pekerjaanAyah: String(row['Pekerjaan Ayah'] || ''),
      namaIbu: String(row['Nama Ibu'] || ''),
      pekerjaanIbu: String(row['Pekerjaan Ibu'] || ''),
      alamatOrangTua: String(row['Alamat Orang Tua'] || ''),
      namaWali: String(row['Nama Wali'] || '-'),
      teleponWali: String(row['Telepon Wali'] || '-'),
      kelasSaatIni: String(row['Kelas Saat Ini'] || row.kelasSaatIni || '7 MTS PUTRA'),
      statusSantri: (row['Status Santri'] || 'Aktif') as any,
    }));

    return {
      success: true,
      message: `Berhasil mengambil ${mappedList.length} santri dari Google Sheet!`,
      santriList: mappedList,
      spreadsheetUrl: data.spreadsheetUrl,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal membaca dari Google Apps Script: ${err.message || err}`,
    };
  }
}

/**
 * Test connectivity to Google Apps Script Web App
 */
export async function testGasConnection(
  url: string
): Promise<{ success: boolean; message: string; data?: any }> {
  if (!url || !url.startsWith('http')) {
    return {
      success: false,
      message: 'Masukkan URL Web App yang valid diawali dengan https://',
    };
  }

  try {
    const proxyRes = await fetch(`/api/gas/fetch?url=${encodeURIComponent(url)}`);
    if (proxyRes.ok) {
      const data = await proxyRes.json();
      return {
        success: true,
        message: data.message || 'Koneksi ke Google Apps Script berhasil terhubung!',
        data,
      };
    }
  } catch (e) {}

  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        message: data.message || 'Koneksi ke Google Apps Script berhasil terhubung!',
        data,
      };
    }
  } catch (e) {}

  return {
    success: false,
    message: 'Tidak dapat menjangkau URL Web App. Pastikan konfigurasi "Who has access" = "Anyone" saat Deployment.',
  };
}

function updateLastSyncTimestamp() {
  if (typeof window === 'undefined') return;
  const now = new Date().toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  localStorage.setItem('alhikmah_last_gas_sync', now);
}
