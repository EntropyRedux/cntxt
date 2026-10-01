import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Sparkles, ArrowRight, ShieldCheck, Zap, Code2, Layers, CheckCircle2, AlertCircle } from 'lucide-react';

export const WebAuthGateway: React.FC = () => {
  const { loginWithGoogle, loginWithGitHub, continueAsGuest, authError, syncStatus } = useAuthStore();
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'github' | null>(null);

  const handleGoogleLogin = async () => {
    try {
      setLoadingProvider('google');
      await loginWithGoogle();
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleGitHubLogin = async () => {
    try {
      setLoadingProvider('github');
      await loginWithGitHub();
    } finally {
      setLoadingProvider(null);
    }
  };

  const isSubmitting = syncStatus === 'syncing' || loadingProvider !== null;

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-[var(--app-bg)] text-[var(--text-primary)] select-none relative overflow-x-hidden font-sans">
      {/* Background ambient lighting glows */}
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-[var(--accent-primary)] opacity-10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[15%] w-[450px] h-[450px] rounded-full bg-[var(--status-warning,#eab308)] opacity-5 blur-[150px] pointer-events-none" />

      {/* Top Navbar */}
      <header className="w-full max-w-6xl mx-auto px-6 py-5 flex items-center justify-between relative z-10 border-b border-[var(--border-subtle)]/40">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="CNTXT" 
            className="w-9 h-9 rounded-xl object-contain shadow-lg shadow-black/40 border border-[var(--border-subtle)]"
          />
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg tracking-wider text-[var(--text-primary)]">
              .CNTXT
            </span>
            <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[var(--accent-container)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/20">
              Web Studio
            </span>
          </div>
        </div>

        <button
          onClick={continueAsGuest}
          className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[var(--card-hover-bg)] border border-[var(--border-subtle)]"
        >
          <span>Explore Guest Demo</span>
          <ArrowRight className="w-3.5 h-3.5 opacity-70" />
        </button>
      </header>

      {/* Hero & Authentication Card */}
      <main className="w-full max-w-4xl mx-auto px-6 py-10 flex flex-col items-center justify-center flex-1 relative z-10 text-center">
        {/* App Icon Centered Showcase */}
        <div className="mb-6 relative group">
          <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-amber-500/20 via-[var(--accent-primary)]/30 to-amber-500/20 blur-xl opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <img 
            src="/logo.png" 
            alt="CNTXT Icon" 
            className="w-24 h-24 rounded-2xl object-contain shadow-2xl relative z-10 border border-[var(--border-subtle)] bg-[var(--card-bg)]"
          />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--card-bg)] border border-[var(--border-subtle)] text-[var(--text-muted)] text-xs mb-4 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-[var(--status-warning,#eab308)]" />
          <span className="text-[var(--text-secondary)]">The Structured Writing & AI Context Studio</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight max-w-2xl leading-[1.15] mb-3 text-[var(--text-primary)]">
          Draft with clarity.{' '}
          <span className="bg-gradient-to-r from-[var(--text-primary)] via-[var(--accent-primary)] to-[var(--status-warning,#eab308)] bg-clip-text text-transparent">
            Execute with power.
          </span>
        </h1>
        <p className="text-[var(--text-muted)] text-sm sm:text-base max-w-xl mb-8 leading-relaxed">
          The unified markdown workspace with modular ribbon toolboxes, executable AST action macros, and multi-model token estimators.
        </p>

        {/* Auth Gateway Box */}
        <div className="w-full max-w-md bg-[var(--card-bg)] border border-[var(--border-primary)] rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative text-left">
          <div className="text-center mb-6">
            <h2 className="text-base font-bold text-[var(--text-primary)]">Sign in to your workspace</h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">100% Free. Client-side privacy. Zero tracking.</p>
          </div>

          {authError && (
            <div className="mb-5 p-3 rounded-lg bg-[var(--status-error,#ef4444)]/10 border border-[var(--status-error,#ef4444)]/30 flex items-start gap-2.5 text-left text-xs text-[var(--status-error,#ef4444)]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {/* OAuth Buttons */}
          <div className="flex flex-col gap-3">
            {/* GitHub OAuth Button */}
            <button
              onClick={handleGitHubLogin}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl font-medium text-sm bg-[var(--card-secondary-bg)] hover:bg-[var(--card-hover-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-primary)] transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>{loadingProvider === 'github' ? 'Connecting to GitHub...' : 'Continue with GitHub'}</span>
            </button>

            {/* Google OAuth Button */}
            <button
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl font-medium text-sm bg-[var(--card-secondary-bg)] hover:bg-[var(--card-hover-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-primary)] transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.87c2.26-2.09 3.67-5.17 3.67-9.15z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.05c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.25v3.15C3.25 21.36 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.25C.45 8.22 0 10.06 0 12s.45 3.78 1.25 5.39l4.02-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.64 1.25 6.61l4.02 3.15c.95-2.85 3.6-4.96 6.73-4.96z"
                />
              </svg>
              <span>{loadingProvider === 'google' ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border-subtle)]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[var(--card-bg)] px-3 text-[var(--text-muted)] font-medium tracking-wider">or</span>
            </div>
          </div>

          {/* Guest Mode CTA */}
          <button
            onClick={continueAsGuest}
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm bg-[var(--accent-primary)] hover:opacity-90 text-white shadow-md shadow-black/20 transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>Try Demo Workspace</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
          <p className="text-[11px] text-[var(--text-muted)] mt-2 text-center">
            Zero sign-up required. Instant browser storage via IndexedDB.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 w-full text-left">
          <div className="p-3.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border-subtle)] shadow-xs">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent-container)] text-[var(--accent-primary)] flex items-center justify-center mb-2">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-semibold text-[var(--text-primary)]">Token Estimators</h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Live token counts for OpenAI, Claude, and Gemini.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border-subtle)] shadow-xs">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent-container)] text-[var(--accent-primary)] flex items-center justify-center mb-2">
              <Code2 className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-semibold text-[var(--text-primary)]">AST Action Buttons</h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Run interactive JS macros right inside markdown.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border-subtle)] shadow-xs">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent-container)] text-[var(--accent-primary)] flex items-center justify-center mb-2">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-semibold text-[var(--text-primary)]">Diagrams & Math</h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Mermaid flowcharts, KaTeX LaTeX, and live preview.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border-subtle)] shadow-xs">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent-container)] text-[var(--accent-primary)] flex items-center justify-center mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-semibold text-[var(--text-primary)]">100% Private</h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Offline-first architecture with zero telemetry.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--text-muted)] border-t border-[var(--border-subtle)]/40 relative z-10 gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[var(--text-primary)]">.CNTXT v2.10</span>
          <span>•</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Cloud & Offline Engines Active
          </span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/EntropyRedux/cntxt"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[var(--text-primary)] transition-colors"
          >
            GitHub
          </a>
          <span>•</span>
          <span>Desktop & Android Available</span>
        </div>
      </footer>
    </div>
  );
};
