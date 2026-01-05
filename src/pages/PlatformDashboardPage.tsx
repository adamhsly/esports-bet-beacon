import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Shield, Users, DollarSign, TrendingUp, LogIn, Trophy, Calendar, Clock, CreditCard, Gift } from 'lucide-react';
import { PaidRoundsParticipants } from '@/components/admin/PaidRoundsParticipants';
import { format, subDays, subWeeks, subMonths, startOfDay, startOfWeek, startOfMonth, eachDayOfInterval } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { cn } from '@/lib/utils';

interface PeriodStats {
  newUsers: number;
  realRoundParticipants: number;
  roundEntryRealRevenue: number;
  roundEntryBonusUsed: number;
  freeRoundEntries: number;
  paidRoundEntries: number;
  battlePassRevenue: number;
  successfulLogins: number;
  voucherPrizesPaid: number;
  creditPrizesPaid: number;
}

interface DailyDataPoint {
  date: string;
  displayDate: string;
  newUsers: number;
  freeRoundEntries: number;
  paidRoundEntries: number;
  successfulLogins: number;
  roundEntryRealRevenue: number;
  roundEntryBonusUsed: number;
  battlePassRevenue: number;
  voucherPrizesPaid: number;
  creditPrizesPaid: number;
}

type MetricKey = 'newUsers' | 'freeRoundEntries' | 'paidRoundEntries' | 'successfulLogins' | 
  'roundEntryRealRevenue' | 'roundEntryBonusUsed' | 'battlePassRevenue' | 'voucherPrizesPaid' | 'creditPrizesPaid' | 'totalRevenue';

interface StatConfig {
  key: MetricKey;
  label: string;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  chartColor: string;
  isCurrency?: boolean;
  getValue: (stats: PeriodStats) => number;
}

const PlatformDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [selectedMetric, setSelectedMetric] = useState<MetricKey | null>(null);
  const [dailyData, setDailyData] = useState<DailyDataPoint[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  
  const [dailyStats, setDailyStats] = useState<PeriodStats>({ newUsers: 0, realRoundParticipants: 0, roundEntryRealRevenue: 0, roundEntryBonusUsed: 0, freeRoundEntries: 0, paidRoundEntries: 0, battlePassRevenue: 0, successfulLogins: 0, voucherPrizesPaid: 0, creditPrizesPaid: 0 });
  const [weeklyStats, setWeeklyStats] = useState<PeriodStats>({ newUsers: 0, realRoundParticipants: 0, roundEntryRealRevenue: 0, roundEntryBonusUsed: 0, freeRoundEntries: 0, paidRoundEntries: 0, battlePassRevenue: 0, successfulLogins: 0, voucherPrizesPaid: 0, creditPrizesPaid: 0 });
  const [monthlyStats, setMonthlyStats] = useState<PeriodStats>({ newUsers: 0, realRoundParticipants: 0, roundEntryRealRevenue: 0, roundEntryBonusUsed: 0, freeRoundEntries: 0, paidRoundEntries: 0, battlePassRevenue: 0, successfulLogins: 0, voucherPrizesPaid: 0, creditPrizesPaid: 0 });
  
  const [allTimeStats, setAllTimeStats] = useState({
    totalUsers: 0,
    totalRealUsers: 0,
    totalRealRevenue: 0,
    totalBonusUsed: 0,
    totalFreeRoundEntries: 0,
    totalPaidRoundEntries: 0,
    totalVoucherPrizesPaid: 0,
    totalCreditPrizesPaid: 0,
  });

  const statConfigs: StatConfig[] = useMemo(() => [
    { key: 'newUsers', label: 'New Users', icon: <Users className="h-4 w-4" />, color: 'text-emerald-400', borderColor: 'border-emerald-500/30', chartColor: '#10b981', getValue: (s) => s.newUsers },
    { key: 'freeRoundEntries', label: 'Free Entries', icon: <Trophy className="h-4 w-4" />, color: 'text-blue-400', borderColor: 'border-blue-500/30', chartColor: '#3b82f6', getValue: (s) => s.freeRoundEntries },
    { key: 'paidRoundEntries', label: 'Paid Entries', icon: <Trophy className="h-4 w-4" />, color: 'text-cyan-400', borderColor: 'border-cyan-500/30', chartColor: '#06b6d4', getValue: (s) => s.paidRoundEntries },
    { key: 'successfulLogins', label: 'Logins', icon: <LogIn className="h-4 w-4" />, color: 'text-yellow-400', borderColor: 'border-yellow-500/30', chartColor: '#eab308', getValue: (s) => s.successfulLogins },
    { key: 'roundEntryRealRevenue', label: 'Real Revenue', icon: <DollarSign className="h-4 w-4" />, color: 'text-green-400', borderColor: 'border-green-500/30', chartColor: '#22c55e', isCurrency: true, getValue: (s) => s.roundEntryRealRevenue },
    { key: 'roundEntryBonusUsed', label: 'Bonus Used', icon: <CreditCard className="h-4 w-4" />, color: 'text-orange-400', borderColor: 'border-orange-500/30', chartColor: '#f97316', isCurrency: true, getValue: (s) => s.roundEntryBonusUsed },
    { key: 'battlePassRevenue', label: 'Battle Pass', icon: <CreditCard className="h-4 w-4" />, color: 'text-purple-400', borderColor: 'border-purple-500/30', chartColor: '#a855f7', isCurrency: true, getValue: (s) => s.battlePassRevenue },
    { key: 'voucherPrizesPaid', label: 'Vouchers Paid', icon: <Gift className="h-4 w-4" />, color: 'text-red-400', borderColor: 'border-red-500/30', chartColor: '#ef4444', isCurrency: true, getValue: (s) => s.voucherPrizesPaid },
    { key: 'creditPrizesPaid', label: 'Credits Paid', icon: <CreditCard className="h-4 w-4" />, color: 'text-pink-400', borderColor: 'border-pink-500/30', chartColor: '#ec4899', getValue: (s) => s.creditPrizesPaid },
    { key: 'totalRevenue', label: 'Total Revenue', icon: <TrendingUp className="h-4 w-4" />, color: 'text-emerald-400', borderColor: 'border-emerald-500/30', chartColor: '#10b981', isCurrency: true, getValue: (s) => s.roundEntryRealRevenue + s.battlePassRevenue },
  ], []);

  // Check admin role
  useEffect(() => {
    const checkAdminRole = async () => {
      if (authLoading) return;

      if (!user) {
        setCheckingAdmin(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        if (error) {
          console.error('Error checking admin role:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(data === true);
        }
      } catch (err) {
        console.error('Error checking admin role:', err);
        setIsAdmin(false);
      } finally {
        setCheckingAdmin(false);
      }
    };

    checkAdminRole();
  }, [user, authLoading]);

  // Redirect non-admins
  useEffect(() => {
    if (authLoading) return;
    
    if (!checkingAdmin && !user) {
      navigate('/auth');
    } else if (!checkingAdmin && isAdmin === false) {
      toast.error('Access denied. Admin privileges required.');
      navigate('/');
    }
  }, [checkingAdmin, user, isAdmin, navigate, authLoading]);

  // Fetch data only if admin
  useEffect(() => {
    if (isAdmin === true) {
      fetchAllStats();
    }
  }, [isAdmin]);

  // Fetch chart data when metric is selected
  useEffect(() => {
    if (selectedMetric && isAdmin) {
      fetchDailyData();
    }
  }, [selectedMetric, selectedPeriod, isAdmin]);

  const fetchAllStats = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const todayStart = startOfDay(now);
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const monthStart = startOfMonth(now);

      // Fetch all data in parallel
      const [
        dailyData,
        weeklyData,
        monthlyData,
        allTimeData
      ] = await Promise.all([
        fetchPeriodStats(todayStart),
        fetchPeriodStats(weekStart),
        fetchPeriodStats(monthStart),
        fetchAllTimeStats()
      ]);

      setDailyStats(dailyData);
      setWeeklyStats(weeklyData);
      setMonthlyStats(monthlyData);
      setAllTimeStats(allTimeData);
    } catch (err) {
      console.error('Error fetching stats:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPeriodStats = async (startDate: Date): Promise<PeriodStats> => {
    const { data, error } = await (supabase.rpc as any)('get_platform_period_stats', {
      p_start: startDate.toISOString(),
    });

    if (error) {
      console.error('fetchPeriodStats RPC error:', error);
      return {
        newUsers: 0,
        realRoundParticipants: 0,
        roundEntryRealRevenue: 0,
        roundEntryBonusUsed: 0,
        freeRoundEntries: 0,
        paidRoundEntries: 0,
        battlePassRevenue: 0,
        successfulLogins: 0,
        voucherPrizesPaid: 0,
        creditPrizesPaid: 0,
      };
    }

    const row = Array.isArray(data) ? data[0] : data;
    return {
      newUsers: Number(row?.new_users ?? 0),
      realRoundParticipants: Number(row?.real_round_participants ?? 0),
      roundEntryRealRevenue: Number(row?.round_entry_real_revenue ?? 0),
      roundEntryBonusUsed: Number(row?.round_entry_bonus_used ?? 0),
      freeRoundEntries: Number(row?.free_round_entries ?? 0),
      paidRoundEntries: Number(row?.paid_round_entries ?? 0),
      battlePassRevenue: Number(row?.battle_pass_revenue ?? 0),
      successfulLogins: Number(row?.successful_logins ?? 0),
      voucherPrizesPaid: Number(row?.voucher_prizes_paid ?? 0),
      creditPrizesPaid: Number(row?.credit_prizes_paid ?? 0),
    };
  };

  const fetchAllTimeStats = async () => {
    const { data, error } = await (supabase.rpc as any)('get_platform_all_time_stats');

    if (error) {
      console.error('fetchAllTimeStats RPC error:', error);
      return {
        totalUsers: 0,
        totalRealUsers: 0,
        totalRealRevenue: 0,
        totalBonusUsed: 0,
        totalFreeRoundEntries: 0,
        totalPaidRoundEntries: 0,
        totalVoucherPrizesPaid: 0,
        totalCreditPrizesPaid: 0,
      };
    }

    const row = Array.isArray(data) ? data[0] : data;
    return {
      totalUsers: Number(row?.total_users ?? 0),
      totalRealUsers: Number(row?.total_real_users ?? 0),
      totalRealRevenue: Number(row?.total_real_revenue ?? 0),
      totalBonusUsed: Number(row?.total_bonus_used ?? 0),
      totalFreeRoundEntries: Number(row?.total_free_round_entries ?? 0),
      totalPaidRoundEntries: Number(row?.total_paid_round_entries ?? 0),
      totalVoucherPrizesPaid: Number(row?.total_voucher_prizes_paid ?? 0),
      totalCreditPrizesPaid: Number(row?.total_credit_prizes_paid ?? 0),
    };
  };

  const fetchDailyData = async () => {
    setLoadingChart(true);
    try {
      const now = new Date();
      let startDate: Date;
      
      switch (selectedPeriod) {
        case 'day':
          startDate = startOfDay(now);
          break;
        case 'week':
          startDate = startOfWeek(now, { weekStartsOn: 1 });
          break;
        case 'month':
          startDate = startOfMonth(now);
          break;
      }

      const { data, error } = await (supabase.rpc as any)('get_platform_daily_stats', {
        p_start: startDate.toISOString(),
        p_end: now.toISOString(),
      });

      if (error) {
        console.error('fetchDailyData RPC error:', error);
        setDailyData([]);
        return;
      }

      const formattedData: DailyDataPoint[] = (data || []).map((row: any) => ({
        date: row.stat_date,
        displayDate: format(new Date(row.stat_date), selectedPeriod === 'day' ? 'HH:mm' : 'MMM d'),
        newUsers: Number(row.new_users ?? 0),
        freeRoundEntries: Number(row.free_round_entries ?? 0),
        paidRoundEntries: Number(row.paid_round_entries ?? 0),
        successfulLogins: Number(row.successful_logins ?? 0),
        roundEntryRealRevenue: Number(row.round_entry_real_revenue ?? 0),
        roundEntryBonusUsed: Number(row.round_entry_bonus_used ?? 0),
        battlePassRevenue: Number(row.battle_pass_revenue ?? 0),
        voucherPrizesPaid: Number(row.voucher_prizes_paid ?? 0),
        creditPrizesPaid: Number(row.credit_prizes_paid ?? 0),
      }));

      setDailyData(formattedData);
    } catch (err) {
      console.error('Error fetching daily data:', err);
      setDailyData([]);
    } finally {
      setLoadingChart(false);
    }
  };

  const formatCurrency = (pence: number) => {
    return `£${(pence / 100).toFixed(2)}`;
  };

  const formatValue = (value: number, isCurrency?: boolean) => {
    if (isCurrency) return formatCurrency(value);
    return value.toLocaleString();
  };

  const getCurrentStats = () => {
    switch (selectedPeriod) {
      case 'day': return dailyStats;
      case 'week': return weeklyStats;
      case 'month': return monthlyStats;
    }
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'day': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
    }
  };

  const handleMetricClick = (key: MetricKey) => {
    setSelectedMetric(selectedMetric === key ? null : key);
  };

  const getChartDataKey = (key: MetricKey): string => {
    if (key === 'totalRevenue') return 'roundEntryRealRevenue'; // We'll compute this differently
    return key;
  };

  const selectedConfig = statConfigs.find(c => c.key === selectedMetric);

  // Show loading while auth or admin status is being checked
  if (authLoading || checkingAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <SearchableNavbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-2 animate-pulse">
            <Shield className="h-5 w-5" />
            <span>Checking admin permissions...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const currentStats = getCurrentStats();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden w-full max-w-screen">
      <SearchableNavbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden py-8 md:py-16">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/20 via-blue-900/10 to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.15),transparent_50%)]" />
        </div>

        <div className="container mx-auto px-3 relative z-10 max-w-full">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="h-8 w-8 md:h-10 md:w-10 text-emerald-400" />
            <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
              Platform Dashboard
            </h1>
          </div>
          <p className="text-muted-foreground mb-8 text-sm md:text-base">Performance metrics and analytics</p>

          {/* All-Time Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 md:gap-4 mb-8">
            <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-emerald-500/30 hover:border-emerald-500/60 transition-all">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-6 w-6 md:h-8 md:w-8 text-emerald-400" />
                  <div>
                    <p className="text-xl md:text-2xl font-bold text-white">{allTimeStats.totalRealUsers.toLocaleString()}</p>
                    <p className="text-xs md:text-sm text-white/70">Real Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-blue-500/30 hover:border-blue-500/60 transition-all">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-3">
                  <Trophy className="h-6 w-6 md:h-8 md:w-8 text-blue-400" />
                  <div>
                    <p className="text-xl md:text-2xl font-bold text-white">{allTimeStats.totalFreeRoundEntries.toLocaleString()}</p>
                    <p className="text-xs md:text-sm text-white/70">Free Round Entries</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-cyan-500/30 hover:border-cyan-500/60 transition-all">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-3">
                  <Trophy className="h-6 w-6 md:h-8 md:w-8 text-cyan-400" />
                  <div>
                    <p className="text-xl md:text-2xl font-bold text-white">{allTimeStats.totalPaidRoundEntries.toLocaleString()}</p>
                    <p className="text-xs md:text-sm text-white/70">Paid Round Entries</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-green-500/30 hover:border-green-500/60 transition-all">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-6 w-6 md:h-8 md:w-8 text-green-400" />
                  <div>
                    <p className="text-xl md:text-2xl font-bold text-white">{formatCurrency(allTimeStats.totalRealRevenue)}</p>
                    <p className="text-xs md:text-sm text-white/70">Real Revenue</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-orange-500/30 hover:border-orange-500/60 transition-all">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-6 w-6 md:h-8 md:w-8 text-orange-400" />
                  <div>
                    <p className="text-xl md:text-2xl font-bold text-white">{formatCurrency(allTimeStats.totalBonusUsed)}</p>
                    <p className="text-xs md:text-sm text-white/70">Bonus Used</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-red-500/30 hover:border-red-500/60 transition-all">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-3">
                  <Gift className="h-6 w-6 md:h-8 md:w-8 text-red-400" />
                  <div>
                    <p className="text-xl md:text-2xl font-bold text-white">{formatCurrency(allTimeStats.totalVoucherPrizesPaid)}</p>
                    <p className="text-xs md:text-sm text-white/70">Steam Vouchers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-pink-500/30 hover:border-pink-500/60 transition-all">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-6 w-6 md:h-8 md:w-8 text-pink-400" />
                  <div>
                    <p className="text-xl md:text-2xl font-bold text-white">{allTimeStats.totalCreditPrizesPaid.toLocaleString()}</p>
                    <p className="text-xs md:text-sm text-white/70">Credits Paid</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="py-8 md:py-12 bg-gradient-to-br from-[#0B0F14] to-[#12161C]">
        <div className="container mx-auto px-3 max-w-full">
          
          {/* Period Selector */}
          <Tabs value={selectedPeriod} onValueChange={(v) => { setSelectedPeriod(v as 'day' | 'week' | 'month'); setSelectedMetric(null); }} className="space-y-6">
            <TabsList className="bg-[#0B0F14] border border-border/50">
              <TabsTrigger value="day" className="text-white data-[state=active]:text-white data-[state=active]:bg-emerald-600">
                <Calendar className="h-4 w-4 mr-2" /> Today
              </TabsTrigger>
              <TabsTrigger value="week" className="text-white data-[state=active]:text-white data-[state=active]:bg-emerald-600">
                <Clock className="h-4 w-4 mr-2" /> This Week
              </TabsTrigger>
              <TabsTrigger value="month" className="text-white data-[state=active]:text-white data-[state=active]:bg-emerald-600">
                <Calendar className="h-4 w-4 mr-2" /> This Month
              </TabsTrigger>
            </TabsList>

            {['day', 'week', 'month'].map((period) => (
              <TabsContent key={period} value={period} className="space-y-6">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-pulse text-muted-foreground">Loading stats...</div>
                  </div>
                ) : (
                  <>
                    {/* Condensed Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 md:gap-3">
                      {statConfigs.map((config) => (
                        <button
                          key={config.key}
                          onClick={() => handleMetricClick(config.key)}
                          className={cn(
                            "text-left p-3 rounded-lg border transition-all duration-200",
                            "bg-gradient-to-br from-[#0B0F14] to-[#12161C]",
                            selectedMetric === config.key 
                              ? `${config.borderColor.replace('/30', '')} ring-2 ring-offset-2 ring-offset-background` 
                              : `${config.borderColor} hover:border-opacity-60`,
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className={config.color}>{config.icon}</span>
                            <span className="text-xs text-white/60 truncate">{config.label}</span>
                          </div>
                          <p className={cn("text-lg md:text-xl font-bold text-white")}>
                            {formatValue(config.getValue(currentStats), config.isCurrency)}
                          </p>
                        </button>
                      ))}
                    </div>

                    {/* Chart Section */}
                    {selectedMetric && selectedConfig && (
                      <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-border/30">
                        <CardHeader className="pb-2">
                          <CardTitle className={cn("text-sm flex items-center gap-2", selectedConfig.color)}>
                            {selectedConfig.icon}
                            {selectedConfig.label} - {getPeriodLabel()}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {loadingChart ? (
                            <div className="h-64 flex items-center justify-center">
                              <div className="animate-pulse text-muted-foreground">Loading chart...</div>
                            </div>
                          ) : dailyData.length === 0 ? (
                            <div className="h-64 flex items-center justify-center text-muted-foreground">
                              No data available for this period
                            </div>
                          ) : (
                            <div className="h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                  <defs>
                                    <linearGradient id={`gradient-${selectedMetric}`} x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor={selectedConfig.chartColor} stopOpacity={0.3} />
                                      <stop offset="95%" stopColor={selectedConfig.chartColor} stopOpacity={0} />
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                  <XAxis 
                                    dataKey="displayDate" 
                                    stroke="#666" 
                                    fontSize={12}
                                    tickLine={false}
                                  />
                                  <YAxis 
                                    stroke="#666" 
                                    fontSize={12}
                                    tickLine={false}
                                    tickFormatter={(value) => selectedConfig.isCurrency ? `£${(value/100).toFixed(0)}` : value.toString()}
                                  />
                                  <Tooltip 
                                    contentStyle={{ 
                                      backgroundColor: '#0B0F14', 
                                      border: '1px solid #333',
                                      borderRadius: '8px',
                                    }}
                                    labelStyle={{ color: '#fff' }}
                                    formatter={(value: number) => [
                                      formatValue(value, selectedConfig.isCurrency),
                                      selectedConfig.label
                                    ]}
                                  />
                                  {selectedMetric === 'totalRevenue' ? (
                                    <Area
                                      type="monotone"
                                      dataKey={(d: DailyDataPoint) => d.roundEntryRealRevenue + d.battlePassRevenue}
                                      stroke={selectedConfig.chartColor}
                                      strokeWidth={2}
                                      fill={`url(#gradient-${selectedMetric})`}
                                    />
                                  ) : (
                                    <Area
                                      type="monotone"
                                      dataKey={getChartDataKey(selectedMetric)}
                                      stroke={selectedConfig.chartColor}
                                      strokeWidth={2}
                                      fill={`url(#gradient-${selectedMetric})`}
                                    />
                                  )}
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </TabsContent>
            ))}
          </Tabs>

          {/* Paid Rounds Participants Section */}
          <div className="mt-12">
            <PaidRoundsParticipants />
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PlatformDashboardPage;
