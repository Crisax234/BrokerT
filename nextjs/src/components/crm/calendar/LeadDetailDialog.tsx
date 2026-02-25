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
import { formatCLP, formatUF } from '@/components/crm/FormatCurrency';
import { Mail, Phone, User, MapPin, Briefcase, Building2, Calendar, DollarSign } from 'lucide-react';
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

export function LeadDetailDialog({ lead, open, onOpenChange, onRelease, releasing }: LeadDetailDialogProps) {
    if (!lead) return null;

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
                        <InfoRow icon={Building2} label="Tipologia" value={lead.preferred_typology} />
                    </div>

                    <Separator />

                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Ingreso:</span>
                            <span className="font-medium">{formatCLP(lead.estimated_income)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Presupuesto:</span>
                            <span className="font-medium">{formatUF(lead.budget_min)} - {formatUF(lead.budget_max)}</span>
                        </div>
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
