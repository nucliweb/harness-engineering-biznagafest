#!/usr/bin/env node
import { isBlank, readFencedBlocks, readListItems, readTable, splitSections } from './lib/markdown.mjs';
import { checkStructure, isMain, runCli } from './lib/validate-cli.mjs';

export const HEADINGS = ['Scope check', 'Interfaces', 'Steps', 'Definition of done', 'Audit'];
const LAYERS = ['core', 'ui', 'agenda'];
const STEP = /^S\d+ `[^`]+` — .+$/;
const AUDIT = /^Blocking: (\d+) · Recommendations: (\d+) · Iterations: (\d+)$/;

function layerSubsections(body) {
  return new Map(splitSections(body, 3).map((s) => [s.heading, s]));
}

function isNone(body) {
  const items = readListItems(body);
  return items.length === 1 && items[0].text.toLowerCase() === 'none';
}

export function validate(md) {
  const { failures, sections } = checkStructure(md, 'Plan', HEADINGS);
  const get = (h) => sections.find((s) => s.heading === h);

  for (const s of sections) {
    if (HEADINGS.includes(s.heading) && isBlank(s.body)) {
      failures.push({ rule: 'empty-section', message: `section "## ${s.heading}" is empty` });
    }
  }

  const scope = get('Scope check');
  if (scope && !isBlank(scope.body)) {
    const table = readTable(scope.body);
    const headers = table ? table.headers.map((h) => h.toLowerCase()).join('|') : '';
    for (const col of ['files touched', 'lines estimated', 'layers touched']) {
      if (!headers.includes(col)) failures.push({ rule: 'scope-table', message: `table lacks column "${col}"` });
    }
    if (table && table.rows.length === 0) failures.push({ rule: 'scope-table', message: 'table has no rows' });
    const verdict = /\b(Single PR|Split)\b/.exec(scope.body.replace(/\|.*\|/g, ''))?.[1];
    if (!verdict) {
      failures.push({ rule: 'scope-verdict', message: 'verdict must be "Single PR" or "Split"' });
    }
    if (table && table.rows.length > 0) {
      const col = (name) => table.headers.findIndex((h) => h.toLowerCase().includes(name));
      const row = table.rows[0];
      const num = (name) => {
        const i = col(name);
        return i === -1 ? null : Number.parseInt(row[i], 10);
      };
      const files = num('files touched');
      const lines = num('lines estimated');
      const symbols = num('symbols');
      const layersCell = col('layers touched') === -1 ? '' : row[col('layers touched')];
      const allLayers = LAYERS.every((l) => new RegExp(`\\b${l}\\b`).test(layersCell));

      const stepPaths = new Set();
      const stepsSection = get('Steps');
      if (stepsSection) {
        for (const sub of splitSections(stepsSection.body, 3)) {
          for (const item of readListItems(sub.body)) {
            const m = /`([^`]+)`/.exec(item.text);
            if (m) stepPaths.add(m[1]);
          }
        }
      }
      if (stepsSection && Number.isFinite(files) && files !== stepPaths.size) {
        failures.push({
          rule: 'scope-files-mismatch',
          message: `Scope check says ${files} files touched but Steps lists ${stepPaths.size} distinct paths`,
        });
      }
      if (verdict && Number.isFinite(files) && Number.isFinite(lines)) {
        const mustSplit = files > 15 || lines > 500 || (allLayers && Number.isFinite(symbols) && symbols > 6);
        if (mustSplit && verdict === 'Single PR') {
          failures.push({
            rule: 'scope-verdict-mismatch',
            message: `numbers cross a Gate B threshold (files ${files}, lines ${lines}, symbols ${symbols ?? 'n/a'}) but verdict is "Single PR"`,
          });
        } else if (!mustSplit && verdict === 'Split') {
          failures.push({
            rule: 'scope-verdict-mismatch',
            message: `numbers are under every Gate B threshold (files ${files}, lines ${lines}, symbols ${symbols ?? 'n/a'}) but verdict is "Split"`,
          });
        }
      }
    }
  }

  // Interfaces: a layer is covered by a `### <layer>` subsection holding a ts block,
  // or by a ts block whose first line is a `// <layer>` comment, or by `- None`.
  const covered = new Set();
  const interfaces = get('Interfaces');
  if (interfaces && !isBlank(interfaces.body)) {
    const subs = layerSubsections(interfaces.body);
    for (const layer of LAYERS) {
      const sub = subs.get(layer);
      if (sub && (readFencedBlocks(sub.body).some((b) => b.lang === 'ts') || isNone(sub.body))) covered.add(layer);
    }
    for (const b of readFencedBlocks(interfaces.body)) {
      const m = /^\s*\/\/\s*(core|ui|agenda)\b/.exec(b.content);
      if (b.lang === 'ts' && m) covered.add(m[1]);
    }
  }

  const stepLayers = new Map();
  const steps = get('Steps');
  if (steps) {
    const subs = layerSubsections(steps.body);
    const order = splitSections(steps.body, 3).map((s) => s.heading);
    if (order.join('|') !== LAYERS.join('|')) {
      failures.push({ rule: 'steps-layers', message: 'Steps needs "### core", "### ui", "### agenda" in that order' });
    }
    for (const layer of LAYERS) {
      const sub = subs.get(layer);
      if (!sub) continue;
      if (isBlank(sub.body)) {
        failures.push({ rule: 'empty-section', message: `Steps "### ${layer}" is empty` });
        continue;
      }
      if (isNone(sub.body)) continue;
      stepLayers.set(layer, true);
      for (const item of readListItems(sub.body)) {
        if (item.checked === null) {
          failures.push({ rule: 'step-format', message: `Steps ${layer}: not a checklist item: "${item.text}"` });
        } else if (!/`[^`]+`/.test(item.text)) {
          failures.push({ rule: 'step-path', message: `Steps ${layer}: step has no backticked path: "${item.text}"` });
        } else if (!STEP.test(item.text)) {
          failures.push({
            rule: 'step-format',
            message: `Steps ${layer}: expected "S<n> \`<path>\` — <instruction>": "${item.text}"`,
          });
        }
      }
    }
  }
  for (const layer of stepLayers.keys()) {
    if (!covered.has(layer)) {
      failures.push({ rule: 'interfaces-missing', message: `Steps has work in ${layer} but Interfaces has no ts block for it` });
    }
  }

  const dod = get('Definition of done');
  if (dod && !isBlank(dod.body)) {
    const subs = splitSections(dod.body, 3);
    const order = subs.map((s) => s.heading);
    if (order.join('|') !== LAYERS.join('|')) {
      failures.push({ rule: 'dod-layers', message: 'Definition of done needs "### core", "### ui", "### agenda" in that order' });
    }
    for (const sub of subs) {
      if (isBlank(sub.body)) {
        failures.push({ rule: 'empty-section', message: `Definition of done "### ${sub.heading}" is empty` });
        continue;
      }
      if (isNone(sub.body)) continue;
      for (const item of readListItems(sub.body)) {
        if (!/^WHEN .+ THE (core|ui|agenda) SHALL .+/.test(item.text)) {
          failures.push({
            rule: 'dod-ears',
            message: `DoD ${sub.heading}: line must match "WHEN <trigger> THE core|ui|agenda SHALL <result>": "${item.text}"`,
          });
        }
      }
    }
  }

  const audit = get('Audit');
  if (audit && !isBlank(audit.body)) {
    const line = audit.body.split('\n').map((l) => l.trim()).find((l) => l !== '') ?? '';
    const m = AUDIT.exec(line);
    if (!m) {
      failures.push({ rule: 'audit-format', message: 'Audit must read "Blocking: 0 · Recommendations: n · Iterations: k"' });
    } else if (m[1] !== '0') {
      failures.push({ rule: 'audit-blocking', message: `Audit reports Blocking: ${m[1]}, must be 0` });
    }
  }

  return failures;
}

if (isMain(import.meta.url)) process.exit(runCli(validate));
