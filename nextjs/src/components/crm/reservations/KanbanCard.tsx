'use client';

import { Draggable } from '@hello-pangea/dnd';
import { maxDividendo } from '@/lib/calculations/lead-financials';
import { formatCLP } from '@/components/crm/FormatCurrency';
import type { EnrichedLeadData } from './types';

interface KanbanCardProps {
    lead: EnrichedLeadData;
    index: number;
    unitCount: number;
    onClick: () => void;
}

export function KanbanCard({ lead, index, unitCount, onClick }: KanbanCardProps) {
    const maxDiv = maxDividendo(lead);

    return (
        <Draggable draggableId={lead.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onClick={onClick}
                    className={`rounded-md border bg-white p-2 shadow-sm cursor-pointer transition-shadow hover:shadow-md ${
                        snapshot.isDragging ? 'shadow-lg ring-2 ring-primary-300' : ''
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <p className="font-medium text-xs truncate">{lead.full_name}</p>
                        {unitCount > 0 && (
                            <span className="text-[10px] bg-primary-100 text-primary-700 rounded px-1">{unitCount}</span>
                        )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{lead.email}</p>
                    <p className="text-[11px] text-emerald-600 mt-0.5">Max div: {formatCLP(maxDiv)}</p>
                </div>
            )}
        </Draggable>
    );
}
