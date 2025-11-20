import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SearchableNavbar from "@/components/SearchableNavbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import pickTeamsImg from "@/assets/welcome/pick-teams.png";
import scorePointsImg from "@/assets/welcome/score-points.png";
import winPrizesImg from "@/assets/welcome/win-prizes.png";

const WelcomePage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to matches page
  useEffect(() => {
    if (!loading && user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  // Add scroll reveal animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-in");
          }
        });
      },
      { threshold: 0.1 },
    );

    document.querySelectorAll(".reveal-on-scroll").forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  if (loading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <SearchableNavbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-12 md:py-32 reveal-on-scroll">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-blue-900/10 to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.15),transparent_50%)]" />
        </div>

        <div className="container mx-auto px-4 relative z-10 text-center">
          <img 
            src="/lovable-uploads/frags_and_fortunes_transparent.png" 
            alt="Frags & Fortunes" 
            className="h-24 md:h-48 mx-auto mb-6 md:mb-8 max-w-full"
          />
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4 md:mb-6 tracking-tight px-2">
            <span className="text-purple-500">Pick'ems meets </span>
            <span className="text-yellow-400">Fantasy </span>
            <span className="text-white">Esports!!!</span>
          </h1>

          <p className="text-base md:text-xl text-muted-foreground mb-8 md:mb-10 px-4 max-w-3xl mx-auto">Pick Your Favourite Pro & Amateur teams. Score points when they win. The most points collect prizes.</p>

          <Link to="/auth">
            <Button
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-4 px-8 md:py-6 md:px-12 rounded-xl text-lg md:text-xl shadow-lg hover:shadow-purple-500/50 transition-all"
            >
              Start Playing
            </Button>
          </Link>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-12 md:py-20 bg-gradient-to-br from-[#0B0F14] to-[#12161C] reveal-on-scroll">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-5xl font-bold text-center mb-10 md:mb-16 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            How It Works
          </h2>

          <div className="max-w-6xl mx-auto space-y-6 md:space-y-12">
            {/* Card 1 - Pick Teams (Image Left) */}
            <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-purple-500/30 hover:border-purple-500/60 transition-all hover:shadow-lg hover:shadow-purple-500/20">
              <CardContent className="p-4 md:p-8">
                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
                  <div className="w-36 h-36 md:w-60 md:h-60 flex-shrink-0">
                    <img src={pickTeamsImg} alt="Pick Your Teams" className="w-full h-full object-contain rounded-lg" />
                  </div>
                  <div className="flex-1 min-w-0 text-center md:text-left">
                    <h3 className="text-lg md:text-2xl font-bold text-white mb-2">Pick Your Teams</h3>
                    <p className="text-sm md:text-base text-white/90">Choose from both pro AND upcoming amateur teams</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2 - Score Points (Image Right) */}
            <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-blue-500/30 hover:border-blue-500/60 transition-all hover:shadow-lg hover:shadow-blue-500/20">
              <CardContent className="p-4 md:p-8">
                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
                  <div className="w-36 h-36 md:w-60 md:h-60 flex-shrink-0 md:order-2">
                    <img src={scorePointsImg} alt="Score Points" className="w-full h-full object-contain rounded-lg" />
                  </div>
                  <div className="flex-1 min-w-0 text-center md:text-left md:order-1">
                    <h3 className="text-lg md:text-2xl font-bold text-white mb-2">Score Points</h3>
                    <p className="text-sm md:text-base text-white/90">Teams earn points from real match results.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 3 - Win Rewards (Image Left) */}
            <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-yellow-500/30 hover:border-yellow-500/60 transition-all hover:shadow-lg hover:shadow-yellow-500/20">
              <CardContent className="p-4 md:p-8">
                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
                  <div className="w-36 h-36 md:w-60 md:h-60 flex-shrink-0">
                    <img src={winPrizesImg} alt="Win Rewards" className="w-full h-full object-contain rounded-lg" />
                  </div>
                  <div className="flex-1 min-w-0 text-center md:text-left">
                    <h3 className="text-lg md:text-2xl font-bold text-white mb-2">Win Rewards</h3>
                    <p className="text-sm md:text-base text-white/90">Climb the leaderboard to win prizes.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Frags & Fortunes Section */}
      <section className="py-12 md:py-20 reveal-on-scroll">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-5xl font-bold text-center mb-10 md:mb-16 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Why Frags & Fortunes?
          </h2>

          <div className="max-w-4xl mx-auto">
            <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-purple-500/30">
              <CardContent className="p-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
                      <p className="text-muted-foreground text-lg">Pro + Amateur matches</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                      <p className="text-muted-foreground text-lg">Free-to-play rounds</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2" />
                      <p className="text-muted-foreground text-lg">Constant tournaments</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
                      <p className="text-muted-foreground text-lg">Real prizes</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                      <p className="text-muted-foreground text-lg font-bold">
                        The only place in the world offering Pro and Amateur combined fantasy leagues
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Bottom CTA Section */}
      <section className="py-12 md:py-20 bg-gradient-to-br from-purple-900/20 to-blue-900/20 reveal-on-scroll">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 md:mb-8 text-foreground">Ready to dominate?</h2>
          <p className="text-base md:text-xl text-muted-foreground mb-8 md:mb-10 max-w-2xl mx-auto px-4">
            Join thousands of players competing in daily, weekly, and monthly fantasy esports tournaments.
          </p>
          <Link to="/auth">
            <Button
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-4 px-8 md:py-6 md:px-12 rounded-xl text-lg md:text-xl shadow-lg hover:shadow-purple-500/50 transition-all"
            >
              Create Your Free Account
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default WelcomePage;
