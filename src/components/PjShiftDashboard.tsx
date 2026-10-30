import React, { useState } from 'react';
import {
  ShiftInfo,
  AggregatedCensus,
  MachineOverview,
  ClinicalIndicatorItem,
  OperationalItem,
  SbarData,
  PatientHDSession,
  ShiftSignatures
} from '../types/dialysis.ts';
import { OfficialReportPrintable } from './OfficialReportPrintable.tsx';
import {
  FileText,
  CheckSquare,
  Sparkles,
  Users,
  Printer,
  RefreshCw,
  Save,
  CheckCircle,
  AlertTriangle,
  Droplets,
  ShieldCheck,
  Stethoscope
} from 'lucide-react';
import { generateAutoSbar } from '../utils/hdCalculator.ts';

interface PjShiftDashboardProps {
  shiftInfo: ShiftInfo;
  setShiftInfo: React.Dispatch<React.SetStateAction<ShiftInfo>>;
  census: AggregatedCensus;
  machineOverview: MachineOverview;
  setMachineOverview: React.Dispatch<React.SetStateAction<MachineOverview>>;
  clinicalIndicators: ClinicalIndicatorItem[];
  operationalItems: OperationalItem[];
  setOperationalItems: React.Dispatch<React.SetStateAction<OperationalItem[]>>;
  sbar: SbarData;
  setSbar: React.Dispatch<React.SetStateAction<SbarData>>;
  signatures: ShiftSignatures;
  setSignatures: React.Dispatch<React.SetStateAction<ShiftSignatures>>;
  sessions: PatientHDSession[];
}

export const PjShiftDashboard: React.FC<PjShiftDashboardProps> = ({
  shiftInfo,
  setShiftInfo,
  census,
  machineOverview,
  setMachineOverview,
  clinicalIndicators,
  operationalItems,
  setOperationalItems,
  sbar,
  setSbar,
  signatures,
  setSignatures,
  sessions
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'operational' | 'sbar' | 'staffing'>('preview');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRegenerateSbar = () => {
    const freshSbar = generateAutoSbar(shiftInfo, census, sessions);
    setSbar(freshSbar);
    showToast('Teks narasi SBAR berhasil diperbarui otomatis dari data 24 pasien!');
  };

  const handleSign = (role: 'pjShift' | 'pjBerikutnya' | 'kepalaRuangan') => {
    const now = new Date();
    const formatted = `${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;
    setSignatures(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        signed: true,
        signedAt: formatted
      }
    }));
    showToast(`Pengesahan ${role === 'pjShift' ? 'PJ Shift' : role === 'pjBerikutnya' ? 'PJ Shift Berikutnya' : 'Kepala Ruangan'} tersimpan.`);
  };

  const handleOperationalChange = (id: string, field: keyof OperationalItem, value: string) => {
    setOperationalItems(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs border border-slate-700 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* PJ Shift Control Navigation */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'preview'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Printer className="w-4 h-4" />
            1. Pratinjau Dokumen PDF (1:1 Resmi)
          </button>

          <button
            onClick={() => setActiveTab('operational')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'operational'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            2. Checklist RO, K3 &amp; Operasional (Seksi D)
          </button>

          <button
            onClick={() => setActiveTab('sbar')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'sbar'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            3. Asisten Serah Terima SBAR (Seksi E)
          </button>

          <button
            onClick={() => setActiveTab('staffing')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'staffing'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            4. Ketenagaan &amp; Pengesahan (Seksi A &amp; F)
          </button>
        </div>

        {activeTab === 'preview' && (
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            Cetak PDF
          </button>
        )}
      </div>

      {/* TAB 1: PREVIEW DOKUMEN 1:1 */}
      {activeTab === 'preview' && (
        <div className="space-y-4">
          <OfficialReportPrintable
            shiftInfo={shiftInfo}
            census={census}
            machineOverview={machineOverview}
            clinicalIndicators={clinicalIndicators}
            operationalItems={operationalItems}
            sbar={sbar}
            signatures={signatures}
            onPrint={() => window.print()}
            onSign={handleSign}
          />
        </div>
      )}

      {/* TAB 2: CHECKLIST OPERASIONAL, RO WATER & K3 (SEKSI D) */}
      {activeTab === 'operational' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-blue-600" />
                Form Pengawasan Operasional, Water Treatment RO &amp; K3 (Seksi D)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluasi mutu non-medis unit hemodialisa shift ini. Data ini langsung terangkum pada tabel D di lembar PDF.
              </p>
            </div>
            <button
              onClick={() => showToast('Data pengawasan operasional tersimpan.')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 shrink-0"
            >
              <Save className="w-4 h-4" />
              Simpan Perubahan
            </button>
          </div>

          <div className="space-y-4">
            {operationalItems.map(item => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="font-bold text-xs text-slate-900">{item.item}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">Status Kepatuhan:</span>
                    <input
                      type="text"
                      value={item.statusKepatuhan}
                      onChange={e => handleOperationalChange(item.id, 'statusKepatuhan', e.target.value)}
                      className="text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-emerald-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Parameter Uji / Pengawasan
                    </label>
                    <input
                      type="text"
                      value={item.parameterUji}
                      onChange={e => handleOperationalChange(item.id, 'parameterUji', e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Hasil Observasi Shift
                    </label>
                    <input
                      type="text"
                      value={item.hasilObservasi}
                      onChange={e => handleOperationalChange(item.id, 'hasilObservasi', e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-900"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ASISTEN SERAH TERIMA SBAR (SEKSI E) */}
      {activeTab === 'sbar' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                Asisten Serah Terima Shift Model SBAR (Seksi E)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Format standar handover klinis KARS: Situation, Background, Assessment, dan Recommendation.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRegenerateSbar}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold rounded-xl shadow-2xs flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Muat Ulang dari Sensus 24 Pasien
              </button>
              <button
                onClick={() => showToast('Teks SBAR tersimpan.')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Simpan
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Situation */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                  1. SITUATION (S) - Gambaran Situasi Shift
                </label>
                <span className="text-[11px] text-slate-400">Jumlah pasien dilayani, mesin aktif, highlight komplikasi</span>
              </div>
              <textarea
                rows={3}
                value={sbar.situation}
                onChange={e => setSbar({ ...sbar, situation: e.target.value })}
                className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white leading-relaxed"
              />
            </div>

            {/* Background */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                  2. BACKGROUND (B) - Riwayat Kasus Pasien
                </label>
                <span className="text-[11px] text-slate-400">Data klinis pasien hipotensi, kram, atau under-UF</span>
              </div>
              <textarea
                rows={3}
                value={sbar.background}
                onChange={e => setSbar({ ...sbar, background: e.target.value })}
                className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white leading-relaxed"
              />
            </div>

            {/* Assessment */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                  3. ASSESSMENT (A) - Penilaian &amp; Hasil Akhir
                </label>
                <span className="text-[11px] text-slate-400">Capaian UF aktual, respon hemodialisis, stabilitas tensi</span>
              </div>
              <textarea
                rows={3}
                value={sbar.assessment}
                onChange={e => setSbar({ ...sbar, assessment: e.target.value })}
                className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white leading-relaxed"
              />
            </div>

            {/* Recommendation */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                  4. RECOMMENDATION (R) - Rekomendasi Shift Berikutnya
                </label>
                <span className="text-[11px] text-slate-400">Poin penting persiapan priming mesin, stok dialiser, uji RO</span>
              </div>
              <textarea
                rows={4}
                value={sbar.recommendation}
                onChange={e => setSbar({ ...sbar, recommendation: e.target.value })}
                className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: KETENAGAAN & PENGESAHAN (SEKSI A & F) */}
      {activeTab === 'staffing' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Manajemen Shift, Ketenagaan &amp; Pengesahan Digital (Seksi A &amp; F)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengaturan pejabat dinas, penghitungan rasio perawat:pasien standar PERNEFRI, dan validasi tanda tangan.
              </p>
            </div>
            <button
              onClick={() => showToast('Data ketenagaan shift tersimpan.')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Simpan Profil Shift
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Shift & Hospital Info */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Informasi Shift &amp; DPJP
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Hari &amp; Tanggal</label>
                  <input
                    type="text"
                    value={shiftInfo.date}
                    onChange={e => setShiftInfo({ ...shiftInfo, date: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Shift Dinas &amp; Jam</label>
                  <input
                    type="text"
                    value={shiftInfo.shiftHours}
                    onChange={e => setShiftInfo({ ...shiftInfo, shiftHours: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Dokter DPJP Unit HD</label>
                  <input
                    type="text"
                    value={shiftInfo.dokterDpjp}
                    onChange={e => setShiftInfo({ ...shiftInfo, dokterDpjp: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Dokter Jaga Ruangan</label>
                  <input
                    type="text"
                    value={shiftInfo.dokterJaga}
                    onChange={e => setShiftInfo({ ...shiftInfo, dokterJaga: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Manpower & Ratio */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Ketenagaan &amp; Rasio Asuhan
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Jumlah Perawat Dinas</label>
                  <input
                    type="text"
                    value={shiftInfo.detailPerawat}
                    onChange={e => setShiftInfo({ ...shiftInfo, detailPerawat: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Rasio Perawat : Pasien</label>
                  <input
                    type="text"
                    value={shiftInfo.perawatRatio}
                    onChange={e => setShiftInfo({ ...shiftInfo, perawatRatio: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold text-emerald-800"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] text-slate-500 mb-1">Tenaga Pendukung Dinas</label>
                  <input
                    type="text"
                    value={shiftInfo.tenagaPendukung}
                    onChange={e => setShiftInfo({ ...shiftInfo, tenagaPendukung: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Signatures Status */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Status Pengesahan &amp; Tanda Tangan Digital 3 Pihak (Seksi F)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* PJ Shift */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="font-bold text-slate-800">PJ Shift Yang Menyerahkan</div>
                  <div className="text-slate-600 mt-0.5">{shiftInfo.pjShift}</div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                  {signatures.pjShift.signed ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Terverifikasi
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSign('pjShift')}
                      className="text-xs text-blue-600 hover:text-blue-800 font-bold"
                    >
                      Tanda Tangani Sekarang
                    </button>
                  )}
                  <span className="text-[10px] text-slate-400">{signatures.pjShift.signedAt || '-'}</span>
                </div>
              </div>

              {/* PJ Shift Berikutnya */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="font-bold text-slate-800">PJ Shift Yang Menerima</div>
                  <div className="text-slate-600 mt-0.5">{shiftInfo.pjShiftBerikutnya}</div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                  {signatures.pjBerikutnya.signed ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Terverifikasi
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSign('pjBerikutnya')}
                      className="text-xs text-blue-600 hover:text-blue-800 font-bold"
                    >
                      Tanda Tangani Sekarang
                    </button>
                  )}
                  <span className="text-[10px] text-slate-400">{signatures.pjBerikutnya.signedAt || '-'}</span>
                </div>
              </div>

              {/* Kepala Ruangan */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="font-bold text-slate-800">Kepala Ruangan HD</div>
                  <div className="text-slate-600 mt-0.5">{shiftInfo.kepalaRuangan}</div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                  {signatures.kepalaRuangan.signed ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Terverifikasi
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSign('kepalaRuangan')}
                      className="text-xs text-blue-600 hover:text-blue-800 font-bold"
                    >
                      Tanda Tangani Sekarang
                    </button>
                  )}
                  <span className="text-[10px] text-slate-400">{signatures.kepalaRuangan.signedAt || '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
