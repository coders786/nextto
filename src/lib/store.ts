import { create } from 'zustand';
import type {
  ViewMode,
  OnboardingStep,
  PersonalityType,
  MoodType,
  MessageSource,
  ChatMessage,
  LearningGoal,
  Mistake,
  SkillProgress,
  DailyQuest,
  SessionState,
} from './types';

// ─── Default Session State ───────────────────────────────────────────────────

const defaultSession: SessionState = {
  sessionId: undefined,
  status: 'completed',
  mood: 'focused',
  startedAt: undefined,
  screen: {
    isSharing: false,
    currentFrame: undefined,
    lastAnalysis: undefined,
    analysisTimestamp: undefined,
  },
  voice: {
    isListening: false,
    isSpeaking: false,
    currentTranscript: undefined,
  },
};

// ─── Store Interface ─────────────────────────────────────────────────────────

interface AppStore {
  // View state
  view: ViewMode;
  setView: (view: ViewMode) => void;

  // Onboarding
  onboardingStep: OnboardingStep;
  setOnboardingStep: (step: OnboardingStep) => void;

  // User
  userId: string;
  userName: string;
  personality: PersonalityType;
  setPersonality: (p: PersonalityType) => void;
  setUserName: (name: string) => void;

  // Learning
  goal: LearningGoal | null;
  setGoal: (goal: LearningGoal) => void;

  // Session
  session: SessionState;
  startSession: (id: string) => void;
  endSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  setMood: (mood: MoodType) => void;

  // Chat
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  clearMessages: () => void;
  isAiTyping: boolean;
  setAiTyping: (typing: boolean) => void;

  // Screen
  setScreenSharing: (sharing: boolean) => void;
  updateScreenFrame: (frame: string) => void;
  updateScreenAnalysis: (analysis: string) => void;

  // Voice
  setListening: (listening: boolean) => void;
  setSpeaking: (speaking: boolean) => void;
  setTranscript: (transcript: string | undefined) => void;

  // Mistakes
  mistakes: Mistake[];
  addMistake: (mistake: Mistake) => void;
  resolveMistake: (id: string) => void;
  setMistakes: (mistakes: Mistake[]) => void;

  // Skills
  skills: SkillProgress[];
  updateSkill: (tool: string, skill: string, level: number) => void;
  setSkills: (skills: SkillProgress[]) => void;

  // Quests
  quests: DailyQuest[];
  completeQuest: (id: string) => void;
  setQuests: (quests: DailyQuest[]) => void;

  // Actions
  resetSession: () => void;
}

// ─── Store Implementation ────────────────────────────────────────────────────

export const useAppStore = create<AppStore>((set) => ({
  // ── View ─────────────────────────────────────────────────────────────────
  view: 'landing',
  setView: (view) => set({ view }),

  // ── Onboarding ───────────────────────────────────────────────────────────
  onboardingStep: 'greeting',
  setOnboardingStep: (step) => set({ onboardingStep: step }),

  // ── User ─────────────────────────────────────────────────────────────────
  userId: '',
  userName: '',
  personality: 'chill',
  setPersonality: (p) => set({ personality: p }),
  setUserName: (name) => set({ userName: name }),

  // ── Learning Goal ────────────────────────────────────────────────────────
  goal: null,
  setGoal: (goal) => set({ goal }),

  // ── Session ──────────────────────────────────────────────────────────────
  session: { ...defaultSession },
  startSession: (id) =>
    set({
      session: {
        ...defaultSession,
        sessionId: id,
        status: 'active',
        startedAt: new Date(),
        screen: { ...defaultSession.screen },
        voice: { ...defaultSession.voice },
      },
      messages: [],
    }),
  endSession: () =>
    set((state) => ({
      session: {
        ...state.session,
        status: 'completed',
        screen: { ...defaultSession.screen },
        voice: { ...defaultSession.voice },
      },
    })),
  pauseSession: () =>
    set((state) => ({
      session: { ...state.session, status: 'paused' },
    })),
  resumeSession: () =>
    set((state) => ({
      session: { ...state.session, status: 'active' },
    })),
  setMood: (mood) =>
    set((state) => ({
      session: { ...state.session, mood },
    })),

  // ── Chat ─────────────────────────────────────────────────────────────────
  messages: [],
  addMessage: (msg) =>
    set((state) => ({
      messages: [...state.messages, msg],
    })),
  clearMessages: () => set({ messages: [] }),
  isAiTyping: false,
  setAiTyping: (typing) => set({ isAiTyping: typing }),

  // ── Screen ───────────────────────────────────────────────────────────────
  setScreenSharing: (sharing) =>
    set((state) => ({
      session: {
        ...state.session,
        screen: {
          ...state.session.screen,
          isSharing: sharing,
          currentFrame: sharing ? state.session.screen.currentFrame : undefined,
          lastAnalysis: sharing ? state.session.screen.lastAnalysis : undefined,
          analysisTimestamp: sharing ? state.session.screen.analysisTimestamp : undefined,
        },
      },
    })),
  updateScreenFrame: (frame) =>
    set((state) => ({
      session: {
        ...state.session,
        screen: { ...state.session.screen, currentFrame: frame },
      },
    })),
  updateScreenAnalysis: (analysis) =>
    set((state) => ({
      session: {
        ...state.session,
        screen: {
          ...state.session.screen,
          lastAnalysis: analysis,
          analysisTimestamp: new Date(),
        },
      },
    })),

  // ── Voice ────────────────────────────────────────────────────────────────
  setListening: (listening) =>
    set((state) => ({
      session: {
        ...state.session,
        voice: { ...state.session.voice, isListening: listening },
      },
    })),
  setSpeaking: (speaking) =>
    set((state) => ({
      session: {
        ...state.session,
        voice: { ...state.session.voice, isSpeaking: speaking },
      },
    })),
  setTranscript: (transcript) =>
    set((state) => ({
      session: {
        ...state.session,
        voice: { ...state.session.voice, currentTranscript: transcript },
      },
    })),

  // ── Mistakes ─────────────────────────────────────────────────────────────
  mistakes: [],
  addMistake: (mistake) =>
    set((state) => ({
      mistakes: [...state.mistakes, mistake],
    })),
  resolveMistake: (id) =>
    set((state) => ({
      mistakes: state.mistakes.map((m) =>
        m.id === id ? { ...m, resolved: true } : m
      ),
    })),
  setMistakes: (mistakes) => set({ mistakes }),

  // ── Skills ───────────────────────────────────────────────────────────────
  skills: [],
  updateSkill: (tool, skill, level) =>
    set((state) => {
      const idx = state.skills.findIndex(
        (s) => s.tool === tool && s.skill === skill
      );
      if (idx >= 0) {
        const updated = [...state.skills];
        updated[idx] = { ...updated[idx], level, lastTested: new Date() };
        return { skills: updated };
      }
      return {
        skills: [...state.skills, { tool, skill, level, lastTested: new Date() }],
      };
    }),
  setSkills: (skills) => set({ skills }),

  // ── Quests ───────────────────────────────────────────────────────────────
  quests: [],
  completeQuest: (id) =>
    set((state) => ({
      quests: state.quests.map((q) =>
        q.id === id ? { ...q, completed: true } : q
      ),
    })),
  setQuests: (quests) => set({ quests }),

  // ── Reset ────────────────────────────────────────────────────────────────
  resetSession: () =>
    set({
      view: 'landing',
      onboardingStep: 'greeting',
      session: { ...defaultSession },
      messages: [],
      isAiTyping: false,
    }),
}));
