# AI Learning Companion - Worklog

## Project Overview
Building an AI learning companion that sits next to you while you learn tools (Figma, Google Ads, Shopify, etc.). It sees your screen, talks conversationally, adapts personality, tracks mistakes, and personalizes teaching.

## Research Summary (Task 1)
- Completed competitive analysis: No existing product combines screen awareness + voice + tool-specific curriculum + personality adaptation + mistake tracking
- Closest competitors: Gemini Live (voice+vision, no teaching), Khanmigo (teaching, no screen), Cursor (screen, coding only)
- Key differentiator: "Sits next to you" + teaches (doesn't do) + personality-adaptive + mistake memory
- Tech: Browser getDisplayMedia() for screen capture, VLM for screen analysis, LLM for conversation, TTS/ASR for voice
- z-ai-web-dev-sdk provides: LLM, VLM (glm-4.6v), TTS (7 voices), ASR, Image Generation

## Task 2-b: State Management & Type Definitions
- Created `/src/lib/types.ts` — All TypeScript types (PersonalityType, ViewMode, OnboardingStep, ChatMessage, LearningGoal, Mistake, SkillProgress, DailyQuest, ScreenState, VoiceState, SessionState, PersonalityOption, etc.)
- Created `/src/lib/constants.ts` — Personality options (chill→tongtong, drill_sergeant→jam, patient→xiaochen, hype→chuichui) with sample phrases, tool definitions (6 tools with icons), lookup maps, mood thresholds, screen capture config, onboarding step labels
- Created `/src/lib/store.ts` — Zustand store with full state management: view/onboarding navigation, user profile, learning goals, session lifecycle (start/pause/resume/end), chat messages, screen sharing state, voice state, mistakes tracking, skill progress, daily quests, session reset
- Created `/src/lib/api.ts` — API client using relative paths with XTransformPort=3003 for companion service: sendMessage, analyzeScreen, generateTTS, transcribeAudio, createSession, getMistakes, resolveMistake, getQuests, completeQuest
- All files pass ESLint with zero errors

## Task 3: Landing Page
- Built minimal, impactful landing page for "nextto" in `/src/app/page.tsx`
- Design: warm dark background (#141210), single hero sentence, one CTA button, small footer
- Animations: framer-motion fade-in with staggered delays, subtle button pulse
- State management: `view: 'landing' | 'onboarding' | 'session'` — clicking "try it free" transitions to onboarding
- Updated layout.tsx: dark mode by default, updated metadata for "nextto" branding
- Updated globals.css: warm dark background/foreground in .dark theme
- Lint: ✅ zero errors

## Task 4: Socket.io Companion Service (Mini-Service)
- Created `/mini-services/companion-service/` — Bun + Socket.io real-time AI companion service on port 3003
- **package.json**: Dependencies: socket.io, z-ai-web-dev-sdk, uuid; dev script: `bun --hot index.ts`
- **index.ts** (~870 lines): Full-featured service with:
  - **Real-time Chat**: `chat:message` → LLM response via `zai.chat.completions.create`, conversation history (last 20 msgs), typing indicator, mistake detection via `[MISTAKE:category] description [SUGGESTION:fix]` pattern
  - **Screen Sharing**: `screen:start/stop/frame` → VLM analysis via `zai.chat.completions.createVision` (glm-4.6v), rate-limited to 1 frame/3s, auto-detects mistakes in screen content, emits `screen:analysis` and `screen:warning`
  - **Voice**: `voice:chunk` → ASR transcription via `zai.audio.asr.create`, LLM chat response, TTS audio via `zai.audio.tts.create`, saves WAV to `/tmp/companion-audio/`, emits `voice:transcript` and `voice:response`
  - **Session Management**: `session:start/end` with in-memory state (conversation history, screen context, detected mistakes, mood, skill progress, socket mapping)
  - **4 Personality Modes**: chill (casual friend), drill_sergeant (tough love), patient (infinitely patient), hype (celebration machine) — each with distinct system prompts and TTS voice mapping
  - **Dynamic System Prompts**: Personality base + tool/goal/business context + micro-teaching rules + anti-yapping + screen context injection
  - **REST API Endpoints** (alongside Socket.io):
    - `GET /api/health` — Service health + session stats
    - `GET /api/session/:id` — Session details
    - `POST /api/session` — Create session
    - `POST /api/chat` — Non-realtime chat fallback
    - `POST /api/tts` — Generate TTS audio (returns WAV file)
    - `POST /api/screen-analyze` — Analyze screen frame without Socket.io
    - `GET /api/audio/:filename` — Serve generated audio files
  - **Error Handling**: Graceful fallbacks for all AI failures, friendly error messages
  - **Rate Limiting**: Screen analysis max 1 frame/3 seconds to control API costs
- **Architecture Decision**: Used default Socket.io path `/socket.io/` instead of `/` because path `/` causes Socket.io to intercept ALL HTTP requests, making REST API unreachable. Client should connect with `io({ path: "/socket.io/", query: { XTransformPort: 3003 } })`
- **Auto-Start**: Service is auto-discovered by `/start.sh` which scans `mini-services/` for directories with `package.json` and runs `bun run dev`
- **Verified**: All REST API endpoints tested and working, LLM chat returns personality-appropriate responses

## Task 7: Next.js API Routes (z-ai-web-dev-sdk)

Created 6 server-side API routes + 1 shared AI initialization module that use z-ai-web-dev-sdk for AI capabilities. These routes run within the Next.js App Router and do NOT require the companion mini-service.

### Files Created

1. **`/src/lib/ai.ts`** — Shared AI initialization & utilities
   - Singleton `getAI()` — lazy-initializes and caches `ZAI.create()` instance
   - `buildSystemPrompt()` — builds dynamic system prompt from personality type, tool, goal, business context, screen context
   - `parseMistakes()` — extracts `[MISTAKE:category] description [SUGGESTION:fix]` patterns from AI responses
   - `VOICE_MAP` — personality→voice mapping (chill→tongtong, drill_sergeant→jam, patient→xiaochen, hype→chuichui)
   - `PERSONALITY_PROMPTS` — 4 personality-specific system prompt bases

2. **`/src/app/api/chat/route.ts`** — Chat API
   - POST body: `{ messages, personality, goal, businessContext, tool, screenContext? }`
   - Dynamic system prompt with personality, micro-teaching rules, anti-yapping, mistake detection
   - Response: `{ content, mistakes? }` with parsed mistake markers

3. **`/src/app/api/screen-analyze/route.ts`** — Screen Analysis API
   - POST body: `{ frame (base64), tool, goal, businessContext, conversationContext? }`
   - Uses `zai.chat.completions.createVision()` with model `glm-4.6v`
   - Response: `{ analysis, suggestions, mistakes? }`

4. **`/src/app/api/tts/route.ts`** — Text-to-Speech API
   - POST body: `{ text, voice }`
   - Uses `zai.audio.tts.create()` with WAV format
   - Auto-chunks text at sentence boundaries when >1024 chars, concatenates WAV PCM data
   - Returns `audio/wav` response directly (not JSON)
   - Accepts personality name or direct voice name

5. **`/src/app/api/asr/route.ts`** — Speech Recognition API
   - POST body: `{ audio (base64), format? }`
   - Uses `zai.audio.asr.create()`
   - Response: `{ transcript }`

6. **`/src/app/api/goal-extract/route.ts`** — Goal Extraction API
   - POST body: `{ statedGoal, tool }`
   - Uses LLM to infer the user's deeper real goal and business context
   - Returns personality suggestion based on inferred motivation
   - Response: `{ realGoal, businessContext, suggestedPersonality }`
   - JSON parsing with fallback for non-JSON LLM responses

7. **`/src/app/api/comprehension-check/route.ts`** — Comprehension Check API
   - POST body: `{ concept, tool, goal, personality }`
   - Generates conversational (not quiz-style) comprehension questions
   - Personality-adapted tone for the question
   - Response: `{ question, expectedAnswer, followUp }`

### Design Decisions
- All routes use `export async function POST(request: Request)` pattern with Next.js App Router
- Shared AI instance cached in `/src/lib/ai.ts` avoids re-initialization on every request
- Mistake detection uses `[MISTAKE:category] description [SUGGESTION:fix]` format — consistent with companion service
- TTS chunking splits at sentence boundaries (`.`, `!`, `?`, `,`, space) and reconstructs WAV headers
- Goal extraction and comprehension check use JSON-mode prompting with regex fallback parsing
- All routes have proper error handling with try/catch and appropriate HTTP status codes
- Lint: ✅ zero errors

## Task 7-b: Companion Service Enhancements
Enhanced `/mini-services/companion-service/index.ts` with:
- **Voice Mapping**: Proper personality→voice mapping (chill→tongtong, drill_sergeant→jam, patient→xiaochen, hype→chuichui)
- **Rich Personality Prompts**: Detailed system prompts with characteristic phrases and teaching styles for each personality
- **Micro-Teaching Rules**: 10 critical rules injected into ALL system prompts (teach one concept at a time, always ask "got it?", predict before explaining, use business context, detect mistakes, test comprehension, notice mood, no jargon)
- **Goal Discovery Logic**: First 3 messages trigger goal discovery — AI asks "what would you do the day you finished learning?", extracts real goal, confirms it. `SessionState` now tracks `realGoal` and `goalDiscoveryComplete`. `buildSystemPrompt()` includes real goal context when discovered.
- **Enhanced Mistake Detection**: `detectMistakes()` function with 3 pattern types: `[MISTAKE:cat] desc [SUGGESTION:fix]`, `!MISTAKE:cat! desc !SUGGESTION:fix!`, and informal patterns ("that's a mistake", "don't do that", "you shouldn't")
- **`onboarding:message` Socket Event**: New conversational onboarding flow with `OnboardingSession` state, `ONBOARDING_SYSTEM_PROMPT`, step progression (welcome→goal_discovery→real_goal→experience→context→ready), automatic tool and goal extraction. Client sends `{ content }`, receives `{ content, step, discoveredGoal, tool }`.
- **`session:start` now accepts optional `realGoal`** to carry over from onboarding

## Current Status
- Phase: Initial build
- Completed: Research, State Management, Landing Page, Socket.io Service, Next.js API Routes, Companion Service Enhancements
- Next: Onboarding flow UI, Core chat UI, Screen sharing integration
