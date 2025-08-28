import { useMemo } from 'react';
import { useMissions } from '@/hooks/useSupabaseData';
import { useAuthUser } from '@/hooks/useAuthUser';
import { monthWindow } from '@/lib/season';
import { pickDaily } from '@/lib/pickDaily';

export interface FilteredMissions {
  daily: any[];
  weekly: any[];
  monthly: any[];
  seasonal: any[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useMissionsFiltered = (showCompleted: boolean = false): FilteredMissions => {
  const { missions, loading, error, refetch } = useMissions();
  const { user } = useAuthUser();

  const filtered = useMemo(() => {
    if (!user || !missions.length) {
      return {
        daily: [],
        weekly: [],
        monthly: [],
        seasonal: []
      };
    }

    // Filter by completion status
    const visibleMissions = showCompleted 
      ? missions 
      : missions.filter(m => !m.completed);

    // Group by kind
    const allMissions = visibleMissions;
    const dailyMissions = allMissions.filter(m => m.kind === 'daily');
    const weeklyMissions = allMissions.filter(m => m.kind === 'weekly');
    const seasonalMissions = allMissions.filter(m => m.kind === 'seasonal');
    
    // Monthly missions filtered by current window
    const currentWindow = monthWindow();
    const monthlyMissions = allMissions.filter(m => 
      m.kind === 'monthly' && m.code.startsWith(`${currentWindow}_`)
    );

    // Pick 4 deterministic daily missions
    const selectedDailyCodes = pickDaily(user.id, missions.filter(m => m.kind === 'daily'));
    const selectedDaily = dailyMissions.filter(m => selectedDailyCodes.includes(m.code));

    // Sort function: in-progress first (by progress %), then not-started (by target)
    const sortMissions = (a: any, b: any) => {
      const aProgress = a.progress / Math.max(1, a.target);
      const bProgress = b.progress / Math.max(1, b.target);
      
      const aInProgress = a.progress > 0 && !a.completed;
      const bInProgress = b.progress > 0 && !b.completed;
      
      // In-progress missions first
      if (aInProgress && !bInProgress) return -1;
      if (!aInProgress && bInProgress) return 1;
      
      // Within in-progress: sort by progress descending
      if (aInProgress && bInProgress) {
        return bProgress - aProgress;
      }
      
      // Within not-started: sort by target ascending
      return a.target - b.target;
    };

    return {
      daily: selectedDaily.sort(sortMissions),
      weekly: weeklyMissions.sort(sortMissions),
      monthly: monthlyMissions.sort(sortMissions),
      seasonal: seasonalMissions.sort(sortMissions)
    };
  }, [missions, user, showCompleted]);

  return {
    ...filtered,
    loading,
    error,
    refetch
  };
};