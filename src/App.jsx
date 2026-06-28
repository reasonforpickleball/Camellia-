import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { useState } from 'react';
import { AuthProvider } from '@/lib/AuthContext';
import { DarkModeProvider } from '@/lib/DarkModeContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import LandingPage from './components/LandingPage';
import Onboarding from './components/Onboarding';
import Dashboard from './pages/Dashboard';
// Add page imports here

function DoomiumApp() {
  const [screen, setScreen] = useState(() => {
    // Always start on landing
    return 'landing';
  });

  const isReturning = localStorage.getItem('onboarding_complete') === 'true';

  const handleCreateAccount = () => {
    if (isReturning) {
      setScreen('dashboard');
    } else {
      setScreen('onboarding');
    }
  };

  const handleOnboardingComplete = () => {
    setScreen('dashboard');
  };

  if (screen === 'landing') {
    return <LandingPage onCreateAccount={handleCreateAccount} />;
  }
  if (screen === 'onboarding') {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }
  return <Dashboard />;
}

function App() {
  return (
    <DarkModeProvider>
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <Routes>
            <Route path="/*" element={<DoomiumApp />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
    </DarkModeProvider>
  );
}

export default App;
