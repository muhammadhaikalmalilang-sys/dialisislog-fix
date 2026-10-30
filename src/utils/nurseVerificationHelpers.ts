import { PatientHDSession, MasterNurse, SystemAccessRole } from '../types/dialysis.ts';
import {
  saveVerificationRegistryCloud,
  type NurseLogbookCloudData
} from '../services/firebase.ts';
import {
  indonesianDateLabelToIso,
  formatIsoDateToIndonesianFull,
  getCurrentIsoDateWib
} from './dateHelpers.ts';

export const VERIFICATION_REGISTRY_STORAGE_KEY = 'logbook_verification_registry_v5';
export const PER_PATIENT_STATUS_STORAGE_KEY = 'verifikasi_per_patient_status_v5';
export const FACILITY_STATUSES_STORAGE_KEY = 'logbook_facility_statuses_v6';
export const FACILITY_NOTES_STORAGE_KEY = 'logbook_facility_notes_v6';

export interface NurseVerificationInfo {
  status: 'belum_diajukan' | 'diajukan' | 'terverifikasi';
  isVerified: boolean;
  submittedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  verifiedByRole?: string;
  verifierNotes?: string;
  targetRole?: 'pj_shift' | 'kepala_ruangan' | 'mandiri';
  targetVerifierName?: string;
}

export interface LogbookVerificationRegistryEntry {
  id: string;
  submittedNurseName: string;
  submittedNurseNip?: string;
  submittedNurseRole: 'perawat_pelaksana' | 'pj_shift' | 'kepala_ruangan';
  targetRole: 'pj_shift' | 'kepala_ruangan' | 'mandiri';
  targetVerifierName: string;
  targetVerifierNip?: string;
  status: 'belum_diajukan' | 'diajukan' | 'terverifikasi';
  shift?: string;
  dateKey?: string;
  dateLabel?: string;
  submittedAt?: string;
  submittedEpoch?: number;
  verifiedAt?: string;
  verifiedBy?: string;
  verifiedByRole?: string;
  pelaksanaNotes?: string;
  verifierNotes?: string;
  revisionRequested?: boolean;
  revisionRequestedAt?: string;
  revisionRequestedBy?: string;
  revisionRequestedByRole?: string;
  revisionEpoch?: number;
  facilityCompleted?: number;
  facilityTotal?: number;
  patients?: ManagedPatientMinimal[];
}

export interface ManagedPatientMinimal {
  id?: string;
  bedNumber: string;
  patientName: string;
  medicalRecord?: string;
  status?: 'belum_diajukan' | 'diajukan' | 'terverifikasi';
  submittedAt?: string;
  submittedEpoch?: number;
  verifiedAt?: string;
  verifiedBy?: string;
  verifiedByRole?: string;
  verifierNotes?: string;
  revisionRequested?: boolean;
  revisionRequestedAt?: string;
  revisionRequestedBy?: string;
  revisionRequestedByRole?: string;
  revisionEpoch?: number;
}

export interface LogbookLockState {
  status: 'belum_diajukan' | 'diajukan' | 'terverifikasi';
  isSubmitted: boolean;
  isVerified: boolean;
  isLocked: boolean;
  canEdit: boolean;
  hasRevisionRequest: boolean;
}

/**
 * Returns true if the given system role acts as an authorized logbook verifier
 * (PJ Shift, Kepala Ruangan, or Administrator) who can edit submitted ('diajukan') logbooks.
 */
export function canVerifierRoleEditSubmitted(role?: SystemAccessRole): boolean {
  return role === 'pj_shift' || role === 'kepala_ruangan' || role === 'administrator';
}

/**
 * Centralized rule for logbook editability:
 * - Verified ('terverifikasi') -> LOCKED for everyone until verifier requests repair
 * - Waiting for verification ('diajukan') -> LOCKED for submitting nurse, UNLOCKED for Verifier (PJ Shift & Kepala Ruang)
 * - Draft or returned for repair by verifier ('belum_diajukan') -> UNLOCKED on the active day
 */
export function resolveLogbookLockState(params: {
  status?: 'belum_diajukan' | 'diajukan' | 'terverifikasi';
  revisionRequested?: boolean;
  verifierNotes?: string;
  isToday?: boolean;
  isVerifier?: boolean;
}): LogbookLockState {
  const effectiveStatus = params.status || 'belum_diajukan';
  const isToday = params.isToday !== false;
  const isSubmitted = effectiveStatus === 'diajukan';
  const isVerified = effectiveStatus === 'terverifikasi';
  const isVerifier = Boolean(params.isVerifier);
  const hasRevisionRequest =
    effectiveStatus === 'belum_diajukan' &&
    (Boolean(params.revisionRequested) || Boolean(params.verifierNotes?.trim()));

  const isLocked = isVerified ? true : isSubmitted ? !isVerifier : !isToday;

  return {
    status: effectiveStatus,
    isSubmitted,
    isVerified,
    isLocked,
    canEdit: !isLocked,
    hasRevisionRequest
  };
}

/**
 * Normalizes nurse name for resilient comparison across titles, honorifics, and spacing.
 * Examples: "Ners Rina S.Kep", "Ns. Rina Kartika, S.Kep.", "M. Haikal Malilang, A.Md. Kep."
 */
export function normalizeNurseName(name?: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(
      /\b(ners|ns|s\.kep\.|s\.kep|a\.md\.kep|a\.md\. kep\.|a\.md|kep|skep|dr|sp\.pd-kgh|sp\.pd|pw)\b/gi,
      ''
    )
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getNurseStorageKey(nurseName?: string): string {
  const norm = normalizeNurseName(nurseName);
  return (norm || 'default').replace(/[^a-z0-9]+/g, '_');
}

export function getNurseManagedPatientsKey(nurseName: string): string {
  return `logbook_managed_patients_v5_${getNurseStorageKey(nurseName)}`;
}

export function getNurseShiftScheduleKey(nurseName: string): string {
  return `logbook_shift_schedule_v6_${getNurseStorageKey(nurseName)}`;
}

export function getNursePatientStatusesKey(nurseName: string): string {
  return `logbook_patient_statuses_v6_${getNurseStorageKey(nurseName)}`;
}

export function getNursePatientNotesKey(nurseName: string): string {
  return `logbook_patient_notes_v6_${getNurseStorageKey(nurseName)}`;
}

export function getNurseClinicalDetailsKey(nurseName: string): string {
  return `logbook_clinical_details_v6_${getNurseStorageKey(nurseName)}`;
}

export function getNurseSubmissionKey(nurseName: string): string {
  return `logbook_pj_verification_v6_${getNurseStorageKey(nurseName)}`;
}

export function getNursePatientSubmissionsKey(nurseName: string): string {
  return `logbook_patient_submissions_v1_${getNurseStorageKey(nurseName)}`;
}

export function getNurseFacilityStatusesKey(nurseName: string): string {
  return `logbook_facility_statuses_v6_${getNurseStorageKey(nurseName)}`;
}

export function getNurseFacilityNotesKey(nurseName: string): string {
  return `logbook_facility_notes_v6_${getNurseStorageKey(nurseName)}`;
}

export function getNurseShiftDoctorsKey(nurseName: string): string {
  return `logbook_shift_doctors_v1_${getNurseStorageKey(nurseName)}`;
}

export function getNurseLastActiveDateKey(nurseName: string): string {
  return `logbook_active_date_v6_${getNurseStorageKey(nurseName)}`;
}

export function getNurseMonthlySnapshotsKey(nurseName: string): string {
  return `logbook_monthly_verified_snapshots_v1_${getNurseStorageKey(nurseName)}`;
}

export function touchNurseDailyStorage(nurseName: string, dateIso?: string): void {
  if (typeof window === 'undefined' || !window.localStorage || !nurseName || nurseName === '-') {
    return;
  }
  try {
    const today = dateIso || getCurrentIsoDateWib();
    localStorage.setItem(getNurseLastActiveDateKey(nurseName), today);
  } catch {
    // ignore
  }
}

/**
 * Resets local daily logbook data for a specific nurse to empty/clean state.
 * Called automatically when calendar day changes.
 */
export function clearNurseDailyLogbookStorage(nurseName: string, newDateIso?: string): void {
  if (typeof window === 'undefined' || !window.localStorage || !nurseName || nurseName === '-') {
    return;
  }
  try {
    localStorage.removeItem(getNurseManagedPatientsKey(nurseName));
    localStorage.removeItem(getNurseClinicalDetailsKey(nurseName));
    localStorage.removeItem(getNurseFacilityStatusesKey(nurseName));
    localStorage.removeItem(getNurseFacilityNotesKey(nurseName));
    localStorage.removeItem(getNursePatientStatusesKey(nurseName));
    localStorage.removeItem(getNursePatientNotesKey(nurseName));
    localStorage.removeItem(getNurseSubmissionKey(nurseName));
    localStorage.removeItem(getNursePatientSubmissionsKey(nurseName));
    localStorage.removeItem(getNurseShiftDoctorsKey(nurseName));
    if (newDateIso) {
      localStorage.setItem(getNurseLastActiveDateKey(nurseName), newDateIso);
    }
  } catch {
    // ignore
  }
}

/**
 * Checks whether stored daily logbook data belongs to an older day.
 * If so, clears the outdated storage and returns true (reset performed).
 */
export function checkAndResetOutdatedNurseDailyStorage(nurseName: string, todayIso: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage || !nurseName || nurseName === '-') {
    return false;
  }
  try {
    const lastActive = localStorage.getItem(getNurseLastActiveDateKey(nurseName));
    if (lastActive && lastActive !== todayIso) {
      clearNurseDailyLogbookStorage(nurseName, todayIso);
      return true;
    }
    // Also check if submission in storage has a past date
    const savedSubRaw = localStorage.getItem(getNurseSubmissionKey(nurseName));
    if (savedSubRaw) {
      try {
        const parsedSub = JSON.parse(savedSubRaw);
        const subDate = parsedSub?.dateKey || (parsedSub?.dateLabel ? indonesianDateLabelToIso(parsedSub.dateLabel) : '');
        if (subDate && subDate !== todayIso) {
          clearNurseDailyLogbookStorage(nurseName, todayIso);
          return true;
        }
      } catch {
        // ignore
      }
    }
    if (!lastActive) {
      localStorage.setItem(getNurseLastActiveDateKey(nurseName), todayIso);
    }
  } catch {
    // ignore
  }
  return false;
}

export function readNurseFacilityStatuses(nurseName: string): Record<string, boolean> {
  const emptyDefaults: Record<string, boolean> = {
    '1.1': false,
    '1.2': false,
    '1.3': false
  };
  if (typeof window === 'undefined' || !window.localStorage || !nurseName || nurseName === '-') {
    return emptyDefaults;
  }
  try {
    const perNurseRaw = localStorage.getItem(getNurseFacilityStatusesKey(nurseName));
    if (perNurseRaw) {
      const parsed = JSON.parse(perNurseRaw);
      if (parsed && typeof parsed === 'object') {
        return { ...emptyDefaults, ...parsed };
      }
    }
    // Backward compatibility fallback ONLY if this nurse already has an active registry submission for TODAY
    const todayIso = getCurrentIsoDateWib();
    const hasRegistryEntryToday = getVerificationRegistry().some(
      (e) =>
        isMatchingNurse(e.submittedNurseName, nurseName) &&
        (e.dateKey === todayIso || (e.dateLabel ? indonesianDateLabelToIso(e.dateLabel) === todayIso : false))
    );
    if (hasRegistryEntryToday) {
      const legacyRaw = localStorage.getItem(FACILITY_STATUSES_STORAGE_KEY);
      if (legacyRaw) {
        const parsedLegacy = JSON.parse(legacyRaw);
        if (parsedLegacy && typeof parsedLegacy === 'object') {
          return { ...emptyDefaults, ...parsedLegacy };
        }
      }
    }
  } catch {
    // ignore
  }
  return emptyDefaults;
}

export function readNurseFacilityNotes(nurseName: string): Record<string, string> {
  const emptyNotes: Record<string, string> = {
    '1.1': '',
    '1.2': '',
    '1.3': ''
  };
  if (typeof window === 'undefined' || !window.localStorage || !nurseName || nurseName === '-') {
    return emptyNotes;
  }
  try {
    const perNurseRaw = localStorage.getItem(getNurseFacilityNotesKey(nurseName));
    if (perNurseRaw) {
      const parsed = JSON.parse(perNurseRaw);
      if (parsed && typeof parsed === 'object') {
        return { ...emptyNotes, ...parsed };
      }
    }
  } catch {
    // ignore
  }
  return emptyNotes;
}

/**
 * Extracts canonical bed identifier so "BED A01" and "Bed A1" match,
 * "Bed 01" and "Bed 1" match, while "BED A01", "BED B01", "BED ISOLASI 01",
 * and "BED A10" NEVER collide with one another.
 */
export function extractBedCode(bed?: string): string {
  if (!bed) return '';
  const withoutParens = bed
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .trim();
  const core = withoutParens.replace(/^bed[\s_-]*/i, '').trim();
  const zoneNumMatch = core.match(/^([a-z]+)?[\s_-]*(\d+)\b/);
  if (zoneNumMatch) {
    const prefix = zoneNumMatch[1] ? `${zoneNumMatch[1]}_` : '';
    const num = parseInt(zoneNumMatch[2], 10);
    return `bed_${prefix}${num}`;
  }
  return withoutParens.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function isSameBed(bedA?: string, bedB?: string): boolean {
  const codeA = extractBedCode(bedA);
  const codeB = extractBedCode(bedB);
  return Boolean(codeA && codeB && codeA === codeB);
}

/**
 * Deterministic per-patient verification storage key scoped by managing nurse, bed, and RM.
 */
export function buildPatientVerificationKey(
  nurseName: string,
  bedNumber: string,
  medicalRecord?: string,
  dateKey?: string
): string {
  const nurseKey = getNurseStorageKey(nurseName);
  const bedKey = extractBedCode(bedNumber) || 'bed_0';
  const rmKey = (medicalRecord || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '') || '0';
  const base = `${nurseKey}__${bedKey}__${rmKey}`;
  return dateKey ? `${base}__${dateKey}` : base;
}

/**
 * Checks whether two nurse names or identities refer to the same clinical nurse.
 */
export function isMatchingNurse(nurseA?: string, nurseB?: string): boolean {
  if (!nurseA || !nurseB) return false;
  const rawA = nurseA.trim().toLowerCase();
  const rawB = nurseB.trim().toLowerCase();
  if (rawA === rawB) return true;

  const normA = normalizeNurseName(nurseA);
  const normB = normalizeNurseName(nurseB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;

  const wordsA = normA.split(' ').filter((w) => w.length > 2);
  const wordsB = normB.split(' ').filter((w) => w.length > 2);

  if (wordsA.length > 0 && wordsB.length > 0) {
    const aInB = wordsA.every((w) => wordsB.includes(w) || normB.includes(w));
    const bInA = wordsB.every((w) => wordsA.includes(w) || normA.includes(w));
    if (aInB || bInA) return true;
  }

  return false;
}

/**
 * Checks if a patient session was managed by the specified nurse.
 */
export function isSessionManagedByNurse(
  session: PatientHDSession,
  targetNurseName?: string,
  managedPatients?: ManagedPatientMinimal[]
): boolean {
  if (!targetNurseName) return false;

  if (session.nurseInCharge && isMatchingNurse(session.nurseInCharge, targetNurseName)) {
    return true;
  }

  // If session already belongs to a DIFFERENT nurse, it strictly does not belong to targetNurseName
  if (session.nurseInCharge && !isMatchingNurse(session.nurseInCharge, targetNurseName)) {
    return false;
  }

  if (managedPatients && managedPatients.length > 0) {
    const cleanRm = session.medicalRecordNumber?.trim().toLowerCase();
    const cleanName = session.patientName?.trim().toLowerCase();

    return managedPatients.some((mp) => {
      const mpRm = mp.medicalRecord?.trim().toLowerCase();
      const mpName = mp.patientName?.trim().toLowerCase();

      if (isSameBed(session.bedNumber, mp.bedNumber)) {
        return true;
      }
      if (cleanRm && mpRm && cleanRm === mpRm) {
        return true;
      }
      if (cleanName && mpName && cleanName === mpName) {
        return true;
      }
      return false;
    });
  }

  return false;
}

export const INITIAL_VERIFICATION_REGISTRY: LogbookVerificationRegistryEntry[] = [];

export function getVerificationRegistry(
  _masterNurses?: MasterNurse[],
  _defaultPj: string = '-',
  _defaultKaru: string = '-'
): LogbookVerificationRegistryEntry[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return INITIAL_VERIFICATION_REGISTRY;
  }
  try {
    const raw = localStorage.getItem(VERIFICATION_REGISTRY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }

  try {
    localStorage.setItem(
      VERIFICATION_REGISTRY_STORAGE_KEY,
      JSON.stringify(INITIAL_VERIFICATION_REGISTRY)
    );
  } catch {
    // ignore
  }
  return INITIAL_VERIFICATION_REGISTRY;
}

export function saveVerificationRegistry(entries: LogbookVerificationRegistryEntry[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(VERIFICATION_REGISTRY_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
  // Cloud Firestore multi-device broadcast
  saveVerificationRegistryCloud(entries).catch(() => {});
}

export function upsertVerificationRegistryEntry(entry: LogbookVerificationRegistryEntry): void {
  const current = getVerificationRegistry();
  const index = current.findIndex((e) => {
    if (entry.id && e.id === entry.id) return true;
    const sameNurse = isMatchingNurse(e.submittedNurseName, entry.submittedNurseName);
    if (!sameNurse) return false;
    // If both entries have dateKey, preserve different dates
    if (entry.dateKey && e.dateKey && entry.dateKey !== e.dateKey) {
      return false;
    }
    // If both entries have shift, preserve different shifts
    if (entry.shift && e.shift && entry.shift !== e.shift) {
      return false;
    }
    return true;
  });
  let updated: LogbookVerificationRegistryEntry[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = {
      ...updated[index],
      ...entry,
      patients: entry.patients ?? updated[index].patients
    };
  } else {
    updated = [entry, ...current];
  }
  saveVerificationRegistry(updated);
}

export function resetVerificationStorageToBenchmark(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (
        k &&
        (k.startsWith('logbook_managed_patients_v5_') ||
          k.startsWith('logbook_shift_schedule_v6_') ||
          k.startsWith('logbook_patient_statuses_v5_') ||
          k.startsWith('logbook_patient_statuses_v6_') ||
          k.startsWith('logbook_patient_notes_v5_') ||
          k.startsWith('logbook_patient_notes_v6_') ||
          k.startsWith('logbook_clinical_details_v5_') ||
          k.startsWith('logbook_clinical_details_v6_') ||
          k.startsWith('logbook_pj_verification_v5_') ||
          k.startsWith('logbook_pj_verification_v6_') ||
          k.startsWith('logbook_patient_submissions_v1_') ||
          k.startsWith('logbook_facility_statuses_v6_') ||
          k.startsWith('logbook_facility_notes_v6_') ||
          k.startsWith('logbook_monthly_verified_snapshots_v1_'))
      ) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem(FACILITY_STATUSES_STORAGE_KEY);
    localStorage.removeItem(FACILITY_NOTES_STORAGE_KEY);
    localStorage.removeItem(PER_PATIENT_STATUS_STORAGE_KEY);
    localStorage.setItem(
      VERIFICATION_REGISTRY_STORAGE_KEY,
      JSON.stringify(INITIAL_VERIFICATION_REGISTRY)
    );
  } catch {
    // ignore
  }
}

/**
 * Resolves whether a verifier role/name represents Kepala Ruang vs PJ Shift.
 */
export function isKepalaRuangVerifier(verifiedByRole?: string, verifiedBy?: string): boolean {
  const roleLower = (verifiedByRole || '').trim().toLowerCase();
  if (
    roleLower.includes('kepala') ||
    roleLower.includes('ka.') ||
    roleLower.includes('karu')
  ) {
    return true;
  }
  if (
    roleLower.includes('pj') ||
    roleLower.includes('penanggung jawab')
  ) {
    return false;
  }
  const byLower = (verifiedBy || '').trim().toLowerCase();
  return byLower.includes('kepala ruang') || byLower.includes('karu') || byLower.includes('twis');
}

/**
 * Retrieves verification details for a specific nurse from per-nurse storage or registry.
 */
export function getNurseVerificationInfo(
  nurseName: string,
  _masterNurses: MasterNurse[] = [],
  cachedLiveRecord?: {
    status?: string;
    submittedNurseName?: string;
    submittedAt?: string;
    verifiedAt?: string;
    verifiedBy?: string;
    verifiedByRole?: string;
    verifierNotes?: string;
    targetRole?: 'pj_shift' | 'kepala_ruangan' | 'mandiri';
    targetVerifierName?: string;
  } | null
): NurseVerificationInfo {
  if (!nurseName) {
    return { status: 'belum_diajukan', isVerified: false };
  }

  // 1. Check explicit cached record if supplied
  if (
    cachedLiveRecord &&
    cachedLiveRecord.submittedNurseName &&
    isMatchingNurse(cachedLiveRecord.submittedNurseName, nurseName)
  ) {
    const status =
      (cachedLiveRecord.status as 'belum_diajukan' | 'diajukan' | 'terverifikasi') ||
      'belum_diajukan';
    return {
      status,
      isVerified: status === 'terverifikasi',
      submittedAt: cachedLiveRecord.submittedAt,
      verifiedAt: cachedLiveRecord.verifiedAt,
      verifiedBy: cachedLiveRecord.verifiedBy,
      verifiedByRole: cachedLiveRecord.verifiedByRole,
      verifierNotes: cachedLiveRecord.verifierNotes,
      targetRole: cachedLiveRecord.targetRole,
      targetVerifierName: cachedLiveRecord.targetVerifierName
    };
  }

  // 2. Check verification registry (primary shared source of truth)
  const regList = getVerificationRegistry();
  const foundReg = regList.find((e) => isMatchingNurse(e.submittedNurseName, nurseName));
  if (foundReg) {
    return {
      status: foundReg.status,
      isVerified: foundReg.status === 'terverifikasi',
      submittedAt: foundReg.submittedAt,
      verifiedAt: foundReg.verifiedAt,
      verifiedBy: foundReg.verifiedBy,
      verifiedByRole: foundReg.verifiedByRole,
      verifierNotes: foundReg.verifierNotes,
      targetRole: foundReg.targetRole,
      targetVerifierName: foundReg.targetVerifierName
    };
  }

  // 3. Check per-nurse localStorage submission
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem(getNurseSubmissionKey(nurseName));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const status =
            (parsed.status as 'belum_diajukan' | 'diajukan' | 'terverifikasi') ||
            'belum_diajukan';
          return {
            status,
            isVerified: status === 'terverifikasi',
            submittedAt: parsed.submittedAt,
            verifiedAt: parsed.verifiedAt,
            verifiedBy: parsed.verifiedBy,
            verifiedByRole: parsed.verifiedByRole,
            verifierNotes: parsed.verifierNotes,
            targetRole: parsed.targetRole,
            targetVerifierName: parsed.targetVerifierName
          };
        }
      }
    } catch {
      // ignore
    }
  }

  return {
    status: 'belum_diajukan',
    isVerified: false
  };
}

export interface SessionVerificationInfo {
  isVerified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
  verifiedByRole?: string;
  isVerifiedByPjShift: boolean;
  isVerifiedByKepalaRuang: boolean;
}

/**
 * Checks whether an individual patient session has been verified, and whether by PJ Shift or Kepala Ruang.
 */
export function isSessionVerifiedByPj(
  session: PatientHDSession,
  masterNurses: MasterNurse[] = []
): SessionVerificationInfo {
  // 0. If session was explicitly returned for revision by verifier, it is NOT verified
  if (
    session.revisionRequested &&
    session.verificationStatus === 'belum_diajukan' &&
    session.isVerifiedByPj !== true &&
    session.isVerifiedByKepalaRuang !== true
  ) {
    return {
      isVerified: false,
      isVerifiedByPjShift: false,
      isVerifiedByKepalaRuang: false
    };
  }

  // 1. Check explicit session-level verification metadata first (preserves historical verified records)
  if (
    session.isVerifiedByPj === true ||
    session.isVerifiedByKepalaRuang === true ||
    session.verificationStatus === 'terverifikasi'
  ) {
    const isKaru =
      Boolean(session.isVerifiedByKepalaRuang) ||
      isKepalaRuangVerifier(session.verifiedByRole, session.verifiedBy);

    return {
      isVerified: true,
      verifiedAt: session.verifiedAt,
      verifiedBy: session.verifiedBy || (isKaru ? 'Kepala Ruangan' : 'PJ Shift'),
      verifiedByRole:
        session.verifiedByRole || (isKaru ? 'Kepala Ruangan' : 'PJ Shift'),
      isVerifiedByKepalaRuang: isKaru,
      isVerifiedByPjShift: !isKaru
    };
  }

  // 2. Check deterministic per-patient override in localStorage
  if (typeof window !== 'undefined' && window.localStorage && session.nurseInCharge) {
    try {
      const raw = localStorage.getItem(PER_PATIENT_STATUS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const sDateIso = session.sessionDate || (session.date ? indonesianDateLabelToIso(session.date) : '');
          const exactDateKey = sDateIso
            ? buildPatientVerificationKey(
                session.nurseInCharge,
                session.bedNumber,
                session.medicalRecordNumber,
                sDateIso
              )
            : '';
          const exactKey = buildPatientVerificationKey(
            session.nurseInCharge,
            session.bedNumber,
            session.medicalRecordNumber
          );
          const fallbackNoRmKey = buildPatientVerificationKey(
            session.nurseInCharge,
            session.bedNumber,
            '0'
          );
          const perPatientRecord =
            (exactDateKey && parsed[exactDateKey]) || parsed[exactKey] || parsed[fallbackNoRmKey];

          if (perPatientRecord && perPatientRecord.status) {
            if (perPatientRecord.status !== 'terverifikasi') {
              return {
                isVerified: false,
                isVerifiedByPjShift: false,
                isVerifiedByKepalaRuang: false
              };
            }
            const isKaru = isKepalaRuangVerifier(
              perPatientRecord.verifiedByRole,
              perPatientRecord.verifiedBy
            );
            return {
              isVerified: true,
              verifiedAt: perPatientRecord.verifiedAt || session.verifiedAt,
              verifiedBy:
                perPatientRecord.verifiedBy ||
                session.verifiedBy ||
                (isKaru ? 'Kepala Ruangan' : 'PJ Shift'),
              verifiedByRole:
                perPatientRecord.verifiedByRole ||
                session.verifiedByRole ||
                (isKaru ? 'Kepala Ruangan' : 'PJ Shift'),
              isVerifiedByKepalaRuang: isKaru,
              isVerifiedByPjShift: !isKaru
            };
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // 3. Explicitly unverified status on session
  if (
    session.isVerifiedByPj === false ||
    session.verificationStatus === 'diajukan' ||
    session.verificationStatus === 'belum_diajukan'
  ) {
    return {
      isVerified: false,
      isVerifiedByPjShift: false,
      isVerifiedByKepalaRuang: false
    };
  }

  // 4. Fallback to nurse registry status only when session has no explicit verification flags
  if (session.nurseInCharge) {
    const nurseInfo = getNurseVerificationInfo(session.nurseInCharge, masterNurses);
    if (nurseInfo.isVerified) {
      const isKaru = isKepalaRuangVerifier(nurseInfo.verifiedByRole, nurseInfo.verifiedBy);
      return {
        isVerified: true,
        verifiedAt: nurseInfo.verifiedAt || session.verifiedAt,
        verifiedBy:
          nurseInfo.verifiedBy ||
          session.verifiedBy ||
          (isKaru ? 'Kepala Ruangan' : 'PJ Shift'),
        verifiedByRole:
          nurseInfo.verifiedByRole ||
          session.verifiedByRole ||
          (isKaru ? 'Kepala Ruangan' : 'PJ Shift'),
        isVerifiedByKepalaRuang: isKaru,
        isVerifiedByPjShift: !isKaru
      };
    }
  }

  return {
    isVerified: false,
    isVerifiedByPjShift: false,
    isVerifiedByKepalaRuang: false
  };
}

export interface AvailableDateOption {
  isoDate: string;
  fullDate: string;
  count: number;
}

/**
 * Filters the list of patient sessions for the Riwayat view strictly following the 3-role workflow:
 * 1. Perawat Pelaksana: data logbook pasien kelolaan sendiri yang SUDAH diverifikasi oleh PJ Shift.
 * 2. PJ Shift: data logbook yang telah diverifikasi (dapat melihat semua perawat pelaksana terverifikasi atau pasien kelolaan mandiri).
 * 3. Kepala Ruang: rekap arsip seluruh logbook terverifikasi di unit hemodialisis.
 */
export function filterSessionsForNurseRiwayat(
  sessions: PatientHDSession[],
  currentNurseName: string,
  userRole: SystemAccessRole = 'perawat_pelaksana',
  selectedNurseFilter: string = 'mine',
  masterNurses: MasterNurse[] = [],
  managedPatients?: ManagedPatientMinimal[],
  selectedDateFilter: string = 'all',
  selectedShiftFilter: string = 'all'
): {
  visibleSessions: PatientHDSession[];
  allAvailableDates: AvailableDateOption[];
  totalManagedByNurse: number;
  unverifiedManagedCount: number;
  isCurrentNurseVerified: boolean;
  currentNurseStatus: 'belum_diajukan' | 'diajukan' | 'terverifikasi';
  otherNursesHiddenCount: number;
  verifiedByPjCount: number;
  verifiedByKaruCount: number;
} {
  const isSupervisor =
    userRole === 'pj_shift' || userRole === 'kepala_ruangan' || userRole === 'administrator';

  // Determine target scope based on role and selected nurse filter
  const isStrictPersonalMode =
    !isSupervisor ||
    selectedNurseFilter === 'mine' ||
    (selectedNurseFilter !== 'all' && isMatchingNurse(selectedNurseFilter, currentNurseName));

  let scopeSessions: PatientHDSession[] = [];
  let otherNursesHiddenCount = 0;

  if (isStrictPersonalMode) {
    const targetNurse = currentNurseName;
    scopeSessions = sessions.filter((s) =>
      isSessionManagedByNurse(s, targetNurse, managedPatients)
    );
    otherNursesHiddenCount = sessions.length - scopeSessions.length;
  } else if (selectedNurseFilter && selectedNurseFilter !== 'all') {
    scopeSessions = sessions.filter((s) =>
      isMatchingNurse(s.nurseInCharge, selectedNurseFilter)
    );
    otherNursesHiddenCount = sessions.length - scopeSessions.length;
  } else {
    // All nurses across the unit (for PJ Shift / Kepala Ruang / Administrator)
    scopeSessions = sessions;
    otherNursesHiddenCount = 0;
  }

  const verifInfo = getNurseVerificationInfo(currentNurseName, masterNurses);

  // Filter for verified status based on clinical governance rules:
  // Untuk hak akses Perawat Pelaksana, PJ Shift dan Kepala Ruang:
  // Halaman riwayat menampilkan seluruh logbook pasien kelolaan pribadi yang sudah diverifikasi PJ Shift atau Kepala Ruang.
  let verifiedSessionsPool: PatientHDSession[] = [];

  if (isStrictPersonalMode) {
    verifiedSessionsPool = scopeSessions.filter((s) => {
      const sVerif = isSessionVerifiedByPj(s, masterNurses);
      return sVerif.isVerified && (sVerif.isVerifiedByPjShift || sVerif.isVerifiedByKepalaRuang);
    });
  } else {
    // Supervisor unit overview (PJ Shift / Kepala Ruang / Administrator melihat pasien terverifikasi dari seluruh unit)
    verifiedSessionsPool = scopeSessions.filter((s) => {
      const sVerif = isSessionVerifiedByPj(s, masterNurses);
      return sVerif.isVerified;
    });
  }

  // Extract all distinct dates available in the verified pool
  const dateMap = new Map<string, { isoDate: string; fullDate: string; count: number }>();
  verifiedSessionsPool.forEach((s) => {
    const iso =
      s.sessionDate ||
      (s.date ? indonesianDateLabelToIso(s.date) : '') ||
      '2026-10-26';
    const full =
      s.date ||
      formatIsoDateToIndonesianFull(iso);

    const existing = dateMap.get(iso) || { isoDate: iso, fullDate: full, count: 0 };
    existing.count += 1;
    dateMap.set(iso, existing);
  });

  const allAvailableDates = Array.from(dateMap.values()).sort((a, b) =>
    b.isoDate.localeCompare(a.isoDate)
  );

  // Apply Date and Shift filtering on the verified pool
  const visibleSessions = verifiedSessionsPool.filter((s) => {
    // Date filter
    if (selectedDateFilter && selectedDateFilter !== 'all') {
      const sIso =
        s.sessionDate || (s.date ? indonesianDateLabelToIso(s.date) : '');
      const filterIso = selectedDateFilter.includes('-')
        ? selectedDateFilter
        : indonesianDateLabelToIso(selectedDateFilter);

      const matchesIso = Boolean(sIso && filterIso && sIso === filterIso);
      const matchesDateLabel = Boolean(
        s.date && s.date.toLowerCase().trim() === selectedDateFilter.toLowerCase().trim()
      );
      if (!matchesIso && !matchesDateLabel) return false;
    }

    // Shift filter
    if (selectedShiftFilter && selectedShiftFilter !== 'all') {
      if (s.shift && s.shift !== selectedShiftFilter) return false;
    }

    return true;
  });

  const unverifiedManagedCount = Math.max(0, scopeSessions.length - verifiedSessionsPool.length);

  const verifiedByPjCount = scopeSessions.filter((s) => {
    const v = isSessionVerifiedByPj(s, masterNurses);
    return v.isVerified && v.isVerifiedByPjShift;
  }).length;

  const verifiedByKaruCount = scopeSessions.filter((s) => {
    const v = isSessionVerifiedByPj(s, masterNurses);
    return v.isVerified && v.isVerifiedByKepalaRuang;
  }).length;

  const isEffectivelyVerified =
    scopeSessions.length > 0 && verifiedSessionsPool.length === scopeSessions.length;

  return {
    visibleSessions,
    allAvailableDates,
    totalManagedByNurse: scopeSessions.length,
    unverifiedManagedCount,
    isCurrentNurseVerified: isEffectivelyVerified || verifInfo.isVerified,
    currentNurseStatus: isEffectivelyVerified ? 'terverifikasi' : verifInfo.status,
    otherNursesHiddenCount,
    verifiedByPjCount,
    verifiedByKaruCount
  };
}

/**
 * Filters the verification submissions for the Verifikasi tab based on user's role:
 * 1. PJ SHIFT:
 *    - Only display submissions targeted specifically to THIS PJ Shift (`targetRole === 'pj_shift'` and matching `targetVerifierName`).
 *    - Submissions not directed to this PJ Shift (e.g., to another PJ Shift or to Kepala Ruang) are NOT displayed.
 * 2. KEPALA RUANG:
 *    - Only display submissions targeted to Kepala Ruang (`targetRole === 'kepala_ruangan'` or `'mandiri'`).
 *    - Submissions not directed to Kepala Ruang (e.g., Pelaksana -> PJ Shift, or Kepala Ruang -> PJ Shift) are NOT displayed.
 * 3. ADMINISTRATOR:
 *    - Can view all submitted entries.
 */
export function filterVerificationQueueForUser(
  entries: LogbookVerificationRegistryEntry[],
  userRole: SystemAccessRole,
  userName: string
): LogbookVerificationRegistryEntry[] {
  // Exclude drafts that have never been submitted and were not returned with revision notes
  const submittedOrReviewed = entries.filter(
    (e) =>
      e.status !== 'belum_diajukan' ||
      Boolean(e.revisionRequested) ||
      Boolean(e.verifierNotes) ||
      Boolean(
        e.patients?.some(
          (p) =>
            (p.status && p.status !== 'belum_diajukan') ||
            Boolean(p.revisionRequested) ||
            Boolean(p.verifierNotes)
        )
      )
  );

  if (userRole === 'administrator') {
    return submittedOrReviewed;
  }

  if (userRole === 'pj_shift') {
    return submittedOrReviewed.filter((e) => {
      const isPjTarget = e.targetRole === 'pj_shift';
      const isTargetedToMe = isMatchingNurse(e.targetVerifierName, userName);
      // PJ Shift cannot verify their own logbook
      const isOwnSubmission = isMatchingNurse(e.submittedNurseName, userName);
      return isPjTarget && isTargetedToMe && !isOwnSubmission;
    });
  }

  if (userRole === 'kepala_ruangan') {
    return submittedOrReviewed.filter((e) => {
      const isKaruTarget = e.targetRole === 'kepala_ruangan' || e.targetRole === 'mandiri';
      const isTargetedToMe =
        isMatchingNurse(e.targetVerifierName, userName) ||
        !e.targetVerifierName ||
        e.targetRole === 'mandiri';
      return isKaruTarget && isTargetedToMe;
    });
  }

  return [];
}

// ============================================================================
// CROSS-NURSE & ALL-ROLE LOGBOOK PATIENT + BED EXCLUSIVITY HELPERS
// ============================================================================

export interface ClaimedLogbookAsset {
  patientName: string;
  medicalRecord?: string;
  bedNumber: string;
  bedCode: string;
  nurseName: string;
  shift?: string;
  dateIso: string;
  sessionId?: string;
}

export interface CollectOccupiedLogbookAssetsParams {
  activeDateIso: string;
  activeShift: 'Pagi' | 'Siang';
  /**
   * When provided (e.g. inside a nurse's personal Logbook view), assets belonging
   * to `currentNurseName` are excluded from "other nurses" (since own-list checks
   * are handled separately). When omitted (e.g. creating a new session in SessionModal),
   * assets from ALL nurses are treated as occupied.
   */
  currentNurseName?: string;
  /**
   * Optional session currently being edited (e.g. inside SessionModal) so its own
   * patient & bed do not collide with itself while still blocking all other nurses/sessions.
   */
  excludeSession?: {
    id?: string;
    nurseName?: string;
    patientName?: string;
    medicalRecord?: string;
    bedNumber?: string;
  } | null;
  sessions?: PatientHDSession[];
  registryEntries?: LogbookVerificationRegistryEntry[];
  cloudNurseLogbooks?: NurseLogbookCloudData[];
  masterNurses?: MasterNurse[];
  includeLocalNurseStorage?: boolean;
}

export interface OccupiedLogbookAssetsResult {
  claimedPatientsByOther: ClaimedLogbookAsset[];
  claimedBedsByOtherOnShift: ClaimedLogbookAsset[];
  findPatientClaimedByOther: (candidate: {
    patientName?: string;
    medicalRecord?: string;
  }) => ClaimedLogbookAsset | null;
  findBedClaimedByOther: (bedNumber?: string) => ClaimedLogbookAsset | null;
}

export function normalizePatientRm(rm?: string): string {
  if (!rm) return '';
  const cleaned = rm.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!cleaned || cleaned === '0' || cleaned === '-') return '';
  return cleaned;
}

export function normalizePatientNameKey(name?: string): string {
  if (!name) return '';
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function isSamePatientIdentity(
  a: { patientName?: string; medicalRecord?: string },
  b: { patientName?: string; medicalRecord?: string }
): boolean {
  const rmA = normalizePatientRm(a.medicalRecord);
  const rmB = normalizePatientRm(b.medicalRecord);
  if (rmA && rmB && rmA === rmB) {
    return true;
  }
  const nameA = normalizePatientNameKey(a.patientName);
  const nameB = normalizePatientNameKey(b.patientName);
  if (nameA.length >= 2 && nameB.length >= 2 && nameA === nameB) {
    return true;
  }
  return false;
}

function normalizeShiftLabel(rawShift?: string): 'Pagi' | 'Siang' | undefined {
  if (!rawShift) return undefined;
  const lower = rawShift.trim().toLowerCase();
  if (lower.includes('siang')) return 'Siang';
  if (lower.includes('pagi')) return 'Pagi';
  return undefined;
}

/**
 * Collects all patients and beds already inputted into logbooks across ALL access roles
 * (Perawat Pelaksana, PJ Shift, Kepala Ruang, Administrator) from live sessions,
 * Cloud Firestore nurse_logbooks, verification registry, and local per-nurse storage.
 */
export function collectOccupiedLogbookAssets(
  params: CollectOccupiedLogbookAssetsParams
): OccupiedLogbookAssetsResult {
  const {
    activeDateIso,
    activeShift,
    currentNurseName,
    excludeSession,
    sessions = [],
    registryEntries = [],
    cloudNurseLogbooks = [],
    masterNurses = [],
    includeLocalNurseStorage = true
  } = params;

  const claimedPatientsByOther: ClaimedLogbookAsset[] = [];
  const claimedBedsByOtherOnShift: ClaimedLogbookAsset[] = [];

  if (!activeDateIso) {
    return {
      claimedPatientsByOther,
      claimedBedsByOtherOnShift,
      findPatientClaimedByOther: () => null,
      findBedClaimedByOther: () => null
    };
  }

  const isOwnedByCurrentContext = (ownerNurse?: string): boolean => {
    if (!currentNurseName || currentNurseName === '-') return false;
    if (!ownerNurse || ownerNurse === '-') return false;
    return isMatchingNurse(ownerNurse, currentNurseName);
  };

  const isExcludedSelfEntry = (candidate: {
    sessionId?: string;
    nurseName?: string;
    patientName?: string;
    medicalRecord?: string;
    bedNumber?: string;
  }): boolean => {
    if (!excludeSession) return false;
    if (excludeSession.id && candidate.sessionId && excludeSession.id === candidate.sessionId) {
      return true;
    }
    const sameOwner =
      excludeSession.nurseName &&
      candidate.nurseName &&
      isMatchingNurse(excludeSession.nurseName, candidate.nurseName);
    if (!sameOwner) return false;

    const samePat = isSamePatientIdentity(
      {
        patientName: excludeSession.patientName,
        medicalRecord: excludeSession.medicalRecord
      },
      {
        patientName: candidate.patientName,
        medicalRecord: candidate.medicalRecord
      }
    );
    const sameBed =
      Boolean(excludeSession.bedNumber && candidate.bedNumber) &&
      isSameBed(excludeSession.bedNumber, candidate.bedNumber);
    return samePat || sameBed;
  };

  const registerAsset = (raw: {
    patientName?: string;
    medicalRecord?: string;
    bedNumber?: string;
    nurseName?: string;
    shift?: string;
    dateIso: string;
    sessionId?: string;
  }) => {
    const owner = (raw.nurseName || '').trim() || 'Perawat Lain';
    if (isOwnedByCurrentContext(owner)) return;
    if (isExcludedSelfEntry({ ...raw, nurseName: owner })) return;

    const patName = (raw.patientName || '').trim();
    const patRm = (raw.medicalRecord || '').trim();
    const bedNum = (raw.bedNumber || '').trim();
    const bedCode = extractBedCode(bedNum);
    const normShift = normalizeShiftLabel(raw.shift);

    const record: ClaimedLogbookAsset = {
      patientName: patName || bedNum || 'Pasien HD',
      medicalRecord: patRm || undefined,
      bedNumber: bedNum,
      bedCode,
      nurseName: owner,
      shift: normShift,
      dateIso: raw.dateIso,
      sessionId: raw.sessionId
    };

    // 1. Patient lock on activeDateIso (an inputted HD patient cannot be selected again by another nurse)
    if (normalizePatientNameKey(patName).length >= 2 || normalizePatientRm(patRm)) {
      const alreadyRecordedPat = claimedPatientsByOther.some((existing) =>
        isSamePatientIdentity(existing, record)
      );
      if (!alreadyRecordedPat) {
        claimedPatientsByOther.push(record);
      }
    }

    // 2. Bed lock on (activeDateIso + activeShift)
    const matchesActiveShift = !normShift || normShift === activeShift;
    if (bedCode && matchesActiveShift) {
      const alreadyRecordedBed = claimedBedsByOtherOnShift.some(
        (existing) => existing.bedCode === bedCode
      );
      if (!alreadyRecordedBed) {
        claimedBedsByOtherOnShift.push(record);
      }
    }
  };

  // Track local per-nurse storage on this browser (if active today) so local deletions are respected immediately
  const localAuthoritativeNurseKeys = new Set<string>();

  if (includeLocalNurseStorage && typeof window !== 'undefined' && window.localStorage) {
    try {
      const processLocalNurse = (nurseDisplayName: string, storageSuffix: string) => {
        if (!storageSuffix || localAuthoritativeNurseKeys.has(storageSuffix)) return;
        const lastActive = localStorage.getItem(`logbook_active_date_v6_${storageSuffix}`);
        if (lastActive !== activeDateIso) return;
        const rawManaged = localStorage.getItem(`logbook_managed_patients_v5_${storageSuffix}`);
        if (rawManaged === null) return;

        localAuthoritativeNurseKeys.add(storageSuffix);
        if (isOwnedByCurrentContext(nurseDisplayName)) return;

        const savedShift =
          localStorage.getItem(`logbook_shift_schedule_v6_${storageSuffix}`) || undefined;
        const parsedManaged = JSON.parse(rawManaged);
        if (Array.isArray(parsedManaged)) {
          parsedManaged.forEach((mp: any) => {
            if (mp && typeof mp === 'object') {
              registerAsset({
                patientName: mp.patientName,
                medicalRecord: mp.medicalRecord,
                bedNumber: mp.bedNumber,
                nurseName: nurseDisplayName,
                shift: savedShift,
                dateIso: activeDateIso
              });
            }
          });
        }
      };

      // Check known masterNurses first for exact display names
      masterNurses.forEach((n) => {
        if (n.name && n.name !== '-') {
          processLocalNurse(n.name, getNurseStorageKey(n.name));
        }
      });

      // Also scan any additional account keys (e.g. Administrator or custom nurse accounts)
      const prefix = 'logbook_managed_patients_v5_';
      const currentStorageSuffix = currentNurseName ? getNurseStorageKey(currentNurseName) : '';
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const suffix = key.slice(prefix.length);
          if (!suffix || suffix === currentStorageSuffix || localAuthoritativeNurseKeys.has(suffix)) {
            continue;
          }
          let displayName = suffix.replace(/_/g, ' ').toUpperCase();
          try {
            const rawSub = localStorage.getItem(`logbook_pj_verification_v6_${suffix}`);
            if (rawSub) {
              const parsedSub = JSON.parse(rawSub);
              if (parsedSub?.submittedNurseName && parsedSub.submittedNurseName !== '-') {
                displayName = parsedSub.submittedNurseName;
              }
            }
          } catch {
            // ignore
          }
          processLocalNurse(displayName, suffix);
        }
      }
    } catch {
      // ignore storage errors
    }
  }

  // 1. Live PatientHDSession records (Firestore / App state)
  sessions.forEach((s) => {
    if (s.sessionStatus === 'batal') return;
    const sDateIso = s.sessionDate || (s.date ? indonesianDateLabelToIso(s.date) : '');
    if (sDateIso !== activeDateIso) return;
    registerAsset({
      patientName: s.patientName,
      medicalRecord: s.medicalRecordNumber,
      bedNumber: s.bedNumber,
      nurseName: s.nurseInCharge || 'Perawat Lain',
      shift: s.shift,
      dateIso: sDateIso,
      sessionId: s.id
    });
  });

  // 2. Cloud Firestore nurse_logbooks (covers unsubmitted draft logbooks across devices in real time)
  cloudNurseLogbooks.forEach((docData) => {
    if (!docData || !docData.nurseName) return;
    const nurseSuffix = getNurseStorageKey(docData.nurseName);
    if (localAuthoritativeNurseKeys.has(nurseSuffix)) {
      // Local browser already processed this nurse's live localStorage state
      return;
    }
    const cDateIso =
      docData.dateIso ||
      (docData.shiftSchedule?.date ? indonesianDateLabelToIso(docData.shiftSchedule.date) : '') ||
      (docData.logbookDate ? indonesianDateLabelToIso(docData.logbookDate) : '');
    if (cDateIso !== activeDateIso) return;

    const cShift = docData.shiftSchedule?.shift;
    if (Array.isArray(docData.managedPatients)) {
      docData.managedPatients.forEach((mp: any) => {
        if (mp && typeof mp === 'object') {
          registerAsset({
            patientName: mp.patientName,
            medicalRecord: mp.medicalRecord,
            bedNumber: mp.bedNumber,
            nurseName: docData.nurseName,
            shift: cShift,
            dateIso: cDateIso
          });
        }
      });
    }
  });

  // 3. Shared Verification Registry entries
  registryEntries.forEach((entry) => {
    if (!entry || !entry.submittedNurseName) return;
    const rDateIso =
      entry.dateKey || (entry.dateLabel ? indonesianDateLabelToIso(entry.dateLabel) : '');
    if (rDateIso !== activeDateIso) return;
    if (Array.isArray(entry.patients)) {
      entry.patients.forEach((rp) => {
        if (rp) {
          registerAsset({
            patientName: rp.patientName,
            medicalRecord: rp.medicalRecord,
            bedNumber: rp.bedNumber,
            nurseName: entry.submittedNurseName,
            shift: entry.shift,
            dateIso: rDateIso
          });
        }
      });
    }
  });

  const findPatientClaimedByOther = (candidate: {
    patientName?: string;
    medicalRecord?: string;
  }): ClaimedLogbookAsset | null => {
    return (
      claimedPatientsByOther.find((asset) => isSamePatientIdentity(asset, candidate)) || null
    );
  };

  const findBedClaimedByOther = (bedNumber?: string): ClaimedLogbookAsset | null => {
    const code = extractBedCode(bedNumber);
    if (!code) return null;
    return claimedBedsByOtherOnShift.find((asset) => asset.bedCode === code) || null;
  };

  return {
    claimedPatientsByOther,
    claimedBedsByOtherOnShift,
    findPatientClaimedByOther,
    findBedClaimedByOther
  };
}

