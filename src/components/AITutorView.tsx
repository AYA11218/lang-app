import React, { useState, useRef, useEffect } from 'react';
import { Send, Volume2, Sparkles, BookOpen, AlertCircle, RefreshCw, BookmarkPlus, HelpCircle, Mic } from 'lucide-react';
import { ChatMessage, Language } from '../types';
import VoiceRecorder from './VoiceRecorder';

interface AITutorViewProps {
  chatHistory: ChatMessage[];
  targetLanguageCode: string;
  languages: Language[];
  level: 'beginner' | 'intermediate' | 'advanced';
  onSendMessage: (message: string) => Promise<void>;
  onAddCard: (card: {
    front: string;
    back: string;
    pronunciation?: string;
    example?: string;
    exampleTranslation?: string;
  }) => void;
  loadingChat: boolean;
  onClearHistory: () => void;
}

export default function AITutorView({
  chatHistory,
  targetLanguageCode,
  languages,
  level,
  onSendMessage,
  onAddCard,
  loadingChat,
  onClearHistory,
}: AITutorViewProps) {
  const currentLang = languages.find(l => l.code === targetLanguageCode) || languages[0];
  const [inputText, setInputText] = useState('');
  const [selectedExplainText, setSelectedExplainText] = useState<string | null>(null);
  const [explainMarkdown, setExplainMarkdown] = useState<string | null>(null);
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [hasSavedMessageCard, setHasSavedMessageCard] = useState<Record<string, boolean>>({});
  const [showVoicePractice, setShowVoicePractice] = useState(false);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loadingChat]);

  // Handle Voice Speak Speech Translation fallback
  const handleSpeak = (text: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = currentLang.pronunciationLocale;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || loadingChat) return;
    const msg = inputText;
    setInputText('');
    await onSendMessage(msg);
  };

  const explainGrammar = async (messageText: string) => {
    setSelectedExplainText(messageText);
    setLoadingExplain(true);
    setExplainMarkdown(null);
    try {
      const res = await fetch('/api/gemini/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: messageText, languageCode: targetLanguageCode })
      });
      const data = await res.json();
      setExplainMarkdown(data.explanation);
    } catch (err: any) {
      setExplainMarkdown(`Could not compute explanation. Error code: ${err.message}`);
    } finally {
      setLoadingExplain(false);
    }
  };

  const saveToSRS = (msg: ChatMessage) => {
    onAddCard({
      front: msg.text,
      back: msg.translation || 'Tutor Chat phrase translation',
      pronunciation: msg.pronunciation || undefined,
      example: msg.text,
      exampleTranslation: msg.translation,
    });
    setHasSavedMessageCard(prev => ({ ...prev, [msg.id]: true }));
  };

  // Find the last tutor message to extract proposed quick template response
  const lastTutorMsg = [...chatHistory].reverse().find(m => m.sender === 'tutor');
  const suggestion = (lastTutorMsg as any)?.suggestedResponse;

  return (
    <div className="space-y-6 animate-fade-in relative text-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">Speak with Aura</h1>
          <p className="text-sm text-slate-500">
            Talk to an AI native bilingual speaker. Filtered for <strong>{level}</strong> Spanish/French vocabularies.
          </p>
        </div>
        <button
          onClick={onClearHistory}
          className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors cursor-pointer"
        >
          Reset Tutor Dialogue Thread
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3 items-stretch">
        {/* Chat Timelines layout */}
        <div className="md:col-span-2 rounded-3xl bg-white border-2 border-slate-200 flex flex-col h-[520px] shadow-md overflow-hidden">
          {/* Conversator screen */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {chatHistory.length === 0 ? (
              <div className="text-center py-16 text-slate-400 max-w-xs mx-auto space-y-3">
                <div className="rounded-full bg-indigo-50 p-4 inline-flex text-indigo-500 border border-indigo-200">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="font-display font-bold text-slate-800">Start the dialog</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                  Write anything to begin. Say "Hello!", "Good morning!", or ask direct translations to practice.
                </p>
              </div>
            ) : (
              chatHistory.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3.5 shadow-sm text-sm ${
                      isUser 
                        ? 'bg-slate-850 text-white font-semibold rounded-tr-none' 
                        : 'bg-slate-50 border-2 border-slate-200 text-slate-805 rounded-tl-none font-semibold'
                    }`}>
                      <p>{msg.text}</p>
                      
                      {!isUser && msg.translation && (
                        <p className="text-xs text-slate-500 border-t border-slate-200 mt-1.5 pt-1.5 font-sans leading-normal font-medium">
                          {msg.translation}
                        </p>
                      )}

                      {!isUser && msg.pronunciation && (
                        <p className="text-[10px] text-slate-400 font-mono italic mt-0.5 font-normal">
                          / {msg.pronunciation} /
                        </p>
                      )}
                    </div>

                    {/* Speech explanation controls */}
                    {!isUser && (
                      <div className="flex items-center gap-3.5 px-1 pb-1">
                        <button
                          onClick={() => handleSpeak(msg.text)}
                          className="text-[10px] font-bold text-slate-450 hover:text-indigo-600 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Volume2 className="h-3.2 w-3.2" /> Speak aloud
                        </button>
                        <button
                          onClick={() => explainGrammar(msg.text)}
                          className="text-[10px] font-bold text-slate-450 hover:text-indigo-600 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <BookOpen className="h-3.2 w-3.2" /> Explain Grammar
                        </button>
                        <button
                          onClick={() => saveToSRS(msg)}
                          disabled={hasSavedMessageCard[msg.id]}
                          className="text-[10px] font-bold text-slate-450 hover:text-emerald-600 transition-colors flex items-center gap-1 disabled:opacity-55 cursor-pointer"
                        >
                          <BookmarkPlus className="h-3.2 w-3.2" /> 
                          {hasSavedMessageCard[msg.id] ? 'Card Saved!' : 'Add Card'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Loading message */}
            {loadingChat && (
              <div className="flex items-center gap-2 text-slate-400 text-xs animate-pulse font-semibold">
                <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />
                <span>Aura is formulating a native response...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Suggested responses */}
          {suggestion && !loadingChat && (
            <div className="bg-indigo-50/70 px-6 py-3.5 border-t border-slate-200 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest text-indigo-700 uppercase flex items-center gap-1 shrink-0">
                <Sparkles className="h-3 w-3 text-yellow-500 fill-yellow-500" /> Suggested reply:
              </span>
              <button
                onClick={() => setInputText(suggestion)}
                className="bg-white hover:bg-slate-100 hover:scale-101 border-2 border-slate-200 text-indigo-750 font-bold px-3.5 py-1.5 rounded-xl text-xs shadow-sm transition-all text-left text-ellipsis truncate max-w-sm cursor-pointer"
              >
                "{suggestion}"
              </button>
            </div>
          )}

          {/* Toggleable Voice recorder helper panel */}
          {showVoicePractice && (
            <div className="px-6 py-4 bg-indigo-50/50 border-t-2 border-slate-200 space-y-2 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-indigo-800 uppercase tracking-widest block font-sans">
                  Aura Speaking Coach Sandbox
                </span>
                <span className="text-[9px] text-slate-500 font-bold">
                  {inputText ? "Analyzing pronunciation of typed entry" : "Free speech recording practice"}
                </span>
              </div>
              <VoiceRecorder
                targetText={inputText || undefined}
                placeholder="Speak Spanish/French response here to assess your accent..."
                className="bg-white border-2 border-slate-200"
              />
            </div>
          )}

          {/* Interactive panel tools */}
          <form onSubmit={handleSend} className="p-4 border-t-2 border-slate-200 bg-white flex gap-2">
            <input
              required
              disabled={loadingChat}
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={`Write something in ${currentLang.name} or English...`}
              className="flex-1 bg-slate-50 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-500 transition-all font-semibold border-2 border-slate-200 text-slate-850"
            />
            <button
              type="button"
              id="voice-practice-toggle"
              onClick={() => setShowVoicePractice(!showVoicePractice)}
              className={`h-11 w-11 rounded-2xl flex items-center justify-center border-2 shrink-0 transition-all cursor-pointer ${
                showVoicePractice 
                  ? 'bg-indigo-600 hover:bg-indigo-700 border-indigo-600 text-white shadow-inner scale-102 font-extrabold' 
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
              }`}
              title="Practice speaking with Aura"
            >
              <Mic className="h-4.5 w-4.5" />
            </button>
            <button
              type="submit"
              disabled={loadingChat || !inputText.trim()}
              className="bg-slate-850 hover:bg-slate-900 border-t border-white/5 shadow-md text-white h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Dynamic Context explain sidebar */}
        <div className="bg-slate-50 border-2 border-slate-200 rounded-3xl p-6 h-full space-y-4 shadow-sm pb-8">
          <h4 className="font-display font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
            <BookOpen className="h-5 w-5 text-indigo-500" />
            Active Grammar Parser
          </h4>
          
          {!selectedExplainText ? (
            <div className="text-center py-12 text-neutral-400 space-y-3">
              <HelpCircle className="h-8 w-8 mx-auto text-neutral-300" />
              <p className="text-xs leading-relaxed max-w-[180px] mx-auto">
                Tap <strong>"Explain Grammar"</strong> under any dialogue bubble to break down sentence structure and vocabulary context dynamically!
              </p>
            </div>
          ) : (
            <div className="space-y-4.5 animate-fade-in text-xs">
              <div className="bg-white border-2 border-slate-200 p-3.5 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Sourced Sentence</span>
                <p className="text-slate-805 font-bold text-sm mt-0.5">{selectedExplainText}</p>
                <button
                  onClick={() => handleSpeak(selectedExplainText)}
                  className="text-[10px] font-bold text-indigo-650 hover:underline mt-1.5 flex items-center gap-1 cursor-pointer"
                >
                  <Volume2 className="h-3 w-3" /> Pronounce
                </button>
              </div>

              {loadingExplain ? (
                <div className="text-center py-8 space-y-2">
                  <RefreshCw className="h-5 w-5 mx-auto text-indigo-500 animate-spin" />
                  <p className="text-[11px] text-slate-400 font-semibold">Gemini is parsing syntax tree...</p>
                </div>
              ) : (
                <div className="bg-white border-2 border-slate-200 p-5 rounded-2xl whitespace-pre-wrap leading-relaxed text-slate-600 font-sans space-y-2 prose font-semibold">
                  {/* Basic Custom parser for Markdown list markers for bullet simplicity */}
                  {explainMarkdown ? (
                    explainMarkdown.split('\n').map((line, lidx) => {
                      if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
                        return (
                          <li key={lidx} className="list-disc ml-3.5 my-1 font-sans">
                            {line.trim().replace(/^[-*]\s*/, '')}
                          </li>
                        );
                      }
                      if (line.trim().startsWith('###')) {
                        return <h5 key={lidx} className="font-bold text-neutral-800 text-xs mt-3 mb-1">{line.replace(/^###\s*/, '')}</h5>;
                      }
                      if (line.trim().startsWith('##')) {
                        return <h4 key={lidx} className="font-bold text-neutral-800 text-xs mt-3 mb-1">{line.replace(/^##\s*/, '')}</h4>;
                      }
                      return <p key={lidx} className="my-1 text-neutral-600">{line}</p>;
                    })
                  ) : (
                    <p>No parser details retrieved.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
