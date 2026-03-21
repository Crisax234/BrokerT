// src/lib/context/GlobalContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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
            const res = await fetch('/api/profile');
            if (!res.ok) throw new Error('Failed to load profile');
            const { data } = await res.json();

            setUser({
                email: data.email,
                id: data.id,
                registered_at: new Date(data.registered_at),
                full_name: data.full_name,
                is_verified: data.is_verified,
                available_credits: data.available_credits,
                plan_reservations_remaining: data.plan_reservations_remaining,
                current_period_end: data.current_period_end,
                lifetime_lead_reservations: data.lifetime_lead_reservations,
                lifetime_unit_reservations: data.lifetime_unit_reservations,
            });
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
