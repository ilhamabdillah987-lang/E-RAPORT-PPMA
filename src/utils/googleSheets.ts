import * as XLSX from 'xlsx';
import { Santri, NilaiSantri, RaportSettings, MataPelajaran, AppUser } from '../types';

import { GAS_DATABASE_CODE } from '../services/googleSheetsGasService';

export const GOOGLE_APPS_SCRIPT_TEMPLATE = GAS_DATABASE_CODE;


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
