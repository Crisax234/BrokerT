/**
 * Financial qualification helpers for leads.
 * Used by components that read from the `leads` table directly (not the view).
 */

type LeadFinancials = {
    liquidaciones?: number | null;
    honorarios?: number | null;
    arriendos?: number | null;
    retiros?: number | null;
    cuota_credito_consumo?: number | null;
    dividendo_actual?: number | null;
};

export function rentaTotal(lead: LeadFinancials): number {
    return (lead.liquidaciones ?? 0) + (lead.honorarios ?? 0) + (lead.arriendos ?? 0) + (lead.retiros ?? 0);
}

export function egresosTotal(lead: LeadFinancials): number {
    return (lead.cuota_credito_consumo ?? 0) + (lead.dividendo_actual ?? 0);
}

export function maxDividendo(lead: LeadFinancials): number {
    return Math.max(0, 0.25 * rentaTotal(lead) - egresosTotal(lead));
}
