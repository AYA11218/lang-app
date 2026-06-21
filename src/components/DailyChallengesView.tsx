import React, { useState } from 'react';
import { Volume2, Sparkles, CheckCircle2, AlertCircle, HelpCircle, Layers, ArrowRight, RefreshCw, BookmarkPlus } from 'lucide-react';
import { DailyChallenge, Language } from '../types';

interface DailyChallengesViewProps {
  challenges: DailyChallenge[];
  completedIds: string[];
  targetLanguageCode: string;
  languages: Language[];
  onCompleteChallenge: (challengeId: string, gotRightFirstTime: boolean) => void;
  onAddCard: (card: {
    front: string;
    back: string;
    pronunciation?: string;
    example?: string;
    exampleTranslation?: string;
  }) => void;
  onGenerateNewChallenges: () => void;
  loadingChallenges: boolean;
}

export default function DailyChallengesView({
  challenges,
  completedIds,
  targetLanguageCode,
  languages,
  onCompleteChallenge,
  onAddCard,
  onGenerateNewChallenges,
  loadingChallenges,
}: DailyChallengesViewProps) {
  const currentLang = languages.find(l => l.code === targetLanguageCode) || languages[0];

  // Game States
  const [activeIdx, setActiveIdx] = useState(0);
  
  // Game Play States
  const [scrambleAnswer, setScrambleAnswer] = useState<string[]>([]);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [hasSavedCard, setHasSavedCard] = useState<Record<string, boolean>>({});

  const activeChallenge = challenges[activeIdx];
  const isCompleted = activeChallenge ? completedIds.includes(activeChallenge.id) : false;

  // Speak Audio text for listening and pronunciation cues
  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = currentLang.pronunciationLocale;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Scramble actions
  const addWordToSelection = (word: string) => {
    if (checked) return;
    setScrambleAnswer((prev) => [...prev, word]);
  };

  const removeWordFromSelection = (index: number) => {
    if (checked) return;
    setScrambleAnswer((prev) => prev.filter((_, i) => i !== index));
  };

  // Validation function
  const cleanStr = (s: string) => s.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?¿¡]/g, "");

  const handleCheck = () => {
    if (!activeChallenge) return;
    let answerText = '';

    if (activeChallenge.type === 'scramble') {
      answerText = scrambleAnswer.join(' ');
    } else {
      answerText = typedAnswer;
    }

    const checkPass = cleanStr(answerText) === cleanStr(activeChallenge.correctAnswer);
    setIsCorrect(checkPass);
    setChecked(true);

    if (checkPass && !isCompleted) {
      onCompleteChallenge(activeChallenge.id, true);
    }
  };

  const handleNext = () => {
    setChecked(false);
    setIsCorrect(false);
    setShowAnswer(false);
    setScrambleAnswer([]);
    setTypedAnswer('');
    
    if (activeIdx + 1 < challenges.length) {
      setActiveIdx(prev => prev + 1);
    } else {
      setActiveIdx(0); // wrap around
    }
  };

  const handleSaveToSRS = () => {
    if (!activeChallenge) return;
    onAddCard({
      front: activeChallenge.correctAnswer,
      back: activeChallenge.translation,
      example: activeChallenge.correctAnswer,
      exampleTranslation: activeChallenge.translation,
    });
    setHasSavedCard(prev => ({ ...prev, [activeChallenge.id]: true }));
  };

  if (loadingChallenges) {
    return (
      <div className="text-center py-16 space-y-4">
        <RefreshCw className="h-10 w-10 mx-auto text-indigo-500 animate-spin" />
        <h3 className="font-display font-medium text-neutral-800">Gemini is designing challenges...</h3>
        <p className="text-sm text-neutral-500">Creating customized grammar, listening transcription, and reading exercises.</p>
      </div>
    );
  }

  if (challenges.length === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed border-neutral-200 rounded-3xl p-8 max-w-md mx-auto space-y-4">
        <HelpCircle className="h-12 w-12 mx-auto text-neutral-300" />
        <h3 className="font-display font-bold text-neutral-800">No challenges detected</h3>
        <p className="text-sm text-neutral-500">Could not initialize standard local templates. Try creating fresh AI challenges now!</p>
        <button
          onClick={onGenerateNewChallenges}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-6 py-3 rounded-2xl shadow-md transition-all flex items-center gap-2 mx-auto"
        >
          <Sparkles className="h-4 w-4 text-yellow-300 fill-yellow-300" />
          Generate New AI Challenges
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">Dynamic Daily Challenges</h1>
          <p className="text-sm text-slate-500">
            Hone grammar structure, speech transcribing, and contextual vocabulary. Claims <span className="font-bold text-slate-700 font-mono">+15 XP</span> per exercise.
          </p>
        </div>
        <button
          onClick={onGenerateNewChallenges}
          className="flex items-center gap-2 bg-white hover:bg-slate-100 text-indigo-600 border-2 border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Regenerate New AI Exercises
        </button>
      </div>

      {/* Progress Circles Top Guide */}
      <div className="grid grid-cols-3 gap-2.5 max-w-sm">
        {challenges.map((c, i) => {
          const finished = completedIds.includes(c.id);
          const isSelected = i === activeIdx;
          return (
            <button
              key={c.id}
              onClick={() => {
                setActiveIdx(i);
                setChecked(false);
                setIsCorrect(false);
                setShowAnswer(false);
                setScrambleAnswer([]);
                setTypedAnswer('');
              }}
              className={`py-3.5 rounded-2xl font-display font-bold text-xs select-none shadow-sm transition-all text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                isSelected 
                  ? 'bg-slate-850 text-white font-black border-2 border-slate-850' 
                  : finished 
                    ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-250' 
                    : 'bg-white text-slate-500 hover:bg-slate-100 border-2 border-slate-200'
              }`}
            >
              <span>Activity {i + 1}</span>
              <span className="text-[9px] uppercase tracking-wider font-mono opacity-80">
                {c.type === 'scramble' ? 'Grammar' : c.type === 'listening' ? 'Listening' : 'Translation'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Immersive Play Arena */}
      <div className="p-8 rounded-3xl bg-white border-2 border-slate-200 shadow-md space-y-6">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 font-mono">
            Exercise {activeIdx + 1} of {challenges.length}
          </span>
          {isCompleted && (
            <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 border border-emerald-100">
              <CheckCircle2 className="h-3.5 w-3.5" /> Completed (+15 XP Claimed)
            </span>
          )}
        </div>

        {/* Task Question Segment */}
        <div className="space-y-2">
          <h2 className="font-display font-bold text-neutral-800 text-lg leading-snug">
            {activeChallenge.question}
          </h2>
          <p className="text-sm text-neutral-500">
            <strong>Hint:</strong> {activeChallenge.hint}
          </p>
        </div>

        {/* SCRAMBLE GRAMMAR COMPONENT Layout */}
        {activeChallenge.type === 'scramble' && (
          <div className="space-y-6">
            {/* Scramble build target zone */}
            <div className="min-h-[72px] p-4.5 rounded-2xl bg-neutral-50/50 border border-neutral-200/50 flex flex-wrap gap-2 items-center">
              {scrambleAnswer.length === 0 ? (
                <span className="text-xs text-neutral-400 font-medium italic">Click the scrambled words below to formulate your translation...</span>
              ) : (
                scrambleAnswer.map((w, idx) => (
                  <button
                    key={idx}
                    disabled={checked}
                    onClick={() => removeWordFromSelection(idx)}
                    className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition-colors animate-fade-in flex items-center gap-1 shadow-sm disabled:opacity-85"
                  >
                    {w}
                  </button>
                ))
              )}
            </div>

            {/* Word choices banks */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block">Scrambled Word Bank</label>
              <div className="flex flex-wrap gap-2.5">
                {activeChallenge.scrambledWords?.map((word, idx) => {
                  const selectCount = scrambleAnswer.filter(w => w === word).length;
                  const totalInBank = activeChallenge.scrambledWords?.filter(w => w === word).length || 1;
                  const exhausted = selectCount >= totalInBank;

                  return (
                    <button
                      key={idx}
                      disabled={exhausted || checked}
                      onClick={() => addWordToSelection(word)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold border shadow-sm transition-all select-none ${
                        exhausted 
                          ? 'bg-neutral-100 text-neutral-300 border-neutral-100 cursor-not-allowed scale-95 shadow-none' 
                          : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 cursor-pointer active:scale-95'
                      }`}
                    >
                      {word}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* LISTENING TRANSCRIBER COMPONENT */}
        {activeChallenge.type === 'listening' && (
          <div className="space-y-4">
            {/* Audio speaker pad */}
            <div className="bg-neutral-55/40 border border-neutral-100 p-6 rounded-2xl flex flex-col items-center justify-center space-y-3 shadow-inner max-w-sm mx-auto">
              <button
                type="button"
                onClick={() => handleSpeak(activeChallenge.audioText || '')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white h-14 w-14 rounded-full flex items-center justify-center shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all text-center cursor-pointer"
                title="Play phrase"
              >
                <Volume2 className="h-6 w-6" />
              </button>
              <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider animate-pulse">Click to listen aloud</span>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Type what you heard</label>
              <input
                type="text"
                disabled={checked}
                value={typedAnswer}
                onChange={e => setTypedAnswer(e.target.value)}
                placeholder="Type the foreign transcript..."
                className="w-full bg-white rounded-xl border border-neutral-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
              />
            </div>
          </div>
        )}

        {/* TRANSLATION TEXT COMPONENT */}
        {activeChallenge.type === 'translation' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Provide Translation in {currentLang.name}</label>
              <input
                type="text"
                disabled={checked}
                value={typedAnswer}
                onChange={e => setTypedAnswer(e.target.value)}
                placeholder={`Type the equivalent ${currentLang.name} phrase...`}
                className="w-full bg-white rounded-xl border border-neutral-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
              />
            </div>
          </div>
        )}

        {/* Arena buttons block (Check vs Next) */}
        {!checked ? (
          <button
            onClick={handleCheck}
            disabled={
              activeChallenge.type === 'scramble' 
                ? scrambleAnswer.length === 0 
                : !typedAnswer.trim()
            }
            className="w-full py-3.5 bg-neutral-900 border-t border-white/5 shadow-md hover:bg-neutral-800 text-white font-display font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Submit Practice Answer
          </button>
        ) : (
          <div className="space-y-4.5 animate-fade-in">
            {/* Feedback alert box */}
            <div className={`p-5 rounded-2xl flex items-start gap-4 border ${
              isCorrect 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                : 'bg-red-50 border-red-100 text-red-800'
            }`}>
              {isCorrect ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1.5">
                <h4 className="font-display font-bold text-sm">
                  {isCorrect ? 'Stellar performance! Correct Answer.' : 'Almost there! Take a peak at the breakdown.'}
                </h4>
                <div className="text-xs space-y-1 opacity-90 leading-relaxed font-sans mt-1">
                  <p><strong>Correct Solution:</strong> "{activeChallenge.correctAnswer}"</p>
                  <p><strong>Translation:</strong> "{activeChallenge.translation}"</p>
                  <p className="mt-2 text-neutral-600 bg-white/50 p-2.5 rounded-xl border border-neutral-100/50">
                    <strong>Grammar Note:</strong> {activeChallenge.explanation}
                  </p>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    onClick={() => handleSpeak(activeChallenge.correctAnswer)}
                    className="flex items-center gap-1.5 bg-white border border-neutral-100 px-3.5 py-1.5 rounded-xl text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition-colors shadow-sm"
                  >
                    <Volume2 className="h-3.5 w-3.5 text-indigo-500" /> Pronounce
                  </button>
                  <button
                    onClick={handleSaveToSRS}
                    disabled={hasSavedCard[activeChallenge.id]}
                    className="flex items-center gap-1.5 bg-white border border-neutral-100 px-3.5 py-1.5 rounded-xl text-xs font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-55 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    <BookmarkPlus className="h-3.5 w-3.5 text-emerald-500" /> 
                    {hasSavedCard[activeChallenge.id] ? 'Saved to SRS!' : 'Bookmark to Spacing Cards'}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white font-display font-bold text-sm rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-colors"
            >
              Move to Next Lesson Activity
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
