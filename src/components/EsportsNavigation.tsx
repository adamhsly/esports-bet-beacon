
import React from 'react';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const esportsTypes = [
  { id: 'csgo', name: 'CS:GO', icon: '🎯' },
  { id: 'lol', name: 'League of Legends', icon: '🏆' },
  { id: 'dota2', name: 'Dota 2', icon: '🛡️' },
  { id: 'valorant', name: 'Valorant', icon: '🔫' },
  { id: 'overwatch', name: 'Overwatch', icon: '🦸' },
  { id: 'rocketleague', name: 'Rocket League', icon: '🚗' },
];

interface EsportsNavigationProps {
  activeEsport?: string;
  onEsportChange?: (esportId: string) => void;
}

const EsportsNavigation: React.FC<EsportsNavigationProps> = ({ 
  activeEsport = 'csgo',
  onEsportChange 
}) => {
  const handleEsportChange = (value: string) => {
    if (onEsportChange) {
      onEsportChange(value);
    }
  };

  return (
    <div className="w-full overflow-auto pb-2 mb-6">
      <Tabs 
        defaultValue={activeEsport} 
        className="w-full"
        onValueChange={handleEsportChange}
      >
        <TabsList className="bg-theme-gray-dark border border-theme-gray-light w-full flex justify-start p-1 overflow-x-auto">
          {esportsTypes.map((esport) => (
            <TabsTrigger
              key={esport.id}
              value={esport.id}
              className={cn(
                "py-2 px-4 whitespace-nowrap",
                "data-[state=active]:bg-theme-purple data-[state=active]:text-white"
              )}
            >
              <span className="mr-2">{esport.icon}</span>
              {esport.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
};

export default EsportsNavigation;
