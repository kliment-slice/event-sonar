// Create a new file for the voice-input endpoint that proxies to the backend
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const url = `${backendUrl}/voice-input`;
    
    // Forward the entire FormData to the backend
    const formData = await request.formData();
    
    // Create a new FormData object to send to the backend
    const backendFormData = new FormData();
    
    // Copy all entries from the original FormData
    for (const [key, value] of formData.entries()) {
      backendFormData.append(key, value);
    }
    
    // Send the request to the backend
    const response = await fetch(url, {
      method: 'POST',
      body: backendFormData,
    });
    
    if (!response.ok) {
      throw new Error(`Backend returned status ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Failed to upload audio' }, { status: 500 });
  }
}