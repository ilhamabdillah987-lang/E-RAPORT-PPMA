import React, { useState } from 'react';
import { RaportSettings } from '../types';
import { Upload, Trash2, CheckCircle2, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { RaportKop } from '../components/raport/RaportKop';

interface UploadLogoViewProps {
  settings: RaportSettings;
  onUpdateLogo: (logoUrl: string) => void;
}

export const UploadLogoView: React.FC<UploadLogoViewProps> = ({
  settings,
  onUpdateLogo,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string>(settings.logoUrl || '');
  const [isSaved, setIsSaved] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          const url = reader.result as string;
          setPreviewUrl(url);
          onUpdateLogo(url);
          setIsSaved(true);
          setTimeout(() => setIsSaved(false), 3000);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetToDefault = () => {
    // Default pesantren emblem
    const defaultEmblem = '/logo-alhikmah.svg';
    setPreviewUrl(defaultEmblem);
    onUpdateLogo(defaultEmblem);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleClear = () => {
    setPreviewUrl('');
    onUpdateLogo('');
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 uppercase">
            Menu Admin: Upload Logo Pesantren
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Logo yang diunggah di sini akan otomatis tampil pada Halaman Login, Sampul Cover, dan Kop Surat Raport Santri
          </p>
        </div>

        {isSaved && (
          <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-200 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Logo Berhasil Disimpan</span>
          </div>
        )}
      </div>

      {/* Upload Zone & Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3">
              Pilih Berkas Logo
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Format yang disarankan adalah PNG dengan latar belakang transparan (transparan background) agar rapi pada lembar cetak raport.
            </p>

            <label className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/30 hover:bg-emerald-50/60 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Upload className="w-7 h-7" />
              </div>
              <span className="font-bold text-xs text-slate-800 group-hover:text-emerald-800">
                Klik untuk Memilih Berkas Logo
              </span>
              <span className="text-[10px] text-slate-500 mt-1">
                Mendukung PNG, JPG, WEBP, SVG (Maks 5MB)
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="pt-6 border-t border-slate-100 flex gap-2">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Gunakan Default Logo
            </button>
            {previewUrl && (
              <button
                type="button"
                onClick={handleClear}
                className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus
              </button>
            )}
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col items-center justify-center text-center">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4">
            Pratinjau Logo Saat Ini
          </h3>

          <div className="w-44 h-44 border-2 border-dashed border-slate-200 rounded-3xl p-4 flex items-center justify-center bg-slate-50/60 shadow-inner mb-4">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Pesantren Logo"
                className="max-h-36 max-w-36 object-contain"
              />
            ) : (
              <div className="text-center text-slate-400">
                <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <span className="text-xs font-bold">Belum Ada Logo</span>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 font-medium">
            Logo ini akan langsung digunakan pada seluruh fungsi cetak raport dan tampilan kop surat.
          </p>
        </div>
      </div>

      {/* Kop Surat Test Preview */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
          Pratinjau Tampilan pada Kop Surat Resmi:
        </h3>
        <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/30">
          <RaportKop settings={{ ...settings, logoUrl: previewUrl }} />
        </div>
      </div>
    </div>
  );
};
