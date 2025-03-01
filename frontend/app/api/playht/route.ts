import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { summary, eventId } = body;
    
    console.log("Received request for PlayHT text-to-speech with eventId:", eventId);
    
    if (!summary || !eventId) {
      console.error("Missing required parameters");
      return NextResponse.json(
        {
          status: "error",
          message: "Missing required parameters: summary and eventId"
        },
        { status: 422 }
      );
    }
    
    // Get the backend URL from environment variables
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    
    // Construct the URL to the backend endpoint
    const url = `${backendUrl}/playht`;
    console.log("Forwarding request to:", url);
    
    // Forward the request to the backend
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ summary, eventId }),
    });
    
    if (!response.ok) {
      console.error(`Backend returned status ${response.status}`);
      const errorText = await response.text();
      console.error("Error response body:", errorText);
      return NextResponse.json(
        { 
          status: "error", 
          message: `Failed to generate audio: ${response.statusText}` 
        }, 
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log("Received response from backend:", data.status);
    
    // Return a direct URL to our own audio API endpoint
    return NextResponse.json({
      status: "success",
      audio_url: `/api/audio?id=${eventId}`,
      message: "Audio generated successfully"
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { 
        status: "error", 
        message: 'Failed to generate audio' 
      }, 
      { status: 500 }
    );
  }
}