import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SearchableNavbar from "@/components/SearchableNavbar";
import Footer from "@/components/Footer";
import FaqSection from "@/components/FaqSection";
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
    <div className="min-h-screen bg-background overflow-x-hidden w-full max-w-screen">
      <SearchableNavbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-8 md:py-32 reveal-on-scroll">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-blue-900/10 to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.15),transparent_50%)]" />
        </div>

        <div className="container mx-auto px-3 relative z-10 text-center max-w-full">
          <img 
            src="/lovable-uploads/frags_and_fortunes_transparent.png" 
            alt="Frags & Fortunes" 
            className="h-16 md:h-48 mx-auto mb-4 md:mb-8 max-w-full object-contain"
          />
          <h1 className="text-xl sm:text-2xl md:text-5xl font-bold mb-4 md:mb-6 tracking-tight leading-tight px-2 break-words">
            <span className="text-purple-500">Pick'ems meets </span>
            <span className="text-yellow-400">Fantasy </span>
            <span className="text-white">Esports!!!</span>
          </h1>

          <p className="text-sm md:text-xl text-muted-foreground mb-6 md:mb-10 px-2 max-w-3xl mx-auto break-words">Pick Your Favourite Pro & Amateur teams. Score points when they win. The most points collect prizes.</p>

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
      <section className="py-8 md:py-20 bg-gradient-to-br from-[#0B0F14] to-[#12161C] reveal-on-scroll overflow-hidden">
        <div className="container mx-auto px-3 max-w-full">
          <h2 className="text-2xl md:text-5xl font-bold text-center mb-8 md:mb-16 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent leading-tight px-2 break-words">
            How It Works
          </h2>

          <div className="max-w-6xl mx-auto space-y-6 md:space-y-12 overflow-hidden">
            {/* Card 1 - Pick Teams (Image Left) */}
            <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-purple-500/30 hover:border-purple-500/60 transition-all hover:shadow-lg hover:shadow-purple-500/20 mx-0">
              <CardContent className="p-2 md:p-8">
                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-12">
                  <div className="w-28 h-28 md:w-72 md:h-72 flex-shrink-0">
                    <img 
                      src={pickTeamsImg} 
                      alt="Pick Teams" 
                      className="w-full h-full object-contain drop-shadow-2xl"
                    />
                  </div>
                  <div className="text-center md:text-left">
                    <h3 className="text-xl md:text-3xl font-bold mb-2 md:mb-4 text-purple-400 leading-tight break-words">1. Pick Your Teams</h3>
                    <p className="text-xs md:text-lg text-muted-foreground leading-relaxed break-words">Choose your favorite professional or amateur esports teams within your budget.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2 - Score Points (Image Right) */}
            <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-blue-500/30 hover:border-blue-500/60 transition-all hover:shadow-lg hover:shadow-blue-500/20 mx-0">
              <CardContent className="p-2 md:p-8">
                <div className="flex flex-col md:flex-row-reverse items-center gap-4 md:gap-12">
                  <div className="w-28 h-28 md:w-72 md:h-72 flex-shrink-0">
                    <img 
                      src={scorePointsImg} 
                      alt="Score Points" 
                      className="w-full h-full object-contain drop-shadow-2xl"
                    />
                  </div>
                  <div className="text-center md:text-left">
                    <h3 className="text-xl md:text-3xl font-bold mb-2 md:mb-4 text-blue-400 leading-tight break-words">2. Score Points</h3>
                    <p className="text-xs md:text-lg text-muted-foreground leading-relaxed break-words">Earn points when your chosen teams win matches and tournaments.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 3 - Win Prizes (Image Left) */}
            <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-yellow-500/30 hover:border-yellow-500/60 transition-all hover:shadow-lg hover:shadow-yellow-500/20 mx-0">
              <CardContent className="p-2 md:p-8">
                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-12">
                  <div className="w-28 h-28 md:w-72 md:h-72 flex-shrink-0">
                    <img 
                      src={winPrizesImg} 
                      alt="Win Prizes" 
                      className="w-full h-full object-contain drop-shadow-2xl"
                    />
                  </div>
                  <div className="text-center md:text-left">
                    <h3 className="text-xl md:text-3xl font-bold mb-2 md:mb-4 text-yellow-400 leading-tight break-words">3. Win Prizes</h3>
                    <p className="text-xs md:text-lg text-muted-foreground leading-relaxed break-words">Climb the leaderboard and win exciting rewards based on your performance.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <FaqSection />

      {/* Final CTA Section */}
      <section className="py-8 md:py-32 bg-gradient-to-br from-purple-900/20 via-blue-900/10 to-background reveal-on-scroll overflow-hidden">
        <div className="container mx-auto px-3 text-center max-w-full">
          <h2 className="text-2xl md:text-5xl font-bold mb-4 md:mb-6 leading-tight px-2 break-words">
            <span className="text-purple-500">Ready to Dominate</span>{" "}
            <span className="text-yellow-400">the Leaderboards?</span>
          </h2>
          <p className="text-sm md:text-xl text-muted-foreground mb-6 md:mb-10 px-2 max-w-2xl mx-auto break-words">Join Frags & Fortunes today and start your journey to victory!</p>
          <Link to="/auth">
            <Button
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 px-6 md:py-6 md:px-12 rounded-xl text-base md:text-xl shadow-lg hover:shadow-purple-500/50 transition-all"
            >
              Get Started Now
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default WelcomePage;
