import React, { useState, useEffect } from 'react';
import {
  PatientHDSession,
  PatientStatus,
  PatientCategory,
  SessionStatus,
  VascularAccess,
  MasterPatient,
  MasterNurse,
  MasterBed,
  MasterDoctor,
  ShiftInfo,
  BagianIFacilityRo,
  BagianIIPreHdEquipment,
  BagianIIIPatientSafety,
  BagianIVIntraHdMonitoring,
  BagianVEducation,
  HourlyIntraHdLog,
  SystemAccessRole
} from '../types/dialysis.ts';
import {
  ensureFullBagianData,
  createDefaultBagian1,
  createDefaultBagian2,
  createDefaultBagian3,
  createDefaultBagian4,
  createDefaultBagian5,
  generateDefaultHourlyLogs
} from '../utils/logbookStandards.ts';
import { PelaksanaLogbookPrintableModal } from './PelaksanaLogbookPrintableModal.tsx';
import {
  extractActiveDayName,
  getCurrentIndonesianFullDate,
  getCurrentIsoDateWib,
  indonesianDateLabelToIso
} from '../utils/dateHelpers.ts';
import { filterMasterPatientsForActiveSchedule } from '../utils/masterDataHelpers.ts';
import {
  X,
  HeartPulse,
  Activity,
  AlertCircle,
  FileText,
  Calculator,
  User,
  ShieldAlert,
  Check,
  Search,
  Sparkles,
  Droplet,
  Thermometer,
  ShieldCheck,
  Stethoscope,
  BookOpen,
  Printer,
  Sliders,
  CheckCircle2,
  CheckSquare,
  AlertTriangle,
  ArrowRight,
  Lock,
  Edit3
} from 'lucide-react';
import {
  canVerifierRoleEditSubmitted,
  collectOccupiedLogbookAssets,
  getVerificationRegistry,
  isMatchingNurse
} from '../utils/nurseVerificationHelpers.ts';
import type { NurseLogbookCloudData } from '../services/firebase.ts';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: PatientHDSession | null;
  sessions?: PatientHDSession[];
  cloudNurseLogbooks?: NurseLogbookCloudData[];
  onSave: (session: PatientHDSession) => void;
  initialTab?: TabKey;
  masterPatients?: MasterPatient[];
  masterNurses?: MasterNurse[];
  masterBeds?: MasterBed[];
  masterDoctors?: MasterDoctor[];
  shiftInfo?: ShiftInfo;
  userRole?: SystemAccessRole;
  loggedInUserName?: string;
}

type TabKey = 'bagian1' | 'bagian2' | 'bagian3' | 'bagian4' | 'bagian5';

export const SessionModal: React.FC<SessionModalProps> = ({
  isOpen,
  onClose,
  session,
  sessions = [],
  cloudNurseLogbooks = [],
  onSave,
  initialTab = 'bagian3',
  masterPatients = [],
  masterNurses = [],
  masterBeds = [],
  masterDoctors = [],
  shiftInfo,
  userRole,
  loggedInUserName
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [formData, setFormData] = useState<PatientHDSession>(() => ensureFullBagianData(session || {}));
  const [selectedMasterMrn, setSelectedMasterMrn] = useState<string>('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const activeDayName = extractActiveDayName(shiftInfo?.date);
  const activeShift: 'Pagi' | 'Siang' =
    (session?.shift || shiftInfo?.shift) === 'Siang' ? 'Siang' : 'Pagi';
  const activeDateIso =
    session?.sessionDate ||
    (session?.date ? indonesianDateLabelToIso(session.date) : '') ||
    (shiftInfo?.date ? indonesianDateLabelToIso(shiftInfo.date) : '') ||
    getCurrentIsoDateWib();

  const occupiedAssets = React.useMemo(
    () =>
      collectOccupiedLogbookAssets({
        activeDateIso,
        activeShift,
        excludeSession: session
          ? {
              id: session.id,
              nurseName: session.nurseInCharge,
              patientName: session.patientName,
              medicalRecord: session.medicalRecordNumber,
              bedNumber: session.bedNumber
            }
          : null,
        sessions,
        registryEntries: getVerificationRegistry(),
        cloudNurseLogbooks,
        masterNurses,
        includeLocalNurseStorage: true
      }),
    [activeDateIso, activeShift, session, sessions, cloudNurseLogbooks, masterNurses]
  );

  const scheduledMasterPatients = React.useMemo(
    () => filterMasterPatientsForActiveSchedule(masterPatients, activeDayName, activeShift),
    [masterPatients, activeDayName, activeShift]
  );

  useEffect(() => {
    if (session) {
      setFormData(ensureFullBagianData(session));
      setSelectedMasterMrn(session.medicalRecordNumber || '');
    } else {
      const firstAvailableBed =
        masterBeds.find(
          (b) =>
            b.status !== 'maintenance' && !occupiedAssets.findBedClaimedByOther(b.bedNumber)
        )?.bedNumber ||
        masterBeds.find((b) => !occupiedAssets.findBedClaimedByOther(b.bedNumber))?.bedNumber ||
        'BED A01';
      const defaultNurse =
        loggedInUserName ||
        masterNurses.find((n) => n.isOnDutyToday && n.role === 'perawat_pelaksana')?.name ||
        masterNurses[0]?.name ||
        '';

      const newSession = ensureFullBagianData({
        bedNumber: firstAvailableBed,
        nurseInCharge: defaultNurse,
        date: shiftInfo?.date || getCurrentIndonesianFullDate(),
        sessionDate: activeDateIso,
        shift: activeShift,
        patientName: '',
        medicalRecordNumber: '',
        age: 52,
        gender: 'L',
        status: 'rajal',
        category: 'reguler',
        sessionStatus: 'selesai',
        isCito: false,
        dryWeight: 58.0,
        preWeight: 60.5,
        targetUf: 2500,
        achievedUf: 2500,
        durationPrescribed: 4.5,
        durationActual: 4.5
      });
      setFormData(newSession);
      setSelectedMasterMrn('');
    }
    setActiveTab(initialTab || 'bagian3');
    setValidationError(null);
  }, [session, isOpen, initialTab]);

  if (!isOpen) return null;

  // Handlers for Master Autocomplete
  const handleSelectMasterPatient = (mrn: string) => {
    if (!mrn) {
      setSelectedMasterMrn('');
      return;
    }
    const p = masterPatients.find((mp) => mp.medicalRecordNumber === mrn);
    if (p) {
      const claimed = occupiedAssets.findPatientClaimedByOther({
        patientName: p.patientName,
        medicalRecord: p.medicalRecordNumber
      });
      if (claimed) {
        setValidationError(
          `Pasien ${p.patientName} sudah diinput pada logbook ${claimed.nurseName} (${claimed.bedNumber}) dan tidak dapat dipilih lagi oleh perawat lain.`
        );
        return;
      }
      setValidationError(null);
      setSelectedMasterMrn(mrn);
      const estimatedPre = Number((p.defaultDryWeight + 2.5).toFixed(1));
      const target = Math.round((estimatedPre - p.defaultDryWeight) * 1000 + 300);

      setFormData((prev) => {
        const updated = {
          ...prev,
          medicalRecordNumber: p.medicalRecordNumber,
          patientName: p.patientName,
          age: p.age,
          gender: p.gender,
          status: p.defaultStatus,
          category: p.category,
          vascularAccess: p.defaultVascularAccess,
          accessSite: p.defaultAccessSite,
          dialyzerModel: p.defaultDialyzer,
          dryWeight: p.defaultDryWeight,
          preWeight: estimatedPre,
          targetUf: target,
          achievedUf: target
        };
        // Update sub-objects
        if (updated.bagian3) {
          updated.bagian3.dryWeight = p.defaultDryWeight;
          updated.bagian3.preWeight = estimatedPre;
          updated.bagian3.idwgKg = 2.5;
          updated.bagian3.idwgPercent = Number(((2.5 / p.defaultDryWeight) * 100).toFixed(1));
          updated.bagian3.targetUfMl = target;
          updated.bagian3.accessType = p.defaultVascularAccess;
          updated.bagian3.accessSite = p.defaultAccessSite;
        }
        if (updated.bagian5) {
          updated.bagian5.recipientName = p.patientName;
        }
        return updated;
      });
    }
  };

  const handleSelectBed = (bedNumber: string) => {
    const claimedBed = occupiedAssets.findBedClaimedByOther(bedNumber);
    if (claimedBed) {
      setValidationError(
        `Mesin/Bed ${bedNumber} sudah digunakan pada logbook ${claimedBed.nurseName} (Pasien: ${claimedBed.patientName}) pada Shift ${activeShift} dan tidak dapat dipilih lagi.`
      );
      return;
    }
    setValidationError(null);
    const b = masterBeds.find((mb) => mb.bedNumber === bedNumber);
    setFormData((prev) => {
      let cat = prev.category;
      let isCito = prev.isCito;
      if (b) {
        if (b.designation === 'isolasi_hepb') cat = 'hepatitis_b';
        else if (b.designation === 'isolasi_hepc') cat = 'hepatitis_c';
        else if (b.designation === 'isolasi' && cat === 'reguler') cat = 'hepatitis_b';
        if (b.designation === 'cito_icu') isCito = true;
      }
      return {
        ...prev,
        bedNumber,
        category: cat,
        isCito
      };
    });
  };

  // Recalculate target UF and IDWG
  const handleRecalculateUf = () => {
    const dry = Number(formData.dryWeight) || 0;
    const pre = Number(formData.preWeight) || 0;
    if (pre > dry && dry > 0) {
      const diffKg = Number((pre - dry).toFixed(1));
      const idwgPct = Number(((diffKg / dry) * 100).toFixed(1));
      const intake = formData.bagian3?.estimatedIntakeMl || 300;
      const calculatedTarget = Math.round(diffKg * 1000 + intake);

      setFormData(prev => ({
        ...prev,
        targetUf: calculatedTarget,
        achievedUf: calculatedTarget,
        bagian3: prev.bagian3 ? {
          ...prev.bagian3,
          dryWeight: dry,
          preWeight: pre,
          idwgKg: diffKg,
          idwgPercent: idwgPct,
          targetUfMl: calculatedTarget
        } : undefined
      }));
    }
  };

  // Handle Hourly Logs Updates in Bagian IV
  const handleHourlyLogChange = (index: number, field: keyof HourlyIntraHdLog, value: any) => {
    setFormData(prev => {
      if (!prev.bagian4) return prev;
      const updatedLogs = [...prev.bagian4.hourlyLogs];
      updatedLogs[index] = {
        ...updatedLogs[index],
        [field]: value
      };
      return {
        ...prev,
        bagian4: {
          ...prev.bagian4,
          hourlyLogs: updatedLogs
        }
      };
    });
  };

  const handleGenerateStandardHourly = () => {
    const dur = formData.durationActual || formData.durationPrescribed || 4.5;
    const tgt = formData.targetUf || 2400;
    const newLogs = generateDefaultHourlyLogs(formData, tgt, dur);
    setFormData(prev => ({
      ...prev,
      bagian4: prev.bagian4 ? {
        ...prev.bagian4,
        hourlyLogs: newLogs
      } : undefined
    }));
  };

  const isReturnedForRevision = Boolean(
    session &&
      session.revisionRequested &&
      session.verificationStatus === 'belum_diajukan' &&
      !session.isVerifiedByPj &&
      !session.isVerifiedByKepalaRuang
  );

  const isVerifierForSession = Boolean(
    userRole === 'kepala_ruangan' ||
      userRole === 'administrator' ||
      (userRole === 'pj_shift' &&
        (!session?.nurseInCharge || !isMatchingNurse(session.nurseInCharge, loggedInUserName)))
  );

  const isAlreadyVerified = Boolean(
    session &&
      !isReturnedForRevision &&
      (session.isVerifiedByPj ||
        session.isVerifiedByKepalaRuang ||
        session.verificationStatus === 'terverifikasi')
  );

  const isSubmittedWaiting = Boolean(
    session &&
      !isReturnedForRevision &&
      !isAlreadyVerified &&
      session.verificationStatus === 'diajukan'
  );

  const isVerifierEditingSubmitted = Boolean(
    isSubmittedWaiting && canVerifierRoleEditSubmitted(userRole) && isVerifierForSession
  );

  const isSessionLocked = Boolean(
    isAlreadyVerified || (isSubmittedWaiting && !isVerifierEditingSubmitted)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSessionLocked) {
      setValidationError(
        'Logbook ini terkunci dan tidak dapat diedit. Logbook yang diajukan hanya dapat diedit oleh Verifikator (PJ Shift / Kepala Ruang) atau setelah diminta perbaikan kembali.'
      );
      return;
    }
    if (!formData.patientName || !formData.medicalRecordNumber) {
      setValidationError('Mohon lengkapi Nama Pasien dan Nomor Rekam Medis pada Bagian III terlebih dahulu.');
      setActiveTab('bagian3');
      return;
    }

    const claimedPat = occupiedAssets.findPatientClaimedByOther({
      patientName: formData.patientName,
      medicalRecord: formData.medicalRecordNumber
    });
    if (claimedPat) {
      setValidationError(
        `Pasien ${formData.patientName} sudah diinput pada logbook ${claimedPat.nurseName} (${claimedPat.bedNumber}) dan tidak dapat dipilih lagi oleh perawat lain.`
      );
      setActiveTab('bagian3');
      return;
    }

    const claimedBed = occupiedAssets.findBedClaimedByOther(formData.bedNumber);
    if (claimedBed) {
      setValidationError(
        `Mesin/Bed ${formData.bedNumber} sudah digunakan pada logbook ${claimedBed.nurseName} (Pasien: ${claimedBed.patientName}) pada Shift ${activeShift} dan tidak dapat dipilih lagi.`
      );
      setActiveTab('bagian3');
      return;
    }

    setValidationError(null);

    // Sync top-level fields with sub-objects for maximum consistency
    const finalData = ensureFullBagianData({
      ...formData,
      updatedAt: new Date().toISOString()
    });

    onSave(finalData);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-2.5 md:p-3 bg-slate-900/65 backdrop-blur-xs">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[98vw] 2xl:max-w-[1560px] border border-slate-200 overflow-hidden flex flex-col h-[97vh] max-h-[97vh]">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-400/30">
                <Activity className="w-5 h-5 text-blue-300" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  {formData.bedNumber || 'Bed'} - {session ? 'Logbook Asuhan Perawat Pelaksana' : 'Entri Sesi Pasien & Logbook Baru'}
                </h2>
                <p className="text-xs text-blue-200">
                  Dokumentasi Terstandar KARS &amp; PERNEFRI: Bagian I s/d V Terpadu
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold transition-colors border border-blue-400/30 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Logbook
              </button>
              <button
                onClick={onClose}
                aria-label="Tutup modal"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tab Navigation: 5 Bagian Logbook */}
          <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-1.5 gap-1.5 overflow-x-auto shrink-0 scrollbar-thin">
            <button
              type="button"
              onClick={() => setActiveTab('bagian1')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'bagian1'
                  ? 'border-blue-600 text-blue-700 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Droplet className="w-3.5 h-3.5" />
              <span>Bagian I · Fasilitas &amp; RO</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bagian2')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'bagian2'
                  ? 'border-blue-600 text-blue-700 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Bagian II · Mesin &amp; Pre-HD</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bagian3')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'bagian3'
                  ? 'border-blue-600 text-blue-700 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Bagian III · Pengkajian &amp; SKP</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bagian4')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'bagian4'
                  ? 'border-blue-600 text-blue-700 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <HeartPulse className="w-3.5 h-3.5" />
              <span>Bagian IV · Monitoring Intra-HD</span>
              {(formData.hasHypotension || formData.hasMuscleCramps || formData.hasClotting || formData.hasConsultDpjp) && (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bagian5')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'bagian5'
                  ? 'border-emerald-600 text-emerald-700 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Bagian V · Edukasi Pasien</span>
            </button>
          </div>

          {/* Form Scrollable Body */}
          <form onSubmit={handleSubmit} className="p-3.5 sm:p-5 overflow-y-auto flex-1 space-y-4">
            {isSessionLocked && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>
                    Logbook Terkunci ({isAlreadyVerified ? 'Sudah Diverifikasi' : 'Menunggu Verifikasi'}).
                  </strong>{' '}
                  {isAlreadyVerified
                    ? 'Data logbook ini sudah disahkan dan terkunci. Pengeditan hanya dapat dilakukan apabila verifikator (PJ Shift atau Kepala Ruang) meminta perbaikan kembali.'
                    : 'Sebagai perawat pengaju, logbook yang sedang menunggu verifikasi terkunci otomatis. Hanya Verifikator (PJ Shift / Kepala Ruang) yang dapat mengedit logbook yang diajukan atau mengembalikannya untuk perbaikan.'}
                </div>
              </div>
            )}

            {isVerifierEditingSubmitted && (
              <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950 text-xs flex items-start gap-2.5">
                <Edit3 className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Mode Edit Verifikator Aktif (Menunggu Verifikasi):</strong> Sebagai{' '}
                  {userRole === 'kepala_ruangan' ? 'Kepala Ruang' : 'PJ Shift'}, Anda dapat mengedit
                  langsung parameter klinis dan checklist logbook yang diajukan ini sebelum disahkan.
                </div>
              </div>
            )}

            {isReturnedForRevision && session?.verifierNotes && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Diminta Perbaikan oleh Verifikator:</strong> {session.verifierNotes}
                </div>
              </div>
            )}

            {validationError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{validationError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setValidationError(null)}
                  className="text-rose-600 hover:text-rose-800 text-xs font-bold shrink-0"
                >
                  Tutup
                </button>
              </div>
            )}

            <fieldset disabled={isSessionLocked} className="space-y-4 disabled:opacity-90">
            
            {/* ----------------- TAB 1: BAGIAN I ----------------- */}
            {activeTab === 'bagian1' && formData.bagian1 && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-3 rounded-xl flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                      BAGIAN I: Kesiapan Fasilitas Ruangan Hemodialisis &amp; Sistem Water Treatment (RO)
                    </h3>
                    <p className="text-[11px] text-blue-700">
                      Standar mutu fisik air dialisis, tekanan hidrolik &amp; kelayakan lingkungan KARS
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, bagian1: createDefaultBagian1() }))}
                    className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-white border border-blue-300 rounded-lg shadow-2xs hover:bg-blue-50"
                  >
                    Set Standar PERNEFRI
                  </button>
                </div>

                {/* Lingkungan & Ruangan */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-blue-600" />
                    Kesiapan Fisik &amp; Keamanan Ruangan Bedside
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Suhu Ruangan (°C) <span className="text-[10px] text-blue-600">(18-22°C)</span>
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={formData.bagian1.roomTemperature}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian1: { ...prev.bagian1!, roomTemperature: parseFloat(e.target.value) || 21 }
                        }))}
                        className="w-full text-xs font-bold p-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Kelembapan Udara (%) <span className="text-[10px] text-blue-600">(40-60%)</span>
                      </label>
                      <input
                        type="number"
                        value={formData.bagian1.roomHumidity}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian1: { ...prev.bagian1!, roomHumidity: parseInt(e.target.value, 10) || 50 }
                        }))}
                        className="w-full text-xs font-bold p-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Status Mutu Keseluruhan</label>
                      <select
                        value={formData.bagian1.roStatusOverall}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian1: { ...prev.bagian1!, roStatusOverall: e.target.value as any }
                        }))}
                        className="w-full text-xs font-bold p-2 border border-slate-300 rounded-lg bg-white text-emerald-800"
                      >
                        <option value="MEMENUHI SYARAT">MEMENUHI SYARAT</option>
                        <option value="PERLU TINDAKAN">PERLU TINDAKAN</option>
                        <option value="KRITIS">KRITIS</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Garam Brine Tank (Softener)</label>
                      <select
                        value={formData.bagian1.roBrineTankSaltLevel}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian1: { ...prev.bagian1!, roBrineTankSaltLevel: e.target.value as any }
                        }))}
                        className="w-full text-xs font-bold p-2 border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="Penuh">Penuh (&gt;75%)</option>
                        <option value="Cukup">Cukup (50-75%)</option>
                        <option value="Kurang">Kurang (&lt;25%)</option>
                      </select>
                    </div>
                  </div>

                  {/* Checklist Ruangan */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.bagian1.roomHygieneClean}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian1: { ...prev.bagian1!, roomHygieneClean: e.target.checked }
                        }))}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span className="font-medium text-slate-800">Desinfeksi Lantai &amp; Zonasi Bersih</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.bagian1.emergencyTrolleyReady}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian1: { ...prev.bagian1!, emergencyTrolleyReady: e.target.checked }
                        }))}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span className="font-medium text-slate-800">Trolley Emergency Tersegel</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.bagian1.oxygenSuctionReady}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian1: { ...prev.bagian1!, oxygenSuctionReady: e.target.checked }
                        }))}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span className="font-medium text-slate-800">Outlet O2 &amp; Suction Vakum Siap</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.bagian1.spillKitReady}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian1: { ...prev.bagian1!, spillKitReady: e.target.checked }
                        }))}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span className="font-medium text-slate-800">Spill Kit B3 &amp; Safety Box</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.bagian1.aparEvacuationReady}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian1: { ...prev.bagian1!, aparEvacuationReady: e.target.checked }
                        }))}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span className="font-medium text-slate-800">APAR &amp; Jalur Evakuasi Bebas</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.bagian1.isolationRoomReady}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian1: { ...prev.bagian1!, isolationRoomReady: e.target.checked }
                        }))}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span className="font-medium text-slate-800">Ruang Isolasi Hep B/C Siap</span>
                    </label>
                  </div>
                </div>

                {/* Parameter RO Water Treatment */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Droplet className="w-4 h-4 text-cyan-600" />
                      Parameter Sistem Reverse Osmosis (RO) Harian
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Rejection Rate: {formData.bagian1.roRejectionRate}% (&ge;90%)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Inlet Pressure (bar)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.bagian1.roInletPressure}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian1: { ...prev.bagian1!, roInletPressure: parseFloat(e.target.value) || 3 }
                        }))}
                        className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Tekanan Pompa RO (bar)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={formData.bagian1.roPumpPressure}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian1: { ...prev.bagian1!, roPumpPressure: parseFloat(e.target.value) || 12 }
                        }))}
                        className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">TDS Air Baku (ppm)</label>
                      <input
                        type="number"
                        value={formData.bagian1.roRawWaterTds}
                        onChange={e => {
                          const raw = parseInt(e.target.value, 10) || 150;
                          const prod = formData.bagian1?.roProductWaterTds || 4;
                          const rej = Number((((raw - prod) / raw) * 100).toFixed(1));
                          setFormData(prev => ({
                            ...prev,
                            bagian1: { ...prev.bagian1!, roRawWaterTds: raw, roRejectionRate: rej }
                          }));
                        }}
                        className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-blue-900 mb-1">TDS Produk RO (&lt;10 ppm)</label>
                      <input
                        type="number"
                        value={formData.bagian1.roProductWaterTds}
                        onChange={e => {
                          const prod = parseInt(e.target.value, 10) || 0;
                          const raw = formData.bagian1?.roRawWaterTds || 185;
                          const rej = Number((((raw - prod) / raw) * 100).toFixed(1));
                          setFormData(prev => ({
                            ...prev,
                            bagian1: { ...prev.bagian1!, roProductWaterTds: prod, roRejectionRate: rej }
                          }));
                        }}
                        className="w-full text-xs font-bold p-2 border-2 border-cyan-400 rounded-lg bg-white text-blue-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200 text-xs">
                      <input
                        type="checkbox"
                        checked={formData.bagian1.roChlorineFree}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian1: { ...prev.bagian1!, roChlorineFree: e.target.checked }
                        }))}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span>Uji Klorin Bebas / Total (&lt;0.1 mg/L - Strip Negatif)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200 text-xs">
                      <input
                        type="checkbox"
                        checked={formData.bagian1.roHardnessZero}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian1: { ...prev.bagian1!, roHardnessZero: e.target.checked }
                        }))}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span>Kesadahan Air / Hardness = 0 ppm (Pasca Softener)</span>
                    </label>
                  </div>
                </div>

                {/* Step Navigation to Bagian II */}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('bagian2')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>Lanjut ke BAGIAN II: Mesin HD &amp; Pre-HD</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ----------------- TAB 2: BAGIAN II ----------------- */}
            {activeTab === 'bagian2' && formData.bagian2 && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-blue-700">
                      Bagian II · Tahap Persiapan Alat Pre-HD
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      Persiapan Perawat, Mesin HD &amp; Sirkuit Darah
                    </h3>
                    <p className="text-xs text-slate-600">
                      Pastikan APD lengkap, self-test mesin lulus, konduktivitas 13.5–14.5 mS/cm, suhu 36.0–37.0 °C, dan sirkuit bebas udara.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, bagian2: createDefaultBagian2() }))}
                    className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 whitespace-nowrap shrink-0 self-start sm:self-center"
                  >
                    Isi Nilai Standar Pre-HD
                  </button>
                </div>

                {/* Perawat & PPI */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-800">1. Kesiapan Perawat &amp; Pengendalian Infeksi (PPI)</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.bagian2.nurseFiveMomentsHandHygiene}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian2: { ...prev.bagian2!, nurseFiveMomentsHandHygiene: e.target.checked }
                        }))}
                        className="w-4 h-4 rounded text-emerald-600"
                      />
                      <span className="font-semibold text-slate-800">5 Momen Cuci Tangan WHO</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.bagian2.nurseApdComplete}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian2: { ...prev.bagian2!, nurseApdComplete: e.target.checked }
                        }))}
                        className="w-4 h-4 rounded text-emerald-600"
                      />
                      <span className="font-semibold text-slate-800">APD Lengkap (Apron, Masker, Handscoon, Shield)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.bagian2.nurseFitToWork}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian2: { ...prev.bagian2!, nurseFitToWork: e.target.checked }
                        }))}
                        className="w-4 h-4 rounded text-emerald-600"
                      />
                      <span className="font-semibold text-slate-800">Sehat, Kuku Bersih, Bebas Perhiasan</span>
                    </label>
                  </div>
                </div>

                {/* Mesin HD Uji Kelaikan */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="text-xs font-bold text-slate-800">2. Uji Kalibrasi &amp; Kelaikan Mesin Hemodialisis</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.bagian2.machineSelfTestPassed}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian2: { ...prev.bagian2!, machineSelfTestPassed: e.target.checked }
                        }))}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span className="font-bold text-slate-800">Self-Test Kelistrikan &amp; CPU (Passed)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.bagian2.bloodLeakDetectorOk}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian2: { ...prev.bagian2!, bloodLeakDetectorOk: e.target.checked }
                        }))}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span className="font-bold text-slate-800">Blood Leak Detector (Alarm OK)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.bagian2.airDetectorOk}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian2: { ...prev.bagian2!, airDetectorOk: e.target.checked }
                        }))}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span className="font-bold text-slate-800">Air Bubble Detector &amp; Clamp OK</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Konduktivitas (13.5 - 14.5 mS/cm)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.bagian2.conductivityValue}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian2: { ...prev.bagian2!, conductivityValue: parseFloat(e.target.value) || 14.0 }
                        }))}
                        className="w-full text-xs font-bold p-2 border border-slate-300 rounded-lg bg-white text-blue-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Suhu Dialisat (36.0 - 37.0 °C)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.bagian2.dialysateTemperature}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian2: { ...prev.bagian2!, dialysateTemperature: parseFloat(e.target.value) || 36.5 }
                        }))}
                        className="w-full text-xs font-bold p-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Formula Cairan Dialisat</label>
                      <select
                        value={formData.bagian2.dialysateType}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian2: { ...prev.bagian2!, dialysateType: e.target.value as any }
                        }))}
                        className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="Bikarbonat Standar">Bikarbonat Standar</option>
                        <option value="Bikarbonat K+ Rendah">Bikarbonat K+ Rendah</option>
                        <option value="Asetat">Asetat</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Sirkuit & Priming */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="text-xs font-bold text-slate-800">3. Sirkuit Extracorporeal &amp; Priming Dialyzer</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tipe / Model Dialyzer</label>
                      <input
                        type="text"
                        value={formData.bagian2.dialyzerType}
                        onChange={e => {
                          const val = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            dialyzerModel: val,
                            bagian2: { ...prev.bagian2!, dialyzerType: val }
                          }));
                        }}
                        className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white font-semibold"
                        placeholder="FX 80, SAS HF 18..."
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Status Penggunaan</label>
                      <select
                        value={formData.bagian2.dialyzerUsageStatus}
                        onChange={e => {
                          const val = e.target.value as any;
                          setFormData(prev => ({
                            ...prev,
                            isReuse: val !== 'Single Use',
                            bagian2: { ...prev.bagian2!, dialyzerUsageStatus: val }
                          }));
                        }}
                        className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white font-semibold text-slate-800"
                      >
                        <option value="Single Use">Single Use (Baru)</option>
                        <option value="Reuse ke-1">Reuse ke-1</option>
                        <option value="Reuse ke-2">Reuse ke-2</option>
                        <option value="Reuse ke-3">Reuse ke-3</option>
                        <option value="Reuse ke-4">Reuse ke-4</option>
                        <option value="Reuse ke-5">Reuse ke-5</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Jenis Antikoagulan Sirkuit</label>
                      <select
                        value={formData.bagian2.circuitHeparinizationType}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian2: { ...prev.bagian2!, circuitHeparinizationType: e.target.value as any }
                        }))}
                        className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white font-semibold"
                      >
                        <option value="Heparin Standar">Heparin Standar</option>
                        <option value="LMWH (Enoxaparin)">LMWH (Enoxaparin)</option>
                        <option value="Bebas Heparin (Saline Flush)">Bebas Heparin (Saline Flush berkala)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.bagian2.primingResidualBubblesFree}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian2: { ...prev.bagian2!, primingResidualBubblesFree: e.target.checked }
                        }))}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span className="font-semibold text-slate-800">Priming NaCl 0.9% 2000 mL Bebas Gelembung</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.bagian2.cannulationKitReady}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian2: { ...prev.bagian2!, cannulationKitReady: e.target.checked }
                        }))}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span className="font-semibold text-slate-800">Set Kanulasi AVF / Dressing Kit CDL Steril</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-emerald-50 p-2 rounded-lg border border-emerald-300">
                      <input
                        type="checkbox"
                        checked={formData.bagian2.machineOverallReady}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian2: { ...prev.bagian2!, machineOverallReady: e.target.checked }
                        }))}
                        className="w-4 h-4 rounded text-emerald-600"
                      />
                      <span className="font-bold text-emerald-900">Mesin Siap Sambung Pasien</span>
                    </label>
                  </div>
                </div>

                {/* Step Navigation */}
                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('bagian1')}
                    className="px-3.5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors"
                  >
                    &larr; Kembali ke BAGIAN I: Fasilitas &amp; RO
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('bagian3')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>Lanjut ke BAGIAN III: Pasien &amp; Patient Safety</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ----------------- TAB 3: BAGIAN III ----------------- */}
            {activeTab === 'bagian3' && formData.bagian3 && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-emerald-700">
                      Bagian III · Keselamatan Pasien Pre-HD (Patient Safety)
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      Identifikasi Pasien, Tanda Vital, Berat Badan &amp; Akses Vaskular
                    </h3>
                    <p className="text-xs text-slate-600">
                      Cocokkan 2 identitas gelang pasien (SKP 1), ukur TTV &amp; BB Pre-HD untuk menghitung Target UF, skrining jatuh, dan cek patensi akses.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, bagian3: createDefaultBagian3(prev) }))}
                    className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-white border border-emerald-200 rounded-lg hover:bg-emerald-50 whitespace-nowrap shrink-0 self-start sm:self-center"
                  >
                    Isi Standar Pengkajian
                  </button>
                </div>

                {/* Master Autocomplete Banner */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-blue-950">
                        Pilih Pasien Terjadwal (Hari {activeDayName} &middot; Shift {activeShift})
                      </div>
                      <div className="text-[10px] text-blue-700">
                        Hanya menampilkan pasien terjadwal pada {activeDayName} {activeShift} &middot; Auto-fill No. RM, Dry Weight &amp; Akses
                      </div>
                    </div>
                  </div>
                  <select
                    value={
                      scheduledMasterPatients.some(mp => mp.medicalRecordNumber === selectedMasterMrn)
                        ? selectedMasterMrn
                        : ''
                    }
                    onChange={e => handleSelectMasterPatient(e.target.value)}
                    className="text-xs font-semibold px-3 py-1.5 border border-blue-300 rounded-lg bg-white text-blue-900 focus:ring-2 focus:ring-blue-500 max-w-xs tabular-nums"
                  >
                    <option value="">
                      {scheduledMasterPatients.length > 0
                        ? `-- Pilih Pasien ${activeDayName} ${activeShift} --`
                        : `-- Belum ada pasien terjadwal (${activeDayName} ${activeShift}) --`}
                    </option>
                    {scheduledMasterPatients.map((mp) => {
                      const claimed = occupiedAssets.findPatientClaimedByOther({
                        patientName: mp.patientName,
                        medicalRecord: mp.medicalRecordNumber
                      });
                      return (
                        <option
                          key={mp.id}
                          value={mp.medicalRecordNumber}
                          disabled={Boolean(claimed)}
                        >
                          {mp.medicalRecordNumber} - {mp.patientName} (DW: {mp.defaultDryWeight} kg)
                          {claimed ? ` — Sudah diinput: ${claimed.nurseName} (${claimed.bedNumber})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Identification & Bed */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Bed Mesin HD</label>
                    {masterBeds.length > 0 ? (
                      <select
                        value={formData.bedNumber}
                        onChange={(e) => handleSelectBed(e.target.value)}
                        className="w-full text-xs font-bold p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-slate-50 text-blue-900"
                      >
                        {masterBeds.map((b) => {
                          const claimedBed = occupiedAssets.findBedClaimedByOther(b.bedNumber);
                          const isDisabled = b.status === 'maintenance' || Boolean(claimedBed);
                          return (
                            <option key={b.id} value={b.bedNumber} disabled={isDisabled}>
                              {b.bedNumber}{' '}
                              {b.status === 'maintenance'
                                ? '(Maintenance)'
                                : claimedBed
                                ? `(Terpakai - ${claimedBed.nurseName})`
                                : ''}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <input
                        type="text"
                        required
                        value={formData.bedNumber}
                        onChange={e => setFormData({ ...formData, bedNumber: e.target.value })}
                        className="w-full text-xs font-bold p-2 border border-slate-300 rounded-lg text-blue-900"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">No. Rekam Medis (RM)</label>
                    <input
                      type="text"
                      required
                      value={formData.medicalRecordNumber}
                      onChange={e => setFormData({ ...formData, medicalRecordNumber: e.target.value })}
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg font-bold"
                      placeholder="e.g. 452108"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nama Pasien</label>
                    <input
                      type="text"
                      required
                      value={formData.patientName}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          patientName: val,
                          bagian5: prev.bagian5 ? { ...prev.bagian5, recipientName: val } : undefined
                        }));
                      }}
                      className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-lg"
                      placeholder="Nama lengkap pasien"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Usia (Tahun)</label>
                    <input
                      type="number"
                      value={formData.age}
                      onChange={e => setFormData({ ...formData, age: Number(e.target.value) })}
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Jenis Kelamin</label>
                    <select
                      value={formData.gender}
                      onChange={e => setFormData({ ...formData, gender: e.target.value as 'L' | 'P' })}
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                    >
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Status Pelayanan</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value as PatientStatus })}
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg font-medium"
                    >
                      <option value="rajal">Rawat Jalan (Rajal)</option>
                      <option value="ranap">Rawat Inap (Ranap Bangsal/ICU)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Kategori Pasien</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value as PatientCategory })}
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg font-medium"
                    >
                      <option value="reguler">Reguler (Non-Hepatitis)</option>
                      <option value="hepatitis_b">Isolasi Hepatitis B</option>
                      <option value="hepatitis_c">Isolasi Hepatitis C / HIV</option>
                    </select>
                  </div>
                </div>

                {/* Sasaran Keselamatan Pasien (SKP) */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Sasaran Keselamatan Pasien (SKP) &amp; Morse Fall Scale
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.bagian3.patientIdentifiedTwoWays}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian3: { ...prev.bagian3!, patientIdentifiedTwoWays: e.target.checked }
                        }))}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span className="font-semibold text-slate-800">Verifikasi 2 Identitas &amp; Gelang (SKP 1)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.bagian3.medicalPrescriptionVerified}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian3: { ...prev.bagian3!, medicalPrescriptionVerified: e.target.checked }
                        }))}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span className="font-semibold text-slate-800">Resep Medis DPJP Sp.PD-KGH Valid</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.bagian3.informedConsentValid}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian3: { ...prev.bagian3!, informedConsentValid: e.target.checked }
                        }))}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span className="font-semibold text-slate-800">Surat Persetujuan Tindakan HD Sah</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Skrining Risiko Jatuh</label>
                      <select
                        value={formData.bagian3.fallRiskScore}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian3: { ...prev.bagian3!, fallRiskScore: e.target.value as any }
                        }))}
                        className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="Rendah">Risiko Rendah (Skor Morse 0-24)</option>
                        <option value="Sedang">Risiko Sedang (Skor Morse 25-44, Gelang Kuning)</option>
                        <option value="Tinggi">Risiko Tinggi (Skor Morse &ge;45, Gelang Kuning + Bed Rail)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Status Riwayat Alergi</label>
                      <input
                        type="text"
                        value={formData.bagian3.allergyStatus}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian3: { ...prev.bagian3!, allergyStatus: e.target.value }
                        }))}
                        className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                        placeholder="Tidak Ada Riwayat Alergi"
                      />
                    </div>
                  </div>
                </div>

                {/* Tanda Vital & Berat Badan Pre-HD */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <HeartPulse className="w-4 h-4 text-red-600" />
                      Tanda Vital &amp; Target Ultrafiltrasi Pre-HD
                    </span>
                    <button
                      type="button"
                      onClick={handleRecalculateUf}
                      className="px-2.5 py-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1 shadow-2xs"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      Hitung IDWG &amp; Target UF
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">TD Duduk Pre-HD</label>
                      <input
                        type="text"
                        value={formData.preBp}
                        onChange={e => {
                          const val = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            preBp: val,
                            bagian3: prev.bagian3 ? { ...prev.bagian3, preBpSitting: val } : undefined
                          }));
                        }}
                        className="w-full text-xs font-bold p-2 border border-slate-300 rounded-lg bg-white text-blue-900"
                        placeholder="145/85 mmHg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nadi (x/m)</label>
                      <input
                        type="number"
                        value={formData.bagian3.preHeartRate}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian3: { ...prev.bagian3!, preHeartRate: parseInt(e.target.value, 10) || 80 }
                        }))}
                        className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Pernapasan (x/m)</label>
                      <input
                        type="number"
                        value={formData.bagian3.preRespiratoryRate}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian3: { ...prev.bagian3!, preRespiratoryRate: parseInt(e.target.value, 10) || 20 }
                        }))}
                        className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Suhu (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.bagian3.preBodyTemp}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian3: { ...prev.bagian3!, preBodyTemp: parseFloat(e.target.value) || 36.5 }
                        }))}
                        className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">SpO2 (%)</label>
                      <input
                        type="number"
                        value={formData.bagian3.preOxygenSat}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian3: { ...prev.bagian3!, preOxygenSat: parseInt(e.target.value, 10) || 98 }
                        }))}
                        className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">BB Kering / Dry Weight (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.dryWeight}
                        onChange={e => {
                          const dw = parseFloat(e.target.value) || 0;
                          setFormData(prev => ({
                            ...prev,
                            dryWeight: dw,
                            bagian3: prev.bagian3 ? { ...prev.bagian3, dryWeight: dw } : undefined
                          }));
                        }}
                        className="w-full text-xs font-black p-2 border border-slate-300 rounded-lg bg-white text-emerald-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">BB Pre-HD (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.preWeight}
                        onChange={e => {
                          const pw = parseFloat(e.target.value) || 0;
                          setFormData(prev => ({
                            ...prev,
                            preWeight: pw,
                            bagian3: prev.bagian3 ? { ...prev.bagian3, preWeight: pw } : undefined
                          }));
                        }}
                        className="w-full text-xs font-black p-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-blue-900 mb-1">Target UF (mL)</label>
                      <input
                        type="number"
                        step="50"
                        value={formData.targetUf}
                        onChange={e => {
                          const tgt = parseInt(e.target.value, 10) || 0;
                          setFormData(prev => ({
                            ...prev,
                            targetUf: tgt,
                            bagian3: prev.bagian3 ? { ...prev.bagian3, targetUfMl: tgt } : undefined
                          }));
                        }}
                        className="w-full text-xs font-black p-2 border-2 border-blue-400 rounded-lg bg-white text-blue-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Kenaikan (IDWG)</label>
                      <div className="p-2 border border-slate-200 rounded-lg bg-white text-xs font-bold text-amber-800">
                        {formData.bagian3.idwgKg} kg ({formData.bagian3.idwgPercent}%)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Akses Vaskular Pre-HD */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-800">Pengkajian Akses Vaskular Pre-HD</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Jenis Akses</label>
                      <select
                        value={formData.vascularAccess}
                        onChange={e => {
                          const acc = e.target.value as VascularAccess;
                          setFormData(prev => ({
                            ...prev,
                            vascularAccess: acc,
                            bagian3: prev.bagian3 ? { ...prev.bagian3, accessType: acc } : undefined
                          }));
                        }}
                        className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white font-semibold text-blue-900"
                      >
                        <option value="av_fistula">AV Fistula (Cimino)</option>
                        <option value="av_graft">AV Graft</option>
                        <option value="cdl_non_tunnel">Double Lumen (CDL) Non-Tunnel</option>
                        <option value="cdl_permcath">Double Lumen Tunneling (Permcath)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Lokasi Akses</label>
                      <input
                        type="text"
                        value={formData.accessSite || ''}
                        onChange={e => {
                          const site = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            accessSite: site,
                            bagian3: prev.bagian3 ? { ...prev.bagian3, accessSite: site } : undefined
                          }));
                        }}
                        className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                        placeholder="e.g. Radiocephalica Sinistra"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.bagian3.accessBruitThrillPresent}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian3: { ...prev.bagian3!, accessBruitThrillPresent: e.target.checked }
                        }))}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span>AVF: Bruit &amp; Thrill Kuat (+) Arah Aliran Baik</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.bagian3.cdlExitSiteClean}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian3: { ...prev.bagian3!, cdlExitSiteClean: e.target.checked }
                        }))}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span>CDL: Exit Site Bersih, Kassa Kering, Paten</span>
                    </label>
                  </div>
                </div>

                {/* Step Navigation */}
                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('bagian2')}
                    className="px-3.5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors"
                  >
                    &larr; Kembali ke BAGIAN II: Mesin Pre-HD
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('bagian4')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>Lanjut ke BAGIAN IV: Monitoring Intra-HD &amp; IKP</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ----------------- TAB 4: BAGIAN IV ----------------- */}
            {activeTab === 'bagian4' && formData.bagian4 && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-amber-700">
                      Bagian IV · Pemantauan Selama Dialisis (Intra-HD)
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      Observasi Per Jam, Tekanan Mesin &amp; Penanganan Komplikasi (IKP)
                    </h3>
                    <p className="text-xs text-slate-600">
                      Catat TTV, aliran darah (QB/QD), tekanan sirkuit (AP, VP, TMP), dan progres penarikan UF setiap jam serta dokumentasikan bila ada keluhan.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateStandardHourly}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 whitespace-nowrap shrink-0 self-start sm:self-center"
                  >
                    Isi Contoh Observasi Per Jam
                  </button>
                </div>

                {/* Lembar Observasi Flowsheet */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-slate-900">Tabel Observasi Intra-HD Per Jam (Jam ke-0 s/d Selesai)</span>
                    <span className="text-slate-500 font-mono text-[11px] tabular-nums">
                      Satuan: QB/QD (mL/mnt) · AP/VP/TMP (mmHg) · UF (mL)
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse tabular-nums">
                      <thead>
                        <tr className="bg-slate-50/70 text-[11px] font-semibold text-slate-600 border-b border-slate-200">
                          <th className="p-2.5 text-center w-14">Jam</th>
                          <th className="p-2.5 w-20">Pukul</th>
                          <th className="p-2.5 w-24">TD (mmHg)</th>
                          <th className="p-2.5 w-16">Nadi</th>
                          <th className="p-2.5 w-18">QB</th>
                          <th className="p-2.5 w-18">QD</th>
                          <th className="p-2.5 w-18">AP</th>
                          <th className="p-2.5 w-18">VP</th>
                          <th className="p-2.5 w-18">TMP</th>
                          <th className="p-2.5 w-20">UF/Jam</th>
                          <th className="p-2.5 w-24">UF Total</th>
                          <th className="p-2.5 min-w-[140px]">Catatan / Keluhan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-[11px]">
                        {formData.bagian4.hourlyLogs.map((log, idx) => (
                          <tr key={log.hourNumber} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                            <td className="p-1.5 text-center font-bold text-slate-700">Ke-{log.hourNumber}</td>
                            <td className="p-1.5">
                              <input
                                type="text"
                                value={log.timeString}
                                onChange={e => handleHourlyLogChange(idx, 'timeString', e.target.value)}
                                className="w-full text-[11px] p-1 border border-slate-300 rounded"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="text"
                                value={log.bp}
                                onChange={e => handleHourlyLogChange(idx, 'bp', e.target.value)}
                                className="w-full text-[11px] font-bold p-1 border border-slate-300 rounded text-blue-900"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="number"
                                value={log.heartRate}
                                onChange={e => handleHourlyLogChange(idx, 'heartRate', parseInt(e.target.value, 10) || 80)}
                                className="w-full text-[11px] p-1 border border-slate-300 rounded"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="number"
                                value={log.qb}
                                onChange={e => handleHourlyLogChange(idx, 'qb', parseInt(e.target.value, 10) || 200)}
                                className="w-full text-[11px] p-1 border border-slate-300 rounded"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="number"
                                value={log.qd}
                                onChange={e => handleHourlyLogChange(idx, 'qd', parseInt(e.target.value, 10) || 500)}
                                className="w-full text-[11px] p-1 border border-slate-300 rounded"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="number"
                                value={log.arterialPressure}
                                onChange={e => handleHourlyLogChange(idx, 'arterialPressure', parseInt(e.target.value, 10) || -120)}
                                className="w-full text-[11px] p-1 border border-slate-300 rounded"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="number"
                                value={log.venousPressure}
                                onChange={e => handleHourlyLogChange(idx, 'venousPressure', parseInt(e.target.value, 10) || 110)}
                                className="w-full text-[11px] p-1 border border-slate-300 rounded"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="number"
                                value={log.tmp}
                                onChange={e => handleHourlyLogChange(idx, 'tmp', parseInt(e.target.value, 10) || 80)}
                                className="w-full text-[11px] p-1 border border-slate-300 rounded"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="number"
                                value={log.ufRate}
                                onChange={e => handleHourlyLogChange(idx, 'ufRate', parseInt(e.target.value, 10) || 0)}
                                className="w-full text-[11px] p-1 border border-slate-300 rounded"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="number"
                                value={log.cumulativeUf}
                                onChange={e => handleHourlyLogChange(idx, 'cumulativeUf', parseInt(e.target.value, 10) || 0)}
                                className="w-full text-[11px] font-bold p-1 border border-slate-300 rounded text-blue-900"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="text"
                                value={log.nurseNote || ''}
                                onChange={e => handleHourlyLogChange(idx, 'nurseNote', e.target.value)}
                                className="w-full text-[11px] p-1 border border-slate-300 rounded"
                                placeholder="Keluhan (-)"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Komplikasi & Pencegahan IKP */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-800">Pencegahan &amp; Tata Laksana Komplikasi Intra-HD (IKP)</div>
                  
                  {/* Hipotensi */}
                  <div className={`p-3 rounded-xl border ${formData.hasHypotension ? 'bg-red-50 border-red-300' : 'bg-slate-50 border-slate-200'}`}>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-xs font-bold text-slate-800">Insiden Hipotensi Intradialitik</span>
                      <input
                        type="checkbox"
                        checked={formData.hasHypotension}
                        onChange={e => {
                          const checked = e.target.checked;
                          setFormData(prev => ({
                            ...prev,
                            hasHypotension: checked,
                            bagian4: prev.bagian4 ? {
                              ...prev.bagian4,
                              hasHypotension: checked,
                              hypotensionBp: checked ? '85/50' : undefined,
                              hypotensionIntervention: checked ? 'Posisi Trendelenburg, bolus NaCl 0.9% 150 mL, turunkan laju UF' : undefined
                            } : undefined
                          }));
                        }}
                        className="w-4 h-4 rounded text-red-600"
                      />
                    </label>
                    {formData.hasHypotension && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-red-200 text-xs">
                        <div>
                          <label className="block text-[11px] font-medium text-red-900 mb-1">Tensi Terendah</label>
                          <input
                            type="text"
                            value={formData.bagian4.hypotensionBp || '85/50'}
                            onChange={e => setFormData(prev => ({
                              ...prev,
                              bagian4: { ...prev.bagian4!, hypotensionBp: e.target.value }
                            }))}
                            className="w-full text-xs p-1.5 border border-red-300 rounded bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-red-900 mb-1">Tindakan Keperawatan (SOP)</label>
                          <input
                            type="text"
                            value={formData.bagian4.hypotensionIntervention || ''}
                            onChange={e => setFormData(prev => ({
                              ...prev,
                              bagian4: { ...prev.bagian4!, hypotensionIntervention: e.target.value }
                            }))}
                            className="w-full text-xs p-1.5 border border-red-300 rounded bg-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Kram Otot */}
                  <div className={`p-3 rounded-xl border ${formData.hasMuscleCramps ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-xs font-bold text-slate-800">Insiden Kram Otot (Muscle Cramps)</span>
                      <input
                        type="checkbox"
                        checked={formData.hasMuscleCramps}
                        onChange={e => {
                          const checked = e.target.checked;
                          setFormData(prev => ({
                            ...prev,
                            hasMuscleCramps: checked,
                            bagian4: prev.bagian4 ? {
                              ...prev.bagian4,
                              hasMuscleCramps: checked,
                              muscleCrampsLocation: checked ? 'Gastrocnemius Betis' : undefined,
                              muscleCrampsIntervention: checked ? 'Masase lokal, kompres hangat, bolus NaCl 0.9% 100 mL' : undefined
                            } : undefined
                          }));
                        }}
                        className="w-4 h-4 rounded text-amber-600"
                      />
                    </label>
                    {formData.hasMuscleCramps && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-amber-200 text-xs">
                        <div>
                          <label className="block text-[11px] font-medium text-amber-900 mb-1">Lokasi Kram</label>
                          <input
                            type="text"
                            value={formData.bagian4.muscleCrampsLocation || ''}
                            onChange={e => setFormData(prev => ({
                              ...prev,
                              bagian4: { ...prev.bagian4!, muscleCrampsLocation: e.target.value }
                            }))}
                            className="w-full text-xs p-1.5 border border-amber-300 rounded bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-amber-900 mb-1">Tindakan</label>
                          <input
                            type="text"
                            value={formData.bagian4.muscleCrampsIntervention || ''}
                            onChange={e => setFormData(prev => ({
                              ...prev,
                              bagian4: { ...prev.bagian4!, muscleCrampsIntervention: e.target.value }
                            }))}
                            className="w-full text-xs p-1.5 border border-amber-300 rounded bg-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Konsultasi Cito ke DPJP */}
                  <div className={`p-3 rounded-xl border ${formData.hasConsultDpjp ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-slate-200'}`}>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-xs font-bold text-slate-800">Konsultasi Medis Cito ke DPJP (SBAR &amp; TBAK)</span>
                      <input
                        type="checkbox"
                        checked={formData.hasConsultDpjp}
                        onChange={e => {
                          const checked = e.target.checked;
                          setFormData(prev => ({
                            ...prev,
                            hasConsultDpjp: checked,
                            bagian4: prev.bagian4 ? {
                              ...prev.bagian4,
                              hasConsultDpjp: checked,
                              consultDoctorName: checked ? 'dr. Paramitha, Sp.PD-KGH' : undefined,
                              consultSbarIssue: checked ? 'Hipotensi berulang pada jam ke-3 HD' : undefined,
                              consultAdviceTbak: checked ? 'Stop penarikan UF, pertahankan sirkulasi, toleransi under-UF' : undefined
                            } : undefined
                          }));
                        }}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                    </label>
                    {formData.hasConsultDpjp && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 pt-2 border-t border-blue-200 text-xs">
                        <div>
                          <label className="block text-[11px] font-medium text-blue-900 mb-1">Nama DPJP</label>
                          <input
                            type="text"
                            value={formData.bagian4.consultDoctorName || ''}
                            onChange={e => setFormData(prev => ({
                              ...prev,
                              bagian4: { ...prev.bagian4!, consultDoctorName: e.target.value }
                            }))}
                            className="w-full text-xs p-1.5 border border-blue-300 rounded bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-blue-900 mb-1">Masalah SBAR</label>
                          <input
                            type="text"
                            value={formData.bagian4.consultSbarIssue || ''}
                            onChange={e => setFormData(prev => ({
                              ...prev,
                              bagian4: { ...prev.bagian4!, consultSbarIssue: e.target.value }
                            }))}
                            className="w-full text-xs p-1.5 border border-blue-300 rounded bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-blue-900 mb-1">Advis Dokter (TBAK)</label>
                          <input
                            type="text"
                            value={formData.bagian4.consultAdviceTbak || ''}
                            onChange={e => setFormData(prev => ({
                              ...prev,
                              bagian4: { ...prev.bagian4!, consultAdviceTbak: e.target.value }
                            }))}
                            className="w-full text-xs p-1.5 border border-blue-300 rounded bg-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Hasil Akhir & Realisasi UF */}
                  <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Realisasi UF (mL)</label>
                      <input
                        type="number"
                        step="50"
                        value={formData.achievedUf}
                        onChange={e => {
                          const ach = parseInt(e.target.value, 10) || 0;
                          setFormData(prev => ({
                            ...prev,
                            achievedUf: ach,
                            bagian4: prev.bagian4 ? { ...prev.bagian4, achievedUfMl: ach } : undefined
                          }));
                        }}
                        className="w-full text-xs font-bold p-1.5 border border-slate-300 rounded bg-white text-emerald-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">TD Post-HD</label>
                      <input
                        type="text"
                        value={formData.postBp}
                        onChange={e => {
                          const val = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            postBp: val,
                            bagian4: prev.bagian4 ? { ...prev.bagian4, postBp: val } : undefined
                          }));
                        }}
                        className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white"
                        placeholder="120/80"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">BB Post-HD (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.postWeight}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          setFormData(prev => ({
                            ...prev,
                            postWeight: val,
                            bagian4: prev.bagian4 ? { ...prev.bagian4, postWeight: val } : undefined
                          }));
                        }}
                        className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Durasi Aktual (Jam)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={formData.durationActual}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 4.5;
                          setFormData(prev => ({
                            ...prev,
                            durationActual: val,
                            bagian4: prev.bagian4 ? { ...prev.bagian4, actualDurationHours: val } : undefined
                          }));
                        }}
                        className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Step Navigation */}
                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('bagian3')}
                    className="px-3.5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors"
                  >
                    &larr; Kembali ke BAGIAN III: Pasien &amp; SKP
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('bagian5')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>Lanjut ke BAGIAN V: Edukasi Pasien &amp; Keluarga</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ----------------- TAB 5: BAGIAN V ----------------- */}
            {activeTab === 'bagian5' && formData.bagian5 && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-indigo-700">
                      Bagian V · Edukasi Pasien &amp; Keluarga
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      Panduan Cairan Harian, Diet Ginjal, Perawatan Akses &amp; Evaluasi Teach-Back
                    </h3>
                    <p className="text-xs text-slate-600">
                      Pastikan pasien dan keluarga memahami takaran minum harian, pantangan makanan tinggi kalium/fosfat, cara menjaga luka akses kering, dan jadwal HD.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, bagian5: createDefaultBagian5(prev.patientName) }))}
                    className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 whitespace-nowrap shrink-0 self-start sm:self-center"
                  >
                    Isi Standar Edukasi
                  </button>
                </div>

                {/* 1. Manajemen Cairan */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-800">1. Edukasi Manajemen Cairan &amp; Pengendalian Haus</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Batas Cairan Harian (mL/hari) <span className="text-[10px] text-slate-500">(Urine 24 jam + 500 mL)</span>
                      </label>
                      <input
                        type="number"
                        value={formData.bagian5.dailyFluidLimitMl}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian5: { ...prev.bagian5!, dailyFluidLimitMl: parseInt(e.target.value, 10) || 600 }
                        }))}
                        className="w-full text-xs font-bold p-2 border border-slate-300 rounded-lg bg-white text-blue-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Target Batas Kenaikan IDWG Antar HD
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.bagian5.targetIdwgLimitKg}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian5: { ...prev.bagian5!, targetIdwgLimitKg: parseFloat(e.target.value) || 2.0 }
                        }))}
                        className="w-full text-xs font-bold p-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.bagian5.fluidManagementEducated}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian5: { ...prev.bagian5!, fluidManagementEducated: e.target.checked }
                        }))}
                        className="w-4 h-4 rounded text-emerald-600"
                      />
                      <span>Rumus Hitung Intake Cairan Dijelaskan</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.bagian5.fluidTipsExplained}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian5: { ...prev.bagian5!, fluidTipsExplained: e.target.checked }
                        }))}
                        className="w-4 h-4 rounded text-emerald-600"
                      />
                      <span>Kiat Es Batu, Kumur Air Dingin, &amp; Kurangi Asin/MSG</span>
                    </label>
                  </div>
                </div>

                {/* 2. Diet & Nutrisi GGK */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="font-bold text-slate-800">2. Edukasi Nutrisi &amp; Diet Ginjal (GGK)</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.bagian5.dietNutritionEducated}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian5: { ...prev.bagian5!, dietNutritionEducated: e.target.checked }
                        }))}
                        className="w-4 h-4 rounded text-emerald-600"
                      />
                      <span className="text-slate-800">Rendah Kalium (Hindari pisang, durian, alpukat, air kelapa; rebus sayur)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.bagian5.phosphateControlEducated}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian5: { ...prev.bagian5!, phosphateControlEducated: e.target.checked }
                        }))}
                        className="w-4 h-4 rounded text-emerald-600"
                      />
                      <span className="text-slate-800">Rendah Fosfat &amp; Minum Pengikat Fosfat Bersama Makanan</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.bagian5.adequateProteinEducated}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian5: { ...prev.bagian5!, adequateProteinEducated: e.target.checked }
                        }))}
                        className="w-4 h-4 rounded text-emerald-600"
                      />
                      <span className="text-slate-800">Cukup Protein Hewani Berkualitas (Putih telur, ikan segar)</span>
                    </label>
                  </div>
                </div>

                {/* 3. Akses Vaskular & Obat */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="font-bold text-slate-800">3. Higiene Akses Vaskular &amp; Kepatuhan Terapi</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.bagian5.vascularAccessCareEducated}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian5: { ...prev.bagian5!, vascularAccessCareEducated: e.target.checked }
                        }))}
                        className="w-4 h-4 rounded text-emerald-600"
                      />
                      <span>Cuci Lengan AVF dengan Sabun Sebelum HD, Pantau Thrill Tiap Hari</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.bagian5.cdlCareEducated}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian5: { ...prev.bagian5!, cdlCareEducated: e.target.checked }
                        }))}
                        className="w-4 h-4 rounded text-emerald-600"
                      />
                      <span>Jaga Kassa Balutan CDL Kering, Dilarang Mandi Basah Langsung</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.bagian5.medicationAdherenceEducated}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian5: { ...prev.bagian5!, medicationAdherenceEducated: e.target.checked }
                        }))}
                        className="w-4 h-4 rounded text-emerald-600"
                      />
                      <span>Kepatuhan Obat Antihipertensi, Suplemen Besi &amp; Kalsium/Vitamin D</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.bagian5.scheduleAdherenceEducated}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian5: { ...prev.bagian5!, scheduleAdherenceEducated: e.target.checked }
                        }))}
                        className="w-4 h-4 rounded text-emerald-600"
                      />
                      <span>Disiplin Hadir Sesuai Jadwal HD (2x-3x/minggu) Tanpa Absen</span>
                    </label>
                  </div>
                </div>

                {/* 4. Evaluasi Teach-Back & Penerima */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="text-xs font-bold text-slate-800">4. Evaluasi Pemahaman Edukasi (Teach-Back Method)</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Sasaran Penerima Edukasi</label>
                      <select
                        value={formData.bagian5.educationRecipient}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian5: { ...prev.bagian5!, educationRecipient: e.target.value as any }
                        }))}
                        className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="Pasien Sendiri">Pasien Sendiri</option>
                        <option value="Keluarga / Pendamping">Keluarga / Pendamping</option>
                        <option value="Pasien & Keluarga">Pasien &amp; Keluarga</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nama Pasien / Keluarga</label>
                      <input
                        type="text"
                        value={formData.bagian5.recipientName}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          bagian5: { ...prev.bagian5!, recipientName: e.target.value }
                        }))}
                        className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div className="flex flex-col justify-end">
                      <label className="flex items-center gap-2 cursor-pointer bg-emerald-50 p-2 rounded-lg border border-emerald-300 text-xs">
                        <input
                          type="checkbox"
                          checked={formData.bagian5.teachBackMethodPassed}
                          onChange={e => setFormData(prev => ({
                            ...prev,
                            bagian5: { ...prev.bagian5!, teachBackMethodPassed: e.target.checked }
                          }))}
                          className="w-4 h-4 rounded text-emerald-600"
                        />
                        <span className="font-bold text-emerald-900">Lulus Metode Teach-Back</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Catatan Evaluasi &amp; Komitmen Pasien di Rumah
                    </label>
                    <textarea
                      rows={2}
                      value={formData.bagian5.patientReadinessAndNotes}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        bagian5: { ...prev.bagian5!, patientReadinessAndNotes: e.target.value }
                      }))}
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                      placeholder="Pasien dan keluarga memahami kiat pembatasan cairan dan siap patuh di rumah..."
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-200 text-xs">
                    <input
                      type="checkbox"
                      checked={formData.bagian5.educationalLeafletGiven}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        bagian5: { ...prev.bagian5!, educationalLeafletGiven: e.target.checked }
                      }))}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span className="font-medium text-slate-800">Leaflet / Buku Panduan Edukasi Diet &amp; Cairan Diserahkan ke Pasien</span>
                  </label>
                </div>

                {/* Step Navigation */}
                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('bagian4')}
                    className="px-3.5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors"
                  >
                    &larr; Kembali ke BAGIAN IV: Monitoring &amp; IKP
                  </button>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>5 Bagian Logbook Lengkap Terisi</span>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Form Meta: Perawat Pelaksana & Status Selesai */}
            <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50/80 p-3 rounded-xl">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Perawat Pelaksana Bed</label>
                {masterNurses.length > 0 ? (
                  <select
                    value={formData.nurseInCharge}
                    onChange={e => setFormData({ ...formData, nurseInCharge: e.target.value })}
                    className="w-full text-xs font-bold p-1.5 border border-slate-300 rounded-lg bg-white text-slate-900"
                  >
                    {masterNurses.map(n => (
                      <option key={n.id} value={n.name}>{n.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.nurseInCharge}
                    onChange={e => setFormData({ ...formData, nurseInCharge: e.target.value })}
                    className="w-full text-xs font-bold p-1.5 border border-slate-300 rounded-lg bg-white"
                  />
                )}
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Status Sesi</label>
                <select
                  value={formData.sessionStatus}
                  onChange={e => setFormData({ ...formData, sessionStatus: e.target.value as SessionStatus })}
                  className="w-full text-xs font-bold p-1.5 border border-slate-300 rounded-lg bg-white text-emerald-800"
                >
                  <option value="selesai">Selesai HD (Tuntas)</option>
                  <option value="sedang_berlangsung">Sedang Berlangsung</option>
                  <option value="terjadwal">Terjadwal</option>
                  <option value="batal">Batal / Reschedule</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Kategori Khusus</label>
                <div className="flex items-center gap-2 pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-red-700">
                    <input
                      type="checkbox"
                      checked={formData.isCito}
                      onChange={e => setFormData({ ...formData, isCito: e.target.checked })}
                      className="w-4 h-4 rounded text-red-600"
                    />
                    <span>HD CITO / EMERGENCY</span>
                  </label>
                </div>
              </div>
            </div>
            </fieldset>

            {/* Bottom Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                Bed: <span className="font-bold text-slate-800">{formData.bedNumber}</span> | RM: <span className="font-bold text-slate-800">{formData.medicalRecordNumber || '-'}</span> ({formData.patientName || 'Pasien Baru'})
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(true)}
                  className="px-3.5 py-2 border border-blue-300 text-blue-700 hover:bg-blue-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Pratinjau Cetak
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  {isSessionLocked ? 'Tutup' : 'Batal'}
                </button>
                {isSessionLocked ? (
                  <span className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-600" />
                    Terkunci (Hanya-Baca)
                  </span>
                ) : (
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Simpan 5 Bagian Logbook
                  </button>
                )}
              </div>
            </div>

          </form>

        </div>
      </div>

      {/* Printable Preview Modal */}
      {isPrintModalOpen && (
        <PelaksanaLogbookPrintableModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          session={formData}
          shiftInfo={shiftInfo || {
            hospitalName: 'RS HAPPY LAND MEDICAL CENTRE',
            unitName: 'INSTALASI DIALISIS',
            date: getCurrentIndonesianFullDate(),
            shift: 'Pagi',
            shiftHours: 'Pagi, jam 07.00 - 14.00 WIB',
            pjShift: 'M. Haikal Malilang, A.Md. Kep.',
            kepalaRuangan: 'Twis Fertilianti PW., S.Kep., Ns.',
            dokterDpjp: 'dr. Raden Heru Prasanto, Sp.PD-KGH',
            dokterJaga: 'dr. Paramitha',
            totalPerawatDinas: 7,
            detailPerawat: '7 Orang (1 Ka.Ru, 1 PJ Shift, 5 Pelaksana)',
            perawatRatio: '1 : 3.4',
            tenagaPendukung: '1 Teknisi RO, 1 HK Ruangan',
            pjShiftBerikutnya: 'Riska Wahyu, S.Kep., Ns.'
          }}
        />
      )}
    </>
  );
};
