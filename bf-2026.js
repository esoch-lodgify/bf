/*!
 * ==========================================================================
 * LODGIFY — Black Friday 2026 sticky top banner
 * ==========================================================================
 * One embeddable file. No CSS of any kind is injected: every class name in
 * the markup is left exactly as the design file had it, and Webflow styles
 * them. The script only injects markup, fills in copy, runs the countdown
 * and decides when the banner is on screen.
 *
 *   <script src="https://YOUR-CDN/bf-2026.js" defer></script>
 *
 * >> THE ONE THING TO CHECK FIRST <<
 *   The 22 .bfbanner_* / .sticky-banner_close-btn classes come straight from
 *   the site, so Webflow already has them. #bf-banner does NOT — it is an id
 *   the standalone file invented, and it carried the fixed-to-bottom
 *   positioning and the slide-up animation. Webflow needs those four rules or
 *   the banner renders inline in the page flow. See VISIBILITY CONTRACT below.
 *
 * VISIBILITY CONTRACT
 *   The script sets display on #bf-banner and toggles the .is-visible class,
 *   exactly as the design file did. Webflow (or a small custom-code block)
 *   has to supply:
 *
 *   Overlaying the top (slides down over the page):
 *     #bf-banner{position:fixed;left:0;right:0;top:0;z-index:99999;
 *                transform:translateY(-100%);opacity:0;
 *                transition:transform 350ms ease,opacity 350ms ease}
 *     #bf-banner.is-visible{transform:translateY(0);opacity:1}
 *
 *   Or in normal flow, pushing the page down — give it no position at all and
 *   the script handles the rest (see FIXED NAVBAR below).
 *
 *   The script injects the banner already hidden, so there is no flash before
 *   it decides — but with no rules at all it will simply sit in the flow.
 *
 * FIXED NAVBAR
 *   The banner is inserted as the FIRST child of <body>, so if it sits in
 *   normal flow the page content moves down by itself. What does not move is
 *   a fixed or sticky navbar pinned to the top — it would cover the banner.
 *   The script detects which case applies by reading the banner's own
 *   computed position, and only offsets the navbar when the banner is in
 *   flow. An overlaying banner needs no offset and gets none.
 *   CONFIG.offsetFixedHeader forces the decision either way.
 *
 * WHAT IS NOT HERE
 *   No exit-intent popup, no geo lookup, no injected stylesheet.
 *
 * QA HELPERS (query string)
 *   ?lang=es       force a locale
 *   ?reset=1       clear the dismissal and show it again
 *   ?bfshow=1      show it even if dismissed or past the end date
 *
 * COPY AND DATES
 *   All text lives in STRINGS, one block per locale; missing keys fall back
 *   to English. CONFIG.endDate drives the countdown and the auto-hide.
 * ==========================================================================
 */

(function () {
  'use strict';

  /* =====================================================================
     1 · CONFIG
     ===================================================================== */
  var CONFIG = {
    // Campaign end, as a wall-clock time in a named zone. Resolved through
    // Intl, so it is the same real-world instant for every visitor and it
    // survives a daylight-saving change.
    endDate:    '2026-11-30',          // YYYY-MM-DD
    expireTime: { h: 23, m: 59, s: 59 },
    expireTz:   'Europe/Madrid',

    discount: 60,                      // rendered into [data-percent] as -60%

    // Dismissal. localStorage rather than a cookie: nothing is sent to the
    // server on every request, and it keeps the banner out of the cookie
    // declaration. Worth a look from the OneTrust side either way.
    dismissHours: 24,
    storageKey: 'ldg_bf2026_banner_until',

    // Visibility. See the contract in the header: the script owns these two
    // hooks and nothing else about how the banner looks.
    visibleClass: 'is-visible',
    hideDelay: 380,                    // ms, must outlast the CSS transition
    showDelay: 0,                      // ms before it slides up on load

    // A fixed or sticky navbar pinned to the top would sit over an in-flow
    // banner. 'auto' reads the banner's computed position and only offsets
    // when it is actually in the flow. true / false force it.
    offsetFixedHeader: 'auto',
    fixedHeaderSelector: '',           // set if auto-detection misses the nav

    defaultLocale: 'en'
  };

  /* =====================================================================
     2 · STRINGS  (one block per locale; missing keys fall back to English)
     Non-English entries came through as drafts for the translators.
     ===================================================================== */
  var STRINGS = {
    en: {
      badge: 'BLACK FRIDAY',
      title: 'Main title',
      title2: 'Title line 2 if needed',
      cta: 'Claim Offer',
      terms: 'Terms & Conditions',
      countdown: 'Time left to claim the offer',
      close: 'Close banner',
      cta_url: '/pricing',
      terms_url: '/black-friday-terms'
    },
    es: { badge: 'BLACK FRIDAY', cta: 'Aprovechar oferta', terms: 'Términos y condiciones',
          countdown: 'Tiempo restante para aprovechar la oferta', close: 'Cerrar banner',
          cta_url: '/es/precios', terms_url: '/es/black-friday-terms' },
    fr: { badge: 'BLACK FRIDAY', cta: "Profiter de l'offre", terms: 'Conditions générales',
          countdown: "Temps restant pour profiter de l'offre", close: 'Fermer la bannière',
          cta_url: '/fr/tarifs', terms_url: '/fr/black-friday-terms' },
    de: { badge: 'BLACK FRIDAY', cta: 'Angebot sichern', terms: 'Allgemeine Geschäftsbedingungen',
          countdown: 'Verbleibende Zeit für das Angebot', close: 'Banner schließen',
          cta_url: '/de/preise', terms_url: '/de/black-friday-terms' },
    it: { badge: 'BLACK FRIDAY', cta: "Approfitta dell'offerta", terms: 'Termini e condizioni',
          countdown: "Tempo rimanente per l'offerta", close: 'Chiudi banner',
          cta_url: '/it/prezzi', terms_url: '/it/black-friday-terms' },
    pt: { badge: 'BLACK FRIDAY', cta: 'Aproveitar oferta', terms: 'Termos e condições',
          countdown: 'Tempo restante para aproveitar a oferta', close: 'Fechar banner',
          cta_url: '/pt/precos', terms_url: '/pt/black-friday-terms' }
  };

  /* =====================================================================
     3 · MARKUP  (verbatim from the design file — every class name is a
     Webflow styling hook and must not be renamed)
     ===================================================================== */
  var MARKUP = `<div id="bf-banner" role="region" aria-label="Black Friday offer">
  <div class="bfbanner_wrap">
    <div class="bfbanner_container">
      <div class="bfbanner_left-side">
        <div class="bfbanner_promo-wrap">
          <div class="bfbanner_discount-wrap">
            <div class="bfbanner_discount-value">-<span class="bfbanner_percentage" data-percent>60</span>%</div>
          </div>
          <div class="bfbanner_discount-text" data-i18n="badge">BLACK FRIDAY</div>
        </div>
        <div class="bfbanner_text-wrap">
          <div class="bfbanner_main-title" data-i18n="title">Main title</div>
          <div class="bfbanner_title2" data-i18n="title2">Title line 2 if needed</div>
        </div>
      </div>

      <div class="bfbanner_right-side">
        <div class="bfbanner_countdown-wrap" role="timer" data-i18n-aria="countdown" aria-label="Time left">
          <div class="bfbanner_countown-digit" data-countdown="days">00</div>
          <div class="bfbanner_countdown-divider">:</div>
          <div class="bfbanner_countown-digit" data-countdown="hours">00</div>
          <div class="bfbanner_countdown-divider">:</div>
          <div class="bfbanner_countown-digit" data-countdown="minutes">00</div>
          <div class="bfbanner_countdown-divider">:</div>
          <div class="bfbanner_countown-digit" data-countdown="seconds">00</div>
        </div>
        <div class="bfbanner_button-wrap">
          <a class="bfbanner_cta-buton" data-href="cta_url" href="#">
            <span class="bfbanner_cta-text" data-i18n="cta">Claim Offer</span>
          </a>
          <a class="bfbanner_terms-link" data-href="terms_url" href="#" data-i18n="terms">Terms &amp; Conditions</a>
        </div>
      </div>
    </div>

    <button type="button" id="bottom-banner-close" class="sticky-banner_close-btn" data-i18n-aria="close" aria-label="Close">
      <span class="bfbanner_close-btn-bg"></span>
      <span class="bfbanner_close-line-x"></span>
      <span class="bfbanner_close-line"></span>
    </button>
  </div>
</div>`;

  /* =====================================================================
     4 · Helpers
     ===================================================================== */
  var qs = new URLSearchParams(window.location.search);

  function ls(key, val) {
    try {
      if (val === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, val);
    } catch (e) {}
    return null;
  }
  function lsDel(key) { try { window.localStorage.removeItem(key); } catch (e) {} }

  var memDismissed = false;
  function dismissed() {
    if (memDismissed) return true;
    var until = ls(CONFIG.storageKey);
    return !!until && Number(until) > Date.now();
  }
  function markDismissed() {
    memDismissed = true;
    ls(CONFIG.storageKey, String(Date.now() + CONFIG.dismissHours * 36e5));
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else { fn(); }
  }

  /* =====================================================================
     5 · Locale
     Path segment first, then ?lang=, then <html lang>, then English.
     ===================================================================== */
  function pickLocale() {
    var supported = Object.keys(STRINGS);
    var seg = (window.location.pathname.split('/')[1] || '').toLowerCase();
    if (supported.indexOf(seg) > -1) return seg;

    var forced = (qs.get('lang') || '').toLowerCase().split('-')[0];
    if (forced && supported.indexOf(forced) > -1) return forced;

    var htmlLang = (document.documentElement.getAttribute('lang') || '').toLowerCase().split('-')[0];
    if (supported.indexOf(htmlLang) > -1) return htmlLang;

    return CONFIG.defaultLocale;
  }
  var LOCALE = pickLocale();
  function t(key) {
    var l = STRINGS[LOCALE] || {};
    return (l[key] != null) ? l[key] : STRINGS[CONFIG.defaultLocale][key];
  }

  /* =====================================================================
     6 · Deadline, resolved in a named zone
     A wall-clock time in Europe/Madrid is turned into a real instant via
     Intl, so every visitor counts down to the same moment and a DST change
     between now and then does not shift it.
     ===================================================================== */
  function tzOffsetMs(tz, date) {
    var f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit',
      day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    var m = {};
    f.formatToParts(date).forEach(function (p) { m[p.type] = p.value; });
    return Date.UTC(m.year, m.month - 1, m.day, m.hour, m.minute, m.second) - date.getTime();
  }
  function wallToUtc(y, mo, d, h, mi, s, tz) {
    var guess = Date.UTC(y, mo - 1, d, h, mi, s);
    var off = tzOffsetMs(tz, new Date(guess));
    var res = guess - off;
    var off2 = tzOffsetMs(tz, new Date(res));   // second pass across a DST edge
    if (off2 !== off) res = guess - off2;
    return res;
  }
  function targetTime() {
    var p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(CONFIG.endDate);
    if (!p) return Infinity;
    try {
      return wallToUtc(+p[1], +p[2], +p[3],
                       CONFIG.expireTime.h, CONFIG.expireTime.m, CONFIG.expireTime.s,
                       CONFIG.expireTz);
    } catch (e) {
      return Date.parse(CONFIG.endDate + 'T23:59:59Z');   // Intl unavailable
    }
  }
  var TARGET = targetTime();
  function expired() { return Date.now() >= TARGET; }

  var FORCED = qs.get('bfshow') === '1';

  /* =====================================================================
     7 · Pushing a fixed navbar out of the way

     Only relevant when the banner sits in normal flow. Anything pinned to the
     top of the viewport gets its `top` offset by the banner's height,
     shrinking back to 0 as the banner scrolls away so no gap is left behind.
     ===================================================================== */
  function findPinned(banner) {
    var nodes = [];
    try {
      if (CONFIG.fixedHeaderSelector) {
        nodes = document.querySelectorAll(CONFIG.fixedHeaderSelector);
      } else if (document.elementsFromPoint) {
        nodes = document.elementsFromPoint(Math.round(window.innerWidth / 2), 1) || [];
      }
    } catch (e) { return []; }
    var out = [];
    [].forEach.call(nodes, function (el) {
      if (!el || el === document.body || el === document.documentElement) return;
      if (banner && (el === banner || banner.contains(el))) return;
      var cs;
      try { cs = window.getComputedStyle(el); } catch (e) { return; }
      if (!cs || (cs.position !== 'fixed' && cs.position !== 'sticky')) return;
      if (Math.abs(parseFloat(cs.top) || 0) > 1) return;
      if (out.indexOf(el) === -1) out.push(el);
    });
    return out;
  }

  function bannerIsInFlow(banner) {
    if (CONFIG.offsetFixedHeader === true) return true;
    if (CONFIG.offsetFixedHeader === false) return false;
    var cs;
    try { cs = window.getComputedStyle(banner); } catch (e) { return false; }
    if (!cs) return false;
    return cs.position === 'static' || cs.position === 'relative';
  }

  function pushPinned(banner, pinned) {
    if (!pinned.length) return null;
    var prev = pinned.map(function (el) { return el.style.top; });
    var height = 0, frame = null;
    var raf = window.requestAnimationFrame
      ? function (fn) { return window.requestAnimationFrame(fn); }
      : function (fn) { return setTimeout(fn, 16); };
    var unraf = window.cancelAnimationFrame
      ? function (id) { window.cancelAnimationFrame(id); }
      : function (id) { clearTimeout(id); };

    function apply() {
      frame = null;
      var offset = Math.max(0, height - (window.scrollY || 0));
      pinned.forEach(function (el) { el.style.top = offset + 'px'; });
    }
    function schedule() { if (frame === null) frame = raf(apply); }
    function measure() {
      height = (banner.style.display === 'none') ? 0 : banner.getBoundingClientRect().height;
      schedule();
    }

    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', measure);
    var ro = ('ResizeObserver' in window) ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(banner);

    return function restore() {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', measure);
      if (ro) ro.disconnect();
      if (frame !== null) unraf(frame);
      pinned.forEach(function (el, i) { el.style.top = prev[i]; });
    };
  }

  /* =====================================================================
     8 · Render
     ===================================================================== */
  function mount() {
    var host = document.createElement('div');
    host.innerHTML = MARKUP;
    var banner = host.firstElementChild;
    if (!banner) return;

    // injected already hidden, so it never flashes before the checks below;
    // first child of <body> so an in-flow banner pushes the page down
    banner.style.display = 'none';
    document.body.insertBefore(banner, document.body.firstChild);

    /* ---- copy, links, discount ---- */
    document.documentElement.setAttribute('data-bf-locale', LOCALE);
    banner.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    banner.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });
    banner.querySelectorAll('[data-href]').forEach(function (el) {
      el.setAttribute('href', t(el.getAttribute('data-href')));
    });
    banner.querySelectorAll('[data-percent]').forEach(function (el) {
      el.textContent = CONFIG.discount;
    });
    banner.setAttribute('aria-label', t('badge'));

    /* ---- countdown ---- */
    var timer = null;
    function setUnit(u, v) {
      banner.querySelectorAll('[data-countdown="' + u + '"]').forEach(function (el) {
        var s = pad(v);
        if (el.textContent !== s) el.textContent = s;
      });
    }
    function tick() {
      var diff = TARGET - Date.now();
      if (diff <= 0) {
        setUnit('days', 0); setUnit('hours', 0); setUnit('minutes', 0); setUnit('seconds', 0);
        hideNow();
        return;
      }
      setUnit('days',    Math.floor(diff / 864e5));
      setUnit('hours',   Math.floor((diff / 36e5) % 24));
      setUnit('minutes', Math.floor((diff / 6e4) % 60));
      setUnit('seconds', Math.floor((diff / 1e3) % 60));
    }

    /* ---- show / hide ---- */
    var unpush = null;
    function show() {
      banner.style.display = 'block';
      void banner.offsetHeight;                 // reflow, so the slide animates
      banner.classList.add(CONFIG.visibleClass);
      if (!unpush && bannerIsInFlow(banner)) unpush = pushPinned(banner, findPinned(banner));
    }
    function releasePush() { if (unpush) { unpush(); unpush = null; } }
    function hideAnimated() {
      banner.classList.remove(CONFIG.visibleClass);
      setTimeout(function () { banner.style.display = 'none'; releasePush(); }, CONFIG.hideDelay);
      if (timer) { clearInterval(timer); timer = null; }
    }
    function hideNow() {
      if (timer) { clearInterval(timer); timer = null; }
      banner.classList.remove(CONFIG.visibleClass);
      banner.style.display = 'none';
      releasePush();
    }

    var close = banner.querySelector('#bottom-banner-close');
    if (close) {
      close.addEventListener('click', function (e) {
        e.preventDefault();
        hideAnimated();
        markDismissed();
      });
    }

    tick();
    timer = setInterval(tick, 1000);
    if (CONFIG.showDelay > 0) setTimeout(show, CONFIG.showDelay);
    else show();
  }

  /* =====================================================================
     9 · Boot
     ===================================================================== */
  if (qs.get('reset') === '1') { memDismissed = false; lsDel(CONFIG.storageKey); }

  if (document.getElementById('bf-banner')) return;      // already on the page
  if (!FORCED && expired()) return;
  if (!FORCED && dismissed()) return;

  ready(mount);
})();