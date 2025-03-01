'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, MapPin, Clock, User, Tag, Info, ExternalLink, Pause, Play, Volume2 } from 'lucide-react'
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
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [audioLoading, setAudioLoading] = useState<boolean>(false)
  const [audioError, setAudioError] = useState<boolean>(false)
  const [audioErrorMessage, setAudioErrorMessage] = useState<string | null>(null)
  
  // Use a ref for the actual HTML audio element
  const audioElementRef = useRef<HTMLAudioElement | null>(null)

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
          
          // Now call the PlayHT endpoint to convert the summary to speech
          if (cleanData.summary) {
            console.log("Calling /api/playht with summary and eventId:", eventId);
            setAudioLoading(true);
            try {
              const playhtResponse = await fetch('/api/playht', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                  summary: cleanData.summary,
                  eventId 
                }),
              });
              
              console.log("PlayHT response status:", playhtResponse.status);
              
              if (!playhtResponse.ok) {
                const playhtErrorText = await playhtResponse.text();
                console.error("PlayHT error response:", playhtErrorText);
                console.warn("Failed to convert summary to speech, but continuing with text summary");
                setAudioError(true);
                setAudioErrorMessage("Failed to generate audio: " + playhtResponse.statusText);
              } else {
                const playhtData = await playhtResponse.json();
                console.log("Received PlayHT data:", playhtData);
                
                if (playhtData.status === "success" && playhtData.audio_url) {
                  // Get the backend URL from environment variables or use default
                  const backendUrl = process.env.NEXT_PUBLIC_NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                  
                  // Set the direct URL to the audio file on the backend
                  const audioFileUrl = `${backendUrl}/audio/${eventId}.wav`;
                  console.log("Setting audio URL to:", audioFileUrl);
                  setAudioUrl(audioFileUrl);
                  setAudioError(false);
                  setAudioErrorMessage(null);
                } else if (playhtData.status === "error") {
                  console.error("PlayHT error:", playhtData.message);
                  setAudioError(true);
                  setAudioErrorMessage(playhtData.message || "Failed to generate audio");
                } else {
                  console.error("Invalid PlayHT response:", playhtData);
                  setAudioError(true);
                  setAudioErrorMessage("Invalid response from audio service");
                }
              }
            } catch (playhtErr) {
              console.error('Error calling PlayHT:', playhtErr);
              // Continue with text summary even if speech conversion fails
              setAudioError(true);
              setAudioErrorMessage("Error generating audio: " + (playhtErr instanceof Error ? playhtErr.message : "Unknown error"));
            } finally {
              setAudioLoading(false);
            }
          }
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

  // Toggle play/pause
  const togglePlayPause = () => {
    if (!audioElementRef.current) return;
    
    if (isPlaying) {
      console.log("Pausing audio");
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      console.log("Playing audio");
      try {
        const playPromise = audioElementRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
            })
            .catch(err => {
              console.error('Failed to play audio:', err);
              setIsPlaying(false);
              setAudioError(true);
              setAudioErrorMessage("Failed to play audio");
            });
        }
      } catch (err) {
        console.error('Error playing audio:', err);
        setIsPlaying(false);
        setAudioError(true);
        setAudioErrorMessage("Error playing audio");
      }
    }
  };

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
    // Stop audio if playing when navigating away
    if (audioElementRef.current) {
      try {
        audioElementRef.current.pause();
      } catch (err) {
        console.error('Error pausing audio:', err);
      }
    }
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

  // Safe audio element creation
  const renderAudioElement = () => {
    if (!audioUrl) return null;
    
    return (
      <div className="mt-4">
        {/* Wrap just the audio element in try-catch */}
        {(() => {
          try {
            return (
              <audio 
                ref={audioElementRef}
                src={audioUrl}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                onError={(e) => {
                  // Just log the error and set state, but don't crash
                  console.error('Audio element error:', {});  // Empty object to avoid serialization issues
                  setIsPlaying(false);
                  setAudioError(true);
                  setAudioErrorMessage("Failed to load audio file");
                }}
                controls
                className="w-full"
              />
            );
          } catch (err) {
            // If there's an error rendering the audio element, just return null
            console.error('Error rendering audio element:', err);
            return null;
          }
        })()}
      </div>
    );
  };

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
                
                {/* Event summary with audio controls */}
                {cleaningContent ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500 mr-3"></div>
                    <p className="text-cyan-400">Generating summary...</p>
                  </div>
                ) : summary ? (
                  <div className="bg-stone-800/70 p-4 rounded-lg mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-semibold text-cyan-400">Event Summary</h3>
                      
                      {/* Audio controls */}
                      {audioLoading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-cyan-500 mr-2"></div>
                          <span className="text-xs text-cyan-400">Generating audio...</span>
                        </div>
                      ) : audioError ? (
                        <div className="text-xs text-amber-400">
                          <span>Audio unavailable</span>
                          {audioErrorMessage && (
                            <span className="block text-xs text-amber-400/70 mt-1">
                              {audioErrorMessage.includes("Rate limit") ? "Rate limit exceeded" : "Error loading audio"}
                            </span>
                          )}
                        </div>
                      ) : audioUrl ? (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={togglePlayPause}
                          className="p-2 bg-cyan-500/20 rounded-full text-cyan-400 hover:bg-cyan-500/30 transition-colors flex items-center gap-2"
                        >
                          {isPlaying ? (
                            <>
                              <Pause size={16} />
                              <span className="text-xs">Pause</span>
                            </>
                          ) : (
                            <>
                              <Play size={16} />
                              <span className="text-xs">Play</span>
                            </>
                          )}
                        </motion.button>
                      ) : null}
                    </div>
                    
                    <div className="text-white">
                      {summary}
                    </div>
                    
                    {/* Audio element - safely rendered */}
                    {renderAudioElement()}
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