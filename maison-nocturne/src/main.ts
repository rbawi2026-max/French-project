import './style.css';
import { createSalon, type SalonScene } from './scene';
import { garments, freshState, discoverClue, solveRiddle, openDoor, restoreState, puzzleIds, sealDigits, type GameState, type ObjectId, type GarmentId, type PuzzleId } from './game';
import { puzzles, orderingNote } from './puzzles';

const icons = {
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  sound: '<path d="m11 5-6 4H2v6h3l6 4V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="m11 5-6 4H2v6h3l6 4V5Zm5 4 5 6m0-6-5 6"/>',
  full: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  book: '<path d="M12 5c-4-3-9-2-9-2v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2Zm0 0v16"/>',
  hint: '<path d="M9 18h6m-5 3h4M8 14a7 7 0 1 1 8 0c-1 1-1 2-1 2H9s0-1-1-2Z"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2"/>',
  key: '<circle cx="8" cy="8" r="4"/><path d="m11 11 10 10m-5-5 3-3m0 6 3-3"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6 6-2Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4 3c-1 .5-1 1-1 2m0 3v.2"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  reset: '<path d="M3 10a9 9 0 1 1 1 7M3 4v6h6"/>',
};
const icon = (name: keyof typeof icons, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const storageKey = 'maison-nocturne-room1-riddles-v2';
let state: GameState = freshState();
try { state = restoreState(localStorage.getItem(storageKey)); } catch { /* Private browsing still supports a complete playthrough. */ }
let scene: SalonScene;
let soundEnabled = false;
let reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let doorCode = '';
let hintLevel = 0;
let toastTimer = 0;
let audio: AudioContext | null = null;
let gain: GainNode | null = null;
let currentPanel = '';
const app = document.querySelector<HTMLElement>('#app')!;
app.innerHTML = `
  <div id="scene"></div>
  <div class="vignette" aria-hidden="true"></div>
  <div class="loading" id="loading"><span class="loading-mark">MN</span><p>Opening the doors of Maison Nocturne…</p></div>
  <header class="topbar">
    <a class="brand" href="#" aria-label="Maison Nocturne home"><span class="brand-mark">M<span>N</span></span><span class="brand-name">MAISON NOCTURNE<small>PARIS · DEPUIS 1898</small></span></a>
    <div class="story-title"><span class="tiny-diamond"></span> THE MISSING COLLECTION <span class="tiny-diamond"></span></div>
    <nav class="header-actions" aria-label="Experience controls">
      <span class="demo-badge">ROOM 1 DEMO</span>
      <button class="icon-button" id="sound" title="Turn ambient sound on" aria-label="Turn ambient sound on" aria-pressed="false">${icon('mute')}</button>
      <button class="icon-button" id="fullscreen" title="Fullscreen" aria-label="Enter fullscreen">${icon('full')}</button>
      <button class="icon-button" id="help" title="How to play" aria-label="How to play">${icon('help')}</button>
    </nav>
  </header>
  <section class="intro" id="intro" aria-label="Welcome">
    <p class="eyebrow"><span class="line"></span> A FRENCH FASHION MYSTERY</p>
    <h1>Some secrets<br>are sewn<br><em>in silence.</em></h1>
    <p class="intro-description">One missing collection. Four locked rooms.<br>A couture house that remembers everything.</p>
    <button class="primary-button enter-button" id="enter">Enter the salon ${icon('arrow')}</button>
    <div class="intro-details"><span>EXPLORE IN 3D</span><i></i><span>NO TIMER</span><i></i><span>NO SCARES</span></div>
  </section>
  <div class="intro-caption" id="intro-caption"><span class="caption-rule"></span><p>PARIS, AFTER HOURS</p><span>The house has been expecting you.</span></div>
  <section class="objective hidden" id="objective" aria-label="Current objective">
    <p class="eyebrow">CHAPTER I <span class="objective-separator">/</span> THE FIRST MEMORY</p>
    <h1>The Salon of<br><em>Silhouettes</em></h1>
    <div class="objective-task"><span class="objective-dot"></span><p id="objective-text"></p></div>
    <div class="memory-count"><span id="memory-counter">0 / 4</span> SEALS RECOVERED</div>
  </section>
  <div id="hotspots" class="hotspots"></div>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>
  <div class="play-toolbar hidden" id="play-toolbar">
    <button class="tool-button" id="journal">${icon('book')}<span>Journal</span><span class="count" id="journal-count">0</span></button>
    <button class="tool-button" id="objects">${icon('eye')}<span>Objects</span></button>
    <button class="tool-button" id="hint">${icon('hint')}<span>A little guidance</span></button>
  </div>
  <div class="movement-help hidden" id="movement-help"><span class="keycap">W</span><span class="keycap">A</span><span class="keycap">S</span><span class="keycap">D</span><span>move</span><i></i><span>Drag to look · Click to inspect</span><button id="reset-view" aria-label="Return to the starting viewpoint" title="Reset viewpoint">${icon('compass')}</button></div>
  <div class="touch-pad hidden" id="touch-pad" aria-label="Movement controls">
    <button data-move="w" aria-label="Move forward">↑</button><div><button data-move="a" aria-label="Move left">←</button><button data-move="s" aria-label="Move backward">↓</button><button data-move="d" aria-label="Move right">→</button></div>
  </div>
  <footer class="chapter-footer">
    <button class="chapter current" id="chapter-map"><span class="chapter-num">01</span><span><small>YOU ARE HERE</small>The Salon of Silhouettes</span><span class="chapter-current-dot"></span></button>
    <div class="chapter upcoming"><span class="chapter-num">02</span><span>The House of Signatures</span>${icon('lock')}</div>
    <div class="chapter upcoming"><span class="chapter-num">03</span><span>The 1947 Atelier</span>${icon('lock')}</div>
    <div class="chapter upcoming"><span class="chapter-num">04</span><span>The Final Runway</span>${icon('lock')}</div>
    <span class="footer-note">AN INTERACTIVE FASHION ARCHIVE</span>
  </footer>
  <dialog id="panel" class="panel"></dialog>
`;
const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const dialog = $<HTMLDialogElement>('#panel');
const labels: Record<ObjectId, [string, string]> = {
  court: ['01', 'Court silhouette'], empire: ['02', 'Empire silhouette'], jazz: ['03', 'Modern silhouette'],
  mirror: ['✧', 'The memory mirror'], door: ['↗', 'The code lock'], letter: ['✉', 'The sealed invitation'],
};
const hotspotElements = new Map<ObjectId, HTMLButtonElement>();
for (const [id, [number, label]] of Object.entries(labels)) {
  const button = document.createElement('button'); button.className = 'hotspot'; button.dataset.id = id;
  button.setAttribute('aria-label', `Inspect ${label}`); button.innerHTML = `<span class="hotspot-ring">${number}</span><span class="hotspot-label">${label}</span>`;
  button.addEventListener('click', () => inspect(id as ObjectId)); $('#hotspots').append(button); hotspotElements.set(id as ObjectId, button);
}

function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* Nonpersistent play remains available. */ }
  scene?.setProgress(state.solved.includes('mirror'), state.completed, state.discovered); updateUI();
}
function updateUI() {
  const entered = state.entered;
  $('#intro').classList.toggle('hidden', entered); $('#intro-caption').classList.toggle('hidden', entered);
  for (const id of ['objective', 'play-toolbar', 'movement-help', 'touch-pad']) $(`#${id}`).classList.toggle('hidden', !entered);
  document.body.classList.toggle('playing', entered);
  $('#memory-counter').textContent = `${state.solved.length} / 4`; $('#journal-count').textContent = `${state.solved.length}`;
  $('#objective-text').textContent = state.completed ? 'The code is broken. The first door is open.' : state.solved.length === 4 ? (state.folioFound ? 'Order the four digits. Unlock the door.' : 'Find the invitation’s concealed instructions.') : 'Search for hidden clues. Solve four fashion riddles.';
  for (const id of puzzleIds) {
    const button = hotspotElements.get(id)!; button.classList.toggle('collected', state.solved.includes(id));
    button.querySelector('.hotspot-ring')!.innerHTML = state.solved.includes(id) ? icon('check') : labels[id][0];
  }
  $('#enter').innerHTML = state.discovered.length ? `Continue your investigation ${icon('arrow')}` : `Enter the salon ${icon('arrow')}`;
}
function toast(message: string) {
  $('#toast').textContent = message; $('#toast').classList.add('visible');
  window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => $('#toast').classList.remove('visible'), 4200);
}
function panel(title: string, content: string, kicker = 'MAISON NOCTURNE', extraClass = '') {
  currentPanel = title; dialog.className = `panel ${extraClass}`;
  dialog.innerHTML = `<button class="icon-button panel-close" aria-label="Close panel">${icon('close')}</button><div class="panel-inner"><p class="eyebrow">${kicker}</p><h2>${title}</h2>${content}</div>`;
  $('.panel-close').addEventListener('click', () => dialog.close());
  if (!dialog.open) dialog.showModal(); dialog.scrollTop = 0; scene?.setPaused(true);
}
dialog.addEventListener('close', () => { scene?.setPaused(false); currentPanel = ''; });
// Close explicitly with the close button or Escape; opening a clue must never
// dismiss it because the pointer is still over the 3D room.


function garmentDrawing(id: GarmentId) {
  const paths = {
    court: 'M83 30 70 38 57 58 67 72 79 63 84 92 62 113 35 154 20 205Q100 229 180 205L165 154 138 113 116 92 121 63 133 72 143 58 130 38 117 30Q100 41 83 30Z',
    empire: 'M82 30 68 36 62 56 76 64 84 53 83 72 67 148 59 216Q100 225 141 216L133 148 117 72 116 53 124 64 138 56 132 36 118 30Q100 45 82 30Z',
    jazz: 'M77 30 67 32 68 107 62 180 71 195 82 180 93 195 104 180 115 195 126 180 137 195 138 180 132 107 133 32 123 30 119 52Q100 65 81 52Z',
  };
  return `<svg class="garment-illustration" viewBox="0 0 200 250" aria-hidden="true"><defs><linearGradient id="dress-${id}" x1="0" x2="1"><stop stop-color="${garments[id].color}" stop-opacity=".15"/><stop offset=".5" stop-color="${garments[id].color}" stop-opacity=".5"/><stop offset="1" stop-color="${garments[id].color}" stop-opacity=".15"/></linearGradient></defs><path d="M100 12v21m0 191v18m-25 0h50" fill="none" stroke="#c3a775" stroke-opacity=".6"/><path d="${paths[id]}" fill="url(#dress-${id})" stroke="${garments[id].color}" stroke-width="1"/><path d="${id === 'court' ? 'M84 92h32M84 92 68 214m48-122 16 122M79 63q21 10 42 0' : id === 'empire' ? 'M83 72h34M87 80l-9 136m23-135v139m12-139 9 135' : 'M67 133h66M69 145l12 13 12-13 12 13 12-13 16 13M68 84l32 19 32-19'}" fill="none" stroke="${garments[id].color}" stroke-opacity=".8"/></svg>`;
}
function sealRow() {
  return puzzleIds.map(id => `<span class="seal-chip ${state.solved.includes(id) ? 'recovered' : ''}"><b>${puzzles[id].symbol}</b><span>${puzzles[id].seal}</span><strong>${state.solved.includes(id) ? sealDigits[id] : '—'}</strong></span>`).join('');
}
function evidence(id: PuzzleId) {
  const p = puzzles[id];
  return `<div class="evidence-paper"><span class="eyebrow">RECOVERED EVIDENCE</span><h3>${p.evidenceTitle}</h3>${id === 'mirror' ? '<div class="mirror-signature" aria-label="Letters R O I D, read right to left">R O I D</div><p class="mirror-date">12 · 02 · 1947</p>' : ''}<p>${p.evidence}</p></div>`;
}
function inspect(id: ObjectId) {
  if (!state.entered) return;
  scene.focus(id);
  if (id === 'letter') { showLetter(); return; }
  if (id === 'door') { state.completed ? showCompletion() : showDoor(); return; }
  showPuzzle(id);
}
function showPuzzle(id: PuzzleId) {
  const p = puzzles[id];
  if (!state.discovered.includes(id)) {
    panel(p.title, `<p class="body-copy">${p.search}</p>
      <div class="search-artifact">${id === 'mirror' ? '<div class="clouded-mirror">✧<small>Silver mist veils the glass</small></div>' : garmentDrawing(id)}
        <span class="search-seal">${p.symbol}</span>
      </div>
      <p class="eyebrow">EXAMINE THE OBJECT</p>
      <button class="search-action" id="discover-clue">${icon('eye')}<span>${p.action}</span>${icon('arrow')}</button>
      <button class="search-action quiet-action" id="inspect-detail">${icon('compass')}<span>${id === 'court' ? 'Examine the bodice buttons' : id === 'empire' ? 'Inspect the pedestal base' : id === 'jazz' ? 'Examine the pearl necklace' : 'Examine the gilt frame'}</span></button>
      <p class="search-feedback" id="search-feedback" role="status"></p>
      <p class="artifact-note">A clue must be uncovered before its riddle can be answered.</p>`, 'SEARCH THE SALON · ' + p.seal.toUpperCase());
    $('#discover-clue').addEventListener('click', () => {
      state = discoverClue(state, id); save(); chime(); showPuzzle(id);
      toast('Hidden clue discovered · saved in your journal');
    });
    $('#inspect-detail').addEventListener('click', () => {
      $('#search-feedback').textContent = id === 'court' ? 'The buttons are decorative. Something has been sewn inside the skirt instead.' : id === 'empire' ? 'The base is solid. The corner of a folded sheet is caught under the display plaque.' : id === 'jazz' ? 'The necklace is intact. The pearl-shaped drawer handle below it looks promising.' : 'The frame carries a date, but the missing name lies beneath the mist on the glass.';
    });
    return;
  }
  if (state.solved.includes(id)) {
    panel('A secret, unstitched.', `<div class="seal-reveal"><span>${p.symbol}</span><div><small>${p.seal.toUpperCase()} SEAL</small><strong>${sealDigits[id]}</strong></div></div>
      <p class="body-copy">${p.explanation}</p><p class="artifact-note">This digit belongs to the ${p.seal.toLowerCase()} seal. The invitation tells you where to place it in the door code.</p>
      <div class="seal-inventory">${sealRow()}</div>
      <button class="primary-button full-width" id="puzzle-done">Return to the salon ${icon('arrow')}</button>
      <details class="evidence-details"><summary>Revisit the hidden clue</summary>${evidence(id)}</details>
      <a class="source-link" href="${p.source}" target="_blank" rel="noopener noreferrer">${p.sourceTitle} ↗</a>`, 'RIDDLE SOLVED · ' + p.seal.toUpperCase());
    $('#puzzle-done').addEventListener('click', () => dialog.close()); return;
  }
  panel(p.title, `${evidence(id)}<blockquote class="riddle-verse">${p.riddle}</blockquote>
    <form id="riddle-form" autocomplete="off"><fieldset class="riddle-fieldset"><legend>${p.question}</legend>${answerControls(id)}</fieldset>
      <p class="answer-feedback" id="answer-feedback" role="status" aria-live="polite"></p>
      <button class="primary-button full-width" type="submit">Test my answer ${icon('arrow')}</button>
    </form>
    <details class="riddle-hints"><summary>Need a nudge?</summary><p>${p.hints[1]}</p><details><summary>Reveal the answer</summary><p>${p.hints[2]}</p></details></details>`, 'FASHION RIDDLE · ' + p.seal.toUpperCase(), id === 'empire' ? 'puzzle-panel' : '');
  $('#riddle-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = new FormData(event.target as HTMLFormElement);
    const answer = id === 'jazz' ? form.getAll('answer').map(String) : String(form.get('answer') || '');
    if ((Array.isArray(answer) && answer.length !== 2) || (!Array.isArray(answer) && !answer.trim())) {
      $('#answer-feedback').textContent = id === 'jazz' ? 'Choose exactly two features before testing your answer.' : 'Add an answer before testing it.'; return;
    }
    const next = solveRiddle(state, id, answer);
    if (!next.solved.includes(id)) {
      $('#answer-feedback').textContent = id === 'court' ? 'The label distinguishes the torso, sides, and back. Which support sits at the sides of the hips?' : id === 'empire' ? 'That seam is too low. The note places the waist just beneath the bust.' : id === 'jazz' ? 'That pair does not match both lines of the dance card. Follow the waist down and the hem up.' : 'The signature is reversed. Read its four letters from right to left.';
      return;
    }
    state = next; save(); chime(); showPuzzle(id);
    toast(state.solved.length === 4 ? 'All four seals recovered. The invitation holds their order.' : 'Riddle solved · ' + state.solved.length + ' of 4 seals recovered');
  });
}
function waistSketch(letter: string, waist: number) {
  return `<svg viewBox="0 0 120 180" role="img" aria-label="Sketch ${letter}, ${waist < 70 ? 'waist just beneath the bust' : waist > 100 ? 'waist at the hips' : 'natural waist'}"><path d="M49 15 37 24 31 43 43 47 46 64 33 155Q60 167 87 155L74 64 77 47 89 43 83 24 71 15Q60 25 49 15Z" fill="#c8b88e22" stroke="#cdbb95"/><path d="M44 ${waist}H76" stroke="#f2d28f" stroke-width="4"/><circle cx="60" cy="9" r="4" fill="#cdbb95"/></svg>`;
}
function answerControls(id: PuzzleId) {
  if (id === 'empire') return `<div class="sketch-choices">${[{ id: 'b', y: 110 }, { id: 'c', y: 85 }, { id: 'a', y: 56 }].map(s => `<label class="sketch-choice"><input type="radio" name="answer" value="${s.id}" aria-label="Sketch ${s.id.toUpperCase()}"><span class="sketch-letter">${s.id.toUpperCase()}</span>${waistSketch(s.id.toUpperCase(), s.y)}</label>`).join('')}</div>`;
  if (id === 'jazz') return `<div class="trait-choices">${[
    ['shorter', 'Shorter hem above the floor'], ['raised', 'Waist just beneath the bust'],
    ['panniers', 'Wide side hoops beneath the skirt'], ['dropped', 'Dropped waist at the hips'],
  ].map(([value, label]) => `<label><input type="checkbox" name="answer" value="${value}"><span>${label}</span></label>`).join('')}</div>`;
  return `<label class="answer-label" for="written-answer">${id === 'court' ? 'Name of the supports' : 'Designer’s surname'}</label><input class="answer-input" id="written-answer" name="answer" type="text" maxlength="60" spellcheck="false" placeholder="${id === 'court' ? 'Your answer…' : 'Read the reflection…'}">`;
}
function showLetter() {
  panel('A message within a message.', `<div class="letter-paper"><p>To our new archivist,</p><p>The collection has not been stolen. The house has folded it into its memories.</p><p>Four seals guard the first door: a rose, a column, a pearl, and a star. Look beneath silk, inside a sketch, within a plinth, and beyond a reflection. Each secret releases one digit.</p><p>But finding the digits is only half the work.</p><p class="signature">Éléonore V.<br><small>Keeper of the archive</small></p></div>
    ${state.folioFound ? `<div class="ordering-note"><p class="eyebrow">HIDDEN BENEATH THE WAX SEAL</p><blockquote>${orderingNote}</blockquote><p class="artifact-note">The note is saved in your journal. Each symbol is used once.</p></div>` : `<p class="body-copy">The wax seal is thicker than it should be. A second layer of paper catches the light.</p><button class="primary-button full-width" id="reveal-folio">Lift the wax-sealed flap ${icon('arrow')}</button>`}
    <p class="artifact-note">The house, letters, seals, and code are fictional. The fashion clues are based on historical sources.</p>`, 'THE SEALED INVITATION');
  document.querySelector('#reveal-folio')?.addEventListener('click', () => { state = { ...state, folioFound: true }; save(); chime(); showLetter(); toast('The hidden ordering note has been added to your journal.'); });
}
function showDoor() {
  panel('Four seals. One way out.', `<div class="lock-crest">${icon('lock')}<span>THE SALON ARCHIVE</span></div><p class="body-copy">Enter the four-digit code. Each solved riddle reveals one seal’s digit. The hidden invitation tells you their order.</p>
    <div class="seal-inventory">${sealRow()}</div>
    ${state.folioFound ? `<details class="door-note"><summary>Read the recovered ordering note</summary><blockquote>${orderingNote}</blockquote></details>` : '<p class="lock-warning">The ordering note is still hidden in the invitation.</p>'}
    <form id="door-form"><label class="answer-label" for="door-code">Four-digit door code</label><input id="door-code" class="code-input" name="code" inputmode="numeric" autocomplete="off" maxlength="4" pattern="[0-9]{4}" placeholder="— — — —" aria-describedby="code-status" value="${doorCode}">
      <div class="number-pad" aria-label="Code keypad">${['1','2','3','4','5','6','7','8','9','clear','0','back'].map(key => `<button type="button" data-code-key="${key}" aria-label="${key === 'back' ? 'Delete last digit' : key === 'clear' ? 'Clear code' : 'Digit ' + key}">${key === 'back' ? '⌫' : key === 'clear' ? 'C' : key}</button>`).join('')}</div>
      <p class="answer-feedback" id="code-status" role="status">Recovered ${state.solved.length} of 4 seals · ${state.folioFound ? 'ordering note found' : 'ordering note missing'}</p>
      <button class="primary-button full-width" type="submit">Unlock the salon ${icon('arrow')}</button>
    </form><button class="text-button" id="lock-journal">Consult the journal</button>`, 'THE FINAL CODE', 'code-panel');
  const input = $<HTMLInputElement>('#door-code');
  input.addEventListener('input', () => { input.value = input.value.replace(/[^0-9]/g, '').slice(0, 4); doorCode = input.value; });
  document.querySelectorAll<HTMLButtonElement>('[data-code-key]').forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.codeKey!;
    doorCode = key === 'clear' ? '' : key === 'back' ? doorCode.slice(0, -1) : (doorCode + key).slice(0, 4);
    input.value = doorCode;
  }));
  $('#door-form').addEventListener('submit', event => {
    event.preventDefault(); doorCode = input.value;
    if (state.solved.length !== 4 || !state.folioFound) { $('#code-status').textContent = 'The four seals and the invitation’s hidden note must be recovered first.'; return; }
    if (!/^[0-9]{4}$/.test(doorCode)) { $('#code-status').textContent = 'Enter exactly four digits.'; return; }
    const next = openDoor(state, doorCode);
    if (!next.completed) { $('#code-status').textContent = 'The lock stays silent. Your digits may be right, but their order matters. Read the hidden note again.'; return; }
    state = next; save(); chime(); showCompletion();
  });
  $('#lock-journal').addEventListener('click', showJournal);
}
function showCompletion() {
  panel('You followed<br>every hidden thread.', `<div class="completion-rule"><span>✧</span></div><p class="eyebrow">ROOM 01 COMPLETE · CODE ACCEPTED</p>
    <p class="body-copy">You uncovered four hidden clues, solved four French-fashion puzzles, and used the secret note to unlock the salon.</p>
    <div class="completion-summary"><span>${icon('check')} Four fashion riddles solved</span><span>${icon('check')} The four-digit lock is open</span></div>
    <div class="next-chapter"><span class="eyebrow">THE NEXT CHAPTER</span><h3>The House of Signatures</h3><p>The first door opens onto a deeper mystery.<br>Room 2 is planned for the next stage of development.</p></div>
    <button class="primary-button full-width" id="explore-again">Look around the unlocked salon ${icon('arrow')}</button><button class="text-button" id="replay-completion">Replay the riddles</button>`, 'THE FIRST DOOR IS OPEN', 'completion-panel');
  $('#explore-again').addEventListener('click', () => dialog.close()); $('#replay-completion').addEventListener('click', restart);
}
function showJournal() {
  panel('The archivist’s journal', `<p class="body-copy">Hidden evidence is recorded here as you find it. A seal reveals its digit only after you solve its riddle.</p>
    <div class="seal-inventory">${sealRow()}</div>
    ${state.discovered.length ? state.discovered.map(id => `<article class="journal-entry"><span class="eyebrow">${puzzles[id].seal.toUpperCase()} · ${state.solved.includes(id) ? 'SOLVED — DIGIT ' + sealDigits[id] : 'CLUE FOUND · RIDDLE UNSOLVED'}</span><h3>${puzzles[id].title}</h3><p>${puzzles[id].evidence}</p>${id === 'mirror' ? '<div class="journal-reflection">R O I D · 12 February 1947</div>' : ''}${state.solved.includes(id) ? `<p>${puzzles[id].explanation}</p>` : `<button class="text-button" data-revisit="${id}">Return to this riddle</button>`}<a class="source-link" href="${puzzles[id].source}" target="_blank" rel="noopener noreferrer">${puzzles[id].sourceTitle} ↗</a></article>`).join('') : '<div class="empty-journal"><p>Your first page is waiting.<br>Search the garments, mirror, and invitation.</p></div>'}
    ${state.folioFound ? `<div class="ordering-note"><p class="eyebrow">THE SECRET ORDER</p><blockquote>${orderingNote}</blockquote></div>` : '<p class="artifact-note">The invitation’s hidden note has not been found.</p>'}
    <button class="secondary-button full-width" id="journal-door">Go to the code lock</button>`, 'FIELD NOTES · ROOM 01');
  document.querySelectorAll<HTMLButtonElement>('[data-revisit]').forEach(b => b.addEventListener('click', () => inspect(b.dataset.revisit as PuzzleId)));
  $('#journal-door').addEventListener('click', () => inspect('door'));
}
function showObjects() {
  panel('Where will you search?', `<p class="body-copy">Each object has a detail worth investigating. Select one to move closer; then examine it for hidden evidence.</p><div class="object-list">${(Object.keys(labels) as ObjectId[]).map(id => `<button data-inspect="${id}"><span class="object-number">${labels[id][0]}</span><span>${labels[id][1]}<small>${id === 'door' ? (state.completed ? 'Unlocked' : 'Four-digit combination') : id === 'letter' ? (state.folioFound ? 'Hidden note recovered' : 'A message addressed to you') : state.solved.includes(id) ? 'Riddle solved · seal recovered' : state.discovered.includes(id) ? 'Clue found · riddle unsolved' : 'An object to investigate'}</small></span>${icon('arrow')}</button>`).join('')}</div>`, 'EXPLORE THE SALON');
  document.querySelectorAll<HTMLButtonElement>('[data-inspect]').forEach(b => b.addEventListener('click', () => inspect(b.dataset.inspect as ObjectId)));
}
function showHint() {
  const next = puzzleIds.find(id => !state.solved.includes(id));
  const hints = state.completed ? ['The code lock is open. You can revisit the clues or replay the room.'] :
    next ? puzzles[next].hints :
    !state.folioFound ? ['The sealed invitation has a second layer.', 'Inspect the letter on the small table, then lift its wax-sealed flap.'] :
    ['You have all four digits. The invitation describes the order of their symbols.', 'The pearl comes first, then the rose. The star stands immediately before the column.', 'Place the digits in this order: Pearl → Rose → Star → Column. Your journal holds the digits.'];
  panel('Follow the thread.', `<div class="large-symbol">${icon('hint')}</div><p class="body-copy">${hints[Math.min(hintLevel, hints.length - 1)]}</p>${hintLevel < hints.length - 1 ? '<button class="secondary-button full-width" id="more-hint">A clearer hint</button>' : ''}<p class="artifact-note">No penalty. No timer. Every answer can be discovered inside the room.</p>`, 'A LITTLE GUIDANCE');
  document.querySelector('#more-hint')?.addEventListener('click', () => { hintLevel++; showHint(); });
}
function showHelp() {
  panel('Look beneath the surface.', `<p class="body-copy">You are the archivist of Maison Nocturne. The house has hidden a collection inside its memories. Four fashion secrets guard a coded door.</p>
    <div class="help-list"><p><span>01</span><strong>Search</strong>Drag to look and use W A S D to walk. Click an object or choose it from Objects. Examine its details to uncover a hidden clue.</p><p><span>02</span><strong>Solve</strong>Use each clue to answer its fashion riddle. You will type an answer, compare sketches, select two matching features, and decipher a mirrored signature.</p><p><span>03</span><strong>Decode</strong>Each solved riddle reveals one symbol and digit. Find the invitation’s secret note, determine the order, and enter the four-digit code at the door.</p></div>
    <label class="setting"><span>Reduce ambient motion</span><input id="motion-setting" type="checkbox" ${reducedMotion ? 'checked' : ''}></label><p class="artifact-note">No time limit or jump scares. Wrong answers do not erase progress. Clues and solved seals save on this browser when storage is available. This new puzzle edition has its own save.</p>
    ${state.entered ? '<button class="secondary-button full-width" id="restart">Start Room 1 again</button>' : ''}`, 'A GUIDE TO THE HOUSE');
  $('#motion-setting').addEventListener('change', e => { reducedMotion = (e.target as HTMLInputElement).checked; scene?.setMotion(reducedMotion); document.body.classList.toggle('reduced-motion', reducedMotion); });
  document.querySelector('#restart')?.addEventListener('click', restart);
}
function restart() {
  state = { ...freshState(), entered: true }; doorCode = ''; hintLevel = 0;
  save(); dialog.close(); scene.resetView(); toast('The hidden clues await a new investigation.');
}
function initAudio() {
  if (audio) return;
  audio = new AudioContext(); gain = audio.createGain(); gain.gain.value = 0; gain.connect(audio.destination);
  for (const frequency of [130.81, 196, 261.63, 311.13]) {
    const oscillator = audio.createOscillator(); oscillator.type = 'sine'; oscillator.frequency.value = frequency;
    const voice = audio.createGain(); voice.gain.value = .12; oscillator.connect(voice); voice.connect(gain); oscillator.start();
  }
}
function chime() {
  if (!soundEnabled || !audio || !gain) return;
  [523.25, 659.25, 783.99].forEach((freq, index) => {
    const oscillator = audio!.createOscillator(), note = audio!.createGain(), start = audio!.currentTime + index * .13;
    oscillator.frequency.value = freq; note.gain.setValueAtTime(0, start); note.gain.linearRampToValueAtTime(.035, start + .03); note.gain.exponentialRampToValueAtTime(.0001, start + 1.4);
    oscillator.connect(note); note.connect(audio!.destination); oscillator.start(start); oscillator.stop(start + 1.5); oscillator.onended = () => { oscillator.disconnect(); note.disconnect(); };
  });
}
$('#sound').addEventListener('click', async () => {
  try {
    initAudio(); await audio!.resume(); soundEnabled = !soundEnabled; gain!.gain.setTargetAtTime(soundEnabled ? .1 : 0, audio!.currentTime, .5);
    $('#sound').innerHTML = icon(soundEnabled ? 'sound' : 'mute'); $('#sound').setAttribute('aria-pressed', String(soundEnabled)); $('#sound').setAttribute('aria-label', soundEnabled ? 'Turn ambient sound off' : 'Turn ambient sound on'); $('#sound').title = soundEnabled ? 'Turn ambient sound off' : 'Turn ambient sound on';
  } catch { toast('Audio is unavailable in this browser. You can still play the whole room.'); }
});
document.addEventListener('visibilitychange', () => {
  if (!audio) return; if (document.hidden) void audio.suspend(); else if (soundEnabled) void audio.resume();
});
$('#fullscreen').addEventListener('click', async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
  catch { toast('Fullscreen is unavailable here. You can keep playing in this window.'); }
});
$('#enter').addEventListener('click', () => {
  state.entered = true; save(); scene.enter(); toast('Welcome, archivist. Click the glowing markers to begin.');
});
$('.brand').addEventListener('click', e => { e.preventDefault(); if (state.entered) showHelp(); });
$('#journal').addEventListener('click', showJournal); $('#objects').addEventListener('click', showObjects);
$('#hint').addEventListener('click', () => { hintLevel = 0; showHint(); });
$('#help').addEventListener('click', showHelp); $('#reset-view').addEventListener('click', () => scene.resetView());
$('#chapter-map').addEventListener('click', () => {
  panel('Four rooms. One collection.', `<p class="body-copy">The house opens one memory at a time.</p><div class="chapter-list"><article><span>01 · PLAYABLE DEMO</span><h3>The Salon of Silhouettes</h3><p>Uncover hidden clues, solve fashion riddles, and crack a four-digit lock.</p></article><article><span>02 · PLANNED</span><h3>The House of Signatures</h3><p>Connect fashion houses with their influential designers.</p></article><article><span>03 · PLANNED</span><h3>The 1947 Atelier</h3><p>Investigate Christian Dior’s landmark collection.</p></article><article><span>04 · PLANNED</span><h3>The Final Runway</h3><p>Trace Paris Fashion Week and recover the missing collection.</p></article></div>`, 'YOUR JOURNEY');
});
document.querySelectorAll<HTMLButtonElement>('[data-move]').forEach(b => {
  b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture(e.pointerId); scene.setMove(b.dataset.move!, true); });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(event, () => scene.setMove(b.dataset.move!, false));
});
document.body.classList.toggle('reduced-motion', reducedMotion);
try {
  scene = createSalon($('#scene'), points => {
    for (const p of points) {
      const element = hotspotElements.get(p.id)!;
      element.style.transform = `translate3d(${p.x}px,${p.y}px,0) translate(-50%,-50%)`;
      element.style.display = p.visible && !dialog.open ? '' : 'none';
    }
  }, inspect);
  scene.setProgress(state.solved.includes('mirror'), state.completed, state.discovered);
  if (state.entered) scene.enter(true);
  updateUI(); $('#loading').classList.add('loaded');
  window.setTimeout(() => $('#loading').remove(), 800);
} catch (error) {
  $('#loading').innerHTML = `<span class="loading-mark">MN</span><h2>The salon needs WebGL 2.</h2><p>Please open this experience in a current Chrome, Edge, Firefox, or Safari browser with hardware acceleration enabled.</p><button class="primary-button" id="reload">Try again ${icon('reset')}</button>`;
  $('#reload').addEventListener('click', () => location.reload()); console.error('Could not initialise the 3D salon:', error);
}
