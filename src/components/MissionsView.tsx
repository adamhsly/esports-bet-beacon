import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  CheckCircle, 
  Clock, 
  ChevronDown, 
  Target,
  Calendar,
  CalendarDays,
  Infinity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMissionsFiltered } from '@/hooks/useMissionsFiltered';
import { monthWindow } from '@/lib/season';

const MissionsView: React.FC = () => {
  const [showCompleted, setShowCompleted] = useState(false);
  const [seasonalExpanded, setSeasonalExpanded] = useState(false);
  const { daily, weekly, monthly, seasonal, loading } = useMissionsFiltered(showCompleted);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-gaming text-white">Missions</h2>
          <div className="animate-pulse h-6 w-32 bg-white/10 rounded"></div>
        </div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-white/10 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const currentWindow = monthWindow();

  return (
    <div className="space-y-6">
      {/* Header with Toggle */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-gaming text-white">Missions</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/60">Show completed</span>
          <Switch 
            checked={showCompleted} 
            onCheckedChange={setShowCompleted}
            className="data-[state=checked]:bg-neon-blue"
          />
        </div>
      </div>

      {/* Today's Missions */}
      <MissionSection
        title="Today's Missions"
        icon={<Target className="w-5 h-5" />}
        missions={daily}
        maxDisplay={4}
        emptyMessage="All daily missions completed! Check back tomorrow."
      />

      {/* This Week */}
      <MissionSection
        title="This Week"
        icon={<Calendar className="w-5 h-5" />}
        missions={weekly}
        emptyMessage="All weekly missions completed! Great work this week."
      />

      {/* This Month */}
      <MissionSection
        title={`This Month (${currentWindow.toUpperCase()})`}
        icon={<CalendarDays className="w-5 h-5" />}
        missions={monthly}
        emptyMessage="All monthly missions completed! Check again next window."
      />

      {/* Seasonal - Collapsed by default */}
      <Collapsible open={seasonalExpanded} onOpenChange={setSeasonalExpanded}>
        <Card className="bg-gradient-to-r from-[#1A1F26] to-[#252A32] border border-white/[0.08]">
          <CollapsibleTrigger className="w-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Infinity className="w-5 h-5 text-neon-purple" />
                  <CardTitle className="text-lg font-gaming text-white">Seasonal</CardTitle>
                  <Badge className="bg-neon-purple/20 text-neon-purple border-neon-purple/30 text-xs">
                    {seasonal.length} available
                  </Badge>
                </div>
                <ChevronDown className={cn(
                  "w-5 h-5 text-white/60 transition-transform duration-200",
                  seasonalExpanded && "rotate-180"
                )} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {seasonal.length === 0 ? (
                <p className="text-white/60 text-center py-4">
                  All seasonal missions completed! Incredible dedication.
                </p>
              ) : (
                <div className="space-y-3">
                  {seasonal.map((mission) => (
                    <MissionCard key={mission.id} mission={mission} />
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};

interface MissionSectionProps {
  title: string;
  icon: React.ReactNode;
  missions: any[];
  maxDisplay?: number;
  emptyMessage: string;
}

const MissionSection: React.FC<MissionSectionProps> = ({ 
  title, 
  icon, 
  missions, 
  maxDisplay,
  emptyMessage 
}) => {
  const displayMissions = maxDisplay ? missions.slice(0, maxDisplay) : missions;

  return (
    <Card className="bg-gradient-to-r from-[#1A1F26] to-[#252A32] border border-white/[0.08]">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="text-neon-blue">{icon}</div>
          <CardTitle className="text-lg font-gaming text-white">{title}</CardTitle>
          {missions.length > 0 && (
            <Badge className="bg-neon-blue/20 text-neon-blue border-neon-blue/30 text-xs">
              {missions.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {displayMissions.length === 0 ? (
          <p className="text-white/60 text-center py-4">{emptyMessage}</p>
        ) : (
          <div className="space-y-3">
            {displayMissions.map((mission) => (
              <MissionCard key={mission.id} mission={mission} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface MissionCardProps {
  mission: any;
}

const MissionCard: React.FC<MissionCardProps> = ({ mission }) => {
  const progressPercent = (mission.progress / Math.max(1, mission.target)) * 100;
  const isInProgress = mission.progress > 0 && !mission.completed;

  return (
    <Card 
      className={cn(
        "bg-gradient-to-r border transition-all duration-300",
        mission.completed
          ? "from-green-500/10 to-green-600/10 border-green-400/30 shadow-[0_0_10px_rgba(34,197,94,0.2)]"
          : "from-[#0F1420] to-[#1A1F26] border-white/[0.06] hover:border-neon-blue/30"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            {/* Status Icon */}
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              mission.completed
                ? "bg-green-500/20 text-green-400"
                : "bg-neon-blue/20 text-neon-blue"
            )}>
              {mission.completed ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <Clock className="w-5 h-5" />
              )}
            </div>
            
            {/* Mission Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-gaming text-white text-sm leading-tight">
                  {mission.title}
                </h3>
                {isInProgress && (
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-400/30 text-xs px-2 py-0.5">
                    In progress
                  </Badge>
                )}
              </div>
              <p className="text-xs text-white/60 mb-2">
                {mission.description}
              </p>
              
              {/* Progress Bar for missions with target > 1 */}
              {mission.target > 1 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-white/40">
                    <span>{mission.progress}</span>
                    <span>{mission.target}</span>
                  </div>
                  <Progress 
                    value={progressPercent} 
                    className="h-1.5 bg-[#0F1722]"
                  />
                </div>
              )}
            </div>
          </div>
          
          {/* XP Reward */}
          <div className="text-right flex-shrink-0 ml-3">
            <div className={cn(
              "text-lg font-gaming font-bold",
              mission.completed ? "text-green-400" : "text-neon-blue"
            )}>
              +{mission.xp_reward} XP
            </div>
            {mission.target === 1 && (
              <div className="text-xs text-white/40">
                {mission.completed ? 'Complete' : 'Pending'}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MissionsView;