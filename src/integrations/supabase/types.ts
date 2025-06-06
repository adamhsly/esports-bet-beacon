export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      card_minting_requests: {
        Row: {
          card_ids: string[]
          completed_at: string | null
          error_message: string | null
          id: string
          request_status: string | null
          requested_at: string | null
          transaction_hashes: string[] | null
          user_id: string
          wallet_address: string
        }
        Insert: {
          card_ids: string[]
          completed_at?: string | null
          error_message?: string | null
          id?: string
          request_status?: string | null
          requested_at?: string | null
          transaction_hashes?: string[] | null
          user_id: string
          wallet_address: string
        }
        Update: {
          card_ids?: string[]
          completed_at?: string | null
          error_message?: string | null
          id?: string
          request_status?: string | null
          requested_at?: string | null
          transaction_hashes?: string[] | null
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
      card_templates: {
        Row: {
          created_at: string
          game: string
          id: string
          min_performance_threshold: Json
          rarity: string
          stat_multipliers: Json
          template_name: string
          visual_properties: Json
        }
        Insert: {
          created_at?: string
          game?: string
          id?: string
          min_performance_threshold?: Json
          rarity: string
          stat_multipliers?: Json
          template_name: string
          visual_properties?: Json
        }
        Update: {
          created_at?: string
          game?: string
          id?: string
          min_performance_threshold?: Json
          rarity?: string
          stat_multipliers?: Json
          template_name?: string
          visual_properties?: Json
        }
        Relationships: []
      }
      card_transactions: {
        Row: {
          card_id: string
          created_at: string
          from_user_id: string | null
          id: string
          price: number | null
          to_user_id: string | null
          transaction_hash: string | null
          transaction_type: string
        }
        Insert: {
          card_id: string
          created_at?: string
          from_user_id?: string | null
          id?: string
          price?: number | null
          to_user_id?: string | null
          transaction_hash?: string | null
          transaction_type: string
        }
        Update: {
          card_id?: string
          created_at?: string
          from_user_id?: string | null
          id?: string
          price?: number | null
          to_user_id?: string | null
          transaction_hash?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_transactions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "nft_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      faceit_matches: {
        Row: {
          calculate_elo: boolean | null
          competition_name: string | null
          competition_type: string | null
          configured_at: string | null
          created_at: string
          faceit_data: Json | null
          finished_at: string | null
          game: string
          id: string
          match_id: string
          organized_by: string | null
          raw_data: Json | null
          region: string | null
          started_at: string | null
          status: string
          teams: Json
          updated_at: string
          version: number | null
          voting: Json | null
        }
        Insert: {
          calculate_elo?: boolean | null
          competition_name?: string | null
          competition_type?: string | null
          configured_at?: string | null
          created_at?: string
          faceit_data?: Json | null
          finished_at?: string | null
          game?: string
          id?: string
          match_id: string
          organized_by?: string | null
          raw_data?: Json | null
          region?: string | null
          started_at?: string | null
          status: string
          teams: Json
          updated_at?: string
          version?: number | null
          voting?: Json | null
        }
        Update: {
          calculate_elo?: boolean | null
          competition_name?: string | null
          competition_type?: string | null
          configured_at?: string | null
          created_at?: string
          faceit_data?: Json | null
          finished_at?: string | null
          game?: string
          id?: string
          match_id?: string
          organized_by?: string | null
          raw_data?: Json | null
          region?: string | null
          started_at?: string | null
          status?: string
          teams?: Json
          updated_at?: string
          version?: number | null
          voting?: Json | null
        }
        Relationships: []
      }
      faceit_sync_logs: {
        Row: {
          completed_at: string | null
          duration_ms: number | null
          error_details: Json | null
          error_message: string | null
          id: string
          matches_added: number | null
          matches_processed: number | null
          matches_updated: number | null
          metadata: Json | null
          started_at: string
          status: string
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          duration_ms?: number | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          matches_added?: number | null
          matches_processed?: number | null
          matches_updated?: number | null
          metadata?: Json | null
          started_at?: string
          status: string
          sync_type: string
        }
        Update: {
          completed_at?: string | null
          duration_ms?: number | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          matches_added?: number | null
          matches_processed?: number | null
          matches_updated?: number | null
          metadata?: Json | null
          started_at?: string
          status?: string
          sync_type?: string
        }
        Relationships: []
      }
      fantasy_league_participants: {
        Row: {
          current_rank: number | null
          current_score: number | null
          fantasy_team_id: string | null
          id: string
          joined_at: string | null
          tournament_id: string | null
          user_id: string | null
        }
        Insert: {
          current_rank?: number | null
          current_score?: number | null
          fantasy_team_id?: string | null
          id?: string
          joined_at?: string | null
          tournament_id?: string | null
          user_id?: string | null
        }
        Update: {
          current_rank?: number | null
          current_score?: number | null
          fantasy_team_id?: string | null
          id?: string
          joined_at?: string | null
          tournament_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fantasy_league_participants_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_league_participants_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      fantasy_live_sessions: {
        Row: {
          created_at: string
          id: string
          match_id: string
          scoring_config: Json
          session_end: string | null
          session_start: string
          status: string
          tournament_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          scoring_config?: Json
          session_end?: string | null
          session_start?: string
          status?: string
          tournament_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          scoring_config?: Json
          session_end?: string | null
          session_start?: string
          status?: string
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fantasy_live_sessions_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      fantasy_match_scores: {
        Row: {
          created_at: string | null
          fantasy_team_id: string | null
          id: string
          match_date: string | null
          match_id: string
          player_card_id: string | null
          player_performance: Json | null
          points_earned: number | null
        }
        Insert: {
          created_at?: string | null
          fantasy_team_id?: string | null
          id?: string
          match_date?: string | null
          match_id: string
          player_card_id?: string | null
          player_performance?: Json | null
          points_earned?: number | null
        }
        Update: {
          created_at?: string | null
          fantasy_team_id?: string | null
          id?: string
          match_date?: string | null
          match_id?: string
          player_card_id?: string | null
          player_performance?: Json | null
          points_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fantasy_match_scores_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_match_scores_player_card_id_fkey"
            columns: ["player_card_id"]
            isOneToOne: false
            referencedRelation: "nft_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      fantasy_teams: {
        Row: {
          active_lineup: Json
          bench_lineup: Json
          created_at: string
          formation: string
          formation_positions: Json | null
          id: string
          is_active: boolean | null
          performance_score: number | null
          salary_cap: number | null
          salary_used: number | null
          team_chemistry_bonus: number | null
          team_name: string
          total_team_value: number | null
          tournament_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_lineup?: Json
          bench_lineup?: Json
          created_at?: string
          formation?: string
          formation_positions?: Json | null
          id?: string
          is_active?: boolean | null
          performance_score?: number | null
          salary_cap?: number | null
          salary_used?: number | null
          team_chemistry_bonus?: number | null
          team_name: string
          total_team_value?: number | null
          tournament_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_lineup?: Json
          bench_lineup?: Json
          created_at?: string
          formation?: string
          formation_positions?: Json | null
          id?: string
          is_active?: boolean | null
          performance_score?: number | null
          salary_cap?: number | null
          salary_used?: number | null
          team_chemistry_bonus?: number | null
          team_name?: string
          total_team_value?: number | null
          tournament_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      live_fantasy_scores: {
        Row: {
          created_at: string
          current_total_score: number
          fantasy_team_id: string
          id: string
          last_calculated: string
          position_scores: Json
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_total_score?: number
          fantasy_team_id: string
          id?: string
          last_calculated?: string
          position_scores?: Json
          session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_total_score?: number
          fantasy_team_id?: string
          id?: string
          last_calculated?: string
          position_scores?: Json
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_fantasy_scores_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_fantasy_scores_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "fantasy_live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_player_performance: {
        Row: {
          clutch_rounds: number
          created_at: string
          current_adr: number
          current_assists: number
          current_deaths: number
          current_kills: number
          fantasy_points: number
          id: string
          last_updated: string
          mvp_rounds: number
          player_id: string
          player_name: string
          session_id: string
          team_name: string | null
        }
        Insert: {
          clutch_rounds?: number
          created_at?: string
          current_adr?: number
          current_assists?: number
          current_deaths?: number
          current_kills?: number
          fantasy_points?: number
          id?: string
          last_updated?: string
          mvp_rounds?: number
          player_id: string
          player_name: string
          session_id: string
          team_name?: string | null
        }
        Update: {
          clutch_rounds?: number
          created_at?: string
          current_adr?: number
          current_assists?: number
          current_deaths?: number
          current_kills?: number
          fantasy_points?: number
          id?: string
          last_updated?: string
          mvp_rounds?: number
          player_id?: string
          player_name?: string
          session_id?: string
          team_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_player_performance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "fantasy_live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      nft_cards: {
        Row: {
          block_number: number | null
          blockchain_status: string | null
          card_id: string
          contract_address: string | null
          created_at: string
          game: string
          gas_used: number | null
          id: string
          image_url: string | null
          metadata: Json
          mint_transaction_hash: string | null
          minted_at: string | null
          owner_wallet: string | null
          player_id: string
          player_name: string
          player_type: string
          position: string
          rarity: string
          stats: Json
          team_name: string | null
          token_id: string | null
          updated_at: string
        }
        Insert: {
          block_number?: number | null
          blockchain_status?: string | null
          card_id: string
          contract_address?: string | null
          created_at?: string
          game?: string
          gas_used?: number | null
          id?: string
          image_url?: string | null
          metadata?: Json
          mint_transaction_hash?: string | null
          minted_at?: string | null
          owner_wallet?: string | null
          player_id: string
          player_name: string
          player_type: string
          position: string
          rarity: string
          stats?: Json
          team_name?: string | null
          token_id?: string | null
          updated_at?: string
        }
        Update: {
          block_number?: number | null
          blockchain_status?: string | null
          card_id?: string
          contract_address?: string | null
          created_at?: string
          game?: string
          gas_used?: number | null
          id?: string
          image_url?: string | null
          metadata?: Json
          mint_transaction_hash?: string | null
          minted_at?: string | null
          owner_wallet?: string | null
          player_id?: string
          player_name?: string
          player_type?: string
          position?: string
          rarity?: string
          stats?: Json
          team_name?: string | null
          token_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pack_purchases: {
        Row: {
          cards_received: Json
          created_at: string
          id: string
          is_opened: boolean | null
          opened_at: string | null
          pack_contents: Json | null
          pack_price: number
          pack_type: string
          payment_method: string
          transaction_hash: string | null
          user_id: string
        }
        Insert: {
          cards_received?: Json
          created_at?: string
          id?: string
          is_opened?: boolean | null
          opened_at?: string | null
          pack_contents?: Json | null
          pack_price: number
          pack_type: string
          payment_method: string
          transaction_hash?: string | null
          user_id: string
        }
        Update: {
          cards_received?: Json
          created_at?: string
          id?: string
          is_opened?: boolean | null
          opened_at?: string | null
          pack_contents?: Json | null
          pack_price?: number
          pack_type?: string
          payment_method?: string
          transaction_hash?: string | null
          user_id?: string
        }
        Relationships: []
      }
      player_data: {
        Row: {
          created_at: string
          game: string
          id: string
          last_synced_at: string
          performance_metrics: Json
          player_id: string
          player_name: string
          position: string | null
          stats: Json
          team_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          game?: string
          id?: string
          last_synced_at?: string
          performance_metrics?: Json
          player_id: string
          player_name: string
          position?: string | null
          stats?: Json
          team_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          game?: string
          id?: string
          last_synced_at?: string
          performance_metrics?: Json
          player_id?: string
          player_name?: string
          position?: string | null
          stats?: Json
          team_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          username: string | null
          welcome_pack_claimed: boolean | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
          username?: string | null
          welcome_pack_claimed?: boolean | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          username?: string | null
          welcome_pack_claimed?: boolean | null
        }
        Relationships: []
      }
      starter_pack_config: {
        Row: {
          card_count: number
          created_at: string
          game: string
          id: string
          is_active: boolean | null
          pack_name: string
          player_list: Json
          updated_at: string
        }
        Insert: {
          card_count?: number
          created_at?: string
          game?: string
          id?: string
          is_active?: boolean | null
          pack_name: string
          player_list?: Json
          updated_at?: string
        }
        Update: {
          card_count?: number
          created_at?: string
          game?: string
          id?: string
          is_active?: boolean | null
          pack_name?: string
          player_list?: Json
          updated_at?: string
        }
        Relationships: []
      }
      tournaments: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          current_participants: number | null
          end_time: string
          entry_fee: number | null
          id: string
          is_fantasy_league: boolean | null
          league_type: string | null
          max_participants: number | null
          prize_pool: number | null
          scoring_rules: Json
          scoring_system: Json | null
          start_time: string
          status: string
          tournament_name: string
          tournament_rules: Json
          tournament_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          current_participants?: number | null
          end_time: string
          entry_fee?: number | null
          id?: string
          is_fantasy_league?: boolean | null
          league_type?: string | null
          max_participants?: number | null
          prize_pool?: number | null
          scoring_rules?: Json
          scoring_system?: Json | null
          start_time: string
          status?: string
          tournament_name: string
          tournament_rules?: Json
          tournament_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          current_participants?: number | null
          end_time?: string
          entry_fee?: number | null
          id?: string
          is_fantasy_league?: boolean | null
          league_type?: string | null
          max_participants?: number | null
          prize_pool?: number | null
          scoring_rules?: Json
          scoring_system?: Json | null
          start_time?: string
          status?: string
          tournament_name?: string
          tournament_rules?: Json
          tournament_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_card_collections: {
        Row: {
          acquired_at: string
          acquired_method: string | null
          card_id: string
          id: string
          is_minted: boolean | null
          mint_status: string | null
          mint_transaction_hash: string | null
          minted_at: string | null
          quantity: number | null
          user_id: string
        }
        Insert: {
          acquired_at?: string
          acquired_method?: string | null
          card_id: string
          id?: string
          is_minted?: boolean | null
          mint_status?: string | null
          mint_transaction_hash?: string | null
          minted_at?: string | null
          quantity?: number | null
          user_id: string
        }
        Update: {
          acquired_at?: string
          acquired_method?: string | null
          card_id?: string
          id?: string
          is_minted?: boolean | null
          mint_status?: string | null
          mint_transaction_hash?: string | null
          minted_at?: string | null
          quantity?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_card_collections_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "nft_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      user_wallets: {
        Row: {
          blockchain: string
          connected_at: string
          created_at: string
          id: string
          is_primary: boolean | null
          last_used_at: string | null
          user_id: string
          wallet_address: string
          wallet_type: string
        }
        Insert: {
          blockchain?: string
          connected_at?: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          last_used_at?: string | null
          user_id: string
          wallet_address: string
          wallet_type: string
        }
        Update: {
          blockchain?: string
          connected_at?: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          last_used_at?: string | null
          user_id?: string
          wallet_address?: string
          wallet_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_fantasy_points: {
        Args: {
          kills: number
          deaths: number
          assists: number
          adr: number
          mvp_rounds: number
          clutch_rounds: number
          scoring_config: Json
        }
        Returns: number
      }
    }
    Enums: {
      cs2_position: "IGL" | "AWPer" | "Entry Fragger" | "Support" | "Lurker"
      tournament_status: "upcoming" | "active" | "completed" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      cs2_position: ["IGL", "AWPer", "Entry Fragger", "Support", "Lurker"],
      tournament_status: ["upcoming", "active", "completed", "cancelled"],
    },
  },
} as const
