"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createSPASassClient } from '@/lib/supabase/client';
import { Database } from '@/lib/types';
import { useGlobal } from '@/lib/context/GlobalContext';
import { LeadCalendar } from '@/components/crm/calendar/LeadCalendar';
// import { UnscheduledLeadsSidebar } from '@/components/crm/calendar/UnscheduledLeadsSidebar';
// import { LeadDetailDialog } from '@/components/crm/calendar/LeadDetailDialog';
import { LeadDetailSidebar } from '@/components/crm/calendar/LeadDetailSidebar';

type LeadRow = Database['public']['Tables']['leads']['Row'];

export default function MyLeadsPage() {
    const { refreshUser } = useGlobal();
    const [leads, setLeads] = useState<LeadRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [selectedLead, setSelectedLead] = useState<LeadRow | null>(null);

    const fetchLeads = useCallback(async () => {
        setLoading(true);
        try {
            const client = await createSPASassClient();
            const { data, error } = await client.getMyReservedLeads();
            if (error) {
                console.error('Error fetching leads:', error);
                return;
            }
            setLeads(data ?? []);
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    const scheduledLeads = useMemo(
        () => leads.filter((l) => l.meeting_at != null),
        [leads]
    );

    // const unscheduledLeads = useMemo(
    //     () => leads.filter((l) => l.meeting_at == null),
    //     [leads]
    // );

    const handleRelease = async (leadId: string) => {
        setActionLoading(leadId);
        try {
            const client = await createSPASassClient();
            const result = await client.releaseLead(leadId);
            if (result.success) {
                alert('Lead liberado exitosamente');
                setSelectedLead(null);
                await refreshUser();
                fetchLeads();
            } else {
                const err = result.error ?? '';
                if (err.includes('HAS_ACTIVE_UNIT_RESERVATION')) {
                    alert('No se puede liberar: este lead tiene una reserva de unidad activa. Libere la unidad primero.');
                } else {
                    alert(`Error: ${err}`);
                }
            }
        } catch (err) {
            console.error('Release error:', err);
            alert('Error al liberar lead');
        } finally {
            setActionLoading(null);
        }
    };

    const handleSelectLead = useCallback((lead: LeadRow) => {
        setSelectedLead(lead);
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-4">
            <h1 className="text-2xl font-bold">Mi Agenda</h1>

            <div className="flex flex-col lg:flex-row gap-6">
                <LeadCalendar
                    leads={scheduledLeads}
                    onSelectLead={handleSelectLead}
                />
                {/* <UnscheduledLeadsSidebar
                    leads={unscheduledLeads}
                    onSelectLead={handleSelectLead}
                    totalLeads={leads.length}
                /> */}
                <LeadDetailSidebar
                    lead={selectedLead}
                    onClose={() => setSelectedLead(null)}
                    onRelease={handleRelease}
                    releasing={actionLoading === selectedLead?.id}
                />
            </div>

            {/* <LeadDetailDialog
                lead={selectedLead}
                open={selectedLead !== null}
                onOpenChange={(open) => { if (!open) setSelectedLead(null); }}
                onRelease={handleRelease}
                releasing={actionLoading === selectedLead?.id}
            /> */}
        </div>
    );
}
