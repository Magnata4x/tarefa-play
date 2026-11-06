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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      advertiser_wallets: {
        Row: {
          advertiser_id: string
          saldo: number
        }
        Insert: {
          advertiser_id: string
          saldo?: number
        }
        Update: {
          advertiser_id?: string
          saldo?: number
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          acao: string
          actor_id: string | null
          created_at: string
          detalhes: Json | null
          id: string
        }
        Insert: {
          acao: string
          actor_id?: string | null
          created_at?: string
          detalhes?: Json | null
          id?: string
        }
        Update: {
          acao?: string
          actor_id?: string | null
          created_at?: string
          detalhes?: Json | null
          id?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          advertiser_id: string
          created_at: string
          custo_anunciante: number
          descricao: string | null
          exige_prova: boolean
          id: string
          instrucoes: string | null
          max_por_usuario: number
          nivel_minimo: number
          orcamento_restante: number
          orcamento_total: number
          quantidade: number
          recompensa_usuario: number
          rede: string
          status: Database["public"]["Enums"]["campaign_status"]
          tempo_minimo_seg: number
          tipo_tarefa: string
          titulo: string
          url_alvo: string
          vagas_restantes: number
        }
        Insert: {
          advertiser_id: string
          created_at?: string
          custo_anunciante: number
          descricao?: string | null
          exige_prova?: boolean
          id?: string
          instrucoes?: string | null
          max_por_usuario?: number
          nivel_minimo?: number
          orcamento_restante: number
          orcamento_total: number
          quantidade: number
          recompensa_usuario: number
          rede: string
          status?: Database["public"]["Enums"]["campaign_status"]
          tempo_minimo_seg?: number
          tipo_tarefa: string
          titulo: string
          url_alvo: string
          vagas_restantes: number
        }
        Update: {
          advertiser_id?: string
          created_at?: string
          custo_anunciante?: number
          descricao?: string | null
          exige_prova?: boolean
          id?: string
          instrucoes?: string | null
          max_por_usuario?: number
          nivel_minimo?: number
          orcamento_restante?: number
          orcamento_total?: number
          quantidade?: number
          recompensa_usuario?: number
          rede?: string
          status?: Database["public"]["Enums"]["campaign_status"]
          tempo_minimo_seg?: number
          tipo_tarefa?: string
          titulo?: string
          url_alvo?: string
          vagas_restantes?: number
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          comissao_pct: number
          dias_conta_nova: number
          horas_saldo_pendente: number
          id: number
          limite_bronze: number
          limite_diamante: number
          limite_ouro: number
          limite_prata: number
          saque_minimo: number
          score_auto_aprovacao: number
          score_revisao: number
        }
        Insert: {
          comissao_pct?: number
          dias_conta_nova?: number
          horas_saldo_pendente?: number
          id?: number
          limite_bronze?: number
          limite_diamante?: number
          limite_ouro?: number
          limite_prata?: number
          saque_minimo?: number
          score_auto_aprovacao?: number
          score_revisao?: number
        }
        Update: {
          comissao_pct?: number
          dias_conta_nova?: number
          horas_saldo_pendente?: number
          id?: number
          limite_bronze?: number
          limite_diamante?: number
          limite_ouro?: number
          limite_prata?: number
          saque_minimo?: number
          score_auto_aprovacao?: number
          score_revisao?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          aceite_termos_em: string | null
          avatar_url: string | null
          cpf_hash: string | null
          created_at: string
          device_hash: string | null
          id: string
          nome: string | null
          referral_code: string | null
          score_confianca: number
          status: string
          streak: number
          tarefas_aprovadas: number
          telefone: string | null
          telefone_verificado: boolean
          ultimo_dia_ativo: string | null
          xp: number
        }
        Insert: {
          aceite_termos_em?: string | null
          avatar_url?: string | null
          cpf_hash?: string | null
          created_at?: string
          device_hash?: string | null
          id: string
          nome?: string | null
          referral_code?: string | null
          score_confianca?: number
          status?: string
          streak?: number
          tarefas_aprovadas?: number
          telefone?: string | null
          telefone_verificado?: boolean
          ultimo_dia_ativo?: string | null
          xp?: number
        }
        Update: {
          aceite_termos_em?: string | null
          avatar_url?: string | null
          cpf_hash?: string | null
          created_at?: string
          device_hash?: string | null
          id?: string
          nome?: string | null
          referral_code?: string | null
          score_confianca?: number
          status?: string
          streak?: number
          tarefas_aprovadas?: number
          telefone?: string | null
          telefone_verificado?: boolean
          ultimo_dia_ativo?: string | null
          xp?: number
        }
        Relationships: []
      }
      referrals: {
        Row: {
          bonus_pago: boolean
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
        }
        Insert: {
          bonus_pago?: boolean
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          bonus_pago?: boolean
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          campaign_id: string | null
          created_at: string
          id: string
          motivo: string
          reporter_id: string
          status: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          motivo: string
          reporter_id: string
          status?: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          motivo?: string
          reporter_id?: string
          status?: string
        }
        Relationships: []
      }
      social_accounts: {
        Row: {
          created_at: string
          handle: string
          id: string
          rede: string
          user_id: string
          verificada: boolean
        }
        Insert: {
          created_at?: string
          handle: string
          id?: string
          rede: string
          user_id: string
          verificada?: boolean
        }
        Update: {
          created_at?: string
          handle?: string
          id?: string
          rede?: string
          user_id?: string
          verificada?: boolean
        }
        Relationships: []
      }
      task_starts: {
        Row: {
          campaign_id: string
          id: string
          ip: string | null
          started_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          id?: string
          ip?: string | null
          started_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          id?: string
          ip?: string | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_starts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      task_submissions: {
        Row: {
          campaign_id: string
          comentario_texto: string | null
          created_at: string
          id: string
          motivo_rejeicao: string | null
          prova_hash: string | null
          prova_url: string | null
          revisado_em: string | null
          revisado_por: string | null
          status: Database["public"]["Enums"]["submission_status"]
          tempo_gasto_seg: number
          user_id: string
          valor: number
        }
        Insert: {
          campaign_id: string
          comentario_texto?: string | null
          created_at?: string
          id?: string
          motivo_rejeicao?: string | null
          prova_hash?: string | null
          prova_url?: string | null
          revisado_em?: string | null
          revisado_por?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          tempo_gasto_seg?: number
          user_id: string
          valor?: number
        }
        Update: {
          campaign_id?: string
          comentario_texto?: string | null
          created_at?: string
          id?: string
          motivo_rejeicao?: string | null
          prova_hash?: string | null
          prova_url?: string | null
          revisado_em?: string | null
          revisado_por?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          tempo_gasto_seg?: number
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "task_submissions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
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
      wallet_transactions: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          liberado: boolean
          liberar_em: string | null
          referencia_id: string | null
          tipo: Database["public"]["Enums"]["tx_type"]
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          liberado?: boolean
          liberar_em?: string | null
          referencia_id?: string | null
          tipo: Database["public"]["Enums"]["tx_type"]
          user_id: string
          valor: number
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          liberado?: boolean
          liberar_em?: string | null
          referencia_id?: string | null
          tipo?: Database["public"]["Enums"]["tx_type"]
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      wallets: {
        Row: {
          saldo_disponivel: number
          saldo_pendente: number
          total_ganho: number
          user_id: string
        }
        Insert: {
          saldo_disponivel?: number
          saldo_pendente?: number
          total_ganho?: number
          user_id: string
        }
        Update: {
          saldo_disponivel?: number
          saldo_pendente?: number
          total_ganho?: number
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          chave_pix: string
          created_at: string
          id: string
          status: Database["public"]["Enums"]["withdrawal_status"]
          tipo_chave: string
          user_id: string
          valor: number
        }
        Insert: {
          chave_pix: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          tipo_chave: string
          user_id: string
          valor: number
        }
        Update: {
          chave_pix?: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          tipo_chave?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _approve_submission: {
        Args: { _reviewer: string; _sub_id: string }
        Returns: undefined
      }
      _reject_submission: {
        Args: { _motivo: string; _reviewer: string; _sub_id: string }
        Returns: undefined
      }
      admin_set_withdrawal: {
        Args: {
          _id: string
          _status: Database["public"]["Enums"]["withdrawal_status"]
        }
        Returns: undefined
      }
      become_advertiser: { Args: never; Returns: undefined }
      contest_submission: { Args: { _sub_id: string }; Returns: undefined }
      create_campaign: {
        Args: {
          _descricao: string
          _exige_prova: boolean
          _instrucoes: string
          _quantidade: number
          _recompensa: number
          _rede: string
          _tempo: number
          _tipo: string
          _titulo: string
          _url: string
        }
        Returns: string
      }
      daily_limit: { Args: { _level: number }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      level_of: { Args: { _aprovadas: number }; Returns: number }
      mock_deposit: { Args: { _valor: number }; Returns: undefined }
      release_my_pending: { Args: never; Returns: undefined }
      request_withdrawal: {
        Args: { _chave: string; _tipo: string; _valor: number }
        Returns: undefined
      }
      review_submission: {
        Args: { _aprovar: boolean; _motivo?: string; _sub_id: string }
        Returns: undefined
      }
      set_campaign_status: {
        Args: {
          _id: string
          _status: Database["public"]["Enums"]["campaign_status"]
        }
        Returns: undefined
      }
      start_task: { Args: { _campaign_id: string }; Returns: string }
      submit_task: {
        Args: {
          _campaign_id: string
          _comentario: string
          _prova_hash: string
          _prova_url: string
        }
        Returns: Database["public"]["Enums"]["submission_status"]
      }
    }
    Enums: {
      app_role: "user" | "advertiser" | "admin"
      campaign_status:
        | "rascunho"
        | "em_analise"
        | "ativa"
        | "pausada"
        | "encerrada"
      submission_status: "pendente" | "aprovada" | "rejeitada" | "contestada"
      tx_type:
        | "ganho"
        | "saque"
        | "bonus"
        | "estorno"
        | "deposito"
        | "gasto_campanha"
        | "liberacao"
      withdrawal_status: "solicitado" | "aprovado" | "pago" | "recusado"
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

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["user", "advertiser", "admin"],
      campaign_status: [
        "rascunho",
        "em_analise",
        "ativa",
        "pausada",
        "encerrada",
      ],
      submission_status: ["pendente", "aprovada", "rejeitada", "contestada"],
      tx_type: [
        "ganho",
        "saque",
        "bonus",
        "estorno",
        "deposito",
        "gasto_campanha",
        "liberacao",
      ],
      withdrawal_status: ["solicitado", "aprovado", "pago", "recusado"],
    },
  },
} as const
