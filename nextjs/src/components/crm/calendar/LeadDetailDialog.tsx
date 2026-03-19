'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { QualityBadge } from '@/components/crm/QualityBadge';
import { ScoreBadge } from '@/components/crm/ScoreBadge';
import { ConfirmDialog } from '@/components/crm/ConfirmDialog';
import { formatCLP } from '@/components/crm/FormatCurrency';
import { rentaTotal, egresosTotal, maxDividendo } from '@/lib/calculations/lead-financials';
import { Mail, Phone, User, MapPin, Briefcase, Calendar } from 'lucide-react';
import Link from 'next/link';
import type { Database } from '@/lib/types';

type LeadRow = Database['public']['Tables']['leads']['Row'];

interface LeadDetailDialogProps {
    lead: LeadRow | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRelease: (leadId: string) => void;
    releasing: boolean;
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | null | undefined }) {
    return (
        <div className="flex items-center gap-2 text-sm">
            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">{label}:</span>
            <span className="font-medium truncate">{value ?? '-'}</span>
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

export function LeadDetailDialog({ lead, open, onOpenChange, onRelease, releasing }: LeadDetailDialogProps) {
    if (!lead) return null;

    const renta = rentaTotal(lead);
    const egresos = egresosTotal(lead);
    const maxDiv = maxDividendo(lead);
    const hasCreditCapacity = maxDiv > 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <div className="flex items-center justify-between pr-6">
                        <DialogTitle className="text-lg">{lead.full_name}</DialogTitle>
                        <div className="flex gap-2">
                            <QualityBadge tier={lead.quality_tier} />
                            <ScoreBadge score={lead.score} />
                        </div>
                    </div>
                    <DialogDescription>
                        Reservado: {lead.reserved_at ? new Date(lead.reserved_at).toLocaleDateString('es-CL') : '-'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-2">
                        <InfoRow icon={Mail} label="Email" value={lead.email} />
                        <InfoRow icon={Phone} label="Telefono" value={lead.phone} />
                        <InfoRow icon={User} label="RUT" value={lead.rut} />
                        <InfoRow icon={Briefcase} label="Ocupacion" value={lead.occupation} />
                        <InfoRow icon={MapPin} label="Comuna" value={lead.current_commune} />
                    </div>

                    <Separator />

                    {/* RENTA */}
                    <div className="space-y-1">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Renta</h4>
                        <FinancialRow label="Liquidaciones" value={formatCLP(lead.liquidaciones)} />
                        <FinancialRow label="Honorarios" value={formatCLP(lead.honorarios)} />
                        <FinancialRow label="Arriendos" value={formatCLP(lead.arriendos)} />
                        <FinancialRow label="Retiros" value={formatCLP(lead.retiros)} />
                        <FinancialRow label="RENTA TOTAL" value={formatCLP(renta)} bold />
                    </div>

                    <Separator />

                    {/* EGRESOS */}
                    <div className="space-y-1">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Egresos</h4>
                        <FinancialRow label="Cuota C. Consumo" value={formatCLP(lead.cuota_credito_consumo)} />
                        <FinancialRow label="Dividendo Actual" value={formatCLP(lead.dividendo_actual)} />
                        <FinancialRow label="EGRESO MENSUAL TOTAL" value={formatCLP(egresos)} bold />
                    </div>

                    <Separator />

                    {/* Max dividendo */}
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

                    {/* INFO PERSONAL */}
                    <div className="space-y-1">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Info Personal</h4>
                        <FinancialRow label="Bancarizado" value={lead.bancarizado ? 'Si' : 'No'} />
                        <FinancialRow label="Edad" value={lead.age != null ? String(lead.age) : '-'} />
                        <FinancialRow label="Ahorros" value={lead.ahorros ? 'con ahorros' : 'sin ahorros'} />
                    </div>

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

                    <div className="flex gap-2">
                        <Link href={`/app/stock?leadId=${lead.id}`}>
                            <Button size="sm">Reservar Unidad</Button>
                        </Link>
                        <ConfirmDialog
                            trigger={
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                    disabled={releasing}
                                >
                                    {releasing ? 'Liberando...' : 'Liberar Lead'}
                                </Button>
                            }
                            title="Liberar Lead"
                            description={`Se liberara el lead "${lead.full_name}" y volvera al pool disponible. Esta accion no se puede deshacer.`}
                            onConfirm={() => onRelease(lead.id)}
                            variant="destructive"
                            confirmText="Liberar"
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
