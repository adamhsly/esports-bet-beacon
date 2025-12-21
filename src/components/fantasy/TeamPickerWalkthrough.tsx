import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft, DollarSign, Star, Users, Sparkles, HelpCircle } from 'lucide-react';
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
    id: 'budget',
    target: '[data-walkthrough="budget-bar"]',
    title: 'Budget & Salary Cap',
    description: 'You have 50 credits to spend on 5 teams. Stronger teams cost more. Earn bonus credits from XP rewards to go over budget!',
    icon: <DollarSign className="h-5 w-5" />,
    position: 'bottom',
  },
  {
    id: 'team-slots',
    target: '[data-walkthrough="team-slots"]',
    title: 'Your Team Lineup',
    description: 'Tap on slots to add teams. You need exactly 5 teams. Mix pro and amateur teams for the best strategy!',
    icon: <Users className="h-5 w-5" />,
    position: 'bottom',
  },
  {
    id: 'star-team',
    target: '[data-walkthrough="star-team-info"]',
    title: 'Star Team = Double Points',
    description: 'Pick one Star Team that scores DOUBLE points. Choose your most confident pick! You can change it once after the round starts.',
    icon: <Star className="h-5 w-5" />,
    position: 'top',
  },
  {
    id: 'submit',
    target: '[data-walkthrough="submit-button"]',
    title: 'Lock In Your Lineup',
    description: 'Once you\'re happy with your 5 teams and Star Team, hit Submit to enter the round. Good luck!',
    icon: <Sparkles className="h-5 w-5" />,
    position: 'top',
  },
];

const STORAGE_KEY = 'team_picker_walkthrough_completed';

interface TeamPickerWalkthroughProps {
  onComplete?: () => void;
}

export const TeamPickerWalkthrough: React.FC<TeamPickerWalkthroughProps> = ({ onComplete }) => {
  const [showIntro, setShowIntro] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Debug: Log on mount
  useEffect(() => {
    const hasCompleted = localStorage.getItem(STORAGE_KEY);
    console.log('[TeamPickerWalkthrough] Component mounted');
    console.log('[TeamPickerWalkthrough] Storage key:', STORAGE_KEY);
    console.log('[TeamPickerWalkthrough] Has completed:', hasCompleted);
  }, []);

  // Check if walkthrough should show - with delay
  useEffect(() => {
    const hasCompleted = localStorage.getItem(STORAGE_KEY) === 'true';
    console.log('[TeamPickerWalkthrough] Checking if should show, hasCompleted:', hasCompleted);
    
    if (hasCompleted) {
      console.log('[TeamPickerWalkthrough] Already completed, not showing');
      return;
    }

    console.log('[TeamPickerWalkthrough] Setting timeout to show intro...');
    // Longer delay before showing intro prompt
    const timer = setTimeout(() => {
      console.log('[TeamPickerWalkthrough] Timer fired! Setting showIntro to true');
      setShowIntro(true);
    }, 1500);

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
      handleComplete();
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
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-gradient-to-br from-[#1e1e2a] to-[#2a2a3a] rounded-2xl p-6 max-w-sm mx-4 border border-[#8B5CF6]/30 shadow-2xl shadow-[#8B5CF6]/20 animate-in fade-in zoom-in duration-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-[#8B5CF6]/20 rounded-xl">
              <Users className="h-6 w-6 text-[#8B5CF6]" />
            </div>
            <h2 className="text-xl font-bold text-white">Build Your Lineup!</h2>
          </div>
          
          <p className="text-[#d1d1d9] mb-6 leading-relaxed">
            Want a quick guide on how to pick teams, manage your budget, and maximize your points?
          </p>
          
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
    const padding = 16;
    const tooltipWidth = 320;
    const tooltipHeight = 220; // approximate; keeps card safely on-screen on mobile

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    const effectiveTooltipWidth = Math.min(tooltipWidth, viewportW - padding * 2);

    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

    // If we don't know the target, keep the card centered.
    if (!targetRect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    // Center align horizontally by default.
    const centeredLeft = clamp(
      targetRect.left + targetRect.width / 2 - effectiveTooltipWidth / 2,
      padding,
      viewportW - effectiveTooltipWidth - padding,
    );

    let top = padding;
    let left = centeredLeft;

    if (step.position === 'bottom') {
      top = targetRect.bottom + padding;

      // If placing below would go off-screen, flip to above.
      if (top + tooltipHeight > viewportH - padding) {
        top = targetRect.top - tooltipHeight - padding;
      }
    } else if (step.position === 'top') {
      top = targetRect.top - tooltipHeight - padding;

      // If placing above would go off-screen, flip to below.
      if (top < padding) {
        top = targetRect.bottom + padding;
      }
    } else if (step.position === 'left') {
      top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
      left = targetRect.left - effectiveTooltipWidth - padding;
    } else if (step.position === 'right') {
      top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
      left = targetRect.right + padding;
    }

    // Final clamp to ensure it always stays visible.
    top = clamp(top, padding, viewportH - tooltipHeight - padding);
    left = clamp(left, padding, viewportW - effectiveTooltipWidth - padding);

    return { top, left };
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[100] pointer-events-none">
        {/* Semi-transparent backdrop with spotlight effect */}
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <mask id="teampicker-spotlight-mask">
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
            mask="url(#teampicker-spotlight-mask)"
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

      {/* Tooltip Card */}
      <div
        className={cn(
          "fixed z-[101] bg-gradient-to-br from-[#1e1e2a] to-[#2a2a3a] border border-[#8B5CF6]/30 rounded-xl shadow-2xl p-5",
          "w-80 max-w-[calc(100vw-1.5rem)]",
        )}
        style={getTooltipStyle()}
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
                  Got it!
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
export const resetTeamPickerWalkthrough = () => {
  console.log('[TeamPickerWalkthrough] Resetting walkthrough');
  localStorage.removeItem(STORAGE_KEY);
};

// Help button to re-trigger walkthrough
export const TeamPickerHelpButton: React.FC<{ className?: string }> = ({ className }) => {
  const handleClick = () => {
    console.log('[TeamPickerHelpButton] Re-triggering walkthrough');
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className={cn("gap-2 text-muted-foreground hover:text-foreground", className)}
    >
      <HelpCircle className="h-4 w-4" />
      <span className="hidden sm:inline">How to Play</span>
    </Button>
  );
};
