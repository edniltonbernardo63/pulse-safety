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
      colaboradores: {
        Row: {
          cpf: string | null
          created_at: string
          data_admissao: string | null
          data_nascimento: string | null
          email: string | null
          endereco: string | null
          foto_url: string | null
          funcao_atual: string | null
          id: string
          nome: string
          qrcode_token: string
          rg: string | null
          setor: string | null
          status: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          foto_url?: string | null
          funcao_atual?: string | null
          id?: string
          nome: string
          qrcode_token?: string
          rg?: string | null
          setor?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          foto_url?: string | null
          funcao_atual?: string | null
          id?: string
          nome?: string
          qrcode_token?: string
          rg?: string | null
          setor?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      epis: {
        Row: {
          ca_numero: string | null
          colaborador_id: string
          created_at: string
          data_entrega: string
          data_vencimento: string | null
          id: string
          observacoes: string | null
          tipo: string
          vida_util_meses: number | null
        }
        Insert: {
          ca_numero?: string | null
          colaborador_id: string
          created_at?: string
          data_entrega: string
          data_vencimento?: string | null
          id?: string
          observacoes?: string | null
          tipo: string
          vida_util_meses?: number | null
        }
        Update: {
          ca_numero?: string | null
          colaborador_id?: string
          created_at?: string
          data_entrega?: string
          data_vencimento?: string | null
          id?: string
          observacoes?: string | null
          tipo?: string
          vida_util_meses?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "epis_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_calendario: {
        Row: {
          colaboradores_convocados: string[] | null
          created_at: string
          data_fim: string | null
          data_inicio: string
          descricao: string | null
          id: string
          local: string | null
          tipo: string
          titulo: string
        }
        Insert: {
          colaboradores_convocados?: string[] | null
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          descricao?: string | null
          id?: string
          local?: string | null
          tipo?: string
          titulo: string
        }
        Update: {
          colaboradores_convocados?: string[] | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          id?: string
          local?: string | null
          tipo?: string
          titulo?: string
        }
        Relationships: []
      }
      fornecedores: {
        Row: {
          cnpj: string | null
          contato: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          tipos_treinamento: string | null
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          contato?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          tipos_treinamento?: string | null
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          contato?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          tipos_treinamento?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      historico_funcoes: {
        Row: {
          colaborador_id: string
          created_at: string
          data_fim: string | null
          data_inicio: string
          funcao: string
          id: string
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          funcao: string
          id?: string
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          funcao?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_funcoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      normas_nr: {
        Row: {
          base_legal: string | null
          carga_horaria_minima: number | null
          codigo: string
          created_at: string
          id: string
          periodicidade_meses: number | null
          resumo: string | null
          titulo: string
        }
        Insert: {
          base_legal?: string | null
          carga_horaria_minima?: number | null
          codigo: string
          created_at?: string
          id?: string
          periodicidade_meses?: number | null
          resumo?: string | null
          titulo: string
        }
        Update: {
          base_legal?: string | null
          carga_horaria_minima?: number | null
          codigo?: string
          created_at?: string
          id?: string
          periodicidade_meses?: number | null
          resumo?: string | null
          titulo?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          nome: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      treinamentos: {
        Row: {
          carga_horaria: number | null
          conteudo_programatico: string | null
          created_at: string
          fornecedor_id: string | null
          id: string
          nome: string
          nr_id: string | null
        }
        Insert: {
          carga_horaria?: number | null
          conteudo_programatico?: string | null
          created_at?: string
          fornecedor_id?: string | null
          id?: string
          nome: string
          nr_id?: string | null
        }
        Update: {
          carga_horaria?: number | null
          conteudo_programatico?: string | null
          created_at?: string
          fornecedor_id?: string | null
          id?: string
          nome?: string
          nr_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treinamentos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinamentos_nr_id_fkey"
            columns: ["nr_id"]
            isOneToOne: false
            referencedRelation: "normas_nr"
            referencedColumns: ["id"]
          },
        ]
      }
      treinamentos_realizados: {
        Row: {
          certificado_numero: string | null
          colaborador_id: string
          created_at: string
          data_realizacao: string
          data_vencimento: string | null
          id: string
          instrutor: string | null
          local: string | null
          observacoes: string | null
          treinamento_id: string
        }
        Insert: {
          certificado_numero?: string | null
          colaborador_id: string
          created_at?: string
          data_realizacao: string
          data_vencimento?: string | null
          id?: string
          instrutor?: string | null
          local?: string | null
          observacoes?: string | null
          treinamento_id: string
        }
        Update: {
          certificado_numero?: string | null
          colaborador_id?: string
          created_at?: string
          data_realizacao?: string
          data_vencimento?: string | null
          id?: string
          instrutor?: string | null
          local?: string | null
          observacoes?: string | null
          treinamento_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treinamentos_realizados_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinamentos_realizados_treinamento_id_fkey"
            columns: ["treinamento_id"]
            isOneToOne: false
            referencedRelation: "treinamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
    }
    Enums: {
      app_role: "admin" | "tecnico" | "consulta"
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
      app_role: ["admin", "tecnico", "consulta"],
    },
  },
} as const
