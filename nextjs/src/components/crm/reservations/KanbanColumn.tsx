'use client';

import { Droppable } from '@hello-pangea/dnd';
import { Badge } from '@/components/ui/badge';
import { KanbanCard } from './KanbanCard';
import type { EnrichedLeadData } from './types';

export const PIPELINE_STAGES = [
    { key: 'asesoria', title: 'Asesoría', color: 'bg-blue-500', borderColor: 'border-l-blue-500' },
    { key: 'escenarios', title: 'Escenarios', color: 'bg-cyan-500', borderColor: 'border-l-cyan-500' },
    { key: 'seguimiento', title: 'Seguimiento', color: 'bg-indigo-500', borderColor: 'border-l-indigo-500' },
    { key: 'reserva', title: 'Reserva', color: 'bg-yellow-500', borderColor: 'border-l-yellow-500' },
    { key: 'banco', title: 'Banco', color: 'bg-purple-500', borderColor: 'border-l-purple-500' },
    { key: 'aprobado', title: 'Aprobado', color: 'bg-orange-500', borderColor: 'border-l-orange-500' },
    { key: 'firma', title: 'Firma', color: 'bg-emerald-500', borderColor: 'border-l-emerald-500' },
    { key: 'OK', title: 'OK', color: 'bg-green-500', borderColor: 'border-l-green-500' },
] as const;

export type PipelineStageKey = (typeof PIPELINE_STAGES)[number]['key'];

interface KanbanColumnProps {
    stageKey: string;
    title: string;
    color: string;
    borderColor: string;
    leads: EnrichedLeadData[];
    unitCounts: Record<string, number>;
    onCardClick: (lead: EnrichedLeadData) => void;
}

export function KanbanColumn({ stageKey, title, color, borderColor, leads, unitCounts, onCardClick }: KanbanColumnProps) {
    return (
        <div className="flex flex-col w-64 shrink-0">
            {/* Column header */}
            <div className="flex items-center justify-between mb-2 px-2 py-1.5 rounded-md bg-secondary-50">
                <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                    <h3 className="font-semibold text-sm text-secondary-800">{title}</h3>
                </div>
                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    {leads.length}
                </Badge>
            </div>

            {/* Droppable area */}
            <Droppable droppableId={stageKey}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 rounded-lg border p-1.5 space-y-1.5 min-h-[120px] transition-colors ${
                            snapshot.isDraggingOver
                                ? 'border-primary-400 bg-primary-50/50'
                                : 'border-secondary-200 bg-secondary-50/30'
                        }`}
                    >
                        {leads.map((lead, index) => (
                            <KanbanCard
                                key={lead.id}
                                lead={lead}
                                index={index}
                                unitCount={unitCounts[lead.id] ?? 0}
                                onClick={() => onCardClick(lead)}
                                borderColor={borderColor}
                            />
                        ))}
                        {leads.length === 0 && (
                            <p className="text-[11px] text-secondary-400 text-center py-6">Sin clientes</p>
                        )}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
}
