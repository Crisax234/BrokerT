export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          cal_com_booking_id: string | null
          calendar_provider: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number
          external_calendar_event_id: string | null
          id: string
          lead_id: string
          location: string | null
          meeting_type: string | null
          outcome: string | null
          outcome_notes: string | null
          scheduled_at: string
          seller_id: string
          status: Database["public"]["Enums"]["appointment_status"]
          title: string
          updated_at: string | null
        }
        Insert: {
          cal_com_booking_id?: string | null
          calendar_provider?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number
          external_calendar_event_id?: string | null
          id?: string
          lead_id: string
          location?: string | null
          meeting_type?: string | null
          outcome?: string | null
          outcome_notes?: string | null
          scheduled_at: string
          seller_id: string
          status?: Database["public"]["Enums"]["appointment_status"]
          title: string
          updated_at?: string | null
        }
        Update: {
          cal_com_booking_id?: string | null
          calendar_provider?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number
          external_calendar_event_id?: string | null
          id?: string
          lead_id?: string
          location?: string | null
          meeting_type?: string | null
          outcome?: string | null
          outcome_notes?: string | null
          scheduled_at?: string
          seller_id?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_browsable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_purchases: {
        Row: {
          created_at: string | null
          credits_amount: number
          currency: string
          id: string
          payment_provider_intent_id: string | null
          price_paid: number
          seller_id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          credits_amount: number
          currency?: string
          id?: string
          payment_provider_intent_id?: string | null
          price_paid: number
          seller_id: string
          status?: string
        }
        Update: {
          created_at?: string | null
          credits_amount?: number
          currency?: string
          id?: string
          payment_provider_intent_id?: string | null
          price_paid?: number
          seller_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_purchases_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          acquisition_cost: number | null
          additional_contact_info: Json | null
          age: number | null
          age_range: string | null
          budget_max: number | null
          budget_min: number | null
          created_at: string | null
          current_commune: string | null
          email: string | null
          estimated_income: number | null
          estimated_income_range: string | null
          external_id: string | null
          family_size: number | null
          full_name: string
          id: string
          is_active: boolean | null
          meeting_at: string | null
          metadata: Json | null
          occupation: string | null
          phone: string | null
          preferred_communes: string[] | null
          preferred_typology: string | null
          quality_tier: Database["public"]["Enums"]["lead_quality"]
          reserved_at: string | null
          reserved_by: string | null
          rut: string | null
          score: number | null
          source: string | null
          source_campaign: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string | null
        }
        Insert: {
          acquisition_cost?: number | null
          additional_contact_info?: Json | null
          age?: number | null
          age_range?: string | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string | null
          current_commune?: string | null
          email?: string | null
          estimated_income?: number | null
          estimated_income_range?: string | null
          external_id?: string | null
          family_size?: number | null
          full_name: string
          id?: string
          is_active?: boolean | null
          meeting_at?: string | null
          metadata?: Json | null
          occupation?: string | null
          phone?: string | null
          preferred_communes?: string[] | null
          preferred_typology?: string | null
          quality_tier?: Database["public"]["Enums"]["lead_quality"]
          reserved_at?: string | null
          reserved_by?: string | null
          rut?: string | null
          score?: number | null
          source?: string | null
          source_campaign?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string | null
        }
        Update: {
          acquisition_cost?: number | null
          additional_contact_info?: Json | null
          age?: number | null
          age_range?: string | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string | null
          current_commune?: string | null
          email?: string | null
          estimated_income?: number | null
          estimated_income_range?: string | null
          external_id?: string | null
          family_size?: number | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          meeting_at?: string | null
          metadata?: Json | null
          occupation?: string | null
          phone?: string | null
          preferred_communes?: string[] | null
          preferred_typology?: string | null
          quality_tier?: Database["public"]["Enums"]["lead_quality"]
          reserved_at?: string | null
          reserved_by?: string | null
          rut?: string | null
          score?: number | null
          source?: string | null
          source_campaign?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_reserved_by_fkey"
            columns: ["reserved_by"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          additional_conditions: string | null
          available_units: number | null
          bonus_pie: number | null
          city: string | null
          commune: string
          company_id: string
          created_at: string | null
          estimated_delivery: string | null
          guaranteed_rent: string | null
          guaranteed_rent_amounts: Json | null
          id: string
          initial_payment: string | null
          is_active: boolean | null
          market_rent_amounts: Json | null
          name: string
          payment_conditions: Json | null
          promotions_extra: Json | null
          reception_date: string | null
          region: string | null
          slug: string
          source_file: string | null
          source_sheet: string | null
          toku_installments: number | null
          total_units: number | null
          updated_at: string | null
        }
        Insert: {
          additional_conditions?: string | null
          available_units?: number | null
          bonus_pie?: number | null
          city?: string | null
          commune: string
          company_id: string
          created_at?: string | null
          estimated_delivery?: string | null
          guaranteed_rent?: string | null
          guaranteed_rent_amounts?: Json | null
          id?: string
          initial_payment?: string | null
          is_active?: boolean | null
          market_rent_amounts?: Json | null
          name: string
          payment_conditions?: Json | null
          promotions_extra?: Json | null
          reception_date?: string | null
          region?: string | null
          slug: string
          source_file?: string | null
          source_sheet?: string | null
          toku_installments?: number | null
          total_units?: number | null
          updated_at?: string | null
        }
        Update: {
          additional_conditions?: string | null
          available_units?: number | null
          bonus_pie?: number | null
          city?: string | null
          commune?: string
          company_id?: string
          created_at?: string | null
          estimated_delivery?: string | null
          guaranteed_rent?: string | null
          guaranteed_rent_amounts?: Json | null
          id?: string
          initial_payment?: string | null
          is_active?: boolean | null
          market_rent_amounts?: Json | null
          name?: string
          payment_conditions?: Json | null
          promotions_extra?: Json | null
          reception_date?: string | null
          region?: string | null
          slug?: string
          source_file?: string | null
          source_sheet?: string | null
          toku_installments?: number | null
          total_units?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "real_estate_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      real_estate_companies: {
        Row: {
          created_at: string | null
          display_name: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      reservation_files: {
        Row: {
          description: string | null
          file_name: string
          file_size: number | null
          file_type: string
          id: string
          mime_type: string | null
          reservation_id: string
          seller_id: string
          storage_path: string
          uploaded_at: string | null
        }
        Insert: {
          description?: string | null
          file_name: string
          file_size?: number | null
          file_type: string
          id?: string
          mime_type?: string | null
          reservation_id: string
          seller_id: string
          storage_path: string
          uploaded_at?: string | null
        }
        Update: {
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          id?: string
          mime_type?: string | null
          reservation_id?: string
          seller_id?: string
          storage_path?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservation_files_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_files_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_notes: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          reservation_id: string
          seller_id: string
          type: Database["public"]["Enums"]["note_type"]
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          reservation_id: string
          seller_id: string
          type?: Database["public"]["Enums"]["note_type"]
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          reservation_id?: string
          seller_id?: string
          type?: Database["public"]["Enums"]["note_type"]
        }
        Relationships: [
          {
            foreignKeyName: "reservation_notes_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_notes_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          appointment_id: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string | null
          id: string
          lead_id: string | null
          notes: string | null
          released_at: string | null
          reserved_at: string
          sale_price: number | null
          seller_id: string
          sold_at: string | null
          status: Database["public"]["Enums"]["reservation_status"]
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          released_at?: string | null
          reserved_at?: string
          sale_price?: number | null
          seller_id: string
          sold_at?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          released_at?: string | null
          reserved_at?: string
          sale_price?: number | null
          seller_id?: string
          sold_at?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_browsable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_accounts: {
        Row: {
          available_credits: number
          current_period_end: string | null
          current_period_start: string | null
          lifetime_lead_reservations: number
          lifetime_unit_reservations: number
          plan_reservations_remaining: number
          seller_id: string
          total_credits_purchased: number
          total_credits_used: number
          updated_at: string | null
        }
        Insert: {
          available_credits?: number
          current_period_end?: string | null
          current_period_start?: string | null
          lifetime_lead_reservations?: number
          lifetime_unit_reservations?: number
          plan_reservations_remaining?: number
          seller_id: string
          total_credits_purchased?: number
          total_credits_used?: number
          updated_at?: string | null
        }
        Update: {
          available_credits?: number
          current_period_end?: string | null
          current_period_start?: string | null
          lifetime_lead_reservations?: number
          lifetime_unit_reservations?: number
          plan_reservations_remaining?: number
          seller_id?: string
          total_credits_purchased?: number
          total_credits_used?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_accounts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_profiles: {
        Row: {
          avatar_url: string | null
          cal_com_user_id: string | null
          company_name: string | null
          created_at: string | null
          email: string
          full_name: string
          google_calendar_connected: boolean | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          outlook_calendar_connected: boolean | null
          phone: string | null
          rut: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          cal_com_user_id?: string | null
          company_name?: string | null
          created_at?: string | null
          email: string
          full_name: string
          google_calendar_connected?: boolean | null
          id: string
          is_active?: boolean | null
          is_verified?: boolean | null
          outlook_calendar_connected?: boolean | null
          phone?: string | null
          rut?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          cal_com_user_id?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          google_calendar_connected?: boolean | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          outlook_calendar_connected?: boolean | null
          phone?: string | null
          rut?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      stock_imports: {
        Row: {
          column_mapping: Json | null
          company_id: string | null
          errors: Json | null
          file_name: string
          id: string
          imported_at: string | null
          imported_by: string | null
          sheets_imported: string[] | null
          units_imported: number | null
          units_skipped: number | null
        }
        Insert: {
          column_mapping?: Json | null
          company_id?: string | null
          errors?: Json | null
          file_name: string
          id?: string
          imported_at?: string | null
          imported_by?: string | null
          sheets_imported?: string[] | null
          units_imported?: number | null
          units_skipped?: number | null
        }
        Update: {
          column_mapping?: Json | null
          company_id?: string | null
          errors?: Json | null
          file_name?: string
          id?: string
          imported_at?: string | null
          imported_by?: string | null
          sheets_imported?: string[] | null
          units_imported?: number | null
          units_skipped?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_imports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "real_estate_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          monthly_reservations_included: number
          payment_provider_customer_id: string | null
          payment_provider_subscription_id: string | null
          seller_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          monthly_reservations_included?: number
          payment_provider_customer_id?: string | null
          payment_provider_subscription_id?: string | null
          seller_id: string
          status?: Database["public"]["Enums"]["subscription_status"]
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          monthly_reservations_included?: number
          payment_provider_customer_id?: string | null
          payment_provider_subscription_id?: string | null
          seller_id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      todo_list: {
        Row: {
          created_at: string
          description: string | null
          done: boolean
          done_at: string | null
          id: number
          owner: string
          title: string
          urgent: boolean
        }
        Insert: {
          created_at?: string
          description?: string | null
          done?: boolean
          done_at?: string | null
          id?: number
          owner: string
          title: string
          urgent?: boolean
        }
        Update: {
          created_at?: string
          description?: string | null
          done?: boolean
          done_at?: string | null
          id?: number
          owner?: string
          title?: string
          urgent?: boolean
        }
        Relationships: []
      }
      transaction_log: {
        Row: {
          amount_money: number | null
          created_at: string | null
          credits: number | null
          id: string
          lead_id: string | null
          metadata: Json | null
          reservation_id: string | null
          seller_id: string
          type: string
          unit_id: string | null
        }
        Insert: {
          amount_money?: number | null
          created_at?: string | null
          credits?: number | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          reservation_id?: string | null
          seller_id: string
          type: string
          unit_id?: string | null
        }
        Update: {
          amount_money?: number | null
          created_at?: string | null
          credits?: number | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          reservation_id?: string | null
          seller_id?: string
          type?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_browsable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_log_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_log_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_log_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      uf_values: {
        Row: {
          date: string
          value: number
        }
        Insert: {
          date: string
          value: number
        }
        Update: {
          date?: string
          value?: number
        }
        Relationships: []
      }
      units: {
        Row: {
          bonus_percentage: number | null
          bonus_uf: number | null
          cash_flow: number | null
          created_at: string | null
          deed_price: number | null
          discount: number | null
          extra_fields: Json | null
          final_price: number | null
          id: string
          installments_plan1: number | null
          installments_plan2: number | null
          list_price: number | null
          min_income: number | null
          monthly_payment_plan1: number | null
          monthly_payment_plan2: number | null
          mortgage_max_percentage: number | null
          mortgage_max_uf: number | null
          mortgage_payment: number | null
          orientation: string | null
          original_status: string | null
          parking: number | null
          pie_clp: number | null
          pie_percentage: number | null
          pie_uf: number | null
          project_id: string
          raw_data: Json
          rent_estimate: number | null
          reservation_id: string | null
          reserved_at: string | null
          reserved_by: string | null
          status: Database["public"]["Enums"]["unit_status"]
          storage: number | null
          surface_terrace: number | null
          surface_total: number | null
          surface_useful: number | null
          surface_weighted: number | null
          typology: string | null
          uf_per_m2: number | null
          unit_number: string
          unit_type: string | null
          updated_at: string | null
        }
        Insert: {
          bonus_percentage?: number | null
          bonus_uf?: number | null
          cash_flow?: number | null
          created_at?: string | null
          deed_price?: number | null
          discount?: number | null
          extra_fields?: Json | null
          final_price?: number | null
          id?: string
          installments_plan1?: number | null
          installments_plan2?: number | null
          list_price?: number | null
          min_income?: number | null
          monthly_payment_plan1?: number | null
          monthly_payment_plan2?: number | null
          mortgage_max_percentage?: number | null
          mortgage_max_uf?: number | null
          mortgage_payment?: number | null
          orientation?: string | null
          original_status?: string | null
          parking?: number | null
          pie_clp?: number | null
          pie_percentage?: number | null
          pie_uf?: number | null
          project_id: string
          raw_data?: Json
          rent_estimate?: number | null
          reservation_id?: string | null
          reserved_at?: string | null
          reserved_by?: string | null
          status?: Database["public"]["Enums"]["unit_status"]
          storage?: number | null
          surface_terrace?: number | null
          surface_total?: number | null
          surface_useful?: number | null
          surface_weighted?: number | null
          typology?: string | null
          uf_per_m2?: number | null
          unit_number: string
          unit_type?: string | null
          updated_at?: string | null
        }
        Update: {
          bonus_percentage?: number | null
          bonus_uf?: number | null
          cash_flow?: number | null
          created_at?: string | null
          deed_price?: number | null
          discount?: number | null
          extra_fields?: Json | null
          final_price?: number | null
          id?: string
          installments_plan1?: number | null
          installments_plan2?: number | null
          list_price?: number | null
          min_income?: number | null
          monthly_payment_plan1?: number | null
          monthly_payment_plan2?: number | null
          mortgage_max_percentage?: number | null
          mortgage_max_uf?: number | null
          mortgage_payment?: number | null
          orientation?: string | null
          original_status?: string | null
          parking?: number | null
          pie_clp?: number | null
          pie_percentage?: number | null
          pie_uf?: number | null
          project_id?: string
          raw_data?: Json
          rent_estimate?: number | null
          reservation_id?: string | null
          reserved_at?: string | null
          reserved_by?: string | null
          status?: Database["public"]["Enums"]["unit_status"]
          storage?: number | null
          surface_terrace?: number | null
          surface_total?: number | null
          surface_useful?: number | null
          surface_weighted?: number | null
          typology?: string | null
          uf_per_m2?: number | null
          unit_number?: string
          unit_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_units_reservation"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_reserved_by_fkey"
            columns: ["reserved_by"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      leads_browsable: {
        Row: {
          age: number | null
          age_range: string | null
          budget_max: number | null
          budget_min: number | null
          created_at: string | null
          current_commune: string | null
          email: string | null
          estimated_income: number | null
          estimated_income_range: string | null
          family_size: number | null
          full_name: string | null
          id: string | null
          meeting_at: string | null
          metadata: Json | null
          occupation: string | null
          phone: string | null
          preferred_communes: string[] | null
          preferred_typology: string | null
          quality_tier: Database["public"]["Enums"]["lead_quality"] | null
          rut: string | null
          score: number | null
          status: Database["public"]["Enums"]["lead_status"] | null
        }
        Insert: {
          age?: number | null
          age_range?: string | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string | null
          current_commune?: string | null
          email?: never
          estimated_income?: number | null
          estimated_income_range?: string | null
          family_size?: number | null
          full_name?: never
          id?: string | null
          meeting_at?: string | null
          metadata?: Json | null
          occupation?: string | null
          phone?: never
          preferred_communes?: string[] | null
          preferred_typology?: string | null
          quality_tier?: Database["public"]["Enums"]["lead_quality"] | null
          rut?: never
          score?: number | null
          status?: Database["public"]["Enums"]["lead_status"] | null
        }
        Update: {
          age?: number | null
          age_range?: string | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string | null
          current_commune?: string | null
          email?: never
          estimated_income?: number | null
          estimated_income_range?: string | null
          family_size?: number | null
          full_name?: never
          id?: string | null
          meeting_at?: string | null
          metadata?: Json | null
          occupation?: string | null
          phone?: never
          preferred_communes?: string[] | null
          preferred_typology?: string | null
          quality_tier?: Database["public"]["Enums"]["lead_quality"] | null
          rut?: never
          score?: number | null
          status?: Database["public"]["Enums"]["lead_status"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_and_reset_plan: {
        Args: { p_seller_id: string }
        Returns: undefined
      }
      mark_unit_sold: {
        Args: {
          p_reservation_id: string
          p_sale_price?: number
          p_seller_id: string
        }
        Returns: Json
      }
      release_lead: {
        Args: { p_lead_id: string; p_reason?: string; p_seller_id: string }
        Returns: Json
      }
      release_unit: {
        Args: {
          p_reason?: string
          p_reservation_id: string
          p_seller_id: string
        }
        Returns: Json
      }
      reserve_lead: {
        Args: { p_lead_id: string; p_seller_id: string }
        Returns: Json
      }
      reserve_unit: {
        Args: {
          p_appointment_id?: string
          p_lead_id?: string
          p_seller_id: string
          p_unit_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      appointment_status:
        | "scheduled"
        | "confirmed"
        | "completed"
        | "no_show"
        | "cancelled"
        | "rescheduled"
      lead_quality: "cold" | "warm" | "hot" | "premium"
      lead_status:
        | "available"
        | "reserved"
        | "contacted"
        | "meeting_set"
        | "in_progress"
        | "converted"
        | "lost"
        | "released"
      note_type:
        | "note"
        | "call"
        | "email"
        | "meeting"
        | "status_change"
        | "file_upload"
      reservation_status:
        | "active"
        | "in_progress"
        | "sold"
        | "cancelled"
        | "released"
      subscription_status: "active" | "past_due" | "cancelled" | "trialing"
      subscription_tier: "free" | "starter" | "pro" | "enterprise"
      unit_status:
        | "available"
        | "blocked"
        | "sin_abono"
        | "reserved"
        | "sold"
        | "released"
        | "inactive"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      appointment_status: [
        "scheduled",
        "confirmed",
        "completed",
        "no_show",
        "cancelled",
        "rescheduled",
      ],
      lead_quality: ["cold", "warm", "hot", "premium"],
      lead_status: [
        "available",
        "reserved",
        "contacted",
        "meeting_set",
        "in_progress",
        "converted",
        "lost",
        "released",
      ],
      note_type: [
        "note",
        "call",
        "email",
        "meeting",
        "status_change",
        "file_upload",
      ],
      reservation_status: [
        "active",
        "in_progress",
        "sold",
        "cancelled",
        "released",
      ],
      subscription_status: ["active", "past_due", "cancelled", "trialing"],
      subscription_tier: ["free", "starter", "pro", "enterprise"],
      unit_status: [
        "available",
        "blocked",
        "sin_abono",
        "reserved",
        "sold",
        "released",
        "inactive",
      ],
    },
  },
} as const
