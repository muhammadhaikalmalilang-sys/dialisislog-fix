import {
  MasterPatient,
  MasterNurse,
  MasterBed,
  MasterDoctor,
  DoctorRole,
  PatientHDSession,
  PatientCategory,
  PatientStatus,
  VascularAccess,
  SystemAccessRole,
  HdTreatmentFrequency,
  HdTreatmentDay,
  BiweeklyCycleType
} from '../types/dialysis.ts';

export type AppNavTabId =
  | 'dashboard'
  | 'lap_harian'
  | 'logbook'
  | 'laporan_pasien'
  | 'verifikasi'
  | 'riwayat'
  | 'lap_bulanan'
  | 'data_pasien'
  | 'data_perawat'
  | 'data_mesin'
  | 'data_dokter'
  | 'my_account';

export function resolveNurseSystemAccess(
  nurse: Pick<MasterNurse, 'role' | 'systemAccess'>
): SystemAccessRole {
  if (
    nurse.systemAccess === 'administrator' ||
    nurse.systemAccess === 'kepala_ruangan' ||
    nurse.systemAccess === 'pj_shift' ||
    nurse.systemAccess === 'perawat_pelaksana'
  ) {
    return nurse.systemAccess;
  }
  if (nurse.role === 'kepala_ruangan') return 'kepala_ruangan';
  if (nurse.role === 'pj_shift') return 'pj_shift';
  return 'perawat_pelaksana';
}

export function formatSystemAccessLabel(role?: SystemAccessRole): string {
  switch (role) {
    case 'administrator':
      return 'Administrator';
    case 'kepala_ruangan':
      return 'Kepala Ruang';
    case 'pj_shift':
      return 'PJ Shift';
    case 'perawat_pelaksana':
    default:
      return 'Perawat Pelaksana';
  }
}

export function findPatientByMrn(patients: MasterPatient[], mrn: string): MasterPatient | undefined {
  return patients.find(p => p.medicalRecordNumber === mrn);
}

export function getBedCategoryDefault(bed: MasterBed): PatientCategory {
  if (bed.designation === 'isolasi' || bed.designation === 'isolasi_hepb') return 'hepatitis_b';
  if (bed.designation === 'isolasi_hepc') return 'hepatitis_c';
  return 'reguler';
}

export function calculateStaffingDetails(nurses: MasterNurse[], totalPatients: number) {
  const onDuty = nurses.filter(n => n.isOnDutyToday && n.accountStatus !== 'nonaktif');
  const pjShift = onDuty.find(n => n.role === 'pj_shift');
  const pelaksana = onDuty.filter(n => n.role === 'perawat_pelaksana');
  const totalDinas = onDuty.length;

  if (totalDinas === 0) {
    return {
      totalDinas: 0,
      pelaksanaCount: 0,
      ratioText: '-',
      detailText: '0 Orang (Belum ada perawat dinas)',
      isStandardCompliant: true
    };
  }

  const ratioNumber =
    totalPatients > 0 && pelaksana.length > 0 ? (totalPatients / pelaksana.length).toFixed(0) : '3';
  const ratioText = `1 : ${ratioNumber} (Standar PERNEFRI 1 : 3-4 Pasien)`;
  const detailText = `${totalDinas} Orang (${pjShift ? '1 PJ Shift + ' : ''}${pelaksana.length} Perawat Pelaksana)`;

  return {
    totalDinas,
    pelaksanaCount: pelaksana.length,
    ratioText,
    detailText,
    isStandardCompliant: Number(ratioNumber) <= 4
  };
}

export function canAccessMasterData(role?: SystemAccessRole): boolean {
  return role === 'administrator';
}

export function canVerifyLogbook(role?: SystemAccessRole): boolean {
  return role === 'kepala_ruangan' || role === 'pj_shift';
}

export function getDefaultTabForRole(_role?: SystemAccessRole): AppNavTabId {
  return 'dashboard';
}

export function getAccessibleTabs(role?: SystemAccessRole): AppNavTabId[] {
  if (role === 'administrator') {
    return ['dashboard', 'data_pasien', 'data_perawat', 'data_mesin', 'data_dokter', 'my_account'];
  }
  if (role === 'kepala_ruangan' || role === 'pj_shift') {
    return ['dashboard', 'logbook', 'laporan_pasien', 'verifikasi', 'riwayat', 'lap_harian', 'lap_bulanan', 'my_account'];
  }
  return ['dashboard', 'logbook', 'laporan_pasien', 'riwayat', 'lap_bulanan', 'my_account'];
}

export function autoPopulateSessionDraft(
  patient: MasterPatient,
  bed: MasterBed,
  nurseName: string
): Partial<PatientHDSession> {
  const defaultCategory =
    bed.designation === 'isolasi_hepb'
      ? 'hepatitis_b'
      : bed.designation === 'isolasi_hepc'
      ? 'hepatitis_c'
      : bed.designation === 'isolasi' && patient.category === 'reguler'
      ? 'hepatitis_b'
      : patient.category;

  const isCito = bed.designation === 'cito_icu' || patient.defaultStatus === 'ranap';

  return {
    patientName: patient.patientName,
    medicalRecordNumber: patient.medicalRecordNumber,
    age: patient.age,
    gender: patient.gender,
    status: patient.defaultStatus,
    category: defaultCategory,
    isCito,
    vascularAccess: patient.defaultVascularAccess,
    accessSite: patient.defaultAccessSite,
    dialyzerModel: patient.defaultDialyzer,
    dryWeight: patient.defaultDryWeight,
    preWeight: patient.defaultDryWeight + 2.5, // typical interdialytic weight gain
    targetUf: 2500,
    achievedUf: 2500,
    durationPrescribed: isCito ? 3.0 : 4.5,
    durationActual: isCito ? 3.0 : 4.5,
    bloodFlowQb: 220,
    dialysateFlowQd: 500,
    nurseInCharge: nurseName,
    preBp: '140/90',
    postBp: '120/80',
    hasHypotension: false,
    hasMuscleCramps: false,
    hasClotting: false,
    hasFirstUseSyndrome: false,
    hasAccessBleeding: false,
    hasConsultDpjp: false,
    underUfTolerated: false,
    nurseNotes: `HD rutin terstandar. Dry weight dasar: ${patient.defaultDryWeight} kg.`
  };
}

export function updateMasterNurseData(
  nurses: MasterNurse[],
  nurseId: string,
  updates: Partial<MasterNurse>
): MasterNurse[] {
  return nurses.map(n =>
    n.id === nurseId
      ? {
          ...n,
          ...updates,
          name: updates.name !== undefined ? updates.name.trim() : n.name,
          email: updates.email !== undefined ? updates.email.trim() : n.email,
          username: updates.username !== undefined ? updates.username.trim() : n.username
        }
      : n
  );
}

export function updateMasterBedData(
  beds: MasterBed[],
  bedId: string,
  updates: Partial<MasterBed>
): MasterBed[] {
  return beds.map(b =>
    b.id === bedId
      ? {
          ...b,
          ...updates,
          bedNumber: updates.bedNumber !== undefined ? updates.bedNumber.trim() : b.bedNumber
        }
      : b
  );
}

export function updateMasterDoctorData(
  doctors: MasterDoctor[],
  doctorId: string,
  updates: Partial<MasterDoctor>
): MasterDoctor[] {
  return doctors.map(d =>
    d.id === doctorId
      ? {
          ...d,
          ...updates,
          name: updates.name !== undefined ? updates.name.trim() : d.name,
          sip: updates.sip !== undefined ? updates.sip.trim() : d.sip,
          nip: updates.nip !== undefined ? updates.nip.trim() : d.nip,
          email: updates.email !== undefined ? updates.email.trim() : d.email,
          updatedAt: new Date().toISOString()
        }
      : d
  );
}

export function formatDoctorRoleLabel(role?: DoctorRole): string {
  switch (role) {
    case 'dpjp':
      return 'Dokter DPJP (Sp.PD-KGH / Sp.PD)';
    case 'dokter_jaga':
      return 'Dokter Jaga Ruangan';
    case 'both':
      return 'DPJP & Dokter Jaga Ruangan';
    default:
      return 'Dokter Ruangan HD';
  }
}

export function filterDoctorsByRole(
  doctors: MasterDoctor[],
  targetRole: 'dpjp' | 'dokter_jaga'
): MasterDoctor[] {
  return doctors.filter(
    d => (d.role === targetRole || d.role === 'both') && d.status === 'aktif'
  );
}

export function getActiveDoctors(doctors: MasterDoctor[]): MasterDoctor[] {
  return doctors.filter(d => d.status === 'aktif');
}

export function findNurseByAccountInput(
  nurses: MasterNurse[],
  loginIdentifier: string
): MasterNurse | undefined {
  const clean = loginIdentifier.trim().toLowerCase();
  if (!clean) return undefined;
  return nurses.find(
    n =>
      (n.email && n.email.trim().toLowerCase() === clean) ||
      (n.username && n.username.trim().toLowerCase() === clean) ||
      (n.nip && n.nip.replace(/\s+/g, '').toLowerCase() === clean.replace(/\s+/g, ''))
  );
}

// ============================================================================
// HD DAY & SCHEDULE CATEGORIZATION HELPERS
// ============================================================================

export const HD_TREATMENT_DAYS: HdTreatmentDay[] = [
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
  'Minggu'
];

export interface HdDayCategoryMeta {
  day: HdTreatmentDay;
  title: string;
  shortLabel: string;
  description: string;
}

export const HD_DAY_CATEGORIES: HdDayCategoryMeta[] = HD_TREATMENT_DAYS.map(day => ({
  day,
  title: `Hari ${day}`,
  shortLabel: day,
  description: `Daftar pasien hemodialisis terjadwal pada hari ${day}`
}));

export const HD_2X_DAY_PAIRS: Array<{
  label: string;
  days: [HdTreatmentDay, HdTreatmentDay];
}> = [
  { label: 'Senin & Kamis', days: ['Senin', 'Kamis'] },
  { label: 'Selasa & Jumat', days: ['Selasa', 'Jumat'] },
  { label: 'Rabu & Sabtu', days: ['Rabu', 'Sabtu'] }
];

export const BIWEEKLY_CYCLE_OPTIONS: BiweeklyCycleType[] = [
  'Minggu Ganjil (Ke-1 & Ke-3)',
  'Minggu Genap (Ke-2 & Ke-4)',
  'Siklus 14 Hari Terjadwal'
];

export interface HdFrequencyCategoryMeta {
  id: HdTreatmentFrequency;
  title: string;
  shortLabel: string;
  description: string;
  defaultDays: HdTreatmentDay[];
  defaultSchedule: string;
}

export const HD_FREQUENCY_CATEGORIES: HdFrequencyCategoryMeta[] = [
  {
    id: '2x_seminggu',
    title: 'HD 2 Kali dalam 1 Minggu',
    shortLabel: '2x / 1 Minggu',
    description: 'Jadwal rutin 2 sesi per minggu (contoh: Senin–Kamis, Selasa–Jumat, Rabu–Sabtu)',
    defaultDays: ['Selasa', 'Jumat'],
    defaultSchedule: 'Selasa & Jumat (Pagi)'
  },
  {
    id: '1x_seminggu',
    title: 'HD 1 Kali dalam 1 Minggu',
    shortLabel: '1x / 1 Minggu',
    description: 'Jadwal rutin 1 sesi setiap minggu pada hari tetap (Senin s/d Sabtu)',
    defaultDays: ['Rabu'],
    defaultSchedule: 'Setiap Rabu (Pagi)'
  },
  {
    id: '1x_2minggu',
    title: 'HD 1 Kali dalam 2 Minggu',
    shortLabel: '1x / 2 Minggu',
    description: 'Jadwal berkala 1 sesi tiap 2 minggu (Minggu Ganjil / Minggu Genap / 14 Hari)',
    defaultDays: ['Sabtu'],
    defaultSchedule: 'Sabtu · Minggu Ganjil (Pagi)'
  }
];

export function sortTreatmentDays(days: HdTreatmentDay[]): HdTreatmentDay[] {
  const unique = Array.from(new Set(days.filter(d => HD_TREATMENT_DAYS.includes(d))));
  return unique.sort((a, b) => HD_TREATMENT_DAYS.indexOf(a) - HD_TREATMENT_DAYS.indexOf(b));
}

export function formatPatientTreatmentDaysLabel(
  days?: HdTreatmentDay[],
  style: 'full' | 'short' = 'full'
): string {
  const valid = sortTreatmentDays(days || []);
  const prefix = style === 'full' ? 'Hari ' : '';
  if (valid.length === 0) return `${prefix}Senin`;
  if (valid.length === 1) return `${prefix}${valid[0]}`;
  if (valid.length === 2) return `${prefix}${valid[0]} & ${valid[1]}`;
  return `${prefix}${valid.slice(0, -1).join(', ')} & ${valid[valid.length - 1]}`;
}

export function buildPatientDaySchedule(params: {
  days?: HdTreatmentDay[];
  shift?: 'Pagi' | 'Siang';
}): string {
  const shift = params.shift || 'Pagi';
  const valid = sortTreatmentDays(params.days || []);
  const dayList = valid.length > 0 ? valid : (['Senin'] as HdTreatmentDay[]);
  const dayText =
    dayList.length === 1
      ? dayList[0]
      : dayList.length === 2
      ? `${dayList[0]} & ${dayList[1]}`
      : `${dayList.slice(0, -1).join(', ')} & ${dayList[dayList.length - 1]}`;
  return `${dayText} (${shift})`;
}

export function formatTreatmentFrequencyLabel(
  frequency?: HdTreatmentFrequency,
  style: 'full' | 'short' = 'full'
): string {
  switch (frequency) {
    case '1x_seminggu':
      return style === 'short' ? '1x / 1 Minggu' : '1 Kali dalam 1 Minggu';
    case '1x_2minggu':
      return style === 'short' ? '1x / 2 Minggu' : '1 Kali dalam 2 Minggu';
    case '2x_seminggu':
    default:
      return style === 'short' ? '2x / 1 Minggu' : '2 Kali dalam 1 Minggu';
  }
}

export function getDefaultScheduleForFrequency(frequency: HdTreatmentFrequency): string {
  const found = HD_FREQUENCY_CATEGORIES.find(c => c.id === frequency);
  return found ? found.defaultSchedule : 'Selasa & Jumat (Pagi)';
}

export function extractTreatmentDaysFromText(raw?: string): HdTreatmentDay[] {
  if (!raw) return [];
  // Strip Indonesian week-interval phrases ("1 minggu", "2 minggu", "minggu ganjil", "seminggu")
  // so "minggu" only matches Sunday ("Hari Minggu" / "Minggu")
  const sanitized = raw
    .toLowerCase()
    .replace(/\b\d+\s*minggu\b/gi, ' ')
    .replace(/\b(satu|dua|tiap|setiap|per|dalam)\s+minggu\b/gi, ' ')
    .replace(/\bminggu\s*(ganjil|genap|ke[-\s]?\d*)\b/gi, ' ')
    .replace(/\bseminggu\b/gi, ' ');

  const patterns: Array<{ day: HdTreatmentDay; regex: RegExp }> = [
    { day: 'Senin', regex: /\bsenin\b/i },
    { day: 'Selasa', regex: /\bselasa\b/i },
    { day: 'Rabu', regex: /\brabu\b/i },
    { day: 'Kamis', regex: /\bkamis\b/i },
    { day: 'Jumat', regex: /\bjum'?at\b/i },
    { day: 'Sabtu', regex: /\bsabtu\b/i },
    { day: 'Minggu', regex: /\b(minggu|ahad)\b/i }
  ];

  const matchedWithPos: Array<{ day: HdTreatmentDay; index: number }> = [];
  for (const p of patterns) {
    const m = p.regex.exec(sanitized);
    if (m) {
      matchedWithPos.push({ day: p.day, index: m.index });
    }
  }
  matchedWithPos.sort((a, b) => a.index - b.index);
  return matchedWithPos.map(m => m.day);
}

export function extractTreatmentShiftFromText(
  raw?: string,
  fallback: 'Pagi' | 'Siang' = 'Pagi'
): 'Pagi' | 'Siang' {
  if (!raw) return fallback;
  const lower = raw.toLowerCase();
  if (lower.includes('siang') || lower.includes('sore')) return 'Siang';
  if (lower.includes('pagi')) return 'Pagi';
  return fallback;
}

export function extractBiweeklyCycleFromText(raw?: string): BiweeklyCycleType {
  if (!raw) return 'Minggu Ganjil (Ke-1 & Ke-3)';
  const lower = raw.toLowerCase();
  if (lower.includes('genap') || lower.includes('ke-2') || lower.includes('ke 2')) {
    return 'Minggu Genap (Ke-2 & Ke-4)';
  }
  if (lower.includes('14 hari') || lower.includes('tiap 2 minggu') || lower.includes('per 2 minggu')) {
    return 'Siklus 14 Hari Terjadwal';
  }
  return 'Minggu Ganjil (Ke-1 & Ke-3)';
}

export function parseTreatmentFrequencyInput(
  raw?: string,
  fallback?: HdTreatmentFrequency
): HdTreatmentFrequency | undefined {
  if (!raw || !raw.trim()) return fallback;
  const v = raw.trim().toLowerCase();

  if (v === '2x_seminggu') return '2x_seminggu';
  if (v === '1x_seminggu') return '1x_seminggu';
  if (v === '1x_2minggu') return '1x_2minggu';

  if (
    v.includes('2 minggu') ||
    v.includes('2minggu') ||
    v.includes('dua minggu') ||
    v.includes('14 hari') ||
    v.includes('dwiminggu') ||
    v.includes('minggu ganjil') ||
    v.includes('minggu genap') ||
    /1\s*(x|kali)\s*(\/|per|dalam)?\s*2\b/.test(v)
  ) {
    return '1x_2minggu';
  }

  if (v.includes('2x') || v.includes('2 kali') || v.includes('dua kali')) {
    return '2x_seminggu';
  }

  if (
    v.includes('1x') ||
    v.includes('1 kali') ||
    v.includes('satu kali') ||
    v.includes('seminggu sekali') ||
    v.includes('setiap ')
  ) {
    return '1x_seminggu';
  }

  const days = extractTreatmentDaysFromText(raw);
  if (days.length >= 2) return '2x_seminggu';
  if (days.length === 1) return '1x_seminggu';

  return fallback;
}

export function isStandaloneFrequencyToken(raw?: string): boolean {
  if (!raw || !raw.trim()) return false;
  return (
    extractTreatmentDaysFromText(raw).length === 0 &&
    parseTreatmentFrequencyInput(raw) !== undefined
  );
}

export function buildPatientRoutineSchedule(params: {
  frequency: HdTreatmentFrequency;
  days?: HdTreatmentDay[];
  shift?: 'Pagi' | 'Siang';
  biweeklyCycle?: BiweeklyCycleType;
}): string {
  const shift = params.shift || 'Pagi';
  const validDays = (params.days || []).filter(d => HD_TREATMENT_DAYS.includes(d));

  if (params.frequency === '2x_seminggu') {
    const d1 = validDays[0] || 'Selasa';
    let d2 = validDays.find(d => d !== d1);
    if (!d2) {
      const pairMap: Record<HdTreatmentDay, HdTreatmentDay> = {
        Senin: 'Kamis',
        Selasa: 'Jumat',
        Rabu: 'Sabtu',
        Kamis: 'Senin',
        Jumat: 'Selasa',
        Sabtu: 'Rabu',
        Minggu: 'Rabu'
      };
      d2 = pairMap[d1] || 'Jumat';
    }
    return `${d1} & ${d2} (${shift})`;
  }

  if (params.frequency === '1x_seminggu') {
    const d1 = validDays[0] || 'Rabu';
    return `Setiap ${d1} (${shift})`;
  }

  const d1 = validDays[0] || 'Sabtu';
  const cycle = params.biweeklyCycle || 'Minggu Ganjil (Ke-1 & Ke-3)';
  const cycleShort = cycle.startsWith('Minggu Genap')
    ? 'Minggu Genap'
    : cycle.startsWith('Siklus 14')
    ? 'Tiap 2 Minggu'
    : 'Minggu Ganjil';
  return `${d1} · ${cycleShort} (${shift})`;
}

export function resolvePatientTreatmentDays(
  patient: Pick<MasterPatient, 'treatmentDays' | 'routineSchedule'>
): HdTreatmentDay[] {
  if (patient.treatmentDays && patient.treatmentDays.length > 0) {
    const valid = sortTreatmentDays(patient.treatmentDays);
    if (valid.length > 0) return valid;
  }
  const fromSchedule = sortTreatmentDays(extractTreatmentDaysFromText(patient.routineSchedule));
  if (fromSchedule.length > 0) return fromSchedule;
  return ['Senin'];
}

export function resolvePatientTreatmentShift(
  patient: Pick<MasterPatient, 'treatmentShift' | 'routineSchedule'>
): 'Pagi' | 'Siang' {
  if (patient.treatmentShift === 'Pagi' || patient.treatmentShift === 'Siang') {
    return patient.treatmentShift;
  }
  return extractTreatmentShiftFromText(patient.routineSchedule, 'Pagi');
}

/**
 * Filters Master Patients strictly to those scheduled on the given active day AND active shift.
 * Example: activeDay = 'Senin', activeShift = 'Siang' -> returns only patients scheduled on Senin Siang.
 */
export function filterMasterPatientsForActiveSchedule(
  patients: MasterPatient[],
  activeDay: HdTreatmentDay,
  activeShift: 'Pagi' | 'Siang'
): MasterPatient[] {
  return patients.filter(patient => {
    const days = resolvePatientTreatmentDays(patient);
    const shift = resolvePatientTreatmentShift(patient);
    return days.includes(activeDay) && shift === activeShift;
  });
}

export function resolvePatientTreatmentFrequency(
  patient: Pick<MasterPatient, 'treatmentFrequency' | 'routineSchedule' | 'treatmentDays'>
): HdTreatmentFrequency {
  if (
    patient.treatmentFrequency === '2x_seminggu' ||
    patient.treatmentFrequency === '1x_seminggu' ||
    patient.treatmentFrequency === '1x_2minggu'
  ) {
    return patient.treatmentFrequency;
  }
  const fromSchedule = parseTreatmentFrequencyInput(patient.routineSchedule);
  if (fromSchedule) return fromSchedule;
  const days = resolvePatientTreatmentDays(patient);
  if (days.length === 1) {
    return '1x_seminggu';
  }
  return '2x_seminggu';
}

export function normalizeMasterPatient(patient: MasterPatient): MasterPatient {
  const days = resolvePatientTreatmentDays(patient);
  const shift =
    patient.treatmentShift || extractTreatmentShiftFromText(patient.routineSchedule, 'Pagi');

  const rawSchedule = (patient.routineSchedule || '').trim();
  const extractedFromRaw = sortTreatmentDays(extractTreatmentDaysFromText(rawSchedule));
  const rawMatchesDays =
    rawSchedule.length > 0 &&
    extractedFromRaw.length === days.length &&
    extractedFromRaw.every((d, idx) => d === days[idx]);

  const routineSchedule = rawMatchesDays
    ? rawSchedule
    : buildPatientDaySchedule({ days, shift });

  const inferredFrequency: HdTreatmentFrequency =
    patient.treatmentFrequency ||
    parseTreatmentFrequencyInput(rawSchedule) ||
    (days.length >= 2 ? '2x_seminggu' : '1x_seminggu');

  const biweeklyCycle =
    inferredFrequency === '1x_2minggu'
      ? patient.biweeklyCycle || extractBiweeklyCycleFromText(rawSchedule)
      : patient.biweeklyCycle;

  return {
    ...patient,
    treatmentDays: days,
    treatmentShift: shift,
    treatmentFrequency: inferredFrequency,
    biweeklyCycle,
    routineSchedule
  };
}

export interface CategorizedPatientsByDayResult {
  byDay: Record<HdTreatmentDay, MasterPatient[]>;
  counts: Record<HdTreatmentDay, number> & {
    totalPatients: number;
    totalJadwalHarian: number;
  };
}

export function categorizePatientsByDay(patients: MasterPatient[]): CategorizedPatientsByDayResult {
  const byDay: Record<HdTreatmentDay, MasterPatient[]> = {
    Senin: [],
    Selasa: [],
    Rabu: [],
    Kamis: [],
    Jumat: [],
    Sabtu: [],
    Minggu: []
  };

  for (const patient of patients) {
    const days = resolvePatientTreatmentDays(patient);
    for (const day of days) {
      if (byDay[day]) {
        byDay[day].push(patient);
      }
    }
  }

  const totalJadwalHarian = HD_TREATMENT_DAYS.reduce((acc, d) => acc + byDay[d].length, 0);

  return {
    byDay,
    counts: {
      Senin: byDay.Senin.length,
      Selasa: byDay.Selasa.length,
      Rabu: byDay.Rabu.length,
      Kamis: byDay.Kamis.length,
      Jumat: byDay.Jumat.length,
      Sabtu: byDay.Sabtu.length,
      Minggu: byDay.Minggu.length,
      totalPatients: patients.length,
      totalJadwalHarian
    }
  };
}

export function categorizePatientsByTreatmentSchedule(patients: MasterPatient[]) {
  const twoTimesWeekly: MasterPatient[] = [];
  const onceWeekly: MasterPatient[] = [];
  const onceBiweekly: MasterPatient[] = [];

  for (const rawPatient of patients) {
    const freq = resolvePatientTreatmentFrequency(rawPatient);
    if (freq === '1x_seminggu') {
      onceWeekly.push(rawPatient);
    } else if (freq === '1x_2minggu') {
      onceBiweekly.push(rawPatient);
    } else {
      twoTimesWeekly.push(rawPatient);
    }
  }

  return {
    twoTimesWeekly,
    onceWeekly,
    onceBiweekly,
    counts: {
      total: patients.length,
      '2x_seminggu': twoTimesWeekly.length,
      '1x_seminggu': onceWeekly.length,
      '1x_2minggu': onceBiweekly.length
    }
  };
}

// ============================================================================
// BULK IMPORT & AUTO-CREDENTIAL HELPERS FOR ADMINISTRATOR
// ============================================================================

export interface BulkPatientDefaults {
  defaultAge?: number;
  defaultGender?: 'L' | 'P';
  defaultStatus?: PatientStatus;
  defaultCategory?: PatientCategory;
  defaultVascularAccess?: VascularAccess;
  defaultDryWeight?: number;
  defaultDialyzer?: string;
  defaultTreatmentDay?: HdTreatmentDay;
  defaultTreatmentDays?: HdTreatmentDay[];
  defaultShift?: 'Pagi' | 'Siang';
  defaultTreatmentFrequency?: HdTreatmentFrequency;
  defaultRoutineSchedule?: string;
}

export interface ParsedBulkPatientItem {
  rowNumber: number;
  patient: MasterPatient;
  isDuplicateExisting: boolean;
  existingPatientId?: string;
  isDuplicateInBatch: boolean;
  error?: string;
}

export interface BulkPatientParseResult {
  items: ParsedBulkPatientItem[];
  validCount: number;
  newCount: number;
  duplicateExistingCount: number;
  errorCount: number;
}

export interface BulkNurseDefaults {
  defaultRole?: MasterNurse['role'];
  defaultShift?: 'Pagi' | 'Siang' | 'Malam';
  defaultPassword?: string;
  defaultIsOnDutyToday?: boolean;
  defaultPernefriCertified?: boolean;
  emailDomain?: string;
}

export interface ParsedBulkNurseItem {
  rowNumber: number;
  nurse: MasterNurse;
  isDuplicateExisting: boolean;
  existingNurseId?: string;
  isDuplicateInBatch: boolean;
  error?: string;
}

export interface BulkNurseParseResult {
  items: ParsedBulkNurseItem[];
  validCount: number;
  newCount: number;
  duplicateExistingCount: number;
  errorCount: number;
}

/**
 * Generates a clean, unique login username from an Indonesian clinical nurse name,
 * stripping academic/clinical titles (Ns., Ners, S.Kep, A.Md.Kep, etc.).
 */
export function generateUsernameFromNurseName(
  name: string,
  usedUsernames: Set<string> = new Set()
): string {
  const stripped = (name || '')
    .toLowerCase()
    .replace(
      /\b(ners|ns|s\.kep|a\.md\.kep|a\.md|s\.tr\.kep|s\.tr|m\.kep|kep|skep|dr|hj|h|pw|ny|tn|sdr|sdri)\b/gi,
      ' '
    )
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = stripped.split(' ').filter(w => w.length >= 2);
  let base = 'perawat';
  if (words.length >= 2) {
    base = `${words[0]}.${words[1]}`;
  } else if (words.length === 1) {
    base = words[0];
  }

  if (base === 'admin') {
    base = 'perawat.hd';
  }

  let candidate = base;
  let counter = 2;
  while (usedUsernames.has(candidate.toLowerCase())) {
    candidate = `${base}${counter}`;
    counter++;
  }
  usedUsernames.add(candidate.toLowerCase());
  return candidate;
}

export function inferGenderFromIndonesianName(
  patientName: string,
  fallback: 'L' | 'P' = 'L'
): 'L' | 'P' {
  const lower = (patientName || '').trim().toLowerCase();
  if (
    lower.startsWith('ny.') ||
    lower.startsWith('ny ') ||
    lower.startsWith('nn.') ||
    lower.startsWith('nn ') ||
    lower.startsWith('ibu ') ||
    lower.startsWith('sdri.') ||
    lower.startsWith('sdri ') ||
    lower.startsWith('hj.') ||
    lower.startsWith('hj ') ||
    /(?:^|[\s,.])(ny|nn|sdri|ibu)\.?$/i.test(lower)
  ) {
    return 'P';
  }
  if (
    lower.startsWith('tn.') ||
    lower.startsWith('tn ') ||
    lower.startsWith('bpk.') ||
    lower.startsWith('bpk ') ||
    lower.startsWith('sdr.') ||
    lower.startsWith('sdr ') ||
    lower.startsWith('h.') ||
    lower.startsWith('h ') ||
    /(?:^|[\s,.])(tn|bpk|sdr)\.?$/i.test(lower)
  ) {
    return 'L';
  }
  return fallback;
}

export function parseVascularAccessInput(
  raw?: string,
  fallback: VascularAccess = 'av_fistula'
): VascularAccess {
  if (!raw) return fallback;
  const v = raw.trim().toLowerCase();
  if (v.includes('permcath') || v.includes('tunnel') && !v.includes('non')) {
    return 'cdl_permcath';
  }
  if (v.includes('cdl') || v.includes('catheter') || v.includes('kateter') || v.includes('jugular') || v.includes('femoral')) {
    return 'cdl_non_tunnel';
  }
  if (v.includes('graft') || v.includes('avg')) {
    return 'av_graft';
  }
  if (v.includes('avf') || v.includes('fistula') || v.includes('cimino')) {
    return 'av_fistula';
  }
  return fallback;
}

export function getDefaultAccessSiteForType(access: VascularAccess): string {
  switch (access) {
    case 'av_graft':
      return 'AVG Brachioaxillaris Sinistra';
    case 'cdl_non_tunnel':
      return 'CDL Jugularis Interna Dextra';
    case 'cdl_permcath':
      return 'Permcath Subclavia Dextra';
    case 'av_fistula':
    default:
      return 'AVF Radiocephalica Sinistra';
  }
}

export function parsePatientCategoryInput(
  raw?: string,
  fallback: PatientCategory = 'reguler'
): PatientCategory {
  if (!raw) return fallback;
  const v = raw.trim().toLowerCase();
  if (v.includes('hep b') || v.includes('hepb') || v.includes('hbsag') || v === 'b') {
    return 'hepatitis_b';
  }
  if (v.includes('hep c') || v.includes('hepc') || v.includes('hcv') || v === 'c') {
    return 'hepatitis_c';
  }
  if (v.includes('hiv')) {
    return 'hiv';
  }
  return fallback;
}

export function parseNurseRoleInput(
  raw?: string,
  fallback: MasterNurse['role'] = 'perawat_pelaksana'
): MasterNurse['role'] {
  if (!raw) return fallback;
  const v = raw.trim().toLowerCase();
  if (v.includes('kepala') || v.includes('karu') || v.includes('ka.ru') || v.includes('ka ruang')) {
    return 'kepala_ruangan';
  }
  if (v.includes('pj') || v.includes('penanggung jawab')) {
    return 'pj_shift';
  }
  if (v.includes('pelaksana')) {
    return 'perawat_pelaksana';
  }
  return fallback;
}

export function parseShiftInput(
  raw?: string,
  fallback: 'Pagi' | 'Siang' | 'Malam' = 'Pagi'
): 'Pagi' | 'Siang' | 'Malam' {
  if (!raw) return fallback;
  const v = raw.trim().toLowerCase();
  if (v.includes('siang') || v.includes('sore')) return 'Siang';
  if (v.includes('malam')) return 'Malam';
  if (v.includes('pagi')) return 'Pagi';
  return fallback;
}

export function generateNextMedicalRecordNumber(
  existingPatients: MasterPatient[],
  usedMrns: Set<string> = new Set()
): string {
  let maxNumeric = 452100;
  existingPatients.forEach(p => {
    const digits = (p.medicalRecordNumber || '').replace(/\D+/g, '');
    if (digits) {
      const num = parseInt(digits, 10);
      if (Number.isFinite(num) && num > maxNumeric && num < 99999999) {
        maxNumeric = num;
      }
    }
  });
  usedMrns.forEach(mrn => {
    const digits = mrn.replace(/\D+/g, '');
    if (digits) {
      const num = parseInt(digits, 10);
      if (Number.isFinite(num) && num > maxNumeric && num < 99999999) {
        maxNumeric = num;
      }
    }
  });

  let candidateNum = maxNumeric + 1;
  while (usedMrns.has(String(candidateNum))) {
    candidateNum++;
  }
  const mrnStr = String(candidateNum);
  usedMrns.add(mrnStr);
  return mrnStr;
}

function splitDelimitedLine(line: string): string[] {
  if (line.includes('\t')) {
    return line.split('\t').map(c => c.trim().replace(/^"|"$/g, ''));
  }
  if (line.includes(';')) {
    return line.split(';').map(c => c.trim().replace(/^"|"$/g, ''));
  }
  if (line.includes('|')) {
    return line.split('|').map(c => c.trim().replace(/^"|"$/g, ''));
  }
  // CSV comma split respecting double quotes
  const cols: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      cols.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cols.push(current.trim());
  return cols;
}

function isShiftOnlyToken(raw?: string): boolean {
  if (!raw || !raw.trim()) return false;
  const v = raw.trim().toLowerCase();
  return (
    v === 'pagi' ||
    v === 'siang' ||
    v === 'sore' ||
    v === 'malam' ||
    v === 'shift pagi' ||
    v === 'shift siang' ||
    v === 'shift sore' ||
    v === 'shift malam'
  );
}

/**
 * Parses multi-line text (pasted from Excel/Google Sheets/CSV or 1-per-line list)
 * into MasterPatient records categorized by day (Hari HD).
 * Supported column order:
 *   1 col:  Nama Pasien
 *   2+ cols: No. RM | Nama Pasien | Usia | JK (L/P) | BB Kering | Akses Vaskular | Kategori | Hari HD | Shift HD | No. HP
 *   (Also auto-detects 8/9-column pastes or legacy Frekuensi HD columns!)
 */
export function parseBulkPatientsText(
  rawText: string,
  existingPatients: MasterPatient[] = [],
  defaults: BulkPatientDefaults = {}
): BulkPatientParseResult {
  const lines = (rawText || '')
    .split(/\r?\n/)
    .filter(l => l.trim().length > 0 && !l.trim().startsWith('#'));

  if (lines.length === 0) {
    return {
      items: [],
      validCount: 0,
      newCount: 0,
      duplicateExistingCount: 0,
      errorCount: 0
    };
  }

  const existingByMrn = new Map<string, MasterPatient>();
  const usedMrns = new Set<string>();
  existingPatients.forEach(p => {
    const key = p.medicalRecordNumber.trim().toLowerCase();
    if (key) {
      existingByMrn.set(key, p);
      usedMrns.add(key);
    }
  });

  const seenInBatch = new Set<string>();
  const items: ParsedBulkPatientItem[] = [];
  let headerHasFrequencyCol = false;
  let headerHasShiftCol = false;

  lines.forEach((line, idx) => {
    const cols = splitDelimitedLine(line);

    // Detect header row on first non-empty line
    if (idx === 0) {
      const joinedHeader = cols.join(' ').toLowerCase();
      if (
        (joinedHeader.includes('no. rm') ||
          joinedHeader.includes('no rm') ||
          joinedHeader.includes('no_rm') ||
          joinedHeader.includes('rekam medis') ||
          joinedHeader.includes('mrn')) &&
        joinedHeader.includes('nama')
      ) {
        if ((cols[7] || '').toLowerCase().includes('frekuensi')) {
          headerHasFrequencyCol = true;
        }
        if ((cols[8] || '').toLowerCase().includes('shift')) {
          headerHasShiftCol = true;
        }
        return;
      }
      if (cols.length === 1 && (joinedHeader === 'nama pasien' || joinedHeader === 'nama')) {
        return;
      }
    }

    let mrn = '';
    let patientName = '';
    let ageRaw = '';
    let genderRaw = '';
    let dryWeightRaw = '';
    let accessRaw = '';
    let categoryRaw = '';
    let frequencyRaw = '';
    let dayOrScheduleRaw = '';
    let shiftRaw = '';
    let phoneRaw = '';

    if (cols.length === 1) {
      patientName = cols[0];
      mrn = generateNextMedicalRecordNumber(existingPatients, usedMrns);
    } else {
      const c0 = cols[0] || '';
      const c1 = cols[1] || '';
      const c0LooksLikeMrn = /^[a-z0-9-./]{3,16}$/i.test(c0) && /\d/.test(c0) && !/\s/.test(c0);
      const c1LooksLikeMrn = /^[a-z0-9-./]{3,16}$/i.test(c1) && /\d/.test(c1) && !/\s/.test(c1);

      if (!c0LooksLikeMrn && c1LooksLikeMrn) {
        patientName = c0;
        mrn = c1;
      } else {
        mrn = c0;
        patientName = c1;
      }
      ageRaw = cols[2] || '';
      genderRaw = cols[3] || '';
      dryWeightRaw = cols[4] || '';
      accessRaw = cols[5] || '';
      categoryRaw = cols[6] || '';

      const col7 = cols[7] || '';
      const col8 = cols[8] || '';
      const col9 = cols[9] || '';
      const col8LooksLikePhone = /^(\+62|62|08)\d{6,}$/.test(col8.replace(/[\s-]/g, ''));

      if (headerHasFrequencyCol || isStandaloneFrequencyToken(col7)) {
        frequencyRaw = col7;
        if (col8LooksLikePhone) {
          dayOrScheduleRaw = '';
          phoneRaw = col8;
        } else {
          dayOrScheduleRaw = col8;
          phoneRaw = col9;
        }
      } else if (headerHasShiftCol || isShiftOnlyToken(col8)) {
        dayOrScheduleRaw = col7;
        shiftRaw = col8;
        phoneRaw = col9;
      } else {
        dayOrScheduleRaw = col7;
        phoneRaw = col8;
      }

      if (!mrn) {
        mrn = generateNextMedicalRecordNumber(existingPatients, usedMrns);
      } else {
        usedMrns.add(mrn.trim().toLowerCase());
      }
    }

    const cleanName = patientName.trim();
    const cleanMrn = mrn.trim();

    const parsedAge = parseInt(ageRaw.replace(/[^\d]/g, ''), 10);
    const age =
      Number.isFinite(parsedAge) && parsedAge > 0 && parsedAge <= 120
        ? parsedAge
        : defaults.defaultAge ?? 52;

    const gClean = genderRaw.trim().toUpperCase();
    const gender: 'L' | 'P' =
      gClean === 'P' || gClean.startsWith('PEREMPUAN') || gClean === 'F' || gClean === 'WANITA'
        ? 'P'
        : gClean === 'L' || gClean.startsWith('LAKI') || gClean === 'M' || gClean === 'PRIA'
        ? 'L'
        : inferGenderFromIndonesianName(cleanName, defaults.defaultGender ?? 'L');

    const parsedDw = parseFloat(dryWeightRaw.replace(',', '.').replace(/[^\d.]/g, ''));
    const dryWeight =
      Number.isFinite(parsedDw) && parsedDw >= 15 && parsedDw <= 200
        ? Number(parsedDw.toFixed(1))
        : defaults.defaultDryWeight ?? 60.0;

    const vascularAccess = parseVascularAccessInput(
      accessRaw,
      defaults.defaultVascularAccess ?? 'av_fistula'
    );
    const category = parsePatientCategoryInput(
      categoryRaw,
      defaults.defaultCategory ?? 'reguler'
    );

    const fallbackDays: HdTreatmentDay[] =
      defaults.defaultTreatmentDays && defaults.defaultTreatmentDays.length > 0
        ? sortTreatmentDays(defaults.defaultTreatmentDays)
        : defaults.defaultTreatmentDay
        ? [defaults.defaultTreatmentDay]
        : defaults.defaultRoutineSchedule
        ? extractTreatmentDaysFromText(defaults.defaultRoutineSchedule)
        : defaults.defaultTreatmentFrequency
        ? HD_FREQUENCY_CATEGORIES.find(c => c.id === defaults.defaultTreatmentFrequency)
            ?.defaultDays || ['Senin']
        : ['Senin'];

    const extractedDays = sortTreatmentDays(extractTreatmentDaysFromText(dayOrScheduleRaw));
    const resolvedDays: HdTreatmentDay[] =
      extractedDays.length > 0 ? extractedDays : fallbackDays.length > 0 ? fallbackDays : ['Senin'];

    const resolvedShift: 'Pagi' | 'Siang' = shiftRaw
      ? extractTreatmentShiftFromText(shiftRaw, defaults.defaultShift ?? 'Pagi')
      : extractTreatmentShiftFromText(dayOrScheduleRaw, defaults.defaultShift ?? 'Pagi');

    const explicitFrequency =
      parseTreatmentFrequencyInput(frequencyRaw) ||
      (dayOrScheduleRaw ? parseTreatmentFrequencyInput(dayOrScheduleRaw) : undefined) ||
      defaults.defaultTreatmentFrequency;

    // Build clean routineSchedule: if dayOrScheduleRaw already contains parentheses/details, keep it,
    // otherwise format cleanly with resolvedDays + resolvedShift
    const cleanDayScheduleInput = dayOrScheduleRaw.trim();
    const isBareDayName =
      cleanDayScheduleInput.length > 0 &&
      !cleanDayScheduleInput.includes('(') &&
      !cleanDayScheduleInput.includes('·') &&
      !/\b(pagi|siang|sore|setiap|minggu ganjil|minggu genap|14 hari)\b/i.test(
        cleanDayScheduleInput
      );

    let resolvedSchedule: string;
    if (cleanDayScheduleInput && !isBareDayName) {
      resolvedSchedule = cleanDayScheduleInput;
    } else if (!cleanDayScheduleInput && defaults.defaultRoutineSchedule) {
      resolvedSchedule = defaults.defaultRoutineSchedule;
    } else if (!cleanDayScheduleInput && explicitFrequency === '1x_2minggu') {
      resolvedSchedule = getDefaultScheduleForFrequency('1x_2minggu');
    } else {
      resolvedSchedule = buildPatientDaySchedule({
        days: resolvedDays,
        shift: resolvedShift
      });
    }

    const mrnKey = cleanMrn.toLowerCase();
    const existingMatch = existingByMrn.get(mrnKey);
    const isDuplicateExisting = Boolean(existingMatch);
    const isDuplicateInBatch = seenInBatch.has(mrnKey);
    if (mrnKey) {
      seenInBatch.add(mrnKey);
    }

    let error: string | undefined;
    if (!cleanName) {
      error = 'Nama pasien kosong';
    } else if (!cleanMrn) {
      error = 'No. RM kosong';
    } else if (isDuplicateInBatch) {
      error = `No. RM ${cleanMrn} duplikat di dalam daftar input`;
    }

    const patientObj = normalizeMasterPatient({
      id: existingMatch?.id || `mp-bulk-${Date.now()}-${idx}`,
      medicalRecordNumber: cleanMrn,
      patientName: cleanName,
      age,
      gender,
      defaultStatus: defaults.defaultStatus ?? 'rajal',
      category,
      defaultVascularAccess: vascularAccess,
      defaultAccessSite: getDefaultAccessSiteForType(vascularAccess),
      defaultDialyzer: defaults.defaultDialyzer ?? 'SAS HF 18',
      defaultDryWeight: dryWeight,
      treatmentDays: resolvedDays,
      treatmentShift: resolvedShift,
      treatmentFrequency: explicitFrequency,
      routineSchedule: resolvedSchedule,
      contactPhone: phoneRaw.trim() || undefined
    });

    items.push({
      rowNumber: idx + 1,
      patient: patientObj,
      isDuplicateExisting,
      existingPatientId: existingMatch?.id,
      isDuplicateInBatch,
      error
    });
  });

  const validItems = items.filter(i => !i.error);
  const duplicateExistingCount = validItems.filter(i => i.isDuplicateExisting).length;
  const newCount = validItems.filter(i => !i.isDuplicateExisting).length;
  const errorCount = items.filter(i => Boolean(i.error)).length;

  return {
    items,
    validCount: validItems.length,
    newCount,
    duplicateExistingCount,
    errorCount
  };
}

/**
 * Parses multi-line text (pasted from Excel/Google Sheets/CSV or 1-per-line list)
 * into MasterNurse records with automatic unique login credentials.
 * Supported column order:
 *   1 col:  Nama Lengkap Perawat
 *   2+ cols: Nama Lengkap | NIP | Peran/Jabatan | Shift | Username | Email | Password | No. HP / Status Dinas
 */
export function parseBulkNursesText(
  rawText: string,
  existingNurses: MasterNurse[] = [],
  defaults: BulkNurseDefaults = {}
): BulkNurseParseResult {
  const lines = (rawText || '')
    .split(/\r?\n/)
    .filter(l => l.trim().length > 0 && !l.trim().startsWith('#'));

  if (lines.length === 0) {
    return {
      items: [],
      validCount: 0,
      newCount: 0,
      duplicateExistingCount: 0,
      errorCount: 0
    };
  }

  const emailDomain = defaults.emailDomain || 'happyland.co.id';
  const defaultPassword = defaults.defaultPassword || 'Dialisis2026!';

  const usedUsernames = new Set<string>(['admin']);
  const existingByUsername = new Map<string, MasterNurse>();
  const existingByEmail = new Map<string, MasterNurse>();
  const existingByNip = new Map<string, MasterNurse>();

  existingNurses.forEach(n => {
    if (n.username) {
      const u = n.username.trim().toLowerCase();
      usedUsernames.add(u);
      existingByUsername.set(u, n);
    }
    if (n.email) {
      existingByEmail.set(n.email.trim().toLowerCase(), n);
    }
    if (n.nip && n.nip.trim() && n.nip.trim() !== '-') {
      existingByNip.set(n.nip.replace(/\s+/g, '').toLowerCase(), n);
    }
  });

  const batchUsernames = new Set<string>();
  const items: ParsedBulkNurseItem[] = [];

  lines.forEach((line, idx) => {
    const cols = splitDelimitedLine(line);

    // Detect header row on first line
    if (idx === 0) {
      const joinedHeader = cols.join(' ').toLowerCase();
      if (
        joinedHeader.includes('nama') &&
        (joinedHeader.includes('nip') ||
          joinedHeader.includes('peran') ||
          joinedHeader.includes('jabatan') ||
          joinedHeader.includes('username'))
      ) {
        return;
      }
      if (cols.length === 1 && (joinedHeader === 'nama perawat' || joinedHeader === 'nama')) {
        return;
      }
    }

    const cleanName = (cols[0] || '').trim();
    const cleanNip = (cols[1] || '').trim();
    const roleRaw = cols[2] || '';
    const shiftRaw = cols[3] || '';
    const usernameRaw = (cols[4] || '').trim().replace(/^@/, '');
    const emailRaw = (cols[5] || '').trim();
    const passwordRaw = (cols[6] || '').trim();
    const col7Raw = (cols[7] || '').trim();
    const col8Raw = (cols[8] || '').trim();

    let phoneRaw = '';
    let isOnDutyToday = defaults.defaultIsOnDutyToday ?? true;

    const parseDutyToken = (token: string): boolean | undefined => {
      const t = token.trim().toLowerCase();
      if (!t) return undefined;
      if (t === 'off' || t === 'libur' || t === 'cuti' || t === 'tidak dinas' || t === 'false' || t === 'tidak') {
        return false;
      }
      if (t === 'dinas' || t === 'on' || t === 'hadir' || t === 'aktif' || t === 'true' || t === 'ya') {
        return true;
      }
      return undefined;
    };

    const col7Duty = parseDutyToken(col7Raw);
    const col8Duty = parseDutyToken(col8Raw);
    if (col7Duty !== undefined) {
      isOnDutyToday = col7Duty;
      if (col8Raw && col8Duty === undefined) {
        phoneRaw = col8Raw;
      }
    } else {
      phoneRaw = col7Raw;
      if (col8Duty !== undefined) {
        isOnDutyToday = col8Duty;
      }
    }

    const role = parseNurseRoleInput(roleRaw, defaults.defaultRole ?? 'perawat_pelaksana');
    const shiftAssigned = parseShiftInput(shiftRaw, defaults.defaultShift ?? 'Pagi');

    // Check if matches existing nurse by explicit username, email, or NIP
    const nipKey = cleanNip ? cleanNip.replace(/\s+/g, '').toLowerCase() : '';
    const existingMatch =
      (usernameRaw ? existingByUsername.get(usernameRaw.toLowerCase()) : undefined) ||
      (emailRaw ? existingByEmail.get(emailRaw.toLowerCase()) : undefined) ||
      (nipKey ? existingByNip.get(nipKey) : undefined);

    const username = usernameRaw
      ? usernameRaw.toLowerCase()
      : existingMatch?.username || generateUsernameFromNurseName(cleanName, usedUsernames);

    const email = emailRaw
      ? emailRaw.toLowerCase()
      : existingMatch?.email || `${username}@${emailDomain}`;

    const password = passwordRaw || existingMatch?.password || defaultPassword;

    const uKey = username.toLowerCase();
    const isDuplicateInBatch = batchUsernames.has(uKey);
    if (uKey) {
      batchUsernames.add(uKey);
      usedUsernames.add(uKey);
    }

    let error: string | undefined;
    if (!cleanName) {
      error = 'Nama perawat kosong';
    } else if (uKey === 'admin') {
      error = 'Username "admin" dicadangkan untuk Administrator';
    } else if (password.length < 3) {
      error = 'Password minimal 3 karakter';
    } else if (isDuplicateInBatch) {
      error = `Username @${username} duplikat di dalam daftar input`;
    }

    const nurseObj: MasterNurse = {
      id: existingMatch?.id || `nurse-bulk-${Date.now()}-${idx}`,
      name: cleanName,
      nip: cleanNip,
      role,
      systemAccess: role,
      username,
      email,
      password,
      accountStatus: 'aktif',
      pernefriCertified: defaults.defaultPernefriCertified ?? true,
      isOnDutyToday,
      shiftAssigned,
      phone: phoneRaw || undefined
    };

    items.push({
      rowNumber: idx + 1,
      nurse: nurseObj,
      isDuplicateExisting: Boolean(existingMatch),
      existingNurseId: existingMatch?.id,
      isDuplicateInBatch,
      error
    });
  });

  const validItems = items.filter(i => !i.error);
  const duplicateExistingCount = validItems.filter(i => i.isDuplicateExisting).length;
  const newCount = validItems.filter(i => !i.isDuplicateExisting).length;
  const errorCount = items.filter(i => Boolean(i.error)).length;

  return {
    items,
    validCount: validItems.length,
    newCount,
    duplicateExistingCount,
    errorCount
  };
}

export function buildPatientsCsvTemplate(): string {
  return [
    'No. RM,Nama Pasien,Usia,JK (L/P),BB Kering (kg),Akses Vaskular,Kategori,Hari HD,Shift HD,No. HP',
    '452101,Tn. Contoh Pasien 1,55,L,62.0,AVF,Reguler,Senin,Pagi,081200000001',
    '452102,Ny. Contoh Pasien 2,49,P,54.5,CDL,Reguler,Selasa,Pagi,081200000002',
    '452103,Tn. Contoh Pasien 3,63,L,58.0,AVF,Reguler,Rabu,Siang,081200000003'
  ].join('\n');
}

export function buildNursesCsvTemplate(): string {
  return [
    'Nama Lengkap,NIP,Peran (pelaksana/pj_shift/kepala_ruangan),Shift (Pagi/Siang/Malam),Username,Email,Password,No. HP',
    'Ns. Contoh Kepala Ruang S.Kep,198801012012012001,kepala_ruangan,Pagi,karu.hd,karu.hd@happyland.co.id,Dialisis2026!,081200000101',
    'Ns. Contoh PJ Shift S.Kep,199102022015021002,pj_shift,Pagi,pj.pagi,pj.pagi@happyland.co.id,Dialisis2026!,081200000102',
    'Ners Contoh Pelaksana S.Kep,199503032019032003,perawat_pelaksana,Pagi,pelaksana.1,pelaksana.1@happyland.co.id,Dialisis2026!,081200000103'
  ].join('\n');
}


