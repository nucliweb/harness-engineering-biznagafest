import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PHASES = ['plan', 'implement', 'validate', 'retro'];
export const ACTORS = [
  'main',
  'explorer',
  'plan-auditor',
  'developer-package',
  'reviewer-package',
  'validator-global',
  'design-qa',
  'headless',
];
export const KINDS = [
  'blocked',
  'deviation',
  'decision',
  'user_decision',
  'autofix_failed',
  'reviewer_finding',
  'auditor_finding',
  'validator_red',
  'suppression',
];

const TICKET = /^[A-Z]+-\d+$/;
export const UNASSIGNED = '_unassigned';

// Order matters: Bearer first so its token is consumed with it.
const PII = [
  /Bearer\s+\S+/g,
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g,
  /\bsk-[A-Za-z0-9_-]+/g,
  /\bghp_[A-Za-z0-9_]+/g,
  /\b[0-9a-fA-F]{32,}\b/g,
];

export function redact(text) {
  return PII.reduce((acc, re) => acc.replace(re, '[redacted]'), String(text));
}

export function defaultRoot() {
  return resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
}

function oneOf(field, value, allowed) {
  if (!allowed.includes(value)) {
    throw new Error(`invalid ${field} "${value}", expected one of: ${allowed.join(', ')}`);
  }
}

// Appends one validated, redacted record to specs/<ticket>/journal.jsonl.
// `ts` is always set here, never by the caller. Returns the record written.
export function appendEntry(entry, { root = defaultRoot(), now = () => new Date() } = {}) {
  const ticketOk = entry.ticket === UNASSIGNED || TICKET.test(entry.ticket ?? '');
  if (!ticketOk) throw new Error(`invalid ticket "${entry.ticket}", expected ^[A-Z]+-\\d+$`);
  oneOf('phase', entry.phase, PHASES);
  oneOf('actor', entry.actor, ACTORS);
  oneOf('kind', entry.kind, KINDS);
  if (typeof entry.summary !== 'string' || entry.summary.trim() === '') {
    throw new Error('summary is required');
  }

  const record = {
    ts: now().toISOString(),
    ticket: entry.ticket,
    phase: entry.phase,
    actor: entry.actor,
    kind: entry.kind,
    summary: redact(entry.summary.trim()),
  };
  if (entry.detail !== undefined && String(entry.detail).trim() !== '') {
    record.detail = redact(String(entry.detail).trim());
  }
  if (Array.isArray(entry.files) && entry.files.length > 0) {
    record.files = entry.files.map(String);
  }

  const dir = join(root, 'specs', entry.ticket);
  mkdirSync(dir, { recursive: true });
  appendFileSync(join(dir, 'journal.jsonl'), `${JSON.stringify(record)}\n`);
  return record;
}
