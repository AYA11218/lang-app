import React, { useState } from 'react';
import { Volume2, RefreshCw, Layers, PlusCircle, Check, HelpCircle, ArrowRight, Sparkles, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { SRSCard, Language } from '../types';
import VoiceRecorder from './VoiceRecorder';

interface SpacedRepetitionViewProps {
  cards: SRSCard[];
  dueCards: SRSCard[];
  targetLanguageCode: string;
  languages: Language[];
  onAddCard: (card: Omit<SRSCard, 'id' | 'createdAt' | 'languageCode'>) => void;
  onUpdateCardSchedule: (cardId: string, grade: 'again' | 'hard' | 'good' | 'easy') => void;
  onDeleteCard: (cardId: string) => void;
  onGenerateAICards: (topic: string) => Promise<void>;
  loadingAi: boolean;
}

export default function SpacedRepetitionView({
  cards,
  dueCards,
  targetLanguageCode,
  languages,
  onAddCard,
  onUpdateCardSchedule,
  onDeleteCard,
  onGenerateAICards,
  loadingAi,
}: SpacedRepetitionViewProps) {
  const currentLang = languages.find(l => l.code === targetLanguageCode) || languages[0];
  const langCards = cards.filter(c => c.languageCode === targetLanguageCode);

  // States
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [studyMode, setStudyMode] = useState<'due' | 'all' | 'idle'>('idle');
  const [showManualForm, setShowManualForm] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  
  // Manual Form State
  const [manualFront, setManualFront] = useState('');
  const [manualBack, setManualBack] = useState('');
  const [manualPron, setManualPron] = useState('');
  const [manualEx, setManualEx] = useState('');
  const [manualExTrans, setManualExTrans] = useState('');

  // Get active subset of cards to study in this active session
  const activeDeck = studyMode === 'due' ? dueCards : studyMode === 'all' ? langCards : [];
  const currentCard = activeDeck[currentIndex];

  // TTS Helper
  const handleSpeak = (text: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = currentLang.pronunciationLocale;
      window.speechSynthesis.speak(utterance);
    }
  };

  const startStudy = (mode: 'due' | 'all') => {
    if (mode === 'due' && dueCards.length === 0) return;
    if (mode === 'all' && langCards.length === 0) return;
    setIsFlipped(false);
    setCurrentIndex(0);
    setStudyMode(mode);
  };

  const handleGrade = (grade: 'again' | 'hard' | 'good' | 'easy') => {
    onUpdateCardSchedule(currentCard.id, grade);
    setIsFlipped(false);
    if (currentIndex + 1 >= activeDeck.length) {
      setStudyMode('idle');
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualFront.trim() || !manualBack.trim()) return;
    onAddCard({
      front: manualFront,
      back: manualBack,
      pronunciation: manualPron || undefined,
      example: manualEx || undefined,
      exampleTranslation: manualExTrans || undefined,
      interval: 0,
      repetitions: 0,
      easeFactor: 2.5,
      nextDueDate: new Date().toISOString(),
    });
    setManualFront('');
    setManualBack('');
    setManualPron('');
    setManualEx('');
    setManualExTrans('');
    setShowManualForm(false);
  };

  const handleGenerateAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    await onGenerateAICards(aiPrompt);
    setAiPrompt('');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-800">Spaced Repetition Cards (SRS)</h1>
          <p className="text-sm text-neutral-500">
            Study strategically. Master vocabulary and grammar patterns using memory intervals.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setShowManualForm(!showManualForm); }}
            className="flex items-center gap-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-4.5 py-2.5 rounded-2xl text-sm font-semibold transition-colors"
          >
            <Plus className="h-4 w-4" />
            {showManualForm ? 'Hide Form' : 'Add Card'}
          </button>
        </div>
      </div>

      {/* Manual Add Form Toggle */}
      {showManualForm && (
        <form onSubmit={handleCreateCard} className="bg-white p-6 rounded-3xl border-2 border-slate-200 space-y-4 shadow-sm">
          <h3 className="font-display font-bold text-slate-800 text-base">Add Custom Spaced Repetition Card</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Target Word / Phrase ({currentLang.name})</label>
              <input
                required
                type="text"
                placeholder={currentLang.placeholderText}
                value={manualFront}
                onChange={e => setManualFront(e.target.value)}
                className="w-full bg-slate-50 rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-850"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Native Translation (English)</label>
              <input
                required
                type="text"
                placeholder="Meaning of the phrase..."
                value={manualBack}
                onChange={e => setManualBack(e.target.value)}
                className="w-full bg-slate-50 rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-850"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Phonetic Spelling / Helper</label>
              <input
                type="text"
                placeholder="Spoken cue..."
                value={manualPron}
                onChange={e => setManualPron(e.target.value)}
                className="w-full bg-slate-50 rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono text-xs text-slate-850"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Example Sentence & Meaning Context</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder={`Sentence in ${currentLang.name}`}
                  value={manualEx}
                  onChange={e => setManualEx(e.target.value)}
                  className="flex-1 bg-slate-50 rounded-xl border-2 border-slate-200 px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-850"
                />
                <input
                  type="text"
                  placeholder="Sentence translation"
                  value={manualExTrans}
                  onChange={e => setManualExTrans(e.target.value)}
                  className="flex-1 bg-slate-50 rounded-xl border-2 border-slate-200 px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-850"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowManualForm(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
            >
              Save Card
            </button>
          </div>
        </form>
      )}

      {/* Main Study Segment / Deck choice */}
      {studyMode === 'idle' ? (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Deck Stats Cards */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white border-2 border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="bg-red-50 text-red-500 border border-red-200 px-3.5 py-1.5 rounded-2xl font-bold text-xl leading-none">
                    {dueCards.length}
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-slate-850 text-lg">Active Review Required</h2>
                    <p className="text-xs text-slate-400">Cards scheduled for recall intervals today.</p>
                  </div>
                </div>
                <p className="text-sm text-slate-500 max-w-md">
                  We highly recommend finishing reviews first. Memory decay occurs exponentially if intervals are missed!
                </p>
              </div>

              <button
                disabled={dueCards.length === 0}
                onClick={() => startStudy('due')}
                className={`flex items-center gap-2 font-display font-bold px-6 py-3.5 rounded-2xl text-sm shadow-md transition-all active:scale-95 ${
                  dueCards.length > 0 
                    ? 'bg-slate-850 hover:bg-slate-900 text-white cursor-pointer' 
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200'
                }`}
              >
                Start Study Session
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* AI Generator Box with Abstract Circles decoration */}
            <div className="rounded-3xl p-8 bg-indigo-600 text-white shadow-lg relative overflow-hidden">
              <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-500 rounded-full opacity-50 z-0 pointer-events-none" />
              <div className="absolute right-10 top-10 w-24 h-24 bg-indigo-400 rounded-full opacity-30 z-0 pointer-events-none" />
              
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 fill-yellow-400 text-yellow-400 animate-pulse" />
                  <span className="text-xs font-bold tracking-widest uppercase text-indigo-100">Supercharged AI Generator</span>
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold tracking-tight">Generate Custom AI Flashcards</h3>
                  <p className="text-xs text-indigo-150 max-w-lg mt-1 font-medium leading-relaxed">
                    Ask Gemini to generate 5 high-yield spaced repetition cards for any topic, hobby, grammar block, or scenario you desire!
                  </p>
                </div>

                <form onSubmit={handleGenerateAI} className="flex gap-2">
                  <input
                    required
                    type="text"
                    disabled={loadingAi}
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    placeholder="e.g., 'At the doctor's office', 'Ordering beer', 'Restaurant vocabulary'"
                    className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 text-white placeholder-white/50 backdrop-blur-md"
                  />
                  <button
                    type="submit"
                    disabled={loadingAi || !aiPrompt.trim()}
                    className="bg-white hover:bg-slate-50 text-indigo-600 font-display font-extrabold px-5 py-3 rounded-2xl text-sm shadow-md transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
                  >
                    {loadingAi ? 'AI Creating...' : 'Generate Deck'}
                  </button>
                </form>
              </div>
            </div>

            {/* List of current cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-slate-800 text-sm uppercase tracking-wider">Decks Overview ({langCards.length} cards)</h3>
                {langCards.length > 0 && (
                  <button
                    onClick={() => startStudy('all')}
                    className="text-xs font-bold text-indigo-650 hover:text-indigo-750 flex items-center gap-1 cursor-pointer"
                  >
                    Study All Cards
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {langCards.length === 0 ? (
                <div className="text-center p-8 border-2 border-dashed border-slate-300 rounded-3xl text-slate-400 bg-white">
                  <Layers className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-bold text-slate-600">Your flashcard deck is empty.</p>
                  <p className="text-xs text-slate-400 mt-1">Click Add Card or type an AI topic above to kickstart your spaced-repetition program!</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 max-h-[350px] overflow-y-auto pr-1">
                  {langCards.map((card) => (
                    <div key={card.id} className="bg-white border-2 border-slate-200 p-4.5 rounded-2xl flex items-start justify-between shadow-sm group hover:border-indigo-400 hover:shadow-md transition-all duration-250">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-805 text-sm leading-tight">{card.front}</span>
                          <button
                            id={`listen-btn-list-${card.id}`}
                            onClick={(e) => handleSpeak(card.front, e)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-600 hover:text-indigo-700 font-bold transition-all cursor-pointer text-[11px]"
                            title="Hear pronunciation"
                          >
                            <Volume2 className="h-3.5 w-3.5" />
                            <span>Listen</span>
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 font-semibold">{card.back}</p>
                        <div className="flex gap-2 pt-1 text-[10px] font-mono font-bold text-slate-400">
                          <span>Reps: {card.repetitions}</span>
                          <span>•</span>
                          <span>Interval: {card.interval}d</span>
                        </div>
                      </div>
                      <button
                        onClick={() => onDeleteCard(card.id)}
                        className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all cursor-pointer"
                        title="Delete card"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tips panel */}
          <div className="bg-slate-50 border-2 border-slate-200 rounded-3xl p-6 h-fit space-y-4 shadow-sm">
            <h4 className="font-display font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
              <AlertCircle className="h-5 w-5 text-indigo-500 animate-pulse" />
              Spacing Curve Tips
            </h4>
            <div className="space-y-4 font-sans text-xs text-slate-500 leading-relaxed font-semibold">
              <p>
                The <strong>SM-2 Algorithm</strong> schedules cards based on cognitive recall strength using exponential space decays.
              </p>
              <div className="border-l-2 border-indigo-200 pl-3.5 space-y-3">
                <p>
                  <strong className="text-indigo-650">Again (Gr 1):</strong> Resets card memory to active learning. Retries soon.
                </p>
                <p>
                  <strong className="text-indigo-650">Hard (Gr 2):</strong> Small recall. Review in 12 hours.
                </p>
                <p>
                  <strong className="text-indigo-650">Good (Gr 3):</strong> Standard correct recall. Solidifies memory block.
                </p>
                <p>
                  <strong className="text-indigo-650">Easy (Gr 4):</strong> High recall index. Spacing is multiplied by 1.3x.
                </p>
              </div>
              <p className="bg-indigo-50 border border-indigo-150 text-indigo-700 p-3.5 rounded-2xl font-semibold shadow-sm leading-relaxed">
                Tip: Adding example sentences gives semantic context, which makes retrieval 40% easier and accelerates mastery!
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* The Active Card-Study Interface: immersive, highly stylized flashcard */
        <div className="max-w-xl mx-auto space-y-6">
          <div className="flex items-center justify-between text-sm text-neutral-500">
            <span>Progress: <strong className="text-neutral-800 font-mono">{currentIndex + 1} / {activeDeck.length}</strong></span>
            <button
              onClick={() => { setStudyMode('idle'); }}
              className="text-xs text-red-500 font-bold hover:underline"
            >
              Quit Session
            </button>
          </div>

          {/* Flashcard Component */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="perspective-1000 w-full h-[320px] cursor-pointer group select-none"
          >
            <div className={`relative w-full h-full transform-style-3d transition-transform duration-500 ease-out ${isFlipped ? 'rotate-y-180' : ''}`}>
              
              {/* FRONT SIDE */}
              <div className="absolute w-full h-full backface-hidden bg-white border-2 border-slate-200 shadow-md rounded-3xl p-8 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-indigo-500">{currentLang.name}</span>
                  <button
                    id={`listen-btn-front-${currentCard.id}`}
                    onClick={(e) => handleSpeak(currentCard.front, e)}
                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-indigo-200 font-bold text-xs transition-all cursor-pointer"
                    title="Hear pronunciation"
                  >
                    <Volume2 className="h-4 w-4 animate-pulse text-indigo-500" />
                    <span>Listen</span>
                  </button>
                </div>

                <div className="text-center py-6">
                  <h2 className="font-display text-3xl font-bold tracking-tight text-neutral-800">{currentCard.front}</h2>
                  {currentCard.pronunciation && (
                    <span className="mt-2 block text-sm font-mono text-neutral-400 font-medium">/ {currentCard.pronunciation} /</span>
                  )}
                </div>

                <div className="text-center text-xs text-neutral-400 font-semibold animate-pulse">
                  Tap card to reveal definition
                </div>
              </div>

              {/* BACK SIDE */}
              <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-slate-900 border-2 border-slate-800 shadow-xl rounded-3xl p-8 text-white flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">English Translation</span>
                  <button
                    id={`listen-btn-back-${currentCard.id}`}
                    onClick={(e) => handleSpeak(currentCard.front, e)}
                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer"
                    title="Hear pronunciation"
                  >
                    <Volume2 className="h-4 w-4 text-emerald-400" />
                    <span>Listen</span>
                  </button>
                </div>

                <div className="text-center py-4 space-y-4">
                  <h2 className="font-display text-3xl font-bold tracking-tight text-white">{currentCard.back}</h2>
                  
                  {currentCard.example && (
                    <div className="px-4 py-2.5 rounded-2xl bg-white/5 border border-white/5 max-w-sm mx-auto">
                      <p className="text-sm font-sans italic text-neutral-300 font-medium font-sans">"{currentCard.example}"</p>
                      {currentCard.exampleTranslation && (
                        <p className="text-[11px] text-neutral-400 mt-0.5">{currentCard.exampleTranslation}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-center text-xs text-neutral-500 font-semibold">
                  Tap to flip front again
                </div>
              </div>

            </div>
          </div>

          {/* Speaks / Practice audio voice recorder component */}
          <VoiceRecorder
            key={currentCard.id}
            targetText={currentCard.front}
            placeholder={`Practice saying "${currentCard.front}"`}
            className="my-3 border-2 border-slate-200"
          />

          {/* Action Feedback SM-2 Decision Buttons */}
          {isFlipped ? (
            <div className="grid grid-cols-4 gap-2 animate-fade-in">
              <button
                onClick={() => handleGrade('again')}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-red-100 hover:bg-red-200 border border-red-200 text-red-800 transition-colors cursor-pointer"
              >
                <span className="font-display text-sm font-bold">Again</span>
                <span className="text-[9px] uppercase tracking-wider text-red-500 mt-1">1 Min</span>
              </button>
              <button
                onClick={() => handleGrade('hard')}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-orange-100 hover:bg-orange-200 border border-orange-200 text-orange-800 transition-colors cursor-pointer"
              >
                <span className="font-display text-sm font-bold">Hard</span>
                <span className="text-[9px] uppercase tracking-wider text-orange-500 mt-1">12 Hrs</span>
              </button>
              <button
                onClick={() => handleGrade('good')}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 text-emerald-800 transition-colors cursor-pointer"
              >
                <span className="font-display text-sm font-bold">Good</span>
                <span className="text-[9px] uppercase tracking-wider text-emerald-500 mt-1">SPS+</span>
              </button>
              <button
                onClick={() => handleGrade('easy')}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-blue-100 hover:bg-blue-200 border border-blue-200 text-blue-800 transition-colors cursor-pointer"
              >
                <span className="font-display text-sm font-bold">Easy</span>
                <span className="text-[9px] uppercase tracking-wider text-blue-500 mt-1">EAS+</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsFlipped(true)}
              className="w-full py-4 rounded-2xl bg-neutral-900 text-white hover:bg-neutral-850 font-display font-bold text-center border-t border-white/5 shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <RefreshCw className="h-5 w-5 animate-spin" />
              Flip Flashcard to Choose Recall Grade
            </button>
          )}

        </div>
      )}
    </div>
  );
}
