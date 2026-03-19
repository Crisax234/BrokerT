'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QualityBadge } from '@/components/crm/QualityBadge';
import { ScoreBadge } from '@/components/crm/ScoreBadge';
import { formatUF } from '@/components/crm/FormatCurrency';
import { User, ChevronRight, MapPin, Mail } from 'lucide-react';
import type { ClientGroup } from './types';

interface ClientCardProps {
    group: ClientGroup;
    onClick: () => void;
}

export function ClientCard({ group, onClick }: ClientCardProps) {
    const { lead, reservations, activeCount, soldCount, totalValue } = group;
    const releasedCount = reservations.filter(r => r.status === 'released').length;

    if (!lead) {
        return (
            <Card
                className="cursor-pointer hover:shadow-md hover:border-primary-200 transition-all group"
                onClick={onClick}
            >
                <CardContent className="py-4 px-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                                <User className="h-5 w-5 text-gray-400" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-400">Sin cliente asociado</p>
                                <p className="text-xs text-gray-400">{reservations.length} reserva{reservations.length !== 1 ? 's' : ''}</p>
                            </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-primary-500 transition-colors" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card
            className="cursor-pointer hover:shadow-md hover:border-primary-200 transition-all group"
            onClick={onClick}
        >
            <CardContent className="py-4 px-5">
                <div className="flex items-center justify-between gap-4">
                    {/* Left: Client info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-10 w-10 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                            <User className="h-5 w-5 text-primary-600" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-base truncate">{lead.full_name}</p>
                                <QualityBadge tier={lead.quality_tier} />
                                <ScoreBadge score={lead.score} />
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                {lead.email && (
                                    <span className="flex items-center gap-1 truncate">
                                        <Mail className="h-3 w-3" />
                                        {lead.email}
                                    </span>
                                )}
                                {lead.current_commune && (
                                    <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {lead.current_commune}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Stats */}
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1.5">
                            {activeCount > 0 && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                    {activeCount} activa{activeCount !== 1 ? 's' : ''}
                                </Badge>
                            )}
                            {soldCount > 0 && (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                    {soldCount} vendida{soldCount !== 1 ? 's' : ''}
                                </Badge>
                            )}
                            {releasedCount > 0 && (
                                <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200 text-xs">
                                    {releasedCount} liberada{releasedCount !== 1 ? 's' : ''}
                                </Badge>
                            )}
                        </div>
                        {totalValue > 0 && (
                            <span className="text-sm font-semibold text-muted-foreground hidden md:block">
                                {formatUF(totalValue)}
                            </span>
                        )}
                        <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-primary-500 transition-colors" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
