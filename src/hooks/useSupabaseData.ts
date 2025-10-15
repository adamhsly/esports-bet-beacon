import { useState, useEffect, useCallback } from 'react';
import { supabaseUnsafe as supabase } from '@/integrations/supabase/unsafeClient';
import { useAuthUser } from './useAuthUser';
import { useToast } from './use-toast';

interface Season {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  premium_price_cents: number;
}

interface UserProgress {
  user_id: string;
  xp: number;
  level: number;
  streak_count: number;
  last_active_date: string;
  updated_at: string;
}

interface Mission {
  id: string;
  code: string;
  kind: 'daily' | 'weekly' | 'monthly' | 'seasonal';
  title: string;
  description: string;
  xp_reward: number;
  target: number;
  active: boolean;
  progress: number;
  completed: boolean;
  reset_at?: string;
}

interface SeasonReward {
  id: string;
  season_id: string;
  tier: 'free' | 'premium';
  level_required: number;
  reward_type: string;
  reward_value: string;
  unlocked: boolean;
}

interface Purchase {
  id: string;
  user_id: string;
  season_id: string;
  premium_active: boolean;
}

// Season hook
export const useSeason = () => {
  const [season, setSeason] = useState<Season | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSeason = async () => {
      try {
        const { data, error } = await supabase
          .from('seasons')
          .select('*')
          .lte('starts_at', new Date().toISOString())
          .gte('ends_at', new Date().toISOString())
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        setSeason(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSeason();
  }, []);

  return { season, loading, error };
};

// User progress hook
export const useProgress = () => {
  const { user } = useAuthUser();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setProgress(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  // Set up realtime subscription with optimized dependency
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user_progress_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_progress',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchProgress();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchProgress]);

  return { 
    progress, 
    loading, 
    error,
    refetch: fetchProgress,
    xp: progress?.xp || 0,
    level: progress?.level || 1,
    streak_count: progress?.streak_count || 0,
    last_active_date: progress?.last_active_date
  };
};

// Missions hook
export const useMissions = () => {
  const { user } = useAuthUser();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMissions = useCallback(async () => {
    if (!user) return;

    try {
      // First, seed missions if needed
      await supabase.rpc('seed_user_missions');

      const { data, error } = await supabase
        .from('missions')
        .select(`
          id,
          code,
          kind,
          title,
          description,
          xp_reward,
          target,
          active,
          user_missions!inner(
            progress,
            completed,
            reset_at
          )
        `)
        .eq('active', true)
        .eq('user_missions.user_id', user.id);

      if (error) throw error;

      const formattedMissions = data.map((mission: any) => ({
        ...mission,
        progress: mission.user_missions[0]?.progress || 0,
        completed: mission.user_missions[0]?.completed || false,
        reset_at: mission.user_missions[0]?.reset_at
      }));

      setMissions(formattedMissions);
    } catch (err: any) {
      console.error('Error loading missions:', err.message);
      setError(err.message);
      // Don't show toast on every error to prevent spam
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchMissions();
    }
  }, [user, fetchMissions]);

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user_missions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_missions',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchMissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchMissions]);

  return { 
    missions, 
    loading, 
    error,
    refetch: fetchMissions,
    dailyMissions: missions.filter(m => m.kind === 'daily'),
    weeklyMissions: missions.filter(m => m.kind === 'weekly')
  };
};

// Season rewards hook
export const useRewards = () => {
  const { user } = useAuthUser();
  const { season } = useSeason();
  const [rewards, setRewards] = useState<SeasonReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRewards = useCallback(async () => {
    if (!user || !season) return;

    try {
      const { data, error } = await supabase
        .from('season_rewards')
        .select(`
          *,
          user_rewards(unlocked, unlocked_at)
        `)
        .eq('season_id', season.id)
        .order('level_required');

      if (error) throw error;

      const formattedRewards = data.map((reward: any) => ({
        ...reward,
        unlocked: reward.user_rewards[0]?.unlocked || false
      }));

      setRewards(formattedRewards);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, season]);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  // Set up realtime subscription with optimized dependency
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user_rewards_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_rewards',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchRewards();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchRewards]);

  return { 
    rewards, 
    loading, 
    error,
    refetch: fetchRewards,
    freeRewards: rewards.filter(r => r.tier === 'free'),
    premiumRewards: rewards.filter(r => r.tier === 'premium')
  };
};

// User entitlement hook
export const useEntitlement = () => {
  const { user } = useAuthUser();
  const [premiumActive, setPremiumActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntitlement = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('premium_pass')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setPremiumActive(data?.premium_pass || false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEntitlement();
  }, [fetchEntitlement]);

  // Set up realtime subscription for profile changes with optimized dependency
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('profile_premium_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        () => {
          fetchEntitlement();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchEntitlement]);

  return { 
    premiumActive, 
    loading, 
    error,
    hasPremium: premiumActive
  };
};