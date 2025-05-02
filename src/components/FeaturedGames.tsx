
import React from 'react';
import { Link } from 'react-router-dom';
import { GameCard } from './GameCard';

const FeaturedGames = () => {
  const games = [
    {
      id: 'csgo',
      title: 'CS:GO',
      imageUrl: 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?auto=format&fit=crop&w=600&h=350',
      description: 'Find the best odds and bonuses for Counter-Strike matches',
      link: '/esports/csgo'
    },
    {
      id: 'lol',
      title: 'League of Legends',
      imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&h=350',
      description: 'Bet on LoL tournaments with exclusive promotions',
      link: '/esports/lol'
    },
    {
      id: 'dota2',
      title: 'Dota 2',
      imageUrl: 'https://images.unsplash.com/photo-1603481546164-9ce7efd92152?auto=format&fit=crop&w=600&h=350',
      description: 'Compare Dota 2 betting options and bonuses',
      link: '/esports/dota2'
    },
    {
      id: 'valorant',
      title: 'Valorant',
      imageUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=600&h=350',
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
