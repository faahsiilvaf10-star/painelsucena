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
      attendance_records: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          date: string
          employee_id: string
          id: string
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          employee_id: string
          id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_report_locks: {
        Row: {
          created_at: string
          date: string
          id: string
          locked_at: string
          locked_by: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          locked_at?: string
          locked_by: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          locked_at?: string
          locked_by?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          read_at: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          read_at?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      dds_schedule: {
        Row: {
          created_at: string
          created_by: string
          id: string
          month_year: string
          photo_url: string | null
          presenter_user_id: string
          scheduled_date: string
          theme: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          month_year: string
          photo_url?: string | null
          presenter_user_id: string
          scheduled_date: string
          theme: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          month_year?: string
          photo_url?: string | null
          presenter_user_id?: string
          scheduled_date?: string
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          avatar: string
          created_at: string
          department: string
          email: string | null
          exam_scheduled: string | null
          id: string
          name: string
          nrs: string[] | null
          phone: string | null
          role: string
          start_date: string
          status: Database["public"]["Enums"]["employee_status"]
          updated_at: string
          vacation_due_date: string | null
        }
        Insert: {
          avatar: string
          created_at?: string
          department: string
          email?: string | null
          exam_scheduled?: string | null
          id?: string
          name: string
          nrs?: string[] | null
          phone?: string | null
          role: string
          start_date?: string
          status?: Database["public"]["Enums"]["employee_status"]
          updated_at?: string
          vacation_due_date?: string | null
        }
        Update: {
          avatar?: string
          created_at?: string
          department?: string
          email?: string | null
          exam_scheduled?: string | null
          id?: string
          name?: string
          nrs?: string[] | null
          phone?: string | null
          role?: string
          start_date?: string
          status?: Database["public"]["Enums"]["employee_status"]
          updated_at?: string
          vacation_due_date?: string | null
        }
        Relationships: []
      }
      equipment: {
        Row: {
          created_at: string
          driver: string
          end_hour: number
          equipment_type: string
          helper: string
          id: string
          name: string
          plate: string
          start_hour: number
          stop_reason: string | null
          stop_start_time: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          driver: string
          end_hour?: number
          equipment_type?: string
          helper: string
          id?: string
          name: string
          plate: string
          start_hour?: number
          stop_reason?: string | null
          stop_start_time?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          driver?: string
          end_hour?: number
          equipment_type?: string
          helper?: string
          id?: string
          name?: string
          plate?: string
          start_hour?: number
          stop_reason?: string | null
          stop_start_time?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      equipment_stop_history: {
        Row: {
          created_at: string
          duration_minutes: number | null
          ended_at: string | null
          equipment_id: string
          id: string
          started_at: string
          stop_reason: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          equipment_id: string
          id?: string
          started_at: string
          stop_reason: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          equipment_id?: string
          id?: string
          started_at?: string
          stop_reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_stop_history_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          ca_expiry: string | null
          ca_number: string | null
          category: string
          created_at: string
          created_by: string
          id: string
          location_id: string | null
          min_quantity: number
          name: string
          notes: string | null
          quantity: number
          unit: string
          updated_at: string
        }
        Insert: {
          ca_expiry?: string | null
          ca_number?: string | null
          category?: string
          created_at?: string
          created_by: string
          id?: string
          location_id?: string | null
          min_quantity?: number
          name: string
          notes?: string | null
          quantity?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          ca_expiry?: string | null
          ca_number?: string | null
          category?: string
          created_at?: string
          created_by?: string
          id?: string
          location_id?: string | null
          min_quantity?: number
          name?: string
          notes?: string | null
          quantity?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          id: string
          item_id: string
          moved_by: string
          moved_by_name: string
          movement_type: string
          new_quantity: number
          previous_quantity: number
          quantity: number
          reason: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          moved_by: string
          moved_by_name: string
          movement_type: string
          new_quantity: number
          previous_quantity: number
          quantity: number
          reason?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          moved_by?: string
          moved_by_name?: string
          movement_type?: string
          new_quantity?: number
          previous_quantity?: number
          quantity?: number
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      matrix_task_completions: {
        Row: {
          completed_at: string
          created_at: string
          id: string
          month_year: string
          task_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          id?: string
          month_year: string
          task_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          id?: string
          month_year?: string
          task_id?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_history: {
        Row: {
          change_type: string | null
          changed_by: string
          changed_by_name: string
          created_at: string
          id: string
          new_quantity: number | null
          new_status: Database["public"]["Enums"]["order_status"]
          new_unit: string | null
          notes: string | null
          order_id: string
          previous_quantity: number | null
          previous_status: Database["public"]["Enums"]["order_status"] | null
          previous_unit: string | null
        }
        Insert: {
          change_type?: string | null
          changed_by: string
          changed_by_name: string
          created_at?: string
          id?: string
          new_quantity?: number | null
          new_status: Database["public"]["Enums"]["order_status"]
          new_unit?: string | null
          notes?: string | null
          order_id: string
          previous_quantity?: number | null
          previous_status?: Database["public"]["Enums"]["order_status"] | null
          previous_unit?: string | null
        }
        Update: {
          change_type?: string | null
          changed_by?: string
          changed_by_name?: string
          created_at?: string
          id?: string
          new_quantity?: number | null
          new_status?: Database["public"]["Enums"]["order_status"]
          new_unit?: string | null
          notes?: string | null
          order_id?: string
          previous_quantity?: number | null
          previous_status?: Database["public"]["Enums"]["order_status"] | null
          previous_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          ai_generated_image_url: string | null
          created_at: string
          description: string | null
          expected_date: string | null
          id: string
          mentioned_cargo: string | null
          mentioned_user_id: string | null
          notes: string | null
          order_number: string | null
          photo_urls: string[] | null
          product_name: string
          quantity: number
          quantity_unit: Database["public"]["Enums"]["quantity_unit"]
          requester_id: string
          requester_name: string
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
        }
        Insert: {
          ai_generated_image_url?: string | null
          created_at?: string
          description?: string | null
          expected_date?: string | null
          id?: string
          mentioned_cargo?: string | null
          mentioned_user_id?: string | null
          notes?: string | null
          order_number?: string | null
          photo_urls?: string[] | null
          product_name: string
          quantity: number
          quantity_unit?: Database["public"]["Enums"]["quantity_unit"]
          requester_id: string
          requester_name: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Update: {
          ai_generated_image_url?: string | null
          created_at?: string
          description?: string | null
          expected_date?: string | null
          id?: string
          mentioned_cargo?: string | null
          mentioned_user_id?: string | null
          notes?: string | null
          order_number?: string | null
          photo_urls?: string[] | null
          product_name?: string
          quantity?: number
          quantity_unit?: Database["public"]["Enums"]["quantity_unit"]
          requester_id?: string
          requester_name?: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cargo: Database["public"]["Enums"]["cargo_type"]
          created_at: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          cargo: Database["public"]["Enums"]["cargo_type"]
          created_at?: string
          full_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          cargo?: Database["public"]["Enums"]["cargo_type"]
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rdo_reports: {
        Row: {
          created_at: string
          created_by: string
          difficulties: string | null
          gabiao_activities: string | null
          gabiao_location: string | null
          id: string
          jardinagem_activities: string | null
          jardinagem_location: string | null
          photo_urls: string[] | null
          report_date: string
          report_text: string
          updated_at: string
          weather_afternoon: string
          weather_morning: string
        }
        Insert: {
          created_at?: string
          created_by: string
          difficulties?: string | null
          gabiao_activities?: string | null
          gabiao_location?: string | null
          id?: string
          jardinagem_activities?: string | null
          jardinagem_location?: string | null
          photo_urls?: string[] | null
          report_date: string
          report_text: string
          updated_at?: string
          weather_afternoon?: string
          weather_morning?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          difficulties?: string | null
          gabiao_activities?: string | null
          gabiao_location?: string | null
          id?: string
          jardinagem_activities?: string | null
          jardinagem_location?: string | null
          photo_urls?: string[] | null
          report_date?: string
          report_text?: string
          updated_at?: string
          weather_afternoon?: string
          weather_morning?: string
        }
        Relationships: []
      }
      reminder_history: {
        Row: {
          action: string
          action_by: string
          created_at: string
          event_date: string
          id: string
          mention_type: string
          original_created_by: string
          reminder_description: string | null
          reminder_id: string
          reminder_title: string
        }
        Insert: {
          action: string
          action_by: string
          created_at?: string
          event_date: string
          id?: string
          mention_type: string
          original_created_by: string
          reminder_description?: string | null
          reminder_id: string
          reminder_title: string
        }
        Update: {
          action?: string
          action_by?: string
          created_at?: string
          event_date?: string
          id?: string
          mention_type?: string
          original_created_by?: string
          reminder_description?: string | null
          reminder_id?: string
          reminder_title?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          acknowledged_by: string[] | null
          alert_days_before: number | null
          created_at: string
          created_by: string
          description: string | null
          event_date: string
          id: string
          mention_type: string
          mentioned_users: string[] | null
          show_on_event_day: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          acknowledged_by?: string[] | null
          alert_days_before?: number | null
          created_at?: string
          created_by: string
          description?: string | null
          event_date: string
          id?: string
          mention_type: string
          mentioned_users?: string[] | null
          show_on_event_day?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          acknowledged_by?: string[] | null
          alert_days_before?: number | null
          created_at?: string
          created_by?: string
          description?: string | null
          event_date?: string
          id?: string
          mention_type?: string
          mentioned_users?: string[] | null
          show_on_event_day?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          logo_url: string | null
          nav_order: Json | null
          sidebar_color: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          logo_url?: string | null
          nav_order?: Json | null
          sidebar_color?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          logo_url?: string | null
          nav_order?: Json | null
          sidebar_color?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      storage_locations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          active_tab_color: string | null
          created_at: string
          id: string
          notification_sound: string | null
          page_background_color: string | null
          sidebar_color: string | null
          sidebar_font_color: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_tab_color?: string | null
          created_at?: string
          id?: string
          notification_sound?: string | null
          page_background_color?: string | null
          sidebar_color?: string | null
          sidebar_font_color?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_tab_color?: string | null
          created_at?: string
          id?: string
          notification_sound?: string | null
          page_background_color?: string | null
          sidebar_color?: string | null
          sidebar_font_color?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      attendance_status: "present" | "late" | "absent" | "justified"
      cargo_type:
        | "preposto"
        | "encarregado_geral"
        | "encarregado_i"
        | "encarregado_ii"
        | "tecnico_seguranca_i"
        | "tecnico_seguranca_ii"
        | "tecnico_meio_ambiente"
        | "aux_administrativo"
        | "aux_almoxarifado"
        | "planejador"
      employee_status: "active" | "vacation" | "leave"
      order_status:
        | "solicitado"
        | "aprovado"
        | "a_caminho"
        | "entregue"
        | "cancelado"
      quantity_unit:
        | "unidade"
        | "centimetros"
        | "metros"
        | "quilos"
        | "litros"
        | "pacotes"
        | "caixas"
        | "pecas"
        | "par"
        | "rolo"
        | "saco"
        | "galao"
        | "balde"
        | "metro_quadrado"
        | "metro_cubico"
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
      app_role: ["admin", "user"],
      attendance_status: ["present", "late", "absent", "justified"],
      cargo_type: [
        "preposto",
        "encarregado_geral",
        "encarregado_i",
        "encarregado_ii",
        "tecnico_seguranca_i",
        "tecnico_seguranca_ii",
        "tecnico_meio_ambiente",
        "aux_administrativo",
        "aux_almoxarifado",
        "planejador",
      ],
      employee_status: ["active", "vacation", "leave"],
      order_status: [
        "solicitado",
        "aprovado",
        "a_caminho",
        "entregue",
        "cancelado",
      ],
      quantity_unit: [
        "unidade",
        "centimetros",
        "metros",
        "quilos",
        "litros",
        "pacotes",
        "caixas",
        "pecas",
        "par",
        "rolo",
        "saco",
        "galao",
        "balde",
        "metro_quadrado",
        "metro_cubico",
      ],
    },
  },
} as const
