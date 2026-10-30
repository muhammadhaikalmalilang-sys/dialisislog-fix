/**
 * Structured clinical checklists & calculators for Logbook Harian Perawat HD
 * Covers Bagian 2 (Poin 2.1), Bagian 3 (Poin 3.1, 3.2, 3.3, 3.5, 3.6), and Bagian 4 (Poin 4.3)
 */
import type { VascularAccess } from '../types/dialysis.ts';

export interface Poin2_1ClinicalData {
  apd: boolean;
  cuciTangan: boolean;
}

export type Poin3_1Status = 'RAWAT JALAN' | 'RAWAT INAP';
export type Poin3_1RuangRawatInap = 'ICU' | 'CAMELIA' | 'DAHLIA';
export type Poin3_1Kategori =
  | 'REGULER'
  | 'ISOLASI HEPATITIS B'
  | 'ISOLASI HEPATITIS C/HIV';

export interface Poin3_1ClinicalData {
  verbal: {
    namaLengkap: boolean;
    tanggalLahir: boolean;
  };
  nonVerbal: {
    gelangIdentitas: boolean;
    dokumenRmDanResep: boolean;
  };
  tanggalLahirPasien: string;
  status: Poin3_1Status | '';
  ruangRawatInap: Poin3_1RuangRawatInap | '';
  kategori: Poin3_1Kategori | '';
}

export interface Poin3_2ClinicalData {
  bbPre: string; // Berat Badan Datang (kg)
  bbPost: string; // Berat Badan Pulang (kg)
  bbKering: string; // Berat Badan Kering (kg)
  ufg: string; // mL (opsional / legacy)
}

export interface Poin3_3ClinicalData {
  tdPreHd?: string; // Tekanan Darah Pre HD (cth: "140/85" mmHg)
  tdSistolik: string; // mmHg
  tdDiastolik: string; // mmHg
  posisiTd: 'Duduk' | 'Berbaring';
  nadi: string; // x/menit
  pernapasan: string; // x/menit
  suhu: string; // °C
  spo2: string; // %
}

export interface Poin3_5ClinicalData {
  waktuDialisis: string; // Waktu Dialisis / Time (Jam)
  targetUfg: string; // Target UFG (mL)
  qb: string; // QB (mL/menit)
  qd: string; // QD (mL/menit)
  dosisHeparin: string; // Dosis Heparin (IU / keterangan)
}

export interface Poin3_6ClinicalData {
  ciminoAktif: boolean;
  cimino: string; // Akses vaskuler CIMINO
  cdlAktif: boolean;
  cdl: string; // Akses vaskuler CDL
  femoralAktif: boolean;
  femoral: string; // Akses vaskuler FEMORAL
  vascularAccessNurse?: string; // Nama perawat yang melakukan aksesing vaskular pada pasien ini
}

export interface Poin4_1ClinicalData {
  tdIntraHd: string; // Tekanan Darah Intra HD (cth: "130/80" mmHg)
}

export type Poin4_3ComplicationKey =
  | 'hipertensi'
  | 'hipotensi'
  | 'kramOtot'
  | 'hipoglikemi'
  | 'hipertermi'
  | 'mual'
  | 'muntah'
  | 'penurunanKesadaran'
  | 'clotting'
  | 'firstUseSyndrome'
  | 'aksesBleeding';

export type Poin4_3ComplicationActiveKey =
  | 'hipertensiAktif'
  | 'hipotensiAktif'
  | 'kramOtotAktif'
  | 'hipoglikemiAktif'
  | 'hipertermiAktif'
  | 'mualAktif'
  | 'muntahAktif'
  | 'penurunanKesadaranAktif'
  | 'clottingAktif'
  | 'firstUseSyndromeAktif'
  | 'aksesBleedingAktif';

export interface Poin4_3DynamicEntry {
  id: string;
  jenis: string; // e.g. 'Hipertensi', 'Hipotensi', 'Hipoglikemi', 'Hipertermi', 'Kram Otot', 'Mual', 'Muntah', 'Clotting', 'Akses Bleeding', 'First-Use Syndrome', 'Penurunan Kesadaran', 'Komplikasi Lainnya'
  jam: string; // e.g. '09:15'
  nilai?: string; // Nilai komplikasi: Tekanan Darah (Hipertensi/Hipotensi), GDS (Hipoglikemi), Suhu Tubuh (Hipertermi)
  advisDokter: string; // e.g. 'Bolus NaCl 0.9% 100 cc, posisi Trendelenburg'
}

export interface ComplicationValueConfig {
  hasValue: boolean;
  label: string;
  placeholder: string;
  unit: string;
}

export function getComplicationValueConfig(jenis: string): ComplicationValueConfig {
  const clean = (jenis || '').trim().toLowerCase();
  if (clean === 'hipertensi' || clean.includes('hipertensi')) {
    return {
      hasValue: true,
      label: 'Tekanan Darah',
      placeholder: 'Cth: 180/100',
      unit: 'mmHg'
    };
  }
  if (clean === 'hipotensi' || clean.includes('hipotensi')) {
    return {
      hasValue: true,
      label: 'Tekanan Darah',
      placeholder: 'Cth: 85/50',
      unit: 'mmHg'
    };
  }
  if (clean === 'hipoglikemi' || clean.includes('hipoglikemi')) {
    return {
      hasValue: true,
      label: 'Gula Darah Sewaktu (GDS)',
      placeholder: 'Cth: 55',
      unit: 'mg/dL'
    };
  }
  if (clean === 'hipertermi' || clean.includes('hipertermi')) {
    return {
      hasValue: true,
      label: 'Suhu Tubuh',
      placeholder: 'Cth: 38.5',
      unit: '°C'
    };
  }
  return {
    hasValue: false,
    label: '',
    placeholder: '',
    unit: ''
  };
}

export const PILIHAN_KOMPLIKASI_DROPDOWN: Array<{
  value: string;
  label: string;
  defaultAdvis?: string;
}> = [
  {
    value: 'Hipertensi',
    label: 'Hipertensi',
    defaultAdvis: 'Evaluasi obat antihipertensi, istirahatkan pasien'
  },
  {
    value: 'Hipotensi',
    label: 'Hipotensi',
    defaultAdvis: 'Posisi Trendelenburg, bolus NaCl 0.9% 100 mL, turunkan UF rate'
  },
  {
    value: 'Hipoglikemi',
    label: 'Hipoglikemi',
    defaultAdvis: 'Cek GDS cito, beri teh manis / Bolus D40% sesuai advis'
  },
  {
    value: 'Hipertermi',
    label: 'Hipertermi',
    defaultAdvis: 'Kompres hangat, pantau TTV, berikan antipiretik sesuai instruksi DPJP'
  },
  {
    value: 'Kram Otot',
    label: 'Kram Otot',
    defaultAdvis: 'Masase lokal, kompres hangat, bolus NaCl 0.9% 100 mL'
  },
  {
    value: 'Mual',
    label: 'Mual',
    defaultAdvis: 'Observasi TTV, atur posisi nyaman, injeksi antiemetik bila perlu'
  },
  {
    value: 'Muntah',
    label: 'Muntah',
    defaultAdvis: 'Miringkan kepala, bersihkan jalan nafas, evaluasi intake'
  },
  {
    value: 'Clotting',
    label: 'Clotting',
    defaultAdvis: 'Bilas NaCl 0.9% 100 mL, evaluasi heparinisasi / ganti sirkuit'
  },
  {
    value: 'Akses Bleeding',
    label: 'Akses Bleeding',
    defaultAdvis: 'Balut tekan hemostasis 10-15 menit, evaluasi kanulasi'
  },
  {
    value: 'First-Use Syndrome',
    label: 'First-Use Syndrome',
    defaultAdvis: 'Stop dialisis sementara, berikan antihistamin/kortikosteroid sesuai instruksi'
  },
  {
    value: 'Penurunan Kesadaran',
    label: 'Penurunan Kesadaran',
    defaultAdvis: 'Pasang O2 nasal kanul, posisikan aman, lapor DPJP cito'
  },
  {
    value: 'Komplikasi Lainnya',
    label: 'Komplikasi Lainnya',
    defaultAdvis: ''
  }
];

export function getDefaultAdvisForJenis(jenis: string): string {
  if (!jenis) return '';
  const clean = jenis.trim().toLowerCase();
  const found = PILIHAN_KOMPLIKASI_DROPDOWN.find(
    (item) => item.value.toLowerCase() === clean || item.label.toLowerCase().includes(clean)
  );
  return found?.defaultAdvis || '';
}

export function createDefaultPoin4_3Entry(
  jenis: string = 'Hipertensi',
  jam?: string,
  advis?: string,
  nilai?: string
): Poin4_3DynamicEntry {
  const chosenJenis = jenis || 'Hipertensi';
  let defaultJam = jam ?? '';
  if (!defaultJam) {
    const now = new Date();
    defaultJam = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }
  return {
    id: `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    jenis: chosenJenis,
    jam: defaultJam,
    nilai: nilai !== undefined ? nilai : '',
    advisDokter: advis !== undefined ? advis : getDefaultAdvisForJenis(chosenJenis)
  };
}

export interface Poin4_3ClinicalData {
  tidakAdaKomplikasi: boolean;
  entries?: Poin4_3DynamicEntry[];
  hipertensiAktif: boolean;
  hipertensi: string;
  hipotensiAktif: boolean;
  hipotensi: string;
  hipoglikemiAktif: boolean;
  hipoglikemi: string;
  hipertermiAktif?: boolean;
  hipertermi?: string;
  kramOtotAktif: boolean;
  kramOtot: string;
  mualAktif: boolean;
  mual: string;
  muntahAktif: boolean;
  muntah: string;
  clottingAktif: boolean;
  clotting: string;
  aksesBleedingAktif: boolean;
  aksesBleeding: string;
  firstUseSyndromeAktif: boolean;
  firstUseSyndrome: string;
  penurunanKesadaranAktif: boolean;
  penurunanKesadaran: string;
}

export interface Poin6_3ClinicalData {
  tdPostHd: string; // Tekanan Darah Post HD (cth: "125/80" mmHg)
  ufgTercapai: string; // Nilai UFG Tercapai (mL, cth: "2500")
  ktV: string; // KT/V Adekuasi Dialisis (cth: "1.4")
}

export interface PatientLogbookClinicalDetails {
  poin2_1: Poin2_1ClinicalData;
  poin3_1: Poin3_1ClinicalData;
  poin3_2: Poin3_2ClinicalData;
  poin3_3: Poin3_3ClinicalData;
  poin3_5: Poin3_5ClinicalData;
  poin3_6: Poin3_6ClinicalData;
  poin4_1: Poin4_1ClinicalData;
  poin4_3: Poin4_3ClinicalData;
  poin6_3: Poin6_3ClinicalData;
}

export const KOMPLIKASI_INTRA_HD_ITEMS: Array<{
  key: Poin4_3ComplicationKey;
  activeKey: Poin4_3ComplicationActiveKey;
  label: string;
  sublabel: string;
  placeholder: string;
  wideOnDesktop?: boolean;
}> = [
  {
    key: 'hipertensi',
    activeKey: 'hipertensiAktif',
    label: 'Hipertensi',
    sublabel: 'TD meningkat intra-HD',
    placeholder: 'Cth: TD 190/100 mmHg, Amlodipin'
  },
  {
    key: 'hipotensi',
    activeKey: 'hipotensiAktif',
    label: 'Hipotensi',
    sublabel: 'TD turun / simtomatik',
    placeholder: 'Cth: TD 85/50 mmHg, bolus NaCl 100 mL'
  },
  {
    key: 'hipoglikemi',
    activeKey: 'hipoglikemiAktif',
    label: 'Hipoglikemi',
    sublabel: 'GDS rendah / lemas',
    placeholder: 'Cth: GDS 55 mg/dL, D40% / teh manis'
  },
  {
    key: 'hipertermi',
    activeKey: 'hipertermiAktif',
    label: 'Hipertermi',
    sublabel: 'Suhu tubuh meningkat / demam',
    placeholder: 'Cth: Suhu 38.5°C, kompres hangat & antipiretik'
  },
  {
    key: 'kramOtot',
    activeKey: 'kramOtotAktif',
    label: 'Kram Otot',
    sublabel: 'Spasme otot intra-HD',
    placeholder: 'Cth: Betis, masase & turunkan UF'
  },
  {
    key: 'mual',
    activeKey: 'mualAktif',
    label: 'Mual',
    sublabel: 'Nausea intra-HD',
    placeholder: 'Cth: Mual jam ke-2, Ondansetron IV'
  },
  {
    key: 'muntah',
    activeKey: 'muntahAktif',
    label: 'Muntah',
    sublabel: 'Vomitus intra-HD',
    placeholder: 'Cth: Muntah 1x ±50 mL, miringkan kepala'
  },
  {
    key: 'clotting',
    activeKey: 'clottingAktif',
    label: 'Clotting',
    sublabel: 'Bekuan sirkuit / dialyzer',
    placeholder: 'Cth: Clotting dialyzer/bubble trap, bilas NaCl'
  },
  {
    key: 'aksesBleeding',
    activeKey: 'aksesBleedingAktif',
    label: 'Akses Bleeding / Hematom Post-HD',
    sublabel: 'Perdarahan / hematom akses',
    placeholder: 'Cth: Rembes/hematom kanulasi, balut tekan 15 mnt',
    wideOnDesktop: true
  },
  {
    key: 'firstUseSyndrome',
    activeKey: 'firstUseSyndromeAktif',
    label: 'First-Use Syndrome / Alergi',
    sublabel: 'Reaksi alergi membran dialyzer',
    placeholder: 'Cth: Sesak/urtikaria jam ke-1, stop UF & advis DPJP',
    wideOnDesktop: true
  },
  {
    key: 'penurunanKesadaran',
    activeKey: 'penurunanKesadaranAktif',
    label: 'Penurunan Kesadaran',
    sublabel: 'Somnolen / GCS turun',
    placeholder: 'Cth: GCS turun, O2 & lapor DPJP Cito'
  }
];

export const IDENTIFIKASI_VERBAL_ITEMS: Array<{
  key: keyof Poin3_1ClinicalData['verbal'];
  label: string;
  detail: string;
}> = [
  {
    key: 'namaLengkap',
    label: 'Konfirmasi Verbal Nama Lengkap',
    detail: 'Pasien menyebutkan nama lengkap secara aktif (pertanyaan terbuka)'
  },
  {
    key: 'tanggalLahir',
    label: 'Konfirmasi Verbal Tanggal Lahir',
    detail: 'Pasien / pendamping menyebutkan tanggal lahir atau usia'
  }
];

export const IDENTIFIKASI_NON_VERBAL_ITEMS: Array<{
  key: keyof Poin3_1ClinicalData['nonVerbal'];
  label: string;
  detail: string;
}> = [
  {
    key: 'gelangIdentitas',
    label: 'Cek Visual Gelang Identitas Pasien',
    detail: 'Cocokkan Nama Lengkap, No. RM & Tanggal Lahir pada gelang'
  },
  {
    key: 'dokumenRmDanResep',
    label: 'Cek Berkas RM, Resep HD & Label Dialyzer',
    detail: 'Cocokkan rekam medis, instruksi DPJP, dan identitas dialyzer'
  }
];

export function parseClinicalNumber(raw: string): number | null {
  if (!raw || !raw.trim()) return null;
  const cleaned = raw.trim().replace(',', '.').replace(/[^\d.-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.') return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function roundOneDecimal(val: number): number {
  return Math.round(val * 10) / 10;
}

export function setAllPoin2_1(checked: boolean): Poin2_1ClinicalData {
  return {
    apd: checked,
    cuciTangan: checked
  };
}

export function normalizePoin2_1Data(raw: unknown): Poin2_1ClinicalData {
  if (!raw || typeof raw !== 'object') {
    return setAllPoin2_1(false);
  }
  const obj = raw as Record<string, unknown>;

  let apd = false;
  if (typeof obj.apd === 'boolean') {
    apd = obj.apd;
  } else if (obj.apd && typeof obj.apd === 'object') {
    apd = Object.values(obj.apd as Record<string, unknown>).every(Boolean);
  }

  let cuciTangan = false;
  if (typeof obj.cuciTangan === 'boolean') {
    cuciTangan = obj.cuciTangan;
  } else if (obj.cuciTangan && typeof obj.cuciTangan === 'object') {
    cuciTangan = Object.values(obj.cuciTangan as Record<string, unknown>).every(Boolean);
  }

  return { apd, cuciTangan };
}

export function getPoin2_1Counts(data: Poin2_1ClinicalData) {
  const normalized = normalizePoin2_1Data(data);
  const apdChecked = normalized.apd;
  const handwashChecked = normalized.cuciTangan;
  const checkedCount = (apdChecked ? 1 : 0) + (handwashChecked ? 1 : 0);
  const total = 2;
  const isComplete = apdChecked && handwashChecked;

  return {
    apdChecked,
    handwashChecked,
    checkedCount,
    total,
    isComplete
  };
}

export function formatPoin2_1Note(data: Poin2_1ClinicalData): string {
  const { apdChecked, handwashChecked } = getPoin2_1Counts(data);
  const handwashSummary = handwashChecked
    ? 'HAND HYGIENE: DILAKSANAKAN'
    : 'HAND HYGIENE: Belum Dilaksanakan';
  const apdSummary = apdChecked
    ? 'PENGGUNAAN APD: DILAKSANAKAN'
    : 'PENGGUNAAN APD: Belum Dilaksanakan';

  return `${handwashSummary} | ${apdSummary}`;
}

export function normalizePoin3_1Data(raw: unknown): Poin3_1ClinicalData {
  if (!raw || typeof raw !== 'object') {
    return {
      verbal: { namaLengkap: false, tanggalLahir: false },
      nonVerbal: { gelangIdentitas: false, dokumenRmDanResep: false },
      tanggalLahirPasien: '',
      status: '',
      ruangRawatInap: '',
      kategori: ''
    };
  }
  const obj = raw as Record<string, unknown>;
  const verbalObj =
    obj.verbal && typeof obj.verbal === 'object'
      ? (obj.verbal as Record<string, unknown>)
      : {};
  const nonVerbalObj =
    obj.nonVerbal && typeof obj.nonVerbal === 'object'
      ? (obj.nonVerbal as Record<string, unknown>)
      : {};

  let status: Poin3_1Status | '' = '';
  const rawStatus = typeof obj.status === 'string' ? obj.status.trim().toUpperCase() : '';
  if (rawStatus === 'RAWAT INAP' || rawStatus === 'RANAP') {
    status = 'RAWAT INAP';
  } else if (rawStatus === 'RAWAT JALAN' || rawStatus === 'RAJAL') {
    status = 'RAWAT JALAN';
  }

  let ruangRawatInap: Poin3_1RuangRawatInap | '' = '';
  if (status === 'RAWAT INAP') {
    const rawRuang = typeof obj.ruangRawatInap === 'string' ? obj.ruangRawatInap.trim().toUpperCase() : '';
    if (rawRuang === 'ICU' || rawRuang.includes('ICU')) {
      ruangRawatInap = 'ICU';
    } else if (rawRuang === 'CAMELIA' || rawRuang.includes('CAMELIA')) {
      ruangRawatInap = 'CAMELIA';
    } else if (rawRuang === 'DAHLIA' || rawRuang.includes('DAHLIA')) {
      ruangRawatInap = 'DAHLIA';
    }
  }

  let kategori: Poin3_1Kategori | '' = '';
  const rawKat = typeof obj.kategori === 'string' ? obj.kategori.trim().toUpperCase() : '';
  if (
    rawKat === 'ISOLASI HEPATITIS B' ||
    rawKat === 'HEPATITIS_B' ||
    rawKat.includes('HEPATITIS B')
  ) {
    kategori = 'ISOLASI HEPATITIS B';
  } else if (
    rawKat === 'ISOLASI HEPATITIS C/HIV' ||
    rawKat === 'HEPATITIS_C' ||
    rawKat === 'HIV' ||
    rawKat.includes('HEPATITIS C') ||
    rawKat.includes('HIV')
  ) {
    kategori = 'ISOLASI HEPATITIS C/HIV';
  } else if (rawKat === 'REGULER') {
    kategori = 'REGULER';
  }

  return {
    verbal: {
      namaLengkap: Boolean(verbalObj.namaLengkap),
      tanggalLahir: Boolean(verbalObj.tanggalLahir)
    },
    nonVerbal: {
      gelangIdentitas: Boolean(nonVerbalObj.gelangIdentitas),
      dokumenRmDanResep: Boolean(nonVerbalObj.dokumenRmDanResep)
    },
    tanggalLahirPasien:
      typeof obj.tanggalLahirPasien === 'string' ? obj.tanggalLahirPasien : '',
    status,
    ruangRawatInap,
    kategori
  };
}

export function isPoin3_1Complete(data: Poin3_1ClinicalData): boolean {
  return Boolean(data.status && data.kategori);
}

export function setAllPoin3_1(
  prev: Poin3_1ClinicalData,
  checked: boolean
): Poin3_1ClinicalData {
  return {
    ...prev,
    verbal: {
      namaLengkap: checked,
      tanggalLahir: checked
    },
    nonVerbal: {
      gelangIdentitas: checked,
      dokumenRmDanResep: checked
    },
    ...(checked
      ? {}
      : {
          status: '',
          ruangRawatInap: '',
          kategori: ''
        })
  };
}

export function getPoin3_1Counts(data: Poin3_1ClinicalData) {
  const verbalCount = IDENTIFIKASI_VERBAL_ITEMS.filter(
    (it) => data.verbal[it.key]
  ).length;
  const nonVerbalCount = IDENTIFIKASI_NON_VERBAL_ITEMS.filter(
    (it) => data.nonVerbal[it.key]
  ).length;
  const verbalTotal = IDENTIFIKASI_VERBAL_ITEMS.length;
  const nonVerbalTotal = IDENTIFIKASI_NON_VERBAL_ITEMS.length;
  const isComplete = isPoin3_1Complete(data);

  return {
    verbalCount,
    verbalTotal,
    nonVerbalCount,
    nonVerbalTotal,
    isComplete
  };
}

export function formatPoin3_1Note(
  data: Poin3_1ClinicalData,
  patientName: string,
  medicalRecord?: string
): string {
  const { verbalCount, verbalTotal, nonVerbalCount, nonVerbalTotal, isComplete } =
    getPoin3_1Counts(data);

  if (!data.status && !data.kategori && verbalCount === 0 && nonVerbalCount === 0) {
    return '';
  }

  const statusStr = data.status
    ? data.status === 'RAWAT INAP' && data.ruangRawatInap
      ? `Status: RAWAT INAP (${data.ruangRawatInap})`
      : `Status: ${data.status}`
    : null;

  const kategoriStr = data.kategori ? `Kategori: ${data.kategori}` : null;

  const identityLabel = [
    patientName || 'Pasien',
    medicalRecord ? `RM: ${medicalRecord}` : null,
    data.tanggalLahirPasien ? `Tgl Lahir: ${data.tanggalLahirPasien}` : null,
    statusStr,
    kategoriStr
  ]
    .filter(Boolean)
    .join(', ');

  if (isComplete) {
    const effVerbal = verbalCount > 0 ? verbalCount : verbalTotal;
    const effNonVerbal = nonVerbalCount > 0 ? nonVerbalCount : nonVerbalTotal;
    return `Identifikasi Verbal (${effVerbal}/${verbalTotal}) & Non-Verbal (${effNonVerbal}/${nonVerbalTotal}) DILAKSANAKAN (${identityLabel})`;
  }
  return `Identifikasi Pasien (${identityLabel}) — Menunggu pilihan ${
    !data.status && !data.kategori
      ? 'Status Pelayanan & Kategori Pasien'
      : !data.status
      ? 'Status Pelayanan'
      : 'Kategori Pasien'
  }`;
}

export function normalizePoin3_2Data(raw: unknown): Poin3_2ClinicalData {
  if (!raw || typeof raw !== 'object') {
    return { bbPre: '', bbPost: '', bbKering: '', ufg: '' };
  }
  const obj = raw as Record<string, unknown>;
  return {
    bbPre: typeof obj.bbPre === 'string' ? obj.bbPre : '',
    bbPost: typeof obj.bbPost === 'string' ? obj.bbPost : '',
    bbKering: typeof obj.bbKering === 'string' ? obj.bbKering : '',
    ufg: typeof obj.ufg === 'string' ? obj.ufg : ''
  };
}

export function computeWeightMetrics(data: Poin3_2ClinicalData) {
  const pre = parseClinicalNumber(data.bbPre);
  const post = parseClinicalNumber(data.bbPost);
  const dry = parseClinicalNumber(data.bbKering);
  const ufg = parseClinicalNumber(data.ufg);

  const idwgKg =
    pre !== null && dry !== null && pre > 0 && dry > 0
      ? roundOneDecimal(pre - dry)
      : null;

  const idwgPct =
    idwgKg !== null && dry !== null && dry > 0
      ? roundOneDecimal((idwgKg / dry) * 100)
      : null;

  const deltaPrePostKg =
    pre !== null && post !== null && pre > 0 && post > 0
      ? roundOneDecimal(pre - post)
      : null;

  const recommendedUfgMl =
    pre !== null && dry !== null && pre > 0 && dry > 0
      ? Math.max(0, Math.round((pre - dry) * 1000))
      : null;

  let overloadStatus: 'normal' | 'moderate' | 'high' | 'incomplete' = 'incomplete';
  if (idwgPct !== null) {
    if (idwgPct > 5) {
      overloadStatus = 'high';
    } else if (idwgPct > 4) {
      overloadStatus = 'moderate';
    } else {
      overloadStatus = 'normal';
    }
  }

  const isComplete =
    pre !== null &&
    pre > 0 &&
    dry !== null &&
    dry > 0 &&
    ufg !== null &&
    ufg >= 0;

  return {
    pre,
    post,
    dry,
    ufg,
    idwgKg,
    idwgPct,
    deltaPrePostKg,
    recommendedUfgMl,
    overloadStatus,
    isComplete
  };
}

export function isPoin3_2LogbookComplete(data: Poin3_2ClinicalData): boolean {
  const pre = parseClinicalNumber(data.bbPre);
  const post = parseClinicalNumber(data.bbPost);
  const dry = parseClinicalNumber(data.bbKering);
  return (
    pre !== null &&
    pre > 0 &&
    post !== null &&
    post > 0 &&
    dry !== null &&
    dry > 0
  );
}

export function formatPoin3_2Note(data: Poin3_2ClinicalData): string {
  const metrics = computeWeightMetrics(data);
  const parts: string[] = [];

  if (metrics.pre !== null) parts.push(`BB Pre: ${metrics.pre} kg`);
  if (metrics.post !== null) parts.push(`BB Post: ${metrics.post} kg`);
  if (metrics.dry !== null) parts.push(`BB Kering: ${metrics.dry} kg`);
  if (metrics.ufg !== null) parts.push(`UFG: ${Math.round(metrics.ufg).toLocaleString('id-ID')} mL`);

  if (metrics.idwgKg !== null && metrics.idwgPct !== null) {
    const sign = metrics.idwgKg > 0 ? '+' : '';
    parts.push(`IDWG: ${sign}${metrics.idwgKg} kg (${metrics.idwgPct}%)`);
  }

  return parts.length > 0 ? parts.join(' | ') : 'Parameter berat badan & UFG belum diinput';
}

export function formatPoin3_2LogbookNote(data: Poin3_2ClinicalData): string {
  const metrics = computeWeightMetrics(data);
  const parts: string[] = [];

  if (metrics.pre !== null) parts.push(`BB Datang: ${metrics.pre} kg`);
  if (metrics.post !== null) parts.push(`BB Pulang: ${metrics.post} kg`);
  if (metrics.dry !== null) parts.push(`BB Kering: ${metrics.dry} kg`);

  if (metrics.idwgKg !== null && metrics.idwgPct !== null) {
    const sign = metrics.idwgKg > 0 ? '+' : '';
    parts.push(`IDWG: ${sign}${metrics.idwgKg} kg (${metrics.idwgPct}%)`);
  }

  return parts.join(' | ');
}

export function parsePreBpInput(rawBp: string): {
  tdPreHd: string;
  tdSistolik: string;
  tdDiastolik: string;
  sys: number | null;
  dia: number | null;
  mapMmHg: number | null;
  alertText: string | null;
} {
  const tdPreHd = rawBp ?? '';
  const match = tdPreHd.trim().match(/^(\d{2,3})\s*\/\s*(\d{2,3})(?:\s*mmhg)?$/i);
  if (!match) {
    return {
      tdPreHd,
      tdSistolik: '',
      tdDiastolik: '',
      sys: null,
      dia: null,
      mapMmHg: null,
      alertText: null
    };
  }

  const sys = Number(match[1]);
  const dia = Number(match[2]);
  const mapMmHg = sys > 0 && dia > 0 ? Math.round(dia + (sys - dia) / 3) : null;
  let alertText: string | null = null;
  if (sys > 0 && sys < 90) {
    alertText = `Waspada Hipotensi Pre-HD (${sys}/${dia} mmHg)`;
  } else if (sys >= 180 || dia >= 110) {
    alertText = `Waspada Hipertensi Berat Pre-HD (${sys}/${dia} mmHg)`;
  }

  return {
    tdPreHd,
    tdSistolik: String(sys),
    tdDiastolik: String(dia),
    sys,
    dia,
    mapMmHg,
    alertText
  };
}

export function normalizePoin3_3Data(raw: unknown): Poin3_3ClinicalData {
  if (!raw || typeof raw !== 'object') {
    return {
      tdPreHd: '',
      tdSistolik: '',
      tdDiastolik: '',
      posisiTd: 'Duduk',
      nadi: '',
      pernapasan: '',
      suhu: '',
      spo2: ''
    };
  }
  const obj = raw as Record<string, unknown>;
  const tdSistolik = typeof obj.tdSistolik === 'string' ? obj.tdSistolik : '';
  const tdDiastolik = typeof obj.tdDiastolik === 'string' ? obj.tdDiastolik : '';
  const rawTdPre =
    typeof obj.tdPreHd === 'string'
      ? obj.tdPreHd
      : tdSistolik && tdDiastolik
      ? `${tdSistolik}/${tdDiastolik}`
      : '';

  return {
    tdPreHd: rawTdPre,
    tdSistolik,
    tdDiastolik,
    posisiTd: obj.posisiTd === 'Berbaring' ? 'Berbaring' : 'Duduk',
    nadi: typeof obj.nadi === 'string' ? obj.nadi : '',
    pernapasan: typeof obj.pernapasan === 'string' ? obj.pernapasan : '',
    suhu: typeof obj.suhu === 'string' ? obj.suhu : '',
    spo2: typeof obj.spo2 === 'string' ? obj.spo2 : ''
  };
}

export function isPoin3_3LogbookComplete(data: Poin3_3ClinicalData): boolean {
  const bpText =
    data.tdPreHd?.trim() ||
    (data.tdSistolik?.trim() && data.tdDiastolik?.trim()
      ? `${data.tdSistolik.trim()}/${data.tdDiastolik.trim()}`
      : '');
  return /\d/.test(bpText);
}

export function formatPoin3_3LogbookNote(data: Poin3_3ClinicalData): string {
  const bpText =
    data.tdPreHd?.trim() ||
    (data.tdSistolik?.trim() && data.tdDiastolik?.trim()
      ? `${data.tdSistolik.trim()}/${data.tdDiastolik.trim()}`
      : '');
  if (!bpText) return '';

  const parsed = parsePreBpInput(bpText);
  if (parsed.sys !== null && parsed.dia !== null) {
    const mapInfo = parsed.mapMmHg !== null ? ` (MAP ${parsed.mapMmHg} mmHg)` : '';
    return `TD Pre HD: ${parsed.sys}/${parsed.dia} mmHg${mapInfo}`;
  }
  const unitSuffix = /mmhg/i.test(bpText) ? '' : ' mmHg';
  return `TD Pre HD: ${bpText}${unitSuffix}`;
}

export function computePreHdVitalsMetrics(data: Poin3_3ClinicalData) {
  const parsedFromCombined = data.tdPreHd ? parsePreBpInput(data.tdPreHd) : null;
  const sys =
    parseClinicalNumber(data.tdSistolik) ?? (parsedFromCombined?.sys ?? null);
  const dia =
    parseClinicalNumber(data.tdDiastolik) ?? (parsedFromCombined?.dia ?? null);
  const hr = parseClinicalNumber(data.nadi);
  const rr = parseClinicalNumber(data.pernapasan);
  const temp = parseClinicalNumber(data.suhu);
  const spo2 = parseClinicalNumber(data.spo2);

  const mapMmHg =
    sys !== null && dia !== null && sys > 0 && dia > 0
      ? Math.round(dia + (sys - dia) / 3)
      : null;

  const alerts: string[] = [];
  let severity: 'normal' | 'warning' | 'critical' | 'incomplete' = 'incomplete';

  const isComplete =
    sys !== null &&
    sys > 0 &&
    dia !== null &&
    dia > 0 &&
    hr !== null &&
    hr > 0 &&
    rr !== null &&
    rr > 0 &&
    temp !== null &&
    temp > 0 &&
    spo2 !== null &&
    spo2 > 0;

  if (sys !== null && sys > 0) {
    if (sys < 90) {
      alerts.push(`Hipotensi Pre-HD (TD Sistolik ${sys} mmHg < 90 mmHg)`);
      severity = 'critical';
    } else if (sys >= 180 || (dia !== null && dia >= 110)) {
      alerts.push(`Hipertensi Berat Pre-HD (${sys}/${dia ?? '-'} mmHg)`);
      severity = 'warning';
    }
  }

  if (spo2 !== null && spo2 > 0 && spo2 < 94) {
    alerts.push(`Desaturasi Oksigen (SpO2 ${spo2}% < 94%)`);
    severity = 'critical';
  }

  if (temp !== null && temp >= 37.8) {
    alerts.push(`Febris Pre-HD (Suhu ${temp}°C ≥ 37.8°C)`);
    if (severity !== 'critical') severity = 'warning';
  }

  if (hr !== null && hr > 0 && (hr < 50 || hr > 110)) {
    alerts.push(`Frekuensi Nadi ${hr} x/mnt di luar rentang 50–110 x/mnt`);
    if (severity !== 'critical') severity = 'warning';
  }

  if (rr !== null && rr > 0 && (rr < 12 || rr > 24)) {
    alerts.push(`Frekuensi Napas ${rr} x/mnt di luar rentang 12–24 x/mnt`);
    if (severity !== 'critical') severity = 'warning';
  }

  if (isComplete && alerts.length === 0) {
    severity = 'normal';
  }

  return {
    sys,
    dia,
    hr,
    rr,
    temp,
    spo2,
    mapMmHg,
    alerts,
    severity,
    isComplete
  };
}

export function formatPoin3_3Note(data: Poin3_3ClinicalData): string {
  const m = computePreHdVitalsMetrics(data);
  const parts: string[] = [];

  if (m.sys !== null && m.dia !== null) {
    const mapStr = m.mapMmHg !== null ? `, MAP ${m.mapMmHg}` : '';
    parts.push(`TD Pre: ${m.sys}/${m.dia} mmHg (${data.posisiTd}${mapStr})`);
  }
  if (m.hr !== null) parts.push(`Nadi: ${m.hr} x/mnt`);
  if (m.rr !== null) parts.push(`RR: ${m.rr} x/mnt`);
  if (m.temp !== null) parts.push(`Suhu: ${m.temp}°C`);
  if (m.spo2 !== null) parts.push(`SpO2: ${m.spo2}%`);

  return parts.length > 0 ? parts.join(' | ') : 'TTV Pre-HD belum diinput';
}

export function normalizePoin3_5Data(raw: unknown): Poin3_5ClinicalData {
  if (!raw || typeof raw !== 'object') {
    return {
      waktuDialisis: '',
      targetUfg: '',
      qb: '',
      qd: '',
      dosisHeparin: ''
    };
  }
  const obj = raw as Record<string, unknown>;
  return {
    waktuDialisis: typeof obj.waktuDialisis === 'string' ? obj.waktuDialisis : '',
    targetUfg: typeof obj.targetUfg === 'string' ? obj.targetUfg : '',
    qb: typeof obj.qb === 'string' ? obj.qb : '',
    qd: typeof obj.qd === 'string' ? obj.qd : '',
    dosisHeparin: typeof obj.dosisHeparin === 'string' ? obj.dosisHeparin : ''
  };
}

export function isPoin3_5Complete(data: Poin3_5ClinicalData): boolean {
  const norm = normalizePoin3_5Data(data);
  return Boolean(
    norm.waktuDialisis.trim() &&
      norm.targetUfg.trim() &&
      norm.qb.trim() &&
      norm.qd.trim() &&
      norm.dosisHeparin.trim()
  );
}

export function formatPoin3_5Note(data: Poin3_5ClinicalData): string {
  const norm = normalizePoin3_5Data(data);
  const parts: string[] = [];

  if (norm.waktuDialisis.trim()) {
    const w = norm.waktuDialisis.trim();
    parts.push(`Time: ${w}${/jam/i.test(w) ? '' : ' jam'}`);
  }
  if (norm.targetUfg.trim()) {
    const ufgRaw = norm.targetUfg.trim();
    const ufgNum = parseClinicalNumber(ufgRaw);
    if (ufgNum !== null && !/ml/i.test(ufgRaw)) {
      parts.push(`Target UFG: ${Math.round(ufgNum).toLocaleString('id-ID')} mL`);
    } else {
      parts.push(`Target UFG: ${ufgRaw}${/ml/i.test(ufgRaw) ? '' : ' mL'}`);
    }
  }
  if (norm.qb.trim()) {
    const qb = norm.qb.trim();
    parts.push(`QB: ${qb}${/ml/i.test(qb) ? '' : ' mL/mnt'}`);
  }
  if (norm.qd.trim()) {
    const qd = norm.qd.trim();
    parts.push(`QD: ${qd}${/ml/i.test(qd) ? '' : ' mL/mnt'}`);
  }
  if (norm.dosisHeparin.trim()) {
    parts.push(`Dosis Heparin: ${norm.dosisHeparin.trim()}`);
  }

  return parts.join(' | ');
}

export function isMeaningfulAccessInput(val?: string): boolean {
  const trimmed = (val || '').trim();
  if (!trimmed) return false;
  if (trimmed === '-' || trimmed === '—') return false;
  if (/^(nihil|tidak|tidak ada|none|0)$/i.test(trimmed)) return false;
  return true;
}

export function normalizePoin3_6Data(raw: unknown): Poin3_6ClinicalData {
  if (!raw || typeof raw !== 'object') {
    return {
      ciminoAktif: false,
      cimino: '',
      cdlAktif: false,
      cdl: '',
      femoralAktif: false,
      femoral: '',
      vascularAccessNurse: ''
    };
  }
  const obj = raw as Record<string, unknown>;
  const cimino = typeof obj.cimino === 'string' ? obj.cimino : '';
  const cdl = typeof obj.cdl === 'string' ? obj.cdl : '';
  const femoral = typeof obj.femoral === 'string' ? obj.femoral : '';
  const vascularAccessNurse =
    typeof obj.vascularAccessNurse === 'string'
      ? obj.vascularAccessNurse.trim().slice(0, 300)
      : '';

  return {
    ciminoAktif:
      typeof obj.ciminoAktif === 'boolean'
        ? obj.ciminoAktif
        : isMeaningfulAccessInput(cimino),
    cimino,
    cdlAktif:
      typeof obj.cdlAktif === 'boolean'
        ? obj.cdlAktif
        : isMeaningfulAccessInput(cdl),
    cdl,
    femoralAktif:
      typeof obj.femoralAktif === 'boolean'
        ? obj.femoralAktif
        : isMeaningfulAccessInput(femoral),
    femoral,
    vascularAccessNurse
  };
}

export function isPoin3_6Complete(data: Poin3_6ClinicalData): boolean {
  const norm = normalizePoin3_6Data(data);
  return Boolean(
    norm.ciminoAktif ||
      isMeaningfulAccessInput(norm.cimino) ||
      norm.cdlAktif ||
      isMeaningfulAccessInput(norm.cdl) ||
      norm.femoralAktif ||
      isMeaningfulAccessInput(norm.femoral)
  );
}

export function formatPoin3_6Note(data: Poin3_6ClinicalData): string {
  const norm = normalizePoin3_6Data(data);
  const parts: string[] = [];

  if (norm.ciminoAktif || norm.cimino.trim()) {
    parts.push(`CIMINO: ${norm.cimino.trim() || 'Paten / Aktif'}`);
  }
  if (norm.cdlAktif || norm.cdl.trim()) {
    parts.push(`CDL: ${norm.cdl.trim() || 'Paten / Aktif'}`);
  }
  if (norm.femoralAktif || norm.femoral.trim()) {
    parts.push(`FEMORAL: ${norm.femoral.trim() || 'Paten / Aktif'}`);
  }
  if (norm.vascularAccessNurse && norm.vascularAccessNurse.trim()) {
    parts.push(`Pelaksana Aksesing: ${norm.vascularAccessNurse.trim()}`);
  }

  return parts.length > 0 ? `Akses Vaskuler — ${parts.join(' | ')}` : '';
}

export function formatAksesVaskularStandard(
  data?: Poin3_6ClinicalData,
  fallbackAccess?: string,
  fallbackSite?: string
): 'AV SHUNT' | 'CDL' | 'FEMORAL' {
  if (data) {
    const norm = normalizePoin3_6Data(data);
    if (norm.femoralAktif || isMeaningfulAccessInput(norm.femoral)) {
      return 'FEMORAL';
    }
    if (norm.cdlAktif || isMeaningfulAccessInput(norm.cdl)) {
      return 'CDL';
    }
    if (norm.ciminoAktif || isMeaningfulAccessInput(norm.cimino)) {
      return 'AV SHUNT';
    }
  }

  const accessLower = (fallbackAccess || '').toLowerCase();
  const siteLower = (fallbackSite || '').toLowerCase();

  if (siteLower.includes('femoral') || accessLower.includes('femoral')) {
    return 'FEMORAL';
  }
  if (
    accessLower.includes('cdl') ||
    siteLower.includes('jugular') ||
    siteLower.includes('subclavia') ||
    siteLower.includes('permcath') ||
    siteLower.includes('catheter')
  ) {
    return 'CDL';
  }
  return 'AV SHUNT';
}

export function resolveSessionAccessFromPoin3_6(
  data: Poin3_6ClinicalData,
  fallbackAccess: VascularAccess = 'av_fistula',
  fallbackSite: string = 'AVF Radiocephalica'
): {
  vascularAccess: VascularAccess;
  accessSite: string;
  accessTypeLabel: 'AV SHUNT' | 'CDL' | 'FEMORAL';
  vascularAccessNurse?: string;
} {
  const norm = normalizePoin3_6Data(data);
  const accessTypeLabel = formatAksesVaskularStandard(data, fallbackAccess, fallbackSite);
  const vascularAccessNurse = norm.vascularAccessNurse?.trim() || undefined;

  if (norm.ciminoAktif || isMeaningfulAccessInput(norm.cimino)) {
    const detail = isMeaningfulAccessInput(norm.cimino) ? norm.cimino.trim() : '';
    return {
      vascularAccess: 'av_fistula',
      accessSite: detail ? `CIMINO (${detail})` : 'CIMINO (AV Fistula)',
      accessTypeLabel,
      vascularAccessNurse
    };
  }

  if (norm.cdlAktif || isMeaningfulAccessInput(norm.cdl)) {
    const detail = isMeaningfulAccessInput(norm.cdl) ? norm.cdl.trim() : '';
    const isPermcath = /tunnel|permcath/i.test(detail);
    return {
      vascularAccess: isPermcath ? 'cdl_permcath' : 'cdl_non_tunnel',
      accessSite: detail ? `CDL (${detail})` : 'CDL (Catheter Double Lumen)',
      accessTypeLabel,
      vascularAccessNurse
    };
  }

  if (norm.femoralAktif || isMeaningfulAccessInput(norm.femoral)) {
    const detail = isMeaningfulAccessInput(norm.femoral) ? norm.femoral.trim() : '';
    return {
      vascularAccess: 'cdl_non_tunnel',
      accessSite: detail ? `FEMORAL (${detail})` : 'Akses Vaskuler Femoral',
      accessTypeLabel,
      vascularAccessNurse
    };
  }

  return {
    vascularAccess: fallbackAccess,
    accessSite: fallbackSite,
    accessTypeLabel,
    vascularAccessNurse
  };
}

export function createEmptyPoin4_3Data(): Poin4_3ClinicalData {
  return {
    tidakAdaKomplikasi: false,
    entries: [],
    hipertensiAktif: false,
    hipertensi: '',
    hipotensiAktif: false,
    hipotensi: '',
    hipoglikemiAktif: false,
    hipoglikemi: '',
    hipertermiAktif: false,
    hipertermi: '',
    kramOtotAktif: false,
    kramOtot: '',
    mualAktif: false,
    mual: '',
    muntahAktif: false,
    muntah: '',
    clottingAktif: false,
    clotting: '',
    aksesBleedingAktif: false,
    aksesBleeding: '',
    firstUseSyndromeAktif: false,
    firstUseSyndrome: '',
    penurunanKesadaranAktif: false,
    penurunanKesadaran: ''
  };
}

export function normalizePoin4_3Data(raw: unknown): Poin4_3ClinicalData {
  if (!raw || typeof raw !== 'object') {
    return createEmptyPoin4_3Data();
  }
  const obj = raw as Record<string, unknown>;
  const hipertensi = typeof obj.hipertensi === 'string' ? obj.hipertensi : '';
  const hipotensi = typeof obj.hipotensi === 'string' ? obj.hipotensi : '';
  const hipoglikemi = typeof obj.hipoglikemi === 'string' ? obj.hipoglikemi : '';
  const hipertermi = typeof obj.hipertermi === 'string' ? obj.hipertermi : '';
  const kramOtot = typeof obj.kramOtot === 'string' ? obj.kramOtot : '';
  const mual = typeof obj.mual === 'string' ? obj.mual : '';
  const muntah = typeof obj.muntah === 'string' ? obj.muntah : '';
  const clotting = typeof obj.clotting === 'string' ? obj.clotting : '';
  const aksesBleeding =
    typeof obj.aksesBleeding === 'string' ? obj.aksesBleeding : '';
  const firstUseSyndrome =
    typeof obj.firstUseSyndrome === 'string' ? obj.firstUseSyndrome : '';
  const penurunanKesadaran =
    typeof obj.penurunanKesadaran === 'string' ? obj.penurunanKesadaran : '';

  const hipertensiAktif =
    typeof obj.hipertensiAktif === 'boolean'
      ? obj.hipertensiAktif
      : isMeaningfulAccessInput(hipertensi);
  const hipotensiAktif =
    typeof obj.hipotensiAktif === 'boolean'
      ? obj.hipotensiAktif
      : isMeaningfulAccessInput(hipotensi);
  const hipoglikemiAktif =
    typeof obj.hipoglikemiAktif === 'boolean'
      ? obj.hipoglikemiAktif
      : isMeaningfulAccessInput(hipoglikemi);
  const hipertermiAktif =
    typeof obj.hipertermiAktif === 'boolean'
      ? obj.hipertermiAktif
      : isMeaningfulAccessInput(hipertermi);
  const kramOtotAktif =
    typeof obj.kramOtotAktif === 'boolean'
      ? obj.kramOtotAktif
      : isMeaningfulAccessInput(kramOtot);
  const mualAktif =
    typeof obj.mualAktif === 'boolean'
      ? obj.mualAktif
      : isMeaningfulAccessInput(mual);
  const muntahAktif =
    typeof obj.muntahAktif === 'boolean'
      ? obj.muntahAktif
      : isMeaningfulAccessInput(muntah);
  const clottingAktif =
    typeof obj.clottingAktif === 'boolean'
      ? obj.clottingAktif
      : isMeaningfulAccessInput(clotting);
  const aksesBleedingAktif =
    typeof obj.aksesBleedingAktif === 'boolean'
      ? obj.aksesBleedingAktif
      : isMeaningfulAccessInput(aksesBleeding);
  const firstUseSyndromeAktif =
    typeof obj.firstUseSyndromeAktif === 'boolean'
      ? obj.firstUseSyndromeAktif
      : isMeaningfulAccessInput(firstUseSyndrome);
  const penurunanKesadaranAktif =
    typeof obj.penurunanKesadaranAktif === 'boolean'
      ? obj.penurunanKesadaranAktif
      : isMeaningfulAccessInput(penurunanKesadaran);

  // Normalize dynamic dropdown entries
  let entries: Poin4_3DynamicEntry[] = [];
  if (Array.isArray(obj.entries)) {
    entries = obj.entries
      .filter((e) => e && typeof e === 'object')
      .map((e: any, idx: number) => ({
        id: typeof e.id === 'string' && e.id ? e.id : `comp_${Date.now()}_${idx}`,
        jenis: typeof e.jenis === 'string' && e.jenis.trim() ? e.jenis.trim() : 'Hipertensi',
        jam: typeof e.jam === 'string' ? e.jam.trim() : '',
        nilai: typeof e.nilai === 'string' ? e.nilai.trim() : '',
        advisDokter: typeof e.advisDokter === 'string' ? e.advisDokter : ''
      }));
  } else {
    // Auto-migrate legacy non-empty complications if present
    const legacyMigrated: Poin4_3DynamicEntry[] = [];
    if (hipertensiAktif || isMeaningfulAccessInput(hipertensi)) {
      const match = hipertensi.match(/(\d{2,3}\s*\/\s*\d{2,3})/);
      legacyMigrated.push({
        id: 'legacy_hipertensi',
        jenis: 'Hipertensi',
        jam: '',
        nilai: match ? match[1].replace(/\s+/g, '') : '',
        advisDokter: isMeaningfulAccessInput(hipertensi) ? hipertensi.trim() : ''
      });
    }
    if (hipotensiAktif || isMeaningfulAccessInput(hipotensi)) {
      const match = hipotensi.match(/(\d{2,3}\s*\/\s*\d{2,3})/);
      legacyMigrated.push({
        id: 'legacy_hipotensi',
        jenis: 'Hipotensi',
        jam: '',
        nilai: match ? match[1].replace(/\s+/g, '') : '',
        advisDokter: isMeaningfulAccessInput(hipotensi) ? hipotensi.trim() : ''
      });
    }
    if (hipoglikemiAktif || isMeaningfulAccessInput(hipoglikemi)) {
      const match = hipoglikemi.match(/(\d{2,3})/);
      legacyMigrated.push({
        id: 'legacy_hipoglikemi',
        jenis: 'Hipoglikemi',
        jam: '',
        nilai: match ? match[1] : '',
        advisDokter: isMeaningfulAccessInput(hipoglikemi) ? hipoglikemi.trim() : ''
      });
    }
    if (hipertermiAktif || isMeaningfulAccessInput(hipertermi)) {
      const match = hipertermi.match(/(\d{2}(?:\.\d)?)/);
      legacyMigrated.push({
        id: 'legacy_hipertermi',
        jenis: 'Hipertermi',
        jam: '',
        nilai: match ? match[1] : '',
        advisDokter: isMeaningfulAccessInput(hipertermi) ? hipertermi.trim() : ''
      });
    }
    if (kramOtotAktif || isMeaningfulAccessInput(kramOtot)) {
      legacyMigrated.push({
        id: 'legacy_kramOtot',
        jenis: 'Kram Otot',
        jam: '',
        nilai: '',
        advisDokter: isMeaningfulAccessInput(kramOtot) ? kramOtot.trim() : ''
      });
    }
    if (mualAktif || isMeaningfulAccessInput(mual)) {
      legacyMigrated.push({
        id: 'legacy_mual',
        jenis: 'Mual',
        jam: '',
        nilai: '',
        advisDokter: isMeaningfulAccessInput(mual) ? mual.trim() : ''
      });
    }
    if (muntahAktif || isMeaningfulAccessInput(muntah)) {
      legacyMigrated.push({
        id: 'legacy_muntah',
        jenis: 'Muntah',
        jam: '',
        nilai: '',
        advisDokter: isMeaningfulAccessInput(muntah) ? muntah.trim() : ''
      });
    }
    if (clottingAktif || isMeaningfulAccessInput(clotting)) {
      legacyMigrated.push({
        id: 'legacy_clotting',
        jenis: 'Clotting',
        jam: '',
        nilai: '',
        advisDokter: isMeaningfulAccessInput(clotting) ? clotting.trim() : ''
      });
    }
    if (aksesBleedingAktif || isMeaningfulAccessInput(aksesBleeding)) {
      legacyMigrated.push({
        id: 'legacy_aksesBleeding',
        jenis: 'Akses Bleeding',
        jam: '',
        nilai: '',
        advisDokter: isMeaningfulAccessInput(aksesBleeding) ? aksesBleeding.trim() : ''
      });
    }
    if (firstUseSyndromeAktif || isMeaningfulAccessInput(firstUseSyndrome)) {
      legacyMigrated.push({
        id: 'legacy_firstUseSyndrome',
        jenis: 'First-Use Syndrome',
        jam: '',
        nilai: '',
        advisDokter: isMeaningfulAccessInput(firstUseSyndrome) ? firstUseSyndrome.trim() : ''
      });
    }
    if (penurunanKesadaranAktif || isMeaningfulAccessInput(penurunanKesadaran)) {
      legacyMigrated.push({
        id: 'legacy_penurunanKesadaran',
        jenis: 'Penurunan Kesadaran',
        jam: '',
        nilai: '',
        advisDokter: isMeaningfulAccessInput(penurunanKesadaran) ? penurunanKesadaran.trim() : ''
      });
    }
    if (legacyMigrated.length > 0) {
      entries = legacyMigrated;
    }
  }

  const hasAnyActive = entries.length > 0;

  return {
    tidakAdaKomplikasi: hasAnyActive ? false : Boolean(obj.tidakAdaKomplikasi),
    entries,
    hipertensiAktif,
    hipertensi,
    hipotensiAktif,
    hipotensi,
    hipoglikemiAktif,
    hipoglikemi,
    hipertermiAktif,
    hipertermi,
    kramOtotAktif,
    kramOtot,
    mualAktif,
    mual,
    muntahAktif,
    muntah,
    clottingAktif,
    clotting,
    aksesBleedingAktif,
    aksesBleeding,
    firstUseSyndromeAktif,
    firstUseSyndrome,
    penurunanKesadaranAktif,
    penurunanKesadaran
  };
}

export function getActivePoin4_3Complications(data: Poin4_3ClinicalData): Array<{
  key: Poin4_3ComplicationKey;
  label: string;
  detail: string;
}> {
  const norm = normalizePoin4_3Data(data);
  if (norm.entries && norm.entries.length > 0) {
    return norm.entries.map((entry) => {
      const parts: string[] = [];
      if (entry.nilai && entry.nilai.trim()) {
        const cfg = getComplicationValueConfig(entry.jenis);
        const unitSuffix = cfg.unit && !entry.nilai.includes(cfg.unit) ? ` ${cfg.unit}` : '';
        parts.push(`${cfg.label ? `${cfg.label}: ` : ''}${entry.nilai.trim()}${unitSuffix}`);
      }
      if (entry.jam) parts.push(`Jam ${entry.jam}`);
      if (entry.advisDokter && entry.advisDokter.trim()) {
        parts.push(`Advis: ${entry.advisDokter.trim()}`);
      }
      return {
        key: 'komplikasi' as any,
        label: entry.jenis,
        detail: parts.length > 0 ? parts.join(', ') : 'Terjadi intra-HD (ditangani sesuai SPO)'
      };
    });
  }

  return KOMPLIKASI_INTRA_HD_ITEMS.filter(
    (item) => Boolean(norm[item.activeKey]) || isMeaningfulAccessInput(norm[item.key])
  ).map((item) => ({
    key: item.key,
    label: item.label,
    detail: isMeaningfulAccessInput(norm[item.key])
      ? (norm[item.key] || '').trim()
      : 'Terjadi intra-HD (ditangani sesuai SPO)'
  }));
}

export function hasExplicitNegativePoin4_3Input(data: Poin4_3ClinicalData): boolean {
  const norm = normalizePoin4_3Data(data);
  if (norm.entries && norm.entries.length > 0) return false;
  if (getActivePoin4_3Complications(norm).length > 0) return false;
  return KOMPLIKASI_INTRA_HD_ITEMS.some((item) => Boolean(norm[item.key]?.trim()));
}

export function isPoin4_3Complete(data: Poin4_3ClinicalData): boolean {
  const norm = normalizePoin4_3Data(data);
  return Boolean(
    (norm.entries && norm.entries.length > 0) ||
      norm.tidakAdaKomplikasi ||
      getActivePoin4_3Complications(norm).length > 0 ||
      hasExplicitNegativePoin4_3Input(norm)
  );
}

export function formatPoin4_3Note(data: Poin4_3ClinicalData): string {
  const norm = normalizePoin4_3Data(data);
  if (norm.entries && norm.entries.length > 0) {
    return `Komplikasi HD — ${norm.entries
      .map((e) => {
        const parts: string[] = [];
        if (e.nilai && e.nilai.trim()) {
          const cfg = getComplicationValueConfig(e.jenis);
          const unitSuffix = cfg.unit && !e.nilai.includes(cfg.unit) ? ` ${cfg.unit}` : '';
          parts.push(`${cfg.label ? `${cfg.label} ` : ''}${e.nilai.trim()}${unitSuffix}`);
        }
        if (e.jam) parts.push(`Jam ${e.jam}`);
        if (e.advisDokter && e.advisDokter.trim()) parts.push(`Advis: ${e.advisDokter.trim()}`);
        return `${e.jenis}${parts.length > 0 ? ` (${parts.join(', ')})` : ''}`;
      })
      .join(' | ')}`;
  }
  const activeList = getActivePoin4_3Complications(norm);
  if (activeList.length > 0) {
    return `Komplikasi HD — ${activeList
      .map((c) => `${c.label}: ${c.detail}`)
      .join(' | ')}`;
  }
  if (norm.tidakAdaKomplikasi || hasExplicitNegativePoin4_3Input(norm)) {
    return 'Komplikasi HD: Tidak Ada Komplikasi (Toleransi Intra-HD Baik)';
  }
  return '';
}

export function resolveSessionComplicationsFromPoin4_3(data: Poin4_3ClinicalData): {
  hasAnyInput: boolean;
  activeCount: number;
  hasHypotension: boolean;
  hypotensionBp?: string;
  hypotensionAction?: string;
  hasMuscleCramps: boolean;
  muscleCrampAction?: string;
  hasClotting: boolean;
  clottingDetails?: string;
  hasFirstUseSyndrome: boolean;
  firstUseDetails?: string;
  hasAccessBleeding: boolean;
  accessBleedingAction?: string;
  hasPenurunanKesadaran: boolean;
  activeSummary: string;
  complicationNames: string;
  doctorAdviceSummary: string;
} {
  const norm = normalizePoin4_3Data(data);
  const activeList = getActivePoin4_3Complications(norm);
  const hasAnyInput = isPoin4_3Complete(norm);

  // Pure complication names only (LOGBOOK Bagian 4 Poin 4.3)
  let complicationNames = 'Tidak ada';
  if (norm.entries && norm.entries.length > 0) {
    const names = Array.from(new Set(norm.entries.map((e) => e.jenis.trim()).filter(Boolean)));
    complicationNames = names.length > 0 ? names.join(', ') : 'Tidak ada';
  } else if (activeList.length > 0) {
    const names = Array.from(new Set(activeList.map((c) => c.label.trim()).filter(Boolean)));
    complicationNames = names.length > 0 ? names.join(', ') : 'Tidak ada';
  }

  // DPJP action & advice entered in LOGBOOK Bagian 4 Poin 4.3
  let doctorAdviceSummary = '';
  if (norm.entries && norm.entries.length > 0) {
    const advises = norm.entries
      .map((e) => {
        if (e.advisDokter && e.advisDokter.trim()) {
          return e.advisDokter.trim();
        }
        return `Advis DPJP penanganan ${e.jenis} sesuai protokol/SPO`;
      })
      .filter(Boolean);
    doctorAdviceSummary = advises.join('; ');
  } else if (activeList.length > 0) {
    const advises = activeList
      .map((c) => (c.detail && !c.detail.includes('Terjadi intra-HD') ? c.detail.trim() : `Advis DPJP penanganan ${c.label} sesuai SPO`))
      .filter(Boolean);
    doctorAdviceSummary = advises.join('; ');
  }

  // Check dynamic entries first
  const dynHypo = norm.entries?.find((e) => /hipotensi/i.test(e.jenis));
  const dynHiper = norm.entries?.find((e) => /hipertensi/i.test(e.jenis));
  const dynKram = norm.entries?.find((e) => /kram/i.test(e.jenis));
  const dynClot = norm.entries?.find((e) => /clotting/i.test(e.jenis));
  const dynFirst = norm.entries?.find((e) => /first-use/i.test(e.jenis));
  const dynBleed = norm.entries?.find((e) => /bleeding|darah|hematom/i.test(e.jenis));
  const dynSadar = norm.entries?.find((e) => /kesadaran/i.test(e.jenis));

  const hasHypotension = Boolean(
    dynHypo || norm.hipotensiAktif || isMeaningfulAccessInput(norm.hipotensi)
  );
  const bpSource = dynHypo?.nilai || dynHypo?.advisDokter || norm.hipotensi;
  const bpMatch = bpSource ? bpSource.match(/(\d{2,3}\s*\/\s*\d{2,3})/) : null;
  const hypotensionBp = hasHypotension
    ? bpMatch
      ? bpMatch[1].replace(/\s+/g, '')
      : dynHypo?.nilai && dynHypo.nilai.trim()
      ? dynHypo.nilai.trim()
      : undefined
    : undefined;
  const hypotensionAction = hasHypotension
    ? dynHypo
      ? dynHypo.advisDokter
        ? `${dynHypo.jam ? `(Jam ${dynHypo.jam}) ` : ''}${dynHypo.advisDokter}`
        : 'Penanganan hipotensi intra-HD sesuai SPO'
      : isMeaningfulAccessInput(norm.hipotensi)
      ? norm.hipotensi.trim()
      : 'Penanganan hipotensi intra-HD sesuai SPO'
    : undefined;

  const hasMuscleCramps = Boolean(
    dynKram || norm.kramOtotAktif || isMeaningfulAccessInput(norm.kramOtot)
  );
  const muscleCrampAction = hasMuscleCramps
    ? dynKram
      ? dynKram.advisDokter
        ? `${dynKram.jam ? `(Jam ${dynKram.jam}) ` : ''}${dynKram.advisDokter}`
        : 'Penanganan kram otot intra-HD sesuai SPO'
      : isMeaningfulAccessInput(norm.kramOtot)
      ? norm.kramOtot.trim()
      : 'Penanganan kram otot intra-HD sesuai SPO'
    : undefined;

  const hasClotting = Boolean(
    dynClot || norm.clottingAktif || isMeaningfulAccessInput(norm.clotting)
  );
  const clottingDetails = hasClotting
    ? dynClot
      ? dynClot.advisDokter
        ? `${dynClot.jam ? `(Jam ${dynClot.jam}) ` : ''}${dynClot.advisDokter}`
        : 'Penanganan clotting sirkuit/dialyzer sesuai SPO'
      : isMeaningfulAccessInput(norm.clotting)
      ? norm.clotting.trim()
      : 'Penanganan clotting sirkuit/dialyzer sesuai SPO'
    : undefined;

  const hasFirstUseSyndrome = Boolean(
    dynFirst || norm.firstUseSyndromeAktif || isMeaningfulAccessInput(norm.firstUseSyndrome)
  );
  const firstUseDetails = hasFirstUseSyndrome
    ? dynFirst
      ? dynFirst.advisDokter
        ? `${dynFirst.jam ? `(Jam ${dynFirst.jam}) ` : ''}${dynFirst.advisDokter}`
        : 'Penanganan reaksi First-Use Syndrome / alergi sesuai SPO'
      : isMeaningfulAccessInput(norm.firstUseSyndrome)
      ? norm.firstUseSyndrome.trim()
      : 'Penanganan reaksi First-Use Syndrome / alergi sesuai SPO'
    : undefined;

  const hasAccessBleeding = Boolean(
    dynBleed || norm.aksesBleedingAktif || isMeaningfulAccessInput(norm.aksesBleeding)
  );
  const accessBleedingAction = hasAccessBleeding
    ? dynBleed
      ? dynBleed.advisDokter
        ? `${dynBleed.jam ? `(Jam ${dynBleed.jam}) ` : ''}${dynBleed.advisDokter}`
        : 'Penanganan perdarahan / hematom akses sesuai SPO'
      : isMeaningfulAccessInput(norm.aksesBleeding)
      ? norm.aksesBleeding.trim()
      : 'Penanganan perdarahan / hematom akses sesuai SPO'
    : undefined;

  const hasPenurunanKesadaran = Boolean(
    dynSadar || norm.penurunanKesadaranAktif || isMeaningfulAccessInput(norm.penurunanKesadaran)
  );

  return {
    hasAnyInput,
    activeCount: activeList.length,
    hasHypotension,
    hypotensionBp,
    hypotensionAction,
    hasMuscleCramps,
    muscleCrampAction,
    hasClotting,
    clottingDetails,
    hasFirstUseSyndrome,
    firstUseDetails,
    hasAccessBleeding,
    accessBleedingAction,
    hasPenurunanKesadaran,
    activeSummary: activeList.map((c) => `${c.label}: ${c.detail}`).join(' | '),
    complicationNames,
    doctorAdviceSummary
  };
}

export function normalizePoin4_1Data(raw: unknown): Poin4_1ClinicalData {
  if (!raw || typeof raw !== 'object') {
    return { tdIntraHd: '' };
  }
  const obj = raw as Record<string, unknown>;
  return {
    tdIntraHd: typeof obj.tdIntraHd === 'string' ? obj.tdIntraHd.trim() : ''
  };
}

export function isPoin4_1Complete(data: Poin4_1ClinicalData): boolean {
  const norm = normalizePoin4_1Data(data);
  return Boolean(norm.tdIntraHd && norm.tdIntraHd.trim());
}

export function formatPoin4_1Note(data: Poin4_1ClinicalData): string {
  const norm = normalizePoin4_1Data(data);
  if (!norm.tdIntraHd.trim()) return '';
  const td = norm.tdIntraHd.trim();
  const unitSuffix = /mmhg/i.test(td) ? '' : ' mmHg';
  return `TD Intra HD: ${td}${unitSuffix}`;
}

export function normalizePoin6_3Data(raw: unknown): Poin6_3ClinicalData {
  if (!raw || typeof raw !== 'object') {
    return { tdPostHd: '', ufgTercapai: '', ktV: '' };
  }
  const obj = raw as Record<string, unknown>;
  return {
    tdPostHd: typeof obj.tdPostHd === 'string' ? obj.tdPostHd : '',
    ufgTercapai: typeof obj.ufgTercapai === 'string' ? obj.ufgTercapai : '',
    ktV: typeof obj.ktV === 'string' ? obj.ktV : ''
  };
}

export function isPoin6_3Complete(data: Poin6_3ClinicalData): boolean {
  const norm = normalizePoin6_3Data(data);
  return Boolean(
    (norm.tdPostHd && norm.tdPostHd.trim()) ||
    (norm.ufgTercapai && norm.ufgTercapai.trim()) ||
    (norm.ktV && norm.ktV.trim())
  );
}

export function formatPoin6_3Note(data: Poin6_3ClinicalData): string {
  const norm = normalizePoin6_3Data(data);
  const parts: string[] = [];
  if (norm.tdPostHd.trim()) {
    parts.push(`TD Post: ${norm.tdPostHd.trim()} mmHg`);
  }
  if (norm.ufgTercapai.trim()) {
    parts.push(`UFG Tercapai: ${norm.ufgTercapai.trim()} mL`);
  }
  if (norm.ktV.trim()) {
    parts.push(`Kt/V: ${norm.ktV.trim()}`);
  }
  if (parts.length === 0) {
    return 'Evaluasi Post-HD: TTV & UFG Tercapai stabil';
  }
  return `Evaluasi Post-HD: ${parts.join(' | ')}`;
}

export function normalizePatientClinicalDetails(
  raw: unknown
): PatientLogbookClinicalDetails {
  const fallback = createDefaultPatientClinicalDetails('new');
  if (!raw || typeof raw !== 'object') {
    return fallback;
  }
  const obj = raw as Record<string, unknown>;
  return {
    poin2_1: normalizePoin2_1Data(obj.poin2_1),
    poin3_1: normalizePoin3_1Data(obj.poin3_1),
    poin3_2: normalizePoin3_2Data(obj.poin3_2),
    poin3_3: normalizePoin3_3Data(obj.poin3_3),
    poin3_5: normalizePoin3_5Data(obj.poin3_5),
    poin3_6: normalizePoin3_6Data(obj.poin3_6),
    poin4_1: normalizePoin4_1Data(obj.poin4_1),
    poin4_3: normalizePoin4_3Data(obj.poin4_3),
    poin6_3: normalizePoin6_3Data(obj.poin6_3)
  };
}

export function createDefaultPatientClinicalDetails(
  preset: 'p1' | 'p2' | 'p3' | 'new' = 'new'
): PatientLogbookClinicalDetails {
  if (preset === 'p1') {
    return {
      poin2_1: setAllPoin2_1(true),
      poin3_1: {
        verbal: { namaLengkap: true, tanggalLahir: true },
        nonVerbal: { gelangIdentitas: true, dokumenRmDanResep: true },
        tanggalLahirPasien: '14/05/1972',
        status: 'RAWAT JALAN',
        ruangRawatInap: '',
        kategori: 'REGULER'
      },
      poin3_2: {
        bbPre: '64.2',
        bbPost: '61.6',
        bbKering: '61.5',
        ufg: '2700'
      },
      poin3_3: {
        tdPreHd: '145/85',
        tdSistolik: '145',
        tdDiastolik: '85',
        posisiTd: 'Duduk',
        nadi: '80',
        pernapasan: '20',
        suhu: '36.6',
        spo2: '98'
      },
      poin3_5: {
        waktuDialisis: '4.5',
        targetUfg: '2700',
        qb: '220',
        qd: '500',
        dosisHeparin: '2000 IU'
      },
      poin3_6: {
        ciminoAktif: true,
        cimino: 'Sinistra, thrill (+) kuat',
        cdlAktif: false,
        cdl: '',
        femoralAktif: false,
        femoral: ''
      },
      poin4_1: {
        tdIntraHd: '135/80'
      },
      poin4_3: {
        ...createEmptyPoin4_3Data(),
        tidakAdaKomplikasi: true
      },
      poin6_3: {
        tdPostHd: '120/80',
        ufgTercapai: '2700',
        ktV: '1.42'
      }
    };
  }

  if (preset === 'p2') {
    return {
      poin2_1: setAllPoin2_1(true),
      poin3_1: {
        verbal: { namaLengkap: true, tanggalLahir: true },
        nonVerbal: { gelangIdentitas: true, dokumenRmDanResep: true },
        tanggalLahirPasien: '22/08/1968',
        status: 'RAWAT JALAN',
        ruangRawatInap: '',
        kategori: 'REGULER'
      },
      poin3_2: {
        bbPre: '55.4',
        bbPost: '53.1',
        bbKering: '53.0',
        ufg: '2400'
      },
      poin3_3: {
        tdPreHd: '138/80',
        tdSistolik: '138',
        tdDiastolik: '80',
        posisiTd: 'Duduk',
        nadi: '78',
        pernapasan: '19',
        suhu: '36.5',
        spo2: '99'
      },
      poin3_5: {
        waktuDialisis: '4.0',
        targetUfg: '2400',
        qb: '200',
        qd: '500',
        dosisHeparin: '1500 IU'
      },
      poin3_6: {
        ciminoAktif: false,
        cimino: '',
        cdlAktif: true,
        cdl: 'Jugularis Dextra, exit-site bersih',
        femoralAktif: false,
        femoral: ''
      },
      poin4_1: {
        tdIntraHd: '130/80'
      },
      poin4_3: {
        ...createEmptyPoin4_3Data(),
        tidakAdaKomplikasi: true
      },
      poin6_3: {
        tdPostHd: '125/75',
        ufgTercapai: '2400',
        ktV: '1.38'
      }
    };
  }

  if (preset === 'p3') {
    return {
      poin2_1: setAllPoin2_1(true),
      poin3_1: {
        verbal: { namaLengkap: true, tanggalLahir: true },
        nonVerbal: { gelangIdentitas: true, dokumenRmDanResep: true },
        tanggalLahirPasien: '09/11/1975',
        status: 'RAWAT INAP',
        ruangRawatInap: 'ICU',
        kategori: 'ISOLASI HEPATITIS B'
      },
      poin3_2: {
        bbPre: '68.0',
        bbPost: '65.2',
        bbKering: '65.0',
        ufg: '3000'
      },
      poin3_3: {
        tdPreHd: '150/90',
        tdSistolik: '150',
        tdDiastolik: '90',
        posisiTd: 'Berbaring',
        nadi: '84',
        pernapasan: '20',
        suhu: '36.7',
        spo2: '98'
      },
      poin3_5: {
        waktuDialisis: '4.5',
        targetUfg: '3000',
        qb: '230',
        qd: '500',
        dosisHeparin: 'Free Heparin'
      },
      poin3_6: {
        ciminoAktif: false,
        cimino: '',
        cdlAktif: false,
        cdl: '',
        femoralAktif: true,
        femoral: 'Femoralis Dextra, aliran lancar'
      },
      poin4_1: {
        tdIntraHd: '140/85'
      },
      poin4_3: {
        ...createEmptyPoin4_3Data(),
        tidakAdaKomplikasi: true
      },
      poin6_3: {
        tdPostHd: '130/80',
        ufgTercapai: '3000',
        ktV: '1.45'
      }
    };
  }

  return {
    poin2_1: setAllPoin2_1(false),
    poin3_1: {
      verbal: { namaLengkap: false, tanggalLahir: false },
      nonVerbal: { gelangIdentitas: false, dokumenRmDanResep: false },
      tanggalLahirPasien: '',
      status: '',
      ruangRawatInap: '',
      kategori: ''
    },
    poin3_2: {
      bbPre: '',
      bbPost: '',
      bbKering: '',
      ufg: ''
    },
    poin3_3: {
      tdPreHd: '',
      tdSistolik: '',
      tdDiastolik: '',
      posisiTd: 'Duduk',
      nadi: '',
      pernapasan: '',
      suhu: '',
      spo2: ''
    },
    poin3_5: {
      waktuDialisis: '',
      targetUfg: '',
      qb: '',
      qd: '',
      dosisHeparin: ''
    },
    poin3_6: {
      ciminoAktif: false,
      cimino: '',
      cdlAktif: false,
      cdl: '',
      femoralAktif: false,
      femoral: ''
    },
    poin4_1: {
      tdIntraHd: ''
    },
    poin4_3: createEmptyPoin4_3Data(),
    poin6_3: {
      tdPostHd: '',
      ufgTercapai: '',
      ktV: ''
    }
  };
}


