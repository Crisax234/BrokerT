import { NextResponse } from 'next/server'
import { withAuth, ok } from '@/lib/api/route-helpers'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  return withAuth(request, async (client) => {
    const { projectId } = await params
    const { data, error } = await client.getProjectById(projectId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return ok(data)
  })
}
