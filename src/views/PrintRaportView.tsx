import React, { useState } from 'react';
import { Santri, RaportSettings, MataPelajaran, NilaiSantri, PrintOptions } from '../types';
import { RaportCover } from '../components/raport/RaportCover';
import { RaportIdentitas } from '../components/raport/RaportIdentitas';
import { RaportAkademik } from '../components/raport/RaportAkademik';
import { RaportSikap } from '../components/raport/RaportSikap';
import { RaportEkstraAbsensi } from '../components/raport/RaportEkstraAbsensi';
import { RaportLegger } from '../components/raport/RaportLegger';
import { Printer, CheckSquare, Square, ZoomIn, ZoomOut, FileText, Check, AlertCircle } from 'lucide-react';

interface PrintRaportViewProps {
  santriList: Santri[];
  settings: RaportSettings;
  mapelList: MataPelajaran[];
  nilaiMap: Record<string, NilaiSantri>;
}

export const PrintRaportView: React.FC<PrintRaportViewProps> = ({
  santriList,
  settings,
  mapelList,
  nilaiMap,
}) => {
  const [selectedTarget, setSelectedTarget] = useState<'single' | 'all'>('single');
  const [selectedSantriId, setSelectedSantriId] = useState<string>(santriList[0]?.id || '');
  const [zoomScale, setZoomScale] = useState<number>(0.85);

  const [printOptions, setPrintOptions] = useState<PrintOptions>({
    cover: true,
    identitas: true,
    akademik: true,
    sikap: true,
    ekstraAbsensi: true,
    legger: false,
  });

  const toggleOption = (key: keyof PrintOptions) => {
    setPrintOptions((prev: PrintOptions) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAll = () => {
    setPrintOptions({
      cover: true,
      identitas: true,
      akademik: true,
      sikap: true,
      ekstraAbsensi: true,
      legger: true,
    });
  };

  const selectNilaiOnly = () => {
    setPrintOptions({
      cover: false,
      identitas: false,
      akademik: true,
      sikap: true,
      ekstraAbsensi: true,
      legger: false,
    });
  };

  const selectLeggerOnly = () => {
    setPrintOptions({
      cover: false,
      identitas: false,
      akademik: false,
      sikap: false,
      ekstraAbsensi: false,
      legger: true,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const targetSantriList =
    selectedTarget === 'all'
      ? santriList
      : santriList.filter((s) => s.id === selectedSantriId);

  return (
    <div className="space-y-6">
      {/* Control Panel (Hidden when printing) */}
      <div className="no-print bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-black text-slate-900 uppercase">
              Cetak Lembar Raport Santri
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Pilih lembar yang ingin dicetak sesuai kebutuhan, lalu klik tombol Cetak
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Zoom Controls for UI Preview */}
            <div className="hidden sm:flex items-center bg-slate-100 rounded-xl p-1 text-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setZoomScale((z) => Math.max(0.5, z - 0.1))}
                className="p-1.5 hover:bg-white rounded-lg cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-2">{Math.round(zoomScale * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoomScale((z) => Math.min(1.1, z + 0.1))}
                className="p-1.5 hover:bg-white rounded-lg cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-900/10 cursor-pointer transition-all active:scale-[0.98]"
            >
              <Printer className="w-4 h-4" />
              Cetak / Simpan PDF
            </button>
          </div>
        </div>

        {/* Target & Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Target Santri */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
              Sasaran Santri yang Dicetak
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedTarget('single')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  selectedTarget === 'single'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-800'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Satu Santri Saja
              </button>
              <button
                type="button"
                onClick={() => setSelectedTarget('all')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  selectedTarget === 'all'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-800'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Semua Santri ({santriList.length}) Sekaligus
              </button>
            </div>

            {selectedTarget === 'single' && (
              <select
                value={selectedSantriId}
                onChange={(e) => setSelectedSantriId(e.target.value)}
                className="w-full mt-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-600"
              >
                {santriList.map((s) => (
                  <option key={s.id} value={s.id}>
                    Absen {s.nomorUrutAbsen} - {s.namaLengkap} ({s.nis})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Quick Presets */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
              Pilihan Preset Lembar
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={selectAll}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
              >
                Semua Lembar
              </button>
              <button
                type="button"
                onClick={selectNilaiOnly}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
              >
                Raport Nilai Lengkap
              </button>
              <button
                type="button"
                onClick={selectLeggerOnly}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
              >
                Hanya Legger Nilai
              </button>
            </div>
          </div>
        </div>

        {/* 6 Checkbox Cards required by user */}
        <div className="pt-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
            Pilihan Cetak Lembar Raport:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
            {/* 1. Cover */}
            <div
              onClick={() => toggleOption('cover')}
              className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center gap-2 ${
                printOptions.cover
                  ? 'bg-emerald-50/70 border-emerald-500 text-emerald-900 font-bold'
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              {printOptions.cover ? (
                <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-slate-300 shrink-0" />
              )}
              <span>Halaman Cover</span>
            </div>

            {/* 2. Identitas */}
            <div
              onClick={() => toggleOption('identitas')}
              className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center gap-2 ${
                printOptions.identitas
                  ? 'bg-emerald-50/70 border-emerald-500 text-emerald-900 font-bold'
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              {printOptions.identitas ? (
                <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-slate-300 shrink-0" />
              )}
              <span>Halaman Identitas</span>
            </div>

            {/* 3. Akademik */}
            <div
              onClick={() => toggleOption('akademik')}
              className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center gap-2 ${
                printOptions.akademik
                  ? 'bg-emerald-50/70 border-emerald-500 text-emerald-900 font-bold'
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              {printOptions.akademik ? (
                <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-slate-300 shrink-0" />
              )}
              <span>Nilai Akademik</span>
            </div>

            {/* 4. Sikap */}
            <div
              onClick={() => toggleOption('sikap')}
              className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center gap-2 ${
                printOptions.sikap
                  ? 'bg-emerald-50/70 border-emerald-500 text-emerald-900 font-bold'
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              {printOptions.sikap ? (
                <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-slate-300 shrink-0" />
              )}
              <span>Nilai Sikap</span>
            </div>

            {/* 5. Ekstra & Absensi */}
            <div
              onClick={() => toggleOption('ekstraAbsensi')}
              className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center gap-2 ${
                printOptions.ekstraAbsensi
                  ? 'bg-emerald-50/70 border-emerald-500 text-emerald-900 font-bold'
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              {printOptions.ekstraAbsensi ? (
                <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-slate-300 shrink-0" />
              )}
              <span>Ekstrakurikuler & Absensi</span>
            </div>

            {/* 6. Legger */}
            <div
              onClick={() => toggleOption('legger')}
              className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center gap-2 ${
                printOptions.legger
                  ? 'bg-emerald-50/70 border-emerald-500 text-emerald-900 font-bold'
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              {printOptions.legger ? (
                <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-slate-300 shrink-0" />
              )}
              <span>Legger Nilai</span>
            </div>
          </div>
        </div>

        {/* Print Tip */}
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 text-xs text-amber-900 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>Tips Cetak Raport:</strong> Pada dialog print browser, pilih ukuran <strong>A4</strong>, margin <strong>Default</strong> atau <strong>None</strong>, dan pastikan opsi <strong>Background graphics</strong> dicentang.
          </span>
        </div>
      </div>

      {/* Print Document Container / Live Preview */}
      <div className="overflow-x-auto pb-12 flex justify-center">
        <div
          id="raport-print-area"
          style={{ transform: `scale(${zoomScale})`, transformOrigin: 'top center' }}
          className="print:scale-100 print:transform-none space-y-8 print:space-y-0 transition-transform duration-200"
        >
          {/* Loop over students to be printed */}
          {targetSantriList.map((santri) => {
            const n = nilaiMap[santri.id];
            return (
              <React.Fragment key={santri.id}>
                {/* 1. Cover */}
                {printOptions.cover && (
                  <RaportCover santri={santri} settings={settings} />
                )}

                {/* 2. Identitas */}
                {printOptions.identitas && (
                  <RaportIdentitas santri={santri} settings={settings} />
                )}

                {/* 3. Akademik */}
                {printOptions.akademik && (
                  <RaportAkademik
                    santri={santri}
                    settings={settings}
                    mapelList={mapelList}
                    nilaiSantri={n}
                  />
                )}

                {/* 4. Sikap */}
                {printOptions.sikap && (
                  <RaportSikap
                    santri={santri}
                    settings={settings}
                    nilaiSantri={n}
                  />
                )}

                {/* 5. Ekstra & Absensi */}
                {printOptions.ekstraAbsensi && (
                  <RaportEkstraAbsensi
                    santri={santri}
                    settings={settings}
                    nilaiSantri={n}
                  />
                )}
              </React.Fragment>
            );
          })}

          {/* 6. Legger Nilai (Printed once per class) */}
          {printOptions.legger && (
            <RaportLegger
              santriList={santriList}
              settings={settings}
              mapelList={mapelList}
              nilaiMap={nilaiMap}
            />
          )}
        </div>
      </div>
    </div>
  );
};
