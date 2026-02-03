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
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          image_url: string | null
          published_at: string | null
          scheduled_at: string | null
          target_type: string
          target_users: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          image_url?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          target_type?: string
          target_users?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          image_url?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          target_type?: string
          target_users?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
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
          area: string
          created_at: string
          date: string
          id: string
          locked_at: string
          locked_by: string
        }
        Insert: {
          area?: string
          created_at?: string
          date: string
          id?: string
          locked_at?: string
          locked_by: string
        }
        Update: {
          area?: string
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
      daily_gabiao_reports: {
        Row: {
          created_at: string
          created_by: string
          id: string
          limpeza_bueiro_berma: number | null
          limpeza_bueiro_unidade: number | null
          limpeza_canaleta_berma: number | null
          limpeza_canaleta_m: number | null
          local_servico: string
          manutencao_drenagem_berma: number | null
          manutencao_drenagem_m: number | null
          observacoes: string | null
          photo_urls: string[] | null
          recomposicao_gabiao_berma: number | null
          recomposicao_gabiao_m: number | null
          reparo_cerca_berma: number | null
          reparo_cerca_m: number | null
          report_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          limpeza_bueiro_berma?: number | null
          limpeza_bueiro_unidade?: number | null
          limpeza_canaleta_berma?: number | null
          limpeza_canaleta_m?: number | null
          local_servico: string
          manutencao_drenagem_berma?: number | null
          manutencao_drenagem_m?: number | null
          observacoes?: string | null
          photo_urls?: string[] | null
          recomposicao_gabiao_berma?: number | null
          recomposicao_gabiao_m?: number | null
          reparo_cerca_berma?: number | null
          reparo_cerca_m?: number | null
          report_date?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          limpeza_bueiro_berma?: number | null
          limpeza_bueiro_unidade?: number | null
          limpeza_canaleta_berma?: number | null
          limpeza_canaleta_m?: number | null
          local_servico?: string
          manutencao_drenagem_berma?: number | null
          manutencao_drenagem_m?: number | null
          observacoes?: string | null
          photo_urls?: string[] | null
          recomposicao_gabiao_berma?: number | null
          recomposicao_gabiao_m?: number | null
          reparo_cerca_berma?: number | null
          reparo_cerca_m?: number | null
          report_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_jardinagem_reports: {
        Row: {
          adubagem_berma: number | null
          adubagem_unidade: number | null
          atividades_manuais: string | null
          controle_invasoras_berma: number | null
          controle_invasoras_nome: string | null
          controle_invasoras_unidade: number | null
          coroamento_berma: number | null
          coroamento_unidade: number | null
          created_at: string
          created_by: string
          id: string
          irrigacao_carretel: boolean | null
          irrigacao_carretel_bermas: number[] | null
          irrigacao_pipas: boolean | null
          limpeza_assoprador_berma: number | null
          limpeza_assoprador_m2: number | null
          limpeza_manual_berma: number | null
          limpeza_manual_m2: number | null
          local_faixa: string
          manutencao_canteiro: string | null
          photo_urls: string[] | null
          plantio_berma: number | null
          plantio_grama_berma: number | null
          plantio_grama_faixa: string | null
          plantio_grama_m2: number | null
          plantio_unidade: number | null
          podagem_berma: number | null
          podagem_unidade: number | null
          report_date: string
          retirada_mudas_unidade: number | null
          rocagem_berma: number | null
          rocagem_faixa: string | null
          rocagem_m2: number | null
          updated_at: string
        }
        Insert: {
          adubagem_berma?: number | null
          adubagem_unidade?: number | null
          atividades_manuais?: string | null
          controle_invasoras_berma?: number | null
          controle_invasoras_nome?: string | null
          controle_invasoras_unidade?: number | null
          coroamento_berma?: number | null
          coroamento_unidade?: number | null
          created_at?: string
          created_by: string
          id?: string
          irrigacao_carretel?: boolean | null
          irrigacao_carretel_bermas?: number[] | null
          irrigacao_pipas?: boolean | null
          limpeza_assoprador_berma?: number | null
          limpeza_assoprador_m2?: number | null
          limpeza_manual_berma?: number | null
          limpeza_manual_m2?: number | null
          local_faixa: string
          manutencao_canteiro?: string | null
          photo_urls?: string[] | null
          plantio_berma?: number | null
          plantio_grama_berma?: number | null
          plantio_grama_faixa?: string | null
          plantio_grama_m2?: number | null
          plantio_unidade?: number | null
          podagem_berma?: number | null
          podagem_unidade?: number | null
          report_date?: string
          retirada_mudas_unidade?: number | null
          rocagem_berma?: number | null
          rocagem_faixa?: string | null
          rocagem_m2?: number | null
          updated_at?: string
        }
        Update: {
          adubagem_berma?: number | null
          adubagem_unidade?: number | null
          atividades_manuais?: string | null
          controle_invasoras_berma?: number | null
          controle_invasoras_nome?: string | null
          controle_invasoras_unidade?: number | null
          coroamento_berma?: number | null
          coroamento_unidade?: number | null
          created_at?: string
          created_by?: string
          id?: string
          irrigacao_carretel?: boolean | null
          irrigacao_carretel_bermas?: number[] | null
          irrigacao_pipas?: boolean | null
          limpeza_assoprador_berma?: number | null
          limpeza_assoprador_m2?: number | null
          limpeza_manual_berma?: number | null
          limpeza_manual_m2?: number | null
          local_faixa?: string
          manutencao_canteiro?: string | null
          photo_urls?: string[] | null
          plantio_berma?: number | null
          plantio_grama_berma?: number | null
          plantio_grama_faixa?: string | null
          plantio_grama_m2?: number | null
          plantio_unidade?: number | null
          podagem_berma?: number | null
          podagem_unidade?: number | null
          report_date?: string
          retirada_mudas_unidade?: number | null
          rocagem_berma?: number | null
          rocagem_faixa?: string | null
          rocagem_m2?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      dds_planning_document: {
        Row: {
          file_name: string
          file_url: string
          id: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          file_name: string
          file_url: string
          id?: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          file_name?: string
          file_url?: string
          id?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      dds_schedule: {
        Row: {
          created_at: string
          created_by: string
          external_presenter_name: string | null
          id: string
          month_year: string
          photo_url: string | null
          presenter_user_id: string | null
          scheduled_date: string
          theme: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          external_presenter_name?: string | null
          id?: string
          month_year: string
          photo_url?: string | null
          presenter_user_id?: string | null
          scheduled_date: string
          theme: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          external_presenter_name?: string | null
          id?: string
          month_year?: string
          photo_url?: string | null
          presenter_user_id?: string | null
          scheduled_date?: string
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_history: {
        Row: {
          change_type: string
          changed_by: string
          changed_by_name: string
          created_at: string
          document_id: string
          id: string
          new_status: Database["public"]["Enums"]["document_status"] | null
          notes: string | null
          previous_status: Database["public"]["Enums"]["document_status"] | null
        }
        Insert: {
          change_type?: string
          changed_by: string
          changed_by_name: string
          created_at?: string
          document_id: string
          id?: string
          new_status?: Database["public"]["Enums"]["document_status"] | null
          notes?: string | null
          previous_status?:
            | Database["public"]["Enums"]["document_status"]
            | null
        }
        Update: {
          change_type?: string
          changed_by?: string
          changed_by_name?: string
          created_at?: string
          document_id?: string
          id?: string
          new_status?: Database["public"]["Enums"]["document_status"] | null
          notes?: string | null
          previous_status?:
            | Database["public"]["Enums"]["document_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "document_history_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          expiry_date: string
          file_url: string | null
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["document_status"]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          expiry_date: string
          file_url?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          expiry_date?: string
          file_url?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          area: string | null
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
          area?: string | null
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
          area?: string | null
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
      equipment_movements: {
        Row: {
          created_at: string
          created_by: string
          equipment_name: string
          exit_reason:
            | Database["public"]["Enums"]["equipment_exit_reason"]
            | null
          id: string
          movement_date: string
          movement_time: string
          movement_type: Database["public"]["Enums"]["equipment_movement_type"]
          observation: string | null
          plate: string
          problem_description: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          equipment_name: string
          exit_reason?:
            | Database["public"]["Enums"]["equipment_exit_reason"]
            | null
          id?: string
          movement_date?: string
          movement_time?: string
          movement_type: Database["public"]["Enums"]["equipment_movement_type"]
          observation?: string | null
          plate: string
          problem_description?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          equipment_name?: string
          exit_reason?:
            | Database["public"]["Enums"]["equipment_exit_reason"]
            | null
          id?: string
          movement_date?: string
          movement_time?: string
          movement_type?: Database["public"]["Enums"]["equipment_movement_type"]
          observation?: string | null
          plate?: string
          problem_description?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      equipment_stop_history: {
        Row: {
          created_at: string
          defect_description: string | null
          duration_minutes: number | null
          ended_at: string | null
          equipment_id: string
          id: string
          started_at: string
          stop_reason: string
        }
        Insert: {
          created_at?: string
          defect_description?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          equipment_id: string
          id?: string
          started_at: string
          stop_reason: string
        }
        Update: {
          created_at?: string
          defect_description?: string | null
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
      goals: {
        Row: {
          adubagem_unidade: number
          controle_invasoras_unidade: number
          coroamento_unidade: number
          created_at: string
          created_by: string
          escavacao_manual_unidade: number
          id: string
          limpeza_assoprador_m2: number
          limpeza_bueiro_unidade: number
          limpeza_canaleta_m: number
          limpeza_manual_m2: number
          manutencao_drenagem_m: number
          month_year: string
          plantio_unidade: number
          podagem_unidade: number
          recomposicao_cascalho_unidade: number
          recomposicao_gabiao_m: number
          recomposicao_silte_unidade: number
          recomposicao_tela_unidade: number
          reparo_cerca_m: number
          reposicao_manta_unidade: number
          reposicao_silte_unidade: number
          retirada_mudas_unidade: number
          rocagem_m2: number
          updated_at: string
        }
        Insert: {
          adubagem_unidade?: number
          controle_invasoras_unidade?: number
          coroamento_unidade?: number
          created_at?: string
          created_by: string
          escavacao_manual_unidade?: number
          id?: string
          limpeza_assoprador_m2?: number
          limpeza_bueiro_unidade?: number
          limpeza_canaleta_m?: number
          limpeza_manual_m2?: number
          manutencao_drenagem_m?: number
          month_year: string
          plantio_unidade?: number
          podagem_unidade?: number
          recomposicao_cascalho_unidade?: number
          recomposicao_gabiao_m?: number
          recomposicao_silte_unidade?: number
          recomposicao_tela_unidade?: number
          reparo_cerca_m?: number
          reposicao_manta_unidade?: number
          reposicao_silte_unidade?: number
          retirada_mudas_unidade?: number
          rocagem_m2?: number
          updated_at?: string
        }
        Update: {
          adubagem_unidade?: number
          controle_invasoras_unidade?: number
          coroamento_unidade?: number
          created_at?: string
          created_by?: string
          escavacao_manual_unidade?: number
          id?: string
          limpeza_assoprador_m2?: number
          limpeza_bueiro_unidade?: number
          limpeza_canaleta_m?: number
          limpeza_manual_m2?: number
          manutencao_drenagem_m?: number
          month_year?: string
          plantio_unidade?: number
          podagem_unidade?: number
          recomposicao_cascalho_unidade?: number
          recomposicao_gabiao_m?: number
          recomposicao_silte_unidade?: number
          recomposicao_tela_unidade?: number
          reparo_cerca_m?: number
          reposicao_manta_unidade?: number
          reposicao_silte_unidade?: number
          retirada_mudas_unidade?: number
          rocagem_m2?: number
          updated_at?: string
        }
        Relationships: []
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
          destination_id: string | null
          destination_name: string | null
          destination_type: string | null
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
          destination_id?: string | null
          destination_name?: string | null
          destination_type?: string | null
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
          destination_id?: string | null
          destination_name?: string | null
          destination_type?: string | null
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
      nav_visibility_rules: {
        Row: {
          cargo: string
          created_at: string
          id: string
          is_hidden: boolean
          nav_item_id: string
          updated_at: string
        }
        Insert: {
          cargo: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          nav_item_id: string
          updated_at?: string
        }
        Update: {
          cargo?: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          nav_item_id?: string
          updated_at?: string
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
      order_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          order_id: string
          product_name: string
          quantity: number
          quantity_unit: Database["public"]["Enums"]["quantity_unit"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          order_id: string
          product_name: string
          quantity: number
          quantity_unit?: Database["public"]["Enums"]["quantity_unit"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string
          product_name?: string
          quantity?: number
          quantity_unit?: Database["public"]["Enums"]["quantity_unit"]
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
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
      overtime_records: {
        Row: {
          cargo: string
          created_at: string
          entry_time: string
          exit_time: string
          id: string
          is_overtime: boolean
          record_date: string
          updated_at: string
          user_id: string
          user_name: string
        }
        Insert: {
          cargo: string
          created_at?: string
          entry_time: string
          exit_time: string
          id?: string
          is_overtime?: boolean
          record_date: string
          updated_at?: string
          user_id: string
          user_name: string
        }
        Update: {
          cargo?: string
          created_at?: string
          entry_time?: string
          exit_time?: string
          id?: string
          is_overtime?: boolean
          record_date?: string
          updated_at?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      overtime_summaries: {
        Row: {
          cargo: string
          created_at: string
          id: string
          period_end: string
          period_start: string
          total_hours_worked: number
          total_overtime_hours: number
          total_overtime_records: number
          total_records: number
          user_id: string
          user_name: string
        }
        Insert: {
          cargo: string
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          total_hours_worked?: number
          total_overtime_hours?: number
          total_overtime_records?: number
          total_records?: number
          user_id: string
          user_name: string
        }
        Update: {
          cargo?: string
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          total_hours_worked?: number
          total_overtime_hours?: number
          total_overtime_records?: number
          total_records?: number
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string
          generated_at: string | null
          id: string
          image_url: string | null
          product_name: string
          product_ni: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          generated_at?: string | null
          id?: string
          image_url?: string | null
          product_name: string
          product_ni: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          generated_at?: string | null
          id?: string
          image_url?: string | null
          product_name?: string
          product_ni?: string
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
      rdo_report_locks: {
        Row: {
          created_at: string
          id: string
          locked_at: string
          locked_by: string
          report_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          locked_at?: string
          locked_by: string
          report_date: string
        }
        Update: {
          created_at?: string
          id?: string
          locked_at?: string
          locked_by?: string
          report_date?: string
        }
        Relationships: []
      }
      rdo_reports: {
        Row: {
          created_at: string
          created_by: string
          difficulties: string | null
          efetivo_gabiao_text: string | null
          efetivo_jardinagem_text: string | null
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
          efetivo_gabiao_text?: string | null
          efetivo_jardinagem_text?: string | null
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
          efetivo_gabiao_text?: string | null
          efetivo_jardinagem_text?: string | null
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
          event_time: string | null
          id: string
          is_recurring: boolean | null
          mention_type: string
          mentioned_users: string[] | null
          recurring_days: number[] | null
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
          event_time?: string | null
          id?: string
          is_recurring?: boolean | null
          mention_type: string
          mentioned_users?: string[] | null
          recurring_days?: number[] | null
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
          event_time?: string | null
          id?: string
          is_recurring?: boolean | null
          mention_type?: string
          mentioned_users?: string[] | null
          recurring_days?: number[] | null
          show_on_event_day?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      security_files: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          updated_at: string
          uploaded_by: string
          uploaded_by_name: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          updated_at?: string
          uploaded_by: string
          uploaded_by_name: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          updated_at?: string
          uploaded_by?: string
          uploaded_by_name?: string
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
      sling_equipment: {
        Row: {
          color: string
          created_at: string
          created_by: string
          description: string
          id: string
          tag: string
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          created_by: string
          description: string
          id?: string
          tag: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          tag?: string
          updated_at?: string
        }
        Relationships: []
      }
      sling_inspections: {
        Row: {
          created_at: string
          id: string
          inspected_at: string | null
          inspected_by: string | null
          inspection_date: string
          notes: string | null
          sling_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          inspection_date: string
          notes?: string | null
          sling_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          inspection_date?: string
          notes?: string | null
          sling_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sling_inspections_sling_id_fkey"
            columns: ["sling_id"]
            isOneToOne: false
            referencedRelation: "sling_equipment"
            referencedColumns: ["id"]
          },
        ]
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
          dashboard_order: Json | null
          id: string
          nav_order: Json | null
          notification_sound: string | null
          page_background_color: string | null
          session_duration_hours: number
          sidebar_color: string | null
          sidebar_font_color: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_tab_color?: string | null
          created_at?: string
          dashboard_order?: Json | null
          id?: string
          nav_order?: Json | null
          notification_sound?: string | null
          page_background_color?: string | null
          session_duration_hours?: number
          sidebar_color?: string | null
          sidebar_font_color?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_tab_color?: string | null
          created_at?: string
          dashboard_order?: Json | null
          id?: string
          nav_order?: Json | null
          notification_sound?: string | null
          page_background_color?: string | null
          session_duration_hours?: number
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
      vehicle_inspections: {
        Row: {
          created_at: string
          created_by: string
          cronografo: string | null
          id: string
          laudo_mecanico: string | null
          laudo_opacidade: string | null
          modelo_veiculo: string
          numero_cracha: string
          placa: string
          plano_manutencao: string | null
          updated_at: string
          vistoria: string
        }
        Insert: {
          created_at?: string
          created_by: string
          cronografo?: string | null
          id?: string
          laudo_mecanico?: string | null
          laudo_opacidade?: string | null
          modelo_veiculo: string
          numero_cracha: string
          placa: string
          plano_manutencao?: string | null
          updated_at?: string
          vistoria: string
        }
        Update: {
          created_at?: string
          created_by?: string
          cronografo?: string | null
          id?: string
          laudo_mecanico?: string | null
          laudo_opacidade?: string | null
          modelo_veiculo?: string
          numero_cracha?: string
          placa?: string
          plano_manutencao?: string | null
          updated_at?: string
          vistoria?: string
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
        | "engenheiro_civil"
        | "engenheiro_planejamento"
        | "tecnico_planejamento"
        | "engenheiro_seguranca"
        | "motorista_pipa"
        | "motorista_munk"
      document_status: "pending" | "updated" | "cancelled"
      document_type:
        | "pt"
        | "analise_risco"
        | "aso"
        | "treinamento"
        | "certificado"
        | "licenca"
        | "outro"
      employee_status: "active" | "vacation" | "leave"
      equipment_exit_reason:
        | "manutencao_corretiva"
        | "manutencao_preventiva"
        | "vistoria"
      equipment_movement_type: "entrada" | "saida"
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
        "engenheiro_civil",
        "engenheiro_planejamento",
        "tecnico_planejamento",
        "engenheiro_seguranca",
        "motorista_pipa",
        "motorista_munk",
      ],
      document_status: ["pending", "updated", "cancelled"],
      document_type: [
        "pt",
        "analise_risco",
        "aso",
        "treinamento",
        "certificado",
        "licenca",
        "outro",
      ],
      employee_status: ["active", "vacation", "leave"],
      equipment_exit_reason: [
        "manutencao_corretiva",
        "manutencao_preventiva",
        "vistoria",
      ],
      equipment_movement_type: ["entrada", "saida"],
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
