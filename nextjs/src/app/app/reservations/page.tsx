"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import { createSPASassClient } from '@/lib/supabase/client';
import { useGlobal } from '@/lib/context/GlobalContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { KanbanColumn, PIPELINE_STAGES } from '@/components/crm/reservations/KanbanColumn';
import dynamic from 'next/dynamic';
import type { EnrichedLeadData, ReservationRow } from '@/components/crm/reservations/types';

const ClientDetailView = dynamic(
    () => import('@/components/crm/reservations/ClientDetailView').then(m => m.ClientDetailView),
    { ssr: false }
);

export default function ReservationsPage() {
    const { refreshUser } = useGlobal();
    const [leads, setLeads] = useState<EnrichedLeadData[]>([]);
    const [loading, setLoading] = useState(true);

    // Sheet state
    const [selectedLead, setSelectedLead] = useState<EnrichedLeadData | null>(null);
    const [sheetReservations, setSheetReservations] = useState<ReservationRow[]>([]);
    const [reservationsLoading, setReservationsLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Unit counts per lead (for badge on cards)
    const [unitCounts, setUnitCounts] = useState<Record<string, number>>({});

    const fetchLeads = useCallback(async () => {
        setLoading(true);
        try {
            const client = await createSPASassClient();
            const { data, error } = await client.getMyReservedLeads();
            if (error) {
                console.error('Error fetching leads:', error);
                return;
            }
            setLeads((data as unknown as EnrichedLeadData[]) ?? []);
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch reservation counts per lead (lightweight query)
    const fetchUnitCounts = useCallback(async () => {
        try {
            const client = await createSPASassClient();
            const counts = await client.getMyReservationCounts();
            setUnitCounts(counts);
        } catch (err) {
            console.error('Error fetching unit counts:', err);
        }
    }, []);

    useEffect(() => {
        fetchLeads();
        fetchUnitCounts();
    }, [fetchLeads, fetchUnitCounts]);

    // Group leads by pipeline_stage
    const columnData = useMemo(() => {
        const grouped: Record<string, EnrichedLeadData[]> = {};
        for (const stage of PIPELINE_STAGES) {
            grouped[stage.key] = [];
        }
        for (const lead of leads) {
            const stage = lead.pipeline_stage || 'asesoria';
            if (!grouped[stage]) grouped[stage] = [];
            grouped[stage].push(lead);
        }
        return grouped;
    }, [leads]);

    // Drag handler with optimistic update
    const onDragEnd = useCallback(async (result: DropResult) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const newStage = destination.droppableId;
        const oldStage = source.droppableId;

        // Optimistic update
        setLeads(prev => prev.map(lead =>
            lead.id === draggableId ? { ...lead, pipeline_stage: newStage } : lead
        ));

        try {
            const client = await createSPASassClient();
            const { error } = await client.updateLeadPipelineStage(draggableId, newStage);
            if (error) {
                console.error('Error updating pipeline stage:', error);
                // Revert
                setLeads(prev => prev.map(lead =>
                    lead.id === draggableId ? { ...lead, pipeline_stage: oldStage } : lead
                ));
            }
        } catch (err) {
            console.error('Error:', err);
            // Revert
            setLeads(prev => prev.map(lead =>
                lead.id === draggableId ? { ...lead, pipeline_stage: oldStage } : lead
            ));
        }
    }, []);

    // Open detail sheet
    const handleCardClick = useCallback(async (lead: EnrichedLeadData) => {
        setSelectedLead(lead);
        setReservationsLoading(true);
        setSheetReservations([]);
        try {
            const client = await createSPASassClient();
            const { data, error } = await client.getReservationsForLead(lead.id);
            if (error) {
                console.error('Error fetching reservations:', error);
                return;
            }
            setSheetReservations((data as unknown as ReservationRow[]) ?? []);
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setReservationsLoading(false);
        }
    }, []);

    const handleRelease = async (reservationId: string) => {
        setActionLoading(reservationId);
        try {
            const client = await createSPASassClient();
            const result = await client.releaseUnit(reservationId);
            if (result.success) {
                alert('Unidad liberada exitosamente');
                await refreshUser();
                fetchUnitCounts();
                // Refresh sheet reservations
                if (selectedLead) {
                    const { data } = await client.getReservationsForLead(selectedLead.id);
                    setSheetReservations((data as unknown as ReservationRow[]) ?? []);
                }
            } else {
                alert(`Error: ${result.error ?? 'Error desconocido'}`);
            }
        } catch (err) {
            console.error('Release error:', err);
            alert('Error al liberar unidad');
        } finally {
            setActionLoading(null);
        }
    };

    const handleMarkSold = async (reservationId: string, salePrice?: number) => {
        setActionLoading(reservationId);
        try {
            const client = await createSPASassClient();
            const result = await client.markUnitSold(reservationId, salePrice);
            if (result.success) {
                alert('Unidad marcada como vendida!');
                await refreshUser();
                fetchUnitCounts();
                // Refresh sheet reservations
                if (selectedLead) {
                    const { data } = await client.getReservationsForLead(selectedLead.id);
                    setSheetReservations((data as unknown as ReservationRow[]) ?? []);
                }
            } else {
                alert(`Error: ${result.error ?? 'Error desconocido'}`);
            }
        } catch (err) {
            console.error('Mark sold error:', err);
            alert('Error al marcar como vendida');
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4">
            <h1 className="text-2xl font-bold">Mis Clientes</h1>

            {leads.length === 0 ? (
                <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">
                    No tienes clientes reservados.
                </div>
            ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex gap-2 overflow-x-auto pb-4">
                        {PIPELINE_STAGES.map((stage) => (
                            <KanbanColumn
                                key={stage.key}
                                stageKey={stage.key}
                                title={stage.title}
                                color={stage.color}
                                leads={columnData[stage.key] ?? []}
                                unitCounts={unitCounts}
                                onCardClick={handleCardClick}
                            />
                        ))}
                    </div>
                </DragDropContext>
            )}

            {/* Client detail sheet */}
            <Sheet open={!!selectedLead} onOpenChange={(open) => { if (!open) setSelectedLead(null); }}>
                <SheetContent side="right" className="w-full sm:max-w-lg">
                    <SheetHeader>
                        <SheetTitle>Detalle del Cliente</SheetTitle>
                        <SheetDescription>
                            Informacion completa del cliente y sus reservas
                        </SheetDescription>
                    </SheetHeader>
                    {selectedLead && (
                        <div className="mt-4">
                            <ClientDetailView
                                lead={selectedLead}
                                reservations={sheetReservations}
                                reservationsLoading={reservationsLoading}
                                actionLoading={actionLoading}
                                onRelease={handleRelease}
                                onMarkSold={handleMarkSold}
                            />
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
