import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { dict, t } from './demo-page/i18n.mjs';
import { fileURLToPath } from 'node:url';
import {
  REPO_URL,
  buildPage,
  classify,
  parseCast,
  parseResultLine,
  relativize,
  splitPhases,
  truncate,
} from './build-demo-page.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const tiny = readFileSync(join(here, 'demo-page/fixtures/tiny.cast'), 'utf8');

describe('parseCast', () => {
  const cast = parseCast(tiny);

  it('reads the header', () => {
    assert.equal(cast.header.version, 3);
    assert.equal(cast.header.timestamp, 1000);
  });

  it('splits output into lines, joining a line that spans two events', () => {
    assert.equal(cast.lines.length, 16);
    assert.equal(cast.lines[4].text, '▶ Bash node .claude/scripts/validate-clarification.mjs specs/FEATURE-9/00-clarification.md');
  });

  it('gives each line the absolute time at which it started', () => {
    assert.equal(cast.lines[0].t, 0.5);
    assert.equal(cast.lines[1].t, 1.5);
    assert.equal(cast.lines[2].t, 1.75);
    assert.equal(cast.lines[3].t, 1.75);
    assert.equal(cast.lines[4].t, 2);
    assert.equal(cast.lines[5].t, 2.5);
  });

  it('strips carriage returns and records the total duration', () => {
    assert.ok(cast.lines.every((l) => !l.text.includes('\r')));
    assert.equal(cast.duration, 2.71);
  });
});

describe('splitPhases', () => {
  const { lines } = parseCast(tiny);
  const phases = splitPhases(lines, 'FEATURE-9');

  it('cuts the log on the runner phase lines', () => {
    assert.deepEqual(phases.map((p) => p.name), ['spec-clarify', 'spec-plan']);
    assert.equal(phases[0].lines.length, 8);
    assert.equal(phases[0].lines[0].text, 'headless: FEATURE-9 spec-clarify');
    assert.equal(phases[0].lines.at(-1).text, '■ success turns=3 cost=$0.1234 time=2.6s');
  });

  it('keeps the final done line with the last phase', () => {
    assert.equal(phases[1].lines.at(-1).text, 'headless: FEATURE-9 done, metrics in docs/run-metrics.md');
  });

  it('ignores runner lines of another ticket', () => {
    assert.equal(splitPhases(lines, 'FEATURE-1').length, 0);
  });
});

describe('classify', () => {
  const cases = [
    ['headless: FEATURE-4 spec-plan', 'runner'],
    ['headless: FEATURE-4 done, metrics in docs/run-metrics.md', 'runner'],
    ['▶ Read tickets/FEATURE-4.md', 'read'],
    ['▶ Agent explorer', 'agent'],
    ['▶ Bash pnpm lint', 'bash'],
    ['▶ Write specs/FEATURE-4/00-clarification.md', 'write'],
    ['▶ Edit specs/FEATURE-4/03-plan.md', 'edit'],
    ['▶ Grep (?i)room|track', 'grep'],
    ['▶ Glob specs/FEATURE-4/**', 'glob'],
    ['▶ Skill', 'skill'],
    ['  ✓ (Bash completed with no output)', 'ok'],
    ['  ✗ Exit code 1', 'error'],
    ['  · Research written; now drafting the design.', 'text'],
    ['■ success turns=7 cost=$0.3579 time=63.3s', 'result'],
  ];
  for (const [line, kind] of cases) {
    it(`${kind}: ${line}`, () => assert.equal(classify(line), kind));
  }
});

describe('line helpers', () => {
  it('parses a result line', () => {
    assert.deepEqual(parseResultLine('■ success turns=17 cost=$0.5686 time=70.6s'), {
      status: 'success',
      turns: 17,
      cost: 0.5686,
      seconds: 70.6,
    });
    assert.equal(parseResultLine('▶ Read x'), null);
  });

  it('truncates at 160 characters with an ellipsis', () => {
    assert.equal(truncate('a'.repeat(160)), 'a'.repeat(160));
    const cut = truncate('b'.repeat(200));
    assert.equal(cut.length, 160);
    assert.ok(cut.endsWith('…'));
  });

  it('makes absolute repo paths relative, including a path cut short by the runner', () => {
    const repo = '/Users/someone/code/harness-engineering-biznagafest';
    assert.equal(relativize(`  ✓ File created successfully at: ${repo}/specs/FEATURE-4/00-clarification.md`, repo), '  ✓ File created successfully at: specs/FEATURE-4/00-clarification.md');
    assert.equal(relativize('▶ Bash pnpm lint:file /Users/someone/code/harness-engin', repo), '▶ Bash pnpm lint:file …');
    assert.equal(relativize('▶ Read tickets/FEATURE-4.md', repo), '▶ Read tickets/FEATURE-4.md');
  });
});

describe('buildPage on the real repo', () => {
  const { html, steps } = buildPage(root);

  it('renders nine steps, each with its title in the HTML', () => {
    assert.equal(steps.length, 9);
    for (const step of steps) assert.ok(html.includes(step.titleHtml), `missing title: ${step.title}`);
  });

  it('finds highlights in every phase step', () => {
    const phaseSteps = steps.filter((s) => s.stage.type === 'log');
    assert.equal(phaseSteps.length, 4);
    for (const s of phaseSteps) assert.ok(s.focuses.length >= 5, `${s.title} has ${s.focuses.length} highlights`);
  });

  it('has no http or https URL except the repo link on the last step (data: URIs are not requests)', () => {
    const withoutDataUris = html.replace(/data:[a-z]+\/[a-z+.-]+;base64,[A-Za-z0-9+/=]+/g, 'data:');
    const urls = withoutDataUris.match(/https?:\/\/[^\s"'<>)]+/g) ?? [];
    assert.ok(urls.length > 0);
    for (const url of urls) assert.equal(url, REPO_URL);
    const lastStepStart = html.indexOf('id="step-9"');
    assert.ok(lastStepStart > 0);
    assert.equal(withoutDataUris.slice(0, withoutDataUris.indexOf('id="step-9"')).match(/https?:\/\//g), null);
  });

  it('inlines the QR on the closing screen as a PNG data URI', () => {
    const step9 = html.slice(html.indexOf('id="step-9"'));
    assert.match(step9, /<img class="qr" src="data:image\/png;base64,[A-Za-z0-9+/=]{100,}"/);
  });

  it('renders every step title in both languages', () => {
    for (const step of steps) {
      assert.ok(html.includes(step.title.en.replace(/&/g, '&amp;')), `missing en title: ${step.title.en}`);
      assert.ok(html.includes(step.title.es.replace(/&/g, '&amp;')), `missing es title: ${step.title.es}`);
    }
  });

  it('renders a timeline with the four phases numbered and the other screens as extras, in both languages', () => {
    const nav = html.slice(html.indexOf('<nav class="timeline"'), html.indexOf('</nav>'));
    assert.ok(nav.length > 0, 'no timeline nav');
    assert.equal((nav.match(/class="tl-item tl-phase"/g) ?? []).length, 4);
    assert.equal((nav.match(/class="tl-item tl-extra/g) ?? []).length, steps.length - 5);
    assert.deepEqual(
      [...nav.matchAll(/<span class="tl-num">(\d)<\/span>/g)].map((m) => m[1]),
      ['1', '2', '3', '4'],
    );
    steps.forEach((step, i) => {
      if (i === 0) return;
      assert.ok(nav.includes(`data-go="${i}"`), `no timeline item for screen ${i + 1}`);
      assert.ok(nav.includes(step.phase.en), `missing en label: ${step.phase.en}`);
      assert.ok(nav.includes(step.phase.es), `missing es label: ${step.phase.es}`);
    });
    assert.ok(!html.includes('id="progress-bar"'), 'the old progress bar is replaced by the timeline');
  });

  it('numbers only the four phases in the corner label, never "step n / 9"', () => {
    const corners = [...html.matchAll(/<p class="corner">(.*?)<\/p>/g)].map((m) => m[1].replace(/<[^>]+>/g, ' '));
    assert.equal(corners.length, steps.length);
    assert.ok(corners.every((c) => !/\/\s*9\b/.test(c)), 'a corner still counts to 9');
    assert.equal(corners.filter((c) => /\/\s*4\b/.test(c)).length, 4, 'only the four phase screens carry n / 4');
  });

  it('does not claim that nobody was involved: it says the decisions are written down, with the real count', () => {
    assert.ok(!/nobody at the keyboard|nadie al teclado/i.test(html), 'the old overclaim is still there');
    const title = steps[0].title;
    assert.match(title.en, /every decision written down/);
    assert.match(title.es, /cada decisión por escrito/);
    const stage = steps[0].stage;
    assert.ok(Number.isInteger(stage.decisions) && stage.decisions > 0, 'no decision count');
    const journal = readFileSync(join(root, 'specs/FEATURE-4/journal.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    const castStart = Number(JSON.parse(readFileSync(join(root, 'docs/recordings/headless-feature-4.cast'), 'utf8').split('\n')[0]).timestamp) * 1000;
    const expected = journal.filter((e) => e.actor === 'headless' && e.kind === 'decision' && Date.parse(e.ts) >= castStart - 5000).length;
    assert.equal(stage.decisions, expected);
    assert.ok(html.includes('class="autonomy"'));
  });

  it('is deterministic', () => {
    assert.equal(buildPage(root).html, html);
  });
});

describe('i18n', () => {
  it('has the same keys in English and Spanish', () => {
    assert.deepEqual(Object.keys(dict.es).sort(), Object.keys(dict.en).sort());
  });

  it('keeps the same placeholders in both languages', () => {
    const vars = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const key of Object.keys(dict.en)) assert.deepEqual(vars(dict.es[key] ?? ''), vars(dict.en[key]), key);
  });

  it('uses no spaced em-dash', () => {
    for (const lang of ['en', 'es']) for (const [key, value] of Object.entries(dict[lang])) assert.ok(!value.includes(' — '), `${lang} ${key}`);
  });

  it('fills variables and falls back to English when a Spanish string is missing', () => {
    assert.deepEqual(t('ui.lines', { n: 3 }), { en: '3 lines', es: '3 líneas' });
    const saved = dict.es['ui.lines'];
    delete dict.es['ui.lines'];
    try {
      assert.deepEqual(t('ui.lines', { n: 3 }), { en: '3 lines', es: '3 lines' });
    } finally {
      dict.es['ui.lines'] = saved;
    }
  });
});
