/**
 * Centralized Indonesian active day/date & WIB (UTC+7 / Asia/Jakarta) utilities
 * for RS Happy Land Medical Centre Yogyakarta.
 */

export const INDONESIAN_WEEKDAYS = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu'
] as const;

export const INDONESIAN_MONTH_LABELS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
] as const;

export const INDONESIAN_SHORT_MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des'
] as const;

const MONTH_TOKEN_ALIASES: { aliases: string[]; month: number }[] = [
  { aliases: ['januari', 'jan', 'january'], month: 1 },
  { aliases: ['februari', 'feb', 'february'], month: 2 },
  { aliases: ['maret', 'mar', 'march'], month: 3 },
  { aliases: ['april', 'apr'], month: 4 },
  { aliases: ['mei', 'may'], month: 5 },
  { aliases: ['juni', 'jun', 'june'], month: 6 },
  { aliases: ['juli', 'jul', 'july'], month: 7 },
  { aliases: ['agustus', 'agu', 'agt', 'aug', 'august'], month: 8 },
  { aliases: ['september', 'sep', 'sept'], month: 9 },
  { aliases: ['oktober', 'okt', 'oct', 'october'], month: 10 },
  { aliases: ['november', 'nov'], month: 11 },
  { aliases: ['desember', 'des', 'dec', 'december'], month: 12 }
];

export interface WibDateParts {
  year: number;
  month: number; // 1..12
  day: number; // 1..31
  weekdayIndex: number; // 0 (Minggu) .. 6 (Sabtu)
  dayName: string;
  monthName: string;
  shortMonthName: string;
  hour: number; // 0..23
  minute: number; // 0..59
  isoDate: string; // 'YYYY-MM-DD'
  fullDateLabel: string; // e.g. 'Minggu, 25 Oktober 2026'
}

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Formats an exact Gregorian (year, month 1..12, day 1..31) into
 * accurate Indonesian "Hari, DD Bulan YYYY" with mathematically verified weekday.
 */
export function formatIndonesianDateFromYmd(year: number, month: number, day: number): string {
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const y = utcDate.getUTCFullYear();
  const mIdx = utcDate.getUTCMonth();
  const d = utcDate.getUTCDate();
  const wIdx = utcDate.getUTCDay();
  return `${INDONESIAN_WEEKDAYS[wIdx]}, ${d} ${INDONESIAN_MONTH_LABELS[mIdx]} ${y}`;
}

/**
 * Extracts exact real-time WIB (UTC+7, Yogyakarta/Jakarta) calendar & time parts.
 */
export function getWibDateParts(now: Date = new Date()): WibDateParts {
  const wibDate = new Date(now.getTime() + WIB_OFFSET_MS);
  const year = wibDate.getUTCFullYear();
  const monthIdx = wibDate.getUTCMonth(); // 0..11
  const month = monthIdx + 1;
  const day = wibDate.getUTCDate();
  const weekdayIndex = wibDate.getUTCDay();
  const hour = wibDate.getUTCHours();
  const minute = wibDate.getUTCMinutes();

  const dayName = INDONESIAN_WEEKDAYS[weekdayIndex];
  const monthName = INDONESIAN_MONTH_LABELS[monthIdx];
  const shortMonthName = INDONESIAN_SHORT_MONTH_LABELS[monthIdx];
  const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const fullDateLabel = `${dayName}, ${day} ${monthName} ${year}`;

  return {
    year,
    month,
    day,
    weekdayIndex,
    dayName,
    monthName,
    shortMonthName,
    hour,
    minute,
    isoDate,
    fullDateLabel
  };
}

/**
 * Returns the live active Indonesian day & date in WIB, e.g. "Minggu, 25 Oktober 2026".
 */
export function getCurrentIndonesianFullDate(now: Date = new Date()): string {
  return getWibDateParts(now).fullDateLabel;
}

/**
 * Returns the live active ISO date in WIB, e.g. "2026-10-25".
 */
export function getCurrentIsoDateWib(now: Date = new Date()): string {
  return getWibDateParts(now).isoDate;
}

/**
 * Converts an ISO date string ("YYYY-MM-DD") to full Indonesian day & date
 * ("Hari, DD Bulan YYYY"). Falls back to live WIB today if invalid.
 */
export function formatIsoDateToIndonesianFull(isoDate: string, now: Date = new Date()): string {
  const match = (isoDate || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return getCurrentIndonesianFullDate(now);
  }
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2000 || year > 2100) {
    return getCurrentIndonesianFullDate(now);
  }
  return formatIndonesianDateFromYmd(year, month, day);
}

/**
 * Parses an Indonesian or ISO date string into (year, month, day),
 * or returns null if unparseable.
 */
export function extractYmdFromDateString(
  raw?: string
): { year: number; month: number; day: number } | null {
  if (!raw || !raw.trim()) return null;
  const text = raw.trim();

  const namedMatch = text.match(/(\d{1,2})\s+([a-zA-Z]+)\.?\s+(\d{4})/);
  if (namedMatch) {
    const day = parseInt(namedMatch[1], 10);
    const monthToken = namedMatch[2].toLowerCase();
    const year = parseInt(namedMatch[3], 10);
    const found = MONTH_TOKEN_ALIASES.find((m) =>
      m.aliases.some((alias) => monthToken === alias || monthToken.startsWith(alias))
    );
    if (found && day >= 1 && day <= 31 && year >= 2000 && year <= 2100) {
      const utcCheck = new Date(Date.UTC(year, found.month - 1, day));
      return {
        year: utcCheck.getUTCFullYear(),
        month: utcCheck.getUTCMonth() + 1,
        day: utcCheck.getUTCDate()
      };
    }
  }

  const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2000 && year <= 2100) {
      const utcCheck = new Date(Date.UTC(year, month - 1, day));
      return {
        year: utcCheck.getUTCFullYear(),
        month: utcCheck.getUTCMonth() + 1,
        day: utcCheck.getUTCDate()
      };
    }
  }

  return null;
}

/**
 * Converts an Indonesian date label (e.g. "Minggu, 25 Oktober 2026") to ISO "YYYY-MM-DD".
 */
export function indonesianDateLabelToIso(dateLabel?: string, now: Date = new Date()): string {
  const ymd = extractYmdFromDateString(dateLabel);
  if (!ymd) return getCurrentIsoDateWib(now);
  return `${ymd.year}-${String(ymd.month).padStart(2, '0')}-${String(ymd.day).padStart(2, '0')}`;
}

/**
 * Ensures any Indonesian date string has the exact matching weekday ("Hari") for its calendar date.
 */
export function normalizeIndonesianDateLabel(dateLabel?: string, now: Date = new Date()): string {
  const ymd = extractYmdFromDateString(dateLabel);
  if (!ymd) return getCurrentIndonesianFullDate(now);
  return formatIndonesianDateFromYmd(ymd.year, ymd.month, ymd.day);
}

/**
 * Extracts the exact active Indonesian day name ('Senin'..'Minggu') from an Indonesian date label
 * (e.g. "Senin, 26 Oktober 2026") or ISO date ("2026-10-26"). Falls back to live WIB weekday.
 */
export function extractActiveDayName(
  dateLabelOrIso?: string,
  now: Date = new Date()
): (typeof INDONESIAN_WEEKDAYS)[number] {
  const ymd = extractYmdFromDateString(dateLabelOrIso);
  if (ymd) {
    const utcDate = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day));
    return INDONESIAN_WEEKDAYS[utcDate.getUTCDay()];
  }
  if (dateLabelOrIso) {
    const clean = dateLabelOrIso.trim().toLowerCase();
    for (const day of INDONESIAN_WEEKDAYS) {
      if (clean.startsWith(day.toLowerCase())) {
        return day;
      }
    }
  }
  return getWibDateParts(now).dayName as (typeof INDONESIAN_WEEKDAYS)[number];
}

/**
 * Formats a full clinical WIB timestamp using the active date + current WIB HH:mm,
 * e.g. "Minggu, 25 Oktober 2026, 11:58 WIB".
 */
export function formatCurrentWibTimestamp(
  activeDateLabel?: string,
  now: Date = new Date()
): string {
  const wib = getWibDateParts(now);
  const hh = String(wib.hour).padStart(2, '0');
  const mm = String(wib.minute).padStart(2, '0');
  const resolvedDate = activeDateLabel
    ? normalizeIndonesianDateLabel(activeDateLabel, now)
    : wib.fullDateLabel;
  return `${resolvedDate}, ${hh}:${mm} WIB`;
}

/**
 * Formats a compact WIB timestamp, e.g. "25 Okt 2026, 11:58 WIB".
 */
export function formatShortIndonesianTimestampWib(now: Date = new Date()): string {
  const wib = getWibDateParts(now);
  const hh = String(wib.hour).padStart(2, '0');
  const mm = String(wib.minute).padStart(2, '0');
  return `${wib.day} ${wib.shortMonthName} ${wib.year}, ${hh}:${mm} WIB`;
}

/**
 * Checks whether a given Indonesian date label or ISO date matches today's calendar date in WIB.
 */
export function isTodayWib(dateLabelOrIso?: string, now: Date = new Date()): boolean {
  if (!dateLabelOrIso) return true;
  const targetIso = indonesianDateLabelToIso(dateLabelOrIso, now);
  const todayIso = getCurrentIsoDateWib(now);
  return targetIso === todayIso;
}
