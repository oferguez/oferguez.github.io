import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import { HebrewMatcher } from './components/HebrewMatcher';
import { EnglishMatcher } from './components/EnglishMatcher';
import RateCalculator from './components/RateCalculator';
import './styles/App.css';
import './styles/HebrewMatcher.css';
import './styles/EnglishMatcher.css';

function App() {
  return (
    <Router basename="/">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/hebrew-matcher" element={<HebrewMatcher />} />
        <Route path="/english-matcher" element={<EnglishMatcher />} />
        <Route path="/rate-calculator" element={<RateCalculator />} />
      </Routes>
    </Router>
  );
}

export default App;