/* =====================================================================
   ABDULRAHMAN SALIM — behaviour
   No dependencies. Everything lazy. Nothing decorative that costs frames.
   ===================================================================== */
(() => {
'use strict';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const RTL = getComputedStyle(document.documentElement).direction === 'rtl';
const CALM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const HOVER = matchMedia('(hover: hover) and (pointer: fine)').matches;
const pad2 = n => String(n).padStart(2, '0');
const catName = id => (CATS.find(c => c.id === id) || {}).ar || '';

/* Some embedded/webview contexts never deliver IntersectionObserver callbacks.
   Nothing on this page may depend on them to become visible, so we watch for a
   first callback and, if none arrives, fall back to showing everything. */
let ioAlive = false, ioDead = false;
const ioPing = () => { ioAlive = true; };

/* ═══════════════ nav ═══════════════ */
const nav = $('#nav');
const onScroll = () => nav.classList.toggle('solid', scrollY > 40);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

$('#toTop').addEventListener('click', () =>
  scrollTo({ top: 0, behavior: CALM ? 'auto' : 'smooth' }));

/* sticky WhatsApp: appears once the hero is behind you, steps aside at the contact block */
{
  const fab = $('#waFab');
  const sync = () => {
    const past = scrollY > innerHeight * 0.75;
    const c = $('#contact').getBoundingClientRect();
    const atContact = c.top < innerHeight * 0.9;
    fab.classList.toggle('show', past && !atContact && viewerClosed());
  };
  addEventListener('scroll', sync, { passive: true });
  addEventListener('resize', sync, { passive: true });
  window.__syncFab = sync;
  setTimeout(sync, 300);
}
function viewerClosed() { const v = $('#viewer'); return !v || v.hidden; }

/* ═══════════════ hero reel timecode ═══════════════ */
{
  const reel = $('#reel'), vid = $('#reelVid'), tc = $('#reelTc');
  const show = () => reel.classList.add('ready');
  vid.addEventListener('playing', show, { once: true });
  vid.addEventListener('loadeddata', show, { once: true });

  let raf = 0;
  const tick = () => {
    const t = vid.currentTime;
    tc.textContent =
      `${pad2((t / 3600) | 0)}:${pad2(((t / 60) | 0) % 60)}:${pad2((t | 0) % 60)}:${pad2(((t % 1) * 25) | 0)}`;
    raf = requestAnimationFrame(tick);
  };
  const start = () => { vid.play().catch(() => {}); if (!raf) raf = requestAnimationFrame(tick); };
  start();
  // pause the reel (and its readout) once it scrolls away
  new IntersectionObserver(([e]) => {
    ioPing();
    if (e.isIntersecting) start();
    else { vid.pause(); cancelAnimationFrame(raf); raf = 0; }
  }, { threshold: 0.05 }).observe(reel);
}

/* ═══════════════ cards ═══════════════ */
const DIMS = { v: [640, 1138], h: [1120, 630] };

function cardHTML(p, n, small) {
  const [w, h] = DIMS[p.orient];
  // a few pieces carry a cut-out that steps out of the frame
  const pop = (p.pop && !small)
    ? `<img class="pop" src="assets/cutouts/${p.pop}" alt="" aria-hidden="true" loading="lazy" decoding="async">`
    : '';
  return `
  <a class="card${small ? ' sm' : ''}${pop ? ' has-pop' : ''} rv" href="#/${p.slug}"
     data-slug="${p.slug}" data-orient="${p.orient}">
    <div class="frame">
      <div class="media">
        <img src="assets/posters/${p.slug}.jpg" alt="${p.title} — ${p.client}"
             width="${w}" height="${h}" loading="lazy" decoding="async">
        <video muted loop playsinline preload="none" tabindex="-1" aria-hidden="true"
               data-src="assets/preview/${p.slug}.mp4"></video>
        ${small ? '' : `<span class="idx">${pad2(n)}</span>`}
        <span class="cue">مشاهدة</span>
      </div>
      ${pop}
    </div>
    <div class="body">
      <div class="kicker"><span>${catName(p.cat)}</span><span class="dot"></span><span>${p.client}</span></div>
      <h3>${p.title}</h3>
      <p class="line">${p.line}</p>
    </div>
  </a>`;
}

/* ═══════════════ featured ═══════════════ */
{
  const picks = WORK.filter(p => p.featured).sort((a, b) => a.featured - b.featured);

  /* Rows group by orientation so every card in a row is the same height:
     wide films two-up, vertical films as one even strip. */
  const wide = picks.filter(p => p.orient === 'h');
  const tall = picks.filter(p => p.orient === 'v');
  const rows = [];
  for (let i = 0; i < wide.length; i += 2) rows.push({ kind: 'pair', items: wide.slice(i, i + 2) });
  if (tall.length) rows.push({ kind: 'strip', items: tall });

  let n = 0;
  $('#featured').innerHTML = rows.map(row => {
    const cells = row.items.map(p =>
      cardHTML(p, ++n, false).replace('class="card', `class="${p.orient === 'h' ? 'big' : 'tall'} card`)
    );
    return `<div class="feat-row ${row.kind}">${cells.join('')}</div>`;
  }).join('');
}

/* ═══════════════ archive ═══════════════ */
/* phones open the archive with fewer cards — the button reveals the rest */
const pageStep = () => (matchMedia('(max-width:760px)').matches ? 4 : 9);
let activeCat = 'all', shown = pageStep();

/* In "الكل" the archive follows the CATS order — events first, since those
   are the pieces a visitor should meet before the talking-head work. */
const CAT_RANK = Object.fromEntries(CATS.filter(c => c.id !== 'all').map((c, i) => [c.id, i]));

function visible() {
  if (activeCat !== 'all') return WORK.filter(p => p.cat === activeCat);
  return WORK.map((p, i) => [p, i])
    .sort((a, b) => (CAT_RANK[a[0].cat] - CAT_RANK[b[0].cat]) || (a[1] - b[1]))
    .map(pair => pair[0]);
}

{
  const el = $('#allCount');
  if (el) el.textContent = `All work · ${WORK.length}`;
}

function renderFilters() {
  $('#filters').innerHTML = CATS.map(c => {
    const n = c.id === 'all' ? WORK.length : WORK.filter(p => p.cat === c.id).length;
    return `<button type="button" data-cat="${c.id}" aria-pressed="${c.id === activeCat}">
      ${c.ar}<i>${n}</i></button>`;
  }).join('');
}

function renderGrid() {
  const list = visible();
  const slice = list.slice(0, shown);
  $('#grid').innerHTML = slice.length
    ? slice.map((p, i) => cardHTML(p, i + 1, true)).join('')
    : '';
  $('#grid').classList.toggle('is-empty', !slice.length);

  const rest = list.length - slice.length;
  $('#more').innerHTML = rest > 0
    ? `<button type="button" id="moreBtn">عرض كل الأعمال <i>+${rest}</i></button>`
    : '';

  wireCards($('#grid'));
  revealAll($('#grid'));
}

$('#filters').addEventListener('click', e => {
  const b = e.target.closest('button[data-cat]');
  if (!b) return;
  activeCat = b.dataset.cat;
  shown = pageStep();
  $$('#filters button').forEach(x => x.setAttribute('aria-pressed', x === b));
  renderGrid();
});

$('#more').addEventListener('click', e => {
  if (!e.target.closest('#moreBtn')) return;
  shown = visible().length;
  renderGrid();
});

/* ═══════════════ preview playback ═══════════════ */
/* Sources attach only near the viewport; on touch only one plays at a time. */
const loadIO = new IntersectionObserver(entries => {
  ioPing();
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    const v = $('video', e.target);
    if (v && !v.src && v.dataset.src) v.src = v.dataset.src;
    loadIO.unobserve(e.target);
  }
}, { rootMargin: '250px' });

let touchPlaying = null;
const playIO = new IntersectionObserver(entries => {
  ioPing();
  for (const e of entries) {
    const card = e.target, v = $('video', card);
    if (!v) continue;
    if (e.isIntersecting && e.intersectionRatio > 0.62) {
      if (touchPlaying && touchPlaying !== card) stop(touchPlaying);
      touchPlaying = card;
      play(card, v);
    } else if (card === touchPlaying) {
      stop(card); touchPlaying = null;
    }
  }
}, { threshold: [0, 0.62, 0.9] });

function play(card, v) {
  if (!v.src && v.dataset.src) v.src = v.dataset.src;
  v.play().then(() => card.classList.add('playing')).catch(() => {});
}
function stop(card) {
  const v = $('video', card);
  if (!v) return;
  v.pause(); v.currentTime = 0; card.classList.remove('playing');
}

function wireCards(root = document) {
  $$('.card', root).forEach(card => {
    if (card.dataset.wired) return;
    card.dataset.wired = '1';
    loadIO.observe(card);

    if (HOVER) {
      const v = $('video', card);
      card.addEventListener('pointerenter', () => play(card, v));
      card.addEventListener('pointerleave', () => stop(card));
      card.addEventListener('focus', () => play(card, v));
      card.addEventListener('blur', () => stop(card));
    } else if (!CALM) {
      playIO.observe(card);
    }

    card.addEventListener('click', e => {
      e.preventDefault();
      openWork(card.dataset.slug, true);
    });
  });
}

/* ═══════════════ the grade ═══════════════ */
{
  const cmp = $('#cmp'), before = $('#cmpBefore'), after = $('#cmpAfter');
  const tabs = $('#gTabs'), note = $('#gNote');
  let active = 0;

  tabs.innerHTML = GRADES.map((g, i) => `
    <button type="button" role="tab" data-i="${i}" aria-selected="${i === 0}">
      <span class="n">${pad2(i + 1)}</span><span class="t">${g.label}</span>
    </button>`).join('');
  /* a single comparison needs no tab strip — the label moves into the note */
  if (GRADES.length < 2) tabs.hidden = true;

  function select(i) {
    active = i;
    const g = GRADES[i];
    before.src = `assets/color/${g.id}-before.jpg`;
    after.src  = `assets/color/${g.id}-after.jpg`;
    before.alt = `${g.label} — قبل الدرجة اللونية`;
    after.alt  = `${g.label} — بعد الدرجة اللونية`;
    note.textContent = g.note;
    $$('button', tabs).forEach((b, k) => b.setAttribute('aria-selected', k === i));
    setX(50);
  }

  function setX(pct) {
    pct = Math.min(100, Math.max(0, pct));
    cmp.style.setProperty('--x', pct + '%');
    cmp.setAttribute('aria-valuenow', Math.round(pct));
  }

  function fromEvent(ev) {
    const r = cmp.getBoundingClientRect();
    const x = ev.clientX;
    setX(RTL ? (r.right - x) / r.width * 100 : (x - r.left) / r.width * 100);
  }

  let dragging = false;
  // images are natively draggable — that hijacks the pointer stream, so kill it
  cmp.addEventListener('dragstart', e => e.preventDefault());
  $$('img', cmp).forEach(im => { im.draggable = false; });

  cmp.addEventListener('pointerdown', e => {
    dragging = true;
    try { cmp.setPointerCapture(e.pointerId); } catch (_) {}
    fromEvent(e);
    e.preventDefault();
  });
  cmp.addEventListener('pointermove', e => { if (dragging) { fromEvent(e); e.preventDefault(); } });
  const release = () => { dragging = false; };
  cmp.addEventListener('pointerup', release);
  cmp.addEventListener('pointercancel', release);
  cmp.addEventListener('lostpointercapture', release);
  addEventListener('pointerup', release);          // safety net if capture is lost
  addEventListener('pointermove', e => { if (dragging) fromEvent(e); });
  cmp.addEventListener('keydown', e => {
    const cur = parseFloat(cmp.style.getPropertyValue('--x')) || 50;
    const step = e.shiftKey ? 10 : 3;
    if (e.key === 'ArrowLeft')  { setX(RTL ? cur + step : cur - step); e.preventDefault(); }
    if (e.key === 'ArrowRight') { setX(RTL ? cur - step : cur + step); e.preventDefault(); }
    if (e.key === 'Home') { setX(0);   e.preventDefault(); }
    if (e.key === 'End')  { setX(100); e.preventDefault(); }
  });

  tabs.addEventListener('click', e => {
    const b = e.target.closest('button[data-i]');
    if (b) select(+b.dataset.i);
  });

  select(0);

  /* one gentle sweep the first time it comes into view, so the handle reads as draggable */
  if (!CALM) {
    let hinted = false;
    const hint = () => {
      if (hinted) return; hinted = true;
      const seq = [[62, 260], [34, 620], [50, 980]];
      seq.forEach(([v, t]) => setTimeout(() => { if (!dragging) { cmp.classList.add('easing'); setX(v); } }, t));
      setTimeout(() => cmp.classList.remove('easing'), 1600);
    };
    const hio = new IntersectionObserver(es => { ioPing(); if (es[0].isIntersecting) { hint(); hio.disconnect(); } },
      { threshold: 0.45 });
    hio.observe(cmp);
    setTimeout(hint, 4000); // fires anyway if observers are dead
  }
}

/* ═══════════════ process nodes ═══════════════ */
{
  const STEPS = [
    ['تخطيط',   'المطلوب من المحتوى، لمن، وعلى أي منصّة.'],
    ['تجهيز',   'الموقع، العدسات، والعدّة قبل يوم التصوير.'],
    ['إضاءة',   'بناء الضوء للمكان والموضوع، داخلي أو خارجي.'],
    ['تصوير',   'إدارة الجلسة حتى تخرج اللقطة صحيحة من الكاميرا.'],
    ['مونتاج',  'الإيقاع، الحذف، والجرافيك والسَبتايتل.'],
    ['تسليم',   'معالجة نهائية بمقاس المنصّة، جاهزة للنشر.'],
  ];
  $('#nodes').innerHTML = STEPS.map(([t, d], i) => `
    <article class="node">
      <span class="n">N${pad2(i + 1)}</span>
      <h4>${t}</h4>
      <p>${d}</p>
      ${i < STEPS.length - 1 ? '<span class="wire" aria-hidden="true"></span>' : ''}
    </article>`).join('');
}

/* ═══════════════ viewer ═══════════════ */
const viewer = $('#viewer'), vBody = $('#vBody'), vCount = $('#vCount');
let order = [], cursor = -1, lastFocus = null;

function metaRow(label, value, ltr) {
  return `<div><dt>${label}</dt><dd${ltr ? ' class="ltr"' : ''}>${value}</dd></div>`;
}

function viewerHTML(p) {
  const cols = p.orient === 'h';
  const caseBits = [];
  if (p.idea) caseBits.push(`<section><h3>الفكرة</h3><p>${p.idea}</p></section>`);
  if (p.exec) caseBits.push(`<section><h3>التنفيذ</h3><p>${p.exec}</p></section>`);

  const info = `
    <div class="v-info">
      <p class="eyebrow"><span class="mono">${catName(p.cat)} · ${p.year}</span></p>
      <h2>${p.title}</h2>
      <p class="line">${p.line}</p>
      <div class="${cols ? 'v-cols' : ''}">
        <div class="v-case">${caseBits.join('')}</div>
        <div style="display:flex;flex-direction:column;gap:20px">
          <dl class="v-meta">
            ${metaRow('العميل', p.client)}
            ${metaRow('النوع', p.tag)}
            ${metaRow('المدة', p.dur, true)}
            ${metaRow('السنة', p.year, true)}
          </dl>
          <div class="v-craft">${p.craft.map(c => `<span>${c}</span>`).join('')}</div>
        </div>
      </div>
    </div>`;

  return `
    <div class="v-stage cut">
      <video controls playsinline preload="metadata"
             poster="assets/posters/${p.slug}.jpg" src="assets/video/${p.slug}.mp4"></video>
    </div>
    ${info}`;
}

function paint(slug, cut) {
  const p = WORK.find(x => x.slug === slug);
  if (!p) return;
  const old = $('video', vBody); if (old) { old.pause(); old.removeAttribute('src'); old.load(); }
  order = visible().some(x => x.slug === slug) ? visible() : WORK;
  cursor = order.findIndex(x => x.slug === slug);

  viewer.dataset.orient = p.orient;
  vBody.innerHTML = viewerHTML(p);
  vCount.textContent = `${pad2(cursor + 1)} / ${pad2(order.length)}`;
  $('#vPrev').disabled = cursor <= 0;
  $('#vNext').disabled = cursor >= order.length - 1;
  vBody.scrollTop = 0;
  if (!cut) $('.v-stage', vBody).classList.remove('cut');
  viewer.setAttribute('aria-label', `${p.title} — ${p.client}`);
}

function openWork(slug, push) {
  if (!WORK.some(x => x.slug === slug)) return;
  if (push) history.pushState({ slug }, '', '#/' + slug);
  if (viewer.hidden) {
    lastFocus = document.activeElement;
    viewer.hidden = false;
    document.body.classList.add('locked');
    void viewer.offsetHeight;              // flush layout so the transition has a start value
    viewer.classList.add('open');          // never deferred to rAF — it can be throttled
    if (window.__syncFab) window.__syncFab();
  }
  paint(slug, true);
  $('#vClose').focus({ preventScroll: true });
}

function closeWork(pop) {
  if (viewer.hidden) return;
  const v = $('video', vBody); if (v) v.pause();
  viewer.classList.remove('open');
  document.body.classList.remove('locked');
  setTimeout(() => {
    if (!viewer.classList.contains('open')) { viewer.hidden = true; vBody.innerHTML = ''; }
  }, 200);
  if (!pop) history.pushState('', '', location.pathname + location.search);
  if (lastFocus) lastFocus.focus({ preventScroll: true });
  if (window.__syncFab) setTimeout(window.__syncFab, 220);
}

function step(dir) {
  const next = order[cursor + dir];
  if (!next) return;
  history.pushState({ slug: next.slug }, '', '#/' + next.slug);
  const stage = $('.v-stage', vBody);
  if (stage && !CALM) {
    stage.classList.remove('cut');
    void stage.offsetWidth;
  }
  paint(next.slug, true);
}

$('#vClose').addEventListener('click', () => closeWork(false));
$('#vPrev').addEventListener('click', () => step(-1));
$('#vNext').addEventListener('click', () => step(1));

addEventListener('keydown', e => {
  if (viewer.hidden) return;
  if (e.key === 'Escape') closeWork(false);
  if (e.key === 'ArrowLeft')  step(RTL ? -1 : 1);
  if (e.key === 'ArrowRight') step(RTL ? 1 : -1);
});

addEventListener('popstate', () => {
  const m = location.hash.match(/^#\/(.+)$/);
  if (m) openWork(decodeURIComponent(m[1]), false);
  else closeWork(true);
});

/* ═══════════════ reveal ═══════════════ */
const revealIO = CALM ? null : new IntersectionObserver(entries => {
  ioPing();
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.classList.add('in');
    revealIO.unobserve(e.target);
  }
}, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

function revealAll(root = document) {
  $$('.rv', root).forEach((el, i) => {
    if (el.dataset.rv) return;
    el.dataset.rv = '1';
    if (!revealIO || ioDead) { el.classList.add('in'); return; }
    el.style.transitionDelay = Math.min(i, 5) * 55 + 'ms';
    revealIO.observe(el);
  });
}

/* If no observer has reported in by now, assume they never will. */
setTimeout(() => {
  if (ioAlive) return;
  ioDead = true;
  $$('.rv').forEach(el => { el.style.transitionDelay = '0ms'; el.classList.add('in'); });
  $$('.card video').forEach(v => { if (!v.src && v.dataset.src) v.src = v.dataset.src; });
}, 1400);

/* ═══════════════ init — runs last so every observer exists ═══════════════ */
renderFilters();
renderGrid();   // wires + reveals its own cards
wireCards();    // featured cards
revealAll();

{ /* deep link */
  const m = location.hash.match(/^#\/(.+)$/);
  if (m) openWork(decodeURIComponent(m[1]), false);
}

})();
