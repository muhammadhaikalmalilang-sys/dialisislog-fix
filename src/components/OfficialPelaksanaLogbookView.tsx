import React, { useState, useMemo } from 'react';
import {
  OfficialLogbookItem,
  OfficialNurseLogbookMonth,
  ShiftName,
  MasterNurse
} from '../types/dialysis.ts';
import {
  OFFICIAL_LOGBOOK_ITEMS,
  createInitialOfficialLogbook,
  computeDailyActivitiesCount,
  computeItemTotalAndPct
} from '../data/officialPelaksanaLogbookData.ts';
import { OfficialPelaksanaLogbookPrintable } from './OfficialPelaksanaLogbookPrintable.tsx';
import { printDocumentWithOrientation } from '../utils/printHelpers.ts';
import {
  CheckSquare,
  Square,
  Sparkles,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  CheckCircle2,
  Printer,
  Table,
  FileText,
  Search,
  Filter,
  RefreshCcw,
  Sliders,
  Droplet,
  HeartPulse,
  BookOpen,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Info,
  Check,
  ChevronDown,
  Building2,
  Stethoscope,
  Download,
  ClipboardList,
  Layers,
  X,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

interface OfficialPelaksanaLogbookViewProps {
  masterNurses?: MasterNurse[];
}

export const OfficialPelaksanaLogbookView: React.FC<OfficialPelaksanaLogbookViewProps> = ({
  masterNurses = []
}) => {
  const [logbook, setLogbook] = useState<OfficialNurseLogbookMonth>(createInitialOfficialLogbook);
  const [selectedDay, setSelectedDay] = useState<number>(20); // 1-31
  const [activeTab, setActiveTab] = useState<'daily_input' | 'monthly_matrix' | 'print_preview'>('daily_input');
  const [filterBagian, setFilterBagian] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [saveToast, setSaveToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  // States for dedicated "Tombol Khusus Penginputan Logbook" & Modal
  const [showBagianLauncher, setShowBagianLauncher] = useState<boolean>(true);
  const [isBagianModalOpen, setIsBagianModalOpen] = useState<boolean>(false);
  const [activeModalBagian, setActiveModalBagian] = useState<number>(1);

  const daysArray = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);

  // 5 Bagian utama asuhan keperawatan HD (plus Bagian 6 terminasi dari dokumen RS)
  const bagianList = [
    {
      num: 1,
      name: 'Bagian 1',
      title: 'Kesiapan Fasilitas & Water Treatment (RO)',
      subtitle: '1.1 MEMASTIKAN KESIAPAN RO & WATER TREATMEN, 1.2 KESIAPAN RUANGAN & LINGKUNGAN, 1.3 KESIAPAN EMERGENCY ROOM & EMERGENCY TOOLS',
      icon: Droplet,
      count: 3,
      badgeColor: 'bg-cyan-50 text-cyan-800 border-cyan-200',
      activeBorder: 'border-cyan-500 ring-2 ring-cyan-200',
      activeBg: 'bg-cyan-50/70',
      gradient: 'from-cyan-600 to-blue-600'
    },
    {
      num: 2,
      name: 'Bagian 2',
      title: 'Persiapan Perawat, Mesin HD & Alkes (Pre-HD)',
      subtitle: '5 Momen cuci tangan, APD, self-test mesin, uji BLD, priming & heparin',
      icon: Sliders,
      count: 6,
      badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
      activeBorder: 'border-blue-500 ring-2 ring-blue-200',
      activeBg: 'bg-blue-50/70',
      gradient: 'from-blue-600 to-indigo-600'
    },
    {
      num: 3,
      name: 'Bagian 3',
      title: 'Identifikasi Pasien & Patient Safety Pre-HD',
      subtitle: 'SKP 1 gelang identitas, informed consent, Morse Fall Scale, IDWG, AVF/CDL',
      icon: ShieldCheck,
      count: 6,
      badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      activeBorder: 'border-indigo-500 ring-2 ring-indigo-200',
      activeBg: 'bg-indigo-50/70',
      gradient: 'from-indigo-600 to-purple-600'
    },
    {
      num: 4,
      name: 'Bagian 4',
      title: 'Monitoring Intra-HD & Pencegahan IKP',
      subtitle: 'Flowsheet tanda vital tiap jam, pencegahan hipotensi, kram & TBAK DPJP',
      icon: HeartPulse,
      count: 4,
      badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
      activeBorder: 'border-rose-500 ring-2 ring-rose-200',
      activeBg: 'bg-rose-50/70',
      gradient: 'from-rose-600 to-red-600'
    },
    {
      num: 5,
      name: 'Bagian 5',
      title: 'Edukasi Terstruktur Pasien & Keluarga',
      subtitle: 'Restriksi cairan, diet kalium-fosfat, perawatan akses & Teach-Back',
      icon: BookOpen,
      count: 5,
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      activeBorder: 'border-amber-500 ring-2 ring-amber-200',
      activeBg: 'bg-amber-50/70',
      gradient: 'from-amber-600 to-orange-600'
    },
    {
      num: 6,
      name: 'Bagian 6',
      title: 'Terminasi Aman & Dokumentasi Pasca-HD',
      subtitle: 'Bilas NaCl, hemostasis, desinfeksi mesin termal/kimia, CPPT',
      icon: CheckCircle2,
      count: 5,
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      activeBorder: 'border-emerald-500 ring-2 ring-emerald-200',
      activeBg: 'bg-emerald-50/70',
      gradient: 'from-emerald-600 to-teal-600'
    }
  ];

  const currentDayIndex = selectedDay - 1;

  // Day Name helper for October 2026 (Oct 1 2026 is Thursday)
  const getDayName = (day: number) => {
    const days = ['Kam', 'Jum', 'Sab', 'Min', 'Sen', 'Sel', 'Rab'];
    return days[(day - 1) % 7];
  };

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setSaveToast({ message, type });
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Toggle single item check for selected day
  const handleToggleItemForSelectedDay = (code: string) => {
    setLogbook(prev => {
      const currentChecks = prev.checks[code] ? [...prev.checks[code]] : new Array(31).fill(false);
      const nextState = !currentChecks[currentDayIndex];
      currentChecks[currentDayIndex] = nextState;
      return {
        ...prev,
        checks: {
          ...prev.checks,
          [code]: currentChecks
        }
      };
    });
  };

  // Toggle single cell in monthly matrix
  const handleToggleCell = (code: string, dayIndex: number) => {
    setLogbook(prev => {
      const currentChecks = prev.checks[code] ? [...prev.checks[code]] : new Array(31).fill(false);
      currentChecks[dayIndex] = !currentChecks[dayIndex];
      return {
        ...prev,
        checks: {
          ...prev.checks,
          [code]: currentChecks
        }
      };
    });
  };

  // 1-Click: Mark All Items in specific Bagian as Completed for selected day
  const handleCheckAllInBagian = (bagianNum: number) => {
    setLogbook(prev => {
      const newChecks = { ...prev.checks };
      OFFICIAL_LOGBOOK_ITEMS.filter(it => it.bagian === bagianNum).forEach(it => {
        const arr = newChecks[it.code] ? [...newChecks[it.code]] : new Array(31).fill(false);
        arr[currentDayIndex] = true;
        newChecks[it.code] = arr;
      });
      return {
        ...prev,
        checks: newChecks
      };
    });
    showToast(`Seluruh butir Bagian ${bagianNum} untuk Tanggal ${selectedDay} berhasil ditandai selesai!`);
  };

  // 1-Click: Mark All 29 Items as Completed for selected day
  const handleCheckAllForSelectedDay = () => {
    setLogbook(prev => {
      const newChecks = { ...prev.checks };
      OFFICIAL_LOGBOOK_ITEMS.forEach(it => {
        const arr = newChecks[it.code] ? [...newChecks[it.code]] : new Array(31).fill(false);
        arr[currentDayIndex] = true;
        newChecks[it.code] = arr;
      });
      return {
        ...prev,
        checks: newChecks
      };
    });
    showToast(`Seluruh 29 SPO untuk Tanggal ${selectedDay} berhasil dicentang (100% Lengkap)!`);
  };

  // Reset selected day
  const handleResetSelectedDay = () => {
    if (confirm(`Kosongkan checklist untuk Tanggal ${selectedDay}?`)) {
      setLogbook(prev => {
        const newChecks = { ...prev.checks };
        OFFICIAL_LOGBOOK_ITEMS.forEach(it => {
          if (newChecks[it.code]) {
            const arr = [...newChecks[it.code]];
            arr[currentDayIndex] = false;
            newChecks[it.code] = arr;
          }
        });
        return {
          ...prev,
          checks: newChecks
        };
      });
      showToast(`Checklist Tanggal ${selectedDay} telah direset.`, 'info');
    }
  };

  const handleNoteChange = (code: string, noteText: string) => {
    setLogbook(prev => ({
      ...prev,
      notes: {
        ...prev.notes,
        [code]: noteText
      }
    }));
  };

  const toggleNoteExpanded = (code: string) => {
    setExpandedNotes(prev => ({
      ...prev,
      [code]: !prev[code]
    }));
  };

  // Computed metrics for selected day
  const selectedDayCompletedCount = computeDailyActivitiesCount(logbook.checks, currentDayIndex);
  const selectedDayPct = Math.round((selectedDayCompletedCount / OFFICIAL_LOGBOOK_ITEMS.length) * 100);

  // Filter items
  const filteredItems = OFFICIAL_LOGBOOK_ITEMS.filter(it => {
    const matchesBagian = filterBagian === 'all' || it.bagian === filterBagian;
    const matchesSearch =
      searchQuery.trim() === '' ||
      it.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      it.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      it.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      it.standardSpo.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBagian && matchesSearch;
  });

  const monthlyActiveDaysCount = daysArray.filter(d => computeDailyActivitiesCount(logbook.checks, d - 1) > 0).length;

  // Helper to open specific Bagian modal
  const handleOpenBagianModal = (bagianNum: number) => {
    setActiveModalBagian(bagianNum);
    setIsBagianModalOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
          {saveToast.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
          )}
          <span>{saveToast.message}</span>
        </div>
      )}

      {/* Top Clinical Header & Nurse Metadata Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Top Header Banner */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 border-b border-slate-800">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
                <span className="text-blue-400 font-bold uppercase tracking-wider">RS Happy Land Medical Centre</span>
                <span>&bull;</span>
                <span>Instalasi Hemodialisis</span>
                <span>&bull;</span>
                <span className="text-emerald-400 font-semibold">Standar KARS &amp; PERNEFRI</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Logbook Harian Perawat Pelaksana Hemodialisis
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
                Dokumentasi verifikasi 29 kegiatan asuhan keperawatan hemodialisis harian terstandar SPO. Terintegrasi langsung dengan rekapitulasi bulanan dan laporan pertanggungjawaban PJ shift.
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center bg-slate-950/90 p-1.5 rounded-xl border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('daily_input')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'daily_input'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                <span>Input Harian</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('monthly_matrix')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'monthly_matrix'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Table className="w-4 h-4" />
                <span>Matriks Bulanan (1-31)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('print_preview')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'print_preview'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Printer className="w-4 h-4" />
                <span>Cetak PDF (1:1)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Clinical Context Bar: Nurse Identity & Shift Metadata */}
        <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Nurse selection */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Nama Perawat Pelaksana</span>
            </label>
            {masterNurses.length > 0 ? (
              <select
                value={logbook.nurseName}
                onChange={e => {
                  const n = masterNurses.find(mn => mn.name === e.target.value);
                  setLogbook(prev => ({
                    ...prev,
                    nurseName: e.target.value,
                    nipNira: n?.nip ? `${n.nip} / NIRA 3404` : prev.nipNira
                  }));
                  showToast(`Perawat pelaksana diubah ke: ${e.target.value}`, 'info');
                }}
                className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all shadow-2xs"
              >
                {masterNurses.map(n => (
                  <option key={n.id} value={n.name}>{n.name} &bull; {n.role.toUpperCase()}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={logbook.nurseName}
                onChange={e => setLogbook(prev => ({ ...prev, nurseName: e.target.value }))}
                className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl px-3 py-2 shadow-2xs"
              />
            )}
            <div className="text-[10.5px] text-slate-500 font-mono">
              {logbook.nipNira}
            </div>
          </div>

          {/* Shift selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Shift Dinas</span>
            </label>
            <div className="flex items-center gap-1.5 pt-0.5">
              {(['Pagi', 'Siang', 'Malam'] as ShiftName[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setLogbook(prev => ({ ...prev, shift: s }));
                    showToast(`Shift dinas diubah ke: ${s}`, 'info');
                  }}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    logbook.shift === s
                      ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="text-[10.5px] text-slate-500">
              {logbook.shift === 'Pagi' ? '07.00 - 14.00 WIB' : logbook.shift === 'Siang' ? '14.00 - 21.00 WIB' : '21.00 - 07.00 WIB'}
            </div>
          </div>

          {/* PK Level */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Kualifikasi Jenjang PK</span>
            </label>
            <select
              value={logbook.pkLevel}
              onChange={e => setLogbook(prev => ({ ...prev, pkLevel: e.target.value as any }))}
              className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all shadow-2xs"
            >
              <option value="PK I">PK I Dialisis (Perawat Pemula Terbimbing)</option>
              <option value="PK II">PK II Dialisis (Perawat Mandiri Terstandar)</option>
              <option value="PK III Dialisis">PK III Dialisis (Perawat Ahli &amp; Preceptor)</option>
            </select>
            <div className="text-[10.5px] text-slate-500">
              Sertifikat Dialisis Kemenkes RI
            </div>
          </div>

          {/* Month & Year Info */}
          <div className="space-y-1 flex flex-col justify-between">
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Periode Logbook</span>
              </label>
              <div className="font-extrabold text-sm text-slate-900 mt-1">
                {logbook.monthYear}
              </div>
            </div>
            <div className="text-[11px] text-slate-500">
              Unit: <strong className="text-slate-800">Ruang HD (16 Mesin)</strong> &bull; Total: <strong className="text-blue-900">29 SPO</strong>
            </div>
          </div>
        </div>
      </div>

      {/* -------------------- TAB 1: FORM INPUT SHIFT HARIAN -------------------- */}
      {activeTab === 'daily_input' && (
        <div className="space-y-5">
          {/* ========================================================================= */}
          {/* TOMBOL KHUSUS PENGINPUTAN LOGBOOK DENGAN 5 TOMBOL BAGIAN (BAGIAN 1 - 5) */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-2xl border border-blue-200/90 shadow-sm p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300 uppercase tracking-wider">
                    Fitur Input Terstruktur
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    Standar KARS &amp; PERNEFRI RS Happy Land
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-blue-600" />
                  <span>Tombol Khusus Penginputan Logbook (Bagian 1 – Bagian 5)</span>
                </h3>
                <p className="text-xs text-slate-600 max-w-2xl">
                  Klik tombol <strong>Bagian 1 s/d Bagian 5</strong> di bawah untuk langsung menginput checklist tindakan sesuai tahapan asuhan hemodialisis.
                </p>
              </div>

              {/* Master Launcher Toggle & Quick Modal Trigger */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowBagianLauncher(prev => !prev)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer ${
                    showBagianLauncher
                      ? 'bg-blue-600 hover:bg-blue-700 text-white ring-2 ring-blue-300'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                  title="Klik untuk memunculkan atau menyembunyikan 5 tombol bagian"
                >
                  <Layers className="w-4 h-4 text-white" />
                  <span>{showBagianLauncher ? 'Tutup Pilihan Bagian ▲' : 'Buka 5 Tombol Bagian ▼'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenBagianModal(filterBagian === 'all' ? 1 : (filterBagian as number))}
                  className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Buka form input terfokus dalam dialog modal"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Dialog Input Cepat</span>
                </button>
              </div>
            </div>

            {/* THE 5 BAGIAN BUTTONS CONTAINER */}
            {showBagianLauncher && (
              <div className="pt-2 border-t border-slate-100 space-y-3 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 font-medium gap-2">
                  <span>
                    Pilih salah satu Bagian untuk input langsung pada <strong>Tanggal {selectedDay} (Shift {logbook.shift})</strong>:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFilterBagian('all')}
                      className={`text-xs font-bold px-3 py-1 rounded-lg transition-colors border ${
                        filterBagian === 'all'
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      Tampilkan Semua 29 Butir
                    </button>
                  </div>
                </div>

                {/* Grid of the 5 Bagian Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {bagianList.slice(0, 5).map(b => {
                    const itemsInBagian = OFFICIAL_LOGBOOK_ITEMS.filter(it => it.bagian === b.num);
                    const completedInBagian = itemsInBagian.filter(
                      it => logbook.checks[it.code] && logbook.checks[it.code][currentDayIndex]
                    ).length;
                    const isComplete = completedInBagian === itemsInBagian.length;
                    const isActive = filterBagian === b.num;
                    const BagianIcon = b.icon;

                    return (
                      <div
                        key={b.num}
                        onClick={() => setFilterBagian(b.num)}
                        className={`rounded-2xl p-4 border cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                          isActive
                            ? `${b.activeBorder} ${b.activeBg} shadow-md`
                            : 'bg-slate-50/80 hover:bg-white border-slate-200 hover:border-blue-300 hover:shadow-xs'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={`px-2.5 py-0.5 rounded-lg text-[10.5px] font-black uppercase tracking-wider border ${b.badgeColor}`}>
                              {b.name}
                            </span>
                            <div className={`p-1.5 rounded-lg ${isActive ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}>
                              <BagianIcon className="w-4 h-4" />
                            </div>
                          </div>

                          <div>
                            <h4 className="text-xs font-black text-slate-900 line-clamp-2 leading-snug">
                              {b.title}
                            </h4>
                            <p className="text-[10.5px] text-slate-500 line-clamp-2 mt-0.5">
                              {b.subtitle}
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                          <span className={`text-[11px] font-black tabular-nums ${
                            isComplete ? 'text-emerald-700' : completedInBagian > 0 ? 'text-amber-700' : 'text-slate-400'
                          }`}>
                            {isComplete ? (
                              <span className="flex items-center gap-1">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                {completedInBagian}/{b.count} Selesai
                              </span>
                            ) : (
                              <span>{completedInBagian} / {b.count} Terisi</span>
                            )}
                          </span>

                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleOpenBagianModal(b.num);
                            }}
                            className="text-[10px] font-bold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-0.5"
                            title={`Buka dialog penginputan khusus ${b.name}`}
                          >
                            <span>Dialog &rarr;</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Optional button to access Bagian 6 (Terminasi) */}
                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                  <span>Perlu verifikasi terminasi aman &amp; desinfeksi mesin?</span>
                  <button
                    type="button"
                    onClick={() => setFilterBagian(6)}
                    className={`font-bold transition-colors ${
                      filterBagian === 6 ? 'text-emerald-800 underline' : 'text-emerald-700 hover:underline'
                    }`}
                  >
                    Buka Bagian 6: Terminasi &amp; Desinfeksi Mesin (5 SPO) &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Calendar Strip & Date Picker Control */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedDay(prev => Math.max(1, prev - 1))}
                    disabled={selectedDay === 1}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="Tanggal Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDay(prev => Math.min(31, prev + 1))}
                    disabled={selectedDay === 31}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="Tanggal Berikutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Tanggal Pelaksanaan Asuhan
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <span>{getDayName(selectedDay)}, {selectedDay} Oktober 2026</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                      Shift {logbook.shift}
                    </span>
                  </h3>
                </div>
              </div>

              {/* Quick Jump Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">Lompat ke tgl:</span>
                <select
                  value={selectedDay}
                  onChange={e => setSelectedDay(Number(e.target.value))}
                  className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  {daysArray.map(d => (
                    <option key={d} value={d}>
                      Tgl {d} ({computeDailyActivitiesCount(logbook.checks, d - 1)}/29 SPO)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Scrollable Visual Calendar Strip 1-31 */}
            <div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                {daysArray.map(day => {
                  const dayIdx = day - 1;
                  const isSelected = selectedDay === day;
                  const count = computeDailyActivitiesCount(logbook.checks, dayIdx);
                  const isFull = count === OFFICIAL_LOGBOOK_ITEMS.length;
                  const isPartial = count > 0 && !isFull;
                  const dayName = getDayName(day);

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      className={`min-w-[44px] py-2 px-1 rounded-xl text-center transition-all flex flex-col items-center shrink-0 border cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-300'
                          : isFull
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                          : isPartial
                          ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                      title={`Tanggal ${day} (${dayName}): ${count}/29 Selesai`}
                    >
                      <span className="text-[9.5px] uppercase font-semibold opacity-75">
                        {dayName}
                      </span>
                      <span className="text-sm font-black mt-0.5">
                        {day}
                      </span>
                      <span className="text-[10px] font-bold mt-1">
                        {isFull ? (
                          <span className={isSelected ? 'text-white' : 'text-emerald-700'}>✓</span>
                        ) : count > 0 ? (
                          <span className={isSelected ? 'text-blue-100' : 'text-amber-700'}>{count}</span>
                        ) : (
                          <span className="text-slate-300">·</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Calendar Legend */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                    <span>100% Selesai (29 SPO)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                    <span>Sebagian Terisi</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block"></span>
                    <span>Belum Diisi</span>
                  </span>
                </div>

                <div className="font-semibold text-slate-600">
                  Total Hari Aktif Bulan Ini: <strong className="text-blue-900 font-bold">{monthlyActiveDaysCount}</strong> dari 31 Hari
                </div>
              </div>
            </div>
          </div>

          {/* Quick Score Card & Master 1-Click Action */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Progress gauge */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex flex-col items-center justify-center shrink-0">
                <span className="text-xl font-black text-blue-900 tabular-nums">
                  {selectedDayPct}%
                </span>
                <span className="text-[9px] font-bold text-blue-700 uppercase">
                  Capaian
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Kemajuan Checklist Tanggal {selectedDay}
                  </span>
                  {selectedDayPct === 100 && (
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      LENGKAP
                    </span>
                  )}
                </div>
                <h4 className="text-base font-extrabold text-slate-900">
                  <span className="text-blue-900 tabular-nums">{selectedDayCompletedCount}</span> dari 29 Kegiatan SPO Terverifikasi
                </h4>
                {/* Progress bar */}
                <div className="w-48 sm:w-64 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                  <div
                    className={`h-full transition-all duration-300 ${
                      selectedDayPct === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${selectedDayPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 1-Click Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 self-end md:self-auto shrink-0">
              <button
                type="button"
                onClick={handleCheckAllForSelectedDay}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                title="Tandai seluruh 29 kegiatan SPO terlaksana untuk tanggal ini"
              >
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>Centang Semua SPO (1-Klik 100%)</span>
              </button>

              <button
                type="button"
                onClick={handleResetSelectedDay}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-200 cursor-pointer"
                title="Kosongkan checklist untuk tanggal yang aktif"
              >
                <RefreshCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset Hari Ini</span>
              </button>
            </div>
          </div>

          {/* Search & Active Bagian Notice */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">
                Menampilkan:{' '}
                <strong className="text-blue-900">
                  {filterBagian === 'all'
                    ? 'Semua 6 Bagian (29 Kegiatan SPO)'
                    : `Bagian ${filterBagian}: ${bagianList.find(b => b.num === filterBagian)?.title}`}
                </strong>
              </span>
              {filterBagian !== 'all' && (
                <button
                  type="button"
                  onClick={() => setFilterBagian('all')}
                  className="text-[11px] text-blue-600 hover:underline font-semibold"
                >
                  (Tampilkan Semua)
                </button>
              )}
            </div>

            {/* Quick Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari butir SPO atau kata kunci..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Checklist Sections */}
          <div className="space-y-4">
            {bagianList
              .filter(b => filterBagian === 'all' || filterBagian === b.num)
              .map(bagian => {
                const itemsInThisBagian = filteredItems.filter(it => it.bagian === bagian.num);
                if (itemsInThisBagian.length === 0) return null;

                const completedInThisBagian = itemsInThisBagian.filter(
                  it => logbook.checks[it.code] && logbook.checks[it.code][currentDayIndex]
                ).length;
                const isBagianComplete = completedInThisBagian === itemsInThisBagian.length;
                const BagianIcon = bagian.icon;

                return (
                  <div
                    key={bagian.num}
                    id={`bagian-section-${bagian.num}`}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
                  >
                    {/* Bagian Header Banner */}
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl border ${bagian.badgeColor}`}>
                          <BagianIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {bagian.name}
                            </span>
                            <h3 className="text-sm font-black text-slate-900">
                              {bagian.title}
                            </h3>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {bagian.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleCheckAllInBagian(bagian.num)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1"
                          title={`Tandai seluruh butir ${bagian.name} selesai`}
                        >
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Centang Bagian Ini</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenBagianModal(bagian.num)}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1"
                          title="Buka form dialog untuk Bagian ini"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                          <span>Dialog Form</span>
                        </button>

                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                          isBagianComplete
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}>
                          {completedInThisBagian} / {itemsInThisBagian.length} Selesai
                        </span>
                      </div>
                    </div>

                    {/* List of Activities in this Bagian */}
                    <div className="divide-y divide-slate-100">
                      {itemsInThisBagian.map(item => {
                        const isChecked = !!(logbook.checks[item.code] && logbook.checks[item.code][currentDayIndex]);
                        const note = logbook.notes[item.code] || '';
                        const isNoteOpen = expandedNotes[item.code] || !!note;

                        return (
                          <div
                            key={item.code}
                            className={`p-4 transition-colors flex flex-col gap-3 ${
                              isChecked ? 'bg-emerald-50/20' : 'bg-white hover:bg-slate-50/50'
                            }`}
                          >
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                              {/* Left Content */}
                              <div className="space-y-1.5 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-blue-100 text-blue-900 border border-blue-200 tabular-nums">
                                    {item.code}
                                  </span>
                                  <span className="font-extrabold text-xs text-slate-900">
                                    {item.category}
                                  </span>
                                  <span className="text-[11px] text-slate-500 font-mono">
                                    Standar: <strong className="text-slate-700">{item.standardSpo}</strong>
                                  </span>
                                </div>

                                <p className="text-xs text-slate-700 leading-relaxed font-normal">
                                  {item.description}
                                </p>
                              </div>

                              {/* Right Interactive Toggle Button */}
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleToggleItemForSelectedDay(item.code)}
                                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                                    isChecked
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-300'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                                  }`}
                                >
                                  {isChecked ? (
                                    <>
                                      <CheckSquare className="w-4 h-4 text-white" />
                                      <span>TERLAKSANA SESUAI SPO</span>
                                    </>
                                  ) : (
                                    <>
                                      <Square className="w-4 h-4 text-slate-400" />
                                      <span>BELUM TERLAKSANA</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Observation Notes (Read-Only) */}
                            {note && (
                              <div className="pt-1 text-[11px] text-slate-500 italic truncate max-w-md">
                                Catatan: "{note}"
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* -------------------- TAB 2: MATRIKS BULANAN (1-31) -------------------- */}
      {activeTab === 'monthly_matrix' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-0">
          {/* Header of Matrix View */}
          <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Matriks Pelaksanaan Harian Tanggal 1 s/d 31 ({logbook.monthYear})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Klik sel kotak tanggal (1–31) untuk mencentang langsung ('V') atau klik nomor tanggal di atas kolom untuk membuka fokus hari tersebut.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('print_preview')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Lihat Format Cetak A4</span>
              </button>
            </div>
          </div>

          {/* Interactive Scrollable Table with Sticky Left Columns */}
          <div className="overflow-x-auto max-h-[700px] relative scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-20">
                <tr className="bg-slate-900 text-white font-bold text-center text-[10px]">
                  <th rowSpan={2} className="p-2 border border-slate-700 w-12 sticky left-0 z-30 bg-slate-900">
                    NO
                  </th>
                  <th rowSpan={2} className="p-2 border border-slate-700 w-36 text-left sticky left-12 z-30 bg-slate-900">
                    FASE ASUHAN
                  </th>
                  <th rowSpan={2} className="p-2 border border-slate-700 min-w-[200px] text-left">
                    URAIAN KEGIATAN SPESIFIK SPO
                  </th>
                  <th colSpan={31} className="p-1 border border-slate-700 text-[9px] uppercase tracking-wider bg-slate-800">
                    TANGGAL PELAKSANAAN (BULAN {logbook.monthYear.toUpperCase()})
                  </th>
                  <th rowSpan={2} className="p-2 border border-slate-700 w-12 bg-slate-900">
                    TOTAL
                  </th>
                  <th rowSpan={2} className="p-2 border border-slate-700 w-14 bg-slate-900">
                    %
                  </th>
                </tr>
                <tr className="bg-slate-800 text-white font-bold text-[8.5px] text-center">
                  {daysArray.map(day => (
                    <th
                      key={day}
                      onClick={() => {
                        setSelectedDay(day);
                        setActiveTab('daily_input');
                      }}
                      title={`Klik untuk buka formulir tanggal ${day}`}
                      className={`p-1 border border-slate-700 w-6 cursor-pointer hover:bg-blue-600 transition-colors ${
                        selectedDay === day ? 'bg-amber-500 text-slate-950 font-black' : ''
                      }`}
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[11px]">
                {OFFICIAL_LOGBOOK_ITEMS.map((item, idx) => {
                  const itemChecks = logbook.checks[item.code] || [];
                  const { total, pct } = computeItemTotalAndPct(itemChecks, 20);

                  return (
                    <tr
                      key={item.code}
                      className={idx % 2 === 1 ? 'bg-slate-50/60 hover:bg-blue-50/40' : 'bg-white hover:bg-blue-50/40'}
                    >
                      <td className="p-2 text-center font-bold text-slate-900 border-r border-slate-200 sticky left-0 bg-inherit z-10">
                        {item.code}
                      </td>
                      <td className="p-2 font-semibold text-slate-900 border-r border-slate-200 sticky left-12 bg-inherit z-10 leading-tight">
                        {item.category}
                      </td>
                      <td className="p-2 text-slate-700 border-r border-slate-200 text-[10.5px] leading-tight">
                        {item.description}
                      </td>

                      {/* 31 Interactive Toggleable Cells */}
                      {daysArray.map((day, dayIdx) => {
                        const isChecked = itemChecks[dayIdx];
                        const isCurrentDay = selectedDay === day;

                        return (
                          <td
                            key={day}
                            onClick={() => handleToggleCell(item.code, dayIdx)}
                            className={`p-0 text-center font-black cursor-pointer border border-slate-200 text-xs transition-colors select-none ${
                              isChecked
                                ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                                : 'text-slate-300 hover:bg-slate-100'
                            } ${isCurrentDay ? 'ring-1 ring-blue-500' : ''}`}
                            title={`Tgl ${day}: ${item.code} ${isChecked ? 'Sudah (V)' : 'Belum'}`}
                          >
                            {isChecked ? 'V' : ''}
                          </td>
                        );
                      })}

                      <td className="p-2 text-center font-bold text-blue-950 border-l border-slate-200 tabular-nums">
                        {total}
                      </td>
                      <td className="p-2 text-center font-bold text-emerald-800 border-l border-slate-200 tabular-nums">
                        {pct}%
                      </td>
                    </tr>
                  );
                })}

                {/* Footer Sums Row */}
                <tr className="bg-slate-100 font-black text-slate-900 text-center border-t-2 border-slate-400 text-[9px] sticky bottom-0 z-10">
                  <td colSpan={3} className="p-2.5 border-r border-slate-300 text-right uppercase tracking-wider font-extrabold sticky left-0 bg-slate-100 z-10">
                    JUMLAH KEGIATAN TERLAKSANA PER HARI
                  </td>
                  {daysArray.map((_, dayIdx) => {
                    const count = computeDailyActivitiesCount(logbook.checks, dayIdx);
                    return (
                      <td key={dayIdx} className="p-1 border border-slate-300 font-bold tabular-nums">
                        {count}
                      </td>
                    );
                  })}
                  <td colSpan={2} className="p-2.5 border-l border-slate-300 text-emerald-900 font-black text-xs">
                    Rata-rata 100%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------- TAB 3: PRATINJAU CETAK RESMI (PDF 1:1) -------------------- */}
      {activeTab === 'print_preview' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between print:hidden">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Format Lembar Logbook Resmi (Standar Landscape A4)
              </h3>
              <p className="text-xs text-slate-500">
                Format ini persis dokumen PDF RS Happy Land Medical Centre siap tanda tangan perawat dan PJ shift.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const docTitle = `Logbook_Bulanan_${logbook.nurseName}_${logbook.monthYear}`;
                printDocumentWithOrientation(true, docTitle);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>
          </div>

          <OfficialPelaksanaLogbookPrintable logbook={logbook} />
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DIALOG INPUT KHUSUS PER-BAGIAN (BAGIAN 1 - 5) */}
      {/* ========================================================================= */}
      {isBagianModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-2.5 md:p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-[98vw] 2xl:max-w-[1560px] h-[97vh] max-h-[97vh] rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase">
                    Form Input Cepat
                  </span>
                  <span className="text-xs text-slate-400">
                    Tanggal {selectedDay} Oktober 2026 &bull; Shift {logbook.shift}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-white">
                  Penginputan Logbook Asuhan: Bagian {activeModalBagian}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setIsBagianModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                title="Tutup dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 5 BAGIAN TAB SWITCHER BUTTONS ACROSS TOP */}
            <div className="px-4 py-1.5 bg-slate-100 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
              {bagianList.slice(0, 5).map(b => {
                const itemsInBagian = OFFICIAL_LOGBOOK_ITEMS.filter(it => it.bagian === b.num);
                const completedInBagian = itemsInBagian.filter(
                  it => logbook.checks[it.code] && logbook.checks[it.code][currentDayIndex]
                ).length;
                const isComplete = completedInBagian === itemsInBagian.length;
                const isSelected = activeModalBagian === b.num;

                return (
                  <button
                    key={b.num}
                    type="button"
                    onClick={() => setActiveModalBagian(b.num)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 border cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>{b.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isComplete
                        ? isSelected ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-800'
                        : isSelected ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {completedInBagian}/{b.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Modal Body: The Checklist Items for this Selected Bagian */}
            <div className="p-5 overflow-y-auto space-y-3.5 flex-1 divide-y divide-slate-100">
              {(() => {
                const activeBagianInfo = bagianList.find(b => b.num === activeModalBagian);
                const items = OFFICIAL_LOGBOOK_ITEMS.filter(it => it.bagian === activeModalBagian);
                const completedCount = items.filter(
                  it => logbook.checks[it.code] && logbook.checks[it.code][currentDayIndex]
                ).length;

                return (
                  <>
                    <div className="pb-3 flex items-center justify-between">
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900">
                          {activeBagianInfo?.title}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {activeBagianInfo?.subtitle}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCheckAllInBagian(activeModalBagian)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Centang Semua ({items.length} SPO)</span>
                      </button>
                    </div>

                    {items.map(item => {
                      const isChecked = !!(logbook.checks[item.code] && logbook.checks[item.code][currentDayIndex]);
                      const note = logbook.notes[item.code] || '';

                      return (
                        <div
                          key={item.code}
                          className={`pt-3.5 pb-2 transition-colors flex flex-col gap-2.5 ${
                            isChecked ? 'bg-emerald-50/25 p-3 rounded-xl' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-xs font-black bg-blue-100 text-blue-900 border border-blue-200 tabular-nums">
                                  {item.code}
                                </span>
                                <span className="text-xs font-bold text-slate-900">
                                  {item.category}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {item.standardSpo}
                                </span>
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed">
                                {item.description}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleItemForSelectedDay(item.code)}
                              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                                isChecked
                                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                              }`}
                            >
                              {isChecked ? (
                                <>
                                  <CheckSquare className="w-4 h-4 text-white" />
                                  <span>TERLAKSANA</span>
                                </>
                              ) : (
                                <>
                                  <Square className="w-4 h-4 text-slate-400" />
                                  <span>BELUM</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Quick note row - excluded for Bagian 1 */}
                          {activeModalBagian !== 1 && (
                            <div className="pt-1">
                              <input
                                type="text"
                                placeholder={`Catatan observasi untuk butir ${item.code} (opsional)...`}
                                value={note}
                                onChange={e => handleNoteChange(item.code, e.target.value)}
                                className="w-full text-xs px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  if (activeModalBagian > 1) {
                    setActiveModalBagian(prev => prev - 1);
                  }
                }}
                disabled={activeModalBagian === 1}
                className="px-3.5 py-2 bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-bold disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                &larr; Bagian Sebelumnya
              </button>

              <div className="flex items-center gap-2">
                {activeModalBagian < 5 ? (
                  <button
                    type="button"
                    onClick={() => setActiveModalBagian(prev => prev + 1)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <span>Lanjut ke Bagian {activeModalBagian + 1}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsBagianModalOpen(false);
                      showToast('Penginputan 5 Bagian Logbook selesai!');
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Selesai &amp; Simpan</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
