#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { UNASSIGNED, defaultRoot } from './lib/journal.mjs';
import { isMain } from './lib/validate-cli.mjs';

const LAYER_PREFIXES = [
  ['packages/core/', 'core'],
  ['packages/ui/', 'ui'],
  ['apps/agenda/', 'agenda'],
];

// The layer is the first path that belongs to a package; spec and doc paths are skipped,
// so an entry that lists `specs/FEATURE-1/03-plan.md` before the code still lands in its layer.
export function layerOf(files) {
  if (!Array.isArray(files)) return 'unknown';
  for (const file of files) {
    const path = String(file ?? '').replace(/^\.\//, '');
    for (const [prefix, layer] of LAYER_PREFIXES) {
      if (path.startsWith(prefix) || path.includes(`/${prefix}`)) return layer;
    }
  }
  return 'unknown';
}

export function normalise(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const byString = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function readJournals(specsDir) {
  const entries = [];
  if (!existsSync(specsDir)) return entries;
  const tickets = readdirSync(specsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== UNASSIGNED)
    .map((d) => d.name)
    .sort(byString);
  for (const ticket of tickets) {
    const file = join(specsDir, ticket, 'journal.jsonl');
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try {
        const rec = JSON.parse(line);
        if (typeof rec.summary === 'string' && typeof rec.ts === 'string') entries.push({ ...rec, ticket });
      } catch {
        // skip malformed lines, the journal is append-only and never repaired here
      }
    }
  }
  return entries;
}

const uniqSorted = (list) => [...new Set(list)].sort(byString);

// Only friction becomes a lesson. Decisions (headless defaults, human rulings) are
// context for the retro, not patterns to carry into the next plan.
const LESSON_KINDS = new Set(['autofix_failed', 'reviewer_finding', 'auditor_finding', 'validator_red', 'blocked', 'deviation', 'suppression']);

export function aggregate({ root = defaultRoot() } = {}) {
  const specsDir = join(root, 'specs');
  const outFile = join(specsDir, 'lessons.json');
  const existing = existsSync(outFile) ? JSON.parse(readFileSync(outFile, 'utf8')) : [];

  // Group journal entries by layer + normalised summary.
  const groups = new Map();
  for (const rec of readJournals(specsDir)) {
    if (!LESSON_KINDS.has(rec.kind)) continue;
    const layer = layerOf(rec.files);
    const norm = normalise(rec.summary);
    if (norm === '') continue;
    const key = `${layer}\u0000${norm}`;
    if (!groups.has(key)) groups.set(key, { layer, norm, items: [] });
    groups.get(key).items.push(rec);
  }
  for (const g of groups.values()) {
    g.items.sort((a, b) => byString(a.ts, b.ts) || byString(a.ticket, b.ticket) || byString(a.summary, b.summary));
  }

  const lessons = existing.map((l) => ({ ...l }));
  const index = new Map(lessons.map((l) => [`${l.layer}\u0000${normalise(l.text)}`, l]));
  let nextId = lessons.reduce((m, l) => Math.max(m, Number(/^L(\d+)$/.exec(l.id)?.[1] ?? 0)), 0) + 1;

  // New lessons get ids in a stable order: first seen, then layer, then text.
  const ordered = [...groups.entries()].sort(
    ([, a], [, b]) =>
      byString(a.items[0].ts, b.items[0].ts) || byString(a.layer, b.layer) || byString(a.norm, b.norm),
  );

  for (const [key, g] of ordered) {
    const dates = g.items.map((i) => i.ts.slice(0, 10));
    let lesson = index.get(key);
    if (!lesson) {
      lesson = {
        id: `L${nextId++}`,
        text: g.items[0].summary,
        layer: g.layer,
        kinds: [],
        tickets: [],
        status: 'candidate',
        first_seen: dates[0],
        last_seen: dates[dates.length - 1],
      };
      lessons.push(lesson);
    }
    lesson.kinds = uniqSorted([...lesson.kinds, ...g.items.map((i) => i.kind).filter(Boolean)]);
    lesson.tickets = uniqSorted([...lesson.tickets, ...g.items.map((i) => i.ticket)]);
    lesson.first_seen = [lesson.first_seen, ...dates].sort(byString)[0];
    lesson.last_seen = [lesson.last_seen, ...dates].sort(byString).at(-1);
    if (lesson.status === 'candidate' && lesson.tickets.length >= 2) lesson.status = 'confirmed';
  }

  lessons.sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));
  const ordered_lessons = lessons.map((l) => ({
    id: l.id,
    text: l.text,
    layer: l.layer,
    kinds: l.kinds,
    tickets: l.tickets,
    status: l.status,
    first_seen: l.first_seen,
    last_seen: l.last_seen,
  }));
  mkdirSync(specsDir, { recursive: true });
  writeFileSync(outFile, `${JSON.stringify(ordered_lessons, null, 2)}\n`);
  return ordered_lessons;
}

if (isMain(import.meta.url)) {
  try {
    const { values } = parseArgs({ args: process.argv.slice(2), options: { root: { type: 'string' } } });
    const lessons = aggregate(values.root ? { root: values.root } : undefined);
    console.log(`lessons.json: ${lessons.length} lessons`);
  } catch (err) {
    console.error(`lessons-aggregate: ${err.message}`);
    process.exit(1);
  }
}
