import { useState, useEffect } from 'react';
import { getTourStep, TOUR_EVENT } from '@/lib/tourStore';

export default function useTourStep() {
  const [step, setStep] = useState(getTourStep);
  useEffect(() => {
    const handler = () => setStep(getTourStep());
    window.addEventListener(TOUR_EVENT, handler);
    return () => window.removeEventListener(TOUR_EVENT, handler);
  }, []);
  return step;
}
