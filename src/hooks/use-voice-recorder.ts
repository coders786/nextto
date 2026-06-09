'use client'

import { useState, useRef, useCallback } from 'react'

/**
 * Hook for real-time voice recording using MediaRecorder API.
 * Records audio from the user's microphone, converts to base64,
 * and provides the audio data for ASR transcription.
 */
export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [recordingDuration, setRecordingDuration] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  const stopAudioLevelMonitoring = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    setAudioLevel(0)
  }, [])

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    mediaRecorderRef.current = null
    chunksRef.current = []
    setIsRecording(false)
    stopAudioLevelMonitoring()
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }
    setRecordingDuration(0)
  }, [stopAudioLevelMonitoring])

  /**
   * Stop recording and return the audio as base64
   */
  const stopRecording = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || !streamRef.current) {
        cleanup()
        resolve(null)
        return
      }

      const mediaRecorder = mediaRecorderRef.current

      mediaRecorder.onstop = () => {
        // Create blob from collected chunks
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType })
        
        // Convert to base64
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64 = reader.result as string
          // Remove data URL prefix
          const base64Data = base64.split(',')[1] || ''
          cleanup()
          resolve(base64Data)
        }
        reader.onerror = () => {
          setError('Failed to process audio')
          cleanup()
          resolve(null)
        }
        reader.readAsDataURL(blob)
      }

      mediaRecorder.stop()
    })
  }, [cleanup])

  /**
   * Cancel recording without returning audio
   */
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    cleanup()
  }, [cleanup])

  // Monitor audio levels for visual feedback
  const startAudioLevelMonitoring = useCallback(() => {
    if (!analyserRef.current) return

    const analyser = analyserRef.current
    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    const updateLevel = () => {
      analyser.getByteFrequencyData(dataArray)
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i]
      }
      const average = sum / dataArray.length
      const level = Math.min(100, Math.round((average / 128) * 100))
      setAudioLevel(level)
      animationFrameRef.current = requestAnimationFrame(updateLevel)
    }

    updateLevel()
  }, [])

  /**
   * Start recording audio from the microphone
   */
  const startRecording = useCallback(async () => {
    try {
      setError(null)
      chunksRef.current = []

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      streamRef.current = stream

      // Set up audio analyser for level monitoring
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/wav',
      })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(100) // Collect data every 100ms
      setIsRecording(true)
      startTimeRef.current = Date.now()

      // Start duration tracking
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)

      // Start audio level monitoring
      startAudioLevelMonitoring()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to access microphone'
      setError(message)
      setIsRecording(false)
    }
  }, [startAudioLevelMonitoring])

  /**
   * Transcribe recorded audio using the ASR API
   */
  const transcribeAudio = useCallback(async (audioBase64: string): Promise<string> => {
    try {
      const res = await fetch('/api/asr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: audioBase64, format: 'webm' }),
      })
      const data = await res.json()
      return data.transcript || ''
    } catch {
      setError('Failed to transcribe audio')
      return ''
    }
  }, [])

  return {
    isRecording,
    audioLevel,
    error,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
    transcribeAudio,
  }
}
