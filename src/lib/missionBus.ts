import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// MissionBus centralizes mission progress calls with basic idempotency
// and once-per-day guards. All methods swallow errors and never throw.

const inflight = new Map<string, number>();
const DEBOUNCE_MS = 2000;

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function monthStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function setOnceKey(key: string) {
  try { localStorage.setItem(key, '1'); } catch (_) {}
}
function hasOnceKey(key: string) {
  try { return localStorage.getItem(key) === '1'; } catch (_) { return false; }
}

async function callProgress(code: string, inc: number) {
  try {
    const now = Date.now();
    const last = inflight.get(code) || 0;
    if (now - last < DEBOUNCE_MS) return;
    inflight.set(code, now);

    const { data, error } = await (supabase.rpc as any)('progress_mission', {
      p_code: code,
      p_inc: inc
    });

    if (error) {
      // Ignore auth errors silently
      if (String(error.message || '').toLowerCase().includes('not authenticated')) return;
      console.warn('[MissionBus] progress failed', code, error);
      return;
    }

    const result = (data || {}) as { completed?: boolean; completedNow?: boolean; title?: string };

    // Auto-chain weekly for daily completions
    if (code.startsWith('d_') && result.completed) {
      // Weekly: 5 dailies
      await (supabase.rpc as any)('progress_mission', { p_code: 'w_5_dailies', p_inc: 1 }).catch(() => {});
    }

    // Optional subtle toast when a mission completes now
    if (result.completedNow) {
      toast.success('Mission complete ✅');
    }
  } catch (e) {
    console.warn('[MissionBus] progress exception', code, e);
  }
}

export const MissionBus = {
  async safeProgress(code: string, inc: number = 1): Promise<void> {
    return callProgress(code, inc);
  },

  async oncePerDay(code: string, fn: () => Promise<void>): Promise<void> {
    const key = `msn:${code}:${todayStr()}`;
    if (hasOnceKey(key)) return;
    await fn();
    setOnceKey(key);
  },

  // Allow custom keys (e.g., share per round)
  async oncePerDayKey(keyBase: string, fn: () => Promise<void>): Promise<void> {
    const key = `msn:${keyBase}:${todayStr()}`;
    if (hasOnceKey(key)) return;
    await fn();
    setOnceKey(key);
  },

  // Track joined types for same-day detection (daily + weekly)
  recordJoinType(type: 'daily' | 'weekly' | 'monthly') {
    try {
      const key = `msn:joined-types:${todayStr()}`;
      const raw = localStorage.getItem(key);
      const set = new Set<string>(raw ? JSON.parse(raw) : []);
      if (!set.has(type)) {
        set.add(type);
        localStorage.setItem(key, JSON.stringify(Array.from(set)));
        
        // Check for completion AFTER adding the new type
        if (set.has('daily') && set.has('weekly') && !hasOnceKey(`msn:dw:${todayStr()}`)) {
          this.safeProgress('d_play_daily_weekly');
          setOnceKey(`msn:dw:${todayStr()}`);
        }
      }
    } catch (e) {
      // noop
    }
  },

  // Track joined types per month for seasonal mission
  recordJoinTypeMonth(type: 'daily' | 'weekly' | 'monthly') {
    try {
      const key = `msn:month-types:${monthStr()}`;
      const raw = localStorage.getItem(key);
      const set = new Set<string>(raw ? JSON.parse(raw) : []);
      
      if (!set.has(type)) {
        set.add(type);
        localStorage.setItem(key, JSON.stringify(Array.from(set)));
        
        // If all 3 types are now present, increment mission once per month
        if (set.size === 3 && !hasOnceKey(`msn:month-all-types:${monthStr()}`)) {
          this.safeProgress('s_round_types_each_month');
          setOnceKey(`msn:month-all-types:${monthStr()}`);
        }
      }
    } catch (e) {
      // noop
    }
  },

  // Daily
  onAppOpen() { return this.oncePerDay('d_login', () => this.safeProgress('d_login')); },
  onSubmitLineup() { return this.safeProgress('d_submit_lineup'); },
  onLineupHasThree() { return this.safeProgress('d_pick3', 3); },
  onLineupHasAmateur() { return this.safeProgress('d_pick_amateur'); },
  onStarTeamChosen() { return this.safeProgress('d_star_team'); },
  onOpenProfileSheet() { return this.safeProgress('d_check_progress'); },
  onShareLineup(roundId?: string) {
    if (roundId) {
      return this.oncePerDayKey(`share:${roundId}`, () => this.safeProgress('d_share_lineup'));
    }
    return this.oncePerDay('d_share_lineup', () => this.safeProgress('d_share_lineup'));
  },
  onJoinedDailyAndWeeklySameDay() { return this.safeProgress('d_play_daily_weekly'); },

  // Weekly
  onDailyCompleted() { return this.safeProgress('w_5_dailies'); },
  onJoinRoundAny() { return this.safeProgress('w_join3_rounds'); },
  onConsecutiveDayStreak(streakCount: number) {
    // Progress based on current streak (1, 2, or 3 days)
    if (streakCount >= 1 && streakCount <= 3) {
      return this.safeProgress('w_3_consec_days', streakCount);
    }
  },
  onLineupHasThreeAmateurs() { return this.safeProgress('w_3_amateurs'); },
  onLineupHasThreePros() { return this.safeProgress('w_3_pros'); },
  onShareThisWeek() { return this.safeProgress('w_share2'); },
  onStarTopAfterResults() { return this.safeProgress('w_star_top'); },

  // Monthly (simple; gating can be applied by caller if desired)
  onM1_SubmitLineup() { return this.safeProgress('m1_submit15'); },
  onM1_LoginDay() { return this.safeProgress('m1_login10'); },
  onM1_XP(xp: number) { return this.safeProgress('m1_earn1000', Math.max(0, Math.floor(xp || 0))); },

  onM2_JoinedType() { return this.safeProgress('m2_all_round_types'); },
  onM2_BadgeEarned() { return this.safeProgress('m2_earn3_badges'); },
  onM2_Share() { return this.safeProgress('m2_share5'); },

  // Seasonal
  async onDailyCompletedSeasonal() {
    // Track completed daily missions and check 70% threshold
    const key = `msn:season-dailies:${monthStr()}`;
    try {
      const raw = localStorage.getItem(key);
      const completed = raw ? parseInt(raw) : 0;
      const newCount = completed + 1;
      localStorage.setItem(key, newCount.toString());
      
      // Assuming ~5 daily missions available per day * 90 days = 450 total
      // 70% = 315 missions. Adjust based on actual season length.
      const seasonTarget = 315;
      const threshold = Math.floor(seasonTarget * 0.7);
      
      if (newCount >= threshold && !hasOnceKey(`msn:season-70pct`)) {
        await this.safeProgress('s_70pct_dailies');
        setOnceKey(`msn:season-70pct`);
      }
    } catch (e) {
      // noop
    }
  },
  onSeasonXP(xp: number) { return this.safeProgress('s_earn2000', Math.max(0, Math.floor(xp || 0))); },
  onTop25Placement() { return this.safeProgress('s_top25_once'); },

  // New mission trackers
  async onDailyMissionCompleted() { 
    await this.safeProgress('d_complete2');
    // Track for seasonal 70% dailies mission
    await this.onDailyCompletedSeasonal();
  },
  onDailyXP(xp: number) { return this.safeProgress('d_earn50xp', Math.max(0, Math.floor(xp || 0))); },
  
  // Combo tracker: Call when XP is earned to track daily, monthly, and seasonal
  onXPEarned(xp: number) {
    const amount = Math.max(0, Math.floor(xp || 0));
    this.onDailyXP(amount);
    this.onM1_XP(amount);
    this.onSeasonXP(amount);
  },

  // Weekly missions
  onWeeklyStreak() { 
    return this.oncePerDay('weekly_streak5', () => this.safeProgress('weekly_streak5')); 
  },
  onWeeklyTop50() { 
    return this.oncePerDay('w_top50', () => this.safeProgress('w_top50')); 
  },
};
