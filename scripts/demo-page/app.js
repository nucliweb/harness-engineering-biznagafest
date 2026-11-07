/* global document, window, location, history */
// Navigation for the demo page: one focus at a time, steps in order, the URL hash tracks where you are.
(() => {
  const data = JSON.parse(document.getElementById('demo-data').textContent);
  const sections = Array.from(document.querySelectorAll('.step'));
  const notes = document.getElementById('notes');
  const timeline = document.getElementById('timeline');
  const items = Array.from(timeline.querySelectorAll('.tl-item'));
  const root = document.documentElement;
  const touchNav = document.getElementById('touch-nav');
  const touchPos = touchNav.querySelector('.tn-pos');
  const touchPrev = touchNav.querySelector('[data-nav="prev"]');
  const touchNext = touchNav.querySelector('[data-nav="next"]');
  const coarse = window.matchMedia('(hover: none) and (pointer: coarse)');

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

  /** Marks every step as done, current or to come; the current segment fills as its highlights go by. */
  function renderTimeline(lang) {
    timeline.setAttribute('aria-label', data.ui.timeline[lang]);
    for (const item of items) {
      const idx = Number(item.dataset.go);
      const state = idx < cur.s ? 'done' : idx === cur.s ? 'current' : 'todo';
      item.dataset.state = state;
      if (state === 'current') item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
      const fill = state === 'done' ? 100 : state === 'current' ? ((cur.f + 1) / focusCount(cur.s)) * 100 : 0;
      item.querySelector('i').style.width = `${fill}%`;
    }
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
    if (corner) {
      corner.textContent =
        step.kind === 'phase'
          ? `${data.ui.phase[lang]} ${step.no} / ${step.of} · ${step.phase[lang]}`
          : step.kind === 'extra'
            ? `${data.ui.extra[lang]} · ${step.phase[lang]}`
            : step.phase[lang];
    }
    scrollToFocus(section);
    renderTimeline(lang);
    notes.innerHTML = '';
    if (focus.note && focus.note[lang]) {
      const b = document.createElement('b');
      b.textContent = `${cur.s + 1}.${cur.f + 1} ${focus.label ? focus.label[lang] : ''}`;
      notes.append(b, document.createTextNode(focus.note[lang]));
    }
    document.title = step.title[lang];
    touchPos.textContent = `${cur.s + 1}/${sections.length} · ${cur.f + 1}/${focusCount(cur.s)}`;
    touchPrev.disabled = cur.s === 0 && cur.f === 0;
    touchNext.disabled = cur.s === sections.length - 1 && cur.f === focusCount(cur.s) - 1;
    writeHash();
  }

  function go(s, f = 0) {
    const from = cur.s;
    cur = { s: Math.min(Math.max(s, 0), sections.length - 1), f: 0 };
    cur.f = f === 'last' ? focusCount(cur.s) - 1 : Math.min(Math.max(f, 0), focusCount(cur.s) - 1);
    render();
    // On narrow screens the page scrolls; a new screen starts at its top, not where the last one was left.
    if (cur.s !== from) window.scrollTo(0, 0);
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

  timeline.addEventListener('click', (e) => {
    const item = e.target.closest('.tl-item');
    if (!item) return;
    item.blur();
    go(Number(item.dataset.go), 0);
  });

  touchNav.addEventListener('click', (e) => {
    const action = e.target.closest('[data-nav]')?.dataset.nav;
    if (action === 'prev') prev();
    else if (action === 'next') next();
    else if (action === 'lang') toggleLang();
  });

  // Swipe: a clearly horizontal gesture moves; anything mostly vertical is left to scrolling.
  let touchStart = null;
  document.addEventListener(
    'touchstart',
    (e) => {
      touchStart = e.touches.length === 1 && !e.target.closest('#touch-nav') ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
    },
    { passive: true },
  );
  document.addEventListener(
    'touchend',
    (e) => {
      if (!touchStart) return;
      const dx = e.changedTouches[0].clientX - touchStart.x;
      const dy = e.changedTouches[0].clientY - touchStart.y;
      touchStart = null;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (dx < 0) next();
      else prev();
    },
    { passive: true },
  );

  document.addEventListener('click', (e) => {
    // On touch screens a stray tap while reading must not jump; the bottom bar and swipes move instead.
    if (coarse.matches) return;
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
