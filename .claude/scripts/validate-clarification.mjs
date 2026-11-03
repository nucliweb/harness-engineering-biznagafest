#!/usr/bin/env node
import { isBlank, readListItems } from './lib/markdown.mjs';
import { checkStructure, isMain, runCli } from './lib/validate-cli.mjs';

export const HEADINGS = [
  'Goal',
  'Scope',
  'Out of scope',
  'Acceptance criteria',
  'Code anchors',
  'Open questions',
];

export function validate(md) {
  const { failures, sections } = checkStructure(md, 'Clarification', HEADINGS);
  for (const s of sections) {
    if (HEADINGS.includes(s.heading) && isBlank(s.body)) {
      failures.push({ rule: 'empty-section', message: `section "## ${s.heading}" is empty` });
    }
  }
  const open = sections.find((s) => s.heading === 'Open questions');
  if (open && !isBlank(open.body)) {
    const items = readListItems(open.body);
    const onlyNone = items.length === 1 && items[0].text.toLowerCase() === 'none';
    if (!onlyNone) {
      failures.push({
        rule: 'open-questions',
        message: 'section "## Open questions" must be exactly "- None"',
      });
    }
  }
  return failures;
}

if (isMain(import.meta.url)) process.exit(runCli(validate));
