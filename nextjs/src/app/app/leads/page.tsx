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
import { formatCLP } from '@/components/crm/FormatCurrency';
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
import dynamic from 'next/dynamic';
import { Lock, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const LeadBrowseSidebar = dynamic(
    () => import('@/components/crm/LeadBrowseSidebar').then(m => m.LeadBrowseSidebar),
    { ssr: false }
);

type LeadRow = Database['public']['Views']['leads_browsable']['Row'];

const columnHelper = createColumnHelper<LeadRow>();

export default function LeadsBrowsingPage() {
    const { refreshUser } = useGlobal();
    const [data, setData] = useState<LeadRow[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [selectedLead, setSelectedLead] = useState<LeadRow | null>(null);

    // Filters
    const [qualityTier, setQualityTier] = useState<string>('');
    const [scoreMin, setScoreMin] = useState<string>('');
    const [rentaTotalMin, setRentaTotalMin] = useState<string>('');
    const [maxDividendoMin, setMaxDividendoMin] = useState<string>('');
    const [bancarizado, setBancarizado] = useState<string>('all');
    const [ahorros, setAhorros] = useState<string>('all');
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
                rentaTotalMin: rentaTotalMin ? Number(rentaTotalMin) : undefined,
                maxDividendoMin: maxDividendoMin ? Number(maxDividendoMin) : undefined,
                bancarizado: bancarizado === 'all' ? undefined : bancarizado === 'si',
                ahorros: ahorros === 'all' ? undefined : ahorros === 'si',
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
    }, [qualityTier, scoreMin, rentaTotalMin, maxDividendoMin, bancarizado, ahorros, meetingDate, page]);

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
            alert('Error al agendar lead');
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
        columnHelper.accessor('renta_total', {
            header: 'Renta Total',
            cell: (info) => formatCLP(info.getValue()),
        }),
        columnHelper.accessor('egresos_total', {
            header: 'Egresos Total',
            cell: (info) => formatCLP(info.getValue()),
        }),
        columnHelper.accessor('max_dividendo', {
            header: 'Max. Dividendo',
            cell: (info) => formatCLP(info.getValue()),
        }),
        columnHelper.accessor('bancarizado', {
            header: 'Bancarizado',
            cell: (info) => info.getValue() ? 'Si' : 'No',
        }),
        columnHelper.accessor('ahorros', {
            header: 'Ahorros',
            cell: (info) => info.getValue() ? 'Con' : 'Sin',
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
                                {actionLoading === leadId ? 'Agendando...' : 'Agendar'}
                            </Button>
                        }
                        title="Agendar Lead"
                        description="Al Agendar este lead se consumira 1 reserva de plan o 1 credito. Se revelara la informacion de contacto."
                        onConfirm={() => handleReserve(leadId)}
                        confirmText="Agendar"
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
                    <label className="text-sm text-gray-500 block mb-1">Renta Total min.</label>
                    <Input
                        type="number"
                        className="w-[140px]"
                        placeholder="0"
                        value={rentaTotalMin}
                        onChange={(e) => { setRentaTotalMin(e.target.value); setPage(1); }}
                    />
                </div>
                <div>
                    <label className="text-sm text-gray-500 block mb-1">Max Dividendo min.</label>
                    <Input
                        type="number"
                        className="w-[140px]"
                        placeholder="0"
                        value={maxDividendoMin}
                        onChange={(e) => { setMaxDividendoMin(e.target.value); setPage(1); }}
                    />
                </div>
                <div>
                    <label className="text-sm text-gray-500 block mb-1">Bancarizado</label>
                    <Select value={bancarizado} onValueChange={(v) => { setBancarizado(v); setPage(1); }}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="si">Si</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <label className="text-sm text-gray-500 block mb-1">Ahorros</label>
                    <Select value={ahorros} onValueChange={(v) => { setAhorros(v); setPage(1); }}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="si">Con</SelectItem>
                            <SelectItem value="no">Sin</SelectItem>
                        </SelectContent>
                    </Select>
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

            <div className="flex gap-6">
                {/* Table */}
                <div className="flex-1 min-w-0 space-y-4">
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
                                        <TableRow
                                            key={row.id}
                                            className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                                                selectedLead?.id === row.original.id ? 'bg-muted' : ''
                                            }`}
                                            onClick={() => setSelectedLead(row.original)}
                                        >
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

                {/* Sidebar */}
                {selectedLead && (
                    <LeadBrowseSidebar
                        lead={selectedLead}
                        onClose={() => setSelectedLead(null)}
                        onReserve={(leadId) => handleReserve(leadId)}
                        reserving={actionLoading === selectedLead?.id}
                    />
                )}
            </div>
        </div>
    );
}
