import React from 'react';
import { Award, Flame, Zap, CheckCircle2, ChevronRight, BookOpen, Clock, AlertTriangle, Sparkles } from 'lucide-react';
import { UserStats, SRSCard, Language } from '../types';

interface DashboardViewProps {
  stats: UserStats;
  languages: Language[];
  dueCards: SRSCard[];
  totalCards: SRSCard[];
  onSelectTab: (tab: 'dashboard' | 'srs' | 'challenges' | 'tutor') => void;
  onRefreshChallenges: () => void;
}

export default function DashboardView({
  stats,
  languages,
  dueCards,
  totalCards,
  onSelectTab,
  onRefreshChallenges,
}: DashboardViewProps) {
  const currentLang = languages.find(l => l.code === stats.targetLanguageCode) || languages[0];

  // Calculate milestones
  const nextLevelXp = stats.xp < 100 ? 100 : stats.xp < 300 ? 300 : stats.xp < 600 ? 600 : stats.xp < 1000 ? 1000 : stats.xp < 2000 ? 2000 : 5000;
  const currentLevelMin = stats.xp < 100 ? 0 : stats.xp < 300 ? 100 : stats.xp < 600 ? 300 : stats.xp < 1000 ? 600 : stats.xp < 2000 ? 1000 : 2000;
  const levelNum = stats.xp < 100 ? 1 : stats.xp < 300 ? 2 : stats.xp < 600 ? 3 : stats.xp < 1000 ? 4 : stats.xp < 2000 ? 5 : 6;
  const progressPercent = Math.min(100, Math.max(0, ((stats.xp - currentLevelMin) / (nextLevelXp - currentLevelMin)) * 100));

  // Count mastered, active and new cards
  const masteredCardsCount = totalCards.filter(c => c.repetitions >= 4 && c.languageCode === stats.targetLanguageCode).length;
  const learningCardsCount = totalCards.filter(c => c.repetitions > 0 && c.repetitions < 4 && c.languageCode === stats.targetLanguageCode).length;
  const newCardsCount = totalCards.filter(c => c.repetitions === 0 && c.languageCode === stats.targetLanguageCode).length;
  const cardsInThisLang = totalCards.filter(c => c.languageCode === stats.targetLanguageCode);

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      
      {/* Bento Main Grid Row 1: Spaced Repetition Hero + Streak Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Primary Spaced Repetition Card (Col Span 8) */}
        <div className="lg:col-span-8 bg-indigo-600 rounded-3xl p-8 relative flex flex-col justify-between overflow-hidden text-white shadow-md">
          {/* Abstract background decorative circles */}
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-500 rounded-full opacity-50 z-0 pointer-events-none"></div>
          <div className="absolute right-10 top-10 w-24 h-24 bg-indigo-400 rounded-full opacity-30 z-0 pointer-events-none"></div>
          
          <div className="absolute right-36 bottom-16 hidden xl:flex flex-col gap-2 rotate-12 opacity-40 z-0 pointer-events-none">
            <div className="bg-white/10 backdrop-blur-md p-2.5 rounded-lg border border-white/20 w-32 font-mono text-[11px] text-white select-none">hola - hello</div>
            <div className="bg-white/10 backdrop-blur-md p-2.5 rounded-lg border border-white/20 w-32 ml-4 font-mono text-[11px] text-white select-none">merci - thank you</div>
            <div className="bg-white/10 backdrop-blur-md p-2.5 rounded-lg border border-white/20 w-32 -ml-2 font-mono text-[11px] text-white select-none">mañana - morning</div>
          </div>
          
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-sm font-semibold backdrop-blur-md">
              <span className="text-lg">{currentLang.flag}</span>
              <span>Practicing {currentLang.name}</span>
            </div>
            <h2 className="text-3xl font-display font-black leading-tight tracking-tight">Bonjour, Ayan! Keep up the flame.</h2>
            <p className="text-indigo-100 max-w-sm text-xs font-medium">
              Spaced repetition guarantees that words enter long-term storage perfectly. Spend just {dueCards.length > 0 ? '5-10' : '2'} minutes today to strengthen your neurological pathways.
            </p>
          </div>
          
          <div className="relative z-10 flex flex-wrap gap-4 mt-8">
            <button 
              onClick={() => onSelectTab('srs')}
              className="px-6 py-3 bg-white text-indigo-600 font-bold rounded-xl shadow-lg hover:bg-slate-50 transition-all cursor-pointer active:scale-95"
            >
              Start Practice
            </button>
            <button 
              onClick={() => onSelectTab('challenges')}
              className="px-6 py-3 bg-indigo-500/50 text-white font-bold rounded-xl border border-indigo-400 hover:bg-white/10 transition-all cursor-pointer active:scale-95"
            >
              Manage Deck
            </button>
          </div>
        </div>

        {/* Streak Bento Card (Col Span 4) */}
        <div className="lg:col-span-4 bg-orange-50 border-2 border-orange-200 rounded-3xl p-8 flex flex-col justify-center items-center text-center shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 h-16 w-16 rounded-full bg-orange-100/30 blur-md pointer-events-none" />
          <div className="text-5xl mb-2 animate-bounce">🔥</div>
          <div className="text-4xl font-display font-black text-orange-600 leading-none">{stats.streak}</div>
          <div className="text-xs font-bold text-orange-850 uppercase tracking-widest mt-2 font-display">Day Streak</div>
          <p className="text-xs text-orange-600/80 mt-2 font-medium max-w-[180px] leading-relaxed">
            {stats.streak >= 3 ? "Consistent consistency! Graduation badge awarded." : "Keep up daily studies to trigger multiplier awards!"}
          </p>
        </div>

      </div>

      {/* Bento Main Grid Row 2: Achievements, progress stats */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        
        {/* Level Progression (Span 4) */}
        <div className="md:col-span-4 bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-slate-850 flex items-center gap-2">
                <Award className="h-5 w-5 text-indigo-500" />
                Level Progression
              </h3>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                Level {levelNum}
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>XP PROGRESS</span>
                <span>{stats.xp} / {nextLevelXp} XP</span>
              </div>
              <div className="overflow-hidden h-3 flex rounded-full bg-slate-100 border border-slate-200/60">
                <div
                  style={{ width: `${progressPercent}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-600 rounded-full transition-all duration-500 ease-out"
                />
              </div>
            </div>
          </div>
          
          <p className="text-xs text-slate-500 mt-4 leading-relaxed">
            Gain <span className="font-bold text-slate-700">{nextLevelXp - stats.xp} more XP</span> to advance your ranks and secure badge multipliers.
          </p>
        </div>

        {/* Daily Tasks Checklist (Span 4) */}
        <div className="md:col-span-4 bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-display font-bold text-slate-850 mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Daily Challenges
            </h3>
            <div className="space-y-2">
              {[
                { label: "Complete Challenges", done: stats.completedChallengesToday.length >= 3, detail: `${stats.completedChallengesToday.length}/3` },
                { label: "Study Active SRS Cards", done: dueCards.length === 0, detail: `${stats.completedReviewsTodayCount} Done` },
                { label: "AI Conversations", done: stats.badges.includes("speech_badge"), detail: stats.badges.includes("speech_badge") ? "Active" : "Practice" }
              ].map((task, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50/50 hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className={`h-5 w-5 shrink-0 ${task.done ? 'text-emerald-500 fill-emerald-50' : 'text-slate-300'}`} />
                    <span className={`text-xs font-semibold ${task.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{task.label}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono font-bold shrink-0">{task.detail}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Vocabulary master list (Span 4) styled exactly like the green design card from HTML */}
        <div className="md:col-span-4 bg-emerald-500 text-white rounded-3xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-400 rounded-full opacity-30 z-0 pointer-events-none" />
          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-100 leading-none">Vocabulary Mastered</p>
            <p className="text-4xl font-display font-black tracking-tight mt-1 mb-4">{cardsInThisLang.length}</p>
            
            <div className="space-y-2 text-xs font-sans">
              <div className="flex justify-between items-center border-t border-emerald-400/50 pt-2 opacity-95">
                <span>Pending Reviews</span>
                <span className="font-extrabold bg-white/10 px-2 py-0.5 rounded-md">{dueCards.length}</span>
              </div>
              <div className="flex justify-between items-center border-t border-emerald-400/50 pt-2 opacity-95">
                <span>Strong Memory (Mastered)</span>
                <span className="font-extrabold bg-white/10 px-2 py-0.5 rounded-md">{masteredCardsCount}</span>
              </div>
              <div className="flex justify-between items-center border-t border-emerald-400/50 pt-2 opacity-95">
                <span>New Vocabulary Added</span>
                <span className="font-extrabold bg-white/10 px-2 py-0.5 rounded-md">{newCardsCount}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Primary Navigation Cards */}
      <div className="pt-2">
        <h2 className="font-display text-xl font-bold text-slate-800 mb-4">Start Learning Activities</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          
          {/* Daily Challenges card */}
          <div 
            onClick={() => onSelectTab('challenges')}
            className="group relative cursor-pointer overflow-hidden rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-sm hover:translate-y-[-2px] hover:border-indigo-400 hover:shadow-md transition-all duration-300"
          >
            <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-yellow-500/5 group-hover:bg-yellow-500/10 transition-colors blur-lg" />
            <div className="flex flex-col h-full justify-between gap-4">
              <div className="flex items-center justify-between">
                <div className="rounded-2xl bg-yellow-50 text-yellow-600 border border-yellow-200 p-3 group-hover:scale-110 transition-transform">
                  <Flame className="h-6 w-6" />
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 group-hover:translate-x-1.5 transition-transform" />
              </div>
              <div className="space-y-1">
                <h4 className="font-display font-bold text-slate-800">Daily Challenges</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  Complete scrambled grammar, listening comprehensions, and trans-writing to claim streak XP bonuses.
                </p>
              </div>
              <span className="text-[10px] text-yellow-750 font-bold uppercase tracking-wider inline-flex items-center gap-1 bg-yellow-50 self-start px-2 py-0.5 rounded-full border border-yellow-100">
                +15 XP Per Task
              </span>
            </div>
          </div>

          {/* Flashcard reviews */}
          <div 
            onClick={() => onSelectTab('srs')}
            className="group relative cursor-pointer overflow-hidden rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-sm hover:translate-y-[-2px] hover:border-indigo-400 hover:shadow-md transition-all duration-300"
          >
            <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors blur-lg" />
            <div className="flex flex-col h-full justify-between gap-4">
              <div className="flex items-center justify-between">
                <div className="rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 p-3 group-hover:scale-110 transition-transform">
                  <BookOpen className="h-6 w-6" />
                </div>
                {dueCards.length > 0 ? (
                  <span className="flex h-2.5 w-2.5 rounded-full bg-red-500 ring-4 ring-red-50 animate-pulse" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-slate-400 group-hover:translate-x-1.5 transition-transform" />
                )}
              </div>
              <div className="space-y-1">
                <h4 className="font-display font-bold text-slate-800">Spaced Repetition Review</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  Study vocabulary cards strategically structured by memory decay. Add custom phrase lists dynamically.
                </p>
              </div>
              <span className="text-[10px] text-emerald-750 font-bold uppercase tracking-wider inline-flex items-center bg-emerald-50 self-start px-2 py-0.5 rounded-full border border-emerald-100">
                {dueCards.length} review cards pending
              </span>
            </div>
          </div>

          {/* Dialog assistant */}
          <div 
            onClick={() => onSelectTab('tutor')}
            className="group relative cursor-pointer overflow-hidden rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-sm hover:translate-y-[-2px] hover:border-indigo-400 hover:shadow-md transition-all duration-300"
          >
            <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors blur-lg" />
            <div className="flex flex-col h-full justify-between gap-4">
              <div className="flex items-center justify-between">
                <div className="rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-250 p-3 group-hover:scale-110 transition-transform">
                  <Sparkles className="h-6 w-6" />
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 group-hover:translate-x-1.5 transition-transform" />
              </div>
              <div className="space-y-1">
                <h4 className="font-display font-bold text-slate-800">AI Dialogue Tutor</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  Talk to "Aura" your dynamic native speaker tutor. Tap any sentence to flip translate, break grammar, or convert into SRS cards!
                </p>
              </div>
              <span className="text-[10px] text-indigo-750 font-bold uppercase tracking-wider inline-flex items-center bg-indigo-50 self-start px-2 py-0.5 rounded-full border border-indigo-100">
                Interactive Speech & Chat
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Badges Box Section */}
      {stats.badges.length > 0 && (
        <div className="border-2 border-slate-200 rounded-3xl p-6 bg-gradient-to-r from-slate-50 to-white shadow-sm">
          <h2 className="font-display text-lg font-bold text-slate-800 mb-4">Your Achievements Badges</h2>
          <div className="flex flex-wrap gap-4">
            {stats.badges.map((badge, idx) => {
              const bDetails = getBadgeDetails(badge);
              return (
                <div key={idx} className="flex items-center gap-3 bg-white border border-slate-150 shadow-sm px-4 py-3 rounded-2xl">
                  <span className="text-2xl">{bDetails.emoji}</span>
                  <div>
                    <h5 className="text-sm font-bold text-slate-850">{bDetails.name}</h5>
                    <p className="text-[10px] text-slate-405 font-medium">{bDetails.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper calculation
function deckCountAtBeginning(cards: SRSCard[], completedReviews: number): number {
  return Math.max(0, cards.filter(c => c.repetitions === 0).length - completedReviews);
}

export function getBadgeDetails(id: string): { name: string; description: string; emoji: string } {
  switch (id) {
    case 'first_challenge':
      return { name: 'Pioneer Flame', description: 'Finished first daily challenge.', emoji: '🚀' };
    case 'perfect_challenge':
      return { name: 'Grammar Master', description: 'Completed a practice cleanly.', emoji: '🏆' };
    case 'srs_conqueror':
      return { name: 'Recall Expert', description: 'Reviewed 5+ spacing cards.', emoji: '🧠' };
    case 'streak_3':
      return { name: 'Dedication Pro', description: 'Scored a 3-day consistency streak.', emoji: '🔥' };
    case 'speech_badge':
      return { name: 'Daring Speaker', description: 'Talked to the AI Tutor.', emoji: '🎙️' };
    default:
      return { name: 'Scholar Badge', description: 'Achieved proficiency goal.', emoji: '🏅' };
  }
}
