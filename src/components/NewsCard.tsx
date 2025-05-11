
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface NewsItemProps {
  id: string;
  title: string;
  summary: string;
  imageUrl?: string;
  date: string;
  source: string;
  url: string;
  categories?: string[];
}

interface NewsCardProps {
  news: NewsItemProps;
  variant?: 'default' | 'featured';
}

export const NewsCard: React.FC<NewsCardProps> = ({ 
  news, 
  variant = 'default' 
}) => {
  const { title, summary, imageUrl, date, source, url, categories } = news;
  
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  
  if (variant === 'featured') {
    return (
      <Card className="bg-theme-gray-dark border-theme-gray-medium overflow-hidden h-full">
        <div className="grid grid-cols-1 md:grid-cols-2 h-full">
          <div className="relative h-48 md:h-full">
            <img 
              src={imageUrl || '/placeholder.svg'} 
              alt={title}
              className="absolute w-full h-full object-cover"
            />
            {categories && categories.length > 0 && (
              <div className="absolute top-3 left-3">
                <Badge className="bg-theme-purple hover:bg-theme-purple/90">
                  {categories[0]}
                </Badge>
              </div>
            )}
          </div>
          
          <CardContent className="flex flex-col p-5">
            <div className="flex items-center text-sm text-gray-400 mb-3">
              <Calendar size={14} className="mr-1" />
              {formattedDate} • {source}
            </div>
            
            <h3 className="text-xl font-bold mb-3">
              {title}
            </h3>
            
            <p className="text-gray-300 mb-4 flex-grow">
              {summary.length > 150 ? `${summary.substring(0, 150)}...` : summary}
            </p>
            
            <Button 
              asChild 
              variant="outline" 
              className="border-theme-purple text-theme-purple hover:bg-theme-purple hover:text-white w-full mt-2"
            >
              <a href={url} target="_blank" rel="noopener noreferrer">
                Read Full Article
                <ArrowRight size={14} className="ml-1.5" />
              </a>
            </Button>
          </CardContent>
        </div>
      </Card>
    );
  }
  
  return (
    <Card className="bg-theme-gray-dark border-theme-gray-medium h-full">
      <div className="relative h-48">
        <img 
          src={imageUrl || '/placeholder.svg'} 
          alt={title}
          className="w-full h-full object-cover"
        />
        {categories && categories.length > 0 && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-theme-purple hover:bg-theme-purple/90">
              {categories[0]}
            </Badge>
          </div>
        )}
      </div>
      
      <CardContent className="p-5">
        <div className="flex items-center text-sm text-gray-400 mb-3">
          <Calendar size={14} className="mr-1" />
          {formattedDate} • {source}
        </div>
        
        <h3 className="text-lg font-bold mb-2">
          {title}
        </h3>
        
        <p className="text-gray-300 mb-4 text-sm">
          {summary.length > 100 ? `${summary.substring(0, 100)}...` : summary}
        </p>
        
        <Button 
          asChild 
          variant="ghost" 
          className="text-theme-purple hover:text-theme-purple hover:bg-theme-purple/10 p-0"
        >
          <a href={url} target="_blank" rel="noopener noreferrer">
            Read More
            <ArrowRight size={14} className="ml-1.5" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
};

export default NewsCard;
