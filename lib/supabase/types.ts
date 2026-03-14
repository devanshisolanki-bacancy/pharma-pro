export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'super_admin' | 'pharmacy_admin' | 'pharmacist' | 'technician' | 'cashier' | 'viewer'
export type PrescriptionStatus = 'received' | 'verified' | 'on_hold' | 'filling' | 'quality_check' | 'ready' | 'dispensed' | 'cancelled' | 'transferred'
export type ClaimStatus = 'pending' | 'submitted' | 'adjudicated' | 'paid' | 'rejected' | 'appealed'
export type InventoryStatus = 'active' | 'low_stock' | 'out_of_stock' | 'expired' | 'discontinued'
export type DrugSchedule = 'OTC' | 'II' | 'III' | 'IV' | 'V'
export type TransactionType = 'sale' | 'refund' | 'void' | 'adjustment'
export type AlertType = 'low_stock' | 'expiration' | 'drug_interaction' | 'refill_due' | 'claim_rejected' | 'system'

export interface Database {
  public: {
    Tables: {
      pharmacies: {
        Row: {
          id: string
          name: string
          npi: string
          dea_number: string | null
          address: Json
          phone: string | null
          fax: string | null
          email: string | null
          license: string | null
          is_active: boolean
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['pharmacies']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['pharmacies']['Insert']>
      }
      profiles: {
        Row: {
          id: string
          pharmacy_id: string | null
          role: UserRole
          first_name: string
          last_name: string
          license_number: string | null
          phone: string | null
          is_active: boolean
          preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      patients: {
        Row: {
          id: string
          pharmacy_id: string
          first_name: string
          last_name: string
          date_of_birth: string
          gender: string | null
          phone: string | null
          email: string | null
          address: Json | null
          emergency_contact: Json | null
          allergies: string[]
          medical_conditions: string[]
          preferred_language: string
          sms_opt_in: boolean
          email_opt_in: boolean
          preferred_notification_channel: string
          notification_preferences: Json
          contact_time_window: Json
          sms_opted_out_at: string | null
          sms_opted_in_at: string | null
          notes: string | null
          is_active: boolean
          hipaa_signed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['patients']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['patients']['Insert']>
      }
      medications: {
        Row: {
          id: string
          ndc: string
          name: string
          brand_name: string | null
          generic_name: string | null
          manufacturer: string | null
          dosage_form: string | null
          strength: string | null
          unit: string | null
          drug_class: string | null
          schedule: DrugSchedule
          requires_rx: boolean
          is_refrigerated: boolean
          storage_temp_range: Json | null
          interactions: string[]
          contraindications: string[]
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['medications']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['medications']['Insert']>
      }
      prescriptions: {
        Row: {
          id: string
          pharmacy_id: string
          patient_id: string
          provider_id: string | null
          medication_id: string
          rx_number: string
          status: PrescriptionStatus
          written_date: string
          expiration_date: string | null
          days_supply: number | null
          quantity: number
          refills_allowed: number
          refills_used: number
          sig: string
          daw_code: number
          is_controlled: boolean
          is_electronic: boolean
          notes: string | null
          dispenser_id: string | null
          verified_by: string | null
          dispensed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['prescriptions']['Row'], 'id' | 'rx_number' | 'created_at' | 'updated_at'> & { id?: string; rx_number?: string }
        Update: Partial<Database['public']['Tables']['prescriptions']['Insert']>
      }
      inventory: {
        Row: {
          id: string
          pharmacy_id: string
          medication_id: string
          lot_number: string | null
          expiration_date: string
          quantity_on_hand: number
          reorder_point: number
          reorder_quantity: number
          unit_cost: number | null
          selling_price: number | null
          status: InventoryStatus
          supplier_id: string | null
          location_bin: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['inventory']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['inventory']['Insert']>
      }
      claims: {
        Row: {
          id: string
          pharmacy_id: string
          prescription_id: string
          insurance_plan_id: string | null
          claim_number: string | null
          status: ClaimStatus
          submitted_at: string | null
          adjudicated_at: string | null
          billed_amount: number | null
          allowed_amount: number | null
          paid_amount: number | null
          copay_amount: number | null
          rejection_code: string | null
          rejection_reason: string | null
          ncpdp_response: Json | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['claims']['Row'], 'id' | 'claim_number' | 'created_at' | 'updated_at'> & { id?: string; claim_number?: string }
        Update: Partial<Database['public']['Tables']['claims']['Insert']>
      }
      transactions: {
        Row: {
          id: string
          pharmacy_id: string
          patient_id: string | null
          prescription_id: string | null
          cashier_id: string | null
          type: TransactionType
          subtotal: number
          tax: number
          insurance_paid: number
          copay: number
          total: number
          payment_method: string | null
          stripe_payment_id: string | null
          receipt_number: string | null
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'receipt_number' | 'created_at'> & { id?: string; receipt_number?: string }
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>
      }
      alerts: {
        Row: {
          id: string
          pharmacy_id: string
          type: AlertType
          title: string
          message: string | null
          reference_id: string | null
          reference_type: string | null
          is_read: boolean
          is_dismissed: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['alerts']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['alerts']['Insert']>
      }
      audit_logs: {
        Row: {
          id: string
          pharmacy_id: string | null
          user_id: string | null
          action: string
          resource: string
          resource_id: string | null
          old_data: Json | null
          new_data: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>
      }
      workflow_tasks: {
        Row: {
          id: string
          pharmacy_id: string
          prescription_id: string | null
          assigned_to: string | null
          task_type: string
          priority: number
          status: string
          due_at: string | null
          completed_at: string | null
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['workflow_tasks']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['workflow_tasks']['Insert']>
      }
      notifications: {
        Row: {
          id: string
          pharmacy_id: string
          patient_id: string | null
          channel: string
          template: string
          status: string
          sent_at: string | null
          metadata: Json
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
      }
      insurance_plans: {
        Row: {
          id: string
          patient_id: string
          payer_name: string
          bin: string
          pcn: string | null
          group_number: string | null
          member_id: string
          relationship: string
          is_primary: boolean
          effective_date: string | null
          termination_date: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['insurance_plans']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['insurance_plans']['Insert']>
      }
      providers: {
        Row: {
          id: string
          pharmacy_id: string | null
          npi: string
          dea_number: string | null
          first_name: string
          last_name: string
          specialty: string | null
          phone: string | null
          fax: string | null
          address: Json | null
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['providers']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['providers']['Insert']>
      }
      drug_interactions: {
        Row: {
          id: string
          drug_a_ndc: string
          drug_b_ndc: string
          severity: string
          description: string | null
          clinical_effects: string | null
          management: string | null
          source: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['drug_interactions']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['drug_interactions']['Insert']>
      }
      suppliers: {
        Row: {
          id: string
          pharmacy_id: string | null
          name: string
          dea_number: string | null
          contact: Json | null
          address: Json | null
          payment_terms: string | null
          is_preferred: boolean
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['suppliers']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['suppliers']['Insert']>
      }
      refills: {
        Row: {
          id: string
          prescription_id: string
          refill_number: number
          status: PrescriptionStatus
          requested_at: string
          dispensed_at: string | null
          quantity: number | null
          days_supply: number | null
          dispenser_id: string | null
        }
        Insert: Omit<Database['public']['Tables']['refills']['Row'], 'id' | 'requested_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['refills']['Insert']>
      }
      user_pharmacy_access: {
        Row: {
          id: string
          user_id: string
          pharmacy_id: string
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_pharmacy_access']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['user_pharmacy_access']['Insert']>
      }
      inventory_transfers: {
        Row: {
          id: string
          from_pharmacy_id: string
          to_pharmacy_id: string
          medication_id: string
          quantity: number
          status: string
          requested_by: string | null
          approved_by: string | null
          notes: string | null
          requested_at: string
          completed_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['inventory_transfers']['Row'], 'id' | 'requested_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['inventory_transfers']['Insert']>
      }
      prescription_transfers: {
        Row: {
          id: string
          transfer_code: string
          from_pharmacy_id: string
          to_pharmacy_id: string | null
          original_prescription_id: string
          new_prescription_id: string | null
          patient_snapshot: Json
          prescription_snapshot: Json
          remaining_refills: number
          reason: string | null
          authorization_user_id: string | null
          status: string
          created_at: string
          received_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['prescription_transfers']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['prescription_transfers']['Insert']>
      }
      forecasts: {
        Row: {
          id: string
          pharmacy_id: string
          medication_id: string
          forecast_days: number
          predicted_demand: number
          confidence: number
          recommendation: string | null
          model: string | null
          input_data: Json | null
          generated_at: string
        }
        Insert: Omit<Database['public']['Tables']['forecasts']['Row'], 'id' | 'generated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['forecasts']['Insert']>
      }
      prior_auth_letters: {
        Row: {
          id: string
          claim_id: string | null
          prescription_id: string
          insurance_plan_id: string | null
          denial_code: string | null
          letter_text: string
          status: string
          generated_by: string | null
          file_path: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['prior_auth_letters']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['prior_auth_letters']['Insert']>
      }
      adherence_scores: {
        Row: {
          id: string
          patient_id: string
          prescription_id: string | null
          score: number
          risk_level: string
          recommendations: Json
          model_version: string | null
          calculated_at: string
        }
        Insert: Omit<Database['public']['Tables']['adherence_scores']['Row'], 'id' | 'calculated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['adherence_scores']['Insert']>
      }
      chat_sessions: {
        Row: {
          id: string
          patient_id: string | null
          pharmacy_id: string
          conversation_title: string | null
          last_message_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['chat_sessions']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['chat_sessions']['Insert']>
      }
      chat_messages: {
        Row: {
          id: string
          session_id: string
          role: string
          content: string
          metadata: Json
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['chat_messages']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['chat_messages']['Insert']>
      }
      push_subscriptions: {
        Row: {
          id: string
          profile_id: string | null
          patient_id: string | null
          endpoint: string
          p256dh: string
          auth: string
          user_agent: string | null
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['push_subscriptions']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['push_subscriptions']['Insert']>
      }
    }
    Functions: {
      get_my_pharmacy_id: { Args: Record<never, never>; Returns: string }
      get_my_role: { Args: Record<never, never>; Returns: UserRole }
      get_user_pharmacy_ids: { Args: Record<never, never>; Returns: string[] }
      get_dashboard_stats: { Args: { p_pharmacy_id: string }; Returns: Json }
      can_refill: { Args: { prescription_uuid: string }; Returns: Json }
      check_low_stock: { Args: Record<never, never>; Returns: void }
    }
  }
}
