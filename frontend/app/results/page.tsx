'use client'

import { useSearchParams } from 'next/navigation'
import Results from '@/components/Results'

export default function ResultsPage() {
  const searchParams = useSearchParams()
  const eventId = searchParams.get('eventId') || ''
  
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-stone-900 to-black p-4">
      <Results eventId={eventId} />
    </div>
  )
}