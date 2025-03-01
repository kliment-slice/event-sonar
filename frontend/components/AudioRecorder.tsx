'use client'

import React, { useState, useRef } from 'react'

interface AudioRecorderProps {
  onTranscriptionComplete: (text: string) => void
}

export default function AudioRecorder({ onTranscriptionComplete }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const startRecording = async () => {
    audioChunksRef.current = []
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      
      const mediaRecorder = new MediaRecorder(stream)
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        processAudioBlob(audioBlob)
      }
      
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Unable to access microphone. Please check your browser permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      // Stop all audio tracks
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      }
    }
  }

  const processAudioBlob = async (blob: Blob) => {
    setIsProcessing(true)
    
    const formData = new FormData()
    formData.append('audio', blob, 'recording.wav')
    
    try {
      // Send audio to backend for transcription
      const response = await fetch('/api/toolhouse', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) throw new Error('Transcription failed')
      
      const data = await response.json()
      onTranscriptionComplete(data.text)
    } catch (error) {
      console.error('Audio processing error:', error)
      setIsProcessing(false)
      alert('Failed to process audio. Please try again.')
    }
  }

  return (
    <div className={`p-4 rounded-full ${isRecording ? 'bg-red-100 pulse-animation' : 'bg-blue-100'}`}>
      {isProcessing ? (
        <div className="h-12 w-12 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className="h-12 w-12 rounded-full flex items-center justify-center focus:outline-none"
          aria-label={isRecording ? "Stop recording" : "Start recording"}
        >
          {isRecording ? (
            <div className="h-4 w-4 bg-red-500"></div> // Stop square
          ) : (
            <div className="h-6 w-6 bg-blue-500 rounded-full flex items-center justify-center">
              <div className="h-3 w-3 bg-white rounded-full"></div> // Mic icon
            </div>
          )}
        </button>
      )}
      
      <style jsx>{`
        .pulse-animation {
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.4);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(255, 0, 0, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(255, 0, 0, 0);
          }
        }
      `}</style>
    </div>
  )
}