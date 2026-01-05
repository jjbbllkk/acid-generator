import { type SCALE, SCALES } from './audio-engine/scales';
import { type SequencerOutput } from './types';

// ... (keep sfc32, arrayRand, mapRange as they are)

type NullOrNumber<T> = T extends number ? number : null;

export const getNoteInScale = <T extends number | null>(
  note: T,
  scaleName: SCALE,
  root = 0,
  octave = 0,
): NullOrNumber<T> => {
  if (note === null) {
    return null as NullOrNumber<T>;
  }

  const scale = SCALES[scaleName];
  const len = scale.length;

  // Wrap the index to fit the scale length
  const wrappedIndex = note % len;
  
  // Calculate extra octaves if the index exceeded the scale length
  const octaveOffset = Math.floor(note / len);

  // Formula: Note in Scale + Root + (User Octave * 12) + (Wrapped Octave * 12)
  const finalNote = scale[wrappedIndex] + root + 12 * (octave + octaveOffset);

  return finalNote as NullOrNumber<T>;
};

// ... (keep getOutput as is)
