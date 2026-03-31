import {createBrowserClient} from '@supabase/ssr'
import {ClientType, SassClient} from "@/lib/supabase/unified";
import {Database} from "@/lib/types";

// Browser calls go through Next.js rewrites to hide the Supabase URL from the Network tab.
// Server-side calls use the real URL directly (never visible to the browser).
const BROWSER_SUPABASE_URL = typeof window !== 'undefined'
    ? `${window.location.origin}/supabase`
    : process.env.NEXT_PUBLIC_SUPABASE_URL!;

// The storage key MUST be derived from the real Supabase URL so that the cookie name
// matches between the browser client and the server middleware (which uses the real URL).
const REAL_PROJECT_REF = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0];

export function createSPAClient() {
    return createBrowserClient<Database, "public", Database["public"]>(
        BROWSER_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: {
                storageKey: `sb-${REAL_PROJECT_REF}-auth-token`,
            },
        }
    )
}

export async function createSPASassClient() {
    const client = createSPAClient();
    // This must be some bug that SupabaseClient is not properly recognized, so must be ignored
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new SassClient(client as any, ClientType.SPA);
}

export async function createSPASassClientAuthenticated() {
    const client = createSPAClient();
    const user = await client.auth.getSession();
    if (!user.data || !user.data.session) {
        window.location.href = '/auth/login';
    }
    // This must be some bug that SupabaseClient is not properly recognized, so must be ignored
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new SassClient(client as any, ClientType.SPA);
}