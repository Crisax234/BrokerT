'use client';

import { Droppable } from '@hello-pangea/dnd';
import { Badge } from '@/components/ui/badge';
import { KanbanCard } from './KanbanCard';
import type { EnrichedLeadData } from './types';

export const PIPELINE_STAGES = [
    { key: 'asesoria', title: 'Asesoría', color: 'bg-blue-500' },
    { key: 'escenarios', title: 'Escenarios', color: 'bg-cyan-500' },
    { key: 'seguimiento', title: 'Seguimiento', color: 'bg-indigo-500' },
    { key: 'reserva', title: 'Reserva', color: 'bg-yellow-500' },
    { key: 'banco', title: 'Banco', color: 'bg-purple-500' },
    { key: 'aprobado', title: 'Aprobado', color: 'bg-orange-500' },
    { key: 'firma', title: 'Firma', color: 'bg-emerald-500' },
    { key: 'OK', title: 'OK', color: 'bg-green-500' },
] as const;

export type PipelineStageKey = (typeof PIPELINE_STAGES)[number]['key'];

interface KanbanColumnProps {
    stageKey: string;
    title: string;
    color: string;
    leads: EnrichedLeadData[];
    unitCounts: Record<string, number>;
    onCardClick: (lead: EnrichedLeadData) => void;
}

export function KanbanColumn({ stageKey, title, color, leads, unitCounts, onCardClick }: KanbanColumnProps) {
    return (
        <div className="flex flex-col w-48 shrink-0">
            {/* Column header */}
            <div className="flex items-center gap-1.5 mb-2 px-1">
                <div className={`w-2 h-2 rounded-full ${color}`} />
                <h3 className="font-semibold text-xs">{title}</h3>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {leads.length}
                </Badge>
            </div>

            {/* Droppable area */}
            <Droppable droppableId={stageKey}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 rounded-lg border-2 border-dashed p-1.5 space-y-1.5 min-h-[120px] transition-colors ${
                            snapshot.isDraggingOver
                                ? 'border-primary-400 bg-primary-50/50'
                                : 'border-gray-200 bg-gray-50/50'
                        }`}
                    >
                        {leads.map((lead, index) => (
                            <KanbanCard
                                key={lead.id}
                                lead={lead}
                                index={index}
                                unitCount={unitCounts[lead.id] ?? 0}
                                onClick={() => onCardClick(lead)}
                            />
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
}
