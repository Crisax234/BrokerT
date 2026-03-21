import { createSSRSassClient } from '@/lib/supabase/server';
import StockClient from './StockClient';

export default async function StockPage() {
    const client = await createSSRSassClient();
    const [projectsResult, unitCountsResult] = await Promise.all([
        client.getProjects(),
        client.getAvailableUnitCounts(),
    ]);
    return (
        <StockClient
            initialProjects={projectsResult.data ?? []}
            initialUnitCounts={unitCountsResult}
        />
    );
}
