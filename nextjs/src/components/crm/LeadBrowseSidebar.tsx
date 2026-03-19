'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { QualityBadge } from '@/components/crm/QualityBadge';
import { ScoreBadge } from '@/components/crm/ScoreBadge';
import { ConfirmDialog } from '@/components/crm/ConfirmDialog';
import { formatCLP, formatUF } from '@/components/crm/FormatCurrency';
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
    Building2,
    Calendar,
    DollarSign,
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
                <span className="font-medium">
                    {value.startsWith('$') ? value : `$ ${value}`}
                </span>
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
                        <InfoRow
                            icon={Building2}
                            label="Tipologia"
                            value={lead.preferred_typology}
                        />
                    </div>

                    <Separator />

                    {/* Income & budget */}
                    <div className="p-4 space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Ingreso:</span>
                            <span className="font-medium">
                                {formatCLP(lead.estimated_income)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Presupuesto:</span>
                            <span className="font-medium">
                                {formatUF(lead.budget_min)} - {formatUF(lead.budget_max)}
                            </span>
                        </div>
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
                        <FinancialRow label="Liquidaciones" value="$ 2.500.000" />
                        <FinancialRow label="Honorarios" />
                        <FinancialRow label="Arriendos" />
                        <FinancialRow label="Retiros" />
                        <FinancialRow label="RENTA TOTAL" value="$ 2.500.000" bold />
                    </div>

                    <Separator />

                    {/* EGRESOS section */}
                    <div className="p-4 space-y-1.5">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                            Egresos
                        </h4>
                        <FinancialRow label="Cuota C. Consumo" />
                        <FinancialRow label="Dividendo Actual" />
                        <FinancialRow label="EGRESO MENSUAL TOTAL" value="$ -" bold />
                    </div>

                    <Separator />

                    {/* Max dividendo */}
                    <div className="p-4">
                        <FinancialRow
                            label="MAXIMO DIVIDENDO A OFRECER"
                            value="$ 800.000"
                            bold
                        />
                    </div>

                    {/* Green status bar */}
                    <div className="px-4 pb-4">
                        <div className="bg-green-400 text-green-950 font-bold text-sm px-4 py-2 rounded">
                            CONTINUAR DE FORMA NORMAL
                        </div>
                    </div>

                    <Separator />

                    {/* INFO PERSONAL */}
                    <div className="p-4 space-y-1.5">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                            Info Personal
                        </h4>
                        <FinancialRow label="Bancarizado" value="Sí" />
                        <FinancialRow label="Edad" value="30" />
                        <FinancialRow label="Ahorros" value="con ahorros" />
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
