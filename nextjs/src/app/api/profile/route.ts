import { NextResponse } from "next/server";
import { withAuth, ok } from "@/lib/api/route-helpers";

export async function GET(request: Request) {
  return withAuth(request, async (client) => {
    const supabase = client.getSupabaseClient();
    const [
      {
        data: { user },
      },
      { data: profile },
    ] = await Promise.all([supabase.auth.getUser(), client.getSellerProfile()]);

    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    return ok({
      email: user.email,
      id: user.id,
      registered_at: user.created_at,
      full_name: profile?.full_name ?? "",
      is_verified: profile?.is_verified ?? false,
      available_credits: profile?.seller_accounts?.available_credits ?? 0,
      plan_reservations_remaining: profile?.seller_accounts?.plan_reservations_remaining ?? 0,
      current_period_end: profile?.seller_accounts?.current_period_end ?? null,
      lifetime_lead_reservations: profile?.seller_accounts?.lifetime_lead_reservations ?? 0,
      lifetime_unit_reservations: profile?.seller_accounts?.lifetime_unit_reservations ?? 0,
    });
  });
}
