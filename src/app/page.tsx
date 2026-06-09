'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { useSocket } from '@/hooks/use-socket'
import { useScreenCapture } from '@/hooks/use-screen-capture'
import { useVoiceRecorder } from '@/hooks/use-voice-recorder'
import { PERSONALITIES, TOOLS, SCREEN_CAPTURE, ONBOARDING_STEPS } from '@/lib/constants'
import type { PersonalityType, OnboardingStep, ChatMessage, DailyQuest, SkillProgress } from '@/lib/types'

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
  Clock,
  Swords,
  Maximize2,
  Minimize2,
  Zap,
  Eye,
  Shield,
  Activity,
  Star,
  TrendingUp,
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - new Date(date).getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 10) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  return `${diffHr}h ago`
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// ─── Daily Quest Presets ─────────────────────────────────────────────────────

const QUEST_POOL = [
  { id: 'q1', quest: 'open your tool and find the settings section', tool: 'general' },
  { id: 'q2', quest: 'add one keyword to your campaign', tool: 'google_ads' },
  { id: 'q3', quest: 'create a new frame in your design', tool: 'figma' },
  { id: 'q4', quest: 'add a product to your store', tool: 'shopify' },
  { id: 'q5', quest: 'try a keyboard shortcut you haven\'t used before', tool: 'general' },
  { id: 'q6', quest: 'explore one feature you\'ve never clicked', tool: 'general' },
  { id: 'q7', quest: 'rename something to be more descriptive', tool: 'general' },
  { id: 'q8', quest: 'organize one layer or element', tool: 'figma' },
  { id: 'q9', quest: 'check your campaign\'s performance metrics', tool: 'google_ads' },
  { id: 'q10', quest: 'customize your theme or branding', tool: 'shopify' },
]

// ─── Floating Particles ──────────────────────────────────────────────────────

function FloatingParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 2.5,
      duration: 15 + Math.random() * 25,
      delay: Math.random() * 10,
    })),
    []
  )

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-[#d97706]"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [-20, 20, -20],
            opacity: [0, 0.15, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

// ─── Noise Texture Overlay ───────────────────────────────────────────────────

function NoiseOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-50 opacity-[0.015]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '128px 128px',
      }}
    />
  )
}

// ─── Landing View ────────────────────────────────────────────────────────────

function LandingView() {
  const { setView } = useAppStore()
  const [footerIndex, setFooterIndex] = useState(0)

  const footerTexts = [
    'a teacher. a friend. a presence.',
    'not a tool. a companion.',
    'the teacher you always wished you had.',
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setFooterIndex((prev) => (prev + 1) % footerTexts.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [footerTexts.length])

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

      {/* Floating particles */}
      <FloatingParticles />
      <NoiseOverlay />

      <motion.header
        className="relative z-10 flex items-center justify-center pt-8 sm:pt-10 gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      >
        <span className="text-sm sm:text-base tracking-[0.25em] text-[#a89f94] font-light select-none">
          nextto
        </span>
        {/* Pulsing live indicator */}
        <div className="flex items-center gap-1.5">
          <motion.div
            className="h-2 w-2 rounded-full bg-[#d97706]"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="text-[10px] tracking-wider text-[#d97706]/70 uppercase font-medium">live</span>
        </div>
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
            what if someone was{' '}
            <span
              className="bg-gradient-to-r from-[#d97706] via-[#f59e0b] to-[#d97706] bg-clip-text text-transparent"
              style={{ backgroundSize: '200% 100%' }}
            >
              sitting next to you
            </span>{' '}
            while you learned?
          </span>
        </motion.h1>

        {/* Secondary line */}
        <motion.p
          className="mt-6 text-center text-base sm:text-lg text-[#8a7e70] font-light max-w-xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          a teacher that sees your screen. a friend that knows your name.
        </motion.p>

        <motion.div
          className="mt-10 sm:mt-14"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-block"
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
          {/* Free text */}
          <p className="text-center mt-3 text-[11px] text-[#6b5f52] tracking-wide">
            free • no signup required
          </p>
        </motion.div>
      </motion.main>

      <motion.footer
        className="relative z-10 flex items-center justify-center pb-8 sm:pb-10 pt-4 mt-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 1.6, ease: 'easeOut' }}
      >
        <AnimatePresence mode="wait">
          <motion.p
            key={footerIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.6 }}
            className="text-xs sm:text-sm text-[#5c554d] tracking-wide font-light select-none"
          >
            {footerTexts[footerIndex]}
          </motion.p>
        </AnimatePresence>
      </motion.footer>
    </div>
  )
}

// ─── Screen Sharing Diagram ──────────────────────────────────────────────────

function ScreenShareDiagram() {
  return (
    <div className="flex items-center justify-center gap-3 my-6">
      {/* Your screen */}
      <motion.div
        className="w-16 h-12 rounded-md border border-[#2a2520] bg-[#1a1613] flex items-center justify-center"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Monitor className="h-5 w-5 text-[#8a7e70]" />
      </motion.div>

      {/* Arrow */}
      <motion.div
        className="flex items-center"
        animate={{ x: [0, 4, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="w-6 h-px bg-[#d97706]/40" />
        <ChevronRight className="h-3 w-3 text-[#d97706]/60 -ml-1" />
      </motion.div>

      {/* AI eye */}
      <motion.div
        className="w-12 h-12 rounded-full border border-[#d97706]/30 bg-[#d97706]/10 flex items-center justify-center"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Eye className="h-5 w-5 text-[#d97706]" />
      </motion.div>

      {/* Arrow */}
      <motion.div
        className="flex items-center"
        animate={{ x: [0, -4, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      >
        <ChevronRight className="h-3 w-3 text-[#d97706]/60 -mr-1 rotate-180" />
        <div className="w-6 h-px bg-[#d97706]/40" />
      </motion.div>

      {/* Help back */}
      <motion.div
        className="w-16 h-12 rounded-md border border-[#2a2520] bg-[#1a1613] flex items-center justify-center"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
      >
        <Sparkles className="h-5 w-5 text-[#8a7e70]" />
      </motion.div>
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
  const [showDiscoveredGoal, setShowDiscoveredGoal] = useState(false)
  const [ttsPlayingId, setTtsPlayingId] = useState<string | null>(null)

  const steps: OnboardingStep[] = ['greeting', 'goal', 'personality', 'screen-permission', 'ready']
  const currentStepIndex = steps.indexOf(onboardingStep)

  const stepLabels: Record<OnboardingStep, string> = {
    greeting: 'Welcome',
    goal: 'Your Tool',
    personality: 'Personality',
    'screen-permission': 'Screen Access',
    ready: 'Ready',
  }

  const handleGoalSubmit = async () => {
    if (!inputText.trim()) return
    setIsExtractingGoal(true)

    try {
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
      setShowDiscoveredGoal(true)

      setGoal({
        tool: selectedTool || 'general',
        statedGoal: inputText,
        realGoal: realGoal,
        businessContext: businessContext,
      })

      if (suggestedPersonality && ['chill', 'drill_sergeant', 'patient', 'hype'].includes(suggestedPersonality)) {
        setPersonality(suggestedPersonality as PersonalityType)
      }
    } catch {
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

  const handleHearSample = async (p: typeof PERSONALITIES[0]) => {
    if (ttsPlayingId === p.id) return
    setTtsPlayingId(p.id)
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: p.samplePhrase, voice: p.voiceId }),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audio.onended = () => setTtsPlayingId(null)
        audio.play().catch(() => setTtsPlayingId(null))
      } else {
        setTtsPlayingId(null)
      }
    } catch {
      setTtsPlayingId(null)
    }
  }

  const handleStartSession = async () => {
    setIsConnecting(true)
    if (!isConnected) {
      connect()
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

    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsConnecting(false)
    setOnboardingStep('ready')
  }

  const handleEnterSession = () => {
    setView('session')
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#141210] text-[#f5f0eb] relative">
      <NoiseOverlay />

      {/* Progress bar */}
      <div className="w-full px-6 pt-6 relative z-10">
        <div className="flex items-center gap-2 max-w-2xl mx-auto">
          {steps.map((step, i) => (
            <div key={step} className="flex items-center flex-1">
              <motion.div
                className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
                  currentStepIndex >= i ? 'bg-[#d97706]' : 'bg-[#2a2520]'
                }`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                style={{ transformOrigin: 'left' }}
              />
              {i < 4 && <div className="w-2" />}
            </div>
          ))}
        </div>
        {/* Step label */}
        <AnimatePresence mode="wait">
          <motion.p
            key={onboardingStep}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-center text-[11px] text-[#6b5f52] mt-2 tracking-wide"
          >
            {stepLabels[onboardingStep]}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 relative z-10">
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
              <div className="mt-4">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="inline-block">
                  <Button
                    onClick={() => inputText.trim() && setOnboardingStep('goal')}
                    disabled={!inputText.trim()}
                    className="bg-[#d97706] hover:bg-[#e88a1a] text-[#141210] rounded-full px-8 py-3 text-base font-medium cursor-pointer transition-all duration-200"
                  >
                    next <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
              </div>
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
                  <motion.div
                    key={tool.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <button
                      onClick={() => setSelectedTool(tool.id)}
                      className={`w-full p-4 rounded-xl border transition-all duration-200 text-left cursor-pointer ${
                        selectedTool === tool.id
                          ? 'border-[#d97706] bg-[#d97706]/10 shadow-[0_0_20px_rgba(217,119,6,0.1)]'
                          : 'border-[#2a2520] bg-[#1a1613] hover:border-[#3a3229] hover:bg-[#1e1a17]'
                      }`}
                    >
                      <div className="text-sm font-medium text-[#f5f0eb]">{tool.name}</div>
                      <div className="text-xs text-[#8a7e70] mt-1">{tool.description}</div>
                    </button>
                  </motion.div>
                ))}
              </div>

              {/* Discovered goal message */}
              <AnimatePresence>
                {showDiscoveredGoal && discoveredGoal && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    className="mt-4 p-3 rounded-xl bg-[#d97706]/10 border border-[#d97706]/20"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="h-3.5 w-3.5 text-[#d97706]" />
                      <span className="text-xs font-medium text-[#d97706]">discovered your real goal</span>
                    </div>
                    <p className="text-sm text-[#f5f0eb]">{discoveredGoal}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center justify-between mt-6">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={() => setOnboardingStep('greeting')}
                    variant="ghost"
                    className="text-[#8a7e70] hover:text-[#f5f0eb] hover:bg-transparent cursor-pointer transition-colors duration-200"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> back
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={handleGoalSubmit}
                    disabled={(!selectedTool && !inputText.trim()) || isExtractingGoal}
                    className="bg-[#d97706] hover:bg-[#e88a1a] text-[#141210] rounded-full px-8 py-3 font-medium cursor-pointer transition-all duration-200"
                  >
                    {isExtractingGoal ? 'understanding your goal...' : 'next'} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
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
                  <motion.div
                    key={p.id}
                    whileHover={{ scale: 1.01, x: 4 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <button
                      onClick={() => handlePersonalitySelect(p.id)}
                      className={`w-full p-5 rounded-xl border transition-all duration-200 text-left cursor-pointer group ${
                        personality === p.id
                          ? 'border-[#d97706] bg-[#d97706]/10 shadow-[0_0_20px_rgba(217,119,6,0.1)]'
                          : 'border-[#2a2520] bg-[#1a1613] hover:border-[#3a3229]'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <span className="text-3xl">{p.emoji}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-medium text-[#f5f0eb]">{p.name}</span>
                          </div>
                          <p className="text-sm text-[#8a7e70] mt-1">{p.description}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <p className="text-xs text-[#6b5f52] italic">&ldquo;{p.samplePhrase}&rdquo;</p>
                            <motion.button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleHearSample(p)
                              }}
                              className="flex items-center gap-1 text-[10px] text-[#d97706]/70 hover:text-[#d97706] transition-colors cursor-pointer px-2 py-0.5 rounded-full bg-[#d97706]/5 hover:bg-[#d97706]/10"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              {ttsPlayingId === p.id ? (
                                <><Pause className="h-2.5 w-2.5" /> playing</>
                              ) : (
                                <><Volume2 className="h-2.5 w-2.5" /> hear sample</>
                              )}
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </button>
                  </motion.div>
                ))}
              </div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="inline-block mt-4">
                <Button
                  onClick={() => setOnboardingStep('goal')}
                  variant="ghost"
                  className="text-[#8a7e70] hover:text-[#f5f0eb] hover:bg-transparent cursor-pointer transition-colors duration-200"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> back
                </Button>
              </motion.div>
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

              {/* Screen sharing diagram */}
              <ScreenShareDiagram />

              <div className="flex items-center justify-center gap-4 text-[10px] text-[#6b5f52] mb-4">
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  not saved
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  only while learning
                </div>
              </div>

              <p className="text-[#6b5f52] mb-6 text-sm">
                you can turn it off anytime. i don&apos;t save your screen. i just look at it, help you, and forget it.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={handleStartSession}
                    disabled={isConnecting}
                    className="bg-[#d97706] hover:bg-[#e88a1a] text-[#141210] rounded-full px-8 py-3 text-base font-medium cursor-pointer transition-all duration-200"
                  >
                    {isConnecting ? 'connecting...' : "yes, let's do it"}
                    {!isConnecting && <Sparkles className="ml-2 h-4 w-4" />}
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={handleStartSession}
                    variant="ghost"
                    className="text-[#8a7e70] hover:text-[#f5f0eb] hover:bg-transparent rounded-full cursor-pointer transition-colors duration-200"
                  >
                    skip for now
                  </Button>
                </motion.div>
              </div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="inline-block mt-4">
                <Button
                  onClick={() => setOnboardingStep('personality')}
                  variant="ghost"
                  className="text-[#6b5f52] hover:text-[#f5f0eb] hover:bg-transparent cursor-pointer transition-colors duration-200"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> back
                </Button>
              </motion.div>
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
              <p className="text-[#a89f94] mb-6 text-base">
                i&apos;ll be right here. just start doing your thing and i&apos;ll guide you through it.
              </p>

              {/* Summary */}
              <div className="bg-[#1a1613] border border-[#2a2520] rounded-xl p-4 mb-6 text-left space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Target className="h-4 w-4 text-[#d97706]" />
                  <span className="text-[#8a7e70]">tool:</span>
                  <span className="text-[#f5f0eb]">{TOOLS.find(t => t.id === goal?.tool)?.name || goal?.tool || 'general'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Lightbulb className="h-4 w-4 text-[#d97706]" />
                  <span className="text-[#8a7e70]">goal:</span>
                  <span className="text-[#f5f0eb]">{goal?.realGoal || goal?.statedGoal || 'learn something new'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-lg leading-none">{PERSONALITIES.find(p => p.id === personality)?.emoji}</span>
                  <span className="text-[#8a7e70]">personality:</span>
                  <span className="text-[#f5f0eb]">{PERSONALITIES.find(p => p.id === personality)?.name || 'Chill Buddy'}</span>
                </div>
              </div>

              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="inline-block">
                <Button
                  onClick={handleEnterSession}
                  className="bg-[#d97706] hover:bg-[#e88a1a] text-[#141210] rounded-full px-10 py-4 text-lg font-medium cursor-pointer hover:shadow-[0_0_30px_rgba(217,119,6,0.3)] transition-all duration-300"
                >
                  let&apos;s go <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Skip to landing */}
      <div className="flex justify-center pb-6 relative z-10">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={() => setView('landing')}
            variant="ghost"
            className="text-[#5c554d] hover:text-[#8a7e70] hover:bg-transparent text-xs cursor-pointer transition-colors duration-200"
          >
            ← back to start
          </Button>
        </motion.div>
      </div>
    </div>
  )
}

// ─── Chat Bubble ─────────────────────────────────────────────────────────────

function ChatBubble({
  message,
  onQuickReply,
}: {
  message: ChatMessage
  onQuickReply?: (text: string) => void
}) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  const quickReplies = useMemo(() => {
    if (message.role !== 'assistant' || !message.content) return []
    const lower = message.content.toLowerCase()
    const replies: string[] = []
    if (lower.includes('?') || lower.includes('try') || lower.includes('what do you')) {
      replies.push("I'll try that")
    }
    if (lower.includes('click') || lower.includes('go to') || lower.includes('open')) {
      replies.push('done!')
    }
    if (lower.includes('let me know') || lower.includes('tell me') || lower.includes('how')) {
      replies.push('can you explain more?')
    }
    if (replies.length === 0) {
      replies.push('got it', 'help me with something else')
    }
    return replies.slice(0, 3)
  }, [message.content, message.role])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
    >
      <div className="max-w-[85%] sm:max-w-[75%]">
        <div
          className={`${
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
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-emerald-500/10 text-emerald-400 border-0">
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
        {/* Timestamp and status */}
        <div className={`flex items-center gap-2 mt-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <span className="text-[10px] text-[#5c554d]">{formatRelativeTime(message.timestamp)}</span>
          {isUser && (
            <span className="text-[10px] text-[#5c554d]">✓✓</span>
          )}
        </div>
        {/* Quick replies for AI messages */}
        {!isUser && !isSystem && onQuickReply && quickReplies.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {quickReplies.map((reply, i) => (
              <motion.button
                key={i}
                onClick={() => onQuickReply(reply)}
                className="text-[11px] px-3 py-1 rounded-full bg-[#1a1613] border border-[#2a2520] text-[#a89f94] hover:border-[#d97706]/30 hover:text-[#d97706] transition-all duration-200 cursor-pointer"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                {reply}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Win Moment Indicator ────────────────────────────────────────────────────

function WinMoment({ text, onDone }: { text: string; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 3000)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.9 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="flex items-center gap-2 bg-[#d97706]/15 border border-[#d97706]/30 text-[#d97706] rounded-full px-5 py-2.5 shadow-[0_0_20px_rgba(217,119,6,0.15)]">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6, repeat: 2 }}
        >
          <Star className="h-4 w-4" />
        </motion.div>
        <span className="text-sm font-medium">{text}</span>
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
    skills,
    updateSkill,
    quests,
    setQuests,
    completeQuest,
    setScreenSharing,
    endSession,
    resetSession,
  } = useAppStore()

  const { emitChatMessage, emitScreenFrame, emitScreenStart, emitScreenStop, isConnected, connect, emitSessionEnd } = useSocket()
  const screenCapture = useScreenCapture()

  const [inputText, setInputText] = useState('')
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const voiceRecorder = useVoiceRecorder()
  const [showMistakes, setShowMistakes] = useState(false)
  const [showScreenPreview, setShowScreenPreview] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [sessionSeconds, setSessionSeconds] = useState(0)
  const [isInputExpanded, setIsInputExpanded] = useState(false)
  const [winMoment, setWinMoment] = useState<string | null>(null)

  // Derive win moments from messages
  const winMoments = useMemo(() => {
    const winWords = ['proud', 'great job', 'crushing it', 'nailed it', 'amazing', 'awesome', 'perfect', 'well done', 'fantastic', 'incredible']
    return messages
      .filter(m => m.role === 'assistant')
      .map(m => {
        const lower = m.content.toLowerCase()
        const foundWord = winWords.find(w => lower.includes(w))
        if (!foundWord) return null
        const winText = foundWord === 'crushing it' ? "You're crushing it!" :
                        foundWord === 'nailed it' ? "Nailed it!" :
                        foundWord === 'great job' ? "Great job!" :
                        "Win moment!"
        return { text: winText, time: m.timestamp }
      })
      .filter((w): w is { text: string; time: Date } => w !== null)
  }, [messages])

  // Detect new win moments and trigger popup
  const prevWinCountRef = useRef(0)
  useEffect(() => {
    if (winMoments.length > prevWinCountRef.current) {
      prevWinCountRef.current = winMoments.length
      const latestWin = winMoments[winMoments.length - 1]
      if (latestWin) {
        const timer = setTimeout(() => setWinMoment(latestWin.text), 50)
        return () => clearTimeout(timer)
      }
    }
  }, [winMoments])
  const [sidePanelTab, setSidePanelTab] = useState<'mistakes' | 'screen' | 'progress'>('mistakes')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const sessionStartRef = useRef<Date>(new Date())

  // Session timer
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionSeconds(prev => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Generate daily quest on session start
  useEffect(() => {
    if (quests.length === 0) {
      const toolQuests = QUEST_POOL.filter(q => q.tool === 'general' || q.tool === goal?.tool)
      const selectedQuests = toolQuests.slice(0, 2).map(q => ({
        ...q,
        completed: false,
        questDate: new Date(),
      }))
      if (selectedQuests.length === 0) {
        selectedQuests.push({
          id: 'q-default',
          quest: 'explore one feature you haven\'t tried yet',
          completed: false,
          questDate: new Date(),
        })
      }
      setQuests(selectedQuests)
    }
  }, [quests.length, goal?.tool, setQuests])

  // Skill tracking: process new AI messages for skill progression
  const lastSkillMsgIdRef = useRef<string>('')
  useEffect(() => {
    if (messages.length === 0 || !goal?.tool) return
    const lastMsg = messages[messages.length - 1]
    if (lastMsg.role !== 'assistant' || lastMsg.id === lastSkillMsgIdRef.current) return
    lastSkillMsgIdRef.current = lastMsg.id

    const tool = goal.tool
    const skillMap: Record<string, string[]> = {
      google_ads: ['keywords', 'campaigns', 'ad copy', 'bidding', 'targeting'],
      figma: ['frames', 'components', 'auto layout', 'styling', 'prototyping'],
      shopify: ['products', 'themes', 'payments', 'shipping', 'analytics'],
      general: ['navigation', 'shortcuts', 'settings', 'workflow', 'organization'],
    }
    const skillsList = skillMap[tool] || skillMap.general
    const lower = lastMsg.content.toLowerCase()

    const timers: ReturnType<typeof setTimeout>[] = []
    skillsList.forEach(skill => {
      if (lower.includes(skill)) {
        const existing = skills.find(s => s.tool === tool && s.skill === skill)
        const newLevel = Math.min(1, (existing?.level || 0.1) + 0.05)
        timers.push(setTimeout(() => updateSkill(tool, skill, newLevel), 0))
      }
    })
    return () => timers.forEach(t => clearTimeout(t))
  }, [messages, goal?.tool, skills, updateSkill])

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

  const handleSendMessage = useCallback(async (overrideText?: string) => {
    const textToSend = overrideText || inputText
    if (!textToSend.trim()) return

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role: 'user',
      content: textToSend,
      source: 'text',
      timestamp: new Date(),
    }
    addMessage(userMsg)
    setAiTyping(true)
    if (!overrideText) {
      setInputText('')
      inputRef.current?.focus()
    }

    if (isConnected && session.sessionId) {
      emitChatMessage({
        sessionId: session.sessionId,
        content: textToSend,
        source: 'text',
      })
    } else {
      try {
        const chatHistory = messages.map(m => ({ role: m.role, content: m.content }))
        chatHistory.push({ role: 'user', content: textToSend })

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

        if (data.content && !isMuted) {
          try {
            const ttsRes = await fetch('/api/tts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: data.content, voice: PERSONALITIES.find(p => p.id === personality)?.voiceId || 'tongtong' }),
            })
            if (ttsRes.ok) {
              const audioBlob = await ttsRes.blob()
              const audioUrl = URL.createObjectURL(audioBlob)
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
  }, [inputText, session.sessionId, isConnected, messages, personality, goal, addMessage, setAiTyping, emitChatMessage, isMuted])

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

  const toggleVoice = useCallback(async () => {
    if (voiceRecorder.isRecording) {
      // Stop recording and transcribe
      const audioBase64 = await voiceRecorder.stopRecording()
      setIsVoiceActive(false)
      
      if (audioBase64) {
        // Transcribe the audio
        const transcript = await voiceRecorder.transcribeAudio(audioBase64)
        if (transcript.trim()) {
          // Send the transcribed text as a message
          handleSendMessage(transcript)
        }
      }
    } else {
      // Start recording
      setIsVoiceActive(true)
      await voiceRecorder.startRecording()
    }
  }, [voiceRecorder, handleSendMessage])

  const handleQuickReply = useCallback((text: string) => {
    handleSendMessage(text)
  }, [handleSendMessage])

  const handleQuestComplete = useCallback((questId: string) => {
    completeQuest(questId)
  }, [completeQuest])

  const currentPersonality = PERSONALITIES.find(p => p.id === personality)

  const showSidePanel = showMistakes || showScreenPreview || showProgress

  const handleSidePanelOpen = (tab: 'mistakes' | 'screen' | 'progress') => {
    setSidePanelTab(tab)
    setShowMistakes(tab === 'mistakes')
    setShowScreenPreview(tab === 'screen')
    setShowProgress(tab === 'progress')
  }

  const handleSidePanelClose = () => {
    setShowMistakes(false)
    setShowScreenPreview(false)
    setShowProgress(false)
  }

  return (
    <div className="h-screen flex flex-col bg-[#141210] text-[#f5f0eb] overflow-hidden relative">
      <NoiseOverlay />

      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2a2520] bg-[#141210]/95 backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Logo with live */}
          <div className="flex items-center gap-2">
            <span className="text-sm tracking-[0.2em] text-[#a89f94] font-light">nextto</span>
            <motion.div
              className="h-1.5 w-1.5 rounded-full bg-[#d97706]"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <Separator orientation="vertical" className="h-4 bg-[#2a2520]" />

          {/* Session timer */}
          <div className="flex items-center gap-1.5 text-[11px] text-[#6b5f52]">
            <Clock className="h-3 w-3" />
            <span className="font-mono">{formatDuration(sessionSeconds)}</span>
          </div>
          <Separator orientation="vertical" className="h-4 bg-[#2a2520]" />

          {/* Personality */}
          <div className="flex items-center gap-1.5">
            <span className="text-base">{currentPersonality?.emoji}</span>
            <span className="text-[11px] text-[#8a7e70] hidden sm:inline">{currentPersonality?.name}</span>
          </div>

          {/* Goal */}
          {goal && (
            <>
              <Separator orientation="vertical" className="h-4 bg-[#2a2520]" />
              <Badge variant="secondary" className="text-[10px] h-5 px-2 bg-[#d97706]/10 text-[#d97706] border-0">
                <Target className="h-3 w-3 mr-1" />
                {goal.statedGoal.length > 16 ? goal.statedGoal.slice(0, 16) + '...' : goal.statedGoal}
              </Badge>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Daily quest */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={() => handleSidePanelOpen(showProgress ? 'progress' : 'progress')}
              variant="ghost"
              size="sm"
              className="relative h-8 w-8 p-0 cursor-pointer text-[#6b5f52] hover:text-[#d97706] hover:bg-[#d97706]/10 transition-colors duration-200"
              title="Daily quest"
            >
              <Swords className="h-4 w-4" />
              {quests.some(q => !q.completed) && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#d97706]" />
              )}
            </Button>
          </motion.div>

          {/* Volume toggle */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={() => setIsMuted(prev => !prev)}
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 cursor-pointer transition-colors duration-200 ${
                isMuted ? 'text-red-400/60 hover:text-red-400 hover:bg-red-500/10' : 'text-[#6b5f52] hover:text-[#a89f94] hover:bg-[#1e1a17]'
              }`}
              title={isMuted ? 'Unmute AI voice' : 'Mute AI voice'}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </motion.div>

          {/* Mistakes toggle */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={() => showSidePanel && sidePanelTab === 'mistakes' ? handleSidePanelClose() : handleSidePanelOpen('mistakes')}
              variant="ghost"
              size="sm"
              className={`relative h-8 w-8 p-0 cursor-pointer transition-colors duration-200 ${mistakes.length > 0 ? 'text-[#d97706]' : 'text-[#6b5f52]'}`}
            >
              <AlertTriangle className="h-4 w-4" />
              {mistakes.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#d97706] text-[#141210] text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold">
                  {mistakes.length}
                </span>
              )}
            </Button>
          </motion.div>

          {/* Connection status */}
          <div className="flex items-center gap-1.5">
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500/50'}`} />
            <span className="text-[10px] text-[#6b5f52] hidden sm:inline">{isConnected ? 'connected' : 'offline'}</span>
          </div>

          {/* End session */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={handleEndSession}
              variant="ghost"
              size="sm"
              className="text-[#6b5f52] hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0 cursor-pointer transition-colors duration-200"
            >
              <X className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Custom scrollbar styles for chat */}
          <style jsx global>{`
            .chat-scroll [data-radix-scroll-area-viewport] {
              scrollbar-width: thin;
              scrollbar-color: #2a2520 transparent;
            }
            .chat-scroll [data-radix-scroll-area-viewport]::-webkit-scrollbar {
              width: 4px;
            }
            .chat-scroll [data-radix-scroll-area-viewport]::-webkit-scrollbar-track {
              background: transparent;
            }
            .chat-scroll [data-radix-scroll-area-viewport]::-webkit-scrollbar-thumb {
              background: #2a2520;
              border-radius: 4px;
            }
            .chat-scroll [data-radix-scroll-area-viewport]::-webkit-scrollbar-thumb:hover {
              background: #3a3229;
            }
          `}</style>

          {/* Messages */}
          <ScrollArea className="chat-scroll flex-1 px-4 py-4">
            {messages.length === 0 && (
              <motion.div
                className="flex flex-col items-center justify-center h-full text-center py-20 relative"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {/* Animated gradient background for empty state */}
                <motion.div
                  className="absolute inset-0 rounded-3xl"
                  style={{
                    background: 'radial-gradient(ellipse at center, rgba(217, 119, 6, 0.04) 0%, transparent 70%)',
                  }}
                  animate={{
                    background: [
                      'radial-gradient(ellipse at 30% 50%, rgba(217, 119, 6, 0.04) 0%, transparent 70%)',
                      'radial-gradient(ellipse at 70% 50%, rgba(217, 119, 6, 0.04) 0%, transparent 70%)',
                      'radial-gradient(ellipse at 30% 50%, rgba(217, 119, 6, 0.04) 0%, transparent 70%)',
                    ],
                  }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                  className="text-5xl mb-4"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  {currentPersonality?.emoji}
                </motion.div>
                <p className="text-[#a89f94] text-lg max-w-sm">
                  {currentPersonality?.samplePhrase || "hey. what are you trying to figure out right now?"}
                </p>
                <p className="text-[#6b5f52] text-sm mt-3">type something or share your screen to get started</p>
              </motion.div>
            )}

            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} onQuickReply={handleQuickReply} />
            ))}

            {/* AI typing indicator */}
            {isAiTyping && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start mb-3"
              >
                <div className="bg-[#1e1a17] border border-[#2a2520] rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#8a7e70]">nextto</span>
                    <span className="text-[10px] text-[#6b5f52]">thinking...</span>
                    <div className="flex items-center gap-1">
                      <motion.span
                        className="w-1.5 h-1.5 bg-[#d97706] rounded-full"
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                      />
                      <motion.span
                        className="w-1.5 h-1.5 bg-[#d97706] rounded-full"
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
                      />
                      <motion.span
                        className="w-1.5 h-1.5 bg-[#d97706] rounded-full"
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={chatEndRef} />
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t border-[#2a2520] px-4 py-3 bg-[#141210]/95 backdrop-blur-sm">
            <div className="flex items-center gap-2 max-w-3xl mx-auto">
              {/* Daily quest quick access */}
              <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>
                <Button
                  onClick={() => handleSidePanelOpen('progress')}
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0 rounded-full cursor-pointer text-[#6b5f52] hover:text-[#d97706] hover:bg-[#d97706]/10 transition-colors duration-200"
                  title="Daily quest"
                >
                  <Swords className="h-4 w-4" />
                </Button>
              </motion.div>

              {/* Screen share button */}
              <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>
                <Button
                  onClick={handleScreenShare}
                  variant="ghost"
                  size="sm"
                  className={`h-10 w-10 p-0 rounded-full cursor-pointer transition-colors duration-200 ${
                    screenCapture.isCapturing
                      ? 'bg-[#d97706]/20 text-[#d97706] hover:bg-[#d97706]/30'
                      : 'text-[#6b5f52] hover:text-[#a89f94] hover:bg-[#1e1a17]'
                  }`}
                  title={screenCapture.isCapturing ? 'Stop sharing' : 'Share screen'}
                >
                  {screenCapture.isCapturing ? <MonitorOff className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                </Button>
              </motion.div>

              {/* Voice button with recording animation */}
              <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} className="relative">
                <Button
                  onClick={toggleVoice}
                  variant="ghost"
                  size="sm"
                  className={`h-10 w-10 p-0 rounded-full cursor-pointer transition-colors duration-200 ${
                    voiceRecorder.isRecording
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      : 'text-[#6b5f52] hover:text-[#a89f94] hover:bg-[#1e1a17]'
                  }`}
                >
                  {voiceRecorder.isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                {/* Recording pulse animation */}
                {voiceRecorder.isRecording && (
                  <>
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-red-400/40"
                      animate={{ 
                        scale: [1, 1.2 + (voiceRecorder.audioLevel / 100) * 0.3, 1], 
                        opacity: [0.6, 0, 0.6] 
                      }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    />
                    {/* Audio level ring */}
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 40 40">
                      <circle
                        cx="20" cy="20" r="18"
                        fill="none"
                        stroke="rgba(239, 68, 68, 0.3)"
                        strokeWidth="2"
                        strokeDasharray={`${(voiceRecorder.audioLevel / 100) * 113} 113`}
                        strokeLinecap="round"
                      />
                    </svg>
                    {/* Recording duration */}
                    {voiceRecorder.recordingDuration > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] rounded-full px-1 min-w-[16px] text-center">
                        {voiceRecorder.recordingDuration}s
                      </span>
                    )}
                  </>
                )}
              </motion.div>

              {/* Text input */}
              <div className="flex-1 relative">
                {isInputExpanded ? (
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                      placeholder="type it..."
                      className="w-full bg-[#1e1a17] border border-[#2a2520] text-[#f5f0eb] placeholder:text-[#6b5f52] rounded-2xl py-3 px-5 pr-20 focus:border-[#d97706] focus:ring-[#d97706]/20 resize-none min-h-[80px] max-h-[160px] text-sm"
                      disabled={isAiTyping}
                      rows={3}
                    />
                    <div className="absolute right-2 bottom-2 flex items-center gap-1">
                      <span className="text-[10px] text-[#5c554d] mr-1">{inputText.length}</span>
                      <Button
                        onClick={() => setIsInputExpanded(false)}
                        size="sm"
                        className="h-6 w-6 p-0 bg-transparent hover:bg-[#2a2520] text-[#6b5f52] rounded-md cursor-pointer"
                      >
                        <Minimize2 className="h-3 w-3" />
                      </Button>
                      <Button
                        onClick={handleSendMessage}
                        disabled={!inputText.trim() || isAiTyping}
                        size="sm"
                        className="h-7 w-7 p-0 bg-[#d97706] hover:bg-[#e88a1a] text-[#141210] rounded-full cursor-pointer"
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      ref={inputRef}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      placeholder="type it..."
                      className="bg-[#1e1a17] border-[#2a2520] text-[#f5f0eb] placeholder:text-[#6b5f52] rounded-full py-2 px-5 pr-20 focus:border-[#d97706] focus:ring-[#d97706]/20 h-10"
                      disabled={isAiTyping}
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {inputText.length > 0 && (
                        <span className="text-[10px] text-[#5c554d]">{inputText.length}</span>
                      )}
                      <Button
                        onClick={() => setIsInputExpanded(true)}
                        size="sm"
                        className="h-7 w-7 p-0 bg-transparent hover:bg-[#2a2520] text-[#6b5f52] rounded-md cursor-pointer transition-colors duration-200"
                      >
                        <Maximize2 className="h-3 w-3" />
                      </Button>
                      <Button
                        onClick={handleSendMessage}
                        disabled={!inputText.trim() || isAiTyping}
                        size="sm"
                        className="h-8 w-8 p-0 bg-[#d97706] hover:bg-[#e88a1a] text-[#141210] rounded-full cursor-pointer transition-colors duration-200"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <AnimatePresence>
          {showSidePanel && (
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
                  onClick={() => { setSidePanelTab('mistakes'); setShowMistakes(true); setShowScreenPreview(false); setShowProgress(false); }}
                  className={`flex-1 py-3 text-[10px] font-medium transition-colors cursor-pointer ${
                    sidePanelTab === 'mistakes' ? 'text-[#d97706] border-b-2 border-[#d97706]' : 'text-[#6b5f52] hover:text-[#8a7e70]'
                  }`}
                >
                  <AlertTriangle className="h-3.5 w-3.5 mx-auto mb-1" />
                  mistakes
                </button>
                <button
                  onClick={() => { setSidePanelTab('screen'); setShowMistakes(false); setShowScreenPreview(true); setShowProgress(false); }}
                  className={`flex-1 py-3 text-[10px] font-medium transition-colors cursor-pointer ${
                    sidePanelTab === 'screen' ? 'text-[#d97706] border-b-2 border-[#d97706]' : 'text-[#6b5f52] hover:text-[#8a7e70]'
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5 mx-auto mb-1" />
                  screen
                </button>
                <button
                  onClick={() => { setSidePanelTab('progress'); setShowMistakes(false); setShowScreenPreview(false); setShowProgress(true); }}
                  className={`flex-1 py-3 text-[10px] font-medium transition-colors cursor-pointer ${
                    sidePanelTab === 'progress' ? 'text-[#d97706] border-b-2 border-[#d97706]' : 'text-[#6b5f52] hover:text-[#8a7e70]'
                  }`}
                >
                  <TrendingUp className="h-3.5 w-3.5 mx-auto mb-1" />
                  progress
                </button>
              </div>

              <ScrollArea className="h-[calc(100vh-120px)]">
                {/* Mistakes Tab */}
                {sidePanelTab === 'mistakes' && (
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
                      <div className="space-y-2 max-h-96 overflow-y-auto">
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
                                  <p className="text-[10px] text-[#6b5f52] mt-1">&#128161; {m.context}</p>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Screen Tab */}
                {sidePanelTab === 'screen' && (
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
                          <motion.div
                            className="h-1.5 w-1.5 rounded-full bg-green-400 mr-1.5"
                            animate={{ opacity: [1, 0.4, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                          sharing active
                        </Badge>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Monitor className="h-8 w-8 text-[#2a2520] mx-auto mb-2" />
                        <p className="text-xs text-[#6b5f52]">not sharing your screen yet</p>
                        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="inline-block mt-3">
                          <Button
                            onClick={handleScreenShare}
                            size="sm"
                            className="bg-[#d97706]/10 text-[#d97706] hover:bg-[#d97706]/20 border-0 rounded-full text-xs cursor-pointer transition-colors duration-200"
                          >
                            <Monitor className="h-3 w-3 mr-1" /> start sharing
                          </Button>
                        </motion.div>
                      </div>
                    )}
                  </div>
                )}

                {/* Progress Tab */}
                {sidePanelTab === 'progress' && (
                  <div className="p-4 space-y-5">
                    {/* Daily Quest */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Swords className="h-4 w-4 text-[#d97706]" />
                        <h3 className="text-sm font-medium text-[#a89f94]">daily quest</h3>
                      </div>
                      {quests.length === 0 ? (
                        <p className="text-xs text-[#6b5f52]">no quests today</p>
                      ) : (
                        <div className="space-y-2">
                          {quests.map((q) => (
                            <motion.div
                              key={q.id}
                              className={`p-3 rounded-lg border transition-all duration-300 ${
                                q.completed
                                  ? 'bg-green-500/5 border-green-500/20'
                                  : 'bg-[#141210] border-[#2a2520]'
                              }`}
                              layout
                            >
                              <div className="flex items-start gap-2">
                                <motion.div whileTap={{ scale: 0.9 }}>
                                  <button
                                    onClick={() => !q.completed && handleQuestComplete(q.id)}
                                    className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all duration-200 ${
                                      q.completed
                                        ? 'border-green-400 bg-green-400'
                                        : 'border-[#3a3229] hover:border-[#d97706]'
                                    }`}
                                  >
                                    {q.completed && <CheckCircle className="h-2.5 w-2.5 text-[#141210]" />}
                                  </button>
                                </motion.div>
                                <div>
                                  <p className={`text-xs transition-colors duration-200 ${q.completed ? 'text-green-400 line-through' : 'text-[#a89f94]'}`}>
                                    {q.quest}
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>

                    <Separator className="bg-[#2a2520]" />

                    {/* Skill Progress */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Activity className="h-4 w-4 text-[#d97706]" />
                        <h3 className="text-sm font-medium text-[#a89f94]">skill levels</h3>
                      </div>
                      {skills.length === 0 ? (
                        <p className="text-xs text-[#6b5f52]">skills will appear as you learn</p>
                      ) : (
                        <div className="space-y-2.5 max-h-40 overflow-y-auto">
                          {skills.map((s) => (
                            <div key={`${s.tool}-${s.skill}`} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] text-[#8a7e70]">{s.skill}</span>
                                <span className="text-[10px] text-[#6b5f52]">{Math.round(s.level * 100)}%</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-[#2a2520] overflow-hidden">
                                <motion.div
                                  className="h-full rounded-full bg-[#d97706]"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${s.level * 100}%` }}
                                  transition={{ duration: 0.8, ease: 'easeOut' }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <Separator className="bg-[#2a2520]" />

                    {/* Win Moments */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Trophy className="h-4 w-4 text-[#d97706]" />
                        <h3 className="text-sm font-medium text-[#a89f94]">win moments</h3>
                      </div>
                      {winMoments.length === 0 ? (
                        <p className="text-xs text-[#6b5f52]">keep going — your wins will show here</p>
                      ) : (
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {winMoments.map((w, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="flex items-center gap-2 p-2 rounded-lg bg-[#d97706]/5 border border-[#d97706]/10"
                            >
                              <Star className="h-3 w-3 text-[#d97706]" />
                              <span className="text-[11px] text-[#a89f94]">{w.text}</span>
                              <span className="text-[9px] text-[#6b5f52] ml-auto">{formatRelativeTime(w.time)}</span>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mistake notification toast */}
      <AnimatePresence>
        {mistakes.length > 0 && !showSidePanel && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="absolute bottom-20 left-4 z-40"
          >
            <motion.button
              onClick={() => handleSidePanelOpen('mistakes')}
              className="flex items-center gap-2 bg-[#d97706]/15 border border-[#d97706]/20 text-[#d97706] rounded-full px-4 py-2 text-xs hover:bg-[#d97706]/20 transition-colors cursor-pointer"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {mistakes.length} mistake{mistakes.length > 1 ? 's' : ''} caught
              <ChevronRight className="h-3 w-3" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Win moment indicator */}
      <AnimatePresence>
        {winMoment && (
          <WinMoment text={winMoment} onDone={() => setWinMoment(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main Home Component ─────────────────────────────────────────────────────

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
