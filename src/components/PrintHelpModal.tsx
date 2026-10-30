import React, { useState, useEffect } from 'react';
import { Printer, ExternalLink, X, FileCheck, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { isRunningInIframe } from '../utils/printHelpers.ts';

interface PrintHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle?: string;
  errorMessage?: string;
}

export const PrintHelpModal: React.FC<PrintHelpModalProps> = ({
  isOpen,
  onClose,
  documentTitle,
  errorMessage
}) => {
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const inIframe = isRunningInIframe();

  const handleRetryNativePrint = () => {
    try {
      window.focus();
      window.print();
    } catch (e) {
      console.warn('Native print retry failed:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150 print:hidden">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden text-slate-800">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#19588f] to-[#144775] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/15 text-white">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                Petunjuk Cetak &amp; Simpan PDF
              </h3>
              <p className="text-[11.5px] text-blue-100 mt-0.5">
                {documentTitle || 'Dokumen Akreditasi Standar KARS & PERNEFRI'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 text-xs">
          {inIframe ? (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1 text-[11.5px] leading-relaxed">
                <strong className="text-amber-900 block font-bold">
                  Aplikasi Berjalan di Pratinjau iFrame
                </strong>
                <p>
                  Peramban (Chrome / Edge / Safari) secara otomatis membatasi dialog cetak sistem (
                  <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono">window.print()</code>)
                  di dalam bingkai iFrame karena aturan isolasi keamanan peramban.
                </p>
                {errorMessage && (
                  <p className="font-mono text-[10.5px] text-amber-800 bg-amber-100/70 p-1.5 rounded">
                    {errorMessage}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <div className="space-y-1 text-[11.5px] leading-relaxed">
                <strong className="text-blue-900 block font-bold">
                  Cara Menyimpan Sebagai File PDF
                </strong>
                <p>
                  Pada jendela cetak yang muncul, ubah pilihan printer menjadi <strong>&quot;Save as PDF / Simpan sebagai PDF&quot;</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Step by step guide */}
          <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-[#19588f]" />
              <span>Langkah Mencetak / Simpan PDF Dokumen Resmi:</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-700 text-[11.5px] leading-relaxed">
              <li>
                Buka aplikasi di <strong>Tab Baru (Standalone)</strong> agar bebas dari batasan iFrame.
              </li>
              <li>
                Pada menu/laporan yang diinginkan, klik tombol <strong>&quot;Cetak / Simpan PDF&quot;</strong> (atau tekan kombinasi tombol <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded shadow-2xs font-mono text-[10px]">Ctrl + P</kbd> / <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded shadow-2xs font-mono text-[10px]">Cmd + P</kbd>).
              </li>
              <li>
                Pada opsi <strong>Tujuan / Destination</strong> printer, pilih <strong>&quot;Save as PDF&quot; / &quot;Simpan sebagai PDF&quot;</strong>.
              </li>
              <li>
                Ukuran kertas (<strong>A4</strong>) dan orientasi (<strong>Portrait / Landscape</strong>) telah diatur otomatis proporsional 1:1 siap akreditasi.
              </li>
            </ol>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleRetryNativePrint}
              className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Coba Cetak Ulang Sekarang
            </button>

            {currentUrl && (
              <a
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#19588f] hover:bg-[#144775] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <span>Buka di Tab Baru (Standalone)</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
