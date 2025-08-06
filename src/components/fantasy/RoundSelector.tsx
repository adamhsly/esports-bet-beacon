import { Calendar, Clock, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate, calculateDuration } from '@/utils/formatUtils'; // Assumes you have these
import { cn } from '@/lib/utils';
import { Round } from '@/types/rounds';

interface RoundSelectorProps {
  rounds: Round[];
  setSelectedRound: (round: Round) => void;
}

const roundImageMap: Record<string, string> = {
  daily: '/lovable-uploads/daily_round/daily.png',
  weekly: '/lovable-uploads/weekly_round/weekly.png',
  monthly: '/lovable-uploads/monthly_round/monthly.png',
};

const getRoundTypeColor = (type: string) => {
  switch (type.toLowerCase()) {
    case 'daily':
      return 'bg-blue-500/20 text-blue-400 border border-blue-400/30';
    case 'weekly':
      return 'bg-yellow-500/20 text-yellow-400 border border-yellow-400/30';
    case 'monthly':
      return 'bg-purple-500/20 text-purple-400 border border-purple-400/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border border-gray-400/30';
  }
};

export const RoundSelector: React.FC<RoundSelectorProps> = ({ rounds, setSelectedRound }) => {
  return (
    <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {rounds.map((round) => {
        const roundType = round.type.toLowerCase();
        const roundImage = roundImageMap[roundType] || '/lovable-uploads/default.png';

        return (
          <Card
            key={round.id}
            className={cn(
              'bg-theme-gray-medium ring-1 ring-theme-gray-dark/30 border-0 rounded-xl shadow-none px-0 py-0 transition-all duration-200 group hover:scale-[1.015] hover:shadow-md hover:ring-2 hover:ring-theme-purple/70 cursor-pointer'
            )}
          >
            <CardContent className="flex flex-col gap-3 p-4">
              {/* Image */}
              <div className="w-full flex justify-center">
                <img
                  src={roundImage}
                  alt={`${round.type} round`}
                  className="w-24 h-24 object-contain"
                />
              </div>

              {/* Info */}
              <div className="space-y-2 text-sm text-gray-300 mt-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>{formatDate(round.start_date)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>Duration: {calculateDuration(round.start_date, round.end_date)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span>Teams: Up to 5 (Mix pro & amateur)</span>
                </div>
              </div>

              {/* Badge + Button */}
              <div className="flex items-center justify-between mt-4">
                <Badge className={cn('px-3 py-1 text-xs font-medium rounded-full', getRoundTypeColor(roundType))}>
                  {round.type}
                </Badge>

                <Button
                  className="ml-auto bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2"
                  onClick={() => setSelectedRound(round)}
                >
                  Join Round
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
