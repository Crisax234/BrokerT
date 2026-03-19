'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { QualityBadge } from '@/components/crm/QualityBadge';
import { ScoreBadge } from '@/components/crm/ScoreBadge';
import { ConfirmDialog } from '@/components/crm/ConfirmDialog';
import { formatCLP } from '@/components/crm/FormatCurrency';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Mail,
    Phone,
    User,
    MapPin,
    Briefcase,
    Calendar,
    X,
    UserCheck,
    Lock,
} from 'lucide-react';
import type { Database } from '@/lib/types';

type LeadRow = Database['public']['Views']['leads_browsable']['Row'];

interface LeadBrowseSidebarProps {
    lead: LeadRow | null;
    onClose: () => void;
    onReserve: (leadId: string) => void;
    reserving: boolean;
}

function InfoRow({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string | number | null | undefined;
}) {
    return (
        <div className="flex items-center gap-2 text-sm">
            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">{label}:</span>
            {value != null ? (
                <span className="font-medium truncate">{String(value)}</span>
            ) : (
                <Lock className="h-3.5 w-3.5 text-gray-400" />
            )}
        </div>
    );
}

function FinancialRow({
    label,
    value,
    bold = false,
}: {
    label: string;
    value?: string;
    bold?: boolean;
}) {
    return (
        <div
            className={`flex items-center justify-between text-sm ${bold ? 'font-semibold' : ''}`}
        >
            <span className={bold ? '' : 'text-muted-foreground'}>{label}</span>
            {value !== undefined && (
                <span className="font-medium">{value}</span>
            )}
        </div>
    );
}

export function LeadBrowseSidebar({
    lead,
    onClose,
    onReserve,
    reserving,
}: LeadBrowseSidebarProps) {
    const [clientType, setClientType] = useState<string>('');

    if (!lead) {
        return null;
    }

    const isOwned = lead.full_name != null;

    const rentaTotal = lead.renta_total ?? 0;
    const egresosTotal = lead.egresos_total ?? 0;
    const maxDiv = lead.max_dividendo ?? 0;
    const hasCreditCapacity = maxDiv > 0;

    return (
        <div className="w-full lg:w-96 shrink-0">
            <div className="border rounded-lg overflow-hidden bg-white">
                {/* Header */}
                <div className="p-4 border-b bg-muted/30">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold truncate pr-2">
                            {lead.full_name ?? 'Lead Anonimo'}
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-md hover:bg-muted transition-colors shrink-0"
                        >
                            <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <QualityBadge tier={lead.quality_tier} />
                        <ScoreBadge score={lead.score} />
                    </div>
                </div>

                {/* Scrollable content */}
                <div className="max-h-[calc(100vh-330px)] overflow-y-auto">
                    {/* Contact info */}
                    <div className="p-4 space-y-2">
                        <InfoRow icon={Mail} label="Email" value={lead.email} />
                        <InfoRow icon={Phone} label="Telefono" value={lead.phone} />
                        <InfoRow icon={User} label="RUT" value={lead.rut} />
                        <InfoRow icon={Briefcase} label="Ocupacion" value={lead.occupation} />
                        <InfoRow icon={MapPin} label="Comuna" value={lead.current_commune} />
                    </div>

                    {lead.meeting_at && (
                        <>
                            <Separator />
                            <div className="p-4">
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
                            </div>
                        </>
                    )}

                    <Separator />

                    {/* Tipo de cliente */}
                    <div className="p-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <UserCheck className="h-4 w-4 text-muted-foreground" />
                            <span>Tipo de cliente</span>
                        </div>
                        <Select value={clientType} onValueChange={setClientType}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccionar tipo..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="dependiente">Dependiente</SelectItem>
                                <SelectItem value="independiente">Independiente</SelectItem>
                                <SelectItem value="socio_empresa">Socio de empresa</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Separator />

                    {/* RENTA section */}
                    <div className="p-4 space-y-1.5">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                            Renta
                        </h4>
                        <FinancialRow label="Liquidaciones" value={formatCLP(lead.liquidaciones)} />
                        <FinancialRow label="Honorarios" value={formatCLP(lead.honorarios)} />
                        <FinancialRow label="Arriendos" value={formatCLP(lead.arriendos)} />
                        <FinancialRow label="Retiros" value={formatCLP(lead.retiros)} />
                        <FinancialRow label="RENTA TOTAL" value={formatCLP(rentaTotal)} bold />
                    </div>

                    <Separator />

                    {/* EGRESOS section */}
                    <div className="p-4 space-y-1.5">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                            Egresos
                        </h4>
                        <FinancialRow label="Cuota C. Consumo" value={formatCLP(lead.cuota_credito_consumo)} />
                        <FinancialRow label="Dividendo Actual" value={formatCLP(lead.dividendo_actual)} />
                        <FinancialRow label="EGRESO MENSUAL TOTAL" value={formatCLP(egresosTotal)} bold />
                    </div>

                    <Separator />

                    {/* Max dividendo */}
                    <div className="p-4">
                        <FinancialRow
                            label="MAXIMO DIVIDENDO A OFRECER"
                            value={formatCLP(maxDiv)}
                            bold
                        />
                    </div>

                    {/* Status bar */}
                    <div className="px-4 pb-4">
                        {hasCreditCapacity ? (
                            <div className="bg-green-400 text-green-950 font-bold text-sm px-4 py-2 rounded">
                                CONTINUAR DE FORMA NORMAL
                            </div>
                        ) : (
                            <div className="bg-red-400 text-red-950 font-bold text-sm px-4 py-2 rounded">
                                SIN CAPACIDAD DE CREDITO
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* INFO PERSONAL */}
                    <div className="p-4 space-y-1.5">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                            Info Personal
                        </h4>
                        <FinancialRow label="Bancarizado" value={lead.bancarizado ? 'Si' : 'No'} />
                        <FinancialRow label="Edad" value={lead.age != null ? String(lead.age) : '-'} />
                        <FinancialRow label="Ahorros" value={lead.ahorros ? 'con ahorros' : 'sin ahorros'} />
                    </div>

                    <Separator />

                    {/* Action button */}
                    <div className="p-4">
                        {isOwned ? (
                            <span className="text-sm text-green-600 font-medium">Reservado</span>
                        ) : (
                            <ConfirmDialog
                                trigger={
                                    <Button
                                        size="sm"
                                        disabled={reserving}
                                        className="w-full"
                                    >
                                        {reserving ? 'Agendando...' : 'Agendar Lead'}
                                    </Button>
                                }
                                title="Agendar Lead"
                                description="Al Agendar este lead se consumira 1 reserva de plan o 1 credito. Se revelara la informacion de contacto."
                                onConfirm={() => lead.id && onReserve(lead.id)}
                                confirmText="Agendar"
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
