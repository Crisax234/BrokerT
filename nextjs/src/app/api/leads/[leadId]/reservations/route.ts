import { NextResponse } from 'next/server'
import { withAuth, ok } from '@/lib/api/route-helpers'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  return withAuth(request, async (client) => {
    const { leadId } = await params
    const { data, error } = await client.getReservationsForLead(leadId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return ok(data)
  })
}
