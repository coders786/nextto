export type PersonalityType = 'chill' | 'drill_sergeant' | 'patient' | 'hype';
export type ViewMode = 'landing' | 'onboarding' | 'session' | 'review';
export type OnboardingStep = 'greeting' | 'goal' | 'personality' | 'screen-permission' | 'ready';
export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageSource = 'text' | 'voice' | 'screen';
export type SessionStatus = 'active' | 'paused' | 'completed';
export type MoodType = 'focused' | 'slow' | 'tired' | 'energetic' | 'absent';
export type MistakeSeverity = 'critical' | 'warning' | 'minor';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  source: MessageSource;
  timestamp: Date;
  audioUrl?: string;
  screenData?: string;
  aiContext?: string;
}

export interface LearningGoal {
  tool: string;            // e.g., 'google_ads', 'figma', 'shopify'
  statedGoal: string;      // what user said they want to learn
  realGoal: string;        // the deeper goal (e.g., "get people to buy my candles")
  businessContext: string; // context about user's situation
}

export interface Mistake {
  id: string;
  category: string;
  description: string;
  context?: string;
  frequency: number;
  resolved: boolean;
  createdAt: Date;
}

export interface SkillProgress {
  tool: string;
  skill: string;
  level: number; // 0.0 to 1.0
  lastTested?: Date;
}

export interface DailyQuest {
  id: string;
  quest: string;
  completed: boolean;
  questDate: Date;
}

export interface ScreenState {
  isSharing: boolean;
  currentFrame?: string; // base64
  lastAnalysis?: string;
  analysisTimestamp?: Date;
}

export interface VoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  currentTranscript?: string;
}

export interface SessionState {
  sessionId?: string;
  status: SessionStatus;
  mood: MoodType;
  startedAt?: Date;
  screen: ScreenState;
  voice: VoiceState;
}

export interface PersonalityOption {
  id: PersonalityType;
  name: string;
  emoji: string;
  description: string;
  voiceId: string; // maps to TTS voice
  samplePhrase: string;
}
