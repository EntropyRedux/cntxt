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
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col relative text-zinc-100">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-24 bg-indigo-500/20 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-6 pb-4 flex items-center justify-between border-b border-zinc-800/80 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">Welcome to ContextPad</h2>
              <p className="text-xs text-zinc-400">Step {step} of 3 • Workspace Personalization</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={() => {
                completeOnboarding();
                onClose();
              }}
              className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Step Progress Bar */}
        <div className="w-full bg-zinc-800 h-1">
          <div
            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1 transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Step Content */}
        <div className="p-6 relative z-10">
          {step === 1 && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-1">Select your primary craft</h3>
              <p className="text-xs text-zinc-400 mb-4">
                We'll tune the quick formatting bar and action shortcuts for your workflow.
              </p>

              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => setSelectedArchetype('prompt_engineer')}
                  className={`p-3.5 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                    selectedArchetype === 'prompt_engineer'
                      ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-xs'
                      : 'bg-zinc-800/50 border-zinc-700/60 hover:border-zinc-600 text-zinc-300'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
                      Prompt Architect & AI Engineer
                      {selectedArchetype === 'prompt_engineer' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Craft system prompts, variable interpolation templates (`{"{{var}}"}`), and token estimators.
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedArchetype('developer')}
                  className={`p-3.5 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                    selectedArchetype === 'developer'
                      ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-xs'
                      : 'bg-zinc-800/50 border-zinc-700/60 hover:border-zinc-600 text-zinc-300'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 shrink-0 mt-0.5">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
                      Software Developer & System Architect
                      {selectedArchetype === 'developer' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Architecture design docs, live Mermaid flowcharts, code syntax highlighting, and specs.
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedArchetype('writer')}
                  className={`p-3.5 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                    selectedArchetype === 'writer'
                      ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-xs'
                      : 'bg-zinc-800/50 border-zinc-700/60 hover:border-zinc-600 text-zinc-300'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
                      Technical Writer & Researcher
                      {selectedArchetype === 'writer' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Zen distraction-free writing, rich KaTeX math formatting, and instant markdown preview.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-1">Pick a starter document</h3>
              <p className="text-xs text-zinc-400 mb-4">
                Start with a pre-configured template or a pristine blank slate.
              </p>

              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => setSelectedStarter('prompt_studio')}
                  className={`p-3.5 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                    selectedStarter === 'prompt_studio'
                      ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-xs'
                      : 'bg-zinc-800/50 border-zinc-700/60 hover:border-zinc-600 text-zinc-300'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0 mt-0.5">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
                      Prompt Architecture Kit
                      {selectedStarter === 'prompt_studio' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Demonstrates variable extraction modal, executable action buttons, and token counting.
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedStarter('tech_spec')}
                  className={`p-3.5 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                    selectedStarter === 'tech_spec'
                      ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-xs'
                      : 'bg-zinc-800/50 border-zinc-700/60 hover:border-zinc-600 text-zinc-300'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 shrink-0 mt-0.5">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
                      Technical Spec & Diagram Kit
                      {selectedStarter === 'tech_spec' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Includes live Mermaid architectural diagrams, KaTeX latency formulas, and code blocks.
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedStarter('blank')}
                  className={`p-3.5 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                    selectedStarter === 'blank'
                      ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-xs'
                      : 'bg-zinc-800/50 border-zinc-700/60 hover:border-zinc-600 text-zinc-300'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-zinc-700/40 text-zinc-300 shrink-0 mt-0.5">
                    <FileCode className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
                      Clean Slate (Blank Markdown)
                      {selectedStarter === 'blank' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      A clean empty document for immediate focused writing.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-1">Three Superpowers to Know</h3>
              <p className="text-xs text-zinc-400 mb-4">
                Here are the unique features that make ContextPad unlike any typical editor:
              </p>

              <div className="grid grid-cols-1 gap-2.5">
                <div className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/50 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-100">
                      Executable Action Buttons (`[[action:id]]`)
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Type `[[action:my_action]]` anywhere in your text to embed a clickable button that runs sandboxed JavaScript macros directly on your active text.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/50 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0 mt-0.5">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-100">
                      Multi-Model Token Estimators
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Live token metrics in the bottom status bar calculate exact context window consumption for GPT-4o, Claude 3.5, and Gemini 1.5.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/50 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-100">
                      Unified 48px Header & Command Palette
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Press <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-[10px] font-mono border border-zinc-700">⌘K</kbd> to search commands or switch documents. The top header slides away when you scroll down.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 px-6 border-t border-zinc-800 bg-zinc-900/80 flex items-center justify-between relative z-10">
          {step > 1 ? (
            <button
              onClick={() => setStep((step - 1) as 1 | 2)}
              className="text-xs font-medium text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep((step + 1) as 2 | 3)}
              className="text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="text-xs font-semibold bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-500 text-white px-5 py-2 rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2 cursor-pointer"
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
