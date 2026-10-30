import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findPatientByMrn,
  getBedCategoryDefault,
  calculateStaffingDetails,
  autoPopulateSessionDraft,
  canAccessMasterData,
  getAccessibleTabs,
  getDefaultTabForRole,
  updateMasterNurseData,
  updateMasterBedData,
  findNurseByAccountInput,
  generateUsernameFromNurseName,
  parseBulkPatientsText,
  parseBulkNursesText,
  parseTreatmentFrequencyInput,
  buildPatientRoutineSchedule,
  resolvePatientTreatmentFrequency,
  normalizeMasterPatient,
  categorizePatientsByTreatmentSchedule,
  buildPatientsCsvTemplate,
  HD_TREATMENT_DAYS,
  HD_DAY_CATEGORIES,
  buildPatientDaySchedule,
  formatPatientTreatmentDaysLabel,
  extractTreatmentDaysFromText,
  resolvePatientTreatmentDays,
  resolvePatientTreatmentShift,
  filterMasterPatientsForActiveSchedule,
  categorizePatientsByDay,
  inferGenderFromIndonesianName
} from './masterDataHelpers.ts';
import { extractActiveDayName } from './dateHelpers.ts';
import { MasterPatient, MasterNurse, MasterBed } from '../types/dialysis.ts';
import {
  initialMasterPatients,
  sampleBenchmarkPatients,
  initialMasterNurses,
  sampleBenchmarkNurses,
  initialMasterBeds
} from '../data/mockMasterData.ts';
import {
  initialPatients,
  benchmarkSamplePatients,
  initialShiftInfo
} from '../data/mockShiftData.ts';
import {
  INITIAL_VERIFICATION_REGISTRY,
  extractBedCode,
  isSameBed,
  isMatchingNurse
} from './nurseVerificationHelpers.ts';

const mockPatients: MasterPatient[] = [
  {
    id: 'mp-01',
    medicalRecordNumber: '452101',
    patientName: 'Ny. Siti Aminah',
    age: 56,
    gender: 'P',
    defaultStatus: 'rajal',
    category: 'reguler',
    defaultVascularAccess: 'av_fistula',
    defaultAccessSite: 'AVF Radiocephalica Dextra',
    defaultDialyzer: 'SAS HF 18',
    defaultDryWeight: 53.0,
    routineSchedule: 'Selasa & Jumat (Pagi)'
  }
];

const mockNurses: MasterNurse[] = [
  {
    id: 'n-1',
    name: 'M. Haikal Malilang, A.Md. Kep.',
    nip: '19920412',
    role: 'pj_shift',
    email: 'haikal@happyland.co.id',
    username: 'haikal.pj',
    password: 'Dialisis2026!',
    accountStatus: 'aktif',
    pernefriCertified: true,
    isOnDutyToday: true
  },
  {
    id: 'n-2',
    name: 'Ners Rina S.Kep',
    nip: '19950110',
    role: 'perawat_pelaksana',
    email: 'rina@happyland.co.id',
    username: 'rina.hd',
    password: 'Dialisis2026!',
    accountStatus: 'aktif',
    pernefriCertified: true,
    isOnDutyToday: true
  },
  {
    id: 'n-3',
    name: 'Ners Dewi A.Md.Kep',
    nip: '19960514',
    role: 'perawat_pelaksana',
    pernefriCertified: true,
    isOnDutyToday: true
  }
];

const mockBedHepB: MasterBed = {
  id: 'bed-21',
  bedNumber: 'Bed 21 (Isolasi Hep B)',
  machineBrand: 'Fresenius Medical Care',
  machineModel: '5008S CorDiax',
  serialNumber: 'FMC-HD-2022-0021',
  designation: 'isolasi_hepb',
  status: 'ready'
};

test('findPatientByMrn locates patient by MRN string', () => {
  const patient = findPatientByMrn(mockPatients, '452101');
  assert.ok(patient);
  assert.equal(patient.patientName, 'Ny. Siti Aminah');
});

test('getBedCategoryDefault identifies hepatitis B isolation machines', () => {
  const cat = getBedCategoryDefault(mockBedHepB);
  assert.equal(cat, 'hepatitis_b');
});

test('calculateStaffingDetails calculates nurse-to-patient ratio according to PERNEFRI', () => {
  const staffing = calculateStaffingDetails(mockNurses, 6);
  assert.equal(staffing.totalDinas, 3);
  assert.equal(staffing.pelaksanaCount, 2);
  assert.match(staffing.ratioText, /1 : 3/);
  assert.equal(staffing.isStandardCompliant, true);
});

test('autoPopulateSessionDraft auto-fills baseline patient and machine info', () => {
  const draft = autoPopulateSessionDraft(mockPatients[0], mockBedHepB, 'Ners Rina S.Kep');
  assert.equal(draft.patientName, 'Ny. Siti Aminah');
  assert.equal(draft.dryWeight, 53.0);
  assert.equal(draft.category, 'hepatitis_b');
  assert.equal(draft.nurseInCharge, 'Ners Rina S.Kep');
});

test('4-role RBAC enforces exact page access for Administrator, Kepala Ruang, PJ Shift, and Perawat Pelaksana', () => {
  assert.equal(canAccessMasterData('administrator'), true);
  assert.equal(canAccessMasterData('kepala_ruangan'), false);
  assert.equal(canAccessMasterData('pj_shift'), false);
  assert.equal(canAccessMasterData('perawat_pelaksana'), false);
  assert.equal(canAccessMasterData(undefined), false);

  // 1. Administrator: dashboard + data_pasien, data_perawat, data_mesin (+ my_account), NO logbook, verifikasi, riwayat, lap_bulanan
  const adminTabs = getAccessibleTabs('administrator');
  assert.deepEqual(adminTabs, [
    'dashboard',
    'data_pasien',
    'data_perawat',
    'data_mesin',
    'my_account'
  ]);
  assert.equal(getDefaultTabForRole('administrator'), 'dashboard');

  // 2. Kepala Ruang: dashboard, logbook, laporan_pasien, verifikasi, riwayat, lap_harian, lap_bulanan (+ my_account), NO admin data_* tabs
  const karuTabs = getAccessibleTabs('kepala_ruangan');
  assert.deepEqual(karuTabs, [
    'dashboard',
    'logbook',
    'laporan_pasien',
    'verifikasi',
    'riwayat',
    'lap_harian',
    'lap_bulanan',
    'my_account'
  ]);
  assert.equal(karuTabs.includes('data_pasien'), false);
  assert.equal(karuTabs.includes('data_perawat'), false);
  assert.equal(karuTabs.includes('data_mesin'), false);

  // 3. PJ Shift: dashboard, logbook, laporan_pasien, verifikasi, riwayat, lap_harian, lap_bulanan (+ my_account), NO admin data_* tabs
  const pjTabs = getAccessibleTabs('pj_shift');
  assert.deepEqual(pjTabs, [
    'dashboard',
    'logbook',
    'laporan_pasien',
    'verifikasi',
    'riwayat',
    'lap_harian',
    'lap_bulanan',
    'my_account'
  ]);
  assert.equal(pjTabs.includes('data_pasien'), false);
  assert.equal(pjTabs.includes('data_perawat'), false);
  assert.equal(pjTabs.includes('data_mesin'), false);

  // 4. Perawat Pelaksana: dashboard, logbook, laporan_pasien, riwayat, lap_bulanan (+ my_account), NO lap_harian, NO verifikasi & NO admin data_* tabs
  const pelaksanaTabs = getAccessibleTabs('perawat_pelaksana');
  assert.deepEqual(pelaksanaTabs, [
    'dashboard',
    'logbook',
    'laporan_pasien',
    'riwayat',
    'lap_bulanan',
    'my_account'
  ]);
  assert.equal(pelaksanaTabs.includes('lap_harian'), false);
  assert.equal(pelaksanaTabs.includes('verifikasi'), false);
  assert.equal(pelaksanaTabs.includes('data_pasien'), false);
  assert.equal(pelaksanaTabs.includes('data_perawat'), false);
});

test('Laporan Harian menu is accessible to PJ Shift and Kepala Ruang, containing sections A to F', () => {
  const karuTabs = getAccessibleTabs('kepala_ruangan');
  const pjTabs = getAccessibleTabs('pj_shift');
  const pelaksanaTabs = getAccessibleTabs('perawat_pelaksana');
  const adminTabs = getAccessibleTabs('administrator');

  assert.equal(karuTabs.includes('lap_harian'), true);
  assert.equal(pjTabs.includes('lap_harian'), true);
  assert.equal(pelaksanaTabs.includes('lap_harian'), false);
  assert.equal(adminTabs.includes('lap_harian'), false);
});

test('updateMasterNurseData updates nurse name, role/jabatan, and nurse account credentials', () => {
  const updatedList = updateMasterNurseData(mockNurses, 'n-2', {
    name: 'Ners Rina Wijaya, S.Kep., Ns.',
    role: 'pj_shift',
    username: 'rina.pj',
    email: 'rina.wijaya@happyland.co.id',
    password: 'SandiBaru123!',
    accountStatus: 'aktif'
  });

  const edited = updatedList.find(n => n.id === 'n-2');
  assert.ok(edited);
  assert.equal(edited.name, 'Ners Rina Wijaya, S.Kep., Ns.');
  assert.equal(edited.role, 'pj_shift');
  assert.equal(edited.username, 'rina.pj');
  assert.equal(edited.email, 'rina.wijaya@happyland.co.id');
  assert.equal(edited.password, 'SandiBaru123!');

  // Verify account lookup works with updated username and email
  assert.equal(findNurseByAccountInput(updatedList, 'rina.pj')?.id, 'n-2');
  assert.equal(findNurseByAccountInput(updatedList, 'rina.wijaya@happyland.co.id')?.id, 'n-2');
});

test('updateMasterBedData updates Nomor Bed, Penunjukan/Isolasi, and Status Operasional', () => {
  const beds: MasterBed[] = [mockBedHepB];
  const updatedBeds = updateMasterBedData(beds, 'bed-21', {
    bedNumber: 'Bed 22 (Isolasi Hep C)',
    designation: 'isolasi_hepc',
    status: 'maintenance',
    maintenanceNote: 'Kalibrasi sensor suhu'
  });

  assert.equal(updatedBeds[0].bedNumber, 'Bed 22 (Isolasi Hep C)');
  assert.equal(updatedBeds[0].designation, 'isolasi_hepc');
  assert.equal(updatedBeds[0].status, 'maintenance');
  assert.equal(updatedBeds[0].maintenanceNote, 'Kalibrasi sensor suhu');
});

test('built-in datasets include 151 scheduled patients across Senin-Sabtu, 17 active nurse accounts, and 40 SAS 4000 HD machines', () => {
  assert.equal(initialMasterPatients.length, 151);
  assert.equal(sampleBenchmarkPatients.length, 151);
  assert.equal(initialMasterNurses.length, 17);
  assert.equal(sampleBenchmarkNurses.length, 17);
  assert.equal(initialPatients.length, 0);
  assert.equal(benchmarkSamplePatients.length, 0);
  assert.equal(INITIAL_VERIFICATION_REGISTRY.length, 0);
  assert.equal(initialMasterBeds.length, 40);
  assert.equal(
    initialMasterBeds.filter((b) => b.designation === 'reguler').length,
    36
  );
  assert.equal(
    initialMasterBeds.filter((b) => b.designation === 'isolasi').length,
    4
  );
  assert.equal(
    initialMasterBeds.every(
      (b) => b.machineBrand === 'SAS 4000' && b.machineModel === 'SAS 4000'
    ),
    true
  );
  assert.equal(initialMasterBeds[0].bedNumber, 'BED A01');
  assert.equal(initialMasterBeds[11].bedNumber, 'BED A12');
  assert.equal(initialMasterBeds[12].bedNumber, 'BED B01');
  assert.equal(initialMasterBeds[20].bedNumber, 'BED B09');
  assert.equal(initialMasterBeds[21].bedNumber, 'BED C01');
  assert.equal(initialMasterBeds[28].bedNumber, 'BED C08');
  assert.equal(initialMasterBeds[29].bedNumber, 'BED D01');
  assert.equal(initialMasterBeds[31].bedNumber, 'BED D03');
  assert.equal(initialMasterBeds[32].bedNumber, 'BED E01');
  assert.equal(initialMasterBeds[33].bedNumber, 'BED E02');
  assert.equal(initialMasterBeds[34].bedNumber, 'BED F01');
  assert.equal(initialMasterBeds[35].bedNumber, 'BED F02');
  assert.equal(initialMasterBeds[36].bedNumber, 'BED ISOLASI 01');
  assert.equal(initialMasterBeds[39].bedNumber, 'BED ISOLASI 04');
  const uniqueBedCodes = new Set(initialMasterBeds.map((b) => extractBedCode(b.bedNumber)));
  assert.equal(uniqueBedCodes.size, 40);
  for (let i = 0; i < initialMasterBeds.length; i++) {
    for (let j = 0; j < initialMasterBeds.length; j++) {
      assert.equal(
        isSameBed(initialMasterBeds[i].bedNumber, initialMasterBeds[j].bedNumber),
        i === j
      );
    }
  }
  assert.equal(initialShiftInfo.kepalaRuangan, 'TWIS FERTILIANTI PW');
  assert.equal(initialShiftInfo.pjShift, 'M HAIKAL MALILANG');

  // Verify 151 patients across all 6 operational days (Pagi & Siang):
  // - Senin: 24 Pagi, 21 Siang
  // - Selasa: 25 Pagi, 24 Siang
  // - Rabu: 24 Pagi, 24 Siang
  // - Kamis: 24 Pagi, 24 Siang
  // - Jumat: 25 Pagi, 24 Siang
  // - Sabtu: 24 Pagi, 23 Siang
  assert.equal(filterMasterPatientsForActiveSchedule(initialMasterPatients, 'Senin', 'Pagi').length, 24);
  assert.equal(filterMasterPatientsForActiveSchedule(initialMasterPatients, 'Senin', 'Siang').length, 21);
  assert.equal(filterMasterPatientsForActiveSchedule(initialMasterPatients, 'Selasa', 'Pagi').length, 25);
  assert.equal(filterMasterPatientsForActiveSchedule(initialMasterPatients, 'Selasa', 'Siang').length, 24);
  assert.equal(filterMasterPatientsForActiveSchedule(initialMasterPatients, 'Rabu', 'Pagi').length, 24);
  assert.equal(filterMasterPatientsForActiveSchedule(initialMasterPatients, 'Rabu', 'Siang').length, 24);
  assert.equal(filterMasterPatientsForActiveSchedule(initialMasterPatients, 'Kamis', 'Pagi').length, 24);
  assert.equal(filterMasterPatientsForActiveSchedule(initialMasterPatients, 'Kamis', 'Siang').length, 24);
  assert.equal(filterMasterPatientsForActiveSchedule(initialMasterPatients, 'Jumat', 'Pagi').length, 25);
  assert.equal(filterMasterPatientsForActiveSchedule(initialMasterPatients, 'Jumat', 'Siang').length, 24);
  assert.equal(filterMasterPatientsForActiveSchedule(initialMasterPatients, 'Sabtu', 'Pagi').length, 24);
  assert.equal(filterMasterPatientsForActiveSchedule(initialMasterPatients, 'Sabtu', 'Siang').length, 23);

  const sitiSuilah = initialMasterPatients.find((p) => p.patientName === 'SITI SUILAH, NY');
  const totok = initialMasterPatients.find((p) => p.patientName === 'TOTOK ENDARYANTO, TN');
  const kliwon = initialMasterPatients.find((p) => p.patientName === 'KLIWON (B)');
  const joko = initialMasterPatients.find((p) => p.patientName === 'JOKO HARSOYO,TN');
  const chatarina = initialMasterPatients.find((p) => p.patientName === 'CHATARINA SUYATI, NY');
  const raharto = initialMasterPatients.find((p) => p.patientName === 'RAHARTO, TN');
  const waluyo = initialMasterPatients.find((p) => p.patientName === 'WALUYO,TN');
  const hamam = initialMasterPatients.find((p) => p.patientName === 'HAMAM TOHARI, TN');
  const mardiyono = initialMasterPatients.find((p) => p.patientName === 'MARDIYONO,TN');
  const yatiman = initialMasterPatients.find((p) => p.patientName === 'YATIMAN,TN');
  const murdiyati = initialMasterPatients.find((p) => p.patientName === 'MURDIYATI,NY');
  const sulistiyaningrum = initialMasterPatients.find(
    (p) => p.patientName === 'SULISTIYANINGRUM, S.PD.'
  );
  assert.deepEqual(sitiSuilah?.treatmentDays, ['Senin']);
  assert.deepEqual(totok?.treatmentDays, ['Kamis']);
  assert.equal(kliwon?.category, 'hepatitis_b');
  assert.deepEqual(joko?.treatmentDays, ['Senin']);
  assert.deepEqual(chatarina?.treatmentDays, ['Kamis']);
  assert.deepEqual(raharto?.treatmentDays, ['Selasa']);
  assert.deepEqual(waluyo?.treatmentDays, ['Jumat']);
  assert.deepEqual(hamam?.treatmentDays, ['Rabu']);
  assert.equal(hamam?.treatmentShift, 'Siang');
  assert.deepEqual(mardiyono?.treatmentDays, ['Rabu']);
  assert.deepEqual(yatiman?.treatmentDays, ['Rabu']);
  assert.deepEqual(murdiyati?.treatmentDays, ['Sabtu']);
  assert.equal(murdiyati?.treatmentShift, 'Siang');
  assert.deepEqual(sulistiyaningrum?.treatmentDays, ['Sabtu']);
  assert.equal(sulistiyaningrum?.treatmentShift, 'Siang');

  // Verify SIMRS trailing suffix gender inference
  assert.equal(inferGenderFromIndonesianName('SID FEBRILLA HADI.NY'), 'P');
  assert.equal(inferGenderFromIndonesianName('SUWARNI,NN'), 'P');
  assert.equal(inferGenderFromIndonesianName('BRIAN PRIMA SINELEYAN, SDR'), 'L');
  assert.equal(inferGenderFromIndonesianName('IMAN NUGROHO.TN'), 'L');

  // Verify role distribution across the 17 official RSHL nurse accounts (1 Kepala Ruang + 4 PJ Shift + 12 Perawat Pelaksana)
  const karuList = initialMasterNurses.filter((n) => n.role === 'kepala_ruangan');
  const pjList = initialMasterNurses.filter((n) => n.role === 'pj_shift');
  const pelaksanaList = initialMasterNurses.filter((n) => n.role === 'perawat_pelaksana');
  assert.equal(karuList.length, 1);
  assert.equal(karuList[0].username, 'twis.hdhl');
  assert.equal(pjList.length, 4);
  assert.deepEqual(
    pjList.map((n) => n.username),
    ['haikal.hdhl', 'udin.hdhl', 'april.hdhl', 'novi.hdhl']
  );
  assert.equal(pelaksanaList.length, 12);

  // Verify all 17 accounts have unique NIPs & usernames, password '12345', and resolve via findNurseByAccountInput
  const uniqueNips = new Set(initialMasterNurses.map((n) => n.nip));
  const uniqueUsernames = new Set(initialMasterNurses.map((n) => n.username));
  assert.equal(uniqueNips.size, 17);
  assert.equal(uniqueUsernames.size, 17);

  for (let i = 0; i < initialMasterNurses.length; i++) {
    const nurse = initialMasterNurses[i];
    assert.equal(nurse.accountStatus, 'aktif');
    assert.equal(nurse.password, '12345');
    assert.ok(nurse.username?.endsWith('.hdhl'));
    assert.equal(findNurseByAccountInput(initialMasterNurses, nurse.nip)?.id, nurse.id);
    assert.equal(findNurseByAccountInput(initialMasterNurses, nurse.username!)?.id, nurse.id);
    assert.equal(findNurseByAccountInput(initialMasterNurses, nurse.email!)?.id, nurse.id);

    // Ensure strict pairwise nurse identity isolation (e.g. AYU WULANDARI vs RINI WULANDARI vs AYU PUSPITA)
    assert.equal(isMatchingNurse(nurse.name, nurse.name), true);
    for (let j = 0; j < initialMasterNurses.length; j++) {
      if (i !== j) {
        assert.equal(
          isMatchingNurse(nurse.name, initialMasterNurses[j].name),
          false,
          `Expected "${nurse.name}" not to collide with "${initialMasterNurses[j].name}"`
        );
      }
    }
  }
});

test('parseBulkPatientsText parses Excel/CSV bulk rows, infers gender, auto-fills MRN, and flags duplicates', () => {
  const tsvInput = [
    'No. RM\tNama Pasien\tUsia\tGender\tBB Kering\tAkses Vaskular\tKategori\tJadwal Rutin',
    '452101\tNy. Siti Aminah Duplikat\t57\tP\t54.0\tAVF\tReguler\tSelasa & Jumat (Pagi)',
    '\tTn. Ahmad Fauzi\t61\t\t63.5\tCDL\tHep B\tSenin & Kamis (Pagi)',
    '\tNy. Ratna Sari\t48\t\t51,2\tPermcath\tHep C\tRabu & Sabtu (Siang)'
  ].join('\n');

  const result = parseBulkPatientsText(tsvInput, mockPatients);
  assert.equal(result.items.length, 3);
  assert.equal(result.validCount, 3);
  assert.equal(result.duplicateExistingCount, 1);
  assert.equal(result.newCount, 2);

  // Row 1 matches existing MRN 452101 -> flagged as duplicate
  assert.equal(result.items[0].isDuplicateExisting, true);
  assert.equal(result.items[0].existingPatientId, 'mp-01');

  // Row 2 auto-generates MRN 452102, infers gender 'L' from 'Tn.', parses CDL & hepatitis_b
  assert.equal(result.items[1].error, undefined);
  assert.equal(result.items[1].isDuplicateExisting, false);
  assert.equal(result.items[1].patient.medicalRecordNumber, '452102');
  assert.equal(result.items[1].patient.gender, 'L');
  assert.equal(result.items[1].patient.defaultVascularAccess, 'cdl_non_tunnel');
  assert.equal(result.items[1].patient.category, 'hepatitis_b');
  assert.equal(result.items[1].patient.defaultDryWeight, 63.5);

  // Row 3 auto-generates MRN 452103, infers gender 'P' from 'Ny.', parses comma decimal 51,2
  assert.equal(result.items[2].error, undefined);
  assert.equal(result.items[2].patient.medicalRecordNumber, '452103');
  assert.equal(result.items[2].patient.gender, 'P');
  assert.equal(result.items[2].patient.defaultVascularAccess, 'cdl_permcath');
  assert.equal(result.items[2].patient.category, 'hepatitis_c');
  assert.equal(result.items[2].patient.defaultDryWeight, 51.2);
});

test('parseBulkNursesText parses multi-row nurse roster and generates active login accounts for all 3 roles', () => {
  const csvInput = [
    'Nama & Gelar;NIP;Jabatan;Shift;Username;Email;Kata Sandi;Status Dinas',
    'Ns. Budi Hartono, S.Kep.;19880101;Kepala Ruangan;Pagi;;;Dialisis2026!;Dinas',
    'Ns. Budi Santoso, S.Kep.;19900202;PJ Shift;Pagi;;;Dialisis2026!;Dinas',
    'Ayu Lestari, A.Md.Kep.;19960303;Perawat Pelaksana;Siang;;;Dialisis2026!;Off'
  ].join('\n');

  const result = parseBulkNursesText(csvInput, []);
  assert.equal(result.items.length, 3);
  assert.equal(result.validCount, 3);
  assert.equal(result.newCount, 3);

  assert.equal(result.items[0].nurse.role, 'kepala_ruangan');
  assert.equal(result.items[0].nurse.systemAccess, 'kepala_ruangan');
  assert.equal(result.items[0].nurse.username, 'budi.hartono');
  assert.equal(result.items[0].nurse.accountStatus, 'aktif');

  assert.equal(result.items[1].nurse.role, 'pj_shift');
  assert.equal(result.items[1].nurse.systemAccess, 'pj_shift');
  assert.equal(result.items[1].nurse.username, 'budi.santoso');

  assert.equal(result.items[2].nurse.role, 'perawat_pelaksana');
  assert.equal(result.items[2].nurse.systemAccess, 'perawat_pelaksana');
  assert.equal(result.items[2].nurse.username, 'ayu.lestari');
  assert.equal(result.items[2].nurse.shiftAssigned, 'Siang');
  assert.equal(result.items[2].nurse.isOnDutyToday, false);

  // Verify generated nurse accounts can immediately log in via findNurseByAccountInput
  const importedNurses = result.items.map((r) => r.nurse);
  assert.equal(findNurseByAccountInput(importedNurses, 'budi.hartono')?.role, 'kepala_ruangan');
  assert.equal(findNurseByAccountInput(importedNurses, 'budi.santoso')?.role, 'pj_shift');
  assert.equal(findNurseByAccountInput(importedNurses, 'ayu.lestari@happyland.co.id')?.role, 'perawat_pelaksana');

  // Verify collision disambiguation on username generation
  const used = new Set(['ayu.lestari']);
  assert.equal(generateUsernameFromNurseName('Ns. Ayu Lestari, S.Kep', used), 'ayu.lestari2');
});

test('parseTreatmentFrequencyInput and buildPatientRoutineSchedule handle 2x/week, 1x/week, and 1x/2weeks accurately', () => {
  assert.equal(parseTreatmentFrequencyInput('2 kali dalam 1 minggu'), '2x_seminggu');
  assert.equal(parseTreatmentFrequencyInput('2x / minggu'), '2x_seminggu');
  assert.equal(parseTreatmentFrequencyInput('Senin & Kamis (Pagi)'), '2x_seminggu');

  assert.equal(parseTreatmentFrequencyInput('1 kali dalam 1 minggu'), '1x_seminggu');
  assert.equal(parseTreatmentFrequencyInput('1x seminggu'), '1x_seminggu');
  assert.equal(parseTreatmentFrequencyInput('Setiap Rabu (Siang)'), '1x_seminggu');

  assert.equal(parseTreatmentFrequencyInput('1 kali dalam 2 minggu'), '1x_2minggu');
  assert.equal(parseTreatmentFrequencyInput('1x / 2 minggu'), '1x_2minggu');
  assert.equal(parseTreatmentFrequencyInput('Sabtu · Minggu Genap (Pagi)'), '1x_2minggu');
  assert.equal(parseTreatmentFrequencyInput('Kamis Siklus 14 Hari (Siang)'), '1x_2minggu');

  assert.equal(
    buildPatientRoutineSchedule({
      frequency: '2x_seminggu',
      days: ['Senin', 'Kamis'],
      shift: 'Pagi'
    }),
    'Senin & Kamis (Pagi)'
  );
  assert.equal(
    buildPatientRoutineSchedule({
      frequency: '1x_seminggu',
      days: ['Rabu'],
      shift: 'Siang'
    }),
    'Setiap Rabu (Siang)'
  );
  assert.equal(
    buildPatientRoutineSchedule({
      frequency: '1x_2minggu',
      days: ['Sabtu'],
      shift: 'Pagi',
      biweeklyCycle: 'Minggu Genap (Ke-2 & Ke-4)'
    }),
    'Sabtu · Minggu Genap (Pagi)'
  );
});

test('normalizeMasterPatient and categorizePatientsByTreatmentSchedule group patients into 3 HD frequency categories', () => {
  const rawList: MasterPatient[] = [
    {
      ...mockPatients[0],
      id: 'p-2x-a',
      medicalRecordNumber: '500101',
      routineSchedule: 'Senin & Kamis (Pagi)'
    },
    {
      ...mockPatients[0],
      id: 'p-2x-b',
      medicalRecordNumber: '500102',
      treatmentFrequency: '2x_seminggu',
      routineSchedule: 'Selasa & Jumat (Siang)'
    },
    {
      ...mockPatients[0],
      id: 'p-1x-w',
      medicalRecordNumber: '500103',
      routineSchedule: 'Setiap Rabu (Pagi)'
    },
    {
      ...mockPatients[0],
      id: 'p-1x-2w',
      medicalRecordNumber: '500104',
      routineSchedule: 'Sabtu · Minggu Ganjil (Pagi)'
    }
  ];

  const normalized = rawList.map(normalizeMasterPatient);
  assert.equal(normalized[0].treatmentFrequency, '2x_seminggu');
  assert.deepEqual(normalized[0].treatmentDays, ['Senin', 'Kamis']);
  assert.equal(normalized[1].treatmentShift, 'Siang');
  assert.equal(normalized[2].treatmentFrequency, '1x_seminggu');
  assert.deepEqual(normalized[2].treatmentDays, ['Rabu']);
  assert.equal(normalized[3].treatmentFrequency, '1x_2minggu');
  assert.deepEqual(normalized[3].treatmentDays, ['Sabtu']);
  assert.equal(normalized[3].biweeklyCycle, 'Minggu Ganjil (Ke-1 & Ke-3)');
  assert.equal(resolvePatientTreatmentFrequency(normalized[3]), '1x_2minggu');

  const grouped = categorizePatientsByTreatmentSchedule(normalized);
  assert.equal(grouped.counts.total, 4);
  assert.equal(grouped.counts['2x_seminggu'], 2);
  assert.equal(grouped.counts['1x_seminggu'], 1);
  assert.equal(grouped.counts['1x_2minggu'], 1);
  assert.equal(grouped.twoTimesWeekly.length, 2);
  assert.equal(grouped.onceWeekly[0].id, 'p-1x-w');
  assert.equal(grouped.onceBiweekly[0].id, 'p-1x-2w');
});

test('parseBulkPatientsText supports 10-column day-based CSV template and defaultTreatmentDay', () => {
  const csvTemplate = buildPatientsCsvTemplate();
  const parsed = parseBulkPatientsText(csvTemplate, []);

  assert.equal(parsed.validCount, 3);
  assert.equal(parsed.errorCount, 0);

  assert.deepEqual(parsed.items[0].patient.treatmentDays, ['Senin']);
  assert.equal(parsed.items[0].patient.treatmentShift, 'Pagi');
  assert.equal(parsed.items[0].patient.routineSchedule, 'Senin (Pagi)');
  assert.equal(parsed.items[0].patient.contactPhone, '081200000001');

  assert.deepEqual(parsed.items[1].patient.treatmentDays, ['Selasa']);
  assert.equal(parsed.items[1].patient.treatmentShift, 'Pagi');
  assert.equal(parsed.items[1].patient.routineSchedule, 'Selasa (Pagi)');
  assert.equal(parsed.items[1].patient.contactPhone, '081200000002');

  assert.deepEqual(parsed.items[2].patient.treatmentDays, ['Rabu']);
  assert.equal(parsed.items[2].patient.treatmentShift, 'Siang');
  assert.equal(parsed.items[2].patient.routineSchedule, 'Rabu (Siang)');
  assert.equal(parsed.items[2].patient.contactPhone, '081200000003');

  // Single-column quick list inheriting defaultTreatmentDay = 'Jumat' & defaultShift = 'Siang'
  const quickFriday = parseBulkPatientsText('Tn. Hendra Kusuma\nNy. Lestari Dewi', [], {
    defaultTreatmentDay: 'Jumat',
    defaultShift: 'Siang'
  });
  assert.equal(quickFriday.validCount, 2);
  assert.deepEqual(quickFriday.items[0].patient.treatmentDays, ['Jumat']);
  assert.equal(quickFriday.items[0].patient.treatmentShift, 'Siang');
  assert.equal(quickFriday.items[0].patient.routineSchedule, 'Jumat (Siang)');
});

test('categorizePatientsByDay categorizes patients strictly by day (Senin–Minggu) and disambiguates Minggu (Sunday vs week)', () => {
  assert.equal(HD_TREATMENT_DAYS.length, 7);
  assert.equal(HD_DAY_CATEGORIES.length, 7);

  // Disambiguate Indonesian "minggu" meaning week vs Sunday
  assert.deepEqual(extractTreatmentDaysFromText('1 kali dalam 2 minggu'), []);
  assert.deepEqual(extractTreatmentDaysFromText('Sabtu · Minggu Ganjil (Pagi)'), ['Sabtu']);
  assert.deepEqual(extractTreatmentDaysFromText('Minggu (Pagi)'), ['Minggu']);
  assert.deepEqual(extractTreatmentDaysFromText('Kamis & Minggu (Siang)'), ['Kamis', 'Minggu']);

  const patients: MasterPatient[] = [
    normalizeMasterPatient({
      ...mockPatients[0],
      id: 'p-mon-only',
      medicalRecordNumber: '600101',
      treatmentDays: ['Senin'],
      treatmentShift: 'Pagi',
      routineSchedule: ''
    }),
    normalizeMasterPatient({
      ...mockPatients[0],
      id: 'p-mon-thu',
      medicalRecordNumber: '600102',
      treatmentDays: ['Senin', 'Kamis'],
      treatmentShift: 'Siang',
      routineSchedule: 'Senin & Kamis (Siang)'
    }),
    normalizeMasterPatient({
      ...mockPatients[0],
      id: 'p-sun',
      medicalRecordNumber: '600103',
      routineSchedule: 'Minggu (Pagi)'
    })
  ];

  // Single-day patient stays strictly single-day
  assert.deepEqual(resolvePatientTreatmentDays(patients[0]), ['Senin']);
  assert.equal(patients[0].routineSchedule, buildPatientDaySchedule({ days: ['Senin'], shift: 'Pagi' }));
  assert.equal(formatPatientTreatmentDaysLabel(patients[0].treatmentDays, 'full'), 'Hari Senin');
  assert.equal(formatPatientTreatmentDaysLabel(patients[1].treatmentDays, 'full'), 'Hari Senin & Kamis');

  const categorized = categorizePatientsByDay(patients);
  assert.equal(categorized.counts.totalPatients, 3);
  assert.equal(categorized.counts.totalJadwalHarian, 4); // 2 Senin + 1 Kamis + 1 Minggu
  assert.equal(categorized.counts.Senin, 2);
  assert.equal(categorized.counts.Kamis, 1);
  assert.equal(categorized.counts.Minggu, 1);
  assert.equal(categorized.counts.Selasa, 0);
  assert.deepEqual(
    categorized.byDay.Senin.map(p => p.id),
    ['p-mon-only', 'p-mon-thu']
  );
  assert.deepEqual(
    categorized.byDay.Kamis.map(p => p.id),
    ['p-mon-thu']
  );
  assert.deepEqual(
    categorized.byDay.Minggu.map(p => p.id),
    ['p-sun']
  );
});

test('filterMasterPatientsForActiveSchedule strictly returns only patients scheduled on active day & shift (e.g. Senin Siang)', () => {
  assert.equal(extractActiveDayName('Senin, 26 Oktober 2026'), 'Senin');
  assert.equal(extractActiveDayName('2026-10-26'), 'Senin');
  assert.equal(extractActiveDayName('Minggu, 25 Oktober 2026'), 'Minggu');

  const roster: MasterPatient[] = [
    normalizeMasterPatient({
      ...mockPatients[0],
      id: 'p-senin-pagi',
      medicalRecordNumber: '700101',
      patientName: 'Tn. Andi (Senin Pagi)',
      treatmentDays: ['Senin'],
      treatmentShift: 'Pagi',
      routineSchedule: 'Senin (Pagi)'
    }),
    normalizeMasterPatient({
      ...mockPatients[0],
      id: 'p-senin-siang-1',
      medicalRecordNumber: '700102',
      patientName: 'Ny. Budiwati (Senin Siang)',
      treatmentDays: ['Senin'],
      treatmentShift: 'Siang',
      routineSchedule: 'Senin (Siang)'
    }),
    normalizeMasterPatient({
      ...mockPatients[0],
      id: 'p-senin-kamis-siang',
      medicalRecordNumber: '700103',
      patientName: 'Tn. Candra (Senin & Kamis Siang)',
      treatmentDays: ['Senin', 'Kamis'],
      treatmentShift: 'Siang',
      routineSchedule: 'Senin & Kamis (Siang)'
    }),
    normalizeMasterPatient({
      ...mockPatients[0],
      id: 'p-selasa-siang',
      medicalRecordNumber: '700104',
      patientName: 'Ny. Dina (Selasa Siang)',
      treatmentDays: ['Selasa'],
      treatmentShift: 'Siang',
      routineSchedule: 'Selasa (Siang)'
    })
  ];

  assert.equal(resolvePatientTreatmentShift(roster[0]), 'Pagi');
  assert.equal(resolvePatientTreatmentShift(roster[1]), 'Siang');

  // Active Day = Senin, Active Shift = Siang -> ONLY Ny. Budiwati & Tn. Candra
  const seninSiang = filterMasterPatientsForActiveSchedule(
    roster,
    extractActiveDayName('Senin, 26 Oktober 2026'),
    'Siang'
  );
  assert.deepEqual(
    seninSiang.map(p => p.id),
    ['p-senin-siang-1', 'p-senin-kamis-siang']
  );

  // Active Day = Senin, Active Shift = Pagi -> ONLY Tn. Andi
  const seninPagi = filterMasterPatientsForActiveSchedule(roster, 'Senin', 'Pagi');
  assert.deepEqual(
    seninPagi.map(p => p.id),
    ['p-senin-pagi']
  );

  // Active Day = Rabu, Active Shift = Siang -> empty []
  const rabuSiang = filterMasterPatientsForActiveSchedule(roster, 'Rabu', 'Siang');
  assert.equal(rabuSiang.length, 0);
});



