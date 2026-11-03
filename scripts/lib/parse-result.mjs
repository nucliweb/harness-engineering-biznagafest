#!/usr/bin/env node
// Parses `claude -p --output-format json` output for scripts/headless.sh. Node built-ins only.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const METRICS_HEADER = [
  '| ticket | phase | status | duration_ms | num_turns | total_cost_usd | models (input/output tokens) | cache_read | cache_creation |',
  '|---|---|---|---|---|---|---|---|---|',
].join('\n');

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

// NDJSON from `--output-format stream-json`: the last line whose type is "result".
function lastResultLine(text) {
  const lines = String(text ?? '').split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const obj = parseJson(lines[i]);
    if (obj && typeof obj === 'object' && obj.type === 'result') return obj;
  }
  return null;
}

export function parseResult(text) {
  const unparsable = { ok: false, is_error: true, subtype: 'unparsable', result: String(text ?? '').trim() };
  let data = parseJson(text);
  if (data === undefined) data = lastResultLine(text);
  if (Array.isArray(data)) data = data.find((e) => e && e.type === 'result') ?? null;
  if (!data || typeof data !== 'object' || !('is_error' in data || 'result' in data)) return unparsable;
  const models = {};
  for (const [name, u] of Object.entries(data.modelUsage ?? {})) {
    models[name] = {
      input: u.inputTokens ?? 0,
      output: u.outputTokens ?? 0,
      cacheRead: u.cacheReadInputTokens ?? 0,
      cacheCreation: u.cacheCreationInputTokens ?? 0,
    };
  }
  return {
    ok: true,
    is_error: data.is_error === true,
    subtype: data.subtype ?? 'unknown',
    result: typeof data.result === 'string' ? data.result : '',
    duration_ms: data.duration_ms,
    num_turns: data.num_turns,
    total_cost_usd: data.total_cost_usd,
    models,
  };
}

export function metricsRow(ticket, phase, parsed) {
  if (!parsed.ok) return `| ${ticket} | ${phase} | unparsable | - | - | - | - | - | - |`;
  const models =
    Object.entries(parsed.models)
      .map(([name, u]) => `${name} ${u.input}/${u.output}`)
      .join('; ') || '-';
  const sum = (k) => Object.values(parsed.models).reduce((a, u) => a + u[k], 0);
  const cost = typeof parsed.total_cost_usd === 'number' ? parsed.total_cost_usd.toFixed(4) : '-';
  return `| ${ticket} | ${phase} | ${parsed.subtype} | ${parsed.duration_ms ?? '-'} | ${parsed.num_turns ?? '-'} | ${cost} | ${models} | ${sum('cacheRead')} | ${sum('cacheCreation')} |`;
}

function main(argv) {
  const [cmd, ...rest] = argv;
  if (cmd === 'header') {
    console.log(METRICS_HEADER);
  } else if (cmd === 'row') {
    const [ticket, phase, file] = rest;
    console.log(metricsRow(ticket, phase, parseResult(safeRead(file))));
  } else if (cmd === 'field') {
    const [name, file] = rest;
    const parsed = parseResult(safeRead(file));
    const value = parsed[name];
    console.log(value === undefined ? '' : String(value));
  } else {
    console.error('usage: parse-result.mjs header | row <ticket> <phase> <file> | field <is_error|subtype|result> <file>');
    return 1;
  }
  return 0;
}

function safeRead(file) {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) process.exit(main(process.argv.slice(2)));
