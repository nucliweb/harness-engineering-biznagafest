#!/usr/bin/env node
// Builds docs/demo/index.html: the keyboard-driven page the speakers project to narrate the recorded FEATURE-4 run.
//
//   node scripts/build-demo-page.mjs
//
// Reads the asciinema cast, the specs, the journal, docs/run-metrics.md, docs/contracts.md, README.md and the agent
// frontmatter, and writes one self-contained HTML file (inline CSS, JS, JSON and the QR as a data URI, no network).
// Narration is in Spanish and English (scripts/demo-page/i18n.mjs); open with ?lang=es or ?lang=en, `l` toggles.
// Deterministic: the same inputs give the same output. Node built-ins only.
// Tests: node --test scripts/build-demo-page.test.mjs
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { renderPage } from './demo-page/render.mjs';
import { buildSteps } from './demo-page/steps.mjs';

export const TICKET = 'FEATURE-4';
export const REPO_URL = 'https://github.com/nucliweb/harness-engineering-biznagafest';
export const REPO_NAME = 'harness-engineering-biznagafest';
export const MAX_LINE = 160;
export const OUTPUT = 'docs/demo/index.html';

const round3 = (n) => Math.round(n * 1000) / 1000;
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;?]*[A-Za-z]`, 'g');

// ---------------------------------------------------------------------------------------------------------------
// Cast and log

/** Parses an asciinema v3 cast into its header and the output lines, each with the absolute time it started. */
export function parseCast(text) {
  const rows = text.split('\n').filter((row) => row.trim() !== '');
  if (rows.length === 0) throw new Error('empty cast');
  const header = JSON.parse(rows[0]);
  const lines = [];
  let t = 0;
  let buf = '';
  let start = null;
  for (const row of rows.slice(1)) {
    const [delay, type, data] = JSON.parse(row);
    t = round3(t + Number(delay));
    if (type !== 'o') continue;
    const parts = String(data).replace(ANSI, '').split('\n');
    parts.forEach((part, i) => {
      if (part !== '' && start === null) start = t;
      buf += part;
      if (i < parts.length - 1) {
        const lineText = buf.replace(/\r/g, '');
        if (lineText.trim() !== '') lines.push({ t: start ?? t, text: lineText });
        buf = '';
        start = null;
      }
    });
  }
  const rest = buf.replace(/\r/g, '');
  if (rest.trim() !== '') lines.push({ t: start ?? t, text: rest });
  return { header, duration: t, lines };
}

/** Splits the log on `headless: <TICKET> <phase>` lines; the final `done` line stays with the last phase. */
export function splitPhases(lines, ticket) {
  const phaseRe = new RegExp(`^headless: ${ticket} (spec-[a-z]+)\\s*$`);
  const phases = [];
  for (const line of lines) {
    const m = phaseRe.exec(line.text);
    if (m) phases.push({ name: m[1], lines: [line] });
    else if (phases.length > 0) phases.at(-1).lines.push(line);
  }
  return phases;
}

const TOOL_KINDS = {
  Read: 'read',
  Agent: 'agent',
  Bash: 'bash',
  Write: 'write',
  Edit: 'edit',
  MultiEdit: 'edit',
  Grep: 'grep',
  Glob: 'glob',
  Skill: 'skill',
};

/** Classifies one runner log line. */
export function classify(text) {
  if (text.startsWith('headless:')) return 'runner';
  if (text.startsWith('■')) return 'result';
  const tool = /^▶ (\w+)/.exec(text);
  if (tool) return TOOL_KINDS[tool[1]] ?? 'tool';
  const trimmed = text.trimStart();
  if (trimmed.startsWith('✓')) return 'ok';
  if (trimmed.startsWith('✗')) return 'error';
  if (trimmed.startsWith('·')) return 'text';
  return 'other';
}

/** Parses a `■ success turns=… cost=$… time=…s` line. */
export function parseResultLine(text) {
  const m = /^■ (\S+) turns=(\d+) cost=\$([\d.]+) time=([\d.]+)s/.exec(text);
  if (!m) return null;
  return { status: m[1], turns: Number(m[2]), cost: Number(m[3]), seconds: Number(m[4]) };
}

/** Cuts a line at `max` characters, ending with an ellipsis when cut. */
export function truncate(text, max = MAX_LINE) {
  const chars = Array.from(text);
  return chars.length <= max ? text : `${chars.slice(0, max - 1).join('')}…`;
}

/** Strips the recording machine's repo root from paths; a root cut short at the end of the line becomes `…`. */
export function relativize(text, repoRoot) {
  if (!repoRoot) return text;
  let out = text.split(`${repoRoot}/`).join('');
  const tail = /(\/\S+)$/.exec(out);
  if (tail && tail[1].length > 1 && repoRoot.startsWith(tail[1])) out = `${out.slice(0, tail.index)}…`;
  return out;
}

/** Finds the absolute repo root of the recording machine in the log, if any line shows it. */
export function detectRepoRoot(lines, repoName = REPO_NAME) {
  const re = new RegExp(`(/[^\\s'"]*?/${repoName})(?=/)`);
  for (const line of lines) {
    const m = re.exec(line.text);
    if (m) return m[1];
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// Markdown and data sources

/** Rows of every markdown table in `md`, as arrays of trimmed cells, grouped per table. */
export function readTables(md) {
  const tables = [];
  let current = null;
  for (const raw of md.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('|')) {
      const cells = line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
      if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
      if (!current) {
        current = [];
        tables.push(current);
      }
      current.push(cells);
    } else {
      current = null;
    }
  }
  return tables;
}

/** Text of the section that starts at the heading line matching `headingRe`, up to the next heading of that level. */
export function section(md, headingRe) {
  const lines = md.split('\n');
  const startIdx = lines.findIndex((l) => headingRe.test(l));
  if (startIdx < 0) return '';
  const level = /^#+/.exec(lines[startIdx])?.[0].length ?? 2;
  const out = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const m = /^(#+)\s/.exec(lines[i]);
    if (m && m[1].length <= level && !inFence(lines, i)) break;
    out.push(lines[i]);
  }
  return out.join('\n').trim();
}

function inFence(lines, idx) {
  let open = false;
  for (let i = 0; i < idx; i++) if (/^\s*```/.test(lines[i])) open = !open;
  return open;
}

/** Simple `key: value` frontmatter reader (lists are ignored). */
export function frontmatter(md) {
  const m = /^---\n([\s\S]*?)\n---/.exec(md);
  const out = {};
  if (!m) return out;
  for (const line of m[1].split('\n')) {
    const kv = /^(\w+):\s*(.*)$/.exec(line);
    if (kv && kv[2] !== '') out[kv[1]] = kv[2];
  }
  return out;
}

/** Model label from a model id: `claude-opus-5-5` -> `Opus 5.5`. */
export function modelName(id) {
  const m = /^claude-([a-z]+)-(\d+)-(\d+)/.exec(id);
  if (!m) return id;
  return `${m[1][0].toUpperCase()}${m[1].slice(1)} ${m[2]}.${m[3]}`;
}

/** Rows of docs/run-metrics.md with typed fields. */
export function parseMetrics(md) {
  const [table] = readTables(md);
  if (!table) return [];
  const [head, ...rows] = table;
  const col = (name) => head.indexOf(name);
  return rows.map((r) => ({
    ticket: r[col('ticket')],
    phase: r[col('phase')],
    status: r[col('status')],
    seconds: Number(r[col('duration_ms')]) / 1000,
    turns: Number(r[col('num_turns')]),
    cost: Number(r[col('total_cost_usd')]),
    models: r[col('models (input/output tokens)')]
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const [id, tokens = ''] = s.split(/\s+/);
        const [input, output] = tokens.split('/').map(Number);
        return { id, name: modelName(id), input, output };
      }),
  }));
}

/** The complete run of a ticket: its successful phase rows that are not marked as an attempt. */
export function finalRun(rows, ticket) {
  return rows.filter((r) => r.ticket === ticket && !r.status.includes('attempt') && r.status.startsWith('success'));
}

/** Journal entries with their 1-based line number. */
export function parseJournal(text) {
  return text
    .split('\n')
    .filter((l) => l.trim() !== '')
    .map((l, i) => ({ line: i + 1, ...JSON.parse(l) }));
}

/** Splits a journal into attempts: a new attempt starts after a person's decision that re-runs the ticket. */
export function journalAttempts(entries) {
  const attempts = [[]];
  for (const e of entries) {
    attempts.at(-1).push(e);
    if (e.kind === 'user_decision' && e.actor === 'main' && /re-?run/i.test(e.summary)) attempts.push([]);
  }
  return attempts.filter((a) => a.length > 0);
}

function sentences(paragraph) {
  return paragraph.split(/(?<=\.)\s+(?=[A-Z`])/);
}

/** The sentence of `md` that contains `needle`. Throws when the source no longer says it. */
export function sentenceWith(md, needle, label = needle) {
  for (const para of md.split(/\n\s*\n/)) {
    if (!para.includes(needle)) continue;
    const hit = sentences(para.replace(/\s*\n\s*/g, ' ')).find((s) => s.includes(needle));
    if (hit) return hit.trim();
  }
  throw new Error(`source text not found: ${label}`);
}

// ---------------------------------------------------------------------------------------------------------------
// Loading

function read(root, path) {
  return readFileSync(join(root, path), 'utf8');
}

function listFiles(root, dir) {
  const abs = join(root, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs)
    .filter((n) => !n.startsWith('.'))
    .sort()
    .map((n) => ({ name: n, path: `${dir}/${n}`, dir: statSync(join(abs, n)).isDirectory() }));
}

function headerComment(text) {
  for (const line of text.split('\n').slice(0, 6)) {
    const m = /^\s*(?:\/\/|#)(?!!)\s?(.*)$/.exec(line);
    if (m && m[1].trim() !== '') return m[1].trim();
  }
  return '';
}

/** Loads every input the page needs from the repo at `root`. */
export function loadSources(root, ticket = TICKET) {
  const castPath = `docs/recordings/headless-${ticket.toLowerCase()}.cast`;
  const cast = parseCast(read(root, castPath));
  const repoRoot = detectRepoRoot(cast.lines);
  const lines = cast.lines.map((l, i) => {
    const text = truncate(relativize(l.text, repoRoot));
    return { n: i + 1, t: l.t, text, kind: classify(text) };
  });
  const phases = splitPhases(lines, ticket).map((p) => {
    const resultLine = p.lines.find((l) => l.kind === 'result');
    return { ...p, result: resultLine ? parseResultLine(resultLine.text) : null };
  });

  const agents = {};
  for (const f of listFiles(root, '.claude/agents')) {
    if (!f.name.endsWith('.md')) continue;
    agents[f.name.replace(/\.md$/, '')] = { ...frontmatter(read(root, f.path)), path: f.path };
  }
  const skills = {};
  for (const d of listFiles(root, '.claude/skills')) {
    if (!d.dir || !existsSync(join(root, d.path, 'SKILL.md'))) continue;
    skills[d.name] = { ...frontmatter(read(root, `${d.path}/SKILL.md`)), path: `${d.path}/SKILL.md` };
  }

  const tree = { claude: {}, scripts: {} };
  for (const dir of ['.claude', '.claude/hooks', '.claude/scripts', '.claude/scripts/lib', '.claude/scripts/fixtures', 'scripts', 'scripts/lib', 'scripts/prompts']) {
    tree[dir] = listFiles(root, dir);
  }
  const headers = {};
  for (const dir of ['.claude/hooks', '.claude/scripts', '.claude/scripts/lib', 'scripts', 'scripts/lib']) {
    for (const f of tree[dir]) if (!f.dir) headers[f.path] = headerComment(read(root, f.path));
  }
  const countFiles = (dir) =>
    listFiles(root, dir).reduce((n, f) => n + (f.dir ? countFiles(f.path) : 1), 0);

  return {
    ticket,
    castPath,
    cast: { header: cast.header, duration: cast.duration },
    repoRoot,
    lines,
    phases,
    ticketMd: read(root, `tickets/${ticket}.md`),
    journal: parseJournal(read(root, `specs/${ticket}/journal.jsonl`)),
    sister: {
      id: 'FEATURE-1',
      clarification: read(root, 'specs/FEATURE-1/00-clarification.md'),
      plan: read(root, 'specs/FEATURE-1/03-plan.md'),
      dod: read(root, 'specs/FEATURE-1/04-dod.md'),
      journal: parseJournal(read(root, 'specs/FEATURE-1/journal.jsonl')),
    },
    demo2: { blocked: read(root, 'specs/FEATURE-2/BLOCKED.md'), plan: read(root, 'specs/FEATURE-2/03-plan.md') },
    metrics: parseMetrics(read(root, 'docs/run-metrics.md')),
    contracts: read(root, 'docs/contracts.md'),
    readme: read(root, 'README.md'),
    settings: JSON.parse(read(root, '.claude/settings.json')),
    validatePlan: read(root, '.claude/scripts/validate-plan.mjs'),
    eslintConfig: read(root, 'eslint.config.js'),
    lessons: JSON.parse(read(root, 'specs/lessons.json')),
    agents,
    skills,
    tree,
    headers,
    fixtureCount: countFiles('.claude/scripts/fixtures'),
    hasTest: (path) => existsSync(join(root, path.replace(/\.(mjs|sh)$/, '.test.mjs'))),
  };
}

/** Builds the page from the repo at `root`; returns the HTML and the step model. */
export function buildPage(root, ticket = TICKET) {
  const src = { ...loadSources(root, ticket), section, readTables, sentenceWith, journalAttempts, finalRun };
  const steps = buildSteps(src, { repoUrl: REPO_URL });
  const here = dirname(fileURLToPath(import.meta.url));
  const assets = {
    template: readFileSync(join(here, 'demo-page/template.html'), 'utf8'),
    css: readFileSync(join(here, 'demo-page/style.css'), 'utf8'),
    js: readFileSync(join(here, 'demo-page/app.js'), 'utf8'),
    // The QR of the repo URL, inlined so the page makes no request.
    qr: `data:image/png;base64,${readFileSync(join(here, 'demo-page/assets/qr-repo.png')).toString('base64')}`,
  };
  const html = renderPage({ steps, src, assets, repoUrl: REPO_URL });
  return { html, steps, src };
}

function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const { html, steps } = buildPage(root);
  const out = join(root, OUTPUT);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  process.stdout.write(`${OUTPUT}: ${Buffer.byteLength(html)} bytes, ${steps.length} steps\n`);
  steps.forEach((s, i) => {
    process.stdout.write(`\n${i + 1}. ${s.title.en} / ${s.title.es}\n`);
    s.focuses.forEach((f, k) => {
      const where = (f.logLines ?? []).map((l) => `      L${l.n} ${l.text.slice(0, 110)}`).join('\n');
      process.stdout.write(`   ${k + 1} [${f.label.en} / ${f.label.es}]${where ? `\n${where}` : ''}\n`);
    });
    for (const w of s.warnings ?? []) process.stdout.write(`   ! ${w}\n`);
  });
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) main();
