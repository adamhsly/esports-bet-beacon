import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Trophy } from 'lucide-react';
import SearchableNavbar from '@/components/SearchableNavbar';
import SEOContentBlock from '@/components/SEOContentBlock';
import Footer from '@/components/Footer';
import { MatchCard, MatchInfo } from '@/components/MatchCard';
import { DateMatchPicker } from '@/components/DateMatchPicker';
import { EsportsLogoFilter } from '@/components/EsportsLogoFilter';
import { FilterPills } from '@/components/FilterPills';
import { formatMatchDate } from '@/utils/dateMatchUtils';
import { startOfDay, isToday, format } from 'date-fns';
import { getMatchesForDate, getDayCounts } from '@/lib/supabaseMatchFunctions';
import { MatchCountBreakdown } from '@/utils/matchCountUtils';

const Index = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [selectedGameType, setSelectedGameType] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('all');

  const [liveMatches, setLiveMatches] = useState<MatchInfo[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<MatchInfo[]>([]);
  const [finishedMatches, setFinishedMatches] = useState<MatchInfo[]>([]);
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});
  const [detailedMatchCounts, setDetailedMatchCounts] = useState<Record<string, MatchCountBreakdown>>({});
  const [loadingDateFiltered, setLoadingDateFiltered] = useState(true);
  const [loadingCalendar, setLoadingCalendar] = useState(true);

  const isSelectedDateToday = isToday(selectedDate);

  /* --------------------- 📅 Load Calendar Counts --------------------- */
  useEffect(() => {
    async function loadCalendarCounts() {
      setLoadingCalendar(true);
      try {
        const rows = await getDayCounts(selectedDate, 7);

        const breakdown: Record<string, MatchCountBreakdown> = {};
        for (const row of rows) {
          if (!breakdown[row.match_date]) {
            breakdown[row.match_date] = {
              total: 0,
              professional: 0,
              amateur: 0,
              live: 0,
              upcoming: 0,
            };
          }
          breakdown[row.match_date].total += row.match_count;
          if (row.source === 'pandascore') breakdown[row.match_date].professional += row.match_count;
          if (row.source === 'faceit') breakdown[row.match_date].amateur += row.match_count;
        }

        const totals: Record<string, number> = {};
        for (const [date, counts] of Object.entries(breakdown)) {
          totals[date] = counts.total;
        }

        setDetailedMatchCounts(breakdown);
        setMatchCounts(totals);
      } catch (error) {
        console.error('❌ Error loading day counts:', error);
        setDetailedMatchCounts({});
        setMatchCounts({});
      } finally {
        setLoadingCalendar(false);
      }
    }
    loadCalendarCounts();
  }, [selectedDate]);

  /* --------------------- 🗓️ Load Matches for Selected Day --------------------- */
  useEffect(() => {
    async function loadMatchesForDay() {
      setLoadingDateFiltered(true);
      try {
        const matches = await getMatchesForDate({
          date: selectedDate,
          limit: 100,
          source: selectedSourceFilter === 'all' ? 'all' : (selectedSourceFilter as 'amateur' | 'professional'),
          esportType: selectedGameType,
        });

        // Split by status
        const live: MatchInfo[] = [];
        const upcoming: MatchInfo[] = [];
        const finished: MatchInfo[] = [];

        matches.forEach((m) => {
          const status = (m.status || '').toLowerCase();
          if (['live', 'ongoing', 'running'].includes(status)) live.push(m);
          else if (['finished', 'completed'].includes(status)) finished.push(m);
          else upcoming.push(m);
        });

        setLiveMatches(live);
        setUpcomingMatches(upcoming);
        setFinishedMatches(finished);
      } catch (error) {
        console.error('❌ Error loading matches for day:', error);
        setLiveMatches([]);
        setUpcomingMatches([]);
        setFinishedMatches([]);
      } finally {
        setLoadingDateFiltered(false);
      }
    }
    loadMatchesForDay();
  }, [selectedDate, selectedGameType, selectedStatusFilter, selectedSourceFilter]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) setSelectedDate(startOfDay(date));
  };

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-theme-gray-dark">
      <SearchableNavbar />
      <div className="flex-grow">
        <div className="w-full">
          {/* ESPORTS LOGO FILTER */}
          <div className="mx-2 md:mx-4">
            <EsportsLogoFilter
              selectedGameType={selectedGameType}
              onGameTypeChange={setSelectedGameType}
            />
          </div>

          {/* FILTER PILLS */}
          <div className="mx-2 md:mx-4">
            <div className="flex flex-wrap items-center gap-2 mb-6 px-4 py-1">
              <FilterPills
                gameType={selectedGameType}
                statusFilter={selectedStatusFilter}
                sourceFilter={selectedSourceFilter}
                onGameTypeChange={setSelectedGameType}
                onStatusFilterChange={setSelectedStatusFilter}
                onSourceFilterChange={setSelectedSourceFilter}
              />
            </div>
          </div>

          {/* DATE PICKER WITH COUNTS */}
          {!loadingCalendar && (
            <div className="mx-2 md:mx-4">
              <DateMatchPicker
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                matchCounts={matchCounts}
                detailedMatchCounts={detailedMatchCounts}
              />
            </div>
          )}

          {/* MATCH LISTS */}
          {loadingDateFiltered ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-theme-purple mr-2" />
              <span className="text-primary-foreground">Loading matches…</span>
            </div>
          ) : (
            <>
              {isSelectedDateToday && liveMatches.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-theme-purple font-semibold mb-2 ml-4">Live Matches</h2>
                  {liveMatches.map((m) => (
                    <div key={m.id} className="px-2 sm:px-4 lg:px-6">
                      <MatchCard match={m} />
                    </div>
                  ))}
                </div>
              )}
              {upcomingMatches.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-theme-purple font-semibold mb-2 ml-4">Upcoming Matches</h2>
                  {upcomingMatches.map((m) => (
                    <div key={m.id} className="px-2 sm:px-4 lg:px-6">
                      <MatchCard match={m} />
                    </div>
                  ))}
                </div>
              )}
              {finishedMatches.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-theme-purple font-semibold mb-2 ml-4">Finished Matches</h2>
                  {finishedMatches.map((m) => (
                    <div key={m.id} className="px-2 sm:px-4 lg:px-6">
                      <MatchCard match={m} />
                    </div>
                  ))}
                </div>
              )}
              {liveMatches.length === 0 &&
                upcomingMatches.length === 0 &&
                finishedMatches.length === 0 && (
                  <div className="text-center py-8 bg-theme-gray-dark/50 rounded-md">
                    <p className="text-gray-400 mb-4">
                      No matches scheduled for {formatMatchDate(selectedDate)}.
                    </p>
                  </div>
                )}
            </>
          )}
        </div>
      </div>
      <SEOContentBlock
        title="Your Ultimate Esports Betting & Stats Platform"
        paragraphs={[
          'Stay updated with live esports scores from major tournaments and competitions.',
          'Compare esports odds from leading betting sites in one convenient location.',
          'Explore in-depth team stats, performance analytics, and historical match results.',
          'Follow international championships or regional qualifiers with live coverage and analysis.',
        ]}
      />
      <Footer />
    </div>
  );
};

export default Index;
