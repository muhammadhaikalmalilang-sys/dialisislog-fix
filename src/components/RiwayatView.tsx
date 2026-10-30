import React, { useState, useMemo } from 'react';
import { PatientHDSession, ShiftInfo, MasterNurse, SystemAccessRole } from '../types/dialysis.ts';
import {
  Search,
  Clock,
  Printer,
  FileText,
  ShieldCheck,
  Download,
  RotateCcw,
  PlusCircle,
  Database,
  Lock,
  UserCheck,
  Calendar,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { PelaksanaLogbookPrintableModal } from './PelaksanaLogbookPrintableModal.tsx';
import { LoginUserData } from './LoginPage.tsx';
import {
  filterSessionsForNurseRiwayat,
  isSessionVerifiedByPj,
  isMatchingNurse,
  getNurseManagedPatientsKey,
  getVerificationRegistry,
  ManagedPatientMinimal
} from '../utils/nurseVerificationHelpers.ts';
import {
  getCurrentIsoDateWib,
  indonesianDateLabelToIso,
  formatIsoDateToIndonesianFull
} from '../utils/dateHelpers.ts';

interface RiwayatViewProps {
  sessions: PatientHDSession[];
  shiftInfo: ShiftInfo;
  userRole?: SystemAccessRole;
  loggedInUser?: LoginUserData | null;
  masterNurses?: MasterNurse[];
  onOpenSessionModal?: (session: PatientHDSession) => void;
  onLoadBenchmarkData?: () => void;
  onNavigateToLogbook?: () => void;
  onNavigateToVerifikasi?: () => void;
}

export const RiwayatView: React.FC<RiwayatViewProps> = ({
  sessions,
  shiftInfo,
  userRole = 'perawat_pelaksana',
  loggedInUser,
  masterNurses = [],
  onLoadBenchmarkData,
  onNavigateToLogbook,
  onNavigateToVerifikasi
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<string>('all');
  const [printingSession, setPrintingSession] = useState<PatientHDSession | null>(null);
  const selectedNurseFilter = 'mine';

  const isSupervisor =
    userRole === 'pj_shift' || userRole === 'kepala_ruangan' || userRole === 'administrator';

  // Identify current nurse strictly from loggedInUser or active role
  const currentNurseName = useMemo(() => {
    if (loggedInUser?.name && userRole !== 'administrator') {
      return loggedInUser.name;
    }
    if (userRole === 'pj_shift') {
      return shiftInfo.pjShift && shiftInfo.pjShift !== '-' ? shiftInfo.pjShift : '-';
    }
    if (userRole === 'kepala_ruangan') {
      return shiftInfo.kepalaRuangan && shiftInfo.kepalaRuangan !== '-'
        ? shiftInfo.kepalaRuangan
        : '-';
    }
    const defaultPelaksana =
      masterNurses.find((n) => n.role === 'perawat_pelaksana' && n.isOnDutyToday) ||
      masterNurses.find((n) => n.role === 'perawat_pelaksana');
    return defaultPelaksana?.name || '-';
  }, [loggedInUser, userRole, shiftInfo, masterNurses]);

  // Read active & historical managed patients list from per-nurse localStorage and verification registry
  const managedPatients = useMemo<ManagedPatientMinimal[]>(() => {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    if (!currentNurseName || currentNurseName === '-') return [];
    const list: ManagedPatientMinimal[] = [];
    const seen = new Set<string>();

    const pushUnique = (p: ManagedPatientMinimal) => {
      const key = `${p.bedNumber}-${p.patientName}-${p.medicalRecord || ''}`.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        list.push(p);
      }
    };

    try {
      const savedNurse = localStorage.getItem(getNurseManagedPatientsKey(currentNurseName));
      if (savedNurse) {
        const parsed = JSON.parse(savedNurse);
        if (Array.isArray(parsed)) {
          parsed.forEach(pushUnique);
        }
      }
      const allReg = getVerificationRegistry().filter((e) =>
        isMatchingNurse(e.submittedNurseName, currentNurseName)
      );
      allReg.forEach((entry) => {
        if (entry.patients && Array.isArray(entry.patients)) {
          entry.patients.forEach(pushUnique);
        }
      });
    } catch {
      // ignore
    }
    return list;
  }, [currentNurseName, sessions]);

  // Apply clinical governance & verification workflow across all sessions
  const {
    visibleSessions: roleFilteredSessions,
    allAvailableDates,
    totalManagedByNurse,
    unverifiedManagedCount,
    currentNurseStatus,
    otherNursesHiddenCount,
    verifiedByPjCount,
    verifiedByKaruCount
  } = useMemo(() => {
    return filterSessionsForNurseRiwayat(
      sessions,
      currentNurseName,
      userRole,
      selectedNurseFilter,
      masterNurses,
      managedPatients,
      selectedDateFilter,
      selectedShiftFilter
    );
  }, [
    sessions,
    currentNurseName,
    userRole,
    selectedNurseFilter,
    masterNurses,
    managedPatients,
    selectedDateFilter,
    selectedShiftFilter
  ]);

  // Total verified sessions across all dates for this scope (ignoring date filter)
  const totalVerifiedInScope = useMemo(() => {
    return allAvailableDates.reduce((acc, curr) => acc + curr.count, 0);
  }, [allAvailableDates]);

  const resetAllFilters = () => {
    setSearchTerm('');
    setSelectedDateFilter('all');
    setSelectedShiftFilter('all');
  };

  // Search on visible verified sessions
  const filteredSessions = useMemo(() => {
    return roleFilteredSessions.filter((s) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        s.patientName.toLowerCase().includes(term) ||
        (s.bedNumber && s.bedNumber.toLowerCase().includes(term)) ||
        (s.medicalRecordNumber && s.medicalRecordNumber.toLowerCase().includes(term)) ||
        (s.nurseInCharge && s.nurseInCharge.toLowerCase().includes(term)) ||
        (s.date && s.date.toLowerCase().includes(term));

      return matchesSearch;
    });
  }, [roleFilteredSessions, searchTerm]);

  const isFullyVerified =
    totalManagedByNurse > 0 && unverifiedManagedCount === 0 && roleFilteredSessions.length > 0;

  const todayIso = getCurrentIsoDateWib();

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span className="text-blue-700 font-bold">Arsip &amp; Riwayat Logbook Terverifikasi</span>
            <span aria-hidden="true">&middot;</span>
            <span>Instalasi Hemodialisis RS Happy Land</span>
          </div>
          <h2 className="text-lg font-black text-slate-900">
            Riwayat Asuhan &amp; Logbook Pasien Kelolaan Terverifikasi
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            Menampilkan seluruh riwayat logbook pasien kelolaan pribadi ({currentNurseName}) yang telah disahkan verifikasinya oleh PJ Shift atau Kepala Ruang lintas tanggal dinas.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap tabular-nums">
          <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center min-w-[110px]">
            <div className="text-[11px] font-semibold text-slate-500">Total Arsip</div>
            <div className="text-base font-black text-slate-900 mt-0.5">
              {totalVerifiedInScope} Logbook
            </div>
          </div>
          <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-center min-w-[110px]">
            <div className="text-[11px] font-semibold text-emerald-800">Tampil Sesuai Filter</div>
            <div className="text-base font-black text-emerald-950 mt-0.5">
              {filteredSessions.length} Pasien
            </div>
          </div>
          <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl text-center min-w-[100px]">
            <div className="text-[11px] font-semibold text-blue-800">Tanggal Aktif</div>
            <div className="text-base font-black text-blue-950 mt-0.5">
              {allAvailableDates.length} Hari
            </div>
          </div>
          {onLoadBenchmarkData && (
            <button
              type="button"
              onClick={onLoadBenchmarkData}
              className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              title="Reset & muat ulang data benchmark standar RS Happy Land"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>Reset Benchmark</span>
            </button>
          )}
        </div>
      </div>

      {/* RBAC Nurse Ownership & Verification Status Notice */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl text-white flex items-center justify-center shrink-0 ${
                userRole === 'kepala_ruangan'
                  ? 'bg-indigo-600'
                  : userRole === 'pj_shift'
                  ? 'bg-blue-700'
                  : 'bg-blue-600'
              }`}
            >
              {userRole === 'perawat_pelaksana' ? (
                <Lock className="w-4 h-4" />
              ) : userRole === 'pj_shift' ? (
                <UserCheck className="w-4 h-4" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-black text-slate-900">
                  {userRole === 'kepala_ruangan'
                    ? `Kepala Ruang: ${currentNurseName}`
                    : userRole === 'pj_shift'
                    ? `PJ Shift: ${currentNurseName}`
                    : `Perawat Pelaksana: ${currentNurseName}`}
                </span>
                <span className="text-slate-400" aria-hidden="true">
                  &middot;
                </span>
                <span className="text-slate-600 font-semibold">
                  Arsip Pasien Kelolaan Pribadi
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Seluruh logbook pasien kelolaan pribadi Anda ({currentNurseName}) yang telah disahkan verifikasinya oleh PJ Shift atau Kepala Ruang tersimpan permanen di halaman ini dan dapat ditinjau atau dicetak kapan saja.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2 self-start sm:self-center text-xs font-bold whitespace-nowrap">
            {totalVerifiedInScope > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{totalVerifiedInScope} Logbook Terverifikasi</span>
              </span>
            ) : currentNurseStatus === 'diajukan' ? (
              <span className="inline-flex items-center gap-1.5 text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200">
                <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Menunggu Verifikasi PJ Shift / Ka. Ruang</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Belum Ada Logbook Terverifikasi</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filter Toolbar: Tanggal, Shift, Perawat, dan Verifikator */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama pasien, nomor RM, bed, tanggal, atau perawat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2 text-sm text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                &times;
              </button>
            )}
          </div>

          {/* Quick Selectors */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Shift Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {(
                [
                  { id: 'all', label: 'Semua Shift' },
                  { id: 'Pagi', label: 'Shift Pagi' },
                  { id: 'Siang', label: 'Shift Siang' }
                ] as const
              ).map((sh) => (
                <button
                  key={sh.id}
                  type="button"
                  onClick={() => setSelectedShiftFilter(sh.id)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedShiftFilter === sh.id
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sh.label}
                </button>
              ))}
            </div>

            {(searchTerm ||
              selectedDateFilter !== 'all' ||
              selectedShiftFilter !== 'all') && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3 h-3 shrink-0" />
                <span>Reset Filter</span>
              </button>
            )}
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-bold shrink-0">
            <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Filter Tanggal:</span>
          </div>

          {/* Quick Date Chips */}
          <button
            type="button"
            onClick={() => setSelectedDateFilter('all')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedDateFilter === 'all'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Semua Tanggal ({totalVerifiedInScope})
          </button>

          {allAvailableDates.map((d) => (
            <button
              key={d.isoDate}
              type="button"
              onClick={() => setSelectedDateFilter(d.isoDate)}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                selectedDateFilter === d.isoDate
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{d.fullDate}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  selectedDateFilter === d.isoDate
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {d.count}
              </span>
            </button>
          ))}

          {/* Fallback Custom Date Input if user wants to look for another date */}
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-[11px] text-slate-400">Pilih Tanggal:</span>
            <input
              type="date"
              value={selectedDateFilter !== 'all' && selectedDateFilter.includes('-') ? selectedDateFilter : ''}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDateFilter(e.target.value);
                }
              }}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-slate-700 font-semibold cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Main Content: Table or Empty State */}
      {filteredSessions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-8 sm:p-10 text-center shadow-xs">
          {totalVerifiedInScope > 0 && selectedDateFilter !== 'all' ? (
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-100">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black text-slate-900">
                Tidak Ada Logbook Terverifikasi pada Tanggal yang Dipilih
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tidak ada logbook pasien terverifikasi pada tanggal{' '}
                <strong className="text-slate-800">
                  {formatIsoDateToIndonesianFull(selectedDateFilter)}
                </strong>
                . Terdapat <strong className="text-slate-800">{totalVerifiedInScope} logbook</strong>{' '}
                terverifikasi pada tanggal arsip lainnya.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDateFilter('all')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Tampilkan Semua Tanggal Arsip</span>
                </button>
              </div>
            </div>
          ) : unverifiedManagedCount > 0 ? (
            <div className="max-w-lg mx-auto space-y-3">
              <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
                <Clock className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-slate-900">
                {currentNurseStatus === 'diajukan'
                  ? 'Data Logbook Pasien Sedang Menunggu Verifikasi PJ Shift / Kepala Ruang'
                  : 'Logbook Pasien Belum Diajukan Verifikasi'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Anda memiliki <strong className="text-slate-900 tabular-nums">{totalManagedByNurse} pasien kelolaan</strong>.{' '}
                Sesuai standar operasional, logbook pasien akan otomatis diarsipkan dan muncul di halaman Riwayat ini setelah disahkan oleh PJ Shift ({shiftInfo.pjShift}) atau Kepala Ruangan ({shiftInfo.kepalaRuangan}).
              </p>
              <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
                {onNavigateToLogbook && (
                  <button
                    type="button"
                    onClick={onNavigateToLogbook}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <PlusCircle className="w-4 h-4 shrink-0" />
                    <span>
                      {currentNurseStatus === 'diajukan'
                        ? 'Lihat Status Pengajuan di Tab Logbook'
                        : 'Isi & Ajukan Verifikasi di Tab Logbook'}
                    </span>
                  </button>
                )}
                {userRole === 'kepala_ruangan' && onNavigateToVerifikasi && (
                  <button
                    type="button"
                    onClick={onNavigateToVerifikasi}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>Buka Halaman Verifikasi Kepala Ruang</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-lg mx-auto space-y-3">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-100">
                <Database className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-slate-900">
                Belum Ada Data Riwayat Logbook Pasien Terverifikasi
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Belum ada data asuhan pasien hemodialisis yang telah selesai diverifikasi oleh PJ Shift atau Kepala Ruang. Silakan isi logbook pasien di tab Logbook dan ajukan pengesahan.
              </p>
              <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
                {onNavigateToLogbook && (
                  <button
                    type="button"
                    onClick={onNavigateToLogbook}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <PlusCircle className="w-4 h-4 shrink-0" />
                    <span>Isi Logbook Pasien Kelolaan</span>
                  </button>
                )}
                {onLoadBenchmarkData && (
                  <button
                    type="button"
                    onClick={onLoadBenchmarkData}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    <span>Muat Data Contoh Benchmark</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Daftar Riwayat Logbook Pasien Terverifikasi (KARS &amp; PERNEFRI)</span>
            </h3>
            <span className="text-xs text-slate-500 font-semibold tabular-nums">
              Menampilkan <strong className="text-slate-900">{filteredSessions.length}</strong> logbook terverifikasi
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse tabular-nums">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3.5 min-w-[170px]">Tanggal &amp; Shift Dinas</th>
                  <th className="p-3.5 min-w-[200px]">Nama Pasien &amp; No. RM</th>
                  <th className="p-3.5 text-center w-28">No. Bed</th>
                  <th className="p-3.5 min-w-[180px]">Perawat Pelaksana</th>
                  <th className="p-3.5 min-w-[230px]">Pengesahan &amp; Verifikator</th>
                  <th className="p-3.5 text-right min-w-[160px]">Aksi Berkas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredSessions.map((s, idx) => {
                  const verifInfo = isSessionVerifiedByPj(s, masterNurses);
                  const sessionDateLabel =
                    s.date ||
                    (s.sessionDate ? formatIsoDateToIndonesianFull(s.sessionDate) : shiftInfo.date);
                  const sessionShift = s.shift || shiftInfo.shift || 'Pagi';

                  return (
                    <tr
                      key={s.id}
                      className={`transition-colors ${
                        idx % 2 === 1 ? 'bg-slate-50/40 hover:bg-blue-50/40' : 'bg-white hover:bg-blue-50/40'
                      }`}
                    >
                      {/* 1. Tanggal & Shift Dinas */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{sessionDateLabel}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                              sessionShift === 'Siang'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-sky-100 text-sky-800'
                            }`}
                          >
                            Shift {sessionShift}
                          </span>
                        </div>
                      </td>

                      {/* 2. Nama Pasien & RM */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 text-[13px]">{s.patientName}</div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>RM: {s.medicalRecordNumber || '-'}</span>
                          <span aria-hidden="true">&middot;</span>
                          <span className="capitalize">{s.gender === 'L' ? 'Laki-laki' : 'Perempuan'}, {s.age || 50} th</span>
                        </div>
                      </td>

                      {/* 3. No Bed Pasien */}
                      <td className="p-3.5 text-center font-mono font-bold text-blue-800">
                        <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200">
                          {s.bedNumber || '-'}
                        </span>
                      </td>

                      {/* 4. Perawat Pelaksana */}
                      <td className="p-3.5">
                        <div className="text-slate-900 font-bold text-xs">
                          {s.nurseInCharge || currentNurseName}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Perawat Pelaksana HD
                        </div>
                      </td>

                      {/* 5. Pengesahan & Verifikator */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>
                            {verifInfo.isVerifiedByKepalaRuang
                              ? 'Disahkan Kepala Ruang'
                              : 'Disahkan PJ Shift'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Verifikator: <strong className="text-slate-700">{verifInfo.verifiedBy || '-'}</strong>
                        </div>
                        {verifInfo.verifiedAt && (
                          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                            {verifInfo.verifiedAt}
                          </div>
                        )}
                        {verifInfo.verifiedByRole && (
                          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                            Status: Sah ({verifInfo.verifiedByRole})
                          </div>
                        )}
                      </td>

                      {/* 6. Aksi Berkas */}
                      <td className="p-3.5 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPrintingSession(s)}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-900 rounded-lg border border-blue-200 transition-colors cursor-pointer inline-flex items-center gap-1.5 font-semibold whitespace-nowrap shrink-0 shadow-2xs text-xs"
                            title="Cetak Berkas Logbook Resmi A4 Standar PERNEFRI"
                          >
                            <Printer className="w-3.5 h-3.5 shrink-0" />
                            <span>Cetak</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Cetak Per-Session */}
      {printingSession && (
        <PelaksanaLogbookPrintableModal
          isOpen={!!printingSession}
          onClose={() => setPrintingSession(null)}
          session={printingSession}
          shiftInfo={shiftInfo}
        />
      )}
    </div>
  );
};
