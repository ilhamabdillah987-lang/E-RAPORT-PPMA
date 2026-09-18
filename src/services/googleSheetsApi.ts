import { Santri, MataPelajaran, NilaiSantri, RaportSettings } from '../types';

export interface GoogleSpreadsheetItem {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

// Helper to extract spreadsheet ID from URL or raw ID
export const extractSpreadsheetId = (input: string): string => {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
};

// 1. List user's spreadsheets from Google Drive
export const listDriveSpreadsheets = async (
  accessToken: string
): Promise<GoogleSpreadsheetItem[]> => {
  const url = `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet' and trashed=false&orderBy=modifiedTime desc&pageSize=15&fields=files(id,name,modifiedTime,webViewLink)`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gagal memuat daftar Google Spreadsheet (${res.status})`);
  }

  const data = await res.json();
  return data.files || [];
};

// 2. Create a brand new Google Spreadsheet directly in user's Google Drive
export const createNewRaportSpreadsheet = async (
  accessToken: string,
  title: string,
  santriList: Santri[],
  mapelList: MataPelajaran[],
  nilaiMap: Record<string, NilaiSantri>,
  settings: RaportSettings
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> => {
  const createPayload = {
    properties: {
      title: title || `Raport Santri Al-Hikmah - ${settings.tahunPelajaran.replace('/', '-')}`,
    },
    sheets: [
      { properties: { title: 'Buku_Induk_Santri', gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: 'Legger_Nilai', gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: 'Pengaturan_Raport', gridProperties: { frozenRowCount: 1 } } },
    ],
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createPayload),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gagal membuat Google Spreadsheet baru (${createRes.status})`);
  }

  const createdData = await createRes.json();
  const spreadsheetId = createdData.spreadsheetId;
  const spreadsheetUrl =
    createdData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Now populate initial data
  await writeAllDataToSpreadsheet(
    accessToken,
    spreadsheetId,
    santriList,
    mapelList,
    nilaiMap,
    settings
  );

  return { spreadsheetId, spreadsheetUrl };
};

// 3. Write / Sync all app data into an existing Google Spreadsheet
export const writeAllDataToSpreadsheet = async (
  accessToken: string,
  spreadsheetId: string,
  santriList: Santri[],
  mapelList: MataPelajaran[],
  nilaiMap: Record<string, NilaiSantri>,
  settings: RaportSettings
): Promise<void> => {
  // First, verify/create sheets if they don't exist
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!metaRes.ok) {
    const err = await metaRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Spreadsheet tidak ditemukan atau tidak dapat diakses (${metaRes.status})`);
  }

  const metaData = await metaRes.json();
  const existingSheetTitles: string[] = (metaData.sheets || []).map(
    (s: any) => s.properties?.title
  );

  const neededSheets = ['Buku_Induk_Santri', 'Legger_Nilai', 'Pengaturan_Raport'];
  const addSheetRequests = neededSheets
    .filter((title) => !existingSheetTitles.includes(title))
    .map((title) => ({
      addSheet: { properties: { title } },
    }));

  if (addSheetRequests.length > 0) {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests: addSheetRequests }),
    });
  }

  // Prepare Santri rows
  const santriHeader = [
    'No Urut',
    'NIS',
    'NISN',
    'Nama Lengkap',
    'Nama Panggilan',
    'Tempat Lahir',
    'Tanggal Lahir',
    'Jenis Kelamin',
    'Agama',
    'Kelas',
    'Status Santri',
    'Anak Ke',
    'Alamat Santri',
    'Telepon',
    'Sekolah Asal',
    'Diterima Tanggal',
    'Nama Ayah',
    'Pekerjaan Ayah',
    'Nama Ibu',
    'Pekerjaan Ibu',
    'Alamat Ortu',
    'Nama Wali',
  ];

  const santriRows = santriList.map((s, idx) => [
    s.nomorUrutAbsen || idx + 1,
    s.nis,
    s.nisn,
    s.namaLengkap,
    s.tempatLahir,
    s.tanggalLahir,
    s.jenisKelamin,
    s.agama,
    s.kelasSaatIni,
    s.statusSantri,
    s.anakKe || 1,
    s.alamatSantri,
    s.teleponRumah || '',
    s.sekolahAsal || '',
    s.diterimaTanggal || '',
    s.namaAyah,
    s.pekerjaanAyah || '',
    s.namaIbu,
    s.pekerjaanIbu || '',
    s.alamatOrangTua || '',
    s.namaWali || '',
  ]);

  // Prepare Legger Nilai rows
  const leggerHeader: string[] = ['No Absen', 'NIS', 'Nama Santri', 'Kelas'];
  mapelList.forEach((m) => {
    leggerHeader.push(`${m.nama} (Tulis)`);
    leggerHeader.push(`${m.nama} (Lisan)`);
    leggerHeader.push(`${m.nama} (Rata-rata)`);
  });
  leggerHeader.push('Rata-Rata Akhir');
  leggerHeader.push('Sakit');
  leggerHeader.push('Izin');
  leggerHeader.push('Tanpa Keterangan');

  const leggerRows = santriList.map((s) => {
    const n = nilaiMap[s.id];
    const row: any[] = [s.nomorUrutAbsen, s.nis, s.namaLengkap, s.kelasSaatIni];

    let totalScore = 0;
    let count = 0;

    mapelList.forEach((m) => {
      const item = n?.akademik?.[m.id];
      const tulis = item?.tulis?.skor || 0;
      const lisan = item?.lisan?.skor || 0;
      const avg = Number(((tulis + lisan) / 2).toFixed(2));
      row.push(tulis, lisan, avg);
      totalScore += avg;
      count++;
    });

    const finalAvg = count > 0 ? Number((totalScore / count).toFixed(2)) : 0;
    row.push(finalAvg);
    row.push(n?.kehadiran?.sakit || 0);
    row.push(n?.kehadiran?.izin || 0);
    row.push(n?.kehadiran?.tanpaKeterangan || 0);

    return row;
  });

  // Prepare Settings rows
  const settingsRows = [
    ['Parameter', 'Nilai'],
    ['Nama Yayasan', settings.namaYayasan],
    ['Nama Pesantren', settings.namaPesantren],
    ['Alamat Pesantren', settings.alamatPesantren],
    ['Nama Kelas', settings.namaKelas],
    ['Semester', settings.semester],
    ['Tahun Pelajaran', settings.tahunPelajaran],
    ['Kota Cetak', settings.kotaCetak],
    ['Tanggal Cetak', settings.tanggalCetak],
    ['Nama Wali Kelas', settings.namaWaliKelas],
    ['NIP Wali Kelas', settings.nipWaliKelas],
    ['Kepala Kepesantrenan', settings.namaKepalaKepesantrenan],
    ['Tanggal Kenaikan/Kelulusan', settings.tanggalKenaikanKelulusan],
    ['Terakhir Diperbarui', new Date().toLocaleString('id-ID')],
  ];

  // Batch update values
  const batchData = [
    {
      range: 'Buku_Induk_Santri!A1:V' + (santriRows.length + 1),
      values: [santriHeader, ...santriRows],
    },
    {
      range: 'Legger_Nilai!A1:ZZ' + (leggerRows.length + 1),
      values: [leggerHeader, ...leggerRows],
    },
    {
      range: 'Pengaturan_Raport!A1:B' + settingsRows.length,
      values: settingsRows,
    },
  ];

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: batchData,
      }),
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gagal menyimpan data ke Google Spreadsheet (${updateRes.status})`);
  }
};

// 4. Read / Pull data from Google Spreadsheet
export const readAllDataFromSpreadsheet = async (
  accessToken: string,
  spreadsheetId: string
): Promise<{
  santriList?: Santri[];
  nilaiMap?: Record<string, NilaiSantri>;
  settings?: Partial<RaportSettings>;
}> => {
  // Fetch values from the sheets
  const ranges = ['Buku_Induk_Santri!A1:V100', 'Legger_Nilai!A1:ZZ100', 'Pengaturan_Raport!A1:B30'];
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=${ranges.map((r) => encodeURIComponent(r)).join('&ranges=')}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gagal membaca data dari Google Spreadsheet (${res.status})`);
  }

  const result = await res.json();
  const valueRanges = result.valueRanges || [];

  const santriRange = valueRanges[0]?.values || [];
  const settingsRange = valueRanges[2]?.values || [];

  const santriList: Santri[] = [];
  if (santriRange.length > 1) {
    for (let i = 1; i < santriRange.length; i++) {
      const row = santriRange[i];
      if (!row || !row[1]) continue; // requires NIS
      const statusStr = String(row[10] || 'Aktif');
      const validStatus: Santri['statusSantri'] = ['Aktif', 'Lulus', 'Tidak Naik', 'Pindah'].includes(statusStr)
        ? (statusStr as Santri['statusSantri'])
        : 'Aktif';

      santriList.push({
        id: `s_${row[1]}`,
        nomorUrutAbsen: Number(row[0]) || i,
        nis: String(row[1] || ''),
        nisn: String(row[2] || ''),
        namaLengkap: String(row[3] || ''),
        tempatLahir: String(row[4] || 'Tempat'),
        tanggalLahir: String(row[5] || '01/01/2010'),
        jenisKelamin: (row[6] === 'Perempuan' ? 'Perempuan' : 'Laki-laki'),
        agama: String(row[7] || 'Islam'),
        statusKeluarga: 'Anak Kandung',
        kelasSaatIni: String(row[8] || '7 MTS PUTRA'),
        statusSantri: validStatus,
        anakKe: Number(row[9]) || 1,
        alamatSantri: String(row[10] || ''),
        teleponRumah: String(row[11] || ''),
        sekolahAsal: String(row[12] || ''),
        diterimaKelas: String(row[8] || '7 MTS PUTRA'),
        diterimaTanggal: String(row[13] || ''),
        namaAyah: String(row[14] || ''),
        pekerjaanAyah: String(row[15] || ''),
        namaIbu: String(row[16] || ''),
        pekerjaanIbu: String(row[17] || ''),
        alamatOrangTua: String(row[18] || ''),
        teleponOrangTua: String(row[11] || ''),
        namaWali: String(row[19] || ''),
      });
    }
  }

  // Parse Settings
  const settingsPartial: Partial<RaportSettings> = {};
  if (settingsRange.length > 1) {
    settingsRange.forEach((row: any[]) => {
      const key = String(row[0] || '').trim();
      const val = String(row[1] || '').trim();
      if (key === 'Nama Yayasan') settingsPartial.namaYayasan = val;
      if (key === 'Nama Pesantren') settingsPartial.namaPesantren = val;
      if (key === 'Alamat Pesantren') settingsPartial.alamatPesantren = val;
      if (key === 'Nama Kelas') settingsPartial.namaKelas = val;
      if (key === 'Semester') settingsPartial.semester = (val === 'GENAP' ? 'GENAP' : 'GANJIL');
      if (key === 'Tahun Pelajaran') settingsPartial.tahunPelajaran = val;
      if (key === 'Kota Cetak') settingsPartial.kotaCetak = val;
      if (key === 'Tanggal Cetak') settingsPartial.tanggalCetak = val;
      if (key === 'Nama Wali Kelas') settingsPartial.namaWaliKelas = val;
      if (key === 'NIP Wali Kelas') settingsPartial.nipWaliKelas = val;
      if (key === 'Kepala Kepesantrenan') settingsPartial.namaKepalaKepesantrenan = val;
      if (key === 'Tanggal Kenaikan/Kelulusan') settingsPartial.tanggalKenaikanKelulusan = val;
    });
  }

  return {
    santriList: santriList.length > 0 ? santriList : undefined,
    settings: Object.keys(settingsPartial).length > 0 ? settingsPartial : undefined,
  };
};
