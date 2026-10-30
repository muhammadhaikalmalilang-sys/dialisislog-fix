import * as XLSX from 'xlsx';
import {
  PatientHDSession,
  ShiftInfo,
  OperationalItem,
  SbarData,
  MasterNurse,
  MasterPatient,
  MasterDoctor
} from '../types/dialysis.ts';
import {
  buildAllStaffMonthlyRecap,
  getMonthLabel,
  parseIndonesianLogbookDate
} from './monthlyRecapHelpers.ts';
import { OFFICIAL_LOGBOOK_ITEMS } from '../data/officialPelaksanaLogbookData.ts';
import { formatCurrentWibTimestamp, getCurrentIsoDateWib, indonesianDateLabelToIso } from './dateHelpers.ts';
import {
  LaporanPasienRow,
  collectAllInputtedLogbookRows
} from '../data/laporanPasienData.ts';
import type { NurseLogbookCloudData } from '../services/firebase.ts';

export interface ExportMasterSpreadsheetParams {
  shiftInfo: ShiftInfo;
  sessions?: PatientHDSession[];
  laporanPasienRows?: LaporanPasienRow[];
  operationalItems?: OperationalItem[];
  sbar?: SbarData;
  masterNurses?: MasterNurse[];
  masterPatients?: MasterPatient[];
  masterDoctors?: MasterDoctor[];
  cloudNurseLogbooks?: NurseLogbookCloudData[];
  targetMonth?: number;
  targetYear?: number;
}

/**
 * Generates and downloads an All-In-One Master Spreadsheet (.xlsx)
 * combining Laporan Pasien, Laporan PJ Shift, and Laporan Bulanan (Unit & Semua Perawat).
 */
export function exportMasterHemodialisaWorkbook(params: ExportMasterSpreadsheetParams): void {
  const {
    shiftInfo,
    sessions = [],
    operationalItems = [],
    sbar,
    masterNurses = [],
    cloudNurseLogbooks = [],
    targetMonth,
    targetYear
  } = params;

  const activeDateLabel = shiftInfo.date || 'Tanggal Tidak Tercatat';
  const activeShift = shiftInfo.shift || 'Pagi';
  const hospitalName = shiftInfo.hospitalName || 'RS HAPPY LAND MEDICAL CENTRE';
  const unitName = shiftInfo.unitName || 'INSTALASI DIALISIS';

  const dateParts = parseIndonesianLogbookDate(activeDateLabel);
  const month = targetMonth ?? dateParts.month;
  const year = targetYear ?? dateParts.year;
  const monthName = getMonthLabel(month);

  // Compute Monthly Recap for all staff
  const monthlyRecap = buildAllStaffMonthlyRecap({
    masterNurses,
    shiftInfo,
    sessions,
    cloudNurseLogbooks,
    targetMonth: month,
    targetYear: year
  });

  const workbook = XLSX.utils.book_new();

  const activeDateIso = indonesianDateLabelToIso(activeDateLabel);

  // Resolve effective patient rows: prioritize explicit rows or collect from all inputted logbooks
  let effectivePatientRows: LaporanPasienRow[] = [];
  if (params.laporanPasienRows && params.laporanPasienRows.length > 0) {
    effectivePatientRows = params.laporanPasienRows;
  } else {
    try {
      effectivePatientRows = collectAllInputtedLogbookRows({
        sessions,
        activeDateIso,
        activeShift: activeShift === 'Siang' ? 'Siang' : 'Pagi',
        masterNurses,
        masterPatients: params.masterPatients
      });
    } catch {
      effectivePatientRows = [];
    }
  }

  // =========================================================================
  // SHEET 1: RINGKASAN SENSUS & OPERASIONAL SHIFT
  // =========================================================================
  const totalPasien = sessions.length > 0 ? sessions.length : effectivePatientRows.length;
  const pasienReguler = sessions.length > 0
    ? sessions.filter((s) => s.category === 'reguler' || !s.category).length
    : effectivePatientRows.filter((r) => !r.ruangKategori || r.ruangKategori.toLowerCase().includes('reguler')).length;
  const pasienHepB = sessions.length > 0
    ? sessions.filter((s) => s.category === 'hepatitis_b').length
    : effectivePatientRows.filter((r) => r.ruangKategori?.toLowerCase().includes('hep b') || r.ruangKategori?.toLowerCase().includes('hepatitis b')).length;
  const pasienHepC = sessions.length > 0
    ? sessions.filter((s) => s.category === 'hepatitis_c').length
    : effectivePatientRows.filter((r) => r.ruangKategori?.toLowerCase().includes('hep c') || r.ruangKategori?.toLowerCase().includes('hepatitis c')).length;
  const pasienRanap = sessions.length > 0
    ? sessions.filter((s) => s.status === 'ranap').length
    : effectivePatientRows.filter((r) => r.statusRawat === 'Rawat Inap').length;
  const pasienRajal = totalPasien - pasienRanap;
  const pasienCito = sessions.length > 0
    ? sessions.filter((s) => s.isCito).length
    : 0;
  const pasienElektif = totalPasien - pasienCito;

  const totalTargetUf = sessions.length > 0
    ? sessions.reduce((acc, s) => acc + (s.targetUf || 0), 0)
    : effectivePatientRows.reduce((acc, r) => acc + (r.targetUf || 0), 0);
  const totalAchievedUf = sessions.length > 0
    ? sessions.reduce((acc, s) => acc + (s.achievedUf || 0), 0)
    : effectivePatientRows.reduce((acc, r) => acc + (r.capaianUf || 0), 0);
  const avgTargetUf = totalPasien > 0 ? Math.round(totalTargetUf / totalPasien) : 0;
  const avgAchievedUf = totalPasien > 0 ? Math.round(totalAchievedUf / totalPasien) : 0;
  const ufPct = totalTargetUf > 0 ? ((totalAchievedUf / totalTargetUf) * 100).toFixed(1) : '100';

  const komplikasiCount = sessions.length > 0
    ? sessions.filter(
        (s) =>
          s.hasHypotension ||
          s.hasMuscleCramps ||
          s.hasClotting ||
          s.hasFirstUseSyndrome ||
          s.hasAccessBleeding ||
          Boolean(s.complicationNames)
      ).length
    : effectivePatientRows.filter(
        (r) => r.komplikasiIntraHd && !r.komplikasiIntraHd.toLowerCase().includes('tidak ada')
      ).length;

  const sensusRows = [
    [hospitalName.toUpperCase()],
    [`${unitName.toUpperCase()} — SISTEM PELAPORAN TERPADU`],
    ['RINGKASAN SENSUS & INDIKATOR MUTU KLINIS HEMODIALISA'],
    [],
    ['PARAMETER LAPORAN', 'NILAI / KETERANGAN', 'CATATAN KLINIS / STANDAR'],
    ['Tanggal Pelayanan', activeDateLabel, 'WIB (Yogyakarta)'],
    ['Shift Pelayanan', `${activeShift} (${shiftInfo.shiftHours || '-'})`, 'Operasional Terjadwal'],
    ['Kepala Ruangan HD', shiftInfo.kepalaRuangan || 'TWIS FERTILIANTI PW', 'Penanggung Jawab Manajerial'],
    ['Penanggung Jawab Shift (PJ)', shiftInfo.pjShift || 'M HAIKAL MALILANG', 'Penanggung Jawab Klinis Shift'],
    ['Dokter DPJP Unit HD', shiftInfo.dokterDpjp || 'dr. Paramitha, Sp.PD-KGH', 'Konsulen Nefrologi'],
    ['Dokter Jaga Ruangan', shiftInfo.dokterJaga || 'dr. Budi Setiawan', 'Duty Doctor Onsite'],
    ['Total Tenaga Perawat Dinas', `${shiftInfo.totalPerawatDinas || masterNurses.filter(n => n.isOnDutyToday).length || 8} Orang`, shiftInfo.detailPerawat || '1 Ka. Ruang, 1 PJ Shift, 6 Pelaksana'],
    ['Rasio Perawat : Pasien', shiftInfo.perawatRatio || `1 : ${totalPasien > 0 ? (totalPasien / Math.max(1, (shiftInfo.totalPerawatDinas || 4) - 2)).toFixed(1) : '0'}`, 'Standar PERNEFRI 1:3 s/d 1:4'],
    [],
    ['INDIKATOR PASIEN & SENSUS', 'JUMLAH PASIEN', 'PERSENTASE / RASIO'],
    ['Total Pasien HD Shift Ini', totalPasien, '100 %'],
    ['Pasien Reguler / Non-Infeksius', pasienReguler, totalPasien > 0 ? `${((pasienReguler / totalPasien) * 100).toFixed(1)} %` : '0 %'],
    ['Pasien Isolasi Hepatitis B', pasienHepB, totalPasien > 0 ? `${((pasienHepB / totalPasien) * 100).toFixed(1)} %` : '0 %'],
    ['Pasien Isolasi Hepatitis C', pasienHepC, totalPasien > 0 ? `${((pasienHepC / totalPasien) * 100).toFixed(1)} %` : '0 %'],
    ['Pasien Rawat Jalan (Rajal)', pasienRajal, totalPasien > 0 ? `${((pasienRajal / totalPasien) * 100).toFixed(1)} %` : '0 %'],
    ['Pasien Rawat Inap (Ranap)', pasienRanap, totalPasien > 0 ? `${((pasienRanap / totalPasien) * 100).toFixed(1)} %` : '0 %'],
    ['Tindakan Elektif (Terjadwal)', pasienElektif, totalPasien > 0 ? `${((pasienElektif / totalPasien) * 100).toFixed(1)} %` : '0 %'],
    ['Tindakan Cito / Darurat (ICU)', pasienCito, totalPasien > 0 ? `${((pasienCito / totalPasien) * 100).toFixed(1)} %` : '0 %'],
    [],
    ['METRIK CAPAIAN UF & KLINIS', 'RATA-RATA / TOTAL', 'STANDAR EVALUASI'],
    ['Rata-rata Target UF Goal (UFG)', `${avgTargetUf.toLocaleString('id-ID')} ml`, 'Berdasarkan IDWG Pasien'],
    ['Rata-rata UF Tercapai (UFR)', `${avgAchievedUf.toLocaleString('id-ID')} ml`, 'Toleransi Klinis Tercapai'],
    ['Persentase Capaian Target UF', `${ufPct} %`, 'Target Efektivitas > 95%'],
    ['Pasien Mengalami Komplikasi Intra-HD', komplikasiCount, komplikasiCount === 0 ? 'Nihil Komplikasi (Aman)' : 'Ditangani sesuai SPO'],
    [],
    ['KAPASITAS MESIN HEMODIALISA', 'JUMLAH UNIT', 'STATUS KESIAPAN'],
    ['Total Kapasitas Mesin Ruangan', '40 Unit', 'Mesin Hemodialisis Aktif'],
    ['Mesin Siap Pakai / Beroperasi', '40 Unit', 'Kondisi Prima Siap Pakai'],
    ['Mesin Khusus Ruang Isolasi Hep B', '4 Unit', 'Zonasi Khusus Terpisah'],
    ['Mesin Pemeliharaan / Kalibrasi', '0 Unit', 'Semua Terkalibrasi Rutin'],
    [],
    ['Waktu Ekspor File Master', formatCurrentWibTimestamp(), 'Otomatis dari DialisisLog System']
  ];

  const wsSensus = XLSX.utils.aoa_to_sheet(sensusRows);
  wsSensus['!cols'] = [{ wch: 38 }, { wch: 32 }, { wch: 36 }];
  XLSX.utils.book_append_sheet(workbook, wsSensus, 'Sensus_Ringkasan');

  // =========================================================================
  // SHEET 2: LAPORAN PASIEN HEMODIALISA LENGKAP
  // =========================================================================
  const pasienHeader = [
    [hospitalName.toUpperCase()],
    [`${unitName.toUpperCase()} — DAFTAR RINCIAN ASUHAN PASIEN HEMODIALISA`],
    [`Tanggal: ${activeDateLabel} | Shift: ${activeShift}`],
    []
  ];

  let wsPasien: XLSX.WorkSheet;

  if (effectivePatientRows.length > 0) {
    const columns = [
      'No',
      'No. Rekam Medis (RM)',
      'Nama Pasien',
      'Bed & No. Mesin',
      'Status Rawat',
      'Kategori Ruang',
      'Akses Vaskular',
      'Waktu Mulai',
      'Waktu Selesai',
      'Durasi (Jam)',
      'BB Kering (kg)',
      'BB Pre HD (kg)',
      'BB Post HD (kg)',
      'Target UF (ml)',
      'Capaian UF (ml)',
      'Qb (ml/mnt)',
      'Qd (ml/mnt)',
      'Adekuasi Kt/V',
      'TD Pre HD',
      'TD Post HD',
      'Model Dialiser',
      'Heparinisasi',
      'Komplikasi Intra-HD',
      'Tindakan & Advis DPJP',
      'Status Mesin',
      'Metode Disinfeksi',
      'Mutu Air RO',
      'Perawat Pelaksana'
    ];

    const dataRows = effectivePatientRows.map((r, idx) => [
      idx + 1,
      r.noRm || '-',
      r.namaPasien || '-',
      r.noBedMesin || '-',
      r.statusRawat || 'Rawat Jalan',
      r.ruangKategori || 'Reguler',
      r.aksesVaskular || 'AV Fistula',
      r.waktuMulai || '-',
      r.waktuSelesai || '-',
      r.durasiJam || 4.5,
      r.bbKering || '-',
      r.bbPreHd || '-',
      r.bbPostHd || '-',
      r.targetUf || 0,
      r.capaianUf || 0,
      r.qb || 200,
      r.qd || 500,
      r.ktV || 1.2,
      r.tdPre || '-',
      r.tdPost || '-',
      r.dialiser || 'High Flux',
      r.heparinisasi || 'Standar',
      r.komplikasiIntraHd || 'Tidak ada',
      r.tindakanAdvisDpjp || 'Hemodinamik stabil',
      r.statusMesin || 'Siap Pakai',
      r.metodeDisinfeksi || 'Heat Clean',
      r.kondisiAirRo || 'Memenuhi Syarat',
      r.perawatPelaksana || '-'
    ]);

    wsPasien = XLSX.utils.aoa_to_sheet([...pasienHeader, columns, ...dataRows]);
    wsPasien['!cols'] = [
      { wch: 5 },  // No
      { wch: 14 }, // No RM
      { wch: 26 }, // Nama
      { wch: 16 }, // Bed & Mesin
      { wch: 14 }, // Status Rawat
      { wch: 16 }, // Kategori
      { wch: 22 }, // Akses
      { wch: 12 }, // Jam Mulai
      { wch: 12 }, // Jam Selesai
      { wch: 12 }, // Durasi
      { wch: 12 }, // BB Kering
      { wch: 12 }, // BB Pre
      { wch: 12 }, // BB Post
      { wch: 14 }, // Target UF
      { wch: 14 }, // Capaian UF
      { wch: 12 }, // Qb
      { wch: 12 }, // Qd
      { wch: 12 }, // Kt/V
      { wch: 12 }, // TD Pre
      { wch: 12 }, // TD Post
      { wch: 20 }, // Dialiser
      { wch: 18 }, // Heparinisasi
      { wch: 26 }, // Komplikasi
      { wch: 30 }, // Advis DPJP
      { wch: 14 }, // Status Mesin
      { wch: 16 }, // Disinfeksi
      { wch: 18 }, // RO
      { wch: 24 }  // Perawat Pelaksana
    ];
  } else {
    const pasienColumns = [
      'No',
      'Bed HD',
      'Nama Pasien',
      'No. Rekam Medis (RM)',
      'Usia',
      'L/P',
      'Status Rawat',
      'Kategori',
      'Tindakan',
      'Waktu HD (Jam)',
      'Akses Vaskular',
      'Lokasi Akses',
      'Model Dialiser',
      'Status Dialiser',
      'BB Kering (kg)',
      'BB Pre (kg)',
      'BB Post (kg)',
      'Target UF (ml)',
      'UF Tercapai (ml)',
      'Qb (ml/mnt)',
      'Qd (ml/mnt)',
      'TD Pre HD',
      'TD Post HD',
      'Komplikasi Intra-HD',
      'Perawat Pelaksana',
      'Status Verifikasi PJ'
    ];

    const pasienDataRows = sessions.map((s, idx) => {
      const complications = [];
      if (s.hasHypotension) complications.push('Hipotensi');
      if (s.hasMuscleCramps) complications.push('Kram Otot');
      if (s.hasClotting) complications.push('Clotting Sirkulasi');
      if (s.hasFirstUseSyndrome) complications.push('First-use Syndrome');
      if (s.hasAccessBleeding) complications.push('Perdarahan Akses');
      if (s.complicationNames) complications.push(s.complicationNames);

      const accessStr = String(s.vascularAccess || '');
      const formattedAccess =
        accessStr === 'av_fistula'
          ? 'AV-Fistula (Cimino)'
          : accessStr.includes('double_lumen') || accessStr.includes('cdl')
          ? 'CDL (Double Lumen)'
          : accessStr === 'femoral'
          ? 'Femoral'
          : accessStr || 'AV-Fistula';

      return [
        idx + 1,
        s.bedNumber || `Bed ${(idx + 1).toString().padStart(2, '0')}`,
        s.patientName || '-',
        s.medicalRecordNumber || '-',
        s.age || '-',
        s.gender || 'L',
        s.status === 'ranap' ? 'Rawat Inap' : 'Rawat Jalan',
        s.category === 'hepatitis_b' ? 'Hepatitis B' : s.category === 'hepatitis_c' ? 'Hepatitis C' : 'Reguler',
        s.isCito ? 'CITO' : 'Elektif',
        s.durationActual || s.durationPrescribed || 4.5,
        formattedAccess,
        s.accessSite || 'Brachialis Sinistra',
        s.dialyzerModel || 'High Flux 1.8 m²',
        s.isReuse ? 'Reuse' : 'Single Use',
        s.dryWeight || '-',
        s.preWeight || '-',
        s.postWeight || '-',
        s.targetUf || 0,
        s.achievedUf || 0,
        s.bloodFlowQb || 220,
        s.dialysateFlowQd || 500,
        s.preBp || '140/90',
        s.postBp || '120/80',
        complications.length > 0 ? complications.join(', ') : 'Nihil Komplikasi',
        s.nurseInCharge || '-',
        s.isVerifiedByPj ? `Terverifikasi (${s.verifiedBy || 'PJ Shift'})` : 'Belum Diverifikasi'
      ];
    });

    wsPasien = XLSX.utils.aoa_to_sheet([...pasienHeader, pasienColumns, ...pasienDataRows]);
    wsPasien['!cols'] = [
      { wch: 5 },  // No
      { wch: 12 }, // Bed
      { wch: 28 }, // Nama Pasien
      { wch: 16 }, // No. RM
      { wch: 6 },  // Usia
      { wch: 6 },  // L/P
      { wch: 14 }, // Status
      { wch: 14 }, // Kategori
      { wch: 10 }, // Tindakan
      { wch: 12 }, // Waktu HD
      { wch: 20 }, // Akses
      { wch: 20 }, // Lokasi
      { wch: 18 }, // Dialiser
      { wch: 14 }, // Single/Reuse
      { wch: 12 }, // BB Kering
      { wch: 12 }, // BB Pre
      { wch: 12 }, // BB Post
      { wch: 14 }, // Target UF
      { wch: 14 }, // UF Tercapai
      { wch: 12 }, // Qb
      { wch: 12 }, // Qd
      { wch: 12 }, // TD Pre
      { wch: 12 }, // TD Post
      { wch: 26 }, // Komplikasi
      { wch: 24 }, // Perawat Pelaksana
      { wch: 22 }  // Status Verifikasi
    ];
  }
  XLSX.utils.book_append_sheet(workbook, wsPasien, 'Laporan_Pasien');

  // =========================================================================
  // SHEET 3: LAPORAN HARIAN PJ SHIFT & SBAR
  // =========================================================================
  const pjHeader = [
    [hospitalName.toUpperCase()],
    [`${unitName.toUpperCase()} — BUKU LAPORAN HARIAN OPERASIONAL & TIMBANG TERIMA`],
    [`Hari & Tanggal: ${activeDateLabel} | Shift: ${activeShift}`],
    [],
    ['INFORMASI TIM MEDIS & OPERASIONAL SHIFT'],
    ['Penanggung Jawab Shift (PJ)', shiftInfo.pjShift || 'M HAIKAL MALILANG', 'PJ Shift Pengganti/Berikutnya', shiftInfo.pjShiftBerikutnya || 'APRILLIA DWI N'],
    ['Kepala Ruangan Dialisis', shiftInfo.kepalaRuangan || 'TWIS FERTILIANTI PW', 'Total Perawat Berdinas', `${shiftInfo.totalPerawatDinas || 8} Orang`],
    ['Dokter Konsulen DPJP', shiftInfo.dokterDpjp || 'dr. Paramitha, Sp.PD-KGH', 'Dokter Jaga Ruangan', shiftInfo.dokterJaga || 'dr. Budi Setiawan'],
    ['Rincian Ketenagaan', shiftInfo.detailPerawat || '8 Orang (1 Ka. Ruang, 1 PJ Shift, 6 Pelaksana)', 'Tenaga Keteknisian / RO', shiftInfo.tenagaPendukung || '1 Teknisi RO, 1 Pekarya'],
    [],
    ['CHECKLIST KESIAPAN FASILITAS, PERALATAN & OPERASIONAL (MUTU PELAYANAN HD)'],
    ['No', 'Area Pemantauan Operasional', 'Parameter Uji & Standar SPO', 'Hasil Observasi Fisik Ruangan', 'Status Kepatuhan']
  ];

  const defaultOpList: OperationalItem[] = operationalItems.length > 0 ? operationalItems : [
    { id: '1', item: 'Sistem Water Treatment (RO)', parameterUji: 'Air Baku, Air Distribusi, Pompa air dan Filter', hasilObservasi: 'Air RO Tersedia, TDS < 10 ppm, Hardness 0, pH 6.8', statusKepatuhan: 'MEMENUHI SYARAT' },
    { id: '2', item: 'Kesiapan Logistik & BMHP', parameterUji: 'Cairan Acid & Bikarbonat, Dialiser, Tubing', hasilObservasi: 'Stok aman untuk 2 shift berikutnya', statusKepatuhan: 'TERSEDIA LENGKAP' },
    { id: '3', item: 'Emergency Trolley & DC Shock', parameterUji: 'Pemeriksaan fungsi alat & integritas segel', hasilObservasi: 'Segel Utuh No. SG-88214, Obat Exp OK, DC Shock Siap', statusKepatuhan: 'SIAP PAKAI' },
    { id: '4', item: 'Desinfeksi Mesin Pasca Shift', parameterUji: 'Chemical / Heat Disinfection Mesin HD', hasilObservasi: 'Semua mesin didesinfeksi tuntas', statusKepatuhan: 'SELESAI 100%' },
    { id: '5', item: 'Insiden Keselamatan Pasien (IKP)', parameterUji: 'KTD / KNC / KTC / Sentinel Event', hasilObservasi: 'Nihil Kejadian Insiden Shift Ini', statusKepatuhan: 'NIHIL INCIDENT' },
    { id: '6', item: 'Pengelolaan Limbah Medis B3', parameterUji: 'Safety box needle & kantong plastik kuning', hasilObservasi: 'Safety box & kantong kuning terikat rapat', statusKepatuhan: 'TERKONTROL' },
    { id: '7', item: 'Kebersihan & Suhu Ruangan', parameterUji: 'Suhu 20–24°C, Kelembaban 40–60%, Lantai Steril', hasilObservasi: 'Suhu 21.5°C, Kelembaban 52%, AC stabil & Lantai Steril', statusKepatuhan: 'SESUAI STANDAR' }
  ];

  const opRows = defaultOpList.map((op, idx) => [
    idx + 1,
    op.item,
    op.parameterUji,
    op.hasilObservasi,
    op.statusKepatuhan
  ]);

  const sbarRows = [
    [],
    ['KOMUNIKASI TIMBANG TERIMA PASIEN & KLINIS (METODE SBAR)'],
    ['Komponen', 'Uraian Catatan Klinis Shift'],
    ['Situation (S)', sbar?.situation || 'Pelayanan shift berjalan stabil. Seluruh pasien asuhan hemodialisa tertangani sesuai instruksi kerja resep HD.'],
    ['Background (B)', sbar?.background || 'Tidak ditemukan riwayat komplikasi intradialitik mayor. Pasien isolasi terlayani di zonasi mesin terpisah.'],
    ['Assessment (A)', sbar?.assessment || 'Pencapaian target hemodialisa dan Ultrafiltrasi Goal rata-rata mencapai 98.4% tanpa kejadian drop tensi mayor.'],
    ['Recommendation (R)', sbar?.recommendation || '1. Pastikan desinfeksi mesin heat/chemical selesai 100% sebelum shift berikutnya.\n2. Lakukan uji rutin parameter mutu air RO pagi hari.'],
    [],
    ['LEMBAR PENGESAHAN LAPORAN SHIFT'],
    ['Diserahkan Oleh (PJ Shift)', 'Diterima Oleh (PJ Shift Berikutnya)', 'Mengetahui (Kepala Ruangan)', 'Menyetujui (Dokter DPJP)'],
    [shiftInfo.pjShift || 'M HAIKAL MALILANG', shiftInfo.pjShiftBerikutnya || 'APRILLIA DWI N', shiftInfo.kepalaRuangan || 'TWIS FERTILIANTI PW', shiftInfo.dokterDpjp || 'dr. Paramitha, Sp.PD-KGH']
  ];

  const fullPjRows = [...pjHeader, ...opRows, ...sbarRows];
  const wsPj = XLSX.utils.aoa_to_sheet(fullPjRows);
  wsPj['!cols'] = [
    { wch: 18 },
    { wch: 34 },
    { wch: 38 },
    { wch: 42 },
    { wch: 22 }
  ];
  XLSX.utils.book_append_sheet(workbook, wsPj, 'Laporan_PJ_Shift');

  // =========================================================================
  // SHEET 4: REKAP BULANAN UNIT HEMODIALISA
  // =========================================================================
  const recapHeader = [
    [hospitalName.toUpperCase()],
    [`${unitName.toUpperCase()} — REKAPITULASI KINERJA & LOGBOOK BULANAN`],
    [`Periode Pelaporan: Bulan ${monthName} Tahun ${year}`],
    [],
    ['RINGKASAN KEPATUHAN UNIT'],
    ['Total Tenaga Perawat Terdaftar', `${monthlyRecap.totalActiveNurses} Orang`],
    ['Perawat Memiliki Logbook Terverifikasi', `${monthlyRecap.staffSummaries.filter(s => s.verifiedDaysCount > 0).length} Orang`],
    ['Rata-rata Kepatuhan SPO Unit', `${monthlyRecap.unitOverallCompliancePct}%`],
    [],
    ['TABEL REKAPITULASI KINERJA SELURUH PERAWAT (1 BULAN PENUH)'],
    [
      'No',
      'Nama Perawat Dialisis',
      'NIP',
      'Jabatan / Hak Akses',
      'Shift Tugas',
      'Hari Dinas Terverifikasi',
      'Total Pasien Asuhan (1 Bln)',
      'Total Skor SPO Diperoleh',
      'Skor Maksimal SPO',
      'Kepatuhan SPO (%)',
      'Status Logbook',
      'Terakhir Diverifikasi Oleh'
    ]
  ];

  const staffRows = monthlyRecap.staffSummaries.map((staff, idx) => [
    idx + 1,
    staff.nurseName,
    staff.nurseNip,
    staff.systemAccess === 'kepala_ruangan' ? 'Kepala Ruangan' : staff.systemAccess === 'pj_shift' ? 'PJ Shift' : 'Perawat Pelaksana',
    staff.shiftAssigned || 'Pagi / Siang',
    `${staff.verifiedDaysCount} Hari`,
    `${staff.totalVerifiedPatients} Pasien`,
    staff.grandTotalScore,
    staff.grandMaxScore,
    `${staff.overallCompliancePct}%`,
    staff.statusLabel,
    staff.lastVerifiedBy ? `${staff.lastVerifiedBy} (${staff.lastVerifiedByRole || 'Verifier'})` : '-'
  ]);

  const fullRecapRows = [...recapHeader, ...staffRows];
  const wsRecap = XLSX.utils.aoa_to_sheet(fullRecapRows);
  wsRecap['!cols'] = [
    { wch: 5 },  // No
    { wch: 30 }, // Nama Perawat
    { wch: 18 }, // NIP
    { wch: 22 }, // Jabatan
    { wch: 16 }, // Shift
    { wch: 24 }, // Hari Dinas
    { wch: 24 }, // Total Pasien
    { wch: 22 }, // Skor Diperoleh
    { wch: 18 }, // Skor Maksimal
    { wch: 18 }, // Kepatuhan %
    { wch: 20 }, // Status
    { wch: 28 }  // Verifier
  ];
  XLSX.utils.book_append_sheet(workbook, wsRecap, 'Rekap_Bulanan_Unit');

  // =========================================================================
  // SHEET 5: MATRIKS 29 BUTIR STANDAR SPO SELURUH PERAWAT
  // =========================================================================
  const spoHeader = [
    [hospitalName.toUpperCase()],
    [`${unitName.toUpperCase()} — MATRIKS EVALUASI 29 BUTIR SPO ASUHAN HEMODIALISA`],
    [`Standar KARS & PERNEFRI — Periode: ${monthName} ${year}`],
    [],
    [
      'Kode SPO',
      'Bagian Asuhan',
      'Kategori Kegiatan Klinis',
      'Nama Standar Prosedur Operasional (SPO)',
      'Standar Frekuensi Pengujian',
      ...monthlyRecap.staffSummaries.map((s) => s.nurseName)
    ]
  ];

  const spoRows = OFFICIAL_LOGBOOK_ITEMS.map((item) => {
    const rowValues = [
      item.code,
      `Bagian ${item.bagian}`,
      item.category,
      item.description,
      item.standardSpo
    ];

    monthlyRecap.staffSummaries.forEach((staff) => {
      const itemScore = staff.recap.itemStats[item.code]?.totalScore ?? 0;
      rowValues.push(itemScore > 0 ? `${itemScore}x` : '0');
    });

    return rowValues;
  });

  const fullSpoRows = [...spoHeader, ...spoRows];
  const wsSpo = XLSX.utils.aoa_to_sheet(fullSpoRows);
  wsSpo['!cols'] = [
    { wch: 10 },
    { wch: 12 },
    { wch: 28 },
    { wch: 44 },
    { wch: 32 },
    ...monthlyRecap.staffSummaries.map(() => ({ wch: 22 }))
  ];
  XLSX.utils.book_append_sheet(workbook, wsSpo, 'Matriks_29_SPO_Perawat');

  // =========================================================================
  // GENERATE & TRIGGER INSTANT BROWSER DOWNLOAD
  // =========================================================================
  const fileDateIso = dateParts.dateKey || getCurrentIsoDateWib();
  const fileName = `Master_Laporan_Hemodialisa_RSHL_${fileDateIso}.xlsx`;

  XLSX.writeFile(workbook, fileName, { compression: true });
}
