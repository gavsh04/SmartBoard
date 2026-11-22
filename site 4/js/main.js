{
  const cfg = window.SMARTBOARD_CONFIG || {};
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('js');

  /* ---------- Navigation ---------- */
  const nav = $('#nav');
  const menu = $('#menu');
  const menuBtn = $('#menuBtn');
  const setScrolled = () => nav.classList.toggle('is-scrolled', scrollY > 8);
  setScrolled();
  addEventListener('scroll', setScrolled, { passive: true });

  const setMenu = open => {
    menu.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
  };
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); }
  });
  matchMedia('(min-width: 921px)').addEventListener('change', e => { if (e.matches) setMenu(false); });

  // Mark the nav link for the section in view
  const links = $$('a', menu);
  const sections = links.map(a => $(a.getAttribute('href'))).filter(Boolean);
  const spy = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(a => {
        if (a.getAttribute('href') === '#' + entry.target.id) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(s => spy.observe(s));

  /* ---------- Reveal on scroll ---------- */
  const revealTargets = $$('.section__head, .split__head, .problems, .figures, .track, .feature, .team, .faq, .cta__grid > div');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealTargets.forEach(el => el.classList.add('is-in'));
  } else {
    const reveal = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        reveal.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    revealTargets.forEach(el => { el.classList.add('reveal'); reveal.observe(el); });
  }

  /* ---------- Config-driven content ---------- */
  const isHttpUrl = v => /^https:\/\/[^\s]+$/i.test(v || '');
  const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '');

  // Team LinkedIn links: shown only when a real URL is set
  $$('.member').forEach(card => {
    const url = card.dataset.linkedin;
    if (!isHttpUrl(url)) return;
    const name = $('h3', card).textContent;
    const a = document.createElement('a');
    a.className = 'member__link';
    a.href = url; a.target = '_blank'; a.rel = 'noopener';
    a.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-linkedin"/></svg>LinkedIn';
    a.setAttribute('aria-label', name + ' on LinkedIn (opens in a new tab)');
    card.append(a);
  });

  // Footer contact block and privacy contact line
  const email = isEmail(cfg.contactEmail) ? cfg.contactEmail : '';
  const socialLabels = { instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', github: 'GitHub' };
  const socials = Object.entries(cfg.socials || {}).filter(([, url]) => isHttpUrl(url));
  if (email || socials.length) {
    $('#contactBlock').hidden = false;
    const box = $('#socials');
    if (email) {
      const mail = document.createElement('a');
      mail.href = 'mailto:' + email; mail.textContent = email;
      box.before(mail);
    }
    socials.forEach(([key, url]) => {
      const a = document.createElement('a');
      a.href = url; a.target = '_blank'; a.rel = 'noopener';
      a.textContent = socialLabels[key] || key;
      box.append(a);
    });
  }
  if (email) {
    const span = $('#privacyContact');
    span.append(' by emailing ');
    const a = document.createElement('a');
    a.href = 'mailto:' + email; a.textContent = email;
    span.append(a);
  }

  /* ---------- Waitlist form ---------- */
  const form = $('#waitForm');
  const submit = $('#f-submit');
  const msg = $('#formMsg');
  const endpoint = isHttpUrl(cfg.waitlistEndpoint) ? cfg.waitlistEndpoint : '';
  const STORE_KEY = 'smartboard-waitlist';
  let sending = false;

  const store = {
    get() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch { return []; } },
    add(v) { try { localStorage.setItem(STORE_KEY, JSON.stringify([...this.get(), v])); } catch { /* storage unavailable */ } }
  };

  const say = (text, kind) => { msg.textContent = text; msg.className = 'form__msg' + (kind ? ' is-' + kind : ''); };

  const fieldError = (input, errEl, text) => {
    input.setAttribute('aria-invalid', text ? 'true' : 'false');
    $('#' + errEl).textContent = text || '';
  };

  const validate = () => {
    const name = form.name.value.trim();
    const mail = form.email.value.trim();
    const checks = [
      [form.name, 'e-name', !name ? 'Please enter your name.' : name.length > 80 ? 'Please use a shorter name.' : ''],
      [form.email, 'e-email', !mail ? 'Please enter your email address.' : !isEmail(mail) ? 'That email address doesn\'t look right. Check for typos.' : ''],
      [form.consent, 'e-consent', !form.consent.checked ? 'Please tick the box so we\'re allowed to contact you.' : '']
    ];
    checks.forEach(([el, err, text]) => fieldError(el, err, text));
    const firstBad = checks.find(([, , text]) => text);
    if (firstBad) firstBad[0].focus();
    return !firstBad;
  };

  // Clear an error as soon as the visitor fixes it
  [['name', 'e-name'], ['email', 'e-email'], ['consent', 'e-consent']].forEach(([n, err]) => {
    form[n].addEventListener(n === 'consent' ? 'change' : 'input', () => {
      if (form[n].getAttribute('aria-invalid') === 'true') fieldError(form[n], err, '');
    });
  });

  if (!endpoint) {
    say('Sign-ups aren\'t open yet. The waitlist is being set up, so please check back soon.', 'info');
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (sending) return;
    if (!validate()) { say('', ''); return; }

    if (!endpoint) {
      say('Sign-ups aren\'t open yet, so your details haven\'t been sent. Please check back soon.', 'info');
      return;
    }

    const mail = form.email.value.trim().toLowerCase();
    if (store.get().includes(mail)) {
      say('This email is already on the waitlist from this device. No need to sign up again.', 'ok');
      return;
    }

    sending = true;
    submit.disabled = true;
    submit.textContent = 'Sending…';
    say('', '');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      store.add(mail);
      const first = form.name.value.trim().split(/\s+/)[0];
      form.reset();
      say(`Thanks, ${first}. You're on the waitlist. We'll email you when early access opens.`, 'ok');
    } catch (err) {
      say(err.name === 'AbortError'
        ? 'This is taking too long. Check your connection and try again.'
        : 'We couldn\'t add you just now. Your details weren\'t saved, so please try again in a moment.', 'err');
    } finally {
      clearTimeout(timer);
      sending = false;
      submit.disabled = false;
      submit.textContent = 'Join the waitlist';
    }
  });
}
