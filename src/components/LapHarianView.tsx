import React, { useState, useMemo, useEffect } from 'react';
import {
  ShiftInfo,
  AggregatedCensus,
  MachineOverview,
  ClinicalIndicatorItem,
  OperationalItem,
  SbarData,
  PatientHDSession,
  ShiftSignatures,
  SystemAccessRole,
  MasterNurse,
  MasterPatient,
  MasterDoctor,
  HdTreatmentDay
} from '../types/dialysis.ts';
import { OfficialReportPrintable } from './OfficialReportPrintable.tsx';
import { LoginUserData } from './LoginPage.tsx';
import { generateAutoSbar } from '../utils/hdCalculator.ts';
import {
  extractActiveDayName,
  formatIsoDateToIndonesianFull,
  formatShortIndonesianTimestampWib,
  getCurrentIsoDateWib
} from '../utils/dateHelpers.ts';
import { printDocumentWithOrientation } from '../utils/printHelpers.ts';
import {
  DEFAULT_KEPALA_RUANGAN_NAME,
  aggregateShiftVerifiedLogbooks,
  detectActiveLogbookShiftForDate,
  formatShiftHoursForShift
} from '../utils/dailyReportHelpers.ts';
import {
  LogbookVerificationRegistryEntry,
  getVerificationRegistry
} from '../utils/nurseVerificationHelpers.ts';
import {
  saveShiftReportCloud,
  subscribeToShiftReport
} from '../services/firebase.ts';
import {
  initialOperationalItems,
  initialMachineOverview
} from '../data/mockShiftData.ts';
import {
  FileText,
  Printer,
  Sparkles,
  CheckSquare,
  Users,
  Save,
  CheckCircle,
  RefreshCw,
  Activity,
  Droplets,
  Stethoscope,
  Plus,
  Trash2,
  RotateCcw,
  Edit3,
  Cpu,
  Layers,
  ClipboardCheck,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface LapHarianViewProps {
  shiftInfo: ShiftInfo;
  setShiftInfo: React.Dispatch<React.SetStateAction<ShiftInfo>>;
  census: AggregatedCensus;
  machineOverview: MachineOverview;
  setMachineOverview: React.Dispatch<React.SetStateAction<MachineOverview>>;
  clinicalIndicators: ClinicalIndicatorItem[];
  operationalItems: OperationalItem[];
  setOperationalItems: React.Dispatch<React.SetStateAction<OperationalItem[]>>;
  sbar: SbarData;
  setSbar: React.Dispatch<React.SetStateAction<SbarData>>;
  signatures: ShiftSignatures;
  setSignatures: React.Dispatch<React.SetStateAction<ShiftSignatures>>;
  sessions: PatientHDSession[];
  userRole?: SystemAccessRole;
  loggedInUser?: LoginUserData | null;
  masterNurses?: MasterNurse[];
  masterPatients?: MasterPatient[];
  masterDoctors?: MasterDoctor[];
  onDateChange?: (isoDate: string) => void;
  isCustomDate?: boolean;
  onResetDateToToday?: () => void;
}

type LapHarianSubTab =
  | 'preview_full'
  | 'section_a'
  | 'section_b'
  | 'section_c'
  | 'section_d'
  | 'section_e'
  | 'section_f';

const STORAGE_KEYS = {
  CENSUS: 'rshl_manual_census_v4',
  MACHINE: 'rshl_manual_machine_v3',
  CLINICAL: 'rshl_manual_clinical_v4'
};

export const LapHarianView: React.FC<LapHarianViewProps> = ({
  shiftInfo,
  setShiftInfo,
  census,
  machineOverview,
  setMachineOverview,
  clinicalIndicators,
  operationalItems,
  setOperationalItems,
  sbar,
  setSbar,
  signatures,
  setSignatures,
  sessions,
  userRole = 'pj_shift',
  loggedInUser,
  masterNurses = [],
  masterPatients = [],
  masterDoctors = [],
  onDateChange,
  isCustomDate = false,
  onResetDateToToday
}) => {
  const isSupervisor = userRole === 'pj_shift' || userRole === 'kepala_ruangan';
  const [activeSubTab, setActiveSubTab] = useState<LapHarianSubTab>('preview_full');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeDpjpDoctors = useMemo(() => {
    const list = (masterDoctors || [])
      .filter((d) => (d.role === 'dpjp' || d.role === 'both') && d.status === 'aktif')
      .map((d) => d.name);
    return list.length > 0
      ? list
      : ['dr. Raden Heru Prasanto, Sp.PD-KGH', 'dr. Paramitha, Sp.PD-KGH', 'dr. Tri Hastuti, Sp.PD-KGH', 'dr. Konsulen Pengganti, Sp.PD'];
  }, [masterDoctors]);

  const activeJagaDoctors = useMemo(() => {
    const list = (masterDoctors || [])
      .filter((d) => (d.role === 'dokter_jaga' || d.role === 'both') && d.status === 'aktif')
      .map((d) => d.name);
    return list.length > 0
      ? list
      : ['dr. Budi Setiawan', 'dr. Aditya Nugraha', 'dr. Paramitha', 'dr. Siti Rahmawati', 'dr. Tri Hastuti'];
  }, [masterDoctors]);

  useEffect(() => {
    if (isSupervisor) {
      setActiveSubTab('preview_full');
    }
  }, [isSupervisor]);

  const activeDay = extractActiveDayName(shiftInfo.date) as HdTreatmentDay;
  const activeShift: 'Pagi' | 'Siang' = shiftInfo.shift === 'Siang' ? 'Siang' : 'Pagi';

  // Live verification registry entries synced across all accounts & Cloud Firestore
  const [registryEntries, setRegistryEntries] = useState<LogbookVerificationRegistryEntry[]>(() =>
    getVerificationRegistry(masterNurses)
  );

  useEffect(() => {
    const refreshRegistry = () => {
      setRegistryEntries(getVerificationRegistry(masterNurses));
    };
    refreshRegistry();
    window.addEventListener('verification_registry_updated', refreshRegistry);
    return () => window.removeEventListener('verification_registry_updated', refreshRegistry);
  }, [masterNurses, sessions]);

  // Aggregate all verified logbooks across all accounts (Perawat Pelaksana, PJ Shift, Kepala Ruang)
  // within the active date & shift
  const shiftSummary = useMemo(() => {
    return aggregateShiftVerifiedLogbooks({
      sessions,
      registryEntries,
      masterNurses,
      masterPatients,
      activeDateLabel: shiftInfo.date,
      activeShift,
      loggedInUserName: loggedInUser?.name,
      fallbackShiftInfo: shiftInfo
    });
  }, [
    sessions,
    registryEntries,
    masterNurses,
    masterPatients,
    shiftInfo,
    activeShift,
    loggedInUser?.name
  ]);

  const shiftScopeKey = `${shiftSummary.activeDateIso}_${activeShift}`;

  // Effective ShiftInfo with Section A auto-computed values for display & printable sheet
  const effectiveShiftInfo = useMemo<ShiftInfo>(
    () => ({
      ...shiftInfo,
      date: shiftSummary.activeDateFormatted,
      shift: activeShift,
      shiftHours: shiftSummary.shiftHours,
      pjShift: shiftSummary.pjShiftName,
      kepalaRuangan: shiftSummary.kepalaRuanganName || DEFAULT_KEPALA_RUANGAN_NAME,
      totalPerawatDinas: shiftSummary.jumlahPerawatDinas,
      detailPerawat: shiftSummary.jumlahPerawatDinasLabel,
      perawatRatio: shiftSummary.rasioPerawatPasien
    }),
    [shiftInfo, shiftSummary, activeShift]
  );

  // Track whether user manually edited census / clinical / sbar in the current date+shift scope
  const [manualOverrideScope, setManualOverrideScope] = useState<{
    censusScope: string | null;
    clinicalScope: string | null;
    sbarScope: string | null;
    manualShiftDateIso: string | null;
  }>({
    censusScope: null,
    clinicalScope: null,
    sbarScope: null,
    manualShiftDateIso: null
  });

  const [manualCensus, setManualCensus] = useState<AggregatedCensus>(() => shiftSummary.census);

  const [manualMachine, setManualMachine] = useState<MachineOverview>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MACHINE);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return machineOverview || initialMachineOverview;
  });

  const [manualClinical, setManualClinical] = useState<ClinicalIndicatorItem[]>(() =>
    shiftSummary.clinicalIndicators.length > 0
      ? shiftSummary.clinicalIndicators
      : clinicalIndicators
  );

  // Automatically keep Section B (Census), Section C (Clinical Indicators), and Section E (SBAR)
  // synchronized with verified shift logbooks whenever verified data or shift/date changes
  useEffect(() => {
    if (manualOverrideScope.censusScope !== shiftScopeKey) {
      setManualCensus(shiftSummary.census);
    }
  }, [shiftSummary.census, shiftScopeKey, manualOverrideScope.censusScope]);

  useEffect(() => {
    if (manualOverrideScope.clinicalScope !== shiftScopeKey) {
      setManualClinical(shiftSummary.clinicalIndicators);
    }
  }, [shiftSummary.clinicalIndicators, shiftScopeKey, manualOverrideScope.clinicalScope]);

  useEffect(() => {
    if (manualOverrideScope.sbarScope !== shiftScopeKey) {
      setSbar(shiftSummary.autoSbar);
    }
  }, [shiftSummary.autoSbar, shiftScopeKey, manualOverrideScope.sbarScope, setSbar]);

  // Keep parent shiftInfo manpower fields aligned with shiftSummary
  useEffect(() => {
    setShiftInfo((prev) => {
      if (
        prev.pjShift === shiftSummary.pjShiftName &&
        prev.kepalaRuangan === shiftSummary.kepalaRuanganName &&
        prev.totalPerawatDinas === shiftSummary.jumlahPerawatDinas &&
        prev.detailPerawat === shiftSummary.jumlahPerawatDinasLabel &&
        prev.perawatRatio === shiftSummary.rasioPerawatPasien &&
        prev.shiftHours === shiftSummary.shiftHours
      ) {
        return prev;
      }
      return {
        ...prev,
        shiftHours: shiftSummary.shiftHours,
        pjShift: shiftSummary.pjShiftName,
        kepalaRuangan: shiftSummary.kepalaRuanganName,
        totalPerawatDinas: shiftSummary.jumlahPerawatDinas,
        detailPerawat: shiftSummary.jumlahPerawatDinasLabel,
        perawatRatio: shiftSummary.rasioPerawatPasien
      };
    });
  }, [
    setShiftInfo,
    shiftSummary.pjShiftName,
    shiftSummary.kepalaRuanganName,
    shiftSummary.jumlahPerawatDinas,
    shiftSummary.jumlahPerawatDinasLabel,
    shiftSummary.rasioPerawatPasien,
    shiftSummary.shiftHours
  ]);

  // Sync unsigned signature names with PJ Shift (account owner) and Kepala Ruangan (TWIS FERTILIANTI PW)
  useEffect(() => {
    setSignatures((prev) => {
      const nextPjName = prev.pjShift.signed ? prev.pjShift.name : shiftSummary.pjShiftName;
      const nextKaruName = prev.kepalaRuangan.signed
        ? prev.kepalaRuangan.name
        : shiftSummary.kepalaRuanganName;
      if (
        prev.pjShift.name === nextPjName &&
        prev.kepalaRuangan.name === nextKaruName
      ) {
        return prev;
      }
      return {
        ...prev,
        pjShift: { ...prev.pjShift, name: nextPjName },
        kepalaRuangan: { ...prev.kepalaRuangan, name: nextKaruName }
      };
    });
  }, [setSignatures, shiftSummary.pjShiftName, shiftSummary.kepalaRuanganName]);

  // Real-time Cloud Firestore listener for shift-specific doctor names, SBAR, operational items & signatures
  useEffect(() => {
    const unsub = subscribeToShiftReport(
      shiftSummary.activeDateIso,
      activeShift,
      (cloudReport) => {
        if (cloudReport.shiftInfo) {
          setShiftInfo((prev) => ({
            ...prev,
            dokterDpjp:
              cloudReport.shiftInfo?.dokterDpjp !== undefined
                ? cloudReport.shiftInfo.dokterDpjp
                : prev.dokterDpjp,
            dokterJaga:
              cloudReport.shiftInfo?.dokterJaga !== undefined
                ? cloudReport.shiftInfo.dokterJaga
                : prev.dokterJaga,
            tenagaPendukung:
              cloudReport.shiftInfo?.tenagaPendukung !== undefined
                ? cloudReport.shiftInfo.tenagaPendukung
                : prev.tenagaPendukung,
            pjShiftBerikutnya:
              cloudReport.shiftInfo?.pjShiftBerikutnya !== undefined
                ? cloudReport.shiftInfo.pjShiftBerikutnya
                : prev.pjShiftBerikutnya
          }));
        }
        if (cloudReport.operationalItems && Array.isArray(cloudReport.operationalItems)) {
          setOperationalItems(cloudReport.operationalItems);
        }
        if (cloudReport.signatures) {
          setSignatures((prev) => ({
            pjShift: cloudReport.signatures?.pjShift?.signed
              ? cloudReport.signatures.pjShift
              : { ...prev.pjShift, name: shiftSummary.pjShiftName },
            pjBerikutnya: cloudReport.signatures?.pjBerikutnya || prev.pjBerikutnya,
            kepalaRuangan: cloudReport.signatures?.kepalaRuangan?.signed
              ? cloudReport.signatures.kepalaRuangan
              : { ...prev.kepalaRuangan, name: shiftSummary.kepalaRuanganName }
          }));
        }
      }
    );
    return () => unsub();
  }, [
    shiftSummary.activeDateIso,
    activeShift,
    shiftSummary.pjShiftName,
    shiftSummary.kepalaRuanganName,
    setShiftInfo,
    setOperationalItems,
    setSignatures
  ]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEYS.CENSUS}_${shiftScopeKey}`, JSON.stringify(manualCensus));
    } catch {
      // storage quota
    }
  }, [manualCensus, shiftScopeKey]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MACHINE, JSON.stringify(manualMachine));
      setMachineOverview(manualMachine);
    } catch {
      // storage quota
    }
  }, [manualMachine, setMachineOverview]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEYS.CLINICAL}_${shiftScopeKey}`, JSON.stringify(manualClinical));
    } catch {
      // storage quota
    }
  }, [manualClinical, shiftScopeKey]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // =========================================================================
  // LOGBOOK SHIFT AUTO-SYNCHRONIZATION (FOR PJ SHIFT & KEPALA RUANGAN)
  // =========================================================================
  useEffect(() => {
    if (userRole !== 'pj_shift' && userRole !== 'kepala_ruangan') return;
    if (manualOverrideScope.manualShiftDateIso === shiftSummary.activeDateIso) return;

    let savedLastShift: string | null = null;
    try {
      savedLastShift = localStorage.getItem('dialysis_last_logbook_shift');
    } catch {
      // ignore
    }

    const detectedShift = detectActiveLogbookShiftForDate({
      activeDateLabel: shiftInfo.date,
      sessions,
      registryEntries,
      lastSelectedLogbookShift: savedLastShift,
      loggedInUserShift: loggedInUser?.shift
    });

    if (detectedShift && detectedShift !== activeShift) {
      const nextHours = formatShiftHoursForShift(detectedShift);
      setShiftInfo((prev) => ({
        ...prev,
        shift: detectedShift,
        shiftHours: nextHours
      }));
      showToast(
        `Shift Laporan Harian otomatis diselaraskan ke Shift ${detectedShift} sesuai input logbook.`
      );
    }
  }, [
    userRole,
    shiftInfo.date,
    shiftSummary.activeDateIso,
    sessions,
    registryEntries,
    activeShift,
    loggedInUser?.shift,
    manualOverrideScope.manualShiftDateIso,
    setShiftInfo
  ]);

  const handleSwitchShift = (targetShift: 'Pagi' | 'Siang') => {
    const nextHours = formatShiftHoursForShift(targetShift);

    try {
      localStorage.setItem('dialysis_last_logbook_shift', targetShift);
    } catch {
      // ignore
    }

    setManualOverrideScope((prev) => ({
      ...prev,
      manualShiftDateIso: shiftSummary.activeDateIso
    }));

    setShiftInfo((prev) => ({
      ...prev,
      shift: targetShift,
      shiftHours: nextHours
    }));
    showToast(`Shift Laporan dialihkan ke Shift ${targetShift} (${nextHours}).`);
  };

  const handleDatePickerChange = (nextIso: string) => {
    if (!nextIso) return;
    setManualOverrideScope((prev) => ({
      ...prev,
      manualShiftDateIso: null
    }));
    if (onDateChange) {
      onDateChange(nextIso);
    } else {
      setShiftInfo((prev) => ({
        ...prev,
        date: formatIsoDateToIndonesianFull(nextIso)
      }));
    }
  };

  // =========================================================================
  // ACTIONS & HANDLERS
  // =========================================================================

  const handleCensusChange = (field: keyof AggregatedCensus, value: number) => {
    const safeVal = Math.max(0, isNaN(value) ? 0 : value);
    setManualOverrideScope((prev) => ({ ...prev, censusScope: shiftScopeKey }));
    setManualCensus((prev) => {
      const next = { ...prev, [field]: safeVal };
      if (field === 'pasienHadirSelesai' || field === 'pasienCitoEmergency') {
        next.totalPasienDilayani = next.pasienHadirSelesai + next.pasienCitoEmergency;
      }
      return next;
    });
  };

  const handleMachineChange = (field: keyof MachineOverview, value: number) => {
    const safeVal = Math.max(0, isNaN(value) ? 0 : value);
    setManualMachine((prev) => ({ ...prev, [field]: safeVal }));
  };

  const handleClinicalChange = (
    id: string,
    field: keyof ClinicalIndicatorItem,
    value: string | boolean
  ) => {
    setManualOverrideScope((prev) => ({ ...prev, clinicalScope: shiftScopeKey }));
    setManualClinical((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleAddClinicalIndicator = () => {
    const newId = `cli-${Date.now()}`;
    const newItem: ClinicalIndicatorItem = {
      id: newId,
      label: 'Indikator Klinis Baru',
      capaian: '0',
      standar: 'Standar Target',
      analisis: 'Hasil observasi dan tindak lanjut',
      isStandardMet: true
    };
    setManualOverrideScope((prev) => ({ ...prev, clinicalScope: shiftScopeKey }));
    setManualClinical((prev) => [...prev, newItem]);
    showToast('Baris indikator klinis baru berhasil ditambahkan.');
  };

  const handleDeleteClinicalIndicator = (id: string) => {
    setManualOverrideScope((prev) => ({ ...prev, clinicalScope: shiftScopeKey }));
    setManualClinical((prev) => prev.filter((item) => item.id !== id));
    showToast('Baris indikator klinis dihapus.');
  };

  const handleResetClinicalToStandard = () => {
    setManualOverrideScope((prev) => ({ ...prev, clinicalScope: null }));
    setManualClinical(shiftSummary.clinicalIndicators);
    showToast('Indikator klinis diselaraskan ke logbook terverifikasi shift ini.');
  };

  const handleOperationalChange = (
    id: string,
    field: keyof OperationalItem,
    value: string
  ) => {
    setOperationalItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleAddOperationalItem = () => {
    const newId = `op-${Date.now()}`;
    const newItem: OperationalItem = {
      id: newId,
      item: 'Item Pengawasan Baru',
      parameterUji: 'Parameter pengawasan & pengujian',
      hasilObservasi: 'Hasil observasi fisik / uji shift',
      statusKepatuhan: 'MEMENUHI SYARAT'
    };
    setOperationalItems((prev) => [...prev, newItem]);
    showToast('Baris item operasional baru berhasil ditambahkan.');
  };

  const handleDeleteOperationalItem = (id: string) => {
    setOperationalItems((prev) => prev.filter((item) => item.id !== id));
    showToast('Item operasional dihapus.');
  };

  const handleResetOperationalToStandard = () => {
    setOperationalItems(initialOperationalItems);
    showToast('Item operasional direset ke standar KARS.');
  };

  const handlePullBaselineFromSessions = () => {
    setRegistryEntries(getVerificationRegistry(masterNurses));
    setManualOverrideScope((prev) => ({
      ...prev,
      censusScope: null,
      clinicalScope: null,
      sbarScope: null
    }));
    setManualCensus(shiftSummary.census);
    setManualClinical(shiftSummary.clinicalIndicators);
    setSbar(shiftSummary.autoSbar);
    showToast(
      `Rekap Shift ${activeShift} (${shiftSummary.activeDateFormatted}) disinkronkan dari ${shiftSummary.totalPasienDilayani} logbook terverifikasi (${shiftSummary.jumlahPerawatDinasLabel} perawat).`
    );
  };

  const handleRegenerateSbar = () => {
    setManualOverrideScope((prev) => ({ ...prev, sbarScope: null }));
    const freshSbar =
      shiftSummary.verifiedSessions.length > 0
        ? generateAutoSbar(effectiveShiftInfo, manualCensus, shiftSummary.verifiedSessions)
        : shiftSummary.autoSbar;
    setSbar(freshSbar);
    showToast('Narasi SBAR diperbarui dari data logbook terverifikasi shift ini.');
  };

  const handleSign = (roleKey: 'pjShift' | 'pjBerikutnya' | 'kepalaRuangan') => {
    const timeFormatted = formatShortIndonesianTimestampWib();
    const signerName =
      roleKey === 'pjShift'
        ? shiftSummary.pjShiftName || 'PJ Shift'
        : roleKey === 'kepalaRuangan'
        ? shiftSummary.kepalaRuanganName || DEFAULT_KEPALA_RUANGAN_NAME
        : shiftInfo.pjShiftBerikutnya || 'PJ Shift Berikutnya';

    const nextSignatures: ShiftSignatures = {
      ...signatures,
      [roleKey]: {
        name: signerName,
        signed: true,
        signedAt: timeFormatted
      }
    };
    setSignatures(nextSignatures);

    saveShiftReportCloud(shiftSummary.activeDateIso, activeShift, {
      shiftInfo: effectiveShiftInfo,
      sbar,
      signatures: nextSignatures,
      operationalItems
    }).catch(() => {});

    const roleTitle =
      roleKey === 'pjShift'
        ? 'PJ Shift'
        : roleKey === 'pjBerikutnya'
        ? 'PJ Shift Berikutnya'
        : 'Kepala Ruangan';
    showToast(`Pengesahan digital ${roleTitle} berhasil dibubuhkan (${timeFormatted}).`);
  };

  const handleResetSignature = (roleKey: 'pjShift' | 'pjBerikutnya' | 'kepalaRuangan') => {
    const nextSignatures: ShiftSignatures = {
      ...signatures,
      [roleKey]: {
        ...signatures[roleKey],
        signed: false,
        signedAt: ''
      }
    };
    setSignatures(nextSignatures);
    saveShiftReportCloud(shiftSummary.activeDateIso, activeShift, {
      shiftInfo: effectiveShiftInfo,
      sbar,
      signatures: nextSignatures,
      operationalItems
    }).catch(() => {});
    showToast('Status tanda tangan telah direset.');
  };

  const handleSaveAllReport = () => {
    try {
      localStorage.setItem(`${STORAGE_KEYS.CENSUS}_${shiftScopeKey}`, JSON.stringify(manualCensus));
      localStorage.setItem(STORAGE_KEYS.MACHINE, JSON.stringify(manualMachine));
      localStorage.setItem(`${STORAGE_KEYS.CLINICAL}_${shiftScopeKey}`, JSON.stringify(manualClinical));
      localStorage.setItem('rshl_shift_operational_v1', JSON.stringify(operationalItems));
      localStorage.setItem('rshl_shift_sbar_v1', JSON.stringify(sbar));
      localStorage.setItem('dialysis_signatures_v1', JSON.stringify(signatures));
    } catch {
      // ignore
    }
    saveShiftReportCloud(shiftSummary.activeDateIso, activeShift, {
      shiftInfo: effectiveShiftInfo,
      sbar,
      signatures,
      operationalItems
    }).catch(() => {});
    showToast('Laporan Harian Shift berhasil disimpan dan disinkronkan ke lembar cetak & Cloud.');
  };

  const handlePrintOrSavePdf = () => {
    // 1. Save all report fields first so latest inputs are reflected
    handleSaveAllReport();

    // 2. Ensure printable document tab is active so user sees the report in full
    if (activeSubTab !== 'preview_full') {
      setActiveSubTab('preview_full');
    }

    showToast('Menyiapkan Laporan PJ Shift untuk Cetak / Simpan PDF...');

    // 3. Trigger portrait print dialog with a small timeout to let the DOM settle
    const docTitle = `Laporan_PJ_Shift_${activeShift}_${shiftSummary.activeDateIso}`;
    setTimeout(() => {
      printDocumentWithOrientation(false, docTitle); // A4 Portrait
    }, 250);
  };

  const activeDateFormatted = shiftSummary.activeDateFormatted;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs border border-slate-700 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Title Lockup */}
      <div className="bg-white/85 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            {!isSupervisor && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 font-medium">
                <span className="font-bold text-[#1e4b85]">Standar Akreditasi KARS &amp; PERNEFRI</span>
                <span aria-hidden="true">·</span>
                <span>Rekapitulasi Logbook Terverifikasi Lintas Akun</span>
                <span aria-hidden="true">·</span>
                <span>Unit HD RS Happy Land</span>
              </div>
            )}
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1 uppercase tracking-tight">
              {isSupervisor ? 'LAPORAN PJ SHIFT' : 'LAPORAN HARIAN SHIFT HEMODIALISIS'}
            </h1>
            {!isSupervisor && (
              <p className="text-xs text-slate-600 mt-0.5 max-w-3xl">
                Merangkum seluruh data logbook pasien yang diinputkan oleh Perawat Pelaksana, PJ Shift, dan Kepala Ruang serta telah terverifikasi pada tanggal dan shift dinas yang sama.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePullBaselineFromSessions}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Sinkronkan ulang dari seluruh logbook terverifikasi pada shift ini"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
              <span>Sinkron Logbook</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAllReport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs whitespace-nowrap shrink-0"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Laporan</span>
            </button>

            <button
              type="button"
              onClick={handlePrintOrSavePdf}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1e4b85] hover:bg-[#163865] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs whitespace-nowrap shrink-0"
              title="Cetak langsung atau simpan sebagai dokumen PDF resmi (Seksi A–F)"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>
          </div>
        </div>

        {/* Summary Strip of Section A Key Shift Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-3 border-t border-slate-200/80 text-xs tabular-nums">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] text-slate-500 block">Hari / Tanggal</span>
            <span className="font-bold text-slate-900 block mt-0.5 truncate" title={activeDateFormatted}>
              {activeDateFormatted}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] text-slate-500 block">Shift Dinas</span>
            <span className="font-bold text-[#1e4b85] block mt-0.5 truncate" title={effectiveShiftInfo.shiftHours}>
              Shift {activeShift} ({activeShift === 'Siang' ? '14.00–21.00' : '07.00–14.00'})
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] text-slate-500 block">PJ Shift (Pemilik Akun)</span>
            <span className="font-bold text-slate-900 block mt-0.5 truncate" title={effectiveShiftInfo.pjShift}>
              {effectiveShiftInfo.pjShift}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] text-slate-500 block">Jumlah Perawat Dinas</span>
            <span className="font-extrabold text-slate-900 block mt-0.5">
              {shiftSummary.jumlahPerawatDinasLabel}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] text-slate-500 block">Rasio Perawat &amp; Pasien</span>
            <span className="font-extrabold text-emerald-800 block mt-0.5 truncate" title={shiftSummary.rasioPerawatPasien}>
              {shiftSummary.rasioPerawatPasien}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200">
            <span className="text-[11px] text-blue-800 block">Total Pasien Dilayani</span>
            <span className="font-extrabold text-blue-950 block mt-0.5 truncate" title={shiftSummary.totalPasienDilayaniLabel}>
              {shiftSummary.totalPasienDilayani} Pasien
            </span>
          </div>
        </div>

        {shiftSummary.pendingSubmissionsCount > 0 && (
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-2 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                Terdapat <strong>{shiftSummary.pendingSubmissionsCount} pengajuan logbook perawat</strong> pada Shift {activeShift} ({activeDateFormatted}) yang masih menunggu pengesahan di menu <strong>Verifikasi</strong>. Data akan otomatis masuk ke Laporan Harian setelah diverifikasi.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Sub-Tabs Navigation for Section Selection */}
      <div
        className={`bg-white/80 backdrop-blur-md p-1.5 rounded-2xl border border-white/80 shadow-xs flex flex-wrap items-center ${
          isSupervisor ? 'justify-end' : 'justify-between'
        } gap-2 print:hidden`}
      >
        {!isSupervisor && (
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveSubTab('preview_full')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'preview_full'
                  ? 'bg-[#1e4b85] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              Dokumen Cetak (A–F)
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('section_a')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'section_a'
                  ? 'bg-[#1e4b85] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4" />
              Seksi A: Ketenagaan
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('section_b')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'section_b'
                  ? 'bg-[#1e4b85] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Activity className="w-4 h-4" />
              Seksi B: Sensus &amp; Mesin
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('section_c')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'section_c'
                  ? 'bg-[#1e4b85] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              Seksi C: Asuhan Klinis
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('section_d')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'section_d'
                  ? 'bg-[#1e4b85] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              Seksi D: Operasional &amp; RO
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('section_e')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'section_e'
                  ? 'bg-[#1e4b85] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Seksi E: Handover SBAR
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('section_f')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'section_f'
                  ? 'bg-[#1e4b85] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              Seksi F: Pengesahan
            </button>
          </div>
        )}

        {/* Active Date & Shift Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-100 text-[11px] font-semibold text-slate-700 tabular-nums">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#1e4b85]" />
            <input
              type="date"
              aria-label="Pilih Tanggal Laporan Harian"
              value={shiftSummary.activeDateIso}
              onChange={(e) => handleDatePickerChange(e.target.value)}
              className="bg-white border border-slate-200 rounded-md px-2 py-0.5 text-[11px] font-bold text-slate-900 cursor-pointer"
            />
            {isCustomDate && onResetDateToToday && (
              <button
                type="button"
                onClick={onResetDateToToday}
                className="px-2 py-0.5 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-[10px] font-bold text-[#1e4b85] cursor-pointer whitespace-nowrap"
              >
                Hari Ini
              </button>
            )}
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => handleSwitchShift('Pagi')}
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors whitespace-nowrap ${
                activeShift === 'Pagi'
                  ? 'bg-[#1e4b85] text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title="Shift Pagi (07.00 - 14.00 WIB)"
            >
              Shift Pagi
            </button>
            <button
              type="button"
              onClick={() => handleSwitchShift('Siang')}
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors whitespace-nowrap ${
                activeShift === 'Siang'
                  ? 'bg-[#1e4b85] text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title="Shift Siang (14.00 - 21.00 WIB)"
            >
              Shift Siang
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 1. PREVIEW DOKUMEN CETAK LENGKAP (SEKSI A–F)                           */}
      {/* ===================================================================== */}
      {activeSubTab === 'preview_full' ? (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-blue-900 print:hidden">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-700 shrink-0" />
              <span>
                <strong>Pratinjau Lembar Cetak Resmi:</strong> Merangkum otomatis seluruh logbook terverifikasi pada <strong>Shift {activeShift} ({activeDateFormatted})</strong> ({shiftSummary.jumlahPerawatDinasLabel} Perawat Dinas · {shiftSummary.totalPasienDilayani} Pasien Dilayani · Rasio {shiftSummary.rasioPerawatPasien}).
              </span>
            </div>
            {!isSupervisor && (
              <button
                type="button"
                onClick={() => setActiveSubTab('section_a')}
                className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Detail &amp; Dokter Seksi A
              </button>
            )}
          </div>

          <OfficialReportPrintable
            shiftInfo={effectiveShiftInfo}
            census={manualCensus}
            machineOverview={manualMachine}
            clinicalIndicators={manualClinical}
            operationalItems={operationalItems}
            sbar={sbar}
            signatures={signatures}
            onPrint={handlePrintOrSavePdf}
            onSign={handleSign}
          />
        </div>
      ) : (
        /* Rendered invisibly on screen, but fully available in print media so user can print from any subtab! */
        <div className="hidden print:block">
          <OfficialReportPrintable
            shiftInfo={effectiveShiftInfo}
            census={manualCensus}
            machineOverview={manualMachine}
            clinicalIndicators={manualClinical}
            operationalItems={operationalItems}
            sbar={sbar}
            signatures={signatures}
            onPrint={handlePrintOrSavePdf}
            onSign={handleSign}
          />
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. SEKSI A: INFORMASI UMUM SHIFT & KETENAGAAN                          */}
      {/* ===================================================================== */}
      {activeSubTab === 'section_a' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-6 shadow-xs print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="text-[11px] font-bold text-[#1e4b85] uppercase tracking-wider">
                A. INFORMASI UMUM SHIFT &amp; KETENAGAAN
              </div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                <Users className="w-5 h-5 text-[#1e4b85]" />
                Informasi Umum Shift &amp; Ketenagaan Unit HD
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Otomatis merangkum hari/tanggal aktif, pemilik akun PJ Shift, Kepala Ruangan HD, jumlah perawat yang menginputkan logbook terverifikasi, shift dinas, rasio perawat dan pasien, serta total pasien dilayani.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                handleSaveAllReport();
                setActiveSubTab('section_b');
              }}
              className="px-4 py-2 bg-[#1e4b85] hover:bg-[#163865] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 self-start cursor-pointer whitespace-nowrap"
            >
              <Save className="w-4 h-4" />
              Simpan &amp; Lanjut ke Seksi B
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 tabular-nums">
            {/* Left Column: Waktu, Shift, Pejabat & Dokter */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3.5">
              <div className="text-xs font-bold text-[#1e4b85] uppercase tracking-wider flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4" />
                Identitas Shift, Pejabat &amp; Dokter
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* 1. Hari / Tanggal */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Hari / Tanggal
                    </label>
                    <span className="text-[10px] text-slate-500">Hari Aktif Otomatis</span>
                  </div>
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      readOnly
                      value={activeDateFormatted}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold text-slate-900"
                    />
                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        value={shiftSummary.activeDateIso}
                        onChange={(e) => handleDatePickerChange(e.target.value)}
                        className="text-[11px] px-2 py-1 border border-slate-300 rounded-md bg-white text-slate-700 cursor-pointer"
                      />
                      {shiftSummary.activeDateIso !== getCurrentIsoDateWib() && (
                        <button
                          type="button"
                          onClick={() => handleDatePickerChange(getCurrentIsoDateWib())}
                          className="px-2 py-1 rounded-md bg-white hover:bg-slate-100 border border-slate-300 text-[10px] font-bold text-[#1e4b85] cursor-pointer whitespace-nowrap"
                        >
                          Reset Hari Aktif
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Shift Dinas */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Shift Dinas
                    </label>
                    <span className="text-[10px] text-slate-500">Sesuai Logbook</span>
                  </div>
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      readOnly
                      value={effectiveShiftInfo.shiftHours}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold text-slate-900"
                    />
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSwitchShift('Pagi')}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold cursor-pointer border transition-colors whitespace-nowrap ${
                          activeShift === 'Pagi'
                            ? 'bg-[#1e4b85] text-white border-[#1e4b85]'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        Shift Pagi (07.00–14.00)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSwitchShift('Siang')}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold cursor-pointer border transition-colors whitespace-nowrap ${
                          activeShift === 'Siang'
                            ? 'bg-[#1e4b85] text-white border-[#1e4b85]'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        Shift Siang (14.00–21.00)
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Penanggung Jawab (PJ) Shift */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Penanggung Jawab (PJ) Shift
                    </label>
                    <span className="text-[10px] text-slate-500">Pemilik Akun</span>
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={effectiveShiftInfo.pjShift}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold text-slate-900"
                  />
                </div>

                {/* 4. Kepala Ruangan HD */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Kepala Ruangan HD
                    </label>
                    <span className="text-[10px] text-slate-500">Ka. Ruang Unit HD</span>
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={effectiveShiftInfo.kepalaRuangan}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold text-slate-900"
                  />
                </div>

                {/* 5. Dokter DPJP Unit HD */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Dokter DPJP Unit HD
                    </label>
                    <span className="text-[10px] text-blue-700 font-medium">Sp.PD-KGH / Penanggung Jawab</span>
                  </div>
                  <input
                    type="text"
                    value={shiftInfo.dokterDpjp}
                    onChange={(e) => setShiftInfo({ ...shiftInfo, dokterDpjp: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold text-slate-900"
                    placeholder="Nama Dokter DPJP Unit HD"
                  />
                  <div className="flex flex-wrap items-center gap-1 mt-1.5">
                    <span className="text-[10px] text-slate-500">Pilihan Cepat:</span>
                    {activeDpjpDoctors.map((dr) => (
                      <button
                        key={dr}
                        type="button"
                        onClick={() => setShiftInfo({ ...shiftInfo, dokterDpjp: dr })}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer border transition-colors ${
                          shiftInfo.dokterDpjp === dr
                            ? 'bg-blue-600 text-white border-blue-700'
                            : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border-blue-200'
                        }`}
                      >
                        {dr}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 6. Dokter Jaga Ruangan */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Dokter Jaga Ruangan
                    </label>
                    <span className="text-[10px] text-emerald-700 font-medium">Standby Shift Ini</span>
                  </div>
                  <input
                    type="text"
                    value={shiftInfo.dokterJaga}
                    onChange={(e) => setShiftInfo({ ...shiftInfo, dokterJaga: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold text-slate-900"
                    placeholder="Nama Dokter Umum Ruangan"
                  />
                  <div className="flex flex-wrap items-center gap-1 mt-1.5">
                    <span className="text-[10px] text-slate-500">Pilihan Cepat:</span>
                    {activeJagaDoctors.map((dr) => (
                      <button
                        key={dr}
                        type="button"
                        onClick={() => setShiftInfo({ ...shiftInfo, dokterJaga: dr })}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer border transition-colors ${
                          shiftInfo.dokterJaga === dr
                            ? 'bg-emerald-600 text-white border-emerald-700'
                            : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200'
                        }`}
                      >
                        {dr}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Ketenagaan Perawat Dinas, Rasio & Total Pasien Dilayani */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3.5">
              <div className="text-xs font-bold text-[#1e4b85] uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                Rekap Ketenagaan, Rasio &amp; Pasien Dilayani (Shift {activeShift})
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* 7. Jumlah Perawat Dinas */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Jumlah Perawat Dinas
                    </label>
                    <span className="text-[10px] text-slate-500">
                      dari {masterNurses.length || 17} Perawat
                    </span>
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={shiftSummary.jumlahPerawatDinasLabel}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white font-extrabold text-slate-900"
                  />
                </div>

                {/* 8. Rasio Perawat dan Pasien */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Rasio Perawat dan Pasien
                    </label>
                    <span className="text-[10px] text-slate-500">Otomatis Shift</span>
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={shiftSummary.rasioPerawatPasien}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white font-extrabold text-emerald-800"
                  />
                </div>

                {/* 9. Total Pasien Dilayani */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Total Pasien Dilayani
                    </label>
                    <span className="text-[10px] text-slate-500">
                      Logbook Pasien Terverifikasi ({activeDateFormatted} · Shift {activeShift})
                    </span>
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={shiftSummary.totalPasienDilayaniLabel}
                    className="w-full p-2 border border-blue-300 rounded-lg bg-blue-50/50 font-extrabold text-blue-950"
                  />
                </div>

                {/* Tenaga Pendukung Dinas */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Tenaga Pendukung Dinas (RO / Elektromedis / HK / Admin)
                  </label>
                  <input
                    type="text"
                    value={shiftInfo.tenagaPendukung}
                    onChange={(e) => setShiftInfo({ ...shiftInfo, tenagaPendukung: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900"
                    placeholder="1 Teknisi Elektromedis/RO, 1 HK Ruangan, 1 Administrasi"
                  />
                </div>
              </div>

              {/* Participating Nurses Breakdown */}
              <div className="pt-2 border-t border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-700">
                    Daftar Perawat Penginput Logbook Terverifikasi ({shiftSummary.jumlahPerawatDinasLabel})
                  </span>
                  <span className="text-slate-500">
                    Pelaksana · PJ Shift · Kepala Ruang
                  </span>
                </div>
                {shiftSummary.participatingNurses.length === 0 ? (
                  <div className="p-3 rounded-lg bg-white border border-slate-200 text-xs text-slate-500">
                    Belum ada perawat dengan logbook terverifikasi pada Shift {activeShift} ({activeDateFormatted}).
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {shiftSummary.participatingNurses.map((nurse, idx) => (
                      <div
                        key={nurse.canonicalKey}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px]"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-bold text-slate-900 block truncate">
                            {idx + 1}. {nurse.name}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {nurse.role === 'kepala_ruangan'
                              ? 'Kepala Ruang'
                              : nurse.role === 'pj_shift'
                              ? 'PJ Shift'
                              : 'Perawat Pelaksana'}
                          </span>
                        </div>
                        <span className="font-bold text-[#1e4b85] shrink-0">
                          {nurse.patientCount} Pasien
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. SEKSI B: SENSUS PASIEN, AKSES VASKULAR & UTILISASI MESIN HD         */}
      {/* ===================================================================== */}
      {activeSubTab === 'section_b' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-6 shadow-xs print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="text-[11px] font-bold text-[#1e4b85] uppercase tracking-wider">
                SEKSI B (PENGISIAN MANUAL)
              </div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                <Activity className="w-5 h-5 text-[#1e4b85]" />
                Sensus Pasien, Akses Vaskular &amp; Utilisasi Mesin Hemodialisis
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Seluruh kolom angka sensus dan mesin diisi secara manual. Anda dapat mengubah jumlah pasien hadir, rawat jalan/inap, akses vaskular, maupun mesin aktif.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start">
              <button
                type="button"
                onClick={handlePullBaselineFromSessions}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 flex items-center gap-1.5 cursor-pointer"
                title="Salin hitungan otomatis sesi pasien ke form manual"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                Salin dari Sesi Pasien
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSaveAllReport();
                  setActiveSubTab('section_c');
                }}
                className="px-4 py-2 bg-[#1e4b85] hover:bg-[#163865] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Simpan &amp; Lanjut ke Seksi C
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Sub-Section: Sensus & Klasifikasi Pasien */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-[#1e4b85] uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    Sensus &amp; Klasifikasi Pasien Shift
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Input Manual
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  {/* Pasien Terjadwal */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                    <div>
                      <span className="font-semibold text-slate-800 block">Pasien Terjadwal (Target Shift)</span>
                      <span className="text-[10px] text-slate-400">Target pasien terjadwal {activeDay} {activeShift}</span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={manualCensus.pasienTerjadwal}
                      onChange={(e) => handleCensusChange('pasienTerjadwal', parseInt(e.target.value, 10))}
                      className="w-20 text-center font-bold text-sm p-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
                    />
                  </div>

                  {/* Pasien Hadir & Selesai HD */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                    <div>
                      <span className="font-semibold text-blue-900 block">Pasien Hadir &amp; Selesai HD</span>
                      <span className="text-[10px] text-slate-400">Jumlah pasien yang tuntas menjalani hemodialisa</span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={manualCensus.pasienHadirSelesai}
                      onChange={(e) => handleCensusChange('pasienHadirSelesai', parseInt(e.target.value, 10))}
                      className="w-20 text-center font-extrabold text-sm p-1.5 border border-blue-300 rounded-lg bg-blue-50/40 text-blue-950 focus:bg-white"
                    />
                  </div>

                  {/* Pasien HD Cito / Emergency */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                    <div>
                      <span className="font-semibold text-rose-800 block">Pasien HD Cito / Emergency (ICU/IGD)</span>
                      <span className="text-[10px] text-slate-400">Pasien tidak terjadwal rujukan gawat darurat</span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={manualCensus.pasienCitoEmergency}
                      onChange={(e) => handleCensusChange('pasienCitoEmergency', parseInt(e.target.value, 10))}
                      className="w-20 text-center font-bold text-sm p-1.5 border border-rose-300 rounded-lg bg-rose-50/40 text-rose-950 focus:bg-white"
                    />
                  </div>

                  {/* Pasien Batal / Tunda */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                    <div>
                      <span className="font-semibold text-slate-700 block">Pasien Batal / Tunda (Reschedule)</span>
                      <span className="text-[10px] text-slate-400">Pasien berhalangan / kondisi hemodinamik tidak stabil</span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={manualCensus.pasienBatalTunda}
                      onChange={(e) => handleCensusChange('pasienBatalTunda', parseInt(e.target.value, 10))}
                      className="w-20 text-center font-bold text-sm p-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
                    />
                  </div>

                  {/* Kategori Reguler */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                    <div>
                      <span className="font-semibold text-slate-800 block">Kategori: Pasien Reguler (Non-Hepatitis)</span>
                      <span className="text-[10px] text-slate-400">Ruangan hemodialisis reguler</span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={manualCensus.pasienReguler}
                      onChange={(e) => handleCensusChange('pasienReguler', parseInt(e.target.value, 10))}
                      className="w-20 text-center font-bold text-sm p-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
                    />
                  </div>

                  {/* Kategori Hep B */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                    <div>
                      <span className="font-semibold text-amber-800 block">Kategori: Pasien Isolasi Hepatitis B</span>
                      <span className="text-[10px] text-slate-400">Ruangan isolasi khusus Hepatitis B (HBsAg +)</span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={manualCensus.pasienHepB}
                      onChange={(e) => handleCensusChange('pasienHepB', parseInt(e.target.value, 10))}
                      className="w-20 text-center font-bold text-sm p-1.5 border border-amber-300 rounded-lg bg-amber-50/40 text-amber-900 focus:bg-white"
                    />
                  </div>

                  {/* Kategori Hep C */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                    <div>
                      <span className="font-semibold text-amber-800 block">Kategori: Pasien Isolasi Hepatitis C / HIV</span>
                      <span className="text-[10px] text-slate-400">Ruangan / mesin khusus Hepatitis C / HIV</span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={manualCensus.pasienHepC}
                      onChange={(e) => handleCensusChange('pasienHepC', parseInt(e.target.value, 10))}
                      className="w-20 text-center font-bold text-sm p-1.5 border border-amber-300 rounded-lg bg-amber-50/40 text-amber-900 focus:bg-white"
                    />
                  </div>

                  {/* Rawat Jalan vs Inap */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="p-2 rounded-lg bg-white border border-slate-200">
                      <span className="font-semibold text-slate-800 block text-[11px]">Pasien Rawat Jalan (Rajal)</span>
                      <input
                        type="number"
                        min={0}
                        value={manualCensus.pasienRajal}
                        onChange={(e) => handleCensusChange('pasienRajal', parseInt(e.target.value, 10))}
                        className="w-full text-center font-bold text-sm p-1 mt-1 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
                      />
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-slate-200">
                      <span className="font-semibold text-slate-800 block text-[11px]">Pasien Rawat Inap (Ranap)</span>
                      <input
                        type="number"
                        min={0}
                        value={manualCensus.pasienRanap}
                        onChange={(e) => handleCensusChange('pasienRanap', parseInt(e.target.value, 10))}
                        className="w-full text-center font-bold text-sm p-1 mt-1 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Total Pasien Dilayani */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                    <div>
                      <span className="font-bold text-blue-950 block">Total Pasien Dilayani Shift Ini</span>
                      <span className="text-[10px] text-blue-700">Dapat diedit atau mengikuti Hadir + Cito</span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={manualCensus.totalPasienDilayani}
                      onChange={(e) => handleCensusChange('totalPasienDilayani', parseInt(e.target.value, 10))}
                      className="w-20 text-center font-black text-base p-1 border border-blue-400 rounded-lg bg-white text-blue-950"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sub-Section: Mesin HD & Akses Vaskular */}
            <div className="space-y-4">
              {/* Box 1: Kapasitas Mesin */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-[#1e4b85] uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="w-4 h-4" />
                    Kapasitas &amp; Utilisasi Mesin HD
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-800">
                    {manualMachine.beroperasiSiapPakai} Beroperasi
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                    <span className="font-semibold text-slate-800">Total Kapasitas Mesin HD</span>
                    <input
                      type="number"
                      min={0}
                      value={manualMachine.totalCapacity}
                      onChange={(e) => handleMachineChange('totalCapacity', parseInt(e.target.value, 10))}
                      className="w-20 text-center font-bold text-sm p-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                    <span className="font-semibold text-emerald-800">Mesin Beroperasi Siap Pakai</span>
                    <input
                      type="number"
                      min={0}
                      value={manualMachine.beroperasiSiapPakai}
                      onChange={(e) => handleMachineChange('beroperasiSiapPakai', parseInt(e.target.value, 10))}
                      className="w-20 text-center font-bold text-sm p-1.5 border border-emerald-300 rounded-lg bg-emerald-50/40 text-emerald-950 focus:bg-white"
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                    <span className="font-semibold text-slate-600">Mesin Maintenance / Perbaikan</span>
                    <input
                      type="number"
                      min={0}
                      value={manualMachine.maintenance}
                      onChange={(e) => handleMachineChange('maintenance', parseInt(e.target.value, 10))}
                      className="w-20 text-center font-bold text-sm p-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                    <span className="font-semibold text-amber-800">Mesin Khusus Hepatitis B (Isolasi)</span>
                    <input
                      type="number"
                      min={0}
                      value={manualMachine.khususHepB}
                      onChange={(e) => handleMachineChange('khususHepB', parseInt(e.target.value, 10))}
                      className="w-20 text-center font-bold text-sm p-1.5 border border-amber-300 rounded-lg bg-amber-50/40 text-amber-950 focus:bg-white"
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                    <span className="font-semibold text-amber-800">Mesin Khusus Hepatitis C</span>
                    <input
                      type="number"
                      min={0}
                      value={manualMachine.khususHepC}
                      onChange={(e) => handleMachineChange('khususHepC', parseInt(e.target.value, 10))}
                      className="w-20 text-center font-bold text-sm p-1.5 border border-amber-300 rounded-lg bg-amber-50/40 text-amber-950 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Box 2: Akses Vaskular */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                <div className="text-xs font-bold text-[#1e4b85] uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  Distribusi Akses Vaskular Pasien Shift
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-white border border-slate-200">
                    <span className="font-semibold text-slate-800 block text-[11px]">AV Fistula (Cimino)</span>
                    <input
                      type="number"
                      min={0}
                      value={manualCensus.aksesAvFistula}
                      onChange={(e) => handleCensusChange('aksesAvFistula', parseInt(e.target.value, 10))}
                      className="w-full text-center font-bold text-sm p-1 mt-1 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-slate-200">
                    <span className="font-semibold text-slate-800 block text-[11px]">AV Graft</span>
                    <input
                      type="number"
                      min={0}
                      value={manualCensus.aksesAvGraft}
                      onChange={(e) => handleCensusChange('aksesAvGraft', parseInt(e.target.value, 10))}
                      className="w-full text-center font-bold text-sm p-1 mt-1 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-slate-200">
                    <span className="font-semibold text-slate-800 block text-[11px]">CDL Non-Tunnel</span>
                    <input
                      type="number"
                      min={0}
                      value={manualCensus.aksesCdlNonTunnel}
                      onChange={(e) => handleCensusChange('aksesCdlNonTunnel', parseInt(e.target.value, 10))}
                      className="w-full text-center font-bold text-sm p-1 mt-1 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-slate-200">
                    <span className="font-semibold text-slate-800 block text-[11px]">CDL Tunnel (Permcath)</span>
                    <input
                      type="number"
                      min={0}
                      value={manualCensus.aksesCdlPermcath}
                      onChange={(e) => handleCensusChange('aksesCdlPermcath', parseInt(e.target.value, 10))}
                      className="w-full text-center font-bold text-sm p-1 mt-1 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. SEKSI C: MONITORING ASUHAN KEPERAWATAN & PELAYANAN MEDIS SHIFT      */}
      {/* ===================================================================== */}
      {activeSubTab === 'section_c' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-6 shadow-xs print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="text-[11px] font-bold text-[#1e4b85] uppercase tracking-wider">
                SEKSI C (PENGISIAN MANUAL)
              </div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                <Stethoscope className="w-5 h-5 text-[#1e4b85]" />
                Monitoring Asuhan Keperawatan &amp; Pelayanan Medis Shift
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Input manual indikator asuhan klinis (capaian UF, insiden hipotensi, kram, clotting, alergi first-use, konsultasi DPJP). Anda dapat mengedit nilai capaian, target, analisis, atau menambah indikator baru.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start">
              <button
                type="button"
                onClick={handleResetClinicalToStandard}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 flex items-center gap-1.5 cursor-pointer"
                title="Kembalikan ke 8 indikator standar PERNEFRI"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                Reset Standar
              </button>
              <button
                type="button"
                onClick={handleAddClinicalIndicator}
                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold rounded-xl border border-blue-200 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-blue-700" />
                Tambah Indikator
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSaveAllReport();
                  setActiveSubTab('section_d');
                }}
                className="px-4 py-2 bg-[#1e4b85] hover:bg-[#163865] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Simpan &amp; Lanjut ke Seksi D
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-[#1e4b85]/10 text-slate-900 font-bold">
                  <th className="p-2.5 border border-slate-200 w-1/4">Indikator Asuhan Keperawatan &amp; Medis</th>
                  <th className="p-2.5 border border-slate-200 w-1/6 text-center">Capaian Shift Ini</th>
                  <th className="p-2.5 border border-slate-200 w-1/6 text-center">Standar Target</th>
                  <th className="p-2.5 border border-slate-200">Analisis &amp; Rencana Tindak Lanjut</th>
                  <th className="p-2.5 border border-slate-200 w-12 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {manualClinical.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                    <td className="p-2 border border-slate-200">
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => handleClinicalChange(item.id, 'label', e.target.value)}
                        className="w-full p-1.5 text-xs font-semibold text-slate-900 border border-slate-300 rounded bg-white"
                        placeholder="Nama indikator klinis"
                      />
                    </td>
                    <td className="p-2 border border-slate-200 text-center">
                      <input
                        type="text"
                        value={item.capaian}
                        onChange={(e) => handleClinicalChange(item.id, 'capaian', e.target.value)}
                        className="w-full p-1.5 text-xs font-bold text-center text-blue-900 border border-slate-300 rounded bg-white"
                        placeholder="e.g. 100%, 0 Kasus"
                      />
                    </td>
                    <td className="p-2 border border-slate-200 text-center">
                      <input
                        type="text"
                        value={item.standar}
                        onChange={(e) => handleClinicalChange(item.id, 'standar', e.target.value)}
                        className="w-full p-1.5 text-xs text-center text-slate-700 border border-slate-300 rounded bg-white"
                        placeholder="e.g. >= 85%, 0 Kasus"
                      />
                    </td>
                    <td className="p-2 border border-slate-200">
                      <textarea
                        rows={2}
                        value={item.analisis}
                        onChange={(e) => handleClinicalChange(item.id, 'analisis', e.target.value)}
                        className="w-full p-1.5 text-xs text-slate-800 border border-slate-300 rounded bg-white resize-y"
                        placeholder="Catatan analisis klinis dan rekomendasi"
                      />
                    </td>
                    <td className="p-2 border border-slate-200 text-center align-middle">
                      <button
                        type="button"
                        onClick={() => handleDeleteClinicalIndicator(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer rounded"
                        title="Hapus baris indikator"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. SEKSI D: AKUNTABILITAS NON-MEDIS, OPERASIONAL, WATER TREATMENT & K3 */}
      {/* ===================================================================== */}
      {activeSubTab === 'section_d' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-6 shadow-xs print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="text-[11px] font-bold text-[#1e4b85] uppercase tracking-wider">
                SEKSI D (PENGISIAN MANUAL)
              </div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                <CheckSquare className="w-5 h-5 text-[#1e4b85]" />
                Akuntabilitas Non-Medis, Operasional, Water Treatment &amp; K3
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengawasan mutu air Reverse Osmosis (TDS, kesadahan, klorin), kesiapan logistik BMHP, suhu ruangan, dan kepatuhan K3. Seluruh baris dan parameter dapat disunting bebas.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start">
              <button
                type="button"
                onClick={handleResetOperationalToStandard}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 flex items-center gap-1.5 cursor-pointer"
                title="Kembalikan ke standar mutu KARS"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                Reset Standar
              </button>
              <button
                type="button"
                onClick={handleAddOperationalItem}
                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold rounded-xl border border-blue-200 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-blue-700" />
                Tambah Item
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSaveAllReport();
                  setActiveSubTab('section_e');
                }}
                className="px-4 py-2 bg-[#1e4b85] hover:bg-[#163865] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Simpan &amp; Lanjut ke Seksi E
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {operationalItems.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2 flex-1">
                    <Droplets className="w-4 h-4 text-blue-600 shrink-0" />
                    <input
                      type="text"
                      value={item.item}
                      onChange={(e) => handleOperationalChange(item.id, 'item', e.target.value)}
                      className="font-bold text-xs text-slate-900 p-1 border border-slate-300 rounded bg-white w-full max-w-sm"
                      placeholder="Nama fasilitas / sistem"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 font-medium">Status Kepatuhan:</span>
                    <input
                      type="text"
                      value={item.statusKepatuhan}
                      onChange={(e) => handleOperationalChange(item.id, 'statusKepatuhan', e.target.value)}
                      className="text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-emerald-800"
                      placeholder="MEMENUHI SYARAT"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteOperationalItem(item.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer rounded ml-1"
                      title="Hapus baris item operasional"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Parameter Uji / Standar Pengawasan
                    </label>
                    <input
                      type="text"
                      value={item.parameterUji}
                      onChange={(e) => handleOperationalChange(item.id, 'parameterUji', e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      placeholder="e.g. TDS < 10 ppm, Hardness 0, Klorin Bebas < 0.1 mg/L"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Hasil Observasi Fisik &amp; Uji Shift
                    </label>
                    <input
                      type="text"
                      value={item.hasilObservasi}
                      onChange={(e) => handleOperationalChange(item.id, 'hasilObservasi', e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-900"
                      placeholder="e.g. Air RO Tersedia, TDS 3.2 ppm, Klorin 0.01 mg/L (Normal)"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 6. SEKSI E: ASISTEN SERAH TERIMA SHIFT MODEL SBAR                      */}
      {/* ===================================================================== */}
      {activeSubTab === 'section_e' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-6 shadow-xs print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="text-[11px] font-bold text-[#1e4b85] uppercase tracking-wider">
                SEKSI E (PENGISIAN MANUAL)
              </div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                Serah Terima Shift Model SBAR (Situation, Background, Assessment, Recommendation)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Standar handover klinis KARS untuk kontinuitas asuhan antar-shift dinas. Seluruh teks narasi dapat diketik manual secara bebas.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start">
              <button
                type="button"
                onClick={handleRegenerateSbar}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold rounded-xl shadow-2xs flex items-center gap-2 cursor-pointer"
                title="Perbarui draf teks otomatis dari sensus manual"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Draf dari Sensus
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSaveAllReport();
                  setActiveSubTab('section_f');
                }}
                className="px-4 py-2 bg-[#1e4b85] hover:bg-[#163865] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Simpan &amp; Lanjut ke Seksi F
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Situation */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1e4b85] uppercase tracking-wide">
                  1. SITUATION (S) - Situasi Shift
                </label>
                <span className="text-[11px] text-slate-400">Jumlah pasien selesai, mesin aktif, highlight komplikasi</span>
              </div>
              <textarea
                rows={3}
                value={sbar.situation}
                onChange={(e) => {
                  setManualOverrideScope((prev) => ({ ...prev, sbarScope: shiftScopeKey }));
                  setSbar({ ...sbar, situation: e.target.value });
                }}
                className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white leading-relaxed"
                placeholder="Tuliskan gambaran situasi umum shift, jumlah pasien selesai, dan kesiapan mesin..."
              />
            </div>

            {/* Background */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1e4b85] uppercase tracking-wide">
                  2. BACKGROUND (B) - Riwayat Kasus Pasien Berisiko
                </label>
                <span className="text-[11px] text-slate-400">Data klinis pasien hipotensi, kram, under-UF, atau akses sulit</span>
              </div>
              <textarea
                rows={3}
                value={sbar.background}
                onChange={(e) => {
                  setManualOverrideScope((prev) => ({ ...prev, sbarScope: shiftScopeKey }));
                  setSbar({ ...sbar, background: e.target.value });
                }}
                className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white leading-relaxed"
                placeholder="Tuliskan latar belakang pasien yang mengalami penyulit atau pemantauan khusus..."
              />
            </div>

            {/* Assessment */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1e4b85] uppercase tracking-wide">
                  3. ASSESSMENT (A) - Penilaian &amp; Evaluasi Capaian
                </label>
                <span className="text-[11px] text-slate-400">Capaian UF aktual, respon hemodialisis, stabilitas hemodinamik</span>
              </div>
              <textarea
                rows={3}
                value={sbar.assessment}
                onChange={(e) => {
                  setManualOverrideScope((prev) => ({ ...prev, sbarScope: shiftScopeKey }));
                  setSbar({ ...sbar, assessment: e.target.value });
                }}
                className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white leading-relaxed"
                placeholder="Tuliskan evaluasi capaian asuhan medis dan keperawatan pada shift ini..."
              />
            </div>

            {/* Recommendation */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1e4b85] uppercase tracking-wide">
                  4. RECOMMENDATION (R) - Rekomendasi Shift Berikutnya
                </label>
                <span className="text-[11px] text-slate-400">Poin penting persiapan priming mesin, stok dialiser, uji RO</span>
              </div>
              <textarea
                rows={4}
                value={sbar.recommendation}
                onChange={(e) => {
                  setManualOverrideScope((prev) => ({ ...prev, sbarScope: shiftScopeKey }));
                  setSbar({ ...sbar, recommendation: e.target.value });
                }}
                className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white leading-relaxed"
                placeholder="1. Pastikan persiapan mesin dan priming dialiser sesuai SOP.&#10;2. Pantau pasien dengan riwayat under-UF atau hipotensi pada shift sebelumnya.&#10;3. Lakukan regenerasi softener RO jika kesadahan meningkat."
              />
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 7. SEKSI F: PENGESAHAN & PERTANGGUNGJAWABAN SHIFT                      */}
      {/* ===================================================================== */}
      {activeSubTab === 'section_f' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-6 shadow-xs print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="text-[11px] font-bold text-[#1e4b85] uppercase tracking-wider">
                SEKSI F (PENGISIAN MANUAL &amp; TANDA TANGAN DIGITAL)
              </div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                <ClipboardCheck className="w-5 h-5 text-[#1e4b85]" />
                Pengesahan &amp; Pertanggungjawaban Shift (3 Pihak)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Nama-nama penanggung jawab shift dapat diubah secara manual, disertai pembubuhan tanda tangan digital resmi yang tercantum pada lembar cetak PDF.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                handleSaveAllReport();
                setActiveSubTab('preview_full');
              }}
              className="px-4 py-2 bg-[#1e4b85] hover:bg-[#163865] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 self-start cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Simpan &amp; Lihat Lembar Cetak
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* 1. Yang Menyerahkan: Perawat PJ Shift */}
            <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 flex flex-col justify-between shadow-2xs space-y-4">
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">1. Yang Menyerahkan</div>
                <div className="font-bold text-slate-900 mt-1 text-sm">Perawat Penanggung Jawab (PJ) Shift</div>
                <label className="block text-[11px] font-semibold text-slate-600 mt-2 mb-1">
                  Nama Pemilik Akun PJ Shift:
                </label>
                <input
                  type="text"
                  readOnly
                  value={effectiveShiftInfo.pjShift}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white font-semibold text-slate-900"
                />
              </div>

              <div className="pt-3 border-t border-slate-200">
                <div className="text-[11px] text-slate-500 mb-2 font-medium">Status Pengesahan Digital:</div>
                {signatures.pjShift.signed ? (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 space-y-1">
                    <span className="text-emerald-800 font-bold flex items-center gap-1.5 text-xs">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      TERVERIFIKASI DIGITAL
                    </span>
                    <div className="text-[10px] text-slate-600 font-medium">
                      Otentikasi: {signatures.pjShift.signedAt}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleResetSignature('pjShift')}
                      className="text-[10px] text-rose-600 hover:underline block pt-1 cursor-pointer font-semibold"
                    >
                      Reset Tanda Tangan
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSign('pjShift')}
                    className="w-full px-3 py-2 bg-[#1e4b85] hover:bg-[#163865] text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-xs"
                  >
                    Tanda Tangani Sebagai PJ Shift
                  </button>
                )}
              </div>
            </div>

            {/* 2. Yang Menerima: PJ Shift Berikutnya */}
            <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 flex flex-col justify-between shadow-2xs space-y-4">
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">2. Yang Menerima</div>
                <div className="font-bold text-slate-900 mt-1 text-sm">PJ Shift Pengganti / Berikutnya</div>
                <label className="block text-[11px] font-semibold text-slate-600 mt-2 mb-1">
                  Nama Lengkap &amp; Gelar PJ Berikutnya:
                </label>
                <input
                  type="text"
                  value={shiftInfo.pjShiftBerikutnya}
                  onChange={(e) => setShiftInfo({ ...shiftInfo, pjShiftBerikutnya: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-900"
                  placeholder="Nama PJ Shift Berikutnya"
                />
              </div>

              <div className="pt-3 border-t border-slate-200">
                <div className="text-[11px] text-slate-500 mb-2 font-medium">Status Pengesahan Digital:</div>
                {signatures.pjBerikutnya.signed ? (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 space-y-1">
                    <span className="text-emerald-800 font-bold flex items-center gap-1.5 text-xs">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      TERVERIFIKASI DIGITAL
                    </span>
                    <div className="text-[10px] text-slate-600 font-medium">
                      Otentikasi: {signatures.pjBerikutnya.signedAt}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleResetSignature('pjBerikutnya')}
                      className="text-[10px] text-rose-600 hover:underline block pt-1 cursor-pointer font-semibold"
                    >
                      Reset Tanda Tangan
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSign('pjBerikutnya')}
                    className="w-full px-3 py-2 bg-[#1e4b85] hover:bg-[#163865] text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-xs"
                  >
                    Tanda Tangani Sebagai Penerima
                  </button>
                )}
              </div>
            </div>

            {/* 3. Mengetahui / Menyetujui: Kepala Ruangan HD */}
            <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 flex flex-col justify-between shadow-2xs space-y-4">
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">3. Mengetahui / Menyetujui</div>
                <div className="font-bold text-slate-900 mt-1 text-sm">Kepala Ruangan Hemodialisis</div>
                <label className="block text-[11px] font-semibold text-slate-600 mt-2 mb-1">
                  Nama Kepala Ruangan HD:
                </label>
                <input
                  type="text"
                  readOnly
                  value={effectiveShiftInfo.kepalaRuangan}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white font-semibold text-slate-900"
                />
              </div>

              <div className="pt-3 border-t border-slate-200">
                <div className="text-[11px] text-slate-500 mb-2 font-medium">Status Pengesahan Digital:</div>
                {signatures.kepalaRuangan.signed ? (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 space-y-1">
                    <span className="text-emerald-800 font-bold flex items-center gap-1.5 text-xs">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      TERVERIFIKASI DIGITAL
                    </span>
                    <div className="text-[10px] text-slate-600 font-medium">
                      Otentikasi: {signatures.kepalaRuangan.signedAt}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleResetSignature('kepalaRuangan')}
                      className="text-[10px] text-rose-600 hover:underline block pt-1 cursor-pointer font-semibold"
                    >
                      Reset Tanda Tangan
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSign('kepalaRuangan')}
                    className="w-full px-3 py-2 bg-[#1e4b85] hover:bg-[#163865] text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-xs"
                  >
                    Tanda Tangani Sebagai Kepala Ruang
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
