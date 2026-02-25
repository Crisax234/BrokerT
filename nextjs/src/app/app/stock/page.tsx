"use client";

import React, { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { createSPASassClient } from '@/lib/supabase/client';
import { Database } from '@/lib/types';
import { RPCResult } from '@/lib/crm-types';
import { useGlobal } from '@/lib/context/GlobalContext';
import { formatUF } from '@/components/crm/FormatCurrency';
import { StatusBadge } from '@/components/crm/StatusBadge';
import { ConfirmDialog } from '@/components/crm/ConfirmDialog';
import { Button } from '@/components/ui/button';
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
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

type UnitRow = Database['public']['Tables']['units']['Row'] & {
    projects: {
        name: string;
        commune: string;
        real_estate_companies: { name: string; display_name: string | null } | null;
    } | null;
};

type ProjectRow = Database['public']['Tables']['projects']['Row'] & {
    real_estate_companies: { name: string; display_name: string | null } | null;
};

export default function StockPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        }>
            <StockPageContent />
        </Suspense>
    );
}

function StockPageContent() {
    const searchParams = useSearchParams();
    const leadId = searchParams.get('leadId');
    const { refreshUser } = useGlobal();

    const [units, setUnits] = useState<UnitRow[]>([]);
    const [projects, setProjects] = useState<ProjectRow[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Filters
    const [companyId, setCompanyId] = useState<string>('');
    const [projectId, setProjectId] = useState<string>('');
    const [typology, setTypology] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('available');

    // Pagination
    const [page, setPage] = useState(1);
    const pageSize = 50;

    const fetchProjects = useCallback(async () => {
        try {
            const client = await createSPASassClient();
            const { data } = await client.getProjects();
            setProjects((data as ProjectRow[]) ?? []);
        } catch (err) {
            console.error('Error fetching projects:', err);
        }
    }, []);

    const fetchUnits = useCallback(async () => {
        setLoading(true);
        try {
            const client = await createSPASassClient();
            const statusIn = statusFilter === 'all' ? undefined : statusFilter === 'browsable' ? ['available', 'sin_abono'] : [statusFilter];
            const { data, count, error } = await client.getUnits({
                projectId: projectId || undefined,
                companyId: companyId || undefined,
                typology: typology || undefined,
                statusIn,
                page,
                pageSize,
            });
            if (error) {
                console.error('Error fetching units:', error);
                return;
            }
            setUnits((data as UnitRow[]) ?? []);
            setTotalCount(count ?? 0);
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    }, [companyId, projectId, typology, statusFilter, page]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    useEffect(() => {
        fetchUnits();
    }, [fetchUnits]);

    const handleReserve = async (unitId: string) => {
        setActionLoading(unitId);
        try {
            const client = await createSPASassClient();
            const result: RPCResult = await client.reserveUnit(unitId, leadId ?? undefined);
            if (result.success) {
                alert(`Unidad reservada exitosamente!\nReservacion ID: ${result.reservation_id ?? '-'}`);
                await refreshUser();
                fetchUnits();
            } else {
                const err = result.error ?? 'Error desconocido';
                if (err.includes('ALREADY_RESERVED') || err.includes('NOT_AVAILABLE')) {
                    alert('Esta unidad ya no esta disponible.');
                    fetchUnits();
                } else {
                    alert(`Error: ${err}`);
                }
            }
        } catch (err) {
            console.error('Reserve error:', err);
            alert('Error al reservar unidad');
        } finally {
            setActionLoading(null);
        }
    };

    // Derive unique companies from projects
    const companies = useMemo(() => {
        const map = new Map<string, { id: string; name: string }>();
        for (const p of projects) {
            if (p.real_estate_companies && p.company_id) {
                map.set(p.company_id, {
                    id: p.company_id,
                    name: p.real_estate_companies.display_name ?? p.real_estate_companies.name,
                });
            }
        }
        return [...map.values()];
    }, [projects]);

    // Filter projects dropdown by selected company
    const filteredProjects = companyId
        ? projects.filter((p) => p.company_id === companyId)
        : projects;

    // Get unique typologies from loaded units for the filter
    const typologies = [...new Set(units.map((u) => u.typology).filter(Boolean))] as string[];
    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="p-6 space-y-4">
            <h1 className="text-2xl font-bold">Stock de Unidades</h1>

            {leadId && (
                <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="flex items-center gap-2 py-3">
                        <AlertCircle className="h-5 w-5 text-blue-600" />
                        <span className="text-sm text-blue-800">
                            Reservando unidad para lead ID: <strong>{leadId.slice(0, 8)}...</strong>
                        </span>
                    </CardContent>
                </Card>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-end">
                <div>
                    <label className="text-sm text-gray-500 block mb-1">Inmobiliaria</label>
                    <Select value={companyId} onValueChange={(v) => { setCompanyId(v === 'all' ? '' : v); setProjectId(''); setPage(1); }}>
                        <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder="Todas las inmobiliarias" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las inmobiliarias</SelectItem>
                            {companies.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                    {c.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <label className="text-sm text-gray-500 block mb-1">Proyecto</label>
                    <Select value={projectId} onValueChange={(v) => { setProjectId(v === 'all' ? '' : v); setPage(1); }}>
                        <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder="Todos los proyectos" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los proyectos</SelectItem>
                            {filteredProjects.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                    {p.name} ({p.commune})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <label className="text-sm text-gray-500 block mb-1">Tipologia</label>
                    <Select value={typology} onValueChange={(v) => { setTypology(v === 'all' ? '' : v); setPage(1); }}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            {typologies.map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <label className="text-sm text-gray-500 block mb-1">Estado</label>
                    <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                        <SelectTrigger className="w-[160px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="browsable">Disponibles</SelectItem>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="sin_abono">Sin abono</SelectItem>
                            <SelectItem value="all">Todos</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Proyecto</TableHead>
                            <TableHead>Empresa</TableHead>
                            <TableHead>Unidad</TableHead>
                            <TableHead>Tipologia</TableHead>
                            <TableHead>Superficie</TableHead>
                            <TableHead>Precio (UF)</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Parking</TableHead>
                            <TableHead>Bodega</TableHead>
                            <TableHead>Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={10} className="text-center py-8">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                                </TableCell>
                            </TableRow>
                        ) : units.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                                    No se encontraron unidades
                                </TableCell>
                            </TableRow>
                        ) : (
                            units.map((unit) => (
                                <TableRow key={unit.id}>
                                    <TableCell className="font-medium">{unit.projects?.name ?? '-'}</TableCell>
                                    <TableCell>{unit.projects?.real_estate_companies?.display_name ?? unit.projects?.real_estate_companies?.name ?? '-'}</TableCell>
                                    <TableCell>{unit.unit_number}</TableCell>
                                    <TableCell>{unit.typology ?? '-'}</TableCell>
                                    <TableCell>{unit.surface_useful ? `${unit.surface_useful} m2` : '-'}</TableCell>
                                    <TableCell>{formatUF(unit.final_price)}</TableCell>
                                    <TableCell><StatusBadge status={unit.status} /></TableCell>
                                    <TableCell>{unit.parking ?? 0}</TableCell>
                                    <TableCell>{unit.storage ?? 0}</TableCell>
                                    <TableCell>
                                        {(unit.status === 'available' || unit.status === 'sin_abono') ? (
                                            <ConfirmDialog
                                                trigger={
                                                    <Button
                                                        size="sm"
                                                        disabled={actionLoading === unit.id}
                                                    >
                                                        {actionLoading === unit.id ? 'Reservando...' : 'Reservar'}
                                                    </Button>
                                                }
                                                title="Reservar Unidad"
                                                description={`Reservar unidad ${unit.unit_number} del proyecto ${unit.projects?.name ?? ''}. ${leadId ? 'Se vinculara con el lead seleccionado.' : 'No se vinculara a ningun lead.'}`}
                                                onConfirm={() => handleReserve(unit.id)}
                                                confirmText="Reservar"
                                            />
                                        ) : (
                                            <span className="text-xs text-gray-400">{unit.status}</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                    {totalCount} unidades encontradas
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
