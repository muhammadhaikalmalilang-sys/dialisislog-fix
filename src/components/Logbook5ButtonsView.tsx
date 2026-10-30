import React, { useState, useEffect } from 'react';
import {
  Droplets,
  Sliders,
  UserCheck,
  Activity,
  GraduationCap,
  CheckCircle2,
  Check,
  X,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Save,
  Square,
  ChevronRight,
  Users,
  UserPlus,
  CalendarClock,
  Search,
  Trash2,
  Hand,
  ClipboardCheck,
  Send,
  Clock,
  RotateCcw,
  AlertCircle,
  FileText,
  Sun,
  Sunset,
  CheckSquare,
  Stethoscope,
  Plus,
  Lock,
  AlertTriangle,
  Printer
} from 'lucide-react';
import { OFFICIAL_LOGBOOK_ITEMS } from '../data/officialPelaksanaLogbookData.ts';
import { PelaksanaLogbookPrintableModal } from './PelaksanaLogbookPrintableModal.tsx';
import { ensureFullBagianData } from '../utils/logbookStandards.ts';
import {
  PatientHDSession,
  ShiftInfo,
  MasterPatient,
  MasterNurse,
  MasterBed,
  MasterDoctor,
  SystemAccessRole,
  HdTreatmentDay
} from '../types/dialysis.ts';
import {
  formatSystemAccessLabel,
  filterMasterPatientsForActiveSchedule,
  resolvePatientTreatmentDays,
  resolvePatientTreatmentShift,
  buildPatientDaySchedule
} from '../utils/masterDataHelpers.ts';
import { LoginUserData } from './LoginPage.tsx';
import {
  Poin2_1ClinicalData,
  Poin3_1ClinicalData,
  Poin3_1Status,
  Poin3_1RuangRawatInap,
  Poin3_1Kategori,
  Poin3_2ClinicalData,
  Poin3_5ClinicalData,
  Poin4_1ClinicalData,
  Poin4_3ClinicalData,
  Poin4_3ComplicationKey,
  Poin4_3DynamicEntry,
  PILIHAN_KOMPLIKASI_DROPDOWN,
  getDefaultAdvisForJenis,
  getComplicationValueConfig,
  createDefaultPoin4_3Entry,
  KOMPLIKASI_INTRA_HD_ITEMS,
  PatientLogbookClinicalDetails,
  setAllPoin2_1,
  setAllPoin3_1,
  isPoin3_1Complete,
  getPoin3_1Counts,
  normalizePoin2_1Data,
  normalizePoin4_1Data,
  normalizePoin4_3Data,
  normalizePatientClinicalDetails,
  parseClinicalNumber,
  getPoin2_1Counts,
  formatPoin2_1Note,
  formatPoin3_1Note,
  computeWeightMetrics,
  isPoin3_2LogbookComplete,
  formatPoin3_2LogbookNote,
  parsePreBpInput,
  isPoin3_3LogbookComplete,
  formatPoin3_3LogbookNote,
  isPoin3_5Complete,
  formatPoin3_5Note,
  isMeaningfulAccessInput,
  isPoin3_6Complete,
  formatPoin3_6Note,
  isPoin4_1Complete,
  formatPoin4_1Note,
  createEmptyPoin4_3Data,
  getActivePoin4_3Complications,
  isPoin4_3Complete,
  formatPoin4_3Note,
  Poin6_3ClinicalData,
  isPoin6_3Complete,
  formatPoin6_3Note,
  createDefaultPatientClinicalDetails
} from '../utils/logbookClinicalHelpers.ts';
import {
  upsertVerificationRegistryEntry,
  getVerificationRegistry,
  isMatchingNurse,
  getNurseStorageKey,
  getNurseManagedPatientsKey,
  getNurseShiftScheduleKey,
  getNursePatientStatusesKey,
  getNursePatientNotesKey,
  getNurseClinicalDetailsKey,
  getNurseSubmissionKey,
  getNursePatientSubmissionsKey,
  buildPatientVerificationKey,
  isSameBed,
  getNurseFacilityStatusesKey,
  getNurseFacilityNotesKey,
  getNurseShiftDoctorsKey,
  getNurseLastActiveDateKey,
  touchNurseDailyStorage,
  clearNurseDailyLogbookStorage,
  checkAndResetOutdatedNurseDailyStorage,
  readNurseFacilityStatuses,
  readNurseFacilityNotes,
  resolveLogbookLockState,
  collectOccupiedLogbookAssets,
  isSamePatientIdentity,
  PER_PATIENT_STATUS_STORAGE_KEY
} from '../utils/nurseVerificationHelpers.ts';
import {
  extractActiveDayName,
  formatCurrentWibTimestamp,
  getCurrentIndonesianFullDate,
  getCurrentIsoDateWib,
  isTodayWib,
  normalizeIndonesianDateLabel,
  indonesianDateLabelToIso
} from '../utils/dateHelpers.ts';
import {
  subscribeToNurseLogbook,
  saveNurseLogbookCloud,
  type NurseLogbookCloudData
} from '../services/firebase.ts';

export interface ManagedPatient {
  id: string;
  bedNumber: string;
  patientName: string;
  medicalRecord?: string;
  isReschedule?: boolean;
  originalSchedule?: string;
  rescheduleReason?: string;
}

export type PjVerificationStatus = 'belum_diajukan' | 'diajukan' | 'terverifikasi';

export interface PjVerificationSubmission {
  id?: string;
  status: PjVerificationStatus;
  submittedNurseName: string;
  submittedNurseNip: string;
  submittedNurseRole?: 'perawat_pelaksana' | 'pj_shift' | 'kepala_ruangan';
  targetRole?: 'pj_shift' | 'kepala_ruangan' | 'mandiri';
  targetVerifierName?: string;
  targetVerifierNip?: string;
  pjShiftName: string;
  pjShiftNip: string;
  notes: string;
  declarationChecked: boolean;
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

export const PRESET_DPJP_DOCTORS = [
  'dr. Raden Heru Prasanto, Sp.PD-KGH',
  'dr. Paramitha, Sp.PD-KGH',
  'dr. Tri Hastuti, Sp.PD-KGH',
  'dr. Konsulen Pengganti, Sp.PD'
];

export const PRESET_JAGA_DOCTORS = [
  'dr. Budi Setiawan',
  'dr. Aditya Nugraha',
  'dr. Paramitha',
  'dr. Siti Rahmawati',
  'dr. Tri Hastuti'
];

interface Logbook5ButtonsViewProps {
  sessions?: PatientHDSession[];
  cloudNurseLogbooks?: NurseLogbookCloudData[];
  shiftInfo?: ShiftInfo;
  masterPatients?: MasterPatient[];
  masterNurses?: MasterNurse[];
  masterBeds?: MasterBed[];
  masterDoctors?: MasterDoctor[];
  loggedInUser?: LoginUserData | null;
  userRole?: SystemAccessRole;
  onSyncNurseSessions?: (
    nurseName: string,
    managedPatients: ManagedPatient[],
    verification: {
      status: PjVerificationStatus;
      verifiedAt?: string;
      verifiedBy?: string;
      verifiedByRole?: string;
      verifierNotes?: string;
      date?: string;
      sessionDate?: string;
      shift?: 'Pagi' | 'Siang';
      clinicalDetails?: Record<string, PatientLogbookClinicalDetails>;
      patientStatuses?: Record<string, Record<string, boolean>>;
      perPatientStatuses?: Record<
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
        }
      >;
    }
  ) => void;
  onShiftChange?: (shift: 'Pagi' | 'Siang') => void;
  onDateChange?: (isoDate: string) => void;
  isCustomDate?: boolean;
  onResetDateToToday?: () => void;
  onNavigateToVerifikasi?: () => void;
  onNavigateToRiwayat?: () => void;
}

interface BagianMeta {
  num: number;
  roman: string;
  scopeLabel: string;
  title: string;
  fullName: string;
  subtitle: string;
  icon: React.ElementType;
  isPatientSpecific: boolean;
}

const BAGIAN_METAS: BagianMeta[] = [
  {
    num: 1,
    roman: 'BAGIAN I',
    scopeLabel: 'Fasilitas & Sistem RO Unit',
    title: 'Kesiapan Fasilitas Ruangan Hemodialisis & Sistem Water Treatment (RO)',
    fullName: 'BAGIAN I: Kesiapan Fasilitas Ruangan Hemodialisis & Sistem Water Treatment (RO)',
    subtitle:
      'Kesiapan RO & water treatment, suhu serta zonasi ruangan, dan kesiapan troli darurat beserta alat emergensi.',
    icon: Droplets,
    isPatientSpecific: false
  },
  {
    num: 2,
    roman: 'BAGIAN II',
    scopeLabel: 'Persiapan Pre-HD',
    title: 'Persiapan Perawat, Peralatan, Mesin HD & Alat Kesehatan (Pre-HD)',
    fullName: 'BAGIAN II: Persiapan Perawat, Peralatan, Mesin HD & Alat Kesehatan (Pre-HD)',
    subtitle:
      'Hand hygiene & APD, kelulusan self-test mesin HD, pemasangan acid/bikarbonat & RO, verifikasi dialyzer, priming, serta konduktivitas dialisat.',
    icon: Sliders,
    isPatientSpecific: true
  },
  {
    num: 3,
    roman: 'BAGIAN III',
    scopeLabel: 'Pengkajian & Keselamatan Pre-HD',
    title: 'Identifikasi Pasien, Pengkajian Pre-HD & Keselamatan Pasien (Patient Safety)',
    fullName:
      'BAGIAN III: Identifikasi Pasien, Pengkajian Pre-HD & Keselamatan Pasien (Patient Safety)',
    subtitle:
      'Identifikasi pasien (SKP 1), pengkajian berat badan & target cairan (UF Goal), TTV Pre-HD, risiko jatuh, konfirmasi resep, dan akses vaskular.',
    icon: UserCheck,
    isPatientSpecific: true
  },
  {
    num: 4,
    roman: 'BAGIAN IV',
    scopeLabel: 'Monitoring Intra-HD',
    title: 'Monitoring Intra-HD & Pencegahan Insiden Keselamatan Pasien (IKP)',
    fullName: 'BAGIAN IV: Monitoring Intra-HD & Pencegahan Insiden Keselamatan Pasien (IKP)',
    subtitle:
      'Observasi berkala TTV & parameter mesin (AP, VP, TMP, UF), respon alarm mesin < 1 menit, penanganan komplikasi, dan fiksasi akses.',
    icon: Activity,
    isPatientSpecific: true
  },
  {
    num: 5,
    roman: 'BAGIAN V',
    scopeLabel: 'Edukasi Pasien & Keluarga',
    title: 'Edukasi Terstruktur Kepada Pasien & Keluarga (Diet, Cairan, Kebersihan Diri)',
    fullName:
      'BAGIAN V: Edukasi Terstruktur Kepada Pasien & Keluarga (Diet, Cairan, Kebersihan Diri)',
    subtitle:
      'Edukasi pembatasan cairan harian, diet ginjal rendah kalium & fosfat, personal hygiene, perawatan akses vaskular di rumah, dan kepatuhan jadwal HD.',
    icon: GraduationCap,
    isPatientSpecific: true
  },
  {
    num: 6,
    roman: 'BAGIAN VI',
    scopeLabel: 'Terminasi & Dokumentasi Post-HD',
    title: 'Terminasi Aman, Evaluasi Post-HD, Disinfeksi Mesin & Pendokumentasian',
    fullName:
      'BAGIAN VI: Terminasi Aman, Evaluasi Post-HD, Disinfeksi Mesin & Pendokumentasian',
    subtitle:
      'Terminasi HD aman (washback), hemostasis akses, evaluasi TTV & BB Post-HD, disinfeksi mesin HD, serta dokumentasi asuhan CPPT.',
    icon: Stethoscope,
    isPatientSpecific: true
  },
  {
    num: 7,
    roman: 'BAGIAN VII',
    scopeLabel: 'Rekapitulasi & Verifikasi Pasien',
    title: 'Pengajuan Verifikasi Logbook Pasien',
    fullName: 'BAGIAN VII: Pengajuan Verifikasi Logbook Pasien',
    subtitle:
      'Pemeriksaan kelengkapan indikator SPO Bagian I–VI pasien ini dan pengajuan verifikasi logbook pasien.',
    icon: ClipboardCheck,
    isPatientSpecific: false
  }
];

export type EmptyManagedPatientsList = ManagedPatient[];

function buildInitialClinicalDetailsMap(
  patients: ManagedPatient[]
): Record<string, PatientLogbookClinicalDetails> {
  const initial: Record<string, PatientLogbookClinicalDetails> = {};
  patients.forEach((p) => {
    initial[p.id] = createDefaultPatientClinicalDetails('new');
  });
  return initial;
}

function buildDefaultStatusesForPatients(
  patients: ManagedPatient[]
): Record<string, Record<string, boolean>> {
  const initial: Record<string, Record<string, boolean>> = {};
  const patientSpoItems = OFFICIAL_LOGBOOK_ITEMS.filter((it) => it.bagian >= 2 && it.bagian <= 6);
  patients.forEach((p) => {
    initial[p.id] = {};
    patientSpoItems.forEach((it) => {
      initial[p.id][it.code] = false;
    });
  });
  return initial;
}

function buildDefaultNotesForPatients(
  patients: ManagedPatient[]
): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};
  patients.forEach((p) => {
    result[p.id] = {};
  });
  return result;
}

export const Logbook5ButtonsView: React.FC<Logbook5ButtonsViewProps> = ({
  sessions = [],
  cloudNurseLogbooks = [],
  shiftInfo,
  masterPatients = [],
  masterNurses = [],
  masterBeds = [],
  masterDoctors = [],
  loggedInUser,
  userRole = 'perawat_pelaksana',
  onSyncNurseSessions,
  onShiftChange,
  onDateChange,
  isCustomDate,
  onResetDateToToday,
  onNavigateToVerifikasi,
  onNavigateToRiwayat
}) => {
  const dpjpDoctorsList = React.useMemo(() => {
    const activeFromMaster = (masterDoctors || [])
      .filter((d) => (d.role === 'dpjp' || d.role === 'both') && d.status === 'aktif')
      .map((d) => d.name);
    return activeFromMaster.length > 0 ? activeFromMaster : PRESET_DPJP_DOCTORS;
  }, [masterDoctors]);

  const jagaDoctorsList = React.useMemo(() => {
    const activeFromMaster = (masterDoctors || [])
      .filter((d) => (d.role === 'dokter_jaga' || d.role === 'both') && d.status === 'aktif')
      .map((d) => d.name);
    return activeFromMaster.length > 0 ? activeFromMaster : PRESET_JAGA_DOCTORS;
  }, [masterDoctors]);
  const activeDate = shiftInfo?.date
    ? normalizeIndonesianDateLabel(shiftInfo.date)
    : getCurrentIndonesianFullDate();
  const shiftFromProps: 'Pagi' | 'Siang' = shiftInfo?.shift === 'Siang' ? 'Siang' : 'Pagi';
  const isToday = isTodayWib(activeDate);
  const todayIndonesianFull = getCurrentIndonesianFullDate();

  const activeRole: 'perawat_pelaksana' | 'pj_shift' | 'kepala_ruangan' =
    userRole === 'pj_shift'
      ? 'pj_shift'
      : userRole === 'kepala_ruangan'
      ? 'kepala_ruangan'
      : 'perawat_pelaksana';

  const defaultPelaksanaNurse = React.useMemo(() => {
    const onDutyPelaksana =
      masterNurses.find((n) => n.role === 'perawat_pelaksana' && n.isOnDutyToday) ||
      masterNurses.find((n) => n.role === 'perawat_pelaksana');
    return {
      name: onDutyPelaksana?.name || '-',
      nip: onDutyPelaksana?.nip || '-'
    };
  }, [masterNurses]);

  const defaultPjShiftNurse = React.useMemo(() => {
    const shiftPj = masterNurses.find(
      (n) => n.role === 'pj_shift' && n.shiftAssigned === shiftFromProps
    );
    const validShiftInfoPj =
      shiftInfo?.pjShift && shiftInfo.pjShift !== '-' ? shiftInfo.pjShift : '';
    const targetName = validShiftInfoPj || shiftPj?.name;
    if (targetName) {
      const matched = masterNurses.find((n) => isMatchingNurse(n.name, targetName));
      return {
        name: matched?.name || targetName,
        nip: matched?.nip || shiftPj?.nip || '-'
      };
    }
    const pjNurse =
      masterNurses.find((n) => n.role === 'pj_shift' && n.isOnDutyToday) ||
      masterNurses.find((n) => n.role === 'pj_shift');
    return {
      name: pjNurse?.name || '-',
      nip: pjNurse?.nip || '-'
    };
  }, [shiftInfo?.pjShift, shiftFromProps, masterNurses]);

  const defaultKaruNurse = React.useMemo(() => {
    const validKaruShift =
      shiftInfo?.kepalaRuangan && shiftInfo.kepalaRuangan !== '-' ? shiftInfo.kepalaRuangan : '';
    if (validKaruShift) {
      const matched = masterNurses.find((n) => isMatchingNurse(n.name, validKaruShift));
      return {
        name: matched?.name || validKaruShift,
        nip: matched?.nip || '-'
      };
    }
    const karu = masterNurses.find((n) => n.role === 'kepala_ruangan');
    return {
      name: karu?.name || '-',
      nip: karu?.nip || '-'
    };
  }, [shiftInfo?.kepalaRuangan, masterNurses]);

  // Active nurse identity scoped strictly to the logged-in account & active role
  const currentNurse = React.useMemo(() => {
    if (loggedInUser?.name && loggedInUser.userRole === userRole) {
      const matched = masterNurses.find((n) => isMatchingNurse(n.name, loggedInUser.name));
      return {
        name: loggedInUser.name,
        nip: loggedInUser.nip || matched?.nip || '-'
      };
    }
    if (activeRole === 'pj_shift') return defaultPjShiftNurse;
    if (activeRole === 'kepala_ruangan') return defaultKaruNurse;
    if (loggedInUser?.name) {
      const matched = masterNurses.find((n) => isMatchingNurse(n.name, loggedInUser.name));
      return {
        name: loggedInUser.name,
        nip: loggedInUser.nip || matched?.nip || '-'
      };
    }
    return defaultPelaksanaNurse;
  }, [
    loggedInUser,
    userRole,
    activeRole,
    masterNurses,
    defaultPjShiftNurse,
    defaultKaruNurse,
    defaultPelaksanaNurse
  ]);

  // Other PJ Shift options (excluding the currently logged-in PJ Shift nurse)
  const otherPjShiftOptions = React.useMemo(() => {
    const list: { name: string; nip: string; shift?: string }[] = [];
    masterNurses
      .filter(
        (n) =>
          (n.role === 'pj_shift' || n.systemAccess === 'pj_shift') &&
          n.accountStatus !== 'nonaktif' &&
          !isMatchingNurse(n.name, currentNurse.name)
      )
      .forEach((n) => {
        if (n.name && n.name !== '-' && !list.some((item) => isMatchingNurse(item.name, n.name))) {
          list.push({ name: n.name, nip: n.nip || '-', shift: n.shiftAssigned });
        }
      });
    return list;
  }, [masterNurses, currentNurse.name]);

  const defaultOtherPjShiftNurse = React.useMemo(
    () => otherPjShiftOptions[0] || { name: '-', nip: '-' },
    [otherPjShiftOptions]
  );

  const managedPatientsStorageKey = getNurseManagedPatientsKey(currentNurse.name);
  const shiftScheduleStorageKey = getNurseShiftScheduleKey(currentNurse.name);
  const patientStatusesStorageKey = getNursePatientStatusesKey(currentNurse.name);
  const patientNotesStorageKey = getNursePatientNotesKey(currentNurse.name);
  const clinicalDetailsStorageKey = getNurseClinicalDetailsKey(currentNurse.name);
  const submissionStorageKey = getNurseSubmissionKey(currentNurse.name);
  const patientSubmissionsStorageKey = getNursePatientSubmissionsKey(currentNurse.name);
  const facilityStatusesStorageKey = getNurseFacilityStatusesKey(currentNurse.name);
  const facilityNotesStorageKey = getNurseFacilityNotesKey(currentNurse.name);
  const shiftDoctorsStorageKey = getNurseShiftDoctorsKey(currentNurse.name);

  // Per-nurse selected Doctors for this shift (DPJP and Dokter Jaga Ruangan)
  const [selectedDokterDpjp, setSelectedDokterDpjp] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(shiftDoctorsStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.dokterDpjp) return parsed.dokterDpjp;
      }
    } catch {
      // ignore
    }
    return shiftInfo?.dokterDpjp || 'dr. Raden Heru Prasanto, Sp.PD-KGH';
  });

  const [selectedDokterJaga, setSelectedDokterJaga] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(shiftDoctorsStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.dokterJaga) return parsed.dokterJaga;
      }
    } catch {
      // ignore
    }
    return shiftInfo?.dokterJaga || 'dr. Paramitha';
  });

  const handleUpdateDokterDpjp = (nama: string) => {
    setSelectedDokterDpjp(nama);
    try {
      localStorage.setItem(
        shiftDoctorsStorageKey,
        JSON.stringify({ dokterDpjp: nama, dokterJaga: selectedDokterJaga })
      );
    } catch {
      // ignore
    }
  };

  const handleUpdateDokterJaga = (nama: string) => {
    setSelectedDokterJaga(nama);
    try {
      localStorage.setItem(
        shiftDoctorsStorageKey,
        JSON.stringify({ dokterDpjp: selectedDokterDpjp, dokterJaga: nama })
      );
    } catch {
      // ignore
    }
  };

  const handleSyncDoctorsFromPj = () => {
    const pjDpjp = shiftInfo?.dokterDpjp || 'dr. Raden Heru Prasanto, Sp.PD-KGH';
    const pjJaga = shiftInfo?.dokterJaga || 'dr. Paramitha';
    setSelectedDokterDpjp(pjDpjp);
    setSelectedDokterJaga(pjJaga);
    try {
      localStorage.setItem(
        shiftDoctorsStorageKey,
        JSON.stringify({ dokterDpjp: pjDpjp, dokterJaga: pjJaga })
      );
    } catch {
      // ignore
    }
    showToast(`Tim medis disinkronkan dari Laporan PJ Shift: ${pjJaga} & ${pjDpjp}`);
  };

  // Per-nurse selected Shift Dinas (Pagi or Siang)
  const [activeShift, setActiveShift] = useState<'Pagi' | 'Siang'>(() => {
    try {
      const savedShift = localStorage.getItem(shiftScheduleStorageKey);
      if (savedShift === 'Pagi' || savedShift === 'Siang') {
        return savedShift;
      }
    } catch {
      // ignore
    }
    return shiftFromProps;
  });

  const activeDayName: HdTreatmentDay = extractActiveDayName(activeDate);

  // Strictly filter patient choices to patients scheduled on the active day AND active shift
  const scheduledMasterPatients = React.useMemo(
    () => filterMasterPatientsForActiveSchedule(masterPatients, activeDayName, activeShift),
    [masterPatients, activeDayName, activeShift]
  );

  // Managed Patients State — strictly isolated per nurse and current day
  const [managedPatients, setManagedPatients] = useState<ManagedPatient[]>(() => {
    const todayIso = getCurrentIsoDateWib();
    const wasReset = checkAndResetOutdatedNurseDailyStorage(currentNurse.name, todayIso);
    if (wasReset) {
      return [];
    }

    try {
      const saved = localStorage.getItem(managedPatientsStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // fallback
    }

    if (currentNurse.name && currentNurse.name !== '-') {
      const reg = getVerificationRegistry();
      const regEntry = reg.find(
        (e) =>
          isMatchingNurse(e.submittedNurseName, currentNurse.name) &&
          (e.dateKey === todayIso || indonesianDateLabelToIso(e.dateLabel) === todayIso)
      );
      if (regEntry && Array.isArray(regEntry.patients) && regEntry.patients.length > 0) {
        return regEntry.patients.slice(0, 10).map((p, idx) => ({
          id: p.id || `p-${getNurseStorageKey(currentNurse.name)}-${idx + 1}`,
          bedNumber: p.bedNumber,
          patientName: p.patientName,
          medicalRecord: p.medicalRecord
        }));
      }

      const nurseSessions = sessions.filter(
        (s) =>
          isMatchingNurse(s.nurseInCharge, currentNurse.name) &&
          (s.sessionDate === todayIso || indonesianDateLabelToIso(s.date) === todayIso)
      );
      if (nurseSessions.length > 0) {
        return nurseSessions.slice(0, 10).map((s) => ({
          id: s.id,
          bedNumber: s.bedNumber,
          patientName: s.patientName,
          medicalRecord: s.medicalRecordNumber
        }));
      }
    }

    return [];
  });

  // Patient-First Workflow: openedPatientId always starts null on mount/login so Bagian I–VII only appear after clicking a patient
  const [openedPatientId, setOpenedPatientId] = useState<string | null>(null);

  const [activePatientId, setActivePatientId] = useState<string>(() => {
    return managedPatients[0]?.id || '';
  });

  // Draft input fields for adding a scheduled patient on the initial Logbook screen
  const [draftMasterId, setDraftMasterId] = useState<string>('');
  const [draftPatientName, setDraftPatientName] = useState<string>('');
  const [draftPatientRm, setDraftPatientRm] = useState<string>('');
  const [draftBedNumber, setDraftBedNumber] = useState<string>('');

  // Separate Modal & Draft state for Reschedule Patients (outside active shift schedule)
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState<boolean>(false);
  const [rescheduleSearchQuery, setRescheduleSearchQuery] = useState<string>('');
  const [rescheduleMasterId, setRescheduleMasterId] = useState<string>('');
  const [reschedulePatientName, setReschedulePatientName] = useState<string>('');
  const [reschedulePatientRm, setReschedulePatientRm] = useState<string>('');
  const [rescheduleBedNumber, setRescheduleBedNumber] = useState<string>('');
  const [rescheduleOriginalSchedule, setRescheduleOriginalSchedule] = useState<string>('');
  const [rescheduleReason, setRescheduleReason] = useState<string>('');

  // Structured Clinical Sub-Data for Bagian 2 (2.1) & Bagian 3 (3.1, 3.2, 3.3, 3.5, 3.6)
  const [patientClinicalDetails, setPatientClinicalDetails] = useState<
    Record<string, PatientLogbookClinicalDetails>
  >(() => {
    const base = buildInitialClinicalDetailsMap(managedPatients);
    try {
      const saved = localStorage.getItem(clinicalDetailsStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, unknown>;
        if (parsed && typeof parsed === 'object') {
          const merged: Record<string, PatientLogbookClinicalDetails> = { ...base };
          Object.entries(parsed).forEach(([patId, detail]) => {
            if (detail && typeof detail === 'object') {
              merged[patId] = normalizePatientClinicalDetails(detail);
            }
          });
          return merged;
        }
      }
    } catch {
      // fallback
    }
    return base;
  });

  // Facility (Bagian 1) Checklists & Notes — isolated per staff
  const [facilityStatuses, setFacilityStatuses] = useState<Record<string, boolean>>(() =>
    readNurseFacilityStatuses(currentNurse.name)
  );

  const [facilityNotes, setFacilityNotes] = useState<Record<string, string>>(() =>
    readNurseFacilityNotes(currentNurse.name)
  );

  // Patient-specific (Bagian 2, 3, 4, 5, 6) Checklists & Notes — isolated per nurse
  const [patientStatuses, setPatientStatuses] = useState<Record<string, Record<string, boolean>>>(
    () => {
      const defaults = buildDefaultStatusesForPatients(managedPatients);
      try {
        const saved = localStorage.getItem(patientStatusesStorageKey);
        if (saved) {
          const parsed = JSON.parse(saved) as Record<string, Record<string, boolean>>;
          if (parsed && typeof parsed === 'object') {
            const merged: Record<string, Record<string, boolean>> = { ...defaults };
            Object.entries(parsed).forEach(([patId, patChecks]) => {
              if (patChecks && typeof patChecks === 'object') {
                merged[patId] = {
                  ...(defaults[patId] || {}),
                  ...patChecks
                };
              }
            });
            return merged;
          }
        }
      } catch {
        // fallback
      }
      return defaults;
    }
  );

  const [patientNotes, setPatientNotes] = useState<Record<string, Record<string, string>>>(() => {
    const defaults = buildDefaultNotesForPatients(managedPatients);
    try {
      const saved = localStorage.getItem(patientNotesStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, Record<string, string>>;
        if (parsed && typeof parsed === 'object') {
          return { ...defaults, ...parsed };
        }
      }
    } catch {
      // fallback
    }
    return defaults;
  });

  // Bagian VII: Verification Submission State
  const defaultTargetRole: 'pj_shift' | 'kepala_ruangan' = React.useMemo(() => {
    return activeRole === 'pj_shift'
      ? defaultKaruNurse.name !== '-' || defaultOtherPjShiftNurse.name === '-'
        ? 'kepala_ruangan'
        : 'pj_shift'
      : activeRole === 'kepala_ruangan'
      ? 'kepala_ruangan'
      : 'pj_shift';
  }, [activeRole, defaultKaruNurse.name, defaultOtherPjShiftNurse.name]);

  const defaultTargetVerifier = React.useMemo(() => {
    return activeRole === 'pj_shift'
      ? defaultTargetRole === 'pj_shift'
        ? defaultOtherPjShiftNurse
        : defaultKaruNurse
      : activeRole === 'kepala_ruangan'
      ? currentNurse
      : defaultPjShiftNurse;
  }, [
    activeRole,
    defaultTargetRole,
    defaultOtherPjShiftNurse,
    defaultKaruNurse,
    currentNurse,
    defaultPjShiftNurse
  ]);

  const [pjVerification, setPjVerification] = useState<PjVerificationSubmission>(() => {
    const todayIso = getCurrentIsoDateWib();
    // 1. Check shared verification registry first (strictly for today)
    const reg = getVerificationRegistry();
    const foundReg = reg.find(
      (e) =>
        isMatchingNurse(e.submittedNurseName, currentNurse.name) &&
        (e.dateKey === todayIso || indonesianDateLabelToIso(e.dateLabel) === todayIso)
    );
    if (foundReg) {
      const normalizedTargetRole: 'pj_shift' | 'kepala_ruangan' =
        foundReg.targetRole === 'mandiri' || foundReg.targetRole === 'kepala_ruangan'
          ? 'kepala_ruangan'
          : 'pj_shift';
      return {
        id: foundReg.id,
        status: foundReg.status,
        submittedNurseName: currentNurse.name,
        submittedNurseNip: foundReg.submittedNurseNip || currentNurse.nip,
        submittedNurseRole: activeRole,
        targetRole: normalizedTargetRole,
        targetVerifierName: foundReg.targetVerifierName || defaultTargetVerifier.name,
        targetVerifierNip: foundReg.targetVerifierNip || defaultTargetVerifier.nip,
        pjShiftName:
          normalizedTargetRole === 'pj_shift'
            ? foundReg.targetVerifierName || defaultTargetVerifier.name
            : defaultPjShiftNurse.name,
        pjShiftNip:
          normalizedTargetRole === 'pj_shift'
            ? foundReg.targetVerifierNip || defaultTargetVerifier.nip
            : defaultPjShiftNurse.nip,
        notes: foundReg.pelaksanaNotes || '',
        declarationChecked: true,
        submittedAt: foundReg.submittedAt,
        verifiedAt: foundReg.verifiedAt,
        verifiedBy: foundReg.verifiedBy,
        verifiedByRole: foundReg.verifiedByRole,
        verifierNotes: foundReg.verifierNotes
      };
    }

    // 2. Check per-nurse submission in localStorage
    try {
      const saved = localStorage.getItem(submissionStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<PjVerificationSubmission>;
        if (parsed && typeof parsed === 'object' && parsed.status) {
          const normalizedTargetRole: 'pj_shift' | 'kepala_ruangan' =
            activeRole === 'perawat_pelaksana'
              ? 'pj_shift'
              : parsed.targetRole === 'mandiri' || parsed.targetRole === 'kepala_ruangan'
              ? 'kepala_ruangan'
              : parsed.targetRole === 'pj_shift'
              ? 'pj_shift'
              : defaultTargetRole;
          const fallbackForRole =
            normalizedTargetRole === 'kepala_ruangan'
              ? activeRole === 'kepala_ruangan'
                ? currentNurse
                : defaultKaruNurse
              : activeRole === 'pj_shift'
              ? defaultOtherPjShiftNurse
              : defaultPjShiftNurse;
          return {
            status: parsed.status,
            submittedNurseName: currentNurse.name,
            submittedNurseNip: currentNurse.nip,
            submittedNurseRole: activeRole,
            targetRole: normalizedTargetRole,
            targetVerifierName: parsed.targetVerifierName || fallbackForRole.name,
            targetVerifierNip: parsed.targetVerifierNip || fallbackForRole.nip,
            pjShiftName: parsed.pjShiftName || defaultPjShiftNurse.name,
            pjShiftNip: parsed.pjShiftNip || defaultPjShiftNurse.nip,
            notes: parsed.notes || '',
            declarationChecked:
              parsed.status === 'belum_diajukan'
                ? Boolean(parsed.declarationChecked)
                : (parsed.declarationChecked ?? true),
            submittedAt: parsed.submittedAt,
            verifiedAt: parsed.verifiedAt,
            verifiedBy: parsed.verifiedBy,
            verifiedByRole: parsed.verifiedByRole,
            verifierNotes: parsed.verifierNotes
          };
        }
      }
    } catch {
      // fallback
    }

    return {
      status: 'belum_diajukan',
      submittedNurseName: currentNurse.name,
      submittedNurseNip: currentNurse.nip,
      submittedNurseRole: activeRole,
      targetRole: defaultTargetRole,
      targetVerifierName: defaultTargetVerifier.name,
      targetVerifierNip: defaultTargetVerifier.nip,
      pjShiftName: defaultPjShiftNurse.name,
      pjShiftNip: defaultPjShiftNurse.nip,
      notes: '',
      declarationChecked: false
    };
  });

  // Per-patient verification submission map (isolates Bagian VII status per patient)
  const [patientSubmissions, setPatientSubmissions] = useState<
    Record<string, PjVerificationSubmission>
  >(() => {
    try {
      const saved = localStorage.getItem(patientSubmissionsStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return {};
  });

  // Live tick to re-evaluate verifier status updates from VerifikasiView / Cloud Registry
  const [verifSyncTick, setVerifSyncTick] = useState(0);
  useEffect(() => {
    const bump = () => {
      setVerifSyncTick((t) => t + 1);
      try {
        const saved = localStorage.getItem(patientSubmissionsStorageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            setPatientSubmissions(parsed);
          }
        }
      } catch {
        // ignore
      }
      try {
        const rawSub = localStorage.getItem(submissionStorageKey);
        if (rawSub) {
          const parsedSub = JSON.parse(rawSub);
          if (parsedSub && typeof parsedSub === 'object') {
            setPjVerification(parsedSub);
          }
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('verification_registry_updated', bump);
    window.addEventListener('storage', bump);
    return () => {
      window.removeEventListener('verification_registry_updated', bump);
      window.removeEventListener('storage', bump);
    };
  }, [patientSubmissionsStorageKey, submissionStorageKey]);

  // Modal Selection State
  const [selectedBagian, setSelectedBagian] = useState<number | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string, ms = 2500) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), ms);
  };

  // Sync per-nurse shift schedule with parent App header & localStorage
  useEffect(() => {
    try {
      localStorage.setItem(shiftScheduleStorageKey, activeShift);
      localStorage.setItem('dialysis_last_logbook_shift', activeShift);
    } catch {
      // ignore
    }
    if (onShiftChange && shiftInfo?.shift !== activeShift) {
      onShiftChange(activeShift);
    }
  }, [activeShift, shiftScheduleStorageKey]);

  const handleSelectShiftSchedule = (nextShift: 'Pagi' | 'Siang') => {
    if (!isToday) {
      showToast('Pengisian logbook dibatasi hanya bisa mengisi pada hari yang sama.', 3500);
      return;
    }
    if (nextShift !== activeShift && draftMasterId) {
      setDraftMasterId('');
      setDraftPatientName('');
      setDraftPatientRm('');
      setDraftBedNumber('');
    }
    setActiveShift(nextShift);
    try {
      localStorage.setItem('dialysis_last_logbook_shift', nextShift);
    } catch {
      // ignore
    }
    if (onShiftChange) {
      onShiftChange(nextShift);
    }

    const matchingPjForShift = masterNurses.find(
      (n) =>
        (n.role === 'pj_shift' || n.systemAccess === 'pj_shift') &&
        n.accountStatus !== 'nonaktif' &&
        n.shiftAssigned === nextShift &&
        (activeRole !== 'pj_shift' || !isMatchingNurse(n.name, currentNurse.name))
    );

    if (matchingPjForShift?.name) {
      if (pjVerification.status === 'belum_diajukan' && pjVerification.targetRole === 'pj_shift') {
        setPjVerification((prev) => ({
          ...prev,
          targetVerifierName: matchingPjForShift.name,
          targetVerifierNip: matchingPjForShift.nip || '-',
          pjShiftName: matchingPjForShift.name,
          pjShiftNip: matchingPjForShift.nip || '-'
        }));
      }

      setPatientSubmissions((prev) => {
        let changed = false;
        const copy = { ...prev };
        Object.entries(copy).forEach(([patId, sub]) => {
          if (sub && sub.status === 'belum_diajukan' && sub.targetRole === 'pj_shift') {
            changed = true;
            copy[patId] = {
              ...sub,
              targetVerifierName: matchingPjForShift.name,
              targetVerifierNip: matchingPjForShift.nip || '-',
              pjShiftName: matchingPjForShift.name,
              pjShiftNip: matchingPjForShift.nip || '-'
            };
          }
        });
        return changed ? copy : prev;
      });
    }

    const hoursLabel = nextShift === 'Siang' ? '14.00 - 21.00 WIB' : '07.00 - 14.00 WIB';
    showToast(`Jadwal shift logbook diatur ke Shift ${nextShift} (${hoursLabel}).`);
  };

  // Sync per-nurse state to localStorage (strictly on today)
  useEffect(() => {
    if (!isToday) return;
    try {
      localStorage.setItem(managedPatientsStorageKey, JSON.stringify(managedPatients));
      touchNurseDailyStorage(currentNurse.name);
    } catch {
      // ignore
    }
  }, [managedPatients, managedPatientsStorageKey, isToday, currentNurse.name]);

  useEffect(() => {
    if (!isToday) return;
    try {
      localStorage.setItem(clinicalDetailsStorageKey, JSON.stringify(patientClinicalDetails));
      touchNurseDailyStorage(currentNurse.name);
    } catch {
      // ignore
    }
  }, [patientClinicalDetails, clinicalDetailsStorageKey, isToday, currentNurse.name]);

  useEffect(() => {
    if (!isToday) return;
    try {
      localStorage.setItem(facilityStatusesStorageKey, JSON.stringify(facilityStatuses));
      touchNurseDailyStorage(currentNurse.name);
    } catch {
      // ignore
    }
  }, [facilityStatuses, facilityStatusesStorageKey, isToday, currentNurse.name]);

  useEffect(() => {
    if (!isToday) return;
    try {
      localStorage.setItem(facilityNotesStorageKey, JSON.stringify(facilityNotes));
      touchNurseDailyStorage(currentNurse.name);
    } catch {
      // ignore
    }
  }, [facilityNotes, facilityNotesStorageKey, isToday, currentNurse.name]);

  useEffect(() => {
    if (!isToday) return;
    try {
      localStorage.setItem(patientStatusesStorageKey, JSON.stringify(patientStatuses));
      touchNurseDailyStorage(currentNurse.name);
    } catch {
      // ignore
    }
  }, [patientStatuses, patientStatusesStorageKey, isToday, currentNurse.name]);

  useEffect(() => {
    if (!isToday) return;
    try {
      localStorage.setItem(patientNotesStorageKey, JSON.stringify(patientNotes));
      touchNurseDailyStorage(currentNurse.name);
    } catch {
      // ignore
    }
  }, [patientNotes, patientNotesStorageKey, isToday, currentNurse.name]);

  useEffect(() => {
    if (!isToday) return;
    try {
      localStorage.setItem(submissionStorageKey, JSON.stringify(pjVerification));
      touchNurseDailyStorage(currentNurse.name);
    } catch {
      // ignore
    }
  }, [pjVerification, submissionStorageKey, isToday, currentNurse.name]);

  useEffect(() => {
    if (!isToday) return;
    try {
      localStorage.setItem(patientSubmissionsStorageKey, JSON.stringify(patientSubmissions));
      touchNurseDailyStorage(currentNurse.name);
    } catch {
      // ignore
    }
  }, [patientSubmissions, patientSubmissionsStorageKey, isToday, currentNurse.name]);

  // Real-time Cloud Sync for personal nurse logbook (Multi-Device Continuity)
  const isCloudIncomingRef = React.useRef(false);

  // 1. Subscribe to Cloud Firestore for this nurse's logbook across all devices
  useEffect(() => {
    if (!currentNurse.name || currentNurse.name === '-') return;

    const unsubscribe = subscribeToNurseLogbook(currentNurse.name, (cloudData) => {
      if (!cloudData) return;

      // Filter cloud data strictly to today (auto-reset on day change)
      const todayIso = getCurrentIsoDateWib();
      const cloudDateIso =
        cloudData.dateIso ||
        (cloudData.shiftSchedule?.date ? indonesianDateLabelToIso(cloudData.shiftSchedule.date) : '');
      if (cloudDateIso && cloudDateIso !== todayIso) {
        // Cloud data is from an earlier day; preserve today's pristine empty state
        return;
      }

      isCloudIncomingRef.current = true;

      if (
        Array.isArray(cloudData.managedPatients) &&
        (cloudData.managedPatients.length > 0 || cloudDateIso === todayIso)
      ) {
        setManagedPatients(cloudData.managedPatients);
        try {
          localStorage.setItem(managedPatientsStorageKey, JSON.stringify(cloudData.managedPatients));
        } catch {
          // ignore
        }
      }

      if (cloudData.clinicalDetails && typeof cloudData.clinicalDetails === 'object') {
        const normalizedCloudClinical: Record<string, PatientLogbookClinicalDetails> = {};
        Object.entries(cloudData.clinicalDetails as Record<string, unknown>).forEach(
          ([patId, rawDetail]) => {
            normalizedCloudClinical[patId] = normalizePatientClinicalDetails(rawDetail);
          }
        );
        setPatientClinicalDetails((prev) => ({
          ...prev,
          ...normalizedCloudClinical
        }));
        try {
          localStorage.setItem(clinicalDetailsStorageKey, JSON.stringify(normalizedCloudClinical));
        } catch {
          // ignore
        }
      }

      if (cloudData.facilityStatuses && typeof cloudData.facilityStatuses === 'object') {
        setFacilityStatuses((prev) => ({
          ...prev,
          ...cloudData.facilityStatuses
        }));
        try {
          localStorage.setItem(facilityStatusesStorageKey, JSON.stringify(cloudData.facilityStatuses));
        } catch {
          // ignore
        }
      }

      if (cloudData.facilityNotes && typeof cloudData.facilityNotes === 'object') {
        setFacilityNotes((prev) => ({
          ...prev,
          ...cloudData.facilityNotes
        }));
        try {
          localStorage.setItem(facilityNotesStorageKey, JSON.stringify(cloudData.facilityNotes));
        } catch {
          // ignore
        }
      }

      if (cloudData.patientStatuses && typeof cloudData.patientStatuses === 'object') {
        setPatientStatuses((prev) => ({
          ...prev,
          ...cloudData.patientStatuses
        }));
        try {
          localStorage.setItem(patientStatusesStorageKey, JSON.stringify(cloudData.patientStatuses));
        } catch {
          // ignore
        }
      }

      if (cloudData.patientNotes && typeof cloudData.patientNotes === 'object') {
        setPatientNotes((prev) => ({
          ...prev,
          ...cloudData.patientNotes
        }));
        try {
          localStorage.setItem(patientNotesStorageKey, JSON.stringify(cloudData.patientNotes));
        } catch {
          // ignore
        }
      }

      if (cloudData.submission && cloudData.submission.status) {
        setPjVerification((prev) => ({
          ...prev,
          ...cloudData.submission
        }));
        try {
          localStorage.setItem(submissionStorageKey, JSON.stringify(cloudData.submission));
        } catch {
          // ignore
        }
      }

      if (cloudData.patientSubmissions && typeof cloudData.patientSubmissions === 'object') {
        setPatientSubmissions((prev) => ({
          ...prev,
          ...cloudData.patientSubmissions
        }));
        try {
          localStorage.setItem(
            patientSubmissionsStorageKey,
            JSON.stringify(cloudData.patientSubmissions)
          );
        } catch {
          // ignore
        }
      }

      if (cloudData.shiftSchedule?.shift) {
        setActiveShift(cloudData.shiftSchedule.shift);
      }

      if (cloudData.shiftDoctors) {
        if (cloudData.shiftDoctors.dokterDpjp) {
          setSelectedDokterDpjp(cloudData.shiftDoctors.dokterDpjp);
        }
        if (cloudData.shiftDoctors.dokterJaga) {
          setSelectedDokterJaga(cloudData.shiftDoctors.dokterJaga);
        }
        try {
          localStorage.setItem(shiftDoctorsStorageKey, JSON.stringify(cloudData.shiftDoctors));
        } catch {
          // ignore
        }
      }

      setTimeout(() => {
        isCloudIncomingRef.current = false;
      }, 1600);
    });

    return () => unsubscribe();
  }, [
    currentNurse.name,
    managedPatientsStorageKey,
    clinicalDetailsStorageKey,
    facilityStatusesStorageKey,
    facilityNotesStorageKey,
    patientStatusesStorageKey,
    patientNotesStorageKey,
    submissionStorageKey,
    patientSubmissionsStorageKey,
    shiftDoctorsStorageKey
  ]);

  // 2. Debounced save to Cloud Firestore whenever nurse makes changes locally (only on current day)
  useEffect(() => {
    if (!currentNurse.name || currentNurse.name === '-') return;
    if (isCloudIncomingRef.current) return;
    if (!isToday) return; // Pengisian & auto-save dibatasi hanya pada hari yang sama

    const timer = setTimeout(() => {
      saveNurseLogbookCloud(currentNurse.name, {
        nurseName: currentNurse.name,
        managedPatients,
        clinicalDetails: patientClinicalDetails,
        facilityStatuses,
        facilityNotes,
        patientStatuses,
        patientNotes,
        submission: pjVerification,
        patientSubmissions,
        shiftSchedule: { shift: activeShift, date: activeDate },
        shiftDoctors: {
          dokterDpjp: selectedDokterDpjp,
          dokterJaga: selectedDokterJaga
        },
        dateIso: getCurrentIsoDateWib(),
        logbookDate: activeDate
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [
    currentNurse.name,
    managedPatients,
    patientClinicalDetails,
    facilityStatuses,
    facilityNotes,
    patientStatuses,
    patientNotes,
    pjVerification,
    patientSubmissions,
    activeShift,
    activeDate,
    selectedDokterDpjp,
    selectedDokterJaga,
    isToday
  ]);

  // 3. Live Day-Change Listener: otomatis reset logbook ke kondisi awal/kosong saat hari berganti
  const liveDateIsoRef = React.useRef<string>(getCurrentIsoDateWib());

  const handleAutoResetOnDayChange = React.useCallback(
    (newIsoDate: string) => {
      clearNurseDailyLogbookStorage(currentNurse.name, newIsoDate);
      setManagedPatients([]);
      setOpenedPatientId(null);
      setActivePatientId('');
      setPatientClinicalDetails({});
      setFacilityStatuses({ '1.1': false, '1.2': false, '1.3': false });
      setFacilityNotes({ '1.1': '', '1.2': '', '1.3': '' });
      setPatientStatuses({});
      setPatientNotes({});
      setPatientSubmissions({});
      const freshSub: PjVerificationSubmission = {
        status: 'belum_diajukan',
        submittedNurseName: currentNurse.name,
        submittedNurseNip: currentNurse.nip,
        submittedNurseRole: activeRole,
        targetRole: defaultTargetRole,
        targetVerifierName: defaultTargetVerifier.name,
        targetVerifierNip: defaultTargetVerifier.nip,
        pjShiftName: defaultPjShiftNurse.name,
        pjShiftNip: defaultPjShiftNurse.nip,
        notes: '',
        declarationChecked: false
      };
      setPjVerification(freshSub);

      setSelectedBagian(null);
      setIsRescheduleModalOpen(false);

      saveNurseLogbookCloud(currentNurse.name, {
        nurseName: currentNurse.name,
        managedPatients: [],
        clinicalDetails: {},
        facilityStatuses: { '1.1': false, '1.2': false, '1.3': false },
        facilityNotes: { '1.1': '', '1.2': '', '1.3': '' },
        patientStatuses: {},
        patientNotes: {},
        submission: freshSub,
        patientSubmissions: {},
        shiftSchedule: { shift: activeShift, date: getCurrentIndonesianFullDate() },
        dateIso: newIsoDate,
        logbookDate: getCurrentIndonesianFullDate()
      });

      if (onResetDateToToday) {
        onResetDateToToday();
      }

      showToast(
        'Hari telah berganti ke tanggal baru. Halaman logbook otomatis kembali seperti semula/kosong untuk dinas hari ini.',
        4500
      );
    },
    [
      currentNurse.name,
      currentNurse.nip,
      activeRole,
      defaultTargetRole,
      defaultTargetVerifier,
      defaultPjShiftNurse,
      activeShift,
      onResetDateToToday
    ]
  );

  useEffect(() => {
    const checkDayRollover = () => {
      const currentWibIso = getCurrentIsoDateWib();
      if (currentWibIso !== liveDateIsoRef.current) {
        liveDateIsoRef.current = currentWibIso;
        handleAutoResetOnDayChange(currentWibIso);
      }
    };

    const interval = setInterval(checkDayRollover, 5000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkDayRollover();
      }
    };
    const handleFocus = () => {
      checkDayRollover();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [handleAutoResetOnDayChange]);

  const activeDateIso = indonesianDateLabelToIso(activeDate);
  useEffect(() => {
    const todayIso = getCurrentIsoDateWib();
    if (activeDateIso === todayIso && todayIso !== liveDateIsoRef.current) {
      liveDateIsoRef.current = todayIso;
      handleAutoResetOnDayChange(todayIso);
    }
  }, [activeDateIso, handleAutoResetOnDayChange]);

  // Auto-sync default verifier when masterNurses are added and submission is still belum_diajukan
  useEffect(() => {
    if (pjVerification.status !== 'belum_diajukan') return;
    if (pjVerification.targetVerifierName && pjVerification.targetVerifierName !== '-') {
      if (
        activeRole === 'pj_shift' &&
        pjVerification.targetRole === 'pj_shift' &&
        isMatchingNurse(pjVerification.targetVerifierName, currentNurse.name)
      ) {
        setPjVerification((prev) => ({
          ...prev,
          targetVerifierName: defaultOtherPjShiftNurse.name,
          targetVerifierNip: defaultOtherPjShiftNurse.nip
        }));
      }
      return;
    }

    if (
      activeRole === 'pj_shift' &&
      pjVerification.targetRole === 'kepala_ruangan' &&
      defaultKaruNurse.name === '-' &&
      defaultOtherPjShiftNurse.name !== '-'
    ) {
      setPjVerification((prev) => ({
        ...prev,
        targetRole: 'pj_shift',
        targetVerifierName: defaultOtherPjShiftNurse.name,
        targetVerifierNip: defaultOtherPjShiftNurse.nip,
        pjShiftName: defaultOtherPjShiftNurse.name,
        pjShiftNip: defaultOtherPjShiftNurse.nip
      }));
      return;
    }

    const desiredTarget =
      pjVerification.targetRole === 'kepala_ruangan' || pjVerification.targetRole === 'mandiri'
        ? activeRole === 'kepala_ruangan'
          ? currentNurse
          : defaultKaruNurse
        : activeRole === 'pj_shift'
        ? defaultOtherPjShiftNurse
        : defaultPjShiftNurse;

    if (desiredTarget.name && desiredTarget.name !== '-') {
      setPjVerification((prev) => ({
        ...prev,
        targetVerifierName: desiredTarget.name,
        targetVerifierNip: desiredTarget.nip,
        pjShiftName:
          prev.targetRole === 'pj_shift' ? desiredTarget.name : defaultPjShiftNurse.name,
        pjShiftNip:
          prev.targetRole === 'pj_shift' ? desiredTarget.nip : defaultPjShiftNurse.nip
      }));
    }
  }, [
    pjVerification.status,
    pjVerification.targetRole,
    pjVerification.targetVerifierName,
    activeRole,
    currentNurse,
    defaultKaruNurse,
    defaultPjShiftNurse,
    defaultOtherPjShiftNurse
  ]);

  // Ensure openedPatientId & activePatientId remain valid
  useEffect(() => {
    if (openedPatientId && !managedPatients.some((p) => p.id === openedPatientId)) {
      setOpenedPatientId(null);
      setSelectedBagian(null);
    }
    if (managedPatients.length === 0) {
      if (activePatientId !== '') setActivePatientId('');
    } else if (openedPatientId && managedPatients.some((p) => p.id === openedPatientId)) {
      if (activePatientId !== openedPatientId) setActivePatientId(openedPatientId);
    } else if (!managedPatients.some((p) => p.id === activePatientId)) {
      setActivePatientId(managedPatients[0].id);
    }
  }, [managedPatients, openedPatientId, activePatientId]);

  const openedPatient: ManagedPatient | null = React.useMemo(
    () => (openedPatientId ? managedPatients.find((p) => p.id === openedPatientId) || null : null),
    [openedPatientId, managedPatients]
  );

  const activePatient: ManagedPatient =
    openedPatient ||
    managedPatients.find((p) => p.id === activePatientId) ||
    managedPatients[0] || {
      id: 'empty',
      bedNumber: masterBeds[0]?.bedNumber || 'BED A01',
      patientName: '',
      medicalRecord: ''
    };

  const activeClinical: PatientLogbookClinicalDetails = normalizePatientClinicalDetails(
    patientClinicalDetails[activePatient.id]
  );

  const effectiveShiftInfo: ShiftInfo = React.useMemo(
    () => ({
      hospitalName: shiftInfo?.hospitalName || 'RS Happy Land Medical Centre',
      unitName: shiftInfo?.unitName || 'Unit Hemodialisis',
      date: activeDate,
      shift: activeShift,
      shiftHours: activeShift === 'Siang' ? '14.00 - 21.00 WIB' : '07.00 - 14.00 WIB',
      pjShift: defaultPjShiftNurse.name || shiftInfo?.pjShift || 'PJ Shift',
      kepalaRuangan:
        defaultKaruNurse.name || shiftInfo?.kepalaRuangan || 'Twis Fertilianti PW., S.Kep., Ns.',
      dokterDpjp: selectedDokterDpjp || shiftInfo?.dokterDpjp || 'dr. Raden Heru Prasanto, Sp.PD-KGH',
      dokterJaga: selectedDokterJaga || shiftInfo?.dokterJaga || 'dr. Paramitha',
      totalPerawatDinas: shiftInfo?.totalPerawatDinas || 8,
      detailPerawat: shiftInfo?.detailPerawat || '8 Orang',
      perawatRatio: shiftInfo?.perawatRatio || '1 : 3',
      tenagaPendukung: shiftInfo?.tenagaPendukung || 'Teknisi RO & HK',
      pjShiftBerikutnya: shiftInfo?.pjShiftBerikutnya || '-'
    }),
    [
      shiftInfo,
      activeDate,
      activeShift,
      defaultPjShiftNurse.name,
      defaultKaruNurse.name,
      selectedDokterDpjp,
      selectedDokterJaga
    ]
  );

  const printableSession: PatientHDSession | null = React.useMemo(() => {
    const targetPatient = openedPatient || (managedPatients.length > 0 ? activePatient : null);
    if (!targetPatient || !targetPatient.patientName) return null;
    const pId = targetPatient.id;
    const clin = normalizePatientClinicalDetails(patientClinicalDetails[pId]);
    const currentSub = patientSubmissions[pId] || pjVerification;

    return ensureFullBagianData({
      id: targetPatient.id,
      patientName: targetPatient.patientName,
      medicalRecordNumber: targetPatient.medicalRecord || '',
      bedNumber: targetPatient.bedNumber,
      shift: activeShift,
      date: activeDate,
      sessionDate: activeDateIso,
      status: clin.poin3_1.status === 'RAWAT INAP' ? 'ranap' : 'rajal',
      category:
        clin.poin3_1.kategori === 'ISOLASI HEPATITIS B'
          ? 'hepatitis_b'
          : clin.poin3_1.kategori === 'ISOLASI HEPATITIS C/HIV'
          ? 'hepatitis_c'
          : 'reguler',
      dryWeight: parseClinicalNumber(clin.poin3_2.bbKering) || 60,
      preWeight: parseClinicalNumber(clin.poin3_2.bbPre) || 62,
      postWeight: parseClinicalNumber(clin.poin3_2.bbPost) || 60,
      targetUf: parseClinicalNumber(clin.poin3_5.targetUfg) || 2000,
      achievedUf:
        parseClinicalNumber(clin.poin6_3.ufgTercapai) ||
        parseClinicalNumber(clin.poin3_5.targetUfg) ||
        2000,
      preBp:
        clin.poin3_3.tdPreHd ||
        (clin.poin3_3.tdSistolik && clin.poin3_3.tdDiastolik
          ? `${clin.poin3_3.tdSistolik}/${clin.poin3_3.tdDiastolik}`
          : '130/80'),
      postBp: clin.poin6_3.tdPostHd || '120/80',
      bloodFlowQb: parseClinicalNumber(clin.poin3_5.qb) || 200,
      dialysateFlowQd: parseClinicalNumber(clin.poin3_5.qd) || 500,
      durationActual: parseClinicalNumber(clin.poin3_5.waktuDialisis) || 4.5,
      durationPrescribed: parseClinicalNumber(clin.poin3_5.waktuDialisis) || 4.5,
      vascularAccess: clin.poin3_6.cdlAktif
        ? 'cdl_non_tunnel'
        : clin.poin3_6.femoralAktif
        ? 'cdl_permcath'
        : 'av_fistula',
      accessSite:
        clin.poin3_6.cimino ||
        clin.poin3_6.cdl ||
        clin.poin3_6.femoral ||
        'AVF Radiocephalica',
      vascularAccessNurse: clin.poin3_6.vascularAccessNurse || currentNurse.name,
      nurseInCharge: currentNurse.name,
      ktV: parseClinicalNumber(clin.poin6_3.ktV) || 1.35,
      verificationStatus: currentSub.status,
      isVerifiedByPj: currentSub.status === 'terverifikasi',
      verifiedBy: currentSub.verifiedBy,
      verifiedAt: currentSub.verifiedAt,
      verifiedByRole: currentSub.verifiedByRole,
      verifierNotes: currentSub.verifierNotes,
      nurseNotes: 'HD berjalan lancar sesuai protokol PERNEFRI',
      updatedAt: new Date().toISOString()
    });
  }, [
    openedPatient,
    activePatient,
    managedPatients,
    patientClinicalDetails,
    patientSubmissions,
    pjVerification,
    activeShift,
    activeDate,
    activeDateIso,
    currentNurse.name
  ]);

  const createDefaultSubmissionForPatient = React.useCallback((): PjVerificationSubmission => {
    const preferredRole: 'pj_shift' | 'kepala_ruangan' =
      activeRole === 'perawat_pelaksana'
        ? 'pj_shift'
        : pjVerification.targetRole === 'pj_shift'
        ? 'pj_shift'
        : pjVerification.targetRole === 'kepala_ruangan' || pjVerification.targetRole === 'mandiri'
        ? 'kepala_ruangan'
        : defaultTargetRole;

    const fallbackForRole =
      preferredRole === 'kepala_ruangan'
        ? activeRole === 'kepala_ruangan'
          ? currentNurse
          : defaultKaruNurse
        : activeRole === 'pj_shift'
        ? defaultOtherPjShiftNurse
        : defaultPjShiftNurse;

    const preferredName =
      pjVerification.targetVerifierName &&
      pjVerification.targetVerifierName !== '-' &&
      !(
        activeRole === 'pj_shift' &&
        preferredRole === 'pj_shift' &&
        isMatchingNurse(pjVerification.targetVerifierName, currentNurse.name)
      )
        ? pjVerification.targetVerifierName
        : fallbackForRole.name;

    const preferredNip =
      pjVerification.targetVerifierNip && pjVerification.targetVerifierNip !== '-'
        ? pjVerification.targetVerifierNip
        : fallbackForRole.nip;

    return {
      status: 'belum_diajukan',
      submittedNurseName: currentNurse.name,
      submittedNurseNip: currentNurse.nip,
      submittedNurseRole: activeRole,
      targetRole: preferredRole,
      targetVerifierName: preferredName,
      targetVerifierNip: preferredNip,
      pjShiftName: preferredRole === 'pj_shift' ? preferredName : defaultPjShiftNurse.name,
      pjShiftNip: preferredRole === 'pj_shift' ? preferredNip : defaultPjShiftNurse.nip,
      notes: '',
      declarationChecked: false
    };
  }, [
    activeRole,
    pjVerification.targetRole,
    pjVerification.targetVerifierName,
    pjVerification.targetVerifierNip,
    defaultTargetRole,
    currentNurse,
    defaultKaruNurse,
    defaultOtherPjShiftNurse,
    defaultPjShiftNurse
  ]);

  // Resolve effective per-patient verification state (including live VerifikasiView, Registry & Session approvals/revisions)
  const getEffectivePatientSubmission = React.useCallback(
    (
      pat: ManagedPatient,
      overrideMap?: Record<string, PjVerificationSubmission>
    ): PjVerificationSubmission => {
      void verifSyncTick;
      const mapToUse = overrideMap || patientSubmissions;
      const base: PjVerificationSubmission =
        mapToUse[pat.id] || createDefaultSubmissionForPatient();

      let resolved: PjVerificationSubmission = { ...base };
      const baseSubmittedEpoch = resolved.submittedEpoch || 0;

      // 1. Check live per-patient verification storage written by VerifikasiView
      try {
        const rawPerPat = localStorage.getItem(PER_PATIENT_STATUS_STORAGE_KEY);
        if (rawPerPat) {
          const perPat = JSON.parse(rawPerPat);
          if (perPat && typeof perPat === 'object') {
            const kDated = buildPatientVerificationKey(
              currentNurse.name,
              pat.bedNumber,
              pat.medicalRecord,
              activeDateIso
            );
            const kUndated = buildPatientVerificationKey(
              currentNurse.name,
              pat.bedNumber,
              pat.medicalRecord
            );
            const kZeroDated = buildPatientVerificationKey(
              currentNurse.name,
              pat.bedNumber,
              '0',
              activeDateIso
            );
            const kZero = buildPatientVerificationKey(currentNurse.name, pat.bedNumber, '0');
            const liveEntry =
              perPat[kDated] || perPat[kUndated] || perPat[kZeroDated] || perPat[kZero];

            if (liveEntry) {
              const liveRevEpoch = liveEntry.revisionEpoch || 0;
              if (liveEntry.status === 'terverifikasi') {
                resolved = {
                  ...resolved,
                  status: 'terverifikasi',
                  verifiedAt: liveEntry.verifiedAt || resolved.verifiedAt,
                  verifiedBy: liveEntry.verifiedBy || resolved.verifiedBy,
                  verifiedByRole: liveEntry.verifiedByRole || resolved.verifiedByRole,
                  verifierNotes: liveEntry.verifierNotes ?? resolved.verifierNotes,
                  revisionRequested: false
                };
              } else if (
                liveEntry.status === 'belum_diajukan' &&
                (liveEntry.revisionRequested || Boolean(liveEntry.verifierNotes)) &&
                liveRevEpoch >= baseSubmittedEpoch
              ) {
                resolved = {
                  ...resolved,
                  status: 'belum_diajukan',
                  verifiedAt: undefined,
                  verifiedBy: undefined,
                  verifiedByRole: undefined,
                  verifierNotes: liveEntry.verifierNotes || resolved.verifierNotes,
                  revisionRequested: true,
                  revisionRequestedAt:
                    liveEntry.revisionRequestedAt || resolved.revisionRequestedAt,
                  revisionRequestedBy:
                    liveEntry.revisionRequestedBy || resolved.revisionRequestedBy,
                  revisionRequestedByRole:
                    liveEntry.revisionRequestedByRole || resolved.revisionRequestedByRole,
                  revisionEpoch: liveRevEpoch
                };
              }
            }
          }
        }
      } catch {
        // ignore
      }

      // 2. Check Verification Registry (synced across devices via Firestore)
      try {
        const regList = getVerificationRegistry();
        const cleanRm = pat.medicalRecord?.trim().toLowerCase();
        const cleanName = pat.patientName.trim().toLowerCase();
        const matchedReg = regList.find((r) => {
          if (!isMatchingNurse(r.submittedNurseName, currentNurse.name)) return false;
          const rDateIso = r.dateKey || (r.dateLabel ? indonesianDateLabelToIso(r.dateLabel) : '');
          if (rDateIso && rDateIso !== activeDateIso) return false;
          if (r.shift && r.shift !== activeShift) return false;
          return true;
        });

        const matchedRegPat = matchedReg?.patients?.find((rp) => {
          if (rp.id && rp.id === pat.id) return true;
          if (cleanRm && rp.medicalRecord?.trim().toLowerCase() === cleanRm) return true;
          if (cleanName && rp.patientName.trim().toLowerCase() === cleanName) return true;
          return isSameBed(rp.bedNumber, pat.bedNumber);
        });

        if (matchedRegPat) {
          const regRevEpoch = matchedRegPat.revisionEpoch || matchedReg?.revisionEpoch || 0;
          if (matchedRegPat.status === 'terverifikasi') {
            resolved = {
              ...resolved,
              status: 'terverifikasi',
              verifiedAt: matchedRegPat.verifiedAt || matchedReg?.verifiedAt || resolved.verifiedAt,
              verifiedBy: matchedRegPat.verifiedBy || matchedReg?.verifiedBy || resolved.verifiedBy,
              verifiedByRole:
                matchedRegPat.verifiedByRole ||
                matchedReg?.verifiedByRole ||
                resolved.verifiedByRole,
              verifierNotes:
                matchedRegPat.verifierNotes ?? matchedReg?.verifierNotes ?? resolved.verifierNotes,
              revisionRequested: false
            };
          } else if (
            matchedRegPat.status === 'belum_diajukan' &&
            (matchedRegPat.revisionRequested || Boolean(matchedRegPat.verifierNotes)) &&
            regRevEpoch >= baseSubmittedEpoch
          ) {
            resolved = {
              ...resolved,
              status: 'belum_diajukan',
              verifiedAt: undefined,
              verifiedBy: undefined,
              verifiedByRole: undefined,
              verifierNotes:
                matchedRegPat.verifierNotes || matchedReg?.verifierNotes || resolved.verifierNotes,
              revisionRequested: true,
              revisionRequestedAt:
                matchedRegPat.revisionRequestedAt ||
                matchedReg?.revisionRequestedAt ||
                resolved.revisionRequestedAt,
              revisionRequestedBy:
                matchedRegPat.revisionRequestedBy ||
                matchedReg?.revisionRequestedBy ||
                resolved.revisionRequestedBy,
              revisionRequestedByRole:
                matchedRegPat.revisionRequestedByRole ||
                matchedReg?.revisionRequestedByRole ||
                resolved.revisionRequestedByRole,
              revisionEpoch: regRevEpoch
            };
          }
        }
      } catch {
        // ignore
      }

      // 3. Check sessions from App / Cloud Firestore for matching patient on active date & shift
      const cleanRm = pat.medicalRecord?.trim().toLowerCase();
      const cleanName = pat.patientName.trim().toLowerCase();
      const matchedSession = sessions.find((s) => {
        if (!isMatchingNurse(s.nurseInCharge, currentNurse.name)) return false;
        const sDateIso = s.sessionDate || (s.date ? indonesianDateLabelToIso(s.date) : '');
        if (sDateIso !== activeDateIso) return false;
        if (s.shift && s.shift !== activeShift) return false;
        if (cleanRm && s.medicalRecordNumber?.trim().toLowerCase() === cleanRm) return true;
        if (cleanName && s.patientName.trim().toLowerCase() === cleanName) return true;
        return isSameBed(s.bedNumber, pat.bedNumber);
      });

      if (matchedSession) {
        const sessRevEpoch = matchedSession.revisionEpoch || 0;
        if (
          matchedSession.revisionRequested &&
          matchedSession.verificationStatus === 'belum_diajukan' &&
          sessRevEpoch >= baseSubmittedEpoch
        ) {
          resolved = {
            ...resolved,
            status: 'belum_diajukan',
            verifiedAt: undefined,
            verifiedBy: undefined,
            verifiedByRole: undefined,
            verifierNotes: matchedSession.verifierNotes || resolved.verifierNotes,
            revisionRequested: true,
            revisionRequestedAt:
              matchedSession.revisionRequestedAt || resolved.revisionRequestedAt,
            revisionRequestedBy:
              matchedSession.revisionRequestedBy || resolved.revisionRequestedBy,
            revisionRequestedByRole:
              matchedSession.revisionRequestedByRole || resolved.revisionRequestedByRole,
            revisionEpoch: sessRevEpoch
          };
        } else if (
          !resolved.revisionRequested &&
          (matchedSession.isVerifiedByPj ||
            matchedSession.isVerifiedByKepalaRuang ||
            matchedSession.verificationStatus === 'terverifikasi')
        ) {
          resolved = {
            ...resolved,
            status: 'terverifikasi',
            verifiedAt: matchedSession.verifiedAt || resolved.verifiedAt,
            verifiedBy: matchedSession.verifiedBy || resolved.verifiedBy,
            verifiedByRole: matchedSession.verifiedByRole || resolved.verifiedByRole,
            verifierNotes: matchedSession.verifierNotes || resolved.verifierNotes,
            revisionRequested: false
          };
        }
      }

      return resolved;
    },
    [
      verifSyncTick,
      patientSubmissions,
      createDefaultSubmissionForPatient,
      currentNurse.name,
      activeDateIso,
      sessions,
      activeShift
    ]
  );

  const activePatientSubmission: PjVerificationSubmission = React.useMemo(
    () => getEffectivePatientSubmission(activePatient),
    [getEffectivePatientSubmission, activePatient]
  );

  const updateActivePatientSubmission = (
    updater: (prev: PjVerificationSubmission) => PjVerificationSubmission
  ) => {
    if (!openedPatient) return;
    const currentEffective = getEffectivePatientSubmission(openedPatient);
    const nextVal = updater(currentEffective);
    setPatientSubmissions((prev) => ({
      ...prev,
      [openedPatient.id]: nextVal
    }));
    // Mirror target verifier choice as default preference for subsequent patients
    setPjVerification((prev) => ({
      ...prev,
      targetRole: nextVal.targetRole || prev.targetRole,
      targetVerifierName: nextVal.targetVerifierName || prev.targetVerifierName,
      targetVerifierNip: nextVal.targetVerifierNip || prev.targetVerifierNip,
      pjShiftName: nextVal.pjShiftName || prev.pjShiftName,
      pjShiftNip: nextVal.pjShiftNip || prev.pjShiftNip
    }));
  };

  // Lock status helpers adhering to:
  // "Logbook yang statusnya menunggu verifikasi dan sudah di verifikasi tidak bisa diedit lagi.
  //  Bisa diedit lagi saat verifikator (pj shift dan kepala ruang) meminta memperbaiki kembali logbook tersebut."
  const getPatientLockStatus = React.useCallback(
    (patId?: string): {
      isSubmitted: boolean;
      isVerified: boolean;
      isLocked: boolean;
      hasRevisionRequest: boolean;
      verifierNotes?: string;
      submission?: PjVerificationSubmission;
    } => {
      if (!isToday) {
        return { isSubmitted: false, isVerified: false, isLocked: true, hasRevisionRequest: false };
      }
      const targetPat = managedPatients.find((p) => p.id === patId) || openedPatient || activePatient;
      if (!targetPat || !targetPat.id) {
        return { isSubmitted: false, isVerified: false, isLocked: false, hasRevisionRequest: false };
      }
      const sub = getEffectivePatientSubmission(targetPat);
      const lockState = resolveLogbookLockState({
        status: sub.status,
        revisionRequested: sub.revisionRequested,
        verifierNotes: sub.verifierNotes,
        isToday
      });
      return {
        isSubmitted: lockState.isSubmitted,
        isVerified: lockState.isVerified,
        isLocked: lockState.isLocked,
        hasRevisionRequest: lockState.hasRevisionRequest,
        verifierNotes: sub.verifierNotes,
        submission: sub
      };
    },
    [isToday, managedPatients, openedPatient, activePatient, getEffectivePatientSubmission]
  );

  const currentPatientLock = React.useMemo(() => {
    return getPatientLockStatus(activePatient.id);
  }, [getPatientLockStatus, activePatient.id]);

  const isCurrentPatientSubmitted = currentPatientLock.isSubmitted;
  const isCurrentPatientVerified = currentPatientLock.isVerified;
  const isCurrentPatientLocked = currentPatientLock.isLocked;
  const hasCurrentPatientRevisionRequest = currentPatientLock.hasRevisionRequest;

  const isFacilityLocked =
    !isToday ||
    (openedPatient
      ? isCurrentPatientLocked
      : managedPatients.length > 0 &&
        managedPatients.every((p) => getPatientLockStatus(p.id).isLocked));

  const isActiveBagianLocked =
    !isToday || (selectedBagian === 1 ? isFacilityLocked : isCurrentPatientLocked);

  const getLockToastMessage = (status?: PjVerificationStatus) => {
    if (status === 'diajukan') {
      return 'Logbook sedang menunggu verifikasi sehingga tidak dapat diedit lagi. Logbook baru dapat diedit kembali jika verifikator (PJ Shift / Kepala Ruang) meminta perbaikan.';
    }
    if (status === 'terverifikasi') {
      return 'Logbook sudah diverifikasi dan disahkan sehingga tidak dapat diedit lagi. Logbook baru dapat diedit kembali jika verifikator (PJ Shift / Kepala Ruang) meminta perbaikan.';
    }
    return 'Pengisian logbook dibatasi hanya bisa mengisi pada hari yang sama.';
  };

  // Helper to update status + note for a specific patient item
  const syncPatientStatusAndNote = (
    patientId: string,
    code: string,
    isChecked: boolean,
    noteText: string
  ) => {
    setPatientStatuses((prev) => ({
      ...prev,
      [patientId]: {
        ...(prev[patientId] || {}),
        [code]: isChecked
      }
    }));
    setPatientNotes((prev) => ({
      ...prev,
      [patientId]: {
        ...(prev[patientId] || {}),
        [code]: noteText
      }
    }));
  };

  // Update Poin 2.1 structured checklist
  const updatePoin2_1 = (nextPoin2_1: Poin2_1ClinicalData) => {
    if (!isToday || isCurrentPatientLocked) {
      showToast(getLockToastMessage(currentPatientLock.submission?.status), 3500);
      return;
    }
    if (managedPatients.length === 0) return;
    const patId = activePatient.id;
    setPatientClinicalDetails((prev) => ({
      ...prev,
      [patId]: {
        ...normalizePatientClinicalDetails(prev[patId]),
        poin2_1: nextPoin2_1
      }
    }));
    const counts = getPoin2_1Counts(nextPoin2_1);
    syncPatientStatusAndNote(patId, '2.1', counts.isComplete, formatPoin2_1Note(nextPoin2_1));
  };

  // Update Poin 3.1: Identifikasi Pasien, Status (Rawat Jalan / Rawat Inap + Ruang), & Kategori
  const updatePoin3_1 = (patch: Partial<Poin3_1ClinicalData>) => {
    if (!isToday || isCurrentPatientLocked) {
      showToast(getLockToastMessage(currentPatientLock.submission?.status), 3500);
      return;
    }
    if (managedPatients.length === 0) return;
    const patId = activePatient.id;
    const currentDetail = normalizePatientClinicalDetails(patientClinicalDetails[patId]);
    const mergedPoin3_1: Poin3_1ClinicalData = {
      ...currentDetail.poin3_1,
      ...patch,
      verbal: {
        ...currentDetail.poin3_1.verbal,
        ...(patch.verbal || {})
      },
      nonVerbal: {
        ...currentDetail.poin3_1.nonVerbal,
        ...(patch.nonVerbal || {})
      }
    };
    if (!mergedPoin3_1.status || mergedPoin3_1.status === 'RAWAT JALAN') {
      mergedPoin3_1.ruangRawatInap = '';
    }
    const isComplete3_1 = isPoin3_1Complete(mergedPoin3_1);
    const nextPoin3_1: Poin3_1ClinicalData = {
      ...mergedPoin3_1,
      verbal: patch.verbal
        ? mergedPoin3_1.verbal
        : { namaLengkap: isComplete3_1, tanggalLahir: isComplete3_1 },
      nonVerbal: patch.nonVerbal
        ? mergedPoin3_1.nonVerbal
        : { gelangIdentitas: isComplete3_1, dokumenRmDanResep: isComplete3_1 }
    };
    setPatientClinicalDetails((prev) => ({
      ...prev,
      [patId]: {
        ...normalizePatientClinicalDetails(prev[patId]),
        poin3_1: nextPoin3_1
      }
    }));
    const note = formatPoin3_1Note(nextPoin3_1, activePatient.patientName, activePatient.medicalRecord);
    syncPatientStatusAndNote(patId, '3.1', isComplete3_1, note);
  };
  // Update Poin 3.2: Berat Badan Datang, Berat Badan Pulang, Berat Badan Kering
  const updatePoin3_2 = (patch: Partial<Poin3_2ClinicalData>) => {
    if (!isToday || isCurrentPatientLocked) {
      showToast(getLockToastMessage(currentPatientLock.submission?.status), 3500);
      return;
    }
    if (managedPatients.length === 0) return;
    const patId = activePatient.id;
    const currentDetail = normalizePatientClinicalDetails(patientClinicalDetails[patId]);
    const nextPoin3_2: Poin3_2ClinicalData = {
      ...currentDetail.poin3_2,
      ...patch
    };
    setPatientClinicalDetails((prev) => ({
      ...prev,
      [patId]: {
        ...normalizePatientClinicalDetails(prev[patId]),
        poin3_2: nextPoin3_2
      }
    }));
    syncPatientStatusAndNote(
      patId,
      '3.2',
      isPoin3_2LogbookComplete(nextPoin3_2),
      formatPoin3_2LogbookNote(nextPoin3_2)
    );
  };

  // Update Poin 3.3: Tekanan Darah Pre HD
  const updatePoin3_3 = (rawTdPreHd: string) => {
    if (!isToday || isCurrentPatientLocked) {
      showToast(getLockToastMessage(currentPatientLock.submission?.status), 3500);
      return;
    }
    if (managedPatients.length === 0) return;
    const patId = activePatient.id;
    const currentDetail = normalizePatientClinicalDetails(patientClinicalDetails[patId]);
    const parsedBp = parsePreBpInput(rawTdPreHd);
    const nextPoin3_3 = {
      ...currentDetail.poin3_3,
      tdPreHd: rawTdPreHd,
      tdSistolik: parsedBp.tdSistolik,
      tdDiastolik: parsedBp.tdDiastolik
    };
    setPatientClinicalDetails((prev) => ({
      ...prev,
      [patId]: {
        ...normalizePatientClinicalDetails(prev[patId]),
        poin3_3: nextPoin3_3
      }
    }));
    syncPatientStatusAndNote(
      patId,
      '3.3',
      isPoin3_3LogbookComplete(nextPoin3_3),
      formatPoin3_3LogbookNote(nextPoin3_3)
    );
  };

  // Update Poin 3.5: Waktu Dialisis/Time, Target UFG, QB, QD, Dosis Heparin
  const updatePoin3_5 = (patch: Partial<Poin3_5ClinicalData>) => {
    if (!isToday || isCurrentPatientLocked) {
      showToast(getLockToastMessage(currentPatientLock.submission?.status), 3500);
      return;
    }
    if (managedPatients.length === 0) return;
    const patId = activePatient.id;
    const currentDetail = normalizePatientClinicalDetails(patientClinicalDetails[patId]);
    const nextPoin3_5: Poin3_5ClinicalData = {
      ...currentDetail.poin3_5,
      ...patch
    };
    setPatientClinicalDetails((prev) => ({
      ...prev,
      [patId]: {
        ...normalizePatientClinicalDetails(prev[patId]),
        poin3_5: nextPoin3_5
      }
    }));
    syncPatientStatusAndNote(
      patId,
      '3.5',
      isPoin3_5Complete(nextPoin3_5),
      formatPoin3_5Note(nextPoin3_5)
    );
  };

  // Update Poin 3.6: Akses Vaskuler CIMINO, CDL, FEMORAL
  const updatePoin3_6Toggle = (accessKey: 'cimino' | 'cdl' | 'femoral') => {
    if (!isToday || isCurrentPatientLocked) {
      showToast(getLockToastMessage(currentPatientLock.submission?.status), 3500);
      return;
    }
    if (managedPatients.length === 0) return;
    const patId = activePatient.id;
    const currentDetail = normalizePatientClinicalDetails(patientClinicalDetails[patId]);
    const prev3_6 = currentDetail.poin3_6;
    const activeField =
      accessKey === 'cimino'
        ? 'ciminoAktif'
        : accessKey === 'cdl'
        ? 'cdlAktif'
        : 'femoralAktif';
    const currentlyActive =
      Boolean(prev3_6[activeField]) || isMeaningfulAccessInput(prev3_6[accessKey]);
    const nextActive = !currentlyActive;

    const nextPoin3_6 = {
      ...prev3_6,
      [activeField]: nextActive,
      ...(nextActive ? {} : { [accessKey]: '' })
    };

    setPatientClinicalDetails((prev) => ({
      ...prev,
      [patId]: {
        ...normalizePatientClinicalDetails(prev[patId]),
        poin3_6: nextPoin3_6
      }
    }));
    syncPatientStatusAndNote(
      patId,
      '3.6',
      isPoin3_6Complete(nextPoin3_6),
      formatPoin3_6Note(nextPoin3_6)
    );
  };

  const updatePoin3_6Text = (accessKey: 'cimino' | 'cdl' | 'femoral', textValue: string) => {
    if (!isToday || isCurrentPatientLocked) {
      return;
    }
    if (managedPatients.length === 0) return;
    const patId = activePatient.id;
    const currentDetail = normalizePatientClinicalDetails(patientClinicalDetails[patId]);
    const activeField =
      accessKey === 'cimino'
        ? 'ciminoAktif'
        : accessKey === 'cdl'
        ? 'cdlAktif'
        : 'femoralAktif';
    const nextPoin3_6 = {
      ...currentDetail.poin3_6,
      [accessKey]: textValue,
      [activeField]: isMeaningfulAccessInput(textValue)
    };

    setPatientClinicalDetails((prev) => ({
      ...prev,
      [patId]: {
        ...normalizePatientClinicalDetails(prev[patId]),
        poin3_6: nextPoin3_6
      }
    }));
    syncPatientStatusAndNote(
      patId,
      '3.6',
      isPoin3_6Complete(nextPoin3_6),
      formatPoin3_6Note(nextPoin3_6)
    );
  };

  const updatePoin3_6Nurse = (selectedNurseName: string) => {
    if (!isToday || isCurrentPatientLocked) {
      showToast(getLockToastMessage(currentPatientLock.submission?.status), 3500);
      return;
    }
    if (managedPatients.length === 0) return;
    const patId = activePatient.id;
    const currentDetail = normalizePatientClinicalDetails(patientClinicalDetails[patId]);
    const cleanAssigned =
      !selectedNurseName || isMatchingNurse(selectedNurseName, currentNurse.name)
        ? ''
        : selectedNurseName.trim();
    const nextPoin3_6 = {
      ...currentDetail.poin3_6,
      vascularAccessNurse: cleanAssigned
    };

    setPatientClinicalDetails((prev) => ({
      ...prev,
      [patId]: {
        ...normalizePatientClinicalDetails(prev[patId]),
        poin3_6: nextPoin3_6
      }
    }));
    const currentChecked = Boolean(patientStatuses[patId]?.['3.6']) || isPoin3_6Complete(nextPoin3_6);
    syncPatientStatusAndNote(patId, '3.6', currentChecked, formatPoin3_6Note(nextPoin3_6));
  };

  // Update Poin 4.3: Penanganan Komplikasi Intra-HD (Dynamic Dropdown, Jam Kejadian & Kolom Advis Dokter)
  const updatePoin4_3NoComplication = () => {
    if (!isToday || isCurrentPatientLocked) {
      showToast(getLockToastMessage(currentPatientLock.submission?.status), 3500);
      return;
    }
    if (managedPatients.length === 0) return;
    const patId = activePatient.id;
    const currentDetail = normalizePatientClinicalDetails(patientClinicalDetails[patId]);
    const nextNoComp = !currentDetail.poin4_3.tidakAdaKomplikasi;
    const nextPoin4_3: Poin4_3ClinicalData = nextNoComp
      ? { ...createEmptyPoin4_3Data(), tidakAdaKomplikasi: true, entries: [] }
      : { ...currentDetail.poin4_3, tidakAdaKomplikasi: false };

    setPatientClinicalDetails((prev) => ({
      ...prev,
      [patId]: {
        ...normalizePatientClinicalDetails(prev[patId]),
        poin4_3: nextPoin4_3
      }
    }));
    syncPatientStatusAndNote(
      patId,
      '4.3',
      isPoin4_3Complete(nextPoin4_3),
      formatPoin4_3Note(nextPoin4_3)
    );
  };

  const addPoin4_3DynamicEntry = (defaultJenis: string = 'Hipertensi') => {
    if (!isToday || isCurrentPatientLocked) {
      showToast(getLockToastMessage(currentPatientLock.submission?.status), 3500);
      return;
    }
    if (managedPatients.length === 0) return;
    const patId = activePatient.id;
    const currentDetail = normalizePatientClinicalDetails(patientClinicalDetails[patId]);
    const prev4_3 = currentDetail.poin4_3;
    const currentEntries = prev4_3.entries ? [...prev4_3.entries] : [];

    const newEntry = createDefaultPoin4_3Entry(defaultJenis);
    const nextEntries = [...currentEntries, newEntry];

    const nextPoin4_3: Poin4_3ClinicalData = normalizePoin4_3Data({
      ...prev4_3,
      entries: nextEntries,
      tidakAdaKomplikasi: false
    });

    setPatientClinicalDetails((prev) => ({
      ...prev,
      [patId]: {
        ...normalizePatientClinicalDetails(prev[patId]),
        poin4_3: nextPoin4_3
      }
    }));
    syncPatientStatusAndNote(
      patId,
      '4.3',
      isPoin4_3Complete(nextPoin4_3),
      formatPoin4_3Note(nextPoin4_3)
    );
    showToast(`Komplikasi ${defaultJenis} ditambahkan. Lengkapi jam kejadian & advis dokter.`);
  };

  const updatePoin4_3DynamicEntry = (
    entryId: string,
    patch: Partial<Poin4_3DynamicEntry>
  ) => {
    if (!isToday || isCurrentPatientLocked) {
      showToast(getLockToastMessage(currentPatientLock.submission?.status), 3500);
      return;
    }
    if (managedPatients.length === 0) return;
    const patId = activePatient.id;
    const currentDetail = normalizePatientClinicalDetails(patientClinicalDetails[patId]);
    const prev4_3 = currentDetail.poin4_3;
    const currentEntries = prev4_3.entries ? [...prev4_3.entries] : [];

    const updatedEntries = currentEntries.map((e) => {
      if (e.id !== entryId) return e;
      const updated: Poin4_3DynamicEntry = { ...e, ...patch };
      // When jenis changed, suggest the new default advice if advice was empty or previously default
      if (patch.jenis && patch.jenis !== e.jenis) {
        const prevDefault = getDefaultAdvisForJenis(e.jenis);
        if (
          !e.advisDokter ||
          e.advisDokter.trim() === '' ||
          e.advisDokter.trim() === prevDefault.trim()
        ) {
          updated.advisDokter = getDefaultAdvisForJenis(patch.jenis);
        }
        const nextCfg = getComplicationValueConfig(patch.jenis);
        if (!nextCfg.hasValue) {
          updated.nilai = '';
        }
      }
      return updated;
    });

    const nextPoin4_3: Poin4_3ClinicalData = normalizePoin4_3Data({
      ...prev4_3,
      entries: updatedEntries,
      tidakAdaKomplikasi: false
    });

    setPatientClinicalDetails((prev) => ({
      ...prev,
      [patId]: {
        ...normalizePatientClinicalDetails(prev[patId]),
        poin4_3: nextPoin4_3
      }
    }));
    syncPatientStatusAndNote(
      patId,
      '4.3',
      isPoin4_3Complete(nextPoin4_3),
      formatPoin4_3Note(nextPoin4_3)
    );
  };

  const removePoin4_3DynamicEntry = (entryId: string) => {
    if (!isToday || isCurrentPatientLocked) {
      showToast(getLockToastMessage(currentPatientLock.submission?.status), 3500);
      return;
    }
    if (managedPatients.length === 0) return;
    const patId = activePatient.id;
    const currentDetail = normalizePatientClinicalDetails(patientClinicalDetails[patId]);
    const prev4_3 = currentDetail.poin4_3;
    const filteredEntries = (prev4_3.entries || []).filter((e) => e.id !== entryId);

    const nextPoin4_3: Poin4_3ClinicalData = normalizePoin4_3Data({
      ...prev4_3,
      entries: filteredEntries,
      tidakAdaKomplikasi: filteredEntries.length === 0 ? prev4_3.tidakAdaKomplikasi : false
    });

    setPatientClinicalDetails((prev) => ({
      ...prev,
      [patId]: {
        ...normalizePatientClinicalDetails(prev[patId]),
        poin4_3: nextPoin4_3
      }
    }));
    syncPatientStatusAndNote(
      patId,
      '4.3',
      isPoin4_3Complete(nextPoin4_3),
      formatPoin4_3Note(nextPoin4_3)
    );
    showToast('Baris komplikasi telah dihapus.');
  };

  const setJamNowPoin4_3 = (entryId: string) => {
    if (!isToday || isCurrentPatientLocked) {
      showToast(getLockToastMessage(currentPatientLock.submission?.status), 3500);
      return;
    }
    const now = new Date();
    const jamNow = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    updatePoin4_3DynamicEntry(entryId, { jam: jamNow });
  };

  // Update Poin 4.1: Observasi TTV (Tekanan Darah Intra HD)
  const updatePoin4_1 = (patch: Partial<Poin4_1ClinicalData>) => {
    if (!isToday || isCurrentPatientLocked) {
      showToast(getLockToastMessage(currentPatientLock.submission?.status), 3500);
      return;
    }
    if (managedPatients.length === 0) return;
    const patId = activePatient.id;
    const currentDetail = normalizePatientClinicalDetails(patientClinicalDetails[patId]);
    const nextPoin4_1: Poin4_1ClinicalData = {
      ...currentDetail.poin4_1,
      ...patch
    };
    setPatientClinicalDetails((prev) => ({
      ...prev,
      [patId]: {
        ...normalizePatientClinicalDetails(prev[patId]),
        poin4_1: nextPoin4_1
      }
    }));
    syncPatientStatusAndNote(
      patId,
      '4.1',
      isPoin4_1Complete(nextPoin4_1),
      formatPoin4_1Note(nextPoin4_1)
    );
  };

  // Update Poin 6.3: Tekanan Darah Post HD, Nilai UFG Tercapai, dan KT/V
  const updatePoin6_3 = (patch: Partial<Poin6_3ClinicalData>) => {
    if (!isToday || isCurrentPatientLocked) {
      showToast(getLockToastMessage(currentPatientLock.submission?.status), 3500);
      return;
    }
    if (managedPatients.length === 0) return;
    const patId = activePatient.id;
    const currentDetail = normalizePatientClinicalDetails(patientClinicalDetails[patId]);
    const nextPoin6_3: Poin6_3ClinicalData = {
      ...currentDetail.poin6_3,
      ...patch
    };
    setPatientClinicalDetails((prev) => ({
      ...prev,
      [patId]: {
        ...normalizePatientClinicalDetails(prev[patId]),
        poin6_3: nextPoin6_3
      }
    }));
    syncPatientStatusAndNote(
      patId,
      '6.3',
      isPoin6_3Complete(nextPoin6_3),
      formatPoin6_3Note(nextPoin6_3)
    );
  };

  // Cross-nurse & cross-role occupied patients (same date) and beds (same date + activeShift)
  const occupiedAssets = React.useMemo(() => {
    void verifSyncTick;
    return collectOccupiedLogbookAssets({
      activeDateIso,
      activeShift,
      currentNurseName: currentNurse.name,
      sessions,
      registryEntries: getVerificationRegistry(),
      cloudNurseLogbooks,
      masterNurses,
      includeLocalNurseStorage: true
    });
  }, [
    activeDateIso,
    activeShift,
    currentNurse.name,
    sessions,
    cloudNurseLogbooks,
    masterNurses,
    verifSyncTick
  ]);

  const recommendNextBed = React.useCallback(
    (isIsolationPatient: boolean, currentList: ManagedPatient[] = managedPatients): string => {
      const isBedUnavailable = (bedCandidate: string) =>
        currentList.some((p) => isSameBed(p.bedNumber, bedCandidate)) ||
        Boolean(occupiedAssets.findBedClaimedByOther(bedCandidate));

      const activeBeds = masterBeds.filter((b) => b.status !== 'maintenance');
      const prioritizedBeds =
        activeBeds.length > 0
          ? [
              ...activeBeds.filter((b) =>
                isIsolationPatient ? b.designation !== 'reguler' : b.designation === 'reguler'
              ),
              ...activeBeds.filter((b) =>
                isIsolationPatient ? b.designation === 'reguler' : b.designation !== 'reguler'
              )
            ].map((b) => b.bedNumber)
          : [
              ...Array.from({ length: 12 }, (_, i) => `BED A${String(i + 1).padStart(2, '0')}`),
              ...Array.from({ length: 9 }, (_, i) => `BED B${String(i + 1).padStart(2, '0')}`),
              ...Array.from({ length: 8 }, (_, i) => `BED C${String(i + 1).padStart(2, '0')}`),
              ...Array.from({ length: 3 }, (_, i) => `BED D${String(i + 1).padStart(2, '0')}`),
              ...Array.from({ length: 2 }, (_, i) => `BED E${String(i + 1).padStart(2, '0')}`),
              ...Array.from({ length: 2 }, (_, i) => `BED F${String(i + 1).padStart(2, '0')}`),
              ...Array.from({ length: 4 }, (_, i) => `BED ISOLASI ${String(i + 1).padStart(2, '0')}`)
            ];
      return prioritizedBeds.find((b) => !isBedUnavailable(b)) || '';
    },
    [managedPatients, masterBeds, occupiedAssets]
  );

  // If another nurse claims a draft bed before this nurse submits, automatically advance to the next free bed
  useEffect(() => {
    if (draftBedNumber && occupiedAssets.findBedClaimedByOther(draftBedNumber)) {
      setDraftBedNumber(recommendNextBed(false));
    }
  }, [draftBedNumber, occupiedAssets, recommendNextBed]);

  useEffect(() => {
    if (rescheduleBedNumber && occupiedAssets.findBedClaimedByOther(rescheduleBedNumber)) {
      setRescheduleBedNumber(recommendNextBed(false));
    }
  }, [rescheduleBedNumber, occupiedAssets, recommendNextBed]);

  const getMasterPatientScheduleLabel = React.useCallback((mp: MasterPatient): string => {
    const raw = (mp.routineSchedule || '').trim();
    if (raw) return raw;
    return buildPatientDaySchedule({
      days: resolvePatientTreatmentDays(mp),
      shift: resolvePatientTreatmentShift(mp)
    });
  }, []);

  const handlePickDraftMasterPatient = (masterId: string) => {
    setDraftMasterId(masterId);
    if (!masterId) {
      setDraftPatientName('');
      setDraftPatientRm('');
      return;
    }
    const found = scheduledMasterPatients.find((mp) => mp.id === masterId);
    if (!found) return;

    const claimedPat = occupiedAssets.findPatientClaimedByOther({
      patientName: found.patientName,
      medicalRecord: found.medicalRecordNumber
    });
    if (claimedPat) {
      setDraftMasterId('');
      showToast(
        `Pasien ${found.patientName} sudah diinput pada logbook ${claimedPat.nurseName} (${claimedPat.bedNumber}) dan tidak dapat dipilih lagi oleh perawat lain.`,
        3600
      );
      return;
    }

    setDraftPatientName(found.patientName);
    setDraftPatientRm(found.medicalRecordNumber || '');
    const isIso = found.category !== 'reguler';
    setDraftBedNumber(recommendNextBed(isIso));
  };

  // Input / Tambah Pasien Terjadwal ke Daftar Logbook Shift Ini
  const handleCreatePatientFromForm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isToday) {
      showToast('Pengisian logbook dibatasi hanya bisa mengisi pada hari yang sama.', 3500);
      return;
    }

    const cleanName = draftPatientName.trim();
    const cleanRm = draftPatientRm.trim();

    if (!cleanName) {
      showToast(
        `Silakan pilih pasien dari Daftar Pasien Shift ${activeShift} atau isi nama pasien terlebih dahulu.`,
        3000
      );
      return;
    }

    if (managedPatients.length >= 10) {
      showToast('Batas maksimum 10 pasien pada satu shift telah tercapai.');
      return;
    }

    const duplicate = managedPatients.find((p) =>
      isSamePatientIdentity(
        { patientName: p.patientName, medicalRecord: p.medicalRecord },
        { patientName: cleanName, medicalRecord: cleanRm }
      )
    );
    if (duplicate) {
      showToast(
        `Pasien ${cleanName} sudah ada di daftar logbook Anda (${duplicate.bedNumber}). Silakan klik nama pasien tersebut untuk mengisi logbook.`,
        3500
      );
      return;
    }

    const claimedPatByOther = occupiedAssets.findPatientClaimedByOther({
      patientName: cleanName,
      medicalRecord: cleanRm
    });
    if (claimedPatByOther) {
      showToast(
        `Pasien ${cleanName} sudah diinput pada logbook ${claimedPatByOther.nurseName} (${claimedPatByOther.bedNumber}) dan tidak dapat dipilih lagi oleh perawat lain.`,
        3800
      );
      return;
    }

    const matchedMaster =
      scheduledMasterPatients.find((mp) => mp.id === draftMasterId) ||
      scheduledMasterPatients.find((mp) =>
        isSamePatientIdentity(
          { patientName: mp.patientName, medicalRecord: mp.medicalRecordNumber },
          { patientName: cleanName, medicalRecord: cleanRm }
        )
      );
    const isIsolationPatient = Boolean(matchedMaster && matchedMaster.category !== 'reguler');
    const chosenBed = (draftBedNumber || recommendNextBed(isIsolationPatient)).trim();

    if (!chosenBed) {
      showToast(
        `Seluruh mesin/bed HD pada Shift ${activeShift} sudah digunakan. Tidak ada bed kosong yang dapat dipilih.`,
        3600
      );
      return;
    }

    const ownBedUsed = managedPatients.find((p) => isSameBed(p.bedNumber, chosenBed));
    if (ownBedUsed) {
      showToast(
        `Mesin/Bed ${chosenBed} sudah digunakan pada daftar logbook Anda (${ownBedUsed.patientName}). Silakan pilih bed lain.`,
        3500
      );
      return;
    }

    const claimedBedByOther = occupiedAssets.findBedClaimedByOther(chosenBed);
    if (claimedBedByOther) {
      showToast(
        `Mesin/Bed ${chosenBed} sudah digunakan pada logbook ${claimedBedByOther.nurseName} (Pasien: ${claimedBedByOther.patientName}) pada Shift ${activeShift} dan tidak dapat dipilih lagi oleh perawat lain.`,
        3800
      );
      return;
    }

    const newId = `p${Date.now()}`;
    const newPatient: ManagedPatient = {
      id: newId,
      bedNumber: chosenBed,
      patientName: cleanName,
      medicalRecord: cleanRm
    };

    const newClinical = createDefaultPatientClinicalDetails('new');

    const nextPatients = [...managedPatients, newPatient];
    const nextClinicalMap = {
      ...patientClinicalDetails,
      [newId]: newClinical
    };
    const nextSubsMap = {
      ...patientSubmissions,
      [newId]: createDefaultSubmissionForPatient()
    };

    setManagedPatients(nextPatients);
    setPatientClinicalDetails(nextClinicalMap);
    setActivePatientId(newId);

    setPatientStatuses((prev) => {
      const copy = { ...prev };
      copy[newId] = {};
      OFFICIAL_LOGBOOK_ITEMS.filter((it) => it.bagian >= 2 && it.bagian <= 6).forEach((it) => {
        copy[newId][it.code] = false;
      });
      return copy;
    });

    setPatientNotes((prev) => ({
      ...prev,
      [newId]: {}
    }));

    setPatientSubmissions(nextSubsMap);

    try {
      localStorage.setItem(managedPatientsStorageKey, JSON.stringify(nextPatients));
      touchNurseDailyStorage(currentNurse.name);
    } catch {
      // ignore
    }

    saveNurseLogbookCloud(currentNurse.name, {
      nurseName: currentNurse.name,
      managedPatients: nextPatients,
      clinicalDetails: nextClinicalMap,
      facilityStatuses,
      facilityNotes,
      patientStatuses,
      patientNotes,
      submission: pjVerification,
      patientSubmissions: nextSubsMap,
      shiftSchedule: { shift: activeShift, date: activeDate },
      dateIso: activeDateIso,
      logbookDate: activeDate
    });

    syncSubmittedPatientsToRegistryAndSessions(nextPatients, nextSubsMap, pjVerification);

    setDraftMasterId('');
    setDraftPatientName('');
    setDraftPatientRm('');
    setDraftBedNumber('');

    showToast(
      `Pasien ${cleanName} (${chosenBed}) berhasil diinput. Klik nama pasien untuk mengisi Logbook Bagian I–VII.`,
      3400
    );
  };

  // Buka Modal Tambah Pasien Reschedule (Di Luar Daftar Pasien Shift Ini)
  const handleOpenRescheduleModal = () => {
    if (!isToday) {
      showToast('Pengisian logbook dibatasi hanya bisa mengisi pada hari yang sama.', 3500);
      return;
    }
    if (managedPatients.length >= 10) {
      showToast('Batas maksimum 10 pasien pada satu shift telah tercapai.');
      return;
    }
    setRescheduleSearchQuery('');
    setRescheduleMasterId('');
    setReschedulePatientName('');
    setReschedulePatientRm('');
    setRescheduleBedNumber(recommendNextBed(false));
    setRescheduleOriginalSchedule('');
    setRescheduleReason('');
    setIsRescheduleModalOpen(true);
  };

  const handlePickRescheduleMasterPatient = (masterId: string) => {
    setRescheduleMasterId(masterId);
    if (!masterId) {
      setReschedulePatientName('');
      setReschedulePatientRm('');
      setRescheduleOriginalSchedule('');
      setRescheduleReason('');
      return;
    }
    const found = masterPatients.find((mp) => mp.id === masterId);
    if (!found) return;

    const claimedPat = occupiedAssets.findPatientClaimedByOther({
      patientName: found.patientName,
      medicalRecord: found.medicalRecordNumber
    });
    if (claimedPat) {
      setRescheduleMasterId('');
      showToast(
        `Pasien ${found.patientName} sudah diinput pada logbook ${claimedPat.nurseName} (${claimedPat.bedNumber}) dan tidak dapat dipilih lagi oleh perawat lain.`,
        3600
      );
      return;
    }

    const origSched = getMasterPatientScheduleLabel(found);
    setReschedulePatientName(found.patientName);
    setReschedulePatientRm(found.medicalRecordNumber || '');
    setRescheduleOriginalSchedule(origSched);
    setRescheduleReason(`Reschedule dari jadwal ${origSched}`);
    const isIso = found.category !== 'reguler';
    setRescheduleBedNumber(recommendNextBed(isIso));
  };

  const handleCreateReschedulePatient = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isToday) {
      showToast('Pengisian logbook dibatasi hanya bisa mengisi pada hari yang sama.', 3500);
      return;
    }

    const cleanName = reschedulePatientName.trim();
    const cleanRm = reschedulePatientRm.trim();

    if (!cleanName) {
      showToast(
        'Silakan pilih pasien dari daftar di luar shift atau ketik nama pasien reschedule terlebih dahulu.',
        3000
      );
      return;
    }

    if (managedPatients.length >= 10) {
      showToast('Batas maksimum 10 pasien pada satu shift telah tercapai.');
      return;
    }

    const duplicate = managedPatients.find((p) =>
      isSamePatientIdentity(
        { patientName: p.patientName, medicalRecord: p.medicalRecord },
        { patientName: cleanName, medicalRecord: cleanRm }
      )
    );
    if (duplicate) {
      showToast(
        `Pasien ${cleanName} sudah ada di daftar logbook Anda (${duplicate.bedNumber}). Silakan klik nama pasien tersebut untuk mengisi logbook.`,
        3500
      );
      return;
    }

    const claimedPatByOther = occupiedAssets.findPatientClaimedByOther({
      patientName: cleanName,
      medicalRecord: cleanRm
    });
    if (claimedPatByOther) {
      showToast(
        `Pasien ${cleanName} sudah diinput pada logbook ${claimedPatByOther.nurseName} (${claimedPatByOther.bedNumber}) dan tidak dapat dipilih lagi oleh perawat lain.`,
        3800
      );
      return;
    }

    const matchedMaster =
      masterPatients.find((mp) => mp.id === rescheduleMasterId) ||
      masterPatients.find((mp) =>
        isSamePatientIdentity(
          { patientName: mp.patientName, medicalRecord: mp.medicalRecordNumber },
          { patientName: cleanName, medicalRecord: cleanRm }
        )
      );
    const isIsolationPatient = Boolean(matchedMaster && matchedMaster.category !== 'reguler');
    const chosenBed = (rescheduleBedNumber || recommendNextBed(isIsolationPatient)).trim();

    if (!chosenBed) {
      showToast(
        `Seluruh mesin/bed HD pada Shift ${activeShift} sudah digunakan. Tidak ada bed kosong yang dapat dipilih.`,
        3600
      );
      return;
    }

    const ownBedUsed = managedPatients.find((p) => isSameBed(p.bedNumber, chosenBed));
    if (ownBedUsed) {
      showToast(
        `Mesin/Bed ${chosenBed} sudah digunakan pada daftar logbook Anda (${ownBedUsed.patientName}). Silakan pilih bed lain.`,
        3500
      );
      return;
    }

    const claimedBedByOther = occupiedAssets.findBedClaimedByOther(chosenBed);
    if (claimedBedByOther) {
      showToast(
        `Mesin/Bed ${chosenBed} sudah digunakan pada logbook ${claimedBedByOther.nurseName} (Pasien: ${claimedBedByOther.patientName}) pada Shift ${activeShift} dan tidak dapat dipilih lagi oleh perawat lain.`,
        3800
      );
      return;
    }

    const cleanOrigSchedule = (
      rescheduleOriginalSchedule ||
      (matchedMaster ? getMasterPatientScheduleLabel(matchedMaster) : '')
    ).trim();
    const cleanReason = rescheduleReason.trim();

    const newId = `p${Date.now()}`;
    const newPatient: ManagedPatient = {
      id: newId,
      bedNumber: chosenBed,
      patientName: cleanName,
      medicalRecord: cleanRm,
      isReschedule: true,
      ...(cleanOrigSchedule ? { originalSchedule: cleanOrigSchedule } : {}),
      ...(cleanReason ? { rescheduleReason: cleanReason } : {})
    };

    const newClinical = createDefaultPatientClinicalDetails('new');

    const nextPatients = [...managedPatients, newPatient];
    const nextClinicalMap = {
      ...patientClinicalDetails,
      [newId]: newClinical
    };
    const nextSubsMap = {
      ...patientSubmissions,
      [newId]: createDefaultSubmissionForPatient()
    };

    setManagedPatients(nextPatients);
    setPatientClinicalDetails(nextClinicalMap);
    setActivePatientId(newId);

    setPatientStatuses((prev) => {
      const copy = { ...prev };
      copy[newId] = {};
      OFFICIAL_LOGBOOK_ITEMS.filter((it) => it.bagian >= 2 && it.bagian <= 6).forEach((it) => {
        copy[newId][it.code] = false;
      });
      return copy;
    });

    setPatientNotes((prev) => ({
      ...prev,
      [newId]: {}
    }));

    setPatientSubmissions(nextSubsMap);

    try {
      localStorage.setItem(managedPatientsStorageKey, JSON.stringify(nextPatients));
      touchNurseDailyStorage(currentNurse.name);
    } catch {
      // ignore
    }

    saveNurseLogbookCloud(currentNurse.name, {
      nurseName: currentNurse.name,
      managedPatients: nextPatients,
      clinicalDetails: nextClinicalMap,
      facilityStatuses,
      facilityNotes,
      patientStatuses,
      patientNotes,
      submission: pjVerification,
      patientSubmissions: nextSubsMap,
      shiftSchedule: { shift: activeShift, date: activeDate },
      dateIso: activeDateIso,
      logbookDate: activeDate
    });

    syncSubmittedPatientsToRegistryAndSessions(nextPatients, nextSubsMap, pjVerification);

    setIsRescheduleModalOpen(false);
    setRescheduleSearchQuery('');
    setRescheduleMasterId('');
    setReschedulePatientName('');
    setReschedulePatientRm('');
    setRescheduleBedNumber('');
    setRescheduleOriginalSchedule('');
    setRescheduleReason('');

    showToast(
      `Pasien Reschedule ${cleanName} (${chosenBed}) berhasil ditambahkan ke Shift ${activeShift}. Klik nama pasien untuk mengisi Logbook Bagian I–VII.`,
      3600
    );
  };

  const handleOpenPatientWorkspace = (pat: ManagedPatient, initialBagian: number = 2) => {
    setActivePatientId(pat.id);
    setOpenedPatientId(pat.id);
    setSelectedBagian(initialBagian);
  };

  const handleBackToPatientList = () => {
    setSelectedBagian(null);
    setOpenedPatientId(null);
  };

  const handleUpdatePatientById = (
    targetPatientId: string,
    field: 'bedNumber' | 'patientName' | 'medicalRecord',
    value: string
  ) => {
    if (!isToday) {
      showToast('Pengisian logbook dibatasi hanya bisa mengisi pada hari yang sama.', 3500);
      return;
    }
    const patLock = getPatientLockStatus(targetPatientId);
    if (patLock.isLocked) {
      showToast(getLockToastMessage(patLock.submission?.status), 3500);
      return;
    }
    const targetPat = managedPatients.find((p) => p.id === targetPatientId);
    if (!targetPat) return;

    if (field === 'bedNumber') {
      const ownBedDup = managedPatients.find(
        (other) => other.id !== targetPatientId && isSameBed(other.bedNumber, value)
      );
      if (ownBedDup) {
        showToast(
          `Mesin/Bed ${value} sudah digunakan untuk pasien ${ownBedDup.patientName} pada logbook Anda.`,
          3500
        );
        return;
      }
      const claimedBed = occupiedAssets.findBedClaimedByOther(value);
      if (claimedBed) {
        showToast(
          `Mesin/Bed ${value} sudah digunakan pada logbook ${claimedBed.nurseName} (Pasien: ${claimedBed.patientName}) pada Shift ${activeShift} dan tidak dapat dipilih lagi oleh perawat lain.`,
          3800
        );
        return;
      }
    }

    const nextName = field === 'patientName' ? value : targetPat.patientName;
    const nextMrn = field === 'medicalRecord' ? value : targetPat.medicalRecord;

    if (field === 'patientName' || field === 'medicalRecord') {
      const claimedPat = occupiedAssets.findPatientClaimedByOther({
        patientName: nextName,
        medicalRecord: nextMrn
      });
      if (claimedPat) {
        showToast(
          `Pasien ${nextName || claimedPat.patientName} sudah diinput pada logbook ${claimedPat.nurseName} (${claimedPat.bedNumber}) dan tidak dapat dipilih lagi oleh perawat lain.`,
          3800
        );
        return;
      }
    }

    const nextList = managedPatients.map((p) =>
      p.id === targetPatientId ? { ...p, [field]: value } : p
    );
    setManagedPatients(nextList);

    try {
      localStorage.setItem(managedPatientsStorageKey, JSON.stringify(nextList));
      touchNurseDailyStorage(currentNurse.name);
    } catch {
      // ignore
    }

    saveNurseLogbookCloud(currentNurse.name, {
      nurseName: currentNurse.name,
      managedPatients: nextList,
      clinicalDetails: patientClinicalDetails,
      facilityStatuses,
      facilityNotes,
      patientStatuses,
      patientNotes,
      submission: pjVerification,
      patientSubmissions,
      shiftSchedule: { shift: activeShift, date: activeDate },
      dateIso: activeDateIso,
      logbookDate: activeDate
    });

    syncSubmittedPatientsToRegistryAndSessions(nextList, patientSubmissions, pjVerification);

    if (field === 'patientName' || field === 'medicalRecord') {
      const patClin =
        patientClinicalDetails[targetPatientId] || createDefaultPatientClinicalDetails('new');
      const note = formatPoin3_1Note(patClin.poin3_1, nextName, nextMrn);
      setPatientNotes((prev) => ({
        ...prev,
        [targetPatientId]: {
          ...(prev[targetPatientId] || {}),
          '3.1': note
        }
      }));
    }
  };

  const handleUpdateActivePatient = (
    field: 'bedNumber' | 'patientName' | 'medicalRecord',
    value: string
  ) => {
    handleUpdatePatientById(activePatient.id, field, value);
  };

  // Toggle item status (default false / Belum Dilaksanakan)
  const handleToggleItem = (code: string) => {
    if (!isToday) {
      showToast('Pengisian logbook dibatasi hanya bisa mengisi pada hari yang sama.', 3500);
      return;
    }

    if (selectedBagian === 1) {
      if (isFacilityLocked) {
        showToast(
          getLockToastMessage(currentPatientLock.submission?.status || pjVerification.status),
          3500
        );
        return;
      }
      setFacilityStatuses((prev) => ({
        ...prev,
        [code]: !Boolean(prev[code])
      }));
      return;
    }

    if (isCurrentPatientLocked) {
      showToast(getLockToastMessage(currentPatientLock.submission?.status), 3500);
      return;
    }

    const currentlyChecked = Boolean(
      patientStatuses[activePatient.id] && patientStatuses[activePatient.id][code]
    );
    const nextChecked = !currentlyChecked;

    if (code === '2.1') {
      updatePoin2_1(setAllPoin2_1(nextChecked));
      return;
    }

    if (code === '3.1') {
      const patId = activePatient.id;
      const currentDetail = normalizePatientClinicalDetails(patientClinicalDetails[patId]);
      if (nextChecked && !isPoin3_1Complete(currentDetail.poin3_1)) {
        showToast(
          'Silakan pilih Status Pelayanan dan Kategori Pasien pada Poin 3.1 terlebih dahulu agar checklist terisi.',
          3200
        );
        return;
      }
      const next3_1 = setAllPoin3_1(currentDetail.poin3_1, nextChecked);
      setPatientClinicalDetails((prev) => ({
        ...prev,
        [patId]: {
          ...normalizePatientClinicalDetails(prev[patId]),
          poin3_1: next3_1
        }
      }));
      syncPatientStatusAndNote(
        patId,
        '3.1',
        nextChecked,
        nextChecked
          ? formatPoin3_1Note(next3_1, activePatient.patientName, activePatient.medicalRecord)
          : ''
      );
      return;
    }

    if (code === '4.3') {
      const patId = activePatient.id;
      const current4_3 = activeClinical.poin4_3;
      if (nextChecked && !isPoin4_3Complete(current4_3)) {
        const next4_3 = { ...createEmptyPoin4_3Data(), tidakAdaKomplikasi: true };
        setPatientClinicalDetails((prev) => ({
          ...prev,
          [patId]: {
            ...normalizePatientClinicalDetails(prev[patId]),
            poin4_3: next4_3
          }
        }));
        syncPatientStatusAndNote(patId, '4.3', true, formatPoin4_3Note(next4_3));
        return;
      }
      if (!nextChecked && current4_3.tidakAdaKomplikasi) {
        const next4_3 = { ...current4_3, tidakAdaKomplikasi: false };
        setPatientClinicalDetails((prev) => ({
          ...prev,
          [patId]: {
            ...normalizePatientClinicalDetails(prev[patId]),
            poin4_3: next4_3
          }
        }));
        syncPatientStatusAndNote(patId, '4.3', false, '');
        return;
      }
    }

    if (code === '6.3') {
      const patId = activePatient.id;
      const current6_3 = activeClinical.poin6_3;
      if (nextChecked) {
        const isComp = isPoin6_3Complete(current6_3);
        syncPatientStatusAndNote(
          patId,
          '6.3',
          true,
          isComp ? formatPoin6_3Note(current6_3) : 'Evaluasi Post-HD: Dilakukan'
        );
      } else {
        syncPatientStatusAndNote(patId, '6.3', false, '');
      }
      return;
    }

    setPatientStatuses((prev) => {
      const patChecks = prev[activePatient.id] || {};
      return {
        ...prev,
        [activePatient.id]: {
          ...patChecks,
          [code]: nextChecked
        }
      };
    });
  };

  // Update optional item note (Bagian I facility or Bagian II-VI patient)
  const handleUpdateItemNote = (code: string, nextNote: string) => {
    if (!isToday) return;

    if (selectedBagian === 1) {
      if (isFacilityLocked) return;
      setFacilityNotes((prev) => ({
        ...prev,
        [code]: nextNote
      }));
      return;
    }
    if (managedPatients.length === 0) return;
    if (isCurrentPatientLocked) return;
    setPatientNotes((prev) => ({
      ...prev,
      [activePatient.id]: {
        ...(prev[activePatient.id] || {}),
        [code]: nextNote
      }
    }));
  };

  // Bulk set or reset all SPO items in a specific Bagian (1–6)
  const handleSetBagianChecklists = (bagianNum: number, checked: boolean) => {
    if (!isToday) {
      showToast('Pengisian logbook dibatasi hanya bisa mengisi pada hari yang sama.', 3500);
      return;
    }

    const items = OFFICIAL_LOGBOOK_ITEMS.filter((it) => it.bagian === bagianNum);
    if (bagianNum === 1) {
      if (isFacilityLocked) {
        showToast(
          getLockToastMessage(currentPatientLock.submission?.status || pjVerification.status),
          3500
        );
        return;
      }
      const nextFac: Record<string, boolean> = {};
      items.forEach((it) => {
        nextFac[it.code] = checked;
      });
      setFacilityStatuses((prev) => ({ ...prev, ...nextFac }));
      showToast(
        checked
          ? 'Seluruh checklist Bagian I ditandai DILAKSANAKAN.'
          : 'Checklist Bagian I direset ke Belum Dilaksanakan.'
      );
      return;
    }

    if (managedPatients.length === 0) return;
    if (isCurrentPatientLocked) {
      showToast(getLockToastMessage(currentPatientLock.submission?.status), 3500);
      return;
    }
    const patId = activePatient.id;

    const poin3_1AlreadyChosen =
      bagianNum === 3 ? isPoin3_1Complete(activeClinical.poin3_1) : true;

    setPatientStatuses((prev) => {
      const patChecks = { ...(prev[patId] || {}) };
      items.forEach((it) => {
        if (bagianNum === 3 && it.code === '3.1' && checked && !poin3_1AlreadyChosen) {
          patChecks[it.code] = false;
        } else {
          patChecks[it.code] = checked;
        }
      });
      return {
        ...prev,
        [patId]: patChecks
      };
    });

    if (bagianNum === 2) {
      setPatientClinicalDetails((prev) => ({
        ...prev,
        [patId]: {
          ...normalizePatientClinicalDetails(prev[patId]),
          poin2_1: setAllPoin2_1(checked)
        }
      }));
    }

    if (bagianNum === 3 && !checked) {
      const freshBagian3 = createDefaultPatientClinicalDetails('new');
      setPatientClinicalDetails((prev) => {
        const existing = normalizePatientClinicalDetails(prev[patId]);
        return {
          ...prev,
          [patId]: {
            ...existing,
            poin3_1: freshBagian3.poin3_1,
            poin3_2: freshBagian3.poin3_2,
            poin3_3: freshBagian3.poin3_3,
            poin3_5: freshBagian3.poin3_5,
            poin3_6: freshBagian3.poin3_6
          }
        };
      });
      setPatientNotes((prev) => ({
        ...prev,
        [patId]: {
          ...(prev[patId] || {}),
          '3.1': '',
          '3.2': '',
          '3.3': '',
          '3.5': '',
          '3.6': ''
        }
      }));
    }

    if (bagianNum === 4) {
      if (!checked) {
        setPatientClinicalDetails((prev) => ({
          ...prev,
          [patId]: {
            ...normalizePatientClinicalDetails(prev[patId]),
            poin4_3: createEmptyPoin4_3Data()
          }
        }));
        setPatientNotes((prev) => ({
          ...prev,
          [patId]: {
            ...(prev[patId] || {}),
            '4.3': ''
          }
        }));
      } else if (!isPoin4_3Complete(activeClinical.poin4_3)) {
        const defaultNihil4_3 = { ...createEmptyPoin4_3Data(), tidakAdaKomplikasi: true };
        setPatientClinicalDetails((prev) => ({
          ...prev,
          [patId]: {
            ...normalizePatientClinicalDetails(prev[patId]),
            poin4_3: defaultNihil4_3
          }
        }));
        setPatientNotes((prev) => ({
          ...prev,
          [patId]: {
            ...(prev[patId] || {}),
            '4.3': formatPoin4_3Note(defaultNihil4_3)
          }
        }));
      }
    }

    if (bagianNum === 3 && checked && !poin3_1AlreadyChosen) {
      showToast(
        `Checklist Bagian 3 (${activePatient.bedNumber}) diperbarui. Poin 3.1 akan terisi setelah Status Pelayanan & Kategori Pasien dipilih oleh perawat.`,
        3400
      );
      return;
    }

    showToast(
      checked
        ? `Seluruh checklist Bagian ${bagianNum} (${activePatient.bedNumber}) ditandai DILAKSANAKAN.`
        : `Checklist Bagian ${bagianNum} (${activePatient.bedNumber}) direset ke Belum Dilaksanakan.`
    );
  };

  // Reset checklists ONLY for the currently active patient (Bagian II–VI)
  const handleResetActivePatientChecklists = () => {
    if (!isToday) {
      showToast('Pengisian logbook dibatasi hanya bisa mengisi pada hari yang sama.', 3500);
      return;
    }
    if (isCurrentPatientLocked) {
      showToast(getLockToastMessage(currentPatientLock.submission?.status), 3500);
      return;
    }
    if (!openedPatient) return;

    const patId = openedPatient.id;
    const patientSpoItems = OFFICIAL_LOGBOOK_ITEMS.filter((it) => it.bagian >= 2 && it.bagian <= 6);
    const resetChecks: Record<string, boolean> = {};
    patientSpoItems.forEach((it) => {
      resetChecks[it.code] = false;
    });

    const freshClin = createDefaultPatientClinicalDetails('new');

    setPatientStatuses((prev) => ({
      ...prev,
      [patId]: resetChecks
    }));
    setPatientClinicalDetails((prev) => ({
      ...prev,
      [patId]: freshClin
    }));
    setPatientNotes((prev) => ({
      ...prev,
      [patId]: {}
    }));

    setPatientSubmissions((prev) => {
      const existing = prev[patId];
      if (!existing || existing.status !== 'belum_diajukan') return prev;
      return {
        ...prev,
        [patId]: {
          ...existing,
          declarationChecked: false
        }
      };
    });

    showToast(
      `Checklist Bagian II–VI untuk pasien ${openedPatient.patientName || openedPatient.bedNumber} telah direset.`
    );
  };

  // Bed options derived from Master Data (if available) + fallback
  const baseBedOptions = React.useMemo(() => {
    return masterBeds.length > 0
      ? masterBeds.map((b) => b.bedNumber)
      : [
          ...Array.from({ length: 12 }, (_, i) => `BED A${String(i + 1).padStart(2, '0')}`),
          ...Array.from({ length: 9 }, (_, i) => `BED B${String(i + 1).padStart(2, '0')}`),
          ...Array.from({ length: 8 }, (_, i) => `BED C${String(i + 1).padStart(2, '0')}`),
          ...Array.from({ length: 3 }, (_, i) => `BED D${String(i + 1).padStart(2, '0')}`),
          ...Array.from({ length: 2 }, (_, i) => `BED E${String(i + 1).padStart(2, '0')}`),
          ...Array.from({ length: 2 }, (_, i) => `BED F${String(i + 1).padStart(2, '0')}`),
          ...Array.from({ length: 4 }, (_, i) => `BED ISOLASI ${String(i + 1).padStart(2, '0')}`)
        ];
  }, [masterBeds]);

  const availableBedOptions = React.useMemo(() => {
    if (activePatient.bedNumber && !baseBedOptions.includes(activePatient.bedNumber)) {
      return [activePatient.bedNumber, ...baseBedOptions];
    }
    return baseBedOptions;
  }, [baseBedOptions, activePatient.bedNumber]);

  // Stats computation
  const getBagianItems = (bagianNum: number) => {
    return OFFICIAL_LOGBOOK_ITEMS.filter((it) => it.bagian === bagianNum);
  };

  const getPatientBagianStats = (bagianNum: number, patientId: string) => {
    const items = getBagianItems(bagianNum);
    const checks = patientStatuses[patientId] || {};
    const total = items.length;
    const completed = items.filter((it) => Boolean(checks[it.code])).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pct, items };
  };

  const getFacilityBagianStats = () => {
    const items = getBagianItems(1);
    const total = items.length;
    const completed = items.filter((it) => Boolean(facilityStatuses[it.code])).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pct, items };
  };

  const getSinglePatientOverallStats = React.useCallback(
    (patientId: string) => {
      const fac = getFacilityBagianStats();
      const b2 = getPatientBagianStats(2, patientId);
      const b3 = getPatientBagianStats(3, patientId);
      const b4 = getPatientBagianStats(4, patientId);
      const b5 = getPatientBagianStats(5, patientId);
      const b6 = getPatientBagianStats(6, patientId);
      const patOnlyTotal = b2.total + b3.total + b4.total + b5.total + b6.total;
      const patOnlyCompleted =
        b2.completed + b3.completed + b4.completed + b5.completed + b6.completed;
      const total = fac.total + patOnlyTotal;
      const completed = fac.completed + patOnlyCompleted;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      return {
        facility: fac,
        b2,
        b3,
        b4,
        b5,
        b6,
        patOnlyTotal,
        patOnlyCompleted,
        total,
        completed,
        pct
      };
    },
    [facilityStatuses, patientStatuses]
  );

  const activePatientOverallStats = React.useMemo(
    () => getSinglePatientOverallStats(activePatient.id),
    [getSinglePatientOverallStats, activePatient.id]
  );

  const overallShiftStats = React.useMemo(() => {
    const fac = getFacilityBagianStats();
    let total = fac.total;
    let completed = fac.completed;

    const perPatient = managedPatients.map((pat) => {
      const single = getSinglePatientOverallStats(pat.id);
      total += single.patOnlyTotal;
      completed += single.patOnlyCompleted;
      return {
        patient: pat,
        b2: single.b2,
        b3: single.b3,
        b4: single.b4,
        b5: single.b5,
        b6: single.b6,
        total: single.total,
        completed: single.completed,
        pct: single.pct
      };
    });

    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { facility: fac, perPatient, total, completed, pct };
  }, [facilityStatuses, patientStatuses, managedPatients, getSinglePatientOverallStats]);

  // Options for PJ Shift & Kepala Ruang selectors in Bagian VII
  const pjShiftOptions = React.useMemo(() => {
    const list: { name: string; nip: string; shift?: string }[] = [];
    const addUnique = (name: string, nip: string, shift?: string) => {
      if (name && name !== '-' && !list.some((item) => isMatchingNurse(item.name, name))) {
        list.push({ name, nip: nip || '-', shift });
      }
    };
    addUnique(defaultPjShiftNurse.name, defaultPjShiftNurse.nip);
    masterNurses
      .filter(
        (n) =>
          (n.role === 'pj_shift' || n.systemAccess === 'pj_shift') && n.accountStatus !== 'nonaktif'
      )
      .forEach((n) => addUnique(n.name, n.nip, n.shiftAssigned));
    return list;
  }, [defaultPjShiftNurse, masterNurses]);

  const kepalaRuangOptions = React.useMemo(() => {
    const list: { name: string; nip: string }[] = [];
    const addUnique = (name: string, nip: string) => {
      if (name && name !== '-' && !list.some((item) => isMatchingNurse(item.name, name))) {
        list.push({ name, nip: nip || '-' });
      }
    };
    addUnique(defaultKaruNurse.name, defaultKaruNurse.nip);
    masterNurses
      .filter(
        (n) =>
          (n.role === 'kepala_ruangan' || n.systemAccess === 'kepala_ruangan') &&
          n.accountStatus !== 'nonaktif'
      )
      .forEach((n) => addUnique(n.name, n.nip));
    return list;
  }, [defaultKaruNurse, masterNurses]);

  // Options for Poin 3.6 Vascular Access Performer Nurse (Perawat Pelaksana, PJ Shift, & Kepala Ruang)
  const vascularAccessOtherNurseOptions = React.useMemo(() => {
    const list: { name: string; roleLabel: string }[] = [];
    const addOther = (name?: string, role?: string) => {
      if (!name || name === '-' || isMatchingNurse(name, currentNurse.name)) return;
      if (list.some((item) => isMatchingNurse(item.name, name))) return;
      const roleLabel =
        role === 'kepala_ruangan'
          ? 'Kepala Ruang'
          : role === 'pj_shift'
          ? 'PJ Shift'
          : 'Perawat Pelaksana';
      list.push({ name: name.trim(), roleLabel });
    };

    masterNurses
      .filter((n) => n.accountStatus !== 'nonaktif' && n.systemAccess !== 'administrator')
      .forEach((n) => addOther(n.name, n.systemAccess || n.role));

    if (shiftInfo?.pjShift && shiftInfo.pjShift !== '-') {
      addOther(shiftInfo.pjShift, 'pj_shift');
    }
    if (shiftInfo?.kepalaRuangan && shiftInfo.kepalaRuangan !== '-') {
      addOther(shiftInfo.kepalaRuangan, 'kepala_ruangan');
    }

    const currentAssigned = activeClinical.poin3_6.vascularAccessNurse?.trim();
    if (currentAssigned && !isMatchingNurse(currentAssigned, currentNurse.name)) {
      addOther(currentAssigned, 'perawat_pelaksana');
    }

    return list;
  }, [masterNurses, currentNurse.name, shiftInfo?.pjShift, shiftInfo?.kepalaRuangan, activeClinical.poin3_6.vascularAccessNurse]);

  const selectedPoin3_6OtherNurse = React.useMemo(() => {
    const raw = activeClinical.poin3_6.vascularAccessNurse?.trim() || '';
    if (!raw || isMatchingNurse(raw, currentNurse.name)) return '';
    return (
      vascularAccessOtherNurseOptions.find((opt) => isMatchingNurse(opt.name, raw))?.name || raw
    );
  }, [activeClinical.poin3_6.vascularAccessNurse, currentNurse.name, vascularAccessOtherNurseOptions]);

  const formatNowWib = () => {
    return formatCurrentWibTimestamp(activeDate);
  };


  // Sync submitted, verified, and revision-requested patients to Verification Registry & App Sessions
  const syncSubmittedPatientsToRegistryAndSessions = (
    patientsList: ManagedPatient[],
    submissionsMap: Record<string, PjVerificationSubmission>,
    headerSubReference: PjVerificationSubmission
  ) => {
    const trackedPatients = patientsList.filter((p) => {
      const eff = getEffectivePatientSubmission(p, submissionsMap);
      return (
        eff.status === 'diajukan' ||
        eff.status === 'terverifikasi' ||
        eff.revisionRequested ||
        Boolean(eff.verifierNotes?.trim())
      );
    });

    const perPatientStatuses: Record<
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
      }
    > = {};

    let hasDiajukan = false;
    let hasTerverifikasi = false;
    let hasRevision = false;

    patientsList.forEach((p) => {
      const eff = getEffectivePatientSubmission(p, submissionsMap);
      if (eff.status === 'diajukan') hasDiajukan = true;
      if (eff.status === 'terverifikasi') hasTerverifikasi = true;
      if (
        eff.status === 'belum_diajukan' &&
        (eff.revisionRequested || Boolean(eff.verifierNotes?.trim()))
      ) {
        hasRevision = true;
      }
      perPatientStatuses[p.id] = {
        status: eff.status,
        submittedAt: eff.submittedAt,
        submittedEpoch: eff.submittedEpoch,
        verifiedAt: eff.verifiedAt,
        verifiedBy: eff.verifiedBy,
        verifiedByRole: eff.verifiedByRole,
        verifierNotes: eff.verifierNotes,
        revisionRequested: eff.revisionRequested,
        revisionRequestedAt: eff.revisionRequestedAt,
        revisionRequestedBy: eff.revisionRequestedBy,
        revisionRequestedByRole: eff.revisionRequestedByRole,
        revisionEpoch: eff.revisionEpoch
      };
    });

    const allTrackedVerified =
      trackedPatients.length > 0 &&
      trackedPatients.every((p) => getEffectivePatientSubmission(p, submissionsMap).status === 'terverifikasi');

    const aggregateStatus: PjVerificationStatus =
      trackedPatients.length === 0
        ? 'belum_diajukan'
        : allTrackedVerified
        ? 'terverifikasi'
        : hasDiajukan || hasTerverifikasi
        ? 'diajukan'
        : 'belum_diajukan';

    const facStats = getFacilityBagianStats();
    const resolvedTargetRole: 'pj_shift' | 'kepala_ruangan' =
      activeRole === 'perawat_pelaksana'
        ? 'pj_shift'
        : headerSubReference.targetRole === 'pj_shift'
        ? 'pj_shift'
        : 'kepala_ruangan';

    upsertVerificationRegistryEntry({
      id: `sub-${activeRole}-${getNurseStorageKey(currentNurse.name)}-${activeDateIso}-${activeShift}`,
      submittedNurseName: currentNurse.name,
      submittedNurseNip: currentNurse.nip,
      submittedNurseRole: activeRole,
      targetRole: resolvedTargetRole,
      targetVerifierName:
        headerSubReference.targetVerifierName || defaultTargetVerifier.name || defaultPjShiftNurse.name,
      targetVerifierNip: headerSubReference.targetVerifierNip || defaultTargetVerifier.nip,
      status: aggregateStatus,
      shift: activeShift,
      dateKey: activeDateIso,
      dateLabel: activeDate,
      submittedAt: headerSubReference.submittedAt || formatNowWib(),
      submittedEpoch: headerSubReference.submittedEpoch,
      verifiedAt: aggregateStatus === 'terverifikasi' ? headerSubReference.verifiedAt : undefined,
      verifiedBy: aggregateStatus === 'terverifikasi' ? headerSubReference.verifiedBy : undefined,
      verifiedByRole:
        aggregateStatus === 'terverifikasi' ? headerSubReference.verifiedByRole : undefined,
      pelaksanaNotes: headerSubReference.notes || '',
      verifierNotes:
        aggregateStatus === 'terverifikasi' || hasRevision
          ? headerSubReference.verifierNotes || ''
          : '',
      revisionRequested: aggregateStatus === 'belum_diajukan' && hasRevision,
      facilityCompleted: facStats.completed,
      facilityTotal: facStats.total,
      patients: trackedPatients.map((p) => {
        const eff = getEffectivePatientSubmission(p, submissionsMap);
        return {
          id: p.id,
          bedNumber: p.bedNumber,
          patientName: p.patientName,
          medicalRecord: p.medicalRecord,
          status: eff.status,
          submittedAt: eff.submittedAt,
          submittedEpoch: eff.submittedEpoch,
          verifiedAt: eff.verifiedAt,
          verifiedBy: eff.verifiedBy,
          verifiedByRole: eff.verifiedByRole,
          verifierNotes: eff.verifierNotes,
          revisionRequested: eff.revisionRequested,
          revisionRequestedAt: eff.revisionRequestedAt,
          revisionRequestedBy: eff.revisionRequestedBy,
          revisionRequestedByRole: eff.revisionRequestedByRole,
          revisionEpoch: eff.revisionEpoch
        };
      })
    });

    if (onSyncNurseSessions) {
      onSyncNurseSessions(currentNurse.name, patientsList, {
        status: aggregateStatus,
        date: activeDate,
        sessionDate: activeDateIso,
        shift: activeShift,
        clinicalDetails: patientClinicalDetails,
        patientStatuses,
        perPatientStatuses
      });
    }

    try {
      window.dispatchEvent(new CustomEvent('logbook_sessions_updated'));
    } catch {
      // ignore
    }
  };

  // Auto-sync all managed patients and their latest clinical details to App sessions
  useEffect(() => {
    if (!currentNurse.name || currentNurse.name === '-' || !onSyncNurseSessions) return;
    if (!isToday) return;

    const timer = setTimeout(() => {
      const perPatientStatuses: Record<
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
        }
      > = {};

      managedPatients.forEach((p) => {
        const eff = getEffectivePatientSubmission(p, patientSubmissions);
        perPatientStatuses[p.id] = {
          status: eff.status,
          submittedAt: eff.submittedAt,
          submittedEpoch: eff.submittedEpoch,
          verifiedAt: eff.verifiedAt,
          verifiedBy: eff.verifiedBy,
          verifiedByRole: eff.verifiedByRole,
          verifierNotes: eff.verifierNotes,
          revisionRequested: eff.revisionRequested,
          revisionRequestedAt: eff.revisionRequestedAt,
          revisionRequestedBy: eff.revisionRequestedBy,
          revisionRequestedByRole: eff.revisionRequestedByRole,
          revisionEpoch: eff.revisionEpoch
        };
      });

      const hasDiajukan = managedPatients.some(
        (p) => getEffectivePatientSubmission(p, patientSubmissions).status === 'diajukan'
      );
      const allTerverifikasi =
        managedPatients.length > 0 &&
        managedPatients.every(
          (p) => getEffectivePatientSubmission(p, patientSubmissions).status === 'terverifikasi'
        );
      const aggStatus: PjVerificationStatus = allTerverifikasi
        ? 'terverifikasi'
        : hasDiajukan
        ? 'diajukan'
        : pjVerification.status || 'belum_diajukan';

      onSyncNurseSessions(currentNurse.name, managedPatients, {
        status: aggStatus,
        date: activeDate,
        sessionDate: activeDateIso,
        shift: activeShift,
        clinicalDetails: patientClinicalDetails,
        patientStatuses,
        perPatientStatuses
      });

      try {
        window.dispatchEvent(new CustomEvent('logbook_sessions_updated'));
      } catch {
        // ignore
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [
    currentNurse.name,
    managedPatients,
    patientClinicalDetails,
    patientStatuses,
    patientSubmissions,
    pjVerification.status,
    activeShift,
    activeDate,
    activeDateIso,
    isToday,
    onSyncNurseSessions,
    getEffectivePatientSubmission
  ]);

  const handleRemovePatient = (idToRemove: string) => {
    if (!isToday) {
      showToast('Pengisian logbook dibatasi hanya bisa mengisi pada hari yang sama.', 3500);
      return;
    }
    const patLock = getPatientLockStatus(idToRemove);
    if (patLock.isLocked) {
      showToast(getLockToastMessage(patLock.submission?.status), 4000);
      return;
    }
    const targetPat = managedPatients.find((p) => p.id === idToRemove);
    const nextList = managedPatients.filter((p) => p.id !== idToRemove);
    const nextSubs = { ...patientSubmissions };
    delete nextSubs[idToRemove];

    if (openedPatientId === idToRemove) {
      setOpenedPatientId(null);
      setSelectedBagian(null);
    }

    setManagedPatients(nextList);
    setPatientSubmissions(nextSubs);

    if (targetPat) {
      try {
        const rawPerPat = localStorage.getItem(PER_PATIENT_STATUS_STORAGE_KEY);
        if (rawPerPat) {
          const perPat = JSON.parse(rawPerPat);
          if (perPat && typeof perPat === 'object') {
            const k1 = buildPatientVerificationKey(
              currentNurse.name,
              targetPat.bedNumber,
              targetPat.medicalRecord,
              activeDateIso
            );
            const k2 = buildPatientVerificationKey(
              currentNurse.name,
              targetPat.bedNumber,
              targetPat.medicalRecord
            );
            const k3 = buildPatientVerificationKey(currentNurse.name, targetPat.bedNumber, '0');
            delete perPat[k1];
            delete perPat[k2];
            delete perPat[k3];
            localStorage.setItem(PER_PATIENT_STATUS_STORAGE_KEY, JSON.stringify(perPat));
          }
        }
      } catch {
        // ignore
      }
    }

    try {
      localStorage.setItem(managedPatientsStorageKey, JSON.stringify(nextList));
      localStorage.setItem(patientSubmissionsStorageKey, JSON.stringify(nextSubs));
      touchNurseDailyStorage(currentNurse.name);
    } catch {
      // ignore
    }

    saveNurseLogbookCloud(currentNurse.name, {
      nurseName: currentNurse.name,
      managedPatients: nextList,
      clinicalDetails: patientClinicalDetails,
      facilityStatuses,
      facilityNotes,
      patientStatuses,
      patientNotes,
      submission: pjVerification,
      patientSubmissions: nextSubs,
      shiftSchedule: { shift: activeShift, date: activeDate },
      dateIso: activeDateIso,
      logbookDate: activeDate
    });

    syncSubmittedPatientsToRegistryAndSessions(nextList, nextSubs, pjVerification);
    showToast('Pasien telah dihapus dari daftar logbook shift ini.');
  };

  const handleSubmitVerification = () => {
    if (!isToday) {
      showToast('Pengajuan verifikasi hanya dapat dilakukan pada hari yang sama.', 3500);
      return;
    }
    if (!openedPatient) {
      showToast('Pilih pasien terlebih dahulu sebelum mengajukan verifikasi.', 3000);
      return;
    }
    if (!openedPatient.patientName.trim()) {
      showToast('Lengkapi nama pasien terlebih dahulu.', 3000);
      return;
    }
    if (!activePatientSubmission.declarationChecked) {
      showToast('Harap centang pernyataan kelengkapan pengisian SPO pasien ini terlebih dahulu.');
      return;
    }

    const timestamp = formatNowWib();
    const nowEpoch = Date.now();
    const resolvedTargetRole: 'pj_shift' | 'kepala_ruangan' =
      activeRole === 'perawat_pelaksana'
        ? 'pj_shift'
        : activePatientSubmission.targetRole === 'pj_shift'
        ? 'pj_shift'
        : 'kepala_ruangan';

    const cleanVerifierCandidate =
      activePatientSubmission.targetVerifierName &&
      activePatientSubmission.targetVerifierName !== '-'
        ? activePatientSubmission.targetVerifierName
        : '';

    const resolvedTargetName =
      resolvedTargetRole === 'kepala_ruangan'
        ? activeRole === 'kepala_ruangan'
          ? currentNurse.name
          : cleanVerifierCandidate || defaultKaruNurse.name
        : activeRole === 'pj_shift'
        ? cleanVerifierCandidate && !isMatchingNurse(cleanVerifierCandidate, currentNurse.name)
          ? cleanVerifierCandidate
          : defaultOtherPjShiftNurse.name
        : cleanVerifierCandidate || defaultPjShiftNurse.name;

    if (!resolvedTargetName || resolvedTargetName === '-') {
      if (activeRole === 'pj_shift' && resolvedTargetRole === 'pj_shift') {
        showToast(
          'Belum ada akun PJ Shift lainnya yang terdaftar di Data Perawat. Pilih tujuan Kepala Ruang atau tambahkan akun PJ Shift lain terlebih dahulu.',
          3600
        );
      } else if (resolvedTargetRole === 'kepala_ruangan') {
        showToast(
          'Belum ada akun Kepala Ruang yang terdaftar di Data Perawat. Tambahkan akun Kepala Ruang atau pilih tujuan PJ Shift lainnya.',
          3600
        );
      } else {
        showToast(
          'Belum ada akun PJ Shift yang terdaftar di Data Perawat. Tambahkan akun PJ Shift melalui Administrator terlebih dahulu.',
          3600
        );
      }
      return;
    }

    if (
      activeRole === 'pj_shift' &&
      resolvedTargetRole === 'pj_shift' &&
      isMatchingNurse(resolvedTargetName, currentNurse.name)
    ) {
      showToast(
        'PJ Shift tidak dapat mengajukan verifikasi kepada diri sendiri. Silakan pilih PJ Shift lainnya atau Kepala Ruang.',
        3500
      );
      return;
    }

    const resolvedTargetNip =
      resolvedTargetRole === 'kepala_ruangan'
        ? activeRole === 'kepala_ruangan'
          ? currentNurse.nip
          : activePatientSubmission.targetVerifierNip &&
            activePatientSubmission.targetVerifierNip !== '-'
          ? activePatientSubmission.targetVerifierNip
          : defaultKaruNurse.nip
        : activeRole === 'pj_shift'
        ? otherPjShiftOptions.find((opt) => isMatchingNurse(opt.name, resolvedTargetName))?.nip ||
          defaultOtherPjShiftNurse.nip
        : activePatientSubmission.targetVerifierNip &&
          activePatientSubmission.targetVerifierNip !== '-'
        ? activePatientSubmission.targetVerifierNip
        : defaultPjShiftNurse.nip;

    const submittedPatient = openedPatient;

    const updatedPatSub: PjVerificationSubmission = {
      ...activePatientSubmission,
      submittedNurseName: currentNurse.name,
      submittedNurseNip: currentNurse.nip,
      submittedNurseRole: activeRole,
      targetRole: resolvedTargetRole,
      targetVerifierName: resolvedTargetName,
      targetVerifierNip: resolvedTargetNip,
      pjShiftName:
        resolvedTargetRole === 'pj_shift' ? resolvedTargetName : defaultPjShiftNurse.name,
      status: 'diajukan',
      submittedAt: timestamp,
      submittedEpoch: nowEpoch,
      verifiedAt: '',
      verifiedBy: '',
      verifiedByRole: '',
      verifierNotes: '',
      revisionRequested: false,
      revisionRequestedAt: '',
      revisionRequestedBy: '',
      revisionRequestedByRole: '',
      revisionEpoch: 0
    };

    const nextSubmissionsMap = {
      ...patientSubmissions,
      [submittedPatient.id]: updatedPatSub
    };
    setPatientSubmissions(nextSubmissionsMap);
    setPjVerification(updatedPatSub);

    try {
      localStorage.setItem(patientSubmissionsStorageKey, JSON.stringify(nextSubmissionsMap));
      localStorage.setItem(submissionStorageKey, JSON.stringify(updatedPatSub));
      touchNurseDailyStorage(currentNurse.name);
    } catch {
      // ignore
    }

    // Update PER_PATIENT_STATUS_STORAGE_KEY strictly for this submitted patient without touching already-verified patients
    try {
      const rawPerPat = localStorage.getItem(PER_PATIENT_STATUS_STORAGE_KEY);
      const perPat = rawPerPat ? JSON.parse(rawPerPat) : {};
      if (perPat && typeof perPat === 'object') {
        const kDated = buildPatientVerificationKey(
          currentNurse.name,
          submittedPatient.bedNumber,
          submittedPatient.medicalRecord,
          activeDateIso
        );
        const kUndated = buildPatientVerificationKey(
          currentNurse.name,
          submittedPatient.bedNumber,
          submittedPatient.medicalRecord
        );
        const kZeroDated = buildPatientVerificationKey(
          currentNurse.name,
          submittedPatient.bedNumber,
          '0',
          activeDateIso
        );
        const kZero = buildPatientVerificationKey(
          currentNurse.name,
          submittedPatient.bedNumber,
          '0'
        );
        delete perPat[kDated];
        delete perPat[kUndated];
        delete perPat[kZeroDated];
        delete perPat[kZero];
        perPat[kDated] = {
          status: 'diajukan',
          submittedAt: timestamp,
          submittedEpoch: nowEpoch,
          revisionRequested: false,
          revisionEpoch: 0,
          verifierNotes: ''
        };
        perPat[kUndated] = {
          status: 'diajukan',
          submittedAt: timestamp,
          submittedEpoch: nowEpoch,
          revisionRequested: false,
          revisionEpoch: 0,
          verifierNotes: ''
        };
        localStorage.setItem(PER_PATIENT_STATUS_STORAGE_KEY, JSON.stringify(perPat));
      }
    } catch {
      // ignore
    }

    saveNurseLogbookCloud(currentNurse.name, {
      nurseName: currentNurse.name,
      managedPatients,
      clinicalDetails: patientClinicalDetails,
      facilityStatuses,
      facilityNotes,
      patientStatuses,
      patientNotes,
      submission: updatedPatSub,
      patientSubmissions: nextSubmissionsMap,
      shiftSchedule: { shift: activeShift, date: activeDate },
      dateIso: getCurrentIsoDateWib(),
      logbookDate: activeDate
    });

    syncSubmittedPatientsToRegistryAndSessions(managedPatients, nextSubmissionsMap, updatedPatSub);

    // Otomatis langsung kembali ke halaman utama Logbook setelah pengajuan verifikasi berhasil
    setSelectedBagian(null);
    setOpenedPatientId(null);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (resolvedTargetRole === 'kepala_ruangan') {
      showToast(
        `Logbook pasien ${submittedPatient.patientName} berhasil diajukan ke Kepala Ruang (${resolvedTargetName}) dan dikunci selama menunggu verifikasi.`,
        3400
      );
    } else {
      showToast(
        activeRole === 'pj_shift'
          ? `Logbook pasien ${submittedPatient.patientName} berhasil diajukan ke PJ Shift lainnya (${resolvedTargetName}) dan dikunci selama menunggu verifikasi.`
          : `Logbook pasien ${submittedPatient.patientName} berhasil diajukan ke PJ Shift (${resolvedTargetName}) dan dikunci selama menunggu verifikasi.`,
        3400
      );
    }
  };

  const bagian7RoleTitle =
    activeRole === 'pj_shift'
      ? 'Pengajuan Verifikasi Logbook Pasien ke Kepala Ruang / PJ Shift Lainnya'
      : activeRole === 'kepala_ruangan'
      ? 'Pengajuan Verifikasi Logbook Pasien ke PJ Shift / Kepala Ruang'
      : 'Pengajuan Verifikasi Logbook Pasien kepada PJ Shift';

  const bagian7RoleSubtitle =
    activeRole === 'pj_shift'
      ? 'Pemeriksaan kelengkapan SPO Bagian I–VI pasien ini dan pengajuan verifikasi kepada Kepala Ruang atau PJ Shift lainnya.'
      : activeRole === 'kepala_ruangan'
      ? 'Pemeriksaan kelengkapan SPO Bagian I–VI pasien ini dan pengajuan verifikasi kepada PJ Shift atau Kepala Ruang.'
      : 'Pemeriksaan kelengkapan SPO Bagian I–VI pasien ini dan pengajuan verifikasi kepada PJ Shift.';

  const targetVerifierLabel =
    activePatientSubmission.targetRole === 'kepala_ruangan' ||
    activePatientSubmission.targetRole === 'mandiri'
      ? `Kepala Ruang: ${activePatientSubmission.targetVerifierName || defaultKaruNurse.name}`
      : activeRole === 'pj_shift'
      ? `PJ Shift Lainnya: ${activePatientSubmission.targetVerifierName || defaultOtherPjShiftNurse.name}`
      : `PJ Shift: ${activePatientSubmission.targetVerifierName || defaultPjShiftNurse.name}`;

  const activeMeta = selectedBagian ? BAGIAN_METAS.find((m) => m.num === selectedBagian) : null;
  const poin2_1Counts = getPoin2_1Counts(activeClinical.poin2_1);
  const poin3_2Metrics = computeWeightMetrics(activeClinical.poin3_2);
  const poin3_3Parsed = parsePreBpInput(activeClinical.poin3_3.tdPreHd || '');
  const activePoin4_3Complications = getActivePoin4_3Complications(activeClinical.poin4_3);

  // Remaining scheduled patients not yet added to managedPatients AND not claimed by any other nurse
  const unselectedScheduledPatients = React.useMemo(() => {
    return scheduledMasterPatients.filter(
      (mp) =>
        !managedPatients.some((p) =>
          isSamePatientIdentity(
            { patientName: p.patientName, medicalRecord: p.medicalRecord },
            { patientName: mp.patientName, medicalRecord: mp.medicalRecordNumber }
          )
        ) &&
        !occupiedAssets.findPatientClaimedByOther({
          patientName: mp.patientName,
          medicalRecord: mp.medicalRecordNumber
        })
    );
  }, [scheduledMasterPatients, managedPatients, occupiedAssets]);

  // Scheduled patients already inputted into another nurse's logbook (shown as disabled/locked)
  const claimedScheduledPatients = React.useMemo(() => {
    return scheduledMasterPatients
      .filter(
        (mp) =>
          !managedPatients.some((p) =>
            isSamePatientIdentity(
              { patientName: p.patientName, medicalRecord: p.medicalRecord },
              { patientName: mp.patientName, medicalRecord: mp.medicalRecordNumber }
            )
          )
      )
      .map((mp) => {
        const owner = occupiedAssets.findPatientClaimedByOther({
          patientName: mp.patientName,
          medicalRecord: mp.medicalRecordNumber
        });
        return owner ? { master: mp, owner } : null;
      })
      .filter(
        (
          item
        ): item is {
          master: MasterPatient;
          owner: NonNullable<ReturnType<typeof occupiedAssets.findPatientClaimedByOther>>;
        } => Boolean(item)
      );
  }, [scheduledMasterPatients, managedPatients, occupiedAssets]);

  // Other registered master patients (outside active shift schedule) not yet added or claimed by other nurses
  const unselectedOtherMasterPatients = React.useMemo(() => {
    const scheduledIds = new Set(scheduledMasterPatients.map((mp) => mp.id));
    return masterPatients.filter(
      (mp) =>
        !scheduledIds.has(mp.id) &&
        !managedPatients.some((p) =>
          isSamePatientIdentity(
            { patientName: p.patientName, medicalRecord: p.medicalRecord },
            { patientName: mp.patientName, medicalRecord: mp.medicalRecordNumber }
          )
        ) &&
        !occupiedAssets.findPatientClaimedByOther({
          patientName: mp.patientName,
          medicalRecord: mp.medicalRecordNumber
        })
    );
  }, [masterPatients, scheduledMasterPatients, managedPatients, occupiedAssets]);

  const claimedOtherMasterPatients = React.useMemo(() => {
    const scheduledIds = new Set(scheduledMasterPatients.map((mp) => mp.id));
    const q = rescheduleSearchQuery.trim().toLowerCase();
    return masterPatients
      .filter(
        (mp) =>
          !scheduledIds.has(mp.id) &&
          !managedPatients.some((p) =>
            isSamePatientIdentity(
              { patientName: p.patientName, medicalRecord: p.medicalRecord },
              { patientName: mp.patientName, medicalRecord: mp.medicalRecordNumber }
            )
          )
      )
      .map((mp) => {
        const owner = occupiedAssets.findPatientClaimedByOther({
          patientName: mp.patientName,
          medicalRecord: mp.medicalRecordNumber
        });
        if (!owner) return null;
        if (q) {
          const sched = getMasterPatientScheduleLabel(mp).toLowerCase();
          const matchesQ =
            mp.patientName.toLowerCase().includes(q) ||
            (mp.medicalRecordNumber || '').toLowerCase().includes(q) ||
            sched.includes(q);
          if (!matchesQ) return null;
        }
        return { master: mp, owner };
      })
      .filter(
        (
          item
        ): item is {
          master: MasterPatient;
          owner: NonNullable<ReturnType<typeof occupiedAssets.findPatientClaimedByOther>>;
        } => Boolean(item)
      );
  }, [
    masterPatients,
    scheduledMasterPatients,
    managedPatients,
    occupiedAssets,
    rescheduleSearchQuery,
    getMasterPatientScheduleLabel
  ]);

  const filteredReschedulePatients = React.useMemo(() => {
    const q = rescheduleSearchQuery.trim().toLowerCase();
    if (!q) return unselectedOtherMasterPatients;
    return unselectedOtherMasterPatients.filter((mp) => {
      const sched = getMasterPatientScheduleLabel(mp).toLowerCase();
      return (
        mp.patientName.toLowerCase().includes(q) ||
        (mp.medicalRecordNumber || '').toLowerCase().includes(q) ||
        sched.includes(q)
      );
    });
  }, [unselectedOtherMasterPatients, rescheduleSearchQuery, getMasterPatientScheduleLabel]);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#0e7876] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 border border-white/30">
          <CheckCircle2 className="w-4 h-4 text-emerald-100 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BANNER PERINGATAN: PENGISIAN LOGBOOK DIBATASI HANYA PADA HARI YANG SAMA    */}
      {/* ========================================================================= */}
      {!isToday && (
        <div className="rounded-[14px] bg-amber-500/12 border-2 border-amber-500/40 p-4 sm:p-4.5 text-amber-950 flex flex-col md:flex-row md:items-center justify-between gap-3.5 shadow-sm">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 rounded-xl text-amber-800 shrink-0">
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900">
                <span className="bg-amber-200/80 px-2 py-0.5 rounded-md font-extrabold text-amber-950">
                  Mode Hanya-Baca (Read-Only)
                </span>
                <span aria-hidden="true">&middot;</span>
                <span>Tanggal Terpilih: {activeDate}</span>
              </div>
              <p className="text-xs sm:text-[13px] font-medium text-amber-900 leading-relaxed">
                Pengisian logbook dibatasi <strong>hanya bisa mengisi pada hari yang sama</strong> (Hari ini:{' '}
                <strong className="underline decoration-amber-600 underline-offset-2">{todayIndonesianFull}</strong>). Seluruh tombol pengisian dan checklist pada tanggal ini dinonaktifkan.
              </p>
            </div>
          </div>

          {onResetDateToToday && (
            <button
              type="button"
              onClick={onResetDateToToday}
              className="px-4 py-2.5 rounded-xl bg-[#19588f] hover:bg-[#144775] text-white text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer self-start md:self-auto"
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>Kembali ke Hari Ini (Mode Pengisian)</span>
            </button>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAMPILAN DAFTAR PASIEN & KONTROL SHIFT (AKTIF KETIKA WORKSPACE TERTUTUP)  */}
      {/* ========================================================================= */}
      {!(selectedBagian && activeMeta && openedPatient) && (
        <div className="space-y-4 sm:space-y-5">
          {/* ========================================================================= */}
          {/* SECTION HEADER: LOGBOOK + KONTROL SHIFT & RESET                           */}
          {/* ========================================================================= */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-[19px] sm:text-[21px] font-extrabold text-[#1c3144] tracking-tight uppercase">
            LOGBOOK
          </h2>
          <p className="mt-0.5 text-xs text-slate-700 tabular-nums">
            Hari {activeDayName} &middot; Shift {activeShift} (
            {activeShift === 'Siang' ? '14.00–21.00' : '07.00–14.00'} WIB) &middot;{' '}
            {openedPatient ? (
              <>
                Pasien Aktif:{' '}
                <strong className="font-semibold text-slate-950">
                  {openedPatient.patientName} ({openedPatient.bedNumber})
                </strong>{' '}
                &middot; Capaian SPO Pasien:{' '}
                <strong className="font-semibold text-[#19588f]">
                  {activePatientOverallStats.completed}/{activePatientOverallStats.total} (
                  {activePatientOverallStats.pct}%)
                </strong>
              </>
            ) : (
              <>
                Pasien Terinput Shift Ini:{' '}
                <strong className="font-semibold text-slate-950">
                  {managedPatients.length} Pasien
                </strong>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Segmented Shift Selector: Pagi | Siang */}
          <div
            role="group"
            aria-label="Pemilihan Jadwal Shift"
            className="inline-flex items-center gap-1 p-1 bg-white/82 backdrop-blur-xs rounded-xl border border-white/90 shadow-2xs"
          >
            <button
              type="button"
              disabled={!isToday}
              onClick={() => handleSelectShiftSchedule('Pagi')}
              title={
                !isToday
                  ? 'Pengisian logbook dibatasi hanya bisa mengisi pada hari yang sama'
                  : 'Shift Pagi (07.00–14.00)'
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 tabular-nums ${
                !isToday ? 'opacity-60 cursor-not-allowed text-slate-500' : 'cursor-pointer'
              } ${
                activeShift === 'Pagi'
                  ? 'bg-[#19588f] text-white shadow-2xs'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-white/70'
              }`}
            >
              <Sun className="w-3.5 h-3.5 shrink-0" />
              <span>Shift Pagi (07.00–14.00)</span>
            </button>

            <button
              type="button"
              disabled={!isToday}
              onClick={() => handleSelectShiftSchedule('Siang')}
              title={
                !isToday
                  ? 'Pengisian logbook dibatasi hanya bisa mengisi pada hari yang sama'
                  : 'Shift Siang (14.00–21.00)'
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 tabular-nums ${
                !isToday ? 'opacity-60 cursor-not-allowed text-slate-500' : 'cursor-pointer'
              } ${
                activeShift === 'Siang'
                  ? 'bg-[#19588f] text-white shadow-2xs'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-white/70'
              }`}
            >
              <Sunset className="w-3.5 h-3.5 shrink-0" />
              <span>Shift Siang (14.00–21.00)</span>
            </button>
          </div>

          {/* Reset Checklist Pasien Aktif (muncul saat membuka logbook pasien) */}
          {openedPatient && (
            <button
              type="button"
              disabled={!isToday || isCurrentPatientLocked}
              onClick={handleResetActivePatientChecklists}
              className="px-3 py-2 rounded-xl bg-white/82 hover:bg-white text-slate-700 border border-white/90 shadow-2xs text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title={
                !isToday
                  ? 'Pengisian logbook dibatasi hanya bisa mengisi pada hari yang sama'
                  : isCurrentPatientLocked
                  ? getLockToastMessage(currentPatientLock.submission?.status)
                  : `Reset checklist SPO pasien ${openedPatient.patientName}`
              }
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>Reset Checklist Pasien</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ALUR DUA TAHAP:                                                           */}
      {/* TAHAP 1 (!openedPatient): INPUT PASIEN & PILIH NAMA PASIEN                */}
      {/* TAHAP 2 (openedPatient):  ISI LOGBOOK BAGIAN I – VII KHUSUS PASIEN TSB    */}
      {/* ========================================================================= */}
      {!openedPatient ? (
        <div className="space-y-4">
          {/* ========================================================================= */}
          {/* PANEL TIM MEDIS DINAS SHIFT: DOKTER DPJP & DOKTER JAGA RUANGAN (HALAMAN AWAL) */}
          {/* ========================================================================= */}
          <div className="rounded-[14px] bg-white/86 backdrop-blur-xs border border-white/90 shadow-[0_6px_18px_rgba(14,42,74,0.08)] p-4 sm:p-5 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#e8f3fb] text-[#19588f] flex items-center justify-center border border-[#19588f]/20 shrink-0">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[14.5px] sm:text-[15.5px] font-bold text-slate-950">
                      Tim Medis Berdinas Shift {activeShift}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-50 text-blue-900 border border-blue-200">
                      Standby Ruangan & Konsulen DPJP
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Pilihan dokter ini otomatis terdistribusi pada seluruh {managedPatients.length > 0 ? `${managedPatients.length} pasien asuhan Anda` : 'pasien yang diinput'} shift ini, pelaporan komplikasi intra-HD (Poin 4.3), dan lembar cetak logbook resmi.
                  </p>
                </div>
              </div>

              {/* Tombol Sinkron dari Laporan PJ Shift */}
              <button
                type="button"
                onClick={handleSyncDoctorsFromPj}
                disabled={!isToday}
                title="Tarik nama Dokter DPJP & Dokter Jaga yang sudah ditetapkan PJ Shift pada Laporan Harian"
                className="px-3.5 py-2 rounded-xl bg-[#0e7876]/10 hover:bg-[#0e7876]/20 text-[#0e7876] text-xs font-bold border border-[#0e7876]/30 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed self-start sm:self-auto"
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                <span>Sinkronkan dari PJ Shift</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Card 1: Dokter DPJP */}
              <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    Dokter DPJP Unit Hemodialisis
                  </label>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                    Konsulen Nefrologi
                  </span>
                </div>

                <div className="space-y-1">
                  <input
                    type="text"
                    value={selectedDokterDpjp}
                    readOnly={!isToday}
                    disabled={!isToday}
                    onChange={(e) => handleUpdateDokterDpjp(e.target.value)}
                    placeholder="Nama Dokter DPJP Sp.PD-KGH..."
                    className="w-full bg-white text-slate-950 text-xs sm:text-sm font-bold border border-blue-200 focus:border-[#19588f] rounded-xl px-3 py-2 focus:outline-hidden disabled:opacity-65"
                  />
                  <p className="text-[11px] text-slate-500">
                    Penanggung jawab medis instruksi resep HD, target UF Goal & persetujuan klinis.
                  </p>
                </div>

                <div className="space-y-1 pt-0.5">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Pilihan Cepat DPJP:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {dpjpDoctorsList.map((dr) => {
                      const isChosen =
                        selectedDokterDpjp.trim().toLowerCase() === dr.trim().toLowerCase();
                      return (
                        <button
                          key={dr}
                          type="button"
                          disabled={!isToday}
                          onClick={() => handleUpdateDokterDpjp(dr)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer disabled:cursor-not-allowed ${
                            isChosen
                              ? 'bg-[#19588f] text-white border-[#19588f] shadow-2xs font-bold'
                              : 'bg-white hover:bg-blue-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {dr}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Card 2: Dokter Jaga Ruangan */}
              <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    Dokter Jaga Ruangan (Duty Doctor)
                  </label>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-200">
                    Standby Shift {activeShift}
                  </span>
                </div>

                <div className="space-y-1">
                  <input
                    type="text"
                    value={selectedDokterJaga}
                    readOnly={!isToday}
                    disabled={!isToday}
                    onChange={(e) => handleUpdateDokterJaga(e.target.value)}
                    placeholder="Nama Dokter Jaga Ruangan..."
                    className="w-full bg-white text-slate-950 text-xs sm:text-sm font-bold border border-emerald-200 focus:border-[#0e7876] rounded-xl px-3 py-2 focus:outline-hidden disabled:opacity-65"
                  />
                  <p className="text-[11px] text-slate-500">
                    Dokter siaga onsite untuk penanganan kegawatdaruratan, hipotensi & metode TBAK intra-HD.
                  </p>
                </div>

                <div className="space-y-1 pt-0.5">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Pilihan Cepat Dokter Jaga:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {jagaDoctorsList.map((dr) => {
                      const isChosen =
                        selectedDokterJaga.trim().toLowerCase() === dr.trim().toLowerCase();
                      return (
                        <button
                          key={dr}
                          type="button"
                          disabled={!isToday}
                          onClick={() => handleUpdateDokterJaga(dr)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer disabled:cursor-not-allowed ${
                            isChosen
                              ? 'bg-[#0e7876] text-white border-[#0e7876] shadow-2xs font-bold'
                              : 'bg-white hover:bg-emerald-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {dr}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FORMULIR INPUT PASIEN TERJADWAL PADA SHIFT AKTIF */}
          <form
            onSubmit={handleCreatePatientFromForm}
            className="rounded-[14px] bg-white/86 backdrop-blur-xs border border-white/90 shadow-[0_6px_18px_rgba(14,42,74,0.08)] p-4 sm:p-5 space-y-4"
          >
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600 tabular-nums">
                  <span className="font-bold text-[#19588f]">Langkah 1 dari 2</span>
                  <span aria-hidden="true" className="text-slate-300">
                    &middot;
                  </span>
                  <span>
                    Terjadwal Hari {activeDayName} Shift {activeShift}:{' '}
                    <strong className="font-semibold text-slate-900">
                      {scheduledMasterPatients.length} Pasien
                    </strong>
                  </span>
                </div>
                <h3 className="text-[15px] sm:text-base font-bold text-slate-950">
                  Input Pasien ke Logbook Shift {activeShift}
                </h3>
              </div>

              {/* Tombol Berbeda Khusus Menambahkan Pasien Reschedule Di Luar Daftar Shift Ini */}
              <button
                type="button"
                disabled={!isToday || managedPatients.length >= 10}
                onClick={handleOpenRescheduleModal}
                className="px-3.5 py-2.5 rounded-xl bg-[#0e7876] hover:bg-[#0b6361] disabled:opacity-55 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold shadow-2xs transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer self-start"
                title={
                  !isToday
                    ? 'Pengisian logbook dibatasi hanya pada hari yang sama'
                    : `Tambahkan pasien di luar Daftar Pasien Hari ${activeDayName} Shift ${activeShift} (Reschedule Jadwal HD)`
                }
              >
                <CalendarClock className="w-4 h-4 shrink-0" />
                <span>Tambah Pasien Reschedule (Di Luar Shift)</span>
              </button>
            </div>

            {/* Data Pasien Terdaftar — HANYA Menampilkan Daftar Pasien Pada Shift Aktif */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Data Pasien Terdaftar — Daftar Pasien Hari {activeDayName} Shift {activeShift}
              </label>
              <select
                value={draftMasterId}
                disabled={
                  !isToday ||
                  managedPatients.length >= 10 ||
                  unselectedScheduledPatients.length === 0
                }
                onChange={(e) => handlePickDraftMasterPatient(e.target.value)}
                className="w-full bg-slate-50/90 hover:bg-white focus:bg-white disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 text-xs sm:text-sm font-medium border border-slate-300 focus:border-[#19588f] rounded-xl px-3.5 py-2.5 focus:outline-hidden tabular-nums cursor-pointer"
              >
                <option value="">
                  {scheduledMasterPatients.length === 0
                    ? `-- Belum ada pasien terjadwal pada Hari ${activeDayName} Shift ${activeShift} --`
                    : unselectedScheduledPatients.length === 0
                    ? claimedScheduledPatients.length > 0
                      ? `-- Seluruh pasien terjadwal Hari ${activeDayName} Shift ${activeShift} sudah diinput (${claimedScheduledPatients.length} diinput perawat lain) --`
                      : `-- Seluruh pasien terjadwal Hari ${activeDayName} Shift ${activeShift} (${scheduledMasterPatients.length} Pasien) sudah diinput --`
                    : `-- Pilih Pasien Terjadwal Hari ${activeDayName} Shift ${activeShift} (${unselectedScheduledPatients.length} Pasien Tersedia${
                        claimedScheduledPatients.length > 0
                          ? ` · ${claimedScheduledPatients.length} Diinput Perawat Lain`
                          : ''
                      }) --`}
                </option>
                {unselectedScheduledPatients.map((mp) => (
                  <option key={mp.id} value={mp.id}>
                    {mp.patientName} (RM: {mp.medicalRecordNumber})
                  </option>
                ))}
                {claimedScheduledPatients.length > 0 && (
                  <optgroup label="Sudah Diinput Perawat Lain (Tidak Dapat Dipilih)">
                    {claimedScheduledPatients.map(({ master: mp, owner }) => (
                      <option key={mp.id} value={mp.id} disabled>
                        {mp.patientName} (RM: {mp.medicalRecordNumber}) — Sudah diinput:{' '}
                        {owner.nurseName} ({owner.bedNumber})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Kolom Nama Pasien, No. RM, Bed & Tombol Input Pasien Shift */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
              <div className="lg:col-span-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Pasien Shift {activeShift} <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  readOnly={!isToday}
                  disabled={!isToday || managedPatients.length >= 10}
                  value={draftPatientName}
                  onChange={(e) => {
                    setDraftPatientName(e.target.value);
                    if (draftMasterId) setDraftMasterId('');
                  }}
                  placeholder={`Pilih dari daftar Shift ${activeShift} atau ketik nama...`}
                  className="w-full min-h-[40px] bg-white disabled:opacity-60 disabled:cursor-not-allowed text-slate-950 text-xs sm:text-sm font-semibold border border-slate-300 focus:border-[#19588f] rounded-xl px-3.5 py-2 focus:outline-hidden"
                />
              </div>

              <div className="lg:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  No. Rekam Medis (RM)
                </label>
                <input
                  type="text"
                  readOnly={!isToday}
                  disabled={!isToday || managedPatients.length >= 10}
                  value={draftPatientRm}
                  onChange={(e) => setDraftPatientRm(e.target.value)}
                  placeholder="Contoh: 00-12-34"
                  className="w-full min-h-[40px] bg-white disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 text-xs sm:text-sm font-mono font-semibold tabular-nums border border-slate-300 focus:border-[#19588f] rounded-xl px-3.5 py-2 focus:outline-hidden"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mesin / Bed HD
                </label>
                <select
                  disabled={!isToday || managedPatients.length >= 10}
                  value={draftBedNumber || recommendNextBed(false)}
                  onChange={(e) => setDraftBedNumber(e.target.value)}
                  className="w-full min-h-[40px] bg-white disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 text-xs sm:text-sm font-semibold tabular-nums border border-slate-300 focus:border-[#19588f] rounded-xl px-3 py-2 focus:outline-hidden cursor-pointer"
                >
                  {baseBedOptions.map((bedOpt) => {
                    const usedOwn = managedPatients.some((p) => isSameBed(p.bedNumber, bedOpt));
                    const claimedOther = occupiedAssets.findBedClaimedByOther(bedOpt);
                    const isUnavailable = usedOwn || Boolean(claimedOther);
                    return (
                      <option key={bedOpt} value={bedOpt} disabled={isUnavailable}>
                        {bedOpt}
                        {usedOwn
                          ? ' (Terpakai)'
                          : claimedOther
                          ? ` (Terpakai - ${claimedOther.nurseName})`
                          : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="lg:col-span-3">
                <button
                  type="submit"
                  disabled={!isToday || managedPatients.length >= 10}
                  className="w-full min-h-[40px] px-4 py-2.5 bg-[#19588f] hover:bg-[#144775] disabled:opacity-55 disabled:cursor-not-allowed text-white rounded-xl text-xs sm:text-sm font-semibold shadow-2xs transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 shrink-0" />
                  <span>Input Pasien Shift {activeShift}</span>
                </button>
              </div>
            </div>
          </form>

          {/* DAFTAR PASIEN LOGBOOK SHIFT INI */}
          <div className="rounded-[14px] bg-white/86 backdrop-blur-xs border border-white/90 shadow-[0_6px_18px_rgba(14,42,74,0.08)] p-4 sm:p-5 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-[14.5px] sm:text-[15.5px] font-bold text-slate-950">
                  Daftar Pasien Shift {activeShift}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Klik nama pasien di bawah ini untuk membuka halaman pengisian Logbook Bagian I
                  sampai Bagian VII khusus untuk pasien tersebut.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-700 tabular-nums shrink-0">
                Total: {managedPatients.length} Pasien
              </span>
            </div>

            {managedPatients.length === 0 ? (
              <div className="py-10 px-4 border-t border-slate-200/80 text-center space-y-2.5">
                <div className="w-11 h-11 rounded-xl bg-[#e8f3fb] text-[#19588f] flex items-center justify-center mx-auto">
                  <Users className="w-5 h-5" />
                </div>
                <div className="max-w-lg mx-auto space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">
                    Halaman Logbook Masih Kosong
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Belum ada pasien yang diinput pada Shift {activeShift}. Silakan input pasien
                    terlebih dahulu pada formulir di atas, kemudian klik nama pasien tersebut untuk
                    mengisi Logbook Bagian I sampai Bagian VII.
                  </p>
                </div>
              </div>
            ) : (
              <div className="pt-3 border-t border-slate-200/80 space-y-2.5">
                {managedPatients.map((pat, idx) => {
                  const patStats = getSinglePatientOverallStats(pat.id);
                  const patLock = getPatientLockStatus(pat.id);
                  const patSub = patLock.submission || getEffectivePatientSubmission(pat);

                  return (
                    <div
                      key={pat.id}
                      onClick={() => handleOpenPatientWorkspace(pat)}
                      className="rounded-xl bg-white hover:bg-[#f4f9fd] border border-slate-200/90 hover:border-[#19588f]/45 px-4 py-3.5 transition-colors cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 tabular-nums">
                          <span className="font-mono font-bold text-[#19588f]">#{idx + 1}</span>
                          <span aria-hidden="true" className="text-slate-300">
                            &middot;
                          </span>
                          <select
                            value={pat.bedNumber}
                            disabled={!isToday || patLock.isLocked}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              handleUpdatePatientById(pat.id, 'bedNumber', e.target.value)
                            }
                            aria-label={`Pilih mesin/bed untuk ${pat.patientName}`}
                            className={`bg-slate-100/90 text-slate-900 font-bold text-xs border border-slate-300/90 rounded-md px-2 py-0.5 focus:outline-hidden focus:border-[#19588f] tabular-nums ${
                              !isToday || patLock.isLocked
                                ? 'opacity-65 cursor-not-allowed'
                                : 'hover:bg-white cursor-pointer'
                            }`}
                          >
                            {!baseBedOptions.includes(pat.bedNumber) && pat.bedNumber && (
                              <option value={pat.bedNumber}>{pat.bedNumber}</option>
                            )}
                            {baseBedOptions.map((bedOpt) => {
                              const usedOwnOther = managedPatients.some(
                                (other) => other.id !== pat.id && isSameBed(other.bedNumber, bedOpt)
                              );
                              const claimedOther = occupiedAssets.findBedClaimedByOther(bedOpt);
                              const isUnavailable = usedOwnOther || Boolean(claimedOther);
                              return (
                                <option key={bedOpt} value={bedOpt} disabled={isUnavailable}>
                                  {bedOpt}
                                  {usedOwnOther
                                    ? ' (Terpakai)'
                                    : claimedOther
                                    ? ` (Terpakai - ${claimedOther.nurseName})`
                                    : ''}
                                </option>
                              );
                            })}
                          </select>
                          {pat.medicalRecord && (
                            <>
                              <span aria-hidden="true" className="text-slate-300">
                                &middot;
                              </span>
                              <span className="font-mono text-slate-600">
                                RM {pat.medicalRecord}
                              </span>
                            </>
                          )}
                          {pat.isReschedule && (
                            <>
                              <span aria-hidden="true" className="text-slate-300">
                                &middot;
                              </span>
                              <span className="font-semibold text-[#0e7876]">
                                Reschedule HD
                                {pat.originalSchedule ? ` (Asal: ${pat.originalSchedule})` : ''}
                              </span>
                            </>
                          )}
                          <span aria-hidden="true" className="text-slate-300">
                            &middot;
                          </span>
                          <span
                            className={`font-semibold ${
                              patStats.pct === 100
                                ? 'text-[#0e7876]'
                                : patStats.completed > 0
                                ? 'text-[#19588f]'
                                : 'text-slate-500'
                            }`}
                          >
                            {patStats.completed}/{patStats.total} SPO ({patStats.pct}%)
                          </span>
                          <span aria-hidden="true" className="text-slate-300">
                            &middot;
                          </span>
                          {patLock.isVerified ? (
                            <span className="font-semibold text-[#0e7876] inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <Lock className="w-3.5 h-3.5 shrink-0" />
                              <span>Terverifikasi (Terkunci)</span>
                            </span>
                          ) : patLock.isSubmitted ? (
                            <span className="font-semibold text-[#19588f] inline-flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                              <Lock className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                Menunggu Verifikasi{' '}
                                {patSub.targetRole === 'kepala_ruangan'
                                  ? 'Kepala Ruang'
                                  : 'PJ Shift'}{' '}
                                (Terkunci)
                              </span>
                            </span>
                          ) : patLock.hasRevisionRequest ? (
                            <span className="font-semibold text-amber-900 inline-flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-300 animate-pulse">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                              <span>Diminta Perbaikan (Bisa Diedit Kembali)</span>
                            </span>
                          ) : (
                            <span className="font-semibold text-amber-700">Belum Diajukan</span>
                          )}
                        </div>

                        <div className="text-sm sm:text-[15.5px] font-bold text-slate-950 group-hover:text-[#19588f] transition-colors truncate">
                          {pat.patientName}
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-2.5 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPatientWorkspace(pat);
                          }}
                          className={`px-3.5 py-2 rounded-xl text-white text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                            patLock.isLocked
                              ? 'bg-slate-700 hover:bg-slate-800'
                              : patLock.hasRevisionRequest
                              ? 'bg-amber-600 hover:bg-amber-700'
                              : 'bg-[#19588f] group-hover:bg-[#144775]'
                          }`}
                        >
                          {patLock.isLocked ? (
                            <>
                              <Lock className="w-3.5 h-3.5 shrink-0" />
                              <span>Lihat Logbook (Terkunci)</span>
                            </>
                          ) : patLock.hasRevisionRequest ? (
                            <>
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>Perbaiki Logbook</span>
                            </>
                          ) : (
                            <>
                              <span>
                                {isToday
                                  ? 'Isi Logbook Bagian I–VII'
                                  : 'Lihat Logbook Bagian I–VII'}
                              </span>
                              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={!isToday || patLock.isLocked}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemovePatient(pat.id);
                          }}
                          className={`p-2 rounded-xl border transition-colors shrink-0 ${
                            !isToday || patLock.isLocked
                              ? 'opacity-35 cursor-not-allowed text-slate-300 border-slate-200'
                              : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50 border-slate-200 hover:border-rose-200 cursor-pointer'
                          }`}
                          title={
                            !isToday
                              ? 'Pengisian logbook dibatasi hanya pada hari yang sama'
                              : patLock.isLocked
                              ? 'Pasien ini tidak dapat dihapus karena logbook sedang menunggu verifikasi atau sudah terverifikasi'
                              : `Hapus ${pat.patientName} dari daftar logbook`
                          }
                          aria-label={`Hapus ${pat.patientName}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* HEADER KONTEKS PASIEN AKTIF + TOMBOL KEMBALI KE DAFTAR PASIEN */}
          <div className="rounded-[14px] bg-white/88 backdrop-blur-xs border border-white/90 shadow-[0_6px_18px_rgba(14,42,74,0.08)] p-4 sm:p-5 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-200/80">
              <button
                type="button"
                onClick={handleBackToPatientList}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-[#e8f3fb] text-slate-800 hover:text-[#19588f] text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>Kembali ke Daftar Pasien ({managedPatients.length})</span>
              </button>

              {managedPatients.length > 1 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {managedPatients.map((pat, idx) => {
                    const isSelected = pat.id === openedPatient.id;
                    return (
                      <button
                        key={pat.id}
                        type="button"
                        onClick={() => handleOpenPatientWorkspace(pat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer border tabular-nums ${
                          isSelected
                            ? 'bg-[#19588f] text-white border-[#19588f] shadow-2xs'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span className="font-mono text-[11px] opacity-80 mr-1">#{idx + 1}</span>
                        <span>{pat.patientName}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600 tabular-nums">
                  <span className="font-bold text-[#19588f]">Langkah 2 dari 2</span>
                  <span aria-hidden="true" className="text-slate-300">
                    &middot;
                  </span>
                  <span>Logbook Bagian I – Bagian VII Pasien</span>
                  {openedPatient.medicalRecord && (
                    <>
                      <span aria-hidden="true" className="text-slate-300">
                        &middot;
                      </span>
                      <span className="font-mono font-semibold text-slate-700">
                        RM {openedPatient.medicalRecord}
                      </span>
                    </>
                  )}
                  {openedPatient.isReschedule && (
                    <>
                      <span aria-hidden="true" className="text-slate-300">
                        &middot;
                      </span>
                      <span className="font-semibold text-[#0e7876]">
                        Pasien Reschedule
                        {openedPatient.originalSchedule
                          ? ` (Jadwal Asal: ${openedPatient.originalSchedule})`
                          : ''}
                      </span>
                    </>
                  )}
                  <span aria-hidden="true" className="text-slate-300">
                    &middot;
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span>Mesin/Bed:</span>
                    <select
                      value={openedPatient.bedNumber}
                      disabled={!isToday || isCurrentPatientLocked}
                      onChange={(e) => handleUpdateActivePatient('bedNumber', e.target.value)}
                      aria-label="Pilih mesin atau bed pasien"
                      className={`bg-slate-100 text-slate-900 font-bold text-xs border border-slate-300 rounded-md px-2 py-0.5 focus:outline-hidden focus:border-[#19588f] tabular-nums ${
                        !isToday || isCurrentPatientLocked
                          ? 'opacity-65 cursor-not-allowed'
                          : 'hover:bg-white cursor-pointer'
                      }`}
                    >
                      {availableBedOptions.map((bedOpt) => {
                        const usedOwnOther = managedPatients.some(
                          (other) =>
                            other.id !== openedPatient.id && isSameBed(other.bedNumber, bedOpt)
                        );
                        const claimedOther = occupiedAssets.findBedClaimedByOther(bedOpt);
                        const isUnavailable = usedOwnOther || Boolean(claimedOther);
                        return (
                          <option key={bedOpt} value={bedOpt} disabled={isUnavailable}>
                            {bedOpt}
                            {usedOwnOther
                              ? ' (Terpakai)'
                              : claimedOther
                              ? ` (Terpakai - ${claimedOther.nurseName})`
                              : ''}
                          </option>
                        );
                      })}
                    </select>
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-extrabold text-slate-950 truncate">
                  {openedPatient.patientName}
                </h3>

                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] pt-1">
                  <span className="inline-flex items-center gap-1.5 font-bold text-blue-900 bg-blue-50/90 px-2 py-0.5 rounded-md border border-blue-200">
                    <Stethoscope className="w-3 h-3 text-blue-700 shrink-0" />
                    <span>DPJP: {selectedDokterDpjp}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-bold text-emerald-900 bg-emerald-50/90 px-2 py-0.5 rounded-md border border-emerald-200">
                    <UserCheck className="w-3 h-3 text-emerald-700 shrink-0" />
                    <span>Dokter Jaga: {selectedDokterJaga}</span>
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs tabular-nums shrink-0">
                <div className="text-left md:text-right">
                  <div className="font-bold text-slate-900">
                    Capaian SPO: {activePatientOverallStats.completed}/
                    {activePatientOverallStats.total} ({activePatientOverallStats.pct}%)
                  </div>
                  {isCurrentPatientVerified ? (
                    <div className="text-[#0e7876] font-semibold flex items-center md:justify-end gap-1 mt-0.5">
                      <Lock className="w-3.5 h-3.5 shrink-0" />
                      <span>Terverifikasi (Terkunci)</span>
                    </div>
                  ) : isCurrentPatientSubmitted ? (
                    <div className="text-[#19588f] font-semibold flex items-center md:justify-end gap-1 mt-0.5">
                      <Lock className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Menunggu Verifikasi{' '}
                        {activePatientSubmission.targetRole === 'kepala_ruangan'
                          ? 'Kepala Ruang'
                          : 'PJ Shift'}{' '}
                        (Terkunci)
                      </span>
                    </div>
                  ) : hasCurrentPatientRevisionRequest ? (
                    <div className="text-amber-800 font-semibold flex items-center md:justify-end gap-1 mt-0.5 animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                      <span>Perlu Perbaikan (Dapat Diedit)</span>
                    </div>
                  ) : (
                    <div className="text-amber-700 font-semibold mt-0.5">
                      Status Verifikasi: Belum Diajukan
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(true)}
                  className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#19588f] border border-blue-200 text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
                  title="Cetak Berkas Logbook Pasien (Format Standar A4 KARS & PERNEFRI)"
                >
                  <Printer className="w-3.5 h-3.5 shrink-0" />
                  <span>Cetak / PDF A4</span>
                </button>

                <button
                  type="button"
                  disabled={!isToday || isCurrentPatientLocked}
                  onClick={() => handleRemovePatient(openedPatient.id)}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                    !isToday || isCurrentPatientLocked
                      ? 'opacity-40 cursor-not-allowed text-slate-400 border-slate-200'
                      : 'text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 cursor-pointer'
                  }`}
                  title={
                    !isToday
                      ? 'Pengisian logbook dibatasi hanya pada hari yang sama'
                      : isCurrentPatientLocked
                      ? 'Pasien ini tidak dapat dihapus karena logbook sedang menunggu verifikasi atau sudah terverifikasi'
                      : `Hapus pasien ${openedPatient.patientName}`
                  }
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Hapus Pasien</span>
                </button>
              </div>
            </div>
          </div>

          {/* BANNER STATUS KUNCI / REVISI LOGBOOK */}
          {hasCurrentPatientRevisionRequest ? (
            <div className="rounded-[14px] border-2 border-amber-400 bg-amber-50/95 p-4 sm:p-5 shadow-xs flex items-start gap-3.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-amber-950 text-sm sm:text-base">
                    Permintaan Perbaikan dari Verifikator
                  </span>
                  <span className="text-[11px] font-bold bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full">
                    Logbook Dibuka Kembali untuk Diedit
                  </span>
                </div>
                <div className="text-xs sm:text-sm text-amber-950 leading-relaxed font-semibold bg-white/80 p-3 rounded-lg border border-amber-300">
                  <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1">
                    Instruksi / Catatan Perbaikan Verifikator:
                  </div>
                  <p>{currentPatientLock.verifierNotes || 'Mohon periksa dan perbaiki kembali kelengkapan data logbook asuhan hemodialisa pasien ini.'}</p>
                </div>
                <p className="text-xs text-amber-800 font-medium">
                  Silakan buka dan perbaiki indikator SPO yang diminta pada Bagian II–VI di bawah ini, kemudian ajukan kembali verifikasi pada Bagian VII.
                </p>
              </div>
            </div>
          ) : isCurrentPatientLocked ? (
            <div className={`rounded-[14px] border p-4 sm:p-5 shadow-xs flex items-start gap-3.5 ${
              isCurrentPatientVerified
                ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                : 'bg-blue-50/90 border-blue-300 text-blue-950'
            }`}>
              <Lock className={`w-5 h-5 shrink-0 mt-0.5 ${isCurrentPatientVerified ? 'text-emerald-700' : 'text-blue-700'}`} />
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-sm sm:text-base">
                    {isCurrentPatientVerified
                      ? 'Logbook Telah Terverifikasi (Terkunci)'
                      : 'Logbook Sedang Menunggu Verifikasi (Terkunci)'}
                  </span>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    isCurrentPatientVerified
                      ? 'bg-emerald-200 text-emerald-900'
                      : 'bg-blue-200 text-blue-900'
                  }`}>
                    Mode Baca &middot; Tidak Bisa Diedit
                  </span>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed opacity-90">
                  {isCurrentPatientVerified
                    ? 'Logbook asuhan hemodialisa pasien ini telah diverifikasi dan disahkan resmi oleh verifikator. Seluruh data terkunci dan tidak dapat diedit lagi. Data hanya bisa diedit kembali saat verifikator (PJ Shift / Kepala Ruang) meminta perbaikan.'
                    : 'Logbook pasien ini sedang menunggu proses verifikasi oleh verifikator (PJ Shift / Kepala Ruang). Selama menunggu verifikasi, data logbook terkunci dan tidak bisa diubah. Data hanya dapat diedit kembali jika verifikator meminta perbaikan.'}
                </p>
              </div>
            </div>
          ) : null}

          {/* DAFTAR 7 BAGIAN LOGBOOK (BAGIAN I – BAGIAN VII) UNTUK PASIEN TERPILIH */}
          <div className="space-y-2.5">
            {BAGIAN_METAS.map((bagian) => {
              const IconComponent = bagian.icon;

              const isFacility = bagian.num === 1;
              const isVerification = bagian.num === 7;
              const facStats = isFacility ? getFacilityBagianStats() : null;
              const singlePatStats = bagian.isPatientSpecific
                ? getPatientBagianStats(bagian.num, openedPatient.id)
                : null;

              const stats = isVerification
                ? {
                    total: activePatientOverallStats.total,
                    completed: activePatientOverallStats.completed,
                    pct: activePatientOverallStats.pct
                  }
                : isFacility && facStats
                ? {
                    total: facStats.total,
                    completed: facStats.completed,
                    pct: facStats.pct
                  }
                : {
                    total: singlePatStats?.total || 0,
                    completed: singlePatStats?.completed || 0,
                    pct: singlePatStats?.pct || 0
                  };

              const isComplete = isVerification
                ? activePatientSubmission.status === 'terverifikasi'
                : stats.total > 0 && stats.completed === stats.total;

              return (
                <button
                  key={bagian.num}
                  type="button"
                  onClick={() => setSelectedBagian(bagian.num)}
                  className="w-full text-left rounded-[14px] bg-white/86 hover:bg-white/96 backdrop-blur-xs border border-white/90 hover:border-[#22749b]/45 px-4 sm:px-5 py-3.5 sm:py-4 shadow-[0_6px_18px_rgba(14,42,74,0.07)] transition-colors duration-150 cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-5"
                >
                  {/* Left: Icon + Editorial Kicker + Title + Subtitle */}
                  <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
                    <div
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isComplete
                          ? 'bg-[#118f8d]/14 text-[#0e7876]'
                          : 'bg-[#22749b]/12 text-[#19588f]'
                      }`}
                    >
                      <IconComponent className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      {/* Unboxed Metadata Line (Zero-Pill Discipline) */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600 tabular-nums">
                        <span className="font-extrabold text-[#19588f] tracking-wide">
                          {bagian.roman}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">
                          &middot;
                        </span>
                        {isVerification ? (
                          <>
                            <span className="font-medium text-slate-700">{bagian.scopeLabel}</span>
                            <span aria-hidden="true" className="text-slate-300">
                              &middot;
                            </span>
                            <span className="text-slate-600">{targetVerifierLabel}</span>
                          </>
                        ) : bagian.isPatientSpecific ? (
                          <>
                            <span className="font-medium text-slate-700">{bagian.scopeLabel}</span>
                            <span aria-hidden="true" className="text-slate-300">
                              &middot;
                            </span>
                            <span>
                              {stats.total} Indikator SPO &middot; {openedPatient.patientName} (
                              {openedPatient.bedNumber})
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="font-medium text-slate-700">{bagian.scopeLabel}</span>
                            <span aria-hidden="true" className="text-slate-300">
                              &middot;
                            </span>
                            <span>{stats.total} Indikator SPO (1x/Hari Unit)</span>
                          </>
                        )}
                      </div>

                      <h3 className="text-[14.5px] sm:text-[15.5px] font-bold text-slate-950 group-hover:text-[#19588f] transition-colors leading-snug">
                        {isVerification ? bagian7RoleTitle : bagian.title}
                      </h3>

                      <p className="text-xs text-slate-600 line-clamp-1 leading-relaxed">
                        {isVerification ? bagian7RoleSubtitle : bagian.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Right: Tabular Progress + Consistent RSHL CTA */}
                  <div className="flex items-center justify-between md:justify-end gap-3.5 sm:gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200/70">
                    {isVerification ? (
                      <div className="text-left md:text-right tabular-nums">
                        <div className="text-xs font-bold text-slate-900">
                          {activePatientOverallStats.completed}/{activePatientOverallStats.total}{' '}
                          SPO ({activePatientOverallStats.pct}%)
                        </div>
                        {activePatientSubmission.status === 'terverifikasi' ? (
                          <div className="text-[11px] text-[#0e7876] font-semibold flex items-center md:justify-end gap-1 mt-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Terverifikasi</span>
                          </div>
                        ) : activePatientSubmission.status === 'diajukan' ? (
                          <div className="text-[11px] text-[#19588f] font-semibold flex items-center md:justify-end gap-1 mt-0.5">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              Menunggu{' '}
                              {activePatientSubmission.targetRole === 'kepala_ruangan'
                                ? 'Kepala Ruang'
                                : 'PJ Shift'}
                            </span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-amber-700 font-semibold mt-0.5">
                            Belum Diajukan
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-left md:text-right tabular-nums">
                        <div className="text-xs font-bold text-slate-900">
                          {stats.completed}/{stats.total} SPO
                        </div>
                        {stats.completed === 0 ? (
                          <div className="text-[11px] text-amber-700 font-semibold flex items-center md:justify-end gap-1 mt-0.5">
                            <Square className="w-3 h-3 shrink-0" />
                            <span>Belum Dilaksanakan</span>
                          </div>
                        ) : stats.completed < stats.total ? (
                          <div className="text-[11px] text-[#19588f] font-semibold flex items-center md:justify-end gap-1 mt-0.5">
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>{stats.pct}% Terisi</span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-[#0e7876] font-semibold flex items-center md:justify-end gap-1 mt-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>100% Terpenuhi</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div
                      className={`px-3.5 py-2 rounded-xl text-white font-semibold text-xs shadow-2xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                        isComplete
                          ? 'bg-[#0e7876] group-hover:bg-[#0b6361]'
                          : 'bg-[#19588f] group-hover:bg-[#144775]'
                      }`}
                    >
                      <span>
                        {isVerification
                          ? activePatientSubmission.status === 'belum_diajukan'
                            ? 'Ajukan Verifikasi'
                            : 'Buka Verifikasi'
                          : 'Buka Bagian'}
                      </span>
                      <ChevronRight className="w-4 h-4 shrink-0" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL TAMBAH PASIEN RESCHEDULE JADWAL HD (DI LUAR DAFTAR PASIEN SHIFT)    */}
      {/* ========================================================================= */}
      {isRescheduleModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 bg-slate-950/45 backdrop-blur-xs"
          onClick={() => setIsRescheduleModalOpen(false)}
        >
          <form
            onSubmit={handleCreateReschedulePatient}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#f4f9fd] rounded-[18px] shadow-2xl border border-white w-full max-w-3xl max-h-[94vh] flex flex-col overflow-hidden"
          >
            {/* Header Modal Reschedule */}
            <div className="px-4 sm:px-6 py-3 bg-gradient-to-r from-[#0b6361] via-[#0e7876] to-[#138f8c] text-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 bg-white/15 text-white border border-white/25">
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs text-teal-100 tabular-nums">
                    <span className="font-extrabold text-white">RESCHEDULE JADWAL HD</span>
                    <span aria-hidden="true">&middot;</span>
                    <span>Di Luar Daftar Hari {activeDayName} Shift {activeShift}</span>
                  </div>
                  <h2 className="text-sm sm:text-[15.5px] font-bold text-white leading-snug truncate">
                    Tambah Pasien Reschedule ke Shift {activeShift}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsRescheduleModalOpen(false)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="Tutup Modal Reschedule"
                aria-label="Tutup Modal Reschedule"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Body Modal Reschedule */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 min-h-0">
              <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 space-y-3">
                <div className="space-y-0.5">
                  <label className="block text-xs font-bold text-slate-900">
                    Pilih dari Data Pasien Terdaftar Di Luar Shift {activeShift} (
                    {unselectedOtherMasterPatients.length} Pasien)
                  </label>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Menampilkan seluruh pasien HD terdaftar yang jadwal rutinnya bukan pada Hari{' '}
                    {activeDayName} Shift {activeShift}.
                  </p>
                </div>

                {/* Pencarian Cepat Pasien Di Luar Shift */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={rescheduleSearchQuery}
                    onChange={(e) => setRescheduleSearchQuery(e.target.value)}
                    placeholder="Cari nama pasien, No. RM, atau hari jadwal asal (mis. Kamis / Selasa)..."
                    className="w-full min-h-[38px] bg-slate-50 focus:bg-white text-slate-900 text-xs sm:text-sm border border-slate-300 focus:border-[#0e7876] rounded-xl pl-9 pr-3.5 py-2 focus:outline-hidden"
                  />
                </div>

                {/* Dropdown Pasien Di Luar Jadwal Shift Ini */}
                <select
                  value={rescheduleMasterId}
                  onChange={(e) => handlePickRescheduleMasterPatient(e.target.value)}
                  className="w-full min-h-[40px] bg-slate-50 hover:bg-white focus:bg-white text-slate-900 text-xs sm:text-sm font-medium border border-slate-300 focus:border-[#0e7876] rounded-xl px-3.5 py-2.5 focus:outline-hidden tabular-nums cursor-pointer"
                >
                  <option value="">
                    {unselectedOtherMasterPatients.length === 0
                      ? `-- Tidak ada data pasien terdaftar lainnya di luar Shift ${activeShift} (ketik manual di bawah) --`
                      : filteredReschedulePatients.length === 0
                      ? `-- Tidak ditemukan pasien sesuai pencarian "${rescheduleSearchQuery}" --`
                      : `-- Pilih Pasien Di Luar Jadwal Hari ${activeDayName} Shift ${activeShift} (${filteredReschedulePatients.length} Pasien) --`}
                  </option>
                  {filteredReschedulePatients.map((mp) => {
                    const schedLabel = getMasterPatientScheduleLabel(mp);
                    return (
                      <option key={mp.id} value={mp.id}>
                        {mp.patientName} (RM: {mp.medicalRecordNumber}) — Jadwal Rutin: {schedLabel}
                      </option>
                    );
                  })}
                  {claimedOtherMasterPatients.length > 0 && (
                    <optgroup label="Sudah Diinput Perawat Lain (Tidak Dapat Dipilih)">
                      {claimedOtherMasterPatients.map(({ master: mp, owner }) => (
                        <option key={mp.id} value={mp.id} disabled>
                          {mp.patientName} (RM: {mp.medicalRecordNumber}) — Sudah diinput:{' '}
                          {owner.nurseName} ({owner.bedNumber})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>

                {/* Daftar Pilihan Cepat saat Mencari */}
                {rescheduleSearchQuery.trim().length > 0 &&
                  filteredReschedulePatients.length > 0 && (
                    <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-slate-50/60">
                      {filteredReschedulePatients.slice(0, 8).map((mp) => {
                        const schedLabel = getMasterPatientScheduleLabel(mp);
                        const isPicked = rescheduleMasterId === mp.id;
                        return (
                          <button
                            key={mp.id}
                            type="button"
                            onClick={() => handlePickRescheduleMasterPatient(mp.id)}
                            className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                              isPicked
                                ? 'bg-emerald-50 text-[#0e7876] font-bold'
                                : 'hover:bg-white text-slate-800'
                            }`}
                          >
                            <span className="truncate font-semibold">
                              {mp.patientName}{' '}
                              <span className="font-mono text-slate-500 font-normal">
                                (RM: {mp.medicalRecordNumber})
                              </span>
                            </span>
                            <span className="text-[11px] text-slate-600 shrink-0 tabular-nums">
                              Jadwal: {schedLabel}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
              </div>

              {/* Detail Identitas, Bed & Keterangan Reschedule */}
              <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-6">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Nama Pasien Reschedule <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={reschedulePatientName}
                      onChange={(e) => {
                        setReschedulePatientName(e.target.value);
                        if (rescheduleMasterId) setRescheduleMasterId('');
                      }}
                      placeholder="Pilih pasien di atas atau ketik nama..."
                      className="w-full min-h-[40px] bg-white text-slate-950 text-xs sm:text-sm font-semibold border border-slate-300 focus:border-[#0e7876] rounded-xl px-3.5 py-2 focus:outline-hidden"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      No. Rekam Medis
                    </label>
                    <input
                      type="text"
                      value={reschedulePatientRm}
                      onChange={(e) => setReschedulePatientRm(e.target.value)}
                      placeholder="Contoh: 00-12-34"
                      className="w-full min-h-[40px] bg-white text-slate-900 text-xs sm:text-sm font-mono font-semibold tabular-nums border border-slate-300 focus:border-[#0e7876] rounded-xl px-3 py-2 focus:outline-hidden"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Mesin / Bed HD
                    </label>
                    <select
                      value={rescheduleBedNumber || recommendNextBed(false)}
                      onChange={(e) => setRescheduleBedNumber(e.target.value)}
                      className="w-full min-h-[40px] bg-white text-slate-900 text-xs sm:text-sm font-semibold tabular-nums border border-slate-300 focus:border-[#0e7876] rounded-xl px-3 py-2 focus:outline-hidden cursor-pointer"
                    >
                      {baseBedOptions.map((bedOpt) => {
                        const usedOwn = managedPatients.some((p) =>
                          isSameBed(p.bedNumber, bedOpt)
                        );
                        const claimedOther = occupiedAssets.findBedClaimedByOther(bedOpt);
                        const isUnavailable = usedOwn || Boolean(claimedOther);
                        return (
                          <option key={bedOpt} value={bedOpt} disabled={isUnavailable}>
                            {bedOpt}
                            {usedOwn
                              ? ' (Terpakai)'
                              : claimedOther
                              ? ` (Terpakai - ${claimedOther.nurseName})`
                              : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Keterangan / Alasan Reschedule Jadwal HD (Opsional)
                  </label>
                  <input
                    type="text"
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                    placeholder="Contoh: Reschedule dari jadwal Kamis Pagi karena kontrol poli..."
                    className="w-full min-h-[38px] bg-slate-50 focus:bg-white text-slate-900 text-xs sm:text-sm border border-slate-300 focus:border-[#0e7876] rounded-xl px-3.5 py-2 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Footer Modal Reschedule */}
            <div className="px-4 sm:px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsRescheduleModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={!isToday || managedPatients.length >= 10}
                className="px-4 sm:px-5 py-2.5 rounded-xl bg-[#0e7876] hover:bg-[#0b6361] disabled:opacity-55 disabled:cursor-not-allowed text-white font-semibold text-xs sm:text-sm shadow-2xs transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <CalendarClock className="w-4 h-4 shrink-0" />
                <span>Tambahkan Pasien Reschedule</span>
              </button>
            </div>
          </form>
        </div>
      )}
      </div>
      )}

      {/* ========================================================================= */}
      {/* REKOMENDASI 1: FULL-PAGE WORKSPACE LOGBOOK BAGIAN I – VII                 */}
      {/* Single Natural Window Scroll — No Popup Modal — No Double Scrollbar       */}
      {/* ========================================================================= */}
      {selectedBagian && activeMeta && openedPatient && (
        <div className="w-full bg-[#f4f9fd] rounded-2xl border border-slate-200/90 shadow-[0_8px_32px_rgba(14,42,74,0.08)] flex flex-col">
          {/* STICKY TOP CLINICAL HEADER BAR */}
          <div className="sticky top-0 z-30 shadow-xs">
            {/* RSHL Clinical Blue Header */}
            <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#164c7d] via-[#19588f] to-[#1f6a96] text-white flex items-center justify-between gap-3 shrink-0 rounded-t-2xl">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <button
                  type="button"
                  onClick={handleBackToPatientList}
                  className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  title="Kembali ke Daftar Pasien"
                >
                  <ArrowLeft className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Daftar Pasien</span>
                </button>

                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/15 text-white border border-white/25">
                  {React.createElement(activeMeta.icon, { className: 'w-4 h-4 sm:w-5 sm:h-5' })}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs text-sky-100 tabular-nums">
                    <span className="font-extrabold text-white">{activeMeta.roman}</span>
                    <span aria-hidden="true">&middot;</span>
                    <span className="font-semibold text-white">
                      {openedPatient.patientName} ({openedPatient.bedNumber})
                    </span>
                    <span aria-hidden="true">&middot;</span>
                    <span>{activeDate}</span>
                    <span aria-hidden="true">&middot;</span>
                    <span>Shift {activeShift}</span>
                  </div>

                  <h2 className="text-sm sm:text-[15.5px] font-bold text-white leading-snug truncate">
                    {selectedBagian === 7 ? bagian7RoleTitle : activeMeta.title}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Quick Shift Switcher inside Workspace Header */}
                <div className="hidden sm:flex items-center gap-1 p-0.5 sm:p-1 bg-black/15 rounded-xl border border-white/15">
                  <button
                    type="button"
                    disabled={!isToday}
                    onClick={() => handleSelectShiftSchedule('Pagi')}
                    title={
                      !isToday
                        ? 'Pengisian logbook dibatasi hanya bisa mengisi pada hari yang sama'
                        : 'Shift Pagi'
                    }
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 ${
                      !isToday ? 'opacity-60 cursor-not-allowed text-sky-200' : 'cursor-pointer'
                    } ${
                      activeShift === 'Pagi'
                        ? 'bg-white text-[#19588f] shadow-2xs'
                        : 'text-sky-100 hover:text-white'
                    }`}
                  >
                    <Sun className="w-3 h-3 shrink-0" />
                    <span>Pagi</span>
                  </button>
                  <button
                    type="button"
                    disabled={!isToday}
                    onClick={() => handleSelectShiftSchedule('Siang')}
                    title={
                      !isToday
                        ? 'Pengisian logbook dibatasi hanya bisa mengisi pada hari yang sama'
                        : 'Shift Siang'
                    }
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 ${
                      !isToday ? 'opacity-60 cursor-not-allowed text-sky-200' : 'cursor-pointer'
                    } ${
                      activeShift === 'Siang'
                        ? 'bg-white text-[#19588f] shadow-2xs'
                        : 'text-sky-100 hover:text-white'
                    }`}
                  >
                    <Sunset className="w-3 h-3 shrink-0" />
                    <span>Siang</span>
                  </button>
                </div>

                {/* Reset Checklist Pasien Button */}
                {openedPatient && (
                  <button
                    type="button"
                    disabled={!isToday || isCurrentPatientLocked}
                    onClick={handleResetActivePatientChecklists}
                    className="hidden md:flex px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    title={
                      !isToday
                        ? 'Pengisian logbook dibatasi hanya bisa mengisi pada hari yang sama'
                        : isCurrentPatientLocked
                        ? getLockToastMessage(currentPatientLock.submission?.status)
                        : `Reset checklist SPO pasien ${openedPatient.patientName}`
                    }
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-sky-200 shrink-0" />
                    <span>Reset SPO</span>
                  </button>
                )}

                {/* Close Button */}
                <button
                  type="button"
                  onClick={handleBackToPatientList}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/12 hover:bg-white/22 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  title="Kembali ke Daftar Pasien"
                  aria-label="Kembali ke Daftar Pasien"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Light Clinical Ice-Blue Quick Switcher Between Bagian I – VII */}
            <div className="bg-[#e5f0f8] px-4 sm:px-6 py-1.5 flex items-center justify-between gap-3 border-b border-[#cbe0f0] text-xs shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                {BAGIAN_METAS.map((m) => {
                  const isActive = m.num === selectedBagian;
                  return (
                    <button
                      key={m.num}
                      type="button"
                      onClick={() => setSelectedBagian(m.num)}
                      className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isActive
                          ? 'bg-[#19588f] text-white shadow-2xs'
                          : 'bg-white/80 hover:bg-white text-slate-700 hover:text-slate-950 border border-white'
                      }`}
                    >
                      {m.roman}
                    </button>
                  );
                })}
              </div>

              <span className="hidden md:flex items-center gap-1.5 font-semibold text-[#19588f] tabular-nums shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {selectedBagian === 7
                    ? `${activePatientOverallStats.completed}/${activePatientOverallStats.total} SPO Pasien (${activePatientOverallStats.pct}%)`
                    : activeMeta.isPatientSpecific
                    ? `${getPatientBagianStats(selectedBagian, openedPatient.id).completed}/${getPatientBagianStats(selectedBagian, openedPatient.id).total} SPO (${openedPatient.bedNumber})`
                    : `${getFacilityBagianStats().completed}/${getFacilityBagianStats().total} SPO Unit`}
                </span>
              </span>
            </div>

            {/* Read-Only Notice Strip inside modal when looking at another day */}
            {!isToday && (
              <div className="bg-amber-100/95 border-b border-amber-300 text-amber-950 px-4 sm:px-6 py-1.5 text-xs font-semibold flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle className="w-4 h-4 text-amber-800 shrink-0" />
                  <span className="truncate">
                    Mode Hanya-Baca: Pengisian logbook dibatasi hanya pada hari yang sama (
                    {todayIndonesianFull}).
                  </span>
                </div>
                {onResetDateToToday && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBagian(null);
                      onResetDateToToday();
                    }}
                    className="text-[#19588f] hover:underline font-bold text-xs cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Kembali ke Hari Ini &rarr;
                  </button>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* SLIM STICKY PATIENT CONTEXT BAR (BAGIAN II – VII)                         */}
            {/* ========================================================================= */}
            {(activeMeta.isPatientSpecific || selectedBagian === 7) && (
              <div className="bg-white px-4 sm:px-6 py-1.5 sm:py-2 border-b border-slate-200/90 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  <span className="text-[11px] font-semibold text-slate-500 mr-1 hidden lg:inline whitespace-nowrap shrink-0">
                    Pasien Logbook:
                  </span>
                  {managedPatients.map((pat, idx) => {
                    const isSelected = pat.id === openedPatient.id;
                    const patStats =
                      selectedBagian === 7
                        ? getSinglePatientOverallStats(pat.id)
                        : getPatientBagianStats(selectedBagian, pat.id);

                    return (
                      <button
                        key={pat.id}
                        type="button"
                        onClick={() => {
                          setOpenedPatientId(pat.id);
                          setActivePatientId(pat.id);
                        }}
                        className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer border tabular-nums ${
                          isSelected
                            ? 'bg-[#19588f] text-white border-[#19588f] shadow-2xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span className="font-mono text-[11px] opacity-80">#{idx + 1}</span>
                        <span>{pat.bedNumber || `Bed ${idx + 1}`}</span>
                        <span
                          className={isSelected ? 'text-sky-200' : 'text-slate-300'}
                          aria-hidden="true"
                        >
                          &middot;
                        </span>
                        <span className="max-w-[145px] truncate">{pat.patientName}</span>
                        <span
                          className={`text-[11px] font-mono ${
                            isSelected
                              ? 'text-sky-100'
                              : patStats.pct === 100
                              ? 'text-[#0e7876]'
                              : 'text-amber-700'
                          }`}
                        >
                          ({patStats.completed}/{patStats.total})
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleBackToPatientList}
                    className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-slate-100 hover:bg-[#e8f3fb] text-slate-700 hover:text-[#19588f] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                    <span>Daftar Pasien</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* MAIN CLINICAL WORKSPACE (BAGIAN I – VII) - NATURAL SINGLE PAGE SCROLL    */}
          {/* ========================================================================= */}
          <div className="p-4 sm:p-6 md:p-7 space-y-4">
              {selectedBagian === 7 ? (
                <div className="space-y-4">
                  {/* Catatan Revisi Verifikator (jika dikembalikan) */}
                  {activePatientSubmission.status === 'belum_diajukan' &&
                    (activePatientSubmission.revisionRequested ||
                      activePatientSubmission.verifierNotes) && (
                      <div className="rounded-[14px] border-2 border-amber-400 bg-amber-50 p-4 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-950 space-y-1 flex-1 min-w-0">
                          <div className="font-extrabold flex flex-wrap items-center gap-2">
                            <span>
                              Diminta Perbaikan Kembali oleh{' '}
                              {activePatientSubmission.revisionRequestedByRole || 'Verifikator'}
                              {activePatientSubmission.revisionRequestedBy
                                ? ` (${activePatientSubmission.revisionRequestedBy})`
                                : ''}
                            </span>
                            {activePatientSubmission.revisionRequestedAt && (
                              <span className="font-mono font-semibold text-amber-800">
                                &middot; {activePatientSubmission.revisionRequestedAt}
                              </span>
                            )}
                          </div>
                          <p className="leading-relaxed font-semibold">
                            {activePatientSubmission.verifierNotes ||
                              'Mohon periksa dan perbaiki kembali kelengkapan logbook pasien ini, lalu ajukan kembali verifikasi.'}
                          </p>
                        </div>
                      </div>
                    )}

                  {/* 1. Status Pengajuan Verifikasi Pasien Banner */}
                  <div
                    className={`rounded-[14px] border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      activePatientSubmission.status === 'terverifikasi'
                        ? 'bg-emerald-50/80 border-emerald-200'
                        : activePatientSubmission.status === 'diajukan'
                        ? 'bg-[#e8f3fb] border-[#19588f]/30'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`font-bold tracking-wide ${
                            activePatientSubmission.status === 'terverifikasi'
                              ? 'text-[#0e7876]'
                              : activePatientSubmission.status === 'diajukan'
                              ? 'text-[#19588f]'
                              : 'text-amber-700'
                          }`}
                        >
                          {activePatientSubmission.status === 'terverifikasi'
                            ? (activePatientSubmission.verifiedByRole || '')
                                .toLowerCase()
                                .includes('kepala') ||
                              activePatientSubmission.targetRole === 'kepala_ruangan'
                              ? 'TERVERIFIKASI KEPALA RUANG'
                              : 'TERVERIFIKASI PJ SHIFT'
                            : activePatientSubmission.status === 'diajukan'
                            ? activePatientSubmission.targetRole === 'kepala_ruangan'
                              ? 'MENUNGGU VERIFIKASI KEPALA RUANG'
                              : activeRole === 'pj_shift'
                              ? 'MENUNGGU VERIFIKASI PJ SHIFT LAINNYA'
                              : 'MENUNGGU VERIFIKASI PJ SHIFT'
                            : 'BELUM DIAJUKAN'}
                        </span>
                        <span className="text-slate-300" aria-hidden="true">
                          &middot;
                        </span>
                        <span className="text-slate-700 font-semibold">
                          Pasien: {openedPatient.patientName} ({openedPatient.bedNumber})
                        </span>
                        <span className="text-slate-300" aria-hidden="true">
                          &middot;
                        </span>
                        <span className="text-slate-600 font-medium tabular-nums">
                          Capaian SPO: {activePatientOverallStats.completed}/
                          {activePatientOverallStats.total} ({activePatientOverallStats.pct}%)
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug">
                        {activePatientSubmission.status === 'terverifikasi'
                          ? `Logbook pasien ${openedPatient.patientName} telah diverifikasi oleh ${activePatientSubmission.verifiedBy || activePatientSubmission.targetVerifierName} (${activePatientSubmission.verifiedByRole || 'Verifikator'}) pada ${activePatientSubmission.verifiedAt} dan tercatat pada halaman Riwayat.`
                          : activePatientSubmission.status === 'diajukan'
                          ? `Pengajuan verifikasi logbook pasien ${openedPatient.patientName} telah dikirim oleh ${currentNurse.name} kepada ${activePatientSubmission.targetRole === 'kepala_ruangan' ? 'Kepala Ruang' : activeRole === 'pj_shift' ? 'PJ Shift lainnya' : 'PJ Shift'} (${activePatientSubmission.targetVerifierName}) pada ${activePatientSubmission.submittedAt}.`
                          : activeRole === 'pj_shift'
                          ? `PJ Shift dapat mengajukan verifikasi logbook pasien ${openedPatient.patientName} kepada Kepala Ruang atau kepada PJ Shift lainnya.`
                          : activeRole === 'kepala_ruangan'
                          ? `Kepala Ruang dapat mengajukan verifikasi logbook pasien ${openedPatient.patientName} kepada Kepala Ruang itu sendiri atau kepada PJ Shift.`
                          : `Periksa kelengkapan pengisian SPO Bagian I–VI untuk pasien ${openedPatient.patientName} di bawah ini, lalu ajukan verifikasi kepada PJ Shift.`}
                      </p>
                    </div>

                    {activePatientSubmission.status !== 'belum_diajukan' && (
                      <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/90 text-slate-800 border border-slate-300 shadow-2xs font-bold text-xs whitespace-nowrap shrink-0 self-start sm:self-center">
                        <Lock className="w-3.5 h-3.5 shrink-0 text-[#19588f]" />
                        <span>Logbook Terkunci (Hanya-Baca)</span>
                      </div>
                    )}
                  </div>

                  {/* 2. Rekapitulasi Kelengkapan SPO Bagian I – Bagian VI Khusus Pasien Ini */}
                  <div className="bg-white rounded-[14px] border border-slate-200 overflow-hidden">
                    <div className="px-4 sm:px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-950">
                          Rekapitulasi Kelengkapan Logbook Pasien: {openedPatient.patientName} (
                          {openedPatient.bedNumber})
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Klik tombol Tinjau untuk memeriksa atau melengkapi indikator SPO Bagian
                          I–VI pasien ini sebelum pengajuan verifikasi.
                        </p>
                      </div>
                      <span className="text-xs font-bold text-slate-900 font-mono tabular-nums">
                        Total Pasien Ini: {activePatientOverallStats.completed}/
                        {activePatientOverallStats.total} ({activePatientOverallStats.pct}%)
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/70">
                            <th className="py-2.5 px-4 sm:px-5 font-semibold">Bagian Logbook</th>
                            <th className="py-2.5 px-3 font-semibold">Cakupan Standar SPO</th>
                            <th className="py-2.5 px-3 font-semibold text-right">Capaian SPO</th>
                            <th className="py-2.5 px-4 sm:px-5 font-semibold text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {[
                            {
                              num: 1,
                              roman: 'BAGIAN I',
                              label: 'Kesiapan Fasilitas Ruangan & Water Treatment (RO)',
                              stat: activePatientOverallStats.facility
                            },
                            {
                              num: 2,
                              roman: 'BAGIAN II',
                              label: 'Persiapan Perawat, Mesin HD & Alkes (Pre-HD)',
                              stat: activePatientOverallStats.b2
                            },
                            {
                              num: 3,
                              roman: 'BAGIAN III',
                              label: 'Identifikasi Pasien, Pengkajian Pre-HD & Keselamatan',
                              stat: activePatientOverallStats.b3
                            },
                            {
                              num: 4,
                              roman: 'BAGIAN IV',
                              label: 'Monitoring Intra-HD & Pencegahan IKP',
                              stat: activePatientOverallStats.b4
                            },
                            {
                              num: 5,
                              roman: 'BAGIAN V',
                              label: 'Edukasi Terstruktur Pasien & Keluarga',
                              stat: activePatientOverallStats.b5
                            },
                            {
                              num: 6,
                              roman: 'BAGIAN VI',
                              label: 'Terminasi Aman, Evaluasi Post-HD & Dokumentasi',
                              stat: activePatientOverallStats.b6
                            }
                          ].map((row) => (
                            <tr key={row.num} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-4 sm:px-5 font-bold text-[#19588f] whitespace-nowrap">
                                {row.roman}
                              </td>
                              <td className="py-2.5 px-3 text-slate-800 font-medium">
                                {row.label}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums whitespace-nowrap">
                                <span
                                  className={
                                    row.stat.completed === row.stat.total
                                      ? 'text-[#0e7876]'
                                      : 'text-amber-700'
                                  }
                                >
                                  {row.stat.completed}/{row.stat.total} SPO ({row.stat.pct}%)
                                </span>
                              </td>
                              <td className="py-2.5 px-4 sm:px-5 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => setSelectedBagian(row.num)}
                                  className="text-[#19588f] hover:underline font-semibold underline-offset-2 cursor-pointer"
                                >
                                  Tinjau
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 3. Formulir Pengajuan Verifikasi Pasien Sesuai Hak Akses ATAU Kartu Status Terkunci */}
                  {activePatientSubmission.status === 'diajukan' ||
                  activePatientSubmission.status === 'terverifikasi' ? (
                    <div className="bg-white rounded-[14px] border border-slate-200 p-5 space-y-4">
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`p-2.5 rounded-xl shrink-0 ${
                            activePatientSubmission.status === 'terverifikasi'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-[#19588f]'
                          }`}
                        >
                          <Lock className="w-6 h-6" />
                        </div>
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                              {activePatientSubmission.status === 'terverifikasi'
                                ? 'Logbook Pasien Ini Telah Terverifikasi Resmi'
                                : 'Logbook Pasien Ini Sedang Menunggu Verifikasi'}
                            </h3>
                            <span
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                activePatientSubmission.status === 'terverifikasi'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              Status: Terkunci
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                            {activePatientSubmission.status === 'terverifikasi'
                              ? `Logbook untuk pasien ${openedPatient.patientName} (${openedPatient.bedNumber}) telah disahkan oleh ${
                                  activePatientSubmission.verifiedBy || activePatientSubmission.targetVerifierName
                                } (${activePatientSubmission.verifiedByRole || 'Verifikator'}) pada ${
                                  activePatientSubmission.verifiedAt || '-'
                                }. Logbook ini terkunci dan tidak dapat diedit lagi. Data hanya dapat diedit kembali jika verifikator meminta perbaikan.`
                              : `Pengajuan verifikasi telah terkirim kepada ${
                                  activePatientSubmission.targetRole === 'kepala_ruangan'
                                    ? 'Kepala Ruang'
                                    : 'PJ Shift'
                                } (${activePatientSubmission.targetVerifierName}) pada ${
                                  activePatientSubmission.submittedAt || '-'
                                }. Selama menunggu verifikasi, seluruh data logbook terkunci dan tidak bisa diedit. Data hanya bisa diedit kembali jika verifikator meminta perbaikan.`}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-[11px] text-slate-500 font-medium">Perawat Pengaju:</span>
                          <div className="font-bold text-slate-900 mt-0.5">
                            {activePatientSubmission.submittedNurseName || currentNurse.name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            NIP: {activePatientSubmission.submittedNurseNip || currentNurse.nip} &middot;{' '}
                            {formatSystemAccessLabel(activeRole)}
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-[11px] text-slate-500 font-medium">
                            {activePatientSubmission.status === 'terverifikasi'
                              ? 'Diverifikasi Oleh:'
                              : 'Verifikator Tujuan:'}
                          </span>
                          <div className="font-bold text-slate-900 mt-0.5">
                            {activePatientSubmission.status === 'terverifikasi'
                              ? activePatientSubmission.verifiedBy || activePatientSubmission.targetVerifierName
                              : activePatientSubmission.targetVerifierName}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {activePatientSubmission.targetRole === 'kepala_ruangan'
                              ? 'Kepala Ruangan'
                              : 'PJ Shift'}{' '}
                            &middot; Shift {activeShift}
                          </div>
                        </div>
                      </div>

                      {activePatientSubmission.notes && (
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                          <span className="text-[11px] text-slate-500 font-medium">Catatan Pengajuan:</span>
                          <p className="text-slate-800 font-medium mt-0.5 leading-relaxed">
                            {activePatientSubmission.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white rounded-[14px] border border-slate-200 p-4 sm:p-5 space-y-4">
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-950">
                          {activePatientSubmission.verifierNotes
                            ? `Formulir Pengajuan Kembali Verifikasi Pasien (${openedPatient.patientName})`
                            : activeRole === 'pj_shift'
                            ? `Formulir Pengajuan Verifikasi Logbook Pasien (${openedPatient.patientName})`
                            : activeRole === 'kepala_ruangan'
                            ? `Formulir Pengajuan Verifikasi Logbook Pasien (${openedPatient.patientName})`
                            : `Formulir Pengajuan Verifikasi Pasien (${openedPatient.patientName}) kepada PJ Shift`}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {activePatientSubmission.verifierNotes
                            ? 'Perbaikan telah dapat dilakukan. Setelah memastikan kelengkapan indikator SPO pasien, ajukan kembali logbook ini untuk diverifikasi ulang.'
                            : activeRole === 'pj_shift'
                            ? 'PJ Shift dapat mengajukan verifikasi logbook pasien ini kepada Kepala Ruang atau kepada PJ Shift lainnya. Setelah diverifikasi, data pasien ini tercatat pada halaman Riwayat & Laporan Harian.'
                            : activeRole === 'kepala_ruangan'
                            ? 'Kepala Ruang dapat mengajukan verifikasi logbook pasien ini kepada Kepala Ruang itu sendiri atau kepada PJ Shift. Setelah diverifikasi, data pasien ini tercatat pada halaman Riwayat & Laporan Harian.'
                            : 'Logbook pasien ini diajukan kepada PJ Shift. Setelah diverifikasi oleh PJ Shift, data pasien ini tercatat pada halaman Riwayat & Laporan Harian.'}
                        </p>
                      </div>

                      {/* Selector Tujuan Verifikasi Khusus PJ Shift */}
                      {activeRole === 'pj_shift' &&
                        activePatientSubmission.status === 'belum_diajukan' && (
                          <div className="bg-[#f0f6fc] border border-[#cbe0f0] rounded-xl p-3.5 space-y-2">
                            <label className="block text-xs font-bold text-slate-900">
                              Pilih Tujuan Pengajuan Verifikasi Logbook PJ Shift:
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <button
                                type="button"
                                disabled={!isToday}
                                onClick={() =>
                                  updateActivePatientSubmission((prev) => ({
                                    ...prev,
                                    targetRole: 'kepala_ruangan',
                                    targetVerifierName: defaultKaruNurse.name,
                                    targetVerifierNip: defaultKaruNurse.nip
                                  }))
                                }
                                className={`p-3 rounded-lg border text-left transition-colors ${
                                  !isToday ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                                } ${
                                  activePatientSubmission.targetRole === 'kepala_ruangan' ||
                                  activePatientSubmission.targetRole === 'mandiri'
                                    ? 'bg-white border-[#19588f] ring-1 ring-[#19588f]/30 text-slate-950 font-bold'
                                    : 'bg-white/60 border-slate-200 text-slate-700 font-medium hover:bg-white'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <CheckCircle2
                                    className={`w-4 h-4 shrink-0 ${
                                      activePatientSubmission.targetRole === 'kepala_ruangan' ||
                                      activePatientSubmission.targetRole === 'mandiri'
                                        ? 'text-[#19588f]'
                                        : 'text-slate-300'
                                    }`}
                                  />
                                  <span className="text-xs">Ajukan kepada Kepala Ruang</span>
                                </div>
                                <p className="text-[11px] text-slate-500 font-normal mt-1 pl-6">
                                  Masuk ke halaman Verifikasi Kepala Ruang untuk diverifikasi oleh
                                  Kepala Ruang.
                                </p>
                              </button>

                              <button
                                type="button"
                                disabled={!isToday}
                                onClick={() =>
                                  updateActivePatientSubmission((prev) => ({
                                    ...prev,
                                    targetRole: 'pj_shift',
                                    targetVerifierName: defaultOtherPjShiftNurse.name,
                                    targetVerifierNip: defaultOtherPjShiftNurse.nip,
                                    pjShiftName: defaultOtherPjShiftNurse.name,
                                    pjShiftNip: defaultOtherPjShiftNurse.nip
                                  }))
                                }
                                className={`p-3 rounded-lg border text-left transition-colors ${
                                  !isToday ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                                } ${
                                  activePatientSubmission.targetRole === 'pj_shift'
                                    ? 'bg-white border-[#19588f] ring-1 ring-[#19588f]/30 text-slate-950 font-bold'
                                    : 'bg-white/60 border-slate-200 text-slate-700 font-medium hover:bg-white'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <CheckCircle2
                                    className={`w-4 h-4 shrink-0 ${
                                      activePatientSubmission.targetRole === 'pj_shift'
                                        ? 'text-[#19588f]'
                                        : 'text-slate-300'
                                    }`}
                                  />
                                  <span className="text-xs">Ajukan kepada PJ Shift Lainnya</span>
                                </div>
                                <p className="text-[11px] text-slate-500 font-normal mt-1 pl-6">
                                  Masuk ke halaman Verifikasi PJ Shift tujuan (rekan PJ Shift lain)
                                  untuk diverifikasi.
                                </p>
                              </button>
                            </div>
                          </div>
                        )}

                      {/* Selector Tujuan Verifikasi Khusus Kepala Ruangan */}
                      {activeRole === 'kepala_ruangan' &&
                        activePatientSubmission.status === 'belum_diajukan' && (
                          <div className="bg-[#f0f6fc] border border-[#cbe0f0] rounded-xl p-3.5 space-y-2">
                            <label className="block text-xs font-bold text-slate-900">
                              Pilih Tujuan Pengajuan Verifikasi Logbook Kepala Ruang:
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <button
                                type="button"
                                disabled={!isToday}
                                onClick={() =>
                                  updateActivePatientSubmission((prev) => ({
                                    ...prev,
                                    targetRole: 'kepala_ruangan',
                                    targetVerifierName: currentNurse.name,
                                    targetVerifierNip: currentNurse.nip
                                  }))
                                }
                                className={`p-3 rounded-lg border text-left transition-colors ${
                                  !isToday ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                                } ${
                                  activePatientSubmission.targetRole === 'kepala_ruangan' ||
                                  activePatientSubmission.targetRole === 'mandiri'
                                    ? 'bg-white border-[#19588f] ring-1 ring-[#19588f]/30 text-slate-950 font-bold'
                                    : 'bg-white/60 border-slate-200 text-slate-700 font-medium hover:bg-white'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <CheckCircle2
                                    className={`w-4 h-4 shrink-0 ${
                                      activePatientSubmission.targetRole === 'kepala_ruangan' ||
                                      activePatientSubmission.targetRole === 'mandiri'
                                        ? 'text-[#19588f]'
                                        : 'text-slate-300'
                                    }`}
                                  />
                                  <span className="text-xs">
                                    Ajukan kepada Kepala Ruang itu sendiri
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 font-normal mt-1 pl-6">
                                  Masuk ke halaman Verifikasi Kepala Ruang untuk diverifikasi oleh
                                  Kepala Ruang.
                                </p>
                              </button>

                              <button
                                type="button"
                                disabled={!isToday}
                                onClick={() =>
                                  updateActivePatientSubmission((prev) => ({
                                    ...prev,
                                    targetRole: 'pj_shift',
                                    targetVerifierName: defaultPjShiftNurse.name,
                                    targetVerifierNip: defaultPjShiftNurse.nip,
                                    pjShiftName: defaultPjShiftNurse.name,
                                    pjShiftNip: defaultPjShiftNurse.nip
                                  }))
                                }
                                className={`p-3 rounded-lg border text-left transition-colors ${
                                  !isToday ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                                } ${
                                  activePatientSubmission.targetRole === 'pj_shift'
                                    ? 'bg-white border-[#19588f] ring-1 ring-[#19588f]/30 text-slate-950 font-bold'
                                    : 'bg-white/60 border-slate-200 text-slate-700 font-medium hover:bg-white'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <CheckCircle2
                                    className={`w-4 h-4 shrink-0 ${
                                      activePatientSubmission.targetRole === 'pj_shift'
                                        ? 'text-[#19588f]'
                                        : 'text-slate-300'
                                    }`}
                                  />
                                  <span className="text-xs">Ajukan kepada PJ Shift</span>
                                </div>
                                <p className="text-[11px] text-slate-500 font-normal mt-1 pl-6">
                                  Masuk ke halaman Verifikasi PJ Shift tujuan untuk diverifikasi oleh
                                  PJ Shift.
                                </p>
                              </button>
                            </div>
                          </div>
                        )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Pengaju */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            {activeRole === 'pj_shift'
                              ? 'PJ Shift Pengaju'
                              : activeRole === 'kepala_ruangan'
                              ? 'Kepala Ruang Pengaju'
                              : 'Perawat Pelaksana Pengaju'}
                          </label>
                          <input
                            type="text"
                            readOnly
                            value={currentNurse.name}
                            className="w-full bg-slate-100/80 text-slate-900 text-xs sm:text-sm font-semibold border border-slate-300 rounded-xl px-3 py-2.5 cursor-not-allowed"
                          />
                          <div className="mt-1 text-[11px] text-slate-500 font-mono tabular-nums">
                            NIP/NIRA: {currentNurse.nip} &middot; Role:{' '}
                            {formatSystemAccessLabel(activeRole)}
                          </div>
                        </div>

                        {/* Penerima / Target Verifikasi */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            {activeRole === 'pj_shift'
                              ? activePatientSubmission.targetRole === 'pj_shift'
                                ? 'PJ Shift Lainnya Tujuan Verifikasi'
                                : 'Kepala Ruang Tujuan Verifikasi'
                              : activeRole === 'kepala_ruangan'
                              ? activePatientSubmission.targetRole === 'pj_shift'
                                ? 'PJ Shift Tujuan Verifikasi'
                                : 'Kepala Ruang Tujuan Verifikasi (Diri Sendiri)'
                              : 'PJ Shift Tujuan Verifikasi'}
                          </label>

                          {activeRole === 'kepala_ruangan' &&
                          activePatientSubmission.targetRole !== 'pj_shift' ? (
                            <input
                              type="text"
                              readOnly
                              value={`${currentNurse.name} (Kepala Ruang)`}
                              className="w-full bg-[#e8f3fb] text-slate-950 text-xs sm:text-sm font-semibold border border-[#19588f]/35 rounded-xl px-3 py-2.5 cursor-not-allowed"
                            />
                          ) : activeRole === 'pj_shift' &&
                            activePatientSubmission.targetRole === 'pj_shift' ? (
                            <select
                              disabled={!isToday || activePatientSubmission.status !== 'belum_diajukan'}
                              value={
                                activePatientSubmission.targetVerifierName &&
                                activePatientSubmission.targetVerifierName !== '-' &&
                                !isMatchingNurse(
                                  activePatientSubmission.targetVerifierName,
                                  currentNurse.name
                                )
                                  ? activePatientSubmission.targetVerifierName
                                  : defaultOtherPjShiftNurse.name !== '-'
                                  ? defaultOtherPjShiftNurse.name
                                  : ''
                              }
                              onChange={(e) => {
                                const selected = otherPjShiftOptions.find(
                                  (opt) => opt.name === e.target.value
                                );
                                updateActivePatientSubmission((prev) => ({
                                  ...prev,
                                  targetRole: 'pj_shift',
                                  targetVerifierName: e.target.value,
                                  targetVerifierNip: selected?.nip || prev.targetVerifierNip,
                                  pjShiftName: e.target.value,
                                  pjShiftNip: selected?.nip || prev.pjShiftNip
                                }));
                              }}
                              className="w-full bg-slate-50 focus:bg-white disabled:opacity-75 disabled:cursor-not-allowed text-slate-900 text-xs sm:text-sm font-semibold border border-slate-300 focus:border-[#19588f] rounded-xl px-3 py-2.5 focus:outline-hidden"
                            >
                              {otherPjShiftOptions.length === 0 ? (
                                <option value="">
                                  -- Belum ada akun PJ Shift lainnya di Data Perawat --
                                </option>
                              ) : (
                                otherPjShiftOptions.map((opt) => (
                                  <option key={opt.name} value={opt.name}>
                                    {opt.name}
                                    {opt.shift ? ` (Shift ${opt.shift})` : ''}
                                  </option>
                                ))
                              )}
                            </select>
                          ) : activeRole === 'pj_shift' ? (
                            <select
                              disabled={!isToday || activePatientSubmission.status !== 'belum_diajukan'}
                              value={
                                activePatientSubmission.targetVerifierName &&
                                activePatientSubmission.targetVerifierName !== '-'
                                  ? activePatientSubmission.targetVerifierName
                                  : defaultKaruNurse.name !== '-'
                                  ? defaultKaruNurse.name
                                  : ''
                              }
                              onChange={(e) => {
                                const selected = kepalaRuangOptions.find(
                                  (opt) => opt.name === e.target.value
                                );
                                updateActivePatientSubmission((prev) => ({
                                  ...prev,
                                  targetRole: 'kepala_ruangan',
                                  targetVerifierName: e.target.value,
                                  targetVerifierNip: selected?.nip || prev.targetVerifierNip
                                }));
                              }}
                              className="w-full bg-slate-50 focus:bg-white disabled:opacity-75 disabled:cursor-not-allowed text-slate-900 text-xs sm:text-sm font-semibold border border-slate-300 focus:border-[#19588f] rounded-xl px-3 py-2.5 focus:outline-hidden"
                            >
                              {kepalaRuangOptions.length === 0 ? (
                                <option value="">
                                  -- Belum ada akun Kepala Ruang di Data Perawat --
                                </option>
                              ) : (
                                kepalaRuangOptions.map((opt) => (
                                  <option key={opt.name} value={opt.name}>
                                    {opt.name}
                                  </option>
                                ))
                              )}
                            </select>
                          ) : (
                            <select
                              disabled={!isToday || activePatientSubmission.status !== 'belum_diajukan'}
                              value={
                                activePatientSubmission.targetVerifierName &&
                                activePatientSubmission.targetVerifierName !== '-'
                                  ? activePatientSubmission.targetVerifierName
                                  : defaultPjShiftNurse.name !== '-'
                                  ? defaultPjShiftNurse.name
                                  : ''
                              }
                              onChange={(e) => {
                                const selected = pjShiftOptions.find(
                                  (opt) => opt.name === e.target.value
                                );
                                updateActivePatientSubmission((prev) => ({
                                  ...prev,
                                  targetRole: 'pj_shift',
                                  targetVerifierName: e.target.value,
                                  targetVerifierNip: selected?.nip || prev.targetVerifierNip,
                                  pjShiftName: e.target.value,
                                  pjShiftNip: selected?.nip || prev.pjShiftNip
                                }));
                              }}
                              className="w-full bg-slate-50 focus:bg-white disabled:opacity-75 disabled:cursor-not-allowed text-slate-900 text-xs sm:text-sm font-semibold border border-slate-300 focus:border-[#19588f] rounded-xl px-3 py-2.5 focus:outline-hidden"
                            >
                              {pjShiftOptions.length === 0 ? (
                                <option value="">
                                  -- Belum ada akun PJ Shift di Data Perawat --
                                </option>
                              ) : (
                                pjShiftOptions.map((opt) => (
                                  <option key={opt.name} value={opt.name}>
                                    {opt.name}
                                    {opt.shift ? ` (Shift ${opt.shift})` : ''}
                                  </option>
                                ))
                              )}
                            </select>
                          )}

                          <div className="mt-1 text-[11px] text-slate-500 font-mono tabular-nums">
                            NIP/NIRA: {activePatientSubmission.targetVerifierNip || '-'} &middot;
                            Shift {activeShift}
                          </div>
                        </div>
                      </div>

                      {/* Catatan Pengajuan Opsional */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Catatan Pengajuan / Operan Verifikasi Pasien Ini (Opsional)
                        </label>
                        <textarea
                          rows={2}
                          disabled={!isToday || activePatientSubmission.status !== 'belum_diajukan'}
                          value={activePatientSubmission.notes}
                          onChange={(e) =>
                            updateActivePatientSubmission((prev) => ({
                              ...prev,
                              notes: e.target.value
                            }))
                          }
                          placeholder={
                            !isToday
                              ? 'Mode hanya-baca (pengisian dibatasi hanya pada hari yang sama)'
                              : `Catatan tambahan terkait asuhan HD pasien ${openedPatient.patientName} (jika ada)...`
                          }
                          className="w-full bg-slate-50 focus:bg-white disabled:opacity-75 disabled:cursor-not-allowed text-slate-900 text-xs sm:text-sm border border-slate-300 focus:border-[#19588f] rounded-xl px-3.5 py-2.5 focus:outline-hidden resize-none"
                        />
                      </div>

                      {/* Pernyataan Konfirmasi */}
                      <button
                        type="button"
                        disabled={!isToday || activePatientSubmission.status !== 'belum_diajukan'}
                        onClick={() =>
                          updateActivePatientSubmission((prev) => ({
                            ...prev,
                            declarationChecked: !prev.declarationChecked
                          }))
                        }
                        className={`w-full px-4 py-3 rounded-xl border text-left flex items-center gap-3 transition-colors ${
                          !isToday || activePatientSubmission.status !== 'belum_diajukan'
                            ? 'opacity-80 cursor-not-allowed'
                            : 'cursor-pointer'
                        } ${
                          activePatientSubmission.declarationChecked
                            ? 'bg-emerald-50/60 border-emerald-300 text-slate-900'
                            : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
                            activePatientSubmission.declarationChecked
                              ? 'bg-[#0e7876] border-[#0e7876] text-white'
                              : 'bg-white border-slate-300 text-transparent'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </span>
                        <span className="text-xs sm:text-sm font-semibold leading-snug">
                          {activeRole === 'pj_shift'
                            ? activePatientSubmission.targetRole === 'pj_shift'
                              ? `Seluruh pengisian indikator SPO Bagian I–VI untuk pasien ${openedPatient.patientName} telah diperiksa dan siap diajukan untuk diverifikasi oleh PJ Shift lainnya.`
                              : `Seluruh pengisian indikator SPO Bagian I–VI untuk pasien ${openedPatient.patientName} telah diperiksa dan siap diajukan untuk diverifikasi oleh Kepala Ruang.`
                            : activeRole === 'kepala_ruangan'
                            ? `Seluruh pengisian indikator SPO Bagian I–VI untuk pasien ${openedPatient.patientName} telah diperiksa dan siap diajukan untuk verifikasi.`
                            : `Seluruh pengisian indikator SPO Bagian I–VI untuk pasien ${openedPatient.patientName} telah diperiksa dan siap diajukan untuk diverifikasi oleh PJ Shift.`}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Banner Status Terkunci / Diminta Perbaikan di dalam Bagian I–VI */}
                  {isToday && hasCurrentPatientRevisionRequest && (
                    <div className="rounded-[14px] border-2 border-amber-400 bg-amber-50/95 p-3.5 sm:p-4 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1 flex-1 min-w-0 text-xs text-amber-950">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-xs sm:text-sm">
                            Logbook Dibuka Kembali untuk Perbaikan
                          </span>
                          <span className="text-[11px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md">
                            Dapat Diedit Kembali
                          </span>
                        </div>
                        <p className="font-semibold leading-relaxed">
                          Catatan {activePatientSubmission.revisionRequestedByRole || 'Verifikator'}
                          {activePatientSubmission.revisionRequestedBy
                            ? ` (${activePatientSubmission.revisionRequestedBy})`
                            : ''}
                          :{' '}
                          {currentPatientLock.verifierNotes ||
                            'Mohon periksa dan perbaiki kembali kelengkapan SPO pasien ini.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {isToday && isActiveBagianLocked && (
                    <div
                      className={`rounded-[14px] border p-3.5 sm:p-4 flex items-start gap-3 ${
                        isCurrentPatientVerified
                          ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                          : 'bg-blue-50/90 border-blue-300 text-blue-950'
                      }`}
                    >
                      <Lock
                        className={`w-5 h-5 shrink-0 mt-0.5 ${
                          isCurrentPatientVerified ? 'text-emerald-700' : 'text-blue-700'
                        }`}
                      />
                      <div className="space-y-1 flex-1 min-w-0 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-xs sm:text-sm">
                            {isCurrentPatientVerified
                              ? 'Logbook Sudah Diverifikasi — Tidak Dapat Diedit Lagi'
                              : 'Logbook Sedang Menunggu Verifikasi — Tidak Dapat Diedit Lagi'}
                          </span>
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                              isCurrentPatientVerified
                                ? 'bg-emerald-200 text-emerald-900'
                                : 'bg-blue-200 text-blue-900'
                            }`}
                          >
                            Mode Hanya-Baca
                          </span>
                        </div>
                        <p className="leading-relaxed opacity-90">
                          Seluruh checklist SPO dan data klinis pada Bagian I–VI terkunci. Logbook
                          ini baru dapat diedit kembali apabila verifikator (PJ Shift atau Kepala
                          Ruang) meminta perbaikan kembali pada halaman Verifikasi.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Compact Inline Identity Card inside Scroll Area for Bagian II–VI */}
                  {activeMeta.isPatientSpecific && (
                    <div className="bg-white p-3.5 sm:p-4 rounded-[14px] border border-slate-200 space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            No. Bed / Mesin HD
                          </label>
                          <select
                            disabled={!isToday || isCurrentPatientLocked}
                            value={activePatient.bedNumber}
                            onChange={(e) => handleUpdateActivePatient('bedNumber', e.target.value)}
                            className="w-full bg-slate-50 focus:bg-white disabled:opacity-75 disabled:cursor-not-allowed text-slate-900 text-xs font-semibold border border-slate-300 focus:border-[#19588f] rounded-lg px-2.5 py-2 focus:outline-hidden tabular-nums"
                          >
                            {availableBedOptions.map((bedOpt) => {
                              const usedOther = managedPatients.some(
                                (other) =>
                                  other.id !== activePatient.id && other.bedNumber === bedOpt
                              );
                              return (
                                <option key={bedOpt} value={bedOpt} disabled={usedOther}>
                                  {bedOpt}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <div className="sm:col-span-5">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Nama Pasien
                          </label>
                          <input
                            type="text"
                            readOnly={!isToday || isCurrentPatientLocked}
                            disabled={!isToday || isCurrentPatientLocked}
                            value={activePatient.patientName}
                            onChange={(e) =>
                              handleUpdateActivePatient('patientName', e.target.value)
                            }
                            placeholder="Nama pasien..."
                            className="w-full bg-slate-50 focus:bg-white disabled:opacity-75 disabled:cursor-not-allowed text-slate-900 text-xs font-semibold border border-slate-300 focus:border-[#19588f] rounded-lg px-3 py-2 focus:outline-hidden"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            No. Rekam Medis
                          </label>
                          <input
                            type="text"
                            readOnly={!isToday || isCurrentPatientLocked}
                            disabled={!isToday || isCurrentPatientLocked}
                            value={activePatient.medicalRecord || ''}
                            onChange={(e) =>
                              handleUpdateActivePatient('medicalRecord', e.target.value)
                            }
                            placeholder="No. RM"
                            className="w-full bg-slate-50 focus:bg-white disabled:opacity-75 disabled:cursor-not-allowed text-slate-800 text-xs font-mono tabular-nums font-semibold border border-slate-300 focus:border-[#19588f] rounded-lg px-2.5 py-2 focus:outline-hidden"
                          />
                        </div>

                        <div className="sm:col-span-2 flex items-center justify-end">
                          <button
                            type="button"
                            disabled={!isToday || isCurrentPatientLocked}
                            onClick={() => handleRemovePatient(activePatient.id)}
                            className={`text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                              !isToday || isCurrentPatientLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                            title={
                              !isToday
                                ? 'Pengisian logbook dibatasi hanya pada hari yang sama'
                                : isCurrentPatientLocked
                                ? 'Pasien tidak dapat dihapus karena logbook sedang menunggu verifikasi atau sudah terverifikasi'
                                : 'Hapus pasien ini dari daftar logbook shift'
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Header Status Bar & Bulk Actions inside Body */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 px-0.5">
                    <div>
                      <span className="font-bold text-slate-900">
                        Daftar Indikator Standar Prosedur Operasional (SPO)
                      </span>
                      {activeMeta.isPatientSpecific && (
                        <span className="text-[#19588f] font-semibold ml-1.5">
                          &mdash; {activePatient.bedNumber} (
                          {activePatient.patientName || 'Nama belum diisi'})
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-800 tabular-nums mr-1">
                        {activeMeta.isPatientSpecific
                          ? `${getPatientBagianStats(selectedBagian, activePatient.id).completed}/${getPatientBagianStats(selectedBagian, activePatient.id).total} Dilaksanakan`
                          : `${getFacilityBagianStats().completed}/${getFacilityBagianStats().total} Dilaksanakan`}
                      </span>

                      <button
                        type="button"
                        disabled={!isToday || isActiveBagianLocked}
                        onClick={() => handleSetBagianChecklists(selectedBagian, true)}
                        className={`px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#0e7876] border border-emerald-200 font-semibold text-[11px] flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
                          !isToday || isActiveBagianLocked
                            ? 'opacity-40 cursor-not-allowed'
                            : 'cursor-pointer'
                        }`}
                        title={
                          !isToday
                            ? 'Pengisian logbook dibatasi hanya pada hari yang sama'
                            : isActiveBagianLocked
                            ? getLockToastMessage(currentPatientLock.submission?.status)
                            : undefined
                        }
                      >
                        <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                        <span>Semua Dilaksanakan</span>
                      </button>

                      <button
                        type="button"
                        disabled={!isToday || isActiveBagianLocked}
                        onClick={() => handleSetBagianChecklists(selectedBagian, false)}
                        className={`px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 font-semibold text-[11px] flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
                          !isToday || isActiveBagianLocked
                            ? 'opacity-40 cursor-not-allowed'
                            : 'cursor-pointer'
                        }`}
                        title={
                          !isToday
                            ? 'Pengisian logbook dibatasi hanya pada hari yang sama'
                            : isActiveBagianLocked
                            ? getLockToastMessage(currentPatientLock.submission?.status)
                            : undefined
                        }
                      >
                        <RotateCcw className="w-3 h-3 shrink-0" />
                        <span>Reset Bagian</span>
                      </button>
                    </div>
                  </div>

                  {/* SPO Items List */}
                  <div className="space-y-2.5">
                    {getBagianItems(selectedBagian).map((item) => {
                      const isFacility = selectedBagian === 1;
                      const isChecked = isFacility
                        ? Boolean(facilityStatuses[item.code])
                        : Boolean(
                            patientStatuses[activePatient.id] &&
                              patientStatuses[activePatient.id][item.code]
                          );

                      const currentNote = isFacility
                        ? facilityNotes[item.code] || ''
                        : (patientNotes[activePatient.id] &&
                            patientNotes[activePatient.id][item.code]) ||
                          '';

                      return (
                        <div
                          key={item.code}
                          className={`bg-white rounded-[14px] border p-3 sm:p-3.5 transition-colors ${
                            isChecked
                              ? 'border-emerald-200/90'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {/* Top Row: Code + Description + Guide + Actions */}
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                <span className="font-mono font-bold text-slate-900 tabular-nums">
                                  Poin {item.code}
                                </span>
                                <span aria-hidden="true">&middot;</span>
                                <span className="font-semibold text-[#19588f]">
                                  {item.category}
                                </span>
                              </div>

                              <p className="text-xs sm:text-sm font-bold text-slate-950 leading-snug">
                                {item.description}
                              </p>

                              {item.simpleGuide && (
                                <p className="text-xs text-slate-600 leading-relaxed">
                                  {item.simpleGuide}
                                </p>
                              )}

                              {/* Unboxed Standar Mutu Metadata (Zero-Pill Discipline) */}
                              {item.keyMetrics &&
                                item.keyMetrics.length > 0 &&
                                item.code !== '2.1' && (
                                  <p className="pt-0.5 text-[11px] text-slate-500 leading-relaxed">
                                    <strong className="font-semibold text-slate-700">
                                      Standar:
                                    </strong>{' '}
                                    {item.keyMetrics.join(' · ')}
                                  </p>
                                )}
                            </div>

                            {/* Right Action Cluster: SPO Checkbox */}
                            <div className="flex items-center justify-end gap-2 shrink-0">
                              <button
                                type="button"
                                disabled={!isToday || isActiveBagianLocked}
                                onClick={() => handleToggleItem(item.code)}
                                title={
                                  isActiveBagianLocked
                                    ? getLockToastMessage(currentPatientLock.submission?.status)
                                    : undefined
                                }
                                className={`px-3.5 py-2 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                                  !isToday || isActiveBagianLocked
                                    ? 'opacity-60 cursor-not-allowed'
                                    : 'cursor-pointer'
                                } ${
                                  isChecked
                                    ? 'bg-[#0e7876] text-white hover:bg-[#0b6361]'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                                }`}
                              >
                                {isChecked ? (
                                  <>
                                    <Check className="w-4 h-4 stroke-[2.5] shrink-0" />
                                    <span>DILAKSANAKAN</span>
                                  </>
                                ) : (
                                  <>
                                    <Square className="w-4 h-4 text-slate-400 shrink-0" />
                                    <span>Belum Dilaksanakan</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* ===================================================================== */}
                          {/* KHUSUS BAGIAN II - POIN 2.1: HAND HYGIENE & PENGGUNAAN APD            */}
                          {/* ===================================================================== */}
                          {item.code === '2.1' && (
                            <div className="mt-3 pt-3 border-t border-slate-200/80">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <button
                                  type="button"
                                  disabled={!isToday || isActiveBagianLocked}
                                  onClick={() =>
                                    updatePoin2_1({
                                      apd: poin2_1Counts.apdChecked,
                                      cuciTangan: !poin2_1Counts.handwashChecked
                                    })
                                  }
                                  className={`min-h-[46px] px-3.5 py-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-colors ${
                                    !isToday || isActiveBagianLocked
                                      ? 'opacity-60 cursor-not-allowed'
                                      : 'cursor-pointer'
                                  } ${
                                    poin2_1Counts.handwashChecked
                                      ? 'bg-emerald-50/70 border-emerald-300 text-slate-900'
                                      : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 text-slate-700'
                                  }`}
                                >
                                  <span
                                    className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
                                      poin2_1Counts.handwashChecked
                                        ? 'bg-[#0e7876] border-[#0e7876] text-white'
                                        : 'bg-white border-slate-300 text-transparent'
                                    }`}
                                  >
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </span>
                                  <Hand className="w-4 h-4 text-[#19588f] shrink-0" />
                                  <span className="text-xs font-bold leading-snug">
                                    HAND HYGIENE
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  disabled={!isToday || isActiveBagianLocked}
                                  onClick={() =>
                                    updatePoin2_1({
                                      apd: !poin2_1Counts.apdChecked,
                                      cuciTangan: poin2_1Counts.handwashChecked
                                    })
                                  }
                                  className={`min-h-[46px] px-3.5 py-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-colors ${
                                    !isToday || isActiveBagianLocked
                                      ? 'opacity-60 cursor-not-allowed'
                                      : 'cursor-pointer'
                                  } ${
                                    poin2_1Counts.apdChecked
                                      ? 'bg-emerald-50/70 border-emerald-300 text-slate-900'
                                      : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 text-slate-700'
                                  }`}
                                >
                                  <span
                                    className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
                                      poin2_1Counts.apdChecked
                                        ? 'bg-[#0e7876] border-[#0e7876] text-white'
                                        : 'bg-white border-slate-300 text-transparent'
                                    }`}
                                  >
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </span>
                                  <ShieldCheck className="w-4 h-4 text-[#19588f] shrink-0" />
                                  <span className="text-xs font-bold leading-snug">
                                    PENGGUNAAN APD
                                  </span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* ===================================================================== */}
                          {/* KHUSUS BAGIAN III - POIN 3.1: STATUS, RUANG RAWAT INAP & KATEGORI     */}
                          {/* ===================================================================== */}
                          {item.code === '3.1' && (
                            <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-3">
                              {/* Grid: 1. STATUS PELAYANAN | 2. KATEGORI PASIEN */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* KOLOM 1: STATUS PELAYANAN (RAWAT JALAN / RAWAT INAP) */}
                                <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/90 space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-[#19588f]" />
                                      STATUS PELAYANAN
                                    </label>
                                    <span
                                      className={`text-[10px] font-semibold uppercase tracking-wider ${
                                        activeClinical.poin3_1.status
                                          ? 'text-[#0e7876]'
                                          : 'text-slate-500'
                                      }`}
                                    >
                                      {activeClinical.poin3_1.status ? 'Terpilih' : 'Belum Dipilih'}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    {(
                                      [
                                        {
                                          id: 'RAWAT JALAN' as const,
                                          label: 'RAWAT JALAN',
                                          activeClass:
                                            'bg-[#0e7876] text-white border-[#0e7876] shadow-sm ring-2 ring-[#0e7876]/20',
                                          checkActiveClass: 'bg-white text-[#0e7876] border-white'
                                        },
                                        {
                                          id: 'RAWAT INAP' as const,
                                          label: 'RAWAT INAP',
                                          activeClass:
                                            'bg-[#19588f] text-white border-[#19588f] shadow-sm ring-2 ring-[#19588f]/20',
                                          checkActiveClass: 'bg-white text-[#19588f] border-white'
                                        }
                                      ] as const
                                    ).map((st) => {
                                      const isSelected = activeClinical.poin3_1.status === st.id;
                                      return (
                                        <button
                                          key={st.id}
                                          type="button"
                                          disabled={!isToday || isActiveBagianLocked}
                                          onClick={() =>
                                            updatePoin3_1({
                                              status: isSelected ? '' : st.id,
                                              ...(st.id === 'RAWAT JALAN' || isSelected
                                                ? { ruangRawatInap: '' }
                                                : {})
                                            })
                                          }
                                          className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border ${
                                            !isToday || isActiveBagianLocked
                                              ? 'opacity-65 cursor-not-allowed'
                                              : 'cursor-pointer'
                                          } ${
                                            isSelected
                                              ? st.activeClass
                                              : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                                          }`}
                                        >
                                          <span
                                            className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                                              isSelected
                                                ? st.checkActiveClass
                                                : 'bg-white border-slate-300 text-transparent'
                                            }`}
                                          >
                                            <Check className="w-3 h-3 stroke-[3]" />
                                          </span>
                                          <span>{st.label}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* KOLOM 2: KATEGORI PASIEN */}
                                <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/90 space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-[#0e7876]" />
                                      KATEGORI PASIEN
                                    </label>
                                    <span
                                      className={`text-[10px] font-semibold uppercase tracking-wider ${
                                        activeClinical.poin3_1.kategori
                                          ? 'text-[#0e7876]'
                                          : 'text-slate-500'
                                      }`}
                                    >
                                      {activeClinical.poin3_1.kategori
                                        ? 'Terpilih'
                                        : 'Belum Dipilih'}
                                    </span>
                                  </div>

                                  <div className="space-y-1.5">
                                    {(
                                      [
                                        {
                                          id: 'REGULER' as const,
                                          label: 'REGULER',
                                          desc: 'Pasien HD non-isolasi'
                                        },
                                        {
                                          id: 'ISOLASI HEPATITIS B' as const,
                                          label: 'ISOLASI HEPATITIS B',
                                          desc: 'HBsAg (+), mesin & ruang terpisah'
                                        },
                                        {
                                          id: 'ISOLASI HEPATITIS C/HIV' as const,
                                          label: 'ISOLASI HEPATITIS C/HIV',
                                          desc: 'Anti-HCV (+) atau HIV (+)'
                                        }
                                      ] as const
                                    ).map((kat) => {
                                      const isSelected =
                                        activeClinical.poin3_1.kategori === kat.id;
                                      return (
                                        <button
                                          key={kat.id}
                                          type="button"
                                          disabled={!isToday || isActiveBagianLocked}
                                          onClick={() =>
                                            updatePoin3_1({
                                              kategori: isSelected ? '' : kat.id
                                            })
                                          }
                                          className={`w-full min-h-[38px] px-3 py-1.5 rounded-xl text-left flex items-center justify-between gap-2 transition-all border ${
                                            !isToday || isActiveBagianLocked
                                              ? 'opacity-65 cursor-not-allowed'
                                              : 'cursor-pointer'
                                          } ${
                                            isSelected
                                              ? 'bg-[#0e7876] text-white border-[#0e7876] shadow-sm'
                                              : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2 min-w-0">
                                            <span
                                              className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                                                isSelected
                                                  ? 'bg-white border-white text-[#0e7876]'
                                                  : 'bg-white border-slate-300 text-transparent'
                                              }`}
                                            >
                                              <Check className="w-3 h-3 stroke-[3]" />
                                            </span>
                                            <span className="text-xs font-bold whitespace-nowrap">
                                              {kat.label}
                                            </span>
                                          </div>
                                          <span
                                            className={`text-[10.5px] font-medium truncate ${
                                              isSelected ? 'text-emerald-100' : 'text-slate-500'
                                            }`}
                                          >
                                            {kat.desc}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ===================================================================== */}
                          {/* KHUSUS BAGIAN III - POIN 3.2: BB DATANG, BB PULANG & BB KERING        */}
                          {/* ===================================================================== */}
                          {item.code === '3.2' && (
                            <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 whitespace-nowrap">
                                    Berat Badan Datang
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      readOnly={!isToday || isActiveBagianLocked}
                                      disabled={!isToday || isActiveBagianLocked}
                                      value={activeClinical.poin3_2.bbPre}
                                      onChange={(e) => updatePoin3_2({ bbPre: e.target.value })}
                                      placeholder="Contoh: 64.2"
                                      className="w-full min-h-[38px] bg-slate-50 focus:bg-white disabled:opacity-65 disabled:cursor-not-allowed text-slate-950 text-xs font-mono font-semibold tabular-nums border border-slate-300 focus:border-[#19588f] rounded-lg pl-3 pr-9 py-2 focus:outline-hidden"
                                    />
                                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] font-semibold text-slate-400">
                                      kg
                                    </span>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 whitespace-nowrap">
                                    Berat Badan Pulang
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      readOnly={!isToday || isActiveBagianLocked}
                                      disabled={!isToday || isActiveBagianLocked}
                                      value={activeClinical.poin3_2.bbPost}
                                      onChange={(e) => updatePoin3_2({ bbPost: e.target.value })}
                                      placeholder="Contoh: 61.6"
                                      className="w-full min-h-[38px] bg-slate-50 focus:bg-white disabled:opacity-65 disabled:cursor-not-allowed text-slate-950 text-xs font-mono font-semibold tabular-nums border border-slate-300 focus:border-[#19588f] rounded-lg pl-3 pr-9 py-2 focus:outline-hidden"
                                    />
                                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] font-semibold text-slate-400">
                                      kg
                                    </span>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 whitespace-nowrap">
                                    Berat Badan Kering
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      readOnly={!isToday || isActiveBagianLocked}
                                      disabled={!isToday || isActiveBagianLocked}
                                      value={activeClinical.poin3_2.bbKering}
                                      onChange={(e) => updatePoin3_2({ bbKering: e.target.value })}
                                      placeholder="Contoh: 61.5"
                                      className="w-full min-h-[38px] bg-slate-50 focus:bg-white disabled:opacity-65 disabled:cursor-not-allowed text-slate-950 text-xs font-mono font-semibold tabular-nums border border-slate-300 focus:border-[#19588f] rounded-lg pl-3 pr-9 py-2 focus:outline-hidden"
                                    />
                                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] font-semibold text-slate-400">
                                      kg
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {(poin3_2Metrics.idwgKg !== null ||
                                poin3_2Metrics.deltaPrePostKg !== null) && (
                                <p className="text-[11px] text-slate-600 tabular-nums leading-snug">
                                  {poin3_2Metrics.idwgKg !== null &&
                                    poin3_2Metrics.idwgPct !== null && (
                                      <span>
                                        Kenaikan BB (IDWG):{' '}
                                        <strong
                                          className={`font-mono font-semibold ${
                                            poin3_2Metrics.overloadStatus === 'high'
                                              ? 'text-rose-700'
                                              : poin3_2Metrics.overloadStatus === 'moderate'
                                              ? 'text-amber-700'
                                              : 'text-[#0e7876]'
                                          }`}
                                        >
                                          {poin3_2Metrics.idwgKg > 0 ? '+' : ''}
                                          {poin3_2Metrics.idwgKg} kg ({poin3_2Metrics.idwgPct}%)
                                        </strong>
                                      </span>
                                    )}
                                  {poin3_2Metrics.idwgKg !== null &&
                                    poin3_2Metrics.deltaPrePostKg !== null && (
                                      <span className="mx-1.5 text-slate-400" aria-hidden="true">
                                        &middot;
                                      </span>
                                    )}
                                  {poin3_2Metrics.deltaPrePostKg !== null && (
                                    <span>
                                      Selisih BB Datang–Pulang:{' '}
                                      <strong className="font-mono font-semibold text-slate-900">
                                        {poin3_2Metrics.deltaPrePostKg} kg
                                      </strong>
                                    </span>
                                  )}
                                </p>
                              )}
                            </div>
                          )}

                          {/* ===================================================================== */}
                          {/* KHUSUS BAGIAN III - POIN 3.3: TEKANAN DARAH PRE HD                    */}
                          {/* ===================================================================== */}
                          {item.code === '3.3' && (
                            <div className="mt-3 pt-3 border-t border-slate-200/80">
                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:items-end">
                                <div className="sm:col-span-5 lg:col-span-4">
                                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 whitespace-nowrap">
                                    Tekanan Darah Pre HD
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="text"
                                      readOnly={!isToday || isActiveBagianLocked}
                                      disabled={!isToday || isActiveBagianLocked}
                                      value={activeClinical.poin3_3.tdPreHd ?? ''}
                                      onChange={(e) => updatePoin3_3(e.target.value)}
                                      placeholder="Contoh: 140/85"
                                      className="w-full min-h-[38px] bg-slate-50 focus:bg-white disabled:opacity-65 disabled:cursor-not-allowed text-slate-950 text-xs font-mono font-semibold tabular-nums border border-slate-300 focus:border-[#19588f] rounded-lg pl-3 pr-14 py-2 focus:outline-hidden"
                                    />
                                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] font-semibold text-slate-400">
                                      mmHg
                                    </span>
                                  </div>
                                </div>

                                <div className="sm:col-span-7 lg:col-span-8 pb-1.5 text-[11px] text-slate-600 tabular-nums">
                                  {poin3_3Parsed.mapMmHg !== null ? (
                                    <span>
                                      MAP:{' '}
                                      <strong className="font-mono font-semibold text-slate-900">
                                        {poin3_3Parsed.mapMmHg} mmHg
                                      </strong>
                                      {poin3_3Parsed.alertText ? (
                                        <span className="ml-2 font-semibold text-rose-700">
                                          &middot; {poin3_3Parsed.alertText}
                                        </span>
                                      ) : (
                                        <span className="ml-2 font-semibold text-[#0e7876]">
                                          &middot; Hemodinamik Pre-HD Tercatat
                                        </span>
                                      )}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500">
                                      Format Sistolik/Diastolik dalam mmHg (contoh: 140/85).
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ===================================================================== */}
                          {/* KHUSUS BAGIAN III - POIN 3.5: TIME, TARGET UFG, QB, QD & HEPARIN      */}
                          {/* ===================================================================== */}
                          {item.code === '3.5' && (
                            <div className="mt-3 pt-3 border-t border-slate-200/80">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 whitespace-nowrap">
                                    Waktu Dialisis / Time
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      readOnly={!isToday || isActiveBagianLocked}
                                      disabled={!isToday || isActiveBagianLocked}
                                      value={activeClinical.poin3_5.waktuDialisis}
                                      onChange={(e) =>
                                        updatePoin3_5({ waktuDialisis: e.target.value })
                                      }
                                      placeholder="4.5"
                                      className="w-full min-h-[38px] bg-slate-50 focus:bg-white disabled:opacity-65 disabled:cursor-not-allowed text-slate-950 text-xs font-mono font-semibold tabular-nums border border-slate-300 focus:border-[#19588f] rounded-lg pl-3 pr-11 py-2 focus:outline-hidden"
                                    />
                                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] font-semibold text-slate-400">
                                      Jam
                                    </span>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 whitespace-nowrap">
                                    Target UFG
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      readOnly={!isToday || isActiveBagianLocked}
                                      disabled={!isToday || isActiveBagianLocked}
                                      value={activeClinical.poin3_5.targetUfg}
                                      onChange={(e) => updatePoin3_5({ targetUfg: e.target.value })}
                                      placeholder="2500"
                                      className="w-full min-h-[38px] bg-slate-50 focus:bg-white disabled:opacity-65 disabled:cursor-not-allowed text-slate-950 text-xs font-mono font-semibold tabular-nums border border-slate-300 focus:border-[#19588f] rounded-lg pl-3 pr-10 py-2 focus:outline-hidden"
                                    />
                                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] font-semibold text-slate-400">
                                      mL
                                    </span>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 whitespace-nowrap">
                                    QB
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      readOnly={!isToday || isActiveBagianLocked}
                                      disabled={!isToday || isActiveBagianLocked}
                                      value={activeClinical.poin3_5.qb}
                                      onChange={(e) => updatePoin3_5({ qb: e.target.value })}
                                      placeholder="220"
                                      className="w-full min-h-[38px] bg-slate-50 focus:bg-white disabled:opacity-65 disabled:cursor-not-allowed text-slate-950 text-xs font-mono font-semibold tabular-nums border border-slate-300 focus:border-[#19588f] rounded-lg pl-3 pr-16 py-2 focus:outline-hidden"
                                    />
                                    <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[10.5px] font-semibold text-slate-400">
                                      mL/mnt
                                    </span>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 whitespace-nowrap">
                                    QD
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      readOnly={!isToday || isActiveBagianLocked}
                                      disabled={!isToday || isActiveBagianLocked}
                                      value={activeClinical.poin3_5.qd}
                                      onChange={(e) => updatePoin3_5({ qd: e.target.value })}
                                      placeholder="500"
                                      className="w-full min-h-[38px] bg-slate-50 focus:bg-white disabled:opacity-65 disabled:cursor-not-allowed text-slate-950 text-xs font-mono font-semibold tabular-nums border border-slate-300 focus:border-[#19588f] rounded-lg pl-3 pr-16 py-2 focus:outline-hidden"
                                    />
                                    <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[10.5px] font-semibold text-slate-400">
                                      mL/mnt
                                    </span>
                                  </div>
                                </div>

                                <div className="sm:col-span-2 lg:col-span-1">
                                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 whitespace-nowrap">
                                    Dosis Heparin
                                  </label>
                                  <input
                                    type="text"
                                    readOnly={!isToday || isActiveBagianLocked}
                                    disabled={!isToday || isActiveBagianLocked}
                                    value={activeClinical.poin3_5.dosisHeparin}
                                    onChange={(e) =>
                                      updatePoin3_5({ dosisHeparin: e.target.value })
                                    }
                                    placeholder="2000 IU / Free"
                                    className="w-full min-h-[38px] bg-slate-50 focus:bg-white disabled:opacity-65 disabled:cursor-not-allowed text-slate-950 text-xs font-semibold border border-slate-300 focus:border-[#19588f] rounded-lg px-3 py-2 focus:outline-hidden"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ===================================================================== */}
                          {/* KHUSUS BAGIAN III - POIN 3.6: AKSES VASKULER CIMINO, CDL & FEMORAL    */}
                          {/* ===================================================================== */}
                          {item.code === '3.6' && (
                            <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-3">
                              {/* Input Perawat Pelaksana Aksesing Vaskular */}
                              <div
                                className={`p-3 rounded-xl border transition-colors ${
                                  selectedPoin3_6OtherNurse
                                    ? 'bg-indigo-50/60 border-indigo-200'
                                    : 'bg-slate-50/80 border-slate-200'
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                  <div className="min-w-0">
                                    <label className="block text-xs font-bold text-slate-900">
                                      Perawat yang Melakukan Aksesing Vaskular
                                    </label>
                                    <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                                      Pilih perawat yang secara aktual melakukan kanulasi / aksesing
                                      vaskular pada pasien ini (nilai Laporan Bulanan Poin 3.6 akan
                                      masuk ke perawat pelaksana aksesing setelah diverifikasi).
                                    </p>
                                  </div>

                                  <div className="w-full sm:w-72 shrink-0">
                                    <select
                                      disabled={!isToday || isActiveBagianLocked}
                                      value={selectedPoin3_6OtherNurse}
                                      onChange={(e) => updatePoin3_6Nurse(e.target.value)}
                                      className="w-full min-h-[38px] bg-white disabled:opacity-65 disabled:cursor-not-allowed text-slate-950 text-xs font-bold border border-slate-300 focus:border-[#19588f] rounded-lg px-2.5 py-2 focus:outline-hidden"
                                    >
                                      <option value="">
                                        {currentNurse.name} (Saya — Pengelola Pasien)
                                      </option>
                                      {vascularAccessOtherNurseOptions.map((opt) => (
                                        <option key={opt.name} value={opt.name}>
                                          {opt.name} — {opt.roleLabel}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>

                                {selectedPoin3_6OtherNurse && (
                                  <div className="mt-2 pt-2 border-t border-indigo-200/70 flex items-center gap-1.5 text-[11px] text-indigo-900">
                                    <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                    <span>
                                      Aksesing vaskular pasien ini dilakukan oleh{' '}
                                      <strong>{selectedPoin3_6OtherNurse}</strong>. Setelah logbook
                                      diverifikasi PJ Shift / Kepala Ruang, nilai Poin 3.6 pasien ini
                                      otomatis dihitung pada Laporan Bulanan{' '}
                                      <strong>{selectedPoin3_6OtherNurse}</strong>.
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                {(
                                  [
                                    {
                                      key: 'cimino' as const,
                                      label: 'CIMINO',
                                      sublabel: 'AV Shunt / Fistula',
                                      active:
                                        activeClinical.poin3_6.ciminoAktif ||
                                        isMeaningfulAccessInput(activeClinical.poin3_6.cimino),
                                      value: activeClinical.poin3_6.cimino,
                                      placeholder: 'Contoh: Sinistra, thrill (+) kuat'
                                    },
                                    {
                                      key: 'cdl' as const,
                                      label: 'CDL',
                                      sublabel: 'Catheter Double Lumen',
                                      active:
                                        activeClinical.poin3_6.cdlAktif ||
                                        isMeaningfulAccessInput(activeClinical.poin3_6.cdl),
                                      value: activeClinical.poin3_6.cdl,
                                      placeholder: 'Contoh: Jugularis Dextra, bersih'
                                    },
                                    {
                                      key: 'femoral' as const,
                                      label: 'FEMORAL',
                                      sublabel: 'Akses Vena Femoralis',
                                      active:
                                        activeClinical.poin3_6.femoralAktif ||
                                        isMeaningfulAccessInput(activeClinical.poin3_6.femoral),
                                      value: activeClinical.poin3_6.femoral,
                                      placeholder: 'Contoh: Femoralis Dextra, lancar'
                                    }
                                  ]
                                ).map((acc) => (
                                  <div
                                    key={acc.key}
                                    className={`p-2.5 rounded-xl border transition-colors space-y-2 ${
                                      acc.active
                                        ? 'bg-emerald-50/55 border-emerald-300'
                                        : 'bg-slate-50/70 border-slate-200'
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      disabled={!isToday || isActiveBagianLocked}
                                      onClick={() => updatePoin3_6Toggle(acc.key)}
                                      className={`w-full flex items-center justify-between gap-2 text-left ${
                                        !isToday || isActiveBagianLocked
                                          ? 'opacity-65 cursor-not-allowed'
                                          : 'cursor-pointer'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span
                                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                                            acc.active
                                              ? 'bg-[#0e7876] border-[#0e7876] text-white'
                                              : 'bg-white border-slate-300 text-transparent'
                                          }`}
                                        >
                                          <Check className="w-3 h-3 stroke-[3]" />
                                        </span>
                                        <span className="text-xs font-bold text-slate-950 whitespace-nowrap">
                                          {acc.label}
                                        </span>
                                      </div>
                                      <span className="text-[10.5px] font-medium text-slate-500 truncate">
                                        {acc.sublabel}
                                      </span>
                                    </button>

                                    <input
                                      type="text"
                                      readOnly={!isToday || isActiveBagianLocked}
                                      disabled={!isToday || isActiveBagianLocked}
                                      value={acc.value}
                                      onChange={(e) => updatePoin3_6Text(acc.key, e.target.value)}
                                      placeholder={acc.placeholder}
                                      className="w-full min-h-[36px] bg-white disabled:opacity-65 disabled:cursor-not-allowed text-slate-900 text-xs border border-slate-300 focus:border-[#19588f] rounded-lg px-2.5 py-1.5 focus:outline-hidden"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* ===================================================================== */}
                          {/* KHUSUS BAGIAN IV - POIN 4.1: OBSERVASI TTV INTRA HD (TEKANAN DARAH)   */}
                          {/* ===================================================================== */}
                          {item.code === '4.1' && (
                            <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2.5">
                              <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                    <Activity className="w-3.5 h-3.5 text-[#19588f]" />
                                    <span>Tekanan Darah Intra HD</span>
                                    <span className="text-slate-400 font-normal text-[11px]">(mmHg)</span>
                                  </label>
                                  {activeClinical.poin3_3?.tdPreHd && !activeClinical.poin4_1?.tdIntraHd && (
                                    <button
                                      type="button"
                                      disabled={!isToday || isActiveBagianLocked}
                                      onClick={() => updatePoin4_1({ tdIntraHd: activeClinical.poin3_3.tdPreHd })}
                                      className={`text-[10.5px] text-[#19588f] hover:underline font-semibold ${
                                        !isToday || isActiveBagianLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                      }`}
                                      title="Salin dari TD Pre-HD"
                                    >
                                      = Salin TD Pre ({activeClinical.poin3_3.tdPreHd})
                                    </button>
                                  )}
                                </div>

                                <div className="max-w-xs">
                                  <input
                                    type="text"
                                    readOnly={!isToday || isActiveBagianLocked}
                                    disabled={!isToday || isActiveBagianLocked}
                                    value={activeClinical.poin4_1?.tdIntraHd || ''}
                                    onChange={(e) => updatePoin4_1({ tdIntraHd: e.target.value })}
                                    placeholder="Contoh: 130/80"
                                    className="w-full min-h-[38px] bg-white disabled:opacity-65 disabled:cursor-not-allowed text-slate-950 text-xs font-semibold border border-slate-300 focus:border-[#19588f] rounded-lg px-3 py-2 focus:outline-hidden tabular-nums"
                                  />
                                </div>

                                {Boolean(activeClinical.poin4_1?.tdIntraHd?.trim()) && (
                                  <p className="text-[11px] text-[#0e7876] font-medium pt-0.5">
                                    <strong className="font-semibold text-slate-700">Ringkasan TTV:</strong>{' '}
                                    {formatPoin4_1Note(activeClinical.poin4_1)}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* ===================================================================== */}
                          {/* KHUSUS BAGIAN IV - POIN 4.3: PENANGANAN KOMPLIKASI INTRA HD (DROPDOWN) */}
                          {/* ===================================================================== */}
                          {item.code === '4.3' && (
                            <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-3">
                              {/* Action Bar: Button Tambah Komplikasi + Button Tidak Ada Komplikasi */}
                              <div className="flex flex-wrap items-center justify-end gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200">
                                <button
                                  type="button"
                                  disabled={!isToday || isActiveBagianLocked}
                                  onClick={() => addPoin4_3DynamicEntry('Hipertensi')}
                                  className={`min-h-[36px] px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all whitespace-nowrap ${
                                    !isToday || isActiveBagianLocked
                                      ? 'opacity-60 cursor-not-allowed bg-slate-200 text-slate-500'
                                      : 'bg-[#19588f] hover:bg-[#144775] text-white cursor-pointer active:scale-98'
                                  }`}
                                  title={
                                    isActiveBagianLocked
                                      ? getLockToastMessage(currentPatientLock.submission?.status)
                                      : 'Tambah baris komplikasi intra-HD baru untuk pasien ini'
                                  }
                                >
                                  <Plus className="w-4 h-4 stroke-[2.5]" />
                                  <span>+ TAMBAH KOMPLIKASI</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={!isToday || isActiveBagianLocked}
                                  onClick={updatePoin4_3NoComplication}
                                  className={`min-h-[36px] px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
                                    !isToday || isActiveBagianLocked
                                      ? 'opacity-60 cursor-not-allowed'
                                      : 'cursor-pointer'
                                  } ${
                                    activeClinical.poin4_3.tidakAdaKomplikasi &&
                                    (!activeClinical.poin4_3.entries ||
                                      activeClinical.poin4_3.entries.length === 0)
                                      ? 'bg-emerald-50 border-emerald-300 text-[#0e7876] font-bold shadow-2xs'
                                      : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
                                  }`}
                                  title="Tandai tidak ada komplikasi selama sesi HD berlangsung"
                                >
                                  <span
                                    className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                                      activeClinical.poin4_3.tidakAdaKomplikasi &&
                                      (!activeClinical.poin4_3.entries ||
                                        activeClinical.poin4_3.entries.length === 0)
                                        ? 'bg-[#0e7876] border-[#0e7876] text-white'
                                        : 'bg-white border-slate-300 text-transparent'
                                    }`}
                                  >
                                    <Check className="w-3 h-3 stroke-[3]" />
                                  </span>
                                  <span>Tidak Ada Komplikasi (Nihil)</span>
                                </button>
                              </div>

                              {/* Dynamic Entries List */}
                              {activeClinical.poin4_3.entries &&
                              activeClinical.poin4_3.entries.length > 0 && (
                                <div className="space-y-3">
                                  {activeClinical.poin4_3.entries.map((entry, idx) => {
                                    const isCritical = /kesadaran|first-use/i.test(entry.jenis);
                                    const isHypo = /hipotensi/i.test(entry.jenis);
                                    const isHiper = /hipertensi|hipertermi/i.test(entry.jenis);
                                    const valueCfg = getComplicationValueConfig(entry.jenis);

                                    return (
                                      <div
                                        key={entry.id || `comp_${idx}`}
                                        className={`p-3 sm:p-3.5 rounded-xl border transition-all space-y-2.5 ${
                                          isCritical
                                            ? 'bg-rose-50/50 border-rose-200 ring-1 ring-rose-200/50'
                                            : isHypo
                                            ? 'bg-amber-50/50 border-amber-200'
                                            : isHiper
                                            ? 'bg-orange-50/40 border-orange-200'
                                            : 'bg-slate-50/80 border-slate-200'
                                        }`}
                                      >
                                        {/* Row Header: Komplikasi #X & Hapus button */}
                                        <div className="flex items-center justify-between gap-2 border-b border-slate-200/70 pb-2">
                                          <div className="flex items-center gap-2">
                                            <span
                                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono text-white ${
                                                isCritical
                                                  ? 'bg-rose-600'
                                                  : isHypo
                                                  ? 'bg-amber-600'
                                                  : isHiper
                                                  ? 'bg-orange-600'
                                                  : 'bg-[#19588f]'
                                              }`}
                                            >
                                              {idx + 1}
                                            </span>
                                            <span className="text-xs font-bold text-slate-900">
                                              Insiden Komplikasi #{idx + 1}
                                            </span>
                                            {entry.jam && (
                                              <span className="text-[11px] font-mono text-slate-500 bg-white/80 px-2 py-0.5 rounded border border-slate-200">
                                                Pukul {entry.jam} WIB
                                              </span>
                                            )}
                                          </div>

                                          <button
                                            type="button"
                                            disabled={!isToday || isActiveBagianLocked}
                                            onClick={() => removePoin4_3DynamicEntry(entry.id)}
                                            className={`text-rose-600 hover:text-rose-700 hover:bg-rose-100/70 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                                              !isToday || isActiveBagianLocked
                                                ? 'opacity-40 cursor-not-allowed'
                                                : 'cursor-pointer'
                                            }`}
                                            title="Hapus komplikasi ini"
                                          >
                                            <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                            <span>Hapus</span>
                                          </button>
                                        </div>

                                        {/* Grid: Dropdown Komplikasi, Jam Kejadian, Kolom Nilai (kondisional), Kolom Advis Dokter */}
                                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                                          {/* 1. Dropdown Pilihan Komplikasi */}
                                          <div className={`${valueCfg.hasValue ? 'sm:col-span-4 lg:col-span-3' : 'sm:col-span-4'} space-y-1`}>
                                            <label className="block text-[11px] font-bold text-slate-700">
                                              PILIHAN KOMPLIKASI <span className="text-rose-600">*</span>
                                            </label>
                                            <select
                                              disabled={!isToday || isActiveBagianLocked}
                                              value={entry.jenis}
                                              onChange={(e) =>
                                                updatePoin4_3DynamicEntry(entry.id, {
                                                  jenis: e.target.value
                                                })
                                              }
                                              className="w-full min-h-[38px] bg-white disabled:opacity-65 disabled:cursor-not-allowed text-slate-950 text-xs font-bold border border-slate-300 focus:border-[#19588f] rounded-lg px-2.5 py-1.5 focus:outline-hidden cursor-pointer"
                                            >
                                              {PILIHAN_KOMPLIKASI_DROPDOWN.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                  {opt.label}
                                                </option>
                                              ))}
                                            </select>
                                          </div>

                                          {/* 2. Jam Kejadian */}
                                          <div className={`${valueCfg.hasValue ? 'sm:col-span-3 lg:col-span-2' : 'sm:col-span-3'} space-y-1`}>
                                            <div className="flex items-center justify-between">
                                              <label className="block text-[11px] font-bold text-slate-700">
                                                JAM KEJADIAN
                                              </label>
                                              <button
                                                type="button"
                                                disabled={!isToday || isActiveBagianLocked}
                                                onClick={() => setJamNowPoin4_3(entry.id)}
                                                className={`text-[10.5px] text-[#19588f] font-semibold ${
                                                  !isToday || isActiveBagianLocked
                                                    ? 'opacity-50 cursor-not-allowed'
                                                    : 'hover:underline cursor-pointer'
                                                }`}
                                                title="Set jam saat ini"
                                              >
                                                Sekarang
                                              </button>
                                            </div>
                                            <div className="relative">
                                              <input
                                                type="text"
                                                readOnly={!isToday || isActiveBagianLocked}
                                                disabled={!isToday || isActiveBagianLocked}
                                                value={entry.jam}
                                                onChange={(e) =>
                                                  updatePoin4_3DynamicEntry(entry.id, {
                                                    jam: e.target.value
                                                  })
                                                }
                                                placeholder="09:30"
                                                className="w-full min-h-[38px] bg-white disabled:opacity-65 disabled:cursor-not-allowed text-slate-900 text-xs font-mono font-semibold tabular-nums border border-slate-300 focus:border-[#19588f] rounded-lg pl-3 pr-8 py-1.5 focus:outline-hidden"
                                              />
                                              <Clock className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                            </div>
                                          </div>

                                          {/* 2b. Kolom Nilai Komplikasi (Kondisional: Hipertensi, Hipotensi, Hipoglikemi, Hipertermi) */}
                                          {valueCfg.hasValue && (
                                            <div className="sm:col-span-5 lg:col-span-3 space-y-1">
                                              <label className="block text-[11px] font-bold text-slate-700">
                                                {valueCfg.label.toUpperCase()}{' '}
                                                <span className="text-slate-500 font-normal">({valueCfg.unit})</span>{' '}
                                                <span className="text-rose-600">*</span>
                                              </label>
                                              <input
                                                type="text"
                                                readOnly={!isToday || isActiveBagianLocked}
                                                disabled={!isToday || isActiveBagianLocked}
                                                value={entry.nilai || ''}
                                                onChange={(e) =>
                                                  updatePoin4_3DynamicEntry(entry.id, {
                                                    nilai: e.target.value
                                                  })
                                                }
                                                placeholder={valueCfg.placeholder}
                                                className="w-full min-h-[38px] bg-white disabled:opacity-65 disabled:cursor-not-allowed text-slate-950 text-xs font-semibold tabular-nums border border-slate-300 focus:border-[#19588f] rounded-lg px-3 py-1.5 focus:outline-hidden"
                                              />
                                            </div>
                                          )}

                                          {/* 3. Kolom Advis Dokter */}
                                          <div className={`${valueCfg.hasValue ? 'sm:col-span-12 lg:col-span-4' : 'sm:col-span-5'} space-y-1`}>
                                            <label className="block text-[11px] font-bold text-slate-700">
                                              KOLOM ADVIS DOKTER (TBAK)
                                            </label>
                                            <input
                                              type="text"
                                              readOnly={!isToday || isActiveBagianLocked}
                                              disabled={!isToday || isActiveBagianLocked}
                                              value={entry.advisDokter}
                                              onChange={(e) =>
                                                updatePoin4_3DynamicEntry(entry.id, {
                                                  advisDokter: e.target.value
                                                })
                                              }
                                              placeholder="Instruksi / advis dokter DPJP..."
                                              className="w-full min-h-[38px] bg-white disabled:opacity-65 disabled:cursor-not-allowed text-slate-950 text-xs border border-slate-300 focus:border-[#19588f] rounded-lg px-3 py-1.5 focus:outline-hidden"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}

                                </div>
                              )}
                            </div>
                          )}

                          {/* Poin 6.3: Evaluasi TTV & Berat Badan Post-HD (Tekanan Darah Post HD, Nilai UFG Tercapai, KT/V) */}
                          {item.code === '6.3' && (
                            <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                {/* 1. Tekanan Darah Post HD */}
                                <div className="space-y-1">
                                  <label className="text-[11px] font-semibold text-slate-700 block">
                                    Tekanan Darah Post HD <span className="text-slate-400 font-normal">(mmHg)</span>
                                  </label>
                                  <input
                                    type="text"
                                    readOnly={!isToday || isActiveBagianLocked}
                                    disabled={!isToday || isActiveBagianLocked}
                                    value={activeClinical.poin6_3?.tdPostHd || ''}
                                    onChange={(e) => updatePoin6_3({ tdPostHd: e.target.value })}
                                    placeholder="Contoh: 120/80"
                                    className="w-full bg-slate-50 focus:bg-white disabled:opacity-70 disabled:cursor-not-allowed text-slate-900 text-xs font-semibold border border-slate-200 focus:border-[#19588f] rounded-lg px-2.5 py-1.5 focus:outline-hidden tabular-nums"
                                  />
                                </div>

                                {/* 2. Nilai UFG Tercapai */}
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-semibold text-slate-700 block">
                                      Nilai UFG Tercapai <span className="text-slate-400 font-normal">(mL)</span>
                                    </label>
                                    {activeClinical.poin3_5?.targetUfg &&
                                      isToday &&
                                      !isActiveBagianLocked && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            updatePoin6_3({
                                              ufgTercapai: String(activeClinical.poin3_5.targetUfg)
                                            })
                                          }
                                          className="text-[10px] text-[#19588f] hover:underline font-medium cursor-pointer"
                                          title="Samakan dengan Target UFG dari Bagian 3.5"
                                        >
                                          = Target ({activeClinical.poin3_5.targetUfg})
                                        </button>
                                      )}
                                  </div>
                                  <input
                                    type="text"
                                    readOnly={!isToday || isActiveBagianLocked}
                                    disabled={!isToday || isActiveBagianLocked}
                                    value={activeClinical.poin6_3?.ufgTercapai || ''}
                                    onChange={(e) => updatePoin6_3({ ufgTercapai: e.target.value })}
                                    placeholder="Contoh: 2500"
                                    className="w-full bg-slate-50 focus:bg-white disabled:opacity-70 disabled:cursor-not-allowed text-slate-900 text-xs font-semibold border border-slate-200 focus:border-[#19588f] rounded-lg px-2.5 py-1.5 focus:outline-hidden tabular-nums"
                                  />
                                </div>

                                {/* 3. KT/V */}
                                <div className="space-y-1">
                                  <label className="text-[11px] font-semibold text-slate-700 block">
                                    KT/V <span className="text-slate-400 font-normal">(Adekuasi HD)</span>
                                  </label>
                                  <input
                                    type="text"
                                    readOnly={!isToday || isActiveBagianLocked}
                                    disabled={!isToday || isActiveBagianLocked}
                                    value={activeClinical.poin6_3?.ktV || ''}
                                    onChange={(e) => updatePoin6_3({ ktV: e.target.value })}
                                    placeholder="Contoh: 1.8 atau 1.2"
                                    className="w-full bg-slate-50 focus:bg-white disabled:opacity-70 disabled:cursor-not-allowed text-slate-900 text-xs font-semibold border border-slate-200 focus:border-[#19588f] rounded-lg px-2.5 py-1.5 focus:outline-hidden tabular-nums"
                                  />
                                </div>
                              </div>

                              {/* Ringkasan Evaluasi Post-HD */}
                              {(activeClinical.poin6_3?.tdPostHd ||
                                activeClinical.poin6_3?.ufgTercapai ||
                                activeClinical.poin6_3?.ktV) && (
                                <p className="text-[11px] tabular-nums leading-snug text-[#0e7876] font-medium pt-0.5">
                                  <strong className="font-semibold text-slate-700">Ringkasan Evaluasi:</strong>{' '}
                                  {formatPoin6_3Note(activeClinical.poin6_3)}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Display Saved Note (Read-Only without buttons or quick fill) */}
                          {item.code !== '2.1' &&
                            item.code !== '3.2' &&
                            item.code !== '3.3' &&
                            item.code !== '3.5' &&
                            item.code !== '3.6' &&
                            item.code !== '4.1' &&
                            item.code !== '4.3' &&
                            item.code !== '6.3' &&
                            Boolean(currentNote?.trim()) && (
                              <div className="mt-2 text-[11px] text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5">
                                <span className="font-semibold text-slate-700">Catatan:</span>
                                <span>{currentNote}</span>
                              </div>
                            )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Sticky Bottom Action Bar */}
            <div className="sticky bottom-0 z-20 px-4 sm:px-6 py-3 bg-white/95 backdrop-blur-md border-t border-slate-200/90 flex flex-wrap items-center justify-between gap-3 shadow-[0_-4px_16px_rgba(14,42,74,0.06)] rounded-b-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleBackToPatientList}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 font-semibold text-xs sm:text-sm transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <ArrowLeft className="w-4 h-4 shrink-0" />
                  <span>Kembali ke Daftar Pasien</span>
                </button>

                {selectedBagian > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBagian(selectedBagian - 1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs sm:text-sm transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                    <span>Bagian {selectedBagian - 1}</span>
                  </button>
                )}

                <div className="hidden lg:block text-xs text-slate-600 font-medium tabular-nums pl-2 border-l border-slate-200">
                  {selectedBagian === 7 ? (
                    activePatientSubmission.status === 'terverifikasi' ? (
                      <span className="text-[#0e7876] font-semibold">
                        Terverifikasi oleh {activePatientSubmission.verifiedByRole || 'Verifikator'} ({activePatientSubmission.verifiedBy || activePatientSubmission.targetVerifierName})
                      </span>
                    ) : activePatientSubmission.status === 'diajukan' ? (
                      <span className="text-[#19588f] font-semibold">
                        Menunggu verifikasi {activePatientSubmission.targetRole === 'kepala_ruangan' ? 'Kepala Ruang' : 'PJ Shift'} ({activePatientSubmission.targetVerifierName})
                      </span>
                    ) : (
                      <span>
                        Status: <strong className="text-slate-900">Belum Diajukan</strong> &middot; {targetVerifierLabel}
                      </span>
                    )
                  ) : isActiveBagianLocked ? (
                    <span className="text-slate-600 font-semibold">
                      Mode Hanya-Baca (Terkunci) &middot; {openedPatient.bedNumber} ({openedPatient.patientName})
                    </span>
                  ) : activeMeta.isPatientSpecific ? (
                    <span>
                      Tersimpan otomatis untuk: <strong className="text-slate-900">{openedPatient.bedNumber} ({openedPatient.patientName})</strong>
                    </span>
                  ) : (
                    <span>
                      Data fasilitas &amp; RO tersimpan untuk seluruh unit shift ini.
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {selectedBagian < 7 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!isActiveBagianLocked) {
                        showToast(
                          `Bagian ${selectedBagian} tersimpan. Lanjut ke Bagian ${selectedBagian + 1}.`
                        );
                      }
                      setSelectedBagian(selectedBagian + 1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-4 sm:px-5 py-2 rounded-xl bg-[#19588f] hover:bg-[#144775] text-white font-semibold text-xs sm:text-sm shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <span>
                      {isActiveBagianLocked
                        ? `Lihat Bagian ${selectedBagian + 1}`
                        : `Simpan & Lanjut Bagian ${selectedBagian + 1}`}
                    </span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                ) : activePatientSubmission.status === 'belum_diajukan' ? (
                  <button
                    type="button"
                    disabled={!isToday}
                    onClick={handleSubmitVerification}
                    title={
                      !isToday
                        ? 'Pengajuan logbook hanya dapat dilakukan pada hari yang sama'
                        : undefined
                    }
                    className={`px-4 sm:px-5 py-2 rounded-xl text-white font-semibold text-xs sm:text-sm shadow-2xs transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                      !isToday
                        ? 'bg-slate-400 cursor-not-allowed opacity-60'
                        : 'bg-[#19588f] hover:bg-[#144775] cursor-pointer'
                    }`}
                  >
                    <Send className="w-4 h-4 shrink-0" />
                    <span>
                      {activePatientSubmission.revisionRequested ||
                      activePatientSubmission.verifierNotes
                        ? activePatientSubmission.targetRole === 'kepala_ruangan' ||
                          activePatientSubmission.targetRole === 'mandiri'
                          ? 'Ajukan Kembali ke Kepala Ruang (Perbaikan Selesai)'
                          : activeRole === 'pj_shift'
                          ? 'Ajukan Kembali ke PJ Shift Lainnya (Perbaikan Selesai)'
                          : 'Ajukan Kembali ke PJ Shift (Perbaikan Selesai)'
                        : activePatientSubmission.targetRole === 'kepala_ruangan' ||
                          activePatientSubmission.targetRole === 'mandiri'
                        ? 'Ajukan Verifikasi ke Kepala Ruang'
                        : activeRole === 'pj_shift'
                        ? 'Ajukan Verifikasi ke PJ Shift Lainnya'
                        : 'Ajukan Verifikasi ke PJ Shift'}
                    </span>
                  </button>
                ) : activePatientSubmission.status === 'diajukan' ? (
                  <>
                    {activeRole === 'kepala_ruangan' &&
                      activePatientSubmission.targetRole === 'kepala_ruangan' &&
                      onNavigateToVerifikasi && (
                        <button
                          type="button"
                          onClick={() => {
                            handleBackToPatientList();
                            onNavigateToVerifikasi();
                          }}
                          className="px-4 sm:px-5 py-2 rounded-xl bg-[#19588f] hover:bg-[#144775] text-white font-semibold text-xs sm:text-sm shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                        >
                          <ShieldCheck className="w-4 h-4 shrink-0" />
                          <span>Buka Halaman Verifikasi</span>
                        </button>
                      )}
                    <button
                      type="button"
                      onClick={handleBackToPatientList}
                      className="px-4 sm:px-5 py-2 rounded-xl bg-[#19588f] hover:bg-[#144775] text-white font-semibold text-xs sm:text-sm shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <Save className="w-4 h-4 shrink-0" />
                      <span>Selesai</span>
                    </button>
                  </>
                ) : (
                  <>
                    {onNavigateToRiwayat && (
                      <button
                        type="button"
                        onClick={() => {
                          handleBackToPatientList();
                          onNavigateToRiwayat();
                        }}
                        className="px-4 sm:px-5 py-2 rounded-xl bg-[#19588f] hover:bg-[#144775] text-white font-semibold text-xs sm:text-sm shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                      >
                        <FileText className="w-4 h-4 shrink-0" />
                        <span>Lihat di Halaman Riwayat</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsPrintModalOpen(true)}
                      className="px-4 sm:px-5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-semibold text-xs sm:text-sm shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                      title="Pratinjau & Cetak Lembar Logbook Pasien (Format Standar A4)"
                    >
                      <Printer className="w-4 h-4 text-slate-600 shrink-0" />
                      <span>Cetak / PDF A4</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleBackToPatientList}
                      className="px-4 sm:px-5 py-2 rounded-xl bg-[#0e7876] hover:bg-[#0b6361] text-white font-semibold text-xs sm:text-sm shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Selesai</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
      )}

      {/* Modal Cetak Logbook Pasien (Format Standar PERNEFRI & KARS A4) */}
      {isPrintModalOpen && printableSession && (
        <PelaksanaLogbookPrintableModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          session={printableSession}
          shiftInfo={effectiveShiftInfo}
        />
      )}
    </div>
  );
};
