import {
  PatientHDSession,
  ShiftInfo,
  MachineOverview,
  OperationalItem,
  SbarData
} from '../types/dialysis.ts';
import { getCurrentIndonesianFullDate } from '../utils/dateHelpers.ts';

export const initialShiftInfo: ShiftInfo = {
  hospitalName: 'RS HAPPY LAND MEDICAL CENTRE',
  unitName: 'INSTALASI DIALISIS',
  date: getCurrentIndonesianFullDate(),
  shift: 'Pagi',
  shiftHours: 'Pagi, jam 07.00 - 14.00 WIB',
  pjShift: 'M HAIKAL MALILANG',
  kepalaRuangan: 'TWIS FERTILIANTI PW',
  dokterDpjp: 'dr. Paramitha, Sp.PD-KGH',
  dokterJaga: 'dr. Budi Setiawan',
  totalPerawatDinas: 8,
  detailPerawat: '8 Orang (1 Ka. Ruangan, 1 PJ Shift, 6 Pelaksana)',
  perawatRatio: '-',
  tenagaPendukung: '1 Teknisi Elektromedis/RO, 1 HK Ruangan',
  pjShiftBerikutnya: 'APRILLIA DWI N'
};

export const initialMachineOverview: MachineOverview = {
  totalCapacity: 40,
  beroperasiSiapPakai: 40,
  maintenance: 0,
  khususHepB: 4,
  khususHepC: 0
};

export const benchmarkShiftInfo: ShiftInfo = {
  ...initialShiftInfo
};

export const benchmarkMachineOverview: MachineOverview = {
  ...initialMachineOverview
};

export const initialOperationalItems: OperationalItem[] = [
  {
    id: 'op-ro',
    item: 'Sistem Water Treatment (RO)',
    parameterUji: 'Air Baku, Air Distribusi, Pompa air dan Filter',
    hasilObservasi: 'Air RO Tersedia, TDS < 10 ppm, Hardness 0, pH 6.8',
    statusKepatuhan: 'MEMENUHI SYARAT'
  },
  {
    id: 'op-bmhp',
    item: 'Kesiapan Logistik & BMHP',
    parameterUji: 'Cairan Acid & Bikarbonat, Dialiser, Tubing',
    hasilObservasi: 'Stok aman untuk 2 shift berikutnya',
    statusKepatuhan: 'TERSEDIA LENGKAP'
  },
  {
    id: 'op-emergency',
    item: 'Emergency Trolley & DC Shock',
    parameterUji: 'Pemeriksaan fungsi alat & integritas segel',
    hasilObservasi: 'Segel Utuh No. SG-88214, Obat Exp OK, DC Shock Siap',
    statusKepatuhan: 'SIAP PAKAI'
  },
  {
    id: 'op-desinfeksi',
    item: 'Desinfeksi Mesin Pasca Shift',
    parameterUji: 'Chemical / Heat Disinfection Mesin HD',
    hasilObservasi: 'Semua mesin didesinfeksi tuntas',
    statusKepatuhan: 'SELESAI 100%'
  },
  {
    id: 'op-ikp',
    item: 'Insiden Keselamatan Pasien (IKP)',
    parameterUji: 'KTD / KNC / KTC / Sentinel Event',
    hasilObservasi: 'Nihil Kejadian Insiden Shift Ini',
    statusKepatuhan: 'NIHIL INCIDENT'
  },
  {
    id: 'op-b3',
    item: 'Pengelolaan Limbah Medis B3',
    parameterUji: 'Safety box needle & kantong plastik kuning',
    hasilObservasi: 'Safety box & kantong kuning terikat rapat',
    statusKepatuhan: 'TERKONTROL'
  },
  {
    id: 'op-ruangan',
    item: 'Kebersihan & Suhu Ruangan',
    parameterUji: 'Suhu 21.5°C, Kelembaban 52%, Lantai Steril',
    hasilObservasi: 'Disemprot desinfektan permukaan meja & bed, AC stabil',
    statusKepatuhan: 'SESUAI STANDAR'
  }
];

export const initialSbar: SbarData = {
  situation: 'Pelayanan shift siap dimulai. Belum ada catatan kejadian khusus.',
  background: 'Belum ada riwayat komplikasi intradialitik.',
  assessment: 'Pencapaian target hemodialisa dalam pemantauan.',
  recommendation: `1. Pastikan persiapan mesin dan priming dialiser sesuai SOP.
2. Lakukan pengujian rutin parameter mutu air RO.`
};

// Seluruh data pasien bawaan sistem dihapus sepenuhnya
export const benchmarkSamplePatients: PatientHDSession[] = [];
export const initialPatients: PatientHDSession[] = [];
