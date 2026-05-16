import { useMemo } from 'react';
import { calculateSM2 } from '../utils/sm2';
import { SyncManager } from '../lib/syncManager';

export interface FlashcardData {
  id?: string;
  front: string;
  back: string;
  interval?: number;
  easeFactor?: number;
  repetitions?: number;
  nextReviewDate?: string; // ISO string
}

export function useSpacedRepetition(
  flashcards: FlashcardData[],
  setFlashcards: React.Dispatch<React.SetStateAction<FlashcardData[]>>
) {
  const dueCards = useMemo(() => {
    const now = new Date();
    return flashcards.filter((card) => {
      if (!card.nextReviewDate) return true;
      const reviewDate = new Date(card.nextReviewDate);
      return reviewDate <= now;
    });
  }, [flashcards]);

  const processReview = async (cardId: string, qualityRating: number) => {
    const cardIndex = flashcards.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) return;

    const card = flashcards[cardIndex];
    
    // Default SM2 stats for a new card
    const currentInterval = card.interval ?? 0;
    const currentEase = card.easeFactor ?? 2.5;
    const currentReps = card.repetitions ?? 0;

    const updatedStats = calculateSM2(
      qualityRating,
      currentInterval,
      currentEase,
      currentReps
    );

    const updatedCard: FlashcardData = {
      ...card,
      ...updatedStats,
    };

    // 1. Update the local flashcards state immediately
    setFlashcards((prev) => {
      const newCards = [...prev];
      const idx = newCards.findIndex((c) => c.id === cardId);
      if (idx !== -1) {
        newCards[idx] = updatedCard;
      }
      return newCards;
    });

    // 2. Persist to SyncManager
    await SyncManager.saveRecord('flashcards', updatedCard, updatedCard.id);
  };

  return {
    dueCards,
    processReview,
  };
}
