
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
    <section className={`py-12 border-t border-glass-border mt-12 ${className}`}>
      <div className="container mx-auto px-4">
        <div className="glass-card p-8 rounded-xl neon-border">
          <h2 className="text-2xl font-bold mb-6 glass-text-primary">{title}</h2>
          <div className="space-y-4">
            {paragraphs.map((paragraph, index) => (
              <p key={index} className="glass-text-secondary leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SEOContentBlock;
