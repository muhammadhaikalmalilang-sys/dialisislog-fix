import React from 'react';
import {
  PatientHDSession,
  ShiftInfo,
  MasterPatient,
  MasterNurse,
  MasterBed,
  MasterDoctor,
  SystemAccessRole
} from '../types/dialysis.ts';
import {
  Logbook5ButtonsView,
  ManagedPatient,
  PjVerificationStatus
} from './Logbook5ButtonsView.tsx';
import { LoginUserData } from './LoginPage.tsx';
import { indonesianDateLabelToIso } from '../utils/dateHelpers.ts';
import type { PatientLogbookClinicalDetails } from '../utils/logbookClinicalHelpers.ts';
import type { NurseLogbookCloudData } from '../services/firebase.ts';

interface PelaksanaViewProps {
  sessions?: PatientHDSession[];
  cloudNurseLogbooks?: NurseLogbookCloudData[];
  onOpenSessionModal?: (
    session?: PatientHDSession,
    initialTab?: 'bagian1' | 'bagian2' | 'bagian3' | 'bagian4' | 'bagian5'
  ) => void;
  onQuickToggleComplete?: (id: string) => void;
  onOpenMasterModal?: () => void;
  shiftInfo?: ShiftInfo;
  masterPatients?: MasterPatient[];
  masterNurses?: MasterNurse[];
  masterBeds?: MasterBed[];
  masterDoctors?: MasterDoctor[];
  loggedInUser?: LoginUserData | null;
  userRole?: SystemAccessRole;
  onSyncNurseSessions?: (
    nurseName: string,
    managedPatients: ManagedPatient[],
    verification: {
      status: PjVerificationStatus;
      verifiedAt?: string;
      verifiedBy?: string;
      verifiedByRole?: string;
      verifierNotes?: string;
      date?: string;
      sessionDate?: string;
      shift?: 'Pagi' | 'Siang';
      clinicalDetails?: Record<string, PatientLogbookClinicalDetails>;
      patientStatuses?: Record<string, Record<string, boolean>>;
      perPatientStatuses?: Record<
        string,
        {
          status: PjVerificationStatus;
          submittedAt?: string;
          submittedEpoch?: number;
          verifiedAt?: string;
          verifiedBy?: string;
          verifiedByRole?: string;
          verifierNotes?: string;
          revisionRequested?: boolean;
          revisionRequestedAt?: string;
          revisionRequestedBy?: string;
          revisionRequestedByRole?: string;
          revisionEpoch?: number;
        }
      >;
    }
  ) => void;
  onShiftChange?: (shift: 'Pagi' | 'Siang') => void;
  onDateChange?: (isoDate: string) => void;
  isCustomDate?: boolean;
  onResetDateToToday?: () => void;
  onNavigateToVerifikasi?: () => void;
  onNavigateToRiwayat?: () => void;
}

export const PelaksanaView: React.FC<PelaksanaViewProps> = ({
  sessions = [],
  cloudNurseLogbooks = [],
  shiftInfo,
  masterPatients = [],
  masterNurses = [],
  masterBeds = [],
  masterDoctors = [],
  loggedInUser,
  userRole = 'perawat_pelaksana',
  onSyncNurseSessions,
  onShiftChange,
  onDateChange,
  isCustomDate,
  onResetDateToToday,
  onNavigateToVerifikasi,
  onNavigateToRiwayat
}) => {
  const activeDateIso = shiftInfo?.date ? indonesianDateLabelToIso(shiftInfo.date) : '';
  return (
    <div className="w-full">
      <Logbook5ButtonsView
        key={`${userRole}-${loggedInUser?.name || 'default'}-${activeDateIso}`}
        sessions={sessions}
        cloudNurseLogbooks={cloudNurseLogbooks}
        shiftInfo={shiftInfo}
        masterPatients={masterPatients}
        masterNurses={masterNurses}
        masterBeds={masterBeds}
        masterDoctors={masterDoctors}
        loggedInUser={loggedInUser}
        userRole={userRole}
        onSyncNurseSessions={onSyncNurseSessions}
        onShiftChange={onShiftChange}
        onDateChange={onDateChange}
        isCustomDate={isCustomDate}
        onResetDateToToday={onResetDateToToday}
        onNavigateToVerifikasi={onNavigateToVerifikasi}
        onNavigateToRiwayat={onNavigateToRiwayat}
      />
    </div>
  );
};
