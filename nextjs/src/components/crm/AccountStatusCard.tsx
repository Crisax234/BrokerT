'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGlobal } from '@/lib/context/GlobalContext';
import { CreditCard, CalendarClock, TrendingUp } from 'lucide-react';

export function AccountStatusCard() {
    const { user } = useGlobal();
    if (!user) return null;

    const periodEnd = user.current_period_end
        ? new Date(user.current_period_end).toLocaleDateString('es-CL')
        : 'Sin plan activo';

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Estado de Cuenta</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-full">
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Reservas plan</p>
                            <p className="text-xl font-semibold">{user.plan_reservations_remaining}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-50 rounded-full">
                            <CreditCard className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Cr&eacute;ditos</p>
                            <p className="text-xl font-semibold">{user.available_credits}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-50 rounded-full">
                            <CalendarClock className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Fin per&iacute;odo</p>
                            <p className="text-sm font-medium">{periodEnd}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
