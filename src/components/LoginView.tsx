import React from 'react';
import { LogIn, Sparkles, Shield, Bookmark, Flame } from 'lucide-react';
import { loginWithGoogle } from '../firebase';

interface LoginViewProps {
  onSignInSuccess: () => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
}

export default function LoginView({ onSignInSuccess, isLoading, setIsLoading }: LoginViewProps) {
  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await loginWithGoogle();
      onSignInSuccess();
    } catch (err) {
      console.error("Login attempt failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="relative max-w-md w-full bg-white border-2 border-slate-200 rounded-3xl p-8 shadow-xl overflow-hidden flex flex-col items-center">
        {/* Subtle decorative background lights */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
        
        {/* Aura Logo Frame */}
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-md mb-6 animate-pulse">
          A
        </div>

        <h2 className="font-display font-black text-2xl text-slate-850 tracking-tight text-center leading-tight mb-2">
          Linguistic Mastery Awaits
        </h2>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest text-center mb-8">
          Aura Personalized Language Coach
        </p>

        {/* Bento Grid Concept Presentation */}
        <div className="w-full space-y-3 mb-8">
          <div className="flex gap-3 bg-slate-50 border border-slate-100 p-3.5 rounded-2xl">
            <div className="w-9 h-9 bg-indigo-50 border border-indigo-150 rounded-xl flex items-center justify-center shrink-0">
              <Flame className="h-4.5 w-4.5 text-indigo-600" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-850 leading-tight">Sync Progress & Streak</h4>
              <p className="text-[10px] text-slate-500 font-medium leading-normal mt-0.5">Keep learning logs and milestone badges securely saved across devices.</p>
            </div>
          </div>

          <div className="flex gap-3 bg-slate-50 border border-slate-100 p-3.5 rounded-2xl">
            <div className="w-9 h-9 bg-emerald-50 border border-emerald-150 rounded-xl flex items-center justify-center shrink-0">
              <Bookmark className="h-4.5 w-4.5 text-emerald-600" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-850 leading-tight">Spaced Vocabularies</h4>
              <p className="text-[10px] text-slate-500 font-medium leading-normal mt-0.5">Your core vocabulary decks, SRS retention intervals, and ease factors backup.</p>
            </div>
          </div>

          <div className="flex gap-3 bg-slate-50 border border-slate-100 p-3.5 rounded-2xl">
            <div className="w-9 h-9 bg-purple-50 border border-purple-150 rounded-xl flex items-center justify-center shrink-0">
              <Sparkles className="h-4.5 w-4.5 text-purple-600" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-850 leading-tight">Linguistic AI Chat logs</h4>
              <p className="text-[10px] text-slate-500 font-medium leading-normal mt-0.5">Chat histories with custom grammatical breakdowns saved automatically.</p>
            </div>
          </div>
        </div>

        {/* Authentication Button Action */}
        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full bg-slate-850 hover:bg-slate-900 text-white font-bold text-sm px-6 py-4.5 rounded-2xl transition-all shadow-md active:scale-98 flex items-center justify-center gap-3 cursor-pointer group disabled:opacity-55 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <LogIn className="h-4.5 w-4.5 text-slate-300 group-hover:text-white transition-all" />
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {/* Security & Privacy Disclosures */}
        <div className="flex items-center gap-1.5 mt-6 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
          <Shield className="h-3 w-3" />
          <span>Secured by Firebase Enterprise Shield</span>
        </div>
      </div>
    </div>
  );
}
