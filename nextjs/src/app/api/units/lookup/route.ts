import { NextResponse } from 'next/server'
import { withAuth, ok, apiErr } from '@/lib/api/route-helpers'

export async function GET(request: Request) {
  return withAuth(request, async (client) => {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const unitNumber = searchParams.get('unitNumber')
    if (!projectId || !unitNumber) return apiErr('Missing projectId or unitNumber', 400)

    const { data, error } = await client.getUnitByProjectAndNumber(projectId, unitNumber)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return ok(data)
  })
}
