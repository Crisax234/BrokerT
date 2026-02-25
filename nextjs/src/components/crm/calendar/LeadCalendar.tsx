'use client';

import { useMemo, useCallback, useState } from 'react';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale/es';
import type { Database } from '@/lib/types';
import type { CalendarEvent } from './CalendarEventComponent';
import { CalendarEventComponent } from './CalendarEventComponent';
import { CalendarToolbar } from './CalendarToolbar';

import 'react-big-calendar/lib/css/react-big-calendar.css';
import './calendar-styles.css';

type LeadRow = Database['public']['Tables']['leads']['Row'];

const locales = { es };

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
    getDay,
    locales,
});

const messages = {
    allDay: 'Todo el dia',
    previous: 'Anterior',
    next: 'Siguiente',
    today: 'Hoy',
    month: 'Mes',
    week: 'Semana',
    day: 'Dia',
    agenda: 'Agenda',
    date: 'Fecha',
    time: 'Hora',
    event: 'Evento',
    noEventsInRange: 'Sin reuniones en este rango.',
    showMore: (total: number) => `+${total} mas`,
};

interface LeadCalendarProps {
    leads: LeadRow[];
    onSelectLead: (lead: LeadRow) => void;
}

export function LeadCalendar({ leads, onSelectLead }: LeadCalendarProps) {
    const [view, setView] = useState<View>('month');
    const [date, setDate] = useState(new Date());

    const events: CalendarEvent[] = useMemo(
        () =>
            leads.map((lead) => {
                const start = new Date(lead.meeting_at!);
                const end = new Date(start.getTime() + 60 * 60 * 1000);
                return {
                    id: lead.id,
                    title: lead.full_name,
                    start,
                    end,
                    lead,
                };
            }),
        [leads]
    );

    const handleSelectEvent = useCallback(
        (event: CalendarEvent) => onSelectLead(event.lead),
        [onSelectLead]
    );

    const eventPropGetter = useCallback((event: CalendarEvent) => {
        const tier = event.lead.quality_tier;
        const colorMap: Record<string, string> = {
            premium: '#9333ea',
            hot: '#dc2626',
            warm: '#ea580c',
            cold: '#2563eb',
        };
        return {
            style: {
                backgroundColor: colorMap[tier ?? ''] ?? 'hsl(var(--primary))',
                border: 'none',
            },
        };
    }, []);

    return (
        <div className="flex-1 min-w-0">
            <Calendar<CalendarEvent>
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 650 }}
                view={view}
                onView={setView}
                date={date}
                onNavigate={setDate}
                onSelectEvent={handleSelectEvent}
                eventPropGetter={eventPropGetter}
                components={{
                    toolbar: CalendarToolbar,
                    event: CalendarEventComponent,
                }}
                messages={messages}
                culture="es"
                popup
                views={['month', 'week', 'day']}
            />
        </div>
    );
}
