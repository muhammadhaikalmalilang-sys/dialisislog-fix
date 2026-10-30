import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Smartphone,
  Laptop,
  Copy,
  Check,
  Download,
  Info,
  ShieldCheck,
  Send,
  Sparkles,
  Wifi,
  QrCode,
  Printer,
  ExternalLink
} from 'lucide-react';

interface DeviceAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeviceAccessModal: React.FC<DeviceAccessModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'qr' | 'hp' | 'laptop' | 'sync'>('qr');
  const [copied, setCopied] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [qrLoaded, setQrLoaded] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  // App URL: automatically uses active window origin, or fallback to the deployment shared URL
  const appUrl =
    typeof window !== 'undefined' && window.location.origin && window.location.origin.startsWith('http')
      ? window.location.origin
      : 'https://ais-pre-p5qdxg3d45r22i5ontms2z-427599456377.asia-southeast1.run.app';

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=12&format=svg&data=${encodeURIComponent(
    appUrl
  )}`;

  useEffect(() => {
    // Listen for install prompt on Android Chrome
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePromptInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice?.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  const handlePrintPoster = () => {
    window.print();
  };

  const shareText = `Halo Rekan-rekan Perawat Unit Hemodialisa RS Happy Land,\n\nBerikut tautan untuk mengakses Sistem Logbook Hemodialisa (DialisisLog) dari HP atau Laptop/PC masing-masing:\n\n${appUrl}\n\nCara pasang di HP:\n1. Buka link di atas di Chrome (Android) atau Safari (iPhone)\n2. Pilih "Tambahkan ke Layar Utama" (Add to Home Screen)\n3. Ikon DialisisLog akan muncul di HP dan dapat langsung digunakan untuk mengisi logbook & checklist tindakan.`;

  const waShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

  return (
    <>
      {/* =================================================================== */}
      {/* PRINT-ONLY POSTER FOR NURSE STATION TENT-CARD                       */}
      {/* =================================================================== */}
      <div className="hidden print:block p-8 bg-white text-slate-900 max-w-xl mx-auto font-sans">
        <div className="border-4 border-[#1f6a96] rounded-2xl p-8 text-center space-y-5">
          <div className="border-b-2 border-slate-300 pb-4">
            <h1 className="text-2xl font-black text-[#154f7a] tracking-tight uppercase">
              RS Happy Land Medical Centre
            </h1>
            <p className="text-sm font-bold text-slate-600 uppercase tracking-widest mt-0.5">
              Instalasi Hemodialisa (Dialisis Unit)
            </p>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-900">
              AKSES LOGBOOK HEMODIALISA
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Scan QR Code ini menggunakan kamera HP untuk membuka sistem di smartphone masing-masing
            </p>
          </div>

          {/* QR Code Container */}
          <div className="inline-block p-4 bg-white border-2 border-slate-300 rounded-2xl shadow-sm">
            <img
              src={qrImageUrl}
              alt="QR Code Akses Sistem DialisisLog"
              className="w-56 h-56 mx-auto object-contain"
            />
          </div>

          {/* URL text */}
          <div className="bg-slate-100 rounded-xl p-3 font-mono text-xs font-bold text-slate-800 break-all border border-slate-200">
            {appUrl}
          </div>

          {/* 3 Steps */}
          <div className="text-left text-xs space-y-1.5 bg-sky-50 rounded-xl p-4 border border-sky-200">
            <p className="font-bold text-sky-950 mb-1">Cara Mudah Menggunakan di HP:</p>
            <p className="text-sky-900">
              <strong>1. Android:</strong> Buka tautan via Chrome &gt; ketuk titik 3 di kanan atas &gt; pilih <em>"Tambahkan ke Layar Utama"</em>.
            </p>
            <p className="text-sky-900">
              <strong>2. iPhone/iPad:</strong> Buka via Safari &gt; ketuk ikon Share &gt; pilih <em>"Tambahkan ke Layar Utama"</em>.
            </p>
            <p className="text-sky-900">
              <strong>3. Login:</strong> Masuk dengan NIP dan kata sandi Anda masing-masing.
            </p>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* INTERACTIVE MODAL (SCREEN ONLY)                                     */}
      {/* =================================================================== */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto print:hidden">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0d395f] via-[#154f7a] to-[#1f6a96] text-white p-5 sm:p-6 flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-sky-200 text-xs font-semibold border border-white/20 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-sky-300" />
                <span>Akses Multi-Device &amp; Smartphone</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white leading-snug">
                Buka DialisisLog di HP &amp; Laptop Masing-Masing Staff
              </h2>
              <p className="text-xs text-sky-100/90 mt-1 max-w-xl">
                Sistem web berbasis Progressive Web App (PWA) yang dapat dibuka langsung di smartphone Android, iPhone, tablet, maupun laptop/PC tanpa perlu download dari app store.
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Tutup panduan"
              className="p-1.5 rounded-xl text-sky-200 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* URL Card & Share Actions */}
          <div className="p-4 sm:p-5 bg-sky-50/80 border-b border-sky-100">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Tautan / Link Akses Sistem:
              </label>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-300/80">
                Online &amp; Aktif 24 Jam
              </span>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 min-w-0 bg-white border border-sky-200 rounded-xl px-3.5 py-2.5 flex items-center justify-between shadow-2xs">
                <span className="text-xs font-mono font-semibold text-slate-800 truncate select-all">
                  {appUrl}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#1f6a96] hover:bg-[#154f7a] text-white'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Salin Link</span>
                    </>
                  )}
                </button>

                <a
                  href={waShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  title="Bagikan ke WhatsApp Group Hemodialisa"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim ke WA</span>
                </a>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50/80 px-4 sm:px-6 gap-2 pt-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('qr')}
              className={`flex items-center gap-1.5 py-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'qr'
                  ? 'border-[#1f6a96] text-[#1f6a96]'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Scan QR Code HP</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('hp')}
              className={`flex items-center gap-1.5 py-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'hp'
                  ? 'border-[#1f6a96] text-[#1f6a96]'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Cara Pasang di HP</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('laptop')}
              className={`flex items-center gap-1.5 py-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'laptop'
                  ? 'border-[#1f6a96] text-[#1f6a96]'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Laptop className="w-4 h-4" />
              <span>Cara di Laptop / PC</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sync')}
              className={`flex items-center gap-1.5 py-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'sync'
                  ? 'border-[#1f6a96] text-[#1f6a96]'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wifi className="w-4 h-4" />
              <span>Sinkronisasi Data</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-5 sm:p-6 max-h-[58vh] overflow-y-auto space-y-4 text-xs text-slate-700">
            {/* TAB: QR CODE */}
            {activeTab === 'qr' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-sky-50/60 rounded-2xl border border-sky-200">
                  <div className="relative shrink-0 bg-white p-3 rounded-2xl border-2 border-sky-300 shadow-md">
                    <img
                      src={qrImageUrl}
                      alt="QR Code DialisisLog"
                      className="w-44 h-44 object-contain rounded-lg"
                      onLoad={() => setQrLoaded(true)}
                    />
                    <div className="text-center mt-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Scan dengan Kamera HP
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 flex-1 text-center sm:text-left">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center justify-center sm:justify-start gap-1.5">
                        <Smartphone className="w-4 h-4 text-[#1f6a96]" />
                        <span>Cara Tercepat: Scan Langsung</span>
                      </h4>
                      <p className="text-slate-600 mt-1 leading-relaxed text-[11.5px]">
                        Buka aplikasi <strong>Kamera</strong> di HP Android atau iPhone rekan-rekan, arahkan lensa kamera ke kotak QR Code ini, lalu ketuk pop-up tautan yang muncul di layar.
                      </p>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-left space-y-1">
                      <div className="flex items-center gap-1 text-[#154f7a] font-bold text-[11px]">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Bisa Digunakan di Samping Bed Pasien:</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-snug">
                        Perawat pelaksana dapat langsung mendokumentasikan observasi TTV intra-HD, ultrafiltrasi, dan checklist tindakan tanpa harus bolak-balik ke nurse station.
                      </p>
                    </div>

                    <div className="pt-1 flex flex-wrap gap-2 justify-center sm:justify-start">
                      <button
                        type="button"
                        onClick={handlePrintPoster}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs cursor-pointer shadow-xs"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Cetak Poster QR untuk Nurse Station</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: HP ANDROID & IPHONE */}
            {activeTab === 'hp' && (
              <div className="space-y-4">
                {deferredPrompt && (
                  <div className="p-3.5 rounded-xl bg-sky-100 border border-sky-300 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Download className="w-5 h-5 text-[#1f6a96] shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          Browser Anda Mendukung Instalasi Langsung
                        </p>
                        <p className="text-[11px] text-slate-600">
                          Pasang langsung ke layar utama HP dalam 1 klik tanpa masuk Play Store.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handlePromptInstall}
                      className="px-3 py-1.5 rounded-lg bg-[#1f6a96] hover:bg-[#154f7a] text-white text-xs font-bold shrink-0 cursor-pointer"
                    >
                      Instal Sekarang
                    </button>
                  </div>
                )}

                {/* Android Guide */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <div className="flex items-center gap-2 mb-2 font-bold text-slate-900 text-[13px]">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 inline-flex items-center justify-center text-xs font-black">
                      A
                    </span>
                    <span>Untuk HP Android (Google Chrome / Samsung Internet)</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-2 text-slate-600 pl-1 leading-relaxed">
                    <li>
                      Buka tautan <strong>{appUrl}</strong> di Google Chrome.
                    </li>
                    <li>
                      Ketuk <strong>ikon titik tiga (⋮)</strong> di pojok kanan atas browser.
                    </li>
                    <li>
                      Pilih menu <strong>"Tambahkan ke Layar Utama"</strong> atau <strong>"Instal Aplikasi"</strong>.
                    </li>
                    <li>
                      Ketuk <strong>Instal / Tambah</strong>. Ikon <strong>DialisisLog</strong> akan langsung muncul di halaman beranda HP Anda layaknya aplikasi Play Store, dan dapat dibuka fullscreen tanpa address bar.
                    </li>
                  </ol>
                </div>

                {/* iOS Guide */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <div className="flex items-center gap-2 mb-2 font-bold text-slate-900 text-[13px]">
                    <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-800 inline-flex items-center justify-center text-xs font-black">
                      B
                    </span>
                    <span>Untuk iPhone / iPad (Apple Safari)</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-2 text-slate-600 pl-1 leading-relaxed">
                    <li>
                      Buka tautan di browser bawaan <strong>Safari</strong>.
                    </li>
                    <li>
                      Ketuk tombol <strong>Bagikan (Share)</strong> — ikon kotak dengan panah ke atas di bilah bawah Safari.
                    </li>
                    <li>
                      Gulir ke bawah dan ketuk opsi <strong>"Tambahkan ke Layar Utama" (Add to Home Screen)</strong>.
                    </li>
                    <li>
                      Ketuk <strong>Tambah (Add)</strong> di pojok kanan atas. Aplikasi akan otomatis tersimpan di home screen iPhone Anda.
                    </li>
                  </ol>
                </div>
              </div>
            )}

            {/* TAB: LAPTOP / PC */}
            {activeTab === 'laptop' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <div className="flex items-center gap-2 mb-2 font-bold text-slate-900 text-[13px]">
                    <Laptop className="w-4 h-4 text-[#1f6a96]" />
                    <span>Membuka di Laptop atau PC Ruang Hemodialisa</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-2 text-slate-600 pl-1 leading-relaxed">
                    <li>
                      Buka peramban di komputer nurse station (<strong>Google Chrome, Microsoft Edge, atau Mozilla Firefox</strong>).
                    </li>
                    <li>
                      Ketik atau tempelkan link: <strong className="select-all font-mono text-slate-800">{appUrl}</strong> lalu tekan Enter.
                    </li>
                    <li>
                      <strong>Simpan di Bookmark</strong>: Tekan tombol keyboard <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[11px]">Ctrl + D</kbd> (atau <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[11px]">Cmd + D</kbd> di Mac) agar tombol pintas selalu ada di bagian atas browser.
                    </li>
                    <li>
                      <strong>Instal sebagai Desktop App (Opsional)</strong>: Di pojok kanan address bar Chrome/Edge, klik ikon komputer/instal kecil bertuliskan <em>"Install DialisisLog"</em> agar aplikasi dapat dibuka dari desktop Windows/Mac seperti software mandiri.
                    </li>
                  </ol>
                </div>

                {/* Login Credentials reminder */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <p className="font-bold text-slate-900 text-xs mb-1.5 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Akun Login Staff:</span>
                  </p>
                  <p className="text-[11px] text-slate-600 mb-2">
                    Staff dapat masuk dengan <strong>NIP</strong> atau <strong>Email Rumah Sakit</strong> terdaftar:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-0.5">
                      <strong className="text-slate-800">Perawat Pelaksana:</strong>
                      <p className="font-mono text-slate-800">nur.amalia@happyland.co.id</p>
                      <p className="font-mono text-slate-800">bambang.s@happyland.co.id</p>
                      <p className="text-[10px] text-slate-500">Kata sandi default: 12345</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-0.5">
                      <strong className="text-slate-800">PJ Shift &amp; KaRu:</strong>
                      <p className="font-mono text-slate-800">dewi.lestari@happyland.co.id (PJ)</p>
                      <p className="font-mono text-slate-800">siti.rahmawati@happyland.co.id (KaRu)</p>
                      <p className="text-[10px] text-slate-500">Kata sandi default: 12345</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SINKRONISASI DATA ANTAR-DEVICE */}
            {activeTab === 'sync' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5 text-emerald-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-emerald-950 text-xs uppercase tracking-wide">
                          Status Database Cloud: AKTIF &amp; REAL-TIME
                        </h4>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider">
                          Google Cloud Firestore
                        </span>
                      </div>
                      <p className="text-emerald-900 leading-relaxed text-[11.5px]">
                        <strong>Sinkronisasi Real-Time Otomatis:</strong> Setiap perawat yang menginput asuhan hemodialisa atau observasi intra-HD di HP di samping bed pasien, datanya <strong>langsung muncul otomatis seketika di komputer Nurse Station PJ Shift / Kepala Ruangan</strong> tanpa perlu transfer data manual.
                      </p>
                      <p className="text-emerald-900 leading-relaxed text-[11.5px]">
                        <strong>Cadangan Offline Pintar:</strong> Jika jaringan internet Wi-Fi RS sempat terputus, data tetap tersimpan aman di HP dan akan otomatis tersinkronisasi kembali begitu sinyal terhubung.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h4 className="font-bold text-slate-900 text-xs mb-2">
                    Rekomendasi Praktik Efisien di Ruangan:
                  </h4>
                  <ul className="space-y-1.5 text-slate-600 pl-4 list-disc text-[11.5px]">
                    <li>
                      <strong>Di Nurse Station:</strong> Buka di PC utama unit HD untuk dashboard monitoring mesin, sensus pasien harian, dan verifikasi PJ Shift.
                    </li>
                    <li>
                      <strong>Di Bed Pasien:</strong> Buka di smartphone masing-masing perawat pelaksana saat melakukan observasi jam ke-1 hingga jam ke-5 intra-HD.
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500 text-center sm:text-left">
              Dapat diakses 24 jam dengan koneksi WiFi RS maupun paket data seluler.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer shadow-2xs"
              >
                {copied ? 'Tersalin' : 'Salin Tautan'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-[#1f6a96] hover:bg-[#154f7a] text-white text-xs font-bold cursor-pointer shadow-2xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
