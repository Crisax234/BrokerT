import { withAuth } from '@/lib/api/route-helpers'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ unitId: string }> }
) {
  return withAuth(request, async (client) => {
    const { unitId } = await params
    const body = await request.json().catch(() => ({}))
    const result = await client.reserveUnit(unitId, body.leadId, body.appointmentId)
    return NextResponse.json(result)
  })
}
