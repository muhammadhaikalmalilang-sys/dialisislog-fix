import React, { useState } from 'react';
import {
  MasterPatient,
  MasterNurse,
  MasterBed,
  MasterDoctor,
  DoctorRole,
  VascularAccess,
  PatientCategory,
  HdTreatmentDay
} from '../types/dialysis.ts';
import {
  X,
  Users,
  UserPlus,
  Bed,
  Search,
  CheckCircle,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  Database,
  FileSpreadsheet,
  Stethoscope,
  Phone,
  Mail,
  Award
} from 'lucide-react';
import { BulkMasterDataModal } from './BulkMasterDataModal.tsx';
import {
  HD_TREATMENT_DAYS,
  buildPatientDaySchedule,
  formatPatientTreatmentDaysLabel,
  generateUsernameFromNurseName,
  normalizeMasterPatient,
  resolvePatientTreatmentDays,
  updateMasterDoctorData
} from '../utils/masterDataHelpers.ts';

interface MasterDataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterPatients: MasterPatient[];
  setMasterPatients: React.Dispatch<React.SetStateAction<MasterPatient[]>>;
  masterNurses: MasterNurse[];
  setMasterNurses: React.Dispatch<React.SetStateAction<MasterNurse[]>>;
  masterBeds: MasterBed[];
  setMasterBeds: React.Dispatch<React.SetStateAction<MasterBed[]>>;
  masterDoctors?: MasterDoctor[];
  setMasterDoctors?: React.Dispatch<React.SetStateAction<MasterDoctor[]>>;
  onNurseDutyChange?: () => void;
}

export const MasterDataManagementModal: React.FC<MasterDataManagementModalProps> = ({
  isOpen,
  onClose,
  masterPatients,
  setMasterPatients,
  masterNurses,
  setMasterNurses,
  masterBeds,
  setMasterBeds,
  masterDoctors = [],
  setMasterDoctors,
  onNurseDutyChange
}) => {
  const [activeTab, setActiveTab] = useState<'patients' | 'nurses' | 'beds' | 'doctors'>('patients');
  
  // Patient tab filters
  const [patientSearch, setPatientSearch] = useState('');
  const [patientDayFilter, setPatientDayFilter] = useState<'all' | HdTreatmentDay>('all');
  const [patientCatFilter, setPatientCatFilter] = useState<string>('all');
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [editingPatient, setEditingPatient] = useState<MasterPatient | null>(null);

  // Nurse tab filters
  const [isAddingNurse, setIsAddingNurse] = useState(false);
  const [editingNurse, setEditingNurse] = useState<MasterNurse | null>(null);

  // Bed tab filters
  const [isAddingBed, setIsAddingBed] = useState(false);
  const [editingBed, setEditingBed] = useState<MasterBed | null>(null);

  // Doctor tab filters
  const [isAddingDoctor, setIsAddingDoctor] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<MasterDoctor | null>(null);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [doctorRoleFilter, setDoctorRoleFilter] = useState<'all' | 'dpjp' | 'dokter_jaga'>('all');

  // Bulk import & inline feedback / delete confirmation states
  const [bulkModalMode, setBulkModalMode] = useState<'patients' | 'nurses' | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    type: 'patient' | 'bed' | 'doctor';
    id: string;
    label: string;
  } | null>(null);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ type, text });
    setTimeout(() => {
      setFeedbackMsg((prev) => (prev?.text === text ? null : prev));
    }, 3500);
  };

  const [newDoctor, setNewDoctor] = useState<Partial<MasterDoctor>>({
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

  // New Patient Form state
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
    routineSchedule: 'Senin (Pagi)'
  });

  // New Nurse Form state
  const [newNurse, setNewNurse] = useState<Partial<MasterNurse>>({
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
    shiftAssigned: 'Pagi'
  });

  // New Bed Form state
  const [newBed, setNewBed] = useState<Partial<MasterBed>>({
    bedNumber: '',
    machineBrand: 'SAS 4000',
    machineModel: 'SAS 4000',
    serialNumber: '',
    designation: 'reguler',
    status: 'ready'
  });

  if (!isOpen) return null;

  // Filtered patients
  const filteredPatients = masterPatients.filter(p => {
    const matchesSearch =
      p.patientName.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.medicalRecordNumber.includes(patientSearch) ||
      (p.routineSchedule && p.routineSchedule.toLowerCase().includes(patientSearch.toLowerCase()));
    const matchesCat = patientCatFilter === 'all' || p.category === patientCatFilter;
    const matchesDay =
      patientDayFilter === 'all' || resolvePatientTreatmentDays(p).includes(patientDayFilter);
    return matchesSearch && matchesCat && matchesDay;
  });

  const handleSavePatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatient.patientName || !newPatient.medicalRecordNumber) {
      showFeedback('Nama pasien dan Nomor Rekam Medis wajib diisi.', 'error');
      return;
    }
    const normalized = normalizeMasterPatient({
      ...(newPatient as MasterPatient),
      id: editingPatient ? editingPatient.id : `mp-${Date.now()}`
    });
    if (editingPatient) {
      setMasterPatients(prev =>
        prev.map(p => (p.id === editingPatient.id ? normalized : p))
      );
      showFeedback(`Data pasien ${normalized.patientName} berhasil diperbarui.`);
    } else {
      setMasterPatients(prev => [normalized, ...prev]);
      showFeedback(`Pasien ${normalized.patientName} berhasil ditambahkan.`);
    }
    setIsAddingPatient(false);
    setEditingPatient(null);
  };

  const handleEditPatient = (p: MasterPatient) => {
    const normalized = normalizeMasterPatient(p);
    setEditingPatient(normalized);
    setNewPatient({ ...normalized });
    setIsAddingPatient(true);
  };

  const handleDeletePatient = (p: MasterPatient) => {
    setPendingDelete({
      type: 'patient',
      id: p.id,
      label: `${p.patientName} (RM ${p.medicalRecordNumber})`
    });
  };

  const handleSaveBulkPatients = (
    addedPatients: MasterPatient[],
    updatedPatients: MasterPatient[]
  ) => {
    const normAdded = addedPatients.map(normalizeMasterPatient);
    const normUpdated = updatedPatients.map(normalizeMasterPatient);
    setMasterPatients((prev) => {
      const updatedMap = new Map(normUpdated.map((p) => [p.id, p]));
      const merged = prev.map((existing) => updatedMap.get(existing.id) || existing);
      return [...normAdded, ...merged];
    });
    const parts: string[] = [];
    if (normAdded.length > 0) parts.push(`${normAdded.length} pasien baru ditambahkan`);
    if (normUpdated.length > 0) parts.push(`${normUpdated.length} pasien diperbarui`);
    showFeedback(`Import massal berhasil: ${parts.join(', ')}.`);
  };

  const handleSaveBulkNurses = (addedNurses: MasterNurse[], updatedNurses: MasterNurse[]) => {
    setMasterNurses((prev) => {
      const updatedMap = new Map(updatedNurses.map((n) => [n.id, n]));
      const merged = prev.map((existing) => updatedMap.get(existing.id) || existing);
      return [...merged, ...addedNurses];
    });
    if (onNurseDutyChange) {
      setTimeout(onNurseDutyChange, 50);
    }
    const parts: string[] = [];
    if (addedNurses.length > 0) parts.push(`${addedNurses.length} perawat baru ditambahkan`);
    if (updatedNurses.length > 0) parts.push(`${updatedNurses.length} perawat diperbarui`);
    showFeedback(`Import massal berhasil: ${parts.join(', ')}.`);
  };

  const handleToggleNurseDuty = (nurseId: string) => {
    setMasterNurses(prev =>
      prev.map(n => (n.id === nurseId ? { ...n, isOnDutyToday: !n.isOnDutyToday } : n))
    );
    if (onNurseDutyChange) {
      setTimeout(onNurseDutyChange, 50);
    }
  };

  const handleEditNurse = (nurse: MasterNurse) => {
    setEditingNurse(nurse);
    setNewNurse({
      name: nurse.name,
      nip: nurse.nip,
      role: nurse.role,
      email: nurse.email || '',
      username: nurse.username || '',
      password: nurse.password || 'Dialisis2026!',
      accountStatus: nurse.accountStatus || 'aktif',
      systemAccess: nurse.systemAccess || 'perawat_pelaksana',
      pernefriCertified: nurse.pernefriCertified,
      isOnDutyToday: nurse.isOnDutyToday,
      shiftAssigned: nurse.shiftAssigned
    });
    setIsAddingNurse(true);
  };

  const handleSaveNurse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNurse.name?.trim()) {
      showFeedback('Nama perawat wajib diisi.', 'error');
      return;
    }
    const roleVal = newNurse.role || 'perawat_pelaksana';
    const generatedUname =
      newNurse.username?.trim() ||
      generateUsernameFromNurseName(
        newNurse.name,
        new Set(
          masterNurses
            .filter((n) => n.id !== editingNurse?.id)
            .map((n) => (n.username || '').toLowerCase())
            .filter(Boolean)
        )
      );
    const finalizedNurse: Partial<MasterNurse> = {
      ...newNurse,
      role: roleVal,
      systemAccess: roleVal,
      username: generatedUname,
      email: newNurse.email?.trim() || `${generatedUname}@happyland.co.id`,
      password: newNurse.password?.trim() || 'Dialisis2026!',
      accountStatus: newNurse.accountStatus || 'aktif'
    };

    if (editingNurse) {
      setMasterNurses(prev =>
        prev.map(n =>
          n.id === editingNurse.id ? ({ ...n, ...finalizedNurse } as MasterNurse) : n
        )
      );
      showFeedback(`Data perawat ${finalizedNurse.name} berhasil diperbarui.`);
    } else {
      const nurseToAdd: MasterNurse = {
        ...(finalizedNurse as MasterNurse),
        id: `nurse-${Date.now()}`
      };
      setMasterNurses(prev => [...prev, nurseToAdd]);
      showFeedback(`Perawat ${nurseToAdd.name} (@${nurseToAdd.username}) berhasil didaftarkan.`);
    }
    setIsAddingNurse(false);
    setEditingNurse(null);
    setNewNurse({
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
      shiftAssigned: 'Pagi'
    });
    if (onNurseDutyChange) {
      setTimeout(onNurseDutyChange, 50);
    }
  };

  const handleEditBed = (bed: MasterBed) => {
    setEditingBed(bed);
    setNewBed({
      bedNumber: bed.bedNumber,
      machineBrand: bed.machineBrand,
      machineModel: bed.machineModel,
      serialNumber: bed.serialNumber,
      designation: bed.designation,
      status: bed.status
    });
    setIsAddingBed(true);
  };

  const handleToggleBedMaintenance = (bedId: string) => {
    setMasterBeds(prev =>
      prev.map(b =>
        b.id === bedId
          ? {
              ...b,
              status: b.status === 'ready' ? 'maintenance' : 'ready'
            }
          : b
      )
    );
  };

  const handleSaveBed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBed.bedNumber) {
      showFeedback('Nomor Bed wajib diisi.', 'error');
      return;
    }
    if (editingBed) {
      setMasterBeds(prev =>
        prev.map(b =>
          b.id === editingBed.id ? ({ ...b, ...newBed } as MasterBed) : b
        )
      );
      showFeedback(`Data ${newBed.bedNumber} berhasil diperbarui.`);
    } else {
      const bedToAdd: MasterBed = {
        id: `bed-${Date.now()}`,
        bedNumber: newBed.bedNumber,
        machineBrand: newBed.machineBrand || 'SAS 4000',
        machineModel: newBed.machineModel || 'SAS 4000',
        serialNumber: newBed.serialNumber || `SAS4000-${Date.now().toString().slice(-4)}`,
        designation: newBed.designation || 'reguler',
        status: newBed.status || 'ready',
        lastDisinfectionDate: new Date().toISOString().split('T')[0]
      };
      setMasterBeds(prev => [...prev, bedToAdd]);
      showFeedback(`${bedToAdd.bedNumber} berhasil ditambahkan.`);
    }
    setIsAddingBed(false);
    setEditingBed(null);
    setNewBed({
      bedNumber: '',
      machineBrand: 'SAS 4000',
      machineModel: 'SAS 4000',
      serialNumber: '',
      designation: 'reguler',
      status: 'ready'
    });
  };

  const handleDeleteBed = (bed: MasterBed) => {
    setPendingDelete({
      type: 'bed',
      id: bed.id,
      label: bed.bedNumber
    });
  };

  const handleEditDoctor = (docItem: MasterDoctor) => {
    setEditingDoctor(docItem);
    setNewDoctor({
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
    setIsAddingDoctor(true);
  };

  const handleToggleDoctorStatus = (doctorId: string) => {
    if (!setMasterDoctors) return;
    setMasterDoctors(prev =>
      prev.map(d =>
        d.id === doctorId
          ? { ...d, status: d.status === 'aktif' ? 'nonaktif' : 'aktif', updatedAt: new Date().toISOString() }
          : d
      )
    );
    showFeedback('Status dokter berhasil diubah.');
  };

  const handleDeleteDoctor = (docItem: MasterDoctor) => {
    setPendingDelete({
      type: 'doctor',
      id: docItem.id,
      label: docItem.name
    });
  };

  const handleSaveDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoctor.name || !newDoctor.name.trim()) {
      showFeedback('Nama dokter wajib diisi.', 'error');
      return;
    }

    const cleanName = newDoctor.name.trim();
    const docData: Partial<MasterDoctor> = {
      ...newDoctor,
      name: cleanName,
      role: newDoctor.role || 'dpjp',
      spesialisasi: (newDoctor.spesialisasi || '').trim(),
      sip: (newDoctor.sip || '').trim(),
      nip: (newDoctor.nip || '').trim(),
      phone: (newDoctor.phone || '').trim(),
      email: (newDoctor.email || '').trim().toLowerCase(),
      status: newDoctor.status || 'aktif',
      notes: (newDoctor.notes || '').trim()
    };

    if (setMasterDoctors) {
      if (editingDoctor) {
        setMasterDoctors(prev =>
          updateMasterDoctorData(prev, editingDoctor.id, docData)
        );
        showFeedback(`Data dokter "${cleanName}" diperbarui.`);
      } else {
        const docToAdd: MasterDoctor = {
          id: `doc-${Date.now()}`,
          ...(docData as Omit<MasterDoctor, 'id'>),
          createdAt: new Date().toISOString()
        };
        setMasterDoctors(prev => [...prev, docToAdd]);
        showFeedback(`Dokter "${cleanName}" berhasil ditambahkan.`);
      }
    }

    setIsAddingDoctor(false);
    setEditingDoctor(null);
    setNewDoctor({
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
  };

  const confirmPendingDelete = () => {
    if (!pendingDelete) return;
    if (pendingDelete.type === 'patient') {
      setMasterPatients(prev => prev.filter(p => p.id !== pendingDelete.id));
      showFeedback(`Data pasien ${pendingDelete.label} dihapus.`);
    } else if (pendingDelete.type === 'bed') {
      setMasterBeds(prev => prev.filter(b => b.id !== pendingDelete.id));
      showFeedback(`Data ${pendingDelete.label} dihapus.`);
    } else if (pendingDelete.type === 'doctor') {
      if (setMasterDoctors) {
        setMasterDoctors(prev => prev.filter(d => d.id !== pendingDelete.id));
      }
      showFeedback(`Data dokter ${pendingDelete.label} dihapus.`);
    }
    setPendingDelete(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-slate-200 overflow-hidden my-6">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30 mb-2">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              Pusat Manajemen Master Data HD
            </div>
            <h2 className="text-xl font-black text-white">
              Data Master: Pasien, Roster Perawat &amp; Mesin/Bed HD
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Mempermudah penginputan bedside: memilih pasien otomatis mengisi No. RM, Dry Weight, dan jenis akses; memilih bed mengunci isolasi khusus; serta menghitung rasio dinas perawat otomatis.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup modal master data"
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('patients')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'patients'
                ? 'border-blue-600 text-blue-700 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            1. Master Pasien HD ({masterPatients.length})
          </button>

          <button
            onClick={() => setActiveTab('nurses')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'nurses'
                ? 'border-blue-600 text-blue-700 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            2. Master Tim Perawat &amp; Roster ({masterNurses.filter(n => n.isOnDutyToday).length} Dinas)
          </button>

          <button
            onClick={() => setActiveTab('beds')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'beds'
                ? 'border-blue-600 text-blue-700 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bed className="w-4 h-4" />
            3. Master Bed &amp; Mesin HD ({masterBeds.length} Unit)
          </button>

          <button
            onClick={() => setActiveTab('doctors')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'doctors'
                ? 'border-blue-600 text-blue-700 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            4. Master Dokter HD ({masterDoctors.length} Dokter)
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-4">
          {feedbackMsg && (
            <div
              className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                feedbackMsg.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              {feedbackMsg.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* TAB 1: MASTER PASIEN */}
          {activeTab === 'patients' && (
            <div className="space-y-4">
              {/* Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-1 items-center gap-2">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Cari pasien atau No. RM..."
                      value={patientSearch}
                      onChange={e => setPatientSearch(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <select
                    value={patientDayFilter}
                    onChange={e =>
                      setPatientDayFilter(e.target.value as 'all' | HdTreatmentDay)
                    }
                    className="text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-700 font-semibold"
                  >
                    <option value="all">Semua Hari Jadwal HD</option>
                    {HD_TREATMENT_DAYS.map(day => (
                      <option key={day} value={day}>
                        Hari {day}
                      </option>
                    ))}
                  </select>

                  <select
                    value={patientCatFilter}
                    onChange={e => setPatientCatFilter(e.target.value)}
                    className="text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-700 font-medium"
                  >
                    <option value="all">Semua Kategori Medis</option>
                    <option value="reguler">Reguler</option>
                    <option value="hepatitis_b">Isolasi Hep B</option>
                    <option value="hepatitis_c">Isolasi Hep C</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <button
                    type="button"
                    onClick={() => setBulkModalMode('patients')}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <FileSpreadsheet className="w-4 h-4 shrink-0" />
                    <span>Tambah Banyak Pasien</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const targetDay: HdTreatmentDay =
                        patientDayFilter !== 'all' ? patientDayFilter : 'Senin';
                      setEditingPatient(null);
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
                        treatmentDays: [targetDay],
                        treatmentShift: 'Pagi',
                        routineSchedule: buildPatientDaySchedule({
                          days: [targetDay],
                          shift: 'Pagi'
                        })
                      });
                      setIsAddingPatient(true);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>Tambah Pasien</span>
                  </button>
                </div>
              </div>

              {/* Add / Edit Patient Form Inline */}
              {isAddingPatient && (
                <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-blue-900">
                      {editingPatient ? 'Edit Data Pasien Master' : 'Form Registrasi Pasien Hemodialisa Baru'}
                    </h4>
                    <button
                      onClick={() => setIsAddingPatient(false)}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSavePatient} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">No. RM</label>
                        <input
                          type="text"
                          required
                          value={newPatient.medicalRecordNumber || ''}
                          onChange={e => setNewPatient({ ...newPatient, medicalRecordNumber: e.target.value })}
                          className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold"
                          placeholder="e.g. 452127"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Pasien</label>
                        <input
                          type="text"
                          required
                          value={newPatient.patientName || ''}
                          onChange={e => setNewPatient({ ...newPatient, patientName: e.target.value })}
                          className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                          placeholder="Nama lengkap..."
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Usia &amp; Gender</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={newPatient.age || 50}
                            onChange={e => setNewPatient({ ...newPatient, age: Number(e.target.value) })}
                            className="w-1/2 p-2 border border-slate-300 rounded-lg bg-white"
                          />
                          <select
                            value={newPatient.gender || 'L'}
                            onChange={e => setNewPatient({ ...newPatient, gender: e.target.value as 'L' | 'P' })}
                            className="w-1/2 p-2 border border-slate-300 rounded-lg bg-white"
                          >
                            <option value="L">L</option>
                            <option value="P">P</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">BB Kering (kg)</label>
                        <input
                          type="number"
                          step="0.1"
                          required
                          value={newPatient.defaultDryWeight || ''}
                          onChange={e => setNewPatient({ ...newPatient, defaultDryWeight: parseFloat(e.target.value) || 0 })}
                          className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold text-emerald-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Akses Vaskular</label>
                        <select
                          value={newPatient.defaultVascularAccess || 'av_fistula'}
                          onChange={e => setNewPatient({ ...newPatient, defaultVascularAccess: e.target.value as VascularAccess })}
                          className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium"
                        >
                          <option value="av_fistula">AV Fistula (Cimino)</option>
                          <option value="av_graft">AV Graft</option>
                          <option value="cdl_non_tunnel">CDL Non-Tunnel</option>
                          <option value="cdl_permcath">Permcath Tunnel</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Kategori Medis</label>
                        <select
                          value={newPatient.category || 'reguler'}
                          onChange={e => setNewPatient({ ...newPatient, category: e.target.value as PatientCategory })}
                          className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium"
                        >
                          <option value="reguler">Reguler</option>
                          <option value="hepatitis_b">Isolasi Hep B</option>
                          <option value="hepatitis_c">Isolasi Hep C</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Hari Jadwal HD</label>
                        <select
                          value={newPatient.treatmentDays?.[0] || 'Senin'}
                          onChange={e => {
                            const primaryDay = e.target.value as HdTreatmentDay;
                            const secondDay = newPatient.treatmentDays?.[1];
                            const nextDays =
                              secondDay && secondDay !== primaryDay
                                ? [primaryDay, secondDay]
                                : [primaryDay];
                            const shift = newPatient.treatmentShift || 'Pagi';
                            setNewPatient({
                              ...newPatient,
                              treatmentDays: nextDays,
                              routineSchedule: buildPatientDaySchedule({ days: nextDays, shift })
                            });
                          }}
                          className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold text-indigo-900"
                        >
                          {HD_TREATMENT_DAYS.map(day => (
                            <option key={day} value={day}>
                              Hari {day}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Hari Ke-2 (Opsional)</label>
                        <select
                          value={newPatient.treatmentDays?.[1] || ''}
                          onChange={e => {
                            const primaryDay = newPatient.treatmentDays?.[0] || 'Senin';
                            const secondDay = e.target.value as HdTreatmentDay | '';
                            const nextDays =
                              secondDay && secondDay !== primaryDay
                                ? [primaryDay, secondDay]
                                : [primaryDay];
                            const shift = newPatient.treatmentShift || 'Pagi';
                            setNewPatient({
                              ...newPatient,
                              treatmentDays: nextDays,
                              routineSchedule: buildPatientDaySchedule({ days: nextDays, shift })
                            });
                          }}
                          className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-700"
                        >
                          <option value="">- 1 Hari Saja -</option>
                          {HD_TREATMENT_DAYS.filter(d => d !== (newPatient.treatmentDays?.[0] || 'Senin')).map(day => (
                            <option key={day} value={day}>
                              + Hari {day}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Shift HD</label>
                        <select
                          value={newPatient.treatmentShift || 'Pagi'}
                          onChange={e => {
                            const shift = e.target.value as 'Pagi' | 'Siang';
                            const days = newPatient.treatmentDays?.length
                              ? newPatient.treatmentDays
                              : (['Senin'] as HdTreatmentDay[]);
                            setNewPatient({
                              ...newPatient,
                              treatmentShift: shift,
                              routineSchedule: buildPatientDaySchedule({ days, shift })
                            });
                          }}
                          className="w-full p-2 border border-slate-300 rounded-lg bg-white font-semibold text-slate-800"
                        >
                          <option value="Pagi">Shift Pagi</option>
                          <option value="Siang">Shift Siang</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingPatient(false)}
                        className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg text-xs"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs"
                      >
                        Simpan Data Pasien
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Patient Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse text-xs tabular-nums">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3">No. RM</th>
                      <th className="p-3">Nama Pasien</th>
                      <th className="p-3">Usia / Gender</th>
                      <th className="p-3">Dry Weight</th>
                      <th className="p-3">Akses Vaskular</th>
                      <th className="p-3">Kategori</th>
                      <th className="p-3">Hari &amp; Shift Jadwal HD</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPatients.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">
                          <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <div className="font-semibold text-slate-700">Belum ada pasien terdaftar</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Klik tombol "+ Tambah Pasien" untuk mendaftarkan pasien hemodialisa sesuai hari jadwal HD.
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredPatients.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-bold text-slate-900 font-mono">{p.medicalRecordNumber}</td>
                          <td className="p-3 font-semibold text-blue-900">{p.patientName}</td>
                          <td className="p-3 text-slate-600">{p.age} th ({p.gender})</td>
                          <td className="p-3 font-bold text-emerald-800">{p.defaultDryWeight} kg</td>
                          <td className="p-3 capitalize text-slate-700">{p.defaultVascularAccess.replace('_', ' ')}</td>
                          <td className="p-3">
                            <span className={`text-[11px] font-bold ${
                              p.category === 'hepatitis_b'
                                ? 'text-amber-700'
                                : p.category === 'hepatitis_c'
                                ? 'text-purple-700'
                                : 'text-blue-700'
                            }`}>
                              {p.category.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-indigo-800 text-[11px]">
                              {formatPatientTreatmentDaysLabel(resolvePatientTreatmentDays(p), 'full')}
                            </div>
                            <div className="text-slate-600 text-[11px]">
                              Shift {p.treatmentShift || 'Pagi'} · {p.routineSchedule}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleEditPatient(p)}
                                className="p-1 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-100"
                                title="Edit Pasien"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeletePatient(p)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 cursor-pointer"
                                title="Hapus Pasien"
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
          )}

          {/* TAB 2: MASTER PERAWAT */}
          {activeTab === 'nurses' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-600">
                  Daftar seluruh tenaga perawat unit hemodialisa ber-STR &amp; bersertifikat PERNEFRI. Centang tombol <strong>&ldquo;Dinas Hari Ini&rdquo;</strong> untuk mengatur hadir shift aktif.
                </div>
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <button
                    type="button"
                    onClick={() => setBulkModalMode('nurses')}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <FileSpreadsheet className="w-4 h-4 shrink-0" />
                    <span>Tambah Banyak Perawat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingNurse(!isAddingNurse)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>Tambah Perawat</span>
                  </button>
                </div>
              </div>

              {/* Form Add/Edit Nurse */}
              {isAddingNurse && (
                <form onSubmit={handleSaveNurse} className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-900">
                      {editingNurse ? 'Edit Data Tenaga Perawat HD' : 'Registrasi Perawat Unit HD Baru'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNurse(false);
                        setEditingNurse(null);
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nama &amp; Gelar *</label>
                      <input
                        type="text"
                        required
                        value={newNurse.name}
                        onChange={e => setNewNurse({ ...newNurse, name: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                        placeholder="Ners Nama, S.Kep / A.Md.Kep"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Peran / Jabatan</label>
                      <select
                        value={newNurse.role}
                        onChange={e => setNewNurse({ ...newNurse, role: e.target.value as MasterNurse['role'] })}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium"
                      >
                        <option value="perawat_pelaksana">Perawat Pelaksana</option>
                        <option value="pj_shift">PJ Shift</option>
                        <option value="kepala_ruangan">Kepala Ruangan</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Akun / Email Perawat</label>
                      <input
                        type="text"
                        value={newNurse.email || ''}
                        onChange={e => setNewNurse({ ...newNurse, email: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                        placeholder="contoh: ners@rs.id"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">NIP / No. STR</label>
                      <input
                        type="text"
                        value={newNurse.nip}
                        onChange={e => setNewNurse({ ...newNurse, nip: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                        placeholder="Nomor Induk Pegawai..."
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Username Login</label>
                      <input
                        type="text"
                        value={newNurse.username || ''}
                        onChange={e => setNewNurse({ ...newNurse, username: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-mono text-[11px]"
                        placeholder="Username sistem..."
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Kata Sandi Akun</label>
                      <input
                        type="text"
                        value={newNurse.password || ''}
                        onChange={e => setNewNurse({ ...newNurse, password: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-mono text-[11px]"
                        placeholder="Kata sandi login..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNurse(false);
                        setEditingNurse(null);
                      }}
                      className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-blue-600 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                    >
                      {editingNurse ? 'Simpan Perubahan' : 'Simpan Perawat'}
                    </button>
                  </div>
                </form>
              )}

              {/* Nurses Grid */}
              {masterNurses.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-500">
                  <UserPlus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <div className="font-semibold text-slate-700">Belum ada perawat terdaftar</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Klik tombol "+ Tambah Perawat" untuk mendaftarkan tim perawat hemodialisa.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {masterNurses.map(nurse => (
                    <div
                      key={nurse.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                        nurse.isOnDutyToday
                          ? 'bg-white border-blue-300 shadow-xs ring-1 ring-blue-100'
                          : 'bg-slate-50 border-slate-200 opacity-75'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            nurse.role === 'pj_shift'
                              ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                              : nurse.role === 'kepala_ruangan'
                              ? 'bg-purple-100 text-purple-900 border border-purple-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {nurse.role.replace('_', ' ')}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {nurse.pernefriCertified && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" />
                                PERNEFRI OK
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleEditNurse(nurse)}
                              className="p-1 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-100 cursor-pointer"
                              title="Edit Perawat (Nama, Peran, Akun)"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <h4 className="font-bold text-slate-900 text-sm">{nurse.name}</h4>
                        <div className="text-[11px] text-slate-500 mt-0.5 space-y-0.5">
                          <div>NIP: {nurse.nip || '-'}</div>
                          {(nurse.email || nurse.username) && (
                            <div className="text-indigo-600 font-semibold font-mono text-[10.5px]">
                              Akun: {nurse.email || nurse.username}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700">Status Dinas Hari Ini:</span>
                        <button
                          onClick={() => handleToggleNurseDuty(nurse.id)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            nurse.isOnDutyToday
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          }`}
                        >
                          {nurse.isOnDutyToday ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5" />
                              Dinas Aktif
                            </>
                          ) : (
                            'Off / Libur'
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MASTER BED & MESIN HD */}
          {activeTab === 'beds' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-600">
                  Daftar unit bed dan mesin hemodialisa. Sistem memastikan mesin isolasi khusus Hepatitis B dan Hepatitis C terjaga peruntukannya agar tidak terjadi kontaminasi silang.
                </div>
                <button
                  onClick={() => {
                    setEditingBed(null);
                    setNewBed({
                      bedNumber: '',
                      machineBrand: 'SAS 4000',
                      machineModel: 'SAS 4000',
                      serialNumber: '',
                      designation: 'reguler',
                      status: 'ready'
                    });
                    setIsAddingBed(!isAddingBed);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  + Tambah Bed / Mesin HD
                </button>
              </div>

              {/* Form Add/Edit Bed */}
              {isAddingBed && (
                <form onSubmit={handleSaveBed} className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-900">
                      {editingBed ? 'Edit Data Bed & Mesin HD' : 'Registrasi Bed / Mesin Hemodialisa Baru'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingBed(false);
                        setEditingBed(null);
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nomor Bed *</label>
                      <input
                        type="text"
                        required
                        value={newBed.bedNumber}
                        onChange={e => setNewBed({ ...newBed, bedNumber: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold"
                        placeholder="Contoh: BED A01, BED ISOLASI 01..."
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Penunjukan / Isolasi</label>
                      <select
                        value={newBed.designation}
                        onChange={e => setNewBed({ ...newBed, designation: e.target.value as MasterBed['designation'] })}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium"
                      >
                        <option value="reguler">REGULER</option>
                        <option value="isolasi">ISOLASI</option>
                        <option value="isolasi_hepb">Khusus Isolasi Hepatitis B</option>
                        <option value="isolasi_hepc">Khusus Isolasi Hepatitis C</option>
                        <option value="cito_icu">Khusus Cito ICU / Emergency</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Status Operasional</label>
                      <select
                        value={newBed.status}
                        onChange={e => setNewBed({ ...newBed, status: e.target.value as MasterBed['status'] })}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium"
                      >
                        <option value="ready">Siap Pakai (Ready)</option>
                        <option value="maintenance">Perbaikan (Maintenance)</option>
                        <option value="in_use">Sedang Digunakan (In Use)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Merk Mesin</label>
                      <input
                        type="text"
                        value={newBed.machineBrand}
                        onChange={e => setNewBed({ ...newBed, machineBrand: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                        placeholder="SAS 4000..."
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Model / Tipe</label>
                      <input
                        type="text"
                        value={newBed.machineModel}
                        onChange={e => setNewBed({ ...newBed, machineModel: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                        placeholder="SAS 4000..."
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Serial Number (SN)</label>
                      <input
                        type="text"
                        value={newBed.serialNumber}
                        onChange={e => setNewBed({ ...newBed, serialNumber: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-mono text-[11px]"
                        placeholder="SN mesin..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingBed(false);
                        setEditingBed(null);
                      }}
                      className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-blue-600 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                    >
                      {editingBed ? 'Simpan Perubahan' : 'Simpan Bed / Mesin'}
                    </button>
                  </div>
                </form>
              )}

              {/* Beds Grid */}
              {masterBeds.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-500">
                  <Bed className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <div className="font-semibold text-slate-700">Belum ada bed / mesin HD terdaftar</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Klik tombol "+ Tambah Bed / Mesin HD" di atas untuk mendaftarkan unit mesin dialisis rumah sakit Anda.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {masterBeds.map(bed => {
                    const isReady = bed.status === 'ready';
                    return (
                      <div
                        key={bed.id}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                          bed.designation === 'isolasi' || bed.designation === 'isolasi_hepb'
                            ? 'bg-amber-50/70 border-amber-300'
                            : bed.designation === 'isolasi_hepc'
                            ? 'bg-purple-50/70 border-purple-300'
                            : bed.designation === 'cito_icu'
                            ? 'bg-red-50/70 border-red-300'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-black text-xs text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                              {bed.bedNumber}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                bed.status === 'ready'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : bed.status === 'in_use'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                                {bed.status === 'ready'
                                  ? 'Siap'
                                  : bed.status === 'in_use'
                                  ? 'Aktif'
                                  : 'Maint'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleEditBed(bed)}
                                className="text-slate-500 hover:text-blue-600 p-0.5 rounded cursor-pointer"
                                title="Edit Bed / Mesin"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBed(bed)}
                                className="text-slate-400 hover:text-red-600 p-0.5 rounded cursor-pointer"
                                title="Hapus Bed / Mesin"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="text-[11px] font-bold text-slate-800 mt-1">
                            {bed.machineBrand &&
                            bed.machineBrand.trim().toLowerCase() ===
                              bed.machineModel.trim().toLowerCase()
                              ? `Merk ${bed.machineBrand}`
                              : bed.machineBrand}
                          </div>
                          <div className="text-[11px] text-slate-600">
                            {bed.designation === 'isolasi' ? 'ISOLASI' : bed.designation === 'reguler' ? 'REGULER' : bed.machineModel}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1">SN: {bed.serialNumber}</div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 font-medium">Operasional:</span>
                          <button
                            onClick={() => handleToggleBedMaintenance(bed.id)}
                            className={`text-xs font-bold underline cursor-pointer ${
                              isReady ? 'text-amber-700 hover:text-amber-900' : 'text-emerald-700 hover:text-emerald-900'
                            }`}
                          >
                            {isReady ? 'Set Maintenance' : 'Set Siap Pakai'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 4. DOCTORS TAB */}
          {activeTab === 'doctors' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari nama dokter, SIP, NIP, atau spesialisasi..."
                    value={doctorSearch}
                    onChange={(e) => setDoctorSearch(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={doctorRoleFilter}
                    onChange={(e) => setDoctorRoleFilter(e.target.value as any)}
                    className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="all">Semua Peran Dokter</option>
                    <option value="dpjp">Dokter DPJP Saja</option>
                    <option value="dokter_jaga">Dokter Jaga Saja</option>
                  </select>

                  <button
                    onClick={() => {
                      setEditingDoctor(null);
                      setNewDoctor({
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
                      setIsAddingDoctor(!isAddingDoctor);
                    }}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span>{isAddingDoctor ? 'Tutup Form' : 'Tambah Dokter'}</span>
                  </button>
                </div>
              </div>

              {/* Form Tambah/Edit Dokter */}
              {isAddingDoctor && (
                <form onSubmit={handleSaveDoctor} className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 space-y-3">
                  <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Stethoscope className="w-4 h-4 text-blue-600" />
                    <span>{editingDoctor ? 'Edit Master Dokter' : 'Registrasi Dokter Baru'}</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div className="sm:col-span-2">
                      <label className="block text-slate-700 font-bold mb-1">
                        Nama Lengkap &amp; Gelar <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="contoh: dr. Raden Heru Prasanto, Sp.PD-KGH"
                        value={newDoctor.name || ''}
                        onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Kategori Peran</label>
                      <select
                        value={newDoctor.role || 'dpjp'}
                        onChange={(e) => setNewDoctor({ ...newDoctor, role: e.target.value as any })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium"
                      >
                        <option value="dpjp">Dokter DPJP (Sp.PD-KGH)</option>
                        <option value="dokter_jaga">Dokter Jaga Ruangan</option>
                        <option value="both">Keduanya (DPJP &amp; Jaga)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Spesialisasi</label>
                      <input
                        type="text"
                        placeholder="Sp.PD-KGH / Dokter Umum"
                        value={newDoctor.spesialisasi || ''}
                        onChange={(e) => setNewDoctor({ ...newDoctor, spesialisasi: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">No. SIP</label>
                      <input
                        type="text"
                        placeholder="SIP.446/001/DPJP/2024"
                        value={newDoctor.sip || ''}
                        onChange={(e) => setNewDoctor({ ...newDoctor, sip: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-[11px]"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">NIP / ID Dokter</label>
                      <input
                        type="text"
                        placeholder="197508122002121001"
                        value={newDoctor.nip || ''}
                        onChange={(e) => setNewDoctor({ ...newDoctor, nip: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-[11px]"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">No. Telepon / HP</label>
                      <input
                        type="text"
                        placeholder="0812-3456-7890"
                        value={newDoctor.phone || ''}
                        onChange={(e) => setNewDoctor({ ...newDoctor, phone: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Email Resmi</label>
                      <input
                        type="email"
                        placeholder="dokter@happyland.co.id"
                        value={newDoctor.email || ''}
                        onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Status Keaktifan</label>
                      <select
                        value={newDoctor.status || 'aktif'}
                        onChange={(e) => setNewDoctor({ ...newDoctor, status: e.target.value as any })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium"
                      >
                        <option value="aktif">Aktif (Tampil di Logbook)</option>
                        <option value="nonaktif">Nonaktif</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2 md:col-span-3">
                      <label className="block text-slate-700 font-bold mb-1">Catatan Tambahan</label>
                      <input
                        type="text"
                        placeholder="DPJP Utama Unit HD / On-call shift pagi"
                        value={newDoctor.notes || ''}
                        onChange={(e) => setNewDoctor({ ...newDoctor, notes: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-blue-200">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingDoctor(false);
                        setEditingDoctor(null);
                      }}
                      className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-bold cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                    >
                      {editingDoctor ? 'Perbarui Dokter' : 'Simpan Dokter'}
                    </button>
                  </div>
                </form>
              )}

              {/* Grid Dokter */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {masterDoctors
                  .filter((d) => {
                    const term = doctorSearch.toLowerCase().trim();
                    const matchesSearch =
                      !term ||
                      d.name.toLowerCase().includes(term) ||
                      (d.spesialisasi && d.spesialisasi.toLowerCase().includes(term)) ||
                      (d.sip && d.sip.toLowerCase().includes(term)) ||
                      (d.nip && d.nip.toLowerCase().includes(term));
                    const matchesRole =
                      doctorRoleFilter === 'all' ||
                      d.role === doctorRoleFilter ||
                      d.role === 'both';
                    return matchesSearch && matchesRole;
                  })
                  .map((docItem) => {
                    const isAktif = (docItem.status || 'aktif') === 'aktif';
                    return (
                      <div
                        key={docItem.id}
                        className={`p-3.5 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                          isAktif ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-50 border-slate-200 opacity-70'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
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
                              <div>
                                <h5 className="font-bold text-slate-900 leading-tight">
                                  {docItem.name}
                                </h5>
                                <div className="text-[10.5px] text-slate-500 mt-0.5">
                                  {docItem.spesialisasi || 'Dokter Ruangan HD'}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleEditDoctor(docItem)}
                                className="text-slate-400 hover:text-blue-600 p-1 rounded cursor-pointer"
                                title="Edit Dokter"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDoctor(docItem)}
                                className="text-slate-400 hover:text-red-600 p-1 rounded cursor-pointer"
                                title="Hapus Dokter"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-600">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Kategori:</span>
                              <span
                                className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                                  docItem.role === 'dpjp'
                                    ? 'bg-blue-50 text-blue-700'
                                    : docItem.role === 'both'
                                    ? 'bg-purple-50 text-purple-700'
                                    : 'bg-emerald-50 text-emerald-700'
                                }`}
                              >
                                {docItem.role === 'dpjp'
                                  ? 'Dokter DPJP'
                                  : docItem.role === 'both'
                                  ? 'DPJP & Dokter Jaga'
                                  : 'Dokter Jaga Ruangan'}
                              </span>
                            </div>
                            {docItem.sip && (
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">SIP:</span>
                                <span className="font-mono text-[10.5px] text-slate-700">{docItem.sip}</span>
                              </div>
                            )}
                            {docItem.phone && (
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">Kontak:</span>
                                <span>{docItem.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">Status:</span>
                          <button
                            type="button"
                            onClick={() => handleToggleDoctorStatus(docItem.id)}
                            className={`text-xs font-bold underline cursor-pointer ${
                              isAktif ? 'text-emerald-700 hover:text-emerald-900' : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            {isAktif ? 'Aktif' : 'Nonaktif'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Perubahan master data tersimpan di memori sesi sistem untuk mempermudah form input logbook.
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            Selesai &amp; Kembali ke Logbook
          </button>
        </div>
      </div>

      {bulkModalMode && (
        <BulkMasterDataModal
          mode={bulkModalMode}
          isOpen={bulkModalMode !== null}
          onClose={() => setBulkModalMode(null)}
          initialPatientDay={patientDayFilter !== 'all' ? patientDayFilter : 'Senin'}
          existingPatients={masterPatients}
          existingNurses={masterNurses}
          onSaveBulkPatients={handleSaveBulkPatients}
          onSaveBulkNurses={handleSaveBulkNurses}
        />
      )}

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-5 shadow-2xl space-y-4">
            <h4 className="text-sm font-black text-slate-900">Konfirmasi Penghapusan Data</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus <strong>{pendingDelete.label}</strong> dari master data sistem?
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmPendingDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer whitespace-nowrap shrink-0"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
