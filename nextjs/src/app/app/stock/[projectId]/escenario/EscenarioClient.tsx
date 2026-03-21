"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Database } from '@/lib/types';
import { RPCResult } from '@/lib/crm-types';
import { useGlobal } from '@/lib/context/GlobalContext';
import { formatUF } from '@/components/crm/FormatCurrency';
import {
    computeEscenario,
    creditPct,
    piePesos,
    UnitData,
} from '@/lib/calculations/escenario';
import dynamic from 'next/dynamic';

const LeadPickerDialog = dynamic(
    () => import('@/components/crm/LeadPickerDialog').then(m => m.LeadPickerDialog),
    { ssr: false }
);
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft,
    Building2,
    MapPin,
    Calendar,
    DollarSign,
    CheckCircle2,
    AlertCircle,
    XCircle,
    TrendingUp,
    Calculator,
    User,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';

type ProjectRow = Database['public']['Tables']['projects']['Row'] & {
    real_estate_companies: { name: string; display_name: string | null } | null;
};
type UnitLookup = { unit_number: string; status: string };

// ── Formatting helpers ────────────────────────────────────
function fmtCLP(v: number): string {
    return '$' + Math.round(v).toLocaleString('es-CL');
}
function fmtPct(v: number): string {
    return (v * 100).toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
}
function fmtDate(d: Date): string {
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Payment conditions parser ─────────────────────────────
function parsePaymentConditions(pc: unknown, unit?: UnitData | null) {
    const obj = (pc && typeof pc === 'object') ? pc as Record<string, unknown> : {};

    const reservationAmount = (obj.reservation_amount as number) ?? 100000;
    const maxCuotonPct = (obj.max_cuoton_pct as number) ?? 0.03;

    let installmentsToku = 36;
    let installmentsTC = 36;
    let option1Name = 'Cuotas TOKU';
    let option2PartAName = 'Cuotas TOKU';
    let option2PartBName = 'Cuotas TC';

    if (obj.option1 && typeof obj.option1 === 'object') {
        const o1 = obj.option1 as Record<string, unknown>;
        installmentsToku = (o1.installments as number) ?? 36;
        option1Name = (o1.name as string) ?? option1Name;
    } else if (unit?.installments_plan1) {
        installmentsToku = unit.installments_plan1;
    }

    if (obj.option2 && typeof obj.option2 === 'object') {
        const o2 = obj.option2 as Record<string, unknown>;
        if (o2.part_a && typeof o2.part_a === 'object') {
            const pa = o2.part_a as Record<string, unknown>;
            installmentsToku = (pa.installments as number) ?? installmentsToku;
            option2PartAName = (pa.name as string) ?? option2PartAName;
        }
        if (o2.part_b && typeof o2.part_b === 'object') {
            const pb = o2.part_b as Record<string, unknown>;
            installmentsTC = (pb.installments as number) ?? 36;
            option2PartBName = (pb.name as string) ?? option2PartBName;
        }
    } else if (unit?.installments_plan2) {
        installmentsTC = unit.installments_plan2;
    }

    return {
        reservationAmount,
        maxCuotonPct,
        installmentsToku,
        installmentsTC,
        option1Name,
        option2PartAName,
        option2PartBName,
    };
}

interface EscenarioClientProps {
    projectId: string;
    initialProject: ProjectRow;
    initialUfValue: number;
    initialUnitLookup: UnitLookup[];
    initialUnits: string[];
    initialLeadId: string | null;
}

export default function EscenarioClient({
    projectId,
    initialProject,
    initialUfValue,
    initialUnitLookup,
    initialUnits,
    initialLeadId,
}: EscenarioClientProps) {
    const router = useRouter();

    // ── Reservation state ─────────────────────────────
    const { refreshUser } = useGlobal();
    const [leadPickerOpen, setLeadPickerOpen] = useState(false);
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(initialLeadId);
    const [selectedLeadName, setSelectedLeadName] = useState<string | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [reserving, setReserving] = useState(false);

    // ── Core data (initialized from SSR props) ───────
    const [project] = useState<ProjectRow>(initialProject);
    const [ufValue] = useState<number>(initialUfValue);
    const [unitLookup] = useState<UnitLookup[]>(initialUnitLookup);

    // ── Input state ──────────────────────────────────
    const [clientName, setClientName] = useState('');
    const [numDepartments, setNumDepartments] = useState(Math.max(1, initialUnits.length));
    const [unitNumbers, setUnitNumbers] = useState<string[]>(
        initialUnits.length > 0 ? [...initialUnits] : ['']
    );
    const [unitData, setUnitData] = useState<(UnitData | null)[]>(
        Array(Math.max(1, initialUnits.length)).fill(null)
    );
    const [unitValidation, setUnitValidation] = useState<{ status: 'idle' | 'valid' | 'warning' | 'error'; message: string }[]>(
        Array(Math.max(1, initialUnits.length)).fill({ status: 'idle', message: '' })
    );

    const [abonoMinimo, setAbonoMinimo] = useState(0);
    const [abonoExtra, setAbonoExtra] = useState(0);
    const [plazoCreditoYears, setPlazoCreditoYears] = useState(30);
    const [tasaBanco, setTasaBanco] = useState(0.04);
    const [cuotonMaximoPct, setCuotonMaximoPct] = useState(0.03);
    const [plusvaliaPct, setPlusvaliaPct] = useState(0);

    // ── Collapsible sections ─────────────────────────
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        express: true,
        pie: true,
        payment: true,
        cashflow: true,
        scenarios: true,
        wealth: true,
    });
    const toggleSection = (key: string) =>
        setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

    // debounce refs
    const debounceTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

    // ── Fetch initial units when component mounts ────
    useEffect(() => {
        if (initialUnits.length > 0 && unitLookup.length > 0) {
            initialUnits.forEach((unitNum, index) => {
                if (unitNum) validateAndFetchUnit(index, unitNum);
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Unit validation + fetch (debounced) ──────────
    const validateAndFetchUnit = useCallback(async (index: number, value: string) => {
        if (!value.trim()) {
            setUnitData((prev) => { const n = [...prev]; n[index] = null; return n; });
            setUnitValidation((prev) => { const n = [...prev]; n[index] = { status: 'idle', message: '' }; return n; });
            return;
        }

        const match = unitLookup.find((u) => u.unit_number === value.trim());
        if (!match) {
            setUnitValidation((prev) => { const n = [...prev]; n[index] = { status: 'error', message: 'Unidad no encontrada en este proyecto' }; return n; });
            setUnitData((prev) => { const n = [...prev]; n[index] = null; return n; });
            return;
        }

        if (match.status !== 'available' && match.status !== 'sin_abono') {
            setUnitValidation((prev) => { const n = [...prev]; n[index] = { status: 'warning', message: `Unidad no disponible (estado: ${match.status})` }; return n; });
        } else {
            setUnitValidation((prev) => { const n = [...prev]; n[index] = { status: 'valid', message: '' }; return n; });
        }

        try {
            const res = await fetch(`/api/units/lookup?projectId=${projectId}&unitNumber=${encodeURIComponent(value.trim())}`);
            const json = await res.json();
            if (json.data) {
                const data = json.data;
                const ud: UnitData = {
                    id: data.id,
                    unit_number: data.unit_number,
                    typology: data.typology,
                    orientation: data.orientation,
                    unit_type: data.unit_type,
                    surface_total: data.surface_total,
                    surface_useful: data.surface_useful,
                    list_price: data.list_price,
                    discount: data.discount,
                    final_price: data.final_price,
                    deed_price: data.deed_price,
                    parking: data.parking,
                    storage: data.storage,
                    bonus_percentage: data.bonus_percentage,
                    pie_percentage: data.pie_percentage,
                    rent_estimate: data.rent_estimate,
                    installments_plan1: data.installments_plan1,
                    installments_plan2: data.installments_plan2,
                    mortgage_max_percentage: data.mortgage_max_percentage,
                };
                setUnitData((prev) => { const n = [...prev]; n[index] = ud; return n; });
            }
        } catch (err) {
            console.error('Error fetching unit:', err);
        }
    }, [unitLookup, projectId]);

    const handleUnitNumberChange = useCallback((index: number, value: string) => {
        setUnitNumbers((prev) => { const n = [...prev]; n[index] = value; return n; });

        if (debounceTimers.current[index]) clearTimeout(debounceTimers.current[index]);
        debounceTimers.current[index] = setTimeout(() => {
            validateAndFetchUnit(index, value);
        }, 300);
    }, [validateAndFetchUnit]);

    // Handle department count changes
    const handleNumDepartmentsChange = useCallback((val: string) => {
        const n = parseInt(val);
        setNumDepartments(n);
        setUnitNumbers((prev) => {
            const next = [...prev];
            while (next.length < n) next.push('');
            return next.slice(0, n);
        });
        setUnitData((prev) => {
            const next = [...prev];
            while (next.length < n) next.push(null);
            return next.slice(0, n);
        });
        setUnitValidation((prev) => {
            const next = [...prev];
            while (next.length < n) next.push({ status: 'idle', message: '' });
            return next.slice(0, n);
        });
    }, []);

    // ── Valid units (needed before reservation handlers) ──
    const validUnits = useMemo(() => unitData.filter((u): u is UnitData => u !== null), [unitData]);

    // ── Reservation handlers ─────────────────────────
    const handleLeadPicked = useCallback((pickedLeadId: string, pickedLeadName: string) => {
        setSelectedLeadId(pickedLeadId);
        setSelectedLeadName(pickedLeadName);
        setConfirmOpen(true);
    }, []);

    const handleReserveUnits = useCallback(async () => {
        if (validUnits.length === 0 || !selectedLeadId) return;
        setReserving(true);
        const results: { unitNumber: string; success: boolean; error?: string }[] = [];
        try {
            for (const unit of validUnits) {
                try {
                    const res = await fetch(`/api/units/${unit.id}/reserve`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ leadId: selectedLeadId }),
                    });
                    const result: RPCResult = await res.json();
                    results.push({ unitNumber: unit.unit_number, success: result.success, error: result.error });
                } catch (err) {
                    results.push({ unitNumber: unit.unit_number, success: false, error: String(err) });
                }
            }
            const successes = results.filter(r => r.success);
            const failures = results.filter(r => !r.success);
            let msg = `${successes.length} de ${results.length} unidades reservadas exitosamente.`;
            if (failures.length > 0) {
                msg += '\n\nErrores:\n' + failures.map(f => `• Unidad ${f.unitNumber}: ${f.error}`).join('\n');
            }
            alert(msg);
            await refreshUser();
        } catch (err) {
            console.error('Reserve error:', err);
            alert('Error al reservar unidades');
        } finally {
            setReserving(false);
        }
    }, [validUnits, selectedLeadId, refreshUser]);

    const reserveDialogDescription = useMemo(() => {
        const unitList = validUnits.map(u => u.unit_number).join(', ');
        const leadLabel = selectedLeadName ?? (selectedLeadId ? selectedLeadId.slice(0, 8) + '...' : '');
        return `Se reservarán ${validUnits.length} unidad(es): ${unitList}. Se vincularán con el lead: ${leadLabel}.`;
    }, [validUnits, selectedLeadId, selectedLeadName]);

    // ── Parse payment conditions ─────────────────────
    const paymentConfig = useMemo(() => {
        const firstValidUnit = unitData.find((u) => u !== null) ?? null;
        return parsePaymentConditions(project?.payment_conditions, firstValidUnit);
    }, [project, unitData]);

    // ── Compute results ──────────────────────────────
    const results = useMemo(() => {
        if (validUnits.length === 0 || ufValue <= 0) return null;
        return computeEscenario({
            clientName,
            units: validUnits,
            abonoMinimo,
            abonoExtra,
            plazoCreditoYears,
            tasaBanco,
            cuotonMaximoPct,
            plusvaliaPct,
            ufToday: ufValue,
            reservationPerUnit: paymentConfig.reservationAmount,
            installmentsToku: paymentConfig.installmentsToku,
            installmentsTC: paymentConfig.installmentsTC,
        });
    }, [validUnits, ufValue, clientName, abonoMinimo, abonoExtra, plazoCreditoYears, tasaBanco, cuotonMaximoPct, plusvaliaPct, paymentConfig]);

    if (!project) {
        return (
            <div className="p-6">
                <p className="text-red-500">Proyecto no encontrado.</p>
                <Button variant="outline" className="mt-4" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Volver
                </Button>
            </div>
        );
    }

    const companyName = project.real_estate_companies?.display_name ?? project.real_estate_companies?.name ?? '-';

    // ── Section header component ─────────────────────
    const SectionHeader = ({ title, sectionKey, icon: Icon }: { title: string; sectionKey: string; icon: React.ElementType }) => (
        <button
            onClick={() => toggleSection(sectionKey)}
            className="flex items-center justify-between w-full text-left"
        >
            <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary-500" />
                <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            </div>
            {expandedSections[sectionKey] ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
        </button>
    );

    return (
        <div className={`p-6 space-y-6 max-w-[1400px] mx-auto ${validUnits.length > 0 ? 'pb-24' : ''}`}>
            {/* Back button */}
            <Button variant="outline" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Volver al Stock
            </Button>

            {/* ═══ HEADER ═══ */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Escenario de Inversión</h1>
                            {clientName && (
                                <p className="text-sm text-gray-500 mt-1">Cliente: {clientName}</p>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm">
                            <div className="flex items-center gap-1.5 text-gray-600">
                                <Building2 className="h-4 w-4 text-primary-500" />
                                <span className="font-medium">{companyName}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-600">
                                <MapPin className="h-4 w-4 text-primary-500" />
                                <span>{project.name} — {project.commune}</span>
                            </div>
                            {project.estimated_delivery && (
                                <div className="flex items-center gap-1.5 text-gray-600">
                                    <Calendar className="h-4 w-4 text-primary-500" />
                                    <span>Entrega: {project.estimated_delivery}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1.5 text-gray-600">
                                <DollarSign className="h-4 w-4 text-primary-500" />
                                <span>UF Hoy: {fmtCLP(ufValue)}</span>
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        Escenario enviado: {fmtDate(new Date())}
                    </p>
                </CardContent>
            </Card>

            {/* ═══ MAIN LAYOUT: Input + Results ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* ── INPUT PANEL ── */}
                <div className="lg:col-span-4 space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <User className="h-4 w-4 text-primary-500" />
                                Ingrese los siguientes datos
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            {/* Client Name */}
                            <div>
                                <label className="text-sm text-gray-500 block mb-1">Nombre Cliente</label>
                                <Input
                                    value={clientName}
                                    onChange={(e) => setClientName(e.target.value)}
                                    placeholder="Nombre del cliente"
                                />
                            </div>

                            {/* Number of Departments */}
                            <div>
                                <label className="text-sm text-gray-500 block mb-1"># Departamentos</label>
                                <Select value={String(numDepartments)} onValueChange={handleNumDepartmentsChange}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[1, 2, 3, 4, 5].map((n) => (
                                            <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Unit Number Inputs (dynamic) */}
                            {Array.from({ length: numDepartments }).map((_, i) => (
                                <div key={i}>
                                    <label className="text-sm text-gray-500 block mb-1">
                                        N° Depto {numDepartments > 1 ? i + 1 : ''}
                                    </label>
                                    <div className="relative">
                                        <Input
                                            value={unitNumbers[i] ?? ''}
                                            onChange={(e) => handleUnitNumberChange(i, e.target.value)}
                                            placeholder="Ej: 1005"
                                            className={
                                                unitValidation[i]?.status === 'error' ? 'border-red-400 focus-visible:ring-red-400' :
                                                unitValidation[i]?.status === 'warning' ? 'border-yellow-400 focus-visible:ring-yellow-400' :
                                                unitValidation[i]?.status === 'valid' ? 'border-green-400 focus-visible:ring-green-400' : ''
                                            }
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            {unitValidation[i]?.status === 'valid' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                            {unitValidation[i]?.status === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                                            {unitValidation[i]?.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                                        </div>
                                    </div>
                                    {unitValidation[i]?.message && (
                                        <p className={`text-xs mt-1 ${
                                            unitValidation[i]?.status === 'error' ? 'text-red-500' :
                                            unitValidation[i]?.status === 'warning' ? 'text-yellow-600' : ''
                                        }`}>
                                            {unitValidation[i]?.message}
                                        </p>
                                    )}
                                </div>
                            ))}

                            <hr className="border-gray-200" />

                            {/* Abono Mínimo */}
                            <div>
                                <label className="text-sm text-gray-500 block mb-1">Abono mínimo (CLP)</label>
                                <Input
                                    type="number"
                                    value={abonoMinimo || ''}
                                    onChange={(e) => setAbonoMinimo(Number(e.target.value) || 0)}
                                    placeholder="$0"
                                />
                            </div>

                            {/* Abono Extra */}
                            <div>
                                <label className="text-sm text-gray-500 block mb-1">Abono extra (CLP)</label>
                                <Input
                                    type="number"
                                    value={abonoExtra || ''}
                                    onChange={(e) => setAbonoExtra(Number(e.target.value) || 0)}
                                    placeholder="$0"
                                />
                            </div>

                            {/* Abono Total (read-only) */}
                            <div className="bg-gray-50 rounded-md p-3">
                                <label className="text-sm text-gray-500 block mb-1">Abono Total</label>
                                <p className="text-lg font-semibold text-gray-900">{fmtCLP(abonoMinimo + abonoExtra)}</p>
                            </div>

                            <hr className="border-gray-200" />

                            {/* Plazo Crédito */}
                            <div>
                                <label className="text-sm text-gray-500 block mb-1">Plazo Crédito (años)</label>
                                <Select value={String(plazoCreditoYears)} onValueChange={(v) => setPlazoCreditoYears(Number(v))}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[15, 20, 25, 30].map((n) => (
                                            <SelectItem key={n} value={String(n)}>{n} años</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Tasa Banco */}
                            <div>
                                <label className="text-sm text-gray-500 block mb-1">Tasa Banco (%)</label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={(tasaBanco * 100).toFixed(1)}
                                    onChange={(e) => setTasaBanco(Number(e.target.value) / 100 || 0)}
                                    placeholder="4.0"
                                />
                            </div>

                            {/* Cuotón Máximo */}
                            <div>
                                <label className="text-sm text-gray-500 block mb-1">Cuotón Máximo (%)</label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={(cuotonMaximoPct * 100).toFixed(1)}
                                    onChange={(e) => setCuotonMaximoPct(Number(e.target.value) / 100 || 0)}
                                    placeholder="3.0"
                                />
                                {cuotonMaximoPct > paymentConfig.maxCuotonPct && (
                                    <p className="text-xs text-red-500 mt-1">Bajar % de cuotón</p>
                                )}
                            </div>

                            {/* Plusvalía */}
                            <div>
                                <label className="text-sm text-gray-500 block mb-1">Plusvalía (%)</label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={(plusvaliaPct * 100).toFixed(1)}
                                    onChange={(e) => setPlusvaliaPct(Number(e.target.value) / 100 || 0)}
                                    placeholder="0.0"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ── RESULTS PANEL ── */}
                <div className="lg:col-span-8 space-y-4">
                    {validUnits.length === 0 ? (
                        <Card>
                            <CardContent className="py-16 text-center">
                                <Calculator className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500">Ingrese un número de departamento válido para ver los resultados del escenario.</p>
                            </CardContent>
                        </Card>
                    ) : results && (
                        <>
                            {/* ── Escenario Express Table ── */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <SectionHeader title="Escenario Express" sectionKey="express" icon={Calculator} />
                                </CardHeader>
                                {expandedSections.express && (
                                    <CardContent>
                                        <div className="border rounded-lg overflow-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>N° Depto</TableHead>
                                                        <TableHead>Tipología</TableHead>
                                                        <TableHead>Est.</TableHead>
                                                        <TableHead>Bod.</TableHead>
                                                        <TableHead>Precio Escr.</TableHead>
                                                        <TableHead>Crédito (%)</TableHead>
                                                        <TableHead>Bono (%)</TableHead>
                                                        <TableHead>PIE (%)</TableHead>
                                                        <TableHead>PIE ($)</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {validUnits.map((unit) => {
                                                        const credit = creditPct(unit.bonus_percentage ?? 0, unit.pie_percentage ?? 0);
                                                        const pie = piePesos(unit.deed_price ?? 0, unit.pie_percentage ?? 0, ufValue);
                                                        return (
                                                            <TableRow key={unit.unit_number}>
                                                                <TableCell className="font-medium">{unit.unit_number}</TableCell>
                                                                <TableCell>{unit.typology ?? '-'}</TableCell>
                                                                <TableCell>{unit.parking ?? 0}</TableCell>
                                                                <TableCell>{unit.storage ?? 0}</TableCell>
                                                                <TableCell>{formatUF(unit.deed_price)}</TableCell>
                                                                <TableCell>{fmtPct(credit)}</TableCell>
                                                                <TableCell>{fmtPct(unit.bonus_percentage ?? 0)}</TableCell>
                                                                <TableCell>{fmtPct(unit.pie_percentage ?? 0)}</TableCell>
                                                                <TableCell>{fmtCLP(pie)}</TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </CardContent>
                                )}
                            </Card>

                            {/* ── PIE Management ── */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <SectionHeader title="Gestión del PIE" sectionKey="pie" icon={DollarSign} />
                                </CardHeader>
                                {expandedSections.pie && (
                                    <CardContent>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <p className="text-xs text-gray-500 uppercase tracking-wide">Reserva</p>
                                                <p className="text-lg font-semibold mt-1">{fmtCLP(results.reservationVal)}</p>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <p className="text-xs text-gray-500 uppercase tracking-wide">Abono</p>
                                                <p className="text-lg font-semibold mt-1">{fmtCLP(results.abono)}</p>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <p className="text-xs text-gray-500 uppercase tracking-wide">PIE Total</p>
                                                <p className="text-lg font-semibold mt-1">{fmtCLP(results.pieTotalVal)}</p>
                                            </div>
                                            <div className="bg-primary-50 rounded-lg p-3 border border-primary-200">
                                                <p className="text-xs text-primary-600 uppercase tracking-wide font-medium">PIE Pendiente</p>
                                                <p className="text-lg font-bold text-primary-700 mt-1">{fmtCLP(results.piePendingVal)}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                )}
                            </Card>

                            {/* ── Payment Plans ── */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <SectionHeader title="Planes de Pago" sectionKey="payment" icon={Calculator} />
                                </CardHeader>
                                {expandedSections.payment && (
                                    <CardContent className="space-y-4">
                                        {/* Option 1 */}
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-700 mb-2">
                                                Opción 1: {paymentConfig.installmentsToku} {paymentConfig.option1Name}
                                            </h4>
                                            <div className="border rounded-lg overflow-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Forma de Pago</TableHead>
                                                            <TableHead className="text-right">Cuota ($)</TableHead>
                                                            <TableHead className="text-right">Total ($)</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        <TableRow>
                                                            <TableCell>{paymentConfig.option1Name}</TableCell>
                                                            <TableCell className="text-right">{fmtCLP(results.option1.cuota)}</TableCell>
                                                            <TableCell className="text-right font-medium">{fmtCLP(results.option1.total)}</TableCell>
                                                        </TableRow>
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>

                                        {/* Option 2 */}
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-700 mb-2">
                                                Opción 2: {paymentConfig.installmentsToku + paymentConfig.installmentsTC} Cuotas ({paymentConfig.option2PartAName} + {paymentConfig.option2PartBName})
                                            </h4>
                                            {results.cuotonValidation.valid ? (
                                                <div className="border rounded-lg overflow-auto">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Forma de Pago</TableHead>
                                                                <TableHead className="text-right">Cuota ($)</TableHead>
                                                                <TableHead className="text-right">Total ($)</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            <TableRow>
                                                                <TableCell>{paymentConfig.option2PartAName}</TableCell>
                                                                <TableCell className="text-right">{fmtCLP(results.option2.toku.cuota)}</TableCell>
                                                                <TableCell className="text-right">{fmtCLP(results.option2.toku.total)}</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell>{paymentConfig.option2PartBName}</TableCell>
                                                                <TableCell className="text-right">{fmtCLP(results.option2.tc.cuota)}</TableCell>
                                                                <TableCell className="text-right">{fmtCLP(results.option2.tc.total)}</TableCell>
                                                            </TableRow>
                                                            <TableRow className="bg-gray-50 font-medium">
                                                                <TableCell>Total</TableCell>
                                                                <TableCell className="text-right">-</TableCell>
                                                                <TableCell className="text-right">{fmtCLP(results.option2.grandTotal)}</TableCell>
                                                            </TableRow>
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            ) : (
                                                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                                    <p className="text-sm text-red-600 flex items-center gap-2">
                                                        <AlertCircle className="h-4 w-4" />
                                                        {results.cuotonValidation.message} — ajuste el porcentaje de cuotón
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                )}
                            </Card>

                            {/* ── Cash Flow ── */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <SectionHeader title="Flujo de Caja (Arriendo vs Dividendo)" sectionKey="cashflow" icon={TrendingUp} />
                                </CardHeader>
                                {expandedSections.cashflow && (
                                    <CardContent>
                                        <div className="border rounded-lg overflow-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>N° Depto</TableHead>
                                                        <TableHead className="text-right">Arriendo ($)</TableHead>
                                                        <TableHead className="text-right">Dividendo ($)</TableHead>
                                                        <TableHead className="text-right">Flujo ($)</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {results.unitCashFlows.map((cf) => (
                                                        <TableRow key={cf.unit_number}>
                                                            <TableCell className="font-medium">{cf.unit_number}</TableCell>
                                                            <TableCell className="text-right">{fmtCLP(cf.arriendo)}</TableCell>
                                                            <TableCell className="text-right">{fmtCLP(cf.dividendo)}</TableCell>
                                                            <TableCell className={`text-right font-medium ${cf.flujo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                {fmtCLP(cf.flujo)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                    <TableRow className="bg-gray-50 font-semibold">
                                                        <TableCell colSpan={3} className="text-right">Flujo Total:</TableCell>
                                                        <TableCell className={`text-right ${results.totalFlujo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {fmtCLP(results.totalFlujo)}
                                                        </TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2">
                                            * Tasa Referencial del {(tasaBanco * 100).toFixed(1)}%.
                                        </p>
                                    </CardContent>
                                )}
                            </Card>

                            {/* ── Mortgage Scenarios per unit ── */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <SectionHeader title="Simulación de Tasas" sectionKey="scenarios" icon={TrendingUp} />
                                </CardHeader>
                                {expandedSections.scenarios && (
                                    <CardContent className="space-y-6">
                                        {results.scenarios.map((s) => (
                                            <div key={s.unit_number}>
                                                <div className="mb-2">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-sm font-semibold text-gray-800">Depto {s.unit_number}</span>
                                                        <Badge variant="secondary" className="text-xs">{s.typology ?? '-'}</Badge>
                                                    </div>
                                                    <div className="flex gap-4 text-xs text-gray-500">
                                                        <span>Precio Escr.: {formatUF(s.deed_price)}</span>
                                                        <span>Monto Crédito: {formatUF(s.loan_amount_uf)}</span>
                                                        <span>Crédito: {fmtPct(s.credit_pct)}</span>
                                                    </div>
                                                </div>
                                                <div className="border rounded-lg overflow-auto">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Tasa</TableHead>
                                                                <TableHead className="text-right">Dividendo ($)</TableHead>
                                                                <TableHead className="text-right">Arriendo ($)</TableHead>
                                                                <TableHead className="text-right">Flujo ($)</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {s.scenarios.map((row, idx) => (
                                                                <TableRow key={idx} className={idx === 1 ? 'bg-primary-50/30' : ''}>
                                                                    <TableCell className="font-medium">{fmtPct(row.rate)}</TableCell>
                                                                    <TableCell className="text-right">{fmtCLP(row.dividendo)}</TableCell>
                                                                    <TableCell className="text-right">{fmtCLP(row.arriendo)}</TableCell>
                                                                    <TableCell className={`text-right font-medium ${row.flujo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                        {fmtCLP(row.flujo)}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                )}
                            </Card>

                            {/* ── Wealth Projection ── */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <SectionHeader title="Proyección Patrimonial" sectionKey="wealth" icon={TrendingUp} />
                                </CardHeader>
                                {expandedSections.wealth && (
                                    <CardContent>
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <p className="text-xs text-gray-500 uppercase tracking-wide">PIE Total</p>
                                                <p className="text-lg font-semibold mt-1">{fmtCLP(results.pieTotalVal)}</p>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <p className="text-xs text-gray-500 uppercase tracking-wide">Patrimonio Total</p>
                                                <p className="text-lg font-semibold mt-1">{fmtCLP(results.patrimonioVal)}</p>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-3">Plusvalía: {fmtPct(plusvaliaPct)}</p>
                                        <div className="border rounded-lg overflow-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Año</TableHead>
                                                        <TableHead className="text-right">Valor ($)</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {[1, 2, 3, 4, 5].map((yr) => (
                                                        <TableRow key={yr}>
                                                            <TableCell>Año {yr}</TableCell>
                                                            <TableCell className="text-right font-medium">
                                                                {fmtCLP(results.wealth.yearlyValues[yr])}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                                            <p className="text-xs text-green-600 uppercase tracking-wide font-medium">Ganancia Proyectada (5 años)</p>
                                            <p className="text-2xl font-bold text-green-700 mt-1">{fmtCLP(results.wealth.ganancia)}</p>
                                        </div>
                                    </CardContent>
                                )}
                            </Card>

                            {/* ── Footnotes ── */}
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-xs text-gray-400 space-y-1">
                                        <p>* Simulación a {plazoCreditoYears} años considerando la UF de hoy (UF {fmtCLP(ufValue)}).</p>
                                        <p>* Valores referenciales, sujeto a evaluación bancaria y tasa de interés obtenida al momento del crédito.</p>
                                        <p>* Dividendos incluyen los seguros obligatorios, equivalentes a UF 1.</p>
                                        <p>* El Abono Inicial y el Monto de Reserva se abona al pie de los deptos.</p>
                                        <p>* Monto en pesos referenciales considerando UF de hoy ({fmtCLP(ufValue)}).</p>
                                        <p>* El cuotón final considera un {(cuotonMaximoPct * 100).toFixed(1)}% del Precio de Escritura.</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            </div>

            {/* Floating reservation bar */}
            {validUnits.length > 0 && (
                <div className="fixed bottom-0 left-0 lg:left-64 right-0 z-20 bg-white border-t shadow-lg px-6 py-3">
                    <div className="flex items-center justify-between max-w-screen-xl mx-auto">
                        <div className="flex items-center gap-3">
                            <Badge variant="outline" className="bg-primary-100 text-primary-800 border-primary-300">
                                {validUnits.length}
                            </Badge>
                            <span className="text-sm text-gray-700">
                                {validUnits.length === 1 ? '1 unidad en escenario' : `${validUnits.length} unidades en escenario`}
                            </span>
                        </div>
                        <Button
                            disabled={reserving}
                            onClick={() => {
                                if (selectedLeadId) {
                                    setConfirmOpen(true);
                                } else {
                                    setLeadPickerOpen(true);
                                }
                            }}
                        >
                            {reserving ? 'Reservando...' : `Reservar (${validUnits.length})`}
                        </Button>
                    </div>
                </div>
            )}

            {/* Lead picker dialog */}
            <LeadPickerDialog
                open={leadPickerOpen}
                onOpenChange={setLeadPickerOpen}
                onSelect={handleLeadPicked}
            />

            {/* Confirm reservation dialog */}
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reservar Unidades</AlertDialogTitle>
                        <AlertDialogDescription>{reserveDialogDescription}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            setConfirmOpen(false);
                            handleReserveUnits();
                        }}>
                            Reservar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
