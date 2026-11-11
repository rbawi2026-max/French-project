import type { PuzzleId } from './game';

export const puzzles: Record<PuzzleId, {
  title: string; seal: string; symbol: string; search: string; action: string;
  evidenceTitle: string; evidence: string; question: string; riddle: string;
  explanation: string; hints: string[]; source: string; sourceTitle: string;
}> = {
  court: {
    title: 'The secret beneath the silk', seal: 'Rose', symbol: '✿',
    search: 'One section of the hem hangs lower than the rest. A rose is embroidered beside a loose stitch.',
    action: 'Lift the silk hem',
    evidenceTitle: 'A dressmaker’s label, sewn inside',
    evidence: 'PANNIERS — supports worn at the sides of the hips. CORSET — a structured garment shaping the torso. BUSTLE — support adding fullness at the back of a skirt.',
    riddle: 'I give a gown its breadth, yet I am not its wearer. I live at the hips, hidden beneath silk. At court I make a doorway feel too narrow. What am I?',
    question: 'Name the hidden supports described by the riddle.',
    explanation: 'Panniers widened the skirt at the sides. The corset shaped the torso; a bustle concentrated fullness at the back. The position of the support is the decisive clue.',
    hints: ['Look for the loose stitch at the court gown’s hem.', 'The riddle says sides of the hips. Compare the three definitions on the hidden label.', 'The answer is PANNIERS. The rose seal will release its digit.'],
    source: 'https://www.metmuseum.org/art/collection/search/82640', sourceTitle: 'The Met · Robe à la française',
  },
  empire: {
    title: 'The misplaced waistline', seal: 'Column', symbol: 'Ⅱ',
    search: 'A folded paper slips out from beneath the ivory dress’s display plaque. Three sketches are faintly visible through the paper.',
    action: 'Unfold the hidden sketch',
    evidenceTitle: 'A note in the margin · Paris, c. 1805',
    evidence: '“Inspired by the drapery of antiquity: place the waist just beneath the bust. Let the skirt fall in a slender line. Do not place the seam at the natural waist or the hips.”',
    riddle: 'I rise toward the heart while the skirt falls like a column. I leave the court’s broad hoops behind. Which sketch remembers my shape?',
    question: 'Choose the sketch with the correct waist position for the Empire silhouette.',
    explanation: 'Sketch A has a waist just beneath the bust. This raised waist and the slender skirt identify the Empire silhouette. A natural or dropped waist does not fit the note.',
    hints: ['The ivory dress conceals a folded sketch beneath its plaque.', 'Ignore the order of the sketches. Find the seam closest to the bust.', 'Select sketch A, with the raised waist.'],
    source: 'https://thefidmmuseum.org/learn/articles/empire-era-silhouette', sourceTitle: 'ASU FIDM Museum · The Empire Era Silhouette',
  },
  jazz: {
    title: 'Two truths after midnight', seal: 'Pearl', symbol: '◉',
    search: 'The modern dress’s plinth has a small brass drawer. A pearl-shaped handle has been polished by many hands.',
    action: 'Slide open the plinth drawer',
    evidenceTitle: 'A dance-card fragment · Paris, c. 1925',
    evidence: '“The seam has slipped to the hips. The hem has risen from the floor. The line is straighter; the dress moves as I dance.” Two details describe this evening silhouette. Two belong elsewhere.',
    riddle: 'My waist travels down while my hem travels up. I glitter in motion and refuse the court’s broad frame. Choose the two details that belong to my age.',
    question: 'Select exactly TWO features supported by the hidden dance card.',
    explanation: 'A dropped waist and shorter hem describe the fashionable 1920s silhouette in the clue. Wide side hoops belong to the court gown; a waist beneath the bust belongs to the Empire dress.',
    hints: ['Inspect the modern dress’s pedestal, not its necklace.', 'The dance card gives two directions: the waist goes down and the hem goes up.', 'Choose “Dropped waist at the hips” and “Shorter hem above the floor”.'],
    source: 'https://www.metmuseum.org/art/collection/search/156032', sourceTitle: 'The Met · French evening dress, 1920s',
  },
  mirror: {
    title: 'The signature in the glass', seal: 'Star', symbol: '✧',
    search: 'Four letters are trapped beneath a film of silver mist. An old date is etched into the frame: 12 February 1947.',
    action: 'Polish the clouded glass',
    evidenceTitle: 'A signature written in reverse',
    evidence: 'Read the letters from right to left. Beside them, a tiny caption reads: “The first collection. The Bar suit. A New Look for Paris.”',
    riddle: 'I am a name the glass has turned around. In 1947 my first collection gave fashion a New Look. Read my reflection, and name the designer.',
    question: 'Whose surname is hidden in the mirror?',
    explanation: 'R O I D read from right to left spells DIOR. Christian Dior presented his first collection on 12 February 1947; its New Look and the Bar suit became defining references.',
    hints: ['The mirror’s mist conceals a signature. Polish the glass.', 'Read the four letters from the right-hand side toward the left.', 'R O I D becomes DIOR. “Christian Dior” is also accepted.'],
    source: 'https://www.galeriedior.com/en/galleries/premier-defile-christian-dior-printemps-ete-1947', sourceTitle: 'La Galerie Dior · The New Look',
  },
};
export const orderingNote = 'Begin with the pearl that danced. Let the rose of the court follow. The star must come immediately before the column. Read the four seals from left to right.';
