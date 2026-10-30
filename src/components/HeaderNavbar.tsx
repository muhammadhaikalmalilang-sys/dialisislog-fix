import React, { useState } from 'react';
import { ShiftInfo, SystemAccessRole } from '../types/dialysis.ts';
import {
  AppNavTabId,
  formatSystemAccessLabel,
  getAccessibleTabs,
  getDefaultTabForRole
} from '../utils/masterDataHelpers.ts';
import {
  getCurrentIndonesianFullDate,
  indonesianDateLabelToIso,
  normalizeIndonesianDateLabel
} from '../utils/dateHelpers.ts';
import { RshlLogo } from './RshlLogo.tsx';
import {
  Book,
  Calendar,
  ClipboardCheck,
  Cpu,
  FileSpreadsheet,
  FileText,
  History,
  LogOut,
  Menu,
  RotateCcw,
  Stethoscope,
  User,
  UserPlus,
  Users,
  X
} from 'lucide-react';

export type HeaderNavTab = AppNavTabId;

interface AppNavigationShellProps {
  currentTab: HeaderNavTab;
  onSelectTab: (tab: HeaderNavTab) => void;
  shiftInfo?: ShiftInfo;
  userRole?: SystemAccessRole;
  loggedInUserName?: string;
  onDateChange?: (isoDate: string) => void;
  isCustomDate?: boolean;
  onResetDateToToday?: () => void;
  onLogout?: () => void;
  isCloudConnected?: boolean;
  isQuotaExceeded?: boolean;
  children: React.ReactNode;
}

interface SidebarNavItemConfig {
  id: AppNavTabId;
  label: string;
  renderIcon: (isActive: boolean) => React.ReactNode;
}

const SpeedometerIcon: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  if (isActive) {
    return (
      <svg
        viewBox="0 0 24 24"
        className="w-[22px] h-[22px] shrink-0 text-[#1f6a96]"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 4C6.48 4 2 8.48 2 14C2 16.25 2.74 18.32 4 20H20C21.26 18.32 22 16.25 22 14C22 8.48 17.52 4 12 4Z"
          fill="currentColor"
        />
        <circle cx="12" cy="15.5" r="1.8" fill="white" />
        <path
          d="M12 15.5L15.8 10.5"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="6.2" cy="14" r="1" fill="white" />
        <circle cx="8" cy="9.8" r="1" fill="white" />
        <circle cx="12" cy="8" r="1" fill="white" />
        <circle cx="16" cy="9.8" r="1" fill="white" />
        <circle cx="17.8" cy="14" r="1" fill="white" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className="w-[22px] h-[22px] shrink-0 text-slate-900"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 4a10 10 0 0 0-8 16h16a10 10 0 0 0-8-16Z" />
      <path d="m12 15 3.5-4.5" />
      <circle cx="12" cy="15" r="1.2" fill="currentColor" />
    </svg>
  );
};

const MonthlyChartIcon: React.FC<{ isActive: boolean }> = ({ isActive }) => (
  <svg
    viewBox="0 0 24 24"
    className={`w-[22px] h-[22px] shrink-0 ${
      isActive ? 'text-[#1f6a96]' : 'text-slate-900'
    }`}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3.5" y="13" width="3.8" height="7.5" rx="0.8" />
    <rect x="10.1" y="9" width="3.8" height="11.5" rx="0.8" />
    <rect x="16.7" y="4.5" width="3.8" height="16" rx="0.8" />
    <path d="m4 9.5 6-4 5 2 5-4" strokeWidth="1.8" />
  </svg>
);

const ALL_SIDEBAR_ITEMS: SidebarNavItemConfig[] = [
  {
    id: 'dashboard',
    label: 'DASHBOARD',
    renderIcon: (isActive) => <SpeedometerIcon isActive={isActive} />
  },
  {
    id: 'logbook',
    label: 'LOGBOOK',
    renderIcon: (isActive) => (
      <Book
        className={`w-[21px] h-[21px] shrink-0 ${
          isActive ? 'text-[#1f6a96]' : 'text-slate-900'
        }`}
        strokeWidth={2}
      />
    )
  },
  {
    id: 'laporan_pasien',
    label: 'LAPORAN PASIEN',
    renderIcon: (isActive) => (
      <FileSpreadsheet
        className={`w-[21px] h-[21px] shrink-0 ${
          isActive ? 'text-[#1f6a96]' : 'text-slate-900'
        }`}
        strokeWidth={2}
      />
    )
  },
  {
    id: 'verifikasi',
    label: 'VERIFIKASI',
    renderIcon: (isActive) => (
      <ClipboardCheck
        className={`w-[21px] h-[21px] shrink-0 ${
          isActive ? 'text-[#1f6a96]' : 'text-slate-900'
        }`}
        strokeWidth={2}
      />
    )
  },
  {
    id: 'riwayat',
    label: 'RIWAYAT',
    renderIcon: (isActive) => (
      <History
        className={`w-[21px] h-[21px] shrink-0 ${
          isActive ? 'text-[#1f6a96]' : 'text-slate-900'
        }`}
        strokeWidth={2}
      />
    )
  },
  {
    id: 'lap_harian',
    label: 'LAPORAN HARIAN',
    renderIcon: (isActive) => (
      <FileText
        className={`w-[21px] h-[21px] shrink-0 ${
          isActive ? 'text-[#1f6a96]' : 'text-slate-900'
        }`}
        strokeWidth={2}
      />
    )
  },
  {
    id: 'lap_bulanan',
    label: 'LAPORAN BULANAN',
    renderIcon: (isActive) => <MonthlyChartIcon isActive={isActive} />
  },
  {
    id: 'data_pasien',
    label: 'DATA PASIEN',
    renderIcon: (isActive) => (
      <Users
        className={`w-[21px] h-[21px] shrink-0 ${
          isActive ? 'text-[#1f6a96]' : 'text-slate-900'
        }`}
        strokeWidth={2}
      />
    )
  },
  {
    id: 'data_perawat',
    label: 'DATA PERAWAT',
    renderIcon: (isActive) => (
      <UserPlus
        className={`w-[21px] h-[21px] shrink-0 ${
          isActive ? 'text-[#1f6a96]' : 'text-slate-900'
        }`}
        strokeWidth={2}
      />
    )
  },
  {
    id: 'data_mesin',
    label: 'DATA MESIN',
    renderIcon: (isActive) => (
      <Cpu
        className={`w-[21px] h-[21px] shrink-0 ${
          isActive ? 'text-[#1f6a96]' : 'text-slate-900'
        }`}
        strokeWidth={2}
      />
    )
  },
  {
    id: 'data_dokter',
    label: 'DATA DOKTER',
    renderIcon: (isActive) => (
      <Stethoscope
        className={`w-[21px] h-[21px] shrink-0 ${
          isActive ? 'text-[#1f6a96]' : 'text-slate-900'
        }`}
        strokeWidth={2}
      />
    )
  },
  {
    id: 'my_account',
    label: 'MY ACCOUNT',
    renderIcon: (isActive) => (
      <User
        className={`w-[21px] h-[21px] shrink-0 ${
          isActive ? 'text-[#1f6a96]' : 'text-slate-900'
        }`}
        strokeWidth={2}
      />
    )
  }
];

export const AppShellLayout: React.FC<AppNavigationShellProps> = ({
  currentTab,
  onSelectTab,
  shiftInfo,
  userRole = 'perawat_pelaksana',
  loggedInUserName,
  onDateChange,
  isCustomDate = false,
  onResetDateToToday,
  onLogout,
  isCloudConnected = false,
  isQuotaExceeded = false,
  children
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeDate = shiftInfo?.date
    ? normalizeIndonesianDateLabel(shiftInfo.date)
    : getCurrentIndonesianFullDate();
  const activeIsoDate = indonesianDateLabelToIso(activeDate);
  const activeShift = shiftInfo?.shift || 'Pagi';

  const accessibleTabs = getAccessibleTabs(userRole);
  const defaultTab = getDefaultTabForRole(userRole);

  const visibleNavItems = ALL_SIDEBAR_ITEMS.filter((item) =>
    accessibleTabs.includes(item.id)
  );

  const handleTabClick = (tab: HeaderNavTab) => {
    if (!accessibleTabs.includes(tab)) return;
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  const displayName =
    loggedInUserName && loggedInUserName !== '-'
      ? loggedInUserName
      : formatSystemAccessLabel(userRole);

  const renderSidebarContent = (idPrefix: string) => (
    <div className="flex flex-col h-full py-6 px-4 select-none">
      {/* Top RSHL Logo */}
      <button
        type="button"
        onClick={() => handleTabClick(defaultTab)}
        className="w-full mb-6 py-2 px-2 flex items-center justify-center focus:outline-hidden cursor-pointer transition-transform duration-200 hover:scale-[1.02] group"
        title="Halaman Utama Sistem Logbook Dialisis"
      >
        <RshlLogo
          className="w-[195px] xl:w-[220px] max-w-full h-auto drop-shadow-xs transition-transform group-hover:scale-[1.02]"
          idPrefix={idPrefix}
        />
      </button>

      {/* Vertical Navigation Links */}
      <nav className="flex-1 space-y-2 overflow-y-auto pr-0.5">
        {visibleNavItems.map((item) => {
          const isActive = currentTab === item.id;
          const isSupervisor = userRole === 'pj_shift' || userRole === 'kepala_ruangan';
          const itemLabel =
            item.id === 'lap_harian' && isSupervisor
              ? 'LAPORAN PJ SHIFT'
              : item.label;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleTabClick(item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-[14px] text-left transition-all duration-150 cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-gradient-to-r from-[#bfe0f6]/92 via-[#e6f3fb]/95 to-white/95 border border-white/90 shadow-[0_6px_18px_rgba(18,62,105,0.12)] text-[#1f6a96] font-semibold'
                  : 'text-slate-900 hover:bg-white/45 font-medium border border-transparent'
              }`}
            >
              {item.renderIcon(isActive)}
              <span className="text-[13.5px] xl:text-[14px] tracking-[0.02em] uppercase truncate">
                {itemLabel}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="app-shell-root relative z-10 min-h-screen flex flex-col lg:flex-row print:static print:min-h-0 print:block">
      {/* ===================================================================== */}
      {/* DESKTOP LEFT FROSTED-GLASS SIDEBAR                                    */}
      {/* ===================================================================== */}
      <aside className="hidden lg:flex lg:flex-col w-[248px] xl:w-[262px] shrink-0 sticky top-0 h-screen bg-gradient-to-b from-[#a5cfec]/82 via-[#cbe3f4]/78 to-[#b8d6ec]/82 backdrop-blur-xl border-r border-white/80 shadow-[4px_0_24px_rgba(12,40,72,0.08)] print:hidden">
        {renderSidebarContent('desktop-sidebar-rshl')}
      </aside>

      {/* ===================================================================== */}
      {/* MOBILE TOP BAR & DRAWER (< lg)                                        */}
      {/* ===================================================================== */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-3.5 py-2.5 bg-[#bddcf2]/88 backdrop-blur-xl border-b border-white/80 shadow-xs print:hidden">
        <button
          type="button"
          onClick={() => handleTabClick(defaultTab)}
          className="py-0.5 px-1 bg-transparent border-0 shadow-none cursor-pointer focus:outline-hidden transition-transform duration-200 hover:scale-[1.02]"
          title="Halaman Utama Sistem Logbook Dialisis"
        >
          <RshlLogo className="w-[136px] sm:w-[155px] h-auto drop-shadow-xs" idPrefix="mobile-bar-rshl" />
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 border border-white text-slate-900 text-xs font-bold shadow-2xs cursor-pointer"
            aria-label="Buka menu navigasi"
          >
            <Menu className="w-4 h-4" />
            <span>MENU</span>
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex print:hidden">
          <div
            className="fixed inset-0 bg-slate-950/35 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-[268px] max-w-[82vw] h-full bg-gradient-to-b from-[#add4ef]/95 via-[#d2e8f7]/95 to-[#bfdcf0]/95 backdrop-blur-xl border-r border-white shadow-2xl flex flex-col">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-3.5 right-3.5 p-1.5 rounded-lg bg-white/70 text-slate-700 hover:text-slate-950 cursor-pointer"
              aria-label="Tutup menu navigasi"
            >
              <X className="w-4 h-4" />
            </button>
            {renderSidebarContent('mobile-drawer-rshl')}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* RIGHT MAIN WORKSPACE COLUMN                                           */}
      {/* ===================================================================== */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Top Workspace Header: Title + Active Date/Shift + User Profile Card */}
        <header className="px-4 sm:px-7 xl:px-9 pt-4 sm:pt-5 pb-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 print:hidden">
          <div>
            <h1 className="text-[22px] sm:text-[28px] xl:text-[31px] font-black tracking-[-0.01em] text-slate-950 uppercase leading-none">
              SISTEM LOGBOOK DIALISIS
            </h1>
            <p className="mt-1 text-xs font-semibold text-[#185382] tracking-wide">
              Unit Hemodialisa · RS Happy Land Medical Centre
            </p>

            {/* Subtle Interactive Active Date & Role Context Line */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-slate-800">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#19588f] shrink-0" />
                {onDateChange ? (
                  <span
                    className="relative inline-flex items-center hover:text-[#19588f] underline decoration-slate-400/70 underline-offset-2 cursor-pointer"
                    title="Klik untuk menyesuaikan hari/tanggal aktif"
                  >
                    <strong className="font-semibold tabular-nums">{activeDate}</strong>
                    <input
                      type="date"
                      value={activeIsoDate}
                      onChange={(e) => {
                        if (e.target.value) {
                          onDateChange(e.target.value);
                        }
                      }}
                      aria-label="Pilih Hari dan Tanggal Aktif"
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                    />
                  </span>
                ) : (
                  <strong className="font-semibold tabular-nums">{activeDate}</strong>
                )}
              </span>

              {isCustomDate && onResetDateToToday && (
                <button
                  type="button"
                  onClick={onResetDateToToday}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#19588f] hover:underline cursor-pointer"
                  title="Kembalikan ke hari ini (Real-Time WIB)"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Hari Ini</span>
                </button>
              )}

              {userRole !== 'administrator' && (
                <>
                  <span aria-hidden="true" className="text-slate-400">
                    ·
                  </span>
                  <span>Shift {activeShift}</span>
                </>
              )}

              <span aria-hidden="true" className="text-slate-400">
                ·
              </span>
              <span>{formatSystemAccessLabel(userRole)}</span>
            </div>
          </div>

          {/* Top-Right Action Group & Profile Card */}
          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
            {/* Real-time Cloud Online Indicator */}
            {isQuotaExceeded ? (
              <div
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[14px] text-xs font-bold border transition-all bg-sky-50/90 text-sky-900 border-sky-300 shadow-[0_4px_12px_rgba(14,165,233,0.12)]"
                title="Batas kuota harian Cloud tercapai. Penyimpanan Lokal Aktif: Semua catatan & tindakan logbook tetap tersimpan aman di browser/perangkat ini."
              >
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                <span className="text-[11.5px] tracking-tight">Penyimpanan Lokal Aktif</span>
              </div>
            ) : (
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-[14px] text-xs font-bold border transition-all ${
                  isCloudConnected
                    ? 'bg-emerald-50/90 text-emerald-900 border-emerald-300 shadow-[0_4px_12px_rgba(16,185,129,0.12)]'
                    : 'bg-amber-50/90 text-amber-900 border-amber-300'
                }`}
                title={
                  isCloudConnected
                    ? 'Cloud Firestore Terhubung: Data logbook tersinkronisasi otomatis antar-HP perawat & PC Nurse Station'
                    : 'Menghubungkan ke Cloud Database Firestore...'
                }
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isCloudConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                <span className="text-[11.5px] tracking-tight">
                  {isCloudConnected ? 'Cloud Online' : 'Sinkronisasi...'}
                </span>
              </div>
            )}

            {/* Profile & Logout Card */}
            <div className="rounded-[15px] bg-white/74 backdrop-blur-md border border-white/85 shadow-[0_8px_22px_rgba(14,42,74,0.12)] px-4 py-2.5 flex items-center gap-3.5 shrink-0">
            {/* Avatar Silhouette Circle */}
            <button
              type="button"
              onClick={() => handleTabClick('my_account')}
              title="Buka Pengaturan Akun Saya"
              className="w-11 h-11 rounded-full bg-white/95 border border-slate-200/80 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer"
            >
              <svg
                viewBox="0 0 40 40"
                className="w-9 h-9 text-slate-400 mt-1"
                fill="currentColor"
                aria-hidden="true"
              >
                <circle cx="20" cy="14" r="6.5" />
                <path d="M7.5 35.5C8.8 28.4 13.8 24.5 20 24.5C26.2 24.5 31.2 28.4 32.5 35.5H7.5Z" />
              </svg>
            </button>

            <div className="min-w-0 pr-1">
              <p className="text-[13.5px] sm:text-[14px] font-bold text-slate-950 leading-tight truncate max-w-[215px]">
                {displayName}
              </p>
              <p className="text-[11.5px] font-medium text-slate-700 leading-tight mt-0.5">
                Unit Dialisis
              </p>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-[#1f6a96] hover:text-[#103d5c] transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>Logout</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

        {/* Main Frosted-Glass Container */}
        <main className="flex-1 px-4 sm:px-7 xl:px-9 pb-3 print:p-0">
          <div className="rounded-[20px] bg-gradient-to-b from-[#d8ebf7]/58 via-[#e7f2f9]/52 to-[#dae9f4]/58 backdrop-blur-md border border-white/75 shadow-[0_16px_44px_rgba(12,38,68,0.14)] p-4 sm:p-6 xl:p-7 print:bg-transparent print:backdrop-blur-none print:border-0 print:shadow-none print:p-0">
            {children}
          </div>
        </main>

        {/* Bottom Copyright Footer */}
        <footer className="py-3 px-4 text-center text-xs font-medium text-slate-900 print:hidden">
          © {new Date().getFullYear()} RS Happy Land Medical Centre. Semua Hak Dilindungi.
        </footer>
      </div>
    </div>
  );
};
