import React from 'react';
import {
  formatShortIndonesianTimestampWib,
  normalizeIndonesianDateLabel
} from '../utils/dateHelpers.ts';
import {
  ShiftInfo,
  AggregatedCensus,
  MachineOverview,
  ClinicalIndicatorItem,
  OperationalItem,
  SbarData,
  ShiftSignatures
} from '../types/dialysis.ts';
import { Printer, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { printDocumentWithOrientation } from '../utils/printHelpers.ts';

interface OfficialReportPrintableProps {
  shiftInfo: ShiftInfo;
  census: AggregatedCensus;
  machineOverview: MachineOverview;
  clinicalIndicators: ClinicalIndicatorItem[];
  operationalItems: OperationalItem[];
  sbar: SbarData;
  signatures: ShiftSignatures;
  onPrint?: () => void;
  onSign?: (role: 'pjShift' | 'pjBerikutnya' | 'kepalaRuangan') => void;
}

export const OfficialReportPrintable: React.FC<OfficialReportPrintableProps> = ({
  shiftInfo,
  census,
  machineOverview,
  clinicalIndicators,
  operationalItems,
  sbar,
  signatures,
  onPrint,
  onSign
}) => {
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      const docTitle = `Laporan_PJ_Shift_${shiftInfo.shift || 'Pagi'}_${shiftInfo.date}`;
      printDocumentWithOrientation(false, docTitle);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Action Toolbar on Screen */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white p-3 rounded-xl print:hidden shadow-md">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span className="font-semibold text-sm">Dokumen Terstandar Akreditasi KARS &amp; PERNEFRI</span>
          <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
            Format 1:1 Resmi
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            aria-label="Cetak atau Simpan PDF Laporan"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors shadow cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Cetak / Simpan PDF
          </button>
        </div>
      </div>

      {/* The Printable Paper Container */}
      <div
        id="printable-report"
        className="printable-sheet bg-white text-slate-900 p-6 md:p-8 rounded-lg shadow-xl print:shadow-none print:p-2 border border-slate-200 print:border-none text-[11px] leading-tight"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* Document Header */}
        <div className="text-center border-b-2 border-slate-900 pb-2 mb-3">
          <div className="text-[12px] font-bold tracking-wider text-slate-700 uppercase">
            {shiftInfo.unitName} {shiftInfo.hospitalName}
          </div>
          <h1 className="text-[15px] font-black tracking-tight text-slate-950 uppercase mt-0.5">
            LOGBOOK &amp; PERTANGGUNGJAWABAN PERAWAT PENANGGUNG JAWAB (PJ) SHIFT
          </h1>
          <div className="text-[10px] text-slate-600 italic mt-0.5">
            Laporan Komprehensif Asuhan Medis, Keperawatan, Mutu Air RO, Pemeliharaan Mesin &amp; Operasional Non-Medis | Standar Akreditasi KARS &amp; PERNEFRI
          </div>
        </div>

        {/* SECTION A: INFORMASI UMUM SHIFT & KETENAGAAN */}
        <div className="mb-3">
          <div className="bg-[#1e4b85] text-white font-bold px-2 py-1 text-[11px] uppercase tracking-wide">
            A. INFORMASI UMUM SHIFT &amp; KETENAGAAN
          </div>
          <table className="w-full border-collapse border border-slate-400 text-[10.5px] tabular-nums">
            <tbody>
              <tr className="border-b border-slate-300">
                <td className="w-1/6 font-bold bg-slate-100 p-1 border-r border-slate-300">Hari / Tanggal</td>
                <td className="w-2/6 p-1 border-r border-slate-300 font-semibold">{normalizeIndonesianDateLabel(shiftInfo.date)}</td>
                <td className="w-1/6 font-bold bg-slate-100 p-1 border-r border-slate-300">Shift Dinas</td>
                <td className="w-2/6 p-1 font-semibold">{shiftInfo.shiftHours}</td>
              </tr>
              <tr className="border-b border-slate-300">
                <td className="font-bold bg-slate-100 p-1 border-r border-slate-300">Penanggung Jawab (PJ) Shift</td>
                <td className="p-1 border-r border-slate-300 font-semibold">{shiftInfo.pjShift || '-'}</td>
                <td className="font-bold bg-slate-100 p-1 border-r border-slate-300">Dokter DPJP Unit HD</td>
                <td className="p-1">{shiftInfo.dokterDpjp || '-'}</td>
              </tr>
              <tr className="border-b border-slate-300">
                <td className="font-bold bg-slate-100 p-1 border-r border-slate-300">Kepala Ruangan HD</td>
                <td className="p-1 border-r border-slate-300 font-semibold">{shiftInfo.kepalaRuangan || 'TWIS FERTILIANTI PW'}</td>
                <td className="font-bold bg-slate-100 p-1 border-r border-slate-300">Dokter Jaga Ruangan</td>
                <td className="p-1">{shiftInfo.dokterJaga || '-'}</td>
              </tr>
              <tr className="border-b border-slate-300">
                <td className="font-bold bg-slate-100 p-1 border-r border-slate-300">Jumlah Perawat Dinas</td>
                <td className="p-1 border-r border-slate-300 font-bold text-slate-900">
                  {shiftInfo.detailPerawat || `${shiftInfo.totalPerawatDinas || 0} Orang`}
                </td>
                <td className="font-bold bg-slate-100 p-1 border-r border-slate-300">Rasio Perawat dan Pasien</td>
                <td className="p-1 font-semibold text-emerald-800">{shiftInfo.perawatRatio || '0 : 0'}</td>
              </tr>
              <tr>
                <td className="font-bold bg-slate-100 p-1 border-r border-slate-300">Tenaga Pendukung Dinas</td>
                <td className="p-1 border-r border-slate-300">{shiftInfo.tenagaPendukung || '-'}</td>
                <td className="font-bold bg-slate-100 p-1 border-r border-slate-300">Total Pasien Dilayani</td>
                <td className="p-1 font-bold text-blue-900">
                  {census.totalPasienDilayani > 0
                    ? `${census.totalPasienDilayani} Pasien (${census.pasienRajal} Rajal, ${census.pasienRanap} Ranap)`
                    : '0 Pasien'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SECTION B: SENSUS PASIEN, AKSES VASKULAR & UTILISASI MESIN */}
        <div className="mb-3">
          <div className="bg-[#1e4b85] text-white font-bold px-2 py-1 text-[11px] uppercase tracking-wide">
            B. SENSUS PASIEN, AKSES VASKULAR &amp; UTILISASI MESIN HEMODIALISIS
          </div>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {/* Left Sub-table: Sensus */}
            <table className="w-full border-collapse border border-slate-400 text-[10.5px]">
              <thead>
                <tr className="bg-[#295c9e] text-white">
                  <th colSpan={2} className="p-1 text-center font-bold tracking-wider text-[10px] uppercase">
                    SENSUS &amp; KLASIFIKASI PASIEN SHIFT INI
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-300">
                  <td className="p-1 border-r border-slate-300">Pasien Terjadwal (Target Shift)</td>
                  <td className="p-1 font-bold text-center w-16">{census.pasienTerjadwal}</td>
                </tr>
                <tr className="border-b border-slate-300 bg-slate-50">
                  <td className="p-1 border-r border-slate-300 font-semibold">Pasien Hadir &amp; Selesai HD</td>
                  <td className="p-1 font-bold text-center text-blue-900 w-16">{census.pasienHadirSelesai}</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="p-1 border-r border-slate-300">Pasien HD Cito / Emergency (ICU/IGD)</td>
                  <td className="p-1 font-bold text-center text-red-700 w-16">{census.pasienCitoEmergency}</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="p-1 border-r border-slate-300">Pasien Batal / Tunda (Reschedule)</td>
                  <td className="p-1 font-bold text-center w-16">{census.pasienBatalTunda}</td>
                </tr>
                <tr className="border-b border-slate-300 bg-slate-50">
                  <td className="p-1 border-r border-slate-300">Kategori: Pasien Reguler (Non-Hepatitis)</td>
                  <td className="p-1 font-bold text-center w-16">{census.pasienReguler}</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="p-1 border-r border-slate-300">Kategori: Pasien Isolasi Hepatitis B</td>
                  <td className="p-1 font-bold text-center text-amber-700 w-16">{census.pasienHepB}</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="p-1 border-r border-slate-300">Kategori: Pasien Isolasi Hepatitis C / HIV</td>
                  <td className="p-1 font-bold text-center text-amber-700 w-16">{census.pasienHepC}</td>
                </tr>
                <tr className="border-b border-slate-300 bg-slate-50">
                  <td className="p-1 border-r border-slate-300">Status: Pasien Rawat Jalan</td>
                  <td className="p-1 font-bold text-center w-16">{census.pasienRajal}</td>
                </tr>
                <tr>
                  <td className="p-1 border-r border-slate-300">Status: Pasien Rawat Inap (Bangsal/ICU)</td>
                  <td className="p-1 font-bold text-center w-16">{census.pasienRanap}</td>
                </tr>
              </tbody>
            </table>

            {/* Right Sub-table: Kapasitas Mesin & Akses Vaskular */}
            <table className="w-full border-collapse border border-slate-400 text-[10.5px]">
              <thead>
                <tr className="bg-[#295c9e] text-white">
                  <th colSpan={2} className="p-1 text-center font-bold tracking-wider text-[10px] uppercase">
                    KAPASITAS MESIN &amp; DISTRIBUSI AKSES VASKULAR
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-300">
                  <td className="p-1 border-r border-slate-300">Total Kapasitas Mesin HD</td>
                  <td className="p-1 font-bold text-center w-16">{machineOverview.totalCapacity}</td>
                </tr>
                <tr className="border-b border-slate-300 bg-slate-50">
                  <td className="p-1 border-r border-slate-300">Mesin Beroperasi Siap Pakai</td>
                  <td className="p-1 font-bold text-center text-emerald-800 w-16">{machineOverview.beroperasiSiapPakai}</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="p-1 border-r border-slate-300">Mesin Maintenance / Perbaikan</td>
                  <td className="p-1 font-bold text-center text-slate-500 w-16">{machineOverview.maintenance}</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="p-1 border-r border-slate-300">Mesin Khusus Hepatitis B (Isolasi)</td>
                  <td className="p-1 font-bold text-center w-16">{machineOverview.khususHepB}</td>
                </tr>
                <tr className="border-b border-slate-300 bg-slate-50">
                  <td className="p-1 border-r border-slate-300">Mesin Khusus Hepatitis C</td>
                  <td className="p-1 font-bold text-center w-16">{machineOverview.khususHepC}</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="p-1 border-r border-slate-300 font-semibold">Akses: AV Fistula (Cimino)</td>
                  <td className="p-1 font-bold text-center text-blue-900 w-16">{census.aksesAvFistula}</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="p-1 border-r border-slate-300">Akses: AV Graft</td>
                  <td className="p-1 font-bold text-center w-16">{census.aksesAvGraft}</td>
                </tr>
                <tr className="border-b border-slate-300 bg-slate-50">
                  <td className="p-1 border-r border-slate-300">Akses: Double Lumen (CDL) Non-Tunnel</td>
                  <td className="p-1 font-bold text-center w-16">{census.aksesCdlNonTunnel}</td>
                </tr>
                <tr>
                  <td className="p-1 border-r border-slate-300">Akses: Double Lumen Tunneling (Permcath)</td>
                  <td className="p-1 font-bold text-center w-16">{census.aksesCdlPermcath}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION C: MONITORING ASUHAN KEPERAWATAN & PELAYANAN MEDIS SHIFT */}
        <div className="mb-3">
          <div className="bg-[#1e4b85] text-white font-bold px-2 py-1 text-[11px] uppercase tracking-wide">
            C. MONITORING ASUHAN KEPERAWATAN &amp; PELAYANAN MEDIS SHIFT
          </div>
          <table className="w-full border-collapse border border-slate-400 text-[10px] mt-1">
            <thead>
              <tr className="bg-[#295c9e] text-white text-center">
                <th className="p-1 border border-slate-400 w-1/4">Indikator Asuhan Keperawatan &amp; Medis</th>
                <th className="p-1 border border-slate-400 w-1/6">Hasil / Capaian Shift</th>
                <th className="p-1 border border-slate-400 w-1/6">Standar Target</th>
                <th className="p-1 border border-slate-400 w-5/12">Analisis &amp; Tindak Lanjut</th>
              </tr>
            </thead>
            <tbody>
              {clinicalIndicators.map((ind, idx) => (
                <tr key={ind.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="p-1 border border-slate-400 font-medium">{ind.label}</td>
                  <td className="p-1 border border-slate-400 font-bold text-center">{ind.capaian}</td>
                  <td className="p-1 border border-slate-400 text-center text-slate-700">{ind.standar}</td>
                  <td className="p-1 border border-slate-400">{ind.analisis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SECTION D: AKUNTABILITAS NON-MEDIS, OPERASIONAL, WATER TREATMENT & K3 */}
        <div className="mb-3">
          <div className="bg-[#1e4b85] text-white font-bold px-2 py-1 text-[11px] uppercase tracking-wide">
            D. AKUNTABILITAS NON-MEDIS, OPERASIONAL, WATER TREATMENT &amp; K3
          </div>
          <table className="w-full border-collapse border border-slate-400 text-[10px] mt-1">
            <thead>
              <tr className="bg-[#295c9e] text-white text-center">
                <th className="p-1 border border-slate-400 w-1/4">Item Fasilitas / Operasional</th>
                <th className="p-1 border border-slate-400 w-1/4">Parameter Uji / Pengawasan</th>
                <th className="p-1 border border-slate-400 w-1/3">Hasil Observasi Shift</th>
                <th className="p-1 border border-slate-400 w-1/6">Status Kepatuhan</th>
              </tr>
            </thead>
            <tbody>
              {operationalItems.map((op, idx) => (
                <tr key={op.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="p-1 border border-slate-400 font-bold">{op.item}</td>
                  <td className="p-1 border border-slate-400 text-slate-700">{op.parameterUji}</td>
                  <td className="p-1 border border-slate-400">{op.hasilObservasi}</td>
                  <td className="p-1 border border-slate-400 font-bold text-center text-emerald-800 tracking-tight">
                    {op.statusKepatuhan}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SECTION E: SERAH TERIMA SHIFT MODEL SBAR */}
        <div className="mb-3">
          <div className="bg-[#1e4b85] text-white font-bold px-2 py-1 text-[11px] uppercase tracking-wide">
            E. SERAH TERIMA SHIFT MODEL SBAR (SITUATION, BACKGROUND, ASSESSMENT, RECOMMENDATION)
          </div>
          <table className="w-full border-collapse border border-slate-400 text-[10px] mt-1">
            <tbody>
              <tr className="border-b border-slate-400">
                <td className="w-1/6 p-1.5 font-bold bg-slate-100 border-r border-slate-400 align-top">SITUATION (S)</td>
                <td className="p-1.5 leading-relaxed">{sbar.situation}</td>
              </tr>
              <tr className="border-b border-slate-400">
                <td className="p-1.5 font-bold bg-slate-100 border-r border-slate-400 align-top">BACKGROUND (B)</td>
                <td className="p-1.5 leading-relaxed">{sbar.background}</td>
              </tr>
              <tr className="border-b border-slate-400">
                <td className="p-1.5 font-bold bg-slate-100 border-r border-slate-400 align-top">ASSESSMENT (A)</td>
                <td className="p-1.5 leading-relaxed">{sbar.assessment}</td>
              </tr>
              <tr>
                <td className="p-1.5 font-bold bg-slate-100 border-r border-slate-400 align-top">RECOMMENDATION (R)</td>
                <td className="p-1.5 leading-relaxed whitespace-pre-line">{sbar.recommendation}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SECTION F: PENGESAHAN & PERTANGGUNGJAWABAN SHIFT */}
        <div className="mt-4 pt-2">
          <div className="bg-[#1e4b85] text-white font-bold px-2 py-1 text-[11px] uppercase tracking-wide mb-2">
            F. PENGESAHAN &amp; PERTANGGUNGJAWABAN SHIFT
          </div>
          <div className="grid grid-cols-3 text-center text-[10.5px]">
            {/* 1. Yang Menyerahkan */}
            <div className="flex flex-col items-center justify-between p-2">
              <div>
                <div className="font-semibold text-slate-700">Yang Menyerahkan,</div>
                <div className="text-[10px] text-slate-500">Perawat Penanggung Jawab (PJ) Shift</div>
              </div>
              <div className="my-5 min-h-[50px] flex items-center justify-center">
                {signatures.pjShift.signed ? (
                  <div className="text-center">
                    <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-bold border border-emerald-400 bg-emerald-50 px-2 py-1 rounded">
                      <CheckCircle className="w-3.5 h-3.5" />
                      TERVERIFIKASI DIGITAL
                    </span>
                    <div className="text-[9px] text-slate-400 mt-0.5">{signatures.pjShift.signedAt || formatShortIndonesianTimestampWib()}</div>
                  </div>
                ) : (
                  <button
                    onClick={() => onSign && onSign('pjShift')}
                    className="print:hidden text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                  >
                    [ Klik untuk Tanda Tangan ]
                  </button>
                )}
              </div>
              <div className="border-t border-slate-900 w-4/5 pt-1 font-bold">
                ( {shiftInfo.pjShift || '....................................................'} )
              </div>
            </div>

            {/* 2. Yang Menerima */}
            <div className="flex flex-col items-center justify-between p-2">
              <div>
                <div className="font-semibold text-slate-700">Yang Menerima,</div>
                <div className="text-[10px] text-slate-500">Perawat PJ Shift Berikutnya</div>
              </div>
              <div className="my-5 min-h-[50px] flex items-center justify-center">
                {signatures.pjBerikutnya.signed ? (
                  <div className="text-center">
                    <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-bold border border-emerald-400 bg-emerald-50 px-2 py-1 rounded">
                      <CheckCircle className="w-3.5 h-3.5" />
                      TERVERIFIKASI DIGITAL
                    </span>
                    <div className="text-[9px] text-slate-400 mt-0.5">{signatures.pjBerikutnya.signedAt || formatShortIndonesianTimestampWib()}</div>
                  </div>
                ) : (
                  <button
                    onClick={() => onSign && onSign('pjBerikutnya')}
                    className="print:hidden text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                  >
                    [ Klik untuk Tanda Tangan ]
                  </button>
                )}
              </div>
              <div className="border-t border-slate-900 w-4/5 pt-1 font-bold">
                ( {shiftInfo.pjShiftBerikutnya || '....................................................'} )
              </div>
            </div>

            {/* 3. Mengetahui */}
            <div className="flex flex-col items-center justify-between p-2">
              <div>
                <div className="font-semibold text-slate-700">Mengetahui &amp; Menyetujui,</div>
                <div className="text-[10px] text-slate-500">Kepala Ruangan Hemodialisis</div>
              </div>
              <div className="my-5 min-h-[50px] flex items-center justify-center">
                {signatures.kepalaRuangan.signed ? (
                  <div className="text-center">
                    <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-bold border border-emerald-400 bg-emerald-50 px-2 py-1 rounded">
                      <CheckCircle className="w-3.5 h-3.5" />
                      TERVERIFIKASI DIGITAL
                    </span>
                    <div className="text-[9px] text-slate-400 mt-0.5">{signatures.kepalaRuangan.signedAt || formatShortIndonesianTimestampWib()}</div>
                  </div>
                ) : (
                  <button
                    onClick={() => onSign && onSign('kepalaRuangan')}
                    className="print:hidden text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                  >
                    [ Klik untuk Tanda Tangan ]
                  </button>
                )}
              </div>
              <div className="border-t border-slate-900 w-4/5 pt-1 font-bold">
                ( {shiftInfo.kepalaRuangan || '....................................................'} )
              </div>
            </div>
          </div>
        </div>

        {/* Footer print stamp */}
        <div className="mt-4 pt-2 border-t border-slate-300 flex justify-between text-[9px] text-slate-400">
          <span>Dicetak melalui Sistem DialisisLog RS Happy Land Medical Centre</span>
          <span>Dokumen Akreditasi Resmi RS - Halaman 1 dari 1</span>
        </div>
      </div>
    </div>
  );
};
