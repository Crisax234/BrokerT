"use client";
import React from 'react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Users, Building2, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { AccountStatusCard } from '@/components/crm/AccountStatusCard';

export default function DashboardContent() {
    const { loading, user } = useGlobal();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            <h1 className="text-2xl font-bold">Bienvenido, {user?.full_name || user?.email?.split('@')[0]}</h1>

            <AccountStatusCard />

            {/* Lifetime Stats */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-3xl font-bold">{user?.lifetime_lead_reservations ?? 0}</p>
                            <p className="text-sm text-gray-500 mt-1">Leads reservados (hist&oacute;rico)</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-3xl font-bold">{user?.lifetime_unit_reservations ?? 0}</p>
                            <p className="text-sm text-gray-500 mt-1">Unidades reservadas (hist&oacute;rico)</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Acciones R&aacute;pidas</CardTitle>
                    <CardDescription>Accede a las funciones principales</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        <Link
                            href="/app/leads"
                            className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <div className="p-2 bg-blue-50 rounded-full">
                                <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-medium">Explorar Leads</h3>
                                <p className="text-sm text-gray-500">Buscar y reservar leads</p>
                            </div>
                        </Link>
                        <Link
                            href="/app/stock"
                            className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <div className="p-2 bg-green-50 rounded-full">
                                <Building2 className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <h3 className="font-medium">Ver Stock</h3>
                                <p className="text-sm text-gray-500">Unidades disponibles</p>
                            </div>
                        </Link>
                        <Link
                            href="/app/reservations"
                            className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <div className="p-2 bg-purple-50 rounded-full">
                                <ClipboardList className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <h3 className="font-medium">Reservas</h3>
                                <p className="text-sm text-gray-500">Gestionar mis reservas</p>
                            </div>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
