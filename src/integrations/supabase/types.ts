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
    PostgrestVersion: "12.2.3 (519615d)"
  }
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
      credit_transactions: {
        Row: {
          created_at: string
          delta: number
          id: string
          kind: string
          reason: string
          ref_id: string | null
          ref_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          kind: string
          reason: string
          ref_id?: string | null
          ref_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          kind?: string
          reason?: string
          ref_id?: string | null
          ref_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_kind_fkey"
            columns: ["kind"]
            isOneToOne: false
            referencedRelation: "currency_kinds"
            referencedColumns: ["kind"]
          },
        ]
      }
      currency_kinds: {
        Row: {
          kind: string
        }
        Insert: {
          kind: string
        }
        Update: {
          kind?: string
        }
        Relationships: []
      }
      esports_news: {
        Row: {
          created_at: string | null
          id: string
          published_at: string | null
          source: string
          title: string
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          published_at?: string | null
          source: string
          title: string
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          published_at?: string | null
          source?: string
          title?: string
          url?: string
        }
        Relationships: []
      }
      faceit_live_match_stats: {
        Row: {
          bomb_site: string | null
          bomb_status: string | null
          bomb_timer_seconds: number | null
          created_at: string | null
          id: string
          match_id: string
          player_armor: Json | null
          player_health: Json | null
          player_money: Json | null
          player_positions: Json | null
          player_weapons: Json | null
          round_number: number
          round_phase: string | null
          round_timer_seconds: number | null
          team_scores: Json
          updated_at: string | null
        }
        Insert: {
          bomb_site?: string | null
          bomb_status?: string | null
          bomb_timer_seconds?: number | null
          created_at?: string | null
          id?: string
          match_id: string
          player_armor?: Json | null
          player_health?: Json | null
          player_money?: Json | null
          player_positions?: Json | null
          player_weapons?: Json | null
          round_number?: number
          round_phase?: string | null
          round_timer_seconds?: number | null
          team_scores?: Json
          updated_at?: string | null
        }
        Update: {
          bomb_site?: string | null
          bomb_status?: string | null
          bomb_timer_seconds?: number | null
          created_at?: string | null
          id?: string
          match_id?: string
          player_armor?: Json | null
          player_health?: Json | null
          player_money?: Json | null
          player_positions?: Json | null
          player_weapons?: Json | null
          round_number?: number
          round_phase?: string | null
          round_timer_seconds?: number | null
          team_scores?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faceit_live_match_stats_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "faceit_matches"
            referencedColumns: ["match_id"]
          },
        ]
      }
      faceit_match_kill_feed: {
        Row: {
          assisters: Json | null
          blind: boolean | null
          created_at: string | null
          event_type: string | null
          headshot: boolean | null
          id: string
          killer_nickname: string | null
          killer_player_id: string | null
          killer_team: string | null
          match_id: string
          noscope: boolean | null
          penetrated: boolean | null
          position_killer: Json | null
          position_victim: Json | null
          round_number: number
          round_time_seconds: number | null
          thru_smoke: boolean | null
          timestamp: string | null
          victim_nickname: string | null
          victim_player_id: string | null
          victim_team: string | null
          wallbang: boolean | null
          weapon: string | null
        }
        Insert: {
          assisters?: Json | null
          blind?: boolean | null
          created_at?: string | null
          event_type?: string | null
          headshot?: boolean | null
          id?: string
          killer_nickname?: string | null
          killer_player_id?: string | null
          killer_team?: string | null
          match_id: string
          noscope?: boolean | null
          penetrated?: boolean | null
          position_killer?: Json | null
          position_victim?: Json | null
          round_number: number
          round_time_seconds?: number | null
          thru_smoke?: boolean | null
          timestamp?: string | null
          victim_nickname?: string | null
          victim_player_id?: string | null
          victim_team?: string | null
          wallbang?: boolean | null
          weapon?: string | null
        }
        Update: {
          assisters?: Json | null
          blind?: boolean | null
          created_at?: string | null
          event_type?: string | null
          headshot?: boolean | null
          id?: string
          killer_nickname?: string | null
          killer_player_id?: string | null
          killer_team?: string | null
          match_id?: string
          noscope?: boolean | null
          penetrated?: boolean | null
          position_killer?: Json | null
          position_victim?: Json | null
          round_number?: number
          round_time_seconds?: number | null
          thru_smoke?: boolean | null
          timestamp?: string | null
          victim_nickname?: string | null
          victim_player_id?: string | null
          victim_team?: string | null
          wallbang?: boolean | null
          weapon?: string | null
        }
        Relationships: []
      }
      faceit_match_rounds: {
        Row: {
          bomb_defused: boolean | null
          bomb_exploded: boolean | null
          bomb_planted: boolean | null
          bomb_site: string | null
          created_at: string | null
          economy_after: Json | null
          economy_before: Json | null
          faction1_score_after: number | null
          faction1_score_before: number | null
          faction2_score_after: number | null
          faction2_score_before: number | null
          first_kill_player: string | null
          first_kill_victim: string | null
          first_kill_weapon: string | null
          id: string
          key_events: Json | null
          map_name: string | null
          match_id: string
          player_positions_end: Json | null
          player_positions_start: Json | null
          round_duration_seconds: number | null
          round_end_reason: string | null
          round_mvp_player: string | null
          round_number: number
          round_type: string | null
          winning_faction: string | null
        }
        Insert: {
          bomb_defused?: boolean | null
          bomb_exploded?: boolean | null
          bomb_planted?: boolean | null
          bomb_site?: string | null
          created_at?: string | null
          economy_after?: Json | null
          economy_before?: Json | null
          faction1_score_after?: number | null
          faction1_score_before?: number | null
          faction2_score_after?: number | null
          faction2_score_before?: number | null
          first_kill_player?: string | null
          first_kill_victim?: string | null
          first_kill_weapon?: string | null
          id?: string
          key_events?: Json | null
          map_name?: string | null
          match_id: string
          player_positions_end?: Json | null
          player_positions_start?: Json | null
          round_duration_seconds?: number | null
          round_end_reason?: string | null
          round_mvp_player?: string | null
          round_number: number
          round_type?: string | null
          winning_faction?: string | null
        }
        Update: {
          bomb_defused?: boolean | null
          bomb_exploded?: boolean | null
          bomb_planted?: boolean | null
          bomb_site?: string | null
          created_at?: string | null
          economy_after?: Json | null
          economy_before?: Json | null
          faction1_score_after?: number | null
          faction1_score_before?: number | null
          faction2_score_after?: number | null
          faction2_score_before?: number | null
          first_kill_player?: string | null
          first_kill_victim?: string | null
          first_kill_weapon?: string | null
          id?: string
          key_events?: Json | null
          map_name?: string | null
          match_id?: string
          player_positions_end?: Json | null
          player_positions_start?: Json | null
          round_duration_seconds?: number | null
          round_end_reason?: string | null
          round_mvp_player?: string | null
          round_number?: number
          round_type?: string | null
          winning_faction?: string | null
        }
        Relationships: []
      }
      faceit_matches: {
        Row: {
          auto_refresh_interval: number | null
          calculate_elo: boolean | null
          championship_raw_data: Json | null
          championship_stream_url: string | null
          competition_name: string | null
          competition_type: string | null
          configured_at: string | null
          created_at: string
          current_round: number | null
          economy_data: Json | null
          faceit_data: Json | null
          finished_at: string | null
          game: string
          id: string
          kill_feed: Json | null
          last_live_update: string | null
          live_player_status: Json | null
          live_team_scores: Json | null
          maps_played: Json | null
          match_id: string
          match_phase: string | null
          objectives_status: Json | null
          organized_by: string | null
          overtime_rounds: number | null
          raw_data: Json | null
          region: string | null
          round_results: Json | null
          round_timer_seconds: number | null
          scheduled_at: string | null
          started_at: string | null
          status: string
          teams: Json
          updated_at: string
          version: number | null
          voting: Json | null
        }
        Insert: {
          auto_refresh_interval?: number | null
          calculate_elo?: boolean | null
          championship_raw_data?: Json | null
          championship_stream_url?: string | null
          competition_name?: string | null
          competition_type?: string | null
          configured_at?: string | null
          created_at?: string
          current_round?: number | null
          economy_data?: Json | null
          faceit_data?: Json | null
          finished_at?: string | null
          game?: string
          id?: string
          kill_feed?: Json | null
          last_live_update?: string | null
          live_player_status?: Json | null
          live_team_scores?: Json | null
          maps_played?: Json | null
          match_id: string
          match_phase?: string | null
          objectives_status?: Json | null
          organized_by?: string | null
          overtime_rounds?: number | null
          raw_data?: Json | null
          region?: string | null
          round_results?: Json | null
          round_timer_seconds?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          status: string
          teams: Json
          updated_at?: string
          version?: number | null
          voting?: Json | null
        }
        Update: {
          auto_refresh_interval?: number | null
          calculate_elo?: boolean | null
          championship_raw_data?: Json | null
          championship_stream_url?: string | null
          competition_name?: string | null
          competition_type?: string | null
          configured_at?: string | null
          created_at?: string
          current_round?: number | null
          economy_data?: Json | null
          faceit_data?: Json | null
          finished_at?: string | null
          game?: string
          id?: string
          kill_feed?: Json | null
          last_live_update?: string | null
          live_player_status?: Json | null
          live_team_scores?: Json | null
          maps_played?: Json | null
          match_id?: string
          match_phase?: string | null
          objectives_status?: Json | null
          organized_by?: string | null
          overtime_rounds?: number | null
          raw_data?: Json | null
          region?: string | null
          round_results?: Json | null
          round_timer_seconds?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          teams?: Json
          updated_at?: string
          version?: number | null
          voting?: Json | null
        }
        Relationships: []
      }
      faceit_player_match_history: {
        Row: {
          adr: number | null
          assists: number | null
          competition_name: string | null
          competition_type: string | null
          created_at: string | null
          deaths: number | null
          faceit_elo_change: number | null
          headshots: number | null
          headshots_percent: number | null
          id: string
          kd_ratio: number | null
          kills: number | null
          map_name: string | null
          match_date: string
          match_id: string
          match_result: string | null
          mvps: number | null
          opponent_team_name: string | null
          player_id: string
          player_nickname: string
          raw_response: Json | null
          team_name: string | null
          updated_at: string | null
        }
        Insert: {
          adr?: number | null
          assists?: number | null
          competition_name?: string | null
          competition_type?: string | null
          created_at?: string | null
          deaths?: number | null
          faceit_elo_change?: number | null
          headshots?: number | null
          headshots_percent?: number | null
          id?: string
          kd_ratio?: number | null
          kills?: number | null
          map_name?: string | null
          match_date: string
          match_id: string
          match_result?: string | null
          mvps?: number | null
          opponent_team_name?: string | null
          player_id: string
          player_nickname: string
          raw_response?: Json | null
          team_name?: string | null
          updated_at?: string | null
        }
        Update: {
          adr?: number | null
          assists?: number | null
          competition_name?: string | null
          competition_type?: string | null
          created_at?: string | null
          deaths?: number | null
          faceit_elo_change?: number | null
          headshots?: number | null
          headshots_percent?: number | null
          id?: string
          kd_ratio?: number | null
          kills?: number | null
          map_name?: string | null
          match_date?: string
          match_id?: string
          match_result?: string | null
          mvps?: number | null
          opponent_team_name?: string | null
          player_id?: string
          player_nickname?: string
          raw_response?: Json | null
          team_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_faceit_player"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "faceit_player_stats"
            referencedColumns: ["player_id"]
          },
        ]
      }
      faceit_player_match_performance: {
        Row: {
          adr: number | null
          assists: number | null
          clutch_rounds_attempted: number | null
          clutch_rounds_won: number | null
          created_at: string | null
          damage_dealt: number | null
          damage_received: number | null
          deaths: number | null
          enemies_flashed: number | null
          equipment_used: Json | null
          first_deaths: number | null
          first_kills: number | null
          flash_assists: number | null
          headshots: number | null
          headshots_percent: number | null
          id: string
          kd_ratio: number | null
          kills: number | null
          map_areas_controlled: Json | null
          match_id: string
          mvp_rounds: number | null
          player_id: string
          player_nickname: string
          rating: number | null
          round_damage: Json | null
          round_deaths: Json | null
          round_kills: Json | null
          score: number | null
          team_faction: string
          updated_at: string | null
          utility_damage: number | null
        }
        Insert: {
          adr?: number | null
          assists?: number | null
          clutch_rounds_attempted?: number | null
          clutch_rounds_won?: number | null
          created_at?: string | null
          damage_dealt?: number | null
          damage_received?: number | null
          deaths?: number | null
          enemies_flashed?: number | null
          equipment_used?: Json | null
          first_deaths?: number | null
          first_kills?: number | null
          flash_assists?: number | null
          headshots?: number | null
          headshots_percent?: number | null
          id?: string
          kd_ratio?: number | null
          kills?: number | null
          map_areas_controlled?: Json | null
          match_id: string
          mvp_rounds?: number | null
          player_id: string
          player_nickname: string
          rating?: number | null
          round_damage?: Json | null
          round_deaths?: Json | null
          round_kills?: Json | null
          score?: number | null
          team_faction: string
          updated_at?: string | null
          utility_damage?: number | null
        }
        Update: {
          adr?: number | null
          assists?: number | null
          clutch_rounds_attempted?: number | null
          clutch_rounds_won?: number | null
          created_at?: string | null
          damage_dealt?: number | null
          damage_received?: number | null
          deaths?: number | null
          enemies_flashed?: number | null
          equipment_used?: Json | null
          first_deaths?: number | null
          first_kills?: number | null
          flash_assists?: number | null
          headshots?: number | null
          headshots_percent?: number | null
          id?: string
          kd_ratio?: number | null
          kills?: number | null
          map_areas_controlled?: Json | null
          match_id?: string
          mvp_rounds?: number | null
          player_id?: string
          player_nickname?: string
          rating?: number | null
          round_damage?: Json | null
          round_deaths?: Json | null
          round_kills?: Json | null
          score?: number | null
          team_faction?: string
          updated_at?: string | null
          utility_damage?: number | null
        }
        Relationships: []
      }
      faceit_player_match_stats: {
        Row: {
          assists: number | null
          created_at: string | null
          deaths: number | null
          headshots: number | null
          headshots_percent: number | null
          id: string
          kd_ratio: number | null
          kills: number | null
          map_name: string | null
          match_date: string | null
          match_id: string
          match_result: string | null
          mvps: number | null
          player_id: string
          player_name: string
          team_name: string | null
        }
        Insert: {
          assists?: number | null
          created_at?: string | null
          deaths?: number | null
          headshots?: number | null
          headshots_percent?: number | null
          id?: string
          kd_ratio?: number | null
          kills?: number | null
          map_name?: string | null
          match_date?: string | null
          match_id: string
          match_result?: string | null
          mvps?: number | null
          player_id: string
          player_name: string
          team_name?: string | null
        }
        Update: {
          assists?: number | null
          created_at?: string | null
          deaths?: number | null
          headshots?: number | null
          headshots_percent?: number | null
          id?: string
          kd_ratio?: number | null
          kills?: number | null
          map_name?: string | null
          match_date?: string | null
          match_id?: string
          match_result?: string | null
          mvps?: number | null
          player_id?: string
          player_name?: string
          team_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_faceit_match"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "faceit_matches"
            referencedColumns: ["match_id"]
          },
          {
            foreignKeyName: "fk_faceit_player"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "faceit_player_stats"
            referencedColumns: ["player_id"]
          },
        ]
      }
      faceit_player_stats: {
        Row: {
          avatar: string | null
          avg_headshots_percent: number | null
          avg_kd_ratio: number | null
          country: string | null
          created_at: string | null
          current_win_streak: number | null
          faceit_elo: number | null
          id: string
          last_fetched_at: string | null
          longest_win_streak: number | null
          map_stats: Json | null
          membership: string | null
          nickname: string
          player_id: string
          recent_form: string | null
          recent_form_string: string | null
          recent_results: Json | null
          skill_level: number | null
          total_matches: number | null
          total_wins: number | null
          updated_at: string | null
          win_rate: number | null
        }
        Insert: {
          avatar?: string | null
          avg_headshots_percent?: number | null
          avg_kd_ratio?: number | null
          country?: string | null
          created_at?: string | null
          current_win_streak?: number | null
          faceit_elo?: number | null
          id?: string
          last_fetched_at?: string | null
          longest_win_streak?: number | null
          map_stats?: Json | null
          membership?: string | null
          nickname: string
          player_id: string
          recent_form?: string | null
          recent_form_string?: string | null
          recent_results?: Json | null
          skill_level?: number | null
          total_matches?: number | null
          total_wins?: number | null
          updated_at?: string | null
          win_rate?: number | null
        }
        Update: {
          avatar?: string | null
          avg_headshots_percent?: number | null
          avg_kd_ratio?: number | null
          country?: string | null
          created_at?: string | null
          current_win_streak?: number | null
          faceit_elo?: number | null
          id?: string
          last_fetched_at?: string | null
          longest_win_streak?: number | null
          map_stats?: Json | null
          membership?: string | null
          nickname?: string
          player_id?: string
          recent_form?: string | null
          recent_form_string?: string | null
          recent_results?: Json | null
          skill_level?: number | null
          total_matches?: number | null
          total_wins?: number | null
          updated_at?: string | null
          win_rate?: number | null
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
      fantasy_round_picks: {
        Row: {
          bench_team: Json | null
          created_at: string
          id: string
          round_id: string
          submitted_at: string
          team_picks: Json
          total_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          bench_team?: Json | null
          created_at?: string
          id?: string
          round_id: string
          submitted_at?: string
          team_picks?: Json
          total_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          bench_team?: Json | null
          created_at?: string
          id?: string
          round_id?: string
          submitted_at?: string
          team_picks?: Json
          total_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fantasy_round_picks_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "fantasy_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      fantasy_round_scores: {
        Row: {
          clean_sweeps: number
          created_at: string
          current_score: number
          id: string
          last_updated: string
          map_wins: number
          match_wins: number
          matches_played: number
          round_id: string
          team_id: string
          team_name: string
          team_type: string
          tournaments_won: number
          user_id: string
        }
        Insert: {
          clean_sweeps?: number
          created_at?: string
          current_score?: number
          id?: string
          last_updated?: string
          map_wins?: number
          match_wins?: number
          matches_played?: number
          round_id: string
          team_id: string
          team_name: string
          team_type: string
          tournaments_won?: number
          user_id: string
        }
        Update: {
          clean_sweeps?: number
          created_at?: string
          current_score?: number
          id?: string
          last_updated?: string
          map_wins?: number
          match_wins?: number
          matches_played?: number
          round_id?: string
          team_id?: string
          team_name?: string
          team_type?: string
          tournaments_won?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fantasy_round_scores_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "fantasy_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      fantasy_round_star_teams: {
        Row: {
          change_used: boolean
          created_at: string
          id: string
          round_id: string
          star_team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          change_used?: boolean
          created_at?: string
          id?: string
          round_id: string
          star_team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          change_used?: boolean
          created_at?: string
          id?: string
          round_id?: string
          star_team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fantasy_rounds: {
        Row: {
          created_at: string
          end_date: string
          id: string
          start_date: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          start_date: string
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          start_date?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      fantasy_team_prices: {
        Row: {
          abandon_rate: number | null
          created_at: string
          id: string
          last_price_update: string
          match_volume: number | null
          price: number
          recent_win_rate: number | null
          round_id: string
          team_id: string
          team_name: string | null
          team_type: string
          updated_at: string
        }
        Insert: {
          abandon_rate?: number | null
          created_at?: string
          id?: string
          last_price_update?: string
          match_volume?: number | null
          price?: number
          recent_win_rate?: number | null
          round_id: string
          team_id: string
          team_name?: string | null
          team_type: string
          updated_at?: string
        }
        Update: {
          abandon_rate?: number | null
          created_at?: string
          id?: string
          last_price_update?: string
          match_volume?: number | null
          price?: number
          recent_win_rate?: number | null
          round_id?: string
          team_id?: string
          team_name?: string | null
          team_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      level_rewards: {
        Row: {
          amount: number | null
          id: string
          item_code: string | null
          level: number
          reward_type: string
          track: string
        }
        Insert: {
          amount?: number | null
          id?: string
          item_code?: string | null
          level: number
          reward_type: string
          track: string
        }
        Update: {
          amount?: number | null
          id?: string
          item_code?: string | null
          level?: number
          reward_type?: string
          track?: string
        }
        Relationships: [
          {
            foreignKeyName: "level_rewards_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: false
            referencedRelation: "reward_items"
            referencedColumns: ["code"]
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
        Relationships: []
      }
      match_notifications: {
        Row: {
          created_at: string
          id: string
          match_id: string
          match_start_time: string
          notification_sent: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          match_start_time: string
          notification_sent?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          match_start_time?: string
          notification_sent?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      missions: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string
          id: string
          kind: string
          target: number
          title: string
          xp_reward: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description: string
          id?: string
          kind: string
          target?: number
          title: string
          xp_reward?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string
          id?: string
          kind?: string
          target?: number
          title?: string
          xp_reward?: number
        }
        Relationships: []
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
      panda_team_head_to_head: {
        Row: {
          created_at: string | null
          draws: number
          id: string
          last_match_at: string | null
          match_id: number | null
          team_a_id: string
          team_a_wins: number
          team_b_id: string
          team_b_wins: number
          total_matches: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          draws?: number
          id?: string
          last_match_at?: string | null
          match_id?: number | null
          team_a_id: string
          team_a_wins?: number
          team_b_id: string
          team_b_wins?: number
          total_matches?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          draws?: number
          id?: string
          last_match_at?: string | null
          match_id?: number | null
          team_a_id?: string
          team_a_wins?: number
          team_b_id?: string
          team_b_wins?: number
          total_matches?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      pandascore_match_team_stats: {
        Row: {
          calculated_at: string
          created_at: string
          esport_type: string
          id: string
          last_10_matches_detail: Json | null
          league_performance: Json | null
          losses: number
          match_id: string
          recent_form: string | null
          recent_win_rate_30d: number | null
          team_id: string
          total_matches: number
          tournament_wins: number
          updated_at: string
          win_rate: number
          wins: number
        }
        Insert: {
          calculated_at?: string
          created_at?: string
          esport_type: string
          id?: string
          last_10_matches_detail?: Json | null
          league_performance?: Json | null
          losses?: number
          match_id: string
          recent_form?: string | null
          recent_win_rate_30d?: number | null
          team_id: string
          total_matches?: number
          tournament_wins?: number
          updated_at?: string
          win_rate?: number
          wins?: number
        }
        Update: {
          calculated_at?: string
          created_at?: string
          esport_type?: string
          id?: string
          last_10_matches_detail?: Json | null
          league_performance?: Json | null
          losses?: number
          match_id?: string
          recent_form?: string | null
          recent_win_rate_30d?: number | null
          team_id?: string
          total_matches?: number
          tournament_wins?: number
          updated_at?: string
          win_rate?: number
          wins?: number
        }
        Relationships: []
      }
      pandascore_matches: {
        Row: {
          created_at: string
          detailed_stats: boolean | null
          draw: boolean | null
          end_time: string | null
          esport_type: string
          forfeit: boolean | null
          id: string
          last_synced_at: string
          league_id: string | null
          league_name: string | null
          match_id: string
          match_type: string | null
          modified_at: string | null
          number_of_games: number | null
          original_scheduled_at: string | null
          raw_data: Json | null
          rescheduled: boolean | null
          row_id: number
          serie_id: string | null
          serie_name: string | null
          slug: string | null
          start_time: string
          status: string
          stream_url_1: string | null
          stream_url_2: string | null
          team_a_player_ids: Json | null
          team_b_player_ids: Json | null
          teams: Json
          tournament_id: string | null
          tournament_name: string | null
          updated_at: string
          videogame_id: string | null
          videogame_name: string | null
          winner_id: string | null
          winner_type: string | null
        }
        Insert: {
          created_at?: string
          detailed_stats?: boolean | null
          draw?: boolean | null
          end_time?: string | null
          esport_type: string
          forfeit?: boolean | null
          id?: string
          last_synced_at?: string
          league_id?: string | null
          league_name?: string | null
          match_id: string
          match_type?: string | null
          modified_at?: string | null
          number_of_games?: number | null
          original_scheduled_at?: string | null
          raw_data?: Json | null
          rescheduled?: boolean | null
          row_id?: number
          serie_id?: string | null
          serie_name?: string | null
          slug?: string | null
          start_time: string
          status?: string
          stream_url_1?: string | null
          stream_url_2?: string | null
          team_a_player_ids?: Json | null
          team_b_player_ids?: Json | null
          teams?: Json
          tournament_id?: string | null
          tournament_name?: string | null
          updated_at?: string
          videogame_id?: string | null
          videogame_name?: string | null
          winner_id?: string | null
          winner_type?: string | null
        }
        Update: {
          created_at?: string
          detailed_stats?: boolean | null
          draw?: boolean | null
          end_time?: string | null
          esport_type?: string
          forfeit?: boolean | null
          id?: string
          last_synced_at?: string
          league_id?: string | null
          league_name?: string | null
          match_id?: string
          match_type?: string | null
          modified_at?: string | null
          number_of_games?: number | null
          original_scheduled_at?: string | null
          raw_data?: Json | null
          rescheduled?: boolean | null
          row_id?: number
          serie_id?: string | null
          serie_name?: string | null
          slug?: string | null
          start_time?: string
          status?: string
          stream_url_1?: string | null
          stream_url_2?: string | null
          team_a_player_ids?: Json | null
          team_b_player_ids?: Json | null
          teams?: Json
          tournament_id?: string | null
          tournament_name?: string | null
          updated_at?: string
          videogame_id?: string | null
          videogame_name?: string | null
          winner_id?: string | null
          winner_type?: string | null
        }
        Relationships: []
      }
      pandascore_players_master: {
        Row: {
          active: boolean | null
          age: number | null
          birthday: string | null
          current_team: Json | null
          current_team_acronym: string | null
          current_team_id: number | null
          current_team_image_url: string | null
          current_team_location: string | null
          current_team_name: string | null
          current_team_slug: string | null
          current_videogame: Json | null
          first_name: string | null
          id: number
          image_url: string | null
          last_name: string | null
          modified_at: string | null
          name: string | null
          nationality: string | null
          role: string | null
          slug: string | null
          videogame_id: number | null
          videogame_name: string | null
        }
        Insert: {
          active?: boolean | null
          age?: number | null
          birthday?: string | null
          current_team?: Json | null
          current_team_acronym?: string | null
          current_team_id?: number | null
          current_team_image_url?: string | null
          current_team_location?: string | null
          current_team_name?: string | null
          current_team_slug?: string | null
          current_videogame?: Json | null
          first_name?: string | null
          id: number
          image_url?: string | null
          last_name?: string | null
          modified_at?: string | null
          name?: string | null
          nationality?: string | null
          role?: string | null
          slug?: string | null
          videogame_id?: number | null
          videogame_name?: string | null
        }
        Update: {
          active?: boolean | null
          age?: number | null
          birthday?: string | null
          current_team?: Json | null
          current_team_acronym?: string | null
          current_team_id?: number | null
          current_team_image_url?: string | null
          current_team_location?: string | null
          current_team_name?: string | null
          current_team_slug?: string | null
          current_videogame?: Json | null
          first_name?: string | null
          id?: number
          image_url?: string | null
          last_name?: string | null
          modified_at?: string | null
          name?: string | null
          nationality?: string | null
          role?: string | null
          slug?: string | null
          videogame_id?: number | null
          videogame_name?: string | null
        }
        Relationships: []
      }
      pandascore_sync_logs: {
        Row: {
          completed_at: string | null
          duration_ms: number | null
          error_details: Json | null
          error_message: string | null
          esport_type: string | null
          id: string
          metadata: Json | null
          records_added: number | null
          records_processed: number | null
          records_updated: number | null
          started_at: string
          status: string
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          duration_ms?: number | null
          error_details?: Json | null
          error_message?: string | null
          esport_type?: string | null
          id?: string
          metadata?: Json | null
          records_added?: number | null
          records_processed?: number | null
          records_updated?: number | null
          started_at?: string
          status: string
          sync_type: string
        }
        Update: {
          completed_at?: string | null
          duration_ms?: number | null
          error_details?: Json | null
          error_message?: string | null
          esport_type?: string | null
          id?: string
          metadata?: Json | null
          records_added?: number | null
          records_processed?: number | null
          records_updated?: number | null
          started_at?: string
          status?: string
          sync_type?: string
        }
        Relationships: []
      }
      pandascore_sync_state: {
        Row: {
          id: string
          last_match_id: number | null
          last_match_row_id: number | null
          last_page: number | null
          last_synced_at: string | null
          max_page: number | null
        }
        Insert: {
          id: string
          last_match_id?: number | null
          last_match_row_id?: number | null
          last_page?: number | null
          last_synced_at?: string | null
          max_page?: number | null
        }
        Update: {
          id?: string
          last_match_id?: number | null
          last_match_row_id?: number | null
          last_page?: number | null
          last_synced_at?: string | null
          max_page?: number | null
        }
        Relationships: []
      }
      pandascore_team_detailed_stats: {
        Row: {
          average_round_length: number | null
          created_at: string
          ct_side_win_rate: number | null
          current_roster: Json | null
          eco_round_win_rate: number | null
          esport_type: string
          id: string
          last_calculated_at: string
          major_wins: number | null
          map_stats: Json | null
          pistol_round_win_rate: number | null
          preferred_side: string | null
          prize_money: number | null
          recent_avg_rating: number | null
          recent_matches_count: number | null
          recent_win_rate: number | null
          roster_changes: Json | null
          save_round_win_rate: number | null
          t_side_win_rate: number | null
          team_id: string
          tier1_wins: number | null
          updated_at: string
        }
        Insert: {
          average_round_length?: number | null
          created_at?: string
          ct_side_win_rate?: number | null
          current_roster?: Json | null
          eco_round_win_rate?: number | null
          esport_type: string
          id?: string
          last_calculated_at?: string
          major_wins?: number | null
          map_stats?: Json | null
          pistol_round_win_rate?: number | null
          preferred_side?: string | null
          prize_money?: number | null
          recent_avg_rating?: number | null
          recent_matches_count?: number | null
          recent_win_rate?: number | null
          roster_changes?: Json | null
          save_round_win_rate?: number | null
          t_side_win_rate?: number | null
          team_id: string
          tier1_wins?: number | null
          updated_at?: string
        }
        Update: {
          average_round_length?: number | null
          created_at?: string
          ct_side_win_rate?: number | null
          current_roster?: Json | null
          eco_round_win_rate?: number | null
          esport_type?: string
          id?: string
          last_calculated_at?: string
          major_wins?: number | null
          map_stats?: Json | null
          pistol_round_win_rate?: number | null
          preferred_side?: string | null
          prize_money?: number | null
          recent_avg_rating?: number | null
          recent_matches_count?: number | null
          recent_win_rate?: number | null
          roster_changes?: Json | null
          save_round_win_rate?: number | null
          t_side_win_rate?: number | null
          team_id?: string
          tier1_wins?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      pandascore_team_stats: {
        Row: {
          created_at: string
          esport_type: string
          id: string
          last_calculated_at: string
          losses: number
          recent_form: string | null
          team_id: string
          total_matches: number
          tournament_wins: number
          updated_at: string
          win_rate: number
          wins: number
        }
        Insert: {
          created_at?: string
          esport_type: string
          id?: string
          last_calculated_at?: string
          losses?: number
          recent_form?: string | null
          team_id: string
          total_matches?: number
          tournament_wins?: number
          updated_at?: string
          win_rate?: number
          wins?: number
        }
        Update: {
          created_at?: string
          esport_type?: string
          id?: string
          last_calculated_at?: string
          losses?: number
          recent_form?: string | null
          team_id?: string
          total_matches?: number
          tournament_wins?: number
          updated_at?: string
          win_rate?: number
          wins?: number
        }
        Relationships: []
      }
      pandascore_teams: {
        Row: {
          acronym: string | null
          created_at: string
          esport_type: string
          id: string
          last_synced_at: string
          logo_url: string | null
          name: string
          players_data: Json | null
          raw_data: Json | null
          slug: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          acronym?: string | null
          created_at?: string
          esport_type: string
          id?: string
          last_synced_at?: string
          logo_url?: string | null
          name: string
          players_data?: Json | null
          raw_data?: Json | null
          slug?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          acronym?: string | null
          created_at?: string
          esport_type?: string
          id?: string
          last_synced_at?: string
          logo_url?: string | null
          name?: string
          players_data?: Json | null
          raw_data?: Json | null
          slug?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      pandascore_tournaments: {
        Row: {
          created_at: string
          end_date: string | null
          esport_type: string
          id: string
          image_url: string | null
          last_synced_at: string
          league_id: string | null
          league_name: string | null
          name: string
          raw_data: Json | null
          serie_id: string | null
          serie_name: string | null
          slug: string | null
          start_date: string | null
          status: string | null
          tournament_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          esport_type: string
          id?: string
          image_url?: string | null
          last_synced_at?: string
          league_id?: string | null
          league_name?: string | null
          name: string
          raw_data?: Json | null
          serie_id?: string | null
          serie_name?: string | null
          slug?: string | null
          start_date?: string | null
          status?: string | null
          tournament_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          esport_type?: string
          id?: string
          image_url?: string | null
          last_synced_at?: string
          league_id?: string | null
          league_name?: string | null
          name?: string
          raw_data?: Json | null
          serie_id?: string | null
          serie_name?: string | null
          slug?: string | null
          start_date?: string | null
          status?: string | null
          tournament_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_frame_id: string | null
          avatar_url: string | null
          bio: string | null
          country: string | null
          created_at: string
          full_name: string | null
          id: string
          last_login_at: string | null
          premium_pass: boolean
          streak_count: number
          updated_at: string
          username: string | null
          welcome_pack_claimed: boolean | null
        }
        Insert: {
          avatar_frame_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          last_login_at?: string | null
          premium_pass?: boolean
          streak_count?: number
          updated_at?: string
          username?: string | null
          welcome_pack_claimed?: boolean | null
        }
        Update: {
          avatar_frame_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          premium_pass?: boolean
          streak_count?: number
          updated_at?: string
          username?: string | null
          welcome_pack_claimed?: boolean | null
        }
        Relationships: []
      }
      purchases: {
        Row: {
          created_at: string
          id: string
          premium_active: boolean
          season_id: string
          stripe_customer_id: string | null
          stripe_session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          premium_active?: boolean
          season_id: string
          stripe_customer_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          premium_active?: boolean
          season_id?: string
          stripe_customer_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_items: {
        Row: {
          code: string
          id: string
          meta: Json
          name: string
          type: string
        }
        Insert: {
          code: string
          id?: string
          meta?: Json
          name: string
          type: string
        }
        Update: {
          code?: string
          id?: string
          meta?: Json
          name?: string
          type?: string
        }
        Relationships: []
      }
      round_credit_spend: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          round_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          round_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          round_id?: string
          user_id?: string
        }
        Relationships: []
      }
      season_rewards: {
        Row: {
          created_at: string
          id: string
          level_required: number
          reward_type: string
          reward_value: string
          season_id: string
          tier: string
        }
        Insert: {
          created_at?: string
          id?: string
          level_required: number
          reward_type: string
          reward_value: string
          season_id: string
          tier: string
        }
        Update: {
          created_at?: string
          id?: string
          level_required?: number
          reward_type?: string
          reward_value?: string
          season_id?: string
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_rewards_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          ends_at: string
          id: string
          name: string
          premium_price_cents: number
          starts_at: string
        }
        Insert: {
          ends_at: string
          id?: string
          name: string
          premium_price_cents?: number
          starts_at: string
        }
        Update: {
          ends_at?: string
          id?: string
          name?: string
          premium_price_cents?: number
          starts_at?: string
        }
        Relationships: []
      }
      sportdevs_matches: {
        Row: {
          best_of: number | null
          created_at: string
          esport_type: string
          id: string
          last_synced_at: string
          match_id: string
          raw_data: Json | null
          start_time: string
          status: string
          teams: Json
          tournament_id: string | null
          tournament_name: string | null
          updated_at: string
        }
        Insert: {
          best_of?: number | null
          created_at?: string
          esport_type: string
          id?: string
          last_synced_at?: string
          match_id: string
          raw_data?: Json | null
          start_time: string
          status?: string
          teams: Json
          tournament_id?: string | null
          tournament_name?: string | null
          updated_at?: string
        }
        Update: {
          best_of?: number | null
          created_at?: string
          esport_type?: string
          id?: string
          last_synced_at?: string
          match_id?: string
          raw_data?: Json | null
          start_time?: string
          status?: string
          teams?: Json
          tournament_id?: string | null
          tournament_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sportdevs_players: {
        Row: {
          created_at: string
          esport_type: string
          hash_image: string | null
          id: string
          image_url: string | null
          last_synced_at: string
          name: string
          player_id: string
          position: string | null
          raw_data: Json | null
          stats: Json | null
          team_id: string | null
          team_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          esport_type: string
          hash_image?: string | null
          id?: string
          image_url?: string | null
          last_synced_at?: string
          name: string
          player_id: string
          position?: string | null
          raw_data?: Json | null
          stats?: Json | null
          team_id?: string | null
          team_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          esport_type?: string
          hash_image?: string | null
          id?: string
          image_url?: string | null
          last_synced_at?: string
          name?: string
          player_id?: string
          position?: string | null
          raw_data?: Json | null
          stats?: Json | null
          team_id?: string | null
          team_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sportdevs_sync_logs: {
        Row: {
          completed_at: string | null
          duration_ms: number | null
          error_details: Json | null
          error_message: string | null
          esport_type: string | null
          id: string
          metadata: Json | null
          records_added: number | null
          records_processed: number | null
          records_updated: number | null
          started_at: string
          status: string
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          duration_ms?: number | null
          error_details?: Json | null
          error_message?: string | null
          esport_type?: string | null
          id?: string
          metadata?: Json | null
          records_added?: number | null
          records_processed?: number | null
          records_updated?: number | null
          started_at?: string
          status: string
          sync_type: string
        }
        Update: {
          completed_at?: string | null
          duration_ms?: number | null
          error_details?: Json | null
          error_message?: string | null
          esport_type?: string | null
          id?: string
          metadata?: Json | null
          records_added?: number | null
          records_processed?: number | null
          records_updated?: number | null
          started_at?: string
          status?: string
          sync_type?: string
        }
        Relationships: []
      }
      sportdevs_teams: {
        Row: {
          created_at: string
          esport_type: string
          hash_image: string | null
          id: string
          last_synced_at: string
          logo_url: string | null
          name: string
          players_data: Json | null
          raw_data: Json | null
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          esport_type: string
          hash_image?: string | null
          id?: string
          last_synced_at?: string
          logo_url?: string | null
          name: string
          players_data?: Json | null
          raw_data?: Json | null
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          esport_type?: string
          hash_image?: string | null
          id?: string
          last_synced_at?: string
          logo_url?: string | null
          name?: string
          players_data?: Json | null
          raw_data?: Json | null
          team_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sportdevs_tournaments: {
        Row: {
          created_at: string
          end_date: string | null
          esport_type: string
          hash_image: string | null
          id: string
          image_url: string | null
          last_synced_at: string
          name: string
          raw_data: Json | null
          start_date: string | null
          status: string | null
          tournament_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          esport_type: string
          hash_image?: string | null
          id?: string
          image_url?: string | null
          last_synced_at?: string
          name: string
          raw_data?: Json | null
          start_date?: string | null
          status?: string | null
          tournament_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          esport_type?: string
          hash_image?: string | null
          id?: string
          image_url?: string | null
          last_synced_at?: string
          name?: string
          raw_data?: Json | null
          start_date?: string | null
          status?: string | null
          tournament_id?: string
          updated_at?: string
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
      sync_checkpoints: {
        Row: {
          id: string
          last_page: number
        }
        Insert: {
          id: string
          last_page: number
        }
        Update: {
          id?: string
          last_page?: number
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
      user_equipped: {
        Row: {
          avatar_frame: string | null
          hud_theme: string | null
          profile_border: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_frame?: string | null
          hud_theme?: string | null
          profile_border?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_frame?: string | null
          hud_theme?: string | null
          profile_border?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_equipped_avatar_frame_fkey"
            columns: ["avatar_frame"]
            isOneToOne: false
            referencedRelation: "reward_items"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "user_equipped_hud_theme_fkey"
            columns: ["hud_theme"]
            isOneToOne: false
            referencedRelation: "reward_items"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "user_equipped_profile_border_fkey"
            columns: ["profile_border"]
            isOneToOne: false
            referencedRelation: "reward_items"
            referencedColumns: ["code"]
          },
        ]
      }
      user_events: {
        Row: {
          id: string
          kind: string
          occurred_at: string
          ref_id: string | null
          user_id: string
          xp_awarded: number
        }
        Insert: {
          id?: string
          kind: string
          occurred_at?: string
          ref_id?: string | null
          user_id: string
          xp_awarded?: number
        }
        Update: {
          id?: string
          kind?: string
          occurred_at?: string
          ref_id?: string | null
          user_id?: string
          xp_awarded?: number
        }
        Relationships: []
      }
      user_items: {
        Row: {
          acquired_via: string | null
          created_at: string | null
          id: string
          item_code: string
          quantity: number
          source_ref: Json | null
          user_id: string
        }
        Insert: {
          acquired_via?: string | null
          created_at?: string | null
          id?: string
          item_code: string
          quantity?: number
          source_ref?: Json | null
          user_id: string
        }
        Update: {
          acquired_via?: string | null
          created_at?: string | null
          id?: string
          item_code?: string
          quantity?: number
          source_ref?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_items_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: false
            referencedRelation: "reward_items"
            referencedColumns: ["code"]
          },
        ]
      }
      user_missions: {
        Row: {
          completed: boolean
          mission_id: string
          progress: number
          reset_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          mission_id: string
          progress?: number
          reset_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          mission_id?: string
          progress?: number
          reset_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_missions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          last_active_date: string | null
          level: number
          streak_count: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          last_active_date?: string | null
          level?: number
          streak_count?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          last_active_date?: string | null
          level?: number
          streak_count?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      user_rewards: {
        Row: {
          reward_id: string
          unlocked: boolean
          unlocked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          reward_id: string
          unlocked?: boolean
          unlocked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          reward_id?: string
          unlocked?: boolean
          unlocked_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_rewards_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "season_rewards"
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
      xp_rules: {
        Row: {
          kind: string
          xp: number
        }
        Insert: {
          kind: string
          xp: number
        }
        Update: {
          kind?: string
          xp?: number
        }
        Relationships: []
      }
    }
    Views: {
      pandascore_view_teams: {
        Row: {
          acronym: string | null
          created_at: string | null
          esport_type: string | null
          last_synced_at: string | null
          logo_url: string | null
          name: string | null
          original_id: string | null
          players_data: Json | null
          raw_data: Json | null
          slug: string | null
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          acronym?: string | null
          created_at?: string | null
          esport_type?: string | null
          last_synced_at?: string | null
          logo_url?: string | null
          name?: string | null
          original_id?: string | null
          players_data?: Json | null
          raw_data?: Json | null
          slug?: string | null
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          acronym?: string | null
          created_at?: string | null
          esport_type?: string | null
          last_synced_at?: string | null
          logo_url?: string | null
          name?: string | null
          original_id?: string | null
          players_data?: Json | null
          raw_data?: Json | null
          slug?: string | null
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_credit_balances: {
        Row: {
          balance: number | null
          kind: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_kind_fkey"
            columns: ["kind"]
            isOneToOne: false
            referencedRelation: "currency_kinds"
            referencedColumns: ["kind"]
          },
        ]
      }
    }
    Functions: {
      active_season_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      allocate_round_extra: {
        Args: { p_amount: number; p_round: string }
        Returns: boolean
      }
      award_xp: {
        Args: { p_kind: string; p_ref_id?: string }
        Returns: Json
      }
      bump_login_streak: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      calculate_fantasy_points: {
        Args:
          | {
              adr: number
              assists: number
              clutch_rounds: number
              deaths: number
              kills: number
              mvp_rounds: number
              scoring_config: Json
            }
          | { team_id: string }
        Returns: Json
      }
      faceit_get_match_counts_around_date: {
        Args: { target_date: string }
        Returns: {
          match_count: number
          match_date: string
          source: string
        }[]
      }
      get_all_faceit_teams: {
        Args: Record<PropertyKey, never>
        Returns: {
          game: string
          logo_url: string
          team_id: string
          team_name: string
        }[]
      }
      get_faceit_matches_around_date: {
        Args: { target_date: string }
        Returns: {
          auto_refresh_interval: number
          calculate_elo: boolean
          championship_raw_data: Json
          championship_stream_url: string
          competition_name: string
          competition_type: string
          configured_at: string
          created_at: string
          current_round: number
          economy_data: Json
          faceit_data: Json
          finished_at: string
          game: string
          id: string
          kill_feed: Json
          last_live_update: string
          live_player_status: Json
          live_team_scores: Json
          maps_played: Json
          match_date: string
          match_id: string
          match_phase: string
          objectives_status: Json
          organized_by: string
          overtime_rounds: number
          raw_data: Json
          region: string
          round_results: Json
          round_timer_seconds: number
          scheduled_at: string
          started_at: string
          status: string
          teams: Json
          updated_at: string
          version: number
          voting: Json
        }[]
      }
      get_faceit_teams_prev_window_stats: {
        Args: { end_ts: string; start_ts: string }
        Returns: {
          matches_played: number
          missed_pct: number
          team_id: string
          team_name: string
        }[]
      }
      get_head_to_head_stats: {
        Args: { team1_id: string; team2_id: string }
        Returns: Json
      }
      get_pandascore_matches_around_date: {
        Args: { target_date: string }
        Returns: {
          created_at: string
          detailed_stats: boolean
          draw: boolean
          end_time: string
          esport_type: string
          forfeit: boolean
          id: string
          last_synced_at: string
          league_id: string
          league_name: string
          match_date: string
          match_id: string
          match_type: string
          modified_at: string
          number_of_games: number
          original_scheduled_at: string
          raw_data: Json
          rescheduled: boolean
          row_id: number
          serie_id: string
          serie_name: string
          slug: string
          start_time: string
          status: string
          stream_url_1: string
          stream_url_2: string
          team_a_player_ids: Json
          team_b_player_ids: Json
          teams: Json
          tournament_id: string
          tournament_name: string
          updated_at: string
          videogame_id: string
          videogame_name: string
          winner_id: string
          winner_type: string
        }[]
      }
      get_pandascore_player_details: {
        Args: { p_player_id: number }
        Returns: Json
      }
      get_star_team_state: {
        Args: { p_round_id: string }
        Returns: Json
      }
      get_team_stats: {
        Args: { team_id: string }
        Returns: Json
      }
      get_team_stats_optimized: {
        Args: { team_id: string }
        Returns: Json
      }
      grant_credits: {
        Args: {
          p_amount: number
          p_reason: string
          p_ref_id?: string
          p_ref_type?: string
          p_user: string
        }
        Returns: undefined
      }
      grant_level_rewards: {
        Args: { p_level: number; p_user: string }
        Returns: Json
      }
      increment_xp: {
        Args: { p_user_id: string; p_xp: number }
        Returns: undefined
      }
      level_for_xp: {
        Args: { x: number }
        Returns: number
      }
      next_daily_reset_utc: {
        Args: { ts?: string }
        Returns: string
      }
      next_weekly_reset_utc: {
        Args: { ts?: string }
        Returns: string
      }
      pandascore_get_match_counts_around_date: {
        Args: { target_date: string }
        Returns: {
          match_count: number
          match_date: string
          source: string
        }[]
      }
      progress_mission: {
        Args: { p_code: string; p_inc?: number }
        Returns: Json
      }
      seed_user_missions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      set_premium_pass: {
        Args: { p_active: boolean; p_user: string }
        Returns: undefined
      }
      set_star_team: {
        Args: { p_round_id: string; p_team_id: string }
        Returns: Json
      }
      spend_credits: {
        Args: {
          p_amount: number
          p_reason: string
          p_ref_id: string
          p_ref_type: string
          p_user: string
        }
        Returns: boolean
      }
      update_expired_fantasy_rounds: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      update_my_profile: {
        Args: {
          p_avatar_url?: string
          p_bio?: string
          p_country?: string
          p_full_name?: string
          p_username?: string
        }
        Returns: {
          avatar_frame_id: string | null
          avatar_url: string | null
          bio: string | null
          country: string | null
          created_at: string
          full_name: string | null
          id: string
          last_login_at: string | null
          premium_pass: boolean
          streak_count: number
          updated_at: string
          username: string | null
          welcome_pack_claimed: boolean | null
        }
      }
      update_panda_team_head_to_head: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
      cs2_position: ["IGL", "AWPer", "Entry Fragger", "Support", "Lurker"],
      tournament_status: ["upcoming", "active", "completed", "cancelled"],
    },
  },
} as const
