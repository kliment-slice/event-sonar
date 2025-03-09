'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Mic } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { useRouter } from 'next/navigation'

// Remove the onClick prop from the interface
interface MicButtonProps {}

export default function MicButton({}: MicButtonProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const MAX_RECORDING_SECONDS = 10 // Maximum recording duration in seconds
  const router = useRouter()
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Reset state
      audioChunksRef.current = []
      setRecordingDuration(0)
      
      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      
      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      // Start recording
      mediaRecorder.start()
      setIsRecording(true)
      
      // Start timer with auto-stop after MAX_RECORDING_SECONDS
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1
          if (newDuration >= MAX_RECORDING_SECONDS) {
            // Auto-stop recording when reaching max duration
            stopRecording()
          }
          return newDuration
        })
      }, 1000)
      
    } catch (error) {
      console.error('Error accessing microphone:', error)
      alert('Could not access microphone. Please check permissions.')
    }
  }
  
  const stopRecording = async () => {
    // Prevent multiple calls to stopRecording for the same session
    if (!isRecording || isProcessing) {
      return;
    }
    
    // Set isRecording to false immediately to prevent multiple calls
    setIsRecording(false);
    
    // Clear the timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    
    // Stop the media recorder if it's active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      
      // Wait for the data to be available
      await new Promise<void>((resolve) => {
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.onstop = () => resolve()
        } else {
          resolve()
        }
      })
      
      // Stop all tracks in the stream
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
    }
  
    // Process the recording
    if (audioChunksRef.current.length > 0) {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      // Generate a single hash ID for this recording session
      const hashId = uuidv4()
      
      try {
        setIsProcessing(true)
        
        // Create FormData and append the audio file
        const formData = new FormData()
        formData.append('audio_file', audioBlob, `${hashId}.webm`)
        formData.append('hash_id', hashId)
        
        try {
          // Step 1: Upload the audio file to the backend
          const uploadResponse = await fetch('/api/voice-input', {
            method: 'POST',
            body: formData,
          })
          
          if (!uploadResponse.ok) {
            console.error('Error uploading audio:', await uploadResponse.text())
            throw new Error(`Upload returned status ${uploadResponse.status}`)
          }
          
          console.log('Voice input uploaded successfully, hash ID:', hashId)
          
          // Step 2: Transcribe the audio using Groq Whisper
          // Use the SAME hash_id as before
          const whisperResponse = await fetch('/api/groq-whisper', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hash_id: hashId })
          })
          
          if (!whisperResponse.ok) {
            console.error('Error from whisper endpoint:', await whisperResponse.text())
            throw new Error(`Whisper endpoint returned status ${whisperResponse.status}`)
          }
          
          // Get the transcription result
          const whisperData = await whisperResponse.json()
          
          if (!whisperData.text) {
            throw new Error('No transcription text received')
          }
          
          console.log('Transcription received:', whisperData.text)
          
          // Navigate directly to the results page with the transcription
          router.push(`/results?transcription=${encodeURIComponent(whisperData.text)}`)
          
        } catch (fetchError) {
          console.error('Error processing voice input:', fetchError)
          setIsProcessing(false)
        }
      } catch (error) {
        console.error('Error processing voice input:', error)
        setIsProcessing(false)
      }
    }
    
    // Reset state
    setRecordingDuration(0)
  }
  
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent default to avoid double events
    if (!isRecording && !isProcessing) {
      startRecording();
    }
  }
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent default to avoid double events
    if (isRecording) {
      stopRecording();
    }
  }
  
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default to avoid double events
    if (!isRecording && !isProcessing) {
      startRecording();
    }
  }
  
  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default to avoid double events
    if (isRecording) {
      stopRecording();
    }
  }
  
  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col items-center pt-1 sm:pt-2">
      <motion.div 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={isRecording ? handleMouseUp : undefined}
        className="cursor-pointer"
      >
        <div className={`rounded-full p-2 ${
          isRecording 
            ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.7)]' 
            : isProcessing
              ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.7)]'
              : 'bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 shadow-lg hover:shadow-xl'
        } transition-all duration-300`}>
          <Mic 
            size={48} 
            className={`${isRecording ? 'text-white animate-pulse' : 'text-white'}`} 
          />
        </div>
      </motion.div>
      
      {isRecording ? (
        <div className="mt-2 flex flex-col items-center">
          <div className="text-red-500 font-medium text-sm animate-pulse">
            Recording... {formatTime(recordingDuration)} / {formatTime(MAX_RECORDING_SECONDS)}
          </div>
          <p className="text-xs text-center font-light text-stone-400 mt-1">
            Release to send or wait for auto-send
          </p>
        </div>
      ) : isProcessing ? (
        <div className="mt-2 flex flex-col items-center">
          <div className="text-amber-500 font-medium text-sm animate-pulse">
            Processing voice...
          </div>
        </div>
      ) : (
        <p className="text-xs text-center font-light tracking-tight text-stone-400 mt-2 mb-1 sm:mb-2">
          Tap and Hold for voice search (max 10s)
        </p>
      )}
    </div>
  )
}