import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API endpoints
  app.post("/api/generate", async (req, res) => {
    try {
      const { quantity, difficulty, topic, focusAreas, modelId } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured.");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `You are a Master Cardiology Attending testing a 5th-year cardiology resident for their final board exam.
Generate exactly ${quantity} flashcards. 
Difficulty: ${difficulty}
Topic: ${topic}
Focus Areas: ${focusAreas.join(", ")}

Constraints:
- Information must strictly adhere to the latest 2025/2026 AHA/ACC or ESC guidelines.
- Prioritize algorithmic sequencing and precise contraindications.

Output Format: You MUST output strict, parsable JSON matching this schema:
[
  {
    "front": "Clinical scenario",
    "back": "Rationale and answer",
    "topic": "String",
    "guidelineCitation": "e.g., 2025 ESC Heart Failure Guidelines"
  }
]`;

      const response = await ai.models.generateContent({
        model: modelId || "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });
      
      const text = response.text;
      if (!text) throw new Error("Empty response from AI");
      
      const cards = JSON.parse(text);
      res.json(cards);
    } catch (error: any) {
      console.error("AI Generation Edit:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static file serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:\${PORT}`);
  });
}

startServer();
