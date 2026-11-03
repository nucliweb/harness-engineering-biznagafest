import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatEvent } from './format-stream.mjs';

const cli = join(dirname(fileURLToPath(import.meta.url)), 'format-stream.mjs');
const CWD = '/repo';
const tool = (name, input) => ({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 'x', name, input }] } });
const fmt = (e) => formatEvent(e, { cwd: CWD });

test('tool_use lines show the tool and a short argument', () => {
  assert.deepEqual(fmt(tool('Read', { file_path: '/repo/packages/core/src/a.ts' })), ['▶ Read packages/core/src/a.ts']);
  assert.deepEqual(fmt(tool('Edit', { file_path: '/repo/apps/x.tsx', old_string: 'a' })), ['▶ Edit apps/x.tsx']);
  assert.deepEqual(fmt(tool('Write', { file_path: '/elsewhere/y.md' })), ['▶ Write /elsewhere/y.md']);
  assert.deepEqual(fmt(tool('Agent', { subagent_type: 'explorer', description: 'find things' })), ['▶ Agent explorer']);
  assert.deepEqual(fmt(tool('Agent', { description: 'find things' })), ['▶ Agent find things']);
  assert.deepEqual(fmt(tool('Bash', { command: 'pnpm lint' })), ['▶ Bash pnpm lint']);
});

test('Bash commands are truncated to 80 characters on one line', () => {
  const [line] = fmt(tool('Bash', { command: `echo ${'a'.repeat(200)}\nsecond line` }));
  assert.equal(line, `▶ Bash ${`echo ${'a'.repeat(200)}`.slice(0, 80)}`);
});

test('other tools show their main argument when there is one', () => {
  assert.deepEqual(fmt(tool('Grep', { pattern: 'foo' })), ['▶ Grep foo']);
  assert.deepEqual(fmt(tool('Glob', { pattern: '**/*.ts' })), ['▶ Glob **/*.ts']);
  assert.deepEqual(fmt(tool('TodoWrite', {})), ['▶ TodoWrite']);
});

test('assistant text blocks print the first 120 chars', () => {
  const e = { type: 'assistant', message: { content: [{ type: 'text', text: `Line one\n${'b'.repeat(300)}` }] } };
  assert.deepEqual(fmt(e), [`  · ${`Line one ${'b'.repeat(300)}`.slice(0, 120)}`]);
});

test('one assistant message with text and tool_use prints both in order', () => {
  const e = { type: 'assistant', message: { content: [{ type: 'text', text: 'hi' }, { type: 'tool_use', name: 'Bash', input: { command: 'ls' } }] } };
  assert.deepEqual(fmt(e), ['  · hi', '▶ Bash ls']);
});

test('tool_result lines show success or failure and the first 100 chars', () => {
  const ok = { type: 'user', message: { content: [{ type: 'tool_result', content: 'all good' }] } };
  assert.deepEqual(fmt(ok), ['  ✓ all good']);
  const bad = { type: 'user', message: { content: [{ type: 'tool_result', is_error: true, content: [{ type: 'text', text: `x\n${'c'.repeat(300)}` }] }] } };
  assert.deepEqual(fmt(bad), [`  ✗ ${`x ${'c'.repeat(300)}`.slice(0, 100)}`]);
});

test('the result object prints the closing line', () => {
  const e = { type: 'result', subtype: 'success', num_turns: 12, total_cost_usd: 1.23456, duration_ms: 65432 };
  assert.deepEqual(fmt(e), ['■ success turns=12 cost=$1.2346 time=65.4s']);
});

test('everything else is silent', () => {
  assert.deepEqual(fmt({ type: 'system', subtype: 'init' }), []);
  assert.deepEqual(fmt({ type: 'stream_event' }), []);
  assert.deepEqual(fmt(null), []);
  assert.deepEqual(fmt({ type: 'user', message: { content: 'plain string' } }), []);
});

test('CLI prints compact lines and tees the raw NDJSON, tolerating junk lines', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fs-'));
  const tee = join(dir, 'raw.ndjson');
  const lines = [
    JSON.stringify({ type: 'system', subtype: 'init' }),
    'not json',
    JSON.stringify(tool('Bash', { command: 'pnpm test' })),
    JSON.stringify({ type: 'result', subtype: 'success', num_turns: 1, total_cost_usd: 0.5, duration_ms: 1000 }),
  ];
  const r = spawnSync('node', [cli, tee], { input: lines.join('\n') + '\n', encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, '▶ Bash pnpm test\n■ success turns=1 cost=$0.5000 time=1.0s\n');
  assert.equal(readFileSync(tee, 'utf8'), lines.join('\n') + '\n');
});
