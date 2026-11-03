import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installFakeClaude, resultJson } from './test-support/fake-claude.mjs';

const script = join(dirname(fileURLToPath(import.meta.url)), 'adversarial-review.sh');

// A throwaway git repo with two commits so `git diff main..feature` is non-empty.
function repo(withChange = true) {
  const dir = mkdtempSync(join(tmpdir(), 'review-repo-'));
  const git = (...a) => spawnSync('git', ['-C', dir, '-c', 'user.name=t', '-c', 'user.email=t@t.t', ...a], { encoding: 'utf8' });
  git('init', '-q', '-b', 'main');
  writeFileSync(join(dir, 'a.ts'), 'export const a = 1;\n');
  git('add', '.');
  git('commit', '-q', '-m', 'base');
  git('checkout', '-q', '-b', 'feature');
  if (withChange) writeFileSync(join(dir, 'a.ts'), 'export const a = 2;\n');
  git('commit', '-q', '-am', 'change', '--allow-empty');
  return dir;
}

const say = (text) => resultJson({ result: text });
const F1 = 'FINDING 1: a.ts:1 — a changed to 2 without a test';
const F2 = 'FINDING 2: a.ts:1 — export is not documented';

function run(fake, dir, args = ['main', 'feature']) {
  return spawnSync('bash', [script, ...args], { encoding: 'utf8', env: { ...fake.env(), REVIEW_ROOT: dir } });
}

test('consensus in round 1: both findings upheld, exit 0, models and tools as specified', () => {
  const fake = installFakeClaude();
  fake.reply(1, say(`${F1}\n${F2}`));
  fake.reply(2, say('VERDICT 1: UPHELD\nVERDICT 2: UPHELD'));
  const r = run(fake, repo());
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), `CONSENSUS\n${F1}\n${F2}`);
  const calls = fake.calls();
  assert.equal(calls.length, 2);
  const flags = (c) => c.args.join(' ');
  assert.match(flags(calls[0]), /-p --model opus --tools Read,Grep,Glob --permission-prompts none --output-format json/);
  assert.match(flags(calls[1]), /-p --model sonnet --tools Read,Grep,Glob --permission-prompts none --output-format json/);
  assert.match(calls[0].stdin, /export const a = 2;/); // the diff reaches the reviewer
  assert.match(calls[1].stdin, /FINDING 1: a\.ts:1/); // the findings reach the rebuttal
});

test('consensus after the reviewer drops a refuted finding', () => {
  const fake = installFakeClaude();
  fake.reply(1, say(`${F1}\n${F2}`));
  fake.reply(2, say('VERDICT 1: UPHELD\nVERDICT 2: REFUTED docs are not required here'));
  fake.reply(3, say('DROP 2'));
  const r = run(fake, repo());
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), `CONSENSUS\n${F1}`);
  assert.equal(fake.calls().length, 3);
  assert.match(fake.calls()[2].args.join(' '), /--model opus/);
  assert.match(fake.calls()[2].stdin, /REFUTED: docs are not required here/);
});

test('no consensus after three rounds: exit 3 with the open items', () => {
  const fake = installFakeClaude();
  fake.reply(1, say(`${F1}\n${F2}`));
  // round 1
  fake.reply(2, say('VERDICT 1: UPHELD\nVERDICT 2: REFUTED not needed'));
  fake.reply(3, say('DEFEND 2: public exports need docs'));
  // round 2
  fake.reply(4, say('VERDICT 1: UPHELD\nVERDICT 2: REFUTED still not needed'));
  fake.reply(5, say('DEFEND 2: still true'));
  // round 3
  fake.reply(6, say('VERDICT 1: UPHELD\nVERDICT 2: REFUTED final no'));
  const r = run(fake, repo());
  assert.equal(r.status, 3, r.stderr);
  assert.match(r.stdout, /^NO CONSENSUS\n/);
  assert.match(r.stdout, /Open items/);
  assert.match(r.stdout, /FINDING 2: a\.ts:1 — export is not documented\n\s+REFUTED: final no\n\s+DEFENCE: still true/);
  assert.match(r.stdout, /Agreed:\nFINDING 1:/);
  assert.equal(fake.calls().length, 6);
  assert.match(fake.calls()[3].stdin, /DEFENCE: public exports need docs/); // the defence reaches round 2
});

test('a reviewer that finds nothing is a consensus without a rebuttal pass', () => {
  const fake = installFakeClaude();
  fake.reply(1, say('NO FINDINGS'));
  const r = run(fake, repo());
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), 'CONSENSUS\nNo findings.');
  assert.equal(fake.calls().length, 1);
});

test('an empty diff never calls the model', () => {
  const fake = installFakeClaude();
  const r = run(fake, repo(false));
  assert.equal(r.status, 0);
  assert.match(r.stdout, /CONSENSUS/);
  assert.equal(fake.calls().length, 0);
});

test('a failing claude call exits 1 and prints neither verdict', () => {
  const fake = installFakeClaude();
  fake.reply(1, say('x'), { exit: 1 });
  const r = run(fake, repo());
  assert.equal(r.status, 1);
  assert.doesNotMatch(r.stdout, /CONSENSUS/);
});

test('an is_error result exits 1', () => {
  const fake = installFakeClaude();
  fake.reply(1, resultJson({ is_error: true, result: 'rate limited' }));
  assert.equal(run(fake, repo()).status, 1);
});

test('wrong argument count exits 2', () => {
  const fake = installFakeClaude();
  assert.equal(run(fake, repo(), ['main']).status, 2);
});

test('a bad revision exits 1', () => {
  const fake = installFakeClaude();
  assert.equal(run(fake, repo(), ['nope', 'feature']).status, 1);
});

test('unparsable reviewer output is an error, never a consensus', () => {
  const fake = installFakeClaude();
  fake.reply(1, say('Everything looks great to me, ship it.'));
  const r = run(fake, repo());
  assert.equal(r.status, 1);
  assert.match(r.stderr, /reviewer output unparsable/);
  assert.doesNotMatch(r.stdout, /CONSENSUS/);
  assert.equal(fake.calls().length, 1);
});
