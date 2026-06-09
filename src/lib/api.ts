import type { PersonalityType, MessageSource, ChatMessage, Mistake, DailyQuest } from './types';
import { COMPANION_SERVICE_PORT } from './constants';

// ─── Helper ──────────────────────────────────────────────────────────────────

const API_BASE = `/api`;

function apiUrl(path: string): string {
  return `${API_BASE}${path}?XTransformPort=${COMPANION_SERVICE_PORT}`;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = apiUrl(path);
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => 'Unknown error');
    throw new Error(`API Error ${res.status}: ${errorBody}`);
  }

  // For audio responses
  const contentType = res.headers.get('content-type');
  if (contentType?.includes('audio/')) {
    return res as unknown as T;
  }

  return res.json() as Promise<T>;
}

// ─── Chat API ────────────────────────────────────────────────────────────────

export async function sendMessage(
  sessionId: string,
  content: string,
  source: MessageSource
): Promise<ChatMessage> {
  return apiFetch<ChatMessage>('/chat', {
    method: 'POST',
    body: JSON.stringify({ sessionId, content, source }),
  });
}

// ─── Screen Analysis API ─────────────────────────────────────────────────────

export interface ScreenAnalysisResult {
  analysis: string;
  suggestions: string[];
}

export async function analyzeScreen(
  sessionId: string,
  frameBase64: string
): Promise<ScreenAnalysisResult> {
  return apiFetch<ScreenAnalysisResult>('/screen-analyze', {
    method: 'POST',
    body: JSON.stringify({ sessionId, frame }),
  });
}

// ─── TTS API ─────────────────────────────────────────────────────────────────

export async function generateTTS(
  text: string,
  voice: string
): Promise<string> {
  // TTS returns audio directly, not JSON
  const url = apiUrl('/tts');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice }),
  });

  if (!res.ok) {
    throw new Error(`TTS Error ${res.status}`);
  }

  // Return the URL for audio playback
  const audioBlob = await res.blob();
  return URL.createObjectURL(audioBlob);
}

// ─── ASR API ─────────────────────────────────────────────────────────────────

export async function transcribeAudio(
  audioBase64: string,
  format: string
): Promise<string> {
  const result = await apiFetch<{ transcript: string }>('/chat', {
    method: 'POST',
    body: JSON.stringify({ audioBase64, format }),
  });
  return result.transcript;
}

// ─── Session API ─────────────────────────────────────────────────────────────

export interface CreateSessionResponse {
  sessionId: string;
}

export async function createSession(
  userId: string,
  tool: string,
  goal: string,
  businessContext: string,
  personality: PersonalityType
): Promise<CreateSessionResponse> {
  return apiFetch<CreateSessionResponse>('/session', {
    method: 'POST',
    body: JSON.stringify({ userId, tool, goal, businessContext, personality }),
  });
}

// ─── Session Detail ──────────────────────────────────────────────────────────

export async function getSession(sessionId: string): Promise<any> {
  return apiFetch<any>(`/session/${sessionId}`);
}

// ─── Health Check ────────────────────────────────────────────────────────────

export async function healthCheck(): Promise<any> {
  return apiFetch<any>('/health');
}

// ─── Mistakes API ────────────────────────────────────────────────────────────

export async function getMistakes(userId: string): Promise<Mistake[]> {
  return apiFetch<Mistake[]>(`/mistakes/list?userId=${encodeURIComponent(userId)}`);
}

export async function resolveMistake(mistakeId: string): Promise<void> {
  await apiFetch<void>('/mistakes/resolve', {
    method: 'POST',
    body: JSON.stringify({ mistakeId }),
  });
}

// ─── Quests API ──────────────────────────────────────────────────────────────

export async function getQuests(userId: string): Promise<DailyQuest[]> {
  return apiFetch<DailyQuest[]>(`/quests/list?userId=${encodeURIComponent(userId)}`);
}

export async function completeQuest(questId: string): Promise<void> {
  await apiFetch<void>('/quests/complete', {
    method: 'POST',
    body: JSON.stringify({ questId }),
  });
}
