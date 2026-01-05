import { type Unit } from 'tone';
import { arrayRand, sfc32 } from '../utils';

// We define "Importance" for notes.
// 0 (Root) is king. 7 (Fifth) is queen. 
// These values allow us to sort the scale musically.
const getNoteImportance = (note: number): number => {
  const n = note % 12; // Normalize to one octave
  if (n === 0) return 100; // Root
  if (n === 7) return 80;  // Fifth
  if (n === 5) return 60;  // Fourth
  if (n === 4 || n === 3) return 50; // Thirds (Major/Minor)
  return 10; // Color tones (2nd, 6th, 7th, etc)
};

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

  // --- 1. MUSICAL SPREAD LOGIC ---
  // Instead of a pure random shuffle, we create a "Weighted Shuffle".
  // We want high-importance notes (Root, 5th) to be likely to survive
  // even when Spread is low.
  
  // First, we attach a random value to each note, but we boost it by importance.
  // This means Root/5th are *more likely* to end up at the start of the array,
  // but it's still slightly random.
  const weightedScale = scale.map((noteIndex) => {
     // We need to know what the actual note interval is to weight it.
     // Since 'scale' here is just indices [0,1,2...], we assume a standard mapping logic 
     // or simply treat index 0 as Root for generic scales.
     // Ideally, we'd look up the real semitone value from the SCALES definition, 
     // but since we only have indices here, we prioritize index 0 (Root) and 4 (Fifth-ish in 7-note scales).
     
     // Simple Heuristic for indices: 0 is usually Root.
     let weight = Math.random(); 
     if (noteIndex === 0) weight += 999; // Always keep Root first
     if (noteIndex === 4) weight += 0.5; // Often the 5th in a 7-note scale
     
     return { index: noteIndex, weight };
  });

  // Sort by our weighted random value
  weightedScale.sort((a, b) => b.weight - a.weight);
  
  const sortedScale = weightedScale.map(i => i.index);

  // Apply Spread "Gate"
  const spreadCount = Math.max(1, Math.round(scale.length * (spread / 100)));
  const selectedNotes = sortedScale.slice(0, spreadCount);

  // --- 2. DENSITY MASK (RHYTHM) ---
  const barSteps = Array(BAR_LEN).fill(0).map((_, i) => i);
  // We weight the rhythm too! Downbeats (0, 4, 8, 12) get higher priority
  const weightedBarSteps = barSteps.map(step => {
      let weight = rng();
      if (step % 4 === 0) weight += 0.5; // Boost downbeats
      if (step === 0) weight += 0.5;     // Huge boost for the "One"
      return { step, weight };
  });
  
  weightedBarSteps.sort((a, b) => b.weight - a.weight);
  const barActivationOrder = weightedBarSteps.map(x => x.step);

  // --- 3. GENERATE STEP CONTENT ---
  const allSteps = Array(MAX_LEN).fill(0).map((_, i) => i);

  const stepData = allSteps.map((i) => {
    // Determine if this is a "strong" rhythmic step (Downbeat)
    const isDownbeat = i % 4 === 0;
    
    // Select a note from our pool
    let noteIndex = 0;
    
    if (isDownbeat && rng() > 0.3) {
       // 70% chance on downbeats to pick the most stable note available (index 0 of our sorted list)
       // Because we sorted `selectedNotes` by importance, selectedNotes[0] is likely the Root.
       noteIndex = 0; 
    } else {
       // Otherwise pick randomly from the available pool
       noteIndex = randomInt(0, selectedNotes.length - 1, rng);
    }

    return {
      noteIndex: noteIndex,
      octave: randomInt(-1, 1, rng) as Octave,
      accentProb: rng(),
      slideProb: rng(),
    };
  });

  // --- 4. APPLY MASKS ---
  const numStepsToGeneratePerBar = Math.round(BAR_LEN * (density / 100));
  const activeBarStepsSet = new Set(
    barActivationOrder.slice(0, numStepsToGeneratePerBar),
  );

  return allSteps.map((i) => {
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
