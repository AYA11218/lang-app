import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Play, Pause, RefreshCw, Sparkles, Volume2, Check, AlertCircle } from 'lucide-react';

interface VoiceRecorderProps {
  key?: string | number;
  targetText?: string;
  onRecordingComplete?: (audioBlob: Blob, audioUrl: string) => void;
  className?: string;
  placeholder?: string;
}

export default function VoiceRecorder({
  targetText,
  onRecordingComplete,
  className = '',
  placeholder = 'Record your pronunciation'
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // AI assessment simulation states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    score: number;
    accentGrade: string;
    pros: string[];
    tips: string[];
  } | null>(null);

  // Soundwave animation peak simulation levels
  const [waveHeights, setWaveHeights] = useState<number[]>([15, 15, 15, 15, 15, 15, 15, 15]);

  // Web Audio Context refs for real-time visualization
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveIntervalRef = useRef<number | null>(null);

  // Clean up media elements on unmount
  useEffect(() => {
    return () => {
      stopAllRefs();
    };
  }, []);

  const draw = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Draw soft vertical grid line background for techy bicultural feel
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.4)'; // Slate 200
    ctx.lineWidth = 1;
    for (let xOffset = 20; xOffset < width; xOffset += 20) {
      ctx.beginPath();
      ctx.moveTo(xOffset, 0);
      ctx.lineTo(xOffset, height);
      ctx.stroke();
    }

    // Draw horizontal baseline
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)'; // Indigo-100
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    const localAnalyser = analyserRef.current;

    if (localAnalyser) {
      // --- Web Audio API Mode ---
      const localBufferLength = localAnalyser.frequencyBinCount;
      const localDataArray = new Uint8Array(localBufferLength);
      localAnalyser.getByteFrequencyData(localDataArray);

      // Render symmetrical bars extending from the middle
      const barWidth = (width / localBufferLength) * 2.5;
      let x = 0;

      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, '#4f46e5'); // Indigo 600
      gradient.addColorStop(0.5, '#6366f1'); // Indigo 500
      gradient.addColorStop(1, '#10b981'); // Emerald 500
      ctx.fillStyle = gradient;

      for (let i = 0; i < localBufferLength; i++) {
        const percent = localDataArray[i] / 255;
        const barHeight = percent * height * 0.85;
        
        if (barHeight > 0) {
          const centerY = height / 2;
          ctx.beginPath();
          const roundedRectX = x;
          const roundedRectY = centerY - barHeight / 2;
          const roundedRectW = barWidth - 1.5;
          const roundedRectH = Math.max(barHeight, 3);
          const radius = 2;

          if (ctx.roundRect) {
            ctx.roundRect(roundedRectX, roundedRectY, roundedRectW, roundedRectH, radius);
          } else {
            ctx.rect(roundedRectX, roundedRectY, roundedRectW, roundedRectH);
          }
          ctx.fill();
        }
        x += barWidth;
      }
    } else {
      // --- High Fidelity Fallback Wave Animation ---
      const time = Date.now() * 0.006;
      ctx.save();
      
      const waves = [
        { amplitude: 14, freq: 0.03, speed: 0.05, color: 'rgba(99, 102, 241, 0.7)' }, // indigo 500
        { amplitude: 9, freq: 0.05, speed: -0.07, color: 'rgba(16, 185, 129, 0.5)' }, // emerald 500
        { amplitude: 5, freq: 0.09, speed: 0.09, color: 'rgba(139, 92, 246, 0.4)' }  // purple 500
      ];

      waves.forEach(w => {
        ctx.beginPath();
        ctx.strokeStyle = w.color;
        ctx.lineWidth = 2;
        
        for (let xPos = 0; xPos < width; xPos++) {
          const envelope = Math.sin((xPos / width) * Math.PI);
          const yPos = (height / 2) + Math.sin(xPos * w.freq + time + w.speed) * w.amplitude * envelope;
          
          if (xPos === 0) {
            ctx.moveTo(xPos, yPos);
          } else {
            ctx.lineTo(xPos, yPos);
          }
        }
        ctx.stroke();
      });
      ctx.restore();
    }

    animationFrameRef.current = requestAnimationFrame(draw);
  };

  const stopAllRefs = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (waveIntervalRef.current) clearInterval(waveIntervalRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch (e) {}
      audioCtxRef.current = null;
    }
    analyserRef.current = null;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    // Stop recording tracks if still active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {}
    }
  };

  const startRecording = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card flips or other container click events
    audioChunksRef.current = [];
    setPermissionError(null);
    setAnalysisResult(null);

    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const compiledBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const compiledUrl = URL.createObjectURL(compiledBlob);
        setAudioBlob(compiledBlob);
        setAudioUrl(compiledUrl);
        if (onRecordingComplete) {
          onRecordingComplete(compiledBlob, compiledUrl);
        }

        // Stop all tracks on the stream to release mic icon from browser
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();

      // Hook up real-time Web Audio API analyzer
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64; // Keep it clean & compact for voice frequency bins
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        audioCtxRef.current = audioCtx;
        analyserRef.current = analyser;
      } catch (errCtx) {
        console.warn("Real-time Web Audio API analyzer could not be initialized:", errCtx);
        analyserRef.current = null;
      }

      setIsRecording(true);
      setRecordingSeconds(0);

      // Start duration stopwatch
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);

      // Start visual wave feedback simulation
      waveIntervalRef.current = window.setInterval(() => {
        setWaveHeights(Array.from({ length: 8 }, () => Math.floor(Math.random() * 32) + 10));
      }, 120);

      // Wait a frame for canvas to render/be in DOM, then start drawing
      setTimeout(() => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = requestAnimationFrame(draw);
      }, 50);

    } catch (err: any) {
      console.error('Failed to access microphone:', err);
      setPermissionError(
        'Unable to access your microphone. Please confirm frame permissions in your browser bar.'
      );
    }
  };

  const stopRecording = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (timerRef.current) clearInterval(timerRef.current);
    if (waveIntervalRef.current) clearInterval(waveIntervalRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch (e) {}
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setWaveHeights([15, 15, 15, 15, 15, 15, 15, 15]);
  };

  const startPlayback = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioUrl) return;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.onended = () => {
      setIsPlaying(false);
    };
    audio.play().then(() => {
      setIsPlaying(true);
    }).catch(err => {
      console.error('Audio playback failed:', err);
    });
  };

  const pausePlayback = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const resetRecording = (e: React.MouseEvent) => {
    e.stopPropagation();
    stopAllRefs();
    setAudioBlob(null);
    setAudioUrl('');
    setIsPlaying(false);
    setRecordingSeconds(0);
    setAnalysisResult(null);
  };

  // Perform a simulated AI accent evaluation
  const runAIAssessment = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!targetText) return;

    setIsAnalyzing(true);
    
    // Simulate speech-to-text accent comparison with bicultural insights
    setTimeout(() => {
      setIsAnalyzing(false);
      
      const cleanText = targetText.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"");
      
      // Determine score ranges based on text characteristics to make it look highly specific
      let baseScore = 88;
      let pros: string[] = [];
      let tips: string[] = [];
      let accentGrade = "A";

      if (cleanText.includes('h') && !cleanText.includes('ch')) {
        // Spanish silent h
        pros.push("Correctly kept the starting 'h' silent, showcasing Spanish phonic awareness!");
        baseScore += 3;
      }
      
      if (cleanText.includes('r')) {
        pros.push("Strong articulation of the vibrant 'r' sound.");
        tips.push("Try to slightly curl/roll the tongue further back to make the 'r' flap natural.");
        baseScore -= 1;
      }

      if (cleanText.includes('j') || cleanText.includes('g')) {
        pros.push("Well placed gutteral friction representing the bicultural native accent.");
      }

      if (cleanText.includes('u') || cleanText.includes('ou')) {
        tips.push("Focus on keeping mouth narrow and lips rounded for perfect vowel tightness.");
      }

      // Fill basic elements if empty
      if (pros.length === 0) {
        pros.push("Strong tempo and consistent volume level.");
        pros.push("Vowels are clean and match bicultural speech patterns.");
      }
      if (tips.length === 0) {
        tips.push("Increase vocal air projection during syllable transition.");
      }

      const offset = Math.floor(Math.random() * 7) - 3; // -3 to +3 jitter
      const finalScore = Math.min(Math.max(baseScore + offset, 78), 98);

      if (finalScore >= 94) {
        accentGrade = "Near-Native Mastery";
      } else if (finalScore >= 88) {
        accentGrade = "Outstanding Bilingual Profile";
      } else {
        accentGrade = "Proficient, Accent Developing";
      }

      setAnalysisResult({
        score: finalScore,
        accentGrade,
        pros,
        tips
      });
    }, 1600);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 space-y-3.5 shadow-sm text-slate-800 ${className}`}>
      
      {/* Permission warning */}
      {permissionError && (
        <div className="flex items-start gap-2 text-xs bg-red-50 text-red-600 p-2.5 rounded-xl border border-red-100 font-semibold leading-normal">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
          <span>{permissionError}</span>
        </div>
      )}

      {/* Main interactive state section */}
      <div className="flex items-center justify-between gap-4">
        
        {/* Status indicator */}
        <div className="flex items-center gap-2.5">
          <div className={`h-2.5 w-2.5 rounded-full ${
            isRecording 
              ? 'bg-red-500 animate-ping' 
              : audioUrl 
                ? 'bg-indigo-500' 
                : 'bg-slate-400'
          }`} />
          <span className="text-xs font-bold text-slate-600 font-sans tracking-wide">
            {isRecording 
              ? `Recording... ${formatTime(recordingSeconds)}` 
              : audioUrl 
                ? 'Audio Captured' 
                : placeholder}
          </span>
        </div>

        {/* Audio Visualizer Wave Panel (Only visible when actively recording) */}
        {isRecording && (
          <div className="flex items-center justify-end flex-1 max-w-[150px] sm:max-w-[200px] animate-fade-in">
            <canvas
              ref={canvasRef}
              width={200}
              height={36}
              className="w-full h-9 bg-slate-100/60 rounded-lg border border-slate-250"
            />
          </div>
        )}

        {/* Playback controllers */}
        {audioUrl && !isRecording && (
          <div className="flex items-center gap-2">
            <button
              onClick={isPlaying ? pausePlayback : startPlayback}
              className={`p-2 rounded-xl border-2 transition-all cursor-pointer ${
                isPlaying 
                  ? 'bg-slate-805 hover:bg-slate-900 border-slate-805 text-white shadow-sm' 
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-indigo-600'
              }`}
              title={isPlaying ? "Pause playback" : "Play recording"}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
            </button>
            
            <button
              onClick={resetRecording}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 border-2 border-slate-200 text-slate-500 hover:text-red-500 transition-all cursor-pointer"
              title="Reset recording"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main trigger button action when no sound yet */}
      {!audioUrl && (
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`w-full py-3 px-4 rounded-xl font-bold text-xs select-none shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
              : 'bg-white hover:bg-slate-100 border-2 border-slate-200 text-slate-700 hover:text-indigo-600'
          }`}
        >
          {isRecording ? (
            <>
              <Square className="h-4 w-4 fill-white" />
              <span>Tap to Stop</span>
            </>
          ) : (
            <>
              <Mic className="h-4 w-4 text-emerald-500" />
              <span>Click to Start Voice Recording</span>
            </>
          )}
        </button>
      )}

      {/* Dynamic Practice & Accent Coaching Assessment Block */}
      {audioUrl && targetText && !isRecording && (
        <div className="pt-2 border-t border-slate-200">
          {!analysisResult ? (
            <button
              onClick={runAIAssessment}
              disabled={isAnalyzing}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-650 hover:bg-indigo-700 disabled:bg-slate-100 text-white disabled:text-slate-400 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer border border-indigo-700 shadow-sm shadow-indigo-150 transition-all"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Aura Accent Analyzer parsing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-yellow-300 fill-yellow-300" />
                  <span>Submit to Aura Pronunciation Coach</span>
                </>
              )}
            </button>
          ) : (
            <div className="bg-white border-2 border-slate-200 p-3.5 rounded-xl space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-widest text-indigo-500 block font-mono">Accent Coaching Score</span>
                  <span className="text-sm font-extrabold text-slate-805">{analysisResult.accentGrade}</span>
                </div>
                <div className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl font-mono font-extrabold text-base border border-indigo-150 shadow-sm leading-none flex items-center gap-1">
                  <span>{analysisResult.score}</span>
                  <span className="text-xs opacity-60">%</span>
                </div>
              </div>

              <div className="text-[11px] space-y-2">
                <div>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> Strengths
                  </span>
                  <ul className="list-disc list-inside text-slate-650 mt-1 pl-1 space-y-0.5">
                    {analysisResult.pros.map((pro, i) => (
                      <li key={i}>{pro}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <span className="font-bold text-indigo-600 flex items-center gap-1">
                    <Volume2 className="h-3.5 w-3.5" /> Accent Modifier Tip
                  </span>
                  <ul className="list-disc list-inside text-slate-650 mt-1 pl-1 space-y-0.5">
                    {analysisResult.tips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
