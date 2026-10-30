import React from 'react';
import {
  X,
  Layers,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Users,
  Activity,
  Droplets,
  FileCheck,
  ShieldAlert,
  Sparkles,
  Printer
} from 'lucide-react';

interface SystemDesignExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemDesignExplainerModal: React.FC<SystemDesignExplainerModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-6">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white p-6 flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Panduan Arsitektur &amp; Desain Sistem
            </div>
            <h2 className="text-xl font-black text-white">
              Desain Sistem Logbook Hemodialisa yang Nyaman &amp; Terstandar KARS / PERNEFRI
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Bagaimana merancang alur kerja yang mudah bagi perawat pelaksana di samping bed pasien, namun otomatis menghasilkan laporan komprehensif PJ Shift tanpa rekap manual yang melelahkan.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup panduan"
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 md:p-8 space-y-8 overflow-y-auto max-h-[75vh] text-slate-800 text-xs leading-relaxed">
          {/* Visual Architecture Pipeline */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              1. Alur Kerja Sistem 2-Sisi (Bedside &rarr; PJ Shift &rarr; PDF Laporan)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Step 1 */}
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-blue-800 font-bold text-xs mb-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px]">1</span>
                    Perawat Pelaksana (5 Bagian Logbook Bedside)
                  </div>
                  <p className="text-slate-600 mb-3 text-[11px]">
                    Dokumentasi klinis terstandar akreditasi KARS &amp; PERNEFRI mencakup 5 Bagian:
                  </p>
                  <ul className="space-y-1.5 text-[11px] text-slate-700">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span><strong>BAGIAN I:</strong> KESIAPAN FASILITAS RUANGAN HEMODIALISIS &amp; SISTEM WATER TREATMENT (RO)</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span><strong>BAGIAN II:</strong> PERSIAPAN PERAWAT, PERALATAN, MESIN HD &amp; ALAT KESEHATAN (PRE-HD)</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span><strong>BAGIAN III:</strong> IDENTIFIKASI PASIEN, PENGKAJIAN PRE-HD &amp; KESELAMATAN PASIEN (PATIENT SAFETY)</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span><strong>BAGIAN IV:</strong> MONITORING INTRA-HD &amp; PENCEGAHAN INSIDEN KESELAMATAN PASIEN (IKP)</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span><strong>BAGIAN V:</strong> EDUKASI TERSTRUKTUR KEPADA PASIEN &amp; KELUARGA (DIET, CAIRAN, KEBERSIHAN DIRI)</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-4 pt-3 border-t border-blue-200 text-[10px] text-blue-700 font-semibold flex items-center gap-1">
                  Input cepat &amp; cetak resmi per pasien &rarr;
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-indigo-800 font-bold text-xs mb-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px]">2</span>
                    Mesin Agregasi Otomatis
                  </div>
                  <p className="text-slate-600 mb-3 text-[11px]">
                    Sistem secara real-time mengolah seluruh data dari 24 bed tanpa rekap kalkulator manual:
                  </p>
                  <ul className="space-y-1.5 text-[11px] text-slate-700">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <span>Kalkulasi otomatis Sensus (Rajal, Ranap, Hep B/C, Cito).</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <span>Kalkulasi 8 Indikator Mutu KARS (Capaian UF, Rata-rata jam HD, % Hipotensi, dll).</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <span>Menyusun draf SBAR handover otomatis.</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-4 pt-3 border-t border-indigo-200 text-[10px] text-indigo-700 font-semibold flex items-center gap-1">
                  Zero-effort calculation &rarr;
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs mb-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px]">3</span>
                    PJ Shift &amp; Output Laporan
                  </div>
                  <p className="text-slate-600 mb-3 text-[11px]">
                    PJ Shift hanya memverifikasi data dan mengisi pengawasan operasional ruangan:
                  </p>
                  <ul className="space-y-1.5 text-[11px] text-slate-700">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Checklist Water Treatment RO, Segel Emergency Trolley, Limbah B3.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Review draf SBAR dan lakukan pengesahan digital.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>1-Klik Cetak / Simpan PDF persis seperti format rumah sakit Anda.</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-4 pt-3 border-t border-emerald-200 text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                  Dokumen Akreditasi Siap Cetak
                </div>
              </div>
            </div>
          </div>

          {/* Mapping Table to Attached PDF */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              2. Pemetaan Komponen PDF Lampiran ke Antarmuka Input
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold">
                    <th className="p-2.5 border-b border-slate-200 w-1/4">Bagian Dokumen PDF</th>
                    <th className="p-2.5 border-b border-slate-200 w-1/3">Sumber Data / Input Sistem</th>
                    <th className="p-2.5 border-b border-slate-200">Keuntungan Desain</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-2.5 font-bold text-blue-900">A. Informasi Shift &amp; Ketenagaan</td>
                    <td className="p-2.5">Profil Shift Dinas &amp; Daftar Hadir Perawat</td>
                    <td className="p-2.5 text-slate-600">
                      Rasio perawat:pasien (1:3) langsung dihitung otomatis terhadap standar PERNEFRI.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-blue-900">B. Sensus Pasien &amp; Akses Vaskular</td>
                    <td className="p-2.5">Agregasi live dari checklist per-pasien di Bedside</td>
                    <td className="p-2.5 text-slate-600">
                      Tidak perlu menghitung manual jumlah Cimino (18), Graft (1), CDL (3), Permcath (2), Hep B/C.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-blue-900">C. Monitoring Mutu Asuhan KARS</td>
                    <td className="p-2.5">Kalkulasi matematis otomatis dari data sesi HD</td>
                    <td className="p-2.5 text-slate-600">
                      Persentase target UF (95.8%), durasi rata-rata (4.4 jam), insiden hipotensi (8.3%) langsung dibandingkan dengan target standar akreditasi KARS.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-blue-900">D. Akuntabilitas RO Water &amp; K3</td>
                    <td className="p-2.5">Checklist PJ Shift dengan default text standar</td>
                    <td className="p-2.5 text-slate-600">
                      PJ Shift cukup memeriksa nomor segel emergency trolley dan mutu RO tanpa mengetik ulang dari awal.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-blue-900">E. Serah Terima Shift (SBAR)</td>
                    <td className="p-2.5">Auto-generated SBAR dari kejadian pasien kritis shift</td>
                    <td className="p-2.5 text-slate-600">
                      Pasien hipotensi (Bed 08, Bed 12) otomatis dirangkum ke dalam Situation, Background, Assessment, dan Rekomendasi shift berikutnya.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-blue-900">F. Pengesahan 3 Pihak</td>
                    <td className="p-2.5">Tombol Verifikasi Digital / Tanda Tangan 1-Klik</td>
                    <td className="p-2.5 text-slate-600">
                      Tercatat cap waktu (timestamp) verifikasi PJ yang menyerahkan, PJ penerima, dan Ka. Ruangan.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Practical Tips */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h4 className="text-xs font-bold text-amber-950 mb-1 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-700" />
              Kunci Keberhasilan Adopsi di Ruang Hemodialisa
            </h4>
            <ul className="list-disc list-inside text-amber-900 space-y-1 text-[11px]">
              <li>
                <strong>Beban Input Rendah:</strong> Jangan minta perawat mengetik esai panjang saat pasien masih di bed. Cukup dropdown dan centang cepat (Hipotensi: Ya/Tidak, Tensi terendah, Tindakan).
              </li>
              <li>
                <strong>Kepatuhan Standar Akreditasi:</strong> Semua indikator (UF Dry Weight, Durasi 4-5 jam, K3, SBAR) selalu sinkron dengan format laporan resmi rumah sakit.
              </li>
              <li>
                <strong>Siap Cetak Fisik:</strong> Dokumen hasil printout dirancang proporsional pas 1 lembar A4 landscape/portrait untuk arsip fisik rekam medis dan asesmen surveyor akreditasi.
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Aplikasi ini mendemonstrasikan sistem terpadu tersebut secara langsung.
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            Mengerti &amp; Coba Aplikasi
          </button>
        </div>
      </div>
    </div>
  );
};
