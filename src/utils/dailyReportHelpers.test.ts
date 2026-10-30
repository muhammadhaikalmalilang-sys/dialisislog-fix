import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_KEPALA_RUANGAN_NAME,
  aggregateShiftVerifiedLogbooks,
  calculateNursePatientRatio,
  detectActiveLogbookShiftForDate
} from './dailyReportHelpers.ts';
import { sampleBenchmarkNurses, sampleBenchmarkPatients } from '../data/mockMasterData.ts';
import { initialShiftInfo } from '../data/mockShiftData.ts';
import { PatientHDSession } from '../types/dialysis.ts';
import { LogbookVerificationRegistryEntry } from './nurseVerificationHelpers.ts';
import { ensureFullBagianData } from './logbookStandards.ts';

function makeSession(overrides: Partial<PatientHDSession> & { id: string; patientName: string; bedNumber: string }): PatientHDSession {
  return ensureFullBagianData({
    date: 'Rabu, 28 Oktober 2026',
    sessionDate: '2026-10-28',
    shift: 'Siang',
    medicalRecordNumber: `RM-${overrides.id}`,
    age: 52,
    gender: 'L',
    status: 'rajal',
    category: 'reguler',
    sessionStatus: 'selesai',
    isCito: false,
    vascularAccess: 'av_fistula',
    accessSite: 'AVF Sinistra',
    dialyzerModel: 'SAS HF 18',
    isReuse: false,
    dryWeight: 60,
    preWeight: 62.5,
    postWeight: 60,
    targetUf: 2500,
    achievedUf: 2500,
    durationPrescribed: 4.5,
    durationActual: 4.5,
    bloodFlowQb: 220,
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
    nurseInCharge: 'AYU WULANDARI',
    isVerifiedByPj: true,
    verificationStatus: 'terverifikasi',
    updatedAt: '2026-10-28T14:00:00.000Z',
    ...overrides
  });
}

test('calculateNursePatientRatio formats exact and fractional nurse-to-patient ratios accurately', () => {
  assert.equal(calculateNursePatientRatio(0, 0), '0 : 0');
  assert.equal(calculateNursePatientRatio(9, 27), '1 : 3 (9 Perawat : 27 Pasien)');
  assert.equal(calculateNursePatientRatio(9, 24), '1 : 2.7 (9 Perawat : 24 Pasien)');
  assert.equal(calculateNursePatientRatio(2, 7), '1 : 3.5 (2 Perawat : 7 Pasien)');
});

test('28 Oktober 2026 Shift Siang: 9 out of 17 nurses (Pelaksana, PJ Shift, Kepala Ruang) inputting verified logbooks yields "9 Orang" and accurate patient totals & ratio', () => {
  assert.equal(sampleBenchmarkNurses.length, 17);

  // Select 9 distinct nurses across all 3 roles (1 Kepala Ruang, 2 PJ Shift, 6 Pelaksana)
  const nineNurses = [
    'TWIS FERTILIANTI PW', // Kepala Ruang
    'APRILLIA DWI N', // PJ Shift
    'NOVIALITA ARYADI', // PJ Shift
    'AYU WULANDARI', // Pelaksana
    'FRANSISCA RANI L', // Pelaksana
    'NITA RESTIANA P', // Pelaksana
    'RINI WULANDARI', // Pelaksana
    'YUMIATI', // Pelaksana
    'AYU PUSPITA' // Pelaksana
  ];

  // Each of the 9 nurses inputs 3 verified patients for Shift Siang on 28 Oktober 2026 (27 patients total)
  const verifiedSiangSessions: PatientHDSession[] = nineNurses.flatMap((nurseName, nIdx) =>
    [1, 2, 3].map((pIdx) => {
      const seq = nIdx * 3 + pIdx;
      return makeSession({
        id: `siang-${seq}`,
        patientName: `PASIEN SIANG ${seq}`,
        medicalRecordNumber: `460${String(seq).padStart(3, '0')}`,
        bedNumber: `BED A${String((seq % 12) + 1).padStart(2, '0')}`,
        nurseInCharge: nurseName,
        shift: 'Siang',
        sessionDate: '2026-10-28',
        date: 'Rabu, 28 Oktober 2026',
        isVerifiedByPj: true,
        isVerifiedByKepalaRuang:
          nurseName === 'TWIS FERTILIANTI PW' ||
          nurseName === 'APRILLIA DWI N' ||
          nurseName === 'NOVIALITA ARYADI',
        verificationStatus: 'terverifikasi'
      });
    })
  );

  // Add noise that MUST be excluded:
  // 1) Unverified draft on 2026-10-28 Shift Siang by a 10th nurse (RIZKY WAHYU A)
  // 2) Verified session on 2026-10-28 Shift Pagi by DEA IKA P
  // 3) Verified session on 2026-10-27 Shift Siang by Y BRILLISANTO
  const noiseSessions: PatientHDSession[] = [
    makeSession({
      id: 'unverified-siang',
      patientName: 'PASIEN BELUM VERIF',
      medicalRecordNumber: '499001',
      bedNumber: 'BED B01',
      nurseInCharge: 'RIZKY WAHYU A',
      shift: 'Siang',
      sessionDate: '2026-10-28',
      date: 'Rabu, 28 Oktober 2026',
      isVerifiedByPj: false,
      isVerifiedByKepalaRuang: false,
      verificationStatus: 'diajukan'
    }),
    makeSession({
      id: 'verified-pagi',
      patientName: 'PASIEN SHIFT PAGI',
      medicalRecordNumber: '499002',
      bedNumber: 'BED B02',
      nurseInCharge: 'DEA IKA P',
      shift: 'Pagi',
      sessionDate: '2026-10-28',
      date: 'Rabu, 28 Oktober 2026',
      isVerifiedByPj: true,
      verificationStatus: 'terverifikasi'
    }),
    makeSession({
      id: 'verified-yesterday',
      patientName: 'PASIEN KEMARIN',
      medicalRecordNumber: '499003',
      bedNumber: 'BED B03',
      nurseInCharge: 'Y BRILLISANTO',
      shift: 'Siang',
      sessionDate: '2026-10-27',
      date: 'Selasa, 27 Oktober 2026',
      isVerifiedByPj: true,
      verificationStatus: 'terverifikasi'
    })
  ];

  const summary = aggregateShiftVerifiedLogbooks({
    sessions: [...verifiedSiangSessions, ...noiseSessions],
    registryEntries: [],
    masterNurses: sampleBenchmarkNurses,
    masterPatients: sampleBenchmarkPatients,
    activeDateLabel: 'Rabu, 28 Oktober 2026',
    activeShift: 'Siang',
    loggedInUserName: 'APRILLIA DWI N',
    fallbackShiftInfo: initialShiftInfo
  });

  assert.equal(summary.activeDateFormatted, 'Rabu, 28 Oktober 2026');
  assert.equal(summary.activeShift, 'Siang');
  assert.equal(summary.shiftHours, 'Siang, jam 14.00 - 21.00 WIB');
  assert.equal(summary.pjShiftName, 'APRILLIA DWI N');
  assert.equal(summary.kepalaRuanganName, DEFAULT_KEPALA_RUANGAN_NAME);
  assert.equal(summary.jumlahPerawatDinas, 9);
  assert.equal(summary.jumlahPerawatDinasLabel, '9 Orang');
  assert.equal(summary.totalPasienDilayani, 27);
  assert.equal(summary.census.totalPasienDilayani, 27);
  assert.equal(summary.rasioPerawatPasien, '1 : 3 (9 Perawat : 27 Pasien)');
});

test('Account owner name (nama pemilik akun) populates Penanggung Jawab (PJ) Shift while Kepala Ruangan HD stays TWIS FERTILIANTI PW', () => {
  const summaryForPj = aggregateShiftVerifiedLogbooks({
    sessions: [],
    registryEntries: [],
    masterNurses: sampleBenchmarkNurses,
    masterPatients: sampleBenchmarkPatients,
    activeDateLabel: 'Rabu, 28 Oktober 2026',
    activeShift: 'Pagi',
    loggedInUserName: 'M NOR KHOIRUDIN',
    fallbackShiftInfo: initialShiftInfo
  });

  assert.equal(summaryForPj.pjShiftName, 'M NOR KHOIRUDIN');
  assert.equal(summaryForPj.kepalaRuanganName, 'TWIS FERTILIANTI PW');
  assert.equal(summaryForPj.jumlahPerawatDinasLabel, '0 Orang');
  assert.equal(summaryForPj.totalPasienDilayani, 0);
  assert.equal(summaryForPj.rasioPerawatPasien, '0 : 0');

  const summaryForKaru = aggregateShiftVerifiedLogbooks({
    sessions: [],
    registryEntries: [],
    masterNurses: sampleBenchmarkNurses,
    masterPatients: sampleBenchmarkPatients,
    activeDateLabel: 'Rabu, 28 Oktober 2026',
    activeShift: 'Siang',
    loggedInUserName: 'TWIS FERTILIANTI PW',
    fallbackShiftInfo: initialShiftInfo
  });

  assert.equal(summaryForKaru.pjShiftName, 'TWIS FERTILIANTI PW');
  assert.equal(summaryForKaru.kepalaRuanganName, 'TWIS FERTILIANTI PW');
});

test('Reconciles verified registry entries across accounts without double counting existing sessions', () => {
  const sessions: PatientHDSession[] = [
    makeSession({
      id: 's1',
      patientName: 'BAGUS SETIAWAN,A,TN',
      medicalRecordNumber: '452126',
      bedNumber: 'BED A01',
      nurseInCharge: 'AYU WULANDARI',
      shift: 'Siang',
      sessionDate: '2026-10-28',
      isVerifiedByPj: true,
      verificationStatus: 'terverifikasi'
    })
  ];

  const registryEntries: LogbookVerificationRegistryEntry[] = [
    {
      id: 'reg-ayu',
      submittedNurseName: 'AYU WULANDARI',
      submittedNurseRole: 'perawat_pelaksana',
      targetRole: 'pj_shift',
      targetVerifierName: 'APRILLIA DWI N',
      status: 'terverifikasi',
      shift: 'Siang',
      dateKey: '2026-10-28',
      dateLabel: 'Rabu, 28 Oktober 2026',
      patients: [
        { bedNumber: 'BED A01', patientName: 'BAGUS SETIAWAN,A,TN', medicalRecord: '452126' }
      ]
    },
    {
      id: 'reg-april',
      submittedNurseName: 'APRILLIA DWI N',
      submittedNurseRole: 'pj_shift',
      targetRole: 'kepala_ruangan',
      targetVerifierName: 'TWIS FERTILIANTI PW',
      status: 'terverifikasi',
      shift: 'Siang',
      dateKey: '2026-10-28',
      dateLabel: 'Rabu, 28 Oktober 2026',
      patients: [
        { bedNumber: 'BED A02', patientName: 'BAMBANG WIDAYANTO,TN', medicalRecord: '452127' },
        { bedNumber: 'BED A03', patientName: 'DEWIANA, NY', medicalRecord: '452129' }
      ]
    }
  ];

  const summary = aggregateShiftVerifiedLogbooks({
    sessions,
    registryEntries,
    masterNurses: sampleBenchmarkNurses,
    masterPatients: sampleBenchmarkPatients,
    activeDateLabel: 'Rabu, 28 Oktober 2026',
    activeShift: 'Siang',
    loggedInUserName: 'APRILLIA DWI N',
    fallbackShiftInfo: initialShiftInfo
  });

  assert.equal(summary.jumlahPerawatDinas, 2);
  assert.equal(summary.jumlahPerawatDinasLabel, '2 Orang');
  assert.equal(summary.totalPasienDilayani, 3);
  assert.equal(summary.rasioPerawatPasien, '1 : 1.5 (2 Perawat : 3 Pasien)');
});

test('detectActiveLogbookShiftForDate auto-selects Siang when verified logbooks exist on Siang', () => {
  const detected = detectActiveLogbookShiftForDate({
    activeDateLabel: 'Rabu, 28 Oktober 2026',
    sessions: [
      makeSession({
        id: 'siang-1',
        patientName: 'PASIEN SIANG',
        bedNumber: 'BED A01',
        shift: 'Siang',
        sessionDate: '2026-10-28',
        isVerifiedByPj: true,
        verificationStatus: 'terverifikasi'
      })
    ],
    registryEntries: [],
    lastSelectedLogbookShift: null,
    loggedInUserShift: 'Pagi'
  });

  assert.equal(detected, 'Siang');
});
