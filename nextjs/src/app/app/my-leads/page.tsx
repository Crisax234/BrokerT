"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { createSPASassClient } from '@/lib/supabase/client';
import { ReservedLead } from '@/lib/crm-types';
import { useGlobal } from '@/lib/context/GlobalContext';

const LeadCalendar = dynamic(
    () => import('@/components/crm/calendar/LeadCalendar').then(m => m.LeadCalendar),
    { ssr: false, loading: () => <div className="flex items-center justify-center h-[500px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div> }
);
const LeadDetailSidebar = dynamic(
    () => import('@/components/crm/calendar/LeadDetailSidebar').then(m => m.LeadDetailSidebar),
    { ssr: false }
);

export default function MyLeadsPage() {
    const { refreshUser } = useGlobal();
    const [leads, setLeads] = useState<ReservedLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [selectedLead, setSelectedLead] = useState<ReservedLead | null>(null);

    const fetchLeads = useCallback(async () => {
        setLoading(true);
        try {
            const client = await createSPASassClient();
            const { data, error } = await client.getMyReservedLeads();
            if (error) {
                console.error('Error fetching leads:', error);
                return;
            }
            setLeads((data as ReservedLead[]) ?? []);
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

    const handleSelectLead = useCallback((lead: ReservedLead) => {
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
