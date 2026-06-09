import type { PersonalityOption } from './types';

// ─── Personality Options ─────────────────────────────────────────────────────

export const PERSONALITIES: PersonalityOption[] = [
  {
    id: 'chill',
    name: 'Chill Buddy',
    emoji: '😎',
    description: 'Warm and friendly. Keeps things casual and encouraging, like learning with a supportive friend.',
    voiceId: 'tongtong',
    samplePhrase: "Hey, no worries! Let's take it step by step — you've got this!",
  },
  {
    id: 'drill_sergeant',
    name: 'Drill Sergeant',
    emoji: '🎖️',
    description: 'Authoritative and structured. Keeps you focused and on track with clear directives.',
    voiceId: 'jam',
    samplePhrase: "Listen up! We have work to do. Focus on the task and don't get distracted!",
  },
  {
    id: 'patient',
    name: 'Patient Mentor',
    emoji: '🧘',
    description: 'Calm and professional. Takes time to explain thoroughly and never rushes you.',
    voiceId: 'xiaochen',
    samplePhrase: "Take your time understanding this concept. There's no rush — let me explain it again.",
  },
  {
    id: 'hype',
    name: 'Hype Coach',
    emoji: '🔥',
    description: 'Lively and enthusiastic. Celebrates your wins and pumps you up when things get tough.',
    voiceId: 'chuichui',
    samplePhrase: "YESSS! That was amazing! You're absolutely crushing it! Let's keep going!",
  },
];

// ─── Tool Definitions ────────────────────────────────────────────────────────

export interface ToolInfo {
  id: string;
  name: string;
  icon: string;        // lucide icon name
  description: string;
}

export const TOOLS: ToolInfo[] = [
  {
    id: 'google_ads',
    name: 'Google Ads',
    icon: 'target',
    description: 'Run ads that actually work',
  },
  {
    id: 'figma',
    name: 'Figma',
    icon: 'pen-tool',
    description: 'Design like a pro',
  },
  {
    id: 'shopify',
    name: 'Shopify',
    icon: 'shopping-bag',
    description: 'Build your online store',
  },
  {
    id: 'meta_ads',
    name: 'Meta Ads',
    icon: 'facebook',
    description: 'Ads on Instagram and Facebook',
  },
  {
    id: 'excel',
    name: 'Excel',
    icon: 'table',
    description: 'Master spreadsheets',
  },
  {
    id: 'canva',
    name: 'Canva',
    icon: 'palette',
    description: 'Create stunning visuals',
  },
];

// ─── Lookup Maps ─────────────────────────────────────────────────────────────

export const PERSONALITY_MAP = Object.fromEntries(
  PERSONALITIES.map((p) => [p.id, p])
) as Record<string, PersonalityOption>;

export const TOOL_MAP = Object.fromEntries(
  TOOLS.map((t) => [t.id, t])
) as Record<string, ToolInfo>;

// ─── API / Service Config ────────────────────────────────────────────────────

export const COMPANION_SERVICE_PORT = 3003;

// ─── Mood Detection Thresholds ───────────────────────────────────────────────

export const MOOD_THRESHOLDS = {
  /** Messages per minute above this = energetic */
  energeticRate: 5,
  /** Messages per minute below this = slow */
  slowRate: 1,
  /** Minutes without activity = absent */
  absentMinutes: 3,
} as const;

// ─── Screen Capture ──────────────────────────────────────────────────────────

export const SCREEN_CAPTURE = {
  /** How often to capture screen frames (ms) */
  captureInterval: 3000,
  /** Max width for captured frames */
  maxWidth: 1280,
  /** JPEG quality for frames (0-1) */
  quality: 0.6,
} as const;

// ─── Onboarding ──────────────────────────────────────────────────────────────

export const ONBOARDING_STEPS: Array<{ id: string; label: string }> = [
  { id: 'greeting', label: 'Welcome' },
  { id: 'goal', label: 'Your Goal' },
  { id: 'personality', label: 'Personality' },
  { id: 'screen-permission', label: 'Screen Access' },
  { id: 'ready', label: 'Ready' },
];
