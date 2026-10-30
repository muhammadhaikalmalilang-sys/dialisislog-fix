import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCurrentWibTimestamp,
  formatIndonesianDateFromYmd,
  formatIsoDateToIndonesianFull,
  getCurrentIndonesianFullDate,
  getCurrentIsoDateWib,
  getWibDateParts,
  indonesianDateLabelToIso,
  normalizeIndonesianDateLabel
} from './dateHelpers.ts';

test('getWibDateParts resolves exact WIB (UTC+7) day, date, and hour regardless of host timezone', () => {
  // 2026-10-24T21:57:44-07:00 == 2026-10-25T11:57:44+07:00 (Minggu, 25 Oktober 2026, 11:57 WIB)
  const instant = new Date('2026-10-24T21:57:44-07:00');
  const parts = getWibDateParts(instant);

  assert.equal(parts.year, 2026);
  assert.equal(parts.month, 10);
  assert.equal(parts.day, 25);
  assert.equal(parts.dayName, 'Minggu');
  assert.equal(parts.monthName, 'Oktober');
  assert.equal(parts.hour, 11);
  assert.equal(parts.minute, 57);
  assert.equal(parts.isoDate, '2026-10-25');
  assert.equal(parts.fullDateLabel, 'Minggu, 25 Oktober 2026');
  assert.equal(getCurrentIndonesianFullDate(instant), 'Minggu, 25 Oktober 2026');
  assert.equal(getCurrentIsoDateWib(instant), '2026-10-25');
});

test('formatIsoDateToIndonesianFull and normalizeIndonesianDateLabel enforce accurate weekday', () => {
  assert.equal(formatIndonesianDateFromYmd(2026, 10, 25), 'Minggu, 25 Oktober 2026');
  assert.equal(formatIsoDateToIndonesianFull('2026-10-26'), 'Senin, 26 Oktober 2026');
  assert.equal(formatIsoDateToIndonesianFull('2026-10-24'), 'Sabtu, 24 Oktober 2026');

  // Fixes mismatched weekday automatically
  assert.equal(normalizeIndonesianDateLabel('Selasa, 25 Oktober 2026'), 'Minggu, 25 Oktober 2026');
  assert.equal(indonesianDateLabelToIso('Minggu, 25 Oktober 2026'), '2026-10-25');
});

test('formatCurrentWibTimestamp pairs normalized Indonesian date with WIB HH:mm', () => {
  const instant = new Date('2026-10-24T21:05:00-07:00'); // 11:05 WIB on 25 Oct 2026
  assert.equal(
    formatCurrentWibTimestamp(undefined, instant),
    'Minggu, 25 Oktober 2026, 11:05 WIB'
  );
  assert.equal(
    formatCurrentWibTimestamp('Sabtu, 24 Oktober 2026', instant),
    'Sabtu, 24 Oktober 2026, 11:05 WIB'
  );
});
