import { CheckIn, JournalEntry, TruthStatement, SAMPLE_ENTRIES, SAMPLE_CHECKIN } from './types';

const KEYS = {
  entries: 'boundless_entries',
  checkins: 'boundless_checkins',
  truths: 'boundless_truths',
};

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function getEntries(): JournalEntry[] {
  return load(KEYS.entries, SAMPLE_ENTRIES);
}

export function addEntry(entry: JournalEntry) {
  const entries = getEntries();
  entries.push(entry);
  save(KEYS.entries, entries);
}

export function getCheckIns(): CheckIn[] {
  return load(KEYS.checkins, [SAMPLE_CHECKIN]);
}

export function addCheckIn(checkin: CheckIn) {
  const checkins = getCheckIns();
  checkins.push(checkin);
  save(KEYS.checkins, checkins);
}

export function getLatestCheckIn(): CheckIn | null {
  const checkins = getCheckIns();
  return checkins.length > 0 ? checkins[checkins.length - 1] : null;
}

export function getTruthStatements(): TruthStatement[] {
  return load(KEYS.truths, []);
}

export function addTruthStatement(truth: TruthStatement) {
  const truths = getTruthStatements();
  truths.push(truth);
  save(KEYS.truths, truths);
}
