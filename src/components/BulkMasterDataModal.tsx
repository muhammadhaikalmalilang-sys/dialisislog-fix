import React, { useState, useMemo, useRef } from 'react';
import {
  MasterPatient,
  MasterNurse,
  PatientCategory,
  VascularAccess,
  HdTreatmentDay
} from '../types/dialysis.ts';
import {
  generateUsernameFromNurseName,
  generateNextMedicalRecordNumber,
  inferGenderFromIndonesianName,
  getDefaultAccessSiteForType,
  parseBulkPatientsText,
  parseBulkNursesText,
  buildPatientsCsvTemplate,
  buildNursesCsvTemplate,
  HD_TREATMENT_DAYS,
  HD_2X_DAY_PAIRS,
  extractTreatmentDaysFromText,
  formatPatientTreatmentDaysLabel,
  buildPatientDaySchedule,
  normalizeMasterPatient
} from '../utils/masterDataHelpers.ts';
import {
  X,
  Plus,
  Trash2,
  Upload,
  Download,
  FileSpreadsheet,
  Table,
  CheckCircle2,
  AlertCircle,
  Users,
  UserPlus,
  Wand2
} from 'lucide-react';

interface BulkMasterDataModalProps {
  mode: 'patients' | 'nurses';
  isOpen: boolean;
  onClose: () => void;
  existingPatients: MasterPatient[];
  existingNurses: MasterNurse[];
  initialPatientDay?: HdTreatmentDay;
  onSaveBulkPatients: (newPatients: MasterPatient[], updatedPatients: MasterPatient[]) => void;
  onSaveBulkNurses: (newNurses: MasterNurse[], updatedNurses: MasterNurse[]) => void;
}

interface PatientGridRow {
  rowId: string;
  medicalRecordNumber: string;
  patientName: string;
  age: string;
  gender: 'L' | 'P';
  genderTouched: boolean;
  dryWeight: string;
  vascularAccess: VascularAccess;
  category: PatientCategory;
  daySelection: string;
  treatmentShift: 'Pagi' | 'Siang';
  contactPhone: string;
}

interface NurseGridRow {
  rowId: string;
  name: string;
  nip: string;
  role: MasterNurse['role'];
  shiftAssigned: 'Pagi' | 'Siang' | 'Malam';
  username: string;
  usernameTouched: boolean;
  email: string;
  emailTouched: boolean;
  password: string;
  isOnDutyToday: boolean;
  phone: string;
}

function createEmptyPatientRow(
  idx: number,
  defaults: {
    category: PatientCategory;
    vascularAccess: VascularAccess;
    daySelection: string;
    treatmentShift: 'Pagi' | 'Siang';
    dryWeight: string;
    age: string;
  }
): PatientGridRow {
  return {
    rowId: `p-row-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    medicalRecordNumber: '',
    patientName: '',
    age: defaults.age,
    gender: 'L',
    genderTouched: false,
    dryWeight: defaults.dryWeight,
    vascularAccess: defaults.vascularAccess,
    category: defaults.category,
    daySelection: defaults.daySelection,
    treatmentShift: defaults.treatmentShift,
    contactPhone: ''
  };
}

function createEmptyNurseRow(
  idx: number,
  defaults: {
    role: MasterNurse['role'];
    shiftAssigned: 'Pagi' | 'Siang' | 'Malam';
    password: string;
    isOnDutyToday: boolean;
  }
): NurseGridRow {
  return {
    rowId: `n-row-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    name: '',
    nip: '',
    role: defaults.role,
    shiftAssigned: defaults.shiftAssigned,
    username: '',
    usernameTouched: false,
    email: '',
    emailTouched: false,
    password: defaults.password,
    isOnDutyToday: defaults.isOnDutyToday,
    phone: ''
  };
}

export const BulkMasterDataModal: React.FC<BulkMasterDataModalProps> = ({
  mode,
  isOpen,
  onClose,
  existingPatients,
  existingNurses,
  initialPatientDay = 'Senin',
  onSaveBulkPatients,
  onSaveBulkNurses
}) => {
  const [inputTab, setInputTab] = useState<'grid' | 'paste'>('grid');
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'overwrite'>('skip');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Patient Defaults (Categorized by Day)
  const [defaultPatCategory, setDefaultPatCategory] = useState<PatientCategory>('reguler');
  const [defaultPatAccess, setDefaultPatAccess] = useState<VascularAccess>('av_fistula');
  const [defaultPatDaySelection, setDefaultPatDaySelection] = useState<string>(initialPatientDay);
  const [defaultPatShift, setDefaultPatShift] = useState<'Pagi' | 'Siang'>('Pagi');
  const [defaultPatDryWeight, setDefaultPatDryWeight] = useState('60');
  const [defaultPatAge, setDefaultPatAge] = useState('52');

  // Nurse Defaults
  const [defaultNurseRole, setDefaultNurseRole] =
    useState<MasterNurse['role']>('perawat_pelaksana');
  const [defaultNurseShift, setDefaultNurseShift] = useState<'Pagi' | 'Siang' | 'Malam'>('Pagi');
  const [defaultNursePassword, setDefaultNursePassword] = useState('Dialisis2026!');
  const [defaultNurseOnDuty, setDefaultNurseOnDuty] = useState(true);

  // Multi-row Grid State (starts with 5 rows)
  const [patientRows, setPatientRows] = useState<PatientGridRow[]>(() =>
    Array.from({ length: 5 }, (_, i) =>
      createEmptyPatientRow(i, {
        category: 'reguler',
        vascularAccess: 'av_fistula',
        daySelection: initialPatientDay,
        treatmentShift: 'Pagi',
        dryWeight: '60',
        age: '52'
      })
    )
  );

  const [nurseRows, setNurseRows] = useState<NurseGridRow[]>(() =>
    Array.from({ length: 5 }, (_, i) =>
      createEmptyNurseRow(i, {
        role: 'perawat_pelaksana',
        shiftAssigned: 'Pagi',
        password: 'Dialisis2026!',
        isOnDutyToday: true
      })
    )
  );

  // Paste / CSV Text State
  const [rawPasteText, setRawPasteText] = useState('');

  // Live Parse Results for Paste Mode
  const parsedPatientsResult = useMemo(() => {
    if (mode !== 'patients') return null;
    const defaultDays = extractTreatmentDaysFromText(defaultPatDaySelection);
    return parseBulkPatientsText(rawPasteText, existingPatients, {
      defaultAge: Number(defaultPatAge) || 52,
      defaultDryWeight: Number(defaultPatDryWeight) || 60,
      defaultCategory: defaultPatCategory,
      defaultVascularAccess: defaultPatAccess,
      defaultTreatmentDays: defaultDays.length > 0 ? defaultDays : ['Senin'],
      defaultShift: defaultPatShift
    });
  }, [
    mode,
    rawPasteText,
    existingPatients,
    defaultPatAge,
    defaultPatDryWeight,
    defaultPatCategory,
    defaultPatAccess,
    defaultPatDaySelection,
    defaultPatShift
  ]);

  const parsedNursesResult = useMemo(() => {
    if (mode !== 'nurses') return null;
    return parseBulkNursesText(rawPasteText, existingNurses, {
      defaultRole: defaultNurseRole,
      defaultShift: defaultNurseShift,
      defaultPassword: defaultNursePassword || 'Dialisis2026!',
      defaultIsOnDutyToday: defaultNurseOnDuty
    });
  }, [
    mode,
    rawPasteText,
    existingNurses,
    defaultNurseRole,
    defaultNurseShift,
    defaultNursePassword,
    defaultNurseOnDuty
  ]);

  if (!isOpen) return null;

  // =========================================================================
  // GRID HELPERS — PATIENTS
  // =========================================================================
  const handleAddPatientRows = (count: number) => {
    setErrorBanner(null);
    const additions = Array.from({ length: count }, (_, idx) =>
      createEmptyPatientRow(patientRows.length + idx, {
        category: defaultPatCategory,
        vascularAccess: defaultPatAccess,
        daySelection: defaultPatDaySelection,
        treatmentShift: defaultPatShift,
        dryWeight: defaultPatDryWeight,
        age: defaultPatAge
      })
    );
    setPatientRows(prev => [...prev, ...additions]);
  };

  const handleUpdatePatientRow = (
    rowId: string,
    updates: Partial<PatientGridRow>
  ) => {
    setErrorBanner(null);
    setPatientRows(prev =>
      prev.map(row => {
        if (row.rowId !== rowId) return row;
        const next = { ...row, ...updates };
        if (updates.patientName !== undefined && !next.genderTouched) {
          next.gender = inferGenderFromIndonesianName(updates.patientName, next.gender);
        }
        return next;
      })
    );
  };

  const handleAutoFillPatientMrns = () => {
    setErrorBanner(null);
    const usedMrns = new Set<string>(
      existingPatients.map(p => p.medicalRecordNumber.trim().toLowerCase()).filter(Boolean)
    );
    patientRows.forEach(r => {
      if (r.medicalRecordNumber.trim()) {
        usedMrns.add(r.medicalRecordNumber.trim().toLowerCase());
      }
    });

    setPatientRows(prev =>
      prev.map(row => {
        if (row.medicalRecordNumber.trim()) return row;
        const generated = generateNextMedicalRecordNumber(existingPatients, usedMrns);
        return { ...row, medicalRecordNumber: generated };
      })
    );
  };

  const handleApplyPatientDefaultsToAll = () => {
    setPatientRows(prev =>
      prev.map(row => ({
        ...row,
        category: defaultPatCategory,
        vascularAccess: defaultPatAccess,
        daySelection: defaultPatDaySelection,
        treatmentShift: defaultPatShift
      }))
    );
  };

  // =========================================================================
  // GRID HELPERS — NURSES
  // =========================================================================
  const handleAddNurseRows = (count: number) => {
    setErrorBanner(null);
    const additions = Array.from({ length: count }, (_, idx) =>
      createEmptyNurseRow(nurseRows.length + idx, {
        role: defaultNurseRole,
        shiftAssigned: defaultNurseShift,
        password: defaultNursePassword || 'Dialisis2026!',
        isOnDutyToday: defaultNurseOnDuty
      })
    );
    setNurseRows(prev => [...prev, ...additions]);
  };

  const handleUpdateNurseRow = (rowId: string, updates: Partial<NurseGridRow>) => {
    setErrorBanner(null);
    setNurseRows(prev => {
      // Collect used usernames from existing nurses + other rows in grid
      const usedUsernames = new Set<string>(['admin']);
      existingNurses.forEach(n => {
        if (n.username) usedUsernames.add(n.username.trim().toLowerCase());
      });
      prev.forEach(r => {
        if (r.rowId !== rowId && r.username.trim()) {
          usedUsernames.add(r.username.trim().toLowerCase());
        }
      });

      return prev.map(row => {
        if (row.rowId !== rowId) return row;
        const next = { ...row, ...updates };
        if (updates.name !== undefined) {
          const cleanName = updates.name.trim();
          if (cleanName && !next.usernameTouched) {
            const autoUser = generateUsernameFromNurseName(cleanName, usedUsernames);
            next.username = autoUser;
            if (!next.emailTouched) {
              next.email = `${autoUser}@happyland.co.id`;
            }
          } else if (!cleanName && !next.usernameTouched) {
            next.username = '';
            if (!next.emailTouched) next.email = '';
          }
        }
        if (updates.username !== undefined && !next.emailTouched) {
          const u = updates.username.trim().replace(/^@/, '').toLowerCase();
          next.email = u ? `${u}@happyland.co.id` : '';
        }
        return next;
      });
    });
  };

  const handleApplyNurseDefaultsToAll = () => {
    setNurseRows(prev =>
      prev.map(row => ({
        ...row,
        role: defaultNurseRole,
        shiftAssigned: defaultNurseShift,
        password: defaultNursePassword || 'Dialisis2026!',
        isOnDutyToday: defaultNurseOnDuty
      }))
    );
  };

  const handleAutoRegenerateAllNurseAccounts = () => {
    const usedUsernames = new Set<string>(['admin']);
    existingNurses.forEach(n => {
      if (n.username) usedUsernames.add(n.username.trim().toLowerCase());
    });
    setNurseRows(prev =>
      prev.map(row => {
        if (!row.name.trim()) return row;
        const autoUser = generateUsernameFromNurseName(row.name, usedUsernames);
        return {
          ...row,
          username: autoUser,
          usernameTouched: false,
          email: `${autoUser}@happyland.co.id`,
          emailTouched: false
        };
      })
    );
  };

  // =========================================================================
  // FILE UPLOAD & TEMPLATE DOWNLOAD
  // =========================================================================
  const handleDownloadCsvTemplate = () => {
    const csvContent =
      mode === 'patients' ? buildPatientsCsvTemplate() : buildNursesCsvTemplate();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download =
      mode === 'patients'
        ? 'template_bulk_pasien_hd.csv'
        : 'template_bulk_perawat_hd.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorBanner(null);
    const reader = new FileReader();
    reader.onload = evt => {
      const content = String(evt.target?.result || '');
      setRawPasteText(content);
      setInputTab('paste');
    };
    reader.onerror = () => {
      setErrorBanner('Gagal membaca file CSV/Teks. Pastikan format file teks UTF-8.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // =========================================================================
  // SAVE EXECUTION — GRID OR PASTE
  // =========================================================================
  const filledPatientGridRows = patientRows.filter(
    r => r.patientName.trim().length > 0 || r.medicalRecordNumber.trim().length > 0
  );
  const filledNurseGridRows = nurseRows.filter(
    r => r.name.trim().length > 0 || r.username.trim().length > 0 || r.nip.trim().length > 0
  );

  const handleSubmitSave = () => {
    setErrorBanner(null);

    if (mode === 'patients') {
      if (inputTab === 'grid') {
        if (filledPatientGridRows.length === 0) {
          setErrorBanner('Harap isi minimal 1 baris Nama Pasien pada tabel sebelum menyimpan.');
          return;
        }

        const existingByMrn = new Map<string, MasterPatient>();
        const usedMrns = new Set<string>();
        existingPatients.forEach(p => {
          const k = p.medicalRecordNumber.trim().toLowerCase();
          if (k) {
            existingByMrn.set(k, p);
            usedMrns.add(k);
          }
        });

        const seenBatch = new Set<string>();
        const newPatients: MasterPatient[] = [];
        const updatedPatients: MasterPatient[] = [];

        for (let i = 0; i < filledPatientGridRows.length; i++) {
          const row = filledPatientGridRows[i];
          const cleanName = row.patientName.trim();
          if (!cleanName) {
            setErrorBanner(`Baris terisi ke-${i + 1}: Nama Pasien wajib diisi.`);
            return;
          }
          const cleanMrn =
            row.medicalRecordNumber.trim() ||
            generateNextMedicalRecordNumber(existingPatients, usedMrns);
          const mrnKey = cleanMrn.toLowerCase();

          if (seenBatch.has(mrnKey)) {
            setErrorBanner(`No. RM "${cleanMrn}" terduplikasi lebih dari satu kali pada tabel input.`);
            return;
          }
          seenBatch.add(mrnKey);
          usedMrns.add(mrnKey);

          const existingMatch = existingByMrn.get(mrnKey);
          if (existingMatch && duplicateStrategy === 'skip') {
            continue;
          }

          const rowDays = extractTreatmentDaysFromText(row.daySelection);
          const resolvedDays: HdTreatmentDay[] = rowDays.length > 0 ? rowDays : ['Senin'];
          const resolvedShift: 'Pagi' | 'Siang' = row.treatmentShift || 'Pagi';

          const patientObj = normalizeMasterPatient({
            id: existingMatch?.id || `mp-grid-${Date.now()}-${i}`,
            medicalRecordNumber: cleanMrn,
            patientName: cleanName,
            age: Math.max(1, Math.min(120, Number(row.age) || 52)),
            gender: row.gender,
            defaultStatus: 'rajal',
            category: row.category,
            defaultVascularAccess: row.vascularAccess,
            defaultAccessSite: getDefaultAccessSiteForType(row.vascularAccess),
            defaultDialyzer: 'SAS HF 18',
            defaultDryWeight: Math.max(15, Number(row.dryWeight) || 60),
            treatmentDays: resolvedDays,
            treatmentShift: resolvedShift,
            routineSchedule: buildPatientDaySchedule({
              days: resolvedDays,
              shift: resolvedShift
            }),
            contactPhone: row.contactPhone.trim() || undefined
          });

          if (existingMatch) {
            updatedPatients.push(patientObj);
          } else {
            newPatients.push(patientObj);
          }
        }

        if (newPatients.length === 0 && updatedPatients.length === 0) {
          setErrorBanner(
            'Seluruh No. RM pada tabel sudah terdaftar. Ubah opsi duplikat ke "Perbarui Data Duplikat" atau gunakan No. RM baru.'
          );
          return;
        }

        onSaveBulkPatients(newPatients, updatedPatients);
        return;
      }

      // Paste Mode — Patients
      if (!parsedPatientsResult || parsedPatientsResult.items.length === 0) {
        setErrorBanner('Belum ada data pasien yang ditempel atau diunggah.');
        return;
      }

      const validItems = parsedPatientsResult.items.filter(i => !i.error);
      const newPatients = validItems
        .filter(i => !i.isDuplicateExisting)
        .map(i => i.patient);
      const updatedPatients =
        duplicateStrategy === 'overwrite'
          ? validItems.filter(i => i.isDuplicateExisting).map(i => i.patient)
          : [];

      if (newPatients.length === 0 && updatedPatients.length === 0) {
        setErrorBanner(
          'Tidak ada data pasien valid baru untuk disimpan. Periksa format baris atau pengaturan duplikat.'
        );
        return;
      }

      onSaveBulkPatients(newPatients, updatedPatients);
      return;
    }

    // =====================================================================
    // SAVE NURSES
    // =====================================================================
    if (inputTab === 'grid') {
      if (filledNurseGridRows.length === 0) {
        setErrorBanner('Harap isi minimal 1 baris Nama Perawat pada tabel sebelum menyimpan.');
        return;
      }

      const usedUsernames = new Set<string>(['admin']);
      const existingByUsername = new Map<string, MasterNurse>();
      existingNurses.forEach(n => {
        if (n.username) {
          const u = n.username.trim().toLowerCase();
          usedUsernames.add(u);
          existingByUsername.set(u, n);
        }
      });

      const seenBatchUser = new Set<string>();
      const newNurses: MasterNurse[] = [];
      const updatedNurses: MasterNurse[] = [];

      for (let i = 0; i < filledNurseGridRows.length; i++) {
        const row = filledNurseGridRows[i];
        const cleanName = row.name.trim();
        if (!cleanName) {
          setErrorBanner(`Baris terisi ke-${i + 1}: Nama Lengkap Perawat wajib diisi.`);
          return;
        }

        const rawUser = row.username.trim().replace(/^@/, '').toLowerCase();
        const existingMatch = rawUser ? existingByUsername.get(rawUser) : undefined;

        const finalUsername =
          rawUser || generateUsernameFromNurseName(cleanName, usedUsernames);

        if (finalUsername === 'admin') {
          setErrorBanner(`Username "admin" dicadangkan khusus untuk Administrator.`);
          return;
        }

        if (seenBatchUser.has(finalUsername)) {
          setErrorBanner(`Username "@${finalUsername}" duplikat pada tabel input.`);
          return;
        }
        seenBatchUser.add(finalUsername);
        usedUsernames.add(finalUsername);

        if (existingMatch && duplicateStrategy === 'skip') {
          continue;
        }

        const finalEmail =
          row.email.trim().toLowerCase() || `${finalUsername}@happyland.co.id`;
        const finalPassword = row.password.trim() || defaultNursePassword || 'Dialisis2026!';

        if (finalPassword.length < 3) {
          setErrorBanner(`Kata sandi untuk "${cleanName}" minimal 3 karakter.`);
          return;
        }

        const nurseObj: MasterNurse = {
          id: existingMatch?.id || `nurse-grid-${Date.now()}-${i}`,
          name: cleanName,
          nip: row.nip.trim(),
          role: row.role,
          systemAccess: row.role,
          username: finalUsername,
          email: finalEmail,
          password: finalPassword,
          accountStatus: 'aktif',
          pernefriCertified: true,
          isOnDutyToday: row.isOnDutyToday,
          shiftAssigned: row.shiftAssigned,
          phone: row.phone.trim() || undefined
        };

        if (existingMatch) {
          updatedNurses.push(nurseObj);
        } else {
          newNurses.push(nurseObj);
        }
      }

      if (newNurses.length === 0 && updatedNurses.length === 0) {
        setErrorBanner(
          'Seluruh akun perawat pada tabel sudah terdaftar. Ubah opsi duplikat ke "Perbarui Data Duplikat" atau gunakan username berbeda.'
        );
        return;
      }

      onSaveBulkNurses(newNurses, updatedNurses);
      return;
    }

    // Paste Mode — Nurses
    if (!parsedNursesResult || parsedNursesResult.items.length === 0) {
      setErrorBanner('Belum ada data perawat yang ditempel atau diunggah.');
      return;
    }

    const validItems = parsedNursesResult.items.filter(i => !i.error);
    const newNurses = validItems
      .filter(i => !i.isDuplicateExisting)
      .map(i => i.nurse);
    const updatedNurses =
      duplicateStrategy === 'overwrite'
        ? validItems.filter(i => i.isDuplicateExisting).map(i => i.nurse)
        : [];

    if (newNurses.length === 0 && updatedNurses.length === 0) {
      setErrorBanner(
        'Tidak ada data perawat valid baru untuk disimpan. Periksa format baris atau pengaturan duplikat.'
      );
      return;
    }

    onSaveBulkNurses(newNurses, updatedNurses);
  };

  // Count ready items for primary CTA label
  const readyCount =
    mode === 'patients'
      ? inputTab === 'grid'
        ? filledPatientGridRows.length
        : parsedPatientsResult
        ? duplicateStrategy === 'overwrite'
          ? parsedPatientsResult.validCount
          : parsedPatientsResult.newCount
        : 0
      : inputTab === 'grid'
      ? filledNurseGridRows.length
      : parsedNursesResult
      ? duplicateStrategy === 'overwrite'
        ? parsedNursesResult.validCount
        : parsedNursesResult.newCount
      : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div
        className="bg-white rounded-2xl w-full max-w-6xl h-[92vh] max-h-[92vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center shrink-0">
              {mode === 'patients' ? (
                <Users className="w-5 h-5" />
              ) : (
                <UserPlus className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-indigo-300">
                <span className="font-bold">Fitur Input Massal Administrator</span>
                <span aria-hidden="true">&middot;</span>
                <span className="text-slate-300">
                  {mode === 'patients' ? 'Master Data Pasien HD' : 'Master Data & Akun Perawat'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white truncate">
                {mode === 'patients'
                  ? 'Tambah Banyak Data Pasien Sekaligus'
                  : 'Tambah Banyak Data & Akun Perawat Sekaligus'}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Tutup jendela input massal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Sub-Navbar */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-xl self-start">
            <button
              type="button"
              onClick={() => {
                setErrorBanner(null);
                setInputTab('grid');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                inputTab === 'grid'
                  ? 'bg-white text-indigo-950 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5 shrink-0" />
              <span>Tabel Input Multi-Baris</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setErrorBanner(null);
                setInputTab('paste');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                inputTab === 'paste'
                  ? 'bg-white text-indigo-950 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
              <span>Tempel Excel / CSV &amp; Upload File</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5 shrink-0" />
              <span>Upload CSV / TXT</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadCsvTemplate}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>Unduh Template CSV</span>
            </button>

            <select
              value={duplicateStrategy}
              onChange={e => setDuplicateStrategy(e.target.value as 'skip' | 'overwrite')}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-700 cursor-pointer"
              title="Perlakuan jika No. RM atau Username sudah ada"
            >
              <option value="skip">Jika Duplikat: Lewati Data Lama</option>
              <option value="overwrite">Jika Duplikat: Perbarui Data Lama</option>
            </select>
          </div>
        </div>

        {/* Scrollable Workspace */}
        <div className="p-5 overflow-y-auto flex-1 min-h-0 space-y-4 bg-slate-50/50 text-xs">
          {errorBanner && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 font-semibold flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorBanner}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorBanner(null)}
                className="text-rose-400 hover:text-rose-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ================================================================= */}
          {/* GLOBAL DEFAULTS BAR                                               */}
          {/* ================================================================= */}
          {mode === 'patients' ? (
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-end justify-between gap-3">
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 flex-1 min-w-[280px]">
                <div className="col-span-2 sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Default Kategori Hari HD
                  </label>
                  <select
                    value={defaultPatDaySelection}
                    onChange={e => setDefaultPatDaySelection(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-indigo-50/60 border border-indigo-200 rounded-lg font-bold text-indigo-950"
                  >
                    <optgroup label="Kategori Per Hari">
                      {HD_TREATMENT_DAYS.map(day => (
                        <option key={day} value={day}>
                          Hari {day}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Kombinasi 2 Hari Rutin">
                      {HD_2X_DAY_PAIRS.map(pair => (
                        <option key={pair.label} value={pair.label}>
                          {pair.label}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Default Shift HD
                  </label>
                  <select
                    value={defaultPatShift}
                    onChange={e => setDefaultPatShift(e.target.value as 'Pagi' | 'Siang')}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800"
                  >
                    <option value="Pagi">Shift Pagi</option>
                    <option value="Siang">Shift Siang</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Default Kategori
                  </label>
                  <select
                    value={defaultPatCategory}
                    onChange={e => setDefaultPatCategory(e.target.value as PatientCategory)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800"
                  >
                    <option value="reguler">Reguler</option>
                    <option value="hepatitis_b">Isolasi Hep B</option>
                    <option value="hepatitis_c">Isolasi Hep C</option>
                    <option value="hiv">Isolasi HIV</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Default Akses
                  </label>
                  <select
                    value={defaultPatAccess}
                    onChange={e => setDefaultPatAccess(e.target.value as VascularAccess)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800"
                  >
                    <option value="av_fistula">AV-Fistula (Cimino)</option>
                    <option value="av_graft">AV-Graft</option>
                    <option value="cdl_non_tunnel">CDL Non-Tunnel</option>
                    <option value="cdl_permcath">Permcath</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    BB Kering (kg)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={defaultPatDryWeight}
                    onChange={e => setDefaultPatDryWeight(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800 tabular-nums"
                  />
                </div>
              </div>

              {inputTab === 'grid' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleAutoFillPatientMrns}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Wand2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Isi Otomatis No. RM</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyPatientDefaultsToAll}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg font-semibold cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Terapkan ke Semua Baris
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-end justify-between gap-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-1 min-w-[280px]">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Default Peran / Hak Akses
                  </label>
                  <select
                    value={defaultNurseRole}
                    onChange={e =>
                      setDefaultNurseRole(e.target.value as MasterNurse['role'])
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800"
                  >
                    <option value="perawat_pelaksana">Perawat Pelaksana</option>
                    <option value="pj_shift">PJ Shift</option>
                    <option value="kepala_ruangan">Kepala Ruangan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Default Shift Dinas
                  </label>
                  <select
                    value={defaultNurseShift}
                    onChange={e =>
                      setDefaultNurseShift(e.target.value as 'Pagi' | 'Siang' | 'Malam')
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800"
                  >
                    <option value="Pagi">Shift Pagi</option>
                    <option value="Siang">Shift Siang</option>
                    <option value="Malam">Shift Malam</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Default Kata Sandi Login
                  </label>
                  <input
                    type="text"
                    value={defaultNursePassword}
                    onChange={e => setDefaultNursePassword(e.target.value)}
                    placeholder="Dialisis2026!"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Status Dinas Awal
                  </label>
                  <select
                    value={defaultNurseOnDuty ? 'on' : 'off'}
                    onChange={e => setDefaultNurseOnDuty(e.target.value === 'on')}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800"
                  >
                    <option value="on">Sedang Dinas</option>
                    <option value="off">Libur / Off</option>
                  </select>
                </div>
              </div>

              {inputTab === 'grid' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleAutoRegenerateAllNurseAccounts}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Wand2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Generate Ulang Username</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyNurseDefaultsToAll}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg font-semibold cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Terapkan ke Semua Baris
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 1: SPREADSHEET MULTI-ROW GRID                                 */}
          {/* ================================================================= */}
          {inputTab === 'grid' ? (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              {/* Row Adders Toolbar */}
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="text-slate-600">
                  <span className="font-bold text-slate-800">
                    {mode === 'patients'
                      ? 'Tabel Input Cepat Pasien:'
                      : 'Tabel Input Cepat Perawat & Akun:'}
                  </span>{' '}
                  <span>
                    Baris yang dikosongkan akan diabaikan otomatis saat menyimpan.
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {[1, 5, 10, 25].map(count => (
                    <button
                      key={count}
                      type="button"
                      onClick={() =>
                        mode === 'patients'
                          ? handleAddPatientRows(count)
                          : handleAddNurseRows(count)
                      }
                      className="px-2.5 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3 h-3 shrink-0" />
                      <span>{count} Baris</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid Table */}
              <div className="overflow-x-auto">
                {mode === 'patients' ? (
                  <table className="w-full text-left border-collapse tabular-nums min-w-[1100px]">
                    <thead>
                      <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                        <th className="p-2.5 text-center w-10">#</th>
                        <th className="p-2.5 w-28">No. RM (Auto)</th>
                        <th className="p-2.5 min-w-[190px]">
                          Nama Lengkap Pasien <span className="text-rose-500">*</span>
                        </th>
                        <th className="p-2.5 w-18">Usia</th>
                        <th className="p-2.5 w-18">JK</th>
                        <th className="p-2.5 w-24">BB Kering</th>
                        <th className="p-2.5 w-32">Akses Vaskular</th>
                        <th className="p-2.5 w-28">Kategori</th>
                        <th className="p-2.5 w-44">Hari Jadwal HD</th>
                        <th className="p-2.5 w-28">Shift HD</th>
                        <th className="p-2.5 w-28">No. Telepon</th>
                        <th className="p-2.5 text-center w-12">Hapus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {patientRows.map((row, idx) => (
                        <tr key={row.rowId} className="hover:bg-slate-50/70">
                          <td className="p-2 text-center font-mono text-slate-400 font-semibold">
                            {idx + 1}
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.medicalRecordNumber}
                              onChange={e =>
                                handleUpdatePatientRow(row.rowId, {
                                  medicalRecordNumber: e.target.value
                                })
                              }
                              placeholder="Otomatis"
                              className="w-full px-2.5 py-1.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-lg font-mono font-semibold"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.patientName}
                              onChange={e =>
                                handleUpdatePatientRow(row.rowId, {
                                  patientName: e.target.value
                                })
                              }
                              placeholder="Contoh: Ny. Sari Rahmawati"
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 focus:border-indigo-500 rounded-lg font-semibold text-slate-900"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              value={row.age}
                              onChange={e =>
                                handleUpdatePatientRow(row.rowId, { age: e.target.value })
                              }
                              className="w-full px-2 py-1.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-lg text-center"
                            />
                          </td>
                          <td className="p-1.5">
                            <select
                              value={row.gender}
                              onChange={e =>
                                handleUpdatePatientRow(row.rowId, {
                                  gender: e.target.value as 'L' | 'P',
                                  genderTouched: true
                                })
                              }
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
                            >
                              <option value="L">L</option>
                              <option value="P">P</option>
                            </select>
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              step="0.1"
                              value={row.dryWeight}
                              onChange={e =>
                                handleUpdatePatientRow(row.rowId, {
                                  dryWeight: e.target.value
                                })
                              }
                              className="w-full px-2 py-1.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-lg text-center font-semibold"
                            />
                          </td>
                          <td className="p-1.5">
                            <select
                              value={row.vascularAccess}
                              onChange={e =>
                                handleUpdatePatientRow(row.rowId, {
                                  vascularAccess: e.target.value as VascularAccess
                                })
                              }
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg"
                            >
                              <option value="av_fistula">AVF (Cimino)</option>
                              <option value="av_graft">AV-Graft</option>
                              <option value="cdl_non_tunnel">CDL Non-Tunnel</option>
                              <option value="cdl_permcath">Permcath</option>
                            </select>
                          </td>
                          <td className="p-1.5">
                            <select
                              value={row.category}
                              onChange={e =>
                                handleUpdatePatientRow(row.rowId, {
                                  category: e.target.value as PatientCategory
                                })
                              }
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg"
                            >
                              <option value="reguler">Reguler</option>
                              <option value="hepatitis_b">Hep B</option>
                              <option value="hepatitis_c">Hep C</option>
                              <option value="hiv">HIV</option>
                            </select>
                          </td>
                          <td className="p-1.5">
                            <select
                              value={row.daySelection}
                              onChange={e =>
                                handleUpdatePatientRow(row.rowId, {
                                  daySelection: e.target.value
                                })
                              }
                              className="w-full px-2 py-1.5 bg-indigo-50/50 border border-indigo-200 rounded-lg font-bold text-indigo-950"
                            >
                              <optgroup label="Kategori Per Hari">
                                {HD_TREATMENT_DAYS.map(day => (
                                  <option key={day} value={day}>
                                    Hari {day}
                                  </option>
                                ))}
                              </optgroup>
                              <optgroup label="Kombinasi 2 Hari Rutin">
                                {HD_2X_DAY_PAIRS.map(pair => (
                                  <option key={pair.label} value={pair.label}>
                                    {pair.label}
                                  </option>
                                ))}
                              </optgroup>
                            </select>
                          </td>
                          <td className="p-1.5">
                            <select
                              value={row.treatmentShift}
                              onChange={e =>
                                handleUpdatePatientRow(row.rowId, {
                                  treatmentShift: e.target.value as 'Pagi' | 'Siang'
                                })
                              }
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
                            >
                              <option value="Pagi">Shift Pagi</option>
                              <option value="Siang">Shift Siang</option>
                            </select>
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.contactPhone}
                              onChange={e =>
                                handleUpdatePatientRow(row.rowId, {
                                  contactPhone: e.target.value
                                })
                              }
                              placeholder="0812..."
                              className="w-full px-2.5 py-1.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-lg"
                            />
                          </td>
                          <td className="p-1.5 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setPatientRows(prev =>
                                  prev.length > 1
                                    ? prev.filter(r => r.rowId !== row.rowId)
                                    : prev.map(r =>
                                        r.rowId === row.rowId
                                          ? createEmptyPatientRow(0, {
                                              category: defaultPatCategory,
                                              vascularAccess: defaultPatAccess,
                                              daySelection: defaultPatDaySelection,
                                              treatmentShift: defaultPatShift,
                                              dryWeight: defaultPatDryWeight,
                                              age: defaultPatAge
                                            })
                                          : r
                                      )
                                )
                              }
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title="Hapus baris"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left border-collapse tabular-nums min-w-[1020px]">
                    <thead>
                      <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                        <th className="p-2.5 text-center w-10">#</th>
                        <th className="p-2.5 min-w-[210px]">
                          Nama Lengkap &amp; Gelar <span className="text-rose-500">*</span>
                        </th>
                        <th className="p-2.5 w-36">NIP Pegawai</th>
                        <th className="p-2.5 w-40">Peran / Hak Akses</th>
                        <th className="p-2.5 w-24">Shift</th>
                        <th className="p-2.5 w-36">Username (Auto)</th>
                        <th className="p-2.5 w-44">Email Akun (Auto)</th>
                        <th className="p-2.5 w-32">Kata Sandi</th>
                        <th className="p-2.5 text-center w-20">Dinas</th>
                        <th className="p-2.5 text-center w-12">Hapus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {nurseRows.map((row, idx) => (
                        <tr key={row.rowId} className="hover:bg-slate-50/70">
                          <td className="p-2 text-center font-mono text-slate-400 font-semibold">
                            {idx + 1}
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.name}
                              onChange={e =>
                                handleUpdateNurseRow(row.rowId, { name: e.target.value })
                              }
                              placeholder="Contoh: Ners Andi Pratama, S.Kep."
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 focus:border-indigo-500 rounded-lg font-semibold text-slate-900"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.nip}
                              onChange={e =>
                                handleUpdateNurseRow(row.rowId, { nip: e.target.value })
                              }
                              placeholder="1995xxxx..."
                              className="w-full px-2.5 py-1.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-lg font-mono"
                            />
                          </td>
                          <td className="p-1.5">
                            <select
                              value={row.role}
                              onChange={e =>
                                handleUpdateNurseRow(row.rowId, {
                                  role: e.target.value as MasterNurse['role']
                                })
                              }
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
                            >
                              <option value="perawat_pelaksana">Perawat Pelaksana</option>
                              <option value="pj_shift">PJ Shift</option>
                              <option value="kepala_ruangan">Kepala Ruangan</option>
                            </select>
                          </td>
                          <td className="p-1.5">
                            <select
                              value={row.shiftAssigned}
                              onChange={e =>
                                handleUpdateNurseRow(row.rowId, {
                                  shiftAssigned: e.target.value as 'Pagi' | 'Siang' | 'Malam'
                                })
                              }
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
                            >
                              <option value="Pagi">Pagi</option>
                              <option value="Siang">Siang</option>
                              <option value="Malam">Malam</option>
                            </select>
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.username}
                              onChange={e =>
                                handleUpdateNurseRow(row.rowId, {
                                  username: e.target.value,
                                  usernameTouched: true
                                })
                              }
                              placeholder="Otomatis"
                              className="w-full px-2.5 py-1.5 bg-indigo-50/40 focus:bg-white border border-slate-300 rounded-lg font-mono font-semibold text-indigo-800"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.email}
                              onChange={e =>
                                handleUpdateNurseRow(row.rowId, {
                                  email: e.target.value,
                                  emailTouched: true
                                })
                              }
                              placeholder="Otomatis"
                              className="w-full px-2.5 py-1.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-lg font-mono"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.password}
                              onChange={e =>
                                handleUpdateNurseRow(row.rowId, { password: e.target.value })
                              }
                              className="w-full px-2.5 py-1.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-lg font-mono"
                            />
                          </td>
                          <td className="p-1.5 text-center">
                            <input
                              type="checkbox"
                              checked={row.isOnDutyToday}
                              onChange={e =>
                                handleUpdateNurseRow(row.rowId, {
                                  isOnDutyToday: e.target.checked
                                })
                              }
                              className="w-4 h-4 rounded-sm border-slate-300 text-indigo-600 cursor-pointer"
                            />
                          </td>
                          <td className="p-1.5 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setNurseRows(prev =>
                                  prev.length > 1
                                    ? prev.filter(r => r.rowId !== row.rowId)
                                    : prev.map(r =>
                                        r.rowId === row.rowId
                                          ? createEmptyNurseRow(0, {
                                              role: defaultNurseRole,
                                              shiftAssigned: defaultNurseShift,
                                              password: defaultNursePassword || 'Dialisis2026!',
                                              isOnDutyToday: defaultNurseOnDuty
                                            })
                                          : r
                                      )
                                )
                              }
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title="Hapus baris"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : (
            /* ================================================================= */
            /* TAB 2: PASTE EXCEL / CSV & LIVE PREVIEW                           */
            /* ================================================================= */
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="block font-bold text-slate-900">
                      {mode === 'patients'
                        ? 'Tempel (Copy-Paste) Daftar Pasien dari Excel / Spreadsheet / CSV / Daftar Nama'
                        : 'Tempel (Copy-Paste) Daftar Perawat dari Excel / Spreadsheet / CSV / Daftar Nama'}
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {mode === 'patients'
                        ? 'Format kolom fleksibel (Tab Excel, koma, titik koma, atau 1 nama per baris): No. RM | Nama Pasien | Usia | JK (L/P) | BB Kering | Akses | Kategori | Hari HD (Senin s/d Minggu) | Shift HD (Pagi/Siang) | No. HP'
                        : 'Format kolom fleksibel (dipisah Tab Excel, koma, titik koma, atau 1 nama per baris): Nama Lengkap | NIP | Peran (pelaksana / pj_shift / kepala_ruangan) | Shift (Pagi/Siang/Malam) | Username | Email | Password'}
                    </p>
                  </div>
                  {rawPasteText && (
                    <button
                      type="button"
                      onClick={() => setRawPasteText('')}
                      className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                    >
                      Bersihkan Teks
                    </button>
                  )}
                </div>

                <textarea
                  rows={7}
                  value={rawPasteText}
                  onChange={e => {
                    setErrorBanner(null);
                    setRawPasteText(e.target.value);
                  }}
                  placeholder={
                    mode === 'patients'
                      ? 'Tempel langsung baris dari Excel atau ketik 1 pasien per baris, contoh:\n452101, Tn. Ahmad Fauzi, 58, L, 63.5, AVF, Reguler, Senin, Pagi\n452102, Ny. Ratna Sari, 47, P, 52.0, CDL, Reguler, Selasa, Pagi\n452103, Tn. Hendra Pratama, 62, L, 59.0, AVF, Reguler, Rabu, Siang'
                      : 'Tempel langsung baris dari Excel atau ketik 1 perawat per baris, contoh:\nNs. Ratih Kusuma, S.Kep., 19880412, kepala_ruangan, Pagi\nNs. Hendra Wijaya, S.Kep., 19910520, pj_shift, Pagi\nNers Dian Anggraini, S.Kep., 19950814, pelaksana, Pagi'
                  }
                  className="w-full p-3 bg-slate-50 focus:bg-white border border-slate-300 focus:border-indigo-500 rounded-xl font-mono text-xs leading-relaxed focus:outline-hidden"
                />
              </div>

              {/* Live Preview Table */}
              {mode === 'patients' && parsedPatientsResult && parsedPatientsResult.items.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 tabular-nums">
                    <span className="font-bold text-slate-900">
                      Pratinjau Data Pasien Terbaca ({parsedPatientsResult.items.length} baris)
                    </span>
                    <div className="flex items-center gap-3 text-[11px] font-semibold">
                      <span className="text-emerald-700">
                        Baru: {parsedPatientsResult.newCount}
                      </span>
                      <span aria-hidden="true">&middot;</span>
                      <span className="text-indigo-700">
                        Duplikat Lama: {parsedPatientsResult.duplicateExistingCount}
                      </span>
                      {parsedPatientsResult.errorCount > 0 && (
                        <>
                          <span aria-hidden="true">&middot;</span>
                          <span className="text-rose-600">
                            Perlu Perbaikan: {parsedPatientsResult.errorCount}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="overflow-x-auto max-h-64">
                    <table className="w-full text-left border-collapse tabular-nums">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                          <th className="p-2.5">Baris</th>
                          <th className="p-2.5">No. RM</th>
                          <th className="p-2.5">Nama Pasien</th>
                          <th className="p-2.5 text-center">Usia/JK</th>
                          <th className="p-2.5 text-center">BB Kering</th>
                          <th className="p-2.5 text-center">Akses &amp; Kategori</th>
                          <th className="p-2.5">Kategori Hari &amp; Shift HD</th>
                          <th className="p-2.5">Status Impor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedPatientsResult.items.map(item => (
                          <tr key={`${item.rowNumber}-${item.patient.medicalRecordNumber}`}>
                            <td className="p-2.5 font-mono text-slate-400">#{item.rowNumber}</td>
                            <td className="p-2.5 font-mono font-bold text-indigo-950">
                              {item.patient.medicalRecordNumber}
                            </td>
                            <td className="p-2.5 font-bold text-slate-900">
                              {item.patient.patientName || '-'}
                            </td>
                            <td className="p-2.5 text-center">
                              {item.patient.age} th ({item.patient.gender})
                            </td>
                            <td className="p-2.5 text-center font-semibold">
                              {item.patient.defaultDryWeight} kg
                            </td>
                            <td className="p-2.5 text-center text-slate-600">
                              {item.patient.defaultVascularAccess === 'av_fistula'
                                ? 'AVF'
                                : item.patient.defaultVascularAccess === 'cdl_non_tunnel'
                                ? 'CDL'
                                : item.patient.defaultVascularAccess === 'cdl_permcath'
                                ? 'Permcath'
                                : 'AV-Graft'}{' '}
                              &middot; {item.patient.category}
                            </td>
                            <td className="p-2.5">
                              <div className="font-bold text-indigo-800">
                                {formatPatientTreatmentDaysLabel(item.patient.treatmentDays, 'full')}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {item.patient.routineSchedule}
                              </div>
                            </td>
                            <td className="p-2.5 font-semibold">
                              {item.error ? (
                                <span className="text-rose-600">{item.error}</span>
                              ) : item.isDuplicateExisting ? (
                                duplicateStrategy === 'overwrite' ? (
                                  <span className="text-indigo-700">Akan Diperbarui</span>
                                ) : (
                                  <span className="text-amber-700">Dilewati (Sudah Ada)</span>
                                )
                              ) : (
                                <span className="text-emerald-700">Siap Ditambahkan</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {mode === 'nurses' && parsedNursesResult && parsedNursesResult.items.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 tabular-nums">
                    <span className="font-bold text-slate-900">
                      Pratinjau Data &amp; Akun Perawat Terbaca ({parsedNursesResult.items.length}{' '}
                      baris)
                    </span>
                    <div className="flex items-center gap-3 text-[11px] font-semibold">
                      <span className="text-emerald-700">
                        Baru: {parsedNursesResult.newCount}
                      </span>
                      <span aria-hidden="true">&middot;</span>
                      <span className="text-indigo-700">
                        Duplikat Lama: {parsedNursesResult.duplicateExistingCount}
                      </span>
                      {parsedNursesResult.errorCount > 0 && (
                        <>
                          <span aria-hidden="true">&middot;</span>
                          <span className="text-rose-600">
                            Perlu Perbaikan: {parsedNursesResult.errorCount}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="overflow-x-auto max-h-64">
                    <table className="w-full text-left border-collapse tabular-nums">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                          <th className="p-2.5">Baris</th>
                          <th className="p-2.5">Nama Perawat &amp; NIP</th>
                          <th className="p-2.5">Peran / Hak Akses</th>
                          <th className="p-2.5 text-center">Shift</th>
                          <th className="p-2.5">Username &amp; Sandi</th>
                          <th className="p-2.5">Status Impor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedNursesResult.items.map(item => (
                          <tr key={`${item.rowNumber}-${item.nurse.username}`}>
                            <td className="p-2.5 font-mono text-slate-400">#{item.rowNumber}</td>
                            <td className="p-2.5">
                              <div className="font-bold text-slate-900">
                                {item.nurse.name || '-'}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                NIP: {item.nurse.nip || '-'}
                              </div>
                            </td>
                            <td className="p-2.5 font-semibold text-slate-800">
                              {item.nurse.role === 'kepala_ruangan'
                                ? 'Kepala Ruangan'
                                : item.nurse.role === 'pj_shift'
                                ? 'PJ Shift'
                                : 'Perawat Pelaksana'}
                            </td>
                            <td className="p-2.5 text-center font-medium">
                              {item.nurse.shiftAssigned}
                            </td>
                            <td className="p-2.5 font-mono text-[11px]">
                              <span className="font-bold text-indigo-700">
                                @{item.nurse.username}
                              </span>{' '}
                              <span className="text-slate-400">&middot;</span>{' '}
                              <span className="text-slate-600">{item.nurse.password}</span>
                            </td>
                            <td className="p-2.5 font-semibold">
                              {item.error ? (
                                <span className="text-rose-600">{item.error}</span>
                              ) : item.isDuplicateExisting ? (
                                duplicateStrategy === 'overwrite' ? (
                                  <span className="text-indigo-700">Akan Diperbarui</span>
                                ) : (
                                  <span className="text-amber-700">Dilewati (Sudah Ada)</span>
                                )
                              ) : (
                                <span className="text-emerald-700">Siap Ditambahkan</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          <div className="text-slate-600 font-medium tabular-nums">
            Siap disimpan:{' '}
            <strong className="text-indigo-950 font-black">
              {readyCount} {mode === 'patients' ? 'Data Pasien' : 'Data & Akun Perawat'}
            </strong>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer whitespace-nowrap shrink-0"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmitSave}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                Simpan {readyCount > 0 ? `${readyCount} ` : ''}
                {mode === 'patients' ? 'Data Pasien Sekaligus' : 'Data Perawat Sekaligus'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
