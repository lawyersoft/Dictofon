import { GoogleGenAI } from "@google/genai";
import { blobToBase64 } from "../utils/audioUtils";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  try {
    const base64Audio = await blobToBase64(audioBlob);
    const mimeType = audioBlob.type || 'audio/webm';

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio
            }
          },
          {
            text: "Пожалуйста, сделай точную транскрипцию этой аудиозаписи. Отформатируй вывод с четкими разрывами абзацев там, где есть естественные паузы. Не добавляй никаких вводных или заключительных замечаний, только текст транскрипции."
          }
        ]
      },
      config: {
        temperature: 0.2, // Low temperature for more accurate transcription
      }
    });

    return response.text || "Транскрипция не создана.";
  } catch (error: any) {
    console.error("Transcription error:", error);
    throw new Error(error.message || "Не удалось транскрибировать аудио.");
  }
};