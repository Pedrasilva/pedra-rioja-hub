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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          company_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          company_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          company_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_type: string
          bank_name: string | null
          bic: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          iban: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          opening_balance: number
          opening_balance_date: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_type?: string
          bank_name?: string | null
          bic?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          opening_balance?: number
          opening_balance_date?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_type?: string
          bank_name?: string | null
          bic?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          opening_balance?: number
          opening_balance_date?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      capex_project_costs: {
        Row: {
          amount: number
          company_id: string
          cost_type: string | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          description: string | null
          id: string
          incurred_on: string | null
          is_capitalised: boolean
          project_id: string
          source_id: string | null
          source_type: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount?: number
          company_id: string
          cost_type?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          incurred_on?: string | null
          is_capitalised?: boolean
          project_id: string
          source_id?: string | null
          source_type?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          cost_type?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          incurred_on?: string | null
          is_capitalised?: boolean
          project_id?: string
          source_id?: string | null
          source_type?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "capex_project_costs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capex_project_costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "capex_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      capex_projects: {
        Row: {
          actual_end_date: string | null
          budget_amount: number | null
          code: string | null
          company_id: string
          contractor_name: string | null
          contractor_ref: string | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          drive_folder_id: string | null
          drive_folder_url: string | null
          id: string
          is_capitalisable: boolean
          name: string
          notes: string | null
          project_type: string
          property_id: string | null
          start_date: string | null
          status: string
          target_end_date: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          actual_end_date?: string | null
          budget_amount?: number | null
          code?: string | null
          company_id: string
          contractor_name?: string | null
          contractor_ref?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          id?: string
          is_capitalisable?: boolean
          name: string
          notes?: string | null
          project_type?: string
          property_id?: string | null
          start_date?: string | null
          status?: string
          target_end_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          actual_end_date?: string | null
          budget_amount?: number | null
          code?: string | null
          company_id?: string
          contractor_name?: string | null
          contractor_ref?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          id?: string
          is_capitalisable?: boolean
          name?: string
          notes?: string | null
          project_type?: string
          property_id?: string | null
          start_date?: string | null
          status?: string
          target_end_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "capex_projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capex_projects_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capex_projects_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "capex_projects_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "capex_projects_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
        ]
      }
      cash_flow_entries: {
        Row: {
          actual_date: string | null
          agreement_id: string | null
          amount_net: number
          amount_total: number
          bank_account_id: string | null
          category: string
          commissions: number
          company_id: string
          confidence: string
          counterparty_name: string | null
          counterparty_type: string | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          description: string | null
          direction: string
          document_id: string | null
          entry_date: string
          expected_date: string
          id: string
          insurance: number
          interest: number
          is_included: boolean
          is_manual: boolean
          notes: string | null
          occurrence_key: string
          principal: number
          project_id: string | null
          property_id: string | null
          reconciliation_state: string
          rule_id: string | null
          scenario_code: string | null
          source_id: string | null
          source_type: string
          state: string
          tenancy_id: string | null
          unit_id: string | null
          updated_at: string
          updated_by: string | null
          vat: number
        }
        Insert: {
          actual_date?: string | null
          agreement_id?: string | null
          amount_net?: number
          amount_total?: number
          bank_account_id?: string | null
          category?: string
          commissions?: number
          company_id: string
          confidence?: string
          counterparty_name?: string | null
          counterparty_type?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          description?: string | null
          direction?: string
          document_id?: string | null
          entry_date: string
          expected_date: string
          id?: string
          insurance?: number
          interest?: number
          is_included?: boolean
          is_manual?: boolean
          notes?: string | null
          occurrence_key?: string
          principal?: number
          project_id?: string | null
          property_id?: string | null
          reconciliation_state?: string
          rule_id?: string | null
          scenario_code?: string | null
          source_id?: string | null
          source_type: string
          state?: string
          tenancy_id?: string | null
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vat?: number
        }
        Update: {
          actual_date?: string | null
          agreement_id?: string | null
          amount_net?: number
          amount_total?: number
          bank_account_id?: string | null
          category?: string
          commissions?: number
          company_id?: string
          confidence?: string
          counterparty_name?: string | null
          counterparty_type?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          description?: string | null
          direction?: string
          document_id?: string | null
          entry_date?: string
          expected_date?: string
          id?: string
          insurance?: number
          interest?: number
          is_included?: boolean
          is_manual?: boolean
          notes?: string | null
          occurrence_key?: string
          principal?: number
          project_id?: string | null
          property_id?: string | null
          reconciliation_state?: string
          rule_id?: string | null
          scenario_code?: string | null
          source_id?: string | null
          source_type?: string
          state?: string
          tenancy_id?: string | null
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vat?: number
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_entries_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "financing_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_entries_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "v_financing_agreement_summary"
            referencedColumns: ["agreement_id"]
          },
          {
            foreignKeyName: "cash_flow_entries_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_entries_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "capex_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_entries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_entries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "cash_flow_entries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "cash_flow_entries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "cash_flow_entries_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "cash_flow_recurring_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_entries_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancy_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_entries_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_units"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_flow_recurring_rules: {
        Row: {
          agreement_id: string | null
          amount_net: number
          amount_total: number
          bank_account_id: string | null
          category: string
          company_id: string
          confidence: string
          counterparty_name: string | null
          counterparty_type: string | null
          created_at: string
          created_by: string | null
          currency: string
          day_of_month: number | null
          deleted_at: string | null
          direction: string
          document_id: string | null
          end_date: string | null
          frequency: string
          id: string
          interval_count: number
          is_active: boolean
          last_generated_through: string | null
          max_occurrences: number | null
          name: string
          notes: string | null
          project_id: string | null
          property_id: string | null
          scenario_code: string | null
          start_date: string
          state: string
          tenancy_id: string | null
          unit_id: string | null
          updated_at: string
          updated_by: string | null
          vat: number
        }
        Insert: {
          agreement_id?: string | null
          amount_net?: number
          amount_total?: number
          bank_account_id?: string | null
          category?: string
          company_id: string
          confidence?: string
          counterparty_name?: string | null
          counterparty_type?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          day_of_month?: number | null
          deleted_at?: string | null
          direction?: string
          document_id?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          interval_count?: number
          is_active?: boolean
          last_generated_through?: string | null
          max_occurrences?: number | null
          name: string
          notes?: string | null
          project_id?: string | null
          property_id?: string | null
          scenario_code?: string | null
          start_date: string
          state?: string
          tenancy_id?: string | null
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vat?: number
        }
        Update: {
          agreement_id?: string | null
          amount_net?: number
          amount_total?: number
          bank_account_id?: string | null
          category?: string
          company_id?: string
          confidence?: string
          counterparty_name?: string | null
          counterparty_type?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          day_of_month?: number | null
          deleted_at?: string | null
          direction?: string
          document_id?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          interval_count?: number
          is_active?: boolean
          last_generated_through?: string | null
          max_occurrences?: number | null
          name?: string
          notes?: string | null
          project_id?: string | null
          property_id?: string | null
          scenario_code?: string | null
          start_date?: string
          state?: string
          tenancy_id?: string | null
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vat?: number
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_recurring_rules_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "financing_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_recurring_rules_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "v_financing_agreement_summary"
            referencedColumns: ["agreement_id"]
          },
          {
            foreignKeyName: "cash_flow_recurring_rules_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_recurring_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_recurring_rules_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_recurring_rules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "capex_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_recurring_rules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_recurring_rules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "cash_flow_recurring_rules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "cash_flow_recurring_rules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "cash_flow_recurring_rules_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancy_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_recurring_rules_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_units"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_flow_scenarios: {
        Row: {
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean
          label: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          label: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_scenarios_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          base_currency: string
          country_code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          fiscal_year_start_month: number
          id: string
          legal_name: string | null
          name: string
          tax_number: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          base_currency?: string
          country_code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          fiscal_year_start_month?: number
          id?: string
          legal_name?: string | null
          name: string
          tax_number?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          base_currency?: string
          country_code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          fiscal_year_start_month?: number
          id?: string
          legal_name?: string | null
          name?: string
          tax_number?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      depreciation_assets: {
        Row: {
          capex_project_id: string | null
          capitalised_amount: number
          category: string | null
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string
          id: string
          in_service_date: string | null
          method: string
          property_id: string | null
          residual_value: number
          status: string
          updated_at: string
          updated_by: string | null
          useful_life_years: number | null
        }
        Insert: {
          capex_project_id?: string | null
          capitalised_amount?: number
          category?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description: string
          id?: string
          in_service_date?: string | null
          method?: string
          property_id?: string | null
          residual_value?: number
          status?: string
          updated_at?: string
          updated_by?: string | null
          useful_life_years?: number | null
        }
        Update: {
          capex_project_id?: string | null
          capitalised_amount?: number
          category?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          id?: string
          in_service_date?: string | null
          method?: string
          property_id?: string | null
          residual_value?: number
          status?: string
          updated_at?: string
          updated_by?: string | null
          useful_life_years?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "depreciation_assets_capex_project_id_fkey"
            columns: ["capex_project_id"]
            isOneToOne: false
            referencedRelation: "capex_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depreciation_assets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depreciation_assets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depreciation_assets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "depreciation_assets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "depreciation_assets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
        ]
      }
      depreciation_entries: {
        Row: {
          accumulated_amount: number
          amount: number
          asset_id: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          period_end: string
          period_start: string
          posted_at: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          accumulated_amount?: number
          amount?: number
          asset_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          period_end: string
          period_start: string
          posted_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          accumulated_amount?: number
          amount?: number
          asset_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          period_end?: string
          period_start?: string
          posted_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "depreciation_entries_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "depreciation_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depreciation_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dimension_values: {
        Row: {
          code: string | null
          company_id: string
          created_at: string
          created_by: string | null
          dimension_id: string
          entity_id: string | null
          entity_table: string | null
          id: string
          is_active: boolean
          label: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          dimension_id: string
          entity_id?: string | null
          entity_table?: string | null
          id?: string
          is_active?: boolean
          label: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          dimension_id?: string
          entity_id?: string | null
          entity_table?: string | null
          id?: string
          is_active?: boolean
          label?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dimension_values_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dimension_values_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "dimensions"
            referencedColumns: ["id"]
          },
        ]
      }
      dimensions: {
        Row: {
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_system: boolean
          label: string
          sort_order: number
          target_table: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          label: string
          sort_order?: number
          target_table?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          label?: string
          sort_order?: number
          target_table?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dimensions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      document_links: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          document_id: string
          entity_id: string
          entity_type: string
          id: string
          relation: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          document_id: string
          entity_id: string
          entity_type: string
          id?: string
          relation?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          document_id?: string
          entity_id?: string
          entity_type?: string
          id?: string
          relation?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_links_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          ai_summary: string | null
          amount: number | null
          category: string | null
          checksum: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency: string | null
          deleted_at: string | null
          doc_type: string | null
          drive_checksum: string | null
          drive_file_id: string | null
          drive_folder_id: string | null
          drive_modified_at: string | null
          drive_url: string | null
          drive_web_view_link: string | null
          expiry_date: string | null
          id: string
          issue_date: string | null
          last_synced_at: string | null
          mime_type: string | null
          notes: string | null
          ocr_text: string | null
          original_filename: string | null
          period: string | null
          size_bytes: number | null
          status: string
          storage_path: string | null
          subcategory: string | null
          supersedes_document_id: string | null
          sync_status: string
          tags: string[]
          title: string
          updated_at: string
          updated_by: string | null
          uploaded_at: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          ai_summary?: string | null
          amount?: number | null
          category?: string | null
          checksum?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          doc_type?: string | null
          drive_checksum?: string | null
          drive_file_id?: string | null
          drive_folder_id?: string | null
          drive_modified_at?: string | null
          drive_url?: string | null
          drive_web_view_link?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          last_synced_at?: string | null
          mime_type?: string | null
          notes?: string | null
          ocr_text?: string | null
          original_filename?: string | null
          period?: string | null
          size_bytes?: number | null
          status?: string
          storage_path?: string | null
          subcategory?: string | null
          supersedes_document_id?: string | null
          sync_status?: string
          tags?: string[]
          title: string
          updated_at?: string
          updated_by?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          ai_summary?: string | null
          amount?: number | null
          category?: string | null
          checksum?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          doc_type?: string | null
          drive_checksum?: string | null
          drive_file_id?: string | null
          drive_folder_id?: string | null
          drive_modified_at?: string | null
          drive_url?: string | null
          drive_web_view_link?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          last_synced_at?: string | null
          mime_type?: string | null
          notes?: string | null
          ocr_text?: string | null
          original_filename?: string | null
          period?: string | null
          size_bytes?: number | null
          status?: string
          storage_path?: string | null
          subcategory?: string | null
          supersedes_document_id?: string | null
          sync_status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          updated_by?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_supersedes_document_id_fkey"
            columns: ["supersedes_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      drive_folders: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          drive_folder_id: string | null
          drive_url: string | null
          entity_id: string | null
          entity_type: string
          folder_kind: string
          id: string
          last_synced_at: string | null
          parent_folder_id: string | null
          path: string
          sync_status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          drive_folder_id?: string | null
          drive_url?: string | null
          entity_id?: string | null
          entity_type: string
          folder_kind?: string
          id?: string
          last_synced_at?: string | null
          parent_folder_id?: string | null
          path: string
          sync_status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          drive_folder_id?: string | null
          drive_url?: string | null
          entity_id?: string | null
          entity_type?: string
          folder_kind?: string
          id?: string
          last_synced_at?: string | null
          parent_folder_id?: string | null
          path?: string
          sync_status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drive_folders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      financing_agreements: {
        Row: {
          code: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          current_version_id: string | null
          deleted_at: string | null
          drive_folder_id: string | null
          drive_folder_url: string | null
          end_date: string | null
          fixed_rate: number | null
          grace_months: number | null
          id: string
          index_name: string | null
          index_tenor: string | null
          lender: string
          notes: string | null
          payment_day: number | null
          principal: number
          property_id: string | null
          rate_type: string
          reference: string | null
          repayment_type: string | null
          spread: number | null
          start_date: string | null
          status: string
          term_months: number | null
          type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          current_version_id?: string | null
          deleted_at?: string | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          end_date?: string | null
          fixed_rate?: number | null
          grace_months?: number | null
          id?: string
          index_name?: string | null
          index_tenor?: string | null
          lender: string
          notes?: string | null
          payment_day?: number | null
          principal?: number
          property_id?: string | null
          rate_type?: string
          reference?: string | null
          repayment_type?: string | null
          spread?: number | null
          start_date?: string | null
          status?: string
          term_months?: number | null
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          current_version_id?: string | null
          deleted_at?: string | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          end_date?: string | null
          fixed_rate?: number | null
          grace_months?: number | null
          id?: string
          index_name?: string | null
          index_tenor?: string | null
          lender?: string
          notes?: string | null
          payment_day?: number | null
          principal?: number
          property_id?: string | null
          rate_type?: string
          reference?: string | null
          repayment_type?: string | null
          spread?: number | null
          start_date?: string | null
          status?: string
          term_months?: number | null
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financing_agreements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financing_agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financing_agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "financing_agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "financing_agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
        ]
      }
      financing_schedule_import_rows: {
        Row: {
          closing_balance: number | null
          commissions: number
          company_id: string
          created_at: string
          created_by: string | null
          due_date: string | null
          fees: number
          id: string
          import_id: string
          include: boolean
          insurance: number
          interest: number
          issues: string[]
          line_no: number
          opening_balance: number | null
          period_no: number | null
          principal: number
          total_payment: number
          updated_at: string
          updated_by: string | null
          vat: number
        }
        Insert: {
          closing_balance?: number | null
          commissions?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          fees?: number
          id?: string
          import_id: string
          include?: boolean
          insurance?: number
          interest?: number
          issues?: string[]
          line_no: number
          opening_balance?: number | null
          period_no?: number | null
          principal?: number
          total_payment?: number
          updated_at?: string
          updated_by?: string | null
          vat?: number
        }
        Update: {
          closing_balance?: number | null
          commissions?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          fees?: number
          id?: string
          import_id?: string
          include?: boolean
          insurance?: number
          interest?: number
          issues?: string[]
          line_no?: number
          opening_balance?: number | null
          period_no?: number | null
          principal?: number
          total_payment?: number
          updated_at?: string
          updated_by?: string | null
          vat?: number
        }
        Relationships: [
          {
            foreignKeyName: "financing_schedule_import_rows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financing_schedule_import_rows_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "financing_schedule_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      financing_schedule_imports: {
        Row: {
          agreement_id: string
          committed_at: string | null
          committed_version_id: string | null
          company_id: string
          content_hash: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          document_id: string | null
          effective_from: string
          error_count: number
          file_name: string | null
          id: string
          index_rate_used: number | null
          notes: string | null
          rate_applied: number | null
          reason: string
          row_count: number
          source: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agreement_id: string
          committed_at?: string | null
          committed_version_id?: string | null
          company_id: string
          content_hash?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_id?: string | null
          effective_from: string
          error_count?: number
          file_name?: string | null
          id?: string
          index_rate_used?: number | null
          notes?: string | null
          rate_applied?: number | null
          reason?: string
          row_count?: number
          source?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agreement_id?: string
          committed_at?: string | null
          committed_version_id?: string | null
          company_id?: string
          content_hash?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_id?: string | null
          effective_from?: string
          error_count?: number
          file_name?: string | null
          id?: string
          index_rate_used?: number | null
          notes?: string | null
          rate_applied?: number | null
          reason?: string
          row_count?: number
          source?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financing_schedule_imports_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "financing_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financing_schedule_imports_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "v_financing_agreement_summary"
            referencedColumns: ["agreement_id"]
          },
          {
            foreignKeyName: "financing_schedule_imports_committed_version_id_fkey"
            columns: ["committed_version_id"]
            isOneToOne: false
            referencedRelation: "financing_schedule_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financing_schedule_imports_committed_version_id_fkey"
            columns: ["committed_version_id"]
            isOneToOne: false
            referencedRelation: "v_financing_schedule_current"
            referencedColumns: ["version_id"]
          },
          {
            foreignKeyName: "financing_schedule_imports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financing_schedule_imports_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      financing_schedule_rows: {
        Row: {
          closing_balance: number
          commissions: number
          company_id: string
          created_at: string
          created_by: string | null
          due_date: string
          fees: number
          id: string
          import_id: string | null
          insurance: number
          interest: number
          opening_balance: number
          period_no: number
          principal: number
          reconciled_at: string | null
          settled_amount: number | null
          settled_on: string | null
          settled_source_id: string | null
          settled_source_type: string | null
          status: string
          superseded_at: string | null
          superseded_by_version_id: string | null
          total_payment: number
          updated_at: string
          updated_by: string | null
          vat: number
          version_id: string
        }
        Insert: {
          closing_balance?: number
          commissions?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          due_date: string
          fees?: number
          id?: string
          import_id?: string | null
          insurance?: number
          interest?: number
          opening_balance?: number
          period_no: number
          principal?: number
          reconciled_at?: string | null
          settled_amount?: number | null
          settled_on?: string | null
          settled_source_id?: string | null
          settled_source_type?: string | null
          status?: string
          superseded_at?: string | null
          superseded_by_version_id?: string | null
          total_payment?: number
          updated_at?: string
          updated_by?: string | null
          vat?: number
          version_id: string
        }
        Update: {
          closing_balance?: number
          commissions?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          due_date?: string
          fees?: number
          id?: string
          import_id?: string | null
          insurance?: number
          interest?: number
          opening_balance?: number
          period_no?: number
          principal?: number
          reconciled_at?: string | null
          settled_amount?: number | null
          settled_on?: string | null
          settled_source_id?: string | null
          settled_source_type?: string | null
          status?: string
          superseded_at?: string | null
          superseded_by_version_id?: string | null
          total_payment?: number
          updated_at?: string
          updated_by?: string | null
          vat?: number
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financing_schedule_rows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financing_schedule_rows_superseded_by_version_id_fkey"
            columns: ["superseded_by_version_id"]
            isOneToOne: false
            referencedRelation: "financing_schedule_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financing_schedule_rows_superseded_by_version_id_fkey"
            columns: ["superseded_by_version_id"]
            isOneToOne: false
            referencedRelation: "v_financing_schedule_current"
            referencedColumns: ["version_id"]
          },
          {
            foreignKeyName: "financing_schedule_rows_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "financing_schedule_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financing_schedule_rows_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "v_financing_schedule_current"
            referencedColumns: ["version_id"]
          },
        ]
      }
      financing_schedule_versions: {
        Row: {
          agreement_id: string
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          effective_from: string
          generated_at: string
          id: string
          index_rate_used: number | null
          is_current: boolean
          notes: string | null
          rate_applied: number | null
          reason: string
          updated_at: string
          updated_by: string | null
          version_no: number
        }
        Insert: {
          agreement_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          effective_from: string
          generated_at?: string
          id?: string
          index_rate_used?: number | null
          is_current?: boolean
          notes?: string | null
          rate_applied?: number | null
          reason?: string
          updated_at?: string
          updated_by?: string | null
          version_no: number
        }
        Update: {
          agreement_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          effective_from?: string
          generated_at?: string
          id?: string
          index_rate_used?: number | null
          is_current?: boolean
          notes?: string | null
          rate_applied?: number | null
          reason?: string
          updated_at?: string
          updated_by?: string | null
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "financing_schedule_versions_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "financing_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financing_schedule_versions_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "v_financing_agreement_summary"
            referencedColumns: ["agreement_id"]
          },
          {
            foreignKeyName: "financing_schedule_versions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          acquisition_date: string | null
          address_line1: string | null
          address_line2: string | null
          area_m2: number | null
          city: string | null
          code: string | null
          company_id: string
          conservatoria: string | null
          country_code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          disposal_date: string | null
          district: string | null
          drive_folder_id: string | null
          drive_folder_url: string | null
          gross_area_m2: number | null
          id: string
          land_registry_ref: string | null
          main_image_document_id: string | null
          matrix_article: string | null
          name: string
          notes: string | null
          parish: string | null
          postal_code: string | null
          property_type: string
          status: string
          updated_at: string
          updated_by: string | null
          year_built: number | null
        }
        Insert: {
          acquisition_date?: string | null
          address_line1?: string | null
          address_line2?: string | null
          area_m2?: number | null
          city?: string | null
          code?: string | null
          company_id: string
          conservatoria?: string | null
          country_code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          disposal_date?: string | null
          district?: string | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          gross_area_m2?: number | null
          id?: string
          land_registry_ref?: string | null
          main_image_document_id?: string | null
          matrix_article?: string | null
          name: string
          notes?: string | null
          parish?: string | null
          postal_code?: string | null
          property_type?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          year_built?: number | null
        }
        Update: {
          acquisition_date?: string | null
          address_line1?: string | null
          address_line2?: string | null
          area_m2?: number | null
          city?: string | null
          code?: string | null
          company_id?: string
          conservatoria?: string | null
          country_code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          disposal_date?: string | null
          district?: string | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          gross_area_m2?: number | null
          id?: string
          land_registry_ref?: string | null
          main_image_document_id?: string | null
          matrix_article?: string | null
          name?: string
          notes?: string | null
          parish?: string | null
          postal_code?: string | null
          property_type?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      property_acquisition_costs: {
        Row: {
          amount: number
          capitalisable: boolean
          company_id: string
          cost_type: string
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          description: string | null
          id: string
          incurred_on: string | null
          property_id: string
          source_id: string | null
          source_type: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount?: number
          capitalisable?: boolean
          company_id: string
          cost_type: string
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          incurred_on?: string | null
          property_id: string
          source_id?: string | null
          source_type?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          capitalisable?: boolean
          company_id?: string
          cost_type?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          incurred_on?: string | null
          property_id?: string
          source_id?: string | null
          source_type?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_acquisition_costs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_acquisition_costs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_acquisition_costs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "property_acquisition_costs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "property_acquisition_costs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
        ]
      }
      property_events: {
        Row: {
          amount: number | null
          company_id: string
          created_at: string
          created_by: string | null
          currency: string | null
          deleted_at: string | null
          description: string | null
          event_date: string
          event_type: string
          id: string
          is_manual: boolean
          property_id: string
          source_id: string | null
          source_type: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount?: number | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          description?: string | null
          event_date?: string
          event_type?: string
          id?: string
          is_manual?: boolean
          property_id: string
          source_id?: string | null
          source_type?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          description?: string | null
          event_date?: string
          event_type?: string
          id?: string
          is_manual?: boolean
          property_id?: string
          source_id?: string | null
          source_type?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "property_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "property_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
        ]
      }
      property_insurance_policies: {
        Row: {
          company_id: string
          cover_type: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          insured_amount: number | null
          insurer: string
          notes: string | null
          policy_number: string | null
          premium_amount: number | null
          premium_frequency: string | null
          property_id: string
          renewal_date: string | null
          start_date: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_id: string
          cover_type?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          insured_amount?: number | null
          insurer: string
          notes?: string | null
          policy_number?: string | null
          premium_amount?: number | null
          premium_frequency?: string | null
          property_id: string
          renewal_date?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          cover_type?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          insured_amount?: number | null
          insurer?: string
          notes?: string | null
          policy_number?: string | null
          premium_amount?: number | null
          premium_frequency?: string | null
          property_id?: string
          renewal_date?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_insurance_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_insurance_policies_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_insurance_policies_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "property_insurance_policies_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "property_insurance_policies_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
        ]
      }
      property_units: {
        Row: {
          area_m2: number | null
          bedrooms: number | null
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          floor: string | null
          id: string
          name: string | null
          notes: string | null
          property_id: string
          status: string
          unit_type: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          area_m2?: number | null
          bedrooms?: number | null
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          floor?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          property_id: string
          status?: string
          unit_type?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          area_m2?: number | null
          bedrooms?: number | null
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          floor?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          property_id?: string
          status?: string
          unit_type?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_units_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "property_units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "property_units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
        ]
      }
      property_valuations: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          document_id: string | null
          id: string
          method: string
          notes: string | null
          property_id: string
          updated_at: string
          updated_by: string | null
          valuation_date: string
          valuer: string | null
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          document_id?: string | null
          id?: string
          method?: string
          notes?: string | null
          property_id: string
          updated_at?: string
          updated_by?: string | null
          valuation_date: string
          valuer?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          document_id?: string | null
          id?: string
          method?: string
          notes?: string | null
          property_id?: string
          updated_at?: string
          updated_by?: string | null
          valuation_date?: string
          valuer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_valuations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_valuations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_valuations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "property_valuations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "property_valuations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
        ]
      }
      rent_schedules: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          created_by: string | null
          due_date: string
          id: string
          invoice_ref: string | null
          period_end: string
          period_start: string
          settled_on: string | null
          settled_source_id: string | null
          settled_source_type: string | null
          status: string
          tenancy_id: string
          updated_at: string
          updated_by: string | null
          vat_amount: number
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          due_date: string
          id?: string
          invoice_ref?: string | null
          period_end: string
          period_start: string
          settled_on?: string | null
          settled_source_id?: string | null
          settled_source_type?: string | null
          status?: string
          tenancy_id: string
          updated_at?: string
          updated_by?: string | null
          vat_amount?: number
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          due_date?: string
          id?: string
          invoice_ref?: string | null
          period_end?: string
          period_start?: string
          settled_on?: string | null
          settled_source_id?: string | null
          settled_source_type?: string | null
          status?: string
          tenancy_id?: string
          updated_at?: string
          updated_by?: string | null
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "rent_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_schedules_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancy_agreements"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tenancy_agreements: {
        Row: {
          base_rent: number
          code: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          deposit_amount: number | null
          drive_folder_id: string | null
          drive_folder_url: string | null
          end_date: string | null
          id: string
          indexation_month: number | null
          indexation_pct: number | null
          indexation_type: string
          notes: string | null
          notice_period_days: number | null
          payment_day: number | null
          payment_frequency: string
          property_id: string
          start_date: string
          status: string
          tenant_id: string
          unit_id: string | null
          updated_at: string
          updated_by: string | null
          vat_applicable: boolean
        }
        Insert: {
          base_rent?: number
          code?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          deposit_amount?: number | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          end_date?: string | null
          id?: string
          indexation_month?: number | null
          indexation_pct?: number | null
          indexation_type?: string
          notes?: string | null
          notice_period_days?: number | null
          payment_day?: number | null
          payment_frequency?: string
          property_id: string
          start_date: string
          status?: string
          tenant_id: string
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vat_applicable?: boolean
        }
        Update: {
          base_rent?: number
          code?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          deposit_amount?: number | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          end_date?: string | null
          id?: string
          indexation_month?: number | null
          indexation_pct?: number | null
          indexation_type?: string
          notes?: string | null
          notice_period_days?: number | null
          payment_day?: number | null
          payment_frequency?: string
          property_id?: string
          start_date?: string
          status?: string
          tenant_id?: string
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vat_applicable?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "tenancy_agreements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancy_agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancy_agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "tenancy_agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "tenancy_agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "tenancy_agreements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancy_agreements_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_units"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_fitout_loan_rows: {
        Row: {
          closing_balance: number
          company_id: string
          created_at: string
          created_by: string | null
          due_date: string
          id: string
          interest: number
          loan_id: string
          opening_balance: number
          period_no: number
          principal: number
          settled_on: string | null
          settled_source_id: string | null
          settled_source_type: string | null
          status: string
          total_payment: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          closing_balance?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          due_date: string
          id?: string
          interest?: number
          loan_id: string
          opening_balance?: number
          period_no: number
          principal?: number
          settled_on?: string | null
          settled_source_id?: string | null
          settled_source_type?: string | null
          status?: string
          total_payment?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          closing_balance?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          due_date?: string
          id?: string
          interest?: number
          loan_id?: string
          opening_balance?: number
          period_no?: number
          principal?: number
          settled_on?: string | null
          settled_source_id?: string | null
          settled_source_type?: string | null
          status?: string
          total_payment?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_fitout_loan_rows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_fitout_loan_rows_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "tenant_fitout_loans"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_fitout_loans: {
        Row: {
          code: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          description: string | null
          id: string
          interest_rate: number | null
          notes: string | null
          principal: number
          property_id: string
          repayment_type: string
          start_date: string | null
          status: string
          tenancy_id: string | null
          tenant_id: string
          term_months: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          interest_rate?: number | null
          notes?: string | null
          principal?: number
          property_id: string
          repayment_type?: string
          start_date?: string | null
          status?: string
          tenancy_id?: string | null
          tenant_id: string
          term_months?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          interest_rate?: number | null
          notes?: string | null
          principal?: number
          property_id?: string
          repayment_type?: string
          start_date?: string | null
          status?: string
          tenancy_id?: string | null
          tenant_id?: string
          term_months?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_fitout_loans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_fitout_loans_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_fitout_loans_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "tenant_fitout_loans_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "tenant_fitout_loans_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "tenant_fitout_loans_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancy_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_fitout_loans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          code: string | null
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          drive_folder_id: string | null
          drive_folder_url: string | null
          email: string | null
          id: string
          legal_name: string | null
          name: string
          notes: string | null
          phone: string | null
          status: string
          tax_number: string | null
          tenant_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          code?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          email?: string | null
          id?: string
          legal_name?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
          tax_number?: string | null
          tenant_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          code?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          email?: string | null
          id?: string
          legal_name?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          tax_number?: string | null
          tenant_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_dimensions: {
        Row: {
          allocation_pct: number
          amount: number | null
          company_id: string
          created_at: string
          created_by: string | null
          dimension_id: string
          dimension_value_id: string
          id: string
          is_primary: boolean
          source_id: string
          source_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allocation_pct?: number
          amount?: number | null
          company_id: string
          created_at?: string
          created_by?: string | null
          dimension_id: string
          dimension_value_id: string
          id?: string
          is_primary?: boolean
          source_id: string
          source_type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allocation_pct?: number
          amount?: number | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          dimension_id?: string
          dimension_value_id?: string
          id?: string
          is_primary?: boolean
          source_id?: string
          source_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_dimensions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_dimensions_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "dimensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_dimensions_dimension_value_id_fkey"
            columns: ["dimension_value_id"]
            isOneToOne: false
            referencedRelation: "dimension_values"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_cash_flow_entries: {
        Row: {
          actual_date: string | null
          agreement_id: string | null
          amount_net: number | null
          amount_total: number | null
          bank_account_id: string | null
          bank_account_name: string | null
          category: string | null
          commissions: number | null
          company_id: string | null
          confidence: string | null
          counterparty_name: string | null
          counterparty_type: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          deleted_at: string | null
          description: string | null
          direction: string | null
          document_id: string | null
          entry_date: string | null
          expected_date: string | null
          id: string | null
          insurance: number | null
          interest: number | null
          is_actual: boolean | null
          is_included: boolean | null
          is_manual: boolean | null
          lender: string | null
          notes: string | null
          occurrence_key: string | null
          principal: number | null
          project_id: string | null
          project_name: string | null
          property_code: string | null
          property_id: string | null
          property_inactive: boolean | null
          property_name: string | null
          property_status: string | null
          reconciliation_state: string | null
          rule_id: string | null
          scenario_code: string | null
          signed_amount: number | null
          source_id: string | null
          source_type: string | null
          state: string | null
          tenancy_id: string | null
          unit_id: string | null
          unit_name: string | null
          updated_at: string | null
          updated_by: string | null
          vat: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_entries_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "financing_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_entries_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "v_financing_agreement_summary"
            referencedColumns: ["agreement_id"]
          },
          {
            foreignKeyName: "cash_flow_entries_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_entries_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "capex_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_entries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_entries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "cash_flow_entries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "cash_flow_entries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "cash_flow_entries_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "cash_flow_recurring_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_entries_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancy_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_entries_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_units"
            referencedColumns: ["id"]
          },
        ]
      }
      v_cash_flow_projection: {
        Row: {
          agreement_id: string | null
          amount_total: number | null
          category: string | null
          commissions: number | null
          company_id: string | null
          direction: string | null
          insurance: number | null
          interest: number | null
          month: string | null
          principal: number | null
          property_id: string | null
          state: string | null
          vat: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_entries_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "financing_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_entries_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "v_financing_agreement_summary"
            referencedColumns: ["agreement_id"]
          },
          {
            foreignKeyName: "cash_flow_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_entries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_entries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "cash_flow_entries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "cash_flow_entries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
        ]
      }
      v_financing_agreement_summary: {
        Row: {
          agreement_id: string | null
          company_id: string | null
          currency: string | null
          end_date: string | null
          fixed_rate: number | null
          index_name: string | null
          instalment_count: number | null
          interest_paid: number | null
          lender: string | null
          next_due_date: string | null
          next_total_payment: number | null
          original_principal: number | null
          outstanding_principal: number | null
          paid_principal: number | null
          property_id: string | null
          rate_type: string | null
          remaining_total: number | null
          spread: number | null
          start_date: string | null
          status: string | null
          type: string | null
          version_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financing_agreements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financing_agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financing_agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "financing_agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "financing_agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
        ]
      }
      v_financing_schedule_current: {
        Row: {
          agreement_id: string | null
          closing_balance: number | null
          commissions: number | null
          company_id: string | null
          due_date: string | null
          fees: number | null
          id: string | null
          insurance: number | null
          interest: number | null
          is_locked: boolean | null
          opening_balance: number | null
          period_no: number | null
          principal: number | null
          property_id: string | null
          reconciled_at: string | null
          settled_amount: number | null
          settled_on: string | null
          status: string | null
          total_payment: number | null
          vat: number | null
          version_id: string | null
          version_no: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financing_agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financing_agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "financing_agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "financing_agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "financing_schedule_rows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financing_schedule_versions_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "financing_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financing_schedule_versions_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "v_financing_agreement_summary"
            referencedColumns: ["agreement_id"]
          },
        ]
      }
      v_portfolio_summary: {
        Row: {
          acquisition_total: number | null
          company_id: string | null
          estimated_equity: number | null
          monthly_rent: number | null
          outstanding_debt: number | null
          portfolio_value: number | null
          property_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      v_property_acquisition_totals: {
        Row: {
          acquisition_total: number | null
          capitalised_total: number | null
          company_id: string | null
          property_id: string | null
          purchase_price: number | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      v_property_current_valuation: {
        Row: {
          company_id: string | null
          current_valuation: number | null
          method: string | null
          property_id: string | null
          valuation_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_valuations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_valuations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_valuations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "property_valuations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "property_valuations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
        ]
      }
      v_property_debt_outstanding: {
        Row: {
          agreement_count: number | null
          company_id: string | null
          outstanding_debt: number | null
          property_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financing_agreements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financing_agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financing_agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "financing_agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "financing_agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
        ]
      }
      v_property_occupancy: {
        Row: {
          company_id: string | null
          occupancy_pct: number | null
          property_id: string | null
          rented_units: number | null
          unit_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      v_property_rent_roll: {
        Row: {
          active_tenancies: number | null
          company_id: string | null
          monthly_rent: number | null
          property_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenancy_agreements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancy_agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancy_agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "tenancy_agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "tenancy_agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
        ]
      }
      v_property_summary: {
        Row: {
          acquisition_date: string | null
          acquisition_total: number | null
          active_tenancies: number | null
          city: string | null
          code: string | null
          company_id: string | null
          current_valuation: number | null
          district: string | null
          drive_folder_url: string | null
          estimated_equity: number | null
          monthly_rent: number | null
          name: string | null
          occupancy_pct: number | null
          outstanding_debt: number | null
          property_id: string | null
          property_type: string | null
          purchase_price: number | null
          status: string | null
          unit_count: number | null
          valuation_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      v_property_timeline: {
        Row: {
          amount: number | null
          company_id: string | null
          description: string | null
          event_date: string | null
          event_type: string | null
          id: string | null
          is_manual: boolean | null
          property_code: string | null
          property_id: string | null
          property_name: string | null
          source_id: string | null
          source_type: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "property_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "property_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
        ]
      }
      v_search_index: {
        Row: {
          company_id: string | null
          entity_id: string | null
          entity_type: string | null
          occurred_at: string | null
          search_text: string | null
          subtitle: string | null
          title: string | null
          url_path: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_financing_schedule: {
        Args: {
          _agreement_id: string
          _effective_from: string
          _import_id?: string
          _index_rate_used?: number
          _notes?: string
          _rate_applied?: number
          _reason: string
          _rows: Json
        }
        Returns: string
      }
      can_manage_company: { Args: { _company_id: string }; Returns: boolean }
      can_record_company: { Args: { _company_id: string }; Returns: boolean }
      can_view_company: { Args: { _company_id: string }; Returns: boolean }
      cash_flow_monthly: {
        Args: {
          _bank_account_id?: string
          _category?: string
          _company_id: string
          _from: string
          _include_inactive?: boolean
          _months?: number
          _project_id?: string
          _property_id?: string
          _scenario?: string
          _states?: string[]
        }
        Returns: {
          actual_net: number
          closing_balance: number
          cumulative_liquidity: number
          financing: number
          forecast_net: number
          inflows: number
          month: string
          net_movement: number
          opening_balance: number
          other_outflows: number
          outflows: number
          projects: number
          recurring: number
          taxes: number
          variance: number
        }[]
      }
      current_company_id: { Args: never; Returns: string }
      generate_company_cash_flow: {
        Args: { _company_id: string; _through: string }
        Returns: number
      }
      generate_recurring_cash_flow: {
        Args: { _rule_id: string; _through: string }
        Returns: number
      }
      has_company_role: {
        Args: {
          _company_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      record_property_event: {
        Args: {
          _amount: number
          _company_id: string
          _description: string
          _event_date: string
          _event_type: string
          _property_id: string
          _source_id: string
          _source_type: string
          _title: string
        }
        Returns: undefined
      }
      seed_company_dimensions: {
        Args: { _company_id: string }
        Returns: undefined
      }
      seed_company_scenarios: {
        Args: { _company_id: string }
        Returns: undefined
      }
      shares_company_with: {
        Args: { _target: string; _viewer: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "owner"
        | "manager"
        | "bookkeeper"
        | "assistant"
        | "approver"
        | "viewer"
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
      app_role: [
        "owner",
        "manager",
        "bookkeeper",
        "assistant",
        "approver",
        "viewer",
      ],
    },
  },
} as const
