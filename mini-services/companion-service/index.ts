import { createServer, IncomingMessage, ServerResponse } from 'http'
import { Server, Socket } from 'socket.io'
import ZAI from 'z-ai-web-dev-sdk'
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

// ============================================================
// Types
// ============================================================

type PersonalityType = 'chill' | 'drill_sergeant' | 'patient' | 'hype'

interface SessionConfig {
  userId: string
  tool: string
  goal: string
  businessContext: string
  personality: PersonalityType
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  source?: 'text' | 'voice' | 'screen'
}

interface SessionState {
  id: string
  config: SessionConfig
  conversationHistory: ChatMessage[]
  screenContext: string | null
  detectedMistakes: MistakeRecord[]
  moodAssessment: string | null
  skillProgress: Record<string, number>
  isActive: boolean
  isScreenSharing: boolean
  lastScreenAnalysis: number
  socketId: string
  startedAt: Date
  endedAt?: Date
  realGoal: string | null
  goalDiscoveryComplete: boolean
  onboardingHistory: ChatMessage[]
  onboardingStep: string
}

interface MistakeRecord {
  category: string
  description: string
  suggestion: string
  timestamp: Date
}

interface OnboardingSession {
  id: string
  socketId: string
  history: ChatMessage[]
  step: string
  discoveredGoal: string | null
  tool: string | null
  personality: PersonalityType
  startedAt: Date
}

// ============================================================
// Personality Voice Mapping
// ============================================================

const VOICE_MAP: Record<PersonalityType, string> = {
  chill: 'tongtong',       // warm and friendly
  drill_sergeant: 'jam',   // British gentleman, authoritative
  patient: 'xiaochen',     // calm and professional
  hype: 'chuichui',        // lively and cute
}

// ============================================================
// Personality System Prompts (Enhanced)
// ============================================================

const PERSONALITY_PROMPTS: Record<PersonalityType, string> = {
  chill: `You are a chill, casual friend who teaches. You joke, you're never pushy, you keep it real. Use casual language. Make learning feel like hanging out with a buddy. You say things like 'okay so' and 'cool' and 'got it?' naturally. You never sound like a textbook. You sound like someone who actually knows this stuff and is just showing you because they want to help. When they mess up, you don't scold — you say something like 'haha yeah that's a common one, here's the thing though' and then you fix it together.`,

  drill_sergeant: `You are a tough-love teacher. No excuses, but you genuinely care. You push hard because you know they can do it. Direct, firm, but always supportive underneath. You say things like 'listen' and 'here's what we're doing' and 'I need you to focus.' You don't sugarcoat, but you never make them feel stupid. You're the coach who makes you run extra laps because they KNOW you can handle it. When they get it right, you acknowledge it briefly and move on. No time to waste.`,

  patient: `You are infinitely patient. You explain things slowly, repeat as many times as needed, and never get annoyed. You make sure they truly understand before moving on. You say things like 'let me say that again' and 'does that make sense?' and 'no rush, we'll get there.' You break things down into the tiniest steps. You're the teacher who stays after class because you genuinely want them to get it. You celebrate their understanding more than their speed.`,

  hype: `You celebrate EVERY tiny win. Your energy is always high. You make them feel like they're crushing it even when they're just starting. Enthusiastic, encouraging, uplifting. You say things like 'YESSS!' and 'you're absolutely killing it!' and 'that was SO smart!' You turn small progress into big moments. When they mess up, you reframe it as a learning opportunity with maximum positivity. You're the cheerleader who makes every step feel like a touchdown.`,
}

// ============================================================
// Micro-Teaching Rules
// ============================================================

const MICRO_TEACHING_RULES = `## Micro-Teaching Rules (CRITICAL)
1. NEVER dump information. Teach ONE concept at a time.
2. After explaining ONE thing, ALWAYS ask: "got it? or want me to say it again?"
3. Before explaining, ASK the user to predict what comes next. Make them think.
4. Use their business context in EVERY example. If they sell candles, every example is about candles.
5. When they're about to make a mistake, say "wait." and explain why BEFORE they click.
6. Keep responses SHORT. 2-3 sentences max unless they asked for detail.
7. If you detect a mistake in what they're doing/saying, format it as: [MISTAKE:category] description [SUGGESTION:what to do instead]
8. Every few minutes, test comprehension: "so explain to me in your own words, what is X?"
9. Notice their mood. If they seem tired, suggest a break. If they're fast, speed up.
10. NEVER use corporate jargon. Talk like a human.`

// ============================================================
// Goal Discovery Prompt
// ============================================================

const GOAL_DISCOVERY_PROMPT = `## Goal Discovery (First 3 Messages)
If the user just started learning this tool, BEFORE teaching anything, ask them: "what would you do the day you actually finished learning? paint me the picture." Their answer reveals their REAL goal. Use that real goal in every example from then on. Confirm it: "okay so your real goal isn't just [tool], it's [real goal]. [tool] is just the tool. we're gonna keep that in mind every single time. cool?"`

// ============================================================
// Onboarding System Prompt
// ============================================================

const ONBOARDING_SYSTEM_PROMPT = `You are a friendly, curious AI learning companion guiding a new user through their first conversation. Your job is to discover what they REALLY want to achieve — not just what tool they want to learn, but the real outcome they're after.

## Your Conversation Flow
1. Welcome them warmly. Ask what they want to learn.
2. When they name a tool or skill, go deeper: "okay cool — but what would you DO the day you actually finished learning that? paint me the picture."
3. Listen to their answer. That reveals their REAL goal. Summarize it back: "so your real goal isn't just [tool], it's [real goal]. [tool] is just how you get there. that's what we'll focus on."
4. Ask about their experience level: "have you tried this before, or are we starting from zero?"
5. Ask about their business or project context: "what are you working on? like, what's the actual thing you're building or selling?"
6. When you have their real goal, experience level, and context, wrap up: "awesome. I've got everything I need. let's do this."

## Rules
- Be conversational, warm, NOT robotic
- Keep each message SHORT — 2-3 sentences max
- Don't ask more than one question at a time
- Use their words, not jargon
- If they give short answers, that's fine — work with what you get
- Your step values should be: "welcome", "goal_discovery", "real_goal", "experience", "context", "ready"`

// ============================================================
// Build System Prompt
// ============================================================

function buildSystemPrompt(config: SessionConfig, screenContext?: string | null, messageCount?: number): string {
  const personalityBase = PERSONALITY_PROMPTS[config.personality] || PERSONALITY_PROMPTS.chill

  let prompt = `${personalityBase}

## Context
- Tool they're learning: ${config.tool}
- Their stated goal: ${config.goal}
${config.realGoal ? `- Their REAL goal (discovered): ${config.realGoal}` : '- Real goal: not yet discovered, use goal discovery flow'}
- Business context: ${config.businessContext || 'General learning'}

${MICRO_TEACHING_RULES}

${GOAL_DISCOVERY_PROMPT}

## Anti-Yapping Rule
Be concise. No long lectures. Short, punchy responses. If you catch yourself writing more than 3 sentences, stop and ask a question instead.`

  if (screenContext) {
    prompt += `\n\n## Current Screen Context\nThe user is currently looking at: ${screenContext}`
  }

  return prompt
}

// ============================================================
// In-Memory Session Store
// ============================================================

const sessions = new Map<string, SessionState>()
const socketToSession = new Map<string, string>()
const onboardingSessions = new Map<string, OnboardingSession>()
const socketToOnboarding = new Map<string, string>()

function createSession(config: SessionConfig, socketId: string): SessionState {
  const session: SessionState = {
    id: uuidv4(),
    config,
    conversationHistory: [],
    screenContext: null,
    detectedMistakes: [],
    moodAssessment: null,
    skillProgress: {},
    isActive: true,
    isScreenSharing: false,
    lastScreenAnalysis: 0,
    socketId,
    startedAt: new Date(),
    realGoal: null,
    goalDiscoveryComplete: false,
    onboardingHistory: [],
    onboardingStep: 'welcome',
  }
  sessions.set(session.id, session)
  socketToSession.set(socketId, session.id)
  return session
}

function getSession(sessionId: string): SessionState | undefined {
  return sessions.get(sessionId)
}

function getSessionBySocket(socketId: string): SessionState | undefined {
  const sessionId = socketToSession.get(socketId)
  if (!sessionId) return undefined
  return sessions.get(sessionId)
}

function endSession(sessionId: string): void {
  const session = sessions.get(sessionId)
  if (session) {
    session.isActive = false
    session.endedAt = new Date()
    socketToSession.delete(session.socketId)
  }
}

// ============================================================
// Onboarding Session Management
// ============================================================

function createOnboardingSession(socketId: string, personality: PersonalityType): OnboardingSession {
  // Clean up any existing onboarding for this socket
  const existingId = socketToOnboarding.get(socketId)
  if (existingId) {
    onboardingSessions.delete(existingId)
  }

  const onboarding: OnboardingSession = {
    id: uuidv4(),
    socketId,
    history: [],
    step: 'welcome',
    discoveredGoal: null,
    tool: null,
    personality: personality || 'chill',
    startedAt: new Date(),
  }
  onboardingSessions.set(onboarding.id, onboarding)
  socketToOnboarding.set(socketId, onboarding.id)
  return onboarding
}

function getOnboardingBySocket(socketId: string): OnboardingSession | undefined {
  const onboardingId = socketToOnboarding.get(socketId)
  if (!onboardingId) return undefined
  return onboardingSessions.get(onboardingId)
}

// ============================================================
// Mistake Detection
// ============================================================

interface MistakeDetection {
  category: string
  description: string
  suggestion: string
}

function detectMistakes(text: string): MistakeDetection[] {
  const mistakes: MistakeDetection[] = []

  // Pattern 1: [MISTAKE:category] description [SUGGESTION:fix] (original format)
  const inlinePattern = /\[MISTAKE:(\w+)\]\s*(.+?)\s*\[SUGGESTION:(.+?)\]/gi
  let match: RegExpExecArray | null
  while ((match = inlinePattern.exec(text)) !== null) {
    mistakes.push({
      category: match[1],
      description: match[2].trim(),
      suggestion: match[3].trim(),
    })
  }

  // Pattern 2: !MISTAKE:category! description !SUGGESTION:fix! (alternate format)
  const altPattern = /!MISTAKE:(\w+)!\s*(.+?)\s*!SUGGESTION:(.+?)!/gi
  while ((match = altPattern.exec(text)) !== null) {
    mistakes.push({
      category: match[1],
      description: match[2].trim(),
      suggestion: match[3].trim(),
    })
  }

  // Pattern 3: Informal mistake detection — phrases like "that's a mistake", "don't do that", "you shouldn't"
  const informalPatterns = [
    /that'?s?\s+(?:a\s+)?mistake[:\s-]+(.+?)(?:\.|!|$)/gi,
    /don'?t\s+do\s+that[:\s-]+(.+?)(?:\.|!|$)/gi,
    /you\s+shouldn'?t\s+(.+?)(?:\.|!|$)/gi,
    /(?:stop|wait|hold\s+on)[,.]?\s+(.+?)(?:\.|!|$)/gi,
  ]

  for (const pattern of informalPatterns) {
    while ((match = pattern.exec(text)) !== null) {
      // Avoid duplicates if already caught by structured patterns
      const description = match[1]?.trim()
      if (description && description.length > 5) {
        mistakes.push({
          category: 'informal',
          description: description,
          suggestion: 'Review the guidance above and adjust your approach.',
        })
      }
    }
  }

  return mistakes
}

// ============================================================
// AI SDK
// ============================================================

let zai: InstanceType<typeof ZAI> | null = null

async function getAI(): Promise<InstanceType<typeof ZAI>> {
  if (!zai) {
    zai = await ZAI.create()
    console.log('[AI] Z-AI SDK initialized')
  }
  return zai
}

// ============================================================
// Audio Storage
// ============================================================

const AUDIO_DIR = '/tmp/companion-audio'

function ensureAudioDir(): void {
  if (!existsSync(AUDIO_DIR)) {
    mkdirSync(AUDIO_DIR, { recursive: true })
  }
}

function saveAudioFile(buffer: Buffer, filename: string): string {
  ensureAudioDir()
  const filepath = join(AUDIO_DIR, filename)
  writeFileSync(filepath, buffer)
  return filepath
}

// ============================================================
// Rate Limiting
// ============================================================

const SCREEN_ANALYSIS_MIN_INTERVAL = 3000 // 3 seconds

function canAnalyzeScreen(session: SessionState): boolean {
  const now = Date.now()
  return now - session.lastScreenAnalysis >= SCREEN_ANALYSIS_MIN_INTERVAL
}

// ============================================================
// REST API Helpers
// ============================================================

function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk: string) => { body += chunk })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch {
        reject(new Error('Invalid JSON'))
      }
    })
    req.on('error', reject)
  })
}

function sendJSON(res: ServerResponse, statusCode: number, data: any): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

function serveAudioFile(res: ServerResponse, filename: string): void {
  const filepath = join(AUDIO_DIR, filename)
  if (!existsSync(filepath)) {
    sendJSON(res, 404, { error: 'Audio file not found' })
    return
  }
  const buffer = readFileSync(filepath)
  res.writeHead(200, {
    'Content-Type': 'audio/wav',
    'Content-Length': buffer.length,
  })
  res.end(buffer)
}

// ============================================================
// Determine Onboarding Step from AI Response
// ============================================================

function determineOnboardingStep(aiResponse: string, currentStep: string): string {
  const lower = aiResponse.toLowerCase()

  // Check for step indicators in the AI's response
  if (currentStep === 'welcome') {
    if (lower.includes('real goal') || lower.includes('what would you do') || lower.includes('paint me the picture')) {
      return 'goal_discovery'
    }
    return 'welcome'
  }

  if (currentStep === 'goal_discovery') {
    if (lower.includes("your real goal") || lower.includes("isn't just") || lower.includes('just the tool') || lower.includes('just how you get there')) {
      return 'real_goal'
    }
    return 'goal_discovery'
  }

  if (currentStep === 'real_goal') {
    if (lower.includes('tried this before') || lower.includes('starting from zero') || lower.includes('experience')) {
      return 'experience'
    }
    return 'real_goal'
  }

  if (currentStep === 'experience') {
    if (lower.includes('what are you building') || lower.includes('what are you selling') || lower.includes('working on') || lower.includes('project') || lower.includes('business')) {
      return 'context'
    }
    return 'experience'
  }

  if (currentStep === 'context') {
    if (lower.includes("let's do this") || lower.includes("i've got everything") || lower.includes('ready to start') || lower.includes("let's go")) {
      return 'ready'
    }
    return 'context'
  }

  return currentStep
}

// ============================================================
// HTTP Server with REST API + Socket.io
// ============================================================

const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url || '/', `http://localhost:3003`)
  const pathname = url.pathname
  const method = req.method?.toUpperCase()

  // Only handle /api/* routes — everything else falls through to Socket.io
  if (!pathname.startsWith('/api/')) return

  // ---- GET /api/health ----
  if (method === 'GET' && pathname === '/api/health') {
    sendJSON(res, 200, {
      status: 'ok',
      activeSessions: Array.from(sessions.values()).filter((s) => s.isActive).length,
      totalSessions: sessions.size,
      activeOnboardings: onboardingSessions.size,
      uptime: process.uptime(),
    })
    return
  }

  // ---- GET /api/session/:id ----
  if (method === 'GET' && pathname.match(/^\/api\/session\/[^/]+$/)) {
    const sessionId = pathname.split('/').pop()!
    const session = sessions.get(sessionId)
    if (!session) {
      sendJSON(res, 404, { error: 'Session not found' })
      return
    }
    sendJSON(res, 200, {
      id: session.id,
      config: session.config,
      isActive: session.isActive,
      isScreenSharing: session.isScreenSharing,
      moodAssessment: session.moodAssessment,
      detectedMistakes: session.detectedMistakes,
      skillProgress: session.skillProgress,
      messageCount: session.conversationHistory.length,
      realGoal: session.realGoal,
      goalDiscoveryComplete: session.goalDiscoveryComplete,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
    })
    return
  }

  // ---- POST /api/session ----
  if (method === 'POST' && pathname === '/api/session') {
    parseBody(req).then((body) => {
      try {
        const session = createSession({
          userId: body.userId || 'anonymous',
          tool: body.tool || 'general',
          goal: body.goal || '',
          businessContext: body.businessContext || '',
          personality: body.personality || 'chill',
        }, 'rest-api')

        sendJSON(res, 201, {
          sessionId: session.id,
          config: session.config,
          startedAt: session.startedAt,
        })
      } catch (error) {
        sendJSON(res, 500, { error: 'Failed to create session' })
      }
    }).catch(() => {
      sendJSON(res, 400, { error: 'Invalid request body' })
    })
    return
  }

  // ---- POST /api/chat ----
  if (method === 'POST' && pathname === '/api/chat') {
    parseBody(req).then(async (body) => {
      try {
        const session = getSession(body.sessionId)
        if (!session || !session.isActive) {
          sendJSON(res, 404, { error: 'Session not found or inactive' })
          return
        }

        const ai = await getAI()
        const systemPrompt = buildSystemPrompt(
          { ...session.config, realGoal: session.realGoal },
          session.screenContext,
          session.conversationHistory.length,
        )

        session.conversationHistory.push({
          role: 'user',
          content: body.content,
          source: body.source || 'text',
        })

        const recentHistory = session.conversationHistory.slice(-20)
        const messages = [
          { role: 'system' as const, content: systemPrompt },
          ...recentHistory.map((m) => ({
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
          })),
        ]

        const completion = await ai.chat.completions.create({
          messages,
          thinking: { type: 'disabled' },
        })

        const aiResponse = completion.choices?.[0]?.message?.content || "I couldn't generate a response."

        session.conversationHistory.push({
          role: 'assistant',
          content: aiResponse,
          source: body.source || 'text',
        })

        // Check for goal discovery in early messages
        if (!session.goalDiscoveryComplete && session.conversationHistory.length <= 6) {
          const goalIndicators = [
            /your\s+real\s+goal\s+(?:isn't|is\s+not)\s+just/i,
            /isn't\s+just\s+\w+,\s+it'?s/i,
            /just\s+the\s+tool/i,
            /just\s+how\s+you\s+get\s+there/i,
          ]
          for (const indicator of goalIndicators) {
            if (indicator.test(aiResponse)) {
              // Try to extract the real goal from the AI's confirmation
              const realGoalMatch = aiResponse.match(/it'?s?\s+(.+?)[,.]\s+\w+\s+is\s+just/i)
              if (realGoalMatch) {
                session.realGoal = realGoalMatch[1].trim()
              }
              session.goalDiscoveryComplete = true
              break
            }
          }
        }

        sendJSON(res, 200, {
          content: aiResponse,
          source: body.source || 'text',
          sessionId: session.id,
          realGoal: session.realGoal,
          goalDiscoveryComplete: session.goalDiscoveryComplete,
        })
      } catch (error) {
        console.error('[API Chat] Error:', error)
        sendJSON(res, 500, { error: 'Failed to generate response' })
      }
    }).catch(() => {
      sendJSON(res, 400, { error: 'Invalid request body' })
    })
    return
  }

  // ---- POST /api/tts ----
  if (method === 'POST' && pathname === '/api/tts') {
    parseBody(req).then(async (body) => {
      try {
        const ai = await getAI()
        const voice = body.voice || 'tongtong'
        const text = (body.text || '').slice(0, 1024)

        if (!text) {
          sendJSON(res, 400, { error: 'Text is required' })
          return
        }

        const ttsResponse = await ai.audio.tts.create({
          input: text,
          voice: voice as any,
          response_format: 'wav',
          stream: false,
        })

        const audioBuffer = Buffer.from(new Uint8Array(await ttsResponse.arrayBuffer()))
        const audioFilename = `tts_${Date.now()}.wav`
        saveAudioFile(audioBuffer, audioFilename)

        res.writeHead(200, {
          'Content-Type': 'audio/wav',
          'Content-Length': audioBuffer.length,
        })
        res.end(audioBuffer)
      } catch (error) {
        console.error('[API TTS] Error:', error)
        sendJSON(res, 500, { error: 'Failed to generate audio' })
      }
    }).catch(() => {
      sendJSON(res, 400, { error: 'Invalid request body' })
    })
    return
  }

  // ---- POST /api/screen-analyze ----
  if (method === 'POST' && pathname === '/api/screen-analyze') {
    parseBody(req).then(async (body) => {
      try {
        const session = getSession(body.sessionId)
        if (!session || !session.isActive) {
          sendJSON(res, 404, { error: 'Session not found or inactive' })
          return
        }

        if (!canAnalyzeScreen(session)) {
          sendJSON(res, 429, { error: 'Rate limited: max 1 frame every 3 seconds' })
          return
        }

        session.lastScreenAnalysis = Date.now()

        const ai = await getAI()
        const completion = await ai.chat.completions.createVision({
          model: 'glm-4.6v',
          messages: [{
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this screen capture of someone learning ${session.config.tool}. Their goal: ${session.goal || session.config.goal}. Real goal: ${session.realGoal || 'not yet discovered'}. Context: ${session.config.businessContext}. What do you see? Any mistakes? Suggestions? Keep it concise. If you spot a mistake, format it as: [MISTAKE:category] description [SUGGESTION:what to do instead]`,
              },
              {
                type: 'image_url',
                image_url: { url: `data:image/png;base64,${body.frame}` },
              },
            ],
          }],
        })

        const analysis = completion.choices?.[0]?.message?.content || 'Could not analyze screen.'
        session.screenContext = analysis

        sendJSON(res, 200, { analysis, suggestions: [] })
      } catch (error) {
        console.error('[API Screen] Error:', error)
        sendJSON(res, 500, { error: 'Failed to analyze screen' })
      }
    }).catch(() => {
      sendJSON(res, 400, { error: 'Invalid request body' })
    })
    return
  }

  // ---- GET /api/audio/:filename ----
  if (method === 'GET' && pathname.match(/^\/api\/audio\/[^/]+$/)) {
    const filename = pathname.split('/').pop()!
    serveAudioFile(res, filename)
    return
  }

  // 404 for API routes
  sendJSON(res, 404, { error: 'API endpoint not found' })
})

// Attach Socket.io to the same HTTP server
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ============================================================
// Socket Event Handlers
// ============================================================

io.on('connection', (socket: Socket) => {
  console.log(`[Socket] Connected: ${socket.id}`)

  // ---- Onboarding Conversation ----

  socket.on('onboarding:message', async (data: { content: string }) => {
    try {
      // Get or create onboarding session
      let onboarding = getOnboardingBySocket(socket.id)
      if (!onboarding) {
        onboarding = createOnboardingSession(socket.id, 'chill')
      }

      // Add user message to onboarding history
      onboarding.history.push({
        role: 'user',
        content: data.content,
      })

      // Build messages for LLM
      const messages = [
        { role: 'system' as const, content: ONBOARDING_SYSTEM_PROMPT },
        ...onboarding.history.map((m) => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        })),
      ]

      const ai = await getAI()
      const completion = await ai.chat.completions.create({
        messages,
        thinking: { type: 'disabled' },
      })

      const aiResponse = completion.choices?.[0]?.message?.content || "Hey! I'm here to help you get started. What are you looking to learn?"

      // Add AI response to history
      onboarding.history.push({
        role: 'assistant',
        content: aiResponse,
      })

      // Update step based on conversation progress
      const newStep = determineOnboardingStep(aiResponse, onboarding.step)
      onboarding.step = newStep

      // Try to extract discovered goal from conversation
      if (!onboarding.discoveredGoal) {
        // Look for tool mentions in user messages
        const userMessages = onboarding.history.filter(m => m.role === 'user').map(m => m.content)
        const toolPatterns = [
          /(?:learn|use|try|master|understand)\s+(google\s+ads|figma|shopify|photoshop|excel|wordpress|mailchimp|canva|notion|slack)/i,
          /(?:i\s+want\s+to|i\s+need\s+to|i'm\s+trying\s+to)\s+(?:learn|use|figure\s+out|master)\s+(.+?)(?:\.|!|$)/i,
        ]
        for (const pattern of toolPatterns) {
          for (const msg of userMessages) {
            const match = msg.match(pattern)
            if (match) {
              onboarding.tool = match[1].trim()
              break
            }
          }
          if (onboarding.tool) break
        }

        // Look for real goal discovery
        if (onboarding.step === 'real_goal' || onboarding.step === 'experience' || onboarding.step === 'context' || onboarding.step === 'ready') {
          // Extract from the AI's confirmation message
          const realGoalMatch = aiResponse.match(/it'?s?\s+(.+?)[,.]\s+\w+\s+is\s+just/i)
          if (realGoalMatch) {
            onboarding.discoveredGoal = realGoalMatch[1].trim()
          }
        }
      }

      socket.emit('onboarding:response', {
        content: aiResponse,
        step: onboarding.step,
        discoveredGoal: onboarding.discoveredGoal,
        tool: onboarding.tool,
      })

      console.log(`[Onboarding] Socket ${socket.id}: step=${onboarding.step} user="${data.content.slice(0, 50)}..." ai="${aiResponse.slice(0, 50)}..."`)
    } catch (error) {
      console.error('[Onboarding] Error:', error)
      socket.emit('onboarding:response', {
        content: "Oops, something went wrong. Can you say that again?",
        step: 'welcome',
        discoveredGoal: null,
        tool: null,
      })
    }
  })

  // ---- Session Management ----

  socket.on('session:start', async (data: {
    userId: string
    tool: string
    goal: string
    businessContext: string
    personality: PersonalityType
    realGoal?: string
  }) => {
    try {
      console.log(`[Session] Starting session for user ${data.userId}, tool: ${data.tool}`)
      const session = createSession({
        userId: data.userId,
        tool: data.tool,
        goal: data.goal,
        businessContext: data.businessContext || '',
        personality: data.personality || 'chill',
      }, socket.id)

      // Carry over real goal from onboarding if provided
      if (data.realGoal) {
        session.realGoal = data.realGoal
        session.goalDiscoveryComplete = true
      }

      socket.emit('session:started', { sessionId: session.id, realGoal: session.realGoal })
      console.log(`[Session] Created session ${session.id}`)
    } catch (error) {
      console.error('[Session] Error creating session:', error)
      socket.emit('error', { message: 'Failed to create session' })
    }
  })

  socket.on('session:end', async (data: { sessionId: string }) => {
    try {
      console.log(`[Session] Ending session ${data.sessionId}`)
      endSession(data.sessionId)
    } catch (error) {
      console.error('[Session] Error ending session:', error)
    }
  })

  // ---- Chat ----

  socket.on('chat:message', async (data: {
    sessionId: string
    content: string
    source: 'text' | 'voice'
  }) => {
    try {
      const session = getSession(data.sessionId)
      if (!session || !session.isActive) {
        socket.emit('error', { message: 'Session not found or inactive' })
        return
      }

      // Add user message to history
      session.conversationHistory.push({
        role: 'user',
        content: data.content,
        source: data.source,
      })

      // Notify client that AI is processing
      socket.emit('chat:typing', { isTyping: true })

      const ai = await getAI()
      const systemPrompt = buildSystemPrompt(
        { ...session.config, realGoal: session.realGoal },
        session.screenContext,
        session.conversationHistory.length,
      )

      // Build messages for LLM (last 20 messages for context window)
      const recentHistory = session.conversationHistory.slice(-20)
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...recentHistory.map((m) => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        })),
      ]

      const completion = await ai.chat.completions.create({
        messages,
        thinking: { type: 'disabled' },
      })

      const aiResponse = completion.choices?.[0]?.message?.content || "Hmm, I couldn't think of a response. Try again?"

      // Add assistant response to history
      session.conversationHistory.push({
        role: 'assistant',
        content: aiResponse,
        source: data.source,
      })

      // Enhanced mistake detection
      const detectedMistakes = detectMistakes(aiResponse)

      for (const mistake of detectedMistakes) {
        session.detectedMistakes.push({
          category: mistake.category,
          description: mistake.description,
          suggestion: mistake.suggestion,
          timestamp: new Date(),
        })
        socket.emit('mistake:detected', {
          category: mistake.category,
          description: mistake.description,
          suggestion: mistake.suggestion,
        })
      }

      // Check for goal discovery in early messages
      if (!session.goalDiscoveryComplete && session.conversationHistory.length <= 6) {
        const goalIndicators = [
          /your\s+real\s+goal\s+(?:isn't|is\s+not)\s+just/i,
          /isn't\s+just\s+\w+,\s+it'?s/i,
          /just\s+the\s+tool/i,
          /just\s+how\s+you\s+get\s+there/i,
        ]
        for (const indicator of goalIndicators) {
          if (indicator.test(aiResponse)) {
            const realGoalMatch = aiResponse.match(/it'?s?\s+(.+?)[,.]\s+\w+\s+is\s+just/i)
            if (realGoalMatch) {
              session.realGoal = realGoalMatch[1].trim()
            }
            session.goalDiscoveryComplete = true
            break
          }
        }
      }

      socket.emit('chat:typing', { isTyping: false })
      socket.emit('chat:response', {
        content: aiResponse,
        source: data.source,
        realGoal: session.realGoal,
        goalDiscoveryComplete: session.goalDiscoveryComplete,
      })

      console.log(`[Chat] Session ${data.sessionId}: user="${data.content.slice(0, 50)}..." ai="${aiResponse.slice(0, 50)}..."`)
    } catch (error) {
      console.error('[Chat] Error:', error)
      socket.emit('chat:typing', { isTyping: false })
      socket.emit('chat:response', {
        content: "Oops, something went wrong on my end. Give me another shot?",
        source: data.source || 'text',
      })
    }
  })

  // ---- Screen Sharing ----

  socket.on('screen:start', async (data: { sessionId: string }) => {
    try {
      const session = getSession(data.sessionId)
      if (!session || !session.isActive) {
        socket.emit('error', { message: 'Session not found or inactive' })
        return
      }
      session.isScreenSharing = true
      console.log(`[Screen] Session ${data.sessionId}: screen sharing started`)
    } catch (error) {
      console.error('[Screen] Error starting screen share:', error)
    }
  })

  socket.on('screen:stop', async (data: { sessionId: string }) => {
    try {
      const session = getSession(data.sessionId)
      if (!session || !session.isActive) return
      session.isScreenSharing = false
      session.screenContext = null
      console.log(`[Screen] Session ${data.sessionId}: screen sharing stopped`)
    } catch (error) {
      console.error('[Screen] Error stopping screen share:', error)
    }
  })

  socket.on('screen:frame', async (data: {
    sessionId: string
    frame: string // base64
  }) => {
    try {
      const session = getSession(data.sessionId)
      if (!session || !session.isActive) {
        socket.emit('error', { message: 'Session not found or inactive' })
        return
      }

      if (!session.isScreenSharing) {
        socket.emit('error', { message: 'Screen sharing not started' })
        return
      }

      // Rate limit screen analysis
      if (!canAnalyzeScreen(session)) {
        return // Silently skip to control costs
      }

      session.lastScreenAnalysis = Date.now()

      const ai = await getAI()

      const completion = await ai.chat.completions.createVision({
        model: 'glm-4.6v',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are analyzing a screen capture of someone learning ${session.config.tool}. Their stated goal: ${session.config.goal}. Real goal: ${session.realGoal || 'not yet discovered'}. Business context: ${session.config.businessContext}.

Analyze what's on screen and provide:
1. What the user is currently looking at or doing (1 sentence)
2. Any mistakes or potential issues you notice
3. A helpful suggestion or next step

Keep it concise - no yapping. If you spot a mistake, format it as: [MISTAKE:category] description [SUGGESTION:what to do instead]
You can also use: !MISTAKE:category! description !SUGGESTION:what to do instead!`,
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/png;base64,${data.frame}` },
            },
          ],
        }],
      })

      const analysisText = completion.choices?.[0]?.message?.content || 'Could not analyze screen.'

      // Update screen context
      session.screenContext = analysisText

      // Enhanced mistake detection in VLM response
      const detectedMistakes = detectMistakes(analysisText)

      const suggestions: string[] = []
      for (const mistake of detectedMistakes) {
        session.detectedMistakes.push({
          category: mistake.category,
          description: mistake.description,
          suggestion: mistake.suggestion,
          timestamp: new Date(),
        })
        suggestions.push(mistake.suggestion)
        socket.emit('mistake:detected', {
          category: mistake.category,
          description: mistake.description,
          suggestion: mistake.suggestion,
        })
        socket.emit('screen:warning', {
          message: mistake.description,
        })
      }

      socket.emit('screen:analysis', {
        analysis: analysisText,
        suggestions,
      })

      console.log(`[Screen] Session ${data.sessionId}: frame analyzed`)
    } catch (error) {
      console.error('[Screen] Error analyzing frame:', error)
      // Don't send error for every failed frame to avoid spam
    }
  })

  // ---- Voice ----

  socket.on('voice:chunk', async (data: {
    sessionId: string
    chunk: string // base64
    format: 'wav' | 'mp3'
  }) => {
    try {
      const session = getSession(data.sessionId)
      if (!session || !session.isActive) {
        socket.emit('error', { message: 'Session not found or inactive' })
        return
      }

      const ai = await getAI()

      // Transcribe audio
      const asrResult = await ai.audio.asr.create({
        file_base64: data.chunk,
      })

      const transcript = asrResult.text || ''
      if (!transcript.trim()) {
        socket.emit('voice:transcript', { text: '' })
        return
      }

      socket.emit('voice:transcript', { text: transcript })

      // Now process as a chat message from voice
      session.conversationHistory.push({
        role: 'user',
        content: transcript,
        source: 'voice',
      })

      socket.emit('chat:typing', { isTyping: true })

      const systemPrompt = buildSystemPrompt(
        { ...session.config, realGoal: session.realGoal },
        session.screenContext,
        session.conversationHistory.length,
      )
      const recentHistory = session.conversationHistory.slice(-20)
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...recentHistory.map((m) => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        })),
      ]

      const completion = await ai.chat.completions.create({
        messages,
        thinking: { type: 'disabled' },
      })

      const aiResponse = completion.choices?.[0]?.message?.content || "I couldn't process that. Could you try again?"

      session.conversationHistory.push({
        role: 'assistant',
        content: aiResponse,
        source: 'voice',
      })

      // Enhanced mistake detection
      const detectedMistakes = detectMistakes(aiResponse)
      for (const mistake of detectedMistakes) {
        session.detectedMistakes.push({
          category: mistake.category,
          description: mistake.description,
          suggestion: mistake.suggestion,
          timestamp: new Date(),
        })
        socket.emit('mistake:detected', {
          category: mistake.category,
          description: mistake.description,
          suggestion: mistake.suggestion,
        })
      }

      // Check for goal discovery
      if (!session.goalDiscoveryComplete && session.conversationHistory.length <= 6) {
        const goalIndicators = [
          /your\s+real\s+goal\s+(?:isn't|is\s+not)\s+just/i,
          /isn't\s+just\s+\w+,\s+it'?s/i,
          /just\s+the\s+tool/i,
          /just\s+how\s+you\s+get\s+there/i,
        ]
        for (const indicator of goalIndicators) {
          if (indicator.test(aiResponse)) {
            const realGoalMatch = aiResponse.match(/it'?s?\s+(.+?)[,.]\s+\w+\s+is\s+just/i)
            if (realGoalMatch) {
              session.realGoal = realGoalMatch[1].trim()
            }
            session.goalDiscoveryComplete = true
            break
          }
        }
      }

      // Generate TTS response
      let audioUrl: string | undefined
      try {
        const voice = VOICE_MAP[session.config.personality] || 'tongtong'
        const ttsResponse = await ai.audio.tts.create({
          input: aiResponse.slice(0, 1024),
          voice: voice as any,
          response_format: 'wav',
          stream: false,
        })
        const audioBuffer = Buffer.from(new Uint8Array(await ttsResponse.arrayBuffer()))
        const audioFilename = `${session.id}_${Date.now()}.wav`
        saveAudioFile(audioBuffer, audioFilename)
        audioUrl = `/api/audio/${audioFilename}`
      } catch (ttsError) {
        console.error('[Voice] TTS error:', ttsError)
        // Continue without audio
      }

      socket.emit('chat:typing', { isTyping: false })
      socket.emit('voice:response', {
        audioUrl,
        text: aiResponse,
      })
      socket.emit('chat:response', {
        content: aiResponse,
        source: 'voice',
        audioUrl,
        realGoal: session.realGoal,
        goalDiscoveryComplete: session.goalDiscoveryComplete,
      })

      console.log(`[Voice] Session ${data.sessionId}: transcript="${transcript.slice(0, 50)}..." response="${aiResponse.slice(0, 50)}..."`)
    } catch (error) {
      console.error('[Voice] Error:', error)
      socket.emit('chat:typing', { isTyping: false })
      socket.emit('voice:response', {
        audioUrl: undefined,
        text: "Sorry, I had trouble processing your voice. Can you try again or type it?",
      })
    }
  })

  // ---- Disconnect ----

  socket.on('disconnect', () => {
    const session = getSessionBySocket(socket.id)
    if (session) {
      console.log(`[Socket] Disconnected: ${socket.id}, session ${session.id}`)
      session.isActive = false
      session.endedAt = new Date()
      session.isScreenSharing = false
      socketToSession.delete(socket.id)
    } else {
      console.log(`[Socket] Disconnected: ${socket.id}`)
    }

    // Clean up onboarding session
    const onboardingId = socketToOnboarding.get(socket.id)
    if (onboardingId) {
      onboardingSessions.delete(onboardingId)
      socketToOnboarding.delete(socket.id)
    }
  })

  socket.on('error', (error: Error) => {
    console.error(`[Socket] Error (${socket.id}):`, error)
  })
})

// ============================================================
// Start Server
// ============================================================

const PORT = 3003

ensureAudioDir()

httpServer.listen(PORT, () => {
  console.log(`[Companion Service] Running on port ${PORT}`)
  console.log(`[Companion Service] Socket.io path: /socket.io/ (default)`)
  console.log(`[Companion Service] REST API: http://localhost:${PORT}/api/`)
  console.log(`[Companion Service] Voice mapping: chill→tongtong, drill_sergeant→jam, patient→xiaochen, hype→chuichui`)
})

// ============================================================
// Graceful Shutdown
// ============================================================

process.on('SIGTERM', () => {
  console.log('[Companion Service] Received SIGTERM, shutting down...')
  httpServer.close(() => {
    console.log('[Companion Service] Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('[Companion Service] Received SIGINT, shutting down...')
  httpServer.close(() => {
    console.log('[Companion Service] Server closed')
    process.exit(0)
  })
})
