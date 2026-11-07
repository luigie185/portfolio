import { ACORN_IDS, WEATHERS, XP_PER_LEVEL, dialogue, quests } from '../data/portfolio';
import { initDialogue, say } from './dialogue';
import { read, write, prefersReducedMotion } from './storage';
import { icon, type IconName } from './icons';
import { audio } from './audio';

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

const STORE_KEY = 'forest-quest-v1';
const TITLE_KEY = 'forest-title-seen';

interface GameState {
  xp: number;
  quests: string[];
  acorns: string[];
  weathers: string[];
}

function load(): GameState {
  try {
    const raw = read(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<GameState>;
      return {
        xp: Number(s.xp) || 0,
        quests: Array.isArray(s.quests) ? s.quests : [],
        acorns: Array.isArray(s.acorns) ? s.acorns : [],
        weathers: Array.isArray(s.weathers) ? s.weathers : [],
      };
    }
  } catch {
    /* corrupted save — start fresh */
  }
  return { xp: 0, quests: [], acorns: [], weathers: [] };
}

const state = load();
const save = () => write(STORE_KEY, JSON.stringify(state));
const levelOf = (xp: number) => Math.floor(xp / XP_PER_LEVEL) + 1;

/* ------------------------------------------------------------------ */
/* Toasts                                                              */
/* ------------------------------------------------------------------ */

function toast(iconName: IconName, title: string, body: string) {
  const region = document.querySelector('[data-toast-region]');
  if (!region) return;
  const el = document.createElement('div');
  el.className = 'game-toast';
  el.innerHTML = `<span class="game-toast__icon" aria-hidden="true"></span><div><p class="game-toast__title"></p><p class="game-toast__body"></p></div><span class="game-toast__timer" aria-hidden="true"></span>`;
  el.querySelector('.game-toast__icon')!.innerHTML = icon(iconName);
  el.querySelector('.game-toast__title')!.textContent = title;
  el.querySelector('.game-toast__body')!.textContent = body;
  region.appendChild(el);
  // keep the stack short so it never buries the page (2 on phones, 3 on wider screens)
  const max = window.matchMedia('(max-width: 640px)').matches ? 2 : 3;
  while (region.children.length > max) region.firstElementChild?.remove();
  window.setTimeout(() => el.classList.add('is-leaving'), 3600);
  window.setTimeout(() => el.remove(), 4200);
}

/* ------------------------------------------------------------------ */
/* Mori reactions                                                      */
/* ------------------------------------------------------------------ */

let reactTimer: number | undefined;
function moriReact() {
  if (prefersReducedMotion()) return;
  const spirits = document.querySelectorAll<SVGElement>('[data-spirit]');
  spirits.forEach((el) => {
    el.classList.remove('is-happy');
    void el.getBoundingClientRect(); // restart the animation
    el.classList.add('is-happy');
  });
  window.clearTimeout(reactTimer);
  reactTimer = window.setTimeout(() => spirits.forEach((el) => el.classList.remove('is-happy')), 950);
}

let patIndex = 0;
function patMori() {
  moriReact();
  say(dialogue.pats[patIndex % dialogue.pats.length]);
  patIndex++;
  completeQuest('pat');
}

/* ------------------------------------------------------------------ */
/* Weather                                                             */
/* ------------------------------------------------------------------ */

function currentWeather() {
  return document.documentElement.dataset.weather || 'clear';
}

function renderWeather() {
  const w = WEATHERS.find((x) => x.id === currentWeather()) ?? WEATHERS[0];
  document.querySelectorAll<HTMLElement>('[data-hud-weather]').forEach((el) => (el.innerHTML = icon(w.icon)));
  document.querySelectorAll<HTMLElement>('[data-weather-cycle]').forEach((b) => {
    if (b.hasAttribute('data-hud-weather-btn')) {
      b.setAttribute('aria-label', `Change the weather (R). Now: ${w.label}`);
      b.dataset.tip = `Weather: ${w.label} · R to change`;
    }
  });
}

type WeatherId = (typeof WEATHERS)[number]['id'];

/** Apply a weather. `manual` = the visitor chose it (dialogue + quest); auto changes are quiet. */
function setWeather(next: WeatherId, manual: boolean) {
  const ids = WEATHERS.map((w) => w.id);
  document.documentElement.dataset.weather = next;
  write('weather', next, 'session');
  renderWeather();
  audio.setWeather(next);

  if (manual) {
    say(dialogue.weather[next]);
    moriReact();
    completeQuest('weather');
  } else {
    // a gentle glow on the weather token instead of a toast
    document.querySelectorAll('[data-hud-weather-btn]').forEach((el) => {
      el.classList.remove('is-shifting');
      void (el as HTMLElement).offsetWidth;
      el.classList.add('is-shifting');
    });
  }

  if (!state.weathers.includes(next)) {
    state.weathers.push(next);
    save();
  }
  if (ids.every((id) => id === 'clear' || state.weathers.includes(id))) completeQuest('all-weather');
}

/** Visitor's weather button / R key: step through the weathers in order. */
function cycleWeather() {
  const ids = WEATHERS.map((w) => w.id);
  const next = ids[(ids.indexOf(currentWeather() as WeatherId) + 1) % ids.length];
  setWeather(next, true);
  scheduleAutoWeather(); // the visitor's choice gets a full spell before the sky moves on
}

/* ---- automatic weather: a random, mostly-clear rotation ---- */

const WEATHER_POOL: WeatherId[] = ['clear', 'clear', 'clear', 'clear', 'rain', 'rain', 'breeze', 'breeze', 'mist', 'snow', 'storm'];
let autoWeatherTimer: number | undefined;

const autoWeatherOn = () => read('auto-weather') !== 'off';

function scheduleAutoWeather() {
  window.clearTimeout(autoWeatherTimer);
  if (!autoWeatherOn()) return;
  const delay = 45000 + Math.random() * 45000; // every 45–90 s
  autoWeatherTimer = window.setTimeout(() => {
    if (document.visibilityState === 'visible' && !document.documentElement.classList.contains('show-title')) {
      const options = WEATHER_POOL.filter((w) => w !== currentWeather());
      setWeather(options[Math.floor(Math.random() * options.length)], false);
    }
    scheduleAutoWeather();
  }, delay);
}

function renderAutoWeather() {
  document.querySelectorAll<HTMLElement>('[data-auto-weather]').forEach((b) => {
    b.setAttribute('aria-pressed', String(autoWeatherOn()));
    const label = b.querySelector('[data-auto-weather-label]');
    if (label) label.textContent = autoWeatherOn() ? 'On' : 'Off';
  });
}

function toggleAutoWeather() {
  write('auto-weather', autoWeatherOn() ? 'off' : 'on');
  renderAutoWeather();
  scheduleAutoWeather();
  toast(autoWeatherOn() ? 'clear' : 'x', `Auto weather ${autoWeatherOn() ? 'on' : 'off'}`, autoWeatherOn() ? 'The sky will change on its own now and then.' : 'The weather stays put until you change it.');
}


/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

function render() {
  const level = levelOf(state.xp);
  const inLevel = state.xp % XP_PER_LEVEL;

  document.querySelectorAll<HTMLElement>('[data-hud-level]').forEach((el) => (el.textContent = String(level)));
  document.querySelectorAll<HTMLElement>('[data-hud-xp]').forEach((el) => (el.textContent = `${inLevel}/${XP_PER_LEVEL}`));
  document.querySelectorAll<SVGCircleElement>('[data-hud-xp-ring]').forEach((ring) => {
    const len = 2 * Math.PI * 20;
    ring.style.strokeDashoffset = String(len * (1 - inLevel / XP_PER_LEVEL));
  });
  document.querySelectorAll<HTMLElement>('[data-hud-crest-meta]').forEach((el) => {
    el.textContent = `Traveler LV ${level} · ${inLevel}/${XP_PER_LEVEL} XP`;
  });
  document.querySelectorAll<HTMLElement>('[data-hud-xp-bar]').forEach((el) => {
    el.style.transform = `scaleX(${inLevel / XP_PER_LEVEL})`;
    el.closest('[role="progressbar"]')?.setAttribute('aria-valuenow', String(inLevel));
  });
  document.querySelectorAll<HTMLElement>('[data-hud-acorns]').forEach(
    (el) => (el.textContent = `${state.acorns.length}/${ACORN_IDS.length}`),
  );
  document.querySelectorAll<HTMLElement>('[data-hud-quests]').forEach(
    (el) => (el.textContent = `${state.quests.length}/${quests.length}`),
  );

  document.querySelectorAll<HTMLElement>('[data-acorn]').forEach((el) => {
    el.hidden = state.acorns.includes(el.dataset.acorn!);
  });

  document.querySelectorAll<HTMLElement>('[data-journal-quest]').forEach((el) => {
    el.classList.toggle('is-complete', state.quests.includes(el.dataset.journalQuest!));
  });
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

export function completeQuest(id: string) {
  const quest = quests.find((q) => q.id === id);
  if (!quest || state.quests.includes(id)) return;

  const before = levelOf(state.xp);
  state.quests.push(id);
  state.xp += quest.xp;
  save();
  render();

  toast(quest.icon, `Quest complete: ${quest.title}`, `+${quest.xp} XP`);
  moriReact();
  const after = levelOf(state.xp);
  if (after > before) {
    window.setTimeout(() => toast('star', `Level up! Traveler LV.${after}`, 'The forest spirits cheer for you.'), 700);
    document.querySelectorAll('[data-hud-badge]').forEach((el) => {
      el.classList.remove('is-levelup');
      void (el as HTMLElement).offsetWidth;
      el.classList.add('is-levelup');
    });
  }
  if (state.quests.length === quests.length) {
    window.setTimeout(() => toast('trophy', 'All quests complete!', 'You are now a true Friend of the Forest.'), 1400);
  }
}

function collectAcorn(id: string, from: HTMLElement) {
  if (state.acorns.includes(id)) return;
  state.acorns.push(id);
  state.xp += 10;
  save();

  // little pop effect before the acorn disappears
  if (!prefersReducedMotion()) {
    from.classList.add('is-collected');
    window.setTimeout(render, 350);
  } else {
    render();
  }

  const left = ACORN_IDS.length - state.acorns.length;
  moriReact();
  toast('acorn', 'Acorn found! +10 XP', left > 0 ? `${left} more hidden in the forest.` : 'That was the last one!');
  if (left === 0) {
    completeQuest('acorns');
    say(dialogue.acornsComplete);
  }
}

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
  audio.setNight(dark);
  write('theme', dark ? 'dark' : 'light');
  document.querySelectorAll('[data-theme-toggle]').forEach((b) => b.setAttribute('aria-pressed', String(dark)));
}

/**
 * Day ↔ night as a real sunset / sunrise (see "Sunset & sunrise" in global.css).
 * The theme flips while the sky is already darkening (or brightening) and the
 * cards are briefly dipped, so no colour ever snaps. Reduced motion → instant.
 */
let shifting = false;
function setTheme(dark: boolean, _origin?: { x: number; y: number }) {
  const root = document.documentElement;
  if (prefersReducedMotion() || shifting) {
    applyTheme(dark);
    return;
  }
  shifting = true;
  const story = dark ? 'sunset' : 'sunrise';
  const FLIP = dark ? 1000 : 900; // sun on the horizon / moon gone
  const TOTAL = dark ? 3600 : 3700;
  root.classList.add(story);
  window.setTimeout(() => root.classList.add('time-shift-out'), FLIP - 450);
  window.setTimeout(() => applyTheme(dark), FLIP);
  window.setTimeout(() => root.classList.remove('time-shift-out'), FLIP + 250);
  window.setTimeout(() => {
    root.classList.remove(story);
    shifting = false;
  }, TOTAL);
}

export function toggleTheme(origin?: { x: number; y: number }) {
  const dark = !document.documentElement.classList.contains('dark');
  setTheme(dark, origin);
  completeQuest('nightfall');
  moriReact();
  say(
    dark
      ? 'Spell cast: Nightfall! Mori lights a little lantern, and fireflies rise from the rice fields.'
      : 'Spell cast: Dawnbreak! Warm sunlight spills back over the summer meadow.',
  );
}

function openJournal(section?: string) {
  const dlg = document.querySelector<HTMLDialogElement>('[data-journal]');
  if (!dlg) return;
  if (!dlg.open) dlg.showModal();
  completeQuest('journal');
  if (section === 'settings') {
    const heading = dlg.querySelector<HTMLElement>('[data-journal-settings]');
    requestAnimationFrame(() => {
      heading?.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      heading?.focus({ preventScroll: true });
    });
  } else {
    dlg.scrollTop = 0;
  }
}

function closeTitle() {
  const screen = document.querySelector<HTMLElement>('[data-title-screen]');
  const root = document.documentElement;
  if (!screen || !root.classList.contains('show-title') || screen.classList.contains('is-leaving')) return;
  write(TITLE_KEY, '1', 'session');
  audio.start(); // the Begin click/key is the user gesture browsers require
  const reduced = prefersReducedMotion();
  screen.classList.add('is-leaving');
  window.setTimeout(
    () => {
      root.classList.remove('show-title');
      screen.classList.remove('is-leaving');
      pageEnter();
      document.querySelector<HTMLElement>('#main')?.focus({ preventScroll: true });
    },
    reduced ? 0 : 900,
  );
  completeQuest('begin');
}

/** The page underneath settles in (HUD bubble floats up, hero rises). */
function pageEnter() {
  const root = document.documentElement;
  root.classList.add('page-enter');
  window.setTimeout(() => root.classList.remove('page-enter'), 1400);
}

/** Title menu: "Continue" with the saved level when there's progress. */
function renderTitleMenu() {
  const cta = document.querySelector<HTMLElement>('[data-title-cta]');
  const fresh = document.querySelector<HTMLElement>('[data-title-fresh]');
  const hasSave = state.xp > 0;
  if (cta) cta.textContent = hasSave ? `Continue Journey · LV ${levelOf(state.xp)}` : 'Begin Journey';
  if (fresh) fresh.hidden = !hasSave;
}

function resetProgress() {
  state.xp = 0;
  state.quests = [];
  state.acorns = [];
  state.weathers = [];
  save();
  render();
  toast('leaf', 'Journey reset', 'Your acorns have returned to the forest.');
}

/* ------------------------------------------------------------------ */
/* Graphics quality (smoothness on every device)                       */
/* ------------------------------------------------------------------ */

type Gfx = 'auto' | 'full' | 'lite';

function renderGraphics() {
  const choice = (read('gfx') as Gfx | null) ?? 'auto';
  document.querySelectorAll<HTMLElement>('[data-gfx]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.gfx === choice)));
}

function setGraphics(choice: Gfx) {
  const root = document.documentElement;
  if (choice === 'auto') {
    try {
      localStorage.removeItem('gfx');
    } catch {
      /* ignore */
    }
    probeFrameRate();
  } else {
    write('gfx', choice);
    root.classList.toggle('lite', choice === 'lite');
  }
  renderGraphics();
  toast('palette', `Graphics: ${choice === 'auto' ? 'Auto' : choice === 'full' ? 'Full' : 'Lite'}`, choice === 'lite' ? 'Calmer animations, smoother scrolling.' : 'Enjoy the full painting.');
}

/**
 * In "auto", watch ~2 seconds of frames once the page settles. If the device
 * can't hold a smooth frame rate, switch to lite graphics for this visit.
 */
function probeFrameRate() {
  const root = document.documentElement;
  if (read('gfx') || root.classList.contains('lite') || prefersReducedMotion()) return;
  const times: number[] = [];
  let last = 0;
  const step = (t: number) => {
    if (last) times.push(t - last);
    last = t;
    if (times.length < 120) return requestAnimationFrame(step);
    if (document.visibilityState !== 'visible') return; // throttled tab, measurements unreliable
    const sorted = [...times].sort((a, b) => a - b);
    const p75 = sorted[Math.floor(sorted.length * 0.75)];
    if (p75 > 26) {
      root.classList.add('lite');
      toast('leaf', 'Switched to lite graphics', 'Your device prefers a calmer forest. Change it in the journal.');
    }
  };
  window.setTimeout(() => requestAnimationFrame(step), 2500);
}

function initGraphics() {
  renderGraphics();
  probeFrameRate();

  // On lite devices, pause the decorative scene while scrolling.
  let scrollTimer: number | undefined;
  window.addEventListener(
    'scroll',
    () => {
      const root = document.documentElement;
      if (!root.classList.contains('lite')) return;
      root.classList.add('is-scrolling');
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => root.classList.remove('is-scrolling'), 160);
    },
    { passive: true },
  );
}

/* ------------------------------------------------------------------ */
/* Tooltips: one themed bubble for every [data-tip] element.           */
/* Mouse hover or keyboard focus shows it (not touch, where a tap is   */
/* the action). It flips below when there's no room above and stays    */
/* inside the viewport.                                                */
/* ------------------------------------------------------------------ */

function initTooltips() {
  const tip = document.getElementById('forest-tip');
  const text = tip?.querySelector<HTMLElement>('.forest-tip__text');
  if (!tip || !text) return;
  let current: HTMLElement | null = null;
  let showTimer: number | undefined;

  const place = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const t = tip.getBoundingClientRect();
    const gap = 10;
    const below = r.top - t.height - gap < 8;
    const cx = r.left + r.width / 2;
    const left = Math.min(Math.max(8, cx - t.width / 2), window.innerWidth - t.width - 8);
    const top = below ? r.bottom + gap : r.top - t.height - gap;
    tip.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
    tip.style.setProperty('--arrow-x', `${Math.round(cx - left)}px`);
    tip.classList.toggle('is-below', below);
  };

  const show = (el: HTMLElement, delay: number) => {
    window.clearTimeout(showTimer);
    showTimer = window.setTimeout(() => {
      const label = el.dataset.tip;
      if (!label || !el.isConnected) return;
      current = el;
      text.textContent = label;
      tip.hidden = false;
      tip.classList.remove('is-visible');
      place(el);
      el.setAttribute('aria-describedby', 'forest-tip');
      requestAnimationFrame(() => tip.classList.add('is-visible'));
    }, delay);
  };

  const hide = () => {
    window.clearTimeout(showTimer);
    if (current) current.removeAttribute('aria-describedby');
    current = null;
    tip.classList.remove('is-visible');
    tip.hidden = true;
  };

  document.addEventListener('pointerover', (e) => {
    if ((e as PointerEvent).pointerType !== 'mouse') return;
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-tip]');
    if (el && el !== current) show(el, 280);
  });
  document.addEventListener('pointerout', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-tip]');
    const to = (e as PointerEvent).relatedTarget as HTMLElement | null;
    if (el && (!to || !el.contains(to))) hide();
  });
  document.addEventListener('focusin', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-tip]');
    if (el && el.matches(':focus-visible')) show(el, 0);
  });
  document.addEventListener('focusout', hide);
  document.addEventListener('keydown', (e) => e.key === 'Escape' && hide());
  document.addEventListener('pointerdown', hide);
  window.addEventListener('scroll', hide, { passive: true });
}

/* ------------------------------------------------------------------ */
/* HUD: highlight the chapter in view, firm up the bar after scrolling */
/* ------------------------------------------------------------------ */

function initHud() {
  const links = document.querySelectorAll<HTMLElement>('[data-nav-link]');
  const setActive = (id: string) =>
    links.forEach((a) => {
      if (a.dataset.navLink === id) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  const spy = new IntersectionObserver(
    (entries) => {
      for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  ['about', 'experience', 'projects'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) spy.observe(el);
  });
  setActive('about');

  const hud = document.querySelector<HTMLElement>('[data-hud]');
  let ticking = false;
  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        hud?.classList.toggle('is-scrolled', window.scrollY > 12);
        ticking = false;
      });
    },
    { passive: true },
  );
}

/* ------------------------------------------------------------------ */
/* Sound                                                               */
/* ------------------------------------------------------------------ */

function renderSound() {
  const on = audio.isEnabled();
  document.documentElement.classList.toggle('sound-muted', !on);
  document.querySelectorAll('[data-sound-toggle]').forEach((b) => b.setAttribute('aria-pressed', String(on)));
  const { music, ambience } = audio.volumes;
  document.querySelectorAll<HTMLInputElement>('[data-volume]').forEach((el) => {
    el.value = String(el.dataset.volume === 'music' ? music : ambience);
  });
}

function toggleSound() {
  audio.setEnabled(!audio.isEnabled());
  renderSound();
  // no toast on the title screen; the button label already says it
  if (!document.documentElement.classList.contains('show-title')) {
    toast(audio.isEnabled() ? 'music' : 'volumeOff', audio.isEnabled() ? 'Sound on' : 'Sound off', audio.isEnabled() ? 'Music and weather ambience are playing.' : 'The forest falls quiet.');
  }
}

function initSound() {
  if (!audio.supported) {
    document.querySelectorAll<HTMLElement>('[data-sound-toggle]').forEach((b) => (b.hidden = true));
    return;
  }
  audio.setNight(document.documentElement.classList.contains('dark'));
  audio.setWeather(document.documentElement.dataset.weather || 'clear');
  renderSound();

  // Returning visitors (no title screen): start on the first interaction.
  const firstGesture = (e: Event) => {
    if ((e.target as HTMLElement).closest?.('[data-sound-toggle]')) return; // that click decides itself
    if (!document.documentElement.classList.contains('show-title')) audio.start();
  };
  window.addEventListener('pointerdown', firstGesture, { once: true, capture: true });
  window.addEventListener('keydown', firstGesture, { once: true, capture: true });

  document.addEventListener('input', (e) => {
    const el = e.target as HTMLInputElement;
    if (!el.matches?.('[data-volume]')) return;
    const { music, ambience } = audio.volumes;
    audio.setVolumes(el.dataset.volume === 'music' ? Number(el.value) : music, el.dataset.volume === 'ambience' ? Number(el.value) : ambience);
  });
  document.addEventListener('visibilitychange', () => audio.setPageVisible(document.visibilityState === 'visible'));
}

/* ------------------------------------------------------------------ */
/* Wiring                                                              */
/* ------------------------------------------------------------------ */

function init() {
  renderWeather();
  renderAutoWeather();
  scheduleAutoWeather();
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && scheduleAutoWeather());
  initGraphics();
  initTooltips();
  initSound();
  initHud();
  render();
  initDialogue();
  document
    .querySelectorAll('[data-theme-toggle]')
    .forEach((b) => b.setAttribute('aria-pressed', String(document.documentElement.classList.contains('dark'))));

  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;

    const acorn = t.closest<HTMLElement>('[data-acorn]');
    if (acorn) return collectAcorn(acorn.dataset.acorn!, acorn);

    const themeBtn = t.closest<HTMLElement>('[data-theme-toggle]');
    if (themeBtn) {
      const me = e as MouseEvent;
      const box = themeBtn.getBoundingClientRect();
      const fromPointer = me.clientX || me.clientY;
      return toggleTheme(
        fromPointer ? { x: me.clientX, y: me.clientY } : { x: box.left + box.width / 2, y: box.top + box.height / 2 },
      );
    }
    if (t.closest('[data-pat-spirit]')) return patMori();
    if (t.closest('[data-weather-cycle]')) return cycleWeather();
    if (t.closest('[data-auto-weather]')) return toggleAutoWeather();
    if (t.closest('[data-sound-toggle]')) return toggleSound();
    const gfxBtn = t.closest<HTMLElement>('[data-gfx]');
    if (gfxBtn) return setGraphics(gfxBtn.dataset.gfx as Gfx);
    const journalBtn = t.closest<HTMLElement>('[data-open-journal]');
    if (journalBtn) return openJournal(journalBtn.dataset.openJournal || undefined);
    if (t.closest('[data-start-game]')) return closeTitle();
    if (t.closest('[data-title-fresh]')) {
      resetProgress();
      return closeTitle();
    }
    if (t.closest('[data-reset-game]')) return resetProgress();

    const dlg = t.closest<HTMLDialogElement>('[data-journal]');
    if (dlg && (t === dlg || t.closest('[data-close-journal]'))) dlg.close(); // backdrop or close button

    const option = t.closest<HTMLElement>('[data-dialogue-option]');
    if (option) {
      const opt = dialogue.options[Number(option.dataset.dialogueOption)];
      if (opt) {
        say(opt.text);
        completeQuest('greet');
        if (opt.scroll) {
          document
            .querySelector(opt.scroll)
            ?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        }
      }
    }

    const q = t.closest<HTMLElement>('[data-quest]');
    if (q) completeQuest(q.dataset.quest!);
  });

  // Visiting a chapter completes its quest.
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          completeQuest((entry.target as HTMLElement).dataset.sectionQuest!);
          io.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.25 },
  );
  document.querySelectorAll('[data-section-quest]').forEach((s) => io.observe(s));

  // Keyboard shortcuts (ignored while typing or with modifier keys).
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return;

    if (document.documentElement.classList.contains('show-title')) {
      if (e.key !== 'Tab' && e.key !== 'Shift') {
        e.preventDefault();
        closeTitle();
      }
      return;
    }
    if (document.querySelector('[data-journal][open]') && e.key.toLowerCase() !== 'j') return;

    const jump = (sel: string) =>
      document.querySelector(sel)?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });

    switch (e.key.toLowerCase()) {
      case 'j': {
        const dlg = document.querySelector<HTMLDialogElement>('[data-journal]');
        if (dlg?.open) dlg.close();
        else openJournal();
        break;
      }
      case 'n': {
        const btn = document.querySelector<HTMLElement>('[data-hud-theme-btn]');
        const box = btn?.getBoundingClientRect();
        toggleTheme(box ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : undefined);
        break;
      }
      case 'r':
        cycleWeather();
        break;
      case 'm':
        toggleSound();
        break;
      case '1':
        jump('#about');
        break;
      case '2':
        jump('#experience');
        break;
      case '3':
        jump('#projects');
        break;
      default:
        return;
    }
    e.preventDefault();
  });

  if (document.documentElement.classList.contains('show-title')) {
    renderTitleMenu();
    document.querySelector<HTMLElement>('[data-start-game]')?.focus({ preventScroll: true });
  } else {
    pageEnter();
  }

  say(dialogue.greeting);
}

init();
