import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installFakeClaude, resultJson } from './test-support/fake-claude.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, 'headless.sh');
const fixtures = join(here, '../.claude/scripts/fixtures');
const PHASES = ['spec-clarify', 'spec-plan', 'spec-implement', 'spec-validate'];

const CLARIFICATION = readFileSync(join(fixtures, 'clarification/valid.md'), 'utf8');
const PLAN = readFileSync(join(fixtures, 'plan/valid.md'), 'utf8');
const TICKED = PLAN.replaceAll('- [ ]', '- [x]');
const DOD = (verdict) => `# FEATURE-1 · Definition of done\n\n## Checks\n\n| check | result | notes |\n|---|---|---|\n| lint | PASS | |\n\n## Suppressions\n- None\n\n## Verdict\n\n${verdict}\n`;
const S = 'specs/FEATURE-1';

// Replies that make every phase leave a valid artefact, so the deterministic checks pass.
function happy(fake, overrides = {}, results = {}) {
  const art = {
    'spec-clarify': { [`${S}/00-clarification.md`]: CLARIFICATION },
    'spec-plan': { [`${S}/03-plan.md`]: PLAN },
    'spec-implement': { [`${S}/03-plan.md`]: TICKED },
    'spec-validate': { [`${S}/04-dod.md`]: DOD('GREEN') },
    ...overrides,
  };
  PHASES.forEach((p, i) => fake.reply(p, results[p] ?? resultJson({ duration_ms: 1000 + i, num_turns: i + 1, total_cost_usd: 0.1 * (i + 1) }), { files: art[p] }));
}

function repoRoot() {
  const root = mkdtempSync(join(tmpdir(), 'headless-root-'));
  spawnSync('git', ['init', '-q', root]);
  return root;
}

// The runner's own env vars must not leak in from the process running the tests:
// `pnpm test` runs inside headless runs too (validator-global), with CLAUDE_FLAGS set.
const RUNNER_VARS = ['CLAUDE_FLAGS', 'SPEC_HEADLESS', 'HEADLESS_ALLOW_DIRTY'];
function run(fake, { ticket = 'FEATURE-1', extraEnv = {}, root = repoRoot() } = {}) {
  const base = { ...fake.env(), HEADLESS_ROOT: root };
  for (const name of RUNNER_VARS) delete base[name];
  const r = spawnSync('bash', [script, ticket], {
    encoding: 'utf8',
    env: { ...base, ...extraEnv },
  });
  return { ...r, root };
}
const metrics = (root) => readFileSync(join(root, 'docs/run-metrics.md'), 'utf8');
const rows = (root) => metrics(root).split('\n').filter((l) => l.startsWith('| FEATURE-1 '));
const blocked = (root) => readFileSync(join(root, S, 'BLOCKED.md'), 'utf8');

test('success: runs the four skills in order with stream-json, the narrowed allow list and SPEC_HEADLESS=1', () => {
  const fake = installFakeClaude();
  happy(fake);
  const r = run(fake);
  assert.equal(r.status, 0, r.stderr);
  const calls = fake.calls();
  assert.deepEqual(calls.map((c) => c.args[1]), PHASES.map((p) => `/${p} FEATURE-1`));
  for (const c of calls) {
    const line = c.args.join(' ');
    assert.ok(line.includes('--output-format stream-json --verbose --append-system-prompt'), line);
    assert.ok(line.includes('specs/FEATURE-1/BLOCKED.md'), 'the note names the real ticket');
    assert.ok(!line.includes('<TICKET>'));
    assert.ok(line.includes('--allowedTools Read Grep Glob Edit Write Agent Bash(pnpm --version) Bash(pnpm lint*) Bash(pnpm typecheck*) Bash(pnpm test*) Bash(pnpm build*) Bash(pnpm --filter *) Bash(pnpm exec vitest *) Bash(node .claude/scripts/*) Bash(node --test*) Bash(git diff*)'), line);
    assert.ok(!line.includes('rtk'));
    assert.ok(!line.includes('Bash(node *)') && !line.includes('Bash(pnpm *)') && !line.includes('Bash(npx'));
    assert.ok(line.endsWith('--model opus --permission-mode acceptEdits --permission-prompts none --max-turns 150'), line);
    assert.equal(c.env.SPEC_HEADLESS, '1');
  }
  const out = rows(r.root);
  assert.equal(out.length, 4);
  assert.match(out[0], /^\| FEATURE-1 \| spec-clarify \| success \| 1000 \| 1 \| 0\.1000 \| claude-sonnet-5-5 100\/20 \| 300 \| 40 \|$/);
  assert.match(metrics(r.root), /^# Run metrics/);
});

test('live output: compact event lines reach stdout and the metrics come from the NDJSON result line', () => {
  const fake = installFakeClaude();
  happy(fake);
  const r = run(fake);
  assert.equal(r.status, 0, r.stderr);
  const lines = r.stdout.split('\n').filter(Boolean);
  assert.equal(lines.filter((l) => l === '▶ Bash pnpm lint').length, 4);
  assert.equal(lines.filter((l) => l === '  ✓ lint clean').length, 4);
  assert.ok(lines.includes('  · Working on it'));
  assert.ok(lines.some((l) => /^■ success turns=1 cost=\$0\.1000 time=1\.0s$/.test(l)), r.stdout);
});

test('metrics file is appended to, not rewritten, across runs', () => {
  const fake = installFakeClaude();
  happy(fake);
  const first = run(fake);
  assert.equal(first.status, 0, first.stderr);
  const dirty = readFileSync(join(first.root, S, '03-plan.md'), 'utf8');
  assert.equal(dirty, TICKED);
  const second = run(fake, { root: first.root });
  assert.equal(second.status, 0, second.stderr);
  assert.equal(rows(first.root).length, 8);
  assert.equal(metrics(first.root).match(/# Run metrics/g).length, 1);
});

test('CLAUDE_FLAGS overrides the default flags', () => {
  const fake = installFakeClaude();
  happy(fake);
  const r = run(fake, { extraEnv: { CLAUDE_FLAGS: '--max-turns 5 --model haiku' } });
  assert.equal(r.status, 0, r.stderr);
  const line = fake.calls()[0].args.join(' ');
  assert.ok(line.endsWith('--max-turns 5 --model haiku'), line);
  assert.ok(!line.includes('acceptEdits'));
});

test('is_error stops the run, records the row, writes BLOCKED.md and exits 1', () => {
  const fake = installFakeClaude();
  happy(fake, {}, { 'spec-plan': resultJson({ is_error: true, subtype: 'error_max_turns', result: 'ran out of turns' }) });
  const r = run(fake);
  assert.equal(r.status, 1);
  assert.deepEqual(fake.calls().map((c) => c.args[1]), ['/spec-clarify FEATURE-1', '/spec-plan FEATURE-1']);
  assert.equal(rows(r.root).length, 2);
  assert.match(rows(r.root)[1], /error_max_turns/);
  assert.match(blocked(r.root), /SETUP_ERROR/);
  assert.match(blocked(r.root), /ran out of turns/);
  const journal = readFileSync(join(r.root, S, 'journal.jsonl'), 'utf8');
  assert.equal(JSON.parse(journal.trim()).kind, 'blocked');
});

test('a non-zero exit code stops the run', () => {
  const fake = installFakeClaude();
  happy(fake);
  fake.reply('spec-clarify', 'Error: crashed', { exit: 3 });
  const r = run(fake);
  assert.equal(r.status, 1);
  assert.equal(fake.calls().length, 1);
  assert.match(rows(r.root)[0], /unparsable/);
});

test('BLOCKED.md created by a phase stops the run with exit 4', () => {
  const fake = installFakeClaude();
  happy(fake);
  fake.reply('spec-implement', resultJson(), { blocked: 'BLOCKED PLAN_MISMATCH\n' });
  const r = run(fake);
  assert.equal(r.status, 4);
  assert.deepEqual(fake.calls().map((c) => c.args[1]), PHASES.slice(0, 3).map((p) => `/${p} FEATURE-1`));
  assert.equal(rows(r.root).length, 3);
  assert.match(blocked(r.root), /PLAN_MISMATCH/);
});

test('refuses to start while a BLOCKED.md from an earlier run exists', () => {
  const fake = installFakeClaude();
  happy(fake);
  fake.reply('spec-clarify', resultJson(), { blocked: 'x' });
  const first = run(fake);
  assert.equal(first.status, 4);
  const calls = fake.calls().length;
  const second = run(fake, { root: first.root });
  assert.equal(second.status, 4);
  assert.equal(fake.calls().length, calls);
});

test('rejects a ticket id that does not match the pattern', () => {
  const fake = installFakeClaude();
  const r = run(fake, { ticket: 'demo-1' });
  assert.equal(r.status, 2);
  assert.equal(fake.calls().length, 0);
  assert.equal(existsSync(join(r.root, 'docs')), false);
});

test('dirty apps/ or packages/ refuses to start with exit 2 unless HEADLESS_ALLOW_DIRTY=1', () => {
  const fake = installFakeClaude();
  happy(fake);
  const root = repoRoot();
  mkdirSync(join(root, 'packages/core'), { recursive: true });
  writeFileSync(join(root, 'packages/core/a.ts'), 'export const a = 1;\n');
  const refused = run(fake, { root });
  assert.equal(refused.status, 2);
  assert.match(refused.stderr, /uncommitted changes in apps\/ or packages\//);
  assert.equal(fake.calls().length, 0);
  const allowed = run(fake, { root, extraEnv: { HEADLESS_ALLOW_DIRTY: '1' } });
  assert.equal(allowed.status, 0, allowed.stderr);
});

test('dirty files outside apps/ and packages/ do not matter', () => {
  const fake = installFakeClaude();
  happy(fake);
  const root = repoRoot();
  writeFileSync(join(root, 'notes.txt'), 'x');
  assert.equal(run(fake, { root }).status, 0);
});

// Deterministic checks: the runner does not trust the model's own report.
const CHECKS = [
  ['spec-clarify', { [`${S}/00-clarification.md`]: CLARIFICATION.replace('- None\n', '- None\n').replace('## Open questions\n- None', '## Open questions\n- Which track?') }, /validate-clarification/, 1],
  ['spec-plan', { [`${S}/03-plan.md`]: PLAN.replace('Blocking: 0', 'Blocking: 1') }, /validate-plan/, 2],
  ['spec-implement', { [`${S}/03-plan.md`]: PLAN }, /unticked/, 3],
  ['spec-validate', { [`${S}/04-dod.md`]: DOD('RED') }, /Verdict/, 4],
];
for (const [phase, files, pattern, expectedCalls] of CHECKS) {
  test(`${phase} that reports success but leaves a bad artefact is blocked with exit 4`, () => {
    const fake = installFakeClaude();
    happy(fake, { [phase]: files });
    const r = run(fake);
    assert.equal(r.status, 4, r.stderr);
    assert.equal(fake.calls().length, expectedCalls);
    assert.match(blocked(r.root), /SETUP_ERROR/);
    assert.match(blocked(r.root), pattern);
    const entry = JSON.parse(readFileSync(join(r.root, S, 'journal.jsonl'), 'utf8').trim().split('\n').at(-1));
    assert.equal(entry.kind, 'blocked');
    assert.equal(entry.actor, 'headless');
  });
}

test('spec-validate accepts GREEN WITH SUPPRESSIONS', () => {
  const fake = installFakeClaude();
  happy(fake, { 'spec-validate': { [`${S}/04-dod.md`]: DOD('GREEN WITH SUPPRESSIONS') } });
  assert.equal(run(fake).status, 0);
});

test('spec-validate without 04-dod.md is blocked', () => {
  const fake = installFakeClaude();
  happy(fake, { 'spec-validate': {} });
  const r = run(fake);
  assert.equal(r.status, 4);
  assert.match(blocked(r.root), /04-dod\.md/);
});
