import { supabase } from '@/integrations/supabase/client';

export interface PrivateRoundConfig {
  round_name: string;
  start_date: string;
  end_date: string;
  budget_cap?: number;
  game_type?: string;
  game_source?: 'pro' | 'amateur' | 'both';
}

export interface CreateRoundResponse {
  success: boolean;
  round: any;
  join_code: string;
}

export interface JoinRoundResponse {
  success: boolean;
  round: any;
  error?: string;
}

export async function createPrivateRound(config: PrivateRoundConfig): Promise<CreateRoundResponse> {
  const { data, error } = await supabase.functions.invoke('create-private-round', {
    body: config,
  });

  if (error) {
    console.error('Error creating private round:', error);
    throw new Error(error.message || 'Failed to create private round');
  }

  return data;
}

export async function joinPrivateRound(code: string): Promise<JoinRoundResponse> {
  const { data, error } = await supabase.functions.invoke('join-private-round', {
    body: { code },
  });

  if (error) {
    console.error('Error joining private round:', error);
    throw new Error(error.message || 'Failed to join private round');
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}
