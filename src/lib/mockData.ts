
import { MatchInfo } from '@/components/MatchCard';

// This is a mock data source
// In a real application, this would be fetched from an API

// Helper to generate a unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Generate team logos for different esports
const getTeamLogo = (teamName: string, esportType: string): string => {
  return '/placeholder.svg';
};

// Sample team names for different esports
const esportsTeams: Record<string, string[]> = {
  csgo: [
    'Natus Vincere', 'Vitality', 'FaZe Clan', 'G2 Esports', 
    'Astralis', 'Liquid', 'Heroic', 'Cloud9', 'MOUZ', 'ENCE'
  ],
  lol: [
    'T1', 'Gen.G', 'JD Gaming', 'Bilibili Gaming', 'Cloud9', 
    'G2 Esports', 'Fnatic', 'MAD Lions', 'Team Liquid', 'FlyQuest'
  ],
  dota2: [
    'Team Spirit', 'PSG.LGD', 'OG', 'Team Secret', 'Team Liquid', 
    'Evil Geniuses', 'Virtus.pro', 'Tundra Esports', 'Alliance', 'Nigma Galaxy'
  ],
  valorant: [
    'Sentinels', 'LOUD', 'Fnatic', 'DRX', 'Paper Rex', 
    'Cloud9', '100 Thieves', 'Team Liquid', 'NRG', 'Karmine Corp'
  ],
  overwatch: [
    'San Francisco Shock', 'Seoul Dynasty', 'Dallas Fuel', 'Shanghai Dragons',
    'Houston Outlaws', 'Atlanta Reign', 'London Spitfire', 'Los Angeles Gladiators'
  ],
  rocketleague: [
    'Team BDS', 'G2 Esports', 'Vitality', 'FaZe Clan', 'FURIA', 
    'Gen.G', 'Dignitas', 'Version1', 'Complexity', 'Team Liquid'
  ]
};

// Sample tournaments for different esports
const esportsTournaments: Record<string, string[]> = {
  csgo: ['ESL Pro League', 'BLAST Premier', 'IEM Cologne', 'ESL One', 'BLAST Fall Finals'],
  lol: ['LCK', 'LEC', 'LCS', 'Worlds', 'MSI'],
  dota2: ['The International', 'ESL One', 'Dota Pro Circuit', 'Major', 'WePlay'],
  valorant: ['Valorant Champions Tour', 'Masters', 'Challengers', 'Red Bull Home Ground', 'Champions'],
  overwatch: ['Overwatch League', 'Overwatch Cup', 'Overwatch Contenders'],
  rocketleague: ['RLCS World Championship', 'RLCS Major', 'Regional Event', 'Winter Split']
};

// Generate random date within the next few days
const getRandomDate = (daysAhead: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + Math.floor(Math.random() * daysAhead));
  date.setHours(Math.floor(Math.random() * 12) + 10); // 10 AM to 10 PM
  date.setMinutes(Math.floor(Math.random() * 4) * 15); // 0, 15, 30, or 45 minutes
  return date.toISOString();
};

// Get matches for today for a specific esport
export const getTodayMatches = (esportType: string): MatchInfo[] => {
  const teams = esportsTeams[esportType] || esportsTeams.csgo;
  const tournaments = esportsTournaments[esportType] || esportsTournaments.csgo;
  
  // Generate 3-5 matches for today
  const matchCount = Math.floor(Math.random() * 3) + 3;
  const matches: MatchInfo[] = [];
  
  for (let i = 0; i < matchCount; i++) {
    // Select two random teams
    const teamIndices: number[] = [];
    while (teamIndices.length < 2) {
      const index = Math.floor(Math.random() * teams.length);
      if (!teamIndices.includes(index)) {
        teamIndices.push(index);
      }
    }
    
    const teamA = teams[teamIndices[0]];
    const teamB = teams[teamIndices[1]];
    
    // Create the match
    matches.push({
      id: generateId(),
      teams: [
        { name: teamA, logo: getTeamLogo(teamA, esportType) },
        { name: teamB, logo: getTeamLogo(teamB, esportType) }
      ],
      startTime: getRandomDate(0), // Today
      tournament: tournaments[Math.floor(Math.random() * tournaments.length)],
      esportType,
      bestOf: [3, 5][Math.floor(Math.random() * 2)] // BO3 or BO5
    });
  }
  
  return matches;
};

// Get upcoming matches for a specific esport
export const getUpcomingMatches = (esportType: string): MatchInfo[] => {
  const teams = esportsTeams[esportType] || esportsTeams.csgo;
  const tournaments = esportsTournaments[esportType] || esportsTournaments.csgo;
  
  // Generate 6-10 upcoming matches
  const matchCount = Math.floor(Math.random() * 5) + 6;
  const matches: MatchInfo[] = [];
  
  for (let i = 0; i < matchCount; i++) {
    // Select two random teams
    const teamIndices: number[] = [];
    while (teamIndices.length < 2) {
      const index = Math.floor(Math.random() * teams.length);
      if (!teamIndices.includes(index)) {
        teamIndices.push(index);
      }
    }
    
    const teamA = teams[teamIndices[0]];
    const teamB = teams[teamIndices[1]];
    
    // Create the match
    matches.push({
      id: generateId(),
      teams: [
        { name: teamA, logo: getTeamLogo(teamA, esportType) },
        { name: teamB, logo: getTeamLogo(teamB, esportType) }
      ],
      startTime: getRandomDate(14), // Within the next 14 days
      tournament: tournaments[Math.floor(Math.random() * tournaments.length)],
      esportType,
      bestOf: [1, 3, 5][Math.floor(Math.random() * 3)] // BO1, BO3 or BO5
    });
  }
  
  // Sort by date
  return matches.sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
};

// Get a specific match by ID
export const getMatchById = (id: string): MatchInfo | undefined => {
  // For demo purposes, generate a match if ID is provided
  if (!id) return undefined;
  
  const esportType = ['csgo', 'lol', 'dota2', 'valorant'][Math.floor(Math.random() * 4)];
  const teams = esportsTeams[esportType];
  const tournaments = esportsTournaments[esportType];
  
  const teamA = teams[Math.floor(Math.random() * teams.length)];
  const teamB = teams[Math.floor(Math.random() * teams.length)];
  
  return {
    id,
    teams: [
      { name: teamA, logo: getTeamLogo(teamA, esportType) },
      { name: teamB, logo: getTeamLogo(teamB, esportType) }
    ],
    startTime: getRandomDate(3), // Within the next 3 days
    tournament: tournaments[Math.floor(Math.random() * tournaments.length)],
    esportType,
    bestOf: [3, 5][Math.floor(Math.random() * 2)] // BO3 or BO5
  };
};
