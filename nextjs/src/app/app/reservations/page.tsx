"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createSPASassClient } from '@/lib/supabase/client';
import { useGlobal } from '@/lib/context/GlobalContext';
import { formatUF } from '@/components/crm/FormatCurrency';
import { StatusBadge } from '@/components/crm/StatusBadge';
import { QualityBadge } from '@/components/crm/QualityBadge';
import { ScoreBadge } from '@/components/crm/ScoreBadge';
import { ConfirmDialog } from '@/components/crm/ConfirmDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Building2, MapPin, User, DollarSign } from 'lucide-react';

type ReservationRow = {
    id: string;
    status: string;
    reserved_at: string;
    sold_at: string | null;
    released_at: string | null;
    cancelled_at: string | null;
    cancel_reason: string | null;
    sale_price: number | null;
    notes: string | null;
    units: {
        unit_number: string;
        typology: string | null;
        final_price: number | null;
        surface_useful: number | null;
        projects: {
            name: string;
            commune: string;
            real_estate_companies: { name: string; display_name: string | null } | null;
        } | null;
    } | null;
    leads: {
        full_name: string;
        email: string;
        quality_tier: string;
        score: number | null;
    } | null;
};

export default function ReservationsPage() {
    const { refreshUser } = useGlobal();
    const [reservations, setReservations] = useState<ReservationRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [salePriceInput, setSalePriceInput] = useState<string>('');

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

    const handleMarkSold = async (reservationId: string) => {
        setActionLoading(reservationId);
        try {
            const client = await createSPASassClient();
            const salePrice = salePriceInput ? Number(salePriceInput) : undefined;
            const result = await client.markUnitSold(reservationId, salePrice);
            if (result.success) {
                alert('Unidad marcada como vendida!');
                setSalePriceInput('');
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
            <h1 className="text-2xl font-bold">Mis Reservas</h1>

            {reservations.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-gray-500">
                        No tienes reservas de unidades.
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {reservations.map((res) => (
                        <Card key={res.id}>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Building2 className="h-5 w-5 text-gray-400" />
                                        Unidad {res.units?.unit_number ?? '-'}
                                    </CardTitle>
                                    <StatusBadge status={res.status} />
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {/* Unit info */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                    <div>
                                        <p className="text-gray-500">Proyecto</p>
                                        <p className="font-medium">{res.units?.projects?.name ?? '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Empresa</p>
                                        <p className="font-medium">
                                            {res.units?.projects?.real_estate_companies?.display_name ?? res.units?.projects?.real_estate_companies?.name ?? '-'}
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-1">
                                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                                        <div>
                                            <p className="text-gray-500">Comuna</p>
                                            <p className="font-medium">{res.units?.projects?.commune ?? '-'}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Tipologia</p>
                                        <p className="font-medium">{res.units?.typology ?? '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Superficie</p>
                                        <p className="font-medium">{res.units?.surface_useful ? `${res.units.surface_useful} m2` : '-'}</p>
                                    </div>
                                    <div className="flex items-start gap-1">
                                        <DollarSign className="h-4 w-4 text-gray-400 mt-0.5" />
                                        <div>
                                            <p className="text-gray-500">Precio</p>
                                            <p className="font-medium">{formatUF(res.units?.final_price)}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Reservado</p>
                                        <p className="font-medium">{new Date(res.reserved_at).toLocaleDateString('es-CL')}</p>
                                    </div>
                                    {res.sale_price != null && (
                                        <div>
                                            <p className="text-gray-500">Precio venta</p>
                                            <p className="font-medium">{formatUF(res.sale_price)}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Lead info */}
                                {res.leads && (
                                    <>
                                        <Separator />
                                        <div className="flex items-center gap-3 text-sm">
                                            <User className="h-4 w-4 text-gray-400" />
                                            <span className="font-medium">{res.leads.full_name}</span>
                                            <span className="text-gray-400">{res.leads.email}</span>
                                            <QualityBadge tier={res.leads.quality_tier} />
                                            <ScoreBadge score={res.leads.score} />
                                        </div>
                                    </>
                                )}

                                {/* Actions for active reservations */}
                                {res.status === 'active' && (
                                    <>
                                        <Separator />
                                        <div className="flex gap-2 items-center">
                                            <ConfirmDialog
                                                trigger={
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-red-600 border-red-200 hover:bg-red-50"
                                                        disabled={actionLoading === res.id}
                                                    >
                                                        Liberar Unidad
                                                    </Button>
                                                }
                                                title="Liberar Unidad"
                                                description={`Se liberara la unidad ${res.units?.unit_number ?? ''} y volvera a estar disponible.`}
                                                onConfirm={() => handleRelease(res.id)}
                                                variant="destructive"
                                                confirmText="Liberar"
                                            />
                                            <ConfirmDialog
                                                trigger={
                                                    <Button
                                                        size="sm"
                                                        disabled={actionLoading === res.id}
                                                    >
                                                        Marcar Vendida
                                                    </Button>
                                                }
                                                title="Marcar como Vendida"
                                                description={`Marcar la unidad ${res.units?.unit_number ?? ''} como vendida.`}
                                                onConfirm={() => handleMarkSold(res.id)}
                                                confirmText="Confirmar Venta"
                                            >
                                                <div className="px-1 py-2">
                                                    <label className="text-sm text-gray-500 block mb-1">
                                                        Precio de venta (UF, opcional)
                                                    </label>
                                                    <Input
                                                        type="number"
                                                        placeholder="Ej: 3500"
                                                        value={salePriceInput}
                                                        onChange={(e) => setSalePriceInput(e.target.value)}
                                                    />
                                                </div>
                                            </ConfirmDialog>
                                        </div>
                                    </>
                                )}

                                {/* Info for completed reservations */}
                                {res.status === 'sold' && res.sold_at && (
                                    <p className="text-xs text-green-600">
                                        Vendida el {new Date(res.sold_at).toLocaleDateString('es-CL')}
                                    </p>
                                )}
                                {res.status === 'released' && res.released_at && (
                                    <p className="text-xs text-gray-500">
                                        Liberada el {new Date(res.released_at).toLocaleDateString('es-CL')}
                                        {res.cancel_reason && ` - Razon: ${res.cancel_reason}`}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
