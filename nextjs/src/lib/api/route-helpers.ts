import { NextResponse } from 'next/server'
import { createSSRSassClient } from '@/lib/supabase/server'
import { SassClient } from '@/lib/supabase/unified'

type AuthedHandler = (
  client: SassClient,
  userId: string,
  request: Request
) => Promise<NextResponse>

export async function withAuth(
  request: Request,
  handler: AuthedHandler
): Promise<NextResponse> {
  try {
    const client = await createSSRSassClient()
    const supabase = client.getSupabaseClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return await handler(client, user.id, request)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** Parse a numeric query param safely — returns undefined if absent or NaN */
export function parseNum(params: URLSearchParams, key: string): number | undefined {
  if (!params.has(key)) return undefined
  const n = Number(params.get(key))
  return Number.isFinite(n) ? n : undefined
}

export const ok = (data: unknown) => NextResponse.json({ data }, { status: 200 })
export const created = (data: unknown) => NextResponse.json({ data }, { status: 201 })
export const apiErr = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status })
