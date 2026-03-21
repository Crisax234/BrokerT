import { withAuth, apiErr } from '@/lib/api/route-helpers'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  return withAuth(request, async (client) => {
    const { leadId } = await params
    const body = await request.json().catch(() => ({}))
    if (!body.stage) return apiErr('Missing stage', 400)
    const { error } = await client.updateLeadPipelineStage(leadId, body.stage)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  })
}
