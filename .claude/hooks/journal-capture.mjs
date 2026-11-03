#!/usr/bin/env node
// SubagentStop hook. Enforces the JOURNAL block (docs/contracts.md §5.1) and appends its entries.
// No model call. Never crashes: on malformed input it logs to stderr and exits 0.
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KINDS, UNASSIGNED, appendEntry } from '../scripts/lib/journal.mjs';

const PHASE_BY_AGENT = {
  'plan-auditor': 'plan',
  explorer: 'plan',
  'developer-package': 'implement',
  'reviewer-package': 'implement',
  'validator-global': 'validate',
  'design-qa': 'validate',
};
const KEYS = ['kind', 'summary', 'detail', 'files'];
const MISSING_REASON = 'Report must end with a JOURNAL block (see docs/contracts.md §5.1)';

function unquote(value) {
  const v = value.trim();
  const m = /^(["'])(.*)\1$/.exec(v);
  return m ? m[2] : v;
}

function parseFiles(value) {
  const inner = value.trim().replace(/^\[/, '').replace(/\]$/, '');
  return inner
    .split(',')
    .map((f) => unquote(f))
    .filter(Boolean);
}

// Returns { status: 'none' } | { status: 'entries', entries } | { status: 'missing' } | { status: 'invalid', reason }.
// The last JOURNAL marker in the message wins.
export function parseJournalBlock(message) {
  const lines = String(message ?? '').split('\n');
  let start = -1;
  lines.forEach((line, i) => {
    const t = line.trim();
    if (t === 'JOURNAL: none' || t === 'JOURNAL') start = i;
  });
  if (start === -1) return { status: 'missing' };
  if (lines[start].trim() === 'JOURNAL: none') return { status: 'none' };

  const entries = [];
  let current = null;
  let end = -1;
  for (let i = start + 1; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === 'END JOURNAL') {
      end = i;
      break;
    }
    if (t === '' || t.startsWith('```')) continue;
    const startEntry = /^-\s+(\w+):\s*(.*)$/.exec(t);
    const cont = /^(\w+):\s*(.*)$/.exec(t);
    const m = startEntry ?? (current ? cont : null);
    if (!m) return { status: 'invalid', reason: `cannot parse line "${t}"` };
    const [, key, value] = m;
    if (!KEYS.includes(key)) return { status: 'invalid', reason: `unknown key "${key}"` };
    if (startEntry) {
      current = {};
      entries.push(current);
    }
    current[key] = key === 'files' ? parseFiles(value) : unquote(value);
  }

  if (end === -1) return { status: 'invalid', reason: 'block is not closed with END JOURNAL' };
  const trailing = lines.slice(end + 1).find((l) => l.trim() !== '' && !l.trim().startsWith('```'));
  if (trailing !== undefined) return { status: 'invalid', reason: `text after END JOURNAL: "${trailing.trim()}"` };
  if (entries.length === 0) return { status: 'invalid', reason: 'block has no entries, write "JOURNAL: none" instead' };
  for (const e of entries) {
    if (!KINDS.includes(e.kind)) return { status: 'invalid', reason: `unknown kind "${e.kind}"` };
    if (!e.summary) return { status: 'invalid', reason: `entry of kind ${e.kind} has no summary` };
  }
  return { status: 'entries', entries };
}

export function findTicket(message) {
  const m = /\bspecs\/([A-Z]+-\d+)\//.exec(String(message ?? ''));
  return m ? m[1] : null;
}

export function handle(payload, root) {
  const agent = payload?.agent_type;
  const phase = PHASE_BY_AGENT[agent];
  if (!phase) {
    console.error(`journal-capture: ignoring unknown agent_type ${JSON.stringify(agent)}`);
    return null;
  }
  const message = typeof payload.last_assistant_message === 'string' ? payload.last_assistant_message : '';
  const ticket = findTicket(message) ?? UNASSIGNED;
  const parsed = parseJournalBlock(message);
  const base = { ticket, phase, actor: agent };

  if (parsed.status === 'none') return null;
  if (parsed.status === 'entries') {
    for (const e of parsed.entries) {
      try {
        appendEntry({ ...base, ...e }, { root });
      } catch (err) {
        console.error(`journal-capture: entry rejected: ${err.message}`);
      }
    }
    return null;
  }

  // Missing or invalid block.
  const reason = parsed.status === 'missing' ? MISSING_REASON : `JOURNAL block invalid: ${parsed.reason} (see docs/contracts.md §5.1)`;
  if (!payload.stop_hook_active) return { decision: 'block', reason };
  appendEntry(
    {
      ...base,
      kind: 'deviation',
      summary: 'Subagent report ended without a JOURNAL block',
      detail: parsed.status === 'invalid' ? parsed.reason : undefined,
    },
    { root },
  );
  return null;
}

function main() {
  let payload;
  try {
    payload = JSON.parse(readFileSync(0, 'utf8'));
  } catch (err) {
    console.error(`journal-capture: unreadable input: ${err.message}`);
    return;
  }
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    console.error('journal-capture: payload is not an object');
    return;
  }
  const root = process.env.CLAUDE_PROJECT_DIR || payload.cwd || process.cwd();
  try {
    const out = handle(payload, root);
    if (out) process.stdout.write(`${JSON.stringify(out)}\n`);
  } catch (err) {
    console.error(`journal-capture: ${err.message}`);
  }
}

if (process.argv[1] && dirname(process.argv[1]) === dirname(fileURLToPath(import.meta.url)) && process.argv[1].endsWith('journal-capture.mjs')) {
  main();
}
