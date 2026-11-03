import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseJournalBlock } from './journal-capture.mjs';

const hook = join(dirname(fileURLToPath(import.meta.url)), 'journal-capture.mjs');

function run(payload, root = mkdtempSync(join(tmpdir(), 'capture-'))) {
  const r = spawnSync('node', [hook], {
    input: typeof payload === 'string' ? payload : JSON.stringify(payload),
    encoding: 'utf8',
    env: { PATH: process.env.PATH, CLAUDE_PROJECT_DIR: root },
  });
  return { ...r, root };
}
const journal = (root, ticket) => {
  const f = join(root, 'specs', ticket, 'journal.jsonl');
  return existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
};
const stop = (message, extra = {}) => ({ hook_event_name: 'SubagentStop', stop_hook_active: false, agent_type: 'developer-package', last_assistant_message: message, ...extra });

const VALID = [
  'Done with core. Notes in specs/DEMO-1/03-plan.md.',
  '',
  'JOURNAL',
  '- kind: autofix_failed',
  '  summary: Lint boundary rule rejected the import, fixed on attempt 2',
  '  files: [packages/ui/src/TrackFilter.tsx, packages/ui/src/index.ts]',
  '- kind: deviation',
  '  summary: "Renamed a prop: it clashed with the DOM"',
  'END JOURNAL',
].join('\n');

test('parseJournalBlock reads the none form', () => {
  assert.deepEqual(parseJournalBlock('text\nJOURNAL: none'), { status: 'none' });
});

test('parseJournalBlock reads a multi-entry block', () => {
  const r = parseJournalBlock(VALID);
  assert.equal(r.status, 'entries');
  assert.equal(r.entries.length, 2);
  assert.deepEqual(r.entries[0], {
    kind: 'autofix_failed',
    summary: 'Lint boundary rule rejected the import, fixed on attempt 2',
    files: ['packages/ui/src/TrackFilter.tsx', 'packages/ui/src/index.ts'],
  });
  assert.equal(r.entries[1].summary, 'Renamed a prop: it clashed with the DOM');
});

test('parseJournalBlock reports missing and invalid blocks', () => {
  assert.equal(parseJournalBlock('no block here').status, 'missing');
  assert.equal(parseJournalBlock('').status, 'missing');
  assert.equal(parseJournalBlock('JOURNAL\n- kind: nope\n  summary: x\nEND JOURNAL').status, 'invalid');
  assert.equal(parseJournalBlock('JOURNAL\n- kind: deviation\nEND JOURNAL').status, 'invalid');
  assert.equal(parseJournalBlock('JOURNAL\nEND JOURNAL').status, 'invalid');
});

test('valid block: appends every entry with actor, derived phase, and ticket from the report', () => {
  const r = run(stop(VALID));
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, '');
  const entries = journal(r.root, 'DEMO-1');
  assert.equal(entries.length, 2);
  assert.equal(entries[0].actor, 'developer-package');
  assert.equal(entries[0].phase, 'implement');
  assert.equal(entries[0].kind, 'autofix_failed');
  assert.deepEqual(entries[0].files, ['packages/ui/src/TrackFilter.tsx', 'packages/ui/src/index.ts']);
});

test('phase is derived from the agent', () => {
  const cases = { 'plan-auditor': 'plan', explorer: 'plan', 'reviewer-package': 'implement', 'validator-global': 'validate', 'design-qa': 'validate' };
  for (const [agent, phase] of Object.entries(cases)) {
    const r = run(stop(VALID, { agent_type: agent }));
    assert.equal(journal(r.root, 'DEMO-1')[0].phase, phase, agent);
    assert.equal(journal(r.root, 'DEMO-1')[0].actor, agent);
  }
});

test('JOURNAL: none writes nothing and does not block', () => {
  const r = run(stop('All green.\nJOURNAL: none'));
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
  assert.equal(existsSync(join(r.root, 'specs')), false);
});

test('entries without a ticket go to _unassigned', () => {
  const r = run(stop('JOURNAL\n- kind: deviation\n  summary: Something\nEND JOURNAL'));
  assert.equal(r.status, 0);
  assert.equal(journal(r.root, '_unassigned').length, 1);
});

test('the first specs/<TICKET>/ path wins, lowercase ids are not tickets', () => {
  const r = run(stop('see specs/foo-1/x.md and specs/ABC-12/y.md then specs/DEMO-1/z.md\nJOURNAL\n- kind: deviation\n  summary: S\nEND JOURNAL'));
  assert.equal(journal(r.root, 'ABC-12').length, 1);
});

test('missing block and stop_hook_active false: blocks with the exact reason, writes nothing', () => {
  const r = run(stop('I forgot the block'));
  assert.equal(r.status, 0);
  assert.deepEqual(JSON.parse(r.stdout), { decision: 'block', reason: 'Report must end with a JOURNAL block (see docs/contracts.md §5.1)' });
  assert.equal(existsSync(join(r.root, 'specs')), false);
});

test('missing block and stop_hook_active true: lets the agent stop and journals a deviation', () => {
  const r = run(stop('Still no block, see specs/DEMO-2/03-plan.md', { stop_hook_active: true }));
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
  const [e] = journal(r.root, 'DEMO-2');
  assert.equal(e.kind, 'deviation');
  assert.equal(e.summary, 'Subagent report ended without a JOURNAL block');
  assert.equal(e.actor, 'developer-package');
});

test('an invalid block is treated like a missing one with its own reason', () => {
  const r = run(stop('JOURNAL\n- kind: nope\n  summary: x\nEND JOURNAL'));
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.equal(out.decision, 'block');
  assert.match(out.reason, /invalid/);
  assert.match(out.reason, /§5\.1/);
});

test('never crashes on malformed input', () => {
  for (const input of ['not json', '', '[]', 'null', '{"agent_type":"developer-package"}', '{"agent_type":"unknown-agent","last_assistant_message":"x"}']) {
    const r = run(input);
    assert.equal(r.status, 0, `input ${JSON.stringify(input)}: ${r.stderr}`);
  }
});

test('PII in an entry is redacted before it reaches the journal', () => {
  const r = run(stop('specs/DEMO-1/x.md\nJOURNAL\n- kind: deviation\n  summary: Mailed person@example.com\nEND JOURNAL'));
  assert.equal(journal(r.root, 'DEMO-1')[0].summary, 'Mailed [redacted]');
});

test('a block without END JOURNAL is invalid and gets the block response', () => {
  const msg = 'specs/DEMO-1/x.md\nJOURNAL\n- kind: deviation\n  summary: S';
  assert.equal(parseJournalBlock(msg).status, 'invalid');
  const r = run(stop(msg));
  assert.equal(JSON.parse(r.stdout).decision, 'block');
  assert.match(JSON.parse(r.stdout).reason, /END JOURNAL/);
});

test('text after END JOURNAL is invalid and gets the block response', () => {
  const msg = 'specs/DEMO-1/x.md\nJOURNAL\n- kind: deviation\n  summary: S\nEND JOURNAL\nOne more thing.';
  assert.equal(parseJournalBlock(msg).status, 'invalid');
  const r = run(stop(msg));
  assert.equal(JSON.parse(r.stdout).decision, 'block');
  assert.match(JSON.parse(r.stdout).reason, /after END JOURNAL/);
  assert.equal(parseJournalBlock(`${msg.split('\nOne')[0]}\n\n  \n`).status, 'entries');
});
