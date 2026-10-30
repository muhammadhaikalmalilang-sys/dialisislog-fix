import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Search,
  RotateCcw,
  AlertTriangle,
  X,
  MessageSquare,
  Send,
  Lock,
  Eye,
  Edit3
} from 'lucide-react';
import { ShiftInfo, MasterNurse, SystemAccessRole, PatientHDSession } from '../types/dialysis.ts';
import { OFFICIAL_LOGBOOK_ITEMS } from '../data/officialPelaksanaLogbookData.ts';
import { LoginUserData } from './LoginPage.tsx';
import { ManagedPatient, PjVerificationSubmission, PjVerificationStatus } from './Logbook5ButtonsView.tsx';
import { formatSystemAccessLabel } from '../utils/masterDataHelpers.ts';
import {
  saveNurseLogbookCloud,
  subscribeToNurseLogbook,
  type NurseLogbookCloudData
} from '../services/firebase.ts';
import {
  isMatchingNurse,
  isSameBed,
  getVerificationRegistry,
  upsertVerificationRegistryEntry,
  filterVerificationQueueForUser,
  LogbookVerificationRegistryEntry,
  ManagedPatientMinimal,
  PER_PATIENT_STATUS_STORAGE_KEY,
  buildPatientVerificationKey,
  getNurseManagedPatientsKey,
  getNursePatientStatusesKey,
  getNursePatientNotesKey,
  getNurseClinicalDetailsKey,
  getNurseFacilityStatusesKey,
  getNurseFacilityNotesKey,
  readNurseFacilityStatuses,
  getNurseSubmissionKey,
  getNursePatientSubmissionsKey,
  getNurseStorageKey,
  canVerifierRoleEditSubmitted
} from '../utils/nurseVerificationHelpers.ts';
import { normalizePatientClinicalDetails } from '../utils/logbookClinicalHelpers.ts';
import { syncNurseVerifiedDailySnapshot } from '../utils/monthlyRecapHelpers.ts';
import {
  formatCurrentWibTimestamp,
  getCurrentIndonesianFullDate,
  getCurrentIsoDateWib,
  normalizeIndonesianDateLabel,
  indonesianDateLabelToIso
} from '../utils/dateHelpers.ts';
import {
  PatientLogbookVerificationModal,
  PatientLogbookEditPayload
} from './PatientLogbookVerificationModal.tsx';

interface VerifikasiViewProps {
  shiftInfo?: ShiftInfo;
  masterNurses?: MasterNurse[];
  userRole: SystemAccessRole;
  loggedInUser?: LoginUserData | null;
  sessions?: PatientHDSession[];
  cloudNurseLogbooks?: NurseLogbookCloudData[];
  onVerificationUpdated?: (
    nurseName: string,
    status: PjVerificationStatus,
    details: {
      verifiedAt?: string;
      verifiedBy?: string;
      verifiedByRole?: string;
      verifierNotes?: string;
      revisionRequested?: boolean;
      revisionRequestedAt?: string;
      revisionRequestedBy?: string;
      revisionRequestedByRole?: string;
      revisionEpoch?: number;
      shift?: string;
      dateKey?: string;
      dateLabel?: string;
    }
  ) => void;
  onVerifyPatientSession?: (
    patientIdentifier: { bedNumber?: string; patientName?: string; medicalRecord?: string },
    verified: boolean,
    details: {
      verifiedAt?: string;
      verifiedBy?: string;
      verifiedByRole?: string;
      verifierNotes?: string;
      revisionRequested?: boolean;
      revisionRequestedAt?: string;
      revisionRequestedBy?: string;
      revisionRequestedByRole?: string;
      revisionEpoch?: number;
      nurseName?: string;
      shift?: string;
      dateKey?: string;
      dateLabel?: string;
    }
  ) => void;
  onSaveSession?: (session: PatientHDSession) => void;
}

export interface PatientVerificationDetail {
  id: string;
  bedNumber: string;
  patientName: string;
  medicalRecord?: string;
  completed: number;
  total: number;
  status: PjVerificationStatus;
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
  session?: PatientHDSession;
  score?: number;
  grade?: string;
  isCorrected?: boolean;
}

interface RosterVerificationRecord {
  id: string;
  nurseName: string;
  nurseNip: string;
  nurseRole: 'perawat_pelaksana' | 'pj_shift' | 'kepala_ruangan';
  targetRole: 'pj_shift' | 'kepala_ruangan' | 'mandiri';
  targetVerifierName: string;
  shift: string;
  dateKey?: string;
  dateLabel?: string;
  status: PjVerificationStatus;
  submittedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  verifiedByRole?: string;
  pelaksanaNotes: string;
  verifierNotes: string;
  facilityCompleted: number;
  facilityTotal: number;
  patientsSummary: PatientVerificationDetail[];
}

interface NurseColorPalette {
  bgHeader: string;
  avatarBg: string;
  badgeRole: string;
  nameColor: string;
  tagPill: string;
}

const NURSE_COLOR_PALETTES: NurseColorPalette[] = [
  {
    bgHeader: 'bg-slate-50/90',
    avatarBg: 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-100',
    badgeRole: 'bg-blue-50 text-blue-900 border-blue-200 font-bold',
    nameColor: 'text-slate-900',
    tagPill: 'bg-blue-50 text-blue-800 border-blue-200'
  },
  {
    bgHeader: 'bg-slate-50/90',
    avatarBg: 'bg-teal-600 text-white shadow-xs ring-2 ring-teal-100',
    badgeRole: 'bg-teal-50 text-teal-900 border-teal-200 font-bold',
    nameColor: 'text-slate-900',
    tagPill: 'bg-teal-50 text-teal-800 border-teal-200'
  },
  {
    bgHeader: 'bg-slate-50/90',
    avatarBg: 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-100',
    badgeRole: 'bg-indigo-50 text-indigo-900 border-indigo-200 font-bold',
    nameColor: 'text-slate-900',
    tagPill: 'bg-indigo-50 text-indigo-800 border-indigo-200'
  },
  {
    bgHeader: 'bg-slate-50/90',
    avatarBg: 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-100',
    badgeRole: 'bg-amber-50 text-amber-900 border-amber-200 font-bold',
    nameColor: 'text-slate-900',
    tagPill: 'bg-amber-50 text-amber-800 border-amber-200'
  }
];

function getNurseInitials(name: string): string {
  if (!name) return 'PR';
  const clean = name
    .replace(/(S\.Kep|Ners|A\.Md\.?\s?Kep|S\.Tr\.?\s?Kep|M\.Kep|dr\.|Ns\.|PW\.)/gi, '')
    .trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatSubmitterRoleLabel(role: 'perawat_pelaksana' | 'pj_shift' | 'kepala_ruangan'): string {
  if (role === 'kepala_ruangan') return 'Kepala Ruang (Pengaju)';
  if (role === 'pj_shift') return 'PJ Shift (Pengaju)';
  return 'Perawat Pelaksana';
}

export const VerifikasiView: React.FC<VerifikasiViewProps> = ({
  shiftInfo,
  masterNurses = [],
  userRole,
  loggedInUser,
  sessions = [],
  cloudNurseLogbooks = [],
  onVerificationUpdated,
  onVerifyPatientSession,
  onSaveSession
}) => {
  const activeDate = shiftInfo?.date
    ? normalizeIndonesianDateLabel(shiftInfo.date)
    : getCurrentIndonesianFullDate();
  const activeShift = shiftInfo?.shift || 'Pagi';
  const validKaruShift =
    shiftInfo?.kepalaRuangan && shiftInfo.kepalaRuangan !== '-' ? shiftInfo.kepalaRuangan : '';
  const validPjShift =
    shiftInfo?.pjShift && shiftInfo.pjShift !== '-' ? shiftInfo.pjShift : '';
  const verifierName =
    loggedInUser?.name ||
    (userRole === 'kepala_ruangan' ? validKaruShift || '-' : validPjShift || '-');
  const verifierRoleLabel =
    userRole === 'kepala_ruangan'
      ? 'Kepala Ruangan'
      : userRole === 'pj_shift'
      ? 'PJ Shift'
      : formatSystemAccessLabel(userRole);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PjVerificationStatus>('all');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Verification registry entries synced with localStorage
  const [registryEntries, setRegistryEntries] = useState<LogbookVerificationRegistryEntry[]>(() =>
    getVerificationRegistry(masterNurses, validPjShift, validKaruShift)
  );

  // Per-patient verification records state (deterministic nurse+bed+rm keys)
  const [perPatientRecords, setPerPatientRecords] = useState<
    Record<
      string,
      {
        status: PjVerificationStatus;
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
        score?: number;
        grade?: string;
        isCorrected?: boolean;
      }
    >
  >(() => {
    try {
      const saved = localStorage.getItem(PER_PATIENT_STATUS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {};
  });

  // Refresh registry & per-patient records when tab mounts, sessions change, or cloud/local events fire
  useEffect(() => {
    setRegistryEntries(getVerificationRegistry(masterNurses, validPjShift, validKaruShift));

    const handleCloudUpdate = () => {
      setRegistryEntries(getVerificationRegistry(masterNurses, validPjShift, validKaruShift));
      try {
        const saved = localStorage.getItem(PER_PATIENT_STATUS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            setPerPatientRecords((prev) =>
              JSON.stringify(prev) === JSON.stringify(parsed) ? prev : parsed
            );
          }
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('verification_registry_updated', handleCloudUpdate);
    window.addEventListener('storage', handleCloudUpdate);
    return () => {
      window.removeEventListener('verification_registry_updated', handleCloudUpdate);
      window.removeEventListener('storage', handleCloudUpdate);
    };
  }, [masterNurses, validPjShift, validKaruShift, sessions]);

  useEffect(() => {
    try {
      localStorage.setItem(PER_PATIENT_STATUS_STORAGE_KEY, JSON.stringify(perPatientRecords));
    } catch {
      // ignore
    }
    const syncedNurseKeys = new Set<string>();
    registryEntries.forEach((reg) => {
      if (!reg.submittedNurseName) return;
      syncedNurseKeys.add(getNurseStorageKey(reg.submittedNurseName));
      syncNurseVerifiedDailySnapshot({
        nurseName: reg.submittedNurseName,
        userRole: reg.submittedNurseRole || 'perawat_pelaksana',
        shiftInfo,
        sessions,
        masterNurses,
        cloudNurseLogbooks
      });
    });

    // Also sync daily snapshots for any nurse who performed cross-nurse vascular accessing (Poin 3.6)
    sessions.forEach((s) => {
      const vascNurse = (s.vascularAccessNurse || s.bagian3?.vascularAccessNurse || '').trim();
      if (!vascNurse || vascNurse === '-') return;
      const vKey = getNurseStorageKey(vascNurse);
      if (syncedNurseKeys.has(vKey)) return;
      syncedNurseKeys.add(vKey);
      const matchedMaster = masterNurses.find((n) => isMatchingNurse(n.name, vascNurse));
      const resolvedRole: SystemAccessRole =
        matchedMaster?.systemAccess ||
        (matchedMaster?.role === 'kepala_ruangan'
          ? 'kepala_ruangan'
          : matchedMaster?.role === 'pj_shift'
          ? 'pj_shift'
          : 'perawat_pelaksana');
      syncNurseVerifiedDailySnapshot({
        nurseName: vascNurse,
        userRole: resolvedRole,
        shiftInfo,
        sessions,
        masterNurses,
        cloudNurseLogbooks
      });
    });
  }, [perPatientRecords, registryEntries, shiftInfo, sessions, masterNurses, cloudNurseLogbooks]);

  const [localEditTick, setLocalEditTick] = useState(0);

  // Real-time multi-device hydration of submitting nurses' SPO checklists & clinical details
  const submittedNursesKey = useMemo(() => {
    const visible = filterVerificationQueueForUser(registryEntries, userRole, verifierName);
    const uniqueNames = Array.from(
      new Set(visible.map((e) => e.submittedNurseName).filter(Boolean))
    ).sort();
    return uniqueNames.join('||');
  }, [registryEntries, userRole, verifierName]);

  useEffect(() => {
    if (!submittedNursesKey) return;
    const nurseNames = submittedNursesKey.split('||').filter(Boolean);
    const todayIso = getCurrentIsoDateWib();

    const syncKeyIfChanged = (storageKey: string, val: unknown): boolean => {
      try {
        const nextJson = JSON.stringify(val);
        const prevJson = localStorage.getItem(storageKey);
        if (prevJson !== nextJson) {
          localStorage.setItem(storageKey, nextJson);
          return true;
        }
      } catch {
        // ignore
      }
      return false;
    };

    const unsubs = nurseNames.map((nName) =>
      subscribeToNurseLogbook(nName, (cloudData) => {
        if (cloudData.dateIso && cloudData.dateIso !== todayIso) {
          return;
        }
        let changed = false;
        if (Array.isArray(cloudData.managedPatients) && cloudData.managedPatients.length > 0) {
          changed =
            syncKeyIfChanged(getNurseManagedPatientsKey(nName), cloudData.managedPatients) ||
            changed;
        }
        if (cloudData.facilityStatuses && typeof cloudData.facilityStatuses === 'object') {
          changed =
            syncKeyIfChanged(getNurseFacilityStatusesKey(nName), cloudData.facilityStatuses) ||
            changed;
        }
        if (cloudData.facilityNotes && typeof cloudData.facilityNotes === 'object') {
          changed =
            syncKeyIfChanged(getNurseFacilityNotesKey(nName), cloudData.facilityNotes) ||
            changed;
        }
        if (cloudData.patientStatuses && typeof cloudData.patientStatuses === 'object') {
          changed =
            syncKeyIfChanged(getNursePatientStatusesKey(nName), cloudData.patientStatuses) ||
            changed;
        }
        if (cloudData.patientNotes && typeof cloudData.patientNotes === 'object') {
          changed =
            syncKeyIfChanged(getNursePatientNotesKey(nName), cloudData.patientNotes) ||
            changed;
        }
        if (cloudData.clinicalDetails && typeof cloudData.clinicalDetails === 'object') {
          changed =
            syncKeyIfChanged(getNurseClinicalDetailsKey(nName), cloudData.clinicalDetails) ||
            changed;
        }
        if (changed) {
          setLocalEditTick((t) => t + 1);
        }
      })
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [submittedNursesKey]);

  // Modal State for inspecting & editing individual patient logbook
  const [selectedPatientModal, setSelectedPatientModal] = useState<{
    patient: PatientVerificationDetail;
    nurseName: string;
    nurseNip?: string;
    session?: PatientHDSession;
    shift?: string;
    dateKey?: string;
    dateLabel?: string;
  } | null>(null);

  // Modal State for requesting repair (Minta Perbaikan Kembali)
  const [revisionModalTarget, setRevisionModalTarget] = useState<{
    rec: RosterVerificationRecord;
    patient?: PatientVerificationDetail;
  } | null>(null);
  const [revisionNoteInput, setRevisionNoteInput] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const formatNowWib = () => {
    return formatCurrentWibTimestamp(activeDate);
  };

  // Resolve matching session for a specific nurse's patient without substring bed collisions
  const findMatchingSession = (
    nurseName: string,
    bedNumber: string,
    patientName: string,
    rm?: string,
    targetShift?: string,
    targetDateIso?: string
  ): PatientHDSession | undefined => {
    const cleanName = patientName.toLowerCase().trim();
    const cleanRm = rm?.trim();
    const normalizedShift = targetShift?.toLowerCase().includes('siang')
      ? 'Siang'
      : targetShift
      ? 'Pagi'
      : undefined;

    const matchesSessionIdentity = (s: PatientHDSession) => {
      if (cleanRm && s.medicalRecordNumber?.trim() === cleanRm) return true;
      if (isSameBed(s.bedNumber, bedNumber)) return true;
      if (cleanName && s.patientName.toLowerCase().trim() === cleanName) return true;
      return false;
    };

    // 1. Prefer session explicitly matching nurse + shift + date
    const exactShiftDateMatch = sessions.find((s) => {
      if (s.nurseInCharge && !isMatchingNurse(s.nurseInCharge, nurseName)) return false;
      if (normalizedShift && s.shift && s.shift !== normalizedShift) return false;
      if (targetDateIso) {
        const sIso = s.sessionDate || (s.date ? indonesianDateLabelToIso(s.date) : '');
        if (sIso && sIso !== targetDateIso) return false;
      }
      return matchesSessionIdentity(s);
    });
    if (exactShiftDateMatch) return exactShiftDateMatch;

    // 2. Fallback: session assigned to this nurse
    const nurseMatch = sessions.find((s) => {
      if (s.nurseInCharge && !isMatchingNurse(s.nurseInCharge, nurseName)) return false;
      return matchesSessionIdentity(s);
    });
    if (nurseMatch) return nurseMatch;

    // 3. Fallback by exact RM
    return sessions.find((s) => Boolean(cleanRm && s.medicalRecordNumber?.trim() === cleanRm));
  };

  // Helper to sync nurse's individual & per-patient submission storage keys AND Cloud Firestore
  const syncNurseSubmissionStorage = (
    nurseName: string,
    patch: Partial<PjVerificationSubmission>,
    patientPatches?: Array<{
      patientId?: string;
      bedNumber: string;
      medicalRecord?: string;
      patch: Partial<PjVerificationSubmission>;
    }>
  ) => {
    let nextSubObj: Record<string, any> = {};
    let nextPatSubsMap: Record<string, any> | undefined;

    try {
      const subKey = getNurseSubmissionKey(nurseName);
      const raw = localStorage.getItem(subKey);
      const existing = raw ? JSON.parse(raw) : {};
      nextSubObj = {
        ...existing,
        ...patch
      };
      localStorage.setItem(subKey, JSON.stringify(nextSubObj));
    } catch {
      // ignore
    }

    if (patientPatches && patientPatches.length > 0) {
      try {
        const patSubKey = getNursePatientSubmissionsKey(nurseName);
        const rawPatSubs = localStorage.getItem(patSubKey);
        const existingPatSubs: Record<string, any> =
          rawPatSubs ? JSON.parse(rawPatSubs) : {};

        let managedList: ManagedPatient[] = [];
        try {
          const rawManaged = localStorage.getItem(getNurseManagedPatientsKey(nurseName));
          if (rawManaged) {
            const parsedManaged = JSON.parse(rawManaged);
            if (Array.isArray(parsedManaged)) managedList = parsedManaged;
          }
        } catch {
          // ignore
        }

        const updatedMap: Record<string, any> = { ...existingPatSubs };
        patientPatches.forEach((item) => {
          const matchedManaged = managedList.find(
            (m) =>
              (item.patientId && m.id === item.patientId) ||
              (item.medicalRecord &&
                m.medicalRecord &&
                m.medicalRecord.trim().toLowerCase() === item.medicalRecord.trim().toLowerCase()) ||
              isSameBed(m.bedNumber, item.bedNumber)
          );
          const candidateKeys = new Set<string>();
          if (item.patientId) candidateKeys.add(item.patientId);
          if (matchedManaged?.id) candidateKeys.add(matchedManaged.id);
          // Also patch any existing entry in updatedMap whose bed matches if keyed differently
          if (candidateKeys.size === 0 && item.bedNumber) {
            candidateKeys.add(item.bedNumber);
          }
          candidateKeys.forEach((key) => {
            updatedMap[key] = {
              ...(updatedMap[key] || {}),
              ...item.patch
            };
          });
        });

        nextPatSubsMap = updatedMap;
        localStorage.setItem(patSubKey, JSON.stringify(updatedMap));
      } catch {
        // ignore
      }
    }

    // Push updated lock/revision/verification state to nurse_logbooks in Cloud Firestore
    saveNurseLogbookCloud(nurseName, {
      submission: nextSubObj,
      ...(nextPatSubsMap ? { patientSubmissions: nextPatSubsMap } : {})
    }).catch(() => {});

    try {
      window.dispatchEvent(new CustomEvent('verification_registry_updated'));
    } catch {
      // ignore
    }
  };

  // STRICT ALUR VERIFIKASI QUEUE ISOLATION:
  // 1. PJ Shift: hanya menampilkan pengajuan verifikasi logbook yang ditujukan khusus untuk PJ Shift tersebut
  //    (memverifikasi pasien kelolaan Perawat Pelaksana / Kepala Ruang yang memilih PJ Shift tersebut).
  // 2. Kepala Ruang: hanya menampilkan pengajuan verifikasi logbook yang diajukan untuk Kepala Ruang
  //    (memverifikasi pasien kelolaan PJ Shift serta pengajuan mandiri Kepala Ruang ke Kepala Ruang).
  const queueRecords = useMemo<RosterVerificationRecord[]>(() => {
    const filteredRegistry = filterVerificationQueueForUser(
      registryEntries,
      userRole,
      verifierName
    );

    const facItems = OFFICIAL_LOGBOOK_ITEMS.filter((it) => it.bagian === 1);
    const patSpoItems = OFFICIAL_LOGBOOK_ITEMS.filter((it) => it.bagian >= 2 && it.bagian <= 6);

    return filteredRegistry.map((reg) => {
      const nurseFacStatuses = readNurseFacilityStatuses(reg.submittedNurseName);
      const nurseFacCompleted = facItems.filter((it) => Boolean(nurseFacStatuses[it.code])).length;
      // Read submitted patients from registry entry; enrich matching IDs/beds from live storage without leaking unsubmitted drafts
      let managedLookup: ManagedPatient[] = [];
      try {
        const rawManaged = localStorage.getItem(getNurseManagedPatientsKey(reg.submittedNurseName));
        if (rawManaged) {
          const parsed = JSON.parse(rawManaged);
          if (Array.isArray(parsed)) {
            managedLookup = parsed;
          }
        }
      } catch {
        // ignore
      }

      let nursePatSubmissions: Record<string, Partial<PjVerificationSubmission>> = {};
      try {
        const rawPatSubs = localStorage.getItem(
          getNursePatientSubmissionsKey(reg.submittedNurseName)
        );
        if (rawPatSubs) {
          const parsedSubs = JSON.parse(rawPatSubs);
          if (parsedSubs && typeof parsedSubs === 'object') {
            nursePatSubmissions = parsedSubs;
          }
        }
      } catch {
        // ignore
      }

      let nursePatients: ManagedPatient[] =
        Array.isArray(reg.patients) && reg.patients.length > 0
          ? reg.patients.map((p, idx) => {
              const matchedLive = managedLookup.find(
                (m) =>
                  (p.id && m.id === p.id) ||
                  (p.medicalRecord && m.medicalRecord && m.medicalRecord === p.medicalRecord) ||
                  isSameBed(m.bedNumber, p.bedNumber)
              );
              return {
                id: matchedLive?.id || p.id || `pat-${reg.id}-${idx}`,
                bedNumber: matchedLive?.bedNumber || p.bedNumber,
                patientName: matchedLive?.patientName || p.patientName,
                medicalRecord: matchedLive?.medicalRecord || p.medicalRecord
              };
            })
          : managedLookup;

      // If still empty, derive from sessions belonging to this nurse
      if (nursePatients.length === 0) {
        const fromSessions = sessions.filter((s) =>
          isMatchingNurse(s.nurseInCharge, reg.submittedNurseName)
        );
        nursePatients = fromSessions.map((s, idx) => ({
          id: s.id || `pat-${reg.id}-${idx}`,
          bedNumber: s.bedNumber,
          patientName: s.patientName,
          medicalRecord: s.medicalRecordNumber
        }));
      }

      // Read per-nurse SPO statuses if saved
      let nursePatStatuses: Record<string, Record<string, boolean>> = {};
      try {
        const rawPatStat = localStorage.getItem(getNursePatientStatusesKey(reg.submittedNurseName));
        if (rawPatStat) {
          const parsed = JSON.parse(rawPatStat);
          if (parsed && typeof parsed === 'object') {
            nursePatStatuses = parsed;
          }
        }
      } catch {
        // fallback
      }

      const regDateIso =
        reg.dateKey || indonesianDateLabelToIso(reg.dateLabel || activeDate);

      const patientsToMap: PatientVerificationDetail[] = nursePatients.map((p, pIdx) => {
        const matchingSession = findMatchingSession(
          reg.submittedNurseName,
          p.bedNumber,
          p.patientName,
          p.medicalRecord,
          reg.shift,
          regDateIso
        );
        const regPat: ManagedPatientMinimal | undefined = Array.isArray(reg.patients)
          ? reg.patients.find(
              (rp) =>
                (p.id && rp.id === p.id) ||
                (p.medicalRecord && rp.medicalRecord && rp.medicalRecord === p.medicalRecord) ||
                isSameBed(rp.bedNumber, p.bedNumber)
            )
          : undefined;
        const subPat = nursePatSubmissions[p.id] || nursePatSubmissions[p.bedNumber];

        const datedPatKey = buildPatientVerificationKey(
          reg.submittedNurseName,
          p.bedNumber,
          p.medicalRecord,
          regDateIso
        );
        const patKey = buildPatientVerificationKey(
          reg.submittedNurseName,
          p.bedNumber,
          p.medicalRecord
        );
        const savedPerPat = perPatientRecords[datedPatKey] || perPatientRecords[patKey];

        const checks = nursePatStatuses[p.id] || nursePatStatuses[p.bedNumber];
        const completed = checks
          ? patSpoItems.filter((it) => Boolean(checks[it.code])).length
          : 0;

        const latestSubmittedEpoch = Math.max(
          regPat?.submittedEpoch || 0,
          subPat?.submittedEpoch || 0,
          savedPerPat?.submittedEpoch || 0,
          matchingSession?.submittedEpoch || 0
        );
        const latestRevisionEpoch = Math.max(
          regPat?.revisionEpoch || 0,
          subPat?.revisionEpoch || 0,
          savedPerPat?.revisionEpoch || 0,
          matchingSession?.revisionEpoch || 0
        );

        let patStatus: PjVerificationStatus;
        if (latestRevisionEpoch > 0 && latestRevisionEpoch >= latestSubmittedEpoch) {
          patStatus = 'belum_diajukan';
        } else if (latestSubmittedEpoch > latestRevisionEpoch) {
          const isApprovedAfterSubmit =
            (savedPerPat?.status === 'terverifikasi' && !savedPerPat.revisionRequested) ||
            (regPat?.status === 'terverifikasi' && !regPat.revisionRequested) ||
            (matchingSession?.verificationStatus === 'terverifikasi' &&
              !matchingSession.revisionRequested);
          patStatus = isApprovedAfterSubmit ? 'terverifikasi' : 'diajukan';
        } else {
          patStatus =
            savedPerPat?.status ||
            regPat?.status ||
            subPat?.status ||
            (reg.status === 'terverifikasi' ? 'terverifikasi' : reg.status);
        }

        const isRevisionState = patStatus === 'belum_diajukan';

        return {
          id: p.id || `pat-${reg.id}-${pIdx}`,
          bedNumber: p.bedNumber,
          patientName: p.patientName,
          medicalRecord: p.medicalRecord || matchingSession?.medicalRecordNumber,
          completed,
          total: patSpoItems.length,
          status: patStatus,
          submittedAt:
            regPat?.submittedAt ||
            subPat?.submittedAt ||
            savedPerPat?.submittedAt ||
            reg.submittedAt,
          submittedEpoch: latestSubmittedEpoch || undefined,
          verifiedAt:
            patStatus === 'terverifikasi'
              ? savedPerPat?.verifiedAt ||
                regPat?.verifiedAt ||
                reg.verifiedAt ||
                matchingSession?.verifiedAt
              : undefined,
          verifiedBy:
            patStatus === 'terverifikasi'
              ? savedPerPat?.verifiedBy ||
                regPat?.verifiedBy ||
                reg.verifiedBy ||
                matchingSession?.verifiedBy
              : undefined,
          verifiedByRole:
            patStatus === 'terverifikasi'
              ? savedPerPat?.verifiedByRole ||
                regPat?.verifiedByRole ||
                reg.verifiedByRole ||
                matchingSession?.verifiedByRole
              : undefined,
          verifierNotes:
            savedPerPat?.verifierNotes ||
            regPat?.verifierNotes ||
            subPat?.verifierNotes ||
            matchingSession?.verifierNotes ||
            reg.verifierNotes ||
            '',
          revisionRequested:
            isRevisionState &&
            Boolean(
              savedPerPat?.revisionRequested ||
                regPat?.revisionRequested ||
                subPat?.revisionRequested ||
                matchingSession?.revisionRequested ||
                reg.revisionRequested ||
                savedPerPat?.verifierNotes ||
                regPat?.verifierNotes
            ),
          revisionRequestedAt: isRevisionState
            ? savedPerPat?.revisionRequestedAt ||
              regPat?.revisionRequestedAt ||
              subPat?.revisionRequestedAt ||
              matchingSession?.revisionRequestedAt ||
              reg.revisionRequestedAt
            : undefined,
          revisionRequestedBy: isRevisionState
            ? savedPerPat?.revisionRequestedBy ||
              regPat?.revisionRequestedBy ||
              subPat?.revisionRequestedBy ||
              matchingSession?.revisionRequestedBy ||
              reg.revisionRequestedBy
            : undefined,
          revisionRequestedByRole: isRevisionState
            ? savedPerPat?.revisionRequestedByRole ||
              regPat?.revisionRequestedByRole ||
              subPat?.revisionRequestedByRole ||
              matchingSession?.revisionRequestedByRole ||
              reg.revisionRequestedByRole
            : undefined,
          revisionEpoch: isRevisionState ? latestRevisionEpoch || undefined : undefined,
          session: matchingSession,
          score: savedPerPat?.score,
          grade: savedPerPat?.grade,
          isCorrected: savedPerPat?.isCorrected
        };
      });

      // Compute effective submission status from individual patient verification states
      const verifiedPats = patientsToMap.filter((p) => p.status === 'terverifikasi').length;
      const unsubmittedPats = patientsToMap.filter((p) => p.status === 'belum_diajukan').length;
      let effectiveStatus: PjVerificationStatus = reg.status;

      if (patientsToMap.length > 0) {
        if (verifiedPats === patientsToMap.length) {
          effectiveStatus = 'terverifikasi';
        } else if (unsubmittedPats === patientsToMap.length) {
          effectiveStatus = 'belum_diajukan';
        } else {
          effectiveStatus = 'diajukan';
        }
      }

      return {
        id: reg.id,
        nurseName: reg.submittedNurseName,
        nurseNip: reg.submittedNurseNip || '-',
        nurseRole: reg.submittedNurseRole || 'perawat_pelaksana',
        targetRole: reg.targetRole || 'pj_shift',
        targetVerifierName: reg.targetVerifierName || verifierName,
        shift: reg.shift || activeShift,
        dateKey: reg.dateKey || regDateIso,
        dateLabel: reg.dateLabel || activeDate,
        status: effectiveStatus,
        submittedAt: reg.submittedAt,
        verifiedAt: effectiveStatus === 'terverifikasi' ? reg.verifiedAt : undefined,
        verifiedBy: effectiveStatus === 'terverifikasi' ? reg.verifiedBy : undefined,
        verifiedByRole: effectiveStatus === 'terverifikasi' ? reg.verifiedByRole : undefined,
        pelaksanaNotes: reg.pelaksanaNotes || '',
        verifierNotes: reg.verifierNotes || '',
        facilityCompleted: nurseFacCompleted,
        facilityTotal: facItems.length,
        patientsSummary: patientsToMap
      };
    });
  }, [
    registryEntries,
    userRole,
    verifierName,
    activeShift,
    activeDate,
    sessions,
    perPatientRecords,
    localEditTick
  ]);

  // Helper to build ManagedPatientMinimal[] preserving per-patient lock/revision metadata
  const buildRegistryPatientsPayload = (
    summary: PatientVerificationDetail[]
  ): ManagedPatientMinimal[] =>
    summary.map((p) => ({
      id: p.id,
      bedNumber: p.bedNumber,
      patientName: p.patientName,
      medicalRecord: p.medicalRecord,
      status: p.status,
      submittedAt: p.submittedAt,
      submittedEpoch: p.submittedEpoch,
      verifiedAt: p.status === 'terverifikasi' ? p.verifiedAt : '',
      verifiedBy: p.status === 'terverifikasi' ? p.verifiedBy : '',
      verifiedByRole: p.status === 'terverifikasi' ? p.verifiedByRole : '',
      verifierNotes: p.verifierNotes || '',
      revisionRequested: p.status === 'belum_diajukan' && Boolean(p.revisionRequested),
      revisionRequestedAt: p.status === 'belum_diajukan' ? p.revisionRequestedAt || '' : '',
      revisionRequestedBy: p.status === 'belum_diajukan' ? p.revisionRequestedBy || '' : '',
      revisionRequestedByRole: p.status === 'belum_diajukan' ? p.revisionRequestedByRole || '' : '',
      revisionEpoch: p.status === 'belum_diajukan' ? p.revisionEpoch || 0 : 0
    }));

  // 1. VERIFY / APPROVE AN INDIVIDUAL PATIENT
  const handleVerifyPatientApprove = (
    rec: RosterVerificationRecord,
    patient: PatientVerificationDetail,
    notes: string = '',
    evaluation?: { score?: number; grade?: string; isCorrected?: boolean }
  ) => {
    if (patient.status === 'belum_diajukan') {
      showToast(
        `Logbook pasien ${patient.patientName} sedang dalam status perbaikan. Tunggu perawat mengajukan ulang terlebih dahulu.`
      );
      return;
    }

    const timestamp = formatNowWib();
    const targetDateLabel = rec.dateLabel || activeDate;
    const targetDateIso = rec.dateKey || indonesianDateLabelToIso(targetDateLabel);
    const patKey = buildPatientVerificationKey(
      rec.nurseName,
      patient.bedNumber,
      patient.medicalRecord,
      targetDateIso
    );
    const fallbackPatKey = buildPatientVerificationKey(
      rec.nurseName,
      patient.bedNumber,
      patient.medicalRecord
    );

    const effectiveSubEpoch = patient.submittedEpoch || Date.now();
    const updateDetails = {
      status: 'terverifikasi' as PjVerificationStatus,
      submittedAt: patient.submittedAt || rec.submittedAt || timestamp,
      submittedEpoch: effectiveSubEpoch,
      verifiedAt: timestamp,
      verifiedBy: verifierName,
      verifiedByRole: verifierRoleLabel,
      verifierNotes: notes || patient.verifierNotes || '',
      revisionRequested: false,
      revisionRequestedAt: '',
      revisionRequestedBy: '',
      revisionRequestedByRole: '',
      revisionEpoch: 0,
      score: evaluation?.score ?? patient.score ?? 95,
      grade: evaluation?.grade ?? patient.grade ?? 'A',
      isCorrected: evaluation?.isCorrected ?? patient.isCorrected ?? false
    };

    setPerPatientRecords((prev) => ({
      ...prev,
      [patKey]: updateDetails,
      [fallbackPatKey]: updateDetails
    }));

    if (onVerifyPatientSession) {
      onVerifyPatientSession(
        {
          bedNumber: patient.bedNumber,
          patientName: patient.patientName,
          medicalRecord: patient.medicalRecord
        },
        true,
        {
          verifiedAt: timestamp,
          verifiedBy: verifierName,
          verifiedByRole: verifierRoleLabel,
          verifierNotes: updateDetails.verifierNotes,
          revisionRequested: false,
          revisionEpoch: 0,
          nurseName: rec.nurseName,
          shift: rec.shift,
          dateKey: targetDateIso,
          dateLabel: targetDateLabel
        }
      );
    }

    const updatedSummary = rec.patientsSummary.map((p) =>
      p.id === patient.id || isSameBed(p.bedNumber, patient.bedNumber)
        ? { ...p, ...updateDetails }
        : p
    );
    const allPatsVerified =
      updatedSummary.length > 0 && updatedSummary.every((p) => p.status === 'terverifikasi');
    const nextOverallStatus: PjVerificationStatus = allPatsVerified ? 'terverifikasi' : 'diajukan';

    upsertVerificationRegistryEntry({
      id: rec.id,
      submittedNurseName: rec.nurseName,
      submittedNurseNip: rec.nurseNip,
      submittedNurseRole: rec.nurseRole,
      targetRole: rec.targetRole,
      targetVerifierName: rec.targetVerifierName || verifierName,
      shift: rec.shift,
      dateKey: targetDateIso,
      dateLabel: targetDateLabel,
      status: nextOverallStatus,
      submittedAt: rec.submittedAt || timestamp,
      verifiedAt: allPatsVerified ? timestamp : undefined,
      verifiedBy: allPatsVerified ? verifierName : undefined,
      verifiedByRole: allPatsVerified ? verifierRoleLabel : undefined,
      verifierNotes: updateDetails.verifierNotes,
      revisionRequested: false,
      revisionEpoch: 0,
      patients: buildRegistryPatientsPayload(updatedSummary)
    });

    syncNurseSubmissionStorage(
      rec.nurseName,
      {
        status: nextOverallStatus,
        verifiedAt: allPatsVerified ? timestamp : '',
        verifiedBy: allPatsVerified ? verifierName : '',
        verifiedByRole: allPatsVerified ? verifierRoleLabel : '',
        verifierNotes: updateDetails.verifierNotes,
        revisionRequested: false,
        revisionRequestedAt: '',
        revisionRequestedBy: '',
        revisionRequestedByRole: '',
        revisionEpoch: 0
      },
      [
        {
          patientId: patient.id,
          bedNumber: patient.bedNumber,
          medicalRecord: patient.medicalRecord,
          patch: {
            status: 'terverifikasi',
            submittedAt: updateDetails.submittedAt,
            submittedEpoch: effectiveSubEpoch,
            verifiedAt: timestamp,
            verifiedBy: verifierName,
            verifiedByRole: verifierRoleLabel,
            verifierNotes: updateDetails.verifierNotes,
            revisionRequested: false,
            revisionRequestedAt: '',
            revisionRequestedBy: '',
            revisionRequestedByRole: '',
            revisionEpoch: 0
          }
        }
      ]
    );

    setRegistryEntries(getVerificationRegistry());

    if (allPatsVerified && onVerificationUpdated) {
      onVerificationUpdated(rec.nurseName, 'terverifikasi', {
        verifiedAt: timestamp,
        verifiedBy: verifierName,
        verifiedByRole: verifierRoleLabel,
        verifierNotes: updateDetails.verifierNotes,
        revisionRequested: false,
        revisionEpoch: 0,
        shift: rec.shift,
        dateKey: targetDateIso,
        dateLabel: targetDateLabel
      });
    }

    showToast(`Logbook pasien ${patient.patientName} (${patient.bedNumber}) telah disahkan & dikunci.`);
  };

  // 2. REQUEST REPAIR / REVISE AN INDIVIDUAL PATIENT (UNLOCKS LOGBOOK FOR NURSE)
  const handleVerifyPatientRevise = (
    rec: RosterVerificationRecord,
    patient: PatientVerificationDetail,
    notes: string = '',
    evaluation?: { score?: number; grade?: string; isCorrected?: boolean }
  ) => {
    const timestamp = formatNowWib();
    const nowEpoch = Date.now();
    const targetDateLabel = rec.dateLabel || activeDate;
    const targetDateIso = rec.dateKey || indonesianDateLabelToIso(targetDateLabel);
    const datedPatKey = buildPatientVerificationKey(
      rec.nurseName,
      patient.bedNumber,
      patient.medicalRecord,
      targetDateIso
    );
    const patKey = buildPatientVerificationKey(
      rec.nurseName,
      patient.bedNumber,
      patient.medicalRecord
    );
    const effectiveNote =
      notes.trim() ||
      patient.verifierNotes ||
      'Mohon periksa dan perbaiki kembali kelengkapan SPO pasien ini.';

    const updateDetails = {
      status: 'belum_diajukan' as PjVerificationStatus,
      submittedAt: patient.submittedAt || rec.submittedAt || '',
      submittedEpoch: 0,
      verifiedAt: '',
      verifiedBy: '',
      verifiedByRole: '',
      verifierNotes: effectiveNote,
      revisionRequested: true,
      revisionRequestedAt: timestamp,
      revisionRequestedBy: verifierName,
      revisionRequestedByRole: verifierRoleLabel,
      revisionEpoch: nowEpoch,
      score: evaluation?.score ?? patient.score,
      grade: evaluation?.grade ?? patient.grade,
      isCorrected: evaluation?.isCorrected ?? patient.isCorrected ?? false
    };

    setPerPatientRecords((prev) => ({
      ...prev,
      [datedPatKey]: updateDetails,
      [patKey]: updateDetails
    }));

    if (onVerifyPatientSession) {
      onVerifyPatientSession(
        {
          bedNumber: patient.bedNumber,
          patientName: patient.patientName,
          medicalRecord: patient.medicalRecord
        },
        false,
        {
          verifierNotes: effectiveNote,
          revisionRequested: true,
          revisionRequestedAt: timestamp,
          revisionRequestedBy: verifierName,
          revisionRequestedByRole: verifierRoleLabel,
          revisionEpoch: nowEpoch,
          nurseName: rec.nurseName,
          shift: rec.shift,
          dateKey: targetDateIso,
          dateLabel: targetDateLabel
        }
      );
    }

    const updatedSummary = rec.patientsSummary.map((p) =>
      p.id === patient.id || isSameBed(p.bedNumber, patient.bedNumber)
        ? { ...p, ...updateDetails }
        : p
    );
    const anyStillSubmittedOrVerified = updatedSummary.some(
      (p) => p.status === 'diajukan' || p.status === 'terverifikasi'
    );
    const nextOverallStatus: PjVerificationStatus = anyStillSubmittedOrVerified
      ? 'diajukan'
      : 'belum_diajukan';

    upsertVerificationRegistryEntry({
      id: rec.id,
      submittedNurseName: rec.nurseName,
      submittedNurseNip: rec.nurseNip,
      submittedNurseRole: rec.nurseRole,
      targetRole: rec.targetRole,
      targetVerifierName: rec.targetVerifierName || verifierName,
      shift: rec.shift,
      dateKey: targetDateIso,
      dateLabel: targetDateLabel,
      status: nextOverallStatus,
      submittedAt: rec.submittedAt,
      verifiedAt: '',
      verifiedBy: '',
      verifiedByRole: '',
      verifierNotes: effectiveNote,
      revisionRequested: true,
      revisionRequestedAt: timestamp,
      revisionRequestedBy: verifierName,
      revisionRequestedByRole: verifierRoleLabel,
      revisionEpoch: nowEpoch,
      patients: buildRegistryPatientsPayload(updatedSummary)
    });

    syncNurseSubmissionStorage(
      rec.nurseName,
      {
        status: nextOverallStatus,
        verifiedAt: '',
        verifiedBy: '',
        verifiedByRole: '',
        verifierNotes: effectiveNote,
        revisionRequested: true,
        revisionRequestedAt: timestamp,
        revisionRequestedBy: verifierName,
        revisionRequestedByRole: verifierRoleLabel,
        revisionEpoch: nowEpoch,
        declarationChecked: false
      },
      [
        {
          patientId: patient.id,
          bedNumber: patient.bedNumber,
          medicalRecord: patient.medicalRecord,
          patch: {
            status: 'belum_diajukan',
            submittedEpoch: 0,
            verifiedAt: '',
            verifiedBy: '',
            verifiedByRole: '',
            verifierNotes: effectiveNote,
            revisionRequested: true,
            revisionRequestedAt: timestamp,
            revisionRequestedBy: verifierName,
            revisionRequestedByRole: verifierRoleLabel,
            revisionEpoch: nowEpoch,
            declarationChecked: false
          }
        }
      ]
    );

    setRegistryEntries(getVerificationRegistry());

    showToast(
      `Permintaan perbaikan dikirim. Kunci logbook ${patient.patientName} (${patient.bedNumber}) telah dibuka untuk diedit kembali oleh ${rec.nurseName}.`
    );
  };

  // 2a. BATCH REQUEST REPAIR FOR ALL PATIENTS OF A NURSE
  const handleVerifyAllPatientsRevise = (rec: RosterVerificationRecord, notes: string = '') => {
    const timestamp = formatNowWib();
    const nowEpoch = Date.now();
    const targetDateLabel = rec.dateLabel || activeDate;
    const targetDateIso = rec.dateKey || indonesianDateLabelToIso(targetDateLabel);
    const effectiveNote =
      notes.trim() ||
      rec.verifierNotes ||
      'Mohon periksa dan perbaiki kembali kelengkapan logbook SPO pasien kelolaan Anda.';

    const nextPerPatUpdates: typeof perPatientRecords = {};
    const patientPatches: Array<{
      patientId?: string;
      bedNumber: string;
      medicalRecord?: string;
      patch: Partial<PjVerificationSubmission>;
    }> = [];

    const updatedSummary = rec.patientsSummary.map((p) => {
      const datedPatKey = buildPatientVerificationKey(
        rec.nurseName,
        p.bedNumber,
        p.medicalRecord,
        targetDateIso
      );
      const patKey = buildPatientVerificationKey(rec.nurseName, p.bedNumber, p.medicalRecord);
      const updateDetails = {
        status: 'belum_diajukan' as PjVerificationStatus,
        submittedAt: p.submittedAt || rec.submittedAt || '',
        submittedEpoch: 0,
        verifiedAt: '',
        verifiedBy: '',
        verifiedByRole: '',
        verifierNotes: effectiveNote,
        revisionRequested: true,
        revisionRequestedAt: timestamp,
        revisionRequestedBy: verifierName,
        revisionRequestedByRole: verifierRoleLabel,
        revisionEpoch: nowEpoch,
        score: p.score,
        grade: p.grade,
        isCorrected: p.isCorrected ?? false
      };
      nextPerPatUpdates[datedPatKey] = updateDetails;
      nextPerPatUpdates[patKey] = updateDetails;

      patientPatches.push({
        patientId: p.id,
        bedNumber: p.bedNumber,
        medicalRecord: p.medicalRecord,
        patch: {
          status: 'belum_diajukan',
          submittedEpoch: 0,
          verifiedAt: '',
          verifiedBy: '',
          verifiedByRole: '',
          verifierNotes: effectiveNote,
          revisionRequested: true,
          revisionRequestedAt: timestamp,
          revisionRequestedBy: verifierName,
          revisionRequestedByRole: verifierRoleLabel,
          revisionEpoch: nowEpoch,
          declarationChecked: false
        }
      });

      if (onVerifyPatientSession) {
        onVerifyPatientSession(
          {
            bedNumber: p.bedNumber,
            patientName: p.patientName,
            medicalRecord: p.medicalRecord
          },
          false,
          {
            verifierNotes: effectiveNote,
            revisionRequested: true,
            revisionRequestedAt: timestamp,
            revisionRequestedBy: verifierName,
            revisionRequestedByRole: verifierRoleLabel,
            revisionEpoch: nowEpoch,
            nurseName: rec.nurseName,
            shift: rec.shift,
            dateKey: targetDateIso,
            dateLabel: targetDateLabel
          }
        );
      }

      return { ...p, ...updateDetails };
    });

    setPerPatientRecords((prev) => ({
      ...prev,
      ...nextPerPatUpdates
    }));

    upsertVerificationRegistryEntry({
      id: rec.id,
      submittedNurseName: rec.nurseName,
      submittedNurseNip: rec.nurseNip,
      submittedNurseRole: rec.nurseRole,
      targetRole: rec.targetRole,
      targetVerifierName: rec.targetVerifierName || verifierName,
      shift: rec.shift,
      dateKey: targetDateIso,
      dateLabel: targetDateLabel,
      status: 'belum_diajukan',
      submittedAt: rec.submittedAt,
      verifiedAt: '',
      verifiedBy: '',
      verifiedByRole: '',
      verifierNotes: effectiveNote,
      revisionRequested: true,
      revisionRequestedAt: timestamp,
      revisionRequestedBy: verifierName,
      revisionRequestedByRole: verifierRoleLabel,
      revisionEpoch: nowEpoch,
      patients: buildRegistryPatientsPayload(updatedSummary)
    });

    syncNurseSubmissionStorage(
      rec.nurseName,
      {
        status: 'belum_diajukan',
        verifiedAt: '',
        verifiedBy: '',
        verifiedByRole: '',
        verifierNotes: effectiveNote,
        revisionRequested: true,
        revisionRequestedAt: timestamp,
        revisionRequestedBy: verifierName,
        revisionRequestedByRole: verifierRoleLabel,
        revisionEpoch: nowEpoch,
        declarationChecked: false
      },
      patientPatches
    );

    if (onVerificationUpdated) {
      onVerificationUpdated(rec.nurseName, 'belum_diajukan', {
        verifierNotes: effectiveNote,
        revisionRequested: true,
        revisionRequestedAt: timestamp,
        revisionRequestedBy: verifierName,
        revisionRequestedByRole: verifierRoleLabel,
        revisionEpoch: nowEpoch,
        shift: rec.shift,
        dateKey: targetDateIso,
        dateLabel: targetDateLabel
      });
    }

    setRegistryEntries(getVerificationRegistry());

    showToast(
      `Permintaan perbaikan dikirim ke ${rec.nurseName}. Seluruh ${rec.patientsSummary.length} logbook pasien dibuka kembali untuk diperbaiki.`
    );
  };

  // 2b. SAVE PATIENT LOGBOOK EDITS & EVALUATION BY VERIFIER (PJ SHIFT / KEPALA RUANG)
  const handleSavePatientLogbookEdits = (
    rec: RosterVerificationRecord,
    patient: PatientVerificationDetail,
    payload: PatientLogbookEditPayload
  ) => {
    if (patient.status === 'terverifikasi') {
      showToast(
        'Logbook yang sudah diverifikasi terkunci. Klik Minta Perbaikan Kembali untuk membuka kunci.'
      );
      return;
    }
    if (!canVerifierRoleEditSubmitted(userRole)) {
      showToast(
        'Hanya Verifikator (PJ Shift / Kepala Ruang) yang dapat mengedit logbook yang diajukan.'
      );
      return;
    }

    const targetDateLabel = rec.dateLabel || activeDate;
    const targetDateIso = rec.dateKey || indonesianDateLabelToIso(targetDateLabel);
    const datedPatKey = buildPatientVerificationKey(
      rec.nurseName,
      patient.bedNumber,
      patient.medicalRecord,
      targetDateIso
    );
    const patKey = buildPatientVerificationKey(
      rec.nurseName,
      patient.bedNumber,
      patient.medicalRecord
    );

    const updateDetails = {
      status: payload.status || patient.status,
      submittedAt: patient.submittedAt || rec.submittedAt,
      submittedEpoch: patient.submittedEpoch || Date.now(),
      verifiedAt: payload.status === 'terverifikasi' ? formatNowWib() : patient.verifiedAt,
      verifiedBy: payload.status === 'terverifikasi' ? verifierName : patient.verifiedBy,
      verifiedByRole:
        payload.status === 'terverifikasi' ? verifierRoleLabel : patient.verifiedByRole,
      verifierNotes: payload.verifierNotes ?? patient.verifierNotes ?? '',
      score: payload.score,
      grade: payload.grade,
      isCorrected: true
    };

    setPerPatientRecords((prev) => ({
      ...prev,
      [datedPatKey]: updateDetails,
      [patKey]: updateDetails
    }));

    let nextAllStatuses: Record<string, Record<string, boolean>> | undefined;
    let nextAllNotes: Record<string, Record<string, string>> | undefined;
    let nextAllClin: Record<string, unknown> | undefined;

    try {
      const statKey = getNursePatientStatusesKey(rec.nurseName);
      const raw = localStorage.getItem(statKey);
      const allStatuses = raw ? JSON.parse(raw) : {};
      const pKey = patient.id || patient.bedNumber;
      allStatuses[pKey] = payload.patientStatuses;
      allStatuses[patient.bedNumber] = payload.patientStatuses;
      nextAllStatuses = allStatuses;
      localStorage.setItem(statKey, JSON.stringify(allStatuses));
    } catch {
      // ignore
    }

    if (payload.facilityStatuses) {
      try {
        localStorage.setItem(
          getNurseFacilityStatusesKey(rec.nurseName),
          JSON.stringify(payload.facilityStatuses)
        );
      } catch {
        // ignore
      }
    }

    if (payload.facilityNotes) {
      try {
        localStorage.setItem(
          getNurseFacilityNotesKey(rec.nurseName),
          JSON.stringify(payload.facilityNotes)
        );
      } catch {
        // ignore
      }
    }

    if (payload.patientNotes) {
      try {
        const notesKey = getNursePatientNotesKey(rec.nurseName);
        const rawNotes = localStorage.getItem(notesKey);
        const allNotes = rawNotes ? JSON.parse(rawNotes) : {};
        const pKey = patient.id || patient.bedNumber;
        allNotes[pKey] = payload.patientNotes;
        allNotes[patient.bedNumber] = payload.patientNotes;
        nextAllNotes = allNotes;
        localStorage.setItem(notesKey, JSON.stringify(allNotes));
      } catch {
        // ignore
      }
    }

    if (payload.clinicalDetail) {
      try {
        const clinKey = getNurseClinicalDetailsKey(rec.nurseName);
        const rawClin = localStorage.getItem(clinKey);
        const allClin = rawClin ? JSON.parse(rawClin) : {};
        const normalizedClin = normalizePatientClinicalDetails(payload.clinicalDetail);
        const pKey = patient.id || patient.bedNumber;
        allClin[pKey] = normalizedClin;
        allClin[patient.bedNumber] = normalizedClin;
        nextAllClin = allClin;
        localStorage.setItem(clinKey, JSON.stringify(allClin));
      } catch {
        // ignore
      }
    }

    // Sync verifier edits to Cloud Firestore so submitting nurse & other devices receive updates
    saveNurseLogbookCloud(rec.nurseName, {
      ...(nextAllStatuses ? { patientStatuses: nextAllStatuses } : {}),
      ...(payload.facilityStatuses ? { facilityStatuses: payload.facilityStatuses } : {}),
      ...(payload.facilityNotes ? { facilityNotes: payload.facilityNotes } : {}),
      ...(nextAllNotes ? { patientNotes: nextAllNotes } : {}),
      ...(nextAllClin ? { clinicalDetails: nextAllClin } : {})
    }).catch(() => {});

    if (payload.updatedSession && onSaveSession) {
      const normalizedShift: 'Pagi' | 'Siang' = (rec.shift || activeShift)
        .toLowerCase()
        .includes('siang')
        ? 'Siang'
        : 'Pagi';
      const enrichedSession: PatientHDSession = {
        ...payload.updatedSession,
        nurseInCharge: rec.nurseName,
        date: targetDateLabel,
        sessionDate: targetDateIso,
        shift: normalizedShift,
        verificationStatus: payload.status || patient.status
      };
      onSaveSession(enrichedSession);
      setSelectedPatientModal((prev) =>
        prev &&
        isMatchingNurse(prev.nurseName, rec.nurseName) &&
        (prev.patient.id === patient.id || isSameBed(prev.patient.bedNumber, patient.bedNumber))
          ? { ...prev, session: enrichedSession }
          : prev
      );
    }

    setLocalEditTick((t) => t + 1);

    if (payload.status !== 'terverifikasi' && payload.status !== 'belum_diajukan') {
      showToast(
        `Perubahan logbook pasien ${patient.patientName} (${patient.bedNumber}) berhasil disimpan oleh Verifikator.`
      );
    }
  };

  // 3. BATCH VERIFY SUBMITTED PATIENTS FOR A NURSE
  const handleVerifyAllPatients = (rec: RosterVerificationRecord) => {
    const eligiblePatients = rec.patientsSummary.filter((p) => p.status === 'diajukan');
    if (eligiblePatients.length === 0) {
      showToast(
        'Tidak ada logbook berstatus Menunggu Verifikasi. Pasien yang sedang diperbaiki harus diajukan ulang oleh perawat terlebih dahulu.'
      );
      return;
    }

    const timestamp = formatNowWib();
    const targetDateLabel = rec.dateLabel || activeDate;
    const targetDateIso = rec.dateKey || indonesianDateLabelToIso(targetDateLabel);
    const nextPerPatUpdates: typeof perPatientRecords = {};
    const patientPatches: Array<{
      patientId?: string;
      bedNumber: string;
      medicalRecord?: string;
      patch: Partial<PjVerificationSubmission>;
    }> = [];

    const updatedSummary = rec.patientsSummary.map((p) => {
      if (p.status !== 'diajukan') return p;
      const effectiveSubEpoch = p.submittedEpoch || Date.now();
      const datedPatKey = buildPatientVerificationKey(
        rec.nurseName,
        p.bedNumber,
        p.medicalRecord,
        targetDateIso
      );
      const patKey = buildPatientVerificationKey(rec.nurseName, p.bedNumber, p.medicalRecord);
      const updateDetails = {
        status: 'terverifikasi' as PjVerificationStatus,
        submittedAt: p.submittedAt || rec.submittedAt || timestamp,
        submittedEpoch: effectiveSubEpoch,
        verifiedAt: timestamp,
        verifiedBy: verifierName,
        verifiedByRole: verifierRoleLabel,
        verifierNotes: p.verifierNotes || rec.verifierNotes || '',
        revisionRequested: false,
        revisionRequestedAt: '',
        revisionRequestedBy: '',
        revisionRequestedByRole: '',
        revisionEpoch: 0
      };
      nextPerPatUpdates[datedPatKey] = updateDetails;
      nextPerPatUpdates[patKey] = updateDetails;

      patientPatches.push({
        patientId: p.id,
        bedNumber: p.bedNumber,
        medicalRecord: p.medicalRecord,
        patch: {
          status: 'terverifikasi',
          submittedAt: updateDetails.submittedAt,
          submittedEpoch: effectiveSubEpoch,
          verifiedAt: timestamp,
          verifiedBy: verifierName,
          verifiedByRole: verifierRoleLabel,
          verifierNotes: updateDetails.verifierNotes,
          revisionRequested: false,
          revisionRequestedAt: '',
          revisionRequestedBy: '',
          revisionRequestedByRole: '',
          revisionEpoch: 0
        }
      });

      if (onVerifyPatientSession) {
        onVerifyPatientSession(
          {
            bedNumber: p.bedNumber,
            patientName: p.patientName,
            medicalRecord: p.medicalRecord
          },
          true,
          {
            verifiedAt: timestamp,
            verifiedBy: verifierName,
            verifiedByRole: verifierRoleLabel,
            verifierNotes: updateDetails.verifierNotes,
            revisionRequested: false,
            revisionEpoch: 0,
            nurseName: rec.nurseName,
            shift: rec.shift,
            dateKey: targetDateIso,
            dateLabel: targetDateLabel
          }
        );
      }

      return { ...p, ...updateDetails };
    });

    setPerPatientRecords((prev) => ({
      ...prev,
      ...nextPerPatUpdates
    }));

    const allVerifiedNow =
      updatedSummary.length > 0 && updatedSummary.every((p) => p.status === 'terverifikasi');
    const nextOverallStatus: PjVerificationStatus = allVerifiedNow ? 'terverifikasi' : 'diajukan';

    upsertVerificationRegistryEntry({
      id:
        rec.id ||
        `sub-${rec.nurseRole || 'perawat_pelaksana'}-${getNurseStorageKey(rec.nurseName)}-${targetDateIso}-${rec.shift || 'Pagi'}`,
      submittedNurseName: rec.nurseName,
      submittedNurseNip: rec.nurseNip,
      submittedNurseRole: rec.nurseRole || 'perawat_pelaksana',
      targetRole:
        rec.targetRole || (userRole === 'kepala_ruangan' ? 'kepala_ruangan' : 'pj_shift'),
      targetVerifierName: rec.targetVerifierName || verifierName,
      shift: rec.shift,
      dateKey: targetDateIso,
      dateLabel: targetDateLabel,
      status: nextOverallStatus,
      submittedAt: rec.submittedAt || timestamp,
      verifiedAt: allVerifiedNow ? timestamp : '',
      verifiedBy: allVerifiedNow ? verifierName : '',
      verifiedByRole: allVerifiedNow ? verifierRoleLabel : '',
      verifierNotes: rec.verifierNotes || '',
      revisionRequested: false,
      revisionEpoch: 0,
      patients: buildRegistryPatientsPayload(updatedSummary)
    });

    syncNurseSubmissionStorage(
      rec.nurseName,
      {
        status: nextOverallStatus,
        submittedNurseName: rec.nurseName,
        submittedNurseNip: rec.nurseNip,
        submittedAt: rec.submittedAt || timestamp,
        verifiedAt: allVerifiedNow ? timestamp : '',
        verifiedBy: allVerifiedNow ? verifierName : '',
        verifiedByRole: allVerifiedNow ? verifierRoleLabel : '',
        verifierNotes: rec.verifierNotes || '',
        revisionRequested: false,
        revisionEpoch: 0
      },
      patientPatches
    );

    setRegistryEntries(getVerificationRegistry());

    if (allVerifiedNow && onVerificationUpdated) {
      onVerificationUpdated(rec.nurseName, 'terverifikasi', {
        verifiedAt: timestamp,
        verifiedBy: verifierName,
        verifiedByRole: verifierRoleLabel,
        verifierNotes: rec.verifierNotes || '',
        revisionRequested: false,
        revisionEpoch: 0,
        shift: rec.shift,
        dateKey: targetDateIso,
        dateLabel: targetDateLabel
      });
    }

    showToast(
      `${eligiblePatients.length} logbook pasien kelolaan ${rec.nurseName} telah diverifikasi & dikunci oleh ${verifierRoleLabel}.`
    );
  };

  const openRevisionModal = (
    rec: RosterVerificationRecord,
    patient?: PatientVerificationDetail
  ) => {
    setRevisionModalTarget({ rec, patient });
    setRevisionNoteInput(
      patient?.verifierNotes ||
        rec.verifierNotes ||
        ''
    );
  };

  const handleConfirmRevisionModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionModalTarget) return;
    const { rec, patient } = revisionModalTarget;
    const cleanNote =
      revisionNoteInput.trim() ||
      'Mohon periksa dan perbaiki kembali kelengkapan logbook SPO sesuai standar.';
    if (patient) {
      handleVerifyPatientRevise(rec, patient, cleanNote);
    } else {
      handleVerifyAllPatientsRevise(rec, cleanNote);
    }
    setRevisionModalTarget(null);
    setRevisionNoteInput('');
  };

  const filteredRecords = queueRecords.filter((rec) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      rec.nurseName.toLowerCase().includes(q) ||
      rec.nurseNip.toLowerCase().includes(q) ||
      rec.patientsSummary.some(
        (p) =>
          p.patientName.toLowerCase().includes(q) ||
          p.bedNumber.toLowerCase().includes(q) ||
          (p.medicalRecord && p.medicalRecord.toLowerCase().includes(q))
      );
    const matchesStatus = statusFilter === 'all' || rec.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const waitingCount = queueRecords.filter((r) => r.status === 'diajukan').length;
  const verifiedCount = queueRecords.filter((r) => r.status === 'terverifikasi').length;
  const revisionCount = queueRecords.filter((r) => r.status === 'belum_diajukan').length;

  return (
    <div className="space-y-5">
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-400/40">
          <CheckCircle2 className="w-5 h-5 text-emerald-100 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Role Queue Context Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                userRole === 'kepala_ruangan'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-indigo-100 text-indigo-700'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-slate-900">
                  {userRole === 'kepala_ruangan'
                    ? 'Halaman Verifikasi Kepala Ruang'
                    : 'Halaman Verifikasi Penanggung Jawab (PJ) Shift'}
                </h2>
                <span className="text-xs text-slate-400" aria-hidden="true">
                  &middot;
                </span>
                <span className="text-xs font-bold text-indigo-700">{verifierName}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {userRole === 'kepala_ruangan'
                  ? 'Hanya menampilkan pengajuan verifikasi logbook yang ditujukan kepada Kepala Ruang (termasuk pasien kelolaan PJ Shift dan pengajuan mandiri Kepala Ruang). Pengajuan yang tidak ditujukan kepada Kepala Ruang tidak ditampilkan.'
                  : `Hanya menampilkan pengajuan verifikasi logbook yang ditujukan khusus untuk Anda (${verifierName}) sebagai PJ Shift (dari Perawat Pelaksana, PJ Shift lainnya, atau Kepala Ruang). Pengajuan yang tidak ditujukan untuk Anda otomatis disembunyikan.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0 tabular-nums">
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 whitespace-nowrap">
              {queueRecords.length} Pengajuan Aktif
            </span>
          </div>
        </div>
      </div>

      {/* Search & Status Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              userRole === 'kepala_ruangan'
                ? 'Cari nama PJ Shift pengaju, nomor bed, atau nama pasien kelolaan...'
                : 'Cari nama perawat / PJ Shift pengaju, nomor bed, atau nama pasien kelolaan...'
            }
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white font-medium"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              { id: 'all', label: `Semua (${queueRecords.length})` },
              { id: 'diajukan', label: `Menunggu Verifikasi (${waitingCount})` },
              { id: 'terverifikasi', label: `Terverifikasi (${verifiedCount})` },
              ...(revisionCount > 0
                ? [{ id: 'belum_diajukan' as const, label: `Perlu Revisi (${revisionCount})` }]
                : [])
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 tabular-nums ${
                statusFilter === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Verification Queue Cards */}
      <div className="space-y-4">
        {filteredRecords.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-2">
            <ClipboardCheck className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">
              {queueRecords.length === 0
                ? userRole === 'kepala_ruangan'
                  ? 'Belum ada pengajuan verifikasi logbook yang ditujukan kepada Kepala Ruang'
                  : `Belum ada pengajuan verifikasi logbook yang ditujukan kepada ${verifierName}`
                : 'Tidak ada data pengajuan verifikasi yang sesuai filter'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {queueRecords.length === 0
                ? userRole === 'kepala_ruangan'
                  ? 'Pengajuan dari PJ Shift atau Kepala Ruang akan otomatis muncul di halaman ini segera setelah diajukan pada Bagian VII Logbook.'
                  : 'Pengajuan dari Perawat Pelaksana yang memilih Anda sebagai PJ Shift tujuan akan otomatis muncul di halaman ini.'
                : 'Ubah kata kunci pencarian atau pilih filter status lainnya.'}
            </p>
          </div>
        ) : (
          filteredRecords.map((rec, nurseIdx) => {
            const palette = NURSE_COLOR_PALETTES[nurseIdx % NURSE_COLOR_PALETTES.length];
            const patSpoCompleted = rec.patientsSummary.reduce((acc, p) => acc + p.completed, 0);
            const patSpoTotal = rec.patientsSummary.reduce((acc, p) => acc + p.total, 0);
            const grandCompleted = rec.facilityCompleted + patSpoCompleted;
            const grandTotal = rec.facilityTotal + patSpoTotal;
            const grandPct = grandTotal > 0 ? Math.round((grandCompleted / grandTotal) * 100) : 0;
            const verifiedPatientsCount = rec.patientsSummary.filter(
              (p) => p.status === 'terverifikasi'
            ).length;

            const waitingPatientsCount = rec.patientsSummary.filter(
              (p) => p.status === 'diajukan'
            ).length;
            const revisablePatientsCount = rec.patientsSummary.filter(
              (p) => p.status === 'diajukan' || p.status === 'terverifikasi'
            ).length;

            const targetDisplay =
              rec.targetRole === 'kepala_ruangan' || rec.targetRole === 'mandiri'
                ? `Tujuan Kepala Ruang: ${rec.targetVerifierName}`
                : `Tujuan PJ Shift: ${rec.targetVerifierName}`;

            return (
              <div
                key={rec.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs"
              >
                {/* Top Row: Nurse Identity + Verification Status */}
                <div
                  className={`p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${palette.bgHeader}`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-black text-sm tracking-wide ${palette.avatarBg}`}
                      title={`Inisial: ${getNurseInitials(rec.nurseName)}`}
                    >
                      <span>{getNurseInitials(rec.nurseName)}</span>
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 tabular-nums">
                        <span
                          className={`inline-flex items-center gap-1 font-bold ${
                            rec.status === 'terverifikasi'
                              ? 'text-emerald-700'
                              : rec.status === 'diajukan'
                              ? 'text-indigo-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {rec.status === 'terverifikasi' ? (
                            <Lock className="w-3 h-3 shrink-0" />
                          ) : rec.status === 'diajukan' ? (
                            <Edit3 className="w-3 h-3 shrink-0" />
                          ) : null}
                          <span>
                            {rec.status === 'terverifikasi'
                              ? 'Terverifikasi (Terkunci)'
                              : rec.status === 'diajukan'
                              ? 'Menunggu Verifikasi (Dapat Diedit Verifikator)'
                              : 'Menunggu Perbaikan Perawat'}
                          </span>
                        </span>
                        <span aria-hidden="true">&middot;</span>
                        <span>Shift {rec.shift}</span>
                        <span aria-hidden="true">&middot;</span>
                        <span>{formatSubmitterRoleLabel(rec.nurseRole)}</span>
                        <span aria-hidden="true">&middot;</span>
                        <span className="font-semibold text-slate-700">
                          {verifiedPatientsCount} dari {rec.patientsSummary.length} Pasien Disahkan
                        </span>
                      </div>

                      <h3 className={`text-base sm:text-lg tracking-tight font-black ${palette.nameColor}`}>
                        {rec.nurseName}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 tabular-nums">
                        <span className="font-mono">NIP: {rec.nurseNip}</span>
                        <span aria-hidden="true">&middot;</span>
                        <span>{targetDisplay}</span>
                        {rec.submittedAt && (
                          <>
                            <span aria-hidden="true">&middot;</span>
                            <span>Diajukan: {rec.submittedAt}</span>
                          </>
                        )}
                        {rec.verifiedAt && (
                          <>
                            <span aria-hidden="true">&middot;</span>
                            <span className="text-emerald-700 font-semibold">
                              Disahkan: {rec.verifiedAt}
                              {rec.verifiedBy ? ` oleh ${rec.verifiedBy}` : ''}
                            </span>
                          </>
                        )}
                      </div>

                      {rec.pelaksanaNotes && (
                        <p className="text-xs text-slate-600 pt-1 italic">
                          Catatan Pengaju: &ldquo;{rec.pelaksanaNotes}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right SPO Summary & Batch Verify / Request Repair Buttons */}
                  <div className="flex flex-col md:items-end gap-2 shrink-0 tabular-nums">
                    <div className="text-sm font-black text-slate-900 font-mono text-left md:text-right">
                      {grandCompleted}/{grandTotal} SPO ({grandPct}%)
                    </div>
                    <div className="text-xs text-slate-500 text-left md:text-right">
                      Bagian I: {rec.facilityCompleted}/{rec.facilityTotal} &middot;{' '}
                      {rec.patientsSummary.length} Pasien Kelolaan
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1 self-start md:self-end">
                      {revisablePatientsCount > 0 && (
                        <button
                          type="button"
                          onClick={() => openRevisionModal(rec)}
                          className="px-3 py-2 bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                          title="Minta perawat memperbaiki kembali seluruh logbook pasien ini (membuka kunci edit)"
                        >
                          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                          <span>Minta Perbaikan Semua</span>
                        </button>
                      )}

                      {waitingPatientsCount > 0 && (
                        <button
                          type="button"
                          onClick={() => handleVerifyAllPatients(rec)}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
                          title="Verifikasi seluruh pasien berstatus Menunggu Verifikasi sekaligus"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                          <span>Sahkan Pasien ({waitingPatientsCount})</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Middle Row: Managed Patients Detailed Cards */}
                <div className="p-4 sm:p-5 bg-white space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>Daftar Logbook Pasien Kelolaan ({rec.patientsSummary.length} Pasien)</span>
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      Verifikator (PJ Shift &amp; Kepala Ruang) dapat mengedit logbook yang diajukan melalui tombol &ldquo;Edit &amp; Verifikasi&rdquo;, atau klik &ldquo;Minta Perbaikan&rdquo; agar perawat pengaju memperbaiki kembali.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {rec.patientsSummary.map((pat) => {
                      const isPatVerified = pat.status === 'terverifikasi';
                      const isPatWaiting = pat.status === 'diajukan';
                      const sess = pat.session;

                      return (
                        <div
                          key={`${rec.id}-${pat.bedNumber}-${pat.id}`}
                          className={`rounded-2xl border p-4 transition-all flex flex-col justify-between gap-3 ${
                            isPatVerified
                              ? 'bg-emerald-50/30 border-emerald-300'
                              : isPatWaiting
                              ? 'bg-slate-50/50 border-slate-200 hover:border-slate-300'
                              : 'bg-amber-50/40 border-amber-300'
                          }`}
                        >
                          {/* Card Top: Bed, Name, and Status */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2 text-xs tabular-nums">
                              <span className="font-mono font-bold text-blue-800">
                                {pat.bedNumber}
                                {pat.medicalRecord ? ` · RM ${pat.medicalRecord}` : ''}
                              </span>
                              {isPatVerified ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                                  <Lock className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>Terverifikasi</span>
                                </span>
                              ) : isPatWaiting ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700">
                                  <Edit3 className="w-3 h-3 text-indigo-600 shrink-0" />
                                  <span>Menunggu Verifikasi</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>Diminta Perbaikan</span>
                                </span>
                              )}
                            </div>

                            <div className="font-black text-slate-900 text-sm leading-tight pt-0.5">
                              {pat.patientName}
                            </div>

                            {/* SPO Indicator Score */}
                            <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 font-mono tabular-nums">
                              <span>Kelengkapan SPO Bag. II–VI:</span>
                              <strong
                                className={
                                  pat.completed === pat.total ? 'text-emerald-700' : 'text-amber-700'
                                }
                              >
                                {pat.completed}/{pat.total} SPO
                              </strong>
                            </div>

                            {pat.verifierNotes && (
                              <div className="text-[11px] text-amber-900 bg-amber-50/80 border border-amber-200/80 rounded-lg px-2 py-1 mt-1 line-clamp-2">
                                <strong className="font-bold">Catatan Verifikator:</strong>{' '}
                                {pat.verifierNotes}
                              </div>
                            )}
                          </div>

                          {/* Action Buttons: Edit & Verifikasi / Lihat Detail + Minta Perbaikan / Sahkan Pasien */}
                          <div className="pt-2.5 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPatientModal({
                                  patient: pat,
                                  nurseName: rec.nurseName,
                                  nurseNip: rec.nurseNip,
                                  session: sess,
                                  shift: rec.shift,
                                  dateKey: rec.dateKey,
                                  dateLabel: rec.dateLabel
                                });
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-indigo-50 text-indigo-800 font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-200 whitespace-nowrap shrink-0"
                              title={
                                isPatVerified
                                  ? 'Lihat rincian SPO Bagian I–VI logbook pasien terverifikasi'
                                  : 'Edit & verifikasi rincian SPO Bagian I–VI logbook pasien ini'
                              }
                            >
                              {isPatVerified ? (
                                <>
                                  <Eye className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                  <span>Lihat Detail</span>
                                </>
                              ) : (
                                <>
                                  <Edit3 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                  <span>Edit &amp; Verifikasi</span>
                                </>
                              )}
                            </button>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isPatVerified ? (
                                <button
                                  type="button"
                                  onClick={() => openRevisionModal(rec, pat)}
                                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-amber-50 text-amber-800 hover:text-amber-900 border border-amber-300 text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0"
                                  title="Minta perawat memperbaiki kembali logbook ini (membuka kunci edit)"
                                >
                                  <RotateCcw className="w-3 h-3 shrink-0" />
                                  <span>Minta Perbaikan Kembali</span>
                                </button>
                              ) : isPatWaiting ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openRevisionModal(rec, pat)}
                                    className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0"
                                    title="Kembalikan logbook ke perawat pengaju untuk diperbaiki kembali"
                                  >
                                    <RotateCcw className="w-3 h-3 shrink-0" />
                                    <span>Minta Perbaikan</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleVerifyPatientApprove(rec, pat)}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
                                    title="Verifikasi & sahkan logbook pasien ini"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                                    <span>Sahkan</span>
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openRevisionModal(rec, pat)}
                                  className="px-2.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0"
                                  title="Perbarui catatan instruksi perbaikan untuk perawat pengaju"
                                >
                                  <MessageSquare className="w-3 h-3 shrink-0" />
                                  <span>Ubah Catatan Perbaikan</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Minta Perbaikan Kembali (Unlocks Logbook for Submitting Nurse) */}
      {revisionModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-5 py-4 bg-amber-50 border-b border-amber-200 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-600 text-white shrink-0">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Minta Perbaikan Kembali &amp; Buka Kunci Logbook
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Verifikator: <strong className="text-slate-900">{verifierName}</strong> ({verifierRoleLabel})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRevisionModalTarget(null);
                  setRevisionNoteInput('');
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-amber-100/60 cursor-pointer"
                aria-label="Tutup modal perbaikan"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmRevisionModal} className="p-5 space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Perawat Pengaju:</span>
                  <strong className="text-slate-900 font-bold">
                    {revisionModalTarget.rec.nurseName}
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Target Logbook:</span>
                  <strong className="text-blue-900 font-bold">
                    {revisionModalTarget.patient
                      ? `${revisionModalTarget.patient.patientName} (${revisionModalTarget.patient.bedNumber})`
                      : `Seluruh Pasien (${revisionModalTarget.rec.patientsSummary.length} Pasien)`}
                  </strong>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                Bagi perawat pengaju, logbook yang berstatus <strong>Menunggu Verifikasi</strong>{' '}
                maupun <strong>Sudah Diverifikasi</strong> terkunci otomatis. Mengirim permintaan
                perbaikan akan <strong>membuka kunci logbook</strong> pada halaman perawat pengaju
                sehingga dapat diedit kembali Bagian I–VI lalu diajukan ulang.
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Catatan / Instruksi Perbaikan untuk Perawat:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Lengkapi parameter klinis Pre/Post HD (BB, TD, UFG)',
                    'Periksa kembali kelengkapan checklist SPO Bagian II–VI',
                    'Lengkapi dokumentasi komplikasi intra-HD & advis DPJP',
                    'Sesuaikan identitas bed / akses vaskuler pasien'
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() =>
                        setRevisionNoteInput((prev) =>
                          prev.trim() ? `${prev.trim()}; ${preset}` : preset
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 border border-slate-200 text-[11px] font-medium transition-colors cursor-pointer text-left"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={3}
                  value={revisionNoteInput}
                  onChange={(e) => setRevisionNoteInput(e.target.value)}
                  placeholder="Tuliskan bagian atau butir SPO yang perlu diperbaiki kembali oleh perawat..."
                  className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setRevisionModalTarget(null);
                    setRevisionNoteInput('');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5 shrink-0" />
                  <span>Kirim Permintaan Perbaikan &amp; Buka Kunci</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Patient Logbook Verification Detail & Edit Modal */}
      {selectedPatientModal && (
        <PatientLogbookVerificationModal
          isOpen={!!selectedPatientModal}
          onClose={() => setSelectedPatientModal(null)}
          patient={selectedPatientModal.patient}
          nurseName={selectedPatientModal.nurseName}
          nurseNip={selectedPatientModal.nurseNip}
          masterNurses={masterNurses}
          shiftInfo={shiftInfo}
          submissionShift={selectedPatientModal.shift}
          submissionDateKey={selectedPatientModal.dateKey}
          submissionDateLabel={selectedPatientModal.dateLabel}
          userRole={userRole}
          verifierName={verifierName}
          session={selectedPatientModal.session}
          verificationStatus={selectedPatientModal.patient.status}
          verifiedAt={selectedPatientModal.patient.verifiedAt}
          verifiedBy={selectedPatientModal.patient.verifiedBy}
          verifiedByRole={selectedPatientModal.patient.verifiedByRole}
          verifierNotes={selectedPatientModal.patient.verifierNotes}
          initialScore={selectedPatientModal.patient.score}
          initialGrade={selectedPatientModal.patient.grade}
          isInitiallyCorrected={selectedPatientModal.patient.isCorrected}
          onSaveLogbookEdits={(payload) => {
            const rec =
              queueRecords.find(
                (r) =>
                  isMatchingNurse(r.nurseName, selectedPatientModal.nurseName) &&
                  (!selectedPatientModal.dateKey || r.dateKey === selectedPatientModal.dateKey) &&
                  (!selectedPatientModal.shift || r.shift === selectedPatientModal.shift)
              ) ||
              queueRecords.find((r) =>
                isMatchingNurse(r.nurseName, selectedPatientModal.nurseName)
              );
            if (rec) {
              handleSavePatientLogbookEdits(rec, selectedPatientModal.patient, payload);
            }
          }}
          onVerifyApprove={(_patientId, notes, evaluation) => {
            const rec =
              queueRecords.find(
                (r) =>
                  isMatchingNurse(r.nurseName, selectedPatientModal.nurseName) &&
                  (!selectedPatientModal.dateKey || r.dateKey === selectedPatientModal.dateKey) &&
                  (!selectedPatientModal.shift || r.shift === selectedPatientModal.shift)
              ) ||
              queueRecords.find((r) =>
                isMatchingNurse(r.nurseName, selectedPatientModal.nurseName)
              );
            if (rec) {
              handleVerifyPatientApprove(rec, selectedPatientModal.patient, notes, evaluation);
            }
            setSelectedPatientModal(null);
          }}
          onVerifyRevise={(_patientId, notes, evaluation) => {
            const rec =
              queueRecords.find(
                (r) =>
                  isMatchingNurse(r.nurseName, selectedPatientModal.nurseName) &&
                  (!selectedPatientModal.dateKey || r.dateKey === selectedPatientModal.dateKey) &&
                  (!selectedPatientModal.shift || r.shift === selectedPatientModal.shift)
              ) ||
              queueRecords.find((r) =>
                isMatchingNurse(r.nurseName, selectedPatientModal.nurseName)
              );
            if (rec) {
              handleVerifyPatientRevise(rec, selectedPatientModal.patient, notes, evaluation);
            }
            setSelectedPatientModal(null);
          }}
        />
      )}
    </div>
  );
};
