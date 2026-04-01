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
    borderColor: string;
}

export function KanbanCard({ lead, index, unitCount, onClick, borderColor }: KanbanCardProps) {
    const maxDiv = maxDividendo(lead);

    return (
        <Draggable draggableId={lead.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onClick={onClick}
                    className={`rounded-md border border-l-[3px] ${borderColor} bg-white p-2.5 shadow-sm cursor-pointer transition-shadow hover:shadow-md ${
                        snapshot.isDragging ? 'shadow-lg ring-2 ring-primary-300' : ''
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate text-secondary-900">{lead.full_name}</p>
                        {unitCount > 0 && (
                            <span className="text-[10px] bg-primary-100 text-primary-700 rounded px-1 ml-1 flex-shrink-0">{unitCount}</span>
                        )}
                    </div>
                    <p className="text-[11px] text-secondary-400 truncate mt-0.5">{lead.email}</p>
                    <p className="text-[11px] font-medium text-primary-700 mt-0.5">Max div: {formatCLP(maxDiv)}</p>
                </div>
            )}
        </Draggable>
    );
}
