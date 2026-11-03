import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { appendEntry, redact } from './lib/journal.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, 'journal-append.mjs');
const tmp = () => mkdtempSync(join(tmpdir(), 'journal-'));
const lines = (root, ticket = 'FEATURE-1') =>
  readFileSync(join(root, 'specs', ticket, 'journal.jsonl'), 'utf8').split('\n').filter(Boolean);

const base = { ticket: 'FEATURE-1', phase: 'implement', actor: 'developer-package', kind: 'autofix_failed', summary: 'Lint failed' };

test('appendEntry creates the spec folder and file and writes one JSON line with a ts', () => {
  const root = tmp();
  appendEntry({ ...base, files: ['packages/ui/a.tsx'] }, { root });
  const [line] = lines(root);
  const rec = JSON.parse(line);
  assert.match(rec.ts, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
  assert.equal(rec.ticket, 'FEATURE-1');
  assert.deepEqual(rec.files, ['packages/ui/a.tsx']);
  assert.equal('detail' in rec, false);
});

test('appendEntry appends and never rewrites earlier lines', () => {
  const root = tmp();
  appendEntry(base, { root });
  const first = lines(root)[0];
  appendEntry({ ...base, summary: 'Second' }, { root });
  const all = lines(root);
  assert.equal(all.length, 2);
  assert.equal(all[0], first);
});

test('appendEntry ignores a caller supplied ts', () => {
  const root = tmp();
  appendEntry({ ...base, ts: '1999-01-01T00:00:00.000Z' }, { root });
  assert.notEqual(JSON.parse(lines(root)[0]).ts, '1999-01-01T00:00:00.000Z');
});

test('appendEntry rejects unknown kind, phase, actor, bad ticket and empty summary', () => {
  const root = tmp();
  assert.throws(() => appendEntry({ ...base, kind: 'oops' }, { root }), /kind/);
  assert.throws(() => appendEntry({ ...base, phase: 'oops' }, { root }), /phase/);
  assert.throws(() => appendEntry({ ...base, actor: 'oops' }, { root }), /actor/);
  assert.throws(() => appendEntry({ ...base, ticket: 'demo-1' }, { root }), /ticket/);
  assert.throws(() => appendEntry({ ...base, summary: '  ' }, { root }), /summary/);
  assert.equal(existsSync(join(root, 'specs')), false);
});

test('redact replaces emails and token-like strings', () => {
  const text = 'mail person@example.com key sk-abc123XYZ tok ghp_AbC123 hex 0123456789abcdef0123456789abcdef Authorization: Bearer abc.def';
  const out = redact(text);
  assert.equal(out, 'mail [redacted] key [redacted] tok [redacted] hex [redacted] Authorization: [redacted]');
  assert.equal(redact('short hex deadbeef stays'), 'short hex deadbeef stays');
});

test('appendEntry redacts summary and detail', () => {
  const root = tmp();
  appendEntry({ ...base, summary: 'Sent to a@b.co', detail: 'token ghp_secret1' }, { root });
  const rec = JSON.parse(lines(root)[0]);
  assert.equal(rec.summary, 'Sent to [redacted]');
  assert.equal(rec.detail, 'token [redacted]');
});

test('appendEntry keeps a multi-line summary on one journal line', () => {
  const root = tmp();
  appendEntry({ ...base, summary: 'one\ntwo' }, { root });
  assert.equal(lines(root).length, 1);
});

test('CLI appends an entry and exits 0', () => {
  const root = tmp();
  const r = spawnSync('node', [script, '--root', root, '--ticket', 'FEATURE-1', '--phase', 'implement', '--actor', 'developer-package', '--kind', 'autofix_failed', '--summary', 'Boundary rule failed', '--detail', 'x', '--files', 'a.ts,b.ts'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const rec = JSON.parse(lines(root)[0]);
  assert.deepEqual(rec.files, ['a.ts', 'b.ts']);
  assert.equal(rec.detail, 'x');
});

test('CLI exits 1 with one message on an unknown kind and writes nothing', () => {
  const root = tmp();
  const r = spawnSync('node', [script, '--root', root, '--ticket', 'FEATURE-1', '--phase', 'plan', '--actor', 'main', '--kind', 'nope', '--summary', 's'], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /kind/);
  assert.equal(existsSync(join(root, 'specs')), false);
});
