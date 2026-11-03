// HTML rendering for the demo page. Pure functions from the step model to strings; no I/O.
// Narration values are localized `{ en, es }` objects: they render as two `lang` spans and CSS shows the active one.
import { LANGS, isLoc, t } from './i18n.mjs';

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const fmtClock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const cut = (text, n) => (Array.from(text).length > n ? `${Array.from(text).slice(0, n - 1).join('')}…` : text);
const fAttr = (ks) => (ks.length ? ` data-f="${ks.join(' ')}"` : '');

/** Escapes text and keeps ticket ids such as DEMO-4 from breaking at the hyphen. */
const escNoBreak = (text) => esc(text).replace(/\b([A-Z]+-\d+)\b/g, '<span class="nw">$1</span>');

/**
 * Renders a plain or localized string. A localized one becomes one span per language (identical versions collapse
 * into plain text). `noBreak` keeps ticket ids whole; `strip` removes markdown backticks.
 */
export function renderText(value, { noBreak = false, strip = false } = {}) {
  const one = (s) => {
    const text = strip ? String(s).replace(/`/g, '') : s;
    return noBreak ? escNoBreak(text) : esc(text);
  };
  if (!isLoc(value)) return one(value ?? '');
  if (value.en === value.es) return one(value.en);
  return LANGS.map((lang) => `<span class="i18n" lang="${lang}">${one(value[lang])}</span>`).join('');
}
const tx = (v) => renderText(v);

// ---------------------------------------------------------------------------------------------------------------
// Evidence

function src(source) {
  return source ? `<p class="src">${tx(source)}</p>` : '';
}

function caption(text) {
  return text ? `<p class="caption">${tx(text)}</p>` : '';
}

function evidence(ev) {
  switch (ev.type) {
    case 'text':
      return `<div class="ev"><p class="ev-text">${renderText(ev.text, { noBreak: true, strip: true })}</p>${src(ev.source)}</div>`;
    case 'quote':
      return `<div class="ev"><pre class="ev-quote">${tx(ev.text)}</pre>${src(ev.source)}${caption(ev.caption)}</div>`;
    case 'list':
      return `<div class="ev"><ul class="ev-list${ev.mono ? ' mono' : ''}">${ev.items.map((i) => `<li>${tx(i)}</li>`).join('')}</ul>${src(ev.source)}${caption(ev.caption)}</div>`;
    case 'kv':
      return `<div class="ev"><dl class="ev-kv">${ev.rows.map(([k, v]) => `<div><dt>${tx(k)}</dt><dd>${tx(v)}</dd></div>`).join('')}</dl>${src(ev.source)}</div>`;
    case 'stats':
      return `<div class="ev ev-stats">${ev.items.map((i) => `<div><b>${tx(i.value)}</b><span>${tx(i.label)}</span></div>`).join('')}</div>`;
    case 'table':
      return `<div class="ev"><table class="ev-table"><thead><tr>${ev.head.map((h) => `<th>${tx(h)}</th>`).join('')}</tr></thead><tbody>${ev.rows
        .map((r) => `<tr>${r.map((c) => `<td>${tx(c)}</td>`).join('')}</tr>`)
        .join('')}</tbody></table>${ev.after ? `<p class="ev-after">${tx(ev.after)}</p>` : ''}${src(ev.source)}${caption(ev.caption)}</div>`;
    case 'journal':
      return `<div class="ev">${journalEntries(ev)}${src(ev.source)}${caption(ev.caption)}</div>`;
    default:
      throw new Error(`unknown evidence type ${ev.type}`);
  }
}

function card(focus, k, { showTime }) {
  const at = showTime && Number.isFinite(focus.t) ? ` <span class="at">${tx(t('ui.at', { t: fmtClock(focus.t) }))}</span>` : '';
  return `<article class="card" data-card="${k + 1}"${k === 0 ? '' : ' hidden'}>
<p class="eyebrow"><span class="num">${k + 1}</span>${tx(focus.label)}${at}</p>
<p class="claim">${renderText(focus.claim, { noBreak: true })}</p>
${(focus.evidence ?? []).map(evidence).join('\n')}
</article>`;
}

function cards(step, opts = {}) {
  const withClaims = step.focuses.filter((f) => f.claim);
  return `<div class="cards">${withClaims.map((f) => card(f, step.focuses.indexOf(f), opts)).join('\n')}</div>`;
}

// ---------------------------------------------------------------------------------------------------------------
// Stages

function logLine(line, i, step) {
  const ks = [];
  let tag = '';
  step.focuses.forEach((f, k) => {
    if (f.ranges.some(([a, b]) => i >= a && i <= b)) ks.push(k + 1);
    if (f.ranges[0][0] === i) tag = String(k + 1);
  });
  const text = line.text.replace(/^\s+/, '');
  const m = /^(▶) (\w+)(.*)$/.exec(text);
  let body;
  if (m) body = `<b class="gl">${m[1]}</b> <span class="tn">${esc(m[2])}</span>${esc(m[3])}`;
  else {
    const g = /^([✓✗·■])(.*)$/.exec(text);
    body = g ? `<b class="gl">${g[1]}</b>${esc(g[2])}` : esc(text);
  }
  return `<div class="ln k-${line.kind}"${fAttr(ks)}><span class="g">${tag ? `<span class="tag">${tag}</span>` : ''}</span><span class="tx">${body}</span></div>`;
}

function logStage(step) {
  const { lines, phaseName, result } = step.stage;
  const tail = result ? ` · ${result.seconds.toFixed(1)} s · $${result.cost.toFixed(2)}` : '';
  const head = `${tx(t('ui.liveLog'))} · ${esc(phaseName)} · ${tx(t('ui.lines', { n: lines.length }))}${esc(tail)}`;
  return `<div class="panel stage"><p class="panel-head">${head}</p><div class="scroller log">${lines.map((l, i) => logLine(l, i, step)).join('\n')}</div></div>`;
}

function itemAttr(step, name) {
  return fAttr(step.focuses.flatMap((f, k) => ((f.items ?? []).includes(name) ? [k + 1] : [])));
}

function journalEntries(ev, opts = {}) {
  return `<ul class="ev-journal">${ev.entries
    .map(
      (e) =>
        `<li><span class="jmeta"><span class="pill kind-${esc(e.kind)}">${esc(e.kind)}</span> ${esc(e.actor)} · ${esc(e.ts)} · #${e.line}</span><span class="jsum">${esc(opts.n ? cut(e.summary, opts.n) : e.summary)}</span></li>`,
    )
    .join('')}</ul>`;
}

/** The fenced report inside BLOCKED.md: its markdown table as a table, bullets as a list, the rest as lines. */
function blockedBody(fenced) {
  const out = [];
  let rows = [];
  let items = [];
  const flush = () => {
    if (rows.length) {
      const cells = rows.filter((r) => !/^\|[-|\s]+\|$/.test(r)).map((r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
      out.push(table({ head: cells[0], rows: cells.slice(1) }));
    }
    if (items.length) out.push(`<ul class="ev-list">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`);
    rows = [];
    items = [];
  };
  for (const line of fenced.split('\n')) {
    if (line.startsWith('|')) rows.push(line.trim());
    else if (line.startsWith('- ')) items.push(line.slice(2));
    else {
      flush();
      if (line.trim()) out.push(`<p class="blocked-text">${esc(line)}</p>`);
    }
  }
  flush();
  return `<div class="blocked-body">${out.join('')}</div>`;
}

function gateStage(step) {
  const { blocked, calibrations, enforce } = step.stage;
  return `<div class="stage stack scroller">
<section class="panel item"${itemAttr(step, 'blocked')}><p class="panel-head">${esc(blocked.source)}</p><div class="item-body"><p class="blocked-line"><span class="pill kind-blocked">${esc(blocked.firstLine.split(' ')[0])}</span> ${esc(blocked.firstLine.split(' ').slice(1).join(' '))}</p>${blockedBody(blocked.fenced)}</div></section>
<section class="panel item"${itemAttr(step, 'calibrations')}><p class="panel-head">${esc(calibrations.source)} · ${tx(t('ui.gateEntries'))}</p><div class="item-body">${journalEntries(calibrations, { n: 230 })}</div></section>
<section class="panel item"${itemAttr(step, 'enforce')}><p class="panel-head">${esc(enforce.source)}</p><div class="item-body"><pre class="ev-quote">${esc(enforce.text)}</pre></div></section>
</div>`;
}

function journalStage(step) {
  const { entries, attempts, source } = step.stage;
  const firstOf = new Map(attempts.map((a, k) => [a[0], k]));
  const kinds = [...new Set(entries.map((e) => e.kind))].sort();
  const rows = entries
    .map((e) => {
      const ks = step.focuses.flatMap((f, k) => ((f.rows ?? []).includes(e.line) ? [k + 1] : []));
      const k = firstOf.get(e.line);
      const label = firstOf.has(e.line) ? `${tx(t('ui.attempt', { n: k + 1 }))}${k === attempts.length - 1 ? ` · ${tx(t('ui.theRecording'))}` : ''}` : '';
      const sep = label ? `<p class="sep">${label}</p>` : '';
      return `${sep}<div class="jr"${fAttr(ks)}><p class="jmeta"><span class="jn">#${e.line}</span> ${esc(e.ts.slice(11, 19))} · ${esc(e.actor)} <span class="pill kind-${esc(e.kind)}">${esc(e.kind)}</span></p><p class="jline">${esc(e.summary)}</p></div>`;
    })
    .join('\n');
  return `<div class="panel stage"><p class="panel-head">${esc(source)} · ${tx(t('ui.lines', { n: entries.length }))}</p>
<p class="kinds">${kinds.map((k) => `<span class="pill kind-${esc(k)}">${esc(k)}</span>`).join(' ')}</p>
<div class="scroller jlist" data-anchor="end">${rows}</div></div>`;
}

function table(tb, extraRow) {
  return `<table class="ntable"><thead><tr>${tb.head.map((h) => `<th>${tx(h)}</th>`).join('')}</tr></thead><tbody>${tb.rows
    .map((r) => `<tr>${r.map((c) => `<td>${tx(c)}</td>`).join('')}</tr>`)
    .join('')}${extraRow ? `<tr class="total">${extraRow.map((c) => `<td>${tx(c)}</td>`).join('')}</tr>` : ''}</tbody></table>`;
}

function numbersStage(step) {
  const { run, agents, compare } = step.stage;
  const fmtMin = (s) => `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`;
  return `<div class="stage stack scroller">
<section class="panel item"${itemAttr(step, 'run')}><p class="panel-head">${tx(t('ui.finalRun', { ticket: 'DEMO-4' }))} · ${esc(run.source)}</p><div class="item-body">${table(run, run.total)}</div></section>
<section class="panel item"${itemAttr(step, 'agents')}><p class="panel-head">${tx(t('ui.agents'))} · ${esc(agents.source)}</p><div class="item-body">${table(agents)}</div></section>
<section class="panel item"${itemAttr(step, 'compare')}><p class="panel-head">${tx(t('ui.fourPhases'))} · ${esc(compare.source)}</p><div class="item-body compare">${compare.tickets
    .map((c) => `<div><b>${esc(c.cost.toFixed(2))} USD</b><span>${esc(c.id)} · ${esc(c.main)}</span><span>${esc(fmtMin(c.seconds))}</span></div>`)
    .join('')}</div></section>
</div>`;
}

function treeStage(step) {
  const { items } = step.stage;
  const rows = items
    .map((it) => {
      const ks = step.focuses.flatMap((f, k) => ((f.tree ?? []).includes(it.path) ? [k + 1] : []));
      const desc = it.desc ? `<span class="td">${renderText(it.desc, { strip: true })}</span>` : '';
      return `<div class="tr d${it.depth}${it.dir ? ' dir' : ''}"${fAttr(ks)}><span class="tn">${tx(it.name)}</span>${desc}${it.test ? `<span class="tt">${tx(t('ui.plusTest'))}</span>` : ''}</div>`;
    })
    .join('\n');
  return `<div class="panel stage"><p class="panel-head">${tx(t('ui.harnessHead'))}</p><div class="scroller tree">${rows}</div></div>`;
}

function closingView(step, repoUrl, qr) {
  const shown = repoUrl.replace(/^https?:\/\//, '');
  const cutAt = shown.lastIndexOf('/') + 1;
  const lessons = (step.stage.lessons ?? []).map((l, k) => `<li><span class="ln-n">${k + 1}</span>${renderText(l)}</li>`).join('');
  const image = qr ? `<img class="qr" src="${qr}" width="450" height="450" alt="QR code: ${esc(shown)}">` : '';
  return `<div class="closing-view">
<div class="closing-text"><p class="kicker">${tx(t('ui.threeLessons'))}</p><ol class="closing-lessons">${lessons}</ol><p class="closing-sub">${tx(t('ui.closingSub'))}</p></div>
<div class="qr-card">${image}<span class="qr-scan">${tx(t('ui.scan'))}</span><a class="qr-url" href="${esc(repoUrl)}"><span>${esc(shown.slice(0, cutAt))}</span><span>${esc(shown.slice(cutAt))}</span></a></div>
</div>`;
}

function titleStage(step) {
  const { ticket, numbers, legend, source } = step.stage;
  return `<div class="title-stage">
<div class="hero"><p class="kicker">${tx(step.kicker)}</p><h1 class="hero-title">${step.titleHtml}</h1></div>
<section class="panel ticket"><p class="panel-head">tickets/${esc(ticket.id)}.md</p><div class="item-body"><p class="ticket-id">${esc(ticket.id)}</p><p class="ticket-title">${esc(ticket.title)}</p><p class="ticket-desc">${esc(ticket.description)}</p></div></section>
<div class="numbers">${numbers.map((n) => `<div><b>${esc(n.value)}</b><span>${tx(n.label)}</span></div>`).join('')}</div>
<p class="legend">${legend.map(([g, l]) => `<span><b class="gl">${esc(g)}</b> ${tx(l)}</span>`).join('')}</p>
<p class="src keys">${tx(source)}</p>
<p class="src keys">${tx(t('ui.keys'))}</p>
</div>`;
}

// ---------------------------------------------------------------------------------------------------------------

function renderStep(step, i, total, repoUrl, qr) {
  const type = step.stage.type;
  const corner = `<p class="corner">${tx(t('ui.step'))} ${i + 1} / ${total} · ${tx(step.phase)}</p>`;
  const bar =
    type === 'title'
      ? `<header class="bar">${corner}</header>`
      : `<header class="bar"><div><p class="kicker">${tx(step.kicker)}</p><h1 class="title">${step.titleHtml}</h1></div>${corner}</header>`;
  let main;
  if (type === 'title') main = titleStage(step);
  else {
    const stage = { log: logStage, gate: gateStage, journal: journalStage, numbers: numbersStage, tree: treeStage }[type](step);
    main = `<div class="main main-${type}">${stage}${cards(step, { showTime: type === 'log' })}</div>`;
  }
  const closing = step.focuses.some((f) => f.closing) ? closingView(step, repoUrl, qr) : '';
  return `<section class="step step-${type}" id="step-${i + 1}" data-step="${i}"${i === 0 ? '' : ' hidden'}>
${bar}
${main}
${closing}
</section>`;
}

const plain = (v) => (isLoc(v) ? { en: v.en, es: v.es } : { en: String(v ?? ''), es: String(v ?? '') });

/** Fills the template with the rendered steps, the CSS, the JS and the JSON the navigation needs. */
export function renderPage({ steps, assets, repoUrl }) {
  const body = steps.map((s, i) => renderStep(s, i, steps.length, repoUrl, assets.qr)).join('\n');
  const data = {
    langs: LANGS,
    ui: { step: plain(t('ui.step')) },
    steps: steps.map((s) => ({
      id: s.id,
      title: plain(s.title),
      phase: plain(s.phase),
      focuses: s.focuses.map((f) => ({ label: plain(f.label), note: plain(f.note), closing: Boolean(f.closing) })),
    })),
  };
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  const fill = {
    '/*{{CSS}}*/': assets.css.trim(),
    '/*{{JS}}*/': assets.js.trim(),
    '{{BODY}}': body,
    '{{DATA}}': json,
  };
  let html = assets.template;
  for (const [key, value] of Object.entries(fill)) html = html.split(key).join(value);
  return html;
}
