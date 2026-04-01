"use client";
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useGlobal } from '@/lib/context/GlobalContext';
import { createSPASassClientAuthenticated as createSPASassClient } from '@/lib/supabase/client';
import { Key, User, CheckCircle } from 'lucide-react';
import { MFASetup } from '@/components/MFASetup';

export default function UserSettingsPage() {
    const { user } = useGlobal();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const supabase = await createSPASassClient();
            const client = supabase.getSupabaseClient();

            const { error } = await client.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            setSuccess('Contraseña actualizada correctamente');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: Error | unknown) {
            if (err instanceof Error) {
                console.error('Error updating password:', err);
                setError(err.message);
            } else {
                console.error('Error updating password:', err);
                setError('Error al actualizar la contraseña');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight text-secondary-900">Configuración</h1>
                <p className="text-sm text-secondary-500">
                    Administra tu cuenta y preferencias
                </p>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {success && (
                <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                </Alert>
            )}

            <div className="max-w-3xl space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Detalles de Usuario
                        </CardTitle>
                        <CardDescription>Información de tu cuenta</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-secondary-500">Nombre</label>
                            <p className="mt-1 text-sm text-secondary-900">{user?.full_name || 'Sin nombre'}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-secondary-500">Email</label>
                            <p className="mt-1 text-sm text-secondary-900">{user?.email}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Key className="h-5 w-5" />
                            Cambiar Contraseña
                        </CardTitle>
                        <CardDescription>Actualiza la contraseña de tu cuenta</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div>
                                <label htmlFor="new-password" className="block text-sm font-medium text-secondary-700">
                                    Nueva Contraseña
                                </label>
                                <Input
                                    type="password"
                                    id="new-password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="mt-1"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="confirm-password" className="block text-sm font-medium text-secondary-700">
                                    Confirmar Nueva Contraseña
                                </label>
                                <Input
                                    type="password"
                                    id="confirm-password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="mt-1"
                                    required
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary-600 hover:bg-primary-700 text-white"
                            >
                                {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <MFASetup
                    onStatusChange={() => {
                        setSuccess('Configuración de autenticación de dos factores actualizada');
                    }}
                />
            </div>
        </div>
    );
}
