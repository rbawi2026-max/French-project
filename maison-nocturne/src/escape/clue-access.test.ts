import test from 'node:test';
import assert from 'node:assert/strict';
import { clues, puzzles, type RoomId } from './content.ts';
import { advance, discover, fresh, restore, submit, type State } from './state.ts';

/** Reach a room only through the same evidence-and-answer prerequisites as play. */
function enterRoom(room: RoomId): State {
  let state = fresh();
  for (let i = 0; i < room; i++) {
    for (const clue of clues.filter(c => c.room === state.room)) state = discover(state, clue.id);
    const solved = submit(state, puzzles[state.room].answers[0]);
    assert.equal(solved.status, 'correct');
    state = advance(solved.state);
  }
  assert.equal(state.room, room);
  return state;
}

test('Every clue is required: each missing local clue keeps its room locked', () => {
  for (const puzzle of puzzles) {
    const localClues = clues.filter(c => c.room === puzzle.room);
    assert.equal(localClues.length, 3, `Room ${puzzle.room + 1} needs three discoverable clues`);
    for (const omitted of localClues) {
      let state = enterRoom(puzzle.room);
      for (const clue of localClues.filter(c => c.id !== omitted.id)) state = discover(state, clue.id);
      const result = submit(state, puzzle.answers[0]);
      assert.equal(result.status, 'missing', `Missing ${omitted.id} must not be silently counted`);
      assert.strictEqual(result.state, state, 'A blocked answer must not mutate the journal');
      assert.strictEqual(advance(result.state), state, 'A blocked answer must not unlock the next room');
    }
  }
});

test('Each completed discovery survives reload exactly once and remains readable', () => {
  for (const puzzle of puzzles) {
    let state = enterRoom(puzzle.room);
    const localClues = clues.filter(c => c.room === puzzle.room);
    for (const clue of localClues) {
      state = discover(state, clue.id);
      state = discover(state, clue.id); // Reopening a moving object must not duplicate evidence.
      state = restore(JSON.stringify(state));
      assert.equal(state.discovered.filter(id => id === clue.id).length, 1);
      assert.ok(clue.title.trim() && clue.text.trim(), `${clue.id} needs a readable confirmation and evidence`);
      assert.ok(state.discovered.every(id => clues.some(c => c.id === id)), 'Journal entries always resolve to content');
    }
    assert.equal(submit(state, puzzle.answers[0]).status, 'correct');
  }
});

test('Collecting the same object repeatedly never substitutes for another clue', () => {
  let state = fresh();
  for (let i = 0; i < 20; i++) state = discover(state, 'inventory');
  assert.deepEqual(state.discovered, ['inventory']);
  assert.equal(submit(state, puzzles[0].answers[0]).status, 'missing');
});

test('Visiting guidance or cancelling before discovery cannot itself unlock a room', () => {
  const state = fresh();
  const before = JSON.stringify(state);
  // Looking up an object/location, as the guidance UI does, is read-only.
  const destination = clues.find(c => c.id === 'inventory')!;
  assert.ok(destination.position.every(Number.isFinite));
  assert.equal(JSON.stringify(state), before);
  assert.deepEqual(state.discovered, []);
  assert.strictEqual(advance(state), state);
});

test('Every configured clue has a unique reachable-content identifier and a physical action', () => {
  const ids = new Set<string>();
  for (const clue of clues) {
    assert.equal(ids.has(clue.id), false, `Duplicate clue: ${clue.id}`);
    ids.add(clue.id);
    assert.ok(clue.action.trim(), `${clue.id} has no inspect action`);
    assert.ok(clue.location.trim(), `${clue.id} has no plain-language location`);
    assert.equal(clue.position.length, 3);
    assert.ok(clue.position.every(Number.isFinite));
    assert.ok(puzzles[clue.room].required.includes(clue.id), `${clue.id} must contribute to its room's reasoning`);
  }
});
