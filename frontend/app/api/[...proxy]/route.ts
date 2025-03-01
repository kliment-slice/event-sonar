import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  context: { params: { proxy: string[] } }
) {
  try {
    const params = context.params;
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const endpoint = params.proxy.join('/')
    
    // Handle query parameters
    const searchParams = request.nextUrl.searchParams.toString();
    const queryString = searchParams ? `?${searchParams}` : '';
    
    const url = `${backendUrl}/${endpoint}${queryString}`
    
    console.log(`Proxying GET request to: ${url}`);
    
    // Add timeout to prevent long-hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API error:', error);
    
    // Check if it's a connection refused error
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      return NextResponse.json({ 
        error: 'Backend service is not available. Please check if the API server is running.' 
      }, { status: 503 });
    }
    
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: { proxy: string[] } }
) {
  try {
    const params = context.params;
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const endpoint = params.proxy.join('/')
    const url = `${backendUrl}/${endpoint}`
    
    console.log(`Proxying POST request to: ${url}`);
    
    // Add timeout to prevent long-hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    // Check content type to handle different types of requests
    const contentType = request.headers.get('content-type') || '';
    
    let response;
    
    if (contentType.includes('multipart/form-data')) {
      // Handle form data (file uploads)
      const formData = await request.formData();
      response = await fetch(url, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId));
    } else {
      // Handle JSON data
      const body = await request.json();
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId));
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API error:', error);
    
    // Check if it's a connection refused error
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      return NextResponse.json({ 
        error: 'Backend service is not available. Please check if the API server is running.' 
      }, { status: 503 });
    }
    
    return NextResponse.json({ error: 'Failed to post data' }, { status: 500 });
  }
}