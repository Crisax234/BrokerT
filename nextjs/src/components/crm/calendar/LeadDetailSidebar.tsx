'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { QualityBadge } from '@/components/crm/QualityBadge';
import { ScoreBadge } from '@/components/crm/ScoreBadge';
import { ConfirmDialog } from '@/components/crm/ConfirmDialog';
import { formatCLP } from '@/components/crm/FormatCurrency';
import { rentaTotal, egresosTotal, maxDividendo } from '@/lib/calculations/lead-financials';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
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
    LinkIcon,
    Clipboard,
    ClipboardCheck,
} from 'lucide-react';
import type { ReservedLead } from '@/lib/crm-types';

interface LeadDetailSidebarProps {
    lead: ReservedLead | null;
    onClose: () => void;
    onRelease: (leadId: string) => void;
    releasing: boolean;
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
    return (
        <div className="flex items-center gap-2 text-sm">
            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">{label}:</span>
            <span className="font-medium truncate">{value ?? '-'}</span>
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

export function LeadDetailSidebar({
    lead,
    onClose,
    onRelease,
    releasing,
}: LeadDetailSidebarProps) {
    const [clientType, setClientType] = useState<string>('');
    const [linkDialogOpen, setLinkDialogOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const uploadLink = lead
        ? `${typeof window !== 'undefined' ? window.location.origin : ''}/upload/${lead.id}`
        : '';

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(uploadLink);
            setCopied(true);
        } catch {
            const textarea = document.createElement('textarea');
            textarea.value = uploadLink;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopied(true);
        }
    }, [uploadLink]);

    useEffect(() => {
        if (!copied) return;
        const t = setTimeout(() => setCopied(false), 2000);
        return () => clearTimeout(t);
    }, [copied]);

    useEffect(() => {
        setCopied(false);
        setLinkDialogOpen(false);
    }, [lead?.id]);

    if (!lead) {
        return (
            <div className="w-full lg:w-96 shrink-0">
                <div className="border rounded-lg p-6 h-full flex items-center justify-center min-h-[580px] bg-white">
                    <p className="text-sm text-muted-foreground text-center">
                        Selecciona un lead del calendario para ver sus detalles.
                    </p>
                </div>
            </div>
        );
    }

    const renta = rentaTotal(lead);
    const egresos = egresosTotal(lead);
    const maxDiv = maxDividendo(lead);
    const hasCreditCapacity = maxDiv > 0;

    return (
        <div className="w-full lg:w-96 shrink-0">
            <div className="border rounded-lg overflow-hidden bg-white">
                {/* Header */}
                <div className="p-4 border-b bg-muted/30">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold truncate pr-2">
                            {lead.full_name}
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
                        <span className="text-xs text-muted-foreground ml-auto">
                            Reservado:{' '}
                            {lead.reserved_at
                                ? new Date(lead.reserved_at).toLocaleDateString('es-CL')
                                : '-'}
                        </span>
                    </div>
                </div>

                {/* Generate upload link */}
                <div className="px-4 py-3 border-b">
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => setLinkDialogOpen(true)}
                    >
                        <LinkIcon className="h-4 w-4" />
                        Generar link para subida de archivos
                    </Button>
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
                        <FinancialRow label="RENTA TOTAL" value={formatCLP(renta)} bold />
                    </div>

                    <Separator />

                    {/* EGRESOS section */}
                    <div className="p-4 space-y-1.5">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                            Egresos
                        </h4>
                        <FinancialRow label="Cuota C. Consumo" value={formatCLP(lead.cuota_credito_consumo)} />
                        <FinancialRow label="Dividendo Actual" value={formatCLP(lead.dividendo_actual)} />
                        <FinancialRow label="EGRESO MENSUAL TOTAL" value={formatCLP(egresos)} bold />
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

                    {/* Action buttons */}
                    <div className="p-4">
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

                {/* Upload link dialog */}
                <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <LinkIcon className="h-5 w-5" />
                                Link de subida de archivos
                            </DialogTitle>
                            <DialogDescription>
                                Comparte este link con el cliente para que pueda subir sus documentos.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="mt-2">
                            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3">
                                <code className="flex-1 text-sm break-all select-all">
                                    {uploadLink}
                                </code>
                                <button
                                    onClick={handleCopy}
                                    className="shrink-0 p-2 rounded-md hover:bg-muted transition-colors relative"
                                    title="Copiar al portapapeles"
                                >
                                    <span
                                        className={`transition-all duration-200 ${copied ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
                                        style={{ display: copied ? 'none' : 'block' }}
                                    >
                                        <Clipboard className="h-4 w-4 text-muted-foreground" />
                                    </span>
                                    <span
                                        className={`transition-all duration-200 ${copied ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
                                        style={{ display: copied ? 'block' : 'none' }}
                                    >
                                        <ClipboardCheck className="h-4 w-4 text-green-600" />
                                    </span>
                                </button>
                            </div>
                            <div
                                className={`mt-2 flex items-center justify-center gap-1.5 text-xs font-medium text-green-600 transition-all duration-300 ${
                                    copied
                                        ? 'opacity-100 translate-y-0'
                                        : 'opacity-0 -translate-y-1 pointer-events-none'
                                }`}
                            >
                                <ClipboardCheck className="h-3.5 w-3.5" />
                                Copiado al portapapeles
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
