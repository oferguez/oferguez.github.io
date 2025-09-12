import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import { HebrewMatcher } from './components/HebrewMatcher';
import RateCalculator from './components/RateCalculator';
import './styles/App.css';
import './styles/HebrewMatcher.css';

function App() {
  return (
    <Router basename="/landing">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/hebrew-matcher" element={<HebrewMatcher />} />
        <Route path="/rate-calculator" element={<RateCalculator />} />
      </Routes>
    </Router>
  );
}

export default App;