import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { useSlates } from '@/hooks/usePickems';
import { PickemsSlateCard } from '@/components/pickems/PickemsSlateCard';
import { Trophy } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const PickemsPage: React.FC = () => {
  const { data: slates, isLoading } = useSlates();

  useEffect(() => {
    document.title = "Pick'ems | Frags & Fortunes";
  }, []);

  const active = (slates ?? []).filter(s => s.status === 'published' || s.status === 'closed');
  const settled = (slates ?? []).filter(s => s.status === 'settled');

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Helmet>
        <title>Pick'ems | Frags & Fortunes</title>
        <meta name="description" content="Predict match winners across esports tournaments. 1 point per correct pick. Free to play." />
        <link rel="canonical" href="https://frags-and-fortunes.lovable.app/pickems" />
      </Helmet>
      <SearchableNavbar />
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-7 w-7 text-theme-purple" />
            Pick'ems
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Predict match winners. 1 point per correct pick. Lock in before each match starts.
          </p>
        </header>

        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 bg-slate-800/50" />
            ))}
          </div>
        ) : (
          <>
            <section className="mb-8">
              <h2 className="text-lg font-semibold mb-3">Active Slates</h2>
              {active.length === 0 ? (
                <p className="text-gray-400 text-sm">No active slates right now. Check back soon.</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {active.map(s => <PickemsSlateCard key={s.id} slate={s} />)}
                </div>
              )}
            </section>

            {settled.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-3">Past Slates</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {settled.map(s => <PickemsSlateCard key={s.id} slate={s} />)}
                </div>
              </section>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default PickemsPage;
