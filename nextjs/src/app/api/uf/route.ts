import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/route-helpers'

export async function GET(request: Request) {
  return withAuth(request, async (client) => {
    const { data, error } = await client.getLatestUFValue()
    if (error) return NextResponse.json({ error: 'Failed to fetch UF value' }, { status: 500 })

    const response = NextResponse.json({ data }, { status: 200 })
    response.headers.set('Cache-Control', 'private, max-age=3600')
    return response
  })
}
