'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/crm/StatusBadge';
import { ConfirmDialog } from '@/components/crm/ConfirmDialog';
import { formatUF } from '@/components/crm/FormatCurrency';
import { Building2, MapPin, DollarSign } from 'lucide-react';
import type { ReservationRow } from './types';

interface ReservationUnitCardProps {
    reservation: ReservationRow;
    actionLoading: string | null;
    onRelease: (reservationId: string) => void;
    onMarkSold: (reservationId: string, salePrice?: number) => void;
}

export function ReservationUnitCard({
    reservation: res,
    actionLoading,
    onRelease,
    onMarkSold,
}: ReservationUnitCardProps) {
    const [salePriceInput, setSalePriceInput] = useState('');

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        Unidad {res.units?.unit_number ?? '-'}
                    </CardTitle>
                    <StatusBadge status={res.status} />
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                        <p className="text-muted-foreground text-xs">Proyecto</p>
                        <p className="font-medium">{res.units?.projects?.name ?? '-'}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-xs">Empresa</p>
                        <p className="font-medium">
                            {res.units?.projects?.real_estate_companies?.display_name ?? res.units?.projects?.real_estate_companies?.name ?? '-'}
                        </p>
                    </div>
                    <div className="flex items-start gap-1">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                        <div>
                            <p className="text-muted-foreground text-xs">Comuna</p>
                            <p className="font-medium">{res.units?.projects?.commune ?? '-'}</p>
                        </div>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-xs">Tipologia</p>
                        <p className="font-medium">{res.units?.typology ?? '-'}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-xs">Superficie</p>
                        <p className="font-medium">{res.units?.surface_useful ? `${res.units.surface_useful} m2` : '-'}</p>
                    </div>
                    <div className="flex items-start gap-1">
                        <DollarSign className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                        <div>
                            <p className="text-muted-foreground text-xs">Precio</p>
                            <p className="font-medium">{formatUF(res.units?.final_price)}</p>
                        </div>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-xs">Reservado</p>
                        <p className="font-medium">{new Date(res.reserved_at).toLocaleDateString('es-CL')}</p>
                    </div>
                    {res.sale_price != null && (
                        <div>
                            <p className="text-muted-foreground text-xs">Precio venta</p>
                            <p className="font-medium">{formatUF(res.sale_price)}</p>
                        </div>
                    )}
                </div>

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
                                onConfirm={() => onRelease(res.id)}
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
                                onConfirm={() => {
                                    const price = salePriceInput ? Number(salePriceInput) : undefined;
                                    onMarkSold(res.id, price);
                                    setSalePriceInput('');
                                }}
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
    );
}
