
// API Constants and Configuration
export const API_KEY = "GsZ3ovnDw0umMvL5p7SfPA";
export const BASE_URL = "https://api.sportdevs.com";
export const WEB_URL = "https://esports.sportdevs.com";

// Map our esport types to SportDevs API game identifiers
export const mapEsportTypeToGameId = (esportType: string): string => {
  const mapping: Record<string, string> = {
    csgo: "csgo",
    dota2: "dota2",
    lol: "lol",
    valorant: "valorant",
    overwatch: "overwatch",
    rocketleague: "rl"
  };
  
  return mapping[esportType] || "csgo"; // Default to CS:GO
};

// Map game slug to our esport type
export const mapGameSlugToEsportType = (gameSlug: string): string => {
  const mapping: Record<string, string> = {
    "csgo": "csgo",
    "dota2": "dota2",
    "lol": "lol",
    "valorant": "valorant",
    "overwatch": "overwatch",
    "rl": "rocketleague"
  };
  
  return mapping[gameSlug] || "csgo";
};
