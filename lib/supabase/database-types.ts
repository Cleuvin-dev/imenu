/**
 * Gerado a partir do schema do projeto Supabase `imenu-dev` (Fase 1).
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
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
    };
    Enums: {
      member_role: "owner" | "manager" | "menu_editor" | "kitchen" | "cashier" | "viewer";
      platform_role: "super_admin" | "platform_admin" | "platform_support";
      suspension_reason: "overdue" | "manual" | "fraud" | "contract_end" | "other";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
