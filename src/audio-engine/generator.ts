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
  seed?: number; // We added a seed here
}

// A helper to get a random integer between min and max using our custom RNG
const randomInt = (min: number, max: number, rng: () => number) => {
  return Math.floor(rng() * (max - min + 1)) + min;
};

const generate = ({
  patternLength,
  density,
  spread,
  accentsDensity,
  slidesDensity,
  seed = Date.now(), // Default to current time if no seed is provided
}: GeneratorParams): SequenceStep[] => {
  // Create our predictable random number generator using the seed
  const rng = sfc32(seed, seed, seed, seed);

  const elements = Array(patternLength)
    .fill(0)
    .map((_v, i) => i);

  const seqDensity = Math.round(patternLength * (density / 100));
  
  // Use our 'rng' instead of generic random
  const notesToGenerate = randomInt(Math.round(seqDensity / 2), seqDensity, rng);

  // Pass 'rng' to arrayRand so the shuffling is predictable
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
