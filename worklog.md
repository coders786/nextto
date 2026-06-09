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
