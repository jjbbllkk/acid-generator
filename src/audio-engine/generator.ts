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
const BAR_LEN = 16;

const generate = ({
  density,
  spread,
  accentsDensity,
  slidesDensity,
  seed = Date.now(),
}: GeneratorParams): SequenceStep[] => {
  const rng = sfc32(seed, seed, seed, seed);

  // 1. Determine Scale Subset (Spread)
  // We shuffle the full scale first so the RNG consumption is constant regardless of spread value
  const shuffledScale = arrayRand(scale, scale.length, rng);

  // Map 0-100% to 1-7 notes (ensure at least 1 note is available)
  const spreadCount = Math.max(1, Math.round(scale.length * (spread / 100)));
  const selectedNotes = shuffledScale.slice(0, spreadCount);

  // 2. Determine Bar Step Activation Order (Density Structure)
  // We generate a random priority order for a SINGLE bar (16 steps).
  // This mask will be repeated 4 times to fill the 64 steps.
  const barSteps = Array(BAR_LEN)
    .fill(0)
    .map((_, i) => i);
  const barActivationOrder = arrayRand(barSteps, BAR_LEN, rng);

  // 3. Generate content for ALL steps (pitch, octave, accent/slide potential)
  // We generate properties for every single step (0 to 63) sequentially.
  // This ensures that Step X always gets the same Note/Octave/Probabilities.
  const allSteps = Array(MAX_LEN)
    .fill(0)
    .map((_, i) => i);

  const stepData = allSteps.map(() => {
    return {
      noteIndex: randomInt(0, selectedNotes.length - 1, rng),
      octave: randomInt(-1, 1, rng) as Octave,
      accentProb: rng(),
      slideProb: rng(),
    };
  });

  // 4. Filter Active Steps based on Density
  // Map density 0-100 to 0-16 steps (per bar)
  const numStepsToGeneratePerBar = Math.round(BAR_LEN * (density / 100));

  // Create a set of active indices for the BAR (0-15) for O(1) lookup
  const activeBarStepsSet = new Set(
    barActivationOrder.slice(0, numStepsToGeneratePerBar),
  );

  // 5. Build the pattern
  return allSteps.map((i) => {
    // Check if this step's position within its bar (modulo 16) is active
    if (!activeBarStepsSet.has(i % BAR_LEN)) {
      return {
        note: null,
        octave: null,
        accent: null,
        slide: null,
      } as SequenceStep<null>;
    }

    const data = stepData[i];

    return {
      note: selectedNotes[data.noteIndex],
      octave: data.octave,
      accent: data.accentProb < accentsDensity / 100,
      slide: data.slideProb < slidesDensity / 100,
    } as SequenceStep<Unit.Note>;
  });
};

export { generate };
