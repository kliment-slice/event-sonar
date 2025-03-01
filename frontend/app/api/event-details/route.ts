// app/api/event-details/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    console.log("Received request for event details with ID:", id);
    
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
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const url = `${backendUrl}/event-details?id=${encodeURIComponent(id)}`;
    
    console.log("Forwarding request to:", url);
    
    // Send the request to the backend
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Backend returned status ${response.status}`);
      const errorText = await response.text();
      console.error("Error response from backend:", errorText);
      return NextResponse.json(
        { 
          status: "error", 
          message: `Backend error: ${response.statusText}` 
        }, 
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log("Received response from backend:", data.status || "success");
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { 
        status: "error", 
        message: 'Failed to fetch event details' 
      }, 
      { status: 500 }
    );
  }
}