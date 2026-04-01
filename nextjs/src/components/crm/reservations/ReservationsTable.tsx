'use client';

import React, { useMemo, useState, useCallback } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    flexRender,
    createColumnHelper,
    type ColumnFiltersState,
    type Column,
} from '@tanstack/react-table';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatUF } from '@/components/crm/FormatCurrency';
import { PIPELINE_STAGES } from './KanbanColumn';
import { seededPick, seededBool } from './seededRandom';
import { CheckCircle2, ListFilter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EnrichedLeadData, ReservationRow } from './types';
import type { SavedEscenario } from '@/app/app/reservations/ReservationsClient';

// ── Row type — all values precomputed for filtering ─────
type ClientTableRow = {
    lead: EnrichedLeadData;
    companyName: string;
    projectName: string;
    unitNumbers: string;
    totalUF: number | null;
    hasReservation: boolean;
    creditPct: number | null;
    confPlanPago: string;
    cartaInformeBanco: string;
    cartaPreAprobacion: string;
    tipoCarta: string;
    entidadBancaria: string;
    porcentaje: number;
    asesorOk: boolean;
    solPromesas: string;
    enroladoPagado: boolean;
    promesaFirmada: boolean;
    promesaEnviada: boolean;
    cierreCliente: string;
    estado: string;
    dias: number | null;
};

type FilterType = 'text' | 'select' | 'bool' | 'number' | 'date' | 'none';
type FilterMeta = { filter: FilterType; options?: string[] };

// ── Helpers ─────────────────────────────────────────────

const stageMap = Object.fromEntries(
    PIPELINE_STAGES.map((s) => [s.key, s.title]),
);

function formatDateES(dateStr: string | null): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function computeDays(dateStr: string | null): number | null {
    if (!dateStr) return null;
    return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000));
}

function BoolCheck({ value }: { value: boolean }) {
    return (
        <CheckCircle2
            className={cn('h-4 w-4 mx-auto', value ? 'text-green-500' : 'text-gray-300')}
        />
    );
}

const ESTADO_STYLES: Record<string, string> = {
    'faltan docs': 'bg-red-100 text-red-700',
    pendiente: 'bg-yellow-100 text-yellow-700',
    'en gestion': 'bg-blue-100 text-blue-700',
    pagado: 'bg-green-100 text-green-700',
};

function EstadoBadge({ value }: { value: string }) {
    return (
        <span
            className={cn(
                'inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
                ESTADO_STYLES[value] ?? 'bg-gray-100 text-gray-700',
            )}
        >
            {value}
        </span>
    );
}

// ── Filter widgets (rendered inside dropdowns) ──────────

function TextFilterWidget({ column }: { column: Column<ClientTableRow, unknown> }) {
    const val = (column.getFilterValue() as string) ?? '';
    return (
        <div className="p-2 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Filtrar por texto</p>
            <Input
                autoFocus
                value={val}
                onChange={(e) => column.setFilterValue(e.target.value || undefined)}
                placeholder="Escribir..."
                className="h-7 text-xs"
            />
        </div>
    );
}

function SelectFilterWidget({
    column,
    options,
}: {
    column: Column<ClientTableRow, unknown>;
    options: string[];
}) {
    const val = (column.getFilterValue() as string) ?? '';
    return (
        <div className="p-2 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Filtrar por valor</p>
            <Select
                value={val || '__all__'}
                onValueChange={(v) => column.setFilterValue(v === '__all__' ? undefined : v)}
            >
                <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    {options.map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

function BoolFilterWidget({ column }: { column: Column<ClientTableRow, unknown> }) {
    const val = column.getFilterValue() as string | undefined;
    return (
        <div className="p-2 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Filtrar</p>
            <Select
                value={val ?? '__all__'}
                onValueChange={(v) => column.setFilterValue(v === '__all__' ? undefined : v)}
            >
                <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    <SelectItem value="true">Si</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}

function NumberFilterWidget({ column }: { column: Column<ClientTableRow, unknown> }) {
    const range = (column.getFilterValue() as [string, string]) ?? ['', ''];
    return (
        <div className="p-2 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Rango</p>
            <div className="flex gap-1.5 items-center">
                <Input
                    type="number"
                    value={range[0]}
                    onChange={(e) => {
                        const next: [string, string] = [e.target.value, range[1]];
                        column.setFilterValue(next[0] || next[1] ? next : undefined);
                    }}
                    placeholder="Min"
                    className="h-7 text-xs w-20"
                />
                <span className="text-xs text-muted-foreground">-</span>
                <Input
                    type="number"
                    value={range[1]}
                    onChange={(e) => {
                        const next: [string, string] = [range[0], e.target.value];
                        column.setFilterValue(next[0] || next[1] ? next : undefined);
                    }}
                    placeholder="Max"
                    className="h-7 text-xs w-20"
                />
            </div>
        </div>
    );
}

function DateFilterWidget({ column }: { column: Column<ClientTableRow, unknown> }) {
    const range = (column.getFilterValue() as [string, string]) ?? ['', ''];
    return (
        <div className="p-2 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Rango de fecha</p>
            <div className="space-y-1">
                <Input
                    type="date"
                    value={range[0]}
                    onChange={(e) => {
                        const next: [string, string] = [e.target.value, range[1]];
                        column.setFilterValue(next[0] || next[1] ? next : undefined);
                    }}
                    className="h-7 text-xs"
                />
                <Input
                    type="date"
                    value={range[1]}
                    onChange={(e) => {
                        const next: [string, string] = [range[0], e.target.value];
                        column.setFilterValue(next[0] || next[1] ? next : undefined);
                    }}
                    className="h-7 text-xs"
                />
            </div>
        </div>
    );
}

// ── Filter functions ────────────────────────────────────

function boolFilterFn(row: { getValue: (id: string) => unknown }, columnId: string, filterValue: string) {
    const val = row.getValue(columnId) as boolean;
    return filterValue === 'true' ? val : !val;
}

function numberRangeFilterFn(row: { getValue: (id: string) => unknown }, columnId: string, filterValue: [string, string]) {
    const val = row.getValue(columnId) as number | null;
    if (val == null) return false;
    const [minStr, maxStr] = filterValue;
    const min = minStr ? Number(minStr) : -Infinity;
    const max = maxStr ? Number(maxStr) : Infinity;
    return val >= min && val <= max;
}

function dateRangeFilterFn(row: { getValue: (id: string) => unknown }, columnId: string, filterValue: [string, string]) {
    const val = row.getValue(columnId) as string | null;
    if (!val) return false;
    const date = val.slice(0, 10); // YYYY-MM-DD
    const [from, to] = filterValue;
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
}

// ── Column definitions ──────────────────────────────────

const col = createColumnHelper<ClientTableRow>();

const columns = [
    col.accessor((r) => r.lead.full_name, {
        id: 'nombre', header: 'Nombre',
        meta: { filter: 'text' } as FilterMeta,
    }),
    col.accessor((r) => stageMap[r.lead.pipeline_stage] ?? r.lead.pipeline_stage, {
        id: 'etapa', header: 'Etapa',
        meta: { filter: 'select', options: PIPELINE_STAGES.map((s) => s.title) } as FilterMeta,
    }),
    col.accessor((r) => r.lead.email ?? '', {
        id: 'mail', header: 'Mail',
        cell: (info) => info.getValue() || '-',
        meta: { filter: 'text' } as FilterMeta,
    }),
    col.accessor('companyName', {
        header: 'Inmobiliaria',
        cell: (info) => info.getValue() || '-',
        meta: { filter: 'text' } as FilterMeta,
    }),
    col.accessor('projectName', {
        header: 'Proyecto',
        cell: (info) => info.getValue() || '-',
        meta: { filter: 'text' } as FilterMeta,
    }),
    col.accessor('unitNumbers', {
        header: 'Dpto',
        cell: (info) => info.getValue() || '-',
        meta: { filter: 'text' } as FilterMeta,
    }),
    col.accessor('totalUF', {
        header: 'UF Final',
        cell: (info) => formatUF(info.getValue()),
        filterFn: numberRangeFilterFn,
        meta: { filter: 'number' } as FilterMeta,
    }),
    col.display({ id: 'referidos', header: 'Referidos', cell: () => '-', meta: { filter: 'none' } as FilterMeta }),
    col.display({ id: 'ejecutivo', header: 'Ejecutivo', cell: () => '-', meta: { filter: 'none' } as FilterMeta }),
    col.accessor((r) => r.lead.reserved_at, {
        id: 'fecha_reserva', header: 'Fecha reserva',
        cell: (info) => formatDateES(info.getValue() ?? null),
        filterFn: dateRangeFilterFn,
        meta: { filter: 'date' } as FilterMeta,
    }),
    col.accessor((r) => r.lead.reserved_at, {
        id: 'fecha_ingreso_inm', header: 'Fecha ingreso inm',
        cell: (info) => formatDateES(info.getValue() ?? null),
        filterFn: dateRangeFilterFn,
        meta: { filter: 'date' } as FilterMeta,
    }),
    col.accessor('hasReservation', {
        header: 'Valores conf.',
        cell: (info) => <BoolCheck value={info.getValue()} />,
        filterFn: boolFilterFn,
        meta: { filter: 'bool' } as FilterMeta,
    }),
    col.display({
        id: 'docs_bancarios', header: 'Docs bancarios',
        cell: () => <BoolCheck value={false} />,
        meta: { filter: 'none' } as FilterMeta,
    }),
    col.accessor('confPlanPago', {
        header: 'Conf. plan pago',
        meta: { filter: 'select', options: ['confirmado', 'pendiente'] } as FilterMeta,
    }),
    col.accessor('cartaInformeBanco', {
        header: 'Carta informe banco',
        meta: { filter: 'select', options: ['enviada', 'pendiente', 'no enviada'] } as FilterMeta,
    }),
    col.accessor('cartaPreAprobacion', {
        header: 'Carta pre aprob.',
        meta: { filter: 'select', options: ['sin avance', 'en revision', 'aprobada'] } as FilterMeta,
    }),
    col.accessor('tipoCarta', {
        header: 'Tipo de carta',
        meta: { filter: 'select', options: ['pre aprobada', 'sin carta', 'carta bancaria'] } as FilterMeta,
    }),
    col.accessor('entidadBancaria', {
        header: 'Entidad bancaria',
        meta: { filter: 'select', options: ['Santander', 'BCI', 'Itau'] } as FilterMeta,
    }),
    col.accessor('porcentaje', {
        header: '%',
        cell: (info) => {
            const r = info.row.original;
            if (r.creditPct != null) return Math.round(r.creditPct * 100) + '%';
            return info.getValue() + '%';
        },
        meta: { filter: 'select', options: ['70', '75', '80', '85'] } as FilterMeta,
        filterFn: (row, columnId, filterValue) => String(row.getValue(columnId)) === filterValue,
    }),
    col.accessor('asesorOk', {
        header: 'Asesor OK',
        cell: (info) => <BoolCheck value={info.getValue()} />,
        filterFn: boolFilterFn,
        meta: { filter: 'bool' } as FilterMeta,
    }),
    col.accessor('solPromesas', {
        header: 'Sol. promesas',
        meta: { filter: 'select', options: ['enviada', 'no enviada', 'pendiente'] } as FilterMeta,
    }),
    col.accessor('enroladoPagado', {
        header: 'Enrolado y pagado',
        cell: (info) => <BoolCheck value={info.getValue()} />,
        filterFn: boolFilterFn,
        meta: { filter: 'bool' } as FilterMeta,
    }),
    col.accessor('promesaFirmada', {
        header: 'Promesa firmada',
        cell: (info) => <BoolCheck value={info.getValue()} />,
        filterFn: boolFilterFn,
        meta: { filter: 'bool' } as FilterMeta,
    }),
    col.accessor('promesaEnviada', {
        header: 'Promesa enviada',
        cell: (info) => <BoolCheck value={info.getValue()} />,
        filterFn: boolFilterFn,
        meta: { filter: 'bool' } as FilterMeta,
    }),
    col.accessor('cierreCliente', {
        header: 'Cierre cliente',
        meta: { filter: 'select', options: ['abierto', 'cerrado', 'seguimiento', 'listo firma'] } as FilterMeta,
    }),
    col.accessor('estado', {
        header: 'Estado',
        cell: (info) => <EstadoBadge value={info.getValue()} />,
        meta: { filter: 'select', options: ['faltan docs', 'pendiente', 'en gestion', 'pagado'] } as FilterMeta,
    }),
    col.accessor('dias', {
        header: 'Dias',
        cell: (info) => { const v = info.getValue(); return v != null ? String(v) : '-'; },
        filterFn: numberRangeFilterFn,
        meta: { filter: 'number' } as FilterMeta,
    }),
];

// ── Filterable header with dropdown ─────────────────────

function FilterableHeader({ column, label }: { column: Column<ClientTableRow, unknown>; label: string }) {
    const meta = column.columnDef.meta as FilterMeta | undefined;
    const isFilterable = meta && meta.filter !== 'none';
    const isActive = column.getIsFiltered();

    if (!isFilterable) {
        return <span>{label}</span>;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className={cn(
                        'flex items-center gap-1 hover:text-foreground transition-colors w-full text-left',
                        isActive ? 'text-primary-600 font-semibold' : 'text-muted-foreground',
                    )}
                >
                    {label}
                    <ListFilter
                        className={cn(
                            'h-3 w-3 shrink-0',
                            isActive ? 'text-primary-600' : 'opacity-40',
                        )}
                    />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52" onCloseAutoFocus={(e) => e.preventDefault()}>
                <FilterWidget column={column} meta={meta} />
                {isActive && (
                    <div className="px-2 pb-2">
                        <button
                            onClick={() => column.setFilterValue(undefined)}
                            className="text-xs text-red-500 hover:underline flex items-center gap-1"
                        >
                            <X className="h-3 w-3" /> Quitar filtro
                        </button>
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function FilterWidget({ column, meta }: { column: Column<ClientTableRow, unknown>; meta: FilterMeta }) {
    switch (meta.filter) {
        case 'text': return <TextFilterWidget column={column} />;
        case 'select': return <SelectFilterWidget column={column} options={meta.options ?? []} />;
        case 'bool': return <BoolFilterWidget column={column} />;
        case 'number': return <NumberFilterWidget column={column} />;
        case 'date': return <DateFilterWidget column={column} />;
        default: return null;
    }
}

// ── Component ───────────────────────────────────────────

interface ReservationsTableProps {
    leads: EnrichedLeadData[];
    allReservations: ReservationRow[];
    escenarios: SavedEscenario[];
    onRowClick: (lead: EnrichedLeadData) => void;
}

export function ReservationsTable({
    leads,
    allReservations,
    escenarios,
    onRowClick,
}: ReservationsTableProps) {
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

    const escenarioByLead = useMemo(() => {
        const map = new Map<string, SavedEscenario>();
        for (const esc of escenarios) {
            if (esc.lead_id && !map.has(esc.lead_id)) {
                map.set(esc.lead_id, esc);
            }
        }
        return map;
    }, [escenarios]);

    const rows = useMemo<ClientTableRow[]>(() => {
        return leads.map((lead) => {
            const leadReservations = allReservations.filter(
                (r) =>
                    r.lead_id === lead.id &&
                    (r.status === 'active' || r.status === 'in_progress' || r.status === 'sold'),
            );

            const unitNumbers = leadReservations
                .map((r) => r.units?.unit_number)
                .filter(Boolean)
                .join(', ');

            const totalUF = leadReservations.reduce(
                (sum, r) => sum + (r.units?.final_price ?? 0),
                0,
            );

            const companies = new Set<string>();
            const projects = new Set<string>();
            for (const r of leadReservations) {
                const proj = r.units?.projects;
                if (proj) {
                    projects.add(proj.name);
                    const co = proj.real_estate_companies;
                    if (co) companies.add(co.display_name ?? co.name);
                }
            }

            const esc = escenarioByLead.get(lead.id);
            let creditPct: number | null = null;
            if (esc?.results) {
                const scenarios = esc.results.scenarios as
                    | Array<{ credit_pct?: number }>
                    | undefined;
                if (scenarios?.[0]?.credit_pct != null) {
                    creditPct = scenarios[0].credit_pct;
                }
            }

            const id = lead.id;

            return {
                lead,
                companyName: [...companies].join(', '),
                projectName: [...projects].join(', '),
                unitNumbers,
                totalUF: totalUF > 0 ? totalUF : null,
                hasReservation: leadReservations.length > 0,
                creditPct,
                confPlanPago: seededPick(id, 0, ['confirmado', 'pendiente']),
                cartaInformeBanco: seededPick(id, 1, ['enviada', 'pendiente', 'no enviada']),
                cartaPreAprobacion: seededPick(id, 2, ['sin avance', 'en revision', 'aprobada']),
                tipoCarta: seededPick(id, 3, ['pre aprobada', 'sin carta', 'carta bancaria']),
                entidadBancaria: seededPick(id, 4, ['Santander', 'BCI', 'Itau']),
                porcentaje: seededPick(id, 5, [70, 75, 80, 85]),
                asesorOk: seededBool(id, 6),
                solPromesas: seededPick(id, 7, ['enviada', 'no enviada', 'pendiente']),
                enroladoPagado: seededBool(id, 8),
                promesaFirmada: seededBool(id, 9),
                promesaEnviada: seededBool(id, 10),
                cierreCliente: seededPick(id, 11, ['abierto', 'cerrado', 'seguimiento', 'listo firma']),
                estado: seededPick(id, 12, ['faltan docs', 'pendiente', 'en gestion', 'pagado']),
                dias: computeDays(lead.meeting_at),
            };
        });
    }, [leads, allReservations, escenarioByLead]);

    const hasActiveFilters = columnFilters.length > 0;
    const clearAllFilters = useCallback(() => setColumnFilters([]), []);

    const table = useReactTable({
        data: rows,
        columns,
        state: { columnFilters },
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    return (
        <div className="space-y-2">
            {hasActiveFilters && (
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                        {table.getFilteredRowModel().rows.length} de {rows.length} clientes
                    </span>
                    <button onClick={clearAllFilters} className="text-xs text-primary-600 hover:underline">
                        Limpiar filtros
                    </button>
                </div>
            )}
            <div className="border rounded-lg overflow-x-auto">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((hg) => (
                            <TableRow key={hg.id}>
                                {hg.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        className={cn(
                                            'whitespace-nowrap text-xs px-2 py-2',
                                            header.id === 'nombre' && 'sticky left-0 z-20 bg-muted',
                                        )}
                                    >
                                        {header.isPlaceholder ? null : (
                                            <FilterableHeader
                                                column={header.column}
                                                label={flexRender(header.column.columnDef.header, header.getContext()) as string}
                                            />
                                        )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getFilteredRowModel().rows.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="text-center py-8 text-muted-foreground"
                                >
                                    {hasActiveFilters
                                        ? 'No hay resultados con los filtros aplicados.'
                                        : 'No hay datos para mostrar.'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            table.getFilteredRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => onRowClick(row.original.lead)}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell
                                            key={cell.id}
                                            className={cn(
                                                'whitespace-nowrap text-xs px-2 py-1.5',
                                                cell.column.id === 'nombre' &&
                                                    'sticky left-0 z-10 bg-background font-medium',
                                            )}
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
