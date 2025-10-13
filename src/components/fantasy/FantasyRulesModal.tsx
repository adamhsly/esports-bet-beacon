import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Trophy, Star, Calendar, TrendingUp } from 'lucide-react';

interface FantasyRulesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FantasyRulesModal: React.FC<FantasyRulesModalProps> = ({
  open,
  onOpenChange,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0F1420] border-border max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-2xl">Fantasy Esports Rules</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 text-white">
          {/* How It Works */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-5 w-5 text-[#8B5CF6]" />
              <h3 className="text-xl font-semibold">How It Works</h3>
            </div>
            <p className="text-gray-300 leading-relaxed">
              Build your ultimate esports team by selecting from both professional and amateur teams. 
              Your teams earn points based on their real match performance during the round period. 
              Compete against other players on the leaderboard to win rewards and climb the ranks.
            </p>
          </section>

          {/* Team Selection */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Star className="h-5 w-5 text-[#8B5CF6]" />
              <h3 className="text-xl font-semibold">Team Selection</h3>
            </div>
            <ul className="space-y-2 text-gray-300">
              <li className="flex gap-2">
                <span className="text-[#8B5CF6]">•</span>
                <span>Select multiple teams within your budget to create your lineup</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#8B5CF6]">•</span>
                <span>Mix professional and amateur teams for optimal strategy</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#8B5CF6]">•</span>
                <span><strong className="text-white">Star Team:</strong> Choose one team as your star to earn 2x points</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#8B5CF6]">•</span>
                <span><strong className="text-white">Amateur Bonus:</strong> Amateur teams earn +25% bonus points for higher risk/reward</span>
              </li>
            </ul>
          </section>

          {/* Round Types */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-5 w-5 text-[#8B5CF6]" />
              <h3 className="text-xl font-semibold">Round Types</h3>
            </div>
            <div className="space-y-3">
              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <h4 className="font-semibold text-white mb-1">Daily Rounds</h4>
                <p className="text-sm text-gray-400">Quick 24-hour competitions for fast-paced action</p>
              </div>
              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <h4 className="font-semibold text-white mb-1">Weekly Rounds</h4>
                <p className="text-sm text-gray-400">Week-long tournaments for strategic team building</p>
              </div>
              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <h4 className="font-semibold text-white mb-1">Monthly Rounds</h4>
                <p className="text-sm text-gray-400">Extended competitions with the biggest rewards</p>
              </div>
            </div>
          </section>

          {/* Scoring System */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-[#8B5CF6]" />
              <h3 className="text-xl font-semibold">Scoring System</h3>
            </div>
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-[#8B5CF6]/20 to-transparent p-4 rounded-lg border border-[#8B5CF6]/30">
                <h4 className="font-semibold text-white mb-2">Match Win</h4>
                <p className="text-gray-300">+10 points per match victory</p>
              </div>
              <div className="bg-gradient-to-r from-[#8B5CF6]/20 to-transparent p-4 rounded-lg border border-[#8B5CF6]/30">
                <h4 className="font-semibold text-white mb-2">Map Win</h4>
                <p className="text-gray-300">+3 points per individual map won</p>
              </div>
              <div className="bg-gradient-to-r from-[#8B5CF6]/20 to-transparent p-4 rounded-lg border border-[#8B5CF6]/30">
                <h4 className="font-semibold text-white mb-2">Clean Sweep</h4>
                <p className="text-gray-300">+5 bonus points for winning all maps in a best-of series</p>
              </div>
              <div className="bg-gradient-to-r from-[#8B5CF6]/20 to-transparent p-4 rounded-lg border border-[#8B5CF6]/30">
                <h4 className="font-semibold text-white mb-2">Tournament Win</h4>
                <p className="text-gray-300">+20 bonus points for winning a tournament</p>
              </div>
            </div>
          </section>

          {/* Multipliers */}
          <section>
            <h3 className="text-xl font-semibold mb-3 text-white">Point Multipliers</h3>
            <div className="grid gap-3">
              <div className="bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/30">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">Star Team Multiplier</span>
                  <span className="text-yellow-400 font-bold">2x</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">Double points for your chosen star team</p>
              </div>
              <div className="bg-green-500/10 p-3 rounded-lg border border-green-500/30">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">Amateur Bonus</span>
                  <span className="text-green-400 font-bold">+25%</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">Extra points for amateur team performance</p>
              </div>
            </div>
          </section>

          {/* Tips */}
          <section className="bg-[#8B5CF6]/10 p-4 rounded-lg border border-[#8B5CF6]/30">
            <h3 className="text-lg font-semibold mb-2 text-white">Pro Tips</h3>
            <ul className="space-y-1.5 text-sm text-gray-300">
              <li>• Balance your lineup with reliable pro teams and high-upside amateur teams</li>
              <li>• Choose your star team wisely - they earn double points!</li>
              <li>• Check team form and upcoming match schedules before selecting</li>
              <li>• You can change your star team once during an active round</li>
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};
