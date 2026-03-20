/** Narrowed lead type matching getMyReservedLeads() select */
export type ReservedLead = {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    rut: string | null;
    occupation: string | null;
    current_commune: string | null;
    liquidaciones: number | null;
    honorarios: number | null;
    arriendos: number | null;
    retiros: number | null;
    cuota_credito_consumo: number | null;
    dividendo_actual: number | null;
    bancarizado: boolean | null;
    ahorros: boolean | null;
    meeting_at: string | null;
    age: number | null;
    quality_tier: string | null;
    score: number | null;
    status: string;
    reserved_at: string | null;
    pipeline_stage: string;
};

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
