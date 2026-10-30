import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeNurseName,
  isMatchingNurse,
  isSameBed,
  extractBedCode,
  buildPatientVerificationKey,
  isSessionManagedByNurse,
  filterSessionsForNurseRiwayat,
  isSessionVerifiedByPj,
  filterVerificationQueueForUser,
  resolveLogbookLockState,
  canVerifierRoleEditSubmitted,
  isSamePatientIdentity,
  collectOccupiedLogbookAssets
} from './nurseVerificationHelpers.ts';
import { PatientHDSession, MasterNurse } from '../types/dialysis.ts';

const mockMasterNurses: MasterNurse[] = [
  {
    id: 'nurse-01',
    name: 'M. Haikal Malilang, A.Md. Kep.',
    nip: '19920412',
    role: 'pj_shift',
    pernefriCertified: true,
    isOnDutyToday: true
  },
  {
    id: 'nurse-02',
    name: 'Twis Fertilianti PW., S.Kep., Ns.',
    nip: '19870315',
    role: 'kepala_ruangan',
    pernefriCertified: true,
    isOnDutyToday: true
  },
  {
    id: 'nurse-04',
    name: 'Ners Rina S.Kep',
    nip: '19950110',
    role: 'perawat_pelaksana',
    pernefriCertified: true,
    isOnDutyToday: true
  },
  {
    id: 'nurse-06',
    name: 'Ners Dewi A.Md.Kep',
    nip: '19940815',
    role: 'perawat_pelaksana',
    pernefriCertified: true,
    isOnDutyToday: true
  }
];

const sessionPelaksanaVerifiedByPj: PatientHDSession = {
  id: 'session-pasien-a',
  bedNumber: 'Bed 01',
  patientName: 'Ny. Siti Aminah',
  medicalRecordNumber: '452101',
  age: 56,
  gender: 'P',
  status: 'rajal',
  category: 'reguler',
  sessionStatus: 'selesai',
  isCito: false,
  vascularAccess: 'av_fistula',
  dialyzerModel: 'SAS HF 18',
  isReuse: false,
  dryWeight: 53.0,
  preWeight: 55.4,
  postWeight: 53.0,
  targetUf: 2400,
  achievedUf: 2400,
  durationPrescribed: 4.5,
  durationActual: 4.5,
  preBp: '140/90',
  postBp: '120/80',
  hasHypotension: false,
  hasMuscleCramps: false,
  hasClotting: false,
  hasFirstUseSyndrome: false,
  hasAccessBleeding: false,
  hasConsultDpjp: false,
  underUfTolerated: false,
  nurseInCharge: 'Ners Rina S.Kep',
  isVerifiedByPj: true,
  verificationStatus: 'terverifikasi',
  verifiedAt: 'Selasa, 20 Oktober 2026, 13:45 WIB',
  verifiedBy: 'M. Haikal Malilang, A.Md. Kep.',
  verifiedByRole: 'PJ Shift',
  updatedAt: '2026-10-20T13:45:00Z'
};

const sessionPelaksanaPending: PatientHDSession = {
  ...sessionPelaksanaVerifiedByPj,
  id: 'session-pasien-b',
  bedNumber: 'Bed 04',
  patientName: 'Tn. Bambang Haryono',
  medicalRecordNumber: '452104',
  nurseInCharge: 'Ners Dewi A.Md.Kep',
  isVerifiedByPj: false,
  verificationStatus: 'diajukan',
  verifiedAt: undefined,
  verifiedBy: undefined,
  verifiedByRole: undefined
};

test('normalizeNurseName and isMatchingNurse match across honorific variations', () => {
  assert.equal(normalizeNurseName('Ners Rina S.Kep'), 'rina');
  assert.equal(normalizeNurseName('Ns. Rina Kartika, S.Kep.'), 'rina kartika');
  assert.equal(normalizeNurseName('M. Haikal Malilang, A.Md. Kep.'), 'm haikal malilang');
  assert.ok(isMatchingNurse('Ners Rina S.Kep', 'Ns. Rina Kartika, S.Kep.'));
  assert.ok(!isMatchingNurse('Ners Rina S.Kep', 'Ners Dewi A.Md.Kep'));
});

test('extractBedCode and isSameBed prevent Bed 01 vs Bed 10 and zone prefix (BED A01 vs BED B01 vs BED ISOLASI 01) collisions', () => {
  assert.equal(extractBedCode('Bed 01'), 'bed_1');
  assert.equal(extractBedCode('Bed 1'), 'bed_1');
  assert.equal(extractBedCode('Bed 10'), 'bed_10');
  assert.equal(extractBedCode('BED A01'), 'bed_a_1');
  assert.equal(extractBedCode('Bed A1'), 'bed_a_1');
  assert.equal(extractBedCode('BED A12'), 'bed_a_12');
  assert.equal(extractBedCode('BED B01'), 'bed_b_1');
  assert.equal(extractBedCode('BED C01'), 'bed_c_1');
  assert.equal(extractBedCode('BED D01'), 'bed_d_1');
  assert.equal(extractBedCode('BED E01'), 'bed_e_1');
  assert.equal(extractBedCode('BED F01'), 'bed_f_1');
  assert.equal(extractBedCode('BED ISOLASI 01'), 'bed_isolasi_1');
  assert.equal(extractBedCode('BED ISOLASI 04'), 'bed_isolasi_4');

  assert.ok(isSameBed('Bed 01', 'Bed 1'));
  assert.ok(isSameBed('BED A01', 'Bed A1'));
  assert.ok(!isSameBed('Bed 01', 'Bed 10'));
  assert.ok(!isSameBed('BED A01', 'BED A10'));
  assert.ok(!isSameBed('BED A01', 'BED B01'));
  assert.ok(!isSameBed('BED A01', 'BED ISOLASI 01'));

  const keyA = buildPatientVerificationKey('Ners Rina S.Kep', 'BED A01', '452101');
  const keyB = buildPatientVerificationKey('Ners Rina S.Kep', 'BED B01', '452101');
  const keyIso = buildPatientVerificationKey('Ners Rina S.Kep', 'BED ISOLASI 01', '452101');
  assert.notEqual(keyA, keyB);
  assert.notEqual(keyA, keyIso);
  assert.notEqual(keyB, keyIso);
});

test('isSessionManagedByNurse isolates patients strictly by managing nurse', () => {
  assert.ok(isSessionManagedByNurse(sessionPelaksanaVerifiedByPj, 'Ners Rina S.Kep'));
  assert.ok(!isSessionManagedByNurse(sessionPelaksanaVerifiedByPj, 'Ners Dewi A.Md.Kep'));
  assert.ok(isSessionManagedByNurse(sessionPelaksanaPending, 'Ners Dewi A.Md.Kep'));
});

test('Hak Akses 1 (Perawat Pelaksana): Riwayat displays personal managed patients AFTER verified by EITHER PJ Shift OR Kepala Ruang', () => {
  const sessionPelaksanaVerifiedByKaru: PatientHDSession = {
    ...sessionPelaksanaVerifiedByPj,
    id: 'session-pasien-a2',
    bedNumber: 'Bed 02',
    patientName: 'Tn. Sugiyanto',
    medicalRecordNumber: '452102',
    nurseInCharge: 'Ners Rina S.Kep',
    isVerifiedByPj: true,
    isVerifiedByKepalaRuang: true,
    verificationStatus: 'terverifikasi',
    verifiedAt: 'Selasa, 20 Oktober 2026, 14:10 WIB',
    verifiedBy: 'Twis Fertilianti PW., S.Kep., Ns.',
    verifiedByRole: 'Kepala Ruangan'
  };

  const allSessions = [
    sessionPelaksanaVerifiedByPj,
    sessionPelaksanaVerifiedByKaru,
    sessionPelaksanaPending
  ];

  // Ners Rina sees both her patients: one verified by PJ Shift, one verified by Kepala Ruang
  const rinaRiwayat = filterSessionsForNurseRiwayat(
    allSessions,
    'Ners Rina S.Kep',
    'perawat_pelaksana',
    'mine',
    mockMasterNurses
  );
  assert.equal(rinaRiwayat.visibleSessions.length, 2);
  assert.deepEqual(
    rinaRiwayat.visibleSessions.map((s) => s.id),
    ['session-pasien-a', 'session-pasien-a2']
  );
  assert.equal(rinaRiwayat.verifiedByPjCount, 1);
  assert.equal(rinaRiwayat.verifiedByKaruCount, 1);
  assert.equal(rinaRiwayat.unverifiedManagedCount, 0);

  // Ners Dewi (submitted to PJ Shift, not yet verified) sees 0 in Riwayat
  const dewiRiwayat = filterSessionsForNurseRiwayat(
    allSessions,
    'Ners Dewi A.Md.Kep',
    'perawat_pelaksana',
    'mine',
    mockMasterNurses
  );
  assert.equal(dewiRiwayat.visibleSessions.length, 0);
  assert.equal(dewiRiwayat.totalManagedByNurse, 1);
  assert.equal(dewiRiwayat.unverifiedManagedCount, 1);
});

test('Hak Akses 2 (PJ Shift): Riwayat displays personal managed patients verified by EITHER PJ Shift OR Kepala Ruang', () => {
  const pjPatientPending: PatientHDSession = {
    ...sessionPelaksanaVerifiedByPj,
    id: 'session-pj-pending',
    bedNumber: 'Bed 07',
    patientName: 'Ny. Maria Kristina',
    nurseInCharge: 'M. Haikal Malilang, A.Md. Kep.',
    isVerifiedByPj: false,
    isVerifiedByKepalaRuang: false,
    verificationStatus: 'diajukan',
    verifiedBy: undefined,
    verifiedByRole: undefined
  };

  const pjPatientVerifiedByKaru: PatientHDSession = {
    ...pjPatientPending,
    id: 'session-pj-verified-karu',
    bedNumber: 'Bed 08',
    patientName: 'Tn. Adji Tri Subarkah',
    isVerifiedByPj: true,
    isVerifiedByKepalaRuang: true,
    verificationStatus: 'terverifikasi',
    verifiedBy: 'Twis Fertilianti PW., S.Kep., Ns.',
    verifiedByRole: 'Kepala Ruangan'
  };

  const pjPatientVerifiedByOtherPj: PatientHDSession = {
    ...pjPatientPending,
    id: 'session-pj-verified-other-pj',
    bedNumber: 'Bed 10',
    patientName: 'Tn. Rahmat Hidayat',
    isVerifiedByPj: true,
    isVerifiedByKepalaRuang: false,
    verificationStatus: 'terverifikasi',
    verifiedBy: 'Aprillia Dwi N, S.Kep., Ns.',
    verifiedByRole: 'PJ Shift'
  };

  const sessions = [
    sessionPelaksanaVerifiedByPj,
    pjPatientPending,
    pjPatientVerifiedByKaru,
    pjPatientVerifiedByOtherPj
  ];

  const haikalRiwayat = filterSessionsForNurseRiwayat(
    sessions,
    'M. Haikal Malilang, A.Md. Kep.',
    'pj_shift',
    'mine',
    mockMasterNurses
  );

  // Both pjPatientVerifiedByKaru (verified by Kepala Ruang) and pjPatientVerifiedByOtherPj (verified by PJ Shift) appear in Riwayat
  assert.equal(haikalRiwayat.visibleSessions.length, 2);
  assert.deepEqual(
    haikalRiwayat.visibleSessions.map((s) => s.id),
    ['session-pj-verified-karu', 'session-pj-verified-other-pj']
  );
  assert.equal(haikalRiwayat.totalManagedByNurse, 3);
  assert.equal(haikalRiwayat.unverifiedManagedCount, 1);
});

test('Hak Akses 3 (Kepala Ruang): Riwayat displays Kepala Ruang own patients verified by EITHER PJ Shift OR Kepala Ruang', () => {
  const karuPatientUnverified: PatientHDSession = {
    ...sessionPelaksanaVerifiedByPj,
    id: 'karu-unverified',
    bedNumber: 'Bed 13',
    patientName: 'Tn. Gunawan Wibisono',
    nurseInCharge: 'Twis Fertilianti PW., S.Kep., Ns.',
    isVerifiedByPj: false,
    isVerifiedByKepalaRuang: false,
    verificationStatus: 'belum_diajukan',
    verifiedBy: undefined,
    verifiedByRole: undefined
  };

  const karuPatientVerifiedByPj: PatientHDSession = {
    ...karuPatientUnverified,
    id: 'karu-verified-by-pj',
    bedNumber: 'Bed 14',
    patientName: 'Ny. Sri Wahyuni',
    isVerifiedByPj: true,
    isVerifiedByKepalaRuang: false,
    verificationStatus: 'terverifikasi',
    verifiedBy: 'M. Haikal Malilang, A.Md. Kep.',
    verifiedByRole: 'PJ Shift'
  };

  const karuPatientVerifiedBySelf: PatientHDSession = {
    ...karuPatientUnverified,
    id: 'karu-verified-by-karu',
    bedNumber: 'Bed 15',
    patientName: 'Tn. Suryo Pranoto',
    isVerifiedByPj: true,
    isVerifiedByKepalaRuang: true,
    verificationStatus: 'terverifikasi',
    verifiedBy: 'Twis Fertilianti PW., S.Kep., Ns.',
    verifiedByRole: 'Kepala Ruangan'
  };

  const sessions = [
    sessionPelaksanaVerifiedByPj,
    karuPatientUnverified,
    karuPatientVerifiedByPj,
    karuPatientVerifiedBySelf
  ];

  const karuRiwayat = filterSessionsForNurseRiwayat(
    sessions,
    'Twis Fertilianti PW., S.Kep., Ns.',
    'kepala_ruangan',
    'mine',
    mockMasterNurses
  );

  assert.equal(karuRiwayat.visibleSessions.length, 2);
  assert.deepEqual(
    karuRiwayat.visibleSessions.map((s) => s.id),
    ['karu-verified-by-pj', 'karu-verified-by-karu']
  );
  assert.equal(karuRiwayat.verifiedByPjCount, 1);
  assert.equal(karuRiwayat.verifiedByKaruCount, 1);
  assert.equal(karuRiwayat.unverifiedManagedCount, 1);
});

test('Verifikasi Queue Isolation: PJ Shift & Kepala Ruang only see submissions strictly targeted to them (including PJ Shift -> PJ Shift Lainnya)', () => {
  const entries: Parameters<typeof filterVerificationQueueForUser>[0] = [
    // Unsubmitted draft -> hidden from everyone
    {
      id: 'draft-siti',
      submittedNurseName: 'Siti Rahayu, S.Kep., Ners',
      submittedNurseRole: 'perawat_pelaksana',
      targetRole: 'pj_shift',
      targetVerifierName: 'M. Haikal Malilang, A.Md. Kep.',
      status: 'belum_diajukan'
    },
    // Pelaksana Pagi -> PJ Shift Pagi (Haikal)
    {
      id: 'sub-dewi',
      submittedNurseName: 'Ners Dewi A.Md.Kep',
      submittedNurseRole: 'perawat_pelaksana',
      targetRole: 'pj_shift',
      targetVerifierName: 'M. Haikal Malilang, A.Md. Kep.',
      status: 'diajukan'
    },
    // Pelaksana Siang -> PJ Shift Siang (Aprillia)
    {
      id: 'sub-budi',
      submittedNurseName: 'Ners Budi Santoso, S.Kep.',
      submittedNurseRole: 'perawat_pelaksana',
      targetRole: 'pj_shift',
      targetVerifierName: 'Aprillia Dwi N, S.Kep., Ns.',
      status: 'diajukan'
    },
    // PJ Shift Pagi (Haikal) -> Kepala Ruang (Twis)
    {
      id: 'sub-haikal',
      submittedNurseName: 'M. Haikal Malilang, A.Md. Kep.',
      submittedNurseRole: 'pj_shift',
      targetRole: 'kepala_ruangan',
      targetVerifierName: 'Twis Fertilianti PW., S.Kep., Ns.',
      status: 'diajukan'
    },
    // PJ Shift Malam (Dian) -> PJ Shift Siang Lainnya (Aprillia)
    {
      id: 'sub-pj-dian-to-aprillia',
      submittedNurseName: 'Ns. Dian Pratama, S.Kep.',
      submittedNurseRole: 'pj_shift',
      targetRole: 'pj_shift',
      targetVerifierName: 'Aprillia Dwi N, S.Kep., Ns.',
      status: 'diajukan'
    },
    // Kepala Ruang -> PJ Shift Pagi (Haikal)
    {
      id: 'sub-karu-to-pj',
      submittedNurseName: 'Twis Fertilianti PW., S.Kep., Ns.',
      submittedNurseRole: 'kepala_ruangan',
      targetRole: 'pj_shift',
      targetVerifierName: 'M. Haikal Malilang, A.Md. Kep.',
      status: 'diajukan'
    }
  ];

  // 1. Haikal (PJ Shift Pagi) sees ONLY sub-dewi and sub-karu-to-pj (targeted to Haikal)
  const haikalQueue = filterVerificationQueueForUser(
    entries,
    'pj_shift',
    'M. Haikal Malilang, A.Md. Kep.'
  );
  assert.deepEqual(
    haikalQueue.map((e) => e.id),
    ['sub-dewi', 'sub-karu-to-pj']
  );

  // 2. Aprillia (PJ Shift Siang) sees sub-budi (Pelaksana) AND sub-pj-dian-to-aprillia (PJ Shift Lainnya)
  const aprilliaQueue = filterVerificationQueueForUser(
    entries,
    'pj_shift',
    'Aprillia Dwi N, S.Kep., Ns.'
  );
  assert.deepEqual(
    aprilliaQueue.map((e) => e.id),
    ['sub-budi', 'sub-pj-dian-to-aprillia']
  );

  // 2b. Dian (PJ Shift Malam) does NOT see his own submission in his Verifikasi queue
  const dianQueue = filterVerificationQueueForUser(
    entries,
    'pj_shift',
    'Ns. Dian Pratama, S.Kep.'
  );
  assert.equal(dianQueue.length, 0);

  // 3. Twis (Kepala Ruang) sees ONLY sub-haikal (targeted to Kepala Ruang);
  // sub-pj-dian-to-aprillia was targeted to PJ Shift Lainnya so it is NOT shown on Kepala Ruang's Verifikasi page
  const karuQueueWhenSentToPj = filterVerificationQueueForUser(
    entries,
    'kepala_ruangan',
    'Twis Fertilianti PW., S.Kep., Ns.'
  );
  assert.deepEqual(
    karuQueueWhenSentToPj.map((e) => e.id),
    ['sub-haikal']
  );

  // 4. When Kepala Ruang submits to Kepala Ruang itu sendiri, it DOES appear in Kepala Ruang's Verifikasi queue
  const entriesWithKaruSelf: Parameters<typeof filterVerificationQueueForUser>[0] = [
    ...entries.filter((e) => e.id !== 'sub-karu-to-pj'),
    {
      id: 'sub-karu-to-self',
      submittedNurseName: 'Twis Fertilianti PW., S.Kep., Ns.',
      submittedNurseRole: 'kepala_ruangan',
      targetRole: 'kepala_ruangan',
      targetVerifierName: 'Twis Fertilianti PW., S.Kep., Ns.',
      status: 'diajukan'
    }
  ];
  const karuQueueSelf = filterVerificationQueueForUser(
    entriesWithKaruSelf,
    'kepala_ruangan',
    'Twis Fertilianti PW., S.Kep., Ns.'
  );
  assert.deepEqual(
    karuQueueSelf.map((e) => e.id),
    ['sub-haikal', 'sub-karu-to-self']
  );
});

test('isSessionVerifiedByPj distinguishes PJ Shift vs Kepala Ruang verifiers cleanly', () => {
  const vPj = isSessionVerifiedByPj(sessionPelaksanaVerifiedByPj, mockMasterNurses);
  assert.equal(vPj.isVerified, true);
  assert.equal(vPj.isVerifiedByPjShift, true);
  assert.equal(vPj.isVerifiedByKepalaRuang, false);

  const vPending = isSessionVerifiedByPj(sessionPelaksanaPending, mockMasterNurses);
  assert.equal(vPending.isVerified, false);

  // Returned for repair by verifier -> no longer verified
  const sessionReturnedForRepair: PatientHDSession = {
    ...sessionPelaksanaVerifiedByPj,
    isVerifiedByPj: false,
    isVerifiedByKepalaRuang: false,
    verificationStatus: 'belum_diajukan',
    revisionRequested: true,
    verifierNotes: 'Mohon lengkapi TD Post-HD'
  };
  const vReturned = isSessionVerifiedByPj(sessionReturnedForRepair, mockMasterNurses);
  assert.equal(vReturned.isVerified, false);
});

test('resolveLogbookLockState locks waiting (diajukan) and verified (terverifikasi) logbooks, and unlocks only when draft or verifier requests repair', () => {
  // 1. Initial draft on active day -> unlocked
  const draftState = resolveLogbookLockState({
    status: 'belum_diajukan',
    isToday: true
  });
  assert.equal(draftState.isLocked, false);
  assert.equal(draftState.canEdit, true);
  assert.equal(draftState.hasRevisionRequest, false);

  // 2. Waiting for verification (diajukan) -> strictly locked
  const waitingState = resolveLogbookLockState({
    status: 'diajukan',
    isToday: true
  });
  assert.equal(waitingState.isLocked, true);
  assert.equal(waitingState.canEdit, false);
  assert.equal(waitingState.isSubmitted, true);

  // 3. Already verified (terverifikasi) -> strictly locked
  const verifiedState = resolveLogbookLockState({
    status: 'terverifikasi',
    isToday: true
  });
  assert.equal(verifiedState.isLocked, true);
  assert.equal(verifiedState.canEdit, false);
  assert.equal(verifiedState.isVerified, true);

  // 4. Verifier (PJ Shift / Kepala Ruang) requests repair -> unlocked on active day
  const repairRequestedState = resolveLogbookLockState({
    status: 'belum_diajukan',
    revisionRequested: true,
    verifierNotes: 'Perbaiki nilai UFG tercapai pada Bagian VI',
    isToday: true
  });
  assert.equal(repairRequestedState.isLocked, false);
  assert.equal(repairRequestedState.canEdit, true);
  assert.equal(repairRequestedState.hasRevisionRequest, true);

  // 5. Past day logbook remains locked even if draft
  const pastDayState = resolveLogbookLockState({
    status: 'belum_diajukan',
    revisionRequested: true,
    isToday: false
  });
  assert.equal(pastDayState.isLocked, true);
  assert.equal(pastDayState.canEdit, false);

  // 6. Verifier (PJ Shift & Kepala Ruang) CAN edit submitted ('diajukan') logbooks directly
  assert.equal(canVerifierRoleEditSubmitted('pj_shift'), true);
  assert.equal(canVerifierRoleEditSubmitted('kepala_ruangan'), true);
  assert.equal(canVerifierRoleEditSubmitted('administrator'), true);
  assert.equal(canVerifierRoleEditSubmitted('perawat_pelaksana'), false);

  const verifierOnSubmittedState = resolveLogbookLockState({
    status: 'diajukan',
    isToday: true,
    isVerifier: canVerifierRoleEditSubmitted('pj_shift')
  });
  assert.equal(verifierOnSubmittedState.isLocked, false);
  assert.equal(verifierOnSubmittedState.canEdit, true);
  assert.equal(verifierOnSubmittedState.isSubmitted, true);

  const karuVerifierOnSubmittedState = resolveLogbookLockState({
    status: 'diajukan',
    isToday: true,
    isVerifier: canVerifierRoleEditSubmitted('kepala_ruangan')
  });
  assert.equal(karuVerifierOnSubmittedState.isLocked, false);
  assert.equal(karuVerifierOnSubmittedState.canEdit, true);

  // 7. Already verified ('terverifikasi') remains locked even for verifiers until repair is requested
  const verifierOnVerifiedState = resolveLogbookLockState({
    status: 'terverifikasi',
    isToday: true,
    isVerifier: true
  });
  assert.equal(verifierOnVerifiedState.isLocked, true);
  assert.equal(verifierOnVerifiedState.canEdit, false);
  assert.equal(verifierOnVerifiedState.isVerified, true);
});

test('filterVerificationQueueForUser retains logbooks returned for repair so PJ Shift and Kepala Ruang can track them', () => {
  const entriesWithRepair: Parameters<typeof filterVerificationQueueForUser>[0] = [
    {
      id: 'sub-returned-pj',
      submittedNurseName: 'Ners Rina S.Kep',
      submittedNurseRole: 'perawat_pelaksana',
      targetRole: 'pj_shift',
      targetVerifierName: 'M. Haikal Malilang, A.Md. Kep.',
      status: 'belum_diajukan',
      revisionRequested: true,
      verifierNotes: 'Lengkapi BB Post HD'
    },
    {
      id: 'sub-returned-karu',
      submittedNurseName: 'M. Haikal Malilang, A.Md. Kep.',
      submittedNurseRole: 'pj_shift',
      targetRole: 'kepala_ruangan',
      targetVerifierName: 'Twis Fertilianti PW., S.Kep., Ns.',
      status: 'belum_diajukan',
      revisionRequested: true,
      verifierNotes: 'Lengkapi catatan komplikasi'
    }
  ];

  const pjQueue = filterVerificationQueueForUser(
    entriesWithRepair,
    'pj_shift',
    'M. Haikal Malilang, A.Md. Kep.'
  );
  assert.deepEqual(pjQueue.map((e) => e.id), ['sub-returned-pj']);

  const karuQueue = filterVerificationQueueForUser(
    entriesWithRepair,
    'kepala_ruangan',
    'Twis Fertilianti PW., S.Kep., Ns.'
  );
  assert.deepEqual(karuQueue.map((e) => e.id), ['sub-returned-karu']);
});

test('collectOccupiedLogbookAssets blocks inputted patients and beds across ALL access roles (Pelaksana, PJ Shift, Kepala Ruang, Administrator)', () => {
  const activeDateIso = '2026-10-29';
  const rinaSession: PatientHDSession = {
    ...sessionPelaksanaVerifiedByPj,
    id: 'ses-rina-a01',
    sessionDate: activeDateIso,
    shift: 'Pagi',
    bedNumber: 'BED A01',
    patientName: 'Tn. Budi Santoso',
    medicalRecordNumber: '452101',
    nurseInCharge: 'Ners Rina S.Kep',
    sessionStatus: 'sedang_berlangsung',
    verificationStatus: 'belum_diajukan',
    isVerifiedByPj: false
  };

  assert.equal(
    isSamePatientIdentity(
      { patientName: 'Tn. Budi Santoso', medicalRecord: '45-21-01' },
      { patientName: 'Budi', medicalRecord: '452101' }
    ),
    true
  );
  assert.equal(
    isSamePatientIdentity(
      { patientName: '  tn. budi santoso  ' },
      { patientName: 'Tn. Budi Santoso' }
    ),
    true
  );

  // Verify every other nurse across all roles sees Tn. Budi Santoso & BED A01 as locked on Shift Pagi
  const otherRoleNurses = [
    'Ners Dewi A.Md.Kep', // Perawat Pelaksana lain
    'M. Haikal Malilang, A.Md. Kep.', // PJ Shift
    'Twis Fertilianti PW., S.Kep., Ns.', // Kepala Ruangan
    'Administrator Sistem' // Administrator
  ];

  for (const viewerNurse of otherRoleNurses) {
    const occupied = collectOccupiedLogbookAssets({
      activeDateIso,
      activeShift: 'Pagi',
      currentNurseName: viewerNurse,
      sessions: [rinaSession],
      includeLocalNurseStorage: false
    });

    const claimedPatByRm = occupied.findPatientClaimedByOther({
      patientName: 'Budi Santoso',
      medicalRecord: '45-21-01'
    });
    assert.ok(claimedPatByRm, `Expected patient locked for ${viewerNurse}`);
    assert.equal(claimedPatByRm?.nurseName, 'Ners Rina S.Kep');

    const claimedBedCanonical = occupied.findBedClaimedByOther('Bed A1');
    assert.ok(claimedBedCanonical, `Expected BED A01 / Bed A1 locked for ${viewerNurse}`);
    assert.equal(claimedBedCanonical?.nurseName, 'Ners Rina S.Kep');

    // Different zone beds (BED B01, BED ISOLASI 01) and other patients remain selectable
    assert.equal(occupied.findBedClaimedByOther('BED B01'), null);
    assert.equal(occupied.findBedClaimedByOther('BED ISOLASI 01'), null);
    assert.equal(
      occupied.findPatientClaimedByOther({
        patientName: 'Ny. Siti Aminah',
        medicalRecord: '452999'
      }),
      null
    );
  }

  // Owning nurse (Ners Rina S.Kep) does not see her own patient/bed in "claimedByOther"
  const ownView = collectOccupiedLogbookAssets({
    activeDateIso,
    activeShift: 'Pagi',
    currentNurseName: 'Ns. Rina, S.Kep.',
    sessions: [rinaSession],
    includeLocalNurseStorage: false
  });
  assert.equal(ownView.claimedPatientsByOther.length, 0);
  assert.equal(ownView.claimedBedsByOtherOnShift.length, 0);
});

test('collectOccupiedLogbookAssets locks draft unsubmitted cloudNurseLogbooks in real time and scopes beds by shift while locking patients all day', () => {
  const activeDateIso = '2026-10-29';
  const cloudDraftLogbooks = [
    {
      nurseName: 'M. Haikal Malilang, A.Md. Kep.',
      dateIso: activeDateIso,
      shiftSchedule: {
        date: 'Kamis, 29 Oktober 2026',
        shift: 'Pagi' as const
      },
      managedPatients: [
        {
          id: 'mp-draft-1',
          bedNumber: 'BED C03',
          patientName: 'Ny. Ratna Sari',
          medicalRecord: '880123'
        }
      ]
    }
  ];

  // 1. Another nurse on Shift Pagi cannot pick Ny. Ratna Sari OR BED C03 even before Haikal submits to KaRu
  const pagiView = collectOccupiedLogbookAssets({
    activeDateIso,
    activeShift: 'Pagi',
    currentNurseName: 'Ners Dewi A.Md.Kep',
    cloudNurseLogbooks: cloudDraftLogbooks,
    includeLocalNurseStorage: false
  });
  assert.ok(
    pagiView.findPatientClaimedByOther({ patientName: 'Ny. Ratna Sari', medicalRecord: '880123' })
  );
  assert.ok(pagiView.findBedClaimedByOther('BED C03'));

  // 2. Another nurse on Shift Siang STILL cannot pick Ny. Ratna Sari (already inputted today),
  //    but CAN reuse BED C03 on Shift Siang
  const siangView = collectOccupiedLogbookAssets({
    activeDateIso,
    activeShift: 'Siang',
    currentNurseName: 'Ners Dewi A.Md.Kep',
    cloudNurseLogbooks: cloudDraftLogbooks,
    includeLocalNurseStorage: false
  });
  assert.ok(
    siangView.findPatientClaimedByOther({ patientName: 'Ny. Ratna Sari', medicalRecord: '880123' })
  );
  assert.equal(siangView.findBedClaimedByOther('BED C03'), null);
});

test('collectOccupiedLogbookAssets excludeSession allows editing an existing session in SessionModal without self-collision while blocking other nurses', () => {
  const activeDateIso = '2026-10-29';
  const sessionA: PatientHDSession = {
    ...sessionPelaksanaVerifiedByPj,
    id: 'ses-a',
    sessionDate: activeDateIso,
    shift: 'Pagi',
    bedNumber: 'BED A02',
    patientName: 'Tn. Ahmad Dahlan',
    medicalRecordNumber: '771001',
    nurseInCharge: 'Ners Rina S.Kep'
  };
  const sessionB: PatientHDSession = {
    ...sessionPelaksanaPending,
    id: 'ses-b',
    sessionDate: activeDateIso,
    shift: 'Pagi',
    bedNumber: 'BED A05',
    patientName: 'Ny. Kartini',
    medicalRecordNumber: '771005',
    nurseInCharge: 'Ners Dewi A.Md.Kep'
  };

  // Administrator / PJ Shift editing sessionA in SessionModal
  const modalEditView = collectOccupiedLogbookAssets({
    activeDateIso,
    activeShift: 'Pagi',
    excludeSession: {
      id: sessionA.id,
      nurseName: sessionA.nurseInCharge,
      patientName: sessionA.patientName,
      medicalRecord: sessionA.medicalRecordNumber,
      bedNumber: sessionA.bedNumber
    },
    sessions: [sessionA, sessionB],
    includeLocalNurseStorage: false
  });

  // sessionA's own patient & bed are NOT blocked during edit
  assert.equal(
    modalEditView.findPatientClaimedByOther({
      patientName: 'Tn. Ahmad Dahlan',
      medicalRecord: '771001'
    }),
    null
  );
  assert.equal(modalEditView.findBedClaimedByOther('BED A02'), null);

  // sessionB's patient & bed (belonging to Ners Dewi) ARE strictly blocked
  assert.ok(
    modalEditView.findPatientClaimedByOther({
      patientName: 'Ny. Kartini',
      medicalRecord: '771005'
    })
  );
  assert.ok(modalEditView.findBedClaimedByOther('BED A05'));
});
