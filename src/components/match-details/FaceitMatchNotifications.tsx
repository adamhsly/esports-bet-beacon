
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, ExternalLink, Eye, Clock } from 'lucide-react';

interface FaceitMatchNotificationsProps {
  matchId: string;
  teams: Array<{ name: string }>;
  startTime: string;
  status?: string;
}

export const FaceitMatchNotifications: React.FC<FaceitMatchNotificationsProps> = ({ 
  matchId, teams, startTime, status = 'upcoming'
}) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(15); // minutes before

  const handleNotificationToggle = () => {
    setNotificationsEnabled(!notificationsEnabled);
    console.log(`Notifications ${!notificationsEnabled ? 'enabled' : 'disabled'} for match ${matchId}`);
  };

  const getTimeUntilMatch = () => {
    const now = new Date();
    const matchTime = new Date(startTime);
    const diffMs = matchTime.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} days`;
    if (diffHours > 0) return `${diffHours} hours`;
    if (diffMinutes > 0) return `${diffMinutes} minutes`;
    return 'Starting soon';
  };

  const isLive = status === 'live' || status === 'ongoing';
  const isUpcoming = status === 'upcoming' || status === 'scheduled';

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white flex items-center">
        <Bell className="h-5 w-5 mr-2 text-orange-400" />
        Match Alerts & {isLive ? 'Live Access' : 'Information'}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Notification Settings */}
        <Card className="bg-theme-gray-dark border border-theme-gray-medium p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-white">Match Notifications</h4>
                <p className="text-sm text-gray-400">
                  {isLive ? 'Match is currently live!' : 'Get notified when match goes live'}
                </p>
              </div>
              {!isLive && (
                <Button
                  variant={notificationsEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={handleNotificationToggle}
                  className={notificationsEnabled ? "bg-orange-500 hover:bg-orange-600" : ""}
                >
                  {notificationsEnabled ? (
                    <Bell className="h-4 w-4" />
                  ) : (
                    <BellOff className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>

            {!isLive && notificationsEnabled && (
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Remind me:</label>
                <select 
                  value={reminderTime}
                  onChange={(e) => setReminderTime(parseInt(e.target.value))}
                  className="w-full bg-theme-gray-medium border border-theme-gray-light rounded px-3 py-2 text-white"
                >
                  <option value={5}>5 minutes before</option>
                  <option value={15}>15 minutes before</option>
                  <option value={30}>30 minutes before</option>
                  <option value={60}>1 hour before</option>
                </select>
              </div>
            )}

            <div className="pt-2 border-t border-theme-gray-medium">
              <div className="text-sm">
                <span className="text-gray-400">
                  {isLive ? 'Status: ' : 'Match starts in: '}
                </span>
                <Badge variant="outline" className={`${
                  isLive 
                    ? 'bg-green-500/20 text-green-400 border-green-400/30' 
                    : 'bg-orange-500/20 text-orange-400 border-orange-400/30'
                }`}>
                  {isLive ? 'LIVE' : getTimeUntilMatch()}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* FACEIT Links - Only show room access when live */}
        <Card className="bg-theme-gray-dark border border-theme-gray-medium p-4">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-white">
                {isLive ? 'FACEIT Room Access' : 'Match Information'}
              </h4>
              <p className="text-sm text-gray-400">
                {isLive 
                  ? 'Access the live match room and spectate' 
                  : 'Room access available when match goes live'
                }
              </p>
            </div>

            <div className="space-y-2">
              {isLive ? (
                <>
                  <Button
                    variant="outline"
                    className="w-full justify-between text-orange-400 border-orange-400/30 hover:bg-orange-400/10"
                    onClick={() => window.open(`https://faceit.com/room/${matchId}`, '_blank')}
                  >
                    <span className="flex items-center">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Live Room
                    </span>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-between text-blue-400 border-blue-400/30 hover:bg-blue-400/10"
                    onClick={() => window.open(`https://faceit.com/room/${matchId}`, '_blank')}
                  >
                    <span className="flex items-center">
                      <Eye className="h-4 w-4 mr-2" />
                      Spectate Match
                    </span>
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  className="w-full justify-between text-gray-500 border-gray-500/30"
                  disabled
                >
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    Room Access (Available when live)
                  </span>
                </Button>
              )}
            </div>

            <div className="pt-2 border-t border-theme-gray-medium">
              <div className="text-xs text-gray-500">
                {isLive ? (
                  <>
                    <p>• Match is currently live and accessible</p>
                    <p>• Join as spectator or check match details</p>
                  </>
                ) : (
                  <>
                    <p>• Server info will be available 30 minutes before match</p>
                    <p>• Map veto starts 15 minutes before scheduled time</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
