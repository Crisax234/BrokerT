'use client';

import { Draggable } from '@hello-pangea/dnd';
import { Badge } from '@/components/ui/badge';
import { QualityBadge } from '@/components/crm/QualityBadge';
import { ScoreBadge } from '@/components/crm/ScoreBadge';
import type { EnrichedLeadData } from './types';

interface KanbanCardProps {
    lead: EnrichedLeadData;
    index: number;
    unitCount: number;
    onClick: () => void;
}

export function KanbanCard({ lead, index, unitCount, onClick }: KanbanCardProps) {
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
                    <div className="flex items-center gap-1 min-w-0">
                        <p className="font-medium text-xs truncate flex-1">{lead.full_name}</p>
                        {unitCount > 0 && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] px-1 py-0 shrink-0">
                                {unitCount}
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                        <QualityBadge tier={lead.quality_tier} />
                        <ScoreBadge score={lead.score} />
                    </div>
                </div>
            )}
        </Draggable>
    );
}
