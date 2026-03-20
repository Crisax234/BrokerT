'use client';

import { cn } from '@/lib/utils';
import type { ReservedLead } from '@/lib/crm-types';

export interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    lead: ReservedLead;
}

const tierBorderColor: Record<string, string> = {
    premium: 'border-l-purple-500',
    hot: 'border-l-red-500',
    warm: 'border-l-orange-500',
    cold: 'border-l-blue-500',
};

export function CalendarEventComponent({ event }: { event: CalendarEvent }) {
    const tier = event.lead.quality_tier ?? '';
    const borderClass = tierBorderColor[tier] ?? 'border-l-gray-400';

    return (
        <div
            className={cn(
                'border-l-2 pl-1 truncate text-xs leading-tight',
                borderClass
            )}
            title={`${event.title} (${tier})`}
        >
            {event.title}
        </div>
    );
}
