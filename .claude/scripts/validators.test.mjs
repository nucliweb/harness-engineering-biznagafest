import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

function run(validator, fixture) {
  const file = join(here, 'fixtures', fixture);
  const r = spawnSync('node', [join(here, `validate-${validator}.mjs`), file], { encoding: 'utf8' });
  return { code: r.status, lines: r.stdout.split('\n').filter(Boolean), file };
}

const CASES = {
  clarification: {
    valid: ['clarification/valid.md'],
    invalid: [
      ['clarification/invalid-missing-heading.md', 'missing-heading', 'Code anchors'],
      ['clarification/invalid-empty-section.md', 'empty-section', 'Out of scope'],
      ['clarification/invalid-open-question.md', 'open-questions', 'Open questions'],
      ['clarification/invalid-heading-order.md', 'heading-order', 'order'],
    ],
  },
  design: {
    valid: ['design/valid.md'],
    invalid: [
      ['design/invalid-one-alternative.md', 'alternatives-count', 'at least two'],
      ['design/invalid-open-decision.md', 'decision-not-closed', 'D2'],
      ['design/invalid-forbidden-word.md', 'forbidden-word', 'TBD'],
      ['design/invalid-no-cons-label.md', 'alternative-pros-cons', 'A1'],
    ],
  },
  plan: {
    valid: ['plan/valid.md'],
    invalid: [
      ['plan/invalid-step-no-path.md', 'step-path', 'S3'],
      ['plan/invalid-dod-not-ears.md', 'dod-ears', 'The ui'],
      ['plan/invalid-audit-blocking.md', 'audit-blocking', 'Blocking: 2'],
      ['plan/invalid-missing-interface.md', 'interfaces-missing', 'ui'],
      ['plan/invalid-scope-files-mismatch.md', 'scope-files-mismatch', '6'],
      ['plan/invalid-scope-verdict-single-too-big.md', 'scope-verdict-mismatch', 'Single PR'],
      ['plan/invalid-scope-verdict-split-too-small.md', 'scope-verdict-mismatch', 'Split'],
      ['plan/invalid-dod-layer.md', 'dod-ears', 'somewhere'],
    ],
  },
};

for (const [validator, { valid, invalid }] of Object.entries(CASES)) {
  for (const fixture of valid) {
    test(`validate-${validator} accepts ${fixture}`, () => {
      const r = run(validator, fixture);
      assert.deepEqual(r.lines, []);
      assert.equal(r.code, 0);
    });
  }
  for (const [fixture, rule, mention] of invalid) {
    test(`validate-${validator} rejects ${fixture} with rule ${rule}`, () => {
      const r = run(validator, fixture);
      assert.equal(r.code, 1);
      const hit = r.lines.filter((l) => l.startsWith(`${r.file}: ${rule}: `));
      assert.ok(hit.length >= 1, `expected rule ${rule}, got:\n${r.lines.join('\n')}`);
      assert.ok(hit.some((l) => l.includes(mention)), `expected "${mention}" in:\n${hit.join('\n')}`);
      // each fixture fails for exactly its own reason
      const otherRules = r.lines.filter((l) => !l.startsWith(`${r.file}: ${rule}: `));
      assert.deepEqual(otherRules, []);
    });
  }
}

test('validators exit 1 on an unreadable file', () => {
  const r = spawnSync('node', [join(here, 'validate-plan.mjs'), '/nonexistent/x.md'], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /file-unreadable/);
});

test('a plan file fails the clarification validator on the title rule only', () => {
  const r = run('clarification', 'plan/valid.md');
  assert.equal(r.code, 1);
  assert.ok(r.lines.some((l) => l.startsWith(`${r.file}: title: `) && l.includes('Clarification')), r.lines.join('\n'));
});

test('a title with a lowercase ticket id fails the title rule', () => {
  const dir = mkdtempSync(join(tmpdir(), 'title-'));
  const file = join(dir, 'c.md');
  writeFileSync(file, readFileSync(join(here, 'fixtures/clarification/valid.md'), 'utf8').replace('# FEATURE-1', '# demo-1'));
  const r = spawnSync('node', [join(here, 'validate-clarification.mjs'), file], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /: title: /);
});
