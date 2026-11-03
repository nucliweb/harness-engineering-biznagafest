import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Runs a validator over the paths in argv. `validate(md)` returns [{ rule, message }].
// Prints one line per failure: `<file>: <rule>: <message>`. Exit code 1 on any failure.
export function runCli(validate, argv = process.argv.slice(2)) {
  if (argv.length === 0) {
    console.error('usage: node <validator>.mjs <path> [<path>...]');
    return 1;
  }
  let failures = 0;
  for (const file of argv) {
    let md;
    try {
      md = readFileSync(file, 'utf8');
    } catch (err) {
      console.log(`${file}: file-unreadable: ${err.code ?? err.message}`);
      failures++;
      continue;
    }
    for (const f of validate(md)) {
      console.log(`${file}: ${f.rule}: ${f.message}`);
      failures++;
    }
  }
  return failures > 0 ? 1 : 0;
}

export function isMain(metaUrl) {
  return process.argv[1] && pathToFileURL(process.argv[1]).href === metaUrl;
}

// Shared structure check: level-1 title and level-2 headings in exact order.
import { readTitle, splitSections } from './markdown.mjs';

export function checkStructure(md, artefactName, headings) {
  const failures = [];
  const title = readTitle(md);
  const m = title === null ? null : /^([A-Z]+-\d+) · (.+)$/.exec(title);
  if (!m || m[2] !== artefactName) {
    failures.push({
      rule: 'title',
      message: `first level-1 heading must be "# <TICKET> · ${artefactName}"`,
    });
  }
  const sections = splitSections(md);
  const found = sections.map((s) => s.heading);
  const missing = headings.filter((h) => !found.includes(h));
  for (const h of missing) failures.push({ rule: 'missing-heading', message: `missing section "## ${h}"` });
  if (missing.length === 0) {
    const unexpected = found.filter((h) => !headings.includes(h));
    for (const h of unexpected) failures.push({ rule: 'unexpected-heading', message: `unexpected section "## ${h}"` });
    if (unexpected.length === 0 && found.join('\n') !== headings.join('\n')) {
      failures.push({
        rule: 'heading-order',
        message: `sections must appear in this order: ${headings.join(' | ')}`,
      });
    }
  }
  return { failures, sections };
}
