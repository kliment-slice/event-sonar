from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from toolhouse import Toolhouse
from groq import Groq
import os
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import pathlib
import json

load_dotenv()

URL_TO_SCRAPE = "https://lu.ma/sxsw"
app = FastAPI()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = "llama-3.3-70b-versatile"
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

@app.get("/scrape")
async def scrape_events():
    """Scrape events from URL_TO_SCRAPE using BeautifulSoup and save to common events.json file"""
    try:
        # Send a GET request to the URL
        response = requests.get(URL_TO_SCRAPE)
        response.raise_for_status()  # Raise an exception for HTTP errors
        
        # Parse the HTML content
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find all event containers - updated selector based on the provided HTML structure
        event_containers = soup.find_all('div', class_=lambda c: c and 'content-card hoverable' in c)
        
        events = []
        for container in event_containers:
            event = {}
            
            # Extract title - updated selector
            title_elem = container.find('h3')
            event['title'] = title_elem.text.strip() if title_elem else "No title found"
            
            # Extract hosts - updated selector
            host_elem = container.find('div', class_=lambda c: c and 'text-ellipses nowrap' in c)
            if host_elem:
                host_text = host_elem.text.strip()
                if host_text.startswith('By '):
                    host_text = host_text[3:]  # Remove 'By ' prefix
                event['hosts'] = host_text
            else:
                event['hosts'] = "No host found"
            
            # Extract date and time - updated selector
            time_elem = container.find('div', class_=lambda c: c and 'event-time' in c)
            date_elem = None  # Date might not be directly visible in the card
            
            # Try to extract date from the page structure or use current date
            current_date = datetime.now().strftime("%B %d, %Y")
            
            if time_elem:
                time_text = time_elem.text.strip()
                event['date_time'] = f"{current_date}, {time_text}"
            else:
                event['date_time'] = current_date
            
            # Extract location - updated selector
            location_elem = container.find('div', class_=lambda c: c and 'attribute' in c)
            if location_elem:
                location_text_elem = location_elem.find('div', class_=lambda c: c and 'text-ellipses' in c and 'nowrap' not in c)
                if location_text_elem:
                    event['location'] = location_text_elem.text.strip()
                else:
                    event['location'] = "No location found"
            else:
                event['location'] = "No location found"
            
            # Extract image URL - updated selector
            img_elem = container.find('img')
            if img_elem and 'src' in img_elem.attrs:
                # Get the highest resolution image from srcset if available
                if 'srcset' in img_elem.attrs:
                    srcset = img_elem['srcset']
                    # Parse srcset to get the highest resolution image
                    srcset_parts = srcset.split(',')
                    if srcset_parts:
                        # Get the last part which typically has the highest resolution
                        highest_res = srcset_parts[-1].strip().split(' ')[0]
                        event['image_url'] = highest_res
                    else:
                        event['image_url'] = img_elem['src']
                else:
                    event['image_url'] = img_elem['src']
            else:
                event['image_url'] = "No image found"
            
            # Extract event URL - updated selector
            link_elem = container.find('a', class_='event-link')
            if link_elem and 'href' in link_elem.attrs:
                event['event_url'] = 'https://lu.ma' + link_elem['href'] if link_elem['href'].startswith('/') else link_elem['href']
            else:
                event['event_url'] = "No URL found"
            
            # Extract price if available
            price_elem = container.find('div', class_=lambda c: c and 'pill-label' in c)
            if price_elem:
                event['price'] = price_elem.text.strip()
            else:
                event['price'] = "Free or not specified"
            
            events.append(event)
        
        # Save the scraped events to the common file
        common_file = save_events_to_common_file(events)
        
        return {
            "message": f"Successfully scraped {len(events)} events from {URL_TO_SCRAPE}",
            "events": events,
            "saved_to": str(common_file)
        }
    
    except Exception as e:
        return {
            "message": f"Error scraping events: {str(e)}",
            "events": []
        }

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

@app.get("/test")
async def test_endpoint():
    """Simple test endpoint that returns a success message"""
    return {"message": "WORKS!"}