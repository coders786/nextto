# AI Learning Companion - Worklog

## Project Overview
Building "nextto" - an AI learning companion that sits next to you while you learn tools (Figma, Google Ads, Shopify, etc.). It sees your screen, talks conversationally, adapts personality, tracks mistakes, and personalizes teaching.

**GitHub**: https://github.com/coders786/nextto

---

## Phase 1: Foundation & Core (Completed)

### Task 1: Research
- Completed competitive analysis of 10 similar products
- Key differentiator: No product combines screen awareness + voice + tool-specific curriculum + personality adaptation + mistake tracking
- Closest: Gemini Live (voice+vision, no teaching), Khanmigo (teaching, no screen), Cursor (screen, coding only)
- z-ai-web-dev-sdk provides: LLM, VLM (glm-4.6v), TTS (7 voices), ASR, Image Generation

### Task 2: Database Schema
- Prisma schema with SQLite: User, Session, Message, Mistake, LearningProgress, DailyQuest, CommunityRoom, RoomMember, MorningText, WinMoment
- All relationships and indexes set up

### Task 3: Landing Page
- Minimal, impactful dark design with warm amber accents
- "what if someone was sitting next to you while you learned?" hero text
- "try it free" pulsing CTA button
- Footer: "a teacher. a friend. a presence."
- Framer Motion staggered animations

### Task 4: Socket.io Mini-Service (Port 3003)
- Full Socket.io + REST API service at /mini-services/companion-service/
- Events: session:start/end, chat:message, screen:frame/start/stop, voice:chunk
- AI integration: LLM chat, VLM screen analysis, ASR transcription, TTS voice generation
- Rate-limited screen analysis (1 frame/3s)
- In-memory session state management
- Enhanced personality prompts with micro-teaching rules
- Goal discovery logic (first 6 messages)
- Mistake detection (3 pattern formats)

### Task 5: Onboarding Flow
- 5-step onboarding: greeting → tool selection → personality → screen permission → ready
- Goal extraction API: LLM discovers the user's REAL goal from their stated goal
- 4 personality options: Chill Buddy (😎/tongtong), Drill Sergeant (🎖️/jam), Patient Mentor (🧘/xiaochen), Hype Coach (🔥/chuichui)
- Screen sharing permission request with privacy explanation
- AI-suggested personality based on goal extraction

### Task 6: Session UI
- Chat interface with AI responses
- Screen sharing with VLM analysis
- Voice controls (button for mic toggle)
- Mistake bank side panel
- Screen preview side panel
- Top bar with personality, goal, connection status, mistake count
- Fallback REST API when Socket.io unavailable
- TTS audio auto-play for AI responses

### Task 7: Backend APIs
- `/api/chat` - LLM chat with personality, goal, micro-teaching rules
- `/api/screen-analyze` - VLM screen analysis with mistake detection
- `/api/tts` - Text-to-speech with auto-chunking (1024 char limit)
- `/api/asr` - Speech-to-text transcription
- `/api/goal-extract` - LLM extracts real goal from stated goal
- `/api/comprehension-check` - Generates conversational test questions
- Shared AI singleton instance in `/lib/ai.ts`

### Task 8: Mistake Bank
- Mistake detection via 3 pattern formats: [MISTAKE:cat] desc [SUGGESTION:fix], !MISTAKE! format, informal detection
- Real-time mistake notifications in session UI
- Mistake bank side panel with categories and suggestions
- Badge count on top bar

### Task 9: Progress & Comprehension
- Comprehension check API generates "explain in your own words" questions
- Micro-teaching rules built into all system prompts
- Bayesian Knowledge Tracing schema in database (ready for implementation)

---

## Current Project Status

### Working Features
- ✅ Landing page with smooth animations
- ✅ Full onboarding flow (5 steps)
- ✅ AI-powered goal extraction
- ✅ 4 personality types with voice mapping
- ✅ Chat with AI (both Socket.io and REST fallback)
- ✅ Screen sharing with VLM analysis
- ✅ Mistake detection and bank
- ✅ TTS audio playback
- ✅ All 6 API routes working
- ✅ Companion service running on port 3003
- ✅ Pushed to GitHub: https://github.com/coders786/nextto
- ✅ Cron job for continuous improvement (every 15 min)

### Verified Working (Agent Browser Tests)
- Landing page renders correctly
- Onboarding flow: greeting → goal → tool → personality → screen permission → ready → session
- Chat messages sent and AI responds with context (uses business context in examples)
- Goal extraction API returns relevant real goals

---

## Unresolved Issues & Next Steps

### Priority 1: Features to Build
1. **Voice recording & ASR** - Implement MediaRecorder for real voice input
2. **Daily quests system** - Generate and track tiny daily tasks
3. **Morning texts** - Scheduled check-in messages
4. **Community rooms** - Small groups of 20 with shared goals
5. **Progress dashboard** - Visual progress tracking (not a bar, but conversation-based)

### Priority 2: Improvements
1. **Enhanced TTS playback** - Queue system, personality voice switching
2. **Screen diff detection** - Only analyze when screen changes significantly
3. **Onboarding conversation mode** - Instead of form steps, have the AI converse to discover goals
4. **Mood detection** - Analyze message timing/patterns for mood assessment
5. **Win moments** - Detect and celebrate achievements
6. **Session persistence** - Save sessions to database for return visits

### Priority 3: Polish
1. **Mobile responsiveness** - Optimize session view for smaller screens
2. **Sound effects** - Subtle UI sounds for messages, mistakes, achievements
3. **Keyboard shortcuts** - Quick actions during session
4. **Dark/light mode** - Theme toggle
5. **Onboarding animations** - More engaging transitions
6. **Error recovery** - Graceful handling of AI failures

---

## Phase 2: Comprehensive UI Overhaul (Completed)

### Task: styling-1 + feat-1 + feat-2 + qa-2

**Date**: 2024-03-05
**File**: `/home/z/my-project/src/app/page.tsx`

#### Critical Bug Fix
- Replaced ALL `motion.button` with regular `button` elements wrapped in `motion.div` for animation
- Framer-motion's `whileTap` intercepts clicks in headless browsers; using `motion.div` wrapper avoids this

#### Landing Page Improvements
- Added animated floating particles (20 warm amber dots with randomized positions, sizes, and animation durations)
- Added noise texture overlay for visual depth
- Added secondary hero line: "a teacher that sees your screen. a friend that knows your name."
- Added gradient text effect on "sitting next to you" portion (amber gradient with bg-clip-text)
- Added pulsing "live" indicator next to the logo
- Added "free • no signup required" text below CTA button
- Added cycling footer text that rotates every 4 seconds between:
  - "a teacher. a friend. a presence."
  - "not a tool. a companion."
  - "the teacher you always wished you had."

#### Onboarding Improvements
- Animated step labels below the progress bar (shows current step name with AnimatePresence transitions)
- "Discovered your real goal" message after goal extraction (shows what the AI found with sparkle icon)
- "Hear sample" button on each personality card that plays TTS audio sample
- Screen sharing animated diagram showing the flow: Your Screen → AI Eye → Help Back
- Privacy badges ("not saved", "only while learning") on screen permission step
- Ready step summary showing: tool, goal, and personality selected
- All `motion.button` replaced with `motion.div` wrapper + regular `button`

#### Session UI Major Overhaul
- **Top Bar**: Session duration timer (mm:ss format), daily quest button with quest icon, volume toggle (mute/unmute AI voice), connection status with text label
- **Chat Area**: Relative timestamps ("just now", "2m ago"), message delivery indicators (✓✓ for user), animated gradient empty state, improved AI typing indicator with "thinking..." text and wave animation, suggested quick replies after AI messages (2-3 context-aware buttons), custom scrollbar styling for chat area
- **Input Area**: Daily quest quick access button, character count display, expand/collapse button for single-line vs multi-line input, voice button with pulsing red ring recording animation
- **Side Panel**: Added third "progress" tab with skill tracking visualization, progress bars for skill levels, daily quest section with completion checkboxes, win moments section showing achievements with timestamps

#### New Features
- **Daily Quests**: Generated from tool-specific quest pool on session start, completion tracking with checkboxes, quest notification dot indicator
- **Win Moments**: Auto-detection from AI messages (proud, great job, crushing it, etc.), celebratory popup animation with star icon, win moment history logged in progress panel
- **Progress Tracking**: Tool-specific skill tracking (keywords, campaigns, etc.), skill level bars (0-100%) that update as AI mentions topics, derived from messages using useMemo for efficiency

#### Styling Polish
- Subtle hover animations on ALL interactive elements (motion.div wrappers with whileHover/whileTap)
- Smooth transitions between all states (CSS transition-all duration-200/300)
- Improved dark theme depth (subtle gradients, better shadows, bg-[#1a1613] layering)
- Micro-animations: message appear, button click feedback, panel open/close
- Custom scrollbar styling for chat area (thin 4px scrollbar with dark theme colors)
- Noise texture overlay for visual depth (very subtle fractalNoise SVG filter at 1.5% opacity)

#### Technical Notes
- All state updates from effects use `setTimeout` to avoid synchronous setState lint errors
- Win moments derived from messages using `useMemo` for efficiency
- Skill tracking uses ref-based deduplication to avoid duplicate updates
- React 19 strict lint compliance: no ref access during render, no synchronous setState in effects
