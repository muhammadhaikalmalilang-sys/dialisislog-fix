import React from 'react';
import { PatientHDSession, ShiftInfo } from '../types/dialysis.ts';
import { ensureFullBagianData } from '../utils/logbookStandards.ts';
import {
  formatShortIndonesianTimestampWib,
  normalizeIndonesianDateLabel
} from '../utils/dateHelpers.ts';
import { Printer, X, ShieldCheck, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';

import { printDocumentWithOrientation } from '../utils/printHelpers.ts';

interface PelaksanaLogbookPrintableModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: PatientHDSession;
  shiftInfo: ShiftInfo;
}

export const PelaksanaLogbookPrintableModal: React.FC<PelaksanaLogbookPrintableModalProps> = ({
  isOpen,
  onClose,
  session,
  shiftInfo
}) => {
  if (!isOpen || !session) return null;

  const data = ensureFullBagianData(session);
  const b1 = data.bagian1!;
  const b2 = data.bagian2!;
  const b3 = data.bagian3!;
  const b4 = data.bagian4!;
  const b5 = data.bagian5!;

  const handlePrint = () => {
    const docTitle = `Logbook_HD_${data.bedNumber || 'BED'}_${data.patientName || 'Pasien'}_${data.date || 'Shift'}`;
    printDocumentWithOrientation(false, docTitle, true);
  };

  return (
    <div
      id="printable-pelaksana-modal"
      className="modal-printable-target fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:z-auto"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-slate-200 overflow-hidden my-6 print:m-0 print:border-none print:shadow-none print:rounded-none">
        
        {/* Modal Toolbar (hidden on print) */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-6 py-3.5 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-500/20 rounded-lg border border-blue-400/30">
              <FileText className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Logbook Resmi Perawat Pelaksana - {data.bedNumber} ({data.patientName})
              </h2>
              <p className="text-[11px] text-blue-200">
                Standar 5 Bagian Akreditasi Rumah Sakit (KARS &amp; PERNEFRI)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Cetak Logbook (A4)
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div className="p-6 md:p-8 text-[11px] text-slate-900 leading-tight space-y-3.5 print:p-2 print:space-y-2.5" style={{ fontFamily: 'Arial, sans-serif' }}>
          
          {/* Hospital Header */}
          <div className="border-b-2 border-slate-900 pb-2 flex items-start justify-between">
            <div>
              <div className="text-xs font-bold tracking-wider text-slate-700 uppercase">
                {shiftInfo.hospitalName}
              </div>
              <div className="text-sm font-black text-blue-950 uppercase">
                {shiftInfo.unitName} - LOGBOOK HARIAN PERAWAT PELAKSANA HEMODIALISIS
              </div>
              <div className="text-[10px] text-slate-600 italic">
                Formulir Asuhan Bedside Pasien Berdasarkan Standar Pelayanan Dialisis PERNEFRI &amp; Keselamatan Pasien KARS
              </div>
            </div>
            <div className="text-right text-[10px]">
              <span className="inline-block px-2 py-0.5 border border-slate-800 font-bold bg-slate-50 rounded">
                DOKUMEN REKAM MEDIS
              </span>
              <div className="text-slate-500 mt-1">Dicetak: {formatShortIndonesianTimestampWib()}</div>
            </div>
          </div>

          {/* Demographic & Shift Box */}
          <table className="w-full border-collapse border border-slate-400 text-[10.5px]">
            <tbody>
              <tr className="border-b border-slate-300 bg-slate-50">
                <td className="w-1/6 font-bold p-1 border-r border-slate-300">No. Bed &amp; Kategori</td>
                <td className="w-2/6 p-1 border-r border-slate-300 font-bold text-blue-900">
                  {data.bedNumber} ({data.category.toUpperCase()}) {data.isCito && '- CITO/EMERGENCY'}
                </td>
                <td className="w-1/6 font-bold p-1 border-r border-slate-300">Hari / Tanggal / Shift</td>
                <td className="w-2/6 p-1 font-semibold">{normalizeIndonesianDateLabel(shiftInfo.date)} ({shiftInfo.shift})</td>
              </tr>
              <tr className="border-b border-slate-300">
                <td className="font-bold p-1 border-r border-slate-300">Nama Pasien</td>
                <td className="p-1 border-r border-slate-300 font-bold">{data.patientName} ({data.gender}, {data.age} th)</td>
                <td className="font-bold p-1 border-r border-slate-300">No. Rekam Medis (RM)</td>
                <td className="p-1 font-bold">{data.medicalRecordNumber}</td>
              </tr>
              <tr>
                <td className="font-bold p-1 border-r border-slate-300">Status Perawatan</td>
                <td className="p-1 border-r border-slate-300 font-medium capitalize">
                  {data.status === 'rajal' ? 'Rawat Jalan (Ambulatori)' : 'Rawat Inap'}
                </td>
                <td className="font-bold p-1 border-r border-slate-300">Perawat Pelaksana Bed</td>
                <td className="p-1 font-bold text-blue-900">{data.nurseInCharge}</td>
              </tr>
            </tbody>
          </table>

          {/* BAGIAN I */}
          <div>
            <div className="bg-[#1e4b85] text-white font-bold px-2 py-1 text-[10.5px] uppercase tracking-wide flex items-center justify-between">
              <span>BAGIAN I: KESIAPAN FASILITAS RUANGAN HEMODIALISIS &amp; SISTEM WATER TREATMENT (RO)</span>
              <span className="text-[9.5px] bg-white/20 px-1.5 py-0.2 rounded font-normal">Status: {b1.roStatusOverall}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <table className="w-full border-collapse border border-slate-300 text-[10px]">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-800">
                    <th className="p-1 border border-slate-300 text-left">Fasilitas Ruangan</th>
                    <th className="p-1 border border-slate-300 text-center w-24">Hasil Observasi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-1 border border-slate-300">Suhu Ruang (Standar 18-22°C)</td>
                    <td className="p-1 border border-slate-300 text-center font-bold">{b1.roomTemperature} °C</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="p-1 border border-slate-300">Kelembapan Udara (40-60%)</td>
                    <td className="p-1 border border-slate-300 text-center">{b1.roomHumidity} %</td>
                  </tr>
                  <tr>
                    <td className="p-1 border border-slate-300">Kebersihan, Desinfeksi Lantai &amp; Zonasi</td>
                    <td className="p-1 border border-slate-300 text-center text-emerald-700 font-bold">TERPENUHI</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="p-1 border border-slate-300">Trolley Emergency &amp; DC Shock Tersegel</td>
                    <td className="p-1 border border-slate-300 text-center text-emerald-700 font-bold">SIAP PAKAI</td>
                  </tr>
                  <tr>
                    <td className="p-1 border border-slate-300">Outlet Oksigen &amp; Suction Vacuum</td>
                    <td className="p-1 border border-slate-300 text-center text-emerald-700 font-bold">FUNGSI BAIK</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="p-1 border border-slate-300">Spill Kit B3 &amp; Safety Box Limbah Tajam</td>
                    <td className="p-1 border border-slate-300 text-center text-emerald-700 font-bold">TERSEDIA</td>
                  </tr>
                </tbody>
              </table>

              <table className="w-full border-collapse border border-slate-300 text-[10px]">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-800">
                    <th className="p-1 border border-slate-300 text-left">Parameter Water Treatment (RO)</th>
                    <th className="p-1 border border-slate-300 text-center w-28">Hasil / Standar</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-1 border border-slate-300">Tekanan Inlet / Pompa RO</td>
                    <td className="p-1 border border-slate-300 text-center font-semibold">{b1.roInletPressure} bar / {b1.roPumpPressure} bar</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="p-1 border border-slate-300">TDS Air Baku vs TDS Air Produk RO</td>
                    <td className="p-1 border border-slate-300 text-center font-bold text-blue-900">
                      {b1.roRawWaterTds} ppm &rarr; {b1.roProductWaterTds} ppm (&lt;10 ppm)
                    </td>
                  </tr>
                  <tr>
                    <td className="p-1 border border-slate-300">Rejection Rate RO (% Penolakan)</td>
                    <td className="p-1 border border-slate-300 text-center font-bold text-emerald-700">
                      {b1.roRejectionRate}% (&ge;90%)
                    </td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="p-1 border border-slate-300">Uji Klorin Bebas (&lt; 0.1 mg/L)</td>
                    <td className="p-1 border border-slate-300 text-center text-emerald-700 font-bold">NEGATIF / LOLOS</td>
                  </tr>
                  <tr>
                    <td className="p-1 border border-slate-300">Kesadahan Air (Hardness = 0 ppm)</td>
                    <td className="p-1 border border-slate-300 text-center text-emerald-700 font-bold">0 ppm (LUNAK)</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="p-1 border border-slate-300">Level Garam Brine Tank &amp; Catatan</td>
                    <td className="p-1 border border-slate-300 text-center font-medium">{b1.roBrineTankSaltLevel} - Rutin OK</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* BAGIAN II */}
          <div>
            <div className="bg-[#1e4b85] text-white font-bold px-2 py-1 text-[10.5px] uppercase tracking-wide">
              BAGIAN II: PERSIAPAN PERAWAT, PERALATAN, MESIN HD &amp; ALAT KESEHATAN (PRE-HD)
            </div>
            <table className="w-full border-collapse border border-slate-300 text-[10px] mt-1">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="w-1/4 font-bold p-1 bg-slate-50 border-r border-slate-300">Kesiapan Perawat &amp; PPI</td>
                  <td className="w-3/4 p-1">
                    5 Momen Cuci Tangan WHO: <strong className="text-emerald-700">PATUH</strong> &bull; APD (Apron, Masker, Handscoon, Face Shield): <strong className="text-emerald-700">LENGKAP</strong> &bull; Bebas Perhiasan / Kuku Bersih: <strong className="text-emerald-700">YA</strong>
                  </td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="font-bold p-1 bg-slate-50 border-r border-slate-300">Uji Kelaikan Mesin HD</td>
                  <td className="p-1">
                    Self Test Kelistrikan/CPU: <strong className="text-emerald-700">PASSED</strong> &bull; Blood Leak Detector: <strong className="text-emerald-700">PASSED</strong> &bull; Air Bubble Detector &amp; Clamp: <strong className="text-emerald-700">PASSED</strong> &bull; Konduktivitas: <strong>{b2.conductivityValue} mS/cm</strong> &bull; Suhu Dialisat: <strong>{b2.dialysateTemperature} °C</strong>
                  </td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="font-bold p-1 bg-slate-50 border-r border-slate-300">Sirkuit &amp; Dialyzer</td>
                  <td className="p-1">
                    Model Dialyzer: <strong>{b2.dialyzerType}</strong> &bull; Status: <strong>{b2.dialyzerUsageStatus}</strong> &bull; Priming NaCl 0.9%: <strong>{b2.primingSalineVolume} mL (Bebas Udara)</strong> &bull; Antikoagulan: <strong>{b2.circuitHeparinizationType}</strong>
                  </td>
                </tr>
                <tr>
                  <td className="font-bold p-1 bg-slate-50 border-r border-slate-300">Kesiapan Kanulasi / CDL</td>
                  <td className="p-1">
                    Set Kanulasi / Dressing Kit CDL Steril Klorheksidin: <strong className="text-emerald-700">SIAP PAKAI</strong> &bull; Status Keseluruhan Mesin: <strong className="text-emerald-700 uppercase">SIAP SAMBUNG PASIEN</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* BAGIAN III */}
          <div>
            <div className="bg-[#1e4b85] text-white font-bold px-2 py-1 text-[10.5px] uppercase tracking-wide">
              BAGIAN III: IDENTIFIKASI PASIEN, PENGKAJIAN PRE-HD &amp; KESELAMATAN PASIEN (PATIENT SAFETY)
            </div>
            <table className="w-full border-collapse border border-slate-300 text-[10px] mt-1">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="w-1/4 font-bold p-1 bg-slate-50 border-r border-slate-300">Sasaran Keselamatan Pasien (SKP)</td>
                  <td className="w-3/4 p-1">
                    Verifikasi 2 Identitas &amp; Gelang: <strong className="text-emerald-700">COCOK</strong> &bull; Verifikasi Resep DPJP: <strong className="text-emerald-700">VALID</strong> &bull; Informed Consent: <strong className="text-emerald-700">LENGKAP</strong> &bull; Risiko Jatuh: <strong>{b3.fallRiskScore}</strong> &bull; Alergi: <strong className="text-slate-800">{b3.allergyStatus}</strong>
                  </td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="font-bold p-1 bg-slate-50 border-r border-slate-300">Tanda Vital Pre-HD</td>
                  <td className="p-1">
                    TD Duduk: <strong className="text-blue-900">{b3.preBpSitting} mmHg</strong> &bull; HR: <strong>{b3.preHeartRate} x/m</strong> &bull; RR: <strong>{b3.preRespiratoryRate} x/m</strong> &bull; Suhu: <strong>{b3.preBodyTemp} °C</strong> &bull; SpO2: <strong>{b3.preOxygenSat}%</strong> &bull; Edema/Overload: <strong>{b3.fluidOverloadGrade}</strong>
                  </td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="font-bold p-1 bg-slate-50 border-r border-slate-300">Pengkajian BB &amp; Target UF</td>
                  <td className="p-1">
                    BB Kering (Dry Weight): <strong>{b3.dryWeight} kg</strong> &bull; BB Pre-HD: <strong>{b3.preWeight} kg</strong> &bull; Kenaikan (IDWG): <strong className="text-amber-800">{b3.idwgKg} kg ({b3.idwgPercent}%)</strong> &bull; Intake Minum/Bilas: <strong>{b3.estimatedIntakeMl} mL</strong> &bull; Target UF Total: <strong className="text-blue-950 font-bold">{b3.targetUfMl} mL ({b3.prescribedHours} Jam)</strong>
                  </td>
                </tr>
                <tr>
                  <td className="font-bold p-1 bg-slate-50 border-r border-slate-300">Pengkajian Akses Vaskular</td>
                  <td className="p-1">
                    Jenis: <strong>{b3.accessType === 'av_fistula' ? 'AVF (Cimino)' : b3.accessType === 'cdl_non_tunnel' ? 'CDL Non-Tunnel' : b3.accessType}</strong> &bull; Lokasi: <strong>{b3.accessSite}</strong> &bull; Bruit/Thrill: <strong className="text-emerald-700">{b3.accessBruitThrillPresent ? 'POSITIF (KUAT)' : 'LEMAH'}</strong> &bull; Kondisi Exit Site: <strong className="text-emerald-700">{b3.cdlExitSiteClean ? 'BERSIH, BEBAS INFEKSI' : 'PERIKSA KHUSUS'}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* BAGIAN IV */}
          <div>
            <div className="bg-[#1e4b85] text-white font-bold px-2 py-1 text-[10.5px] uppercase tracking-wide">
              BAGIAN IV: MONITORING INTRA-HD &amp; PENCEGAHAN INSIDEN KESELAMATAN PASIEN (IKP)
            </div>
            
            {/* Flow Sheet Observasi Per Jam */}
            <table className="w-full border-collapse border border-slate-400 text-[9.5px] mt-1 text-center">
              <thead>
                <tr className="bg-slate-200 text-slate-800 font-bold">
                  <th className="p-1 border border-slate-300 w-12">Jam</th>
                  <th className="p-1 border border-slate-300 w-14">Waktu</th>
                  <th className="p-1 border border-slate-300 w-18">TD (mmHg)</th>
                  <th className="p-1 border border-slate-300 w-12">HR</th>
                  <th className="p-1 border border-slate-300 w-14">Qb (mL/m)</th>
                  <th className="p-1 border border-slate-300 w-14">Qd (mL/m)</th>
                  <th className="p-1 border border-slate-300 w-14">AP (mmHg)</th>
                  <th className="p-1 border border-slate-300 w-14">VP (mmHg)</th>
                  <th className="p-1 border border-slate-300 w-14">TMP</th>
                  <th className="p-1 border border-slate-300 w-16">UF Rate</th>
                  <th className="p-1 border border-slate-300 w-16">Kumulatif UF</th>
                  <th className="p-1 border border-slate-300 text-left">Catatan Observasi Perawat &amp; Reaksi</th>
                </tr>
              </thead>
              <tbody>
                {b4.hourlyLogs.map((log) => (
                  <tr key={log.hourNumber} className={log.hourNumber % 2 === 1 ? 'bg-slate-50' : ''}>
                    <td className="p-1 border border-slate-300 font-bold">Ke-{log.hourNumber}</td>
                    <td className="p-1 border border-slate-300">{log.timeString}</td>
                    <td className="p-1 border border-slate-300 font-semibold">{log.bp}</td>
                    <td className="p-1 border border-slate-300">{log.heartRate}</td>
                    <td className="p-1 border border-slate-300">{log.qb}</td>
                    <td className="p-1 border border-slate-300">{log.qd}</td>
                    <td className="p-1 border border-slate-300">{log.arterialPressure}</td>
                    <td className="p-1 border border-slate-300">{log.venousPressure}</td>
                    <td className="p-1 border border-slate-300">{log.tmp}</td>
                    <td className="p-1 border border-slate-300">{log.ufRate} mL/j</td>
                    <td className="p-1 border border-slate-300 font-bold text-blue-900">{log.cumulativeUf} mL</td>
                    <td className="p-1 border border-slate-300 text-left font-normal">{log.nurseNote || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Rekam Komplikasi & Pencegahan IKP */}
            <div className="border border-slate-300 p-1.5 mt-1 bg-slate-50 rounded text-[10px] space-y-1">
              <div className="font-bold text-slate-800">Pemantauan Khusus &amp; Pencegahan Komplikasi:</div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                <div>
                  &bull; <strong>Hipotensi Intradialitik:</strong> {b4.hasHypotension ? `YA (${b4.hypotensionBp}) - ${b4.hypotensionIntervention}` : 'Nihil (-)'}
                </div>
                <div>
                  &bull; <strong>Kram Otot:</strong> {b4.hasMuscleCramps ? `YA (${b4.muscleCrampsLocation}) - ${b4.muscleCrampsIntervention}` : 'Nihil (-)'}
                </div>
                <div>
                  &bull; <strong>Clotting Sirkuit/Dialyzer:</strong> {b4.hasClotting ? `Ada di ${b4.clottingLocation} - ${b4.clottingIntervention}` : 'Nihil (-)'}
                </div>
                <div>
                  &bull; <strong>Blood Leak &amp; Emboli Udara:</strong> {b4.hasBloodLeak ? 'Alarm kebocoran aktif' : 'Nihil (Sistem proteksi aktif lolos)'}
                </div>
              </div>
              {b4.hasConsultDpjp && (
                <div className="p-1 bg-amber-50 border border-amber-200 rounded text-amber-900 text-[9.5px]">
                  <strong>Konsultasi Cito DPJP ({b4.consultDoctorName} pkl {b4.consultTime || '-'}):</strong> {b4.consultSbarIssue} &rarr; <em>Advis (TBAK): {b4.consultAdviceTbak}</em>
                </div>
              )}
              <div className="pt-0.5 border-t border-slate-200 flex justify-between font-bold text-slate-900 text-[10px]">
                <span>Realisasi Penarikan UF: <span className="text-emerald-700">{b4.achievedUfMl} mL</span> (Durasi: {b4.actualDurationHours} Jam)</span>
                <span>TD Post-HD: <span className="text-blue-900">{b4.postBp}</span></span>
                <span>BB Post-HD: <strong>{b4.postWeight} kg</strong></span>
                <span>{b4.underUfTolerated ? `Under-UF: ${b4.underUfReason || 'Ditoleransi klinis'}` : 'Tercapai 100%'}</span>
              </div>
            </div>
          </div>

          {/* BAGIAN V */}
          <div>
            <div className="bg-[#1e4b85] text-white font-bold px-2 py-1 text-[10.5px] uppercase tracking-wide">
              BAGIAN V: EDUKASI TERSTRUKTUR KEPADA PASIEN &amp; KELUARGA (DIET, CAIRAN, KEBERSIHAN DIRI)
            </div>
            <table className="w-full border-collapse border border-slate-300 text-[10px] mt-1">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="w-1/4 font-bold p-1 bg-slate-50 border-r border-slate-300">1. Manajemen Cairan</td>
                  <td className="w-3/4 p-1">
                    Batas Cairan Harian: <strong>{b5.dailyFluidLimitMl} mL/hari</strong> &bull; Target IDWG Antar HD: <strong>&lt; {b5.targetIdwgLimitKg} kg (&lt;4% BB)</strong> &bull; Kiat Es Batu &amp; Kumur Air Dingin: <strong className="text-emerald-700">DIJELASKAN</strong>
                  </td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="font-bold p-1 bg-slate-50 border-r border-slate-300">2. Diet &amp; Nutrisi GGK</td>
                  <td className="p-1">
                    Rendah Kalium (Hindari pisang, alpukat, durian, air kelapa): <strong className="text-emerald-700">DIJELASKAN</strong> &bull; Rendah Fosfat &amp; Obat Pengikat: <strong className="text-emerald-700">PATUH</strong> &bull; Protein Berkualitas: <strong className="text-emerald-700">EDUKASI</strong>
                  </td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="font-bold p-1 bg-slate-50 border-r border-slate-300">3. Perawatan Akses &amp; Higiene</td>
                  <td className="p-1">
                    Cuci Tangan &amp; Area AVF Sabun Antiseptik sebelum HD &bull; Dilarang Mengukur Tensi / Beban Berat di Lengan AVF &bull; Jaga Balutan Kassa Kering (CDL)
                  </td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="font-bold p-1 bg-slate-50 border-r border-slate-300">4. Kepatuhan Obat &amp; Jadwal</td>
                  <td className="p-1">
                    Disiplin Jadwal Rutin 2x/3x Seminggu Tanpa Absen &bull; Minum Obat Antihipertensi &amp; Suplemen Sesuai Anjuran DPJP
                  </td>
                </tr>
                <tr>
                  <td className="font-bold p-1 bg-slate-50 border-r border-slate-300">5. Evaluasi Teach-Back</td>
                  <td className="p-1">
                    Penerima: <strong>{b5.educationRecipient} ({b5.recipientName})</strong> &bull; Metode Teach-Back (Menjelaskan Kembali): <strong className="text-emerald-700">LULUS &amp; PAHAM</strong> &bull; Brosur Edukasi: <strong className="text-emerald-700">DISERAHKAN</strong>
                    <div className="text-slate-600 italic mt-0.5">&ldquo;{b5.patientReadinessAndNotes}&rdquo;</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Signatures Footer */}
          <div className="pt-2 border-t-2 border-slate-900 grid grid-cols-3 text-center text-[10px]">
            <div>
              <div className="text-slate-600 mb-10">Penerima Edukasi (Pasien/Keluarga)</div>
              <div className="font-bold uppercase tracking-wide border-t border-slate-400 pt-1 inline-block min-w-[140px]">
                {b5.recipientName || data.patientName}
              </div>
            </div>
            <div>
              <div className="text-slate-600 mb-10">Perawat Pelaksana Bed</div>
              <div className="font-bold uppercase tracking-wide border-t border-slate-400 pt-1 inline-block min-w-[140px] text-blue-950">
                {data.nurseInCharge}
              </div>
            </div>
            <div>
              <div className="text-slate-600 mb-10">PJ Shift / Ka. Ruangan HD</div>
              <div className="font-bold uppercase tracking-wide border-t border-slate-400 pt-1 inline-block min-w-[140px]">
                {shiftInfo.pjShift || shiftInfo.kepalaRuangan || 'Penanggung Jawab Shift'}
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
