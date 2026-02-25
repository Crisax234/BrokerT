// src/lib/context/GlobalContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createSPASassClientAuthenticated as createSPASassClient } from '@/lib/supabase/client';


type User = {
    // Auth data
    email: string;
    id: string;
    registered_at: Date;
    // Seller profile data
    full_name: string;
    is_verified: boolean;
    available_credits: number;
    plan_reservations_remaining: number;
    current_period_end: string | null;
    lifetime_lead_reservations: number;
    lifetime_unit_reservations: number;
};

interface GlobalContextType {
    loading: boolean;
    user: User | null;
    refreshUser: () => Promise<void>;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export function GlobalProvider({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    const loadData = useCallback(async () => {
        try {
            const supabase = await createSPASassClient();
            const client = supabase.getSupabaseClient();

            const [{ data: { user } }, { data: profile }] = await Promise.all([
                client.auth.getUser(),
                supabase.getSellerProfile(),
            ]);

            if (user) {
                setUser({
                    email: user.email!,
                    id: user.id,
                    registered_at: new Date(user.created_at),
                    full_name: profile?.full_name ?? '',
                    is_verified: profile?.is_verified ?? false,
                    available_credits: profile?.seller_accounts?.available_credits ?? 0,
                    plan_reservations_remaining: profile?.seller_accounts?.plan_reservations_remaining ?? 0,
                    current_period_end: profile?.seller_accounts?.current_period_end ?? null,
                    lifetime_lead_reservations: profile?.seller_accounts?.lifetime_lead_reservations ?? 0,
                    lifetime_unit_reservations: profile?.seller_accounts?.lifetime_unit_reservations ?? 0,
                });
            } else {
                throw new Error('User not found');
            }

        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const refreshUser = useCallback(async () => {
        await loadData();
    }, [loadData]);

    return (
        <GlobalContext.Provider value={{ loading, user, refreshUser }}>
            {children}
        </GlobalContext.Provider>
    );
}

export const useGlobal = () => {
    const context = useContext(GlobalContext);
    if (context === undefined) {
        throw new Error('useGlobal must be used within a GlobalProvider');
    }
    return context;
};
