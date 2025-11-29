import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Trophy, Star, Calendar, TrendingUp, RefreshCw } from 'lucide-react';

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

          {/* Team Swap */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <RefreshCw className="h-5 w-5 text-[#8B5CF6]" />
              <h3 className="text-xl font-semibold">Team Swap</h3>
            </div>
            <ul className="space-y-2 text-gray-300">
              <li className="flex gap-2">
                <span className="text-[#8B5CF6]">•</span>
                <span>You can swap out <strong className="text-white">one team</strong> per round during the competition</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#8B5CF6]">•</span>
                <span>The new team must have equal or lower budget than the team being replaced</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#8B5CF6]">•</span>
                <span><strong className="text-white">Points Preserved:</strong> Any points earned by your original team before the swap are kept</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#8B5CF6]">•</span>
                <span>Only the new team earns points after the swap occurs</span>
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
                <p className="text-sm text-gray-400">Extended competitions with Steam voucher prizes!</p>
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

          {/* Prize Structure */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-5 w-5 text-[#8B5CF6]" />
              <h3 className="text-xl font-semibold">Prize Structure</h3>
            </div>
            
            {/* Daily & Weekly Prizes */}
            <div className="mb-6">
              <h4 className="text-lg font-medium text-white mb-3">Daily & Weekly Rounds</h4>
              <p className="text-gray-300 mb-3">Top 3 players win bonus credits!</p>
              <div className="grid gap-2">
                <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 p-3 rounded-lg border border-yellow-500/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🥇</span>
                      <span className="font-semibold text-white">1st Place</span>
                    </div>
                    <span className="text-yellow-400 font-bold text-xl">200 Credits</span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-gray-400/20 to-gray-500/10 p-3 rounded-lg border border-gray-400/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🥈</span>
                      <span className="font-semibold text-white">2nd Place</span>
                    </div>
                    <span className="text-gray-300 font-bold text-xl">100 Credits</span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-orange-600/20 to-orange-700/10 p-3 rounded-lg border border-orange-600/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🥉</span>
                      <span className="font-semibold text-white">3rd Place</span>
                    </div>
                    <span className="text-orange-400 font-bold text-xl">50 Credits</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly Prizes */}
            <div>
              <h4 className="text-lg font-medium text-white mb-3">Monthly Rounds 🎮</h4>
              <p className="text-gray-300 mb-3">Top 3 players win Steam vouchers!</p>
              <div className="grid gap-2">
                <div className="bg-gradient-to-r from-purple-500/20 to-blue-600/10 p-3 rounded-lg border border-purple-500/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🥇</span>
                      <span className="font-semibold text-white">1st Place</span>
                    </div>
                    <span className="text-purple-400 font-bold text-xl">£100 Steam Voucher</span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-purple-500/20 to-blue-600/10 p-3 rounded-lg border border-purple-400/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🥈</span>
                      <span className="font-semibold text-white">2nd Place</span>
                    </div>
                    <span className="text-purple-300 font-bold text-xl">£25 Steam Voucher</span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-purple-500/20 to-blue-600/10 p-3 rounded-lg border border-purple-300/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🥉</span>
                      <span className="font-semibold text-white">3rd Place</span>
                    </div>
                    <span className="text-purple-200 font-bold text-xl">£5 Steam Voucher</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-400 mt-2">
                Monthly winners will be contacted via email to process Steam voucher prizes.
              </p>
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
              <li>• Use your team swap strategically if a team is underperforming</li>
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};
