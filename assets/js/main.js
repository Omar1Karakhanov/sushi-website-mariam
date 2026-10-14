/* Sushi Cake by Mariam Dolaberidze — interactions */
(function () {
  'use strict';

  window.__sushiCake = true;

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var hasIO = 'IntersectionObserver' in window;

  var year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Header ---------- */

  var header = $('#header');
  var drawerOpen = false;

  function updateHeader() {
    header.classList.toggle('is-solid', window.scrollY > 24 || drawerOpen);
  }
  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();

  /* ---------- Mobile drawer ---------- */

  var drawer = $('#drawer');
  var menuBtn = $('.menu-btn');
  var main = $('main');
  var footer = $('footer');

  function setDrawer(open) {
    drawerOpen = open;
    drawer.classList.toggle('is-open', open);
    drawer.inert = !open;
    main.inert = open;
    footer.inert = open;
    menuBtn.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('is-locked', open);
    updateHeader();
    updateDock();
    if (open) {
      var first = $('a', drawer);
      if (first) first.focus({ preventScroll: true });
    }
  }

  menuBtn.addEventListener('click', function () { setDrawer(!drawerOpen); });
  drawer.addEventListener('click', function (e) {
    if (e.target.closest('a')) setDrawer(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawerOpen) {
      setDrawer(false);
      menuBtn.focus();
    }
  });
  window.matchMedia('(min-width: 1100px)').addEventListener('change', function (e) {
    if (e.matches && drawerOpen) setDrawer(false);
  });

  /* ---------- Hero video ---------- */

  var hero = $('.hero');
  var video = $('.hero__video');
  var SOURCES = {
    portrait: 'assets/video/hero-mobile.mp4',
    sd: 'assets/video/hero-desktop-720.mp4',
    hd: 'assets/video/hero-desktop-1080.mp4'
  };
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var userPaused = reducedMotion.matches || saveData;
  var heroVisible = true;

  function pickSource() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    if (w / h <= 0.8) return SOURCES.portrait;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    return w * dpr > 1500 ? SOURCES.hd : SOURCES.sd;
  }

  function loadVideo() {
    var src = pickSource();
    var current = video.getAttribute('src');
    if (current === src) return;
    // Never trade a loaded HD file for the SD one; only switch when the orientation class changes.
    if (current === SOURCES.hd && src === SOURCES.sd) return;
    video.classList.remove('is-playing');
    video.setAttribute('src', src);
    video.load();
  }

  function syncVideo() {
    if (userPaused || !heroVisible || document.hidden) {
      video.pause();
      return;
    }
    loadVideo();
    var attempt = video.play();
    if (attempt && typeof attempt.catch === 'function') {
      attempt.catch(function () {
        // Autoplay refused (e.g. iOS Low Power Mode): keep the poster, let the visitor start it.
        userPaused = true;
      });
    }
  }

  if (video) {
    video.addEventListener('playing', function () { video.classList.add('is-playing'); });
    document.addEventListener('visibilitychange', syncVideo);

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (!userPaused && video.getAttribute('src')) {
          var before = video.getAttribute('src');
          loadVideo();
          if (video.getAttribute('src') !== before) syncVideo();
        }
      }, 300);
    });

    syncVideo();
  }

  /* ---------- Mobile order dock ---------- */

  var dock = $('#dock');
  var contactVisible = false;
  var footerVisible = false;

  function updateDock() {
    if (!dock) return;
    var show = !heroVisible && !contactVisible && !footerVisible && !drawerOpen;
    dock.classList.toggle('is-visible', show);
    dock.inert = !show;
  }

  if (hasIO) {
    var contact = $('#contact');
    var watcher = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.target === hero) {
          heroVisible = entry.isIntersecting;
          if (video) syncVideo();
        } else if (entry.target === contact) {
          contactVisible = entry.isIntersecting;
        } else if (entry.target === footer) {
          footerVisible = entry.isIntersecting;
        }
      });
      updateDock();
    }, { threshold: 0 });
    [hero, contact, footer].forEach(function (el) { if (el) watcher.observe(el); });
  }

  /* ---------- Scroll reveal ---------- */

  // Cascade menu cards row by row.
  $$('#menu-grid .card').forEach(function (card, i) {
    card.style.setProperty('--i', String(i % 4));
  });

  var revealEls = $$('[data-reveal]');
  if (!hasIO || reducedMotion.matches) {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          revealer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealEls.forEach(function (el) { revealer.observe(el); });
  }

  /* ---------- Menu filters ---------- */

  var grid = $('#menu-grid');
  var cards = $$('.card', grid);
  var filters = $$('.filter');
  var empty = $('#menu-empty');
  var status = $('#menu-status');

  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var f = btn.getAttribute('data-filter');
      var shown = 0;
      filters.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
      grid.classList.toggle('is-filtered', f !== 'all');
      cards.forEach(function (card) {
        var match = f === 'all' || card.getAttribute('data-cat') === f;
        card.hidden = !match;
        card.classList.remove('is-entering');
        if (match) {
          card.classList.add('is-in');
          card.style.setProperty('--n', String(shown));
          void card.offsetWidth; // restart the entrance animation
          card.classList.add('is-entering');
          shown++;
        }
      });
      empty.hidden = shown > 0;
      status.textContent = 'ნაჩვენებია ' + shown + ' პოზიცია';
    });
  });

  /* ---------- Active section in the nav ---------- */

  var navLinks = $$('.nav a');
  if (hasIO && navLinks.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = '#' + entry.target.id;
        navLinks.forEach(function (a) {
          if (a.getAttribute('href') === id) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach(function (s) { spy.observe(s); });
    // The hero has no nav entry: clear the marker when it is back in view.
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) navLinks.forEach(function (a) { a.removeAttribute('aria-current'); });
    }, { rootMargin: '-45% 0px -50% 0px' }).observe(hero);
  }
})();
