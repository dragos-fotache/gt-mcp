/**
 * UTC calendar validation for backend timestamps. Accepts T/t and Z/z or a
 * zero +00:00 UTC offset; rejects -00:00, nonzero and unknown offsets, and
 * leap seconds. Fractions may be absent or carry 1..3 digits; longer fractions are
 * accepted only when every digit after the third is zero. Valid values must
 * fall in the Android epoch-millisecond range
 * -62167219200000..253402300799999. Original valid strings are preserved.
 */

const TIMESTAMP_PATTERN = new RegExp(
  "^([0-9]{4})-([0-9]{2})-([0-9]{2})" +
    "[Tt]([0-9]{2}):([0-9]{2}):([0-9]{2})" +
    "(?:\\.([0-9]+))?" +
    "(?:[Zz]|\\+00:00)(?![\\s\\S])",
);

const MIN_EPOCH_MS = -62167219200000;
const MAX_EPOCH_MS = 253402300799999;

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  switch (month) {
    case 1:
    case 3:
    case 5:
    case 7:
    case 8:
    case 10:
    case 12:
      return 31;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    case 2:
      return isLeapYear(year) ? 29 : 28;
    default:
      return 0;
  }
}

/** Days from civil date (Howard Hinnant's algorithm), proleptic Gregorian. */
function daysFromCivil(year: number, month: number, day: number): number {
  const adjustedYear = month <= 2 ? year - 1 : year;
  const era = Math.floor(adjustedYear / 400);
  const yearOfEra = adjustedYear - era * 400;
  const dayOfYear = Math.floor((153 * (month > 2 ? month - 3 : month + 9) + 2) / 5) + day - 1;
  const dayOfEra =
    yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146097 + dayOfEra - 719468;
}

function toNumber(text: string): number {
  return Number.parseInt(text, 10);
}

/** True for real UTC calendar values inside the supported epoch-ms range. */
export function isValidTimestamp(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  const match = TIMESTAMP_PATTERN.exec(value);
  if (match === null) {
    return false;
  }
  const year = toNumber(match[1] ?? "");
  const month = toNumber(match[2] ?? "");
  const day = toNumber(match[3] ?? "");
  const hour = toNumber(match[4] ?? "");
  const minute = toNumber(match[5] ?? "");
  const second = toNumber(match[6] ?? "");
  const fraction = match[7] ?? "";
  if (
    !Number.isSafeInteger(year) ||
    !Number.isSafeInteger(month) ||
    !Number.isSafeInteger(day) ||
    !Number.isSafeInteger(hour) ||
    !Number.isSafeInteger(minute) ||
    !Number.isSafeInteger(second)
  ) {
    return false;
  }
  if (month < 1 || month > 12) {
    return false;
  }
  if (day < 1 || day > daysInMonth(year, month)) {
    return false;
  }
  if (hour > 23 || minute > 59 || second > 59) {
    return false;
  }
  if (fraction.length > 3) {
    const extra = fraction.slice(3);
    if (!/^[0]+$/.test(extra)) {
      return false;
    }
  }
  const millis = fraction.length === 0 ? 0 : toNumber((fraction.slice(0, 3) + "000").slice(0, 3));
  const epochMs =
    daysFromCivil(year, month, day) * 86400000 +
    hour * 3600000 +
    minute * 60000 +
    second * 1000 +
    millis;
  return epochMs >= MIN_EPOCH_MS && epochMs <= MAX_EPOCH_MS;
}
