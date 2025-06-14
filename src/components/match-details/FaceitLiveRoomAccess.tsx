
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Eye, Download, Radio, Users, Settings } from 'lucide-react';

interface FaceitLiveRoomAccessProps {
  matchId: string;
  teams: Array<{ name: string }>;
  status: string;
}

export const FaceitLiveRoomAccess: React.FC<FaceitLiveRoomAccessProps> = ({ 
  matchId, teams, status 
}) => {
  const cleanMatchId = matchId.replace('faceit_', '');

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-white flex items-center">
        <Radio className="h-5 w-5 mr-2 text-red-400 animate-pulse" />
        Live Match Room
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Primary Actions */}
        <Card className="bg-theme-gray-dark border border-theme-gray-medium p-6">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-white mb-2">Match Room Access</h4>
              <p className="text-sm text-gray-400">
                Join the live FACEIT match room to spectate or view details
              </p>
            </div>

            <div className="space-y-3">
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => window.open(`https://faceit.com/room/${cleanMatchId}`, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Join Live Room
              </Button>

              <Button
                variant="outline"
                className="w-full text-blue-400 border-blue-400/30 hover:bg-blue-400/10"
                onClick={() => window.open(`https://faceit.com/room/${cleanMatchId}`, '_blank')}
              >
                <Eye className="h-4 w-4 mr-2" />
                Spectate Match
              </Button>
            </div>

            <div className="pt-3 border-t border-theme-gray-medium">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Room Status:</span>
                <Badge className="bg-green-500/20 text-green-400 border-green-400/30">
                  <Users className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Match Information */}
        <Card className="bg-theme-gray-dark border border-theme-gray-medium p-6">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-white mb-2">Live Match Info</h4>
              <p className="text-sm text-gray-400">
                Real-time match statistics and information
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Teams:</span>
                <span className="text-white text-sm">{teams[0]?.name} vs {teams[1]?.name}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Format:</span>
                <span className="text-white text-sm">Best of 1</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Server:</span>
                <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-400/30">
                  Live
                </Badge>
              </div>
            </div>

            <div className="pt-3 border-t border-theme-gray-medium">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-purple-400 border-purple-400/30 hover:bg-purple-400/10"
                onClick={() => window.open(`https://faceit.com/match/${cleanMatchId}`, '_blank')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Match Settings
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Demo Downloads Section */}
      <Card className="bg-theme-gray-dark border border-theme-gray-medium p-6">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-white mb-2">Match Demos</h4>
            <p className="text-sm text-gray-400">
              Demo files will be available after the match completes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-theme-gray-medium/50 rounded-lg">
              <Download className="h-6 w-6 text-gray-400 mx-auto mb-2" />
              <div className="text-sm text-gray-400">Match Demo</div>
              <div className="text-xs text-gray-500 mt-1">Available post-match</div>
            </div>
            
            <div className="text-center p-4 bg-theme-gray-medium/50 rounded-lg">
              <Eye className="h-6 w-6 text-gray-400 mx-auto mb-2" />
              <div className="text-sm text-gray-400">GOTV</div>
              <div className="text-xs text-gray-500 mt-1">Live spectating</div>
            </div>
            
            <div className="text-center p-4 bg-theme-gray-medium/50 rounded-lg">
              <Settings className="h-6 w-6 text-gray-400 mx-auto mb-2" />
              <div className="text-sm text-gray-400">Stats</div>
              <div className="text-xs text-gray-500 mt-1">Real-time data</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Additional Information */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <div className="text-sm text-blue-400">
          <p className="font-semibold mb-2">💡 Live Match Tips:</p>
          <ul className="space-y-1 text-xs">
            <li>• Click "Join Live Room" to access the FACEIT match page</li>
            <li>• Use "Spectate Match" to watch the game in real-time</li>
            <li>• Demo files will be available for download after the match</li>
            <li>• Match statistics update automatically every 30 seconds</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
