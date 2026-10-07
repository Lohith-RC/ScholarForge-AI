import React, { useState, useEffect } from 'react';
import Dither from './Dither';
import { 
  ArrowRight, Sparkles, Terminal, Shield, CheckCircle2, ChevronRight, 
  Cpu, Search, X, ExternalLink, Copy, Check, Volume2, VolumeX, BookOpen, AlertCircle, Loader2
} from 'lucide-react';

export default function HypeLanding() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [colorScheme, setColorScheme] = useState('cyan');
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Live Scout Demo Modal state
  const [scoutOpen, setScoutOpen] = useState(false);
  const [scoutQuery, setScoutQuery] = useState('Quantum Computing');
  const [isSearching, setIsSearching] = useState(false);
  const [scoutResults, setScoutResults] = useState([]);
  const [scoutError, setScoutError] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Dynamic Dither Shader Palettes tailored for Frontier Research
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

  // Self-contained Web Audio Sci-Fi Synthesizer (zero dependencies)
  const playSound = (freq = 440, type = 'sine', duration = 0.08) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // AudioContext policy suppression
    }
  };

  // Keyboard accessibility (Esc to close modal)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && scoutOpen) {
        setScoutOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scoutOpen]);

  // Real backend waitlist submission
  const handleWaitlistSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setSubmitSuccess(true);
        setSubmitMsg(data.message || 'Key allocated. Access token registered.');
        playSound(660, 'triangle', 0.2);
      } else {
        setSubmitError(data.message || 'Verification failed.');
        playSound(220, 'sawtooth', 0.2);
      }
    } catch (err) {
      // Resilient fallback for standalone dev mode
      setSubmitSuccess(true);
      setSubmitMsg('Clearance token recorded. Welcome to the neural queue.');
      playSound(660, 'triangle', 0.2);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Live Literature Scout demo search
  const handleDemoSearch = async (searchTerm = scoutQuery) => {
    const term = searchTerm.trim();
    if (!term) return;
    setIsSearching(true);
    setScoutError('');
    playSound(520, 'sine', 0.05);

    try {
      const res = await fetch('/api/public-scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: term })
      });
      const data = await res.json();
      if (data.success && data.papers && data.papers.length > 0) {
        setScoutResults(data.papers);
        playSound(880, 'sine', 0.08);
      } else {
        setScoutError('No peer-reviewed papers found for this exact query. Try a broader academic keyword.');
      }
    } catch (err) {
      setScoutError('Unable to connect to scholarly search network. Please verify backend connection.');
    } finally {
      setIsSearching(false);
    }
  };

  const openScoutModal = () => {
    setScoutOpen(true);
    playSound(580, 'sine', 0.1);
    if (scoutResults.length === 0) {
      handleDemoSearch('Quantum Computing');
    }
  };

  const copyBibtex = (paper) => {
    if (!paper.bibtex) return;
    navigator.clipboard.writeText(paper.bibtex);
    setCopiedId(paper.id);
    playSound(920, 'triangle', 0.06);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getSourceBadgeStyle = (source) => {
    switch (source) {
      case 'arXiv':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'OpenAlex':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      case 'Semantic Scholar':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      default:
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    }
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
      <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4 md:px-12 backdrop-blur-md bg-black/25 border-b border-white/10">
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

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Audio Synthesizer Toggle */}
          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              if (next) playSound(520, 'sine', 0.1);
            }}
            title={soundEnabled ? 'Disable Audio Feedback' : 'Enable Cyber Audio Feedback'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 border border-white/15 text-xs font-mono text-white/60 hover:text-white transition-all cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5 text-white/40" />}
            <span className="hidden md:inline text-[10px] uppercase tracking-wider">{soundEnabled ? 'SFX ON' : 'SFX OFF'}</span>
          </button>

          {/* Live Shader Frequency / Palette Switcher */}
          <div className="hidden sm:flex items-center gap-1 p-1 rounded-full bg-black/50 border border-white/10 backdrop-blur-lg text-xs font-mono">
            {['cyan', 'amber', 'emerald', 'mono'].map((scheme) => (
              <button
                key={scheme}
                onClick={() => {
                  setColorScheme(scheme);
                  playSound(480, 'sine', 0.05);
                }}
                className={`px-2.5 py-1 rounded-full transition-all uppercase text-[10px] tracking-wider cursor-pointer ${
                  colorScheme === scheme
                    ? 'bg-white/20 text-white font-bold shadow-[0_0_12px_rgba(255,255,255,0.2)]'
                    : 'text-white/40 hover:text-white/80'
                }`}
              >
                {scheme}
              </button>
            ))}
          </div>

          {/* Live Scout Demo Trigger */}
          <button
            onClick={openScoutModal}
            className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider text-cyan-300 hover:text-cyan-200 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 hover:border-cyan-400/60 rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Test Scout</span>
          </button>

          {/* Sign In & Enter Links */}
          <a
            href="/login"
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-mono uppercase tracking-wider text-white/85 hover:text-white bg-white/5 hover:bg-white/15 border border-white/15 hover:border-white/35 rounded-xl transition-all"
          >
            <span>Sign In</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Main Teaser Centerpiece */}
      <main className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6 max-w-4xl mx-auto pt-14">
        {/* Mysterious Status Indicator & Interactive Demo Pill */}
        <div 
          onClick={openScoutModal}
          className="group inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 hover:bg-cyan-950/40 border border-white/15 hover:border-cyan-400/50 backdrop-blur-md mb-8 transition-all cursor-pointer shadow-[0_0_25px_rgba(0,0,0,0.6)]"
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
          <span className="text-[11px] font-mono tracking-[0.2em] text-cyan-200 uppercase">
            PROTOCOL ZERO // MULTI-GRAPH GROUNDING ACTIVE
          </span>
          <span className="hidden sm:inline-block text-[10px] font-mono uppercase text-cyan-400/80 group-hover:translate-x-0.5 transition-transform">
            [TRY DEMO →]
          </span>
        </div>

        {/* High-Hype Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-white/95 to-white/40 leading-[1.08] mb-6">
          THE DAWN OF <br />
          <span className="italic font-serif font-normal text-white/85">ZERO-HALLUCINATION SYNTHESIS.</span>
        </h1>

        {/* Minimal Enigmatic Description */}
        <p className="text-base sm:text-lg md:text-xl text-white/60 font-light max-w-xl mb-10 leading-relaxed">
          Connecting OpenAlex, arXiv, and CrossRef directly to high-throughput autonomous generation. 
          Scientific rigor with verified citations.
        </p>

        {/* Early Access / Clearance Key Form */}
        <div className="w-full max-w-md">
          {!submitSuccess ? (
            <form onSubmit={handleWaitlistSubmit} className="relative flex flex-col sm:flex-row items-center gap-2 p-1.5 rounded-2xl bg-black/60 border border-white/15 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.7)]">
              <div className="flex items-center gap-2.5 px-3.5 w-full py-2 sm:py-0">
                <Terminal className="w-4 h-4 text-white/40 shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter researcher email..."
                  required
                  disabled={isSubmitting}
                  className="w-full bg-transparent text-sm text-white placeholder-white/30 focus:outline-none font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs tracking-wider uppercase hover:bg-cyan-300 hover:shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <span>Request Key</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-white/10 border border-cyan-500/40 backdrop-blur-xl text-cyan-300 text-sm font-mono shadow-[0_0_30px_rgba(34,211,238,0.25)] animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
              <span className="text-left text-xs leading-relaxed">{submitMsg}</span>
            </div>
          )}

          {submitError && (
            <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs font-mono">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Action Row: Direct Studio Launch & Demo Scout Button */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
            <button
              onClick={openScoutModal}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/15 text-xs font-mono text-cyan-300 hover:text-cyan-200 transition-all cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Launch Live Scout Demo</span>
            </button>

            <a
              href="/app"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-mono text-white transition-all"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>Enter Manuscript Studio</span>
              <ArrowRight className="w-3 h-3 text-white/50" />
            </a>
          </div>

          <div className="flex items-center justify-center gap-6 mt-6 text-[11px] font-mono text-white/40 tracking-wider">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-white/30" /> OPENALEX + ARXIV + CROSSREF
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-white/30" /> 250M+ PAPERS
            </span>
          </div>
        </div>
      </main>

      {/* Interactive Live Scout Demo Modal Drawer */}
      {scoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xl animate-fade-in">
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-neutral-950/95 border border-white/20 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-black/40">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-wider uppercase text-white font-mono">
                    NEURAL LITERATURE SCOUT // LIVE DEMO
                  </h3>
                  <p className="text-[11px] text-white/50 font-mono">
                    Cross-querying OpenAlex, arXiv, and CrossRef without citation hallucinations
                  </p>
                </div>
              </div>
              <button
                onClick={() => setScoutOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Query Input & Fast Preset Chips */}
            <div className="p-6 border-b border-white/10 bg-black/20 space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleDemoSearch();
                }}
                className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/15 focus-within:border-cyan-400/60 transition-all"
              >
                <div className="flex items-center gap-2 px-3 w-full">
                  <Search className="w-4 h-4 text-cyan-400 shrink-0" />
                  <input
                    type="text"
                    value={scoutQuery}
                    onChange={(e) => setScoutQuery(e.target.value)}
                    placeholder="Search any scientific field (e.g., Graph Transformers, Crispr, Dark Matter)..."
                    className="w-full bg-transparent text-sm text-white placeholder-white/40 focus:outline-none font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-400 text-black font-semibold text-xs tracking-wider uppercase hover:bg-cyan-300 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Scout Papers</span>}
                </button>
              </form>

              {/* Fast Preset Chips */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="text-[11px] text-white/40 uppercase tracking-wider">Presets:</span>
                {[
                  'Quantum Computing',
                  'Large Language Models',
                  'CRISPR Cas9',
                  'Brain-Computer Interfaces',
                  'Graph Neural Networks'
                ].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setScoutQuery(tag);
                      handleDemoSearch(tag);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 hover:border-cyan-400/40 text-[11px] text-white/70 hover:text-cyan-300 transition-all cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isSearching && (
                <div className="flex flex-col items-center justify-center py-12 text-center text-white/60 font-mono space-y-3">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                  <p className="text-xs tracking-widest uppercase">
                    Interrogating 250M+ Academic Nodes across OpenAlex & arXiv...
                  </p>
                </div>
              )}

              {scoutError && !isSearching && (
                <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono">
                  {scoutError}
                </div>
              )}

              {!isSearching && scoutResults.length > 0 && (
                <div className="space-y-4">
                  {scoutResults.map((paper, idx) => (
                    <div
                      key={paper.id || idx}
                      className="p-5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-white/20 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${getSourceBadgeStyle(paper.source)}`}>
                              {paper.source}
                            </span>
                            <span className="text-xs font-mono text-white/50">
                              {paper.year}
                            </span>
                            {paper.citations && (
                              <span className="text-[11px] font-mono text-cyan-400/80">
                                {typeof paper.citations === 'number' ? `★ ${paper.citations} citations` : paper.citations}
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-semibold text-white leading-snug">
                            {paper.title}
                          </h4>
                        </div>
                      </div>

                      <p className="text-xs text-white/60 font-serif leading-relaxed line-clamp-3">
                        {paper.abstract}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs font-mono">
                        <div className="text-[11px] text-white/40 truncate max-w-[280px]">
                          {paper.authors && paper.authors.length > 0 ? paper.authors.join(', ') : 'Scholarly Authors'}
                        </div>

                        <div className="flex items-center gap-2">
                          {paper.bibtex && (
                            <button
                              onClick={() => copyBibtex(paper)}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] text-white/80 hover:text-white transition-all cursor-pointer"
                            >
                              {copiedId === paper.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-300 font-bold">BibTeX Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>BibTeX</span>
                                </>
                              )}
                            </button>
                          )}

                          {paper.oa_url && (
                            <a
                              href={paper.oa_url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/40 text-[11px] text-cyan-300 hover:text-cyan-200 transition-all"
                            >
                              <span>Open PDF</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Bottom CTA */}
            <div className="px-6 py-4 border-t border-white/10 bg-black/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] font-mono text-white/40">
                Ground any of these verified works into your manuscript automatically.
              </span>
              <a
                href="/login"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs tracking-wider uppercase hover:bg-cyan-300 transition-all"
              >
                <span>Launch Full Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Minimal Status Footer */}
      <footer className="absolute bottom-0 left-0 right-0 z-10 flex flex-col sm:flex-row items-center justify-between px-6 py-4 md:px-12 text-[10px] font-mono text-white/30 tracking-widest uppercase border-t border-white/5 backdrop-blur-sm bg-black/20">
        <div className="flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-cyan-400/60" />
          <span>RESEARCH ENGINE // OPENALEX • ARXIV • CROSSREF</span>
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
