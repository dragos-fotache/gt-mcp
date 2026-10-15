/**
 * Narrow type declarations for the existing T02 shared append-only event
 * journal (`event-journal.mjs`), for strict NodeNext companion imports.
 *
 * EXPERIMENT ONLY. Declares solely the already-implemented JS writer/reader
 * API; no behavior, dependency, or compiler-setting change is implied.
 */

export interface T02SharedJournalWriter {
  readonly producer: string;
  record(source: string, type: string, fields?: Record<string, unknown>, layer?: string): void;
  close(): void;
}

export declare function openSharedJournal(path: string, producer: string): T02SharedJournalWriter;

export declare function readSharedJournal(
  path: string,
  profile?: string,
): Array<Record<string, unknown>>;

export declare const RECORD_CAP_BYTES: number;
export declare const AGGREGATE_CAP_BYTES: number;
