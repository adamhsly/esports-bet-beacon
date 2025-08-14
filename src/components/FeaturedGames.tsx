
import React from 'react';
import { Link } from 'react-router-dom';
import { GameCard } from './GameCard';

// Import game logos
import counterStrike2Logo from '@/assets/logos/esports/counter-strike-2.png';
import leagueOfLegendsLogo from '@/assets/logos/esports/league-of-legends.png';
import dota2Logo from '@/assets/logos/esports/dota-2.png';
import valorantLogo from '@/assets/logos/esports/valorant.png';

const FeaturedGames = () => {
  const games = [
    {
      id: 'counter-strike',
      title: 'Counter-Strike 2',
      imageUrl: counterStrike2Logo,
      description: 'Find the best odds and bonuses for Counter-Strike matches',
      link: '/esports/counter-strike'
    },
    {
      id: 'lol',
      title: 'League of Legends',
      imageUrl: leagueOfLegendsLogo,
      description: 'Bet on LoL tournaments with exclusive promotions',
      link: '/esports/lol'
    },
    {
      id: 'dota2',
      title: 'Dota 2',
      imageUrl: dota2Logo,
      description: 'Compare Dota 2 betting options and bonuses',
      link: '/esports/dota2'
    },
    {
      id: 'valorant',
      title: 'Valorant',
      imageUrl: valorantLogo,
      description: 'Discover the best Valorant betting opportunities',
      link: '/esports/valorant'
    }
  ];

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold mb-2 font-gaming">Popular Esports Games</h2>
        <p className="text-gray-400 mb-8">Find the best betting odds for your favorite games</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {games.map(game => (
            <GameCard
              key={game.id}
              title={game.title}
              imageUrl={game.imageUrl}
              description={game.description}
              link={game.link}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedGames;
