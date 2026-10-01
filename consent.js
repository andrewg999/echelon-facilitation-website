/*
  Opt-in analytics consent, loaded synchronously in <head> on every page in
  place of the old gtag snippet. api/publish-blog.js writes the same tag into
  every auto-published post, so the two must stay in step.

  UK PECR needs opt-in for analytics cookies, and the ICO expects refusing to
  be as easy as accepting. So Google Analytics is not contacted at all until
  someone clicks Accept; Accept and Reject are equal in size and weight;
  nothing is pre-selected; and the choice can be changed from the footer.
  The only thing stored before a choice is the choice itself.

  The three GA4 key events (contact_page_view, strategy_sprint_view,
  workshops_page_view) are built in GA4 from page views, so nothing in the
  pages needs gating.

  Buttons use charcoal rather than brand teal: white on #00adb5 is about
  2.6:1, too faint to read comfortably.
*/
(function () {
  var GA_ID = 'G-MTKCD8SJJK';
  var KEY = 'echelon-consent-v1';
  var MAX_AGE = 365 * 24 * 60 * 60 * 1000; // re-ask after a year

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    wait_for_update: 500
  });

  var granted = false;

  function loadAnalytics() {
    if (granted) return;
    granted = true;
    gtag('consent', 'update', { analytics_storage: 'granted' });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', GA_ID);
  }

  // localStorage can throw in private modes; failing to read means "no
  // choice yet", which correctly shows the banner rather than assuming yes.
  function stored() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!v || !v.choice || Date.now() - (v.at || 0) > MAX_AGE) return null;
      return v.choice;
    } catch (e) { return null; }
  }
  function save(choice) {
    try { localStorage.setItem(KEY, JSON.stringify({ choice: choice, at: Date.now() })); } catch (e) {}
  }

  window.echelonConsent = {
    status: stored,
    isGranted: function () { return granted; },
    grant: function () { save('granted'); loadAnalytics(); },
    deny: function () { save('denied'); },
    reset: function () { try { localStorage.removeItem(KEY); } catch (e) {} },
    open: function () {}
  };

  if (stored() === 'granted') loadAnalytics();

  var CSS =
    '.ech-consent{position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#fff;' +
    'border-top:3px solid var(--teal,#00adb5);box-shadow:0 -8px 30px -18px rgba(34,40,49,.5);' +
    'font-family:var(--font-sans,Inter,system-ui,sans-serif)}' +
    '.ech-consent[hidden]{display:none!important}' +
    '.ech-consent-inner{max-width:1200px;margin:0 auto;padding:18px 24px;display:flex;flex-wrap:wrap;' +
    'align-items:center;gap:16px 32px}' +
    '.ech-consent-copy{flex:1 1 26rem}' +
    '.ech-consent-title{font-weight:700;font-size:16px;color:#222831;margin:0 0 4px}' +
    '.ech-consent-text{margin:0;font-size:15px;line-height:1.55;color:#393e46;max-width:62ch}' +
    '.ech-consent-text a{color:#222831;font-weight:600;text-decoration:underline}' +
    '.ech-consent-actions{display:flex;gap:12px;flex:0 0 auto}' +
    '.ech-consent-btn{font:inherit;font-weight:700;font-size:15px;min-width:8.5rem;padding:12px 22px;' +
    'border-radius:6px;border:2px solid #222831;cursor:pointer}' +
    '.ech-consent-yes{background:#222831;color:#fff}' +
    '.ech-consent-no{background:#fff;color:#222831}' +
    '.ech-consent-btn:focus-visible{outline:3px solid #00adb5;outline-offset:2px}' +
    '.ech-consent-reopen{background:none;border:0;padding:0;font:inherit;color:inherit;' +
    'text-decoration:underline;cursor:pointer}' +
    '@media (max-width:720px){.ech-consent-actions{width:100%}.ech-consent-btn{flex:1 1 0;min-width:0}}';

  var HTML =
    '<div class="ech-consent-inner">' +
    '<div class="ech-consent-copy">' +
    '<p id="ech-consent-title" class="ech-consent-title">Cookies on this site</p>' +
    '<p id="ech-consent-text" class="ech-consent-text">This site would like to use Google Analytics ' +
    'to see which pages people find useful, which means setting cookies. Nothing is used for ' +
    'advertising and nothing is sold. The site works exactly the same whichever you choose. ' +
    '<a href="/cookies.html">What this involves</a></p>' +
    '</div>' +
    '<div class="ech-consent-actions">' +
    '<button type="button" class="ech-consent-btn ech-consent-yes" data-consent="grant">Accept</button>' +
    '<button type="button" class="ech-consent-btn ech-consent-no" data-consent="deny">Reject</button>' +
    '</div></div>';

  function init() {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    // A banner, not a modal: focus is not stolen from someone mid-read.
    var el = document.createElement('div');
    el.className = 'ech-consent';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-labelledby', 'ech-consent-title');
    el.setAttribute('aria-describedby', 'ech-consent-text');
    el.hidden = true;
    el.innerHTML = HTML;
    document.body.appendChild(el);

    function pad() { document.body.style.paddingBottom = el.hidden ? '' : el.offsetHeight + 'px'; }
    function open() {
      el.hidden = false; pad();
      var first = el.querySelector('[data-consent]');
      if (first) first.focus();
    }
    function close() { el.hidden = true; pad(); }
    window.echelonConsent.open = function () { window.echelonConsent.reset(); open(); };

    el.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-consent]');
      if (!btn) return;
      if (btn.getAttribute('data-consent') === 'grant') window.echelonConsent.grant();
      else window.echelonConsent.deny();
      close();
    });

    // Footer link to change the choice later. Added here so no page needs editing.
    var bottom = document.querySelector('.footer-bottom');
    if (bottom) {
      var link = document.createElement('button');
      link.type = 'button';
      link.className = 'ech-consent-reopen';
      link.textContent = 'Cookie settings';
      var spans = bottom.querySelectorAll(':scope > span');
      var host = spans.length > 1 ? spans[spans.length - 1] : bottom;
      if (host !== bottom) link.style.marginLeft = '16px';
      host.appendChild(link);
      link.addEventListener('click', window.echelonConsent.open);
    }

    window.addEventListener('resize', pad);
    if (!stored()) { el.hidden = false; pad(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
