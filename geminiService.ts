import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Sentence } from "../types";

const processAudioFile = async (base64Audio: string, mimeType: string): Promise<Sentence[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please check your configuration.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const responseSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        text: {
          type: Type.STRING,
          description: "The transcribed text of the sentence.",
        },
        startTime: {
          type: Type.NUMBER,
          description: "The start time of the sentence in seconds (e.g., 1.5).",
        },
        endTime: {
          type: Type.NUMBER,
          description: "The end time of the sentence in seconds (e.g., 4.2).",
        },
        translation: {
          type: Type.STRING,
          description: "A natural Chinese translation of the sentence.",
        },
      },
      required: ["text", "startTime", "endTime", "translation"],
    },
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio,
            },
          },
          {
            text: `Please transcribe the following audio file. 
            1. Split the transcription into natural, grammatical sentences.
            2. Provide the precise start and end timestamp (in seconds) for each sentence relative to the beginning of the audio.
            3. Provide a Chinese translation for each sentence.
            4. Ensure the output strictly follows the JSON schema provided.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.2, // Low temperature for higher accuracy in transcription
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text) as Sentence[];
      return data;
    } else {
      throw new Error("No data received from Gemini.");
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export { processAudioFile };
