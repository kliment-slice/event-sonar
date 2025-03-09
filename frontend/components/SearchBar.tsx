import React, { useState, useEffect, useRef } from 'react'
import { Search } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  isLoading: boolean
}

interface Event {
  title: string;
  hosts: string;
  date_time: string;
  location: string;
  image_url: string;
  event_url: string;
}

export default function SearchBar({ value, onChange, onSubmit, isLoading }: SearchBarProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch events from the backend
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events-list');
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.events && data.events.length > 0) {
          setEvents(data.events);
        }
      } catch (err) {
        console.error('Failed to fetch events:', err);
      }
    };
    
    fetchEvents();
  }, []);

  // Filter events based on search input
  useEffect(() => {
    if (!value.trim()) {
      setFilteredEvents([]);
      return;
    }

    const searchTerm = value.toLowerCase();
    const filtered = events.filter(event => 
      event.title.toLowerCase().includes(searchTerm) || 
      (event.hosts && event.hosts.toLowerCase().includes(searchTerm)) ||
      (event.location && event.location.toLowerCase().includes(searchTerm))
    );
    
    setFilteredEvents(filtered);
  }, [value, events]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current && 
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (event: Event) => {
    onChange(event.title);
    setShowSuggestions(false);
  };

  return (
    <form onSubmit={onSubmit} className="mb-6 relative">
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
          <Search size={18} />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => value && setShowSuggestions(true)}
          placeholder="Search events..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button 
          type="submit" 
          disabled={isLoading}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-500"
        >
          {isLoading ? '...' : ''}
        </button>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && filteredEvents.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="absolute z-10 mt-1 w-full bg-stone-700 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          <ul className="py-1">
            {filteredEvents.map((event, index) => (
              <li 
                key={index}
                onClick={() => handleSuggestionClick(event)}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
              >
                <div className="font-medium">{event.title}</div>
                {event.hosts && (
                  <div className="text-xs text-gray-500">By: {event.hosts}</div>
                )}
                {event.location && (
                  <div className="text-xs text-gray-500">At: {event.location}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  )
}