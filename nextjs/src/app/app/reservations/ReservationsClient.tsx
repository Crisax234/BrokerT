"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import { useGlobal } from '@/lib/context/GlobalContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KanbanColumn, PIPELINE_STAGES } from '@/components/crm/reservations/KanbanColumn';
import { ReservationsTable } from '@/components/crm/reservations/ReservationsTable';
import dynamic from 'next/dynamic';
import type { EnrichedLeadData, ReservationRow } from '@/components/crm/reservations/types';
import type { RPCResult } from '@/lib/crm-types';

const ClientDetailView = dynamic(
    () => import('@/components/crm/reservations/ClientDetailView').then(m => m.ClientDetailView),
    { ssr: false }
);

export type SavedEscenario = {
    id: string;
    lead_id: string | null;
    project_id: string;
    unit_ids: string[];
    inputs: Record<string, unknown>;
    results: Record<string, unknown>;
    created_at: string;
};

interface ReservationsClientProps {
    initialLeads: EnrichedLeadData[];
    initialUnitCounts: Record<string, number>;
    initialReservations: ReservationRow[];
    initialEscenarios: Record<string, unknown>[];
}

export default function ReservationsClient({ initialLeads, initialUnitCounts, initialReservations, initialEscenarios }: ReservationsClientProps) {
    const { refreshUser } = useGlobal();
    const [leads, setLeads] = useState<EnrichedLeadData[]>(initialLeads);
    const [loading] = useState(false);
    const [view, setView] = useState<'kanban' | 'tabla'>('kanban');
    const [allReservations, setAllReservations] = useState<ReservationRow[]>(initialReservations);
    const [escenarios] = useState<SavedEscenario[]>(initialEscenarios as unknown as SavedEscenario[]);

    // Sheet state
    const [selectedLead, setSelectedLead] = useState<EnrichedLeadData | null>(null);
    const [sheetReservations, setSheetReservations] = useState<ReservationRow[]>([]);
    const [reservationsLoading, setReservationsLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Unit counts per lead (for badge on cards)
    const [unitCounts, setUnitCounts] = useState<Record<string, number>>(initialUnitCounts);

    // Fetch reservation counts per lead (lightweight query)
    const fetchUnitCounts = useCallback(async () => {
        try {
            const res = await fetch('/api/reservations/counts');
            const json = await res.json();
            if (!res.ok) {
                console.error('Error fetching unit counts:', json.error);
                return;
            }
            setUnitCounts(json.data);
        } catch (err) {
            console.error('Error fetching unit counts:', err);
        }
    }, []);

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
            const res = await fetch(`/api/leads/${draggableId}/pipeline`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stage: newStage }),
            });
            const json = await res.json();
            if (!res.ok || json.error) {
                console.error('Error updating pipeline stage:', json.error);
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
            const res = await fetch(`/api/leads/${lead.id}/reservations`);
            const json = await res.json();
            if (!res.ok) {
                console.error('Error fetching reservations:', json.error);
                return;
            }
            setSheetReservations((json.data as unknown as ReservationRow[]) ?? []);
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setReservationsLoading(false);
        }
    }, []);

    const handleRelease = async (reservationId: string) => {
        setActionLoading(reservationId);
        try {
            const res = await fetch(`/api/reservations/${reservationId}/release`, {
                method: 'POST',
            });
            const result: RPCResult = await res.json();
            if (result.success) {
                alert('Unidad liberada exitosamente');
                await refreshUser();
                fetchUnitCounts();
                // Refresh sheet reservations + all reservations (for table view)
                const [sheetRes, allRes] = await Promise.all([
                    selectedLead ? fetch(`/api/leads/${selectedLead.id}/reservations`) : null,
                    fetch('/api/reservations'),
                ]);
                if (sheetRes) {
                    const json = await sheetRes.json();
                    setSheetReservations((json.data as unknown as ReservationRow[]) ?? []);
                }
                if (allRes) {
                    const json = await allRes.json();
                    setAllReservations(json.data ?? []);
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
            const res = await fetch(`/api/reservations/${reservationId}/sold`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ salePrice }),
            });
            const result: RPCResult = await res.json();
            if (result.success) {
                alert('Unidad marcada como vendida!');
                await refreshUser();
                fetchUnitCounts();
                // Refresh sheet reservations + all reservations (for table view)
                const [sheetRes, allRes] = await Promise.all([
                    selectedLead ? fetch(`/api/leads/${selectedLead.id}/reservations`) : null,
                    fetch('/api/reservations'),
                ]);
                if (sheetRes) {
                    const json = await sheetRes.json();
                    setSheetReservations((json.data as unknown as ReservationRow[]) ?? []);
                }
                if (allRes) {
                    const json = await allRes.json();
                    setAllReservations(json.data ?? []);
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
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-secondary-900">Mis Clientes</h1>
                <Tabs value={view} onValueChange={(v) => setView(v as 'kanban' | 'tabla')}>
                    <TabsList>
                        <TabsTrigger value="kanban">Kanban</TabsTrigger>
                        <TabsTrigger value="tabla">Tabla</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {leads.length === 0 ? (
                <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">
                    No tienes clientes reservados.
                </div>
            ) : view === 'kanban' ? (
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex gap-2 overflow-x-auto pb-4">
                        {PIPELINE_STAGES.map((stage) => (
                            <KanbanColumn
                                key={stage.key}
                                stageKey={stage.key}
                                title={stage.title}
                                color={stage.color}
                                borderColor={stage.borderColor}
                                leads={columnData[stage.key] ?? []}
                                unitCounts={unitCounts}
                                onCardClick={handleCardClick}
                            />
                        ))}
                    </div>
                </DragDropContext>
            ) : (
                <ReservationsTable
                    leads={leads}
                    allReservations={allReservations}
                    escenarios={escenarios}
                    onRowClick={handleCardClick}
                />
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
