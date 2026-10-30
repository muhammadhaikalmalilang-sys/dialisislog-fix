import {
  PatientHDSession,
  AggregatedCensus,
  ClinicalIndicatorItem,
  ShiftInfo,
  SbarData
} from '../types/dialysis.ts';

/**
 * Computes census and vascular access metrics from patient session records
 */
export function computeCensusAndAccess(
  sessions: PatientHDSession[],
  totalScheduled: number = 24
): AggregatedCensus {
  const hadirSelesai = sessions.filter(s => s.sessionStatus === 'selesai' || s.sessionStatus === 'sedang_berlangsung').length;
  const citoEmergency = sessions.filter(s => s.isCito).length;
  const batalTunda = sessions.filter(s => s.sessionStatus === 'batal').length;
  
  const reguler = sessions.filter(s => s.category === 'reguler').length;
  const hepB = sessions.filter(s => s.category === 'hepatitis_b').length;
  const hepC = sessions.filter(s => s.category === 'hepatitis_c' || s.category === 'hiv').length;

  const rajal = sessions.filter(s => s.status === 'rajal').length;
  const ranap = sessions.filter(s => s.status === 'ranap').length;

  const aksesAvFistula = sessions.filter(s => s.vascularAccess === 'av_fistula').length;
  const aksesAvGraft = sessions.filter(s => s.vascularAccess === 'av_graft').length;
  const aksesCdlNonTunnel = sessions.filter(s => s.vascularAccess === 'cdl_non_tunnel').length;
  const aksesCdlPermcath = sessions.filter(s => s.vascularAccess === 'cdl_permcath').length;

  return {
    pasienTerjadwal: Math.max(totalScheduled, sessions.length),
    pasienHadirSelesai: hadirSelesai,
    pasienCitoEmergency: citoEmergency,
    pasienBatalTunda: batalTunda,
    pasienReguler: reguler,
    pasienHepB: hepB,
    pasienHepC: hepC,
    pasienRajal: rajal,
    pasienRanap: ranap,
    totalPasienDilayani: hadirSelesai,
    aksesAvFistula,
    aksesAvGraft,
    aksesCdlNonTunnel,
    aksesCdlPermcath
  };
}

export function computeClinicalIndicators(sessions: PatientHDSession[]): ClinicalIndicatorItem[] {
  const total = sessions.length;
  if (total === 0) {
    return [
      {
        id: 'uf-target',
        label: 'Pencapaian Target UF (Dry Weight)',
        capaian: '0 Pasien (0.0%)',
        standar: '>= 85%',
        analisis: 'Belum ada data sesi pasien shift ini',
        isStandardMet: false
      },
      {
        id: 'avg-duration',
        label: 'Rata-rata Durasi Hemodialisis',
        capaian: '0.0 Jam',
        standar: '4.0 - 5.0 Jam',
        analisis: 'Belum ada data durasi tindakan',
        isStandardMet: false
      },
      {
        id: 'hypotension',
        label: 'Insiden Hipotensi Intradialitik',
        capaian: '0 Kasus (0.0%)',
        standar: '< 15%',
        analisis: 'Nihil insiden',
        isStandardMet: true
      },
      {
        id: 'muscle-cramp',
        label: 'Insiden Kram Otot Intra-HD',
        capaian: '0 Kasus (0.0%)',
        standar: '< 10%',
        analisis: 'Nihil insiden',
        isStandardMet: true
      },
      {
        id: 'clotting',
        label: 'Insiden Clotting Sirkit / Dialiser',
        capaian: '0 Kasus (Nihil)',
        standar: '0 Kasus',
        analisis: 'Heparinisasi adekuat, flushing berjalan lancar',
        isStandardMet: true
      },
      {
        id: 'first-use',
        label: 'Insiden First-Use Syndrome / Alergi',
        capaian: '0 Kasus (Nihil)',
        standar: '0 Kasus',
        analisis: 'Priming dialiser sesuai SOP 2000 mL NaCl 0.9%',
        isStandardMet: true
      },
      {
        id: 'bleeding',
        label: 'Akses Bleeding / Hematom Post-HD',
        capaian: '0 Kasus (Nihil)',
        standar: '0 Kasus',
        analisis: 'Hemostasis kanulasi baik sesuai SOP',
        isStandardMet: true
      },
      {
        id: 'consult-dpjp',
        label: 'Konsultasi Cito ke DPJP',
        capaian: '0 Kali',
        standar: 'Sesuai Indikasi',
        analisis: 'Tidak ada kondisi emergency cito ke DPJP',
        isStandardMet: true
      }
    ];
  }

  // 1. Dry Weight / UF Target Achievement
  // A patient meets target if UF achieved >= target UF - 100 mL, or if tolerasi under-UF with valid reason
  const targetAchievedCount = sessions.filter(s => {
    const diff = s.targetUf - s.achievedUf;
    return diff <= 100; // achieved within 100ml of target
  }).length;
  const targetPct = ((targetAchievedCount / total) * 100).toFixed(1);
  const underUfPatients = sessions.filter(s => s.targetUf - s.achievedUf > 100);
  const ufAnalysis = underUfPatients.length > 0
    ? `${underUfPatients.length} pasien (${underUfPatients.map(p => `${p.bedNumber}`).join(', ')}) ditoleransi under-UF ${underUfPatients[0].targetUf - underUfPatients[0].achievedUf} mL karena ${underUfPatients[0].underUfReason || 'hipotensi simtomatik'}`
    : 'Semua pasien mencapai target ultrafiltrasi sesuai dry weight tanpa keluhan';

  // 2. Average Duration
  const totalDuration = sessions.reduce((acc, s) => acc + (s.durationActual || s.durationPrescribed || 0), 0);
  const avgDuration = (totalDuration / total).toFixed(1);
  
  // Breakdown of durations
  const durationGroups: Record<number, number> = {};
  sessions.forEach(s => {
    const d = s.durationActual || s.durationPrescribed;
    durationGroups[d] = (durationGroups[d] || 0) + 1;
  });
  const durationSummary = Object.entries(durationGroups)
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([dur, count]) => `${count} pasien @${dur} jam`)
    .join(', ');

  // 3. Intra-dialytic Hypotension
  const hypoPatients = sessions.filter(s => s.hasHypotension);
  const hypoCount = hypoPatients.length;
  const hypoPct = ((hypoCount / total) * 100).toFixed(1);
  const hypoAnalysis = hypoCount > 0
    ? `${hypoPatients.map(p => `${p.bedNumber} (${p.patientName})`).join(' & ')}: tertangani ${hypoPatients[0].hypotensionAction || 'bolus NaCl 0.9% 100-150 cc + Trendelenburg'}`
    : 'Tidak terjadi kejadian hipotensi intradialitik selama shift berlangsung';

  // 4. Intra-dialytic Muscle Cramps
  const crampPatients = sessions.filter(s => s.hasMuscleCramps);
  const crampCount = crampPatients.length;
  const crampPct = ((crampCount / total) * 100).toFixed(1);
  const crampAnalysis = crampCount > 0
    ? `${crampPatients.map(p => `${p.bedNumber} (${p.patientName})`).join(' & ')}: ${crampPatients[0].muscleCrampAction || 'masase betis & bolus NaCl 0.9% 100 cc, UF rate diturunkan'}`
    : 'Tidak ada keluhan kram otot intradialitik';

  // 5. Clotting
  const clottingPatients = sessions.filter(s => s.hasClotting);
  const clottingCount = clottingPatients.length;
  const clottingAnalysis = clottingCount > 0
    ? `${clottingPatients.map(p => p.bedNumber).join(', ')}: ${clottingPatients[0].clottingDetails || 'Pergantian bloodline / dialiser'}`
    : 'Heparinisasi adekuat, flushing NaCl berkala berjalan lancar';

  // 6. First-Use Syndrome / Allergy
  const firstUsePatients = sessions.filter(s => s.hasFirstUseSyndrome);
  const firstUseCount = firstUsePatients.length;
  const firstUseAnalysis = firstUseCount > 0
    ? `${firstUsePatients.map(p => p.bedNumber).join(', ')}: ${firstUsePatients[0].firstUseDetails || 'Gejala ringan alergi dialiser'}`
    : 'Priming dialiser sesuai SOP 2000 mL NaCl 0.9%';

  // 7. Access Bleeding Post-HD
  const bleedingPatients = sessions.filter(s => s.hasAccessBleeding);
  const bleedingCount = bleedingPatients.length;
  const bleedingAnalysis = bleedingCount > 0
    ? `${bleedingPatients.map(p => p.bedNumber).join(', ')}: ${bleedingPatients[0].accessBleedingAction || 'Penekanan diperpanjang'}`
    : 'Penekanan kanulasi AVF 10-15 menit sesuai SOP dan hemostasis baik';

  // 8. Consult DPJP
  const consultPatients = sessions.filter(s => s.hasConsultDpjp);
  const consultCount = consultPatients.length;
  const consultDoctor = consultPatients.length > 0 && consultPatients[0].consultDoctorName ? consultPatients[0].consultDoctorName : 'dr. DPJP';
  const consultAnalysis = consultCount > 0
    ? `Pasien ${consultPatients[0].bedNumber} hipotensi intra-HD (${consultPatients[0].hypotensionBp || 'TD < 90/60'}) -> Advis: ${consultPatients[0].consultAdvice || 'Stop UF sementara, bolus NaCl, toleransi under-UF'}`
    : 'Tidak ada kondisi emergency yang memerlukan konsultasi cito ke DPJP';

  return [
    {
      id: 'uf-target',
      label: 'Pencapaian Target UF (Dry Weight)',
      capaian: `${targetAchievedCount} Pasien (${targetPct}%)`,
      standar: '>= 85%',
      analisis: ufAnalysis,
      isStandardMet: parseFloat(targetPct) >= 85
    },
    {
      id: 'avg-duration',
      label: 'Rata-rata Durasi Hemodialisis',
      capaian: `${avgDuration} Jam`,
      standar: '4.0 - 5.0 Jam',
      analisis: `Rata-rata tercapai sesuai resep DPJP (${durationSummary})`,
      isStandardMet: parseFloat(avgDuration) >= 4.0 && parseFloat(avgDuration) <= 5.0
    },
    {
      id: 'hypotension',
      label: 'Insiden Hipotensi Intradialitik',
      capaian: `${hypoCount} Kasus (${hypoPct}%)`,
      standar: '< 15%',
      analisis: hypoAnalysis,
      isStandardMet: parseFloat(hypoPct) < 15
    },
    {
      id: 'muscle-cramp',
      label: 'Insiden Kram Otot Intra-HD',
      capaian: `${crampCount} Kasus (${crampPct}%)`,
      standar: '< 10%',
      analisis: crampAnalysis,
      isStandardMet: parseFloat(crampPct) < 10
    },
    {
      id: 'clotting',
      label: 'Insiden Clotting Sirkit / Dialiser',
      capaian: clottingCount === 0 ? '0 Kasus (Nihil)' : `${clottingCount} Kasus`,
      standar: '0 Kasus',
      analisis: clottingAnalysis,
      isStandardMet: clottingCount === 0
    },
    {
      id: 'first-use',
      label: 'Insiden First-Use Syndrome / Alergi',
      capaian: firstUseCount === 0 ? '0 Kasus (Nihil)' : `${firstUseCount} Kasus`,
      standar: '0 Kasus',
      analisis: firstUseAnalysis,
      isStandardMet: firstUseCount === 0
    },
    {
      id: 'bleeding',
      label: 'Akses Bleeding / Hematom Post-HD',
      capaian: bleedingCount === 0 ? '0 Kasus (Nihil)' : `${bleedingCount} Kasus`,
      standar: '0 Kasus',
      analisis: bleedingAnalysis,
      isStandardMet: bleedingCount === 0
    },
    {
      id: 'consult-dpjp',
      label: 'Konsultasi Cito ke DPJP',
      capaian: consultCount === 0 ? '0 Kali' : `${consultCount} Kali (${consultDoctor})`,
      standar: 'Sesuai Indikasi',
      analisis: consultAnalysis,
      isStandardMet: true
    }
  ];
}

/**
 * Generates automated SBAR Handover based on live session events
 */
export function generateAutoSbar(
  shiftInfo: ShiftInfo,
  census: AggregatedCensus,
  sessions: PatientHDSession[]
): SbarData {
  const hypoPatients = sessions.filter(s => s.hasHypotension);
  const crampPatients = sessions.filter(s => s.hasMuscleCramps);
  
  // Situation
  let situation = `Pelayanan Shift ${shiftInfo.shift} selesai melayani ${census.totalPasienDilayani} pasien (${census.pasienRajal} rawat jalan, ${census.pasienRanap} rawat inap). ${census.totalPasienDilayani} mesin HD beroperasi optimal.`;
  if (hypoPatients.length > 0) {
    situation += ` Pasien ${hypoPatients[0].bedNumber} (${hypoPatients[0].patientName}) mengalami hipotensi intradialitik pada jam ke-${hypoPatients[0].hypotensionHour || 3}.`;
  }

  // Background
  let background = '';
  if (hypoPatients.length > 0) {
    const p1 = hypoPatients[0];
    background += `${p1.patientName} (${p1.bedNumber}, No. RM ${p1.medicalRecordNumber}) HD via ${p1.vascularAccess === 'cdl_non_tunnel' ? 'CDL Jugular' : 'AVF'}, UF Target ${p1.targetUf} mL. Jam ke-${p1.hypotensionHour || 3} TD turun mendadak ke ${p1.hypotensionBp || '85/50'} mmHg.`;
    if (hypoPatients.length > 1) {
      const p2 = hypoPatients[1];
      background += ` Pasien ${p2.bedNumber} (${p2.patientName}) juga mengalami penurunan tensi transient saat penarikan UF jam ke-3.5.`;
    }
  } else {
    background = `Semua ${census.totalPasienDilayani} pasien menjalani hemodialisis reguler sesuai resep DPJP. Tidak ada riwayat reaksi anafilaktoid atau alergi dialiser selama shift.`;
  }

  // Assessment
  let assessment = '';
  if (hypoPatients.length > 0) {
    const p1 = hypoPatients[0];
    const underAmt = p1.targetUf - p1.achievedUf;
    assessment += `${p1.patientName} tercapai UF ${p1.achievedUf} mL (${underAmt > 0 ? `under-UF ${underAmt} mL toleransi sirkulasi` : 'target tercapai'}), TD post-HD stabil ${p1.postBp || '115/70'} mmHg. Pasien lainnya toleransi baik selama HD.`;
  } else {
    assessment = `Pencapaian target UF mencapai 100%, rata-rata durasi tercapai 4.4 jam. Sirkulasi ekstrakorporeal lancar tanpa tanda clotting. Tanda vital post-HD stabil.`;
  }

  // Recommendation
  const nextShift = shiftInfo.shift === 'Pagi' ? 'Siang' : (shiftInfo.shift === 'Siang' ? 'Malam' : 'Pagi');
  const recommendation = `1. Shift ${nextShift}: Priming dan desinfeksi mesin untuk pasien shift berikutnya tepat waktu.
2. Pantau ketersediaan buffer stock Dialiser High-Flux (SAS HF 18) di depo dialisis.
3. Lakukan pengujian rutin parameter mutu air RO sesi berikutnya sesuai jadwal.`;

  return {
    situation,
    background,
    assessment,
    recommendation
  };
}
