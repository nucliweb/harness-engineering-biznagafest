#!/usr/bin/env node
// Reads `claude -p --output-format stream-json --verbose` NDJSON on stdin, prints one compact line per
// interesting event to stdout and tees every raw line to the file given as argv[2]. Node built-ins only.
import { appendFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { relative, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';

const oneLine = (text) => String(text ?? '').replace(/\s+/g, ' ').trim();
const cut = (text, n) => oneLine(text).slice(0, n);

function relPath(file, cwd) {
  if (typeof file !== 'string') return '';
  if (isAbsolute(file) && cwd) {
    const rel = relative(cwd, file);
    if (rel && !rel.startsWith('..')) return rel;
  }
  return file;
}

function shortArg(name, input = {}, cwd) {
  switch (name) {
    case 'Agent':
      return oneLine(input.subagent_type || input.description);
    case 'Bash':
      return cut(String(input.command ?? '').split('\n')[0], 80);
    case 'Edit':
    case 'Write':
    case 'Read':
    case 'MultiEdit':
      return relPath(input.file_path, cwd);
    case 'Grep':
    case 'Glob':
      return cut(input.pattern, 80);
    default:
      return '';
  }
}

function resultText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((b) => (typeof b?.text === 'string' ? b.text : '')).join(' ');
  return '';
}

export function formatEvent(event, { cwd = process.cwd() } = {}) {
  if (!event || typeof event !== 'object') return [];
  const blocks = Array.isArray(event.message?.content) ? event.message.content : [];
  const out = [];
  if (event.type === 'assistant') {
    for (const b of blocks) {
      if (b.type === 'text' && oneLine(b.text) !== '') out.push(`  · ${cut(b.text, 120)}`);
      else if (b.type === 'tool_use') out.push(`▶ ${b.name} ${shortArg(b.name, b.input, cwd)}`.trimEnd());
    }
  } else if (event.type === 'user') {
    for (const b of blocks) {
      if (b.type === 'tool_result') out.push(`  ${b.is_error ? '✗' : '✓'} ${cut(resultText(b.content), 100)}`.trimEnd());
    }
  } else if (event.type === 'result') {
    const cost = Number(event.total_cost_usd ?? 0).toFixed(4);
    const secs = (Number(event.duration_ms ?? 0) / 1000).toFixed(1);
    out.push(`■ ${event.subtype} turns=${event.num_turns} cost=$${cost} time=${secs}s`);
  }
  return out;
}

function main(teeFile) {
  if (teeFile) writeFileSync(teeFile, '');
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  rl.on('line', (line) => {
    if (teeFile) appendFileSync(teeFile, `${line}\n`);
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      return;
    }
    for (const l of formatEvent(event)) process.stdout.write(`${l}\n`);
  });
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) main(process.argv[2]);
