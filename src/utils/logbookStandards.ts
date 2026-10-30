import {
  BagianIFacilityRo,
  BagianIIPreHdEquipment,
  BagianIIIPatientSafety,
  BagianIVIntraHdMonitoring,
  BagianVEducation,
  HourlyIntraHdLog,
  PatientHDSession
} from '../types/dialysis.ts';

/**
 * Standard factory & helper for Indonesian PERNEFRI & KARS 5-Bagian Logbook Perawat Pelaksana
 */

export function createDefaultBagian1(overrides?: Partial<BagianIFacilityRo>): BagianIFacilityRo {
  return {
    roomTemperature: 21.0,
    roomHumidity: 52,
    roomHygieneClean: true,
    isolationRoomReady: true,
    emergencyTrolleyReady: true,
    oxygenSuctionReady: true,
    spillKitReady: true,
    aparEvacuationReady: true,

    roInletPressure: 3.2,
    roPumpPressure: 12.5,
    roPermeatePressure: 2.2,
    roRawWaterTds: 185,
    roProductWaterTds: 4,
    roRejectionRate: 97.8,
    roChlorineFree: true,
    roHardnessZero: true,
    roBrineTankSaltLevel: 'Cukup',
    roStatusOverall: 'MEMENUHI SYARAT',
    roInspectionNotes: 'Parameter fisik & kimia RO aman sesuai standar PERNEFRI. Backwash & regenerasi resin otomatis aktif.',
    ...overrides
  };
}

export function createDefaultBagian2(overrides?: Partial<BagianIIPreHdEquipment>): BagianIIPreHdEquipment {
  return {
    nurseFiveMomentsHandHygiene: true,
    nurseApdComplete: true,
    nurseFitToWork: true,

    machineSelfTestPassed: true,
    bloodLeakDetectorOk: true,
    airDetectorOk: true,
    conductivityValue: 14.1,
    dialysateTemperature: 36.5,
    dialysateType: 'Bikarbonat Standar',

    dialyzerType: 'High-Flux FX 80 / SAS HF 18',
    dialyzerUsageStatus: 'Single Use',
    primingSalineVolume: 2000,
    primingResidualBubblesFree: true,
    circuitHeparinizationType: 'Heparin Standar',
    cannulationKitReady: true,
    machineOverallReady: true,
    ...overrides
  };
}

export function createDefaultBagian3(session: Partial<PatientHDSession>): BagianIIIPatientSafety {
  const dry = Number(session.dryWeight) || 55;
  const pre = Number(session.preWeight) || (dry + 2.5);
  const diffKg = Number((pre - dry).toFixed(1));
  const idwgPct = dry > 0 ? Number(((diffKg / dry) * 100).toFixed(1)) : 4.5;
  const intake = 300;
  const target = session.targetUf || Math.round(diffKg * 1000 + intake);

  return {
    patientIdentifiedTwoWays: true,
    medicalPrescriptionVerified: true,
    informedConsentValid: true,
    fallRiskScore: 'Rendah',
    allergyStatus: 'Tidak Ada Riwayat Alergi',

    preBpSitting: session.preBp || '145/85',
    preHeartRate: 82,
    preRespiratoryRate: 20,
    preBodyTemp: 36.6,
    preOxygenSat: 98,
    fluidOverloadGrade: diffKg > 3 ? 'Sedang (+2)' : diffKg > 1.5 ? 'Ringan (+1)' : 'Nihil (-)',

    dryWeight: dry,
    preWeight: pre,
    idwgKg: diffKg,
    idwgPercent: idwgPct,
    estimatedIntakeMl: intake,
    targetUfMl: target,
    prescribedHours: session.durationPrescribed || 4.5,

    accessType: session.vascularAccess || 'av_fistula',
    accessSite: session.accessSite || 'AVF Radiocephalica Sinistra',
    vascularAccessNurse: session.vascularAccessNurse,
    accessBruitThrillPresent: true,
    cdlExitSiteClean: true,
    preAssessmentSignOff: true
  };
}

export function generateDefaultHourlyLogs(
  session: Partial<PatientHDSession>,
  targetUf: number = 2400,
  durationHours: number = 4
): HourlyIntraHdLog[] {
  const logs: HourlyIntraHdLog[] = [];
  const hoursCount = Math.max(1, Math.min(5, Math.ceil(durationHours)));
  const ufPerHour = Math.round(targetUf / hoursCount);

  const baseSys = 145;
  const baseDia = 85;

  for (let i = 0; i <= hoursCount; i++) {
    const timeMinute = (7 * 60 + 30 + i * 60); // 07:30, 08:30, etc.
    const hh = String(Math.floor(timeMinute / 60)).padStart(2, '0');
    const mm = String(timeMinute % 60).padStart(2, '0');

    // Slight physiological blood pressure progression
    let sys = baseSys - i * 5;
    let dia = baseDia - (i > 2 ? 3 : 0);
    let note = i === 0 ? 'Inisiasi HD, keluhan (-)' : i === hoursCount ? 'Terminasi HD, reinfusi darah lancar' : 'Sirkulasi lancar, keluhan (-)';

    if (session.hasHypotension && i === 2) {
      sys = 85;
      dia = 50;
      note = 'Hipotensi bergejala: pusing dingin. Penanganan: bolus NaCl 150 ml, posisi Trendelenburg';
    } else if (session.hasMuscleCramps && i === 3) {
      note = 'Kram gastrocnemius teratasi dengan masase & bolus NaCl 100 ml';
    }

    logs.push({
      hourNumber: i,
      timeString: `${hh}:${mm}`,
      bp: `${sys}/${dia}`,
      heartRate: 80 + (i % 2 === 0 ? 2 : -2),
      qb: session.bloodFlowQb || 220,
      qd: session.dialysateFlowQd || 500,
      arterialPressure: -120 - i * 5,
      venousPressure: 110 + i * 5,
      tmp: 80 + i * 8,
      ufRate: i === 0 ? 0 : ufPerHour,
      cumulativeUf: Math.min(targetUf, i * ufPerHour),
      nurseNote: note
    });
  }

  return logs;
}

export function createDefaultBagian4(session: Partial<PatientHDSession>): BagianIVIntraHdMonitoring {
  const duration = session.durationActual || session.durationPrescribed || 4.5;
  const target = session.targetUf || 2400;
  const achieved = session.achievedUf || target;

  return {
    hourlyLogs: generateDefaultHourlyLogs(session, target, duration),

    hasHypotension: !!session.hasHypotension,
    hypotensionBp: session.hypotensionBp || (session.hasHypotension ? '85/50' : undefined),
    hypotensionTime: session.hasHypotension ? '09:30' : undefined,
    hypotensionIntervention: session.hasHypotension
      ? (session.hypotensionAction || 'Posisi Trendelenburg, bolus NaCl 0.9% 150 mL, penurunan UF rate sementara')
      : undefined,

    hasMuscleCramps: !!session.hasMuscleCramps,
    muscleCrampsLocation: session.hasMuscleCramps ? 'Gastrocnemius (Betis Dextra)' : undefined,
    muscleCrampsIntervention: session.hasMuscleCramps
      ? (session.muscleCrampAction || 'Masase lokal, kompres hangat, bolus NaCl 0.9% 100 mL')
      : undefined,

    hasClotting: !!session.hasClotting,
    clottingLocation: session.hasClotting ? 'Dialyzer' : 'Nihil',
    clottingIntervention: session.hasClotting
      ? (session.clottingDetails || 'Bilas NaCl 0.9% 100 mL, evaluasi heparinisasi adekuat')
      : undefined,

    hasBloodLeak: false,
    bloodLeakAction: undefined,

    hasAirEmbolismRisk: false,
    airEmbolismSafe: true,

    hasAccessBleeding: !!session.hasAccessBleeding,
    accessBleedingIntervention: session.hasAccessBleeding
      ? (session.accessBleedingAction || 'Penekanan kanulasi AVF 10-15 menit (dua jari), hemostasis tercapai baik')
      : undefined,

    hasFirstUseSyndrome: !!session.hasFirstUseSyndrome,
    firstUseDetails: session.hasFirstUseSyndrome
      ? (session.firstUseDetails || 'Priming 2000 mL tuntas, keluhan alergi terminasi teratasi')
      : undefined,

    hasConsultDpjp: !!session.hasConsultDpjp,
    consultTime: session.hasConsultDpjp ? '09:40' : undefined,
    consultDoctorName: session.consultDoctorName || 'dr. Paramitha, Sp.PD-KGH',
    consultSbarIssue: session.consultReason || 'Penurunan TD sistolik < 90 mmHg pada jam ke-2 HD',
    consultAdviceTbak: session.consultAdvice || 'Instruksi: Bolus NaCl 0.9% 150 ml, toleransi under-UF jika TD belum stabil. Konfirmasi TBAK tuntas.',

    achievedUfMl: achieved,
    actualDurationHours: duration,
    postBp: session.postBp || '120/80',
    postWeight: session.postWeight || session.dryWeight || 55,
    postHeartRate: 78,
    underUfTolerated: !!session.underUfTolerated,
    underUfReason: session.underUfReason || undefined,
    sessionTerminatedSafe: true
  };
}

export function createDefaultBagian5(patientName: string = 'Pasien'): BagianVEducation {
  return {
    fluidManagementEducated: true,
    dailyFluidLimitMl: 600, // urine output + 500
    targetIdwgLimitKg: 2.2, // < 4% BB Kering
    fluidTipsExplained: true,

    dietNutritionEducated: true,
    phosphateControlEducated: true,
    adequateProteinEducated: true,

    vascularAccessCareEducated: true,
    cdlCareEducated: true,

    medicationAdherenceEducated: true,
    scheduleAdherenceEducated: true,

    educationRecipient: 'Pasien & Keluarga',
    recipientName: patientName,
    teachBackMethodPassed: true,
    patientReadinessAndNotes: 'Pasien dan keluarga memahami kiat pembatasan cairan dan pantangan tinggi kalium/fosfat. Menyatakan siap patuh di rumah.',
    educationalLeafletGiven: true
  };
}

/**
 * Ensures a session has complete Bagian I-V data structure
 */
export function ensureFullBagianData(session: Partial<PatientHDSession>): PatientHDSession {
  const b1 = session.bagian1 ? { ...createDefaultBagian1(), ...session.bagian1 } : createDefaultBagian1();
  const b2 = session.bagian2 ? { ...createDefaultBagian2(), ...session.bagian2 } : createDefaultBagian2();
  const b3 = session.bagian3 ? { ...createDefaultBagian3(session), ...session.bagian3 } : createDefaultBagian3(session);
  const b4 = session.bagian4 ? { ...createDefaultBagian4(session), ...session.bagian4 } : createDefaultBagian4(session);
  const b5 = session.bagian5 ? { ...createDefaultBagian5(session.patientName), ...session.bagian5 } : createDefaultBagian5(session.patientName);

  return {
    ...session,
    id: session.id || `p-${Date.now()}`,
    bedNumber: session.bedNumber || 'Bed 01',
    patientName: session.patientName || 'Pasien Baru',
    medicalRecordNumber: session.medicalRecordNumber || '000000',
    age: session.age || 50,
    gender: session.gender || 'L',
    status: session.status || 'rajal',
    category: session.category || 'reguler',
    sessionStatus: session.sessionStatus || 'selesai',
    isCito: session.isCito || false,

    vascularAccess: session.vascularAccess || b3.accessType,
    accessSite: session.accessSite || b3.accessSite,
    dialyzerModel: session.dialyzerModel || b2.dialyzerType,
    isReuse: session.isReuse || (b2.dialyzerUsageStatus !== 'Single Use'),
    reuseCount: session.reuseCount,

    dryWeight: Number(session.dryWeight ?? b3.dryWeight),
    preWeight: Number(session.preWeight ?? b3.preWeight),
    postWeight: Number(session.postWeight ?? b4.postWeight),
    targetUf: Number(session.targetUf ?? b3.targetUfMl),
    achievedUf: Number(session.achievedUf ?? b4.achievedUfMl),
    durationPrescribed: Number(session.durationPrescribed ?? b3.prescribedHours),
    durationActual: Number(session.durationActual ?? b4.actualDurationHours),

    bloodFlowQb: session.bloodFlowQb || 220,
    dialysateFlowQd: session.dialysateFlowQd || 500,
    preBp: session.preBp || b3.preBpSitting,
    postBp: session.postBp || b4.postBp,

    hasHypotension: session.hasHypotension ?? b4.hasHypotension,
    hypotensionBp: session.hypotensionBp ?? b4.hypotensionBp,
    hypotensionAction: session.hypotensionAction ?? b4.hypotensionIntervention,

    hasMuscleCramps: session.hasMuscleCramps ?? b4.hasMuscleCramps,
    muscleCrampAction: session.muscleCrampAction ?? b4.muscleCrampsIntervention,

    hasClotting: session.hasClotting ?? b4.hasClotting,
    clottingDetails: session.clottingDetails ?? b4.clottingIntervention,

    hasFirstUseSyndrome: session.hasFirstUseSyndrome ?? b4.hasFirstUseSyndrome,
    firstUseDetails: session.firstUseDetails ?? b4.firstUseDetails,

    hasAccessBleeding: session.hasAccessBleeding ?? b4.hasAccessBleeding,
    accessBleedingAction: session.accessBleedingAction ?? b4.accessBleedingIntervention,

    hasConsultDpjp: session.hasConsultDpjp ?? b4.hasConsultDpjp,
    consultDoctorName: session.consultDoctorName ?? b4.consultDoctorName,
    consultReason: session.consultReason ?? b4.consultSbarIssue,
    consultAdvice: session.consultAdvice ?? b4.consultAdviceTbak,

    underUfTolerated: session.underUfTolerated ?? b4.underUfTolerated,
    underUfReason: session.underUfReason ?? b4.underUfReason,

    nurseInCharge: session.nurseInCharge || 'Ners Pelaksana',
    vascularAccessNurse: session.vascularAccessNurse ?? b3.vascularAccessNurse,
    poin3_6Completed: session.poin3_6Completed,
    nurseNotes: session.nurseNotes || 'Asuhan hemodialisa tuntas sesuai 5 Bagian Logbook Perawat Pelaksana.',
    updatedAt: session.updatedAt || new Date().toISOString(),

    bagian1: b1,
    bagian2: b2,
    bagian3: b3,
    bagian4: b4,
    bagian5: b5
  };
}
