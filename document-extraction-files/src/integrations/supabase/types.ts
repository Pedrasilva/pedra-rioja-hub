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
      acquisition_activities: {
        Row: {
          activity_type: string
          author_id: string | null
          body: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          occurred_at: string
          opportunity_id: string
          summary: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activity_type?: string
          author_id?: string | null
          body?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          occurred_at?: string
          opportunity_id: string
          summary: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activity_type?: string
          author_id?: string | null
          body?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          occurred_at?: string
          opportunity_id?: string
          summary?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "acquisition_activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "acquisition_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "v_acquisition_pipeline"
            referencedColumns: ["opportunity_id"]
          },
        ]
      }
      acquisition_commitment_links: {
        Row: {
          commitment_id: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          link_reason: string | null
          linked_at: string
          linked_by: string | null
          opportunity_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          commitment_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          link_reason?: string | null
          linked_at?: string
          linked_by?: string | null
          opportunity_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          commitment_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          link_reason?: string | null
          linked_at?: string
          linked_by?: string | null
          opportunity_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_commitment_links_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_commitment_links_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "v_commitment_summary"
            referencedColumns: ["commitment_id"]
          },
          {
            foreignKeyName: "acquisition_commitment_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_commitment_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "acquisition_commitment_links_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "acquisition_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_commitment_links_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "v_acquisition_pipeline"
            referencedColumns: ["opportunity_id"]
          },
        ]
      }
      acquisition_offers: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          decided_by: string | null
          decided_on: string | null
          decision_notes: string | null
          expires_on: string | null
          id: string
          negotiation_notes: string | null
          offer_no: number
          opportunity_id: string
          status: string
          submitted_on: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          decided_by?: string | null
          decided_on?: string | null
          decision_notes?: string | null
          expires_on?: string | null
          id?: string
          negotiation_notes?: string | null
          offer_no: number
          opportunity_id: string
          status?: string
          submitted_on?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          decided_by?: string | null
          decided_on?: string | null
          decision_notes?: string | null
          expires_on?: string | null
          id?: string
          negotiation_notes?: string | null
          offer_no?: number
          opportunity_id?: string
          status?: string
          submitted_on?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_offers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_offers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "acquisition_offers_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "acquisition_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_offers_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "v_acquisition_pipeline"
            referencedColumns: ["opportunity_id"]
          },
        ]
      }
      acquisition_opportunities: {
        Row: {
          address: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          asking_price: number | null
          assigned_to: string | null
          broker_id: string | null
          company_id: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          currency: string
          decided_at: string | null
          decided_by: string | null
          decision: string | null
          decision_reason: string | null
          expected_closing_date: string | null
          id: string
          indicative_offer: number | null
          link_kind: string
          location: string | null
          notes: string | null
          opportunity_type: string
          probability: number
          property_id: string | null
          property_name: string | null
          reference: string
          seller_id: string | null
          source: string | null
          stage: string
          target_acquisition_date: string | null
          title: string
          updated_at: string
          updated_by: string | null
          valuation_amount: number | null
        }
        Insert: {
          address?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          asking_price?: number | null
          assigned_to?: string | null
          broker_id?: string | null
          company_id: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: string | null
          decision_reason?: string | null
          expected_closing_date?: string | null
          id?: string
          indicative_offer?: number | null
          link_kind?: string
          location?: string | null
          notes?: string | null
          opportunity_type?: string
          probability?: number
          property_id?: string | null
          property_name?: string | null
          reference: string
          seller_id?: string | null
          source?: string | null
          stage?: string
          target_acquisition_date?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
          valuation_amount?: number | null
        }
        Update: {
          address?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          asking_price?: number | null
          assigned_to?: string | null
          broker_id?: string | null
          company_id?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: string | null
          decision_reason?: string | null
          expected_closing_date?: string | null
          id?: string
          indicative_offer?: number | null
          link_kind?: string
          location?: string | null
          notes?: string | null
          opportunity_type?: string
          probability?: number
          property_id?: string | null
          property_name?: string | null
          reference?: string
          seller_id?: string | null
          source?: string | null
          stage?: string
          target_acquisition_date?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          valuation_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_opportunities_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "acquisition_opportunities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_opportunities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "acquisition_opportunities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "acquisition_opportunities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "acquisition_opportunities_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
        ]
      }
      acquisition_stage_events: {
        Row: {
          actor_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          from_stage: string | null
          id: string
          is_reopen: boolean
          occurred_at: string
          opportunity_id: string
          reason: string | null
          to_stage: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          actor_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          from_stage?: string | null
          id?: string
          is_reopen?: boolean
          occurred_at?: string
          opportunity_id: string
          reason?: string | null
          to_stage: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          actor_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          from_stage?: string | null
          id?: string
          is_reopen?: boolean
          occurred_at?: string
          opportunity_id?: string
          reason?: string | null
          to_stage?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_stage_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_stage_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "acquisition_stage_events_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "acquisition_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_stage_events_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "v_acquisition_pipeline"
            referencedColumns: ["opportunity_id"]
          },
        ]
      }
      acquisition_stage_transitions: {
        Row: {
          created_at: string
          from_stage: string
          id: string
          is_reopen: boolean
          requires_manage: boolean
          to_stage: string
        }
        Insert: {
          created_at?: string
          from_stage: string
          id?: string
          is_reopen?: boolean
          requires_manage?: boolean
          to_stage: string
        }
        Update: {
          created_at?: string
          from_stage?: string
          id?: string
          is_reopen?: boolean
          requires_manage?: boolean
          to_stage?: string
        }
        Relationships: []
      }
      acquisition_tasks: {
        Row: {
          assignee_id: string | null
          company_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          description: string
          due_date: string | null
          id: string
          opportunity_id: string
          priority: string
          reminder_at: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assignee_id?: string | null
          company_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          due_date?: string | null
          id?: string
          opportunity_id: string
          priority?: string
          reminder_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assignee_id?: string | null
          company_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string | null
          id?: string
          opportunity_id?: string
          priority?: string
          reminder_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "acquisition_tasks_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "acquisition_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_tasks_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "v_acquisition_pipeline"
            referencedColumns: ["opportunity_id"]
          },
        ]
      }
      acquisition_valuations: {
        Row: {
          author_id: string | null
          comments: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          estimated_value: number
          id: string
          method: string
          opportunity_id: string
          updated_at: string
          updated_by: string | null
          valued_on: string
        }
        Insert: {
          author_id?: string | null
          comments?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          estimated_value: number
          id?: string
          method?: string
          opportunity_id: string
          updated_at?: string
          updated_by?: string | null
          valued_on?: string
        }
        Update: {
          author_id?: string | null
          comments?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          estimated_value?: number
          id?: string
          method?: string
          opportunity_id?: string
          updated_at?: string
          updated_by?: string | null
          valued_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_valuations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_valuations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "acquisition_valuations_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "acquisition_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_valuations_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "v_acquisition_pipeline"
            referencedColumns: ["opportunity_id"]
          },
        ]
      }
      approval_callbacks: {
        Row: {
          created_at: string
          event: string
          function_name: string
          id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          event: string
          function_name: string
          id?: string
          target_type: string
        }
        Update: {
          created_at?: string
          event?: string
          function_name?: string
          id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_callbacks_target_type_fkey"
            columns: ["target_type"]
            isOneToOne: false
            referencedRelation: "approval_target_types"
            referencedColumns: ["target_type"]
          },
        ]
      }
      approval_decisions: {
        Row: {
          actor_id: string | null
          company_id: string
          created_at: string
          decision: string
          delegated_to: string | null
          evidence_document_id: string | null
          id: string
          metadata: Json
          override_reason: string | null
          reason: string | null
          request_id: string
          step_id: string | null
          step_no: number | null
        }
        Insert: {
          actor_id?: string | null
          company_id: string
          created_at?: string
          decision: string
          delegated_to?: string | null
          evidence_document_id?: string | null
          id?: string
          metadata?: Json
          override_reason?: string | null
          reason?: string | null
          request_id: string
          step_id?: string | null
          step_no?: number | null
        }
        Update: {
          actor_id?: string | null
          company_id?: string
          created_at?: string
          decision?: string
          delegated_to?: string | null
          evidence_document_id?: string | null
          id?: string
          metadata?: Json
          override_reason?: string | null
          reason?: string | null
          request_id?: string
          step_id?: string | null
          step_no?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_decisions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_decisions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "approval_decisions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_decisions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_approval_inbox"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "approval_decisions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_approval_request_detail"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "approval_decisions_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "approval_workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_decisions_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "v_approval_inbox"
            referencedColumns: ["step_id"]
          },
        ]
      }
      approval_events: {
        Row: {
          actor_id: string | null
          comment: string | null
          company_id: string
          created_at: string
          decision_id: string | null
          event: string
          id: string
          payload: Json
          request_id: string
          step_no: number | null
        }
        Insert: {
          actor_id?: string | null
          comment?: string | null
          company_id: string
          created_at?: string
          decision_id?: string | null
          event: string
          id?: string
          payload?: Json
          request_id: string
          step_no?: number | null
        }
        Update: {
          actor_id?: string | null
          comment?: string | null
          company_id?: string
          created_at?: string
          decision_id?: string | null
          event?: string
          id?: string
          payload?: Json
          request_id?: string
          step_no?: number | null
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
            foreignKeyName: "approval_events_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "approval_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_approval_inbox"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "approval_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_approval_request_detail"
            referencedColumns: ["request_id"]
          },
        ]
      }
      approval_request_candidates: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          request_id: string
          source: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          request_id: string
          source?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          request_id?: string
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_request_candidates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_request_candidates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "approval_request_candidates_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_request_candidates_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_approval_inbox"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "approval_request_candidates_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_approval_request_detail"
            referencedColumns: ["request_id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          callback_at: string | null
          callback_attempts: number
          callback_error: string | null
          callback_status: string
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          current_step_no: number
          decided_at: string | null
          decided_by: string | null
          decision: string
          decision_reason: string | null
          escalated_at: string | null
          expires_at: string | null
          id: string
          last_reminder_at: string | null
          reason: string | null
          requested_amount: number | null
          requested_at: string
          requested_by: string
          rule_reference: string | null
          snapshot: Json
          target_id: string
          target_label: string | null
          target_type: string
          threshold_amount: number | null
          updated_at: string
          updated_by: string | null
          workflow_id: string | null
          workflow_version_id: string | null
        }
        Insert: {
          callback_at?: string | null
          callback_attempts?: number
          callback_error?: string | null
          callback_status?: string
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_step_no?: number
          decided_at?: string | null
          decided_by?: string | null
          decision?: string
          decision_reason?: string | null
          escalated_at?: string | null
          expires_at?: string | null
          id?: string
          last_reminder_at?: string | null
          reason?: string | null
          requested_amount?: number | null
          requested_at?: string
          requested_by?: string
          rule_reference?: string | null
          snapshot?: Json
          target_id: string
          target_label?: string | null
          target_type: string
          threshold_amount?: number | null
          updated_at?: string
          updated_by?: string | null
          workflow_id?: string | null
          workflow_version_id?: string | null
        }
        Update: {
          callback_at?: string | null
          callback_attempts?: number
          callback_error?: string | null
          callback_status?: string
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_step_no?: number
          decided_at?: string | null
          decided_by?: string | null
          decision?: string
          decision_reason?: string | null
          escalated_at?: string | null
          expires_at?: string | null
          id?: string
          last_reminder_at?: string | null
          reason?: string | null
          requested_amount?: number | null
          requested_at?: string
          requested_by?: string
          rule_reference?: string | null
          snapshot?: Json
          target_id?: string
          target_label?: string | null
          target_type?: string
          threshold_amount?: number | null
          updated_at?: string
          updated_by?: string | null
          workflow_id?: string | null
          workflow_version_id?: string | null
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
          {
            foreignKeyName: "approval_requests_target_type_fkey"
            columns: ["target_type"]
            isOneToOne: false
            referencedRelation: "approval_target_types"
            referencedColumns: ["target_type"]
          },
          {
            foreignKeyName: "approval_requests_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "approval_workflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "v_approval_request_detail"
            referencedColumns: ["workflow_id"]
          },
          {
            foreignKeyName: "approval_requests_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "v_approval_workflow_overview"
            referencedColumns: ["workflow_id"]
          },
          {
            foreignKeyName: "approval_requests_workflow_version_id_fkey"
            columns: ["workflow_version_id"]
            isOneToOne: false
            referencedRelation: "approval_workflow_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_workflow_version_id_fkey"
            columns: ["workflow_version_id"]
            isOneToOne: false
            referencedRelation: "v_approval_request_detail"
            referencedColumns: ["workflow_version_id"]
          },
        ]
      }
      approval_step_assignments: {
        Row: {
          assignee_type: string
          candidate_source: string | null
          capability: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          role: string | null
          step_id: string
          user_id: string | null
        }
        Insert: {
          assignee_type: string
          candidate_source?: string | null
          capability?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          role?: string | null
          step_id: string
          user_id?: string | null
        }
        Update: {
          assignee_type?: string
          candidate_source?: string | null
          capability?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          role?: string | null
          step_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_step_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_step_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "approval_step_assignments_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "approval_workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_step_assignments_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "v_approval_inbox"
            referencedColumns: ["step_id"]
          },
        ]
      }
      approval_target_types: {
        Row: {
          created_at: string
          description: string | null
          is_system: boolean
          label: string
          target_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          is_system?: boolean
          label: string
          target_type: string
        }
        Update: {
          created_at?: string
          description?: string | null
          is_system?: boolean
          label?: string
          target_type?: string
        }
        Relationships: []
      }
      approval_workflow_steps: {
        Row: {
          allow_self_approval: boolean
          company_id: string
          created_at: string
          created_by: string | null
          escalate_after_hours: number | null
          id: string
          incompatible_with_step_no: number | null
          max_amount: number | null
          min_amount: number | null
          name: string
          quorum_count: number | null
          reminder_after_hours: number | null
          restrict_creator: boolean
          rule: string
          step_no: number
          updated_at: string
          updated_by: string | null
          version_id: string
        }
        Insert: {
          allow_self_approval?: boolean
          company_id: string
          created_at?: string
          created_by?: string | null
          escalate_after_hours?: number | null
          id?: string
          incompatible_with_step_no?: number | null
          max_amount?: number | null
          min_amount?: number | null
          name: string
          quorum_count?: number | null
          reminder_after_hours?: number | null
          restrict_creator?: boolean
          rule?: string
          step_no: number
          updated_at?: string
          updated_by?: string | null
          version_id: string
        }
        Update: {
          allow_self_approval?: boolean
          company_id?: string
          created_at?: string
          created_by?: string | null
          escalate_after_hours?: number | null
          id?: string
          incompatible_with_step_no?: number | null
          max_amount?: number | null
          min_amount?: number | null
          name?: string
          quorum_count?: number | null
          reminder_after_hours?: number | null
          restrict_creator?: boolean
          rule?: string
          step_no?: number
          updated_at?: string
          updated_by?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_workflow_steps_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_workflow_steps_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "approval_workflow_steps_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "approval_workflow_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_workflow_steps_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "v_approval_request_detail"
            referencedColumns: ["workflow_version_id"]
          },
        ]
      }
      approval_workflow_versions: {
        Row: {
          archived_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          escalation_hours: number | null
          expiry_hours: number | null
          id: string
          notes: string | null
          published_at: string | null
          published_by: string | null
          reminder_hours: number | null
          status: string
          updated_at: string
          updated_by: string | null
          version_no: number
          workflow_id: string
        }
        Insert: {
          archived_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          escalation_hours?: number | null
          expiry_hours?: number | null
          id?: string
          notes?: string | null
          published_at?: string | null
          published_by?: string | null
          reminder_hours?: number | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          version_no: number
          workflow_id: string
        }
        Update: {
          archived_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          escalation_hours?: number | null
          expiry_hours?: number | null
          id?: string
          notes?: string | null
          published_at?: string | null
          published_by?: string | null
          reminder_hours?: number | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          version_no?: number
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_workflow_versions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_workflow_versions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "approval_workflow_versions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "approval_workflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_workflow_versions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "v_approval_request_detail"
            referencedColumns: ["workflow_id"]
          },
          {
            foreignKeyName: "approval_workflow_versions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "v_approval_workflow_overview"
            referencedColumns: ["workflow_id"]
          },
        ]
      }
      approval_workflows: {
        Row: {
          archived_at: string | null
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_system: boolean
          name: string
          published_version_id: string | null
          status: string
          target_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          published_version_id?: string | null
          status?: string
          target_type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          published_version_id?: string | null
          status?: string
          target_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_workflows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_workflows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "approval_workflows_published_version_fkey"
            columns: ["published_version_id"]
            isOneToOne: false
            referencedRelation: "approval_workflow_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_workflows_published_version_fkey"
            columns: ["published_version_id"]
            isOneToOne: false
            referencedRelation: "v_approval_request_detail"
            referencedColumns: ["workflow_version_id"]
          },
          {
            foreignKeyName: "approval_workflows_target_type_fkey"
            columns: ["target_type"]
            isOneToOne: false
            referencedRelation: "approval_target_types"
            referencedColumns: ["target_type"]
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
      budget_lines: {
        Row: {
          budget_version_id: string
          company_id: string
          created_at: string
          created_by: string | null
          dimension_id: string | null
          dimension_value_id: string | null
          direction: string
          id: string
          label: string
          line_no: number
          notes: string | null
          period_month: number | null
          planned_amount: number
          project_id: string | null
          property_id: string | null
          unit_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          budget_version_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          dimension_id?: string | null
          dimension_value_id?: string | null
          direction?: string
          id?: string
          label: string
          line_no?: number
          notes?: string | null
          period_month?: number | null
          planned_amount?: number
          project_id?: string | null
          property_id?: string | null
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          budget_version_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          dimension_id?: string | null
          dimension_value_id?: string | null
          direction?: string
          id?: string
          label?: string
          line_no?: number
          notes?: string | null
          period_month?: number | null
          planned_amount?: number
          project_id?: string | null
          property_id?: string | null
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_budget_version_id_fkey"
            columns: ["budget_version_id"]
            isOneToOne: false
            referencedRelation: "budget_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_budget_version_id_fkey"
            columns: ["budget_version_id"]
            isOneToOne: false
            referencedRelation: "v_budget_version_summary"
            referencedColumns: ["version_id"]
          },
          {
            foreignKeyName: "budget_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "budget_lines_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "dimensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_dimension_value_id_fkey"
            columns: ["dimension_value_id"]
            isOneToOne: false
            referencedRelation: "dimension_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "capex_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_capex_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "budget_lines_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "budget_lines_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "budget_lines_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "budget_lines_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "v_unit_occupancy"
            referencedColumns: ["unit_id"]
          },
        ]
      }
      budget_versions: {
        Row: {
          approval_request_id: string | null
          approval_status: string
          archive_reason: string | null
          archived_at: string | null
          budget_id: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_current: boolean
          notes: string | null
          published_at: string | null
          published_by: string | null
          reason: string | null
          status: string
          updated_at: string
          updated_by: string | null
          version_no: number
        }
        Insert: {
          approval_request_id?: string | null
          approval_status?: string
          archive_reason?: string | null
          archived_at?: string | null
          budget_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_current?: boolean
          notes?: string | null
          published_at?: string | null
          published_by?: string | null
          reason?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          version_no: number
        }
        Update: {
          approval_request_id?: string | null
          approval_status?: string
          archive_reason?: string | null
          archived_at?: string | null
          budget_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_current?: boolean
          notes?: string | null
          published_at?: string | null
          published_by?: string | null
          reason?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_versions_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_versions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_versions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
        ]
      }
      budgets: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          code: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          fiscal_year: number
          id: string
          name: string
          notes: string | null
          project_id: string | null
          property_id: string | null
          status: string
          unit_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          code?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          fiscal_year: number
          id?: string
          name: string
          notes?: string | null
          project_id?: string | null
          property_id?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          code?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          fiscal_year?: number
          id?: string
          name?: string
          notes?: string | null
          project_id?: string | null
          property_id?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "capex_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_capex_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "budgets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "budgets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "budgets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "budgets_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "v_unit_occupancy"
            referencedColumns: ["unit_id"]
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
            foreignKeyName: "cash_flow_entries_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "v_investment_metrics"
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
          {
            foreignKeyName: "cash_flow_entries_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "v_unit_occupancy"
            referencedColumns: ["unit_id"]
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
            foreignKeyName: "cash_flow_recurring_rules_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "v_investment_metrics"
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
          {
            foreignKeyName: "cash_flow_recurring_rules_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "v_unit_occupancy"
            referencedColumns: ["unit_id"]
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
      closing_cases: {
        Row: {
          actual_completion_date: string | null
          agreed_price: number | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          commitment_id: string | null
          company_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          currency: string
          deed_date: string | null
          due_diligence_case_id: string | null
          handover_status: string
          id: string
          notary_name: string | null
          notary_reference: string | null
          notes: string | null
          opportunity_id: string
          possession_date: string | null
          property_id: string | null
          reference: string
          status: string
          target_completion_date: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          actual_completion_date?: string | null
          agreed_price?: number | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          commitment_id?: string | null
          company_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deed_date?: string | null
          due_diligence_case_id?: string | null
          handover_status?: string
          id?: string
          notary_name?: string | null
          notary_reference?: string | null
          notes?: string | null
          opportunity_id: string
          possession_date?: string | null
          property_id?: string | null
          reference: string
          status?: string
          target_completion_date?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          actual_completion_date?: string | null
          agreed_price?: number | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          commitment_id?: string | null
          company_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deed_date?: string | null
          due_diligence_case_id?: string | null
          handover_status?: string
          id?: string
          notary_name?: string | null
          notary_reference?: string | null
          notes?: string | null
          opportunity_id?: string
          possession_date?: string | null
          property_id?: string | null
          reference?: string
          status?: string
          target_completion_date?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "closing_cases_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closing_cases_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "v_commitment_summary"
            referencedColumns: ["commitment_id"]
          },
          {
            foreignKeyName: "closing_cases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closing_cases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "closing_cases_due_diligence_case_id_fkey"
            columns: ["due_diligence_case_id"]
            isOneToOne: false
            referencedRelation: "due_diligence_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closing_cases_due_diligence_case_id_fkey"
            columns: ["due_diligence_case_id"]
            isOneToOne: false
            referencedRelation: "v_due_diligence_case"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "closing_cases_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "acquisition_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closing_cases_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "v_acquisition_pipeline"
            referencedColumns: ["opportunity_id"]
          },
          {
            foreignKeyName: "closing_cases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closing_cases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "closing_cases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "closing_cases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
        ]
      }
      closing_conditions: {
        Row: {
          category: string
          closing_id: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          is_blocking: boolean
          notes: string | null
          owner_id: string | null
          responsible_party: string
          satisfied_at: string | null
          satisfied_by: string | null
          sort_order: number
          status: string
          title: string
          updated_at: string
          updated_by: string | null
          waiver_reason: string | null
        }
        Insert: {
          category?: string
          closing_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_blocking?: boolean
          notes?: string | null
          owner_id?: string | null
          responsible_party?: string
          satisfied_at?: string | null
          satisfied_by?: string | null
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
          waiver_reason?: string | null
        }
        Update: {
          category?: string
          closing_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_blocking?: boolean
          notes?: string | null
          owner_id?: string | null
          responsible_party?: string
          satisfied_at?: string | null
          satisfied_by?: string | null
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          waiver_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "closing_conditions_closing_id_fkey"
            columns: ["closing_id"]
            isOneToOne: false
            referencedRelation: "closing_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closing_conditions_closing_id_fkey"
            columns: ["closing_id"]
            isOneToOne: false
            referencedRelation: "v_closing_case"
            referencedColumns: ["closing_id"]
          },
          {
            foreignKeyName: "closing_conditions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closing_conditions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
        ]
      }
      closing_events: {
        Row: {
          actor_id: string | null
          closing_id: string
          company_id: string
          created_at: string
          created_by: string | null
          from_status: string | null
          id: string
          occurred_at: string
          reason: string | null
          to_status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          actor_id?: string | null
          closing_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          from_status?: string | null
          id?: string
          occurred_at?: string
          reason?: string | null
          to_status: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          actor_id?: string | null
          closing_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          from_status?: string | null
          id?: string
          occurred_at?: string
          reason?: string | null
          to_status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "closing_events_closing_id_fkey"
            columns: ["closing_id"]
            isOneToOne: false
            referencedRelation: "closing_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closing_events_closing_id_fkey"
            columns: ["closing_id"]
            isOneToOne: false
            referencedRelation: "v_closing_case"
            referencedColumns: ["closing_id"]
          },
          {
            foreignKeyName: "closing_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closing_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
        ]
      }
      closing_handover_tasks: {
        Row: {
          category: string
          closing_id: string
          company_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          notes: string | null
          owner_id: string | null
          sort_order: number
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string
          closing_id: string
          company_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          owner_id?: string | null
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          closing_id?: string
          company_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          owner_id?: string | null
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "closing_handover_tasks_closing_id_fkey"
            columns: ["closing_id"]
            isOneToOne: false
            referencedRelation: "closing_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closing_handover_tasks_closing_id_fkey"
            columns: ["closing_id"]
            isOneToOne: false
            referencedRelation: "v_closing_case"
            referencedColumns: ["closing_id"]
          },
          {
            foreignKeyName: "closing_handover_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closing_handover_tasks_company_id_fkey"
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
            foreignKeyName: "commitment_schedule_versions_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "v_approval_inbox"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "commitment_schedule_versions_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "v_approval_request_detail"
            referencedColumns: ["request_id"]
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
      document_extractions: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          document_id: string
          document_kind: string | null
          error_message: string | null
          extracted_json: Json | null
          id: string
          model: string
          raw_text: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          document_id: string
          document_kind?: string | null
          error_message?: string | null
          extracted_json?: Json | null
          id?: string
          model?: string
          raw_text?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          document_id?: string
          document_kind?: string | null
          error_message?: string | null
          extracted_json?: Json | null
          id?: string
          model?: string
          raw_text?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_extractions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_extractions_document_id_fkey"
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
      due_diligence_cases: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          assigned_to: string | null
          company_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          id: string
          opportunity_id: string
          recommendation: string
          recommendation_notes: string | null
          reference: string
          started_on: string | null
          status: string
          summary: string | null
          target_date: string | null
          template_id: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_to?: string | null
          company_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          opportunity_id: string
          recommendation?: string
          recommendation_notes?: string | null
          reference: string
          started_on?: string | null
          status?: string
          summary?: string | null
          target_date?: string | null
          template_id?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_to?: string | null
          company_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          opportunity_id?: string
          recommendation?: string
          recommendation_notes?: string | null
          reference?: string
          started_on?: string | null
          status?: string
          summary?: string | null
          target_date?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "due_diligence_cases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "due_diligence_cases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "due_diligence_cases_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "acquisition_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "due_diligence_cases_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "v_acquisition_pipeline"
            referencedColumns: ["opportunity_id"]
          },
          {
            foreignKeyName: "due_diligence_cases_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "due_diligence_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      due_diligence_events: {
        Row: {
          actor_id: string | null
          case_id: string
          company_id: string
          created_at: string
          created_by: string | null
          from_status: string | null
          id: string
          occurred_at: string
          reason: string | null
          recommendation: string | null
          to_status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          actor_id?: string | null
          case_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          from_status?: string | null
          id?: string
          occurred_at?: string
          reason?: string | null
          recommendation?: string | null
          to_status: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          actor_id?: string | null
          case_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          from_status?: string | null
          id?: string
          occurred_at?: string
          reason?: string | null
          recommendation?: string | null
          to_status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "due_diligence_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "due_diligence_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "due_diligence_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_due_diligence_case"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "due_diligence_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "due_diligence_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
        ]
      }
      due_diligence_items: {
        Row: {
          assignee_id: string | null
          case_id: string
          company_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          findings: string | null
          id: string
          is_blocking: boolean
          risk_level: string
          section: string
          sort_order: number
          status: string
          title: string
          updated_at: string
          updated_by: string | null
          waiver_reason: string | null
        }
        Insert: {
          assignee_id?: string | null
          case_id: string
          company_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          findings?: string | null
          id?: string
          is_blocking?: boolean
          risk_level?: string
          section?: string
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
          waiver_reason?: string | null
        }
        Update: {
          assignee_id?: string | null
          case_id?: string
          company_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          findings?: string | null
          id?: string
          is_blocking?: boolean
          risk_level?: string
          section?: string
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          waiver_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "due_diligence_items_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "due_diligence_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "due_diligence_items_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_due_diligence_case"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "due_diligence_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "due_diligence_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
        ]
      }
      due_diligence_template_items: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_blocking: boolean
          section: string
          sort_order: number
          template_id: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_blocking?: boolean
          section?: string
          sort_order?: number
          template_id: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_blocking?: boolean
          section?: string
          sort_order?: number
          template_id?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "due_diligence_template_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "due_diligence_template_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "due_diligence_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "due_diligence_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      due_diligence_templates: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          deal_type: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          deal_type?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          deal_type?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "due_diligence_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "due_diligence_templates_company_id_fkey"
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
          {
            foreignKeyName: "financial_document_lines_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "v_unit_occupancy"
            referencedColumns: ["unit_id"]
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
          {
            foreignKeyName: "financial_documents_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "v_unit_occupancy"
            referencedColumns: ["unit_id"]
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
            foreignKeyName: "financing_schedule_imports_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "v_investment_metrics"
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
            foreignKeyName: "financing_schedule_versions_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "v_investment_metrics"
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
      insurance_policies: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          broker_counterparty_id: string | null
          broker_name: string | null
          code: string | null
          commitment_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          effective_date: string | null
          excess_amount: number | null
          expiry_date: string | null
          id: string
          insured_assets: string | null
          insurer_counterparty_id: string | null
          insurer_name: string | null
          notes: string | null
          obligation_id: string | null
          policy_number: string | null
          policy_type: string
          property_id: string | null
          reminder_lead_days: number
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          broker_counterparty_id?: string | null
          broker_name?: string | null
          code?: string | null
          commitment_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          effective_date?: string | null
          excess_amount?: number | null
          expiry_date?: string | null
          id?: string
          insured_assets?: string | null
          insurer_counterparty_id?: string | null
          insurer_name?: string | null
          notes?: string | null
          obligation_id?: string | null
          policy_number?: string | null
          policy_type?: string
          property_id?: string | null
          reminder_lead_days?: number
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          broker_counterparty_id?: string | null
          broker_name?: string | null
          code?: string | null
          commitment_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          effective_date?: string | null
          excess_amount?: number | null
          expiry_date?: string | null
          id?: string
          insured_assets?: string | null
          insurer_counterparty_id?: string | null
          insurer_name?: string | null
          notes?: string | null
          obligation_id?: string | null
          policy_number?: string | null
          policy_type?: string
          property_id?: string | null
          reminder_lead_days?: number
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_policies_broker_counterparty_id_fkey"
            columns: ["broker_counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_policies_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_policies_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "v_commitment_summary"
            referencedColumns: ["commitment_id"]
          },
          {
            foreignKeyName: "insurance_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "insurance_policies_insurer_counterparty_id_fkey"
            columns: ["insurer_counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_policies_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "operational_obligations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_policies_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "v_operational_obligation_summary"
            referencedColumns: ["obligation_id"]
          },
          {
            foreignKeyName: "insurance_policies_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_policies_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "insurance_policies_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "insurance_policies_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
        ]
      }
      lease_breaks: {
        Row: {
          break_type: string
          company_id: string
          conditions: string | null
          created_at: string
          created_by: string | null
          effective_date: string | null
          exercised_on: string | null
          id: string
          lease_id: string
          notes: string | null
          notice_days: number
          notice_deadline: string | null
          status: string
          updated_at: string
          updated_by: string | null
          version_id: string | null
          window_end: string | null
          window_start: string
        }
        Insert: {
          break_type?: string
          company_id: string
          conditions?: string | null
          created_at?: string
          created_by?: string | null
          effective_date?: string | null
          exercised_on?: string | null
          id?: string
          lease_id: string
          notes?: string | null
          notice_days?: number
          notice_deadline?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          version_id?: string | null
          window_end?: string | null
          window_start: string
        }
        Update: {
          break_type?: string
          company_id?: string
          conditions?: string | null
          created_at?: string
          created_by?: string | null
          effective_date?: string | null
          exercised_on?: string | null
          id?: string
          lease_id?: string
          notes?: string | null
          notice_days?: number
          notice_deadline?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          version_id?: string | null
          window_end?: string | null
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "lease_breaks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_breaks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "lease_breaks_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "lease_reminders"
            referencedColumns: ["lease_id"]
          },
          {
            foreignKeyName: "lease_breaks_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_breaks_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "v_lease_summary"
            referencedColumns: ["lease_id"]
          },
          {
            foreignKeyName: "lease_breaks_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "v_rent_roll"
            referencedColumns: ["lease_id"]
          },
          {
            foreignKeyName: "lease_breaks_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "lease_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_breaks_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "v_lease_summary"
            referencedColumns: ["version_id"]
          },
          {
            foreignKeyName: "lease_breaks_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "v_rent_roll"
            referencedColumns: ["version_id"]
          },
        ]
      }
      lease_charges: {
        Row: {
          amount: number
          charge_type: string
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          end_date: string | null
          frequency: string
          id: string
          label: string | null
          lease_id: string
          notes: string | null
          start_date: string | null
          updated_at: string
          updated_by: string | null
          vat_applicable: boolean
          vat_rate: number | null
          version_id: string
        }
        Insert: {
          amount?: number
          charge_type?: string
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          end_date?: string | null
          frequency?: string
          id?: string
          label?: string | null
          lease_id: string
          notes?: string | null
          start_date?: string | null
          updated_at?: string
          updated_by?: string | null
          vat_applicable?: boolean
          vat_rate?: number | null
          version_id: string
        }
        Update: {
          amount?: number
          charge_type?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          end_date?: string | null
          frequency?: string
          id?: string
          label?: string | null
          lease_id?: string
          notes?: string | null
          start_date?: string | null
          updated_at?: string
          updated_by?: string | null
          vat_applicable?: boolean
          vat_rate?: number | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lease_charges_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_charges_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "lease_charges_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "lease_reminders"
            referencedColumns: ["lease_id"]
          },
          {
            foreignKeyName: "lease_charges_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_charges_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "v_lease_summary"
            referencedColumns: ["lease_id"]
          },
          {
            foreignKeyName: "lease_charges_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "v_rent_roll"
            referencedColumns: ["lease_id"]
          },
          {
            foreignKeyName: "lease_charges_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "lease_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_charges_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "v_lease_summary"
            referencedColumns: ["version_id"]
          },
          {
            foreignKeyName: "lease_charges_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "v_rent_roll"
            referencedColumns: ["version_id"]
          },
        ]
      }
      lease_guarantors: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          expiry_date: string | null
          guarantee_amount: number | null
          guarantee_type: string
          id: string
          lease_id: string
          name: string
          notes: string | null
          reference: string | null
          start_date: string | null
          status: string
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          expiry_date?: string | null
          guarantee_amount?: number | null
          guarantee_type?: string
          id?: string
          lease_id: string
          name: string
          notes?: string | null
          reference?: string | null
          start_date?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          expiry_date?: string | null
          guarantee_amount?: number | null
          guarantee_type?: string
          id?: string
          lease_id?: string
          name?: string
          notes?: string | null
          reference?: string | null
          start_date?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lease_guarantors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_guarantors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "lease_guarantors_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "lease_reminders"
            referencedColumns: ["lease_id"]
          },
          {
            foreignKeyName: "lease_guarantors_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_guarantors_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "v_lease_summary"
            referencedColumns: ["lease_id"]
          },
          {
            foreignKeyName: "lease_guarantors_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "v_rent_roll"
            referencedColumns: ["lease_id"]
          },
          {
            foreignKeyName: "lease_guarantors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_guarantors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_rent_roll"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "lease_guarantors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenant_concentration"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      lease_notices: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          effective_date: string | null
          id: string
          lease_id: string
          notice_type: string
          reference: string | null
          served_by: string
          served_on: string
          status: string
          summary: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          effective_date?: string | null
          id?: string
          lease_id: string
          notice_type: string
          reference?: string | null
          served_by?: string
          served_on: string
          status?: string
          summary?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          effective_date?: string | null
          id?: string
          lease_id?: string
          notice_type?: string
          reference?: string | null
          served_by?: string
          served_on?: string
          status?: string
          summary?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lease_notices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_notices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "lease_notices_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "lease_reminders"
            referencedColumns: ["lease_id"]
          },
          {
            foreignKeyName: "lease_notices_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_notices_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "v_lease_summary"
            referencedColumns: ["lease_id"]
          },
          {
            foreignKeyName: "lease_notices_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "v_rent_roll"
            referencedColumns: ["lease_id"]
          },
        ]
      }
      lease_reviews: {
        Row: {
          agreed_rent: number | null
          applied_at: string | null
          applied_version_id: string | null
          approval_request_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          current_rent: number | null
          effective_date: string
          id: string
          index_name: string | null
          index_pct: number | null
          index_value: number | null
          lease_id: string
          notes: string | null
          proposed_rent: number | null
          review_date: string
          review_type: string
          status: string
          updated_at: string
          updated_by: string | null
          version_id: string | null
        }
        Insert: {
          agreed_rent?: number | null
          applied_at?: string | null
          applied_version_id?: string | null
          approval_request_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          current_rent?: number | null
          effective_date: string
          id?: string
          index_name?: string | null
          index_pct?: number | null
          index_value?: number | null
          lease_id: string
          notes?: string | null
          proposed_rent?: number | null
          review_date: string
          review_type?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          version_id?: string | null
        }
        Update: {
          agreed_rent?: number | null
          applied_at?: string | null
          applied_version_id?: string | null
          approval_request_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          current_rent?: number | null
          effective_date?: string
          id?: string
          index_name?: string | null
          index_pct?: number | null
          index_value?: number | null
          lease_id?: string
          notes?: string | null
          proposed_rent?: number | null
          review_date?: string
          review_type?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lease_reviews_applied_version_id_fkey"
            columns: ["applied_version_id"]
            isOneToOne: false
            referencedRelation: "lease_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_reviews_applied_version_id_fkey"
            columns: ["applied_version_id"]
            isOneToOne: false
            referencedRelation: "v_lease_summary"
            referencedColumns: ["version_id"]
          },
          {
            foreignKeyName: "lease_reviews_applied_version_id_fkey"
            columns: ["applied_version_id"]
            isOneToOne: false
            referencedRelation: "v_rent_roll"
            referencedColumns: ["version_id"]
          },
          {
            foreignKeyName: "lease_reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "lease_reviews_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "lease_reminders"
            referencedColumns: ["lease_id"]
          },
          {
            foreignKeyName: "lease_reviews_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_reviews_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "v_lease_summary"
            referencedColumns: ["lease_id"]
          },
          {
            foreignKeyName: "lease_reviews_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "v_rent_roll"
            referencedColumns: ["lease_id"]
          },
          {
            foreignKeyName: "lease_reviews_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "lease_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_reviews_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "v_lease_summary"
            referencedColumns: ["version_id"]
          },
          {
            foreignKeyName: "lease_reviews_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "v_rent_roll"
            referencedColumns: ["version_id"]
          },
        ]
      }
      lease_tenants: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_primary: boolean
          lease_id: string
          notes: string | null
          role: string
          share_pct: number | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
          version_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean
          lease_id: string
          notes?: string | null
          role?: string
          share_pct?: number | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          version_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean
          lease_id?: string
          notes?: string | null
          role?: string
          share_pct?: number | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lease_tenants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_tenants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "lease_tenants_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "lease_reminders"
            referencedColumns: ["lease_id"]
          },
          {
            foreignKeyName: "lease_tenants_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_tenants_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "v_lease_summary"
            referencedColumns: ["lease_id"]
          },
          {
            foreignKeyName: "lease_tenants_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "v_rent_roll"
            referencedColumns: ["lease_id"]
          },
          {
            foreignKeyName: "lease_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_rent_roll"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "lease_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenant_concentration"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "lease_tenants_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "lease_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_tenants_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "v_lease_summary"
            referencedColumns: ["version_id"]
          },
          {
            foreignKeyName: "lease_tenants_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "v_rent_roll"
            referencedColumns: ["version_id"]
          },
        ]
      }
      lease_units: {
        Row: {
          apportionment_pct: number | null
          area_m2: number | null
          company_id: string
          created_at: string
          created_by: string | null
          demise_label: string | null
          id: string
          lease_id: string
          notes: string | null
          property_id: string
          unit_id: string | null
          updated_at: string
          updated_by: string | null
          version_id: string
        }
        Insert: {
          apportionment_pct?: number | null
          area_m2?: number | null
          company_id: string
          created_at?: string
          created_by?: string | null
          demise_label?: string | null
          id?: string
          lease_id: string
          notes?: string | null
          property_id: string
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version_id: string
        }
        Update: {
          apportionment_pct?: number | null
          area_m2?: number | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          demise_label?: string | null
          id?: string
          lease_id?: string
          notes?: string | null
          property_id?: string
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lease_units_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_units_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "lease_units_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "lease_reminders"
            referencedColumns: ["lease_id"]
          },
          {
            foreignKeyName: "lease_units_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_units_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "v_lease_summary"
            referencedColumns: ["lease_id"]
          },
          {
            foreignKeyName: "lease_units_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "v_rent_roll"
            referencedColumns: ["lease_id"]
          },
          {
            foreignKeyName: "lease_units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "lease_units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "lease_units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "lease_units_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_units_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "v_unit_occupancy"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "lease_units_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "lease_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_units_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "v_lease_summary"
            referencedColumns: ["version_id"]
          },
          {
            foreignKeyName: "lease_units_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "v_rent_roll"
            referencedColumns: ["version_id"]
          },
        ]
      }
      lease_versions: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          base_rent: number
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          deposit_amount: number
          deposit_expiry_date: string | null
          deposit_reference: string | null
          effective_from: string
          effective_to: string | null
          end_date: string | null
          id: string
          indexation_index: string | null
          indexation_month: number | null
          indexation_pct: number | null
          indexation_type: string
          is_open_ended: boolean
          lease_id: string
          notes: string | null
          notice_period_days: number | null
          payment_day: number | null
          payment_frequency: string
          review_cycle_months: number | null
          service_charge: number
          start_date: string
          status: string
          superseded_at: string | null
          updated_at: string
          updated_by: string | null
          vat_applicable: boolean
          version_no: number
          version_reason: string
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          base_rent?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          deposit_amount?: number
          deposit_expiry_date?: string | null
          deposit_reference?: string | null
          effective_from: string
          effective_to?: string | null
          end_date?: string | null
          id?: string
          indexation_index?: string | null
          indexation_month?: number | null
          indexation_pct?: number | null
          indexation_type?: string
          is_open_ended?: boolean
          lease_id: string
          notes?: string | null
          notice_period_days?: number | null
          payment_day?: number | null
          payment_frequency?: string
          review_cycle_months?: number | null
          service_charge?: number
          start_date: string
          status?: string
          superseded_at?: string | null
          updated_at?: string
          updated_by?: string | null
          vat_applicable?: boolean
          version_no: number
          version_reason?: string
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          base_rent?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          deposit_amount?: number
          deposit_expiry_date?: string | null
          deposit_reference?: string | null
          effective_from?: string
          effective_to?: string | null
          end_date?: string | null
          id?: string
          indexation_index?: string | null
          indexation_month?: number | null
          indexation_pct?: number | null
          indexation_type?: string
          is_open_ended?: boolean
          lease_id?: string
          notes?: string | null
          notice_period_days?: number | null
          payment_day?: number | null
          payment_frequency?: string
          review_cycle_months?: number | null
          service_charge?: number
          start_date?: string
          status?: string
          superseded_at?: string | null
          updated_at?: string
          updated_by?: string | null
          vat_applicable?: boolean
          version_no?: number
          version_reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "lease_versions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_versions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "lease_versions_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "lease_reminders"
            referencedColumns: ["lease_id"]
          },
          {
            foreignKeyName: "lease_versions_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_versions_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "v_lease_summary"
            referencedColumns: ["lease_id"]
          },
          {
            foreignKeyName: "lease_versions_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "v_rent_roll"
            referencedColumns: ["lease_id"]
          },
        ]
      }
      leases: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          code: string | null
          commencement_date: string | null
          company_id: string
          created_at: string
          created_by: string | null
          current_version_id: string | null
          id: string
          lease_type: string
          notes: string | null
          primary_tenant_id: string | null
          property_id: string
          renewed_from_lease_id: string | null
          status: string
          termination_date: string | null
          termination_reason: string | null
          title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          code?: string | null
          commencement_date?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          id?: string
          lease_type?: string
          notes?: string | null
          primary_tenant_id?: string | null
          property_id: string
          renewed_from_lease_id?: string | null
          status?: string
          termination_date?: string | null
          termination_reason?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          code?: string | null
          commencement_date?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          id?: string
          lease_type?: string
          notes?: string | null
          primary_tenant_id?: string | null
          property_id?: string
          renewed_from_lease_id?: string | null
          status?: string
          termination_date?: string | null
          termination_reason?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "leases_current_version_fk"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "lease_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_current_version_fk"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "v_lease_summary"
            referencedColumns: ["version_id"]
          },
          {
            foreignKeyName: "leases_current_version_fk"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "v_rent_roll"
            referencedColumns: ["version_id"]
          },
          {
            foreignKeyName: "leases_primary_tenant_id_fkey"
            columns: ["primary_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_primary_tenant_id_fkey"
            columns: ["primary_tenant_id"]
            isOneToOne: false
            referencedRelation: "v_rent_roll"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "leases_primary_tenant_id_fkey"
            columns: ["primary_tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenant_concentration"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "leases_renewed_from_lease_id_fkey"
            columns: ["renewed_from_lease_id"]
            isOneToOne: false
            referencedRelation: "lease_reminders"
            referencedColumns: ["lease_id"]
          },
          {
            foreignKeyName: "leases_renewed_from_lease_id_fkey"
            columns: ["renewed_from_lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_renewed_from_lease_id_fkey"
            columns: ["renewed_from_lease_id"]
            isOneToOne: false
            referencedRelation: "v_lease_summary"
            referencedColumns: ["lease_id"]
          },
          {
            foreignKeyName: "leases_renewed_from_lease_id_fkey"
            columns: ["renewed_from_lease_id"]
            isOneToOne: false
            referencedRelation: "v_rent_roll"
            referencedColumns: ["lease_id"]
          },
        ]
      }
      maintenance_inspection_evidence: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          document_id: string | null
          finding: string
          id: string
          job_id: string
          notes: string | null
          outcome: string
          recorded_at: string
          recorded_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          finding: string
          id?: string
          job_id: string
          notes?: string | null
          outcome?: string
          recorded_at?: string
          recorded_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          finding?: string
          id?: string
          job_id?: string
          notes?: string | null
          outcome?: string
          recorded_at?: string
          recorded_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_inspection_evidence_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_inspection_evidence_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "maintenance_inspection_evidence_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_inspection_evidence_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "maintenance_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_inspection_evidence_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_job_summary"
            referencedColumns: ["job_id"]
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
          job_kind: string
          notes: string | null
          occurrence_key: string | null
          planned_date: string | null
          priority: string
          property_id: string | null
          requested_date: string
          responsible_name: string | null
          responsible_user_id: string | null
          schedule_id: string | null
          status: string
          target_date: string | null
          title: string
          unit_id: string | null
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
          job_kind?: string
          notes?: string | null
          occurrence_key?: string | null
          planned_date?: string | null
          priority?: string
          property_id?: string | null
          requested_date?: string
          responsible_name?: string | null
          responsible_user_id?: string | null
          schedule_id?: string | null
          status?: string
          target_date?: string | null
          title: string
          unit_id?: string | null
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
          job_kind?: string
          notes?: string | null
          occurrence_key?: string | null
          planned_date?: string | null
          priority?: string
          property_id?: string | null
          requested_date?: string
          responsible_name?: string | null
          responsible_user_id?: string | null
          schedule_id?: string | null
          status?: string
          target_date?: string | null
          title?: string
          unit_id?: string | null
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
          {
            foreignKeyName: "maintenance_jobs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_jobs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "maintenance_jobs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "maintenance_jobs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "maintenance_jobs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "maintenance_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_jobs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "v_maintenance_schedule_summary"
            referencedColumns: ["schedule_id"]
          },
          {
            foreignKeyName: "maintenance_jobs_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_jobs_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "v_unit_occupancy"
            referencedColumns: ["unit_id"]
          },
        ]
      }
      maintenance_schedules: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          asset_label: string | null
          code: string | null
          company_id: string
          counterparty_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          frequency: string
          id: string
          interval_days: number | null
          is_active: boolean
          last_generated_at: string | null
          last_generated_through: string | null
          lead_time_days: number
          notes: string | null
          priority: string
          property_id: string | null
          responsible_name: string | null
          responsible_user_id: string | null
          schedule_kind: string
          start_date: string
          title: string
          unit_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          asset_label?: string | null
          code?: string | null
          company_id: string
          counterparty_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          interval_days?: number | null
          is_active?: boolean
          last_generated_at?: string | null
          last_generated_through?: string | null
          lead_time_days?: number
          notes?: string | null
          priority?: string
          property_id?: string | null
          responsible_name?: string | null
          responsible_user_id?: string | null
          schedule_kind?: string
          start_date?: string
          title: string
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          asset_label?: string | null
          code?: string | null
          company_id?: string
          counterparty_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          interval_days?: number | null
          is_active?: boolean
          last_generated_at?: string | null
          last_generated_through?: string | null
          lead_time_days?: number
          notes?: string | null
          priority?: string
          property_id?: string | null
          responsible_name?: string | null
          responsible_user_id?: string | null
          schedule_kind?: string
          start_date?: string
          title?: string
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "maintenance_schedules_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "maintenance_schedules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "maintenance_schedules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "maintenance_schedules_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "v_unit_occupancy"
            referencedColumns: ["unit_id"]
          },
        ]
      }
      occupancy_history: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          lease_id: string | null
          notes: string | null
          period_end: string | null
          period_start: string
          property_id: string
          reason: string | null
          status: string
          tenant_id: string | null
          unit_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          lease_id?: string | null
          notes?: string | null
          period_end?: string | null
          period_start: string
          property_id: string
          reason?: string | null
          status: string
          tenant_id?: string | null
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          lease_id?: string | null
          notes?: string | null
          period_end?: string | null
          period_start?: string
          property_id?: string
          reason?: string | null
          status?: string
          tenant_id?: string | null
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "occupancy_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occupancy_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "occupancy_history_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "lease_reminders"
            referencedColumns: ["lease_id"]
          },
          {
            foreignKeyName: "occupancy_history_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occupancy_history_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "v_lease_summary"
            referencedColumns: ["lease_id"]
          },
          {
            foreignKeyName: "occupancy_history_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "v_rent_roll"
            referencedColumns: ["lease_id"]
          },
          {
            foreignKeyName: "occupancy_history_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occupancy_history_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "occupancy_history_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "occupancy_history_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "occupancy_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occupancy_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_rent_roll"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "occupancy_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenant_concentration"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "occupancy_history_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occupancy_history_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "v_unit_occupancy"
            referencedColumns: ["unit_id"]
          },
        ]
      }
      operational_obligations: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          code: string | null
          commitment_id: string | null
          company_id: string
          counterparty_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          notes: string | null
          obligation_type: string
          priority: string
          property_id: string | null
          recurrence_end_date: string | null
          recurrence_frequency: string
          recurrence_interval: number
          reminder_lead_days: number
          responsible_name: string | null
          responsible_user_id: string | null
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          code?: string | null
          commitment_id?: string | null
          company_id: string
          counterparty_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          obligation_type: string
          priority?: string
          property_id?: string | null
          recurrence_end_date?: string | null
          recurrence_frequency?: string
          recurrence_interval?: number
          reminder_lead_days?: number
          responsible_name?: string | null
          responsible_user_id?: string | null
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          code?: string | null
          commitment_id?: string | null
          company_id?: string
          counterparty_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          obligation_type?: string
          priority?: string
          property_id?: string | null
          recurrence_end_date?: string | null
          recurrence_frequency?: string
          recurrence_interval?: number
          reminder_lead_days?: number
          responsible_name?: string | null
          responsible_user_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operational_obligations_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_obligations_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "v_commitment_summary"
            referencedColumns: ["commitment_id"]
          },
          {
            foreignKeyName: "operational_obligations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_obligations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "operational_obligations_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_obligations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_obligations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "operational_obligations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "operational_obligations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
        ]
      }
      operational_reminders: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          due_on: string | null
          entity_id: string
          entity_type: string
          id: string
          notes: string | null
          reason: string
          remind_on: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          due_on?: string | null
          entity_id: string
          entity_type: string
          id?: string
          notes?: string | null
          reason: string
          remind_on: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          due_on?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          notes?: string | null
          reason?: string
          remind_on?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operational_reminders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_reminders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
        ]
      }
      payment_batches: {
        Row: {
          bank_account_id: string | null
          company_id: string
          counterparty_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          execution_order: number
          export_format: string | null
          export_reference: string | null
          export_status: string
          exported_at: string | null
          id: string
          notes: string | null
          payment_run_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bank_account_id?: string | null
          company_id: string
          counterparty_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          execution_order?: number
          export_format?: string | null
          export_reference?: string | null
          export_status?: string
          exported_at?: string | null
          id?: string
          notes?: string | null
          payment_run_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bank_account_id?: string | null
          company_id?: string
          counterparty_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          execution_order?: number
          export_format?: string | null
          export_reference?: string | null
          export_status?: string
          exported_at?: string | null
          id?: string
          notes?: string | null
          payment_run_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_batches_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_batches_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "v_bank_account_balances"
            referencedColumns: ["bank_account_id"]
          },
          {
            foreignKeyName: "payment_batches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_batches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "payment_batches_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_batches_payment_run_id_fkey"
            columns: ["payment_run_id"]
            isOneToOne: false
            referencedRelation: "payment_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_batches_payment_run_id_fkey"
            columns: ["payment_run_id"]
            isOneToOne: false
            referencedRelation: "v_payment_run_summary"
            referencedColumns: ["payment_run_id"]
          },
        ]
      }
      payment_instructions: {
        Row: {
          bank_account_id: string | null
          batch_id: string
          company_id: string
          counterparty_id: string | null
          created_at: string
          created_by: string | null
          document_id: string
          executed_at: string | null
          failure_reason: string | null
          id: string
          notes: string | null
          payment_method: string
          payment_reference: string | null
          payment_run_id: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bank_account_id?: string | null
          batch_id: string
          company_id: string
          counterparty_id?: string | null
          created_at?: string
          created_by?: string | null
          document_id: string
          executed_at?: string | null
          failure_reason?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          payment_reference?: string | null
          payment_run_id: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bank_account_id?: string | null
          batch_id?: string
          company_id?: string
          counterparty_id?: string | null
          created_at?: string
          created_by?: string | null
          document_id?: string
          executed_at?: string | null
          failure_reason?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          payment_reference?: string | null
          payment_run_id?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_instructions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_instructions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "v_bank_account_balances"
            referencedColumns: ["bank_account_id"]
          },
          {
            foreignKeyName: "payment_instructions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "payment_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_instructions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_payment_batch_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "payment_instructions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_instructions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "payment_instructions_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_instructions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "financial_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_instructions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_document_journal"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "payment_instructions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_income_statement"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "payment_instructions_payment_run_id_fkey"
            columns: ["payment_run_id"]
            isOneToOne: false
            referencedRelation: "payment_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_instructions_payment_run_id_fkey"
            columns: ["payment_run_id"]
            isOneToOne: false
            referencedRelation: "v_payment_run_summary"
            referencedColumns: ["payment_run_id"]
          },
        ]
      }
      payment_run_exports: {
        Row: {
          batch_id: string | null
          company_id: string
          content_hash: string | null
          created_at: string
          created_by: string | null
          document_id: string | null
          file_name: string | null
          format: string
          generated_at: string
          generated_by: string | null
          id: string
          instruction_count: number
          notes: string | null
          payment_run_id: string
          provider: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          batch_id?: string | null
          company_id: string
          content_hash?: string | null
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          file_name?: string | null
          format: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          instruction_count?: number
          notes?: string | null
          payment_run_id: string
          provider?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          batch_id?: string | null
          company_id?: string
          content_hash?: string | null
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          file_name?: string | null
          format?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          instruction_count?: number
          notes?: string | null
          payment_run_id?: string
          provider?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_run_exports_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "payment_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_run_exports_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_payment_batch_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "payment_run_exports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_run_exports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "payment_run_exports_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_run_exports_payment_run_id_fkey"
            columns: ["payment_run_id"]
            isOneToOne: false
            referencedRelation: "payment_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_run_exports_payment_run_id_fkey"
            columns: ["payment_run_id"]
            isOneToOne: false
            referencedRelation: "v_payment_run_summary"
            referencedColumns: ["payment_run_id"]
          },
        ]
      }
      payment_runs: {
        Row: {
          actual_execution_date: string | null
          approval_request_id: string | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          archived_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          company_id: string
          completed_at: string | null
          completed_by: string | null
          completion_notes: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          executed_at: string | null
          executed_by: string | null
          exported_at: string | null
          exported_by: string | null
          id: string
          notes: string | null
          reference: string
          scheduled_execution_date: string | null
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          actual_execution_date?: string | null
          approval_request_id?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          company_id: string
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          executed_at?: string | null
          executed_by?: string | null
          exported_at?: string | null
          exported_by?: string | null
          id?: string
          notes?: string | null
          reference: string
          scheduled_execution_date?: string | null
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          actual_execution_date?: string | null
          approval_request_id?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          company_id?: string
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          executed_at?: string | null
          executed_by?: string | null
          exported_at?: string | null
          exported_by?: string | null
          id?: string
          notes?: string | null
          reference?: string
          scheduled_execution_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
      service_contracts: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          auto_renew: boolean
          code: string | null
          commitment_id: string | null
          company_id: string
          contract_number: string | null
          counterparty_id: string | null
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          notes: string | null
          notice_period_days: number | null
          obligation_id: string | null
          property_id: string | null
          reminder_lead_days: number
          renewal_terms: string | null
          service_type: string
          start_date: string | null
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          auto_renew?: boolean
          code?: string | null
          commitment_id?: string | null
          company_id: string
          contract_number?: string | null
          counterparty_id?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          notice_period_days?: number | null
          obligation_id?: string | null
          property_id?: string | null
          reminder_lead_days?: number
          renewal_terms?: string | null
          service_type?: string
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          auto_renew?: boolean
          code?: string | null
          commitment_id?: string | null
          company_id?: string
          contract_number?: string | null
          counterparty_id?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          notice_period_days?: number | null
          obligation_id?: string | null
          property_id?: string | null
          reminder_lead_days?: number
          renewal_terms?: string | null
          service_type?: string
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_contracts_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_contracts_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "v_commitment_summary"
            referencedColumns: ["commitment_id"]
          },
          {
            foreignKeyName: "service_contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "service_contracts_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_contracts_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "operational_obligations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_contracts_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "v_operational_obligation_summary"
            referencedColumns: ["obligation_id"]
          },
          {
            foreignKeyName: "service_contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "service_contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "service_contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
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
      tax_schedule_dates: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          due_date: string
          id: string
          label: string | null
          notes: string | null
          reminder_date: string | null
          sequence_no: number
          status: string
          tax_schedule_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          due_date: string
          id?: string
          label?: string | null
          notes?: string | null
          reminder_date?: string | null
          sequence_no?: number
          status?: string
          tax_schedule_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          due_date?: string
          id?: string
          label?: string | null
          notes?: string | null
          reminder_date?: string | null
          sequence_no?: number
          status?: string
          tax_schedule_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_schedule_dates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_schedule_dates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "tax_schedule_dates_tax_schedule_id_fkey"
            columns: ["tax_schedule_id"]
            isOneToOne: false
            referencedRelation: "tax_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_schedule_dates_tax_schedule_id_fkey"
            columns: ["tax_schedule_id"]
            isOneToOne: false
            referencedRelation: "v_tax_schedule_summary"
            referencedColumns: ["schedule_id"]
          },
        ]
      }
      tax_schedules: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          code: string | null
          commitment_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          jurisdiction: string | null
          notes: string | null
          obligation_id: string | null
          property_id: string | null
          reference: string | null
          reminder_lead_days: number
          status: string
          tax_type: string
          tax_year: number | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          code?: string | null
          commitment_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          jurisdiction?: string | null
          notes?: string | null
          obligation_id?: string | null
          property_id?: string | null
          reference?: string | null
          reminder_lead_days?: number
          status?: string
          tax_type?: string
          tax_year?: number | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          code?: string | null
          commitment_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          jurisdiction?: string | null
          notes?: string | null
          obligation_id?: string | null
          property_id?: string | null
          reference?: string | null
          reminder_lead_days?: number
          status?: string
          tax_type?: string
          tax_year?: number | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_schedules_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_schedules_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "v_commitment_summary"
            referencedColumns: ["commitment_id"]
          },
          {
            foreignKeyName: "tax_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "tax_schedules_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "operational_obligations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_schedules_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "v_operational_obligation_summary"
            referencedColumns: ["obligation_id"]
          },
          {
            foreignKeyName: "tax_schedules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_schedules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "tax_schedules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "tax_schedules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
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
            foreignKeyName: "tenancy_agreements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_rent_roll"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenancy_agreements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenant_concentration"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenancy_agreements_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancy_agreements_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "v_unit_occupancy"
            referencedColumns: ["unit_id"]
          },
        ]
      }
      tenant_contacts: {
        Row: {
          archived_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          is_primary: boolean
          name: string
          notes: string | null
          phone: string | null
          role: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "tenant_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_rent_roll"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenant_concentration"
            referencedColumns: ["tenant_id"]
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
          {
            foreignKeyName: "tenant_fitout_loans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_rent_roll"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_fitout_loans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenant_concentration"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          archive_reason: string | null
          archived_at: string | null
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
          registration_number: string | null
          sector: string | null
          status: string
          tax_number: string | null
          tenant_type: string
          trading_name: string | null
          updated_at: string
          updated_by: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          archive_reason?: string | null
          archived_at?: string | null
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
          registration_number?: string | null
          sector?: string | null
          status?: string
          tax_number?: string | null
          tenant_type?: string
          trading_name?: string | null
          updated_at?: string
          updated_by?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          archive_reason?: string | null
          archived_at?: string | null
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
          registration_number?: string | null
          sector?: string | null
          status?: string
          tax_number?: string | null
          tenant_type?: string
          trading_name?: string | null
          updated_at?: string
          updated_by?: string | null
          website?: string | null
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
      utility_contracts: {
        Row: {
          account_number: string | null
          activation_date: string | null
          archive_reason: string | null
          archived_at: string | null
          code: string | null
          commitment_id: string | null
          company_id: string
          counterparty_id: string | null
          created_at: string
          created_by: string | null
          id: string
          meter_identifier: string | null
          notes: string | null
          obligation_id: string | null
          property_id: string | null
          reminder_lead_days: number
          service_address: string | null
          status: string
          termination_date: string | null
          title: string
          unit_id: string | null
          updated_at: string
          updated_by: string | null
          utility_type: string
        }
        Insert: {
          account_number?: string | null
          activation_date?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          code?: string | null
          commitment_id?: string | null
          company_id: string
          counterparty_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          meter_identifier?: string | null
          notes?: string | null
          obligation_id?: string | null
          property_id?: string | null
          reminder_lead_days?: number
          service_address?: string | null
          status?: string
          termination_date?: string | null
          title: string
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
          utility_type?: string
        }
        Update: {
          account_number?: string | null
          activation_date?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          code?: string | null
          commitment_id?: string | null
          company_id?: string
          counterparty_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          meter_identifier?: string | null
          notes?: string | null
          obligation_id?: string | null
          property_id?: string | null
          reminder_lead_days?: number
          service_address?: string | null
          status?: string
          termination_date?: string | null
          title?: string
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
          utility_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "utility_contracts_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utility_contracts_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "v_commitment_summary"
            referencedColumns: ["commitment_id"]
          },
          {
            foreignKeyName: "utility_contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utility_contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "utility_contracts_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utility_contracts_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "operational_obligations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utility_contracts_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "v_operational_obligation_summary"
            referencedColumns: ["obligation_id"]
          },
          {
            foreignKeyName: "utility_contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utility_contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "utility_contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "utility_contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "utility_contracts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utility_contracts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "v_unit_occupancy"
            referencedColumns: ["unit_id"]
          },
        ]
      }
      vacancy_periods: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          marketing_status: string
          notes: string | null
          property_id: string
          reason: string
          target_occupation_date: string | null
          target_rent: number | null
          unit_id: string | null
          updated_at: string
          updated_by: string | null
          vacancy_end: string | null
          vacancy_start: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          marketing_status?: string
          notes?: string | null
          property_id: string
          reason?: string
          target_occupation_date?: string | null
          target_rent?: number | null
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vacancy_end?: string | null
          vacancy_start: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          marketing_status?: string
          notes?: string | null
          property_id?: string
          reason?: string
          target_occupation_date?: string | null
          target_rent?: number | null
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vacancy_end?: string | null
          vacancy_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacancy_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacancy_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "vacancy_periods_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacancy_periods_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "vacancy_periods_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "vacancy_periods_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "vacancy_periods_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacancy_periods_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "v_unit_occupancy"
            referencedColumns: ["unit_id"]
          },
        ]
      }
    }
    Views: {
      lease_reminders: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          due_on: string | null
          entity_id: string | null
          entity_type: string | null
          id: string | null
          lease_code: string | null
          lease_id: string | null
          notes: string | null
          property_id: string | null
          reason: string | null
          remind_on: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "operational_reminders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_reminders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
        ]
      }
      v_acquisition_commitment_link: {
        Row: {
          authorised_amount: number | null
          commitment_code: string | null
          commitment_currency: string | null
          commitment_id: string | null
          commitment_status: string | null
          commitment_title: string | null
          company_id: string | null
          link_id: string | null
          link_reason: string | null
          linked_at: string | null
          opportunity_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_commitment_links_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_commitment_links_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "v_commitment_summary"
            referencedColumns: ["commitment_id"]
          },
          {
            foreignKeyName: "acquisition_commitment_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_commitment_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "acquisition_commitment_links_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "acquisition_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_commitment_links_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "v_acquisition_pipeline"
            referencedColumns: ["opportunity_id"]
          },
        ]
      }
      v_acquisition_pipeline: {
        Row: {
          activity_count: number | null
          address: string | null
          archived_at: string | null
          asking_price: number | null
          assigned_to: string | null
          broker_id: string | null
          broker_name: string | null
          company_id: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          decision: string | null
          decision_reason: string | null
          expected_closing_date: string | null
          indicative_offer: number | null
          is_archived: boolean | null
          latest_offer_amount: number | null
          latest_valuation: number | null
          link_kind: string | null
          linked_commitment_count: number | null
          location: string | null
          notes: string | null
          offer_count: number | null
          open_task_count: number | null
          opportunity_id: string | null
          opportunity_type: string | null
          probability: number | null
          property_id: string | null
          property_name: string | null
          reference: string | null
          seller_id: string | null
          seller_name: string | null
          source: string | null
          stage: string | null
          target_acquisition_date: string | null
          title: string | null
          updated_at: string | null
          valuation_amount: number | null
          weighted_estimate: number | null
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_opportunities_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "acquisition_opportunities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_opportunities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "acquisition_opportunities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "acquisition_opportunities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "acquisition_opportunities_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
        ]
      }
      v_acquisition_stage_summary: {
        Row: {
          company_id: string | null
          estimate_total: number | null
          opportunity_count: number | null
          stage: string | null
          weighted_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
        ]
      }
      v_approval_history: {
        Row: {
          actor_id: string | null
          company_id: string | null
          created_at: string | null
          decision: string | null
          delegated_to: string | null
          history_id: string | null
          override_reason: string | null
          reason: string | null
          request_id: string | null
          source: string | null
          step_no: number | null
          target_id: string | null
          target_type: string | null
        }
        Relationships: []
      }
      v_approval_inbox: {
        Row: {
          approver_id: string | null
          company_id: string | null
          current_step_no: number | null
          expires_at: string | null
          request_id: string | null
          requested_amount: number | null
          requested_at: string | null
          requested_by: string | null
          rule: string | null
          step_id: string | null
          step_name: string | null
          target_id: string | null
          target_label: string | null
          target_type: string | null
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
          {
            foreignKeyName: "approval_requests_target_type_fkey"
            columns: ["target_type"]
            isOneToOne: false
            referencedRelation: "approval_target_types"
            referencedColumns: ["target_type"]
          },
        ]
      }
      v_approval_request_detail: {
        Row: {
          callback_at: string | null
          callback_attempts: number | null
          callback_error: string | null
          callback_status: string | null
          company_id: string | null
          completed_at: string | null
          current_step_name: string | null
          current_step_no: number | null
          decided_at: string | null
          decided_by: string | null
          decision: string | null
          decision_count: number | null
          decision_reason: string | null
          escalated_at: string | null
          event_count: number | null
          expires_at: string | null
          is_system: boolean | null
          last_reminder_at: string | null
          reason: string | null
          request_id: string | null
          requested_amount: number | null
          requested_at: string | null
          requested_by: string | null
          rule_reference: string | null
          snapshot: Json | null
          target_id: string | null
          target_label: string | null
          target_type: string | null
          target_type_label: string | null
          threshold_amount: number | null
          workflow_code: string | null
          workflow_id: string | null
          workflow_name: string | null
          workflow_version_id: string | null
          workflow_version_no: number | null
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
          {
            foreignKeyName: "approval_requests_target_type_fkey"
            columns: ["target_type"]
            isOneToOne: false
            referencedRelation: "approval_target_types"
            referencedColumns: ["target_type"]
          },
        ]
      }
      v_approval_workflow_overview: {
        Row: {
          archived_at: string | null
          code: string | null
          company_id: string | null
          created_at: string | null
          description: string | null
          is_system: boolean | null
          name: string | null
          pending_count: number | null
          published_at: string | null
          published_version_id: string | null
          published_version_no: number | null
          request_count: number | null
          status: string | null
          step_count: number | null
          target_type: string | null
          version_count: number | null
          workflow_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_workflows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_workflows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "approval_workflows_published_version_fkey"
            columns: ["published_version_id"]
            isOneToOne: false
            referencedRelation: "approval_workflow_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_workflows_published_version_fkey"
            columns: ["published_version_id"]
            isOneToOne: false
            referencedRelation: "v_approval_request_detail"
            referencedColumns: ["workflow_version_id"]
          },
          {
            foreignKeyName: "approval_workflows_target_type_fkey"
            columns: ["target_type"]
            isOneToOne: false
            referencedRelation: "approval_target_types"
            referencedColumns: ["target_type"]
          },
        ]
      }
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
            foreignKeyName: "cash_flow_entries_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "v_investment_metrics"
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
      v_budget_line_performance: {
        Row: {
          budget_id: string | null
          budget_name: string | null
          budget_version_id: string | null
          committed_amount: number | null
          company_id: string | null
          consumed_pct: number | null
          currency: string | null
          dimension_id: string | null
          dimension_value_id: string | null
          dimension_value_label: string | null
          direction: string | null
          fiscal_year: number | null
          invoiced_amount: number | null
          label: string | null
          line_id: string | null
          line_no: number | null
          notes: string | null
          paid_amount: number | null
          period_month: number | null
          planned_amount: number | null
          project_id: string | null
          property_id: string | null
          remaining_amount: number | null
          unit_id: string | null
          variance_amount: number | null
          version_no: number | null
          version_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_budget_version_id_fkey"
            columns: ["budget_version_id"]
            isOneToOne: false
            referencedRelation: "budget_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_budget_version_id_fkey"
            columns: ["budget_version_id"]
            isOneToOne: false
            referencedRelation: "v_budget_version_summary"
            referencedColumns: ["version_id"]
          },
          {
            foreignKeyName: "budget_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "budget_lines_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "dimensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_dimension_value_id_fkey"
            columns: ["dimension_value_id"]
            isOneToOne: false
            referencedRelation: "dimension_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_versions_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      v_budget_version_summary: {
        Row: {
          approval_request_id: string | null
          approval_status: string | null
          archived_at: string | null
          budget_id: string | null
          budget_status: string | null
          code: string | null
          committed_amount: number | null
          company_id: string | null
          created_at: string | null
          currency: string | null
          fiscal_year: number | null
          invoiced_amount: number | null
          is_current: boolean | null
          line_count: number | null
          name: string | null
          notes: string | null
          paid_amount: number | null
          planned_amount: number | null
          planned_inflow: number | null
          planned_outflow: number | null
          project_id: string | null
          property_id: string | null
          property_name: string | null
          published_at: string | null
          published_by: string | null
          reason: string | null
          remaining_amount: number | null
          status: string | null
          unit_id: string | null
          updated_at: string | null
          variance_amount: number | null
          version_id: string | null
          version_no: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_versions_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_versions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_versions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "capex_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_capex_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "budgets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "budgets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "budgets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "budgets_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "v_unit_occupancy"
            referencedColumns: ["unit_id"]
          },
        ]
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
            foreignKeyName: "cash_flow_entries_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "v_investment_metrics"
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
          {
            foreignKeyName: "cash_flow_entries_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "v_unit_occupancy"
            referencedColumns: ["unit_id"]
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
            foreignKeyName: "cash_flow_entries_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "v_investment_metrics"
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
      v_closing_case: {
        Row: {
          actual_completion_date: string | null
          agreed_price: number | null
          archived_at: string | null
          blocking_outstanding: number | null
          cancel_reason: string | null
          closing_id: string | null
          commitment_id: string | null
          company_id: string | null
          condition_count: number | null
          conditions_met: number | null
          created_at: string | null
          currency: string | null
          deed_date: string | null
          diligence_ready: boolean | null
          diligence_recommendation: string | null
          diligence_reference: string | null
          diligence_status: string | null
          due_diligence_case_id: string | null
          failed_conditions: number | null
          handover_status: string | null
          handover_task_count: number | null
          handover_tasks_done: number | null
          is_archived: boolean | null
          is_ready: boolean | null
          notary_name: string | null
          notary_reference: string | null
          notes: string | null
          opportunity_id: string | null
          opportunity_reference: string | null
          opportunity_title: string | null
          possession_date: string | null
          property_id: string | null
          property_name: string | null
          reference: string | null
          status: string | null
          target_completion_date: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "closing_cases_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closing_cases_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "v_commitment_summary"
            referencedColumns: ["commitment_id"]
          },
          {
            foreignKeyName: "closing_cases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closing_cases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "closing_cases_due_diligence_case_id_fkey"
            columns: ["due_diligence_case_id"]
            isOneToOne: false
            referencedRelation: "due_diligence_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closing_cases_due_diligence_case_id_fkey"
            columns: ["due_diligence_case_id"]
            isOneToOne: false
            referencedRelation: "v_due_diligence_case"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "closing_cases_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "acquisition_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closing_cases_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "v_acquisition_pipeline"
            referencedColumns: ["opportunity_id"]
          },
          {
            foreignKeyName: "closing_cases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closing_cases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "closing_cases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "closing_cases_property_id_fkey"
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
      v_due_diligence_case: {
        Row: {
          archived_at: string | null
          assigned_to: string | null
          blocking_count: number | null
          blocking_outstanding: number | null
          case_id: string | null
          company_id: string | null
          completed_at: string | null
          created_at: string | null
          done_count: number | null
          failed_count: number | null
          is_archived: boolean | null
          item_count: number | null
          opportunity_id: string | null
          opportunity_reference: string | null
          opportunity_stage: string | null
          opportunity_title: string | null
          permits_completion: boolean | null
          progress_pct: number | null
          recommendation: string | null
          recommendation_notes: string | null
          reference: string | null
          started_on: string | null
          status: string | null
          summary: string | null
          target_date: string | null
          template_id: string | null
          template_name: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "due_diligence_cases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "due_diligence_cases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "due_diligence_cases_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "acquisition_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "due_diligence_cases_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "v_acquisition_pipeline"
            referencedColumns: ["opportunity_id"]
          },
          {
            foreignKeyName: "due_diligence_cases_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "due_diligence_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      v_due_diligence_item: {
        Row: {
          assignee_id: string | null
          case_id: string | null
          company_id: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          evidence_count: number | null
          findings: string | null
          is_blocking: boolean | null
          item_id: string | null
          risk_level: string | null
          section: string | null
          sort_order: number | null
          status: string | null
          title: string | null
          waiver_reason: string | null
        }
        Relationships: [
          {
            foreignKeyName: "due_diligence_items_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "due_diligence_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "due_diligence_items_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_due_diligence_case"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "due_diligence_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "due_diligence_items_company_id_fkey"
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
          {
            foreignKeyName: "financing_schedule_versions_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "v_investment_metrics"
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
      v_insurance_policy_summary: {
        Row: {
          archived_at: string | null
          authorised_amount: number | null
          broker_counterparty_id: string | null
          broker_name: string | null
          code: string | null
          commitment_approval_status: string | null
          commitment_currency: string | null
          commitment_id: string | null
          commitment_status: string | null
          committed_amount: number | null
          company_id: string | null
          created_at: string | null
          days_until_expiry: number | null
          effective_date: string | null
          excess_amount: number | null
          expiry_date: string | null
          insured_assets: string | null
          insurer_counterparty_id: string | null
          insurer_name: string | null
          invoiced_amount: number | null
          notes: string | null
          obligation_id: string | null
          paid_amount: number | null
          policy_id: string | null
          policy_number: string | null
          policy_type: string | null
          property_id: string | null
          property_name: string | null
          remaining_commitment: number | null
          reminder_lead_days: number | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_policies_broker_counterparty_id_fkey"
            columns: ["broker_counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_policies_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_policies_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "v_commitment_summary"
            referencedColumns: ["commitment_id"]
          },
          {
            foreignKeyName: "insurance_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "insurance_policies_insurer_counterparty_id_fkey"
            columns: ["insurer_counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_policies_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "operational_obligations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_policies_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "v_operational_obligation_summary"
            referencedColumns: ["obligation_id"]
          },
          {
            foreignKeyName: "insurance_policies_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_policies_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "insurance_policies_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "insurance_policies_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
        ]
      }
      v_investment_metrics: {
        Row: {
          acquisition_total: number | null
          agreement_id: string | null
          annual_debt_service: number | null
          cash_on_cash_pct: number | null
          company_id: string | null
          currency: string | null
          current_valuation: number | null
          debt_service_paid_12m: number | null
          dscr: number | null
          lender: string | null
          ltv_pct: number | null
          net_operating_income_12m: number | null
          original_principal: number | null
          outstanding_principal: number | null
          property_id: string | null
          property_name: string | null
          status: string | null
          type: string | null
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
      v_lease_expiry_profile: {
        Row: {
          annual_rent_expiring: number | null
          company_id: string | null
          expiry_year: number | null
          lease_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
        ]
      }
      v_lease_summary: {
        Row: {
          annual_charge: number | null
          base_rent: number | null
          code: string | null
          company_id: string | null
          currency: string | null
          days_to_expiry: number | null
          deposit_amount: number | null
          deposit_expiry_date: string | null
          end_date: string | null
          indexation_type: string | null
          is_archived: boolean | null
          is_open_ended: boolean | null
          lease_id: string | null
          lease_type: string | null
          next_break_date: string | null
          next_break_notice_deadline: string | null
          next_review_date: string | null
          notice_period_days: number | null
          payment_frequency: string | null
          primary_tenant_id: string | null
          property_id: string | null
          property_name: string | null
          review_cycle_months: number | null
          service_charge: number | null
          start_date: string | null
          status: string | null
          tenant_name: string | null
          title: string | null
          total_area_m2: number | null
          total_periodic_charge: number | null
          unit_count: number | null
          version_id: string | null
          version_no: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "leases_primary_tenant_id_fkey"
            columns: ["primary_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_primary_tenant_id_fkey"
            columns: ["primary_tenant_id"]
            isOneToOne: false
            referencedRelation: "v_rent_roll"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "leases_primary_tenant_id_fkey"
            columns: ["primary_tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenant_concentration"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
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
      v_maintenance_schedule_summary: {
        Row: {
          archived_at: string | null
          asset_label: string | null
          code: string | null
          company_id: string | null
          counterparty_id: string | null
          counterparty_name: string | null
          created_at: string | null
          end_date: string | null
          frequency: string | null
          interval_days: number | null
          is_active: boolean | null
          job_count: number | null
          last_completed_date: string | null
          last_generated_at: string | null
          last_generated_through: string | null
          lead_time_days: number | null
          next_planned_date: string | null
          notes: string | null
          open_count: number | null
          priority: string | null
          property_id: string | null
          property_name: string | null
          responsible_name: string | null
          schedule_id: string | null
          schedule_kind: string | null
          start_date: string | null
          title: string | null
          unit_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "maintenance_schedules_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "maintenance_schedules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "maintenance_schedules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "maintenance_schedules_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "v_unit_occupancy"
            referencedColumns: ["unit_id"]
          },
        ]
      }
      v_occupancy_metrics: {
        Row: {
          company_id: string | null
          contracted_annual_rent: number | null
          occupancy_pct: number | null
          occupied_area_m2: number | null
          occupied_units: number | null
          total_area_m2: number | null
          unit_count: number | null
          vacancy_pct: number | null
          vacant_units: number | null
          wault_years: number | null
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
        ]
      }
      v_operational_obligation_summary: {
        Row: {
          archived_at: string | null
          authorised_amount: number | null
          code: string | null
          commitment_approval_status: string | null
          commitment_currency: string | null
          commitment_id: string | null
          commitment_status: string | null
          commitment_title: string | null
          committed_amount: number | null
          company_id: string | null
          counterparty_id: string | null
          counterparty_name: string | null
          created_at: string | null
          days_until_due: number | null
          description: string | null
          due_date: string | null
          invoiced_amount: number | null
          notes: string | null
          obligation_id: string | null
          obligation_type: string | null
          paid_amount: number | null
          priority: string | null
          property_id: string | null
          property_name: string | null
          recurrence_end_date: string | null
          recurrence_frequency: string | null
          recurrence_interval: number | null
          remaining_commitment: number | null
          reminder_lead_days: number | null
          responsible_name: string | null
          responsible_user_id: string | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operational_obligations_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_obligations_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "v_commitment_summary"
            referencedColumns: ["commitment_id"]
          },
          {
            foreignKeyName: "operational_obligations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_obligations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "operational_obligations_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_obligations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_obligations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "operational_obligations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "operational_obligations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
        ]
      }
      v_operational_reminders: {
        Row: {
          commitment_id: string | null
          company_id: string | null
          created_at: string | null
          days_until_due: number | null
          days_until_reminder: number | null
          due_on: string | null
          entity_id: string | null
          entity_type: string | null
          is_overdue: boolean | null
          notes: string | null
          reason: string | null
          remind_on: string | null
          reminder_id: string | null
          resolved_at: string | null
          severity: string | null
          status: string | null
          title: string | null
        }
        Insert: {
          commitment_id?: never
          company_id?: string | null
          created_at?: string | null
          days_until_due?: never
          days_until_reminder?: never
          due_on?: string | null
          entity_id?: string | null
          entity_type?: string | null
          is_overdue?: never
          notes?: string | null
          reason?: string | null
          remind_on?: string | null
          reminder_id?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          title?: string | null
        }
        Update: {
          commitment_id?: never
          company_id?: string | null
          created_at?: string | null
          days_until_due?: never
          days_until_reminder?: never
          due_on?: string | null
          entity_id?: string | null
          entity_type?: string | null
          is_overdue?: never
          notes?: string | null
          reason?: string | null
          remind_on?: string | null
          reminder_id?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operational_reminders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_reminders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
        ]
      }
      v_payment_batch_summary: {
        Row: {
          bank_account_id: string | null
          batch_id: string | null
          company_id: string | null
          counterparty_id: string | null
          counterparty_name: string | null
          currency: string | null
          execution_order: number | null
          export_format: string | null
          export_reference: string | null
          export_status: string | null
          exported_at: string | null
          instruction_count: number | null
          outstanding_total: number | null
          payable_total: number | null
          payment_run_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_batches_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_batches_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "v_bank_account_balances"
            referencedColumns: ["bank_account_id"]
          },
          {
            foreignKeyName: "payment_batches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_batches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "payment_batches_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_batches_payment_run_id_fkey"
            columns: ["payment_run_id"]
            isOneToOne: false
            referencedRelation: "payment_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_batches_payment_run_id_fkey"
            columns: ["payment_run_id"]
            isOneToOne: false
            referencedRelation: "v_payment_run_summary"
            referencedColumns: ["payment_run_id"]
          },
        ]
      }
      v_payment_instruction_detail: {
        Row: {
          bank_account_id: string | null
          bank_account_name: string | null
          batch_id: string | null
          company_id: string | null
          counterparty_id: string | null
          counterparty_name: string | null
          currency: string | null
          doc_type: string | null
          document_id: string | null
          document_number: string | null
          document_status: string | null
          due_date: string | null
          executed_at: string | null
          failure_reason: string | null
          instruction_id: string | null
          issue_date: string | null
          notes: string | null
          outstanding_amount: number | null
          paid_amount: number | null
          payable_amount: number | null
          payment_method: string | null
          payment_reference: string | null
          payment_run_id: string | null
          payment_state: string | null
          series: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_instructions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_instructions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "v_bank_account_balances"
            referencedColumns: ["bank_account_id"]
          },
          {
            foreignKeyName: "payment_instructions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "payment_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_instructions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "v_payment_batch_summary"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "payment_instructions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_instructions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "payment_instructions_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_instructions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "financial_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_instructions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_document_journal"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "payment_instructions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_income_statement"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "payment_instructions_payment_run_id_fkey"
            columns: ["payment_run_id"]
            isOneToOne: false
            referencedRelation: "payment_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_instructions_payment_run_id_fkey"
            columns: ["payment_run_id"]
            isOneToOne: false
            referencedRelation: "v_payment_run_summary"
            referencedColumns: ["payment_run_id"]
          },
        ]
      }
      v_payment_run_summary: {
        Row: {
          actual_execution_date: string | null
          approval_request_id: string | null
          approval_status: string | null
          approved_by: string | null
          archived_at: string | null
          batch_count: number | null
          cancellation_reason: string | null
          company_id: string | null
          completed_at: string | null
          completion_notes: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          executed_at: string | null
          executed_count: number | null
          exported_at: string | null
          failed_count: number | null
          instruction_count: number | null
          outstanding_total: number | null
          payable_total: number | null
          payment_run_id: string | null
          reference: string | null
          scheduled_execution_date: string | null
          status: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
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
      v_rent_roll: {
        Row: {
          annual_rent: number | null
          area_m2: number | null
          company_id: string | null
          currency: string | null
          days_to_expiry: number | null
          deposit_amount: number | null
          end_date: string | null
          lease_code: string | null
          lease_id: string | null
          lease_status: string | null
          next_break_date: string | null
          next_review_date: string | null
          occupancy_status: string | null
          payment_frequency: string | null
          property_id: string | null
          property_name: string | null
          rent: number | null
          rent_roll_id: string | null
          service_charge: number | null
          start_date: string | null
          tenant_id: string | null
          tenant_name: string | null
          unit_code: string | null
          unit_id: string | null
          unit_name: string | null
          version_id: string | null
          version_no: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lease_units_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_units_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "v_unit_occupancy"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "leases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "leases_property_id_fkey"
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
          is_archived: boolean | null
          metadata: Json | null
          occurred_at: string | null
          property_id: string | null
          search_text: string | null
          status: string | null
          subtitle: string | null
          title: string | null
          url_path: string | null
        }
        Relationships: []
      }
      v_service_contract_summary: {
        Row: {
          archived_at: string | null
          authorised_amount: number | null
          auto_renew: boolean | null
          code: string | null
          commitment_approval_status: string | null
          commitment_currency: string | null
          commitment_id: string | null
          commitment_status: string | null
          committed_amount: number | null
          company_id: string | null
          contract_id: string | null
          contract_number: string | null
          counterparty_id: string | null
          counterparty_name: string | null
          created_at: string | null
          days_until_expiry: number | null
          end_date: string | null
          invoiced_amount: number | null
          notes: string | null
          notice_period_days: number | null
          obligation_id: string | null
          paid_amount: number | null
          property_id: string | null
          remaining_commitment: number | null
          reminder_lead_days: number | null
          renewal_terms: string | null
          service_type: string | null
          start_date: string | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_contracts_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_contracts_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "v_commitment_summary"
            referencedColumns: ["commitment_id"]
          },
          {
            foreignKeyName: "service_contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "service_contracts_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_contracts_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "operational_obligations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_contracts_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "v_operational_obligation_summary"
            referencedColumns: ["obligation_id"]
          },
          {
            foreignKeyName: "service_contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "service_contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "service_contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
        ]
      }
      v_tax_schedule_summary: {
        Row: {
          archived_at: string | null
          authorised_amount: number | null
          code: string | null
          commitment_approval_status: string | null
          commitment_currency: string | null
          commitment_id: string | null
          commitment_status: string | null
          committed_amount: number | null
          company_id: string | null
          created_at: string | null
          invoiced_amount: number | null
          jurisdiction: string | null
          next_due_date: string | null
          notes: string | null
          obligation_id: string | null
          paid_amount: number | null
          property_id: string | null
          property_name: string | null
          reference: string | null
          remaining_commitment: number | null
          reminder_lead_days: number | null
          schedule_id: string | null
          scheduled_dates: number | null
          status: string | null
          tax_type: string | null
          tax_year: number | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_schedules_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_schedules_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "v_commitment_summary"
            referencedColumns: ["commitment_id"]
          },
          {
            foreignKeyName: "tax_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "tax_schedules_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "operational_obligations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_schedules_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "v_operational_obligation_summary"
            referencedColumns: ["obligation_id"]
          },
          {
            foreignKeyName: "tax_schedules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_schedules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "tax_schedules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "tax_schedules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
        ]
      }
      v_tenant_concentration: {
        Row: {
          annual_rent: number | null
          company_id: string | null
          lease_count: number | null
          rent_share_pct: number | null
          tenant_id: string | null
          tenant_name: string | null
          unit_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
        ]
      }
      v_unit_occupancy: {
        Row: {
          area_m2: number | null
          company_id: string | null
          lease_id: string | null
          marketing_status: string | null
          occupancy_status: string | null
          property_id: string | null
          property_name: string | null
          status_since: string | null
          target_occupation_date: string | null
          target_rent: number | null
          tenant_id: string | null
          tenant_name: string | null
          unit_code: string | null
          unit_id: string | null
          unit_name: string | null
          vacancy_id: string | null
          vacancy_start: string | null
        }
        Relationships: [
          {
            foreignKeyName: "occupancy_history_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "lease_reminders"
            referencedColumns: ["lease_id"]
          },
          {
            foreignKeyName: "occupancy_history_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occupancy_history_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "v_lease_summary"
            referencedColumns: ["lease_id"]
          },
          {
            foreignKeyName: "occupancy_history_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "v_rent_roll"
            referencedColumns: ["lease_id"]
          },
          {
            foreignKeyName: "occupancy_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occupancy_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_rent_roll"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "occupancy_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_tenant_concentration"
            referencedColumns: ["tenant_id"]
          },
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
      v_utility_contract_summary: {
        Row: {
          account_number: string | null
          activation_date: string | null
          archived_at: string | null
          authorised_amount: number | null
          code: string | null
          commitment_approval_status: string | null
          commitment_currency: string | null
          commitment_id: string | null
          commitment_status: string | null
          committed_amount: number | null
          company_id: string | null
          contract_id: string | null
          counterparty_id: string | null
          counterparty_name: string | null
          created_at: string | null
          invoiced_amount: number | null
          meter_identifier: string | null
          notes: string | null
          obligation_id: string | null
          paid_amount: number | null
          property_id: string | null
          property_name: string | null
          remaining_commitment: number | null
          reminder_lead_days: number | null
          service_address: string | null
          status: string | null
          termination_date: string | null
          title: string | null
          unit_id: string | null
          updated_at: string | null
          utility_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "utility_contracts_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utility_contracts_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "v_commitment_summary"
            referencedColumns: ["commitment_id"]
          },
          {
            foreignKeyName: "utility_contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utility_contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "v_bookkeeping_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "utility_contracts_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utility_contracts_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "operational_obligations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utility_contracts_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "v_operational_obligation_summary"
            referencedColumns: ["obligation_id"]
          },
          {
            foreignKeyName: "utility_contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utility_contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_acquisition_totals"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "utility_contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_occupancy"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "utility_contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_summary"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "utility_contracts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utility_contracts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "v_unit_occupancy"
            referencedColumns: ["unit_id"]
          },
        ]
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
      activate_lease_version: {
        Args: { p_version_id: string }
        Returns: undefined
      }
      add_closing_condition: {
        Args: {
          _category?: string
          _closing_id: string
          _description?: string
          _due_date?: string
          _is_blocking?: boolean
          _owner_id?: string
          _responsible_party?: string
          _sort_order?: number
          _title: string
        }
        Returns: string
      }
      add_closing_handover_task: {
        Args: {
          _category?: string
          _closing_id: string
          _description?: string
          _due_date?: string
          _owner_id?: string
          _sort_order?: number
          _title: string
        }
        Returns: string
      }
      add_due_diligence_item: {
        Args: {
          _assignee_id?: string
          _case_id: string
          _description?: string
          _due_date?: string
          _is_blocking?: boolean
          _section?: string
          _sort_order?: number
          _title: string
        }
        Returns: string
      }
      add_due_diligence_template_item: {
        Args: {
          _description?: string
          _is_blocking?: boolean
          _section?: string
          _sort_order?: number
          _template_id: string
          _title: string
        }
        Returns: string
      }
      add_payment_instruction: {
        Args: {
          _bank_account_id?: string
          _document_id: string
          _payment_method?: string
          _payment_reference?: string
          _run_id: string
        }
        Returns: string
      }
      add_tax_schedule_date: {
        Args: {
          _due_date: string
          _label?: string
          _notes?: string
          _reminder_date?: string
          _schedule_id: string
        }
        Returns: string
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
      apply_lease_review: { Args: { p_review_id: string }; Returns: string }
      approval_activate_stage: {
        Args: { _request_id: string }
        Returns: undefined
      }
      approval_advance: {
        Args: { _actor: string; _request_id: string }
        Returns: undefined
      }
      approval_cb_budget_version_granted: {
        Args: { _request_id: string; _target_id: string }
        Returns: undefined
      }
      approval_cb_budget_version_rejected: {
        Args: { _request_id: string; _target_id: string }
        Returns: undefined
      }
      approval_cb_budget_version_released: {
        Args: { _request_id: string; _target_id: string }
        Returns: undefined
      }
      approval_cb_commitment_granted: {
        Args: { _request_id: string; _target_id: string }
        Returns: undefined
      }
      approval_cb_commitment_rejected: {
        Args: { _request_id: string; _target_id: string }
        Returns: undefined
      }
      approval_cb_commitment_released: {
        Args: { _request_id: string; _target_id: string }
        Returns: undefined
      }
      approval_cb_commitment_variance_granted: {
        Args: { _request_id: string; _target_id: string }
        Returns: undefined
      }
      approval_cb_payment_run_granted: {
        Args: { _request_id: string; _target_id: string }
        Returns: undefined
      }
      approval_cb_payment_run_rejected: {
        Args: { _request_id: string; _target_id: string }
        Returns: undefined
      }
      approval_cb_payment_run_released: {
        Args: { _request_id: string; _target_id: string }
        Returns: undefined
      }
      approval_finalise: {
        Args: {
          _actor: string
          _decision: string
          _reason: string
          _request_id: string
        }
        Returns: undefined
      }
      approval_run_callback: {
        Args: { _event: string; _request_id: string }
        Returns: string
      }
      approval_step_applies: {
        Args: { _amount: number; _max: number; _min: number }
        Returns: boolean
      }
      approval_step_approvers: {
        Args: { _request_id: string; _step_id: string }
        Returns: {
          user_id: string
        }[]
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
      archive_acquisition_opportunity: {
        Args: { _opportunity_id: string; _reason?: string }
        Returns: undefined
      }
      archive_approval_workflow: {
        Args: { _reason?: string; _workflow_id: string }
        Returns: undefined
      }
      archive_budget: {
        Args: { _budget_id: string; _reason?: string }
        Returns: undefined
      }
      archive_budget_version: {
        Args: { _reason?: string; _version_id: string }
        Returns: undefined
      }
      archive_closing_case: {
        Args: { _closing_id: string; _reason?: string }
        Returns: undefined
      }
      archive_due_diligence_case: {
        Args: { _case_id: string; _reason?: string }
        Returns: undefined
      }
      archive_due_diligence_template: {
        Args: { _template_id: string }
        Returns: undefined
      }
      archive_lease: {
        Args: { p_lease_id: string; p_reason?: string }
        Returns: undefined
      }
      archive_maintenance_schedule: {
        Args: { _reason?: string; _schedule_id: string }
        Returns: undefined
      }
      archive_operational_record: {
        Args: { _entity_id: string; _entity_type: string; _reason: string }
        Returns: undefined
      }
      archive_payment_run: {
        Args: { _reason?: string; _run_id: string }
        Returns: undefined
      }
      archive_tenant_record: {
        Args: { p_reason?: string; p_tenant_id: string }
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
      can_override_approval: { Args: { _company_id: string }; Returns: boolean }
      can_record_company: { Args: { _company_id: string }; Returns: boolean }
      can_view_company: { Args: { _company_id: string }; Returns: boolean }
      cancel_closing_case: {
        Args: { _closing_id: string; _reason: string }
        Returns: undefined
      }
      cancel_commitment: {
        Args: { _commitment_id: string; _reason: string }
        Returns: undefined
      }
      cancel_payment_run: {
        Args: { _reason: string; _run_id: string }
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
      closing_readiness: {
        Args: { _closing_id: string }
        Returns: {
          blocking_outstanding: number
          diligence_linked: boolean
          diligence_ready: boolean
          failed_conditions: number
          is_ready: boolean
        }[]
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
      complete_closing_case: {
        Args: {
          _actual_completion_date?: string
          _closing_id: string
          _deed_date?: string
          _notes?: string
          _possession_date?: string
        }
        Returns: undefined
      }
      complete_commitment: {
        Args: { _commitment_id: string; _notes?: string }
        Returns: undefined
      }
      complete_due_diligence_case: {
        Args: {
          _case_id: string
          _recommendation: string
          _recommendation_notes?: string
          _summary?: string
        }
        Returns: undefined
      }
      complete_payment_run: {
        Args: { _notes?: string; _run_id: string }
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
      create_acquisition_commitment: {
        Args: {
          _authorised_amount?: number
          _commitment_type?: string
          _counterparty_id?: string
          _end_date?: string
          _notes?: string
          _opportunity_id: string
          _start_date?: string
          _title: string
        }
        Returns: string
      }
      create_acquisition_opportunity: {
        Args: {
          _address?: string
          _asking_price?: number
          _assigned_to?: string
          _broker_id?: string
          _company_id: string
          _contact_email?: string
          _contact_name?: string
          _contact_phone?: string
          _currency?: string
          _expected_closing_date?: string
          _indicative_offer?: number
          _link_kind?: string
          _location?: string
          _notes?: string
          _opportunity_type?: string
          _probability?: number
          _property_id?: string
          _property_name?: string
          _reference?: string
          _seller_id?: string
          _source?: string
          _target_acquisition_date?: string
          _title: string
          _valuation_amount?: number
        }
        Returns: string
      }
      create_acquisition_task: {
        Args: {
          _assignee_id?: string
          _description: string
          _due_date?: string
          _opportunity_id: string
          _priority?: string
          _reminder_at?: string
        }
        Returns: string
      }
      create_approval_workflow: {
        Args: {
          _code: string
          _company_id: string
          _description?: string
          _name: string
          _target_type: string
        }
        Returns: string
      }
      create_approval_workflow_version: {
        Args: {
          _copy_from?: string
          _escalation_hours?: number
          _expiry_hours?: number
          _notes?: string
          _reminder_hours?: number
          _workflow_id: string
        }
        Returns: string
      }
      create_budget: {
        Args: {
          _code?: string
          _company_id: string
          _currency?: string
          _fiscal_year: number
          _name: string
          _notes?: string
          _project_id?: string
          _property_id?: string
          _unit_id?: string
        }
        Returns: string
      }
      create_budget_version: {
        Args: {
          _budget_id: string
          _copy_from_version_id?: string
          _reason?: string
        }
        Returns: string
      }
      create_closing_case: {
        Args: {
          _agreed_price?: number
          _due_diligence_case_id?: string
          _opportunity_id: string
          _reference?: string
          _target_completion_date?: string
          _title?: string
        }
        Returns: string
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
      create_due_diligence_case: {
        Args: {
          _assigned_to?: string
          _opportunity_id: string
          _reference?: string
          _target_date?: string
          _template_id?: string
          _title?: string
        }
        Returns: string
      }
      create_due_diligence_template: {
        Args: {
          _code?: string
          _company_id: string
          _deal_type?: string
          _description?: string
          _name: string
        }
        Returns: string
      }
      create_insurance_policy: {
        Args: {
          _broker_counterparty_id?: string
          _broker_name?: string
          _code?: string
          _commitment_id?: string
          _company_id: string
          _effective_date?: string
          _excess_amount?: number
          _expiry_date?: string
          _insured_assets?: string
          _insurer_counterparty_id?: string
          _insurer_name?: string
          _notes?: string
          _obligation_id?: string
          _policy_number?: string
          _policy_type?: string
          _property_id?: string
          _reminder_lead_days?: number
          _title: string
        }
        Returns: string
      }
      create_lease: { Args: { p: Json }; Returns: string }
      create_lease_version: { Args: { p: Json }; Returns: string }
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
      create_operational_commitment: {
        Args: {
          _authorised_amount: number
          _commitment_type: string
          _counterparty_id?: string
          _currency?: string
          _end_date?: string
          _entity_id: string
          _entity_type: string
          _notes?: string
          _start_date?: string
          _title: string
        }
        Returns: string
      }
      create_operational_obligation: {
        Args: {
          _code?: string
          _commitment_id?: string
          _company_id: string
          _counterparty_id?: string
          _description?: string
          _due_date?: string
          _notes?: string
          _obligation_type: string
          _priority?: string
          _property_id?: string
          _recurrence_end_date?: string
          _recurrence_frequency?: string
          _recurrence_interval?: number
          _reminder_lead_days?: number
          _responsible_name?: string
          _title: string
        }
        Returns: string
      }
      create_payment_run: {
        Args: {
          _company_id: string
          _description?: string
          _reference?: string
          _scheduled_execution_date?: string
          _title: string
        }
        Returns: string
      }
      create_property_from_closing: {
        Args: {
          _address_line1?: string
          _area_m2?: number
          _city?: string
          _closing_id: string
          _code?: string
          _district?: string
          _name?: string
          _notes?: string
          _postal_code?: string
          _property_type?: string
          _status?: string
        }
        Returns: string
      }
      create_service_contract: {
        Args: {
          _auto_renew?: boolean
          _code?: string
          _commitment_id?: string
          _company_id: string
          _contract_number?: string
          _counterparty_id?: string
          _end_date?: string
          _notes?: string
          _notice_period_days?: number
          _obligation_id?: string
          _property_id?: string
          _reminder_lead_days?: number
          _renewal_terms?: string
          _service_type?: string
          _start_date?: string
          _title: string
        }
        Returns: string
      }
      create_tax_schedule: {
        Args: {
          _code?: string
          _commitment_id?: string
          _company_id: string
          _due_dates?: string[]
          _jurisdiction?: string
          _notes?: string
          _obligation_id?: string
          _property_id?: string
          _reference?: string
          _reminder_lead_days?: number
          _tax_type?: string
          _tax_year?: number
          _title: string
        }
        Returns: string
      }
      create_utility_contract: {
        Args: {
          _account_number?: string
          _activation_date?: string
          _code?: string
          _commitment_id?: string
          _company_id: string
          _counterparty_id?: string
          _meter_identifier?: string
          _notes?: string
          _obligation_id?: string
          _property_id?: string
          _reminder_lead_days?: number
          _service_address?: string
          _termination_date?: string
          _title: string
          _unit_id?: string
          _utility_type?: string
        }
        Returns: string
      }
      current_company_id: { Args: never; Returns: string }
      decide_acquisition_offer: {
        Args: {
          _decided_on?: string
          _decision: string
          _notes?: string
          _offer_id: string
        }
        Returns: undefined
      }
      delete_approval_workflow_step: {
        Args: { _step_id: string }
        Returns: undefined
      }
      delete_budget_line: { Args: { _line_id: string }; Returns: undefined }
      due_diligence_permits_completion: {
        Args: { _case_id: string }
        Returns: boolean
      }
      ensure_default_approval_workflow: {
        Args: { _company_id: string; _target_type: string }
        Returns: string
      }
      execute_payment_run: {
        Args: { _execution_date?: string; _run_id: string }
        Returns: undefined
      }
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
      export_payment_run: {
        Args: {
          _batch_id?: string
          _content_hash?: string
          _file_name?: string
          _format: string
          _notes?: string
          _provider?: string
          _run_id: string
        }
        Returns: string
      }
      fail_payment_instruction: {
        Args: { _instruction_id: string; _reason: string }
        Returns: undefined
      }
      generate_company_cash_flow: {
        Args: { _company_id: string; _through: string }
        Returns: number
      }
      generate_lease_reminders: {
        Args: { p_company_id: string; p_horizon_days?: number }
        Returns: number
      }
      generate_maintenance_jobs: {
        Args: { _company_id: string; _horizon_months?: number }
        Returns: number
      }
      generate_operational_reminders: {
        Args: { _company_id: string }
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
      lease_assert_record: { Args: { _company_id: string }; Returns: undefined }
      link_acquisition_commitment: {
        Args: {
          _commitment_id: string
          _opportunity_id: string
          _reason?: string
        }
        Returns: string
      }
      link_operational_commitment: {
        Args: {
          _commitment_id: string
          _entity_id: string
          _entity_type: string
        }
        Returns: undefined
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
      mark_closing_ready: { Args: { _closing_id: string }; Returns: undefined }
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
      move_acquisition_stage: {
        Args: {
          _opportunity_id: string
          _probability?: number
          _reason?: string
          _stage: string
        }
        Returns: string
      }
      next_operational_due_date: {
        Args: { _due: string; _frequency: string; _interval: number }
        Returns: string
      }
      operational_table_for: { Args: { _entity_type: string }; Returns: string }
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
      publish_approval_workflow_version: {
        Args: { _version_id: string }
        Returns: string
      }
      publish_budget_version: {
        Args: { _version_id: string }
        Returns: undefined
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
      record_acquisition_activity: {
        Args: {
          _activity_type: string
          _body?: string
          _occurred_at?: string
          _opportunity_id: string
          _summary: string
        }
        Returns: string
      }
      record_acquisition_offer: {
        Args: {
          _amount: number
          _expires_on?: string
          _negotiation_notes?: string
          _opportunity_id: string
          _submitted_on?: string
        }
        Returns: string
      }
      record_acquisition_valuation: {
        Args: {
          _comments?: string
          _estimated_value: number
          _method?: string
          _opportunity_id: string
          _valued_on?: string
        }
        Returns: string
      }
      record_approval_decision: {
        Args: {
          _decision: string
          _delegate_to?: string
          _evidence_document_id?: string
          _override_reason?: string
          _reason?: string
          _request_id: string
          _step_id?: string
        }
        Returns: string
      }
      record_inspection_evidence: {
        Args: {
          _document_id?: string
          _finding: string
          _job_id: string
          _notes?: string
          _outcome?: string
        }
        Returns: string
      }
      record_lease_notice: { Args: { p: Json }; Returns: string }
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
      remove_payment_instruction: {
        Args: { _instruction_id: string }
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
      request_budget_version_approval: {
        Args: { _reason?: string; _version_id: string }
        Returns: string
      }
      request_commitment_approval: {
        Args: { _commitment_id: string; _reason?: string }
        Returns: string
      }
      request_payment_run_approval: {
        Args: { _reason?: string; _run_id: string }
        Returns: string
      }
      resolve_operational_reminder: {
        Args: { _notes?: string; _reminder_id: string; _status?: string }
        Returns: undefined
      }
      restore_acquisition_opportunity: {
        Args: { _opportunity_id: string }
        Returns: undefined
      }
      restore_closing_case: {
        Args: { _closing_id: string }
        Returns: undefined
      }
      restore_due_diligence_case: {
        Args: { _case_id: string }
        Returns: undefined
      }
      retry_approval_callback: {
        Args: { _request_id: string }
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
      run_approval_maintenance: { Args: { _company_id: string }; Returns: Json }
      seed_company_dimensions: {
        Args: { _company_id: string }
        Returns: undefined
      }
      seed_company_scenarios: {
        Args: { _company_id: string }
        Returns: undefined
      }
      set_acquisition_task_status: {
        Args: { _reason?: string; _status: string; _task_id: string }
        Returns: undefined
      }
      set_approval_step_assignment: {
        Args: {
          _assignee_type: string
          _candidate_source?: string
          _capability?: string
          _remove_id?: string
          _role?: string
          _step_id: string
          _user_id?: string
        }
        Returns: string
      }
      set_closing_condition_status: {
        Args: {
          _condition_id: string
          _notes?: string
          _status: string
          _waiver_reason?: string
        }
        Returns: undefined
      }
      set_closing_handover_task_status: {
        Args: { _notes?: string; _status: string; _task_id: string }
        Returns: undefined
      }
      set_due_diligence_case_status: {
        Args: { _case_id: string; _reason?: string; _status: string }
        Returns: string
      }
      set_due_diligence_item_status: {
        Args: {
          _findings?: string
          _item_id: string
          _risk_level?: string
          _status: string
          _waiver_reason?: string
        }
        Returns: undefined
      }
      set_lease_charges: {
        Args: { p_charges: Json; p_version_id: string }
        Returns: undefined
      }
      set_lease_tenants: {
        Args: { p_tenants: Json; p_version_id: string }
        Returns: undefined
      }
      set_lease_units: {
        Args: { p_units: Json; p_version_id: string }
        Returns: undefined
      }
      set_unit_occupancy: { Args: { p: Json }; Returns: string }
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
      submit_approval_request: {
        Args: {
          _amount?: number
          _candidates?: Json
          _company_id: string
          _reason?: string
          _rule_reference?: string
          _snapshot?: Json
          _target_id: string
          _target_label?: string
          _target_type: string
          _threshold_amount?: number
          _workflow_id?: string
        }
        Returns: string
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
      terminate_lease: { Args: { p: Json }; Returns: undefined }
      unlink_acquisition_commitment: {
        Args: { _link_id: string }
        Returns: undefined
      }
      update_acquisition_opportunity: {
        Args: {
          _address?: string
          _asking_price?: number
          _assigned_to?: string
          _broker_id?: string
          _contact_email?: string
          _contact_name?: string
          _contact_phone?: string
          _expected_closing_date?: string
          _indicative_offer?: number
          _link_kind?: string
          _location?: string
          _notes?: string
          _opportunity_id: string
          _opportunity_type?: string
          _probability?: number
          _property_id?: string
          _property_name?: string
          _seller_id?: string
          _source?: string
          _target_acquisition_date?: string
          _title?: string
          _valuation_amount?: number
        }
        Returns: undefined
      }
      update_budget: {
        Args: {
          _budget_id: string
          _code?: string
          _currency?: string
          _fiscal_year?: number
          _name?: string
          _notes?: string
          _project_id?: string
          _property_id?: string
          _status?: string
          _unit_id?: string
        }
        Returns: undefined
      }
      update_closing_case: {
        Args: {
          _agreed_price?: number
          _closing_id: string
          _commitment_id?: string
          _deed_date?: string
          _due_diligence_case_id?: string
          _notary_name?: string
          _notary_reference?: string
          _notes?: string
          _possession_date?: string
          _target_completion_date?: string
          _title?: string
        }
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
      update_due_diligence_case: {
        Args: {
          _assigned_to?: string
          _case_id: string
          _summary?: string
          _target_date?: string
          _title?: string
        }
        Returns: undefined
      }
      update_insurance_policy: {
        Args: {
          _broker_counterparty_id?: string
          _broker_name?: string
          _effective_date?: string
          _excess_amount?: number
          _expiry_date?: string
          _insured_assets?: string
          _insurer_counterparty_id?: string
          _insurer_name?: string
          _notes?: string
          _obligation_id?: string
          _policy_id: string
          _policy_number?: string
          _policy_type?: string
          _property_id?: string
          _reminder_lead_days?: number
          _status?: string
          _title?: string
        }
        Returns: undefined
      }
      update_lease: { Args: { p: Json }; Returns: undefined }
      update_lease_version: { Args: { p: Json }; Returns: undefined }
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
      update_operational_obligation: {
        Args: {
          _counterparty_id?: string
          _description?: string
          _due_date?: string
          _notes?: string
          _obligation_id: string
          _obligation_type?: string
          _priority?: string
          _property_id?: string
          _recurrence_end_date?: string
          _recurrence_frequency?: string
          _recurrence_interval?: number
          _reminder_lead_days?: number
          _responsible_name?: string
          _status?: string
          _title?: string
        }
        Returns: undefined
      }
      update_payment_instruction: {
        Args: {
          _bank_account_id?: string
          _instruction_id: string
          _notes?: string
          _payment_method?: string
          _payment_reference?: string
        }
        Returns: undefined
      }
      update_payment_run: {
        Args: {
          _description?: string
          _notes?: string
          _run_id: string
          _scheduled_execution_date?: string
          _title?: string
        }
        Returns: undefined
      }
      update_service_contract: {
        Args: {
          _auto_renew?: boolean
          _contract_id: string
          _contract_number?: string
          _counterparty_id?: string
          _end_date?: string
          _notes?: string
          _notice_period_days?: number
          _obligation_id?: string
          _reminder_lead_days?: number
          _renewal_terms?: string
          _service_type?: string
          _start_date?: string
          _status?: string
          _title?: string
        }
        Returns: undefined
      }
      update_tax_schedule: {
        Args: {
          _jurisdiction?: string
          _notes?: string
          _obligation_id?: string
          _property_id?: string
          _reference?: string
          _reminder_lead_days?: number
          _schedule_id: string
          _status?: string
          _tax_type?: string
          _tax_year?: number
          _title?: string
        }
        Returns: undefined
      }
      update_utility_contract: {
        Args: {
          _account_number?: string
          _activation_date?: string
          _contract_id: string
          _counterparty_id?: string
          _meter_identifier?: string
          _notes?: string
          _obligation_id?: string
          _property_id?: string
          _reminder_lead_days?: number
          _service_address?: string
          _status?: string
          _termination_date?: string
          _title?: string
          _unit_id?: string
          _utility_type?: string
        }
        Returns: undefined
      }
      update_vacancy_period: { Args: { p: Json }; Returns: undefined }
      upsert_approval_workflow_step: {
        Args: {
          _allow_self_approval?: boolean
          _incompatible_with_step_no?: number
          _max_amount?: number
          _min_amount?: number
          _name: string
          _quorum_count?: number
          _restrict_creator?: boolean
          _rule?: string
          _step_id?: string
          _step_no: number
          _version_id: string
        }
        Returns: string
      }
      upsert_budget_line: {
        Args: {
          _dimension_id?: string
          _dimension_value_id?: string
          _direction?: string
          _label: string
          _line_id?: string
          _line_no?: number
          _notes?: string
          _period_month?: number
          _planned_amount: number
          _project_id?: string
          _property_id?: string
          _unit_id?: string
          _version_id: string
        }
        Returns: string
      }
      upsert_lease_break: { Args: { p: Json }; Returns: string }
      upsert_lease_review: { Args: { p: Json }; Returns: string }
      upsert_maintenance_schedule: {
        Args: {
          _asset_label?: string
          _company_id: string
          _counterparty_id?: string
          _description?: string
          _end_date?: string
          _frequency?: string
          _interval_days?: number
          _is_active?: boolean
          _lead_time_days?: number
          _notes?: string
          _priority?: string
          _property_id?: string
          _responsible_name?: string
          _schedule_id?: string
          _schedule_kind?: string
          _start_date?: string
          _title: string
          _unit_id?: string
        }
        Returns: string
      }
      upsert_operational_reminder: {
        Args: {
          _company_id: string
          _due_on?: string
          _entity_id: string
          _entity_type: string
          _notes?: string
          _reason: string
          _remind_on: string
          _severity?: string
          _title?: string
        }
        Returns: string
      }
      upsert_tenant_contact: { Args: { p: Json }; Returns: string }
      upsert_tenant_record: { Args: { p: Json }; Returns: string }
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
      withdraw_approval_request: {
        Args: { _reason?: string; _request_id: string }
        Returns: undefined
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
