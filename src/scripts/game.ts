import { ACORN_IDS, WEATHERS, XP_PER_LEVEL, dialogue, quests } from '../data/portfolio';
import { initDialogue, say } from './dialogue';
import { read, write, prefersReducedMotion } from './storage';

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

function toast(icon: string, title: string, body: string) {
  const region = document.querySelector('[data-toast-region]');
  if (!region) return;
  const el = document.createElement('div');
  el.className = 'game-toast';
  el.innerHTML = `<span class="game-toast__icon" aria-hidden="true"></span><div><p class="game-toast__title"></p><p class="game-toast__body"></p></div>`;
  el.querySelector('.game-toast__icon')!.textContent = icon;
  el.querySelector('.game-toast__title')!.textContent = title;
  el.querySelector('.game-toast__body')!.textContent = body;
  region.appendChild(el);
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
  document.querySelectorAll<HTMLElement>('[data-hud-weather]').forEach((el) => (el.textContent = w.icon));
  document
    .querySelectorAll('[data-weather-cycle]')
    .forEach((b) => b.setAttribute('aria-label', `Change the weather (R). Now: ${w.label}`));
}

function cycleWeather() {
  const ids = WEATHERS.map((w) => w.id);
  const next = ids[(ids.indexOf(currentWeather() as (typeof ids)[number]) + 1) % ids.length];
  document.documentElement.dataset.weather = next;
  write('weather', next, 'session');
  renderWeather();
  say(dialogue.weather[next]);
  moriReact();
  completeQuest('weather');

  if (!state.weathers.includes(next)) {
    state.weathers.push(next);
    save();
  }
  if (ids.every((id) => id === 'clear' || state.weathers.includes(id))) completeQuest('all-weather');
}


/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

function render() {
  const level = levelOf(state.xp);
  const inLevel = state.xp % XP_PER_LEVEL;

  document.querySelectorAll<HTMLElement>('[data-hud-level]').forEach((el) => (el.textContent = String(level)));
  document.querySelectorAll<HTMLElement>('[data-hud-xp]').forEach((el) => (el.textContent = `${inLevel}/${XP_PER_LEVEL}`));
  document.querySelectorAll<HTMLElement>('[data-hud-xp-bar]').forEach((el) => {
    el.style.width = `${(inLevel / XP_PER_LEVEL) * 100}%`;
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
    window.setTimeout(() => toast('⭐', `Level up! Traveler LV.${after}`, 'The forest spirits cheer for you.'), 700);
    document.querySelectorAll('[data-hud-badge]').forEach((el) => {
      el.classList.remove('is-levelup');
      void (el as HTMLElement).offsetWidth;
      el.classList.add('is-levelup');
    });
  }
  if (state.quests.length === quests.length) {
    window.setTimeout(() => toast('🏆', 'All quests complete!', 'You are now a true Friend of the Forest.'), 1400);
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
  toast('🌰', 'Acorn found! +10 XP', left > 0 ? `${left} more hidden in the forest.` : 'That was the last one!');
  if (left === 0) {
    completeQuest('acorns');
    say(dialogue.acornsComplete);
  }
}

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
  write('theme', dark ? 'dark' : 'light');
  document.querySelectorAll('[data-theme-toggle]').forEach((b) => b.setAttribute('aria-pressed', String(dark)));
}

/**
 * Day ↔ night with a circular "spell" reveal that grows from the point the
 * spell was cast (View Transitions API). Browsers without it, and visitors who
 * prefer reduced motion, get an instant switch.
 */
function setTheme(dark: boolean, origin?: { x: number; y: number }) {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> };
  };
  if (!doc.startViewTransition || prefersReducedMotion()) {
    applyTheme(dark);
    return;
  }
  const x = origin?.x ?? window.innerWidth - 60;
  const y = origin?.y ?? 32;
  const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const root = document.documentElement;
  root.classList.add('theme-switching');
  const t = doc.startViewTransition(() => applyTheme(dark));
  t.ready
    .then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 1100, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    })
    .catch(() => {});
  t.finished.finally(() => root.classList.remove('theme-switching'));
}

export function toggleTheme(origin?: { x: number; y: number }) {
  const dark = !document.documentElement.classList.contains('dark');
  setTheme(dark, origin);
  completeQuest('nightfall');
  moriReact();
  say(
    dark
      ? '✨ Spell cast: Nightfall! Mori lights a little lantern, and fireflies rise from the rice fields.'
      : '☀️ Spell cast: Dawnbreak! Warm sunlight spills back over the summer meadow.',
  );
}

function openJournal() {
  const dlg = document.querySelector<HTMLDialogElement>('[data-journal]');
  if (!dlg || dlg.open) return;
  dlg.showModal();
  completeQuest('journal');
}

function closeTitle() {
  const screen = document.querySelector<HTMLElement>('[data-title-screen]');
  if (!screen || !document.documentElement.classList.contains('show-title')) return;
  write(TITLE_KEY, '1', 'session');
  screen.classList.add('is-leaving');
  window.setTimeout(
    () => {
      document.documentElement.classList.remove('show-title');
      document.querySelector<HTMLElement>('#main')?.focus({ preventScroll: true });
    },
    prefersReducedMotion() ? 0 : 450,
  );
  completeQuest('begin');
}

function resetProgress() {
  state.xp = 0;
  state.quests = [];
  state.acorns = [];
  state.weathers = [];
  save();
  render();
  toast('🍂', 'Journey reset', 'Your acorns have returned to the forest.');
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
  toast('🎨', `Graphics: ${choice === 'auto' ? 'Auto' : choice === 'full' ? 'Full' : 'Lite'}`, choice === 'lite' ? 'Calmer animations, smoother scrolling.' : 'Enjoy the full painting.');
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
      toast('🍃', 'Switched to lite graphics', 'Your device prefers a calmer forest. Change it in the journal.');
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
/* Wiring                                                              */
/* ------------------------------------------------------------------ */

function init() {
  renderWeather();
  initGraphics();
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
    const gfxBtn = t.closest<HTMLElement>('[data-gfx]');
    if (gfxBtn) return setGraphics(gfxBtn.dataset.gfx as Gfx);
    if (t.closest('[data-open-journal]')) return openJournal();
    if (t.closest('[data-start-game]')) return closeTitle();
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
        const btn = document.querySelector<HTMLElement>('header [data-theme-toggle]');
        const box = btn?.getBoundingClientRect();
        toggleTheme(box ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : undefined);
        break;
      }
      case 'r':
        cycleWeather();
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
    document.querySelector<HTMLElement>('[data-start-game]')?.focus();
  }

  say(dialogue.greeting);
}

init();
