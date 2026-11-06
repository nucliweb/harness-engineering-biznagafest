// Step model of the demo page: which log lines are highlighted on each phase, and what the speakers say about them.
// Every number, excerpt and journal line comes from `src` (see loadSources in ../build-demo-page.mjs). The narration
// (titles, claims, labels, notes) is localized through ./i18n.mjs; real data stays as the repo writes it.
import { cat, joinLoc, t } from './i18n.mjs';
import { renderText } from './render.mjs';

const SISTER_CAPTION = t('ui.sister');

export const fmtClock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
export const fmtSecs = (s) => `${s.toFixed(1)} s`;
export const fmtUsd = (c) => `$${c.toFixed(2)}`;
const phaseShort = (name) => name.replace(/^spec-/, '');
const cut = (text, n) => (Array.from(text).length > n ? `${Array.from(text).slice(0, n - 1).join('')}…` : text);
const unique = (xs) => [...new Set(xs)];

const tool = (name, re) => (l) => l.text.startsWith(`▶ ${name}`) && (!re || re.test(l.text));
const isResult = (l) => l && (l.kind === 'ok' || l.kind === 'error');

function phaseTools(lines) {
  const first = (pred, from = 0) => {
    for (let i = Math.max(0, from); i < lines.length; i++) if (pred(lines[i], i)) return i;
    return -1;
  };
  const all = (pred, from = 0, to = lines.length - 1) => {
    const out = [];
    for (let i = Math.max(0, from); i <= to && i < lines.length; i++) if (pred(lines[i], i)) out.push(i);
    return out;
  };
  const handBack = (i) => (i < 0 ? -1 : first((l) => l.kind === 'ok' && l.text.includes('[Subagent hand-back]'), i + 1));
  const withResult = (i) => (i >= 0 && isResult(lines[i + 1]) ? [i, i + 1] : [i, i]);
  return { first, all, handBack, withResult };
}

function journalMatcher(src) {
  const start = Number(src.cast.header.timestamp) * 1000;
  const abs = (s) => start + s * 1000;
  const used = new Set();
  return {
    abs,
    /** The entry a main-thread `journal-append.mjs` call wrote: the first unused one within seconds of the call. */
    forCall(line) {
      const at = abs(line.t);
      const hit = src.journal
        .filter((e) => !used.has(e.line) && ['headless', 'main'].includes(e.actor))
        .map((e) => ({ e, ms: Date.parse(e.ts) }))
        .filter(({ ms }) => ms >= at - 1500 && ms <= at + 20000)
        .sort((a, b) => a.ms - b.ms)[0];
      if (!hit) return null;
      used.add(hit.e.line);
      return hit.e;
    },
    /** Entries a subagent's JOURNAL block produced while its block ran (the SubagentStop hook writes them). */
    forAgent(actor, fromLine, toLine) {
      const from = abs(fromLine.t) - 1000;
      const to = abs(toLine.t) + 20000;
      return src.journal.filter((e) => e.actor === actor && Date.parse(e.ts) >= from && Date.parse(e.ts) <= to);
    },
  };
}

const journalEv = (entries, source, n = 140) => ({
  type: 'journal',
  source,
  entries: entries.map((e) => ({ line: e.line, ts: e.ts.slice(11, 19), actor: e.actor, kind: e.kind, summary: cut(e.summary, n) })),
});

function agentKv(agent, keys = ['model', 'tools', 'effort', 'maxTurns']) {
  return { type: 'kv', source: agent.path, rows: keys.filter((k) => agent[k]).map((k) => [k, agent[k]]) };
}

function totalEv(src, phase) {
  const r = phase.result;
  const row = src.finalRows.find((x) => x.phase === phase.name);
  return [
    {
      type: 'stats',
      items: [
        { value: String(r.turns), label: t('stat.turns') },
        { value: fmtUsd(r.cost), label: t('stat.cost') },
        { value: fmtSecs(r.seconds), label: t('stat.time') },
      ],
    },
    row && {
      type: 'text',
      text: t('ui.models', { list: joinLoc(row.models.map((m) => t('ui.modelItem', { model: m.name, n: m.output.toLocaleString('en-US') })), ', ') }),
      source: 'docs/run-metrics.md',
    },
  ].filter(Boolean);
}

const totalLines = (tl, L) => {
  const r = tl.first((l) => l.kind === 'result');
  return [L[r - 1]?.kind === 'text' ? r - 1 : r, r];
};

// ---------------------------------------------------------------------------------------------------------------

function logStep(src, phase, meta, specs) {
  const { lines } = phase;
  const tools = phaseTools(lines);
  const warnings = [];
  const focuses = [];
  for (const spec of specs) {
    const found = spec.find(tools, lines);
    const ranges = found ? (Array.isArray(found[0]) ? found : [found]).map(([a, b]) => [a, b ?? a]) : null;
    if (!ranges || ranges.some(([a, b]) => a < 0 || b < a)) {
      warnings.push(`no match for "${spec.label.en}"`);
      continue;
    }
    const content = spec.content(ranges, tools, lines);
    if (!content) {
      warnings.push(`no content for "${spec.label.en}"`);
      continue;
    }
    const logLines = ranges.flatMap(([a, b]) => lines.slice(a, b + 1)).filter((l) => l.kind !== 'ok');
    focuses.push({ label: spec.label, ranges, t: lines[ranges[0][0]].t, logLines, ...content });
  }
  focuses.sort((a, b) => a.ranges[0][0] - b.ranges[0][0]);
  return {
    ...meta,
    titleHtml: renderText(meta.title),
    phase: t(`phase.${phaseShort(phase.name)}`),
    stage: { type: 'log', phaseName: phase.name, lines, result: phase.result },
    focuses,
    warnings,
  };
}

function clarifyStep(src, phase, jm) {
  const ticketTitle = /^title:\s*(.+)$/m.exec(src.ticketMd)?.[1] ?? src.ticket;
  const description = src.section(src.ticketMd, /^## Description/);
  const criteria = src.section(src.ticketMd, /^## Acceptance criteria/).split('\n').filter((l) => l.startsWith('- '));
  const explorer = src.agents.explorer;
  const headings = src.sister.clarification.split('\n').filter((l) => /^#{1,2} /.test(l));
  const openQ = src.section(src.sister.clarification, /^## Open questions/);
  const validatorRule = /^Validator: .*$/m.exec(src.section(src.contracts, /^### 4\.1 /))?.[0];

  return logStep(src, phase, { id: 'clarify', title: t('clarify.title'), kicker: t('clarify.kicker') }, [
    {
      label: t('label.ticketFile'),
      find: (tl) => tl.withResult(tl.first(tool('Read', /tickets\/DEMO-\d+\.md/))),
      content: () => ({
        claim: t('claim.ticketFile'),
        evidence: [
          {
            type: 'quote',
            source: `tickets/${src.ticket}.md`,
            text: cat(`${src.ticket} · ${ticketTitle}\n\n${cut(description.split(/(?<=\.)\s/)[0], 120)}\n\n`, t('ui.criteria', { n: criteria.length })),
          },
        ],
        note: t('note.ticketFile'),
      }),
    },
    {
      label: t('label.cleanContext'),
      find: (tl) => {
        const a = tl.first(tool('Agent', /explorer/));
        return [a, tl.handBack(a)];
      },
      content: ([[a, b]], tl, L) => {
        const inside = L.slice(a + 1, b);
        const count = (k) => inside.filter((l) => l.kind === k).length;
        return {
          claim: t('claim.cleanContext'),
          evidence: [
            agentKv(explorer),
            {
              type: 'stats',
              items: [
                { value: String(count('grep') + count('glob')), label: t('stat.searches') },
                { value: String(count('read')), label: t('stat.filesRead') },
                { value: fmtSecs(L[b].t - L[a].t), label: t('stat.ownContext') },
              ],
            },
          ],
          note: t('note.cleanContext'),
        };
      },
    },
    {
      label: t('label.headlessDecision'),
      find: (tl) => {
        const calls = tl.all(tool('Bash', /journal-append\.mjs/), 0, tl.first(tool('Write', /00-clarification/)));
        if (calls.length === 0) return null;
        return [calls[0], tl.withResult(calls.at(-1))[1]];
      },
      content: ([[a, b]], tl, L) => {
        const entries = L.slice(a, b + 1).filter(tool('Bash', /journal-append/)).map((l) => jm.forCall(l)).filter(Boolean);
        if (entries.length === 0) return null;
        return {
          claim: t('claim.headlessDecision'),
          evidence: [journalEv(entries, `specs/${src.ticket}/journal.jsonl`, 92)],
          note: t('note.headlessDecision', { n: entries.length }),
        };
      },
    },
    {
      label: t('label.artefactWritten'),
      find: (tl) => tl.withResult(tl.first(tool('Write', /00-clarification\.md/))),
      content: () => ({
        claim: t('claim.artefactWritten'),
        evidence: [{ type: 'list', source: 'specs/FEATURE-1/00-clarification.md', items: headings, caption: SISTER_CAPTION }],
        note: t('note.artefactWritten'),
      }),
    },
    {
      label: t('label.scriptDecides'),
      find: (tl) => tl.withResult(tl.first(tool('Bash', /validate-clarification\.mjs/))),
      content: () => ({
        claim: t('claim.scriptDecides'),
        evidence: [
          { type: 'quote', source: 'specs/FEATURE-1/00-clarification.md', text: `## Open questions\n\n${openQ}` },
          { type: 'text', text: validatorRule, source: 'docs/contracts.md §4.1' },
        ],
        note: t('note.scriptDecides'),
      }),
    },
    {
      label: t('label.phaseTotal'),
      find: totalLines,
      content: () => ({
        claim: t('claim.clarifyTotal', { turns: phase.result.turns, secs: fmtSecs(phase.result.seconds), usd: fmtUsd(phase.result.cost) }),
        evidence: totalEv(src, phase),
        note: t('note.clarifyTotal'),
      }),
    },
  ]);
}

function planStep(src, phase, jm) {
  const designRule = /^Validator: .*$/m.exec(src.section(src.contracts, /^### 4\.3 /))?.[0];
  const planSection = src.section(src.contracts, /^### 4\.4 /);
  const stepFormat = /```\n(- \[ \] S<n>[^\n]*)\n```/.exec(planSection)?.[1];
  const sisterPlan = src.sister.plan;
  const [scopeTable] = src.readTables(src.section(sisterPlan, /^## Scope check/));
  const verdict = /^Verdict: .*$/m.exec(sisterPlan)?.[0];
  const s2 = sisterPlan.split('\n').find((l) => /^- \[[ x]\] S2 /.test(l));
  const sisterAudit = src.section(sisterPlan, /^## Audit/);
  const families = src.readTables(src.section(src.contracts, /^### 8\.1 /))[0]?.slice(1) ?? [];
  const blockingFamilies = families.filter((f) => !/^Never/.test(f[2])).map((f) => f[0]);
  const adviceFamilies = families.filter((f) => /^Never/.test(f[2])).map((f) => f[0]);
  const auditor = src.agents['plan-auditor'];

  return logStep(src, phase, { id: 'plan', title: t('plan.title'), kicker: t('plan.kicker') }, [
    {
      label: t('label.parallelSearch'),
      find: (tl) => tl.all(tool('Agent', /explorer/)).map((i) => [i, i]),
      content: (ranges, tl, L) => {
        if (ranges.length < 2) return null;
        const answers = L.filter((l) => l.kind === 'text' && /Answer:/.test(l.text)).map((l) =>
          cut(l.text.replace(/^\s*·\s*/, '').replace(/^Ticket: \S+ \([^)]*\)\s*/, ''), 118),
        );
        return {
          claim: t('claim.parallelSearch', { n: ranges.length }),
          evidence: [{ type: 'list', source: t('src.answers'), items: answers, mono: true }],
          note: t('note.parallelSearch'),
        };
      },
    },
    {
      label: t('label.designValidated'),
      find: (tl) => {
        const w = tl.first(tool('Write', /02-design\.md/));
        const v = tl.first(tool('Bash', /validate-design\.mjs/), w);
        return [w, tl.withResult(v)[1]];
      },
      content: () => ({
        claim: t('claim.designValidated'),
        evidence: [{ type: 'text', text: designRule, source: 'docs/contracts.md §4.3' }],
        note: t('note.designValidated'),
      }),
    },
    {
      label: t('label.gateA'),
      find: (tl, L) => {
        const v = tl.first(tool('Bash', /validate-design\.mjs/));
        const j = tl.first(tool('Bash', /journal-append\.mjs/), v);
        return [L[j - 1]?.kind === 'text' ? j - 1 : j, tl.withResult(j)[1]];
      },
      content: ([[a, b]], tl, L) => {
        const call = L.slice(a, b + 1).find(tool('Bash', /journal-append/));
        const entry = call && jm.forCall(call);
        if (!entry) return null;
        return {
          claim: t('claim.gateA'),
          evidence: [journalEv([entry], `specs/${src.ticket}/journal.jsonl`, 180)],
          note: t('note.gateA'),
        };
      },
    },
    {
      label: t('label.scopeCheck'),
      find: (tl) => {
        const w = tl.first(tool('Write', /03-plan\.md/));
        const s = tl.first((l) => l.kind === 'text' && /Single PR|Split/.test(l.text), w);
        return [w, s];
      },
      content: () => ({
        claim: t('claim.scopeCheck', src.thresholds),
        evidence: [
          { type: 'table', source: 'specs/FEATURE-1/03-plan.md ## Scope check', head: scopeTable[0], rows: scopeTable.slice(1), after: verdict, caption: SISTER_CAPTION },
        ],
        note: t('note.scopeCheck'),
      }),
    },
    {
      label: t('label.secondOpinion'),
      find: (tl) => {
        const a = tl.first(tool('Agent', /plan-auditor/));
        return [a, tl.handBack(a)];
      },
      content: (ranges, tl, L) => {
        const result = L.find((l) => l.kind === 'text' && /Blocking: \d+ · Recommendations/.test(l.text));
        const audit = result ? /Blocking: \d+ · Recommendations: \d+ · Iterations: \d+/.exec(result.text)?.[0] : null;
        return {
          claim: t('claim.secondOpinion'),
          evidence: [
            {
              type: 'kv',
              source: `${auditor.path} · docs/contracts.md §8.1 · ## Audit`,
              rows: [
                ['model', `${auditor.model}, effort ${auditor.effort}`],
                [t('kv.canBlock'), blockingFamilies.join(' ')],
                [t('kv.advice'), adviceFamilies.join(' ')],
                audit && [src.ticket, audit],
                ['FEATURE-1', sisterAudit],
              ].filter(Boolean),
            },
          ],
          note: t('note.secondOpinion'),
        };
      },
    },
    {
      label: t('label.planValidated'),
      find: (tl) => tl.withResult(tl.all(tool('Bash', /validate-plan\.mjs/)).at(-1) ?? -1),
      content: () => ({
        claim: t('claim.planValidated'),
        evidence: [
          { type: 'quote', source: t('src.stepFormat'), text: stepFormat },
          { type: 'quote', source: 'specs/FEATURE-1/03-plan.md', text: cut(s2, 130), caption: SISTER_CAPTION },
        ],
        note: t('note.planValidated'),
      }),
    },
    {
      label: t('label.phaseTotal'),
      find: totalLines,
      content: () => ({
        claim: t('claim.planTotal', { turns: phase.result.turns, secs: fmtSecs(phase.result.seconds), usd: fmtUsd(phase.result.cost) }),
        evidence: totalEv(src, phase),
        note: t('note.planTotal'),
      }),
    },
  ]);
}

function implementStep(src, phase, jm) {
  const dev = src.agents['developer-package'];
  const rev = src.agents['reviewer-package'];
  const chainSentence = src.sentenceWith(src.readme, 'turns an allowed command into a denied one');
  const nodeRule = src.settings.permissions.allow.find((r) => r.startsWith('Bash(node .claude/scripts'));
  const s2 = src.sister.plan.split('\n').find((l) => /^- \[[ x]\] S2 /.test(l));

  const layerOf = (L, a, b) => {
    const hit = L.slice(a, b + 1).map((l) => /(packages\/core|packages\/ui|apps\/agenda)/.exec(l.text)?.[1]).find(Boolean);
    return hit ? { 'packages/core': 'core', 'packages/ui': 'ui', 'apps/agenda': 'agenda' }[hit] : '?';
  };
  const passed = (L, a, b) => {
    for (const l of L.slice(a, b + 1)) {
      const m = /"numPassedTests":(\d+)/.exec(l.text);
      if (m) return Number(m[1]);
    }
    return null;
  };
  const pair = (tl, k) => {
    const d = tl.all(tool('Agent', /developer-package/))[k] ?? -1;
    const r = d < 0 ? -1 : tl.first(tool('Agent', /reviewer-package/), d);
    return { d, r };
  };

  return logStep(src, phase, { id: 'implement', title: t('implement.title'), kicker: t('implement.kicker') }, [
    {
      label: t('label.friction'),
      find: (tl, L) => {
        let e = tl.first((l) => l.kind === 'error' && /ESLint|Layer rule/.test(l.text));
        if (e < 0) e = tl.first((l) => l.kind === 'error');
        if (e < 0) return null;
        let cause = e - 1;
        while (cause > 0 && !L[cause].text.startsWith('▶')) cause--;
        return [cause, e];
      },
      content: ([[a]], tl, L) => ({
        claim: /;|&&|\|/.test(L[a].text.replace(/^▶ \w+ /, '')) ? t('claim.frictionChained') : t('claim.frictionOther'),
        evidence: [
          { type: 'text', text: chainSentence, source: 'README.md' },
          { type: 'quote', source: '.claude/settings.json permissions.allow', text: nodeRule },
        ],
        note: t('note.friction'),
      }),
    },
    {
      label: t('label.oneLayer'),
      find: (tl) => {
        const { d } = pair(tl, 0);
        return [d, tl.handBack(d)];
      },
      content: ([[a, b]], tl, L) => {
        const inside = L.slice(a + 1, b);
        const tests = passed(L, a, b);
        const layer = layerOf(L, a, b);
        return {
          claim: t('claim.oneLayer', { layer }),
          evidence: [
            agentKv(dev),
            {
              type: 'stats',
              items: [
                { value: String(inside.filter((l) => l.kind === 'write').length), label: t('stat.filesWritten') },
                { value: String(inside.filter((l) => l.kind === 'edit').length), label: t('stat.edits') },
                tests !== null && { value: String(tests), label: t('stat.testsPass', { layer }) },
              ].filter(Boolean),
            },
          ],
          note: t('note.oneLayer'),
        };
      },
    },
    {
      label: t('label.resumable'),
      find: (tl, L) => {
        const { d } = pair(tl, 0);
        const hb = tl.handBack(d);
        const r = tl.first(tool('Agent', /reviewer-package/), hb);
        const edits = tl.all(tool('Edit', /03-plan\.md/), hb, r);
        if (edits.length === 0) return null;
        const start = L[edits[0] - 1]?.kind === 'text' ? edits[0] - 1 : edits[0];
        return [start, tl.withResult(edits.at(-1))[1]];
      },
      content: (ranges, tl, L) => ({
        claim: t('claim.resumable'),
        evidence: [
          { type: 'stats', items: [{ value: String(L.filter(tool('Edit', /03-plan\.md/)).length), label: t('stat.ticks') }] },
          { type: 'quote', source: t('src.afterImplement'), text: cut(s2, 150), caption: SISTER_CAPTION },
        ],
        note: t('note.resumable'),
      }),
    },
    {
      label: t('label.differentModel'),
      find: (tl, L) => {
        const { r } = pair(tl, 0);
        const hb = tl.handBack(r);
        return [r, L[hb + 1]?.kind === 'text' ? hb + 1 : hb];
      },
      content: ([[a, b]], tl, L) => {
        const diff = L.slice(a, b + 1).find(tool('Bash', /git diff/));
        return {
          claim: t('claim.differentModel'),
          evidence: [agentKv(rev, ['model', 'tools', 'effort']), diff && { type: 'quote', source: t('src.whatItReads'), text: diff.text.replace(/^▶ Bash /, '') }].filter(Boolean),
          note: t('note.differentModel'),
        };
      },
    },
    {
      label: t('label.secondLayer'),
      find: (tl) => {
        const { d, r } = pair(tl, 1);
        return [
          [d, d],
          [r, r],
        ];
      },
      content: ([[d], [r]], tl, L) => {
        const hb = tl.handBack(d);
        const tests = passed(L, d, hb);
        const layer = layerOf(L, d, hb);
        return {
          claim: t('claim.secondLayer', { layer }),
          evidence: [
            {
              type: 'stats',
              items: [
                tests !== null && { value: String(tests), label: t('stat.testsPass', { layer }) },
                { value: fmtSecs(L[tl.handBack(r)].t - L[d].t), label: t('stat.pair') },
              ].filter(Boolean),
            },
          ],
          note: t('note.secondLayer', { layer }),
        };
      },
    },
    {
      label: t('label.thirdLayer'),
      find: (tl) => {
        const { d, r } = pair(tl, 2);
        return [
          [d, d],
          [r, r],
        ];
      },
      content: ([[d], [r]], tl, L) => {
        const hb = tl.handBack(r);
        const layer = layerOf(L, d, tl.handBack(d));
        let findings = jm.forAgent('reviewer-package', L[r], L[hb]);
        let source = `specs/${src.ticket}/journal.jsonl`;
        let caption;
        if (findings.length === 0) {
          findings = src.sister.journal.filter((e) => ['reviewer_finding', 'autofix_failed'].includes(e.kind)).slice(0, 1);
          source = 'specs/FEATURE-1/journal.jsonl';
          caption = SISTER_CAPTION;
        }
        return {
          claim: t('claim.thirdLayer', { layer: `${layer[0].toUpperCase()}${layer.slice(1)}` }),
          evidence: [{ ...journalEv(findings, source, 170), caption }],
          note: t('note.thirdLayer'),
        };
      },
    },
    {
      label: t('label.phaseTotal'),
      find: totalLines,
      content: (ranges, tl, L) => ({
        claim: t('claim.implementTotal', {
          turns: phase.result.turns,
          secs: fmtSecs(phase.result.seconds),
          usd: fmtUsd(phase.result.cost),
          n: L.filter(tool('Agent')).length,
        }),
        evidence: totalEv(src, phase),
        note: t('note.implementTotal'),
      }),
    },
  ]);
}

function validateStep(src, phase, jm) {
  const vg = src.agents['validator-global'];
  const dodTable = src.readTables(src.section(src.sister.dod, /^## Checks/))[0];
  const dodVerdict = src.section(src.sister.dod, /^## Verdict/);
  const run = src.finalRows;
  const total = run.reduce((n, r) => n + r.seconds, 0);
  const cost = run.reduce((n, r) => n + r.cost, 0);

  return logStep(src, phase, { id: 'validate', title: t('validate.title'), kicker: t('validate.kicker') }, [
    {
      label: t('label.noOpinion'),
      find: (tl) => {
        const a = tl.first(tool('Agent', /validator-global/));
        return [a, a];
      },
      content: () => ({ claim: t('claim.noOpinion'), evidence: [agentKv(vg)], note: t('note.noOpinion') }),
    },
    {
      label: t('label.rootScripts'),
      find: (tl) => {
        const a = tl.first(tool('Bash', /^▶ Bash pnpm lint$/));
        const b = tl.first(tool('Bash', /^▶ Bash pnpm build$/), a);
        return [a, tl.withResult(b)[1]];
      },
      content: ([[a, b]], tl, L) => {
        const rows = [];
        for (let i = a; i <= b; i++) {
          if (L[i].kind !== 'bash') continue;
          const res = L[i + 1] && isResult(L[i + 1]) ? L[i + 1].text.replace(/^\s*[✓✗]\s*/, '') : '';
          rows.push([L[i].text.replace(/^▶ Bash /, ''), cut(res, 40)]);
        }
        return {
          claim: t('claim.rootScripts'),
          evidence: [{ type: 'table', source: t('src.thisRun'), head: [t('th.command'), t('th.firstLine')], rows }],
          note: t('note.rootScripts'),
        };
      },
    },
    {
      label: t('label.notFailures'),
      find: (tl, L) => {
        const errs = tl.all((l) => l.kind === 'error' && /^\s*✗ Exit code 1\b/.test(l.text));
        if (errs.length === 0) return null;
        let start = errs[0];
        while (start > 0 && !tool('Bash', /grep/)(L[start])) start--;
        return [start, errs.at(-1)];
      },
      content: ([[a, b]], tl, L) => ({
        claim: t('claim.notFailures'),
        evidence: [{ type: 'list', source: t('src.twoCommands'), items: L.slice(a, b + 1).filter(tool('Bash', /grep/)).map((l) => l.text.replace(/^▶ Bash /, '')), mono: true }],
        note: t('note.notFailures'),
      }),
    },
    {
      label: t('label.dod'),
      find: (tl) => tl.withResult(tl.first(tool('Write', /04-dod\.md/))),
      content: () => ({
        claim: t('claim.dod'),
        evidence: [
          {
            type: 'table',
            source: 'specs/FEATURE-1/04-dod.md',
            head: dodTable[0],
            rows: dodTable.slice(1).map((r) => [r[0], r[1], cut(r[2], 26)]),
            after: `Verdict: ${dodVerdict}`,
            caption: SISTER_CAPTION,
          },
        ],
        note: t('note.dod'),
      }),
    },
    {
      label: t('label.skipped'),
      find: (tl, L) => {
        const j = tl.first(tool('Bash', /journal-append\.mjs/));
        return [L[j - 1]?.kind === 'text' ? j - 1 : j, tl.withResult(j)[1]];
      },
      content: ([[a, b]], tl, L) => {
        const call = L.slice(a, b + 1).find(tool('Bash', /journal-append/));
        const entry = call && jm.forCall(call);
        if (!entry) return null;
        return { claim: t('claim.skipped'), evidence: [journalEv([entry], `specs/${src.ticket}/journal.jsonl`, 160)], note: t('note.skipped') };
      },
    },
    {
      label: t('label.end'),
      find: (tl, L) => [totalLines(tl, L)[0], L.length - 1],
      content: () => ({
        claim: t('claim.end', { clock: fmtClock(total), usd: fmtUsd(cost) }),
        evidence: [
          {
            type: 'stats',
            items: [
              { value: fmtClock(total), label: t('stat.fourPhases') },
              { value: fmtUsd(cost), label: t('stat.wholeRun') },
              { value: fmtUsd(phase.result.cost), label: t('stat.validate') },
            ],
          },
          { type: 'text', text: t('ev.sumFinal'), source: 'docs/run-metrics.md' },
        ],
        note: t('note.end'),
      }),
    },
  ]);
}

// ---------------------------------------------------------------------------------------------------------------

function titleStep(src) {
  const title = /^title:\s*(.+)$/m.exec(src.ticketMd)?.[1];
  const description = src.section(src.ticketMd, /^## Description/);
  const total = src.finalRows.reduce((n, r) => n + r.seconds, 0);
  const cost = src.finalRows.reduce((n, r) => n + r.cost, 0);
  const L = src.lines;
  const runStart = Number(src.cast.header.timestamp) * 1000;
  const decisions = src.journal.filter((e) => e.actor === 'headless' && e.kind === 'decision' && Date.parse(e.ts) >= runStart - 5000).length;
  const heading = t('title.title');
  return {
    id: 'title',
    title: heading,
    titleHtml: renderText(heading),
    kicker: t('title.kicker'),
    phase: t('phase.intro'),
    stage: {
      type: 'title',
      ticket: { id: src.ticket, title, description },
      decisions,
      autonomy: t('title.autonomy', { n: decisions }),
      numbers: [
        { value: fmtClock(total), label: t('num.wallClock') },
        { value: fmtUsd(cost), label: t('num.cost') },
        { value: String(L.filter((l) => l.kind === 'agent').length), label: t('num.agents') },
        { value: String(L.filter((l) => l.kind === 'bash' && /\.claude\/scripts\/validate-/.test(l.text)).length), label: t('num.validators') },
        { value: String(L.filter((l) => l.kind === 'error').length), label: t('num.errors') },
      ],
      legend: [
        ['▶', t('legend.tool')],
        ['✓', t('legend.ok')],
        ['✗', t('legend.error')],
        ['·', t('legend.text')],
        ['■', t('legend.result')],
      ],
      source: t('ui.numbersFrom', { cast: src.castPath, metrics: 'docs/run-metrics.md' }),
    },
    focuses: [{ label: t('label.run'), note: t('note.run') }],
  };
}

function gateStep(src) {
  const blocked = src.demo2.blocked;
  const firstLine = blocked.split('\n').find((l) => /^[A-Z_]+ /.test(l)) ?? '';
  const fenced = /```\n([\s\S]*?)\n```/.exec(blocked)?.[1] ?? '';
  const [scope] = src.readTables(src.section(src.demo2.plan, /^## Scope check/));
  const files = Number(scope?.[1]?.[0]);
  const neverChanged = src.sentenceWith(src.contracts, 'The design is never changed to pass the gate');
  const stillSplits = src.sentenceWith(src.contracts, 'still splits');
  const calibrated = src.sentenceWith(src.contracts, 'calibrated on real runs');
  const enforce = src.validatePlan.split('\n').find((l) => l.includes('mustSplit =')).trim();
  const calibrations = src.journal.filter((e) => /Gate B/.test(e.summary));
  const heading = t('gate.title');
  return {
    id: 'gate-b',
    title: heading,
    titleHtml: renderText(heading),
    kicker: t('gate.kicker'),
    phase: t('phase.gate'),
    stage: {
      type: 'gate',
      blocked: { source: 'specs/FEATURE-2/BLOCKED.md', firstLine, fenced },
      calibrations: journalEv(calibrations, `specs/${src.ticket}/journal.jsonl`, 400),
      enforce: { source: '.claude/scripts/validate-plan.mjs', text: enforce },
    },
    focuses: [
      {
        label: t('label.gateStopped'),
        claim: t('claim.gateStopped', { files }),
        evidence: [{ type: 'text', text: neverChanged, source: 'docs/contracts.md §4.4' }],
        note: t('note.gateStopped'),
        items: ['blocked'],
      },
      {
        label: t('label.calibrated'),
        claim: t('claim.calibrated'),
        evidence: [
          { type: 'text', text: calibrated, source: 'docs/contracts.md §4.4' },
          { type: 'text', text: stillSplits, source: 'docs/contracts.md §4.4' },
        ],
        note: t('note.calibrated'),
        items: ['calibrations', 'enforce'],
      },
    ],
  };
}

function journalStep(src) {
  const attempts = src.journalAttempts(src.journal);
  const rowsFor = (k) =>
    k === attempts.length - 1 ? src.finalRows : src.metrics.filter((r) => r.ticket === src.ticket && r.status.includes(`attempt ${k + 1}`));
  const lessonsPara = src.section(src.contracts, /^## 6\. Lessons/);
  const friction = [...(/Only friction kinds become lessons: ([^.]+)\./.exec(lessonsPara)?.[1] ?? '').matchAll(/`([a-z_]+)`/g)].map((m) => m[1]);
  const lessonReads = src.phases.map((p) => ({ p, l: p.lines.find(tool('Read', /specs\/lessons\.json/)) })).filter((x) => x.l);
  const counts = src.lessons.reduce((acc, l) => ({ ...acc, [l.status]: (acc[l.status] ?? 0) + 1 }), {});
  const heading = t('journal.title');

  const attemptFocus = (k) => {
    const rows = rowsFor(k);
    const entries = attempts[k];
    const kinds = unique(entries.map((e) => e.kind));
    const isFinal = k === attempts.length - 1;
    const stopped = rows.find((r) => !r.status.startsWith('success'));
    const n = k + 1;
    let claim;
    if (isFinal) claim = t('claim.attemptFinal', { n, entries: entries.length });
    else if (/Gate B/.test(entries.map((e) => e.summary).join(' ')) && kinds.includes('user_decision')) claim = t('claim.attemptGate', { n });
    else if (kinds.includes('validator_red')) claim = t('claim.attemptRed', { n });
    else claim = t('claim.attemptOther', { n, summary: cut(entries.at(-1).summary, 120) });
    return {
      label: t('label.attempt', { n }),
      claim,
      evidence: [
        {
          type: 'table',
          source: 'docs/run-metrics.md',
          head: [t('th.phase'), t('th.time'), t('th.cost'), t('th.status')],
          rows: rows.map((r) => [r.phase.replace(/^spec-/, ''), fmtSecs(r.seconds), fmtUsd(r.cost), cut(r.status.replace(/\s*\(.*$/, ''), 22)]),
        },
        stopped && { type: 'text', text: cut(/\((.*)\)/.exec(stopped.status)?.[1] ?? stopped.status, 200), source: t('src.metricsStatus') },
      ].filter(Boolean),
      note: isFinal ? t('note.attemptFinal') : k === 0 ? t('note.attemptFirst') : t('note.attemptSecond'),
      rows: entries.map((e) => e.line),
    };
  };

  return {
    id: 'journal',
    title: heading,
    titleHtml: renderText(heading),
    kicker: t('journal.kicker', { path: `specs/${src.ticket}/journal.jsonl` }),
    phase: t('phase.journal'),
    stage: { type: 'journal', entries: src.journal, attempts: attempts.map((a) => a.map((e) => e.line)), source: `specs/${src.ticket}/journal.jsonl` },
    focuses: [
      ...attempts.map((a, k) => attemptFocus(k)),
      {
        label: t('label.lessonsLoop'),
        claim: t('claim.lessonsLoop'),
        evidence: [
          {
            type: 'stats',
            items: [
              { value: String(src.lessons.length), label: t('stat.lessons') },
              { value: String(counts.candidate ?? 0), label: t('stat.candidate') },
              { value: String((counts.confirmed ?? 0) + (counts.applied ?? 0)), label: t('stat.confirmed') },
            ],
          },
          { type: 'list', source: t('src.thisRun'), mono: true, items: lessonReads.map(({ p, l }) => `${fmtClock(l.t)}  ${phaseShort(p.name)}  ${l.text}`) },
        ],
        note: t('note.lessonsLoop'),
        rows: src.journal.filter((e) => friction.includes(e.kind)).map((e) => e.line),
      },
    ],
  };
}

function numbersStep(src) {
  const run = src.finalRows;
  const total = run.reduce((n, r) => n + r.cost, 0);
  const heavy = run.filter((r) => /plan|implement/.test(r.phase)).reduce((n, r) => n + r.cost, 0);
  const agentsTable = src.readTables(src.readme).find((tb) => tb[0][0] === 'Agent' && tb[0].some((h) => /List price/.test(h)));
  const h = agentsTable[0];
  const col = (name) => h.findIndex((x) => x.startsWith(name));
  const agentRows = agentsTable.slice(1).map((r) => {
    const [, model, price] = /^(.*?):\s*(.*)$/.exec(r[col('List price')]) ?? [null, r[col('Model')], r[col('List price')]];
    return [r[col('Agent')], model, r[col('Tools')], r[col('Effort')], price];
  });
  const fable = /Fable 5\.1 \((\$[\d.]+ \/ \$[\d.]+)\)/.exec(src.readme)?.[1];
  const tickets = ['FEATURE-1', 'FEATURE-3', src.ticket].map((id) => {
    const rows = src.finalRun(src.metrics, id);
    return { id, main: rows[0]?.models[0]?.name ?? '', cost: rows.reduce((n, r) => n + r.cost, 0), seconds: rows.reduce((n, r) => n + r.seconds, 0) };
  });
  const heading = t('numbers.title');
  return {
    id: 'numbers',
    title: heading,
    titleHtml: renderText(heading),
    kicker: t('numbers.kicker'),
    phase: t('phase.numbers'),
    stage: {
      type: 'numbers',
      run: {
        source: 'docs/run-metrics.md',
        head: [t('th.phase'), t('th.duration'), t('th.turns'), t('th.costUsd'), t('th.models')],
        rows: run.map((r) => [r.phase.replace(/^spec-/, ''), fmtSecs(r.seconds), String(r.turns), r.cost.toFixed(2), r.models.map((m) => m.name).join(', ')]),
        total: [t('th.total'), fmtClock(run.reduce((n, r) => n + r.seconds, 0)), String(run.reduce((n, r) => n + r.turns, 0)), total.toFixed(2), ''],
      },
      agents: { source: 'README.md · .claude/agents/*.md', head: [t('th.agent'), t('th.model'), t('th.tools'), t('th.effort'), t('th.price')], rows: agentRows, fable },
      compare: { source: 'docs/run-metrics.md', tickets },
    },
    focuses: [
      {
        label: t('label.perPhase'),
        claim: t('claim.perPhase', { pct: Math.round((heavy / total) * 100) }),
        evidence: [{ type: 'text', text: t('ev.usageFields'), source: 'docs/contracts.md §12' }],
        note: t('note.perPhase'),
        items: ['run'],
      },
      {
        label: t('label.rightModel'),
        claim: t('claim.rightModel'),
        evidence: [{ type: 'text', text: t('ev.mainThread', { fable }), source: 'README.md' }],
        note: t('note.rightModel'),
        items: ['agents'],
      },
      {
        label: t('label.sameHarness'),
        claim: t('claim.sameHarness', { a: tickets[0].cost.toFixed(2), b: tickets[1].cost.toFixed(2), c: tickets[2].cost.toFixed(2) }),
        evidence: [{ type: 'text', text: t('ev.sameModels'), source: 'docs/run-metrics.md' }],
        note: t('note.sameHarness'),
        items: ['compare'],
      },
    ],
  };
}

function treeStep(src, repoUrl) {
  const firstSentence = (s) => (s ?? '').split(/(?<=\.)\s/)[0];
  const items = [];
  const add = (path, name, desc, depth, opts = {}) => items.push({ path, name, desc, depth, ...opts });

  add('.claude/', '.claude/', '', 0, { dir: true });
  add('.claude/settings.json', 'settings.json', /settings\.json\s{2,}(.+)/.exec(src.readme)?.[1]?.trim() ?? '', 1);
  add('.claude/agents/', 'agents/', '', 1, { dir: true });
  for (const [name, a] of Object.entries(src.agents)) add(a.path, `${name}.md`, `${a.model} · ${a.tools} · effort ${a.effort}`, 2);
  add('.claude/skills/', 'skills/', '', 1, { dir: true });
  for (const [name, s] of Object.entries(src.skills)) add(`.claude/skills/${name}/`, `${name}/`, firstSentence(s.description), 2);
  add('.claude/hooks/', 'hooks/', '', 1, { dir: true });
  for (const f of src.tree['.claude/hooks']) {
    if (f.dir || f.name.includes('.test.')) continue;
    add(f.path, f.name, firstSentence(src.headers[f.path]), 2, { test: src.hasTest(f.path) });
  }
  add('.claude/scripts/', 'scripts/', '', 1, { dir: true });
  const hooksTable = src.readTables(src.section(src.readme, /^### Hooks and validators/))[0] ?? [];
  const behaviour = (name) => hooksTable.find((r) => r[0] === `\`${name}\``)?.[2] ?? '';
  const journalAppend = /(Only `journal-append\.mjs` writes it: [^.]+\.)/.exec(src.readme)?.[1];
  const aggregate = /`lessons-aggregate\.mjs`, which ([^.]+)\./.exec(src.readme)?.[1];
  const hasValidatorsTest = src.tree['.claude/scripts'].some((x) => x.name === 'validators.test.mjs');
  for (const f of src.tree['.claude/scripts']) {
    if (f.name.includes('.test.') || f.name === 'README.md') continue;
    if (f.dir) {
      const desc = f.name === 'fixtures' ? t('ui.fixtures', { n: src.fixtureCount }) : firstSentence(src.headers['.claude/scripts/lib/markdown.mjs']);
      add(`${f.path}/`, `${f.name}/`, desc, 2);
      continue;
    }
    let desc = behaviour(f.name);
    if (f.name === 'journal-append.mjs' && journalAppend) desc = journalAppend;
    if (f.name === 'lessons-aggregate.mjs' && aggregate) desc = `${aggregate[0].toUpperCase()}${aggregate.slice(1)}`;
    add(f.path, f.name, desc, 2, { test: src.hasTest(f.path) || (hasValidatorsTest && f.name.startsWith('validate-')) });
  }
  add('scripts/', 'scripts/', '', 0, { dir: true });
  for (const f of src.tree.scripts) {
    if (f.dir || f.name.includes('.test.') || f.name.startsWith('build-demo-page')) continue;
    add(f.path, f.name, firstSentence(src.headers[f.path]), 1, { test: src.hasTest(f.path) });
  }
  for (const f of src.tree['scripts/lib']) {
    if (f.dir || f.name.includes('.test.')) continue;
    add(f.path, `lib/${f.name}`, cut(firstSentence(src.headers[f.path]), 90), 1, { test: src.hasTest(f.path) });
  }
  add('scripts/prompts/', 'prompts/', src.tree['scripts/prompts'].map((f) => f.name).join(', '), 1);
  add('elsewhere', t('ui.elsewhere'), '', 0, { dir: true });
  add('eslint.config.js', 'eslint.config.js', /\/\/ (Layer boundaries:[^\n]+)/.exec(src.eslintConfig)?.[1] ?? '', 1);
  const claudeMd = /\((each package has a CLAUDE\.md with its conventions)\)/.exec(src.readme)?.[1] ?? '';
  add('packages/*/CLAUDE.md', 'packages/*/CLAUDE.md', claudeMd ? `${claudeMd[0].toUpperCase()}${claudeMd.slice(1)}` : '', 1);

  const lessonsTable = src.readTables(src.readme).find((tb) => tb[0][0] === 'Lesson');
  const lessons = lessonsTable.slice(1).map(([lesson, where], k) => {
    const paths = [...where.matchAll(/`([^`]+)`/g)].map((m) => m[1]).filter((p) => /[/.]/.test(p));
    const matches = items
      .filter((it) => !it.dir || it.path === '.claude/agents/')
      .filter((it) => paths.some((p) => it.path === p || (p.endsWith('/') && it.path.startsWith(p))))
      .map((it) => it.path);
    // The README lesson is the English source; the Spanish line is the talk's own wording of it.
    const claim = t(`claim.lesson${k + 1}`);
    return { lesson: { en: `${lesson}.`, es: claim.es }, where, matches };
  });

  const heading = t('harness.title');
  return {
    id: 'harness',
    title: heading,
    titleHtml: renderText(heading),
    kicker: t('harness.kicker'),
    phase: t('phase.harness'),
    stage: { type: 'tree', items, repoUrl, lessons: lessons.map((l) => l.lesson) },
    focuses: [
      ...lessons.map((l, k) => ({
        label: t('label.lesson', { n: k + 1 }),
        claim: l.lesson,
        evidence: [{ type: 'text', text: l.where, source: t('src.lessons') }],
        note: t(`note.lesson${k + 1}`),
        tree: l.matches,
      })),
      { label: t('label.repo'), closing: true, note: t('note.repo') },
    ],
  };
}

/** Builds the nine steps of the page from the loaded sources. */
export function buildSteps(src, { repoUrl }) {
  src.finalRows = src.finalRun(src.metrics, src.ticket);
  src.thresholds = (() => {
    const m = /files > (\d+) \|\| lines > (\d+) \|\| .*symbols > (\d+)/.exec(src.validatePlan);
    return m ? { files: Number(m[1]), lines: Number(m[2]), symbols: Number(m[3]) } : { files: NaN, lines: NaN, symbols: NaN };
  })();
  const jm = journalMatcher(src);
  const byName = Object.fromEntries(src.phases.map((p) => [p.name, p]));
  const need = (name) => {
    if (!byName[name]) throw new Error(`phase ${name} not found in the cast`);
    return byName[name];
  };
  return [
    titleStep(src),
    clarifyStep(src, need('spec-clarify'), jm),
    planStep(src, need('spec-plan'), jm),
    gateStep(src),
    implementStep(src, need('spec-implement'), jm),
    validateStep(src, need('spec-validate'), jm),
    journalStep(src),
    numbersStep(src),
    treeStep(src, repoUrl),
  ];
}
