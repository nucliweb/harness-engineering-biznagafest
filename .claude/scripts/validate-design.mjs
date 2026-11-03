#!/usr/bin/env node
import { isBlank, readListItems, readTable, splitSections } from './lib/markdown.mjs';
import { checkStructure, isMain, runCli } from './lib/validate-cli.mjs';

export const HEADINGS = ['Alternatives', 'Decisions', 'Layer assignment', 'Risks'];
const LAYERS = ['core', 'ui', 'agenda'];
const FORBIDDEN = /\bTBD\b|\bTODO\b|open question/i;
const DECISION = /^D\d+ .+\. Status: (\S+?)\.?$/;

export function validate(md) {
  const { failures, sections } = checkStructure(md, 'Design', HEADINGS);
  const get = (h) => sections.find((s) => s.heading === h);

  md.split('\n').forEach((line, i) => {
    const m = FORBIDDEN.exec(line);
    if (m) failures.push({ rule: 'forbidden-word', message: `line ${i + 1} contains "${m[0]}"` });
  });

  for (const s of sections) {
    if (HEADINGS.includes(s.heading) && isBlank(s.body)) {
      failures.push({ rule: 'empty-section', message: `section "## ${s.heading}" is empty` });
    }
  }

  const alts = get('Alternatives');
  if (alts) {
    const subs = splitSections(alts.body, 3).filter((s) => /^A\d+ \S/.test(s.heading));
    if (subs.length < 2) {
      failures.push({
        rule: 'alternatives-count',
        message: `needs at least two "### A<n> <name>" alternatives, found ${subs.length}`,
      });
    }
    for (const sub of subs) {
      for (const word of ['Pros', 'Cons']) {
        if (!new RegExp(`\\b${word}\\b[*_\\s]*:`, 'i').test(sub.body)) {
          failures.push({ rule: 'alternative-pros-cons', message: `alternative "${sub.heading}" has no "${word}:" label` });
        }
      }
    }
  }

  const decisions = get('Decisions');
  if (decisions && !isBlank(decisions.body)) {
    const items = readListItems(decisions.body);
    if (items.length === 0) {
      failures.push({ rule: 'decisions-format', message: 'no decision items found' });
    }
    for (const item of items) {
      const m = DECISION.exec(item.text);
      if (!m) {
        failures.push({
          rule: 'decisions-format',
          message: `decision must read "D<n> <text>. Status: closed.": "${item.text}"`,
        });
      } else if (m[1] !== 'closed') {
        failures.push({
          rule: 'decision-not-closed',
          message: `decision status must be closed, found "${m[1]}": "${item.text}"`,
        });
      }
    }
  }

  const layer = get('Layer assignment');
  if (layer && !isBlank(layer.body)) {
    const table = readTable(layer.body);
    const expected = ['change', 'layer', 'file'];
    if (!table || table.headers.map((h) => h.toLowerCase()).join('|') !== expected.join('|')) {
      failures.push({ rule: 'layer-table', message: 'needs a table with columns: change | layer | file' });
    } else {
      if (table.rows.length === 0) failures.push({ rule: 'layer-table', message: 'table has no rows' });
      for (const row of table.rows) {
        if (!LAYERS.includes(row[1])) {
          failures.push({ rule: 'layer-table', message: `layer must be core, ui or agenda, found "${row[1]}"` });
        }
      }
    }
  }

  return failures;
}

if (isMain(import.meta.url)) process.exit(runCli(validate));
