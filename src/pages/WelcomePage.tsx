import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SearchableNavbar from "@/components/SearchableNavbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, TrendingUp, Trophy } from "lucide-react";

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
      <section className="relative overflow-hidden py-20 md:py-32 reveal-on-scroll">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-blue-900/10 to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.15),transparent_50%)]" />
        </div>

        <div className="container mx-auto px-4 relative z-10 text-center">
          <img 
            src="/lovable-uploads/frags_and_fortunes_transparent.png" 
            alt="Frags & Fortunes" 
            className="h-32 md:h-48 mx-auto mb-8"
          />
          <h1 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">
            <span className="text-purple-500">Pick'ems meets </span>
            <span className="text-yellow-400">Fantasy </span>
            <span className="text-white">Esports!!!</span>
          </h1>

          <p className="text-2xl md:text-3xl text-muted-foreground mb-4">Pick teams. Score points. Win prizes.</p>

          <p className="text-lg text-purple-400 mb-10 font-semibold">Pro + Amateur Matches</p>

          <Link to="/auth">
            <Button
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-6 px-12 rounded-xl text-xl shadow-lg hover:shadow-purple-500/50 transition-all"
            >
              Start Playing
            </Button>
          </Link>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gradient-to-br from-[#0B0F14] to-[#12161C] reveal-on-scroll">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            How It Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 - Pick Teams */}
            <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-purple-500/30 hover:border-purple-500/60 transition-all hover:shadow-lg hover:shadow-purple-500/20">
              <CardContent className="p-8 text-center">
                <div className="mb-6 flex justify-center">
                  <div className="w-20 h-20 flex items-center justify-center rounded-full bg-gradient-to-br from-yellow-500/20 to-purple-500/20 border-2 border-purple-500/50">
                    <Shield className="w-10 h-10 text-purple-400" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-4">Pick Your Teams</h3>
                <p className="text-muted-foreground">Choose from both pro AND upcoming amateur teams</p>
              </CardContent>
            </Card>

            {/* Card 2 - Score Points */}
            <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-blue-500/30 hover:border-blue-500/60 transition-all hover:shadow-lg hover:shadow-blue-500/20">
              <CardContent className="p-8 text-center">
                <div className="mb-6 flex justify-center">
                  <div className="w-20 h-20 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-2 border-blue-500/50">
                    <TrendingUp className="w-10 h-10 text-blue-400" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-4">Score Points</h3>
                <p className="text-muted-foreground">Teams earn points from real match results.</p>
              </CardContent>
            </Card>

            {/* Card 3 - Win Rewards */}
            <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-yellow-500/30 hover:border-yellow-500/60 transition-all hover:shadow-lg hover:shadow-yellow-500/20">
              <CardContent className="p-8 text-center">
                <div className="mb-6 flex justify-center">
                  <div className="w-20 h-20 flex items-center justify-center rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50">
                    <Trophy className="w-10 h-10 text-yellow-400" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-4">Win Rewards</h3>
                <p className="text-muted-foreground">Climb the leaderboard to win prizes.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Frags & Fortunes Section */}
      <section className="py-20 reveal-on-scroll">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
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
      <section className="py-20 bg-gradient-to-br from-purple-900/20 to-blue-900/20 reveal-on-scroll">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 text-foreground">Ready to dominate?</h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Join thousands of players competing in daily, weekly, and monthly fantasy esports tournaments.
          </p>
          <Link to="/auth">
            <Button
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-6 px-12 rounded-xl text-xl shadow-lg hover:shadow-purple-500/50 transition-all"
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
