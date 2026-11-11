import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, discoverClue, solveRiddle, answerIsCorrect, openDoor, restoreState, lockOrder, sealDigits, type PuzzleId } from './game.ts';

const answers: Record<PuzzleId, string | string[]> = { court: 'panniers', empire: 'a', jazz: ['shorter', 'dropped'], mirror: 'Dior' };
const code = lockOrder.map(id => sealDigits[id]).join('');

test('Every riddle requires its hidden clue, then a correct answer', () => {
  let state = freshState();
  for (const id of ['court', 'empire', 'jazz', 'mirror'] as PuzzleId[]) {
    assert.equal(solveRiddle(state, id, answers[id]).solved.includes(id), false);
    state = discoverClue(state, id);
    state = discoverClue(state, id);
    assert.equal(state.discovered.filter(x => x === id).length, 1);
    assert.equal(solveRiddle(state, id, 'wrong answer').solved.includes(id), false);
    state = solveRiddle(state, id, answers[id]);
    state = solveRiddle(state, id, answers[id]);
    assert.equal(state.solved.filter(x => x === id).length, 1);
  }
  assert.equal(openDoor(state, code).completed, false, 'The secret ordering note is also required');
  state = { ...state, folioFound: true };
  assert.equal(openDoor(state, '4127').completed, false, 'Discovery order is not lock order');
  assert.equal(openDoor(state, code).completed, true);
});

test('Text riddles accept harmless casing and accents, without partial matches', () => {
  assert.equal(answerIsCorrect('court', '  LES PANNIERS! '), true);
  assert.equal(answerIsCorrect('court', 'side hoops'), true);
  assert.equal(answerIsCorrect('court', 'corset'), false);
  assert.equal(answerIsCorrect('mirror', 'Christian Dior'), true);
  assert.equal(answerIsCorrect('mirror', 'DIOR'), true);
  assert.equal(answerIsCorrect('mirror', 'Christian'), false);
  assert.equal(answerIsCorrect('mirror', 'Chanel'), false);
});

test('The deduction puzzle requires exactly two distinct correct traits', () => {
  assert.equal(answerIsCorrect('jazz', ['dropped', 'shorter']), true);
  assert.equal(answerIsCorrect('jazz', ['dropped']), false);
  assert.equal(answerIsCorrect('jazz', ['dropped', 'shorter', 'raised']), false);
  assert.equal(answerIsCorrect('jazz', ['dropped', 'dropped']), false);
  assert.equal(answerIsCorrect('jazz', ['shorter', 'panniers']), false);
});

test('No code opens the door without all four puzzles and the hidden note', () => {
  assert.equal(openDoor(freshState(), code).completed, false);
  let state = { ...freshState(), folioFound: true };
  for (const id of ['court', 'empire', 'jazz'] as PuzzleId[]) {
    state = solveRiddle(discoverClue(state, id), id, answers[id]);
  }
  assert.equal(openDoor(state, code).completed, false);
  state = solveRiddle(discoverClue(state, 'mirror'), 'mirror', 'dior');
  for (const bad of ['', '247', '24711', ' 2471', '２４７１', '0000']) assert.equal(openDoor(state, bad).completed, false);
  assert.equal(openDoor(state, code).completed, true);
});

test('Reload preserves partial discovery, solved seals, and completion', () => {
  let state = { ...freshState(), entered: true, folioFound: true };
  state = discoverClue(state, 'empire');
  state = solveRiddle(discoverClue(state, 'court'), 'court', 'pannier');
  assert.deepEqual(restoreState(JSON.stringify(state)), state);
  for (const id of ['empire', 'jazz', 'mirror'] as PuzzleId[]) state = solveRiddle(discoverClue(state, id), id, answers[id]);
  state = openDoor(state, code);
  assert.deepEqual(restoreState(JSON.stringify(state)), state);
});

test('Old, corrupt, duplicate and inconsistent saves are safely normalised', () => {
  for (const raw of ['not-json', 'null', '42', '[]', '{}']) assert.deepEqual(restoreState(raw), freshState());
  assert.deepEqual(restoreState(null), freshState());
  const state = restoreState('{"discovered":["court","court","unknown"],"solved":["court","mirror","court"],"completed":true}');
  assert.deepEqual(state.discovered, ['court']);
  assert.deepEqual(state.solved, ['court']);
  assert.equal(state.completed, false);
  assert.equal(restoreState('{"memories":["court","empire","jazz"],"hasKey":true,"completed":true}').completed, false);
});
