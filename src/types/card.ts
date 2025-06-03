
export interface PlayerCard {
  id: string;
  card_id: string;
  player_id: string;
  player_name: string;
  player_type: string;
  position: string;
  team_name?: string;
  game: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  stats: {
    kills?: number;
    deaths?: number;
    assists?: number;
    adr?: number;
    kd_ratio?: number;
    headshots?: number;
    [key: string]: any;
  };
  metadata: {
    image_url?: string;
    description?: string;
    performance_grade?: string;
    [key: string]: any;
  };
  owner_wallet?: string;
  token_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CardTemplate {
  id: string;
  template_name: string;
  game: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  stat_multipliers: Record<string, number>;
  visual_properties: {
    border_color: string;
    background: string;
    [key: string]: any;
  };
  min_performance_threshold: Record<string, number>;
}

export interface Pack {
  id: string;
  pack_type: 'starter' | 'premium' | 'legendary' | 'special';
  pack_price: number;
  cards_received: PlayerCard[];
  is_opened: boolean;
  opened_at?: string;
  pack_contents?: any[];
}

export interface CardTransaction {
  id: string;
  card_id: string;
  from_user_id?: string;
  to_user_id?: string;
  transaction_type: 'mint' | 'transfer' | 'trade' | 'purchase';
  price?: number;
  transaction_hash?: string;
  created_at: string;
}
