"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
} from '@tanstack/react-table';
import { createSPASassClient } from '@/lib/supabase/client';
import { Database } from '@/lib/types';
import { RPCResult } from '@/lib/crm-types';
import { useGlobal } from '@/lib/context/GlobalContext';
import { ScoreBadge } from '@/components/crm/ScoreBadge';
import { QualityBadge } from '@/components/crm/QualityBadge';
import { formatCLP, formatUF } from '@/components/crm/FormatCurrency';
import { ConfirmDialog } from '@/components/crm/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Lock, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

type LeadRow = Database['public']['Views']['leads_browsable']['Row'];

const columnHelper = createColumnHelper<LeadRow>();

export default function LeadsBrowsingPage() {
    const { refreshUser } = useGlobal();
    const [data, setData] = useState<LeadRow[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Filters
    const [qualityTier, setQualityTier] = useState<string>('');
    const [scoreMin, setScoreMin] = useState<string>('');
    const [meetingDate, setMeetingDate] = useState<string>('');

    // Pagination
    const [page, setPage] = useState(1);
    const pageSize = 20;

    const fetchLeads = useCallback(async () => {
        setLoading(true);
        try {
            const client = await createSPASassClient();
            const { data, count, error } = await client.getLeadsBrowsable({
                qualityTier: qualityTier || undefined,
                scoreMin: scoreMin ? Number(scoreMin) : undefined,
                meetingDate: meetingDate || undefined,
                page,
                pageSize,
            });
            if (error) {
                console.error('Error fetching leads:', error);
                return;
            }
            setData(data ?? []);
            setTotalCount(count ?? 0);
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    }, [qualityTier, scoreMin, meetingDate, page]);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    const handleReserve = async (leadId: string | null) => {
        if (!leadId) return;
        setActionLoading(leadId);
        try {
            const client = await createSPASassClient();
            const result: RPCResult = await client.reserveLead(leadId);
            if (result.success) {
                const lead = result.lead;
                alert(
                    `Lead reservado exitosamente!\n\nNombre: ${lead?.full_name}\nEmail: ${lead?.email}\nTelefono: ${lead?.phone}\nRUT: ${lead?.rut}`
                );
                await refreshUser();
                fetchLeads();
            } else {
                const errorMsg = result.error ?? 'Error desconocido';
                if (errorMsg.includes('INSUFFICIENT')) {
                    alert('Creditos insuficientes. Necesitas mas creditos o reservas de plan.');
                } else if (errorMsg.includes('ALREADY_RESERVED')) {
                    alert('Este lead ya fue reservado por otro vendedor.');
                    fetchLeads();
                } else if (errorMsg.includes('BEING_PROCESSED')) {
                    alert('Este lead esta siendo procesado. Intente de nuevo.');
                } else {
                    alert(`Error: ${errorMsg}`);
                }
            }
        } catch (err) {
            console.error('Reserve error:', err);
            alert('Error al reservar lead');
        } finally {
            setActionLoading(null);
        }
    };

    const columns = [
        columnHelper.accessor('score', {
            header: 'Score',
            cell: (info) => <ScoreBadge score={info.getValue()} />,
        }),
        columnHelper.accessor('quality_tier', {
            header: 'Calidad',
            cell: (info) => <QualityBadge tier={info.getValue()} />,
        }),
        columnHelper.accessor('meeting_at', {
            header: 'Reunion',
            cell: (info) => {
                const val = info.getValue();
                if (!val) return '-';
                const d = new Date(val);
                const day = d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
                const time = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
                return (
                    <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div className="leading-tight">
                            <div className="font-medium text-sm capitalize">{day}</div>
                            <div className="text-xs text-muted-foreground">{time}</div>
                        </div>
                    </div>
                );
            },
        }),
        columnHelper.accessor('age', {
            header: 'Edad',
            cell: (info) => info.getValue() ?? '-',
        }),
        columnHelper.accessor('occupation', {
            header: 'Ocupacion',
            cell: (info) => info.getValue() ?? '-',
        }),
        columnHelper.accessor('estimated_income', {
            header: 'Ingreso',
            cell: (info) => formatCLP(info.getValue()),
        }),
        columnHelper.display({
            id: 'budget',
            header: 'Presupuesto',
            cell: ({ row }) => {
                const min = row.original.budget_min;
                const max = row.original.budget_max;
                if (!min && !max) return '-';
                return `${formatUF(min)} - ${formatUF(max)}`;
            },
        }),
        columnHelper.accessor('email', {
            header: 'Email',
            cell: (info) => {
                const val = info.getValue();
                return val ? val : <Lock className="h-4 w-4 text-gray-400" />;
            },
        }),
        columnHelper.display({
            id: 'actions',
            header: 'Acciones',
            cell: ({ row }) => {
                const leadId = row.original.id;
                const isOwned = row.original.full_name != null;
                if (isOwned) return <span className="text-sm text-green-600">Reservado</span>;
                return (
                    <ConfirmDialog
                        trigger={
                            <Button
                                size="sm"
                                disabled={actionLoading === leadId}
                            >
                                {actionLoading === leadId ? 'Reservando...' : 'Reservar'}
                            </Button>
                        }
                        title="Reservar Lead"
                        description="Al reservar este lead se consumira 1 reserva de plan o 1 credito. Se revelara la informacion de contacto."
                        onConfirm={() => handleReserve(leadId)}
                        confirmText="Reservar"
                    />
                );
            },
        }),
    ];

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="p-6 space-y-4">
            <h1 className="text-2xl font-bold">Explorar Leads</h1>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-end">
                <div>
                    <label className="text-sm text-gray-500 block mb-1">Calidad</label>
                    <Select value={qualityTier} onValueChange={(v) => { setQualityTier(v === 'all' ? '' : v); setPage(1); }}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
                            <SelectItem value="hot">Hot</SelectItem>
                            <SelectItem value="warm">Warm</SelectItem>
                            <SelectItem value="cold">Cold</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <label className="text-sm text-gray-500 block mb-1">Score min.</label>
                    <Input
                        type="number"
                        className="w-[100px]"
                        placeholder="0"
                        value={scoreMin}
                        onChange={(e) => { setScoreMin(e.target.value); setPage(1); }}
                    />
                </div>
                <div>
                    <label className="text-sm text-gray-500 block mb-1">Fecha reunion</label>
                    <Input
                        type="date"
                        className="w-[160px]"
                        value={meetingDate}
                        onChange={(e) => { setMeetingDate(e.target.value); setPage(1); }}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-auto">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="text-center py-8">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                                </TableCell>
                            </TableRow>
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="text-center py-8 text-gray-500">
                                    No se encontraron leads
                                </TableCell>
                            </TableRow>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                    {totalCount} leads encontrados
                </p>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                        {page} / {totalPages || 1}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
