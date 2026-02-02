import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link } from "react-router-dom";

const FaqSection = () => {
  const faqs = [
    {
      question: "HOW TO PLAY FRAGS & FORTUNES?",
      answer: (
        <>
          <Link to="/auth" className="text-blue-400 hover:text-blue-300 underline">
            Create an account
          </Link>
          , select a game and tournament you want to compete in, and pick your teams within your budget. Your selected teams earn points based on their real match results – match wins, map victories, clean sweeps, and tournament wins all contribute to your score.
        </>
      ),
    },
    {
      question: "IS FRAGS & FORTUNES FREE TO PLAY?",
      answer: "Yes! Frags & Fortunes offers completely free-to-play fantasy esports rounds where you can compete for credits and exclusive rewards. We also offer paid entry rounds where you can win Steam vouchers. Both free and paid rounds feature the same gameplay mechanics across CS2, Valorant, Dota 2, and League of Legends.",
    },
    {
      question: "WHAT CAN I WIN BY PLAYING FRAGS & FORTUNES?",
      answer: "Compete for exciting rewards including credits, exclusive badges, avatar frames, and titles in free rounds. Paid entry rounds offer Steam voucher prizes – $100 for 1st place, $50 for 2nd place, and more. Top performers on leaderboards earn recognition and seasonal rewards.",
    },
    {
      question: "HOW TO JOIN OR CREATE PRIVATE LEADERBOARDS?",
      answer: "Navigate to the Fantasy page and click 'My Private Rounds'. You can create your own private round with a unique join code, customize the game type and team restrictions, then share the code with friends, colleagues, or your gaming community to compete on your own exclusive leaderboard.",
    },
    {
      question: "WHAT ESPORTS GAMES CAN I PLAY FANTASY FOR?",
      answer: "Frags & Fortunes supports fantasy pick'ems for Counter-Strike 2 (CS2), Valorant, Dota 2, and League of Legends. Each game features both professional teams from major tournaments and amateur teams from competitive leagues like FACEIT, giving you hundreds of teams to choose from.",
    },
    {
      question: "WHAT IS THE STAR TEAM FEATURE?",
      answer: "The Star Team feature lets you designate one team in your roster to earn double points. Choose wisely – you can only change your Star Team once per round. This strategic element rewards esports knowledge and adds an extra layer of competition.",
    },
    {
      question: "CAN I CHANGE MY TEAM PICKS DURING A ROUND?",
      answer: "Yes! Each round allows one team swap after the round starts. If one of your teams is underperforming, you can swap them for another team within budget. Points earned before the swap are preserved, so timing your swap strategically is key.",
    },
    {
      question: "HOW ARE FANTASY POINTS CALCULATED?",
      answer: "Teams earn points based on real match results: 10 points for match wins, 5 points for draws, 3 points per map won, 5 bonus points for clean sweeps (winning all maps), and 20 points for tournament victories. Amateur teams receive a 25% bonus, and your Star Team earns double points on everything.",
    },
  ];

  return (
    <section className="py-8 md:py-20 reveal-on-scroll overflow-hidden bg-gradient-to-b from-background to-[#1F2937]">
      <div className="container mx-auto px-3 max-w-4xl">
        <h2 className="text-2xl md:text-5xl font-bold text-center mb-8 md:mb-16 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent leading-tight px-2 break-words">
          Frequently Asked Questions
        </h2>
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="bg-[#1F2937] border border-border/50 rounded-lg overflow-hidden"
            >
              <AccordionTrigger className="px-4 md:px-6 py-4 text-left hover:no-underline hover:bg-[#2A3441] transition-colors">
                <span className="text-sm md:text-base font-bold text-white uppercase tracking-wide">
                  {faq.question}
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-4 md:px-6 pb-4 text-xs md:text-sm text-white leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FaqSection;
