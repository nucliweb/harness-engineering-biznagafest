import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const hook = join(dirname(fileURLToPath(import.meta.url)), 'post-edit-eslint.sh');

// A project dir with a fake pnpm that logs its args and exits with FAKE_PNPM_EXIT.
function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'hook-'));
  const bin = join(dir, 'bin');
  mkdirSync(bin);
  const log = join(dir, 'pnpm.log');
  writeFileSync(
    join(bin, 'pnpm'),
    `#!/bin/sh\necho "$@" >> "${log}"\nif [ "\${FAKE_PNPM_EXIT:-0}" != "0" ]; then echo "error  no-restricted-imports  ui must not import agenda"; exit "$FAKE_PNPM_EXIT"; fi\n`,
  );
  chmodSync(join(bin, 'pnpm'), 0o755);
  return { dir, bin, log };
}

function run(env, payload, { pnpm = true } = {}) {
  // Keep node reachable but drop any real pnpm from PATH.
  const nodeDir = dirname(process.execPath);
  const path = [pnpm ? env.bin : '', nodeDir, '/usr/bin', '/bin'].filter(Boolean).join(':');
  return spawnSync('bash', [hook], {
    input: typeof payload === 'string' ? payload : JSON.stringify(payload),
    encoding: 'utf8',
    env: { PATH: path, CLAUDE_PROJECT_DIR: env.dir, FAKE_PNPM_EXIT: env.exit ?? '0' },
  });
}

const edit = (file_path, tool_name = 'Edit') => ({ hook_event_name: 'PostToolUse', tool_name, tool_input: { file_path } });

test('runs pnpm lint:file on an edited .ts file under packages/ and exits 0 when lint passes', () => {
  const env = setup();
  const file = join(env.dir, 'packages/core/src/talks.ts');
  const r = run(env, edit(file));
  assert.equal(r.status, 0);
  assert.equal(readFileSync(env.log, 'utf8').trim(), `lint:file ${file}`);
});

test('exits 2 and prints the lint output to stderr when lint fails', () => {
  const env = setup();
  env.exit = '1';
  const r = run(env, edit(join(env.dir, 'apps/agenda/src/App.tsx'), 'Write'));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /no-restricted-imports/);
});

for (const [name, rel] of [
  ['a markdown file', 'packages/core/README.md'],
  ['a .ts file outside apps and packages', 'scripts/x.ts'],
  ['a .ts file in .claude', '.claude/hooks/x.ts'],
]) {
  test(`ignores ${name}`, () => {
    const env = setup();
    env.exit = '1';
    const r = run(env, edit(join(env.dir, rel)));
    assert.equal(r.status, 0);
    assert.equal(existsSync(env.log), false);
  });
}

test('ignores a path outside the project directory', () => {
  const env = setup();
  env.exit = '1';
  assert.equal(run(env, edit('/elsewhere/apps/x.ts')).status, 0);
  assert.equal(existsSync(env.log), false);
});

test('exits 0 on malformed or empty input', () => {
  const env = setup();
  assert.equal(run(env, 'not json').status, 0);
  assert.equal(run(env, '').status, 0);
  assert.equal(run(env, { tool_input: {} }).status, 0);
});

test('exits 0 with a one-line notice when pnpm is not available', () => {
  const env = setup();
  const r = run(env, edit(join(env.dir, 'packages/ui/src/A.tsx')), { pnpm: false });
  assert.equal(r.status, 0);
  assert.equal(r.stderr.trim().split('\n').length, 1);
  assert.match(r.stderr, /pnpm not found/);
});
