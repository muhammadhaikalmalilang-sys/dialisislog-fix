import React, { useState, useEffect } from 'react';
import {
  User,
  KeyRound,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  Lock,
  Hospital,
  Clock,
  Award,
  FileCheck,
  Phone,
  Mail,
  BadgeCheck,
  RefreshCw,
  Info,
  Calendar,
  Check,
  Users
} from 'lucide-react';
import { ShiftInfo, MasterNurse, SystemAccessRole } from '../types/dialysis.ts';
import { formatSystemAccessLabel } from '../utils/masterDataHelpers.ts';
import {
  getCurrentIndonesianFullDate,
  normalizeIndonesianDateLabel
} from '../utils/dateHelpers.ts';
import { LoginUserData } from './LoginPage.tsx';

interface MyAccountViewProps {
  shiftInfo?: ShiftInfo;
  masterNurses?: MasterNurse[];
  onOpenMasterDataModal?: () => void;
  onLogoutSuccess?: () => void;
  userRole?: SystemAccessRole;
  onRoleChange?: (role: SystemAccessRole) => void;
  loggedInUser?: LoginUserData | null;
  onUpdateOwnPassword?: (
    currentPassword: string,
    newPassword: string
  ) => { ok: boolean; error?: string };
}

export type AccountTab = 'profil' | 'change_password' | 'logout';

export const MyAccountView: React.FC<MyAccountViewProps> = ({
  shiftInfo,
  masterNurses,
  onOpenMasterDataModal,
  onLogoutSuccess,
  userRole = 'perawat_pelaksana',
  onRoleChange,
  loggedInUser,
  onUpdateOwnPassword
}) => {
  const [activeTab, setActiveTab] = useState<AccountTab>('profil');

  // ==========================================
  // PROFILE STATE
  // ==========================================
  const defaultNurseName =
    loggedInUser?.name ||
    (userRole === 'administrator' ? 'Administrator Unit HD' : '-');
  const [profileData, setProfileData] = useState({
    name: defaultNurseName,
    email: loggedInUser?.email || 'admin@happyland.co.id',
    phone: '-',
    role: loggedInUser?.role || formatSystemAccessLabel(userRole),
    nip: loggedInUser?.nip || '-',
    nira: '-',
    strNumber: '-',
    strExpiry: '-',
    careerLevel: userRole === 'administrator' ? 'Administrator Sistem' : 'Perawat Dialisis',
    pernefriCertNumber: '-',
    pernefriExpiry: '-',
    hospital: 'RS Happy Land Medical Centre',
    unit: 'Instalasi Hemodialisis & Dialisis',
    status: 'Aktif Dinas'
  });

  useEffect(() => {
    if (loggedInUser) {
      setProfileData(prev => ({
        ...prev,
        name: loggedInUser.name || prev.name,
        email: loggedInUser.email || prev.email,
        role: loggedInUser.role || prev.role,
        nip: loggedInUser.nip || prev.nip
      }));
    }
  }, [loggedInUser]);

  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);

  // ==========================================
  // CHANGE PASSWORD STATE
  // ==========================================
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // ==========================================
  // LOGOUT STATE
  // ==========================================
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);
  const [isLoggedOutScreen, setIsLoggedOutScreen] = useState(false);
  const [isLockScreen, setIsLockScreen] = useState(false);

  // Profile Save Handler
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccessMsg('Perubahan profil berhasil disimpan ke sistem.');
    setTimeout(() => {
      setProfileSuccessMsg(null);
    }, 4000);
  };

  // Password Change Handler
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Harap masukkan kata sandi saat ini.');
      return;
    }
    if (newPassword.length < 4) {
      setPasswordError('Kata sandi baru minimal harus terdiri dari 4 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi kata sandi baru tidak sesuai / tidak cocok.');
      return;
    }

    if (onUpdateOwnPassword) {
      const res = onUpdateOwnPassword(currentPassword, newPassword);
      if (!res.ok) {
        setPasswordError(res.error || 'Kata sandi saat ini tidak sesuai.');
        return;
      }
    }

    setPasswordSuccess('Kata sandi akun Anda berhasil diperbarui! Harap ingat sandi baru Anda.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');

    setTimeout(() => {
      setPasswordSuccess(null);
    }, 5000);
  };

  // Password strength checker
  const hasMinLength = newPassword.length >= 8;
  const hasNumber = /\d/.test(newPassword);
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasSpecial = /[^a-zA-Z0-9]/.test(newPassword);
  const strengthScore = [hasMinLength, hasNumber, hasLetter, hasSpecial].filter(Boolean).length;

  // Logout Handler
  const handleConfirmLogout = () => {
    setShowLogoutConfirmModal(false);
    setIsLoggedOutScreen(true);
    if (onLogoutSuccess) {
      onLogoutSuccess();
    }
  };

  // Relogin / Unlock
  const handleRelogin = () => {
    setIsLoggedOutScreen(false);
    setIsLockScreen(false);
    setActiveTab('profil');
  };

  // If Lock Screen is active
  if (isLockScreen) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-8 max-w-md mx-auto text-center space-y-6 my-12">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto border-2 border-blue-200">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-900">Layar Sesi Terkunci</h3>
          <p className="text-xs text-slate-500 mt-1">
            Nurse Station Instalasi Hemodialisis RS Happy Land
          </p>
          <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div className="font-bold text-slate-800">{profileData.name}</div>
            <div className="text-[11px] text-slate-500">{profileData.role}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRelogin}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Buka Kunci Layar (Kembali Bertugas)</span>
        </button>
      </div>
    );
  }

  // If Logged Out Screen is active
  if (isLoggedOutScreen) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-8 max-w-md mx-auto text-center space-y-6 my-12">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-200">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-900">Sesi Berhasil Diakhiri</h3>
          <p className="text-xs text-slate-500 mt-1">
            Anda telah keluar dari akun Sistem Logbook Hemodialisis RS Happy Land Medical Centre.
          </p>
          <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 text-left space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Pengguna:</span>
              <strong className="text-slate-800">{profileData.name}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Shift Dinas:</span>
              <strong className="text-emerald-700">Shift Selesai</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Waktu Logout:</span>
              <span className="text-slate-800 font-medium">Baru saja</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRelogin}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
        >
          <User className="w-4 h-4" />
          <span>Masuk Kembali (Login Shift)</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* TOP USER CARD BANNER                                                      */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white border border-blue-900/60 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div>
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-md border-2 border-white/20">
                {profileData.name
                  .split(' ')
                  .map(n => n[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('') || 'HD'}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1 text-xs">
                <span className="font-black uppercase tracking-wider text-indigo-200">
                  Hak Akses: {formatSystemAccessLabel(userRole)}
                </span>
                <span aria-hidden="true" className="text-blue-400">
                  &middot;
                </span>
                <span className="font-semibold text-emerald-300 flex items-center gap-1">
                  <BadgeCheck className="w-3.5 h-3.5 shrink-0" />
                  {userRole === 'administrator' ? 'Pengelola Data Pasien, Perawat & Mesin' : 'PERNEFRI Terverifikasi'}
                </span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">{profileData.name}</h2>
              <div className="text-xs text-blue-200/80 flex items-center gap-3 mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                  {profileData.email}
                </span>
                <span>&bull;</span>
                <span className="flex items-center gap-1">
                  <Hospital className="w-3.5 h-3.5 text-blue-400" />
                  {profileData.hospital}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Main Account Tabs Selector */}
        <div className="mt-6 pt-4 border-t border-blue-900/60 flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('profil')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'profil'
                ? 'bg-white text-blue-900 shadow-sm'
                : 'bg-white/5 hover:bg-white/15 text-blue-100 border border-white/10'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>PROFIL PERAWAT</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('change_password')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'change_password'
                ? 'bg-white text-blue-900 shadow-sm'
                : 'bg-white/5 hover:bg-white/15 text-blue-100 border border-white/10'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>CHANGE PASSWORD</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logout')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'logout'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30'
            }`}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>LOGOUT AKUN</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB CONTENT 1: PROFIL                                                     */}
      {/* ========================================================================= */}
      {activeTab === 'profil' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Edit Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Data Biodata &amp; Kredensial Perawat
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Informasi profil perawat pelaksana dan penanggung jawab dinas unit hemodialisis.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                Kredensial Aktif
              </span>
            </div>

            {profileSuccessMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-900 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Lengkap &amp; Gelar
                  </label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Akun Pengguna
                  </label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={e => setProfileData({ ...profileData, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor WhatsApp / Kontak
                  </label>
                  <input
                    type="text"
                    value={profileData.phone}
                    onChange={e => setProfileData({ ...profileData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Peran / Jabatan Dinas
                  </label>
                  <select
                    value={profileData.role}
                    onChange={e => setProfileData({ ...profileData, role: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium"
                  >
                    <option value="Administrator Unit HD">Administrator Unit HD</option>
                    <option value="Kepala Ruangan (Ka. Ruangan)">Kepala Ruangan (Ka. Ruangan)</option>
                    <option value="Penanggung Jawab Shift (PJ Shift)">Penanggung Jawab Shift (PJ Shift)</option>
                    <option value="Perawat Pelaksana Dialisis">Perawat Pelaksana Dialisis</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    NIP / ID Pegawai RS
                  </label>
                  <input
                    type="text"
                    value={profileData.nip}
                    onChange={e => setProfileData({ ...profileData, nip: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor NIRA PPNI
                  </label>
                  <input
                    type="text"
                    value={profileData.nira}
                    onChange={e => setProfileData({ ...profileData, nira: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor STR Perawat
                  </label>
                  <input
                    type="text"
                    value={profileData.strNumber}
                    onChange={e => setProfileData({ ...profileData, strNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Masa Berlaku STR
                  </label>
                  <input
                    type="text"
                    value={profileData.strExpiry}
                    onChange={e => setProfileData({ ...profileData, strExpiry: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kualifikasi Jenjang Karir
                  </label>
                  <input
                    type="text"
                    value={profileData.careerLevel}
                    onChange={e => setProfileData({ ...profileData, careerLevel: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    No. Sertifikat PERNEFRI
                  </label>
                  <input
                    type="text"
                    value={profileData.pernefriCertNumber}
                    onChange={e => setProfileData({ ...profileData, pernefriCertNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan Profil</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Hospital Credential Card */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Kredensialing &amp; Akreditasi
                </h4>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Unit Penempatan</div>
                  <div className="font-bold text-slate-900">{profileData.unit}</div>
                  <div className="text-[11px] text-slate-500">{profileData.hospital}</div>
                </div>

                <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800 uppercase">Sertifikasi PERNEFRI</span>
                    <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="font-bold text-emerald-950">Mahir Hemodialisis Dewasa</div>
                  <div className="text-[10px] text-emerald-700">Masa Berlaku s/d {profileData.pernefriExpiry}</div>
                </div>

                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-blue-800 uppercase">Kewenangan Klinis (RKK)</span>
                    <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div className="font-bold text-blue-950">Mandiri (Independent Practitioner)</div>
                  <div className="text-[10px] text-blue-700">Kanulasi AVF, Priming HD, Manajemen IKP &amp; Cito</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 text-xs text-slate-600 space-y-2">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600" />
                <span>Ketentuan Akun Perawat</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Data profil ini digunakan secara otomatis pada tanda tangan digital SBAR serah terima shift, verifikasi checklist 5 bagian logbook hemodialisis, dan lembar laporan bulanan resmi unit.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 2: CHANGE PASSWORD                                            */}
      {/* ========================================================================= */}
      {activeTab === 'change_password' && (
        <div className="max-w-2xl bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-blue-600" />
              <span>Ganti Kata Sandi (Change Password)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Perbarui kata sandi akun untuk menjaga keamanan data rekam medis dan integritas logbook hemodialisis.
            </p>
          </div>

          {passwordSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-900 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-900 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* Old Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kata Sandi Lama
              </label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  placeholder="Masukkan kata sandi lama Anda..."
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kata Sandi Baru
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  placeholder="Minimal 8 karakter kombinasi..."
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength meter */}
              {newPassword && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`h-1.5 flex-1 rounded-full ${
                        strengthScore >= 1 ? 'bg-rose-500' : 'bg-slate-200'
                      }`}
                    />
                    <div
                      className={`h-1.5 flex-1 rounded-full ${
                        strengthScore >= 2 ? 'bg-amber-500' : 'bg-slate-200'
                      }`}
                    />
                    <div
                      className={`h-1.5 flex-1 rounded-full ${
                        strengthScore >= 3 ? 'bg-blue-500' : 'bg-slate-200'
                      }`}
                    />
                    <div
                      className={`h-1.5 flex-1 rounded-full ${
                        strengthScore === 4 ? 'bg-emerald-500' : 'bg-slate-200'
                      }`}
                    />
                  </div>
                  <div className="text-[10.5px] text-slate-500 flex items-center justify-between">
                    <span>Kekuatan Sandi:</span>
                    <strong
                      className={
                        strengthScore <= 1
                          ? 'text-rose-600'
                          : strengthScore <= 2
                          ? 'text-amber-600'
                          : strengthScore === 3
                          ? 'text-blue-600'
                          : 'text-emerald-600'
                      }
                    >
                      {strengthScore <= 1
                        ? 'Lemah'
                        : strengthScore <= 2
                        ? 'Sedang'
                        : strengthScore === 3
                        ? 'Kuat'
                        : 'Sangat Kuat'}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Konfirmasi Kata Sandi Baru
              </label>
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  placeholder="Ketik ulang kata sandi baru..."
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Security checklist guidance */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                Standar Keamanan Kata Sandi Unit HD:
              </div>
              <ul className="space-y-1 text-[11px] text-slate-600">
                <li className="flex items-center gap-1.5">
                  <span className={hasMinLength ? 'text-emerald-600' : 'text-slate-400'}>
                    {hasMinLength ? '✓' : '•'}
                  </span>
                  <span>Minimal 8 karakter</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className={hasLetter ? 'text-emerald-600' : 'text-slate-400'}>
                    {hasLetter ? '✓' : '•'}
                  </span>
                  <span>Mengandung huruf (A–Z atau a–z)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className={hasNumber ? 'text-emerald-600' : 'text-slate-400'}>
                    {hasNumber ? '✓' : '•'}
                  </span>
                  <span>Mengandung setidaknya 1 angka (0–9)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className={hasSpecial ? 'text-emerald-600' : 'text-slate-400'}>
                    {hasSpecial ? '✓' : '•'}
                  </span>
                  <span>Disarankan menggunakan simbol khusus (!@#$%^&amp;*)</span>
                </li>
              </ul>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>Perbarui Kata Sandi</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 3: LOGOUT                                                     */}
      {/* ========================================================================= */}
      {activeTab === 'logout' && (
        <div className="max-w-2xl bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <LogOut className="w-5 h-5 text-rose-600" />
              <span>Keluar dari Akun (Logout)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Manajemen sesi masuk dan serah terima komputer Nurse Station hemodialisis.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Informasi Sesi Login Saat Ini
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                <span className="text-[11px] text-slate-400 block">Pengguna Aktif:</span>
                <strong className="text-slate-900">{profileData.name}</strong>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                <span className="text-[11px] text-slate-400 block">Email Terdaftar:</span>
                <strong className="text-slate-900">{profileData.email}</strong>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                <span className="text-[11px] text-slate-400 block">Peran &amp; Dinas:</span>
                <strong className="text-blue-900">{profileData.role}</strong>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                <span className="text-[11px] text-slate-400 block">Hari / Tanggal Aktif:</span>
                <strong className="text-slate-900">
                  {shiftInfo?.date
                    ? normalizeIndonesianDateLabel(shiftInfo.date)
                    : getCurrentIndonesianFullDate()}
                </strong>
              </div>
            </div>
          </div>

          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              {userRole === 'administrator' ? (
                <>
                  <strong className="block font-bold mb-0.5">Catatan Pengelolaan Master Data:</strong>
                  Seluruh perubahan pada <strong>Data Pasien, Data Perawat, dan Data Mesin HD</strong> telah tersimpan otomatis dan langsung berlaku untuk seluruh pengguna sistem.
                </>
              ) : (
                <>
                  <strong className="block font-bold mb-0.5">Peringatan Serah Terima Dinas (Handover):</strong>
                  Sebelum keluar dari sistem, pastikan seluruh tindakan pada <strong>Bagian I s/d VI</strong> untuk pasien kelolaan Anda telah disimpan dan diajukan verifikasi.
                </>
              )}
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIsLockScreen(true)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4 text-slate-600" />
              <span>Kunci Layar Sementara</span>
            </button>

            <button
              type="button"
              onClick={() => setShowLogoutConfirmModal(true)}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar dari Akun (Logout Sekarang)</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DIALOG KONFIRMASI LOGOUT                                            */}
      {/* ========================================================================= */}
      {showLogoutConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h4 className="text-base font-black text-slate-900">
                Konfirmasi Keluar dari Akun
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Apakah Anda yakin ingin keluar dari sesi sistem logbook hemodialisis untuk akun{' '}
                <strong className="text-slate-800">{profileData.name}</strong>?
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <div className="font-bold text-slate-800">Catatan:</div>
              <div>&bull; Sesi login perawat akan diakhiri.</div>
              <div>&bull; Anda dapat masuk kembali kapan saja dengan email dan sandi Anda.</div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirmModal(false)}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Ya, Keluar Sesi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
