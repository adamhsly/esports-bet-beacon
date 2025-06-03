
export interface MarketplaceListing {
  id: string;
  seller_user_id: string;
  card_id: string;
  listing_type: 'sale' | 'trade' | 'auction';
  price?: number;
  trade_requirements?: Record<string, any>;
  listing_status: 'active' | 'sold' | 'cancelled' | 'expired';
  description?: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface CardTrade {
  id: string;
  marketplace_listing_id?: string;
  proposer_user_id: string;
  receiver_user_id: string;
  proposed_cards: string[];
  requested_cards: string[];
  trade_status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed';
  proposal_message?: string;
  created_at: string;
  updated_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_type: string;
  achievement_name: string;
  achievement_description?: string;
  achievement_data: Record<string, any>;
  earned_at: string;
  season_earned?: string;
}

export interface UserFriend {
  id: string;
  user_id: string;
  friend_id: string;
  friendship_status: 'pending' | 'accepted' | 'blocked';
  requested_at: string;
  accepted_at?: string;
}
