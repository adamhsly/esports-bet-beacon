import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  Clock, 
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
          />
        </div>
      </div>

      {/* Missions Tabs */}
      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-[#1A1F26] border border-white/[0.08]">
          <TabsTrigger 
            value="daily" 
            className="flex items-center gap-2 text-white data-[state=active]:bg-neon-blue/30 data-[state=active]:text-neon-blue data-[state=active]:border-neon-blue/50 border border-transparent transition-all"
          >
            <Target className="w-4 h-4 text-white" />
            <span className="hidden sm:inline">Daily</span>
            {daily.length > 0 && (
              <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/30 text-xs ml-1">
                {daily.length}
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger 
            value="weekly"
            className="flex items-center gap-2 text-white data-[state=active]:bg-neon-blue/30 data-[state=active]:text-neon-blue data-[state=active]:border-neon-blue/50 border border-transparent transition-all"
          >
            <Calendar className="w-4 h-4 text-white" />
            <span className="hidden sm:inline">Weekly</span>
            {weekly.length > 0 && (
              <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/30 text-xs ml-1">
                {weekly.length}
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger 
            value="monthly"
            className="flex items-center gap-2 text-white data-[state=active]:bg-neon-blue/30 data-[state=active]:text-neon-blue data-[state=active]:border-neon-blue/50 border border-transparent transition-all"
          >
            <CalendarDays className="w-4 h-4 text-white" />
            <span className="hidden sm:inline">Monthly</span>
            {monthly.length > 0 && (
              <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/30 text-xs ml-1">
                {monthly.length}
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger 
            value="seasonal"
            className="flex items-center gap-2 text-white data-[state=active]:bg-neon-purple/30 data-[state=active]:text-neon-purple data-[state=active]:border-neon-purple/50 border border-transparent transition-all"
          >
            <Infinity className="w-4 h-4 text-white" />
            <span className="hidden sm:inline">Seasonal</span>
            {seasonal.length > 0 && (
              <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/30 text-xs ml-1">
                {seasonal.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-4">
          <MissionTabContent 
            missions={daily}
            emptyMessage="All daily missions completed! Check back tomorrow."
          />
        </TabsContent>

        <TabsContent value="weekly" className="mt-4">
          <MissionTabContent 
            missions={weekly}
            emptyMessage="All weekly missions completed! Great work this week."
          />
        </TabsContent>

        <TabsContent value="monthly" className="mt-4">
          <MissionTabContent 
            missions={monthly}
            emptyMessage="All monthly missions completed! Check again next window."
          />
        </TabsContent>

        <TabsContent value="seasonal" className="mt-4">
          <MissionTabContent 
            missions={seasonal}
            emptyMessage="All seasonal missions completed! Incredible dedication."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface MissionTabContentProps {
  missions: any[];
  emptyMessage: string;
}

const MissionTabContent: React.FC<MissionTabContentProps> = ({ 
  missions, 
  emptyMessage 
}) => {
  return (
    <Card className="bg-gradient-to-r from-[#1A1F26] to-[#252A32] border border-white/[0.08]">
      <CardContent className="p-6">
        {missions.length === 0 ? (
          <p className="text-white/60 text-center py-8">{emptyMessage}</p>
        ) : (
          <div className="space-y-3">
            {missions.map((mission) => (
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
                ? "bg-green-500/20 text-white"
                : "bg-white/10 text-white"
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
                  <div className="flex justify-between text-xs">
                    <span className={mission.completed ? "text-white/40" : "text-yellow-400"}>{mission.progress}</span>
                    <span className="text-white/40">{mission.target}</span>
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
              mission.completed ? "text-green-400" : "text-yellow-400"
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