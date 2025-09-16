
import React from 'react';

interface SEOContentBlockProps {
  title: string;
  paragraphs: string[];
  className?: string;
}

const SEOContentBlock: React.FC<SEOContentBlockProps> = ({ 
  title, 
  paragraphs,
  className = ""
}) => {
  return (
    <section className={`py-12 border-t border-theme-gray-medium mt-12 ${className}`}>
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold mb-6 text-white">{title}</h2>
        <div className="space-y-4">
          {paragraphs.map((paragraph, index) => (
            <p key={index} className="text-gray-400 leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SEOContentBlock;
