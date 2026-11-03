#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { appendEntry } from './lib/journal.mjs';
import { isMain } from './lib/validate-cli.mjs';

const USAGE =
  'usage: node journal-append.mjs --ticket FEATURE-1 --phase <phase> --actor <actor> --kind <kind> --summary "..." [--detail "..."] [--files a,b]';

export function main(argv) {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      options: {
        ticket: { type: 'string' },
        phase: { type: 'string' },
        actor: { type: 'string' },
        kind: { type: 'string' },
        summary: { type: 'string' },
        detail: { type: 'string' },
        files: { type: 'string' },
        root: { type: 'string' },
      },
    }));
  } catch (err) {
    console.error(`${err.message}\n${USAGE}`);
    return 1;
  }
  try {
    appendEntry(
      {
        ticket: values.ticket,
        phase: values.phase,
        actor: values.actor,
        kind: values.kind,
        summary: values.summary,
        detail: values.detail,
        files: values.files ? values.files.split(',').map((f) => f.trim()).filter(Boolean) : undefined,
      },
      values.root ? { root: values.root } : undefined,
    );
    return 0;
  } catch (err) {
    console.error(`journal-append: ${err.message}\n${USAGE}`);
    return 1;
  }
}

if (isMain(import.meta.url)) process.exit(main(process.argv.slice(2)));
