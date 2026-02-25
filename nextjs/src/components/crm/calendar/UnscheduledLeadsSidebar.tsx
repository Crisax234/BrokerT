'use client';

import { Card, CardContent } from '@/components/ui/card';
import { QualityBadge } from '@/components/crm/QualityBadge';
import { ScoreBadge } from '@/components/crm/ScoreBadge';
import { Mail, Phone } from 'lucide-react';
import Link from 'next/link';
import type { Database } from '@/lib/types';

type LeadRow = Database['public']['Tables']['leads']['Row'];

interface UnscheduledLeadsSidebarProps {
    leads: LeadRow[];
    onSelectLead: (lead: LeadRow) => void;
    totalLeads: number;
}

export function UnscheduledLeadsSidebar({ leads, onSelectLead, totalLeads }: UnscheduledLeadsSidebarProps) {
    return (
        <div className="w-full lg:w-80 shrink-0">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                Sin reunion ({leads.length})
            </h3>
            <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                {leads.length === 0 && totalLeads === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No tienes leads reservados.{' '}
                        <Link href="/app/leads" className="text-primary-600 underline">
                            Explorar leads
                        </Link>
                    </p>
                ) : leads.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        Todos los leads tienen reunion agendada.
                    </p>
                ) : (
                    leads.map((lead) => (
                        <Card
                            key={lead.id}
                            className="cursor-pointer hover:bg-accent/50 transition-colors"
                            onClick={() => onSelectLead(lead)}
                        >
                            <CardContent className="p-3 space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-sm truncate">{lead.full_name}</span>
                                    <div className="flex gap-1 shrink-0">
                                        <QualityBadge tier={lead.quality_tier} />
                                        <ScoreBadge score={lead.score} />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                        <Mail className="h-3 w-3" />
                                        <span className="truncate">{lead.email ?? '-'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Phone className="h-3 w-3" />
                                        <span>{lead.phone ?? '-'}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
