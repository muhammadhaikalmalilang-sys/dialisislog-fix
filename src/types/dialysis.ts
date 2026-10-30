/**
 * Types definition for Hemodialysis Nursing Logbook & Shift Reporting System
 * Standardized for KARS & PERNEFRI Hospital Accreditation
 */

export type ShiftName = 'Pagi' | 'Siang' | 'Malam';
export type PatientStatus = 'rajal' | 'ranap';
export type PatientCategory = 'reguler' | 'hepatitis_b' | 'hepatitis_c' | 'hiv';
export type SessionStatus = 'terjadwal' | 'sedang_berlangsung' | 'selesai' | 'batal';
export type VascularAccess = 'av_fistula' | 'av_graft' | 'cdl_non_tunnel' | 'cdl_permcath';

export type HdTreatmentFrequency =
  | '2x_seminggu' // Frekuensi HD 2 kali dalam 1 minggu
  | '1x_seminggu' // Frekuensi HD 1 kali dalam 1 minggu
  | '1x_2minggu'; // Frekuensi HD 1 kali dalam 2 minggu

export type HdTreatmentDay =
  | 'Senin'
  | 'Selasa'
  | 'Rabu'
  | 'Kamis'
  | 'Jumat'
  | 'Sabtu'
  | 'Minggu';

export type BiweeklyCycleType =
  | 'Minggu Ganjil (Ke-1 & Ke-3)'
  | 'Minggu Genap (Ke-2 & Ke-4)'
  | 'Siklus 14 Hari Terjadwal';

export interface MasterPatient {
  id: string;
  medicalRecordNumber: string;
  patientName: string;
  age: number;
  gender: 'L' | 'P';
  defaultStatus: PatientStatus;
  category: PatientCategory;
  defaultVascularAccess: VascularAccess;
  defaultAccessSite: string;
  defaultDialyzer: string;
  defaultDryWeight: number; // kg
  treatmentFrequency?: HdTreatmentFrequency;
  treatmentDays?: HdTreatmentDay[];
  treatmentShift?: 'Pagi' | 'Siang';
  biweeklyCycle?: BiweeklyCycleType;
  routineSchedule: string; // e.g. "Selasa & Jumat (Pagi)"
  contactPhone?: string;
  bloodType?: string;
  notes?: string;
}

export type SystemAccessRole =
  | 'administrator'
  | 'kepala_ruangan'
  | 'pj_shift'
  | 'perawat_pelaksana';

export interface MasterNurse {
  id: string;
  name: string;
  nip: string;
  role: 'kepala_ruangan' | 'pj_shift' | 'perawat_pelaksana';
  pernefriCertified: boolean;
  isOnDutyToday: boolean;
  shiftAssigned?: ShiftName;
  phone?: string;
  email?: string;
  username?: string;
  password?: string;
  accountStatus?: 'aktif' | 'nonaktif';
  systemAccess?: SystemAccessRole;
}

export interface MasterBed {
  id: string;
  bedNumber: string; // e.g. "BED A01", "BED ISOLASI 01"
  machineBrand: string; // e.g. "SAS 4000", "Fresenius Medical Care", "Nipro"
  machineModel: string; // e.g. "SAS 4000", "4008S Classic", "5008S CorDiax"
  serialNumber: string;
  designation: 'reguler' | 'isolasi' | 'isolasi_hepb' | 'isolasi_hepc' | 'cito_icu';
  status: 'ready' | 'in_use' | 'maintenance';
  lastDisinfectionDate?: string;
  maintenanceNote?: string;
}

export type DoctorRole = 'dpjp' | 'dokter_jaga' | 'both';

export interface MasterDoctor {
  id: string;
  name: string; // e.g. "dr. Raden Heru Prasanto, Sp.PD-KGH"
  role: DoctorRole; // 'dpjp' | 'dokter_jaga' | 'both'
  spesialisasi?: string; // e.g. "Spesialis Penyakit Dalam - Konsultan Ginjal Hipertensi (Sp.PD-KGH)"
  sip?: string; // Surat Izin Praktik
  nip?: string; // NIP / ID Pegawai Dokter
  phone?: string;
  email?: string;
  status: 'aktif' | 'nonaktif';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// BAGIAN I: Kesiapan Fasilitas Ruangan Hemodialisis & Sistem Water Treatment (RO)
export interface BagianIFacilityRo {
  roomTemperature: number; // °C (standar 18-22°C)
  roomHumidity: number; // % (standar 40-60%)
  roomHygieneClean: boolean; // Desinfeksi lingkungan & pemisahan zonasi
  isolationRoomReady: boolean; // Ruang isolasi Hep B / Hep C siap pakai
  emergencyTrolleyReady: boolean; // Trolley emergency, EKG, DC Shock tersegel & obat exp aman
  oxygenSuctionReady: boolean; // Outlet O2 sentral & suction vacuum berfungsi
  spillKitReady: boolean; // Spill kit B3/darah & safety box jarum tersedia
  aparEvacuationReady: boolean; // APAR & jalur evakuasi bebas hambatan

  // Water Treatment (RO)
  roInletPressure: number; // bar (standar 2.0 - 4.0 bar)
  roPumpPressure: number; // bar (standar 10.0 - 15.0 bar)
  roPermeatePressure: number; // bar (standar 1.5 - 3.0 bar)
  roRawWaterTds: number; // ppm (air baku 150 - 250 ppm)
  roProductWaterTds: number; // ppm (air hasil RO < 10 ppm)
  roRejectionRate: number; // % (penolakan kontaminan >= 90-95%)
  roChlorineFree: boolean; // Uji klorin total / bebas < 0.1 mg/L (strip negatif)
  roHardnessZero: boolean; // Kesadahan air = 0 ppm / 0 gpg setelah softener
  roBrineTankSaltLevel: 'Penuh' | 'Cukup' | 'Kurang'; // Level garam regenerasi
  roStatusOverall: 'MEMENUHI SYARAT' | 'PERLU TINDAKAN' | 'KRITIS';
  roInspectionNotes?: string;
}

// BAGIAN II: Persiapan Perawat, Peralatan, Mesin HD & Alat Kesehatan (Pre-HD)
export interface BagianIIPreHdEquipment {
  nurseFiveMomentsHandHygiene: boolean; // Kepatuhan 5 Momen Cuci Tangan WHO
  nurseApdComplete: boolean; // Apron kedap air, masker bedah, sarung tangan steril/bersih, face shield
  nurseFitToWork: boolean; // Sehat jasmani, kuku pendek & bebas perhiasan

  // Mesin Hemodialisis
  machineSelfTestPassed: boolean; // Self test kelistrikan & hidrolik lolos
  bloodLeakDetectorOk: boolean; // Tes detektor kebocoran darah (BLD) lolos
  airDetectorOk: boolean; // Tes detektor gelembung udara & venous line clamp lolos
  conductivityValue: number; // mS/cm (standar 13.5 - 14.5 mS/cm)
  dialysateTemperature: number; // °C (standar 36.0 - 37.0°C)
  dialysateType: 'Bikarbonat Standar' | 'Bikarbonat K+ Rendah' | 'Asetat';

  // Sirkuit & Dialyzer Priming
  dialyzerType: string; // e.g. "High-Flux FX 80 / SAS HF 18"
  dialyzerUsageStatus: 'Single Use' | 'Reuse ke-1' | 'Reuse ke-2' | 'Reuse ke-3' | 'Reuse ke-4' | 'Reuse ke-5';
  primingSalineVolume: number; // mL (standar 1000 - 2000 mL NaCl 0.9%)
  primingResidualBubblesFree: boolean; // Bebas gelembung udara pada bloodline & dialyzer
  circuitHeparinizationType: 'Heparin Standar' | 'LMWH (Enoxaparin)' | 'Bebas Heparin (Saline Flush)';
  cannulationKitReady: boolean; // AVF needle 15G/16G atau CDL dressing kit steril lengkap
  machineOverallReady: boolean; // Seluruh sistem mesin & sirkuit siap disambungkan
}

// BAGIAN III: Identifikasi Pasien, Pengkajian Pre-HD & Keselamatan Pasien (Patient Safety)
export interface BagianIIIPatientSafety {
  // Sasaran Keselamatan Pasien (SKP)
  patientIdentifiedTwoWays: boolean; // Verifikasi Nama Lengkap & No. RM pada gelang pasien
  medicalPrescriptionVerified: boolean; // Resep instruksi DPJP Sp.PD-KGH diverifikasi
  informedConsentValid: boolean; // Surat persetujuan tindakan HD sah
  fallRiskScore: 'Rendah' | 'Sedang' | 'Tinggi'; // Skrining risiko jatuh (Morse Fall Scale)
  allergyStatus: string; // Riwayat alergi obat / dialyzer

  // Tanda Vital Pre-HD
  preBpSitting: string; // e.g. "150/90" mmHg
  preHeartRate: number; // x/menit
  preRespiratoryRate: number; // x/menit
  preBodyTemp: number; // °C
  preOxygenSat: number; // % SpO2
  fluidOverloadGrade: 'Nihil (-)' | 'Ringan (+1)' | 'Sedang (+2)' | 'Berat (+3/+4)';

  // Perhitungan Berat Badan & Target Ultrafiltrasi
  dryWeight: number; // kg (Berat Kering)
  preWeight: number; // kg (BB Pre-HD)
  idwgKg: number; // Kenaikan BB (kg) = preWeight - dryWeight
  idwgPercent: number; // IDWG (%)
  estimatedIntakeMl: number; // Estimasi minum + bilas saline (mL)
  targetUfMl: number; // Target penarikan UF (mL)
  prescribedHours: number; // Durasi resep (jam)

  // Pengkajian Akses Vaskular
  accessType: VascularAccess;
  accessSite: string; // Lokasi kanulasi / pemasangan kateter
  vascularAccessNurse?: string; // Perawat pelaksana aksesing vaskular (Poin 3.6)
  accessBruitThrillPresent: boolean; // AVF: Bruit & thrill teraba jelas
  cdlExitSiteClean: boolean; // CDL: Exit site bersih, kassa steril kering, tidak ada pus
  preAssessmentSignOff: boolean; // Persetujuan mulai kanulasi & inisiasi HD
}

// Entri Lembar Observasi Intra-HD Per Jam
export interface HourlyIntraHdLog {
  hourNumber: number; // Jam ke-0, 1, 2, 3, 4, 5
  timeString: string; // e.g. "07:30"
  bp: string; // e.g. "140/85"
  heartRate: number; // x/menit
  qb: number; // mL/min (Blood flow)
  qd: number; // mL/min (Dialysate flow)
  arterialPressure: number; // mmHg (AP)
  venousPressure: number; // mmHg (VP)
  tmp: number; // mmHg (Transmembrane pressure)
  ufRate: number; // mL/jam
  cumulativeUf: number; // mL terbuang
  nurseNote?: string;
}

// BAGIAN IV: Monitoring Intra-HD & Pencegahan Insiden Keselamatan Pasien (IKP)
export interface BagianIVIntraHdMonitoring {
  hourlyLogs: HourlyIntraHdLog[];

  // Pemantauan & Penanganan IKP
  hasHypotension: boolean;
  hypotensionBp?: string;
  hypotensionTime?: string;
  hypotensionIntervention?: string; // Posisi Trendelenburg, bolus NaCl 0.9% 100-200 mL, turunkan UF

  hasMuscleCramps: boolean;
  muscleCrampsLocation?: string;
  muscleCrampsIntervention?: string; // Masase, kompres hangat, bolus saline

  hasClotting: boolean;
  clottingLocation?: 'Dialyzer' | 'Bubble Trap / Drip Chamber' | 'A-V Bloodline' | 'Nihil';
  clottingIntervention?: string; // Bilas saline berkala, evaluasi antikoagulan

  hasBloodLeak: boolean;
  bloodLeakAction?: string; // Alarm kebocoran membran, uji tes strip darah dialisat

  hasAirEmbolismRisk: boolean;
  airEmbolismSafe: boolean; // Detektor gelembung udara aktif & klem berfungsi protektif

  hasAccessBleeding: boolean;
  accessBleedingIntervention?: string; // Penekanan kanulasi 10-15 menit (dua jari), hemostasis tuntas

  hasFirstUseSyndrome: boolean;
  firstUseDetails?: string; // Reaksi alergi membran baru

  // Konsultasi Medis Cito ke DPJP
  hasConsultDpjp: boolean;
  consultTime?: string;
  consultDoctorName?: string;
  consultSbarIssue?: string;
  consultAdviceTbak?: string; // Instruksi dokter dengan metode TBAK (Tulis, Baca, Konfirmasi)

  // Hasil Akhir Terminasi HD
  achievedUfMl: number;
  actualDurationHours: number;
  postBp: string;
  postWeight: number;
  postHeartRate?: number;
  underUfTolerated: boolean;
  underUfReason?: string;
  sessionTerminatedSafe: boolean; // Terminasi aman, re-infusi darah tuntas
}

// BAGIAN V: Edukasi Terstruktur Kepada Pasien & Keluarga (Diet, Cairan, Kebersihan Diri)
export interface BagianVEducation {
  // 1. Edukasi Manajemen Cairan & Minum
  fluidManagementEducated: boolean; // Rumus: Volume urine 24 jam + 500-750 mL IWL
  dailyFluidLimitMl: number; // Batas cairan harian (mL)
  targetIdwgLimitKg: number; // Batas kenaikan berat badan antar sesi (< 3-5%)
  fluidTipsExplained: boolean; // Kiat: es batu kecil, kumur air dingin, kurangi asin/MSG

  // 2. Edukasi Nutrisi & Diet Spesifik GGK
  dietNutritionEducated: boolean; // Rendah kalium (hindari pisang/alpukat/air kelapa, rebus sayur)
  phosphateControlEducated: boolean; // Rendah fosfat & minum pengikat fosfat bersama makanan
  adequateProteinEducated: boolean; // Asupan cukup protein hewani (putih telur, ikan) mencegah malnutrisi

  // 3. Edukasi Kebersihan Diri & Perawatan Akses Vaskular
  vascularAccessCareEducated: boolean; // Cuci lengan AVF dengan sabun sebelum HD, pantau getaran/thrill tiap hari
  cdlCareEducated: boolean; // Jaga kassa CDL tetap kering, dilarang mandi basah langsung tanpa pelindung

  // 4. Edukasi Kepatuhan Obat & Jadwal Rutin HD
  medicationAdherenceEducated: boolean; // Kepatuhan obat antihipertensi, ESA & kalsium/vitamin D
  scheduleAdherenceEducated: boolean; // Komitmen hadir sesuai jadwal HD 2x-3x/minggu tanpa bolos

  // 5. Evaluasi Pemahaman (Teach-Back) & Sasaran
  educationRecipient: 'Pasien Sendiri' | 'Keluarga / Pendamping' | 'Pasien & Keluarga';
  recipientName: string; // Nama pasien / keluarga penerima edukasi
  teachBackMethodPassed: boolean; // Pasien / keluarga mampu menjelaskan kembali 3 pesan kunci dengan benar
  patientReadinessAndNotes: string; // Catatan respon pasien & kesiapan menjalankan di rumah
  educationalLeafletGiven: boolean; // Brosur panduan edukasi diet & cairan diserahkan
}

export interface PatientHDSession {
  id: string;
  bedNumber: string; // e.g. "Bed 01", "Bed 08"
  patientName: string;
  medicalRecordNumber: string;
  age: number;
  gender: 'L' | 'P';
  status: PatientStatus; // rajal vs ranap
  category: PatientCategory; // reguler, hepb, hepc, hiv
  sessionStatus: SessionStatus;
  isCito: boolean;
  shift?: ShiftName;
  date?: string; // e.g. "Senin, 26 Oktober 2026"
  sessionDate?: string; // ISO format "YYYY-MM-DD", e.g. "2026-10-26"
  // Vascular Access & Dialyzer
  vascularAccess: VascularAccess;
  accessSite?: string; // e.g. "AVF Cimino Sinistra", "CDL Jugular Dextra"
  dialyzerModel: string; // e.g. "SAS HF 18", "FX 80", "High-Flux 1.5"
  isReuse: boolean;
  reuseCount?: number;
  
  // Weights and UF Goals
  dryWeight: number; // kg (Berat Kering)
  preWeight: number; // kg (BB Pre-HD)
  postWeight?: number; // kg (BB Post-HD)
  targetUf: number; // mL
  achievedUf: number; // mL
  durationPrescribed: number; // hours (e.g. 4.5, 4.0, 3.0)
  durationActual: number; // hours
  
  // Flow rates & Vitals
  bloodFlowQb?: number; // mL/min (e.g. 200 - 250)
  dialysateFlowQd?: number; // mL/min (default 500)
  preBp: string; // e.g. "150/90"
  postBp: string; // e.g. "120/80"
  ktV?: number | string; // Adekuasi dialisis Kt/V (standar >= 1.2)
  
  // Acute Intra-Dialysis Events & Complications
  hasHypotension: boolean;
  hypotensionBp?: string; // e.g. "85/50"
  hypotensionHour?: number; // Jam ke-2, jam ke-3
  hypotensionAction?: string; // e.g. "Bolus NaCl 0.9% 100-150 cc + Trendelenburg"
  
  hasMuscleCramps: boolean;
  muscleCrampAction?: string; // e.g. "Masase betis & bolus NaCl 100 cc, UF rate diturunkan"
  
  hasClotting: boolean;
  clottingDetails?: string; // e.g. "Sirkit / Dialiser heparinisasi adekuat"
  
  hasFirstUseSyndrome: boolean;
  firstUseDetails?: string; // e.g. "Priming dialiser sesuai SOP 2000 mL"
  
  hasAccessBleeding: boolean;
  accessBleedingAction?: string; // e.g. "Penekanan kanulasi AVF 10-15 menit sesuai SOP"
  complicationNames?: string; // Pure complication names (Logbook Poin 4.3)
  
  hasConsultDpjp: boolean;
  consultDoctorName?: string; // e.g. "dr. Paramitha"
  consultReason?: string;
  consultAdvice?: string; // e.g. "Stop UF sementara, bolus NaCl, toleransi under-UF"

  underUfTolerated: boolean;
  underUfReason?: string; // e.g. "Ditoleransi under-UF 600 mL karena hipotensi simtomatik"

  nurseInCharge: string; // Name of perawat pelaksana
  vascularAccessNurse?: string; // Name of nurse who performed vascular accessing (Poin 3.6)
  poin3_6Completed?: boolean; // Whether SPO Poin 3.6 was executed on this patient
  nurseNotes?: string;
  updatedAt: string;

  // Status Verifikasi PJ Shift / Kepala Ruang & Pengesahan Logbook
  isVerifiedByPj?: boolean;
  isVerifiedByKepalaRuang?: boolean;
  verificationStatus?: 'belum_diajukan' | 'diajukan' | 'terverifikasi';
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

  // Standar 5 Bagian Logbook Perawat Pelaksana KARS & PERNEFRI
  bagian1?: BagianIFacilityRo;
  bagian2?: BagianIIPreHdEquipment;
  bagian3?: BagianIIIPatientSafety;
  bagian4?: BagianIVIntraHdMonitoring;
  bagian5?: BagianVEducation;
}

export interface ShiftInfo {
  hospitalName: string;
  unitName: string;
  date: string; // e.g. "Selasa, 20 Oktober 2026"
  shift: ShiftName;
  shiftHours: string; // e.g. "Pagi, jam 07.00 - 14.00 WIB"
  pjShift: string; // e.g. "M. Haikal Malilang, A.Md.Kep."
  kepalaRuangan: string; // e.g. "Twis Fertilianti PW., S.Kep., Ns."
  dokterDpjp: string; // e.g. "dr. Raden Heru Prasanto, Sp.PD-KGH"
  dokterJaga: string; // e.g. "dr. Paramitha"
  totalPerawatDinas: number; // e.g. 8
  detailPerawat: string; // e.g. "8 Orang (1 PJ Shift + 7 Perawat Pelaksana)"
  perawatRatio: string; // e.g. "1 : 3 (Standar PERNEFRI 1 : 3-4 Pasien)"
  tenagaPendukung: string; // e.g. "1 Teknisi Elektromedis/RO, 1 HK Ruangan"
  pjShiftBerikutnya: string; // e.g. "Aprillia Dwi N, S.Kep., Ns."
}

export interface MachineOverview {
  totalCapacity: number;
  beroperasiSiapPakai: number;
  maintenance: number;
  khususHepB: number;
  khususHepC: number;
}

export interface OperationalItem {
  id: string;
  item: string;
  parameterUji: string;
  hasilObservasi: string;
  statusKepatuhan: string;
}

export interface SbarData {
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
}

export interface ClinicalIndicatorItem {
  id: string;
  label: string;
  capaian: string;
  standar: string;
  analisis: string;
  isStandardMet: boolean;
}

export interface AggregatedCensus {
  pasienTerjadwal: number;
  pasienHadirSelesai: number;
  pasienCitoEmergency: number;
  pasienBatalTunda: number;
  pasienReguler: number;
  pasienHepB: number;
  pasienHepC: number;
  pasienRajal: number;
  pasienRanap: number;
  totalPasienDilayani: number;
  
  // Vascular access count
  aksesAvFistula: number;
  aksesAvGraft: number;
  aksesCdlNonTunnel: number;
  aksesCdlPermcath: number;
}

export interface SignatureEntry {
  name: string;
  signed: boolean;
  signedAt?: string;
}

export interface ShiftSignatures {
  pjShift: SignatureEntry;
  pjBerikutnya: SignatureEntry;
  kepalaRuangan: SignatureEntry;
}

export interface ShiftReportFull {
  shiftInfo: ShiftInfo;
  census: AggregatedCensus;
  machineOverview: MachineOverview;
  clinicalIndicators: ClinicalIndicatorItem[];
  operationalItems: OperationalItem[];
  sbar: SbarData;
  signatures: ShiftSignatures;
}

// Model for Official 29-item Monthly Logbook Perawat Pelaksana (PDF Standard RS Happy Land)
export interface OfficialLogbookItem {
  code: string; // '1.1' to '6.5'
  bagian: number; // 1 to 6
  bagianTitle: string;
  category: string;
  shortTitle?: string;
  simpleGuide?: string;
  keyMetrics?: string[];
  notePlaceholder?: string;
  quickNotes?: string[];
  description: string;
  standardSpo: string;
}

export interface OfficialNurseLogbookMonth {
  nurseName: string;
  nipNira: string;
  nurseRole?: SystemAccessRole;
  unitName: string;
  monthYear: string; // e.g. "Oktober / 2026"
  daysInMonth?: number;
  pkLevel: 'PK I' | 'PK II' | 'PK III Dialisis';
  shift: ShiftName;
  // Map of item code -> boolean array of length 31 (indices 0 to 30 for days 1 to 31)
  checks: Record<string, boolean[]>;
  // Map of item code -> numeric score array of length 31 (null when unverified, 0..N when verified)
  dailyScores?: Record<string, (number | null)[]>;
  // Map of item code -> max possible score per day (length 31; supports Poin 3.6 Opsi A cross-nurse max)
  dailyItemMaxScores?: Record<string, (number | null)[]>;
  // Map of item code -> monthly max possible score (supports Poin 3.6 Opsi A cross-nurse max)
  itemMaxScores?: Record<string, number>;
  // Verified managed patients count per day (length 31; 0 when unverified)
  dailyVerifiedPatientCounts?: number[];
  // Verified days indicator for own managed patients (length 31)
  verifiedDays?: boolean[];
  // Active days with either own verified patients or cross-nurse verified vascular accessing (length 31)
  hasActivityDays?: boolean[];
  verifierName?: string;
  verifierRoleLabel?: string;
  notes: Record<string, string>;
  nurseSigned: boolean;
  nurseSignedAt?: string;
  headNurseName: string;
  headNurseNip: string;
  headNurseSigned: boolean;
  headNurseSignedAt?: string;
}
