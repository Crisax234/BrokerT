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
        incomeMin?: number;
        incomeMax?: number;
        commune?: string;
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
        if (options?.incomeMin != null) query = query.gte('estimated_income', options.incomeMin);
        if (options?.incomeMax != null) query = query.lte('estimated_income', options.incomeMax);
        if (options?.commune) query = query.ilike('current_commune', `%${options.commune}%`);
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
            .select('*, units!reservations_unit_id_fkey(unit_number, typology, final_price, surface_useful, projects(name, commune, real_estate_companies(name, display_name))), leads!reservations_lead_id_fkey(full_name, email, quality_tier, score)')
            .eq('seller_id', user.id)
            .order('reserved_at', { ascending: false });
    }

    getSupabaseClient() {
        return this.client;
    }


}
