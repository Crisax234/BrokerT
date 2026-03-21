import { createSSRSassClient } from '@/lib/supabase/server';
import ReservationsClient from './ReservationsClient';

export default async function ReservationsPage() {
    const client = await createSSRSassClient();
    const [leadsResult, countsResult] = await Promise.all([
        client.getMyReservedLeads(),
        client.getMyReservationCounts(),
    ]);
    return (
        <ReservationsClient
            initialLeads={leadsResult.data ?? []}
            initialUnitCounts={countsResult}
        />
    );
}
