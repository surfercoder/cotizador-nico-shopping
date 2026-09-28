/**
 * Tipos generados desde el schema de Supabase.
 * Regenerar despues de cada migracion:
 *   npx supabase gen types typescript --project-id vqjbzuenmmoeguslqqyf > src/types/database.ts
 * (o pedirle al MCP de Supabase `generate_typescript_types`).
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      catalog_credentials: {
        Row: {
          catalog_id: string
          password_secret_id: string
          updated_at: string
          updated_by: string | null
          username: string
        }
        Insert: {
          catalog_id: string
          password_secret_id: string
          updated_at?: string
          updated_by?: string | null
          username: string
        }
        Update: {
          catalog_id?: string
          password_secret_id?: string
          updated_at?: string
          updated_by?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_credentials_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: true
            referencedRelation: "catalogs"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogs: {
        Row: {
          brands: string[]
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          requires_auth: boolean
          slug: string
          updated_at: string
          url: string
        }
        Insert: {
          brands?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          requires_auth?: boolean
          slug: string
          updated_at?: string
          url: string
        }
        Update: {
          brands?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          requires_auth?: boolean
          slug?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      platform_credentials: {
        Row: {
          password_secret_id: string
          platform_id: string
          updated_at: string
          updated_by: string | null
          username: string
        }
        Insert: {
          password_secret_id: string
          platform_id: string
          updated_at?: string
          updated_by?: string | null
          username: string
        }
        Update: {
          password_secret_id?: string
          platform_id?: string
          updated_at?: string
          updated_by?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_credentials_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: true
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      platforms: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          last_sync_error: string | null
          login_url: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          last_sync_error?: string | null
          login_url: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          last_sync_error?: string | null
          login_url?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string
          id: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          anio: string | null
          cant_piezas: number | null
          compania: string | null
          detail: Json | null
          detail_synced_at: string | null
          es_asegurado: boolean | null
          estado: string | null
          external_id: string
          fecha_pedido: string | null
          fecha_vencimiento: string | null
          first_seen_at: string
          id: string
          nro_siniestro: string | null
          patente: string | null
          perito: string | null
          platform_id: string
          provincia: string | null
          raw: Json
          tiene_piezas: boolean | null
          synced_at: string
          vehiculo: string | null
          vin: string | null
          zona: string | null
        }
        Insert: {
          anio?: string | null
          cant_piezas?: number | null
          compania?: string | null
          detail?: Json | null
          detail_synced_at?: string | null
          es_asegurado?: boolean | null
          estado?: string | null
          external_id: string
          fecha_pedido?: string | null
          fecha_vencimiento?: string | null
          first_seen_at?: string
          id?: string
          nro_siniestro?: string | null
          patente?: string | null
          perito?: string | null
          platform_id: string
          provincia?: string | null
          raw: Json
          tiene_piezas?: boolean | null
          synced_at?: string
          vehiculo?: string | null
          vin?: string | null
          zona?: string | null
        }
        Update: {
          anio?: string | null
          cant_piezas?: number | null
          compania?: string | null
          detail?: Json | null
          detail_synced_at?: string | null
          es_asegurado?: boolean | null
          estado?: string | null
          external_id?: string
          fecha_pedido?: string | null
          fecha_vencimiento?: string | null
          first_seen_at?: string
          id?: string
          nro_siniestro?: string | null
          patente?: string | null
          perito?: string | null
          platform_id?: string
          provincia?: string | null
          raw?: Json
          tiene_piezas?: boolean | null
          synced_at?: string
          vehiculo?: string | null
          vin?: string | null
          zona?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      catalog_credentials_status: {
        Args: never
        Returns: {
          catalog_id: string
          updated_at: string
          username: string
        }[]
      }
      get_catalog_credentials: {
        Args: { p_catalog_id: string }
        Returns: {
          password: string
          username: string
        }[]
      }
      get_platform_credentials: {
        Args: { p_platform_id: string }
        Returns: {
          password: string
          username: string
        }[]
      }
      platform_credentials_status: {
        Args: never
        Returns: {
          platform_id: string
          updated_at: string
          username: string
        }[]
      }
      set_catalog_credentials: {
        Args: { p_catalog_id: string; p_password: string; p_username: string }
        Returns: undefined
      }
      set_platform_credentials: {
        Args: { p_password: string; p_platform_id: string; p_username: string }
        Returns: undefined
      }
    }
    Enums: {
      user_role: "admin" | "supervisor" | "operador"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["admin", "supervisor", "operador"],
    },
  },
} as const
