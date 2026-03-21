import { NextResponse } from 'next/server'
import { withAuth, ok, parseNum } from '@/lib/api/route-helpers'
import { Database } from '@/lib/types'

type LeadQuality = Database['public']['Enums']['lead_quality']
const VALID_QUALITY_TIERS: LeadQuality[] = ['premium', 'hot', 'warm', 'cold']

export async function GET(request: Request) {
  return withAuth(request, async (client) => {
    const { searchParams } = new URL(request.url)

    const qualityTierRaw = searchParams.get('qualityTier')
    const options = {
      qualityTier: qualityTierRaw && VALID_QUALITY_TIERS.includes(qualityTierRaw as LeadQuality)
        ? (qualityTierRaw as LeadQuality)
        : undefined,
      scoreMin: parseNum(searchParams, 'scoreMin'),
      scoreMax: parseNum(searchParams, 'scoreMax'),
      rentaTotalMin: parseNum(searchParams, 'rentaTotalMin'),
      maxDividendoMin: parseNum(searchParams, 'maxDividendoMin'),
      bancarizado: searchParams.has('bancarizado') ? searchParams.get('bancarizado') === 'true' : undefined,
      ahorros: searchParams.has('ahorros') ? searchParams.get('ahorros') === 'true' : undefined,
      edadMin: parseNum(searchParams, 'edadMin'),
      edadMax: parseNum(searchParams, 'edadMax'),
      meetingDate: searchParams.get('meetingDate') || undefined,
      page: parseNum(searchParams, 'page') ?? 1,
      pageSize: parseNum(searchParams, 'pageSize') ?? 20,
      sortBy: searchParams.get('sortBy') || undefined,
      sortAsc: searchParams.has('sortAsc') ? searchParams.get('sortAsc') === 'true' : undefined,
    }

    const { data, count, error } = await client.getLeadsBrowsable(options)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return ok({ leads: data, count })
  })
}
