import { withAuth } from '@/lib/api/route-helpers'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  return withAuth(request, async (client) => {
    const { leadId } = await params
    const result = await client.reserveLead(leadId)
    return NextResponse.json(result)
  })
}
