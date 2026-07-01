// Lightweight shared store for the interactive first-run guided tour.
// Step 0 = inactive. Steps 1-6 = active tour steps. Complete = 'camellia_tour_complete'.
const KEY = 'camellia_tour_step';
export const TOUR_EVENT = 'camellia-tour-step-change';

export function getTourStep() {
  const v = localStorage.getItem(KEY);
  return v ? parseInt(v, 10) : 0;
}

export function setTourStep(step) {
  if (step <= 0) localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, String(step));
  window.dispatchEvent(new Event(TOUR_EVENT));
}

export function startTour() {
  if (localStorage.getItem('camellia_tour_complete') === 'true') return;
  setTourStep(1);
}

export function goToStepIfCurrent(fromStep, toStep) {
  if (getTourStep() === fromStep) setTourStep(toStep);
}

export function finishTour() {
  localStorage.setItem('camellia_tour_complete', 'true');
  setTourStep(0);
}

export function isTourComplete() {
  return localStorage.getItem('camellia_tour_complete') === 'true';
}
