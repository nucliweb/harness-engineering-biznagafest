import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyReply,
  applyVerdicts,
  extractResult,
  initState,
  listFindings,
  parseFindings,
  parseReply,
  parseVerdicts,
  render,
  reviewerOutcome,
} from './parse-review.mjs';

const REVIEW = [
  'Some preamble the model added.',
  'FINDING 1: packages/ui/src/TrackFilter.tsx:12 — ui imports from agenda, breaking the layer rule',
  'FINDING 2: packages/core/src/talks.ts:40-44 — null track returns an empty list instead of all talks',
  'not a finding line',
].join('\n');

test('extractResult returns the result text from claude JSON', () => {
  assert.deepEqual(extractResult(JSON.stringify({ is_error: false, result: 'hello' })), { ok: true, text: 'hello' });
  assert.equal(extractResult(JSON.stringify({ is_error: true, result: 'boom' })).ok, false);
  assert.equal(extractResult('garbage').ok, false);
});

test('parseFindings reads FINDING lines and ignores the rest', () => {
  assert.deepEqual(parseFindings(REVIEW), [
    { n: 1, file: 'packages/ui/src/TrackFilter.tsx', line: '12', claim: 'ui imports from agenda, breaking the layer rule' },
    { n: 2, file: 'packages/core/src/talks.ts', line: '40-44', claim: 'null track returns an empty list instead of all talks' },
  ]);
  assert.deepEqual(parseFindings('NO FINDINGS'), []);
});

test('parseFindings accepts a plain hyphen separator', () => {
  assert.equal(parseFindings('FINDING 1: a.ts:3 - bad thing')[0].claim, 'bad thing');
});

test('parseVerdicts reads UPHELD and REFUTED with reasons, defaulting to UPHELD', () => {
  const v = parseVerdicts('VERDICT 1: REFUTED the import is type-only\nVERDICT 3: UPHELD', [1, 2, 3]);
  assert.deepEqual(v.get(1), { verdict: 'REFUTED', reason: 'the import is type-only' });
  assert.deepEqual(v.get(2), { verdict: 'UPHELD', reason: '' });
  assert.equal(v.get(3).verdict, 'UPHELD');
});

test('parseVerdicts tolerates a FINDING prefix and bare numbers', () => {
  const v = parseVerdicts('FINDING 1: REFUTED nope\n2: UPHELD', [1, 2]);
  assert.equal(v.get(1).verdict, 'REFUTED');
  assert.equal(v.get(2).verdict, 'UPHELD');
});

test('parseReply reads DROP and DEFEND lines', () => {
  const r = parseReply('DROP 1\nDEFEND 2: line 40 still returns []');
  assert.deepEqual([...r.dropped], [1]);
  assert.deepEqual([...r.defended], [[2, 'line 40 still returns []']]);
});

test('a round with no refutations reaches consensus on every finding', () => {
  const state = initState(parseFindings(REVIEW));
  const disputed = applyVerdicts(state, parseVerdicts('VERDICT 1: UPHELD\nVERDICT 2: UPHELD', [1, 2]));
  assert.equal(disputed, 0);
  const out = render(state, 'consensus');
  assert.match(out, /^CONSENSUS\n/);
  assert.match(out, /FINDING 1: packages\/ui\/src\/TrackFilter\.tsx:12 — /);
  assert.match(out, /FINDING 2: /);
});

test('dropping every refuted finding reaches consensus on the survivors', () => {
  const state = initState(parseFindings(REVIEW));
  assert.equal(applyVerdicts(state, parseVerdicts('VERDICT 1: REFUTED type-only\nVERDICT 2: UPHELD', [1, 2])), 1);
  assert.equal(applyReply(state, parseReply('DROP 1')), 0);
  const out = render(state, 'consensus');
  assert.ok(!out.includes('FINDING 1:'));
  assert.ok(out.includes('FINDING 2:'));
});

test('a defended finding stays disputed and carries its defence into the next round', () => {
  const state = initState(parseFindings(REVIEW));
  applyVerdicts(state, parseVerdicts('VERDICT 1: REFUTED type-only\nVERDICT 2: UPHELD', [1, 2]));
  assert.equal(applyReply(state, parseReply('DEFEND 1: it is a value import')), 1);
  const next = listFindings(state, 'alive');
  assert.match(next, /FINDING 1: .*\n\s+DEFENCE: it is a value import/);
  // second round: the rebuttal refutes again, no consensus
  assert.equal(applyVerdicts(state, parseVerdicts('VERDICT 1: REFUTED still type-only\nVERDICT 2: UPHELD', [1, 2])), 1);
  const out = render(state, 'no-consensus');
  assert.match(out, /^NO CONSENSUS\n/);
  assert.match(out, /Open items/);
  assert.match(out, /FINDING 1: .*\n\s+REFUTED: still type-only\n\s+DEFENCE: it is a value import/);
  assert.match(out, /Agreed/);
  assert.match(out, /FINDING 2: /);
});

test('an unaddressed refuted finding counts as defended', () => {
  const state = initState(parseFindings(REVIEW));
  applyVerdicts(state, parseVerdicts('VERDICT 1: REFUTED x\nVERDICT 2: UPHELD', [1, 2]));
  assert.equal(applyReply(state, parseReply('')), 1);
});

test('render consensus with no findings says so', () => {
  assert.equal(render(initState([]), 'consensus'), 'CONSENSUS\nNo findings.');
});

test('reviewerOutcome tells findings, NO FINDINGS and unparsable output apart', () => {
  assert.equal(reviewerOutcome(REVIEW), 'findings');
  assert.equal(reviewerOutcome('Looks fine.\nNO FINDINGS\n'), 'none');
  assert.equal(reviewerOutcome('I reviewed it and it looks great!'), 'unparsable');
  assert.equal(reviewerOutcome(''), 'unparsable');
  assert.equal(reviewerOutcome('FINDING one: nothing parsable'), 'unparsable');
});
