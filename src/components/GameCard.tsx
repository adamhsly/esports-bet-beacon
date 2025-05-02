
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface GameCardProps {
  title: string;
  imageUrl: string;
  description: string;
  link: string;
}

export const GameCard: React.FC<GameCardProps> = ({ title, imageUrl, description, link }) => {
  return (
    <Link to={link} className="game-card">
      <img 
        src={imageUrl} 
        alt={title} 
        className="w-full h-48 object-cover"
      />
      <div className="relative z-20 p-4">
        <h3 className="text-xl font-bold font-gaming text-white">{title}</h3>
        <p className="text-gray-300 text-sm mt-2 mb-3">{description}</p>
        <div className="flex items-center text-theme-green font-medium text-sm">
          View betting sites
          <ArrowRight size={16} className="ml-1" />
        </div>
      </div>
    </Link>
  );
};
