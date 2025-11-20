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
import globalLeaderboardImg from "@/assets/welcome/global-leaderboard-shield.png";
import privateLeaderboardImg from "@/assets/welcome/private-leaderboard-shield.png";

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
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SearchableNavbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-12 md:py-32 reveal-on-scroll">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-blue-900/10 to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.15),transparent_50%)]" />
        </div>

        <div className="container mx-auto px-4 relative z-10 text-center max-w-full">
          <img 
            src="/lovable-uploads/frags_and_fortunes_transparent.png" 
            alt="Frags & Fortunes" 
            className="h-20 md:h-48 mx-auto mb-4 md:mb-8 max-w-full object-contain"
          />
          <h1 className="text-xl sm:text-2xl md:text-5xl font-bold mb-4 md:mb-6 tracking-tight px-2 break-words">
            <span className="text-purple-500">Pick'ems meets </span>
            <span className="text-yellow-400">Fantasy </span>
            <span className="text-white">Esports!!!</span>
          </h1>

          <p className="text-sm md:text-xl text-muted-foreground mb-6 md:mb-10 px-4 max-w-3xl mx-auto">Pick Your Favourite Pro & Amateur teams. Score points when they win. The most points collect prizes.</p>

          <Link to="/auth">
            <Button
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 px-6 md:py-6 md:px-12 rounded-xl text-base md:text-xl shadow-lg hover:shadow-purple-500/50 transition-all"
            >
              Start Playing
            </Button>
          </Link>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-12 md:py-20 bg-gradient-to-br from-[#0B0F14] to-[#12161C] reveal-on-scroll overflow-hidden">
        <div className="container mx-auto px-4 max-w-full">
          <h2 className="text-2xl md:text-5xl font-bold text-center mb-8 md:mb-16 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent px-2">
            How It Works
          </h2>

          <div className="max-w-6xl mx-auto space-y-6 md:space-y-12 overflow-hidden">
            {/* Card 1 - Pick Teams (Image Left) */}
            <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-purple-500/30 hover:border-purple-500/60 transition-all hover:shadow-lg hover:shadow-purple-500/20 mx-2">
              <CardContent className="p-3 md:p-8">
                <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-8">
                  <div className="w-36 h-36 md:w-72 md:h-72 flex-shrink-0">
                    <img src={pickTeamsImg} alt="Pick Your Teams" className="w-full h-full object-contain rounded-lg" />
                  </div>
                  <div className="text-center max-w-full px-2">
                    <h3 className="text-base md:text-2xl font-bold text-white mb-2 break-words">Pick Your Teams</h3>
                    <p className="text-xs md:text-base text-white/90 break-words">Choose from both pro AND upcoming amateur teams</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2 - Score Points (Image Right) */}
            <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-blue-500/30 hover:border-blue-500/60 transition-all hover:shadow-lg hover:shadow-blue-500/20 mx-2">
              <CardContent className="p-3 md:p-8">
                <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-8">
                  <div className="w-36 h-36 md:w-72 md:h-72 flex-shrink-0 md:order-2">
                    <img src={scorePointsImg} alt="Score Points" className="w-full h-full object-contain rounded-lg" />
                  </div>
                  <div className="text-center max-w-full px-2 md:order-1">
                    <h3 className="text-base md:text-2xl font-bold text-white mb-2 break-words">Score Points</h3>
                    <p className="text-xs md:text-base text-white/90 break-words">Teams earn points from real match results.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 3 - Win Rewards (Image Left) */}
            <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-yellow-500/30 hover:border-yellow-500/60 transition-all hover:shadow-lg hover:shadow-yellow-500/20 mx-2">
              <CardContent className="p-3 md:p-8">
                <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-8">
                  <div className="w-36 h-36 md:w-72 md:h-72 flex-shrink-0">
                    <img src={winPrizesImg} alt="Win Rewards" className="w-full h-full object-contain rounded-lg" />
                  </div>
                  <div className="text-center max-w-full px-2">
                    <h3 className="text-base md:text-2xl font-bold text-white mb-2 break-words">Win Rewards</h3>
                    <p className="text-xs md:text-base text-white/90 break-words">Climb the leaderboard to win prizes.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Leaderboards Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mt-6 md:mt-12 px-2">
              {/* Global Leaderboards Card */}
              <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-green-500/30 hover:border-green-500/60 transition-all hover:shadow-lg hover:shadow-green-500/20">
                <CardContent className="p-3 md:p-8">
                  <div className="flex flex-col items-center justify-center gap-3 md:gap-4 text-center">
                    <div className="w-32 h-32 md:w-56 md:h-56 flex-shrink-0">
                      <img src={globalLeaderboardImg} alt="Global Leaderboards" className="w-full h-full object-contain" />
                    </div>
                    <div className="max-w-full px-2">
                      <h3 className="text-lg md:text-2xl font-bold text-white mb-2 break-words">Global Leaderboards</h3>
                      <p className="text-xs md:text-base text-white/90 break-words">Compete against the best fantasy esports players by climbing the season and tournament leaderboards</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Private Leaderboards Card */}
              <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-pink-500/30 hover:border-pink-500/60 transition-all hover:shadow-lg hover:shadow-pink-500/20">
                <CardContent className="p-3 md:p-8">
                  <div className="flex flex-col items-center justify-center gap-3 md:gap-4 text-center">
                    <div className="w-32 h-32 md:w-56 md:h-56 flex-shrink-0">
                      <img src={privateLeaderboardImg} alt="Private Leaderboards" className="w-full h-full object-contain" />
                    </div>
                    <div className="max-w-full px-2">
                      <h3 className="text-lg md:text-2xl font-bold text-white mb-2 break-words">Private Leaderboards</h3>
                      <p className="text-xs md:text-base text-white/90 break-words">Invite your friends and have fun while competing in private fantasy leaderboards</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Why Frags & Fortunes Section */}
      <section className="py-12 md:py-20 reveal-on-scroll overflow-hidden">
        <div className="container mx-auto px-4 max-w-full">
          <h2 className="text-2xl md:text-5xl font-bold text-center mb-8 md:mb-16 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent px-2">
            Why Frags & Fortunes?
          </h2>

          <div className="max-w-4xl mx-auto">
            <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-purple-500/30 mx-2">
              <CardContent className="p-4 md:p-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <div className="space-y-3 md:space-y-4">
                    <div className="flex items-start gap-2 md:gap-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                      <p className="text-muted-foreground text-sm md:text-lg break-words">Pro + Amateur matches</p>
                    </div>
                    <div className="flex items-start gap-2 md:gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      <p className="text-muted-foreground text-sm md:text-lg break-words">Free-to-play rounds</p>
                    </div>
                    <div className="flex items-start gap-2 md:gap-3">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
                      <p className="text-muted-foreground text-sm md:text-lg break-words">Constant tournaments</p>
                    </div>
                  </div>

                  <div className="space-y-3 md:space-y-4">
                    <div className="flex items-start gap-2 md:gap-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                      <p className="text-muted-foreground text-sm md:text-lg break-words">Real prizes</p>
                    </div>
                    <div className="flex items-start gap-2 md:gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      <p className="text-muted-foreground text-sm md:text-lg font-bold break-words">
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
      <section className="py-12 md:py-20 bg-gradient-to-br from-purple-900/20 to-blue-900/20 reveal-on-scroll overflow-hidden">
        <div className="container mx-auto px-4 text-center max-w-full">
          <h2 className="text-2xl md:text-5xl font-bold mb-4 md:mb-8 text-foreground px-2 break-words">Ready to dominate?</h2>
          <p className="text-sm md:text-xl text-muted-foreground mb-6 md:mb-10 max-w-2xl mx-auto px-4 break-words">
            Join thousands of players competing in daily, weekly, and monthly fantasy esports tournaments.
          </p>
          <Link to="/auth">
            <Button
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 px-6 md:py-6 md:px-12 rounded-xl text-base md:text-xl shadow-lg hover:shadow-purple-500/50 transition-all"
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
