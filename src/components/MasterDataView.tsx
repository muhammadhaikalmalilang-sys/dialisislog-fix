import React, { useState } from 'react';
import {
  MasterPatient,
  MasterNurse,
  MasterBed,
  MasterDoctor,
  DoctorRole,
  VascularAccess,
  PatientCategory,
  SystemAccessRole,
  HdTreatmentDay
} from '../types/dialysis.ts';
import {
  updateMasterNurseData,
  updateMasterBedData,
  updateMasterDoctorData,
  formatDoctorRoleLabel,
  resolveNurseSystemAccess,
  formatSystemAccessLabel,
  generateUsernameFromNurseName,
  HD_TREATMENT_DAYS,
  HD_DAY_CATEGORIES,
  HD_2X_DAY_PAIRS,
  sortTreatmentDays,
  formatPatientTreatmentDaysLabel,
  buildPatientDaySchedule,
  resolvePatientTreatmentDays,
  extractTreatmentShiftFromText,
  normalizeMasterPatient,
  categorizePatientsByDay,
  generateNextMedicalRecordNumber
} from '../utils/masterDataHelpers.ts';
import { deleteMasterDoctorCloud } from '../services/firebase.ts';
import { BulkMasterDataModal } from './BulkMasterDataModal.tsx';
import {
  Users,
  UserPlus,
  Search,
  CheckCircle,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  Activity,
  Cpu,
  CheckCircle2,
  X,
  KeyRound,
  Eye,
  EyeOff,
  UserCheck,
  Wrench,
  Sliders,
  FileSpreadsheet,
  Calendar,
  Stethoscope,
  Phone,
  Mail,
  Award
} from 'lucide-react';

interface MasterDataViewProps {
  section?: 'patients' | 'nurses' | 'beds' | 'doctors';
  masterPatients: MasterPatient[];
  setMasterPatients: React.Dispatch<React.SetStateAction<MasterPatient[]>>;
  masterNurses: MasterNurse[];
  setMasterNurses: React.Dispatch<React.SetStateAction<MasterNurse[]>>;
  masterBeds: MasterBed[];
  setMasterBeds: React.Dispatch<React.SetStateAction<MasterBed[]>>;
  masterDoctors?: MasterDoctor[];
  setMasterDoctors?: React.Dispatch<React.SetStateAction<MasterDoctor[]>>;
  onNurseDutyChange?: () => void;
  onNurseUpdated?: (oldNurse: MasterNurse, updatedNurse: MasterNurse) => void;
  onBedUpdated?: (oldBed: MasterBed, updatedBed: MasterBed) => void;
  onDoctorUpdated?: (oldDoc: MasterDoctor, updatedDoc: MasterDoctor) => void;
}

type NurseModalSection = 'all' | 'identity_role' | 'account';

interface ConfirmDeleteState {
  type: 'patient' | 'nurse' | 'bed' | 'doctor' | 'bulk_patients' | 'bulk_nurses';
  id: string;
  ids?: string[];
  label: string;
}

export const MasterDataView: React.FC<MasterDataViewProps> = ({
  section = 'patients',
  masterPatients,
  setMasterPatients,
  masterNurses,
  setMasterNurses,
  masterBeds,
  setMasterBeds,
  masterDoctors = [],
  setMasterDoctors,
  onNurseDutyChange,
  onNurseUpdated,
  onBedUpdated,
  onDoctorUpdated
}) => {
  const activeTab = section;
  const [bulkModalMode, setBulkModalMode] = useState<'patients' | 'nurses' | null>(null);
  const [bulkInitialDay, setBulkInitialDay] = useState<HdTreatmentDay>('Senin');
  const [selectedPatientIds, setSelectedPatientIds] = useState<string[]>([]);
  const [selectedNurseIds, setSelectedNurseIds] = useState<string[]>([]);
  const [nurseUsernameTouched, setNurseUsernameTouched] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState | null>(null);

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedbackBanner({ type, message });
    setTimeout(() => {
      setFeedbackBanner(prev => (prev?.message === message ? null : prev));
    }, 5000);
  };

  const handleSaveBulkPatients = (
    newPatients: MasterPatient[],
    updatedPatients: MasterPatient[]
  ) => {
    const normalizedNew = newPatients.map(normalizeMasterPatient);
    const normalizedUpdated = updatedPatients.map(normalizeMasterPatient);

    const updatedMap = new Map(normalizedUpdated.map(p => [p.id, p]));
    const updatedByMrn = new Map(
      normalizedUpdated.map(p => [p.medicalRecordNumber.trim().toLowerCase(), p])
    );

    setMasterPatients(prev => {
      const nextExisting = prev.map(existing => {
        const byId = updatedMap.get(existing.id);
        if (byId) return byId;
        const byMrn = updatedByMrn.get(existing.medicalRecordNumber.trim().toLowerCase());
        if (byMrn) return { ...byMrn, id: existing.id };
        return existing;
      });
      return [...normalizedNew, ...nextExisting];
    });

    setBulkModalMode(null);
    const parts: string[] = [];
    if (normalizedNew.length > 0) parts.push(`${normalizedNew.length} pasien baru ditambahkan`);
    if (normalizedUpdated.length > 0)
      parts.push(`${normalizedUpdated.length} data pasien diperbarui`);
    showFeedback(`Input massal berhasil: ${parts.join(' dan ')} ke Master Data Pasien.`);
  };

  const handleSaveBulkNurses = (
    newNurses: MasterNurse[],
    updatedNurses: MasterNurse[]
  ) => {
    const updatedMap = new Map(updatedNurses.map(n => [n.id, n]));
    const updatedByUser = new Map(
      updatedNurses
        .filter(n => n.username)
        .map(n => [n.username!.trim().toLowerCase(), n])
    );

    setMasterNurses(prev => {
      const nextExisting = prev.map(existing => {
        const byId = updatedMap.get(existing.id);
        if (byId) return byId;
        if (existing.username) {
          const byUser = updatedByUser.get(existing.username.trim().toLowerCase());
          if (byUser) return { ...byUser, id: existing.id };
        }
        return existing;
      });
      return [...nextExisting, ...newNurses];
    });

    setBulkModalMode(null);
    if (onNurseDutyChange) {
      setTimeout(onNurseDutyChange, 50);
    }
    const parts: string[] = [];
    if (newNurses.length > 0) parts.push(`${newNurses.length} akun perawat baru ditambahkan`);
    if (updatedNurses.length > 0) parts.push(`${updatedNurses.length} akun perawat diperbarui`);
    showFeedback(`Input massal berhasil: ${parts.join(' dan ')} ke Master Data Perawat.`);
  };

  // =========================================================================
  // 1. DATA PASIEN STATE & HANDLERS (DIKATEGORIKAN SESUAI HARINYA SAJA)
  // =========================================================================
  const [patientSearch, setPatientSearch] = useState('');
  const [patientDayFilter, setPatientDayFilter] = useState<'all' | HdTreatmentDay>('all');
  const [patientShiftFilter, setPatientShiftFilter] = useState<'all' | 'Pagi' | 'Siang'>('all');
  const [patientCatFilter, setPatientCatFilter] = useState<string>('all');
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [editingPatient, setEditingPatient] = useState<MasterPatient | null>(null);
  const [patientFormError, setPatientFormError] = useState<string | null>(null);
  const [scheduleCustomTouched, setScheduleCustomTouched] = useState(false);

  const [newPatient, setNewPatient] = useState<Partial<MasterPatient>>({
    medicalRecordNumber: '',
    patientName: '',
    age: 50,
    gender: 'L',
    defaultStatus: 'rajal',
    category: 'reguler',
    defaultVascularAccess: 'av_fistula',
    defaultAccessSite: 'AVF Radiocephalica Sinistra',
    defaultDialyzer: 'SAS HF 18',
    defaultDryWeight: 60.0,
    treatmentDays: ['Senin'],
    treatmentShift: 'Pagi',
    routineSchedule: 'Senin (Pagi)',
    contactPhone: ''
  });

  const categorizedByDay = categorizePatientsByDay(masterPatients);
  const morningPatientsCount = masterPatients.filter(
    p =>
      (p.treatmentShift || extractTreatmentShiftFromText(p.routineSchedule, 'Pagi')) === 'Pagi'
  ).length;
  const afternoonPatientsCount = masterPatients.filter(
    p =>
      (p.treatmentShift || extractTreatmentShiftFromText(p.routineSchedule, 'Pagi')) === 'Siang'
  ).length;

  const matchesPatientBaseFilters = (p: MasterPatient): boolean => {
    const term = patientSearch.toLowerCase().trim();
    const daysText = resolvePatientTreatmentDays(p).join(' ').toLowerCase();
    const matchesSearch =
      !term ||
      p.patientName.toLowerCase().includes(term) ||
      p.medicalRecordNumber.toLowerCase().includes(term) ||
      daysText.includes(term) ||
      (p.routineSchedule && p.routineSchedule.toLowerCase().includes(term));

    const matchesCat = patientCatFilter === 'all' || p.category === patientCatFilter;
    if (!matchesSearch || !matchesCat) return false;

    if (patientShiftFilter !== 'all') {
      const pShift = p.treatmentShift || extractTreatmentShiftFromText(p.routineSchedule, 'Pagi');
      if (pShift !== patientShiftFilter) return false;
    }

    return true;
  };

  const filteredPatients = masterPatients.filter(p => {
    if (!matchesPatientBaseFilters(p)) return false;
    if (patientDayFilter !== 'all') {
      return resolvePatientTreatmentDays(p).includes(patientDayFilter);
    }
    return true;
  });

  const handleOpenAddPatientModal = (presetDay?: HdTreatmentDay) => {
    const targetDay: HdTreatmentDay =
      presetDay || (patientDayFilter !== 'all' ? patientDayFilter : 'Senin');
    const defaultDays: HdTreatmentDay[] = [targetDay];

    setPatientFormError(null);
    setEditingPatient(null);
    setScheduleCustomTouched(false);
    setNewPatient({
      medicalRecordNumber: '',
      patientName: '',
      age: 50,
      gender: 'L',
      defaultStatus: 'rajal',
      category: 'reguler',
      defaultVascularAccess: 'av_fistula',
      defaultAccessSite: 'AVF Radiocephalica Sinistra',
      defaultDialyzer: 'SAS HF 18',
      defaultDryWeight: 60.0,
      treatmentDays: defaultDays,
      treatmentShift: 'Pagi',
      routineSchedule: buildPatientDaySchedule({
        days: defaultDays,
        shift: 'Pagi'
      }),
      contactPhone: ''
    });
    setIsAddingPatient(true);
  };

  const handleOpenBulkPatientsModal = (presetDay?: HdTreatmentDay) => {
    const targetDay: HdTreatmentDay =
      presetDay || (patientDayFilter !== 'all' ? patientDayFilter : 'Senin');
    setBulkInitialDay(targetDay);
    setBulkModalMode('patients');
  };

  const handlePatientFormScheduleChange = (updates: {
    days?: HdTreatmentDay[];
    shift?: 'Pagi' | 'Siang';
  }) => {
    setNewPatient(prev => {
      const nextShift = updates.shift ?? prev.treatmentShift ?? 'Pagi';
      const rawDays = updates.days ?? prev.treatmentDays ?? ['Senin'];
      const sortedDays = sortTreatmentDays(rawDays);
      const nextDays: HdTreatmentDay[] = sortedDays.length > 0 ? sortedDays : ['Senin'];

      const autoSchedule = buildPatientDaySchedule({
        days: nextDays,
        shift: nextShift
      });

      return {
        ...prev,
        treatmentDays: nextDays,
        treatmentShift: nextShift,
        routineSchedule: scheduleCustomTouched ? prev.routineSchedule || autoSchedule : autoSchedule
      };
    });
  };

  const handleSavePatient = (e: React.FormEvent) => {
    e.preventDefault();
    setPatientFormError(null);
    if (!newPatient.patientName?.trim() || !newPatient.medicalRecordNumber?.trim()) {
      setPatientFormError('Nama Pasien dan Nomor Rekam Medis (RM) wajib diisi.');
      return;
    }

    const cleanMrn = newPatient.medicalRecordNumber.trim();
    const duplicateMrn = masterPatients.find(other => {
      if (editingPatient && other.id === editingPatient.id) return false;
      return other.medicalRecordNumber.trim().toLowerCase() === cleanMrn.toLowerCase();
    });

    if (duplicateMrn) {
      setPatientFormError(
        `Nomor RM "${cleanMrn}" sudah terdaftar atas nama ${duplicateMrn.patientName}.`
      );
      return;
    }

    const normalizedRecord = normalizeMasterPatient({
      ...(newPatient as MasterPatient),
      id: editingPatient ? editingPatient.id : `mp-${Date.now()}`,
      medicalRecordNumber: cleanMrn,
      patientName: newPatient.patientName.trim()
    });

    if (editingPatient) {
      setMasterPatients(prev =>
        prev.map(p => (p.id === editingPatient.id ? normalizedRecord : p))
      );
      showFeedback(
        `Data pasien ${normalizedRecord.patientName} (${formatPatientTreatmentDaysLabel(
          normalizedRecord.treatmentDays,
          'full'
        )}) berhasil diperbarui.`
      );
    } else {
      setMasterPatients(prev => [normalizedRecord, ...prev]);
      showFeedback(
        `Pasien baru ${normalizedRecord.patientName} berhasil ditambahkan ke kategori ${formatPatientTreatmentDaysLabel(
          normalizedRecord.treatmentDays,
          'full'
        )}.`
      );
    }
    setIsAddingPatient(false);
    setEditingPatient(null);
  };

  const handleEditPatient = (p: MasterPatient) => {
    const normalized = normalizeMasterPatient(p);
    setPatientFormError(null);
    setEditingPatient(normalized);
    setScheduleCustomTouched(false);
    setNewPatient({ ...normalized });
    setIsAddingPatient(true);
  };

  // =========================================================================
  // 2. DATA PERAWAT STATE & HANDLERS (NAMA, PERAN/JABATAN, AKUN PERAWAT)
  // =========================================================================
  const [nurseSearch, setNurseSearch] = useState('');
  const [nurseRoleFilter, setNurseRoleFilter] = useState<string>('all');
  const [isNurseModalOpen, setIsNurseModalOpen] = useState(false);
  const [nurseModalSection, setNurseModalSection] = useState<NurseModalSection>('all');
  const [editingNurse, setEditingNurse] = useState<MasterNurse | null>(null);
  const [showNursePassword, setShowNursePassword] = useState(false);
  const [nurseFormError, setNurseFormError] = useState<string | null>(null);

  const [nurseForm, setNurseForm] = useState<Partial<MasterNurse>>({
    name: '',
    nip: '',
    role: 'perawat_pelaksana',
    email: '',
    username: '',
    password: 'Dialisis2026!',
    accountStatus: 'aktif',
    systemAccess: 'perawat_pelaksana',
    pernefriCertified: true,
    isOnDutyToday: true,
    shiftAssigned: 'Pagi',
    phone: ''
  });

  const filteredNurses = masterNurses.filter(n => {
    const term = nurseSearch.toLowerCase().trim();
    const matchesTerm =
      !term ||
      n.name.toLowerCase().includes(term) ||
      n.nip.toLowerCase().includes(term) ||
      (n.email && n.email.toLowerCase().includes(term)) ||
      (n.username && n.username.toLowerCase().includes(term));
    const matchesRole = nurseRoleFilter === 'all' || n.role === nurseRoleFilter;
    return matchesTerm && matchesRole;
  });

  const handleOpenAddNurse = () => {
    setNurseFormError(null);
    setEditingNurse(null);
    setNurseModalSection('all');
    setShowNursePassword(false);
    setNurseUsernameTouched(false);
    setNurseForm({
      name: '',
      nip: '',
      role: 'perawat_pelaksana',
      email: '',
      username: '',
      password: 'Dialisis2026!',
      accountStatus: 'aktif',
      systemAccess: 'perawat_pelaksana',
      pernefriCertified: true,
      isOnDutyToday: true,
      shiftAssigned: 'Pagi',
      phone: ''
    });
    setIsNurseModalOpen(true);
  };

  const handleOpenEditNurse = (n: MasterNurse, initialSection: NurseModalSection = 'all') => {
    setNurseFormError(null);
    setEditingNurse(n);
    setNurseModalSection(initialSection);
    setShowNursePassword(false);
    setNurseUsernameTouched(true);
    setNurseForm({
      name: n.name,
      nip: n.nip || '',
      role: n.role,
      email: n.email || '',
      username: n.username || '',
      password: n.password || 'Dialisis2026!',
      accountStatus: n.accountStatus || 'aktif',
      systemAccess: resolveNurseSystemAccess(n),
      pernefriCertified: n.pernefriCertified,
      isOnDutyToday: n.isOnDutyToday,
      shiftAssigned: n.shiftAssigned || 'Pagi',
      phone: n.phone || ''
    });
    setIsNurseModalOpen(true);
  };

  const handleSaveNurse = (e: React.FormEvent) => {
    e.preventDefault();
    setNurseFormError(null);

    const cleanName = (nurseForm.name || '').trim();
    const cleanUsername = (nurseForm.username || '').trim();
    const cleanEmail = (nurseForm.email || '').trim();
    const cleanPassword = (nurseForm.password || '').trim();

    if (!cleanName) {
      setNurseFormError('Nama lengkap perawat wajib diisi.');
      return;
    }

    if (!cleanUsername && !cleanEmail) {
      setNurseFormError('Harap isi minimal Username Login atau Email Akun untuk akun perawat.');
      return;
    }

    if (cleanPassword && cleanPassword.length < 3) {
      setNurseFormError('Kata sandi akun perawat minimal terdiri dari 3 karakter.');
      return;
    }

    // Check duplicate username or email among other nurses
    const duplicateAccount = masterNurses.find(other => {
      if (editingNurse && other.id === editingNurse.id) return false;
      const sameUsername =
        cleanUsername &&
        other.username &&
        other.username.trim().toLowerCase() === cleanUsername.toLowerCase();
      const sameEmail =
        cleanEmail &&
        other.email &&
        other.email.trim().toLowerCase() === cleanEmail.toLowerCase();
      return Boolean(sameUsername || sameEmail);
    });

    if (duplicateAccount) {
      setNurseFormError(
        `Username atau Email tersebut sudah digunakan oleh ${duplicateAccount.name}. Gunakan akun unik.`
      );
      return;
    }

    const normalizedUpdates: Partial<MasterNurse> = {
      ...nurseForm,
      name: cleanName,
      username: cleanUsername,
      email: cleanEmail,
      password: cleanPassword || 'Dialisis2026!',
      accountStatus: nurseForm.accountStatus || 'aktif',
      systemAccess: nurseForm.systemAccess || 'perawat_pelaksana'
    };

    if (editingNurse) {
      const updatedNurseObj: MasterNurse = {
        ...editingNurse,
        ...normalizedUpdates
      } as MasterNurse;

      setMasterNurses(prev => updateMasterNurseData(prev, editingNurse.id, normalizedUpdates));
      if (onNurseUpdated) {
        onNurseUpdated(editingNurse, updatedNurseObj);
      }
      showFeedback(
        `Data perawat "${updatedNurseObj.name}" (Nama, Jabatan & Akun) berhasil diperbarui.`
      );
    } else {
      const nurseToAdd: MasterNurse = {
        ...(normalizedUpdates as MasterNurse),
        id: `nurse-${Date.now()}`
      };
      setMasterNurses(prev => [...prev, nurseToAdd]);
      showFeedback(`Perawat baru "${nurseToAdd.name}" beserta akun aksesnya berhasil ditambahkan.`);
    }

    setIsNurseModalOpen(false);
    setEditingNurse(null);
    if (onNurseDutyChange) {
      setTimeout(onNurseDutyChange, 50);
    }
  };

  const handleToggleNurseDuty = (nurseId: string) => {
    setMasterNurses(prev =>
      prev.map(n => (n.id === nurseId ? { ...n, isOnDutyToday: !n.isOnDutyToday } : n))
    );
    if (onNurseDutyChange) {
      setTimeout(onNurseDutyChange, 50);
    }
  };

  // =========================================================================
  // 3. DATA MESIN & BED STATE & HANDLERS (NOMOR BED, PENUNJUKAN, STATUS)
  // =========================================================================
  const [bedSearch, setBedSearch] = useState('');
  const [bedDesignationFilter, setBedDesignationFilter] = useState<string>('all');
  const [bedStatusFilter, setBedStatusFilter] = useState<string>('all');
  const [isBedModalOpen, setIsBedModalOpen] = useState(false);
  const [editingBed, setEditingBed] = useState<MasterBed | null>(null);
  const [bedFormError, setBedFormError] = useState<string | null>(null);

  const [bedForm, setBedForm] = useState<Partial<MasterBed>>({
    bedNumber: '',
    machineBrand: 'SAS 4000',
    machineModel: 'SAS 4000',
    serialNumber: '',
    designation: 'reguler',
    status: 'ready',
    lastDisinfectionDate: new Date().toISOString().split('T')[0],
    maintenanceNote: ''
  });

  const filteredBeds = masterBeds.filter(b => {
    const term = bedSearch.toLowerCase().trim();
    const matchesSearch =
      !term ||
      b.bedNumber.toLowerCase().includes(term) ||
      b.serialNumber.toLowerCase().includes(term) ||
      b.machineModel.toLowerCase().includes(term) ||
      b.machineBrand.toLowerCase().includes(term);
    const matchesDesignation =
      bedDesignationFilter === 'all' || b.designation === bedDesignationFilter;
    const matchesStatus = bedStatusFilter === 'all' || b.status === bedStatusFilter;
    return matchesSearch && matchesDesignation && matchesStatus;
  });

  const handleOpenAddBed = () => {
    setBedFormError(null);
    setEditingBed(null);
    const nextNum = masterBeds.length + 1;
    const numPadded = String(nextNum).padStart(2, '0');
    const suggestedBed = `BED ${numPadded}`;
    setBedForm({
      bedNumber: suggestedBed,
      machineBrand: 'SAS 4000',
      machineModel: 'SAS 4000',
      serialNumber: `SAS4000-${numPadded}`,
      designation: 'reguler',
      status: 'ready',
      lastDisinfectionDate: new Date().toISOString().split('T')[0],
      maintenanceNote: ''
    });
    setIsBedModalOpen(true);
  };

  const handleOpenEditBed = (b: MasterBed) => {
    setBedFormError(null);
    setEditingBed(b);
    setBedForm({
      bedNumber: b.bedNumber,
      machineBrand: b.machineBrand,
      machineModel: b.machineModel,
      serialNumber: b.serialNumber,
      designation: b.designation,
      status: b.status,
      lastDisinfectionDate: b.lastDisinfectionDate || new Date().toISOString().split('T')[0],
      maintenanceNote: b.maintenanceNote || ''
    });
    setIsBedModalOpen(true);
  };

  const handleCycleBedStatus = (bed: MasterBed) => {
    const nextStatus: MasterBed['status'] =
      bed.status === 'ready'
        ? 'in_use'
        : bed.status === 'in_use'
        ? 'maintenance'
        : 'ready';
    const updatedBed: MasterBed = { ...bed, status: nextStatus };
    setMasterBeds(prev => updateMasterBedData(prev, bed.id, { status: nextStatus }));
    if (onBedUpdated) {
      onBedUpdated(bed, updatedBed);
    }
  };

  const handleSaveBed = (e: React.FormEvent) => {
    e.preventDefault();
    setBedFormError(null);

    const cleanBedNumber = (bedForm.bedNumber || '').trim();
    if (!cleanBedNumber) {
      setBedFormError('Nomor Bed wajib diisi (contoh: BED A01 atau BED ISOLASI 01).');
      return;
    }

    // Prevent duplicate Nomor Bed across machines
    const duplicateBed = masterBeds.find(other => {
      if (editingBed && other.id === editingBed.id) return false;
      return other.bedNumber.trim().toLowerCase() === cleanBedNumber.toLowerCase();
    });

    if (duplicateBed) {
      setBedFormError(
        `Nomor Bed "${cleanBedNumber}" sudah terdaftar pada mesin SN ${duplicateBed.serialNumber}. Gunakan Nomor Bed yang berbeda.`
      );
      return;
    }

    const normalizedBedUpdates: Partial<MasterBed> = {
      ...bedForm,
      bedNumber: cleanBedNumber,
      designation: bedForm.designation || 'reguler',
      status: bedForm.status || 'ready',
      machineBrand: (bedForm.machineBrand || 'SAS 4000').trim(),
      machineModel: (bedForm.machineModel || 'SAS 4000').trim(),
      serialNumber:
        (bedForm.serialNumber || '').trim() ||
        `SAS4000-${String(masterBeds.length + 1).padStart(2, '0')}`,
      lastDisinfectionDate:
        bedForm.lastDisinfectionDate || new Date().toISOString().split('T')[0],
      maintenanceNote: (bedForm.maintenanceNote || '').trim()
    };

    if (editingBed) {
      const updatedBedObj: MasterBed = {
        ...editingBed,
        ...normalizedBedUpdates
      } as MasterBed;

      setMasterBeds(prev => updateMasterBedData(prev, editingBed.id, normalizedBedUpdates));
      if (onBedUpdated) {
        onBedUpdated(editingBed, updatedBedObj);
      }
      showFeedback(
        `Data mesin "${updatedBedObj.bedNumber}" (Nomor Bed, Penunjukan/Isolasi & Status Operasional) berhasil diperbarui.`
      );
    } else {
      const bedToAdd: MasterBed = {
        id: `bed-${Date.now()}`,
        ...(normalizedBedUpdates as Omit<MasterBed, 'id'>)
      };
      setMasterBeds(prev => [...prev, bedToAdd]);
      showFeedback(`Unit mesin baru "${bedToAdd.bedNumber}" berhasil ditambahkan ke inventaris.`);
    }

    setIsBedModalOpen(false);
    setEditingBed(null);
  };

  // =========================================================================
  // 4. DATA DOKTER STATE & HANDLERS (DPJP & DOKTER JAGA RUANGAN HD)
  // =========================================================================
  const [doctorSearch, setDoctorSearch] = useState('');
  const [doctorRoleFilter, setDoctorRoleFilter] = useState<'all' | 'dpjp' | 'dokter_jaga'>('all');
  const [doctorStatusFilter, setDoctorStatusFilter] = useState<'all' | 'aktif' | 'nonaktif'>('all');
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<MasterDoctor | null>(null);
  const [doctorFormError, setDoctorFormError] = useState<string | null>(null);

  const [doctorForm, setDoctorForm] = useState<Partial<MasterDoctor>>({
    name: '',
    role: 'dpjp',
    spesialisasi: 'Spesialis Penyakit Dalam - Konsultan Ginjal Hipertensi (Sp.PD-KGH)',
    sip: '',
    nip: '',
    phone: '',
    email: '',
    status: 'aktif',
    notes: ''
  });

  const doctorsList = masterDoctors || [];

  const filteredDoctors = doctorsList.filter(d => {
    const term = doctorSearch.toLowerCase().trim();
    const matchesSearch =
      !term ||
      d.name.toLowerCase().includes(term) ||
      (d.spesialisasi && d.spesialisasi.toLowerCase().includes(term)) ||
      (d.sip && d.sip.toLowerCase().includes(term)) ||
      (d.nip && d.nip.toLowerCase().includes(term)) ||
      (d.notes && d.notes.toLowerCase().includes(term));
    const matchesRole =
      doctorRoleFilter === 'all' ||
      d.role === doctorRoleFilter ||
      d.role === 'both';
    const matchesStatus =
      doctorStatusFilter === 'all' || d.status === doctorStatusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleOpenAddDoctor = () => {
    setDoctorFormError(null);
    setEditingDoctor(null);
    setDoctorForm({
      name: '',
      role: 'dpjp',
      spesialisasi: 'Spesialis Penyakit Dalam - Konsultan Ginjal Hipertensi (Sp.PD-KGH)',
      sip: '',
      nip: '',
      phone: '',
      email: '',
      status: 'aktif',
      notes: ''
    });
    setIsDoctorModalOpen(true);
  };

  const handleOpenEditDoctor = (docItem: MasterDoctor) => {
    setDoctorFormError(null);
    setEditingDoctor(docItem);
    setDoctorForm({
      name: docItem.name,
      role: docItem.role,
      spesialisasi: docItem.spesialisasi || '',
      sip: docItem.sip || '',
      nip: docItem.nip || '',
      phone: docItem.phone || '',
      email: docItem.email || '',
      status: docItem.status || 'aktif',
      notes: docItem.notes || ''
    });
    setIsDoctorModalOpen(true);
  };

  const handleSaveDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    setDoctorFormError(null);

    const cleanName = (doctorForm.name || '').trim();
    if (!cleanName) {
      setDoctorFormError('Nama lengkap dan gelar dokter wajib diisi.');
      return;
    }

    const normalizedUpdates: Partial<MasterDoctor> = {
      ...doctorForm,
      name: cleanName,
      role: doctorForm.role || 'dpjp',
      spesialisasi: (doctorForm.spesialisasi || '').trim(),
      sip: (doctorForm.sip || '').trim(),
      nip: (doctorForm.nip || '').trim(),
      phone: (doctorForm.phone || '').trim(),
      email: (doctorForm.email || '').trim().toLowerCase(),
      status: doctorForm.status || 'aktif',
      notes: (doctorForm.notes || '').trim()
    };

    if (setMasterDoctors) {
      if (editingDoctor) {
        const updatedDocObj: MasterDoctor = {
          ...editingDoctor,
          ...normalizedUpdates,
          updatedAt: new Date().toISOString()
        };
        setMasterDoctors(prev =>
          updateMasterDoctorData(prev, editingDoctor.id, normalizedUpdates)
        );
        if (onDoctorUpdated) {
          onDoctorUpdated(editingDoctor, updatedDocObj);
        }
        showFeedback(`Data dokter "${updatedDocObj.name}" berhasil diperbarui.`);
      } else {
        const docToAdd: MasterDoctor = {
          id: `doc-${Date.now()}`,
          ...(normalizedUpdates as Omit<MasterDoctor, 'id'>),
          createdAt: new Date().toISOString()
        };
        setMasterDoctors(prev => [...prev, docToAdd]);
        showFeedback(`Dokter baru "${docToAdd.name}" berhasil ditambahkan.`);
      }
    }

    setIsDoctorModalOpen(false);
    setEditingDoctor(null);
  };

  const handleToggleDoctorStatus = (doctorId: string) => {
    if (!setMasterDoctors) return;
    setMasterDoctors(prev =>
      prev.map(d =>
        d.id === doctorId
          ? {
              ...d,
              status: d.status === 'aktif' ? 'nonaktif' : 'aktif',
              updatedAt: new Date().toISOString()
            }
          : d
      )
    );
    showFeedback('Status aktif dokter berhasil diperbarui.');
  };

  // =========================================================================
  // CONFIRM DELETE EXECUTION
  // =========================================================================
  const handleConfirmDeleteExecute = () => {
    if (!confirmDelete) return;
    const { type, id, ids, label } = confirmDelete;
    if (type === 'patient') {
      setMasterPatients(prev => prev.filter(p => p.id !== id));
      setSelectedPatientIds(prev => prev.filter(pid => pid !== id));
      showFeedback(`Data pasien "${label}" telah dihapus dari master data.`);
    } else if (type === 'bulk_patients' && ids && ids.length > 0) {
      const removeSet = new Set(ids);
      setMasterPatients(prev => prev.filter(p => !removeSet.has(p.id)));
      setSelectedPatientIds([]);
      showFeedback(`${ids.length} data pasien terpilih telah dihapus dari master data.`);
    } else if (type === 'nurse') {
      setMasterNurses(prev => prev.filter(n => n.id !== id));
      setSelectedNurseIds(prev => prev.filter(nid => nid !== id));
      if (onNurseDutyChange) {
        setTimeout(onNurseDutyChange, 50);
      }
      showFeedback(`Data perawat "${label}" telah dihapus dari master data.`);
    } else if (type === 'bulk_nurses' && ids && ids.length > 0) {
      const removeSet = new Set(ids);
      setMasterNurses(prev => prev.filter(n => !removeSet.has(n.id)));
      setSelectedNurseIds([]);
      if (onNurseDutyChange) {
        setTimeout(onNurseDutyChange, 50);
      }
      showFeedback(`${ids.length} data perawat terpilih telah dihapus dari master data.`);
    } else if (type === 'bed') {
      setMasterBeds(prev => prev.filter(b => b.id !== id));
      showFeedback(`Unit mesin "${label}" telah dihapus dari master data.`);
    } else if (type === 'doctor') {
      if (setMasterDoctors) {
        setMasterDoctors(prev => prev.filter(d => d.id !== id));
      }
      deleteMasterDoctorCloud(id).catch(() => {});
      showFeedback(`Data dokter "${label}" telah dihapus dari master data.`);
    }
    setConfirmDelete(null);
  };

  const readyBedsCount = masterBeds.filter(b => b.status === 'ready').length;
  const inUseBedsCount = masterBeds.filter(b => b.status === 'in_use').length;
  const maintenanceBedsCount = masterBeds.filter(b => b.status === 'maintenance').length;

  const dpjpDoctorsCount = doctorsList.filter(d => d.role === 'dpjp' || d.role === 'both').length;
  const dutyDoctorsCount = doctorsList.filter(d => d.role === 'dokter_jaga' || d.role === 'both').length;
  const activeDoctorsCount = doctorsList.filter(d => d.status === 'aktif').length;

  const getRoleLabel = (role: MasterNurse['role']) => {
    if (role === 'kepala_ruangan') return 'Kepala Ruangan';
    if (role === 'pj_shift') return 'PJ Shift';
    return 'Perawat Pelaksana';
  };

  const getDesignationLabel = (designation: MasterBed['designation']) => {
    if (designation === 'isolasi') return 'ISOLASI';
    if (designation === 'isolasi_hepb') return 'ISOLASI HEP B';
    if (designation === 'isolasi_hepc') return 'ISOLASI HEP C';
    if (designation === 'cito_icu') return 'CITO / ICU';
    return 'REGULER';
  };

  const onDutyNursesCount = masterNurses.filter(
    n => n.isOnDutyToday && (n.accountStatus || 'aktif') === 'aktif'
  ).length;
  const activeNursesCount = masterNurses.filter(
    n => (n.accountStatus || 'aktif') === 'aktif'
  ).length;

  return (
    <div className="space-y-6">
      {/* Dedicated Section Banner Driven by Header Tab */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white border border-blue-900/60 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-blue-300 mb-1.5">
              <span>Hak Akses Administrator</span>
              <span aria-hidden="true">&middot;</span>
              <span className="text-slate-300">Instalasi Dialisis RS Happy Land</span>
            </div>

            {activeTab === 'patients' && (
              <>
                <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400 shrink-0" />
                  <span>Manajemen Data Pasien &amp; Kategori Hari Jadwal HD</span>
                </h2>
                <p className="text-xs text-blue-200/80 mt-1 max-w-2xl">
                  Data pasien dikategorikan berdasarkan hari jadwal hemodialisis:{' '}
                  <strong className="text-white">
                    Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, dan Minggu
                  </strong>{' '}
                  untuk mempermudah pengelolaan daftar pasien per hari.
                </p>
              </>
            )}

            {activeTab === 'nurses' && (
              <>
                <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-400 shrink-0" />
                  <span>Manajemen Data Perawat &amp; Akun Login</span>
                </h2>
                <p className="text-xs text-blue-200/80 mt-1 max-w-2xl">
                  Kelola daftar perawat unit HD, peran/jabatan klinis (Kepala Ruangan, PJ Shift, Perawat Pelaksana), shift dinas, serta tambah akun perawat secara massal.
                </p>
              </>
            )}

            {activeTab === 'beds' && (
              <>
                <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-blue-400 shrink-0" />
                  <span>Manajemen Data Mesin &amp; Kapasitas Bed HD</span>
                </h2>
                <p className="text-xs text-blue-200/80 mt-1 max-w-2xl">
                  Kelola inventaris unit mesin hemodialisis, nomor bed, alokasi ruang reguler/isolasi/cito, riwayat desinfeksi, dan status kesiapan operasional.
                </p>
              </>
            )}

            {activeTab === 'doctors' && (
              <>
                <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-blue-400 shrink-0" />
                  <span>Manajemen Master Data Dokter (DPJP &amp; Dokter Jaga Ruangan)</span>
                </h2>
                <p className="text-xs text-blue-200/80 mt-1 max-w-2xl">
                  Kelola daftar Dokter Penanggung Jawab Pelayanan (DPJP Sp.PD-KGH / Sp.PD) dan Dokter Jaga Ruangan HD. Pilihan dokter ini terintegrasi langsung dengan inputan awal logbook perawat dan laporan shift.
                </p>
              </>
            )}
          </div>

          {/* Contextual Section Metrics */}
          {activeTab === 'patients' && (
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap tabular-nums">
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center min-w-[100px]">
                <div className="text-[11px] font-semibold text-blue-300">Total Pasien</div>
                <div className="text-xl font-black text-white mt-0.5">{masterPatients.length}</div>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center min-w-[100px]">
                <div className="text-[11px] font-semibold text-blue-300">Jadwal Pagi</div>
                <div className="text-xl font-black text-white mt-0.5">{morningPatientsCount}</div>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center min-w-[100px]">
                <div className="text-[11px] font-semibold text-blue-300">Jadwal Siang</div>
                <div className="text-xl font-black text-white mt-0.5">{afternoonPatientsCount}</div>
              </div>
            </div>
          )}

          {activeTab === 'nurses' && (
            <div className="flex items-center gap-3 shrink-0 flex-wrap tabular-nums">
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center min-w-[105px]">
                <div className="text-[11px] font-semibold text-blue-300">Total Perawat</div>
                <div className="text-xl font-black text-white mt-0.5">{masterNurses.length}</div>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center min-w-[105px]">
                <div className="text-[11px] font-semibold text-blue-300">Sedang Dinas</div>
                <div className="text-xl font-black text-white mt-0.5">{onDutyNursesCount}</div>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center min-w-[105px]">
                <div className="text-[11px] font-semibold text-blue-300">Akun Aktif</div>
                <div className="text-xl font-black text-white mt-0.5">{activeNursesCount}</div>
              </div>
            </div>
          )}

          {activeTab === 'beds' && (
            <div className="flex items-center gap-3 shrink-0 flex-wrap tabular-nums">
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center min-w-[105px]">
                <div className="text-[11px] font-semibold text-blue-300">Total Mesin</div>
                <div className="text-xl font-black text-white mt-0.5">{masterBeds.length}</div>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center min-w-[105px]">
                <div className="text-[11px] font-semibold text-blue-300">Siap Pakai</div>
                <div className="text-xl font-black text-white mt-0.5">{readyBedsCount}</div>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center min-w-[105px]">
                <div className="text-[11px] font-semibold text-blue-300">Maintenance</div>
                <div className="text-xl font-black text-white mt-0.5">{maintenanceBedsCount}</div>
              </div>
            </div>
          )}

          {activeTab === 'doctors' && (
            <div className="flex items-center gap-3 shrink-0 flex-wrap tabular-nums">
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center min-w-[105px]">
                <div className="text-[11px] font-semibold text-blue-300">Total Dokter</div>
                <div className="text-xl font-black text-white mt-0.5">{doctorsList.length}</div>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center min-w-[105px]">
                <div className="text-[11px] font-semibold text-blue-300">Dokter DPJP</div>
                <div className="text-xl font-black text-white mt-0.5">{dpjpDoctorsCount}</div>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center min-w-[105px]">
                <div className="text-[11px] font-semibold text-blue-300">Dokter Jaga</div>
                <div className="text-xl font-black text-white mt-0.5">{dutyDoctorsCount}</div>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center min-w-[105px]">
                <div className="text-[11px] font-semibold text-blue-300">Status Aktif</div>
                <div className="text-xl font-black text-emerald-400 mt-0.5">{activeDoctorsCount}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Feedback Notification Banner */}
      {feedbackBanner && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold transition-all ${
            feedbackBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer shrink-0"
            aria-label="Tutup notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. DATA PASIEN SECTION (DIKATEGORIKAN SESUAI HARINYA SAJA)                */}
      {/* ========================================================================= */}
      {activeTab === 'patients' && (
        <div className="space-y-4">
          {/* Search, Segmented Day Filter & Action Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama pasien, No. Rekam Medis (RM), atau hari jadwal..."
                  value={patientSearch}
                  onChange={e => setPatientSearch(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={patientShiftFilter}
                  onChange={e =>
                    setPatientShiftFilter(e.target.value as 'all' | 'Pagi' | 'Siang')
                  }
                  className="text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-700 cursor-pointer"
                  title="Filter berdasarkan shift jadwal HD"
                >
                  <option value="all">Semua Shift HD</option>
                  <option value="Pagi">Shift Pagi</option>
                  <option value="Siang">Shift Siang</option>
                </select>

                <select
                  value={patientCatFilter}
                  onChange={e => setPatientCatFilter(e.target.value)}
                  className="text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-700 cursor-pointer"
                >
                  <option value="all">Semua Kategori Medis</option>
                  <option value="reguler">Pasien Reguler</option>
                  <option value="hepatitis_b">Isolasi Hepatitis B</option>
                  <option value="hepatitis_c">Isolasi Hepatitis C</option>
                  <option value="hiv">Isolasi Khusus HIV</option>
                </select>

                {selectedPatientIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmDelete({
                        type: 'bulk_patients',
                        id: 'bulk',
                        ids: selectedPatientIds,
                        label: `${selectedPatientIds.length} pasien terpilih`
                      })
                    }
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 tabular-nums"
                  >
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Hapus Terpilih ({selectedPatientIds.length})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleOpenBulkPatientsModal()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <FileSpreadsheet className="w-4 h-4 shrink-0" />
                  <span>Tambah Banyak Pasien</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenAddPatientModal()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>Tambah 1 Pasien</span>
                </button>
              </div>
            </div>

            {/* Segmented Filter Tabs by Day */}
            <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 tabular-nums">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setPatientDayFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    patientDayFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Semua Hari ({masterPatients.length})
                </button>
                {HD_DAY_CATEGORIES.map(cat => (
                  <button
                    key={cat.day}
                    type="button"
                    onClick={() => setPatientDayFilter(cat.day)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      patientDayFilter === cat.day
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {cat.title} ({categorizedByDay.counts[cat.day]})
                  </button>
                ))}
              </div>

              <span className="text-xs text-slate-500 font-semibold">
                Menampilkan: <strong className="text-indigo-900">{filteredPatients.length}</strong>{' '}
                pasien
              </span>
            </div>
          </div>

          {/* Categorized Patient Lists by Day */}
          {masterPatients.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-10 text-center text-slate-500">
              <div className="max-w-2xl mx-auto space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                  <Calendar className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-900">
                    Belum Ada Data Pasien Terdaftar
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Tambahkan data pasien hemodialisis sesuai kategori harinya (
                    <strong>Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, atau Minggu</strong>). Anda
                    juga dapat mengimpor daftar pasien sekaligus dari Excel/CSV.
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleOpenBulkPatientsModal()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <FileSpreadsheet className="w-4 h-4 shrink-0" />
                    <span>Tambah Banyak Pasien Sekaligus</span>
                  </button>
                  {HD_TREATMENT_DAYS.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleOpenAddPatientModal(day)}
                      className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 shrink-0" />
                      <span>Pasien {day}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {HD_DAY_CATEGORIES.filter(
                cat => patientDayFilter === 'all' || cat.day === patientDayFilter
              ).map(cat => {
                const groupPatients = filteredPatients.filter(p =>
                  resolvePatientTreatmentDays(p).includes(cat.day)
                );
                const allGroupSelected =
                  groupPatients.length > 0 &&
                  groupPatients.every(p => selectedPatientIds.includes(p.id));

                return (
                  <div
                    key={cat.day}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden"
                  >
                    {/* Day Category Group Header */}
                    <div className="p-4 bg-slate-50/90 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-[11px] font-bold text-indigo-700">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          <span>Kategori Hari Jadwal HD</span>
                        </div>
                        <h3 className="text-sm font-black text-slate-900 mt-0.5">{cat.title}</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">{cat.description}</p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap shrink-0 tabular-nums">
                        <span className="text-xs text-slate-600 font-semibold mr-1">
                          Terdaftar: <strong className="text-slate-900">{groupPatients.length}</strong>{' '}
                          pasien
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenBulkPatientsModal(cat.day)}
                          className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                          <span>Input Massal {cat.shortLabel}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenAddPatientModal(cat.day)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" />
                          <span>Tambah Pasien {cat.shortLabel}</span>
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse tabular-nums">
                        <thead>
                          <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                            <th className="p-3 w-10 text-center">
                              <input
                                type="checkbox"
                                checked={allGroupSelected}
                                disabled={groupPatients.length === 0}
                                onChange={e => {
                                  if (e.target.checked) {
                                    const next = new Set([
                                      ...selectedPatientIds,
                                      ...groupPatients.map(p => p.id)
                                    ]);
                                    setSelectedPatientIds(Array.from(next));
                                  } else {
                                    const visibleSet = new Set(groupPatients.map(p => p.id));
                                    setSelectedPatientIds(prev =>
                                      prev.filter(id => !visibleSet.has(id))
                                    );
                                  }
                                }}
                                aria-label={`Pilih semua pasien ${cat.title}`}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-40"
                              />
                            </th>
                            <th className="p-3 w-28">No. RM</th>
                            <th className="p-3">Nama Pasien</th>
                            <th className="p-3 text-center">Usia / JK</th>
                            <th className="p-3 text-center">Kategori Medis</th>
                            <th className="p-3 text-center">Akses Vaskular</th>
                            <th className="p-3 text-center">Dry Weight (DW)</th>
                            <th className="p-3">Hari &amp; Shift Jadwal HD</th>
                            <th className="p-3 text-center w-36">Menu Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {groupPatients.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="p-6 text-center text-slate-500 text-xs">
                                <span>
                                  Belum ada pasien terjadwal pada <strong>{cat.title}</strong>
                                  {patientSearch ||
                                  patientShiftFilter !== 'all' ||
                                  patientCatFilter !== 'all'
                                    ? ' yang sesuai dengan filter pencarian.'
                                    : '.'}
                                </span>
                              </td>
                            </tr>
                          ) : (
                            groupPatients.map((p, idx) => {
                              const resolvedDays = resolvePatientTreatmentDays(p);
                              const resolvedShift =
                                p.treatmentShift ||
                                extractTreatmentShiftFromText(p.routineSchedule, 'Pagi');
                              return (
                                <tr
                                  key={`${cat.day}-${p.id}`}
                                  className={
                                    idx % 2 === 1
                                      ? 'bg-slate-50/40 hover:bg-indigo-50/30'
                                      : 'bg-white hover:bg-indigo-50/30'
                                  }
                                >
                                  <td className="p-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={selectedPatientIds.includes(p.id)}
                                      onChange={e => {
                                        if (e.target.checked) {
                                          setSelectedPatientIds(prev =>
                                            prev.includes(p.id) ? prev : [...prev, p.id]
                                          );
                                        } else {
                                          setSelectedPatientIds(prev =>
                                            prev.filter(id => id !== p.id)
                                          );
                                        }
                                      }}
                                      aria-label={`Pilih pasien ${p.patientName}`}
                                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                  </td>
                                  <td className="p-3 font-bold text-indigo-950 font-mono">
                                    {p.medicalRecordNumber}
                                  </td>
                                  <td className="p-3">
                                    <div className="font-bold text-slate-900">{p.patientName}</div>
                                    <div className="text-[11px] text-slate-500">
                                      {p.defaultStatus === 'rajal' ? 'Rawat Jalan' : 'Rawat Inap'}{' '}
                                      &middot; {p.contactPhone || '-'}
                                    </div>
                                  </td>
                                  <td className="p-3 text-center">
                                    <span className="font-semibold text-slate-700">{p.age} th</span>{' '}
                                    ({p.gender})
                                  </td>
                                  <td className="p-3 text-center">
                                    <span
                                      className={`text-[11px] font-bold ${
                                        p.category === 'reguler'
                                          ? 'text-blue-700'
                                          : p.category === 'hepatitis_b'
                                          ? 'text-amber-700'
                                          : p.category === 'hepatitis_c'
                                          ? 'text-purple-700'
                                          : 'text-rose-700'
                                      }`}
                                    >
                                      {p.category === 'reguler'
                                        ? 'Reguler'
                                        : p.category === 'hepatitis_b'
                                        ? 'Isolasi Hep B'
                                        : p.category === 'hepatitis_c'
                                        ? 'Isolasi Hep C'
                                        : 'Isolasi HIV'}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center font-medium text-slate-700">
                                    {p.defaultVascularAccess === 'av_fistula' && 'AVF (Cimino)'}
                                    {p.defaultVascularAccess === 'av_graft' && 'AV-Graft'}
                                    {p.defaultVascularAccess === 'cdl_non_tunnel' &&
                                      'CDL Non-Tunnel'}
                                    {p.defaultVascularAccess === 'cdl_permcath' && 'CDL Permcath'}
                                  </td>
                                  <td className="p-3 text-center font-bold text-slate-900">
                                    {p.defaultDryWeight} kg
                                  </td>
                                  <td className="p-3">
                                    <div className="font-bold text-indigo-800 text-[11px]">
                                      {formatPatientTreatmentDaysLabel(resolvedDays, 'full')}
                                    </div>
                                    <div className="text-[11px] text-slate-600 mt-0.5">
                                      Shift {resolvedShift} &middot; {p.routineSchedule || '-'}
                                    </div>
                                  </td>
                                  <td className="p-3 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleEditPatient(p)}
                                        className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-lg border border-indigo-200 transition-colors cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold whitespace-nowrap shrink-0"
                                        title="Edit Data & Hari Jadwal Pasien"
                                      >
                                        <Edit2 className="w-3.5 h-3.5 shrink-0" />
                                        <span>Edit</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setConfirmDelete({
                                            type: 'patient',
                                            id: p.id,
                                            label: p.patientName
                                          })
                                        }
                                        className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg border border-slate-200 transition-colors cursor-pointer shrink-0"
                                        title="Hapus Pasien"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. DATA PERAWAT SECTION                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'nurses' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama perawat, NIP, username, atau email akun..."
                value={nurseSearch}
                onChange={e => setNurseSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={nurseRoleFilter}
                onChange={e => setNurseRoleFilter(e.target.value)}
                className="text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-700 cursor-pointer"
              >
                <option value="all">Semua Peran / Jabatan</option>
                <option value="kepala_ruangan">Kepala Ruangan</option>
                <option value="pj_shift">PJ Shift</option>
                <option value="perawat_pelaksana">Perawat Pelaksana</option>
              </select>

              {selectedNurseIds.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setConfirmDelete({
                      type: 'bulk_nurses',
                      id: 'bulk',
                      ids: selectedNurseIds,
                      label: `${selectedNurseIds.length} perawat terpilih`
                    })
                  }
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 tabular-nums"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Hapus Terpilih ({selectedNurseIds.length})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setBulkModalMode('nurses')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <FileSpreadsheet className="w-4 h-4 shrink-0" />
                <span>Tambah Banyak Perawat</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAddNurse}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>Tambah 1 Perawat</span>
              </button>
            </div>
          </div>

          {/* Table Nurses */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-800">
                  Daftar Master Tenaga Keperawatan &amp; Akun Perawat Hemodialisis
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Gunakan <strong>Tambah Banyak Perawat</strong> untuk membuat banyak akun login perawat sekaligus (otomatis generate username &amp; hak akses).
                </p>
              </div>
              <span className="text-xs text-slate-500 font-semibold tabular-nums shrink-0">
                Total: <strong className="text-indigo-900">{filteredNurses.length}</strong> Perawat
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse tabular-nums">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredNurses.length > 0 &&
                          filteredNurses.every(n => selectedNurseIds.includes(n.id))
                        }
                        onChange={e => {
                          if (e.target.checked) {
                            const next = new Set([
                              ...selectedNurseIds,
                              ...filteredNurses.map(n => n.id)
                            ]);
                            setSelectedNurseIds(Array.from(next));
                          } else {
                            const visibleSet = new Set(filteredNurses.map(n => n.id));
                            setSelectedNurseIds(prev => prev.filter(id => !visibleSet.has(id)));
                          }
                        }}
                        aria-label="Pilih semua perawat"
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </th>
                    <th className="p-3">Nama Perawat &amp; NIP</th>
                    <th className="p-3">Peran / Jabatan</th>
                    <th className="p-3">Akun Perawat (Login)</th>
                    <th className="p-3 text-center">Status Dinas &amp; Shift</th>
                    <th className="p-3 text-center w-56">Menu Edit Data Perawat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredNurses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-slate-500">
                        {masterNurses.length === 0 ? (
                          <div className="max-w-md mx-auto space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                              <UserPlus className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-sm font-black text-slate-900">
                                Belum Ada Data Perawat Terdaftar
                              </h4>
                              <p className="text-xs text-slate-500 leading-relaxed">
                                Data perawat bawaan sistem telah dikosongkan. Tambahkan tim perawat (Kepala Ruangan, PJ Shift, dan Perawat Pelaksana) dalam jumlah banyak sekaligus beserta akun loginnya.
                              </p>
                            </div>
                            <div className="pt-1 flex items-center justify-center gap-2.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => setBulkModalMode('nurses')}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                              >
                                <FileSpreadsheet className="w-4 h-4 shrink-0" />
                                <span>Tambah Banyak Perawat Sekaligus</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleOpenAddNurse}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                              >
                                <Plus className="w-4 h-4 shrink-0" />
                                <span>Tambah 1 Perawat</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span>Tidak ada data perawat yang sesuai dengan filter pencarian.</span>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredNurses.map((n, idx) => {
                      const isAccountActive = (n.accountStatus || 'aktif') === 'aktif';
                      return (
                        <tr
                          key={n.id}
                          className={
                            idx % 2 === 1
                              ? 'bg-slate-50/40 hover:bg-indigo-50/30'
                              : 'bg-white hover:bg-indigo-50/30'
                          }
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedNurseIds.includes(n.id)}
                              onChange={e => {
                                if (e.target.checked) {
                                  setSelectedNurseIds(prev => [...prev, n.id]);
                                } else {
                                  setSelectedNurseIds(prev => prev.filter(id => id !== n.id));
                                }
                              }}
                              aria-label={`Pilih perawat ${n.name}`}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>

                          {/* Col 1: Nama Perawat */}
                          <td className="p-3">
                            <div className="font-bold text-slate-900 text-xs">{n.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              NIP: {n.nip || '-'}
                              {n.phone ? ` · ${n.phone}` : ''}
                            </div>
                          </td>

                          {/* Col 2: Peran / Jabatan */}
                          <td className="p-3">
                            <div
                              className={`font-bold text-xs ${
                                n.role === 'kepala_ruangan'
                                  ? 'text-purple-700'
                                  : n.role === 'pj_shift'
                                  ? 'text-indigo-700'
                                  : 'text-slate-800'
                              }`}
                            >
                              {getRoleLabel(n.role)}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                              {n.pernefriCertified ? (
                                <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                  Tersertifikasi PERNEFRI
                                </span>
                              ) : (
                                <span className="text-slate-400">Dalam Pelatihan</span>
                              )}
                            </div>
                          </td>

                          {/* Col 3: Akun Perawat */}
                          <td className="p-3">
                            <div className="font-mono text-[11px] font-semibold text-indigo-700">
                              {n.username ? `@${n.username}` : n.email || 'Belum diatur'}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-1.5">
                              <span>{n.email || '-'}</span>
                              <span aria-hidden="true">&middot;</span>
                              <span
                                className={
                                  isAccountActive
                                    ? 'text-emerald-700 font-semibold'
                                    : 'text-rose-600 font-semibold'
                                }
                              >
                                {isAccountActive ? 'Akun Aktif' : 'Nonaktif'}
                              </span>
                              <span aria-hidden="true">&middot;</span>
                              <span className="text-indigo-700 font-bold">
                                Hak Akses: {formatSystemAccessLabel(resolveNurseSystemAccess(n))}
                              </span>
                            </div>
                          </td>

                          {/* Col 4: Status Dinas & Shift */}
                          <td className="p-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleToggleNurseDuty(n.id)}
                                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                                  n.isOnDutyToday
                                    ? 'bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                                }`}
                              >
                                {n.isOnDutyToday ? 'Sedang Dinas' : 'Libur / Off'}
                              </button>
                              <span className="text-[11px] text-slate-500 font-medium">
                                Shift {n.shiftAssigned || 'Pagi'}
                              </span>
                            </div>
                          </td>

                          {/* Col 5: Menu Edit Data Perawat */}
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditNurse(n, 'all')}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 text-[11px] font-bold shadow-2xs whitespace-nowrap shrink-0"
                                title="Edit Nama, Peran/Jabatan, dan Akun Perawat"
                              >
                                <Edit2 className="w-3.5 h-3.5 shrink-0" />
                                <span>Edit Perawat</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEditNurse(n, 'account')}
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 transition-colors cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold whitespace-nowrap shrink-0"
                                title="Kelola Akun Login & Kata Sandi Perawat"
                              >
                                <KeyRound className="w-3.5 h-3.5 shrink-0" />
                                <span>Akun</span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmDelete({
                                    type: 'nurse',
                                    id: n.id,
                                    label: n.name
                                  })
                                }
                                className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg border border-slate-200 transition-colors cursor-pointer shrink-0"
                                title="Hapus Data Perawat"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DATA MESIN & BED SECTION                                               */}
      {/* ========================================================================= */}
      {activeTab === 'beds' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nomor bed, merk, model mesin, atau Serial Number..."
                value={bedSearch}
                onChange={e => setBedSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={bedDesignationFilter}
                onChange={e => setBedDesignationFilter(e.target.value)}
                className="text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-700 cursor-pointer"
              >
                <option value="all">Semua Penunjukan / Isolasi</option>
                <option value="reguler">REGULER</option>
                <option value="isolasi">ISOLASI</option>
                <option value="isolasi_hepb">Isolasi Hepatitis B</option>
                <option value="isolasi_hepc">Isolasi Hepatitis C</option>
                <option value="cito_icu">Cito / ICU / Emergency</option>
              </select>

              <select
                value={bedStatusFilter}
                onChange={e => setBedStatusFilter(e.target.value)}
                className="text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-700 cursor-pointer"
              >
                <option value="all">Semua Status Operasional</option>
                <option value="ready">Siap Pakai (Ready)</option>
                <option value="in_use">Sedang Beroperasi (In Use)</option>
                <option value="maintenance">Perbaikan (Maintenance)</option>
              </select>

              <button
                type="button"
                onClick={handleOpenAddBed}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>Tambah Mesin &amp; Bed Baru</span>
              </button>
            </div>
          </div>

          {/* Quick Operational Summary Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 tabular-nums">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Kapasitas Total Bed</span>
                <div className="text-xl font-black text-slate-900 mt-0.5">{masterBeds.length} Unit</div>
              </div>
              <Cpu className="w-7 h-7 text-indigo-500 shrink-0" />
            </div>

            <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-emerald-800">Siap Pakai (Ready)</span>
                <div className="text-xl font-black text-emerald-950 mt-0.5">{readyBedsCount} Unit</div>
              </div>
              <CheckCircle className="w-7 h-7 text-emerald-600 shrink-0" />
            </div>

            <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-blue-800">Sedang Beroperasi (In Use)</span>
                <div className="text-xl font-black text-blue-950 mt-0.5">{inUseBedsCount} Unit</div>
              </div>
              <Activity className="w-7 h-7 text-blue-600 shrink-0" />
            </div>

            <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-amber-800">Perbaikan (Maintenance)</span>
                <div className="text-xl font-black text-amber-950 mt-0.5">{maintenanceBedsCount} Unit</div>
              </div>
              <Wrench className="w-7 h-7 text-amber-600 shrink-0" />
            </div>
          </div>

          {/* Table Beds / Machines */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-800">
                  Daftar Inventaris Mesin Hemodialisis &amp; Alokasi Bed
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Gunakan menu <strong>Edit Mesin</strong> pada masing-masing baris untuk mengubah <strong>Nomor Bed</strong>, <strong>Penunjukan / Isolasi</strong>, dan <strong>Status Operasional</strong>.
                </p>
              </div>
              <span className="text-xs text-slate-500 font-semibold tabular-nums shrink-0">
                Menampilkan: <strong className="text-indigo-900">{filteredBeds.length}</strong> unit
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse tabular-nums">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                    <th className="p-3 w-40">Nomor Bed</th>
                    <th className="p-3">Merk, Model &amp; SN Mesin</th>
                    <th className="p-3 text-center">Penunjukan / Isolasi</th>
                    <th className="p-3 text-center">Status Operasional</th>
                    <th className="p-3 text-center">Desinfeksi / Catatan</th>
                    <th className="p-3 text-center w-44">Menu Edit Data Mesin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredBeds.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        Tidak ada unit mesin yang sesuai dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredBeds.map((b, idx) => (
                      <tr
                        key={b.id}
                        className={
                          idx % 2 === 1
                            ? 'bg-slate-50/40 hover:bg-indigo-50/30'
                            : 'bg-white hover:bg-indigo-50/30'
                        }
                      >
                        {/* Col 1: Nomor Bed */}
                        <td className="p-3">
                          <div className="font-black text-xs text-indigo-950">
                            {b.bedNumber}
                          </div>
                        </td>

                        {/* Col 2: Merk & Model */}
                        <td className="p-3">
                          <div className="font-bold text-slate-900">
                            {b.machineBrand &&
                            b.machineBrand.trim().toLowerCase() ===
                              b.machineModel.trim().toLowerCase()
                              ? `Merk ${b.machineBrand}`
                              : b.machineModel}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {b.machineBrand &&
                            b.machineBrand.trim().toLowerCase() !==
                              b.machineModel.trim().toLowerCase() ? (
                              <>{b.machineBrand} &middot; </>
                            ) : null}
                            <span className="font-mono">SN: {b.serialNumber}</span>
                          </div>
                        </td>

                        {/* Col 3: Penunjukan / Isolasi */}
                        <td className="p-3 text-center">
                          <span
                            className={`text-xs font-bold ${
                              b.designation === 'reguler'
                                ? 'text-slate-700'
                                : b.designation === 'isolasi' || b.designation === 'isolasi_hepb'
                                ? 'text-amber-700'
                                : b.designation === 'isolasi_hepc'
                                ? 'text-purple-700'
                                : 'text-rose-700'
                            }`}
                          >
                            {getDesignationLabel(b.designation)}
                          </span>
                        </td>

                        {/* Col 4: Status Operasional */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleCycleBedStatus(b)}
                            title="Klik untuk mengganti status cepat, atau gunakan tombol Edit Mesin"
                            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                              b.status === 'ready'
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                                : b.status === 'in_use'
                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                                : 'bg-amber-500 hover:bg-amber-600 text-white shadow-2xs'
                            }`}
                          >
                            {b.status === 'ready' && (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                <span>Siap Pakai (Ready)</span>
                              </>
                            )}
                            {b.status === 'in_use' && (
                              <>
                                <Activity className="w-3.5 h-3.5 shrink-0" />
                                <span>Sedang Beroperasi</span>
                              </>
                            )}
                            {b.status === 'maintenance' && (
                              <>
                                <Wrench className="w-3.5 h-3.5 shrink-0" />
                                <span>Maintenance</span>
                              </>
                            )}
                          </button>
                        </td>

                        {/* Col 5: Desinfeksi / Catatan */}
                        <td className="p-3 text-center text-slate-600 text-[11px]">
                          <div className="font-medium">{b.lastDisinfectionDate || 'Hari ini'}</div>
                          {b.maintenanceNote && (
                            <div className="text-[10.5px] text-amber-700 font-medium mt-0.5">
                              {b.maintenanceNote}
                            </div>
                          )}
                        </td>

                        {/* Col 6: Menu Edit Data Mesin */}
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditBed(b)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 text-[11px] font-bold shadow-2xs whitespace-nowrap shrink-0"
                              title="Edit Nomor Bed, Penunjukan / Isolasi, dan Status Operasional Mesin"
                            >
                              <Sliders className="w-3.5 h-3.5 shrink-0" />
                              <span>Edit Mesin</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setConfirmDelete({
                                  type: 'bed',
                                  id: b.id,
                                  label: b.bedNumber
                                })
                              }
                              className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg border border-slate-200 transition-colors cursor-pointer shrink-0"
                              title="Hapus Unit Mesin / Bed"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. DATA DOKTER SECTION (DPJP & DOKTER JAGA RUANGAN HD)                    */}
      {/* ========================================================================= */}
      {activeTab === 'doctors' && (
        <div className="space-y-4">
          {/* Search, Role Filter & Action Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama dokter, SIP, NIP, spesialisasi, atau gelar..."
                  value={doctorSearch}
                  onChange={e => setDoctorSearch(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Role Filter */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setDoctorRoleFilter('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      doctorRoleFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Semua Peran ({doctorsList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDoctorRoleFilter('dpjp')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      doctorRoleFilter === 'dpjp'
                        ? 'bg-white text-blue-700 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    DPJP ({dpjpDoctorsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDoctorRoleFilter('dokter_jaga')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      doctorRoleFilter === 'dokter_jaga'
                        ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Dokter Jaga ({dutyDoctorsCount})
                  </button>
                </div>

                {/* Status Filter */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setDoctorStatusFilter('all')}
                    className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      doctorStatusFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Semua Status
                  </button>
                  <button
                    type="button"
                    onClick={() => setDoctorStatusFilter('aktif')}
                    className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      doctorStatusFilter === 'aktif'
                        ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Aktif ({activeDoctorsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDoctorStatusFilter('nonaktif')}
                    className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      doctorStatusFilter === 'nonaktif'
                        ? 'bg-white text-rose-700 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Nonaktif ({doctorsList.length - activeDoctorsCount})
                  </button>
                </div>

                {/* Add Doctor Button */}
                <button
                  type="button"
                  onClick={handleOpenAddDoctor}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>Tambah Dokter Baru</span>
                </button>
              </div>
            </div>
          </div>

          {/* Doctor Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-blue-600" />
                  <span>Daftar Master Dokter Hemodialisis (DPJP &amp; Dokter Jaga)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Dokter yang berstatus <strong>Aktif</strong> akan otomatis muncul pada dropdown pilihan Dokter DPJP dan Dokter Jaga di pengisian awal logbook perawat pelaksana dan laporan shift.
                </p>
              </div>
              <span className="text-xs text-slate-500 font-semibold tabular-nums shrink-0">
                Total: <strong className="text-indigo-900">{filteredDoctors.length}</strong> Dokter
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse tabular-nums">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                    <th className="p-3 w-12 text-center">No.</th>
                    <th className="p-3 min-w-[220px]">Nama Dokter &amp; Gelar Lengkap</th>
                    <th className="p-3 text-center min-w-[150px]">Kategori Peran</th>
                    <th className="p-3 min-w-[170px]">No. SIP &amp; NIP</th>
                    <th className="p-3 min-w-[170px]">Kontak &amp; Email</th>
                    <th className="p-3 text-center w-28">Status</th>
                    <th className="p-3 text-center w-36">Menu Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredDoctors.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-500">
                        {doctorsList.length === 0 ? (
                          <div className="max-w-md mx-auto space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                              <Stethoscope className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-sm font-black text-slate-900">
                                Belum Ada Data Dokter Terdaftar
                              </h4>
                              <p className="text-xs text-slate-500 leading-relaxed">
                                Tambahkan dokter penanggung jawab pelayanan (DPJP Sp.PD-KGH / Sp.PD) dan dokter jaga ruangan hemodialisis untuk mempermudah pemilihan nama dokter di logbook.
                              </p>
                            </div>
                            <div className="pt-1 flex items-center justify-center gap-2.5">
                              <button
                                type="button"
                                onClick={handleOpenAddDoctor}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                              >
                                <Plus className="w-4 h-4 shrink-0" />
                                <span>Tambah Dokter Baru</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span>Tidak ada data dokter yang sesuai dengan filter pencarian.</span>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredDoctors.map((docItem, idx) => {
                      const isAktif = (docItem.status || 'aktif') === 'aktif';
                      return (
                        <tr
                          key={docItem.id}
                          className={
                            idx % 2 === 1
                              ? 'bg-slate-50/40 hover:bg-indigo-50/30'
                              : 'bg-white hover:bg-indigo-50/30'
                          }
                        >
                          {/* Col 1: No */}
                          <td className="p-3 text-center font-bold text-slate-400">
                            {idx + 1}
                          </td>

                          {/* Col 2: Nama Dokter & Gelar */}
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                                  docItem.role === 'dpjp'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                    : docItem.role === 'both'
                                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}
                              >
                                dr
                              </div>
                              <div className="min-w-0">
                                <div className="font-black text-xs text-slate-900 truncate">
                                  {docItem.name}
                                </div>
                                <div className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                                  <Award className="w-3 h-3 text-indigo-500 shrink-0" />
                                  <span>{docItem.spesialisasi || 'Dokter Ruangan HD'}</span>
                                </div>
                                {docItem.notes && (
                                  <div className="text-[10px] text-slate-400 italic truncate mt-0.5">
                                    Catatan: {docItem.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Col 3: Kategori Peran */}
                          <td className="p-3 text-center">
                            {docItem.role === 'dpjp' && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                Dokter DPJP
                              </span>
                            )}
                            {docItem.role === 'dokter_jaga' && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Dokter Jaga Ruangan
                              </span>
                            )}
                            {docItem.role === 'both' && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                DPJP &amp; Dokter Jaga
                              </span>
                            )}
                          </td>

                          {/* Col 4: No. SIP & NIP */}
                          <td className="p-3">
                            <div className="font-mono text-[11px] text-slate-800 font-semibold">
                              {docItem.sip || '-'}
                            </div>
                            <div className="text-[10.5px] text-slate-500 font-mono mt-0.5">
                              NIP: {docItem.nip || '-'}
                            </div>
                          </td>

                          {/* Col 5: Kontak & Email */}
                          <td className="p-3 text-[11px]">
                            {docItem.phone ? (
                              <div className="flex items-center gap-1 text-slate-700 font-medium">
                                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{docItem.phone}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                            {docItem.email && (
                              <div className="flex items-center gap-1 text-slate-500 text-[10.5px] mt-0.5">
                                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{docItem.email}</span>
                              </div>
                            )}
                          </td>

                          {/* Col 6: Status Aktif / Nonaktif */}
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleDoctorStatus(docItem.id)}
                              title="Klik untuk mengubah status aktif/nonaktif"
                              className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 shrink-0 ${
                                isAktif
                                  ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
                              }`}
                            >
                              {isAktif ? (
                                <>
                                  <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>Aktif</span>
                                </>
                              ) : (
                                <span>Nonaktif</span>
                              )}
                            </button>
                          </td>

                          {/* Col 7: Aksi */}
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditDoctor(docItem)}
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold shrink-0"
                                title="Edit Data Dokter"
                              >
                                <Edit2 className="w-3 h-3 shrink-0" />
                                <span>Edit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmDelete({
                                    type: 'doctor',
                                    id: docItem.id,
                                    label: docItem.name
                                  })
                                }
                                className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg border border-slate-200 transition-colors cursor-pointer shrink-0"
                                title="Hapus Data Dokter"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL TAMBAH / EDIT DOKTER (HAK AKSES ADMINISTRATOR)                      */}
      {/* ========================================================================= */}
      {isDoctorModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">
                    {editingDoctor ? 'Edit Master Data Dokter' : 'Tambah Dokter Baru'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kelola nama lengkap dokter, peran klinis (DPJP/Jaga), nomor SIP, dan kontak.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsDoctorModalOpen(false);
                  setEditingDoctor(null);
                }}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                aria-label="Tutup form dokter"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {doctorFormError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{doctorFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveDoctor} className="space-y-4 text-xs">
              {/* Nama Lengkap & Gelar */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Lengkap &amp; Gelar Dokter <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="contoh: dr. Raden Heru Prasanto, Sp.PD-KGH"
                  value={doctorForm.name || ''}
                  onChange={e => setDoctorForm({ ...doctorForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-semibold"
                />
                <span className="text-[10.5px] text-slate-500 mt-0.5 block">
                  Cantumkan gelar lengkap dokter spesialis atau dokter umum agar tertera rapi pada resep &amp; logbook.
                </span>
              </div>

              {/* Peran / Kategori Dokter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kategori Peran Dokter <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={doctorForm.role || 'dpjp'}
                    onChange={e =>
                      setDoctorForm({ ...doctorForm, role: e.target.value as DoctorRole })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="dpjp">Dokter DPJP (Sp.PD-KGH / Sp.PD)</option>
                    <option value="dokter_jaga">Dokter Jaga Ruangan HD</option>
                    <option value="both">Keduanya (DPJP &amp; Dokter Jaga)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Keaktifan</label>
                  <select
                    value={doctorForm.status || 'aktif'}
                    onChange={e =>
                      setDoctorForm({
                        ...doctorForm,
                        status: e.target.value as 'aktif' | 'nonaktif'
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="aktif">Aktif (Tampil di Dropdown Logbook)</option>
                    <option value="nonaktif">Nonaktif (Tidak Muncul di Pilihan)</option>
                  </select>
                </div>
              </div>

              {/* Spesialisasi */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Spesialisasi / Bidang</label>
                <input
                  type="text"
                  placeholder="contoh: Spesialis Penyakit Dalam - Konsultan Ginjal Hipertensi (Sp.PD-KGH)"
                  value={doctorForm.spesialisasi || ''}
                  onChange={e => setDoctorForm({ ...doctorForm, spesialisasi: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Nomor SIP & NIP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">No. SIP (Surat Izin Praktik)</label>
                  <input
                    type="text"
                    placeholder="contoh: SIP.446/001/DPJP/2024"
                    value={doctorForm.sip || ''}
                    onChange={e => setDoctorForm({ ...doctorForm, sip: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">NIP / ID Pegawai Dokter</label>
                  <input
                    type="text"
                    placeholder="contoh: 197508122002121001"
                    value={doctorForm.nip || ''}
                    onChange={e => setDoctorForm({ ...doctorForm, nip: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* No. Kontak & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">No. Telepon / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="0812-3456-7890"
                    value={doctorForm.phone || ''}
                    onChange={e => setDoctorForm({ ...doctorForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Resmi Dokter</label>
                  <input
                    type="email"
                    placeholder="dokter@happyland.co.id"
                    value={doctorForm.email || ''}
                    onChange={e => setDoctorForm({ ...doctorForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Catatan / Keterangan */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Tambahan / Jadwal</label>
                <input
                  type="text"
                  placeholder="contoh: DPJP Utama Unit HD / On-call shift pagi"
                  value={doctorForm.notes || ''}
                  onChange={e => setDoctorForm({ ...doctorForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDoctorModalOpen(false);
                    setEditingDoctor(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition-all shadow-xs"
                >
                  {editingDoctor ? 'Simpan Perubahan Dokter' : 'Simpan Dokter Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL TAMBAH / EDIT PASIEN (DIKATEGORIKAN SESUAI HARI JADWAL HD)          */}
      {/* ========================================================================= */}
      {isAddingPatient && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <h4 className="text-base font-black text-slate-900">
                  {editingPatient ? 'Edit Data & Hari Jadwal Pasien' : 'Tambah Pasien Master Baru'}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tentukan identitas klinis pasien beserta kategori hari jadwal hemodialisis.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddingPatient(false);
                  setEditingPatient(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {patientFormError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{patientFormError}</span>
              </div>
            )}

            <form onSubmit={handleSavePatient} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">No. Rekam Medis (RM)</label>
                    {!editingPatient && (
                      <button
                        type="button"
                        onClick={() =>
                          setNewPatient(prev => ({
                            ...prev,
                            medicalRecordNumber: generateNextMedicalRecordNumber(masterPatients)
                          }))
                        }
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        Isi Otomatis
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={newPatient.medicalRecordNumber || ''}
                    onChange={e =>
                      setNewPatient({ ...newPatient, medicalRecordNumber: e.target.value })
                    }
                    placeholder="contoh: 452101"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Lengkap Pasien</label>
                  <input
                    type="text"
                    value={newPatient.patientName || ''}
                    onChange={e => setNewPatient({ ...newPatient, patientName: e.target.value })}
                    placeholder="contoh: Ny. Farida Rahmawati"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 tabular-nums">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Usia (Tahun)</label>
                  <input
                    type="number"
                    value={newPatient.age ?? 50}
                    onChange={e => setNewPatient({ ...newPatient, age: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jenis Kelamin</label>
                  <select
                    value={newPatient.gender || 'L'}
                    onChange={e =>
                      setNewPatient({ ...newPatient, gender: e.target.value as 'L' | 'P' })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="L">Laki-Laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kategori Medis</label>
                  <select
                    value={newPatient.category || 'reguler'}
                    onChange={e =>
                      setNewPatient({ ...newPatient, category: e.target.value as PatientCategory })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="reguler">Reguler</option>
                    <option value="hepatitis_b">Isolasi Hep B</option>
                    <option value="hepatitis_c">Isolasi Hep C</option>
                    <option value="hiv">Isolasi HIV</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 tabular-nums">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Akses Vaskular</label>
                  <select
                    value={newPatient.defaultVascularAccess || 'av_fistula'}
                    onChange={e =>
                      setNewPatient({
                        ...newPatient,
                        defaultVascularAccess: e.target.value as VascularAccess
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="av_fistula">AV-Fistula (Cimino)</option>
                    <option value="av_graft">AV-Graft</option>
                    <option value="cdl_non_tunnel">CDL Non-Tunnel</option>
                    <option value="cdl_permcath">Permcath</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dry Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newPatient.defaultDryWeight ?? 60}
                    onChange={e =>
                      setNewPatient({ ...newPatient, defaultDryWeight: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kontak Telepon</label>
                  <input
                    type="text"
                    value={newPatient.contactPhone || ''}
                    onChange={e => setNewPatient({ ...newPatient, contactPhone: e.target.value })}
                    placeholder="0812-xxxx-xxxx"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* KATEGORI HARI & SHIFT JADWAL HD */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Kategori Hari &amp; Shift Jadwal HD</span>
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                    Pilih Hari Utama Hemodialisis
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                    {HD_TREATMENT_DAYS.map(day => {
                      const currentDays = newPatient.treatmentDays || ['Senin'];
                      const primaryDay = currentDays[0] || 'Senin';
                      const secondaryDay = currentDays[1];
                      const isPrimary = primaryDay === day;
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            setScheduleCustomTouched(false);
                            const nextDays =
                              secondaryDay && secondaryDay !== day ? [day, secondaryDay] : [day];
                            handlePatientFormScheduleChange({ days: nextDays });
                          }}
                          className={`py-2 px-2 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
                            isPrimary
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                              : 'bg-white border-slate-300 text-slate-700 hover:border-indigo-300'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-600">
                      Pilihan Cepat Pasangan Hari (Opsional)
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          const d1 = (newPatient.treatmentDays || ['Senin'])[0] || 'Senin';
                          setScheduleCustomTouched(false);
                          handlePatientFormScheduleChange({ days: [d1] });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          (newPatient.treatmentDays || ['Senin']).length === 1
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-800'
                            : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        1 Hari Saja
                      </button>
                      {HD_2X_DAY_PAIRS.map(pair => {
                        const currentDays = sortTreatmentDays(
                          newPatient.treatmentDays || ['Senin']
                        );
                        const isPairSelected =
                          currentDays.length === 2 &&
                          currentDays[0] === pair.days[0] &&
                          currentDays[1] === pair.days[1];
                        return (
                          <button
                            key={pair.label}
                            type="button"
                            onClick={() => {
                              setScheduleCustomTouched(false);
                              handlePatientFormScheduleChange({ days: pair.days });
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                              isPairSelected
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-800'
                                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {pair.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Hari Kedua (Opsional)
                      </label>
                      <select
                        value={(newPatient.treatmentDays || ['Senin'])[1] || ''}
                        onChange={e => {
                          const d1 = (newPatient.treatmentDays || ['Senin'])[0] || 'Senin';
                          const d2 = e.target.value as HdTreatmentDay | '';
                          setScheduleCustomTouched(false);
                          handlePatientFormScheduleChange({
                            days: d2 && d2 !== d1 ? [d1, d2] : [d1]
                          });
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold"
                      >
                        <option value="">Tidak Ada (1 Hari Saja)</option>
                        {HD_TREATMENT_DAYS.filter(
                          d => d !== ((newPatient.treatmentDays || ['Senin'])[0] || 'Senin')
                        ).map(day => (
                          <option key={day} value={day}>
                            Hari {day}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Shift Jadwal HD
                      </label>
                      <select
                        value={newPatient.treatmentShift || 'Pagi'}
                        onChange={e => {
                          setScheduleCustomTouched(false);
                          handlePatientFormScheduleChange({
                            shift: e.target.value as 'Pagi' | 'Siang'
                          });
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold"
                      >
                        <option value="Pagi">Shift Pagi</option>
                        <option value="Siang">Shift Siang</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Ringkasan Jadwal Harian (Tersimpan pada Data Pasien)
                  </label>
                  <input
                    type="text"
                    value={newPatient.routineSchedule || ''}
                    onChange={e => {
                      setScheduleCustomTouched(true);
                      setNewPatient({ ...newPatient, routineSchedule: e.target.value });
                    }}
                    placeholder="contoh: Senin (Pagi)"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-indigo-950"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingPatient(false);
                    setEditingPatient(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  {editingPatient ? 'Simpan Perubahan' : 'Simpan Data Pasien'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL MENU EDIT / TAMBAH DATA PERAWAT (NAMA, PERAN/JABATAN, AKUN)         */}
      {/* ========================================================================= */}
      {isNurseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <h4 className="text-base font-black text-slate-900">
                  {editingNurse
                    ? `Menu Edit Data Perawat: ${editingNurse.name}`
                    : 'Tambah Data & Akun Perawat Baru'}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kelola perubahan nama lengkap, peran/jabatan dinas, dan kredensial akun perawat.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsNurseModalOpen(false);
                  setEditingNurse(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section Selector Tabs for fast focused editing */}
            {editingNurse && (
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setNurseModalSection('all')}
                  className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    nurseModalSection === 'all'
                      ? 'bg-white text-indigo-950 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua Data Perawat
                </button>
                <button
                  type="button"
                  onClick={() => setNurseModalSection('identity_role')}
                  className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    nurseModalSection === 'identity_role'
                      ? 'bg-white text-indigo-950 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Nama &amp; Peran/Jabatan
                </button>
                <button
                  type="button"
                  onClick={() => setNurseModalSection('account')}
                  className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    nurseModalSection === 'account'
                      ? 'bg-white text-indigo-950 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Akun &amp; Kata Sandi
                </button>
              </div>
            )}

            {nurseFormError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{nurseFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveNurse} className="space-y-4 text-xs">
              {/* SECTION 1 & 2: NAMA & PERAN/JABATAN */}
              {(nurseModalSection === 'all' || nurseModalSection === 'identity_role') && (
                <div className="space-y-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 border-b border-slate-100 pb-1.5">
                    <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>1. Nama &amp; Peran / Jabatan Perawat</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Nama Lengkap &amp; Gelar Perawat <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={nurseForm.name || ''}
                      onChange={e => {
                        const val = e.target.value;
                        if (!editingNurse && !nurseUsernameTouched) {
                          const used = new Set<string>(['admin']);
                          masterNurses.forEach(mn => {
                            if (mn.username) used.add(mn.username.trim().toLowerCase());
                          });
                          const autoUser = val.trim()
                            ? generateUsernameFromNurseName(val, used)
                            : '';
                          setNurseForm({
                            ...nurseForm,
                            name: val,
                            username: autoUser,
                            email: autoUser ? `${autoUser}@happyland.co.id` : ''
                          });
                        } else {
                          setNurseForm({ ...nurseForm, name: val });
                        }
                      }}
                      placeholder="contoh: Ners Rina, S.Kep."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900"
                      required
                    />
                  </div>

                  {/* Peran / Jabatan Selection */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      Peran / Jabatan Dinas <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {(
                        [
                          {
                            value: 'perawat_pelaksana',
                            title: 'Perawat Pelaksana',
                            desc: 'Asuhan Bedside HD'
                          },
                          {
                            value: 'pj_shift',
                            title: 'PJ Shift',
                            desc: 'Penanggung Jawab'
                          },
                          {
                            value: 'kepala_ruangan',
                            title: 'Kepala Ruangan',
                            desc: 'Supervisi Unit HD'
                          }
                        ] as const
                      ).map(opt => {
                        const active = nurseForm.role === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              setNurseForm({
                                ...nurseForm,
                                role: opt.value,
                                systemAccess:
                                  nurseForm.systemAccess === 'administrator'
                                    ? 'administrator'
                                    : opt.value
                              })
                            }
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              active
                                ? 'bg-indigo-50 border-indigo-600 ring-1 ring-indigo-600'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div
                              className={`font-bold text-xs ${
                                active ? 'text-indigo-950' : 'text-slate-800'
                              }`}
                            >
                              {opt.title}
                            </div>
                            <div className="text-[10.5px] text-slate-500 mt-0.5">{opt.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">NIP Pegawai</label>
                      <input
                        type="text"
                        value={nurseForm.nip || ''}
                        onChange={e => setNurseForm({ ...nurseForm, nip: e.target.value })}
                        placeholder="1995xxxx..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        No. Kontak / WhatsApp
                      </label>
                      <input
                        type="text"
                        value={nurseForm.phone || ''}
                        onChange={e => setNurseForm({ ...nurseForm, phone: e.target.value })}
                        placeholder="0812-xxxx-xxxx"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Shift Ditugaskan</label>
                      <select
                        value={nurseForm.shiftAssigned || 'Pagi'}
                        onChange={e =>
                          setNurseForm({
                            ...nurseForm,
                            shiftAssigned: e.target.value as MasterNurse['shiftAssigned']
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="Pagi">Shift Pagi</option>
                        <option value="Siang">Shift Siang</option>
                        <option value="Malam">Shift Malam</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Sertifikasi PERNEFRI
                      </label>
                      <select
                        value={nurseForm.pernefriCertified ? 'yes' : 'no'}
                        onChange={e =>
                          setNurseForm({
                            ...nurseForm,
                            pernefriCertified: e.target.value === 'yes'
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="yes">Bersertifikat</option>
                        <option value="no">Dalam Pelatihan</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Status Dinas Hari Ini
                      </label>
                      <select
                        value={nurseForm.isOnDutyToday ? 'on' : 'off'}
                        onChange={e =>
                          setNurseForm({
                            ...nurseForm,
                            isOnDutyToday: e.target.value === 'on'
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="on">Sedang Dinas</option>
                        <option value="off">Libur / Off</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 3: AKUN PERAWAT */}
              {(nurseModalSection === 'all' || nurseModalSection === 'account') && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                      <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>2. Pengaturan Akun Perawat (Kredensial Login)</span>
                    </div>
                    <span className="text-[11px] text-slate-500">Digunakan saat Login Sistem</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Username Login <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={nurseForm.username || ''}
                        onChange={e => {
                          setNurseUsernameTouched(true);
                          setNurseForm({ ...nurseForm, username: e.target.value });
                        }}
                        placeholder="contoh: rina.hd"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Email Akun Perawat <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={nurseForm.email || ''}
                        onChange={e => setNurseForm({ ...nurseForm, email: e.target.value })}
                        placeholder="contoh: rina@happyland.co.id"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-bold text-slate-700">
                          Kata Sandi (Password) Akun
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setNurseForm({ ...nurseForm, password: 'Dialisis2026!' })
                          }
                          className="text-[10.5px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                        >
                          Reset Default
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showNursePassword ? 'text' : 'password'}
                          value={nurseForm.password || ''}
                          onChange={e => setNurseForm({ ...nurseForm, password: e.target.value })}
                          placeholder="Minimal 3 karakter..."
                          className="w-full pl-3 pr-9 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNursePassword(!showNursePassword)}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 cursor-pointer"
                          title={showNursePassword ? 'Sembunyikan sandi' : 'Lihat sandi'}
                        >
                          {showNursePassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Status Akun</label>
                        <select
                          value={nurseForm.accountStatus || 'aktif'}
                          onChange={e =>
                            setNurseForm({
                              ...nurseForm,
                              accountStatus: e.target.value as 'aktif' | 'nonaktif'
                            })
                          }
                          className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold"
                        >
                          <option value="aktif">Aktif</option>
                          <option value="nonaktif">Nonaktif</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Hak Akses</label>
                        <select
                          value={nurseForm.systemAccess || 'perawat_pelaksana'}
                          onChange={e =>
                            setNurseForm({
                              ...nurseForm,
                              systemAccess: e.target.value as SystemAccessRole
                            })
                          }
                          className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold"
                        >
                          <option value="perawat_pelaksana">Perawat Pelaksana</option>
                          <option value="pj_shift">PJ Shift</option>
                          <option value="kepala_ruangan">Kepala Ruang</option>
                          <option value="administrator">Administrator</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsNurseModalOpen(false);
                    setEditingNurse(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition-all shadow-xs"
                >
                  {editingNurse ? 'Simpan Perubahan Perawat' : 'Simpan Perawat Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL MENU EDIT / TAMBAH DATA MESIN (NOMOR BED, PENUNJUKAN, STATUS)       */}
      {/* ========================================================================= */}
      {isBedModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <h4 className="text-base font-black text-slate-900">
                  {editingBed
                    ? `Menu Edit Data Mesin: ${editingBed.bedNumber}`
                    : 'Tambah Unit Mesin HD & Bed Baru'}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ubah Nomor Bed, Penunjukan / Isolasi, dan Status Operasional unit mesin hemodialisis.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsBedModalOpen(false);
                  setEditingBed(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bedFormError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{bedFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveBed} className="space-y-4 text-xs">
              {/* PRIMARY SETTINGS: NOMOR BED, PENUNJUKAN / ISOLASI, STATUS OPERASIONAL */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950 border-b border-slate-200 pb-2">
                  <Sliders className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Pengaturan Utama Bed, Isolasi &amp; Status Operasional</span>
                </div>

                {/* 1. NOMOR BED */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    1. Nomor Bed <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bedForm.bedNumber || ''}
                    onChange={e => setBedForm({ ...bedForm, bedNumber: e.target.value })}
                    placeholder="contoh: BED A01 atau BED ISOLASI 01"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-black text-slate-900 text-sm"
                    required
                  />
                </div>

                {/* 2. PENUNJUKAN / ISOLASI */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">
                    2. Penunjukan / Isolasi Mesin <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(
                      [
                        {
                          value: 'reguler',
                          title: 'REGULER',
                          desc: 'Pasien HD umum non-isolasi'
                        },
                        {
                          value: 'isolasi',
                          title: 'ISOLASI',
                          desc: 'Mesin ruang isolasi HD (BED ISOLASI 01–04)'
                        },
                        {
                          value: 'isolasi_hepb',
                          title: 'Isolasi Hepatitis B',
                          desc: 'Mesin khusus dedicated HBsAg (+)'
                        },
                        {
                          value: 'isolasi_hepc',
                          title: 'Isolasi Hepatitis C',
                          desc: 'Mesin khusus alokasi Anti-HCV (+)'
                        },
                        {
                          value: 'cito_icu',
                          title: 'Cito / ICU / Emergency',
                          desc: 'Siaga tindakan akut & rawat inap'
                        }
                      ] as const
                    ).map(opt => {
                      const active = bedForm.designation === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setBedForm({ ...bedForm, designation: opt.value })}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            active
                              ? 'bg-indigo-50 border-indigo-600 ring-1 ring-indigo-600'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div
                            className={`font-bold text-xs ${
                              active ? 'text-indigo-950' : 'text-slate-800'
                            }`}
                          >
                            {opt.title}
                          </div>
                          <div className="text-[10.5px] text-slate-500 mt-0.5">{opt.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. STATUS OPERASIONAL */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">
                    3. Status Operasional Mesin <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(
                      [
                        {
                          value: 'ready',
                          title: 'Siap Pakai (Ready)',
                          desc: 'Lulus uji fungsi',
                          activeClass: 'bg-emerald-50 border-emerald-600 ring-1 ring-emerald-600 text-emerald-950'
                        },
                        {
                          value: 'in_use',
                          title: 'Sedang Beroperasi',
                          desc: 'Digunakan sesi HD',
                          activeClass: 'bg-blue-50 border-blue-600 ring-1 ring-blue-600 text-blue-950'
                        },
                        {
                          value: 'maintenance',
                          title: 'Maintenance',
                          desc: 'Perbaikan / Kalibrasi',
                          activeClass: 'bg-amber-50 border-amber-600 ring-1 ring-amber-600 text-amber-950'
                        }
                      ] as const
                    ).map(opt => {
                      const active = bedForm.status === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setBedForm({ ...bedForm, status: opt.value })}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            active
                              ? opt.activeClass
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                          }`}
                        >
                          <div className="font-bold text-xs">{opt.title}</div>
                          <div className="text-[10.5px] opacity-75 mt-0.5">{opt.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Maintenance / Operational Note */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Catatan Status Operasional / Maintenance (Opsional)
                  </label>
                  <input
                    type="text"
                    value={bedForm.maintenanceNote || ''}
                    onChange={e => setBedForm({ ...bedForm, maintenanceNote: e.target.value })}
                    placeholder="contoh: Kalibrasi rutin teknisi elektromedis / Siap pakai..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* SECONDARY TECHNICAL SPECIFICATIONS */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-700">
                  Spesifikasi Teknis Unit Mesin
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Merk Mesin HD</label>
                    <select
                      value={bedForm.machineBrand || 'SAS 4000'}
                      onChange={e => setBedForm({ ...bedForm, machineBrand: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="SAS 4000">SAS 4000</option>
                      <option value="Fresenius Medical Care">Fresenius Medical Care</option>
                      <option value="B. Braun">B. Braun</option>
                      <option value="Nipro">Nipro</option>
                      <option value="Toray">Toray</option>
                      <option value="Baxter">Baxter</option>
                      {bedForm.machineBrand &&
                        ![
                          'SAS 4000',
                          'Fresenius Medical Care',
                          'B. Braun',
                          'Nipro',
                          'Toray',
                          'Baxter'
                        ].includes(bedForm.machineBrand) && (
                          <option value={bedForm.machineBrand}>{bedForm.machineBrand}</option>
                        )}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Model Mesin</label>
                    <input
                      type="text"
                      value={bedForm.machineModel || ''}
                      onChange={e => setBedForm({ ...bedForm, machineModel: e.target.value })}
                      placeholder="contoh: SAS 4000"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Serial Number (SN)
                    </label>
                    <input
                      type="text"
                      value={bedForm.serialNumber || ''}
                      onChange={e => setBedForm({ ...bedForm, serialNumber: e.target.value })}
                      placeholder="SAS4000-A01"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Tanggal Desinfeksi Terakhir
                    </label>
                    <input
                      type="date"
                      value={bedForm.lastDisinfectionDate || ''}
                      onChange={e =>
                        setBedForm({ ...bedForm, lastDisinfectionDate: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsBedModalOpen(false);
                    setEditingBed(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition-all shadow-xs"
                >
                  {editingBed ? 'Simpan Perubahan Mesin' : 'Simpan Mesin & Bed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL KONFIRMASI HAPUS (PENGGANTI WINDOW.CONFIRM)                         */}
      {/* ========================================================================= */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">Konfirmasi Hapus Master Data</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Apakah Anda yakin ingin menghapus <strong>{confirmDelete.label}</strong> dari master data?
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteExecute}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold cursor-pointer"
              >
                Ya, Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL TAMBAH BANYAK DATA PASIEN / PERAWAT (BULK IMPORT & MULTI-ROW GRID)  */}
      {/* ========================================================================= */}
      {bulkModalMode && (
        <BulkMasterDataModal
          mode={bulkModalMode}
          isOpen={bulkModalMode !== null}
          onClose={() => setBulkModalMode(null)}
          existingPatients={masterPatients}
          existingNurses={masterNurses}
          initialPatientDay={bulkInitialDay}
          onSaveBulkPatients={handleSaveBulkPatients}
          onSaveBulkNurses={handleSaveBulkNurses}
        />
      )}
    </div>
  );
};
