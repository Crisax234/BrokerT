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
import { formatCLP, formatUF } from '@/components/crm/FormatCurrency';
import { ReservationUnitCard } from './ReservationUnitCard';
import {
    ArrowLeft,
    User,
    Mail,
    Phone,
    Briefcase,
    MapPin,
    Building2,
    DollarSign,
    Calendar,
    FileText,
    X,
} from 'lucide-react';
import type { ClientGroup } from './types';

interface ClientDetailViewProps {
    group: ClientGroup;
    onBack: () => void;
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

export function ClientDetailView({
    group,
    onBack,
    actionLoading,
    onRelease,
    onMarkSold,
}: ClientDetailViewProps) {
    const { lead, reservations } = group;
    const [docsOpen, setDocsOpen] = useState(false);

    return (
        <div className="space-y-5">
            {/* Back button */}
            <Button variant="outline" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Volver a Mis Reservas
            </Button>

            {/* Client header card */}
            <Card>
                <CardContent className="pt-5 pb-4 space-y-4">
                    {lead ? (
                        <>
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <InfoRow icon={Mail} label="Email" value={lead.email} />
                                <InfoRow icon={Phone} label="Telefono" value={lead.phone} />
                                <InfoRow icon={User} label="RUT" value={lead.rut} />
                                <InfoRow icon={Briefcase} label="Ocupacion" value={lead.occupation} />
                                <InfoRow icon={MapPin} label="Comuna" value={lead.current_commune} />
                                <InfoRow icon={Building2} label="Tipologia pref." value={lead.preferred_typology} />
                                {lead.age && (
                                    <InfoRow icon={User} label="Edad" value={`${lead.age} anos`} />
                                )}
                            </div>

                            {/* Financial info */}
                            {(lead.estimated_income || lead.budget_min || lead.budget_max) && (
                                <>
                                    <Separator />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {lead.estimated_income && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                                                <span className="text-muted-foreground">Ingreso:</span>
                                                <span className="font-medium">{formatCLP(lead.estimated_income)}</span>
                                            </div>
                                        )}
                                        {(lead.budget_min || lead.budget_max) && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                                                <span className="text-muted-foreground">Presupuesto:</span>
                                                <span className="font-medium">
                                                    {formatUF(lead.budget_min)} - {formatUF(lead.budget_max)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

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
                        </>
                    ) : (
                        <div className="flex items-center gap-3">
                            <div className="h-11 w-11 rounded-full bg-gray-100 flex items-center justify-center">
                                <User className="h-5 w-5 text-gray-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-400">Sin cliente asociado</h2>
                                <p className="text-sm text-muted-foreground">
                                    Estas reservas no tienen un lead vinculado.
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Reservations section */}
            <div>
                <h3 className="text-lg font-semibold mb-3">
                    Reservas de Unidades ({reservations.length})
                </h3>
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
