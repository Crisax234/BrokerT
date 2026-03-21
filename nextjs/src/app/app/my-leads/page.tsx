import { createSSRSassClient } from '@/lib/supabase/server';
import MyLeadsClient from './MyLeadsClient';

export default async function MyLeadsPage() {
    const client = await createSSRSassClient();
    const { data } = await client.getMyReservedLeads();
    return <MyLeadsClient initialLeads={data ?? []} />;
}
