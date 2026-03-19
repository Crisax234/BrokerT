"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createSPASassClient } from '@/lib/supabase/client';
import { useGlobal } from '@/lib/context/GlobalContext';
import { Card, CardContent } from '@/components/ui/card';
import { ClientCard } from '@/components/crm/reservations/ClientCard';
import { ClientDetailView } from '@/components/crm/reservations/ClientDetailView';
import type { ReservationRow, ClientGroup } from '@/components/crm/reservations/types';

export default function ReservationsPage() {
    const { refreshUser } = useGlobal();
    const [reservations, setReservations] = useState<ReservationRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [selectedLeadId, setSelectedLeadId] = useState<string | 'unlinked' | null>(null);

    const fetchReservations = useCallback(async () => {
        setLoading(true);
        try {
            const client = await createSPASassClient();
            const { data, error } = await client.getMyReservations();
            if (error) {
                console.error('Error fetching reservations:', error);
                return;
            }
            setReservations((data as unknown as ReservationRow[]) ?? []);
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReservations();
    }, [fetchReservations]);

    // Group reservations by lead
    const clientGroups = useMemo<ClientGroup[]>(() => {
        const map = new Map<string, ClientGroup>();
        for (const res of reservations) {
            const key = res.leads?.id ?? 'unlinked';
            if (!map.has(key)) {
                map.set(key, {
                    lead: res.leads,
                    leadId: res.leads?.id ?? null,
                    reservations: [],
                    activeCount: 0,
                    soldCount: 0,
                    totalValue: 0,
                });
            }
            const group = map.get(key)!;
            group.reservations.push(res);
            if (res.status === 'active') group.activeCount++;
            if (res.status === 'sold') group.soldCount++;
            if (res.units?.final_price) group.totalValue += res.units.final_price;
        }
        return Array.from(map.values()).sort((a, b) => {
            if (b.activeCount !== a.activeCount) return b.activeCount - a.activeCount;
            return b.reservations.length - a.reservations.length;
        });
    }, [reservations]);

    const selectedGroup = useMemo(
        () => {
            if (selectedLeadId === null) return null;
            if (selectedLeadId === 'unlinked') return clientGroups.find(g => g.leadId === null) ?? null;
            return clientGroups.find(g => g.leadId === selectedLeadId) ?? null;
        },
        [clientGroups, selectedLeadId]
    );

    const handleRelease = async (reservationId: string) => {
        setActionLoading(reservationId);
        try {
            const client = await createSPASassClient();
            const result = await client.releaseUnit(reservationId);
            if (result.success) {
                alert('Unidad liberada exitosamente');
                await refreshUser();
                fetchReservations();
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
                fetchReservations();
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
        <div className="p-6 space-y-4">
            {selectedGroup ? (
                <ClientDetailView
                    group={selectedGroup}
                    onBack={() => setSelectedLeadId(null)}
                    actionLoading={actionLoading}
                    onRelease={handleRelease}
                    onMarkSold={handleMarkSold}
                />
            ) : (
                <>
                    <h1 className="text-2xl font-bold">Mis Reservas</h1>
                    {clientGroups.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center text-gray-500">
                                No tienes reservas de unidades.
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-3">
                            {clientGroups.map((group) => (
                                <ClientCard
                                    key={group.leadId ?? 'unlinked'}
                                    group={group}
                                    onClick={() => setSelectedLeadId(group.leadId ?? 'unlinked')}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
