import { NextRequest, NextResponse } from 'next/server'

// Remove the edge runtime declaration
// export const runtime = 'edge'

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
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      console.error(`Backend returned status: ${response.status}`);
      return NextResponse.json(
        { error: `Backend returned status: ${response.status}` }, 
        { status: response.status }
      );
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
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
    
    // Check content type to handle different types of requests
    const contentType = request.headers.get('content-type') || '';
    
    let response;
    
    if (contentType.includes('multipart/form-data')) {
      // Handle form data (file uploads)
      const formData = await request.formData();
      response = await fetch(url, {
        method: 'POST',
        body: formData,
      });
    } else {
      // Handle JSON data
      const body = await request.json();
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    }
    
    if (!response.ok) {
      console.error(`Backend returned status: ${response.status}`);
      return NextResponse.json(
        { error: `Backend returned status: ${response.status}` }, 
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Failed to post data' }, { status: 500 });
  }
}