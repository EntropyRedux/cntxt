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
    <div className="min-h-screen w-full flex flex-col justify-between bg-[var(--app-bg,#0c0e12)] text-[var(--text-primary,#e1e7ed)] select-none relative overflow-x-hidden font-sans">
      {/* Background ambient lighting glows */}
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-[var(--accent-primary,#3b82f6)] opacity-10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[15%] w-[450px] h-[450px] rounded-full bg-[var(--accent-secondary,#8b5cf6)] opacity-10 blur-[140px] pointer-events-none" />

      {/* Top Navbar */}
      <header className="w-full max-w-6xl mx-auto px-6 py-5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="font-extrabold text-white text-base tracking-tighter">CP</span>
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              ContextPad
            </span>
            <span className="ml-2 text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Web Cloud
            </span>
          </div>
        </div>

        <button
          onClick={continueAsGuest}
          className="text-xs font-medium text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-zinc-800"
        >
          Explore as Guest
          <ArrowRight className="w-3.5 h-3.5 opacity-70" />
        </button>
      </header>

      {/* Hero & Authentication Card */}
      <main className="w-full max-w-4xl mx-auto px-6 py-8 flex flex-col items-center justify-center flex-1 relative z-10 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800/80 text-zinc-300 text-xs mb-6 shadow-xs backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>Next-Generation Context & Document Studio</span>
        </div>

        {/* Title & Pitch */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight max-w-2xl leading-[1.15] mb-4">
          Draft prompts, docs, and code with{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            tactile power.
          </span>
        </h1>
        <p className="text-zinc-400 text-sm sm:text-base max-w-xl mb-8 leading-relaxed">
          The unified markdown workspace with executable AST action buttons, real-time token estimators, and instant cloud sync.
        </p>

        {/* Auth Gateway Box */}
        <div className="w-full max-w-md bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative">
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold text-zinc-100">Sign in to your workspace</h2>
            <p className="text-xs text-zinc-400 mt-1">Free forever. Zero lock-in. 100% private.</p>
          </div>

          {authError && (
            <div className="mb-5 p-3 rounded-lg bg-red-950/40 border border-red-800/50 flex items-start gap-2.5 text-left text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {/* OAuth Buttons */}
          <div className="flex flex-col gap-3">
            {/* Google OAuth Button */}
            <button
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl font-medium text-sm bg-zinc-800/90 hover:bg-zinc-700/90 text-zinc-100 border border-zinc-700/60 hover:border-zinc-600 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
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
              <span>{loadingProvider === 'google' ? 'Connecting...' : 'Continue with Google'}</span>
            </button>

            {/* GitHub OAuth Button */}
            <button
              onClick={handleGitHubLogin}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl font-medium text-sm bg-zinc-800/90 hover:bg-zinc-700/90 text-zinc-100 border border-zinc-700/60 hover:border-zinc-600 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>{loadingProvider === 'github' ? 'Connecting...' : 'Continue with GitHub'}</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-900 px-3 text-zinc-500 font-medium tracking-wider">or</span>
            </div>
          </div>

          {/* Guest Mode CTA */}
          <button
            onClick={continueAsGuest}
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-xl font-medium text-sm bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>Try Demo Workspace</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
          <p className="text-[11px] text-zinc-400 mt-2.5">
            Instant browser access via IndexedDB. No account required.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 w-full text-left">
          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-xs">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-2.5">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-semibold text-zinc-200">Token Estimator</h3>
            <p className="text-[11px] text-zinc-400 mt-1">Live token counts for OpenAI, Claude, and Gemini.</p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-xs">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-2.5">
              <Code2 className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-semibold text-zinc-200">AST Actions</h3>
            <p className="text-[11px] text-zinc-400 mt-1">Executable buttons embedded right into markdown.</p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-xs">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2.5">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-semibold text-zinc-200">Split Preview</h3>
            <p className="text-[11px] text-zinc-400 mt-1">Mermaid diagrams, KaTeX math & syntax highlight.</p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-xs">
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-2.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-semibold text-zinc-200">100% Private</h3>
            <p className="text-[11px] text-zinc-400 mt-1">Zero analytics tracking. Client-side encryption.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-400 border-t border-zinc-800/50 relative z-10 gap-3">
        <div className="flex items-center gap-2">
          <span>ContextPad v2.00</span>
          <span>•</span>
          <span className="text-emerald-400/80 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            All systems operational
          </span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/EntropyRedux/cntxt"
            target="_blank"
            rel="noreferrer"
            className="hover:text-zinc-200 transition-colors"
          >
            GitHub
          </a>
          <span>•</span>
          <span>Native Desktop & Android Available</span>
        </div>
      </footer>
    </div>
  );
};
