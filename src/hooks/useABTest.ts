import { useState, useEffect } from 'react';

type Variant = 'A' | 'B';

/**
 * A/B test hook that assigns and persists a variant for a given test
 * @param testName - Unique identifier for the A/B test
 * @returns The assigned variant ('A' or 'B')
 */
export const useABTest = (testName: string): Variant => {
  const [variant, setVariant] = useState<Variant>(() => {
    // Check if we already have a stored variant
    const key = `ab_test_${testName}`;
    const stored = localStorage.getItem(key) as Variant | null;
    
    if (stored === 'A' || stored === 'B') {
      return stored;
    }
    
    // Assign a new variant randomly (50/50 split)
    const newVariant: Variant = Math.random() < 0.5 ? 'A' : 'B';
    localStorage.setItem(key, newVariant);
    return newVariant;
  });

  // Log variant for analytics (could be extended to send to backend)
  useEffect(() => {
    console.log(`[A/B Test] ${testName}: Variant ${variant}`);
  }, [testName, variant]);

  return variant;
};
