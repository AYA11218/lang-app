import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Layers, 
  Flame, 
  Sparkles, 
  Settings, 
  Globe, 
  CheckCircle, 
  Volume2, 
  RefreshCw,
  LogOut,
  Cloud,
  CloudOff
} from 'lucide-react';

import { Language, SRSCard, DailyChallenge, ChatMessage, UserStats } from './types';
import DashboardView from './components/DashboardView';
import SpacedRepetitionView from './components/SpacedRepetitionView';
import DailyChallengesView from './components/DailyChallengesView';
import AITutorView from './components/AITutorView';
import LoginView from './components/LoginView';
import { useFirebaseSync } from './hooks/useFirebaseSync';

import { auth, db, handleFirestoreError, logoutUser, OperationType, testFirestoreConnection } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, collection, onSnapshot, query, orderBy } from 'firebase/firestore';


// Preset Languages supported
const LANGUAGES: Language[] = [
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', placeholderText: '¿Cómo te llamas?', pronunciationLocale: 'es-ES' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', placeholderText: 'Comment t\'appelles-tu?', pronunciationLocale: 'fr-FR' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', placeholderText: 'お名前はなんですか？', pronunciationLocale: 'ja-JP' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', placeholderText: 'Wie heißt du?', pronunciationLocale: 'de-DE' }
];

// Pre-seeded starter cards so deck is never blank on start
const INTRO_CARDS: Record<string, Omit<SRSCard, 'id' | 'createdAt' | 'languageCode'>[]> = {
  es: [
    { front: "hola", back: "hello", pronunciation: "OH-lah", example: "Hola, ¿cómo estás?", exampleTranslation: "Hello, how are you?", interval: 0, repetitions: 0, easeFactor: 2.5, nextDueDate: new Date().toISOString() },
    { front: "gracias", back: "thank you", pronunciation: "GRAH-syahs", example: "Muchas gracias por tu ayuda.", exampleTranslation: "Thank you very much for your help.", interval: 0, repetitions: 0, easeFactor: 2.5, nextDueDate: new Date().toISOString() },
    { front: "buenos días", back: "good morning", pronunciation: "BWEH-nos DEE-ahs", example: "Buenos días, que tengas un gran día.", exampleTranslation: "Good morning, have a great day.", interval: 0, repetitions: 0, easeFactor: 2.5, nextDueDate: new Date().toISOString() }
  ],
  fr: [
    { front: "bonjour", back: "hello / good morning", pronunciation: "bohn-zhoor", example: "Bonjour tout le monde !", exampleTranslation: "Hello everyone!", interval: 0, repetitions: 0, easeFactor: 2.5, nextDueDate: new Date().toISOString() },
    { front: "merci", back: "thank you", pronunciation: "mair-see", example: "Merci beaucoup pour l'invitation.", exampleTranslation: "Thank you very much for the invitation.", interval: 0, repetitions: 0, easeFactor: 2.5, nextDueDate: new Date().toISOString() },
    { front: "s'il vous plaît", back: "please", pronunciation: "seel voo pleh", example: "Un café chaud, s'il vous plaît.", exampleTranslation: "A hot coffee, please.", interval: 0, repetitions: 0, easeFactor: 2.5, nextDueDate: new Date().toISOString() }
  ],
  ja: [
    { front: "こんにちは (konnichiwa)", back: "hello / good afternoon", pronunciation: "kon-nee-chee-wah", example: "鈴木さん、こんにちは。", exampleTranslation: "Hello, Mr. Suzuki.", interval: 0, repetitions: 0, easeFactor: 2.5, nextDueDate: new Date().toISOString() },
    { front: "ありがとう (arigatou)", back: "thank you", pronunciation: "ah-ree-gah-toh", example: "プレゼントをありがとう。", exampleTranslation: "Thank you for the present.", interval: 0, repetitions: 0, easeFactor: 2.5, nextDueDate: new Date().toISOString() },
    { front: "すみません (sumimasen)", back: "excuse me / sorry", pronunciation: "soo-mee-mah-sen", example: "すみません、駅はどこですか？", exampleTranslation: "Excuse me, where is the station?", interval: 0, repetitions: 0, easeFactor: 2.5, nextDueDate: new Date().toISOString() }
  ],
  de: [
    { front: "hallo", back: "hello", pronunciation: "HAH-loh", example: "Hallo, wie geht es dir?", exampleTranslation: "Hello, how are you?", interval: 0, repetitions: 0, easeFactor: 2.5, nextDueDate: new Date().toISOString() },
    { front: "danke", back: "thank you", pronunciation: "DAHN-kuh", example: "Vielen Dank für das Geschenk.", exampleTranslation: "Thank you very much for the gift.", interval: 0, repetitions: 0, easeFactor: 2.5, nextDueDate: new Date().toISOString() },
    { front: "bitte", back: "please / you are welcome", pronunciation: "BIT-tuh", example: "Ein Bier, bitte.", exampleTranslation: "A beer, please.", interval: 0, repetitions: 0, easeFactor: 2.5, nextDueDate: new Date().toISOString() }
  ]
};

// Default Daily challenges as fallbacks on first load
const SAMPLE_DAILY_CHALLENGES: Record<string, DailyChallenge[]> = {
  es: [
    {
      id: "es-1",
      type: "scramble",
      question: "Arrange the words to say: 'I speak Spanish very well'",
      scrambledWords: ["hablo", "bien", "español", "muy", "yo"],
      correctAnswer: "yo hablo español muy bien",
      translation: "I speak Spanish very well",
      explanation: "'Yo hablo' means 'I speak'. 'español' means Spanish. 'muy bien' translates to 'very well'.",
      hint: "Start with 'yo' and end with 'bien'.",
    },
    {
      id: "es-2",
      type: "listening",
      question: "Listen to the audio text and type what you hear:",
      audioText: "Mucho gusto, ¿cómo estás?",
      correctAnswer: "mucho gusto ¿cómo estás?",
      translation: "Nice to meet you, how are you?",
      explanation: "'Mucho gusto' is the standard way to say 'Nice to meet you'. '¿Cómo estás?' means 'How are you?' (informal).",
      hint: "Begins with 'mucho' and includes a question.",
    },
    {
      id: "es-3",
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
      id: "fr-1",
      type: "scramble",
      question: "Arrange the words to say: 'I speak French daily'",
      scrambledWords: ["français", "parle", "quotidiennement", "le", "je"],
      correctAnswer: "je parle le français quotidiennement",
      translation: "I speak French daily",
      explanation: "'Je parle' is I speak. 'le français' is the French language. 'quotidiennement' is daily.",
      hint: "Starts with 'je' and end with 'quotidiennement'.",
    },
    {
      id: "fr-2",
      type: "listening",
      question: "Listen to the audio text and type what you hear:",
      audioText: "Bonjour, enchanté de vous rencontrer.",
      correctAnswer: "bonjour enchanté de vous rencontrer",
      translation: "Hello, pleased to meet you.",
      explanation: "'Bonjour' means Hello/Good morning. 'Enchanté de vous rencontrer' means pleased/delighted to meet you (polite).",
      hint: "Pleased to meet you starts with 'enchanté'.",
    },
    {
      id: "fr-3",
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
      id: "ja-1",
      type: "scramble",
      question: "Arrange the characters to say 'delicious sushi' (Oishii sushi)",
      scrambledWords: ["すし", "美味しい", "は", "ですね"],
      correctAnswer: "美味しいすしですね",
      translation: "It is delicious sushi, isn't it?",
      explanation: "'美味しい (oishii)' means delicious. 'すし (sushi)' is sushi. 'ですね (desu ne)' is polite marker asking for agreement.",
      hint: "Ends with ね.",
    },
    {
      id: "ja-2",
      type: "listening",
      question: "Listen to the audio and transcribe what you hear:",
      audioText: "はじめまして、よろしくおねがいします。",
      correctAnswer: "はじめまして よろしくおねがいします",
      translation: "Nice to meet you, please be kind to me.",
      explanation: "Standard polite starter introduction phrase.",
      hint: "Begins with はじめまして.",
    },
    {
      id: "ja-3",
      type: "translation",
      question: "Translate to Japanese: 'Excuse me'",
      correctAnswer: "すみません",
      translation: "Excuse me",
      explanation: "'すみません (sumimasen)' means excuse me, sorry, or thank you.",
      hint: "Stretches to 5 characters.",
    }
  ],
  de: [
    {
      id: "de-1",
      type: "scramble",
      question: "Arrange to say: 'The dog is beautiful'",
      scrambledWords: ["Hund", "Der", "schön", "ist"],
      correctAnswer: "Der Hund ist schön",
      translation: "The dog is beautiful",
      explanation: "'Der Hund' means the dog. 'ist' is 'is'. 'schön' translates to 'beautiful'.",
      hint: "Start with 'Der' and end with 'schön'.",
    },
    {
      id: "de-2",
      type: "listening",
      question: "Identify the spoken phrase:",
      audioText: "Wie geht es dir?",
      correctAnswer: "wie geht es dir",
      translation: "How are you? (informal)",
      explanation: "Standard German friendly query for checking up.",
      hint: "Starts with 'wie'.",
    },
    {
      id: "de-3",
      type: "translation",
      question: "Translate this phrase: 'Where is the station?'",
      correctAnswer: "Wo ist der Bahnhof",
      translation: "Where is the station?",
      explanation: "'Wo ist...?' is Where is. 'der Bahnhof' represents railway station.",
      hint: "Starts with 'Wo ist'.",
    }
  ]
};

export default function App() {
  // Navigation Tabs State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'srs' | 'challenges' | 'tutor'>('dashboard');

  // Loading indicator states for API requests
  const [loadingChat, setLoadingChat] = useState(false);
  const [loadingChallenges, setLoadingChallenges] = useState(false);
  const [loadingAiCards, setLoadingAiCards] = useState(false);

  // States
  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('aura_stats');
    if (saved) return JSON.parse(saved);
    return {
      targetLanguageCode: 'es',
      level: 'beginner',
      xp: 0,
      streak: 1,
      lastStudiedDate: new Date().toISOString().split('T')[0],
      completedChallengesToday: [],
      completedReviewsTodayCount: 0,
      badges: []
    };
  });

  const [cards, setCards] = useState<SRSCard[]>(() => {
    const saved = localStorage.getItem('aura_cards');
    if (saved) return JSON.parse(saved);
    
    // Seed database on first load with comprehensive starter cards across languages
    const initial: SRSCard[] = [];
    Object.entries(INTRO_CARDS).forEach(([langCode, presets]) => {
      presets.forEach((c, idx) => {
        initial.push({
          ...c,
          id: `seed-${langCode}-${idx}`,
          languageCode: langCode,
          createdAt: new Date().toISOString()
        });
      });
    });
    return initial;
  });

  const [challenges, setChallenges] = useState<DailyChallenge[]>(() => {
    const saved = localStorage.getItem('aura_challenges');
    if (saved) return JSON.parse(saved);
    return SAMPLE_DAILY_CHALLENGES['es'];
  });

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('aura_chat');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'start-wel',
        sender: 'tutor',
        text: '¡Hola! Soy Aura, tu tutora de idiomas. ¿Sobre qué te gustaría hablar hoy?',
        translation: 'Hello! I am Aura, your language tutor. What would you like to talk about today?',
        pronunciation: 'OH-lah! Soy OW-rah',
        timestamp: new Date().toISOString()
      }
    ];
  });

  const {
    user,
    syncLoading,
    signInGoogle,
    logOut,
    updateCloudStats,
    uploadCloudCard,
    deleteCloudCard,
    uploadCloudChatMessage,
    clearCloudChats
  } = useFirebaseSync(stats, setStats, cards, setCards, chatHistory, setChatHistory);

  // Keep LocalStorage Synced
  useEffect(() => {
    localStorage.setItem('aura_stats', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem('aura_cards', JSON.stringify(cards));
  }, [cards]);

  useEffect(() => {
    localStorage.setItem('aura_challenges', JSON.stringify(challenges));
  }, [challenges]);

  useEffect(() => {
    localStorage.setItem('aura_chat', JSON.stringify(chatHistory));
  }, [chatHistory]);

  // Synchronize stats to cloud when user is logged in
  useEffect(() => {
    if (user) {
      updateCloudStats(stats).catch(e => console.error("Cloud stats save failed:", e));
    }
  }, [stats, user]);

  // Streak verification on layout boot
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (stats.lastStudiedDate && stats.lastStudiedDate !== todayStr) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (stats.lastStudiedDate === yesterdayStr) {
        // preserve streak, just update studied date or update status
      } else {
        // missed a day! Reset streak to 1
        setStats(prev => ({
          ...prev,
          streak: 1,
          completedChallengesToday: [],
          completedReviewsTodayCount: 0
        }));
      }
    }
  }, []);

  // Calculate Due Cards dynamically
  const dueCards = cards.filter(card => {
    if (card.languageCode !== stats.targetLanguageCode) return false;
    return new Date(card.nextDueDate).getTime() <= Date.now();
  });

  // Track habit completions and study stamps
  const logStudyDay = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (stats.lastStudiedDate !== todayStr) {
      setStats(prev => ({
        ...prev,
        streak: prev.streak + 1,
        lastStudiedDate: todayStr,
        completedChallengesToday: [],
        completedReviewsTodayCount: 0
      }));
    }
  };

  // Switch Language handler
  const handleLanguageChange = (langCode: string) => {
    const currentChallenges = SAMPLE_DAILY_CHALLENGES[langCode] || SAMPLE_DAILY_CHALLENGES['es'];
    
    // Seed chat greeting translation
    const greetings: Record<string, ChatMessage> = {
      es: { id: 'w-es', sender: 'tutor', text: '¡Hola! ¿Cómo estás hoy?', translation: 'Hello! How are you today?', timestamp: new Date().toISOString() },
      fr: { id: 'w-fr', sender: 'tutor', text: 'Bonjour ! Comment allez-vous aujourd\'hui ?', translation: 'Hello! How are you today?', timestamp: new Date().toISOString() },
      ja: { id: 'w-ja', sender: 'tutor', text: 'こんにちは！お元気ですか？', translation: 'Hello! How are you?', timestamp: new Date().toISOString() },
      de: { id: 'w-de', sender: 'tutor', text: 'Hallo! Wie geht es dir heute?', translation: 'Hello! How are you today?', timestamp: new Date().toISOString() }
    };

    setStats(prev => ({
      ...prev,
      targetLanguageCode: langCode,
      completedChallengesToday: []
    }));

    setChallenges(currentChallenges);
    setChatHistory([greetings[langCode] || greetings['es']]);
    setActiveTab('dashboard');
  };

  // Triggered when completing elements
  const handleCompleteChallenge = (challengeId: string, gotRight: boolean) => {
    logStudyDay();
    setStats(prev => {
      const updatedList = prev.completedChallengesToday.includes(challengeId)
        ? prev.completedChallengesToday
        : [...prev.completedChallengesToday, challengeId];
      
      const newXp = prev.xp + 15;
      const updatedBadges = [...prev.badges];

      if (updatedList.length === 1 && !updatedBadges.includes('first_challenge')) {
        updatedBadges.push('first_challenge');
      }
      if (updatedList.length === 3 && !updatedBadges.includes('perfect_challenge')) {
        updatedBadges.push('perfect_challenge');
      }
      if (prev.streak >= 3 && !updatedBadges.includes('streak_3')) {
        updatedBadges.push('streak_3');
      }

      return {
        ...prev,
        xp: newXp,
        completedChallengesToday: updatedList,
        badges: updatedBadges
      };
    });
  };

  // Add Card dynamically (can be trigger by custom form or AI)
  const handleAddCard = (newCardData: {
    front: string;
    back: string;
    pronunciation?: string;
    example?: string;
    exampleTranslation?: string;
    interval?: number;
    repetitions?: number;
    easeFactor?: number;
    nextDueDate?: string;
  }) => {
    const cardId = `c-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const fullCard: SRSCard = {
      id: cardId,
      front: newCardData.front,
      back: newCardData.back,
      languageCode: stats.targetLanguageCode,
      createdAt: new Date().toISOString(),
      interval: newCardData.interval || 0,
      repetitions: newCardData.repetitions || 0,
      easeFactor: newCardData.easeFactor || 2.5,
      nextDueDate: newCardData.nextDueDate || new Date().toISOString(),
      pronunciation: newCardData.pronunciation,
      example: newCardData.example,
      exampleTranslation: newCardData.exampleTranslation
    };

    setCards(prev => [fullCard, ...prev]);
    uploadCloudCard(fullCard).catch(e => console.error("Cloud card sync failed:", e));
  };

  const handleDeleteCard = (cardId: string) => {
    setCards(prev => prev.filter(c => c.id !== cardId));
    deleteCloudCard(cardId).catch(e => console.error("Cloud card delete failed:", e));
  };

  // SM-2 Spaced Repetition execution callback
  const handleUpdateCardSchedule = (cardId: string, grade: 'again' | 'hard' | 'good' | 'easy') => {
    logStudyDay();
    setCards(prev => {
      const nextCards = prev.map(card => {
        if (card.id !== cardId) return card;

        let { repetitions, interval, easeFactor } = card;

        if (grade === 'again') {
          // completely reset repetitions sequence
          repetitions = 0;
          interval = 0; // means review immediately inside active deck loop
          easeFactor = Math.max(1.3, easeFactor - 0.2);
        } else if (grade === 'hard') {
          repetitions = Math.max(0, repetitions - 1);
          interval = 1; // review in 1 day or 12 hours
          easeFactor = Math.max(1.3, easeFactor - 0.15);
        } else if (grade === 'good') {
          repetitions += 1;
          if (repetitions === 1) {
            interval = 1; // 1 day
          } else if (repetitions === 2) {
            interval = 3; // 3 days
          } else {
            interval = Math.ceil(interval * easeFactor);
          }
        } else if (grade === 'easy') {
          repetitions += 1;
          easeFactor += 0.15;
          if (repetitions === 1) {
            interval = 2; // 2 days
          } else if (repetitions === 2) {
            interval = 6; // 6 days
          } else {
            interval = Math.ceil(interval * easeFactor * 1.3);
          }
        }

        // Set due timestamp based on interval spacing
        const nextDate = new Date();
        if (interval === 0) {
          nextDate.setMinutes(nextDate.getMinutes() + 1); // 1 minute from now for immediate rehearsal
        } else {
          nextDate.setDate(nextDate.getDate() + interval);
        }

        return {
          ...card,
          repetitions,
          interval,
          easeFactor,
          nextDueDate: nextDate.toISOString()
        };
      });

      const updatedCard = nextCards.find(c => c.id === cardId);
      if (updatedCard) {
        uploadCloudCard(updatedCard).catch(e => console.error("Cloud card dynamic schedule update failed:", e));
      }
      return nextCards;
    });

    // Reward XP for reviewing cards
    setStats(prev => {
      const nextReviews = prev.completedReviewsTodayCount + 1;
      const updatedBadges = [...prev.badges];
      
      if (nextReviews >= 5 && !updatedBadges.includes('srs_conqueror')) {
        updatedBadges.push('srs_conqueror');
      }

      return {
        ...prev,
        xp: prev.xp + 5,
        completedReviewsTodayCount: nextReviews,
        badges: updatedBadges
      };
    });
  };

  // ==========================================
  // CHAT ENDPOINTS PROXIES
  // ==========================================

  // Daily challenges generation via Gemini
  const handleGenerateChallenges = async () => {
    setLoadingChallenges(true);
    try {
      const response = await fetch('/api/gemini/generate-challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ languageCode: stats.targetLanguageCode, level: stats.level })
      });
      const data = await response.json();
      if (data.challenges && data.challenges.length > 0) {
        setChallenges(data.challenges);
      }
    } catch (error) {
      console.error("Could not fetch new daily challenges:", error);
    } finally {
      setLoadingChallenges(false);
    }
  };

  // Post User messages to chat, wait for native answers from Gemini
  const handleSendChatMessage = async (userMessage: string) => {
    const userMsgId = `u-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: userMessage,
      timestamp: new Date().toISOString()
    };

    setChatHistory(prev => [...prev, userMsg]);
    uploadCloudChatMessage(userMsg).catch(e => console.error("Cloud chat upload failed:", e));
    setLoadingChat(true);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: chatHistory.slice(-6), // pass recent conversations
          message: userMessage,
          languageCode: stats.targetLanguageCode,
          level: stats.level
        })
      });

      const reply = await response.json();
      
      const tutorMsg: ChatMessage = {
        id: `t-${Date.now()}`,
        sender: 'tutor',
        text: reply.response,
        translation: reply.translation,
        pronunciation: reply.pronunciation || undefined,
        timestamp: new Date().toISOString()
      };

      // append suggested reply context to track copy shortcuts
      (tutorMsg as any).suggestedResponse = reply.suggestedResponse;

      setChatHistory(prev => [...prev, tutorMsg]);
      uploadCloudChatMessage(tutorMsg).catch(e => console.error("Cloud tutor reply upload failed:", e));
      logStudyDay();

      // reward speech practice experience
      setStats(prev => {
        const badges = [...prev.badges];
        if (!badges.includes('speech_badge')) {
          badges.push('speech_badge');
        }
        return {
          ...prev,
          xp: prev.xp + 10,
          badges
        };
      });

    } catch (error) {
      console.error("Chat Tutor request failed:", error);
    } finally {
      setLoadingChat(false);
    }
  };

  // Generate cards of topic dynamically
  const handleGenerateAICards = async (topic: string) => {
    setLoadingAiCards(true);
    try {
      const response = await fetch('/api/gemini/generate-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: topic, languageCode: stats.targetLanguageCode })
      });
      const data = await response.json();
      if (data.cards && data.cards.length > 0) {
        data.cards.forEach((card: any) => {
          handleAddCard({
            front: card.front,
            back: card.back,
            pronunciation: card.pronunciation,
            example: card.example,
            exampleTranslation: card.exampleTranslation
          });
        });
      }
    } catch (err) {
      console.error("Cards creation failed:", err);
    } finally {
      setLoadingAiCards(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 p-4 sm:p-6 md:p-8">
      
      {/* Dynamic Header */}
      <header className="flex justify-between items-center mb-6 bg-white border-2 border-slate-200 p-4 rounded-2xl shadow-sm">
        
        {/* Brand logo details */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-sm">
            A
          </div>
          <div>
            <h1 className="font-display font-bold text-sm text-slate-800 tracking-tight flex items-center gap-1.5 leading-none">
              Aura <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md font-semibold font-sans uppercase">Learn</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">Bento Spaced-Repetition</p>
          </div>
        </div>

        {/* Global state switchers */}
        <div className="flex items-center gap-4">
          
          {/* Target language selector switcher */}
          <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border-2 border-slate-200">
            {LANGUAGES.map((lang) => {
              const isSelected = lang.code === stats.targetLanguageCode;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-white text-slate-800 shadow-sm border border-slate-200 font-extrabold scale-102' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                  title={`Learn ${lang.name}`}
                >
                  <span className="text-sm">{lang.flag}</span>
                  <span className="hidden sm:inline">{lang.name}</span>
                </button>
              );
            })}
          </div>

          {/* User Proficiency selector switcher */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border-2 border-slate-200">
            {['beginner', 'intermediate', 'advanced'].map((lv) => {
              const isSelected = stats.level === lv;
              return (
                <button
                  key={lv}
                  onClick={() => setStats(prev => ({ ...prev, level: lv as any }))}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-slate-800 text-white font-extrabold shadow-sm' 
                     : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {lv}
                </button>
              );
            })}
          </div>

          {/* Firebase Authentication Sync Block */}
          <div className="flex items-center border-l-2 border-slate-200 pl-4 gap-3">
            {syncLoading ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span className="hidden md:inline">Syncing...</span>
              </div>
            ) : user ? (
              <div className="flex items-center gap-3">
                <img
                  src={user.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.uid}`}
                  alt="Avatar"
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full border border-indigo-200 object-cover"
                />
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-[10px] font-bold text-slate-800 leading-tight">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                  <span className="text-[8px] font-bold text-green-600 flex items-center gap-1">
                    <Cloud className="h-2 w-2 animate-bounce" /> Cloud Synced
                  </span>
                </div>
                <button
                  onClick={logOut}
                  className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 hover:text-red-500 text-slate-400 cursor-pointer transition-all border border-slate-200"
                  title="Logout"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={signInGoogle}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-sm transition-all border border-indigo-500 whitespace-nowrap"
                title="Login to cloud sync language progress"
              >
                <Cloud className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Google Login</span>
                <span className="inline sm:hidden">Login</span>
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Primary Desktop Container Layout (Sidebar nav + Main Arena) */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-0 flex flex-col md:flex-row gap-6 items-start">
        
        {/* Navigation Rail Panel */}
        <nav className="w-full md:w-56 shrink-0 flex flex-row md:flex-col gap-1.5 bg-white border-2 border-slate-200 p-2.5 rounded-3xl shadow-sm overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'challenges', label: 'Daily Challenges', icon: Flame, badge: challenges.length - stats.completedChallengesToday.length > 0 ? `${challenges.length - stats.completedChallengesToday.length} Left` : undefined },
            { id: 'srs', label: 'Vocabulary Deck', icon: Layers, badge: dueCards.length > 0 ? `${dueCards.length} Due` : undefined },
            { id: 'tutor', label: 'AI Conversation', icon: Sparkles }
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex items-center justify-between w-full text-left rounded-2xl px-4 py-3 text-xs font-bold select-none transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-indigo-600 text-white shadow-md font-bold scale-102' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-105'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4.5 w-4.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-red-50 text-red-500 font-bold border border-red-100'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Content panel study screen */}
        <main className="flex-1 w-full min-h-[500px]">
          {activeTab === 'dashboard' && (
            <DashboardView
              stats={stats}
              languages={LANGUAGES}
              dueCards={dueCards}
              totalCards={cards}
              onSelectTab={setActiveTab}
              onRefreshChallenges={handleGenerateChallenges}
            />
          )}

          {activeTab === 'challenges' && (
            <DailyChallengesView
              challenges={challenges}
              completedIds={stats.completedChallengesToday}
              targetLanguageCode={stats.targetLanguageCode}
              languages={LANGUAGES}
              onCompleteChallenge={handleCompleteChallenge}
              onAddCard={handleAddCard}
              onGenerateNewChallenges={handleGenerateChallenges}
              loadingChallenges={loadingChallenges}
            />
          )}

          {activeTab === 'srs' && (
            <SpacedRepetitionView
              cards={cards}
              dueCards={dueCards}
              targetLanguageCode={stats.targetLanguageCode}
              languages={LANGUAGES}
              onAddCard={handleAddCard}
              onUpdateCardSchedule={handleUpdateCardSchedule}
              onDeleteCard={handleDeleteCard}
              onGenerateAICards={handleGenerateAICards}
              loadingAi={loadingAiCards}
            />
          )}

          {activeTab === 'tutor' && (
            <AITutorView
              chatHistory={chatHistory}
              targetLanguageCode={stats.targetLanguageCode}
              languages={LANGUAGES}
              level={stats.level}
              onSendMessage={handleSendChatMessage}
              onAddCard={handleAddCard}
              loadingChat={loadingChat}
              onClearHistory={() => {
                clearCloudChats(chatHistory).catch(e => console.error("Cloud chats clear failed:", e));
                setChatHistory([]);
              }}
            />
          )}
        </main>
      </div>

      {/* Styled Footer matching Bento layout */}
      <footer className="mt-6 flex justify-between items-center bg-white border-2 border-slate-200 p-4.5 rounded-2xl shadow-sm">
        <p className="text-xs text-slate-400 font-medium">Next review session in <strong>2 hours 15 minutes</strong>. Fully powered by Google Gemini 3.5 Spaced Decays.</p>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs font-bold text-slate-600">Aura Engine: Optimal</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
