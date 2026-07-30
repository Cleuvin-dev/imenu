/**
 * Gerado a partir do schema do projeto Supabase `imenu-dev` (Fases 1-2).
 * Regenerar sempre que uma migração alterar tabelas, enums ou funções
 * expostas via RPC. Não editar manualmente.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          actor_scope: Database["public"]["Enums"]["audit_actor_scope"];
          actor_user_id: string | null;
          after_data: Json | null;
          before_data: Json | null;
          created_at: string;
          establishment_id: string | null;
          id: string;
          ip_hash: string | null;
          request_id: string | null;
          resource_id: string | null;
          resource_type: string;
        };
        Insert: {
          action: string;
          actor_scope: Database["public"]["Enums"]["audit_actor_scope"];
          actor_user_id?: string | null;
          after_data?: Json | null;
          before_data?: Json | null;
          created_at?: string;
          establishment_id?: string | null;
          id?: string;
          ip_hash?: string | null;
          request_id?: string | null;
          resource_id?: string | null;
          resource_type: string;
        };
        Update: {
          action?: string;
          actor_scope?: Database["public"]["Enums"]["audit_actor_scope"];
          actor_user_id?: string | null;
          after_data?: Json | null;
          before_data?: Json | null;
          created_at?: string;
          establishment_id?: string | null;
          id?: string;
          ip_hash?: string | null;
          request_id?: string | null;
          resource_id?: string | null;
          resource_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_user_id_fkey";
            columns: ["actor_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_logs_establishment_id_fkey";
            columns: ["establishment_id"];
            isOneToOne: false;
            referencedRelation: "establishments";
            referencedColumns: ["id"];
          },
        ];
      };
      establishment_members: {
        Row: {
          created_at: string;
          establishment_id: string;
          id: string;
          invited_by: string | null;
          is_active: boolean;
          role: Database["public"]["Enums"]["member_role"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          establishment_id: string;
          id?: string;
          invited_by?: string | null;
          is_active?: boolean;
          role: Database["public"]["Enums"]["member_role"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          establishment_id?: string;
          id?: string;
          invited_by?: string | null;
          is_active?: boolean;
          role?: Database["public"]["Enums"]["member_role"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "establishment_members_establishment_id_fkey";
            columns: ["establishment_id"];
            isOneToOne: false;
            referencedRelation: "establishments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "establishment_members_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "establishment_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      establishments: {
        Row: {
          accepting_orders: boolean;
          address_complement: string | null;
          address_line: string | null;
          address_number: string | null;
          city: string | null;
          cover_path: string | null;
          created_at: string;
          currency: string;
          document_number: string | null;
          email: string | null;
          id: string;
          is_active: boolean;
          legal_name: string;
          logo_path: string | null;
          manual_suspended_at: string | null;
          manual_suspension_reason: Database["public"]["Enums"]["suspension_reason"] | null;
          neighborhood: string | null;
          owner_contact_name: string | null;
          phone: string | null;
          postal_code: string | null;
          slug: string;
          state_code: string | null;
          timezone: string;
          trade_name: string;
          updated_at: string;
        };
        Insert: {
          accepting_orders?: boolean;
          address_complement?: string | null;
          address_line?: string | null;
          address_number?: string | null;
          city?: string | null;
          cover_path?: string | null;
          created_at?: string;
          currency?: string;
          document_number?: string | null;
          email?: string | null;
          id?: string;
          is_active?: boolean;
          legal_name: string;
          logo_path?: string | null;
          manual_suspended_at?: string | null;
          manual_suspension_reason?: Database["public"]["Enums"]["suspension_reason"] | null;
          neighborhood?: string | null;
          owner_contact_name?: string | null;
          phone?: string | null;
          postal_code?: string | null;
          slug: string;
          state_code?: string | null;
          timezone?: string;
          trade_name: string;
          updated_at?: string;
        };
        Update: {
          accepting_orders?: boolean;
          address_complement?: string | null;
          address_line?: string | null;
          address_number?: string | null;
          city?: string | null;
          cover_path?: string | null;
          created_at?: string;
          currency?: string;
          document_number?: string | null;
          email?: string | null;
          id?: string;
          is_active?: boolean;
          legal_name?: string;
          logo_path?: string | null;
          manual_suspended_at?: string | null;
          manual_suspension_reason?: Database["public"]["Enums"]["suspension_reason"] | null;
          neighborhood?: string | null;
          owner_contact_name?: string | null;
          phone?: string | null;
          postal_code?: string | null;
          slug?: string;
          state_code?: string | null;
          timezone?: string;
          trade_name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      invoices: {
        Row: {
          amount_cents: number;
          created_at: string;
          currency: string;
          due_at: string;
          establishment_id: string;
          external_reference: string | null;
          id: string;
          issued_at: string | null;
          paid_at: string | null;
          reference_period_end: string;
          reference_period_start: string;
          status: Database["public"]["Enums"]["invoice_status"];
          subscription_id: string;
          updated_at: string;
          voided_at: string | null;
        };
        Insert: {
          amount_cents: number;
          created_at?: string;
          currency?: string;
          due_at: string;
          establishment_id: string;
          external_reference?: string | null;
          id?: string;
          issued_at?: string | null;
          paid_at?: string | null;
          reference_period_end: string;
          reference_period_start: string;
          status?: Database["public"]["Enums"]["invoice_status"];
          subscription_id: string;
          updated_at?: string;
          voided_at?: string | null;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          currency?: string;
          due_at?: string;
          establishment_id?: string;
          external_reference?: string | null;
          id?: string;
          issued_at?: string | null;
          paid_at?: string | null;
          reference_period_end?: string;
          reference_period_start?: string;
          status?: Database["public"]["Enums"]["invoice_status"];
          subscription_id?: string;
          updated_at?: string;
          voided_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_establishment_id_fkey";
            columns: ["establishment_id"];
            isOneToOne: false;
            referencedRelation: "establishments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      member_invites: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          email: string;
          establishment_id: string;
          expires_at: string;
          id: string;
          invited_by: string;
          revoked_at: string | null;
          role: Database["public"]["Enums"]["member_role"];
          token_hash: string;
          updated_at: string;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          email: string;
          establishment_id: string;
          expires_at: string;
          id?: string;
          invited_by: string;
          revoked_at?: string | null;
          role: Database["public"]["Enums"]["member_role"];
          token_hash: string;
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          email?: string;
          establishment_id?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string;
          revoked_at?: string | null;
          role?: Database["public"]["Enums"]["member_role"];
          token_hash?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_invites_establishment_id_fkey";
            columns: ["establishment_id"];
            isOneToOne: false;
            referencedRelation: "establishments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_invites_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount_cents: number;
          created_at: string;
          establishment_id: string;
          id: string;
          invoice_id: string;
          method: Database["public"]["Enums"]["payment_method"];
          note: string | null;
          paid_at: string;
          recorded_by: string;
          reference: string | null;
          reversal_reason: string | null;
          reversed_at: string | null;
          reversed_by: string | null;
          status: Database["public"]["Enums"]["payment_status"];
          updated_at: string;
        };
        Insert: {
          amount_cents: number;
          created_at?: string;
          establishment_id: string;
          id?: string;
          invoice_id: string;
          method: Database["public"]["Enums"]["payment_method"];
          note?: string | null;
          paid_at: string;
          recorded_by: string;
          reference?: string | null;
          reversal_reason?: string | null;
          reversed_at?: string | null;
          reversed_by?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
          updated_at?: string;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          establishment_id?: string;
          id?: string;
          invoice_id?: string;
          method?: Database["public"]["Enums"]["payment_method"];
          note?: string | null;
          paid_at?: string;
          recorded_by?: string;
          reference?: string | null;
          reversal_reason?: string | null;
          reversed_at?: string | null;
          reversed_by?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_establishment_id_fkey";
            columns: ["establishment_id"];
            isOneToOne: false;
            referencedRelation: "establishments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_recorded_by_fkey";
            columns: ["recorded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_reversed_by_fkey";
            columns: ["reversed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      plans: {
        Row: {
          billing_interval_months: number;
          code: string;
          created_at: string;
          features: Json;
          id: string;
          is_active: boolean;
          limits: Json;
          name: string;
          price_cents: number;
          updated_at: string;
        };
        Insert: {
          billing_interval_months?: number;
          code: string;
          created_at?: string;
          features?: Json;
          id?: string;
          is_active?: boolean;
          limits?: Json;
          name: string;
          price_cents: number;
          updated_at?: string;
        };
        Update: {
          billing_interval_months?: number;
          code?: string;
          created_at?: string;
          features?: Json;
          id?: string;
          is_active?: boolean;
          limits?: Json;
          name?: string;
          price_cents?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      platform_admins: {
        Row: {
          created_at: string;
          created_by: string | null;
          is_active: boolean;
          role: Database["public"]["Enums"]["platform_role"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          is_active?: boolean;
          role: Database["public"]["Enums"]["platform_role"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          is_active?: boolean;
          role?: Database["public"]["Enums"]["platform_role"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "platform_admins_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "platform_admins_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          email: string;
          id: string;
          is_active: boolean;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          email: string;
          id: string;
          is_active?: boolean;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          email?: string;
          id?: string;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscription_events: {
        Row: {
          actor_user_id: string | null;
          created_at: string;
          establishment_id: string;
          event: string;
          from_status: Database["public"]["Enums"]["subscription_status"] | null;
          id: string;
          metadata: Json;
          reason: string | null;
          subscription_id: string;
          to_status: Database["public"]["Enums"]["subscription_status"];
        };
        Insert: {
          actor_user_id?: string | null;
          created_at?: string;
          establishment_id: string;
          event: string;
          from_status?: Database["public"]["Enums"]["subscription_status"] | null;
          id?: string;
          metadata?: Json;
          reason?: string | null;
          subscription_id: string;
          to_status: Database["public"]["Enums"]["subscription_status"];
        };
        Update: {
          actor_user_id?: string | null;
          created_at?: string;
          establishment_id?: string;
          event?: string;
          from_status?: Database["public"]["Enums"]["subscription_status"] | null;
          id?: string;
          metadata?: Json;
          reason?: string | null;
          subscription_id?: string;
          to_status?: Database["public"]["Enums"]["subscription_status"];
        };
        Relationships: [
          {
            foreignKeyName: "subscription_events_actor_user_id_fkey";
            columns: ["actor_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscription_events_establishment_id_fkey";
            columns: ["establishment_id"];
            isOneToOne: false;
            referencedRelation: "establishments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscription_events_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          billing_provider: string | null;
          canceled_at: string | null;
          created_at: string;
          current_period_end: string | null;
          current_period_start: string | null;
          establishment_id: string;
          external_customer_id: string | null;
          external_subscription_id: string | null;
          grace_until: string | null;
          id: string;
          plan_id: string;
          status: Database["public"]["Enums"]["subscription_status"];
          suspended_at: string | null;
          suspension_note: string | null;
          suspension_reason: Database["public"]["Enums"]["suspension_reason"] | null;
          trial_ends_at: string | null;
          updated_at: string;
          version: number;
        };
        Insert: {
          billing_provider?: string | null;
          canceled_at?: string | null;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          establishment_id: string;
          external_customer_id?: string | null;
          external_subscription_id?: string | null;
          grace_until?: string | null;
          id?: string;
          plan_id: string;
          status?: Database["public"]["Enums"]["subscription_status"];
          suspended_at?: string | null;
          suspension_note?: string | null;
          suspension_reason?: Database["public"]["Enums"]["suspension_reason"] | null;
          trial_ends_at?: string | null;
          updated_at?: string;
          version?: number;
        };
        Update: {
          billing_provider?: string | null;
          canceled_at?: string | null;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          establishment_id?: string;
          external_customer_id?: string | null;
          external_subscription_id?: string | null;
          grace_until?: string | null;
          id?: string;
          plan_id?: string;
          status?: Database["public"]["Enums"]["subscription_status"];
          suspended_at?: string | null;
          suspension_note?: string | null;
          suspension_reason?: Database["public"]["Enums"]["suspension_reason"] | null;
          trial_ends_at?: string | null;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_establishment_id_fkey";
            columns: ["establishment_id"];
            isOneToOne: true;
            referencedRelation: "establishments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      confirm_invoice_payment: {
        Args: {
          p_amount_cents: number;
          p_invoice_id: string;
          p_method: Database["public"]["Enums"]["payment_method"];
          p_note?: string;
          p_paid_at: string;
          p_reference?: string;
        };
        Returns: Json;
      };
      evaluate_establishment_access: {
        Args: { p_establishment_id: string };
        Returns: Json;
      };
      has_tenant_role: {
        Args: {
          allowed_roles: Database["public"]["Enums"]["member_role"][];
          target_establishment_id: string;
        };
        Returns: boolean;
      };
      is_active_member: {
        Args: { target_establishment_id: string };
        Returns: boolean;
      };
      is_platform_admin: {
        Args: { allowed_roles?: Database["public"]["Enums"]["platform_role"][] };
        Returns: boolean;
      };
      process_overdue_subscriptions: { Args: { p_now?: string }; Returns: Json };
      reverse_payment: {
        Args: { p_payment_id: string; p_reason: string };
        Returns: Json;
      };
    };
    Enums: {
      audit_actor_scope: "platform" | "establishment" | "system";
      invoice_status: "draft" | "open" | "paid" | "overdue" | "void";
      member_role: "owner" | "manager" | "menu_editor" | "kitchen" | "cashier" | "viewer";
      payment_method: "pix" | "boleto" | "transfer" | "cash" | "card" | "other";
      payment_status: "confirmed" | "reversed";
      platform_role: "super_admin" | "platform_admin" | "platform_support";
      subscription_status: "trialing" | "active" | "past_due" | "suspended" | "canceled";
      suspension_reason: "overdue" | "manual" | "fraud" | "contract_end" | "other";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
