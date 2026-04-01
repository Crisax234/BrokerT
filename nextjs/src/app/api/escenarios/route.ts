import { NextResponse } from 'next/server'
import { withAuth, ok, created, apiErr } from '@/lib/api/route-helpers'

export async function GET(request: Request) {
  return withAuth(request, async (client) => {
    const { searchParams } = new URL(request.url)
    const leadIds = searchParams.get('leadIds')

    if (leadIds) {
      const ids = leadIds.split(',').filter(Boolean)
      if (ids.length === 0) return ok([])
      const { data, error } = await client.getLatestEscenarioForLeads(ids)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return ok(data)
    }

    const escenarioId = searchParams.get('id')
    if (escenarioId) {
      const { data, error } = await client.getEscenarioById(escenarioId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return ok(data)
    }

    return apiErr('Missing leadIds or id parameter')
  })
}

export async function POST(request: Request) {
  return withAuth(request, async (client) => {
    const body = await request.json()
    const { leadId, projectId, unitIds, inputs, results } = body

    if (!projectId) return apiErr('projectId is required')
    if (!inputs) return apiErr('inputs is required')
    if (!results) return apiErr('results is required')

    const { data, error } = await client.saveEscenario({
      leadId: leadId ?? null,
      projectId,
      unitIds: unitIds ?? [],
      inputs,
      results,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return created(data)
  })
}
