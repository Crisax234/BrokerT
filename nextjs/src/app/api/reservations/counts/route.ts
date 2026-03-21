import { withAuth, ok } from '@/lib/api/route-helpers'

export async function GET(request: Request) {
  return withAuth(request, async (client) => {
    const data = await client.getMyReservationCounts()
    return ok(data)
  })
}
