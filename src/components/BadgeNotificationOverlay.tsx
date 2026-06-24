import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Trophy, Star, X, Award, Flame, Check } from 'lucide-react';

export interface BadgeUnlock {
  id: string;
  name: string;
  description: string;
  emoji: string;
}

interface BadgeNotificationOverlayProps {
  queue: BadgeUnlock[];
  onDismiss: (id: string) => void;
}

export function getBadgeDetails(id: string): { name: string; description: string; emoji: string } {
  switch (id) {
    case 'first_challenge':
      return { name: 'Pioneer Flame', description: 'Finished your first daily challenge.', emoji: '🚀' };
    case 'perfect_challenge':
      return { name: 'Grammar Master', description: 'Completed a challenge series cleanly.', emoji: '🏆' };
    case 'srs_conqueror':
      return { name: 'Recall Expert', description: 'Reviewed 5+ spacing cards today.', emoji: '🧠' };
    case 'streak_3':
      return { name: 'Dedication Pro', description: 'Scored a 3-day consistency streak.', emoji: '🔥' };
    case 'speech_badge':
      return { name: 'Daring Speaker', description: 'Practiced speaking with the AI Tutor.', emoji: '🎙️' };
    default:
      return { name: 'Scholar Badge', description: 'Achieved a language milestone.', emoji: '🏅' };
  }
}

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  color: string;
  angle: number;
  speed: number;
  rotation: number;
  scale: number;
}

const COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6', '#EF4444'];

export default function BadgeNotificationOverlay({ queue, onDismiss }: BadgeNotificationOverlayProps) {
  const [activeBadge, setActiveBadge] = useState<BadgeUnlock | null>(null);
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);

  useEffect(() => {
    if (queue.length > 0 && !activeBadge) {
      setActiveBadge(queue[0]);
    }
  }, [queue, activeBadge]);

  // Trigger brief satisfying play of web audio synthesizer sound for celebratory effect
  useEffect(() => {
    if (activeBadge) {
      // Spawn active particles around center
      const newParticles: ConfettiParticle[] = Array.from({ length: 60 }).map((_, i) => ({
        id: Date.now() + i,
        x: 0,
        y: 0,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        angle: Math.random() * Math.PI * 2,
        speed: 4 + Math.random() * 8,
        rotation: Math.random() * 360,
        scale: 0.4 + Math.random() * 0.8
      }));
      setParticles(newParticles);

      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          
          // Play a shiny celebratory arpeggio (C4 -> E4 -> G4 -> C5 -> E5 -> G5)
          const playNote = (freq: number, delay: number, duration: number, type: 'sine' | 'triangle' = 'sine') => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
            
            gain.gain.setValueAtTime(0, ctx.currentTime + delay);
            gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + delay + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(ctx.currentTime + delay);
            osc.stop(ctx.currentTime + delay + duration);
          };

          // Beautiful chord arpeggio
          playNote(261.63, 0.0, 0.45, 'triangle'); // C4
          playNote(329.63, 0.1, 0.45, 'sine');    // E4
          playNote(392.00, 0.2, 0.45, 'sine');    // G4
          playNote(523.25, 0.3, 0.6, 'triangle');  // C5
          playNote(659.25, 0.42, 0.7, 'sine');    // E5
          playNote(783.99, 0.54, 0.9, 'sine');    // G5
        }
      } catch (e) {
        console.warn('Celebration audio effect error:', e);
      }
    } else {
      setParticles([]);
    }
  }, [activeBadge]);

  const handleClose = () => {
    if (activeBadge) {
      const dismissedId = activeBadge.id;
      setActiveBadge(null);
      onDismiss(dismissedId);
    }
  };

  return (
    <AnimatePresence>
      {activeBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Dark Blurred Backdrop */}
          <motion.div
            id="badge-overlay-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-md cursor-pointer"
          />

          {/* Celebratory Confetti Particles */}
          <div className="absolute pointer-events-none inset-0 flex items-center justify-center overflow-hidden">
            {particles.map((p) => {
              const distance = p.speed * 32;
              const targetX = Math.cos(p.angle) * distance;
              const targetY = Math.sin(p.angle) * distance - 60; // gravity curve
              
              return (
                <motion.div
                  key={p.id}
                  initial={{ x: 0, y: 0, scale: p.scale, opacity: 1, rotate: 0 }}
                  animate={{
                    x: [0, targetX * 0.5, targetX],
                    y: [0, targetY * 0.5 - 40, targetY + 140],
                    opacity: [1, 1, 0.8, 0],
                    rotate: [0, p.rotation * 0.5, p.rotation],
                    scale: [p.scale, p.scale * 1.1, 0]
                  }}
                  transition={{ duration: 1.6, ease: "easeOut" }}
                  className="absolute w-3.5 h-3.5 rounded-sm"
                  style={{
                    backgroundColor: p.color,
                    boxShadow: `0 0 12px ${p.color}50`,
                  }}
                />
              );
            })}
          </div>

          {/* Celebratory Content Box */}
          <motion.div
            id="badge-modal"
            initial={{ scale: 0.85, y: 35, opacity: 0 }}
            animate={{ 
              scale: 1, 
              y: 0, 
              opacity: 1,
              transition: { type: "spring", stiffness: 280, damping: 22 }
            }}
            exit={{ scale: 0.9, y: 15, opacity: 0, transition: { duration: 0.2 } }}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-500/40 rounded-[2.5rem] p-8 text-center shadow-[0_0_50px_rgba(245,158,11,0.25)] overflow-hidden"
          >
            {/* Ambient Inner Glowing Lights */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-radial from-amber-400/10 to-transparent pointer-events-none blur-3xl" />

            {/* Top Close Button */}
            <button
              id="close-badge-overlay-btn"
              onClick={handleClose}
              className="absolute right-6 top-6 h-8 w-8 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-150 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all flex items-center justify-center cursor-pointer z-20"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Sparkle details */}
            <div className="absolute top-8 left-8 text-amber-400 animate-pulse">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="absolute bottom-8 right-8 text-amber-400 animate-pulse delay-75">
              <Sparkles className="h-5 w-5" />
            </div>

            {/* Glowing Golden 3D Frame and Badge Emblem */}
            <div className="relative flex justify-center mb-6 z-10">
              <motion.div
                initial={{ rotate: -15, scale: 0.8 }}
                animate={{ rotate: [0, -10, 10, -5, 5, 0], scale: 1 }}
                transition={{ duration: 0.8, delay: 0.15 }}
                className="relative w-28 h-28 flex items-center justify-center"
              >
                {/* Outer Golden Rings */}
                <div className="absolute inset-0 rounded-full border-4 border-dashed border-amber-400/40 animate-spin" style={{ animationDuration: '24s' }} />
                <div className="absolute inset-1.5 rounded-full border-2 border-amber-300/60 animate-reverse-spin" style={{ animationDuration: '18s' }} />
                
                {/* Inner Circle Badge */}
                <div className="absolute inset-3 rounded-full bg-gradient-to-tr from-amber-50 to-amber-200 dark:from-amber-900/40 dark:to-amber-950 border-4 border-amber-400 shadow-[0_8px_24px_rgba(245,158,11,0.35)] flex items-center justify-center">
                  <span className="text-5xl select-none animate-bounce" style={{ animationDuration: '3.5s' }}>{activeBadge.emoji}</span>
                </div>
              </motion.div>
            </div>

            {/* Achievement Text details */}
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-bold uppercase tracking-wider mb-3 shadow-sm border border-amber-200/50 dark:border-amber-900/50">
                <Award className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                Achievement Unlocked!
              </span>

              <h3 className="font-display text-2xl font-black text-slate-850 dark:text-white tracking-tight mb-2">
                {activeBadge.name}
              </h3>

              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 max-w-[280px] mx-auto mb-6 leading-relaxed">
                {activeBadge.description}
              </p>

              {/* Bonus experience indicators */}
              <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold text-xs mb-8 shadow-sm">
                <Flame className="h-4 w-4 text-orange-500 animate-pulse shrink-0" />
                <span>Awarded Bonus XP multiplier multipliers!</span>
              </div>

              {/* Claim CTA Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleClose}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold py-4 px-6 rounded-2xl shadow-[0_6px_20px_rgba(245,158,11,0.3)] hover:shadow-[0_8px_24px_rgba(245,158,11,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer group"
              >
                <Check className="h-5 w-5 transition-transform group-hover:scale-115" />
                Awesome, Claim!
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
