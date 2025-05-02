
import React from 'react';
import { Star } from 'lucide-react';

const Testimonials = () => {
  const testimonials = [
    {
      id: 1,
      name: "Alex M.",
      quote: "EsportsBeacon helped me find the best CS:GO betting site with amazing odds. The comparison tools are incredibly useful!",
      rating: 5,
      game: "CS:GO"
    },
    {
      id: 2,
      name: "Sarah K.",
      quote: "Thanks to this site, I found an exclusive bonus that wasn't advertised anywhere else. The reviews are honest and detailed.",
      rating: 5,
      game: "League of Legends"
    },
    {
      id: 3,
      name: "Mike T.",
      quote: "The guides helped me understand esports betting as a complete beginner. Now I can confidently place bets on Dota 2 matches.",
      rating: 4,
      game: "Dota 2"
    }
  ];

  return (
    <section className="py-12 bg-theme-gray-dark">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10 font-gaming">What Our Users Say</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map(testimonial => (
            <div 
              key={testimonial.id} 
              className="bg-theme-dark border border-theme-gray-medium rounded-lg p-6 relative"
            >
              <div className="absolute -top-3 right-6 bg-theme-dark px-3 py-1 rounded text-sm text-gray-400">
                {testimonial.game} Fan
              </div>
              
              <div className="flex items-center mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-4 h-4 ${i < testimonial.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
                  />
                ))}
              </div>
              
              <p className="text-gray-300 mb-4 italic">"{testimonial.quote}"</p>
              
              <div className="text-sm text-gray-400">
                {testimonial.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
