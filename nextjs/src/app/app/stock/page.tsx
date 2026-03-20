"use client";

import React, { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createSPASassClient } from '@/lib/supabase/client';
import { Database } from '@/lib/types';
import { formatUF } from '@/components/crm/FormatCurrency';
import { StatusBadge } from '@/components/crm/StatusBadge';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Building2, Calculator, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';

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
    const router = useRouter();
    const leadId = searchParams.get('leadId');

    // Projects + counts (Phase A)
    const [projects, setProjects] = useState<ProjectRow[]>([]);
    const [unitCounts, setUnitCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);

    // Phase B: selected project
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [selectedProjectName, setSelectedProjectName] = useState<string>('');
    const [units, setUnits] = useState<UnitRow[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [unitsLoading, setUnitsLoading] = useState(false);

    // Filters
    const [companyId, setCompanyId] = useState<string>('');
    const [typology, setTypology] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('browsable');

    // Selection
    const [selectedUnits, setSelectedUnits] = useState<Map<string, { unitNumber: string }>>(new Map());

    // Pagination
    const [page, setPage] = useState(1);
    const pageSize = 50;

    // Fetch projects + unit counts
    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const client = await createSPASassClient();
                const [{ data: projectsData }, counts] = await Promise.all([
                    client.getProjects(),
                    client.getAvailableUnitCounts(),
                ]);
                setProjects((projectsData as ProjectRow[]) ?? []);
                setUnitCounts(counts);
            } catch (err) {
                console.error('Error fetching projects:', err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    // Fetch units when project selected
    const fetchUnits = useCallback(async () => {
        if (!selectedProjectId) return;
        setUnitsLoading(true);
        try {
            const client = await createSPASassClient();
            const statusIn = statusFilter === 'all'
                ? undefined
                : statusFilter === 'browsable'
                    ? ['available', 'sin_abono']
                    : [statusFilter];
            const { data, count, error } = await client.getUnits({
                projectId: selectedProjectId,
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
            setUnitsLoading(false);
        }
    }, [selectedProjectId, typology, statusFilter, page]);

    useEffect(() => {
        fetchUnits();
    }, [fetchUnits]);

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

    // Filter projects by company
    const filteredProjects = companyId
        ? projects.filter((p) => p.company_id === companyId)
        : projects;

    // Get unique typologies from loaded units
    const typologies = [...new Set(units.map((u) => u.typology).filter(Boolean))] as string[];
    const totalPages = Math.ceil(totalCount / pageSize);

    // Selection logic
    const toggleUnitSelection = useCallback((unit: UnitRow) => {
        setSelectedUnits(prev => {
            const next = new Map(prev);
            if (next.has(unit.id)) {
                next.delete(unit.id);
            } else {
                next.set(unit.id, { unitNumber: unit.unit_number });
            }
            return next;
        });
    }, []);

    const toggleSelectAllVisible = useCallback(() => {
        setSelectedUnits(prev => {
            const allVisibleSelected = units.length > 0 && units.every(u => prev.has(u.id));
            if (allVisibleSelected) {
                const next = new Map(prev);
                units.forEach(u => next.delete(u.id));
                return next;
            }
            const next = new Map(prev);
            for (const u of units) {
                if (!next.has(u.id)) {
                    next.set(u.id, { unitNumber: u.unit_number });
                }
            }
            return next;
        });
    }, [units]);

    // Enter project (Phase B)
    const handleSelectProject = useCallback((project: ProjectRow) => {
        setSelectedProjectId(project.id);
        setSelectedProjectName(project.name);
        setSelectedUnits(new Map());
        setTypology('');
        setStatusFilter('browsable');
        setPage(1);
    }, []);

    // Back to projects (Phase A)
    const handleBackToProjects = useCallback(() => {
        setSelectedProjectId('');
        setSelectedProjectName('');
        setUnits([]);
        setSelectedUnits(new Map());
        setTotalCount(0);
    }, []);

    // ── RENDER ─────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    // Phase B: Units table for selected project
    if (selectedProjectId) {
        return (
            <div className={`p-6 space-y-4 ${selectedUnits.size > 0 ? 'pb-24' : ''}`}>
                {/* Header with back button */}
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={handleBackToProjects}>
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Volver
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Stock de Unidades</h1>
                        <p className="text-sm text-muted-foreground">{selectedProjectName}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 items-end">
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
                                <TableHead className="w-[50px]">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                        checked={units.length > 0 && units.every(u => selectedUnits.has(u.id))}
                                        onChange={toggleSelectAllVisible}
                                        disabled={units.length === 0}
                                    />
                                </TableHead>
                                <TableHead>Unidad</TableHead>
                                <TableHead>Tipologia</TableHead>
                                <TableHead>Superficie</TableHead>
                                <TableHead>Precio (UF)</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Parking</TableHead>
                                <TableHead>Bodega</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {unitsLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                                    </TableCell>
                                </TableRow>
                            ) : units.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                                        No se encontraron unidades
                                    </TableCell>
                                </TableRow>
                            ) : (
                                units.map((unit) => (
                                    <TableRow key={unit.id} className={selectedUnits.has(unit.id) ? 'bg-primary-50' : ''}>
                                        <TableCell>
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:opacity-50"
                                                checked={selectedUnits.has(unit.id)}
                                                onChange={() => toggleUnitSelection(unit)}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">{unit.unit_number}</TableCell>
                                        <TableCell>{unit.typology ?? '-'}</TableCell>
                                        <TableCell>{unit.surface_useful ? `${unit.surface_useful} m²` : '-'}</TableCell>
                                        <TableCell>{formatUF(unit.final_price)}</TableCell>
                                        <TableCell><StatusBadge status={unit.status} /></TableCell>
                                        <TableCell>{unit.parking ?? 0}</TableCell>
                                        <TableCell>{unit.storage ?? 0}</TableCell>
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
                        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">{page} / {totalPages || 1}</span>
                        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Floating selection bar */}
                {selectedUnits.size > 0 && (
                    <div className="fixed bottom-0 left-0 lg:left-64 right-0 z-20 bg-white border-t shadow-lg px-6 py-3">
                        <div className="flex items-center justify-between max-w-screen-xl mx-auto">
                            <div className="flex items-center gap-3">
                                <Badge variant="outline" className="bg-primary-100 text-primary-800 border-primary-300">
                                    {selectedUnits.size}
                                </Badge>
                                <span className="text-sm text-gray-700">
                                    {selectedUnits.size === 1 ? '1 unidad seleccionada' : `${selectedUnits.size} unidades seleccionadas`}
                                </span>
                                <button
                                    onClick={() => setSelectedUnits(new Map())}
                                    className="text-sm text-gray-500 hover:text-gray-700 underline"
                                >
                                    Limpiar
                                </button>
                            </div>
                            <Button
                                onClick={() => {
                                    const unitNums = Array.from(selectedUnits.values()).map(u => u.unitNumber).join(',');
                                    const params = new URLSearchParams({ units: unitNums });
                                    if (leadId) params.set('leadId', leadId);
                                    router.push(`/app/stock/${selectedProjectId}/escenario?${params.toString()}`);
                                }}
                            >
                                <Calculator className="h-4 w-4 mr-1" />
                                Escenario ({selectedUnits.size})
                            </Button>
                        </div>
                    </div>
                )}

            </div>
        );
    }

    // Phase A: Project cards
    return (
        <div className="p-6 space-y-4">
            <h1 className="text-2xl font-bold">Stock de Unidades</h1>

            {/* Company filter */}
            <div>
                <label className="text-sm text-gray-500 block mb-1">Inmobiliaria</label>
                <Select value={companyId} onValueChange={(v) => setCompanyId(v === 'all' ? '' : v)}>
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

            {/* Project cards grid */}
            {filteredProjects.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No se encontraron proyectos</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProjects.map((project) => {
                        const count = unitCounts[project.id] ?? 0;
                        const companyName = project.real_estate_companies?.display_name ?? project.real_estate_companies?.name ?? '-';
                        return (
                            <Card
                                key={project.id}
                                className="cursor-pointer hover:shadow-md hover:border-primary-300 transition-all"
                                onClick={() => handleSelectProject(project)}
                            >
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg">{project.name}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Building2 className="h-4 w-4" />
                                        <span>{companyName}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <MapPin className="h-4 w-4" />
                                        <span>{project.commune ?? '-'}</span>
                                    </div>
                                    <div className="pt-1">
                                        <Badge variant={count > 0 ? 'default' : 'secondary'}>
                                            {count} {count === 1 ? 'unidad disponible' : 'unidades disponibles'}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
