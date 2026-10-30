import {
  MasterNurse,
  PatientHDSession,
  ShiftInfo,
  SystemAccessRole
} from '../types/dialysis.ts';
import { getCurrentIndonesianFullDate } from './dateHelpers.ts';
import { resolveNurseSystemAccess } from './masterDataHelpers.ts';
import {
  VerifiedDailySnapshot,
  getDaysInMonth,
  getMonthLabel,
  isVerificationEligibleForStaffRole,
  parseIndonesianLogbookDate,
  resolveLiveStaffVerifiedSnapshots
} from './monthlyRecapHelpers.ts';
import {
  ManagedPatientMinimal,
  PER_PATIENT_STATUS_STORAGE_KEY,
  buildPatientVerificationKey,
  filterVerificationQueueForUser,
  getNurseManagedPatientsKey,
  getNurseMonthlySnapshotsKey,
  getNurseStorageKey,
  getNurseVerificationInfo,
  getVerificationRegistry,
  isMatchingNurse,
  isSameBed,
  isSessionVerifiedByPj
} from './nurseVerificationHelpers.ts';

export interface MonthlyDialysisPoint {
  month: number; // 1..12
  shortLabel: string; // 'Jan'..'Des'
  fullLabel: string; // 'Januari'..'Desember'
  unitSessionsCount: number;
  unitUniquePatientsCount: number;
  personalSessionsCount: number;
  personalUniquePatientsCount: number;
  unitPendingCount: number;
  personalPendingCount: number;
  isCurrentRunningMonth: boolean;
  isSelectedMonth: boolean;
}

export interface DailyDialysisPoint {
  day: number; // 1..daysInMonth
  unitSessionsCount: number;
  personalSessionsCount: number;
  isToday: boolean;
}

export interface DashboardAnalyticsSummary {
  selectedMonth: number;
  selectedMonthLabel: string;
  selectedYear: number;
  runningMonth: number;
  runningMonthLabel: string;
  runningYear: number;
  daysInSelectedMonth: number;

  // Operational Top-Row Counters
  todayTotalPatients: number;
  todayCompletedDialysis: number;
  dialysisPendingVerificationCount: number;
  logbookPendingVerificationCount: number;

  // KPI 1: Jumlah pasien yang dikelola pribadi dalam satu bulan
  personalMonthlySessions: number;
  personalMonthlyUniquePatients: number;
  personalVerifiedDaysCount: number;
  personalPendingSessions: number;

  // KPI 2: Jumlah pasien yang sudah melakukan HD dalam satu bulan (Satu Unit)
  unitMonthlySessions: number;
  unitMonthlyUniquePatients: number;
  unitActiveDaysCount: number;
  unitPendingSessions: number;
  unitContributingStaffCount: number;
  personalSharePct: number;

  // Grafik Data Dialisis Bulanan (Januari - Desember)
  yearlySeries: MonthlyDialysisPoint[];
  yearlyTotalUnitSessions: number;
  yearlyTotalPersonalSessions: number;
  peakMonthPoint: MonthlyDialysisPoint;

  // Rincian Harian Bulan Fokus (1..daysInSelectedMonth)
  dailySeries: DailyDialysisPoint[];
}

const MONTH_SHORT_LABELS: Record<number, string> = {
  1: 'Jan',
  2: 'Feb',
  3: 'Mar',
  4: 'Apr',
  5: 'Mei',
  6: 'Jun',
  7: 'Jul',
  8: 'Agu',
  9: 'Sep',
  10: 'Okt',
  11: 'Nov',
  12: 'Des'
};

interface CanonicalStaffMember {
  storageKey: string;
  name: string;
  role: SystemAccessRole;
}

function makePatientIdentityKey(medicalRecord?: string, patientName?: string, fallbackBed?: string): string {
  const cleanRm = (medicalRecord || '').trim().toLowerCase().replace(/\s+/g, '');
  if (cleanRm && cleanRm !== '-' && cleanRm !== '0') {
    return `rm:${cleanRm}`;
  }
  const cleanName = (patientName || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (cleanName && cleanName !== '-') {
    return `name:${cleanName}`;
  }
  return `bed:${(fallbackBed || 'unknown').trim().toLowerCase()}`;
}

function readStoredSnapshotsForStaff(nurseName: string): Record<string, VerifiedDailySnapshot> {
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
    // ignore corrupt storage
  }
  return {};
}

function readPerPatientVerificationMap(): Record<
  string,
  {
    status: string;
    verifiedAt?: string;
    verifiedBy?: string;
    verifiedByRole?: string;
  }
> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = localStorage.getItem(PER_PATIENT_STATUS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return {};
}

function readStaffManagedPatientsFromStorage(nurseName: string): ManagedPatientMinimal[] {
  if (typeof window === 'undefined' || !window.localStorage || !nurseName || nurseName === '-') {
    return [];
  }
  try {
    const raw = localStorage.getItem(getNurseManagedPatientsKey(nurseName));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return [];
}

interface StaffYearAggregation {
  storageKey: string;
  name: string;
  // month (1..12) -> day (1..31) -> verified session count
  verifiedByMonthDay: Record<number, Record<number, number>>;
  // month (1..12) -> Set of unique verified patient keys
  uniqueVerifiedKeysByMonth: Record<number, Set<string>>;
  // month (1..12) -> unverified/pending patient session count
  pendingByMonth: Record<number, number>;
  // Active date ('YYYY-MM-DD') total & completed counts
  activeDayTotalCount: number;
  activeDayCompletedCount: number;
  totalUnverifiedSessionsAllMonths: number;
}

function aggregateSingleStaffYear(params: {
  staff: CanonicalStaffMember;
  targetYear: number;
  activeDateStr: string;
  activeDateKey: string;
  shiftInfo?: ShiftInfo;
  sessions: PatientHDSession[];
  masterNurses: MasterNurse[];
  perPatMap: ReturnType<typeof readPerPatientVerificationMap>;
}): StaffYearAggregation {
  const {
    staff,
    targetYear,
    activeDateStr,
    activeDateKey,
    shiftInfo,
    sessions,
    masterNurses,
    perPatMap
  } = params;

  const verifiedByMonthDay: Record<number, Record<number, number>> = {};
  const uniqueVerifiedKeysByMonth: Record<number, Set<string>> = {};
  const pendingByMonth: Record<number, number> = {};

  for (let m = 1; m <= 12; m++) {
    verifiedByMonthDay[m] = {};
    uniqueVerifiedKeysByMonth[m] = new Set<string>();
    pendingByMonth[m] = 0;
  }

  if (!staff.name || staff.name === '-') {
    return {
      storageKey: staff.storageKey,
      name: staff.name,
      verifiedByMonthDay,
      uniqueVerifiedKeysByMonth,
      pendingByMonth,
      activeDayTotalCount: 0,
      activeDayCompletedCount: 0,
      totalUnverifiedSessionsAllMonths: 0
    };
  }

  const storedSnapshots = readStoredSnapshotsForStaff(staff.name);
  const liveVerification = resolveLiveStaffVerifiedSnapshots({
    nurseName: staff.name,
    userRole: staff.role,
    shiftInfo,
    sessions,
    masterNurses,
    overridePerPatientRecords: perPatMap
  });

  // 1. Populate historical verified snapshots for targetYear (excluding activeDateKey which comes from live state)
  Object.values(storedSnapshots).forEach((snap) => {
    if (
      snap &&
      snap.year === targetYear &&
      snap.month >= 1 &&
      snap.month <= 12 &&
      snap.dateKey !== activeDateKey &&
      snap.verifiedPatientCount > 0
    ) {
      verifiedByMonthDay[snap.month][snap.day] = snap.verifiedPatientCount;
    }
  });

  // 2. Overlay live verified snapshots for targetYear
  Object.values(liveVerification.verifiedSnapshotsByDate).forEach((snap) => {
    if (
      snap &&
      snap.year === targetYear &&
      snap.month >= 1 &&
      snap.month <= 12 &&
      snap.verifiedPatientCount > 0
    ) {
      verifiedByMonthDay[snap.month][snap.day] = snap.verifiedPatientCount;
    }
  });

  // 3. Collect named unique patients & pending counts for this staff member
  const managedList = readStaffManagedPatientsFromStorage(staff.name);
  const regEntry = getVerificationRegistry().find((e) =>
    isMatchingNurse(e.submittedNurseName, staff.name)
  );
  const effectiveManagedList =
    managedList.length > 0 ? managedList : regEntry?.patients || [];

  const nurseSessions = sessions.filter((s) => isMatchingNurse(s.nurseInCharge, staff.name));

  const combinedPatients: Array<{
    bedNumber: string;
    patientName: string;
    medicalRecord?: string;
    matchedSession?: PatientHDSession;
  }> = effectiveManagedList.map((mp) => {
    const cleanRm = mp.medicalRecord?.trim();
    const cleanName = mp.patientName?.trim().toLowerCase();
    const matchedSession = nurseSessions.find((s) => {
      if (cleanRm && s.medicalRecordNumber?.trim() === cleanRm) return true;
      if (isSameBed(s.bedNumber, mp.bedNumber)) return true;
      if (cleanName && s.patientName.trim().toLowerCase() === cleanName) return true;
      return false;
    });
    return {
      bedNumber: mp.bedNumber,
      patientName: mp.patientName,
      medicalRecord: mp.medicalRecord || matchedSession?.medicalRecordNumber,
      matchedSession
    };
  });

  nurseSessions.forEach((s) => {
    const alreadyExists = combinedPatients.some((cp) => {
      if (
        cp.medicalRecord &&
        s.medicalRecordNumber &&
        cp.medicalRecord.trim() === s.medicalRecordNumber.trim()
      ) {
        return true;
      }
      if (isSameBed(cp.bedNumber, s.bedNumber)) return true;
      if (
        cp.patientName &&
        s.patientName &&
        cp.patientName.trim().toLowerCase() === s.patientName.trim().toLowerCase()
      ) {
        return true;
      }
      return false;
    });
    if (!alreadyExists) {
      combinedPatients.push({
        bedNumber: s.bedNumber,
        patientName: s.patientName,
        medicalRecord: s.medicalRecordNumber,
        matchedSession: s
      });
    }
  });

  const nurseVerifInfo = getNurseVerificationInfo(staff.name, masterNurses);

  let activeDayTotalCount = 0;
  let activeDayCompletedCount = 0;
  let totalUnverifiedSessionsAllMonths = 0;

  combinedPatients.forEach((pat) => {
    const kExact = buildPatientVerificationKey(staff.name, pat.bedNumber, pat.medicalRecord);
    const kNoRm = buildPatientVerificationKey(staff.name, pat.bedNumber, '0');
    const perPatRec = perPatMap[kExact] || perPatMap[kNoRm];

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
    } else if (pat.matchedSession) {
      const sVerif = isSessionVerifiedByPj(pat.matchedSession, masterNurses);
      isVerified = sVerif.isVerified;
      verifiedBy = sVerif.verifiedBy;
      verifiedByRole = sVerif.verifiedByRole;
      verifiedAt = sVerif.verifiedAt;
    } else if (nurseVerifInfo.isVerified) {
      isVerified = true;
      verifiedBy = nurseVerifInfo.verifiedBy;
      verifiedByRole = nurseVerifInfo.verifiedByRole;
      verifiedAt = nurseVerifInfo.verifiedAt;
    }

    const eligible = isVerificationEligibleForStaffRole({
      staffName: staff.name,
      staffRole: staff.role,
      isVerified,
      verifiedBy,
      verifiedByRole
    });

    const parsedDate = parseIndonesianLogbookDate(
      verifiedAt || regEntry?.submittedAt || pat.matchedSession?.updatedAt,
      activeDateStr
    );

    if (parsedDate.dateKey === activeDateKey) {
      activeDayTotalCount += 1;
      if (eligible || pat.matchedSession?.sessionStatus === 'selesai') {
        activeDayCompletedCount += 1;
      }
    }

    if (!eligible) {
      totalUnverifiedSessionsAllMonths += 1;
    }

    if (parsedDate.year !== targetYear) return;

    if (eligible) {
      const pKey = makePatientIdentityKey(pat.medicalRecord, pat.patientName, pat.bedNumber);
      uniqueVerifiedKeysByMonth[parsedDate.month].add(pKey);
    } else {
      pendingByMonth[parsedDate.month] += 1;
    }
  });

  return {
    storageKey: staff.storageKey,
    name: staff.name,
    verifiedByMonthDay,
    uniqueVerifiedKeysByMonth,
    pendingByMonth,
    activeDayTotalCount,
    activeDayCompletedCount,
    totalUnverifiedSessionsAllMonths
  };
}

/**
 * Computes full-year (Jan-Dec) and selected-month dialysis metrics for both:
 * 1) Personal managed patients ("Jumlah pasien yang dikelola pribadi dalam satu bulan")
 * 2) Unit-wide HD patients ("Jumlah pasien yang sudah melakukan HD dalam satu bulan")
 */
export function buildDashboardAnalytics(params: {
  currentStaffName: string;
  currentStaffRole: SystemAccessRole;
  masterNurses?: MasterNurse[];
  sessions?: PatientHDSession[];
  shiftInfo?: ShiftInfo;
  selectedMonth?: number;
  selectedYear?: number;
}): DashboardAnalyticsSummary {
  const {
    currentStaffName,
    currentStaffRole,
    masterNurses = [],
    sessions = [],
    shiftInfo,
    selectedMonth: explicitMonth,
    selectedYear: explicitYear
  } = params;

  const activeDateStr = shiftInfo?.date || getCurrentIndonesianFullDate();
  const runningParsed = parseIndonesianLogbookDate(activeDateStr);
  const runningMonth = runningParsed.month;
  const runningYear = runningParsed.year;

  const selectedMonth =
    explicitMonth && explicitMonth >= 1 && explicitMonth <= 12 ? explicitMonth : runningMonth;
  const selectedYear = explicitYear && explicitYear >= 2020 ? explicitYear : runningYear;
  const daysInSelectedMonth = getDaysInMonth(selectedYear, selectedMonth);

  // Collect canonical staff roster across Master Data, logged-in user, Verification Registry, and Sessions
  const staffMap = new Map<string, CanonicalStaffMember>();

  const registerStaff = (name?: string, roleHint?: SystemAccessRole) => {
    if (!name || !name.trim() || name.trim() === '-') return;
    // Check if matches an existing registered nurse via resilient matching
    for (const existing of staffMap.values()) {
      if (isMatchingNurse(existing.name, name)) {
        return;
      }
    }
    const key = getNurseStorageKey(name);
    if (!key || key === 'default') return;
    if (!staffMap.has(key)) {
      staffMap.set(key, {
        storageKey: key,
        name: name.trim(),
        role: roleHint || 'perawat_pelaksana'
      });
    }
  };

  if (currentStaffName && currentStaffName !== '-' && currentStaffRole !== 'administrator') {
    registerStaff(currentStaffName, currentStaffRole);
  }

  masterNurses.forEach((n) => {
    registerStaff(n.name, resolveNurseSystemAccess(n));
  });

  getVerificationRegistry().forEach((entry) => {
    registerStaff(entry.submittedNurseName, entry.submittedNurseRole);
  });

  sessions.forEach((s) => {
    if (s.nurseInCharge && s.nurseInCharge !== '-') {
      const matchedMaster = masterNurses.find((n) => isMatchingNurse(n.name, s.nurseInCharge));
      registerStaff(
        s.nurseInCharge,
        matchedMaster ? resolveNurseSystemAccess(matchedMaster) : 'perawat_pelaksana'
      );
    }
  });

  const perPatMap = readPerPatientVerificationMap();

  const staffAggregations: StaffYearAggregation[] = Array.from(staffMap.values()).map((staff) =>
    aggregateSingleStaffYear({
      staff,
      targetYear: selectedYear,
      activeDateStr,
      activeDateKey: runningParsed.dateKey,
      shiftInfo,
      sessions,
      masterNurses,
      perPatMap
    })
  );

  // Find aggregation corresponding to the logged-in user
  const personalAgg = staffAggregations.find((agg) =>
    isMatchingNurse(agg.name, currentStaffName)
  );

  // Also include any unassigned sessions (where nurseInCharge is blank or '-')
  const unassignedVerifiedByMonthDay: Record<number, Record<number, number>> = {};
  const unassignedUniqueKeysByMonth: Record<number, Set<string>> = {};
  const unassignedPendingByMonth: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) {
    unassignedVerifiedByMonthDay[m] = {};
    unassignedUniqueKeysByMonth[m] = new Set<string>();
    unassignedPendingByMonth[m] = 0;
  }

  let unassignedActiveDayTotal = 0;
  let unassignedActiveDayCompleted = 0;
  let unassignedTotalPending = 0;

  sessions.forEach((s) => {
    const hasAssignedStaff =
      s.nurseInCharge &&
      s.nurseInCharge !== '-' &&
      staffAggregations.some((agg) => isMatchingNurse(agg.name, s.nurseInCharge));
    if (hasAssignedStaff) return;

    const verif = isSessionVerifiedByPj(s, masterNurses);
    const parsed = parseIndonesianLogbookDate(verif.verifiedAt || s.updatedAt, activeDateStr);

    if (parsed.dateKey === runningParsed.dateKey && s.sessionStatus !== 'batal') {
      unassignedActiveDayTotal += 1;
      if (verif.isVerified || s.sessionStatus === 'selesai') {
        unassignedActiveDayCompleted += 1;
      }
    }

    if (!verif.isVerified && s.sessionStatus !== 'batal') {
      unassignedTotalPending += 1;
    }

    if (parsed.year !== selectedYear) return;

    if (verif.isVerified || s.sessionStatus === 'selesai') {
      unassignedVerifiedByMonthDay[parsed.month][parsed.day] =
        (unassignedVerifiedByMonthDay[parsed.month][parsed.day] || 0) + 1;
      unassignedUniqueKeysByMonth[parsed.month].add(
        makePatientIdentityKey(s.medicalRecordNumber, s.patientName, s.bedNumber)
      );
    } else if (s.sessionStatus !== 'batal') {
      unassignedPendingByMonth[parsed.month] += 1;
    }
  });

  // Build 12-month series (Jan..Des)
  const yearlySeries: MonthlyDialysisPoint[] = [];

  for (let m = 1; m <= 12; m++) {
    const mDays = getDaysInMonth(selectedYear, m);
    let unitSessionsCount = 0;
    let maxUnitSingleDay = 0;
    let personalSessionsCount = 0;
    let maxPersonalSingleDay = 0;

    for (let d = 1; d <= mDays; d++) {
      let dayUnitSum = unassignedVerifiedByMonthDay[m][d] || 0;
      staffAggregations.forEach((agg) => {
        dayUnitSum += agg.verifiedByMonthDay[m][d] || 0;
      });
      unitSessionsCount += dayUnitSum;
      if (dayUnitSum > maxUnitSingleDay) maxUnitSingleDay = dayUnitSum;

      const dayPersonal = personalAgg?.verifiedByMonthDay[m][d] || 0;
      personalSessionsCount += dayPersonal;
      if (dayPersonal > maxPersonalSingleDay) maxPersonalSingleDay = dayPersonal;
    }

    const unitUniqueSet = new Set<string>(unassignedUniqueKeysByMonth[m]);
    staffAggregations.forEach((agg) => {
      agg.uniqueVerifiedKeysByMonth[m].forEach((k) => unitUniqueSet.add(k));
    });

    const personalUniqueSet = personalAgg ? personalAgg.uniqueVerifiedKeysByMonth[m] : new Set<string>();

    const unitUniquePatientsCount =
      unitSessionsCount === 0
        ? 0
        : Math.min(unitSessionsCount, Math.max(unitUniqueSet.size, maxUnitSingleDay));

    const personalUniquePatientsCount =
      personalSessionsCount === 0
        ? 0
        : Math.min(personalSessionsCount, Math.max(personalUniqueSet.size, maxPersonalSingleDay));

    const unitPendingCount =
      unassignedPendingByMonth[m] +
      staffAggregations.reduce((sum, agg) => sum + (agg.pendingByMonth[m] || 0), 0);

    const personalPendingCount = personalAgg ? personalAgg.pendingByMonth[m] || 0 : 0;

    yearlySeries.push({
      month: m,
      shortLabel: MONTH_SHORT_LABELS[m] || getMonthLabel(m).slice(0, 3),
      fullLabel: getMonthLabel(m),
      unitSessionsCount,
      unitUniquePatientsCount,
      personalSessionsCount,
      personalUniquePatientsCount,
      unitPendingCount,
      personalPendingCount,
      isCurrentRunningMonth: selectedYear === runningYear && m === runningMonth,
      isSelectedMonth: m === selectedMonth
    });
  }

  // Selected month metrics
  const selectedMonthPoint =
    yearlySeries.find((p) => p.month === selectedMonth) || yearlySeries[runningMonth - 1];

  // Daily series for the selected month (1..daysInSelectedMonth)
  const dailySeries: DailyDialysisPoint[] = [];
  let personalVerifiedDaysCount = 0;
  let unitActiveDaysCount = 0;

  for (let d = 1; d <= daysInSelectedMonth; d++) {
    let dayUnit = unassignedVerifiedByMonthDay[selectedMonth][d] || 0;
    staffAggregations.forEach((agg) => {
      dayUnit += agg.verifiedByMonthDay[selectedMonth][d] || 0;
    });
    const dayPersonal = personalAgg?.verifiedByMonthDay[selectedMonth][d] || 0;

    if (dayPersonal > 0) personalVerifiedDaysCount += 1;
    if (dayUnit > 0) unitActiveDaysCount += 1;

    dailySeries.push({
      day: d,
      unitSessionsCount: dayUnit,
      personalSessionsCount: dayPersonal,
      isToday:
        selectedYear === runningYear &&
        selectedMonth === runningMonth &&
        d === runningParsed.day
    });
  }

  const unitContributingStaffCount = staffAggregations.filter((agg) => {
    const staffMonthTotal = Object.values(agg.verifiedByMonthDay[selectedMonth] || {}).reduce(
      (a, b) => a + b,
      0
    );
    return staffMonthTotal > 0;
  }).length;

  const personalSharePct =
    selectedMonthPoint.unitSessionsCount > 0
      ? Number(
          (
            (selectedMonthPoint.personalSessionsCount / selectedMonthPoint.unitSessionsCount) *
            100
          ).toFixed(1)
        )
      : 0;

  const yearlyTotalUnitSessions = yearlySeries.reduce((acc, p) => acc + p.unitSessionsCount, 0);
  const yearlyTotalPersonalSessions = yearlySeries.reduce(
    (acc, p) => acc + p.personalSessionsCount,
    0
  );

  // Peak month (defaults to running month / Oktober if all months are 0)
  const peakMonthPoint = yearlySeries.reduce((best, curr) => {
    if (curr.unitSessionsCount > best.unitSessionsCount) return curr;
    if (
      curr.unitSessionsCount === best.unitSessionsCount &&
      curr.isCurrentRunningMonth
    ) {
      return curr;
    }
    return best;
  }, yearlySeries[runningMonth - 1] || yearlySeries[9]);

  // Compute operational top-row counters
  const todayTotalPatients =
    unassignedActiveDayTotal +
    staffAggregations.reduce((sum, agg) => sum + agg.activeDayTotalCount, 0);

  const todayCompletedDialysis =
    unassignedActiveDayCompleted +
    staffAggregations.reduce((sum, agg) => sum + agg.activeDayCompletedCount, 0);

  const dialysisPendingVerificationCount =
    unassignedTotalPending +
    staffAggregations.reduce((sum, agg) => sum + agg.totalUnverifiedSessionsAllMonths, 0);

  const allRegistryEntries = getVerificationRegistry();
  const logbookPendingVerificationCount =
    currentStaffRole === 'pj_shift' || currentStaffRole === 'kepala_ruangan'
      ? filterVerificationQueueForUser(allRegistryEntries, currentStaffRole, currentStaffName).filter(
          (e) => e.status === 'diajukan'
        ).length
      : currentStaffRole === 'perawat_pelaksana'
      ? allRegistryEntries.filter(
          (e) => isMatchingNurse(e.submittedNurseName, currentStaffName) && e.status === 'diajukan'
        ).length
      : allRegistryEntries.filter((e) => e.status === 'diajukan').length;

  return {
    selectedMonth,
    selectedMonthLabel: getMonthLabel(selectedMonth),
    selectedYear,
    runningMonth,
    runningMonthLabel: getMonthLabel(runningMonth),
    runningYear,
    daysInSelectedMonth,

    todayTotalPatients,
    todayCompletedDialysis,
    dialysisPendingVerificationCount,
    logbookPendingVerificationCount,

    personalMonthlySessions: selectedMonthPoint.personalSessionsCount,
    personalMonthlyUniquePatients: selectedMonthPoint.personalUniquePatientsCount,
    personalVerifiedDaysCount,
    personalPendingSessions: selectedMonthPoint.personalPendingCount,

    unitMonthlySessions: selectedMonthPoint.unitSessionsCount,
    unitMonthlyUniquePatients: selectedMonthPoint.unitUniquePatientsCount,
    unitActiveDaysCount,
    unitPendingSessions: selectedMonthPoint.unitPendingCount,
    unitContributingStaffCount,
    personalSharePct,

    yearlySeries,
    yearlyTotalUnitSessions,
    yearlyTotalPersonalSessions,
    peakMonthPoint,

    dailySeries
  };
}
