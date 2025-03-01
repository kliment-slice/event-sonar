'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, MapPin, Clock, User, Tag, Info, ExternalLink } from 'lucide-react'
import EventSonar from '@/components/EventSonar'

export default function Results() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const eventName = searchParams.get('event')
  const eventId = searchParams.get('eventId')
  const imageUrl = searchParams.get('imageUrl')
  const hasError = searchParams.get('error') === 'true'
  
  const [eventDetails, setEventDetails] = useState<any>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [cleaningContent, setCleaningContent] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Log search parameters for debugging
  useEffect(() => {
    console.log("Search parameters:", {
      eventName,
      eventId,
      imageUrl,
      hasError
    });
  }, [eventName, eventId, imageUrl, hasError]);

  useEffect(() => {
    // If we have an eventId, fetch the event details
    const fetchEventDetails = async () => {
      if (!eventId) {
        console.error("No eventId provided in URL parameters");
        setError("Missing event ID");
        setLoading(false);
        return;
      }
      
      try {
        console.log(`Fetching event details for ID: ${eventId}`);
        
        // Make sure we're passing the ID parameter correctly
        const url = `/api/event-details?id=${encodeURIComponent(eventId)}`;
        console.log("Fetching from URL:", url);
        
        const response = await fetch(url);
        
        console.log("Response status:", response.status, response.statusText);
        
        if (!response.ok) {
          console.error(`Error response: ${response.status} ${response.statusText}`);
          const errorText = await response.text();
          console.error("Error response body:", errorText);
          throw new Error(`Failed to fetch event details: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("Received event details:", data);
        
        if (data.status === "error") {
          throw new Error(data.message || "Failed to retrieve event details");
        }
        
        setEventDetails(data);
        
        // Now that we have the event details, clean them up
        setCleaningContent(true);
        try {
          console.log("Calling /api/groq-clean with eventId:", eventId);
          const cleanResponse = await fetch('/api/groq-clean', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ eventId }),
          });
          
          console.log("Clean response status:", cleanResponse.status);
          
          if (!cleanResponse.ok) {
            const cleanErrorText = await cleanResponse.text();
            console.error("Clean error response:", cleanErrorText);
            throw new Error(`Failed to clean content: ${cleanResponse.statusText}`);
          }
          
          const cleanData = await cleanResponse.json();
          console.log("Received clean data:", cleanData);
          setSummary(cleanData.summary);
        } catch (cleanErr) {
          console.error('Error cleaning content:', cleanErr);
          // We still have the raw content, so don't set an error
        } finally {
          setCleaningContent(false);
        }
      } catch (err) {
        console.error('Error fetching event details:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    }
    
    fetchEventDetails();
  }, [eventId]);

  // Log image URL for debugging
  useEffect(() => {
    if (imageUrl) {
      console.log("Image URL from search params:", imageUrl);
      // Try to load the image to verify it exists
      const img = new Image();
      img.onload = () => console.log("Image loaded successfully");
      img.onerror = () => console.error("Failed to load image from URL:", imageUrl);
      img.src = imageUrl;
    } else {
      console.warn("No image URL provided in search parameters");
    }
  }, [imageUrl]);

  const handleBack = () => {
    router.push('/')
  }

  if (!eventName && !eventId) {
    // Redirect back if no event information
    useEffect(() => {
      console.log("No event name or ID, redirecting to home");
      router.push('/')
    }, [router])
    
    return null
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
        <div className="flex justify-between items-center mb-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBack}
            className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Back</span>
          </motion.button>
          
          {eventDetails?.event_data?.url && (
            <motion.a
              href={eventDetails.event_data.url}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <span className="text-sm font-medium">View Event</span>
              <ExternalLink size={16} />
            </motion.a>
          )}
        </div>
        
        <div className="mb-4">
          <EventSonar />
        </div>
        
        <div className="flex-grow flex flex-col overflow-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mb-4"></div>
              <p className="text-cyan-400">Loading event details...</p>
            </div>
          ) : error || hasError ? (
            <div className="text-center p-6 bg-red-900/30 rounded-lg">
              <h2 className="text-xl font-bold text-white mb-3">Error Loading Event Details</h2>
              <p className="text-stone-300 mb-4">
                {error || "We couldn't load the details for this event. Please try again later."}
              </p>
              <button 
                onClick={handleBack}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium rounded-lg"
              >
                Return Home
              </button>
            </div>
          ) : eventDetails ? (
            <div className="flex-grow overflow-auto">
              {/* Event image */}
              {imageUrl && (
                <div className="mb-4 rounded-lg overflow-hidden">
                  <img 
                    src={imageUrl} 
                    alt={eventName || "Event"} 
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      console.error("Image failed to load");
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              
              <div className="mb-4 p-4 bg-stone-700/50 rounded-lg">
                <h1 className="text-2xl font-bold text-white mb-2">{eventName}</h1>
                
                {/* Event summary */}
                {cleaningContent ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500 mr-3"></div>
                    <p className="text-cyan-400">Generating summary...</p>
                  </div>
                ) : summary ? (
                  <div className="bg-stone-800/70 p-4 rounded-lg mb-4">
                    <h3 className="text-lg font-semibold text-cyan-400 mb-2">Event Summary</h3>
                    <div className="text-white">
                      {summary}
                    </div>
                  </div>
                ) : null}
                
                {/* Event metadata */}
                <div className="space-y-3 mb-4">
                  {eventDetails.event_data && (
                    <div className="prose prose-invert max-w-none">
                      <div className="bg-stone-800/70 p-4 rounded-lg mb-4 max-h-[50vh] overflow-auto">
                        <h3 className="text-lg font-semibold text-cyan-400 mb-2">Event Details</h3>
                        <pre className="text-sm text-stone-300 whitespace-pre-wrap">
                          {eventDetails.event_data.extracted_content}
                        </pre>
                      </div>
                      
                      {/* Display timestamp */}
                      <div className="text-xs text-stone-400 mt-2">
                        Extracted on: {new Date(eventDetails.event_data.timestamp).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center p-6 bg-stone-700/30 rounded-lg">
              <h2 className="text-xl font-bold text-white mb-3">Event Selected: {eventName}</h2>
              <p className="text-stone-300 mb-4">
                No additional details are available for this event.
              </p>
              <button 
                onClick={handleBack}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium rounded-lg"
              >
                Return Home
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}