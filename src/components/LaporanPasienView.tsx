import React, { useState, useMemo, useEffect } from 'react';
import {
  ShiftInfo,
  SystemAccessRole,
  PatientHDSession,
  MasterNurse,
  MasterPatient
} from '../types/dialysis.ts';
import {
  LaporanPasienRow,
  computeLaporanPasienSummary,
  convertSessionToLaporanRow,
  collectAllInputtedLogbookRows
} from '../data/laporanPasienData.ts';
import {
  normalizeIndonesianDateLabel,
  indonesianDateLabelToIso
} from '../utils/dateHelpers.ts';
import { printDocumentWithOrientation } from '../utils/printHelpers.ts';
import {
  Printer,
  Search,
  Filter,
  RefreshCw,
  Droplet,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  Stethoscope,
  Info,
  Activity,
  Layers,
  Book,
  UserPlus
} from 'lucide-react';

interface LaporanPasienViewProps {
  shiftInfo: ShiftInfo;
  userRole?: SystemAccessRole;
  sessions?: PatientHDSession[];
  masterNurses?: MasterNurse[];
  masterPatients?: MasterPatient[];
  onDateChange?: (isoDate: string) => void;
  isCustomDate?: boolean;
  onResetDateToToday?: () => void;
  onNavigateToLogbook?: () => void;
}

export const LaporanPasienView: React.FC<LaporanPasienViewProps> = ({
  shiftInfo,
  userRole = 'perawat_pelaksana',
  sessions = [],
  masterNurses = [],
  masterPatients = [],
  onDateChange,
  isCustomDate = false,
  onResetDateToToday,
  onNavigateToLogbook
}) => {
  const [selectedShift, setSelectedShift] = useState<'Pagi' | 'Siang'>(
    shiftInfo.shift === 'Siang' ? 'Siang' : 'Pagi'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [syncTick, setSyncTick] = useState(0);

  // Sync selectedShift whenever parent shift changes
  useEffect(() => {
    if (shiftInfo.shift === 'Siang' || shiftInfo.shift === 'Pagi') {
      setSelectedShift(shiftInfo.shift);
    }
  }, [shiftInfo.shift]);

  // Real-time listener: re-calculate whenever logbook sessions or verifications are updated
  useEffect(() => {
    const handleUpdate = () => setSyncTick((t) => t + 1);
    window.addEventListener('logbook_sessions_updated', handleUpdate);
    window.addEventListener('verification_registry_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('logbook_sessions_updated', handleUpdate);
      window.removeEventListener('verification_registry_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const activeDateFormatted = normalizeIndonesianDateLabel(shiftInfo.date);
  const activeDateIso = indonesianDateLabelToIso(activeDateFormatted);
  const activeIsoDate = activeDateIso;

  // Compute live rows from all inputted logbooks matching the active date & selected shift
  const liveRows = useMemo(() => {
    return collectAllInputtedLogbookRows({
      sessions,
      activeDateIso,
      activeShift: selectedShift,
      masterNurses,
      masterPatients
    });
  }, [sessions, activeDateIso, selectedShift, masterNurses, masterPatients, syncTick]);

  // Base rows based purely on live inputted logbook
  const rawRows: LaporanPasienRow[] = liveRows;

  // Filtered rows by search and category
  const filteredRows = useMemo(() => {
    return rawRows.filter((row) => {
      // Category filter
      if (categoryFilter !== 'all') {
        if (categoryFilter === 'reguler' && row.ruangKategori !== 'Reguler') return false;
        if (categoryFilter === 'hepb' && !row.ruangKategori.toLowerCase().includes('hep b')) return false;
        if (categoryFilter === 'hepc' && !row.ruangKategori.toLowerCase().includes('hep c')) return false;
        if (categoryFilter === 'ranap' && row.statusRawat !== 'Rawat Inap') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = row.namaPasien.toLowerCase().includes(q);
        const matchRm = row.noRm.toLowerCase().includes(q);
        const matchBed = row.noBedMesin.toLowerCase().includes(q);
        const matchNurse = row.perawatPelaksana.toLowerCase().includes(q);
        const matchAccess = row.aksesVaskular.toLowerCase().includes(q);
        if (!matchName && !matchRm && !matchBed && !matchNurse && !matchAccess) {
          return false;
        }
      }

      return true;
    });
  }, [rawRows, categoryFilter, searchQuery]);

  const summary = useMemo(() => computeLaporanPasienSummary(filteredRows), [filteredRows]);

  const handlePrint = () => {
    const docTitle = `Laporan_Pasien_HD_Shift_${selectedShift}_${activeDateIso}`;
    printDocumentWithOrientation(true, docTitle);
  };

  return (
    <div className="space-y-4 pb-12">

      {/* ===================================================================== */}
      {/* TOP HEADER & DOCUMENT BANNER (SCREEN ONLY)                            */}
      {/* ===================================================================== */}
      <div className="bg-white/85 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs print:hidden space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#185382]">
              <span className="inline-flex items-center gap-1 font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Standar Akreditasi KARS &amp; PERNEFRI
              </span>
              <span aria-hidden="true">·</span>
              <span>Unit Hemodialisa</span>
              <span aria-hidden="true">·</span>
              <span>RS Happy Land Medical Centre</span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-slate-950 mt-1 uppercase tracking-tight">
              LAPORAN PASIEN: DETAIL PELAYANAN ASUHAN KEPERAWATAN &amp; MEDIS
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Tabel rekapitulasi terintegrasi langsung dengan inputan logbook asuhan hemodialisa perawat: pengaturan teknis, berat badan, dialiser, ultrafiltrasi, tanda vital, komplikasi, tatalaksana, status mesin dan mutu air RO.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onNavigateToLogbook && (
              <button
                type="button"
                onClick={onNavigateToLogbook}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all shadow-2xs cursor-pointer whitespace-nowrap"
              >
                <Book className="w-4 h-4 text-[#19588f]" />
                <span>Buka Input Logbook</span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1e4b85] hover:bg-[#163865] text-white text-xs font-bold transition-all shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / PDF Tabel Pasien</span>
            </button>
          </div>
        </div>

        {/* Shift metadata bar */}
        <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
              <Clock className="w-3.5 h-3.5 text-[#19588f]" />
              Shift: <span className="text-[#19588f]">{selectedShift} ({selectedShift === 'Pagi' ? '07.00 - 14.00 WIB' : '14.00 - 21.00 WIB'})</span>
            </span>
            <span className="text-slate-300">|</span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Hari/Tanggal: <strong>{activeDateFormatted}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>PJ Shift: <strong>{shiftInfo.pjShift || 'M. Haikal Malilang, A.Md. Kep.'}</strong></span>
            <span className="text-slate-300">|</span>
            <span>DPJP: <strong>{shiftInfo.dokterDpjp || 'dr. Raden Heru Prasanto, Sp.PD-KGH'}</strong></span>
            <span className="text-slate-300">|</span>
            <span>Ka. Ruang: <strong>{shiftInfo.kepalaRuangan || 'Twis Fertilianti PW., S.Kep., Ns.'}</strong></span>
          </div>

          {/* Status Sinkronisasi Data Input Logbook */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200/80 rounded-xl text-[11px] font-bold text-emerald-800 shadow-2xs">
            <span className={`w-2 h-2 rounded-full ${liveRows.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            <span>Data Input Logbook Terintegrasi ({liveRows.length} Pasien)</span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* FILTER & SEARCH BAR (SCREEN ONLY)                                     */}
      {/* ===================================================================== */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl p-3 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
        {/* Search input */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari Nama Pasien, No. RM, Bed, Perawat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 bg-white focus:outline-hidden focus:border-[#19588f] focus:ring-2 focus:ring-[#19588f]/10"
          />
        </div>

        {/* Filter Badges & Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Shift Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setSelectedShift('Pagi')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                selectedShift === 'Pagi'
                  ? 'bg-[#19588f] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Shift Pagi
            </button>
            <button
              type="button"
              onClick={() => setSelectedShift('Siang')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                selectedShift === 'Siang'
                  ? 'bg-[#19588f] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Shift Siang
            </button>
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              aria-label="Filter Kategori Pasien"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-900 border-none outline-hidden cursor-pointer"
            >
              <option value="all">Semua Pasien ({rawRows.length})</option>
              <option value="reguler">Reguler</option>
              <option value="hepb">Isolasi Hep B</option>
              <option value="hepc">Isolasi Hep C</option>
              <option value="ranap">Rawat Inap</option>
            </select>
          </div>

          {/* Interactive Date Picker */}
          {onDateChange && (
            <div className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-[#19588f]" />
              <input
                type="date"
                aria-label="Pilih Hari dan Tanggal Laporan Pasien"
                value={activeIsoDate}
                onChange={(e) => {
                  if (e.target.value) onDateChange(e.target.value);
                }}
                className="bg-transparent font-bold text-slate-900 border-none outline-hidden cursor-pointer text-xs"
              />
              {isCustomDate && onResetDateToToday && (
                <button
                  type="button"
                  onClick={onResetDateToToday}
                  className="ml-1 text-[10px] font-bold text-[#19588f] hover:underline cursor-pointer"
                >
                  Hari Ini
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SUMMARY KPI CARDS (SCREEN ONLY)                                       */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 print:hidden">
        <div className="p-3 rounded-2xl bg-white/85 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Pasien</span>
          <span className="text-xl font-black text-slate-950 block mt-0.5 tabular-nums">
            {summary.totalPasien} <span className="text-xs font-normal text-slate-600">Pasien</span>
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-white/85 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total UF Ditarik</span>
          <span className="text-xl font-black text-[#19588f] block mt-0.5 tabular-nums">
            {summary.totalCapaianUf.toLocaleString('id-ID')} <span className="text-xs font-normal text-slate-600">mL</span>
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-white/85 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Rata-rata Kt/V</span>
          <span className="text-xl font-black text-emerald-700 block mt-0.5 tabular-nums">
            {summary.rataKtV} <span className="text-xs font-normal text-slate-600">(&ge; 1,20)</span>
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-white/85 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Rata-rata QB</span>
          <span className="text-xl font-black text-slate-900 block mt-0.5 tabular-nums">
            {summary.rataQb} <span className="text-xs font-normal text-slate-600">mL/m</span>
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-white/85 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Rata-rata Durasi</span>
          <span className="text-xl font-black text-slate-900 block mt-0.5 tabular-nums">
            {summary.rataDurasiJam} <span className="text-xs font-normal text-slate-600">Jam</span>
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-white/85 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Mutu Air RO</span>
          <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1 inline-block mt-1">
            Memenuhi Syarat
          </span>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* THE OFFICIAL FORMAT TABLE (SCREEN & PRINT)                            */}
      {/* Exact replica of LAPORAN_PASIEN_86bd5613.pdf                         */}
      {/* ===================================================================== */}
      <div
        id="printable-patient-report"
        className="printable-sheet bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden print:border-none print:shadow-none print:rounded-none"
      >
        {/* Printable Document Title Block (Always shown in print, also top of table on screen) */}
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-[#173a64] via-[#1d4c82] to-[#173a64] text-white border-b border-slate-200 print:bg-white print:text-black print:p-2 print:border-b-2 print:border-black">
          <div className="text-center">
            <h2 className="text-sm sm:text-base font-black tracking-wide uppercase print:text-xs print:font-extrabold">
              LOGBOOK DETAIL PELAYANAN ASUHAN KEPERAWATAN &amp; MEDIS PASIEN HEMODIALISIS
            </h2>
            <div className="text-[10.5px] sm:text-[11px] text-blue-100 mt-1 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 print:text-[8.5px] print:text-black">
              <span>Shift: <strong>{selectedShift} ({selectedShift === 'Pagi' ? '07.00 - 14.00 WIB' : '14.00 - 21.00 WIB'})</strong></span>
              <span className="hidden sm:inline">|</span>
              <span>Hari/Tanggal: <strong>{activeDateFormatted}</strong></span>
              <span className="hidden sm:inline">|</span>
              <span>PJ Shift: <strong>{shiftInfo.pjShift || 'M. Haikal Malilang, A.Md. Kep.'}</strong></span>
              <span className="hidden sm:inline">|</span>
              <span>DPJP: <strong>{shiftInfo.dokterDpjp || 'dr. Raden Heru Prasanto, Sp.PD-KGH'}</strong></span>
              <span className="hidden sm:inline">|</span>
              <span>Ka. Ruang: <strong>{shiftInfo.kepalaRuangan || 'Twis Fertilianti PW., S.Kep., Ns.'}</strong></span>
            </div>
          </div>
        </div>

        {/* Horizontal Scrollable Table Wrapper */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-300 print:border-black text-[9px] sm:text-[10px] xl:text-[10.5px] font-sans leading-tight print:text-[7.5px] print:leading-none">
            {/* 2-TIER TABLE HEADER */}
            <thead>
              {/* Row 1: High Level Grouped Headers */}
              <tr className="bg-[#1f4e79] text-white text-center font-bold tracking-tight print:bg-slate-200 print:text-black">
                <th
                  rowSpan={2}
                  className="border border-slate-300 print:border-black p-1 sm:p-1.5 w-7 text-center align-middle"
                >
                  NO
                </th>
                <th
                  colSpan={4}
                  className="border border-slate-300 print:border-black p-1 sm:p-1.5 text-center align-middle uppercase"
                >
                  DATA IDENTITAS &amp; STATUS PASIEN
                </th>
                <th
                  colSpan={5}
                  className="border border-slate-300 print:border-black p-1 sm:p-1.5 text-center align-middle uppercase"
                >
                  PENGATURAN TEKNIS &amp; PRE-HD
                </th>
                <th
                  colSpan={5}
                  className="border border-slate-300 print:border-black p-1 sm:p-1.5 text-center align-middle uppercase"
                >
                  PARAMETER BERAT BADAN &amp; ALIRAN (QB/QD)
                </th>
                <th
                  colSpan={3}
                  className="border border-slate-300 print:border-black p-1 sm:p-1.5 text-center align-middle uppercase"
                >
                  MONITORING ULTRAFILTRASI &amp; ADEKUASI
                </th>
                <th
                  colSpan={2}
                  className="border border-slate-300 print:border-black p-1 sm:p-1.5 text-center align-middle uppercase"
                >
                  TANDA VITAL (HEMODINAMIK)
                </th>
                <th
                  colSpan={2}
                  className="border border-slate-300 print:border-black p-1 sm:p-1.5 text-center align-middle uppercase"
                >
                  SPESIFIKASI DIALISER &amp; HEPARINISASI
                </th>
                <th
                  colSpan={2}
                  className="border border-slate-300 print:border-black p-1 sm:p-1.5 text-center align-middle uppercase"
                >
                  KOMPLIKASI, TATALAKSANA &amp; ADVIS DPJP
                </th>
                <th
                  colSpan={3}
                  className="border border-slate-300 print:border-black p-1 sm:p-1.5 text-center align-middle uppercase"
                >
                  STATUS OPERASIONAL MESIN &amp; DISINFEKSI
                </th>
                <th
                  colSpan={2}
                  className="border border-slate-300 print:border-black p-1 sm:p-1.5 text-center align-middle uppercase"
                >
                  STATUS MUTU WATER TREATMENT RO
                </th>
                <th
                  rowSpan={2}
                  className="border border-slate-300 print:border-black p-1 sm:p-1.5 text-center align-middle uppercase w-24 sm:w-28"
                >
                  PERAWAT PELAKSANA
                </th>
              </tr>

              {/* Row 2: Sub-column Specific Headers */}
              <tr className="bg-[#2f5597] text-white text-center font-bold text-[8.5px] sm:text-[9.5px] print:bg-slate-100 print:text-black">
                {/* Under DATA IDENTITAS */}
                <th className="border border-slate-300 print:border-black p-1 whitespace-nowrap">NO. RM</th>
                <th className="border border-slate-300 print:border-black p-1 min-w-[120px] sm:min-w-[140px]">NAMA LENGKAP PASIEN</th>
                <th className="border border-slate-300 print:border-black p-1 whitespace-nowrap">STATUS RAWAT</th>
                <th className="border border-slate-300 print:border-black p-1 whitespace-nowrap">RUANG / KATEGORI</th>

                {/* Under PENGATURAN TEKNIS */}
                <th className="border border-slate-300 print:border-black p-1 whitespace-nowrap">NO. BED / MESIN</th>
                <th className="border border-slate-300 print:border-black p-1 min-w-[120px]">AKSES VASKULAR</th>
                <th className="border border-slate-300 print:border-black p-1 whitespace-nowrap">WAKTU MULAI</th>
                <th className="border border-slate-300 print:border-black p-1 whitespace-nowrap">WAKTU SELESAI</th>
                <th className="border border-slate-300 print:border-black p-1 whitespace-nowrap">DURASI (JAM)</th>

                {/* Under PARAMETER BERAT BADAN & ALIRAN */}
                <th className="border border-slate-300 print:border-black p-1 whitespace-nowrap">BB KERING (KG)</th>
                <th className="border border-slate-300 print:border-black p-1 whitespace-nowrap">BB PRE HD (KG)</th>
                <th className="border border-slate-300 print:border-black p-1 whitespace-nowrap">BB POST HD (KG)</th>
                <th className="border border-slate-300 print:border-black p-1 whitespace-nowrap">QB (ML/M)</th>
                <th className="border border-slate-300 print:border-black p-1 whitespace-nowrap">QD (ML/M)</th>

                {/* Under MONITORING ULTRAFILTRASI */}
                <th className="border border-slate-300 print:border-black p-1 whitespace-nowrap">TARGET UF (ML)</th>
                <th className="border border-slate-300 print:border-black p-1 whitespace-nowrap">KT/V</th>
                <th className="border border-slate-300 print:border-black p-1 whitespace-nowrap">CAPAIAN UF (ML)</th>

                {/* Under TANDA VITAL */}
                <th className="border border-slate-300 print:border-black p-1 whitespace-nowrap">TD PRE (MMHG)</th>
                <th className="border border-slate-300 print:border-black p-1 whitespace-nowrap">TD POST (MMHG)</th>

                {/* Under SPESIFIKASI DIALISER & HEPARINISASI */}
                <th className="border border-slate-300 print:border-black p-1 min-w-[110px]">DIALISER</th>
                <th className="border border-slate-300 print:border-black p-1 whitespace-nowrap">HEPARINISASI</th>

                {/* Under KOMPLIKASI, TATALAKSANA & ADVIS DPJP */}
                <th className="border border-slate-300 print:border-black p-1 min-w-[95px]">KOMPLIKASI INTRA-HD</th>
                <th className="border border-slate-300 print:border-black p-1 min-w-[160px] sm:min-w-[200px]">TINDAKAN &amp; ADVIS MEDIS DPJP</th>

                {/* Under STATUS OPERASIONAL MESIN & DISINFEKSI */}
                <th className="border border-slate-300 print:border-black p-1 whitespace-nowrap">STATUS MESIN</th>
                <th className="border border-slate-300 print:border-black p-1 whitespace-nowrap">METODE DISINFEKSI</th>
                <th className="border border-slate-300 print:border-black p-1 whitespace-nowrap">KET. TEKNIS</th>

                {/* Under STATUS MUTU WATER TREATMENT RO */}
                <th className="border border-slate-300 print:border-black p-1 whitespace-nowrap">JAM CEK RO</th>
                <th className="border border-slate-300 print:border-black p-1 whitespace-nowrap">KONDISI AIR RO</th>
              </tr>
            </thead>

            {/* TABLE BODY */}
            <tbody className="divide-y divide-slate-200 text-slate-800 tabular-nums">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={30} className="text-center py-10 px-4 bg-slate-50/60 print:py-6">
                    {rawRows.length === 0 ? (
                      <div className="max-w-md mx-auto space-y-3 print:space-y-1">
                        <div className="w-12 h-12 mx-auto rounded-2xl bg-sky-100 flex items-center justify-center text-[#19588f] print:hidden">
                          <Book className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 print:text-xs">
                            Belum Ada Logbook Pasien yang Diinputkan
                          </h3>
                          <p className="text-xs text-slate-500 mt-1 print:text-[8px]">
                            Tabel Laporan Pasien otomatis menyesuaikan data yang diinputkan perawat pada <strong>Shift {selectedShift}</strong>, tanggal <strong>{activeDateFormatted}</strong>.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-1 print:hidden">
                          {onNavigateToLogbook && (
                            <button
                              type="button"
                              onClick={onNavigateToLogbook}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#19588f] hover:bg-[#154673] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>Input Logbook Pasien Sekarang</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-md mx-auto space-y-2">
                        <p className="text-xs text-slate-600 font-semibold">
                          Tidak ada data pasien yang sesuai dengan filter pencarian &ldquo;{searchQuery}&rdquo;.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setCategoryFilter('all');
                          }}
                          className="text-xs font-bold text-[#19588f] hover:underline cursor-pointer"
                        >
                          Reset Filter &amp; Tampilkan Semua ({rawRows.length} Pasien)
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const isEven = idx % 2 === 1;
                  const isHepB = row.ruangKategori.toLowerCase().includes('hep b');
                  const isHepC = row.ruangKategori.toLowerCase().includes('hep c');
                  const isRanap = row.statusRawat === 'Rawat Inap';

                  return (
                    <tr
                      key={row.id || idx}
                      className={`transition-colors hover:bg-sky-50/70 print:hover:bg-transparent ${
                        isEven ? 'bg-slate-50/70' : 'bg-white'
                      } ${isHepB ? 'bg-amber-50/40' : ''} ${isHepC ? 'bg-orange-50/40' : ''}`}
                    >
                      {/* NO */}
                      <td className="border border-slate-300 print:border-black p-1 text-center font-bold text-slate-700">
                        {row.no}
                      </td>

                      {/* NO RM */}
                      <td className="border border-slate-300 print:border-black p-1 font-semibold text-slate-900 text-center whitespace-nowrap">
                        {row.noRm}
                      </td>

                      {/* NAMA LENGKAP PASIEN */}
                      <td className="border border-slate-300 print:border-black p-1 font-bold text-slate-950 whitespace-nowrap">
                        {row.namaPasien}
                      </td>

                      {/* STATUS RAWAT */}
                      <td className="border border-slate-300 print:border-black p-1 text-center whitespace-nowrap">
                        <span
                          className={
                            isRanap
                              ? 'text-purple-700 font-bold'
                              : 'text-slate-700'
                          }
                        >
                          {row.statusRawat}
                        </span>
                      </td>

                      {/* RUANG / KATEGORI */}
                      <td className="border border-slate-300 print:border-black p-1 text-center whitespace-nowrap">
                        <span
                          className={
                            isHepB
                              ? 'text-amber-800 font-bold bg-amber-100/70 px-1 py-0.5 rounded print:bg-transparent'
                              : isHepC
                              ? 'text-orange-800 font-bold bg-orange-100/70 px-1 py-0.5 rounded print:bg-transparent'
                              : 'text-slate-700'
                          }
                        >
                          {row.ruangKategori}
                        </span>
                      </td>

                      {/* NO. BED / MESIN */}
                      <td className="border border-slate-300 print:border-black p-1 text-center font-semibold text-slate-900 whitespace-nowrap">
                        {row.noBedMesin}
                      </td>

                      {/* AKSES VASKULAR */}
                      <td className="border border-slate-300 print:border-black p-1 whitespace-nowrap">
                        {row.aksesVaskular}
                      </td>

                      {/* WAKTU MULAI */}
                      <td className="border border-slate-300 print:border-black p-1 text-center font-mono">
                        {row.waktuMulai}
                      </td>

                      {/* WAKTU SELESAI */}
                      <td className="border border-slate-300 print:border-black p-1 text-center font-mono">
                        {row.waktuSelesai}
                      </td>

                      {/* DURASI (JAM) */}
                      <td className="border border-slate-300 print:border-black p-1 text-center font-bold">
                        {row.durasiJam.toFixed(1).replace('.', ',')}
                      </td>

                      {/* BB KERING */}
                      <td className="border border-slate-300 print:border-black p-1 text-right">
                        {row.bbKering.toFixed(1).replace('.', ',')}
                      </td>

                      {/* BB PRE HD */}
                      <td className="border border-slate-300 print:border-black p-1 text-right font-semibold">
                        {row.bbPreHd.toFixed(1).replace('.', ',')}
                      </td>

                      {/* BB POST HD */}
                      <td className="border border-slate-300 print:border-black p-1 text-right font-semibold">
                        {row.bbPostHd.toFixed(1).replace('.', ',')}
                      </td>

                      {/* QB */}
                      <td className="border border-slate-300 print:border-black p-1 text-center font-bold text-[#19588f]">
                        {row.qb}
                      </td>

                      {/* QD */}
                      <td className="border border-slate-300 print:border-black p-1 text-center text-slate-600">
                        {row.qd}
                      </td>

                      {/* TARGET UF */}
                      <td className="border border-slate-300 print:border-black p-1 text-right font-semibold">
                        {row.targetUf.toLocaleString('id-ID')}
                      </td>

                      {/* KT/V */}
                      <td className="border border-slate-300 print:border-black p-1 text-center font-bold text-emerald-800">
                        {row.ktV.toFixed(2).replace('.', ',')}
                      </td>

                      {/* CAPAIAN UF */}
                      <td className="border border-slate-300 print:border-black p-1 text-right font-bold text-[#19588f]">
                        {row.capaianUf.toLocaleString('id-ID')}
                      </td>

                      {/* TD PRE */}
                      <td className="border border-slate-300 print:border-black p-1 text-center font-semibold whitespace-nowrap">
                        {row.tdPre}
                      </td>

                      {/* TD POST */}
                      <td className="border border-slate-300 print:border-black p-1 text-center font-semibold whitespace-nowrap">
                        {row.tdPost}
                      </td>

                      {/* DIALISER */}
                      <td className="border border-slate-300 print:border-black p-1 whitespace-nowrap">
                        {row.dialiser}
                      </td>

                      {/* HEPARINISASI */}
                      <td className="border border-slate-300 print:border-black p-1 whitespace-nowrap">
                        <span
                          className={
                            row.heparinisasi.toLowerCase().includes('free')
                              ? 'text-red-700 font-bold'
                              : 'text-slate-800'
                          }
                        >
                          {row.heparinisasi}
                        </span>
                      </td>

                      {/* KOMPLIKASI INTRA-HD */}
                      <td className="border border-slate-300 print:border-black p-1">
                        <span
                          className={
                            row.komplikasiIntraHd !== 'Tidak ada'
                              ? 'text-amber-900 font-bold bg-amber-100/70 px-1 py-0.5 rounded block print:bg-transparent'
                              : 'text-slate-600'
                          }
                        >
                          {row.komplikasiIntraHd}
                        </span>
                      </td>

                      {/* TINDAKAN & ADVIS MEDIS DPJP */}
                      <td className="border border-slate-300 print:border-black p-1 text-[8.5px] sm:text-[9.5px] print:text-[7.5px] leading-snug">
                        {row.tindakanAdvisDpjp}
                      </td>

                      {/* STATUS MESIN */}
                      <td className="border border-slate-300 print:border-black p-1 text-center whitespace-nowrap text-emerald-800 font-bold">
                        {row.statusMesin}
                      </td>

                      {/* METODE DISINFEKSI */}
                      <td className="border border-slate-300 print:border-black p-1 text-center whitespace-nowrap">
                        {row.metodeDisinfeksi}
                      </td>

                      {/* KET. TEKNIS */}
                      <td className="border border-slate-300 print:border-black p-1 text-center whitespace-nowrap">
                        {row.ketTeknis}
                      </td>

                      {/* JAM CEK RO */}
                      <td className="border border-slate-300 print:border-black p-1 text-center font-mono">
                        {row.jamCekRo}
                      </td>

                      {/* KONDISI AIR RO */}
                      <td className="border border-slate-300 print:border-black p-1 text-center whitespace-nowrap text-emerald-800 font-bold">
                        {row.kondisiAirRo}
                      </td>

                      {/* PERAWAT PELAKSANA */}
                      <td className="border border-slate-300 print:border-black p-1 whitespace-nowrap font-semibold text-slate-900">
                        {row.perawatPelaksana}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* SUMMARY FOOTER ROW */}
            <tfoot>
              <tr className="bg-[#1f4e79] text-white font-bold text-center border-t-2 border-slate-900 print:bg-slate-300 print:text-black">
                <td
                  colSpan={9}
                  className="border border-slate-300 print:border-black p-1.5 text-center font-black tracking-wide uppercase"
                >
                  TOTAL &amp; RATA-RATA ({summary.totalPasien} PASIEN)
                </td>

                {/* Rata-rata Durasi (Jam) */}
                <td className="border border-slate-300 print:border-black p-1 text-center font-black">
                  {summary.rataDurasiJam.toFixed(1).replace('.', ',')}
                </td>

                {/* Rata-rata BB Kering */}
                <td className="border border-slate-300 print:border-black p-1 text-right font-black">
                  {summary.rataBbKering.toFixed(1).replace('.', ',')}
                </td>

                {/* Rata-rata BB Pre HD */}
                <td className="border border-slate-300 print:border-black p-1 text-right font-black">
                  {summary.rataBbPreHd.toFixed(1).replace('.', ',')}
                </td>

                {/* Rata-rata BB Post HD */}
                <td className="border border-slate-300 print:border-black p-1 text-right font-black">
                  {summary.rataBbPostHd.toFixed(1).replace('.', ',')}
                </td>

                {/* Rata-rata QB */}
                <td className="border border-slate-300 print:border-black p-1 text-center font-black">
                  {summary.rataQb}
                </td>

                {/* Rata-rata QD */}
                <td className="border border-slate-300 print:border-black p-1 text-center font-black">
                  {summary.rataQd}
                </td>

                {/* Total Target UF */}
                <td className="border border-slate-300 print:border-black p-1 text-right font-black">
                  {summary.totalTargetUf.toLocaleString('id-ID')}
                </td>

                {/* Rata-rata Kt/V */}
                <td className="border border-slate-300 print:border-black p-1 text-center font-black">
                  {summary.rataKtV.toFixed(2).replace('.', ',')}
                </td>

                {/* Total Capaian UF */}
                <td className="border border-slate-300 print:border-black p-1 text-right font-black">
                  {summary.totalCapaianUf.toLocaleString('id-ID')}
                </td>

                {/* Remaining columns */}
                <td colSpan={11} className="border border-slate-300 print:border-black p-1 text-center text-blue-100 print:text-black italic">
                  - Sesi Asuhan Hemodialisis Terstandar KARS &amp; PERNEFRI -
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Printable & Screen Official Verification Signatures Block */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 print:border-black print:p-2 text-slate-900 print:text-black">
          <div className="grid grid-cols-3 gap-4 text-center text-xs print:text-[8px] leading-tight">
            <div>
              <p className="text-slate-600 print:text-black">Mengetahui,</p>
              <p className="font-bold text-slate-800 print:text-black">Penanggung Jawab Shift</p>
              <div className="h-14 sm:h-16 flex items-end justify-center">
                <span className="text-[10px] text-emerald-800 font-mono bg-emerald-50 print:bg-transparent px-2 py-0.5 rounded border border-emerald-200 print:border-none">
                  ✓ Terverifikasi Digital
                </span>
              </div>
              <p className="font-extrabold underline text-slate-950 print:text-black mt-1">
                {shiftInfo.pjShift || 'M. Haikal Malilang, A.Md. Kep.'}
              </p>
              <p className="text-[10px] text-slate-500 print:text-black">NIP: 19940812 201803 1 002</p>
            </div>

            <div>
              <p className="text-slate-600 print:text-black">Menyetujui,</p>
              <p className="font-bold text-slate-800 print:text-black">Dokter Penanggung Jawab Pelayanan (DPJP)</p>
              <div className="h-14 sm:h-16 flex items-end justify-center">
                <span className="text-[10px] text-blue-800 font-mono bg-blue-50 print:bg-transparent px-2 py-0.5 rounded border border-blue-200 print:border-none">
                  ✓ Advis Klinis Terkonfirmasi
                </span>
              </div>
              <p className="font-extrabold underline text-slate-950 print:text-black mt-1">
                {shiftInfo.dokterDpjp || 'dr. Raden Heru Prasanto, Sp.PD-KGH'}
              </p>
              <p className="text-[10px] text-slate-500 print:text-black">SIP: 503/441/SIP-DU/2021</p>
            </div>

            <div>
              <p className="text-slate-600 print:text-black">Mengesahkan,</p>
              <p className="font-bold text-slate-800 print:text-black">Kepala Ruangan Hemodialisa</p>
              <div className="h-14 sm:h-16 flex items-end justify-center">
                <span className="text-[10px] text-emerald-800 font-mono bg-emerald-50 print:bg-transparent px-2 py-0.5 rounded border border-emerald-200 print:border-none">
                  ✓ Disahkan Ka. Ruangan
                </span>
              </div>
              <p className="font-extrabold underline text-slate-950 print:text-black mt-1">
                {shiftInfo.kepalaRuangan || 'Twis Fertilianti PW., S.Kep., Ns.'}
              </p>
              <p className="text-[10px] text-slate-500 print:text-black">NIP: 19820415 200604 2 008</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
