import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readTitle,
  splitSections,
  readListItems,
  readFencedBlocks,
  readTable,
  isBlank,
} from './markdown.mjs';

const DOC = [
  '# FEATURE-1 · Clarification',
  '',
  'intro',
  '',
  '## Goal',
  'One paragraph.',
  '',
  '## Steps',
  '### core',
  '- [ ] S1 `a.ts` — do it',
  '- [x] S2 `b.ts` — done',
  '### ui',
  '- None',
  '',
  '```md',
  '## Not a heading',
  '```',
].join('\n');

test('readTitle returns the level-1 heading', () => {
  assert.equal(readTitle(DOC), 'FEATURE-1 · Clarification');
  assert.equal(readTitle('no title'), null);
});

test('splitSections splits by level-2 headings and ignores headings inside fences', () => {
  const sections = splitSections(DOC);
  assert.deepEqual(
    sections.map((s) => s.heading),
    ['Goal', 'Steps'],
  );
  assert.equal(sections[0].body.trim(), 'One paragraph.');
  assert.equal(sections[0].line, 5);
});

test('splitSections supports level 3', () => {
  const steps = splitSections(DOC).find((s) => s.heading === 'Steps');
  const subs = splitSections(steps.body, 3);
  assert.deepEqual(
    subs.map((s) => s.heading),
    ['core', 'ui'],
  );
});

test('readListItems reads bullets and checkbox state', () => {
  const steps = splitSections(DOC).find((s) => s.heading === 'Steps');
  const core = splitSections(steps.body, 3)[0];
  const items = readListItems(core.body);
  assert.equal(items.length, 2);
  assert.equal(items[0].checked, false);
  assert.equal(items[1].checked, true);
  assert.equal(items[0].text, 'S1 `a.ts` — do it');
  assert.equal(readListItems('- None')[0].checked, null);
});

test('readFencedBlocks returns language and content', () => {
  const blocks = readFencedBlocks('x\n```ts\nexport const a = 1;\n```\n```\nplain\n```');
  assert.deepEqual(blocks, [
    { lang: 'ts', content: 'export const a = 1;' },
    { lang: '', content: 'plain' },
  ]);
});

test('readTable returns headers and rows, or null', () => {
  const table = readTable('text\n| change | layer | file |\n|---|---|---|\n| a | core | x.ts |\n| b | ui | y.tsx |\n');
  assert.deepEqual(table.headers, ['change', 'layer', 'file']);
  assert.deepEqual(table.rows, [
    ['a', 'core', 'x.ts'],
    ['b', 'ui', 'y.tsx'],
  ]);
  assert.equal(readTable('no table here'), null);
});

test('isBlank detects whitespace-only bodies', () => {
  assert.equal(isBlank('  \n\n'), true);
  assert.equal(isBlank(' x '), false);
});
