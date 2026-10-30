import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDashboardAnalytics } from './dashboardAnalyticsHelpers.ts';
import { MasterNurse, PatientHDSession, ShiftInfo } from '../types/dialysis.ts';

const mockShiftInfo: ShiftInfo = {
  hospitalName: 'RS Happy Land Medical Centre Yogyakarta',
  unitName: 'Unit Dialisis',
  date: 'Minggu, 25 Oktober 2026',
  shift: 'Pagi',
  shiftHours: 'Pagi, jam 07.00 - 14.00 WIB',
  pjShift: 'Ns. Budi Santoso, S.Kep',
  pjShiftBerikutnya: 'Ns. Citra Dewi, S.Kep',
  kepalaRuangan: 'Ns. Hendra Wijaya, S.Kep',
  dokterDpjp: 'dr. Raden Heru Prasanto, Sp.PD-KGH',
  dokterJaga: 'dr. Paramitha',
  totalPerawatDinas: 4,
  detailPerawat: '1 PJ Shift + 3 Perawat Pelaksana',
  perawatRatio: '1 : 3',
  tenagaPendukung: '1 Teknisi RO'
};

const mockNurses: MasterNurse[] = [
  {
    id: 'n-1',
    name: 'Ns. Rina Kartika, S.Kep',
    nip: '19920101',
    role: 'perawat_pelaksana',
    pernefriCertified: true,
    isOnDutyToday: true,
    shiftAssigned: 'Pagi',
    systemAccess: 'perawat_pelaksana'
  },
  {
    id: 'n-2',
    name: 'Ns. Andi Pratama, S.Kep',
    nip: '19930202',
    role: 'perawat_pelaksana',
    pernefriCertified: true,
    isOnDutyToday: true,
    shiftAssigned: 'Siang',
    systemAccess: 'perawat_pelaksana'
  },
  {
    id: 'n-3',
    name: 'Ns. Budi Santoso, S.Kep',
    nip: '19890303',
    role: 'pj_shift',
    pernefriCertified: true,
    isOnDutyToday: true,
    shiftAssigned: 'Pagi',
    systemAccess: 'pj_shift'
  }
];

function createSession(overrides: Partial<PatientHDSession>): PatientHDSession {
  return {
    id: 'sess-1',
    bedNumber: 'Bed 01',
    patientName: 'Pasien A',
    medicalRecordNumber: 'RM001',
    age: 50,
    gender: 'L',
    status: 'rajal',
    category: 'reguler',
    sessionStatus: 'selesai',
    isCito: false,
    vascularAccess: 'av_fistula',
    dialyzerModel: 'SAS HF 18',
    isReuse: false,
    dryWeight: 60,
    preWeight: 62,
    targetUf: 2000,
    achievedUf: 2000,
    durationPrescribed: 4.5,
    durationActual: 4.5,
    preBp: '140/80',
    postBp: '125/80',
    hasHypotension: false,
    hasMuscleCramps: false,
    hasClotting: false,
    hasFirstUseSyndrome: false,
    hasAccessBleeding: false,
    hasConsultDpjp: false,
    underUfTolerated: false,
    nurseInCharge: 'Ns. Rina Kartika, S.Kep',
    updatedAt: '2026-10-25T08:00:00.000Z',
    ...overrides
  };
}

test('buildDashboardAnalytics generates 12-month series (Jan-Des) focused on Oktober', () => {
  const result = buildDashboardAnalytics({
    currentStaffName: 'Ns. Rina Kartika, S.Kep',
    currentStaffRole: 'perawat_pelaksana',
    masterNurses: mockNurses,
    sessions: [],
    shiftInfo: mockShiftInfo
  });

  assert.equal(result.runningMonth, 10);
  assert.equal(result.runningMonthLabel, 'Oktober');
  assert.equal(result.selectedMonth, 10);
  assert.equal(result.yearlySeries.length, 12);
  assert.equal(result.yearlySeries[0].shortLabel, 'Jan');
  assert.equal(result.yearlySeries[9].shortLabel, 'Okt');
  assert.equal(result.yearlySeries[9].isCurrentRunningMonth, true);
  assert.equal(result.yearlySeries[11].shortLabel, 'Des');
  assert.equal(result.daysInSelectedMonth, 31);
  assert.equal(result.dailySeries.length, 31);
});

test('buildDashboardAnalytics separates personal managed sessions vs unit-wide HD sessions and pending queue', () => {
  const sessions: PatientHDSession[] = [
    // Nurse Rina: 2 verified in October (same unique patient on 2 dates -> Wait: combinedPatients deduplicates by RM in live single-day list unless distinct RMs; let's test 2 distinct RMs on Oct 25)
    createSession({
      id: 's-1',
      bedNumber: 'Bed 01',
      patientName: 'Tn. Ahmad',
      medicalRecordNumber: 'RM-101',
      nurseInCharge: 'Ns. Rina Kartika, S.Kep',
      isVerifiedByPj: true,
      verificationStatus: 'terverifikasi',
      verifiedBy: 'Ns. Budi Santoso, S.Kep',
      verifiedByRole: 'PJ Shift',
      verifiedAt: '25 Oktober 2026, 13:30 WIB'
    }),
    createSession({
      id: 's-2',
      bedNumber: 'Bed 02',
      patientName: 'Ny. Siti',
      medicalRecordNumber: 'RM-102',
      nurseInCharge: 'Ns. Rina Kartika, S.Kep',
      isVerifiedByPj: true,
      verificationStatus: 'terverifikasi',
      verifiedBy: 'Ns. Budi Santoso, S.Kep',
      verifiedByRole: 'PJ Shift',
      verifiedAt: '25 Oktober 2026, 13:35 WIB'
    }),
    // Nurse Rina: 1 pending unverified session
    createSession({
      id: 's-3',
      bedNumber: 'Bed 03',
      patientName: 'Tn. Dedi',
      medicalRecordNumber: 'RM-103',
      nurseInCharge: 'Ns. Rina Kartika, S.Kep',
      isVerifiedByPj: false,
      verificationStatus: 'diajukan'
    }),
    // Nurse Andi (Shift Siang): 2 verified sessions in October
    createSession({
      id: 's-4',
      bedNumber: 'Bed 04',
      patientName: 'Tn. Eko',
      medicalRecordNumber: 'RM-201',
      nurseInCharge: 'Ns. Andi Pratama, S.Kep',
      isVerifiedByPj: true,
      verificationStatus: 'terverifikasi',
      verifiedBy: 'Ns. Budi Santoso, S.Kep',
      verifiedByRole: 'PJ Shift',
      verifiedAt: '25 Oktober 2026, 20:15 WIB'
    }),
    // Nurse Andi: 1 verified session in September 2026
    createSession({
      id: 's-5',
      bedNumber: 'Bed 05',
      patientName: 'Ny. Wati',
      medicalRecordNumber: 'RM-202',
      nurseInCharge: 'Ns. Andi Pratama, S.Kep',
      isVerifiedByPj: true,
      verificationStatus: 'terverifikasi',
      verifiedBy: 'Ns. Budi Santoso, S.Kep',
      verifiedByRole: 'PJ Shift',
      verifiedAt: '14 September 2026, 20:10 WIB'
    })
  ];

  const octSummary = buildDashboardAnalytics({
    currentStaffName: 'Ns. Rina Kartika, S.Kep',
    currentStaffRole: 'perawat_pelaksana',
    masterNurses: mockNurses,
    sessions,
    shiftInfo: mockShiftInfo
  });

  // October personal (Rina): 2 verified, 1 pending
  assert.equal(octSummary.personalMonthlySessions, 2);
  assert.equal(octSummary.personalMonthlyUniquePatients, 2);
  assert.equal(octSummary.personalPendingSessions, 1);

  // October unit (Rina 2 + Andi 1): 3 verified, 1 pending
  assert.equal(octSummary.unitMonthlySessions, 3);
  assert.equal(octSummary.unitMonthlyUniquePatients, 3);
  assert.equal(octSummary.unitPendingSessions, 1);
  assert.equal(octSummary.unitContributingStaffCount, 2);

  // Operational counters on Oct 25: 4 active-day patients (Rina 3 + Andi 1), 4 completed/selesai, 1 pending verification
  assert.equal(octSummary.todayTotalPatients, 4);
  assert.equal(octSummary.todayCompletedDialysis, 4);
  assert.equal(octSummary.dialysisPendingVerificationCount, 1);
  assert.equal(octSummary.logbookPendingVerificationCount, 0);

  // Yearly series checks: September (index 8) = 1 unit session, October (index 9) = 3 unit sessions
  assert.equal(octSummary.yearlySeries[8].unitSessionsCount, 1);
  assert.equal(octSummary.yearlySeries[9].unitSessionsCount, 3);
  assert.equal(octSummary.yearlyTotalUnitSessions, 4);
  assert.equal(octSummary.yearlyTotalPersonalSessions, 2);
});
