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
          , select a game and tournament you want to compete in, and pick your teams within your budget.
        </>
      ),
    },
    {
      question: "IS FRAGS & FORTUNES FREE TO PLAY?",
      answer: "Yes! Frags & Fortunes is completely free to play. Join global leaderboards and compete for prizes without any entry fees.",
    },
    {
      question: "WHAT CAN I WIN BY PLAYING FRAGS & FORTUNES?",
      answer: "Compete for exciting rewards including credits, exclusive badges, avatar frames, and titles. Top performers in each round win prizes based on their leaderboard position.",
    },
    {
      question: "HOW TO JOIN OR CREATE PRIVATE LEADERBOARDS?",
      answer: "Navigate to the Fantasy page and click 'Private Rounds'. You can create your own private round with a unique join code or enter a code to join an existing private leaderboard with friends.",
    },
  ];

  return (
    <section className="py-8 md:py-20 reveal-on-scroll overflow-hidden bg-gradient-to-b from-background to-[#1F2937]">
      <div className="container mx-auto px-3 max-w-4xl">
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
              <AccordionContent className="px-4 md:px-6 pb-4 text-xs md:text-sm text-muted-foreground leading-relaxed">
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
