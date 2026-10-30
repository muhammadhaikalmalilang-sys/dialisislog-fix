import React from 'react';
import { OfficialNurseLogbookMonth } from '../types/dialysis.ts';
import {
  OFFICIAL_LOGBOOK_ITEMS,
  computeDailyActivitiesCount,
  computeItemTotalAndPct
} from '../data/officialPelaksanaLogbookData.ts';
import { formatStaffRoleTitle } from '../utils/monthlyRecapHelpers.ts';
import { printDocumentWithOrientation } from '../utils/printHelpers.ts';
import { Printer, X, ShieldCheck } from 'lucide-react';

interface OfficialPelaksanaLogbookPrintableProps {
  logbook: OfficialNurseLogbookMonth;
  onClose?: () => void;
}

export const OfficialPelaksanaLogbookPrintable: React.FC<OfficialPelaksanaLogbookPrintableProps> = ({
  logbook,
  onClose
}) => {
  const daysArray = Array.from({ length: 31 }, (_, i) => i + 1);
  const hasNumericScores = Boolean(logbook.dailyScores);
  const verifiedDays = logbook.verifiedDays || [];
  const dailyPatCounts = logbook.dailyVerifiedPatientCounts || new Array(31).fill(0);

  // Group items by bagian
  const bagianGroups = [
    {
      bagianNum: 1,
      title: 'BAGIAN I: KESIAPAN FASILITAS RUANGAN HEMODIALISIS & SISTEM WATER TREATMENT (RO) — [NILAI MAKS. 1 / HARI]',
      items: OFFICIAL_LOGBOOK_ITEMS.filter((it) => it.bagian === 1)
    },
    {
      bagianNum: 2,
      title: 'BAGIAN II: PERSIAPAN PERAWAT, PERALATAN, MESIN HD & ALAT KESEHATAN (PRE-HD) — [NILAI SESUAI PASIEN KELOLAAN]',
      items: OFFICIAL_LOGBOOK_ITEMS.filter((it) => it.bagian === 2)
    },
    {
      bagianNum: 3,
      title: 'BAGIAN III: IDENTIFIKASI PASIEN, PENGKAJIAN PRE-HD & KESELAMATAN PASIEN (PATIENT SAFETY) — [NILAI SESUAI PASIEN KELOLAAN]',
      items: OFFICIAL_LOGBOOK_ITEMS.filter((it) => it.bagian === 3)
    },
    {
      bagianNum: 4,
      title: 'BAGIAN IV: MONITORING INTRA-HD & PENCEGAHAN INSIDEN KESELAMATAN PASIEN (IKP) — [NILAI SESUAI PASIEN KELOLAAN]',
      items: OFFICIAL_LOGBOOK_ITEMS.filter((it) => it.bagian === 4)
    },
    {
      bagianNum: 5,
      title: 'BAGIAN V: EDUKASI TERSTRUKTUR KEPADA PASIEN & KELUARGA (DIET, CAIRAN, KEBERSIHAN DIRI) — [NILAI SESUAI PASIEN KELOLAAN]',
      items: OFFICIAL_LOGBOOK_ITEMS.filter((it) => it.bagian === 5)
    },
    {
      bagianNum: 6,
      title: 'BAGIAN VI: TERMINASI AMAN, EVALUASI POST-HD, DISINFEKSI MESIN & PENDOKUMENTASIAN — [NILAI SESUAI PASIEN KELOLAAN]',
      items: OFFICIAL_LOGBOOK_ITEMS.filter((it) => it.bagian === 6)
    }
  ];

  const verifiedDaysCount = hasNumericScores
    ? verifiedDays.filter(Boolean).length
    : daysArray.reduce((acc, _, dayIdx) => {
        const dailyCount = computeDailyActivitiesCount(logbook.checks, dayIdx);
        return dailyCount > 0 ? acc + 1 : acc;
      }, 0) || 20;

  const totalVerifiedPatients = dailyPatCounts.reduce((a, b) => a + b, 0);

  let grandTotalValue = 0;
  let grandMaxPossible = 0;

  if (hasNumericScores && logbook.dailyScores) {
    OFFICIAL_LOGBOOK_ITEMS.forEach((it) => {
      const arr = logbook.dailyScores![it.code] || [];
      const rowSum = arr.reduce<number>((s, v) => s + (typeof v === 'number' ? v : 0), 0);
      const rowMax =
        typeof logbook.itemMaxScores?.[it.code] === 'number'
          ? logbook.itemMaxScores[it.code]
          : it.bagian === 1
          ? verifiedDaysCount
          : totalVerifiedPatients;
      grandTotalValue += rowSum;
      grandMaxPossible += rowMax;
    });
  } else {
    OFFICIAL_LOGBOOK_ITEMS.forEach((it) => {
      const arr = logbook.checks[it.code] || [];
      grandTotalValue += arr.filter(Boolean).length;
    });
    grandMaxPossible = OFFICIAL_LOGBOOK_ITEMS.length * verifiedDaysCount;
  }

  const overallCompliancePct =
    grandMaxPossible > 0 ? Number(((grandTotalValue / grandMaxPossible) * 100).toFixed(1)) : 0;

  const staffRoleTitle = formatStaffRoleTitle(logbook.nurseRole);

  const handlePrint = () => {
    const docTitle = `Logbook_Bulanan_${logbook.nurseName}_${logbook.monthYear}`;
    printDocumentWithOrientation(true, docTitle); // A4 Landscape for 31-day matrix
  };

  return (
    <div className="w-full">
      {/* Top action toolbar (hidden on print) */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white px-4 py-2.5 rounded-xl print:hidden">
        <div className="flex items-center gap-2 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">
            Format Cetak A4 Landscape — Rekapitulasi Bulanan Logbook Terverifikasi ({staffRoleTitle})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-xs"
            title="Cetak atau simpan lembar logbook bulanan resmi sebagai PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak / Simpan PDF</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Printable Sheet Canvas */}
      <div
        id="printable-official-logbook"
        className="printable-sheet bg-white text-slate-900 p-4 md:p-6 rounded-lg shadow-md print:shadow-none print:p-1 border border-slate-300 print:border-none text-[9.5px] leading-tight overflow-x-auto tabular-nums"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* Header Title */}
        <div className="text-center mb-2.5 pb-2 border-b-2 border-slate-900">
          <h1 className="text-xs md:text-sm font-black tracking-tight text-slate-950 uppercase">
            LAPORAN BULANAN REKAPITULASI LOGBOOK ASUHAN KEPERAWATAN HEMODIALISIS
          </h1>
          <div className="text-[10px] md:text-xs font-bold text-blue-950 uppercase tracking-wide mt-0.5">
            UNIT PELAYANAN HEMODIALISIS (DIALYSIS CENTER) - RS HAPPY LAND MEDICAL CENTRE
          </div>
        </div>

        {/* Metadata Top Table */}
        <div className="grid grid-cols-2 gap-x-4 mb-2 text-[10px]">
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className="w-32 font-bold py-0.5">Nama Staff</td>
                <td className="py-0.5">
                  : <span className="font-semibold text-blue-950">{logbook.nurseName}</span>
                </td>
              </tr>
              <tr>
                <td className="font-bold py-0.5">NIP / NIRA</td>
                <td className="py-0.5">: {logbook.nipNira}</td>
              </tr>
              <tr>
                <td className="font-bold py-0.5">Jabatan / Akses</td>
                <td className="py-0.5">: {staffRoleTitle} — {logbook.unitName}</td>
              </tr>
            </tbody>
          </table>
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className="w-32 font-bold py-0.5">Bulan / Tahun</td>
                <td className="py-0.5">
                  : <span className="font-semibold">{logbook.monthYear}</span>
                </td>
              </tr>
              <tr>
                <td className="font-bold py-0.5">Rekap Terverifikasi</td>
                <td className="py-0.5">
                  : {verifiedDaysCount} Hari Kerja &middot; {totalVerifiedPatients} Pasien Kelolaan Disahkan
                </td>
              </tr>
              <tr>
                <td className="font-bold py-0.5">Shift Dominan</td>
                <td className="py-0.5">
                  :{' '}
                  <span className="font-semibold ml-1">
                    [{logbook.shift === 'Pagi' ? 'X' : ' '}] Pagi &nbsp;&nbsp;
                    [{logbook.shift === 'Siang' ? 'X' : ' '}] Siang
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 29-Row Main Table with 31 Date Columns */}
        <table className="w-full border-collapse border border-slate-600 text-[9px] text-left">
          <thead>
            <tr className="bg-[#1e4b85] text-white font-bold text-center">
              <th rowSpan={2} className="p-1 border border-slate-600 w-7">
                NO
              </th>
              <th rowSpan={2} className="p-1 border border-slate-600 w-24">
                KATEGORI FASE ASUHAN
              </th>
              <th rowSpan={2} className="p-1 border border-slate-600 min-w-[190px] text-left">
                URAIAN KEGIATAN SPESIFIK PERAWAT HEMODIALISIS
              </th>
              <th rowSpan={2} className="p-1 border border-slate-600 min-w-[130px] text-left">
                STANDAR SPO / INDIKATOR MUTU
              </th>
              <th colSpan={31} className="p-0.5 border border-slate-600 text-[8.5px] uppercase">
                TANGGAL PELAKSANAAN TERVERIFIKASI ({logbook.monthYear.toUpperCase()})
              </th>
              <th rowSpan={2} className="p-1 border border-slate-600 w-10">
                TOTAL
              </th>
              <th rowSpan={2} className="p-1 border border-slate-600 w-11">
                % CAPAIAN
              </th>
              <th rowSpan={2} className="p-1 border border-slate-600 w-22">
                KETERANGAN
              </th>
            </tr>
            <tr className="bg-[#245b9e] text-white font-bold text-[8px] text-center">
              {daysArray.map((day) => (
                <th key={day} className="p-0.5 border border-slate-600 w-4 font-semibold">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Reference Row: Verified Patient Count per Day */}
            {hasNumericScores && (
              <tr className="bg-blue-50/80 text-blue-950 font-bold text-[8.5px]">
                <td colSpan={4} className="p-1 border border-slate-500 text-right uppercase">
                  JUMLAH PASIEN KELOLAAN TERVERIFIKASI PER HARI
                </td>
                {daysArray.map((day, dayIdx) => {
                  const pCount = dailyPatCounts[dayIdx] || 0;
                  return (
                    <td
                      key={day}
                      className="p-0.5 border border-slate-500 text-center font-mono font-black"
                    >
                      {verifiedDays[dayIdx] && pCount > 0 ? pCount : ''}
                    </td>
                  );
                })}
                <td className="p-1 border border-slate-500 text-center font-mono font-black">
                  {totalVerifiedPatients}
                </td>
                <td colSpan={2} className="p-1 border border-slate-500 text-center text-[8px]">
                  Pasien Disahkan
                </td>
              </tr>
            )}

            {bagianGroups.map((group) => (
              <React.Fragment key={group.bagianNum}>
                <tr className="bg-[#e9f0f8] text-[#0f2e59] font-black text-[9px]">
                  <td colSpan={38} className="p-1 border border-slate-500 uppercase tracking-wide">
                    {group.title}
                  </td>
                </tr>

                {group.items.map((item, rowIdx) => {
                  const isEven = rowIdx % 2 === 1;

                  if (hasNumericScores && logbook.dailyScores) {
                    const scoreArr = logbook.dailyScores[item.code] || [];
                    const rowTotal = scoreArr.reduce<number>(
                      (sum, v) => sum + (typeof v === 'number' ? v : 0),
                      0
                    );
                    const rowMax =
                      typeof logbook.itemMaxScores?.[item.code] === 'number'
                        ? logbook.itemMaxScores[item.code]
                        : item.bagian === 1
                        ? verifiedDaysCount
                        : totalVerifiedPatients;
                    const rowPct =
                      rowMax > 0 ? Number(((rowTotal / rowMax) * 100).toFixed(1)) : 0;

                    return (
                      <tr key={item.code} className={isEven ? 'bg-slate-50/70' : 'bg-white'}>
                        <td className="p-1 border border-slate-400 text-center font-bold text-slate-800">
                          {item.code}
                        </td>
                        <td className="p-1 border border-slate-400 font-semibold text-slate-900 leading-snug">
                          {item.category}
                        </td>
                        <td className="p-1 border border-slate-400 text-slate-800 leading-tight">
                          {item.description}
                        </td>
                        <td className="p-1 border border-slate-400 text-slate-700 italic leading-tight text-[8.5px]">
                          {item.standardSpo}
                        </td>

                        {daysArray.map((day, dayIdx) => {
                          const val = scoreArr[dayIdx];
                          const isDayVerified =
                            val !== null &&
                            val !== undefined &&
                            (Boolean(verifiedDays[dayIdx]) ||
                              (item.code === '3.6' && Boolean(logbook.hasActivityDays?.[dayIdx])));
                          const maxCell =
                            logbook.dailyItemMaxScores?.[item.code]?.[dayIdx] ??
                            (item.bagian === 1 ? 1 : dailyPatCounts[dayIdx] || 0);
                          const cellClass = !isDayVerified
                            ? 'text-slate-300'
                            : val === 0 && maxCell === 0
                            ? 'text-slate-600 bg-slate-50/60'
                            : val === maxCell && maxCell > 0
                            ? 'text-emerald-900 bg-emerald-50/60'
                            : val > 0
                            ? 'text-amber-900 bg-amber-50/70'
                            : 'text-rose-800 bg-rose-50/60';

                          return (
                            <td
                              key={day}
                              className={`p-0 border border-slate-400 text-center font-mono font-bold ${cellClass}`}
                            >
                              {isDayVerified ? val : ''}
                            </td>
                          );
                        })}

                        <td className="p-1 border border-slate-400 text-center font-mono font-bold text-blue-950">
                          {rowTotal}
                        </td>
                        <td className="p-1 border border-slate-400 text-center font-mono font-bold text-emerald-800">
                          {rowPct}%
                        </td>
                        <td className="p-1 border border-slate-400 text-slate-700 text-[8.5px]">
                          {logbook.notes[item.code] || '-'}
                        </td>
                      </tr>
                    );
                  }

                  // Legacy boolean fallback
                  const itemChecks = logbook.checks[item.code] || [];
                  const { total, pct } = computeItemTotalAndPct(itemChecks, verifiedDaysCount);

                  return (
                    <tr key={item.code} className={isEven ? 'bg-slate-50/70' : 'bg-white'}>
                      <td className="p-1 border border-slate-400 text-center font-bold text-slate-800">
                        {item.code}
                      </td>
                      <td className="p-1 border border-slate-400 font-semibold text-slate-900 leading-snug">
                        {item.category}
                      </td>
                      <td className="p-1 border border-slate-400 text-slate-800 leading-tight">
                        {item.description}
                      </td>
                      <td className="p-1 border border-slate-400 text-slate-700 italic leading-tight text-[8.5px]">
                        {item.standardSpo}
                      </td>
                      {daysArray.map((day, dayIdx) => {
                        const isChecked = itemChecks[dayIdx];
                        return (
                          <td
                            key={day}
                            className={`p-0 border border-slate-400 text-center font-black ${
                              isChecked ? 'text-emerald-800 bg-emerald-50/40' : 'text-slate-300'
                            }`}
                          >
                            {isChecked ? 'V' : ''}
                          </td>
                        );
                      })}
                      <td className="p-1 border border-slate-400 text-center font-bold text-blue-950">
                        {total}
                      </td>
                      <td className="p-1 border border-slate-400 text-center font-bold text-emerald-800">
                        {pct}%
                      </td>
                      <td className="p-1 border border-slate-400 text-slate-700 text-[8.5px]">
                        {logbook.notes[item.code] || '-'}
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}

            {/* Bottom Footer Row: JUMLAH NILAI KEGIATAN PER HARI */}
            <tr className="bg-amber-100/70 font-black text-slate-900 text-center border-t-2 border-slate-700 text-[8.5px]">
              <td
                colSpan={4}
                className="p-1.5 border border-slate-500 text-right uppercase tracking-wider font-extrabold"
              >
                TOTAL NILAI KEGIATAN TERVERIFIKASI PER HARI
              </td>
              {daysArray.map((_, dayIdx) => {
                if (hasNumericScores && logbook.dailyScores) {
                  if (!verifiedDays[dayIdx] && !logbook.hasActivityDays?.[dayIdx]) {
                    return <td key={dayIdx} className="p-0.5 border border-slate-500 font-mono" />;
                  }
                  const daySum = OFFICIAL_LOGBOOK_ITEMS.reduce((acc, it) => {
                    const val = logbook.dailyScores![it.code]?.[dayIdx];
                    return acc + (typeof val === 'number' ? val : 0);
                  }, 0);
                  return (
                    <td key={dayIdx} className="p-0.5 border border-slate-500 font-mono font-bold">
                      {daySum}
                    </td>
                  );
                }
                const count = computeDailyActivitiesCount(logbook.checks, dayIdx);
                return (
                  <td key={dayIdx} className="p-0.5 border border-slate-500 font-bold">
                    {count || ''}
                  </td>
                );
              })}
              <td className="p-1 border border-slate-500 font-mono font-black text-blue-950">
                {grandTotalValue}
              </td>
              <td className="p-1 border border-slate-500 font-mono font-black text-emerald-800">
                {overallCompliancePct}%
              </td>
              <td className="p-1 border border-slate-500 text-[8.5px] font-bold text-slate-800">
                Maks: {grandMaxPossible}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Signatures Block */}
        <div className="mt-4 pt-2 border-t border-slate-400 grid grid-cols-2 text-center text-[10px]">
          <div>
            <div className="text-slate-700 mb-12">
              Mengetahui &amp; Menyatakan,
              <br />
              <strong className="text-slate-900">{staffRoleTitle} Hemodialisis</strong>
            </div>
            <div className="font-bold uppercase tracking-wide border-t border-slate-700 pt-1 inline-block min-w-[200px] text-blue-950">
              ( {logbook.nurseName} )
            </div>
            <div className="text-[9px] text-slate-600 mt-0.5">NIP/NIRA: {logbook.nipNira}</div>
            {logbook.nurseSigned && (
              <div className="text-[8.5px] text-emerald-700 font-semibold mt-0.5">
                ✓ Rekapitulasi Logbook Terverifikasi: {logbook.nurseSignedAt || 'Valid'}
              </div>
            )}
          </div>

          <div>
            <div className="text-slate-700 mb-12">
              Diverifikasi &amp; Disahkan oleh,
              <br />
              <strong className="text-slate-900">
                {logbook.verifierRoleLabel || 'PJ Shift / Kepala Ruang Hemodialisis'}
              </strong>
            </div>
            <div className="font-bold uppercase tracking-wide border-t border-slate-700 pt-1 inline-block min-w-[200px] text-slate-950">
              ( {logbook.headNurseName} )
            </div>
            <div className="text-[9px] text-slate-600 mt-0.5">NIP: {logbook.headNurseNip}</div>
            {logbook.headNurseSigned && (
              <div className="text-[8.5px] text-emerald-700 font-semibold mt-0.5">
                ✓ Disahkan secara digital: {logbook.headNurseSignedAt || 'Valid'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
