'use client';

import { useState, useEffect, useMemo } from 'react';
import { createSPASassClient } from '@/lib/supabase/client';
import { ReservedLead } from '@/lib/crm-types';
import { QualityBadge } from '@/components/crm/QualityBadge';
import { ScoreBadge } from '@/components/crm/ScoreBadge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { User, Mail, MapPin, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface LeadPickerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (leadId: string, leadName: string) => void;
}

export function LeadPickerDialog({ open, onOpenChange, onSelect }: LeadPickerDialogProps) {
    const [leads, setLeads] = useState<ReservedLead[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!open) return;
        setSearchQuery('');
        let cancelled = false;
        async function load() {
            setLoading(true);
            try {
                const client = await createSPASassClient();
                const { data } = await client.getMyReservedLeads();
                if (!cancelled) setLeads((data as ReservedLead[]) ?? []);
            } catch (err) {
                console.error('Error fetching reserved leads:', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => { cancelled = true; };
    }, [open]);

    const filteredLeads = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return leads;
        return leads.filter((lead) =>
            lead.full_name?.toLowerCase().includes(q) ||
            lead.email?.toLowerCase().includes(q) ||
            lead.current_commune?.toLowerCase().includes(q)
        );
    }, [leads, searchQuery]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Seleccionar Lead</DialogTitle>
                    <DialogDescription>
                        Elige el lead al que se vincularán las unidades reservadas.
                    </DialogDescription>
                </DialogHeader>

                {!loading && leads.length > 0 && (
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre, email o comuna..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                            autoFocus
                        />
                    </div>
                )}

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                        </div>
                    ) : leads.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <User className="h-10 w-10 mx-auto mb-2 opacity-40" />
                            <p className="font-medium">No tienes leads reservados</p>
                            <p className="text-sm mt-1">Reserva un lead primero desde la sección de Leads.</p>
                        </div>
                    ) : filteredLeads.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground">
                            <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">Sin resultados para &ldquo;{searchQuery}&rdquo;</p>
                        </div>
                    ) : (
                        filteredLeads.map((lead) => (
                            <button
                                key={lead.id}
                                type="button"
                                className="w-full text-left border rounded-lg p-3 hover:bg-accent hover:border-primary-300 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                                onClick={() => {
                                    onSelect(lead.id, lead.full_name);
                                    onOpenChange(false);
                                }}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-sm">{lead.full_name}</span>
                                    <div className="flex items-center gap-1">
                                        <QualityBadge tier={lead.quality_tier} />
                                        <ScoreBadge score={lead.score} />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    {lead.email && (
                                        <span className="flex items-center gap-1">
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
                            </button>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
