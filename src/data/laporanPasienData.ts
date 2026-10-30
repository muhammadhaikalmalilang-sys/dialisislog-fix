import { PatientHDSession, ShiftInfo, MasterNurse, MasterPatient } from '../types/dialysis.ts';
import {
  getNurseStorageKey,
  getNurseManagedPatientsKey,
  getNurseClinicalDetailsKey,
  getNurseShiftScheduleKey
} from '../utils/nurseVerificationHelpers.ts';
import {
  normalizePatientClinicalDetails,
  parseClinicalNumber,
  formatAksesVaskularStandard,
  resolveSessionAccessFromPoin3_6,
  resolveSessionComplicationsFromPoin4_3
} from '../utils/logbookClinicalHelpers.ts';
import { indonesianDateLabelToIso } from '../utils/dateHelpers.ts';

export interface LaporanPasienRow {
  id: string;
  no: number;
  // DATA IDENTITAS & STATUS PASIEN
  noRm: string;
  namaPasien: string;
  statusRawat: 'Rawat Jalan' | 'Rawat Inap';
  ruangKategori: string; // 'Reguler' | 'Isolasi Hep B' | 'Isolasi Hep C'
  // PENGATURAN TEKNIS & PRE-HD
  noBedMesin: string; // e.g. 'Bed 01 / M-01'
  aksesVaskular: string; // e.g. 'AV Fistula Brachial (D)'
  waktuMulai: string; // '07:30'
  waktuSelesai: string; // '12:00'
  durasiJam: number; // 4.5
  // PARAMETER BERAT BADAN & ALIRAN (QB/QD)
  bbKering: number; // 62.0
  bbPreHd: number; // 65.2
  bbPostHd: number; // 62.1
  qb: number; // 250
  qd: number; // 500
  // MONITORING ULTRAFILTRASI & ADEKUASI
  targetUf: number; // 3200
  ktV: number; // 1.42
  capaianUf: number; // 3150
  // TANDA VITAL (HEMODINAMIK)
  tdPre: string; // '150/90'
  tdPost: string; // '130/80'
  // SPESIFIKASI DIALISER & HEPARINISASI
  dialiser: string; // 'High Flux (SAS HF 18)'
  heparinisasi: string; // 'Standar (5000 IU)'
  // KOMPLIKASI, TATALAKSANA & ADVIS DPJP
  komplikasiIntraHd: string; // 'Tidak ada'
  tindakanAdvisDpjp: string; // 'HD lancar toleransi baik, hemostasis 10 mnt'
  // STATUS OPERASIONAL MESIN & DISINFEKSI
  statusMesin: string; // 'Siap Pakai'
  metodeDisinfeksi: string; // 'Heat Clean' | 'Chemical Clean'
  ketTeknis: string; // 'Normal' | 'Khusus Hep B' | 'Khusus Hep C'
  // STATUS MUTU WATER TREATMENT RO
  jamCekRo: string; // '06:30'
  kondisiAirRo: string; // 'Memenuhi Syarat'
  // PERAWAT PELAKSANA
  perawatPelaksana: string; // 'Ns. Annisa F'
}

export const BENCHMARK_LAPORAN_PASIEN_ROWS: LaporanPasienRow[] = [
  {
    id: 'lp-01',
    no: 1,
    noRm: '452101',
    namaPasien: 'Tn. Agus Sumpeno',
    statusRawat: 'Rawat Jalan',
    ruangKategori: 'Reguler',
    noBedMesin: 'Bed 01 / M-01',
    aksesVaskular: 'AV SHUNT',
    waktuMulai: '07:30',
    waktuSelesai: '12:00',
    durasiJam: 4.5,
    bbKering: 62.0,
    bbPreHd: 65.2,
    bbPostHd: 62.1,
    qb: 250,
    qd: 500,
    targetUf: 3200,
    ktV: 1.42,
    capaianUf: 3150,
    tdPre: '150/90',
    tdPost: '130/80',
    dialiser: 'High Flux (SAS HF 18)',
    heparinisasi: 'Standar (5000 IU)',
    komplikasiIntraHd: 'Tidak ada',
    tindakanAdvisDpjp: 'HD lancar toleransi baik, hemostasis 10 mnt',
    statusMesin: 'Siap Pakai',
    metodeDisinfeksi: 'Heat Clean',
    ketTeknis: 'Normal',
    jamCekRo: '06:30',
    kondisiAirRo: 'Memenuhi Syarat',
    perawatPelaksana: 'Ns. Annisa F'
  },
  {
    id: 'lp-02',
    no: 2,
    noRm: '452102',
    namaPasien: 'Tn. Anang Suseto',
    statusRawat: 'Rawat Jalan',
    ruangKategori: 'Reguler',
    noBedMesin: 'Bed 02 / M-02',
    aksesVaskular: 'AV SHUNT',
    waktuMulai: '07:30',
    waktuSelesai: '12:00',
    durasiJam: 4.5,
    bbKering: 50.0,
    bbPreHd: 52.4,
    bbPostHd: 50.2,
    qb: 200,
    qd: 500,
    targetUf: 2400,
    ktV: 1.38,
    capaianUf: 2400,
    tdPre: '140/85',
    tdPost: '125/80',
    dialiser: 'High Flux (SAS HF 18)',
    heparinisasi: 'Standar (4000 IU)',
    komplikasiIntraHd: 'Kram Otot',
    tindakanAdvisDpjp: 'Masase betis, peregangan, bolus NaCl 100cc, UF turun',
    statusMesin: 'Siap Pakai',
    metodeDisinfeksi: 'Heat Clean',
    ketTeknis: 'Normal',
    jamCekRo: '06:30',
    kondisiAirRo: 'Memenuhi Syarat',
    perawatPelaksana: 'Ns. Annisa F'
  },
  {
    id: 'lp-03',
    no: 3,
    noRm: '452103',
    namaPasien: 'Ny. Ari Idawati',
    statusRawat: 'Rawat Jalan',
    ruangKategori: 'Reguler',
    noBedMesin: 'Bed 03 / M-03',
    aksesVaskular: 'CDL',
    waktuMulai: '07:35',
    waktuSelesai: '12:05',
    durasiJam: 4.5,
    bbKering: 68.0,
    bbPreHd: 71.5,
    bbPostHd: 68.2,
    qb: 220,
    qd: 500,
    targetUf: 3500,
    ktV: 1.35,
    capaianUf: 3500,
    tdPre: '160/95',
    tdPost: '135/85',
    dialiser: 'High Flux (SAS HF 18)',
    heparinisasi: 'Dosis Rendah (3000 IU)',
    komplikasiIntraHd: 'Tidak ada',
    tindakanAdvisDpjp: 'Dress CDL transparan steril, exit site tenang',
    statusMesin: 'Siap Pakai',
    metodeDisinfeksi: 'Heat Clean',
    ketTeknis: 'Normal',
    jamCekRo: '06:30',
    kondisiAirRo: 'Memenuhi Syarat',
    perawatPelaksana: 'Ns. Annisa F'
  },
  {
    id: 'lp-04',
    no: 4,
    noRm: '452104',
    namaPasien: 'Tn. Astho Widodo',
    statusRawat: 'Rawat Jalan',
    ruangKategori: 'Reguler',
    noBedMesin: 'Bed 04 / M-04',
    aksesVaskular: 'AV SHUNT',
    waktuMulai: '07:40',
    waktuSelesai: '12:10',
    durasiJam: 4.5,
    bbKering: 47.0,
    bbPreHd: 48.8,
    bbPostHd: 47.0,
    qb: 200,
    qd: 500,
    targetUf: 1800,
    ktV: 1.45,
    capaianUf: 1800,
    tdPre: '130/80',
    tdPost: '120/75',
    dialiser: 'High Flux (SAS HF 18)',
    heparinisasi: 'Standar (4000 IU)',
    komplikasiIntraHd: 'Tidak ada',
    tindakanAdvisDpjp: 'Edukasi pembatasan cairan dan diit rendah garam',
    statusMesin: 'Siap Pakai',
    metodeDisinfeksi: 'Heat Clean',
    ketTeknis: 'Normal',
    jamCekRo: '06:30',
    kondisiAirRo: 'Memenuhi Syarat',
    perawatPelaksana: 'Ns. Annisa F'
  },
  {
    id: 'lp-05',
    no: 5,
    noRm: '452105',
    namaPasien: 'Sdr. Brian Prima Sineleyan',
    statusRawat: 'Rawat Jalan',
    ruangKategori: 'Reguler',
    noBedMesin: 'Bed 05 / M-05',
    aksesVaskular: 'AV SHUNT',
    waktuMulai: '07:40',
    waktuSelesai: '12:10',
    durasiJam: 4.5,
    bbKering: 55.0,
    bbPreHd: 58.0,
    bbPostHd: 55.3,
    qb: 250,
    qd: 500,
    targetUf: 3000,
    ktV: 1.40,
    capaianUf: 3000,
    tdPre: '145/90',
    tdPost: '130/80',
    dialiser: 'High Flux (SAS HF 18)',
    heparinisasi: 'Standar (5000 IU)',
    komplikasiIntraHd: 'Tidak ada',
    tindakanAdvisDpjp: 'Bruit AVF paten, sensasi thrill kuat, kanulasi lancar',
    statusMesin: 'Siap Pakai',
    metodeDisinfeksi: 'Heat Clean',
    ketTeknis: 'Normal',
    jamCekRo: '06:30',
    kondisiAirRo: 'Memenuhi Syarat',
    perawatPelaksana: 'Ns. Y. Brillisanto'
  },
  {
    id: 'lp-06',
    no: 6,
    noRm: '452106',
    namaPasien: 'Tn. Budimulia Yulian S.',
    statusRawat: 'Rawat Jalan',
    ruangKategori: 'Reguler',
    noBedMesin: 'Bed 06 / M-06',
    aksesVaskular: 'FEMORAL',
    waktuMulai: '07:45',
    waktuSelesai: '11:45',
    durasiJam: 4.0,
    bbKering: 58.0,
    bbPreHd: 60.5,
    bbPostHd: 58.2,
    qb: 200,
    qd: 500,
    targetUf: 2500,
    ktV: 1.30,
    capaianUf: 2500,
    tdPre: '135/80',
    tdPost: '120/70',
    dialiser: 'High Flux (SAS HF 18)',
    heparinisasi: 'Free Heparin (Bled Risk)',
    komplikasiIntraHd: 'Tidak ada',
    tindakanAdvisDpjp: 'Flushing NaCl 100 cc berkala per 30 menit, clotting (-)',
    statusMesin: 'Siap Pakai',
    metodeDisinfeksi: 'Heat Clean',
    ketTeknis: 'Normal',
    jamCekRo: '06:30',
    kondisiAirRo: 'Memenuhi Syarat',
    perawatPelaksana: 'Ns. Y. Brillisanto'
  },
  {
    id: 'lp-07',
    no: 7,
    noRm: '452107',
    namaPasien: 'Ny. Caecilia Apri Setyarini',
    statusRawat: 'Rawat Jalan',
    ruangKategori: 'Reguler',
    noBedMesin: 'Bed 07 / M-07',
    aksesVaskular: 'AV SHUNT',
    waktuMulai: '07:45',
    waktuSelesai: '12:15',
    durasiJam: 4.5,
    bbKering: 72.0,
    bbPreHd: 75.8,
    bbPostHd: 72.2,
    qb: 240,
    qd: 500,
    targetUf: 3800,
    ktV: 1.36,
    capaianUf: 3800,
    tdPre: '155/90',
    tdPost: '140/85',
    dialiser: 'High Flux (SAS HF 18)',
    heparinisasi: 'Standar (5000 IU)',
    komplikasiIntraHd: 'Tidak ada',
    tindakanAdvisDpjp: 'Kanulasi graft terarah, aliran darah stabil hemostasis baik',
    statusMesin: 'Siap Pakai',
    metodeDisinfeksi: 'Heat Clean',
    ketTeknis: 'Normal',
    jamCekRo: '06:30',
    kondisiAirRo: 'Memenuhi Syarat',
    perawatPelaksana: 'Ns. Y. Brillisanto'
  },
  {
    id: 'lp-08',
    no: 8,
    noRm: '452108',
    namaPasien: 'Tn. CH. Adji Tri Subarkah',
    statusRawat: 'Rawat Jalan',
    ruangKategori: 'Reguler',
    noBedMesin: 'Bed 08 / M-08',
    aksesVaskular: 'CDL',
    waktuMulai: '07:50',
    waktuSelesai: '11:50',
    durasiJam: 4.0,
    bbKering: 54.0,
    bbPreHd: 57.2,
    bbPostHd: 54.6,
    qb: 200,
    qd: 500,
    targetUf: 3200,
    ktV: 1.25,
    capaianUf: 2600,
    tdPre: '130/80',
    tdPost: '115/70',
    dialiser: 'High Flux (SAS HF 18)',
    heparinisasi: 'Standar (4000 IU)',
    komplikasiIntraHd: 'Hipotensi',
    tindakanAdvisDpjp: 'Trendelenburg, bolus 150cc, lapor DPJP toleransi under-UF 600mL',
    statusMesin: 'Siap Pakai',
    metodeDisinfeksi: 'Heat Clean',
    ketTeknis: 'Normal',
    jamCekRo: '06:30',
    kondisiAirRo: 'Memenuhi Syarat',
    perawatPelaksana: 'Ns. Siswantini / PJ Haikal'
  },
  {
    id: 'lp-09',
    no: 9,
    noRm: '452109',
    namaPasien: 'Ny. Dari Al Prapto',
    statusRawat: 'Rawat Jalan',
    ruangKategori: 'Reguler',
    noBedMesin: 'Bed 09 / M-09',
    aksesVaskular: 'AV SHUNT',
    waktuMulai: '07:50',
    waktuSelesai: '11:50',
    durasiJam: 4.0,
    bbKering: 60.0,
    bbPreHd: 63.2,
    bbPostHd: 60.2,
    qb: 220,
    qd: 500,
    targetUf: 3200,
    ktV: 1.34,
    capaianUf: 3200,
    tdPre: '140/85',
    tdPost: '125/80',
    dialiser: 'High Flux (SAS HF 18)',
    heparinisasi: 'Standar (5000 IU)',
    komplikasiIntraHd: 'Tidak ada',
    tindakanAdvisDpjp: 'Pasien lansia 80 th, mobilisasi hati-hati tensi berkala stabil',
    statusMesin: 'Siap Pakai',
    metodeDisinfeksi: 'Heat Clean',
    ketTeknis: 'Normal',
    jamCekRo: '06:30',
    kondisiAirRo: 'Memenuhi Syarat',
    perawatPelaksana: 'Ns. Siswantini Catur P'
  },
  {
    id: 'lp-10',
    no: 10,
    noRm: '452110',
    namaPasien: 'Tn. Dhedi Wahyu Luluh W.',
    statusRawat: 'Rawat Jalan',
    ruangKategori: 'Reguler',
    noBedMesin: 'Bed 10 / M-10',
    aksesVaskular: 'AV SHUNT',
    waktuMulai: '07:55',
    waktuSelesai: '12:25',
    durasiJam: 4.5,
    bbKering: 66.0,
    bbPreHd: 69.4,
    bbPostHd: 66.1,
    qb: 250,
    qd: 500,
    targetUf: 3400,
    ktV: 1.41,
    capaianUf: 3400,
    tdPre: '145/90',
    tdPost: '130/85',
    dialiser: 'High Flux (SAS HF 18)',
    heparinisasi: 'Standar (5000 IU)',
    komplikasiIntraHd: 'Tidak ada',
    tindakanAdvisDpjp: 'Sesi HD selesai optimal, keluhan dispepsia/mual nihil',
    statusMesin: 'Siap Pakai',
    metodeDisinfeksi: 'Heat Clean',
    ketTeknis: 'Normal',
    jamCekRo: '06:30',
    kondisiAirRo: 'Memenuhi Syarat',
    perawatPelaksana: 'Ns. Siswantini Catur P'
  },
  {
    id: 'lp-11',
    no: 11,
    noRm: '452111',
    namaPasien: 'Tn. Eko Daryono H.',
    statusRawat: 'Rawat Jalan',
    ruangKategori: 'Reguler',
    noBedMesin: 'Bed 11 / M-11',
    aksesVaskular: 'AV SHUNT',
    waktuMulai: '08:00',
    waktuSelesai: '12:30',
    durasiJam: 4.5,
    bbKering: 52.0,
    bbPreHd: 54.5,
    bbPostHd: 52.1,
    qb: 220,
    qd: 500,
    targetUf: 2500,
    ktV: 1.39,
    capaianUf: 2500,
    tdPre: '150/90',
    tdPost: '135/80',
    dialiser: 'High Flux (SAS HF 18)',
    heparinisasi: 'Standar (4000 IU)',
    komplikasiIntraHd: 'Tidak ada',
    tindakanAdvisDpjp: 'Dry weight tercapai optimal, kepatuhan antihipertensi baik',
    statusMesin: 'Siap Pakai',
    metodeDisinfeksi: 'Heat Clean',
    ketTeknis: 'Normal',
    jamCekRo: '06:30',
    kondisiAirRo: 'Memenuhi Syarat',
    perawatPelaksana: 'Ns. Reni Dwi A'
  },
  {
    id: 'lp-12',
    no: 12,
    noRm: '452112',
    namaPasien: 'Sdr. FX Arga Sandi Yudha (ICU)',
    statusRawat: 'Rawat Inap',
    ruangKategori: 'Reguler',
    noBedMesin: 'Bed 12 / M-12',
    aksesVaskular: 'FEMORAL',
    waktuMulai: '08:15',
    waktuSelesai: '11:15',
    durasiJam: 3.0,
    bbKering: 70.0,
    bbPreHd: 72.5,
    bbPostHd: 70.8,
    qb: 200,
    qd: 500,
    targetUf: 2000,
    ktV: 1.15,
    capaianUf: 1800,
    tdPre: '110/70',
    tdPost: '115/75',
    dialiser: 'High Flux (SAS HF 18)',
    heparinisasi: 'Free Heparin (Post Op)',
    komplikasiIntraHd: 'Hipotensi',
    tindakanAdvisDpjp: 'HD Cito hiperkalemia K+ 6.8 -> K+ post 4.5, transfer ICU stabil',
    statusMesin: 'Siap Pakai',
    metodeDisinfeksi: 'Chemical Clean',
    ketTeknis: 'Normal',
    jamCekRo: '06:30',
    kondisiAirRo: 'Memenuhi Syarat',
    perawatPelaksana: 'Ns. Reni / PJ Haikal'
  },
  {
    id: 'lp-13',
    no: 13,
    noRm: '452113',
    namaPasien: 'Tn. G. Bambang Supadmono',
    statusRawat: 'Rawat Jalan',
    ruangKategori: 'Reguler',
    noBedMesin: 'Bed 13 / M-13',
    aksesVaskular: 'AV SHUNT',
    waktuMulai: '08:00',
    waktuSelesai: '12:30',
    durasiJam: 4.5,
    bbKering: 75.0,
    bbPreHd: 78.8,
    bbPostHd: 75.2,
    qb: 250,
    qd: 500,
    targetUf: 3800,
    ktV: 1.35,
    capaianUf: 3800,
    tdPre: '160/95',
    tdPost: '140/85',
    dialiser: 'High Flux (SAS HF 18)',
    heparinisasi: 'Standar (5000 IU)',
    komplikasiIntraHd: 'Tidak ada',
    tindakanAdvisDpjp: 'Edukasi pembatasan asupan air minum interdialitik',
    statusMesin: 'Siap Pakai',
    metodeDisinfeksi: 'Heat Clean',
    ketTeknis: 'Normal',
    jamCekRo: '06:30',
    kondisiAirRo: 'Memenuhi Syarat',
    perawatPelaksana: 'Ns. Reni Dwi A'
  },
  {
    id: 'lp-14',
    no: 14,
    noRm: '452114',
    namaPasien: 'Tn. Heri Murtanto (Bangsal)',
    statusRawat: 'Rawat Inap',
    ruangKategori: 'Reguler',
    noBedMesin: 'Bed 14 / M-14',
    aksesVaskular: 'AV SHUNT',
    waktuMulai: '08:05',
    waktuSelesai: '12:35',
    durasiJam: 4.5,
    bbKering: 53.0,
    bbPreHd: 55.6,
    bbPostHd: 53.2,
    qb: 230,
    qd: 500,
    targetUf: 2600,
    ktV: 1.40,
    capaianUf: 2600,
    tdPre: '135/85',
    tdPost: '120/75',
    dialiser: 'High Flux (SAS HF 18)',
    heparinisasi: 'Standar (4000 IU)',
    komplikasiIntraHd: 'Tidak ada',
    tindakanAdvisDpjp: 'Pasien ranap Bangsal Dahlia R.302, transfer brankar stabil',
    statusMesin: 'Siap Pakai',
    metodeDisinfeksi: 'Heat Clean',
    ketTeknis: 'Normal',
    jamCekRo: '06:30',
    kondisiAirRo: 'Memenuhi Syarat',
    perawatPelaksana: 'Ns. Hari Endah C'
  },
  {
    id: 'lp-15',
    no: 15,
    noRm: '452115',
    namaPasien: 'Tn. Iman Nugroho',
    statusRawat: 'Rawat Jalan',
    ruangKategori: 'Reguler',
    noBedMesin: 'Bed 15 / M-15',
    aksesVaskular: 'AV SHUNT',
    waktuMulai: '08:10',
    waktuSelesai: '12:40',
    durasiJam: 4.5,
    bbKering: 58.0,
    bbPreHd: 61.2,
    bbPostHd: 58.3,
    qb: 240,
    qd: 500,
    targetUf: 3200,
    ktV: 1.38,
    capaianUf: 3200,
    tdPre: '140/80',
    tdPost: '125/80',
    dialiser: 'High Flux (SAS HF 18)',
    heparinisasi: 'Standar (5000 IU)',
    komplikasiIntraHd: 'Tidak ada',
    tindakanAdvisDpjp: 'Hemostasis tercapai 10 menit tanpa hematom post-kanulasi',
    statusMesin: 'Siap Pakai',
    metodeDisinfeksi: 'Heat Clean',
    ketTeknis: 'Normal',
    jamCekRo: '06:30',
    kondisiAirRo: 'Memenuhi Syarat',
    perawatPelaksana: 'Ns. Hari Endah C'
  },
  {
    id: 'lp-16',
    no: 16,
    noRm: '452116',
    namaPasien: 'Ny. Ira Widanarti',
    statusRawat: 'Rawat Jalan',
    ruangKategori: 'Reguler',
    noBedMesin: 'Bed 16 / M-16',
    aksesVaskular: 'AV SHUNT',
    waktuMulai: '08:10',
    waktuSelesai: '12:40',
    durasiJam: 4.5,
    bbKering: 51.0,
    bbPreHd: 53.6,
    bbPostHd: 51.1,
    qb: 220,
    qd: 500,
    targetUf: 2500,
    ktV: 1.43,
    capaianUf: 2500,
    tdPre: '140/85',
    tdPost: '125/80',
    dialiser: 'High Flux (SAS HF 18)',
    heparinisasi: 'Standar (4000 IU)',
    komplikasiIntraHd: 'Tidak ada',
    tindakanAdvisDpjp: 'Toleransi ultrafiltrasi optimal, keluhan pusing nihil',
    statusMesin: 'Siap Pakai',
    metodeDisinfeksi: 'Heat Clean',
    ketTeknis: 'Normal',
    jamCekRo: '06:30',
    kondisiAirRo: 'Memenuhi Syarat',
    perawatPelaksana: 'Ns. Hari Endah C'
  },
  {
    id: 'lp-17',
    no: 17,
    noRm: '452117',
    namaPasien: 'Ny. Istiyah',
    statusRawat: 'Rawat Jalan',
    ruangKategori: 'Reguler',
    noBedMesin: 'Bed 17 / M-17',
    aksesVaskular: 'AV SHUNT',
    waktuMulai: '08:15',
    waktuSelesai: '12:45',
    durasiJam: 4.5,
    bbKering: 56.0,
    bbPreHd: 58.8,
    bbPostHd: 56.1,
    qb: 230,
    qd: 500,
    targetUf: 2800,
    ktV: 1.39,
    capaianUf: 2800,
    tdPre: '135/85',
    tdPost: '120/80',
    dialiser: 'High Flux (SAS HF 18)',
    heparinisasi: 'Standar (4000 IU)',
    komplikasiIntraHd: 'Tidak ada',
    tindakanAdvisDpjp: 'Injeksi EPO pasca-HD sesuai instruksi medis DPJP',
    statusMesin: 'Siap Pakai',
    metodeDisinfeksi: 'Heat Clean',
    ketTeknis: 'Normal',
    jamCekRo: '06:30',
    kondisiAirRo: 'Memenuhi Syarat',
    perawatPelaksana: 'Ns. Fransisca Rani L'
  },
  {
    id: 'lp-18',
    no: 18,
    noRm: '452118',
    namaPasien: 'Ny. Maria Tri Hartini',
    statusRawat: 'Rawat Jalan',
    ruangKategori: 'Reguler',
    noBedMesin: 'Bed 18 / M-18',
    aksesVaskular: 'AV SHUNT',
    waktuMulai: '08:15',
    waktuSelesai: '12:45',
    durasiJam: 4.5,
    bbKering: 63.0,
    bbPreHd: 66.2,
    bbPostHd: 63.1,
    qb: 240,
    qd: 500,
    targetUf: 3100,
    ktV: 1.37,
    capaianUf: 3100,
    tdPre: '145/90',
    tdPost: '130/80',
    dialiser: 'High Flux (SAS HF 18)',
    heparinisasi: 'Standar (5000 IU)',
    komplikasiIntraHd: 'Tidak ada',
    tindakanAdvisDpjp: 'HD berjalan lancar, hemostasis kanulasi baik',
    statusMesin: 'Siap Pakai',
    metodeDisinfeksi: 'Heat Clean',
    ketTeknis: 'Normal',
    jamCekRo: '06:30',
    kondisiAirRo: 'Memenuhi Syarat',
    perawatPelaksana: 'Ns. Fransisca Rani L'
  },
  {
    id: 'lp-19',
    no: 19,
    noRm: '452119',
    namaPasien: 'Tn. Marjiyo',
    statusRawat: 'Rawat Jalan',
    ruangKategori: 'Reguler',
    noBedMesin: 'Bed 19 / M-19',
    aksesVaskular: 'AV SHUNT',
    waktuMulai: '08:20',
    waktuSelesai: '12:50',
    durasiJam: 4.5,
    bbKering: 61.0,
    bbPreHd: 64.2,
    bbPostHd: 61.1,
    qb: 250,
    qd: 500,
    targetUf: 3100,
    ktV: 1.41,
    capaianUf: 3100,
    tdPre: '140/85',
    tdPost: '125/80',
    dialiser: 'High Flux (SAS HF 18)',
    heparinisasi: 'Standar (5000 IU)',
    komplikasiIntraHd: 'Tidak ada',
    tindakanAdvisDpjp: 'Bruit AVF paten, kanulasi tanpa penyulit lancar',
    statusMesin: 'Siap Pakai',
    metodeDisinfeksi: 'Heat Clean',
    ketTeknis: 'Normal',
    jamCekRo: '06:30',
    kondisiAirRo: 'Memenuhi Syarat',
    perawatPelaksana: 'Ns. Fransisca Rani L'
  },
  {
    id: 'lp-20',
    no: 20,
    noRm: '452120',
    namaPasien: 'Ny. Murniyati',
    statusRawat: 'Rawat Jalan',
    ruangKategori: 'Reguler',
    noBedMesin: 'Bed 20 / M-20',
    aksesVaskular: 'AV SHUNT',
    waktuMulai: '08:20',
    waktuSelesai: '12:50',
    durasiJam: 4.5,
    bbKering: 55.0,
    bbPreHd: 57.8,
    bbPostHd: 55.2,
    qb: 220,
    qd: 500,
    targetUf: 2800,
    ktV: 1.36,
    capaianUf: 2800,
    tdPre: '135/80',
    tdPost: '120/75',
    dialiser: 'High Flux (SAS HF 18)',
    heparinisasi: 'Standar (4000 IU)',
    komplikasiIntraHd: 'Tidak ada',
    tindakanAdvisDpjp: 'Edukasi diit tinggi protein rendah kalium teratur',
    statusMesin: 'Siap Pakai',
    metodeDisinfeksi: 'Heat Clean',
    ketTeknis: 'Normal',
    jamCekRo: '06:30',
    kondisiAirRo: 'Memenuhi Syarat',
    perawatPelaksana: 'Ns. Fransisca Rani L'
  },
  {
    id: 'lp-21',
    no: 21,
    noRm: '452121',
    namaPasien: 'Ny. Murti Setiawati',
    statusRawat: 'Rawat Jalan',
    ruangKategori: 'Reguler',
    noBedMesin: 'Bed 21 / M-21',
    aksesVaskular: 'AV SHUNT',
    waktuMulai: '08:25',
    waktuSelesai: '12:55',
    durasiJam: 4.5,
    bbKering: 59.0,
    bbPreHd: 62.0,
    bbPostHd: 59.1,
    qb: 230,
    qd: 500,
    targetUf: 3000,
    ktV: 1.40,
    capaianUf: 3000,
    tdPre: '145/90',
    tdPost: '130/80',
    dialiser: 'High Flux (SAS HF 18)',
    heparinisasi: 'Standar (5000 IU)',
    komplikasiIntraHd: 'Tidak ada',
    tindakanAdvisDpjp: 'Tanda vital stabil sepanjang proses hemodialisis',
    statusMesin: 'Siap Pakai',
    metodeDisinfeksi: 'Heat Clean',
    ketTeknis: 'Normal',
    jamCekRo: '06:30',
    kondisiAirRo: 'Memenuhi Syarat',
    perawatPelaksana: 'Ns. Ayu Wulandari'
  },
  {
    id: 'lp-22',
    no: 22,
    noRm: '452122',
    namaPasien: 'Nn. Nadissa Rosari Dewi',
    statusRawat: 'Rawat Jalan',
    ruangKategori: 'Reguler',
    noBedMesin: 'Bed 22 / M-22',
    aksesVaskular: 'CDL',
    waktuMulai: '08:25',
    waktuSelesai: '12:55',
    durasiJam: 4.5,
    bbKering: 46.0,
    bbPreHd: 48.2,
    bbPostHd: 46.1,
    qb: 200,
    qd: 500,
    targetUf: 2200,
    ktV: 1.42,
    capaianUf: 2200,
    tdPre: '125/75',
    tdPost: '115/70',
    dialiser: 'High Flux (SAS HF 18)',
    heparinisasi: 'Dosis Rendah (3000 IU)',
    komplikasiIntraHd: 'Tidak ada',
    tindakanAdvisDpjp: 'Perawatan CDL aseptik, heparin lock tepat dosis lumen',
    statusMesin: 'Siap Pakai',
    metodeDisinfeksi: 'Heat Clean',
    ketTeknis: 'Normal',
    jamCekRo: '06:30',
    kondisiAirRo: 'Memenuhi Syarat',
    perawatPelaksana: 'Ns. Ayu Wulandari'
  },
  {
    id: 'lp-23',
    no: 23,
    noRm: '452123',
    namaPasien: 'Ny. Neni Winarsih',
    statusRawat: 'Rawat Jalan',
    ruangKategori: 'Isolasi Hep B',
    noBedMesin: 'Bed 23 / M-23',
    aksesVaskular: 'AV SHUNT',
    waktuMulai: '08:30',
    waktuSelesai: '13:00',
    durasiJam: 4.5,
    bbKering: 64.0,
    bbPreHd: 67.5,
    bbPostHd: 64.2,
    qb: 240,
    qd: 500,
    targetUf: 3500,
    ktV: 1.38,
    capaianUf: 3500,
    tdPre: '145/90',
    tdPost: '130/80',
    dialiser: 'High Flux (Dedicated Hep B)',
    heparinisasi: 'Standar (5000 IU)',
    komplikasiIntraHd: 'Tidak ada',
    tindakanAdvisDpjp: 'Protokol isolasi Hepatitis B ketat, APD lengkap, desinfeksi tuntas',
    statusMesin: 'Siap Pakai',
    metodeDisinfeksi: 'Chemical Clean',
    ketTeknis: 'Khusus Hep B',
    jamCekRo: '06:30',
    kondisiAirRo: 'Memenuhi Syarat',
    perawatPelaksana: 'Ns. Ayu Wulandari'
  },
  {
    id: 'lp-24',
    no: 24,
    noRm: '452124',
    namaPasien: 'Ny. Nur Walaningsih',
    statusRawat: 'Rawat Jalan',
    ruangKategori: 'Isolasi Hep C',
    noBedMesin: 'Bed 24 / M-24',
    aksesVaskular: 'AV SHUNT',
    waktuMulai: '08:30',
    waktuSelesai: '13:00',
    durasiJam: 4.5,
    bbKering: 56.0,
    bbPreHd: 59.0,
    bbPostHd: 56.1,
    qb: 230,
    qd: 500,
    targetUf: 3000,
    ktV: 1.37,
    capaianUf: 3000,
    tdPre: '130/85',
    tdPost: '120/80',
    dialiser: 'High Flux (Dedicated Hep C)',
    heparinisasi: 'Standar (4000 IU)',
    komplikasiIntraHd: 'Tidak ada',
    tindakanAdvisDpjp: 'Protokol pencegahan infeksi hepatitis C, desinfeksi mesin ganda selesai',
    statusMesin: 'Siap Pakai',
    metodeDisinfeksi: 'Chemical Clean',
    ketTeknis: 'Khusus Hep C',
    jamCekRo: '06:30',
    kondisiAirRo: 'Memenuhi Syarat',
    perawatPelaksana: 'Ns. Ayu Wulandari'
  }
];

export interface LaporanPasienSummary {
  totalPasien: number;
  rataDurasiJam: number;
  rataBbKering: number;
  rataBbPreHd: number;
  rataBbPostHd: number;
  rataQb: number;
  rataQd: number;
  totalTargetUf: number;
  rataKtV: number;
  totalCapaianUf: number;
}

export function computeLaporanPasienSummary(rows: LaporanPasienRow[]): LaporanPasienSummary {
  if (rows.length === 0) {
    return {
      totalPasien: 0,
      rataDurasiJam: 0,
      rataBbKering: 0,
      rataBbPreHd: 0,
      rataBbPostHd: 0,
      rataQb: 0,
      rataQd: 0,
      totalTargetUf: 0,
      rataKtV: 0,
      totalCapaianUf: 0
    };
  }

  const n = rows.length;
  const sumDurasi = rows.reduce((acc, r) => acc + (r.durasiJam || 0), 0);
  const sumBbKering = rows.reduce((acc, r) => acc + (r.bbKering || 0), 0);
  const sumBbPre = rows.reduce((acc, r) => acc + (r.bbPreHd || 0), 0);
  const sumBbPost = rows.reduce((acc, r) => acc + (r.bbPostHd || 0), 0);
  const sumQb = rows.reduce((acc, r) => acc + (r.qb || 0), 0);
  const sumQd = rows.reduce((acc, r) => acc + (r.qd || 0), 0);
  const totalTargetUf = rows.reduce((acc, r) => acc + (r.targetUf || 0), 0);
  const sumKtV = rows.reduce((acc, r) => acc + (r.ktV || 0), 0);
  const totalCapaianUf = rows.reduce((acc, r) => acc + (r.capaianUf || 0), 0);

  return {
    totalPasien: n,
    rataDurasiJam: Number((sumDurasi / n).toFixed(1)),
    rataBbKering: Number((sumBbKering / n).toFixed(1)),
    rataBbPreHd: Number((sumBbPre / n).toFixed(1)),
    rataBbPostHd: Number((sumBbPost / n).toFixed(1)),
    rataQb: Math.round(sumQb / n),
    rataQd: Math.round(sumQd / n),
    totalTargetUf,
    rataKtV: Number((sumKtV / n).toFixed(2)),
    totalCapaianUf
  };
}

/**
 * Cleans and formats bed and machine label (e.g. "Bed 01 / M-01" or "Bed A01 / M-01").
 */
export function formatBedAndMachineLabel(rawBed?: string, fallbackIndex: number = 0): string {
  if (!rawBed || !rawBed.trim()) {
    const padded = String(fallbackIndex + 1).padStart(2, '0');
    return `Bed ${padded} / M-${padded}`;
  }
  const clean = rawBed.trim();
  const bedNumMatch = clean.match(/\d+/);
  const digits = bedNumMatch ? bedNumMatch[0].padStart(2, '0') : String(fallbackIndex + 1).padStart(2, '0');
  
  let bedLabel = clean;
  if (!clean.toLowerCase().startsWith('bed')) {
    bedLabel = `Bed ${clean}`;
  } else {
    // Normalise "BED A01" -> "Bed A01", "bed 01" -> "Bed 01"
    bedLabel = clean.replace(/^bed\s*/i, 'Bed ');
  }

  return `${bedLabel} / M-${digits}`;
}

/**
 * Calculates start and end times based on shift and duration.
 */
export function calculateDialysisTimes(shift: 'Pagi' | 'Siang' = 'Pagi', durasiJam: number = 4.5): {
  startTime: string;
  endTime: string;
} {
  const isSiang = shift === 'Siang';
  const startMinutes = isSiang ? 14 * 60 : 7 * 60 + 30; // 14:00 or 07:30
  const endMinutes = Math.round(startMinutes + durasiJam * 60);

  const startH = String(Math.floor(startMinutes / 60)).padStart(2, '0');
  const startM = String(startMinutes % 60).padStart(2, '0');
  const endH = String(Math.floor(endMinutes / 60)).padStart(2, '0');
  const endM = String(endMinutes % 60).padStart(2, '0');

  return {
    startTime: `${startH}:${startM}`,
    endTime: `${endH}:${endM}`
  };
}

/**
 * Maps live PatientHDSession data to LaporanPasienRow.
 */
export function convertSessionToLaporanRow(session: PatientHDSession, index: number): LaporanPasienRow {
  const statusRawat: 'Rawat Jalan' | 'Rawat Inap' =
    session.status === 'ranap' ? 'Rawat Inap' : 'Rawat Jalan';

  let ruangKategori = 'Reguler';
  if (session.category === 'hepatitis_b') ruangKategori = 'Isolasi Hep B';
  else if (session.category === 'hepatitis_c') ruangKategori = 'Isolasi Hep C';
  else if (session.category === 'hiv') ruangKategori = 'Isolasi Khusus';

  const vascularLabel = formatAksesVaskularStandard(
    undefined,
    session.vascularAccess,
    session.accessSite
  );

  const durasiJam = session.durationActual || session.durationPrescribed || 4.5;
  const shiftChoice: 'Pagi' | 'Siang' =
    (session.shift || '').toLowerCase().includes('siang') ? 'Siang' : 'Pagi';
  const { startTime, endTime } = calculateDialysisTimes(shiftChoice, durasiJam);

  const bbKering = session.dryWeight || 60;
  const bbPreHd = session.preWeight || (bbKering + 2.5);
  const bbPostHd = session.postWeight || bbKering;

  const targetUf = session.targetUf || 2500;
  const capaianUf = session.achievedUf || targetUf;

  const ktV: number =
    typeof session.ktV === 'number'
      ? session.ktV
      : typeof session.ktV === 'string' && !isNaN(Number(session.ktV))
      ? Number(session.ktV)
      : Number((1.2 + (capaianUf / 10000) * 0.5).toFixed(2));

  let komplikasi = 'Tidak ada';
  if (session.complicationNames && session.complicationNames.trim()) {
    komplikasi = session.complicationNames.trim();
  } else {
    const activeComps: string[] = [];
    if (session.hasHypotension) activeComps.push('Hipotensi');
    if (session.hasMuscleCramps) activeComps.push('Kram Otot');
    if (session.hasClotting) activeComps.push('Clotting Sirkuit');
    if (session.hasFirstUseSyndrome) activeComps.push('First-Use Syndrome');
    if (session.hasAccessBleeding) activeComps.push('Perdarahan Akses');
    if (session.nurseNotes && session.nurseNotes.includes('[Komplikasi HD:')) {
      const matchComp = session.nurseNotes.match(/\[Komplikasi HD:\s*([^\]]+)\]/);
      if (matchComp && matchComp[1]) {
        const parts = matchComp[1]
          .split('|')
          .map((p) => p.split(':')[0].trim())
          .filter(Boolean);
        parts.forEach((p) => {
          if (!activeComps.includes(p)) activeComps.push(p);
        });
      }
    }
    if (activeComps.length > 0) {
      komplikasi = Array.from(new Set(activeComps)).join(', ');
    }
  }

  const tindakanAdvis =
    session.consultAdvice ||
    session.bagian4?.consultAdviceTbak ||
    (session.hasMuscleCramps
      ? session.muscleCrampAction || 'Masase betis, peregangan, bolus NaCl 100cc, evaluasi DPJP'
      : session.hasHypotension
      ? session.hypotensionAction || 'Trendelenburg, bolus saline 150cc, lapor DPJP toleransi under-UF'
      : session.hasClotting
      ? session.clottingDetails || 'Flushing NaCl 100cc berkala, ganti blood set bila perlu'
      : statusRawat === 'Rawat Inap'
      ? 'Pasien rawat inap, transfer brankar stabil, evaluasi instruksi DPJP'
      : 'HD lancar, toleransi hemodinamik stabil, hemostasis 10 menit');

  const noBedMesin = formatBedAndMachineLabel(session.bedNumber, index);

  let heparinisasi = 'Standar (5000 IU)';
  const notesLower = (session.nurseNotes || '').toLowerCase();
  const hepType = (session.bagian2?.circuitHeparinizationType || '').toLowerCase();
  if (
    hepType.includes('bebas') ||
    hepType.includes('saline') ||
    notesLower.includes('free heparin') ||
    notesLower.includes('bebas heparin') ||
    notesLower.includes('tanpa heparin')
  ) {
    heparinisasi = 'Free Heparin (Bled Risk)';
  } else if (
    hepType.includes('lmwh') ||
    notesLower.includes('rendah') ||
    notesLower.includes('3000')
  ) {
    heparinisasi = 'Dosis Rendah (3000 IU)';
  } else if (notesLower.includes('4000')) {
    heparinisasi = 'Standar (4000 IU)';
  }

  return {
    id: session.id || `live-${index}`,
    no: index + 1,
    noRm: session.medicalRecordNumber || `4521${String(index + 1).padStart(2, '0')}`,
    namaPasien: session.patientName || 'Pasien HD',
    statusRawat,
    ruangKategori,
    noBedMesin,
    aksesVaskular: vascularLabel,
    waktuMulai: startTime,
    waktuSelesai: endTime,
    durasiJam,
    bbKering,
    bbPreHd,
    bbPostHd,
    qb: session.bloodFlowQb || 220,
    qd: session.dialysateFlowQd || 500,
    targetUf,
    ktV,
    capaianUf,
    tdPre: session.preBp || '140/90',
    tdPost: session.postBp || '125/80',
    dialiser: session.dialyzerModel || (session.category === 'hepatitis_b' ? 'High Flux (Dedicated Hep B)' : session.category === 'hepatitis_c' ? 'High Flux (Dedicated Hep C)' : 'High Flux (SAS HF 18)'),
    heparinisasi,
    komplikasiIntraHd: komplikasi,
    tindakanAdvisDpjp: tindakanAdvis,
    statusMesin: 'Siap Pakai',
    metodeDisinfeksi: session.category === 'hepatitis_b' || session.category === 'hepatitis_c' ? 'Chemical Clean' : 'Heat Clean',
    ketTeknis: session.category === 'hepatitis_b' ? 'Khusus Hep B' : session.category === 'hepatitis_c' ? 'Khusus Hep C' : 'Normal',
    jamCekRo: shiftChoice === 'Siang' ? '13:30' : '06:30',
    kondisiAirRo: 'Memenuhi Syarat',
    perawatPelaksana: session.nurseInCharge ? (session.nurseInCharge.startsWith('Ns.') || session.nurseInCharge.startsWith('M.') ? session.nurseInCharge : `Ns. ${session.nurseInCharge}`) : 'Ns. Pelaksana'
  };
}

/**
 * Aggregates all live logbook patients inputted across all staff for the specified date & shift.
 * Gathers from active sessions as well as local nurse logbook storage for immediate availability.
 */
export function collectAllInputtedLogbookRows(params: {
  sessions: PatientHDSession[];
  activeDateIso: string;
  activeShift: 'Pagi' | 'Siang';
  masterNurses?: MasterNurse[];
  masterPatients?: MasterPatient[];
}): LaporanPasienRow[] {
  const { sessions = [], activeDateIso, activeShift, masterNurses = [], masterPatients = [] } = params;
  const candidateRows: LaporanPasienRow[] = [];
  const seenKeys = new Set<string>();

  // 1. Gather sessions matching activeDateIso and activeShift
  sessions.forEach((s) => {
    const sDateIso = s.sessionDate || (s.date ? indonesianDateLabelToIso(s.date) : '');
    if (sDateIso && sDateIso !== activeDateIso) return;
    const sShift = (s.shift || '').trim().toLowerCase().includes('siang') ? 'Siang' : 'Pagi';
    if (sShift !== activeShift) return;

    const cleanRm = (s.medicalRecordNumber || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanName = (s.patientName || '').trim().toLowerCase();
    const cleanBed = (s.bedNumber || '').trim().toLowerCase();
    const dedupKey = cleanRm && cleanRm !== '0' ? `rm:${cleanRm}` : `pat:${cleanName}__${cleanBed}`;
    if (seenKeys.has(dedupKey)) return;
    seenKeys.add(dedupKey);

    candidateRows.push(convertSessionToLaporanRow(s, candidateRows.length));
  });

  // 2. Also check localStorage for all nurses to ensure patients inputted in the logbook tab
  // are immediately available in Laporan Pasien even before server round-trips
  if (typeof window !== 'undefined' && window.localStorage && masterNurses.length > 0) {
    masterNurses.forEach((nurse) => {
      if (!nurse.name || nurse.name === '-') return;
      try {
        const managedRaw = localStorage.getItem(getNurseManagedPatientsKey(nurse.name));
        if (!managedRaw) return;
        const managedList = JSON.parse(managedRaw);
        if (!Array.isArray(managedList) || managedList.length === 0) return;

        // Check nurse shift for this date
        const savedShift = localStorage.getItem(getNurseShiftScheduleKey(nurse.name));
        const nurseShift =
          savedShift === 'Siang' || (!savedShift && nurse.shiftAssigned === 'Siang')
            ? 'Siang'
            : 'Pagi';
        if (nurseShift !== activeShift) return;

        // Read clinical details
        let clinMap: Record<string, unknown> = {};
        const clinRaw = localStorage.getItem(getNurseClinicalDetailsKey(nurse.name));
        if (clinRaw) {
          clinMap = JSON.parse(clinRaw) || {};
        }

        managedList.forEach((mp: { id?: string; bedNumber?: string; patientName?: string; medicalRecord?: string }) => {
          if (!mp.patientName && !mp.bedNumber) return;
          const cleanRm = (mp.medicalRecord || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanName = (mp.patientName || '').trim().toLowerCase();
          const cleanBed = (mp.bedNumber || '').trim().toLowerCase();
          const dedupKey = cleanRm && cleanRm !== '0' ? `rm:${cleanRm}` : `pat:${cleanName}__${cleanBed}`;
          if (seenKeys.has(dedupKey)) return;
          seenKeys.add(dedupKey);

          const patClin = normalizePatientClinicalDetails(clinMap[mp.id || '']);
          const masterMatch = masterPatients.find(
            (m) =>
              (cleanRm && cleanRm !== '0' && m.medicalRecordNumber?.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanRm) ||
              (cleanName && m.patientName.trim().toLowerCase() === cleanName)
          );

          const bbKeringVal = parseClinicalNumber(patClin.poin3_2.bbKering) ?? masterMatch?.defaultDryWeight ?? 60.0;
          const bbPreVal = parseClinicalNumber(patClin.poin3_2.bbPre) ?? (bbKeringVal + 2.5);
          const bbPostVal = parseClinicalNumber(patClin.poin3_2.bbPost) ?? bbKeringVal;
          const tdPreVal = patClin.poin3_3.tdPreHd?.trim() || '140/85';
          const tdPostVal = patClin.poin6_3.tdPostHd?.trim() || '125/80';
          const durasiVal = parseClinicalNumber(patClin.poin3_5.waktuDialisis) ?? 4.5;
          const targetUfVal = parseClinicalNumber(patClin.poin3_5.targetUfg) ?? 2500;
          const achievedUfVal = parseClinicalNumber(patClin.poin6_3.ufgTercapai) ?? targetUfVal;
          const qbVal = parseClinicalNumber(patClin.poin3_5.qb) ?? 220;
          const qdVal = parseClinicalNumber(patClin.poin3_5.qd) ?? 500;
          const ktvNum = parseClinicalNumber(patClin.poin6_3.ktV) ?? Number((1.2 + (achievedUfVal / 10000) * 0.5).toFixed(2));
          const resolvedComp = resolveSessionComplicationsFromPoin4_3(patClin.poin4_3);
          const resolvedAccess = resolveSessionAccessFromPoin3_6(
            patClin.poin3_6,
            masterMatch?.defaultVascularAccess || 'av_fistula',
            masterMatch?.defaultAccessSite || 'AVF Radiocephalica'
          );

          const statusRawat = patClin.poin3_1?.status === 'RAWAT INAP' ? 'Rawat Inap' : 'Rawat Jalan';
          let ruangKategori = 'Reguler';
          if (patClin.poin3_1?.kategori === 'ISOLASI HEPATITIS B') ruangKategori = 'Isolasi Hep B';
          else if (patClin.poin3_1?.kategori === 'ISOLASI HEPATITIS C/HIV') ruangKategori = 'Isolasi Hep C';

          const { startTime, endTime } = calculateDialysisTimes(activeShift, durasiVal);

          let heparinisasi = 'Standar (5000 IU)';
          const hepDosis = (patClin.poin3_5.dosisHeparin || '').toLowerCase();
          if (hepDosis.includes('free') || hepDosis.includes('tanpa') || hepDosis.includes('bebas')) {
            heparinisasi = 'Free Heparin (Bled Risk)';
          } else if (hepDosis.includes('rendah') || hepDosis.includes('3000')) {
            heparinisasi = 'Dosis Rendah (3000 IU)';
          } else if (hepDosis.includes('4000')) {
            heparinisasi = 'Standar (4000 IU)';
          }

          const tindakanAdvis =
            resolvedComp.activeCount > 0 && resolvedComp.doctorAdviceSummary
              ? resolvedComp.doctorAdviceSummary
              : statusRawat === 'Rawat Inap'
              ? 'Pasien rawat inap, transfer brankar stabil, evaluasi instruksi DPJP'
              : 'HD lancar, toleransi hemodinamik stabil, hemostasis 10 menit';

          const noBedMesin = formatBedAndMachineLabel(mp.bedNumber, candidateRows.length);
          const rawBedDigits = (mp.bedNumber?.match(/\d+/) || ['01'])[0].padStart(2, '0');

          candidateRows.push({
            id: mp.id || `live-storage-${candidateRows.length + 1}`,
            no: candidateRows.length + 1,
            noRm: mp.medicalRecord || masterMatch?.medicalRecordNumber || `4521${rawBedDigits}`,
            namaPasien: mp.patientName || masterMatch?.patientName || 'Pasien HD',
            statusRawat,
            ruangKategori,
            noBedMesin,
            aksesVaskular: resolvedAccess.accessTypeLabel,
            waktuMulai: startTime,
            waktuSelesai: endTime,
            durasiJam: durasiVal,
            bbKering: bbKeringVal,
            bbPreHd: bbPreVal,
            bbPostHd: bbPostVal,
            qb: qbVal,
            qd: qdVal,
            targetUf: targetUfVal,
            ktV: ktvNum,
            capaianUf: achievedUfVal,
            tdPre: tdPreVal,
            tdPost: tdPostVal,
            dialiser: masterMatch?.defaultDialyzer || (ruangKategori.includes('Hep B') ? 'High Flux (Dedicated Hep B)' : ruangKategori.includes('Hep C') ? 'High Flux (Dedicated Hep C)' : 'High Flux (SAS HF 18)'),
            heparinisasi,
            komplikasiIntraHd: resolvedComp.activeCount > 0 ? resolvedComp.complicationNames : 'Tidak ada',
            tindakanAdvisDpjp: tindakanAdvis,
            statusMesin: 'Siap Pakai',
            metodeDisinfeksi: ruangKategori.includes('Hep') ? 'Chemical Clean' : 'Heat Clean',
            ketTeknis: ruangKategori.includes('Hep B') ? 'Khusus Hep B' : ruangKategori.includes('Hep C') ? 'Khusus Hep C' : 'Normal',
            jamCekRo: activeShift === 'Siang' ? '13:30' : '06:30',
            kondisiAirRo: 'Memenuhi Syarat',
            perawatPelaksana: nurse.name.startsWith('Ns.') || nurse.name.startsWith('M.') ? nurse.name : `Ns. ${nurse.name}`
          });
        });
      } catch {
        // ignore storage parse errors
      }
    });
  }

  // 3. Sort rows by Bed Number natural numerical order
  candidateRows.sort((a, b) => {
    const numA = parseInt((a.noBedMesin.match(/\d+/) || ['999'])[0], 10);
    const numB = parseInt((b.noBedMesin.match(/\d+/) || ['999'])[0], 10);
    return numA - numB;
  });

  // 4. Renumber sequence 1, 2, 3...
  candidateRows.forEach((r, idx) => {
    r.no = idx + 1;
  });

  return candidateRows;
}

