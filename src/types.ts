export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  placeholderText: string;
  pronunciationLocale: string;
}

export type ChallengeType = 'scramble' | 'listening' | 'translation';

export interface DailyChallenge {
  id: string;
  type: ChallengeType;
  question: string;
  scrambledWords?: string[]; // strictly for 'scramble' type
  audioText?: string; // strictly for 'listening' type
  correctAnswer: string;
  translation: string;
  explanation: string;
  hint: string;
}

export interface SRSCard {
  id: string;
  front: string; // The word/phrase in target language
  back: string; // The translation in native language
  languageCode: string;
  createdAt: string;
  interval: number; // in days. 0 means needs learning
  repetitions: number; // how many consecutive times answered correctly
  easeFactor: number; // standard SM2 EF, starts at 2.5
  nextDueDate: string; // ISO timestamp
  pronunciation?: string; // Phonetic transcription
  example?: string; // Example sentence in target language
  exampleTranslation?: string; // Translation of example sentence
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'tutor';
  text: string;
  translation?: string;
  pronunciation?: string; // Pinyin, Romaji, etc.
  explanation?: string; // Optional embedded grammar breakdown
  timestamp: string;
}

export interface UserStats {
  targetLanguageCode: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  xp: number;
  streak: number;
  lastStudiedDate?: string; // 'YYYY-MM-DD'
  completedChallengesToday: string[]; // List of challenge IDs completed today
  completedReviewsTodayCount: number;
  badges: string[];
}
