import React from 'react';
import { RoundSummaryCards } from './RoundSummaryCards';

// Mock data for demonstration
const mockRounds = [
  {
    id: 'daily-89',
    type: 'daily' as const,
    status: 'active' as const,
    title: 'Daily Round #89',
    endDate: 'Today 11:59 PM',
    currentScore: 3247,
    rank: 23,
    totalParticipants: 1847,
    teams: [
      {
        id: 'team-1',
        name: 'Lightning Bolts',
        type: 'pro' as const,
        logo_url: '/team-logos/lightning-bolts.png',
        score: 850,
        next_match: {
          opponent: 'Thunder Hawks',
          date: 'Today 8:00 PM',
          tournament: 'ESL Pro League'
        }
      },
      {
        id: 'team-2',
        name: 'Neon Guardians',
        type: 'amateur' as const,
        score: 620,
        next_match: {
          opponent: 'Cyber Wolves',
          date: 'Tomorrow 6:00 PM',
          tournament: 'Regional Cup'
        }
      },
      {
        id: 'team-3',
        name: 'Plasma Wolves',
        type: 'pro' as const,
        score: 1200,
        next_match: {
          opponent: 'Storm Eagles',
          date: 'Tomorrow 9:00 PM',
          tournament: 'Champions League'
        }
      },
      {
        id: 'team-4',
        name: 'Digital Storm',
        type: 'amateur' as const,
        score: 577,
        next_match: {
          opponent: 'Tech Titans',
          date: 'Today 10:00 PM',
          tournament: 'Amateur League'
        }
      }
    ],
    scoringBreakdown: {
      matchWins: 12,
      mapWins: 28,
      tournamentWins: 2,
      starBonus: 340
    },
    activityFeed: [
      {
        id: 'act-1',
        type: 'score_update' as const,
        message: 'Lightning Bolts won vs Thunder Hawks',
        timestamp: '2 hours ago',
        points: 250
      },
      {
        id: 'act-2',
        type: 'star_bonus' as const,
        message: 'Star team double points applied',
        timestamp: '3 hours ago',
        points: 170
      },
      {
        id: 'act-3',
        type: 'match_result' as const,
        message: 'Plasma Wolves lost vs Storm Eagles',
        timestamp: '4 hours ago',
        points: -50
      },
      {
        id: 'act-4',
        type: 'score_update' as const,
        message: 'Neon Guardians won vs Cyber Wolves',
        timestamp: '5 hours ago',
        points: 180
      }
    ]
  },
  {
    id: 'weekly-12',
    type: 'weekly' as const,
    status: 'active' as const,
    title: 'Weekly Round #12',
    endDate: 'Sunday 11:59 PM',
    currentScore: 8950,
    rank: 145,
    totalParticipants: 5231,
    teams: [
      {
        id: 'team-5',
        name: 'Quantum Strike',
        type: 'pro' as const,
        score: 2340,
        next_match: {
          opponent: 'Alpha Squad',
          date: 'Friday 7:00 PM',
          tournament: 'Major Championship'
        }
      },
      {
        id: 'team-6',
        name: 'Frost Hunters',
        type: 'amateur' as const,
        score: 1890,
        next_match: {
          opponent: 'Fire Phoenix',
          date: 'Saturday 3:00 PM',
          tournament: 'Weekly Cup'
        }
      }
    ],
    scoringBreakdown: {
      matchWins: 28,
      mapWins: 67,
      tournamentWins: 4,
      starBonus: 890
    },
    activityFeed: [
      {
        id: 'act-5',
        type: 'score_update' as const,
        message: 'Quantum Strike advanced to finals',
        timestamp: '1 day ago',
        points: 500
      },
      {
        id: 'act-6',
        type: 'match_result' as const,
        message: 'Frost Hunters eliminated in semis',
        timestamp: '1 day ago',
        points: 0
      }
    ]
  },
  {
    id: 'monthly-3',
    type: 'monthly' as const,
    status: 'finished' as const,
    title: 'Monthly Round #3',
    endDate: 'Finished',
    currentScore: 12340,
    rank: 512,
    totalParticipants: 12847,
    teams: [
      {
        id: 'team-7',
        name: 'Shadow Legends',
        type: 'pro' as const,
        score: 4200,
        next_match: {
          opponent: 'Next month',
          date: 'TBD',
          tournament: 'Monthly Finals'
        }
      },
      {
        id: 'team-8',
        name: 'Void Runners',
        type: 'amateur' as const,
        score: 3140,
        next_match: {
          opponent: 'Next month',
          date: 'TBD',
          tournament: 'Monthly Finals'
        }
      }
    ],
    scoringBreakdown: {
      matchWins: 45,
      mapWins: 120,
      tournamentWins: 8,
      starBonus: 1540
    },
    activityFeed: [
      {
        id: 'act-7',
        type: 'score_update' as const,
        message: 'Monthly round completed',
        timestamp: '3 days ago',
        points: 0
      }
    ]
  }
];

export const RoundSummaryPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0F14] to-[#12161C] p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-gaming text-white mb-2">Round Summary</h1>
          <p className="text-muted-foreground">
            Track your performance across all active rounds
          </p>
        </div>
        
        <RoundSummaryCards 
          rounds={mockRounds} 
          selectedRoundId="daily-89"
          onRoundSelect={(roundId) => console.log('Selected round:', roundId)}
        />
      </div>
    </div>
  );
};