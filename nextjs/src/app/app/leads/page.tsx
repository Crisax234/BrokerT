import { createSSRSassClient } from '@/lib/supabase/server';
import LeadsTable from './LeadsTable';

export default async function LeadsPage() {
    const client = await createSSRSassClient();
    const { data, count } = await client.getLeadsBrowsable({ page: 1, pageSize: 20 });

    return (
        <LeadsTable
            initialLeads={data ?? []}
            initialCount={count ?? 0}
        />
    );
}
