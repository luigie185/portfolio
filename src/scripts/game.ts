import { ACORN_IDS, XP_PER_LEVEL, dialogue, quests } from '../data/portfolio';
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
      };
    }
  } catch {
    /* corrupted save — start fresh */
  }
  return { xp: 0, quests: [], acorns: [] };
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
  toast('🌰', 'Acorn found! +10 XP', left > 0 ? `${left} more hidden in the forest.` : 'That was the last one!');
  if (left === 0) {
    completeQuest('acorns');
    say(dialogue.acornsComplete);
  }
}

function setTheme(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
  write('theme', dark ? 'dark' : 'light');
  document.querySelectorAll('[data-theme-toggle]').forEach((b) => b.setAttribute('aria-pressed', String(dark)));
}

export function toggleTheme() {
  const dark = !document.documentElement.classList.contains('dark');
  setTheme(dark);
  completeQuest('nightfall');
  say(
    dark
      ? '✨ Spell cast: Nightfall! The lanterns are lit and fireflies dance across the starlit forest.'
      : '☀️ Spell cast: Dawnbreak! Warm sunlight returns to the summer meadow.',
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
  save();
  render();
  toast('🍂', 'Journey reset', 'Your acorns have returned to the forest.');
}

/* ------------------------------------------------------------------ */
/* Wiring                                                              */
/* ------------------------------------------------------------------ */

function init() {
  render();
  initDialogue();
  document
    .querySelectorAll('[data-theme-toggle]')
    .forEach((b) => b.setAttribute('aria-pressed', String(document.documentElement.classList.contains('dark'))));

  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;

    const acorn = t.closest<HTMLElement>('[data-acorn]');
    if (acorn) return collectAcorn(acorn.dataset.acorn!, acorn);

    if (t.closest('[data-theme-toggle]')) return toggleTheme();
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
      case 'n':
        toggleTheme();
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
