// components/EventRoller.tsx
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, useAnimation } from 'framer-motion'


interface Event {
  title: string;
  hosts: string;
  date_time: string;
  location: string;
  image_url: string;
  event_url: string;
}

interface EventRollerProps {
  onEventSelect: (eventName: string) => void
}

export default function EventRoller({ onEventSelect }: EventRollerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [containerWidth, setContainerWidth] = useState(0)
  const [events, setEvents] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const controls = useAnimation()
  
  // Fetch events from the backend
  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/events-list');
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        const data = await response.json();
        
        // Extract event titles from the response
        if (data.events && data.events.length > 0) {
          const eventTitles = data.events.map((event: Event) => event.title);
          setEvents(eventTitles);
        } else {
          setEvents(["No events found"]);
        }
      } catch (err) {
        console.error('Failed to fetch events:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setEvents(["Error loading events"]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEvents();
  }, []);
  
  // Duplicate the events to create a seamless loop
  const displayEvents = isLoading 
    ? ["Loading events..."] 
    : [...events, ...events];

  // Update container width on mount and window resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth)
      }
    }
    
    // Initial measurement
    updateWidth()
    
    // Responsive handling
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  // Reset animation when paused state changes or when events change
  useEffect(() => {
    if (!isPaused && displayEvents.length > 1) {
      controls.start({
        x: -2000,
        transition: {
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: 20,
            ease: "linear",
          }
        }
      })
    } else {
      controls.stop()
    }
  }, [isPaused, controls, displayEvents.length])

  // Handle event selection
  const handleEventClick = (event: string) => {
    if (!isDragging) {
      onEventSelect(event)
      
      // Flash effect on selection
      if (containerRef.current) {
        containerRef.current.classList.add('flash-effect')
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.classList.remove('flash-effect')
          }
        }, 300)
      }
    }
  }

  return (
    <div 
      className="relative h-[50%] bg-black border-l-4 border-r-4 overflow-hidden transition-all"
      style={{ borderColor: '#FF3A5E' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => {
        setTimeout(() => setIsPaused(false), 2000)
      }}
      ref={containerRef}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-20" 
        style={{ 
          backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 2px, #333 2px, #333 4px)' 
        }}>
      </div>
      
      {/* Glowing borders */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-white opacity-30"></div>
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-white opacity-30"></div>
      
      {/* Gradient fade on left side */}
      <div className="absolute left-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-r from-black to-transparent"></div>
      
      {/* Ticker content */}
      <div className="h-full flex items-center overflow-hidden relative">
        <motion.div 
          className="flex items-center h-full pl-12"
          animate={controls}
          initial={{ x: 0 }}
          drag="x"
          dragConstraints={containerRef}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={() => {
            setTimeout(() => setIsDragging(false), 100)
            // Allow touch users time to tap after dragging
            setTimeout(() => setIsPaused(false), 2000)
          }}
          dragElastic={0.1}
        >
          {displayEvents.map((event, index) => (
            <motion.div 
              key={`${event}-${index}`}
              className="mx-3 px-4 py-1 cursor-pointer select-none border-l-2 flex items-center"
              style={{ borderColor: '#FF3A5E' }}
              whileHover={{ scale: 1.05, x: 5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleEventClick(event)}
            >
              <span className="font-mono font-medium text-white text-sm md:text-base tracking-tight uppercase">{event}</span>
              <svg className="h-4 w-4 ml-2 text-[#FF3A5E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </motion.div>
          ))}
        </motion.div>
      </div>
      
      {/* Gradient fade on right side */}
      <div className="absolute right-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-l from-black to-transparent"></div>
      
      {/* Label */}
      <div className="absolute top-0 left-0 bg-[#FF3A5E] px-2 py-0.5 text-[10px] font-bold text-white z-20 uppercase tracking-wider clip-corner-bl">
        HOT
      </div>
      
      {/* Mobile hint */}
      <div className="absolute right-0 bottom-0 bg-black bg-opacity-70 px-2 py-0.5 text-[8px] text-white opacity-70 z-20 md:hidden">
        SWIPE ←→
      </div>
    </div>
  )
}