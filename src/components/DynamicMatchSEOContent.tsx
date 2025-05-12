
import React from 'react';
import { format } from 'date-fns';

interface DynamicMatchSEOContentProps {
  teamOneName: string;
  teamTwoName: string;
  tournament: string;
  matchDate: Date | string;
  esportType: string;
}

const DynamicMatchSEOContent: React.FC<DynamicMatchSEOContentProps> = ({
  teamOneName,
  teamTwoName,
  tournament,
  matchDate,
  esportType
}) => {
  const formattedDate = typeof matchDate === 'string' 
    ? format(new Date(matchDate), 'MMMM d, yyyy') 
    : format(matchDate, 'MMMM d, yyyy');
  
  const title = `${teamOneName} vs ${teamTwoName} - Live Odds, Stats & Predictions`;
  
  const generateParagraphs = () => {
    return [
      `Follow the ${esportType.toUpperCase()} matchup between ${teamOneName} and ${teamTwoName} at ${tournament} on ${formattedDate} with our comprehensive coverage including live odds, real-time scoring updates, and in-depth statistics.`,
      
      `This ${tournament} clash features ${teamOneName}, ${generateTeamDescription(teamOneName)}, facing off against ${teamTwoName}, ${generateTeamDescription(teamTwoName)}. Our detailed match center provides head-to-head records, recent form analysis, and key player statistics to enhance your viewing experience.`,
      
      `Compare betting odds for ${teamOneName} vs ${teamTwoName} from multiple top-rated bookmakers to find the best value. Our platform offers markets for match winner, map handicaps, total rounds, and other specialized betting options for this crucial ${esportType.toUpperCase()} encounter.`,
      
      `Stay updated with expert predictions and analysis for ${teamOneName} against ${teamTwoName}, incorporating team composition strengths, map preferences, and strategic tendencies. Our coverage helps you understand the key factors that could determine the outcome of this ${tournament} match.`
    ];
  };
  
  // Generate a generic team description based on team name
  const generateTeamDescription = (teamName: string) => {
    // This function creates a somewhat random but plausible description for a team
    const descriptions = [
      `known for their aggressive playstyle and strategic depth`,
      `recognized for their disciplined approach and tactical versatility`,
      `a team with impressive mechanical skills and coordination`,
      `noted for their exceptional teamwork and adaptability`,
      `respected for their innovative strategies and consistent performance`
    ];
    
    // Use the team name to "deterministically" select a description
    const nameSum = teamName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const index = nameSum % descriptions.length;
    
    return descriptions[index];
  };
  
  return (
    <section className="py-12 border-t border-theme-gray-medium mt-12">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold mb-6 text-white">{title}</h2>
        <div className="space-y-4">
          {generateParagraphs().map((paragraph, index) => (
            <p key={index} className="text-gray-400 leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DynamicMatchSEOContent;
