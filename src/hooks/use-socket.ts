'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAppStore } from '@/lib/store'
import { COMPANION_SERVICE_PORT } from '@/lib/constants'
import type { PersonalityType, ChatMessage as AppChatMessage } from '@/lib/types'

let socketInstance: Socket | null = null

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  const {
    startSession,
    addMessage,
    setAiTyping,
    updateScreenAnalysis,
    addMistake,
    setListening,
    setSpeaking,
    setTranscript,
  } = useAppStore()

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return

    const socket = io('/', {
      path: '/socket.io/',
      query: { XTransformPort: COMPANION_SERVICE_PORT },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id)
      setIsConnected(true)
    })

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected')
      setIsConnected(false)
    })

    socket.on('session:started', (data: { sessionId: string }) => {
      console.log('[Socket] Session started:', data.sessionId)
      startSession(data.sessionId)
    })

    socket.on('chat:response', (data: { content: string; source: string; audioUrl?: string }) => {
      const msg: AppChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role: 'assistant',
        content: data.content,
        source: (data.source as 'text' | 'voice' | 'screen') || 'text',
        timestamp: new Date(),
        audioUrl: data.audioUrl,
      }
      addMessage(msg)
      setAiTyping(false)
    })

    socket.on('chat:typing', (data: { isTyping: boolean }) => {
      setAiTyping(data.isTyping)
    })

    socket.on('screen:analysis', (data: { analysis: string; suggestions: string[] }) => {
      updateScreenAnalysis(data.analysis)
    })

    socket.on('screen:warning', (data: { message: string }) => {
      console.log('[Socket] Screen warning:', data.message)
    })

    socket.on('mistake:detected', (data: { category: string; description: string; suggestion: string }) => {
      addMistake({
        id: `mistake-${Date.now()}`,
        category: data.category,
        description: data.description,
        context: data.suggestion,
        frequency: 1,
        resolved: false,
        createdAt: new Date(),
      })
    })

    socket.on('voice:transcript', (data: { text: string }) => {
      setTranscript(data.text || undefined)
    })

    socket.on('voice:response', (data: { audioUrl?: string; text: string }) => {
      setSpeaking(false)
      if (data.audioUrl) {
        // Play the audio
        const audio = new Audio(data.audioUrl)
        audio.play().catch(console.error)
      }
    })

    socket.on('error', (data: { message: string }) => {
      console.error('[Socket] Error:', data.message)
      setAiTyping(false)
    })

    socketRef.current = socket
    socketInstance = socket
  }, [startSession, addMessage, setAiTyping, updateScreenAnalysis, addMistake, setListening, setSpeaking, setTranscript])

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
      socketInstance = null
      setIsConnected(false)
    }
  }, [])

  const emitSessionStart = useCallback((data: {
    userId: string
    tool: string
    goal: string
    businessContext: string
    personality: PersonalityType
  }) => {
    socketRef.current?.emit('session:start', data)
  }, [])

  const emitChatMessage = useCallback((data: {
    sessionId: string
    content: string
    source: 'text' | 'voice'
  }) => {
    socketRef.current?.emit('chat:message', data)
  }, [])

  const emitScreenStart = useCallback((sessionId: string) => {
    socketRef.current?.emit('screen:start', { sessionId })
  }, [])

  const emitScreenStop = useCallback((sessionId: string) => {
    socketRef.current?.emit('screen:stop', { sessionId })
  }, [])

  const emitScreenFrame = useCallback((data: { sessionId: string; frame: string }) => {
    socketRef.current?.emit('screen:frame', data)
  }, [])

  const emitVoiceChunk = useCallback((data: {
    sessionId: string
    chunk: string
    format: 'wav' | 'mp3'
  }) => {
    socketRef.current?.emit('voice:chunk', data)
  }, [])

  const emitSessionEnd = useCallback((sessionId: string) => {
    socketRef.current?.emit('session:end', { sessionId })
  }, [])

  return {
    isConnected,
    connect,
    disconnect,
    emitSessionStart,
    emitChatMessage,
    emitScreenStart,
    emitScreenStop,
    emitScreenFrame,
    emitVoiceChunk,
    emitSessionEnd,
    socket: socketRef,
  }
}
