export type GarmentId = 'court' | 'empire' | 'jazz';
export type PuzzleId = GarmentId | 'mirror';
export type ObjectId = PuzzleId | 'door' | 'letter';
export interface GameState {
  entered: boolean;
  discovered: PuzzleId[];
  solved: PuzzleId[];
  folioFound: boolean;
  completed: boolean;
}
export const garments: Record<GarmentId, {
  title: string; french: string; period: string; year: string;
  description: string; observation: string; memory: string;
  source: string; sourceTitle: string; color: string;
}> = {
  court: {
    title: 'The court silhouette', french: 'La robe à la française',
    period: '18th century', year: 'c. 1770',
    description: 'At the French court, fashion occupied space. Panniers supported a wide skirt at the sides, while a fitted bodice and flowing back pleats shaped the robe à la française.',
    observation: 'Look at the broad hips, narrow waist, and long, sweeping skirt.',
    memory: '“I belonged to the court. My silk filled a doorway before I did.”',
    source: 'https://www.metmuseum.org/art/collection/search/82640',
    sourceTitle: 'The Met · Robe à la française', color: '#bcb1c7',
  },
  empire: {
    title: 'The Empire silhouette', french: 'La ligne Empire',
    period: 'Early 19th century', year: 'c. 1805',
    description: 'Around 1800, a high waist just beneath the bust and a slender, flowing skirt became fashionable. Inspired by classical antiquity, this silhouette departed from the wide, structured court dress.',
    observation: 'The waist has risen. The skirt falls in a light, almost column-like line.',
    memory: '“After the court, I reached toward antiquity. My waist rose, and my silhouette softened.”',
    source: 'https://thefidmmuseum.org/learn/articles/empire-era-silhouette',
    sourceTitle: 'ASU FIDM Museum · The Empire Era Silhouette', color: '#e5d6b3',
  },
  jazz: {
    title: 'The modern silhouette', french: 'Les années folles',
    period: '1920s', year: 'c. 1925',
    description: 'A fashionable 1920s evening silhouette had a straighter, looser shape, a dropped waist, and a shorter hem. Beads and decorative details could catch the light as the wearer moved.',
    observation: 'Notice the low waistline, geometric beading, and shorter skirt.',
    memory: '“I came last, with the rhythm of a new age. My waist dropped and my hem rose.”',
    source: 'https://www.metmuseum.org/art/collection/search/156032',
    sourceTitle: 'The Met · French evening dress, 1920s', color: '#b99e72',
  },
};
export const puzzleIds: PuzzleId[] = ['court', 'empire', 'jazz', 'mirror'];
export const sealDigits: Record<PuzzleId, string> = { court: '4', empire: '1', jazz: '2', mirror: '7' };
export const lockOrder: PuzzleId[] = ['jazz', 'court', 'mirror', 'empire'];
export const freshState = (): GameState => ({
  entered: false, discovered: [], solved: [], folioFound: false, completed: false,
});
export function discoverClue(state: GameState, id: PuzzleId): GameState {
  return { ...state, discovered: [...new Set([...state.discovered, id])] };
}
const normalise = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
export function answerIsCorrect(id: PuzzleId, answer: string | string[]): boolean {
  if (id === 'jazz') return Array.isArray(answer) && answer.length === 2 && answer.includes('dropped') && answer.includes('shorter');
  if (typeof answer !== 'string') return false;
  const value = normalise(answer);
  if (id === 'court') return ['panniers', 'pannier', 'lespanniers', 'sidehoops', 'sidehoop'].includes(value);
  if (id === 'empire') return value === 'a';
  return ['dior', 'christiandior'].includes(value);
}
export function solveRiddle(state: GameState, id: PuzzleId, answer: string | string[]): GameState {
  if (!state.discovered.includes(id) || !answerIsCorrect(id, answer)) return state;
  return { ...state, solved: [...new Set([...state.solved, id])] };
}
export function openDoor(state: GameState, code: string): GameState {
  return puzzleIds.every(id => state.solved.includes(id)) && state.folioFound && code === lockOrder.map(id => sealDigits[id]).join('')
    ? { ...state, completed: true } : state;
}
export function restoreState(raw: string | null): GameState {
  try {
    const data = JSON.parse(raw || '{}');
    const validIds = (list: unknown): PuzzleId[] => [...new Set<PuzzleId>((Array.isArray(list) ? list : []).filter((id: unknown) => puzzleIds.includes(id as PuzzleId)))];
    const discovered = validIds(data.discovered);
    const solved = validIds(data.solved).filter(id => discovered.includes(id));
    const folioFound = data.folioFound === true;
    return { entered: data.entered === true, discovered, solved, folioFound, completed: data.completed === true && solved.length === 4 && folioFound };
  } catch { return freshState(); }
}
