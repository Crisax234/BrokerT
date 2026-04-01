import { createSSRSassClient } from '@/lib/supabase/server';
import ReservationsClient from './ReservationsClient';

export default async function ReservationsPage() {
    const client = await createSSRSassClient();
    const [leadsResult, countsResult, reservationsResult] = await Promise.all([
        client.getMyReservedLeads(),
        client.getMyReservationCounts(),
        client.getMyReservations(),
    ]);

    const leads = leadsResult.data ?? [];
    const leadIds = leads.map(l => l.id);

    // Fetch saved escenarios for all leads (for table view)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let escenarios: any[] = [];
    if (leadIds.length > 0) {
        const escResult = await client.getLatestEscenarioForLeads(leadIds);
        escenarios = escResult.data ?? [];
    }

    return (
        <ReservationsClient
            initialLeads={leads}
            initialUnitCounts={countsResult}
            initialReservations={reservationsResult.data ?? []}
            initialEscenarios={escenarios}
        />
    );
}
