// Test script to verify team matching logic

// Simulated data from the database
const teamFromPick = {
  team_id: 'kukuys',
  team_name: 'KUKUYS'
};

const faceitMatch = {
  faction1_name: 'execration',
  faction2_name: 'kukuys'  // This is what we found in FACEIT
};

// The improved matching logic from the edge function
const isTeamMatch = (factionName, teamId, teamName) => {
  if (!factionName) return false;
  
  const normalizedFaction = factionName.toLowerCase().trim();
  const normalizedTeamId = teamId.toLowerCase().trim();
  const normalizedTeamName = teamName.toLowerCase().trim();
  
  // Exact matches
  if (normalizedFaction === normalizedTeamId || normalizedFaction === normalizedTeamName) return true;
  
  // Partial matches (team name contains faction name or vice versa)
  if (normalizedTeamName.includes(normalizedFaction) || normalizedFaction.includes(normalizedTeamName)) return true;
  if (normalizedTeamId.includes(normalizedFaction) || normalizedFaction.includes(normalizedTeamId)) return true;
  
  return false;
};

// Test the matching
console.log('Testing team matching:');
console.log('KUKUYS vs faction1 (execration):', isTeamMatch(faceitMatch.faction1_name, teamFromPick.team_id, teamFromPick.team_name));
console.log('KUKUYS vs faction2 (kukuys):', isTeamMatch(faceitMatch.faction2_name, teamFromPick.team_id, teamFromPick.team_name));

// Test with actual FACEIT data format
const actualFaceitData = {
  faction2_name: 'KUKUYS'  // This is the actual format from the database
};

console.log('KUKUYS vs actual faction2 (KUKUYS):', isTeamMatch(actualFaceitData.faction2_name, teamFromPick.team_id, teamFromPick.team_name));