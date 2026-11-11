/* MaaJ Trading – interactions & animations (no dependencies) */
(function () {
  var root = document.documentElement;
  var FX = root.classList.contains('fx');            // false when reduced motion is on
  var FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* ---------- Split titles into words ---------- */
  $$('.split').forEach(function (el) {
    var i = 0;
    var label = el.textContent.replace(/\s+/g, ' ').trim();
    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      if (node.nodeType !== 3) return;
      var frag = document.createDocumentFragment();
      // In right-to-left pages, keep runs of Latin words (e.g. "Maaj Trading") in one block
      // so the browser does not reverse their order.
      var rtl = root.dir === 'rtl', latin = /^[A-Za-z0-9][\w.'’\-]*[?؟:!.,]?$/;
      var words = node.textContent.trim().split(/\s+/), groups = [];
      words.forEach(function (wd) {
        var last = groups[groups.length - 1];
        if (rtl && last && latin.test(wd) && latin.test(last.split(' ').pop())) groups[groups.length - 1] = last + ' ' + wd;
        else groups.push(wd);
      });
      groups.forEach(function (part, k) {
        if (k) frag.appendChild(document.createTextNode(' '));
        var w = document.createElement('span'); w.className = 'w'; w.setAttribute('aria-hidden', 'true');
        if (rtl && /[A-Za-z]/.test(part)) w.dir = 'ltr';
        var inner = document.createElement('span'); inner.className = 'wi';
        inner.style.setProperty('--i', i++); inner.textContent = part;
        w.appendChild(inner); frag.appendChild(w);
      });
      node.parentNode.replaceChild(frag, node);
    });
    var sr = document.createElement('span'); sr.className = 'sr'; sr.textContent = label; el.appendChild(sr);
  });

  /* ---------- Scroll-scrubbed quote: words ---------- */
  var scrubWords = [];
  $$('.scrub').forEach(function (el) {
    var text = el.textContent.trim();
    el.innerHTML = '<span class="sr">' + text + '</span>' + text.split(/\s+/).map(function (w) { return '<span class="sw" aria-hidden="true">' + w + '</span>'; }).join(' ');
    scrubWords.push({ el: el, words: $$('.sw', el) });
  });

  /* ---------- Intro (first visit of the session) ---------- */
  function startPage() { root.classList.add('ready'); }
  if (root.classList.contains('intro')) {
    try { sessionStorage.setItem('mj-intro', '1'); } catch (e) {}
    setTimeout(function () { root.classList.add('intro-out'); }, 1700);
    setTimeout(function () { root.classList.remove('intro'); startPage(); }, 2500);
  } else {
    requestAnimationFrame(startPage);
  }

  /* ---------- Page transitions ---------- */
  if (FX) {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      if (a.target || a.hasAttribute('download')) return;
      var url = new URL(a.href, location.href);
      if (url.origin !== location.origin || /\.(pdf|mp4|jpg|png)$/i.test(url.pathname)) return;
      if (url.pathname === location.pathname && url.hash) return;
      e.preventDefault();
      root.classList.add('leaving');
      setTimeout(function () { location.href = url.href; }, 550);
    });
    window.addEventListener('pageshow', function (e) { if (e.persisted) root.classList.remove('leaving'); });
  }

  /* ---------- Menu ---------- */
  var burger = $('.burger'), menu = $('#menu');
  burger.addEventListener('click', function () {
    var o = menu.classList.toggle('open');
    burger.setAttribute('aria-expanded', o);
    var L = { en: ['Close menu', 'Open menu'], fr: ['Fermer le menu', 'Ouvrir le menu'], ar: ['إغلاق القائمة', 'فتح القائمة'] }[root.lang] || ['Close menu', 'Open menu'];
    burger.setAttribute('aria-label', o ? L[0] : L[1]);
    document.body.classList.toggle('menu-open', o);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('open')) burger.click(); });

  /* ---------- Reveal on scroll + counters + steps ---------- */
  function countUp(el) {
    var to = +el.dataset.to, from = el.dataset.from ? +el.dataset.from : 0, pre = el.dataset.prefix || '';
    if (!FX) { el.textContent = pre + to; return; }
    var t0 = null, dur = 1800;
    requestAnimationFrame(function tick(t) {
      if (!t0) t0 = t;
      var p = clamp((t - t0) / dur, 0, 1), e = 1 - Math.pow(1 - p, 4);
      el.textContent = pre + Math.round(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(tick);
    });
  }
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var el = en.target;
      el.classList.add('in');
      setTimeout(function () { el.classList.add('settled'); }, 1700);
      if (el.classList.contains('count')) countUp(el);
      io.unobserve(el);
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -40px 0px' }) : null;
  $$('.reveal, .split, .count, .step, .quote figcaption').forEach(function (el) {
    if (io) io.observe(el); else el.classList.add('in');
  });

  /* ---------- Touch screens: colour the vanilla photos when centred ---------- */
  if (!FINE && 'IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle('colour', en.isIntersecting); });
    }, { rootMargin: '-35% 0px -35% 0px' });
    $$('.v-item').forEach(function (el) { cio.observe(el); });
  }

  /* ---------- Marquees driven by scroll speed ---------- */
  var marquees = FX ? $$('.ticker').map(function (t) {
    t.classList.add('js-marquee');
    return { track: $('.ticker-track', t), x: 0, base: t.classList.contains('ticker-cities') ? 0.45 : 0.7, dir: 1 };
  }) : [];

  /* ---------- Header, progress, parallax, scrub, process (one rAF loop) ---------- */
  var header = $('.site-header'), progress = $('.progress');
  var lastY = scrollY, vel = 0;
  var parallax = FX ? $$('[data-parallax]') : [];
  var tracks = $$('.track');
  var heroMedia = $('.hero-media'), heroBox = $('.hero-box');

  function frame() {
    var y = scrollY, dy = y - lastY; lastY = y;
    vel = lerp(vel, dy, 0.1);
    var vh = innerHeight, max = document.documentElement.scrollHeight - vh;

    progress.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
    if (!document.body.classList.contains('menu-open')) {
      if (dy > 2 && y > 160) header.classList.add('tucked');
      else if (dy < -2 || y < 160) header.classList.remove('tucked');
    }

    marquees.forEach(function (m) {
      if (Math.abs(dy) > 1) m.dir = dy > 0 ? 1 : -1;
      var half = m.track.scrollWidth / 2;
      m.x -= (m.base + Math.min(Math.abs(vel) * 0.35, 14)) * m.dir;
      if (m.x <= -half) m.x += half;
      if (m.x > 0) m.x -= half;
      m.track.style.transform = 'translate3d(' + m.x.toFixed(1) + 'px,0,0)';
    });

    parallax.forEach(function (el) {
      var r = el.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      var c = (r.top + r.height / 2 - vh / 2) * +el.dataset.parallax;
      el.style.transform = 'translate3d(0,' + c.toFixed(1) + 'px,0) scale(1.18)';
    });

    if (FX && heroMedia && y < vh * 1.2) {
      heroMedia.style.transform = 'translate3d(0,' + (y * 0.35).toFixed(1) + 'px,0) scale(' + (1 + y / vh * 0.12).toFixed(3) + ')';
      if (heroBox) {
        heroBox.style.transform = 'translate3d(0,' + (y * -0.12).toFixed(1) + 'px,0)';
        heroBox.style.opacity = clamp(1 - y / (vh * 0.75), 0, 1);
      }
    }

    scrubWords.forEach(function (s) {
      var r = s.el.getBoundingClientRect();
      var p = FX ? clamp((vh * 0.85 - r.top) / (r.height + vh * 0.45), 0, 1) : 1;
      var lit = Math.round(p * s.words.length);
      s.words.forEach(function (w, i) { w.classList.toggle('lit', i < lit); });
    });

    tracks.forEach(function (t) {
      var r = t.getBoundingClientRect();
      var p = FX ? clamp((vh * 0.75 - r.top) / r.height, 0, 1) : 1;
      t.style.setProperty('--p', p.toFixed(3));
      var st = t.__steps || (t.__steps = $$('.step', t));
      st.forEach(function (s, i) { s.classList.toggle('lit', p >= i / st.length + 0.02 || p >= 0.999); });
    });

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  if (!FX || !FINE) return;   /* pointer effects: desktop only */

  /* ---------- Custom cursor ---------- */
  var cursor = $('.cursor'), dot = $('.cursor-dot'), ring = $('.cursor-ring');
  var mx = -100, my = -100, rx = mx, ry = my;
  root.classList.add('has-cursor');
  addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; cursor.classList.add('on'); }, { passive: true });
  document.addEventListener('mouseleave', function () { cursor.classList.remove('on'); });
  requestAnimationFrame(function loop() {
    rx = lerp(rx, mx, 0.18); ry = lerp(ry, my, 0.18);
    dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
    ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
    requestAnimationFrame(loop);
  });
  document.addEventListener('mouseover', function (e) {
    var view = e.target.closest('.v-img, .serve-list img, .specs img');
    var link = e.target.closest('a, button, video');
    cursor.classList.toggle('view', !!view);
    cursor.classList.toggle('link', !view && !!link);
  });
  document.addEventListener('mousedown', function () { cursor.classList.add('down'); });
  document.addEventListener('mouseup', function () { cursor.classList.remove('down'); });

  /* ---------- Magnetic buttons ---------- */
  $$('.btn-rect, .btn-pill, .wa-float, .li, .back').forEach(function (el) {
    el.addEventListener('mousemove', function (e) {
      var r = el.getBoundingClientRect();
      var x = (e.clientX - r.left - r.width / 2) * 0.25, y = (e.clientY - r.top - r.height / 2) * 0.35;
      el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
    });
    el.addEventListener('mouseleave', function () { el.style.transform = ''; });
  });

  /* ---------- 3D tilt cards ---------- */
  $$('.why-card, .specs li, .serve-list li').forEach(function (el) {
    el.classList.add('tilt');
    el.addEventListener('mousemove', function (e) {
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.style.setProperty('--rx', ((0.5 - py) * 10).toFixed(2) + 'deg');
      el.style.setProperty('--ry', ((px - 0.5) * 12).toFixed(2) + 'deg');
      el.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
      el.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
    });
    el.addEventListener('mouseleave', function () { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
  });
})();
