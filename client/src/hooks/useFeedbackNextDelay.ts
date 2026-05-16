import { useState, useEffect } from 'react';

const CORRECT_DELAY_MS = 2500;

export function useFeedbackNextDelay(feedback: string | null): boolean {
  const [nextVisible, setNextVisible] = useState(false);

  useEffect(() => {
    if (feedback === null) {
      setNextVisible(false);
      return;
    }
    if (feedback === 'correct') {
      const timer = setTimeout(() => setNextVisible(true), CORRECT_DELAY_MS);
      return () => clearTimeout(timer);
    }
    setNextVisible(true);
  }, [feedback]);

  return nextVisible;
}
