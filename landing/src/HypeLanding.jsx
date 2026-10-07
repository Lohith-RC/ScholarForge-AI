import React, { useState } from 'react';
import Dither from './Dither';
import { ArrowRight, Sparkles, Terminal, Shield, CheckCircle2, ChevronRight, Cpu, Compass } from 'lucide-react';

export default function HypeLanding() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [colorScheme, setColorScheme] = useState('cyan');

  // Dynamic Dither Shader Palettes tailored for Academic/Frontier Intelligence
  const palettes = {
    cyan: {
      waveColor: [0.15, 0.75, 0.95],
      backgroundColor: [0.01, 0.02, 0.04],
      accent: 'cyan'
    },
    amber: {
      waveColor: [0.95, 0.65, 0.2],
      backgroundColor: [0.03, 0.02, 0.01],
      accent: 'amber'
    },
    emerald: {
      waveColor: [0.2, 0.9, 0.55],
      backgroundColor: [0.01, 0.03, 0.02],
      accent: 'emerald'
    },
    mono: {
      waveColor: [0.8, 0.8, 0.85],
      backgroundColor: [0.02, 0.02, 0.03],
      accent: 'slate'
    }
  };

  const currentPalette = palettes[colorScheme];

  const handleWaitlistSubmit = (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    setSubmitted(true);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white font-sans select-none">
      {/* 3D Interactive Dither Retro Shader Canvas */}
      <div className="absolute inset-0 z-0">
        <Dither
          waveColor={currentPalette.waveColor}
          backgroundColor={currentPalette.backgroundColor}
          waveSpeed={0.06}
          waveFrequency={3.0}
          waveAmplitude={0.32}
          colorNum={5}
          pixelSize={2.5}
          enableMouseInteraction={true}
          mouseRadius={0.4}
        />
      </div>

      {/* Atmospheric Vignette & Contrast Overlay */}
      <div className="absolute inset-0 pointer-events-none z-1 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/45 to-black/85" />

      {/* Sleek Floating Header */}
      <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-5 md:px-12 backdrop-blur-md bg-black/20 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(255,255,255,0.15)]">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
              <path d="M6 6h10" />
              <path d="M6 10h10" />
              <path d="m9 14 2 2 4-4" />
            </svg>
          </div>
          <span className="text-sm font-black tracking-[0.28em] uppercase text-white/90">
            SCHOLARFORGE
          </span>
        </div>

        {/* Live Shader Frequency / Mood Switcher */}
        <div className="hidden sm:flex items-center gap-1.5 p-1 rounded-full bg-black/50 border border-white/10 backdrop-blur-lg text-xs font-mono">
          {['cyan', 'amber', 'emerald', 'mono'].map((scheme) => (
            <button
              key={scheme}
              onClick={() => setColorScheme(scheme)}
              className={`px-3 py-1 rounded-full transition-all uppercase text-[10px] tracking-wider cursor-pointer ${colorScheme === scheme
                  ? 'bg-white/20 text-white font-bold shadow-[0_0_12px_rgba(255,255,255,0.2)]'
                  : 'text-white/40 hover:text-white/80'
                }`}
            >
              {scheme}
            </button>
          ))}
        </div>

        {/* Direct Access Link into the Platform */}
        <a
          href="/login"
          className="flex items-center gap-2 px-4 py-2 text-xs font-mono uppercase tracking-wider text-white/85 hover:text-white bg-white/5 hover:bg-white/15 border border-white/15 hover:border-white/35 rounded-xl transition-all"
        >
          <span>Enter Suite</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </a>
      </header>

      {/* Main Teaser Centerpiece */}
      <main className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6 max-w-4xl mx-auto pt-16">
        {/* Mysterious Status Indicator */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/15 backdrop-blur-md mb-8 animate-pulse shadow-[0_0_25px_rgba(0,0,0,0.6)]">
          <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
          <span className="text-[11px] font-mono tracking-[0.22em] text-cyan-200 uppercase">
            PROTOCOL ZERO // NEURAL GROUNDING INITIALIZED
          </span>
        </div>

        {/* Cryptic High-Hype Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-white/95 to-white/40 leading-[1.08] mb-6">
          THE DAWN OF <br />
          <span className="italic font-serif font-normal text-white/85">ZERO-HALLUCINATION SYNTHESIS.</span>
        </h1>

        {/* Minimal Enigmatic Description (Reveals little, builds massive hype) */}
        <p className="text-base sm:text-lg md:text-xl text-white/60 font-light max-w-xl mb-10 leading-relaxed">
          Human curiosity was only the prelude. A silent architecture connecting global knowledge
          to raw generation is quietly waking up.
        </p>

        {/* Early Access / Private Key Form */}
        <div className="w-full max-w-md">
          {!submitted ? (
            <form onSubmit={handleWaitlistSubmit} className="relative flex flex-col sm:flex-row items-center gap-2 p-1.5 rounded-2xl bg-black/60 border border-white/15 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.7)]">
              <div className="flex items-center gap-2.5 px-3.5 w-full py-2 sm:py-0">
                <Terminal className="w-4 h-4 text-white/40 shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter researcher email..."
                  required
                  className="w-full bg-transparent text-sm text-white placeholder-white/30 focus:outline-none font-mono"
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs tracking-wider uppercase hover:bg-cyan-300 hover:shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-all active:scale-95 cursor-pointer"
              >
                <span>Request Key</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-white/10 border border-cyan-500/40 backdrop-blur-xl text-cyan-300 text-sm font-mono shadow-[0_0_30px_rgba(34,211,238,0.25)]">
              <CheckCircle2 className="w-5 h-5 text-cyan-400" />
              <span>Key allocated. Access token will arrive in the silence.</span>
            </div>
          )}

          <div className="flex items-center justify-center gap-6 mt-4 text-[11px] font-mono text-white/40 tracking-wider">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-white/30" /> REAL-TIME GROUNDING
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-white/30" /> CLASSIFIED PROTOCOL
            </span>
          </div>
        </div>
      </main>

      {/* Minimal Status Footer */}
      <footer className="absolute bottom-0 left-0 right-0 z-10 flex flex-col sm:flex-row items-center justify-between px-6 py-4 md:px-12 text-[10px] font-mono text-white/30 tracking-widest uppercase border-t border-white/5 backdrop-blur-sm bg-black/20">
        <div className="flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-cyan-400/60" />
          <span>RESEARCH ENGINE // 250M+ VERIFIED CORPORA</span>
        </div>
        <div className="mt-2 sm:mt-0 flex items-center gap-4">
          <span>CONFIDENTIAL ACCESS</span>
          <span>•</span>
          <span>SCHOLARFORGE © 2026</span>
        </div>
      </footer>
    </div>
  );
}
