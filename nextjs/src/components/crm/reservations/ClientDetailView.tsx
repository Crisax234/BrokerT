'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { QualityBadge } from '@/components/crm/QualityBadge';
import { ScoreBadge } from '@/components/crm/ScoreBadge';
import { formatCLP } from '@/components/crm/FormatCurrency';
import { rentaTotal, egresosTotal, maxDividendo } from '@/lib/calculations/lead-financials';
import { ReservationUnitCard } from './ReservationUnitCard';
import {
    User,
    Mail,
    Phone,
    Briefcase,
    MapPin,
    Calendar,
    FileText,
    Loader2,
} from 'lucide-react';
import type { EnrichedLeadData, ReservationRow } from './types';

interface ClientDetailViewProps {
    lead: EnrichedLeadData;
    reservations: ReservationRow[];
    reservationsLoading: boolean;
    actionLoading: string | null;
    onRelease: (reservationId: string) => void;
    onMarkSold: (reservationId: string, salePrice?: number) => void;
}

function InfoRow({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string | null | undefined;
}) {
    if (!value) return null;
    return (
        <div className="flex items-center gap-2 text-sm">
            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">{label}:</span>
            <span className="font-medium truncate">{value}</span>
        </div>
    );
}

function FinancialRow({ label, value, bold = false }: { label: string; value?: string; bold?: boolean }) {
    return (
        <div className={`flex items-center justify-between text-sm ${bold ? 'font-semibold' : ''}`}>
            <span className={bold ? '' : 'text-muted-foreground'}>{label}</span>
            {value !== undefined && <span className="font-medium">{value}</span>}
        </div>
    );
}

export function ClientDetailView({
    lead,
    reservations,
    reservationsLoading,
    actionLoading,
    onRelease,
    onMarkSold,
}: ClientDetailViewProps) {
    const [docsOpen, setDocsOpen] = useState(false);

    const renta = rentaTotal(lead);
    const egresos = egresosTotal(lead);
    const maxDiv = maxDividendo(lead);
    const hasCreditCapacity = maxDiv > 0;

    return (
        <div className="space-y-5">
            {/* Client header */}
            <div className="space-y-4">
                {/* Name + badges */}
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="h-11 w-11 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">{lead.full_name}</h2>
                        <div className="flex items-center gap-2 mt-0.5">
                            <QualityBadge tier={lead.quality_tier} />
                            <ScoreBadge score={lead.score} />
                            {lead.reserved_at && (
                                <span className="text-xs text-muted-foreground ml-1">
                                    Reservado: {new Date(lead.reserved_at).toLocaleDateString('es-CL')}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Contact info grid */}
                <div className="grid grid-cols-1 gap-2">
                    <InfoRow icon={Mail} label="Email" value={lead.email} />
                    <InfoRow icon={Phone} label="Telefono" value={lead.phone} />
                    <InfoRow icon={User} label="RUT" value={lead.rut} />
                    <InfoRow icon={Briefcase} label="Ocupacion" value={lead.occupation} />
                    <InfoRow icon={MapPin} label="Comuna" value={lead.current_commune} />
                    {lead.age && (
                        <InfoRow icon={User} label="Edad" value={`${lead.age} anos`} />
                    )}
                </div>

                {/* Financial sections */}
                <Separator />
                <div className="space-y-1">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Renta</h4>
                    <div className="grid grid-cols-1 gap-y-1">
                        <FinancialRow label="Liquidaciones" value={formatCLP(lead.liquidaciones)} />
                        <FinancialRow label="Honorarios" value={formatCLP(lead.honorarios)} />
                        <FinancialRow label="Arriendos" value={formatCLP(lead.arriendos)} />
                        <FinancialRow label="Retiros" value={formatCLP(lead.retiros)} />
                    </div>
                    <FinancialRow label="RENTA TOTAL" value={formatCLP(renta)} bold />
                </div>

                <Separator />
                <div className="space-y-1">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Egresos</h4>
                    <div className="grid grid-cols-1 gap-y-1">
                        <FinancialRow label="Cuota C. Consumo" value={formatCLP(lead.cuota_credito_consumo)} />
                        <FinancialRow label="Dividendo Actual" value={formatCLP(lead.dividendo_actual)} />
                    </div>
                    <FinancialRow label="EGRESO MENSUAL TOTAL" value={formatCLP(egresos)} bold />
                </div>

                <Separator />
                <FinancialRow label="MAXIMO DIVIDENDO A OFRECER" value={formatCLP(maxDiv)} bold />

                {/* Status bar */}
                {hasCreditCapacity ? (
                    <div className="bg-green-400 text-green-950 font-bold text-sm px-4 py-2 rounded">
                        CONTINUAR DE FORMA NORMAL
                    </div>
                ) : (
                    <div className="bg-red-400 text-red-950 font-bold text-sm px-4 py-2 rounded">
                        SIN CAPACIDAD DE CREDITO
                    </div>
                )}

                <Separator />

                {/* Info Personal */}
                <div className="space-y-1">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Info Personal</h4>
                    <div className="grid grid-cols-1 gap-y-1">
                        <FinancialRow label="Bancarizado" value={lead.bancarizado ? 'Si' : 'No'} />
                        <FinancialRow label="Ahorros" value={lead.ahorros ? 'con ahorros' : 'sin ahorros'} />
                    </div>
                </div>

                {/* Meeting */}
                {lead.meeting_at && (
                    <>
                        <Separator />
                        <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Reunion:</span>
                            <span className="font-medium">
                                {new Date(lead.meeting_at).toLocaleString('es-CL', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </span>
                        </div>
                    </>
                )}

                <Separator />

                {/* Documents button */}
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setDocsOpen(true)}
                >
                    <FileText className="h-4 w-4" />
                    Ver documentos
                </Button>
            </div>

            {/* Reservations section */}
            <div>
                <h3 className="text-lg font-semibold mb-3">
                    Reservas de Unidades ({reservations.length})
                </h3>
                {reservationsLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : reservations.length === 0 ? (
                    <Card>
                        <CardContent className="py-6 text-center text-muted-foreground text-sm">
                            Sin reservas de unidades
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {reservations.map((res) => (
                            <ReservationUnitCard
                                key={res.id}
                                reservation={res}
                                actionLoading={actionLoading}
                                onRelease={onRelease}
                                onMarkSold={onMarkSold}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Documents dialog */}
            <Dialog open={docsOpen} onOpenChange={setDocsOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Documentos
                            </DialogTitle>
                        </div>
                    </DialogHeader>
                    <div className="py-8 text-center text-muted-foreground text-sm">
                        Cliente no posee documentos
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
