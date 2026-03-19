import {SupabaseClient} from "@supabase/supabase-js";
import {Database} from "@/lib/types";
import {RPCResult} from "@/lib/crm-types";

type LeadQuality = Database['public']['Enums']['lead_quality'];
type UnitStatus = Database['public']['Enums']['unit_status'];

export enum ClientType {
    SERVER = 'server',
    SPA = 'spa'

}

export class SassClient {
    private client: SupabaseClient<Database, "public", "public">;
    private clientType: ClientType;

    constructor(client: SupabaseClient<Database, "public", "public">, clientType: ClientType) {
        this.client = client;
        this.clientType = clientType;

    }

    async loginEmail(email: string, password: string) {
        return this.client.auth.signInWithPassword({
            email: email,
            password: password
        });
    }

    async registerEmail(email: string, password: string, fullName?: string) {
        return this.client.auth.signUp({
            email: email,
            password: password,
            options: {
                data: { full_name: fullName ?? '' }
            }
        });
    }

    async getSellerProfile() {
        const { data: { user } } = await this.client.auth.getUser();
        if (!user) return { data: null, error: null };
        return this.client
            .from('seller_profiles')
            .select('*, seller_accounts(*)')
            .eq('id', user.id)
            .single();
    }

    async exchangeCodeForSession(code: string) {
        return this.client.auth.exchangeCodeForSession(code);
    }

    async resendVerificationEmail(email: string) {
        return this.client.auth.resend({
            email: email,
            type: 'signup'
        })
    }

    async logout() {
        const { error } = await this.client.auth.signOut({
            scope: 'local',
        });
        if (error) throw error;
        if(this.clientType === ClientType.SPA) {
            window.location.href = '/auth/login';
        }
    }

    async uploadFile(myId: string, filename: string, file: File) {
        filename = filename.replace(/[^0-9a-zA-Z!\-_.*'()]/g, '_');
        filename = myId + "/" + filename
        return this.client.storage.from('files').upload(filename, file);
    }

    async getFiles(myId: string) {
        return this.client.storage.from('files').list(myId)
    }

    async deleteFile(myId: string, filename: string) {
        filename = myId + "/" + filename
        return this.client.storage.from('files').remove([filename])
    }

    async shareFile(myId: string, filename: string, timeInSec: number, forDownload: boolean = false) {
        filename = myId + "/" + filename
        return this.client.storage.from('files').createSignedUrl(filename, timeInSec, {
            download: forDownload
        });

    }

    async getMyTodoList(page: number = 1, pageSize: number = 100, order: string = 'created_at', done: boolean | null = false) {
        let query = this.client.from('todo_list').select('*').range(page * pageSize - pageSize, page * pageSize - 1).order(order)
        if (done !== null) {
            query = query.eq('done', done)
        }
        return query
    }

    async createTask(row: Database["public"]["Tables"]["todo_list"]["Insert"]) {
        return this.client.from('todo_list').insert(row)
    }

    async removeTask (id: number) {
        return this.client.from('todo_list').delete().eq('id', id)
    }

    async updateAsDone (id: number) {
        return this.client.from('todo_list').update({done: true}).eq('id', id)
    }

    // ── CRM: Leads ─────────────────────────────────────────────

    async getLeadsBrowsable(options?: {
        qualityTier?: string;
        scoreMin?: number;
        scoreMax?: number;
        rentaTotalMin?: number;
        maxDividendoMin?: number;
        bancarizado?: boolean;
        ahorros?: boolean;
        edadMin?: number;
        edadMax?: number;
        meetingDate?: string;
        page?: number;
        pageSize?: number;
        sortBy?: string;
        sortAsc?: boolean;
    }) {
        const page = options?.page ?? 1;
        const pageSize = options?.pageSize ?? 20;
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = this.client
            .from('leads_browsable')
            .select('*', { count: 'exact' })
            .eq('status', 'available');

        if (options?.qualityTier) query = query.eq('quality_tier', options.qualityTier as LeadQuality);
        if (options?.scoreMin != null) query = query.gte('score', options.scoreMin);
        if (options?.scoreMax != null) query = query.lte('score', options.scoreMax);
        if (options?.rentaTotalMin != null) query = query.gte('renta_total', options.rentaTotalMin);
        if (options?.maxDividendoMin != null) query = query.gte('max_dividendo', options.maxDividendoMin);
        if (options?.bancarizado != null) query = query.eq('bancarizado', options.bancarizado);
        if (options?.ahorros != null) query = query.eq('ahorros', options.ahorros);
        if (options?.edadMin != null) query = query.gte('age', options.edadMin);
        if (options?.edadMax != null) query = query.lte('age', options.edadMax);
        if (options?.meetingDate) {
            const dayStart = `${options.meetingDate}T00:00:00`;
            const dayEnd = `${options.meetingDate}T23:59:59`;
            query = query.gte('meeting_at', dayStart).lte('meeting_at', dayEnd);
        }

        const sortBy = options?.sortBy ?? 'score';
        const sortAsc = options?.sortAsc ?? false;
        query = query.order(sortBy, { ascending: sortAsc }).range(from, to);

        return query;
    }

    async getMyReservedLeads() {
        const { data: { user } } = await this.client.auth.getUser();
        if (!user) return { data: null, error: { message: 'Not authenticated' } };
        return this.client
            .from('leads')
            .select('*')
            .eq('reserved_by', user.id)
            .eq('status', 'reserved')
            .order('reserved_at', { ascending: false });
    }

    async reserveLead(leadId: string): Promise<RPCResult> {
        const { data: { user } } = await this.client.auth.getUser();
        if (!user) return { success: false, error: 'NOT_AUTHENTICATED' };
        const { data, error } = await this.client.rpc('reserve_lead', {
            p_lead_id: leadId,
            p_seller_id: user.id,
        });
        if (error) return { success: false, error: error.message };
        return data as unknown as RPCResult;
    }

    async releaseLead(leadId: string, reason?: string): Promise<RPCResult> {
        const { data: { user } } = await this.client.auth.getUser();
        if (!user) return { success: false, error: 'NOT_AUTHENTICATED' };
        const { data, error } = await this.client.rpc('release_lead', {
            p_lead_id: leadId,
            p_seller_id: user.id,
            p_reason: reason,
        });
        if (error) return { success: false, error: error.message };
        return data as unknown as RPCResult;
    }

    // ── CRM: Projects & Units ────────────────────────────────

    async getProjects() {
        return this.client
            .from('projects')
            .select('*, real_estate_companies(name, display_name)')
            .eq('is_active', true)
            .order('name');
    }

    async getUnits(options?: {
        projectId?: string;
        companyId?: string;
        typology?: string;
        statusIn?: string[];
        page?: number;
        pageSize?: number;
    }) {
        const page = options?.page ?? 1;
        const pageSize = options?.pageSize ?? 50;
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const selectStr = options?.companyId
            ? '*, projects!inner(name, commune, real_estate_companies(name, display_name))'
            : '*, projects(name, commune, real_estate_companies(name, display_name))';

        let query = this.client
            .from('units')
            .select(selectStr, { count: 'exact' });

        if (options?.companyId) query = query.eq('projects.company_id', options.companyId);
        if (options?.projectId) query = query.eq('project_id', options.projectId);
        if (options?.typology) query = query.eq('typology', options.typology);
        if (options?.statusIn && options.statusIn.length > 0) {
            query = query.in('status', options.statusIn as UnitStatus[]);
        }

        query = query.order('unit_number').range(from, to);
        return query;
    }

    async reserveUnit(unitId: string, leadId?: string, appointmentId?: string): Promise<RPCResult> {
        const { data: { user } } = await this.client.auth.getUser();
        if (!user) return { success: false, error: 'NOT_AUTHENTICATED' };
        const { data, error } = await this.client.rpc('reserve_unit', {
            p_unit_id: unitId,
            p_seller_id: user.id,
            p_lead_id: leadId,
            p_appointment_id: appointmentId,
        });
        if (error) return { success: false, error: error.message };
        return data as unknown as RPCResult;
    }

    async releaseUnit(reservationId: string, reason?: string): Promise<RPCResult> {
        const { data: { user } } = await this.client.auth.getUser();
        if (!user) return { success: false, error: 'NOT_AUTHENTICATED' };
        const { data, error } = await this.client.rpc('release_unit', {
            p_reservation_id: reservationId,
            p_seller_id: user.id,
            p_reason: reason,
        });
        if (error) return { success: false, error: error.message };
        return data as unknown as RPCResult;
    }

    async markUnitSold(reservationId: string, salePrice?: number): Promise<RPCResult> {
        const { data: { user } } = await this.client.auth.getUser();
        if (!user) return { success: false, error: 'NOT_AUTHENTICATED' };
        const { data, error } = await this.client.rpc('mark_unit_sold', {
            p_reservation_id: reservationId,
            p_seller_id: user.id,
            p_sale_price: salePrice,
        });
        if (error) return { success: false, error: error.message };
        return data as unknown as RPCResult;
    }

    // ── CRM: Reservations ────────────────────────────────────

    async getMyReservations() {
        const { data: { user } } = await this.client.auth.getUser();
        if (!user) return { data: null, error: { message: 'Not authenticated' } };
        return this.client
            .from('reservations')
            .select('*, units!reservations_unit_id_fkey(unit_number, typology, final_price, surface_useful, projects(name, commune, real_estate_companies(name, display_name))), leads!reservations_lead_id_fkey(id, full_name, email, phone, rut, occupation, current_commune, liquidaciones, honorarios, arriendos, retiros, cuota_credito_consumo, dividendo_actual, bancarizado, ahorros, meeting_at, age, quality_tier, score, status, reserved_at)')
            .eq('seller_id', user.id)
            .order('reserved_at', { ascending: false });
    }

    // ── CRM: UF Values ──────────────────────────────────────

    async getLatestUFValue() {
        return this.client
            .from('uf_values')
            .select('date, value')
            .lte('date', new Date().toISOString().split('T')[0])
            .order('date', { ascending: false })
            .limit(1)
            .single();
    }

    // ── CRM: Project + Unit detail fetches ────────────────

    async getProjectById(projectId: string) {
        return this.client
            .from('projects')
            .select('*, real_estate_companies(name, display_name)')
            .eq('id', projectId)
            .single();
    }

    async getUnitByProjectAndNumber(projectId: string, unitNumber: string) {
        return this.client
            .from('units')
            .select('*')
            .eq('project_id', projectId)
            .eq('unit_number', unitNumber)
            .single();
    }

    async getProjectUnitNumbers(projectId: string) {
        return this.client
            .from('units')
            .select('unit_number, status')
            .eq('project_id', projectId)
            .order('unit_number');
    }

    async getAvailableUnitCounts(): Promise<Record<string, number>> {
        const { data, error } = await this.client
            .from('units')
            .select('project_id')
            .in('status', ['available', 'sin_abono'] as UnitStatus[]);
        if (error || !data) return {};
        const counts: Record<string, number> = {};
        for (const row of data) {
            counts[row.project_id] = (counts[row.project_id] || 0) + 1;
        }
        return counts;
    }

    getSupabaseClient() {
        return this.client;
    }


}
