import { withAuth } from '@/lib/api/route-helpers'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reservationId: string }> }
) {
  return withAuth(request, async (client) => {
    const { reservationId } = await params
    const body = await request.json().catch(() => ({}))
    const result = await client.releaseUnit(reservationId, body.reason)
    return NextResponse.json(result)
  })
}
