import test from 'node:test';
import assert from 'node:assert/strict';
import { computeCensusAndAccess, computeClinicalIndicators, generateAutoSbar } from './hdCalculator.ts';
import { PatientHDSession, ShiftInfo } from '../types/dialysis.ts';

const mockSampleSessions: PatientHDSession[] = [
  {
    id: '1',
    bedNumber: 'Bed 01',
    patientName: 'Ny. Siti Rahayu',
    medicalRecordNumber: '452101',
    age: 54,
    gender: 'P',
    status: 'rajal',
    category: 'reguler',
    sessionStatus: 'selesai',
    isCito: false,
    vascularAccess: 'av_fistula',
    dialyzerModel: 'SAS HF 18',
    isReuse: false,
    dryWeight: 52,
    preWeight: 54.5,
    targetUf: 2500,
    achievedUf: 2500,
    durationPrescribed: 4.5,
    durationActual: 4.5,
    preBp: '140/80',
    postBp: '120/80',
    hasHypotension: false,
    hasMuscleCramps: false,
    hasClotting: false,
    hasFirstUseSyndrome: false,
    hasAccessBleeding: false,
    hasConsultDpjp: false,
    underUfTolerated: false,
    nurseInCharge: 'Ners Dewi',
    updatedAt: new Date().toISOString()
  },
  {
    id: '8',
    bedNumber: 'Bed 08',
    patientName: 'Tn. CH. Adji Tri Subarkah',
    medicalRecordNumber: '452108',
    age: 58,
    gender: 'L',
    status: 'rajal',
    category: 'reguler',
    sessionStatus: 'selesai',
    isCito: false,
    vascularAccess: 'cdl_non_tunnel',
    dialyzerModel: 'SAS HF 18',
    isReuse: false,
    dryWeight: 65,
    preWeight: 68.2,
    targetUf: 3200,
    achievedUf: 2600,
    durationPrescribed: 4.5,
    durationActual: 4.5,
    preBp: '150/90',
    postBp: '115/70',
    hasHypotension: true,
    hypotensionBp: '85/50',
    hypotensionHour: 3,
    hypotensionAction: 'bolus NaCl 0.9% 150 cc + Trendelenburg',
    hasMuscleCramps: false,
    hasClotting: false,
    hasFirstUseSyndrome: false,
    hasAccessBleeding: false,
    hasConsultDpjp: true,
    consultDoctorName: 'dr. Paramitha',
    consultAdvice: 'Stop UF sementara, bolus NaCl, toleransi under-UF',
    underUfTolerated: true,
    underUfReason: 'hipotensi simtomatik',
    nurseInCharge: 'Ners Anton',
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    bedNumber: 'Bed 02',
    patientName: 'Tn. Anang Suseto',
    medicalRecordNumber: '452102',
    age: 62,
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
    preBp: '130/85',
    postBp: '125/80',
    hasHypotension: false,
    hasMuscleCramps: true,
    muscleCrampAction: 'masase betis & bolus NaCl 0.9% 100 cc, UF rate diturunkan',
    hasClotting: false,
    hasFirstUseSyndrome: false,
    hasAccessBleeding: false,
    hasConsultDpjp: false,
    underUfTolerated: false,
    nurseInCharge: 'Ners Dewi',
    updatedAt: new Date().toISOString()
  }
];

test('computeCensusAndAccess correctly computes patient categories and access counts', () => {
  const census = computeCensusAndAccess(mockSampleSessions, 3);
  assert.equal(census.pasienTerjadwal, 3);
  assert.equal(census.pasienHadirSelesai, 3);
  assert.equal(census.pasienReguler, 3);
  assert.equal(census.pasienRajal, 3);
  assert.equal(census.pasienRanap, 0);
  assert.equal(census.aksesAvFistula, 2);
  assert.equal(census.aksesCdlNonTunnel, 1);
});

test('computeClinicalIndicators calculates UF target, hypotension, cramps, and DPJP consults', () => {
  const indicators = computeClinicalIndicators(mockSampleSessions);
  assert.equal(indicators.length, 8);
  
  const ufIndicator = indicators.find(i => i.id === 'uf-target');
  assert.ok(ufIndicator);
  assert.match(ufIndicator.analisis, /Bed 08/);

  const hypoIndicator = indicators.find(i => i.id === 'hypotension');
  assert.ok(hypoIndicator);
  assert.match(hypoIndicator.capaian, /1 Kasus/);
  assert.match(hypoIndicator.analisis, /Tn. CH. Adji Tri/);

  const crampIndicator = indicators.find(i => i.id === 'muscle-cramp');
  assert.ok(crampIndicator);
  assert.match(crampIndicator.capaian, /1 Kasus/);
  assert.match(crampIndicator.analisis, /Tn. Anang Suseto/);

  const consultIndicator = indicators.find(i => i.id === 'consult-dpjp');
  assert.ok(consultIndicator);
  assert.match(consultIndicator.capaian, /dr. Paramitha/);
});

test('generateAutoSbar generates valid SBAR structure with acute intra-HD event info', () => {
  const shiftInfo: ShiftInfo = {
    hospitalName: 'RS HAPPY LAND MEDICAL CENTRE',
    unitName: 'INSTALASI DIALISIS',
    date: 'Selasa, 20 Oktober 2026',
    shift: 'Pagi',
    shiftHours: 'Pagi, jam 07.00 - 14.00 WIB',
    pjShift: 'M. Haikal Malilang, A.Md.Kep.',
    kepalaRuangan: 'Twis Fertilianti PW., S.Kep., Ns.',
    dokterDpjp: 'dr. Raden Heru Prasanto, Sp.PD-KGH',
    dokterJaga: 'dr. Paramitha',
    totalPerawatDinas: 8,
    detailPerawat: '8 Orang (1 PJ Shift + 7 Perawat Pelaksana)',
    perawatRatio: '1 : 3',
    tenagaPendukung: '1 Teknisi Elektromedis/RO, 1 HK Ruangan',
    pjShiftBerikutnya: 'Aprillia Dwi N, S.Kep., Ns.'
  };

  const census = computeCensusAndAccess(mockSampleSessions, 3);
  const sbar = generateAutoSbar(shiftInfo, census, mockSampleSessions);

  assert.ok(sbar.situation.includes('Shift Pagi'));
  assert.ok(sbar.situation.includes('Tn. CH. Adji Tri Subarkah'));
  assert.ok(sbar.background.includes('452108'));
  assert.ok(sbar.assessment.includes('under-UF 600 mL'));
  assert.ok(sbar.recommendation.includes('Shift Siang'));
});
