'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Results from '@/components/Results'

export default function ResultsPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-stone-900 to-black p-4">
      <Suspense fallback={<div className="text-white">Loading...</div>}>
        <ResultsWithParams />
      </Suspense>
    </div>
  )
}

// Separate component to use searchParams inside Suspense boundary
function ResultsWithParams() {
  const searchParams = useSearchParams()
  const eventId = searchParams.get('eventId')
  const eventName = searchParams.get('event')
  const imageUrl = searchParams.get('imageUrl')
  const hasError = searchParams.get('error') === 'true'
  
  return (
    <Results />
  )
}