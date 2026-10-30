import { OfficialLogbookItem, OfficialNurseLogbookMonth } from '../types/dialysis.ts';
import { formatShortIndonesianTimestampWib, getWibDateParts } from '../utils/dateHelpers.ts';

/**
 * 29 Standar Kegiatan Asuhan Keperawatan Hemodialisis
 * Sumber: PDF Dokumen Resmi RS Happy Land Medical Centre
 * "LOGBOOK KEGIATAN HARIAN ASUHAN KEPERAWATAN HEMODIALISIS"
 */
export const OFFICIAL_LOGBOOK_ITEMS: OfficialLogbookItem[] = [
  // ==================== BAGIAN I ====================
  {
    code: '1.1',
    bagian: 1,
    bagianTitle: 'BAGIAN I: KESIAPAN FASILITAS RUANGAN HEMODIALISIS & SISTEM WATER TREATMENT (RO)',
    category: 'Kesiapan RO & Water Treatment',
    shortTitle: 'Memastikan Kesiapan RO & Water Treatment',
    simpleGuide: 'Pastikan kualitas air hasil RO, ketersediaan air baku, dan tekanan pompa memenuhi syarat sebelum mesin dinyalakan.',
    keyMetrics: ['TDS Produk RO < 10 ppm', 'Tekanan Pompa Normal', 'Klorin Bebas < 0.1 mg/L'],
    notePlaceholder: 'Contoh: TDS RO 4 ppm, tekanan pompa 2.2 bar, suplai lancar',
    quickNotes: [
      'TDS Air RO: 4 ppm, Tekanan Pompa: 2.2 bar, Suplai Normal',
      'Kualitas air RO memenuhi syarat, uji klorin negatif'
    ],
    description: 'MEMASTIKAN KESIAPAN RO & WATER TREATMEN',
    standardSpo: 'Cek Harian pre, intra dan Post pelayanan'
  },
  {
    code: '1.2',
    bagian: 1,
    bagianTitle: 'BAGIAN I: KESIAPAN FASILITAS RUANGAN HEMODIALISIS & SISTEM WATER TREATMENT (RO)',
    category: 'Kesiapan Ruangan & Lingkungan',
    shortTitle: 'Kesiapan Ruangan & Lingkungan',
    simpleGuide: 'Periksa kenyamanan suhu ruangan, sirkulasi udara, serta pemisahan area bed reguler dan ruang isolasi.',
    keyMetrics: ['Suhu 20–24 °C', 'Kelembaban 40–60%', 'Zonasi Isolasi Terpisah'],
    notePlaceholder: 'Contoh: Suhu 22.5°C, kelembaban 52%, bed sudah didesinfeksi',
    quickNotes: [
      'Suhu Ruang: 22.5°C, Kelembaban: 52%, Area Bed Bersih',
      'Ruang reguler & isolasi HBsAg/HCV bersih dan terpisah'
    ],
    description: 'KESIAPAN RUANGAN & LINGKUNGAN',
    standardSpo: 'Suhu 20 - 24°C, ruang reguler & isolasi (HBsAg/HCV/HIV) terpisah bersih'
  },
  {
    code: '1.3',
    bagian: 1,
    bagianTitle: 'BAGIAN I: KESIAPAN FASILITAS RUANGAN HEMODIALISIS & SISTEM WATER TREATMENT (RO)',
    category: 'Kesiapan Emergency Room & Emergency Tools',
    shortTitle: 'Kesiapan Emergency Room & Emergency Tools',
    simpleGuide: 'Pastikan troli darurat tersegel lengkap, defibrilator menyala normal, serta oksigen sentral dan suction siap pakai.',
    keyMetrics: ['Segel Troli Utuh', 'Defibrilator/AED Siap', 'O2 & Suction Aktif'],
    notePlaceholder: 'Contoh: Troli segel utuh, AED siap pakai, O2 sentral aktif',
    quickNotes: [
      'Troli emergensi segel utuh, Defibrilator & O2 sentral siap pakai',
      'Checklist harian alat darurat lengkap, obat tidak kedaluwarsa'
    ],
    description: 'KESIAPAN EMERGENCY ROOM & EMERGENCY TOOLS',
    standardSpo: 'Cek harian checklist emergency, siap pakai sewaktu-waktu'
  },

  // ==================== BAGIAN II ====================
  {
    code: '2.1',
    bagian: 2,
    bagianTitle: 'BAGIAN II: PERSIAPAN PERAWAT, PERALATAN, MESIN HD & ALAT KESEHATAN (PRE-HD)',
    category: 'Pencegahan Infeksi (PPI)',
    shortTitle: 'HAND HYGIENE dan PENGGUNAAN APD',
    simpleGuide: 'Lakukan hand hygiene dan penggunaan APD sebelum menyentuh sirkuit darah atau pasien.',
    keyMetrics: ['HAND HYGIENE', 'PENGGUNAAN APD'],
    notePlaceholder: 'HAND HYGIENE dan PENGGUNAAN APD dilaksanakan',
    quickNotes: [
      'HAND HYGIENE dan PENGGUNAAN APD dilaksanakan',
      'Hand hygiene & penggunaan APD standar dialisis dilaksanakan'
    ],
    description: 'HAND HYGIENE dan PENGGUNAAN APD',
    standardSpo: 'Kepatuhan Hand Hygiene & APD 100% sebelum kontak alat/pasien'
  },
  {
    code: '2.2',
    bagian: 2,
    bagianTitle: 'BAGIAN II: PERSIAPAN PERAWAT, PERALATAN, MESIN HD & ALAT KESEHATAN (PRE-HD)',
    category: 'Uji Kelaikan Mesin HD',
    shortTitle: 'KELAYAKAN MESIN (SELF TEST)',
    simpleGuide: 'Hidupkan mesin HD dan tunggu hingga seluruh pengujian sensor keamanan otomatis dinyatakan lulus tanpa pesan error.',
    keyMetrics: ['Status Self-Test: PASSED', 'Sensor Udara & Klem Vena Aktif', 'Detektor Bocor Darah OK'],
    notePlaceholder: 'Contoh: Self-test mesin lulus (Passed), sensor alarm & klem normal',
    quickNotes: [
      'Self-test mesin HD lulus (Passed), seluruh sensor alarm aktif',
      'Kalibrasi hidrolik, air detector, dan venous clamp normal'
    ],
    description: 'KELAYAKAN MESIN (SELF TEST)',
    standardSpo: "Hasil Self-Test Mesin 'PASSED', tidak ada error/alarm gagal kalibrasi"
  },
  {
    code: '2.3',
    bagian: 2,
    bagianTitle: 'BAGIAN II: PERSIAPAN PERAWAT, PERALATAN, MESIN HD & ALAT KESEHATAN (PRE-HD)',
    category: 'Cairan Konsentrat & Air RO',
    shortTitle: 'PEMASANGAN ACID, BIKARBONAT & AIR RO MESIN',
    simpleGuide: 'Pasang jerigen/kemasan konsentrat asam (Part A) dan bikarbonat (Part B) sesuai resep dokter serta sambungkan jalur air RO.',
    keyMetrics: ['Formula Sesuai Resep Dokter', 'Cairan Jernih Tanpa Endapan', 'Belum Kedaluwarsa'],
    notePlaceholder: 'Contoh: Part A Acid & Part B Bikarbonat terpasang, cairan jernih, exp aman',
    quickNotes: [
      'Konsentrat Part A Acid & Part B Bikarbonat sesuai resep, exp aman',
      'Suplai air RO tersambung baik, cairan dialisat jernih'
    ],
    description: 'PEMASANGAN ACID, BIKARBONAT & AIR RO MESIN',
    standardSpo: 'Sesuai resep dokter, verifikasi expired date & kejernihan cairan'
  },
  {
    code: '2.4',
    bagian: 2,
    bagianTitle: 'BAGIAN II: PERSIAPAN PERAWAT, PERALATAN, MESIN HD & ALAT KESEHATAN (PRE-HD)',
    category: 'Verifikasi Dialyzer & Bloodline',
    shortTitle: 'VERIFIKASI DIALYZER SINGLE USE',
    simpleGuide: 'Periksa keutuhan dan sterilitas dialyzer single use sebelum digunakan pada pasien.',
    keyMetrics: ['Kemasan Utuh & Steril', 'Belum Kedaluwarsa', 'Tipe Sesuai Resep'],
    notePlaceholder: 'Contoh: Dialyzer single use kemasan utuh & steril',
    quickNotes: [
      'Dialyzer baru (Single Use) kemasan utuh & steril',
      'Verifikasi dialyzer single use dilaksanakan sesuai resep'
    ],
    description: 'VERIFIKASI DIALYZER SINGLE USE',
    standardSpo: 'Kemasan dialyzer single use utuh, steril, dan belum kedaluwarsa'
  },
  {
    code: '2.5',
    bagian: 2,
    bagianTitle: 'BAGIAN II: PERSIAPAN PERAWAT, PERALATAN, MESIN HD & ALAT KESEHATAN (PRE-HD)',
    category: 'Pembilasan Sirkuit (Priming)',
    shortTitle: 'MELAKUKAN PRIMING',
    simpleGuide: 'Bilas selang darah (AVBL) dan dialyzer dengan NaCl 0.9% secara steril sampai seluruh gelembung udara keluar tuntas.',
    keyMetrics: ['NaCl 0.9% ≥ 500–1000 mL', 'Bebas Gelembung Udara', 'Heparin Sirkuit Sesuai Instruksi'],
    notePlaceholder: 'Contoh: Priming NaCl 0.9% 1000 mL aseptik, sirkuit bebas gelembung udara',
    quickNotes: [
      'Priming NaCl 0.9% aseptik bebas gelembung udara, heparin 2000 IU',
      'Bilas sirkuit tuntas bebas udara, program bebas heparin (saline flush)'
    ],
    description: 'MELAKUKAN PRIMING',
    standardSpo: 'Minimal 500 mL NaCl 0.9%, bebas bubble udara, heparinized jika diinstruksikan'
  },
  {
    code: '2.6',
    bagian: 2,
    bagianTitle: 'BAGIAN II: PERSIAPAN PERAWAT, PERALATAN, MESIN HD & ALAT KESEHATAN (PRE-HD)',
    category: 'Kesiapan Akhir Mesin',
    shortTitle: 'PANTAU KONDUKTIVITAS & SUHU DIALISAT',
    simpleGuide: 'Cek layar mesin sebelum akses pasien dihubungkan: pastikan suhu dan konduktivitas dialisat sudah hijau dan stabil.',
    keyMetrics: ['Konduktivitas 13.5–14.5 mS/cm', 'Suhu Dialisat 36.0–37.0 °C', 'Indikator Mesin Hijau (Ready)'],
    notePlaceholder: 'Contoh: Konduktivitas 14.0 mS/cm, suhu dialisat 36.5°C stabil',
    quickNotes: [
      'Konduktivitas 14.0 mS/cm, suhu dialisat 36.5°C stabil, indikator hijau',
      'Parameter fisik & kimia dialisat aman, mesin siap sambung pasien'
    ],
    description: 'PANTAU KONDUKTIVITAS & SUHU DIALISAT',
    standardSpo: 'Konduktivitas 13.5 - 14.5 mS/cm, temperatur stabil, lampu indikator hijau'
  },

  // ==================== BAGIAN III ====================
  {
    code: '3.1',
    bagian: 3,
    bagianTitle: 'BAGIAN III: IDENTIFIKASI PASIEN, PENGKAJIAN PRE-HD & KESELAMATAN PASIEN (PATIENT SAFETY)',
    category: 'Sasaran Keselamatan Pasien (SKP 1)',
    shortTitle: 'IDENTIFIKASI PASIEN',
    simpleGuide: 'Minta pasien menyebutkan nama lengkap & tanggal lahir, lalu cocokkan langsung dengan gelang identitas dan berkas rekam medis.',
    keyMetrics: ['Minimal 2 Identitas Cocok', 'Nama Lengkap + No. RM + Tgl Lahir', 'Wajib Sebelum Kanulasi'],
    notePlaceholder: 'Contoh: Identifikasi verbal & gelang cocok (Nama & No. RM sesuai)',
    quickNotes: [
      'Identifikasi aktif verbal & gelang pasien cocok (Nama, Tgl Lahir, No. RM)',
      'Verifikasi 2 identitas sesuai standar SKP 1 sebelum tindakan'
    ],
    description: 'IDENTIFIKASI PASIEN',
    standardSpo: 'Minimal 2 indikator identitas cocok sebelum memulai tindakan'
  },
  {
    code: '3.2',
    bagian: 3,
    bagianTitle: 'BAGIAN III: IDENTIFIKASI PASIEN, PENGKAJIAN PRE-HD & KESELAMATAN PASIEN (PATIENT SAFETY)',
    category: 'Berat Badan & Target Cairan',
    shortTitle: 'KAJI BERAT BADAN & TARGET CAIRAN',
    simpleGuide: 'Timbang berat badan pasien sebelum HD, hitung selisih kenaikan dari berat kering (IDWG), lalu tetapkan target penarikan cairan (UF Goal).',
    keyMetrics: ['IDWG Ideal < 3–5% BB Kering', 'Rumus UF = (BB Pre − BB Kering) + Intake Intra-HD'],
    notePlaceholder: 'Contoh: BB Pre 64.2 kg, BB Kering 61.5 kg, IDWG 2.7 kg, UF Goal 2700 mL',
    quickNotes: [
      'BB Pre & BB Kering ditimbang, target UF ditetapkan sesuai toleransi',
      'Kenaikan BB (IDWG) < 5%, perhitungan UF Goal telah diverifikasi'
    ],
    description: 'KAJI BERAT BADAN & TARGET CAIRAN',
    standardSpo: 'Target UF = (BB Pre - BB Kering) + estimasi intake cairan intra-HD'
  },
  {
    code: '3.3',
    bagian: 3,
    bagianTitle: 'BAGIAN III: IDENTIFIKASI PASIEN, PENGKAJIAN PRE-HD & KESELAMATAN PASIEN (PATIENT SAFETY)',
    category: 'Pemeriksaan Tanda Vital Pre-HD',
    shortTitle: 'MENGUKUR TTV PRE HD',
    simpleGuide: 'Periksa kondisi hemodinamik awal dan tanyakan keluhan sesak, bengkak, demam, atau pusing sebelum memulai penarikan cairan.',
    keyMetrics: ['TD Duduk/Berbaring', 'Nadi & RR', 'Suhu Tubuh & SpO2 ≥ 95%', 'Cek Edema / Sesak'],
    notePlaceholder: 'Contoh: TD 145/85 mmHg, Nadi 80x/m, Suhu 36.6°C, RR 20x/m, SpO2 98%',
    quickNotes: [
      'TD stabil, Nadi teratur, afebris, SpO2 98%, tidak ada sesak napas',
      'TTV pre-HD terdokumentasi lengkap, kondisi layak mulai dialisis'
    ],
    description: 'MENGUKUR TTV PRE HD',
    standardSpo: 'Mendeteksi dini hipertensi urgensi/hipotensi, demam, atau sesak napas (overload)'
  },
  {
    code: '3.4',
    bagian: 3,
    bagianTitle: 'BAGIAN III: IDENTIFIKASI PASIEN, PENGKAJIAN PRE-HD & KESELAMATAN PASIEN (PATIENT SAFETY)',
    category: 'Pencegahan Risiko Jatuh (SKP 6)',
    shortTitle: 'ASESMEN RISIKO JATUH',
    simpleGuide: 'Nilai risiko jatuh pasien (Skala Morse / Get Up & Go), pasang penanda kuning bila berisiko, dan pastikan pagar pengaman bed terkunci.',
    keyMetrics: ['Skor Morse < 25 (Rendah) / ≥ 45 (Tinggi)', 'Pagar Bed (Bed Rail) Terpasang', 'Roda Bed Terkunci'],
    notePlaceholder: 'Contoh: Risiko jatuh rendah (Morse 15), pagar pengaman bed terpasang rapat',
    quickNotes: [
      'Risiko jatuh rendah, roda bed terkunci & pagar pengaman terpasang',
      'Risiko jatuh sedang/tinggi: penanda kuning aktif & bed rail terkunci rapat'
    ],
    description: 'ASESMEN RISIKO JATUH',
    standardSpo: 'Zero insiden pasien jatuh di unit hemodialisis, bed rail terpasang rapat'
  },
  {
    code: '3.5',
    bagian: 3,
    bagianTitle: 'BAGIAN III: IDENTIFIKASI PASIEN, PENGKAJIAN PRE-HD & KESELAMATAN PASIEN (PATIENT SAFETY)',
    category: 'Konfirmasi Resep HD (Time-Out)',
    shortTitle: 'KONFIRMASI RESEP HD (TIME, UF GOAL, QB & DOSIS HEPARIN)',
    simpleGuide: 'Lakukan konfirmasi ulang pengaturan mesin dengan instruksi dokter: lama jam HD, kecepatan aliran darah (QB/QD), target UF, dan dosis heparin.',
    keyMetrics: ['Durasi Jam HD', 'QB 200–250 mL/mnt · QD 500 mL/mnt', 'Target UF & Dosis Antikoagulan'],
    notePlaceholder: 'Contoh: Time-out 4 jam, QB 220 mL/m, QD 500 mL/m, Heparin sesuai advis',
    quickNotes: [
      'Time-out double check resep HD selesai: Durasi 4 jam, QB 220, QD 500',
      'Parameter durasi, QB, QD, UF Goal & antikoagulan sesuai instruksi DPJP'
    ],
    description: 'KONFIRMASI RESEP HD (TIME, UF GOAL, QB & DOSIS HEPARIN)',
    standardSpo: 'Cek silang (double check) resep HD bersama perawat partner'
  },
  {
    code: '3.6',
    bagian: 3,
    bagianTitle: 'BAGIAN III: IDENTIFIKASI PASIEN, PENGKAJIAN PRE-HD & KESELAMATAN PASIEN (PATIENT SAFETY)',
    category: 'Akses Vaskular Aseptik',
    shortTitle: 'KAJI PATENSI AKSES VASKULAR',
    simpleGuide: 'Raba getaran thrill & dengarkan bruit pada AV Fistula sebelum kanulasi steril, atau periksa kebersihan exit-site kateter CDL dari tanda infeksi.',
    keyMetrics: ['AVF: Thrill & Bruit Kuat (+)', 'CDL: Exit-Site Kering Tanpa Pus/Kemerahan', 'Desinfeksi Steril'],
    notePlaceholder: 'Contoh: AVF sinistra thrill kuat (+), kanulasi teknik aseptik lancar',
    quickNotes: [
      'AV Fistula thrill & bruit kuat (+), kanulasi aseptik lancar sekali tusuk',
      'CDL exit-site bersih tanpa tanda infeksi, perawatan & koneksi hub steril'
    ],
    description: 'KAJI PATENSI AKSES VASKULAR',
    standardSpo: 'Aseptik kanulasi AVF (teknik rope ladder/buttonhole) atau desinfeksi hub CDL steril'
  },

  // ==================== BAGIAN IV ====================
  {
    code: '4.1',
    bagian: 4,
    bagianTitle: 'BAGIAN IV: MONITORING INTRA-HD & PENCEGAHAN INSIDEN KESELAMATAN PASIEN (IKP)',
    category: 'Observasi Berkala Intra-HD',
    shortTitle: 'OBSERVASI TTV DAN KELUHAN PASIEN INTRA HD',
    simpleGuide: 'Catat tekanan darah, nadi, keluhan pasien, serta angka tekanan mesin dan progres penarikan cairan (UF) secara rutin setiap jam.',
    keyMetrics: ['Interval Cek: Tiap 30–60 Menit', 'Pantau TD & Nadi', 'Catat AP · VP · TMP · Volume UF Tercapai'],
    notePlaceholder: 'Contoh: Observasi tiap 60 menit lancar, TD stabil 130–140/80 mmHg, UF sesuai target',
    quickNotes: [
      'Observasi tiap jam lengkap, TD stabil 130–140 mmHg, progres UF sesuai jadwal',
      'TTV & parameter mesin dipantau tiap 30 menit, hemodinamik stabil'
    ],
    description: 'OBSERVASI TTV DAN KELUHAN PASIEN INTRA HD',
    standardSpo: 'Dokumentasi di lembar monitoring HD setiap jam secara akurat dan tepat waktu'
  },
  {
    code: '4.2',
    bagian: 4,
    bagianTitle: 'BAGIAN IV: MONITORING INTRA-HD & PENCEGAHAN INSIDEN KESELAMATAN PASIEN (IKP)',
    category: 'Keamanan Sirkuit & Alarm Mesin',
    shortTitle: 'PANTAU ALARM MESIN INTRA HD',
    simpleGuide: 'Pastikan grafik tekanan arteri-vena dalam batas wajar, selang tidak terlipat (kinking), dan segera tangani bila bunyi alarm muncul.',
    keyMetrics: ['Respon Alarm < 1 Menit', 'AP & VP Stabil (Tanpa Kinking)', 'Dilarang Bypass Alarm Keamanan'],
    notePlaceholder: 'Contoh: AP -120 mmHg, VP +110 mmHg, TMP 85 mmHg stabil, alarm aktif normal',
    quickNotes: [
      'Tekanan sirkuit stabil (AP -120, VP +110, TMP 90), tidak ada alarm error',
      'Aliran darah lancar tanpa kinking, detektor gelembung udara & blood leak aman'
    ],
    description: 'PANTAU ALARM MESIN INTRA HD',
    standardSpo: 'Waktu respon alarm < 1 menit, tidak mematikan alarm keamanan mesin'
  },
  {
    code: '4.3',
    bagian: 4,
    bagianTitle: 'BAGIAN IV: MONITORING INTRA-HD & PENCEGAHAN INSIDEN KESELAMATAN PASIEN (IKP)',
    category: 'Deteksi & Penanganan Komplikasi',
    shortTitle: 'PENANGANAN KOMPLIKASI INTRA HD',
    simpleGuide: 'Waspadai tanda awal pusing, keringat dingin, mual, kram betis, atau bekuan darah di dialyzer, lalu lakukan tindakan sesuai SOP.',
    keyMetrics: ['Pantau Hipotensi / Kram / Mual', 'Cek Warna Serat Dialyzer (Clotting)', 'Bolus NaCl / Turunkan UFR Sesuai SOP'],
    notePlaceholder: 'Contoh: Tidak ada hipotensi/kram/mual, serat dialyzer bersih tanpa clotting',
    quickNotes: [
      'Toleransi HD baik, tidak ada keluhan hipotensi, kram otot, maupun mual',
      'Sempat kram ringan/hipotensi: ditangani posisi datar, turunkan UFR & observasi ketat'
    ],
    description: 'PENANGANAN KOMPLIKASI INTRA HD',
    standardSpo: 'Intervensi posisi trendelenburg, bolus NaCl 0.9% sesuai advis, penurunan UFR'
  },
  {
    code: '4.4',
    bagian: 4,
    bagianTitle: 'BAGIAN IV: MONITORING INTRA-HD & PENCEGAHAN INSIDEN KESELAMATAN PASIEN (IKP)',
    category: 'Pencegahan Jarum Terlepas',
    shortTitle: 'OBSERVASI PATENSI AKSES',
    simpleGuide: 'Periksa plester pengikat jarum fistula/kateter secara berkala dan pastikan lengan akses tidak tertutup selimut agar perdarahan langsung terlihat.',
    keyMetrics: ['Plester Kupu-Kupu/Fiksasi Kuat', 'Area Insersi Terbuka (Tidak Tertutup Selimut)', 'Sambungan Luer-Lock Kencang'],
    notePlaceholder: 'Contoh: Fiksasi jarum AVF kokoh, lengan akses terbuka mudah terpantau',
    quickNotes: [
      'Fiksasi kanula kuat & area jarum terbuka jelas (tidak tertutup selimut)',
      'Koneksi luer-lock CDL kencang, balutan kering dan terpantau aman'
    ],
    description: 'OBSERVASI PATENSI AKSES',
    standardSpo: 'Penerapan standar keselamatan: area insersi jarum tetap terlihat terbuka (visible)'
  },

  // ==================== BAGIAN V ====================
  {
    code: '5.1',
    bagian: 5,
    bagianTitle: 'BAGIAN V: EDUKASI TERSTRUKTUR KEPADA PASIEN & KELUARGA (DIET, CAIRAN, KEBERSIHAN DIRI)',
    category: 'Manajemen Cairan Harian',
    shortTitle: 'EDUKASI PEMBATASAN ASUPAN CAIRAN HARIAN',
    simpleGuide: 'Jelaskan cara menghitung batas minum sehari (termasuk kuah sayur/buah berair) agar kenaikan berat badan antar sesi HD tetap aman.',
    keyMetrics: ['Kuota Minum = Urin 24 Jam + 500 mL', 'Target Kenaikan BB (IDWG) < 5%', 'Kiat Mengurangi Rasa Haus'],
    notePlaceholder: 'Contoh: Pasien paham kuota minum maks 600 mL/hari & batasi makanan berkuah',
    quickNotes: [
      'Edukasi kuota minum harian (urin 24 jam + 500 mL) & kiat atasi haus dipahami',
      'Pasien & keluarga mampu menyebutkan batas kenaikan BB maksimal antar sesi HD'
    ],
    description: 'EDUKASI PEMBATASAN ASUPAN CAIRAN HARIAN',
    standardSpo: 'Pasien/keluarga mampu menyebutkan batas kuota minum & target kenaikan BB < 5%'
  },
  {
    code: '5.2',
    bagian: 5,
    bagianTitle: 'BAGIAN V: EDUKASI TERSTRUKTUR KEPADA PASIEN & KELUARGA (DIET, CAIRAN, KEBERSIHAN DIRI)',
    category: 'Nutrisi & Diet Ginjal',
    shortTitle: 'EDUKASI DIET GAGAL GINJAL KRONIK',
    simpleGuide: 'Arahkan pasien memilih lauk protein baik (putih telur/ikan segar) serta membatasi garam, buah tinggi kalium, dan makanan kemasan tinggi fosfat.',
    keyMetrics: ['Anjuran: Putih Telur & Ikan Segar', 'Batasi Kalium (Pisang, Air Kelapa, Alpukat)', 'Kurangi Garam & Makanan Kaleng'],
    notePlaceholder: 'Contoh: KIE konsumsi putih telur & batasi pisang/air kelapa/makanan asin dipahami',
    quickNotes: [
      'KIE diet rendah garam, pantangan buah tinggi kalium & anjuran putih telur dipahami',
      'Pasien memahami cara merebus sayuran & menghindari minuman kemasan tinggi fosfat'
    ],
    description: 'EDUKASI DIET GAGAL GINJAL KRONIK',
    standardSpo: 'Pasien memahami pantangan makanan tinggi kalium (pisang, air kelapa, dll.) & fosfat'
  },
  {
    code: '5.3',
    bagian: 5,
    bagianTitle: 'BAGIAN V: EDUKASI TERSTRUKTUR KEPADA PASIEN & KELUARGA (DIET, CAIRAN, KEBERSIHAN DIRI)',
    category: 'Kebersihan Diri & Luka Akses',
    shortTitle: 'EDUKASI PERSONAL HYGIENE',
    simpleGuide: 'Ingatkan pasien menjaga kebersihan kulit, mencuci lengan fistula sebelum HD berikutnya, dan menjaga plester/balutan CDL tidak basah saat mandi.',
    keyMetrics: ['Balutan Bekas Tusukan Kering 24 Jam', 'CDL Tidak Boleh Basah Saat Mandi', 'Dilarang Menggaruk Area Akses'],
    notePlaceholder: 'Contoh: Edukasi jaga balutan tetap kering 24 jam & cuci lengan dengan sabun',
    quickNotes: [
      'Edukasi jaga plester bekas tusukan AVF tetap kering & bersih pasca-HD',
      'Edukasi pelindung mandi agar balutan kateter CDL tidak terkena air'
    ],
    description: 'EDUKASI PERSONAL HYGIENE',
    standardSpo: 'Eksit site CDL & AV Shunt terbebas dari infeksi dan kontaminasi air saat mandi'
  },
  {
    code: '5.4',
    bagian: 5,
    bagianTitle: 'BAGIAN V: EDUKASI TERSTRUKTUR KEPADA PASIEN & KELUARGA (DIET, CAIRAN, KEBERSIHAN DIRI)',
    category: 'Perlindungan Akses di Rumah',
    shortTitle: 'EDUKASI PERAWATAN AKSES VASKULAR',
    simpleGuide: 'Latih pasien meraba getaran aliran darah (thrill) setiap hari dan ingatkan larangan tensi, ambil darah, atau angkat berat pada lengan akses.',
    keyMetrics: ['Cek Getaran Thrill Pagi & Malam', 'Lengan Akses Bebas Tensi / Ambil Darah', 'Hindari Beban > 5 kg & Tertindih Tidur'],
    notePlaceholder: 'Contoh: Pasien mampu meraba thrill mandiri & paham larangan tensi di lengan AVF',
    quickNotes: [
      'Pasien mampu meraba getaran thrill Cimino mandiri & paham larangan di lengan akses',
      'Keluarga paham tanda bahaya akses (perdarahan/bengkak/thrill hilang) harus segera ke IGD'
    ],
    description: 'EDUKASI PERAWATAN AKSES VASKULAR',
    standardSpo: 'Pasien mampu meraba getaran thrill Cimino sendiri setiap pagi dan malam hari'
  },
  {
    code: '5.5',
    bagian: 5,
    bagianTitle: 'BAGIAN V: EDUKASI TERSTRUKTUR KEPADA PASIEN & KELUARGA (DIET, CAIRAN, KEBERSIHAN DIRI)',
    category: 'Obat Rutin & Kepatuhan Jadwal',
    shortTitle: 'EDUKASI TATALAKSANA KONSUMSI OBAT & KEPATUHAN HD RUTIN',
    simpleGuide: 'Pastikan pasien tahu cara mengonsumsi obat pengikat fosfat tepat bersama makan serta hadir rutin sesuai jadwal HD tanpa menunda sesi.',
    keyMetrics: ['Pengikat Fosfat Diminum Bersama Suapan Makan', 'Obat Tensi Sesuai Advis', 'Hadir Tepat Jadwal HD 2–3x/Minggu'],
    notePlaceholder: 'Contoh: Edukasi CaCO3 dikunyah bersama makan & komitmen hadir jadwal HD berikutnya',
    quickNotes: [
      'Edukasi obat pengikat fosfat dikunyah bersama makan & disiplin jadwal HD rutin',
      'Evaluasi metode Teach-Back lulus: pasien paham jadwal HD & aturan minum obat'
    ],
    description: 'EDUKASI TATALAKSANA KONSUMSI OBAT & KEPATUHAN HD RUTIN',
    standardSpo: 'Kepatuhan jadwal HD 2x/3x seminggu dan cara konsumsi obat pengikat fosfat tepat'
  },

  // ==================== BAGIAN VI ====================
  {
    code: '6.1',
    bagian: 6,
    bagianTitle: 'BAGIAN VI: TERMINASI AMAN, EVALUASI POST-HD, DISINFEKSI MESIN & PENDOKUMENTASIAN',
    category: 'Terminasi & Reinfusi Sirkuit',
    shortTitle: 'Terminasi HD Aman (Washback)',
    simpleGuide:
      'Mengembalikan darah dari sirkuit ke tubuh pasien (washback/reinfusi) menggunakan NaCl 0.9% secara perlahan dan aman tanpa udara masuk ke vaskular.',
    keyMetrics: ['Darah Kembali Bersih Sempurna', 'Bilas NaCl 0.9% Aseptik', 'Bebas Gelembung Udara'],
    notePlaceholder: 'Contoh: Washback NaCl 0.9% lancar, sirkuit bersih sempurna, bebas udara',
    quickNotes: [
      'Washback NaCl 0.9% tuntas, sirkuit bersih sempurna, bebas emboli udara',
      'Terminasi HD aman sesuai SPO, aliran darah kembali penuh tanpa komplikasi'
    ],
    description: 'Terminasi HD Aman (Washback)',
    standardSpo: 'Darah kembali bersih sempurna, sirkuit darah dibilas tuntas, udara dicegah total'
  },
  {
    code: '6.2',
    bagian: 6,
    bagianTitle: 'BAGIAN VI: TERMINASI AMAN, EVALUASI POST-HD, DISINFEKSI MESIN & PENDOKUMENTASIAN',
    category: 'Kontrol Perdarahan Akses Vaskular',
    shortTitle: 'Hemostasis & Balut Tekan Akses',
    simpleGuide:
      'Melakukan penekanan luka bekas kanulasi (hemostasis) secara tepat 10–15 menit hingga perdarahan berhenti, lalu memasang balut tekan tanpa mematikan desiran thrill AVF.',
    keyMetrics: ['Penekanan 10–15 Menit', 'Perdarahan Berhenti Tuntas', 'Thrill AVF Tetap Kuat'],
    notePlaceholder: 'Contoh: Hemostasis 10 menit tuntas, balut tekan aman, thrill AVF kuat',
    quickNotes: [
      'Hemostasis kanulasi tuntas tanpa hematoma, thrill AVF tetap teraba kuat',
      'Heparin lock & penutupan exit site CDL steril kering sesuai SPO'
    ],
    description: 'Hemostasis & Balut Tekan Akses',
    standardSpo: 'Perdarahan berhenti tuntas, tidak terjadi hematoma/pseudoaneurisma, thrill tetap kuat'
  },
  {
    code: '6.3',
    bagian: 6,
    bagianTitle: 'BAGIAN VI: TERMINASI AMAN, EVALUASI POST-HD, DISINFEKSI MESIN & PENDOKUMENTASIAN',
    category: 'Evaluasi Hemodinamik & Berat Badan Akhir',
    shortTitle: 'Evaluasi TTV & Berat Badan Post-HD',
    simpleGuide:
      'Mengukur tanda vital post-HD dan menimbang berat badan post-HD untuk mengevaluasi tercapainya berat badan kering (Dry Weight) dan toleransi hemodinamik.',
    keyMetrics: ['TTV Post-HD Stabil', 'Bebas Hipotensi Ortostatik', 'Evaluasi Capaian BB Kering'],
    notePlaceholder: 'Contoh: TD Post 125/80 mmHg stabil, BB Post sesuai target BB kering',
    quickNotes: [
      'TTV post-HD stabil tanpa hipotensi ortostatik, BB post-HD mendekati BB kering',
      'Hemodinamik post-HD stabil, pasien layak pulang / kembali ke ruang rawat'
    ],
    description: 'Evaluasi TTV & Berat Badan Post-HD',
    standardSpo: 'TTV stabil (tidak ada hipotensi ortostatik), selisih BB mendekati dry weight'
  },
  {
    code: '6.4',
    bagian: 6,
    bagianTitle: 'BAGIAN VI: TERMINASI AMAN, EVALUASI POST-HD, DISINFEKSI MESIN & PENDOKUMENTASIAN',
    category: 'Dekontaminasi & Sterilisasi Mesin',
    shortTitle: 'Disinfeksi Mesin HD (Heat / Chemical)',
    simpleGuide:
      'Melakukan siklus disinfeksi mesin HD (Heat Disinfection / Chemical Citric/Bleach sesuai SOP) serta dekontaminasi permukaan mesin segera setelah sirkuit dilepas dari pasien.',
    keyMetrics: ['Siklus Heat / Chemical Selesai', 'Permukaan Mesin Didesinfeksi', 'Siap Shift Berikutnya'],
    notePlaceholder: 'Contoh: Heat disinfection selesai tuntas, permukaan mesin didesinfeksi',
    quickNotes: [
      'Siklus Heat Disinfection tuntas (Done), permukaan mesin telah didesinfeksi',
      'Chemical disinfection sesuai protokol selesai, mesin siap pakai berikutnya'
    ],
    description: 'Disinfeksi Mesin HD (Heat / Chemical)',
    standardSpo: 'Siklus disinfeksi komplit (Done), siap digunakan untuk shift/pasien berikutnya'
  },
  {
    code: '6.5',
    bagian: 6,
    bagianTitle: 'BAGIAN VI: TERMINASI AMAN, EVALUASI POST-HD, DISINFEKSI MESIN & PENDOKUMENTASIAN',
    category: 'Rekam Medis & Legalitas Asuhan',
    shortTitle: 'Dokumentasi Asuhan & Rekam Medis (CPPT)',
    simpleGuide:
      'Mendokumentasikan seluruh asuhan keperawatan HD (SOAP/CPPT, lembar monitoring, penggunaan obat/cairan, dan laporan insiden bila ada) secara lengkap dan legal.',
    keyMetrics: ['CPPT / SOAP Lengkap', 'Lembar Monitoring Terisi', 'Tanda Tangan & Nama Terang'],
    notePlaceholder: 'Contoh: CPPT SOAP, lembar observasi HD & pemakaian alkes terdokumentasi lengkap',
    quickNotes: [
      'CPPT SOAP & lembar observasi HD lengkap ditandatangani di rekam medis',
      'Seluruh dokumentasi asuhan, pemakaian BHP/obat & serah terima lengkap'
    ],
    description: 'Dokumentasi Asuhan & Rekam Medis (CPPT)',
    standardSpo: 'Dokumentasi ditandatangani perawat penanggung jawab & dokter jaga dalam 1x24 jam'
  }
];

export interface InitialOfficialLogbookOptions {
  nurseName?: string;
  nipNira?: string;
  shift?: 'Pagi' | 'Siang' | 'Malam';
  headNurseName?: string;
  headNurseNip?: string;
}

/**
 * Creates initial monthly logbook state for October 2026 without built-in nurse names
 */
export function createInitialOfficialLogbook(
  options?: InitialOfficialLogbookOptions
): OfficialNurseLogbookMonth {
  const checks: Record<string, boolean[]> = {};
  const notes: Record<string, string> = {};

  OFFICIAL_LOGBOOK_ITEMS.forEach(item => {
    // 31 days in October
    const dayChecks = new Array(31).fill(false);

    // Duty days up to current date
    for (let day = 1; day <= 20; day++) {
      if (day % 7 !== 4) {
        dayChecks[day - 1] = true;
      }
    }
    checks[item.code] = dayChecks;
    notes[item.code] = 'SPO Terlaksana 100%';
  });

  const resolvedNurseName =
    options?.nurseName && options.nurseName !== '-' ? options.nurseName : '-';
  const resolvedHeadNurseName =
    options?.headNurseName && options.headNurseName !== '-' ? options.headNurseName : '-';

  const liveWib = getWibDateParts();
  const stamp = formatShortIndonesianTimestampWib();

  return {
    nurseName: resolvedNurseName,
    nipNira: options?.nipNira || '-',
    unitName: 'Unit Hemodialisis (Dialysis Center)',
    monthYear: `${liveWib.monthName} / ${liveWib.year}`,
    pkLevel: 'PK III Dialisis',
    shift: options?.shift || 'Pagi',
    checks,
    notes,
    nurseSigned: Boolean(resolvedNurseName !== '-'),
    nurseSignedAt: resolvedNurseName !== '-' ? stamp : '',
    headNurseName: resolvedHeadNurseName,
    headNurseNip: options?.headNurseNip || '-',
    headNurseSigned: Boolean(resolvedHeadNurseName !== '-'),
    headNurseSignedAt: resolvedHeadNurseName !== '-' ? stamp : ''
  };
}

/**
 * Helper to compute count and percentage for an item
 */
export function computeItemTotalAndPct(checks: boolean[], totalWorkingDays: number = 20) {
  const total = checks.filter(Boolean).length;
  const pct = totalWorkingDays > 0 ? Number(((total / totalWorkingDays) * 100).toFixed(1)) : 0;
  return { total, pct };
}

/**
 * Helper to compute sum of executed activities on a specific day (1-31)
 */
export function computeDailyActivitiesCount(checksMap: Record<string, boolean[]>, dayIndex: number): number {
  let count = 0;
  Object.values(checksMap).forEach(arr => {
    if (arr && arr[dayIndex]) count++;
  });
  return count;
}
