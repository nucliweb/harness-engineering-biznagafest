// Test helper: installs a fake `claude` executable that returns canned output.
// Used only by tests, never by the harness itself.
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const FAKE = `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const dir = process.env.FAKE_CLAUDE_DIR;
const args = process.argv.slice(2);
let stdin = '';
try { stdin = fs.readFileSync(0, 'utf8'); } catch {}
const log = path.join(dir, 'calls.jsonl');
const n = (fs.existsSync(log) ? fs.readFileSync(log, 'utf8').split('\\n').filter(Boolean).length : 0) + 1;
fs.appendFileSync(log, JSON.stringify({ n, args, stdin, cwd: process.cwd(), env: { SPEC_HEADLESS: process.env.SPEC_HEADLESS } }) + '\\n');
const pi = args.indexOf('-p');
const prompt = pi >= 0 && args[pi + 1] && !args[pi + 1].startsWith('--') ? args[pi + 1] : '';
const skill = /^\\/(spec-[a-z]+) ([A-Z]+-\\d+)$/.exec(prompt);
const key = skill ? skill[1] : String(n);
const read = (ext) => { const f = path.join(dir, key + ext); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null; };
if (skill && read('.blocked') !== null) {
  const d = path.join(process.cwd(), 'specs', skill[2]);
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, 'BLOCKED.md'), read('.blocked'));
}
const files = read('.files');
if (skill && files !== null) {
  for (const [rel, content] of Object.entries(JSON.parse(files))) {
    const f = path.join(process.cwd(), rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, content);
  }
}
const body = read('.json');
const fallback = JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: 'ok', duration_ms: 1, num_turns: 1, total_cost_usd: 0.01, modelUsage: {} });
if (args.includes('stream-json')) {
  let result;
  try { result = JSON.parse(body ?? fallback); } catch { result = null; }
  const out = [{ type: 'system', subtype: 'init', session_id: 's1' }];
  if (result) {
    out.push({ type: 'assistant', message: { content: [{ type: 'text', text: 'Working on it' }, { type: 'tool_use', id: 't1', name: 'Bash', input: { command: 'pnpm lint' } }] } });
    out.push({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't1', is_error: false, content: 'lint clean' }] } });
    out.push(result);
  }
  process.stdout.write(out.map((e) => JSON.stringify(e)).join('\\n') + (result ? '\\n' : (body ?? '')));
} else {
  process.stdout.write(body ?? fallback);
}
process.exit(Number((read('.exit') ?? '0').trim()));
`;

export function installFakeClaude() {
  const dir = mkdtempSync(join(tmpdir(), 'fake-claude-'));
  const bin = join(dir, 'bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'claude'), FAKE.replace("require('node:fs')", "require('node:fs')"));
  chmodSync(join(bin, 'claude'), 0o755);
  return {
    dir,
    bin,
    // Canned reply for a skill name (headless) or the n-th call (adversarial review).
    reply(key, json, { exit = 0, blocked, files } = {}) {
      if (files !== undefined) writeFileSync(join(dir, `${key}.files`), JSON.stringify(files));
      writeFileSync(join(dir, `${key}.json`), typeof json === 'string' ? json : JSON.stringify(json));
      if (exit !== 0) writeFileSync(join(dir, `${key}.exit`), String(exit));
      if (blocked !== undefined) writeFileSync(join(dir, `${key}.blocked`), blocked);
    },
    calls() {
      const f = join(dir, 'calls.jsonl');
      return existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
    },
    env() {
      return { ...process.env, PATH: `${bin}:${process.env.PATH}`, FAKE_CLAUDE_DIR: dir };
    },
  };
}

export const resultJson = (over = {}) => ({
  type: 'result',
  subtype: 'success',
  is_error: false,
  result: 'ok',
  duration_ms: 1000,
  num_turns: 3,
  total_cost_usd: 0.05,
  modelUsage: { 'claude-sonnet-5-5': { inputTokens: 100, outputTokens: 20, cacheReadInputTokens: 300, cacheCreationInputTokens: 40, costUSD: 0.05 } },
  ...over,
});
