'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SearchBar from '@/components/SearchBar'
import EventRoller from '@/components/EventRoller'
import MicButton from '@/components/MicButton'
import EventSonar from '@/components/EventSonar'
import { motion } from 'framer-motion'

export default function VibeCheckCard() {
  const [searchText, setSearchText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchText.trim()) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/api/search-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchText })
      })
      
      if (!response.ok) throw new Error('Search failed')
      
      const data = await response.json()
      router.push(`/results?eventId=${data.eventId}`)
    } catch (error) {
      console.error('Search error:', error)
      setIsLoading(false)
    }
  }

  const handleEventSelect = (eventName: string) => {
    setSearchText(eventName)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
      className="w-full max-w-md sm:max-w-2xl relative z-10 card-container mx-auto h-[85vh] flex items-center justify-center"
    >
      <motion.div
        className="p-4 sm:p-6 bg-stone-800/50 bg-opacity-95 backdrop-blur-lg rounded-xl shadow-[0_25px_60px_rgba(0,0,0,0.3)] overflow-hidden w-full h-full flex flex-col"
        whileHover={{ boxShadow: '0 30px 70px rgba(0,0,0,0.4)' }}
        transition={{ duration: 0.3 }}
      >
        <div 
          className="absolute top-0 left-0 w-full h-2" 
        ></div>
        
        <EventSonar />
        
        <div className="space-y-3 sm:space-y-4 pb-4">
          <p className="text-center font-light tracking-wide text-stone-300 text-base sm:text-lg">
            Discover your perfect <span className="font-bold text-xl sm:text-2xl tracking-tight">SXSW</span> experience
          </p>

          <SearchBar 
            value={searchText} 
            onChange={setSearchText} 
            onSubmit={handleSearch} 
            isLoading={isLoading} 
          />
          
          <MicButton />
        </div>
          
        <div className="relative flex-grow overflow-hidden">
          <EventRoller onEventSelect={handleEventSelect} />
          <div className="absolute inset-x-0 bottom-0 h-3 bg-gradient-to-t from-white to-transparent"></div>
          <div className="absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-white to-transparent"></div>
        </div>
        
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 flex flex-col items-center justify-center"
          >
            <div className="relative h-10 w-10">
              <motion.div
                className="absolute inset-0 rounded-full border-[3px] border-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              ></motion.div>
            </div>
            <p className="mt-2 text-sm font-bold tracking-wide text-gray-800">
              Simulating the vibe...
            </p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}