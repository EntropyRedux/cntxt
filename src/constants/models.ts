import { AIModel } from '../types';

export const AI_MODELS: AIModel[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o (Omni)',
    provider: 'OpenAI',
    contextWindow: 128000,
    inputCostPerMillion: 2.50,
    outputCostPerMillion: 10.00,
    tokenizerType: 'o200k_base',
    recommendedFor: 'Complex reasoning, vision, code generation'
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    contextWindow: 128000,
    inputCostPerMillion: 0.15,
    outputCostPerMillion: 0.60,
    tokenizerType: 'o200k_base',
    recommendedFor: 'Fast tasks, extraction, high-volume prompts'
  },
  {
    id: 'claude-3-7-sonnet',
    name: 'Claude 3.7 Sonnet',
    provider: 'Anthropic',
    contextWindow: 200000,
    inputCostPerMillion: 3.00,
    outputCostPerMillion: 15.00,
    tokenizerType: 'claude',
    recommendedFor: 'Deep coding, hybrid reasoning, nuanced writing'
  },
  {
    id: 'claude-3-5-haiku',
    name: 'Claude 3.5 Haiku',
    provider: 'Anthropic',
    contextWindow: 200000,
    inputCostPerMillion: 0.80,
    outputCostPerMillion: 4.00,
    tokenizerType: 'claude',
    recommendedFor: 'Rapid drafting, quick transformations'
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'Google',
    contextWindow: 1048576,
    inputCostPerMillion: 0.10,
    outputCostPerMillion: 0.40,
    tokenizerType: 'gemini',
    recommendedFor: 'Ultra-long context, multimodal prompts, sub-second latency'
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'Google',
    contextWindow: 2097152,
    inputCostPerMillion: 1.25,
    outputCostPerMillion: 5.00,
    tokenizerType: 'gemini',
    recommendedFor: 'Massive 2M token context, repository analysis'
  },
  {
    id: 'deepseek-v3',
    name: 'DeepSeek V3',
    provider: 'DeepSeek',
    contextWindow: 64000,
    inputCostPerMillion: 0.14,
    outputCostPerMillion: 0.28,
    tokenizerType: 'cl100k_base',
    recommendedFor: 'Economical high-performance coding'
  },
  {
    id: 'llama-3.3-70b',
    name: 'Llama 3.3 70B',
    provider: 'Meta',
    contextWindow: 128000,
    inputCostPerMillion: 0.60,
    outputCostPerMillion: 0.60,
    tokenizerType: 'approx',
    recommendedFor: 'Open-source standard for general tasks'
  }
];

export const DEFAULT_MODEL_ID = 'gpt-4o';
