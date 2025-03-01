from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/toolhouse")
async def toolhouse_scrape():
    """Search for events based on user query"""
    # call toolhouse api bundle firecrawl
    return {"message": "TOOLHOUSE!"}


@app.get("/test")
async def test_endpoint():
    """Simple test endpoint that returns a success message"""
    return {"message": "WORKS!"}