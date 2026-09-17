import { NilaiSantri, MataPelajaran } from '../types';

export function calculateScoreLetter(score: number, kkm = 40): string {
  if (score === 0 || isNaN(score)) return '-';
  if (score >= 85) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= kkm) return 'D';
  return 'E';
}

export function terbilangAngka(nilai: number): string {
  if (nilai === 0) return 'Nol';
  const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  
  function convert(n: number): string {
    if (n < 12) return satuan[n];
    if (n < 20) return convert(n - 10) + ' Belas';
    if (n < 100) return convert(Math.floor(n / 10)) + ' Puluh' + (n % 10 !== 0 ? ' ' + convert(n % 10) : '');
    if (n < 200) return 'Seratus' + (n - 100 !== 0 ? ' ' + convert(n - 100) : '');
    if (n < 1000) return convert(Math.floor(n / 100)) + ' Ratus' + (n % 100 !== 0 ? ' ' + convert(n % 100) : '');
    return n.toString();
  }

  const rounded = Math.round(nilai);
  return convert(rounded);
}

export function calculateSantriRerata(nilaiSantri?: NilaiSantri, mapelList: MataPelajaran[] = []): number {
  if (!nilaiSantri || !nilaiSantri.akademik) return 0;
  let totalScore = 0;
  let count = 0;

  mapelList.forEach((mapel) => {
    const item = nilaiSantri.akademik[mapel.id];
    if (item) {
      const tulis = Number(item.tulis?.skor) || 0;
      const lisan = Number(item.lisan?.skor) || 0;
      totalScore += (tulis + lisan) / 2;
      count++;
    }
  });

  if (count === 0) return 0;
  return Number((totalScore / count).toFixed(2));
}

export function formatTanggalIndonesia(dateStr?: string): string {
  if (!dateStr) return '';
  // Check if already in text format (e.g. "20 Desember 2025")
  if (isNaN(Date.parse(dateStr))) return dateStr;
  
  const d = new Date(dateStr);
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
