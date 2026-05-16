export interface SM2Result {
  interval: number;
  easeFactor: number;
  repetitions: number;
  nextReviewDate: string;
}

/**
 * Calculates spaced repetition intervals using a modified SM-2 algorithm.
 * @param quality Integer 0-5 (0=Again, 3=Hard, 4=Good, 5=Easy)
 * @param interval Current interval in days
 * @param easeFactor Current ease factor (float)
 * @param repetitions Current number of consecutive correct repetitions
 * @returns SM2Result containing updated interval, ease factor, repetitions, and next review date
 */
export function calculateSM2(
  quality: number,
  interval: number,
  easeFactor: number,
  repetitions: number
): SM2Result {
  let nextInterval: number;
  let nextRepetitions: number;
  let nextEaseFactor: number;

  if (quality < 3) {
    // Failed/Again
    nextRepetitions = 0;
    nextInterval = 1;
    nextEaseFactor = easeFactor;
  } else {
    // Passed (Hard, Good, Easy)
    nextRepetitions = repetitions + 1;

    // Calculate new ease factor
    nextEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (nextEaseFactor < 1.3) {
      nextEaseFactor = 1.3;
    }

    // Calculate new interval
    if (nextRepetitions === 1) { // Was 0 before this review
      nextInterval = 1;
    } else if (nextRepetitions === 2) { // Was 1 before this review
      nextInterval = 6;
    } else {
      nextInterval = Math.round(interval * nextEaseFactor);
    }
  }

  // Calculate next review date
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + nextInterval);

  return {
    interval: nextInterval,
    easeFactor: nextEaseFactor,
    repetitions: nextRepetitions,
    nextReviewDate: nextDate.toISOString(),
  };
}
