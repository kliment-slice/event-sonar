from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from toolhouse import Toolhouse
from groq import Groq
import os
from typing import Optional
import shutil
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import pathlib
import json
import uuid

load_dotenv()

URL_TO_SCRAPE = "https://lu.ma/sxsw"
app = FastAPI()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = "llama-3.3-70b-specdec"
WHISPER = "whisper-large-v3-turbo"
th = Toolhouse(api_key=os.getenv("TOOLHOUSE_API_KEY"))
# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create directory for events
EVENTS_DIR = pathlib.Path("../events")
EVENTS_DIR.mkdir(exist_ok=True, parents=True)
EVENTS_FILE = EVENTS_DIR / "events.json"
UPLOAD_DIR = pathlib.Path("../voice-input")
UPLOAD_DIR.mkdir(exist_ok=True, parents=True)
# Create directory for event details
EVENT_DETAILS_DIR = pathlib.Path("../events/event-details")
EVENT_DETAILS_DIR.mkdir(exist_ok=True, parents=True)
AUDIO_DIR = pathlib.Path("../audio")
AUDIO_DIR.mkdir(exist_ok=True, parents=True)

# Function to save events to the common events.json file
def save_events_to_common_file(events):
    with open(EVENTS_FILE, "w", encoding="utf-8") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "url": URL_TO_SCRAPE,
            "events": events
        }, f, ensure_ascii=False, indent=2)
    
    return EVENTS_FILE

# Function to load events from the common events.json file
def load_events_from_common_file():
    if not EVENTS_FILE.exists():
        return None
    
    try:
        with open(EVENTS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading events file {EVENTS_FILE}: {e}")
        return None

#API to Scrape events from URL_TO_SCRAPE using BeautifulSoup and save to common events.json file
@app.get("/scrape")
async def scrape_events():
    """Scrape events from URL_TO_SCRAPE using BeautifulSoup and save to common events.json file"""
    try:
        all_events = []
        
        # Scrape each day from March 1 to March 16
        for day in range(1, 16):
            # Format the date for the URL
            date_str = f"2024-03-{day:02d}"
            day_url = f"{URL_TO_SCRAPE}?date={date_str}"
            
            print(f"Scraping events for {date_str} from {day_url}")
            
            # Send a GET request to the URL for this specific day
            response = requests.get(day_url)
            response.raise_for_status()  # Raise an exception for HTTP errors
            
            # Parse the HTML content
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find all event containers
            event_containers = soup.select('div.jsx-2926199791.card-wrapper')
            
            # Also find all date sections to associate events with their dates
            date_sections = soup.select('div.jsx-129232405.timeline-section.sticky-always')
            date_map = {}
            
            # Extract dates from date sections
            for section in date_sections:
                date_elem = section.select_one('div.jsx-3877914823.date')
                if date_elem:
                    date_text = date_elem.text.strip()
                    # Find all event cards that follow this date section until the next date section
                    next_elements = section.find_next_siblings()
                    for elem in next_elements:
                        if 'timeline-section' in elem.get('class', []):
                            break
                        cards = elem.select('div.jsx-2926199791.card-wrapper')
                        for card in cards:
                            date_map[card] = date_text
            
            day_events = []
            for container in event_containers:
                event = {}
                
                # Extract title
                title_elem = container.select_one('h3')
                event['title'] = title_elem.text.strip() if title_elem else "No title found"
                
                # Extract hosts
                host_elem = container.select_one('div.text-ellipses.nowrap')
                if host_elem:
                    host_text = host_elem.text.strip()
                    if host_text.startswith('By '):
                        host_text = host_text[3:]  # Remove 'By ' prefix
                    event['hosts'] = host_text
                else:
                    event['hosts'] = "No host found"
                
                # Extract date and time
                time_elem = container.select_one('div.jsx-749509546 span')
                
                # Get date from our date_map or use the current day we're scraping
                event_date = date_map.get(container, f"March {day}")
                
                if time_elem:
                    time_text = time_elem.text.strip()
                    event['date_time'] = f"{event_date}, {time_text}"
                else:
                    event['date_time'] = event_date
                
                # Extract location
                location_elem = container.select_one('div.jsx-3575689807.text-ellipses:not(.nowrap)')
                event['location'] = location_elem.text.strip() if location_elem else "No location found"
                
                # Extract image URL
                img_elem = container.select_one('img')
                if img_elem and 'src' in img_elem.attrs:
                    img_src = img_elem['src']
                    # Fix relative URLs by adding base URL
                    if not img_src.startswith(('http://', 'https://')):
                        img_src = f"https://lu.ma{img_src if img_src.startswith('/') else '/' + img_src}"
                    event['image_url'] = img_src
                else:
                    event['image_url'] = "No image found"
                
                # Extract event URL
                link_elem = container.select_one('a.event-link')
                if link_elem and 'href' in link_elem.attrs:
                    event['event_url'] = 'https://lu.ma' + link_elem['href'] if link_elem['href'].startswith('/') else link_elem['href']
                else:
                    event['event_url'] = "No URL found"
                
                # Extract price if available
                price_elem = container.select_one('div.jsx-1669635041.pill-label')
                if price_elem:
                    event['price'] = price_elem.text.strip()
                else:
                    event['price'] = "Free or not specified"
                
                day_events.append(event)
            
            print(f"Found {len(day_events)} events for {date_str}")
            all_events.extend(day_events)
        
        # Save the scraped events to the common file
        common_file = save_events_to_common_file(all_events)
        
        return {
            "message": f"Successfully scraped {len(all_events)} events from {URL_TO_SCRAPE} for March 1-16",
            "events": all_events,
            "saved_to": str(common_file)
        }
    
    except Exception as e:
        import traceback
        return {
            "message": f"Error scraping events: {str(e)}",
            "traceback": traceback.format_exc(),
            "events": []
        }

#Get events list from common events.json file or scrape if none are present
@app.get("/events-list")
async def get_events_list():
    """Get events list from common events.json file or scrape if none are present"""
    # Try to load events from common file
    events_data = load_events_from_common_file()
    
    # If no events found or the file is older than 24 hours, scrape new events
    if not events_data or (
        datetime.fromisoformat(events_data["timestamp"]) < 
        datetime.now() - timedelta(hours=24)
    ):
        # Call the scrape endpoint to get fresh data
        scrape_result = await scrape_events()
        
        if scrape_result.get("events"):
            return {
                "message": f"Successfully scraped {len(scrape_result['events'])} events from {URL_TO_SCRAPE}",
                "source": "fresh_scrape",
                "events": scrape_result["events"]
            }
        else:
            return {
                "message": "Failed to scrape events",
                "source": "error",
                "events": []
            }
    
    # Return the events from common file
    return {
        "message": f"Loaded {len(events_data['events'])} events from common file",
        "source": "common_file",
        "timestamp": events_data["timestamp"],
        "events": events_data["events"]
    }

#Get a simplified list of event titles for the EventRoller
@app.get("/events")
async def get_events():
    """Get a simplified list of event titles for the EventRoller"""
    # Try to load events from common file or get them from events-list
    events_data = load_events_from_common_file()
    
    if not events_data or (
        datetime.fromisoformat(events_data["timestamp"]) < 
        datetime.now() - timedelta(hours=24)
    ):
        # Call events-list to get or refresh the data
        events_list_result = await get_events_list()
        
        if events_list_result.get("events"):
            # Return simplified event data
            simplified_events = [
                {"title": event["title"], "host": event.get("hosts", "")} 
                for event in events_list_result["events"]
            ]
            
            return {
                "message": f"Loaded {len(simplified_events)} events",
                "source": events_list_result.get("source", "events_list"),
                "events": simplified_events
            }
        else:
            return {
                "message": "Failed to load events",
                "source": "error",
                "events": []
            }
    
    # Return simplified event data from common file
    simplified_events = [
        {"title": event["title"], "host": event.get("hosts", "")} 
        for event in events_data["events"]
    ]
    
    return {
        "message": f"Loaded {len(simplified_events)} events from common file",
        "source": "common_file",
        "events": simplified_events
    }

#Extract detailed information from a single Luma event URL using Toolhouse and Groq
@app.post("/toolhouse-event")
async def toolhouse_event(request: dict):
    """Extract detailed information from a single Luma event URL using Toolhouse and Groq"""
    try:
        # Get the event URL from the request
        event_url = request.get("url")
        if not event_url:
            return {
                "status": "error",
                "message": "Missing event URL in request"
            }
        
        # Ensure the URL is a Luma event URL
        if not event_url.startswith("https://lu.ma/"):
            event_url = f"https://lu.ma/{event_url}" if not event_url.startswith("http") else event_url
        
        # Extract the event ID from the URL
        event_id = event_url.split("/")[-1].split("?")[0]
        
        print(f"Using Toolhouse to scrape: {event_url}")
        print(f"Event ID: {event_id}")
        
        # Ensure the event details directory exists
        EVENT_DETAILS_DIR.mkdir(exist_ok=True, parents=True)
        
        # Get the tools from Toolhouse - using the "fire" bundle for web scraping
        tools = th.get_tools("fire")
        
        # Prepare messages for the model - simple and direct
        messages = [
            {"role": "user", "content": f"Visit and scrape the event page at {event_url}. Extract all text content including title, description, date, time, location, and other details."}
        ]
        
        # Call Groq with Toolhouse tools
        response = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            tools=tools,
            tool_choice="auto"
        )
        
        # Run the tools based on the model's response
        tool_results = th.run_tools(response)
        
        # Get the content directly from the tool results
        content = ""
        for result in tool_results:
            if result.get("role") == "tool":
                tool_content = result.get("content", "")
                if tool_content and len(tool_content) > len(content):
                    content = tool_content
        
        # If we didn't get content from the tools, use a simple approach
        if not content:
            simple_response = client.chat.completions.create(
                model=MODEL,
                messages=[{"role": "user", "content": f"Describe the event at {event_url} in detail."}],
                temperature=0.1,
                max_tokens=4000,
            )
            content = simple_response.choices[0].message.content if simple_response.choices else "No content found"
        
        # Save the extracted content to a text file named after the event ID
        event_file_path = EVENT_DETAILS_DIR / f"{event_id}.txt"
        
        with open(str(event_file_path), "w", encoding="utf-8") as f:
            f.write(f"Event URL: {event_url}\n")
            f.write(f"Extracted on: {datetime.now().isoformat()}\n\n")
            f.write(content)
        
        # Verify the file was saved
        file_exists = os.path.exists(str(event_file_path))
        
        # Create event data for the response
        event_data = {
            "url": event_url,
            "event_id": event_id,
            "extracted_content": content,
            "timestamp": datetime.now().isoformat()
        }
        
        return {
            "status": "success",
            "message": "Successfully extracted event information",
            "event_data": event_data,
            "saved_to": str(event_file_path),
            "file_exists": file_exists
        }
    
    except Exception as e:
        import traceback
        print(f"ERROR IN TOOLHOUSE-EVENT: {str(e)}")
        return {
            "status": "error",
            "message": f"Error extracting event information: {str(e)}"
        }
    


 #Search for events based on user query extract all events details including title, hosts, date, time, location, and image URLs  
@app.get("/toolhouse")
async def toolhouse_scrape():
    """Search for events based on user query"""
    # Prepare messages for the model
    messages = [
        {"role": "user", "content": f"scrape {URL_TO_SCRAPE} and extract all events details including title, hosts, date, time, location, and image URLs"}
    ]
    
    # Call Groq with Toolhouse tools
    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        # Passing a Bundle
        tools=th.get_tools("fire"),
    )
    
    # Run the tools based on the model's response
    tool_results = th.run_tools(response)
    
    # Clean the tool results to ensure they're compatible with Groq
    cleaned_messages = messages.copy()
    for result in tool_results:
        # Only include supported fields for each role
        if result.get("role") == "assistant":
            # For assistant messages, only include content and tool_calls
            cleaned_result = {
                "role": "assistant",
                "content": result.get("content")
            }
            if "tool_calls" in result:
                cleaned_result["tool_calls"] = result["tool_calls"]
            cleaned_messages.append(cleaned_result)
        elif result.get("role") == "tool":
            # For tool messages, include role, tool_call_id, and content
            cleaned_messages.append({
                "role": "tool",
                "tool_call_id": result.get("tool_call_id"),
                "content": result.get("content")
            })
    
    # Get a final response from the model with the cleaned tool results
    final_response = client.chat.completions.create(
        model=MODEL,
        messages=cleaned_messages,
    )
    
    # Extract the content from the final response
    content = final_response.choices[0].message.content if final_response.choices else "No response"
    
    # Convert tool_results to a serializable format
    serializable_tool_results = []
    for result in tool_results:
        serializable_result = {}
        for key, value in result.items():
            # Convert any non-serializable values to strings
            if isinstance(value, (str, int, float, bool, list, dict, type(None))):
                serializable_result[key] = value
            else:
                serializable_result[key] = str(value)
        serializable_tool_results.append(serializable_result)
    
    # Return both the raw tool results and the final formatted content
    return {
        "message": content,
        "tool_results": serializable_tool_results
    }

@app.post("/groq-whisper")
async def transcribe_audio(request: dict):
    """Transcribe audio file using Groq's Whisper model"""
    try:
        hash_id = request.get("hash_id")
        if not hash_id:
            return {"status": "error", "message": "Missing hash_id parameter"}
        
        # Construct the file path - use the file already saved by /voice-input
        file_path = UPLOAD_DIR / f"{hash_id}.webm"
        
        if not file_path.exists():
            return {
                "status": "error", 
                "message": f"Audio file not found: {file_path}"
            }
        
        # Read the audio file
        with open(file_path, "rb") as audio_file:
            # Call Groq's Whisper API for transcription
            response = client.audio.transcriptions.create(
                model=WHISPER,
                file=audio_file,
                language="en"  # Specify language if known, or let the model detect
            )
        
        # Extract the transcription text
        transcription = response.text if hasattr(response, 'text') else str(response)
        
        return {
            "status": "success",
            "message": "Audio transcribed successfully",
            "hash_id": hash_id,
            "text": transcription
        }
    except Exception as e:
        import traceback
        return {
            "status": "error",
            "message": f"Error transcribing audio: {str(e)}",
            "traceback": traceback.format_exc()
        }

@app.post("/voice-input")
async def process_voice_input(
    audio_file: UploadFile = File(...),
    hash_id: str = Form(...)
):
    try:
        # Ensure upload directory exists
        UPLOAD_DIR.mkdir(exist_ok=True, parents=True)
        
        # Save the file
        file_path = UPLOAD_DIR / f"{hash_id}.webm"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(audio_file.file, buffer)
        
        return {
            "status": "success",
            "message": "Voice input received and saved",
            "hash_id": hash_id,
            "file_path": str(file_path)
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

#Get Event meta data like url, content from saved text file for event
@app.get("/event-details")
async def get_event_details(id: str = None):
    """Get event details from saved text file"""
    try:
        # If no ID is provided, return an error
        if not id:
            return {
                "status": "error",
                "message": "Missing required parameter: id"
            }
        
        # Check if we have a text file for this event
        event_file_path = EVENT_DETAILS_DIR / f"{id}.txt"
        
        if not event_file_path.exists():
            return {
                "status": "error",
                "message": f"No event details found for ID: {id}"
            }
        
        # Read the text file
        with open(event_file_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Parse the content to extract metadata
        lines = content.split("\n")
        url = ""
        timestamp = ""
        
        # Extract URL and timestamp from the first lines
        for i, line in enumerate(lines):
            if line.startswith("Event URL:"):
                url = line.replace("Event URL:", "").strip()
            elif line.startswith("Extracted on:"):
                timestamp = line.replace("Extracted on:", "").strip()
                # Skip the metadata lines and extract the actual content
                extracted_content = "\n".join(lines[i+2:])
                break
        else:
            # If we didn't find the metadata, just use the whole content
            extracted_content = content
        
        # Create event data structure
        event_data = {
            "url": url,
            "event_id": id,
            "extracted_content": extracted_content,
            "timestamp": timestamp
        }
        
        return {
            "status": "success",
            "message": "Event details retrieved successfully",
            "event_data": event_data
        }
    
    except Exception as e:
        return {
            "status": "error",
            "message": f"Error retrieving event details: {str(e)}"
        }

#Create summary from content in the event file
@app.post("/groq-clean")
async def create_summary(request: dict):
    """Clean up event details and create a concise summary using Groq"""
    try:
        # Get the event ID from the request
        event_id = request.get("eventId")
        if not event_id:
            return {
                "status": "error",
                "message": "Missing eventId parameter"
            }
        
        # Ensure the event details directory exists
        if not EVENT_DETAILS_DIR.exists():
            return {
                "status": "error",
                "message": "Event details directory not found"
            }
        
        # Construct the path to the event file
        event_file_path = EVENT_DETAILS_DIR / f"{event_id}.txt"
        
        # Check if the file exists
        if not event_file_path.exists():
            return {
                "status": "error",
                "message": f"Event details file not found for ID: {event_id}"
            }
        
        # Read the file content
        with open(event_file_path, "r", encoding="utf-8") as f:
            file_content = f.read()
        
        print(f"Creating summary for event {event_id}, content length: {len(file_content)} characters")
        
        # Call Groq to clean up the content and generate a summary
        completion = client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant that creates concise, engaging summaries of events."
                },
                {
                    "role": "user",
                    "content": f"Here is the raw content of an event description. Please clean it up and create a concise 15-second summary (about 50-60 words) that highlights the most important details: what the event is about, when and where it's happening, who's hosting it, and why someone might want to attend. Format it in a way that's easy to read and engaging:\n\n{file_content}"
                }
            ],
            temperature=0.5,
            max_tokens=300,
        )
        
        # Extract the summary from the response
        summary = completion.choices[0].message.content if completion.choices else "No summary available"
        
        print(f"Generated summary for event {event_id}: {summary[:100]}...")
        
        # Return the summary
        return {
            "status": "success",
            "summary": summary,
            "event_id": event_id
        }
    
    except Exception as e:
        import traceback
        print(f"ERROR IN GROQ-CLEAN: {str(e)}")
        print(traceback.format_exc())
        return {
            "status": "error",
            "message": f"Failed to clean event content: {str(e)}"
        }
    
#Text summary to speech using playHT 
@app.post("/playht")
async def text_to_speech(request: dict):
    """Convert event summary to speech using PlayHT with pyht library"""
    try:
        # Get the summary and event ID from the request
        summary = request.get("summary")
        event_id = request.get("eventId")
        
        if not summary:
            return {
                "status": "error",
                "message": "Missing summary parameter"
            }
            
        if not event_id:
            return {
                "status": "error",
                "message": "Missing eventId parameter"
            }
        
        print(f"Converting summary to speech for event {event_id}")
        
        # Ensure audio directory exists
        AUDIO_DIR.mkdir(exist_ok=True, parents=True)
        
        # Use just the event_id for the filename (no UUID)
        audio_filename = f"{event_id}.wav"
        audio_file_path = AUDIO_DIR / audio_filename
        
        # Initialize the PlayHT client
        from pyht import Client
        from pyht.client import TTSOptions
        
        playht_user_id = os.getenv("PLAY_HT_USER_ID")
        playht_api_key = os.getenv("PLAY_HT_API_KEY")
        
        if not playht_user_id or not playht_api_key:
            return {
                "status": "error",
                "message": "PlayHT API credentials not configured"
            }
        
        client = Client(
            user_id=playht_user_id,
            api_key=playht_api_key,
        )
        
        # Use a pre-defined voice
        options = TTSOptions(voice="s3://voice-cloning-zero-shot/775ae416-49bb-4fb6-bd45-740f205d20a1/jennifersaad/manifest.json")
        
        print(f"Using PlayHT voice: jennifersaad")
        print(f"Saving audio to: {audio_file_path}")
        
        # Generate and save the audio file
        with open(str(audio_file_path), "wb") as audio_file:
            for chunk in client.tts(summary, options, voice_engine="PlayDialog-http"):
                audio_file.write(chunk)
        
        # Verify the file was saved
        if not os.path.exists(str(audio_file_path)):
            print(f"File was not saved to {audio_file_path}")
            return {
                "status": "error",
                "message": "Failed to save audio file to disk",
                "attempted_path": str(audio_file_path)
            }
        
        file_size = os.path.getsize(str(audio_file_path))
        print(f"Audio file saved to: {audio_file_path} (size: {file_size} bytes)")
        
        # Create a relative URL path for the frontend
        relative_audio_path = f"/audio/{audio_filename}"
        
        return {
            "status": "success",
            "message": "Text converted to speech successfully",
            "event_id": event_id,
            "audio_url": relative_audio_path,
            "voice": "jennifersaad",
            "file_size": file_size
        }
    
    except Exception as e:
        import traceback
        print(f"ERROR IN PLAYHT: {str(e)}")
        print(traceback.format_exc())
        return {
            "status": "error",
            "message": f"Failed to convert text to speech: {str(e)}"
        }