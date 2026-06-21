import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini AI Client
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "MOCK_KEY") {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Full languages map for system prompts and Fallbacks
const LANGUAGE_NAMES: Record<string, string> = {
  es: "Spanish",
  fr: "French",
  ja: "Japanese",
  de: "German",
  it: "Italian",
  zh: "Mandarin Chinese",
  ar: "Arabic",
  ko: "Korean",
  en: "English",
};

// ==========================================
// FALLBACKS (In case API key is missing/limit exceeded)
// ==========================================
const FALLBACK_CHALLENGES: Record<string, any[]> = {
  es: [
    {
      id: "es-f1",
      type: "scramble",
      question: "Arrange the words to say: 'I speak Spanish very well'",
      scrambledWords: ["hablo", "bien", "español", "muy", "yo"],
      correctAnswer: "yo hablo español muy bien",
      translation: "I speak Spanish very well",
      explanation: "'Yo hablo' means 'I speak'. 'español' means Spanish. 'muy bien' translates to 'very well'.",
      hint: "Start with 'yo' and end with 'bien'.",
    },
    {
      id: "es-f2",
      type: "listening",
      question: "Listen to the audio text and type what you hear:",
      audioText: "Mucho gusto, ¿cómo estás?",
      correctAnswer: "mucho gusto ¿cómo estás?",
      translation: "Nice to meet you, how are you?",
      explanation: "'Mucho gusto' is the standard way to say 'Nice to meet you'. '¿Cómo estás?' means 'How are you?' (informal).",
      hint: "Begins with 'mucho' and includes a question.",
    },
    {
      id: "es-f3",
      type: "translation",
      question: "Translate this sentence to Spanish: 'Where is the bathroom, please?'",
      correctAnswer: "¿dónde está el baño por favor?",
      translation: "Where is the bathroom, please?",
      explanation: "'¿Dónde está...?' asks 'Where is...?'. 'el baño' is the bathroom. 'por favor' means please.",
      hint: "Use 'baño' and remember 'por favor'.",
    },
  ],
  fr: [
    {
      id: "fr-f1",
      type: "scramble",
      question: "Arrange the words to say: 'I speak French daily'",
      scrambledWords: ["français", "parle", "quotidiennement", "le", "je"],
      correctAnswer: "je parle le français quotidiennement",
      translation: "I speak French daily",
      explanation: "'Je parle' is I speak. 'le français' is the French language. 'quotidiennement' is daily.",
      hint: "Starts with 'je' and end with 'quotidiennement'.",
    },
    {
      id: "fr-f2",
      type: "listening",
      question: "Listen to the audio text and type what you hear:",
      audioText: "Bonjour, enchanté de vous rencontrer.",
      correctAnswer: "bonjour enchanté de vous rencontrer",
      translation: "Hello, pleased to meet you.",
      explanation: "'Bonjour' means Hello/Good morning. 'Enchanté de vous rencontrer' means pleased/delighted to meet you (polite).",
      hint: "Pleased to meet you starts with 'enchanté'.",
    },
    {
      id: "fr-f3",
      type: "translation",
      question: "Translate this sentence to French: 'I would like a croissant, please.'",
      correctAnswer: "je voudrais un croissant s'il vous plaît",
      translation: "I would like a croissant, please.",
      explanation: "'Je voudrais' is 'I would like' (polite). 'un croissant' is a croissant. 's'il vous plaît' represents please.",
      hint: "Begins with 'je voudrais' and ends with 'plaît'.",
    },
  ],
  ja: [
    {
      id: "ja-f1",
      type: "scramble",
      question: "Arrange the words/characters to say: 'This is delicious' (Kore wa oishii desu)",
      scrambledWords: ["おいしい", "これ", "です", "は"],
      correctAnswer: "これはおいしいです",
      translation: "This is delicious",
      explanation: "'これ (kore)' means 'this'. 'は (wa)' is the topic marker. 'おいしい (oishii)' means 'delicious'. 'です (desu)' is the polite copula (is).",
      hint: "Start with これ and end with です.",
    },
    {
      id: "ja-f2",
      type: "listening",
      question: "Listen to the audio text and type what you hear:",
      audioText: "はじめまして、よろしくおねがいします。",
      correctAnswer: "はじめまして よろしくおねがいします",
      translation: "Nice to meet you, please be kind to me.",
      explanation: "'はじめまして (hajimemashite)' means 'nice to meet you'. 'よろしくおねがいします (yoroshiku onegaishimasu)' is a polite phrase to request cooperative relationship.",
      hint: "Starts with はじめまして.",
    },
    {
      id: "ja-f3",
      type: "translation",
      question: "Translate this to Japanese: 'What is this?'",
      correctAnswer: "これは何ですか",
      translation: "What is this?",
      explanation: "'これは' means 'as for this'. '何 (nani/nan)' means 'what'. 'ですか (desuka)' is the question form of 'is'.",
      hint: "Use 何ですか (nan desu ka) at the end.",
    },
  ],
};

const DEFAULT_FALLBACK_CHALLENGES = [
  {
    id: "gen-f1",
    type: "scramble",
    question: "Arrange the words to say: 'Speak with me'",
    scrambledWords: ["me", "speak", "with"],
    correctAnswer: "speak with me",
    translation: "Speak with me",
    explanation: "Simple ordering: verb first 'speak' followed by preposition 'with' and pronoun 'me'.",
    hint: "Start with 'speak'.",
  },
  {
    id: "gen-f2",
    type: "listening",
    question: "Listen to the audio text and type what you hear:",
    audioText: "Have a nice day",
    correctAnswer: "have a nice day",
    translation: "Have a nice day",
    explanation: "Common polite wishing expression.",
    hint: "Starts with 'have'.",
  },
  {
    id: "gen-f3",
    type: "translation",
    question: "Translate this sentence to English: 'Gracias'",
    correctAnswer: "thank you",
    translation: "Thank you",
    explanation: "'Gracias' in Spanish means 'thank you' in English.",
    hint: "Two words.",
  },
];

// Fallback dynamic cards generators
const FALLBACK_DECK: Record<string, any[]> = {
  es: [
    { front: "hola", back: "hello", pronunciation: "OH-lah", example: "Hola, ¿cómo estás?", exampleTranslation: "Hello, how are you?" },
    { front: "gracias", back: "thank you", pronunciation: "GRAH-syahs", example: "Muchas gracias por la comida.", exampleTranslation: "Thank you very much for the food." },
    { front: "amigo", back: "friend", pronunciation: "ah-MEE-goh", example: "Él es mi mejor amigo.", exampleTranslation: "He is my best friend." },
    { front: "la casa", back: "the house", pronunciation: "lah KAH-sah", example: "Mi casa es muy pequeña.", exampleTranslation: "My house is very small." },
    { front: "buenos días", back: "good morning", pronunciation: "BWEH-nos DEE-ahs", example: "Buenos días a todos.", exampleTranslation: "Good morning to everyone." },
  ],
  fr: [
    { front: "bonjour", back: "hello", pronunciation: "bohn-zhoor", example: "Bonjour, ça va ?", exampleTranslation: "Hello, how is it going?" },
    { front: "merci", back: "thank you", pronunciation: "mair-see", example: "Merci pour votre aide.", exampleTranslation: "Thank you for your help." },
    { front: "l'amour", back: "love", pronunciation: "lah-moor", example: "L'amour est magnifique.", exampleTranslation: "Love is magnificent." },
    { front: "le café", back: "the coffee / café", pronunciation: "luh kah-fay", example: "Je voudrais un café chaud.", exampleTranslation: "I would like a hot coffee." },
    { front: "s'il vous plaît", back: "please", pronunciation: "seel voo pleh", example: "Un croissant, s'il vous plaît.", exampleTranslation: "A croissant, please." },
  ],
  ja: [
    { front: "こんにちは (konnichiwa)", back: "hello / good afternoon", pronunciation: "kon-nee-chee-wah", example: "皆さん、こんにちは。", exampleTranslation: "Hello, everyone." },
    { front: "ありがとう (arigatou)", back: "thank you", pronunciation: "ah-ree-gah-toh", example: "手伝ってくれてありがとう。", exampleTranslation: "Thank you for helping me." },
    { front: "友達 (tomodachi)", back: "friend", pronunciation: "toh-moh-dah-chee", example: "私たちは友達です。", exampleTranslation: "We are friends." },
    { front: "猫 (neko)", back: "cat", pronunciation: "neh-koh", example: "私の猫は白いです。", exampleTranslation: "My cat is white." },
    { front: "美味しい (oishii)", back: "delicious", pronunciation: "oy-shee", example: "この寿司はとても美味しいです。", exampleTranslation: "This sushi is very delicious." },
  ],
};

// ==========================================
// ENDPOINTS
// ==========================================

// 1. Generate Daily Challenges
app.post("/api/gemini/generate-challenges", async (req, res) => {
  const { languageCode, level } = req.body;
  const targetLang = LANGUAGE_NAMES[languageCode] || "Spanish";
  const proficiency = level || "beginner";

  const ai = getAi();
  if (!ai) {
    // Return mock fallback challenges for immediate responsiveness
    const list = FALLBACK_CHALLENGES[languageCode] || DEFAULT_FALLBACK_CHALLENGES;
    return res.json({ challenges: list, usingMock: true });
  }

  try {
    const prompt = `Generate exactly 3 diverse, fun daily language practice challenges for a student learning ${targetLang} at a ${proficiency} proficiency level.
      The output must comply exactly with the required JSON structure.
      Provide exactly 3 challenges, one of each type:
      1. 'scramble': Provide a simple card challenge where words must be arranged. Fill 'scrambledWords' with the correct words shuffled (e.g., ["hablo", "bien", "español", "muy", "yo"]). Ensure the correctAnswer matches the correct order, lowercase, no excessive punctuation.
      2. 'listening': Provide a listening challenge. Fill 'audioText' with the phrase/sentence they must transcribe (e.g. "Mucho gusto, ¿cómo estás?"). Provide hint and pronunciation tips.
      3. 'translation': Provide a translation challenge where the prompt asks them to translate a sentence from English to ${targetLang}. The 'question' asks them to translate, 'correctAnswer' is the correct translation in ${targetLang}.
      
      Generate unique sentences, keep them natural. Return as a JSON array inside the structured response schema. Ensure 'id' is unique (e.g. "lang-ch-1", "lang-ch-2", etc.).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { type: Type.STRING, description: "Type must be one of: scramble, listening, translation" },
              question: { type: Type.STRING, description: "Instructions or the question prompt displayed to user" },
              scrambledWords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array of words in scrambled order, only for scramble types"
              },
              audioText: { type: Type.STRING, description: "The precise text to read for listening types" },
              correctAnswer: { type: Type.STRING, description: "The correct typed answer in the target language (lowercase, ignore simple punctuation like question marks for comparison)" },
              translation: { type: Type.STRING, description: "The translation of the correct answer in English." },
              explanation: { type: Type.STRING, description: "Short details on grammar or why this form is used." },
              hint: { type: Type.STRING, description: "A simple, helpful hint to guide the learner." }
            },
            required: ["id", "type", "question", "correctAnswer", "translation", "explanation", "hint"]
          }
        }
      }
    });

    const parsedChallenges = JSON.parse(response.text || "[]");
    res.json({ challenges: parsedChallenges, usingMock: false });
  } catch (error: any) {
    console.error("Gemini challenges generation failed:", error);
    const list = FALLBACK_CHALLENGES[languageCode] || DEFAULT_FALLBACK_CHALLENGES;
    res.json({ challenges: list, error: error.message, usingMock: true });
  }
});

// 2. Explain Phrase or Grammar
app.post("/api/gemini/explain", async (req, res) => {
  const { text, languageCode } = req.body;
  const targetLang = LANGUAGE_NAMES[languageCode] || "Spanish";

  const ai = getAi();
  if (!ai) {
    return res.json({
      explanation: `**Explanation of "${text}"**:
- This is a standard phrase in **${targetLang}**.
- To review or get full explanations with real-time grammar parsing, active parts of speech, and pronunciation tips, please unlock full AI access by providing your Gemini developer API key in the **Settings > Secrets** panel.
- Meanwhile, you can add this phrase to your **Spaced Repetition System (SRS)** below to master it!`
    });
  }

  try {
    const prompt = `You are a warm, extremely clear language learning chatbot coach. 
      Analyze this foreign word or phrase: "${text}" from the language: ${targetLang}.
      Provide a highly readable, concise grammatical, vocabulary, and phonetic breakdown in native English.
      Structure it beautifully using clean Markdown bullet points. Use emojis for friendly visual markers. Keep it under 150 words.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ explanation: response.text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Spaced Repetition Card Generator
app.post("/api/gemini/generate-cards", async (req, res) => {
  const { prompt: topic, languageCode, count = 5 } = req.body;
  const targetLang = LANGUAGE_NAMES[languageCode] || "Spanish";

  const ai = getAi();
  if (!ai) {
    const defaultDeck = FALLBACK_DECK[languageCode] || FALLBACK_DECK["es"];
    return res.json({ cards: defaultDeck.slice(0, count), usingMock: true });
  }

  try {
    const promptMessage = `Generate exactly ${count} highly useful flashcard entries in ${targetLang} related to this topic or word request: "${topic}".
      Return a flat JSON array. Provide:
      - 'front': The precise vocabulary word, verb, or short conversational phrase in ${targetLang}.
      - 'back': The translation in English.
      - 'pronunciation': A simplified phonetic transcription / phonetic spelling for speakers to read aloud easily (e.g., 'gracias' sounds like 'GRAH-syahs').
      - 'example': A very simple, useful, high-frequency example sentence using the 'front' word.
      - 'exampleTranslation': The English translation of that example sentence.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptMessage,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING },
              back: { type: Type.STRING },
              pronunciation: { type: Type.STRING },
              example: { type: Type.STRING },
              exampleTranslation: { type: Type.STRING },
            },
            required: ["front", "back", "example", "exampleTranslation"],
          },
        },
      },
    });

    const cards = JSON.parse(response.text || "[]");
    res.json({ cards, usingMock: false });
  } catch (error: any) {
    console.error("Card generation failed:", error);
    const defaultDeck = FALLBACK_DECK[languageCode] || FALLBACK_DECK["es"];
    res.json({ cards: defaultDeck.slice(0, count), error: error.message, usingMock: true });
  }
});

// 4. AIS Native Conversational Tutor Chat
app.post("/api/gemini/chat", async (req, res) => {
  const { history, message, languageCode, level } = req.body;
  const targetLang = LANGUAGE_NAMES[languageCode] || "Spanish";
  const diffLevel = level || "beginner";

  const ai = getAi();
  if (!ai) {
    // Return friendly, responsive mock assistant
    const replies: Record<string, string> = {
      es: "¿Hola! Qué bueno hablar contigo. ¿Cómo estás hoy? Estoy listo para practicar contigo.",
      fr: "Bonjour ! C'est un plaisir de parler avec vous. Comment allez-vous aujourd'hui ?",
      ja: "こんにちは！お元気ですか？一緒に日本語を練習しましょう！",
    };
    const reply = replies[languageCode] || `Hello! Friendly mock tutor active. Let's practice ${targetLang} together! Configure your Gemini secret key to talk to a full dynamic native conversational assistant.`;
    return res.json({
      response: reply,
      translation: `English translation helper. How are you today? Let's practice!`,
      suggestedResponse: languageCode === "es" ? "Estoy muy bien, gracias. ¿Y tú?" : "Ça va bien, merci !",
      usingMock: true,
    });
  }

  try {
    const formattedHistory = history.map((h: any) => {
      const role = h.sender === "user" ? "user" : "model";
      return `${role === "user" ? "Student" : "Tutor"}: ${h.text}`;
    }).join("\n");

    const systemPrompt = `You are a supportive, friendly native speaker of ${targetLang} acting as a bicultural conversational tutor named "Aura".
      The student is practicing conversation with you. 
      Their proficiency level in ${targetLang} is: ${diffLevel}. Use vocabulary, sentence lengths, and structure appropriate for this tier (beginner: short lines, standard verbs; intermediate: moderate descriptions; advanced: natural dialogue).
      
      Respond to their last message directly: "${message}".
      Structure your response ONLY in the designated JSON Schema. Do not provide normal Markdown wrappers.
      Return:
      - 'response': Your reply spoken naturally in ${targetLang} as a tutor (keep it to 1-3 sentences maximum, ask a gentle question back to keep convo flowing).
      - 'translation': Absolute literal / direct meaning in English to guide the student.
      - 'pronunciation': Helpful pronunciation, romaji, pinyin, phonetic spellings, or phonetic pronunciation guide.
      - 'suggestedResponse': A highly polished, correct, very simple alternative that the student could choose to write back next to keep learning comfortably.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `${formattedHistory}\nStudent: ${message}`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            response: { type: Type.STRING },
            translation: { type: Type.STRING },
            pronunciation: { type: Type.STRING, description: "Phonetic romanization or phonetic transcription helper." },
            suggestedResponse: { type: Type.STRING, description: "A simple template or reply the user could utilize next." },
          },
          required: ["response", "translation", "suggestedResponse"]
        }
      }
    });

    const chatReply = JSON.parse(response.text || "{}");
    res.json({ ...chatReply, usingMock: false });
  } catch (error: any) {
    console.error("Gemini conversation tutor crashed:", error);
    res.json({
      response: `Connection active! In ${targetLang}, to chat dynamically, please confirm your key setup in settings.`,
      translation: "Error in generating tutor dialogue. Spaced Repetition index and local deck exercises are fully functional!",
      suggestedResponse: "Retry contact",
      error: error.message,
      usingMock: true,
    });
  }
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}/`);
  });
}

startServer();
