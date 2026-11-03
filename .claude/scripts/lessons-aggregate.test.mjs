import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { aggregate, layerOf, normalise } from './lessons-aggregate.mjs';

const here = dirname(fileURLToPath(import.meta.url));

function repo(journals, lessons) {
  const root = mkdtempSync(join(tmpdir(), 'lessons-'));
  for (const [ticket, entries] of Object.entries(journals)) {
    const dir = join(root, 'specs', ticket);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'journal.jsonl'), entries.map((e) => JSON.stringify({ phase: 'implement', actor: 'reviewer-package', kind: 'reviewer_finding', ...e, ticket })).join('\n') + '\n');
  }
  if (lessons) {
    mkdirSync(join(root, 'specs'), { recursive: true });
    writeFileSync(join(root, 'specs/lessons.json'), JSON.stringify(lessons));
  }
  return root;
}
const read = (root) => JSON.parse(readFileSync(join(root, 'specs/lessons.json'), 'utf8'));
const e = (ts, summary, files) => ({ ts, summary, ...(files ? { files } : {}) });

test('layerOf derives the layer from the first package path, skipping spec paths, else unknown', () => {
  assert.equal(layerOf(['packages/ui/src/A.tsx']), 'ui');
  assert.equal(layerOf(['specs/FEATURE-1/03-plan.md', 'packages/ui/src/A.tsx']), 'ui');
  assert.equal(layerOf(['specs/FEATURE-1/04-dod.md']), 'unknown');
  assert.equal(layerOf(['packages/core/src/a.ts', 'packages/ui/b.ts']), 'core');
  assert.equal(layerOf(['apps/agenda/src/p.tsx']), 'agenda');
  assert.equal(layerOf(['docs/x.md']), 'unknown');
  assert.equal(layerOf(undefined), 'unknown');
});

test('normalise lowercases, trims and strips punctuation', () => {
  assert.equal(normalise('  Filtering belongs in CORE!  '), 'filtering belongs in core');
});

test('a summary seen in one ticket is a candidate', () => {
  const root = repo({ 'FEATURE-1': [e('2026-11-04T10:00:00.000Z', 'Filtering belongs in core.', ['packages/ui/a.tsx'])] });
  aggregate({ root });
  const [l] = read(root);
  assert.equal(l.id, 'L1');
  assert.equal(l.status, 'candidate');
  assert.equal(l.layer, 'ui');
  assert.deepEqual(l.tickets, ['FEATURE-1']);
  assert.deepEqual(l.kinds, ['reviewer_finding']);
  assert.equal(l.first_seen, '2026-11-04');
});

test('the same normalised summary in two tickets is confirmed; same ticket twice is not', () => {
  const root = repo({
    'FEATURE-1': [e('2026-11-04T10:00:00.000Z', 'Filtering belongs in core.', ['packages/ui/a.tsx']), e('2026-11-04T11:00:00.000Z', 'Repeat in same ticket', ['packages/ui/a.tsx']), e('2026-11-04T11:05:00.000Z', 'repeat in same ticket!', ['packages/ui/a.tsx'])],
    'FEATURE-2': [e('2026-11-06T10:00:00.000Z', 'filtering belongs in CORE', ['packages/ui/b.tsx'])],
  });
  aggregate({ root });
  const lessons = read(root);
  const filtering = lessons.find((l) => l.text === 'Filtering belongs in core.');
  assert.equal(filtering.status, 'confirmed');
  assert.deepEqual(filtering.tickets, ['FEATURE-1', 'FEATURE-2']);
  assert.equal(filtering.last_seen, '2026-11-06');
  const repeat = lessons.find((l) => /repeat/i.test(l.text));
  assert.equal(repeat.status, 'candidate');
});

test('the same summary in different layers stays separate', () => {
  const root = repo({
    'FEATURE-1': [e('2026-11-04T10:00:00.000Z', 'Missing test', ['packages/ui/a.tsx'])],
    'FEATURE-2': [e('2026-11-05T10:00:00.000Z', 'Missing test', ['packages/core/a.ts'])],
  });
  aggregate({ root });
  assert.equal(read(root).length, 2);
  assert.ok(read(root).every((l) => l.status === 'candidate'));
});

test('existing ids, text and applied status are preserved; nothing is demoted or deleted', () => {
  const existing = [
    { id: 'L7', text: 'Old applied lesson', layer: 'core', kinds: ['deviation'], tickets: ['FEATURE-1'], status: 'applied', first_seen: '2026-01-01', last_seen: '2026-01-01' },
    { id: 'L9', text: 'Filtering belongs in core', layer: 'ui', kinds: ['reviewer_finding'], tickets: ['FEATURE-1', 'FEATURE-2'], status: 'confirmed', first_seen: '2026-01-01', last_seen: '2026-01-02' },
    { id: 'L2', text: 'No longer in any journal', layer: 'agenda', kinds: ['deviation'], tickets: ['FEATURE-1'], status: 'candidate', first_seen: '2026-01-01', last_seen: '2026-01-01' },
  ];
  const root = repo({ 'FEATURE-3': [e('2026-11-04T10:00:00.000Z', 'Old applied lesson', ['packages/core/x.ts']), e('2026-11-04T10:01:00.000Z', 'Brand new', ['apps/agenda/p.tsx'])] }, existing);
  aggregate({ root });
  const out = read(root);
  assert.deepEqual(out.map((l) => l.id), ['L2', 'L7', 'L9', 'L10']);
  const l7 = out.find((l) => l.id === 'L7');
  assert.equal(l7.status, 'applied');
  assert.deepEqual(l7.tickets, ['FEATURE-1', 'FEATURE-3']);
  assert.equal(out.find((l) => l.id === 'L9').status, 'confirmed');
  assert.equal(out.find((l) => l.id === 'L2').status, 'candidate');
  assert.equal(out.find((l) => l.id === 'L10').text, 'Brand new');
});

test('an existing candidate is promoted when a second ticket shows up', () => {
  const existing = [{ id: 'L1', text: 'Same thing', layer: 'ui', kinds: ['deviation'], tickets: ['FEATURE-1'], status: 'candidate', first_seen: '2026-11-01', last_seen: '2026-11-01' }];
  const root = repo({ 'FEATURE-2': [{ ...e('2026-11-05T10:00:00.000Z', 'same thing', ['packages/ui/a.tsx']), kind: 'deviation' }] }, existing);
  aggregate({ root });
  assert.equal(read(root)[0].status, 'confirmed');
});

test('output is deterministic and byte identical on a second run', () => {
  const root = repo({
    'FEATURE-2': [e('2026-11-05T10:00:00.000Z', 'b thing', ['packages/ui/a.tsx']), e('2026-11-05T10:00:00.000Z', 'a thing', ['packages/ui/a.tsx'])],
    'FEATURE-1': [e('2026-11-04T10:00:00.000Z', 'c thing', ['packages/core/a.ts'])],
  });
  aggregate({ root });
  const first = readFileSync(join(root, 'specs/lessons.json'), 'utf8');
  aggregate({ root });
  assert.equal(readFileSync(join(root, 'specs/lessons.json'), 'utf8'), first);
  assert.deepEqual(read(root).map((l) => l.text), ['c thing', 'a thing', 'b thing']);
});

test('malformed lines and the _unassigned folder are ignored', () => {
  const root = repo({ 'FEATURE-1': [e('2026-11-04T10:00:00.000Z', 'Real', ['packages/ui/a.tsx'])], _unassigned: [e('2026-11-04T10:00:00.000Z', 'Orphan')] });
  const dir = join(root, 'specs/FEATURE-1');
  writeFileSync(join(dir, 'journal.jsonl'), readFileSync(join(dir, 'journal.jsonl'), 'utf8') + 'not json\n');
  aggregate({ root });
  assert.deepEqual(read(root).map((l) => l.text), ['Real']);
});

test('CLI exits 0 and writes lessons.json', () => {
  const root = repo({ 'FEATURE-1': [e('2026-11-04T10:00:00.000Z', 'Real', ['packages/ui/a.tsx'])] });
  const r = spawnSync('node', [join(here, 'lessons-aggregate.mjs'), '--root', root], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(read(root).length, 1);
});

test('with no journals the result is an empty list', () => {
  const root = mkdtempSync(join(tmpdir(), 'lessons-'));
  aggregate({ root });
  assert.deepEqual(read(root), []);
});
