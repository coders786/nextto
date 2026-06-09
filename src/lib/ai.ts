import ZAI from 'z-ai-web-dev-sdk';

// ─── Cached ZAI Instance ─────────────────────────────────────────────────────
// The SDK must be used server-side only. This module provides a singleton
// instance that is lazily initialized on first call and then reused.

let zaiInstance: InstanceType<typeof ZAI> | null = null;

export async function getAI(): Promise<InstanceType<typeof ZAI>> {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
    console.log('[AI] Z-AI SDK initialized');
  }
  return zaiInstance;
}

// ─── Personality System Prompts ──────────────────────────────────────────────

export type PersonalityType = 'chill' | 'drill_sergeant' | 'patient' | 'hype';

const PERSONALITY_PROMPTS: Record<PersonalityType, string> = {
  chill: `You are a chill, casual friend who teaches. You joke, you're never pushy, you keep it real. Use casual language. Make learning feel like hanging out.`,
  drill_sergeant: `You are a tough-love teacher. No excuses, but you genuinely care. You push hard because you know they can do it. Direct, firm, but always supportive underneath.`,
  patient: `You are infinitely patient. You explain things slowly, repeat as many times as needed, and never get annoyed. You make sure they truly understand before moving on.`,
  hype: `You celebrate EVERY tiny win. Your energy is always high. You make them feel like they're crushing it even when they're just starting. Enthusiastic, encouraging, uplifting.`,
};

// ─── Build Dynamic System Prompt ─────────────────────────────────────────────

export interface SystemPromptConfig {
  personality: PersonalityType;
  goal: string;
  businessContext: string;
  tool: string;
  screenContext?: string;
}

export function buildSystemPrompt(config: SystemPromptConfig): string {
  const personalityBase =
    PERSONALITY_PROMPTS[config.personality] || PERSONALITY_PROMPTS.chill;

  let prompt = `${personalityBase}

## Context
- Tool they're learning: ${config.tool}
- Their real goal: ${config.goal}
- Business context: ${config.businessContext || 'General learning'}

## Teaching Rules
1. MICRO-TEACHING: Teach ONE concept at a time. Never dump a wall of information.
2. ASK BEFORE TELLING: Guide them to discover answers. Ask a question before giving the answer.
3. MISTAKE DETECTION: If you spot a mistake in what they're doing, output it in this exact format: [MISTAKE:category] description [SUGGESTION:fix]
4. PROGRESS TRACKING: Notice when they improve and acknowledge it.
5. ANTI-YAPPING: Be concise. No long lectures. Short, punchy responses. Max 2-3 sentences unless they ask for more detail.
6. ADAPTIVE: If they seem confused, slow down. If they're cruising, speed up.
7. PRACTICAL: Always connect to their real goal and business context. No abstract theory without application.`;

  if (config.screenContext) {
    prompt += `\n\n## Current Screen Context\nThe user is currently looking at: ${config.screenContext}`;
  }

  return prompt;
}

// ─── Mistake Parsing ─────────────────────────────────────────────────────────

export interface MistakeInfo {
  category: string;
  description: string;
  suggestion: string;
}

const MISTAKE_PATTERN = /\[MISTAKE:(\w+)\]\s*(.+?)\s*\[SUGGESTION:(.+?)\]/gi;

export function parseMistakes(text: string): MistakeInfo[] {
  const mistakes: MistakeInfo[] = [];
  let match: RegExpExecArray | null;

  // Reset lastIndex for global regex
  MISTAKE_PATTERN.lastIndex = 0;

  while ((match = MISTAKE_PATTERN.exec(text)) !== null) {
    mistakes.push({
      category: match[1],
      description: match[2],
      suggestion: match[3],
    });
  }

  return mistakes;
}

// ─── Voice Mapping ───────────────────────────────────────────────────────────

export const VOICE_MAP: Record<PersonalityType, string> = {
  chill: 'tongtong',
  drill_sergeant: 'jam',
  patient: 'xiaochen',
  hype: 'chuichui',
};
