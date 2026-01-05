import { type Unit } from 'tone';
import { arrayRand, sfc32 } from '../utils';

const scale = Array(7)
  .fill(0)
  .map((_v, i) => i);

type Octave = -1 | 0 | 1;

export interface SequenceStep<T extends Unit.Note | null = Unit.Note | null> {
  note: T extends null ? T : number;
  octave: T extends null ? T : Octave;
  accent: T extends null ? T : boolean;
  slide: T extends null ? T : boolean;
}

interface GeneratorParams {
  patternLength: number;
  density: number;
  spread: number;
  accentsDensity: number;
  slidesDensity: number;
  seed?: number;
}

const randomInt = (min: number, max: number, rng: () => number) => {
  return Math.floor(rng() * (max - min + 1)) + min;
};

// We always generate 64 steps so the pattern is stable regardless of loop length
const MAX_LEN = 64;

const generate = ({
  density,
  spread,
  accentsDensity,
  slidesDensity,
  seed = Date.now(),
}: GeneratorParams): SequenceStep[] => {
  const rng = sfc32(seed, seed, seed, seed);

  // We generate elements for the full MAX_LEN (64)
  const elements = Array(MAX_LEN)
    .fill(0)
    .map((_v, i) => i);

  // Density is calculated against the full 64 steps
  const seqDensity = Math.round(MAX_LEN * (density / 100));
  
  const notesToGenerate = randomInt(Math.round(seqDensity / 2), seqDensity, rng);

  const selectedSteps = arrayRand(elements, notesToGenerate, rng);

  const accents = arrayRand(
    selectedSteps,
    randomInt(1, Math.round((notesToGenerate / 2) * (accentsDensity / 100)), rng),
    rng
  );
  const slides = arrayRand(
    selectedSteps,
    randomInt(0, Math.round((notesToGenerate / 2) * (slidesDensity / 100)), rng),
    rng
  );
  const randNotes = arrayRand(selectedSteps, randomInt(0, notesToGenerate, rng), rng);

  const notesSpread = randomInt(0, Math.round((scale.length - 1) * (spread / 100)), rng);
  const selectedNotes = arrayRand(scale, notesSpread, rng);

  const out = elements.map((v) => {
    if (!selectedSteps.includes(v) || selectedSteps.length === 0) {
      return {
        note: null,
        octave: null,
        accent: null,
        slide: null,
      } as SequenceStep<null>;
    }
    const octave = randomInt(-1, 1, rng) as Octave;
    const note =
      randNotes.includes(v) && selectedNotes.length > 0
        ? selectedNotes[randomInt(0, selectedNotes.length - 1, rng)]
        : 0;
    return {
      note,
      octave,
      accent: accents.includes(v),
      slide: slides.includes(v),
    } as SequenceStep<Unit.Note>;
  });

  return out;
};

export { generate };
