'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { useSocket } from '@/hooks/use-socket'
import { useScreenCapture } from '@/hooks/use-screen-capture'
import { PERSONALITIES, TOOLS, SCREEN_CAPTURE } from '@/lib/constants'
import type { PersonalityType, OnboardingStep, ChatMessage } from '@/lib/types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  MessageCircle,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  Send,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Target,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  Volume2,
  VolumeX,
  X,
  ChevronRight,
  Flame,
  Trophy,
  Lightbulb,
  Pause,
  Play,
} from 'lucide-react'

// ─── Animation Variants ─────────────────────────────────────────────────────

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.5 },
}

const stagger = {
  animate: {
    transition: { staggerChildren: 0.1 },
  },
}

const staggerItem = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
}

// ─── Landing View ────────────────────────────────────────────────────────────

function LandingView() {
  const { setView } = useAppStore()

  return (
    <div className="min-h-screen flex flex-col bg-[#141210] text-[#f5f0eb] overflow-hidden relative">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 45%, rgba(217, 119, 6, 0.06) 0%, rgba(217, 119, 6, 0.02) 40%, transparent 70%)',
        }}
      />

      <motion.header
        className="relative z-10 flex items-center justify-center pt-8 sm:pt-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      >
        <span className="text-sm sm:text-base tracking-[0.25em] text-[#a89f94] font-light select-none">
          nextto
        </span>
      </motion.header>

      <motion.main
        className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 sm:px-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.6 }}
      >
        <motion.h1
          className="text-center max-w-3xl"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <span className="block text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-light leading-[1.15] tracking-[-0.01em] text-[#f5f0eb]">
            what if someone was sitting next to you while you learned?
          </span>
        </motion.h1>

        <motion.div
          className="mt-10 sm:mt-14"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <Button
            onClick={() => setView('onboarding')}
            className="relative group cursor-pointer bg-[#d97706] hover:bg-[#e88a1a] text-[#141210] font-medium text-base sm:text-lg px-8 py-5 sm:px-10 sm:py-6 rounded-full transition-all duration-300 hover:shadow-[0_0_40px_rgba(217,119,6,0.3)] active:scale-[0.97]"
          >
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-[#d97706]/40"
              animate={{ scale: [1, 1.15, 1.15], opacity: [0.6, 0, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut', repeatDelay: 1 }}
            />
            <span className="relative z-10">try it free</span>
          </Button>
        </motion.div>
      </motion.main>

      <motion.footer
        className="relative z-10 flex items-center justify-center pb-8 sm:pb-10 pt-4 mt-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 1.6, ease: 'easeOut' }}
      >
        <p className="text-xs sm:text-sm text-[#5c554d] tracking-wide font-light select-none">
          a teacher. a friend. a presence.
        </p>
      </motion.footer>
    </div>
  )
}

// ─── Onboarding View ─────────────────────────────────────────────────────────

function OnboardingView() {
  const { setView, onboardingStep, setOnboardingStep, setPersonality, setGoal, personality, goal, userId, startSession } = useAppStore()
  const { connect, emitSessionStart, isConnected } = useSocket()
  const [inputText, setInputText] = useState('')
  const [selectedTool, setSelectedTool] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [isExtractingGoal, setIsExtractingGoal] = useState(false)
  const [discoveredGoal, setDiscoveredGoal] = useState<string>('')

  const handleGoalSubmit = async () => {
    if (!inputText.trim()) return
    setIsExtractingGoal(true)
    
    try {
      // Use the goal extraction API to discover the real goal
      const res = await fetch('/api/goal-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statedGoal: inputText, tool: selectedTool || 'general' }),
      })
      const data = await res.json()
      
      const realGoal = data.realGoal || inputText
      const businessContext = data.businessContext || ''
      const suggestedPersonality = data.suggestedPersonality || 'chill'
      setDiscoveredGoal(realGoal)
      
      setGoal({
        tool: selectedTool || 'general',
        statedGoal: inputText,
        realGoal: realGoal,
        businessContext: businessContext,
      })
      
      // If AI suggests a personality, pre-select it
      if (suggestedPersonality && ['chill', 'drill_sergeant', 'patient', 'hype'].includes(suggestedPersonality)) {
        setPersonality(suggestedPersonality as PersonalityType)
      }
    } catch {
      // Fallback - just use the stated goal
      setGoal({
        tool: selectedTool || 'general',
        statedGoal: inputText,
        realGoal: inputText,
        businessContext: '',
      })
    }
    
    setIsExtractingGoal(false)
    setOnboardingStep('personality')
  }

  const handlePersonalitySelect = (p: PersonalityType) => {
    setPersonality(p)
    setOnboardingStep('screen-permission')
  }

  const handleStartSession = async () => {
    setIsConnecting(true)
    if (!isConnected) {
      connect()
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 1500))
    }

    const sessionGoal = goal || { tool: selectedTool, statedGoal: inputText, realGoal: inputText, businessContext: '' }
    emitSessionStart({
      userId: userId || `user-${Date.now()}`,
      tool: sessionGoal.tool,
      goal: sessionGoal.realGoal || sessionGoal.statedGoal,
      businessContext: sessionGoal.businessContext || '',
      personality: personality,
    })

    // Wait for session to start
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsConnecting(false)
    setOnboardingStep('ready')
  }

  const handleEnterSession = () => {
    setView('session')
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#141210] text-[#f5f0eb]">
      {/* Progress bar */}
      <div className="w-full px-6 pt-6">
        <div className="flex items-center gap-2 max-w-2xl mx-auto">
          {['greeting', 'goal', 'personality', 'screen-permission', 'ready'].map((step, i) => (
            <div key={step} className="flex items-center flex-1">
              <div
                className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                  ['greeting', 'goal', 'personality', 'screen-permission', 'ready'].indexOf(onboardingStep) >= i
                    ? 'bg-[#d97706]'
                    : 'bg-[#2a2520]'
                }`}
              />
              {i < 4 && <div className="w-2" />}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6">
        <AnimatePresence mode="wait">
          {/* Step 1: Greeting */}
          {onboardingStep === 'greeting' && (
            <motion.div key="greeting" {...fadeIn} className="max-w-lg text-center">
              <motion.div className="text-5xl mb-6" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
                👋
              </motion.div>
              <h2 className="text-2xl sm:text-3xl font-light mb-4">
                hey. so. what are you trying to figure out right now?
              </h2>
              <p className="text-[#a89f94] mb-8 text-base">
                just type it. or pick a tool below. whatever&apos;s easier.
              </p>
              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="i want to learn..."
                className="bg-[#1e1a17] border-[#3a3229] text-[#f5f0eb] placeholder:text-[#6b5f52] text-lg py-6 px-5 rounded-xl focus:border-[#d97706] focus:ring-[#d97706]/20"
                onKeyDown={(e) => e.key === 'Enter' && inputText.trim() && setOnboardingStep('goal')}
              />
              <Button
                onClick={() => inputText.trim() && setOnboardingStep('goal')}
                disabled={!inputText.trim()}
                className="mt-4 bg-[#d97706] hover:bg-[#e88a1a] text-[#141210] rounded-full px-8 py-3 text-base font-medium cursor-pointer"
              >
                next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-[10px] text-[#5c554d] mt-3">don&apos;t worry about being specific. just say what&apos;s on your mind.</p>
            </motion.div>
          )}

          {/* Step 2: Tool/Goal selection */}
          {onboardingStep === 'goal' && (
            <motion.div key="goal" {...fadeIn} className="max-w-xl w-full">
              <h2 className="text-2xl sm:text-3xl font-light mb-2 text-center">
                cool. which tool are you learning?
              </h2>
              <p className="text-[#a89f94] mb-6 text-center">
                pick one — or skip if you&apos;re not sure yet
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {TOOLS.map((tool) => (
                  <motion.button
                    key={tool.id}
                    onClick={() => setSelectedTool(tool.id)}
                    className={`p-4 rounded-xl border transition-all duration-200 text-left cursor-pointer ${
                      selectedTool === tool.id
                        ? 'border-[#d97706] bg-[#d97706]/10 shadow-[0_0_20px_rgba(217,119,6,0.1)]'
                        : 'border-[#2a2520] bg-[#1a1613] hover:border-[#3a3229] hover:bg-[#1e1a17]'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-sm font-medium text-[#f5f0eb]">{tool.name}</div>
                    <div className="text-xs text-[#8a7e70] mt-1">{tool.description}</div>
                  </motion.button>
                ))}
              </div>
              <div className="flex items-center justify-between mt-6">
                <Button
                  onClick={() => setOnboardingStep('greeting')}
                  variant="ghost"
                  className="text-[#8a7e70] hover:text-[#f5f0eb] hover:bg-transparent cursor-pointer"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> back
                </Button>
                <Button
                  onClick={handleGoalSubmit}
                  disabled={(!selectedTool && !inputText.trim()) || isExtractingGoal}
                  className="bg-[#d97706] hover:bg-[#e88a1a] text-[#141210] rounded-full px-8 py-3 font-medium cursor-pointer"
                >
                  {isExtractingGoal ? 'understanding your goal...' : 'next'} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Personality Selection */}
          {onboardingStep === 'personality' && (
            <motion.div key="personality" {...fadeIn} className="max-w-xl w-full">
              <h2 className="text-2xl sm:text-3xl font-light mb-2 text-center">
                how should i talk to you?
              </h2>
              <p className="text-[#a89f94] mb-6 text-center">
                when you learn best, are you the type who wants a friend who&apos;s chill? or someone who&apos;s gonna push you?
              </p>
              <div className="grid gap-3">
                {PERSONALITIES.map((p) => (
                  <motion.button
                    key={p.id}
                    onClick={() => handlePersonalitySelect(p.id)}
                    className={`p-5 rounded-xl border transition-all duration-200 text-left cursor-pointer group ${
                      personality === p.id
                        ? 'border-[#d97706] bg-[#d97706]/10 shadow-[0_0_20px_rgba(217,119,6,0.1)]'
                        : 'border-[#2a2520] bg-[#1a1613] hover:border-[#3a3229]'
                    }`}
                    whileHover={{ scale: 1.01, x: 4 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-3xl">{p.emoji}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-medium text-[#f5f0eb]">{p.name}</span>
                        </div>
                        <p className="text-sm text-[#8a7e70] mt-1">{p.description}</p>
                        <p className="text-xs text-[#6b5f52] mt-2 italic">&ldquo;{p.samplePhrase}&rdquo;</p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
              <Button
                onClick={() => setOnboardingStep('goal')}
                variant="ghost"
                className="mt-4 text-[#8a7e70] hover:text-[#f5f0eb] hover:bg-transparent cursor-pointer"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> back
              </Button>
            </motion.div>
          )}

          {/* Step 4: Screen Permission */}
          {onboardingStep === 'screen-permission' && (
            <motion.div key="screen-permission" {...fadeIn} className="max-w-md text-center">
              <motion.div
                className="mx-auto w-20 h-20 rounded-2xl bg-[#1a1613] border border-[#2a2520] flex items-center justify-center mb-6"
                initial={{ rotate: -10 }}
                animate={{ rotate: 0 }}
                transition={{ type: 'spring', delay: 0.2 }}
              >
                <Monitor className="h-8 w-8 text-[#d97706]" />
              </motion.div>
              <h2 className="text-2xl sm:text-3xl font-light mb-4">
                one thing.
              </h2>
              <p className="text-[#a89f94] mb-4 text-base leading-relaxed">
                to actually help you, i need to see your screen. just while we&apos;re learning.
              </p>
              <p className="text-[#6b5f52] mb-8 text-sm">
                you can turn it off anytime. i don&apos;t save your screen. i just look at it, help you, and forget it.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={handleStartSession}
                  disabled={isConnecting}
                  className="bg-[#d97706] hover:bg-[#e88a1a] text-[#141210] rounded-full px-8 py-3 text-base font-medium cursor-pointer"
                >
                  {isConnecting ? 'connecting...' : "yes, let's do it"}
                  {!isConnecting && <Sparkles className="ml-2 h-4 w-4" />}
                </Button>
                <Button
                  onClick={handleStartSession}
                  variant="ghost"
                  className="text-[#8a7e70] hover:text-[#f5f0eb] hover:bg-transparent rounded-full cursor-pointer"
                >
                  skip for now
                </Button>
              </div>
              <Button
                onClick={() => setOnboardingStep('personality')}
                variant="ghost"
                className="mt-4 text-[#6b5f52] hover:text-[#f5f0eb] hover:bg-transparent cursor-pointer"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> back
              </Button>
            </motion.div>
          )}

          {/* Step 5: Ready */}
          {onboardingStep === 'ready' && (
            <motion.div key="ready" {...fadeIn} className="max-w-md text-center">
              <motion.div
                className="text-5xl mb-6"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', delay: 0.2 }}
              >
                ✨
              </motion.div>
              <h2 className="text-2xl sm:text-3xl font-light mb-4">
                okay. we&apos;re ready.
              </h2>
              <p className="text-[#a89f94] mb-8 text-base">
                i&apos;ll be right here. just start doing your thing and i&apos;ll guide you through it.
              </p>
              <Button
                onClick={handleEnterSession}
                className="bg-[#d97706] hover:bg-[#e88a1a] text-[#141210] rounded-full px-10 py-4 text-lg font-medium cursor-pointer hover:shadow-[0_0_30px_rgba(217,119,6,0.3)]"
              >
                let&apos;s go <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Skip to landing */}
      <div className="flex justify-center pb-6">
        <Button
          onClick={() => setView('landing')}
          variant="ghost"
          className="text-[#5c554d] hover:text-[#8a7e70] hover:bg-transparent text-xs cursor-pointer"
        >
          ← back to start
        </Button>
      </div>
    </div>
  )
}

// ─── Chat Bubble ─────────────────────────────────────────────────────────────

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
    >
      <div
        className={`max-w-[85%] sm:max-w-[75%] ${
          isUser
            ? 'bg-[#d97706]/15 border border-[#d97706]/20 text-[#f5f0eb] rounded-2xl rounded-br-md'
            : isSystem
            ? 'bg-[#1a1613] border border-[#2a2520] text-[#a89f94] rounded-2xl text-center text-sm italic'
            : 'bg-[#1e1a17] border border-[#2a2520] text-[#f5f0eb] rounded-2xl rounded-bl-md'
        } px-4 py-3`}
      >
        {!isUser && !isSystem && (
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs text-[#8a7e70]">nextto</span>
            {message.source === 'voice' && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-[#d97706]/10 text-[#d97706] border-0">
                voice
              </Badge>
            )}
            {message.source === 'screen' && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-blue-500/10 text-blue-400 border-0">
                screen
              </Badge>
            )}
          </div>
        )}
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
        {message.audioUrl && (
          <audio controls src={message.audioUrl} className="mt-2 h-8 w-full" />
        )}
      </div>
    </motion.div>
  )
}

// ─── Session View ────────────────────────────────────────────────────────────

function SessionView() {
  const {
    setView,
    session,
    messages,
    addMessage,
    isAiTyping,
    setAiTyping,
    personality,
    goal,
    userId,
    mistakes,
    setScreenSharing,
    endSession,
    resetSession,
  } = useAppStore()

  const { emitChatMessage, emitScreenFrame, emitScreenStart, emitScreenStop, isConnected, connect, emitSessionEnd } = useSocket()
  const screenCapture = useScreenCapture()

  const [inputText, setInputText] = useState('')
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [showMistakes, setShowMistakes] = useState(false)
  const [showScreenPreview, setShowScreenPreview] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isAiTyping])

  // Connect socket on mount
  useEffect(() => {
    if (!isConnected) {
      connect()
    }
  }, [isConnected, connect])

  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim()) return

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role: 'user',
      content: inputText,
      source: 'text',
      timestamp: new Date(),
    }
    addMessage(userMsg)
    setAiTyping(true)
    setInputText('')
    inputRef.current?.focus()

    // Use Socket.io if connected, otherwise use REST API
    if (isConnected && session.sessionId) {
      emitChatMessage({
        sessionId: session.sessionId,
        content: inputText,
        source: 'text',
      })
    } else {
      // Fallback: use Next.js API route
      try {
        const chatHistory = messages.map(m => ({ role: m.role, content: m.content }))
        chatHistory.push({ role: 'user', content: inputText })
        
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: chatHistory,
            personality,
            goal: goal?.realGoal || goal?.statedGoal || '',
            tool: goal?.tool || 'general',
            businessContext: goal?.businessContext || '',
          }),
        })
        const data = await res.json()
        
        const aiMsg: ChatMessage = {
          id: `msg-${Date.now()}-ai`,
          role: 'assistant',
          content: data.content,
          source: 'text',
          timestamp: new Date(),
        }
        addMessage(aiMsg)
        
        // Generate TTS audio for the response
        if (data.content) {
          try {
            const ttsRes = await fetch('/api/tts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: data.content, voice: PERSONALITIES.find(p => p.id === personality)?.voiceId || 'tongtong' }),
            })
            if (ttsRes.ok) {
              const audioBlob = await ttsRes.blob()
              const audioUrl = URL.createObjectURL(audioBlob)
              // Play audio
              const audio = new Audio(audioUrl)
              audio.play().catch(() => {})
            }
          } catch {
            // TTS failed silently
          }
        }
      } catch (error) {
        const errorMsg: ChatMessage = {
          id: `msg-${Date.now()}-error`,
          role: 'system',
          content: 'something went wrong. try again?',
          source: 'text',
          timestamp: new Date(),
        }
        addMessage(errorMsg)
      }
      setAiTyping(false)
    }
  }, [inputText, session.sessionId, isConnected, messages, personality, goal, addMessage, setAiTyping, emitChatMessage])

  const handleScreenShare = useCallback(async () => {
    if (screenCapture.isCapturing) {
      screenCapture.stopCapture()
      setScreenSharing(false)
      if (session.sessionId) {
        emitScreenStop(session.sessionId)
      }
      setShowScreenPreview(false)
    } else {
      const success = await screenCapture.startCapture()
      if (success) {
        setScreenSharing(true)
        if (session.sessionId) {
          emitScreenStart(session.sessionId)
          // Start auto-capturing frames
          screenCapture.startAutoCapture(SCREEN_CAPTURE.captureInterval, (frame) => {
            emitScreenFrame({ sessionId: session.sessionId!, frame })
          })
        }
        setShowScreenPreview(true)
      }
    }
  }, [screenCapture, setScreenSharing, session.sessionId, emitScreenStart, emitScreenStop, emitScreenFrame])

  const handleEndSession = useCallback(() => {
    if (screenCapture.isCapturing) {
      screenCapture.stopCapture()
    }
    if (session.sessionId) {
      emitSessionEnd(session.sessionId)
    }
    endSession()
    resetSession()
  }, [screenCapture, session.sessionId, emitSessionEnd, endSession, resetSession])

  // Voice toggle (placeholder for now - will use MediaRecorder)
  const toggleVoice = useCallback(() => {
    setIsVoiceActive(prev => !prev)
    // TODO: Implement actual voice recording and ASR
  }, [])

  const currentPersonality = PERSONALITIES.find(p => p.id === personality)

  return (
    <div className="h-screen flex flex-col bg-[#141210] text-[#f5f0eb] overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2520] bg-[#141210]/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="text-sm tracking-[0.2em] text-[#a89f94] font-light">nextto</span>
          <Separator orientation="vertical" className="h-4 bg-[#2a2520]" />
          <div className="flex items-center gap-2">
            <span className="text-lg">{currentPersonality?.emoji}</span>
            <span className="text-xs text-[#8a7e70]">{currentPersonality?.name}</span>
          </div>
          {goal && (
            <>
              <Separator orientation="vertical" className="h-4 bg-[#2a2520]" />
              <Badge variant="secondary" className="text-[10px] h-5 px-2 bg-[#d97706]/10 text-[#d97706] border-0">
                <Target className="h-3 w-3 mr-1" />
                {goal.statedGoal.length > 20 ? goal.statedGoal.slice(0, 20) + '...' : goal.statedGoal}
              </Badge>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Mistakes toggle */}
          <Button
            onClick={() => setShowMistakes(!showMistakes)}
            variant="ghost"
            size="sm"
            className={`relative h-8 w-8 p-0 cursor-pointer ${mistakes.length > 0 ? 'text-[#d97706]' : 'text-[#6b5f52]'}`}
          >
            <AlertTriangle className="h-4 w-4" />
            {mistakes.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#d97706] text-[#141210] text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold">
                {mistakes.length}
              </span>
            )}
          </Button>

          {/* Connection status */}
          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500/50'}`} title={isConnected ? 'Connected' : 'Disconnected'} />

          {/* End session */}
          <Button
            onClick={handleEndSession}
            variant="ghost"
            size="sm"
            className="text-[#6b5f52] hover:text-red-400 hover:bg-transparent h-8 w-8 p-0 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <ScrollArea className="flex-1 px-4 py-4">
            {messages.length === 0 && (
              <motion.div
                className="flex flex-col items-center justify-center h-full text-center py-20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="text-4xl mb-4">{currentPersonality?.emoji}</div>
                <p className="text-[#a89f94] text-lg max-w-sm">
                  {currentPersonality?.samplePhrase || "hey. what are you trying to figure out right now?"}
                </p>
                <p className="text-[#6b5f52] text-sm mt-3">type something or share your screen to get started</p>
              </motion.div>
            )}

            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}

            {/* AI typing indicator */}
            {isAiTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start mb-3"
              >
                <div className="bg-[#1e1a17] border border-[#2a2520] rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-[#8a7e70] mr-2">nextto</span>
                    <motion.span
                      className="w-1.5 h-1.5 bg-[#d97706] rounded-full"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    />
                    <motion.span
                      className="w-1.5 h-1.5 bg-[#d97706] rounded-full"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                    />
                    <motion.span
                      className="w-1.5 h-1.5 bg-[#d97706] rounded-full"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={chatEndRef} />
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t border-[#2a2520] px-4 py-3 bg-[#141210]/95 backdrop-blur-sm">
            <div className="flex items-center gap-2 max-w-3xl mx-auto">
              {/* Screen share button */}
              <Button
                onClick={handleScreenShare}
                variant="ghost"
                size="sm"
                className={`h-10 w-10 p-0 rounded-full cursor-pointer ${
                  screenCapture.isCapturing
                    ? 'bg-[#d97706]/20 text-[#d97706] hover:bg-[#d97706]/30'
                    : 'text-[#6b5f52] hover:text-[#a89f94] hover:bg-[#1e1a17]'
                }`}
                title={screenCapture.isCapturing ? 'Stop sharing' : 'Share screen'}
              >
                {screenCapture.isCapturing ? <MonitorOff className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
              </Button>

              {/* Voice button */}
              <Button
                onClick={toggleVoice}
                variant="ghost"
                size="sm"
                className={`h-10 w-10 p-0 rounded-full cursor-pointer ${
                  isVoiceActive
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'text-[#6b5f52] hover:text-[#a89f94] hover:bg-[#1e1a17]'
                }`}
              >
                {isVoiceActive ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>

              {/* Text input */}
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="type it..."
                  className="bg-[#1e1a17] border-[#2a2520] text-[#f5f0eb] placeholder:text-[#6b5f52] rounded-full py-2 px-5 pr-12 focus:border-[#d97706] focus:ring-[#d97706]/20 h-10"
                  disabled={isAiTyping}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isAiTyping}
                  size="sm"
                  className="absolute right-1 top-1 h-8 w-8 p-0 bg-[#d97706] hover:bg-[#e88a1a] text-[#141210] rounded-full cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Side Panel - Mistakes / Screen Preview */}
        <AnimatePresence>
          {(showMistakes || showScreenPreview) && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-l border-[#2a2520] bg-[#1a1613] overflow-hidden flex-shrink-0"
            >
              {/* Tab selector */}
              <div className="flex border-b border-[#2a2520]">
                <button
                  onClick={() => { setShowScreenPreview(false); setShowMistakes(true); }}
                  className={`flex-1 py-3 text-xs font-medium transition-colors cursor-pointer ${
                    showMistakes && !showScreenPreview ? 'text-[#d97706] border-b-2 border-[#d97706]' : 'text-[#6b5f52]'
                  }`}
                >
                  <AlertTriangle className="h-3.5 w-3.5 mx-auto mb-1" />
                  mistakes
                </button>
                <button
                  onClick={() => { setShowMistakes(false); setShowScreenPreview(true); }}
                  className={`flex-1 py-3 text-xs font-medium transition-colors cursor-pointer ${
                    showScreenPreview && !showMistakes ? 'text-[#d97706] border-b-2 border-[#d97706]' : 'text-[#6b5f52]'
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5 mx-auto mb-1" />
                  screen
                </button>
              </div>

              <ScrollArea className="h-full">
                {showMistakes && (
                  <div className="p-4">
                    <h3 className="text-sm font-medium text-[#a89f94] mb-3">
                      your mistake bank
                    </h3>
                    {mistakes.length === 0 ? (
                      <div className="text-center py-8">
                        <CheckCircle className="h-8 w-8 text-[#2a2520] mx-auto mb-2" />
                        <p className="text-xs text-[#6b5f52]">no mistakes yet. that&apos;s a good thing.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {mistakes.map((m, i) => (
                          <motion.div
                            key={m.id}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="p-3 rounded-lg bg-[#141210] border border-[#2a2520]"
                          >
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-3.5 w-3.5 text-[#d97706] mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-[#a89f94] font-medium">{m.category}</p>
                                <p className="text-xs text-[#8a7e70] mt-0.5">{m.description}</p>
                                {m.context && (
                                  <p className="text-[10px] text-[#6b5f52] mt-1">💡 {m.context}</p>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {showScreenPreview && (
                  <div className="p-4">
                    <h3 className="text-sm font-medium text-[#a89f94] mb-3">
                      what i see
                    </h3>
                    {session.screen.isSharing ? (
                      <div className="space-y-3">
                        <div className="aspect-video rounded-lg bg-[#141210] border border-[#2a2520] overflow-hidden flex items-center justify-center">
                          {session.screen.currentFrame ? (
                            <img
                              src={`data:image/jpeg;base64,${session.screen.currentFrame}`}
                              alt="Screen preview"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Monitor className="h-8 w-8 text-[#2a2520]" />
                          )}
                        </div>
                        {session.screen.lastAnalysis && (
                          <div className="p-3 rounded-lg bg-[#141210] border border-[#2a2520]">
                            <p className="text-xs text-[#a89f94] font-medium mb-1">last analysis</p>
                            <p className="text-xs text-[#8a7e70]">{session.screen.lastAnalysis}</p>
                          </div>
                        )}
                        <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-400 border-0">
                          <div className="h-1.5 w-1.5 rounded-full bg-green-400 mr-1.5" />
                          sharing active
                        </Badge>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Monitor className="h-8 w-8 text-[#2a2520] mx-auto mb-2" />
                        <p className="text-xs text-[#6b5f52]">not sharing your screen yet</p>
                        <Button
                          onClick={handleScreenShare}
                          size="sm"
                          className="mt-3 bg-[#d97706]/10 text-[#d97706] hover:bg-[#d97706]/20 border-0 rounded-full text-xs cursor-pointer"
                        >
                          <Monitor className="h-3 w-3 mr-1" /> start sharing
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mistake notification toast */}
      <AnimatePresence>
        {mistakes.length > 0 && !showMistakes && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="absolute bottom-20 left-4 z-50"
          >
            <button
              onClick={() => setShowMistakes(true)}
              className="flex items-center gap-2 bg-[#d97706]/15 border border-[#d97706]/20 text-[#d97706] rounded-full px-4 py-2 text-xs hover:bg-[#d97706]/20 transition-colors cursor-pointer"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {mistakes.length} mistake{mistakes.length > 1 ? 's' : ''} caught
              <ChevronRight className="h-3 w-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main Home Page ──────────────────────────────────────────────────────────

export default function Home() {
  const { view } = useAppStore()

  return (
    <AnimatePresence mode="wait">
      {view === 'landing' && <LandingView key="landing" />}
      {view === 'onboarding' && <OnboardingView key="onboarding" />}
      {view === 'session' && <SessionView key="session" />}
    </AnimatePresence>
  )
}
