import React from 'react';
import { useParams } from 'react-router-dom';
import { PageRenderer } from '@/components/cms/PageRenderer';

const LegalPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  
  if (!slug) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">Invalid Page</h1>
          <p className="text-muted-foreground">No page slug provided.</p>
        </div>
      </div>
    );
  }

  return <PageRenderer slug={slug} />;
};

export default LegalPage;