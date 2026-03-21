import { NextResponse } from 'next/server'
import { withAuth, ok } from '@/lib/api/route-helpers'

export async function GET(request: Request) {
  return withAuth(request, async (client) => {
    const { data, error } = await client.getProjects()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return ok(data)
  })
}
