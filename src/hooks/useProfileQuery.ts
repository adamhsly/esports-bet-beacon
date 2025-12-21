import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from './useAuthUser';
import { useEffect } from 'react';

export interface ProfileData {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  avatar_frame_id?: string;
  avatar_border_id?: string;
  country?: string;
  bio?: string;
  premium_pass?: boolean;
}

/**
 * Unified profile hook using React Query for caching.
 * Includes premium_pass status to avoid separate entitlement calls.
 * Caches for 5 minutes and uses realtime subscription for updates.
 */
export const useProfileQuery = () => {
  const { user, isAuthenticated } = useAuthUser();
  const queryClient = useQueryClient();

  const queryKey = ['profile', user?.id];

  const { data: profile, isLoading: loading, error, refetch } = useQuery({
    queryKey,
    queryFn: async (): Promise<ProfileData | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, avatar_frame_id, avatar_border_id, country, bio, premium_pass')
        .eq('id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes - reduces refetches
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });

  // Set up realtime subscription for profile changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`profile_changes_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        () => {
          // Invalidate the cache to trigger refetch
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return {
    profile,
    loading,
    error: error?.message || null,
    refetch,
    // Convenience accessors for premium status
    premiumActive: profile?.premium_pass ?? false,
    hasPremium: profile?.premium_pass ?? false,
  };
};
