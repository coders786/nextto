'use client'

import { useCallback, useRef, useState } from 'react'
import { useAppStore } from '@/lib/store'

export function useScreenCapture() {
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const { updateScreenFrame } = useAppStore()

  const stopCapture = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current = null
    }

    canvasRef.current = null
    setIsCapturing(false)
  }, [])

  const startCapture = useCallback(async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 2, max: 5 },
        },
        audio: false,
      })

      streamRef.current = stream

      // Create video element to capture frames
      const video = document.createElement('video')
      video.srcObject = stream
      video.muted = true
      await video.play()
      videoRef.current = video

      // Create canvas for frame extraction
      const canvas = document.createElement('canvas')
      canvas.width = 1280
      canvas.height = 720
      canvasRef.current = canvas

      setIsCapturing(true)

      // Listen for stream ending (user clicks "Stop sharing")
      stream.getVideoTracks()[0].onended = () => {
        stopCapture()
      }

      return true
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start screen capture'
      setError(message)
      return false
    }
  }, [stopCapture])

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.6)
    const base64 = dataUrl.split(',')[1]

    updateScreenFrame(base64)
    return base64
  }, [updateScreenFrame])

  const startAutoCapture = useCallback((intervalMs: number, onFrame: (base64: string) => void) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    intervalRef.current = setInterval(() => {
      const frame = captureFrame()
      if (frame) {
        onFrame(frame)
      }
    }, intervalMs)
  }, [captureFrame])

  const stopAutoCapture = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  return {
    isCapturing,
    error,
    startCapture,
    stopCapture,
    captureFrame,
    startAutoCapture,
    stopAutoCapture,
    streamRef,
  }
}
