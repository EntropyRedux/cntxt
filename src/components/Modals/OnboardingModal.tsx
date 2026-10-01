import React, { useState } from 'react';
import { 
  Sparkles, 
  Terminal, 
  BookOpen, 
  FileCode, 
  Cpu, 
  Zap, 
  Layers, 
  ArrowRight, 
  Check, 
  X,
  Bot
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useTabStore } from '../../store/tabStore';

export interface OnboardingModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

type Archetype = 'prompt_engineer' | 'developer' | 'writer';
type StarterTemplate = 'prompt_studio' | 'tech_spec' | 'blank';

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const { completeOnboarding } = useAuthStore();
  const { createTab } = useTabStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedArchetype, setSelectedArchetype] = useState<Archetype>('prompt_engineer');
  const [selectedStarter, setSelectedStarter] = useState<StarterTemplate>('prompt_studio');

  if (!isOpen) return null;

  const handleFinish = () => {
    // Generate starter document based on chosen template
    if (selectedStarter === 'prompt_studio') {
      createTab(
        'Prompt_Architecture_Starter.md',
        `# Prompt Architecture Kit

> System prompt template designed for high-precision LLM context structuring.

## Role & Goal
You are an expert **{{system_role:Senior AI Architect}}**.
Your primary objective is to analyze requirements and generate production-grade outputs.

## Input Context
\`\`\`markdown
{{user_context:Paste your source material or requirements here...}}
\`\`\`

## Interactive Workflows
Click the action widget below to execute a context expansion workflow:
[[action:prompt_expand]]

## Output Guidelines
1. Be structured and concise.
2. Provide code snippets with language fences.
3. Validate edge cases.
`,
        'markdown'
      );
    } else if (selectedStarter === 'tech_spec') {
      createTab(
        'Technical_Architecture_Spec.md',
        `# Architecture & Flow Specification

## 1. System Topology
The following Mermaid diagram illustrates the service mesh architecture:

\`\`\`mermaid
graph TD
    Client[Browser / Desktop] -->|Auth Bearer| Gateway[API Gateway]
    Gateway --> ServiceA[Auth Service]
    Gateway --> ServiceB[Document Engine]
    ServiceB --> DB[(Supabase PostgreSQL)]
\`\`\`

## 2. Mathematical Latency Model
Target P99 latency is bounded by:

$$
T_{total} = T_{network} + \\sum_{i=1}^{n} T_{service_i} < 150\\text{ms}
$$

## 3. Boundary Implementation
All endpoints require strict Zod schema validation before processing.
`,
        'markdown'
      );
    }

    completeOnboarding();
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150 select-none font-sans">
      <div className="w-full max-w-xl bg-[var(--card-bg)] border border-[var(--border-primary)] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative text-[var(--text-primary)]">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-24 bg-[var(--accent-primary)]/15 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-5 pb-3.5 flex items-center justify-between border-b border-[var(--border-subtle)] relative z-10">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="CNTXT" 
              className="w-9 h-9 rounded-xl object-contain shadow-md border border-[var(--border-subtle)]" 
            />
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)] tracking-tight">Welcome to .CNTXT</h2>
              <p className="text-xs text-[var(--text-muted)]">Step {step} of 3 • Workspace Setup</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={() => {
                completeOnboarding();
                onClose();
              }}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded-lg hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Step Progress Bar */}
        <div className="w-full bg-[var(--border-subtle)]/40 h-1">
          <div
            className="bg-[var(--accent-primary)] h-1 transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Step Content */}
        <div className="p-6 relative z-10">
          {step === 1 && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Select your primary craft</h3>
              <p className="text-xs text-[var(--text-muted)] mb-4">
                We'll tune the quick formatting bar and action shortcuts for your workflow.
              </p>

              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => setSelectedArchetype('prompt_engineer')}
                  className={`p-3.5 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                    selectedArchetype === 'prompt_engineer'
                      ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)] text-[var(--text-primary)] shadow-xs'
                      : 'bg-[var(--card-secondary-bg)] border-[var(--border-subtle)] hover:border-[var(--border-primary)] text-[var(--text-secondary)]'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                      Prompt Architect & AI Engineer
                      {selectedArchetype === 'prompt_engineer' && <Check className="w-3.5 h-3.5 text-[var(--accent-primary)]" />}
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">
                      Craft system prompts, variable interpolation templates (`{"{{var}}"}`), and token estimators.
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedArchetype('developer')}
                  className={`p-3.5 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                    selectedArchetype === 'developer'
                      ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)] text-[var(--text-primary)] shadow-xs'
                      : 'bg-[var(--card-secondary-bg)] border-[var(--border-subtle)] hover:border-[var(--border-primary)] text-[var(--text-secondary)]'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 shrink-0 mt-0.5">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                      Software Developer & System Architect
                      {selectedArchetype === 'developer' && <Check className="w-3.5 h-3.5 text-[var(--accent-primary)]" />}
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">
                      Architecture design docs, live Mermaid flowcharts, code syntax highlighting, and specs.
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedArchetype('writer')}
                  className={`p-3.5 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                    selectedArchetype === 'writer'
                      ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)] text-[var(--text-primary)] shadow-xs'
                      : 'bg-[var(--card-secondary-bg)] border-[var(--border-subtle)] hover:border-[var(--border-primary)] text-[var(--text-secondary)]'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                      Technical Writer & Researcher
                      {selectedArchetype === 'writer' && <Check className="w-3.5 h-3.5 text-[var(--accent-primary)]" />}
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">
                      Zen distraction-free writing, rich KaTeX math formatting, and instant markdown preview.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Pick a starter document</h3>
              <p className="text-xs text-[var(--text-muted)] mb-4">
                Start with a pre-configured template or a pristine blank slate.
              </p>

              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => setSelectedStarter('prompt_studio')}
                  className={`p-3.5 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                    selectedStarter === 'prompt_studio'
                      ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)] text-[var(--text-primary)] shadow-xs'
                      : 'bg-[var(--card-secondary-bg)] border-[var(--border-subtle)] hover:border-[var(--border-primary)] text-[var(--text-secondary)]'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] shrink-0 mt-0.5">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                      Prompt Architecture Kit
                      {selectedStarter === 'prompt_studio' && <Check className="w-3.5 h-3.5 text-[var(--accent-primary)]" />}
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">
                      Demonstrates variable extraction modal, executable action buttons, and token counting.
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedStarter('tech_spec')}
                  className={`p-3.5 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                    selectedStarter === 'tech_spec'
                      ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)] text-[var(--text-primary)] shadow-xs'
                      : 'bg-[var(--card-secondary-bg)] border-[var(--border-subtle)] hover:border-[var(--border-primary)] text-[var(--text-secondary)]'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 shrink-0 mt-0.5">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                      Technical Spec & Diagram Kit
                      {selectedStarter === 'tech_spec' && <Check className="w-3.5 h-3.5 text-[var(--accent-primary)]" />}
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">
                      Includes live Mermaid architectural diagrams, KaTeX latency formulas, and code blocks.
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedStarter('blank')}
                  className={`p-3.5 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                    selectedStarter === 'blank'
                      ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)] text-[var(--text-primary)] shadow-xs'
                      : 'bg-[var(--card-secondary-bg)] border-[var(--border-subtle)] hover:border-[var(--border-primary)] text-[var(--text-secondary)]'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-[var(--card-hover-bg)] text-[var(--text-muted)] shrink-0 mt-0.5">
                    <FileCode className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                      Clean Slate (Blank Markdown)
                      {selectedStarter === 'blank' && <Check className="w-3.5 h-3.5 text-[var(--accent-primary)]" />}
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">
                      A clean empty document workspace for immediate focused writing.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Three Superpowers to Know</h3>
              <p className="text-xs text-[var(--text-muted)] mb-4">
                Here are the unique features that make .CNTXT unlike any typical editor:
              </p>

              <div className="grid grid-cols-1 gap-2.5">
                <div className="p-3 rounded-xl bg-[var(--card-secondary-bg)] border border-[var(--border-subtle)] flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--text-primary)]">
                      Executable Action Buttons (`[[action:id]]`)
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      Type `[[action:my_action]]` anywhere in your text to embed a clickable button that runs sandboxed JavaScript macros directly on your active text.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--card-secondary-bg)] border border-[var(--border-subtle)] flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] shrink-0 mt-0.5">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--text-primary)]">
                      Multi-Model Token Estimators
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      Live token metrics in the bottom status bar calculate exact context window consumption for GPT-4o, Claude 3.5, and Gemini 1.5.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--card-secondary-bg)] border border-[var(--border-subtle)] flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--text-primary)]">
                      Unified 44px Header & Command Palette
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      Press <kbd className="px-1.5 py-0.5 rounded bg-[var(--card-hover-bg)] text-[10px] font-mono border border-[var(--border-subtle)]">⌘K</kbd> to search commands or switch documents. The top header slides away when you scroll down.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 px-6 border-t border-[var(--border-subtle)] bg-[var(--card-bg)] flex items-center justify-between relative z-10">
          {step > 1 ? (
            <button
              onClick={() => setStep((step - 1) as 1 | 2)}
              className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded-lg hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep((step + 1) as 2 | 3)}
              className="text-xs font-medium bg-[var(--accent-primary)] hover:opacity-90 text-white px-4 py-2 rounded-xl shadow-xs transition-opacity flex items-center gap-1.5 cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="text-xs font-semibold bg-[var(--accent-primary)] hover:opacity-90 text-white px-5 py-2 rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Enter Workspace</span>
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
