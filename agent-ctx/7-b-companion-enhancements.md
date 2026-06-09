# Task 7-b: Companion Service Enhancements

## Agent: Backend Engineer
## Status: ✅ Completed

## Summary
Enhanced the companion service at `/mini-services/companion-service/index.ts` with richer personality prompts, proper voice mapping, micro-teaching rules, goal discovery logic, enhanced mistake detection, and a new onboarding socket event.

## Changes Made

### 1. Better Personality Voice Mapping
Updated `VOICE_MAP` with proper personality-to-voice assignments:
- `chill` → `tongtong` (warm and friendly)
- `drill_sergeant` → `jam` (British gentleman, authoritative)
- `patient` → `xiaochen` (calm and professional)
- `hype` → `chuichui` (lively and cute)

Previously all personalities mapped to `tongtong`.

### 2. Enhanced System Prompts
Replaced all 4 personality prompts with much richer, more detailed versions:
- **Chill**: Casual friend who teaches, uses phrases like "okay so", "cool", "got it?", never scolds mistakes
- **Drill Sergeant**: Tough-love coach, uses "listen", "I need you to focus", brief acknowledgment of correct answers
- **Patient**: Infinitely patient teacher, "let me say that again", "does that make sense?", celebrates understanding over speed
- **Hype**: Celebration machine, "YESSS!", "you're absolutely killing it!", reframes mistakes as learning opportunities

### 3. Micro-Teaching Pattern Implementation
Added `MICRO_TEACHING_RULES` constant with 10 critical rules:
1. Never dump information — teach one concept at a time
2. Always ask "got it? or want me to say it again?"
3. Ask user to predict before explaining
4. Use their business context in every example
5. Say "wait." before mistakes happen
6. Keep responses short (2-3 sentences max)
7. Format mistakes as `[MISTAKE:category] description [SUGGESTION:fix]`
8. Test comprehension periodically
9. Notice mood and adapt
10. Never use corporate jargon

These rules are injected into ALL system prompts via `buildSystemPrompt()`.

### 4. Goal Conversation Logic
Added `GOAL_DISCOVERY_PROMPT` that instructs the AI to:
- Ask "what would you do the day you actually finished learning?"
- Discover the user's REAL goal (not just the tool name)
- Confirm the real goal and use it in every example going forward

Also added goal discovery tracking to `SessionState`:
- `realGoal: string | null` — the discovered real goal
- `goalDiscoveryComplete: boolean` — whether goal discovery is done

The `buildSystemPrompt()` now includes real goal in context when available, and goal discovery prompt when not yet discovered.

Goal detection in chat responses: monitors first 6 messages for goal confirmation phrases like "your real goal isn't just [tool], it's [real goal]" and automatically extracts the real goal.

### 5. Enhanced Mistake Detection
Replaced simple inline regex with comprehensive `detectMistakes()` function:
- **Pattern 1**: `[MISTAKE:category] description [SUGGESTION:fix]` (original format)
- **Pattern 2**: `!MISTAKE:category! description !SUGGESTION:fix!` (alternate format)
- **Pattern 3**: Informal mistake detection:
  - "that's a mistake: ..."
  - "don't do that: ..."
  - "you shouldn't ..."
  - "stop, ..." / "wait, ..." / "hold on, ..."

All patterns return `MistakeDetection[]` with category, description, and suggestion. Applied consistently in chat, voice, and screen analysis flows.

### 6. `onboarding:message` Socket Event
Added new socket event for conversational onboarding flow:

**Client → Server**: `onboarding:message` with `{ content: string }`
**Server → Client**: `onboarding:response` with `{ content: string, step: string, discoveredGoal: string | null, tool: string | null }`

Supporting infrastructure:
- `OnboardingSession` type — tracks onboarding conversation per socket
- `onboardingSessions` / `socketToOnboarding` maps — in-memory store
- `createOnboardingSession()` / `getOnboardingBySocket()` — session management
- `ONBOARDING_SYSTEM_PROMPT` — specialized prompt guiding the AI through welcome → goal discovery → real goal → experience → context → ready
- `determineOnboardingStep()` — heuristic step detection from AI response text

Step flow: `welcome` → `goal_discovery` → `real_goal` → `experience` → `context` → `ready`

The `session:start` event now accepts an optional `realGoal` field to carry over the discovered goal from onboarding.

## New Types Added
- `OnboardingSession` — id, socketId, history, step, discoveredGoal, tool, personality, startedAt
- `MistakeDetection` — category, description, suggestion

## New State Fields on SessionState
- `realGoal: string | null` — discovered real goal from conversation
- `goalDiscoveryComplete: boolean` — whether goal discovery is done
- `onboardingHistory: ChatMessage[]` — onboarding conversation history
- `onboardingStep: string` — current onboarding step

## Testing
- ✅ Service starts successfully with all enhancements
- ✅ Health endpoint returns `activeOnboardings` field
- ✅ Session creation works
- ✅ Voice mapping confirmed in startup log
