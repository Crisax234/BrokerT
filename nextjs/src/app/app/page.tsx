"use client";
import React from 'react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Building2, ClipboardList, TrendingUp, CreditCard, CalendarClock } from 'lucide-react';
import Link from 'next/link';
import StaggerContainer, { StaggerItem } from '@/components/landing/StaggerContainer';

function getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 20) return 'Buenas tardes';
    return 'Buenas noches';
}

export default function DashboardContent() {
    const { loading, user } = useGlobal();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    const periodEnd = user?.current_period_end
        ? new Date(user.current_period_end).toLocaleDateString('es-CL')
        : 'Sin plan activo';

    return (
        <div className="space-y-6">
            <StaggerContainer className="space-y-6">
                {/* Hero Welcome Card */}
                <StaggerItem>
                    <div className="rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-6 text-white shadow-lg">
                        <p className="text-sm font-medium text-primary-100">{getGreeting()},</p>
                        <h1 className="text-2xl font-bold mt-0.5">
                            {user?.full_name || user?.email?.split('@')[0]}
                        </h1>
                        <p className="text-sm text-primary-200 mt-1">
                            Tienes {user?.plan_reservations_remaining ?? 0} reservas y {user?.available_credits ?? 0} créditos disponibles
                        </p>

                        {/* Metrics row */}
                        <div className="mt-5 grid grid-cols-3 gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/15 rounded-full">
                                    <TrendingUp className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs text-primary-200">Reservas plan</p>
                                    <p className="text-lg font-semibold">{user?.plan_reservations_remaining ?? 0}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/15 rounded-full">
                                    <CreditCard className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs text-primary-200">Créditos</p>
                                    <p className="text-lg font-semibold">{user?.available_credits ?? 0}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/15 rounded-full">
                                    <CalendarClock className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs text-primary-200">Fin período</p>
                                    <p className="text-sm font-semibold">{periodEnd}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </StaggerItem>

                {/* Quick Actions */}
                <StaggerItem>
                    <div className="grid gap-4 md:grid-cols-3">
                        {[
                            { href: '/app/leads', icon: Users, label: 'Explorar Leads', desc: 'Buscar y reservar leads', color: 'text-blue-600 bg-blue-50' },
                            { href: '/app/stock', icon: Building2, label: 'Ver Stock', desc: 'Unidades disponibles', color: 'text-green-600 bg-green-50' },
                            { href: '/app/reservations', icon: ClipboardList, label: 'Mis Clientes', desc: 'Gestionar mis reservas', color: 'text-purple-600 bg-purple-50' },
                        ].map((action) => (
                            <Link
                                key={action.href}
                                href={action.href}
                                className="group flex items-center gap-3 p-4 bg-white border border-secondary-200 rounded-lg hover:border-primary-200 hover:shadow-md transition-all duration-200"
                            >
                                <div className={`p-2.5 rounded-full ${action.color} transition-transform group-hover:scale-110`}>
                                    <action.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-secondary-900">{action.label}</h3>
                                    <p className="text-sm text-secondary-500">{action.desc}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </StaggerItem>

                {/* Lifetime Stats */}
                <StaggerItem>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card className="relative overflow-hidden">
                            <CardContent className="pt-6">
                                <Users className="absolute right-3 top-3 h-10 w-10 text-primary-100" />
                                <div className="text-center">
                                    <p className="text-3xl font-bold text-primary-600">{user?.lifetime_lead_reservations ?? 0}</p>
                                    <p className="text-sm text-secondary-500 mt-1">Leads reservados (histórico)</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="relative overflow-hidden">
                            <CardContent className="pt-6">
                                <Building2 className="absolute right-3 top-3 h-10 w-10 text-primary-100" />
                                <div className="text-center">
                                    <p className="text-3xl font-bold text-primary-600">{user?.lifetime_unit_reservations ?? 0}</p>
                                    <p className="text-sm text-secondary-500 mt-1">Unidades reservadas (histórico)</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </StaggerItem>
            </StaggerContainer>
        </div>
    );
}
