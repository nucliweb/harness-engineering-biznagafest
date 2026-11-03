/* global document, window, location, history */
// Navigation for the demo page: one focus at a time, steps in order, the URL hash tracks where you are.
(() => {
  const data = JSON.parse(document.getElementById('demo-data').textContent);
  const sections = Array.from(document.querySelectorAll('.step'));
  const notes = document.getElementById('notes');
  const bar = document.getElementById('progress-bar');
  const root = document.documentElement;
  const offsets = [];
  let totalFocuses = 0;
  data.steps.forEach((s) => {
    offsets.push(totalFocuses);
    totalFocuses += Math.max(1, s.focuses.length);
  });

  let cur = { s: 0, f: 0 };

  const focusCount = (s) => Math.max(1, data.steps[s].focuses.length);

  function readHash() {
    const m = /^#s(\d+)(?:-(\d+))?$/.exec(location.hash);
    if (!m) return null;
    const s = Math.min(Math.max(Number(m[1]) - 1, 0), sections.length - 1);
    const f = Math.min(Math.max(Number(m[2] ?? 1) - 1, 0), focusCount(s) - 1);
    return { s, f };
  }

  function writeHash() {
    const hash = `#s${cur.s + 1}-${cur.f + 1}`;
    if (location.hash === hash) return;
    try {
      history.replaceState(null, '', hash);
    } catch {
      location.hash = hash;
    }
  }

  function markRuns(scope) {
    const on = Array.from(scope.querySelectorAll('.on'));
    const set = new Set(on);
    for (const el of on) {
      el.classList.toggle('rs', !set.has(el.previousElementSibling));
      el.classList.toggle('re', !set.has(el.nextElementSibling));
    }
  }

  function scrollToFocus(section) {
    const scroller = section.querySelector('.scroller');
    if (!scroller) return;
    const on = Array.from(scroller.querySelectorAll('.on'));
    if (on.length === 0) return;
    const box = scroller.getBoundingClientRect();
    const top = on[0].getBoundingClientRect().top - box.top + scroller.scrollTop;
    const bottom = on[on.length - 1].getBoundingClientRect().bottom - box.top + scroller.scrollTop;
    const view = scroller.clientHeight;
    const span = bottom - top;
    const fromEnd = scroller.dataset.anchor === 'end';
    let target = top - (view - span) / 2;
    const runs = Array.from(scroller.querySelectorAll('.on.rs'));
    if (span > view * 0.86) {
      if (fromEnd && runs.length === 1) target = bottom - view * 0.94;
      else if (runs.length > 1 && !fromEnd) target = runs[runs.length - 1].getBoundingClientRect().top - box.top + scroller.scrollTop - view * 0.5;
      else target = top - view * 0.08;
    }
    scroller.scrollTop = Math.max(0, target);
  }

  function render() {
    const step = data.steps[cur.s];
    const focus = step.focuses[cur.f] ?? { note: '' };
    const k = String(cur.f + 1);
    sections.forEach((sec, i) => {
      sec.hidden = i !== cur.s;
    });
    const section = sections[cur.s];
    const marked = section.querySelectorAll('[data-f]');
    marked.forEach((el) => el.classList.toggle('on', el.dataset.f.split(' ').includes(k)));
    section.querySelectorAll('.main').forEach((m) => m.classList.toggle('focusing', marked.length > 0));
    markRuns(section);
    section.querySelectorAll('.card').forEach((c) => {
      c.hidden = c.dataset.card !== k;
    });
    section.classList.toggle('closing', Boolean(focus.closing));
    const lang = currentLang();
    const corner = section.querySelector('.corner');
    if (corner) corner.textContent = `${data.ui.step[lang]} ${cur.s + 1} / ${sections.length} · ${step.phase[lang]}`;
    scrollToFocus(section);
    const done = offsets[cur.s] + cur.f + 1;
    bar.style.width = `${(done / totalFocuses) * 100}%`;
    notes.innerHTML = '';
    if (focus.note && focus.note[lang]) {
      const b = document.createElement('b');
      b.textContent = `${cur.s + 1}.${cur.f + 1} ${focus.label ? focus.label[lang] : ''}`;
      notes.append(b, document.createTextNode(focus.note[lang]));
    }
    document.title = `${cur.s + 1}/${sections.length} ${step.title[lang]}`;
    writeHash();
  }

  function go(s, f = 0) {
    cur = { s: Math.min(Math.max(s, 0), sections.length - 1), f: 0 };
    cur.f = f === 'last' ? focusCount(cur.s) - 1 : Math.min(Math.max(f, 0), focusCount(cur.s) - 1);
    render();
  }

  function next() {
    if (cur.f < focusCount(cur.s) - 1) go(cur.s, cur.f + 1);
    else if (cur.s < sections.length - 1) go(cur.s + 1, 0);
  }

  function prev() {
    if (cur.f > 0) go(cur.s, cur.f - 1);
    else if (cur.s > 0) go(cur.s - 1, 'last');
  }

  function currentLang() {
    return root.dataset.lang === 'es' ? 'es' : 'en';
  }

  /** Switches the language in place: same step, same focus; the URL keeps the choice for a reload. */
  function toggleLang() {
    const lang = currentLang() === 'es' ? 'en' : 'es';
    root.dataset.lang = lang;
    root.lang = lang;
    try {
      const url = new URL(location.href);
      url.searchParams.set('lang', lang);
      history.replaceState(null, '', url.href);
    } catch {
      /* the in-page switch still works without a URL update */
    }
    render();
  }

  function toggleTheme() {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
  }

  function toggleFullscreen() {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else root.requestFullscreen().catch(() => {});
    } catch {
      /* fullscreen is optional */
    }
  }

  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const key = e.key;
    if (key === 'ArrowRight' || key === ' ' || key === 'PageDown' || key === 'ArrowDown') next();
    else if (key === 'ArrowLeft' || key === 'PageUp' || key === 'ArrowUp' || key === 'Backspace') prev();
    else if (key === 'Home') go(0, 0);
    else if (key === 'End') go(sections.length - 1, 'last');
    else if (/^[1-9]$/.test(key)) go(Number(key) - 1, 0);
    else if (key === 'n') {
      notes.hidden = !notes.hidden;
      document.body.classList.toggle('notes-on', !notes.hidden);
      scrollToFocus(sections[cur.s]);
    }
    else if (key === 't') toggleTheme();
    else if (key === 'l') toggleLang();
    else if (key === 'f') toggleFullscreen();
    else return;
    e.preventDefault();
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('a, button')) return;
    if (String(window.getSelection?.() ?? '') !== '') return;
    if (e.clientX >= window.innerWidth / 2) next();
    else prev();
  });

  window.addEventListener('hashchange', () => {
    const h = readHash();
    if (h && (h.s !== cur.s || h.f !== cur.f)) go(h.s, h.f);
  });
  window.addEventListener('resize', () => scrollToFocus(sections[cur.s]));

  const start = readHash() ?? { s: 0, f: 0 };
  go(start.s, start.f);
})();
