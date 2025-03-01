import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(
  request: NextRequest,
  context: { params: { proxy: string[] } }
) {
  try {
    // Await the params object before accessing its properties
    const params = await Promise.resolve(context.params);
    
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
    const endpoint = params.proxy.join('/')
    const url = `${backendUrl}/${endpoint}`
    
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
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
    // Await the params object before accessing its properties
    const params = await Promise.resolve(context.params);
    
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
    const endpoint = params.proxy.join('/')
    const url = `${backendUrl}/${endpoint}`
    
    const body = await request.json()
    
    console.log(`Posting to backend: ${url}`)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Failed to post data' }, { status: 500 })
  }
}