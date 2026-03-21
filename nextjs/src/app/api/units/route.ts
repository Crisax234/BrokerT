import { NextResponse } from 'next/server'
import { withAuth, ok, parseNum } from '@/lib/api/route-helpers'
import { Database } from '@/lib/types'

type UnitStatus = Database['public']['Enums']['unit_status']

export async function GET(request: Request) {
  return withAuth(request, async (client) => {
    const { searchParams } = new URL(request.url)

    const statusInRaw = searchParams.get('statusIn')
    const options = {
      projectId: searchParams.get('projectId') || undefined,
      companyId: searchParams.get('companyId') || undefined,
      typology: searchParams.get('typology') || undefined,
      statusIn: statusInRaw ? (statusInRaw.split(',') as UnitStatus[]) : undefined,
      page: parseNum(searchParams, 'page') ?? 1,
      pageSize: parseNum(searchParams, 'pageSize') ?? 50,
    }

    const { data, count, error } = await client.getUnits(options)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return ok({ units: data, count })
  })
}
