import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { METRICS_HEADER, metricsRow, parseResult } from './parse-result.mjs';

const cli = join(dirname(fileURLToPath(import.meta.url)), 'parse-result.mjs');

const OK = {
  type: 'result',
  subtype: 'success',
  is_error: false,
  result: 'Clarification written',
  duration_ms: 12345,
  num_turns: 7,
  total_cost_usd: 0.1234,
  modelUsage: {
    'claude-opus-5-5': { inputTokens: 100, outputTokens: 50, cacheReadInputTokens: 1000, cacheCreationInputTokens: 200, costUSD: 0.1 },
    'claude-haiku-5': { inputTokens: 10, outputTokens: 5, cacheReadInputTokens: 20, cacheCreationInputTokens: 3, costUSD: 0.02 },
  },
};

test('parseResult extracts the metrics fields', () => {
  const r = parseResult(JSON.stringify(OK));
  assert.equal(r.ok, true);
  assert.equal(r.is_error, false);
  assert.equal(r.subtype, 'success');
  assert.equal(r.duration_ms, 12345);
  assert.equal(r.num_turns, 7);
  assert.equal(r.total_cost_usd, 0.1234);
  assert.deepEqual(r.models, {
    'claude-opus-5-5': { input: 100, output: 50, cacheRead: 1000, cacheCreation: 200 },
    'claude-haiku-5': { input: 10, output: 5, cacheRead: 20, cacheCreation: 3 },
  });
});

test('parseResult flags is_error results', () => {
  const r = parseResult(JSON.stringify({ ...OK, is_error: true, subtype: 'error_max_turns' }));
  assert.equal(r.ok, true);
  assert.equal(r.is_error, true);
  assert.equal(r.subtype, 'error_max_turns');
});

test('parseResult accepts an event array and picks the result event', () => {
  const r = parseResult(JSON.stringify([{ type: 'system' }, OK]));
  assert.equal(r.ok, true);
  assert.equal(r.num_turns, 7);
});

test('parseResult reports unparsable output as not ok', () => {
  assert.equal(parseResult('').ok, false);
  assert.equal(parseResult('Error: boom').ok, false);
  assert.equal(parseResult('{"foo":1}').ok, false);
});

test('metricsRow renders a markdown row with per-model tokens', () => {
  const row = metricsRow('FEATURE-1', 'spec-clarify', parseResult(JSON.stringify(OK)));
  assert.equal(row, '| FEATURE-1 | spec-clarify | success | 12345 | 7 | 0.1234 | claude-opus-5-5 100/50; claude-haiku-5 10/5 | 1020 | 203 |');
});

test('metricsRow uses dashes when the output was unparsable', () => {
  assert.equal(metricsRow('FEATURE-1', 'spec-plan', parseResult('boom')), '| FEATURE-1 | spec-plan | unparsable | - | - | - | - | - | - |');
});

test('METRICS_HEADER is a markdown table header', () => {
  assert.match(METRICS_HEADER, /\| ticket \| phase \| status \| duration_ms \| num_turns \| total_cost_usd \| models.*\| cache_read \| cache_creation \|/);
});

test('CLI row and field subcommands', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'pr-')), 'out.json');
  writeFileSync(file, JSON.stringify(OK));
  const row = spawnSync('node', [cli, 'row', 'FEATURE-1', 'spec-clarify', file], { encoding: 'utf8' });
  assert.equal(row.status, 0);
  assert.match(row.stdout, /^\| FEATURE-1 \| spec-clarify \| success \|/);
  const err = spawnSync('node', [cli, 'field', 'is_error', file], { encoding: 'utf8' });
  assert.equal(err.stdout.trim(), 'false');
  const res = spawnSync('node', [cli, 'field', 'result', file], { encoding: 'utf8' });
  assert.equal(res.stdout.trim(), 'Clarification written');
});

test('CLI field is_error is true for unparsable output', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'pr-')), 'out.json');
  writeFileSync(file, 'garbage');
  const r = spawnSync('node', [cli, 'field', 'is_error', file], { encoding: 'utf8' });
  assert.equal(r.stdout.trim(), 'true');
});

test('cost is formatted with four decimals', () => {
  const row = metricsRow('FEATURE-1', 'p', parseResult(JSON.stringify({ ...OK, total_cost_usd: 0.1 })));
  assert.match(row, /\| 0\.1000 \|/);
});

test('parseResult reads NDJSON and picks the last result line', () => {
  const ndjson = [
    JSON.stringify({ type: 'system', subtype: 'init' }),
    JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: 'first', num_turns: 1 }),
    JSON.stringify(OK),
    '',
  ].join('\n');
  const r = parseResult(ndjson);
  assert.equal(r.ok, true);
  assert.equal(r.result, 'Clarification written');
  assert.equal(r.num_turns, 7);
});

test('parseResult treats NDJSON without a result line as unparsable (the run was cut short)', () => {
  const r = parseResult(JSON.stringify({ type: 'system', subtype: 'init' }) + '\n' + JSON.stringify({ type: 'assistant' }) + '\n');
  assert.equal(r.ok, false);
});
