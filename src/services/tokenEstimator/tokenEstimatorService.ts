import { AIModel, TokenEstimate } from '../../types';
import { AI_MODELS, DEFAULT_MODEL_ID } from '../../constants/models';

class TokenCache {
  private cache: Map<string, { count: number; timestamp: number }> = new Map();
  private readonly maxSize: number = 250;

  public get(key: string): number | null {
    const item = this.cache.get(key);
    if (!item) return null;
    return item.count;
  }

  public set(key: string, count: number): void {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, { count, timestamp: Date.now() });
  }

  public clear(): void {
    this.cache.clear();
  }
}

export class TokenEstimatorService {
  private static instance: TokenEstimatorService;
  private cache = new TokenCache();
  private subscribers: Array<(estimate: TokenEstimate) => void> = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastTextHash: string = '';

  public static getInstance(): TokenEstimatorService {
    if (!TokenEstimatorService.instance) {
      TokenEstimatorService.instance = new TokenEstimatorService();
    }
    return TokenEstimatorService.instance;
  }

  public getModel(modelId: string): AIModel {
    return AI_MODELS.find(m => m.id === modelId) || AI_MODELS[0];
  }

  /**
   * Fast tokenizer heuristic calculation based on Byte Pair Encoding simulation
   * tailored to specific LLM tokenizer families
   */
  public calculateTokens(text: string, modelId: string = DEFAULT_MODEL_ID): { count: number; isCached: boolean } {
    if (!text || text.length === 0) {
      return { count: 0, isCached: false };
    }

    const model = this.getModel(modelId);
    const cacheKey = `${modelId}::${text.length}::${this.hashString(text)}`;

    const cached = this.cache.get(cacheKey);
    if (cached !== null) {
      return { count: cached, isCached: true };
    }

    let tokenCount = 0;

    // Fast BPE-like heuristic for accurate counting across languages and code
    // Patterns: words, numbers, punctuation, contractions, whitespace sequences, code symbols
    const tokens = text.match(/[\p{L}\p{N}]+|[^\s\p{L}\p{N}]+|\s+/gu) || [];

    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      const len = t.length;

      if (/^\s+$/.test(t)) {
        // Whitespaces: single space = 0.5 - 1 token, large indents count per 3-4 spaces
        tokenCount += Math.ceil(len / 4);
      } else if (/^\d+$/.test(t)) {
        // Numbers: typically 1-3 digits per token
        tokenCount += Math.ceil(len / 3);
      } else if (/^[\p{L}]+$/u.test(t)) {
        // Alphabetic words
        if (model.tokenizerType === 'o200k_base') {
          // GPT-4o has large 200k vocabulary (fewer tokens for common English & code)
          tokenCount += Math.max(1, Math.ceil(len / 4.4));
        } else if (model.tokenizerType === 'claude') {
          // Claude tokenizer
          tokenCount += Math.max(1, Math.ceil(len / 4.1));
        } else if (model.tokenizerType === 'gemini') {
          // Gemini SentencePiece
          tokenCount += Math.max(1, Math.ceil(len / 4.0));
        } else {
          // cl100k standard
          tokenCount += Math.max(1, Math.ceil(len / 3.8));
        }
      } else {
        // Code punctuation / Symbols / XML tags
        tokenCount += Math.ceil(len / 2.2);
      }
    }

    const finalCount = Math.max(1, Math.round(tokenCount));
    this.cache.set(cacheKey, finalCount);
    return { count: finalCount, isCached: false };
  }

  public async estimateTokensAsync(text: string, modelId: string = DEFAULT_MODEL_ID): Promise<TokenEstimate> {
    const model = this.getModel(modelId);
    const { count, isCached } = this.calculateTokens(text, modelId);
    
    // Cost calculation (USD per Million tokens input)
    const cost = (count / 1_000_000) * model.inputCostPerMillion;
    const charCount = text.length;
    const wordCount = (text.trim().match(/\S+/g) || []).length;
    const lineCount = text.split('\n').length;
    const percentOfContext = Math.min(100, Math.round((count / model.contextWindow) * 1000) / 10);

    // Segment Breakdown analysis
    const codeMatch = text.match(/```[\s\S]*?```/g) || [];
    const codeText = codeMatch.join('\n');
    const codeTokens = this.calculateTokens(codeText, modelId).count;

    const varMatch = text.match(/\{\{([^}]+)\}\}/g) || [];
    const varText = varMatch.join(' ');
    const templateVariableTokens = this.calculateTokens(varText, modelId).count;

    const systemPromptMatch = text.match(/<(?:system_instruction|system|instructions)>([\s\S]*?)<\/(?:system_instruction|system|instructions)>/i);
    const systemPromptTokens = systemPromptMatch ? this.calculateTokens(systemPromptMatch[1], modelId).count : 0;
    const userContentTokens = Math.max(0, count - systemPromptTokens - codeTokens);

    return {
      tokenCount: count,
      cost,
      charCount,
      wordCount,
      lineCount,
      model,
      status: isCached ? 'cached' : 'live',
      percentOfContext,
      breakdown: {
        systemPromptTokens,
        userContentTokens,
        codeTokens,
        templateVariableTokens
      }
    };
  }

  public scheduleEstimate(text: string, modelId: string = DEFAULT_MODEL_ID, delayMs: number = 250) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      const estimate = await this.estimateTokensAsync(text, modelId);
      this.notifySubscribers(estimate);
    }, delayMs);
  }

  public subscribe(callback: (estimate: TokenEstimate) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  private notifySubscribers(estimate: TokenEstimate) {
    this.subscribers.forEach(cb => cb(estimate));
  }

  public clearCache(): void {
    this.cache.clear();
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < Math.min(str.length, 500); i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return String(hash);
  }
}

export const tokenEstimatorService = TokenEstimatorService.getInstance();
