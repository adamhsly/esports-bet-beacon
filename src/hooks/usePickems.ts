import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  fetchSlates,
  fetchAllSlatesAdmin,
  fetchSlate,
  fetchSlateMatches,
  fetchUserEntry,
  fetchLeaderboard,
} from '@/lib/pickems';

export function useSlates() {
  return useQuery({ queryKey: ['pickems', 'slates'], queryFn: fetchSlates });
}

export function useUserSubmittedSlateIds(userId: string | undefined) {
  return useQuery({
    queryKey: ['pickems', 'user-submitted-slates', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pickems_entries')
        .select('slate_id')
        .eq('user_id', userId!)
        .not('submitted_at', 'is', null);
      if (error) throw error;
      return new Set((data ?? []).map((r: any) => r.slate_id as string));
    },
  });
}

export function useAllSlatesAdmin() {
  return useQuery({ queryKey: ['pickems', 'slates', 'admin'], queryFn: fetchAllSlatesAdmin });
}

export function useSlate(slateId: string | undefined) {
  return useQuery({
    queryKey: ['pickems', 'slate', slateId],
    queryFn: () => fetchSlate(slateId!),
    enabled: !!slateId,
  });
}

export function useSlateMatches(slateId: string | undefined) {
  return useQuery({
    queryKey: ['pickems', 'slate-matches', slateId],
    queryFn: () => fetchSlateMatches(slateId!),
    enabled: !!slateId,
    refetchInterval: 60_000,
  });
}

export function useUserEntry(slateId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['pickems', 'entry', slateId, userId],
    queryFn: () => fetchUserEntry(slateId!, userId!),
    enabled: !!slateId && !!userId,
  });
}

export function useLeaderboard(slateId: string | undefined) {
  return useQuery({
    queryKey: ['pickems', 'leaderboard', slateId],
    queryFn: () => fetchLeaderboard(slateId!),
    enabled: !!slateId,
    refetchInterval: 60_000,
  });
}

export function useSubmitPicks(slateId: string | undefined, userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (picks: { match_id: string; picked_team_id: string }[]) => {
      const { data, error } = await supabase.functions.invoke('pickems-submit-picks', {
        body: { slate_id: slateId, picks },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pickems', 'entry', slateId, userId] });
      qc.invalidateQueries({ queryKey: ['pickems', 'leaderboard', slateId] });
    },
  });
}
