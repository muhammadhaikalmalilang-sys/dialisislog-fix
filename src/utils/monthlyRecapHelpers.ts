import {
  MasterNurse,
  OfficialNurseLogbookMonth,
  PatientHDSession,
  ShiftInfo,
  ShiftName,
  SystemAccessRole
} from '../types/dialysis.ts';
import type { NurseLogbookCloudData } from '../services/firebase.ts';
import { OFFICIAL_LOGBOOK_ITEMS } from '../data/officialPelaksanaLogbookData.ts';
import { getCurrentIndonesianFullDate, getWibDateParts, formatCurrentWibTimestamp } from './dateHelpers.ts';
import {
  PER_PATIENT_STATUS_STORAGE_KEY,
  ManagedPatientMinimal,
  LogbookVerificationRegistryEntry,
  buildPatientVerificationKey,
  extractBedCode,
  getNurseClinicalDetailsKey,
  getNurseManagedPatientsKey,
  getNurseMonthlySnapshotsKey,
  getNursePatientStatusesKey,
  getNursePatientSubmissionsKey,
  getNurseSubmissionKey,
  getNurseStorageKey,
  getNurseVerificationInfo,
  getVerificationRegistry,
  isKepalaRuangVerifier,
  isMatchingNurse,
  isSameBed,
  isSessionVerifiedByPj,
  readNurseFacilityStatuses
} from './nurseVerificationHelpers.ts';
import {
  PatientLogbookClinicalDetails,
  isPoin3_6Complete,
  normalizePatientClinicalDetails
} from './logbookClinicalHelpers.ts';

export interface ParsedLogbookDate {
  day: number; // 1..31
  month: number; // 1..12
  monthName: string;
  year: number;
  dateKey: string; // 'YYYY-MM-DD'
  daysInMonth: number;
}

export interface VerifiedDailySnapshot {
  dateKey: string; // 'YYYY-MM-DD'
  day: number;
  month: number;
  year: number;
  verifiedPatientCount: number;
  poin3_6MaxCount?: number;
  scores: Record<string, number>;
  verifiedBy?: string;
  verifiedByRole?: string;
  verifiedAt?: string;
  shift?: ShiftName;
}

export interface MonthlyItemSummaryStat {
  code: string;
  bagian: number;
  totalScore: number;
  maxScore: number;
  pct: number;
}

export interface StaffMonthlyRecapResult {
  logbook: OfficialNurseLogbookMonth;
  roleLabel: string;
  daysInMonth: number;
  verifiedDaysCount: number;
  totalVerifiedPatientsInMonth: number;
  unverifiedPatientsCount: number;
  totalManagedToday: number;
  itemStats: Record<string, MonthlyItemSummaryStat>;
  dailyTotalScores: (number | null)[];
  dailyMaxScores: (number | null)[];
  grandTotalScore: number;
  grandMaxScore: number;
  overallCompliancePct: number;
}

const INDONESIAN_MONTHS: { names: string[]; month: number; label: string }[] = [
  { names: ['januari', 'jan', 'january'], month: 1, label: 'Januari' },
  { names: ['februari', 'feb', 'february'], month: 2, label: 'Februari' },
  { names: ['maret', 'mar', 'march'], month: 3, label: 'Maret' },
  { names: ['april', 'apr'], month: 4, label: 'April' },
  { names: ['mei', 'may'], month: 5, label: 'Mei' },
  { names: ['juni', 'jun', 'june'], month: 6, label: 'Juni' },
  { names: ['juli', 'jul', 'july'], month: 7, label: 'Juli' },
  { names: ['agustus', 'agu', 'agt', 'aug', 'august'], month: 8, label: 'Agustus' },
  { names: ['september', 'sep', 'sept'], month: 9, label: 'September' },
  { names: ['oktober', 'okt', 'oct', 'october'], month: 10, label: 'Oktober' },
  { names: ['november', 'nov'], month: 11, label: 'November' },
  { names: ['desember', 'des', 'dec', 'december'], month: 12, label: 'Desember' }
];

export function getMonthLabel(month: number): string {
  return INDONESIAN_MONTHS.find((m) => m.month === month)?.label || 'Oktober';
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Parses Indonesian clinical logbook date strings such as:
 * - "Selasa, 20 Oktober 2026, 14:15 WIB"
 * - "20 Okt 2026 14:05 WIB"
 * - "2026-10-20T14:15:00.000Z"
 */
export function parseIndonesianLogbookDate(
  dateStr?: string,
  fallbackDateStr: string = getCurrentIndonesianFullDate()
): ParsedLogbookDate {
  const tryParseSingle = (raw?: string): ParsedLogbookDate | null => {
    if (!raw || !raw.trim()) return null;
    const text = raw.trim();

    // 1. Match "<day> <MonthName> <year>" e.g. "20 Oktober 2026" or "20 Okt 2026"
    const namedMatch = text.match(/(\d{1,2})\s+([a-zA-Z]+)\.?\s+(\d{4})/);
    if (namedMatch) {
      const dayNum = parseInt(namedMatch[1], 10);
      const monthToken = namedMatch[2].toLowerCase();
      const yearNum = parseInt(namedMatch[3], 10);
      const foundMonth = INDONESIAN_MONTHS.find((m) =>
        m.names.some((alias) => monthToken === alias || monthToken.startsWith(alias))
      );
      if (foundMonth && dayNum >= 1 && dayNum <= 31 && yearNum >= 2000 && yearNum <= 2100) {
        const daysInMonth = getDaysInMonth(yearNum, foundMonth.month);
        const clampedDay = Math.min(dayNum, daysInMonth);
        const dateKey = `${yearNum}-${String(foundMonth.month).padStart(2, '0')}-${String(
          clampedDay
        ).padStart(2, '0')}`;
        return {
          day: clampedDay,
          month: foundMonth.month,
          monthName: foundMonth.label,
          year: yearNum,
          dateKey,
          daysInMonth
        };
      }
    }

    // 2. Match ISO format "YYYY-MM-DD"
    const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const yearNum = parseInt(isoMatch[1], 10);
      const monthNum = parseInt(isoMatch[2], 10);
      const dayNum = parseInt(isoMatch[3], 10);
      if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
        const daysInMonth = getDaysInMonth(yearNum, monthNum);
        const clampedDay = Math.min(dayNum, daysInMonth);
        const monthName = getMonthLabel(monthNum);
        const dateKey = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(
          clampedDay
        ).padStart(2, '0')}`;
        return {
          day: clampedDay,
          month: monthNum,
          monthName,
          year: yearNum,
          dateKey,
          daysInMonth
        };
      }
    }

    return null;
  };

  const primary = tryParseSingle(dateStr);
  if (primary) return primary;

  const fallback = tryParseSingle(fallbackDateStr);
  if (fallback) return fallback;

  const liveWib = getWibDateParts();
  return {
    day: liveWib.day,
    month: liveWib.month,
    monthName: liveWib.monthName,
    year: liveWib.year,
    dateKey: liveWib.isoDate,
    daysInMonth: getDaysInMonth(liveWib.year, liveWib.month)
  };
}

function resolveParsedDateFromCandidates(
  candidates: Array<string | undefined>,
  fallbackDateStr: string
): ParsedLogbookDate {
  for (const candidate of candidates) {
    if (candidate && candidate.trim()) {
      // Only accept candidate if it actually contains a parseable date (named month or YYYY-MM-DD)
      if (/(\d{1,2})\s+([a-zA-Z]+)\.?\s+(\d{4})/.test(candidate) || /(\d{4})-(\d{2})-(\d{2})/.test(candidate)) {
        return parseIndonesianLogbookDate(candidate, fallbackDateStr);
      }
    }
  }
  return parseIndonesianLogbookDate(undefined, fallbackDateStr);
}

/**
 * Pure scoring engine for a single verified working day:
 * - Poin 1.1..1.3: Bernilai 1 jika dikerjakan, 0 jika tidak (maksimal 1 per hari karena aktivitas 1x sehari).
 * - Poin 2.1..3.5 & 4.1..6.5: Nilainya mengikuti jumlah pasien kelolaan terverifikasi yang dikerjakan pada poin tersebut.
 * - Poin 3.6 (Akses Vaskular): Nilainya & MAKS-nya mengikuti jumlah aktual pasien terverifikasi yang dilakukan
 *   aksesing vaskular oleh perawat tersebut (baik pasien kelolaan sendiri maupun pasien kelolaan perawat lain).
 */
export function computeDailySpoScoresFromVerifiedLogbook(
  facilityStatuses: Record<string, boolean>,
  verifiedPatientsChecks: Array<Record<string, boolean>>,
  poin3_6Options?: {
    ownPoin3_6Scores?: boolean[];
    crossNursePoin3_6Scores?: boolean[];
  }
): { verifiedPatientCount: number; poin3_6MaxCount: number; scores: Record<string, number> } | null {
  const ownChecks = verifiedPatientsChecks || [];
  const ownCount = ownChecks.length;
  const hasCustomPoin3_6 = Boolean(
    poin3_6Options &&
      (poin3_6Options.ownPoin3_6Scores !== undefined ||
        poin3_6Options.crossNursePoin3_6Scores !== undefined)
  );
  const ownPoin3_6List =
    poin3_6Options?.ownPoin3_6Scores ??
    ownChecks.map((patChecks) => Boolean(patChecks && patChecks['3.6']));
  const crossPoin3_6List = poin3_6Options?.crossNursePoin3_6Scores ?? [];
  const poin3_6MaxCount = ownPoin3_6List.length + crossPoin3_6List.length;

  if (ownCount === 0 && poin3_6MaxCount === 0) {
    return null;
  }

  const scores: Record<string, number> = {};

  OFFICIAL_LOGBOOK_ITEMS.forEach((item) => {
    if (item.code === '3.6') {
      if (hasCustomPoin3_6) {
        const ownDone = ownPoin3_6List.reduce((sum, ok) => sum + (ok ? 1 : 0), 0);
        const crossDone = crossPoin3_6List.reduce((sum, ok) => sum + (ok ? 1 : 0), 0);
        scores['3.6'] = ownDone + crossDone;
      } else {
        scores['3.6'] = ownChecks.reduce(
          (sum, patChecks) => sum + (patChecks && patChecks['3.6'] ? 1 : 0),
          0
        );
      }
    } else if (ownCount === 0) {
      scores[item.code] = 0;
    } else if (item.bagian === 1) {
      scores[item.code] = facilityStatuses[item.code] ? 1 : 0;
    } else {
      const completedPatientsCount = ownChecks.reduce(
        (sum, patChecks) => sum + (patChecks && patChecks[item.code] ? 1 : 0),
        0
      );
      scores[item.code] = completedPatientsCount;
    }
  });

  return {
    verifiedPatientCount: ownCount,
    poin3_6MaxCount,
    scores
  };
}

/**
 * Checks whether a verification record satisfies the role rules for the staff member:
 * - Perawat Pelaksana: diverifikasi oleh PJ Shift atau Kepala Ruang.
 * - PJ Shift: diverifikasi oleh Kepala Ruang atau PJ Shift lainnya (bukan diri sendiri).
 * - Kepala Ruang: diverifikasi oleh PJ Shift atau Kepala Ruang.
 */
export function isVerificationEligibleForStaffRole(params: {
  staffName: string;
  staffRole: SystemAccessRole;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedByRole?: string;
}): boolean {
  const { staffName, staffRole, isVerified, verifiedBy, verifiedByRole } = params;
  if (!isVerified) return false;

  const byKaru = isKepalaRuangVerifier(verifiedByRole, verifiedBy);

  if (staffRole === 'pj_shift') {
    if (byKaru) return true;
    // Verified by PJ Shift lainnya -> block self-verification
    if (verifiedBy && isMatchingNurse(verifiedBy, staffName)) {
      return false;
    }
    return true;
  }

  // Perawat Pelaksana & Kepala Ruang: valid when verified by PJ Shift or Kepala Ruang
  return true;
}

export function formatStaffRoleTitle(role?: SystemAccessRole): string {
  if (role === 'kepala_ruangan') return 'Kepala Ruang';
  if (role === 'pj_shift') return 'Penanggung Jawab (PJ) Shift';
  return 'Perawat Pelaksana';
}

function readStoredMonthlySnapshots(nurseName: string): Record<string, VerifiedDailySnapshot> {
  if (typeof window === 'undefined' || !window.localStorage || !nurseName || nurseName === '-') {
    return {};
  }
  try {
    const raw = localStorage.getItem(getNurseMonthlySnapshotsKey(nurseName));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, VerifiedDailySnapshot>;
      }
    }
  } catch {
    // ignore
  }
  return {};
}

function writeStoredMonthlySnapshots(
  nurseName: string,
  snapshots: Record<string, VerifiedDailySnapshot>
): void {
  if (typeof window === 'undefined' || !window.localStorage || !nurseName || nurseName === '-') {
    return;
  }
  try {
    localStorage.setItem(getNurseMonthlySnapshotsKey(nurseName), JSON.stringify(snapshots));
  } catch {
    // ignore
  }
}

interface ResolvedStaffPatientsVerification {
  totalManagedCount: number;
  unverifiedCount: number;
  verifiedSnapshotsByDate: Record<string, VerifiedDailySnapshot>;
}

/**
 * Resolves live managed patients, checks verification eligibility per patient,
 * and groups verified patient SPO checklists by calendar date ('YYYY-MM-DD').
 */
export function resolveLiveStaffVerifiedSnapshots(params: {
  nurseName: string;
  userRole: SystemAccessRole;
  shiftInfo?: ShiftInfo;
  sessions?: PatientHDSession[];
  masterNurses?: MasterNurse[];
  cloudNurseLogbooks?: NurseLogbookCloudData[];
  overrideManagedPatients?: ManagedPatientMinimal[];
  overridePatientStatuses?: Record<string, Record<string, boolean>>;
  overrideFacilityStatuses?: Record<string, boolean>;
  overrideClinicalDetails?: Record<string, Partial<PatientLogbookClinicalDetails>>;
  overridePerPatientRecords?: Record<
    string,
    {
      status: string;
      verifiedAt?: string;
      verifiedBy?: string;
      verifiedByRole?: string;
    }
  >;
}): ResolvedStaffPatientsVerification {
  const {
    nurseName,
    userRole,
    shiftInfo,
    sessions = [],
    masterNurses = [],
    cloudNurseLogbooks = [],
    overrideManagedPatients,
    overridePatientStatuses,
    overrideFacilityStatuses,
    overrideClinicalDetails,
    overridePerPatientRecords
  } = params;

  if (!nurseName || nurseName === '-') {
    return {
      totalManagedCount: 0,
      unverifiedCount: 0,
      verifiedSnapshotsByDate: {}
    };
  }

  const fallbackDateStr = shiftInfo?.date || getCurrentIndonesianFullDate();
  const allRegistryEntries = getVerificationRegistry();
  const ownCloudLogbook = cloudNurseLogbooks.find((lb) =>
    isMatchingNurse(lb.nurseName, nurseName)
  );

  // Read per-patient submissions key in localStorage
  let perNursePatientSubmissions: Record<string, any> = {};
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem(getNursePatientSubmissionsKey(nurseName));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          perNursePatientSubmissions = parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  // Read nurse's overarching submission object in localStorage
  let nurseSubmissionObj: any = null;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem(getNurseSubmissionKey(nurseName));
      if (raw) {
        nurseSubmissionObj = JSON.parse(raw);
      }
    } catch {
      // ignore
    }
  }

  // 1. Gather all registry entries for this nurse across all shifts & dates
  const nurseRegistryEntries = allRegistryEntries.filter((e) =>
    isMatchingNurse(e.submittedNurseName, nurseName)
  );
  const latestRegEntry = nurseRegistryEntries[0];

  // 2. Read managed patients list for this staff member
  let managedList: ManagedPatientMinimal[] = [];
  if (overrideManagedPatients) {
    managedList = overrideManagedPatients;
  } else if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const rawManaged = localStorage.getItem(getNurseManagedPatientsKey(nurseName));
      if (rawManaged) {
        const parsed = JSON.parse(rawManaged);
        if (Array.isArray(parsed) && parsed.length > 0) {
          managedList = parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  // 3. Collect and merge patients from managedList, all registry entries, cloud logbook, and sessions
  const nurseSessions = sessions.filter((s) => isMatchingNurse(s.nurseInCharge, nurseName));
  const combinedPatients: Array<{
    id?: string;
    bedNumber: string;
    patientName: string;
    medicalRecord?: string;
    dateHint?: string;
    matchedSession?: PatientHDSession;
    fromRegistryEntry?: LogbookVerificationRegistryEntry;
    fromRegistryPatient?: ManagedPatientMinimal;
  }> = [];

  const addPatientCandidate = (item: {
    id?: string;
    bedNumber: string;
    patientName: string;
    medicalRecord?: string;
    dateHint?: string;
    matchedSession?: PatientHDSession;
    fromRegistryEntry?: LogbookVerificationRegistryEntry;
    fromRegistryPatient?: ManagedPatientMinimal;
  }) => {
    const cleanBed = extractBedCode(item.bedNumber);
    const cleanRm = (item.medicalRecord || '').trim().toLowerCase();
    const cleanName = (item.patientName || '').trim().toLowerCase();
    const itemDate = item.dateHint || item.matchedSession?.sessionDate || item.fromRegistryEntry?.dateKey;

    const existingIndex = combinedPatients.findIndex((cp) => {
      const cpDate = cp.dateHint || cp.matchedSession?.sessionDate || cp.fromRegistryEntry?.dateKey;
      const sameDate = !cpDate || !itemDate || cpDate === itemDate;
      if (!sameDate) return false;

      const cpRm = (cp.medicalRecord || '').trim().toLowerCase();
      if (cleanRm && cpRm && cleanRm === cpRm) return true;

      const cpBed = extractBedCode(cp.bedNumber);
      if (cleanBed && cpBed && cleanBed === cpBed) return true;

      const cpName = (cp.patientName || '').trim().toLowerCase();
      if (cleanName && cpName && cleanName === cpName) return true;

      return false;
    });

    if (existingIndex >= 0) {
      const existing = combinedPatients[existingIndex];
      if (!existing.matchedSession && item.matchedSession) existing.matchedSession = item.matchedSession;
      if (!existing.fromRegistryEntry && item.fromRegistryEntry) existing.fromRegistryEntry = item.fromRegistryEntry;
      if (!existing.fromRegistryPatient && item.fromRegistryPatient) existing.fromRegistryPatient = item.fromRegistryPatient;
      if (!existing.dateHint && itemDate) existing.dateHint = itemDate;
      if (!existing.medicalRecord && item.medicalRecord) existing.medicalRecord = item.medicalRecord;
    } else {
      combinedPatients.push(item);
    }
  };

  // Add patients from managedList
  managedList.forEach((mp) => {
    const cleanRm = mp.medicalRecord?.trim();
    const cleanName = mp.patientName?.trim().toLowerCase();
    const matchedSession = nurseSessions.find((s) => {
      if (cleanRm && s.medicalRecordNumber?.trim() === cleanRm) return true;
      if (isSameBed(s.bedNumber, mp.bedNumber)) return true;
      if (cleanName && s.patientName.trim().toLowerCase() === cleanName) return true;
      return false;
    });
    const matchedReg = nurseRegistryEntries.find((re) =>
      re.patients?.some(
        (rp) =>
          (mp.id && rp.id === mp.id) ||
          (cleanRm && rp.medicalRecord?.trim() === cleanRm) ||
          isSameBed(rp.bedNumber, mp.bedNumber)
      )
    );
    const matchedRegPat = matchedReg?.patients?.find(
      (rp) =>
        (mp.id && rp.id === mp.id) ||
        (cleanRm && rp.medicalRecord?.trim() === cleanRm) ||
        isSameBed(rp.bedNumber, mp.bedNumber)
    );
    addPatientCandidate({
      id: mp.id,
      bedNumber: mp.bedNumber,
      patientName: mp.patientName,
      medicalRecord: mp.medicalRecord || matchedSession?.medicalRecordNumber,
      dateHint: matchedReg?.dateKey || matchedSession?.sessionDate,
      matchedSession,
      fromRegistryEntry: matchedReg || latestRegEntry,
      fromRegistryPatient: matchedRegPat
    });
  });

  // Add patients from all registry entries
  nurseRegistryEntries.forEach((re) => {
    if (Array.isArray(re.patients)) {
      re.patients.forEach((rp) => {
        const cleanRm = rp.medicalRecord?.trim();
        const cleanName = rp.patientName?.trim().toLowerCase();
        const matchedSession = nurseSessions.find((s) => {
          if (cleanRm && s.medicalRecordNumber?.trim() === cleanRm) return true;
          if (isSameBed(s.bedNumber, rp.bedNumber)) return true;
          if (cleanName && s.patientName.trim().toLowerCase() === cleanName) return true;
          return false;
        });
        addPatientCandidate({
          id: rp.id,
          bedNumber: rp.bedNumber,
          patientName: rp.patientName,
          medicalRecord: rp.medicalRecord || matchedSession?.medicalRecordNumber,
          dateHint: re.dateKey,
          matchedSession,
          fromRegistryEntry: re,
          fromRegistryPatient: rp
        });
      });
    }
  });

  // Add patients from cloud nurse logbook
  if (Array.isArray(ownCloudLogbook?.managedPatients)) {
    ownCloudLogbook.managedPatients.forEach((cp) => {
      const cleanRm = cp.medicalRecord?.trim();
      const cleanName = cp.patientName?.trim().toLowerCase();
      const matchedSession = nurseSessions.find((s) => {
        if (cleanRm && s.medicalRecordNumber?.trim() === cleanRm) return true;
        if (isSameBed(s.bedNumber, cp.bedNumber)) return true;
        if (cleanName && s.patientName.trim().toLowerCase() === cleanName) return true;
        return false;
      });
      addPatientCandidate({
        id: cp.id,
        bedNumber: cp.bedNumber,
        patientName: cp.patientName,
        medicalRecord: cp.medicalRecord || matchedSession?.medicalRecordNumber,
        dateHint: ownCloudLogbook.dateIso,
        matchedSession,
        fromRegistryEntry: latestRegEntry
      });
    });
  }

  // Add remaining sessions belonging to this nurse
  nurseSessions.forEach((s) => {
    addPatientCandidate({
      id: s.id,
      bedNumber: s.bedNumber,
      patientName: s.patientName,
      medicalRecord: s.medicalRecordNumber,
      dateHint: s.sessionDate,
      matchedSession: s,
      fromRegistryEntry: latestRegEntry
    });
  });

  // 4. Read SPO statuses (Bagian I & Bagian II-VI) and clinical details (for Poin 3.6 vascularAccessNurse)
  const facilityStatuses =
    overrideFacilityStatuses ??
    ownCloudLogbook?.facilityStatuses ??
    readNurseFacilityStatuses(nurseName);

  let patientStatusesMap: Record<string, Record<string, boolean>> = {};
  if (overridePatientStatuses) {
    patientStatusesMap = overridePatientStatuses;
  } else {
    if (ownCloudLogbook?.patientStatuses && typeof ownCloudLogbook.patientStatuses === 'object') {
      patientStatusesMap = { ...ownCloudLogbook.patientStatuses };
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const rawStat = localStorage.getItem(getNursePatientStatusesKey(nurseName));
        if (rawStat) {
          const parsed = JSON.parse(rawStat);
          if (parsed && typeof parsed === 'object') {
            patientStatusesMap = { ...patientStatusesMap, ...parsed };
          }
        }
      } catch {
        // ignore
      }
    }
  }

  let ownClinicalDetailsMap: Record<string, unknown> = {};
  if (overrideClinicalDetails) {
    ownClinicalDetailsMap = overrideClinicalDetails;
  } else {
    if (ownCloudLogbook?.clinicalDetails && typeof ownCloudLogbook.clinicalDetails === 'object') {
      ownClinicalDetailsMap = { ...ownCloudLogbook.clinicalDetails };
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const rawClin = localStorage.getItem(getNurseClinicalDetailsKey(nurseName));
        if (rawClin) {
          const parsed = JSON.parse(rawClin);
          if (parsed && typeof parsed === 'object') {
            ownClinicalDetailsMap = { ...ownClinicalDetailsMap, ...parsed };
          }
        }
      } catch {
        // ignore
      }
    }
  }

  // 5. Read per-patient verification overrides
  let perPatMap: Record<
    string,
    {
      status: string;
      verifiedAt?: string;
      verifiedBy?: string;
      verifiedByRole?: string;
      revisionRequested?: boolean;
    }
  > = {};
  if (overridePerPatientRecords) {
    perPatMap = overridePerPatientRecords;
  } else if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const rawPerPat = localStorage.getItem(PER_PATIENT_STATUS_STORAGE_KEY);
      if (rawPerPat) {
        const parsed = JSON.parse(rawPerPat);
        if (parsed && typeof parsed === 'object') {
          perPatMap = parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  const nurseVerifInfo = getNurseVerificationInfo(nurseName, masterNurses);

  // Resolve target staff role from masterNurses to avoid viewer role interference
  const matchedTargetNurse = masterNurses.find((n) => isMatchingNurse(n.name, nurseName));
  const effectiveStaffRole: SystemAccessRole =
    matchedTargetNurse?.systemAccess ||
    (matchedTargetNurse?.role === 'kepala_ruangan'
      ? 'kepala_ruangan'
      : matchedTargetNurse?.role === 'pj_shift'
      ? 'pj_shift'
      : 'perawat_pelaksana');

  const groupedByDate: Record<
    string,
    {
      parsedDate: ParsedLogbookDate;
      checksList: Array<Record<string, boolean>>;
      ownPoin3_6Scores: boolean[];
      crossNursePoin3_6Scores: boolean[];
      verifiedBy?: string;
      verifiedByRole?: string;
      verifiedAt?: string;
    }
  > = {};

  const ensureDateGroup = (
    parsedDate: ParsedLogbookDate,
    meta?: { verifiedBy?: string; verifiedByRole?: string; verifiedAt?: string }
  ) => {
    if (!groupedByDate[parsedDate.dateKey]) {
      groupedByDate[parsedDate.dateKey] = {
        parsedDate,
        checksList: [],
        ownPoin3_6Scores: [],
        crossNursePoin3_6Scores: [],
        verifiedBy: meta?.verifiedBy,
        verifiedByRole: meta?.verifiedByRole,
        verifiedAt: meta?.verifiedAt
      };
    } else if (meta) {
      const g = groupedByDate[parsedDate.dateKey];
      if (!g.verifiedBy && meta.verifiedBy) g.verifiedBy = meta.verifiedBy;
      if (!g.verifiedByRole && meta.verifiedByRole) g.verifiedByRole = meta.verifiedByRole;
      if (!g.verifiedAt && meta.verifiedAt) g.verifiedAt = meta.verifiedAt;
    }
    return groupedByDate[parsedDate.dateKey];
  };

  let verifiedCountTotal = 0;

  combinedPatients.forEach((pat) => {
    const sessionDateCandidate =
      pat.dateHint || pat.matchedSession?.sessionDate || pat.fromRegistryEntry?.dateKey;
    const kDated = sessionDateCandidate
      ? buildPatientVerificationKey(nurseName, pat.bedNumber, pat.medicalRecord, sessionDateCandidate)
      : '';
    const kExact = buildPatientVerificationKey(nurseName, pat.bedNumber, pat.medicalRecord);
    const kNoRm = buildPatientVerificationKey(nurseName, pat.bedNumber, '0');
    const perPatRec = (kDated ? perPatMap[kDated] : undefined) || perPatMap[kExact] || perPatMap[kNoRm];

    // Check per-patient submission in localStorage
    const pSubLookupKey = pat.id || pat.bedNumber;
    const patSubRecord = perNursePatientSubmissions[pSubLookupKey] || perNursePatientSubmissions[pat.bedNumber];

    // Check registry patient
    const regPat = pat.fromRegistryPatient;
    const regEntry = pat.fromRegistryEntry;

    // Check cloud patient submission
    const cloudPatSub =
      ownCloudLogbook?.patientSubmissions?.[pat.id || ''] ||
      ownCloudLogbook?.patientSubmissions?.[pat.bedNumber];

    // Active revision flag
    const isRevision = Boolean(
      perPatRec?.revisionRequested ||
        patSubRecord?.revisionRequested ||
        regPat?.revisionRequested ||
        cloudPatSub?.revisionRequested ||
        (pat.matchedSession?.revisionRequested && pat.matchedSession?.verificationStatus === 'belum_diajukan')
    );

    // Multi-source verification resolution
    const perPatIsVerified = perPatRec?.status === 'terverifikasi';
    const patSubIsVerified = patSubRecord?.status === 'terverifikasi';
    const regPatIsVerified =
      regPat?.status === 'terverifikasi' ||
      (regEntry?.status === 'terverifikasi' && regPat?.status !== 'belum_diajukan');
    const cloudPatIsVerified =
      cloudPatSub?.status === 'terverifikasi' ||
      (ownCloudLogbook?.submission?.status === 'terverifikasi' && cloudPatSub?.status !== 'belum_diajukan');
    const sessionIsVerified =
      pat.matchedSession?.verificationStatus === 'terverifikasi' ||
      pat.matchedSession?.isVerifiedByPj === true ||
      pat.matchedSession?.isVerifiedByKepalaRuang === true;
    const nurseWideIsVerified = nurseVerifInfo.isVerified;
    const nurseSubmissionIsVerified = nurseSubmissionObj?.status === 'terverifikasi';

    let isVerified = false;
    let verifiedBy: string | undefined;
    let verifiedByRole: string | undefined;
    let verifiedAt: string | undefined;

    if (!isRevision && (perPatIsVerified || patSubIsVerified || regPatIsVerified || cloudPatIsVerified || sessionIsVerified || nurseWideIsVerified || nurseSubmissionIsVerified)) {
      isVerified = true;
      verifiedBy =
        perPatRec?.verifiedBy ||
        patSubRecord?.verifiedBy ||
        regPat?.verifiedBy ||
        pat.matchedSession?.verifiedBy ||
        regEntry?.verifiedBy ||
        cloudPatSub?.verifiedBy ||
        ownCloudLogbook?.submission?.verifiedBy ||
        nurseSubmissionObj?.verifiedBy ||
        nurseVerifInfo.verifiedBy ||
        'PJ Shift / Ka. Ruang';
      verifiedByRole =
        perPatRec?.verifiedByRole ||
        patSubRecord?.verifiedByRole ||
        regPat?.verifiedByRole ||
        pat.matchedSession?.verifiedByRole ||
        regEntry?.verifiedByRole ||
        cloudPatSub?.verifiedByRole ||
        ownCloudLogbook?.submission?.verifiedByRole ||
        nurseSubmissionObj?.verifiedByRole ||
        nurseVerifInfo.verifiedByRole ||
        'PJ Shift';
      verifiedAt =
        perPatRec?.verifiedAt ||
        patSubRecord?.verifiedAt ||
        regPat?.verifiedAt ||
        pat.matchedSession?.verifiedAt ||
        regEntry?.verifiedAt ||
        cloudPatSub?.verifiedAt ||
        ownCloudLogbook?.submission?.verifiedAt ||
        nurseSubmissionObj?.verifiedAt ||
        nurseVerifInfo.verifiedAt ||
        formatCurrentWibTimestamp(regEntry?.dateLabel || shiftInfo?.date);
    }

    const eligible = isVerificationEligibleForStaffRole({
      staffName: nurseName,
      staffRole: effectiveStaffRole,
      isVerified,
      verifiedBy,
      verifiedByRole
    });

    if (!eligible) return;

    verifiedCountTotal++;

    // Resolve SPO checklist map for this verified patient
    let resolvedChecks: Record<string, boolean> | undefined =
      (pat.id ? patientStatusesMap[pat.id] : undefined) ||
      patientStatusesMap[pat.bedNumber] ||
      (pat.matchedSession?.id ? patientStatusesMap[pat.matchedSession.id] : undefined);

    const matchedMp = managedList.find(
      (mp) =>
        (mp.medicalRecord &&
          pat.medicalRecord &&
          mp.medicalRecord.trim() === pat.medicalRecord.trim()) ||
        isSameBed(mp.bedNumber, pat.bedNumber)
    );

    if (!resolvedChecks && matchedMp?.id && patientStatusesMap[matchedMp.id]) {
      resolvedChecks = patientStatusesMap[matchedMp.id];
    }

    // Resolve clinical detail & actual Poin 3.6 vascular accessing performer
    const rawPatClin =
      (pat.id ? ownClinicalDetailsMap[pat.id] : undefined) ||
      ownClinicalDetailsMap[pat.bedNumber] ||
      (pat.matchedSession?.id ? ownClinicalDetailsMap[pat.matchedSession.id] : undefined) ||
      (matchedMp?.id ? ownClinicalDetailsMap[matchedMp.id] : undefined);

    const normPatClin = rawPatClin ? normalizePatientClinicalDetails(rawPatClin) : undefined;
    const vascNurseFromClin = (normPatClin?.poin3_6.vascularAccessNurse || '').trim();
    const vascNurseFromSession = (
      pat.matchedSession?.vascularAccessNurse ||
      pat.matchedSession?.bagian3?.vascularAccessNurse ||
      ''
    ).trim();
    const effectiveVascNurse = vascNurseFromClin || vascNurseFromSession;
    const performedBySelf =
      !effectiveVascNurse || isMatchingNurse(effectiveVascNurse, nurseName);

    const poin3_6Done =
      resolvedChecks && typeof resolvedChecks['3.6'] === 'boolean'
        ? resolvedChecks['3.6']
        : typeof pat.matchedSession?.poin3_6Completed === 'boolean'
        ? pat.matchedSession.poin3_6Completed
        : normPatClin
        ? isPoin3_6Complete(normPatClin.poin3_6)
        : true;

    // Fallback: If resolvedChecks has no entries for a verified patient, provide default true for standard dialysis SPO
    if (!resolvedChecks || Object.keys(resolvedChecks).length === 0) {
      const fullFallback: Record<string, boolean> = {};
      OFFICIAL_LOGBOOK_ITEMS.filter((it) => it.bagian >= 2 && it.bagian <= 6).forEach((it) => {
        fullFallback[it.code] = it.code === '3.6' ? poin3_6Done : true;
      });
      resolvedChecks = fullFallback;
    }

    const parsedDate = resolveParsedDateFromCandidates(
      [
        pat.dateHint,
        regEntry?.dateKey,
        pat.matchedSession?.sessionDate,
        ownCloudLogbook?.dateIso,
        ownCloudLogbook?.logbookDate,
        regEntry?.dateLabel,
        pat.matchedSession?.date,
        regEntry?.submittedAt,
        verifiedAt
      ],
      fallbackDateStr
    );

    const group = ensureDateGroup(parsedDate, { verifiedBy, verifiedByRole, verifiedAt });
    group.checksList.push(resolvedChecks || {});
    if (performedBySelf) {
      group.ownPoin3_6Scores.push(poin3_6Done);
    }
  });

  // 4. Cross-nurse Poin 3.6 aggregation:
  // Credit this staff member for verified patients managed by OTHER nurses where vascularAccessNurse === nurseName.
  const seenCrossPatients = new Set<string>();
  const buildCrossPatientDedupKey = (
    ownerNurse: string,
    dateKey: string,
    bedNumber?: string,
    medicalRecord?: string,
    patientName?: string
  ): string => {
    const cleanRm = (medicalRecord || '').trim().toLowerCase();
    const bedCode = extractBedCode(bedNumber || '');
    const cleanName = (patientName || '').trim().toLowerCase();
    const patIdent = cleanRm
      ? `rm:${cleanRm}`
      : bedCode
      ? `bed:${bedCode}`
      : `name:${cleanName}`;
    return `${getNurseStorageKey(ownerNurse)}__${dateKey}__${patIdent}`;
  };

  const resolveOwnerRole = (ownerNurse: string): SystemAccessRole => {
    const fromReg = allRegistryEntries.find((e) =>
      isMatchingNurse(e.submittedNurseName, ownerNurse)
    );
    if (fromReg?.submittedNurseRole) return fromReg.submittedNurseRole;
    const fromMaster = masterNurses.find((n) => isMatchingNurse(n.name, ownerNurse));
    if (fromMaster?.systemAccess) return fromMaster.systemAccess;
    if (fromMaster?.role === 'kepala_ruangan') return 'kepala_ruangan';
    if (fromMaster?.role === 'pj_shift') return 'pj_shift';
    return 'perawat_pelaksana';
  };

  const readOtherNurseClinAndStatuses = (ownerNurse: string) => {
    const cloudDoc = cloudNurseLogbooks.find((lb) => isMatchingNurse(lb.nurseName, ownerNurse));
    let clinMap: Record<string, unknown> =
      cloudDoc?.clinicalDetails && typeof cloudDoc.clinicalDetails === 'object'
        ? { ...cloudDoc.clinicalDetails }
        : {};
    let statMap: Record<string, Record<string, boolean>> =
      cloudDoc?.patientStatuses && typeof cloudDoc.patientStatuses === 'object'
        ? { ...cloudDoc.patientStatuses }
        : {};
    let managed: ManagedPatientMinimal[] = Array.isArray(cloudDoc?.managedPatients)
      ? cloudDoc.managedPatients
      : [];

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const rawClin = localStorage.getItem(getNurseClinicalDetailsKey(ownerNurse));
        if (rawClin) {
          const parsed = JSON.parse(rawClin);
          if (parsed && typeof parsed === 'object') {
            clinMap = { ...clinMap, ...parsed };
          }
        }
      } catch {
        // ignore
      }
      try {
        const rawStat = localStorage.getItem(getNursePatientStatusesKey(ownerNurse));
        if (rawStat) {
          const parsed = JSON.parse(rawStat);
          if (parsed && typeof parsed === 'object') {
            statMap = { ...statMap, ...parsed };
          }
        }
      } catch {
        // ignore
      }
      try {
        const rawManaged = localStorage.getItem(getNurseManagedPatientsKey(ownerNurse));
        if (rawManaged) {
          const parsed = JSON.parse(rawManaged);
          if (Array.isArray(parsed) && parsed.length > 0) {
            managed = parsed;
          }
        }
      } catch {
        // ignore
      }
    }

    return { cloudDoc, clinMap, statMap, managed };
  };

  // 4A. Check sessions managed by other nurses
  sessions.forEach((s) => {
    const ownerNurse = (s.nurseInCharge || '').trim();
    if (!ownerNurse || ownerNurse === '-' || isMatchingNurse(ownerNurse, nurseName)) return;

    const { clinMap, statMap, managed } = readOtherNurseClinAndStatuses(ownerNurse);
    const matchedOwnerMp = managed.find(
      (mp) =>
        (mp.medicalRecord &&
          s.medicalRecordNumber &&
          mp.medicalRecord.trim() === s.medicalRecordNumber.trim()) ||
        isSameBed(mp.bedNumber, s.bedNumber)
    );
    const rawOwnerClin =
      (s.id ? clinMap[s.id] : undefined) ||
      clinMap[s.bedNumber] ||
      (matchedOwnerMp?.id ? clinMap[matchedOwnerMp.id] : undefined);
    const normOwnerClin = rawOwnerClin ? normalizePatientClinicalDetails(rawOwnerClin) : undefined;

    const vascNurse = (
      normOwnerClin?.poin3_6.vascularAccessNurse ||
      s.vascularAccessNurse ||
      s.bagian3?.vascularAccessNurse ||
      ''
    ).trim();

    if (!vascNurse || !isMatchingNurse(vascNurse, nurseName)) return;

    const kDated = s.sessionDate
      ? buildPatientVerificationKey(ownerNurse, s.bedNumber, s.medicalRecordNumber, s.sessionDate)
      : '';
    const kExact = buildPatientVerificationKey(ownerNurse, s.bedNumber, s.medicalRecordNumber);
    const kNoRm = buildPatientVerificationKey(ownerNurse, s.bedNumber, '0');
    const perPatRec = (kDated ? perPatMap[kDated] : undefined) || perPatMap[kExact] || perPatMap[kNoRm];

    let isVerified = false;
    let verifiedBy: string | undefined;
    let verifiedByRole: string | undefined;
    let verifiedAt: string | undefined;

    if (perPatRec && perPatRec.status) {
      if (perPatRec.status === 'terverifikasi') {
        isVerified = true;
        verifiedBy = perPatRec.verifiedBy;
        verifiedByRole = perPatRec.verifiedByRole;
        verifiedAt = perPatRec.verifiedAt;
      }
    } else {
      const sVerif = isSessionVerifiedByPj(s, masterNurses);
      isVerified = sVerif.isVerified;
      verifiedBy = sVerif.verifiedBy;
      verifiedByRole = sVerif.verifiedByRole;
      verifiedAt = sVerif.verifiedAt;
    }

    const ownerRole = resolveOwnerRole(ownerNurse);
    if (
      !isVerificationEligibleForStaffRole({
        staffName: ownerNurse,
        staffRole: ownerRole,
        isVerified,
        verifiedBy,
        verifiedByRole
      })
    ) {
      return;
    }

    const parsedDate = resolveParsedDateFromCandidates(
      [s.sessionDate, s.date, verifiedAt],
      fallbackDateStr
    );
    const dedupKey = buildCrossPatientDedupKey(
      ownerNurse,
      parsedDate.dateKey,
      s.bedNumber,
      s.medicalRecordNumber,
      s.patientName
    );
    if (seenCrossPatients.has(dedupKey)) return;
    seenCrossPatients.add(dedupKey);

    const ownerChecks =
      (s.id ? statMap[s.id] : undefined) ||
      statMap[s.bedNumber] ||
      (matchedOwnerMp?.id ? statMap[matchedOwnerMp.id] : undefined);
    const crossDone =
      ownerChecks && typeof ownerChecks['3.6'] === 'boolean'
        ? ownerChecks['3.6']
        : typeof s.poin3_6Completed === 'boolean'
        ? s.poin3_6Completed
        : normOwnerClin
        ? isPoin3_6Complete(normOwnerClin.poin3_6)
        : true;

    const group = ensureDateGroup(parsedDate, { verifiedBy, verifiedByRole, verifiedAt });
    group.crossNursePoin3_6Scores.push(crossDone);
  });

  // 4B. Check cloudNurseLogbooks & localStorage for other nurses (covers logbook-only records not yet in sessions)
  const candidateOtherNurses: string[] = [];
  const pushOtherNurse = (name?: string) => {
    const trimmed = (name || '').trim();
    if (!trimmed || trimmed === '-' || isMatchingNurse(trimmed, nurseName)) return;
    if (!candidateOtherNurses.some((existing) => isMatchingNurse(existing, trimmed))) {
      candidateOtherNurses.push(trimmed);
    }
  };
  cloudNurseLogbooks.forEach((lb) => pushOtherNurse(lb.nurseName));
  allRegistryEntries.forEach((e) => pushOtherNurse(e.submittedNurseName));
  masterNurses.forEach((n) => pushOtherNurse(n.name));

  candidateOtherNurses.forEach((ownerNurse) => {
    const { cloudDoc, clinMap, statMap, managed } = readOtherNurseClinAndStatuses(ownerNurse);
    if (!clinMap || Object.keys(clinMap).length === 0) return;

    const ownerReg = allRegistryEntries.find((e) =>
      isMatchingNurse(e.submittedNurseName, ownerNurse)
    );
    const effectiveManaged =
      managed.length > 0 ? managed : ownerReg?.patients || [];
    if (effectiveManaged.length === 0) return;

    const ownerRole = resolveOwnerRole(ownerNurse);
    const ownerVerifInfo = getNurseVerificationInfo(ownerNurse, masterNurses);

    effectiveManaged.forEach((mp) => {
      const rawClin = (mp.id ? clinMap[mp.id] : undefined) || clinMap[mp.bedNumber];
      if (!rawClin) return;
      const normClin = normalizePatientClinicalDetails(rawClin);
      const vascNurse = (normClin.poin3_6.vascularAccessNurse || '').trim();
      if (!vascNurse || !isMatchingNurse(vascNurse, nurseName)) return;

      const dateHint = ownerReg?.dateKey || cloudDoc?.dateIso;
      const kDated = dateHint
        ? buildPatientVerificationKey(ownerNurse, mp.bedNumber, mp.medicalRecord, dateHint)
        : '';
      const kExact = buildPatientVerificationKey(ownerNurse, mp.bedNumber, mp.medicalRecord);
      const kNoRm = buildPatientVerificationKey(ownerNurse, mp.bedNumber, '0');
      const perPatRec =
        (kDated ? perPatMap[kDated] : undefined) || perPatMap[kExact] || perPatMap[kNoRm];
      const cloudPatSub =
        cloudDoc?.patientSubmissions &&
        ((mp.id ? cloudDoc.patientSubmissions[mp.id] : undefined) ||
          cloudDoc.patientSubmissions[mp.bedNumber]);
      const regPat = ownerReg?.patients?.find(
        (rp) =>
          (mp.id && rp.id === mp.id) ||
          (mp.medicalRecord && rp.medicalRecord && rp.medicalRecord.trim() === mp.medicalRecord.trim()) ||
          isSameBed(rp.bedNumber, mp.bedNumber)
      );

      let isVerified = false;
      let verifiedBy: string | undefined;
      let verifiedByRole: string | undefined;
      let verifiedAt: string | undefined;

      if (perPatRec && perPatRec.status) {
        if (perPatRec.status === 'terverifikasi') {
          isVerified = true;
          verifiedBy = perPatRec.verifiedBy;
          verifiedByRole = perPatRec.verifiedByRole;
          verifiedAt = perPatRec.verifiedAt;
        }
      } else if (cloudPatSub && cloudPatSub.status) {
        if (cloudPatSub.status === 'terverifikasi' && !cloudPatSub.revisionRequested) {
          isVerified = true;
          verifiedBy = cloudPatSub.verifiedBy;
          verifiedByRole = cloudPatSub.verifiedByRole;
          verifiedAt = cloudPatSub.verifiedAt;
        }
      } else if (regPat && regPat.status) {
        if (regPat.status === 'terverifikasi' && !regPat.revisionRequested) {
          isVerified = true;
          verifiedBy = regPat.verifiedBy;
          verifiedByRole = regPat.verifiedByRole;
          verifiedAt = regPat.verifiedAt;
        }
      } else if (ownerVerifInfo.isVerified) {
        isVerified = true;
        verifiedBy = ownerVerifInfo.verifiedBy;
        verifiedByRole = ownerVerifInfo.verifiedByRole;
        verifiedAt = ownerVerifInfo.verifiedAt;
      }

      if (
        !isVerificationEligibleForStaffRole({
          staffName: ownerNurse,
          staffRole: ownerRole,
          isVerified,
          verifiedBy,
          verifiedByRole
        })
      ) {
        return;
      }

      const parsedDate = resolveParsedDateFromCandidates(
        [
          ownerReg?.dateKey,
          cloudDoc?.dateIso,
          cloudDoc?.logbookDate,
          ownerReg?.dateLabel,
          ownerReg?.submittedAt,
          verifiedAt
        ],
        fallbackDateStr
      );

      const dedupKey = buildCrossPatientDedupKey(
        ownerNurse,
        parsedDate.dateKey,
        mp.bedNumber,
        mp.medicalRecord,
        mp.patientName
      );
      if (seenCrossPatients.has(dedupKey)) return;
      seenCrossPatients.add(dedupKey);

      const ownerChecks = (mp.id ? statMap[mp.id] : undefined) || statMap[mp.bedNumber];
      const crossDone =
        ownerChecks && typeof ownerChecks['3.6'] === 'boolean'
          ? ownerChecks['3.6']
          : isPoin3_6Complete(normClin.poin3_6);

      const group = ensureDateGroup(parsedDate, { verifiedBy, verifiedByRole, verifiedAt });
      group.crossNursePoin3_6Scores.push(crossDone);
    });
  });

  const verifiedSnapshotsByDate: Record<string, VerifiedDailySnapshot> = {};
  Object.entries(groupedByDate).forEach(([dateKey, group]) => {
    const computed = computeDailySpoScoresFromVerifiedLogbook(
      facilityStatuses,
      group.checksList,
      {
        ownPoin3_6Scores: group.ownPoin3_6Scores,
        crossNursePoin3_6Scores: group.crossNursePoin3_6Scores
      }
    );
    if (computed) {
      verifiedSnapshotsByDate[dateKey] = {
        dateKey,
        day: group.parsedDate.day,
        month: group.parsedDate.month,
        year: group.parsedDate.year,
        verifiedPatientCount: computed.verifiedPatientCount,
        poin3_6MaxCount: computed.poin3_6MaxCount,
        scores: computed.scores,
        verifiedBy: group.verifiedBy,
        verifiedByRole: group.verifiedByRole,
        verifiedAt: group.verifiedAt,
        shift: (latestRegEntry?.shift as ShiftName) || shiftInfo?.shift || 'Pagi'
      };
    }
  });

  return {
    totalManagedCount: combinedPatients.length,
    unverifiedCount: Math.max(0, combinedPatients.length - verifiedCountTotal),
    verifiedSnapshotsByDate
  };
}

/**
 * Syncs the persisted daily verified snapshot for a staff member whenever verification or revision happens.
 */
export function syncNurseVerifiedDailySnapshot(params: {
  nurseName: string;
  userRole: SystemAccessRole;
  shiftInfo?: ShiftInfo;
  sessions?: PatientHDSession[];
  masterNurses?: MasterNurse[];
  cloudNurseLogbooks?: NurseLogbookCloudData[];
}): void {
  const { nurseName, userRole, shiftInfo, sessions, masterNurses, cloudNurseLogbooks } = params;
  if (!nurseName || nurseName === '-') return;

  const activeParsed = parseIndonesianLogbookDate(shiftInfo?.date);
  const live = resolveLiveStaffVerifiedSnapshots({
    nurseName,
    userRole,
    shiftInfo,
    sessions,
    masterNurses,
    cloudNurseLogbooks
  });

  const stored = readStoredMonthlySnapshots(nurseName);
  const nextStored: Record<string, VerifiedDailySnapshot> = { ...stored };

  // Update active shift date from live state (delete if returned for revision / unverified)
  if (live.verifiedSnapshotsByDate[activeParsed.dateKey]) {
    nextStored[activeParsed.dateKey] = live.verifiedSnapshotsByDate[activeParsed.dateKey];
  } else {
    delete nextStored[activeParsed.dateKey];
  }

  // Also upsert any other verified dates found in live state
  Object.entries(live.verifiedSnapshotsByDate).forEach(([dKey, snap]) => {
    nextStored[dKey] = snap;
  });

  writeStoredMonthlySnapshots(nurseName, nextStored);
}

/**
 * Builds the complete Monthly Report (Laporan Bulanan) data structure for a staff member.
 */
export function buildStaffMonthlyRecap(params: {
  nurseName: string;
  nurseNip?: string;
  userRole: SystemAccessRole;
  shiftInfo?: ShiftInfo;
  sessions?: PatientHDSession[];
  masterNurses?: MasterNurse[];
  cloudNurseLogbooks?: NurseLogbookCloudData[];
  targetMonth?: number;
  targetYear?: number;
  storedSnapshotsOverride?: Record<string, VerifiedDailySnapshot>;
  liveVerificationOverride?: ResolvedStaffPatientsVerification;
}): StaffMonthlyRecapResult {
  const {
    nurseName,
    nurseNip = '-',
    userRole,
    shiftInfo,
    sessions = [],
    masterNurses = [],
    cloudNurseLogbooks = [],
    targetMonth,
    targetYear,
    storedSnapshotsOverride,
    liveVerificationOverride
  } = params;

  const activeDateParsed = parseIndonesianLogbookDate(shiftInfo?.date);
  const month = targetMonth ?? activeDateParsed.month;
  const year = targetYear ?? activeDateParsed.year;
  const monthName = getMonthLabel(month);
  const daysInMonth = getDaysInMonth(year, month);
  const monthYearLabel = `${monthName} / ${year}`;

  const storedSnapshots = storedSnapshotsOverride ?? readStoredMonthlySnapshots(nurseName);
  const liveVerification =
    liveVerificationOverride ??
    resolveLiveStaffVerifiedSnapshots({
      nurseName,
      userRole,
      shiftInfo,
      sessions,
      masterNurses,
      cloudNurseLogbooks
    });

  // Merge historical snapshots in this month with live verified snapshots
  const effectiveMonthSnapshots: Record<number, VerifiedDailySnapshot> = {};
  const isSnapshotActive = (snap?: VerifiedDailySnapshot): snap is VerifiedDailySnapshot =>
    Boolean(snap && (snap.verifiedPatientCount > 0 || (snap.poin3_6MaxCount ?? 0) > 0));

  Object.values(storedSnapshots).forEach((snap) => {
    if (
      isSnapshotActive(snap) &&
      snap.year === year &&
      snap.month === month &&
      snap.dateKey !== activeDateParsed.dateKey
    ) {
      effectiveMonthSnapshots[snap.day] = snap;
    }
  });

  Object.values(liveVerification.verifiedSnapshotsByDate).forEach((snap) => {
    if (isSnapshotActive(snap) && snap.year === year && snap.month === month) {
      effectiveMonthSnapshots[snap.day] = snap;
    }
  });

  const dailyScores: Record<string, (number | null)[]> = {};
  const dailyItemMaxScores: Record<string, (number | null)[]> = {};
  const itemMaxScores: Record<string, number> = {};
  const checks: Record<string, boolean[]> = {};
  const notes: Record<string, string> = {};
  const dailyVerifiedPatientCounts: number[] = new Array(31).fill(0);
  const verifiedDays: boolean[] = new Array(31).fill(false);
  const hasActivityDays: boolean[] = new Array(31).fill(false);
  let totalPoin3_6MaxInMonth = 0;

  for (let d = 1; d <= 31; d++) {
    const snap = d <= daysInMonth ? effectiveMonthSnapshots[d] : undefined;
    if (snap) {
      const ownPats = snap.verifiedPatientCount || 0;
      const p36Max = snap.poin3_6MaxCount ?? ownPats;
      if (ownPats > 0) {
        verifiedDays[d - 1] = true;
        dailyVerifiedPatientCounts[d - 1] = ownPats;
      }
      if (ownPats > 0 || p36Max > 0) {
        hasActivityDays[d - 1] = true;
      }
      totalPoin3_6MaxInMonth += p36Max;
    }
  }

  const verifiedDaysCount = verifiedDays.filter(Boolean).length;
  const totalVerifiedPatientsInMonth = dailyVerifiedPatientCounts.reduce((a, b) => a + b, 0);

  const itemStats: Record<string, MonthlyItemSummaryStat> = {};

  OFFICIAL_LOGBOOK_ITEMS.forEach((item) => {
    const rowScores: (number | null)[] = new Array(31).fill(null);
    const rowMaxScores: (number | null)[] = new Array(31).fill(null);
    const rowChecks: boolean[] = new Array(31).fill(false);
    let totalScore = 0;

    for (let d = 1; d <= 31; d++) {
      const snap = d <= daysInMonth ? effectiveMonthSnapshots[d] : undefined;
      if (!snap) continue;

      const ownPats = snap.verifiedPatientCount || 0;
      const p36Max = snap.poin3_6MaxCount ?? ownPats;

      if (item.code === '3.6') {
        if (ownPats > 0 || p36Max > 0) {
          const val = typeof snap.scores['3.6'] === 'number' ? snap.scores['3.6'] : 0;
          rowScores[d - 1] = val;
          rowMaxScores[d - 1] = p36Max;
          rowChecks[d - 1] = val > 0;
          totalScore += val;
        }
      } else if (ownPats > 0) {
        const val = typeof snap.scores[item.code] === 'number' ? snap.scores[item.code] : 0;
        rowScores[d - 1] = val;
        rowMaxScores[d - 1] = item.bagian === 1 ? 1 : ownPats;
        rowChecks[d - 1] = val > 0;
        totalScore += val;
      }
    }

    const maxScore =
      item.bagian === 1
        ? verifiedDaysCount
        : item.code === '3.6'
        ? totalPoin3_6MaxInMonth
        : totalVerifiedPatientsInMonth;
    const pct = maxScore > 0 ? Number(((totalScore / maxScore) * 100).toFixed(1)) : 0;

    dailyScores[item.code] = rowScores;
    dailyItemMaxScores[item.code] = rowMaxScores;
    itemMaxScores[item.code] = maxScore;
    checks[item.code] = rowChecks;
    itemStats[item.code] = {
      code: item.code,
      bagian: item.bagian,
      totalScore,
      maxScore,
      pct
    };

    if (maxScore === 0) {
      notes[item.code] = '-';
    } else if (totalScore === maxScore) {
      notes[item.code] = 'Terverifikasi (100%)';
    } else {
      notes[item.code] = `${totalScore}/${maxScore} (${pct}%)`;
    }
  });

  const dailyTotalScores: (number | null)[] = new Array(31).fill(null);
  const dailyMaxScores: (number | null)[] = new Array(31).fill(null);

  for (let d = 1; d <= 31; d++) {
    const snap = d <= daysInMonth ? effectiveMonthSnapshots[d] : undefined;
    if (snap && hasActivityDays[d - 1]) {
      const ownPats = snap.verifiedPatientCount || 0;
      const p36Max = snap.poin3_6MaxCount ?? ownPats;
      const daySum = OFFICIAL_LOGBOOK_ITEMS.reduce((acc, it) => {
        const v = dailyScores[it.code]?.[d - 1];
        return acc + (typeof v === 'number' ? v : 0);
      }, 0);
      const dayMax = (ownPats > 0 ? 3 + 25 * ownPats : 0) + p36Max;
      dailyTotalScores[d - 1] = daySum;
      dailyMaxScores[d - 1] = dayMax;
    }
  }

  const grandTotalScore = Object.values(itemStats).reduce((acc, st) => acc + st.totalScore, 0);
  const grandMaxScore = Object.values(itemStats).reduce((acc, st) => acc + st.maxScore, 0);
  const overallCompliancePct =
    grandMaxScore > 0 ? Number(((grandTotalScore / grandMaxScore) * 100).toFixed(1)) : 0;

  // Resolve latest verifier metadata across verified snapshots
  const sortedVerifiedDays = Object.values(effectiveMonthSnapshots).sort((a, b) => b.day - a.day);
  const latestSnapshot = sortedVerifiedDays[0];

  const karu = masterNurses.find(
    (n) => n.role === 'kepala_ruangan' || n.systemAccess === 'kepala_ruangan'
  );
  const resolvedVerifierName =
    latestSnapshot?.verifiedBy ||
    karu?.name ||
    (shiftInfo?.kepalaRuangan && shiftInfo.kepalaRuangan !== '-'
      ? shiftInfo.kepalaRuangan
      : shiftInfo?.pjShift || '-');
  const resolvedVerifierNip =
    masterNurses.find((n) => isMatchingNurse(n.name, resolvedVerifierName))?.nip ||
    karu?.nip ||
    '-';

  const resolvedNurseName = nurseName && nurseName !== '-' ? nurseName : '-';
  const hasVerifiedData = verifiedDaysCount > 0 || totalPoin3_6MaxInMonth > 0;

  // Resolve actual staff role
  const targetNurseMaster = masterNurses.find((n) => isMatchingNurse(n.name, nurseName));
  const effectiveStaffRole: SystemAccessRole =
    targetNurseMaster?.systemAccess ||
    (targetNurseMaster?.role === 'kepala_ruangan'
      ? 'kepala_ruangan'
      : targetNurseMaster?.role === 'pj_shift'
      ? 'pj_shift'
      : userRole === 'administrator'
      ? 'perawat_pelaksana'
      : userRole);

  const logbook: OfficialNurseLogbookMonth = {
    nurseName: resolvedNurseName,
    nipNira: nurseNip || '-',
    nurseRole: effectiveStaffRole,
    unitName: 'Unit Hemodialisis (Dialysis Center)',
    monthYear: monthYearLabel,
    daysInMonth,
    pkLevel: 'PK III Dialisis',
    shift: latestSnapshot?.shift || shiftInfo?.shift || 'Pagi',
    checks,
    dailyScores,
    dailyItemMaxScores,
    itemMaxScores,
    dailyVerifiedPatientCounts,
    verifiedDays,
    hasActivityDays,
    verifierName: resolvedVerifierName,
    verifierRoleLabel: latestSnapshot?.verifiedByRole || 'PJ Shift / Kepala Ruang',
    notes,
    nurseSigned: hasVerifiedData && resolvedNurseName !== '-',
    nurseSignedAt: latestSnapshot?.verifiedAt || '',
    headNurseName: resolvedVerifierName,
    headNurseNip: resolvedVerifierNip,
    headNurseSigned: hasVerifiedData && resolvedVerifierName !== '-',
    headNurseSignedAt: latestSnapshot?.verifiedAt || ''
  };

  return {
    logbook,
    roleLabel: formatStaffRoleTitle(effectiveStaffRole),
    daysInMonth,
    verifiedDaysCount,
    totalVerifiedPatientsInMonth,
    unverifiedPatientsCount: liveVerification.unverifiedCount,
    totalManagedToday: liveVerification.totalManagedCount,
    itemStats,
    dailyTotalScores,
    dailyMaxScores,
    grandTotalScore,
    grandMaxScore,
    overallCompliancePct
  };
}

export interface UnitStaffMonthlySummaryItem {
  nurseId?: string;
  nurseName: string;
  nurseNip: string;
  systemAccess: SystemAccessRole;
  role: 'perawat_pelaksana' | 'pj_shift' | 'kepala_ruangan';
  isOnDutyToday?: boolean;
  shiftAssigned?: ShiftName;
  verifiedDaysCount: number;
  totalVerifiedPatients: number;
  poin3_6VascularCount: number;
  grandTotalScore: number;
  grandMaxScore: number;
  overallCompliancePct: number;
  lastVerifiedAt?: string;
  lastVerifiedBy?: string;
  lastVerifiedByRole?: string;
  statusLabel: 'Terverifikasi' | 'Belum Ada Logbook';
  recap: StaffMonthlyRecapResult;
}

export interface UnitMonthlyRecapOverview {
  month: number;
  year: number;
  monthYear: string;
  totalActiveNurses: number;
  totalVerifiedDutyDays: number;
  totalVerifiedPatientsUnit: number;
  unitOverallCompliancePct: number;
  staffSummaries: UnitStaffMonthlySummaryItem[];
}

export function buildAllStaffMonthlyRecap(params: {
  masterNurses: MasterNurse[];
  shiftInfo?: ShiftInfo;
  sessions?: PatientHDSession[];
  cloudNurseLogbooks?: NurseLogbookCloudData[];
  targetMonth?: number;
  targetYear?: number;
}): UnitMonthlyRecapOverview {
  const {
    masterNurses = [],
    shiftInfo,
    sessions = [],
    cloudNurseLogbooks = [],
    targetMonth,
    targetYear
  } = params;

  const activeDateParsed = parseIndonesianLogbookDate(shiftInfo?.date);
  const month = targetMonth ?? activeDateParsed.month;
  const year = targetYear ?? activeDateParsed.year;
  const monthName = getMonthLabel(month);
  const monthYearLabel = `${monthName} / ${year}`;

  const activeNurses = masterNurses.filter((n) => n.accountStatus !== 'nonaktif');

  const staffSummaries: UnitStaffMonthlySummaryItem[] = activeNurses.map((nurse) => {
    const recap = buildStaffMonthlyRecap({
      nurseName: nurse.name,
      nurseNip: nurse.nip,
      userRole: nurse.systemAccess || 'perawat_pelaksana',
      shiftInfo,
      sessions,
      masterNurses,
      cloudNurseLogbooks,
      targetMonth: month,
      targetYear: year
    });

    const poin3_6VascularCount = recap.itemStats['3.6']?.totalScore || 0;
    const hasData = recap.verifiedDaysCount > 0 || recap.totalVerifiedPatientsInMonth > 0;

    return {
      nurseId: nurse.id,
      nurseName: nurse.name,
      nurseNip: nurse.nip || '-',
      systemAccess: nurse.systemAccess || 'perawat_pelaksana',
      role: nurse.role,
      isOnDutyToday: nurse.isOnDutyToday,
      shiftAssigned: nurse.shiftAssigned,
      verifiedDaysCount: recap.verifiedDaysCount,
      totalVerifiedPatients: recap.totalVerifiedPatientsInMonth,
      poin3_6VascularCount,
      grandTotalScore: recap.grandTotalScore,
      grandMaxScore: recap.grandMaxScore,
      overallCompliancePct: recap.overallCompliancePct,
      lastVerifiedAt: recap.logbook.nurseSignedAt || undefined,
      lastVerifiedBy: recap.logbook.verifierName || undefined,
      lastVerifiedByRole: recap.logbook.verifierRoleLabel || undefined,
      statusLabel: hasData ? 'Terverifikasi' : 'Belum Ada Logbook',
      recap
    };
  });

  const totalActiveNurses = activeNurses.length;
  const totalVerifiedDutyDays = staffSummaries.reduce((acc, s) => acc + s.verifiedDaysCount, 0);
  const totalVerifiedPatientsUnit = staffSummaries.reduce(
    (acc, s) => acc + s.totalVerifiedPatients,
    0
  );

  const totalScoreUnit = staffSummaries.reduce((acc, s) => acc + s.grandTotalScore, 0);
  const totalMaxUnit = staffSummaries.reduce((acc, s) => acc + s.grandMaxScore, 0);
  const unitOverallCompliancePct =
    totalMaxUnit > 0 ? Number(((totalScoreUnit / totalMaxUnit) * 100).toFixed(1)) : 0;

  return {
    month,
    year,
    monthYear: monthYearLabel,
    totalActiveNurses,
    totalVerifiedDutyDays,
    totalVerifiedPatientsUnit,
    unitOverallCompliancePct,
    staffSummaries
  };
}

