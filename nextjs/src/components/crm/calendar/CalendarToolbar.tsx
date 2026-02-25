'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ToolbarProps, View } from 'react-big-calendar';
import type { CalendarEvent } from './CalendarEventComponent';

const viewLabels: Record<string, string> = {
    month: 'Mes',
    week: 'Semana',
    day: 'Dia',
};

export function CalendarToolbar(props: ToolbarProps<CalendarEvent, object>) {
    const { label, onNavigate, onView, view } = props;

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => onNavigate('TODAY')}>
                    Hoy
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onNavigate('PREV')}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onNavigate('NEXT')}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="text-sm font-semibold capitalize">{label}</span>
            </div>
            <div className="flex items-center gap-1">
                {(['month', 'week', 'day'] as View[]).map((v) => (
                    <Button
                        key={v}
                        variant={view === v ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onView(v)}
                    >
                        {viewLabels[v]}
                    </Button>
                ))}
            </div>
        </div>
    );
}
