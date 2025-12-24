import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronRight, ChevronLeft, Filter, Calendar, Trophy, Users, Sparkles, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WalkthroughStep {
  id: string;
  target: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: 'filters',
    target: '[data-walkthrough="filters"]',
    title: 'Filter Rounds',
    description: 'Use filters to find rounds by game, entry type (free or paid), and team type (pro or amateur teams).',
    icon: <Filter className="h-5 w-5" />,
    position: 'bottom',
  },
  {
    id: 'team-types',
    target: '[data-walkthrough="round-card"]',
    title: 'Pro & Amateur Teams',
    description: 'Purple border = Pro teams only. Orange border = Amateur (FACEIT) teams. Split border = Both types available.',
    icon: <Users className="h-5 w-5" />,
    position: 'top',
  },
  {
    id: 'free-round',
    target: '[data-walkthrough="free-round"]',
    title: 'Join a Free Round',
    description: 'Start with a free Pro round to learn the ropes. Pick your favorite esports teams and earn points when they win!',
    icon: <Trophy className="h-5 w-5" />,
    position: 'top',
  },
];

const STORAGE_KEY = 'fantasy_walkthrough_completed';

interface FantasyWalkthroughProps {
  onComplete?: () => void;
}

export const FantasyWalkthrough: React.FC<FantasyWalkthroughProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const [showIntro, setShowIntro] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Check if walkthrough should show - with delay
  useEffect(() => {
    const hasCompleted = localStorage.getItem(STORAGE_KEY) === 'true';
    if (hasCompleted) return;

    // Longer delay before showing intro prompt
    const timer = setTimeout(() => {
      setShowIntro(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Lock body scroll when walkthrough is active
  useEffect(() => {
    if (isActive) {
      // Store current scroll position and lock
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restore scroll position when unlocking
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isActive]);

  // Update target position
  const updateTargetPosition = useCallback(() => {
    if (!isActive) return;
    
    const step = WALKTHROUGH_STEPS[currentStep];
    const element = document.querySelector(step.target);
    
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [isActive, currentStep]);

  // Handle step changes - scroll element into view before locking
  useEffect(() => {
    if (!isActive) return;
    
    const step = WALKTHROUGH_STEPS[currentStep];
    const element = document.querySelector(step.target);
    
    if (element) {
      // Temporarily unlock scroll to position element
      const currentTop = document.body.style.top;
      const scrollY = currentTop ? -parseInt(currentTop, 10) : 0;
      
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
      
      // Scroll element into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Re-lock scroll after animation
      setTimeout(() => {
        const newScrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${newScrollY}px`;
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.overflow = 'hidden';
        
        // Update rect after scroll completes
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
      }, 500);
    }
  }, [currentStep, isActive]);

  // Update on resize
  useEffect(() => {
    if (!isActive) return;
    
    window.addEventListener('resize', updateTargetPosition);
    return () => window.removeEventListener('resize', updateTargetPosition);
  }, [updateTargetPosition, isActive]);

  const handleStartWalkthrough = () => {
    setShowIntro(false);
    setIsActive(true);
  };

  const handleSkipIntro = () => {
    setShowIntro(false);
    localStorage.setItem(STORAGE_KEY, 'true');
    onComplete?.();
  };

  const handleNext = () => {
    if (currentStep < WALKTHROUGH_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Last step - navigate to signup
      handleComplete();
      navigate('/auth?tab=signup');
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsActive(false);
    onComplete?.();
  };

  const handleSkip = () => {
    handleComplete();
  };

  // Intro prompt - ask if user wants help
  if (showIntro) {
    return (
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={handleSkipIntro}
      >
        <div 
          className="bg-gradient-to-br from-[#1e1e2a] to-[#2a2a3a] rounded-2xl p-6 max-w-sm mx-4 border border-[#8B5CF6]/30 shadow-2xl shadow-[#8B5CF6]/20 animate-in fade-in zoom-in duration-300 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-2xl font-bold text-white mb-6">
            Want us to show you around?
          </h2>
          
          <div className="flex gap-3">
            <Button
              onClick={handleSkipIntro}
              variant="outline"
              className="flex-1 border-white/10 text-[#d1d1d9] hover:bg-white/5"
            >
              I got this
            </Button>
            <Button
              onClick={handleStartWalkthrough}
              className="flex-1 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              Show me
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isActive) return null;

  const step = WALKTHROUGH_STEPS[currentStep];
  const isLastStep = currentStep === WALKTHROUGH_STEPS.length - 1;

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const padding = 16;
    const tooltipWidth = isLastStep ? 360 : 320;
    const effectiveTooltipWidth = Math.min(tooltipWidth, window.innerWidth - padding * 2);
    const tooltipHeight = 200;

    switch (step.position) {
      case 'bottom':
        return {
          top: targetRect.bottom + padding,
          left: Math.max(
            padding,
            Math.min(
              targetRect.left + targetRect.width / 2 - effectiveTooltipWidth / 2,
              window.innerWidth - effectiveTooltipWidth - padding,
            ),
          ),
        };
      case 'top':
        return {
          top: Math.max(padding, targetRect.top - tooltipHeight - padding),
          left: Math.max(
            padding,
            Math.min(
              targetRect.left + targetRect.width / 2 - effectiveTooltipWidth / 2,
              window.innerWidth - effectiveTooltipWidth - padding,
            ),
          ),
        };
      case 'left':
        return {
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
          left: Math.max(padding, targetRect.left - effectiveTooltipWidth - padding),
        };
      case 'right':
        return {
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
          left: Math.min(
            window.innerWidth - effectiveTooltipWidth - padding,
            targetRect.right + padding,
          ),
        };
      default:
        return {
          top: targetRect.bottom + padding,
          left: targetRect.left,
        };
    }
  };

  return (
    <>
      {/* Overlay - clicking advances to next step */}
      <div 
        className="fixed inset-0 z-[100] cursor-pointer"
        onClick={handleNext}
      >
        {/* Semi-transparent backdrop with spotlight effect */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left - 8}
                  y={targetRect.top - 8}
                  width={targetRect.width + 16}
                  height={targetRect.height + 16}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.75)"
            mask="url(#spotlight-mask)"
          />
        </svg>

        {/* Pulsing border around target */}
        {targetRect && (
          <div
            className="absolute border-2 border-[#8B5CF6] rounded-xl animate-pulse pointer-events-none"
            style={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              boxShadow: '0 0 20px rgba(139, 92, 246, 0.5), 0 0 40px rgba(139, 92, 246, 0.3)',
            }}
          />
        )}
      </div>

      {/* Tooltip Card - stop propagation to prevent advancing when clicking inside */}
      <div
        className={cn(
          "fixed z-[101] bg-gradient-to-br from-[#1e1e2a] to-[#2a2a3a] border border-[#8B5CF6]/30 rounded-xl shadow-2xl p-5",
          isLastStep ? "w-[360px]" : "w-80",
          "max-w-[calc(100vw-1.5rem)]",
        )}
        style={getTooltipStyle()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon and Title */}
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-[#8B5CF6]/20 text-[#8B5CF6]">
            {step.icon}
          </div>
          <h3 className="text-lg font-semibold text-white">{step.title}</h3>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-300 mb-4 leading-relaxed">
          {step.description}
        </p>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {WALKTHROUGH_STEPS.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                'w-2 h-2 rounded-full transition-all',
                idx === currentStep
                  ? 'bg-[#8B5CF6] w-4'
                  : idx < currentStep
                  ? 'bg-[#8B5CF6]/50'
                  : 'bg-gray-600'
              )}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-gray-400 hover:text-white"
          >
            Skip
          </Button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white hover:text-white border-transparent flex-shrink-0 h-9"
            >
              {isLastStep ? (
                <>
                  <Sparkles className="h-4 w-4 mr-1 flex-shrink-0" />
                  Create account
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

// Helper to reset walkthrough (for testing)
export const resetFantasyWalkthrough = () => {
  localStorage.removeItem(STORAGE_KEY);
};
