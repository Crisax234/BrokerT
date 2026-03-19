export type EnrichedLeadData = {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    rut: string | null;
    occupation: string | null;
    current_commune: string | null;
    preferred_typology: string | null;
    estimated_income: number | null;
    budget_min: number | null;
    budget_max: number | null;
    meeting_at: string | null;
    age: number | null;
    quality_tier: string;
    score: number | null;
    status: string;
    reserved_at: string | null;
};

export type ReservationRow = {
    id: string;
    lead_id: string | null;
    status: string;
    reserved_at: string;
    sold_at: string | null;
    released_at: string | null;
    cancelled_at: string | null;
    cancel_reason: string | null;
    sale_price: number | null;
    notes: string | null;
    units: {
        unit_number: string;
        typology: string | null;
        final_price: number | null;
        surface_useful: number | null;
        projects: {
            name: string;
            commune: string;
            real_estate_companies: { name: string; display_name: string | null } | null;
        } | null;
    } | null;
    leads: EnrichedLeadData | null;
};

export type ClientGroup = {
    lead: EnrichedLeadData | null;
    leadId: string | null;
    reservations: ReservationRow[];
    activeCount: number;
    soldCount: number;
    totalValue: number;
};
