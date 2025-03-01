import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    console.log("Received request for audio file with ID:", id);
    
    if (!id) {
      console.error("No ID provided in request");
      return NextResponse.json(
        {
          status: "error",
          message: "Missing required parameter: id"
        },
        { status: 422 }
      );
    }
    
    // Get the backend URL from environment variables
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
    // Directly proxy the request to the backend audio file
    const audioUrl = `${backendUrl}/audio/${id}.wav`;
    console.log("Directly proxying request to:", audioUrl);
    
    // Use node-fetch with a longer timeout
    const response = await fetch(audioUrl, {
      method: 'GET',
      headers: {
        'Accept': 'audio/wav, audio/*',
      },
    });
    
    if (!response.ok) {
      console.error(`Backend returned status ${response.status}`);
      return NextResponse.json(
        { 
          status: "error", 
          message: `Audio file not found for event ID: ${id}` 
        }, 
        { status: 404 }
      );
    }
    
    // Get the audio data as an array buffer
    const audioBuffer = await response.arrayBuffer();
    console.log(`Successfully fetched audio file (${audioBuffer.byteLength} bytes)`);
    
    // Return the audio file with the correct content type
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { 
        status: "error", 
        message: 'Failed to fetch audio file' 
      }, 
      { status: 500 }
    );
  }
}