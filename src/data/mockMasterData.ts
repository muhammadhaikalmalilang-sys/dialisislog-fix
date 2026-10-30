import { MasterPatient, MasterNurse, MasterBed, MasterDoctor } from '../types/dialysis.ts';
import { getCurrentIsoDateWib } from '../utils/dateHelpers.ts';

import { HdTreatmentDay } from '../types/dialysis.ts';

function createSeedPatient(
  index: number,
  patientName: string,
  gender: 'L' | 'P',
  days: HdTreatmentDay[],
  shift: 'Pagi' | 'Siang' = 'Pagi',
  category: MasterPatient['category'] = 'reguler'
): MasterPatient {
  const numStr = String(index).padStart(3, '0');
  const mrn = String(452100 + index);
  const routineSchedule =
    days.length === 2 ? `${days[0]} & ${days[1]} (${shift})` : `${days[0]} (${shift})`;
  return {
    id: `pat-hdhl-${numStr}`,
    medicalRecordNumber: mrn,
    patientName,
    age: 52,
    gender,
    defaultStatus: 'rajal',
    category,
    defaultVascularAccess: 'av_fistula',
    defaultAccessSite: 'AVF Radiocephalica Sinistra',
    defaultDialyzer: 'SAS HF 18',
    defaultDryWeight: gender === 'P' ? 54.0 : 62.0,
    treatmentDays: days,
    treatmentShift: shift,
    treatmentFrequency: days.length >= 2 ? '2x_seminggu' : '1x_seminggu',
    routineSchedule,
    contactPhone: ''
  };
}

// Data Pasien Terjadwal Unit Hemodialisis RS Happy Land Medical Centre
export const sampleBenchmarkPatients: MasterPatient[] = [
  createSeedPatient(1, 'ADJI DHARMANTO, DRS. TN', 'L', ['Senin', 'Kamis'], 'Pagi'),
  createSeedPatient(2, 'ANDRI NURZUAD WAHYU WIDODO,TN', 'L', ['Senin', 'Kamis'], 'Pagi'),
  createSeedPatient(3, 'DUL WAKID,TN', 'L', ['Senin', 'Kamis'], 'Pagi'),
  createSeedPatient(4, 'DWI PRASETYO,TN', 'L', ['Senin', 'Kamis'], 'Pagi'),
  createSeedPatient(5, 'IBRAHIM, TN', 'L', ['Senin', 'Kamis'], 'Pagi'),
  createSeedPatient(6, 'IG. GATOT SUKAMDIYONO, TN', 'L', ['Senin', 'Kamis'], 'Pagi'),
  createSeedPatient(7, 'INTAN LAILI N, NY', 'P', ['Senin', 'Kamis'], 'Pagi'),
  createSeedPatient(8, 'KLIWON (B)', 'L', ['Senin', 'Kamis'], 'Pagi', 'hepatitis_b'),
  createSeedPatient(9, 'LINDA WINDAYANTI, NY', 'P', ['Senin', 'Kamis'], 'Pagi'),
  createSeedPatient(10, 'MARDI HARJONO, TN', 'L', ['Senin', 'Kamis'], 'Pagi'),
  createSeedPatient(11, 'MARIA WIDHI HARTINI,CH,NY', 'P', ['Senin', 'Kamis'], 'Pagi'),
  createSeedPatient(12, 'MARLIYAH, NY', 'P', ['Senin', 'Kamis'], 'Pagi'),
  createSeedPatient(13, 'NANDA PRASETYO WIBOWO, TN', 'L', ['Senin', 'Kamis'], 'Pagi'),
  createSeedPatient(14, 'PONIJO, TN', 'L', ['Senin', 'Kamis'], 'Pagi'),
  createSeedPatient(15, 'SAMIUN, TN', 'L', ['Senin', 'Kamis'], 'Pagi'),
  createSeedPatient(16, 'SIGIT WIDAYANTO, TN', 'L', ['Senin', 'Kamis'], 'Pagi'),
  createSeedPatient(17, 'SITI SUILAH, NY', 'P', ['Senin'], 'Pagi'),
  createSeedPatient(18, 'SRI WAHYUNI, NY', 'P', ['Senin', 'Kamis'], 'Pagi'),
  createSeedPatient(19, 'SUPARJO,TN', 'L', ['Senin', 'Kamis'], 'Pagi'),
  createSeedPatient(20, 'SURATMI,NY', 'P', ['Senin', 'Kamis'], 'Pagi'),
  createSeedPatient(21, 'SUTADI TN', 'L', ['Senin', 'Kamis'], 'Pagi'),
  createSeedPatient(22, 'TOTOK ENDARYANTO, TN', 'L', ['Kamis'], 'Pagi'),
  createSeedPatient(23, 'TRI PUJI ASTUTI, NY', 'P', ['Senin', 'Kamis'], 'Pagi'),
  createSeedPatient(24, 'TUTIK MUJI SETYANINGRUM, NY', 'P', ['Senin', 'Kamis'], 'Pagi'),
  createSeedPatient(25, 'UNTUNG WAHYU KUSUMAJATI, TN', 'L', ['Senin', 'Kamis'], 'Pagi'),

  // Kelompok Senin - Kamis (Siang) — 26 Pasien (21 Senin Siang, 24 Kamis Siang)
  createSeedPatient(26, 'BAGUS SETIAWAN,A,TN', 'L', ['Senin', 'Kamis'], 'Siang'),
  createSeedPatient(27, 'BAMBANG WIDAYANTO,TN', 'L', ['Senin', 'Kamis'], 'Siang'),
  createSeedPatient(28, 'CHATARINA SUYATI, NY', 'P', ['Kamis'], 'Siang'),
  createSeedPatient(29, 'DEWIANA, NY', 'P', ['Senin', 'Kamis'], 'Siang'),
  createSeedPatient(30, 'DWI YULIANTO, TN', 'L', ['Senin', 'Kamis'], 'Siang'),
  createSeedPatient(31, 'JAYATRI, NY', 'P', ['Senin', 'Kamis'], 'Siang'),
  createSeedPatient(32, 'JOKO HARSOYO,TN', 'L', ['Senin'], 'Siang'),
  createSeedPatient(33, 'KATEMI, NY', 'P', ['Senin', 'Kamis'], 'Siang'),
  createSeedPatient(34, 'MARTINEM, NY', 'P', ['Senin', 'Kamis'], 'Siang'),
  createSeedPatient(35, 'MOKIAH, NY', 'P', ['Kamis'], 'Siang'),
  createSeedPatient(36, 'MUHAMAD HUDA ASHARI, TN', 'L', ['Senin', 'Kamis'], 'Siang'),
  createSeedPatient(37, 'MUJI LESTARI, NY', 'P', ['Senin', 'Kamis'], 'Siang'),
  createSeedPatient(38, 'NEVY PRAHESTY, NY', 'P', ['Senin', 'Kamis'], 'Siang'),
  createSeedPatient(39, 'RESNO HARTOYO, TN', 'L', ['Senin', 'Kamis'], 'Siang'),
  createSeedPatient(40, 'SARJONO,TN', 'L', ['Senin'], 'Siang'),
  createSeedPatient(41, 'SEPUDIN,TN', 'L', ['Senin', 'Kamis'], 'Siang'),
  createSeedPatient(42, 'SUBAHRI, TN', 'L', ['Kamis'], 'Siang'),
  createSeedPatient(43, 'SUGIYANTO,TN', 'L', ['Senin', 'Kamis'], 'Siang'),
  createSeedPatient(44, 'SUMINEM, NY', 'P', ['Senin', 'Kamis'], 'Siang'),
  createSeedPatient(45, 'SUMIYAH, NY', 'P', ['Kamis'], 'Siang'),
  createSeedPatient(46, 'SURAJIYEM,NY', 'P', ['Senin', 'Kamis'], 'Siang'),
  createSeedPatient(47, 'TEGUH HARTONO, TN', 'L', ['Kamis'], 'Siang'),
  createSeedPatient(48, 'TRI NGAISAH,NY', 'P', ['Senin', 'Kamis'], 'Siang'),
  createSeedPatient(49, 'TUGIMAN/MURYANTO, TN', 'L', ['Senin', 'Kamis'], 'Siang'),
  createSeedPatient(50, 'TUGIYAH,NY', 'P', ['Senin', 'Kamis'], 'Siang'),
  createSeedPatient(51, 'YANUAR ARDHIAN, TN', 'L', ['Senin', 'Kamis'], 'Siang'),

  // Kelompok Selasa - Jumat (Pagi) — 26 Pasien (25 Selasa Pagi, 25 Jumat Pagi)
  createSeedPatient(52, 'AGUS SUMPENO,TN', 'L', ['Selasa', 'Jumat'], 'Pagi'),
  createSeedPatient(53, 'ANANG SUSETO, TN', 'L', ['Selasa', 'Jumat'], 'Pagi'),
  createSeedPatient(54, 'ARI IDAWATI, NY', 'P', ['Selasa', 'Jumat'], 'Pagi'),
  createSeedPatient(55, 'BUDIMULIA YULIAN S,P, TN', 'L', ['Selasa', 'Jumat'], 'Pagi'),
  createSeedPatient(56, 'G. BAMBANG SUPADMONO, TN', 'L', ['Selasa', 'Jumat'], 'Pagi'),
  createSeedPatient(57, 'HERI MURTANTO,TN', 'L', ['Selasa', 'Jumat'], 'Pagi'),
  createSeedPatient(58, 'ISTIYAH,NY', 'P', ['Selasa', 'Jumat'], 'Pagi'),
  createSeedPatient(59, 'MARIA TRI HARTINI, NY', 'P', ['Selasa', 'Jumat'], 'Pagi'),
  createSeedPatient(60, 'MURNIYATI, NY', 'P', ['Selasa', 'Jumat'], 'Pagi'),
  createSeedPatient(61, 'NADISSA ROSARI DEWI, NY', 'P', ['Selasa', 'Jumat'], 'Pagi'),
  createSeedPatient(62, 'NENI WINARSIH,NY', 'P', ['Selasa', 'Jumat'], 'Pagi'),
  createSeedPatient(63, 'NUR WALANINGSIH, NY', 'P', ['Selasa', 'Jumat'], 'Pagi'),
  createSeedPatient(64, 'NURUL HIDAYATI, NY', 'P', ['Selasa', 'Jumat'], 'Pagi'),
  createSeedPatient(65, 'PETRUS EDY WALUYO,TN', 'L', ['Selasa', 'Jumat'], 'Pagi'),
  createSeedPatient(66, 'PETRUS GUNAWAN SUDARSONO, TN', 'L', ['Selasa', 'Jumat'], 'Pagi'),
  createSeedPatient(67, 'PUSPASARI PUDJINURWIDAYATI, NY', 'P', ['Selasa', 'Jumat'], 'Pagi'),
  createSeedPatient(68, 'RAHARTO, TN', 'L', ['Selasa'], 'Pagi'),
  createSeedPatient(69, 'SID FEBRILLA HADI.NY', 'P', ['Selasa', 'Jumat'], 'Pagi'),
  createSeedPatient(70, 'SIGIT PRAMONO, TN', 'L', ['Selasa', 'Jumat'], 'Pagi'),
  createSeedPatient(71, 'SRI UNTARI, NY', 'P', ['Selasa', 'Jumat'], 'Pagi'),
  createSeedPatient(72, 'SUDARIYAH,NY', 'P', ['Selasa', 'Jumat'], 'Pagi'),
  createSeedPatient(73, 'SUWARGITO,FX, TN', 'L', ['Selasa', 'Jumat'], 'Pagi'),
  createSeedPatient(74, 'SUWARNI,NN', 'P', ['Selasa', 'Jumat'], 'Pagi'),
  createSeedPatient(75, 'SUWARNO, TN', 'L', ['Selasa', 'Jumat'], 'Pagi'),
  createSeedPatient(76, 'WALUYO,TN', 'L', ['Jumat'], 'Pagi'),
  createSeedPatient(77, 'GANDHIS, NY', 'P', ['Selasa', 'Jumat'], 'Pagi'),

  // Kelompok Selasa - Jumat (Siang) — 24 Pasien (24 Selasa Siang, 24 Jumat Siang)
  createSeedPatient(78, 'AFRIANTI HARINDRATI, NY', 'P', ['Selasa', 'Jumat'], 'Siang'),
  createSeedPatient(79, 'ASTHO WIDODO TN', 'L', ['Selasa', 'Jumat'], 'Siang'),
  createSeedPatient(80, 'BRIAN PRIMA SINELEYAN, SDR', 'L', ['Selasa', 'Jumat'], 'Siang'),
  createSeedPatient(81, 'CAECILIA APRI SETYARINI, NY', 'P', ['Selasa', 'Jumat'], 'Siang'),
  createSeedPatient(82, 'CHRISTOPHORUS ADJI TRI SUBARKAH,TN', 'L', ['Selasa', 'Jumat'], 'Siang'),
  createSeedPatient(83, 'DARI AL PRAPTO, NY', 'P', ['Selasa', 'Jumat'], 'Siang'),
  createSeedPatient(84, 'DHEDI WAHYU LULUH WIDODO, TN', 'L', ['Selasa', 'Jumat'], 'Siang'),
  createSeedPatient(85, 'EKO DARYONO H, TN', 'L', ['Selasa', 'Jumat'], 'Siang'),
  createSeedPatient(86, 'FX ARGA SANDI YUDHA DWI PAMUNGKAS, SDR', 'L', ['Selasa', 'Jumat'], 'Siang'),
  createSeedPatient(87, 'IMAN NUGROHO.TN', 'L', ['Selasa', 'Jumat'], 'Siang'),
  createSeedPatient(88, 'IRA WIDANARTI, NY', 'P', ['Selasa', 'Jumat'], 'Siang'),
  createSeedPatient(89, 'MARJIYO, TN', 'L', ['Selasa', 'Jumat'], 'Siang'),
  createSeedPatient(90, 'MURTI SETIAWATI,IR,NY', 'P', ['Selasa', 'Jumat'], 'Siang'),
  createSeedPatient(91, 'PARIMAN, TN', 'L', ['Selasa', 'Jumat'], 'Siang'),
  createSeedPatient(92, 'PURWANTO,TN', 'L', ['Selasa', 'Jumat'], 'Siang'),
  createSeedPatient(93, 'SARSIYEM,NY', 'P', ['Selasa', 'Jumat'], 'Siang'),
  createSeedPatient(94, 'SIDIK SRIHARTO TN', 'L', ['Selasa', 'Jumat'], 'Siang'),
  createSeedPatient(95, 'SIGID SANTOSO. TN', 'L', ['Selasa', 'Jumat'], 'Siang'),
  createSeedPatient(96, 'SUDIYAH, NY', 'P', ['Selasa', 'Jumat'], 'Siang'),
  createSeedPatient(97, 'SURATMI SARWONO, NY', 'P', ['Selasa', 'Jumat'], 'Siang'),
  createSeedPatient(98, 'TAUFIK AZIZ HIMAWAN, SDR', 'L', ['Selasa', 'Jumat'], 'Siang'),
  createSeedPatient(99, 'WARSIATUN,NY', 'P', ['Selasa', 'Jumat'], 'Siang'),
  createSeedPatient(100, 'YANI, NY', 'P', ['Selasa', 'Jumat'], 'Siang'),
  createSeedPatient(101, 'SUWARDI, TN', 'L', ['Selasa', 'Jumat'], 'Siang'),

  // Kelompok Rabu - Sabtu (Pagi) — 24 Pasien (24 Rabu Pagi, 24 Sabtu Pagi)
  createSeedPatient(102, 'ACHMADI PUJI NURYANTO, TN', 'L', ['Rabu', 'Sabtu'], 'Pagi'),
  createSeedPatient(103, 'AGUNG PRASETYA,TN', 'L', ['Rabu', 'Sabtu'], 'Pagi'),
  createSeedPatient(104, 'ANON SAFRUDIANTO, TN', 'L', ['Rabu', 'Sabtu'], 'Pagi'),
  createSeedPatient(105, 'BAMBANG SUPRATISNO,TN', 'L', ['Rabu', 'Sabtu'], 'Pagi'),
  createSeedPatient(106, 'BUDI RAHAYU, TN', 'L', ['Rabu', 'Sabtu'], 'Pagi'),
  createSeedPatient(107, 'ENDANG WAHYUNI RAHAYU, NY', 'P', ['Rabu', 'Sabtu'], 'Pagi'),
  createSeedPatient(108, 'FARID DARMAWAN, TN', 'L', ['Rabu', 'Sabtu'], 'Pagi'),
  createSeedPatient(109, 'GUNAWAN PRABOWO, TN', 'L', ['Rabu', 'Sabtu'], 'Pagi'),
  createSeedPatient(110, 'HENGGA TIYASA,TN', 'L', ['Rabu', 'Sabtu'], 'Pagi'),
  createSeedPatient(111, 'INDRI PURWANTI, NY', 'P', ['Rabu', 'Sabtu'], 'Pagi'),
  createSeedPatient(112, 'MARJONO, TN', 'L', ['Rabu', 'Sabtu'], 'Pagi'),
  createSeedPatient(113, 'MUJIYONO, TN', 'L', ['Rabu', 'Sabtu'], 'Pagi'),
  createSeedPatient(114, 'NAR WAKIDI, TN', 'L', ['Rabu', 'Sabtu'], 'Pagi'),
  createSeedPatient(115, 'NGATMINI, NY', 'P', ['Rabu', 'Sabtu'], 'Pagi'),
  createSeedPatient(116, 'NOVITA DEWI,NY', 'P', ['Rabu', 'Sabtu'], 'Pagi'),
  createSeedPatient(117, 'PARTINI, NY', 'P', ['Rabu', 'Sabtu'], 'Pagi'),
  createSeedPatient(118, 'PENYANI, TN', 'L', ['Rabu', 'Sabtu'], 'Pagi'),
  createSeedPatient(119, 'SAPARBE, TN', 'L', ['Rabu', 'Sabtu'], 'Pagi'),
  createSeedPatient(120, 'SUGENG PURNOMO, TN', 'L', ['Rabu', 'Sabtu'], 'Pagi'),
  createSeedPatient(121, 'TOTA VIVERI M, TN', 'L', ['Rabu', 'Sabtu'], 'Pagi'),
  createSeedPatient(122, 'TRI SASMINI, NY', 'P', ['Rabu', 'Sabtu'], 'Pagi'),
  createSeedPatient(123, 'TUKIMIN, TN', 'L', ['Rabu', 'Sabtu'], 'Pagi'),
  createSeedPatient(124, 'WARSONO, TN', 'L', ['Rabu', 'Sabtu'], 'Pagi'),
  createSeedPatient(125, 'WIJOYO, TN', 'L', ['Rabu', 'Sabtu'], 'Pagi'),

  // Kelompok Rabu - Sabtu (Siang) — 26 Pasien (24 Rabu Siang, 23 Sabtu Siang)
  createSeedPatient(126, 'AWAN GUNARDI,TN', 'L', ['Rabu', 'Sabtu'], 'Siang'),
  createSeedPatient(127, 'BUDIANTO, TN', 'L', ['Rabu', 'Sabtu'], 'Siang'),
  createSeedPatient(128, 'ETTY SUNARYATI, NY', 'P', ['Rabu', 'Sabtu'], 'Siang'),
  createSeedPatient(129, 'GIATNO, TN', 'L', ['Rabu', 'Sabtu'], 'Siang'),
  createSeedPatient(130, 'HAMAM TOHARI, TN', 'L', ['Rabu'], 'Siang'),
  createSeedPatient(131, 'HARIS ABRIJANTO, TN', 'L', ['Rabu', 'Sabtu'], 'Siang'),
  createSeedPatient(132, 'HIDAYATI,NY', 'P', ['Rabu', 'Sabtu'], 'Siang'),
  createSeedPatient(133, 'IKA PUJI LESTARI, NY', 'P', ['Rabu', 'Sabtu'], 'Siang'),
  createSeedPatient(134, 'INDRIYANI, NY', 'P', ['Rabu', 'Sabtu'], 'Siang'),
  createSeedPatient(135, 'KLIWON / DARTO WIYONO, TN', 'L', ['Rabu', 'Sabtu'], 'Siang'),
  createSeedPatient(136, 'MARDIYONO,TN', 'L', ['Rabu'], 'Siang'),
  createSeedPatient(137, 'MUDJIKAN, TN', 'L', ['Rabu', 'Sabtu'], 'Siang'),
  createSeedPatient(138, 'MURDIYATI,NY', 'P', ['Sabtu'], 'Siang'),
  createSeedPatient(139, 'SAPTONO, TN', 'L', ['Rabu', 'Sabtu'], 'Siang'),
  createSeedPatient(140, 'SITI MAULIDA BUSRONIATI, NY', 'P', ['Rabu', 'Sabtu'], 'Siang'),
  createSeedPatient(141, 'SITI WARDANINGSIH, NY', 'P', ['Rabu', 'Sabtu'], 'Siang'),
  createSeedPatient(142, 'SUGENG RAHARJO,TN', 'L', ['Rabu', 'Sabtu'], 'Siang'),
  createSeedPatient(143, 'SUGIRAHARJO, TN', 'L', ['Rabu', 'Sabtu'], 'Siang'),
  createSeedPatient(144, 'SUJIASTO, TN', 'L', ['Rabu', 'Sabtu'], 'Siang'),
  createSeedPatient(145, 'SULISTIYANINGRUM, S.PD.', 'P', ['Sabtu'], 'Siang'),
  createSeedPatient(146, 'SUMARNO, TN', 'L', ['Rabu', 'Sabtu'], 'Siang'),
  createSeedPatient(147, 'WALJILAH,NY', 'P', ['Rabu', 'Sabtu'], 'Siang'),
  createSeedPatient(148, 'WIRYADI,TN', 'L', ['Rabu', 'Sabtu'], 'Siang'),
  createSeedPatient(149, 'YATIMAN,TN', 'L', ['Rabu'], 'Siang'),
  createSeedPatient(150, 'ZAFIR SALIM ARDI,TN', 'L', ['Rabu', 'Sabtu'], 'Siang'),
  createSeedPatient(151, 'PURWANTI, NY', 'P', ['Rabu', 'Sabtu'], 'Siang')
];

// 17 Akun Perawat Resmi Unit Hemodialisis RS Happy Land Medical Centre:
// - 1 Kepala Ruang: TWIS FERTILIANTI PW (twis.hdhl)
// - 4 PJ Shift: M HAIKAL MALILANG, M NOR KHOIRUDIN, APRILLIA DWI N, NOVIALITA ARYADI
// - 12 Perawat Pelaksana: RIZKY WAHYU A s/d AYU PUSPITA
export const sampleBenchmarkNurses: MasterNurse[] = [
  // 1. Kepala Ruang
  {
    id: 'nurse-hdhl-01',
    name: 'TWIS FERTILIANTI PW',
    nip: '20240101',
    role: 'kepala_ruangan',
    systemAccess: 'kepala_ruangan',
    username: 'twis.hdhl',
    email: 'twis.hdhl@happyland.co.id',
    password: '12345',
    accountStatus: 'aktif',
    pernefriCertified: true,
    isOnDutyToday: true,
    shiftAssigned: 'Pagi',
    phone: '-'
  },

  // 2–5. PJ Shift (2 Pagi & 2 Siang)
  {
    id: 'nurse-hdhl-02',
    name: 'M HAIKAL MALILANG',
    nip: '20240102',
    role: 'pj_shift',
    systemAccess: 'pj_shift',
    username: 'haikal.hdhl',
    email: 'haikal.hdhl@happyland.co.id',
    password: '12345',
    accountStatus: 'aktif',
    pernefriCertified: true,
    isOnDutyToday: true,
    shiftAssigned: 'Pagi',
    phone: '-'
  },
  {
    id: 'nurse-hdhl-03',
    name: 'M NOR KHOIRUDIN',
    nip: '20240103',
    role: 'pj_shift',
    systemAccess: 'pj_shift',
    username: 'udin.hdhl',
    email: 'udin.hdhl@happyland.co.id',
    password: '12345',
    accountStatus: 'aktif',
    pernefriCertified: true,
    isOnDutyToday: false,
    shiftAssigned: 'Pagi',
    phone: '-'
  },
  {
    id: 'nurse-hdhl-04',
    name: 'APRILLIA DWI N',
    nip: '20240104',
    role: 'pj_shift',
    systemAccess: 'pj_shift',
    username: 'april.hdhl',
    email: 'april.hdhl@happyland.co.id',
    password: '12345',
    accountStatus: 'aktif',
    pernefriCertified: true,
    isOnDutyToday: true,
    shiftAssigned: 'Siang',
    phone: '-'
  },
  {
    id: 'nurse-hdhl-05',
    name: 'NOVIALITA ARYADI',
    nip: '20240105',
    role: 'pj_shift',
    systemAccess: 'pj_shift',
    username: 'novi.hdhl',
    email: 'novi.hdhl@happyland.co.id',
    password: '12345',
    accountStatus: 'aktif',
    pernefriCertified: true,
    isOnDutyToday: false,
    shiftAssigned: 'Siang',
    phone: '-'
  },

  // 6–11. Perawat Pelaksana — Shift Pagi (6 Perawat)
  {
    id: 'nurse-hdhl-06',
    name: 'RIZKY WAHYU A',
    nip: '20240106',
    role: 'perawat_pelaksana',
    systemAccess: 'perawat_pelaksana',
    username: 'rizky.hdhl',
    email: 'rizky.hdhl@happyland.co.id',
    password: '12345',
    accountStatus: 'aktif',
    pernefriCertified: true,
    isOnDutyToday: true,
    shiftAssigned: 'Pagi',
    phone: '-'
  },
  {
    id: 'nurse-hdhl-07',
    name: 'DEA IKA P',
    nip: '20240107',
    role: 'perawat_pelaksana',
    systemAccess: 'perawat_pelaksana',
    username: 'dea.hdhl',
    email: 'dea.hdhl@happyland.co.id',
    password: '12345',
    accountStatus: 'aktif',
    pernefriCertified: true,
    isOnDutyToday: true,
    shiftAssigned: 'Pagi',
    phone: '-'
  },
  {
    id: 'nurse-hdhl-08',
    name: 'Y BRILLISANTO',
    nip: '20240108',
    role: 'perawat_pelaksana',
    systemAccess: 'perawat_pelaksana',
    username: 'brilli.hdhl',
    email: 'brilli.hdhl@happyland.co.id',
    password: '12345',
    accountStatus: 'aktif',
    pernefriCertified: true,
    isOnDutyToday: true,
    shiftAssigned: 'Pagi',
    phone: '-'
  },
  {
    id: 'nurse-hdhl-09',
    name: 'SISWANTINI CATUR P',
    nip: '20240109',
    role: 'perawat_pelaksana',
    systemAccess: 'perawat_pelaksana',
    username: 'siswantini.hdhl',
    email: 'siswantini.hdhl@happyland.co.id',
    password: '12345',
    accountStatus: 'aktif',
    pernefriCertified: true,
    isOnDutyToday: true,
    shiftAssigned: 'Pagi',
    phone: '-'
  },
  {
    id: 'nurse-hdhl-10',
    name: 'RENI DWI A',
    nip: '20240110',
    role: 'perawat_pelaksana',
    systemAccess: 'perawat_pelaksana',
    username: 'reni.hdhl',
    email: 'reni.hdhl@happyland.co.id',
    password: '12345',
    accountStatus: 'aktif',
    pernefriCertified: true,
    isOnDutyToday: true,
    shiftAssigned: 'Pagi',
    phone: '-'
  },
  {
    id: 'nurse-hdhl-11',
    name: 'HARI ENDAH C',
    nip: '20240111',
    role: 'perawat_pelaksana',
    systemAccess: 'perawat_pelaksana',
    username: 'endah.hdhl',
    email: 'endah.hdhl@happyland.co.id',
    password: '12345',
    accountStatus: 'aktif',
    pernefriCertified: true,
    isOnDutyToday: true,
    shiftAssigned: 'Pagi',
    phone: '-'
  },

  // 12–17. Perawat Pelaksana — Shift Siang (6 Perawat)
  {
    id: 'nurse-hdhl-12',
    name: 'AYU WULANDARI',
    nip: '20240112',
    role: 'perawat_pelaksana',
    systemAccess: 'perawat_pelaksana',
    username: 'ayuw.hdhl',
    email: 'ayuw.hdhl@happyland.co.id',
    password: '12345',
    accountStatus: 'aktif',
    pernefriCertified: true,
    isOnDutyToday: true,
    shiftAssigned: 'Siang',
    phone: '-'
  },
  {
    id: 'nurse-hdhl-13',
    name: 'FRANSISCA RANI L',
    nip: '20240113',
    role: 'perawat_pelaksana',
    systemAccess: 'perawat_pelaksana',
    username: 'rani.hdhl',
    email: 'rani.hdhl@happyland.co.id',
    password: '12345',
    accountStatus: 'aktif',
    pernefriCertified: true,
    isOnDutyToday: true,
    shiftAssigned: 'Siang',
    phone: '-'
  },
  {
    id: 'nurse-hdhl-14',
    name: 'NITA RESTIANA P',
    nip: '20240114',
    role: 'perawat_pelaksana',
    systemAccess: 'perawat_pelaksana',
    username: 'nita.hdhl',
    email: 'nita.hdhl@happyland.co.id',
    password: '12345',
    accountStatus: 'aktif',
    pernefriCertified: true,
    isOnDutyToday: true,
    shiftAssigned: 'Siang',
    phone: '-'
  },
  {
    id: 'nurse-hdhl-15',
    name: 'RINI WULANDARI',
    nip: '20240115',
    role: 'perawat_pelaksana',
    systemAccess: 'perawat_pelaksana',
    username: 'rini.hdhl',
    email: 'rini.hdhl@happyland.co.id',
    password: '12345',
    accountStatus: 'aktif',
    pernefriCertified: true,
    isOnDutyToday: true,
    shiftAssigned: 'Siang',
    phone: '-'
  },
  {
    id: 'nurse-hdhl-16',
    name: 'YUMIATI',
    nip: '20240116',
    role: 'perawat_pelaksana',
    systemAccess: 'perawat_pelaksana',
    username: 'yumi.hdhl',
    email: 'yumi.hdhl@happyland.co.id',
    password: '12345',
    accountStatus: 'aktif',
    pernefriCertified: true,
    isOnDutyToday: true,
    shiftAssigned: 'Siang',
    phone: '-'
  },
  {
    id: 'nurse-hdhl-17',
    name: 'AYU PUSPITA',
    nip: '20240117',
    role: 'perawat_pelaksana',
    systemAccess: 'perawat_pelaksana',
    username: 'puspita.hdhl',
    email: 'puspita.hdhl@happyland.co.id',
    password: '12345',
    accountStatus: 'aktif',
    pernefriCertified: true,
    isOnDutyToday: true,
    shiftAssigned: 'Siang',
    phone: '-'
  }
];

const BED_ZONE_SPECS: Array<{
  zoneLabel: string;
  serialPrefix: string;
  count: number;
  designation: MasterBed['designation'];
}> = [
  { zoneLabel: 'BED A', serialPrefix: 'A', count: 12, designation: 'reguler' },
  { zoneLabel: 'BED B', serialPrefix: 'B', count: 9, designation: 'reguler' },
  { zoneLabel: 'BED C', serialPrefix: 'C', count: 8, designation: 'reguler' },
  { zoneLabel: 'BED D', serialPrefix: 'D', count: 3, designation: 'reguler' },
  { zoneLabel: 'BED E', serialPrefix: 'E', count: 2, designation: 'reguler' },
  { zoneLabel: 'BED F', serialPrefix: 'F', count: 2, designation: 'reguler' },
  { zoneLabel: 'BED ISOLASI ', serialPrefix: 'ISO', count: 4, designation: 'isolasi' }
];

export const sampleBenchmarkBeds: MasterBed[] = BED_ZONE_SPECS.flatMap((spec) =>
  Array.from({ length: spec.count }, (_, idx) => {
    const numStr = String(idx + 1).padStart(2, '0');
    const bedNumber = `${spec.zoneLabel}${numStr}`;
    const idSlug = `${spec.serialPrefix.toLowerCase()}-${numStr}`;

    return {
      id: `bed-sas4000-${idSlug}`,
      bedNumber,
      machineBrand: 'SAS 4000',
      machineModel: 'SAS 4000',
      serialNumber: `SAS4000-${spec.serialPrefix}${numStr}`,
      designation: spec.designation,
      status: 'ready' as const,
      lastDisinfectionDate: getCurrentIsoDateWib()
    };
  })
);

export const initialMasterPatients: MasterPatient[] = sampleBenchmarkPatients;
export const initialMasterNurses: MasterNurse[] = sampleBenchmarkNurses;
export const initialMasterBeds: MasterBed[] = sampleBenchmarkBeds;

export const initialMasterDoctors: MasterDoctor[] = [
  {
    id: 'doc-heru',
    name: 'dr. Raden Heru Prasanto, Sp.PD-KGH',
    role: 'dpjp',
    spesialisasi: 'Spesialis Penyakit Dalam - Konsultan Ginjal Hipertensi (Sp.PD-KGH)',
    sip: 'SIP.446/001/DPJP/2024',
    nip: '197508122002121001',
    phone: '0812-3456-7890',
    email: 'heru.prasanto@happyland.co.id',
    status: 'aktif',
    notes: 'DPJP Utama Instalasi Hemodialisis RS Happy Land'
  },
  {
    id: 'doc-paramitha',
    name: 'dr. Paramitha, Sp.PD-KGH',
    role: 'both',
    spesialisasi: 'Spesialis Penyakit Dalam - Konsultan Ginjal Hipertensi (Sp.PD-KGH)',
    sip: 'SIP.446/002/DPJP/2024',
    nip: '198203152008012003',
    phone: '0812-3456-7891',
    email: 'paramitha@happyland.co.id',
    status: 'aktif',
    notes: 'DPJP Konsulen & Dokter Jaga Ruangan'
  },
  {
    id: 'doc-tri-hastuti',
    name: 'dr. Tri Hastuti, Sp.PD-KGH',
    role: 'both',
    spesialisasi: 'Spesialis Penyakit Dalam - Konsultan Ginjal Hipertensi (Sp.PD-KGH)',
    sip: 'SIP.446/003/DPJP/2024',
    nip: '198007202006042002',
    phone: '0812-3456-7892',
    email: 'tri.hastuti@happyland.co.id',
    status: 'aktif',
    notes: 'DPJP Konsulen & Dokter Jaga Ruangan'
  },
  {
    id: 'doc-konsulen',
    name: 'dr. Konsulen Pengganti, Sp.PD',
    role: 'dpjp',
    spesialisasi: 'Spesialis Penyakit Dalam (Sp.PD)',
    sip: 'SIP.446/004/DPJP/2024',
    nip: '198511102010011004',
    phone: '0812-3456-7893',
    email: 'konsulen@happyland.co.id',
    status: 'aktif',
    notes: 'Dokter Pengganti / On-call DPJP'
  },
  {
    id: 'doc-budi',
    name: 'dr. Budi Setiawan',
    role: 'dokter_jaga',
    spesialisasi: 'Dokter Umum / Jaga Ruangan HD',
    sip: 'SIP.446/010/DJ/2024',
    nip: '199005012015021005',
    phone: '0812-3456-7894',
    email: 'budi.setiawan@happyland.co.id',
    status: 'aktif',
    notes: 'Dokter Jaga Shift Pagi & Siang'
  },
  {
    id: 'doc-aditya',
    name: 'dr. Aditya Nugraha',
    role: 'dokter_jaga',
    spesialisasi: 'Dokter Umum / Jaga Ruangan HD',
    sip: 'SIP.446/011/DJ/2024',
    nip: '199208142018011006',
    phone: '0812-3456-7895',
    email: 'aditya.nugraha@happyland.co.id',
    status: 'aktif',
    notes: 'Dokter Jaga Shift'
  },
  {
    id: 'doc-siti',
    name: 'dr. Siti Rahmawati',
    role: 'dokter_jaga',
    spesialisasi: 'Dokter Umum / Jaga Ruangan HD',
    sip: 'SIP.446/012/DJ/2024',
    nip: '199312052019032007',
    phone: '0812-3456-7896',
    email: 'siti.rahmawati@happyland.co.id',
    status: 'aktif',
    notes: 'Dokter Jaga Shift'
  }
];


