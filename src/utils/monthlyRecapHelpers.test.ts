import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStaffMonthlyRecap,
  buildAllStaffMonthlyRecap,
  computeDailySpoScoresFromVerifiedLogbook,
  isVerificationEligibleForStaffRole,
  parseIndonesianLogbookDate,
  resolveLiveStaffVerifiedSnapshots
} from './monthlyRecapHelpers.ts';
import { OFFICIAL_LOGBOOK_ITEMS } from '../data/officialPelaksanaLogbookData.ts';
import { buildPatientVerificationKey } from './nurseVerificationHelpers.ts';
import { MasterNurse, ShiftInfo, PatientHDSession } from '../types/dialysis.ts';
import { NurseLogbookCloudData } from '../services/firebase.ts';

function createFullPatientChecks(overrides: Record<string, boolean> = {}): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  OFFICIAL_LOGBOOK_ITEMS.filter((it) => it.bagian >= 2 && it.bagian <= 6).forEach((it) => {
    map[it.code] = true;
  });
  return { ...map, ...overrides };
}

test('parseIndonesianLogbookDate parses Indonesian and ISO clinical dates accurately', () => {
  const d1 = parseIndonesianLogbookDate('Selasa, 20 Oktober 2026, 14:15 WIB');
  assert.equal(d1.day, 20);
  assert.equal(d1.month, 10);
  assert.equal(d1.monthName, 'Oktober');
  assert.equal(d1.year, 2026);
  assert.equal(d1.dateKey, '2026-10-20');
  assert.equal(d1.daysInMonth, 31);

  const d2 = parseIndonesianLogbookDate('2026-11-05T08:30:00Z');
  assert.equal(d2.day, 5);
  assert.equal(d2.month, 11);
  assert.equal(d2.monthName, 'November');
  assert.equal(d2.daysInMonth, 30);
});

test('computeDailySpoScoresFromVerifiedLogbook enforces 1.1-1.3 = 1/day and 2.1-6.5 = patient count (example: 3 patients, 1 missed on 3.3 => score 2)', () => {
  const facilityStatuses = { '1.1': true, '1.2': true, '1.3': true };
  const pat1 = createFullPatientChecks();
  const pat2 = createFullPatientChecks();
  const pat3 = createFullPatientChecks({ '3.3': false });

  const result = computeDailySpoScoresFromVerifiedLogbook(facilityStatuses, [pat1, pat2, pat3]);
  assert.ok(result);
  assert.equal(result.verifiedPatientCount, 3);

  // Bagian I (1.1 - 1.3) strictly 1 (executed once per day, NOT multiplied by 3 patients)
  assert.equal(result.scores['1.1'], 1);
  assert.equal(result.scores['1.2'], 1);
  assert.equal(result.scores['1.3'], 1);

  // Bagian II - VI (2.1 - 6.5) follow managed patient count
  assert.equal(result.scores['2.1'], 3);
  assert.equal(result.scores['3.2'], 3);
  assert.equal(result.scores['3.3'], 2); // 1 of 3 patients not done -> score = 2
  assert.equal(result.scores['4.1'], 3);
  assert.equal(result.scores['5.1'], 3);
  assert.equal(result.scores['6.1'], 3);
  assert.equal(result.scores['6.5'], 3);
});

test('Unverified logbook entries produce zero verified days and empty monthly scores', () => {
  const nurseName = 'Ners Rina S.Kep';
  const managedPatients = [
    { id: 'p1', bedNumber: 'Bed 01', patientName: 'Pasien A', medicalRecord: '1001' },
    { id: 'p2', bedNumber: 'Bed 02', patientName: 'Pasien B', medicalRecord: '1002' }
  ];
  const patStatuses = {
    p1: createFullPatientChecks(),
    p2: createFullPatientChecks()
  };
  const perPatUnverified = {
    [buildPatientVerificationKey(nurseName, 'Bed 01', '1001')]: {
      status: 'diajukan'
    },
    [buildPatientVerificationKey(nurseName, 'Bed 02', '1002')]: {
      status: 'belum_diajukan'
    }
  };

  const live = resolveLiveStaffVerifiedSnapshots({
    nurseName,
    userRole: 'perawat_pelaksana',
    overrideManagedPatients: managedPatients,
    overridePatientStatuses: patStatuses,
    overrideFacilityStatuses: { '1.1': true, '1.2': true, '1.3': true },
    overridePerPatientRecords: perPatUnverified
  });

  assert.equal(live.totalManagedCount, 2);
  assert.equal(live.unverifiedCount, 2);
  assert.deepEqual(live.verifiedSnapshotsByDate, {});

  const recap = buildStaffMonthlyRecap({
    nurseName,
    userRole: 'perawat_pelaksana',
    liveVerificationOverride: live,
    storedSnapshotsOverride: {}
  });

  assert.equal(recap.verifiedDaysCount, 0);
  assert.equal(recap.totalVerifiedPatientsInMonth, 0);
  assert.equal(recap.grandTotalScore, 0);
  assert.equal(recap.overallCompliancePct, 0);
  assert.equal(recap.logbook.dailyScores?.['1.1']?.[19], null);
  assert.equal(recap.logbook.dailyScores?.['3.3']?.[19], null);
});

test('3-role verification eligibility supports Perawat Pelaksana, PJ Shift (Karu or other PJ), and Kepala Ruang', () => {
  // Perawat Pelaksana verified by PJ Shift
  assert.equal(
    isVerificationEligibleForStaffRole({
      staffName: 'Ners Rina',
      staffRole: 'perawat_pelaksana',
      isVerified: true,
      verifiedBy: 'Ns. Haikal',
      verifiedByRole: 'PJ Shift'
    }),
    true
  );

  // PJ Shift verified by Kepala Ruang -> allowed
  assert.equal(
    isVerificationEligibleForStaffRole({
      staffName: 'Ns. Haikal',
      staffRole: 'pj_shift',
      isVerified: true,
      verifiedBy: 'Ns. Twis',
      verifiedByRole: 'Kepala Ruangan'
    }),
    true
  );

  // PJ Shift verified by another PJ Shift -> allowed
  assert.equal(
    isVerificationEligibleForStaffRole({
      staffName: 'Ns. Haikal',
      staffRole: 'pj_shift',
      isVerified: true,
      verifiedBy: 'Ns. Riska',
      verifiedByRole: 'PJ Shift'
    }),
    true
  );

  // PJ Shift self-verified -> blocked
  assert.equal(
    isVerificationEligibleForStaffRole({
      staffName: 'Ns. Haikal',
      staffRole: 'pj_shift',
      isVerified: true,
      verifiedBy: 'Ns. Haikal',
      verifiedByRole: 'PJ Shift'
    }),
    false
  );

  // Kepala Ruang verified by Kepala Ruang or PJ Shift -> allowed
  assert.equal(
    isVerificationEligibleForStaffRole({
      staffName: 'Ns. Twis',
      staffRole: 'kepala_ruangan',
      isVerified: true,
      verifiedBy: 'Ns. Twis',
      verifiedByRole: 'Kepala Ruangan'
    }),
    true
  );
});

test('buildStaffMonthlyRecap aggregates multi-day verified scores accurately across a month', () => {
  const nurseName = 'Ners Rina S.Kep';

  // Day 10 historical snapshot: 2 verified patients, all SPO complete
  const day10Scores = computeDailySpoScoresFromVerifiedLogbook(
    { '1.1': true, '1.2': true, '1.3': false }, // 1.3 not done on Day 10 -> 0
    [createFullPatientChecks(), createFullPatientChecks()]
  )!;

  // Day 20 live verified: 3 verified patients, 1 patient missed on 3.3 -> score 2
  const managedToday = [
    { id: 'p1', bedNumber: 'Bed 01', patientName: 'Pasien 1', medicalRecord: '2001' },
    { id: 'p2', bedNumber: 'Bed 02', patientName: 'Pasien 2', medicalRecord: '2002' },
    { id: 'p3', bedNumber: 'Bed 03', patientName: 'Pasien 3', medicalRecord: '2003' }
  ];
  const patStatuses = {
    p1: createFullPatientChecks(),
    p2: createFullPatientChecks(),
    p3: createFullPatientChecks({ '3.3': false })
  };
  const perPatVerified = {
    [buildPatientVerificationKey(nurseName, 'Bed 01', '2001')]: {
      status: 'terverifikasi',
      verifiedAt: 'Selasa, 20 Oktober 2026, 14:10 WIB',
      verifiedBy: 'Ns. Haikal',
      verifiedByRole: 'PJ Shift'
    },
    [buildPatientVerificationKey(nurseName, 'Bed 02', '2002')]: {
      status: 'terverifikasi',
      verifiedAt: 'Selasa, 20 Oktober 2026, 14:10 WIB',
      verifiedBy: 'Ns. Haikal',
      verifiedByRole: 'PJ Shift'
    },
    [buildPatientVerificationKey(nurseName, 'Bed 03', '2003')]: {
      status: 'terverifikasi',
      verifiedAt: 'Selasa, 20 Oktober 2026, 14:10 WIB',
      verifiedBy: 'Ns. Haikal',
      verifiedByRole: 'PJ Shift'
    }
  };

  const live = resolveLiveStaffVerifiedSnapshots({
    nurseName,
    userRole: 'perawat_pelaksana',
    overrideManagedPatients: managedToday,
    overridePatientStatuses: patStatuses,
    overrideFacilityStatuses: { '1.1': true, '1.2': true, '1.3': true },
    overridePerPatientRecords: perPatVerified
  });

  const recap = buildStaffMonthlyRecap({
    nurseName,
    nurseNip: '19950110',
    userRole: 'perawat_pelaksana',
    targetMonth: 10,
    targetYear: 2026,
    liveVerificationOverride: live,
    storedSnapshotsOverride: {
      '2026-10-10': {
        dateKey: '2026-10-10',
        day: 10,
        month: 10,
        year: 2026,
        verifiedPatientCount: day10Scores.verifiedPatientCount,
        scores: day10Scores.scores,
        verifiedBy: 'Ns. Haikal',
        verifiedByRole: 'PJ Shift'
      }
    }
  });

  assert.equal(recap.verifiedDaysCount, 2); // Day 10 + Day 20
  assert.equal(recap.totalVerifiedPatientsInMonth, 5); // 2 + 3 patients

  // Check Day 20 (index 19)
  assert.equal(recap.logbook.dailyScores?.['1.1']?.[19], 1);
  assert.equal(recap.logbook.dailyScores?.['3.3']?.[19], 2);
  assert.equal(recap.logbook.dailyScores?.['6.5']?.[19], 3);
  assert.equal(recap.dailyTotalScores[19], 80); // 3 + (25*3 + 2) = 80

  // Check Monthly Item Totals
  assert.equal(recap.itemStats['1.1'].totalScore, 2); // 1 + 1
  assert.equal(recap.itemStats['1.1'].maxScore, 2);
  assert.equal(recap.itemStats['1.1'].pct, 100);

  assert.equal(recap.itemStats['1.3'].totalScore, 1); // 0 on Day 10 + 1 on Day 20
  assert.equal(recap.itemStats['1.3'].maxScore, 2);
  assert.equal(recap.itemStats['1.3'].pct, 50);

  assert.equal(recap.itemStats['2.1'].totalScore, 5); // 2 + 3
  assert.equal(recap.itemStats['2.1'].maxScore, 5);
  assert.equal(recap.itemStats['2.1'].pct, 100);

  assert.equal(recap.itemStats['3.3'].totalScore, 4); // 2 on Day 10 + 2 on Day 20
  assert.equal(recap.itemStats['3.3'].maxScore, 5);
  assert.equal(recap.itemStats['3.3'].pct, 80);
});

test('Poin 3.6 cross-nurse vascular accessing (Opsi A): Perawat 1 (A, B, C with A accessed by Perawat 2) gets 2/2 and Perawat 2 (D, E, F + A) gets 4/4 after verification', () => {
  const nurse1 = 'Ners Rina S.Kep';
  const nurse2 = 'Ners Budi S.Kep';
  const verifTime = 'Selasa, 20 Oktober 2026, 14:30 WIB';

  const nurse1Patients = [
    { id: 'pA', bedNumber: 'Bed 01', patientName: 'Pasien A', medicalRecord: '3001' },
    { id: 'pB', bedNumber: 'Bed 02', patientName: 'Pasien B', medicalRecord: '3002' },
    { id: 'pC', bedNumber: 'Bed 03', patientName: 'Pasien C', medicalRecord: '3003' }
  ];
  const nurse2Patients = [
    { id: 'pD', bedNumber: 'Bed 04', patientName: 'Pasien D', medicalRecord: '3004' },
    { id: 'pE', bedNumber: 'Bed 05', patientName: 'Pasien E', medicalRecord: '3005' },
    { id: 'pF', bedNumber: 'Bed 06', patientName: 'Pasien F', medicalRecord: '3006' }
  ];

  const nurse1Statuses = {
    pA: createFullPatientChecks(),
    pB: createFullPatientChecks(),
    pC: createFullPatientChecks()
  };
  const nurse2Statuses = {
    pD: createFullPatientChecks(),
    pE: createFullPatientChecks(),
    pF: createFullPatientChecks()
  };

  // Pasien A's vascular accessing was performed by Perawat 2 (Ners Budi)
  const nurse1ClinicalDetails = {
    pA: {
      poin3_6: {
        cimino: 'AVF Sinistra lancar',
        cdl: '',
        femoral: '',
        ciminoAktif: true,
        cdlAktif: false,
        femoralAktif: false,
        vascularAccessNurse: nurse2
      }
    }
  };

  // 1) Before verification ('diajukan'): neither Nurse 1 nor Nurse 2 gets points on Laporan Bulanan
  const unverifiedPerPat = {
    [buildPatientVerificationKey(nurse1, 'Bed 01', '3001')]: { status: 'diajukan' },
    [buildPatientVerificationKey(nurse1, 'Bed 02', '3002')]: { status: 'diajukan' },
    [buildPatientVerificationKey(nurse1, 'Bed 03', '3003')]: { status: 'diajukan' },
    [buildPatientVerificationKey(nurse2, 'Bed 04', '3004')]: { status: 'diajukan' },
    [buildPatientVerificationKey(nurse2, 'Bed 05', '3005')]: { status: 'diajukan' },
    [buildPatientVerificationKey(nurse2, 'Bed 06', '3006')]: { status: 'diajukan' }
  };

  const cloudLogbooks = [
    {
      nurseName: nurse1,
      managedPatients: nurse1Patients,
      patientStatuses: nurse1Statuses,
      clinicalDetails: nurse1ClinicalDetails,
      facilityStatuses: { '1.1': true, '1.2': true, '1.3': true },
      dateIso: '2026-10-20'
    },
    {
      nurseName: nurse2,
      managedPatients: nurse2Patients,
      patientStatuses: nurse2Statuses,
      clinicalDetails: {},
      facilityStatuses: { '1.1': true, '1.2': true, '1.3': true },
      dateIso: '2026-10-20'
    }
  ];

  const live2BeforeVerif = resolveLiveStaffVerifiedSnapshots({
    nurseName: nurse2,
    userRole: 'perawat_pelaksana',
    cloudNurseLogbooks: cloudLogbooks,
    overrideManagedPatients: nurse2Patients,
    overridePatientStatuses: nurse2Statuses,
    overrideFacilityStatuses: { '1.1': true, '1.2': true, '1.3': true },
    overridePerPatientRecords: unverifiedPerPat
  });
  assert.deepEqual(live2BeforeVerif.verifiedSnapshotsByDate, {});

  // 2) After PJ Shift / Kepala Ruang verifies all 6 patients (also include Pasien A in sessions to verify strict deduplication!)
  const verifiedPerPat = {
    [buildPatientVerificationKey(nurse1, 'Bed 01', '3001')]: {
      status: 'terverifikasi',
      verifiedAt: verifTime,
      verifiedBy: 'Ns. Haikal',
      verifiedByRole: 'PJ Shift'
    },
    [buildPatientVerificationKey(nurse1, 'Bed 02', '3002')]: {
      status: 'terverifikasi',
      verifiedAt: verifTime,
      verifiedBy: 'Ns. Haikal',
      verifiedByRole: 'PJ Shift'
    },
    [buildPatientVerificationKey(nurse1, 'Bed 03', '3003')]: {
      status: 'terverifikasi',
      verifiedAt: verifTime,
      verifiedBy: 'Ns. Haikal',
      verifiedByRole: 'PJ Shift'
    },
    [buildPatientVerificationKey(nurse2, 'Bed 04', '3004')]: {
      status: 'terverifikasi',
      verifiedAt: verifTime,
      verifiedBy: 'Ns. Haikal',
      verifiedByRole: 'PJ Shift'
    },
    [buildPatientVerificationKey(nurse2, 'Bed 05', '3005')]: {
      status: 'terverifikasi',
      verifiedAt: verifTime,
      verifiedBy: 'Ns. Haikal',
      verifiedByRole: 'PJ Shift'
    },
    [buildPatientVerificationKey(nurse2, 'Bed 06', '3006')]: {
      status: 'terverifikasi',
      verifiedAt: verifTime,
      verifiedBy: 'Ns. Haikal',
      verifiedByRole: 'PJ Shift'
    }
  };

  const sessionsWithPasienA = [
    {
      id: 'sess-pA',
      date: 'Selasa, 20 Oktober 2026',
      sessionDate: '2026-10-20',
      shift: 'Pagi' as const,
      bedNumber: 'Bed 01',
      patientName: 'Pasien A',
      medicalRecordNumber: '3001',
      age: 50,
      gender: 'L' as const,
      status: 'rajal' as const,
      category: 'reguler' as const,
      sessionStatus: 'selesai' as const,
      isCito: false,
      vascularAccess: 'av_fistula' as const,
      accessSite: 'AVF Sinistra',
      dialyzerModel: 'F8HPS',
      isReuse: false,
      dryWeight: 60,
      preWeight: 62,
      postWeight: 60,
      targetUf: 2000,
      achievedUf: 2000,
      durationPrescribed: 4,
      durationActual: 4,
      bloodFlowQb: 220,
      dialysateFlowQd: 500,
      preBp: '130/80',
      postBp: '120/80',
      hasHypotension: false,
      hasMuscleCramps: false,
      hasClotting: false,
      hasFirstUseSyndrome: false,
      hasAccessBleeding: false,
      hasConsultDpjp: false,
      underUfTolerated: false,
      nurseInCharge: nurse1,
      vascularAccessNurse: nurse2,
      poin3_6Completed: true,
      verificationStatus: 'terverifikasi' as const,
      verifiedBy: 'Ns. Haikal',
      verifiedByRole: 'PJ Shift',
      verifiedAt: verifTime,
      nurseNotes: 'HD lancar',
      updatedAt: '2026-10-20T07:30:00.000Z'
    }
  ];

  // Check Perawat 1 (manages A, B, C; A's vascular access done by Perawat 2)
  const live1 = resolveLiveStaffVerifiedSnapshots({
    nurseName: nurse1,
    userRole: 'perawat_pelaksana',
    sessions: sessionsWithPasienA,
    cloudNurseLogbooks: cloudLogbooks,
    overrideManagedPatients: nurse1Patients,
    overridePatientStatuses: nurse1Statuses,
    overrideClinicalDetails: nurse1ClinicalDetails,
    overrideFacilityStatuses: { '1.1': true, '1.2': true, '1.3': true },
    overridePerPatientRecords: verifiedPerPat
  });
  const recap1 = buildStaffMonthlyRecap({
    nurseName: nurse1,
    userRole: 'perawat_pelaksana',
    targetMonth: 10,
    targetYear: 2026,
    liveVerificationOverride: live1,
    storedSnapshotsOverride: {}
  });

  assert.equal(recap1.totalVerifiedPatientsInMonth, 3);
  assert.equal(recap1.itemStats['3.1'].totalScore, 3);
  assert.equal(recap1.itemStats['3.1'].maxScore, 3);
  assert.equal(recap1.itemStats['3.6'].totalScore, 2); // Only Pasien B & C
  assert.equal(recap1.itemStats['3.6'].maxScore, 2); // Opsi A: MAKS = 2
  assert.equal(recap1.itemStats['3.6'].pct, 100);
  assert.equal(recap1.logbook.dailyScores?.['3.6']?.[19], 2);
  assert.equal(recap1.logbook.dailyItemMaxScores?.['3.6']?.[19], 2);

  // Check Perawat 2 (manages D, E, F + performed vascular access on Pasien A; deduplicated across sessions & cloudLogbooks)
  const live2 = resolveLiveStaffVerifiedSnapshots({
    nurseName: nurse2,
    userRole: 'perawat_pelaksana',
    sessions: sessionsWithPasienA,
    cloudNurseLogbooks: cloudLogbooks,
    overrideManagedPatients: nurse2Patients,
    overridePatientStatuses: nurse2Statuses,
    overrideFacilityStatuses: { '1.1': true, '1.2': true, '1.3': true },
    overridePerPatientRecords: verifiedPerPat
  });
  const recap2 = buildStaffMonthlyRecap({
    nurseName: nurse2,
    userRole: 'perawat_pelaksana',
    targetMonth: 10,
    targetYear: 2026,
    liveVerificationOverride: live2,
    storedSnapshotsOverride: {}
  });

  assert.equal(recap2.totalVerifiedPatientsInMonth, 3);
  assert.equal(recap2.itemStats['3.1'].totalScore, 3);
  assert.equal(recap2.itemStats['3.1'].maxScore, 3);
  assert.equal(recap2.itemStats['3.6'].totalScore, 4); // Pasien D, E, F + Pasien A = 4
  assert.equal(recap2.itemStats['3.6'].maxScore, 4); // Opsi A: MAKS = 4
  assert.equal(recap2.itemStats['3.6'].pct, 100);
  assert.equal(recap2.logbook.dailyScores?.['3.6']?.[19], 4);
  assert.equal(recap2.logbook.dailyItemMaxScores?.['3.6']?.[19], 4);
});

test('Helper-only day (0 own managed patients, 1 cross-nurse vascular accessing) credits Poin 3.6 = 1/1 without penalizing Bagian I or other items', () => {
  const karuName = 'Ns. Twis S.Kep';
  const pelaksanaName = 'Ners Rina S.Kep';
  const verifTime = 'Rabu, 21 Oktober 2026, 11:00 WIB';

  const sessions = [
    {
      id: 'sess-help-1',
      date: 'Rabu, 21 Oktober 2026',
      sessionDate: '2026-10-21',
      shift: 'Pagi' as const,
      bedNumber: 'Bed 05',
      patientName: 'Pasien Sulit Akses',
      medicalRecordNumber: '5001',
      age: 62,
      gender: 'P' as const,
      status: 'rajal' as const,
      category: 'reguler' as const,
      sessionStatus: 'selesai' as const,
      isCito: false,
      vascularAccess: 'av_fistula' as const,
      accessSite: 'AVF Brachiocephalica',
      dialyzerModel: 'F8HPS',
      isReuse: false,
      dryWeight: 55,
      preWeight: 57,
      postWeight: 55,
      targetUf: 2000,
      achievedUf: 2000,
      durationPrescribed: 4,
      durationActual: 4,
      bloodFlowQb: 200,
      dialysateFlowQd: 500,
      preBp: '140/85',
      postBp: '125/80',
      hasHypotension: false,
      hasMuscleCramps: false,
      hasClotting: false,
      hasFirstUseSyndrome: false,
      hasAccessBleeding: false,
      hasConsultDpjp: false,
      underUfTolerated: false,
      nurseInCharge: pelaksanaName,
      vascularAccessNurse: karuName,
      poin3_6Completed: true,
      verificationStatus: 'terverifikasi' as const,
      verifiedBy: 'Ns. Haikal',
      verifiedByRole: 'PJ Shift',
      verifiedAt: verifTime,
      nurseNotes: 'HD lancar',
      updatedAt: '2026-10-21T04:00:00.000Z'
    }
  ];

  const liveKaru = resolveLiveStaffVerifiedSnapshots({
    nurseName: karuName,
    userRole: 'kepala_ruangan',
    sessions,
    overrideManagedPatients: [],
    overridePatientStatuses: {},
    overrideFacilityStatuses: { '1.1': false, '1.2': false, '1.3': false },
    overridePerPatientRecords: {}
  });

  const recapKaru = buildStaffMonthlyRecap({
    nurseName: karuName,
    userRole: 'kepala_ruangan',
    targetMonth: 10,
    targetYear: 2026,
    liveVerificationOverride: liveKaru,
    storedSnapshotsOverride: {}
  });

  assert.equal(recapKaru.verifiedDaysCount, 0);
  assert.equal(recapKaru.totalVerifiedPatientsInMonth, 0);
  assert.equal(recapKaru.itemStats['1.1'].maxScore, 0); // Not penalized on Bagian I
  assert.equal(recapKaru.itemStats['3.1'].maxScore, 0); // Not penalized on other patient items
  assert.equal(recapKaru.itemStats['3.6'].totalScore, 1);
  assert.equal(recapKaru.itemStats['3.6'].maxScore, 1);
  assert.equal(recapKaru.itemStats['3.6'].pct, 100);
  assert.equal(recapKaru.logbook.dailyScores?.['3.6']?.[20], 1); // Day 21 (index 20)
  assert.equal(recapKaru.logbook.dailyScores?.['1.1']?.[20], null);
  assert.equal(recapKaru.grandTotalScore, 1);
  assert.equal(recapKaru.grandMaxScore, 1);
  assert.equal(recapKaru.overallCompliancePct, 100);
});

test('buildAllStaffMonthlyRecap aggregates unit overview while individual nurse recaps stay strictly isolated', () => {
  const masterNurses = [
    {
      id: 'nurse-pelaksana-1',
      name: 'Ns. Siti Rahma, S.Kep',
      nip: '199001012015012001',
      role: 'perawat_pelaksana',
      systemAccess: 'perawat_pelaksana',
      accountStatus: 'aktif'
    },
    {
      id: 'nurse-pelaksana-2',
      name: 'Ns. Budi Santoso, S.Kep',
      nip: '199202022016021002',
      role: 'perawat_pelaksana',
      systemAccess: 'perawat_pelaksana',
      accountStatus: 'aktif'
    },
    {
      id: 'nurse-pj',
      name: 'Ns. Haikal Malilang, S.Kep',
      nip: '198803032014031003',
      role: 'pj_shift',
      systemAccess: 'pj_shift',
      accountStatus: 'aktif'
    }
  ] as unknown as MasterNurse[];

  const shiftInfo = {
    hospitalName: 'RS Happy Land Medical Centre',
    unitName: 'Unit Hemodialisis',
    date: 'Kamis, 20 Oktober 2026',
    shift: 'Pagi',
    pjShift: 'Ns. Haikal Malilang, S.Kep'
  } as unknown as ShiftInfo;

  const sessions = [
    {
      id: 'sess-siti-1',
      patientName: 'Ny. Aminah',
      medicalRecordNumber: 'RM-101',
      bedNumber: '01',
      nurseInCharge: 'Ns. Siti Rahma, S.Kep',
      vascularAccessNurse: 'Ns. Siti Rahma, S.Kep',
      shift: 'Pagi',
      sessionStatus: 'selesai',
      verificationStatus: 'terverifikasi',
      verifiedBy: 'Ns. Haikal Malilang, S.Kep',
      verifiedByRole: 'PJ Shift',
      verifiedAt: '2026-10-20T13:00:00.000Z',
      nurseNotes: 'SPO Bagian I-VI lengkap',
      updatedAt: '2026-10-20T13:00:00.000Z'
    }
  ] as unknown as PatientHDSession[];

  const unitOverview = buildAllStaffMonthlyRecap({
    masterNurses,
    shiftInfo,
    sessions,
    targetMonth: 10,
    targetYear: 2026
  });

  assert.equal(unitOverview.totalActiveNurses, 3);
  assert.equal(unitOverview.staffSummaries.length, 3);

  const sitiSummary = unitOverview.staffSummaries.find((s) => s.nurseName === 'Ns. Siti Rahma, S.Kep');
  const budiSummary = unitOverview.staffSummaries.find((s) => s.nurseName === 'Ns. Budi Santoso, S.Kep');

  assert.ok(sitiSummary);
  assert.ok(budiSummary);

  // Siti has 1 verified patient, Budi has 0
  assert.equal(sitiSummary.totalVerifiedPatients, 1);
  assert.equal(sitiSummary.verifiedDaysCount, 1);
  assert.equal(budiSummary.totalVerifiedPatients, 0);
  assert.equal(budiSummary.verifiedDaysCount, 0);

  // Siti's individual recap contains only her data
  assert.equal(sitiSummary.recap.totalVerifiedPatientsInMonth, 1);
  assert.equal(sitiSummary.recap.logbook.nurseName, 'Ns. Siti Rahma, S.Kep');

  // Budi's individual recap does not bleed Siti's data
  assert.equal(budiSummary.recap.totalVerifiedPatientsInMonth, 0);
  assert.equal(budiSummary.recap.logbook.nurseName, 'Ns. Budi Santoso, S.Kep');
});

test('AKSESING (POIN 3.6): 2 own managed patients + 1 cross-nurse patient yields score 3 (2+1) on daily matrix and monthly recap', () => {
  const nurseA = 'Ns. Ani, S.Kep';
  const nurseB = 'Ns. Bimo, S.Kep';
  const verifTime = 'Kamis, 29 Oktober 2026, 16:30 WIB';

  // Nurse A manages 2 patients (P1 & P2). Nurse A performs vascular access on both.
  const nurseAPatients = [
    { id: 'pat-1', bedNumber: 'Bed 01', patientName: 'Pasien 1', medicalRecord: '8801' },
    { id: 'pat-2', bedNumber: 'Bed 02', patientName: 'Pasien 2', medicalRecord: '8802' }
  ];

  // Nurse B manages 1 patient (P3), but Nurse A performed the vascular access.
  const nurseBPatients = [
    { id: 'pat-3', bedNumber: 'Bed 03', patientName: 'Pasien 3', medicalRecord: '8803' }
  ];

  const nurseAClinicalDetails = {
    'pat-1': {
      poin3_6: {
        cimino: 'AVF Dextra',
        cdl: '',
        femoral: '',
        ciminoAktif: true,
        cdlAktif: false,
        femoralAktif: false,
        vascularAccessNurse: nurseA
      }
    },
    'pat-2': {
      poin3_6: {
        cimino: 'AVF Sinistra',
        cdl: '',
        femoral: '',
        ciminoAktif: true,
        cdlAktif: false,
        femoralAktif: false,
        vascularAccessNurse: nurseA
      }
    }
  };

  const nurseBClinicalDetails = {
    'pat-3': {
      poin3_6: {
        cimino: 'AVF Femoral',
        cdl: '',
        femoral: '',
        ciminoAktif: true,
        cdlAktif: false,
        femoralAktif: false,
        vascularAccessNurse: nurseA
      }
    }
  };

  const verifiedRecords = {
    [buildPatientVerificationKey(nurseA, 'Bed 01', '8801')]: {
      status: 'terverifikasi',
      verifiedAt: verifTime,
      verifiedBy: 'Ns. Haikal',
      verifiedByRole: 'PJ Shift'
    },
    [buildPatientVerificationKey(nurseA, 'Bed 02', '8802')]: {
      status: 'terverifikasi',
      verifiedAt: verifTime,
      verifiedBy: 'Ns. Haikal',
      verifiedByRole: 'PJ Shift'
    },
    [buildPatientVerificationKey(nurseB, 'Bed 03', '8803')]: {
      status: 'terverifikasi',
      verifiedAt: verifTime,
      verifiedBy: 'Ns. Haikal',
      verifiedByRole: 'PJ Shift'
    }
  };

  const patStatusesA: Record<string, Record<string, boolean>> = {
    'pat-1': { '3.6': true },
    'pat-2': { '3.6': true }
  };
  const patStatusesB: Record<string, Record<string, boolean>> = {
    'pat-3': { '3.6': true }
  };

  const cloudLogbooks: NurseLogbookCloudData[] = [
    {
      nurseName: nurseA,
      managedPatients: nurseAPatients,
      patientStatuses: patStatusesA,
      clinicalDetails: nurseAClinicalDetails,
      facilityStatuses: { '1.1': true, '1.2': true, '1.3': true },
      dateIso: '2026-10-29'
    },
    {
      nurseName: nurseB,
      managedPatients: nurseBPatients,
      patientStatuses: patStatusesB,
      clinicalDetails: nurseBClinicalDetails,
      facilityStatuses: { '1.1': true, '1.2': true, '1.3': true },
      dateIso: '2026-10-29'
    }
  ];

  const liveA = resolveLiveStaffVerifiedSnapshots({
    nurseName: nurseA,
    userRole: 'perawat_pelaksana',
    cloudNurseLogbooks: cloudLogbooks,
    overrideManagedPatients: nurseAPatients,
    overrideClinicalDetails: nurseAClinicalDetails,
    overrideFacilityStatuses: { '1.1': true, '1.2': true, '1.3': true },
    overridePerPatientRecords: verifiedRecords
  });

  const recapA = buildStaffMonthlyRecap({
    nurseName: nurseA,
    userRole: 'perawat_pelaksana',
    targetMonth: 10,
    targetYear: 2026,
    liveVerificationOverride: liveA,
    storedSnapshotsOverride: {}
  });

  // Nurse A's own managed patients count is 2
  assert.equal(recapA.totalVerifiedPatientsInMonth, 2);

  // Daily cell on Day 29 for Poin 3.6 is 3 (2 own + 1 cross)
  assert.equal(recapA.logbook.dailyScores?.['3.6']?.[28], 3);
  assert.equal(recapA.logbook.dailyItemMaxScores?.['3.6']?.[28], 3);

  // Monthly Summary for Poin 3.6 is Total: 3, Max: 3, 100%
  assert.equal(recapA.itemStats['3.6'].totalScore, 3);
  assert.equal(recapA.itemStats['3.6'].maxScore, 3);
  assert.equal(recapA.itemStats['3.6'].pct, 100);
});



