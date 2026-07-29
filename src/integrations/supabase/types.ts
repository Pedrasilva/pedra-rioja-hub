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
      approval_events: {
        Row: {
          actor_id: string | null
          comment: string | null
          company_id: string
          created_at: string
          event: string
          id: string
          request_id: string
        }
        Insert: {
          actor_id?: string | null
          comment?: string | null
          company_id: string
          created_at?: string
          event: string
          id?: string
          request_id: string
        }
        Update: {
          actor_id?: string | null
          comment?: string | null
          company_id?: string
          created_at?: string
          event?: string
          id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "approval_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          decided_at: string | null
          decided_by: string | null
          decision: string
          decision_reason: string | null
          id: string
          reason: string | null
          requested_amount: number | null
          requested_at: string
          requested_by: string
          rule_reference: string | null
          target_id: string
          target_type: string
          threshold_amount: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision?: string
          decision_reason?: string | null
          id?: string
          reason?: string | null
          requested_amount?: number | null
          requested_at?: string
          requested_by?: string
          rule_reference?: string | null
          target_id: string
          target_type: string
          threshold_amount?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision?: string
          decision_reason?: string | null
          id?: string
          reason?: string | null
          requested_amount?: number | null
          requested_at?: string
          requested_by?: string
          rule_reference?: string | null
          target_id?: string
          target_type?: string
          threshold_amount?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
        ]
      }
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
          {
            foreignKeyName: "audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
        ]
      }
      bank_account_documents: {
        Row: {
          bank_account_id: string
          company_id: string
          created_at: string
          created_by: string | null
          document_id: string
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bank_account_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          document_id: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bank_account_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          document_id?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_account_documents_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_account_documents_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "v_bank_account_balances"
            referencedColumns: ["bank_account_id"]
          },
          {
            foreignKeyName: "bank_account_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_account_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "bank_account_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_identifier: string | null
          account_type: string
          bank_name: string | null
          bic: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          drive_folder_url: string | null
          iban: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          opening_balance: number
          opening_balance_date: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_identifier?: string | null
          account_type?: string
          bank_name?: string | null
          bic?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          drive_folder_url?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          opening_balance?: number
          opening_balance_date?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_identifier?: string | null
          account_type?: string
          bank_name?: string | null
          bic?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          drive_folder_url?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          opening_balance?: number
          opening_balance_date?: string
          status?: string
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
          {
            foreignKeyName: "bank_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
        ]
      }
      bank_classification_rules: {
        Row: {
          bank_account_id: string | null
          cash_flow_category: string | null
          classification_id: string | null
          company_id: string
          counterparty_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          direction: string | null
          id: string
          is_active: boolean
          is_internal_transfer: boolean
          match_field: string
          match_type: string
          match_value: string
          max_amount: number | null
          min_amount: number | null
          name: string
          notes: string | null
          priority: number
          project_id: string | null
          property_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bank_account_id?: string | null
          cash_flow_category?: string | null
          classification_id?: string | null
          company_id: string
          counterparty_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          direction?: string | null
          id?: string
          is_active?: boolean
          is_internal_transfer?: boolean
          match_field?: string
          match_type?: string
          match_value: string
          max_amount?: number | null
          min_amount?: number | null
          name: string
          notes?: string | null
          priority?: number
          project_id?: string | null
          property_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bank_account_id?: string | null
          cash_flow_category?: string | null
          classification_id?: string | null
          company_id?: string
          counterparty_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          direction?: string | null
          id?: string
          is_active?: boolean
          is_internal_transfer?: boolean
          match_field?: string
          match_type?: string
          match_value?: string
          max_amount?: number | null
          min_amount?: number | null
          name?: string
          notes?: string | null
          priority?: number
          project_id?: string | null
          property_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_classification_rules_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_classification_rules_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "v_bank_account_balances"
            referencedColumns: ["bank_account_id"]
          },
          {
            foreignKeyName: "bank_classification_rules_classification_id_fkey"
            columns: ["classification_id"]
            isOneToOne: false
            referencedRelation: "financial_classifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_classification_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_classification_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "bank_classification_rules_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_classification_rules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "capex_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_classification_rules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_capex_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "bank_classification_rules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_classification_rules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "bank_classification_rules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "bank_classification_rules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
        ]
      }
      bank_reconciliation_matches: {
        Row: {
          allocated_amount: number
          bank_account_id: string | null
          bank_transaction_id: string
          company_id: string
          confirmed_at: string
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          entry_id: string
          forecast_amount: number | null
          id: string
          match_type: string
          notes: string | null
          reversal_reason: string | null
          reversed_at: string | null
          reversed_by: string | null
          status: string
          updated_at: string
          updated_by: string | null
          variance_amount: number
          variance_reason: string | null
        }
        Insert: {
          allocated_amount: number
          bank_account_id?: string | null
          bank_transaction_id: string
          company_id: string
          confirmed_at?: string
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          entry_id: string
          forecast_amount?: number | null
          id?: string
          match_type?: string
          notes?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          variance_amount?: number
          variance_reason?: string | null
        }
        Update: {
          allocated_amount?: number
          bank_account_id?: string | null
          bank_transaction_id?: string
          company_id?: string
          confirmed_at?: string
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          entry_id?: string
          forecast_amount?: number | null
          id?: string
          match_type?: string
          notes?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          variance_amount?: number
          variance_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_reconciliation_matches_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliation_matches_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "v_bank_account_balances"
            referencedColumns: ["bank_account_id"]
          },
          {
            foreignKeyName: "bank_reconciliation_matches_bank_transaction_id_fkey"
            columns: ["bank_transaction_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliation_matches_bank_transaction_id_fkey"
            columns: ["bank_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliation_matches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliation_matches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "bank_reconciliation_matches_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "cash_flow_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliation_matches_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "v_bank_expected_items"
            referencedColumns: ["entry_id"]
          },
          {
            foreignKeyName: "bank_reconciliation_matches_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_statement_import_rows: {
        Row: {
          amount: number
          bank_reference: string | null
          company_id: string
          counterparty_account: string | null
          counterparty_name: string | null
          created_at: string
          created_by: string | null
          credit_amount: number
          debit_amount: number
          description: string | null
          duplicate_of_transaction_id: string | null
          fingerprint: string
          id: string
          import_id: string
          include: boolean
          is_duplicate: boolean
          issues: Json
          line_no: number
          running_balance: number | null
          source_row_id: string | null
          transaction_date: string
          updated_at: string
          updated_by: string | null
          value_date: string | null
        }
        Insert: {
          amount?: number
          bank_reference?: string | null
          company_id: string
          counterparty_account?: string | null
          counterparty_name?: string | null
          created_at?: string
          created_by?: string | null
          credit_amount?: number
          debit_amount?: number
          description?: string | null
          duplicate_of_transaction_id?: string | null
          fingerprint: string
          id?: string
          import_id: string
          include?: boolean
          is_duplicate?: boolean
          issues?: Json
          line_no: number
          running_balance?: number | null
          source_row_id?: string | null
          transaction_date: string
          updated_at?: string
          updated_by?: string | null
          value_date?: string | null
        }
        Update: {
          amount?: number
          bank_reference?: string | null
          company_id?: string
          counterparty_account?: string | null
          counterparty_name?: string | null
          created_at?: string
          created_by?: string | null
          credit_amount?: number
          debit_amount?: number
          description?: string | null
          duplicate_of_transaction_id?: string | null
          fingerprint?: string
          id?: string
          import_id?: string
          include?: boolean
          is_duplicate?: boolean
          issues?: Json
          line_no?: number
          running_balance?: number | null
          source_row_id?: string | null
          transaction_date?: string
          updated_at?: string
          updated_by?: string | null
          value_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_statement_import_rows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_import_rows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "bank_statement_import_rows_duplicate_of_transaction_id_fkey"
            columns: ["duplicate_of_transaction_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_import_rows_duplicate_of_transaction_id_fkey"
            columns: ["duplicate_of_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_import_rows_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "bank_statement_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_statement_imports: {
        Row: {
          balance_override_at: string | null
          balance_override_by: string | null
          balance_override_reason: string | null
          bank_account_id: string
          committed_at: string | null
          committed_by: string | null
          company_id: string
          content_hash: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          document_id: string | null
          duplicate_count: number
          error_count: number
          file_name: string | null
          id: string
          imported_count: number
          notes: string | null
          period_end: string | null
          period_start: string | null
          reconciled_at: string | null
          reconciled_by: string | null
          row_count: number
          source: string
          statement_closing_balance: number | null
          statement_opening_balance: number | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          balance_override_at?: string | null
          balance_override_by?: string | null
          balance_override_reason?: string | null
          bank_account_id: string
          committed_at?: string | null
          committed_by?: string | null
          company_id: string
          content_hash?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_id?: string | null
          duplicate_count?: number
          error_count?: number
          file_name?: string | null
          id?: string
          imported_count?: number
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          row_count?: number
          source?: string
          statement_closing_balance?: number | null
          statement_opening_balance?: number | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          balance_override_at?: string | null
          balance_override_by?: string | null
          balance_override_reason?: string | null
          bank_account_id?: string
          committed_at?: string | null
          committed_by?: string | null
          company_id?: string
          content_hash?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          document_id?: string | null
          duplicate_count?: number
          error_count?: number
          file_name?: string | null
          id?: string
          imported_count?: number
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          row_count?: number
          source?: string
          statement_closing_balance?: number | null
          statement_opening_balance?: number | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_statement_imports_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_imports_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "v_bank_account_balances"
            referencedColumns: ["bank_account_id"]
          },
          {
            foreignKeyName: "bank_statement_imports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_imports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "bank_statement_imports_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          amount: number
          bank_account_id: string
          bank_reference: string | null
          company_id: string
          counterparty_account: string | null
          counterparty_name: string | null
          created_at: string
          created_by: string | null
          credit_amount: number
          currency: string
          debit_amount: number
          deleted_at: string | null
          description: string | null
          fingerprint: string
          id: string
          import_id: string | null
          is_internal_transfer: boolean
          matched_amount: number
          notes: string | null
          reconciliation_status: string
          running_balance: number | null
          source_row_id: string | null
          transaction_date: string
          updated_at: string
          updated_by: string | null
          value_date: string | null
        }
        Insert: {
          amount: number
          bank_account_id: string
          bank_reference?: string | null
          company_id: string
          counterparty_account?: string | null
          counterparty_name?: string | null
          created_at?: string
          created_by?: string | null
          credit_amount?: number
          currency?: string
          debit_amount?: number
          deleted_at?: string | null
          description?: string | null
          fingerprint: string
          id?: string
          import_id?: string | null
          is_internal_transfer?: boolean
          matched_amount?: number
          notes?: string | null
          reconciliation_status?: string
          running_balance?: number | null
          source_row_id?: string | null
          transaction_date: string
          updated_at?: string
          updated_by?: string | null
          value_date?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string
          bank_reference?: string | null
          company_id?: string
          counterparty_account?: string | null
          counterparty_name?: string | null
          created_at?: string
          created_by?: string | null
          credit_amount?: number
          currency?: string
          debit_amount?: number
          deleted_at?: string | null
          description?: string | null
          fingerprint?: string
          id?: string
          import_id?: string | null
          is_internal_transfer?: boolean
          matched_amount?: number
          notes?: string | null
          reconciliation_status?: string
          running_balance?: number | null
          source_row_id?: string | null
          transaction_date?: string
          updated_at?: string
          updated_by?: string | null
          value_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "v_bank_account_balances"
            referencedColumns: ["bank_account_id"]
          },
          {
            foreignKeyName: "bank_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "bank_transactions_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "bank_statement_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transfers: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          created_by: string | null
          from_account_id: string
          from_transaction_id: string
          id: string
          notes: string | null
          to_account_id: string
          to_transaction_id: string
          transfer_date: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          created_by?: string | null
          from_account_id: string
          from_transaction_id: string
          id?: string
          notes?: string | null
          to_account_id: string
          to_transaction_id: string
          transfer_date: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          from_account_id?: string
          from_transaction_id?: string
          id?: string
          notes?: string | null
          to_account_id?: string
          to_transaction_id?: string
          transfer_date?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_transfers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transfers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "bank_transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "v_bank_account_balances"
            referencedColumns: ["bank_account_id"]
          },
          {
            foreignKeyName: "bank_transfers_from_transaction_id_fkey"
            columns: ["from_transaction_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transfers_from_transaction_id_fkey"
            columns: ["from_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "v_bank_account_balances"
            referencedColumns: ["bank_account_id"]
          },
          {
            foreignKeyName: "bank_transfers_to_transaction_id_fkey"
            columns: ["to_transaction_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transfers_to_transaction_id_fkey"
            columns: ["to_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_bank_transactions"
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
            foreignKeyName: "capex_project_costs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "capex_project_costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "capex_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capex_project_costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_capex_summary"
            referencedColumns: ["project_id"]
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
            foreignKeyName: "capex_projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
          actual_amount: number | null
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
          forecast_amount: number | null
          id: string
          insurance: number
          interest: number
          is_included: boolean
          is_manual: boolean
          matched_amount: number
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
          variance_amount: number | null
          vat: number
        }
        Insert: {
          actual_amount?: number | null
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
          forecast_amount?: number | null
          id?: string
          insurance?: number
          interest?: number
          is_included?: boolean
          is_manual?: boolean
          matched_amount?: number
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
          variance_amount?: number | null
          vat?: number
        }
        Update: {
          actual_amount?: number | null
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
          forecast_amount?: number | null
          id?: string
          insurance?: number
          interest?: number
          is_included?: boolean
          is_manual?: boolean
          matched_amount?: number
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
          variance_amount?: number | null
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
            foreignKeyName: "cash_flow_entries_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "v_bank_account_balances"
            referencedColumns: ["bank_account_id"]
          },
          {
            foreignKeyName: "cash_flow_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
            foreignKeyName: "cash_flow_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_capex_summary"
            referencedColumns: ["project_id"]
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
            foreignKeyName: "cash_flow_recurring_rules_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "v_bank_account_balances"
            referencedColumns: ["bank_account_id"]
          },
          {
            foreignKeyName: "cash_flow_recurring_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_recurring_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
            foreignKeyName: "cash_flow_recurring_rules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_capex_summary"
            referencedColumns: ["project_id"]
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
          {
            foreignKeyName: "cash_flow_scenarios_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
        ]
      }
      commitment_drawdowns: {
        Row: {
          amount: number
          commitment_id: string
          company_id: string
          created_at: string
          created_by: string | null
          document_id: string | null
          drawdown_date: string
          id: string
          kind: string
          notes: string | null
          reversal_reason: string | null
          reversed_at: string | null
          reversed_by: string | null
          reverses_drawdown_id: string | null
          schedule_line_id: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount: number
          commitment_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          drawdown_date?: string
          id?: string
          kind?: string
          notes?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          reverses_drawdown_id?: string | null
          schedule_line_id?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          commitment_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          drawdown_date?: string
          id?: string
          kind?: string
          notes?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          reverses_drawdown_id?: string | null
          schedule_line_id?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commitment_drawdowns_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitment_drawdowns_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "v_commitment_summary"
            referencedColumns: ["commitment_id"]
          },
          {
            foreignKeyName: "commitment_drawdowns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitment_drawdowns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "commitment_drawdowns_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "financial_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitment_drawdowns_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_document_journal"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "commitment_drawdowns_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_income_statement"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "commitment_drawdowns_reverses_drawdown_id_fkey"
            columns: ["reverses_drawdown_id"]
            isOneToOne: false
            referencedRelation: "commitment_drawdowns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitment_drawdowns_schedule_line_id_fkey"
            columns: ["schedule_line_id"]
            isOneToOne: false
            referencedRelation: "commitment_schedule_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      commitment_schedule_lines: {
        Row: {
          amount: number
          commitment_id: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          expected_date: string
          id: string
          is_contingency: boolean
          is_retention: boolean
          line_no: number
          line_type: string
          source_id: string | null
          source_type: string | null
          status: string
          superseded_at: string | null
          superseded_by_version_id: string | null
          updated_at: string
          updated_by: string | null
          version_id: string
        }
        Insert: {
          amount: number
          commitment_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expected_date: string
          id?: string
          is_contingency?: boolean
          is_retention?: boolean
          line_no: number
          line_type?: string
          source_id?: string | null
          source_type?: string | null
          status?: string
          superseded_at?: string | null
          superseded_by_version_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version_id: string
        }
        Update: {
          amount?: number
          commitment_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expected_date?: string
          id?: string
          is_contingency?: boolean
          is_retention?: boolean
          line_no?: number
          line_type?: string
          source_id?: string | null
          source_type?: string | null
          status?: string
          superseded_at?: string | null
          superseded_by_version_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commitment_schedule_lines_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitment_schedule_lines_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "v_commitment_summary"
            referencedColumns: ["commitment_id"]
          },
          {
            foreignKeyName: "commitment_schedule_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitment_schedule_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "commitment_schedule_lines_superseded_by_version_id_fkey"
            columns: ["superseded_by_version_id"]
            isOneToOne: false
            referencedRelation: "commitment_schedule_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitment_schedule_lines_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "commitment_schedule_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      commitment_schedule_versions: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          approval_request_id: string | null
          commitment_id: string
          company_id: string
          created_at: string
          created_by: string | null
          effective_from: string
          id: string
          is_current: boolean
          notes: string | null
          reason: string | null
          requires_approval: boolean
          schedule_type: string
          status: string
          superseded_at: string | null
          superseded_by_version_id: string | null
          total_amount: number
          updated_at: string
          updated_by: string | null
          variance_amount: number
          variance_approved: boolean
          variance_reason: string | null
          version_no: number
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          approval_request_id?: string | null
          commitment_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          effective_from: string
          id?: string
          is_current?: boolean
          notes?: string | null
          reason?: string | null
          requires_approval?: boolean
          schedule_type?: string
          status?: string
          superseded_at?: string | null
          superseded_by_version_id?: string | null
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
          variance_amount?: number
          variance_approved?: boolean
          variance_reason?: string | null
          version_no: number
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          approval_request_id?: string | null
          commitment_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          id?: string
          is_current?: boolean
          notes?: string | null
          reason?: string | null
          requires_approval?: boolean
          schedule_type?: string
          status?: string
          superseded_at?: string | null
          superseded_by_version_id?: string | null
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
          variance_amount?: number
          variance_approved?: boolean
          variance_reason?: string | null
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "commitment_schedule_versions_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitment_schedule_versions_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitment_schedule_versions_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "v_commitment_summary"
            referencedColumns: ["commitment_id"]
          },
          {
            foreignKeyName: "commitment_schedule_versions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitment_schedule_versions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "commitment_schedule_versions_superseded_by_version_id_fkey"
            columns: ["superseded_by_version_id"]
            isOneToOne: false
            referencedRelation: "commitment_schedule_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      commitments: {
        Row: {
          approval_override_reason: string | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          archived_at: string | null
          authorised_amount: number
          cancellation_reason: string | null
          code: string | null
          commitment_type: string
          committed_amount: number
          company_id: string
          completion_notes: string | null
          counterparty_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          description: string | null
          end_date: string | null
          id: string
          notes: string | null
          source_id: string | null
          source_type: string | null
          start_date: string | null
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approval_override_reason?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          authorised_amount?: number
          cancellation_reason?: string | null
          code?: string | null
          commitment_type?: string
          committed_amount?: number
          company_id: string
          completion_notes?: string | null
          counterparty_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          source_id?: string | null
          source_type?: string | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approval_override_reason?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          authorised_amount?: number
          cancellation_reason?: string | null
          code?: string | null
          commitment_type?: string
          committed_amount?: number
          company_id?: string
          completion_notes?: string | null
          counterparty_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          source_id?: string | null
          source_type?: string | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commitments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "commitments_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
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
      counterparties: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          bic: string | null
          city: string | null
          code: string | null
          company_id: string
          contact_name: string | null
          counterparty_type: string
          country_code: string
          created_at: string
          created_by: string | null
          currency: string
          default_classification_id: string | null
          deleted_at: string | null
          email: string | null
          iban: string | null
          id: string
          is_client: boolean
          is_supplier: boolean
          legal_name: string | null
          name: string
          nif: string | null
          notes: string | null
          payment_method: string | null
          payment_terms_days: number | null
          phone: string | null
          postal_code: string | null
          status: string
          trading_name: string | null
          updated_at: string
          updated_by: string | null
          website: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          bic?: string | null
          city?: string | null
          code?: string | null
          company_id: string
          contact_name?: string | null
          counterparty_type?: string
          country_code?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          default_classification_id?: string | null
          deleted_at?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          is_client?: boolean
          is_supplier?: boolean
          legal_name?: string | null
          name: string
          nif?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          postal_code?: string | null
          status?: string
          trading_name?: string | null
          updated_at?: string
          updated_by?: string | null
          website?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          bic?: string | null
          city?: string | null
          code?: string | null
          company_id?: string
          contact_name?: string | null
          counterparty_type?: string
          country_code?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          default_classification_id?: string | null
          deleted_at?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          is_client?: boolean
          is_supplier?: boolean
          legal_name?: string | null
          name?: string
          nif?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          postal_code?: string | null
          status?: string
          trading_name?: string | null
          updated_at?: string
          updated_by?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "counterparties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "counterparties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "counterparties_default_classification_fk"
            columns: ["default_classification_id"]
            isOneToOne: false
            referencedRelation: "financial_classifications"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "depreciation_assets_capex_project_id_fkey"
            columns: ["capex_project_id"]
            isOneToOne: false
            referencedRelation: "v_capex_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "depreciation_assets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depreciation_assets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
          {
            foreignKeyName: "depreciation_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
            foreignKeyName: "dimension_values_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
          {
            foreignKeyName: "dimensions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
            foreignKeyName: "document_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
          {
            foreignKeyName: "drive_folders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
        ]
      }
      financial_classifications: {
        Row: {
          affects_cash_flow: boolean
          affects_profit: boolean
          cash_flow_category: string | null
          code: string
          company_id: string | null
          counterparty_required: boolean
          created_at: string
          created_by: string | null
          default_vat_code: string | null
          default_vat_rate: number | null
          id: string
          is_active: boolean
          level: number
          name_en: string
          name_pt: string | null
          nature: string
          parent_id: string | null
          project_link_allowed: boolean
          property_link_allowed: boolean
          sort_order: number
          updated_at: string
          updated_by: string | null
          vat_recoverable: boolean
        }
        Insert: {
          affects_cash_flow?: boolean
          affects_profit?: boolean
          cash_flow_category?: string | null
          code: string
          company_id?: string | null
          counterparty_required?: boolean
          created_at?: string
          created_by?: string | null
          default_vat_code?: string | null
          default_vat_rate?: number | null
          id?: string
          is_active?: boolean
          level?: number
          name_en: string
          name_pt?: string | null
          nature?: string
          parent_id?: string | null
          project_link_allowed?: boolean
          property_link_allowed?: boolean
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          vat_recoverable?: boolean
        }
        Update: {
          affects_cash_flow?: boolean
          affects_profit?: boolean
          cash_flow_category?: string | null
          code?: string
          company_id?: string | null
          counterparty_required?: boolean
          created_at?: string
          created_by?: string | null
          default_vat_code?: string | null
          default_vat_rate?: number | null
          id?: string
          is_active?: boolean
          level?: number
          name_en?: string
          name_pt?: string | null
          nature?: string
          parent_id?: string | null
          project_link_allowed?: boolean
          property_link_allowed?: boolean
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          vat_recoverable?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "financial_classifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_classifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "financial_classifications_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "financial_classifications"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_document_lines: {
        Row: {
          classification_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          discount_pct: number
          document_id: string
          gross_amount: number
          id: string
          line_no: number
          net_amount: number
          notes: string | null
          project_id: string | null
          property_id: string | null
          quantity: number
          unit_id: string | null
          unit_price: number
          updated_at: string
          updated_by: string | null
          vat_amount: number
          vat_code: string | null
          vat_rate: number
          vat_recoverable: boolean
        }
        Insert: {
          classification_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_pct?: number
          document_id: string
          gross_amount?: number
          id?: string
          line_no?: number
          net_amount?: number
          notes?: string | null
          project_id?: string | null
          property_id?: string | null
          quantity?: number
          unit_id?: string | null
          unit_price?: number
          updated_at?: string
          updated_by?: string | null
          vat_amount?: number
          vat_code?: string | null
          vat_rate?: number
          vat_recoverable?: boolean
        }
        Update: {
          classification_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_pct?: number
          document_id?: string
          gross_amount?: number
          id?: string
          line_no?: number
          net_amount?: number
          notes?: string | null
          project_id?: string | null
          property_id?: string | null
          quantity?: number
          unit_id?: string | null
          unit_price?: number
          updated_at?: string
          updated_by?: string | null
          vat_amount?: number
          vat_code?: string | null
          vat_rate?: number
          vat_recoverable?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "financial_document_lines_classification_id_fkey"
            columns: ["classification_id"]
            isOneToOne: false
            referencedRelation: "financial_classifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_document_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_document_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "financial_document_lines_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "financial_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_document_lines_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_document_journal"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "financial_document_lines_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_income_statement"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "financial_document_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "capex_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_document_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_capex_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "financial_document_lines_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_document_lines_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "financial_document_lines_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "financial_document_lines_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "financial_document_lines_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_units"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_documents: {
        Row: {
          atcud: string | null
          bank_account_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          classification_id: string | null
          company_id: string
          corrects_document_id: string | null
          counterparty_id: string | null
          counterparty_name: string | null
          counterparty_nif: string | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          direction: string
          doc_type: string
          document_id: string | null
          document_number: string | null
          due_date: string | null
          gross_amount: number
          id: string
          issue_date: string
          net_amount: number
          notes: string | null
          outstanding_amount: number
          paid_amount: number
          payable_amount: number
          payment_state: string
          period_id: string | null
          posted_at: string | null
          posted_by: string | null
          project_id: string | null
          property_id: string | null
          series: string | null
          source_id: string | null
          source_type: string | null
          status: string
          tax_period: string | null
          unit_id: string | null
          updated_at: string
          updated_by: string | null
          vat_amount: number
          withholding_amount: number
          withholding_rate: number | null
        }
        Insert: {
          atcud?: string | null
          bank_account_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          classification_id?: string | null
          company_id: string
          corrects_document_id?: string | null
          counterparty_id?: string | null
          counterparty_name?: string | null
          counterparty_nif?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          direction: string
          doc_type?: string
          document_id?: string | null
          document_number?: string | null
          due_date?: string | null
          gross_amount?: number
          id?: string
          issue_date?: string
          net_amount?: number
          notes?: string | null
          outstanding_amount?: number
          paid_amount?: number
          payable_amount?: number
          payment_state?: string
          period_id?: string | null
          posted_at?: string | null
          posted_by?: string | null
          project_id?: string | null
          property_id?: string | null
          series?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          tax_period?: string | null
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vat_amount?: number
          withholding_amount?: number
          withholding_rate?: number | null
        }
        Update: {
          atcud?: string | null
          bank_account_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          classification_id?: string | null
          company_id?: string
          corrects_document_id?: string | null
          counterparty_id?: string | null
          counterparty_name?: string | null
          counterparty_nif?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          direction?: string
          doc_type?: string
          document_id?: string | null
          document_number?: string | null
          due_date?: string | null
          gross_amount?: number
          id?: string
          issue_date?: string
          net_amount?: number
          notes?: string | null
          outstanding_amount?: number
          paid_amount?: number
          payable_amount?: number
          payment_state?: string
          period_id?: string | null
          posted_at?: string | null
          posted_by?: string | null
          project_id?: string | null
          property_id?: string | null
          series?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          tax_period?: string | null
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vat_amount?: number
          withholding_amount?: number
          withholding_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_documents_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_documents_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "v_bank_account_balances"
            referencedColumns: ["bank_account_id"]
          },
          {
            foreignKeyName: "financial_documents_classification_id_fkey"
            columns: ["classification_id"]
            isOneToOne: false
            referencedRelation: "financial_classifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "financial_documents_corrects_document_id_fkey"
            columns: ["corrects_document_id"]
            isOneToOne: false
            referencedRelation: "financial_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_documents_corrects_document_id_fkey"
            columns: ["corrects_document_id"]
            isOneToOne: false
            referencedRelation: "v_document_journal"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "financial_documents_corrects_document_id_fkey"
            columns: ["corrects_document_id"]
            isOneToOne: false
            referencedRelation: "v_income_statement"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "financial_documents_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_documents_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "financial_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "capex_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_capex_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "financial_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "financial_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "financial_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "financial_documents_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_units"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_payments: {
        Row: {
          amount: number
          bank_account_id: string | null
          bank_transaction_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          document_id: string
          entry_id: string | null
          id: string
          match_id: string | null
          method: string | null
          notes: string | null
          payment_date: string
          reversal_reason: string | null
          reversed_at: string | null
          reversed_by: string | null
          source_id: string | null
          source_type: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          bank_transaction_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          document_id: string
          entry_id?: string | null
          id?: string
          match_id?: string | null
          method?: string | null
          notes?: string | null
          payment_date?: string
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          bank_transaction_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          document_id?: string
          entry_id?: string | null
          id?: string
          match_id?: string | null
          method?: string | null
          notes?: string | null
          payment_date?: string
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "v_bank_account_balances"
            referencedColumns: ["bank_account_id"]
          },
          {
            foreignKeyName: "financial_payments_bank_transaction_id_fkey"
            columns: ["bank_transaction_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_payments_bank_transaction_id_fkey"
            columns: ["bank_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "financial_payments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "financial_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_payments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_document_journal"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "financial_payments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_income_statement"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "financial_payments_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "cash_flow_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_payments_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "v_bank_expected_items"
            referencedColumns: ["entry_id"]
          },
          {
            foreignKeyName: "financial_payments_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_payments_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "bank_reconciliation_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_payments_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "v_bank_reconciliation_exceptions"
            referencedColumns: ["match_id"]
          },
        ]
      }
      financial_period_totals: {
        Row: {
          bucket: string
          company_id: string
          computed_at: string
          created_at: string
          created_by: string | null
          direction: string | null
          gross_amount: number
          id: string
          net_amount: number
          period_id: string
          updated_at: string
          updated_by: string | null
          vat_amount: number
          vat_code: string | null
          vat_rate: number | null
        }
        Insert: {
          bucket: string
          company_id: string
          computed_at?: string
          created_at?: string
          created_by?: string | null
          direction?: string | null
          gross_amount?: number
          id?: string
          net_amount?: number
          period_id: string
          updated_at?: string
          updated_by?: string | null
          vat_amount?: number
          vat_code?: string | null
          vat_rate?: number | null
        }
        Update: {
          bucket?: string
          company_id?: string
          computed_at?: string
          created_at?: string
          created_by?: string | null
          direction?: string | null
          gross_amount?: number
          id?: string
          net_amount?: number
          period_id?: string
          updated_at?: string
          updated_by?: string | null
          vat_amount?: number
          vat_code?: string | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_period_totals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_period_totals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "financial_period_totals_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "financial_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          period_end: string
          period_start: string
          period_type: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          period_type?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          period_type?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
            foreignKeyName: "financing_agreements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
            foreignKeyName: "financing_schedule_import_rows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
            foreignKeyName: "financing_schedule_imports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
            foreignKeyName: "financing_schedule_rows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
          {
            foreignKeyName: "financing_schedule_versions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
        ]
      }
      maintenance_jobs: {
        Row: {
          archived_at: string | null
          cancellation_reason: string | null
          code: string | null
          commitment_id: string | null
          company_id: string
          completion_date: string | null
          counterparty_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          notes: string | null
          priority: string
          requested_date: string
          responsible_name: string | null
          responsible_user_id: string | null
          status: string
          target_date: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          cancellation_reason?: string | null
          code?: string | null
          commitment_id?: string | null
          company_id: string
          completion_date?: string | null
          counterparty_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          priority?: string
          requested_date?: string
          responsible_name?: string | null
          responsible_user_id?: string | null
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          cancellation_reason?: string | null
          code?: string | null
          commitment_id?: string | null
          company_id?: string
          completion_date?: string | null
          counterparty_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          priority?: string
          requested_date?: string
          responsible_name?: string | null
          responsible_user_id?: string | null
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_jobs_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_jobs_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "v_commitment_summary"
            referencedColumns: ["commitment_id"]
          },
          {
            foreignKeyName: "maintenance_jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "maintenance_jobs_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
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
          {
            foreignKeyName: "properties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
            foreignKeyName: "property_acquisition_costs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
            foreignKeyName: "property_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
            foreignKeyName: "property_insurance_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
            foreignKeyName: "property_units_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
            foreignKeyName: "property_valuations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
            foreignKeyName: "rent_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
          {
            foreignKeyName: "settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
            foreignKeyName: "tenancy_agreements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
            foreignKeyName: "tenant_fitout_loan_rows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
            foreignKeyName: "tenant_fitout_loans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
          {
            foreignKeyName: "tenants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
            foreignKeyName: "transaction_dimensions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
        ]
      }
    }
    Views: {
      v_bank_account_balances: {
        Row: {
          account_identifier: string | null
          account_type: string | null
          bank_account_id: string | null
          bank_name: string | null
          company_id: string | null
          currency: string | null
          iban: string | null
          inflows: number | null
          last_transaction_date: string | null
          movement: number | null
          name: string | null
          opening_balance: number | null
          opening_balance_date: string | null
          outflows: number | null
          status: string | null
          system_balance: number | null
          unreconciled_count: number | null
          unreconciled_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
        ]
      }
      v_bank_expected_items: {
        Row: {
          agreement_id: string | null
          bank_account_id: string | null
          category: string | null
          company_id: string | null
          counterparty_name: string | null
          currency: string | null
          description: string | null
          direction: string | null
          entry_id: string | null
          expected_amount: number | null
          expected_date: string | null
          matched_amount: number | null
          outstanding_amount: number | null
          property_code: string | null
          property_id: string | null
          property_name: string | null
          reconciliation_state: string | null
          rule_id: string | null
          source_type: string | null
          state: string | null
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
            foreignKeyName: "cash_flow_entries_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "v_bank_account_balances"
            referencedColumns: ["bank_account_id"]
          },
          {
            foreignKeyName: "cash_flow_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
        ]
      }
      v_bank_reconciliation_exceptions: {
        Row: {
          allocated_amount: number | null
          bank_account_id: string | null
          bank_transaction_id: string | null
          category: string | null
          company_id: string | null
          entry_description: string | null
          entry_id: string | null
          forecast_amount: number | null
          match_id: string | null
          match_type: string | null
          property_id: string | null
          status: string | null
          transaction_date: string | null
          transaction_description: string | null
          variance_amount: number | null
          variance_reason: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_reconciliation_matches_bank_transaction_id_fkey"
            columns: ["bank_transaction_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliation_matches_bank_transaction_id_fkey"
            columns: ["bank_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliation_matches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliation_matches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "bank_reconciliation_matches_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "cash_flow_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliation_matches_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "v_bank_expected_items"
            referencedColumns: ["entry_id"]
          },
          {
            foreignKeyName: "bank_reconciliation_matches_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "v_bank_account_balances"
            referencedColumns: ["bank_account_id"]
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
      v_bank_transactions: {
        Row: {
          account_currency: string | null
          account_name: string | null
          amount: number | null
          bank_account_id: string | null
          bank_name: string | null
          bank_reference: string | null
          company_id: string | null
          counterparty_account: string | null
          counterparty_name: string | null
          created_at: string | null
          created_by: string | null
          credit_amount: number | null
          currency: string | null
          debit_amount: number | null
          deleted_at: string | null
          description: string | null
          fingerprint: string | null
          id: string | null
          import_id: string | null
          is_internal_transfer: boolean | null
          match_count: number | null
          matched_amount: number | null
          notes: string | null
          outstanding_amount: number | null
          reconciliation_status: string | null
          running_balance: number | null
          source_row_id: string | null
          transaction_date: string | null
          updated_at: string | null
          updated_by: string | null
          value_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "v_bank_account_balances"
            referencedColumns: ["bank_account_id"]
          },
          {
            foreignKeyName: "bank_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "bank_transactions_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "bank_statement_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      v_bookkeeping_overview: {
        Row: {
          cancelled_count: number | null
          company_id: string | null
          draft_count: number | null
          outstanding_client_amount: number | null
          outstanding_client_count: number | null
          outstanding_supplier_amount: number | null
          outstanding_supplier_count: number | null
          overdue_amount: number | null
          overdue_count: number | null
          posted_count: number | null
        }
        Relationships: []
      }
      v_capex_summary: {
        Row: {
          active_commitments: number | null
          actual_amount: number | null
          actual_end_date: string | null
          approved_commitments: number | null
          budget_amount: number | null
          code: string | null
          commitment_variance: number | null
          committed_amount: number | null
          company_id: string | null
          currency: string | null
          forecast_amount: number | null
          invoice_variance: number | null
          invoiced_amount: number | null
          name: string | null
          paid_amount: number | null
          project_id: string | null
          project_type: string | null
          property_code: string | null
          property_id: string | null
          property_name: string | null
          remaining_budget: number | null
          spend_pct: number | null
          start_date: string | null
          status: string | null
          target_end_date: string | null
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
            foreignKeyName: "capex_projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
            foreignKeyName: "cash_flow_entries_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "v_bank_account_balances"
            referencedColumns: ["bank_account_id"]
          },
          {
            foreignKeyName: "cash_flow_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
            foreignKeyName: "cash_flow_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_capex_summary"
            referencedColumns: ["project_id"]
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
            foreignKeyName: "cash_flow_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
      v_commitment_summary: {
        Row: {
          approval_status: string | null
          approved_committed_amount: number | null
          approved_variance: number | null
          archived_at: string | null
          authorised_amount: number | null
          available_drawdown: number | null
          code: string | null
          commitment_id: string | null
          commitment_type: string | null
          company_id: string | null
          counterparty_id: string | null
          counterparty_name: string | null
          created_at: string | null
          currency: string | null
          deleted_at: string | null
          end_date: string | null
          invoiced_amount: number | null
          overdue_scheduled_amount: number | null
          paid_amount: number | null
          project_id: string | null
          property_id: string | null
          remaining_commitment: number | null
          retained_amount: number | null
          scheduled_amount: number | null
          start_date: string | null
          status: string | null
          title: string | null
          unapproved_variance: number | null
          unit_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commitments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "commitments_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
        ]
      }
      v_counterparty_ageing: {
        Row: {
          company_id: string | null
          counterparty_id: string | null
          counterparty_name: string | null
          currency: string | null
          direction: string | null
          document_count: number | null
          due_1_30: number | null
          due_31_60: number | null
          due_61_90: number | null
          due_over_90: number | null
          not_due: number | null
          oldest_due_date: string | null
          outstanding_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "financial_documents_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
        ]
      }
      v_debt_maturity: {
        Row: {
          agreement_count: number | null
          company_id: string | null
          maturity_year: number | null
          outstanding_principal: number | null
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
            foreignKeyName: "financing_agreements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
        ]
      }
      v_debt_summary: {
        Row: {
          agreement_count: number | null
          company_id: string | null
          currency: string | null
          earliest_maturity: string | null
          interest_paid: number | null
          latest_maturity: string | null
          lender: string | null
          next_due_date: string | null
          original_principal: number | null
          outstanding_principal: number | null
          remaining_total: number | null
          weighted_rate: number | null
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
            foreignKeyName: "financing_agreements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
        ]
      }
      v_document_journal: {
        Row: {
          atcud: string | null
          classification_code: string | null
          classification_name: string | null
          company_id: string | null
          counterparty_name: string | null
          counterparty_nif: string | null
          currency: string | null
          description: string | null
          direction: string | null
          doc_type: string | null
          document_id: string | null
          document_number: string | null
          due_date: string | null
          gross_amount: number | null
          issue_date: string | null
          line_no: number | null
          net_amount: number | null
          payment_state: string | null
          project_code: string | null
          property_code: string | null
          series: string | null
          status: string | null
          vat_amount: number | null
          vat_code: string | null
          vat_rate: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
            foreignKeyName: "financing_agreements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
            foreignKeyName: "financing_schedule_rows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
      v_income_statement: {
        Row: {
          bucket: string | null
          cash_flow_category: string | null
          classification_code: string | null
          classification_id: string | null
          classification_name: string | null
          company_id: string | null
          counterparty_name: string | null
          currency: string | null
          direction: string | null
          document_id: string | null
          document_number: string | null
          gross_amount: number | null
          issue_date: string | null
          month: string | null
          nature: string | null
          net_amount: number | null
          project_id: string | null
          property_id: string | null
          vat_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_document_lines_classification_id_fkey"
            columns: ["classification_id"]
            isOneToOne: false
            referencedRelation: "financial_classifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_document_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "capex_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_document_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_capex_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "financial_document_lines_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_document_lines_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "financial_document_lines_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "financial_document_lines_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "financial_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
        ]
      }
      v_maintenance_job_summary: {
        Row: {
          archived_at: string | null
          commitment_id: string | null
          commitment_status: string | null
          commitment_title: string | null
          committed_amount: number | null
          company_id: string | null
          completion_date: string | null
          counterparty_id: string | null
          counterparty_name: string | null
          created_at: string | null
          deleted_at: string | null
          invoiced_amount: number | null
          job_id: string | null
          paid_amount: number | null
          priority: string | null
          requested_date: string | null
          responsible_name: string | null
          status: string | null
          target_date: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_jobs_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_jobs_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "v_commitment_summary"
            referencedColumns: ["commitment_id"]
          },
          {
            foreignKeyName: "maintenance_jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "maintenance_jobs_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
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
          {
            foreignKeyName: "properties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
          {
            foreignKeyName: "properties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
            foreignKeyName: "property_valuations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
            foreignKeyName: "financing_agreements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
          {
            foreignKeyName: "properties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
            foreignKeyName: "tenancy_agreements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
          {
            foreignKeyName: "properties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
            foreignKeyName: "property_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
      activate_commitment: {
        Args: { _commitment_id: string }
        Returns: undefined
      }
      activate_commitment_schedule_version: {
        Args: { _reason?: string; _version_id: string }
        Returns: number
      }
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
      approve_commitment: {
        Args: {
          _comment?: string
          _commitment_id: string
          _override_reason?: string
        }
        Returns: undefined
      }
      approve_commitment_variance: {
        Args: { _reason: string; _version_id: string }
        Returns: undefined
      }
      bank_statement_balance_check: {
        Args: { _import_id: string }
        Returns: {
          difference: number
          statement_closing: number
          system_closing: number
          unreconciled_count: number
          unreconciled_value: number
        }[]
      }
      can_approve_company: { Args: { _company_id: string }; Returns: boolean }
      can_manage_company: { Args: { _company_id: string }; Returns: boolean }
      can_record_company: { Args: { _company_id: string }; Returns: boolean }
      can_view_company: { Args: { _company_id: string }; Returns: boolean }
      cancel_commitment: {
        Args: { _commitment_id: string; _reason: string }
        Returns: undefined
      }
      cash_flow_entry_from_transaction: {
        Args: {
          _bank_transaction_id: string
          _category?: string
          _counterparty_name?: string
          _description?: string
          _notes?: string
          _property_id?: string
          _vat?: number
        }
        Returns: string
      }
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
      close_financial_period: {
        Args: { _notes?: string; _period_id: string }
        Returns: {
          closed_at: string | null
          closed_by: string | null
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          period_end: string
          period_start: string
          period_type: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "financial_periods"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      commit_bank_statement_import: {
        Args: { _import_id: string }
        Returns: Json
      }
      commitment_attribution: {
        Args: { _commitment_id: string }
        Returns: {
          project_id: string
          property_id: string
          unit_id: string
        }[]
      }
      commitment_summary: { Args: { _commitment_id: string }; Returns: Json }
      complete_commitment: {
        Args: { _commitment_id: string; _notes?: string }
        Returns: undefined
      }
      confirm_bank_match: {
        Args: {
          _allocations: Json
          _bank_transaction_id: string
          _notes?: string
        }
        Returns: Json
      }
      create_commitment_draft: {
        Args: {
          _authorised_amount?: number
          _code?: string
          _commitment_type?: string
          _company_id: string
          _counterparty_id?: string
          _currency?: string
          _description?: string
          _end_date?: string
          _notes?: string
          _source_id?: string
          _source_type?: string
          _start_date?: string
          _title: string
        }
        Returns: string
      }
      create_commitment_drawdown: {
        Args: {
          _amount: number
          _commitment_id: string
          _document_id: string
          _drawdown_date?: string
          _kind?: string
          _notes?: string
          _schedule_line_id?: string
        }
        Returns: string
      }
      create_commitment_schedule_version: {
        Args: {
          _commitment_id: string
          _effective_from: string
          _lines: Json
          _notes?: string
          _reason?: string
          _schedule_type?: string
        }
        Returns: string
      }
      create_maintenance_job: {
        Args: {
          _commitment_id?: string
          _company_id: string
          _counterparty_id?: string
          _description?: string
          _notes?: string
          _priority?: string
          _responsible_name?: string
          _target_date?: string
          _title: string
        }
        Returns: string
      }
      current_company_id: { Args: never; Returns: string }
      executive_alerts: {
        Args: { _company_id: string }
        Returns: {
          amount: number
          category: string
          detail: string
          due_date: string
          entity_id: string
          entity_type: string
          key: string
          severity: string
          title: string
        }[]
      }
      executive_snapshot: { Args: { _company_id: string }; Returns: Json }
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
      liquidity_forecast: {
        Args: { _company_id: string; _scenario?: string }
        Returns: {
          horizon_date: string
          horizon_days: number
          inflows: number
          net_movement: number
          outflows: number
          projected_balance: number
        }[]
      }
      mark_internal_transfer: {
        Args: {
          _from_transaction_id: string
          _notes?: string
          _to_transaction_id: string
        }
        Returns: string
      }
      mark_statement_batch_reconciled: {
        Args: { _import_id: string; _override_reason?: string }
        Returns: Json
      }
      property_profitability: {
        Args: { _company_id: string; _from: string; _to: string }
        Returns: {
          acquisition_total: number
          capex_spend: number
          current_valuation: number
          financing_costs: number
          gross_yield: number
          net_cash_flow: number
          net_operating_income: number
          net_yield: number
          operating_costs: number
          other_income: number
          outstanding_debt: number
          property_code: string
          property_id: string
          property_name: string
          rental_income: number
          roi: number
          status: string
          taxes: number
        }[]
      }
      recompute_document_payment_state: {
        Args: { _document_id: string }
        Returns: undefined
      }
      recompute_document_totals: {
        Args: { _document_id: string }
        Returns: undefined
      }
      recompute_entry_reconciliation: {
        Args: { _entry_id: string }
        Returns: undefined
      }
      recompute_period_totals: { Args: { _period_id: string }; Returns: number }
      recompute_transaction_reconciliation: {
        Args: { _tx_id: string }
        Returns: undefined
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
      reject_commitment: {
        Args: { _commitment_id: string; _reason: string }
        Returns: undefined
      }
      reopen_financial_period: {
        Args: { _period_id: string; _reason: string }
        Returns: {
          closed_at: string | null
          closed_by: string | null
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          period_end: string
          period_start: string
          period_type: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "financial_periods"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_commitment_approval: {
        Args: { _commitment_id: string; _reason?: string }
        Returns: string
      }
      reverse_bank_match: {
        Args: { _match_id: string; _reason: string }
        Returns: Json
      }
      reverse_commitment_drawdown: {
        Args: { _drawdown_id: string; _reason: string }
        Returns: string
      }
      reverse_financial_payment: {
        Args: { _payment_id: string; _reason: string }
        Returns: string
      }
      seed_company_dimensions: {
        Args: { _company_id: string }
        Returns: undefined
      }
      seed_company_scenarios: {
        Args: { _company_id: string }
        Returns: undefined
      }
      settle_financial_document: {
        Args: {
          _amount: number
          _bank_transaction_id?: string
          _document_id: string
          _method?: string
          _notes?: string
          _payment_date?: string
        }
        Returns: string
      }
      shares_company_with: {
        Args: { _target: string; _viewer: string }
        Returns: boolean
      }
      suggest_bank_classification: {
        Args: { _bank_transaction_id: string }
        Returns: {
          cash_flow_category: string
          classification_id: string
          counterparty_id: string
          is_internal_transfer: boolean
          priority: number
          project_id: string
          property_id: string
          rule_id: string
          rule_name: string
        }[]
      }
      suggest_bank_matches: {
        Args: {
          _amount_tolerance?: number
          _bank_transaction_id: string
          _date_tolerance?: number
          _limit?: number
        }
        Returns: {
          amount_total: number
          category: string
          counterparty_name: string
          description: string
          entry_id: string
          expected_date: string
          outstanding: number
          property_id: string
          reasons: string[]
          score: number
          source_type: string
        }[]
      }
      sync_commitment_cash_flow: {
        Args: { _commitment_id: string }
        Returns: number
      }
      sync_document_cash_flow: {
        Args: { _document_id: string }
        Returns: string
      }
      sync_source_settlement: {
        Args: { _entry_id: string }
        Returns: undefined
      }
      update_commitment_draft: {
        Args: {
          _authorised_amount?: number
          _commitment_id: string
          _commitment_type?: string
          _counterparty_id?: string
          _description?: string
          _end_date?: string
          _notes?: string
          _start_date?: string
          _title?: string
        }
        Returns: undefined
      }
      update_maintenance_job: {
        Args: {
          _cancellation_reason?: string
          _commitment_id?: string
          _completion_date?: string
          _counterparty_id?: string
          _description?: string
          _job_id: string
          _notes?: string
          _priority?: string
          _responsible_name?: string
          _status?: string
          _target_date?: string
          _title?: string
        }
        Returns: undefined
      }
      validate_commitment_schedule: {
        Args: { _version_id: string }
        Returns: Json
      }
      vat_summary: {
        Args: { _company_id: string; _from: string; _to: string }
        Returns: {
          direction: string
          document_count: number
          gross_amount: number
          net_amount: number
          vat_amount: number
          vat_code: string
          vat_rate: number
        }[]
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
