interface GenerationParams {
  quantity: number;
  difficulty: string;
  topic: string;
  focusAreas: string[];
}

export interface GeneratedFlashcard {
  front: string;
  back: string;
  topic: string;
  guidelineCitation: string;
}

async function fetchGemini(params: GenerationParams, modelId: string): Promise<GeneratedFlashcard[]> {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...params, modelId })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to generate via ${modelId}`);
  }
  
  return response.json();
}

export async function generateFlashcards(params: GenerationParams): Promise<{ cards: GeneratedFlashcard[], modelName: string }> {
  const models = [
    { name: 'Gemini 3 Flash Preview', id: 'gemini-3-flash-preview' },
    { name: 'Gemini 3.1 Flash Lite', id: 'gemini-3.1-flash-lite' },
    { name: 'Gemini Flash Latest', id: 'gemini-flash-latest' },
    { name: 'Gemini 3.1 Pro Preview', id: 'gemini-3.1-pro-preview' },
    { name: 'Gemini 2.5 Flash', id: 'gemini-2.5-flash' }
  ];

  for (const model of models) {
    try {
      console.log(`Attempting generation with ${model.name}...`);
      const cards = await fetchGemini(params, model.id);
      return { cards, modelName: model.name };
    } catch (error) {
      console.warn(`Model ${model.name} failed:`, error);
      // Continue to the next model
    }
  }

  // If we reach here, all failed
  throw new Error("Generation Failed: All API endpoints are currently unavailable or rate-limited. Please try again later.");
}
