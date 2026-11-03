#!/usr/bin/env node
// Parsing and round state for scripts/adversarial-review.sh. Node built-ins only.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function extractResult(jsonText) {
  try {
    let data = JSON.parse(jsonText);
    if (Array.isArray(data)) data = data.find((e) => e && e.type === 'result');
    if (!data || data.is_error === true || typeof data.result !== 'string') return { ok: false, text: '' };
    return { ok: true, text: data.result };
  } catch {
    return { ok: false, text: '' };
  }
}

export function parseFindings(text) {
  const out = [];
  for (const line of String(text).split('\n')) {
    const m = /^\s*FINDING (\d+): (\S+?):(\d+(?:-\d+)?) +(?:—|–|-{1,2}) +(.+?)\s*$/.exec(line);
    if (m) out.push({ n: Number(m[1]), file: m[2], line: m[3], claim: m[4] });
  }
  return out;
}

// 'findings' when at least one FINDING line parses, 'none' for an explicit NO FINDINGS line, else 'unparsable'.
export function reviewerOutcome(text) {
  if (parseFindings(text).length > 0) return 'findings';
  return String(text).split('\n').some((l) => l.trim() === 'NO FINDINGS') ? 'none' : 'unparsable';
}

// Findings without a verdict line count as UPHELD: only an explicit refutation disputes one.
export function parseVerdicts(text, numbers) {
  const map = new Map(numbers.map((n) => [n, { verdict: 'UPHELD', reason: '' }]));
  for (const line of String(text).split('\n')) {
    const m = /^\s*(?:VERDICT\s+|FINDING\s+)?(\d+)\s*:\s*(UPHELD|REFUTED)\b[\s:.-]*(.*?)\s*$/.exec(line);
    if (m && map.has(Number(m[1]))) map.set(Number(m[1]), { verdict: m[2], reason: m[2] === 'REFUTED' ? m[3] : '' });
  }
  return map;
}

export function parseReply(text) {
  const dropped = new Set();
  const defended = new Map();
  for (const line of String(text).split('\n')) {
    let m = /^\s*DROP\s+(\d+)\b/.exec(line);
    if (m) {
      dropped.add(Number(m[1]));
      continue;
    }
    m = /^\s*DEFEND\s+(\d+)\s*:?\s*(.*?)\s*$/.exec(line);
    if (m) defended.set(Number(m[1]), m[2]);
  }
  return { dropped, defended };
}

export function initState(findings) {
  return { findings: findings.map((f) => ({ ...f, status: 'pending', reason: '', defence: '' })) };
}

// Applies a rebuttal round. Returns the number of refuted findings.
export function applyVerdicts(state, verdicts) {
  let disputed = 0;
  for (const f of state.findings) {
    if (f.status === 'dropped') continue;
    const v = verdicts.get(f.n) ?? { verdict: 'UPHELD', reason: '' };
    f.status = v.verdict === 'REFUTED' ? 'refuted' : 'upheld';
    f.reason = v.reason;
    if (f.status === 'refuted') disputed++;
  }
  return disputed;
}

// Applies the reviewer's reply to refuted findings. Returns how many remain disputed.
export function applyReply(state, reply) {
  let remaining = 0;
  for (const f of state.findings) {
    if (f.status !== 'refuted') continue;
    if (reply.dropped.has(f.n)) {
      f.status = 'dropped';
    } else {
      f.defence = reply.defended.get(f.n) ?? f.defence;
      f.status = 'pending'; // goes back to the next rebuttal round together with its defence
      f.lastReason = f.reason;
      remaining++;
    }
  }
  return remaining;
}

const fmt = (f) => `FINDING ${f.n}: ${f.file}:${f.line} — ${f.claim}`;

// alive: every finding still in play; disputed: refuted and not dropped.
export function listFindings(state, which) {
  const pick =
    which === 'disputed' ? (f) => f.status === 'refuted' : (f) => f.status !== 'dropped';
  return state.findings
    .filter(pick)
    .map((f) => {
      let s = fmt(f);
      if (which === 'disputed' && f.reason) s += `\n  REFUTED: ${f.reason}`;
      if (f.defence) s += `\n  DEFENCE: ${f.defence}`;
      return s;
    })
    .join('\n');
}

export function render(state, kind) {
  const alive = state.findings.filter((f) => f.status !== 'dropped');
  if (kind === 'consensus') {
    if (alive.length === 0) return 'CONSENSUS\nNo findings.';
    return ['CONSENSUS', ...alive.map(fmt)].join('\n');
  }
  const open = alive.filter((f) => f.status === 'refuted');
  const agreed = alive.filter((f) => f.status === 'upheld');
  const lines = ['NO CONSENSUS', 'Open items (a person decides):'];
  for (const f of open) {
    lines.push(fmt(f));
    if (f.reason) lines.push(`  REFUTED: ${f.reason}`);
    if (f.defence) lines.push(`  DEFENCE: ${f.defence}`);
  }
  if (agreed.length > 0) lines.push('Agreed:', ...agreed.map(fmt));
  return lines.join('\n');
}

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function loadState(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}
function saveState(file, state) {
  writeFileSync(file, JSON.stringify(state));
}

function main([cmd, a, b]) {
  if (cmd === 'result') {
    const r = extractResult(readStdin());
    if (!r.ok) return 1;
    process.stdout.write(`${r.text}\n`);
  } else if (cmd === 'init') {
    const text = readStdin();
    if (reviewerOutcome(text) === 'unparsable') {
      console.error('reviewer output unparsable');
      return 1;
    }
    const findings = parseFindings(text);
    saveState(a, initState(findings));
    console.log(findings.length);
  } else if (cmd === 'rebuttal') {
    const state = loadState(a);
    const alive = state.findings.filter((f) => f.status !== 'dropped').map((f) => f.n);
    console.log(applyVerdicts(state, parseVerdicts(readStdin(), alive)));
    saveState(a, state);
  } else if (cmd === 'reply') {
    const state = loadState(a);
    console.log(applyReply(state, parseReply(readStdin())));
    saveState(a, state);
  } else if (cmd === 'list') {
    console.log(listFindings(loadState(a), b));
  } else if (cmd === 'render') {
    console.log(render(loadState(a), b));
  } else {
    console.error('usage: parse-review.mjs result | init <state> | rebuttal <state> | reply <state> | list <state> alive|disputed | render <state> consensus|no-consensus');
    return 2;
  }
  return 0;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) process.exit(main(process.argv.slice(2)));
