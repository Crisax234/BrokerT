export type RPCResult = {
    success: boolean;
    error?: string;
    credits_used?: number;
    required?: number;
    available?: number;
    reservation_id?: string;
    lead?: {
        id: string;
        full_name: string;
        email: string;
        phone: string;
        rut: string;
        score: number;
        quality_tier: string;
    };
    unit?: {
        id: string;
        unit_number: string;
        project: string;
        commune: string;
        company: string;
        final_price: number;
        typology: string;
    };
    unit_id?: string;
    message?: string;
    current_status?: string;
};
