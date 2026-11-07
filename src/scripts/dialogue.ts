import { prefersReducedMotion } from './storage';

// Game-style typewriter for the NPC dialogue box.
// Accessibility: the full line goes into a visually hidden live region at once
// (announced a single time), while the animated copy is aria-hidden so screen
// readers never read half-typed text. Clicking the box finishes the line.

let timer: number | undefined;
let fullText = '';

function els() {
  return {
    box: document.querySelector<HTMLElement>('[data-dialogue-box]'),
    sr: document.querySelector<HTMLElement>('[data-dialogue-sr]'),
    visible: document.querySelector<HTMLElement>('[data-dialogue-visible]'),
    caret: document.querySelector<HTMLElement>('[data-dialogue-caret]'),
  };
}

function finish() {
  const { visible, caret } = els();
  window.clearInterval(timer);
  timer = undefined;
  if (visible) visible.textContent = fullText;
  caret?.classList.add('is-done');
}

export function say(text: string) {
  const { sr, visible, caret } = els();
  if (!visible) return;
  window.clearInterval(timer);
  fullText = text;
  if (sr) sr.textContent = text;
  caret?.classList.remove('is-done');

  if (prefersReducedMotion()) {
    finish();
    return;
  }

  let i = 0;
  visible.textContent = '';
  timer = window.setInterval(() => {
    i += 2;
    visible.textContent = text.slice(0, i);
    if (i >= text.length) finish();
  }, 22);
}

export function initDialogue() {
  const { box } = els();
  box?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (timer !== undefined) finish();
  });
}
