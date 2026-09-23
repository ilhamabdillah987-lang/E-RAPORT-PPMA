import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Santri, MataPelajaran, NilaiSantri, RaportSettings } from '../types';

// Standard thin border for every cell
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } },
};

// Colors matching screenshots
// Screenshot 89: Rich emerald green header (#00B050 / FF00B050), pure yellow data cells (#FFFF00 / FFFFFF00)
const GREEN_HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF00B050' },
};

// Screenshot 92: Sage light-green header (#A9D08E / FFA9D08E), pure yellow data cells (#FFFF00 / FFFFFF00)
const SAGE_HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFA9D08E' },
};

const YELLOW_CELL_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFFF00' },
};

/**
 * 1. EXPORT TEMPLATE DATA SANTRI (Matching Screenshot 89)
 * - Header Row: Emerald Green (#00B050) with Bold White Font
 * - Data Rows: Bright Yellow (#FFFF00) with thin black borders
 * - Columns matching exact order and labels from Screenshot 89
 */
export async function exportSantriTemplate(
  santriList: Santri[] = [],
  className: string = ''
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'E-Raport Pondok Pesantren Modern Al-Hikmah';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Data_Santri', {
    views: [{ showGridLines: true }],
  });

  // Columns from Screenshot 89
  const columnsDef = [
    { header: 'NO', key: 'no', width: 6 },
    { header: 'NAMA SANTRI', key: 'namaSantri', width: 32 },
    { header: 'NIS/NISN (UTAMA)', key: 'nisUtama', width: 20 },
    { header: 'NIS / NISN (IDENTITAS)', key: 'nisIdentitas', width: 24 },
    { header: 'Tempat, Tanggal Lahir', key: 'ttl', width: 30 },
    { header: 'Jenis Kelamin', key: 'jenisKelamin', width: 16 },
    { header: 'Agama', key: 'agama', width: 12 },
    { header: 'Status dalam Keluarga', key: 'statusKeluarga', width: 22 },
    { header: 'Anak ke-', key: 'anakKe', width: 10 },
    { header: 'Alamat Peserta Didik', key: 'alamat', width: 36 },
    { header: 'Nomor Telepon Rumah', key: 'teleponRumah', width: 22 },
    { header: 'Sekolah Asal', key: 'sekolahAsal', width: 26 },
    { header: 'Di Pesantren Diterima Pada Tanggal', key: 'diterimaTanggal', width: 26 },
    { header: 'Di Pesantren Diterima di Kelas', key: 'diterimaKelas', width: 22 },
    { header: 'Nama Ayah', key: 'namaAyah', width: 22 },
    { header: 'Nama Ibu', key: 'namaIbu', width: 22 },
    { header: 'Alamat Orang Tua', key: 'alamatOrangTua', width: 36 },
    { header: 'Nomor Telepon Orang Tua', key: 'teleponOrangTua', width: 22 },
    { header: 'Pekerjaan Ayah', key: 'pekerjaanAyah', width: 20 },
    { header: 'Pekerjaan Ibu', key: 'pekerjaanIbu', width: 20 },
    { header: 'Nama Wali', key: 'namaWali', width: 20 },
    { header: 'Alamat Wali', key: 'alamatWali', width: 30 },
    { header: 'Nomor Telepon Wali', key: 'teleponWali', width: 20 },
    { header: 'Pekerjaan Wali', key: 'pekerjaanWali', width: 20 },
    { header: 'Kelas Saat Ini', key: 'kelasSaatIni', width: 18 },
  ];

  worksheet.columns = columnsDef;

  // Format Header Row (Row 1)
  const headerRow = worksheet.getRow(1);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.fill = GREEN_HEADER_FILL;
    cell.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    cell.border = THIN_BORDER;
  });

  // Populate data rows or blank rows (at least 30 rows as shown in template)
  const rowCount = Math.max(santriList.length, 30);

  for (let i = 0; i < rowCount; i++) {
    const s = santriList[i];
    const rowNum = i + 1;

    let rowData: any;
    if (s) {
      const ttl = s.tempatLahir && s.tanggalLahir ? `${s.tempatLahir}, ${s.tanggalLahir}` : (s.tempatLahir || s.tanggalLahir || '');
      const nisIdentitas = s.nis && s.nisn ? `${s.nis} / ${s.nisn}` : (s.nis || s.nisn || '');

      rowData = {
        no: s.nomorUrutAbsen || rowNum,
        namaSantri: s.namaLengkap || '',
        nisUtama: s.nis || '',
        nisIdentitas: nisIdentitas,
        ttl: ttl,
        jenisKelamin: s.jenisKelamin || 'Laki-laki',
        agama: s.agama || 'Islam',
        statusKeluarga: s.statusKeluarga || 'Anak Kandung',
        anakKe: s.anakKe || 1,
        alamat: s.alamatSantri || '',
        teleponRumah: s.teleponRumah || '',
        sekolahAsal: s.sekolahAsal || '',
        diterimaTanggal: s.diterimaTanggal || '',
        diterimaKelas: s.diterimaKelas || s.kelasSaatIni || className,
        namaAyah: s.namaAyah || '',
        namaIbu: s.namaIbu || '',
        alamatOrangTua: s.alamatOrangTua || s.alamatSantri || '',
        teleponOrangTua: s.teleponOrangTua || s.teleponRumah || '',
        pekerjaanAyah: s.pekerjaanAyah || '',
        pekerjaanIbu: s.pekerjaanIbu || '',
        namaWali: s.namaWali || '-',
        alamatWali: s.alamatWali || '-',
        teleponWali: s.teleponWali || '-',
        pekerjaanWali: s.pekerjaanWali || '-',
        kelasSaatIni: s.kelasSaatIni || className,
      };
    } else {
      // Empty yellow template row ready for input
      rowData = {
        no: rowNum,
        namaSantri: '',
        nisUtama: '',
        nisIdentitas: '',
        ttl: '',
        jenisKelamin: '',
        agama: '',
        statusKeluarga: '',
        anakKe: '',
        alamat: '',
        teleponRumah: '',
        sekolahAsal: '',
        diterimaTanggal: '',
        diterimaKelas: className,
        namaAyah: '',
        namaIbu: '',
        alamatOrangTua: '',
        teleponOrangTua: '',
        pekerjaanAyah: '',
        pekerjaanIbu: '',
        namaWali: '',
        alamatWali: '',
        teleponWali: '',
        pekerjaanWali: '',
        kelasSaatIni: className,
      };
    }

    const addedRow = worksheet.addRow(rowData);
    addedRow.height = 22;

    addedRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.fill = YELLOW_CELL_FILL;
      cell.font = {
        name: 'Calibri',
        size: 11,
        color: { argb: 'FF000000' },
      };
      cell.border = THIN_BORDER;

      // Alignments: Center for short columns, left for names & addresses
      if (colNumber === 1 || colNumber === 3 || colNumber === 4 || colNumber === 6 || colNumber === 7 || colNumber === 9 || colNumber === 11 || colNumber === 13 || colNumber === 14 || colNumber === 18 || colNumber === 23 || colNumber === 25) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const suffix = className ? `_${className.replace(/\s+/g, '_')}` : '';
  saveAs(blob, `Template_Data_Santri${suffix}.xlsx`);
}

/**
 * 2. EXPORT TEMPLATE NILAI SANTRI (Matching Screenshot 92)
 * - Two header rows:
 *   Row 1: NO, NAMA SANTRI, NIS/NISN, then MAPEL (merged 2 cols), SIKAP, KEHADIRAN
 *   Row 2: TULIS, LISAN for each mapel
 * - Color: Sage Green (#A9D08E) with Bold Black Font
 * - Data Rows: Bright Yellow (#FFFF00) with thin black borders
 */
export async function exportNilaiTemplate(
  mapelList: MataPelajaran[],
  santriList: Santri[] = [],
  nilaiMap: Record<string, NilaiSantri> = {},
  className: string = ''
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'E-Raport Pondok Pesantren Modern Al-Hikmah';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Template_Nilai', {
    views: [{ showGridLines: true }],
  });

  // Calculate total columns
  // Col 1: NO
  // Col 2: NAMA SANTRI
  // Col 3: NIS/NISN
  // Col 4 .. (3 + mapelList.length * 2): Mata Pelajaran (TULIS & LISAN)
  // Afterwards: SIKAP SPIRITUAL, SIKAP SOSIAL, SAKIT, IZIN, TANPA KET.

  // Set column widths
  worksheet.getColumn(1).width = 6;   // NO
  worksheet.getColumn(2).width = 32;  // NAMA SANTRI
  worksheet.getColumn(3).width = 22;  // NIS/NISN

  let currentCol = 4;
  mapelList.forEach(() => {
    worksheet.getColumn(currentCol).width = 14;     // TULIS
    worksheet.getColumn(currentCol + 1).width = 14; // LISAN
    currentCol += 2;
  });

  // Sikap & Kehadiran columns
  worksheet.getColumn(currentCol).width = 26;     // SIKAP SPIRITUAL
  worksheet.getColumn(currentCol + 1).width = 26; // SIKAP SOSIAL
  worksheet.getColumn(currentCol + 2).width = 10; // SAKIT
  worksheet.getColumn(currentCol + 3).width = 10; // IZIN
  worksheet.getColumn(currentCol + 4).width = 12; // TANPA KET.
  const totalCols = currentCol + 4;

  // ROW 1 Setup
  const row1 = worksheet.getRow(1);
  row1.height = 32;

  row1.getCell(1).value = 'NO';
  row1.getCell(2).value = 'NAMA SANTRI';
  row1.getCell(3).value = 'NIS/NISN';

  // Merge NO, NAMA SANTRI, NIS/NISN vertically across Row 1 and Row 2
  worksheet.mergeCells(1, 1, 2, 1);
  worksheet.mergeCells(1, 2, 2, 2);
  worksheet.mergeCells(1, 3, 2, 3);

  // Mapel Headers on Row 1 (merged 2 columns each)
  let mapelCol = 4;
  mapelList.forEach((m) => {
    row1.getCell(mapelCol).value = m.nama.toUpperCase();
    worksheet.mergeCells(1, mapelCol, 1, mapelCol + 1);
    mapelCol += 2;
  });

  // Sikap & Kehadiran Row 1
  row1.getCell(mapelCol).value = 'SIKAP SPIRITUAL';
  worksheet.mergeCells(1, mapelCol, 2, mapelCol);

  row1.getCell(mapelCol + 1).value = 'SIKAP SOSIAL';
  worksheet.mergeCells(1, mapelCol + 1, 2, mapelCol + 1);

  row1.getCell(mapelCol + 2).value = 'KEHADIRAN';
  worksheet.mergeCells(1, mapelCol + 2, 1, mapelCol + 4);

  // ROW 2 Setup
  const row2 = worksheet.getRow(2);
  row2.height = 24;

  let subCol = 4;
  mapelList.forEach(() => {
    row2.getCell(subCol).value = 'TULIS';
    row2.getCell(subCol + 1).value = 'LISAN';
    subCol += 2;
  });

  row2.getCell(mapelCol + 2).value = 'SAKIT';
  row2.getCell(mapelCol + 3).value = 'IZIN';
  row2.getCell(mapelCol + 4).value = 'ALPHA';

  // Style Header Rows (Row 1 and Row 2) with Sage Green and Thin Borders
  for (let r = 1; r <= 2; r++) {
    const row = worksheet.getRow(r);
    for (let c = 1; c <= totalCols; c++) {
      const cell = row.getCell(c);
      cell.fill = SAGE_HEADER_FILL;
      cell.font = {
        name: 'Calibri',
        size: 10,
        bold: true,
        color: { argb: 'FF000000' },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };
      cell.border = THIN_BORDER;
    }
  }

  // Populate Data Rows starting from Row 3 (at least 30 rows as in screenshot)
  const rowCount = Math.max(santriList.length, 30);

  for (let i = 0; i < rowCount; i++) {
    const s = santriList[i];
    const currentDataRowNum = 3 + i;
    const row = worksheet.getRow(currentDataRowNum);
    row.height = 22;

    const rowNum = i + 1;
    row.getCell(1).value = s ? (s.nomorUrutAbsen || rowNum) : rowNum;
    row.getCell(2).value = s ? (s.namaLengkap || '') : '';
    row.getCell(3).value = s ? (s.nisn ? `${s.nis} / ${s.nisn}` : s.nis || '') : '';

    // Scores
    let dataCol = 4;
    const santriNilai = s ? nilaiMap[s.id] : undefined;

    mapelList.forEach((m) => {
      const academic = santriNilai?.akademik?.[m.id];
      const tulisSkor = academic?.tulis?.skor;
      const lisanSkor = academic?.lisan?.skor;

      row.getCell(dataCol).value = tulisSkor !== undefined && tulisSkor !== null ? tulisSkor : '';
      row.getCell(dataCol + 1).value = lisanSkor !== undefined && lisanSkor !== null ? lisanSkor : '';
      dataCol += 2;
    });

    // Sikap & Kehadiran
    row.getCell(dataCol).value = santriNilai?.sikap?.spiritual || '';
    row.getCell(dataCol + 1).value = santriNilai?.sikap?.sosial || '';
    row.getCell(dataCol + 2).value = santriNilai?.kehadiran?.sakit ?? '';
    row.getCell(dataCol + 3).value = santriNilai?.kehadiran?.izin ?? '';
    row.getCell(dataCol + 4).value = santriNilai?.kehadiran?.tanpaKeterangan ?? '';

    // Format all cells in row with Yellow Fill and Thin Borders
    for (let c = 1; c <= totalCols; c++) {
      const cell = row.getCell(c);
      cell.fill = YELLOW_CELL_FILL;
      cell.font = {
        name: 'Calibri',
        size: 11,
        color: { argb: 'FF000000' },
      };
      cell.border = THIN_BORDER;

      if (c === 2) {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      } else if (c === dataCol || c === dataCol + 1) {
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const suffix = className ? `_${className.replace(/\s+/g, '_')}` : '';
  saveAs(blob, `Template_Nilai_Santri${suffix}.xlsx`);
}

/**
 * 3. EXPORT REKAP LEGGER NILAI LENGKAP (.XLSX)
 * - Generates the complete Legger with Subject scores, averages, ranks, and attendance
 * - Formatted with Sage Green header and Yellow cells
 */
export async function exportLeggerXLSX(
  mapelList: MataPelajaran[],
  santriList: Santri[],
  nilaiMap: Record<string, NilaiSantri>,
  settings: RaportSettings,
  className: string = ''
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'E-Raport Pondok Pesantren Modern Al-Hikmah';

  const worksheet = workbook.addWorksheet('Legger_Nilai', {
    views: [{ showGridLines: true }],
  });

  worksheet.getColumn(1).width = 6;   // NO
  worksheet.getColumn(2).width = 32;  // NAMA SANTRI
  worksheet.getColumn(3).width = 22;  // NIS/NISN

  let currentCol = 4;
  mapelList.forEach(() => {
    worksheet.getColumn(currentCol).width = 12;     // TULIS
    worksheet.getColumn(currentCol + 1).width = 12; // LISAN
    worksheet.getColumn(currentCol + 2).width = 12; // RERATA
    currentCol += 3;
  });

  worksheet.getColumn(currentCol).width = 14;     // TOTAL NILAI
  worksheet.getColumn(currentCol + 1).width = 14; // RATA-RATA TOTAL
  worksheet.getColumn(currentCol + 2).width = 10; // SAKIT
  worksheet.getColumn(currentCol + 3).width = 10; // IZIN
  worksheet.getColumn(currentCol + 4).width = 12; // ALPHA
  const totalCols = currentCol + 4;

  // Row 1
  const row1 = worksheet.getRow(1);
  row1.height = 32;

  row1.getCell(1).value = 'NO';
  row1.getCell(2).value = 'NAMA SANTRI';
  row1.getCell(3).value = 'NIS/NISN';
  worksheet.mergeCells(1, 1, 2, 1);
  worksheet.mergeCells(1, 2, 2, 2);
  worksheet.mergeCells(1, 3, 2, 3);

  let mapelCol = 4;
  mapelList.forEach((m) => {
    row1.getCell(mapelCol).value = m.nama.toUpperCase();
    worksheet.mergeCells(1, mapelCol, 1, mapelCol + 2);
    mapelCol += 3;
  });

  row1.getCell(mapelCol).value = 'STATISTIK';
  worksheet.mergeCells(1, mapelCol, 1, mapelCol + 1);

  row1.getCell(mapelCol + 2).value = 'KEHADIRAN';
  worksheet.mergeCells(1, mapelCol + 2, 1, mapelCol + 4);

  // Row 2
  const row2 = worksheet.getRow(2);
  row2.height = 24;

  let subCol = 4;
  mapelList.forEach(() => {
    row2.getCell(subCol).value = 'TULIS';
    row2.getCell(subCol + 1).value = 'LISAN';
    row2.getCell(subCol + 2).value = 'RERATA';
    subCol += 3;
  });

  row2.getCell(mapelCol).value = 'JUMLAH';
  row2.getCell(mapelCol + 1).value = 'RATA-RATA';
  row2.getCell(mapelCol + 2).value = 'S';
  row2.getCell(mapelCol + 3).value = 'I';
  row2.getCell(mapelCol + 4).value = 'A';

  // Apply styles to headers
  for (let r = 1; r <= 2; r++) {
    const row = worksheet.getRow(r);
    for (let c = 1; c <= totalCols; c++) {
      const cell = row.getCell(c);
      cell.fill = SAGE_HEADER_FILL;
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF000000' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = THIN_BORDER;
    }
  }

  // Populate data
  santriList.forEach((s, idx) => {
    const rNum = 3 + idx;
    const row = worksheet.getRow(rNum);
    row.height = 22;

    row.getCell(1).value = s.nomorUrutAbsen || idx + 1;
    row.getCell(2).value = s.namaLengkap;
    row.getCell(3).value = s.nisn ? `${s.nis} / ${s.nisn}` : s.nis;

    const n = nilaiMap[s.id];
    let dCol = 4;
    let sumRerata = 0;
    let mapelCount = 0;

    mapelList.forEach((m) => {
      const item = n?.akademik?.[m.id];
      const tulis = item?.tulis?.skor || 0;
      const lisan = item?.lisan?.skor || 0;
      const avg = Number(((tulis + lisan) / 2).toFixed(1));

      row.getCell(dCol).value = tulis || '';
      row.getCell(dCol + 1).value = lisan || '';
      row.getCell(dCol + 2).value = avg || '';

      sumRerata += avg;
      mapelCount++;
      dCol += 3;
    });

    const finalAvg = mapelCount > 0 ? Number((sumRerata / mapelCount).toFixed(2)) : 0;
    row.getCell(dCol).value = sumRerata;
    row.getCell(dCol + 1).value = finalAvg;
    row.getCell(dCol + 2).value = n?.kehadiran?.sakit || 0;
    row.getCell(dCol + 3).value = n?.kehadiran?.izin || 0;
    row.getCell(dCol + 4).value = n?.kehadiran?.tanpaKeterangan || 0;

    for (let c = 1; c <= totalCols; c++) {
      const cell = row.getCell(c);
      cell.fill = YELLOW_CELL_FILL;
      cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF000000' } };
      cell.border = THIN_BORDER;
      cell.alignment = {
        vertical: 'middle',
        horizontal: c === 2 ? 'left' : 'center',
      };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const cName = className || settings.namaKelas;
  saveAs(blob, `Rekap_Legger_Nilai_${cName.replace(/\s+/g, '_')}.xlsx`);
}

/**
 * 4. EXPORT ALL DATA RAPORT COMPLETE WORKBOOK (2 Sheets formatted like screenshots)
 * - Sheet 1: Identitas_Santri (Green header #00B050 + Yellow cells)
 * - Sheet 2: Legger_Nilai (Sage green header #A9D08E + Yellow cells)
 */
export async function exportAllDataCustomXLSX(
  santriList: Santri[],
  mapelList: MataPelajaran[],
  nilaiMap: Record<string, NilaiSantri>,
  settings: RaportSettings
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'E-Raport Pondok Pesantren Modern Al-Hikmah';
  workbook.created = new Date();

  // === SHEET 1: DATA IDENTITAS SANTRI (Green header + Yellow cells) ===
  const ws1 = workbook.addWorksheet('Identitas_Santri', {
    views: [{ showGridLines: true }],
  });

  const columnsDef = [
    { header: 'NO', key: 'no', width: 6 },
    { header: 'NAMA SANTRI', key: 'namaSantri', width: 32 },
    { header: 'NIS/NISN (UTAMA)', key: 'nisUtama', width: 20 },
    { header: 'NIS / NISN (IDENTITAS)', key: 'nisIdentitas', width: 24 },
    { header: 'Tempat, Tanggal Lahir', key: 'ttl', width: 30 },
    { header: 'Jenis Kelamin', key: 'jenisKelamin', width: 16 },
    { header: 'Agama', key: 'agama', width: 12 },
    { header: 'Status dalam Keluarga', key: 'statusKeluarga', width: 22 },
    { header: 'Anak ke-', key: 'anakKe', width: 10 },
    { header: 'Alamat Peserta Didik', key: 'alamat', width: 36 },
    { header: 'Nomor Telepon Rumah', key: 'teleponRumah', width: 22 },
    { header: 'Sekolah Asal', key: 'sekolahAsal', width: 26 },
    { header: 'Di Pesantren Diterima Pada Tanggal', key: 'diterimaTanggal', width: 26 },
    { header: 'Di Pesantren Diterima di Kelas', key: 'diterimaKelas', width: 22 },
    { header: 'Nama Ayah', key: 'namaAyah', width: 22 },
    { header: 'Nama Ibu', key: 'namaIbu', width: 22 },
    { header: 'Alamat Orang Tua', key: 'alamatOrangTua', width: 36 },
    { header: 'Nomor Telepon Orang Tua', key: 'teleponOrangTua', width: 22 },
    { header: 'Pekerjaan Ayah', key: 'pekerjaanAyah', width: 20 },
    { header: 'Pekerjaan Ibu', key: 'pekerjaanIbu', width: 20 },
    { header: 'Nama Wali', key: 'namaWali', width: 20 },
    { header: 'Alamat Wali', key: 'alamatWali', width: 30 },
    { header: 'Nomor Telepon Wali', key: 'teleponWali', width: 20 },
    { header: 'Pekerjaan Wali', key: 'pekerjaanWali', width: 20 },
    { header: 'Kelas Saat Ini', key: 'kelasSaatIni', width: 18 },
  ];

  ws1.columns = columnsDef;

  const hRow1 = ws1.getRow(1);
  hRow1.height = 30;
  hRow1.eachCell((cell) => {
    cell.fill = GREEN_HEADER_FILL;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = THIN_BORDER;
  });

  santriList.forEach((s, idx) => {
    const ttl = s.tempatLahir && s.tanggalLahir ? `${s.tempatLahir}, ${s.tanggalLahir}` : (s.tempatLahir || s.tanggalLahir || '');
    const nisIdentitas = s.nis && s.nisn ? `${s.nis} / ${s.nisn}` : (s.nis || s.nisn || '');

    const added = ws1.addRow({
      no: s.nomorUrutAbsen || idx + 1,
      namaSantri: s.namaLengkap || '',
      nisUtama: s.nis || '',
      nisIdentitas: nisIdentitas,
      ttl: ttl,
      jenisKelamin: s.jenisKelamin || 'Laki-laki',
      agama: s.agama || 'Islam',
      statusKeluarga: s.statusKeluarga || 'Anak Kandung',
      anakKe: s.anakKe || 1,
      alamat: s.alamatSantri || '',
      teleponRumah: s.teleponRumah || '',
      sekolahAsal: s.sekolahAsal || '',
      diterimaTanggal: s.diterimaTanggal || '',
      diterimaKelas: s.diterimaKelas || s.kelasSaatIni || settings.namaKelas,
      namaAyah: s.namaAyah || '',
      namaIbu: s.namaIbu || '',
      alamatOrangTua: s.alamatOrangTua || s.alamatSantri || '',
      teleponOrangTua: s.teleponOrangTua || s.teleponRumah || '',
      pekerjaanAyah: s.pekerjaanAyah || '',
      pekerjaanIbu: s.pekerjaanIbu || '',
      namaWali: s.namaWali || '-',
      alamatWali: s.alamatWali || '-',
      teleponWali: s.teleponWali || '-',
      pekerjaanWali: s.pekerjaanWali || '-',
      kelasSaatIni: s.kelasSaatIni || settings.namaKelas,
    });
    added.height = 22;

    added.eachCell({ includeEmpty: true }, (cell, cNum) => {
      cell.fill = YELLOW_CELL_FILL;
      cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF000000' } };
      cell.border = THIN_BORDER;
      if (cNum === 1 || cNum === 3 || cNum === 4 || cNum === 6 || cNum === 7 || cNum === 9 || cNum === 11 || cNum === 13 || cNum === 14 || cNum === 18 || cNum === 23 || cNum === 25) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
    });
  });

  // === SHEET 2: LEGGER NILAI SANTRI (Sage green header + Yellow cells) ===
  const ws2 = workbook.addWorksheet('Legger_Nilai', {
    views: [{ showGridLines: true }],
  });

  ws2.getColumn(1).width = 6;
  ws2.getColumn(2).width = 32;
  ws2.getColumn(3).width = 22;

  let colIdx = 4;
  mapelList.forEach(() => {
    ws2.getColumn(colIdx).width = 12;
    ws2.getColumn(colIdx + 1).width = 12;
    ws2.getColumn(colIdx + 2).width = 12;
    colIdx += 3;
  });

  ws2.getColumn(colIdx).width = 14;     // JUMLAH
  ws2.getColumn(colIdx + 1).width = 14; // RERATA TOTAL
  ws2.getColumn(colIdx + 2).width = 10; // SAKIT
  ws2.getColumn(colIdx + 3).width = 10; // IZIN
  ws2.getColumn(colIdx + 4).width = 12; // ALPHA
  const totalSheet2Cols = colIdx + 4;

  const r1 = ws2.getRow(1);
  r1.height = 32;
  r1.getCell(1).value = 'NO';
  r1.getCell(2).value = 'NAMA SANTRI';
  r1.getCell(3).value = 'NIS/NISN';
  ws2.mergeCells(1, 1, 2, 1);
  ws2.mergeCells(1, 2, 2, 2);
  ws2.mergeCells(1, 3, 2, 3);

  let mCol = 4;
  mapelList.forEach((m) => {
    r1.getCell(mCol).value = m.nama.toUpperCase();
    ws2.mergeCells(1, mCol, 1, mCol + 2);
    mCol += 3;
  });

  r1.getCell(mCol).value = 'STATISTIK';
  ws2.mergeCells(1, mCol, 1, mCol + 1);

  r1.getCell(mCol + 2).value = 'KEHADIRAN';
  ws2.mergeCells(1, mCol + 2, 1, mCol + 4);

  const r2 = ws2.getRow(2);
  r2.height = 24;
  let sCol = 4;
  mapelList.forEach(() => {
    r2.getCell(sCol).value = 'TULIS';
    r2.getCell(sCol + 1).value = 'LISAN';
    r2.getCell(sCol + 2).value = 'RERATA';
    sCol += 3;
  });

  r2.getCell(mCol).value = 'JUMLAH';
  r2.getCell(mCol + 1).value = 'RATA-RATA';
  r2.getCell(mCol + 2).value = 'S';
  r2.getCell(mCol + 3).value = 'I';
  r2.getCell(mCol + 4).value = 'A';

  for (let r = 1; r <= 2; r++) {
    const row = ws2.getRow(r);
    for (let c = 1; c <= totalSheet2Cols; c++) {
      const cell = row.getCell(c);
      cell.fill = SAGE_HEADER_FILL;
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF000000' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = THIN_BORDER;
    }
  }

  santriList.forEach((s, idx) => {
    const rNum = 3 + idx;
    const row = ws2.getRow(rNum);
    row.height = 22;

    row.getCell(1).value = s.nomorUrutAbsen || idx + 1;
    row.getCell(2).value = s.namaLengkap;
    row.getCell(3).value = s.nisn ? `${s.nis} / ${s.nisn}` : s.nis;

    const n = nilaiMap[s.id];
    let dCol = 4;
    let sumRerata = 0;
    let mapelCount = 0;

    mapelList.forEach((m) => {
      const item = n?.akademik?.[m.id];
      const tulis = item?.tulis?.skor || 0;
      const lisan = item?.lisan?.skor || 0;
      const avg = Number(((tulis + lisan) / 2).toFixed(1));

      row.getCell(dCol).value = tulis || '';
      row.getCell(dCol + 1).value = lisan || '';
      row.getCell(dCol + 2).value = avg || '';

      sumRerata += avg;
      mapelCount++;
      dCol += 3;
    });

    const finalAvg = mapelCount > 0 ? Number((sumRerata / mapelCount).toFixed(2)) : 0;
    row.getCell(dCol).value = sumRerata;
    row.getCell(dCol + 1).value = finalAvg;
    row.getCell(dCol + 2).value = n?.kehadiran?.sakit || 0;
    row.getCell(dCol + 3).value = n?.kehadiran?.izin || 0;
    row.getCell(dCol + 4).value = n?.kehadiran?.tanpaKeterangan || 0;

    for (let c = 1; c <= totalSheet2Cols; c++) {
      const cell = row.getCell(c);
      cell.fill = YELLOW_CELL_FILL;
      cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF000000' } };
      cell.border = THIN_BORDER;
      cell.alignment = {
        vertical: 'middle',
        horizontal: c === 2 ? 'left' : 'center',
      };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, `Raport_Lengkap_Al_Hikmah_${new Date().toISOString().split('T')[0]}.xlsx`);
}
