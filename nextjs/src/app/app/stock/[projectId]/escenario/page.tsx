import { createSSRSassClient } from '@/lib/supabase/server';
import EscenarioClient from './EscenarioClient';

interface Props {
    params: Promise<{ projectId: string }>;
    searchParams: Promise<{ units?: string; leadId?: string }>;
}

export default async function EscenarioPage({ params, searchParams }: Props) {
    const { projectId } = await params;
    const { units, leadId } = await searchParams;

    const client = await createSSRSassClient();
    const [projectResult, ufResult, unitNumbersResult, leadsResult] = await Promise.all([
        client.getProjectById(projectId),
        client.getLatestUFValue(),
        client.getProjectUnitNumbers(projectId),
        client.getMyReservedLeads(),
    ]);

    const initialUnits = units ? units.split(',').filter(Boolean) : [];

    return (
        <EscenarioClient
            projectId={projectId}
            initialProject={projectResult.data!}
            initialUfValue={ufResult.data?.value ?? 0}
            initialUnitLookup={unitNumbersResult.data ?? []}
            initialUnits={initialUnits}
            initialLeadId={leadId ?? null}
            initialLeads={leadsResult.data ?? []}
        />
    );
}
