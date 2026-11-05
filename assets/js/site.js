(function () {
  'use strict';
  var WA_NUMBER = '213674255603';
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- hero load sequence ---------- */
  if (!reduce && document.querySelector('.hero')) {
    root.classList.add('anim');
    var go = function () { requestAnimationFrame(function () { root.classList.add('loaded'); }); };
    if (document.fonts && document.fonts.ready) {
      var done = false;
      var once = function () { if (!done) { done = true; go(); } };
      document.fonts.ready.then(once);
      setTimeout(once, 900);
    } else { go(); }
  }

  /* ---------- hero: cursor light, book tilt and parallax ----------
     Every frame only writes transforms on layers that the GPU already holds, so nothing is
     repainted. Easing is time-based, so it moves at the same speed on 60, 90, 120 or 144 Hz. */
  var hero = document.querySelector('.hero');
  var finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (hero && !reduce) {
    var tx = 0, ty = 0, mx = 0, my = 0, scy = 0, raf = 0, last = 0, heroOn = true;
    var cx = 0, cy = 0, curDirty = false, hr = null;
    var heroBook = document.getElementById('book');
    var atmos = hero.querySelector('.atmos');
    var glow = hero.querySelector('.a-glow');
    var cursor = hero.querySelector('.h-cursor');
    var coverFace = document.querySelector('.face.cover-art');
    var cssScroll = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()'));
    var apply = function () {
      if (atmos && !cssScroll) atmos.style.translate = '0 ' + (scy * 0.22).toFixed(1) + 'px';
      if (finePointer) {
        if (atmos) atmos.style.transform = 'translate3d(' + (mx * -14).toFixed(2) + 'px,' + (my * -10).toFixed(2) + 'px,0)';
        if (glow) glow.style.transform = 'translate3d(' + (mx * 1.5).toFixed(3) + '%,' + (my * 1.5).toFixed(3) + '%,0)';
        if (coverFace) coverFace.style.setProperty('--gx', mx.toFixed(4));
        if (heroBook) {
          // tilt the book a few degrees toward the pointer
          var ang = Math.sqrt(mx * mx + my * my) * 4;
          heroBook.style.rotate = ang < 0.02 ? 'none' : (-my).toFixed(4) + ' ' + mx.toFixed(4) + ' 0 ' + ang.toFixed(3) + 'deg';
        }
      }
    };
    var frame = function (now) {
      raf = 0;
      var dt = last ? Math.min(64, now - last) : 16.667; last = now;
      var k = 1 - Math.pow(0.92, dt / 16.667);
      mx += (tx - mx) * k; my += (ty - my) * k;
      if (curDirty && cursor) { cursor.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)'; curDirty = false; }
      apply();
      if (Math.abs(tx - mx) > 0.0005 || Math.abs(ty - my) > 0.0005) raf = requestAnimationFrame(frame);
      else { mx = tx; my = ty; apply(); last = 0; }
    };
    var kick = function () { if (!raf) raf = requestAnimationFrame(frame); };
    var measure = function () { var r = hero.getBoundingClientRect(); hr = { left: r.left, top: r.top + window.scrollY, w: r.width, h: r.height }; };
    if (finePointer) {
      hero.addEventListener('pointerenter', measure);
      window.addEventListener('resize', function () { hr = null; });
      hero.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        if (!hr) measure();
        var x = e.clientX - hr.left, y = e.clientY + window.scrollY - hr.top;
        tx = Math.max(-1, Math.min(1, (x / hr.w) * 2 - 1));
        ty = Math.max(-1, Math.min(1, (y / hr.h) * 2 - 1));
        cx = Math.round(x); cy = Math.round(y); curDirty = true;
        if (!hero.classList.contains('has-pointer')) hero.classList.add('has-pointer');
        kick();
      }, { passive: true });
      hero.addEventListener('pointerleave', function () { tx = 0; ty = 0; hero.classList.remove('has-pointer'); kick(); });
    }
    if (!cssScroll) {
      window.addEventListener('scroll', function () {
        if (!heroOn) return;
        scy = Math.min(window.scrollY, window.innerHeight * 1.2);
        kick();
      }, { passive: true });
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { heroOn = es[0].isIntersecting; }).observe(hero);
    }
  }

  /* ---------- touch screens: the hint talks about taps and swipes ---------- */
  var hint = document.querySelector('.hero-hint');
  if (hint && window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches) {
    hint.textContent = 'Tap the book to open the portfolio. Swipe or tap a page to turn it.';
  }

  /* ---------- sections: reveal on scroll ---------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  if (!reduce && 'IntersectionObserver' in window && revealEls.length) {
    root.classList.add('reveal');
    // stagger siblings that arrive together (cards, steps, standards)
    revealEls.forEach(function (el) {
      var sibs = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.hasAttribute('data-reveal'); });
      var i = sibs.indexOf(el);
      if (i > 0) el.style.setProperty('--rd', Math.min(i * 0.09, 0.45).toFixed(2) + 's');
    });
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { rio.observe(el); });
  }

  /* ---------- service cards: light follows the pointer ---------- */
  if (finePointer) {
    Array.prototype.forEach.call(document.querySelectorAll('.svc'), function (card) {
      var r = null, px = 0, py = 0, pending = 0;
      var write = function () { pending = 0; card.style.setProperty('--cx', px + 'px'); card.style.setProperty('--cy', py + 'px'); };
      card.addEventListener('pointerenter', function () { var b = card.getBoundingClientRect(); r = { left: b.left + window.scrollX, top: b.top + window.scrollY }; });
      card.addEventListener('pointermove', function (e) {
        if (!r) return;
        px = Math.round(e.clientX + window.scrollX - r.left); py = Math.round(e.clientY + window.scrollY - r.top);
        if (!pending) pending = requestAnimationFrame(write);
      }, { passive: true });
    });
  }

  /* ---------- nav: scrolled state ---------- */
  var nav = document.querySelector('.nav');
  var onScrollNav = function () { if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 8); };
  onScrollNav();
  window.addEventListener('scroll', onScrollNav, { passive: true });

  /* ---------- nav: active section ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-links a[href^="#"]'));
  if ('IntersectionObserver' in window && navLinks.length) {
    var map = {};
    navLinks.forEach(function (a) {
      var id = a.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      if (el) map[id] = a;
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var a = map[e.target.id];
        if (!a) return;
        if (e.isIntersecting) {
          navLinks.forEach(function (l) { l.removeAttribute('aria-current'); });
          a.setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { io.observe(document.getElementById(id)); });
  }

  /* ---------- mobile menu ---------- */
  var menuBtn = document.querySelector('.menu-btn');
  var menu = document.getElementById('mobile-menu');
  if (menuBtn && menu) {
    var setOpen = function (open, returnFocus) {
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.querySelector('.menu-label').textContent = open ? 'Close' : 'Menu';
      menu.classList.toggle('open', open);
      // never leave focus inside a menu that is about to become inert
      if (!open && !returnFocus && menu.contains(document.activeElement)) document.activeElement.blur();
      menu.setAttribute('aria-hidden', String(!open));
      if ('inert' in menu) menu.inert = !open;
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) {
        var first = menu.querySelector('a');
        if (first) setTimeout(function () { first.focus(); }, 60);
      } else if (returnFocus) { menuBtn.focus(); }
    };
    setOpen(false);
    menuBtn.addEventListener('click', function () { setOpen(menuBtn.getAttribute('aria-expanded') !== 'true'); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') setOpen(false, true);
      if (e.key === 'Tab' && menuBtn.getAttribute('aria-expanded') === 'true') {
        var items = [menuBtn].concat(Array.prototype.slice.call(menu.querySelectorAll('a, button')));
        var i = items.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
        else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
      }
    });
    window.addEventListener('resize', function () { if (window.innerWidth > 860 && menuBtn.getAttribute('aria-expanded') === 'true') setOpen(false); });
  }

  /* ---------- the portfolio book ---------- */
  var bookEl = document.getElementById('book');
  if (bookEl) {
    var stage = document.getElementById('book-stage');
    var leaves = Array.prototype.slice.call(bookEl.querySelectorAll('.leaf'));
    var n = leaves.length;                       // leaves; pages are 0 .. 2n-1
    var prevBtn = document.getElementById('book-prev');
    var nextBtn = document.getElementById('book-next');
    var statusEl = document.getElementById('book-status');
    var phoneMQ = window.matchMedia('(max-width: 720px)');
    var phone = phoneMQ.matches;
    var f = 0;      // leaves turned (two-page view)
    var p = 0;      // current page (one-page view)
    var faces = leaves.map(function (l) { return { front: l.querySelector('.face.front'), back: l.querySelector('.face.back') }; });
    var shades = leaves.map(function (l) {
      return Array.prototype.map.call(l.querySelectorAll('.face'), function (fc) {
        var sh = document.createElement('span'); sh.className = 'shade'; sh.setAttribute('aria-hidden', 'true'); fc.appendChild(sh); return sh;
      });
    });

    var visibleFaces = function () {
      if (phone) return [p % 2 === 0 ? faces[p / 2].front : faces[(p - 1) / 2].back];
      if (f === 0) return [faces[0].front];
      if (f === n) return [faces[n - 1].back];
      return [faces[f - 1].back, faces[f].front];
    };
    var label = function () {
      if (phone) {
        if (p === 0) return 'Cover';
        if (p === 2 * n - 1) return 'Back cover';
        return 'Page ' + p + ' of ' + (2 * n - 2);
      }
      if (f === 0) return 'Cover';
      if (f === n) return 'Back cover';
      return 'Pages ' + (2 * f - 1) + '\u2013' + (2 * f);
    };
    var render = function (turning) {
      if (phone) f = Math.ceil(p / 2);
      leaves.forEach(function (leaf, k) {
        var flipped = k < f;
        leaf.classList.toggle('flipped', flipped);
        leaf.classList.toggle('next', k === f);
        // a hair of depth keeps the stacks in order without z-fighting
        leaf.style.transform = flipped
          ? 'rotateY(-180deg) translateZ(' + (-(k + 1) * 0.6) + 'px)'
          : 'rotateY(var(--lift, 0deg)) translateZ(' + ((n - k) * 0.6) + 'px)';
        leaf.style.zIndex = turning === k ? 100 : (flipped ? k + 1 : n - k + 1);
      });
      var shift;
      if (phone) shift = p % 2 === 0 ? -0.5 : 0.5;
      else shift = f === 0 ? -0.5 : (f === n ? 0.5 : 0);
      bookEl.style.setProperty('--shift', 'calc(var(--pw) * ' + shift + ')');
      bookEl.classList.toggle('is-open', f > 0);
      stage.classList.toggle('is-open', phone ? false : f > 0);
      bookEl.classList.toggle('is-end', f === n);
      var vis = visibleFaces();
      var act = document.activeElement;
      if (act && act !== stage && stage.contains(act) && vis.every(function (fc) { return !fc.contains(act); })) stage.focus({ preventScroll: true });
      faces.forEach(function (fc) {
        [fc.front, fc.back].forEach(function (face) {
          var on = vis.indexOf(face) !== -1;
          face.setAttribute('aria-hidden', String(!on));
          if ('inert' in face) face.inert = !on;
        });
      });
      var atStart = phone ? p === 0 : f === 0;
      var atEnd = phone ? p === 2 * n - 1 : f === n;
      prevBtn.disabled = atStart;
      nextBtn.disabled = atEnd;
      statusEl.textContent = label();
    };
    var markTurning = function (k) {
      if (k < 0 || k >= n || reduce) return;
      var leaf = leaves[k];
      leaf.classList.remove('turning'); void leaf.offsetWidth; leaf.classList.add('turning');
      setTimeout(function () { leaf.classList.remove('turning'); render(); }, 1100);
    };
    var turn = function (dir) {
      if (phone) {
        var np = Math.max(0, Math.min(2 * n - 1, p + dir));
        if (np === p) return;
        var turningLeaf = (dir > 0 && p % 2 === 0) ? p / 2 : ((dir < 0 && p % 2 === 1) ? (p - 1) / 2 : -1);
        p = np; render(turningLeaf); markTurning(turningLeaf);
      } else {
        var nf = Math.max(0, Math.min(n, f + dir));
        if (nf === f) return;
        var k = dir > 0 ? f : f - 1;
        f = nf; render(k); markTurning(k);
      }
    };
    var goToPage = function (page) {
      if (phone) { p = page; }
      else { f = Math.ceil(page / 2); }
      render();
    };

    prevBtn.addEventListener('click', function () { turn(-1); });
    nextBtn.addEventListener('click', function () { turn(1); });
    Array.prototype.forEach.call(bookEl.querySelectorAll('.toc button'), function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); goToPage(parseInt(b.getAttribute('data-page'), 10)); stage.focus({ preventScroll: true }); });
    });

    // click a page to turn it: right-hand pages go forward, left-hand pages go back
    var swiped = false;
    leaves.forEach(function (leaf, k) {
      leaf.addEventListener('click', function (e) {
        if (swiped) return;
        if (e.target.closest('a, button')) return;
        if (phone) {
          var sr = stage.getBoundingClientRect();
          turn(e.clientX - sr.left < sr.width * 0.3 ? -1 : 1);
          return;
        }
        turn(k < f ? -1 : 1);
      });
    });

    stage.addEventListener('keydown', function (e) {
      if (e.target.closest('input, textarea, select')) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); turn(1); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); turn(-1); }
      else if (e.key === 'Home') { e.preventDefault(); goToPage(0); }
      else if (e.key === 'End') { e.preventDefault(); goToPage(2 * n - 1); }
    });

    // drag a page to turn it (two-page view), the page follows the pointer and lands
    // or falls back when released; on phones a swipe turns the page
    var drag = null;
    var sx = null, sy = null;
    var leafAngle = function (k, deg) {
      leaves[k].style.transform = 'rotateY(' + deg.toFixed(2) + 'deg) translateZ(' + (n * 0.6 + 2) + 'px)';
    };
    stage.addEventListener('pointerdown', function (e) {
      swiped = false;
      // a touch swipe may start anywhere on the page, buttons and links included
      if (e.pointerType !== 'mouse' && e.isPrimary) { sx = e.clientX; sy = e.clientY; }
      if (e.button !== 0 || e.target.closest('a, button')) return;
      if (phone || reduce) return;
      var leafEl = e.target.closest('.leaf');
      if (!leafEl) return;
      var k = leaves.indexOf(leafEl);
      var dir = k < f ? -1 : 1;
      if ((dir > 0 && k !== f) || (dir < 0 && k !== f - 1)) return;
      drag = { k: k, dir: dir, x: e.clientX, y: e.clientY, id: e.pointerId, active: false, t: 0, lastX: e.clientX, lastT: e.timeStamp, v: 0, pw: leaves[0].offsetWidth || 300 };
    });
    stage.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.active) {
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) { if (Math.abs(dy) > 12) drag = null; return; }
        drag.active = true; sx = null;
        try { stage.setPointerCapture(e.pointerId); } catch (err) {}
        leaves[drag.k].classList.add('dragging');
        leaves[drag.k].style.zIndex = 100;
      }
      var t = drag.dir > 0 ? -dx / (drag.pw * 1.5) : dx / (drag.pw * 1.5);
      t = Math.max(0, Math.min(1, t));
      drag.t = t;
      var dt = Math.max(1, e.timeStamp - drag.lastT);
      drag.v = (e.clientX - drag.lastX) / dt; drag.lastX = e.clientX; drag.lastT = e.timeStamp;
      leafAngle(drag.k, drag.dir > 0 ? -180 * t : -180 * (1 - t));
      var shadeOp = (0.36 * Math.sin(Math.PI * t)).toFixed(3);
      shades[drag.k].forEach(function (sh) { sh.style.opacity = shadeOp; });
      e.preventDefault();
    });
    var endDrag = function (e) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      var d = drag; drag = null;
      if (!d.active) return;
      swiped = true; setTimeout(function () { swiped = false; }, 350);
      var leaf = leaves[d.k];
      leaf.classList.remove('dragging');
      shades[d.k].forEach(function (sh) { sh.style.opacity = ''; });
      var fling = d.dir > 0 ? d.v < -0.5 : d.v > 0.5;
      var back = d.dir > 0 ? d.v > 0.5 : d.v < -0.5;
      if (!back && (d.t > 0.4 || fling)) { f = Math.max(0, Math.min(n, f + d.dir)); }
      render(d.k);
      setTimeout(function () { render(); }, 1100);
    };
    stage.addEventListener('pointerup', function (e) {
      if (drag && drag.active) { endDrag(e); sx = null; return; }
      drag = null;
      if (sx === null) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      sx = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        swiped = true; turn(dx < 0 ? 1 : -1);
        setTimeout(function () { swiped = false; }, 350);
      }
    });
    // a swipe that ended on a contents button or a link must not also press it
    stage.addEventListener('click', function (e) {
      if (swiped && e.target.closest('a, button') && stage.contains(e.target) && !e.target.closest('.book-ui')) { e.preventDefault(); e.stopPropagation(); }
    }, true);
    // images in the book must not start the browser's own image drag
    stage.addEventListener('dragstart', function (e) { e.preventDefault(); });
    stage.addEventListener('pointercancel', function (e) { if (drag && drag.active) endDrag(e); else drag = null; sx = null; });

    // arrow keys turn the pages anywhere while the book is on screen,
    // unless someone is typing or the menu is open
    var bookOn = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { bookOn = es[0].isIntersecting; }, { threshold: 0.35 }).observe(stage);
    }
    document.addEventListener('keydown', function (e) {
      if (!bookOn || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var t = e.target;
      if (stage.contains(t) || (t && t.closest && t.closest('input, textarea, select, [contenteditable], .mobile-menu.open'))) return;
      if (document.querySelector('.mobile-menu.open')) return;
      e.preventDefault();
      turn(e.key === 'ArrowRight' ? 1 : -1);
    });

    var onMode = function () {
      var was = phone; phone = phoneMQ.matches;
      if (was === phone) return;
      if (phone) p = f === 0 ? 0 : (f === n ? 2 * n - 1 : 2 * f - 1);
      else f = Math.ceil(p / 2);
      render();
    };
    if (phoneMQ.addEventListener) phoneMQ.addEventListener('change', onMode); else if (phoneMQ.addListener) phoneMQ.addListener(onMode);
    render();
  }

  /* ---------- process line follows scroll ---------- */
  var steps = document.querySelector('.steps-wrap');
  var stepEls = Array.prototype.slice.call(document.querySelectorAll('.step'));
  if (steps && reduce) stepEls.forEach(function (st) { st.classList.add('lit'); });
  if (steps && !reduce) {
    var ticking = false;
    var update = function () {
      ticking = false;
      var r = steps.getBoundingClientRect();
      var vh = window.innerHeight;
      var p = (vh * 0.85 - r.top) / (r.height + vh * 0.35);
      p = Math.max(0, Math.min(1, p));
      steps.style.setProperty('--p', p.toFixed(3));
      stepEls.forEach(function (st, i) { st.classList.toggle('lit', p >= (i / stepEls.length) + 0.02); });
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* ---------- copy number ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      var ok = function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy number'; }, 1800); };
      var fallback = function () {
        var target = document.querySelector(btn.getAttribute('data-select'));
        if (target && window.getSelection) {
          var range = document.createRange(); range.selectNodeContents(target);
          var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
          btn.textContent = 'Selected, press Ctrl+C';
        }
      };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fallback);
        else fallback();
      } catch (err) { fallback(); }
    });
  });

  /* ---------- inquiry form: composes a WhatsApp message ---------- */
  var form = document.getElementById('inquiry');
  if (form) {
    var status = document.getElementById('inquiry-status');
    var fields = ['f-name', 'f-business', 'f-email', 'f-type', 'f-budget', 'f-desc'];
    var get = function (id) { return (document.getElementById(id).value || '').trim(); };
    var setErr = function (id, msg) {
      var el = document.getElementById(id);
      var err = document.getElementById(id + '-err');
      el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (err) { err.textContent = msg || ''; err.hidden = !msg; }
    };
    fields.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', function () { if (el.getAttribute('aria-invalid') === 'true') setErr(id, ''); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstBad = null;
      var check = function (id, ok, msg) { setErr(id, ok ? '' : msg); if (!ok && !firstBad) firstBad = id; };
      check('f-name', get('f-name').length > 1, 'Enter your name.');
      var email = get('f-email');
      check('f-email', email === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'Enter a valid email address, or leave it empty.');
      check('f-type', get('f-type') !== '', 'Choose the type of project.');
      check('f-desc', get('f-desc').length >= 10, 'Describe the project in a sentence or two.');
      if (firstBad) { document.getElementById(firstBad).focus(); status.hidden = true; return; }

      var lines = ['Hello Joe, I would like to discuss a website project.', ''];
      lines.push('Name: ' + get('f-name'));
      if (get('f-business')) lines.push('Business: ' + get('f-business'));
      if (email) lines.push('Email: ' + email);
      lines.push('Project type: ' + get('f-type'));
      if (get('f-budget')) lines.push('Estimated budget: ' + get('f-budget'));
      lines.push('', 'Project details:', get('f-desc'));
      var url = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(lines.join('\n'));

      var link = document.getElementById('inquiry-link');
      link.href = url;
      status.hidden = false;
      status.focus();
      try { window.open(url, '_blank', 'noopener'); } catch (err) { /* the link below still works */ }
      document.getElementById('inquiry-status-text').textContent =
        'WhatsApp should open in a new tab with your message filled in. If it did not, use the link below. Review the message there and press send; nothing is sent from this page.';
    });
  }

  /* ---------- service links: prefilled WhatsApp text ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('a[data-wa]'), function (a) {
    a.href = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(a.getAttribute('data-wa'));
    a.target = '_blank';
    a.rel = 'noopener';
  });

  /* ---------- footer ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-year]'), function (el) { el.textContent = String(new Date().getFullYear()); });
  Array.prototype.forEach.call(document.querySelectorAll('.to-top'), function (b) {
    b.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      var target = document.getElementById('top') || document.querySelector('.wordmark');
      if (target) setTimeout(function () { target.focus({ preventScroll: true }); }, reduce ? 0 : 500);
    });
  });
})();
